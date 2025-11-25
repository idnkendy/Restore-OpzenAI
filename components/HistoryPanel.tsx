
import React, { useState, useEffect } from 'react';
import * as historyService from '../services/historyService';
import { HistoryItem, Tool } from '../types';
import Spinner from './Spinner';

const toolDisplayNames: Record<string, string> = {
    [Tool.FloorPlan]: 'Render Mặt Bằng',
    [Tool.Renovation]: 'Cải Tạo AI',
    [Tool.ArchitecturalRendering]: 'Render Kiến trúc',
    [Tool.InteriorRendering]: 'Render Nội thất',
    [Tool.UrbanPlanning]: 'Render Quy hoạch',
    [Tool.LandscapeRendering]: 'Render Sân vườn',
    [Tool.AITechnicalDrawings]: 'Bản vẽ kỹ thuật AI',
    [Tool.SketchConverter]: 'Biến ảnh thành Sketch',
    [Tool.ViewSync]: 'Đồng Bộ View',
    [Tool.MaterialSwap]: 'Thay Vật Liệu AI',
    [Tool.VideoGeneration]: 'Tạo Video AI',
    [Tool.ImageEditing]: 'Chỉnh Sửa Ảnh AI',
    [Tool.Upscale]: 'Upscale AI',
    [Tool.Moodboard]: 'Tạo ảnh Moodboard',
    [Tool.History]: 'Lịch sử',
    [Tool.FengShui]: 'Phân tích Phong thủy',
};

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const XMarkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const HistoryPanel: React.FC = () => {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

    useEffect(() => {
        const loadHistory = async () => {
            setIsLoading(true);
            try {
                const items = await historyService.getHistory();
                setHistory(items);
            } catch (error) {
                console.error("Failed to load history from Supabase", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadHistory();
    }, []);

    const handleClearHistory = async () => {
        if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử không? Hành động này không thể hoàn tác.')) {
            setIsLoading(true);
            try {
                await historyService.clearHistory();
                setHistory([]);
            } catch (error) {
                alert("Có lỗi xảy ra khi xóa lịch sử.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
        // Critical: Stop propagation to prevent modal from opening
        e.stopPropagation();
        e.preventDefault(); 

        if (window.confirm('Bạn có chắc chắn muốn xóa mục này không?')) {
            setIsDeletingId(id);
            try {
                await historyService.deleteHistoryItem(id);
                setHistory(prev => prev.filter(item => item.id !== id));
            } catch (error: any) {
                console.error("Delete error:", error);
                alert(`Không thể xóa mục này: ${error.message || "Lỗi không xác định"}`);
            } finally {
                setIsDeletingId(null);
            }
        }
    };
    
    const handleModalDelete = async () => {
        if (!selectedItem) return;
        if (window.confirm('Bạn có chắc chắn muốn xóa mục này không?')) {
            setIsDeletingId(selectedItem.id);
            try {
                await historyService.deleteHistoryItem(selectedItem.id);
                setHistory(prev => prev.filter(item => item.id !== selectedItem.id));
                setSelectedItem(null);
            } catch (error: any) {
                 console.error("Delete error:", error);
                 alert(`Không thể xóa mục này: ${error.message || "Lỗi không xác định"}`);
            } finally {
                setIsDeletingId(null);
            }
        }
    };

    const renderModal = () => {
        if (!selectedItem) return null;

        const handleDownload = () => {
            if (!selectedItem) return;
            const url = selectedItem.media_url || selectedItem.resultImageURL || selectedItem.resultVideoURL;
            if (!url) return;
            
            const isVideo = selectedItem.media_type === 'video' || !!selectedItem.resultVideoURL;

            const link = document.createElement('a');
            link.href = url;
            link.download = isVideo
                ? `ai-mastery-render-${selectedItem.id}.mp4`
                : `ai-mastery-render-${selectedItem.id}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
        
        // Backwards compatibility for display
        const displayUrl = selectedItem.media_url || selectedItem.resultImageURL || selectedItem.resultVideoURL;
        const sourceUrl = selectedItem.source_url || selectedItem.sourceImageURL;
        const isVideo = selectedItem.media_type === 'video' || !!selectedItem.resultVideoURL;
        const dateString = selectedItem.created_at 
            ? new Date(selectedItem.created_at).toLocaleString('vi-VN') 
            : (selectedItem.timestamp ? new Date(selectedItem.timestamp).toLocaleString('vi-VN') : '');

        return (
            <div 
                className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in"
                onClick={() => setSelectedItem(null)}
            >
                <div 
                    className="relative bg-surface dark:bg-dark-bg p-6 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto flex flex-col lg:flex-row gap-8 border border-border-color dark:border-gray-700 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close Button - Top Right */}
                    <button
                        onClick={() => setSelectedItem(null)}
                        className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors z-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Đóng"
                    >
                        <XMarkIcon />
                    </button>

                    <div className="flex-1 flex flex-col min-w-0">
                        <h3 className="text-xl font-bold text-text-primary dark:text-white mb-4 flex items-center gap-2">
                            Kết Quả
                            {isVideo && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200">Video</span>}
                        </h3>
                        <div className="flex-grow bg-black/5 dark:bg-black/20 rounded-lg border border-border-color dark:border-gray-700 overflow-hidden flex items-center justify-center min-h-[300px] lg:min-h-[400px]">
                            {isVideo ? (
                                <video controls autoPlay src={displayUrl} className="w-full h-full max-h-[60vh] object-contain" />
                            ) : (
                                displayUrl && <img src={displayUrl} alt="Kết quả đã tạo" className="w-full h-full max-h-[60vh] object-contain" />
                            )}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col w-full lg:max-w-md space-y-5">
                         {sourceUrl && (
                             <div>
                                <h3 className="text-sm font-bold text-text-secondary dark:text-gray-400 mb-2 uppercase tracking-wider">Ảnh Gốc</h3>
                                <div className="w-full rounded-lg overflow-hidden border border-border-color dark:border-gray-700 bg-black/5 dark:bg-black/20 flex justify-center items-center">
                                    <img src={sourceUrl} alt="Ảnh gốc" className="max-h-60 w-auto max-w-full object-contain" />
                                </div>
                            </div>
                         )}
                        
                        <div className="space-y-4 flex-grow overflow-y-auto pr-2">
                            <div>
                                <h3 className="text-sm font-bold text-text-secondary dark:text-gray-400 mb-1 uppercase tracking-wider">Công cụ</h3>
                                <p className="text-text-primary dark:text-white font-medium">{toolDisplayNames[selectedItem.tool] || selectedItem.tool}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-text-secondary dark:text-gray-400 mb-1 uppercase tracking-wider">Thời gian</h3>
                                <p className="text-text-primary dark:text-white font-medium">{dateString}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-text-secondary dark:text-gray-400 mb-1 uppercase tracking-wider">Prompt</h3>
                                <div className="bg-main-bg dark:bg-gray-800/50 p-3 rounded-lg border border-border-color dark:border-gray-700">
                                    <p className="text-text-primary dark:text-gray-200 text-sm leading-relaxed break-words max-h-40 overflow-y-auto pr-1">
                                        {selectedItem.prompt}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 mt-auto border-t border-border-color dark:border-gray-700 flex flex-col sm:flex-row items-center gap-3">
                            <button
                                onClick={handleModalDelete}
                                disabled={isDeletingId === selectedItem.id}
                                className="w-full sm:w-auto px-4 py-2.5 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium text-sm transition-colors flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            >
                                {isDeletingId === selectedItem.id ? <Spinner /> : <TrashIcon />}
                                <span>Xóa</span>
                            </button>
                            
                            <div className="flex-grow hidden sm:block"></div>
                            
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="w-full sm:w-auto px-5 py-2.5 text-text-secondary dark:text-gray-300 hover:text-text-primary dark:hover:text-white font-medium text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                Đóng
                            </button>
                            <button
                                onClick={handleDownload}
                                className="w-full sm:w-auto bg-[#7f13ec] hover:bg-[#690fca] text-white font-bold py-2.5 px-5 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                            >
                                <DownloadIcon />
                                <span>Tải xuống</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div>
            {renderModal()}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-text-primary dark:text-white">Lịch sử ảnh đã tạo</h2>
                    <p className="text-text-secondary dark:text-gray-300 text-sm mt-1">Xem lại các tác phẩm bạn đã tạo. Dữ liệu được lưu trữ trên đám mây.</p>
                </div>
                {history.length > 0 && !isLoading && (
                    <button
                        onClick={handleClearHistory}
                        className="group flex items-center gap-2 px-4 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-sm font-medium self-start sm:self-center border border-transparent hover:border-red-200 dark:hover:border-red-800/50"
                    >
                        <TrashIcon />
                        <span>Xóa tất cả</span>
                    </button>
                )}
            </div>

            {isLoading ? (
                 <div className="text-center py-20 bg-surface dark:bg-gray-800/30 rounded-xl border-2 border-dashed border-border-color dark:border-gray-700">
                    <div className="flex justify-center items-center mb-4">
                        <Spinner />
                    </div>
                    <p className="text-text-secondary dark:text-gray-400 animate-pulse">Đang tải dữ liệu...</p>
                </div>
            ) : history.length === 0 ? (
                <div className="text-center py-20 bg-surface dark:bg-gray-800/30 rounded-xl border-2 border-dashed border-border-color dark:border-gray-700">
                    <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 text-gray-400 dark:text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-1">Chưa có lịch sử</h3>
                    <p className="text-sm text-text-secondary dark:text-gray-400">Hãy bắt đầu sáng tạo để lưu lại các tác phẩm của bạn tại đây.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {history.map(item => {
                         const displayUrl = item.media_url || item.resultImageURL || item.resultVideoURL;
                         const isVideo = item.media_type === 'video' || !!item.resultVideoURL;
                         const dateString = item.created_at 
                            ? new Date(item.created_at).toLocaleDateString('vi-VN')
                            : (item.timestamp ? new Date(item.timestamp).toLocaleDateString('vi-VN') : '');
                         
                         const isDeleting = isDeletingId === item.id;

                         return (
                            <div 
                                key={item.id} 
                                className="group relative aspect-square bg-surface dark:bg-gray-800 rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl border border-border-color dark:border-gray-700 hover:border-accent dark:hover:border-accent transition-all duration-300" 
                                onClick={() => setSelectedItem(item)}
                            >
                                {isVideo ? (
                                    <>
                                        <video 
                                            src={displayUrl} 
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                                            muted 
                                            autoPlay 
                                            loop 
                                            playsInline
                                        />
                                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none">
                                            <div className="bg-black/30 p-2 rounded-full backdrop-blur-sm">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    displayUrl && <img src={displayUrl} alt={item.prompt} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                                )}
                                
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                                    <p className="text-white text-xs font-bold mb-0.5 truncate">{toolDisplayNames[item.tool] || item.tool}</p>
                                    <p className="text-gray-300 text-[10px]">{dateString}</p>
                                </div>

                                {isDeleting ? (
                                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20 backdrop-blur-sm">
                                        <Spinner />
                                    </div>
                                ) : (
                                    <button
                                        onClick={(e) => handleDeleteItem(item.id, e)}
                                        className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 backdrop-blur-md shadow-sm hover:scale-110"
                                        title="Xóa mục này"
                                    >
                                        <TrashIcon />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default HistoryPanel;
