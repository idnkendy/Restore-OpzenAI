
import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { LuBanRulerState } from '../state/toolState';
import { RULER_52_2_DATA, RULER_42_9_DATA, getLuBanResult, LuBanRulerData, LuBanResult } from '../services/luBanService';

interface LuBanRulerProps {
    state: LuBanRulerState;
    onStateChange: (newState: Partial<LuBanRulerState>) => void;
}

interface RulerDisplayProps {
    rulerData: LuBanRulerData;
    dimension: number;
    onDimensionChange: (newDimension: number) => void;
}

const RulerDisplay: React.FC<RulerDisplayProps> = ({ rulerData, dimension, onDimensionChange }) => {
    const result: LuBanResult | null = useMemo(() => getLuBanResult(dimension, rulerData), [dimension, rulerData]);
    const rulerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const cursorPosition = useMemo(() => {
        if (dimension <= 0) return 0;
        const valueInCycle = (dimension - 1) % rulerData.cycle;
        return ((valueInCycle + 1) / rulerData.cycle) * 100;
    }, [dimension, rulerData]);

    const handleInteractionMove = useCallback((clientX: number) => {
        if (!rulerRef.current) return;
        
        const rect = rulerRef.current.getBoundingClientRect();
        let x = clientX - rect.left;
        let positionPercent = (x / rect.width);
        
        positionPercent = Math.max(0, Math.min(1, positionPercent));

        const valueInCycle = Math.round(positionPercent * rulerData.cycle);
        const currentBase = Math.floor((dimension - 1) / rulerData.cycle) * rulerData.cycle;
        const newDimension = currentBase + valueInCycle;

        onDimensionChange(Math.max(1, newDimension));
    }, [rulerData.cycle, onDimensionChange, dimension]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                 handleInteractionMove(e.clientX);
            }
        };
        const handleTouchMove = (e: TouchEvent) => {
            if (isDragging) {
                handleInteractionMove(e.touches[0].clientX);
            }
        };
        const handleInteractionEnd = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleInteractionEnd);
            window.addEventListener('touchmove', handleTouchMove);
            window.addEventListener('touchend', handleInteractionEnd);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleInteractionEnd);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleInteractionEnd);
        };
    }, [isDragging, handleInteractionMove]);

    const handleInteractionStart = (e: React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e) e.preventDefault();
        setIsDragging(true);
        handleInteractionMove('touches' in e ? e.touches[0].clientX : e.clientX);
    };

    return (
        <div className="bg-surface dark:bg-dark-bg p-4 rounded-xl border border-border-color dark:border-gray-700 text-sm">
            <div className="flex justify-between items-baseline mb-3">
                <div>
                    <h3 className="font-bold text-text-primary dark:text-white">{rulerData.name}</h3>
                    <p className="text-text-secondary dark:text-gray-400 text-xs">{rulerData.description}</p>
                </div>
                {result && (
                    <div className="text-right">
                        <p className={`font-bold ${result.isGood ? 'text-red-500' : 'text-gray-400'}`}>{result.main}</p>
                        <p className="text-text-secondary dark:text-gray-400 text-xs">Cung: {result.sub}</p>
                    </div>
                )}
            </div>
            
            <div className="relative">
                {/* Ruler Scale */}
                <div className="flex text-xs text-text-secondary dark:text-gray-400 mb-1">
                    {Array.from({ length: 24 }).map((_, i) => (
                        <div key={i} className="flex-1 text-center border-l border-border-color/50 dark:border-gray-600/50 first:border-l-0">
                            <span className="inline-block -ml-1.5">{i}</span>
                        </div>
                    ))}
                </div>
                
                {/* Ruler Body */}
                <div 
                    ref={rulerRef}
                    onMouseDown={handleInteractionStart}
                    onTouchStart={handleInteractionStart}
                    className={`relative h-16 rounded overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                >
                    {/* Color Blocks */}
                    <div className="absolute inset-0 flex">
                        {rulerData.categories.map((cat, index) => (
                            <div key={index} className={`flex-1 ${cat.good ? 'bg-red-700' : 'bg-gray-800'}`}></div>
                        ))}
                    </div>

                    {/* Cursor */}
                    {dimension > 0 && (
                        <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 shadow-lg pointer-events-none" style={{ left: `${cursorPosition}%` }}>
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 bg-yellow-400 rotate-45"></div>
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 bg-yellow-400 rotate-45"></div>
                        </div>
                    )}
                    
                    {/* Text Labels */}
                    <div className="absolute inset-0 flex text-white text-[10px] sm:text-xs pointer-events-none">
                        {rulerData.categories.map((cat, index) => (
                            <div key={index} className="flex-1 border-r border-white/20 last:border-r-0 flex flex-col items-center justify-between p-1">
                                <span className="font-semibold">{cat.name}</span>
                                <div className="grid grid-cols-2 gap-x-2 text-white/70 w-full text-center">
                                    {cat.sub.map(s => <span key={s} className="truncate">{s}</span>)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}


const LuBanRuler: React.FC<LuBanRulerProps> = ({ state, onStateChange }) => {
    const { width, height, checkDimension } = state;
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // Allow only numbers
        if (/^\d*$/.test(value)) {
            onStateChange({ [name]: value } as Partial<LuBanRulerState>);
        }
    };

    const handleRulerDrag = (newDimension: number) => {
        const value = String(newDimension);
        if (checkDimension === 'width') {
            onStateChange({ width: value });
        } else {
            onStateChange({ height: value });
        }
    };
    
    const dimensionToCheck = parseFloat(checkDimension === 'width' ? width : height) || 0;

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-text-primary dark:text-white text-center">Thước Lỗ Ban</h2>
            
            <div className="max-w-xl mx-auto space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="width" className="block text-sm text-text-secondary dark:text-gray-400 mb-1">Rộng (mm)</label>
                        <input 
                            type="text"
                            inputMode="numeric"
                            id="width"
                            name="width"
                            value={width}
                            onChange={handleInputChange}
                            className="w-full bg-main-bg dark:bg-gray-800 border border-border-color dark:border-gray-700 rounded-lg p-3 text-center text-xl font-semibold text-text-primary dark:text-white focus:ring-2 focus:ring-accent focus:outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label htmlFor="height" className="block text-sm text-text-secondary dark:text-gray-400 mb-1">Cao (mm)</label>
                        <input 
                            type="text"
                            inputMode="numeric"
                            id="height"
                            name="height"
                            value={height}
                            onChange={handleInputChange}
                            className="w-full bg-main-bg dark:bg-gray-800 border border-border-color dark:border-gray-700 rounded-lg p-3 text-center text-xl font-semibold text-text-primary dark:text-white focus:ring-2 focus:ring-accent focus:outline-none transition-all"
                        />
                    </div>
                </div>
                
                <div className="flex items-center justify-center gap-4 pt-2">
                    <span className="text-text-secondary dark:text-gray-400">Kiểm tra theo:</span>
                    <div className="flex items-center p-1 bg-main-bg dark:bg-gray-800 rounded-lg">
                        <button 
                            onClick={() => onStateChange({ checkDimension: 'width' })}
                            className={`px-6 py-2 text-sm font-semibold rounded-md transition-colors ${checkDimension === 'width' ? 'bg-yellow-500 text-text-primary shadow' : 'text-text-secondary dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        >
                            Chiều Rộng
                        </button>
                         <button 
                            onClick={() => onStateChange({ checkDimension: 'height' })}
                            className={`px-6 py-2 text-sm font-semibold rounded-md transition-colors ${checkDimension === 'height' ? 'bg-yellow-500 text-text-primary shadow' : 'text-text-secondary dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        >
                            Chiều Cao
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <RulerDisplay rulerData={RULER_52_2_DATA} dimension={dimensionToCheck} onDimensionChange={handleRulerDrag} />
                <RulerDisplay rulerData={RULER_42_9_DATA} dimension={dimensionToCheck} onDimensionChange={handleRulerDrag} />
            </div>

             <footer className="text-center pt-4 text-text-secondary dark:text-gray-500 text-xs">
                <p>&copy; 2025 OPZEN AI. All rights reserved.</p>
             </footer>
        </div>
    );
};

export default LuBanRuler;
