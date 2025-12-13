
import React from 'react';
import { FileData, Tool, ImageResolution } from '../types';
import { RealEstatePosterState } from '../state/toolState';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import Spinner from './Spinner';
import ImageUpload from './common/ImageUpload';
import OptionSelector from './common/OptionSelector';
import ResolutionSelector from './common/ResolutionSelector';

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
    const { prompt, sourceImage, isLoading, error, resultImages, numberOfImages, posterStyle, resolution } = state;
    
    const cost = numberOfImages * 5;

    const handleFileSelect = (fileData: FileData | null) => {
        onStateChange({ sourceImage: fileData, resultImages: [] });
    };

    const handleResolutionChange = (val: ImageResolution) => {
        onStateChange({ resolution: val });
    };

    const handlePresetChange = (selectedValue: string) => {
        // When user selects a preset, populate the prompt area
        onStateChange({ 
            posterStyle: selectedValue as any, // We keep the preset value here to track selection visually
            prompt: selectedValue // And we update the editable prompt area
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

        const fullPrompt = `Create a high-quality real estate marketing poster using the provided property image as the key visual element.
        Instructions: ${prompt}.
        Ensure the output is a single, complete poster design with high resolution and professional graphic layout.`;

        try {
            if (onDeductCredits) {
                await onDeductCredits(cost, `Tạo Poster BDS`);
            }

            let results: { imageUrl: string }[] = [];

            if (resolution === '1K' || resolution === '2K' || resolution === '4K') {
                const promises = Array.from({ length: numberOfImages }).map(async () => {
                    const images = await geminiService.generateHighQualityImage(fullPrompt, '3:4', resolution, sourceImage);
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
                    tool: Tool.RealEstatePoster,
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
            <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">AI Tạo Poster Bất Động Sản</h2>
            <p className="text-text-secondary dark:text-gray-300 -mt-8 mb-6">Tạo poster quảng cáo ấn tượng cho bất động sản của bạn chỉ trong vài giây.</p>

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
                    
                    <ResolutionSelector value={resolution} onChange={handleResolutionChange} disabled={isLoading} />

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || userCredits < cost || !sourceImage}
                        className="w-full flex justify-center items-center gap-3 bg-accent hover:bg-accent-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                        {isLoading ? <><Spinner /> Đang thiết kế...</> : 'Tạo Poster'}
                    </button>
                    {error && <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-500 dark:text-red-300 rounded-lg text-sm">{error}</div>}
                </div>

                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-text-primary dark:text-white">Kết quả Poster</h3>
                    </div>
                    <div className="w-full aspect-[3/4] bg-main-bg dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-border-color dark:border-gray-700 flex items-center justify-center overflow-hidden">
                        {isLoading && <Spinner />}
                        {!isLoading && resultImages.length > 0 && (
                             <img src={resultImages[0]} alt="Poster Result" className="w-full h-full object-contain" />
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

export default RealEstatePoster;
