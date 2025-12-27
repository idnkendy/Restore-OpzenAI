
import React from 'react';
import { Tool } from '../types';

// --- MAIN ICONS ---
const FloorPlanIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
);
const RenovationIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
);
const PhotoIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
);
const InteriorIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
);
const ViewGridIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
);
const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
);

// --- UTILITY / EXTENDED FEATURE ICONS ---

// Render Quy Hoạch (Map/Plan)
const UrbanIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
);

// Render Sân Vườn (Tree/Nature)
const LandscapeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
);

// Gợi ý Prompt (Magic/Sparkle Idea)
const MagicTextIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
);

// Sửa bằng Ghi chú (Chat/Annotation)
const AnnotationIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
);

// Tạo Layout (Dashboard/Grid)
const LayoutBoardIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
);

// Tạo Bản vẽ (Blueprint/Document)
const BlueprintIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
);

// Tạo Diagram (Nodes/Structure/Network)
const StructureIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
);

// Poster BDS (Megaphone/Ad)
const MarketingIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
);

// Moodboard (Swatch)
const MoodboardIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12.5a2 2 0 002-2v-6.5a2 2 0 00-2-2H7" /></svg>
);

// Upscale (Arrow Up)
const UpscaleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" /></svg>
);

// Video (Film)
const FilmIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
);

// Material Swap (Layers)
const MaterialIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
);

// Staging (Cube)
const CubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
);

// Sketch (Pencil)
const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
);

// Feng Shui (Compass)
const FengShuiIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.12 12.88l-6-2.5 2.5-6 6 2.5-2.5 6z" />
    </svg>
);

const HistoryIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

const PlusCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

const HomeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
);

interface NavigationProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onGoHome?: () => void;
}

export const mainNavItems = [
    { tool: Tool.ArchitecturalRendering, label: 'Render Kiến trúc', icon: <PhotoIcon /> },
    { tool: Tool.InteriorRendering, label: 'Render Nội thất', icon: <InteriorIcon /> },
    { tool: Tool.Renovation, label: 'Cải Tạo AI', icon: <RenovationIcon /> },
    { tool: Tool.ViewSync, label: 'Đồng Bộ View', icon: <ViewGridIcon /> },
    { tool: Tool.ImageEditing, label: 'Chỉnh Sửa Ảnh', icon: <SparklesIcon /> },
];

