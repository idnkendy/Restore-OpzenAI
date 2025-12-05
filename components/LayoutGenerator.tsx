
import React, { useState } from 'react';
import { FileData, Tool, ImageResolution } from '../types';
import { LayoutGeneratorState } from '../state/toolState';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import Spinner from './Spinner';
import ImageUpload from './common/ImageUpload';
import ImageComparator from './ImageComparator';
import NumberOfImagesSelector from './common/NumberOfImagesSelector';
import ResultGrid from './common/ResultGrid';
import ResolutionSelector from './common/ResolutionSelector';

interface LayoutGeneratorProps {
    state: LayoutGeneratorState;
    onStateChange: (newState: Partial<LayoutGeneratorState>) => void;
    userCredits?: number;
    onDeductCredits?: (amount: number, description: string) => Promise<string>;
}

const LayoutGenerator: React.FC<LayoutGeneratorProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits }) => {
    const { prompt, sourceImage, isLoading, error, resultImages, numberOfImages, resolution } = state;
    
    const cost = numberOfImages * 5; // Standard cost

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

        if (!prompt.trim()) {
            onStateChange({ error: 'Vui lòng nhập yêu cầu về layout.' });
            return;
        }

        onStateChange({ isLoading: true, error: null, resultImages: [] });

        const fullPrompt = `Generate a functional 2D architectural layout plan (top-down view) based on the following requirements: "${prompt}". 
        ${sourceImage ? 'Use the provided image as a base for the building footprint/outline.' : 'Create a layout from scratch.'}
        The layout should clearly show room zoning, walls, doors, and furniture arrangement. Use a clean, professional diagrammatic style.`;

        try {
            if (onDeductCredits) {
                await onDeductCredits(cost, `Tạo Layout (${numberOfImages} ảnh)`);
            }

            let results: { imageUrl: string }[] = [];

            if (resolution === '1K' || resolution === '2K' || resolution === '4K') {
                const promises = Array.from({ length: numberOfImages }).map(async () => {
                    const images = await geminiService.generateHighQualityImage(fullPrompt, '4:3', resolution, sourceImage || undefined);
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
                    tool: Tool.LayoutGenerator,
                    prompt: fullPrompt,
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

    return (
        <div className="flex flex-col gap-8">
            <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">AI Tạo Layout</h2>
            <p className="text-text-secondary dark:text-gray-300 -mt-8 mb-6">Tạo bố cục mặt bằng chức năng từ ý tưởng hoặc hình ảnh phác thảo.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6 bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">1. Tải Lên Phác Thảo (Tùy chọn)</label>
                        <ImageUpload onFileSelect={handleFileSelect} previewUrl={sourceImage?.objectURL} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">2. Mô tả yêu cầu Layout</label>
                        <textarea
                            rows={4}
                            className="w-full bg-surface dark:bg-gray-700/50 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-accent focus:outline-none transition-all"
                            placeholder="VD: Căn hộ 2 phòng ngủ, 1 phòng khách rộng, bếp mở, phong cách hiện đại..."
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
                        disabled={isLoading || userCredits < cost}
                        className="w-full flex justify-center items-center gap-3 bg-accent hover:bg-accent-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                        {isLoading ? <><Spinner /> Đang tạo...</> : 'Tạo Layout'}
                    </button>
                    {error && <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-500 dark:text-red-300 rounded-lg text-sm">{error}</div>}
                </div>

                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-text-primary dark:text-white">Kết quả Layout</h3>
                    </div>
                    <div className="w-full aspect-video bg-main-bg dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-border-color dark:border-gray-700 flex items-center justify-center overflow-hidden">
                        {isLoading && <Spinner />}
                        {!isLoading && resultImages.length === 1 && sourceImage && (
                            <ImageComparator originalImage={sourceImage.objectURL} resultImage={resultImages[0]} />
                        )}
                        {!isLoading && resultImages.length > 0 && !sourceImage && (
                             <img src={resultImages[0]} alt="Result" className="w-full h-full object-contain" />
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

export default LayoutGenerator;
