
// --- CẤU HÌNH ---
// Lấy các biến này từ Cloudflare Worker Settings (Environment Variables)
// ADMIN_SECRET (Để bảo vệ endpoint update_token)
// SUPABASE_URL, SUPABASE_SERVICE_KEY (Để xử lý Webhook thanh toán & Lấy Key)
// GEMINI_API_KEY (KEY DỰ PHÒNG)

// !!! QUAN TRỌNG: DÁN API KEY CỦA BẠN VÀO ĐÂY NẾU CHƯA CẤU HÌNH ENV !!!
const FALLBACK_GEMINI_API_KEY = ""; 

// Fallback credentials from client source if Env vars are missing
const DEFAULT_SUPABASE_URL = 'https://mtlomjjlgvsjpudxlspq.supabase.co';
const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10bG9tampsZ3ZzanB1ZHhsc3BxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMzAwMjcsImV4cCI6MjA3ODkwNjAyN30.6K-rSAFVJxQPLVjZKdJpBspb5tHE1dZiry4lS6u6JzQ";

const HEADERS = {
    'content-type': 'text/plain;charset=UTF-8', // Google bắt buộc text/plain
    'origin': 'https://labs.google',
    'referer': 'https://labs.google/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
};

// --- LOGIC LẤY KEY GEMINI TỪ SUPABASE (Server-Side) ---
async function getGeminiKeySecurely(env) {
    if (env.VIDEO_KV) {
        const cachedKey = await env.VIDEO_KV.get('GEMINI_ACTIVE_KEY');
        if (cachedKey) return cachedKey;
    }

    if (env.GEMINI_API_KEY) return env.GEMINI_API_KEY;
    if (FALLBACK_GEMINI_API_KEY && FALLBACK_GEMINI_API_KEY.length > 10) return FALLBACK_GEMINI_API_KEY;

    const sbUrl = env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const sbKey = env.SUPABASE_SERVICE_KEY || DEFAULT_SUPABASE_KEY;

    if (sbUrl && sbKey) {
        try {
            const response = await fetch(`${sbUrl}/rest/v1/api_keys?select=key_value&is_active=eq.true`, {
                headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    const randomIndex = Math.floor(Math.random() * data.length);
                    const key = data[randomIndex].key_value;
                    if (key) {
                        if (env.VIDEO_KV) await env.VIDEO_KV.put('GEMINI_ACTIVE_KEY', key, { expirationTtl: 300 });
                        return key;
                    }
                }
            }
        } catch (e) {
            console.error("[Proxy] Exception fetching key from Supabase:", e);
        }
    }
    throw new Error("GEMINI_API_KEY not configured.");
}

// --- PROXY HANDLER (Image/Text Generation) ---
async function handleGeminiProxy(body, env, request) {
    const { model, payload, method = 'generateContent' } = body;
    const apiKey = await getGeminiKeySecurely(env);
    const version = 'v1beta'; 
    const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:${method}?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        data = await response.json();
    } else {
        const text = await response.text();
        data = { 
            error: { 
                message: `Upstream Google Error (${response.status}): ${text.substring(0, 200)}...`, 
                status: response.status,
                type: 'upstream_error'
            } 
        };
    }
    return { data, status: response.status, ok: response.ok };
}

// --- QUOTA MANAGEMENT HELPERS ---

