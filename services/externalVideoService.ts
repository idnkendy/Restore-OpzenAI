
import { FileData } from "../types";

// Change this if your Cloudflare Worker is hosted elsewhere
// Leave empty if serving from same domain path /api
// Get API URL from env var if available (Set VITE_API_URL in Cloudflare Pages Settings)
// @ts-ignore
const BACKEND_URL = (import.meta as any).env?.VITE_API_URL || ""; 

// Helper wait
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Compress image (Max width 1024px for speed)
const resizeAndCompressImage = async (fileData: FileData, maxWidth: number = 1024): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = fileData.objectURL || `data:${fileData.mimeType};base64,${fileData.base64}`;
        
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                const scaleFactor = maxWidth / width;
                width = maxWidth;
                height = Math.round(height * scaleFactor);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                resolve(`data:${fileData.mimeType};base64,${fileData.base64}`);
                return;
            }

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve(compressedDataUrl);
        };

        img.onerror = () => resolve(`data:${fileData.mimeType};base64,${fileData.base64}`);
    });
};

// Safe JSON fetch helper with Timeout support
const fetchJson = async (endpoint: string, options?: RequestInit) => {
    // 30s Default Timeout for fetch if not specified
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    // Construct Full URL logic:
    let url = endpoint;
    
    if (BACKEND_URL) {
        // If BACKEND_URL is set (e.g. https://my-worker.workers.dev)
        const baseUrl = BACKEND_URL.replace(/\/$/, ""); // Remove trailing slash
        const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
        url = `${baseUrl}${path}`;
    } else {
        // Fallback to relative /api path if no env var is set
        const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
        // If the endpoint already starts with /api, don't double it
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
        
        // Handle HTML responses (Cloudflare/Vercel errors) gracefully
        if (text.trim().startsWith("<") || text.includes("<!DOCTYPE") || text.includes("<html")) {
             if (res.status === 404) {
                 throw new Error(`Không tìm thấy dịch vụ API (404). Kiểm tra biến môi trường VITE_API_URL.`);
             }
             if (res.status === 405) {
                 throw new Error(`Phương thức không hợp lệ (405)`);
             }
             if (res.status === 500) {
                 throw new Error(`Lỗi máy chủ nội bộ (500)`);
             }
             throw new Error(`Lỗi kết nối máy chủ (${res.status})`);
        }

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error(`Phản hồi máy chủ không hợp lệ`);
        }
        
        if (!res.ok) {
            // Prefer short message
            const msg = data.error?.message || data.message || `Lỗi (${res.status})`;
            throw new Error(msg);
        }
        return data;
    } catch (err: any) {
        clearTimeout(timeoutId);
        // Normalize error message
        let msg = err.message || "Lỗi kết nối";
        if (msg.includes("aborted") || msg.includes("signal")) msg = "Hết thời gian chờ kết nối";
        if (msg.includes("Failed to fetch")) msg = "Không thể kết nối tới máy chủ";
        
        throw new Error(msg);
    }
};

export const generateVideoExternal = async (prompt: string, backendUrl: string, startImage?: FileData): Promise<{ videoUrl: string, mediaId?: string }> => {
    console.log("==========================================================");
    console.log(`[Video Service] STARTING VIDEO GENERATION (Fast Mode)`);
    console.log("==========================================================");
    
    // Step 0: Compress Image
    let imageBase64 = null;
    if (startImage) {
        console.log(`[Client] Step 0: Compressing Image...`);
        try {
            const compressed = await resizeAndCompressImage(startImage, 1024);
            imageBase64 = compressed.split(',')[1];
            console.log(`[Client] Image Ready. Size: ${(imageBase64.length / 1024).toFixed(2)} KB`);
        } catch (e) {
            console.warn("[Client] Compression failed, using original.");
            imageBase64 = startImage.base64;
        }
    }

    try {
        // Step 1: Auth (Always fetch from backend now to get KV token)
        console.log(`[Client] Step 1: Fetching Dynamic Token from Backend (KV)...`);
        const authData = await fetchJson('/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'auth' })
        });
        const token = authData.token;
        if (!token) throw new Error("Hệ thống chưa được cấu hình Token. Vui lòng liên hệ Admin.");
        console.log(`[Client] Token Received.`);

        // Step 2: Upload (If needed)
        let mediaId = null;
        if (imageBase64) {
            console.log(`[Client] Step 2: Uploading Image to Google...`);
            const uploadData = await fetchJson('/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'upload', token, image: imageBase64 })
            });
            mediaId = uploadData.mediaId;
            console.log(`[Client] Image Uploaded. Media ID: ${mediaId}`);
        }

        // Step 3: Trigger
        console.log(`[Client] Step 3: Triggering Video Generation...`);
        const triggerData = await fetchJson('/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'create', token, prompt, mediaId })
        });
        const { task_id, scene_id } = triggerData;
        console.log(`[Client] Task Created! Task ID: ${task_id}`);

        // Step 4: Polling
        console.log(`[Client] Step 4: Polling Status...`);
        const maxRetries = 120; 
        let attempts = 0;
        
        while (attempts < maxRetries) {
            attempts++;
            // Optimization: Increased wait time to 8s to reduce server load
            await wait(8000); 

            try {
                const checkData = await fetchJson('/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'check', task_id, scene_id, token }) 
                });

                console.log(`[Client] Poll #${attempts}: Status = ${checkData.status}`);
                
                if (checkData.status === 'completed' && checkData.video_url) {
                    console.log("==========================================================");
                    console.log(`[Client] SUCCESS! Video URL: ${checkData.video_url}`);
                    return { 
                        videoUrl: checkData.video_url,
                        mediaId: checkData.mediaId // Optional ID for upscaling
                    };
                }
                
                if (checkData.status === 'failed') {
                    throw new Error("Quá trình tạo video thất bại.");
                }
            } catch (e: any) {
                console.warn(`[Client] Poll Error (Will retry):`, e.message);
                if (attempts > 10 && (e.message.includes('Server Error') || e.message.includes('500'))) throw new Error("Lỗi máy chủ khi kiểm tra trạng thái.");
            }
        }

        throw new Error("Hết thời gian chờ tạo video.");

    } catch (err: any) {
        console.error("[Video Service Error]", err);
        throw err;
    }
};

export const upscaleVideoExternal = async (mediaId: string): Promise<string> => {
    console.log("==========================================================");
    console.log(`[Video Service] STARTING VIDEO UPSCALE (1080p)`);
    console.log("==========================================================");

    try {
        // Fetch token dynamically
        const authData = await fetchJson('/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'auth' })
        });
        const token = authData.token;

        // Trigger Upscale
        const triggerData = await fetchJson('/upscale', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'upscale', token, mediaId })
        });
        const { task_id, scene_id } = triggerData;
        console.log(`[Client] Upscale Task Created! Task ID: ${task_id}`);

        // Poll for completion
        const maxRetries = 120;
        let attempts = 0;

        while (attempts < maxRetries) {
            attempts++;
            await wait(8000); // Increased from 5000ms to 8000ms

            const checkData = await fetchJson('/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check', task_id, scene_id, token })
            });

            console.log(`[Client] Upscale Poll #${attempts}: Status = ${checkData.status}`);

            if (checkData.status === 'completed' && checkData.video_url) {
                return checkData.video_url;
            }

            if (checkData.status === 'failed') {
                throw new Error("Quá trình nâng cấp video thất bại.");
            }
        }
        
        throw new Error("Hết thời gian chờ nâng cấp video.");

    } catch (err: any) {
        console.error("[Upscale Error]", err);
        throw err;
    }
};
