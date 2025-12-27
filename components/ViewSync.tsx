
import React, { useState } from 'react';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import * as jobService from '../services/jobService';
import * as externalVideoService from '../services/externalVideoService'; // Flow Import
import { FileData, Tool, AspectRatio, ImageResolution } from '../types';
import { ViewSyncState } from '../state/toolState';
import { refundCredits } from '../services/paymentService';
import { supabase } from '../services/supabaseClient';
import Spinner from './Spinner';
import ImageUpload from './common/ImageUpload';
import NumberOfImagesSelector from './common/NumberOfImagesSelector';
import ResultGrid from './common/ResultGrid';
import AspectRatioSelector from './common/AspectRatioSelector';
import OptionSelector from './common/OptionSelector';
import ResolutionSelector from './common/ResolutionSelector';

const perspectiveAngles = [
    { id: 'default', label: 'Mặc định', promptClause: "the same general perspective as the source image" },
    { id: 'front', label: 'Chính diện', promptClause: "Straight-on front elevation view, symmetrical composition. Flat facade focusing on geometric shapes and materials." },
    { id: 'left-side', label: '3/4 Trái', promptClause: "a 3/4 perspective view from the front-left, showing depth and dimension of the building massing." },
    { id: 'right-side', label: '3/4 Phải', promptClause: "a 3/4 perspective view from the front-right, showing both the front and right facades" },
    { id: 'wide-frame', label: 'Góc rộng', promptClause: "Wide-angle shot capturing the building within its surrounding context and landscape. Spacious atmosphere, expanded field of view." },
    { id: 'panoramic', label: 'Panorama', promptClause: "Panoramic view, ultra-wide horizontal composition. Capturing the entire landscape and building context in a single frame. Cinematic wide shot." },
    { id: 'top-down', label: 'Trên cao', promptClause: "Aerial bird's-eye view looking down from above. Drone photography showing the roof plan, site layout, and surrounding environment. Masterplan visualization." },
    { id: 'low-angle', label: 'Ngước lên', promptClause: "Low angle worm's-eye view looking up at the building. Imposing and majestic stature against the sky. Dramatic perspective emphasizing height." },
    { id: 'close-up', label: 'Cận cảnh', promptClause: "Macro close-up shot of architectural details. Focus on textures, materials, and intricate facade elements. Shallow depth of field, blurred background." },
];

const atmosphericAngles = [
    { id: 'default', label: 'Mặc định', promptClause: "with standard daylight lighting" },
    { id: 'early-morning', label: 'Sáng sớm', promptClause: "in the early morning, with soft, gentle sunrise light and long shadows" },
    { id: 'midday-sun', label: 'Trưa nắng', promptClause: "at midday under bright, direct sunlight with strong, short shadows" },
    { id: 'late-afternoon', label: 'Chiều tà', promptClause: "during the late afternoon (golden hour), with warm, orange-hued light and long, dramatic shadows" },
    { id: 'night', label: 'Ban đêm', promptClause: "at night, with interior and exterior lights turned on" },
    { id: 'rainy', label: 'Trời mưa', promptClause: "during a gentle rain, with wet surfaces and a slightly overcast sky" },
    { id: 'misty', label: 'Sương mù', promptClause: "on a misty or foggy morning, creating a soft and mysterious atmosphere" },
    { id: 'after-rain', label: 'Sau mưa', promptClause: "just after a rain shower, with wet ground reflecting the sky and surroundings, and a sense of freshness in the air" },
];

const framingAngles = [
    { id: 'none', label: 'Không có hiệu ứng', promptClause: "" },
    { id: 'through-trees', label: 'Xuyên qua hàng cây', promptClause: "The building is seen through a foreground of trees or foliage, creating a natural framing effect." },
    { id: 'through-window', label: 'Nhìn qua cửa kính Cafe', promptClause: "The building is seen from inside a cozy cafe across the street, looking out through the cafe's large glass window, which creates a framing effect." },
    { id: 'through-flowers', label: 'Xuyên qua hàng hoa', promptClause: "The building is viewed through a foreground of colorful flowers lining the roadside, creating a beautiful and soft framing effect." },
    { id: 'through-car-window', label: 'Qua cửa kính xe hơi', promptClause: "The building is seen from the perspective of looking out from a car parked on the side of the road, with the car's window frame and side mirror creating a dynamic frame." },
];

