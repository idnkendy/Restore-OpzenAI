import React, { useState, useRef } from 'react';

interface ImageComparatorProps {
  originalImage: string;
  resultImage: string;
}

const ImageComparator: React.FC<ImageComparatorProps> = ({ originalImage, resultImage }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  };

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };
  
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    // Check if dragging is initiated for touch events as well
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  };

  return (
    <div 
        ref={containerRef}
        className="relative w-full h-full select-none cursor-ew-resize overflow-hidden rounded-lg"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        onTouchMove={handleTouchMove}
    >
        <img
            src={originalImage}
            alt="Original"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            draggable={false}
        />
        <div
            className="absolute inset-0 w-full h-full object-contain overflow-hidden pointer-events-none"
            style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
        >
            <img
                src={resultImage}
                alt="AI Result"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                draggable={false}
            />
        </div>
        
        {/* Slider Handle */}
        <div
            className="absolute top-0 bottom-0 w-1 bg-white/80 cursor-ew-resize pointer-events-none backdrop-blur-sm"
            style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 text-text-secondary rounded-full flex items-center justify-center shadow-2xl backdrop-blur-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
            </div>
        </div>

        {/* Labels */}
        <div className="absolute top-2 left-2 bg-black/50 text-white text-xs font-bold px-2 py-1 rounded pointer-events-none">
            GỐC
        </div>
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs font-bold px-2 py-1 rounded pointer-events-none">
            AI
        </div>
    </div>
  );
};

export default ImageComparator;