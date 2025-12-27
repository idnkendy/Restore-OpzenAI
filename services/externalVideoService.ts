
// ... existing imports
import { FileData } from "../types";

// ... existing helpers (wait, POLL_INTERVAL, etc.) ...
// @ts-ignore
const BACKEND_URL = (import.meta as any).env?.VITE_API_URL || "https://twilight-fire-b7d4.truongvohaiaune.workers.dev"; 

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const POLL_INTERVAL = 10000;
const TIMEOUT_DURATION = 300000; 
const MAX_POLL_ATTEMPTS = Math.ceil(TIMEOUT_DURATION / POLL_INTERVAL);

// ... existing generateUUID, getImageDimensions, resizeAndCropImage, formatErrorMessage, fetchJson ...
const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const getImageDimensions = (fileData: FileData): Promise<{width: number, height: number}> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = fileData.objectURL || `data:${fileData.mimeType};base64,${fileData.base64}`;
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = () => resolve({ width: 2048, height: 1152 });
    });
};

export const resizeAndCropImage = async (
    fileData: FileData, 
    aspectRatio: '16:9' | '9:16' | '1:1' | 'default' = '16:9',
    tier: 'standard' | 'pro' = 'pro'
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = fileData.objectURL || `data:${fileData.mimeType};base64,${fileData.base64}`;
        
        img.onload = () => {
            let targetWidth, targetHeight;
            let effectiveRatio = aspectRatio;

            if (effectiveRatio === 'default') {
                effectiveRatio = img.width >= img.height ? '16:9' : '9:16';
            }

            const isStandard = tier === 'standard';

            if (effectiveRatio === '16:9') {
                targetWidth = isStandard ? 1280 : 2048;
                targetHeight = isStandard ? 720 : 1152;
            } else if (effectiveRatio === '9:16') { 
                targetWidth = isStandard ? 720 : 1152;
                targetHeight = isStandard ? 1280 : 2048;
            } else if (effectiveRatio === '1:1') {
                targetWidth = isStandard ? 1024 : 1024;
                targetHeight = isStandard ? 1024 : 1024;
            } else {
                targetWidth = isStandard ? 1280 : 2048;
                targetHeight = isStandard ? 720 : 1152;
            }

            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                resolve(`data:${fileData.mimeType};base64,${fileData.base64}`);
                return;
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, targetWidth, targetHeight);

            const scaleCover = Math.max(targetWidth / img.width, targetHeight / img.height);
            
            const renderWidth = img.width * scaleCover;
            const renderHeight = img.height * scaleCover;
            const offsetX = (targetWidth - renderWidth) / 2;
            const offsetY = (targetHeight - renderHeight) / 2;

            ctx.drawImage(img, offsetX, offsetY, renderWidth, renderHeight);
            
            const quality = isStandard ? 0.85 : 0.9;
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedDataUrl);
        };

        img.onerror = (e) => {
            console.error("Image load failed for resize", e);
            resolve(`data:${fileData.mimeType};base64,${fileData.base64}`);
        };
    });
};

const formatErrorMessage = (msg: string): string => {
    if (!msg) return "Lỗi không xác định. Vui lòng thử lại sau.";
    if (msg.includes("SAFETY") || msg.includes("safety") || msg.includes("blocked")) return "Nội dung vi phạm chính sách an toàn của AI (Safety Filter).";
    if (msg.includes("reCAPTCHA") || msg.includes("captcha") || msg.includes("401") || msg.includes("UNAUTHENTICATED")) return "Google hiện đang xảy ra lỗi (Captcha/Auth). Vui lòng thử lại sau";
    if (msg.includes("timeout") || msg.includes("deadline")) return "Hết thời gian chờ phản hồi từ máy chủ. Vui lòng thử lại.";
    if (msg.includes("503") || msg.includes("overloaded")) return "Máy chủ AI đang quá tải. Vui lòng thử lại sau 1 phút.";
    if (msg.includes("quota") || msg.includes("exhausted")) return "Hệ thống đang bận (Quota limit). Vui lòng chờ giây lát.";
    if (msg.includes("INVALID_ARGUMENT")) return "Lỗi dữ liệu đầu vào. Ảnh quá lớn hoặc tỷ lệ không phù hợp.";
    if (!msg.toLowerCase().includes("vui lòng") && !msg.includes("try again") && msg.length < 50) return `${msg}. Vui lòng thử lại sau.`;
    return msg;
};