const interiorViewAngles = [
    { id: 'default', label: 'Mặc định', prompt: "Maintain the same camera perspective as the source image." },
    { id: 'wide-angle', label: 'Góc rộng', prompt: "Generate a wide-angle view of the interior space, capturing as much of the room as possible. Maintain the same design style, furniture, and materials as the uploaded image." },
    { id: 'from-corner', label: 'Từ góc phòng', prompt: "Generate a view from a corner of the room, looking towards the center. Maintain the same design style, furniture, and materials as the uploaded image." },
    { id: 'detail-shot', label: 'Cận cảnh', prompt: "Generate a close-up detail shot of a key furniture piece or decorative element. Maintain the same design style, furniture, and materials as the uploaded image." },
    { id: 'towards-window', label: 'Nhìn ra cửa sổ', prompt: "Generate a view from inside the room looking towards the main window, showing the natural light. Maintain the same design style, furniture, and materials as the uploaded image." },
    { id: 'night-view', label: 'Ban đêm', prompt: "Generate a view of the interior space at night, with artificial lighting turned on (lamps, ceiling lights). Maintain the same design style, furniture, and materials as the uploaded image." },
    { id: 'top-down-interior', label: 'Từ trên xuống', prompt: "Generate a top-down view of the room's layout, similar to a 3D floor plan. Maintain the same design style, furniture, and materials as the uploaded image." },
];

interface ViewSyncProps {
    state: ViewSyncState;
    onStateChange: (newState: Partial<ViewSyncState>) => void;
    userCredits?: number;
    onDeductCredits?: (amount: number, description: string) => Promise<string>;
}

