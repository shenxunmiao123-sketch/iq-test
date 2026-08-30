/**
 * Cloudflare Worker 反代 —— 解决浏览器 CORS 跨域限制（含安全加固）
 *
 * 用法：
 * 1. 登录 Cloudflare Dashboard → Workers & Pages → 你的 Worker → Edit code
 * 2. 全选替换为本文件内容，确认下方两处配置（UPSTREAM / ALLOWED_ORIGIN_RULES）
 * 3. Deploy 部署
 *
 * 安全设计（方案一：让泄露的地址无害化）：
 * - 只放行 /v1/chat/completions 与 /v1/models，不能当通用代理用
 * - Origin 白名单：只有你自己的页面域名能调用，其他网站/嵌入页一律 403
 * - 内置频控：单 IP 每分钟 30 次、每天 1000 次（内存版，重启清零；如需更严可在
 *   Cloudflare 控制台另配 Rate Limiting 规则，两边可叠加）
 * - 不存储、不记录任何请求数据；密钥仅加密转发
 */
const UPSTREAM = "https://api.aimiroute.com";

/**
 * Origin 白名单（正则）。上线 GitHub Pages 后，建议把第一行改成你的确切地址，例如：
 *   /^https:\/\/shenxun1234\.github\.io$/
 * 最后一行 null 是本地双击打开 index.html（file://）时的 Origin，方便本地测试；
 * 正式上线后可以删除该行以收紧策略。
 */
const ALLOWED_ORIGIN_RULES = [
  /^https:\/\/[a-z0-9-]+\.github\.io$/i,
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
  /^null$/i,
];

/* 频控阈值：单 IP 每分钟 / 每天最大请求数 */
const RATE_PER_MINUTE = 30;
const RATE_PER_DAY = 1000;

/* ---------- 内置频控（内存版，Worker 重启后清零） ---------- */
const buckets = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const b = buckets.get(ip) || { minute: [], day: [] };
  b.minute = b.minute.filter((t) => now - t < 60000);
  b.day = b.day.filter((t) => now - t < 86400000);
  const limited = b.minute.length >= RATE_PER_MINUTE || b.day.length >= RATE_PER_DAY;
  if (!limited) {
    b.minute.push(now);
    b.day.push(now);
  }
  buckets.set(ip, b);
  if (buckets.size > 100000) buckets.clear(); // 防内存膨胀（极端情况下清零重来）
  return limited;
}

function originAllowed(request) {
  const origin = request.headers.get("Origin") || "";
  if (!origin) return true; // 非浏览器工具（curl 等）不带 Origin；响应无 CORS 头，浏览器用不了
  return ALLOWED_ORIGIN_RULES.some((re) => re.test(origin));
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    // 统一 CORS 头：仅对白名单 Origin 反射，其余一律不给跨域能力
    const corsHeaders = {
      "Access-Control-Allow-Origin": originAllowed(request) ? origin : "",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    };

    // 预检请求直接放行
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (!["GET", "POST"].includes(request.method)) {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    // 只放行聊天补全与模型列表接口，防止本 Worker 被当作通用代理滥用
    const allowed = [/^\/v1\/chat\/completions$/, /^\/v1\/models$/];
    if (!allowed.some((re) => re.test(url.pathname))) {
      return new Response(JSON.stringify({ error: "path not allowed" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Origin 校验：白名单外的浏览器来源直接 403（不转发上游，不消耗额度）
    if (origin && !originAllowed(request)) {
      return new Response(JSON.stringify({ error: "origin not allowed" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 频控
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (rateLimited(ip)) {
      return new Response(JSON.stringify({ error: "rate limited, please retry later" }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const upstreamUrl = UPSTREAM.replace(/\/+$/, "") + url.pathname + url.search;
    const upstreamReq = new Request(upstreamUrl, request);
    upstreamReq.headers.set("Host", new URL(UPSTREAM).host);

    let upstreamRes;
    try {
      upstreamRes = await fetch(upstreamReq);
    } catch (e) {
      return new Response(JSON.stringify({ error: "upstream fetch failed: " + e.message }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const headers = new Headers(upstreamRes);
    for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
    return new Response(upstreamRes.body, { status: upstreamRes.status, headers });
  },
};