const fetchJson = async (endpoint: string, options?: RequestInit) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    let url = endpoint;
    if (BACKEND_URL) {
        const baseUrl = BACKEND_URL.replace(/\/$/, ""); 
        const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
        url = `${baseUrl}${path}`;
    } else {
        const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
        url = path.startsWith('/api') ? path : `/api${path}`;
    }

    try {
        const res = await fetch(url, { ...options, signal: options?.signal || controller.signal });
        clearTimeout(timeoutId);
        const text = await res.text();
        
        if (text.trim().startsWith("<") || text.includes("<!DOCTYPE")) {
             if (res.status === 404) throw new Error(`SYSTEM_ERROR: Không tìm thấy dịch vụ API.`);
             if (res.status === 500) throw new Error(`SYSTEM_ERROR: Máy chủ đang bảo trì.`);
             throw new Error(`NETWORK_ERROR: Lỗi kết nối máy chủ (${res.status})`);
        }

        let data;
        try { data = JSON.parse(text); } catch (e) { throw new Error(`SYSTEM_ERROR: Phản hồi không hợp lệ.`); }
        
        if (!res.ok) {
            let msg = data.error?.message || data.message || `Lỗi (${res.status})`;
            if (JSON.stringify(data).includes("SAFETY")) throw new Error("SAFETY_ERROR");
            throw new Error(formatErrorMessage(msg));
        }
        if (data.status === 'failed' || data.code === 'failed' || data.success === false) {
             if (data.code === 'processing') return data;
             throw new Error(formatErrorMessage(data.message || "Unknown error"));
        }
        return data;
    } catch (err: any) {
        clearTimeout(timeoutId);
        let msg = err.message || "Lỗi kết nối";
        if (msg.includes("aborted")) msg = "TIMEOUT_ERROR";
        throw new Error(msg);
    }
};

// ... existing flow media functions (generateFlowImage, upscaleFlowImage) ...
export const generateFlowImage = async (
    prompt: string,
    inputImages: FileData[] | FileData = [], 
    aspectRatio: string = "IMAGE_ASPECT_RATIO_LANDSCAPE",
    numberOfImages: number = 1,
    imageModelName: string = "GEM_PIX_2",
    onProgress?: (message: string) => void 
): Promise<{ imageUrls: string[], mediaIds: string[], projectId?: string }> => {
    const imagesToProcess = Array.isArray(inputImages) ? inputImages : (inputImages ? [inputImages] : []);
    const processedImages: string[] = [];
    const LOADING_MSG = "Đang xử lý. Vui lòng đợi...";
    if (onProgress) onProgress(LOADING_MSG);

    let ratioType: '16:9' | '9:16' | '1:1' = '16:9';
    if (aspectRatio.includes("PORTRAIT")) ratioType = "9:16";
    else if (aspectRatio.includes("SQUARE")) ratioType = "1:1";

    const tier = (imageModelName === 'GEM_PIX') ? 'standard' : 'pro';

    for (const img of imagesToProcess) {
        try {
            const imageData = await resizeAndCropImage(img, ratioType, tier);
            processedImages.push(imageData);
        } catch (e) {
            processedImages.push(`data:${img.mimeType};base64,${img.base64}`);
        }
    }

    const createRes = await fetchJson('/flow-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'flow_media_create',
            prompt: prompt || "enhance",
            images: processedImages,
            image: processedImages.length > 0 ? processedImages[0] : null, 
            imageAspectRatio: aspectRatio,
            numberOfImages: numberOfImages,
            imageModelName: imageModelName 
        })
    });

    if (!createRes.taskId) throw new Error("Không nhận được Task ID.");
    const taskId = createRes.taskId;
    const projectId = createRes.projectId;
    if (onProgress) onProgress(LOADING_MSG);

    const POLLING_DELAY = 5000;
    const MAX_RETRIES = 60; 

    for (let i = 0; i < MAX_RETRIES; i++) {
        await wait(POLLING_DELAY);
        try {
            const statusRes = await fetchJson('/flow-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'flow_check', taskId: taskId })
            });
            if (statusRes.code === 'processing') {
                if (onProgress) onProgress(LOADING_MSG);
                continue;
            }
            if (statusRes.result?.media && statusRes.result.media.length > 0) {
                const urls: string[] = [];
                const mediaIds: string[] = [];
                statusRes.result.media.forEach((mediaItem: any) => {
                     let mId = mediaItem.mediaGenerationId || mediaItem.image?.id || mediaItem.id;
                     if (!mId && mediaItem.image?.generatedImage) mId = mediaItem.image.generatedImage.mediaGenerationId;
                     if(mId) mediaIds.push(mId);
                     let generatedImage = mediaItem.image?.generatedImage?.encodedImage || mediaItem.encodedImage;
                     if (generatedImage) {
                         const finalUrl = generatedImage.startsWith('data:') ? generatedImage : `data:image/jpeg;base64,${generatedImage}`;
                         urls.push(finalUrl);
                         return;
                     }
                     let fifeUrl = mediaItem.fifeUrl || mediaItem.image?.generatedImage?.fifeUrl;
                     if (fifeUrl) urls.push(fifeUrl);
                });
                if (urls.length > 0) {
                    if (onProgress) onProgress(LOADING_MSG);
                    return { imageUrls: urls, mediaIds, projectId };
                }
            }
            if (statusRes.status === 'FAILED') throw new Error("Thất bại.");
        } catch (pollErr: any) {
            if (pollErr.message.includes("SYSTEM_ERROR") || pollErr.message.includes("Captcha")) throw pollErr;
            if (onProgress) onProgress(LOADING_MSG);
        }
    }
    throw new Error("Timeout.");
};

