
import React, { useState } from 'react';
import { FileData, Tool, ImageResolution, AspectRatio } from '../types';
import { RealEstatePosterState } from '../state/toolState';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import * as jobService from '../services/jobService';
import * as externalVideoService from '../services/externalVideoService'; // Flow Import
import { refundCredits } from '../services/paymentService';
import { supabase } from '../services/supabaseClient';
import Spinner from './Spinner';
import ImageUpload from './common/ImageUpload';
import OptionSelector from './common/OptionSelector';
import ResolutionSelector from './common/ResolutionSelector';
import ImagePreviewModal from './common/ImagePreviewModal';
import AspectRatioSelector from './common/AspectRatioSelector';
import NumberOfImagesSelector from './common/NumberOfImagesSelector';

interface RealEstatePosterProps {
    state: RealEstatePosterState;
    onStateChange: (newState: Partial<RealEstatePosterState>) => void;
    userCredits?: number;
    onDeductCredits?: (amount: number, description: string) => Promise<string>;
}

const posterPresets = [
    {
        label: "Poster Infographic Tiện ích",
        value: "Hãy tạo một poster bất động sản cao cấp theo đúng phong cách infographic như hình mẫu:\n• Hình dự án ở dưới, chiếm 40–50% poster\n• Phía trên là danh sách tiện ích xung quanh dạng cột đứng có ảnh minh họa và số thứ tự\n• Typography sang trọng, sắc nét, mô phỏng phong cách thiết kế cao cấp quốc tế.\n\nYÊU CẦU BỐ CỤC:\n 1. Khu tiện ích (phần trên poster)\n\n • Tạo 4–6 ô tiện ích dạng hình chữ nhật đứng.\n • Mỗi ô gồm:\n• ảnh minh họa tiện ích\n• số thứ tự (01–05)\n• tiêu đề tiện ích\n• mô tả ngắn 1 dòng\n • Các ô xếp thành hàng ngang, có hiệu ứng phát sáng nhẹ.\n\n 2. Khu hình dự án\n\n • Đặt hình dự án lớn ở phần dưới poster.\n • Tăng độ sáng – độ trong – hiệu ứng ánh đèn vàng warm.\n • Giữ đúng đường nét công trình.\n\n 3. Tiêu đề chính\n\n • Text sang trọng:\nĐÓN ĐẦU NGUỒN KHÁCH DỒI DÀO QUANH NĂM\n • Hoặc AI tự đề xuất tiêu đề phù hợp.\n\n 4. Tagline dự án\n\n • Ví dụ:\nTỌA ĐỘ GIAO THƯƠNG ĐẮT GIÁ – BỨT PHÁ TIỀM NĂNG KINH DOANH\n • Font serif hoặc sans-serif luxury.\n\n 5. Logo & branding\n\n • Đặt logo dự án phía dưới phải.\n • Tông màu vàng gold / trắng.\n\n 6. Màu sắc & phong cách\n\n • Tone xanh–nâu–xám sang trọng.\n • Ánh sáng mềm, mang cảm giác cao cấp.\n • Dùng hiệu ứng chiều sâu và transition mượt giữa phần trên & dưới.\n\nOUTPUT\n\n• 1 poster hoàn chỉnh theo layout giống hình tôi gửi\n• Có tiện ích → hình dự án → tagline → logo\n• Bố cục đẹp, rõ, sang trọng — dùng được ngay cho marketing BĐS."
    },
    {
        label: "Poster Luxury Hiện đại",
        value: "Hãy tạo một Poster Bất động sản chuyên nghiệp từ bức ảnh tòa nhà tôi cung cấp, theo phong cách hiện đại – sang trọng như các poster dự án cao cấp.\nYêu cầu:\n\n1. Thiết kế tổng thể\n • Nền gradient tối – xanh navy hoặc xanh đêm.\n • Phía dưới là hình tòa nhà (ảnh gốc) được làm sáng, nổi bật, tăng độ sắc nét.\n • Hiệu ứng ánh sáng vàng sang trọng trên các cửa kính.\n\n2. Bố cục thông tin\n • Tiêu đề lớn, nổi bật ở trung tâm poster:\nWHERE LUXURY MEETS LOCATION (hoặc tùy chỉnh theo ảnh)\n • Dòng mô tả nhỏ phía dưới: 3 & 4 BHK Prime Residencies hoặc nội dung phù hợp.\n\n3. Icon tiện ích xung quanh\n\nTạo các vòng tròn icon kết nối bằng nét đứt:\n • Hospital\n • Educational Institutions\n • Shopping Mall\n • Restaurants\n • Upcoming Highway\n(hoặc tự động nhận diện và tạo icon phù hợp với ảnh)\n\n4. Logo dự án\n • Thêm logo/mẫu logo ở chính giữa phía dưới (tự thiết kế dạng monogram sang trọng nếu ảnh không có logo).\n • Tông màu vàng hoặc trắng.\n\n5. Footer thông tin\n • Đặt thông tin liên hệ, hotline, địa chỉ ở cuối poster.\n • Typography hiện đại, dễ đọc.\n\n6. Phong cách\n • Luxury\n • Clean, minimal nhưng ấn tượng\n • Ánh sáng cinematic\n • Layout cân đối giống poster BĐS cao cấp quốc tế.\n\nHãy xuất ra 1 Poster hoàn chỉnh với bố cục đẹp, rõ ràng, mang tính thương mại và phù hợp marketing bất động sản."
    }
];

