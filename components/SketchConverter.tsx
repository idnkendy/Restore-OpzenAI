
import React, { useState } from 'react';
import { FileData, Tool, ImageResolution, AspectRatio } from '../types';
import { SketchConverterState } from '../state/toolState';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import Spinner from './Spinner';
import ImageUpload from './common/ImageUpload';
import ImageComparator from './ImageComparator';
import ResolutionSelector from './common/ResolutionSelector';
import OptionSelector from './common/OptionSelector';

interface SketchConverterProps {
    state: SketchConverterState;
    onStateChange: (newState: Partial<SketchConverterState>) => void;
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

const styleOptions = [
    { value: 'pencil', label: 'Bút chì' },
    { value: 'charcoal', label: 'Than củi' },
    { value: 'watercolor', label: 'Màu nước' },
];

const detailLevelOptions = [
    { value: 'low', label: 'Ít chi tiết' },
    { value: 'medium', label: 'Chi tiết vừa' },
    { value: 'high', label: 'Nhiều chi tiết' },
];

const SketchConverter: React.FC<SketchConverterProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits }) => {
    const { sourceImage, isLoading, error, resultImage, sketchStyle, detailLevel, resolution } = state;
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
    
    const cost = getCostPerImage(); // Usually 1 image

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

    const handleResolutionChange = (val: ImageResolution) => {
        onStateChange({ resolution: val });
    };

    const handleGenerate = async () => {
        if (onDeductCredits && userCredits < cost) {
             onStateChange({ error: `Bạn không đủ credits. Cần ${cost} credits nhưng chỉ còn ${userCredits}. Vui lòng nạp thêm.` });
             return;
        }

        if (!sourceImage) {
            onStateChange({ error: 'Vui lòng tải lên một ảnh để chuyển đổi.' });
            return;
        }
        onStateChange({ isLoading: true, error: null, resultImage: null });

        // Prompt construction
        const styleMap = {
            'pencil': 'a highly detailed pencil sketch',
            'charcoal': 'a dramatic charcoal drawing',
            'watercolor': 'a beautiful watercolor painting'
        };

        let prompt = '';
        if (sketchStyle === 'watercolor') {
            const watercolorDetailMap = {
                'low': 'using a loose, wet-on-wet technique with soft edges and a limited color palette',
                'medium': 'with a balance of soft washes and defined details, showcasing vibrant colors',
                'high': 'with intricate details, rich colors, and complex layering of washes'
            };
            prompt = `Convert this realistic image into ${styleMap.watercolor}. The final result should look like a hand-painted artwork. The painting should have a level of detail that is ${watercolorDetailMap[detailLevel]}. The background should be a clean white paper texture.`;
        } else {
            const detailMap = {
                'low': 'with minimal lines, focusing on the main contours and shapes',
                'medium': 'with a balanced amount of detail and shading',
                'high': 'with intricate details, textures, and rich shading'
            };
            prompt = `Convert this realistic image into ${styleMap[sketchStyle as 'pencil' | 'charcoal']}. The sketch must be strictly black and white on a clean white background. The final result should look like a hand-drawn artwork. The sketch should have a level of detail that is ${detailMap[detailLevel]}. Do not include any color.`;
        }

        try {
            if (onDeductCredits) {
                await onDeductCredits(cost, `Chuyển đổi Sketch (${sketchStyle}) - ${resolution}`);
            }

            let results: any[] = [];

            // High Quality (Pro) Logic
            if (resolution === '1K' || resolution === '2K' || resolution === '4K') {
                // High Quality generator typically returns 1 image unless configured otherwise, we treat it as 1 here for sketch
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
                tool: Tool.SketchConverter,
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
        link.download = `sketch-conversion.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col gap-8">
            <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">AI Biến Ảnh Thành Sketch</h2>
            <p className="text-text-secondary dark:text-gray-300 -mt-8 mb-6">Tải lên một ảnh thực tế hoặc ảnh render, AI sẽ chuyển đổi nó thành một bản vẽ phác thảo đen trắng nghệ thuật.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* --- INPUTS --- */}
                <div className="space-y-6 bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">1. Tải Lên Ảnh Gốc</label>
                        <ImageUpload onFileSelect={handleFileSelect} id="sketch-converter-source" previewUrl={sourceImage?.objectURL} />
                    </div>
                    
                    <OptionSelector
                        id="sketch-style"
                        label="2. Chọn phong cách"
                        options={styleOptions}
                        value={sketchStyle}
                        onChange={(val) => onStateChange({ sketchStyle: val as any })}
                        disabled={isLoading}
                        variant="grid"
                    />

                    <OptionSelector
                        id="detail-level"
                        label="3. Chọn mức độ chi tiết"
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
                        {isLoading ? <><Spinner /> Đang chuyển đổi...</> : 'Tạo Sketch'}
                    </button>
                    {error && <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-500 dark:text-red-300 rounded-lg text-sm">{error}</div>}
                </div>

                {/* --- RESULTS --- */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-text-primary dark:text-white">So sánh Ảnh Gốc & Sketch</h3>
                        {resultImage && (
                            <button onClick={handleDownload} className="text-center bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 transition-colors rounded-lg text-sm">
                                Tải xuống Sketch
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
                             <p className="text-text-secondary dark:text-gray-400 text-center p-4">{sourceImage ? 'Bản vẽ sketch sẽ được hiển thị ở đây.' : 'Tải lên một ảnh để bắt đầu.'}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SketchConverter;
