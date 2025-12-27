
import React, { useState } from 'react';
import { FileData, Tool, ImageResolution } from '../types';
import { FloorPlanState } from '../state/toolState';
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
import ImagePreviewModal from './common/ImagePreviewModal';
import ResolutionSelector from './common/ResolutionSelector';
import AspectRatioSelector from './common/AspectRatioSelector';
import MultiImageUpload from './common/MultiImageUpload';

interface FloorPlanProps {
    state: FloorPlanState;
    onStateChange: (newState: Partial<FloorPlanState>) => void;
    userCredits?: number;
    onDeductCredits?: (amount: number, description: string) => Promise<string>;
}

const FloorPlan: React.FC<FloorPlanProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits }) => {
    const { prompt, layoutPrompt, sourceImage, referenceImages, isLoading, error, resultImages, numberOfImages, renderMode, planType, resolution, aspectRatio } = state;
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

    const handleResolutionChange = (val: ImageResolution) => {
        onStateChange({ resolution: val });
    };

    const handleGenerate = async () => {
        if (onDeductCredits && userCredits < cost) {
             onStateChange({ error: `Bạn không đủ credits. Cần ${cost} credits nhưng chỉ còn ${userCredits}. Vui lòng nạp thêm.` });
             return;
        }

        if (!sourceImage) {
            onStateChange({ error: 'Vui lòng tải lên một bản vẽ mặt bằng.' });
            return;
        }
        onStateChange({ isLoading: true, error: null, resultImages: [] });
        setStatusMessage('Đang phân tích bản vẽ...');
        setUpscaleWarning(null);

        let logId: string | null = null;
        let jobId: string | null = null;
        
        // Use Flow for ALL resolutions
        const useFlow = true;

        try {
            if (onDeductCredits) {
                logId = await onDeductCredits(cost, `Render mặt bằng (${numberOfImages} ảnh) - ${resolution}`);
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId) {
                jobId = await jobService.createJob({
                    user_id: user.id,
                    tool_id: Tool.FloorPlan,
                    prompt: renderMode === 'top-down' ? prompt : (layoutPrompt || 'Perspective render'),
                    cost: cost,
                    usage_log_id: logId
                });
            }

            if (jobId) await jobService.updateJobStatus(jobId, 'processing');

            let fullPrompt = '';
            if (renderMode === 'top-down') {
                fullPrompt = `Faithfully convert this 2D floor plan into a 3D rendered floor plan. Style: ${prompt}. Aspect Ratio: ${aspectRatio}`;
            } else {
                fullPrompt = `3D exterior/interior perspective from this floor plan. Style: ${layoutPrompt}. Aspect Ratio: ${aspectRatio}`;
            }

            let imageUrls: string[] = [];

            if (useFlow) {
                // --- FLOW LOGIC ---
                let aspectEnum = 'IMAGE_ASPECT_RATIO_SQUARE';
                if (aspectRatio === '16:9') aspectEnum = 'IMAGE_ASPECT_RATIO_LANDSCAPE';
                else if (aspectRatio === '9:16') aspectEnum = 'IMAGE_ASPECT_RATIO_PORTRAIT';

                const modelName = resolution === 'Standard' ? "GEM_PIX" : "GEM_PIX_2";
                const collectedUrls: string[] = [];
                // Combine source and references
                const inputImages = [sourceImage, ...referenceImages];

                const promises = Array.from({ length: numberOfImages }).map(async (_, index) => {
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
                                // STRICT FAILURE
                                throw new Error(`Lỗi Upscale: ${e.message}`);
                            }
                        }
                        collectedUrls.push(finalUrl);
                        onStateChange({ resultImages: [...collectedUrls] });
                        historyService.addToHistory({ tool: Tool.FloorPlan, prompt: `Flow: ${fullPrompt}`, sourceImageURL: sourceImage.objectURL, resultImageURL: finalUrl });
                    }
                });
                await Promise.all(promises);
                imageUrls = collectedUrls;

            } else {
                // Fallback (Not reached with useFlow=true)
                setStatusMessage('Đang xử lý. Vui lòng đợi...');
                const promises = Array.from({ length: numberOfImages }).map(async () => {
                    const images = await geminiService.generateHighQualityImage(fullPrompt, aspectRatio, resolution, sourceImage, jobId || undefined, referenceImages);
                    return images[0];
                });
                imageUrls = await Promise.all(promises);
                onStateChange({ resultImages: imageUrls });
                imageUrls.forEach(url => {
                     historyService.addToHistory({ tool: Tool.FloorPlan, prompt: fullPrompt, sourceImageURL: sourceImage.objectURL, resultImageURL: url });
                });
            }
            
            if (jobId && imageUrls.length > 0) {
                await jobService.updateJobStatus(jobId, 'completed', imageUrls[0]);
            }

        } catch (err: any) {
            let msg = err.message;
            if (logId) msg += " (Credits đã hoàn lại)";
            onStateChange({ error: msg });
            if (jobId) await jobService.updateJobStatus(jobId, 'failed', undefined, err.message);
            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId && onDeductCredits) {
                await refundCredits(user.id, cost, `Hoàn tiền: Lỗi render mặt bằng (${err.message})`, logId);
            }
        } finally {
            onStateChange({ isLoading: false });
            setStatusMessage(null);
        }
    };
    
    const handleFileSelect = (fileData: FileData | null) => {
        onStateChange({ sourceImage: fileData, resultImages: [], referenceImages: [] });
    }
    
    const handleReferenceFilesChange = (files: FileData[]) => {
        onStateChange({ referenceImages: files });
    };

    const handleDownload = () => {
        if (resultImages.length !== 1) return;
        const link = document.createElement('a');
        link.href = resultImages[0];
        link.download = "floorplan-render-3d.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    return (
        <div className="flex flex-col gap-8">
            {previewImage && <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />}
            <div>
                <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">AI Render Mặt Bằng</h2>
                <div className="bg-main-bg/50 dark:bg-dark-bg/50 border border-border-color dark:border-gray-700 rounded-xl p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">1. Tải Lên Mặt Bằng 2D</label>
                            <ImageUpload onFileSelect={handleFileSelect} previewUrl={sourceImage?.objectURL} />
                        </div>
                        <div className="space-y-4 flex flex-col h-full">
                             <div>
                                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">2. Chọn loại & chế độ</label>
                                <div className="grid grid-cols-2 gap-2 bg-main-bg dark:bg-gray-800 p-1 rounded-lg">
                                    <button onClick={() => onStateChange({ planType: 'interior' })} className={`py-2 rounded-md text-sm font-semibold transition-colors ${planType === 'interior' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>Nội thất</button>
                                    <button onClick={() => onStateChange({ planType: 'exterior' })} className={`py-2 rounded-md text-sm font-semibold transition-colors ${planType === 'exterior' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>Kiến trúc</button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 bg-main-bg dark:bg-gray-800 p-1 rounded-lg mt-2">
                                    <button onClick={() => onStateChange({ renderMode: 'top-down' })} className={`py-2 rounded-md text-sm font-semibold transition-colors ${renderMode === 'top-down' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>Mặt bằng 3D</button>
                                    <button onClick={() => onStateChange({ renderMode: 'perspective' })} className={`py-2 rounded-md text-sm font-semibold transition-colors ${renderMode === 'perspective' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>Góc nhìn nội thất 3D</button>
                                </div>
                            </div>
                            
                            {renderMode === 'top-down' ? (
                                <textarea rows={3} className="w-full bg-surface dark:bg-gray-700/50 border border-border-color dark:border-gray-600 rounded-lg p-3 text-sm" placeholder="Mô tả phong cách..." value={prompt} onChange={(e) => onStateChange({ prompt: e.target.value })} />
                            ) : (
                                <div className="space-y-2">
                                    <textarea rows={3} className="w-full bg-surface dark:bg-gray-700/50 border border-border-color dark:border-gray-600 rounded-lg p-3 text-sm" placeholder="Mô tả góc nhìn..." value={layoutPrompt} onChange={(e) => onStateChange({ layoutPrompt: e.target.value })} />
                                    <MultiImageUpload onFilesChange={handleReferenceFilesChange} maxFiles={5} />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 mt-auto">
                                <NumberOfImagesSelector value={numberOfImages} onChange={(val) => onStateChange({ numberOfImages: val })} disabled={isLoading} />
                                <AspectRatioSelector value={aspectRatio} onChange={(val) => onStateChange({ aspectRatio: val })} disabled={isLoading} />
                            </div>
                            <ResolutionSelector value={resolution} onChange={handleResolutionChange} disabled={isLoading} />

                             <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800/50 rounded-lg px-4 py-2 mt-4 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2 text-sm text-text-secondary dark:text-gray-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span>Chi phí: <span className="font-bold text-text-primary dark:text-white">{cost} Credits</span></span>
                                </div>
                                <div className="text-xs">
                                    {userCredits < cost ? (
                                        <span className="text-red-500 font-semibold">Không đủ (Có: {userCredits})</span>
                                    ) : (
                                        <span className="text-green-600 dark:text-green-400">Khả dụng: {userCredits}</span>
                                    )}
                                </div>
                            </div>
                            <button 
                                onClick={handleGenerate} 
                                disabled={isLoading || !sourceImage || userCredits < cost} 
                                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex justify-center items-center gap-2 shadow-lg"
                            >
                                {isLoading ? <><Spinner /> {statusMessage || 'Đang xử lý. Vui lòng đợi...'}</> : 'Bắt đầu Render'}
                            </button>
                        </div>
                    </div>
                    {error && <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">{error}</div>}
                    {upscaleWarning && <p className="mt-3 text-sm text-yellow-500 text-center font-medium bg-yellow-100 dark:bg-yellow-900/20 p-2 rounded">{upscaleWarning}</p>}
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Kết quả</h3>
                    {resultImages.length === 1 && <button onClick={handleDownload} className="bg-gray-600 text-white px-4 py-1.5 rounded-lg text-sm">Tải xuống</button>}
                </div>
                <div className="w-full aspect-video bg-main-bg dark:bg-gray-800/50 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden">
                    {isLoading ? (
                        <div className="flex flex-col items-center">
                            <Spinner />
                            <p className="mt-2 text-gray-400">{statusMessage || 'Đang xử lý. Vui lòng đợi...'}</p>
                        </div>
                    ) : resultImages.length === 1 && sourceImage ? <ImageComparator originalImage={sourceImage.objectURL} resultImage={resultImages[0]} /> : resultImages.length > 1 ? <ResultGrid images={resultImages} toolName="floorplan-render" /> : <p className="text-gray-400">Kết quả sẽ hiển thị ở đây</p>}
                </div>
            </div>
        </div>
    );
};

export default FloorPlan;
