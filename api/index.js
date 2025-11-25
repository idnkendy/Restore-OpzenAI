
export default async function handler(request, response) {
    // Set CORS headers
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return;
    }

    const { url } = request;
    const body = request.body || {};

    // --- CONFIGURATION ---
    const HEADERS = {
        'accept': '*/*',
        'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImtlbmR5IiwiYXVkIjoiaHR0cHM6Ly9jb2luMTQubmV0IiwiaXNzIjoiY29pbjE0LWF1dGgiLCJpYXQiOjE3NjM2NDE3ODcsImV4cCI6MTc2NDI0NjU4N30.gbOb2JARNjZrBKYPfLCnT4tXeYlt9K1yj4p0Ixfgk7o',
        'content-type': 'application/json',
        'origin': 'https://promptmarketcap.net',
        'referer': 'https://promptmarketcap.net/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
        'Cookie': 'session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImtlbmR5IiwiYXVkIjoiaHR0cHM6Ly9jb2luMTQubmV0IiwiaXNzIjoiY29pbjE0LWF1dGgiLCJpYXQiOjE3NjM2NDE3ODcsImV4cCI6MTc2NDI0NjU4N30.gbOb2JARNjZrBKYPfLCnT4tXeYlt9K1yj4p0Ixfgk7o; _ga=GA1.1.959723901.1763641764'
    };
    const URL_UPLOAD = 'https://promptmarketcap.net/api/veo3/upload-image';
    const URL_AGENT = 'https://flow.coin14.net/webhook/ai-agent';
    const PROJECT_ID = 'b8f8c699-65bc-4afd-b9ca-780f54dbc50c';

    try {
        // --- 1. TRIGGER ENDPOINT ---
        if (url.includes('trigger')) {
            const { prompt, image } = body;
            if (!prompt) return response.status(400).json({ message: 'Missing prompt' });

            let media_id = null;
            
            // Upload Image if provided
            if (image) {
                 // FIX: Strip "data:image/xyz;base64," prefix if present
                 let cleanBase64 = image;
                 if (image.includes(',')) {
                     cleanBase64 = image.split(',')[1];
                 }

                 const payload = {
                    'rowId': 1,
                    'base64Image': cleanBase64, 
                    'type': 'start'
                 };
                 
                 console.log("Uploading image...");
                 const upRes = await fetch(URL_UPLOAD, {
                     method: 'POST',
                     headers: HEADERS,
                     body: JSON.stringify(payload)
                 });
                 
                 if (!upRes.ok) {
                     const errText = await upRes.text();
                     console.error("Upload Error Body:", errText);
                     throw new Error(`Upload failed (${upRes.status}): ${errText.substring(0, 200)}`);
                 }
                 
                 const upData = await upRes.json();
                 media_id = upData.mediaId || upData.id;
                 console.log("Image uploaded, ID:", media_id);
            }

            // Send Video Generation Trigger
            const params = new URLSearchParams({
                'project': PROJECT_ID,
                'action': 'video',
                'service': 'veo3',
                'query': 'video',
                'status': 'new',
                'model': 'veo3_1-fast-image',
                'ratio': 'landscape_16_9'
            });

            const videoObj = { 'id': '1', 'prompt': prompt, 'number': '1', 'frame': '1' };
            if (media_id) videoObj['startMediaId'] = media_id;
            
            const json_data = [{'videos': [videoObj]}];

            console.log("Triggering video generation...");
            const triggerRes = await fetch(`${URL_AGENT}?${params}`, {
                method: 'POST',
                headers: HEADERS,
                body: JSON.stringify(json_data)
            });

            if (!triggerRes.ok) {
                 const errText = await triggerRes.text();
                 console.error("Trigger Error Body:", errText);
                 throw new Error(`Trigger failed (${triggerRes.status}): ${errText.substring(0, 200)}`);
            }
            
            const triggerData = await triggerRes.json();
            const opItem = triggerData[0]?.operations?.[0];
            
            if (!opItem) {
                console.error("Invalid Trigger Data:", JSON.stringify(triggerData));
                throw new Error("Invalid trigger response structure from Agent");
            }
            
            return response.status(200).json({
                task_id: opItem.operation.name,
                scene_id: opItem.sceneId
            });
        }

        // --- 2. CHECK ENDPOINT ---
        if (url.includes('check')) {
            const { task_id, scene_id } = body;
            if (!task_id) return response.status(400).json({ message: 'Missing task_id' });

            const params = new URLSearchParams({
                'project': PROJECT_ID,
                'action': 'video',
                'service': 'veo3',
                'query': 'video',
                'status': 'check'
            });

            const final_scene_id = scene_id || '6d2056e9-f929-4f13-bb25-6e5a49a7fbcc';
            const json_data = [{
                'videos': [{
                    'id': '1',
                    'query': [{
                        'id': '1', 'operation': {'name': task_id}, 'sceneId': final_scene_id 
                    }]
                }]
            }];

            const checkRes = await fetch(`${URL_AGENT}?${params}`, {
                method: 'POST',
                headers: HEADERS,
                body: JSON.stringify(json_data)
            });

            if (!checkRes.ok) {
                const errText = await checkRes.text();
                throw new Error(`Check status failed: ${checkRes.status} - ${errText.substring(0, 100)}`);
            }
            
            const checkData = await checkRes.json();
            const opItem = checkData[0]?.operations?.[0];
            
            if (!opItem) {
                 // If operation not found, it might be waiting
                 return response.status(200).json({ status: 'waiting' });
            }

            const status = opItem.status;
            // Try different keys for the video URL
            const videoUrl = opItem.video_url || opItem.url || opItem.resultUrl;

            if (videoUrl && videoUrl.includes('http')) {
                return response.status(200).json({ status: 'completed', video_url: videoUrl });
            } else if (status && status.includes('FAILED')) {
                return response.status(200).json({ status: 'failed', message: 'Generation failed on provider side' });
            } else {
                return response.status(200).json({ status: 'processing' });
            }
        }

        return response.status(404).json({ message: 'Route not found' });

    } catch (error) {
        console.error("Proxy API Error:", error);
        return response.status(500).json({ 
            status: 'error',
            message: error.message || 'Internal Server Error' 
        });
    }
}
