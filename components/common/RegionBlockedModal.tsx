
import React from 'react';

interface RegionBlockedModalProps {
  onClose: () => void;
}

const RegionBlockedModal: React.FC<RegionBlockedModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 animate-fade-in">
        <style>{`
            @keyframes slide-up {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
        `}</style>
      <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl max-w-md w-full p-6 shadow-2xl animate-slide-up border border-red-500/30 relative">
        
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>

        <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600 dark:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Khu vực không được hỗ trợ
            </h2>
            
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 leading-relaxed">
                Máy chủ Cloudflare đang chạy tại vị trí (Edge Location) bị Google chặn. 
                <br/>
                <span className="text-xs text-gray-500">(Thường là HAN - Hà Nội hoặc SGN - TP.HCM nếu bạn đang ở Việt Nam)</span>
            </p>

            <div className="bg-gray-50 dark:bg-[#252525] rounded-xl p-4 w-full text-left mb-6 border border-gray-100 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Giải pháp cho Người dùng:
                </h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-disc pl-5">
                    <li>Vui lòng bật <strong>VPN</strong> (1.1.1.1, NordVPN...).</li>
                    <li>Chuyển vùng sang <strong>Singapore</strong> hoặc <strong>Mỹ</strong>.</li>
                </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 w-full text-left mb-6 border border-blue-100 dark:border-blue-800/30">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 text-sm mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Giải pháp cho Admin (Server-side):
                </h3>
                <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                    Để Cloudflare Worker tự động dùng IP nước ngoài (không cần user bật VPN), hãy bật tính năng <strong>Smart Placement</strong> trong Cloudflare Dashboard (Yêu cầu gói Workers Paid).
                </p>
            </div>

            <button
                onClick={onClose}
                className="w-full py-3 px-4 bg-[#7f13ec] hover:bg-[#690fca] text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20"
            >
                Đã hiểu
            </button>
        </div>
      </div>
    </div>
  );
};

export default RegionBlockedModal;