export const utilityToolsGroup = {
    label: 'Tính năng mở rộng',
    icon: <PlusCircleIcon />,
    tools: [
        { 
            tool: Tool.FloorPlan, 
            label: 'Render Mặt Bằng', 
            icon: <FloorPlanIcon />, 
            desc: 'Chuyển đổi bản vẽ 2D thành phối cảnh 3D ấn tượng',
            gradient: 'from-blue-500/20 to-cyan-500/20 hover:border-blue-500/50',
            image: 'https://mtlomjjlgvsjpudxlspq.supabase.co/storage/v1/object/public/background-imgs/render-mat-bang.png'
        },
        { 
            tool: Tool.PromptSuggester, 
            label: 'Gợi ý Prompt', 
            icon: <MagicTextIcon />, 
            desc: 'AI phân tích ảnh và gợi ý prompt cho Đồng bộ View.',
            gradient: 'from-yellow-500/20 to-orange-500/20 hover:border-yellow-500/50',
            image: 'https://mtlomjjlgvsjpudxlspq.supabase.co/storage/v1/object/public/background-imgs/prompt-recommend.png'
        },
        { 
            tool: Tool.EditByNote, 
            label: 'Sửa Bằng Ghi Chú', 
            icon: <AnnotationIcon />, 
            desc: 'Chỉnh sửa ảnh trực tiếp bằng các câu lệnh ngôn ngữ tự nhiên.',
            gradient: 'from-purple-500/20 to-pink-500/20 hover:border-purple-500/50',
            image: 'https://mtlomjjlgvsjpudxlspq.supabase.co/storage/v1/object/public/background-imgs/edit-by-note.png'
        },
        { 
            tool: Tool.LayoutGenerator, 
            label: 'Tạo Layout', 
            icon: <LayoutBoardIcon />, 
            desc: 'Tạo bố cục kiến trúc từ ý tưởng.',
            gradient: 'from-indigo-500/20 to-blue-500/20 hover:border-indigo-500/50',
            image: 'https://mtlomjjlgvsjpudxlspq.supabase.co/storage/v1/object/public/background-imgs/layout.png'
        },
        { 
            tool: Tool.DrawingGenerator, 
            label: 'Tạo Bản vẽ', 
            icon: <BlueprintIcon />, 
            desc: 'Tạo các bản vẽ kỹ thuật chiếu vuông góc.',
            gradient: 'from-cyan-500/20 to-teal-500/20 hover:border-cyan-500/50',
            image: 'https://mtlomjjlgvsjpudxlspq.supabase.co/storage/v1/object/public/background-imgs/tao-ban-ve.png'
        },
        { 
            tool: Tool.DiagramGenerator, 
            label: 'Tạo Diagram', 
            icon: <StructureIcon />, 
            desc: 'Tạo sơ đồ phân tích kiến trúc.',
            gradient: 'from-orange-500/20 to-amber-500/20 hover:border-orange-500/50',
            image: 'https://mtlomjjlgvsjpudxlspq.supabase.co/storage/v1/object/public/background-imgs/diagram.png'
        },
        { 
            tool: Tool.RealEstatePoster, 
            label: 'Poster BDS', 
            icon: <MarketingIcon />, 
            desc: 'Tạo poster quảng cáo bất động sản chuyên nghiệp.',
            gradient: 'from-slate-500/20 to-gray-500/20 hover:border-slate-500/50',
            image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=600&auto=format&fit=crop'
        },
        { 
            tool: Tool.UrbanPlanning, 
            label: 'Render Quy hoạch', 
            icon: <UrbanIcon />, 
            desc: 'Phối cảnh tổng thể cho khu đô thị và dự án lớn',
            gradient: 'from-green-500/20 to-emerald-500/20 hover:border-green-500/50',
            image: 'https://mtlomjjlgvsjpudxlspq.supabase.co/storage/v1/object/public/background-imgs/render-quy-hoach.png'
        },
        { 
            tool: Tool.LandscapeRendering, 
            label: 'Render Sân vườn', 
            icon: <LandscapeIcon />, 
            desc: 'Thiết kế cảnh quan, sân vườn và tiểu cảnh',
            gradient: 'from-lime-500/20 to-green-500/20 hover:border-lime-500/50',
            image: 'https://images.unsplash.com/photo-1558293842-c0fd3db86157?q=80&w=600&auto=format&fit=crop'
        },
        { 
            tool: Tool.Moodboard, 
            label: 'Tạo Moodboard', 
            icon: <MoodboardIcon />, 
            desc: 'Sắp xếp ý tưởng, màu sắc và vật liệu',
            gradient: 'from-pink-500/20 to-rose-500/20 hover:border-pink-500/50',
            image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=600&auto=format&fit=crop'
        },
        { 
            tool: Tool.Upscale, 
            label: 'Upscale AI', 
            icon: <UpscaleIcon />, 
            desc: 'Nâng cao chất lượng và độ phân giải ảnh',
            gradient: 'from-yellow-500/20 to-orange-500/20 hover:border-yellow-500/50',
            image: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?q=80&w=600&auto=format&fit=crop'
        },
        { 
            tool: Tool.VideoGeneration, 
            label: 'Tạo Video AI', 
            icon: <FilmIcon />, 
            desc: 'Biến ảnh tĩnh thành video chuyển động sống động',
            gradient: 'from-red-500/20 to-orange-500/20 hover:border-red-500/50',
            image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=600&auto=format&fit=crop'
        },
        { 
            tool: Tool.MaterialSwap, 
            label: 'Thay Vật Liệu', 
            icon: <MaterialIcon />, 
            desc: 'Thử nghiệm các loại vật liệu khác nhau trên bề mặt',
            gradient: 'from-teal-500/20 to-cyan-500/20 hover:border-teal-500/50',
            image: 'https://images.unsplash.com/photo-1615529182904-14819c35db37?q=80&w=600&auto=format&fit=crop'
        },
        { 
            tool: Tool.Staging, 
            label: 'AI Staging', 
            icon: <CubeIcon />, 
            desc: 'Thêm đồ nội thất vào phòng trống tự động',
            gradient: 'from-violet-500/20 to-fuchsia-500/20 hover:border-violet-500/50',
            image: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?q=80&w=600&auto=format&fit=crop'
        },
        { 
            tool: Tool.SketchConverter, 
            label: 'Ảnh thành Sketch', 
            icon: <PencilIcon />, 
            desc: 'Chuyển ảnh render hoặc chụp thành tranh vẽ tay',
            gradient: 'from-gray-500/20 to-slate-500/20 hover:border-gray-500/50',
            image: 'https://mtlomjjlgvsjpudxlspq.supabase.co/storage/v1/object/public/background-imgs/photo-to-sketch.png'
        },
        { 
            tool: Tool.AITechnicalDrawings, 
            label: 'Bản vẽ kỹ thuật', 
            icon: <BlueprintIcon />, 
            desc: 'Tạo mặt bằng, mặt đứng từ ảnh phối cảnh',
            gradient: 'from-cyan-600/20 to-blue-600/20 hover:border-cyan-600/50',
            image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=600&auto=format&fit=crop'
        },
        { 
            tool: Tool.FengShui, 
            label: 'Phong thủy', 
            icon: <FengShuiIcon />, 
            desc: 'Phân tích phong thủy bát trạch và huyền không',
            gradient: 'from-amber-500/20 to-yellow-500/20 hover:border-amber-500/50',
            image: 'https://mtlomjjlgvsjpudxlspq.supabase.co/storage/v1/object/public/background-imgs/phong-thuy.png'
        },
    ]
};

