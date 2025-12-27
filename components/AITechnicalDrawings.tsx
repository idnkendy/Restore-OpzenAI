
import React, { useState } from 'react';
import { FileData, Tool, ImageResolution, AspectRatio } from '../types';
import { AITechnicalDrawingsState } from '../state/toolState';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import * as jobService from '../services/jobService';
import * as externalVideoService from '../services/externalVideoService'; // Flow Import
import { refundCredits } from '../services/paymentService';
import { supabase } from '../services/supabaseClient';
import Spinner from './Spinner';
import ImageUpload from './common/ImageUpload';
import ImageComparator from './ImageComparator';
import OptionSelector from './common/OptionSelector';
import ResolutionSelector from './common/ResolutionSelector';
import ImagePreviewModal from './common/ImagePreviewModal';
import AspectRatioSelector from './common/AspectRatioSelector';

interface AITechnicalDrawingsProps {
    state: AITechnicalDrawingsState;
    onStateChange: (newState: Partial<AITechnicalDrawingsState>) => void;
    userCredits?: number;
    onDeductCredits?: (amount: number, description: string) => Promise<string>;
}

const drawingTypeOptions = [
    { value: 'floor-plan', label: 'Mặt bằng (Floor Plan)' },
    { value: 'elevation', label: 'Mặt đứng (Elevation)' },
    { value: 'section', label: 'Mặt cắt (Section)' },
];