const ViewSync: React.FC<ViewSyncProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits }) => {
    const {
        sourceImage, directionImage, isLoading, error, resultImages, numberOfImages, sceneType,
        aspectRatio, customPrompt, selectedPerspective, selectedAtmosphere,
        selectedFraming, selectedInteriorAngle, resolution
    } = state;

    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [upscaleWarning, setUpscaleWarning] = useState<string | null>(null);

    const getCostPerImage = () => {
        switch (resolution) {
            case 'Standard': return 5;
            case '1K': return 10;
            case '2K': return 20;
            case '4K': return 30;
            default: return 5;
        }
    };
    const cost = numberOfImages * getCostPerImage();

    const handleResolutionChange = (val: ImageResolution) => {
        onStateChange({ resolution: val });
        // Nếu chuyển về Standard, xóa ảnh hướng dẫn (dù không còn UI vẽ nhưng vẫn clear state cho sạch)
        if (val === 'Standard') {
            onStateChange({ directionImage: null });
        }
    };

    const handleGenerate = async () => {
        if (onDeductCredits && userCredits < cost) {
             onStateChange({ error: `Bạn không đủ credits. Cần ${cost} credits.` });
             return;
        }

        if (!sourceImage) {
            onStateChange({ error: 'Vui lòng tải lên một ảnh gốc để bắt đầu.' });
            return;
        }
        onStateChange({ isLoading: true, error: null, resultImages: [] });
        setStatusMessage('Đang phân tích góc nhìn...');
        setUpscaleWarning(null);

        let logId: string | null = null;
        let jobId: string | null = null;

        // Use Flow for all resolutions (Standard, 1K, 2K, 4K).
        const useFlow = true;

        try {
            if (onDeductCredits) {
                logId = await onDeductCredits(cost, `Đồng bộ view (${numberOfImages} ảnh) - ${resolution}`);
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId) {
                jobId = await jobService.createJob({
                    user_id: user.id,
                    tool_id: Tool.ViewSync,
                    prompt: customPrompt || 'Synced view rendering',
                    cost: cost,
                    usage_log_id: logId
                });
            }

            if (jobId) await jobService.updateJobStatus(jobId, 'processing');

            const promptParts = [];
            const atmosphere = atmosphericAngles.find(a => a.id === selectedAtmosphere);
            const framing = framingAngles.find(f => f.id === selectedFraming);
            
            // Build Prompt based on Scene Type
            if (sceneType === 'interior') {
                const interiorAngle = interiorViewAngles.find(a => a.id === selectedInteriorAngle);
                if (interiorAngle && interiorAngle.id !== 'default') {
                    promptParts.push(interiorAngle.prompt);
                }
            } else {
                const perspective = perspectiveAngles.find(p => p.id === selectedPerspective);
                if (perspective && perspective.id !== 'default') {
                    promptParts.push(`${perspective.promptClause}`);
                }
            }

            if (framing && framing.id !== 'none') {
                promptParts.push(framing.promptClause);
            }

            if (atmosphere && atmosphere.id !== 'default') {
                promptParts.push(`Render it ${atmosphere.promptClause}`);
            }

            if (customPrompt) promptParts.push(customPrompt);
            
            // Base prompt construction
            let finalPrompt = "";
            if (promptParts.length > 0) {
                finalPrompt = `Based on the building design in the reference image, ${promptParts.join(', ')}.`;
            } else {
                finalPrompt = "Enhance the quality and clarity of this view. Maintain the exact same architectural style and content.";
            }
            
            finalPrompt += ` The image is based on the provided reference design, preserving all original architectural details and materials. Photorealistic architectural photography.`;

            let imageUrls: string[] = [];

            if (useFlow) {
                // --- FLOW LOGIC ---
                let aspectEnum = 'IMAGE_ASPECT_RATIO_SQUARE';
                if (aspectRatio === '16:9') aspectEnum = 'IMAGE_ASPECT_RATIO_LANDSCAPE';
                else if (aspectRatio === '9:16') aspectEnum = 'IMAGE_ASPECT_RATIO_PORTRAIT';

                const modelName = resolution === 'Standard' ? "GEM_PIX" : "GEM_PIX_2";
                const collectedUrls: string[] = [];
                const inputImages: FileData[] = [sourceImage];
                if (directionImage) inputImages.push(directionImage);

                let lastError: any = null;

                const promises = Array.from({ length: numberOfImages }).map(async (_, index) => {
                    try {
                        setStatusMessage('Đang xử lý. Vui lòng đợi...');
                        const result = await externalVideoService.generateFlowImage(
                            finalPrompt,
                            inputImages,
                            aspectEnum,
                            1,
                            modelName,
                            (msg) => setStatusMessage('Đang xử lý. Vui lòng đợi...')
                        );

                        if (result.imageUrls && result.imageUrls.length > 0) {
                            let finalUrl = result.imageUrls[0];

                            // Upscale Check
                            const shouldUpscale = (resolution === '2K' || resolution === '4K') && result.mediaIds && result.mediaIds.length > 0;
                            if (shouldUpscale) {
                                setStatusMessage(resolution === '4K' ? 'Đang xử lý (Upscale 4K)...' : 'Đang xử lý (Upscale 2K)...');
                                try {
                                    const mediaId = result.mediaIds[0];
                                    if (mediaId) {
                                        const targetRes = resolution === '4K' ? 'UPSAMPLE_IMAGE_RESOLUTION_4K' : 'UPSAMPLE_IMAGE_RESOLUTION_2K';
                                        const upscaleRes = await externalVideoService.upscaleFlowImage(mediaId, result.projectId, targetRes);
                                        if (upscaleRes?.imageUrl) finalUrl = upscaleRes.imageUrl;
                                    }
                                } catch (e: any) {
                                    throw new Error(`Lỗi Upscale: ${e.message}`);
                                }
                            }
                            
                            collectedUrls.push(finalUrl);
                            onStateChange({ resultImages: [...collectedUrls] });
                            
                            historyService.addToHistory({ 
                                tool: Tool.ViewSync, 
                                prompt: `Flow (${modelName}): ${finalPrompt}`, 
                                sourceImageURL: sourceImage.objectURL, 
                                resultImageURL: finalUrl 
                            });
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
                imageUrls = collectedUrls;

            } else {
                // --- GOOGLE GEMINI API LOGIC (Fallback) ---
                setStatusMessage('Đang xử lý với Gemini Pro 4K...');
                const promises = Array.from({ length: numberOfImages }).map(async () => {
                    const images = await geminiService.generateHighQualityImage(
                        finalPrompt, 
                        aspectRatio, 
                        resolution, // 4K
                        sourceImage, 
                        jobId || undefined,
                        directionImage ? [directionImage] : undefined 
                    );
                    return images[0];
                });
                imageUrls = await Promise.all(promises);
                onStateChange({ resultImages: imageUrls });
                
                imageUrls.forEach(url => historyService.addToHistory({ 
                    tool: Tool.ViewSync, 
                    prompt: `Gemini Pro 4K: ${finalPrompt}`, 
                    sourceImageURL: sourceImage.objectURL, 
                    resultImageURL: url 
                }));
            }

            if (jobId && imageUrls.length > 0) await jobService.updateJobStatus(jobId, 'completed', imageUrls[0]);
            
        } catch (err: any) {
            let errorMessage = err.message || "Lỗi xử lý.";
            if (logId) errorMessage += " (Credits đã hoàn lại)";
            onStateChange({ error: errorMessage });
            
            if (jobId) await jobService.updateJobStatus(jobId, 'failed', undefined, err.message);
            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId && onDeductCredits) {
                await refundCredits(user.id, cost, `Hoàn tiền: Lỗi đồng bộ view (${err.message})`, logId);
            }
        } finally {
            onStateChange({ isLoading: false });
            setStatusMessage(null);
        }
    };
    
    const handleFileSelect = (fileData: FileData | null) => onStateChange({ sourceImage: fileData, resultImages: [], directionImage: null });

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Đồng Bộ View</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div className="bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border">
                        <label className="block text-sm font-medium mb-2">1. Tải Lên Ảnh Gốc</label>
                        <ImageUpload onFileSelect={handleFileSelect} previewUrl={sourceImage?.objectURL} />
                    </div>
                    <div className="bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border space-y-4">
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">2. Tùy chỉnh góc nhìn</label>
                        
                        {/* Scene Type Switcher */}
                        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-4">
                            <button 
                                onClick={() => onStateChange({ sceneType: 'exterior' })}
                                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                    sceneType === 'exterior' || !sceneType // Default to exterior if undefined
                                        ? 'bg-white dark:bg-gray-600 shadow text-text-primary dark:text-white' 
                                        : 'text-text-secondary dark:text-gray-400 hover:text-text-primary'
                                }`}
                            >
                                Ngoại thất
                            </button>
                            <button 
                                onClick={() => onStateChange({ sceneType: 'interior' })}
                                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                    sceneType === 'interior' 
                                        ? 'bg-white dark:bg-gray-600 shadow text-text-primary dark:text-white' 
                                        : 'text-text-secondary dark:text-gray-400 hover:text-text-primary'
                                }`}
                            >
                                Nội thất
                            </button>
                        </div>

                        {/* Dynamic Angle Selector based on Scene Type */}
                        {(sceneType === 'exterior' || !sceneType) ? (
                            <OptionSelector 
                                id="perspective" 
                                label="Chọn Góc Máy Ngoại Thất" 
                                options={perspectiveAngles.map(a => ({ value: a.id, label: a.label }))} 
                                value={selectedPerspective} 
                                onChange={(val) => onStateChange({ selectedPerspective: val })} 
                                variant="grid" 
                                disabled={!!directionImage || isLoading} 
                            />
                        ) : (
                            <OptionSelector 
                                id="interior-angle" 
                                label="Chọn Góc Máy Nội Thất" 
                                options={interiorViewAngles.map(a => ({ value: a.id, label: a.label }))} 
                                value={selectedInteriorAngle} 
                                onChange={(val) => onStateChange({ selectedInteriorAngle: val })} 
                                variant="grid" 
                                disabled={!!directionImage || isLoading} 
                            />
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <OptionSelector 
                                id="framing" 
                                label="Hiệu ứng khung hình" 
                                options={framingAngles.map(a => ({ value: a.id, label: a.label }))} 
                                value={selectedFraming} 
                                onChange={(val) => onStateChange({ selectedFraming: val })} 
                                variant="select" 
                                disabled={isLoading} 
                            />
                            <OptionSelector 
                                id="atmosphere" 
                                label="Thời gian / Không khí" 
                                options={atmosphericAngles.map(a => ({ value: a.id, label: a.label }))} 
                                value={selectedAtmosphere} 
                                onChange={(val) => onStateChange({ selectedAtmosphere: val })} 
                                variant="select" 
                                disabled={isLoading} 
                            />
                        </div>

                        <textarea 
                            rows={3} 
                            className="w-full bg-surface dark:bg-gray-700/50 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent outline-none transition-all" 
                            placeholder="Mô tả thêm (ví dụ: trời nắng đẹp, nhiều cây xanh)..." 
                            value={customPrompt} 
                            onChange={(e) => onStateChange({ customPrompt: e.target.value })} 
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <NumberOfImagesSelector value={numberOfImages} onChange={(val) => onStateChange({ numberOfImages: val })} />
                            <AspectRatioSelector value={aspectRatio} onChange={(val) => onStateChange({ aspectRatio: val })} />
                        </div>
                        <ResolutionSelector value={resolution} onChange={handleResolutionChange} />
                        
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

                        <button onClick={handleGenerate} disabled={isLoading || !sourceImage || userCredits < cost} className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors flex justify-center items-center gap-2 shadow-lg">
                            {isLoading ? <><Spinner /> {statusMessage || 'Đang xử lý...'}</> : 'Tạo Góc Nhìn'}
                        </button>
                        {upscaleWarning && <p className="mt-2 text-xs text-yellow-500 text-center">{upscaleWarning}</p>}
                    </div>
                </div>
                <div className="aspect-video bg-main-bg dark:bg-gray-800/50 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden">
                    {isLoading ? (
                        <div className="flex flex-col items-center">
                            <Spinner />
                            <p className="mt-2 text-text-secondary dark:text-gray-400">{statusMessage || 'Đang xử lý...'}</p>
                        </div>
                    ) : resultImages.length > 0 ? <ResultGrid images={resultImages} toolName="view-sync" /> : <p className="text-gray-400">Kết quả sẽ hiển thị ở đây</p>}
                </div>
            </div>
        </div>
    );
};

export default ViewSync;
