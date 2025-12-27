import React, { useState } from 'react';
import ImagePreviewModal from './ImagePreviewModal';

interface ResultGridProps {
  images: string[];
  toolName: string;
  onSendToViewSync?: (imageUrl: string) => void;
}

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const SyncIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
);

const ResultGrid: React.FC<ResultGridProps> = ({ images, toolName, onSendToViewSync }) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (images.length === 0) return null;

  const gridClasses = images.length > 1 ? 'grid-cols-2 gap-2' : 'grid-cols-1';

  const handleDownload = (e: React.MouseEvent<HTMLButtonElement>, url: string, filename: string) => {
    e.preventDefault();
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSyncClick = (e: React.MouseEvent<HTMLButtonElement>, url: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (onSendToViewSync) {
          onSendToViewSync(url);
      }
  };

  return (
    <>
      <div className={`grid ${gridClasses} w-full h-full p-1`}>
        {images.map((url, index) => (
          <div 
            key={index} 
            className="relative group w-full h-full bg-main-bg dark:bg-gray-800/50 rounded-md overflow-hidden cursor-pointer"
            onClick={() => setPreviewImage(url)}
          >
            <img src={url} alt={`Generated image ${index + 1}`} className="w-full h-full object-contain" />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
             <div className="absolute top-2 right-2 flex gap-2">
                {onSendToViewSync && (
                    <button
                        onClick={(e) => handleSyncClick(e, url)}
                        className="p-2 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-teal-600 transition-all"
                        title="Đồng bộ View"
                    >
                        <SyncIcon />
                    </button>
                )}
                <button
                  onClick={(e) => handleDownload(e, url, `${toolName}-result-${index + 1}.png`)}
                  className="p-2 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-blue-600 transition-all"
                  title="Tải xuống ảnh này"
                >
                  <DownloadIcon />
                </button>
            </div>
          </div>
        ))}
      </div>
      {previewImage && (
        <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
      )}
    </>
  );
};

export default ResultGrid;