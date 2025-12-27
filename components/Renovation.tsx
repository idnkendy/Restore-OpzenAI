
import React, { useState } from 'react';
import { FileData, Tool, AspectRatio, ImageResolution } from '../types';
import { RenovationState } from '../state/toolState';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import * as jobService from '../services/jobService';
import * as externalVideoService from '../services/externalVideoService';
import { refundCredits } from '../services/paymentService';
import { supabase } from '../services/supabaseClient';
import Spinner from './Spinner';
import ImageUpload from './common/ImageUpload';
import ImageComparator from './ImageComparator';
import NumberOfImagesSelector from './common/NumberOfImagesSelector';
import ResultGrid from './common/ResultGrid';
import AspectRatioSelector from './common/AspectRatioSelector';
import ImagePreviewModal from './common/ImagePreviewModal';
import MaskingModal from './MaskingModal';
import ResolutionSelector from './common/ResolutionSelector';
import MultiImageUpload from './common/MultiImageUpload';
import OptionSelector from './common/OptionSelector';

const renovationSuggestions = [
    { label: 'Nâng tầng', prompt: 'Nâng thêm 1 tầng cho công trình, giữ phong cách kiến trúc hiện có.' },
    { label: 'Đổi màu sơn', prompt: 'Thay đổi màu sơn ngoại thất của công trình thành màu trắng kem, các chi tiết cửa sổ màu đen.' },
    { label: 'Giữ lại khối', prompt: 'Cải tạo lại mặt tiền nhưng giữ nguyên hình khối và cấu trúc chính.' },
    { label: 'Thay đổi khối', prompt: 'Cải tạo toàn bộ, thay đổi hình khối của công trình để trở nên ấn tượng và hiện đại hơn.' },
    { label: 'Đưa ảnh vẽ tay/khối vào không gian', prompt: 'Thiết kế hoàn thiện công trình ở ảnh tham chiếu và đưa vào vùng tô đỏ của ảnh thực tế.' },
    { label: 'Đưa mẫu công trình vào không gian', prompt: 'Đưa mẫu công trình ở ảnh tham chiếu và đưa vào vùng tô đỏ của ảnh thực tế.' },
];

interface RenovationProps {
    state: RenovationState;
    onStateChange: (newState: Partial<RenovationState>) => void;
    userCredits?: number;
    onDeductCredits?: (amount: number, description: string) => Promise<string>;
}

