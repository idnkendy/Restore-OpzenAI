
import React, { useState } from 'react';
import { FileData, Tool, ImageResolution, AspectRatio } from '../types';
import { MaterialSwapperState } from '../state/toolState';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import * as jobService from '../services/jobService';
import { refundCredits } from '../services/paymentService';
import { supabase } from '../services/supabaseClient';
import Spinner from './Spinner';
import ImageUpload from './common/ImageUpload';
import ImageComparator from './ImageComparator';
import NumberOfImagesSelector from './common/NumberOfImagesSelector';
import ResultGrid from './common/ResultGrid';
import ImagePreviewModal from './common/ImagePreviewModal';
import ResolutionSelector from './common/ResolutionSelector';

interface MaterialSwapperProps {
    state: MaterialSwapperState;
    onStateChange: (newState: Partial<MaterialSwapperState>) => void;
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

const MaterialSwapper: React.FC<MaterialSwapperProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits }) => {
    const { prompt, sceneImage, materialImage, isLoading, error, resultImages, numberOfImages, resolution } = state;
    const [previewImage, setPreviewImage] = useState<string | null>(null);
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
    
    const cost = numberOfImages * getCostPerImage();

    const handleResolutionChange = (val: ImageResolution) => {
        onStateChange({ resolution: val });
    };

    const handleGenerate = async () => {
        if (onDeductCredits && userCredits < cost) {
             onStateChange({ error: `Bạn không đủ credits. Cần ${cost} credits nhưng chỉ còn ${userCredits}. Vui lòng nạp thêm.` });
             return;
        }

        if (!prompt) {
            onStateChange({ error: 'Vui lòng nhập mô tả yêu cầu.' });
            return;
        }
        if (!sceneImage) {
            onStateChange({ error: 'Vui lòng tải lên ảnh không gian.' });
            return;
        }
        if (!materialImage) {
            onStateChange({ error: 'Vui lòng tải lên ảnh vật liệu hoặc nội thất tham khảo.' });
            return;
        }

        onStateChange({ isLoading: true, error: null, resultImages: [] });

        let jobId: string | null = null;
        let logId: string | null = null;

        try {
             if (onDeductCredits) {
                logId = await onDeductCredits(cost, `Thay vật liệu (${numberOfImages} ảnh) - ${resolution}`);
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId) {
                 jobId = await jobService.createJob({
                    user_id: user.id,
                    tool_id: Tool.MaterialSwap,
                    prompt: prompt,
                    cost: cost,
                    usage_log_id: logId
                });
            }

            if (logId && !jobId) {
                throw new Error("Không thể khởi tạo tác vụ (Job Creation Failed). Đang hoàn tiền...");
            }

            if (jobId) await jobService.updateJobStatus(jobId, 'processing');

            let results: { imageUrl: string }[] = [];

            // High Quality (Pro) Logic
            if (resolution === '1K' || resolution === '2K' || resolution === '4K') {
                const promises = Array.from({ length: numberOfImages }).map(async () => {
                    // Use materialImage as referenceImage
                    const images = await geminiService.generateHighQualityImage(
                        prompt, 
                        detectedAspectRatio, // Use detected ratio
                        resolution, 
                        sceneImage, 
                        jobId || undefined, 
                        [materialImage]
                    );
                    return { imageUrl: images[0] };
                });
                results = await Promise.all(promises);
            }
            // Standard (Flash) Logic
            else {
                results = await geminiService.editImageWithReference(prompt, sceneImage, materialImage, numberOfImages, jobId || undefined);
            }

            const imageUrls = results.map(r => r.imageUrl);
            onStateChange({ resultImages: imageUrls });

            if (jobId && imageUrls.length > 0) {
                await jobService.updateJobStatus(jobId, 'completed', imageUrls[0]);
            }

            imageUrls.forEach(url => {
                 historyService.addToHistory({
                    tool: Tool.MaterialSwap,
                    prompt: prompt,
                    sourceImageURL: sceneImage.objectURL,
                    resultImageURL: url,
                });
            });

        } catch (err: any) {
            // SIMPLIFIED ERROR DISPLAY
            onStateChange({ error: err.message });

            if (jobId) {
                await jobService.updateJobStatus(jobId, 'failed', undefined, err.message);
            }
            
            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId) {
               await refundCredits(user.id, cost, `Hoàn tiền: Lỗi khi thay vật liệu (${err.message})`);
            }
        } finally {
            onStateChange({ isLoading: false });
        }
    };

    const handleSceneFileSelect = (fileData: FileData | null) => {
        if (fileData?.objectURL) {
            const img = new Image();
            img.onload = () => {
                setDetectedAspectRatio(getClosestAspectRatio(img.width, img.height));
            };
            img.src = fileData.objectURL;
        }
        onStateChange({ sceneImage: fileData, resultImages: [] });
    };
    
    const handleMaterialFileSelect = (fileData: FileData | null) => {
        onStateChange({ materialImage: fileData });
    };

    const handleDownload = () => {
        if (resultImages.length !== 1) return;
        const link = document.createElement('a');
        link.href = resultImages[0];
        link.download = "material