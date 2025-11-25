
import { FileData } from "../types";

// Hàm helper để chờ (sleep)
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Hàm nén và resize ảnh (Max width 1024px, chuyển sang JPEG)
const resizeAndCompressImage = async (fileData: FileData, maxWidth: number = 1024): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        // Sử dụng objectURL nếu có để load nhanh hơn, fallback sang base64
        img.src = fileData.objectURL || `data:${fileData.mimeType};base64,${fileData.base64}`;
        
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            // Tính toán tỷ lệ mới nếu ảnh quá to
            if (width > maxWidth) {
                const scaleFactor = maxWidth / width;
                width = maxWidth;
                height = Math.round(height * scaleFactor);
            }

            // Tạo canvas để vẽ lại ảnh
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                // Fallback nếu không lấy được context (rất hiếm)
                // Trả về nguyên gốc kèm header
                resolve(`data:${fileData.mimeType};base64,${fileData.base64}`);
                return;
            }

            // Vẽ nền trắng (đề phòng ảnh PNG trong suốt khi chuyển sang JPEG bị đen nền)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);

            // Vẽ ảnh lên canvas đã resize
            ctx.drawImage(img, 0, 0, width, height);

            // Xuất ra Data URL dạng JPEG với chất lượng 0.85 (đủ nét, dung lượng nhẹ)
            // API thường yêu cầu có header data:image/...
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            
            console.log(`[Image Process] Resized to ${width}x${height}. Old size: ~${Math.round(fileData.base64.length/1024)}KB. New size: ~${Math.round(compressedDataUrl.length/1024)}KB`);
            
            resolve(compressedDataUrl);
        };

        img.onerror = (error) => {
            console.error("Lỗi khi xử lý ảnh:", error);
            // Nếu lỗi, trả về ảnh gốc để thử vận may
            resolve(`data:${fileData.mimeType};base64,${fileData.base64}`);
        };
    });
};

export const pingServer = async (backendUrl: string): Promise<boolean> => {
    // Không cần ping với Vercel Serverless
    return true;
};

export const generateVideoExternal = async (prompt: string, backendUrl: string, startImage?: FileData): Promise<string> => {
    // Luôn dùng đường dẫn tương đối với Vercel
    
    console.log("[Video Service] Starting Vercel Polling Mode...");
    
    // 1. Trigger (Gửi lệnh)
    const triggerUrl = '/api/py/trigger';
    const payload: any = { prompt: prompt };
    
    if (startImage) {
        // Nén ảnh trước khi gửi để tránh lỗi 413 Request Entity Too Large
        try {
            const compressedImage = await resizeAndCompressImage(startImage, 1024);
            payload.image = compressedImage;
        } catch (e) {
            console.warn("Image compression failed, sending original...", e);
            payload.image = `data:${startImage.mimeType};base64,${startImage.base64}`;
        }
    }

    const triggerRes = await fetch(triggerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!triggerRes.ok) {
        let errMsg = `Lỗi Trigger: ${triggerRes.status}`;
        try {
            const errData = await triggerRes.json();
            if (errData.message) errMsg = errData.message;
        } catch (e) {}
        
        if (triggerRes.status === 413) {
            errMsg = "Ảnh tải lên quá lớn. Hệ thống đã thử nén nhưng vẫn vượt quá giới hạn.";
        }
        
        throw new Error(errMsg);
    }

    const triggerData = await triggerRes.json();
    const { task_id, scene_id } = triggerData;

    if (!task_id) throw new Error("Không nhận được Task ID từ server.");
    console.log(`[Video Service] Task Started: ${task_id}. Polling...`);

    // 2. Polling (Vòng lặp kiểm tra trạng thái)
    // Thời gian chờ tối đa 10 phút (120 lần * 5s)
    const maxRetries = 120; 
    let attempts = 0;
    const checkUrl = '/api/py/check';

    while (attempts < maxRetries) {
        attempts++;
        await wait(5000); // Đợi 5 giây trước mỗi lần hỏi

        try {
            const checkRes = await fetch(checkUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_id, scene_id })
            });

            if (checkRes.ok) {
                const checkData = await checkRes.json();
                
                if (checkData.status === 'completed' && checkData.video_url) {
                    console.log("[Video Service] Completed!", checkData.video_url);
                    return checkData.video_url;
                }
                
                if (checkData.status === 'failed') {
                    throw new Error(checkData.message || "Quá trình tạo video thất bại.");
                }
                
                console.log(`[Video Service] Polling... (${attempts}/${maxRetries})`);
            }
        } catch (e) {
            console.warn("Polling error (ignored, retrying):", e);
        }
    }

    throw new Error("Quá thời gian chờ (Timeout) phía Client.");
};
