
import { supabase } from './supabaseClient';
import { GenerationJob } from '../types';
import { refundCredits } from './paymentService';

export const createJob = async (jobData: Partial<GenerationJob>): Promise<string | null> => {
    try {
        const { data, error } = await supabase
            .from('generation_jobs')
            .insert([{
                ...jobData,
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])
            .select('id')
            .single();

        if (error) {
            // Log chi tiết lỗi thay vì [object Object]
            console.error("Error creating generation job:", error.message || JSON.stringify(error));
            return null;
        }
        return data.id;
    } catch (e: any) {
        console.error("Exception creating job:", e.message || e);
        return null;
    }
};

export const updateJobStatus = async (jobId: string, status: 'pending' | 'processing' | 'completed' | 'failed', resultUrl?: string, errorMessage?: string) => {
    try {
        const updates: any = {
            status,
            updated_at: new Date().toISOString()
        };

        if (resultUrl) updates.result_url = resultUrl;
        if (errorMessage) updates.error_message = errorMessage;

        const { error } = await supabase
            .from('generation_jobs')
            .update(updates)
            .eq('id', jobId);

        if (error) {
            console.error(`Error updating job ${jobId}:`, error.message || JSON.stringify(error));
        }
    } catch (e: any) {
        console.error(`Exception updating job ${jobId}:`, e.message || e);
    }
};

export const updateJobApiKey = async (jobId: string, apiKey: string) => {
    try {
        // Only update if jobId is provided
        if (!jobId) return;
        
        const { error } = await supabase
            .from('generation_jobs')
            .update({ api_key_used: apiKey })
            .eq('id', jobId);
            
        if (error) {
             // Sử dụng debug để tránh spam console nếu lỗi không quan trọng
             console.debug("Error logging API key usage:", error.message);
        }
            
    } catch (e) {
        console.error("Error logging API key usage:", e);
    }
};

export const getQueuePosition = async (jobId: string): Promise<number> => {
    try {
        // Get the created_at of the current job
        const { data: currentJob, error: fetchError } = await supabase
            .from('generation_jobs')
            .select('created_at')
            .eq('id', jobId)
            .single();

        if (fetchError || !currentJob) return 0;

        // Count jobs that are pending or processing and created before this one
        const { count, error } = await supabase
            .from('generation_jobs')
            .select('*', { count: 'exact', head: true })
            .in('status', ['pending', 'processing'])
            .lt('created_at', currentJob.created_at);

        if (error) return 0;
        
        // Position is count + 1 (yourself)
        return (count || 0) + 1;
    } catch (e) {
        return 0;
    }
};

export const cleanupStaleJobs = async (userId: string) => {
    try {
        // 15 minutes ago
        const cutoffTime = new Date(Date.now() - 15 * 60 * 1000).toISOString();

        // Find stuck jobs for this user
        const { data: staleJobs, error } = await supabase
            .from('generation_jobs')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'processing')
            .lt('updated_at', cutoffTime);

        if (error) {
            // Mã lỗi 42P01 là "relation does not exist" (bảng chưa tồn tại)
            // Bỏ qua lỗi này để tránh làm phiền người dùng nếu chưa setup bảng
            if (error.code === '42P01') {
                console.debug("[JobService] Table 'generation_jobs' not found. Skipping stale job cleanup.");
                return;
            }
            // Log rõ message lỗi
            console.error("Error fetching stale jobs:", error);
            return;
        }

        if (!staleJobs || staleJobs.length === 0) return;

        console.log(`[JobService] Found ${staleJobs.length} stale jobs. Cleaning up...`);

        for (const job of staleJobs) {
            // 1. Mark as failed
            await updateJobStatus(job.id, 'failed', undefined, 'System Timeout: Processing took longer than 15 minutes.');

            // 2. Refund
            if (job.cost > 0) {
                console.log(`[JobService] Refunding ${job.cost} credits for job ${job.id}`);
                await refundCredits(job.user_id, job.cost, `Hoàn tiền: Tác vụ bị treo (Job ID: ${job.id.substring(0, 8)}...)`);
            }
        }
    } catch (e: any) {
        console.error("Error cleaning up stale jobs:", e);
    }
};
