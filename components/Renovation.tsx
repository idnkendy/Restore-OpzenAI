
import React, { useState } from 'react';
import { FileData, Tool, AspectRatio, ImageResolution } from '../types';
import { RenovationState } from '../state/toolState';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import Spinner from './Spinner';
import ImageUpload from './common/ImageUpload';
import ImageComparator from './ImageComparator';
import NumberOfImagesSelector from './common/NumberOfImagesSelector';
import ResultGrid from './common/ResultGrid';
import AspectRatioSelector from './common/AspectRatioSelector';
import ImagePreviewModal from './common/ImagePreviewModal';
import MaskingModal from './MaskingModal';
import ResolutionSelector from './common/ResolutionSelector';


const renovationSuggestions = [
    { label: 'Nâng tầng', prompt: 'Nâng thêm 1 tầng cho công trình, giữ phong cách kiến trúc hiện có.' },
    { label: 'Đổi màu sơn', prompt: 'Thay đổi màu sơn ngoại thất của công trình thành màu trắng kem, các chi tiết cửa sổ màu đen.' },
    { label: 'Giữ lại khối', prompt: 'Cải tạo lại mặt tiền nhưng giữ nguyên hình khối và cấu trúc chính.' },
    { label: 'Thay đổi khối', prompt: 'Cải tạo toàn bộ, thay đổi hình khối của công trình để trở nên ấn tượng và hiện đại hơn.' },
    { label: 'Đưa ảnh vẽ tay/khối vào không gian', prompt: 'Thiết kế hoàn thiện công trình ở ảnh tham chiếu và đưa vào vùng tô đỏ của ảnh thực tế.' },
    { label: 'Đưa mẫu công trình vào không gian', prompt: 'Đưa mẫu công trình ở ảnh tham chiếu và đưa vào vùng tô đỏ của ảnh thực tế.' },
];

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);

interface RenovationProps {
    state: RenovationState;
    onStateChange: (newState: Partial<RenovationState>) => void;
    userCredits?: number;
    onDeductCredits?: (amount: number, description: string) => Promise<string>;
}

