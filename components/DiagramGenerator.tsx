
import React from 'react';
import { FileData, Tool, ImageResolution } from '../types';
import { DiagramGeneratorState } from '../state/toolState';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import { refundCredits } from '../services/paymentService';
import { supabase } from '../services/supabaseClient';
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

const diagramPresets = [
    {
        label: "Phối cảnh phân tầng",
        value: "Tạo một axonometric exploded diagram từ ảnh render này.\nGiữ đúng hình khối và tỷ lệ công trình gốc.\nXây dựng lại mô hình dưới dạng axonometric và tách thành các lớp:\n– mái\n– tầng trên\n– tầng dưới\n– mặt sàn\n– nền/đế\nHiển thị các lớp theo dạng exploded view với đường dẫn chấm thẳng đứng.\nNét mảnh, đồng đều, độ rõ cao, đơn giản hóa chi tiết nhưng giữ đúng hình học.\nThêm nhãn chú thích Mặt bằng tầng 1,2,3 theo thứ tự từ dưới lên.\nKhông thêm chi tiết mới ngoài hình gốc."
    },
    {
        label: "Sơ đồ phân tích kiến trúc",
        value: "Tạo một concept diagram kiến trúc bằng cách vẽ các đường sketch, nét bút chì và ghi chú lên trên ảnh render này.\nGiữ nguyên hình ảnh gốc và thêm các yếu tố diagram như:\n– mũi tên tay vẽ (hand-drawn arrows)\n– vòng cung chỉ hướng\n– ký hiệu ánh sáng, gió, mặt trời\n– ghi chú text ngắn mô tả công năng, hướng gió, ánh sáng, lối vào, khoảng mở\n– khung chữ viết tay (handwritten annotation boxes)\n– đường nét trắng nhẹ, phong cách schematic architectural diagram\n\nPhong cách: giống bản phác thảo kiến trúc sư trên mô hình, nét tự nhiên, mềm, hơi nguệch ngoạc nhưng thẩm mỹ.\nKhông làm thay đổi hình khối công trình trong ảnh gốc.\nKhông thêm chi tiết mới, chỉ overlay diagram lên trên.\nKết quả: một concept architectural diagram đẹp, trực quan, giống bản viết tay minh họa ý tưởng."
    },
    {
        label: "Phối cảnh axonometric",
        value: "Biến ảnh đầu vào thành phong cách biểu diễn kiến trúc dạng diagram. Giữ công trình chính nổi bật với màu sắc vật liệu phong cách technical illustration, đường nét sạch, mô hình hóa theo dạng 3D massing. Render theo phong cách axonometric / isometric.\nLàm mờ và giản lược toàn bộ bối cảnh xung quanh thành các khối trắng tinh, ít chi tiết, viền mảnh. Nhà cửa, đường phố, cây xanh chuyển thành tone trắng – xám nhạt như mô hình study mass.\nTập trung thể hiện rõ hình khối kiến trúc chính, các đường cong, tầng setback, ban công, cửa sổ trình bày bằng các đường line đều và tối giản.\nLoại bỏ texture thực tế, ánh sáng mềm, không đổ bóng mạnh.\nPhong cách tổng thể giống mô hình concept kiến trúc, minimal, clean, high-level design diagram"
    },
    {
        label: "Sơ đồ chú thích kiến trúc",
        value: "Hãy biến bức ảnh tôi cung cấp thành một Architectural Annotation Diagram chi tiết.\nYêu cầu:\n 1. Vẽ overlay đường viền trắng (white outline) lên toàn bộ các chi tiết kiến trúc quan trọng: mái, cột, lan can, bậc tam cấp, tượng đá, phù điêu, đá lát…\n 2. Thêm mũi tên chú thích bằng tiếng Việt + tiếng Anh cho từng bộ phận (song ngữ).\n 3. Tạo icon minh họa line-art màu trắng cho từng loại vật liệu/chi tiết như: ngói, cột đá, phù điêu, đá lát, tượng.\n 4. Mỗi icon đặt cạnh label và có đường line trắng (leader line) dẫn đến vị trí đúng trong ảnh.\n 5. Phong cách minh họa giống kiến trúc kỹ thuật: rõ ràng, sạch sẽ, cân đối, nhẹ nhàng nhưng chính xác.\n 6. Giữ ảnh chụp gốc làm nền, overlay đường viền và label lên trên như bản phân tích kiến trúc.\n 7. Xuất ra ảnh diagram hoàn chỉnh + danh sách chi tiết + mô tả ngắn về phong cách.\n8 lưu ý phải chú thích đúng vật liệu và vị trí."
    }
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

    const handlePresetChange = (selectedValue: string) => {
        // When user selects a preset, populate the prompt area
        onStateChange({ 
            diagramType: selectedValue, // Keep track of selection
            prompt: selectedValue // Fill the prompt area
        });
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

        if (!prompt.trim()) {
            onStateChange({ error: 'Vui lòng chọn loại diagram hoặc nhập mô tả.' });
            return;
        }

        onStateChange({ isLoading: true, error: null, resultImages: [] });

        const fullPrompt = `${prompt} Ensure the output maintains professional architectural diagram aesthetics.`;

        let logId: string | null = null;

        try {
            if (onDeductCredits) {
                logId = await onDeductCredits(cost, `Tạo Diagram (${numberOfImages} ảnh)`);
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
            let errorMessage = err.message || 'Đã xảy ra lỗi không mong muốn.';
            if (logId) {
                errorMessage += " (Credits đã được hoàn lại)";
            }
            onStateChange({ error: errorMessage });

            // Refund logic
            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId && onDeductCredits) {
                await refundCredits(user.id, cost, `Hoàn tiền: Lỗi tạo diagram (${err.message})`);
            }
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
                        label="2. Chọn Loại Diagram (Nhấn để điền nội dung)"
                        options={diagramPresets}
                        value={diagramType}
                        onChange={handlePresetChange}
                        disabled={isLoading}
                        variant="grid"
                    />

                    <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">3. Mô tả chi tiết (Có thể chỉnh sửa)</label>
                        <textarea
                            rows={6}
                            className="w-full bg-surface dark:bg-gray-700/50 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-accent focus:outline-none transition-all"
                            placeholder="Chọn một loại diagram ở trên hoặc tự nhập mô tả..."
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
