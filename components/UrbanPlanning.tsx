
import React, { useState, useCallback } from 'react';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import { FileData, Tool, AspectRatio, ImageResolution } from '../types';
import { UrbanPlanningState } from '../state/toolState';
import Spinner from './Spinner';
import ImageUpload from './common/ImageUpload';
import ImageComparator from './ImageComparator';
import NumberOfImagesSelector from './common/NumberOfImagesSelector';
import ResultGrid from './common/ResultGrid';
import OptionSelector from './common/OptionSelector';
import AspectRatioSelector from './common/AspectRatioSelector';
import ResolutionSelector from './common/ResolutionSelector';
import ImagePreviewModal from './common/ImagePreviewModal';

const viewTypeOptions = [
    { value: 'none', label: 'Tự động' },
    { value: 'phối cảnh mắt chim (bird\'s-eye view)', label: 'Phối cảnh mắt chim' },
    { value: 'phối cảnh từ trên cao góc 45 độ (aerial 45-degree view)', label: 'Phối cảnh 45°' },
    { value: 'phối cảnh tầm mắt người đi bộ (street-level perspective)', label: 'Góc nhìn người' },
    { value: 'phối cảnh ven sông/ven biển (waterfront view)', label: 'Ven sông/biển' },
];

const densityOptions = [
    { value: 'none', label: 'Tự động' },
    { value: 'khu dân cư ngoại ô mật độ thấp', label: 'Ngoại ô thấp tầng' },
    { value: 'khu phức hợp mật độ trung bình', label: 'Phức hợp vừa' },
    { value: 'lõi đô thị mật độ cao', label: 'Đô thị cao tầng' },
    { value: 'khu công viên và cây xanh', label: 'Công viên cây xanh' },
];

const lightingOptions = [
    { value: 'none', label: 'Tự động' },
    { value: 'bình minh dịu nhẹ', label: 'Bình minh' },
    { value: 'buổi trưa, trời xanh trong', label: 'Ban ngày' },
    { value: 'nắng chiều, nắng vàng cam', label: 'Hoàng hôn' },
    { value: 'buổi tối, đèn đô thị sáng rực', label: 'Ban đêm' },
    { value: 'khung cảnh u ám, có mây', label: 'Trời u ám' },
];

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);

interface UrbanPlanningProps {
  state: UrbanPlanningState;
  onStateChange: (newState: Partial<UrbanPlanningState>) => void;
  onSendToViewSync: (image: FileData) => void;
  userCredits?: number;
  onDeductCredits?: (amount: number, description: string) => Promise<string>;
}

