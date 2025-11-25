
import React from 'react';
import { ImageResolution } from '../../types';

interface ResolutionSelectorProps {
  value: ImageResolution;
  onChange: (value: ImageResolution) => void;
  disabled?: boolean;
}

const options: { value: ImageResolution; label: string; badge?: string; cost: number; desc: string }[] = [
    { value: 'Standard', label: 'Tiêu chuẩn', badge: 'Nhanh', cost: 5, desc: 'Nano Flash' },
    { value: '1K', label: 'HD (1K)', badge: 'Chi tiết', cost: 15, desc: 'Nano Pro' },
    { value: '2K', label: '2K QHD', badge: 'Sắc nét', cost: 20, desc: 'Nano Pro' },
    { value: '4K', label: '4K UHD', badge: 'Siêu thực', cost: 30, desc: 'Nano Pro' },
];

const ResolutionSelector: React.FC<ResolutionSelectorProps> = ({ value, onChange, disabled }) => {
  return (
    <div className="w-full">
        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Chất lượng ảnh & Độ phân giải</label>
        {/* Optimized Grid: 2 cols on mobile/tablet, 4 cols on larger screens (lg+) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {options.map(option => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    disabled={disabled}
                    className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 text-left ${
                        value === option.value
                            ? 'bg-[#7f13ec]/10 border-[#7f13ec] shadow-md'
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    {option.badge && (
                        <span className={`absolute -top-2 -right-2 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${
                            value === option.value ? 'bg-[#7f13ec] text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                        }`}>
                            {option.badge}
                        </span>
                    )}
                    
                    <div className="flex flex-col items-center w-full">
                        <span className={`text-sm font-bold ${value === option.value ? 'text-[#7f13ec]' : 'text-text-primary dark:text-white'}`}>
                            {option.label}
                        </span>
                        <span className="text-[10px] text-text-secondary dark:text-gray-400 mt-0.5">
                            {option.desc}
                        </span>
                        <div className="mt-2 flex items-center gap-1 bg-white dark:bg-black/20 px-2 py-1 rounded-md border border-gray-100 dark:border-gray-600/50">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className={`text-xs font-bold ${value === option.value ? 'text-text-primary dark:text-white' : 'text-text-secondary dark:text-gray-400'}`}>
                                {option.cost}
                            </span>
                        </div>
                    </div>
                </button>
            ))}
        </div>
    </div>
  );
};

export default ResolutionSelector;
