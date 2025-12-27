
import { GoogleGenAI } from "@google/genai";
import { supabase } from "./supabaseClient";
import { AspectRatio, FileData, ImageResolution } from "../types";

// --- SECURITY & UTILS ---

// KHÓA BÍ MẬT (Phải khớp với v_secret trong SQL function)
const XOR_SECRET = 'OPZEN_SUPER_SECRET_2025';

// Hàm xóa API Key khỏi chuỗi văn bản để bảo mật
const scrubErrorText = (text: string): string => {
    if (!text) return "";
    // Xóa các định dạng phổ biến của API Key trong log lỗi của Google
    return text
        .replace(/AIza[A-Za-z0-9_-]{35}/g, '***')
        .replace(/api_key:[A-Za-z0-9_-]+/g, 'api_key:***')
        .replace(/Consumer 'api_key:[^']+'/g, "API Key");
};

// Hàm giải mã XOR từ chuỗi Base64
const decryptCode = (encryptedBase64: string): string => {
    try {
        if (!encryptedBase64) return "";
        const binaryString = atob(encryptedBase64);
        let decrypted = '';
        for (let i = 0; i < binaryString.length; i++) {
            const secretChar = XOR_SECRET.charCodeAt(i % XOR_SECRET.length);
            const encryptedChar = binaryString.charCodeAt(i);
            decrypted += String.fromCharCode(encryptedChar ^ secretChar);
        }
        return decrypted;
    } catch (e) {
        console.error("Lỗi giải mã API Key:", e);
        return encryptedBase64;
    }
};

const normalizeCode = (code: string): string => {
    if (!code) return "";
    return code.trim().replace(/[\n\r\s]/g, '');
};

// --- API KEY MANAGEMENT ---

const getGeminiApiKey = async (): Promise<string> => {
    try {
        // Fallback biến môi trường nếu có (Check safely for browser env)
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
            return process.env.API_KEY;
        }

        // Gọi RPC để lấy key ngẫu nhiên (đã mã hóa hoặc plain text tùy server config)
        const { data: encryptedKey, error } = await supabase.rpc('get_random_api_key');

        if (error) {
            // Fallback: Nếu không có RPC, query trực tiếp bảng api_keys
            if (error.message?.includes('function') && error.message?.includes('not found')) {
                 const { data: keys } = await supabase
                    .from('api_keys')
                    .select('key_value')
                    .eq('is_active', true);
                 
                 if (keys && keys.length > 0) {
                     const randomIndex = Math.floor(Math.random() * keys.length);
                     return keys[randomIndex].key_value;
                 }
            }
            console.error("Supabase RPC/DB Error:", error);
            throw new Error("Không thể kết nối đến hệ thống cấp Key.");
        }

        if (!encryptedKey) throw new Error("Hệ thống đang bận, vui lòng thử lại sau giây lát.");
        
        // Giải mã key nhận được
        const apiKey = normalizeCode(decryptCode(encryptedKey));
        
        if (!apiKey || apiKey.length < 10) {
             // Fallback nếu giải mã ra chuỗi rỗng (trường hợp key chưa encrypt trong DB cũ)
             if (encryptedKey.startsWith("AIza")) return encryptedKey;
             throw new Error("API Key không hợp lệ.");
        }

        return apiKey;
    } catch (err: any) {
        throw new Error(err.message || "Lỗi lấy API Key.");
    }
};

/**
 * Fetches a valid Google Gemini API Key and returns a client instance.
 * Used for Text, Vision, and 4K Image generation.
 */
const getDynamicAIClient = async () => {
    const key = await getGeminiApiKey();
    return new GoogleGenAI({ apiKey: key });
};

// --- HELPER: Memory Optimization (Base64 -> Blob URL) ---

/**
 * Converts a Base64 string to a Blob URL ASYNCHRONOUSLY to prevent UI freeze.
 */