const UrbanPlanning: React.FC<UrbanPlanningProps> = ({ state, onStateChange, onSendToViewSync, userCredits = 0, onDeductCredits }) => {
    const { 
        viewType, density, lighting, customPrompt, referenceImage, 
        sourceImage, isLoading, isUpscaling, error, resultImages, upscaledImage, 
        numberOfImages, aspectRatio, resolution
    } = state;
    
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

    const updatePrompt = useCallback((type: 'viewType' | 'density' | 'lighting', newValue: string, oldValue: string) => {
        const getPromptPart = (partType: string, value: string): string => {
            if (value === 'none' || !value) return '';
            switch (partType) {
                case 'viewType': return `tạo ra một ${value}`;
                case 'density': return `mô phỏng một ${value}`;
                case 'lighting': return `với ánh sáng ${value}`;
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

    const handleViewTypeChange = (newVal: string) => {
        updatePrompt('viewType', newVal, viewType);
        onStateChange({ viewType: newVal });
    };

    const handleDensityChange = (newVal: string) => {
        updatePrompt('density', newVal, density);
        onStateChange({ density: newVal });
    };

    const handleLightingChange = (newVal: string) => {
        updatePrompt('lighting', newVal, lighting);
        onStateChange({ lighting: newVal });
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
        
        try {
             if (onDeductCredits) {
                await onDeductCredits(cost, `Render quy hoạch (${numberOfImages} ảnh) - ${resolution || 'Standard'}`);
            }

            let imageUrls: string[] = [];
            
            // Prepare rich prompt
            let promptForService = "";
            if (sourceImage) {
                promptForService = `Generate a photorealistic urban planning render with a strict aspect ratio of ${aspectRatio}. Develop the provided 2D site plan into a 3D environment. Adapt the composition to fit this new frame. Do not add black bars or letterbox. The main creative instruction is: ${customPrompt}`;
                if (referenceImage) {
                    promptForService += ` Also, take aesthetic inspiration (architectural style, materials, atmosphere) from the provided reference image.`;
                }
            } else {
                promptForService = `${customPrompt}, photorealistic urban planning, master plan rendering, high detail, masterpiece`;
            }

            // High Quality Logic
            if (resolution === '1K' || resolution === '2K' || resolution === '4K') {
                const promises = Array.from({ length: numberOfImages }).map(async () => {
                    const images = await geminiService.generateHighQualityImage(promptForService, aspectRatio, resolution, sourceImage || undefined);
                    return images[0];
                });
                imageUrls = await Promise.all(promises);
            } 
            // Standard Logic
            else {
                imageUrls = await geminiService.generateStandardImage(promptForService, aspectRatio, numberOfImages, sourceImage || undefined);
            }
            
            onStateChange({ resultImages: imageUrls });
            
            imageUrls.forEach(url => {
                historyService.addToHistory({
                    tool: Tool.UrbanPlanning,
                    prompt: customPrompt,
                    sourceImageURL: sourceImage?.objectURL,
                    resultImageURL: url,
                });
            });

        } catch (err: any) {
            onStateChange({ error: err.message || 'Đã xảy ra lỗi không mong muốn.' });
        } finally {
            onStateChange({ isLoading: false });
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

            const upscalePrompt = "Upscale this urban planning rendering to a high resolution. Enhance details like building facades, landscapes, textures, and lighting to make it look photorealistic and professional. Do not change the composition or the core design.";
            
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
        link.download = "urban-planning-render.png";
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
            <div>
                <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">AI Render Quy Hoạch Đô Thị</h2>
                <p className="text-text-secondary dark:text-gray-300 mb-6">Tạo phối cảnh tổng thể cho các dự án quy hoạch, khu đô thị, hoặc cảnh quan lớn từ bản vẽ 2D hoặc mô tả.</p>
                
                {/* --- INPUTS --- */}
                <div className="space-y-6 bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        {/* Image Uploads (Left Column) */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">1. Tải Lên Bản Vẽ/Ảnh Hiện Trạng (Tùy chọn)</label>
                                <ImageUpload onFileSelect={handleFileSelect} previewUrl={sourceImage?.objectURL}/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Ảnh Tham Chiếu (Tùy chọn)</label>
                                <ImageUpload onFileSelect={handleReferenceFileSelect} previewUrl={referenceImage?.objectURL}/>
                            </div>
                        </div>

                        {/* Prompt and Options (Right Column) */}
                         <div className="space-y-4 flex flex-col">
                             <div>
                                <label htmlFor="custom-prompt-urban" className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">2. Mô tả ý tưởng quy hoạch</label>
                                <textarea
                                    id="custom-prompt-urban"
                                    rows={4}
                                    className="w-full bg-surface dark:bg-gray-700/50 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-accent focus:outline-none transition-all"
                                    placeholder="Mô tả chi tiết về dự án: mật độ, phong cách, không gian xanh, tiện ích..."
                                    value={customPrompt}
                                    onChange={(e) => onStateChange({ customPrompt: e.target.value })}
                                    disabled={isLoading}
                                />
                                <button
                                    onClick={handleAutoPrompt}
                                    disabled={!sourceImage || isLoading || isUpscaling || isGeneratingPrompt}
                                    className="mt-2 w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-2 px-3 rounded-lg transition-colors text-sm"
                                >
                                    {isGeneratingPrompt ? <Spinner /> : <SparklesIcon />}
                                    <span>{isGeneratingPrompt ? 'Đang tạo...' : 'Tạo tự động Prompt'}</span>
                                </button>
                             </div>
                            
                            <div className="pt-2">
                                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">3. Tinh chỉnh tùy chọn</label>
                                <div className="space-y-4">
                                    <OptionSelector id="view-type-selector" label="Góc nhìn" options={viewTypeOptions} value={viewType} onChange={handleViewTypeChange} disabled={isLoading} variant="grid" />
                                    {/* Optimized Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <OptionSelector id="density-selector" label="Mật độ" options={densityOptions} value={density} onChange={handleDensityChange} disabled={isLoading} variant="select" />
                                        <OptionSelector id="lighting-selector-urban" label="Ánh sáng" options={lightingOptions} value={lighting} onChange={handleLightingChange} disabled={isLoading} variant="select" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="pt-4 grid grid-cols-2 gap-4">
                                <div>
                                    <NumberOfImagesSelector value={numberOfImages} onChange={(val) => onStateChange({ numberOfImages: val })} disabled={isLoading || isUpscaling} />
                                </div>
                                <div>
                                    <AspectRatioSelector value={aspectRatio} onChange={(val) => onStateChange({ aspectRatio: val })} disabled={isLoading || isUpscaling} />
                                </div>
                            </div>
                            <div className="pt-4">
                                <ResolutionSelector value={resolution} onChange={handleResolutionChange} disabled={isLoading || isUpscaling} />
                            </div>
                        </div>
                    </div>

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
                            className="w-full flex justify-center items-center gap-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors"
                        >
                           {isLoading ? <><Spinner /> Đang Render...</> : 'Bắt đầu Render'}
                        </button>
                    </div>
                    {error && <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-500 dark:text-red-300 rounded-lg text-sm">{error}</div>}
                </div>
            </div>

            {/* --- RESULTS VIEW --- */}
             <div>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-text-primary dark:text-white">
                        {sourceImage ? 'So sánh Trước & Sau' : 'Kết quả Render'}
                    </h3>
                    <div className="flex items-center gap-2">
                        {resultImages.length === 1 && !upscaledImage && (
                            <button
                                onClick={handleUpscale}
                                disabled={isUpscaling || isLoading}
                                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-1 px-3 rounded-md text-sm transition-colors"
                            >
                                {isUpscaling ? <Spinner/> : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                    </svg>
                                )}
                                <span>{isUpscaling ? 'Đang nâng cấp...' : 'Nâng cấp chi tiết'}</span>
                            </button>
                        )}
                        {resultImages.length === 1 && (
                             <>
                                <button
                                    onClick={() => handleSendImageToSync(upscaledImage || resultImages[0])}
                                    className="text-center bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 transition-colors rounded-lg text-sm flex items-center gap-2"
                                    title="Chuyển ảnh này tới Đồng Bộ View để xử lý tiếp"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2H-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                    Đồng bộ
                                </button>
                                <button
                                    onClick={() => setPreviewImage(upscaledImage || resultImages[0])}
                                    className="text-center bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 transition-colors rounded-lg text-sm flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                    </svg>
                                    Phóng to
                                </button>
                                 <button onClick={handleDownload} className="text-center bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 transition-colors rounded-lg text-sm">
                                    Tải xuống
                                </button>
                            </>
                        )}
                    </div>
                </div>
                <div className="w-full aspect-video bg-main-bg dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-border-color dark:border-gray-700 flex items-center justify-center overflow-hidden">
                    {isLoading && <Spinner />}
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
                        <ResultGrid images={resultImages} toolName="urban-render" onSendToViewSync={handleSendImageToSync} />
                    )}
                    {!isLoading && resultImages.length === 0 && (
                        <p className="text-text-secondary dark:text-gray-400 p-4 text-center">{sourceImage ? 'Kết quả render sẽ hiển thị ở đây' : 'Nhập mô tả hoặc tải ảnh lên để bắt đầu'}</p>
                    )}
                </div>
              </div>
        </div>
    );
};

export default UrbanPlanning;
