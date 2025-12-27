
import React, { useState } from 'react';
import { FileData, Tool, ImageResolution, AspectRatio } from '../types';
import { LayoutGeneratorState } from '../state/toolState';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import * as jobService from '../services/jobService';
import * as externalVideoService from '../services/externalVideoService'; // Flow Import
import { refundCredits } from '../services/paymentService';
import { supabase } from '../services/supabaseClient';
import Spinner from './Spinner';
import ImageUpload from './common/ImageUpload';
import ImageComparator from './ImageComparator';
import NumberOfImagesSelector from './common/NumberOfImagesSelector';
import ResultGrid from './common/ResultGrid';
import ResolutionSelector from './common/ResolutionSelector';
import ImagePreviewModal from './common/ImagePreviewModal';
import AspectRatioSelector from './common/AspectRatioSelector';

interface LayoutGeneratorProps {
    state: LayoutGeneratorState;
    onStateChange: (newState: Partial<LayoutGeneratorState>) => void;
    userCredits?: number;
    onDeductCredits?: (amount: number, description: string) => Promise<string>;
}

const LayoutGenerator: React.FC<LayoutGeneratorProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits }) => {
    const { prompt, sourceImage, isLoading, error, resultImages, numberOfImages, resolution, aspectRatio } = state;
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
    const cost = numberOfImages * getCostPerImage();

    const handleFileSelect = (fileData: FileData | null) => {
        onStateChange({ sourceImage: fileData, resultImages: [] });
    };

    const handleResolutionChange = (val: ImageResolution) => {
        onStateChange({ resolution: val });
    };

    const handleGenerate = async () => {
        if (onDeductCredits && userCredits < cost) {
             onStateChange({ error: `Bạn không đủ credits. Cần ${cost} credits.` });
             return;
        }

        if (!prompt.trim()) {
            onStateChange({ error: 'Vui lòng nhập yêu cầu về layout.' });
            return;
        }

        onStateChange({ isLoading: true, error: null, resultImages: [] });
        setStatusMessage('Đang thiết kế layout...');
        setUpscaleWarning(null);

        const fullPrompt = `Architectural Layout & Presentation Task: "${prompt}". 
        ${sourceImage ? 'Use the provided image as the primary visual reference/design base.' : ''}
        Ensure the final output has a professional graphic composition, clear linework, and coherent layout style.`;

        // Use Flow for ALL resolutions
        const useFlow = true;
        let logId: string | null = null;
        let jobId: string | null = null;

        try {
            if (onDeductCredits) {
                logId = await onDeductCredits(cost, `Tạo Layout (${numberOfImages} ảnh) - ${resolution}`);
            }
            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId) {
                jobId = await jobService.createJob({
                    user_id: user.id,
                    tool_id: Tool.LayoutGenerator,
                    prompt: fullPrompt,
                    cost: cost,
                    usage_log_id: logId
                });
            }
            if (jobId) await jobService.updateJobStatus(jobId, 'processing');

            let imageUrls: string[] = [];

            if (useFlow) {
                // --- FLOW LOGIC ---
                let aspectEnum = 'IMAGE_ASPECT_RATIO_SQUARE';
                if (aspectRatio === '16:9' ) aspectEnum = 'IMAGE_ASPECT_RATIO_LANDSCAPE';
                else if (aspectRatio === '9:16' ) aspectEnum = 'IMAGE_ASPECT_RATIO_PORTRAIT';

                const modelName = resolution === 'Standard' ? "GEM_PIX" : "GEM_PIX_2";
                const collectedUrls: string[] = [];
                const inputImages = sourceImage ? [sourceImage] : [];
                let lastError: any = null;

                const promises = Array.from({ length: numberOfImages }).map(async (_, index) => {
                    try {
                        setStatusMessage('Đang xử lý. Vui lòng đợi...');
                        const result = await externalVideoService.generateFlowImage(
                            fullPrompt, 
                            inputImages, 
                            aspectEnum, 
                            1, 
                            modelName, 
                            (msg) => setStatusMessage('Đang xử lý. Vui lòng đợi...')
                        );
                        
                        if (result.imageUrls && result.imageUrls.length > 0) {
                            let finalUrl = result.imageUrls[0];
                            
                            // Upscale Check (2K or 4K)
                            const shouldUpscale = (resolution === '2K' || resolution === '4K') && result.mediaIds && result.mediaIds.length > 0;
                            
                            if (shouldUpscale) {
                                setStatusMessage(resolution === '4K' ? 'Đang xử lý (Upscale 4K)...' : 'Đang xử lý (Upscale 2K)...');
                                try {
                                    const mediaId = result.mediaIds[0];
                                    if (mediaId) {
                                        const targetRes = resolution === '4K' ? 'UPSAMPLE_IMAGE_RESOLUTION_4K' : 'UPSAMPLE_IMAGE_RESOLUTION_2K';
                                        const upscaleRes = await externalVideoService.upscaleFlowImage(mediaId, result.projectId, targetRes);
                                        if (upscaleRes?.imageUrl) finalUrl = upscaleRes.imageUrl;
                                    }
                                } catch (e: any) {
                                    throw new Error(`Lỗi Upscale: ${e.message}`);
                                }
                            }
                            
                            collectedUrls.push(finalUrl);
                            onStateChange({ resultImages: [...collectedUrls] });
                            historyService.addToHistory({ 
                                tool: Tool.LayoutGenerator, 
                                prompt: `Flow (${modelName}): ${fullPrompt}`, 
                                sourceImageURL: sourceImage?.objectURL, 
                                resultImageURL: finalUrl 
                            });
                        }
                    } catch (e: any) {
                        console.error(`Image ${index+1} failed`, e);
                        lastError = e;
                    }
                });

                await Promise.all(promises);
                if (collectedUrls.length === 0) {
                    const errorMsg = lastError ? (lastError.message || lastError.toString()) : "Không thể tạo ảnh nào. Vui lòng thử lại sau.";
                    throw new Error(errorMsg);
                }
                imageUrls = collectedUrls;

            } else {
                // Fallback (Not reached with useFlow=true)
                setStatusMessage('Đang xử lý. Vui lòng đợi...');
                const promises = Array.from({ length: numberOfImages }).map(async () => {
                    const images = await geminiService.generateHighQualityImage(fullPrompt, aspectRatio, resolution, sourceImage || undefined, jobId || undefined);
                    return images[0];
                });
                imageUrls = await Promise.all(promises);
                onStateChange({ resultImages: imageUrls });
                imageUrls.forEach(url => historyService.addToHistory({ tool: Tool.LayoutGenerator, prompt: fullPrompt, sourceImageURL: sourceImage?.objectURL, resultImageURL: url }));
            }

            if (jobId && imageUrls.length > 0) await jobService.updateJobStatus(jobId, 'completed', imageUrls[0]);

        } catch (err: any) {
            let msg = err.message;
            if (logId) msg += " (Credits đã hoàn lại)";
            onStateChange({ error: msg });
            if (jobId) await jobService.updateJobStatus(jobId, 'failed', undefined, msg);
            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId && onDeductCredits) await refundCredits(user.id, cost, `Hoàn tiền: Lỗi layout (${err.message})`, logId);
        } finally {
            onStateChange({ isLoading: false });
            setStatusMessage(null);
        }
    };

    const handleDownload = () => {
        if (resultImages.length === 0) return;
        const link = document.createElement('a');
        link.href = resultImages[0];
        link.download = `layout-generated-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col gap-8">
            {previewImage && <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />}
            
            <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">AI Tạo Layout & Presentation</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6 bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">1. Tải Lên Phác Thảo / Render (Tùy chọn)</label>
                        <ImageUpload onFileSelect={handleFileSelect} previewUrl={sourceImage?.objectURL} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">2. Mô tả yêu cầu Layout</label>
                        <textarea
                            rows={6}
                            className="w-full bg-surface dark:bg-gray-700/50 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-accent focus:outline-none transition-all"
                            placeholder="VD: Tạo bảng trình bày kiến trúc gồm mặt bằng, mặt cắt và phối cảnh trục đo..."
                            value={prompt}
                            onChange={(e) => onStateChange({ prompt: e.target.value })}
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <NumberOfImagesSelector value={numberOfImages} onChange={(val) => onStateChange({ numberOfImages: val })} disabled={isLoading} />
                        </div>
                        <div>
                            <AspectRatioSelector value={aspectRatio} onChange={(val) => onStateChange({ aspectRatio: val })} disabled={isLoading} />
                        </div>
                    </div>
                    
                    <ResolutionSelector value={resolution} onChange={handleResolutionChange} disabled={isLoading} />

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || userCredits < cost}
                        className="w-full flex justify-center items-center gap-2 bg-accent hover:bg-accent-600 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg"
                    >
                        {isLoading ? <><Spinner /> {statusMessage || 'Đang tạo...'}</> : 'Tạo Layout'}
                    </button>
                    {error && <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-500 dark:text-red-300 rounded-lg text-sm">{error}</div>}
                    {upscaleWarning && <div className="text-xs text-yellow-500 text-center">{upscaleWarning}</div>}
                </div>

                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-text-primary dark:text-white">Kết quả Layout</h3>
                        {resultImages.length > 0 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPreviewImage(resultImages[0])}
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
                    <div className="w-full aspect-video bg-main-bg dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-border-color dark:border-gray-700 flex items-center justify-center overflow-hidden">
                        {isLoading ? (
                            <div className="flex flex-col items-center">
                                <Spinner />
                                <p className="mt-2 text-gray-400">{statusMessage}</p>
                            </div>
                        ) : resultImages.length === 1 && sourceImage ? (
                            <ImageComparator originalImage={sourceImage.objectURL} resultImage={resultImages[0]} />
                        ) : resultImages.length > 0 ? (
                             <img src={resultImages[0]} alt="Result" className="w-full h-full object-contain" />
                        ) : (
                             <p className="text-text-secondary dark:text-gray-400 text-center p-4">Kết quả sẽ hiển thị ở đây.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LayoutGenerator;
