
import React from 'react';
import { VideoGeneratorState } from '../state/toolState';
import { FileData, Tool } from '../types';
import * as externalVideoService from '../services/externalVideoService';
import * as historyService from '../services/historyService';
import * as jobService from '../services/jobService';
import { refundCredits } from '../services/paymentService';
import Spinner from './Spinner';
import ImageUpload from './common/ImageUpload';
import { supabase } from '../services/supabaseClient';
import AspectRatioSelector from './common/AspectRatioSelector';

interface VideoGeneratorProps {
    state: VideoGeneratorState;
    onStateChange: (newState: Partial<VideoGeneratorState>) => void;
    userCredits?: number;
    onDeductCredits?: (amount: number, description: string) => Promise<string>;
}

const VideoGenerator: React.FC<VideoGeneratorProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits }) => {
    const { prompt, startImage, isLoading, error, generatedVideoUrl, aspectRatio } = state;

    const handleFileSelect = (fileData: FileData | null) => {
        onStateChange({ startImage: fileData, generatedVideoUrl: null });
    };

    const handleAspectRatioChange = (val: any) => {
        // Map common AspectRatio type to VideoGeneratorState specific type if needed
        // Assuming val matches '16:9' | '9:16' | 'default' or similar
        onStateChange({ aspectRatio: val });
    };

    const handleGenerate = async () => {
        if (onDeductCredits && userCredits < 5) {
             onStateChange({ error: "Bạn không đủ credits. Cần 5 credits." });
             return;
        }
        if (!prompt) {
            onStateChange({ error: 'Vui lòng nhập mô tả.' });
            return;
        }

        onStateChange({ isLoading: true, error: null, generatedVideoUrl: null });
        let jobId: string | null = null;
        let logId: string | null = null;

        try {
            if (onDeductCredits) {
                logId = await onDeductCredits(5, "Tạo Video (Embedded)");
            }
            
            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId) {
                 jobId = await jobService.createJob({
                    user_id: user.id,
                    tool_id: Tool.VideoGeneration,
                    prompt: prompt,
                    cost: 5,
                    usage_log_id: logId
                });
            }
            
            if (jobId) await jobService.updateJobStatus(jobId, 'processing');

            const result = await externalVideoService.generateVideoExternal(
                prompt, 
                "", 
                startImage || undefined, 
                aspectRatio
            );

            onStateChange({ generatedVideoUrl: result.videoUrl });
            
            if (jobId) await jobService.updateJobStatus(jobId, 'completed', result.videoUrl);
            
            historyService.addToHistory({
                tool: Tool.VideoGeneration,
                prompt: prompt,
                sourceImageURL: startImage?.objectURL,
                resultVideoURL: result.videoUrl
            });

        } catch (err: any) {
            const msg = err.message || "Lỗi tạo video";
            onStateChange({ error: msg });
            
            if (jobId) await jobService.updateJobStatus(jobId, 'failed', undefined, msg);
            
            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId) {
                await refundCredits(user.id, 5, `Hoàn tiền: Lỗi tạo video (${msg})`);
            }
        } finally {
            onStateChange({ isLoading: false });
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-text-primary dark:text-white">Tạo Video AI</h2>
                <a href="/video" className="text-sm text-[#7f13ec] hover:underline font-medium">Chuyển sang Studio Video đầy đủ &rarr;</a>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6 bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">1. Ảnh bắt đầu (Tùy chọn)</label>
                        <ImageUpload onFileSelect={handleFileSelect} previewUrl={startImage?.objectURL} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">2. Mô tả video</label>
                        <textarea
                            rows={4}
                            className="w-full bg-surface dark:bg-gray-700/50 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-accent focus:outline-none transition-all"
                            placeholder="Mô tả chuyển động, ánh sáng..."
                            value={prompt}
                            onChange={(e) => onStateChange({ prompt: e.target.value })}
                        />
                    </div>
                    {/* Simplified Aspect Ratio for this view */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Tỷ lệ khung hình</label>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleAspectRatioChange('16:9')} 
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${aspectRatio === '16:9' ? 'bg-[#7f13ec] text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}
                            >16:9</button>
                            <button 
                                onClick={() => handleAspectRatioChange('9:16')} 
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${aspectRatio === '9:16' ? 'bg-[#7f13ec] text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}
                            >9:16</button>
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || userCredits < 5}
                        className="w-full flex justify-center items-center gap-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                        {isLoading ? <><Spinner /> Đang tạo...</> : 'Tạo Video (5 Credits)'}
                    </button>
                    {error && <p className="text-red-500 text-sm mt-2 bg-red-100 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">{error}</p>}
                </div>
                
                <div>
                    <h3 className="text-xl font-semibold text-text-primary dark:text-white mb-4">Kết quả</h3>
                    <div className="w-full aspect-video bg-black rounded-lg flex items-center justify-center overflow-hidden border border-gray-700">
                        {isLoading ? (
                            <div className="text-center text-gray-400">
                                <Spinner />
                                <p className="mt-2 text-sm">Đang xử lý...</p>
                            </div>
                        ) : generatedVideoUrl ? (
                            <video src={generatedVideoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                        ) : (
                            <p className="text-gray-500">Kết quả sẽ hiện ở đây</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoGenerator;
