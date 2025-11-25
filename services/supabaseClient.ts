
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mtlomjjlgvsjpudxlspq.supabase.co';

// =================================================================================
// == QUAN TRỌNG: DÁN KHÓA "ANON (PUBLIC)" CỦA BẠN VÀO ĐÂY ĐỂ KÍCH HOẠT ĐĂNG NHẬP ==
// =================================================================================
// Lấy khóa từ: Project Settings > API > Project API Keys > anon / public
// Note: Trim whitespace just in case of copy-paste errors
const rawKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10bG9tampsZ3ZzanB1ZHhsc3BxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMzAwMjcsImV4cCI6MjA3ODkwNjAyN30.6K-rSAFVJxQPLVjZKdJpBspb5tHE1dZiry4lS6u6JzQ";
const supabaseKey = rawKey ? rawKey.trim() : "";
// =================================================================================

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
    // Increase global timeout for slower networks
    global: {
        fetch: (url, options) => {
            return fetch(url, { ...options, signal: AbortSignal.timeout(15000) }); // 15s timeout
        }
    }
});

// Biến này giúp giao diện kiểm tra xem khóa đã được cấu hình hay chưa.
export const isSupabaseConfigured = supabaseKey && !supabaseKey.startsWith("DÁN_KHÓA") && supabaseKey.length > 20;

// Function to explicitly check connection (useful for debugging)
export const checkSupabaseConnection = async () => {
    if (!isSupabaseConfigured) {
        console.error("[Supabase] Key is missing or invalid.");
        return false;
    }
    
    try {
        const start = Date.now();
        const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        
        if (error) {
            // If error code is PGRST116 or similar, connection is fine but maybe table/row issue.
            // If it's TypeError or network error, then connection is failed.
            if (error.message && (error.message.includes('fetch') || error.message.includes('Network'))) {
                console.error("[Supabase] Connection Check Failed (Network):", error.message);
                return false;
            }
            console.warn("[Supabase] Connection OK but query error:", error.message);
            return true; 
        }
        
        console.log(`[Supabase] Connection OK (${Date.now() - start}ms). URL: ${supabaseUrl}`);
        return true;
    } catch (e: any) {
        console.error("[Supabase] Connection Check Exception:", e);
        return false;
    }
};

// Run check on init
checkSupabaseConnection();
