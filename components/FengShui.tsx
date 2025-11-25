
import React from 'react';
import { FengShuiState } from '../state/toolState';
import { FileData, Tool, ImageResolution } from '../types';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import ImageUpload from './common/ImageUpload';
import Spinner from './Spinner';
import ImageComparator from './ImageComparator';
import OptionSelector from './common/OptionSelector';
import ResolutionSelector from './common/ResolutionSelector';

interface FengShuiProps {
    state: FengShuiState;
    onStateChange: (newState: Partial<FengShuiState>) => void;
    userCredits?: number;
    onDeductCredits?: (amount: number, description: string) => Promise<string>;
}

const analysisTypes = [
    { id: 'bat-trach', label: 'Bát Trạch' },
    { id: 'am-trach', label: 'Âm Trạch' },
    { id: 'loan-dau', label: 'Loan Đầu' },
    { id: 'duong-trach', label: 'Dương Trạch' },
    { id: 'huyen-khong', label: 'Huyền không' },
    { id: 'than-sat', label: 'Thần Sát' },
    { id: 'xem-tuoi', label: 'Xem Tuổi' },
    { id: 'ngay-gio-tot', label: 'Ngày giờ tốt' },
    { id: 'van-khan', label: 'Văn Khấn' },
    { id: 'mau-sac', label: 'Màu sắc' },
    { id: 'tien-kiep', label: 'Tiền kiếp' },
];

const eventTypes = [
    { value: 'dong-tho', label: 'Động thổ' },
    { value: 'nhap-trach', label: 'Nhập trạch' },
    { value: 'khai-truong', label: 'Khai trương' },
    { value: 'cuoi-hoi', label: 'Cưới hỏi' },
    { value: 'xuat-hanh', label: 'Xuất hành' },
];

const vanKhanTypes = [
    { value: 'dong-tho', label: 'Lễ động thổ (làm móng)' },
    { value: 'cat-noc', label: 'Lễ cất nóc' },
    { value: 'nhap-trach', label: 'Lễ nhập trạch (về nhà mới)' },
    { value: 'sua-chua', label: 'Lễ sửa chữa nhà' },
];

const houseDirections = [
    { value: 'bac-kham', label: 'Bắc (Khảm)' },
    { value: 'dong-bac-can', label: 'Đông Bắc (Cấn)' },
    { value: 'dong-chan', label: 'Đông (Chấn)' },
    { value: 'dong-nam-ton', label: 'Đông Nam (Tốn)' },
    { value: 'nam-ly', label: 'Nam (Ly)' },
    { value: 'tay-nam-khon', label: 'Tây Nam (Khôn)' },
    { value: 'tay-doai', label: 'Tây (Đoài)' },
    { value: 'tay-bac-can', label: 'Tây Bắc (Càn)' },
];

