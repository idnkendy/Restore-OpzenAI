import React, { useState } from 'react';
import { FileData } from '../types';
import { PromptEnhancerState } from '../state/toolState';
import * as geminiService from '../services/geminiService';
import ImageUpload from './common/ImageUpload';
import Spinner from './Spinner';

interface PromptEnhancerProps {
    state: PromptEnhancerState;
    onStateChange: (newState: Partial<PromptEnhancerState>) => void;
}

const PromptEnhancer: React.FC<PromptEnhancerProps> = ({ state, onStateChange }) => {
    const { sourceImage, customNeeds, isLoading, error, resultPrompt } = state;
    const [copySuccess, setCopySuccess] = useState(false);

    const handleFileSelect = (fileData: FileData | null) => {
        onStateChange({
            sourceImage: fileData,
            error: null,
        });
    };

    const handleGenerate = async () => {
        if (!customNeeds.trim() && !sourceImage) {
            onStateChange({ error: 'Vui lòng mô tả yêu cầu của bạn hoặc tải lên một hình ảnh.' });
            return;
        }

        onStateChange({ isLoading: true, error: null, resultPrompt: null });

        try {
            const result = await geminiService.enhancePrompt(customNeeds, sourceImage || undefined);
            onStateChange({ resultPrompt: result });
        } catch (err: any) {
            onStateChange({ error: err.message || 'Đã xảy ra lỗi không mong muốn.' });
        } finally {
            onStateChange({ isLoading: false });
        }
    };

    const handleCopy = () => {
        if (resultPrompt) {
            navigator.clipboard.writeText(resultPrompt);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">AI Viết Prompt</h2>
                <p className="text-text-secondary dark:text-gray-300 mb-6">Cung cấp ý tưởng, từ khóa hoặc hình ảnh, AI sẽ giúp bạn viết một prompt chi tiết và chuyên nghiệp để tạo ra những hình ảnh kiến trúc ấn tượng.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* --- INPUTS --- */}
                <div className="space-y-6 flex flex-col">
                    <div className="bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700">
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">1. Tải Lên Ảnh Tham Khảo (Tùy chọn)</label>
                        <ImageUpload onFileSelect={handleFileSelect} previewUrl={sourceImage?.objectURL} />
                    </div>
                </div>
                 <div className="space-y-6 flex flex-col">
                     <div className="bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700 flex-grow flex flex-col">
                         <label htmlFor="custom-needs" className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">2. Mô tả yêu cầu của bạn</label>
                         <textarea
                            id="custom-needs"
                            rows={8}
                            className="w-full bg-surface dark:bg-gray-700/50 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-accent focus:outline-none transition-all flex-grow"
                            placeholder="VD: Tạo một prompt chi tiết, chuyên nghiệp cho việc render kiến trúc, tập trung vào phong cách hiện đại, ánh sáng ban ngày và vật liệu tự nhiên."
                            value={customNeeds}
                            onChange={(e) => onStateChange({ customNeeds: e.target.value })}
                        />
                     </div>
                     <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full flex justify-center items-center gap-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                        {isLoading ? <><Spinner /> Đang viết...</> : 'Tạo Prompt Chi Tiết'}
                    </button>
                    {error && <div className="mt-2 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-500 dark:text-red-300 rounded-lg text-sm">{error}</div>}
                 </div>
            </div>

            {/* --- RESULTS --- */}
             <div>
                <h3 className="text-xl font-semibold text-text-primary dark:text-white mb-4">Prompt do AI tạo ra</h3>
                <div className="relative">
                    <textarea
                        readOnly
                        value={resultPrompt || ''}
                        rows={6}
                        className="w-full bg-main-bg/50 dark:bg-dark-bg/50 border border-border-color dark:border-gray-700 rounded-lg p-4 text-text-primary dark:text-gray-300 focus:ring-2 focus:ring-accent focus:outline-none transition-all"
                        placeholder="Prompt chi tiết sẽ được hiển thị ở đây..."
                    />
                    {resultPrompt && (
                        <button
                            onClick={handleCopy}
                            className="absolute top-3 right-3 bg-accent hover:bg-accent-600 text-white font-semibold py-2 px-3 rounded-lg transition-colors text-sm"
                        >
                            {copySuccess ? 'Đã sao chép!' : 'Sao chép'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PromptEnhancer;
