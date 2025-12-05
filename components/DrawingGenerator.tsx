
import React from 'react';
import { FileData, Tool, ImageResolution } from '../types';
import { DrawingGeneratorState } from '../state/toolState';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import Spinner from './Spinner';
import ImageUpload from './common/ImageUpload';
import ImageComparator from './ImageComparator';
import NumberOfImagesSelector from './common/NumberOfImagesSelector';
import ResolutionSelector from './common/ResolutionSelector';

interface DrawingGeneratorProps {
    state: DrawingGeneratorState;
    onStateChange: (newState: Partial<DrawingGeneratorState>) => void;
    userCredits?: number;
    onDeductCredits?: (amount: number, description: string) => Promise<string>;
}

const DrawingGenerator: React.FC<DrawingGeneratorProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits }) => {
    const { prompt, sourceImage, isLoading, error, resultImages, numberOfImages, resolution } = state;
    
    const cost = numberOfImages * 5; 

    const handleFileSelect = (fileData: FileData | null) => {
        onStateChange({ sourceImage: fileData, resultImages: [] });
    };

    const handleResolutionChange = (val: ImageResolution) => {
        onStateChange({ resolution: val });
    };

    const handleGenerate = async () => {
        if (onDeductCredits && userCredits < cost) {
             onStateChange({ error: `Bạn không đủ credits. Cần ${cost} credits.` });
             return;
        }

        if (!sourceImage) {
            onStateChange({ error: 'Vui lòng tải lên ảnh phối cảnh (Render) để tạo bản vẽ.' });
            return;
        }

        onStateChange({ isLoading: true, error: null, resultImages: [] });

        const fullPrompt = `Convert this 3D architectural render into a 2D technical line drawing (CAD style). 
        Strictly black lines on white background. Show accurate details, contours, and proportions. 
        Focus on: ${prompt || 'general elevation/section view'}.`;

        try {
            if (onDeductCredits) {
                await onDeductCredits(cost, `Tạo Bản vẽ (${numberOfImages} ảnh)`);
            }

            let results: { imageUrl: string }[] = [];

            if (resolution === '1K' || resolution === '2K' || resolution === '4K') {
                const promises = Array.from({ length: numberOfImages }).map(async () => {
                    const images = await geminiService.generateHighQualityImage(fullPrompt, '1:1', resolution, sourceImage);
                    return { imageUrl: images[0] };
                });
                results = await Promise.all(promises);
            } else {
                results = await geminiService.editImage(fullPrompt, sourceImage, numberOfImages);
            }

            const imageUrls = results.map(r => r.imageUrl);
            onStateChange({ resultImages: imageUrls });

            imageUrls.forEach(url => {
                historyService.addToHistory({
                    tool: Tool.DrawingGenerator,
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

    return (
        <div className="flex flex-col gap-8">
            <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">AI Tạo Bản Vẽ Kỹ Thuật</h2>
            <p className="text-text-secondary dark:text-gray-300 -mt-8 mb-6">Biến ảnh phối cảnh 3D thành bản vẽ nét (Line drawing) phục vụ kỹ thuật.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6 bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">1. Tải Lên Ảnh Render</label>
                        <ImageUpload onFileSelect={handleFileSelect} previewUrl={sourceImage?.objectURL} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">2. Chi tiết cần chú trọng</label>
                        <textarea
                            rows={3}
                            className="w-full bg-surface dark:bg-gray-700/50 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-accent focus:outline-none transition-all"
                            placeholder="VD: Mặt đứng chính, chi tiết cửa sổ, tỷ lệ chuẩn..."
                            value={prompt}
                            onChange={(e) => onStateChange({ prompt: e.target.value })}
                        />
                    </div>
                    
                    <div>
                        <NumberOfImagesSelector value={numberOfImages} onChange={(val) => onStateChange({ numberOfImages: val })} disabled={isLoading} />
                    </div>
                    
                    <div>
                        <ResolutionSelector value={resolution} onChange={handleResolutionChange} disabled={isLoading} />
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || userCredits < cost || !sourceImage}
                        className="w-full flex justify-center items-center gap-3 bg-accent hover:bg-accent-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                        {isLoading ? <><Spinner /> Đang vẽ...</> : 'Tạo Bản Vẽ'}
                    </button>
                    {error && <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-500 dark:text-red-300 rounded-lg text-sm">{error}</div>}
                </div>

                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-text-primary dark:text-white">Kết quả Bản vẽ</h3>
                    </div>
                    <div className="w-full aspect-video bg-main-bg dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-border-color dark:border-gray-700 flex items-center justify-center overflow-hidden">
                        {isLoading && <Spinner />}
                        {!isLoading && resultImages.length === 1 && sourceImage && (
                            <ImageComparator originalImage={sourceImage.objectURL} resultImage={resultImages[0]} />
                        )}
                        {!isLoading && resultImages.length === 0 && (
                             <p className="text-text-secondary dark:text-gray-400 text-center p-4">Kết quả sẽ hiển thị ở đây.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DrawingGenerator;
