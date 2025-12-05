
import React from 'react';
import { AspectRatio } from '../../types';

interface AspectRatioSelectorProps {
  value: AspectRatio;
  onChange: (value: AspectRatio) => void;
  disabled?: boolean;
}

const options: { value: AspectRatio; label: string }[] = [
    { value: '1:1', label: 'Vuông' },
    { value: '4:3', label: 'Ngang' },
    { value: '3:4', label: 'Dọc' },
    { value: '16:9', label: 'Rộng' },
    { value: '9:16', label: 'Story' },
];

const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({ value, onChange, disabled }) => {
  return (
    <div>
        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Tỷ lệ khung hình</label>
        <div className="flex flex-wrap gap-2 bg-gray-100 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#302839] p-1.5 rounded-xl shadow-inner">
            {options.map(option => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    disabled={disabled}
                    className={`flex-grow py-2.5 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 ${
                        value === option.value
                            ? 'bg-[#7f13ec] text-white shadow-lg shadow-purple-500/20 scale-[1.02]'
                            : 'bg-transparent text-text-secondary dark:text-gray-400 hover:bg-white dark:hover:bg-[#2A2A2A] hover:text-text-primary dark:hover:text-white hover:shadow-sm'
                    }`}
                >
                    <span>{option.label}</span>
                    <span className={`font-normal ${value === option.value ? 'opacity-90' : 'opacity-60'} text-[10px] sm:text-xs`}>
                        ({option.value})
                    </span>
                </button>
            ))}
        </div>
    </div>
  );
};

export default AspectRatioSelector;
