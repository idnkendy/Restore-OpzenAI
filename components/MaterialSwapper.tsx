
import React, { useState } from 'react';
import { FileData, Tool, ImageResolution, AspectRatio } from '../types';
import { MaterialSwapperState } from '../state/toolState';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import Spinner from './Spinner';
import ImageUpload from './common/ImageUpload';
import ImageComparator from './ImageComparator';
import NumberOfImagesSelector from './common/NumberOfImagesSelector';
import ResultGrid from './common/ResultGrid';
import ImagePreviewModal from './common/ImagePreviewModal';
import ResolutionSelector from './common/ResolutionSelector';

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);

interface MaterialSwapperProps {
    state: MaterialSwapperState;
    onStateChange: (newState: Partial<MaterialSwapperState>) => void;
    userCredits?: number;
    onDeductCredits?: (amount: number, description: string) => Promise<string>;
}

const getClosestAspectRatio = (width: number, height: number): AspectRatio => {
    const ratio = width / height;
    const ratios: { [key in AspectRatio]: number } = {
        "1:1": 1,
        "3:4": 3/4,
        "4:3": 4/3,
        "9:16": 9/16,
        "16:9": 16/9
    };
    
    let closest: AspectRatio = '1:1';
    let minDiff = Infinity;

    (Object.keys(ratios) as AspectRatio[]).forEach((r) => {
        const diff = Math.abs(ratio - ratios[r]);
        if (diff < minDiff) {
            minDiff = diff;
            closest = r;
        }
    });
    return closest;
};

