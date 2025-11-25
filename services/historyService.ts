
import { HistoryItem, Tool } from '../types';
import { supabase } from './supabaseClient';

const TABLE_NAME = 'generated_assets';
const BUCKET_NAME = 'assets';

// Helper to upload base64 or blob url to Supabase Storage
const uploadToStorage = async (userId: string, dataUrlOrBase64: string, folder: 'results' | 'sources'): Promise<string | null> => {
    try {
        if (!dataUrlOrBase64) return null;

        // Check if it's a remote URL (e.g., from Video generation API)
        if (dataUrlOrBase64.startsWith('http')) {
            // Optimization: If we could fetch and upload to our own storage, that would be better for persistence.
            // For now, we assume external URLs are valid.
            return dataUrlOrBase64; 
        }

        let blob: Blob;

        // Handle Base64 Data URI
        if (dataUrlOrBase64.startsWith('data:')) {
            const arr = dataUrlOrBase64.split(',');
            const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            blob = new Blob([u8arr], { type: mime });
        } 
        // Handle Blob URL (from URL.createObjectURL)
        else if (dataUrlOrBase64.startsWith('blob:')) {
             const response = await fetch(dataUrlOrBase64);
             blob = await response.blob();
        } else {
             // Assume raw base64 without prefix (less common in this app but possible)
             return null; 
        }

        const fileExt = blob.type.split('/')[1] || 'png';
        const fileName = `${userId}/${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, blob, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error("Supabase Storage Upload Error:", uploadError);
            return null;
        }

        const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
        return data.publicUrl;

    } catch (error) {
        console.error("Error processing file for upload:", error);
        return null;
    }
};

export const getHistory = async (): Promise<HistoryItem[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching history from Supabase:', error);
        return [];
    }

    // Map database fields to HistoryItem interface for frontend compatibility
    return data.map((item: any) => ({
        ...item,
        resultImageURL: item.media_type === 'image' ? item.media_url : undefined,
        resultVideoURL: item.media_type === 'video' ? item.media_url : undefined,
        sourceImageURL: item.source_url,
        timestamp: new Date(item.created_at).getTime()
    })) as HistoryItem[];
};

export const addToHistory = async (item: { 
    tool: Tool; 
    prompt: string; 
    sourceImageURL?: string; 
    resultImageURL?: string;
    resultVideoURL?: string; 
}) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.warn("Cannot save history: User not logged in.");
            return;
        }

        const mediaType = item.resultVideoURL ? 'video' : 'image';
        const resultData = item.resultVideoURL || item.resultImageURL;

        if (!resultData) {
            console.error("History item must have a result URL.");
            return;
        }

        // 1. Upload Result Media (if it's not already a permanent URL)
        const persistentMediaUrl = await uploadToStorage(user.id, resultData, 'results');
        
        if (!persistentMediaUrl) {
             throw new Error("Failed to upload result media.");
        }

        // 2. Upload Source Media (Optional)
        let persistentSourceUrl = null;
        if (item.sourceImageURL) {
            persistentSourceUrl = await uploadToStorage(user.id, item.sourceImageURL, 'sources');
        }

        // 3. Insert into Database
        const { error } = await supabase
            .from(TABLE_NAME)
            .insert({
                user_id: user.id,
                tool: item.tool,
                prompt: item.prompt,
                media_url: persistentMediaUrl,
                source_url: persistentSourceUrl,
                media_type: mediaType
            });

        if (error) {
            console.error("Error saving history to database:", error);
        }

    } catch (error) {
        console.error("Failed to add item to history:", error);
    }
};

export const clearHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Note: This only deletes the DB records. 
    // To properly clear storage, we would need to list all files and delete them, 
    // which is expensive. RLS prevents users from deleting others' files anyway.
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('user_id', user.id);

    if (error) {
        console.error('Error clearing history:', error);
        throw error;
    }
};

// Helper to extract relative path from Supabase public URL
const getPathFromUrl = (url: string): string | null => {
    try {
        if (!url) return null;

        // Method 1: Standard Supabase URL
        const marker = `/storage/v1/object/public/${BUCKET_NAME}/`;
        const index = url.indexOf(marker);
        if (index !== -1) {
             return decodeURIComponent(url.substring(index + marker.length));
        }
        
        // Method 2: Custom Domain or alternative structure
        // Example: https://project.supabase.co/storage/v1/object/public/assets/user/file.png
        // We need to grab everything after the bucket name
        const regex = new RegExp(`${BUCKET_NAME}/(.+)`);
        const match = url.match(regex);
        if (match && match[1]) {
            return decodeURIComponent(match[1]);
        }

        return null;
    } catch (e) {
        console.warn("Failed to parse URL path:", url);
        return null;
    }
};

export const deleteHistoryItem = async (id: string) => {
    try {
        // 1. Get item details to find file paths to delete from Storage
        const { data: item, error: fetchError } = await supabase
            .from(TABLE_NAME)
            .select('media_url, source_url')
            .eq('id', id)
            .single();
            
        if (fetchError) {
            console.warn("Could not fetch item details for file deletion (might already be deleted or RLS issue):", fetchError.message);
            // Proceed to try deleting the DB record anyway, as it might be a zombie record
        }

        // 2. Delete files from Storage if paths found (Wrapped in try-catch to be non-blocking)
        if (item) {
            try {
                const filesToRemove: string[] = [];
                
                if (item.media_url) {
                    const mediaPath = getPathFromUrl(item.media_url);
                    if (mediaPath) filesToRemove.push(mediaPath);
                }
                
                if (item.source_url) {
                    const sourcePath = getPathFromUrl(item.source_url);
                    if (sourcePath) filesToRemove.push(sourcePath);
                }
                
                if (filesToRemove.length > 0) {
                     const { error: storageError } = await supabase
                        .storage
                        .from(BUCKET_NAME)
                        .remove(filesToRemove);
                     
                     if (storageError) {
                         console.warn("Failed to delete files from storage (proceeding to DB delete):", storageError.message);
                     } else {
                         console.log("Deleted files from storage:", filesToRemove);
                     }
                }
            } catch (storageErr) {
                console.warn("Exception during storage deletion:", storageErr);
                // Swallow storage errors to ensure DB record is deleted
            }
        }

        // 3. Delete record from Database
        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', id);
            
        if (error) {
             console.error(`Error deleting item ${id} from database:`, error);
             throw new Error(error.message);
        }
    } catch (e) {
        console.error("Critical error in deleteHistoryItem:", e);
        throw e;
    }
};