const base64ToBlobUrlAsync = async (base64: string, mimeType: string = 'image/png'): Promise<string> => {
    try {
        const res = await fetch(`data:${mimeType};base64,${base64}`);
        const blob = await res.blob();
        return URL.createObjectURL(blob);
    } catch (e) {
        console.error("Failed to convert Base64 to Blob Async", e);
        return `data:${mimeType};base64,${base64}`; 
    }
};

/**
 * Extracts raw Base64 and MimeType from a URL.
 */
export const getFileDataFromUrl = async (url: string): Promise<FileData> => {
    if (url.startsWith('data:')) {
        const arr = url.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
        return {
            base64: arr[1],
            mimeType: mime,
            objectURL: url
        };
    }

    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result as string;
                const arr = base64data.split(',');
                resolve({
                    base64: arr[1],
                    mimeType: blob.type,
                    objectURL: url
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("getFileDataFromUrl failed:", e);
        throw new Error("Không thể xử lý ảnh này. Vui lòng thử lại.");
    }
};

/**
 * Creates a composite image: Source Image + Mask (Colored Red) overlaid.
 * This effectively "burns" the mask into the image for the Pro model to see.
 */
const createCompositeImage = async (source: FileData, mask: FileData): Promise<string> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject(new Error("Cannot create canvas context"));
            return;
        }

        const imgSource = new Image();
        const imgMask = new Image();

        // Handle CORS if needed, though FileData usually comes from local or data URI
        imgSource.crossOrigin = "Anonymous";
        imgMask.crossOrigin = "Anonymous";

        imgSource.onload = () => {
            canvas.width = imgSource.width;
            canvas.height = imgSource.height;
            
            // 1. Draw Source Image
            ctx.drawImage(imgSource, 0, 0);

            imgMask.onload = () => {
                // 2. Prepare the Mask Layer (Tint it RED)
                // Create a temporary canvas to colorize the mask
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tempCtx = tempCanvas.getContext('2d');
                
                if (tempCtx) {
                    // Draw the white mask
                    tempCtx.drawImage(imgMask, 0, 0, canvas.width, canvas.height);
                    
                    // Composite operation to tint non-transparent pixels to RED
                    tempCtx.globalCompositeOperation = 'source-in';
                    tempCtx.fillStyle = '#FF0000'; // Pure Red
                    tempCtx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // 3. Draw the Red Mask onto the Main Canvas
                    ctx.drawImage(tempCanvas, 0, 0);
                }

                // Return Base64 of the combined image
                resolve(canvas.toDataURL('image/jpeg', 0.95).split(',')[1]);
            };
            
            imgMask.onerror = (e) => reject(new Error("Failed to load mask image for compositing"));
            imgMask.src = mask.objectURL || `data:${mask.mimeType};base64,${mask.base64}`;
        };

        imgSource.onerror = (e) => reject(new Error("Failed to load source image for compositing"));
        imgSource.src = source.objectURL || `data:${source.mimeType};base64,${source.base64}`;
    });
};

// --- HELPER: Process Response ---

const processContentResponseAsync = async (response: any): Promise<string[]> => {
    const images: string[] = [];
    
    if (response && response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        
        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
             if (['SAFETY', 'BLOCKLIST', 'PROHIBITED_CONTENT'].includes(candidate.finishReason)) {
                 throw new Error(`AI từ chối xử lý do vi phạm an toàn: ${candidate.finishReason}`);
             }
        }

        if (candidate.content?.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData) {
                    const mime = part.inlineData.mimeType || 'image/png';
                    const blobUrl = await base64ToBlobUrlAsync(part.inlineData.data, mime);
                    images.push(blobUrl);
                }
            }
        }
    }

    if (images.length === 0) {
        // Fix: Guideline recommends using response.text for direct text extraction.
        // Also safeguard against undefined response
        const text = response?.text;
        if (text) {
             throw new Error(`AI phản hồi văn bản nhưng không có ảnh: "${text.substring(0, 200)}...". Vui lòng thử lại với mô tả rõ ràng hơn hoặc đổi sang chế độ 2K/4K.`);
        }
        throw new Error("Không có ảnh nào được tạo ra. Vui lòng thử lại với mô tả khác.");
    }

    return images;
};

