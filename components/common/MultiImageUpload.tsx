
import React, { useCallback, useState, useRef } from 'react';
import { FileData } from '../../types';
import { fileToBase64 } from './ImageUpload';

interface MultiImageUploadProps {
  onFilesChange: (files: FileData[]) => void;
  maxFiles?: number;
}

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-text-secondary dark:text-gray-400 group-hover:text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({ onFilesChange, maxFiles = 12 }) => {
    const [files, setFiles] = useState<FileData[]>([]);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const processFiles = async (fileList: FileList): Promise<FileData[]> => {
        const processed: FileData[] = [];
        for (const file of Array.from(fileList)) {
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                setError(`Loại tệp không được hỗ trợ: ${file.name}`);
                continue;
            }
            if (file.size > 30 * 1024 * 1024) { // 30MB size limit
                setError(`Kích thước tệp vượt quá 30MB: ${file.name}`);
                continue;
            }
            try {
                const base64 = await fileToBase64(file);
                const objectURL = URL.createObjectURL(file);
                processed.push({ base64, mimeType: file.type, objectURL });
            } catch (err) {
                setError(`Không thể đọc tệp: ${file.name}`);
            }
        }
        return processed;
    };

    const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const newFiles = event.target.files;
        if (newFiles) {
            setError(null);
            if (files.length + newFiles.length > maxFiles) {
                setError(`Bạn chỉ có thể tải lên tối đa ${maxFiles} ảnh.`);
                return;
            }
            const processed = await processFiles(newFiles);
            const updatedFiles = [...files, ...processed];
            setFiles(updatedFiles);
            onFilesChange(updatedFiles);
        }
    }, [files, maxFiles, onFilesChange]);

    const handleRemove = (objectURLToRemove: string) => {
        const updatedFiles = files.filter(file => file.objectURL !== objectURLToRemove);
        setFiles(updatedFiles);
        onFilesChange(updatedFiles);
    };

    const handleContainerClick = () => {
        inputRef.current?.click();
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
    
    const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles) {
            setError(null);
            if (files.length + droppedFiles.length > maxFiles) {
                setError(`Bạn chỉ có thể tải lên tối đa ${maxFiles} ảnh.`);
                return;
            }
            const processed = await processFiles(droppedFiles);
            const updatedFiles = [...files, ...processed];
            setFiles(updatedFiles);
            onFilesChange(updatedFiles);
        }
    }, [files, maxFiles, onFilesChange]);


    return (
        <div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {files.map(file => (
                    <div key={file.objectURL} className="relative group aspect-square bg-main-bg dark:bg-gray-800 rounded-md overflow-hidden border border-border-color dark:border-gray-700">
                        <img src={file.objectURL} alt="Preview" className="w-full h-full object-cover" />
                        <button
                            onClick={() => handleRemove(file.objectURL)}
                            className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-red-600 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100"
                            title="Xóa ảnh"
                        >
                            <XIcon />
                        </button>
                    </div>
                ))}
                {files.length < maxFiles && (
                    <div
                        onClick={handleContainerClick}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className="group aspect-square bg-main-bg dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-border-color dark:border-gray-600 flex flex-col items-center justify-center text-center p-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 hover:border-accent transition-all"
                    >
                        <PlusIcon />
                        <p className="text-xs text-text-secondary dark:text-gray-400 mt-1 group-hover:text-accent">Thêm ảnh</p>
                    </div>
                )}
            </div>
            <input
                ref={inputRef}
                type="file"
                multiple
                className="sr-only"
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/webp"
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
    );
};

export default MultiImageUpload;
