
import { GoogleGenAI, Modality, Operation, GenerateVideosResponse, Type, GenerateContentResponse } from "@google/genai";
import { AspectRatio, FileData, ImageResolution } from "../types";
import { supabase } from "./supabaseClient";
import { updateJobApiKey } from "./jobService";

// --- HELPER: Strict Error Parsing & Formatting ---
const formatError = (error: any): string => {
    let status: string | number = 'ERR';
    let shortMsg = "Lỗi dịch vụ"; // Default

    // 1. Extract status code from various sources
    if (error) {
        // Try parsing JSON string if it looks like one
        if (typeof error === 'string' && (error.trim().startsWith('{') || error.trim().startsWith('['))) {
            try {
                const parsed = JSON.parse(error);
                if (parsed.error) {
                    status = parsed.error.code || parsed.error.status || status;
                } else if (parsed.code) {
                    status = parsed.code;
                }
            } catch (e) {}
        }
        // Direct object properties
        else if (typeof error === 'object') {
            if (error.status) status = error.status;
            if (error.code) status = error.code;
            if (error.error?.code) status = error.error.code;
            if (error.error?.status) status = error.error.status;
        }
    }

    // 2. Normalize and Map Status to Short Message
    const statusStr = String(status);
    const rawMsg = JSON.stringify(error).toLowerCase();

    if (statusStr == '403' || statusStr === 'PERMISSION_DENIED' || rawMsg.includes('permission') || rawMsg.includes('403')) {
        status = 403;
        shortMsg = "Lỗi quyền truy cập";
    } else if (statusStr == '429' || statusStr === 'RESOURCE_EXHAUSTED' || rawMsg.includes('quota') || rawMsg.includes('exhausted') || rawMsg.includes('429')) {
        status = 429;
        shortMsg = "Hệ thống bận";
    } else if (statusStr == '503' || statusStr === 'UNAVAILABLE' || rawMsg.includes('overloaded') || rawMsg.includes('unavailable') || rawMsg.includes('503')) {
        status = 503;
        shortMsg = "Máy chủ quá tải";
    } else if (statusStr == '400' || statusStr === 'INVALID_ARGUMENT' || rawMsg.includes('invalid') || rawMsg.includes('bad request') || rawMsg.includes('400')) {
        status = 400;
        shortMsg = "Dữ liệu không hợp lệ";
    } else if (statusStr === 'SAFE' || rawMsg.includes('safety') || rawMsg.includes('blocked')) {
        status = 'SAFE';
        shortMsg = "Nội dung bị chặn";
    } else if (rawMsg.includes('fetch') || rawMsg.includes('network') || rawMsg.includes('failed to fetch')) {
        status = 'NET';
        shortMsg = "Lỗi kết nối mạng";
    } else if (rawMsg.includes('system_busy')) {
        status = 'BUSY';
        shortMsg = "Tài nguyên bận";
    }

    // 3. Return Strict Format
    return `[${status}] ${shortMsg}. Vui lòng thử lại sau.`;
};

const markKeyAsExhausted = async (key: string) => {
    try {
        if (key && key.length > 10) {
            // Fire and forget
            supabase.rpc('mark_key_exhausted', { key_val: key }).then(() => {});
        }
    } catch (e) {}
};

const getAIClient = async (jobId?: string): Promise<{ ai: GoogleGenAI, key: string }> => {
    try {
        if (!supabase) throw new Error("SYSTEM_BUSY"); 

        const { data: apiKey, error } = await supabase.rpc('get_worker_key');

        if (error || !apiKey) {
            console.warn("[Gemini] No key available");
            throw new Error("SYSTEM_BUSY");
        }

        if (jobId) {
            await updateJobApiKey(jobId, apiKey);
        }

        return { 
            ai: new GoogleGenAI({ apiKey: apiKey }),
            key: apiKey
        };
    } catch (e: any) {
        throw e;
    }
};

