
import { FileData } from "../types";

// Change this if your Cloudflare Worker is hosted elsewhere
// Leave empty if serving from same domain path /api
// Get API URL from env var if available (Set VITE_API_URL in Cloudflare Pages Settings)
// @ts-ignore
const BACKEND_URL = (import.meta as any).env?.VITE_API_URL || "https://twilight-fire-b7d4.truongvohaiaune.workers.dev"; 

// Helper wait
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Constants for Timeout logic
const POLL_INTERVAL = 8000; // 8 seconds
const TIMEOUT_DURATION = 180000; // 3 minutes in ms
const MAX_POLL_ATTEMPTS = Math.ceil(TIMEOUT_DURATION / POLL_INTERVAL); // ~23 attempts

// Helper to get image dimensions
const getImageDimensions = (fileData: FileData): Promise<{width: number, height: number}> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = fileData.objectURL || `data:${fileData.mimeType};base64,${fileData.base64}`;
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = () => resolve({ width: 1024, height: 576 }); // Fallback safe default
    });
};

// Crop and Resize Image with Letterbox/Pillarbox support
// If 16:9 -> Target 1024x576. If Image is vertical, add side black bars.
// If 9:16 -> Target 576x1024. If Image is horizontal, add top/bottom black bars.
export const resizeAndCropImage = async (
    fileData: FileData, 
    aspectRatio: '16:9' | '9:16' | 'default' = '16:9'
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = fileData.objectURL || `data:${fileData.mimeType};base64,${fileData.base64}`;
        
        img.onload = () => {
            let targetWidth, targetHeight;
            let effectiveRatio = aspectRatio;

            // 1. Resolve Target Container Dimensions
            if (effectiveRatio === 'default') {
                effectiveRatio = img.width >= img.height ? '16:9' : '9:16';
            }

            if (effectiveRatio === '16:9') {
                targetWidth = 1024;
                targetHeight = 576;
            } else { // 9:16
                targetWidth = 576;
                targetHeight = 1024;
            }

            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                resolve(`data:${fileData.mimeType};base64,${fileData.base64}`);
                return;
            }

            // High quality scaling
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // 2. Draw Background: ALWAYS BLACK (Letterbox style)
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, targetWidth, targetHeight);

            // 3. Calculate "Contain" fit (Letterbox / Pillarbox)
            // Scale the image down until it fits entirely within the target box.
            const scale = Math.min(targetWidth / img.width, targetHeight / img.height);
            
            const renderWidth = img.width * scale;
            const renderHeight = img.height * scale;
            
            // Center the image in the container
            const offsetX = (targetWidth - renderWidth) / 2;
            const offsetY = (targetHeight - renderHeight) / 2;

            // 4. Draw Image Centered
            ctx.drawImage(img, offsetX, offsetY, renderWidth, renderHeight);

            // Export as JPEG
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
            resolve(compressedDataUrl);
        };

        img.onerror = (e) => {
            console.error("Image load failed for resize", e);
            resolve(`data:${fileData.mimeType};base64,${fileData.base64}`);
        };
    });
};

// Safe JSON fetch helper with Timeout support
const fetchJson = async (endpoint: string, options?: RequestInit) => {
    // 45s Default Timeout for fetch if not specified (Workers can be slow)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    
    // Construct Full URL logic:
    let url = endpoint;
    
    if (BACKEND_URL) {
        const baseUrl = BACKEND_URL.replace(/\/$/, ""); 
        const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
        url = `${baseUrl}${path}`;
    } else {
        const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
        if (path.startsWith('/api')) {
            url = path;
        } else {
            url = `/api${path}`;
        }
    }

    try {
        const res = await fetch(url, {
            ...options,
            signal: options?.signal || controller.signal
        });
        clearTimeout(timeoutId);

        const text = await res.text();
        
        if (text.trim().startsWith("<") || text.includes("<!DOCTYPE") || text.includes("<html")) {
             if (res.status === 404) throw new Error(`SYSTEM_ERROR: Không tìm thấy dịch vụ API.`);
             if (res.status === 500 || res.status === 502) throw new Error(`SYSTEM_ERROR: Máy chủ đang bảo trì.`);
             throw new Error(`NETWORK_ERROR: Lỗi kết nối máy chủ (${res.status})`);
        }

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error(`SYSTEM_ERROR: Phản hồi không hợp lệ từ máy chủ.`);
        }
        
        if (!res.ok) {
            let msg = data.error?.message || data.message || `Lỗi (${res.status})`;
            if (JSON.stringify(data).includes("SAFETY") || msg.includes("SAFETY")) throw new Error("SAFETY_ERROR");
            if (res.status === 429 || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) throw new Error("QUOTA_ERROR");
            if (res.status === 401 || res.status === 403 || msg.includes("UNAUTHENTICATED")) throw new Error("AUTH_ERROR");
            throw new Error(msg);
        }
        
        if (data.status === 'failed') {
             const failMsg = data.message || "Unknown error";
             if (failMsg.includes("SAFETY")) throw new Error("SAFETY_ERROR");
             throw new Error(failMsg);
        }

        return data;
    } catch (err: any) {
        clearTimeout(timeoutId);
        let msg = err.message || "Lỗi kết nối";
        if (msg.includes("aborted") || msg.includes("signal") || msg.includes("timeout")) msg = "TIMEOUT_ERROR";
        if (msg.includes("Failed to fetch")) msg = "NETWORK_ERROR";
        throw new Error(msg);
    }
};

