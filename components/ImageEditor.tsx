
import React, { useState } from 'react';
import { FileData, Tool, ImageResolution, AspectRatio } from '../types';
import { ImageEditorState } from '../state/toolState';
import * as geminiService from '../services/geminiService';
import * as historyService from '../services/historyService';
import * as externalVideoService from '../services/externalVideoService'; // Import externalVideoService
import { refundCredits } from '../services/paymentService'; 
import { supabase } from '../services/supabaseClient'; 
import * as jobService from '../services/jobService'; // Added import
import Spinner from './Spinner';
import ImageUpload from './common/ImageUpload';
import ResultGrid from './common/ResultGrid';
import NumberOfImagesSelector from './common/NumberOfImagesSelector';
import MaskingModal from './MaskingModal';
import ImageComparator from './ImageComparator';
import ImagePreviewModal from './common/ImagePreviewModal';
import MultiImageUpload from './common/MultiImageUpload';
import ResolutionSelector from './common/ResolutionSelector';
import AspectRatioSelector from './common/AspectRatioSelector';

interface ImageEditorProps {
    state: ImageEditorState;
    onStateChange: (newState: Partial<ImageEditorState>) => void;
    userCredits?: number;
    onDeductCredits?: (amount: number, description: string) => Promise<string>;
}

// Helper to merge source and mask into a single composite image
const createCompositeImage = async (source: FileData, mask: FileData): Promise<FileData> => {
    return new Promise((resolve, reject) => {
        const imgSource = new Image();
        const imgMask = new Image();
        imgSource.crossOrigin = "Anonymous";
        imgMask.crossOrigin = "Anonymous";

        imgSource.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = imgSource.width;
            canvas.height = imgSource.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Canvas context error"));
                return;
            }
            
            // Draw Source
            ctx.drawImage(imgSource, 0, 0);

            imgMask.onload = () => {
                // Draw Mask Overlay
                ctx.drawImage(imgMask, 0, 0, canvas.width, canvas.height);
                
                const dataUrl = canvas.toDataURL('image/png');
                resolve({
                    base64: dataUrl.split(',')[1],
                    mimeType: 'image/png',
                    objectURL: dataUrl
                });
            };
            imgMask.onerror = (e) => reject(new Error("Failed to load mask image"));
            imgMask.src = mask.objectURL;
        };
        imgSource.onerror = (e) => reject(new Error("Failed to load source image"));
        imgSource.src = source.objectURL;
    });
};