export const upscaleFlowImage = async (mediaId: string, projectId: string | undefined, targetResolution: string = 'UPSAMPLE_IMAGE_RESOLUTION_2K'): Promise<{ imageUrl: string }> => {
    const createRes = await fetchJson('/flow-upscale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'flow_upscale', mediaId: mediaId, projectId: projectId, targetResolution: targetResolution })
    });
    if (!createRes.taskId) throw new Error("No Upscale Task ID");
    const taskId = createRes.taskId;
    const POLLING_DELAY = 10000;
    const MAX_RETRIES = 20;
    for (let i = 0; i < MAX_RETRIES; i++) {
        await wait(POLLING_DELAY);
        try {
            const statusRes = await fetchJson('/flow-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'flow_check', taskId: taskId })
            });
            if (statusRes.code === 'processing') continue;
            if (statusRes.result?.encodedImage) {
                return { imageUrl: `data:image/jpeg;base64,${statusRes.result.encodedImage}` };
            }
        } catch (e) {}
    }
    throw new Error("Upscale Timeout");
};

// ... _executeVideoGeneration (Single Image) ...
async function _executeVideoGeneration(
    prompt: string, 
    startImage?: FileData, 
    aspectRatio: '16:9' | '9:16' | 'default' = '16:9'
): Promise<{ videoUrl: string, mediaId?: string }> {
    let effectiveRatio: '16:9' | '9:16' = '16:9'; 
    let imageBase64 = null;

    if (startImage) {
        if (aspectRatio === 'default') {
            const dims = await getImageDimensions(startImage);
            effectiveRatio = dims.width >= dims.height ? '16:9' : '9:16';
        } else {
            effectiveRatio = aspectRatio;
        }
        try {
            const compressed = await resizeAndCropImage(startImage, aspectRatio, 'pro');
            imageBase64 = compressed.split(',')[1];
        } catch (e) {
            imageBase64 = startImage.base64;
        }
    } else {
        effectiveRatio = aspectRatio === 'default' ? '16:9' : aspectRatio as '16:9' | '9:16';
    }

    let imageAspectEnum = "IMAGE_ASPECT_RATIO_LANDSCAPE"; 
    let videoAspectEnum = "VIDEO_ASPECT_RATIO_LANDSCAPE"; 

    if (effectiveRatio === '9:16') {
        imageAspectEnum = "IMAGE_ASPECT_RATIO_PORTRAIT";
        videoAspectEnum = "VIDEO_ASPECT_RATIO_PORTRAIT"; 
    }

    // Single Atomic Request to /create (Backend handles auth + upload + generation in one flow)
    const authData = await fetchJson('/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'auth' }) });
    const token = authData.token;
    
    const triggerBody: any = { 
        action: 'create', 
        token, 
        prompt, 
        videoAspectRatio: videoAspectEnum 
    };

    if (imageBase64) {
        triggerBody.image = imageBase64;
        triggerBody.imageAspectRatio = imageAspectEnum;
    }

    const triggerData = await fetchJson('/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(triggerBody)
    });
    const { task_id, scene_id } = triggerData;

    let attempts = 0;
    while (attempts < MAX_POLL_ATTEMPTS) {
        attempts++;
        await wait(POLL_INTERVAL);
        try {
            const checkData = await fetchJson('/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check', task_id, scene_id, token }) 
            });
            if (checkData.status === 'completed' && checkData.video_url) return { videoUrl: checkData.video_url, mediaId: checkData.mediaId };
            if (checkData.status === 'failed') throw new Error(`GENERATION_FAILED: ${checkData.message}`);
        } catch (e: any) {
            if (e.message.includes("SAFETY") || e.message.includes("AUTH") || e.message.includes("GENERATION_FAILED")) throw e;
        }
    }
    throw new Error("TIMEOUT_ERROR");
}

