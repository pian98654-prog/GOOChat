(function () {
  'use strict';
  var KEY = 'gochat-v1';
  var DUR = 5000;
  var COLORS = ['#0A8A4C', '#2457C5', '#B3361F', '#7A3FB0', '#9A6A00', '#1F2A44'];
  var TABS = [['chat', 'Chat', 'chat'], ['status', 'Status', 'status'], ['pengaturan', 'Pengaturan', 'sliders']];

  var REPLIES = {
    rani: ['Hehe, oke!', 'Nanti aku kabari lagi ya', 'Setuju banget', 'Yuk, ketemu di depan bioskop jam 6.30', 'Jangan lupa bawa jaket, AC-nya dingin'],
    bima: ['Sip, noted', 'Nanti malam aku cek lagi', 'Mantap, makasih ya', 'Oke, aman', 'Besok kita bahas sambil makan siang'],
    keluarga: ['Alhamdulillah, ditunggu ya', 'Jangan telat ya semuanya', 'Oke, dicatat', 'Nanti dibagi tugasnya di rumah'],
    dita: ['Siap, terima kasih!', 'Noted, nanti aku update di grup', 'Oke, aku tunggu sebelum jam 9', 'Sudah aku catat ya'],
    arif: ['Siap, Mas', 'Ditunggu di bengkel ya', 'Nggih, Mas. Hati-hati di jalan']
  };
  var GENERIC = ['Oke!', 'Siap', 'Terima kasih ya'];
  var GROUP_WHO = { keluarga: ['Ibu', 'Kak Dewi', 'Ayah'] };

  function $(s) { return document.querySelector(s); }
  function uid() { return Math.random().toString(36).slice(2, 9); }
  function rand(a, b) { return a + Math.random() * (b - a); }

  function h(tag, attrs) {
    var e = document.createElement(tag);
    var a = attrs || {};
    Object.keys(a).forEach(function (k) {
      var v = a[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'style') e.style.cssText = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) add(e, arguments[i]);
    return e;
  }
  function add(e, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(e, x); }); return; }
    e.append(c.nodeType ? c : document.createTextNode(String(c)));
  }

  function svg(inner, size, sw) {
    return '<svg width="' + (size || 22) + '" height="' + (size || 22) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.8) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
  }
  var ICON = {
    chat: '<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>',
    status: '<circle cx="12" cy="12" r="8.5" stroke-dasharray="3.4 2.6"/><circle cx="12" cy="12" r="2.8"/>',
    sliders: '<path d="M4 7h9M18 7h2M4 17h2M11 17h9"/><circle cx="15.5" cy="7" r="2.3"/><circle cx="8.5" cy="17" r="2.3"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    send: '<path d="M21 3L10.5 13.5"/><path d="M21 3l-7 18-3.5-7.5L3 10l18-7z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    pen: '<path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19l-4 1z"/>'
  };
  var TICK1 = svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 15, 2.2);
  var TICK2 = svg('<path d="M2 12.5l4.5 4.5L15 8"/><path d="M10 15.5l1.5 1.5L21 7.5"/>', 15, 2.2);

  /* ---------- time ---------- */
  var tf = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  var dfShort = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' });
  var dfLong = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  function dayStart(t) { var d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function dayDiff(t) { return Math.round((dayStart(Date.now()) - dayStart(t)) / 86400000); }
  function listTime(t) { var d = dayDiff(t); return d <= 0 ? tf.format(t) : d === 1 ? 'Kemarin' : dfShort.format(t); }
  function dayLabel(t) { var d = dayDiff(t); return d <= 0 ? 'Hari ini' : d === 1 ? 'Kemarin' : dfLong.format(t); }
  function statusTime(t) { var m = Math.round((Date.now() - t) / 60000); if (m < 1) return 'Baru saja'; if (m < 60) return m + ' menit lalu'; var hh = Math.floor(m / 60); return hh < 24 ? hh + ' jam lalu' : 'Kemarin'; }

  /* ---------- state ---------- */
  function M(from, text, t, who) { return { from: from, text: text, t: t, who: who || null, read: from === 'me' }; }
  function seed() {
    var n = Date.now(), m = 60000, hr = 3600000;
    return {
      profile: { name: 'Saya', about: 'Tersedia untuk chat' },
      settings: { theme: 'sistem', receipts: true, sound: false },
      chats: [
        { id: 'rani', name: 'Rani Putri', group: false, hue: 340, unread: 2, msgs: [
          M('them', 'Eh, jadi nonton Sabtu ini?', n - 3 * hr),
          M('me', 'Jadi dong. Mulai jam berapa?', n - 3 * hr + 2 * m),
          M('them', 'Jam 7 malam. Aku pesan tiketnya sekarang ya', n - 2 * hr - 50 * m),
          M('them', 'Kursinya di tengah, biar enak lihat layarnya', n - 2 * hr - 49 * m)] },
        { id: 'keluarga', name: 'Keluarga Besar', group: true, hue: 28, unread: 2, msgs: [
          M('them', 'Minggu depan kumpul di rumah ya, jangan ada yang absen', n - 5 * hr, 'Ibu'),
          M('them', 'Siap, Bu. Aku bawa kue', n - 4 * hr - 30 * m, 'Kak Dewi'),
          M('me', 'Aku bawa minuman. Es teh atau sirup?', n - 4 * hr),
          M('them', 'Dua-duanya boleh', n - 3 * hr - 50 * m, 'Ibu'),
          M('them', 'Ayah yang urus tikar dan kursi', n - 3 * hr - 45 * m, 'Ayah')] },
        { id: 'bima', name: 'Bima Pratama', group: false, hue: 210, unread: 0, msgs: [
          M('them', 'Bro, file desain yang kemarin sudah kamu kirim?', n - 22 * hr),
          M('me', 'Sudah, cek email ya', n - 22 * hr + 8 * m),
          M('them', 'Sip, makasih!', n - 22 * hr + 15 * m)] },
        { id: 'dita', name: 'Dita - Kantor', group: false, hue: 280, unread: 0, msgs: [
          M('them', 'Rapat besok dimajukan jadi jam 9', n - 20 * hr),
          M('me', 'Oke, aku siapkan slidenya malam ini', n - 19 * hr - 30 * m),
          M('them', 'Mantap. Kabari kalau ada yang kurang', n - 19 * hr)] },
        { id: 'arif', name: 'Pak Arif - Bengkel', group: false, hue: 24, unread: 0, msgs: [
          M('them', 'Motornya sudah selesai, Mas. Bisa diambil sore ini', n - 49 * hr),
          M('me', 'Siap Pak, saya ambil jam 5', n - 49 * hr + 10 * m)] }
      ],
      statuses: [
        { id: 'rani', name: 'Rani Putri', hue: 340, seen: false, items: [{ id: 's1', text: 'Akhir pekan nanti: film, popcorn, dan tidak ada tugas.', bg: COLORS[3], t: n - 40 * m }] },
        { id: 'bima', name: 'Bima Pratama', hue: 210, seen: false, items: [{ id: 's2', text: 'Kopi pertama hari ini. Semangat semuanya!', bg: COLORS[4], t: n - 2 * hr }] },
        { id: 'dita', name: 'Dita - Kantor', hue: 280, seen: false, items: [{ id: 's3', text: 'Deadline hari Jumat. Kita pasti bisa.', bg: COLORS[1], t: n - 6 * hr }] },
        { id: 'arif', name: 'Pak Arif - Bengkel', hue: 24, seen: true, items: [{ id: 's4', text: 'Bengkel tutup lebih awal hari Minggu.', bg: COLORS[5], t: n - 9 * hr }] }
      ],
      mine: []
    };
  }
  function load() {
    try {
      var r = localStorage.getItem(KEY);
      if (r) {
        var o = JSON.parse(r);
        if (o && o.chats && o.statuses && o.profile && o.settings) { if (!o.mine) o.mine = []; return o; }
      }
    } catch (e) {}
    return seed();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  var S = load();
  var tab = 'chat';
  var searchQ = '';
  var openId = null;
  var mode = null;
  var typing = {};
  var pending = {};
  var listEl = null;
  var panel = null;
  var statusTimer = null;
  var toastTimer = null;
  var audio = null;

  var main = $('#main'), tabsEl = $('#tabs'), overlay = $('#overlay'), toastEl = $('#toast');
  var root = document.documentElement;
  var hostTheme = root.getAttribute('data-theme');

  function applyTheme() {
    var t = S.settings.theme;
    if (t === 'terang') root.setAttribute('data-theme', 'light');
    else if (t === 'gelap') root.setAttribute('data-theme', 'dark');
    else if (hostTheme) root.setAttribute('data-theme', hostTheme);
    else root.removeAttribute('data-theme');
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2200);
  }
  function beep() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      var o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
      o.type = 'sine'; o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g); g.connect(audio.destination);
      o.start(t); o.stop(t + 0.27);
    } catch (e) {}
  }

  function initials(name) {
    var p = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '?';
    return (p[0][0] + (p.length > 1 ? p[1][0] : '')).toUpperCase();
  }
  function av(name, hue, cls) { return h('div', { class: 'av' + (cls ? ' ' + cls : ''), style: '--h:' + hue, 'aria-hidden': 'true' }, initials(name)); }
  function whoHue(w) { var s = 0; for (var i = 0; i < w.length; i++) s = (s * 31 + w.charCodeAt(i)) % 360; return s; }
  function chatById(id) { return S.chats.filter(function (c) { return c.id === id; })[0]; }
  function lastMsg(c) { return c.msgs[c.msgs.length - 1]; }
  function alive(items) { var lim = Date.now() - 86400000; return (items || []).filter(function (i) { return i.t > lim; }); }
  function latest(items) { return items.reduce(function (a, i) { return Math.max(a, i.t); }, 0); }

  /* ---------- tabs ---------- */
  function renderTabs() {
    var unread = S.chats.reduce(function (a, c) { return a + c.unread; }, 0);
    var unseen = S.statuses.some(function (o) { return !o.seen && alive(o.items).length; });
    tabsEl.replaceChildren.apply(tabsEl, TABS.map(function (t) {
      var cur = t[0] === tab;
      return h('a', { href: '#' + t[0], class: 'tab', 'aria-current': cur ? 'page' : null },
        h('span', { class: 'pill' },
          h('span', { html: svg(ICON[t[2]], 22, cur ? 2.1 : 1.8) }),
          t[0] === 'chat' && unread ? h('span', { class: 'badge pb', 'aria-label': unread + ' pesan belum dibaca' }, unread > 99 ? '99+' : unread) : null,
          t[0] === 'status' && unseen ? h('span', { class: 'dot', 'aria-label': 'Ada status baru' }) : null),
        h('span', null, t[1]));
    }));
  }
  function refresh() {
    renderTabs();
    if (tab === 'chat' && listEl) renderList();
  }
  function render() {
    listEl = null;
    var nodes = tab === 'chat' ? renderChatTab() : tab === 'status' ? renderStatusTab() : renderSettingsTab();
    main.replaceChildren.apply(main, nodes);
    renderTabs();
  }

  /* ---------- chat list ---------- */
  function renderChatTab() {
    listEl = h('div');
    var nodes = [
      h('div', { class: 'pagehead gutter' }, h('h1', null, 'Chat'), h('p', { class: 'sub' }, 'Kontak dan balasan di sini adalah contoh.')),
      h('div', { class: 'search gutter' },
        h('div', { class: 'sbox' },
          h('span', { class: 'sico', html: svg(ICON.search, 18) }),
          h('input', { id: 'chatsearch', type: 'search', placeholder: 'Cari chat', autocomplete: 'off', 'aria-label': 'Cari chat', value: searchQ,
            oninput: function (e) { searchQ = e.target.value; renderList(); } }))),
      listEl
    ];
    renderList();
    return nodes;
  }
  function renderList() {
    var q = searchQ.trim().toLowerCase();
    var items = S.chats.filter(function (c) { return c.name.toLowerCase().indexOf(q) !== -1; })
      .sort(function (a, b) { return lastMsg(b).t - lastMsg(a).t; });
    if (!items.length) {
      listEl.replaceChildren(h('p', { class: 'empty gutter' }, q ? 'Tidak ada chat dengan nama "' + searchQ.trim() + '".' : 'Belum ada chat.'));
      return;
    }
    listEl.replaceChildren.apply(listEl, items.map(function (c) {
      var m = lastMsg(c);
      var prefix = m.from === 'me' ? 'Kamu: ' : (c.group && m.who ? m.who + ': ' : '');
      var isTyping = typing[c.id];
      return h('button', { class: 'row gutter', onclick: function () { openChat(c.id); } },
        av(c.name, c.hue),
        h('div', { class: 'rbody' },
          h('div', { class: 'rline' }, h('span', { class: 'rname' }, c.name), h('span', { class: 'rtime' + (c.unread ? ' new' : '') }, listTime(m.t))),
          h('div', { class: 'rline' },
            h('span', { class: 'rprev' + (isTyping ? ' typing' : '') }, isTyping ? 'sedang mengetik…' : prefix + m.text),
            c.unread ? h('span', { class: 'badge', 'aria-label': c.unread + ' belum dibaca' }, c.unread) : null)));
    }));
  }

  /* ---------- conversation ---------- */
  function subText(c) {
    if (typing[c.id]) return 'sedang mengetik…';
    return c.group ? (GROUP_WHO[c.id] || []).concat(['Kamu']).join(', ') : 'online';
  }
  function updateSub(c) {
    if (!panel || panel.id !== c.id) return;
    panel.sub.textContent = subText(c);
    panel.sub.className = 'csub' + (typing[c.id] ? ' typing' : '');
  }
  function openChat(id) {
    var c = chatById(id);
    if (!c) return;
    stopStatus();
    c.unread = 0; openId = id; mode = 'chat'; save();
    var sub = h('div', { class: 'csub' }, subText(c));
    var msgsEl = h('div', { class: 'msgs gutter', id: 'msgs' });
    var input = h('textarea', { id: 'msginput', rows: '1', placeholder: 'Tulis pesan', 'aria-label': 'Tulis pesan', maxlength: '2000' });
    var sendBtn = h('button', { class: 'send', 'aria-label': 'Kirim', disabled: true, html: svg(ICON.send, 20, 2) });
    function autosize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; }
    function doSend() {
      var v = input.value.trim();
      if (!v) return;
      c.msgs.push({ from: 'me', text: v, t: Date.now(), who: null, read: false });
      input.value = ''; autosize(); sendBtn.disabled = true;
      save(); renderMsgs(); scheduleReply(c); refresh();
    }
    input.addEventListener('input', function () { autosize(); sendBtn.disabled = !input.value.trim(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); doSend(); }
    });
    sendBtn.addEventListener('click', doSend);
    panel = { id: id, sub: sub, msgsEl: msgsEl };
    overlay.setAttribute('aria-label', 'Percakapan dengan ' + c.name);
    overlay.replaceChildren(
      h('div', { class: 'ctop gutter' },
        h('button', { class: 'iconbtn', 'aria-label': 'Kembali', onclick: closeOverlay, html: svg(ICON.back, 22, 2) }),
        av(c.name, c.hue, 'sm'),
        h('div', { class: 'ctitle' }, h('div', { class: 'cname' }, c.name), sub)),
      msgsEl,
      h('div', { class: 'composer gutter' }, input, sendBtn));
    overlay.hidden = false;
    renderMsgs();
    refresh();
    if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) input.focus();
  }
  function renderMsgs() {
    if (!panel) return;
    var c = chatById(panel.id), el = panel.msgsEl, lastDay = null, nodes = [];
    c.msgs.forEach(function (m) {
      var d = dayStart(m.t);
      if (d !== lastDay) { lastDay = d; nodes.push(h('div', { class: 'day' }, dayLabel(m.t))); }
      var read = S.settings.receipts && m.read;
      nodes.push(h('div', { class: 'bub ' + (m.from === 'me' ? 'me' : 'them') },
        c.group && m.from === 'them' && m.who ? h('div', { class: 'who', style: 'color:hsl(' + whoHue(m.who) + ' 55% var(--who-l))' }, m.who) : null,
        h('div', { class: 'txt' }, m.text),
        h('div', { class: 'meta' }, tf.format(m.t),
          m.from === 'me' ? h('span', { class: 'tick' + (read ? ' read' : ''), 'aria-label': read ? 'Sudah dibaca' : 'Terkirim', html: read ? TICK2 : TICK1 }) : null)));
    });
    el.replaceChildren.apply(el, nodes);
    el.scrollTop = el.scrollHeight;
  }
  function scheduleReply(c) {
    if (pending[c.id]) return;
    pending[c.id] = true;
    var t1 = rand(700, 1200), t2 = t1 + rand(1400, 2600);
    setTimeout(function () { typing[c.id] = true; updateSub(c); refresh(); }, t1);
    setTimeout(function () {
      typing[c.id] = false; pending[c.id] = false;
      var pool = REPLIES[c.id] || GENERIC;
      var whos = GROUP_WHO[c.id];
      c.msgs.push({ from: 'them', text: pool[Math.floor(Math.random() * pool.length)], t: Date.now(), who: c.group && whos ? whos[Math.floor(Math.random() * whos.length)] : null, read: false });
      if (S.settings.receipts) c.msgs.forEach(function (m) { if (m.from === 'me') m.read = true; });
      if (openId === c.id && mode === 'chat') { renderMsgs(); updateSub(c); } else { c.unread++; }
      if (S.settings.sound) beep();
      save(); refresh();
    }, t2);
  }
  function closeOverlay() {
    stopStatus();
    overlay.hidden = true; overlay.replaceChildren();
    openId = null; mode = null; panel = null;
    if (tab === 'status') render(); else refresh();
  }

  /* ---------- status ---------- */
  function renderStatusTab() {
    var mineItems = alive(S.mine);
    var hasMine = mineItems.length > 0;
    var people = S.statuses.filter(function (o) { return alive(o.items).length; });
    var fresh = people.filter(function (o) { return !o.seen; }).sort(function (a, b) { return latest(alive(b.items)) - latest(alive(a.items)); });
    var seen = people.filter(function (o) { return o.seen; }).sort(function (a, b) { return latest(alive(b.items)) - latest(alive(a.items)); });

    function personRow(o) {
      var its = alive(o.items);
      return h('button', { class: 'row gutter', onclick: function () { openStatus(o.id); } },
        h('div', { class: 'ring' + (o.seen ? ' seen' : '') }, av(o.name, o.hue)),
        h('div', { class: 'rbody' }, h('span', { class: 'rname' }, o.name), h('span', { class: 'rprev' }, statusTime(latest(its)))));
    }
    var mineRow = h('div', { class: 'mine gutter' },
      h('button', { class: 'row', style: 'padding-inline:0', onclick: function () { hasMine ? openStatus('me') : openCompose(); } },
        h('div', { class: 'ring' + (hasMine ? '' : ' none') }, av(S.profile.name || 'Saya', 150),
          hasMine ? null : h('span', { class: 'plus', html: svg(ICON.plus, 14, 2.6) })),
        h('div', { class: 'rbody' }, h('span', { class: 'rname' }, 'Status saya'),
          h('span', { class: 'rprev' }, hasMine ? statusTime(latest(mineItems)) + ' · ' + mineItems.length + ' status' : 'Ketuk untuk menambah status'))),
      hasMine ? h('button', { class: 'iconbtn solid', 'aria-label': 'Tambah status', onclick: openCompose, html: svg(ICON.pen, 18, 2) }) : null);

    var nodes = [
      h('div', { class: 'pagehead gutter' }, h('h1', null, 'Status'), h('p', { class: 'sub' }, 'Status hilang otomatis setelah 24 jam.')),
      mineRow
    ];
    if (fresh.length) nodes.push(h('div', { class: 'label gutter' }, 'Terbaru'), h('div', null, fresh.map(personRow)));
    if (seen.length) nodes.push(h('div', { class: 'label gutter' }, 'Sudah dilihat'), h('div', null, seen.map(personRow)));
    if (!people.length) nodes.push(h('p', { class: 'empty gutter' }, 'Belum ada status dari kontak.'));
    return nodes;
  }
  function stopStatus() { clearTimeout(statusTimer); statusTimer = null; }

  function openStatus(who) {
    var isMine = who === 'me';
    var owner = isMine ? { name: S.profile.name || 'Saya', hue: 150, items: S.mine, seen: true }
      : S.statuses.filter(function (o) { return o.id === who; })[0];
    if (!owner) return;
    var items = alive(owner.items);
    if (!items.length) return;
    stopStatus();
    mode = 'status';
    var i = 0;
    var body = h('div', { class: 'svbody gutter' });
    var bars = h('div', { class: 'bars gutter' });
    var timeEl = h('span');
    var sv = h('div', { class: 'sv' });

    function show() {
      stopStatus();
      var it = items[i];
      sv.style.background = it.bg;
      bars.replaceChildren.apply(bars, items.map(function (_, k) {
        return h('div', { class: 'bar' }, h('div', { class: 'fill' + (k < i ? ' full' : '') }));
      }));
      var cur = bars.children[i].firstChild;
      void cur.offsetWidth;
      cur.classList.add('run');
      body.replaceChildren(h('div', { class: 'svtext' }, it.text));
      body.append(
        h('button', { class: 'zone l', 'aria-label': 'Sebelumnya', onclick: prev }),
        h('button', { class: 'zone r', 'aria-label': 'Berikutnya', onclick: next }));
      timeEl.textContent = statusTime(it.t);
      statusTimer = setTimeout(next, DUR);
    }
    function next() { if (i < items.length - 1) { i++; show(); } else finish(); }
    function prev() { if (i > 0) i--; show(); }
    function finish() { if (!isMine) owner.seen = true; save(); closeOverlay(); }
    function remove() {
      var it = items[i];
      S.mine = S.mine.filter(function (x) { return x.id !== it.id; });
      items = alive(S.mine); save();
      toast('Status dihapus');
      if (!items.length) { closeOverlay(); return; }
      if (i >= items.length) i = items.length - 1;
      show();
    }
    sv.append(
      bars,
      h('div', { class: 'svhead gutter' },
        av(owner.name, owner.hue, 'sm'),
        h('div', { class: 'who2' }, h('b', null, isMine ? 'Status saya' : owner.name), timeEl),
        isMine ? h('button', { class: 'txtbtn', onclick: remove }, 'Hapus') : null,
        h('button', { class: 'iconbtn', 'aria-label': 'Tutup', onclick: function () { if (!isMine) owner.seen = true; save(); closeOverlay(); }, html: svg(ICON.close, 22, 2) })),
      body);
    overlay.setAttribute('aria-label', 'Status ' + (isMine ? 'saya' : owner.name));
    overlay.replaceChildren(sv);
    overlay.hidden = false;
    show();
  }

  function openCompose() {
    stopStatus();
    mode = 'compose';
    var bg = COLORS[0];
    var sv = h('div', { class: 'sv compose' });
    var ta = h('textarea', { id: 'statustext', rows: '5', maxlength: '160', placeholder: 'Tulis status', 'aria-label': 'Isi status' });
    var count = h('div', { class: 'count' }, '0/160');
    var share = h('button', { class: 'txtbtn shareb', disabled: true }, 'Bagikan');
    var sws = COLORS.map(function (col, k) {
      return h('button', { class: 'sw-c', style: 'background:' + col, 'aria-label': 'Warna ' + (k + 1), 'aria-pressed': k === 0 ? 'true' : 'false',
        onclick: function () {
          bg = col; sv.style.background = col;
          Array.prototype.forEach.call(swEl.children, function (b, j) { b.setAttribute('aria-pressed', j === k ? 'true' : 'false'); });
        } });
    });
    var swEl = h('div', { class: 'swatches gutter' }, sws);
    sv.style.background = bg;
    ta.addEventListener('input', function () {
      count.textContent = ta.value.length + '/160';
      share.disabled = !ta.value.trim();
    });
    share.addEventListener('click', function () {
      var v = ta.value.trim();
      if (!v) return;
      S.mine.push({ id: uid(), text: v, bg: bg, t: Date.now() });
      save(); closeOverlay(); toast('Status dibagikan');
    });
    sv.append(
      h('div', { class: 'svhead gutter', style: 'padding-top:12px' },
        h('button', { class: 'iconbtn', 'aria-label': 'Batal', onclick: closeOverlay, html: svg(ICON.close, 22, 2) }),
        h('div', { class: 'who2' }, h('b', null, 'Status baru')),
        share),
      h('div', { class: 'svbody gutter' }, ta),
      count, swEl);
    overlay.setAttribute('aria-label', 'Buat status');
    overlay.replaceChildren(sv);
    overlay.hidden = false;
    ta.focus();
  }

  /* ---------- settings ---------- */
  var confirmReset = false;
  function renderSettingsTab() {
    var bigAv = null;
    function drawAv() {
      var n = av(S.profile.name || 'Saya', 150, 'lg');
      if (bigAv) bigAv.replaceWith(n);
      bigAv = n;
      return n;
    }
    drawAv();
    var nameIn = h('input', { id: 'profname', type: 'text', value: S.profile.name, maxlength: '40', autocomplete: 'off',
      oninput: function (e) { S.profile.name = e.target.value; save(); drawAv(); } });
    var aboutIn = h('input', { id: 'profabout', type: 'text', value: S.profile.about, maxlength: '80', autocomplete: 'off',
      oninput: function (e) { S.profile.about = e.target.value; save(); } });

    function themeBtn(v, label) {
      return h('button', { 'aria-pressed': S.settings.theme === v ? 'true' : 'false', onclick: function () { S.settings.theme = v; save(); applyTheme(); render(); } }, label);
    }
    function sw(key, title, desc) {
      var el = h('button', { class: 'sw', role: 'switch', 'aria-checked': S.settings[key] ? 'true' : 'false', 'aria-label': title,
        onclick: function () {
          S.settings[key] = !S.settings[key]; save();
          el.setAttribute('aria-checked', S.settings[key] ? 'true' : 'false');
          if (key === 'sound' && S.settings.sound) beep();
        } });
      return h('div', { class: 'setrow' }, h('div', { class: 't' }, h('b', null, title), h('span', null, desc)), el);
    }
    var resetBox = confirmReset
      ? h('div', { class: 'btnrow' },
          h('button', { class: 'btn danger', onclick: function () {
            var f = seed(); S.chats = f.chats; S.statuses = f.statuses; S.mine = []; typing = {}; pending = {};
            confirmReset = false; save(); toast('Data contoh dikembalikan'); render();
          } }, 'Ya, atur ulang'),
          h('button', { class: 'btn', onclick: function () { confirmReset = false; render(); } }, 'Batal'))
      : h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: function () { confirmReset = true; render(); } }, 'Atur ulang chat dan status'));

    return [
      h('div', { class: 'pagehead gutter' }, h('h1', null, 'Pengaturan')),
      h('div', { class: 'gutter' },
        h('div', { class: 'group pad profile' }, bigAv,
          h('div', { class: 'fields' },
            h('label', { class: 'fld', for: 'profname' }, 'Nama', nameIn),
            h('label', { class: 'fld', for: 'profabout' }, 'Info', aboutIn)))),
      h('div', { class: 'label gutter' }, 'Tampilan'),
      h('div', { class: 'gutter' }, h('div', { class: 'group' },
        h('div', { class: 'setrow' }, h('div', { class: 't' }, h('b', null, 'Tema')),
          h('div', { class: 'seg', role: 'group', 'aria-label': 'Tema' }, themeBtn('sistem', 'Otomatis'), themeBtn('terang', 'Terang'), themeBtn('gelap', 'Gelap'))))),
      h('div', { class: 'label gutter' }, 'Chat'),
      h('div', { class: 'gutter' }, h('div', { class: 'group' },
        sw('receipts', 'Tanda sudah dibaca', 'Centang ganda berwarna saat pesanmu dibaca.'),
        sw('sound', 'Suara pesan masuk', 'Bunyi singkat saat ada balasan.'))),
      h('div', { class: 'label gutter' }, 'Data'),
      h('div', { class: 'gutter' }, h('div', { class: 'group pad' }, resetBox)),
      h('p', { class: 'foot gutter' }, 'GOchat 1.0. Pesan, status, dan pengaturan tersimpan di browser ini saja.')
    ];
  }

  /* ---------- routing and keys ---------- */
  function route() {
    var n = location.hash.slice(1);
    var ok = TABS.some(function (t) { return t[0] === n; });
    var nt = ok ? n : 'chat';
    if (mode) { stopStatus(); overlay.hidden = true; overlay.replaceChildren(); openId = null; mode = null; panel = null; }
    if (nt !== tab || !main.firstChild) { tab = nt; main.scrollTop = 0; }
    render();
  }
  window.addEventListener('hashchange', route);
  document.addEventListener('keydown', function (e) {
    if (!mode) return;
    if (e.key === 'Escape') { closeOverlay(); return; }
    if (mode === 'status') {
      var z = overlay.querySelector(e.key === 'ArrowLeft' ? '.zone.l' : e.key === 'ArrowRight' ? '.zone.r' : null);
      if (z) z.click();
    }
  });

  applyTheme();
  route();
})();

/* Daftarkan service worker agar GOchat bisa dipasang dan dibuka offline */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  });
}
