
// ... existing imports ...
import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import * as jobService from '../services/jobService';
import * as externalVideoService from '../services/externalVideoService';
import { refundCredits } from '../services/paymentService';
import { FileData, Tool, AspectRatio, ImageResolution } from '../types';
import { ImageGeneratorState } from '../state/toolState';
import Spinner from './Spinner';
import ImageUpload from './common/ImageUpload';
import MultiImageUpload from './common/MultiImageUpload';
import ImageComparator from './ImageComparator';
import NumberOfImagesSelector from './common/NumberOfImagesSelector';
import ResultGrid from './common/ResultGrid';
import OptionSelector from './common/OptionSelector';
import AspectRatioSelector from './common/AspectRatioSelector';
import ResolutionSelector from './common/ResolutionSelector';
import ImagePreviewModal from './common/ImagePreviewModal';
import { supabase } from '../services/supabaseClient';

const buildingTypeOptions = [
    { value: 'none', label: 'Tự động' },
    { value: 'nhà phố', label: 'Nhà phố' },
    { value: 'biệt thự', label: 'Biệt thự' },
    { value: 'nhà cấp 4', label: 'Nhà cấp 4' },
    { value: 'chung cư', label: 'Chung cư' },
    { value: 'toà nhà văn phòng', label: 'Văn phòng' },
    { value: 'quán cà phê', label: 'Cafe' },
    { value: 'nhà hàng', label: 'Nhà hàng' },
];

const styleOptions = [
    { value: 'none', label: 'Tự động' },
    { value: 'Hiện đại', label: 'Hiện đại' },
    { value: 'Tối giản', label: 'Tối giản' },
    { value: 'Tân Cổ điển', label: 'Tân Cổ điển' },
    { value: 'Scandinavian', label: 'Scandinavian' },
    { value: 'Công nghiệp', label: 'Industrial' },
    { value: 'Nhiệt đới', label: 'Nhiệt đới' },
    { value: 'Brutalism', label: 'Brutalism' },
];

const contextOptions = [
    { value: 'none', label: 'Tự động' },
    { value: 'trên một đường phố Việt Nam', label: 'Đường phố VN' },
    { value: 'ở một làng quê Việt Nam', label: 'Làng quê VN' },
    { value: 'trong một khu đô thị hiện đại Việt Nam', label: 'Đô thị hiện đại' },
    { value: 'tại một ngã ba đường phố Việt Nam', label: 'Ngã ba đường' },
    { value: 'tại một ngã tư đường phố Việt Nam', label: 'Ngã tư đường' },
];

const lightingOptions = [
    { value: 'none', label: 'Tự động' },
    { value: 'bình minh dịu nhẹ', label: 'Bình minh' },
    { value: 'buổi trưa, trời xanh trong', label: 'Trưa nắng' },
    { value: 'nắng chiều, nắng vàng cam', label: 'Hoàng hôn' },
    { value: 'buổi tối, đèn vàng từ trong nhà hắt ra, đèn đường sáng', label: 'Buổi tối' },
    { value: 'đêm khuya, đèn công trình sáng và bầu trời đầy sao', label: 'Đêm sao' },
];

const weatherOptions = [
    { value: 'none', label: 'Tự động' },
    { value: 'trời trong xanh, quang đãng', label: 'Trời trong' },
    { value: 'có mưa nhẹ và đường ướt', label: 'Mưa nhẹ' },
    { value: 'có tuyết rơi nhẹ', label: 'Tuyết rơi' },
    { value: 'under the scorching sun, clear shadows', label: 'Nắng gắt' },
    { value: 'after a rain, with puddles and reflections', label: 'Sau mưa' },
];