const Renovation: React.FC<RenovationProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits }) => {
    const { prompt, sourceImage, referenceImage, maskImage, isLoading, error, renovatedImages, numberOfImages, aspectRatio, resolution } = state;
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isMaskingModalOpen, setIsMaskingModalOpen] = useState<boolean>(false);
    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

    const handleAutoPrompt = async () => {
        if (!sourceImage) {
            onStateChange({ error: 'Vui lòng tải ảnh lên trước khi tạo prompt tự động.' });
            return;
        }
        setIsGeneratingPrompt(true);
        onStateChange({ error: null });
        try {
            const generatedPrompt = await geminiService.generatePromptFromImageAndText(sourceImage, prompt);
            onStateChange({ prompt: generatedPrompt });
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

    const handleResolutionChange = (val: ImageResolution) => {
        onStateChange({ resolution: val });
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

        try {
            // Deduct credits
            if (onDeductCredits) {
                await onDeductCredits(cost, `Cải tạo thiết kế (${numberOfImages} ảnh) - ${resolution}`);
            }

            let results: { imageUrl: string }[] = [];
            let finalPrompt = `Generate an image with a strict aspect ratio of ${aspectRatio}. Adapt the composition from the source image to fit this new frame while performing the renovation. Do not add black bars or letterbox. The renovation instruction is: ${prompt}`;

            // High Quality (Pro) Logic
            if (resolution === '1K' || resolution === '2K' || resolution === '4K') {
                if (maskImage) finalPrompt += " Note: The user wanted to mask specific areas, but in High Quality mode, the entire image will be regenerated to match the renovation request while preserving the overall composition.";
                if (referenceImage) finalPrompt += " Also, take aesthetic inspiration (colors, materials, atmosphere) from the provided reference image.";

                const promises = Array.from({ length: numberOfImages }).map(async () => {
                    // Use generateHighQualityImage which takes sourceImage
                    const images = await geminiService.generateHighQualityImage(finalPrompt, aspectRatio, resolution, sourceImage || undefined);
                    return { imageUrl: images[0] };
                });
                results = await Promise.all(promises);
            } 
            // Standard (Flash) Logic
            else {
                if (maskImage && referenceImage) {
                    finalPrompt = `${finalPrompt} Also, take aesthetic inspiration (colors, materials, atmosphere) from the provided reference image for the masked area.`;
                    results = await geminiService.editImageWithMaskAndReference(finalPrompt, sourceImage, maskImage, referenceImage, numberOfImages);
                } else if (maskImage) {
                     results = await geminiService.editImageWithMask(finalPrompt, sourceImage, maskImage, numberOfImages);
                } else if (referenceImage) {
                    finalPrompt = `${finalPrompt} Also, take aesthetic inspiration (colors, materials, atmosphere) from the provided reference image.`;
                    results = await geminiService.editImageWithReference(finalPrompt, sourceImage, referenceImage, numberOfImages);
                } else {
                    results = await geminiService.editImage(finalPrompt, sourceImage, numberOfImages);
                }
            }

            const imageUrls = results.map(r => r.imageUrl);
            onStateChange({ renovatedImages: imageUrls });

            imageUrls.forEach(url => {
                 historyService.addToHistory({
                    tool: Tool.Renovation,
                    prompt: finalPrompt,
                    sourceImageURL: sourceImage.objectURL,
                    resultImageURL: url,
                });
            });
        } catch (err: any) {
            onStateChange({ error: err.message || 'Đã xảy ra lỗi không mong muốn.' });
        } finally {
            onStateChange({ isLoading: false });
        }
    };
    
    const handleFileSelect = (fileData: FileData | null) => {
        onStateChange({ sourceImage: fileData, renovatedImages: [], maskImage: null });
    }

    const handleReferenceFileSelect = (fileData: FileData | null) => {
        onStateChange({ referenceImage: fileData });
    };

    const handleSuggestionSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedPrompt = e.target.value;
        if (selectedPrompt) {
            const newPrompt = prompt.trim() ? `${prompt.trim()}. ${selectedPrompt}` : selectedPrompt;
            onStateChange({ prompt: newPrompt });
            e.target.value = ""; // Reset dropdown after selection
        }
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
    
    const handleApplyMask = (mask: FileData) => {
        onStateChange({ maskImage: mask });
        setIsMaskingModalOpen(false);
    };

    const handleRemoveMask = () => {
        onStateChange({ maskImage: null });
    };

    return (
        <div className="flex flex-col gap-8">
            {previewImage && <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />}
            {isMaskingModalOpen && sourceImage && (
                <MaskingModal
                    image={sourceImage}
                    onClose={() => setIsMaskingModalOpen(false)}
                    onApply={handleApplyMask}
                    maskColor="rgba(239, 68, 68, 0.7)"
                />
            )}
            <div>
                <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">AI Cải Tạo Thiết Kế</h2>
                <p className="text-text-secondary dark:text-gray-300 mb-6">Tải lên ảnh chụp thực tế của một công trình hoặc không gian nội thất. AI sẽ giúp bạn hình dung phương án cải tạo mới một cách trực quan.</p>
                
                <div className="bg-main-bg/50 dark:bg-dark-bg/50 border border-border-color dark:border-gray-700 rounded-xl p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">1. Tải Lên Ảnh Thực Tế</label>
                                <ImageUpload onFileSelect={handleFileSelect} previewUrl={sourceImage?.objectURL} maskPreviewUrl={maskImage?.objectURL} />
                                {sourceImage && (
                                    <div className="mt-4">
                                        <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">Chỉ định vùng cần cải tạo (tùy chọn):</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setIsMaskingModalOpen(true)}
                                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                                                disabled={resolution !== 'Standard'}
                                                title={resolution !== 'Standard' ? "Chế độ chất lượng cao sẽ tự động xử lý toàn bộ ảnh để đảm bảo sự đồng nhất" : "Vẽ vùng chọn"}
                                            >
                                               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                                {maskImage ? 'Sửa vùng chọn' : 'Vẽ vùng chọn'}
                                            </button>
                                            {maskImage && (
                                                <button
                                                    onClick={handleRemoveMask}
                                                    className="bg-red-600 hover:bg-red-700 text-white font-semibold p-2 rounded-lg transition-colors"
                                                    title="Xóa vùng chọn"
                                                >
                                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                                </button>
                                            )}
                                        </div>
                                        {maskImage && <p className="text-xs text-green-500 dark:text-green-400 mt-2">Đã áp dụng vùng chọn.</p>}
                                        {resolution !== 'Standard' && <p className="text-xs text-yellow-500 mt-1">Lưu ý: Chế độ 2K/4K sẽ cải tạo toàn bộ ảnh để đạt chất lượng tốt nhất.</p>}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Ảnh Tham Chiếu Phong Cách (Tùy chọn)</label>
                                <ImageUpload onFileSelect={handleReferenceFileSelect} previewUrl={referenceImage?.objectURL}/>
                            </div>
                        </div>
                        <div className="space-y-4 flex flex-col h-full">
                            <div>
                                <label htmlFor="prompt-renovate" className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">2. Mô tả phương án cải tạo</label>
                                <textarea
                                    id="prompt-renovate"
                                    rows={4}
                                    className="w-full bg-surface dark:bg-gray-700/50 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-accent focus:outline-none transition-all"
                                    placeholder="VD: Cải tạo mặt tiền theo phong cách tân cổ điển, sơn màu trắng, thêm ban công sắt nghệ thuật..."
                                    value={prompt}
                                    onChange={(e) => onStateChange({ prompt: e.target.value })}
                                />
                                <button
                                    onClick={handleAutoPrompt}
                                    disabled={!sourceImage || isLoading || isGeneratingPrompt}
                                    className="mt-2 w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-2 px-3 rounded-lg transition-colors text-sm"
                                >
                                    {isGeneratingPrompt ? <Spinner /> : <SparklesIcon />}
                                    <span>{isGeneratingPrompt ? 'Đang tạo...' : 'Tạo tự động Prompt'}</span>
                                </button>
                                 <div className="mt-3">
                                     <label htmlFor="renovation-suggestions" className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Thêm gợi ý nhanh</label>
                                     <div className="relative">
                                        <select
                                            id="renovation-suggestions"
                                            onChange={handleSuggestionSelect}
                                            className="w-full bg-main-bg dark:bg-gray-700/50 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-accent focus:outline-none transition-all appearance-none pr-10"
                                            defaultValue=""
                                            aria-label="Chọn gợi ý nhanh cho việc cải tạo"
                                        >
                                            <option value="" disabled>Chọn một gợi ý...</option>
                                            {renovationSuggestions.map((suggestion) => (
                                                <option key={suggestion.label} value={suggestion.prompt}>
                                                    {suggestion.label}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary dark:text-gray-400">
                                           <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4"/></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                             <div className="flex-grow"></div>
                             <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <NumberOfImagesSelector value={numberOfImages} onChange={(val) => onStateChange({ numberOfImages: val })} disabled={isLoading} />
                                    </div>
                                    <div>
                                        <AspectRatioSelector value={aspectRatio} onChange={(val) => onStateChange({ aspectRatio: val })} disabled={isLoading} />
                                    </div>
                                </div>
                                <div>
                                    <ResolutionSelector value={resolution} onChange={handleResolutionChange} disabled={isLoading} />
                                </div>
                             </div>

                             <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800/50 rounded-lg px-4 py-2 mt-4 mb-2 border border-gray-200 dark:border-gray-700">
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
                                disabled={isLoading || !sourceImage || userCredits < cost}
                                className="w-full flex justify-center items-center gap-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors"
                            >
                                {isLoading ? <><Spinner /> Đang lên phương án...</> : 'Bắt đầu Cải Tạo'}
                            </button>
                        </div>
                    </div>
                    {error && <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-500 dark:text-red-300 rounded-lg text-sm">{error}</div>}
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-text-primary dark:text-white">So sánh Trước & Sau</h3>
                     {renovatedImages.length === 1 && (
                         <div className="flex items-center gap-2">
                             <button
                                onClick={() => setPreviewImage(renovatedImages[0])}
                                className="text-center bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 transition-colors rounded-lg text-sm flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                                Phóng to
                            </button>
                             <button onClick={handleDownload} className="text-center bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 transition-colors rounded-lg text-sm">
                                Tải xuống Phương án mới
                            </button>
                         </div>
                    )}
                </div>
                <div className="w-full aspect-video bg-main-bg dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-border-color dark:border-gray-700 flex items-center justify-center overflow-hidden">
                    {isLoading && <Spinner />}
                    
                    {!isLoading && renovatedImages.length === 1 && sourceImage && (
                        <ImageComparator
                            originalImage={sourceImage.objectURL}
                            resultImage={renovatedImages[0]}
                        />
                    )}

                     {!isLoading && renovatedImages.length > 1 && (
                         <ResultGrid images={renovatedImages} toolName="renovation" />
                    )}
                    
                    {!isLoading && renovatedImages.length === 0 && (
                         <p className="text-text-secondary dark:text-gray-400 text-center p-4">{sourceImage ? 'Phương án cải tạo sẽ được hiển thị ở đây.' : 'Tải lên một ảnh để bắt đầu.'}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Renovation;