const MaterialSwapper: React.FC<MaterialSwapperProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits }) => {
    const { prompt, sceneImage, materialImage, isLoading, error, resultImages, numberOfImages, resolution } = state;
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
    const [detectedAspectRatio, setDetectedAspectRatio] = useState<AspectRatio>('1:1');

    const handleAutoPrompt = async () => {
        if (!sceneImage) {
            onStateChange({ error: 'Vui lòng tải ảnh không gian lên trước khi tạo prompt tự động.' });
            return;
        }
        setIsGeneratingPrompt(true);
        onStateChange({ error: null });
        try {
            const generatedPrompt = await geminiService.generatePromptFromImageAndText(sceneImage, prompt);
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
            onStateChange({ error: 'Vui lòng nhập mô tả yêu cầu.' });
            return;
        }
        if (!sceneImage) {
            onStateChange({ error: 'Vui lòng tải lên ảnh không gian.' });
            return;
        }
        if (!materialImage) {
            onStateChange({ error: 'Vui lòng tải lên ảnh vật liệu hoặc nội thất tham khảo.' });
            return;
        }

        onStateChange({ isLoading: true, error: null, resultImages: [] });

        try {
             if (onDeductCredits) {
                await onDeductCredits(cost, `Thay vật liệu (${numberOfImages} ảnh) - ${resolution}`);
            }

            let results: { imageUrl: string }[] = [];

            // High Quality (Pro) Logic
            if (resolution === '1K' || resolution === '2K' || resolution === '4K') {
                const promises = Array.from({ length: numberOfImages }).map(async () => {
                    // Use materialImage as referenceImage
                    const images = await geminiService.generateHighQualityImage(
                        prompt, 
                        detectedAspectRatio, // Use detected ratio
                        resolution, 
                        sceneImage, 
                        undefined, 
                        [materialImage]
                    );
                    return { imageUrl: images[0] };
                });
                results = await Promise.all(promises);
            }
            // Standard (Flash) Logic
            else {
                results = await geminiService.editImageWithReference(prompt, sceneImage, materialImage, numberOfImages);
            }

            const imageUrls = results.map(r => r.imageUrl);
            onStateChange({ resultImages: imageUrls });

            imageUrls.forEach(url => {
                 historyService.addToHistory({
                    tool: Tool.MaterialSwap,
                    prompt: prompt,
                    sourceImageURL: sceneImage.objectURL,
                    resultImageURL: url,
                });
            });

        } catch (err: any) {
            onStateChange({ error: err.message || 'Đã xảy ra lỗi không mong muốn.' });
        } finally {
            onStateChange({ isLoading: false });
        }
    };

    const handleSceneFileSelect = (fileData: FileData | null) => {
        if (fileData?.objectURL) {
            const img = new Image();
            img.onload = () => {
                setDetectedAspectRatio(getClosestAspectRatio(img.width, img.height));
            };
            img.src = fileData.objectURL;
        }
        onStateChange({ sceneImage: fileData, resultImages: [] });
    };
    
    const handleMaterialFileSelect = (fileData: FileData | null) => {
        onStateChange({ materialImage: fileData });
    };

    const handleDownload = () => {
        if (resultImages.length !== 1) return;
        const link = document.createElement('a');
        link.href = resultImages[0];
        link.download = "material-swap.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div>
            {previewImage && <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />}
            <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">AI Thay Vật Liệu / Staging</h2>
            <p className="text-text-secondary dark:text-gray-300 mb-6">Tải lên ảnh không gian và ảnh vật liệu hoặc đồ nội thất. AI sẽ tự động thay thế và staging vào không gian của bạn.</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* --- INPUTS --- */}
                <div className="space-y-6 bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">1. Tải Lên Ảnh Không Gian (Phòng, ngoại thất...)</label>
                        <ImageUpload onFileSelect={handleSceneFileSelect} id="scene-image-upload" previewUrl={sceneImage?.objectURL} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">2. Tải Lên Ảnh Vật Liệu / Nội Thất Tham Khảo</label>
                        <ImageUpload onFileSelect={handleMaterialFileSelect} id="material-image-upload" previewUrl={materialImage?.objectURL} />
                    </div>
                    <div>
                        <label htmlFor="prompt-swap" className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">3. Mô tả yêu cầu</label>
                        <textarea
                            id="prompt-swap"
                            rows={3}
                            className="w-full bg-surface dark:bg-gray-700/50 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-accent focus:outline-none transition-all"
                            placeholder="VD: Thay thế ghế sofa trong phòng khách bằng chiếc ghế trong ảnh tham khảo..."
                            value={prompt}
                            onChange={(e) => onStateChange({ prompt: e.target.value })}
                        />
                        <button
                            onClick={handleAutoPrompt}
                            disabled={!sceneImage || isLoading || isGeneratingPrompt}
                            className="mt-2 w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-2 px-3 rounded-lg transition-colors text-sm"
                        >
                            {isGeneratingPrompt ? <Spinner /> : <SparklesIcon />}
                            <span>{isGeneratingPrompt ? 'Đang tạo...' : 'Tạo tự động Prompt'}</span>
                        </button>
                    </div>
                     <NumberOfImagesSelector value={numberOfImages} onChange={(val) => onStateChange({ numberOfImages: val })} disabled={isLoading} />
                     
                     <ResolutionSelector value={resolution} onChange={handleResolutionChange} disabled={isLoading} />
                    
                    <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800/50 rounded-lg px-4 py-2 mb-1 border border-gray-200 dark:border-gray-700">
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
                        disabled={isLoading || !sceneImage || !materialImage || userCredits < cost}
                        className="w-full flex justify-center items-center gap-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                        {isLoading ? <><Spinner /> Đang xử lý...</> : 'Thực Hiện Thay Thế'}
                    </button>
                    {error && <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-500 dark:text-red-300 rounded-lg text-sm">{error}</div>}
                </div>

                {/* --- RESULTS --- */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-text-primary dark:text-white">So sánh Trước & Sau</h3>
                        {resultImages.length === 1 && (
                             <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPreviewImage(resultImages[0])}
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
                            </div>
                        )}
                    </div>
                    <div className="w-full aspect-video bg-main-bg dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-border-color dark:border-gray-700 flex items-center justify-center overflow-hidden">
                        {isLoading && <Spinner />}
                        
                        {!isLoading && resultImages.length === 1 && sceneImage && (
                            <ImageComparator
                                originalImage={sceneImage.objectURL}
                                resultImage={resultImages[0]}
                            />
                        )}
                        
                        {!isLoading && resultImages.length > 1 && (
                            <ResultGrid images={resultImages} toolName="material-swap" />
                        )}

                        {!isLoading && resultImages.length === 0 && (
                             <p className="text-text-secondary dark:text-gray-400 text-center p-4">{sceneImage ? 'Kết quả sẽ được hiển thị ở đây.' : 'Tải lên ảnh để bắt đầu.'}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaterialSwapper;
