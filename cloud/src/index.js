// NAIL PANIC! 最後一槌 — 遊戲網站＋全球排行榜（Cloudflare Workers + D1）
//
// 靜態檔（dist/）由 Workers Static Assets 直接回應，不經過這支程式；
// 只有 /api/* 會進來：
//   GET  /api/top?mode=main|boss&limit=10&pid=…  → 前幾名（標出自己那筆）
//   POST /api/submit {mode,pid,name,score,note,day|wave} → 寫入（每台裝置每個模式只留最佳分）並回傳名次
//
// 分數是玩家那端算的，伺服器無法證明是真的；這裡只擋明顯不合理的值、髒字、洗版。

const MODES = {
  main: {unit: "day", max: (n) => 25000 * n + 10000, cap: 365},
  boss: {unit: "wave", max: (n) => 3200 * n + 1000, cap: 999},
};
const NAME_MAX = 12, NOTE_MAX = 24;
const SAME_PID_COOLDOWN = 10_000;   // 同一台裝置 10 秒內只能送一次
const IP_WINDOW = 60_000, IP_LIMIT = 12;  // 同一個 IP 每分鐘最多 12 次
const BANNED = ["幹你", "操你", "肏", "雞掰", "機掰", "雞巴", "王八蛋", "智障", "腦殘", "去死", "賤人", "婊",
  "fuck", "shit", "bitch", "cunt", "nigg", "fag", "dick", "pussy", "http", "www.", ".com", ".tw", "@"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: {"content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...CORS},
});

export function cleanName(raw) {
  let s = String(raw ?? "").normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, "")
    .replace(/[<>"'`\\]/g, "").replace(/\s+/g, " ").trim();
  s = Array.from(s).slice(0, NAME_MAX).join("");
  const low = s.toLowerCase().replace(/\s/g, "");
  if (!s || BANNED.some((w) => low.includes(w))) return null;
  return s;
}
const cleanNote = (raw) => Array.from(String(raw ?? "").replace(/[\u0000-\u001f<>"'`\\]/g, "").trim()).slice(0, NOTE_MAX).join("");

async function ipKey(req) {
  const ip = req.headers.get("cf-connecting-ip") || "local";
  const day = new Date().toISOString().slice(0, 10);   // 每天換鹽，不留可還原的 IP
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip + "|" + day));
  return Array.from(new Uint8Array(buf).slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function top(env, url) {
  const mode = url.searchParams.get("mode");
  if (!MODES[mode]) return json({error: "bad mode"}, 400);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit"), 10) || 10));
  const pid = (url.searchParams.get("pid") || "").slice(0, 40);
  const {results} = await env.DB.prepare(
    "SELECT name, score, note, pid = ?2 AS me FROM scores WHERE mode = ?1 ORDER BY score DESC, updated ASC LIMIT ?3"
  ).bind(mode, pid, limit).all();
  const total = (await env.DB.prepare("SELECT COUNT(*) AS n FROM scores WHERE mode = ?").bind(mode).first()).n;
  let mine = null;
  if (pid) {
    const row = await env.DB.prepare("SELECT score, updated FROM scores WHERE mode = ? AND pid = ?").bind(mode, pid).first();
    if (row) mine = {best: row.score, rank: await rankOf(env, mode, row.score, row.updated)};
  }
  return json({ok: true, mode, total, list: results.map((r, i) => ({rank: i + 1, name: r.name, score: r.score, note: r.note, me: !!r.me})), mine});
}

const rankOf = async (env, mode, score, updated) => (await env.DB.prepare(
  "SELECT COUNT(*) + 1 AS r FROM scores WHERE mode = ? AND (score > ? OR (score = ? AND updated < ?))"
).bind(mode, score, score, updated).first()).r;

async function submit(env, req) {
  let b;
  try { b = await req.json(); } catch { return json({error: "bad json"}, 400); }
  const m = MODES[b?.mode];
  if (!m) return json({error: "bad mode"}, 400);
  const pid = String(b.pid || "");
  if (!/^[a-z0-9]{12,40}$/.test(pid)) return json({error: "bad pid"}, 400);
  const n = Number(b[m.unit]), score = Number(b.score);
  if (!Number.isInteger(n) || n < 1 || n > m.cap) return json({error: "bad " + m.unit}, 400);
  if (!Number.isInteger(score) || score < 0 || score > m.max(n)) return json({error: "score rejected"}, 422);
  const name = cleanName(b.name);
  if (!name) return json({error: "name rejected"}, 422);
  const note = cleanNote(b.note);
  const now = Date.now();

  // 洗版限制：同一台裝置、同一個 IP
  const prev = await env.DB.prepare("SELECT score, updated FROM scores WHERE mode = ? AND pid = ?").bind(b.mode, pid).first();
  if (prev && now - prev.updated < SAME_PID_COOLDOWN) return json({error: "too fast"}, 429);
  const ip = await ipKey(req);
  const hits = (await env.DB.prepare("SELECT COUNT(*) AS n FROM hits WHERE ip = ? AND at > ?").bind(ip, now - IP_WINDOW).first()).n;
  if (hits >= IP_LIMIT) return json({error: "too fast"}, 429);

  await env.DB.batch([
    env.DB.prepare("INSERT INTO hits (ip, at) VALUES (?, ?)").bind(ip, now),
    env.DB.prepare("DELETE FROM hits WHERE at < ?").bind(now - 3_600_000),
    // 每台裝置每個模式只留最佳分；名字一律更新成最新的
    env.DB.prepare(
      `INSERT INTO scores (mode, pid, name, score, note, updated) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT (mode, pid) DO UPDATE SET
         name = excluded.name,
         note = CASE WHEN excluded.score > scores.score THEN excluded.note ELSE scores.note END,
         updated = CASE WHEN excluded.score > scores.score THEN excluded.updated ELSE scores.updated END,
         score = MAX(scores.score, excluded.score)`
    ).bind(b.mode, pid, name, score, note, now),
  ]);
  const row = await env.DB.prepare("SELECT score, updated FROM scores WHERE mode = ? AND pid = ?").bind(b.mode, pid).first();
  const total = (await env.DB.prepare("SELECT COUNT(*) AS n FROM scores WHERE mode = ?").bind(b.mode).first()).n;
  return json({ok: true, name, best: row.score, improved: !prev || score > prev.score, rank: await rankOf(env, b.mode, row.score, row.updated), total});
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    if (req.method === "OPTIONS") return new Response(null, {status: 204, headers: CORS});
    try {
      if (url.pathname === "/api/top" && req.method === "GET") return await top(env, url);
      if (url.pathname === "/api/submit" && req.method === "POST") return await submit(env, req);
      if (url.pathname === "/api/ping") return json({ok: true});
      return json({error: "not found"}, 404);
    } catch (e) {
      console.error(e);
      return json({error: "server"}, 500);
    }
  },
};
