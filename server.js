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
const LOGFILE = process.env.LOG_FILE || "aktivitas.log";
const LOG_MSG = process.env.LOG_MSG === "1"; // isi pesan ikut dicatat bila diaktifkan
function log(text) {
  const d = new Date(), p = x => String(x).padStart(2, "0");
  const line = `[${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}] ${text}`;
  console.log(line);
  fs.appendFile(LOGFILE, line + "\n", () => {});
}
// Tampilan gambar (ASCII) berwarna di Termux saat ada yang masuk
const { execFile } = require("child_process");
const ART = {
  MASUK:  { c: 32, title: "ADA YANG MASUK!",  face: ['(\\_/)', '(o.o)', 'c(")(")'] },
  DAFTAR: { c: 36, title: "AKUN BARU DIBUAT!", face: ['(\\_/)', '(^.^)', 'c(")(")'] },
  GAGAL:  { c: 31, title: "GAGAL MASUK (PIN SALAH)", face: ['(\\_/)', '(x.x)', 'c(")(")'] }
};
function banner(kind, user, ip, ua) {
  const a = ART[kind], t = new Date().toLocaleTimeString("id-ID");
  const rows = [
    a.face[0].padEnd(9) + a.title,
    a.face[1].padEnd(9) + "pengguna : " + user,
    a.face[2].padEnd(9) + "jam      : " + t,
    "         ip       : " + ip,
    "         perangkat: " + (ua || "-")
  ];
  const w = Math.max(...rows.map(r => r.length)) + 2, line = "═".repeat(w);
  const out = ["╔" + line + "╗", ...rows.map(r => "║ " + r.padEnd(w - 1) + "║"), "╚" + line + "╝"];
  console.log("\x07\n\x1b[1;" + a.c + "m" + out.join("\n") + "\x1b[0m\n");
  if (process.env.NOTIF !== "0") { // butuh aplikasi Termux:API, kalau tidak ada diabaikan
    execFile("termux-notification", ["--title", "GOchat: " + a.title, "--content", user + " dari " + ip], () => {});
    execFile("termux-vibrate", ["-d", "300"], () => {});
  }
}
const lastSeen = {};
const fails = {};
function tooMany(ip) {
  const n = Date.now(), f = (fails[ip] = (fails[ip] || []).filter(t => n - t < 60000));
  return f.length >= 10;
}

http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  const url = new URL(req.url, "http://x");
  const ip = req.headers["cf-connecting-ip"] || (req.headers["x-forwarded-for"] || "").split(",")[0] || req.socket.remoteAddress;
  const ua = String(req.headers["user-agent"] || "").slice(0, 60);

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
      log(`DAFTAR  ${u}  ip=${ip}  ${ua}`);
      banner("DAFTAR", u, ip, ua);
    } else if (!user || user.hash !== hash(String(pin), user.salt)) {
      fails[ip].push(Date.now());
      log(`GAGAL MASUK  ${u}  ip=${ip}`);
      banner("GAGAL", u, ip, ua);
      return send(res, 401, { error: "Nama pengguna atau PIN salah" });
    }
    const token = crypto.randomBytes(24).toString("hex");
    db.tokens[token] = u; save();
    if (url.pathname === "/login") { log(`MASUK   ${u}  ip=${ip}  ${ua}`); banner("MASUK", u, ip, ua); }
    return send(res, 200, { token, user: u });
  }

  const me = db.tokens[(req.headers.authorization || "").replace("Bearer ", "")];
  if (!me) return send(res, 401, { error: "Sesi habis, masuk lagi" });

  const now = Date.now();
  if (!lastSeen[me] || now - lastSeen[me] > 60000) log(`ONLINE  ${me}  ip=${ip}`);
  lastSeen[me] = now;

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
    log(`PESAN   ${me} -> ${to}` + (LOG_MSG ? `: ${t}` : ""));
    return send(res, 200, { msg });
  }
  send(res, 404, { error: "Tidak ditemukan" });
}).listen(PORT, () => console.log("GOchat server di port " + PORT));
