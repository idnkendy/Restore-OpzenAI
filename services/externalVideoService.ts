
import { FileData } from "../types";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
        img.onerror = () => {
            resolve(`data:${fileData.mimeType};base64,${fileData.base64}`);
        };
    });
};

export const pingServer = async (backendUrl: string): Promise<boolean> => {
    return true;
};

export const generateVideoExternal = async (prompt: string, backendUrl: string, startImage?: FileData): Promise<string> => {
    
    // 1. Trigger
    const triggerUrl = '/api/py/trigger';
    const payload: any = { prompt: prompt };
    
    if (startImage) {
        try {
            const compressedImage = await resizeAndCompressImage(startImage, 1024);
            payload.image = compressedImage;
        } catch (e) {
            payload.image = `data:${startImage.mimeType};base64,${startImage.base64}`;
        }
    }

    try {
        const triggerRes = await fetch(triggerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!triggerRes.ok) {
            const status = triggerRes.status;
            let msg = "Lỗi dịch vụ";
            // Map specific HTTP statuses to strict format
            if (status === 403) msg = "Lỗi quyền truy cập";
            else if (status === 429) msg = "Hệ thống bận";
            else if (status === 503) msg = "Máy chủ quá tải";
            else if (status === 400) msg = "Dữ liệu không hợp lệ";
            else if (status === 413) msg = "File quá lớn";
            else if (status === 500) msg = "Lỗi máy chủ";
            
            throw new Error(`[${status}] ${msg}. Vui lòng thử lại sau.`);
        }

        const triggerData = await triggerRes.json();
        const { task_id, scene_id } = triggerData;

        if (!task_id) throw new Error("[ERR] Lỗi ID tác vụ. Vui lòng thử lại sau.");

        // 2. Polling
        const maxRetries = 120; 
        let attempts = 0;
        const checkUrl = '/api/py/check';

        while (attempts < maxRetries) {
            attempts++;
            await wait(5000); 

            try {
                const checkRes = await fetch(checkUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ task_id, scene_id })
                });

                if (checkRes.ok) {
                    const checkData = await checkRes.json();
                    if (checkData.status === 'completed' && checkData.video_url) {
                        return checkData.video_url;
                    }
                    if (checkData.status === 'failed') {
                        throw new Error(`[ERR] Tạo video thất bại. Vui lòng thử lại sau.`);
                    }
                }
            } catch (e: any) {
                // If it's explicitly one of our strict errors, stop
                if (String(e.message).startsWith('[')) throw e;
                // Otherwise ignore transient network/polling errors
            }
        }

        throw new Error("[TIMEOUT] Quá thời gian xử lý. Vui lòng thử lại sau.");
        
    } catch (error: any) {
        let msg = error.message || "";
        
        // Ensure format is [CODE] Short msg. Vui lòng thử lại sau.
        if (!msg.startsWith('[')) {
            const lowerMsg = msg.toLowerCase();
            let code = 'ERR';
            let short = 'Lỗi không xác định';

            if (lowerMsg.includes('403') || lowerMsg.includes('permission')) { code = '403'; short = 'Lỗi quyền truy cập'; }
            else if (lowerMsg.includes('429') || lowerMsg.includes('quota')) { code = '429'; short = 'Hệ thống bận'; }
            else if (lowerMsg.includes('fetch') || lowerMsg.includes('network')) { code = 'NET'; short = 'Lỗi kết nối mạng'; }
            else if (lowerMsg.includes('timeout')) { code = 'TIMEOUT'; short = 'Quá thời gian'; }
            
            msg = `[${code}] ${short}. Vui lòng thử lại sau.`;
        }
        throw new Error(msg);
    }
};
