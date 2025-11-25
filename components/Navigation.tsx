
import React, { useState, useEffect } from 'react';
import { Tool } from '../types';

// Icons mimicking Heroicons style (kept mostly same, slightly cleaned up usage)
const FloorPlanIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M9 7v12" /></svg>
);
const RenovationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 4.5l-3-3m0 0l-3 3m3-3v9" /></svg>
);
const LightBulbIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
);
const MagicWandIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /><path strokeLinecap="round" strokeLinejoin="round" d="M18 10l2-2M13 5l2-2M8 15l-2 2" /></svg>
);
const PhotoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
);
const InteriorIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h8a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.881 4.043C9.227 3.387 10.76 3 12.368 3c1.608 0 3.14.387 4.486 1.043m-8.972 1.043C5.69 6.208 4.862 7.55 4.438 9h15.124c-.424-1.45-1.252-2.792-2.586-3.914m-10.082 3.914H18.23" /></svg>
);
const UrbanPlanningIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4h7v7H4V4zM13 4h7v12h-7V4zM4 13h7v7H4v-7z" /></svg>
);
const LandscapeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25m0 0a4.5 4.5 0 00-4.5 4.5h9a4.5 4.5 0 00-4.5-4.5zm0-8.25a4.5 4.5 0 014.5 4.5h-9a4.5 4.5 0 014.5-4.5zM12 3v.75m0-3.75a4.5 4.5 0 00-4.5 4.5h9a4.5 4.5 0 00-4.5-4.5z" /></svg>
);
const ViewGridIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
);
const FilmIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
);
const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
);
const ColorSwatchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12.5a2 2 0 002-2v-6.5a2 2 0 00-2-2H7" /></svg>
);
const UpscaleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
);
const MoodboardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM13 5a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1h-6a1 1 0 01-1-1V5zM13 15a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2a1 1 0 01-1-1v-4z" /></svg>
);
const HistoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const PlusCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const CubeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
);
const VirtualTourIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 0 0-9 9h18a9 9 0 0 0-9-9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0z" /></svg>
);
const RulerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
);
const FengShuiIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m14.657-6.657l-1.414 1.414M6.757 17.243l-1.414 1.414m12.728 0l-1.414-1.414M6.757 6.757l-1.414-1.414" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 15l-3-6 3 6 3-6-3 6z" /></svg>
);
const PencilAltIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
);

interface NavigationProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const mainNavItems = [
    { tool: Tool.ArchitecturalRendering, label: 'Render Kiến trúc', icon: <PhotoIcon /> },
    { tool: Tool.InteriorRendering, label: 'Render Nội thất', icon: <InteriorIcon /> },
    { tool: Tool.Renovation, label: 'Cải Tạo AI', icon: <RenovationIcon /> },
    { tool: Tool.ViewSync, label: 'Đồng Bộ View', icon: <ViewGridIcon /> },
    { tool: Tool.ImageEditing, label: 'Chỉnh Sửa Ảnh AI', icon: <SparklesIcon /> },
];

const utilityToolsGroup = {
    label: 'Tính năng mở rộng',
    icon: <PlusCircleIcon />,
    tools: [
        { tool: Tool.FloorPlan, label: 'Render Mặt Bằng', icon: <FloorPlanIcon /> },
        { tool: Tool.UrbanPlanning, label: 'Render Quy hoạch', icon: <UrbanPlanningIcon /> },
        { tool: Tool.LandscapeRendering, label: 'Render Sân vườn', icon: <LandscapeIcon /> },
        { tool: Tool.PromptSuggester, label: 'Gợi ý prompt', icon: <LightBulbIcon /> },
        { tool: Tool.PromptEnhancer, label: 'AI Viết Prompt', icon: <MagicWandIcon /> },
        { tool: Tool.VirtualTour, label: 'Tham Quan Ảo', icon: <VirtualTourIcon /> },
        { tool: Tool.Moodboard, label: 'Tạo Moodboard', icon: <MoodboardIcon /> },
        { tool: Tool.Upscale, label: 'Upscale AI', icon: <UpscaleIcon /> },
        { tool: Tool.VideoGeneration, label: 'Tạo Video AI', icon: <FilmIcon /> },
        { tool: Tool.MaterialSwap, label: 'Thay Vật Liệu', icon: <ColorSwatchIcon /> },
        { tool: Tool.Staging, label: 'AI Staging', icon: <CubeIcon /> },
        { tool: Tool.SketchConverter, label: 'Ảnh thành Sketch', icon: <PencilAltIcon /> },
        { tool: Tool.AITechnicalDrawings, label: 'Bản vẽ kỹ thuật', icon: <RulerIcon /> },
        { tool: Tool.FengShui, label: 'Phong thủy', icon: <FengShuiIcon /> },
    ]
};

