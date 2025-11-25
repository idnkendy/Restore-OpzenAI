
import React, { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface OptionSelectorProps {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id: string;
  variant?: 'select' | 'grid';
}

const OptionSelector: React.FC<OptionSelectorProps> = ({ 
  label, 
  options, 
  value, 
  onChange, 
  disabled, 
  id, 
  variant = 'select' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${isOpen ? 'z-[100]' : 'z-10'}`} ref={containerRef}>
      <label htmlFor={id} className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
        {label}
      </label>
      
      <button
        type="button"
        id={id}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between bg-white dark:bg-gray-800 
          border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 
          text-text-primary dark:text-white transition-all duration-200
          ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-primary/50 cursor-pointer focus:ring-2 focus:ring-primary/20'}
          ${isOpen ? 'ring-2 ring-primary/20 border-primary' : ''}
        `}
      >
        <span className="truncate text-sm font-medium">
          {selectedOption ? selectedOption.label : 'Chọn tùy chọn...'}
        </span>
        <svg 
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className={`
            absolute z-[100] w-full mt-2 bg-white dark:bg-[#1E1E1E] 
            border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl 
            overflow-hidden transition-all duration-200 origin-top animate-fade-in
          `}
        >
          <style>{`
            @keyframes fade-in {
              from { opacity: 0; transform: scale(0.95) translateY(-10px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
            .animate-fade-in { animation: fade-in 0.15s ease-out forwards; }
          `}</style>
          <div className={`max-h-64 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 ${variant === 'grid' ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-1'}`}>
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`
                  flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors
                  ${value === option.value 
                    ? 'bg-primary/10 text-primary font-bold dark:bg-primary/20' 
                    : 'text-text-secondary dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-text-primary dark:hover:text-white'
                  }
                  ${variant === 'grid' ? 'text-center justify-center border border-transparent hover:border-gray-200 dark:hover:border-gray-600' : 'text-left'}
                `}
              >
                <span className="truncate">{option.label}</span>
                {variant === 'select' && value === option.value && (
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OptionSelector;
