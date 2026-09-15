const ALLOWED_ORIGINS = new Set([
  "https://dzyd-create.github.io",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
]);

function headers(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://dzyd-create.github.io",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), { status, headers: headers(origin) });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
    if (url.pathname === "/health") return json({ ok: true }, 200, origin);
    if (url.pathname !== "/generate" || request.method !== "POST") return json({ error: "Not found" }, 404, origin);
    if (!ALLOWED_ORIGINS.has(origin)) return json({ error: "不允许的请求来源" }, 403, origin);
    if (!env.ARK_API_KEY) return json({ error: "服务端密钥未配置" }, 503, origin);
    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > 20_000) return json({ error: "请求内容过大" }, 413, origin);

    let input;
    try { input = await request.json(); } catch { return json({ error: "请求格式不正确" }, 400, origin); }
    const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
    if (!prompt || prompt.length > 1200) return json({ error: "请输入 1—1200 字的创作描述" }, 400, origin);

    const upstream = await fetch("https://ark.cn-beijing.volces.com/api/v3/images/generations", {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.ARK_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "doubao-seedream-5-0-260128",
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
    return json({ images, model: "doubao-seedream-5-0-260128" }, 200, origin);
  },
};
