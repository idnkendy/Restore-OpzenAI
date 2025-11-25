import React from 'react';
import { FileData } from '../types';
import { PromptSuggesterState } from '../state/toolState';
import * as geminiService from '../services/geminiService';
import ImageUpload from './common/ImageUpload';
import Spinner from './Spinner';
import OptionSelector from './common/OptionSelector';

interface SuggestionCardProps {
    title: string;
    prompts: string[];
    onSelectPrompt: (prompt: string) => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ title, prompts, onSelectPrompt }) => {
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        // TODO: Add a small notification "Copied!" for better UX
    };

    if (!prompts || prompts.length === 0) {
        return null;
    }

    return (
        <div className="bg-surface dark:bg-dark-bg p-4 rounded-lg border border-border-color dark:border-gray-700">
            <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-3">{title}</h3>
            <div className="space-y-3">
                {prompts.map((prompt, index) => (
                    <div key={index} className="group flex justify-between items-start gap-2 bg-main-bg dark:bg-gray-700/50 p-3 rounded-md">
                        <p className="text-text-secondary dark:text-gray-300 text-sm">{prompt}</p>
                        <div className="flex items-center flex-shrink-0">
                            <button 
                                onClick={() => onSelectPrompt(prompt)}
                                title="Sử dụng prompt này trong Đồng Bộ View"
                                aria-label={`Sử dụng: ${prompt}`}
                                className="opacity-50 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-accent/20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-text-secondary dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </button>
                            <button 
                                onClick={() => handleCopy(prompt)}
                                title="Copy prompt"
                                aria-label={`Sao chép: ${prompt}`}
                                className="opacity-50 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-accent/20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-text-secondary dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const suggestionSubjects = [
    { value: 'all', label: 'Tất cả chủ đề' },
    { value: 'Góc toàn cảnh', label: 'Góc toàn cảnh' },
    { value: 'Góc trung cảnh', label: 'Góc trung cảnh' },
    { value: 'Góc lấy nét', label: 'Góc lấy nét' },
    { value: 'Chi tiết kiến trúc', label: 'Chi tiết kiến trúc' },
];

interface PromptSuggesterProps {
    state: PromptSuggesterState;
    onStateChange: (newState: Partial<PromptSuggesterState>) => void;
    onSendToViewSyncWithPrompt: (image: FileData, prompt: string) => void;
}

const PromptSuggester: React.FC<PromptSuggesterProps> = ({ state, onStateChange, onSendToViewSyncWithPrompt }) => {
    const { sourceImage, isLoading, error, suggestions, selectedSubject, numberOfSuggestions, customInstruction } = state;

    const handleFileSelect = (fileData: FileData | null) => {
        onStateChange({
            sourceImage: fileData,
            suggestions: null,
            error: null,
        });
    };

    const handleGenerate = async () => {
        if (!sourceImage) {
            onStateChange({ error: 'Vui lòng tải lên một ảnh để nhận gợi ý.' });
            return;
        }

        onStateChange({ isLoading: true, error: null, suggestions: null });

        try {
            const result = await geminiService.generatePromptSuggestions(sourceImage, selectedSubject, numberOfSuggestions, customInstruction);
            onStateChange({ suggestions: result });
        } catch (err: any) {
            onStateChange({ error: err.message || 'Đã xảy ra lỗi không mong muốn.' });
        } finally {
            onStateChange({ isLoading: false });
        }
    };

    const handleSelectPrompt = (prompt: string) => {
        if (sourceImage) {
            onSendToViewSyncWithPrompt(sourceImage, prompt);
        } else {
            onStateChange({ error: 'Không tìm thấy ảnh gốc để gửi đi. Vui lòng tải lại ảnh.' });
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-4">AI Gợi ý prompt đồng bộ View</h2>
                <p className="text-text-secondary dark:text-gray-300 mb-6">Tải lên một bức ảnh kiến trúc, AI sẽ phân tích và đề xuất các ý tưởng prompt độc đáo để bạn sử dụng trực tiếp trong tính năng "Đồng Bộ View".</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* --- INPUTS --- */}
                <div className="space-y-6 flex flex-col">
                    <div className="bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700">
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">1. Tải Lên Ảnh Gốc</label>
                        <ImageUpload onFileSelect={handleFileSelect} previewUrl={sourceImage?.objectURL} />
                    </div>

                    <div className="bg-main-bg/50 dark:bg-dark-bg/50 p-6 rounded-xl border border-border-color dark:border-gray-700">
                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">2. Tùy chỉnh gợi ý</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                            <OptionSelector 
                                id="suggestion-subject"
                                label="Chọn chủ đề"
                                options={suggestionSubjects}
                                value={selectedSubject}
                                onChange={(val) => onStateChange({ selectedSubject: val })}
                                disabled={isLoading}
                            />
                            <div>
                                <label htmlFor="suggestion-count" className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Số lượng gợi ý</label>
                                <input 
                                    type="number" 
                                    id="suggestion-count"
                                    value={numberOfSuggestions}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        if (val > 0 && val <= 10) {
                                            onStateChange({ numberOfSuggestions: val });
                                        }
                                    }}
                                    min="1"
                                    max="10"
                                    className="w-full bg-surface dark:bg-gray-700/50 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-accent focus:outline-none transition-all"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label htmlFor="custom-instruction" className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                                Thêm yêu cầu (VD: góc nhìn từ dưới lên, cinematic,...)
                            </label>
                            <textarea 
                                id="custom-instruction"
                                rows={2}
                                className="w-full bg-surface dark:bg-gray-700/50 border border-border-color dark:border-gray-600 rounded-lg p-3 text-text-primary dark:text-gray-200 focus:ring-2 focus:ring-accent focus:outline-none transition-all"
                                placeholder="Nhập thêm yêu cầu của bạn ở đây..."
                                value={customInstruction}
                                onChange={(e) => onStateChange({ customInstruction: e.target.value })}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !sourceImage}
                        className="w-full flex justify-center items-center gap-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                        {isLoading ? <><Spinner /> Đang phân tích...</> : 'Tạo Gợi ý'}
                    </button>
                    {error && <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/50 dark:border-red-500 dark:text-red-300 rounded-lg text-sm">{error}</div>}
                </div>

                {/* --- RESULTS --- */}
                <div className="space-y-4">
                     <h3 className="text-lg font-semibold text-text-primary dark:text-white">Gợi ý từ AI</h3>
                     <div className="w-full min-h-[400px] bg-surface dark:bg-dark-bg rounded-lg border border-border-color dark:border-gray-700 flex items-center justify-center p-4">
                        {isLoading && <Spinner />}
                        {!isLoading && !suggestions && (
                             <div className="text-center text-text-secondary dark:text-gray-400 p-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                <p className="mt-2">Tải lên một ảnh và nhấn "Tạo Gợi ý" để xem kết quả.</p>
                             </div>
                        )}
                        {!isLoading && suggestions && (
                            <div className="w-full space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                {Object.entries(suggestions).map(([title, prompts]) => (
                                    <SuggestionCard 
                                        key={title} 
                                        title={title} 
                                        prompts={prompts}
                                        onSelectPrompt={handleSelectPrompt}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PromptSuggester;
