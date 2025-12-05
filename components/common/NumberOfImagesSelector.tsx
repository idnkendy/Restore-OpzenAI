
import React from 'react';

interface NumberOfImagesSelectorProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const options = [1, 2, 3, 4];

const NumberOfImagesSelector: React.FC<NumberOfImagesSelectorProps> = ({ value, onChange, disabled }) => {
  return (
    <div>
        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">Số lượng ảnh</label>
        <div className="grid grid-cols-4 gap-2 bg-gray-100 dark:bg-[#1A1A1A] border border-gray-200 dark:border-[#302839] p-1.5 rounded-xl shadow-inner">
            {options.map(option => (
                <button
                    key={option}
                    onClick={() => onChange(option)}
                    disabled={disabled}
                    className={`flex items-center justify-center py-2.5 rounded-lg text-sm font-bold transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                        value === option
                            ? 'bg-[#7f13ec] text-white shadow-lg shadow-purple-500/20 scale-[1.02]'
                            : 'bg-transparent text-text-secondary dark:text-gray-400 hover:bg-white dark:hover:bg-[#2A2A2A] hover:text-text-primary dark:hover:text-white hover:shadow-sm'
                    }`}
                >
                    {option}
                </button>
            ))}
        </div>
    </div>
  );
};

export default NumberOfImagesSelector;
