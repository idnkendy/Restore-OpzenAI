import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FileData } from '../../types';

interface MaskableImageProps {
  image: FileData;
  onMaskChange: (mask: FileData | null) => void;
  maskColor?: string;
}

const MaskableImage: React.FC<MaskableImageProps> = ({ image, onMaskChange, maskColor }) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(40);
  const [mode, setMode] = useState<'draw' | 'erase'>('draw');

  const [cursorPosition, setCursorPosition] = useState({ x: -100, y: -100 });
  const [isCursorVisible, setIsCursorVisible] = useState(false);

  const alignCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const imageEl = imageRef.current;
    const container = containerRef.current;

    if (canvas && imageEl && container) {
      const setSize = () => {
        const imageRect = imageEl.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        canvas.width = imageRect.width;
        canvas.height = imageRect.height;
        
        canvas.style.position = 'absolute';
        canvas.style.top = `${imageRect.top - containerRect.top}px`;
        canvas.style.left = `${imageRect.left - containerRect.left}px`;
        canvas.style.width = `${imageRect.width}px`;
        canvas.style.height = `${imageRect.height}px`;
      };

      if (imageEl.complete && imageEl.naturalHeight !== 0) {
        setSize();
      } else {
        imageEl.onload = setSize;
      }
    }
  }, []);

  useEffect(() => {
    alignCanvas();
    window.addEventListener('resize', alignCanvas);
    return () => {
      window.removeEventListener('resize', alignCanvas);
    };
  }, [image, alignCanvas]);

  const getCoordinates = (event: React.MouseEvent | React.TouchEvent): { x: number, y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    const nativeEvent = event.nativeEvent;
    if (nativeEvent instanceof MouseEvent && nativeEvent.button !== 0) return; // Only draw on left click
    
    setIsDrawing(true);
    draw(event.nativeEvent);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        const dataUrl = canvas.toDataURL('image/png');
        const base64 = dataUrl.split(',')[1];
        onMaskChange({
          base64,
          mimeType: 'image/png',
          objectURL: dataUrl
        });
      }
    }
  };

  const draw = (event: MouseEvent | TouchEvent) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = mode === 'draw' ? 'source-over' : 'destination-out';
    ctx.fillStyle = mode === 'draw' ? (maskColor || 'rgba(255, 255, 255, 0.7)') : '#000';
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setCursorPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    if (isDrawing) {
      draw(e.nativeEvent);
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDrawing) {
        draw(e.nativeEvent);
    }
  };


  const handleClearMask = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onMaskChange(null);
    }
  };
  
  return (
    <div className="space-y-4">
      <div 
        ref={containerRef}
        className="relative w-full aspect-video flex items-center justify-center bg-main-bg dark:bg-gray-800 rounded-lg border-2 border-dashed border-border-color dark:border-gray-700 overflow-hidden"
        style={{ cursor: isCursorVisible ? 'none' : 'default' }}
        onMouseEnter={() => setIsCursorVisible(true)}
        onMouseLeave={() => {
            setIsCursorVisible(false);
            stopDrawing();
        }}
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseMove={handleMouseMove}
        onTouchStart={startDrawing}
        onTouchEnd={stopDrawing}
        onTouchMove={handleTouchMove}
      >
        <img
          ref={imageRef}
          src={image.objectURL}
          alt="Original for editing"
          className="max-w-full max-h-full object-contain pointer-events-none"
          onLoad={alignCanvas}
        />
        <canvas
          ref={canvasRef}
        />
        {isCursorVisible && (
            <div
                className="absolute rounded-full pointer-events-none border-2 transition-transform duration-75"
                style={{
                    left: cursorPosition.x,
                    top: cursorPosition.y,
                    width: brushSize,
                    height: brushSize,
                    borderColor: mode === 'draw' ? (maskColor ? '#ef4444' : 'white') : '#ef4444',
                    backgroundColor: mode === 'draw' ? (maskColor ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.3)') : 'rgba(239, 68, 68, 0.3)',
                    transform: `translate(-50%, -50%) scale(${isDrawing ? 0.9 : 1})`,
                }}
            />
        )}
      </div>
      <div className="bg-main-bg dark:bg-gray-800 p-3 rounded-lg border border-border-color dark:border-gray-700 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center gap-2">
            <button
                onClick={() => setMode('draw')}
                title="Vẽ vùng chọn"
                className={`p-2 rounded-md transition-colors ${mode === 'draw' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-text-secondary dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                  <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                </svg>
            </button>
             <button
                onClick={() => setMode('erase')}
                title="Tẩy vùng chọn"
                className={`p-2 rounded-md transition-colors ${mode === 'erase' ? 'bg-red-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-text-secondary dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
        <div className="flex items-center gap-3 flex-grow w-full sm:w-auto">
            <label htmlFor="brush-size" className="text-sm text-text-secondary dark:text-gray-300 whitespace-nowrap">Cỡ bút:</label>
            <input
                id="brush-size"
                type="range"
                min="5"
                max="150"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent"
            />
        </div>
        <button
            onClick={handleClearMask}
            className="px-3 py-2 text-sm font-semibold rounded-md transition-colors bg-gray-200 dark:bg-gray-700 text-text-secondary dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
        >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Xoá
        </button>
      </div>
    </div>
  );
};

export default MaskableImage;