const RealEstatePoster: React.FC<RealEstatePosterProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits }) => {
    const { prompt, sourceImage, isLoading, error, resultImages, numberOfImages, posterStyle, resolution, aspectRatio } = state;
    const [previewImage, setPreviewImage] = useState<string | null>(null);
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

    const handleFileSelect = (fileData: FileData | null) => {
        onStateChange({ sourceImage: fileData, resultImages: [] });
    };

    const handleResolutionChange = (val: ImageResolution) => {
        onStateChange({ resolution: val });
    };

    const handlePresetChange = (selectedValue: string) => {
        onStateChange({ 
            posterStyle: selectedValue as any,
            prompt: selectedValue 
        });
    };

    const handleGenerate = async () => {
        if (onDeductCredits && userCredits < cost) {
             onStateChange({ error: `Bạn không đủ credits. Cần ${cost} credits.` });
             return;
        }

        if (!sourceImage) {
            onStateChange({ error: 'Vui lòng tải lên ảnh bất động sản.' });
            return;
        }

        if (!prompt.trim()) {
            onStateChange({ error: 'Vui lòng nhập yêu cầu hoặc chọn mẫu.' });
            return;
        }

        onStateChange({ isLoading: true, error: null, resultImages: [] });
        setStatusMessage('Đang thiết kế...');
        setUpscaleWarning(null);

        const fullPrompt = `Create a high-quality real estate marketing poster. Instructions: ${prompt}.`;
        
        // Use Flow for ALL resolutions
        const useFlow = true;
        let logId: string | null = null;
        let jobId: string | null = null;

        try {
            if (onDeductCredits) {
                logId = await onDeductCredits(cost, `Tạo Poster BDS (${numberOfImages} ảnh) - ${resolution}`);
            }
            
            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId) {
                jobId = await jobService.createJob({
                    user_id: user.id,
                    tool_id: Tool.RealEstatePoster,
                    prompt: fullPrompt,
                    cost: cost,
                    usage_log_id: logId
                });
            }
            if (jobId) await jobService.updateJobStatus(jobId, 'processing');

            let imageUrls: string[] = [];

            if (useFlow) {
                // --- FLOW LOGIC ---
                let aspectEnum = 'IMAGE_ASPECT_RATIO_SQUARE';
                if (aspectRatio === '16:9' ) aspectEnum = 'IMAGE_ASPECT_RATIO_LANDSCAPE';
                else if (aspectRatio === '9:16' ) aspectEnum = 'IMAGE_ASPECT_RATIO_PORTRAIT';

                const modelName = resolution === 'Standard' ? "GEM_PIX" : "GEM_PIX_2";
                const collectedUrls: string[] = [];
                let lastError: any = null;

                const promises = Array.from({ length: numberOfImages }).map(async (_, index) => {
                    try {
                        setStatusMessage('Đang xử lý. Vui lòng đợi...');
                        const result = await externalVideoService.generateFlowImage(
                            fullPrompt, 
                            [sourceImage], 
                            aspectEnum, 
                            1, 
                            modelName, 
                            (msg) => setStatusMessage('Đang xử lý. Vui lòng đợi...')
                        );
                        
                        if (result.imageUrls && result.imageUrls.length > 0) {
                            let finalUrl = result.imageUrls[0];
                            
                            // Upscale Check (2K or 4K)
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
                                tool: Tool.RealEstatePoster, 
                                prompt: `Flow (${modelName}): ${fullPrompt}`, 
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
                // Fallback (Not reached with useFlow=true)
                setStatusMessage('Đang xử lý. Vui lòng đợi...');
                const promises = Array.from({ length: numberOfImages }).map(async () => {
                    const images = await geminiService.generateHighQualityImage(fullPrompt, aspectRatio, resolution, sourceImage, jobId || undefined);
                    return images[0];
                });
                imageUrls = await Promise.all(promises);
                onStateChange({ resultImages: imageUrls });
                imageUrls.forEach(url => historyService.addToHistory({ tool: Tool.RealEstatePoster, prompt: fullPrompt, sourceImageURL: sourceImage.objectURL, resultImageURL: url }));
            }

            if (jobId && imageUrls.length > 0) await jobService.updateJobStatus(jobId, 'completed', imageUrls[0]);

        } catch (err: any) {
            let msg = err.message;
            if (logId) msg += " (Credits đã hoàn lại)";
            onStateChange({ error: msg });
            if (jobId) await jobService.updateJobStatus(jobId, 'failed', undefined, msg);
            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId && onDeductCredits) await refundCredits(user.id, cost, `Hoàn tiền: Lỗi poster (${err.message})`, logId);
        } finally {
            onStateChange({ isLoading: false });
            setStatusMessage(null);
        }
    };

    const handleDownload = () => {
        if (resultImages.length === 0) return;
        const link = document.createElement('a');
        link.href = resultImages[0];
        link.download = `real-estate-poster-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col gap-8">
            {previewImage && <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />}
            
            <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">AI Tạo Poster Bất Động Sản</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6 bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">1. Tải Lên Ảnh Bất Động Sản</label>
                        <ImageUpload onFileSelect={handleFileSelect} previewUrl={sourceImage?.objectURL} />
                    </div>
                    
                    <OptionSelector 
                        id="poster-style"
                        label="2. Chọn Mẫu Poster (Nhấn để điền nội dung)"
                        options={posterPresets}
                        value={posterStyle}
                        onChange={handlePresetChange}
                        disabled={isLoading}
                        variant="grid"
                    />

                    <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">3. Thông tin hiển thị (Có thể chỉnh sửa)</label>
                        <textarea
                            rows={8}
                            className="w-full bg-surface dark:bg-gray-700/50 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-accent focus:outline-none transition-all"
                            placeholder="Mô tả chi tiết poster bạn muốn tạo..."
                            value={prompt}
                            onChange={(e) => onStateChange({ prompt: e.target.value })}
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <NumberOfImagesSelector value={numberOfImages} onChange={(val) => onStateChange({ numberOfImages: val })} disabled={isLoading} />
                        </div>
                        <div>
                            <AspectRatioSelector value={aspectRatio} onChange={(val) => onStateChange({ aspectRatio: val })} disabled={isLoading} />
                        </div>
                    </div>
                    
                    <ResolutionSelector value={resolution} onChange={handleResolutionChange} disabled={isLoading} />

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || userCredits < cost || !sourceImage}
                        className="w-full flex justify-center items-center gap-2 bg-accent hover:bg-accent-600 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg"
                    >
                        {isLoading ? <><Spinner /> {statusMessage || 'Đang thiết kế...'}</> : 'Tạo Poster'}
                    </button>
                    {error && <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">{error}</div>}
                    {upscaleWarning && <div className="text-xs text-yellow-500 text-center">{upscaleWarning}</div>}
                </div>

                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-text-primary dark:text-white">Kết quả Poster</h3>
                        {resultImages.length > 0 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPreviewImage(resultImages[0])}
                                    className="p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-text-primary dark:text-white transition-colors"
                                    title="Phóng to"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                    </svg>
                                </button>
                                <button 
                                    onClick={handleDownload} 
                                    className="flex items-center gap-2 bg-[#7f13ec] hover:bg-[#690fca] text-white px-3 py-1.5 rounded-lg font-bold shadow-lg text-sm transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    <span>Tải xuống</span>
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="w-full aspect-[3/4] bg-main-bg dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-border-color dark:border-gray-700 flex items-center justify-center overflow-hidden">
                        {isLoading ? (
                            <div className="flex flex-col items-center">
                                <Spinner />
                                <p className="mt-2 text-gray-400">{statusMessage}</p>
                            </div>
                        ) : resultImages.length > 0 ? (
                             <img src={resultImages[0]} alt="Poster Result" className="w-full h-full object-contain" />
                        ) : (
                             <p className="text-text-secondary dark:text-gray-400 text-center p-4">Kết quả sẽ hiển thị ở đây.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RealEstatePoster;
