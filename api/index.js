
// --- CẤU HÌNH ---
// Lấy các biến này từ Cloudflare Worker Settings (Environment Variables)
// CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN
// ADMIN_SECRET (Để bảo vệ endpoint update_token)
// SUPABASE_URL, SUPABASE_SERVICE_KEY (Để xử lý Webhook thanh toán & Lấy Key)
// GEMINI_API_KEY (KEY DỰ PHÒNG)

// !!! QUAN TRỌNG: DÁN API KEY CỦA BẠN VÀO ĐÂY NẾU CHƯA CẤU HÌNH ENV !!!
const FALLBACK_GEMINI_API_KEY = ""; 

const PROJECT_ID = "eb9c4bc9-54aa-4068-b146-c0a8076f7d7a";

// Fallback credentials from client source if Env vars are missing
const DEFAULT_SUPABASE_URL = 'https://mtlomjjlgvsjpudxlspq.supabase.co';
const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10bG9tampsZ3ZzanB1ZHhsc3BxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMzAwMjcsImV4cCI6MjA3ODkwNjAyN30.6K-rSAFVJxQPLVjZKdJpBspb5tHE1dZiry4lS6u6JzQ";

const HEADERS = {
    'content-type': 'text/plain;charset=UTF-8',
    'origin': 'https://labs.google',
    'referer': 'https://labs.google/fx/tools/flow',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

// Hàm xin Token mới từ Google bằng Refresh Token (Cho Video Gen - Veo)
async function refreshAccessToken(env) {
    console.log("[Auth] Refreshing Access Token via OAuth...");
    
    if (!env.CLIENT_ID || !env.CLIENT_SECRET || !env.REFRESH_TOKEN) {
        throw new Error("Missing OAuth Environment Variables");
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: env.CLIENT_ID,
            client_secret: env.CLIENT_SECRET,
            refresh_token: env.REFRESH_TOKEN,
            grant_type: 'refresh_token'
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(`Failed to refresh token: ${data.error_description || data.error}`);
    }

    const newAccessToken = data.access_token;
    if (env.VIDEO_KV) {
        await env.VIDEO_KV.put('GOOGLE_TOKEN', newAccessToken, { expirationTtl: 3000 });
    }
    return newAccessToken;
}

// Hàm lấy Token Video Gen
async function getAccessToken(env) {
    try {
        if (env.VIDEO_KV) {
            const kvToken = await env.VIDEO_KV.get('GOOGLE_TOKEN');
            if (kvToken) return kvToken;
        }
        if (env.REFRESH_TOKEN) {
             return await refreshAccessToken(env);
        }
        throw new Error("No token available. Please configure OAuth variables.");
    } catch (e) {
        console.error("Auth Error:", e);
        throw e;
    }
}

// --- LOGIC LẤY KEY GEMINI TỪ SUPABASE (Server-Side) ---
async function getGeminiKeySecurely(env) {
    // 1. Kiểm tra cache trong KV trước để đỡ tốn request gọi DB (Cache ngắn hạn 60s)
    if (env.VIDEO_KV) {
        const cachedKey = await env.VIDEO_KV.get('GEMINI_ACTIVE_KEY');
        if (cachedKey) return cachedKey;
    }

    // 2. Ưu tiên 1: Biến môi trường
    if (env.GEMINI_API_KEY) return env.GEMINI_API_KEY;

    // 3. Ưu tiên 2: Hardcoded Fallback (Dành cho Dev nhanh)
    if (FALLBACK_GEMINI_API_KEY && FALLBACK_GEMINI_API_KEY.length > 10) return FALLBACK_GEMINI_API_KEY;

    // 4. Ưu tiên 3: Lấy từ Supabase 'api_keys' table
    const sbUrl = env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const sbKey = env.SUPABASE_SERVICE_KEY || DEFAULT_SUPABASE_KEY;

    if (sbUrl && sbKey) {
        // console.log("[Proxy] Fetching API Key from Supabase...");
        try {
            // Lấy tất cả active keys từ bảng api_keys
            // Lưu ý: Cột tên là 'key_value' chứ không phải 'key'
            const response = await fetch(`${sbUrl}/rest/v1/api_keys?select=key_value&is_active=eq.true`, {
                headers: {
                    'apikey': sbKey,
                    'Authorization': `Bearer ${sbKey}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    // Randomly select one active key to distribute load
                    const randomIndex = Math.floor(Math.random() * data.length);
                    const key = data[randomIndex].key_value;
                    
                    if (key) {
                        // Cache key này vào KV trong 5 phút
                        if (env.VIDEO_KV) {
                            await env.VIDEO_KV.put('GEMINI_ACTIVE_KEY', key, { expirationTtl: 300 });
                        }
                        return key;
                    }
                } else {
                    console.warn("[Proxy] Connected to Supabase but found no active keys in 'api_keys' table.");
                }
            } else {
                console.error("[Proxy] Failed to fetch keys from Supabase:", response.status, await response.text());
            }
        } catch (e) {
            console.error("[Proxy] Exception fetching key from Supabase:", e);
        }
    }

    throw new Error("GEMINI_API_KEY not configured. Please check 'api_keys' table in Supabase or set env var.");
}

// --- PROXY HANDLER (Image/Text Generation) ---
async function handleGeminiProxy(body, env, request) {
    const { model, payload, method = 'generateContent' } = body;
    
    // Lấy Key an toàn từ Supabase/Env
    const apiKey = await getGeminiKeySecurely(env);
    
    const version = 'v1beta'; 
    const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:${method}?key=${apiKey}`;

    // Debugging Cloudflare Colocation (Server Location)
    const cfColo = request?.cf?.colo || 'UNKNOWN';
    console.log(`[Gemini Proxy] Region: ${cfColo} | Calling: ${model}:${method}`);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    // Safely parse JSON to avoid crashing on HTML error pages from Google (Common with Geo-blocking)
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        data = await response.json();
    } else {
        const text = await response.text();
        // Return a structured error if response is not JSON (e.g., HTML 403 Forbidden)
        data = { 
            error: { 
                message: `Upstream Google Error (${response.status}): ${text.substring(0, 200)}...`, // Truncate long HTML
                status: response.status,
                type: 'upstream_error',
                region: cfColo // Include region in error for frontend to debug
            } 
        };
    }
    
    // Forward the original status code and data
    return { data, status: response.status, ok: response.ok };
}

// --- VIDEO GENERATION FUNCTIONS (Veo) ---
async function uploadImage(token, base64Data) {
    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const payload = {
        "imageInput": { "aspectRatio": "IMAGE_ASPECT_RATIO_LANDSCAPE", "isUserUploaded": true, "mimeType": "image/jpeg", "rawImageBytes": cleanBase64 },
        "clientContext": { "sessionId": ";" + Date.now(), "tool": "ASSET_MANAGER" }
    };
    const res = await fetch('https://aisandbox-pa.googleapis.com/v1/uploadUserImage', {
        method: 'POST',
        headers: { ...HEADERS, 'authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    let mediaId = data.mediaGenerationId?.mediaGenerationId || data.mediaGenerationId || data.imageOutput?.image?.id;
    if (!mediaId) throw new Error("No mediaId found in upload response");
    return mediaId;
}

async function triggerGeneration(token, prompt, mediaId) {
    const sceneId = crypto.randomUUID();
    const payload = {
        "clientContext": { "sessionId": ";" + Date.now(), "projectId": PROJECT_ID, "tool": "PINHOLE", "userPaygateTier": "PAYGATE_TIER_TWO" },
        "requests": [{
            "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
            "seed": Math.floor(Date.now() / 1000), 
            "textInput": { "prompt": prompt },
            "videoModelKey": "veo_3_1_i2v_s_fast_ultra",
            "startImage": { "mediaId": mediaId },
            "metadata": { "sceneId": sceneId }
        }]
    };
    const res = await fetch('https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartImage', {
        method: 'POST',
        headers: { ...HEADERS, 'authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    const opItem = data.operations?.[0];
    const operationName = opItem?.operation?.name || opItem?.name;
    if (!operationName) throw new Error("No operation name returned");
    return { task_id: operationName, scene_id: sceneId };
}

async function triggerUpscale(token, mediaId) {
    const sceneId = crypto.randomUUID();
    const payload = {
        "requests": [{
            "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
            "seed": Math.floor(Date.now() / 1000),
            "videoInput": { "mediaId": mediaId },
            "videoModelKey": "veo_2_1080p_upsampler_8s",
            "metadata": { "sceneId": sceneId }
        }],
        "clientContext": { "sessionId": ";" + Date.now() }
    };
    const res = await fetch('https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoUpsampleVideo', {
        method: 'POST',
        headers: { ...HEADERS, 'authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    const opItem = data.operations?.[0];
    const operationName = opItem?.operation?.name || opItem?.name;
    if (!operationName) throw new Error("No operation name returned");
    return { task_id: operationName, scene_id: sceneId };
}

async function checkStatus(token, task_id, scene_id) {
    const payload = {
        "operations": [{ "operation": { "name": task_id }, "sceneId": scene_id, "status": "MEDIA_GENERATION_STATUS_ACTIVE" }]
    };
    const res = await fetch('https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus', {
        method: 'POST',
        headers: { ...HEADERS, 'authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    const opResult = data.operations?.[0];
    if (!opResult) return { status: 'processing' };
    const status = opResult.status;
    if (["MEDIA_GENERATION_STATUS_SUCCESSFUL", "MEDIA_GENERATION_STATUS_COMPLETED", "DONE"].includes(status)) {
        let vidUrl = opResult.operation?.metadata?.video?.fifeUrl || opResult.videoFiles?.[0]?.url || opResult.response?.videoUrl;
        let mediaId = opResult.response?.id || opResult.operation?.response?.id || opResult.mediaGenerationId;
        if (vidUrl) return { status: 'completed', video_url: vidUrl, mediaId: mediaId };
        return { status: 'failed', message: 'Video URL not found' };
    }
    if (status === "MEDIA_GENERATION_STATUS_FAILED") return { status: 'failed', message: JSON.stringify(opResult) };
    return { status: 'processing' };
}

async function handleSePayWebhook(request, env) {
    try {
        const body = await request.json();
        const content = body.content || body.description || "";
        const amount = body.transferAmount || body.amount || 0;
        const match = content.match(/OPZ\d+/i);
        const transactionCode = match ? match[0].toUpperCase() : null;

        if (!transactionCode) return new Response(JSON.stringify({ success: false, message: "No transaction code" }), { status: 200 });
        
        const sbUrl = env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
        const sbKey = env.SUPABASE_SERVICE_KEY || DEFAULT_SUPABASE_KEY;

        const response = await fetch(`${sbUrl}/rest/v1/rpc/webhook_approve_transaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` },
            body: JSON.stringify({ p_transaction_code: transactionCode, p_amount: amount })
        });
        return new Response(JSON.stringify(await response.json()), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
    }
}

export default {
    async fetch(request, env, ctx) {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        };

        if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

        const url = new URL(request.url);
        const path = url.pathname;

        if (path.includes('/sepay-webhook')) return handleSePayWebhook(request, env);

        const sendJson = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } });

        try {
            let body = {};
            try { if (request.method !== 'GET') body = await request.json(); } catch (e) {}
            let action = body.action || '';

            // Map URL path to action if not present in body
            if (!action) {
                if (path.includes('/gemini-proxy')) action = 'gemini_proxy';
                else if (path.includes('/auth')) action = 'auth';
                else if (path.includes('/upload')) action = 'upload';
                else if (path.includes('/create')) action = 'create';
                else if (path.includes('/upscale')) action = 'upscale';
                else if (path.includes('/check')) action = 'check';
                else if (path.includes('/update-token')) action = 'update_token';
            }

            // --- ROUTING ---
            if (action === 'gemini_proxy') {
                // PASS request object to access request.cf
                const { data, status, ok } = await handleGeminiProxy(body, env, request);
                // Return data with original status code from Google (e.g. 400 for location error)
                return sendJson(data, status); 
            }
            else if (action === 'update_token') {
                const { admin_secret, oauth_token } = body;
                // Simple security check (Should use env var in production)
                if (admin_secret !== (env.ADMIN_SECRET || "opzen_admin_secret_123")) {
                    return sendJson({ error: "Unauthorized" }, 401);
                }
                
                if (oauth_token && env.VIDEO_KV) {
                    // Update the KV with the fresh token from Python script
                    await env.VIDEO_KV.put('GOOGLE_TOKEN', oauth_token);
                    return sendJson({ status: "updated", type: "oauth_token" });
                }
                return sendJson({ status: "ignored", message: "Missing oauth_token or KV binding" });
            }
            else if (action === 'auth') {
                const token = await getAccessToken(env);
                return sendJson({ token });
            }
            else if (action === 'upload') {
                const mediaId = await uploadImage(await getAccessToken(env), body.image);
                return sendJson({ mediaId });
            }
            else if (action === 'create') {
                const result = await triggerGeneration(await getAccessToken(env), body.prompt, body.mediaId);
                return sendJson(result);
            }
            else if (action === 'upscale') {
                const result = await triggerUpscale(await getAccessToken(env), body.mediaId);
                return sendJson(result);
            }
            else if (action === 'check') {
                const result = await checkStatus(await getAccessToken(env), body.task_id, body.scene_id);
                return sendJson(result);
            }
            else {
                return sendJson({ status: "ok", message: "Worker Active" });
            }

        } catch (error) {
            return sendJson({ error: true, message: error.message }, 500);
        }
    }
};