async function resetAllUsageCounts(env) {
    const sbUrl = env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const sbKey = env.SUPABASE_SERVICE_KEY || DEFAULT_SUPABASE_KEY;
    
    try {
        await fetch(`${sbUrl}/rest/v1/video_accounts?is_active=eq.true`, {
            method: 'PATCH',
            headers: {
                'apikey': sbKey,
                'Authorization': `Bearer ${sbKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ usage_count: 0 })
        });
        console.log("Reset all video accounts usage to 0");
    } catch (e) {
        console.error("Failed to reset usage counts:", e);
    }
}

async function incrementAccountUsage(env, accountId, currentUsage) {
    const sbUrl = env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const sbKey = env.SUPABASE_SERVICE_KEY || DEFAULT_SUPABASE_KEY;
    
    try {
        const res = await fetch(`${sbUrl}/rest/v1/video_accounts?id=eq.${accountId}`, {
            method: 'PATCH',
            headers: {
                'apikey': sbKey,
                'Authorization': `Bearer ${sbKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ usage_count: (currentUsage || 0) + 1 })
        });
        if (!res.ok) {
            console.error(`[DB Update] Failed for ID ${accountId}: ${res.statusText}`);
        } else {
            console.log(`[DB Update] Increased usage for ID ${accountId} to ${(currentUsage || 0) + 1}`);
        }
    } catch (e) {
        console.error(`[DB Update] Exception incrementing usage for account ${accountId}:`, e);
    }
}

