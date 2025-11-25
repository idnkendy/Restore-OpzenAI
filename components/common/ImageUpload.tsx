
import React, { useCallback, useState, useMemo, useRef } from 'react';
import { FileData } from '../../types';

interface ImageUploadProps {
  onFileSelect: (fileData: FileData | null) => void;
  id?: string;
  previewUrl?: string | null;
  maskPreviewUrl?: string | null;
  directionPreviewUrl?: string | null;
}

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });
};

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

const CloudUploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 dark:text-gray-600 group-hover:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);

const ImageUpload: React.FC<ImageUploadProps> = ({ onFileSelect, id, previewUrl, maskPreviewUrl, directionPreviewUrl }) => {
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const uniqueId = useMemo(() => id || `file-upload-${Math.random().toString(36).substr(2, 9)}`, [id]);

    const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                setError('Chỉ chấp nhận các tệp PNG, JPG, hoặc WEBP.');
                onFileSelect(null);
                return;
            }
             if (file.size > 30 * 1024 * 1024) { // 30MB size limit
                setError('Kích thước tệp không được vượt quá 30MB.');
                onFileSelect(null);
                return;
            }

            setError(null);
            try {
                const base64 = await fileToBase64(file);
                const objectURL = URL.createObjectURL(file);
                onFileSelect({ 
                    base64, 
                    mimeType: file.type, 
                    objectURL
                });
            } catch (err) {
                setError('Không thể đọc tệp hình ảnh.');
                onFileSelect(null);
            }
        }
    }, [onFileSelect]);
    
    const handleRemove = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setError(null);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
        onFileSelect(null);
    };

    const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
    }, []);

    const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        const files = event.dataTransfer.files;
        if (files && files.length > 0) {
            const mockEvent = {
                target: { files }
            } as unknown as React.ChangeEvent<HTMLInputElement>;
            handleFileChange(mockEvent);
        }
    }, [handleFileChange]);

    const handleContainerClick = () => {
        inputRef.current?.click();
    };


    if (previewUrl) {
        return (
            <div className="relative group w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                {maskPreviewUrl && (
                    <img 
                        src={maskPreviewUrl} 
                        alt="Mask Preview" 
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none" 
                    />
                )}
                {directionPreviewUrl && (
                    <img 
                        src={directionPreviewUrl} 
                        alt="Direction Preview" 
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none" 
                    />
                )}
                
                {/* Overlay on Hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                    <button
                        onClick={handleContainerClick}
                        className="bg-white/20 hover:bg-white/30 text-white font-semibold py-2 px-4 rounded-lg backdrop-blur-sm transition-colors text-sm flex items-center gap-2"
                    >
                        Thay đổi
                    </button>
                    <button
                        onClick={handleRemove}
                        className="bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-lg backdrop-blur-sm transition-colors"
                        title="Xóa ảnh"
                    >
                        <XIcon />
                    </button>
                </div>

                 <input
                    ref={inputRef}
                    id={uniqueId}
                    name={uniqueId}
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                    accept="image/png, image/jpeg, image/webp"
                />
            </div>
        );
    }
    
    return (
        <div>
            <div 
                className="group relative w-full aspect-video bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-accent hover:bg-accent/5 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer p-6"
                onClick={handleContainerClick}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <div className="p-3 bg-white dark:bg-gray-700 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform duration-300">
                    <CloudUploadIcon />
                </div>
                <p className="font-medium text-gray-700 dark:text-gray-200 text-sm group-hover:text-accent transition-colors">Nhấp để tải ảnh lên</p>
                <p className="text-xs text-gray-400 mt-1">hoặc kéo và thả vào đây</p>
                <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-wide">JPG, PNG, WEBP (Max 30MB)</p>
                
                <input
                    ref={inputRef}
                    id={uniqueId}
                    name={uniqueId}
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                    accept="image/png, image/jpeg, image/webp"
                />
            </div>
            {error && (
                <div className="mt-2 flex items-center gap-2 text-red-500 text-xs bg-red-50 dark:bg-red-900/10 p-2 rounded border border-red-100 dark:border-red-900/30">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                </div>
            )}
        </div>
    );
};

export default ImageUpload;