const historyItem = { tool: Tool.History, label: 'Lịch sử', icon: <HistoryIcon /> };

const Navigation: React.FC<NavigationProps> = ({ activeTool, setActiveTool, isMobileOpen = false, onCloseMobile }) => {
    const isGroupActive = utilityToolsGroup.tools.some(item => item.tool === activeTool);
    const [isGroupOpen, setIsGroupOpen] = useState(isGroupActive);

    useEffect(() => {
        if (isGroupActive) {
            setIsGroupOpen(true);
        }
    }, [isGroupActive]);

    const renderItem = (item: { tool: Tool; label: string; icon: React.ReactElement; }) => (
        <button
            key={item.tool}
            onClick={() => setActiveTool(item.tool)}
            className={`group flex items-center w-full gap-3 px-4 py-3 rounded-full lg:rounded-lg text-left transition-all duration-200 text-sm font-medium mb-1 ${
              activeTool === item.tool
                ? 'bg-[#7f13ec] text-white shadow-lg shadow-[#7f13ec]/25'
                : 'text-text-secondary dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#302839] hover:text-text-primary dark:hover:text-white'
            }`}
          >
            <span className={`${activeTool === item.tool ? 'text-white' : 'text-gray-400 group-hover:text-[#7f13ec]'} transition-colors`}>
                {item.icon}
            </span>
            <span className="truncate">{item.label}</span>
          </button>
    );

  return (
    <>
      {/* Backdrop for Mobile */}
      {isMobileOpen && (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden transition-opacity"
            onClick={onCloseMobile}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[80%] max-w-[300px] bg-surface dark:bg-[#121212] border-r border-border-color dark:border-[#302839] shadow-2xl
        transform transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:w-64 md:bg-surface/80 dark:md:bg-[#121212]/80 md:shadow-none md:border md:rounded-2xl md:m-6 md:h-[calc(100dvh-96px)]
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-4 overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center md:hidden mb-6 px-2 pt-2">
                <h2 className="text-xl font-bold text-text-primary dark:text-white">Menu</h2>
                <button 
                    onClick={onCloseMobile} 
                    className="p-2 rounded-lg bg-gray-100 dark:bg-[#302839] text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <h2 className="text-xs font-bold text-text-secondary dark:text-gray-500 uppercase tracking-wider px-4 pb-3 hidden md:block">Công cụ chính</h2>
            
            <nav className="flex-1 space-y-1">
                {mainNavItems.map(item => renderItem(item))}

                <div className="w-full md:h-4"></div>

                <div className="w-full">
                    <button
                        onClick={() => setIsGroupOpen(!isGroupOpen)}
                        className={`flex items-center justify-between w-full gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 text-sm font-medium mb-1 ${
                        isGroupActive
                            ? 'bg-gray-100 dark:bg-[#191919] text-text-primary dark:text-white'
                            : 'text-text-secondary dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#302839] hover:text-text-primary dark:hover:text-white'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-gray-400 group-hover:text-[#7f13ec]">
                                {utilityToolsGroup.icon}
                            </span>
                            <span className="truncate">{utilityToolsGroup.label}</span>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-200 ${isGroupOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isGroupOpen ? 'max-h-[1000px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                        <div className="pl-2 space-y-1">
                            {utilityToolsGroup.tools.map(item => renderItem(item))}
                        </div>
                    </div>
                </div>
            </nav>
            
            <div className="w-full mt-auto pt-4 border-t border-border-color dark:border-[#302839]">
                {renderItem(historyItem)}
            </div>
        </div>
      </aside>
    </>
  );
};

export default Navigation;