const FengShui: React.FC<FengShuiProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits }) => {
    const { 
        name, birthDay, birthMonth, birthYear, gender, analysisType, 
        floorPlanImage, houseDirection, isLoading, error, resultImage, analysisText,
        deathDay, deathMonth, deathYear, deathHour, 
        spouseName, spouseBirthYear, eldestChildName, eldestChildBirthYear,
        graveDirection, terrainDescription, latitude, longitude,
        kitchenDirection, bedroomDirection, eventType, vanKhanType, resolution
    } = state;

    // Calculate cost based on resolution if image generation is involved
    const getCost = () => {
        if (!floorPlanImage) return 5; // Text only analysis
        switch (resolution) {
            case 'Standard': return 5;
            case '1K': return 15;
            case '2K': return 20;
            case '4K': return 30;
            default: return 5;
        }
    };
    
    const cost = getCost();

    const handleResolutionChange = (val: ImageResolution) => {
        onStateChange({ resolution: val });
    };

    const handleGetLocation = () => {
        if (navigator.geolocation) {
            onStateChange({ isLoading: true, error: null });
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    onStateChange({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        isLoading: false,
                        error: null,
                    });
                },
                (err) => {
                    onStateChange({ error: `Lỗi lấy vị trí: ${err.message}`, isLoading: false });
                }
            );
        } else {
            onStateChange({ error: 'Trình duyệt của bạn không hỗ trợ định vị.' });
        }
    };

    const handleAnalyze = async () => {
        if (onDeductCredits && userCredits < cost) {
            onStateChange({ error: `Bạn không đủ credits. Cần ${cost} credits nhưng chỉ còn ${userCredits}. Vui lòng nạp thêm.` });
            return;
        }

        onStateChange({ isLoading: true, error: null, resultImage: null, analysisText: null });
    
        let prompt = '';

        try {
            // Deduct credits first
            if (onDeductCredits) {
                await onDeductCredits(cost, `Phân tích Phong thủy: ${analysisType} - ${resolution || 'Standard'}`);
            }

            // Helper to process image (Standard or High Quality)
            const processImage = async (p: string) => {
                if (!floorPlanImage) return;
                
                let results: any[] = [];
                
                // High Quality Logic (for drawing detailed diagrams)
                if (resolution === '1K' || resolution === '2K' || resolution === '4K') {
                    const images = await geminiService.generateHighQualityImage(p, '1:1', resolution, floorPlanImage);
                    results = [{ imageUrl: images[0], text: '' }]; // Note: High Quality doesn't return text in same response usually, might need separate call for text
                    
                    // Separate text generation for analysis
                    const analysis = await geminiService.generateText(p + "\n\nCung cấp bài phân tích chi tiết bằng văn bản.");
                    results[0].text = analysis;
                } else {
                    results = await geminiService.editImage(p, floorPlanImage, 1);
                }
                
                return results;
            };

            // --- THAN SAT ---
            if (analysisType === 'than-sat') {
                if (!terrainDescription.trim() && !floorPlanImage) {
                    throw new Error('Vui lòng mô tả hoặc tải lên ảnh về sát khí bạn nghi ngờ.');
                }

                const basePrompt = `Bạn là một chuyên gia Phong Thủy. Hãy phân tích về Thần Sát (Sát khí) dựa trên thông tin được cung cấp.`;
                const descriptionPart = terrainDescription.trim() ? `Mô tả của gia chủ: "${terrainDescription}"` : '';
                
                if (floorPlanImage) {
                    prompt = `${basePrompt}\n${descriptionPart}\n- Có hình ảnh đi kèm để phân tích trực quan.
                    Yêu cầu:
                    1. Dựa vào mô tả và hình ảnh, hãy xác định loại sát khí (ví dụ: Thương sát, Đao trảm sát, Liêm đao sát, Xung bối sát, v.v.).
                    2. Giải thích rõ ràng tác động và ảnh hưởng của loại sát khí này đến ngôi nhà và các thành viên.
                    3. **Tạo một hình ảnh mới** từ ảnh gốc, trong đó **khoanh vùng và chú thích rõ ràng vị trí của sát khí**.
                    4. Cung cấp một **bài phân tích văn bản chi tiết** giải thích các đánh dấu trên hình và đưa ra các **phương pháp hóa giải cụ thể, khả thi** (ví dụ: dùng gương bát quái, trồng cây, treo rèm, v.v.).`;

                    const result = await processImage(prompt);
                    if (result && result.length > 0) {
                        onStateChange({ resultImage: result[0].imageUrl, analysisText: result[0].text });
                    }
                } else {
                    prompt = `${basePrompt}\n${descriptionPart}
                    Yêu cầu:
                    1. Dựa vào mô tả, hãy xác định các loại sát khí có thể có.
                    2. Giải thích rõ ràng tác động và ảnh hưởng của từng loại sát khí này.
                    3. Đưa ra các phương pháp hóa giải cụ thể, khả thi cho từng trường hợp.`;
                    const textResult = await geminiService.generateText(prompt);
                    onStateChange({ analysisText: textResult });
                }
            }
            // --- HUYEN KHONG ---
            else if (analysisType === 'huyen-khong') {
                if (!floorPlanImage) throw new Error('Vui lòng tải lên mặt bằng để phân tích.');
                if (!birthYear) throw new Error('Vui lòng nhập năm xây dựng.');
                
                prompt = `Bạn là một bậc thầy Phong Thủy. Hãy lập sơ đồ Huyền Không Phi Tinh cho mặt bằng được cung cấp.
                Thông tin:
                - Hướng nhà: ${houseDirections.find(d => d.value === houseDirection)?.label}
                - Năm xây dựng (dương lịch): ${birthYear}
        
                Yêu cầu:
                1. Tạo một hình ảnh mới từ mặt bằng gốc. Trong hình ảnh mới, hãy **vẽ sơ đồ phi tinh bàn** của ngôi nhà. Sơ đồ phải hiển thị cửu cung, sơn tinh, hướng tinh, và vận tinh một cách rõ ràng và trực quan trên mặt bằng.
                2. Cung cấp một bài phân tích chi tiết bằng văn bản tiếng Việt, giải thích ý nghĩa của các sao tại mỗi cung và ảnh hưởng của chúng (cát/hung), kèm theo các gợi ý hóa giải hoặc kích hoạt.`;
        
                const result = await processImage(prompt);
                if (result && result.length > 0) {
                    onStateChange({ resultImage: result[0].imageUrl, analysisText: result[0].text });
                }
            }
            // --- NGAY GIO TOT ---
            else if (analysisType === 'ngay-gio-tot') {
                if (!birthYear) throw new Error('Vui lòng nhập năm sinh gia chủ.');
                const eventLabel = eventTypes.find(e => e.value === eventType)?.label || 'làm việc đại sự';
                prompt = `Bạn là một chuyên gia xem ngày lành tháng tốt. Hãy tìm ngày giờ tốt để ${eventLabel} cho gia chủ.
        
                Thông tin gia chủ:
                - Giới tính: ${gender === 'male' ? 'Nam' : 'Nữ'}
                - Năm sinh âm lịch: ${birthYear}
        
                Yêu cầu:
                Phân tích và đưa ra một danh sách các ngày giờ tốt nhất trong vòng 3 tháng tới (kể từ ngày hiện tại) để thực hiện việc "${eventLabel}".
                Với mỗi ngày tốt, hãy liệt kê rõ:
                1. Ngày dương lịch và ngày âm lịch.
                2. Các giờ hoàng đạo (giờ tốt) trong ngày.
                3. Luận giải ngắn gọn tại sao ngày/giờ đó tốt cho tuổi của gia chủ và công việc cụ thể này.
                4. Những tuổi xung khắc cần tránh trong ngày đó.`;

                const textResult = await geminiService.generateText(prompt);
                onStateChange({ analysisText: textResult });
            }
            // --- VAN KHAN ---
            else if (analysisType === 'van-khan') {
                const vanKhanLabel = vanKhanTypes.find(v => v.value === vanKhanType)?.label || 'sự kiện';
                prompt = `Bạn là một chuyên gia về văn khấn cổ truyền Việt Nam. Hãy soạn một bài văn khấn đầy đủ và chi tiết cho "${vanKhanLabel}" cho gia chủ.

                Thông tin gia chủ (nếu có):
                - Tên: ${name || '(gia chủ)'}
                - Giới tính: ${gender === 'male' ? 'Nam' : 'Nữ'}
                - Năm sinh âm lịch: ${birthYear || '(không rõ)'}

                Yêu cầu:
                1. Soạn bài văn khấn trang trọng, đúng nghi lễ, câu từ thành kính.
                2. Liệt kê danh sách các lễ vật cần chuẩn bị cho mâm cúng.
                3. Hướng dẫn các bước tiến hành nghi lễ một cách ngắn gọn, dễ hiểu.`;

                const textResult = await geminiService.generateText(prompt);
                onStateChange({ analysisText: textResult });
            }
            // --- LOAN DAU ---
            else if (analysisType === 'loan-dau') {
                prompt = `Bạn là một chuyên gia phong thủy, hãy thực hiện phân tích Loan Đầu (địa hình, địa thế) dựa trên các thông tin sau:\n- Mô tả: ${terrainDescription || 'Không có'}`;
                if (latitude && longitude) {
                    prompt += `\n- Vị trí địa lý (vĩ độ, kinh độ): ${latitude}, ${longitude}. Hãy sử dụng thông tin này để phân tích địa thế xung quanh qua bản đồ (ví dụ: sông, núi, đường đi, các công trình lân cận).`;
                }
                
                if (floorPlanImage) {
                    prompt += `\n- Hình ảnh công trình/khu đất được cung cấp.\n\nYêu cầu:\n1. Phân tích các yếu tố Loan Đầu: long mạch, sa, thủy, huyệt, minh đường, thanh long, bạch hổ, chu tước, huyền vũ dựa trên hình ảnh và mô tả.\n2. Đánh giá cát hung của thế đất.\n3. Vẽ trực tiếp lên ảnh các yếu tố quan trọng (dòng khí, hướng nước, vị trí tốt xấu) nếu có thể.`;
                    const result = await processImage(prompt);
                    if (result && result.length > 0) {
                        onStateChange({ resultImage: result[0].imageUrl, analysisText: result[0].text });
                    }
                } else {
                    prompt += `\n\nYêu cầu:\n1. Phân tích các yếu tố Loan Đầu dựa trên mô tả.\n2. Đánh giá cát hung và đưa ra lời khuyên.`;
                    const textResult = await geminiService.generateText(prompt);
                    onStateChange({ analysisText: textResult });
                }
            }
            // --- BAT TRACH / DEFAULT ---
            else {
                prompt = `Bạn là một chuyên gia Phong Thủy. Thực hiện phân tích ${analysisTypes.find(t => t.id === analysisType)?.label}.
                Thông tin gia chủ:
                - Năm sinh: ${birthYear}
                - Giới tính: ${gender}
                - Hướng nhà: ${houseDirections.find(d => d.value === houseDirection)?.label}
                
                Yêu cầu: Phân tích chi tiết về cát hung, các hướng tốt xấu, và gợi ý bố trí phong thủy.`;

                if (floorPlanImage) {
                    prompt += " Dựa trên mặt bằng được cung cấp, hãy vẽ đè lên ảnh các khu vực Cát/Hung theo Bát Trạch.";
                    const result = await processImage(prompt);
                    if (result && result.length > 0) {
                        onStateChange({ resultImage: result[0].imageUrl, analysisText: result[0].text });
                    }
                } else {
                    const textResult = await geminiService.generateText(prompt);
                    onStateChange({ analysisText: textResult });
                }
            }

            // History recording
            historyService.addToHistory({
                tool: Tool.FengShui,
                prompt: `Phân tích Phong thủy: ${analysisType}`,
                sourceImageURL: floorPlanImage?.objectURL,
                resultImageURL: state.resultImage || undefined,
            });

        } catch (err: any) {
            onStateChange({ error: err.message || "Đã xảy ra lỗi khi phân tích." });
        } finally {
            onStateChange({ isLoading: false });
        }
    };

    const handleDownload = () => {
        if (!resultImage) return;
        const link = document.createElement('a');
        link.href = resultImage;
        link.download = `feng-shui-analysis-${analysisType}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileSelect = (fileData: FileData | null) => {
        onStateChange({ floorPlanImage: fileData, resultImage: null, analysisText: null });
    };

    return (
        <div className="flex flex-col gap-8">
            <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">Chuyên gia Phong Thủy AI</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COLUMN - INPUTS */}
                <div className="lg:col-span-1 space-y-6 bg-surface dark:bg-dark-bg p-6 rounded-xl border border-border-color dark:border-gray-700 h-fit">
                    <OptionSelector 
                        id="analysis-type"
                        label="Loại phân tích"
                        options={analysisTypes.map(t => ({ value: t.id, label: t.label }))}
                        value={analysisType}
                        onChange={(val) => onStateChange({ analysisType: val })}
                        variant="select"
                    />

                    {/* DYNAMIC INPUT FIELDS BASED ON TYPE */}
                    {['bat-trach', 'duong-trach', 'ngay-gio-tot', 'xem-tuoi', 'mau-sac', 'van-khan'].includes(analysisType) && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Năm sinh (Dương lịch)</label>
                                <input 
                                    type="number" 
                                    value={birthYear} 
                                    onChange={(e) => onStateChange({ birthYear: e.target.value })}
                                    className="w-full bg-main-bg dark:bg-gray-700 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-white focus:ring-2 focus:ring-accent outline-none transition-all"
                                    placeholder="VD: 1990"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Giới tính</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center space-x-2 text-text-primary dark:text-white cursor-pointer">
                                        <input type="radio" name="gender" value="male" checked={gender === 'male'} onChange={() => onStateChange({ gender: 'male' })} className="text-accent focus:ring-accent" />
                                        <span>Nam</span>
                                    </label>
                                    <label className="flex items-center space-x-2 text-text-primary dark:text-white cursor-pointer">
                                        <input type="radio" name="gender" value="female" checked={gender === 'female'} onChange={() => onStateChange({ gender: 'female' })} className="text-accent focus:ring-accent" />
                                        <span>Nữ</span>
                                    </label>
                                </div>
                            </div>
                        </>
                    )}

                    {analysisType === 'ngay-gio-tot' && (
                         <OptionSelector 
                            id="event-type" 
                            label="Công việc cần làm" 
                            options={eventTypes} 
                            value={eventType} 
                            onChange={(val) => onStateChange({ eventType: val })}
                            variant="select"
                         />
                    )}

                    {analysisType === 'van-khan' && (
                         <OptionSelector 
                            id="vankhan-type" 
                            label="Loại lễ cúng" 
                            options={vanKhanTypes} 
                            value={vanKhanType} 
                            onChange={(val) => onStateChange({ vanKhanType: val })} 
                            variant="select"
                         />
                    )}

                    {['bat-trach', 'huyen-khong', 'duong-trach'].includes(analysisType) && (
                         <OptionSelector 
                            id="house-direction" 
                            label="Hướng nhà" 
                            options={houseDirections} 
                            value={houseDirection} 
                            onChange={(val) => onStateChange({ houseDirection: val })}
                            variant="grid" 
                         />
                    )}
                    
                    {['huyen-khong'].includes(analysisType) && (
                         <div>
                            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Năm xây dựng/Nhập trạch</label>
                            <input 
                                type="number" 
                                value={birthYear} 
                                onChange={(e) => onStateChange({ birthYear: e.target.value })}
                                className="w-full bg-main-bg dark:bg-gray-700 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-white focus:ring-2 focus:ring-accent outline-none transition-all"
                                placeholder="VD: 2024"
                            />
                        </div>
                    )}

                    {['loan-dau', 'than-sat'].includes(analysisType) && (
                        <div>
                            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Mô tả địa thế / Sát khí</label>
                            <textarea 
                                rows={4}
                                value={terrainDescription} 
                                onChange={(e) => onStateChange({ terrainDescription: e.target.value })}
                                className="w-full bg-main-bg dark:bg-gray-700 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-white focus:ring-2 focus:ring-accent outline-none transition-all"
                                placeholder="Mô tả những gì bạn thấy xung quanh: đường đâm thẳng vào nhà, cột điện trước cửa, ao hồ sau nhà..."
                            />
                             <button 
                                onClick={handleGetLocation}
                                className="mt-2 text-xs text-blue-500 hover:underline flex items-center gap-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                Lấy vị trí hiện tại (GPS)
                            </button>
                            {latitude && <p className="text-xs text-green-500 mt-1">Đã lấy tọa độ: {latitude.toFixed(4)}, {longitude?.toFixed(4)}</p>}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                            {['loan-dau', 'than-sat'].includes(analysisType) ? 'Ảnh chụp hiện trạng (Tùy chọn)' : 'Ảnh mặt bằng (Tùy chọn)'}
                        </label>
                        <ImageUpload onFileSelect={handleFileSelect} previewUrl={floorPlanImage?.objectURL} />
                    </div>
                    
                    {floorPlanImage && (
                        <div>
                            <ResolutionSelector value={resolution} onChange={handleResolutionChange} disabled={isLoading} />
                        </div>
                    )}

                    {/* Credits Cost Bar */}
                    <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800/50 rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-sm text-text-secondary dark:text-gray-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Chi phí: <span className="font-bold text-text-primary dark:text-white">{cost} Credits</span></span>
                        </div>
                        <div className="text-xs">
                            {userCredits < cost ? (
                                <span className="text-red-500 font-semibold">Không đủ</span>
                            ) : (
                                <span className="text-green-600 dark:text-green-400">Đủ điều kiện</span>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleAnalyze}
                        disabled={isLoading || userCredits < cost}
                        className="w-full flex justify-center items-center gap-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                        {isLoading ? <><Spinner /> Đang luận giải...</> : 'Bắt đầu Phân tích'}
                    </button>
                     {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-500 dark:text-red-300 rounded-lg text-sm">{error}</div>}
                </div>

                {/* RIGHT COLUMN - RESULTS */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-surface dark:bg-dark-bg p-6 rounded-xl border border-border-color dark:border-gray-700 min-h-[400px]">
                        <h3 className="text-xl font-bold text-text-primary dark:text-white mb-4">Kết quả Luận giải</h3>
                        
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                <Spinner />
                                <p className="mt-4">Thầy phong thủy AI đang tính toán...</p>
                            </div>
                        ) : (!resultImage && !analysisText) ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                </svg>
                                <p>Kết quả phân tích sẽ hiển thị ở đây.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {resultImage && (
                                    <div className="relative rounded-lg overflow-hidden border border-border-color dark:border-gray-600">
                                         {floorPlanImage ? (
                                            <ImageComparator originalImage={floorPlanImage.objectURL} resultImage={resultImage} />
                                        ) : (
                                            <img src={resultImage} alt="Feng Shui Result" className="w-full object-contain" />
                                        )}
                                        <button 
                                            onClick={handleDownload}
                                            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                                            title="Tải ảnh về"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        </button>
                                    </div>
                                )}
                                {analysisText && (
                                    <div className="prose dark:prose-invert max-w-none bg-main-bg dark:bg-gray-700/30 p-4 rounded-lg">
                                        <div className="whitespace-pre-wrap text-sm leading-relaxed">{analysisText}</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FengShui;
