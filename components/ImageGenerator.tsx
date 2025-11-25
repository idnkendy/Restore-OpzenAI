
import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import * as jobService from '../services/jobService';
import { refundCredits } from '../services/paymentService';
import { FileData, Tool, AspectRatio, ImageResolution } from '../types';
import { ImageGeneratorState } from '../state/toolState';
import Spinner from './Spinner';
import ImageUpload from './common/ImageUpload';
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
    { value: 'dưới trời nắng gắt, bóng đổ rõ rệt', label: 'Nắng gắt' },
    { value: 'sau một cơn mưa, có vũng nước và phản chiếu', label: 'Sau mưa' },
];

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);

interface ImageGeneratorProps {
  state: ImageGeneratorState;
  onStateChange: (newState: Partial<ImageGeneratorState>) => void;
  onSendToViewSync: (image: FileData) => void;
  userCredits?: number;
  onDeductCredits?: (amount: number, description: string) => Promise<string>;
}

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ state, onStateChange, onSendToViewSync, userCredits = 0, onDeductCredits }) => {
    const { 
        style, context, lighting, weather, buildingType, customPrompt, referenceImage, 
        sourceImage, isLoading, isUpscaling, error, resultImages, upscaledImage, 
        numberOfImages, aspectRatio, resolution 
    } = state;
    
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [queuePosition, setQueuePosition] = useState<number | null>(null);
    const [activeJobId, setActiveJobId] = useState<string | null>(null);

    // Polling for queue position
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
                    setStatusMessage('Đang xử lý ảnh...');
                }
            };
            
            checkQueue(); // Initial check
            interval = setInterval(checkQueue, 5000); // Check every 5s
        } else {
            setQueuePosition(null);
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isLoading, activeJobId]);

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
             nextPrompt = newPart ? nextPrompt.replace(oldPart, newPart) : nextPrompt.replace(new RegExp(`,?\\s*${oldPart}`), '').replace(new RegExp(`${oldPart},?\\s*`), '');
        } else if (newPart) {
            nextPrompt = nextPrompt.trim() ? `${nextPrompt}, ${newPart}` : newPart;
        }

        const cleanedPrompt = nextPrompt
            .replace(/,+/g, ',')
            .split(',')
            .map(p => p.trim())
            .filter(p => p.length > 0)
            .join(', ');
            
        onStateChange({ customPrompt: cleanedPrompt });

    }, [customPrompt, onStateChange]);

    const handleBuildingTypeChange = (newVal: string) => {
        updatePrompt('buildingType', newVal, buildingType);
        onStateChange({ buildingType: newVal });
    };

    const handleStyleChange = (newVal: string) => {
        updatePrompt('style', newVal, style);
        onStateChange({ style: newVal });
    };

    const handleContextChange = (newVal: string) => {
        updatePrompt('context', newVal, context);
        onStateChange({ context: newVal });
    };

    const handleLightingChange = (newVal: string) => {
        updatePrompt('lighting', newVal, lighting);
        onStateChange({ lighting: newVal });
    };

    const handleWeatherChange = (newVal: string) => {
        updatePrompt('weather', newVal, weather);
        onStateChange({ weather: newVal });
    };

    const handleResolutionChange = (val: ImageResolution) => {
        onStateChange({ resolution: val });
    };

    const handleFileSelect = (fileData: FileData | null) => {
        onStateChange({ 
            sourceImage: fileData, 
            resultImages: [], 
            upscaledImage: null 
        });
    }

    const handleReferenceFileSelect = (fileData: FileData | null) => {
        onStateChange({ referenceImage: fileData });
    };

    const handleAutoPrompt = async () => {
        if (!sourceImage) {
            onStateChange({ error: 'Vui lòng tải ảnh lên trước khi tạo prompt tự động.' });
            return;
        }
        setIsGeneratingPrompt(true);
        onStateChange({ error: null });
        try {
            const generatedPrompt = await geminiService.generatePromptFromImageAndText(sourceImage, customPrompt);
            onStateChange({ customPrompt: generatedPrompt });
        } catch (err: any) {
            onStateChange({ error: err.message });
        } finally {
            setIsGeneratingPrompt(false);
        }
    };

    // Calculate cost based on resolution
    const getCostPerImage = () => {
        switch (resolution) {
            case 'Standard': return 5;
            case '1K': return 15;
            case '2K': return 20;
            case '4K': return 30;
            default: return 5;
        }
    };
    
    const cost = numberOfImages * getCostPerImage();

    const performGeneration = async (
        prompt: string, 
        sourceImage: FileData | null, 
        referenceImage: FileData | null, 
        numberOfImages: number,
        aspectRatio: AspectRatio,
        resolution: ImageResolution,
        jobId?: string
    ): Promise<string[]> => {
        
        // Construct a rich prompt
        let promptForService = "";
        if (sourceImage) {
             promptForService = `Generate an image with a strict aspect ratio of ${aspectRatio}. Adapt the composition from the source image to fit this new frame. Do not add black bars or letterbox. The main creative instruction is: ${prompt}`;
             if (referenceImage) {
                 promptForService += ` Also, take aesthetic inspiration (colors, materials, atmosphere) from the provided reference image.`;
             }
        } else {
             promptForService = `${prompt}, photorealistic architectural rendering, high detail, masterpiece`;
        }

        // High Quality (Nano Banana Pro 1K/2K/4K)
        if (resolution === '1K' || resolution === '2K' || resolution === '4K') {
            const promises = Array.from({ length: numberOfImages }).map(async () => {
                const images = await geminiService.generateHighQualityImage(promptForService, aspectRatio, resolution, sourceImage || undefined, jobId);
                return images[0];
            });
            return await Promise.all(promises);
        }

        // Standard (Nano Banana Flash)
        return await geminiService.generateStandardImage(promptForService, aspectRatio, numberOfImages, sourceImage || undefined, jobId);
    };

    const handleGenerate = async () => {
        if (onDeductCredits && userCredits < cost) {
             onStateChange({ error: `Bạn không đủ credits. Cần ${cost} credits nhưng chỉ còn ${userCredits}. Vui lòng nạp thêm.` });
             return;
        }

        if (!customPrompt.trim()) {
            onStateChange({ error: 'Lời nhắc (prompt) không được để trống.' });
            return;
        }
        
        onStateChange({ isLoading: true, error: null, resultImages: [], upscaledImage: null });
        setStatusMessage('Đang khởi tạo...');
        
        let jobId: string | null = null;
        let logId: string | null = null;

        try {
            // 1. Deduct credits
            if (onDeductCredits) {
                logId = await onDeductCredits(cost, `Render kiến trúc (${numberOfImages} ảnh) - ${resolution}`);
            }
            
            // 2. Create Job
            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId) {
                 jobId = await jobService.createJob({
                    user_id: user.id,
                    tool_id: Tool.ArchitecturalRendering,
                    prompt: customPrompt,
                    cost: cost,
                    usage_log_id: logId
                });
                setActiveJobId(jobId); // Set for queue polling
            }

            // 3. Smart Retry Logic
            let attempts = 0;
            const maxAttempts = 60; 
            let imageUrls: string[] = [];
            let success = false;

            if (resolution !== 'Standard') {
                 if (jobId) await jobService.updateJobStatus(jobId, 'processing');
                 // Pass jobId || undefined
                 imageUrls = await performGeneration(customPrompt, sourceImage, referenceImage, numberOfImages, aspectRatio, resolution, jobId || undefined);
                 success = true;
            } else {
                // Retry Loop for Standard/Flash
                while (attempts < maxAttempts) {
                    try {
                         if (jobId) await jobService.updateJobStatus(jobId, 'processing');
                         imageUrls = await performGeneration(customPrompt, sourceImage, referenceImage, numberOfImages, aspectRatio, resolution, jobId || undefined);
                         success = true;
                         break;
                    } catch (apiError: any) {
                        if (apiError.message === 'SYSTEM_BUSY') {
                            attempts++;
                            setStatusMessage(`Hệ thống đang bận (${attempts}), vui lòng đợi...`);
                            if (jobId) await jobService.updateJobStatus(jobId, 'pending');
                            await new Promise(resolve => setTimeout(resolve, 5000)); 
                        } else {
                            throw apiError; 
                        }
                    }
                }
            }

            if (!success) {
                 throw new Error("Hệ thống quá tải. Đã hoàn tiền, vui lòng thử lại sau.");
            }

            onStateChange({ resultImages: imageUrls });
            if (jobId && imageUrls.length > 0) {
                await jobService.updateJobStatus(jobId, 'completed', imageUrls[0]);
            }

            // Add history
            const historyPrompt = sourceImage 
                ? `Generate an image with a strict aspect ratio of ${aspectRatio}. Adapt the composition from the source image to fit this new frame. The main creative instruction is: ${customPrompt}`
                : `${customPrompt}, photorealistic architectural rendering, high detail, masterpiece`;

            imageUrls.forEach(url => {
                historyService.addToHistory({
                    tool: Tool.ArchitecturalRendering,
                    prompt: historyPrompt,
                    sourceImageURL: sourceImage?.objectURL,
                    resultImageURL: url,
                });
            });

        } catch (err: any) {
            console.error("Generation Error:", err);
            
            // GENERIC ERROR MESSAGE FOR USERS
            let userErrorMessage = 'Đã xảy ra lỗi trong quá trình xử lý. Vui lòng thử lại sau.';
            
            // Allow specific known errors to pass through if safe
            if (err.message.includes('không đủ credits') || err.message.includes('Credits')) {
                userErrorMessage = err.message;
            } else if (err.message.includes('Hệ thống quá tải')) {
                userErrorMessage = err.message;
            } else if (err.message.includes('Lỗi kết nối')) {
                userErrorMessage = err.message;
            }

            onStateChange({ error: userErrorMessage });
            
            if (jobId) {
                await jobService.updateJobStatus(jobId, 'failed', undefined, err.message);
            }
             const { data: { user } } = await supabase.auth.getUser();
             if (user) {
                await refundCredits(user.id, cost, `Hoàn tiền: Lỗi khi render kiến trúc (${err.message})`);
             }

        } finally {
            onStateChange({ isLoading: false });
            setStatusMessage(null);
            setActiveJobId(null);
            setQueuePosition(null);
        }
    };

    const handleUpscale = async () => {
        if (resultImages.length !== 1) return;
        const resultImage = resultImages[0];

        onStateChange({ isUpscaling: true, error: null });

        try {
            const parts = resultImage.split(';base64,');
            if (parts.length < 2) throw new Error("Invalid result image format for upscaling.");
            
            const mimeType = parts[0].split(':')[1];
            const base64 = parts[1];
            
            const imageToUpscale: FileData = {
                base64,
                mimeType,
                objectURL: resultImage
            };

            const upscalePrompt = "Upscale this architectural rendering to a high resolution. Enhance the details, textures, and lighting to make it look photorealistic and professional. Do not change the composition or the core design.";
            
            const result = await geminiService.editImage(upscalePrompt, imageToUpscale, 1);
            onStateChange({ upscaledImage: result[0].imageUrl });
        } catch (err: any) {
            onStateChange({ error: err.message || "Failed to upscale image." });
        } finally {
            onStateChange({ isUpscaling: false });
        }
    };

    const handleDownload = () => {
        const url = upscaledImage || (resultImages.length > 0 ? resultImages[0] : null);
        if (!url) return;
        
        const link = document.createElement('a');
        link.href = url;
        link.download = "generated-architecture.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSendImageToSync = (imageUrl: string) => {
        const parts = imageUrl.split(';base64,');
        if (parts.length < 2) {
            onStateChange({ error: "Không thể chuyển ảnh, định dạng không hợp lệ." });
            return;
        }

        const mimeType = parts[0].split(':')[1];
        const base64 = parts[1];

        const fileData: FileData = {
            base64,
            mimeType,
            objectURL: imageUrl,
        };

        onSendToViewSync(fileData);
    };

    return (
        <div className="flex flex-col gap-8">
            {previewImage && <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />}
            
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl md:text-3xl font-bold text-text-primary dark:text-white">AI Render Kiến trúc</h2>
                <p className="text-sm md:text-base text-text-secondary dark:text-gray-400">Biến phác thảo thành hiện thực hoặc tạo ý tưởng mới từ mô tả văn bản.</p>
            </div>
            
            {/* --- INPUTS CONTAINER --- */}
            <div className="space-y-6 bg-main-bg/50 dark:bg-dark-bg/50 p-4 md:p-6 rounded-xl border border-border-color dark:border-gray-700">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    
                    {/* Left Column: Image Uploads */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">1. Tải Lên Ảnh Phác Thảo (Sketch)</label>
                            <ImageUpload onFileSelect={handleFileSelect} previewUrl={sourceImage?.objectURL}/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Ảnh Tham Chiếu (Tùy chọn)</label>
                            <ImageUpload onFileSelect={handleReferenceFileSelect} previewUrl={referenceImage?.objectURL}/>
                        </div>
                    </div>

                    {/* Right Column: Prompts & Options */}
                    <div className="space-y-4 flex flex-col">
                        <div className="relative">
                            <label htmlFor="custom-prompt-architectural" className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                                2. Mô tả ý tưởng (Prompt)
                            </label>
                            <textarea
                                id="custom-prompt-architectural"
                                rows={4}
                                className="w-full bg-surface dark:bg-gray-700/50 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-accent focus:border-accent focus:outline-none transition-all resize-none text-sm md:text-base pb-10"
                                placeholder="VD: Một ngôi nhà phố hiện đại, mặt tiền 5m, nhiều cây xanh, cửa kính lớn, ánh sáng tự nhiên..."
                                value={customPrompt}
                                onChange={(e) => onStateChange({ customPrompt: e.target.value })}
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleAutoPrompt}
                                disabled={!sourceImage || isLoading || isUpscaling || isGeneratingPrompt}
                                className="absolute bottom-2 right-2 p-2 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors flex items-center gap-1 disabled:bg-gray-500 disabled:cursor-not-allowed"
                                title="Tạo prompt từ ảnh"
                            >
                                {isGeneratingPrompt ? <Spinner /> : <SparklesIcon />}
                                <span className="hidden sm:inline">Auto Prompt</span>
                            </button>
                        </div>

                        {/* Options Grid */}
                        <div className="pt-2">
                            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">3. Tinh chỉnh chi tiết</label>
                            <div className="space-y-4">
                                <OptionSelector id="building-type-selector" label="Loại công trình" options={buildingTypeOptions} value={buildingType} onChange={handleBuildingTypeChange} disabled={isLoading} variant="grid" />
                                <OptionSelector id="style-selector" label="Phong cách" options={styleOptions} value={style} onChange={handleStyleChange} disabled={isLoading} variant="grid" />
                                
                                {/* Adjusted Grid for Better Spacing on Tablet/Mobile */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                    <OptionSelector id="context-selector" label="Bối cảnh" options={contextOptions} value={context} onChange={handleContextChange} disabled={isLoading} variant="select" />
                                    <OptionSelector id="lighting-selector" label="Ánh sáng" options={lightingOptions} value={lighting} onChange={handleLightingChange} disabled={isLoading} variant="select" />
                                    <OptionSelector id="weather-selector" label="Thời tiết" options={weatherOptions} value={weather} onChange={handleWeatherChange} disabled={isLoading} variant="select" />
                                </div>
                            </div>
                        </div>
                        
                        {/* Output Settings */}
                        <div className="pt-4 grid grid-cols-2 gap-4">
                            <div>
                                <NumberOfImagesSelector value={numberOfImages} onChange={(val) => onStateChange({numberOfImages: val})} disabled={isLoading || isUpscaling} />
                            </div>
                            <div>
                                <AspectRatioSelector value={aspectRatio} onChange={(val) => onStateChange({aspectRatio: val})} disabled={isLoading || isUpscaling} />
                            </div>
                        </div>
                        
                        {/* Resolution Selector on its own row */}
                        <div className="pt-4">
                            <ResolutionSelector value={resolution} onChange={handleResolutionChange} disabled={isLoading || isUpscaling} />
                        </div>
                    </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="mt-4">
                    <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800/50 rounded-lg px-4 py-2 mb-3 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-sm text-text-secondary dark:text-gray-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
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
                        disabled={isLoading || !customPrompt.trim() || isUpscaling || userCredits < cost}
                        className="w-full flex justify-center items-center gap-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg"
                    >
                        {isLoading ? <><Spinner /> {statusMessage || 'Đang xử lý...'}</> : 'Bắt đầu Render'}
                    </button>
                     {error && <p className="mt-3 text-xs text-red-500 text-center bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-800">{error}</p>}
                </div>
            </div>

            {/* --- RESULTS SECTION --- */}
            <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h3 className="text-lg font-bold text-text-primary dark:text-white flex items-center gap-2">
                         Kết quả
                    </h3>
                    
                    {/* Action Buttons for Result */}
                    {resultImages.length === 1 && (
                        <div className="flex flex-wrap items-center gap-2">
                            {!upscaledImage && (
                                <button
                                    onClick={handleUpscale}
                                    disabled={isUpscaling || isLoading}
                                    className="flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-yellow-500/20"
                                >
                                    {isUpscaling ? <Spinner/> : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    )}
                                    <span>Upscale</span>
                                </button>
                            )}
                            <button
                                onClick={() => handleSendImageToSync(upscaledImage || resultImages[0])}
                                className="text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/20 hover:bg-accent-100 dark:hover:bg-accent-900/40 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-accent-200 dark:border-accent-800"
                            >
                                Đồng bộ View
                            </button>
                            <button
                                onClick={() => setPreviewImage(upscaledImage || resultImages[0])}
                                className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 p-1.5 rounded-lg transition-colors"
                                title="Phóng to"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                            </button>
                             <button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium shadow-sm transition-colors">
                                Tải xuống
                            </button>
                        </div>
                    )}
                </div>

                {/* Main Canvas Area */}
                <div className="w-full aspect-[4/3] bg-gray-100 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center overflow-hidden relative group">
                    {isLoading && (
                        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                            <div className="w-16 h-16 border-4 border-accent-200 border-t-accent-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-accent-600 dark:text-accent-400 font-medium animate-pulse">
                                {statusMessage || 'AI đang vẽ...'}
                            </p>
                            {queuePosition && queuePosition > 1 && (
                                <p className="text-sm text-gray-500 mt-2 font-medium">
                                    Vị trí trong hàng đợi: <span className="font-bold">{queuePosition}</span>
                                </p>
                            )}
                        </div>
                    )}

                    {!isLoading && upscaledImage && resultImages.length === 1 && (
                         <ImageComparator originalImage={resultImages[0]} resultImage={upscaledImage} />
                    )}
                    {!isLoading && !upscaledImage && resultImages.length === 1 && sourceImage && (
                         <ImageComparator originalImage={sourceImage.objectURL} resultImage={resultImages[0]} />
                    )}
                     {!isLoading && !upscaledImage && resultImages.length === 1 && !sourceImage && (
                        <img src={resultImages[0]} alt="Generated Result" className="w-full h-full object-contain" />
                    )}
                     {!isLoading && resultImages.length > 1 && (
                        <ResultGrid images={resultImages} toolName="architecture-render" onSendToViewSync={handleSendImageToSync} />
                    )}
                    {!isLoading && resultImages.length === 0 && (
                        <div className="text-center p-8 opacity-50">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 md:h-20 md:w-20 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-gray-500 dark:text-gray-400 text-base md:text-lg">Kết quả render sẽ xuất hiện ở đây</p>
                            <p className="text-xs md:text-sm text-gray-400 dark:text-gray-500">Hãy nhập mô tả hoặc tải ảnh lên để bắt đầu</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageGenerator;
