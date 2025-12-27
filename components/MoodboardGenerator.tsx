
import React, { useState } from 'react';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import * as jobService from '../services/jobService';
import * as externalVideoService from '../services/externalVideoService'; // Import Flow
import { FileData, Tool, AspectRatio, ImageResolution } from '../types';
import { MoodboardGeneratorState } from '../state/toolState';
import { refundCredits } from '../services/paymentService';
import { supabase } from '../services/supabaseClient';
import Spinner from './Spinner';
import ImageUpload from './common/ImageUpload';
import NumberOfImagesSelector from './common/NumberOfImagesSelector';
import ResultGrid from './common/ResultGrid';
import AspectRatioSelector from './common/AspectRatioSelector';
import ResolutionSelector from './common/ResolutionSelector';
import ImagePreviewModal from './common/ImagePreviewModal';

interface MoodboardGeneratorProps {
    state: MoodboardGeneratorState;
    onStateChange: (newState: Partial<MoodboardGeneratorState>) => void;
    userCredits?: number;
    onDeductCredits?: (amount: number, description: string) => Promise<string>;
}

const MoodboardGenerator: React.FC<MoodboardGeneratorProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits }) => {
    const { prompt, sourceImage, isLoading, error, resultImages, numberOfImages, aspectRatio, mode, resolution } = state;
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

        if (!sourceImage) {
            onStateChange({ error: 'Vui lòng tải lên ảnh để bắt đầu.' });
            return;
        }
        onStateChange({ isLoading: true, error: null, resultImages: [] });
        setStatusMessage('Đang phân tích...');
        setUpscaleWarning(null);

        let logId: string | null = null;
        let jobId: string | null = null;

        // Use Flow for ALL resolutions
        const useFlow = true;

        try {
            if (onDeductCredits) {
                logId = await onDeductCredits(cost, `Tạo Moodboard (${numberOfImages} ảnh) - ${resolution}`);
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId) {
                jobId = await jobService.createJob({
                    user_id: user.id,
                    tool_id: Tool.Moodboard,
                    prompt: prompt,
                    cost: cost,
                    usage_log_id: logId
                });
            }

            if (jobId) await jobService.updateJobStatus(jobId, 'processing');

            const fullPrompt = mode === 'moodboardToScene' 
                ? `Generate a photorealistic scene from this moodboard. Instruction: ${prompt}` 
                : `Extract materials and colors from this scene into a clean vertical moodboard layout.`;

            let imageUrls: string[] = [];

            if (useFlow) {
                // --- FLOW LOGIC ---
                let aspectEnum = 'IMAGE_ASPECT_RATIO_SQUARE';
                if (aspectRatio === '16:9' ) aspectEnum = 'IMAGE_ASPECT_RATIO_LANDSCAPE';
                else if (aspectRatio === '9:16' ) aspectEnum = 'IMAGE_ASPECT_RATIO_PORTRAIT';

                const modelName = resolution === 'Standard' ? "GEM_PIX" : "GEM_PIX_2";
                const collectedUrls: string[] = [];
                let completedCount = 0;
                let lastError: any = null;

                const promises = Array.from({ length: numberOfImages }).map(async (_, index) => {
                    try {
                        setStatusMessage('Đang xử lý. Vui lòng đợi...');
                        
                        const result = await externalVideoService.generateFlowImage(
                            fullPrompt,
                            [sourceImage], // Moodboard needs source
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
                            completedCount++;
                            onStateChange({ resultImages: [...collectedUrls] });
                            
                            historyService.addToHistory({
                                tool: Tool.Moodboard,
                                prompt: `Flow (${modelName}): ${fullPrompt}`,
                                sourceImageURL: sourceImage.objectURL,
                                resultImageURL: finalUrl,
                            });
                        }
                    } catch (e: any) {
                        console.error(`Image ${index+1} failed`, e);
                        lastError = e;
                    }
                });

                await Promise.all(promises);
                if (collectedUrls.length === 0) throw new Error(lastError ? lastError.message : "Không thể tạo ảnh.");
                imageUrls = collectedUrls;

            } else {
                // Fallback (Not reached if useFlow=true)
                setStatusMessage('Đang xử lý. Vui lòng đợi...');
                const promises = Array.from({ length: numberOfImages }).map(async () => {
                    const images = await geminiService.generateHighQualityImage(fullPrompt, aspectRatio, resolution, sourceImage, jobId || undefined);
                    return images[0];
                });
                imageUrls = await Promise.all(promises);
                
                onStateChange({ resultImages: imageUrls });
                imageUrls.forEach(url => {
                    historyService.addToHistory({ tool: Tool.Moodboard, prompt: `Gemini Pro: ${fullPrompt}`, sourceImageURL: sourceImage.objectURL, resultImageURL: url });
                });
            }

            if (jobId && imageUrls.length > 0) await jobService.updateJobStatus(jobId, 'completed', imageUrls[0]);
            
        } catch (err: any) {
            let errorMsg = err.message || "Lỗi không xác định";
            if (logId) errorMsg += " (Credits đã được hoàn lại)";
            onStateChange({ error: errorMsg });
            
            if (jobId) await jobService.updateJobStatus(jobId, 'failed', undefined, err.message);
            
            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId && onDeductCredits) {
                await refundCredits(user.id, cost, `Hoàn tiền: Lỗi moodboard (${err.message})`, logId);
            }
        } finally {
            onStateChange({ isLoading: false });
            setStatusMessage(null);
        }
    };

    return (
        <div className="flex flex-col gap-8">
            {previewImage && <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />}
            <h2 className="text-2xl font-bold">AI Moodboard</h2>
            <div className="bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border space-y-6">
                <div className="grid grid-cols-2 gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <button onClick={() => onStateChange({ mode: 'moodboardToScene', resultImages: [] })} className={`py-2 rounded-md text-sm font-semibold ${mode === 'moodboardToScene' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>Moodboard &rarr; Không gian</button>
                    <button onClick={() => onStateChange({ mode: 'sceneToMoodboard', resultImages: [] })} className={`py-2 rounded-md text-sm font-semibold ${mode === 'sceneToMoodboard' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>Không gian &rarr; Moodboard</button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ImageUpload onFileSelect={(f) => onStateChange({ sourceImage: f, resultImages: [] })} previewUrl={sourceImage?.objectURL} />
                    <div className="space-y-4">
                        <textarea rows={4} className="w-full bg-surface dark:bg-gray-700/50 border rounded-lg p-3 text-sm" placeholder="Mô tả..." value={prompt} onChange={(e) => onStateChange({ prompt: e.target.value })} />
                        <div className="grid grid-cols-2 gap-4">
                            <NumberOfImagesSelector value={numberOfImages} onChange={(val) => onStateChange({ numberOfImages: val })} disabled={isLoading} />
                            <AspectRatioSelector value={aspectRatio} onChange={(val) => onStateChange({ aspectRatio: val })} disabled={isLoading} />
                        </div>
                        <ResolutionSelector value={resolution} onChange={(val) => onStateChange({ resolution: val })} disabled={isLoading} />
                        <button onClick={handleGenerate} disabled={isLoading || !sourceImage || userCredits < cost} className="w-full py-3 bg-purple-600 text-white font-bold rounded-lg transition-colors">
                            {isLoading ? <><Spinner /> {statusMessage || 'Đang xử lý. Vui lòng đợi...'}</> : 'Tạo Moodboard'}
                        </button>
                        {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">{error}</div>}
                        {upscaleWarning && <p className="text-xs text-yellow-500 text-center">{upscaleWarning}</p>}
                    </div>
                </div>
            </div>
            <div className="aspect-video bg-main-bg dark:bg-gray-800/50 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center">
                        <Spinner />
                        <p className="mt-2 text-text-secondary dark:text-gray-400">{statusMessage || 'Đang xử lý. Vui lòng đợi...'}</p>
                    </div>
                ) : resultImages.length > 0 ? <ResultGrid images={resultImages} toolName="moodboard" /> : <p className="text-gray-400">Kết quả sẽ hiển thị ở đây</p>}
            </div>
        </div>
    );
};

export default MoodboardGenerator;
