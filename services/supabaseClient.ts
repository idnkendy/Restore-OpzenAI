
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mtlomjjlgvsjpudxlspq.supabase.co';

// =================================================================================
// == QUAN TRỌNG: DÁN KHÓA "ANON (PUBLIC)" CỦA BẠN VÀO ĐÂY ĐỂ KÍCH HOẠT ĐĂNG NHẬP ==
// =================================================================================
const rawKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10bG9tampsZ3ZzanB1ZHhsc3BxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMzAwMjcsImV4cCI6MjA3ODkwNjAyN30.6K-rSAFVJxQPLVjZKdJpBspb5tHE1dZiry4lS6u6JzQ";
const supabaseKey = rawKey ? rawKey.trim() : "";
// =================================================================================

// Custom fetch with safe timeout implementation
const fetchWithTimeout = (url: any, options: any) => {
    // Increased timeout to 30s to handle slow networks better
    const TIMEOUT_MS = 30000; 

    // 1. Try modern AbortSignal.timeout if available
    if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
        try {
            // @ts-ignore
            return fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT_MS) });
        } catch (e) {
            // Fallback
        }
    }

    // 2. Fallback to AbortController
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

    return fetch(url, { ...options, signal: controller.signal })
        .then(response => {
            clearTimeout(id);
            return response;
        })
        .catch(error => {
            clearTimeout(id);
            throw error;
        });
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
    global: {
        fetch: fetchWithTimeout
    }
});

export const isSupabaseConfigured = supabaseKey && !supabaseKey.startsWith("DÁN_KHÓA") && supabaseKey.length > 20;

export const checkSupabaseConnection = async () => {
    if (!isSupabaseConfigured) {
        console.error("[Supabase] Key is missing or invalid.");
        return false;
    }
    
    const maxRetries = 3;

    for (let i = 0; i < maxRetries; i++) {
        try {
            const start = Date.now();
            const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
            
            if (!error) {
                console.log(`[Supabase] Connection OK (${Date.now() - start}ms).`);
                return true;
            }
            
            const msg = error.message || '';
            if (!msg.includes('fetch') && !msg.includes('Network')) {
                 console.warn(`[Supabase] Connected, but returned DB error: ${msg}`);
                 return true;
            }
            
            throw error;

        } catch (e: any) {
            const msg = e.message || e;
            if (i < maxRetries - 1) {
                console.warn(`[Supabase] Connection attempt ${i + 1}/${maxRetries} failed. Retrying...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                console.error(`[Supabase] Connection Check Failed:`, msg);
                return false;
            }
        }
    }
    return false;
};

checkSupabaseConnection();
