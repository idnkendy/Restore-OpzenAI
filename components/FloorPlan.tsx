
import React, { useState } from 'react';
import { FileData, Tool, ImageResolution } from '../types';
import { FloorPlanState } from '../state/toolState';
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

interface FloorPlanProps {
    state: FloorPlanState;
    onStateChange: (newState: Partial<FloorPlanState>) => void;
    userCredits?: number;
    onDeductCredits?: (amount: number, description: string) => Promise<string>;
}

const FloorPlan: React.FC<FloorPlanProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits }) => {
    const { prompt, layoutPrompt, sourceImage, referenceImage, isLoading, error, resultImages, numberOfImages, renderMode, planType, resolution } = state;
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

    const handleAutoPrompt = async () => {
        if (!sourceImage) {
            onStateChange({ error: 'Vui lòng tải ảnh mặt bằng lên trước khi tạo prompt tự động.' });
            return;
        }
        setIsGeneratingPrompt(true);
        onStateChange({ error: null });
        try {
            const keywords = renderMode === 'top-down' ? prompt : layoutPrompt;
            const generatedPrompt = await geminiService.generatePromptFromImageAndText(sourceImage, keywords);
            if (renderMode === 'top-down') {
                onStateChange({ prompt: generatedPrompt });
            } else {
                onStateChange({ layoutPrompt: generatedPrompt });
            }
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

        if (!sourceImage) {
            onStateChange({ error: 'Vui lòng tải lên một bản vẽ mặt bằng.' });
            return;
        }
        onStateChange({ isLoading: true, error: null, resultImages: [] });

        try {
            // Deduct credits
            if (onDeductCredits) {
                await onDeductCredits(cost, `Render mặt bằng (${numberOfImages} ảnh) - ${resolution}`);
            }

            let fullPrompt = '';
            let results: any[] = [];

            // --- Prompt Construction ---
            if (renderMode === 'top-down') {
                 if (!prompt) {
                    onStateChange({ error: 'Vui lòng nhập mô tả phong cách.', isLoading: false });
                    return;
                }

                if (planType === 'interior') {
                    fullPrompt = `Faithfully convert this 2D floor plan into a photorealistic 3D rendered floor plan. It is crucial to strictly adhere to the exact wall layout, room dimensions, and the placement of all doors and windows as shown in the 2D drawing. Do not alter the architectural structure. Apply the following style for furniture, materials, and lighting: ${prompt}. The final view should be a top-down isometric perspective. Furnish the rooms according to their typical use.`;
                } else { // exterior
                    fullPrompt = `From this 2D architectural floor plan, generate a photorealistic 3D top-down view showing the building's exterior, including the roof, walls, and immediate surroundings like a garden or driveway. Adhere strictly to the floor plan's layout for the building's structure. Do not show the interior. Apply the following style for the exterior materials, roof, and landscape: ${prompt}`;
                }
            } else { // perspective mode
                 if (!layoutPrompt?.trim()) {
                    onStateChange({ error: 'Vui lòng nhập mô tả chi tiết về góc nhìn và phong cách.', isLoading: false});
                    return;
                }
                
                 if (planType === 'interior') {
                    fullPrompt = `Dựa vào hình ảnh mặt bằng được cung cấp, hãy tạo ra một góc nhìn phối cảnh 3D nội thất chân thực, tầm nhìn ngang mắt người. Vui lòng thực hiện theo mô tả chi tiết về góc nhìn và phong cách sau: "${layoutPrompt}".`;
                    if (referenceImage) {
                        fullPrompt += ` Đồng thời, hãy lấy cảm hứng về phong cách, vật liệu và không khí từ ảnh tham chiếu được cung cấp.`;
                    }
                } else { // exterior
                    fullPrompt = `From this 2D architectural floor plan, generate a photorealistic 3D exterior perspective view (eye-level). Adhere strictly to the floor plan's layout for the building's shape. Apply the following style for materials, context, and lighting: "${layoutPrompt}".`;
                    if (referenceImage) {
                        fullPrompt += ` Also, take aesthetic inspiration from the provided reference image.`;
                    }
                }
            }

            // --- Generation Logic ---
            // High Quality (Pro) Logic
            if (resolution === '1K' || resolution === '2K' || resolution === '4K') {
                const promises = Array.from({ length: numberOfImages }).map(async () => {
                    // We map sourceImage to be the primary image input for generateHighQualityImage
                    const images = await geminiService.generateHighQualityImage(fullPrompt, '4:3', resolution, sourceImage || undefined);
                    return { imageUrl: images[0] };
                });
                results = await Promise.all(promises);
            } 
            // Standard (Flash) Logic
            else {
                if (referenceImage && renderMode === 'perspective') {
                     results = await geminiService.editImageWithReference(fullPrompt, sourceImage, referenceImage, numberOfImages);
                } else {
                     results = await geminiService.editImage(fullPrompt, sourceImage, numberOfImages);
                }
            }

            const imageUrls = results.map(r => r.imageUrl);
            onStateChange({ resultImages: imageUrls });

            imageUrls.forEach(url => {
                 historyService.addToHistory({
                    tool: Tool.FloorPlan,
                    prompt: fullPrompt,
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
        onStateChange({ sourceImage: fileData, resultImages: [], referenceImage: null });
    }
    
    const handleReferenceFileSelect = (fileData: FileData | null) => {
        onStateChange({ referenceImage: fileData });
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
                <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">AI Render Mặt Bằng (Nội thất & Kiến trúc)</h2>
                <p className="text-text-secondary dark:text-gray-300 mb-6">Tải lên bản vẽ mặt bằng 2D, AI sẽ biến nó thành phối cảnh 3D cho nội thất hoặc kiến trúc theo yêu cầu của bạn.</p>
                
                <div className="bg-main-bg/50 dark:bg-dark-bg/50 border border-border-color dark:border-gray-700 rounded-xl p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">1. Tải Lên Mặt Bằng 2D</label>
                            <ImageUpload onFileSelect={handleFileSelect} previewUrl={sourceImage?.objectURL} />
                        </div>
                        <div className="space-y-4 flex flex-col h-full">
                             <div>
                                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">2. Chọn loại mặt bằng</label>
                                <div className="flex items-center gap-2 bg-main-bg dark:bg-gray-800 p-1 rounded-lg">
                                    <button
                                        onClick={() => onStateChange({ planType: 'interior' })}
                                        disabled={isLoading}
                                        className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-main-bg dark:focus:ring-offset-gray-800 focus:ring-accent disabled:opacity-50 ${
                                            planType === 'interior' ? 'bg-purple-600 text-white shadow' : 'bg-transparent text-text-secondary dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        Nội thất
                                    </button>
                                    <button
                                        onClick={() => onStateChange({ planType: 'exterior' })}
                                        disabled={isLoading}
                                        className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-main-bg dark:focus:ring-offset-gray-800 focus:ring-accent disabled:opacity-50 ${
                                            planType === 'exterior' ? 'bg-purple-600 text-white shadow' : 'bg-transparent text-text-secondary dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        Kiến trúc
                                    </button>
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">3. Chọn chế độ Render</label>
                                <div className="flex items-center gap-2 bg-main-bg dark:bg-gray-800 p-1 rounded-lg">
                                    <button
                                        onClick={() => onStateChange({ renderMode: 'top-down' })}
                                        disabled={isLoading}
                                        className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-main-bg dark:focus:ring-offset-gray-800 focus:ring-accent disabled:opacity-50 ${
                                            renderMode === 'top-down' ? 'bg-purple-600 text-white shadow' : 'bg-transparent text-text-secondary dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        {planType === 'interior' ? 'Mặt Bằng 3D' : 'Phối cảnh Tổng thể'}
                                    </button>
                                    <button
                                        onClick={() => onStateChange({ renderMode: 'perspective' })}
                                        disabled={isLoading}
                                        className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-main-bg dark:focus:ring-offset-gray-800 focus:ring-accent disabled:opacity-50 ${
                                            renderMode === 'perspective' ? 'bg-purple-600 text-white shadow' : 'bg-transparent text-text-secondary dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        {planType === 'interior' ? 'Góc nhìn Nội thất 3D' : 'Góc nhìn Kiến trúc 3D'}
                                    </button>
                                </div>
                            </div>
                            
                            {renderMode === 'top-down' && (
                                <div>
                                    <label htmlFor="prompt-floorplan" className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                                        4. {planType === 'interior' ? 'Mô tả phong cách nội thất & vật liệu' : 'Mô tả phong cách kiến trúc, mái, sân vườn'}
                                    </label>
                                    <textarea
                                        id="prompt-floorplan"
                                        rows={3}
                                        className="w-full bg-surface dark:bg-gray-700/50 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-accent focus:outline-none transition-all"
                                        placeholder={planType === 'interior' ? 'VD: Phong cách hiện đại, tông màu xám-trắng, sàn gỗ, nội thất tối giản...' : 'VD: Phong cách hiện đại, mái thái, tường sơn trắng, có sân vườn nhỏ...'}
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
                                </div>
                            )}

                             {renderMode === 'perspective' && (
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="layout-prompt-floorplan" className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                                           4. {planType === 'interior' ? 'Mô tả chi tiết góc nhìn và phong cách' : 'Mô tả góc nhìn ngoại thất và bối cảnh'}
                                        </label>
                                        <textarea
                                            id="layout-prompt-floorplan"
                                            rows={4}
                                            className="w-full bg-surface dark:bg-gray-700/50 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-accent focus:outline-none transition-all"
                                            placeholder={planType === 'interior' ? 'VD: Góc nhìn từ sofa phòng khách, hướng ra cửa sổ lớn. Phong cách nội thất hiện đại...' : 'VD: Góc nhìn từ cổng vào, thời tiết nắng đẹp, có cây xanh hai bên. Phong cách kiến trúc nhiệt đới.'}
                                            value={layoutPrompt}
                                            onChange={(e) => onStateChange({ layoutPrompt: e.target.value })}
                                            disabled={isLoading}
                                        />
                                        <button
                                            onClick={handleAutoPrompt}
                                            disabled={!sourceImage || isLoading || isGeneratingPrompt}
                                            className="mt-2 w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-2 px-3 rounded-lg transition-colors text-sm"
                                        >
                                            {isGeneratingPrompt ? <Spinner /> : <SparklesIcon />}
                                            <span>{isGeneratingPrompt ? 'Đang tạo...' : 'Tạo tự động Prompt'}</span>
                                        </button>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">5. Tải Ảnh Tham Chiếu Phong Cách (Tùy chọn)</label>
                                        <ImageUpload onFileSelect={handleReferenceFileSelect} previewUrl={referenceImage?.objectURL} />
                                    </div>
                                </div>
                            )}

                            <div className="flex-grow"></div>
                            <div className="pt-2">
                                <NumberOfImagesSelector value={numberOfImages} onChange={(val) => onStateChange({ numberOfImages: val })} disabled={isLoading} />
                            </div>
                            <div className="pt-2">
                                <ResolutionSelector value={resolution} onChange={handleResolutionChange} disabled={isLoading} />
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
                                {isLoading ? <><Spinner /> Đang Render 3D...</> : 'Bắt đầu Render'}
                            </button>
                        </div>
                    </div>
                    {error && <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-500 dark:text-red-300 rounded-lg text-sm">{error}</div>}
                </div>
            </div>

            <div>
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-text-primary dark:text-white">So sánh 2D & 3D</h3>
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
                            <button
                                onClick={handleDownload}
                                className="text-center bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 transition-colors rounded-lg text-sm"
                            >
                                Tải xuống ảnh 3D
                            </button>
                        </div>
                    )}
                </div>
                <div className="w-full aspect-video bg-main-bg dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-border-color dark:border-gray-700 flex items-center justify-center overflow-hidden">
                    {isLoading && <Spinner />}
                    
                    {!isLoading && resultImages.length === 1 && sourceImage && (
                        <ImageComparator
                            originalImage={sourceImage.objectURL}
                            resultImage={resultImages[0]}
                        />
                    )}
                    
                    {!isLoading && resultImages.length > 1 && (
                         <ResultGrid images={resultImages} toolName="floorplan-render" />
                    )}

                    {!isLoading && resultImages.length === 0 && (
                         <p className="text-text-secondary dark:text-gray-400 text-center p-4">{sourceImage ? 'Kết quả render 3D sẽ được hiển thị ở đây.' : 'Tải lên một mặt bằng để bắt đầu.'}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FloorPlan;
