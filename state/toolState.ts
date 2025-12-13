
// ... (imports remain same)
import { FileData, AspectRatio, Tool, ImageResolution } from '../types';

// ... (interfaces remain same)

export interface ImageGeneratorState {
    style: string;
    context: string;
    lighting: string;
    weather: string;
    buildingType: string;
    customPrompt: string;
    referenceImages: FileData[]; // Updated to array
    sourceImage: FileData | null;
    isLoading: boolean;
    isUpscaling: boolean;
    error: string | null;
    resultImages: string[];
    upscaledImage: string | null;
    numberOfImages: number;
    aspectRatio: AspectRatio;
    resolution: ImageResolution;
}

export interface InteriorGeneratorState extends Omit<ImageGeneratorState, 'buildingType' | 'context' | 'weather'> {
    roomType: string;
    colorPalette: string;
}

export interface UrbanPlanningState {
    viewType: string;
    density: string;
    lighting: string;
    customPrompt: string;
    referenceImages: FileData[]; // Updated to array
    sourceImage: FileData | null;
    isLoading: boolean;
    isUpscaling: boolean;
    error: string | null;
    resultImages: string[];
    upscaledImage: string | null;
    numberOfImages: number;
    aspectRatio: AspectRatio;
    resolution: ImageResolution;
}

export interface LandscapeRenderingState {
    gardenStyle: string;
    timeOfDay: string;
    features: string;
    customPrompt: string;
    referenceImages: FileData[]; // Updated to array
    sourceImage: FileData | null;
    isLoading: boolean;
    isUpscaling: boolean;
    error: string | null;
    resultImages: string[];
    upscaledImage: string | null;
    numberOfImages: number;
    aspectRatio: AspectRatio;
    resolution: ImageResolution;
}

// Interface cho một item trong danh sách bối cảnh video
export interface VideoContextItem {
    id: string;
    file: FileData; // Used for display and generation (cropped)
    originalFile: FileData; // Used for re-cropping when aspect ratio changes
    prompt: string;
    isGeneratingPrompt: boolean;
    videoUrl?: string;          // URL video kết quả cho clip này
    isGeneratingVideo?: boolean; // Trạng thái đang tạo video cho clip này
    isUploaded?: boolean; // New flag to identify manually uploaded videos
    isInTimeline?: boolean; // Determines if this clip is currently on the editing timeline
}

export interface VideoGeneratorState {
    prompt: string;
    startImage: FileData | null;
    contextItems: VideoContextItem[]; // Danh sách các bối cảnh đã tải lên và phân tích
    selectedContextId: string | null; // ID của bối cảnh đang được chọn để tạo video
    isLoading: boolean;
    loadingMessage: string;
    error: string | null;
    generatedVideoUrl: string | null;
    mode: 'exterior' | 'interior';
    aspectRatio: '16:9' | '9:16' | 'default'; // Updated to include 'default'
}

export interface ImageEditorState {
    prompt: string;
    sourceImage: FileData | null;
    maskImage: FileData | null;
    referenceImages: FileData[];
    isLoading: boolean;
    error: string | null;
    resultImages: string[];
    numberOfImages: number;
    resolution: ImageResolution;
}

export interface ViewSyncState {
    sourceImage: FileData | null;
    directionImage: FileData | null;
    isLoading: boolean;
    error: string | null;
    resultImages: string[];
    numberOfImages: number;
    sceneType: 'exterior' | 'interior';
    aspectRatio: AspectRatio;
    customPrompt: string;
    selectedPerspective: string;
    selectedAtmosphere: string;
    selectedFraming: string;
    selectedInteriorAngle: string;
    resolution: ImageResolution;
}

export interface VirtualTourState {
    sourceImage: FileData | null;
    currentTourImage: FileData | null;
    isLoading: boolean;
    error: string | null;
    tourStepSize: number;
    tourHistory: FileData[];
    resolution: ImageResolution;
}

export interface RenovationState {
    prompt: string;
    sourceImage: FileData | null;
    referenceImages: FileData[];
    maskImage: FileData | null;
    isLoading: boolean;
    error: string | null;
    renovatedImages: string[];
    numberOfImages: number;
    aspectRatio: AspectRatio;
    resolution: ImageResolution;
}