async function withSmartRetry<T>(
    operation: (ai: GoogleGenAI, currentKey: string) => Promise<T>, 
    jobId?: string,
    maxRetries: number = 15 
): Promise<T> {
    let lastError: any;
    let attempts = 0;
    const failedKeys = new Set<string>(); 

    while (attempts < maxRetries) {
        let currentKey = "";

        try {
            const client = await getAIClient(jobId);
            currentKey = client.key;

            if (failedKeys.has(currentKey)) {
                 await markKeyAsExhausted(currentKey); 
                 attempts++;
                 continue; 
            }

            const result = await operation(client.ai, currentKey);
            return result;

        } catch (error: any) {
             lastError = error;
             
             // Quick check for error type to decide retry strategy
             const errStr = JSON.stringify(error).toLowerCase();
             const isQuota = errStr.includes('429') || errStr.includes('quota') || errStr.includes('exhausted');
             const isSystemBusy = error.message === "SYSTEM_BUSY";
             const isSafety = errStr.includes('safety') || errStr.includes('blocked');
             const isPermission = errStr.includes('403') || errStr.includes('permission');

             // Critical errors - Stop immediately
             if (isSafety) throw new Error(formatError({ status: 'SAFE', message: 'Safety blocked' }));
             
             // If it's a key permission error (403), mark key and retry
             if (isPermission) {
                 if (currentKey) {
                     await markKeyAsExhausted(currentKey);
                     failedKeys.add(currentKey);
                 }
                 attempts++;
                 continue;
             }

             if (isSystemBusy) {
                 await new Promise(r => setTimeout(r, 2000));
                 attempts++;
                 continue; 
             }

             if (isQuota) {
                 if (currentKey) {
                     await markKeyAsExhausted(currentKey);
                     failedKeys.add(currentKey);
                 }
                 await new Promise(r => setTimeout(r, 1500));
                 attempts++;
                 continue; 
             }
             
             // Generic retry
             attempts++; 
             await new Promise(r => setTimeout(r, 1000));
        }
    }

    // Throw finalized formatted error
    throw new Error(formatError(lastError));
}

// --- GENERATION FUNCTIONS ---

export const generateStandardImage = async (
    prompt: string, 
    aspectRatio: AspectRatio, 
    numberOfImages: number = 1, 
    sourceImage?: FileData,
    jobId?: string
): Promise<string[]> => {
    return withSmartRetry(async (ai) => {
        const parts: any[] = [];
        if (sourceImage) {
            parts.push({
                inlineData: { mimeType: sourceImage.mimeType, data: sourceImage.base64 }
            });
        }
        parts.push({ text: prompt });

        const promises = Array.from({ length: numberOfImages }).map(async () => {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config: { 
                    responseModalities: [Modality.IMAGE],
                    imageConfig: { aspectRatio: aspectRatio } 
                },
            });
            
            let imageUrl = '';
            if (response.candidates?.[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    }
                }
            }
            if (!imageUrl) throw new Error("No image data returned");
            return imageUrl;
        });
        return Promise.all(promises);
    }, jobId);
};

export const generateHighQualityImage = async (
    prompt: string, 
    aspectRatio: AspectRatio, 
    resolution: ImageResolution,
    sourceImage?: FileData,
    jobId?: string,
    referenceImages?: FileData[]
): Promise<string[]> => {
    return withSmartRetry(async (ai) => {
        const contents: any = { parts: [] };
        if (sourceImage) {
            contents.parts.push({
                inlineData: { mimeType: sourceImage.mimeType, data: sourceImage.base64 }
            });
        }
        if (referenceImages && referenceImages.length > 0) {
            referenceImages.forEach(img => {
                contents.parts.push({
                    inlineData: { mimeType: img.mimeType, data: img.base64 }
                });
            });
        }
        if (sourceImage || (referenceImages && referenceImages.length > 0)) {
             contents.parts.push({ text: `${prompt}. Maintain composition/style from provided images.` });
        } else {
             contents.parts.push({ text: prompt });
        }

        const imageSize = (resolution === 'Standard' ? '1K' : resolution) as "1K" | "2K" | "4K";

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: contents,
            config: {
                imageConfig: { aspectRatio: aspectRatio, imageSize: imageSize }
            },
        });

        const images: string[] = [];
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                }
            }
        }
        if (images.length === 0) throw new Error("No image data returned");
        return images;
    }, jobId);
};

export const generateVideo = async (prompt: string, startImage?: FileData, jobId?: string): Promise<string> => {
    return withSmartRetry(async (ai, key) => {
        let finalPrompt = prompt;
        let imagePayload = undefined;

        if (startImage) {
            finalPrompt = `Animate the provided image: "${prompt}"`;
            imagePayload = {
                imageBytes: startImage.base64,
                mimeType: startImage.mimeType,
            };
        }

        // @ts-ignore
        let operation: Operation<GenerateVideosResponse> = await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: finalPrompt,
            image: imagePayload as any, 
            config: { numberOfVideos: 1 }
        });
        
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }
        
        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!videoUri) throw new Error("No video URI");
        
        const videoResponse = await fetch(`${videoUri}&key=${key}`);
        if (!videoResponse.ok) throw new Error("Download failed");
        
        const blob = await videoResponse.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    }, jobId);
};

// --- EDIT HELPER ---
const generateGeminiEdit = async (parts: any[], numberOfImages: number, jobId?: string): Promise<{imageUrl: string, text: string}[]> => {
    return withSmartRetry(async (ai) => {
        const promises = Array.from({ length: numberOfImages }).map(async () => {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config: { responseModalities: [Modality.IMAGE] },
            });
            let imageUrl = '';
            const part = response.candidates?.[0]?.content?.parts?.[0];
            if (part?.inlineData) {
                imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
            if (!imageUrl) throw new Error("No image returned");
            return { imageUrl, text: '' };
        });
        return Promise.all(promises);
    }, jobId);
};

