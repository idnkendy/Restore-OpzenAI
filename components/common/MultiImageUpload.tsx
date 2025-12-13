
import React, { useCallback, useState, useRef } from 'react';
import { FileData } from '../../types';
import { resizeImage } from './ImageUpload';

interface MultiImageUploadProps {
  onFilesChange: (files: FileData[]) => void;
  maxFiles?: number;
  className?: string;
}

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-text-secondary dark:text-gray-400 group-hover:text-accent transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);

const LargeCloudIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-text-secondary/50 dark:text-gray-500 group-hover:text-accent transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({ onFilesChange, maxFiles = 12, className = "" }) => {
    const [files, setFiles] = useState<FileData[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const processFiles = async (fileList: FileList): Promise<FileData[]> => {
        const processed: FileData[] = [];
        for (const file of Array.from(fileList)) {
            if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
                setError(`Loại tệp không được hỗ trợ: ${file.name}`);
                continue;
            }
            try {
                const fileData = await resizeImage(file);
                processed.push(fileData);
            } catch (err) {
                setError(`Không thể xử lý tệp: ${file.name}`);
            }
        }
        return processed;
    };

    const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const newFiles = event.target.files;
        if (newFiles) {
            setError(null);
            setIsProcessing(true);
            
            if (files.length + newFiles.length > maxFiles) {
                setError(`Bạn chỉ có thể tải lên tối đa ${maxFiles} ảnh.`);
                setIsProcessing(false);
                return;
            }
            
            const processed = await processFiles(newFiles);
            const updatedFiles = [...files, ...processed];
            setFiles(updatedFiles);
            onFilesChange(updatedFiles);
            setIsProcessing(false);
        }
    }, [files, maxFiles, onFilesChange]);

    const handleRemove = (objectURLToRemove: string) => {
        const updatedFiles = files.filter(file => file.objectURL !== objectURLToRemove);
        setFiles(updatedFiles);
        onFilesChange(updatedFiles);
        URL.revokeObjectURL(objectURLToRemove);
    };

    const handleContainerClick = (e: React.MouseEvent) => {
        // Prevent click if clicking on a remove button
        if ((e.target as HTMLElement).closest('button')) return;
        
        if (!isProcessing) {
            inputRef.current?.click();
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    
    const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles && droppedFiles.length > 0) {
            setError(null);
            setIsProcessing(true);

            if (files.length + droppedFiles.length > maxFiles) {
                setError(`Bạn chỉ có thể tải lên tối đa ${maxFiles} ảnh.`);
                setIsProcessing(false);
                return;
            }
            const processed = await processFiles(droppedFiles);
            const updatedFiles = [...files, ...processed];
            setFiles(updatedFiles);
            onFilesChange(updatedFiles);
            setIsProcessing(false);
        }
    }, [files, maxFiles, onFilesChange]);


    return (
        <div 
            className={`relative flex flex-col w-full ${className}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {files.length === 0 ? (
                // EMPTY STATE: Large Drop Zone (Fixed Height ~384px which is h-96)
                // Using min-h-[350px] to strictly enforce the user's request range
                <div 
                    onClick={handleContainerClick}
                    className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer min-h-[350px] h-96 group w-full ${
                        isDragging 
                            ? 'border-accent bg-accent/10' 
                            : 'border-gray-300 dark:border-[#302839] bg-gray-50 dark:bg-[#121212]/50 hover:border-[#7f13ec]/50 hover:bg-gray-100 dark:hover:bg-[#121212]/70'
                    }`}
                >
                    <div className="mb-4 p-4 rounded-full bg-white dark:bg-[#191919] group-hover:scale-110 transition-transform duration-300 shadow-sm border border-gray-100 dark:border-gray-700">
                        {isProcessing ? (
                            <svg className="animate-spin h-8 w-8 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <LargeCloudIcon />
                        )}
                    </div>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-300 group-hover:text-accent transition-colors mb-1">
                        Thêm ảnh tham chiếu
                    </p>
                    <p className="text-xs text-gray-400">
                        (Kéo thả hoặc nhấp để chọn)
                    </p>
                </div>
            ) : (
                // POPULATED STATE: Grid + Small Add Button
                // Also setting min-h to prevent layout jump and keep it substantial
                <div className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 transition-all duration-300 p-3 border-2 border-dashed rounded-xl content-start overflow-y-auto w-full min-h-[350px] max-h-[500px] ${isDragging ? 'border-accent bg-accent/5' : 'border-transparent bg-gray-50/50 dark:bg-black/20'}`}>
                    {files.map(file => (
                        <div key={file.objectURL} className="relative group aspect-square bg-main-bg dark:bg-gray-800 rounded-lg overflow-hidden border border-border-color dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
                            <img src={file.objectURL} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <button
                                onClick={() => handleRemove(file.objectURL)}
                                className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full transition-all opacity-0 group-hover:opacity-100 hover:bg-red-700 transform hover:scale-110"
                                title="Xóa ảnh"
                            >
                                <XIcon />
                            </button>
                        </div>
                    ))}
                    {files.length < maxFiles && (
                        <div
                            onClick={handleContainerClick}
                            className={`group aspect-square bg-main-bg dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-center p-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 hover:border-accent transition-all ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            {isProcessing ? (
                                <svg className="animate-spin h-6 w-6 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <>
                                    <PlusIcon />
                                    <p className="text-[10px] text-text-secondary dark:text-gray-400 group-hover:text-accent font-medium mt-1">Thêm ảnh</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
            
            <input
                ref={inputRef}
                type="file"
                multiple
                className="sr-only"
                onChange={handleFileChange}
                accept=".jpg, .jpeg, .png, .webp"
            />
            {error && <p className="text-red-500 text-xs mt-2 text-center bg-red-500/10 p-2 rounded-lg border border-red-500/20">{error}</p>}
            
            {/* Overlay hint when dragging over populated list */}
            {isDragging && files.length > 0 && (
                <div className="absolute inset-0 bg-accent/20 border-2 border-accent border-dashed rounded-xl flex items-center justify-center pointer-events-none z-10 backdrop-blur-[1px]">
                    <div className="bg-surface dark:bg-[#191919] px-6 py-3 rounded-xl shadow-2xl text-accent font-bold animate-bounce text-lg border border-accent/20">
                        Thả để thêm ảnh
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiImageUpload;
