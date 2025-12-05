
import React from 'react';
import { FileData, Tool, ImageResolution } from '../types';
import { DiagramGeneratorState } from '../state/toolState';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import Spinner from './Spinner';
import ImageUpload from './common/ImageUpload';
import OptionSelector from './common/OptionSelector';
import ResolutionSelector from './common/ResolutionSelector';

interface DiagramGeneratorProps {
    state: DiagramGeneratorState;
    onStateChange: (newState: Partial<DiagramGeneratorState>) => void;
    userCredits?: number;
    onDeductCredits?: (amount: number, description: string) => Promise<string>;
}

const diagramTypes = [
    { value: 'exploded', label: 'Phân tích nổ (Exploded Axonometric)' },
    { value: 'circulation', label: 'Sơ đồ giao thông (Circulation)' },
    { value: 'massing', label: 'Hình khối (Massing)' },
    { value: 'environmental', label: 'Phân tích khí hậu/Môi trường' },
];

const DiagramGenerator: React.FC<DiagramGeneratorProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits }) => {
    const { prompt, sourceImage, isLoading, error, resultImages, numberOfImages, diagramType, resolution } = state;
    
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
            onStateChange({ error: 'Vui lòng tải lên ảnh mô hình/công trình.' });
            return;
        }

        onStateChange({ isLoading: true, error: null, resultImages: [] });

        const typePrompts = {
            'exploded': 'an exploded axonometric architectural diagram showing structural layers and components separated vertically.',
            'circulation': 'an architectural diagram highlighting circulation paths and movement flow with arrows and zones.',
            'massing': 'a clean architectural massing diagram emphasizing volume, form, and scale.',
            'environmental': 'an environmental analysis diagram showing sun path, wind flow, and green zones.'
        };

        const fullPrompt = `Generate ${typePrompts[diagramType]}. Base it on the provided image structure. Use clear, diagrammatic aesthetics (clean lines, pastel colors, transparency). ${prompt}`;

        try {
            if (onDeductCredits) {
                await onDeductCredits(cost, `Tạo Diagram (${diagramType})`);
            }

            let results: { imageUrl: string }[] = [];

            if (resolution === '1K' || resolution === '2K' || resolution === '4K') {
                const promises = Array.from({ length: numberOfImages }).map(async () => {
                    const images = await geminiService.generateHighQualityImage(fullPrompt, '4:3', resolution, sourceImage);
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
                    tool: Tool.DiagramGenerator,
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
            <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">AI Tạo Diagram Kiến Trúc</h2>
            <p className="text-text-secondary dark:text-gray-300 -mt-8 mb-6">Tạo các sơ đồ phân tích kiến trúc chuyên nghiệp từ hình ảnh công trình hoặc mô hình.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6 bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">1. Tải Lên Ảnh Mô Hình</label>
                        <ImageUpload onFileSelect={handleFileSelect} previewUrl={sourceImage?.objectURL} />
                    </div>
                    
                    <OptionSelector 
                        id="diagram-type"
                        label="2. Loại Diagram"
                        options={diagramTypes}
                        value={diagramType}
                        onChange={(val) => onStateChange({ diagramType: val as any })}
                        disabled={isLoading}
                        variant="grid"
                    />

                    <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">3. Ghi chú thêm</label>
                        <textarea
                            rows={2}
                            className="w-full bg-surface dark:bg-gray-700/50 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-accent focus:outline-none transition-all"
                            placeholder="VD: Nhấn mạnh vào không gian xanh, đường đi bộ..."
                            value={prompt}
                            onChange={(e) => onStateChange({ prompt: e.target.value })}
                        />
                    </div>
                    
                    <ResolutionSelector value={resolution} onChange={handleResolutionChange} disabled={isLoading} />

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || userCredits < cost || !sourceImage}
                        className="w-full flex justify-center items-center gap-3 bg-accent hover:bg-accent-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                        {isLoading ? <><Spinner /> Đang phân tích...</> : 'Tạo Diagram'}
                    </button>
                    {error && <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-500 dark:text-red-300 rounded-lg text-sm">{error}</div>}
                </div>

                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-text-primary dark:text-white">Kết quả Diagram</h3>
                    </div>
                    <div className="w-full aspect-video bg-main-bg dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-border-color dark:border-gray-700 flex items-center justify-center overflow-hidden">
                        {isLoading && <Spinner />}
                        {!isLoading && resultImages.length > 0 && (
                             <img src={resultImages[0]} alt="Diagram Result" className="w-full h-full object-contain" />
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

export default DiagramGenerator;
