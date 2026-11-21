// Team Roles Workshop – live results API (Cloudflare Worker + D1)
// Same API as the Google Apps Script version:
//   GET  ?action=init&key=…          – first call stores the instructor key
//   GET  ?action=list&key=…&k=class  – instructor reads answers of one class
//   GET  ?action=delete&key=…&k=class – instructor deletes all answers of one class
//   POST {k,d,n,t,code}              – student device saves/updates its answer
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};
const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });

let ready = false;
async function ensureSchema(db) {
  if (ready) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS responses (class TEXT NOT NULL, device TEXT NOT NULL, name TEXT, team TEXT, code TEXT NOT NULL, updated TEXT NOT NULL, PRIMARY KEY (class, device))"),
    db.prepare("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)"),
  ]);
  ready = true;
}
const clip = (v, n) => String(v ?? "").slice(0, n);

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const db = env.DB;
    if (!db) return json({ ok: false, error: "no-database-binding" }, 500);
    await ensureSchema(db);
    const url = new URL(req.url), p = url.searchParams;

    if (req.method === "POST") {
      let b;
      try { b = JSON.parse(await req.text()); } catch { return json({ ok: false, error: "bad-json" }, 400); }
      if (!b || !b.k || !b.d || typeof b.code !== "string" || !b.code.startsWith("HK1:") || b.code.length > 45000)
        return json({ ok: false, error: "bad-request" }, 400);
      await db.prepare(
        "INSERT INTO responses (class, device, name, team, code, updated) VALUES (?1, ?2, ?3, ?4, ?5, ?6) " +
        "ON CONFLICT(class, device) DO UPDATE SET name=excluded.name, team=excluded.team, code=excluded.code, updated=excluded.updated"
      ).bind(clip(b.k, 40), clip(b.d, 40), clip(b.n, 60), clip(b.t, 60), b.code, new Date().toISOString()).run();
      return json({ ok: true });
    }

    const action = p.get("action");
    if (action === "init") {
      const key = p.get("key") || "";
      if (key.length < 12) return json({ ok: false, error: "bad-key" });
      const cur = await db.prepare("SELECT v FROM meta WHERE k = 'key'").first();
      if (cur && cur.v !== key) return json({ ok: false, error: "already-initialized" });
      if (!cur) await db.prepare("INSERT OR IGNORE INTO meta (k, v) VALUES ('key', ?1)").bind(key).run();
      const now = await db.prepare("SELECT v FROM meta WHERE k = 'key'").first();
      return now && now.v === key ? json({ ok: true }) : json({ ok: false, error: "already-initialized" });
    }
    if (action === "delete") {
      const cur = await db.prepare("SELECT v FROM meta WHERE k = 'key'").first();
      if (!cur || p.get("key") !== cur.v) return json({ ok: false, error: "bad-key" }, 403);
      const k = p.get("k");
      if (!k) return json({ ok: false, error: "no-class" }, 400);
      const r = await db.prepare("DELETE FROM responses WHERE class = ?1").bind(k).run();
      return json({ ok: true, deleted: (r && r.meta && r.meta.changes) || 0 });
    }
    if (action === "list") {
      const cur = await db.prepare("SELECT v FROM meta WHERE k = 'key'").first();
      if (!cur || p.get("key") !== cur.v) return json({ ok: false, error: "bad-key" }, 403);
      const k = p.get("k");
      const sql = "SELECT updated AS at, class AS k, device AS d, code FROM responses" + (k ? " WHERE class = ?1" : "") + " ORDER BY updated";
      const r = k ? await db.prepare(sql).bind(k).all() : await db.prepare(sql).all();
      return json({ ok: true, rows: r.results || [] });
    }
    return json({ ok: true, app: "team-roles-workshop" });
  },
};
