const ALLOWED_ORIGINS = new Set([
  "https://dzyd-create.github.io",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
]);

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
      if (!env.ARK_API_KEY) return json({ error: "服务端密钥未配置" }, 503, origin);
      const contentLength = Number(request.headers.get("Content-Length") || 0);
      if (contentLength > 8_000_000) return json({ error: "编辑请求内容过大" }, 413, origin);

      let input;
      try { input = await request.json(); } catch { return json({ error: "请求格式不正确" }, 400, origin); }
      const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
      const image = typeof input.image === "string" ? input.image.trim() : "";
      if (!prompt || prompt.length > 1200) return json({ error: "请输入 1—1200 字的编辑描述" }, 400, origin);
      if (!image || !/^(https?:\/\/|data:image\/)/i.test(image)) return json({ error: "待编辑图片无效" }, 400, origin);

      let editedImage;
      try {
        const upstream = await fetch("https://ark.cn-beijing.volces.com/api/v3/images/generations", {
          method: "POST",
          headers: { "Authorization": `Bearer ${env.ARK_API_KEY}`, "Content-Type": "application/json" },
          signal: AbortSignal.timeout(180_000),
          body: JSON.stringify({
            model: "doubao-seedream-5-0-260128",
            prompt,
            image,
            size: input.size || "2K",
            response_format: "url",
            watermark: false,
            sequential_image_generation: "disabled",
          }),
        });
        const result = await upstream.json().catch(() => ({}));
        if (!upstream.ok) throw new Error(result?.error?.message || result?.message || "图片编辑失败");
        editedImage = result?.data?.[0]?.url || "";
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : "图片编辑失败" }, 502, origin);
      }
      if (!editedImage) return json({ error: "模型没有返回编辑后的图片" }, 502, origin);

      let permanentImage = editedImage;
      try {
        const imageResponse = await fetch(editedImage, { signal: AbortSignal.timeout(60_000) });
        if (imageResponse.ok) {
          const body = await imageResponse.arrayBuffer();
          if (body.byteLength && body.byteLength <= 25_000_000) {
            const type = imageResponse.headers.get("Content-Type") || "image/jpeg";
            const key = `generated-edit:${Date.now()}:${crypto.randomUUID()}`;
            await env.ASSETS.put(key, body, { metadata: { name: "AI 编辑图片", category: "generated", type, size: body.byteLength, createdAt: new Date().toISOString() } });
            permanentImage = `${url.origin}/asset/${encodeURIComponent(key)}`;
          }
        }
      } catch {}
      return json({ image: permanentImage, model: "doubao-seedream-5-0-260128" }, 200, origin);
    }
    if (url.pathname !== "/generate" || request.method !== "POST") return json({ error: "Not found" }, 404, origin);
    if (!ALLOWED_ORIGINS.has(origin)) return json({ error: "不允许的请求来源" }, 403, origin);
    if (!env.ARK_API_KEY) return json({ error: "服务端密钥未配置" }, 503, origin);
    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > 20_000) return json({ error: "请求内容过大" }, 413, origin);

    let input;
    try { input = await request.json(); } catch { return json({ error: "请求格式不正确" }, 400, origin); }
    const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
    if (!prompt || prompt.length > 1200) return json({ error: "请输入 1—1200 字的创作描述" }, 400, origin);

    const generateOne = async (index) => {
      const upstream = await fetch("https://ark.cn-beijing.volces.com/api/v3/images/generations", {
        method: "POST",
        headers: { "Authorization": `Bearer ${env.ARK_API_KEY}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(180_000),
        body: JSON.stringify({
          model: "doubao-seedream-5-0-260128",
          prompt,
          size: input.size || "2K",
          response_format: "url",
          watermark: false,
          seed: Math.floor(Date.now() / 1000) + index,
          sequential_image_generation: "disabled",
        }),
      });
      const result = await upstream.json().catch(() => ({}));
      if (!upstream.ok) throw new Error(result?.error?.message || result?.message || `第 ${index + 1} 张图片生成失败`);
      return result?.data?.[0]?.url || null;
    };
    let images;
    try {
      images = (await Promise.all([0, 1, 2, 3].map(generateOne))).filter(Boolean);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "模型生成失败" }, 502, origin);
    }
    if (!images.length) return json({ error: "模型没有返回图片" }, 502, origin);
    const permanentImages = await Promise.all(images.map(async (imageUrl, index) => {
      try {
        const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) });
        if (!imageResponse.ok) return imageUrl;
        const body = await imageResponse.arrayBuffer();
        if (!body.byteLength || body.byteLength > 25_000_000) return imageUrl;
        const type = imageResponse.headers.get("Content-Type") || "image/jpeg";
        const key = `generated:${Date.now()}:${index}:${crypto.randomUUID()}`;
        await env.ASSETS.put(key, body, { metadata: { name: `AI 生成图片 ${index + 1}`, category: "generated", type, size: body.byteLength, createdAt: new Date().toISOString() } });
        return `${url.origin}/asset/${encodeURIComponent(key)}`;
      } catch { return imageUrl; }
    }));
    return json({ images: permanentImages, model: "doubao-seedream-5-0-260128" }, 200, origin);
  },
};
