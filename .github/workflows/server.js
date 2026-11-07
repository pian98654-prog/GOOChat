// GOchat server – tanpa dependensi, cukup Node 18+
const http = require("http"), fs = require("fs"), crypto = require("crypto");
const FILE = process.env.DATA_FILE || "data.json";
const PORT = process.env.PORT || 3000;
let db = { users: {}, tokens: {}, msgs: [], next: 1 };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(FILE, "utf8"))); } catch (e) {}
let timer = null;
const save = () => { clearTimeout(timer); timer = setTimeout(() => fs.writeFile(FILE, JSON.stringify(db), () => {}), 400); };
const hash = (pin, salt) => crypto.scryptSync(pin, salt, 32).toString("hex");
const send = (res, code, obj) => {
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  });
  res.end(JSON.stringify(obj));
};
const body = req => new Promise(ok => {
  let d = ""; req.on("data", c => { d += c; if (d.length > 20000) req.destroy(); });
  req.on("end", () => { try { ok(JSON.parse(d || "{}")); } catch (e) { ok({}); } });
});
const fails = {};
function tooMany(ip) {
  const n = Date.now(), f = (fails[ip] = (fails[ip] || []).filter(t => n - t < 60000));
  return f.length >= 10;
}

http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  const url = new URL(req.url, "http://x");
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  if (url.pathname === "/") return send(res, 200, { ok: true, name: "GOchat server" });

  if ((url.pathname === "/register" || url.pathname === "/login") && req.method === "POST") {
    if (tooMany(ip)) return send(res, 429, { error: "Terlalu banyak percobaan. Tunggu semenit." });
    const { username, pin } = await body(req);
    const u = String(username || "").toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(u)) return send(res, 400, { error: "Nama pengguna 3-20 karakter: huruf kecil, angka, _" });
    if (String(pin || "").length < 4) return send(res, 400, { error: "PIN minimal 4 karakter" });
    let user = db.users[u];
    if (url.pathname === "/register") {
      if (user) return send(res, 409, { error: "Nama pengguna sudah dipakai" });
      const salt = crypto.randomBytes(8).toString("hex");
      user = db.users[u] = { salt, hash: hash(String(pin), salt) };
    } else if (!user || user.hash !== hash(String(pin), user.salt)) {
      fails[ip].push(Date.now());
      return send(res, 401, { error: "Nama pengguna atau PIN salah" });
    }
    const token = crypto.randomBytes(24).toString("hex");
    db.tokens[token] = u; save();
    return send(res, 200, { token, user: u });
  }

  const me = db.tokens[(req.headers.authorization || "").replace("Bearer ", "")];
  if (!me) return send(res, 401, { error: "Sesi habis, masuk lagi" });

  if (url.pathname === "/users") return send(res, 200, { users: Object.keys(db.users).filter(x => x !== me) });

  if (url.pathname === "/sync") {
    const since = parseInt(url.searchParams.get("since")) || 0;
    const msgs = db.msgs.filter(m => m.id > since && (m.from === me || m.to === me)).slice(0, 500);
    return send(res, 200, { msgs });
  }

  if (url.pathname === "/send" && req.method === "POST") {
    const { to, text } = await body(req);
    const t = String(text || "").trim().slice(0, 2000);
    if (!db.users[to]) return send(res, 404, { error: "Pengguna tidak ditemukan" });
    if (!t) return send(res, 400, { error: "Pesan kosong" });
    const msg = { id: db.next++, from: me, to, text: t, ts: Date.now() };
    db.msgs.push(msg); save();
    return send(res, 200, { msg });
  }
  send(res, 404, { error: "Tidak ditemukan" });
}).listen(PORT, () => console.log("GOchat server di port " + PORT));