const historyItem = { tool: Tool.History, label: 'Lịch sử', icon: <HistoryIcon /> };

const Navigation: React.FC<NavigationProps> = ({ activeTool, setActiveTool, isMobileOpen = false, onCloseMobile, onGoHome }) => {
    
    const isExtendedToolActive = utilityToolsGroup.tools.some(item => item.tool === activeTool) || activeTool === Tool.ExtendedFeaturesDashboard;

    // isCompact logic: Force compact mode on 'md' screens (tablet), show text on 'lg' and up
    const renderItem = (item: { tool: Tool; label: string; icon: React.ReactElement<any>; }) => (
        <button
            key={item.tool}
            onClick={() => setActiveTool(item.tool)}
            className={`group relative flex items-center gap-2 px-3 lg:px-4 py-2 rounded-full transition-all duration-300 text-sm font-medium whitespace-nowrap outline-none
              ${activeTool === item.tool
                ? 'text-white bg-gradient-to-r from-[#7f13ec] to-[#9d4edd] shadow-md shadow-purple-500/20 ring-1 ring-white/10' 
                : 'text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-white/5'
              }`}
            title={item.label}
          >
            <span className={`relative z-10 transition-colors duration-300 ${activeTool === item.tool ? 'text-white' : 'group-hover:text-[#7f13ec]'}`}>
                {React.cloneElement(item.icon, { className: "h-5 w-5 md:h-6 md:w-6" })}
            </span>
            {/* Optimized for Tablet: Hidden on md, visible on lg+ */}
            <span className={`relative z-10 hidden lg:inline`}>{item.label}</span>
          </button>
    );

  return (
    <>
      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 md:hidden transition-opacity"
            onClick={onCloseMobile}
        >
             <aside className="absolute inset-y-0 left-0 w-[80%] max-w-[300px] bg-surface dark:bg-[#121212] border-r border-border-color dark:border-[#302839] shadow-2xl p-4 flex flex-col h-full overflow-y-auto">
                <div className="flex justify-between items-center mb-6 px-2">
                    <h2 className="text-xl font-bold text-text-primary dark:text-white">Menu</h2>
                    <button 
                        onClick={onCloseMobile} 
                        className="p-2 rounded-lg bg-gray-100 dark:bg-[#302839] text-text-secondary dark:text-gray-400 hover:text-white"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="space-y-1">
                    {onGoHome && (
                        <button
                            onClick={() => { onGoHome(); onCloseMobile?.(); }}
                            className="group flex items-center w-full gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 text-sm font-medium text-text-secondary dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#302839] hover:text-text-primary dark:hover:text-white"
                        >
                            <span className="text-gray-400 group-hover:text-[#7f13ec]">
                                <HomeIcon />
                            </span>
                            <span className="truncate">Trang chủ</span>
                        </button>
                    )}

                    {mainNavItems.map(item => (
                        <button
                            key={item.tool}
                            onClick={() => setActiveTool(item.tool)}
                            className={`group flex items-center w-full gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 text-sm font-medium ${
                            activeTool === item.tool
                                ? 'bg-gradient-to-r from-[#7f13ec] to-[#9d4edd] text-white shadow-md'
                                : 'text-text-secondary dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#302839] hover:text-text-primary dark:hover:text-white'
                            }`}
                        >
                            <span className={`${activeTool === item.tool ? 'text-white' : 'text-gray-400 group-hover:text-[#7f13ec]'}`}>
                                {item.icon}
                            </span>
                            <span className="truncate">{item.label}</span>
                        </button>
                    ))}
                    
                    <button
                        onClick={() => setActiveTool(Tool.ExtendedFeaturesDashboard)}
                        className={`group flex items-center w-full gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 text-sm font-medium ${
                        isExtendedToolActive
                            ? 'bg-gradient-to-r from-[#7f13ec] to-[#9d4edd] text-white shadow-md'
                            : 'text-text-secondary dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#302839] hover:text-text-primary dark:hover:text-white'
                        }`}
                    >
                        <span className={`${isExtendedToolActive ? 'text-white' : 'text-gray-400 group-hover:text-[#7f13ec]'}`}>
                            {utilityToolsGroup.icon}
                        </span>
                        <span className="truncate">{utilityToolsGroup.label}</span>
                    </button>

                    <div className="pt-4 mt-4 border-t border-border-color dark:border-[#302839]">
                         <button
                            onClick={() => setActiveTool(historyItem.tool)}
                            className={`group flex items-center w-full gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 text-sm font-medium ${
                            activeTool === historyItem.tool
                                ? 'bg-gradient-to-r from-[#7f13ec] to-[#9d4edd] text-white shadow-md'
                                : 'text-text-secondary dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#302839] hover:text-text-primary dark:hover:text-white'
                            }`}
                        >
                            <span className={`${activeTool === historyItem.tool ? 'text-white' : 'text-gray-400 group-hover:text-[#7f13ec]'}`}>
                                {historyItem.icon}
                            </span>
                            <span className="truncate">{historyItem.label}</span>
                        </button>
                    </div>
                </div>
             </aside>
        </div>
      )}

      {/* Desktop Horizontal Toolbar */}
      <nav className="hidden md:flex w-full sticky top-0 z-30 bg-surface/90 dark:bg-[#121212]/90 backdrop-blur-xl border-b border-border-color dark:border-[#302839] shadow-sm justify-center h-[72px]">
        <div className="max-w-[1600px] w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            
            {/* Home Button Left Aligned */}
            {onGoHome && (
                <div className="absolute left-6 flex items-center">
                    <button
                        onClick={onGoHome}
                        className="group relative flex items-center justify-center p-2 rounded-full transition-all duration-300 outline-none text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-white/5"
                        title="Trang chủ"
                    >
                        <HomeIcon className="h-6 w-6" />
                    </button>
                </div>
            )}

            {/* Centered Main Nav Pill */}
            <div className="flex-1 flex justify-center">
                <div className="flex items-center p-1.5 rounded-full bg-gray-50/80 dark:bg-white/5 border border-gray-200 dark:border-white/5 shadow-inner">
                    {mainNavItems.map((item, index) => (
                        <React.Fragment key={item.tool}>
                            {renderItem(item)}
                            <div className="h-4 w-px bg-gray-300 dark:bg-white/10 mx-1"></div>
                        </React.Fragment>
                    ))}
                    
                    {/* Extended Features Button merged here */}
                    <button
                        onClick={() => setActiveTool(Tool.ExtendedFeaturesDashboard)}
                        className={`group relative flex items-center gap-2 px-3 lg:px-4 py-2 rounded-full transition-all duration-300 text-sm font-medium whitespace-nowrap outline-none
                        ${isExtendedToolActive
                            ? 'text-white bg-gradient-to-r from-[#7f13ec] to-[#9d4edd] shadow-md shadow-purple-500/20 ring-1 ring-white/10'
                            : 'text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-white/5'
                        }`}
                        title={utilityToolsGroup.label}
                    >
                        <span className={`relative z-10 transition-colors duration-300 ${isExtendedToolActive ? 'text-white' : 'group-hover:text-[#7f13ec]'}`}>
                            {React.cloneElement(utilityToolsGroup.icon, { className: "h-5 w-5 md:h-6 md:w-6" })}
                        </span>
                        {/* Hidden on md, visible on lg+ */}
                        <span className="relative z-10 hidden lg:inline">{utilityToolsGroup.label}</span>
                    </button>
                </div>
            </div>

            {/* Right Side Tools - History */}
            <div className="absolute right-6 flex items-center">
                <div className="flex items-center p-1.5 rounded-full bg-gray-50/80 dark:bg-white/5 border border-gray-200 dark:border-white/5 shadow-inner">
                    <button
                        onClick={() => setActiveTool(historyItem.tool)}
                        className={`group relative flex items-center gap-2 px-3 lg:px-4 py-2 rounded-full transition-all duration-300 text-sm font-medium whitespace-nowrap outline-none
                        ${activeTool === historyItem.tool
                            ? 'text-white bg-gradient-to-r from-[#7f13ec] to-[#9d4edd] shadow-md shadow-purple-500/20 ring-1 ring-white/10' 
                            : 'text-text-secondary dark:text-gray-400 hover:text-text-primary dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-white/5'
                        }`}
                        title={historyItem.label}
                    >
                        <span className={`relative z-10 transition-colors duration-300 ${activeTool === historyItem.tool ? 'text-white' : 'group-hover:text-[#7f13ec]'}`}>
                            {React.cloneElement(historyItem.icon, { className: "h-5 w-5 md:h-6 md:w-6" })}
                        </span>
                        <span className={`relative z-10 hidden lg:inline`}>{historyItem.label}</span>
                    </button>
                </div>
            </div>
        </div>
      </nav>
    </>
  );
};

export default Navigation;