interface ImageGeneratorProps {
  state: ImageGeneratorState;
  onStateChange: (newState: Partial<ImageGeneratorState>) => void;
  onSendToViewSync: (image: FileData) => void;
  userCredits?: number;
  onDeductCredits?: (amount: number, description: string) => Promise<string>;
}

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ state, onStateChange, onSendToViewSync, userCredits = 0, onDeductCredits }) => {
    const { 
        style, context, lighting, weather, buildingType, customPrompt, referenceImages, 
        sourceImage, isLoading, isUpscaling, error, resultImages, upscaledImage, 
        numberOfImages, aspectRatio, resolution 
    } = state;
    
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [queuePosition, setQueuePosition] = useState<number | null>(null);
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [upscaleWarning, setUpscaleWarning] = useState<string | null>(null);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isLoading && activeJobId) {
            const checkQueue = async () => {
                const pos = await jobService.getQueuePosition(activeJobId);
                if (pos > 1) {
                    setQueuePosition(pos);
                    setStatusMessage(`Đang trong hàng đợi (Vị trí: ${pos})...`);
                } else {
                    setQueuePosition(null);
                    if (!statusMessage) {
                        setStatusMessage('Đang xử lý. Vui lòng đợi...');
                    }
                }
            };
            checkQueue();
            interval = setInterval(checkQueue, 10000); 
        } else {
            setQueuePosition(null);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [isLoading, activeJobId]);

    const escapeRegExp = (string: string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    const updatePrompt = useCallback((type: 'style' | 'context' | 'lighting' | 'weather' | 'buildingType', newValue: string, oldValue: string) => {
        const getPromptPart = (partType: string, value: string): string => {
            if (value === 'none' || !value) return '';
            switch (partType) {
                case 'style': return `phong cách ${value}`;
                case 'context': return `bối cảnh ${value}`;
                case 'lighting': return `ánh sáng ${value}`;
                case 'weather': return `thời tiết ${value}`;
                case 'buildingType': return `là một ${value}`;
                default: return '';
            }
        };

        const oldPart = getPromptPart(type, oldValue);
        const newPart = getPromptPart(type, newValue);
        let nextPrompt = customPrompt;

        if (oldPart && nextPrompt.includes(oldPart)) {
             const escapedOldPart = escapeRegExp(oldPart);
             nextPrompt = newPart 
                ? nextPrompt.replace(oldPart, newPart) 
                : nextPrompt.replace(new RegExp(`,?\\s*${escapedOldPart}`), '').replace(new RegExp(`${escapedOldPart},?\\s*`), '');
        } else if (newPart) {
            nextPrompt = nextPrompt.trim() ? `${nextPrompt}, ${newPart}` : newPart;
        }

        const cleanedPrompt = nextPrompt.replace(/,+/g, ',').split(',').map(p => p.trim()).filter(p => p.length > 0).join(', ');
        onStateChange({ customPrompt: cleanedPrompt });
    }, [customPrompt, onStateChange]);

    const handleBuildingTypeChange = (newVal: string) => { updatePrompt('buildingType', newVal, buildingType); onStateChange({ buildingType: newVal }); };
    const handleStyleChange = (newVal: string) => { updatePrompt('style', newVal, style); onStateChange({ style: newVal }); };
    const handleContextChange = (newVal: string) => { updatePrompt('context', newVal, context); onStateChange({ context: newVal }); };
    const handleLightingChange = (newVal: string) => { updatePrompt('lighting', newVal, lighting); onStateChange({ lighting: newVal }); };
    const handleWeatherChange = (newVal: string) => { updatePrompt('weather', newVal, weather); onStateChange({ weather: newVal }); };
    
    const handleResolutionChange = (val: ImageResolution) => { 
        onStateChange({ resolution: val });
        if (val === 'Standard') {
            onStateChange({ referenceImages: [] });
        }
    };
    
    const handleFileSelect = (fileData: FileData | null) => { onStateChange({ sourceImage: fileData, resultImages: [], upscaledImage: null }); }
    const handleReferenceFilesChange = (files: FileData[]) => { onStateChange({ referenceImages: files }); };

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

    const constructArchitecturalPrompt = () => {
        let basePrompt = sourceImage 
            ? `Generate an image with a strict aspect ratio of ${aspectRatio}. Adapt the composition from the source image to fit this new frame. ${customPrompt}`
            : `${customPrompt}, photorealistic architectural rendering, high detail, masterpiece`;

        if (referenceImages.length > 0) {
            basePrompt += ` Also, take aesthetic inspiration from the provided reference image(s).`;
        }

        basePrompt = `You are a professional architectural renderer. ${basePrompt}`;

        return basePrompt;
    };

    const handleGenerate = async () => {
        if (onDeductCredits && userCredits < cost) {
             onStateChange({ error: `Bạn không đủ credits. Cần ${cost} credits.` });
             return;
        }
        if (!customPrompt.trim()) { onStateChange({ error: 'Lời nhắc không được để trống.' }); return; }
        
        onStateChange({ isLoading: true, error: null, resultImages: [], upscaledImage: null });
        setStatusMessage('Đang xử lý. Vui lòng đợi...');
        setUpscaleWarning(null);
        
        let jobId: string | null = null;
        let logId: string | null = null;

        // Use Flow for all resolutions now (Standard, 1K, 2K, 4K)
        const useFlow = true;

        try {
            if (onDeductCredits) {
                logId = await onDeductCredits(cost, `Render kiến trúc (${numberOfImages} ảnh) - ${resolution}`);
                await new Promise(r => setTimeout(r, 300));
            }
            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId) {
                 jobId = await jobService.createJob({ user_id: user.id, tool_id: Tool.ArchitecturalRendering, prompt: customPrompt, cost: cost, usage_log_id: logId });
                setActiveJobId(jobId);
            }
            if (jobId) await jobService.updateJobStatus(jobId, 'processing');

            const promptForService = constructArchitecturalPrompt();

            if (useFlow) {
                let aspectEnum = 'IMAGE_ASPECT_RATIO_SQUARE';
                if (aspectRatio === '16:9' ) {
                    aspectEnum = 'IMAGE_ASPECT_RATIO_LANDSCAPE';
                } else if (aspectRatio === '9:16' ) {
                    aspectEnum = 'IMAGE_ASPECT_RATIO_PORTRAIT';
                }

                const modelName = resolution === 'Standard' ? "GEM_PIX" : "GEM_PIX_2";
                const collectedUrls: string[] = [];
                let completedCount = 0;
                let lastError: any = null;

                const promises = Array.from({ length: numberOfImages }).map(async (_, index) => {
                    try {
                        setStatusMessage('Đang xử lý. Vui lòng đợi...');
                        
                        const inputImages: FileData[] = [];
                        if (sourceImage) inputImages.push(sourceImage);
                        if (referenceImages && referenceImages.length > 0) inputImages.push(...referenceImages);

                        const result = await externalVideoService.generateFlowImage(
                            promptForService,
                            inputImages, 
                            aspectEnum,
                            1,
                            modelName,
                            (msg) => setStatusMessage('Đang xử lý. Vui lòng đợi...')
                        );

                        if (result.imageUrls && result.imageUrls.length > 0) {
                            let finalUrl = result.imageUrls[0];

                            // Check upscale for 2K or 4K
                            const shouldUpscale = (resolution === '2K' || resolution === '4K') && result.mediaIds && result.mediaIds.length > 0;

                            if (shouldUpscale) {
                                setStatusMessage(resolution === '4K' ? 'Đang xử lý (Upscale 4K)...' : 'Đang xử lý (Upscale 2K)...');
                                try {
                                    const mediaId = result.mediaIds[0];
                                    if (mediaId) {
                                        const targetRes = resolution === '4K' ? 'UPSAMPLE_IMAGE_RESOLUTION_4K' : 'UPSAMPLE_IMAGE_RESOLUTION_2K';
                                        const upscaleResult = await externalVideoService.upscaleFlowImage(
                                            mediaId,
                                            result.projectId,
                                            targetRes
                                        );
                                        if (upscaleResult && upscaleResult.imageUrl) {
                                            finalUrl = upscaleResult.imageUrl;
                                        }
                                    }
                                } catch (upscaleErr: any) {
                                    // STRICT FAILURE for Upscale
                                    throw new Error(`Lỗi Upscale: ${upscaleErr.message}`);
                                }
                            }
                            
                            collectedUrls.push(finalUrl);
                            completedCount++;
                            onStateChange({ resultImages: [...collectedUrls] });
                            
                            historyService.addToHistory({
                                tool: Tool.ArchitecturalRendering,
                                prompt: `Flow (${modelName}): ${promptForService}`,
                                sourceImageURL: sourceImage?.objectURL,
                                resultImageURL: finalUrl,
                            });
                        } else {
                            throw new Error("Không nhận được dữ liệu ảnh từ server.");
                        }
                    } catch (e: any) {
                        console.error(`Image ${index+1} generation failed`, e);
                        lastError = e;
                    }
                });

                await Promise.all(promises);

                if (collectedUrls.length === 0) {
                    const errorMsg = lastError ? (lastError.message || lastError.toString()) : "Không thể tạo ảnh nào. Vui lòng thử lại sau.";
                    throw new Error(errorMsg);
                }
                
                if (jobId && collectedUrls.length > 0) await jobService.updateJobStatus(jobId, 'completed', collectedUrls[0]);

            } else {
                // Fallback (currently unused if useFlow is true)
                setStatusMessage('Đang xử lý. Vui lòng đợi...');
                const promises = Array.from({ length: numberOfImages }).map(async () => {
                    const images = await geminiService.generateHighQualityImage(
                        promptForService, 
                        aspectRatio, 
                        resolution, // 4K passed here
                        sourceImage || undefined, 
                        jobId || undefined, 
                        referenceImages
                    );
                    return images[0];
                });
                
                const imageUrls = await Promise.all(promises);
                onStateChange({ resultImages: imageUrls });
                
                if (jobId && imageUrls.length > 0) await jobService.updateJobStatus(jobId, 'completed', imageUrls[0]);
                
                imageUrls.forEach(url => historyService.addToHistory({ 
                    tool: Tool.ArchitecturalRendering, 
                    prompt: `Gemini Pro 4K: ${promptForService}`, 
                    sourceImageURL: sourceImage?.objectURL, 
                    resultImageURL: url 
                }));
            }

        } catch (err: any) {
            let msg = err.message;
            if (logId) msg += " (Credits đã hoàn lại)";
            onStateChange({ error: msg });
            if (jobId) await jobService.updateJobStatus(jobId, 'failed', undefined, err.message);
            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId) await refundCredits(user.id, cost, `Hoàn tiền: Lỗi hệ thống (${err.message})`, logId);
        } finally {
            onStateChange({ isLoading: false });
            setStatusMessage(null);
            setActiveJobId(null);
        }
    };

    const handleUpscale = async () => {
        if (resultImages.length !== 1) return;
        onStateChange({ isUpscaling: true, error: null });
        setStatusMessage('Đang xử lý. Vui lòng đợi...');
        try {
            const imageToUpscale = await geminiService.getFileDataFromUrl(resultImages[0]);
            const result = await geminiService.editImage("Upscale this architectural rendering to high resolution. Enhance textures and detail.", imageToUpscale, 1);
            onStateChange({ upscaledImage: result[0].imageUrl });
        } catch (err: any) { onStateChange({ error: err.message }); } finally { onStateChange({ isUpscaling: false }); setStatusMessage(null); }
    };

    const handleDownload = () => {
        const url = upscaledImage || (resultImages.length > 0 ? resultImages[0] : null);
        if (!url) return;
        const link = document.createElement('a'); link.href = url; link.download = "render.png"; link.click();
    };

    const handleSendImageToSync = async (imageUrl: string) => {
        try { const fileData = await geminiService.getFileDataFromUrl(imageUrl); onSendToViewSync(fileData); } catch (e) { onStateChange({ error: "Lỗi chuyển ảnh." }); }
    };

    return (
        <div className="flex flex-col gap-8">
            {previewImage && <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />}
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl md:text-3xl font-bold text-text-primary dark:text-white">AI Render Kiến trúc</h2>
                <p className="text-sm md:text-base text-text-secondary dark:text-gray-400">Biến phác thảo thành hiện thực hoặc tạo ý tưởng mới từ mô tả văn bản.</p>
            </div>
            
            <div className="space-y-6 bg-main-bg/50 dark:bg-dark-bg/50 p-4 md:p-6 rounded-xl border border-border-color dark:border-gray-700">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">1. Tải Lên Ảnh Phác Thảo (Sketch)</label>
                            <ImageUpload onFileSelect={handleFileSelect} previewUrl={sourceImage?.objectURL}/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Ảnh Tham Chiếu (Tối đa 5 ảnh)</label>
                            {resolution === 'Standard' ? (
                                <div className="p-4 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center text-center gap-2 min-h-[120px]">
                                    <span className="material-symbols-outlined text-yellow-500 text-3xl">lock</span>
                                    <p className="text-sm text-text-secondary dark:text-gray-400">
                                        Ảnh tham chiếu chỉ hoạt động ở các bản <span className="font-bold text-text-primary dark:text-white">Nano Pro</span> (1K trở lên).
                                    </p>
                                    <button 
                                        onClick={() => handleResolutionChange('1K')}
                                        className="text-xs text-[#7f13ec] hover:underline font-semibold"
                                    >
                                        Nâng cao chất lượng ảnh ngay
                                    </button>
                                </div>
                            ) : (
                                <MultiImageUpload onFilesChange={handleReferenceFilesChange} maxFiles={5} />
                            )}
                        </div>
                    </div>
                    <div className="space-y-4 flex flex-col">
                        <div className="relative">
                            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">2. Mô tả ý tưởng (Prompt)</label>
                            <textarea rows={4} className="w-full bg-surface dark:bg-gray-700/50 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-accent outline-none resize-none text-sm" placeholder="VD: Một ngôi nhà phố hiện đại, mặt tiền 5m, nhiều cây xanh..." value={customPrompt} onChange={(e) => onStateChange({ customPrompt: e.target.value })} disabled={isLoading} />
                        </div>
                        <div className="pt-2">
                            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">3. Tinh chỉnh chi tiết</label>
                            <div className="space-y-4">
                                <OptionSelector id="building-type-selector" label="Loại công trình" options={buildingTypeOptions} value={buildingType} onChange={handleBuildingTypeChange} disabled={isLoading} variant="grid" />
                                <OptionSelector id="style-selector" label="Phong cách" options={styleOptions} value={style} onChange={handleStyleChange} disabled={isLoading} variant="grid" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                    <OptionSelector id="context-selector" label="Bối cảnh" options={contextOptions} value={context} onChange={handleContextChange} disabled={isLoading} variant="select" />
                                    <OptionSelector id="lighting-selector" label="Ánh sáng" options={lightingOptions} value={lighting} onChange={handleLightingChange} disabled={isLoading} variant="select" />
                                    <OptionSelector id="weather-selector" label="Thời tiết" options={weatherOptions} value={weather} onChange={handleWeatherChange} disabled={isLoading} variant="select" />
                                </div>
                            </div>
                        </div>
                        <div className="pt-4 grid grid-cols-2 gap-4">
                            <NumberOfImagesSelector value={numberOfImages} onChange={(val) => onStateChange({numberOfImages: val})} disabled={isLoading || isUpscaling} />
                            <AspectRatioSelector value={aspectRatio} onChange={(val) => onStateChange({aspectRatio: val})} disabled={isLoading || isUpscaling} />
                        </div>
                        <div className="pt-4"><ResolutionSelector value={resolution} onChange={handleResolutionChange} disabled={isLoading || isUpscaling} /></div>
                    </div>
                </div>

                <div className="mt-4">
                    <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800/50 rounded-lg px-4 py-2 mb-3 border border-gray-200 dark:border-gray-700">
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
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading || !customPrompt.trim() || isUpscaling || userCredits < cost}
                            className="flex-1 flex justify-center items-center gap-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg shadow-lg"
                        >
                            {isLoading ? <><Spinner /> {statusMessage || 'Đang xử lý. Vui lòng đợi...'}</> : `Bắt đầu Render`}
                        </button>
                    </div>

                     {error && (
                        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 animate-fade-in">
                            <div className="p-2 bg-red-100 dark:bg-red-800/30 rounded-full flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-red-800 dark:text-red-300">Đã xảy ra lỗi</h4>
                                <p className="text-sm text-red-700 dark:text-red-400 mt-1 leading-relaxed">{error}</p>
                            </div>
                        </div>
                     )}
                     {upscaleWarning && <p className="mt-3 text-sm text-yellow-500 text-center font-medium bg-yellow-100 dark:bg-yellow-900/20 p-2 rounded">{upscaleWarning}</p>}
                </div>
            </div>

            <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h3 className="text-lg font-bold text-text-primary dark:text-white">Kết quả</h3>
                    {resultImages.length === 1 && (
                        <div className="flex flex-wrap items-center gap-2">
                            {!upscaledImage && <button onClick={handleUpscale} disabled={isUpscaling || isLoading} className="flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-3 py-1.5 rounded-lg text-sm font-medium border border-yellow-500/20">{isUpscaling ? <Spinner /> : <span className="material-symbols-outlined text-sm">bolt</span>}<span>Upscale</span></button>}
                            <button onClick={() => handleSendImageToSync(upscaledImage || resultImages[0])} className="text-accent-600 bg-accent-50 hover:bg-accent-100 px-3 py-1.5 rounded-lg text-sm font-medium border border-accent-200">Đồng bộ View</button>
                            <button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium shadow-sm">Tải xuống</button>
                        </div>
                    )}
                </div>
                <div className="w-full aspect-[4/3] bg-gray-100 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center overflow-hidden relative">
                    {isLoading && (
                        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                            <div className="w-16 h-16 border-4 border-accent-200 border-t-accent-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-accent-600 dark:text-accent-400 font-medium animate-pulse">{statusMessage || 'Đang xử lý. Vui lòng đợi...'}</p>
                        </div>
                    )}
                    {!isLoading && upscaledImage && resultImages.length === 1 && <ImageComparator originalImage={resultImages[0]} resultImage={upscaledImage} />}
                    {!isLoading && !upscaledImage && resultImages.length === 1 && sourceImage && <ImageComparator originalImage={sourceImage.objectURL} resultImage={resultImages[0]} />}
                     {!isLoading && !upscaledImage && resultImages.length === 1 && !sourceImage && <img src={resultImages[0]} className="w-full h-full object-contain" />}
                     {!isLoading && resultImages.length > 1 && <ResultGrid images={resultImages} toolName="architecture-render" onSendToViewSync={handleSendImageToSync} />}
                    {!isLoading && resultImages.length === 0 && <div className="text-center opacity-50"><p className="text-gray-500">Kết quả render sẽ xuất hiện ở đây</p></div>}
                </div>
            </div>
        </div>
    );
};

export default ImageGenerator;
