
import React from 'react';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import { FileData, Tool, ImageResolution } from '../types';
import { VirtualTourState } from '../state/toolState';
import Spinner from './Spinner';
import ImageUpload from './common/ImageUpload';
import ResolutionSelector from './common/ResolutionSelector';

// --- ICONS for Tour Panel ---
const PanLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>;
const PanRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 17l5-5m0 0l-5-5m5 5H6" /></svg>;
const PanUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7l4-4m0 0l4 4m-4-4v18" /></svg>;
const PanDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 17l-4 4m0 0l-4-4m4 4V3" /></svg>;
const OrbitLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 15l-3-3m0 0l3-3m-3 3h8a5 5 0 015 5v1" /></svg>;
const OrbitRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 15l3-3m0 0l-3-3m3 3H5a5 5 0 00-5 5v1" /></svg>;
const ZoomInIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>;
const ZoomOutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>;
const ResetIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 12A8 8 0 1012 4v4" /></svg>;


interface VirtualTourProps {
    state: VirtualTourState;
    onStateChange: (newState: Partial<VirtualTourState>) => void;
    userCredits?: number;
    onDeductCredits?: (amount: number, description: string) => Promise<string>;
}

const VirtualTour: React.FC<VirtualTourProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits }) => {
    const { sourceImage, currentTourImage, isLoading, error, tourStepSize, tourHistory, resolution } = state;
    
    // Calculate cost based on resolution
    const getCostPerStep = () => {
        switch (resolution) {
            case 'Standard': return 5;
            case '1K': return 15;
            case '2K': return 20;
            case '4K': return 30;
            default: return 5;
        }
    };
    
    const costPerStep = getCostPerStep();

    const handleTourFileSelect = (fileData: FileData | null) => {
        onStateChange({
            sourceImage: fileData,
            currentTourImage: fileData,
            tourHistory: fileData ? [fileData] : [],
            error: null
        });
    };

    const handleResolutionChange = (val: ImageResolution) => {
        onStateChange({ resolution: val });
    };

    const handleTourStep = async (action: 'pan-left' | 'pan-right' | 'tilt-up' | 'tilt-down' | 'orbit-left' | 'orbit-right' | 'zoom-in' | 'zoom-out') => {
        if (!currentTourImage) return;
        
        if (onDeductCredits && userCredits < costPerStep) {
             onStateChange({ error: `Bạn không đủ credits. Cần ${costPerStep} credits/bước nhưng chỉ còn ${userCredits}. Vui lòng nạp thêm.` });
             return;
        }

        onStateChange({ isLoading: true, error: null });

        let prompt = '';
        const baseInstruction = "Generate a new image from the camera's new position. Maintain the exact same architectural style, materials, lighting, and overall atmosphere from the source image. The change should only be the camera's perspective. The final image must look photorealistic.";

        switch(action) {
            case 'pan-left': prompt = `From the current camera position, pan the camera to the left by ${tourStepSize} degrees. ${baseInstruction}`; break;
            case 'pan-right': prompt = `From the current camera position, pan the camera to the right by ${tourStepSize} degrees. ${baseInstruction}`; break;
            case 'tilt-up': prompt = `From the current camera position, tilt the camera upwards by ${tourStepSize} degrees. ${baseInstruction}`; break;
            case 'tilt-down': prompt = `From the current camera position, tilt the camera downwards by ${tourStepSize} degrees. ${baseInstruction}`; break;
            case 'orbit-left': prompt = `From the current camera position, orbit the camera to the left around the central subject by ${tourStepSize} degrees. ${baseInstruction}`; break;
            case 'orbit-right': prompt = `From the current camera position, orbit the camera to the right around the central subject by ${tourStepSize} degrees. ${baseInstruction}`; break;
            case 'zoom-in': prompt = `From the current camera position, zoom in, moving the camera forward. The field of view should narrow. ${baseInstruction}`; break;
            case 'zoom-out': prompt = `From the current camera position, zoom out, moving the camera backward. The field of view should widen. ${baseInstruction}`; break;
            default:
                onStateChange({ isLoading: false, error: 'Hành động không xác định.' });
                return;
        }

        try {
             if (onDeductCredits) {
                await onDeductCredits(costPerStep, `Virtual Tour (${action}) - ${resolution}`);
            }

            let results: { imageUrl: string }[] = [];

            // High Quality (Pro) Logic
            if (resolution === '1K' || resolution === '2K' || resolution === '4K') {
                const images = await geminiService.generateHighQualityImage(prompt, '16:9', resolution, currentTourImage || undefined);
                results = [{ imageUrl: images[0] }];
            } 
            // Standard (Flash) Logic
            else {
                results = await geminiService.editImage(prompt, currentTourImage, 1);
            }

            const imageUrl = results[0].imageUrl;
            const newImage: FileData = {
                base64: imageUrl.split(',')[1],
                mimeType: `image/${imageUrl.split(';')[0].split('/')[1]}`,
                objectURL: imageUrl,
            };

            const newHistory = [...tourHistory, newImage];
            onStateChange({
                currentTourImage: newImage,
                tourHistory: newHistory,
            });

            historyService.addToHistory({
                tool: Tool.VirtualTour,
                prompt,
                sourceImageURL: currentTourImage.objectURL,
                resultImageURL: newImage.objectURL,
            });

        } catch (err: any) {
            onStateChange({ error: err.message || 'Đã xảy ra lỗi không mong muốn.' });
        } finally {
            onStateChange({ isLoading: false });
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">AI Tham Quan Ảo</h2>
                <p className="text-text-secondary dark:text-gray-300 mb-6">Tải lên một ảnh phối cảnh, sau đó sử dụng các nút điều hướng để "di chuyển" xung quanh không gian. AI sẽ tạo ra các góc nhìn mới cho bạn.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* --- CONTROLS --- */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700">
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">1. Tải Lên Ảnh Bắt Đầu</label>
                        <ImageUpload onFileSelect={handleTourFileSelect} previewUrl={sourceImage?.objectURL} />
                    </div>
                    <div className="bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700">
                        <label htmlFor="tour-step-size" className="block text-sm font-medium text-text-secondary dark:text-gray-400">2. Điều chỉnh bước di chuyển</label>
                        <div className="flex items-center gap-4 mt-2">
                            <input
                                id="tour-step-size"
                                type="range"
                                min="5"
                                max="45"
                                step="5"
                                value={tourStepSize}
                                onChange={(e) => onStateChange({ tourStepSize: Number(e.target.value) })}
                                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent"
                                disabled={isLoading}
                            />
                            <span className="font-semibold text-text-primary dark:text-white w-12 text-center">{tourStepSize}°</span>
                        </div>
                    </div>
                    <div className="bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700">
                        <ResolutionSelector value={resolution} onChange={handleResolutionChange} disabled={isLoading} />
                    </div>
                    
                     <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800/50 rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-sm text-text-secondary dark:text-gray-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Chi phí: <span className="font-bold text-text-primary dark:text-white">{costPerStep} / bước</span></span>
                        </div>
                        <div className="text-xs">
                            {userCredits < costPerStep ? (
                                <span className="text-red-500 font-semibold">Không đủ</span>
                            ) : (
                                <span className="text-green-600 dark:text-green-400">Khả dụng: {userCredits}</span>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => handleTourFileSelect(sourceImage)}
                        disabled={!sourceImage || isLoading}
                        className="w-full flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                        <ResetIcon />
                        <span>Quay về điểm bắt đầu</span>
                    </button>
                </div>

                {/* --- DISPLAY --- */}
                <div className="lg:col-span-2">
                    <div className="w-full aspect-video bg-main-bg dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-border-color dark:border-gray-700 flex items-center justify-center overflow-hidden relative">
                        {isLoading && (
                            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-10">
                                <Spinner />
                                <p className="text-white mt-2">Đang tạo góc nhìn mới...</p>
                            </div>
                        )}
                        {currentTourImage ? (
                            <img src={currentTourImage.objectURL} alt="Current view" className="w-full h-full object-contain" />
                        ) : (
                            <p className="text-text-secondary dark:text-gray-400 p-4 text-center">Tải lên một ảnh để bắt đầu tour.</p>
                        )}
                    </div>
                    {error && <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-500 dark:text-red-300 rounded-lg text-sm">{error}</div>}

                    {/* Navigation Panel */}
                    <div className="mt-6 bg-main-bg/50 dark:bg-dark-bg/50 p-4 rounded-xl border border-border-color dark:border-gray-700 flex justify-center items-center gap-2">
                         <button title="Quay trái" onClick={() => handleTourStep('orbit-left')} disabled={!currentTourImage || isLoading} className="p-3 rounded-full bg-surface dark:bg-gray-700 hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"><OrbitLeftIcon /></button>
                         <div className="grid grid-cols-3 gap-2">
                            <div></div>
                            <button title="Nhìn lên" onClick={() => handleTourStep('tilt-up')} disabled={!currentTourImage || isLoading} className="p-3 rounded-full bg-surface dark:bg-gray-700 hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"><PanUpIcon /></button>
                            <div></div>
                            <button title="Lia trái" onClick={() => handleTourStep('pan-left')} disabled={!currentTourImage || isLoading} className="p-3 rounded-full bg-surface dark:bg-gray-700 hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"><PanLeftIcon /></button>
                            <div className="flex flex-col gap-2">
                                <button title="Phóng to" onClick={() => handleTourStep('zoom-in')} disabled={!currentTourImage || isLoading} className="p-3 rounded-full bg-surface dark:bg-gray-700 hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"><ZoomInIcon /></button>
                                <button title="Thu nhỏ" onClick={() => handleTourStep('zoom-out')} disabled={!currentTourImage || isLoading} className="p-3 rounded-full bg-surface dark:bg-gray-700 hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"><ZoomOutIcon /></button>
                            </div>
                            <button title="Lia phải" onClick={() => handleTourStep('pan-right')} disabled={!currentTourImage || isLoading} className="p-3 rounded-full bg-surface dark:bg-gray-700 hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"><PanRightIcon /></button>
                            <div></div>
                            <button title="Nhìn xuống" onClick={() => handleTourStep('tilt-down')} disabled={!currentTourImage || isLoading} className="p-3 rounded-full bg-surface dark:bg-gray-700 hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"><PanDownIcon /></button>
                            <div></div>
                         </div>
                         <button title="Quay phải" onClick={() => handleTourStep('orbit-right')} disabled={!currentTourImage || isLoading} className="p-3 rounded-full bg-surface dark:bg-gray-700 hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"><OrbitRightIcon /></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VirtualTour;