// Helper for error handling
const handleGeminiError = (e: any) => {
    let msg = e.message || e.toString();
    
    // Scrub potential API Key from raw string
    msg = scrubErrorText(msg);

    if (msg.startsWith('{') && msg.includes('"error"')) {
        try {
            const parsed = JSON.parse(msg);
            if (parsed.error) {
                if (parsed.error.message) msg = scrubErrorText(parsed.error.message);
                if (parsed.error.code === 503 || parsed.error.status === 'UNAVAILABLE') {
                    throw new Error("Hệ thống AI đang quá tải (Model Overloaded). Đã thử lại 3 lần nhưng chưa thành công. Vui lòng đợi 1-2 phút.");
                }
            }
        } catch (err) {}
    }

    // Fix: Handle specific error for mandatory key selection as per guidelines.
    if (msg.includes('Requested entity was not found.')) {
        throw new Error("Lỗi: Không tìm thấy thực thể yêu cầu. Vui lòng thử lại sau.");
    }

    if (msg.includes('503') || msg.includes('overloaded') || msg.includes('UNAVAILABLE')) {
        throw new Error("Hệ thống AI đang quá tải (Model Overloaded). Vui lòng thử lại sau 1-2 phút.");
    }
    
    if (msg.includes('403') || msg.includes('location') || msg.includes('User location is not supported')) {
        throw new Error("Lỗi: IP không được hỗ trợ. Vui lòng bật VPN hoặc đổi vùng.");
    }
    
    if (msg.includes('suspended') || msg.includes('API_KEY_INVALID') || (msg.includes('400') && msg.includes('API key'))) {
        throw new Error("Lỗi: API Key hiện tại gặp sự cố hoặc bị tạm ngưng. Hệ thống đang tự động điều chuyển, vui lòng thử lại sau giây lát.");
    }

    if (msg.includes('429') || msg.includes('quota') || msg.includes('exhausted') || msg.includes('Resource has been exhausted')) {
        throw new Error("Hệ thống đang bận (Quota Exceeded). Vui lòng thử lại sau giây lát.");
    }

    if (msg.includes('413') || msg.includes('Too Large') || msg.includes('too large') || msg.includes('limit')) {
        throw new Error("Dữ liệu ảnh quá lớn so với giới hạn xử lý của AI. Vui lòng giảm kích thước ảnh hoặc nén ảnh trước khi tải lên.");
    }
    
    if (msg.includes('500') || msg.includes('Internal error')) {
        throw new Error("Máy chủ Google gặp lỗi nội bộ. Vui lòng thử lại sau vài giây.");
    }
    
    if (msg.includes('400') || msg.includes('INVALID_ARGUMENT')) {
        throw new Error("Dữ liệu ảnh không hợp lệ hoặc bị hỏng. Vui lòng thử lại với một ảnh khác.");
    }
    
    throw new Error(msg);
};

