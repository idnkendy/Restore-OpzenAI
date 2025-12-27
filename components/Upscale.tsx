
import React from 'react';
import { UpscaleState } from '../state/toolState';

interface UpscaleProps {
    state: UpscaleState;
    onStateChange: (newState: Partial<UpscaleState>) => void;
    userCredits?: number;
    onDeductCredits?: (amount: number, description: string) => Promise<string>;
}

const Upscale: React.FC<UpscaleProps> = ({ state, onStateChange, userCredits = 0, onDeductCredits }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-surface dark:bg-[#191919] rounded-2xl border border-border-color dark:border-[#302839]">
            <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mb-4 border border-yellow-500/20">
                <span className="material-symbols-outlined text-4xl text-yellow-500">engineering</span>
            </div>
            <h2 className="text-2xl font-bold text-text-primary dark:text-white mb-2">Tính năng đang bảo trì</h2>
            <p className="text-text-secondary dark:text-gray-400 max-w-md">
                Chúng tôi đang nâng cấp hệ thống Upscale để mang lại chất lượng hình ảnh tốt hơn. Vui lòng quay lại sau!
            </p>
        </div>
    );
};

export default Upscale;