export const editImage = async (prompt: string, image: FileData, numberOfImages: number = 1, jobId?: string) => {
    return generateGeminiEdit([
        { inlineData: { data: image.base64, mimeType: image.mimeType } },
        { text: prompt },
    ], numberOfImages, jobId);
};

export const editImageWithMask = async (prompt: string, image: FileData, mask: FileData, numberOfImages: number = 1, jobId?: string) => {
    return generateGeminiEdit([
        { inlineData: { data: image.base64, mimeType: image.mimeType } },
        { inlineData: { data: mask.base64, mimeType: mask.mimeType } },
        { text: prompt },
    ], numberOfImages, jobId);
};

export const editImageWithReference = async (prompt: string, source: FileData, ref: FileData, numberOfImages: number = 1, jobId?: string) => {
    return generateGeminiEdit([
        { inlineData: { data: source.base64, mimeType: source.mimeType } },
        { inlineData: { data: ref.base64, mimeType: ref.mimeType } },
        { text: prompt },
    ], numberOfImages, jobId);
};

export const editImageWithMaskAndReference = async (prompt: string, source: FileData, mask: FileData, ref: FileData, numberOfImages: number = 1, jobId?: string) => {
    return generateGeminiEdit([
        { inlineData: { data: source.base64, mimeType: source.mimeType } },
        { inlineData: { data: mask.base64, mimeType: mask.mimeType } },
        { inlineData: { data: ref.base64, mimeType: ref.mimeType } },
        { text: prompt },
    ], numberOfImages, jobId);
};

export const editImageWithMultipleReferences = async (prompt: string, source: FileData, refs: FileData[], numberOfImages: number = 1, jobId?: string) => {
    const parts: any[] = [{ inlineData: { data: source.base64, mimeType: source.mimeType } }];
    refs.forEach(r => parts.push({ inlineData: { data: r.base64, mimeType: r.mimeType } }));
    parts.push({ text: prompt });
    return generateGeminiEdit(parts, numberOfImages, jobId);
};

export const editImageWithMaskAndMultipleReferences = async (prompt: string, source: FileData, mask: FileData, refs: FileData[], numberOfImages: number = 1, jobId?: string) => {
    const parts: any[] = [
        { inlineData: { data: source.base64, mimeType: source.mimeType } },
        { inlineData: { data: mask.base64, mimeType: mask.mimeType } }
    ];
    refs.forEach(r => parts.push({ inlineData: { data: r.base64, mimeType: r.mimeType } }));
    parts.push({ text: prompt });
    return generateGeminiEdit(parts, numberOfImages, jobId);
};

export const generateStagingImage = async (prompt: string, scene: FileData, objects: FileData[], numberOfImages: number = 1, jobId?: string) => {
    const parts: any[] = [{ inlineData: { data: scene.base64, mimeType: scene.mimeType } }];
    objects.forEach(o => parts.push({ inlineData: { data: o.base64, mimeType: o.mimeType } }));
    parts.push({ text: prompt });
    return generateGeminiEdit(parts, numberOfImages, jobId);
};

export const generateText = async (prompt: string): Promise<string> => {
    return withSmartRetry(async (ai) => {
        const res = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] }
        });
        return res.text || '';
    });
};

export const generatePromptFromImageAndText = async (image: FileData, prompt: string): Promise<string> => {
    return withSmartRetry(async (ai) => {
        const res = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: image.base64, mimeType: image.mimeType } },
                    { text: `Analyze image. ${prompt}` }
                ]
            }
        });
        return res.text || '';
    });
};

export const enhancePrompt = async (prompt: string, image?: FileData): Promise<string> => {
    return withSmartRetry(async (ai) => {
        const parts: any[] = [];
        if (image) parts.push({ inlineData: { data: image.base64, mimeType: image.mimeType } });
        parts.push({ text: `Enhance this prompt for architecture: ${prompt}` });
        
        const res = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts }
        });
        return res.text || '';
    });
};

export const generateMoodboardPromptFromScene = async (image: FileData): Promise<string> => {
    return generatePromptFromImageAndText(image, "Create moodboard prompt.");
};

export const generatePromptSuggestions = async (image: FileData, subject: string, count: number, instruction: string): Promise<Record<string, string[]>> => {
    return withSmartRetry(async (ai) => {
        const prompt = `Analyze this image. Provide ${count} prompts based on "${subject}". ${instruction}. Output strictly JSON.`;
        const res = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: image.base64, mimeType: image.mimeType } },
                    { text: prompt }
                ]
            },
            config: { responseMimeType: 'application/json' }
        });
        try { return JSON.parse(res.text || '{}'); } catch { return {}; }
    });
};
