const ALLOWED_ORIGINS = new Set([
  "https://dzyd-create.github.io",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
]);
const FLUX_MODEL = "@cf/black-forest-labs/flux-2-klein-9b";

async function imageBlobFromInput(env, image) {
  if (/^data:image\//i.test(image)) {
    const match = image.match(/^data:(image\/[^;,]+);base64,(.+)$/i);
    if (!match) throw new Error("参考图片格式不受支持");
    const bytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0));
    return new Blob([bytes], { type: match[1] });
  }
  const sourceUrl = new URL(image);
  if (sourceUrl.hostname === "dzyd-seedream-api.dzyd-create.workers.dev" && sourceUrl.pathname.startsWith("/asset/")) {
    const stored = await env.ASSETS.getWithMetadata(decodeURIComponent(sourceUrl.pathname.slice(7)), "arrayBuffer");
    if (!stored.value) throw new Error("无法读取参考图片");
    return new Blob([stored.value], { type: stored.metadata?.type || "image/jpeg" });
  }
  const response = await fetch(image, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error("无法读取参考图片");
  return new Blob([await response.arrayBuffer()], { type: response.headers.get("Content-Type") || "image/jpeg" });
}

async function runFlux(env, prompt, options = {}) {
  const normalizeDimension = (value, fallback) => Math.max(256, Math.min(1920, Math.round((Number(value) || fallback) / 16) * 16));
  const form = new FormData();
  form.append("prompt", `Follow the user's instruction precisely. Preserve every unspecified subject, detail, color, layout and text. User instruction: ${prompt}`);
  form.append("width", String(normalizeDimension(options.width, 1024)));
  form.append("height", String(normalizeDimension(options.height, 1024)));
  form.append("guidance", "5");
  if (Number.isInteger(options.seed)) form.append("seed", String(options.seed));
  if (options.image) form.append("input_image_0", await imageBlobFromInput(env, options.image), "reference-image.jpg");
  const serialized = new Response(form);
  return env.AI.run(FLUX_MODEL, {
    multipart: {
      body: serialized.body,
      contentType: serialized.headers.get("content-type"),
    },
  });
}

function closestKolorsSize(width, height) {
  const candidates = [[1024, 1024], [960, 1280], [768, 1024], [720, 1440], [720, 1280], [1280, 960], [1024, 768], [1440, 720], [1280, 720]];
  const target = Math.max(0.25, Math.min(4, (Number(width) || 1024) / (Number(height) || 1024)));
  return candidates.reduce((best, current) => Math.abs(current[0] / current[1] - target) < Math.abs(best[0] / best[1] - target) ? current : best);
}

async function runSiliconFlow(env, prompt, options = {}) {
  if (!env.SILICONFLOW_API_KEY) throw new Error("备用生图服务尚未配置");
  const [width, height] = closestKolorsSize(options.width, options.height);
  const requestBody = {
    model: "Kwai-Kolors/Kolors",
    prompt: options.image
      ? `必须读取并以输入参考图片为基础进行图生图。保留参考图中未被要求修改的主体身份、构图、姿态、文字、颜色与细节，只执行用户明确要求的变化。用户要求：${prompt}`
      : prompt,
    image_size: `${width}x${height}`,
    num_inference_steps: 20,
    guidance_scale: 9,
    seed: options.seed,
  };
  if (options.image) requestBody.image = options.image;
  const response = await fetch("https://api.siliconflow.cn/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.SILICONFLOW_API_KEY}`,
      "Content-Type": "application/json",
      "X-Enable-Watermark": "1",
    },
    signal: AbortSignal.timeout(180_000),
    body: JSON.stringify(requestBody),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.message || result?.error?.message || "备用模型生成失败");
  const imageUrl = result?.images?.[0]?.url;
  if (!imageUrl) throw new Error("备用模型没有返回图片");
  return imageUrl;
}