const Renovation: React.FC<RenovationProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits }) => {
    const { prompt, sourceImage, referenceImages, maskImage, isLoading, error, renovatedImages, numberOfImages, aspectRatio, resolution } = state;
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isMaskingModalOpen, setIsMaskingModalOpen] = useState<boolean>(false);
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
        if (val === 'Standard') {
            onStateChange({ referenceImages: [] });
        }
    };

    const constructRenovationPrompt = () => {
        let finalPrompt = `Generate an image with a strict aspect ratio of ${aspectRatio}. Adapt the composition from the source image to fit this new frame while performing the renovation. Do not add black bars or letterbox. The renovation instruction is: ${prompt}`;
        if (referenceImages && referenceImages.length > 0) {
            finalPrompt += " Also, take aesthetic inspiration (colors, materials, atmosphere) from the provided reference image(s).";
        }
        finalPrompt = `You are a professional architectural renovator. ${finalPrompt}`;
        return finalPrompt;
    };

    const handleGenerate = async () => {
        if (onDeductCredits && userCredits < cost) {
             onStateChange({ error: `Bạn không đủ credits. Cần ${cost} credits nhưng chỉ còn ${userCredits}. Vui lòng nạp thêm.` });
             return;
        }

        if (!prompt) {
            onStateChange({ error: 'Vui lòng nhập mô tả phương án cải tạo.' });
            return;
        }
        if (!sourceImage) {
            onStateChange({ error: 'Vui lòng tải lên một hình ảnh thực tế để bắt đầu.' });
            return;
        }

        onStateChange({ isLoading: true, error: null, renovatedImages: [] });
        setStatusMessage('Đang xử lý. Vui lòng đợi...');
        setUpscaleWarning(null);

        let logId: string | null = null;
        let jobId: string | null = null;

        // Allow 4K generation via Flow if no mask is used
        const useFlow = !maskImage; 
        const promptForService = constructRenovationPrompt();

        try {
            if (onDeductCredits) {
                logId = await onDeductCredits(cost, `Cải tạo thiết kế (${numberOfImages} ảnh) - ${resolution}`);
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId) {
                 jobId = await jobService.createJob({
                    user_id: user.id,
                    tool_id: Tool.Renovation,
                    prompt: prompt,
                    cost: cost,
                    usage_log_id: logId
                });
            }

            if (jobId) await jobService.updateJobStatus(jobId, 'processing');

            let imageUrls: string[] = [];

            if (useFlow) {
                // --- FLOW LOGIC ---
                let aspectEnum = 'IMAGE_ASPECT_RATIO_SQUARE';
                if (aspectRatio === '16:9') {
                    aspectEnum = 'IMAGE_ASPECT_RATIO_LANDSCAPE';
                } else if (aspectRatio === '9:16') {
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

                            // Upscale Check
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
                                    throw new Error(`Lỗi Upscale: ${upscaleErr.message}`);
                                }
                            }
                            
                            collectedUrls.push(finalUrl);
                            completedCount++;
                            onStateChange({ renovatedImages: [...collectedUrls] });
                            
                            historyService.addToHistory({
                                tool: Tool.Renovation,
                                prompt: `Flow (${modelName}): ${promptForService}`,
                                sourceImageURL: sourceImage?.objectURL,
                                resultImageURL: finalUrl,
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
                if (jobId && collectedUrls.length > 0) await jobService.updateJobStatus(jobId, 'completed', collectedUrls[0]);

            } else {
                // --- GOOGLE API LOGIC (MASK or Fallback) ---
                setStatusMessage('Đang xử lý. Vui lòng đợi...');
                const promises = Array.from({ length: numberOfImages }).map(async () => {
                    const images = await geminiService.generateHighQualityImage(
                        promptForService, 
                        aspectRatio, 
                        resolution === 'Standard' ? '1K' : resolution, 
                        sourceImage, 
                        jobId || undefined, 
                        referenceImages,
                        maskImage || undefined
                    );
                    return images[0];
                });
                
                const imageUrls = await Promise.all(promises);
                onStateChange({ renovatedImages: imageUrls });
                if (jobId && imageUrls.length > 0) await jobService.updateJobStatus(jobId, 'completed', imageUrls[0]);
                
                imageUrls.forEach(url => historyService.addToHistory({
                    tool: Tool.Renovation,
                    prompt: `Gemini API: ${promptForService}`,
                    sourceImageURL: sourceImage?.objectURL,
                    resultImageURL: url,
                }));
            }

        } catch (err: any) {
            let errorMessage = err.message || 'Đã xảy ra lỗi không mong muốn.';
            if (logId) {
                errorMessage += " (Credits đã được hoàn lại)";
            }
            onStateChange({ error: errorMessage });

            if (jobId) await jobService.updateJobStatus(jobId, 'failed', undefined, errorMessage);

            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId && onDeductCredits) {
                await refundCredits(user.id, cost, `Hoàn tiền: Lỗi cải tạo (${err.message})`, logId);
            }
        } finally {
            onStateChange({ isLoading: false });
            setStatusMessage(null);
        }
    };

    const handleFileSelect = (fileData: FileData | null) => {
        onStateChange({ sourceImage: fileData, renovatedImages: [], maskImage: null });
    };

    const handleReferenceFilesChange = (files: FileData[]) => {
        onStateChange({ referenceImages: files });
    };

    const handleApplyMask = (mask: FileData) => {
        onStateChange({ maskImage: mask });
        setIsMaskingModalOpen(false);
    };

    const handleDownload = () => {
        if (renovatedImages.length !== 1) return;
        const link = document.createElement('a');
        link.href = renovatedImages[0];
        link.download = "renovated-image.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col gap-8">
            {previewImage && <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />}
            {isMaskingModalOpen && sourceImage && (
                <MaskingModal 
                    image={sourceImage} 
                    onClose={() => setIsMaskingModalOpen(false)} 
                    onApply={handleApplyMask} 
                    maskColor="rgba(239, 68, 68, 0.5)"
                />
            )}
            <div>
                <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">AI Cải Tạo Kiến Trúc</h2>
                <div className="bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">1. Tải Lên Ảnh Hiện Trạng</label>
                                <ImageUpload onFileSelect={handleFileSelect} previewUrl={sourceImage?.objectURL} maskPreviewUrl={maskImage?.objectURL} />
                                {sourceImage && (
                                    <div className="mt-2 flex gap-2">
                                        <button 
                                            onClick={() => setIsMaskingModalOpen(true)}
                                            className="text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1"
                                        >
                                            <span className="material-symbols-outlined text-sm">edit_square</span>
                                            {maskImage ? 'Sửa vùng chọn' : 'Khoanh vùng cải tạo'}
                                        </button>
                                        {maskImage && (
                                            <button 
                                                onClick={() => onStateChange({ maskImage: null })}
                                                className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 px-3 py-1.5 rounded-md transition-colors"
                                            >
                                                Xóa vùng chọn
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Ảnh Tham Chiếu</label>
                                {resolution === 'Standard' && !maskImage ? (
                                    <div className="p-4 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center text-center gap-2 min-h-[120px]">
                                        <span className="material-symbols-outlined text-yellow-500 text-3xl">lock</span>
                                        <p className="text-sm text-text-secondary dark:text-gray-400">
                                            Ảnh tham chiếu chỉ hoạt động ở các bản <span className="font-bold text-text-primary dark:text-white">Nano Pro</span> (1K trở lên) hoặc khi dùng Mask.
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
                        <div className="space-y-4">
                            <OptionSelector 
                                id="renovation-suggestions"
                                label="2. Chọn gợi ý cải tạo (Hoặc tự nhập)"
                                options={renovationSuggestions.map(s => ({ value: s.prompt, label: s.label }))}
                                value=""
                                onChange={(val) => onStateChange({ prompt: val })}
                                disabled={isLoading}
                                variant="grid"
                            />
                            <div>
                                <label htmlFor="prompt-renovation" className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Chi tiết yêu cầu</label>
                                <textarea
                                    id="prompt-renovation"
                                    rows={4}
                                    className="w-full bg-surface dark:bg-gray-700/50 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-accent outline-none"
                                    placeholder="Mô tả chi tiết những thay đổi bạn muốn..."
                                    value={prompt}
                                    onChange={(e) => onStateChange({ prompt: e.target.value })}
                                    disabled={isLoading}
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <NumberOfImagesSelector value={numberOfImages} onChange={(val) => onStateChange({ numberOfImages: val })} disabled={isLoading} />
                                <AspectRatioSelector value={aspectRatio} onChange={(val) => onStateChange({ aspectRatio: val })} disabled={isLoading} />
                            </div>
                            <ResolutionSelector value={resolution} onChange={handleResolutionChange} disabled={isLoading} />
                        </div>
                    </div>

                    <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800/50 rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-sm text-text-secondary dark:text-gray-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span>Chi phí: <span className="font-bold text-text-primary dark:text-white">{cost} Credits</span></span>
                        </div>
                        <div className="text-xs">
                            {userCredits < cost ? <span className="text-red-500 font-semibold">Không đủ</span> : <span className="text-green-600">Khả dụng: {userCredits}</span>}
                        </div>
                    </div>

                    <button 
                        onClick={handleGenerate}
                        disabled={isLoading || !prompt || !sourceImage || userCredits < cost}
                        className="w-full flex justify-center items-center gap-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg"
                    >
                        {isLoading ? <><Spinner /> {statusMessage || 'Đang xử lý. Vui lòng đợi...'}</> : 'Tạo Phương Án Cải Tạo'}
                    </button>
                    {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-500 dark:text-red-300 rounded-lg text-sm">{error}</div>}
                    {upscaleWarning && <div className="text-xs text-yellow-500 text-center">{upscaleWarning}</div>}
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-text-primary dark:text-white">Kết quả Cải tạo</h3>
                    {renovatedImages.length > 0 && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPreviewImage(renovatedImages[0])}
                                className="p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-text-primary dark:text-white transition-colors"
                                title="Phóng to"
                            >
                                <span className="material-symbols-outlined text-lg">zoom_in</span>
                            </button>
                            <button 
                                onClick={handleDownload} 
                                className="flex items-center gap-2 bg-[#7f13ec] hover:bg-[#690fca] text-white px-3 py-1.5 rounded-lg font-bold shadow-lg text-sm transition-colors"
                            >
                                <span className="material-symbols-outlined text-lg">download</span>
                                <span>Tải xuống</span>
                            </button>
                        </div>
                    )}
                </div>
                <div className="w-full aspect-video bg-main-bg dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-border-color dark:border-gray-700 flex items-center justify-center overflow-hidden">
                    {isLoading && (
                        <div className="flex flex-col items-center">
                            <Spinner />
                            <p className="mt-2 text-gray-400">{statusMessage || 'Đang xử lý. Vui lòng đợi...'}</p>
                        </div>
                    )}
                    {!isLoading && renovatedImages.length === 1 && sourceImage && (
                        <ImageComparator originalImage={sourceImage.objectURL} resultImage={renovatedImages[0]} />
                    )}
                    {!isLoading && renovatedImages.length > 1 && (
                        <ResultGrid images={renovatedImages} toolName="renovation" />
                    )}
                    {!isLoading && renovatedImages.length === 0 && (
                         <p className="text-text-secondary dark:text-gray-400 text-center p-4">Kết quả sẽ hiển thị ở đây.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Renovation;