// --- RETRY LOGIC WRAPPER ---
const retryOperation = async <T>(operation: () => Promise<T>, retries = 2, delay = 2000): Promise<T> => {
    try {
        return await operation();
    } catch (error: any) {
        const msg = error.message || JSON.stringify(error);
        
        const shouldRetry = 
            msg.includes('503') || 
            msg.includes('overloaded') || 
            msg.includes('UNAVAILABLE') || 
            msg.includes('500') || 
            msg.includes('Internal error') ||
            msg.includes('suspended') || // Retry with a potentially different key from rotate logic
            msg.includes('429') || 
            msg.includes('exhausted');

        if (retries > 0 && shouldRetry) {
            console.warn(`[AI Service] Gặp lỗi: "${scrubErrorText(msg)}". Đang thử lại... (Còn ${retries} lần)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryOperation(operation, retries - 1, delay * 2);
        }
        
        throw error;
    }
};

// --- GENERATION FUNCTIONS ---

export const generateStandardImage = async (
    prompt: string, 
    aspectRatio: AspectRatio, 
    numberOfImages: number, 
    sourceImage?: FileData,
    jobId?: string
): Promise<string[]> => {
    // Acquire dynamic client
    const ai = await getDynamicAIClient();
    const model = 'gemini-2.5-flash-image';

    const parts: any[] = [{ text: prompt }];
    if (sourceImage) {
        parts.push({
            inlineData: {
                mimeType: sourceImage.mimeType,
                data: sourceImage.base64
            }
        });
    }

    const promises = Array.from({ length: numberOfImages }).map(async () => {
        return retryOperation(async () => {
            try {
                const response = await ai.models.generateContent({
                    model: model,
                    contents: { parts },
                    config: {
                        systemInstruction: "You are an AI image generation engine. Output only the generated visual result."
                    }
                });
                return await processContentResponseAsync(response);
            } catch (e: any) {
                throw e; 
            }
        });
    });

    try {
        const results = await Promise.all(promises);
        return results.flat();
    } catch (e: any) {
        handleGeminiError(e);
        return [];
    }
};

export const generateHighQualityImage = async (
    prompt: string, 
    aspectRatio: AspectRatio, 
    resolution: ImageResolution, 
    sourceImage?: FileData,
    jobId?: string,
    referenceImages?: FileData[],
    maskImage?: FileData
): Promise<string[]> => {
    // Acquire dynamic client
    const ai = await getDynamicAIClient();
    const model = 'gemini-3-pro-image-preview';

    let finalPrompt = prompt;
    const parts: any[] = [];
    
    // --- SPECIAL HANDLING FOR MASKING IN PRO MODEL ---
    if (maskImage && sourceImage) {
        try {
            const compositeBase64 = await createCompositeImage(sourceImage, maskImage);
            parts.push({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: compositeBase64
                }
            });
            finalPrompt = `
                I have provided an image where a specific area is marked with a RED overlay. 
                Your task is to EDIT the image by modifying ONLY the area covered by the RED mask.
                Instructions:
                1. Identify the red overlaid area.
                2. Replace the content of that red area based on this request: "${prompt}".
                3. Ensure the new content matches the lighting, perspective, and style seamlessly.
                4. Completely remove the red overlay in the final result.
                5. Do NOT modify any part outside the red area.
            `;
        } catch (e) {
            console.error("Failed to create composite image", e);
            throw new Error("Lỗi xử lý vùng chọn ảnh.");
        }
    } else {
        if (sourceImage) {
            parts.push({
                inlineData: {
                    mimeType: sourceImage.mimeType,
                    data: sourceImage.base64
                }
            });
        }
    }

    parts.push({ text: finalPrompt });

    if (referenceImages && referenceImages.length > 0) {
        referenceImages.forEach(ref => {
            parts.push({
                inlineData: {
                    mimeType: ref.mimeType,
                    data: ref.base64
                }
            });
        });
    }

    return retryOperation(async () => {
        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: { parts },
                config: {
                    systemInstruction: "You are a professional architectural renderer. Output only high-quality images.",
                    imageConfig: {
                        aspectRatio: aspectRatio,
                        imageSize: resolution === 'Standard' ? '1K' : resolution
                    }
                }
            });
            return await processContentResponseAsync(response);
        } catch (e: any) {
            handleGeminiError(e);
            throw e;
        }
    });
};

export const editImage = async (
    prompt: string, 
    image: FileData, 
    numberOfImages: number = 1
): Promise<{ imageUrl: string }[]> => {
    const urls = await generateStandardImage(prompt, '1:1', numberOfImages, image);
    return urls.map(url => ({ imageUrl: url }));
};

export const editImageWithMask = async (
    prompt: string, 
    image: FileData, 
    mask: FileData, 
    numberOfImages: number = 1
): Promise<{ imageUrl: string }[]> => {
    const ai = await getDynamicAIClient();
    const model = 'gemini-2.5-flash-image';
    
    const parts = [
        { text: `Edit the first image based on the second mask image (white area is the edit zone). Instruction: ${prompt}` },
        { inlineData: { mimeType: image.mimeType, data: image.base64 } },
        { inlineData: { mimeType: mask.mimeType, data: mask.base64 } }
    ];

    const promises = Array.from({ length: numberOfImages }).map(async () => {
        return retryOperation(async () => {
            try {
                const response = await ai.models.generateContent({
                    model: model,
                    contents: { parts },
                    config: {
                        systemInstruction: "You are an expert image editor. Output only the modified image."
                    }
                });
                return await processContentResponseAsync(response);
            } catch (e: any) {
                throw e;
            }
        });
    });

    try {
        const results = await Promise.all(promises);
        return results.flat().map(url => ({ imageUrl: url }));
    } catch (e: any) {
        handleGeminiError(e);
        return [];
    }
};

export const editImageWithReference = async (
    prompt: string, 
    sourceImage: FileData | null, 
    referenceImage: FileData | null, 
    numberOfImages: number = 1
): Promise<{ imageUrl: string }[]> => {
    const ai = await getDynamicAIClient();
    const model = 'gemini-2.5-flash-image';
    
    const parts: any[] = [{ text: prompt }];
    if (sourceImage) parts.push({ inlineData: { mimeType: sourceImage.mimeType, data: sourceImage.base64 } });
    if (referenceImage) parts.push({ inlineData: { mimeType: referenceImage.mimeType, data: referenceImage.base64 } });

    const promises = Array.from({ length: numberOfImages }).map(async () => {
        return retryOperation(async () => {
            try {
                const response = await ai.models.generateContent({
                    model: model,
                    contents: { parts },
                    config: {
                        systemInstruction: "Output only image data."
                    }
                });
                return await processContentResponseAsync(response);
            } catch (e: any) {
                throw e;
            }
        });
    });

    try {
        const results = await Promise.all(promises);
        return results.flat().map(url => ({ imageUrl: url }));
    } catch (e: any) {
        handleGeminiError(e);
        return [];
    }
};

export const editImageWithMaskAndReference = async (
    prompt: string, 
    sourceImage: FileData, 
    maskImage: FileData, 
    referenceImage: FileData, 
    numberOfImages: number = 1
): Promise<{ imageUrl: string }[]> => {
    const ai = await getDynamicAIClient();
    const model = 'gemini-2.5-flash-image';
    
    const parts: any[] = [
        { text: prompt },
        { inlineData: { mimeType: sourceImage.mimeType, data: sourceImage.base64 } },
        { inlineData: { mimeType: maskImage.mimeType, data: maskImage.base64 } },
        { inlineData: { mimeType: referenceImage.mimeType, data: referenceImage.base64 } }
    ];

    const promises = Array.from({ length: numberOfImages }).map(async () => {
        return retryOperation(async () => {
            try {
                const response = await ai.models.generateContent({
                    model: model,
                    contents: { parts },
                    config: {
                        systemInstruction: "Output only image data."
                    }
                });
                return await processContentResponseAsync(response);
            } catch (e: any) {
                throw e;
            }
        });
    });

    try {
        const results = await Promise.all(promises);
        return results.flat().map(url => ({ imageUrl: url }));
    } catch (e: any) {
        handleGeminiError(e);
        return [];
    }
};

export const editImageWithMultipleReferences = async (
    prompt: string,
    sourceImage: FileData,
    referenceImages: FileData[],
    numberOfImages: number = 1
): Promise<{ imageUrl: string }[]> => {
    const ai = await getDynamicAIClient();
    const model = 'gemini-2.5-flash-image';
    
    const parts: any[] = [{ text: prompt }];
    parts.push({ inlineData: { mimeType: sourceImage.mimeType, data: sourceImage.base64 } });
    
    referenceImages.forEach(ref => {
        parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.base64 } });
    });

    const promises = Array.from({ length: numberOfImages }).map(async () => {
        return retryOperation(async () => {
            try {
                const response = await ai.models.generateContent({
                    model: model,
                    contents: { parts },
                    config: {
                        systemInstruction: "Output only image data."
                    }
                });
                return await processContentResponseAsync(response);
            } catch (e: any) {
                throw e;
            }
        });
    });

    try {
        const results = await Promise.all(promises);
        return results.flat().map(url => ({ imageUrl: url }));
    } catch (e: any) {
        handleGeminiError(e);
        return [];
    }
}

export const editImageWithMaskAndMultipleReferences = async (
    prompt: string,
    sourceImage: FileData,
    maskImage: FileData,
    referenceImages: FileData[],
    numberOfImages: number = 1
): Promise<{ imageUrl: string }[]> => {
    const ai = await getDynamicAIClient();
    const model = 'gemini-2.5-flash-image';
    
    const parts: any[] = [{ text: prompt }];
    parts.push({ inlineData: { mimeType: sourceImage.mimeType, data: sourceImage.base64 } });
    parts.push({ inlineData: { mimeType: maskImage.mimeType, data: maskImage.base64 } });
    
    referenceImages.forEach(ref => {
        parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.base64 } });
    });

    const promises = Array.from({ length: numberOfImages }).map(async () => {
        return retryOperation(async () => {
            try {
                const response = await ai.models.generateContent({
                    model: model,
                    contents: { parts },
                    config: {
                        systemInstruction: "Output only image data."
                    }
                });
                return await processContentResponseAsync(response);
            } catch (e: any) {
                throw e;
            }
        });
    });

    try {
        const results = await Promise.all(promises);
        return results.flat().map(url => ({ imageUrl: url }));
    } catch (e: any) {
        handleGeminiError(e);
        return [];
    }
}

// --- TEXT GENERATION FUNCTIONS ---

export const generateText = async (prompt: string): Promise<string> => {
    const ai = await getDynamicAIClient();
    const model = 'gemini-3-flash-preview';
    
    return retryOperation(async () => {
        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: [{ parts: [{ text: prompt }] }]
            });
            return response.text || "";
        } catch (e: any) {
            handleGeminiError(e);
            throw e;
        }
    });
};

export const generatePromptSuggestions = async (
    image: FileData, 
    subject: string, 
    count: number,
    customInstruction: string = ''
): Promise<Record<string, string[]> | null> => {
    const ai = await getDynamicAIClient();
    const model = 'gemini-3-flash-preview';
    
    const allCategories = [
        "Góc toàn cảnh", 
        "Góc trung cảnh", 
        "Góc lấy nét", 
        "Chi tiết kiến trúc"
    ];

    let systemPrompt = "";

    if (subject === 'all') {
        systemPrompt = `Analyze the provided image and generate prompt suggestions for EACH of the following 4 categories: ${allCategories.join(', ')}. 
        For each category, provide exactly ${count} distinct prompts in Vietnamese.`;
    } else {
        systemPrompt = `Analyze the provided image and generate exactly ${count} distinct prompt suggestions focusing specifically on the category: "${subject}".`;
    }

    const fullPrompt = `${systemPrompt}
    ${customInstruction ? `Additional user requirement: ${customInstruction}` : ''}
    
    IMPORTANT FORMATTING RULES:
    1. Language: Vietnamese.
    2. **Conciseness**: Each prompt must be short and impactful (approx 2-4 lines of text).
    3. **Structure**: Combine all details (lighting, angle, materials, mood) into **ONE single, coherent sentence** or a short paragraph. Do NOT use bullet points or lists within a suggestion.
    4. **Goal**: Create a prompt suitable for "View Sync" (consistent style transfer).

    RETURN FORMAT: Strictly a raw JSON object (no markdown, no code blocks).
    Keys must be the category names.
    Values must be arrays of strings (the prompts).
    `;

    return retryOperation(async () => {
        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: {
                    parts: [
                        { text: fullPrompt },
                        { inlineData: { mimeType: image.mimeType, data: image.base64 } }
                    ]
                },
                config: { 
                    responseMimeType: "application/json"
                }
            });

            const text = response.text || "{}";
            return JSON.parse(text);
        } catch (e: any) {
            console.error("Failed to generate/parse suggestions", e);
            return null; 
        }
    });
};

export const enhancePrompt = async (userInput: string, image?: FileData): Promise<string> => {
    const ai = await getDynamicAIClient();
    const model = 'gemini-3-flash-preview';
    
    const parts: any[] = [{ text: `Act as an expert architectural prompt engineer. Enhance the following user input into a detailed, professional prompt suitable for high-quality AI rendering (like Midjourney or Gemini). Focus on lighting, materials, atmosphere, and camera specifications. \n\nUser Input: "${userInput}"` }];
    
    if (image) {
        parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
        parts[0].text += " \n\nAlso use the visual style of the attached image as a reference.";
    }

    return retryOperation(async () => {
        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: { parts }
            });
            return response.text || "";
        } catch (e: any) {
            handleGeminiError(e);
            throw e;
        }
    });
};

// --- VIDEO PROMPT GENERATION ---
export const generateVideoPromptFromImage = async (image: FileData): Promise<string> => {
    const ai = await getDynamicAIClient();
    const model = 'gemini-3-flash-preview';
    
    const prompt = `Phân tích hình ảnh kiến trúc hoặc nội thất này. Hãy viết một prompt (lời nhắc) bằng Tiếng Việt thật chi tiết, đậm chất điện ảnh để tạo video ngắn từ hình ảnh này bằng AI. 
    Tập trung mô tả chuyển động camera, thay đổi ánh sáng, và các yếu tố khí quyển. Giữ prompt dưới 60 từ.
    QUAN TRỌNG: CHỈ TRẢ VỀ NỘI DUNG PROMPT BẰNG TIẾNG VIỆT.`;

    return retryOperation(async () => {
        try {
            const response = await ai.models.generateContent({
                model: model,
                contents: {
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: image.mimeType, data: image.base64 } }
                    ]
                }
            });
            return response.text?.trim() || "Video kiến trúc điện ảnh with chuyển động camera chậm.";
        } catch (e: any) {
            console.error("Failed to generate video prompt from image", e);
            return "Video kiến trúc điện ảnh with chuyển động camera chậm.";
        }
    });
};

// --- VIDEO GENERATION ---
export const generateVideo = async (prompt: string, startImage?: FileData, jobId?: string): Promise<string> => {
    throw new Error("Please use the specialized Video Generation service.");
};

export const generateStagingImage = async (prompt: string, sceneImage: FileData, objectImages: FileData[], numberOfImages: number = 1): Promise<{ imageUrl: string }[]> => {
    const ai = await getDynamicAIClient();
    const model = 'gemini-2.5-flash-image';
    
    const parts: any[] = [{ text: prompt }];
    parts.push({ inlineData: { mimeType: sceneImage.mimeType, data: sceneImage.base64 } });
    
    objectImages.forEach(obj => {
        parts.push({ inlineData: { mimeType: obj.mimeType, data: obj.base64 } });
    });

    const promises = Array.from({ length: numberOfImages }).map(async () => {
        return retryOperation(async () => {
            try {
                const response = await ai.models.generateContent({
                    model: model,
                    contents: { parts },
                    config: {
                        systemInstruction: "You are a professional stager. Output only the modified image data."
                    }
                });
                return await processContentResponseAsync(response);
            } catch (e: any) {
                throw e;
            }
        });
    });

    try {
        const results = await Promise.all(promises);
        return results.flat().map(url => ({ imageUrl: url }));
    } catch (e: any) {
        handleGeminiError(e);
        return [];
    }
};
