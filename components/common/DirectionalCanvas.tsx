import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FileData } from '../../types';

const drawArrow = (context: CanvasRenderingContext2D, fromx: number, fromy: number, tox: number, toy: number, headlen: number = 20) => {
    const dx = tox - fromx;
    const dy = toy - fromy;
    const angle = Math.atan2(dy, dx);
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    context.strokeStyle = '#DC2626'; // Red-600
    context.fillStyle = '#DC2626';
    context.lineWidth = 10;
    context.lineCap = 'round';
    
    // Main line
    context.beginPath();
    context.moveTo(fromx, fromy);
    context.lineTo(tox, toy);
    context.stroke();
    
    // Arrowhead
    context.beginPath();
    context.moveTo(tox, toy);
    context.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
    context.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
    context.closePath();
    context.fill();
};

// Fix: Defined the missing DirectionalCanvasProps interface to fix a TypeScript error where the type was not found.
interface DirectionalCanvasProps {
  image: FileData;
  onDirectionChange: (direction: FileData | null) => void;
}

const DirectionalCanvas: React.FC<DirectionalCanvasProps> = ({ image, onDirectionChange }) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{x: number, y: number} | null>(null);

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
  
  // Redraw when points change
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && startPoint && currentPoint) {
      drawArrow(ctx, startPoint.x, startPoint.y, currentPoint.x, currentPoint.y);
    } else if (ctx) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  }, [startPoint, currentPoint]);

  const getCoordinates = (event: React.MouseEvent | React.TouchEvent): { x: number, y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handleStartDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    const coords = getCoordinates(event);
    if (coords) {
        setIsDrawing(true);
        setStartPoint(coords);
        setCurrentPoint(coords); // Start with a dot
    }
  };

  const handleDrawing = (event: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      event.preventDefault();
      const coords = getCoordinates(event);
      if (coords) {
          setCurrentPoint(coords);
      }
  };

  const handleStopDrawing = () => {
    if (!isDrawing || !startPoint || !currentPoint) return;

    // Check if it's just a click (minimal movement)
    const dx = Math.abs(currentPoint.x - startPoint.x);
    const dy = Math.abs(currentPoint.y - startPoint.y);
    if (dx < 5 && dy < 5) {
        // Reset if it's just a click
        handleClear();
        setIsDrawing(false);
        return;
    }
    
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];
      onDirectionChange({
        base64,
        mimeType: 'image/png',
        objectURL: dataUrl
      });
    }
  };

  const handleClear = () => {
    setStartPoint(null);
    setCurrentPoint(null);
    onDirectionChange(null);
  };
  
  return (
    <div className="space-y-4">
      <div 
        ref={containerRef}
        className="relative w-full aspect-video flex items-center justify-center bg-main-bg dark:bg-gray-800 rounded-lg border-2 border-dashed border-border-color dark:border-gray-700 overflow-hidden cursor-crosshair"
        onMouseDown={handleStartDrawing}
        onMouseMove={handleDrawing}
        onMouseUp={handleStopDrawing}
        onMouseLeave={handleStopDrawing} // Stop if mouse leaves container
        onTouchStart={handleStartDrawing}
        onTouchMove={handleDrawing}
        onTouchEnd={handleStopDrawing}
      >
        <img
          ref={imageRef}
          src={image.objectURL}
          alt="Original for editing"
          className="max-w-full max-h-full object-contain pointer-events-none select-none"
          onLoad={alignCanvas}
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none"
        />
      </div>
      <div className="flex justify-end">
        <button
            onClick={handleClear}
            className="px-4 py-2 text-sm font-semibold rounded-md transition-colors bg-gray-200 dark:bg-gray-700 text-text-secondary dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
        >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Xoá hướng
        </button>
      </div>
    </div>
  );
};

export default DirectionalCanvas;