function headers(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://dzyd-create.github.io",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password, X-File-Name, X-Asset-Category",
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
    if (url.pathname.startsWith("/workspace/") && request.method === "GET") {
      const name = decodeURIComponent(url.pathname.slice(11)).replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80);
      if (!name) return json({ error: "工作区名称无效" }, 400, origin);
      const value = await env.ASSETS.get(`workspace:${name}`, "json");
      return json({ value: value ?? null }, 200, origin);
    }
    if (url.pathname.startsWith("/workspace/") && request.method === "PUT") {
      const name = decodeURIComponent(url.pathname.slice(11)).replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80);
      if (!name) return json({ error: "工作区名称无效" }, 400, origin);
      const raw = await request.text();
      if (!raw || raw.length > 5_000_000) return json({ error: "工作区数据过大" }, 413, origin);
      let value;
      try { value = JSON.parse(raw); } catch { return json({ error: "工作区数据格式不正确" }, 400, origin); }
      await env.ASSETS.put(`workspace:${name}`, JSON.stringify(value));
      return json({ ok: true, updatedAt: new Date().toISOString() }, 200, origin);
    }
    if (url.pathname === "/assets" && request.method === "GET") {
      const assets = [];
      let cursor;
      do {
        const page = await env.ASSETS.list({ prefix: "asset:", cursor, limit: 1000 });
        assets.push(...page.keys.map((entry) => ({
          id: entry.name,
          name: entry.metadata?.name || "未命名图片",
          category: entry.metadata?.category || "assets",
          size: Number(entry.metadata?.size || 0),
          createdAt: entry.metadata?.createdAt || "",
          url: `${url.origin}/asset/${encodeURIComponent(entry.name)}`,
        })));
        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);
      assets.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      return json({ assets, usedBytes: assets.reduce((total, item) => total + item.size, 0), limitBytes: 800_000_000 }, 200, origin);
    }
    if (url.pathname.startsWith("/asset/") && request.method === "GET") {
      const key = decodeURIComponent(url.pathname.slice(7));
      const stored = await env.ASSETS.getWithMetadata(key, "arrayBuffer");
      if (!stored.value) return json({ error: "素材不存在" }, 404, origin);
      return new Response(stored.value, {
        headers: {
          ...headers(origin),
          "Content-Type": stored.metadata?.type || "image/jpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
    if (url.pathname === "/assets" && request.method === "POST") {
      if (!env.ASSET_ADMIN_PASSWORD || request.headers.get("X-Admin-Password") !== env.ASSET_ADMIN_PASSWORD) return json({ error: "管理员密码不正确" }, 401, origin);
      const body = await request.arrayBuffer();
      if (!body.byteLength || body.byteLength > 10_000_000) return json({ error: "单张图片必须小于 10 MB" }, 413, origin);
      const listing = await env.ASSETS.list({ prefix: "asset:", limit: 1000 });
      const usedBytes = listing.keys.reduce((total, entry) => total + Number(entry.metadata?.size || 0), 0);
      if (usedBytes + body.byteLength > 800_000_000) return json({ error: "素材库已达到 800 MB 免费容量上限" }, 507, origin);
      const name = decodeURIComponent(request.headers.get("X-File-Name") || "未命名图片").slice(0, 120);
      const category = request.headers.get("X-Asset-Category") === "live" ? "live" : "assets";
      const type = request.headers.get("Content-Type") || "image/jpeg";
      if (!type.startsWith("image/")) return json({ error: "只允许上传图片" }, 415, origin);
      const key = `asset:${Date.now()}:${crypto.randomUUID()}`;
      const metadata = { name, category, type, size: body.byteLength, createdAt: new Date().toISOString() };
      await env.ASSETS.put(key, body, { metadata });
      return json({ asset: { id: key, name, category, size: body.byteLength, createdAt: metadata.createdAt, url: `${url.origin}/asset/${encodeURIComponent(key)}` } }, 201, origin);
    }
    if (url.pathname.startsWith("/assets/") && request.method === "DELETE") {
      if (!env.ASSET_ADMIN_PASSWORD || request.headers.get("X-Admin-Password") !== env.ASSET_ADMIN_PASSWORD) return json({ error: "管理员密码不正确" }, 401, origin);
      await env.ASSETS.delete(decodeURIComponent(url.pathname.slice(8)));
      return json({ ok: true }, 200, origin);
    }
    if (url.pathname === "/edit" && request.method === "POST") {
      if (!ALLOWED_ORIGINS.has(origin)) return json({ error: "不允许的请求来源" }, 403, origin);
      const contentLength = Number(request.headers.get("Content-Length") || 0);
      if (contentLength > 8_000_000) return json({ error: "编辑请求内容过大" }, 413, origin);

      let input;
      try { input = await request.json(); } catch { return json({ error: "请求格式不正确" }, 400, origin); }
      const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
      const image = typeof input.image === "string" ? input.image.trim() : "";
      if (!prompt || prompt.length > 1200) return json({ error: "请输入 1—1200 字的编辑描述" }, 400, origin);
      if (!image || !/^(https?:\/\/|data:image\/)/i.test(image)) return json({ error: "待编辑图片无效" }, 400, origin);

      let binary;
      let type = "image/jpeg";
      let model = FLUX_MODEL;
      try {
        const result = await runFlux(env, prompt, { image, width: input.width, height: input.height });
        const editedImage = result?.image || "";
        if (!editedImage) throw new Error("模型没有返回编辑后的图片");
        binary = Uint8Array.from(atob(editedImage), (character) => character.charCodeAt(0));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/4006|3036|allocation|neurons|daily free|429/i.test(message)) return json({ error: message || "图片编辑失败" }, 502, origin);
        try {
          const fallbackUrl = await runSiliconFlow(env, prompt, { image, width: input.width, height: input.height });
          const fallbackResponse = await fetch(fallbackUrl, { signal: AbortSignal.timeout(60_000) });
          if (!fallbackResponse.ok) throw new Error("无法保存免费备用模型编辑的图片");
          binary = new Uint8Array(await fallbackResponse.arrayBuffer());
          type = fallbackResponse.headers.get("Content-Type") || "image/jpeg";
          model = "Kwai-Kolors/Kolors";
        } catch (fallbackError) {
          return json({ error: fallbackError instanceof Error ? fallbackError.message : "免费备用模型编辑失败" }, 502, origin);
        }
      }
      const key = `generated-edit:${Date.now()}:${crypto.randomUUID()}`;
      await env.ASSETS.put(key, binary, { metadata: { name: "AI 编辑图片", category: "generated", type, size: binary.byteLength, createdAt: new Date().toISOString() } });
      return json({ image: `${url.origin}/asset/${encodeURIComponent(key)}`, model }, 200, origin);
    }
    if (url.pathname !== "/generate" || request.method !== "POST") return json({ error: "Not found" }, 404, origin);
    if (!ALLOWED_ORIGINS.has(origin)) return json({ error: "不允许的请求来源" }, 403, origin);
    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > 20_000) return json({ error: "请求内容过大" }, 413, origin);

    let input;
    try { input = await request.json(); } catch { return json({ error: "请求格式不正确" }, 400, origin); }
    const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
    if (!prompt || prompt.length > 1200) return json({ error: "请输入 1—1200 字的创作描述" }, 400, origin);

    const generateOne = async (index) => {
      const seed = Math.floor(Date.now() / 1000) + index;
      let binary;
      let type = "image/jpeg";
      try {
        const result = await runFlux(env, prompt, { seed, width: input.width, height: input.height });
        if (!result?.image) throw new Error(`第 ${index + 1} 张图片生成失败`);
        binary = Uint8Array.from(atob(result.image), (character) => character.charCodeAt(0));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/4006|3036|allocation|neurons|daily free|429/i.test(message)) throw error;
        const fallbackUrl = await runSiliconFlow(env, prompt, { seed, width: input.width, height: input.height });
        const fallbackResponse = await fetch(fallbackUrl, { signal: AbortSignal.timeout(60_000) });
        if (!fallbackResponse.ok) throw new Error("无法保存备用模型生成的图片");
        binary = new Uint8Array(await fallbackResponse.arrayBuffer());
        type = fallbackResponse.headers.get("Content-Type") || "image/jpeg";
      }
      const key = `generated:${Date.now()}:${index}:${crypto.randomUUID()}`;
      await env.ASSETS.put(key, binary, {
        metadata: {
          name: `AI 生成图片 ${index + 1}`,
          category: "generated",
          type,
          size: binary.byteLength,
          createdAt: new Date().toISOString(),
        },
      });
      return `${url.origin}/asset/${encodeURIComponent(key)}`;
    };
    let images;
    try {
      images = (await Promise.all([0, 1, 2, 3].map(generateOne))).filter(Boolean);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "模型生成失败" }, 502, origin);
    }
    if (!images.length) return json({ error: "模型没有返回图片" }, 502, origin);
    return json({ images, model: FLUX_MODEL }, 200, origin);
  },
};