const AITechnicalDrawings: React.FC<AITechnicalDrawingsProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits }) => {
    const { sourceImage, isLoading, error, resultImage, drawingType, detailLevel, resolution, aspectRatio } = state;
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [upscaleWarning, setUpscaleWarning] = useState<string | null>(null);
    
    const getCostPerImage = () => {
        switch (resolution) {
            case 'Standard': return 5;
            case '1K': return 10;
            case '2K': return 20;
            case '4K': return 30;
            default: return 5;
        }
    };
    const cost = getCostPerImage();

    const handleGenerate = async () => {
        if (onDeductCredits && userCredits < cost) {
             onStateChange({ error: `Bạn không đủ credits. Cần ${cost} credits.` });
             return;
        }

        if (!sourceImage) {
            onStateChange({ error: 'Vui lòng tải lên một ảnh Render để bắt đầu.' });
            return;
        }
        onStateChange({ isLoading: true, error: null, resultImage: null });
        setStatusMessage('Đang phân tích...');
        setUpscaleWarning(null);

        let logId: string | null = null;
        let jobId: string | null = null;
        
        // Use Flow for ALL resolutions
        const useFlow = true;
        const prompt = `Convert this 3D render into a professional 2D ${drawingType} architectural drawing. White lines on blue background.`;

        try {
            if (onDeductCredits) {
                logId = await onDeductCredits(cost, `Tạo bản vẽ kỹ thuật (${drawingType}) - ${resolution}`);
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId) {
                jobId = await jobService.createJob({
                    user_id: user.id,
                    tool_id: Tool.AITechnicalDrawings,
                    prompt: `Create ${drawingType} technical drawing`,
                    cost: cost,
                    usage_log_id: logId
                });
            }

            if (jobId) await jobService.updateJobStatus(jobId, 'processing');
            
            let resultUrl = '';

            if (useFlow) {
                // --- FLOW LOGIC ---
                let aspectEnum = 'IMAGE_ASPECT_RATIO_SQUARE';
                if (aspectRatio === '16:9') aspectEnum = 'IMAGE_ASPECT_RATIO_LANDSCAPE';
                else if (aspectRatio === '9:16') aspectEnum = 'IMAGE_ASPECT_RATIO_PORTRAIT';

                const modelName = resolution === 'Standard' ? "GEM_PIX" : "GEM_PIX_2";
                
                setStatusMessage('Đang xử lý. Vui lòng đợi...');
                const result = await externalVideoService.generateFlowImage(
                    prompt,
                    [sourceImage],
                    aspectEnum,
                    1,
                    modelName,
                    (msg) => setStatusMessage('Đang xử lý. Vui lòng đợi...')
                );

                if (result.imageUrls && result.imageUrls.length > 0) {
                    resultUrl = result.imageUrls[0];
                    
                    // Check for 2K/4K Upscale
                    const shouldUpscale = (resolution === '2K' || resolution === '4K') && result.mediaIds && result.mediaIds.length > 0;
                    
                    if (shouldUpscale) {
                        setStatusMessage(resolution === '4K' ? 'Đang xử lý (Upscale 4K)...' : 'Đang xử lý (Upscale 2K)...');
                        try {
                            const mediaId = result.mediaIds[0];
                            if (mediaId) {
                                const targetRes = resolution === '4K' ? 'UPSAMPLE_IMAGE_RESOLUTION_4K' : 'UPSAMPLE_IMAGE_RESOLUTION_2K';
                                const upscaleRes = await externalVideoService.upscaleFlowImage(mediaId, result.projectId, targetRes);
                                if (upscaleRes?.imageUrl) resultUrl = upscaleRes.imageUrl;
                            }
                        } catch (e: any) {
                            // STRICT FAILURE
                            throw new Error(`Lỗi Upscale: ${e.message}`);
                        }
                    }
                    historyService.addToHistory({ tool: Tool.AITechnicalDrawings, prompt: `Flow: ${prompt}`, sourceImageURL: sourceImage.objectURL, resultImageURL: resultUrl });
                } else throw new Error("Lỗi không có ảnh.");

            } else {
                // Fallback (Not reached with useFlow=true)
                setStatusMessage('Đang xử lý. Vui lòng đợi...');
                const images = await geminiService.generateHighQualityImage(prompt, aspectRatio, resolution, sourceImage, jobId || undefined);
                resultUrl = images[0];
                historyService.addToHistory({ tool: Tool.AITechnicalDrawings, prompt: prompt, sourceImageURL: sourceImage.objectURL, resultImageURL: resultUrl });
            }

            onStateChange({ resultImage: resultUrl });
            if (jobId && resultUrl) await jobService.updateJobStatus(jobId, 'completed', resultUrl);

        } catch (err: any) {
            let msg = err.message;
            if (logId) msg += " (Credits đã hoàn lại)";
            onStateChange({ error: msg });
            if (jobId) await jobService.updateJobStatus(jobId, 'failed', undefined, err.message);
            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId && onDeductCredits) {
                await refundCredits(user.id, cost, `Hoàn tiền: Lỗi tạo bản vẽ (${err.message})`, logId);
            }
        } finally {
            onStateChange({ isLoading: false });
            setStatusMessage(null);
        }
    };

    const handleDownload = () => {
        if (!resultImage) return;
        const link = document.createElement('a');
        link.href = resultImage;
        link.download = `technical-drawing-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col gap-8">
            {previewImage && <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />}
            <h2 className="text-2xl font-bold">AI Tạo Bản Vẽ Kỹ Thuật</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6 bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border">
                    <ImageUpload onFileSelect={(f) => onStateChange({ sourceImage: f, resultImage: null })} previewUrl={sourceImage?.objectURL} />
                    <OptionSelector id="type" label="Loại bản vẽ" options={drawingTypeOptions} value={drawingType} onChange={(v) => onStateChange({ drawingType: v as any })} variant="grid" />
                    <AspectRatioSelector value={aspectRatio} onChange={(v) => onStateChange({ aspectRatio: v })} disabled={isLoading} />
                    <ResolutionSelector value={resolution} onChange={(v) => onStateChange({ resolution: v })} disabled={isLoading} />
                    <button onClick={handleGenerate} disabled={isLoading || !sourceImage || userCredits < cost} className="w-full py-3 bg-purple-600 text-white font-bold rounded-lg shadow-lg">
                        {isLoading ? <><Spinner /> {statusMessage || 'Đang vẽ...'}</> : 'Tạo Bản Vẽ'}
                    </button>
                    {error && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
                    {upscaleWarning && <div className="text-xs text-yellow-500 text-center">{upscaleWarning}</div>}
                </div>
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold">Kết quả</h3>
                        {resultImage && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPreviewImage(resultImage)}
                                    className="p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-text-primary dark:text-white transition-colors"
                                    title="Phóng to"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                    </svg>
                                </button>
                                <button 
                                    onClick={handleDownload} 
                                    className="flex items-center gap-2 bg-[#7f13ec] hover:bg-[#690fca] text-white px-3 py-1.5 rounded-lg font-bold shadow-lg text-sm transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    <span>Tải xuống</span>
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="w-full aspect-video bg-main-bg dark:bg-gray-800/50 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden">
                        {isLoading ? (
                            <div className="flex flex-col items-center">
                                <Spinner />
                                <p className="mt-2 text-gray-400">{statusMessage}</p>
                            </div>
                        ) : resultImage && sourceImage ? <ImageComparator originalImage={sourceImage.objectURL} resultImage={resultImage} /> : <p className="text-gray-400">Kết quả sẽ hiển thị ở đây</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AITechnicalDrawings;
