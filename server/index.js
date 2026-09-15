const ALLOWED_ORIGINS = new Set([
  "https://dzyd-create.github.io",
  "https://dianzhen-yuedong.chenyucan310.chatgpt.site",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
]);
const rateLimits = new Map();

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://dzyd-create.github.io",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(origin) },
  });
}

function isRateLimited(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const now = Date.now();
  const recent = (rateLimits.get(ip) || []).filter((time) => now - time < 60_000);
  if (recent.length >= 5) return true;
  recent.push(now);
  rateLimits.set(ip, recent);
  return false;
}

async function generate(request, env) {
  const origin = request.headers.get("Origin") || "";
  if (!ALLOWED_ORIGINS.has(origin)) return json({ error: "不允许的请求来源" }, 403, origin);
  if (!env.ARK_API_KEY) return json({ error: "服务端尚未配置 ARK_API_KEY" }, 503, origin);
  if (isRateLimited(request)) return json({ error: "请求过于频繁，请一分钟后再试" }, 429, origin);
  let input;
  try { input = await request.json(); } catch { return json({ error: "请求格式不正确" }, 400, origin); }
  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  if (!prompt || prompt.length > 1200) return json({ error: "请输入 1—1200 字的创作描述" }, 400, origin);

  const upstream = await fetch("https://ark.cn-beijing.volces.com/api/v3/images/generations", {
    method: "POST",
    headers: { "Authorization": `Bearer ${env.ARK_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env.SEEDREAM_MODEL || "doubao-seedream-5-0-260128",
      prompt,
      size: input.size || "2K",
      response_format: "url",
      watermark: false,
      sequential_image_generation: "auto",
      sequential_image_generation_options: { max_images: 4 },
    }),
  });
  const result = await upstream.json().catch(() => ({}));
  if (!upstream.ok) return json({ error: result?.error?.message || result?.message || "模型生成失败" }, upstream.status, origin);
  const images = Array.isArray(result.data) ? result.data.map((item) => item?.url).filter(Boolean).slice(0, 4) : [];
  if (!images.length) return json({ error: "模型没有返回图片" }, 502, origin);
  return json({ images, model: env.SEEDREAM_MODEL || "doubao-seedream-5-0-260128" }, 200, origin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    if (url.pathname === "/api/generate" && request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (url.pathname === "/api/generate" && request.method === "POST") return generate(request, env);
    if (url.pathname === "/api/health") return json({ ok: true }, 200, origin);
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;
    url.pathname = "/index.html";
    return env.ASSETS.fetch(new Request(url, request));
  },
};
