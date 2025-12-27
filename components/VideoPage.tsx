
import React, { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { UserStatus, Tool, FileData } from '../types';
import Header from './Header';
import { initialToolStates, VideoGeneratorState, VideoContextItem } from '../state/toolState';
import MultiImageUpload from './common/MultiImageUpload';
import ImageUpload from './common/ImageUpload';
import Spinner from './Spinner';
import * as geminiService from '../services/geminiService';
import * as externalVideoService from '../services/externalVideoService';
import * as historyService from '../services/historyService';
import * as jobService from '../services/jobService';
import { refundCredits } from '../services/paymentService';
import { supabase } from '../services/supabaseClient';

const API_BASE_URL = "https://twilight-fire-b7d4.truongvohaiaune.workers.dev";

const AspectRatioSelector = ({ value, onChange }: { value: '16:9' | '9:16' | 'default', onChange: (val: '16:9' | '9:16' | 'default') => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getIcon = (val: string) => {
        switch(val) {
            case '16:9': return 'crop_landscape';
            case '9:16': return 'crop_portrait';
            default: return 'crop_landscape';
        }
    }

    const getLabel = (val: string) => {
            switch(val) {
            case '16:9': return '16:9';
            case '9:16': return '9:16';
            default: return '16:9';
        }
    }

    return (
        <div className="relative h-full" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-full w-full px-3 bg-gray-100 dark:bg-[#2A2A2A] hover:bg-gray-200 dark:hover:bg-[#353535] border border-gray-300 dark:border-[#302839] rounded-xl flex items-center gap-2 text-gray-800 dark:text-white font-medium transition-all shadow-sm whitespace-nowrap justify-between"
                title="Chọn tỷ lệ khung hình"
            >
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xl text-[#7f13ec] notranslate">
                        {getIcon(value === 'default' ? '16:9' : value)}
                    </span>
                    <span>{getLabel(value === 'default' ? '16:9' : value)}</span>
                </div>
                <span className={`material-symbols-outlined text-gray-500 dark:text-gray-400 text-sm transition-transform duration-200 notranslate ${isOpen ? 'rotate-180' : ''}`}>
                    expand_less
                </span>
            </button>

            {isOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-full min-w-[140px] bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#302839] rounded-xl shadow-xl overflow-hidden z-50 p-1 animate-fade-in">
                    
                    {/* Option: 16:9 */}
                    <button
                        onClick={() => { onChange('16:9'); setIsOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                            value === '16:9' ? 'bg-[#7f13ec]/10 text-[#7f13ec]' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2A2A2A]'
                        }`}
                    >
                        <span className="material-symbols-outlined text-lg notranslate">crop_landscape</span>
                        <div className="flex flex-col items-start text-left">
                            <span className="font-bold">16:9</span>
                            <span className="text-[10px] opacity-70">Ngang</span>
                        </div>
                        {value === '16:9' && <span className="material-symbols-outlined text-sm ml-auto notranslate">check</span>}
                    </button>

                    {/* Option: 9:16 */}
                    <button
                        onClick={() => { onChange('9:16'); setIsOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                            value === '9:16' ? 'bg-[#7f13ec]/10 text-[#7f13ec]' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2A2A2A]'
                        }`}
                    >
                        <span className="material-symbols-outlined text-lg notranslate">crop_portrait</span>
                        <div className="flex flex-col items-start text-left">
                            <span className="font-bold">9:16</span>
                            <span className="text-[10px] opacity-70">Dọc</span>
                        </div>
                        {value === '9:16' && <span className="material-symbols-outlined text-sm ml-auto notranslate">check</span>}
                    </button>
                </div>
            )}
        </div>
    );
};

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div 
                className="bg-surface dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#302839] rounded-2xl p-6 shadow-2xl max-w-sm w-full transform transition-all scale-100 origin-center"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-500 mb-2">
                        <span className="material-symbols-outlined notranslate text-2xl">delete</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{message}</p>
                    
                    <div className="flex gap-3 w-full mt-4">
                        <button 
                            onClick={onClose}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-300 font-medium transition-colors border border-gray-300 dark:border-gray-700"
                        >
                            <span>Hủy bỏ</span>
                        </button>
                        <button 
                            onClick={onConfirm}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors shadow-lg shadow-red-900/20"
                        >
                            <span>Xóa ngay</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const sidebarItems = [
    { 
        id: 'arch-film', 
        label: 'Phim kiến trúc', 
        icon: <span className="material-symbols-outlined notranslate">movie_filter</span>,
        prompt: 'Cinematic architectural film, establishing shot, photorealistic, 4k, slow camera movement capturing the building details and atmosphere.',
        isMaintenance: false
    },
    { 
        id: 'img-to-video', 
        label: 'Tạo video từ ảnh', 
        icon: <span className="material-symbols-outlined notranslate">image</span>,
        prompt: 'High quality video generated from image, smooth motion, 4k, cinematic lighting.',
        isMaintenance: false
    },
    { 
        id: 'text-to-video', 
        label: 'Tạo video từ text', 
        icon: <span className="material-symbols-outlined notranslate">description</span>,
        prompt: 'A high quality video of modern architecture, cinematic view, 4k.',
        isMaintenance: true
    },
    { 
        id: 'transition', 
        label: 'Video chuyển cảnh', 
        icon: <span className="material-symbols-outlined notranslate">transition_push</span>,
        prompt: 'Smooth morphing transition, changing lighting from day to night, timelapse effect.',
        isMaintenance: true
    },
    {
        id: 'extend-video', 
        label: 'Mở rộng video',
        icon: <span className="material-symbols-outlined notranslate">playlist_add</span>,
        prompt: 'Nối tiếp cảnh quay hiện tại, giữ nguyên phong cách và ánh sáng, camera di chuyển mượt mà.',
        isMaintenance: true
    }
];

const DUMMY_FILE: FileData = {
    base64: '',
    mimeType: 'image/png',
    objectURL: 'https://placehold.co/600x400/1a1a1a/FFF?text=Text+To+Video'
};

const loadingMessages = [
    "Đang kết nối với máy chủ Veo...",
    "Đang gửi yêu cầu đến Worker...",
    "AI đang khởi tạo các photon ánh sáng...",
    "Đang tổng hợp từng khung hình...",
    "Vui lòng không tắt tab này...",
    "Quá trình có thể mất 3-6 phút...",
    "Nếu quá lâu, hệ thống sẽ tự động thử lại...",
];

const mapFriendlyErrorMessage = (errorMsg: string): string => {
    if (!errorMsg) return "Lỗi Kỹ Thuật: Đã xảy ra sự cố. Vui lòng thử lại sau.";
    
    const msg = errorMsg.toUpperCase();
    const suffix = " Vui lòng thử lại sau.";
    
    // Check for JSON error from worker
    try {
        if (errorMsg.trim().startsWith('{')) {
             const parsed = JSON.parse(errorMsg);
             if (parsed.status === 'MEDIA_GENERATION_STATUS_FAILED') {
                 // Try to extract nested error message
                 const nestedMsg = parsed.operation?.error?.message;
                 if (nestedMsg && nestedMsg.includes("Video not found")) {
                     return "Lỗi Tạo Video: Hệ thống không thể hoàn tất video (Video Not Found). Bạn đã được hoàn tiền." + suffix;
                 }
                 return `Lỗi Tạo Video: ${nestedMsg || "Không xác định"}. Bạn đã được hoàn tiền.` + suffix;
             }
        }
    } catch(e) {}

    if (msg.includes("SAFETY_ERROR") || msg.includes("SAFETY") || msg.includes("BLOCK") || msg.includes("PROHIBITED")) {
        return "Lỗi Nội Dung: Vi phạm chính sách an toàn." + suffix;
    }
    if (msg.includes("QUOTA_ERROR") || msg.includes("429") || msg.includes("RESOURCE") || msg.includes("OVERLOAD")) {
        return "Lỗi Quá Tải: Hệ thống đang bận." + suffix;
    }
    if (msg.includes("TIMEOUT_ERROR") || msg.includes("HẾT THỜI GIAN") || msg.includes("TIMEOUT")) {
        return "Lỗi Timeout: Quá trình xử lý quá lâu." + suffix;
    }
    if (msg.includes("AUTH_ERROR") || msg.includes("401") || msg.includes("403") || msg.includes("TOKEN")) {
        return "Lỗi Xác Thực: Phiên kết nối lỗi." + suffix;
    }
    if (msg.includes("SYSTEM_ERROR") || msg.includes("500") || msg.includes("502") || msg.includes("NETWORK")) {
        return "Lỗi Hệ Thống: Máy chủ gặp sự cố." + suffix;
    }
    if (msg.includes("KHÔNG ĐỦ CREDITS")) {
        return "Lỗi Thanh Toán: Bạn không đủ credits." + suffix;
    }
    if (msg.includes("GENERATION_FAILED") || msg.includes("VIDEO NOT FOUND")) {
        return "Lỗi Tạo Video: Hệ thống không thể hoàn tất video. Bạn đã được hoàn tiền." + suffix;
    }

    return `Lỗi Kỹ Thuật: ${errorMsg.substring(0, 40)}...` + suffix;
};

const MaintenanceView = ({ title }: { title: string }) => (
    <div className="bg-white/80 dark:bg-[#191919]/80 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-[#302839] p-5 shadow-lg flex flex-col gap-6 h-full overflow-hidden items-center justify-center text-center animate-fade-in">
        <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mb-2 shadow-inner border border-yellow-500/20">
            <span className="material-symbols-outlined notranslate text-yellow-500 text-4xl">engineering</span>
        </div>
        <div>
            <h3 className="text-gray-900 dark:text-white font-bold text-2xl mb-3">{title}</h3>
            <div className="w-16 h-1 bg-yellow-500/50 mx-auto rounded-full mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400 text-sm max-w-sm leading-relaxed mx-auto">
                Tính năng đang được tạm dừng để nâng cấp hệ thống máy chủ nhằm đảm bảo chất lượng render tốt nhất.
                <br/>
                Vui lòng quay lại sau!
            </p>
        </div>
        <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-500/30 px-4 py-2 rounded-lg mt-2">
            <span className="text-yellow-600 dark:text-yellow-500 text-xs font-bold uppercase tracking-wider">Đang bảo trì</span>
        </div>
    </div>
);

interface VideoPageProps {
    session: { user: User } | null;
    userStatus: UserStatus | null;
    onGoHome: () => void;
    onThemeToggle: () => void;
    theme: 'light' | 'dark';
    onSignOut: () => void;
    onOpenGallery: () => void;
    onUpgrade: () => void;
    onOpenProfile: () => void;
    onToggleNav: () => void;
    onDeductCredits: (amount: number, description: string) => Promise<string>;
    onRefreshCredits: () => Promise<void>;
}

const VideoPage: React.FC<VideoPageProps> = (props) => {
    // ... (state defs) ...
    const [activeItem, setActiveItem] = useState('arch-film');
    // Ensure default state starts with '16:9' if it was 'default' before
    const [videoState, setVideoState] = useState<VideoGeneratorState>({
        ...initialToolStates[Tool.VideoGeneration],
        aspectRatio: '16:9' // Force 16:9 as initial if default was 'default'
    });
    const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
    
    // --- SINGLE MODE STATES (Img2Vid, Text2Vid, Transition) ---
    const [singleSourceImage, setSingleSourceImage] = useState<FileData | null>(null);
    const [singlePrompt, setSinglePrompt] = useState('');
    const [isSingleGenerating, setIsSingleGenerating] = useState(false);

    // --- TIMELINE & PLAYER STATES ---
    const [currentPlayingIndex, setCurrentPlayingIndex] = useState<number>(0);
    const [isPlayingAll, setIsPlayingAll] = useState(false);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0); 
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [isMusicMuted, setIsMusicMuted] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0); 
    const [audioDuration, setAudioDuration] = useState(0);

    // --- DELETE MODAL STATE ---
    const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; itemId: string | null }>({
        isOpen: false,
        itemId: null
    });

    const mainVideoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const timelineContainerRef = useRef<HTMLDivElement>(null);

    // ... (useEffect hooks for prompt, sync playback, etc.) ...
    // Initialize prompt
    useEffect(() => {
        const defaultItem = sidebarItems.find(item => item.id === activeItem);
        if (defaultItem) {
            setSinglePrompt(defaultItem.prompt);
        }
    }, [activeItem]);

    // Sync Playback
    useEffect(() => {
        const videoEl = mainVideoRef.current;
        const audioEl = audioRef.current;
        if (isPlaying) {
            videoEl?.play().catch(() => {});
            if (isPlayingAll && !isMusicMuted) audioEl?.play().catch(() => {});
            else audioEl?.pause(); 
        } else {
            videoEl?.pause();
            audioEl?.pause();
        }
    }, [isPlaying, isPlayingAll, isMusicMuted]);

    useEffect(() => {
        if (mainVideoRef.current) mainVideoRef.current.muted = isVideoMuted;
        if (audioRef.current) audioRef.current.muted = isMusicMuted;
    }, [isVideoMuted, isMusicMuted]);

    useEffect(() => {
        if (isPlayingAll && isPlaying) {
            const videoEl = mainVideoRef.current;
            if (videoEl) {
                videoEl.currentTime = 0;
                videoEl.play().catch(() => {});
            }
        }
    }, [currentPlayingIndex]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (videoState.isLoading || isSingleGenerating || videoState.contextItems.some(i => i.isGeneratingVideo)) {
            interval = setInterval(() => {
                const currentIndex = loadingMessages.indexOf(videoState.loadingMessage);
                const nextIndex = (currentIndex + 1) % loadingMessages.length;
                setVideoState(prev => ({ ...prev, loadingMessage: loadingMessages[nextIndex] }));
            }, 5000); 
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [videoState.isLoading, isSingleGenerating, videoState.contextItems, videoState.loadingMessage]);

    // ... (Timeline controls: handleTimeUpdate, seekToPercent, handleSeek, handleTimelineClick, togglePlayPause, handleVideoEnded) ...
    const handleTimeUpdate = () => {
        if (!mainVideoRef.current) return;
        const currentClipTime = mainVideoRef.current.currentTime;
        const currentClipDuration = mainVideoRef.current.duration || 1; 
        const playableItems = videoState.contextItems.filter(i => i.videoUrl && i.isInTimeline);
        const totalClips = playableItems.length;

        if (totalClips === 0) { setProgress(0); return; }

        if (isPlayingAll) {
            const segmentSize = 100 / totalClips;
            const currentClipProgressPercent = (currentClipTime / currentClipDuration) * segmentSize;
            const completedSegmentsPercent = currentPlayingIndex * segmentSize;
            const totalProgress = completedSegmentsPercent + currentClipProgressPercent;
            setProgress(Math.min(totalProgress, 100));
        } else {
            setProgress((currentClipTime / currentClipDuration) * 100);
        }
    };

    const seekToPercent = (percent: number) => {
        const playableItems = videoState.contextItems.filter(i => i.videoUrl && i.isInTimeline);
        const totalClips = playableItems.length;
        if (totalClips === 0) return;

        if (isPlayingAll) {
            const segmentSize = 100 / totalClips;
            let targetIndex = Math.floor(percent / segmentSize);
            if (targetIndex >= totalClips) targetIndex = totalClips - 1; 
            const percentWithinSegment = (percent % segmentSize) / segmentSize;
            
            if (targetIndex !== currentPlayingIndex) {
                setCurrentPlayingIndex(targetIndex);
            }
            setTimeout(() => {
                if (mainVideoRef.current) {
                    const dur = mainVideoRef.current.duration || 1;
                    mainVideoRef.current.currentTime = percentWithinSegment * dur;
                }
            }, 50);
            if (audioRef.current && audioDuration > 0) {
                audioRef.current.currentTime = (percent / 100) * audioDuration;
            }
        } else {
            if (mainVideoRef.current) {
                const dur = mainVideoRef.current.duration || 1;
                mainVideoRef.current.currentTime = (percent / 100) * dur;
            }
        }
        setProgress(percent);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => seekToPercent(Number(e.target.value));
    
    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!timelineContainerRef.current) return;
        const rect = timelineContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
        seekToPercent(percent);
    };

    const togglePlayPause = () => {
        setIsPlaying(!isPlaying);
        const timelineCount = videoState.contextItems.filter(i => i.videoUrl && i.isInTimeline).length;
        if (!isPlaying && timelineCount > 1 && !isPlayingAll) {
            setIsPlayingAll(true);
        }
    };

    const handleVideoEnded = () => {
        if (!isPlayingAll) {
            setIsPlaying(false);
            return;
        }
        const playableItems = videoState.contextItems.filter(i => i.videoUrl && i.isInTimeline);
        if (currentPlayingIndex < playableItems.length - 1) {
            setCurrentPlayingIndex(prev => prev + 1);
        } else {
            setIsPlaying(false);
            setCurrentPlayingIndex(0);
            setProgress(0);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        }
    };

    // ... (Sidebar, AspectRatio, Arch Film logic) ...
    const handleSidebarClick = (item: typeof sidebarItems[0]) => {
        setActiveItem(item.id);
        setSinglePrompt(item.prompt);
        setVideoState(prev => ({ ...prev, error: null }));
        // Reset single mode states
        setSingleSourceImage(null);
        setIsSingleGenerating(false);
    };

    const handleAspectRatioChange = async (newRatio: '16:9' | '9:16' | 'default') => {
        if (videoState.aspectRatio === newRatio) return;

        setVideoState(prev => ({ ...prev, aspectRatio: newRatio }));

        if (videoState.contextItems.length > 0) {
            const updatedItems = await Promise.all(videoState.contextItems.map(async (item) => {
                if (item.isUploaded) return item; 
                const croppedBase64 = await externalVideoService.resizeAndCropImage(item.originalFile, newRatio);
                const croppedFile: FileData = { 
                    base64: croppedBase64.split(',')[1], 
                    mimeType: 'image/jpeg', 
                    objectURL: croppedBase64 
                };
                return { ...item, file: croppedFile };
            }));

            setVideoState(prev => ({ ...prev, contextItems: updatedItems }));
        }
    };

    const handleFilesChange = async (files: FileData[]) => {
        const newItemsPromises = files
            .filter(f => !videoState.contextItems.some(item => item.originalFile.objectURL === f.objectURL))
            .map(async (f) => {
                const croppedBase64 = await externalVideoService.resizeAndCropImage(f, videoState.aspectRatio);
                const croppedFile: FileData = { base64: croppedBase64.split(',')[1], mimeType: 'image/jpeg', objectURL: croppedBase64 };
                return {
                    id: Math.random().toString(36).substr(2, 9),
                    file: croppedFile, originalFile: f, prompt: '', isGeneratingPrompt: false, isUploaded: false, isInTimeline: false
                } as VideoContextItem;
            });
        
        const newItems = await Promise.all(newItemsPromises);
        if (newItems.length > 0) {
            setVideoState(prev => ({ ...prev, contextItems: [...prev.contextItems, ...newItems] }));
        }
    };

    const handleCharacterFileChange = (file: FileData | null) => {
        setVideoState(prev => ({ ...prev, characterImage: file }));
    };

    const handleToggleCharacter = (itemId: string) => {
        setVideoState(prev => ({
            ...prev,
            contextItems: prev.contextItems.map(item => {
                if (item.id === itemId) {
                    const willUseChar = !item.useCharacter;
                    let newPrompt = item.prompt;
                    const charSuffix = ", featuring the character from the reference image, consistent style";
                    
                    if (willUseChar && !newPrompt.includes(charSuffix)) {
                        newPrompt += charSuffix;
                    } else if (!willUseChar && newPrompt.includes(charSuffix)) {
                        newPrompt = newPrompt.replace(charSuffix, "");
                    }
                    
                    return { ...item, useCharacter: willUseChar, prompt: newPrompt };
                }
                return item;
            })
        }));
    };

    const handleGenerateContextPrompts = async () => {
        setIsGeneratingPrompts(true);
        const itemsToProcess = videoState.contextItems.filter(item => !item.isUploaded && !item.prompt && !item.videoUrl);
        
        setVideoState(prev => ({
            ...prev,
            contextItems: prev.contextItems.map(item => !item.isUploaded && !item.prompt && !item.videoUrl ? { ...item, isGeneratingPrompt: true } : item)
        }));

        try {
            const updatedItems = await Promise.all(itemsToProcess.map(async (item) => {
                try {
                    const generatedPrompt = await geminiService.generateVideoPromptFromImage(item.file);
                    return { ...item, prompt: generatedPrompt, isGeneratingPrompt: false };
                } catch (error) {
                    return { ...item, isGeneratingPrompt: false, prompt: "Cinematic architectural shot." };
                }
            }));
            setVideoState(prev => ({
                ...prev,
                contextItems: prev.contextItems.map(item => updatedItems.find(u => u.id === item.id) || item)
            }));
        } finally {
            setIsGeneratingPrompts(false);
        }
    };

    // --- GENERAL GENERATION LOGIC (Used by Arch Film clips) ---
    const handleGenerateClip = async (item: VideoContextItem) => {
        const cost = 5;
        if ((props.userStatus?.credits || 0) < cost) {
             setVideoState(prev => ({ ...prev, error: mapFriendlyErrorMessage("KHÔNG ĐỦ CREDITS") }));
             return;
        }
        if (!item.prompt) {
            setVideoState(prev => ({ ...prev, error: 'Vui lòng nhập prompt.' }));
            return;
        }

        if (item.useCharacter && !videoState.characterImage) {
            setVideoState(prev => ({ ...prev, error: 'Vui lòng tải lên ảnh nhân vật trước khi tạo video có nhân vật.' }));
            return;
        }

        setVideoState(prev => ({
            ...prev,
            contextItems: prev.contextItems.map(i => i.id === item.id ? { ...i, isGeneratingVideo: true } : i),
            error: null,
            loadingMessage: loadingMessages[0]
        }));

        let jobId: string | null = null;
        let logId: string | null = null;

        try {
            logId = await props.onDeductCredits(cost, `Tạo Video Clip (${activeItem})`);
            
            // --- PROTECTIVE MARKER ---
            if (logId) {
                localStorage.setItem('opzen_pending_tx', JSON.stringify({
                    logId: logId,
                    amount: cost,
                    reason: `Tạo Video Clip - ${item.prompt.substring(0, 20)}...`,
                    timestamp: Date.now()
                }));
            }
            // ------------------------

            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId) { 
                 jobId = await jobService.createJob({ user_id: user.id, tool_id: Tool.VideoGeneration, prompt: item.prompt, cost: cost, usage_log_id: logId });
                 
                 // SAFETY CHECK
                 if (!jobId && logId) {
                     throw new Error("Lỗi hệ thống: Không thể tạo bản ghi công việc.");
                 }
                 
                 // Job created, safe to remove
                 localStorage.removeItem('opzen_pending_tx');
            }
            if (jobId) await jobService.updateJobStatus(jobId, 'processing');

            let result;
            if (item.useCharacter && videoState.characterImage) {
                // Use Veo 3.0 with references
                result = await externalVideoService.generateVideoWithReferences(
                    item.prompt, 
                    item.file, 
                    videoState.characterImage, 
                    videoState.aspectRatio
                );
            } else {
                // Use Standard/Veo Logic
                result = await externalVideoService.generateVideoExternal(item.prompt, "", item.file, videoState.aspectRatio);
            }
            
            setVideoState(prev => ({
                ...prev,
                contextItems: prev.contextItems.map(i => i.id === item.id ? { ...i, videoUrl: result.videoUrl, isGeneratingVideo: false } : i),
            }));

            if (jobId) await jobService.updateJobStatus(jobId, 'completed', result.videoUrl);
            await historyService.addToHistory({ tool: Tool.VideoGeneration, prompt: item.prompt, sourceImageURL: item.file.objectURL, resultVideoURL: result.videoUrl });

        } catch (err: any) {
            const rawMsg = err.message || "";
            let friendlyMsg = mapFriendlyErrorMessage(rawMsg);
            
            // Explicit Refund Trigger for "Video not found" or Generation Failed errors
            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId) {
                await refundCredits(user.id, cost, `Hoàn tiền: Lỗi tạo video (${rawMsg})`);
                await props.onRefreshCredits(); 
                friendlyMsg += " (Credits đã được hoàn trả)";
            }
            
            // Cleanup marker
            localStorage.removeItem('opzen_pending_tx');

            setVideoState(prev => ({ ...prev, error: friendlyMsg, contextItems: prev.contextItems.map(i => i.id === item.id ? { ...i, isGeneratingVideo: false } : i) }));
            if (jobId) await jobService.updateJobStatus(jobId, 'failed', undefined, rawMsg);
        }
    };

    // --- TIMELINE LOGIC ---
    const handleAddToTimeline = (id: string) => {
        setVideoState(prev => ({
            ...prev,
            contextItems: prev.contextItems.map(i => i.id === id ? { ...i, isInTimeline: true } : i)
        }));
    };

    const handleDeleteItem = (id: string) => {
        setDeleteModalState({ isOpen: true, itemId: id });
    };

    const executeDelete = () => {
        if (deleteModalState.itemId) {
            setVideoState(prev => ({
                ...prev,
                contextItems: prev.contextItems.filter(i => i.id !== deleteModalState.itemId)
            }));
        }
        setDeleteModalState({ isOpen: false, itemId: null });
    };

    const handleRemoveFromTimeline = (id: string) => {
        setVideoState(prev => ({
            ...prev,
            contextItems: prev.contextItems.map(i => i.id === id ? { ...i, isInTimeline: false } : i)
        }));
    };

    const handleSimpleDownload = (url?: string) => {
        const targetUrl = url || videoState.generatedVideoUrl;
        if (!targetUrl) return;
        window.open(targetUrl, '_blank');
    };

    const handleDownloadSingle = (url: string, index: number) => {
        window.open(url, '_blank');
    };


    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const url = URL.createObjectURL(file);
        const newItem: VideoContextItem = {
            id: Math.random().toString(36).substr(2, 9),
            file: DUMMY_FILE,
            originalFile: DUMMY_FILE,
            prompt: 'Uploaded Video',
            isGeneratingPrompt: false,
            videoUrl: url,
            isGeneratingVideo: false,
            isUploaded: true,
            isInTimeline: true
        };
        
        setVideoState(prev => ({
            ...prev,
            contextItems: [...prev.contextItems, newItem]
        }));
    };

    const handleDownloadAll = async () => {
        const items = videoState.contextItems.filter(i => i.videoUrl && i.isInTimeline);
        if (items.length === 0) return;
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.videoUrl) {
                handleDownloadSingle(item.videoUrl, i);
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    };

    const handleExtendClip = async (item: VideoContextItem) => {
        alert("Tính năng nối tiếp (Extend) đang được cập nhật.");
    };

    const handleMergeAndExport = async () => {
        const items = videoState.contextItems.filter(i => i.videoUrl && i.isInTimeline);
        if (items.length < 1) {
            setVideoState(prev => ({ ...prev, error: "Cần ít nhất 1 clip trong timeline để xuất." }));
            return;
        }
        
        setIsExporting(true);
        setExportProgress(0);
        
        const interval = setInterval(() => {
            setExportProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 5;
            });
        }, 200);
        
        await new Promise(r => setTimeout(r, 4500));
        clearInterval(interval);
        setIsExporting(false);
        
        handleDownloadAll();
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        setDraggedItemIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault();
        if (draggedItemIndex === null || draggedItemIndex === index) return;

        const timelineItems = videoState.contextItems.filter(i => i.videoUrl && i.isInTimeline);
        const otherItems = videoState.contextItems.filter(i => !(i.videoUrl && i.isInTimeline));
        
        const newTimelineItems = [...timelineItems];
        const [movedItem] = newTimelineItems.splice(draggedItemIndex, 1);
        newTimelineItems.splice(index, 0, movedItem);

        setVideoState(prev => ({
            ...prev,
            contextItems: [...otherItems, ...newTimelineItems]
        }));
        
        setDraggedItemIndex(null);
    };

    // --- SINGLE GENERATION LOGIC (Img2Vid, Text2Vid, Transition) ---
    const handleSingleGeneration = async () => {
        const cost = 5;
        if ((props.userStatus?.credits || 0) < cost) {
             setVideoState(prev => ({ ...prev, error: mapFriendlyErrorMessage("KHÔNG ĐỦ CREDITS") }));
             return;
        }
        if (!singlePrompt) {
            setVideoState(prev => ({ ...prev, error: 'Vui lòng nhập mô tả.' }));
            return;
        }
        if (activeItem === 'img-to-video' && !singleSourceImage) {
            setVideoState(prev => ({ ...prev, error: 'Vui lòng tải lên ảnh.' }));
            return;
        }

        setIsSingleGenerating(true);
        setVideoState(prev => ({ ...prev, error: null, generatedVideoUrl: null, loadingMessage: loadingMessages[0] }));

        let jobId: string | null = null;
        let logId: string | null = null;

        try {
            logId = await props.onDeductCredits(cost, `Tạo Video (${activeItem})`);
            
            // --- PROTECTIVE MARKER ---
            if (logId) {
                localStorage.setItem('opzen_pending_tx', JSON.stringify({
                    logId: logId,
                    amount: cost,
                    reason: `Tạo Single Video - ${activeItem}`,
                    timestamp: Date.now()
                }));
            }
            // ------------------------

            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId) { 
                 jobId = await jobService.createJob({ user_id: user.id, tool_id: Tool.VideoGeneration, prompt: singlePrompt, cost: cost, usage_log_id: logId });
                 
                 // SAFETY CHECK
                 if (!jobId && logId) {
                     throw new Error("Lỗi hệ thống: Không thể tạo bản ghi công việc.");
                 }
                 
                 // Safe to remove
                 localStorage.removeItem('opzen_pending_tx');
            }
            if (jobId) await jobService.updateJobStatus(jobId, 'processing');

            // Handle Image Processing
            let startImageToUse: FileData | null | undefined = singleSourceImage;
            if (activeItem === 'text-to-video') {
                startImageToUse = undefined; 
            } else if (singleSourceImage) {
                const croppedBase64 = await externalVideoService.resizeAndCropImage(singleSourceImage, videoState.aspectRatio);
                startImageToUse = { base64: croppedBase64.split(',')[1], mimeType: 'image/jpeg', objectURL: croppedBase64 };
            }

            const result = await externalVideoService.generateVideoExternal(singlePrompt, "", startImageToUse || undefined, videoState.aspectRatio);
            
            setVideoState(prev => ({
                ...prev,
                generatedVideoUrl: result.videoUrl
            }));

            if (jobId) await jobService.updateJobStatus(jobId, 'completed', result.videoUrl);
            await historyService.addToHistory({ 
                tool: Tool.VideoGeneration, 
                prompt: singlePrompt, 
                sourceImageURL: startImageToUse?.objectURL, 
                resultVideoURL: result.videoUrl 
            });

        } catch (err: any) {
            const rawMsg = err.message || "";
            let friendlyMsg = mapFriendlyErrorMessage(rawMsg);
            
            const { data: { user } } = await supabase.auth.getUser();
            if (user && logId) {
                await refundCredits(user.id, cost, `Hoàn tiền: Lỗi tạo video (${rawMsg})`);
                await props.onRefreshCredits();
                friendlyMsg += " (Credits đã được hoàn trả)";
            }
            
            // Cleanup
            localStorage.removeItem('opzen_pending_tx');

            setVideoState(prev => ({ ...prev, error: friendlyMsg }));
            if (jobId) await jobService.updateJobStatus(jobId, 'failed', undefined, rawMsg);
        } finally {
            setIsSingleGenerating(false);
        }
    };

    // ... (VideoPage component rendering logic updated below) ...

    const creationItems = videoState.contextItems.filter(item => !item.isUploaded); 
    const timelineItems = videoState.contextItems.filter(item => item.videoUrl && item.isInTimeline);
    const activeMainVideoUrl = isPlayingAll ? timelineItems[currentPlayingIndex]?.videoUrl : (videoState.generatedVideoUrl || timelineItems.find(i => i.videoUrl)?.videoUrl);

    const renderContentInput = () => {
        // ... (existing renderContentInput code) ...
        switch (activeItem) {
            case 'arch-film': // BATCH MODE
                return (
                    <div className="bg-white/80 dark:bg-[#191919]/80 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-[#302839] flex flex-col h-full overflow-hidden shadow-lg">
                        
                        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
                            
                            {/* STEP 1: CONTEXT IMAGES */}
                            <div className="flex flex-col gap-2 bg-gray-50 dark:bg-[#121212]/50 p-3 rounded-xl border border-border-color dark:border-[#302839]">
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className="text-gray-900 dark:text-white font-bold text-base flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-[#7f13ec]/20 text-[#7f13ec] flex items-center justify-center text-xs">1</span>
                                        Tải ảnh bối cảnh
                                    </h3>
                                </div>
                                <div className="rounded-xl bg-white dark:bg-[#1E1E1E] transition-colors h-[220px] flex flex-col overflow-hidden">
                                    <MultiImageUpload onFilesChange={handleFilesChange} maxFiles={10} className="h-full" />
                                </div>
                            </div>

                            {/* STEP 2: CHARACTER UPLOAD & SELECTION */}
                            <div className="flex flex-col gap-4 bg-gray-50 dark:bg-[#121212]/50 p-3 rounded-xl border border-border-color dark:border-[#302839]">
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className="text-gray-900 dark:text-white font-bold text-base flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-[#7f13ec]/20 text-[#7f13ec] flex items-center justify-center text-xs">2</span>
                                        Thêm nhân vật (Tùy chọn)
                                    </h3>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-4">
                                    {/* Upload Character */}
                                    <div className="col-span-1">
                                        <ImageUpload 
                                            onFileSelect={handleCharacterFileChange} 
                                            previewUrl={videoState.characterImage?.objectURL} 
                                            id="character-upload" 
                                        />
                                        <p className="text-[10px] text-gray-500 text-center mt-1">Ảnh nhân vật</p>
                                    </div>
                                    
                                    {/* Scene Selection */}
                                    <div className="col-span-2 flex flex-col">
                                        <div className="flex-1 bg-white dark:bg-[#1E1E1E] rounded-xl border border-border-color dark:border-[#302839] p-2 overflow-y-auto max-h-[160px] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 relative">
                                            <p className="text-xs text-text-secondary dark:text-gray-400 mb-2 px-1 font-semibold sticky top-0 bg-white dark:bg-[#1E1E1E] z-10 py-1">
                                                Chọn cảnh để thêm nhân vật:
                                            </p>
                                            
                                            {!videoState.characterImage ? (
                                                <div className="h-full flex items-center justify-center text-[10px] text-gray-400 italic text-center p-2">
                                                    Vui lòng tải ảnh nhân vật trước
                                                </div>
                                            ) : creationItems.length === 0 ? (
                                                <div className="h-full flex items-center justify-center text-[10px] text-gray-400 italic text-center p-2">
                                                    Chưa có bối cảnh nào
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {creationItems.map((item, idx) => (
                                                        <div 
                                                            key={item.id} 
                                                            className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer relative z-0 hover:shadow-md ${
                                                                item.useCharacter 
                                                                    ? 'bg-[#7f13ec]/10 border-[#7f13ec] dark:bg-[#7f13ec]/20' 
                                                                    : 'bg-gray-50 dark:bg-[#252525] border-border-color dark:border-[#302839] hover:border-gray-400'
                                                            }`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                handleToggleCharacter(item.id);
                                                            }}
                                                        >
                                                            <div className={`w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center transition-colors ${
                                                                item.useCharacter 
                                                                    ? 'bg-[#7f13ec] border-[#7f13ec]' 
                                                                    : 'border-gray-400 dark:border-gray-600'
                                                            }`}>
                                                                {item.useCharacter && <span className="material-symbols-outlined text-white text-[10px] font-bold notranslate">check</span>}
                                                            </div>
                                                            <div className="w-8 h-8 flex-shrink-0 rounded overflow-hidden bg-gray-200">
                                                                <img src={item.file.objectURL} className="w-full h-full object-cover" alt={`Scene ${idx+1}`} />
                                                            </div>
                                                            <span className="text-xs text-text-primary dark:text-gray-300 truncate flex-1 font-medium">
                                                                Cảnh {idx + 1}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* FOOTER ACTIONS */}
                        <div className="p-5 border-t border-gray-200 dark:border-[#302839] flex-shrink-0 bg-white dark:bg-[#191919]">
                            <div className="flex gap-3 h-12">
                                <div className="w-[130px] h-full">
                                    <AspectRatioSelector value={videoState.aspectRatio} onChange={handleAspectRatioChange} />
                                </div>
                                <button
                                    onClick={handleGenerateContextPrompts}
                                    disabled={creationItems.length === 0 || isGeneratingPrompts}
                                    className="flex-1 py-3 bg-gradient-to-r from-[#7f13ec] to-[#9d4edd] hover:from-[#690fca] hover:to-[#8a3dcf] text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 h-full"
                                >
                                    {isGeneratingPrompts ? <Spinner /> : <span className="material-symbols-outlined notranslate">auto_fix_high</span>}
                                    <span className="whitespace-nowrap">{isGeneratingPrompts ? 'Đang phân tích...' : 'Tạo Bối Cảnh'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                );
            case 'img-to-video':
                // ... (Keep existing implementation)
                return (
                    <div className="bg-white/80 dark:bg-[#191919]/80 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-[#302839] p-5 shadow-lg flex flex-col gap-4 h-full overflow-hidden">
                        <div className="flex justify-between items-center">
                            <h3 className="text-gray-900 dark:text-white font-bold text-base flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#7f13ec] notranslate">image</span>
                                Tạo video từ ảnh
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Ảnh bắt đầu</label>
                                <ImageUpload onFileSelect={setSingleSourceImage} previewUrl={singleSourceImage?.objectURL} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Mô tả video</label>
                                <textarea 
                                    value={singlePrompt}
                                    onChange={(e) => setSinglePrompt(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-[#121212] border border-border-color dark:border-[#302839] rounded-lg p-3 text-sm text-gray-900 dark:text-gray-200 focus:border-[#7f13ec] focus:outline-none resize-none h-32"
                                    placeholder="Mô tả chuyển động..."
                                />
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1 mb-1">
                            <span>Chi phí: <b className="text-text-primary dark:text-white">5 Credits</b></span>
                            <span>Ví: <b className={`${(props.userStatus?.credits || 0) < 5 ? 'text-red-500' : 'text-[#7f13ec]'}`}>{props.userStatus?.credits || 0}</b></span>
                        </div>

                        <div className="flex gap-3 mt-auto h-12">
                            <div className="w-[130px] h-full">
                                <AspectRatioSelector value={videoState.aspectRatio} onChange={handleAspectRatioChange} />
                            </div>
                            <button
                                onClick={handleSingleGeneration}
                                disabled={isSingleGenerating} 
                                className="flex-1 py-3 bg-gradient-to-r from-[#7f13ec] to-[#9d4edd] text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 h-full"
                            >
                                {isSingleGenerating ? <Spinner /> : <span className="material-symbols-outlined notranslate">movie_creation</span>}
                                <span className="whitespace-nowrap">{isSingleGenerating ? 'Đang tạo...' : 'Tạo Video'}</span>
                            </button>
                        </div>
                    </div>
                );
            case 'text-to-video':
            case 'transition':
            case 'extend-video':
                return <MaintenanceView title={activeItem === 'text-to-video' ? 'Tạo video từ text' : activeItem === 'transition' ? 'Video chuyển cảnh' : 'Mở rộng video'} />;
            default: return null;
        }
    };

    // ... (rest of render method) ...
    return (
        // ... (standard container code - unchanged) ...
        <div className="h-[100dvh] bg-main-bg dark:bg-dark-bg font-sans flex flex-col overflow-hidden text-text-primary dark:text-white transition-colors duration-300">
            <Header 
                onGoHome={props.onGoHome} onThemeToggle={props.onThemeToggle} theme={props.theme} 
                onSignOut={props.onSignOut} onOpenGallery={props.onOpenGallery} onUpgrade={props.onUpgrade} 
                onOpenProfile={props.onOpenProfile} userStatus={props.userStatus} user={props.session?.user || null}
                onToggleNav={props.onToggleNav}
            />

            <div className="flex flex-1 overflow-hidden">
                {/* LEFT SIDEBAR */}
                <aside className="w-[70px] md:w-64 bg-surface dark:bg-[#191919] border-r border-border-color dark:border-[#302839] flex flex-col z-10 flex-shrink-0 transition-colors duration-300">
                    <div className="p-2 md:p-4 flex flex-col gap-2">
                        <div className="flex items-center gap-1 mb-6 px-2">
                            <button onClick={props.onGoHome} className="text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white flex items-center gap-2 transition-colors flex-1" title="Trang chủ">
                                <span className="material-symbols-outlined notranslate">arrow_back</span>
                                <span className="font-semibold text-sm hidden md:block">Trang chủ</span>
                            </button>
                        </div>
                        <div className="space-y-1">
                            {sidebarItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleSidebarClick(item)}
                                    className={`w-full flex items-center gap-3 px-2 md:px-4 py-3 rounded-xl transition-all duration-200 group relative ${activeItem === item.id ? 'bg-[#7f13ec] text-white shadow-lg shadow-purple-900/20' : 'text-text-secondary dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2A2A2A] hover:text-text-primary dark:hover:text-white'}`}
                                >
                                    <span className={`material-symbols-outlined notranslate ${activeItem === item.id ? 'text-white' : 'text-gray-500 group-hover:text-[#7f13ec]'}`}>{item.icon}</span>
                                    <span className="text-sm font-medium hidden md:block">{item.label}</span>
                                    {item.isMaintenance && (
                                        <span className="absolute top-2 right-2 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" title="Bảo trì"></span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* MAIN CONTENT */}
                <main className="flex-1 bg-main-bg dark:bg-[#121212] overflow-y-auto p-4 md:p-6 relative scrollbar-hide transition-colors duration-300">
                    <div className="max-w-[1920px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
                        
                        {/* LEFT: INPUT AREA (35%) */}
                        <div className="lg:col-span-4 flex flex-col gap-6 h-[calc(100vh-140px)]">
                            {renderContentInput()}
                        </div>

                        {/* RIGHT: TIMELINE & CLIPS (65%) */}
                        <div className="lg:col-span-8 flex flex-col gap-6 h-full">
                            
                            {activeItem === 'arch-film' ? (
                                // --- ARCH FILM MODE: BATCH TIMELINE ---
                                <>
                                    {/* PANEL 4: GENERATED CLIPS / CONTEXT ITEMS - Always Visible */}
                                    <div className="flex flex-col bg-surface dark:bg-[#191919] rounded-2xl border border-border-color dark:border-[#302839] shadow-xl overflow-hidden relative group h-[550px] min-h-[400px]">
                                        <div className="p-4 border-b border-border-color dark:border-[#302839] flex items-center justify-between bg-surface dark:bg-[#191919] z-10 flex-shrink-0 transition-colors duration-300">
                                            <span className="text-xs font-bold text-text-secondary dark:text-gray-500 uppercase tracking-widest bg-gray-100 dark:bg-black/50 px-2 py-1 rounded backdrop-blur-sm">Danh sách Clips & Context</span>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-[#121212] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {creationItems.map((item, idx) => (
                                                    <div key={item.id} className="bg-white dark:bg-[#1E1E1E] border border-border-color dark:border-[#302839] rounded-xl overflow-hidden shadow-lg flex flex-col h-full relative group">
                                                        {/* DELETE BUTTON FOR CONTEXT ITEM */}
                                                        <button 
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                e.preventDefault();
                                                                handleDeleteItem(item.id); 
                                                            }}
                                                            className="absolute top-2 right-2 z-[100] p-2 bg-red-600/80 hover:bg-red-700 text-white rounded-full transition-all hover:scale-110 shadow-lg cursor-pointer flex items-center justify-center w-8 h-8"
                                                            title="Xóa mục này"
                                                            type="button"
                                                        >
                                                            <span className="material-symbols-outlined text-sm font-bold notranslate">close</span>
                                                        </button>

                                                        {item.videoUrl ? (
                                                            // DISPLAY VIDEO + OPTIONS
                                                            <div className="flex flex-col h-full">
                                                                <div className={`bg-black relative group ${videoState.aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'}`}>
                                                                    <video 
                                                                        src={item.videoUrl} 
                                                                        className={`w-full h-full ${videoState.aspectRatio === 'default' ? 'object-contain' : 'object-cover'}`} 
                                                                        controls 
                                                                        playsInline
                                                                        muted
                                                                    />
                                                                    {item.isGeneratingVideo && (
                                                                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
                                                                            <Spinner />
                                                                            <span className="text-xs text-gray-300 mt-2 animate-pulse">Đang tạo lại...</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="p-3 bg-white dark:bg-[#191919] flex-1 flex flex-col gap-2">
                                                                    {/* Prompt Input for editing before regenerate */}
                                                                    <textarea 
                                                                        value={item.prompt}
                                                                        onChange={(e) => setVideoState(prev => ({ ...prev, contextItems: prev.contextItems.map(x => x.id === item.id ? { ...x, prompt: e.target.value } : x) }))}
                                                                        className="w-full bg-gray-50 dark:bg-[#121212] border border-border-color dark:border-[#302839] rounded-lg p-2 text-xs text-text-primary dark:text-gray-300 focus:border-[#7f13ec] focus:outline-none resize-none h-16 mb-2"
                                                                        placeholder="Prompt..."
                                                                        disabled={item.isGeneratingVideo}
                                                                    />
                                                                    <div className="grid grid-cols-2 gap-2 mt-auto">
                                                                        <button 
                                                                            onClick={() => handleAddToTimeline(item.id)} 
                                                                            disabled={item.isInTimeline}
                                                                            className="flex items-center justify-center gap-1 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-white text-white rounded-lg text-xs font-bold transition-all"
                                                                        >
                                                                            <span className="material-symbols-outlined text-sm notranslate">add_to_queue</span>
                                                                            <span>{item.isInTimeline ? 'Đã thêm' : 'Thêm Timeline'}</span>
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => handleExtendClip(item)} 
                                                                            className="flex items-center justify-center gap-1 py-2 bg-gray-100 dark:bg-[#2A2A2A] hover:bg-gray-200 dark:hover:bg-[#353535] text-text-primary dark:text-white rounded-lg text-xs font-bold transition-all border border-border-color dark:border-[#302839]"
                                                                        >
                                                                            <span className="material-symbols-outlined text-sm notranslate">playlist_add</span>
                                                                            <span>Nối tiếp</span>
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => handleGenerateClip(item)} 
                                                                            disabled={item.isGeneratingVideo}
                                                                            className="flex items-center justify-center gap-1 py-2 bg-gray-100 dark:bg-[#2A2A2A] hover:bg-gray-200 dark:hover:bg-[#353535] text-text-primary dark:text-white rounded-lg text-xs font-bold transition-all border border-border-color dark:border-[#302839]"
                                                                        >
                                                                            <span className="material-symbols-outlined text-sm notranslate">refresh</span>
                                                                            <span>Tạo lại (5)</span>
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => handleDownloadSingle(item.videoUrl!, idx)}
                                                                            className="flex items-center justify-center gap-1 py-2 bg-gray-100 dark:bg-[#2A2A2A] hover:bg-gray-200 dark:hover:bg-[#353535] text-text-primary dark:text-white rounded-lg text-xs font-bold transition-all border border-border-color dark:border-[#302839]"
                                                                        >
                                                                            <span className="material-symbols-outlined text-sm notranslate">download</span>
                                                                            <span>Tải về</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            // DISPLAY IMAGE + GENERATE FORM
                                                            <>
                                                                <div className={`bg-black relative group ${videoState.aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'}`}>
                                                                    <img src={item.file.objectURL} alt="Source" className={`w-full h-full ${videoState.aspectRatio === 'default' ? 'object-contain' : 'object-cover'} opacity-80`} />
                                                                    
                                                                    {item.useCharacter && (
                                                                        <div className="absolute top-2 right-2 bg-[#7f13ec] text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg z-10 flex items-center gap-1">
                                                                            <span className="material-symbols-outlined text-xs notranslate">person</span>
                                                                            + Nhân vật
                                                                        </div>
                                                                    )}

                                                                    {item.isGeneratingVideo && (
                                                                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
                                                                            <Spinner />
                                                                            <span className="text-xs text-gray-300 mt-2 animate-pulse">Đang tạo clip...</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="p-3 flex flex-col gap-2 flex-grow bg-white dark:bg-[#1E1E1E]">
                                                                    <textarea 
                                                                        value={item.prompt}
                                                                        onChange={(e) => setVideoState(prev => ({ ...prev, contextItems: prev.contextItems.map(x => x.id === item.id ? { ...x, prompt: e.target.value } : x) }))}
                                                                        className="w-full bg-gray-50 dark:bg-[#121212] border border-border-color dark:border-[#302839] rounded-lg p-3 text-sm text-text-primary dark:text-gray-200 focus:border-[#7f13ec] focus:outline-none resize-none h-20 mb-3"
                                                                        placeholder="Prompt..."
                                                                        disabled={item.isGeneratingVideo}
                                                                    />
                                                                    <div className="mt-auto">
                                                                        {/* Credit Info Bar */}
                                                                        {!item.isGeneratingVideo && (
                                                                            <div className="flex items-center justify-between mb-2 px-1">
                                                                                <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary dark:text-gray-400 bg-gray-100 dark:bg-black/20 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700">
                                                                                    <span className="material-symbols-outlined text-yellow-500 text-sm notranslate">monetization_on</span>
                                                                                    <span className="text-text-primary dark:text-white font-bold">Chi phí: 5 credits</span>
                                                                                </div>
                                                                                <div className={`text-[10px] font-bold ${
                                                                                    (props.userStatus?.credits || 0) < 5 
                                                                                    ? 'text-red-500' 
                                                                                    : 'text-green-600 dark:text-green-400'
                                                                                }`}>
                                                                                    {(props.userStatus?.credits || 0) < 5 
                                                                                        ? 'Không đủ' 
                                                                                        : `Khả dụng: ${props.userStatus?.credits || 0}`
                                                                                    }
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        <button
                                                                            onClick={() => handleGenerateClip(item)}
                                                                            disabled={item.isGeneratingVideo || (props.userStatus?.credits || 0) < 5}
                                                                            className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 ${
                                                                                item.isGeneratingVideo 
                                                                                    ? 'bg-gray-100 dark:bg-[#2A2A2A] text-gray-400'
                                                                                    : (props.userStatus?.credits || 0) < 5
                                                                                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                                                                        : 'bg-[#7f13ec] hover:bg-[#690fca] text-white hover:shadow-purple-500/20'
                                                                            }`}
                                                                        >
                                                                            {item.isGeneratingVideo ? <Spinner /> : <span className="material-symbols-outlined text-sm notranslate">movie_creation</span>}
                                                                            <span>{item.isGeneratingVideo ? 'Đang tạo...' : 'Tạo Video Clip'}</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                                {creationItems.length === 0 && (
                                                    <div className="col-span-full h-full flex flex-col items-center justify-center opacity-30 text-center p-8">
                                                        <span className="material-symbols-outlined text-6xl mb-2 text-text-secondary dark:text-gray-500 notranslate">video_library</span>
                                                        <p className="text-sm text-text-secondary dark:text-gray-400">Thêm ảnh bối cảnh ở cột bên trái để bắt đầu tạo clip.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* PANEL 5: TIMELINE & PREVIEW */}
                                    <div className="bg-surface dark:bg-[#191919] rounded-2xl border border-border-color dark:border-[#302839] p-0 shadow-lg flex flex-col flex-shrink-0 min-h-[600px] overflow-hidden">
                                        <div className="px-4 py-3 border-b border-border-color dark:border-[#302839] flex items-center justify-between bg-surface dark:bg-[#1E1E1E]">
                                            <h3 className="text-text-primary dark:text-white font-bold text-base flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[#7f13ec] notranslate">view_timeline</span>
                                                Timeline & Kết quả
                                            </h3>
                                            <div className="flex gap-2 items-center">
                                                {/* ... (Existing toolbar) ... */}
                                                <input type="file" ref={videoInputRef} className="hidden" accept="video/mp4,video/quicktime" onChange={(e) => handleVideoUpload(e)} />
                                                <button onClick={() => videoInputRef.current?.click()} className="flex items-center gap-1 bg-gray-200 dark:bg-[#2A2A2A] hover:bg-gray-300 dark:hover:bg-[#353535] text-text-primary dark:text-gray-300 text-xs px-3 py-1.5 rounded-lg border border-border-color dark:border-[#302839] transition-colors"><span className="material-symbols-outlined text-sm notranslate">upload</span> <span>Nhập</span></button>
                                                <button onClick={() => handleDownloadAll()} className="flex items-center gap-1 bg-gray-200 dark:bg-[#2A2A2A] hover:bg-gray-300 dark:hover:bg-[#353535] text-text-primary dark:text-gray-300 text-xs px-3 py-1.5 rounded-lg border border-border-color dark:border-[#302839] transition-colors"><span className="material-symbols-outlined text-sm notranslate">download_for_offline</span> <span>Tải tất cả</span></button>
                                                
                                                <div className="w-[1px] h-6 bg-gray-300 dark:bg-[#302839] mx-1"></div>
                                                
                                                {/* Audio Controls */}
                                                <button onClick={() => setIsVideoMuted(!isVideoMuted)} className={`p-1.5 rounded-lg border border-border-color dark:border-[#302839] transition-colors ${isVideoMuted ? 'bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400' : 'bg-gray-200 dark:bg-[#2A2A2A] text-text-secondary dark:text-gray-300'}`} title={isVideoMuted ? "Bật âm thanh video" : "Tắt âm thanh video"}>
                                                    <span className="material-symbols-outlined text-sm notranslate">{isVideoMuted ? 'videocam_off' : 'videocam'}</span>
                                                </button>
                                                <button onClick={() => setIsMusicMuted(!isMusicMuted)} className={`p-1.5 rounded-lg border border-border-color dark:border-[#302839] transition-colors ${isMusicMuted ? 'bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400' : 'bg-gray-200 dark:bg-[#2A2A2A] text-text-secondary dark:text-gray-300'}`} title={isMusicMuted ? "Bật nhạc nền" : "Tắt nhạc nền"}>
                                                    <span className="material-symbols-outlined text-sm notranslate">{isMusicMuted ? 'music_off' : 'music_note'}</span>
                                                </button>

                                                <button onClick={() => setIsPlayingAll(!isPlayingAll)} className={`flex items-center gap-1 text-white text-xs px-3 py-1.5 rounded-lg border border-border-color dark:border-[#302839] transition-colors ml-2 ${isPlayingAll ? 'bg-green-600' : 'bg-gray-400 dark:bg-[#2A2A2A] text-white dark:text-gray-300'}`}><span className="material-symbols-outlined text-sm notranslate">{isPlayingAll ? 'stop' : 'play_arrow'}</span> <span>{isPlayingAll ? 'Dừng' : 'Phát tất cả'}</span></button>
                                                <button onClick={handleMergeAndExport} disabled={isExporting} className="flex items-center gap-1 bg-[#7f13ec] hover:bg-[#690fca] text-white text-xs px-3 py-1.5 rounded-lg transition-colors ml-2 shadow-lg disabled:opacity-50"><span>{isExporting ? `Đang xuất ${Math.round(exportProgress)}%` : 'Ghép & Xuất Video'}</span></button>
                                            </div>
                                        </div>

                                        {/* PREVIEW */}
                                        <div className="flex-1 bg-gray-50 dark:bg-[#121212] relative flex flex-col items-center justify-center border-b border-border-color dark:border-[#302839] min-h-[400px]">
                                            {/* ... (Existing preview code) ... */}
                                            <div className="relative w-full h-full flex items-center justify-center bg-black">
                                                {activeMainVideoUrl ? (
                                                    <video 
                                                        ref={mainVideoRef}
                                                        src={activeMainVideoUrl} 
                                                        className="w-full h-full object-contain shadow-2xl max-h-[400px]"
                                                        onEnded={handleVideoEnded}
                                                        onTimeUpdate={handleTimeUpdate}
                                                        controls
                                                        playsInline
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center opacity-30">
                                                        <span className="material-symbols-outlined text-5xl mb-2 text-white notranslate">movie</span>
                                                        <span className="text-gray-300 text-xs">Chưa có video nào.</span>
                                                    </div>
                                                )}
                                                {audioUrl && <audio ref={audioRef} src={audioUrl} className="hidden" />}
                                            </div>
                                            <div className="w-full bg-white dark:bg-[#1A1A1A] p-3 flex items-center gap-4 border-t border-border-color dark:border-[#302839]">
                                                <button onClick={togglePlayPause} className="text-text-primary dark:text-white hover:text-[#7f13ec]"><span className="material-symbols-outlined notranslate">{isPlaying ? 'pause' : 'play_arrow'}</span></button>
                                                <input type="range" min="0" max="100" value={progress} onChange={handleSeek} className="w-full h-1.5 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-[#7f13ec]" />
                                            </div>
                                        </div>

                                        {/* TIMELINE TRACKS */}
                                        <div className="h-[140px] bg-gray-100 dark:bg-[#161616] flex flex-col relative overflow-hidden transition-colors duration-300">
                                            {/* ... (Existing timeline tracks) ... */}
                                            <div className="flex-1 relative overflow-x-auto overflow-y-hidden p-2 flex flex-col gap-2 scrollbar-thin" ref={timelineContainerRef} onClick={handleTimelineClick}>
                                                <div className="absolute top-0 bottom-0 w-0.5 bg-red-600 z-50 pointer-events-none transition-all duration-100" style={{ left: `${progress}%` }}></div>
                                                
                                                {/* Video Track */}
                                                <div className="flex items-center gap-1 min-w-max h-16 bg-white dark:bg-[#1A1A1A] rounded-lg px-2 border border-border-color dark:border-[#302839]/50 transition-colors duration-300">
                                                    <div className="w-8 flex justify-center"><span className="material-symbols-outlined text-gray-400 dark:text-gray-500 text-xs notranslate">videocam</span></div>
                                                    {timelineItems.length > 0 ? timelineItems.map((item, index) => (
                                                        <div 
                                                            key={item.id}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, index)}
                                                            onDragOver={(e) => handleDragOver(e, index)}
                                                            onDrop={(e) => handleDrop(e, index)}
                                                            onClick={(e) => { e.stopPropagation(); setVideoState(prev => ({ ...prev, generatedVideoUrl: item.videoUrl || null })); setCurrentPlayingIndex(index); setIsPlayingAll(false); }}
                                                            style={{ width: `${100 / timelineItems.length}%` }}
                                                            className={`relative h-14 bg-black rounded cursor-grab active:cursor-grabbing overflow-hidden border-2 transition-all group flex-shrink-0 ${currentPlayingIndex === index && isPlayingAll ? 'border-green-500' : 'border-gray-300 dark:border-[#302839] hover:border-gray-500'}`}
                                                        >
                                                            <div className="absolute top-1 left-1 z-10 bg-black/60 px-1.5 py-0.5 rounded text-[8px] text-white">Cảnh {index + 1}</div>
                                                            <video 
                                                                src={item.videoUrl} 
                                                                className={`w-full h-full ${videoState.aspectRatio === 'default' ? 'object-contain' : 'object-cover'} pointer-events-none`} 
                                                                playsInline
                                                                muted
                                                            />
                                                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-black/40 rounded p-0.5">
                                                                <button onClick={(e) => {e.stopPropagation(); handleDownloadSingle(item.videoUrl!, index)}} className="p-1 bg-black/50 text-white rounded hover:bg-black" title="Tải xuống"><span className="material-symbols-outlined text-[10px] notranslate">download</span></button>
                                                                <button onClick={(e) => {e.stopPropagation(); handleExtendClip(item)}} className="p-1 bg-black/50 text-white rounded hover:bg-black" title="Mở rộng"><span className="material-symbols-outlined text-[10px] notranslate">playlist_add</span></button>
                                                                {/* REMOVE FROM TIMELINE BUTTON */}
                                                                <button onClick={(e) => {e.stopPropagation(); handleRemoveFromTimeline(item.id)}} className="p-1 bg-black/50 text-white rounded hover:bg-red-600" title="Xóa khỏi Timeline"><span className="material-symbols-outlined text-[10px] notranslate">close</span></button>
                                                            </div>
                                                        </div>
                                                    )) : <div className="w-full text-text-secondary dark:text-gray-600 text-xs italic pl-2">Các clip đã thêm vào timeline sẽ xuất hiện ở đây...</div>}
                                                </div>

                                                {/* Audio Track */}
                                                <div className="flex items-center gap-1 min-w-max h-10 bg-white dark:bg-[#1A1A1A] rounded-lg px-2 border border-border-color dark:border-[#302839]/50 transition-colors duration-300">
                                                    <div className="w-8 flex justify-center"><span className="material-symbols-outlined text-gray-400 dark:text-gray-500 text-xs notranslate">music_note</span></div>
                                                    <div className="flex-1 relative h-full flex items-center">
                                                        {audioFile ? (
                                                            <div className="flex-1 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700/50 rounded flex items-center px-2 text-[10px] text-green-600 dark:text-green-400 truncate cursor-pointer" onClick={() => setAudioFile(null)}>
                                                                {audioFile.name} (Click to remove)
                                                            </div>
                                                        ) : (
                                                            <div className="flex-1 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded flex items-center justify-center hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors relative cursor-pointer">
                                                                <span className="text-[10px] text-text-secondary dark:text-gray-500">Kéo thả nhạc (.mp3)</span>
                                                                <input type="file" accept=".mp3,audio/mpeg" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {if(e.target.files?.[0]) { setAudioFile(e.target.files[0]); setAudioUrl(URL.createObjectURL(e.target.files[0])); }}} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                // --- SINGLE MODE: SIMPLE RESULT VIEW OR MAINTENANCE ---
                                <div className="bg-surface dark:bg-[#191919] rounded-2xl border border-border-color dark:border-[#302839] p-6 shadow-lg h-full flex flex-col transition-colors duration-300">
                                    {(['text-to-video', 'transition', 'extend-video'].includes(activeItem)) ? (
                                        <div className="flex-1 flex items-center justify-center">
                                            <div className="text-center text-text-secondary dark:text-gray-500">
                                                <span className="material-symbols-outlined text-6xl mb-4 text-yellow-500/20 notranslate">engineering</span>
                                                <p>Tính năng đang được nâng cấp.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <h3 className="text-text-primary dark:text-white font-bold text-lg mb-4 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[#7f13ec] notranslate">movie</span>
                                                Kết quả
                                            </h3>

                                            <div className="flex-1 bg-black rounded-xl border border-border-color dark:border-[#302839] relative flex items-center justify-center overflow-hidden min-h-[400px]">
                                                {isSingleGenerating ? (
                                                    <div className="flex flex-col items-center justify-center text-gray-400 gap-3">
                                                        <Spinner />
                                                        <span className="animate-pulse text-sm">{videoState.loadingMessage || 'Đang khởi tạo video...'}</span>
                                                    </div>
                                                ) : videoState.generatedVideoUrl ? (
                                                    <video 
                                                        src={videoState.generatedVideoUrl} 
                                                        controls 
                                                        autoPlay 
                                                        loop 
                                                        className="w-full h-full object-contain"
                                                        playsInline
                                                        muted
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center opacity-30">
                                                        <span className="material-symbols-outlined text-6xl mb-2 text-white notranslate">video_file</span>
                                                        <p className="text-gray-300 text-sm">Kết quả sẽ hiển thị ở đây</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* GENERATE & DOWNLOAD BUTTONS (Matching Template) */}
                                            <div className="mt-6 flex flex-col sm:flex-row gap-4">
                                                <button 
                                                    onClick={handleSingleGeneration}
                                                    disabled={isSingleGenerating}
                                                    className="flex-1 py-3 px-6 rounded-xl font-bold transition-all border border-border-color dark:border-[#302839] text-text-secondary dark:text-gray-300 hover:text-text-primary dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2A2A2A] hover:border-gray-400 dark:hover:border-gray-500 flex items-center justify-center gap-2 disabled:opacity-50"
                                                >
                                                    <span className="material-symbols-outlined notranslate">refresh</span>
                                                    <span>Tạo lại</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleSimpleDownload()}
                                                    disabled={!videoState.generatedVideoUrl || isSingleGenerating}
                                                    className="flex-[2] py-3 px-6 bg-gradient-to-r from-[#7f13ec] to-[#9d4edd] hover:from-[#690fca] hover:to-[#8a3dcf] text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <span className="material-symbols-outlined notranslate">download</span>
                                                    <span>Tải xuống</span>
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </main>
            </div>
            
            {/* DELETE MODAL */}
            <ConfirmationModal 
                isOpen={deleteModalState.isOpen}
                onClose={() => setDeleteModalState({ isOpen: false, itemId: null })}
                onConfirm={executeDelete}
                title="Xác nhận xóa"
                message="Bạn có chắc chắn muốn xóa clip này khỏi danh sách không? Hành động này không thể hoàn tác."
            />

            {videoState.error && <div className="fixed bottom-4 right-4 bg-red-900/90 border border-red-500/50 text-red-200 p-4 rounded-xl backdrop-blur-md text-sm z-50 shadow-xl max-w-sm animate-bounce font-medium">{videoState.error} <button onClick={() => setVideoState(p => ({...p, error: null}))} className="ml-2 underline text-white/80 hover:text-white">Đóng</button></div>}
        </div>
    );
};

export default VideoPage;
