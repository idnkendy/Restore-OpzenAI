
import React, { useState } from 'react';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import { FileData, Tool, AspectRatio, ImageResolution } from '../types';
import { ViewSyncState } from '../state/toolState';
import Spinner from './Spinner';
import ImageUpload from './common/ImageUpload';
import NumberOfImagesSelector from './common/NumberOfImagesSelector';
import ResultGrid from './common/ResultGrid';
import AspectRatioSelector from './common/AspectRatioSelector';
import OptionSelector from './common/OptionSelector';
import DirectionalModal from './DirectionalModal';
import ResolutionSelector from './common/ResolutionSelector';

// --- Categorized Exterior Views for Combination ---
const perspectiveAngles = [
    { id: 'default', label: 'Mặc định', promptClause: "the same general perspective as the source image" },
    { id: 'front', label: 'Chính diện', promptClause: "a straight-on front elevation view of the building" },
    { id: 'left-side', label: '3/4 Trái', promptClause: "a 3/4 perspective view from the front-left, showing both the front and left facades" },
    { id: 'right-side', label: '3/4 Phải', promptClause: "a 3/4 perspective view from the front-right, showing both the front and right facades" },
    { id: 'wide-frame', label: 'Góc rộng', promptClause: "a view that is zoomed out from the building, showing more of the surrounding environment and context, as if widening the camera frame" },
    { id: 'panoramic', label: 'Panorama', promptClause: "a wide panoramic view of the building, showing its context and surroundings" },
    { id: 'top-down', label: 'Trên cao', promptClause: "a top-down aerial or bird's-eye view of the project" },
    { id: 'low-angle', label: 'Ngước lên', promptClause: "a dramatic low-angle view, looking up from under the main gate or entrance" },
    { id: 'close-up', label: 'Cận cảnh', promptClause: "a close-up or detail view of a significant architectural feature (like the entrance or a unique window design)" },
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
    { id: 'through-window', label: 'Nhìn qua cửa kính quán Cafe đối diện', promptClause: "The building is seen from inside a cozy cafe across the street, looking out through the cafe's large glass window, which creates a framing effect." },
    { id: 'through-flowers', label: 'Nhìn Xuyên qua hàng hoa bên đường', promptClause: "The building is viewed through a foreground of colorful flowers lining the roadside, creating a beautiful and soft framing effect." },
    { id: 'through-car-window', label: 'Nhìn xuyên qua cửa kính xe hơi bên đường', promptClause: "The building is seen from the perspective of looking out from a car parked on the side of the road, with the car's window frame and side mirror creating a dynamic frame." },
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

    const [isDirectionModalOpen, setIsDirectionModalOpen] = useState(false);

    const handleFileSelect = (fileData: FileData | null) => {
        onStateChange({ sourceImage: fileData, resultImages: [], directionImage: null });
    }

    const handleApplyDirection = (direction: FileData) => {
        onStateChange({ directionImage: direction });
        setIsDirectionModalOpen(false);
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
            onStateChange({ error: 'Vui lòng tải lên một ảnh gốc để bắt đầu.' });
            return;
        }
        onStateChange({ isLoading: true, error: null, resultImages: [] });
        const promptParts: string[] = [];

        if (sceneType === 'exterior') {
            const perspective = perspectiveAngles.find(p => p.id === selectedPerspective);
            const atmosphere = atmosphericAngles.find(a => a.id === selectedAtmosphere);
            const framing = framingAngles.find(f => f.id === selectedFraming);
            if (perspective) promptParts.push(`The camera should be positioned for ${perspective.promptClause}.`);
            if (atmosphere && atmosphere.id !== 'default') promptParts.push(`The scene should be rendered ${atmosphere.promptClause}.`);
            if (framing && framing.id !== 'none' && framing.promptClause) promptParts.push(framing.promptClause);
        } else {
            const angle = interiorViewAngles.find(a => a.id === selectedInteriorAngle);
            if (angle) promptParts.push(angle.prompt);
        }
        
        if (customPrompt.trim()) promptParts.push(`Additional instructions: ${customPrompt}.`);
        promptParts.push(`Maintain the core architectural style, materials, and environment from the source image unless otherwise specified.`);
        let combinedPrompt = promptParts.join(' ');
        let promptWithAspectRatio = `${combinedPrompt} The final generated image must strictly have a ${aspectRatio} aspect ratio. Adapt the view to fit this frame naturally; do not add black bars or letterbox.`;

        try {
            // Deduct credits
            if (onDeductCredits) {
                await onDeductCredits(cost, `Đồng bộ view (${numberOfImages} ảnh) - ${resolution}`);
            }

            let results: { imageUrl: string }[] = [];

            // High Quality (Pro) Logic
            if (resolution === '1K' || resolution === '2K' || resolution === '4K') {
                // If there's a direction image, we can't use the specialized editImageWithReference function easily with generateHighQualityImage currently (it takes one image).
                // We will append the instruction to use the direction if available, but rely on text description for the HQ model.
                if (directionImage) {
                    promptWithAspectRatio += " Note: The user drew a directional arrow on a separate layer to indicate the new camera angle. Since that image cannot be processed directly in this mode, prioritize the text description of the new perspective.";
                }

                const promises = Array.from({ length: numberOfImages }).map(async () => {
                    const images = await geminiService.generateHighQualityImage(promptWithAspectRatio, aspectRatio, resolution, sourceImage || undefined);
                    return { imageUrl: images[0] };
                });
                results = await Promise.all(promises);
            } 
            // Standard (Flash) Logic
            else {
                if (directionImage) {
                    const promptWithDirection = `Generate a photorealistic image based on the provided source architectural image. The second image provided contains an arrow indicating the desired new camera direction. Generate the scene from this new perspective, ignoring any other perspective instructions and using the arrow as the primary guide. ${promptWithAspectRatio}`;
                    results = await geminiService.editImageWithReference(promptWithDirection, sourceImage, directionImage, numberOfImages);
                } else {
                    results = await geminiService.editImage(promptWithAspectRatio, sourceImage, numberOfImages);
                }
            }

            const imageUrls = results.map(r => r.imageUrl);
            onStateChange({ resultImages: imageUrls });
            imageUrls.forEach(url => historyService.addToHistory({ tool: Tool.ViewSync, prompt: promptWithAspectRatio, sourceImageURL: sourceImage.objectURL, resultImageURL: url }));
        } catch (err: any) {
            onStateChange({ error: err.message || 'Đã xảy ra lỗi không mong muốn trong quá trình tạo góc nhìn.' });
        } finally {
            onStateChange({ isLoading: false });
        }
    };
    
    const handleDownload = () => {
        if (resultImages.length !== 1) return;
        const link = document.createElement('a');
        link.href = resultImages[0];
        link.download = "synced-view.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div>
            {isDirectionModalOpen && sourceImage && <DirectionalModal image={sourceImage} onClose={() => setIsDirectionModalOpen(false)} onApply={handleApplyDirection} />}
            <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">Đồng Bộ View</h2>
            <p className="text-text-secondary dark:text-gray-300 mb-6">Tải lên một ảnh, sau đó chọn các góc nhìn, ánh sáng, hoặc mô tả tùy chỉnh để tạo ra các phối cảnh mới nhất quán với thiết kế gốc.</p>
            
            {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-500 dark:text-red-300 rounded-lg text-sm">{error}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700">
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">1. Tải Lên Ảnh Gốc</label>
                        <ImageUpload onFileSelect={handleFileSelect} previewUrl={sourceImage?.objectURL} directionPreviewUrl={directionImage?.objectURL} />
                        {sourceImage && (
                            <div className="mt-4">
                                <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">Hoặc chỉ định hướng nhìn trực quan:</p>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setIsDirectionModalOpen(true)} 
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                                        disabled={resolution !== 'Standard'}
                                        title={resolution !== 'Standard' ? "Tính năng vẽ hướng chỉ khả dụng ở chế độ Tiêu chuẩn" : "Vẽ hướng"}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                        {directionImage ? 'Sửa hướng' : 'Vẽ Hướng Cần Tạo'}
                                    </button>
                                    {directionImage && <button onClick={() => onStateChange({ directionImage: null })} className="bg-red-600 hover:bg-red-700 text-white font-semibold p-2 rounded-lg transition-colors" title="Xóa hướng đã vẽ"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>}
                                </div>
                                {directionImage && <p className="text-xs text-green-500 dark:text-green-400 mt-2">Đã áp dụng hướng. Các tùy chọn 'Góc Máy Chính' sẽ bị bỏ qua.</p>}
                                {resolution !== 'Standard' && <p className="text-xs text-yellow-500 mt-1">Lưu ý: Chế độ 2K/4K hiện tại chỉ hỗ trợ mô tả bằng văn bản, không hỗ trợ vẽ hướng mũi tên.</p>}
                            </div>
                        )}
                    </div>
                    <div className="bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700">
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">2. Chọn chế độ</label>
                        <div className="flex items-center gap-2 bg-main-bg dark:bg-gray-800 p-1 rounded-lg">
                            <button onClick={() => onStateChange({ sceneType: 'exterior' })} disabled={isLoading} className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-main-bg dark:focus:ring-offset-gray-800 focus:ring-accent disabled:opacity-50 ${sceneType === 'exterior' ? 'bg-purple-600 text-white shadow' : 'bg-transparent text-text-secondary dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>Ngoại thất</button>
                            <button onClick={() => onStateChange({ sceneType: 'interior' })} disabled={isLoading} className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-main-bg dark:focus:ring-offset-gray-800 focus:ring-accent disabled:opacity-50 ${sceneType === 'interior' ? 'bg-purple-600 text-white shadow' : 'bg-transparent text-text-secondary dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>Nội thất</button>
                        </div>
                    </div>
                    {sceneType === 'exterior' ? (
                        <div className="bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700 space-y-6">
                            <OptionSelector 
                                id="perspective-selector" 
                                label="3. Chọn Góc Máy Chính" 
                                options={perspectiveAngles.map(a => ({ value: a.id, label: a.label }))} 
                                value={selectedPerspective} 
                                onChange={(val) => onStateChange({ selectedPerspective: val, directionImage: null })} 
                                disabled={isLoading || !!directionImage} 
                                variant="grid" 
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <OptionSelector id="atmosphere-selector" label="4. Chọn Ánh Sáng & Thời Tiết" options={atmosphericAngles.map(a => ({ value: a.id, label: a.label }))} value={selectedAtmosphere} onChange={(val) => onStateChange({ selectedAtmosphere: val })} disabled={isLoading} variant="select" />
                                <OptionSelector id="framing-selector" label="5. Chọn Hiệu Ứng Khung Hình" options={framingAngles.map(a => ({ value: a.id, label: a.label }))} value={selectedFraming} onChange={(val) => onStateChange({ selectedFraming: val })} disabled={isLoading} variant="select" />
                            </div>
                        </div>
                    ) : (
                        <div className="bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700 self-start">
                            <OptionSelector id="interior-angle-selector" label="3. Chọn góc nhìn để tạo" options={interiorViewAngles.map(a => ({ value: a.id, label: a.label }))} value={selectedInteriorAngle} onChange={(val) => onStateChange({ selectedInteriorAngle: val })} disabled={isLoading} variant="grid" />
                        </div>
                    )}
                    <div className="bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700 self-start">
                        <label htmlFor="custom-prompt-view-sync" className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">{sceneType === 'exterior' ? '6. Thêm yêu cầu tùy chỉnh (tiếng Việt)' : '4. Thêm yêu cầu tùy chỉnh'}</label>
                        <textarea id="custom-prompt-view-sync" rows={3} className="w-full bg-surface dark:bg-gray-700/50 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-accent focus:outline-none transition-all" placeholder="VD: thêm cây xanh, đổi thành ban đêm, trời mưa..." value={customPrompt} onChange={(e) => onStateChange({ customPrompt: e.target.value })} disabled={isLoading} />
                    </div>
                    <div className="bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700 self-start space-y-4">
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

                     <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800/50 rounded-lg px-4 py-2 mt-2 border border-gray-200 dark:border-gray-700">
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
                    <button onClick={handleGenerate} disabled={isLoading || !sourceImage || userCredits < cost} className="w-full flex justify-center items-center gap-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg">
                        {isLoading ? <><Spinner /> Đang xử lý...</> : 'Tạo Góc Nhìn'}
                    </button>
                    {error && <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-500 dark:text-red-300 rounded-lg text-sm">{error}</div>}
                </div>
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold text-text-primary dark:text-white">Góc Nhìn Đã Tạo (AI)</h3>
                        {resultImages.length === 1 && <button onClick={handleDownload} className="text-center bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 transition-colors rounded-lg text-sm">Tải xuống</button>}
                    </div>
                    <div className="aspect-video bg-main-bg dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-border-color dark:border-gray-700 flex items-center justify-center overflow-hidden">
                        {isLoading && <Spinner />}
                        {!isLoading && resultImages.length > 0 && <ResultGrid images={resultImages} toolName="view-sync" />}
                        {!isLoading && resultImages.length === 0 && <p className="text-text-secondary dark:text-gray-400 p-4 text-center">Kết quả sẽ hiển thị ở đây</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewSync;
