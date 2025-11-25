
import React, { useState } from 'react';
import { FileData, Tool, ImageResolution, AspectRatio } from '../types';
import { AITechnicalDrawingsState } from '../state/toolState';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import Spinner from './Spinner';
import ImageUpload from './common/ImageUpload';
import ImageComparator from './ImageComparator';
import OptionSelector from './common/OptionSelector';
import ResolutionSelector from './common/ResolutionSelector';

interface AITechnicalDrawingsProps {
    state: AITechnicalDrawingsState;
    onStateChange: (newState: Partial<AITechnicalDrawingsState>) => void;
    userCredits?: number;
    onDeductCredits?: (amount: number, description: string) => Promise<string>;
}

const drawingTypeOptions = [
    { value: 'floor-plan', label: 'Mặt bằng (Floor Plan)' },
    { value: 'elevation', label: 'Mặt đứng (Elevation)' },
    { value: 'section', label: 'Mặt cắt (Section)' },
];

const detailLevelOptions = [
    { value: 'basic', label: 'Cơ bản (Nét đơn)' },
    { value: 'detailed', label: 'Chi tiết (Vật liệu)' },
    { value: 'annotated', label: 'Có chú thích' },
    { value: 'terrain', label: 'Kèm địa hình' },
];

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

const AITechnicalDrawings: React.FC<AITechnicalDrawingsProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits }) => {
    const { sourceImage, isLoading, error, resultImage, drawingType, detailLevel, resolution } = state;
    const [detectedAspectRatio, setDetectedAspectRatio] = useState<AspectRatio>('1:1');
    
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
    
    const cost = getCostPerImage();

    const handleResolutionChange = (val: ImageResolution) => {
        onStateChange({ resolution: val });
    };

    const handleFileSelect = (fileData: FileData | null) => {
        if (fileData?.objectURL) {
            const img = new Image();
            img.onload = () => {
                setDetectedAspectRatio(getClosestAspectRatio(img.width, img.height));
            };
            img.src = fileData.objectURL;
        }
        onStateChange({
            sourceImage: fileData,
            resultImage: null,
            error: null,
        });
    };

    const handleGenerate = async () => {
        if (onDeductCredits && userCredits < cost) {
             onStateChange({ error: `Bạn không đủ credits. Cần ${cost} credits nhưng chỉ còn ${userCredits}. Vui lòng nạp thêm.` });
             return;
        }

        if (!sourceImage) {
            onStateChange({ error: 'Vui lòng tải lên một ảnh Render để bắt đầu.' });
            return;
        }
        onStateChange({ isLoading: true, error: null, resultImage: null });

        // Prompt construction
        const drawingTypeMap: Record<string, string> = {
            'floor-plan': 'a professional 2D floor plan',
            'elevation': 'a professional 2D front elevation drawing',
            'section': 'a professional 2D cross-section drawing'
        };

        const detailLevelMap: Record<string, string> = {
            'basic': 'Use simple, clean lines to show the main architectural layout, walls, doors, and windows.',
            'detailed': 'Include more details such as furniture layout, fixtures, structural elements, and material indications (hatching for concrete, wood grain patterns, etc.).',
            'annotated': 'Include all details from the "detailed" level, and add text annotations for room names (e.g., "Living Room", "Bedroom 1") and overall dimensions.',
            'terrain': 'Show the building in context with its surrounding terrain, including contour lines, major landscaping features, and pathways.'
        };

        const prompt = `From this photorealistic 3D architectural rendering, generate ${drawingTypeMap[drawingType]}. The drawing must be strictly orthographic (no perspective), with clean, thin black lines on a white background, in the style of a technical architectural drawing. ${detailLevelMap[detailLevel]}`;

        try {
            if (onDeductCredits) {
                await onDeductCredits(cost, `Tạo bản vẽ kỹ thuật (${drawingType}) - ${resolution}`);
            }

            let results: any[] = [];

            // High Quality (Pro) Logic
            if (resolution === '1K' || resolution === '2K' || resolution === '4K') {
                const images = await geminiService.generateHighQualityImage(prompt, detectedAspectRatio, resolution, sourceImage || undefined);
                results = [{ imageUrl: images[0] }];
            }
            // Standard (Flash) Logic
            else {
                results = await geminiService.editImage(prompt, sourceImage, 1);
            }

            const imageUrl = results[0].imageUrl;
            onStateChange({ resultImage: imageUrl });

            historyService.addToHistory({
                tool: Tool.AITechnicalDrawings,
                prompt: prompt,
                sourceImageURL: sourceImage.objectURL,
                resultImageURL: imageUrl,
            });

        } catch (err: any) {
            onStateChange({ error: err.message || 'Đã xảy ra lỗi không mong muốn.' });
        } finally {
            onStateChange({ isLoading: false });
        }
    };

    const handleDownload = () => {
        if (!resultImage) return;
        const link = document.createElement('a');
        link.href = resultImage;
        link.download = `technical-drawing.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col gap-8">
            <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">AI Tạo Bản Vẽ Kỹ Thuật</h2>
            <p className="text-text-secondary dark:text-gray-300 -mt-8 mb-6">Chuyển đổi ảnh phối cảnh 3D (Render) thành bản vẽ kỹ thuật 2D (mặt bằng, mặt đứng, mặt cắt) chuyên nghiệp.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* --- INPUTS --- */}
                <div className="space-y-6 bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">1. Tải Lên Ảnh Render 3D</label>
                        <ImageUpload onFileSelect={handleFileSelect} id="tech-drawing-source" previewUrl={sourceImage?.objectURL} />
                    </div>
                    
                    <OptionSelector 
                        id="drawing-type"
                        label="2. Loại bản vẽ"
                        options={drawingTypeOptions}
                        value={drawingType}
                        onChange={(val) => onStateChange({ drawingType: val as any })}
                        disabled={isLoading}
                        variant="grid"
                    />
                    <OptionSelector 
                        id="detail-level"
                        label="3. Mức độ chi tiết"
                        options={detailLevelOptions}
                        value={detailLevel}
                        onChange={(val) => onStateChange({ detailLevel: val as any })}
                        disabled={isLoading}
                        variant="grid"
                    />
                    
                    <div>
                        <ResolutionSelector value={resolution} onChange={handleResolutionChange} disabled={isLoading} />
                    </div>

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
                        disabled={isLoading || !sourceImage || userCredits < cost}
                        className="w-full flex justify-center items-center gap-3 bg-accent hover:bg-accent-600 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                        {isLoading ? <><Spinner /> Đang xử lý...</> : 'Tạo Bản Vẽ'}
                    </button>
                    {error && <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-500 dark:text-red-300 rounded-lg text-sm">{error}</div>}
                </div>

                {/* --- RESULTS --- */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-text-primary dark:text-white">So sánh Render & Bản vẽ</h3>
                        {resultImage && (
                            <button onClick={handleDownload} className="text-center bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 transition-colors rounded-lg text-sm">
                                Tải xuống
                            </button>
                        )}
                    </div>
                    <div className="w-full aspect-video bg-main-bg dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-border-color dark:border-gray-700 flex items-center justify-center overflow-hidden">
                        {isLoading && <Spinner />}
                        {!isLoading && resultImage && sourceImage && (
                            <ImageComparator
                                originalImage={sourceImage.objectURL}
                                resultImage={resultImage}
                            />
                        )}
                        {!isLoading && !resultImage && (
                             <p className="text-text-secondary dark:text-gray-400 text-center p-4">{sourceImage ? 'Kết quả sẽ được hiển thị ở đây.' : 'Tải lên một ảnh render để bắt đầu.'}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AITechnicalDrawings;
