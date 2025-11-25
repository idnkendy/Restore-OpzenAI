
import React, { useState } from 'react';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import { FileData, Tool, AspectRatio, ImageResolution } from '../types';
import { MoodboardGeneratorState } from '../state/toolState';
import Spinner from './Spinner';
import ImageUpload from './common/ImageUpload';
import NumberOfImagesSelector from './common/NumberOfImagesSelector';
import ResultGrid from './common/ResultGrid';
import AspectRatioSelector from './common/AspectRatioSelector';
import ResolutionSelector from './common/ResolutionSelector';
import ImagePreviewModal from './common/ImagePreviewModal';

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);

interface MoodboardGeneratorProps {
    state: MoodboardGeneratorState;
    onStateChange: (newState: Partial<MoodboardGeneratorState>) => void;
    userCredits?: number;
    onDeductCredits?: (amount: number, description: string) => Promise<string>;
}

const MoodboardGenerator: React.FC<MoodboardGeneratorProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits }) => {
    const { prompt, sourceImage, isLoading, error, resultImages, numberOfImages, aspectRatio, mode, resolution } = state;
    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    
    const handleFileSelect = (fileData: FileData | null) => {
        onStateChange({ sourceImage: fileData, resultImages: [] });
    }

    const handleAutoPrompt = async () => {
        if (!sourceImage) {
            onStateChange({ error: 'Vui lòng tải ảnh lên trước khi tạo prompt tự động.' });
            return;
        }
        setIsGeneratingPrompt(true);
        onStateChange({ error: null });
        try {
            let generatedPrompt = '';
            if (mode === 'moodboardToScene') {
                generatedPrompt = await geminiService.generatePromptFromImageAndText(sourceImage, prompt);
            } else { // 'sceneToMoodboard'
                generatedPrompt = await geminiService.generateMoodboardPromptFromScene(sourceImage);
            }
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

        if (!sourceImage) {
            const errorMessage = mode === 'moodboardToScene'
                ? 'Vui lòng tải lên một ảnh moodboard.'
                : 'Vui lòng tải lên một ảnh không gian hoàn thiện.';
            onStateChange({ error: errorMessage });
            return;
        }
        onStateChange({ isLoading: true, error: null, resultImages: [] });

        try {
            if (onDeductCredits) {
                await onDeductCredits(cost, `Tạo Moodboard (${numberOfImages} ảnh) - ${resolution}`);
            }

            let fullPrompt = '';
            
            if (mode === 'moodboardToScene') {
                 if (!prompt) {
                    onStateChange({ error: 'Vui lòng mô tả loại không gian bạn muốn tạo.', isLoading: false });
                    return;
                }
                fullPrompt = `Based on the provided moodboard image, generate a photorealistic interior design for: "${prompt}". The final generated image must strictly have a ${aspectRatio} aspect ratio. Compose the scene to perfectly fit this frame without letterboxing.`;
            } else { // sceneToMoodboard
                fullPrompt = `
                    From the user-provided image of a finished space, create a single, vertically oriented moodboard image with a clean white background and clear English text labels.

                    Strictly adhere to this layout and include the specified labels:
                    1.  **Main Image:** In the center, place the original image of the finished space. Above this image, add the text label: "Inspiration Scene".
                    2.  **Furniture & Decor:** Below the central image, extract individual furniture and decor items (such as the bed, nightstand, wardrobe, lamps, rug, curtains). Each extracted item MUST be perfectly isolated on its own pure white background. Arrange these isolated items neatly. Crucially, underneath each individual item, add a small, clean text label in English identifying it (e.g., "Upholstered Bed", "Modern Nightstand", "Area Rug"). Above this entire section, add the main text label: "Key Furniture & Decor".
                    3.  **Palette:** To the right of the central image, create a palette displaying the main colors and material textures found in the scene. Above this section, add the text label: "Color & Material Palette".
                    4.  **Composition:** The entire composition, including images and text labels, must be on a white background and fit within a single final image. Use a clean, sans-serif font for all labels.

                    Additional user instructions: "${prompt}".

                    The final generated image must strictly have a ${aspectRatio} aspect ratio. Do not add black bars or letterbox.
                `;
            }

            let results: any[] = [];

            // High Quality (Pro) Logic
            if (resolution === '1K' || resolution === '2K' || resolution === '4K') {
                const promises = Array.from({ length: numberOfImages }).map(async () => {
                    const images = await geminiService.generateHighQualityImage(fullPrompt, aspectRatio, resolution, sourceImage || undefined);
                    return { imageUrl: images[0] };
                });
                results = await Promise.all(promises);
            } 
            // Standard (Flash) Logic
            else {
                results = await geminiService.editImage(fullPrompt, sourceImage, numberOfImages);
            }

            const imageUrls = results.map(r => r.imageUrl);
            onStateChange({ resultImages: imageUrls });
            
            imageUrls.forEach(url => {
                historyService.addToHistory({
                    tool: Tool.Moodboard,
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

    const handleDownload = () => {
        if (resultImages.length !== 1) return;
        const link = document.createElement('a');
        link.href = resultImages[0];
        link.download = "moodboard-generated.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col gap-8">
            {previewImage && <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />}
            <div>
                <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">
                    {mode === 'moodboardToScene' ? 'AI Tạo Ảnh từ Moodboard' : 'AI Tạo Moodboard từ Ảnh'}
                </h2>
                <p className="text-text-secondary dark:text-gray-300 mb-6">
                    {mode === 'moodboardToScene' 
                        ? 'Tải lên một ảnh moodboard chứa các mẫu vật liệu, màu sắc, và đồ nội thất. AI sẽ sử dụng chúng để tạo ra một không gian nội thất hoàn chỉnh.'
                        : 'Tải lên một ảnh nội thất hoàn thiện, AI sẽ phân tích và tạo ra một moodboard chi tiết với đồ rời, bảng màu và vật liệu được tách riêng.'
                    }
                </p>
                
                {/* --- INPUTS --- */}
                <div className="space-y-6 bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700">
                    <div className="flex items-center gap-2 bg-main-bg dark:bg-gray-800 p-1 rounded-lg">
                        <button
                            onClick={() => onStateChange({ mode: 'moodboardToScene', resultImages: [], sourceImage: null, prompt: 'Một phòng khách hiện đại và rộng rãi.' })}
                            disabled={isLoading}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-main-bg dark:focus:ring-offset-gray-800 focus:ring-accent disabled:opacity-50 ${
                                mode === 'moodboardToScene' ? 'bg-purple-600 text-white shadow' : 'bg-transparent text-text-secondary dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            Từ Moodboard ra Không gian
                        </button>
                        <button
                            onClick={() => onStateChange({ mode: 'sceneToMoodboard', resultImages: [], sourceImage: null, prompt: '' })}
                            disabled={isLoading}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-main-bg dark:focus:ring-offset-gray-800 focus:ring-accent disabled:opacity-50 ${
                                mode === 'sceneToMoodboard' ? 'bg-purple-600 text-white shadow' : 'bg-transparent text-text-secondary dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            Từ Không gian ra Moodboard
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                                {mode === 'moodboardToScene' ? '1. Tải Lên Ảnh Moodboard' : '1. Tải Lên Ảnh Không Gian Hoàn Thiện'}
                            </label>
                            <ImageUpload onFileSelect={handleFileSelect} previewUrl={sourceImage?.objectURL} />
                        </div>
                         <div className="space-y-4 flex flex-col h-full">
                            <div>
                                <label htmlFor="prompt-moodboard" className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                                    {mode === 'moodboardToScene' ? '2. Mô tả loại không gian bạn muốn' : '2. Thêm mô tả/từ khóa (tùy chọn)'}
                                </label>
                                <textarea
                                    id="prompt-moodboard"
                                    rows={4}
                                    className="w-full bg-surface dark:bg-gray-700/50 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-accent focus:outline-none transition-all"
                                    placeholder={
                                        mode === 'moodboardToScene' 
                                            ? 'VD: Một phòng ngủ ấm cúng với cửa sổ lớn...' 
                                            : 'VD: tập trung vào các vật liệu gỗ và vải, phong cách tối giản...'
                                    }
                                    value={prompt}
                                    onChange={(e) => onStateChange({ prompt: e.target.value })}
                                />
                                <button
                                    onClick={handleAutoPrompt}
                                    disabled={!sourceImage || isLoading || isGeneratingPrompt}
                                    className="mt-2 w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-2 px-3 rounded-lg transition-colors text-sm"
                                >
                                    {isGeneratingPrompt ? <Spinner /> : <SparklesIcon />}
                                    <span>
                                        {isGeneratingPrompt 
                                            ? 'Đang phân tích...' 
                                            : (mode === 'moodboardToScene' ? 'Tạo tự động Prompt' : 'Phân tích tự động từ ảnh')}
                                    </span>
                                </button>
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
                        </div>
                    </div>

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
                        disabled={isLoading || !sourceImage || userCredits < cost}
                        className="w-full flex justify-center items-center gap-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                       {isLoading ? <><Spinner /> Đang xử lý...</> : 'Tạo Moodboard'}
                    </button>
                    {error && <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-500 dark:text-red-300 rounded-lg text-sm">{error}</div>}
                </div>
            </div>

            {/* --- RESULTS --- */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-text-primary dark:text-white">Kết Quả</h3>
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
                    {!isLoading && resultImages.length > 0 && (
                        <ResultGrid images={resultImages} toolName="moodboard" />
                    )}
                    {!isLoading && resultImages.length === 0 && (
                         <p className="text-text-secondary dark:text-gray-400 text-center p-4">Kết quả sẽ hiển thị ở đây.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MoodboardGenerator;