export interface FloorPlanState {
    prompt: string;
    layoutPrompt: string;
    sourceImage: FileData | null;
    referenceImages: FileData[]; // Updated to array
    isLoading: boolean;
    error: string | null;
    resultImages: string[];
    numberOfImages: number;
    renderMode: 'top-down' | 'perspective';
    planType: 'interior' | 'exterior';
    aspectRatio: AspectRatio;
    resolution: ImageResolution;
}

export interface MaterialSwapperState {
    prompt: string;
    sceneImage: FileData | null;
    materialImage: FileData | null;
    isLoading: boolean;
    error: string | null;
    resultImages: string[];
    numberOfImages: number;
    resolution: ImageResolution;
}

export interface UpscaleState {
    sourceImage: FileData | null;
    isLoading: boolean;
    error: string | null;
    upscaledImages: string[];
    numberOfImages: number;
    resolution: ImageResolution;
}

export interface MoodboardGeneratorState {
    prompt: string;
    sourceImage: FileData | null;
    isLoading: boolean;
    error: string | null;
    resultImages: string[];
    numberOfImages: number;
    aspectRatio: AspectRatio;
    mode: 'moodboardToScene' | 'sceneToMoodboard';
    resolution: ImageResolution;
}

export interface StagingState {
    prompt: string;
    sceneImage: FileData | null;
    objectImages: FileData[];
    isLoading: boolean;
    error: string | null;
    resultImages: string[];
    numberOfImages: number;
    resolution: ImageResolution;
}

export interface PromptSuggesterState {
    sourceImage: FileData | null;
    isLoading: boolean;
    error: string | null;
    suggestions: Record<string, string[]> | null;
    selectedSubject: string;
    numberOfSuggestions: number;
    customInstruction: string;
}

export interface PromptEnhancerState {
    sourceImage: FileData | null;
    customNeeds: string;
    isLoading: boolean;
    error: string | null;
    resultPrompt: string | null;
}

export interface AITechnicalDrawingsState {
    sourceImage: FileData | null;
    isLoading: boolean;
    error: string | null;
    resultImage: string | null;
    drawingType: 'floor-plan' | 'elevation' | 'section';
    detailLevel: 'basic' | 'detailed' | 'annotated' | 'terrain';
    resolution: ImageResolution;
}

export interface SketchConverterState {
    sourceImage: FileData | null;
    isLoading: boolean;
    error: string | null;
    resultImage: string | null;
    sketchStyle: 'pencil' | 'charcoal' | 'watercolor';
    detailLevel: 'medium' | 'high';
    resolution: ImageResolution;
}

export interface FengShuiState {
    name: string;
    birthDay: string;
    birthMonth: string;
    birthYear: string;
    gender: 'male' | 'female';
    analysisType: string;
    floorPlanImage: FileData | null;
    houseDirection: string;
    isLoading: boolean;
    error: string | null;
    resultImage: string | null;
    analysisText: string | null;
    deathDay: string;
    deathMonth: string;
    deathYear: string;
    deathHour: string;
    spouseName: string;
    spouseBirthYear: string;
    eldestChildName: string;
    eldestChildBirthYear: string;
    graveDirection: string;
    terrainDescription: string;
    latitude: number | null;
    longitude: number | null;
    kitchenDirection: string;
    bedroomDirection: string;
    eventType: string;
    vanKhanType: string;
    resolution: ImageResolution;
}

export interface LuBanRulerState {
    width: string;
    height: string;
    checkDimension: 'width' | 'height';
}

export interface LayoutGeneratorState {
    prompt: string;
    sourceImage: FileData | null; // Sketch
    isLoading: boolean;
    error: string | null;
    resultImages: string[];
    numberOfImages: number;
    resolution: ImageResolution;
}

export interface DrawingGeneratorState {
    prompt: string;
    sourceImage: FileData | null; // Render
    isLoading: boolean;
    error: string | null;
    resultImages: string[];
    numberOfImages: number;
    resolution: ImageResolution;
}

