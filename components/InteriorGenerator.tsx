
import React, { useState, useCallback } from 'react';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import * as jobService from '../services/jobService';
import * as externalVideoService from '../services/externalVideoService';
import { refundCredits } from '../services/paymentService';
import { FileData, Tool, AspectRatio, ImageResolution } from '../types';
import { InteriorGeneratorState } from '../state/toolState';
import Spinner from './Spinner';
import ImageUpload from './common/ImageUpload';
import MultiImageUpload from './common/MultiImageUpload';
import ImageComparator from './ImageComparator';
import NumberOfImagesSelector from './common/NumberOfImagesSelector';
import ResultGrid from './common/ResultGrid';
import OptionSelector from './common/OptionSelector';
import AspectRatioSelector from './common/AspectRatioSelector';
import ResolutionSelector from './common/ResolutionSelector';
import ImagePreviewModal from './common/ImagePreviewModal';
import { supabase } from '../services/supabaseClient';

const styleOptions = [
    { value: 'none', label: 'Tự động' },
    { value: 'Hiện đại', label: 'Hiện đại' },
    { value: 'Tối giản', label: 'Tối giản' },
    { value: 'Tân Cổ điển', label: 'Tân Cổ điển' },
    { value: 'Scandinavian', label: 'Scandinavian' },
    { value: 'Japandi', label: 'Japandi' },
    { value: 'Công nghiệp', label: 'Industrial' },
    { value: 'Nhiệt đới', label: 'Nhiệt đới' },
    { value: 'Bohemian', label: 'Bohemian' },
];

const roomTypeOptions = [
    { value: 'none', label: 'Tự động' },
    { value: 'Phòng khách', label: 'Phòng khách' },
    { value: 'Phòng ngủ', label: 'Phòng ngủ' },
    { value: 'Nhà bếp', label: 'Nhà bếp' },
    { value: 'Phòng ăn', label: 'Phòng ăn' },
    { value: 'Phòng tắm', label: 'Phòng tắm' },
    { value: 'Văn phòng tại nhà', label: 'Văn phòng' },
];

const interiorLightingOptions = [
    { value: 'none', label: 'Tự động' },
    { value: 'Ánh sáng tự nhiên ban ngày, chan hòa', label: 'Tự nhiên' },
    { value: 'Ánh sáng nhân tạo ấm áp buổi tối', label: 'Ấm áp' },
    { value: 'Ánh sáng studio, làm nổi bật chi tiết', label: 'Studio' },
    { value: 'Ánh sáng moody, có độ tương phản cao', label: 'Moody' },
    { value: 'Ánh sáng đèn neon hiện đại', label: 'Neon' },
];

const colorPaletteOptions = [
    { value: 'none', label: 'Tự động' },
    { value: 'Tông màu trung tính (trắng, xám, be)', label: 'Trung tính' },
    { value: 'Tông màu ấm (kem, nâu, cam đất)', label: 'Tông ấm' },
    { value: 'Tông màu lạnh (xanh dương, xanh lá, xám)', label: 'Tông lạnh' },
    { value: 'Tông màu tương phản cao (đen và trắng)', label: 'Tương phản' },
    { value: 'Tông màu pastel nhẹ nhàng', label: 'Pastel' },
];

interface InteriorGeneratorProps {
  state: InteriorGeneratorState;
  onStateChange: (newState: Partial<InteriorGeneratorState>) => void;
  onSendToViewSync: (image: FileData) => void;
  userCredits?: number;
  onDeductCredits?: (amount: number, description: string) => Promise<string>;
}