// --- VIDEO GENERATION AUTH ---
async function getAllAccounts(env) {
    const sbUrl = env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const sbKey = env.SUPABASE_SERVICE_KEY || DEFAULT_SUPABASE_KEY;

    try {
        // UPDATE: Thêm order=updated_at.desc để ưu tiên lấy các tài khoản mới được bot cập nhật
        const response = await fetch(`${sbUrl}/rest/v1/video_accounts?select=id,access_token,auth_cookies,project_id,usage_count,usage_limit&is_active=eq.true&access_token=not.is.null&order=updated_at.desc`, {
            method: 'GET',
            headers: {
                'apikey': sbKey,
                'Authorization': `Bearer ${sbKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("Lỗi kết nối DB Supabase");
        
        let accounts = await response.json();
        
        if (!accounts || accounts.length === 0) {
            throw new Error("Hệ thống đang cập nhật tài khoản Video. Vui lòng thử lại sau.");
        }

        let availableAccounts = accounts.filter(acc => {
            const used = acc.usage_count || 0;
            const limit = acc.usage_limit || 50; 
            return used < limit;
        });

        if (availableAccounts.length === 0) {
            console.warn("All accounts reached usage limit. Resetting all...");
            await resetAllUsageCounts(env);
            accounts = accounts.map(acc => ({ ...acc, usage_count: 0 }));
            availableAccounts = accounts; 
        }

        // UPDATE: Không random hoàn toàn nữa, mà giữ nguyên thứ tự ưu tiên (mới nhất trước)
        // Tuy nhiên, để tránh "Hotspot" (tất cả user cùng dùng 1 acc mới nhất), ta lấy Top 5 acc mới nhất và random trong đó.
        
        if (availableAccounts.length > 5) {
             const topFresh = availableAccounts.slice(0, 5).sort(() => Math.random() - 0.5);
             const others = availableAccounts.slice(5).sort(() => Math.random() - 0.5);
             return [...topFresh, ...others];
        }

        return availableAccounts.sort(() => Math.random() - 0.5);

    } catch (e) {
        console.error("Get Auth Data Error:", e);
        throw new Error(e.message || "Không thể lấy thông tin xác thực từ hệ thống.");
    }
}

// --- HELPER: Execute Logic with Failover Rotation & Quota Update ---
async function executeWithFailover(env, accounts, operationName, callback) {
    let lastError = null;

    for (const account of accounts) {
        if (!account.project_id) continue;

        try {
            // MOVED: Update usage BEFORE executing the request
            // This ensures we count the attempt immediately.
            if (operationName !== 'CheckStatus' && operationName !== 'UploadImage') {
                 try {
                     await incrementAccountUsage(env, account.id, account.usage_count);
                 } catch (usageError) {
                     console.error("Failed to increment usage but continuing:", usageError);
                 }
            }

            const result = await callback(account);
            return result; 
        } catch (e) {
            lastError = e;
            const msg = e.message || "";
            
            const isRetryable = 
                msg.includes("401") || 
                msg.includes("403") || 
                msg.includes("429") || 
                msg.includes("500") || 
                msg.includes("502") ||
                msg.includes("RESOURCE_EXHAUSTED") ||
                msg.includes("UNAUTHENTICATED") ||
                msg.includes("PERMISSION_DENIED");

            if (isRetryable) {
                console.warn(`[${operationName}] Account ${account.id} failed. Switching. Error: ${msg}`);
                continue; 
            } else {
                console.error(`[${operationName}] Permanent Error: ${msg}`);
                throw e; // Throw permanent errors like 400 Bad Request immediately so client sees the message
            }
        }
    }
    
    throw lastError || new Error(`All accounts failed for ${operationName}`);
}

// --- CORE LOGIC: INTERNAL UPLOAD HELPER ---
async function performUpload(authData, base64Data, imageAspectRatio) {
    const { access_token: token, auth_cookies: cookies, project_id: projectId } = authData;
    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const aspectRatioEnum = imageAspectRatio || "IMAGE_ASPECT_RATIO_LANDSCAPE";

    // UPDATED: Use 'PINHOLE' tool to match the Veo session context
    const payload = {
        "imageInput": { 
            "aspectRatio": aspectRatioEnum, 
            "isUserUploaded": true, 
            "mimeType": "image/jpeg", 
            "rawImageBytes": cleanBase64 
        },
        "clientContext": { 
            "sessionId": ";" + Date.now(), 
            "tool": "PINHOLE", 
            "projectId": projectId,
            "userPaygateTier": "PAYGATE_TIER_TWO"
        }
    };

    const res = await fetch('https://aisandbox-pa.googleapis.com/v1:uploadUserImage', {
        method: 'POST',
        headers: { 
            ...HEADERS, 
            'authorization': `Bearer ${token}`,
            'cookie': cookies || ''
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Upload Failed (${res.status}): ${errText}`);
    }
    const data = await res.json();
    const mediaId = data.mediaGenerationId?.mediaGenerationId || data.mediaGenerationId || data.imageOutput?.image?.id;
    
    if (!mediaId) throw new Error("No mediaId found in upload response");
    return mediaId;
}

// --- EXPORTED ACTIONS ---

async function uploadImage(env, accounts, base64Data, imageAspectRatio) {
    return executeWithFailover(env, accounts, "UploadImage", async (authData) => {
        return await performUpload(authData, base64Data, imageAspectRatio);
    });
}

// UPDATED: Now supports atomic upload-and-generate logic if image data is passed
async function triggerGeneration(env, accounts, prompt, mediaId, videoAspectRatio, imageData, imageAspectRatio) {
    return executeWithFailover(env, accounts, "CreateVideo", async (authData) => {
        const { access_token: token, auth_cookies: cookies, project_id: projectId } = authData;
        
        // 1. ATOMIC UPLOAD (If image data is provided in the request)
        // This ensures upload and generation happen in the same account context
        let activeMediaId = mediaId;
        if (imageData) {
            console.log(`[Worker] Performing atomic upload for account ${authData.id}...`);
            activeMediaId = await performUpload(authData, imageData, imageAspectRatio);
        }

        // 2. GENERATION
        const sceneId = crypto.randomUUID();
        const aspectRatioEnum = videoAspectRatio || "VIDEO_ASPECT_RATIO_LANDSCAPE";
        
        // CRITICAL FIX: SELECT CORRECT MODEL KEY BASED ON ASPECT RATIO
        const modelKey = (aspectRatioEnum === "VIDEO_ASPECT_RATIO_PORTRAIT") 
            ? "veo_3_1_i2v_s_fast_portrait_ultra" 
            : "veo_3_1_i2v_s_fast_ultra";

        const payload = {
            "clientContext": {
                "sessionId": ";" + Date.now(),
                "projectId": projectId,
                "tool": "PINHOLE",
                "userPaygateTier": "PAYGATE_TIER_TWO"
            },
            "requests": [{
                "aspectRatio": aspectRatioEnum,
                "seed": Math.floor(Date.now() / 1000), 
                "textInput": { "prompt": prompt },
                "videoModelKey": modelKey, 
                "startImage": { "mediaId": activeMediaId },
                "metadata": { "sceneId": sceneId }
            }]
        };
    
        const res = await fetch('https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartImage', {
            method: 'POST',
            headers: { 
                ...HEADERS, 
                'authorization': `Bearer ${token}`,
                'cookie': cookies || ''
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Trigger Failed (${res.status}) [Key: ${modelKey}]: ${errText}`);
        }
        const data = await res.json();

        const opItem = data.operations?.[0];
        const operationName = opItem?.operation?.name || opItem?.name;
        if (!operationName) throw new Error("No operation name returned in trigger response");

        return { task_id: operationName, scene_id: sceneId };
    });
}

async function triggerUpscale(env, accounts, mediaId) {
    return executeWithFailover(env, accounts, "UpscaleVideo", async (authData) => {
        const { access_token: token, auth_cookies: cookies, project_id: projectId } = authData;
        const sceneId = crypto.randomUUID();
        
        const payload = {
            "requests": [{
                "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
                "seed": Math.floor(Date.now() / 1000),
                "videoInput": { "mediaId": mediaId },
                "videoModelKey": "veo_2_1080p_upsampler_8s",
                "metadata": { "sceneId": sceneId }
            }],
            "clientContext": {
                "sessionId": ";" + Date.now(),
                "projectId": projectId,
                "tool": "PINHOLE",
                "userPaygateTier": "PAYGATE_TIER_TWO"
            }
        };

        const res = await fetch('https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoUpsampleVideo', {
            method: 'POST',
            headers: { 
                ...HEADERS, 
                'authorization': `Bearer ${token}`,
                'cookie': cookies || ''
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Upscale Trigger Failed (${res.status}): ${errText}`);
        }
        const data = await res.json();
        const opItem = data.operations?.[0];
        const operationName = opItem?.operation?.name || opItem?.name;
        if (!operationName) throw new Error("No operation name returned in upscale trigger response");
        
        return { task_id: operationName, scene_id: sceneId };
    });
}

async function checkStatus(env, accounts, task_id, scene_id) {
    return executeWithFailover(env, accounts, "CheckStatus", async (authData) => {
        const { access_token: token, auth_cookies: cookies } = authData;
        const payload = {
            "operations": [{
                "operation": { "name": task_id },
                "sceneId": scene_id,
                "status": "MEDIA_GENERATION_STATUS_ACTIVE"
            }]
        };

        const res = await fetch('https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus', {
            method: 'POST',
            headers: { 
                ...HEADERS, 
                'authorization': `Bearer ${token}`,
                'cookie': cookies || ''
            },
            body: JSON.stringify(payload)
        });

        if (res.status === 404 || res.status === 403 || res.status === 400) {
             throw new Error(`NotFound/Permission (${res.status}) - Try next account`);
        }

        if (!res.ok) throw new Error(`Check Status Failed (${res.status})`);

        const data = await res.json();
        const opResult = data.operations?.[0];
        
        if (!opResult) throw new Error("Operation not found in response - Try next account");

        const status = opResult.status;

        if (["MEDIA_GENERATION_STATUS_SUCCESSFUL", "MEDIA_GENERATION_STATUS_COMPLETED", "DONE"].includes(status)) {
            let vidUrl = opResult.operation?.metadata?.video?.fifeUrl || 
                         opResult.videoFiles?.[0]?.url || 
                         opResult.response?.videoUrl;

            let mediaId = opResult.response?.id || 
                          opResult.operation?.response?.id ||
                          opResult.mediaGenerationId;

            if (vidUrl) return { status: 'completed', video_url: vidUrl, mediaId: mediaId };
            return { status: 'failed', message: 'Video URL not found in response' };
        }

        if (status === "MEDIA_GENERATION_STATUS_FAILED") {
            return { status: 'failed', message: JSON.stringify(opResult) };
        }

        return { status: 'processing' };
    });
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

// --- PROXY VIDEO DOWNLOAD HELPER ---
async function handleProxyDownload(request) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Type' 
    };
    
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    try {
        let url;
        // Handle both POST and GET
        if (request.method === 'POST') {
            const body = await request.json();
            url = body.url;
        } else {
            const u = new URL(request.url);
            url = u.searchParams.get('url');
        }

        if (!url) return new Response("Missing URL", { status: 400, headers: corsHeaders });

        const response = await fetch(url);
        
        // Recreate headers to be mutable and ensure CORS is set
        const newHeaders = new Headers(response.headers);
        newHeaders.set('Access-Control-Allow-Origin', '*');
        newHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
        
        return new Response(response.body, {
            status: response.status,
            headers: newHeaders
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
}

export default {
    async fetch(request, env, ctx) {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const sendJson = (data, status = 200) => {
            return new Response(JSON.stringify(data), {
                status: status,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        };

        const url = new URL(request.url);
        const path = url.pathname;

        if (path.includes('/sepay-webhook')) return handleSePayWebhook(request, env);
        // ADDED: Route for Proxy Download
        if (path.includes('/proxy-download')) return handleProxyDownload(request);

        try {
            let body = {};
            try {
                if (request.method !== 'GET' && request.method !== 'HEAD') {
                    body = await request.json();
                }
            } catch (e) {}

            let action = body.action || '';

            if (!action) {
                if (path.includes('/gemini-proxy')) action = 'gemini_proxy';
                else if (path.includes('/auth')) action = 'auth';
                else if (path.includes('/upload')) action = 'upload';
                else if (path.includes('/create')) action = 'create';
                else if (path.includes('/upscale')) action = 'upscale';
                else if (path.includes('/check')) action = 'check';
                else if (path.includes('/update-token')) action = 'update_token';
            }

            if (action === 'gemini_proxy') {
                const { data, status } = await handleGeminiProxy(body, env, request);
                return sendJson(data, status); 
            }
            
            else if (action === 'auth') {
                return sendJson({ status: "connected", token: "managed-by-worker" });
            } 
            else if (action === 'upload') {
                const accounts = await getAllAccounts(env);
                // Extract imageAspectRatio from body, created by client
                const mediaId = await uploadImage(env, accounts, body.image, body.imageAspectRatio);
                return sendJson({ mediaId });
            }
            else if (action === 'create') {
                const accounts = await getAllAccounts(env);
                // Extract params including atomic image upload data
                const result = await triggerGeneration(
                    env, 
                    accounts, 
                    body.prompt, 
                    body.mediaId, 
                    body.videoAspectRatio,
                    body.image, // Atomic: Base64 data
                    body.imageAspectRatio // Atomic: Ratio Enum
                );
                return sendJson(result);
            }
            else if (action === 'upscale') {
                const accounts = await getAllAccounts(env);
                const result = await triggerUpscale(env, accounts, body.mediaId);
                return sendJson(result);
            }
            else if (action === 'check') {
                const accounts = await getAllAccounts(env);
                const result = await checkStatus(env, accounts, body.task_id, body.scene_id);
                return sendJson(result);
            }
            
            else if (action === 'update_token') {
                return sendJson({ status: "deprecated", message: "Bot should update Supabase video_accounts table directly." });
            }
            else {
                return sendJson({ 
                    status: "ok", 
                    message: "Cloudflare Worker is running (Quota Managed)", 
                    request_path: path,
                    detected_action: action || "none"
                }, 200);
            }

        } catch (error) {
            return sendJson({ 
                error: true, 
                message: error.message || String(error)
            }, 500);
        }
    }
};
