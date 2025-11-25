
export enum Tool {
  FloorPlan = 'FloorPlan',
  Renovation = 'Renovation',
  ArchitecturalRendering = 'ArchitecturalRendering',
  InteriorRendering = 'InteriorRendering',
  UrbanPlanning = 'UrbanPlanning',
  LandscapeRendering = 'LandscapeRendering',
  ViewSync = 'ViewSync',
  VirtualTour = 'VirtualTour',
  PromptSuggester = 'PromptSuggester',
  PromptEnhancer = 'PromptEnhancer',
  MaterialSwap = 'MaterialSwap',
  VideoGeneration = 'VideoGeneration',
  ImageEditing = 'ImageEditing',
  Upscale = 'Upscale',
  Moodboard = 'Moodboard',
  History = 'History',
  Staging = 'Staging',
  AITechnicalDrawings = 'AITechnicalDrawings',
  SketchConverter = 'SketchConverter',
  FengShui = 'FengShui',
  LuBanRuler = 'LuBanRuler',
  Pricing = 'Pricing',
}

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
export type ImageResolution = "Standard" | "1K" | "2K" | "4K";

export interface FileData {
  base64: string;
  mimeType: string;
  objectURL: string;
}

// Updated to match Supabase 'generated_assets' table structure
export interface HistoryItem {
  id: string;
  user_id: string;
  tool: Tool;
  prompt: string;
  media_url: string;      // URL to the result in Supabase Storage
  source_url?: string;    // URL to the source image (if uploaded)
  media_type: 'image' | 'video';
  created_at: string;
  // Legacy properties for compatibility mapping (optional)
  resultImageURL?: string;
  resultVideoURL?: string;
  sourceImageURL?: string;
  timestamp?: number;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
  type: 'subscription' | 'credit';
  credits?: number;
  highlight?: boolean;
  description: string;
  durationMonths?: number; // Added for variable subscription length
}

export interface Transaction {
  id: string;
  user_id: string;
  plan_id: string;
  plan_name: string;
  amount: number;
  currency: string;
  type: 'subscription' | 'credit' | 'usage';
  credits_added: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  payment_method: string;
  transaction_code: string;
  created_at: string;
}

export interface UsageLog {
  id: string;
  user_id: string;
  credits_used: number;
  description: string;
  tool_id?: string;
  created_at: string;
}

export interface GenerationJob {
  id: string;
  user_id: string;
  tool_id: string;
  prompt: string;
  cost: number;
  usage_log_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result_url?: string;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserStatus {
  credits: number;
  subscriptionEnd: string | null; // ISO string date
  isExpired: boolean;
}