const InteriorGenerator: React.FC<InteriorGeneratorProps> = ({ state, onStateChange, onSendToViewSync, userCredits = 0, onDeductCredits }) => {
    const { 
        style, roomType, lighting, colorPalette, customPrompt, referenceImages, sourceImage, 
        isLoading, isUpscaling, error, resultImages, upscaledImage, numberOfImages, aspectRatio, resolution
    } = state;

    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [upscaleWarning, setUpscaleWarning] = useState<string | null>(null);
    
    const escapeRegExp = (string: string) => { return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
    const updatePrompt = useCallback((type: 'style' | 'roomType' | 'lighting' | 'colorPalette', newValue: string, oldValue: string) => {
        const getPromptPart = (partType: string, value: string): string => {
            if (value === 'none' || !value) return '';
            switch (partType) {
                case 'style': return `phong cách ${value}`;
                case 'roomType': return `cho ${value}`;
                case 'lighting': return `với ${value}`;
                case 'colorPalette': return `sử dụng ${value}`;
                default: return '';
            }
        };
        const oldPart = getPromptPart(type, oldValue); const newPart = getPromptPart(type, newValue); let nextPrompt = customPrompt;
        if (oldPart && nextPrompt.includes(oldPart)) { const escapedOldPart = escapeRegExp(oldPart); nextPrompt = newPart ? nextPrompt.replace(oldPart, newPart) : nextPrompt.replace(new RegExp(`,?\\s*${escapedOldPart}`), '').replace(new RegExp(`${escapedOldPart},?\\s*`), ''); } else if (newPart) { nextPrompt = nextPrompt.trim() ? `${nextPrompt}, ${newPart}` : newPart; }
        const cleanedPrompt = nextPrompt.replace(/,+/g, ',').split(',').map(p => p.trim()).filter(p => p.length > 0).join(', ');
        onStateChange({ customPrompt: cleanedPrompt });
    }, [customPrompt, onStateChange]);

    const handleStyleChange = (newVal: string) => { updatePrompt('style', newVal, style); onStateChange({ style: newVal }); };
    const handleRoomTypeChange = (newVal: string) => { updatePrompt('roomType', newVal, roomType); onStateChange({ roomType: newVal }); };
    const handleLightingChange = (newVal: string) => { updatePrompt('lighting', newVal, lighting); onStateChange({ lighting: newVal }); };
    const handleColorPaletteChange = (newVal: string) => { updatePrompt('colorPalette', newVal, colorPalette); onStateChange({ colorPalette: newVal }); };
    const handleResolutionChange = (val: ImageResolution) => { onStateChange({ resolution: val }); if (val === 'Standard') { onStateChange({ referenceImages: [] }); } };
    const handleFileSelect = (fileData: FileData | null) => { onStateChange({ sourceImage: fileData, resultImages: [], upscaledImage: null, }); }
    const handleReferenceFilesChange = (files: FileData[]) => { onStateChange({ referenceImages: files }); };
    const getCostPerImage = () => { switch (resolution) { case 'Standard': return 5; case '1K': return 10; case '2K': return 20; case '4K': return 30; default: return 5; } };
    const cost = numberOfImages * getCostPerImage();
    const constructInteriorPrompt = () => { let basePrompt = `Generate an image with a strict aspect ratio of ${aspectRatio}. Adapt the composition of the interior scene from the source image to fit this new frame. Do not add black bars or letterbox. The main creative instruction is: ${customPrompt}. Make it photorealistic interior design.`; if (referenceImages && referenceImages.length > 0) { basePrompt += ` Also, take aesthetic inspiration (colors, materials, atmosphere) from the provided reference image(s).`; } basePrompt = `You are a professional interior designer. ${basePrompt}`; return basePrompt; };

    const handleGenerate = async () => {
        if (onDeductCredits && userCredits < cost) { onStateChange({ error: `Bạn không đủ credits. Cần ${cost} credits nhưng chỉ còn ${userCredits}. Vui lòng nạp thêm.` }); return; }
        if (!sourceImage) { onStateChange({ error: 'Vui lòng tải lên một hình ảnh phác thảo hoặc không gian.' }); return; }
        if (!customPrompt.trim()) { onStateChange({ error: 'Lời nhắc (prompt) không được để trống.' }); return; }

        onStateChange({ isLoading: true, error: null, resultImages: [], upscaledImage: null });
        setStatusMessage('Đang xử lý. Vui lòng đợi...');
        setUpscaleWarning(null);

        const promptForService = constructInteriorPrompt();
        let jobId: string | null = null;
        let logId: string | null = null;
        
        // Use Flow for all resolutions (Standard, 1K, 2K, 4K)
        const useFlow = true;

        try {
            if (onDeductCredits) { logId = await onDeductCredits(cost, `Render nội thất (${numberOfImages} ảnh) - ${resolution || 'Standard'}`); }
            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId) { jobId = await jobService.createJob({ user_id: user.id, tool_id: Tool.InteriorRendering, prompt: customPrompt, cost: cost, usage_log_id: logId }); }
            if (jobId) await jobService.updateJobStatus(jobId, 'processing');

            if (useFlow) {
                // --- FLOW LOGIC ---
                let aspectEnum = 'IMAGE_ASPECT_RATIO_SQUARE';
                if (aspectRatio === '16:9') aspectEnum = 'IMAGE_ASPECT_RATIO_LANDSCAPE';
                else if (aspectRatio === '9:16') aspectEnum = 'IMAGE_ASPECT_RATIO_PORTRAIT';

                const modelName = resolution === 'Standard' ? "GEM_PIX" : "GEM_PIX_2";
                const collectedUrls: string[] = [];
                let completedCount = 0;
                let lastError: any = null;

                const promises = Array.from({ length: numberOfImages }).map(async (_, index) => {
                    try {
                        setStatusMessage('Đang xử lý. Vui lòng đợi...');
                        
                        const inputImages: FileData[] = [];
                        if (sourceImage) inputImages.push(sourceImage);
                        if (referenceImages && referenceImages.length > 0) inputImages.push(...referenceImages);

                        const result = await externalVideoService.generateFlowImage(
                            promptForService,
                            inputImages,
                            aspectEnum,
                            1,
                            modelName,
                            (msg) => setStatusMessage('Đang xử lý. Vui lòng đợi...')
                        );

                        if (result.imageUrls && result.imageUrls.length > 0) {
                            let finalUrl = result.imageUrls[0];

                            const shouldUpscale = (resolution === '2K' || resolution === '4K') && result.mediaIds && result.mediaIds.length > 0;

                            if (shouldUpscale) {
                                setStatusMessage(resolution === '4K' ? 'Đang xử lý (Upscale 4K)...' : 'Đang xử lý (Upscale 2K)...');
                                try {
                                    const mediaId = result.mediaIds[0];
                                    if (mediaId) {
                                        const targetRes = resolution === '4K' ? 'UPSAMPLE_IMAGE_RESOLUTION_4K' : 'UPSAMPLE_IMAGE_RESOLUTION_2K';
                                        const upscaleResult = await externalVideoService.upscaleFlowImage(mediaId, result.projectId, targetRes);
                                        if (upscaleResult && upscaleResult.imageUrl) {
                                            finalUrl = upscaleResult.imageUrl;
                                        }
                                    }
                                } catch (upscaleErr: any) {
                                    throw new Error(`Lỗi Upscale: ${upscaleErr.message}`);
                                }
                            }
                            
                            collectedUrls.push(finalUrl);
                            completedCount++;
                            onStateChange({ resultImages: [...collectedUrls] });
                            
                            historyService.addToHistory({ tool: Tool.InteriorRendering, prompt: `Flow (${modelName}): ${promptForService}`, sourceImageURL: sourceImage?.objectURL, resultImageURL: finalUrl });
                        }
                    } catch (e: any) {
                        console.error(`Image ${index+1} failed`, e);
                        lastError = e;
                    }
                });

                await Promise.all(promises);
                if (collectedUrls.length === 0) {
                    const errorMsg = lastError ? (lastError.message || lastError.toString()) : "Không thể tạo ảnh nào. Vui lòng thử lại sau.";
                    throw new Error(errorMsg);
                }
                if (jobId && collectedUrls.length > 0) await jobService.updateJobStatus(jobId, 'completed', collectedUrls[0]);

            } else {
                // --- GOOGLE API LOGIC (Fallback) ---
                const promises = Array.from({ length: numberOfImages }).map(async () => {
                    const images = await geminiService.generateHighQualityImage(
                        promptForService, 
                        aspectRatio, 
                        resolution,
                        sourceImage || undefined, 
                        jobId || undefined, 
                        referenceImages
                    );
                    return images[0];
                });
                
                const imageUrls = await Promise.all(promises);
                onStateChange({ resultImages: imageUrls });
                if (jobId && imageUrls.length > 0) await jobService.updateJobStatus(jobId, 'completed', imageUrls[0]);
                
                imageUrls.forEach(url => historyService.addToHistory({ tool: Tool.InteriorRendering, prompt: `Gemini Pro 4K: ${promptForService}`, sourceImageURL: sourceImage?.objectURL, resultImageURL: url, }));
            }

        } catch (err: any) {
            let errorMessage = err.message || 'Đã xảy ra lỗi không mong muốn.';
            if (logId) errorMessage += " (Credits đã được hoàn lại)";
            onStateChange({ error: errorMessage });
            
            if (jobId) await jobService.updateJobStatus(jobId, 'failed', undefined, errorMessage);
            
            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId) await refundCredits(user.id, cost, `Hoàn tiền: Lỗi render nội thất (${errorMessage})`, logId);
        } finally {
            onStateChange({ isLoading: false });
            setStatusMessage(null);
        }
    };

    const handleUpscale = async () => {
        if (resultImages.length !== 1) return;
        onStateChange({ isUpscaling: true, error: null });
        setStatusMessage('Đang xử lý. Vui lòng đợi...');
        try {
            const imageToUpscale = await geminiService.getFileDataFromUrl(resultImages[0]);
            const result = await geminiService.editImage("Upscale this interior design rendering to a high resolution.", imageToUpscale, 1);
            onStateChange({ upscaledImage: result[0].imageUrl });
        } catch (err: any) { onStateChange({ error: err.message || "Failed to upscale image." }); } finally { onStateChange({ isUpscaling: false }); setStatusMessage(null); }
    };
    
    const handleDownload = () => { const url = upscaledImage || (resultImages.length > 0 ? resultImages[0] : null); if (!url) return; const link = document.createElement('a'); link.href = url; link.download = "generated-interior.png"; document.body.appendChild(link); link.click(); document.body.removeChild(link); };
    const handleSendImageToSync = async (imageUrl: string) => { try { const fileData = await geminiService.getFileDataFromUrl(imageUrl); onSendToViewSync(fileData); } catch (e) { onStateChange({ error: "Không thể chuyển ảnh, định dạng không hợp lệ." }); } };

    return (
        <div className="flex flex-col gap-8">
            {previewImage && <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />}
            <div>
                <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">AI Render Nội thất</h2>
                <p className="text-text-secondary dark:text-gray-300 mb-6">Tải lên ảnh phác thảo, mặt bằng hoặc ảnh thực tế của một không gian, AI sẽ giúp bạn hoàn thiện với đầy đủ vật liệu, ánh sáng và đồ đạc.</p>
                
                {/* --- INPUTS --- */}
                <div className="space-y-6 bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700">
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        {/* Image Uploads (Left Column) */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">1. Tải Lên Ảnh Phác Thảo / Không Gian</label>
                                <ImageUpload onFileSelect={handleFileSelect} previewUrl={sourceImage?.objectURL}/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Ảnh Tham Chiếu (Tối đa 5 ảnh)</label>
                                {resolution === 'Standard' ? (
                                    <div className="p-4 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center text-center gap-2 min-h-[120px]">
                                        <span className="material-symbols-outlined text-yellow-500 text-3xl">lock</span>
                                        <p className="text-sm text-text-secondary dark:text-gray-400">
                                            Ảnh tham chiếu chỉ hoạt động ở các bản <span className="font-bold text-text-primary dark:text-white">Nano Pro</span> (1K trở lên).
                                        </p>
                                        <button 
                                            onClick={() => handleResolutionChange('1K')}
                                            className="text-xs text-[#7f13ec] hover:underline font-semibold"
                                        >
                                            Nâng cao chất lượng ảnh ngay
                                        </button>
                                    </div>
                                ) : (
                                    <MultiImageUpload onFilesChange={handleReferenceFilesChange} maxFiles={5} />
                                )}
                            </div>
                        </div>

                        {/* Prompt and Options (Right Column) */}
                         <div className="space-y-4 flex flex-col">
                             <div>
                                <label htmlFor="custom-prompt-interior" className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">2. Mô tả yêu cầu chính</label>
                                <textarea
                                    id="custom-prompt-interior"
                                    rows={4}
                                    className="w-full bg-surface dark:bg-gray-700/50 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-accent focus:outline-none transition-all"
                                    placeholder="Mô tả ý tưởng của bạn ở đây..."
                                    value={customPrompt}
                                    onChange={(e) => onStateChange({ customPrompt: e.target.value })}
                                    disabled={isLoading}
                                />
                             </div>
                            
                            <div className="pt-2">
                                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">3. Tinh chỉnh tùy chọn</label>
                                <div className="space-y-4">
                                    <OptionSelector id="room-type-selector" label="Loại phòng" options={roomTypeOptions} value={roomType} onChange={handleRoomTypeChange} disabled={isLoading} variant="grid" />
                                    <OptionSelector id="style-selector-int" label="Phong cách thiết kế" options={styleOptions} value={style} onChange={handleStyleChange} disabled={isLoading} variant="grid" />
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <OptionSelector id="lighting-selector-int" label="Ánh sáng" options={interiorLightingOptions} value={lighting} onChange={handleLightingChange} disabled={isLoading} variant="select" />
                                        <OptionSelector id="color-palette-selector" label="Tone màu" options={colorPaletteOptions} value={colorPalette} onChange={handleColorPaletteChange} disabled={isLoading} variant="select" />
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
                            disabled={isLoading || !sourceImage || isUpscaling || userCredits < cost}
                            className="w-full flex justify-center items-center gap-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors"
                        >
                           {isLoading ? <><Spinner /> {statusMessage || 'Đang xử lý. Vui lòng đợi...'}</> : 'Bắt đầu Render'}
                        </button>
                    </div>
                    {error && <p className="mt-3 text-sm text-red-500 text-center font-medium">{error}</p>}
                    {upscaleWarning && <p className="mt-3 text-sm text-yellow-500 text-center font-medium bg-yellow-100 dark:bg-yellow-900/20 p-2 rounded">{upscaleWarning}</p>}
                </div>
            </div>

            {/* --- RESULTS VIEW --- */}
             <div>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-text-primary dark:text-white">So sánh Trước & Sau</h3>
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
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2H-2a2 2 0 01-2-2v-2z" />
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
                    {isLoading && (
                        <div className="flex flex-col items-center">
                            <Spinner />
                            <p className="mt-2 text-text-secondary dark:text-gray-400">{statusMessage || 'Đang xử lý. Vui lòng đợi...'}</p>
                        </div>
                    )}
                    {!isLoading && upscaledImage && resultImages.length === 1 && (
                         <ImageComparator originalImage={resultImages[0]} resultImage={upscaledImage} />
                    )}
                    {!isLoading && !upscaledImage && resultImages.length === 1 && sourceImage &&(
                         <ImageComparator originalImage={sourceImage.objectURL} resultImage={resultImages[0]} />
                    )}
                     {!isLoading && resultImages.length > 1 && (
                        <ResultGrid images={resultImages} toolName="interior-render" onSendToViewSync={handleSendImageToSync} />
                    )}
                    {!isLoading && resultImages.length === 0 && (
                        <p className="text-text-secondary dark:text-gray-400 p-4 text-center">{sourceImage ? 'Kết quả render sẽ hiển thị ở đây' : 'Tải lên một ảnh để bắt đầu'}</p>
                    )}
                </div>
              </div>
        </div>
    );
};

export default InteriorGenerator;
