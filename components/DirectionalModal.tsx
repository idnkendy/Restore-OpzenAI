import React, { useState } from 'react';
import { FileData } from '../types';
import DirectionalCanvas from './common/DirectionalCanvas';

interface DirectionalModalProps {
  image: FileData;
  onClose: () => void;
  onApply: (direction: FileData) => void;
}

const DirectionalModal: React.FC<DirectionalModalProps> = ({ image, onClose, onApply }) => {
  const [direction, setDirection] = useState<FileData | null>(null);

  const handleApply = () => {
    if (direction) {
      onApply(direction);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-surface dark:bg-dark-bg p-4 sm:p-6 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
            <h2 className="text-xl font-bold text-text-primary dark:text-white">Vẽ Hướng Cần Tạo</h2>
            <p className="text-text-secondary dark:text-gray-300 text-sm mt-1">Vẽ một mũi tên trên ảnh để chỉ định hướng nhìn mới mà bạn muốn AI tạo ra.</p>
        </div>

        <DirectionalCanvas image={image} onDirectionChange={setDirection} />
        
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-2">
          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleApply}
            disabled={!direction}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
};

export default DirectionalModal;