export interface DiagramGeneratorState {
    prompt: string;
    sourceImage: FileData | null; // Model view
    isLoading: boolean;
    error: string | null;
    resultImages: string[];
    numberOfImages: number;
    diagramType: string; // Changed to string to support custom preset values
    resolution: ImageResolution;
}

export interface RealEstatePosterState {
    prompt: string;
    sourceImage: FileData | null; // Property Photo
    isLoading: boolean;
    error: string | null;
    resultImages: string[];
    numberOfImages: number;
    posterStyle: 'luxury' | 'modern' | 'minimalist' | 'commercial';
    resolution: ImageResolution;
}

export interface EditByNoteState {
    prompt: string;
    sourceImage: FileData | null;
    isLoading: boolean;
    error: string | null;
    resultImages: string[];
    numberOfImages: number;
    resolution: ImageResolution;
}

export interface PricingState {
    // Now mostly unused but kept for compatibility if needed
}

export interface ProfileState {
    activeTab: 'profile' | 'history';
}

// Khởi tạo giá trị mặc định cho trạng thái của tất cả công cụ
export const initialToolStates = {
    [Tool.ArchitecturalRendering]: {
        style: 'none',
        context: 'none',
        lighting: 'none',
        weather: 'none',
        buildingType: 'none',
        customPrompt: 'Biến thành ảnh chụp thực tế nhà ở',
        referenceImages: [], // Updated
        sourceImage: null,
        isLoading: false,
        isUpscaling: false,
        error: null,
        resultImages: [],
        upscaledImage: null,
        numberOfImages: 1,
        aspectRatio: '4:3',
        resolution: 'Standard',
    } as ImageGeneratorState,
    [Tool.InteriorRendering]: {
        style: 'none',
        roomType: 'none',
        lighting: 'none',
        colorPalette: 'none',
        customPrompt: 'Biến thành ảnh chụp thực tế không gian nội thất',
        referenceImages: [], // Updated
        sourceImage: null,
        isLoading: false,
        isUpscaling: false,
        error: null,
        resultImages: [],
        upscaledImage: null,
        numberOfImages: 1,
        aspectRatio: '4:3',
        resolution: 'Standard',
    } as InteriorGeneratorState,
    [Tool.UrbanPlanning]: {
        viewType: 'none',
        density: 'none',
        lighting: 'none',
        customPrompt: 'Render một khu đô thị ven sông, có nhiều cây xanh, các toà nhà hiện đại và một cây cầu đi bộ.',
        referenceImages: [], // Updated
        sourceImage: null,
        isLoading: false,
        isUpscaling: false,
        error: null,
        resultImages: [],
        upscaledImage: null,
        numberOfImages: 1,
        aspectRatio: '16:9',
        resolution: 'Standard',
    } as UrbanPlanningState,
    [Tool.LandscapeRendering]: {
        gardenStyle: 'none',
        timeOfDay: 'none',
        features: 'none',
        customPrompt: 'Render một sân vườn nhỏ phía sau nhà, có lối đi bằng đá, nhiều hoa và một bộ bàn ghế nhỏ.',
        referenceImages: [], // Updated
        sourceImage: null,
        isLoading: false,
        isUpscaling: false,
        error: null,
        resultImages: [],
        upscaledImage: null,
        numberOfImages: 1,
        aspectRatio: '16:9',
        resolution: 'Standard',
    } as LandscapeRenderingState,
    [Tool.FloorPlan]: {
        prompt: 'Render theo phong cách Scandinavian với nội thất gỗ sồi, tường trắng và nhiều ánh sáng tự nhiên.',
        layoutPrompt: '',
        sourceImage: null,
        referenceImages: [], // Updated
        isLoading: false,
        error: null,
        resultImages: [],
        numberOfImages: 1,
        renderMode: 'top-down',
        planType: 'interior',
        aspectRatio: '4:3',
        resolution: 'Standard',
    } as FloorPlanState,
    [Tool.Renovation]: {
        prompt: 'Cải tạo mặt tiền ngôi nhà này theo phong cách hiện đại, tối giản. Sử dụng vật liệu gỗ, kính và bê tông. Thêm nhiều cây xanh xung quanh.',
        sourceImage: null,
        referenceImages: [],
        maskImage: null,
        isLoading: false,
        error: null,
        renovatedImages: [],
        numberOfImages: 1,
        aspectRatio: '4:3',
        resolution: 'Standard',
    } as RenovationState,
    [Tool.ViewSync]: {
        sourceImage: null,
        directionImage: null,
        isLoading: false,
        error: null,
        resultImages: [],
        numberOfImages: 1,
        sceneType: 'exterior',
        aspectRatio: '4:3',
        customPrompt: '',
        selectedPerspective: 'default',
        selectedAtmosphere: 'default',
        selectedFraming: 'none',
        selectedInteriorAngle: 'default',
        resolution: 'Standard',
    } as ViewSyncState,
    [Tool.VirtualTour]: {
        sourceImage: null,
        currentTourImage: null,
        isLoading: false,
        error: null,
        tourStepSize: 30,
        tourHistory: [],
        resolution: 'Standard',
    } as VirtualTourState,
     [Tool.PromptSuggester]: {
        sourceImage: null,
        isLoading: false,
        error: null,
        suggestions: null,
        selectedSubject: 'all',
        numberOfSuggestions: 5,
        customInstruction: '',
    } as PromptSuggesterState,
    [Tool.PromptEnhancer]: {
        sourceImage: null,
        customNeeds: 'Tạo một prompt chi tiết, chuyên nghiệp cho việc render kiến trúc, tập trung vào phong cách hiện đại, ánh sáng ban ngày và vật liệu tự nhiên.',
        isLoading: false,
        error: null,
        resultPrompt: null,
    } as PromptEnhancerState,
    [Tool.MaterialSwap]: {
        prompt: 'Thay thế sàn trong ảnh chính bằng vật liệu gỗ từ ảnh tham khảo.',
        sceneImage: null,
        materialImage: null,
        isLoading: false,
        error: null,
        resultImages: [],
        numberOfImages: 1,
        resolution: 'Standard',
    } as MaterialSwapperState,
    [Tool.Upscale]: {
        sourceImage: null,
        isLoading: false,
        error: null,
        upscaledImages: [],
        numberOfImages: 1,
        resolution: 'Standard',
    } as UpscaleState,
    [Tool.Moodboard]: {
        prompt: 'Một phòng khách hiện đại và rộng rãi.',
        sourceImage: null,
        isLoading: false,
        error: null,
        resultImages: [],
        numberOfImages: 1,
        aspectRatio: '4:3',
        mode: 'moodboardToScene',
        resolution: 'Standard',
    } as MoodboardGeneratorState,
    [Tool.VideoGeneration]: {
        prompt: 'Tạo video time-lapse cho thấy tòa nhà chuyển từ cảnh ban ngày nắng đẹp sang cảnh ban đêm được chiếu sáng đẹp mắt.',
        startImage: null,
        contextItems: [],
        selectedContextId: null,
        isLoading: false,
        loadingMessage: "Đang khởi tạo các photon ánh sáng...",
        error: null,
        generatedVideoUrl: null,
        mode: 'exterior',
        aspectRatio: 'default', 
    } as VideoGeneratorState,
    [Tool.ImageEditing]: {
        prompt: 'Thêm một ban công sắt nghệ thuật vào cửa sổ tầng hai.',
        sourceImage: null,
        maskImage: null,
        referenceImages: [],
        isLoading: false,
        error: null,
        resultImages: [],
        numberOfImages: 1,
        resolution: 'Standard',
    } as ImageEditorState,
    [Tool.Staging]: {
        prompt: 'Đặt các đồ vật này vào không gian một cách hợp lý và tự nhiên.',
        sceneImage: null,
        objectImages: [],
        isLoading: false,
        error: null,
        resultImages: [],
        numberOfImages: 1,
        resolution: 'Standard',
    } as StagingState,
    [Tool.AITechnicalDrawings]: {
        sourceImage: null,
        isLoading: false,
        error: null,
        resultImage: null,
        drawingType: 'floor-plan',
        detailLevel: 'basic',
        resolution: 'Standard',
    } as AITechnicalDrawingsState,
    [Tool.SketchConverter]: {
        sourceImage: null,
        isLoading: false,
        error: null,
        resultImage: null,
        sketchStyle: 'pencil',
        detailLevel: 'medium',
        resolution: 'Standard',
    } as SketchConverterState,
    [Tool.FengShui]: {
        name: '',
        birthDay: '1',
        birthMonth: '1',
        birthYear: '',
        gender: 'male',
        analysisType: 'bat-trach',
        floorPlanImage: null,
        houseDirection: 'bac-kham',
        isLoading: false,
        error: null,
        resultImage: null,
        analysisText: null,
        deathDay: '',
        deathMonth: '',
        deathYear: '',
        deathHour: 'ty',
        spouseName: '',
        spouseBirthYear: '',
        eldestChildName: '',
        eldestChildBirthYear: '',
        graveDirection: 'bac-kham',
        terrainDescription: '',
        latitude: null,
        longitude: null,
        kitchenDirection: 'dong-nam-ton',
        bedroomDirection: 'dong-chan',
        eventType: 'dong-tho',
        vanKhanType: 'dong-tho',
        resolution: 'Standard',
    } as FengShuiState,
    [Tool.LuBanRuler]: {
        width: '1200',
        height: '2400',
        checkDimension: 'width',
    } as LuBanRulerState,
    [Tool.LayoutGenerator]: {
        prompt: 'Tạo một bảng trình bày kiến trúc (architectural presentation board) sử dụng thiết kế của tòa nhà này. Tạo các bản vẽ đặc trưng gồm: mặt bằng, mặt cắt, phối cảnh trục đo axonometric và 5 sơ đồ diễn tiến khối (massing evolution) từng bước. Tạo thêm các cảnh khác, nội thất, mặt đứng và khiến bảng trình bày trở nên mạch lạc và thu hút bằng bố cục và phần chữ được sắp xếp hợp lý.',
        sourceImage: null, // Sketch
        isLoading: false,
        error: null,
        resultImages: [],
        numberOfImages: 1,
        resolution: 'Standard',
    } as LayoutGeneratorState,
    [Tool.DrawingGenerator]: {
        prompt: 'Tạo một bản vẽ chiếu vuông góc mô tả công trình này theo mặt bằng, mặt cắt và 2 mặt đứng trái – phải, nền xanh blue, nét kỹ thuật màu trắng',
        sourceImage: null,
        isLoading: false,
        error: null,
        resultImages: [],
        numberOfImages: 1,
        resolution: 'Standard',
    } as DrawingGeneratorState,
    [Tool.DiagramGenerator]: {
        prompt: "Exploded axonometric architectural diagram, showing functional layers, flow arrows, analytical style, clean lines, pastel colors.",
        sourceImage: null,
        isLoading: false,
        error: null,
        resultImages: [],
        numberOfImages: 1,
        diagramType: '',
        resolution: 'Standard',
    } as DiagramGeneratorState,
    [Tool.RealEstatePoster]: {
        prompt: 'Thiết kế poster bất động sản sang trọng, hiện đại. Bao gồm tiêu đề lớn, thông tin nổi bật, bố cục tạp chí. Giữ hình ảnh công trình làm chủ đạo.',
        sourceImage: null,
        isLoading: false,
        error: null,
        resultImages: [],
        numberOfImages: 1,
        posterStyle: 'luxury',
        resolution: 'Standard',
    } as RealEstatePosterState,
    [Tool.EditByNote]: {
        prompt: '',
        sourceImage: null,
        isLoading: false,
        error: null,
        resultImages: [],
        numberOfImages: 1,
        resolution: 'Standard',
    } as EditByNoteState,
    [Tool.Pricing]: {} as PricingState,
    [Tool.Profile]: { activeTab: 'profile' } as ProfileState,
    [Tool.History]: {},
};

export type ToolStates = typeof initialToolStates;