// Internal function performing the actual generation logic
async function _executeVideoGeneration(
    prompt: string, 
    startImage?: FileData, 
    aspectRatio: '16:9' | '9:16' | 'default' = '16:9'
): Promise<{ videoUrl: string, mediaId?: string }> {
    console.log("==========================================================");
    console.log(`[Video Service] EXECUTING VIDEO GENERATION - Initial Ratio: ${aspectRatio}`);
    
    let effectiveRatio: '16:9' | '9:16' = '16:9'; // Default fallback
    let imageBase64 = null;

    if (startImage) {
        console.log(`[Client] Step 0: Analyzing & Processing Image...`);
        
        if (aspectRatio === 'default') {
            const dims = await getImageDimensions(startImage);
            effectiveRatio = dims.width >= dims.height ? '16:9' : '9:16';
            console.log(`[Client] Auto-detected Ratio for 'default': ${effectiveRatio} (Size: ${dims.width}x${dims.height})`);
        } else {
            effectiveRatio = aspectRatio;
        }

        try {
            // Resize and CROP (Contain) to fill the frame with black bars if needed
            const compressed = await resizeAndCropImage(startImage, aspectRatio);
            imageBase64 = compressed.split(',')[1];
        } catch (e) {
            console.warn("[Client] Processing failed, using original.");
            imageBase64 = startImage.base64;
        }
    } else {
        effectiveRatio = aspectRatio === 'default' ? '16:9' : aspectRatio as '16:9' | '9:16';
    }

    // --- FIX: DEFINING ENUM VARIABLES ---
    let imageAspectEnum = "IMAGE_ASPECT_RATIO_LANDSCAPE"; 
    let videoAspectEnum = "VIDEO_ASPECT_RATIO_LANDSCAPE"; 

    if (effectiveRatio === '9:16') {
        imageAspectEnum = "IMAGE_ASPECT_RATIO_PORTRAIT";
        videoAspectEnum = "VIDEO_ASPECT_RATIO_PORTRAIT"; 
    }

    console.log(`[Client] Resolved Enums -> Image: ${imageAspectEnum}, Video: ${videoAspectEnum}`);

    // Step 1: Auth
    const authData = await fetchJson('/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auth' })
    });
    const token = authData.token;
    if (!token) throw new Error("AUTH_ERROR");

    // Step 2 & 3 Combined: Upload AND Trigger
    // We send image data directly to 'create'. The worker handles atomic upload if image is present.
    console.log(`[Client] Step 3: Triggering Generation (Atomic Upload & Create)...`);
    
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

    // Step 4: Polling
    console.log(`[Client] Step 4: Polling Status...`);
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

            if (checkData.status === 'completed' && checkData.video_url) {
                console.log(`[Client] SUCCESS! Video URL: ${checkData.video_url}`);
                return { videoUrl: checkData.video_url, mediaId: checkData.mediaId };
            }
            
            if (checkData.status === 'failed') {
                const failReason = checkData.message || "Unknown error";
                if (failReason.includes("SAFETY")) throw new Error("SAFETY_ERROR");
                throw new Error(`GENERATION_FAILED: ${failReason}`);
            }
        } catch (e: any) {
            if (e.message.includes("SAFETY_ERROR") || e.message.includes("AUTH_ERROR")) throw e;
            console.warn(`[Client] Poll Error (Will retry):`, e.message);
        }
    }

    throw new Error("TIMEOUT_ERROR");
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
            console.warn("[Video Service] Timeout encountered (3 min). Retrying generation once...");
            try {
                return await _executeVideoGeneration(prompt, startImage, aspectRatio);
            } catch (retryError: any) {
                console.error("[Video Service] Retry attempt also failed.");
                throw retryError; 
            }
        }
        throw error;
    }
};

export const upscaleVideoExternal = async (mediaId: string): Promise<string> => {
    console.log("==========================================================");
    console.log(`[Video Service] STARTING VIDEO UPSCALE (1080p)`);
    console.log("==========================================================");

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
        console.log(`[Client] Upscale Task Created! Task ID: ${task_id}`);

        const maxRetries = 120;
        let attempts = 0;

        while (attempts < maxRetries) {
            attempts++;
            await wait(8000);

            const checkData = await fetchJson('/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check', task_id, scene_id, token })
            });

            if (checkData.status === 'completed' && checkData.video_url) {
                return checkData.video_url;
            }

            if (checkData.status === 'failed') {
                throw new Error("GENERATION_FAILED");
            }
        }
        
        throw new Error("TIMEOUT_ERROR");

    } catch (err: any) {
        console.error("[Upscale Error]", err);
        throw err;
    }
};
