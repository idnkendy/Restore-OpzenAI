
import { supabase } from './supabaseClient';
import { GenerationJob } from '../types';
import { refundCredits } from './paymentService';

const BUCKET_NAME = 'assets';

const compressImage = async (blob: Blob): Promise<Blob> => {
    if (!blob.type.startsWith('image/')) return blob;
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 2048;
            let width = img.width;
            let height = img.height;
            if (width > MAX_SIZE || height > MAX_SIZE) {
                if (width > height) { height = Math.round(height * (MAX_SIZE / width)); width = MAX_SIZE; }
                else { width = Math.round(width * (MAX_SIZE / height)); height = MAX_SIZE; }
            }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(blob); return; }
            ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, width, height); ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((compressedBlob) => resolve(compressedBlob || blob), 'image/webp', 0.9);
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(blob); };
        img.src = url;
    });
};

const persistResultToStorage = async (userId: string, data: string): Promise<string | null> => {
    try {
        if (data.includes('supabase.co') && data.includes(BUCKET_NAME)) return data;
        let blob: Blob;
        let extension = 'webp';
        if (data.startsWith('data:')) {
            const arr = data.split(',');
            const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
            const bstr = atob(arr[1]);
            let n = bstr.length; const u8arr = new Uint8Array(n);
            while (n--) { u8arr[n] = bstr.charCodeAt(n); }
            blob = new Blob([u8arr], { type: mime });
        } else if (data.startsWith('blob:') || data.startsWith('http')) {
            const response = await fetch(data);
            blob = await response.blob();
            if (blob.type.startsWith('video')) extension = 'mp4';
        } else return data;

        if (blob.type.startsWith('image/')) { blob = await compressImage(blob); extension = 'webp'; }
        const fileName = `${userId}/jobs/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${extension}`;
        const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(fileName, blob, { cacheControl: '31536000', upsert: false, contentType: blob.type });
        if (uploadError) return null;
        const { data: publicData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
        return publicData.publicUrl;
    } catch (e) { return null; }
};

/**
 * TẠO JOB VỚI CƠ CHẾ RETRY
 */
export const createJob = async (jobData: Partial<GenerationJob>, retries = 2): Promise<string> => {
    try {
        // Dùng .select() thay vì .single() để tránh lỗi RLS False Positive
        const { data, error } = await supabase
            .from('generation_jobs')
            .insert([{ 
                ...jobData, 
                status: 'pending', 
                created_at: new Date().toISOString(), 
                updated_at: new Date().toISOString() 
            }])
            .select('id');
        
        if (error) {
            // Nếu lỗi do trễ khóa ngoại (Foreign Key), thử lại sau 1s
            if (retries > 0 && (error.code === '23503' || error.message.includes('foreign key'))) {
                console.warn("[JobService] FK Error, retrying...", error.message);
                await new Promise(r => setTimeout(r, 1000));
                return createJob(jobData, retries - 1);
            }
            throw error;
        }

        if (!data || data.length === 0) {
            throw new Error("Insert succeeded but no ID returned (RLS Issue)");
        }
        
        // Thành công: Xóa các marker giao dịch tạm thời
        localStorage.removeItem('opzen_last_charge_id');
        localStorage.removeItem('opzen_pending_tx');
        localStorage.removeItem('opzen_last_log_id');

        return data[0].id;
    } catch (e: any) { 
        console.error("[JobService] Critical Create Job Error:", e);
        throw new Error(e.message || "Không thể khởi tạo bản ghi công việc."); 
    }
};

export const updateJobStatus = async (jobId: string, status: 'pending' | 'processing' | 'completed' | 'failed', resultUrl?: string, errorMessage?: string) => {
    try {
        const updates: any = { status, updated_at: new Date().toISOString() };
        if (resultUrl) {
            const { data: jobData } = await supabase.from('generation_jobs').select('user_id').eq('id', jobId).single();
            if (jobData?.user_id) {
                const persistentUrl = await persistResultToStorage(jobData.user_id, resultUrl);
                updates.result_url = persistentUrl || resultUrl;
            } else updates.result_url = resultUrl;
        }
        if (errorMessage) updates.error_message = errorMessage;
        await supabase.from('generation_jobs').update(updates).eq('id', jobId);
    } catch (e) {}
};

export const getQueuePosition = async (jobId: string): Promise<number> => {
    try {
        const { data } = await supabase.from('generation_jobs').select('created_at').eq('id', jobId).single();
        if (!data) return 0;
        const { count } = await supabase.from('generation_jobs').select('*', { count: 'exact', head: true }).in('status', ['pending', 'processing']).lt('created_at', data.created_at);
        return (count || 0) + 1;
    } catch (e) { return 0; }
};