export const uploadImage = async (base64Data: string, aspectRatio?: string): Promise<string> => {
    const authData = await fetchJson('/auth', { method: 'POST', body: JSON.stringify({ action: 'auth' }) });
    const token = authData.token;
    const result = await fetchJson('/upload', { method: 'POST', body: JSON.stringify({ action: 'upload', image: base64Data, imageAspectRatio: aspectRatio }) });
    if (result.mediaId) return result.mediaId;
    throw new Error("Upload failed");
}

export const generateVideoExternal = async (
    prompt: string, 
    backendUrl: string, 
    startImage?: FileData, 
    aspectRatio: '16:9' | '9:16' | 'default' = '16:9'
): Promise<{ videoUrl: string, mediaId?: string }> => {
    try {
        return await _executeVideoGeneration(prompt, startImage, aspectRatio);
    } catch (error: any) {
        if (error.message === 'TIMEOUT_ERROR') {
            try {
                return await _executeVideoGeneration(prompt, startImage, aspectRatio);
            } catch (retryError: any) {
                throw retryError; 
            }
        }
        throw error;
    }
};

export const generateVideoWithReferences = async (
    prompt: string, 
    sceneImage: FileData,
    characterImage: FileData,
    aspectRatio: '16:9' | '9:16' | 'default' = '16:9'
): Promise<{ videoUrl: string, mediaId?: string }> => {
    
    // 1. Prepare Aspect Ratio
    let effectiveRatio = aspectRatio === 'default' ? '16:9' : aspectRatio as '16:9' | '9:16';
    let imageAspectEnum = "IMAGE_ASPECT_RATIO_LANDSCAPE"; 
    let videoAspectEnum = "VIDEO_ASPECT_RATIO_LANDSCAPE"; 

    if (effectiveRatio === '9:16') {
        imageAspectEnum = "IMAGE_ASPECT_RATIO_PORTRAIT";
        videoAspectEnum = "VIDEO_ASPECT_RATIO_PORTRAIT"; 
    }

    // 2. Prepare Images (Resize Client Side) - DO NOT UPLOAD HERE
    const sceneBase64 = await resizeAndCropImage(sceneImage, effectiveRatio, 'pro');
    const charBase64 = await resizeAndCropImage(characterImage, effectiveRatio, 'pro');

    // 3. Send Everything to Backend (Atomic Request)
    const triggerData = await fetchJson('/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            action: 'create', 
            prompt,
            videoAspectRatio: videoAspectEnum,
            // Send Base64 data arrays instead of IDs
            referenceImages: [
                { data: sceneBase64.split(',')[1], aspectRatio: imageAspectEnum },
                { data: charBase64.split(',')[1], aspectRatio: imageAspectEnum }
            ]
        })
    });
    
    const { task_id, scene_id } = triggerData;

    // 4. Poll for completion
    let attempts = 0;
    while (attempts < MAX_POLL_ATTEMPTS) {
        attempts++;
        await wait(POLL_INTERVAL);

        try {
            const checkData = await fetchJson('/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check', task_id, scene_id }) 
            });

            if (checkData.status === 'completed' && checkData.video_url) {
                return { videoUrl: checkData.video_url, mediaId: checkData.mediaId };
            }
            
            if (checkData.status === 'failed') {
                const failReason = checkData.message || "Unknown error";
                if (failReason.includes("SAFETY")) throw new Error("SAFETY_ERROR");
                throw new Error(`GENERATION_FAILED: ${failReason}`);
            }
        } catch (e: any) {
            if (e.message.includes("SAFETY_ERROR") || e.message.includes("AUTH_ERROR") || e.message.includes("GENERATION_FAILED")) throw e;
        }
    }
    throw new Error("TIMEOUT_ERROR");
}

export const upscaleVideoExternal = async (mediaId: string): Promise<string> => {
    try {
        const authData = await fetchJson('/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'auth' })
        });
        const token = authData.token;

        const triggerData = await fetchJson('/upscale', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'upscale', token, mediaId })
        });
        const { task_id, scene_id } = triggerData;
        const sceneIdSafe = scene_id || generateUUID();
        const maxRetries = 120;
        let attempts = 0;

        while (attempts < maxRetries) {
            attempts++;
            await wait(10000); 
            const checkData = await fetchJson('/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check', task_id, scene_id: sceneIdSafe, token })
            });
            if (checkData.status === 'completed' && checkData.video_url) return checkData.video_url;
            if (checkData.status === 'failed') throw new Error("GENERATION_FAILED");
        }
        throw new Error("TIMEOUT_ERROR");
    } catch (err: any) { throw err; }
};
