
import React, { useState } from 'react';
import { FileData, Tool, ImageResolution, AspectRatio } from '../types';
import { MaterialSwapperState } from '../state/toolState';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import * as jobService from '../services/jobService';
import * as externalVideoService from '../services/externalVideoService'; // Import Flow
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

interface MaterialSwapperProps {
    state: MaterialSwapperState;
    onStateChange: (newState: Partial<MaterialSwapperState>) => void;
    userCredits?: number;
    onDeductCredits?: (amount: number, description: string) => Promise<string>;
}

const MaterialSwapper: React.FC<MaterialSwapperProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits }) => {
    const { prompt, sceneImage, materialImage, isLoading, error, resultImages, numberOfImages, resolution, aspectRatio } = state;
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

    const handleGenerate = async () => {
        if (onDeductCredits && userCredits < cost) {
             onStateChange({ error: `Bạn không đủ credits. Cần ${cost} credits.` });
             return;
        }

        if (!prompt || !sceneImage || !materialImage) {
            onStateChange({ error: 'Vui lòng điền đủ thông tin và tải ảnh.' });
            return;
        }

        onStateChange({ isLoading: true, error: null, resultImages: [] });
        setStatusMessage('Đang xử lý...');
        setUpscaleWarning(null);

        let logId: string | null = null;
        let jobId: string | null = null;
        
        // Use Flow for ALL resolutions
        const useFlow = true;

        try {
             if (onDeductCredits) {
                logId = await onDeductCredits(cost, `Thay vật liệu (${numberOfImages} ảnh) - ${resolution}`);
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId) {
                jobId = await jobService.createJob({
                    user_id: user.id,
                    tool_id: Tool.MaterialSwap,
                    prompt: prompt,
                    cost: cost,
                    usage_log_id: logId
                });
            }

            if (jobId) await jobService.updateJobStatus(jobId, 'processing');

            const fullPrompt = `${prompt}. Maintain ${aspectRatio} ratio. Photorealistic quality.`;
            let imageUrls: string[] = [];

            if (useFlow) {
                // --- FLOW LOGIC ---
                let aspectEnum = 'IMAGE_ASPECT_RATIO_SQUARE';
                if (aspectRatio === '16:9' ) aspectEnum = 'IMAGE_ASPECT_RATIO_LANDSCAPE';
                else if (aspectRatio === '9:16' ) aspectEnum = 'IMAGE_ASPECT_RATIO_PORTRAIT';

                const modelName = resolution === 'Standard' ? "GEM_PIX" : "GEM_PIX_2";
                const collectedUrls: string[] = [];
                // Input images: Scene first, then Material
                const inputImages = [sceneImage, materialImage];

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
                            
                            // Check for 2K/4K Upscale
                            const shouldUpscale = (resolution === '2K' || resolution === '4K') && result.mediaIds && result.mediaIds.length > 0;

                            if (shouldUpscale) {
                                setStatusMessage(resolution === '4K' ? 'Đang xử lý (Upscale 4K)...' : 'Đang xử lý (Upscale 2K)...');
                                try {
                                    const mediaId = result.mediaIds[0];
                                    if (mediaId) {
                                        const targetRes = resolution === '4K' ? 'UPSAMPLE_IMAGE_RESOLUTION_4K' : 'UPSAMPLE_IMAGE_RESOLUTION_2K';
                                        const upscaleResult = await externalVideoService.upscaleFlowImage(mediaId, result.projectId, targetRes);
                                        if (upscaleResult && upscaleResult.imageUrl) {
                                            finalUrl = upscaleResult.imageUrl;
                                        }
                                    }
                                } catch (upscaleErr: any) {
                                    // STRICT FAILURE
                                    throw new Error(`Lỗi Upscale: ${upscaleErr.message}`);
                                }
                            }
                            
                            collectedUrls.push(finalUrl);
                            onStateChange({ resultImages: [...collectedUrls] });
                            
                            historyService.addToHistory({
                                tool: Tool.MaterialSwap,
                                prompt: `Flow (${modelName}): ${fullPrompt}`,
                                sourceImageURL: sceneImage.objectURL,
                                resultImageURL: finalUrl,
                            });
                        }
                    } catch (e: any) {
                        console.error(`Image ${index+1} failed`, e);
                        throw e;
                    }
                });

                await Promise.all(promises);
                if (collectedUrls.length === 0) throw new Error("Không thể tạo ảnh.");
                imageUrls = collectedUrls;

            } else {
                // Fallback (Not reached if useFlow=true)
                if (resolution === '1K' || resolution === '2K' || resolution === '4K') {
                    const promises = Array.from({ length: numberOfImages }).map(async () => {
                        const images = await geminiService.generateHighQualityImage(fullPrompt, aspectRatio, resolution, sceneImage, jobId || undefined, [materialImage]);
                        return images[0];
                    });
                    imageUrls = await Promise.all(promises);
                } else {
                    const results = await geminiService.editImageWithReference(fullPrompt, sceneImage, materialImage, numberOfImages);
                    imageUrls = results.map(r => r.imageUrl);
                }

                onStateChange({ resultImages: imageUrls });
                if (jobId && imageUrls.length > 0) await jobService.updateJobStatus(jobId, 'completed', imageUrls[0]);

                imageUrls.forEach(url => {
                     historyService.addToHistory({ tool: Tool.MaterialSwap, prompt: fullPrompt, sourceImageURL: sceneImage.objectURL, resultImageURL: url });
                });
            }

        } catch (err: any) {
            let msg = err.message;
            if (logId) msg += " (Credits đã hoàn lại)";
            onStateChange({ error: msg });
            if (jobId) await jobService.updateJobStatus(jobId, 'failed', undefined, err.message);
            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId && onDeductCredits) {
                await refundCredits(user.id, cost, `Hoàn tiền: Lỗi thay vật liệu (${err.message})`, logId);
            }
        } finally {
            onStateChange({ isLoading: false });
            setStatusMessage(null);
        }
    };

    const handleDownload = () => {
        if (resultImages.length === 0) return;
        // Download the first image by default or create a zip if multiple in future
        const link = document.createElement('a');
        link.href = resultImages[0];
        link.download = `material-swap-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div>
            {previewImage && <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />}
            <h2 className="text-2xl font-bold mb-4">AI Thay Vật Liệu / Staging</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6 bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border">
                    <ImageUpload onFileSelect={(f) => onStateChange({ sceneImage: f, resultImages: [] })} previewUrl={sceneImage?.objectURL} />
                    <ImageUpload onFileSelect={(f) => onStateChange({ materialImage: f })} previewUrl={materialImage?.objectURL} />
                    <textarea rows={3} className="w-full bg-surface dark:bg-gray-700/50 border rounded-lg p-3 text-sm" placeholder="Mô tả yêu cầu..." value={prompt} onChange={(e) => onStateChange({ prompt: e.target.value })} />
                    <div className="grid grid-cols-2 gap-4">
                        <NumberOfImagesSelector value={numberOfImages} onChange={(val) => onStateChange({ numberOfImages: val })} disabled={isLoading} />
                        <AspectRatioSelector value={aspectRatio} onChange={(val) => onStateChange({ aspectRatio: val })} disabled={isLoading} />
                    </div>
                    <ResolutionSelector value={resolution} onChange={(val) => onStateChange({ resolution: val })} disabled={isLoading} />
                    <div className="flex justify-between text-sm">
                        <span>Chi phí: <b>{cost} Credits</b></span>
                        <span>{userCredits < cost ? 'Không đủ' : `Còn: ${userCredits}`}</span>
                    </div>
                    <button onClick={handleGenerate} disabled={isLoading || !sceneImage || !materialImage || userCredits < cost} className="w-full py-3 bg-purple-600 text-white font-bold rounded-lg shadow-lg">
                        {isLoading ? <><Spinner /> {statusMessage || 'Đang xử lý...'}</> : 'Thực Hiện Thay Thế'}
                    </button>
                    {error && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
                    {upscaleWarning && <div className="text-xs text-yellow-500 text-center">{upscaleWarning}</div>}
                </div>
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold">Kết quả</h3>
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
                    <div className="w-full aspect-video bg-main-bg dark:bg-gray-800/50 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden">
                        {isLoading ? (
                            <div className="flex flex-col items-center">
                                <Spinner />
                                <p className="mt-2 text-gray-400">{statusMessage}</p>
                            </div>
                        ) : resultImages.length === 1 && sceneImage ? (
                            <ImageComparator originalImage={sceneImage.objectURL} resultImage={resultImages[0]} />
                        ) : resultImages.length > 1 ? (
                            <ResultGrid images={resultImages} toolName="material-swap" />
                        ) : (
                            <p className="text-gray-400">Kết quả sẽ hiển thị ở đây</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaterialSwapper;