const getClosestAspectRatio = (width: number, height: number): AspectRatio => {
    const ratio = width / height;
    const ratios: { [key in AspectRatio]: number } = {
        "1:1": 1,
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

const ImageEditor: React.FC<ImageEditorProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits }) => {
    const { prompt, sourceImage, maskImage, referenceImages, isLoading, error, resultImages, numberOfImages, resolution, aspectRatio } = state;
    
    const [isMaskingModalOpen, setIsMaskingModalOpen] = useState<boolean>(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [upscaleWarning, setUpscaleWarning] = useState<string | null>(null);


    const handleFileSelect = (fileData: FileData | null) => {
        if (fileData?.objectURL) {
            const img = new Image();
            img.onload = () => {
                const detected = getClosestAspectRatio(img.width, img.height);
                onStateChange({
                    sourceImage: fileData,
                    resultImages: [],
                    maskImage: null,
                    aspectRatio: detected // Auto-detect and set ratio
                });
            };
            img.src = fileData.objectURL;
        } else {
            onStateChange({
                sourceImage: fileData,
                resultImages: [],
                maskImage: null,
            });
        }
    };

    const handleReferenceFilesChange = (files: FileData[]) => {
        onStateChange({ referenceImages: files });
    };

    // Calculate cost based on resolution
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
    };

    const handleGenerate = async () => {
        if (onDeductCredits && userCredits < cost) {
             onStateChange({ error: `Bạn không đủ credits. Cần ${cost} credits nhưng chỉ còn ${userCredits}. Vui lòng nạp thêm.` });
             return;
        }

        if (!prompt) {
            onStateChange({ error: 'Vui lòng nhập mô tả yêu cầu chỉnh sửa.' });
            return;
        }
        if (!sourceImage) {
            onStateChange({ error: 'Vui lòng tải lên một ảnh để chỉnh sửa.' });
            return;
        }

        onStateChange({ isLoading: true, error: null, resultImages: [] });
        setStatusMessage('Đang phân tích yêu cầu...');
        setUpscaleWarning(null);

        let logId: string | null = null;
        let jobId: string | null = null;

        // Use Flow for ALL resolutions
        const useFlow = true;

        // Use selected Aspect Ratio
        const effectiveAspectRatio = aspectRatio || '1:1';

        try {
            if (onDeductCredits) {
                logId = await onDeductCredits(cost, `Chỉnh sửa ảnh (${numberOfImages} ảnh) - ${resolution}`);
            }
            
            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId) {
                jobId = await jobService.createJob({
                    user_id: user.id,
                    tool_id: Tool.ImageEditing,
                    prompt: prompt,
                    cost: cost,
                    usage_log_id: logId
                });
            }

            if (jobId) await jobService.updateJobStatus(jobId, 'processing');

            let imageUrls: string[] = [];

            if (useFlow) {
                // --- FLOW LOGIC ---
                
                let aspectEnum = 'IMAGE_ASPECT_RATIO_SQUARE';
                if (effectiveAspectRatio === '16:9') aspectEnum = 'IMAGE_ASPECT_RATIO_LANDSCAPE';
                else if (effectiveAspectRatio === '9:16') aspectEnum = 'IMAGE_ASPECT_RATIO_PORTRAIT';

                const modelName = resolution === 'Standard' ? "GEM_PIX" : "GEM_PIX_2";
                
                // Construct prompt for Flow
                let flowPrompt = `Edit this image. ${prompt}. Keep the main composition but apply the changes described. Ensure aspect ratio is ${effectiveAspectRatio}.`;
                
                // Input Images Logic
                let inputImages: FileData[] = [sourceImage];
                
                if (maskImage) {
                     try {
                         // MERGE SOURCE AND MASK into one composite image
                         const compositeImage = await createCompositeImage(sourceImage, maskImage);
                         
                         // Update Prompt to instruct model about the two images
                         flowPrompt = `I have provided two images. 
                         1. The first image is the original. 
                         2. The second image shows the original with a RED MASK overlay indicating the area to edit.
                         
                         TASK: Edit the area covered by the RED MASK in the original image based on this instruction: "${prompt}".
                         Ensure the edit blends seamlessly with the surrounding environment, matching lighting, shadows, and perspective.`;
                         
                         // Send Original + Composite
                         inputImages = [sourceImage, compositeImage];
                     } catch (e) {
                         console.error("Composite creation failed, falling back to source + mask", e);
                         flowPrompt = `Edit the first image based on the second mask image (white area is the edit zone). Instruction: ${prompt}. Seamlessly blended with the environment, matching perspective and lighting.`;
                         inputImages.push(maskImage);
                     }
                }
                
                if (referenceImages.length > 0) {
                    inputImages.push(...referenceImages);
                }

                const collectedUrls: string[] = [];
                let completedCount = 0;
                let lastError: any = null;

                const promises = Array.from({ length: numberOfImages }).map(async (_, index) => {
                    try {
                        setStatusMessage(`[1/2] Đang xử lý (${modelName})... (${index + 1}/${numberOfImages})`);
                        
                        const result = await externalVideoService.generateFlowImage(
                            flowPrompt,
                            inputImages, 
                            aspectEnum,
                            1,
                            modelName,
                            (msg) => setStatusMessage(msg)
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
                            setStatusMessage(`Hoàn tất ${completedCount}/${numberOfImages}`);
                            
                            historyService.addToHistory({
                                tool: Tool.ImageEditing,
                                prompt: `Flow (${modelName}): ${flowPrompt}`,
                                sourceImageURL: sourceImage?.objectURL,
                                resultImageURL: finalUrl,
                            });
                        }
                    } catch (e: any) {
                        console.error(`Image ${index+1} failed`, e);
                        lastError = e;
                    }
                });

                await Promise.all(promises);
                imageUrls = collectedUrls;
                if (collectedUrls.length === 0) {
                    const errorMsg = lastError ? (lastError.message || lastError.toString()) : "Không thể tạo ảnh nào. Vui lòng thử lại sau.";
                    throw new Error(errorMsg);
                }

            } else {
                // Fallback (Not reached with useFlow=true)
                const results = await geminiService.editImage(prompt, sourceImage, numberOfImages);
                imageUrls = results.map(r => r.imageUrl);
                onStateChange({ resultImages: imageUrls });
            }

            if (jobId && imageUrls.length > 0) await jobService.updateJobStatus(jobId, 'completed', imageUrls[0]);

        } catch (err: any) {
            let errorMessage = err.message || 'Đã xảy ra lỗi không mong muốn.';
            if (logId) {
                errorMessage += " (Credits đã được hoàn lại)";
            }
            onStateChange({ error: errorMessage });

            if (jobId) await jobService.updateJobStatus(jobId, 'failed', undefined, errorMessage);

            // Refund logic
            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId && onDeductCredits) {
                await refundCredits(user.id, cost, `Hoàn tiền: Lỗi chỉnh sửa ảnh (${err.message})`, logId);
            }
        } finally {
            onStateChange({ isLoading: false });
            setStatusMessage(null);
        }
    };

    const handleApplyMask = (mask: FileData) => {
        onStateChange({ maskImage: mask });
        setIsMaskingModalOpen(false);
    };

    const handleRemoveMask = (e?: React.MouseEvent) => {
        if(e) e.preventDefault();
        onStateChange({ maskImage: null });
    };

    const handleDownload = () => {
        if (resultImages.length !== 1) return;
        const link = document.createElement('a');
        link.href = resultImages[0];
        link.download = "edited-image.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const scrollToTop = () => {
        const mainContainer = document.querySelector('main');
        if (mainContainer) {
            mainContainer.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div>
            {previewImage && <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />}
            {isMaskingModalOpen && sourceImage && (
                <MaskingModal
                    image={sourceImage}
                    onClose={() => setIsMaskingModalOpen(false)}
                    onApply={handleApplyMask}
                    maskColor="rgba(239, 68, 68, 0.5)" // Red mask with 50% opacity
                />
            )}
            <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">AI Chỉnh Sửa Ảnh</h2>
            <p className="text-text-secondary dark:text-gray-300 mb-6">Tải lên một bức ảnh và mô tả những thay đổi bạn muốn. Bạn cũng có thể dùng công cụ mask để chỉ định vùng cần chỉnh sửa.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* --- INPUTS --- */}
                <div className="space-y-6 flex flex-col">
                    <div className="bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700">
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">1. Tải Lên Ảnh Gốc</label>
                        <ImageUpload 
                            onFileSelect={handleFileSelect} 
                            previewUrl={sourceImage?.objectURL}
                            maskPreviewUrl={maskImage?.objectURL} // Pass mask here for overlay
                        />
                         {sourceImage && (
                            <div className="mt-4">
                                <p className="text-sm text-text-secondary dark:text-gray-400 mb-2">Tùy chọn vùng chọn:</p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={(e) => { 
                                            e.preventDefault(); 
                                            setIsMaskingModalOpen(true); 
                                            scrollToTop(); // Force scroll to top
                                        }}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                                        title="Vẽ vùng chọn"
                                    >
                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                        {maskImage ? 'Sửa vùng chọn' : 'Vẽ vùng chọn (Mask)'}
                                    </button>
                                    {maskImage && (
                                        <button
                                            type="button"
                                            onClick={handleRemoveMask}
                                            className="bg-red-600 hover:bg-red-700 text-white font-semibold p-2 rounded-lg transition-colors"
                                            title="Xóa vùng chọn"
                                        >
                                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                        </button>
                                    )}
                                </div>
                                {maskImage && <p className="text-xs text-green-500 dark:text-green-400 mt-2">Đã áp dụng vùng chọn. AI sẽ chỉ chỉnh sửa trong vùng này.</p>}
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700">
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">2. Ảnh Tham Chiếu (Tùy chọn)</label>
                        {resolution === 'Standard' && !maskImage ? (
                             <div className="p-4 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center text-center gap-2 min-h-[120px]">
                                <span className="material-symbols-outlined text-yellow-500 text-3xl">lock</span>
                                <p className="text-sm text-text-secondary dark:text-gray-400">
                                    Ảnh tham chiếu chỉ hoạt động ở các bản <span className="font-bold text-text-primary dark:text-white">Nano Pro</span> (1K trở lên) hoặc khi dùng Mask.
                                </p>
                                <button 
                                    onClick={() => handleResolutionChange('1K')}
                                    className="text-xs text-[#7f13ec] hover:underline font-semibold"
                                >
                                    Nâng cao chất lượng ảnh ngay
                                </button>
                            </div>
                        ) : (
                            <>
                                <MultiImageUpload onFilesChange={handleReferenceFilesChange} maxFiles={5} />
                                <p className="text-xs text-text-secondary dark:text-gray-500 mt-2">Tải lên tối đa 5 ảnh để AI tham khảo phong cách hoặc chi tiết.</p>
                            </>
                        )}
                    </div>
                </div>

                {/* --- CONTROLS --- */}
                 <div className="space-y-6 flex flex-col h-full">
                     <div className="bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700 flex-grow flex flex-col">
                         <label htmlFor="prompt-editor" className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">3. Mô tả thay đổi mong muốn</label>
                         <textarea
                            id="prompt-editor"
                            rows={6}
                            className="w-full bg-surface dark:bg-gray-700/50 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-accent focus:outline-none transition-all flex-grow"
                            placeholder="VD: Thay đổi màu sơn tường thành màu kem, thêm cây xanh vào góc phòng, làm cho ánh sáng ấm áp hơn..."
                            value={prompt}
                            onChange={(e) => onStateChange({ prompt: e.target.value })}
                        />
                     </div>
                     
                     <div className="bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700">
                         <div className="grid grid-cols-2 gap-4">
                            <NumberOfImagesSelector value={numberOfImages} onChange={(val) => onStateChange({ numberOfImages: val })} disabled={isLoading} />
                            <AspectRatioSelector value={aspectRatio || '1:1'} onChange={(val) => onStateChange({ aspectRatio: val })} disabled={isLoading} />
                         </div>
                     </div>

                     <div className="bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700">
                         <ResolutionSelector value={resolution} onChange={handleResolutionChange} disabled={isLoading} />
                     </div>
                    
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
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !sourceImage || !prompt || userCredits < cost}
                        className="w-full flex justify-center items-center gap-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                        {isLoading ? <><Spinner /> {statusMessage || 'Đang xử lý...'}</> : 'Bắt đầu Chỉnh sửa'}
                    </button>
                    {error && <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-500 dark:text-red-300 rounded-lg text-sm">{error}</div>}
                    {upscaleWarning && <p className="mt-2 text-xs text-yellow-500 text-center">{upscaleWarning}</p>}
                 </div>
            </div>

            {/* --- RESULTS --- */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-text-primary dark:text-white">Kết quả Chỉnh sửa</h3>
                    {resultImages.length === 1 && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPreviewImage(resultImages[0])}
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
                        </div>
                    )}
                </div>
                <div className="w-full aspect-video bg-main-bg dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-border-color dark:border-gray-700 flex items-center justify-center overflow-hidden">
                    {isLoading && (
                        <div className="flex flex-col items-center">
                            <Spinner />
                            <p className="mt-2 text-text-secondary dark:text-gray-400">{statusMessage || 'Đang xử lý...'}</p>
                        </div>
                    )}
                    
                    {!isLoading && resultImages.length === 1 && sourceImage && (
                        <ImageComparator
                            originalImage={sourceImage.objectURL}
                            resultImage={resultImages[0]}
                        />
                    )}
                    
                    {!isLoading && resultImages.length > 1 && (
                        <ResultGrid images={resultImages} toolName="image-editor" />
                    )}

                    {!isLoading && resultImages.length === 0 && (
                         <p className="text-text-secondary dark:text-gray-400 text-center p-4">{sourceImage ? 'Kết quả chỉnh sửa sẽ hiển thị ở đây.' : 'Tải lên một ảnh để bắt đầu.'}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageEditor;
