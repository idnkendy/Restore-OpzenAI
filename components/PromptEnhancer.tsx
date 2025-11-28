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
            // CLEAN ERROR MESSAGE
            let userErrorMessage = err.message || 'Đã xảy ra lỗi không mong muốn.';
            if (!userErrorMessage.includes('thử lại')) {
                userErrorMessage += ". Vui lòng thử lại sau.";
            }
            onStateChange({ error: userErrorMessage });
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
                            placeholder="VD: Tạo một prompt chi tiết