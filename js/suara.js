/* FieldTech Direct — suara.js
 * Suara "Ada pesanan masuk" untuk Dispatcher (pesanan baru berstatus Pending) dan Teknisi (tugas baru ditugaskan).
 * Nada lonceng (audio/pesanan-masuk-chime.mp3) → ucapan Bahasa Indonesia (rekaman audio/ada-pesanan-masuk.mp3 bila ada,
 * jika tidak memakai suara mesin perangkat). Aturan autoplay browser ditangani: bila diblokir, suara diputar
 * pada ketukan pertama berikutnya. Pelanggan tidak mendengar suara ini. */
(function () {
  'use strict';
  const W = window, KEY = 'fd-suara'; // sengaja di luar LS agar preferensi tidak terhapus saat logout
  const Suara = W.Suara = { on: localStorage.getItem(KEY) !== '0', locked: false, pending: false, last: 0, custom: false, primed: false };
  const chime = new Audio('./audio/pesanan-masuk-chime.mp3'); chime.preload = 'auto';
  let rec = null, voice = null, keep = null, keepWanted = false, askedNotif = false;
  // Audio senyap berulang: selama alarm aktif, browser/Android tidak membekukan halaman saat aplikasi di-minimize
  function keepEl() {
    if (keep) return keep;
    const n = 8000, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf), wr = function (o, t) { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    wr(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); wr(8, 'WAVE'); wr(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); wr(36, 'data'); v.setUint32(40, n * 2, true);
    keep = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))); keep.loop = true; keep.volume = 0.01; keep.preload = 'auto';
    return keep;
  }
  function keepOn() { keepWanted = true; const k = keepEl(); if (k.paused) { const p = k.play(); if (p && p.catch) p.catch(function () { Suara.pending = true; }); } } // diblokir browser → ketukan berikutnya menyalakannya
  function keepOff() { keepWanted = false; if (keep) keep.pause(); }
  Suara.keepPlaying = function () { return !!keep && !keep.paused; };
  // Notifikasi sistem (ikut bunyi & getar dari HP/PC), diperbarui tiap siklus agar terus berbunyi
  function notifTugas(b) {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !Suara.on) return;
    const judul = 'Tugas baru #' + b.id, isi = (b.layanan || '') + (b.cust ? ' • ' + b.cust.nama : '') + (b.slot ? ' • ' + b.slot : '');
    const opt = { body: isi, tag: 'tugas-' + b.id, renotify: true, requireInteraction: true, vibrate: [300, 150, 300, 150, 300], icon: './icons/icon-192.png', badge: './icons/icon-192.png', data: { url: './index.html#/tugas/' + b.id } };
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
        navigator.serviceWorker.getRegistration().then(function (reg) { if (reg) return reg.showNotification(judul, opt); new Notification(judul, opt); }).catch(function () { try { new Notification(judul, opt); } catch (e) { } });
      } else new Notification(judul, opt);
    } catch (e) { }
  }
  function askNotif() { if (!('Notification' in window) || Notification.permission !== 'default') return; try { Notification.requestPermission(); } catch (e) { } }

  function pickVoice() { const vs = (W.speechSynthesis && speechSynthesis.getVoices()) || []; voice = vs.find(function (v) { return /^id[-_]/i.test(v.lang); }) || vs.find(function (v) { return /indonesia/i.test(v.name); }) || null; }
  if (W.speechSynthesis) { pickVoice(); if (speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', pickVoice); }
  fetch('./audio/ada-pesanan-masuk.mp3', { method: 'HEAD' }).then(function (r) { if (r.ok) { Suara.custom = true; rec = new Audio('./audio/ada-pesanan-masuk.mp3'); } }).catch(function () { });

  function speak() {
    if (Suara.custom && rec) { rec.currentTime = 0; const p = rec.play(); if (p && p.catch) p.catch(function () { }); return; }
    if (!W.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance('Ada pesanan masuk'); u.lang = 'id-ID'; u.rate = 0.95; u.volume = 1; if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  }
  // force = abaikan pengaturan senyap & jeda anti-dobel (dipakai uji suara & pemutaran tertunda)
  Suara.play = function (force) {
    if (!Suara.on && !force) return;
    const now = Date.now(); if (!force && now - Suara.last < 2500) return; Suara.last = now;
    let p; try { chime.currentTime = 0; p = chime.play(); } catch (e) { p = Promise.reject(e); }
    Promise.resolve(p).then(function () { Suara.locked = false; setTimeout(speak, 1100); }).catch(function () {
      if (!Suara.locked) { Suara.locked = true; toast('Ketuk layar sekali untuk mengaktifkan suara pesanan.', 'warn'); }
      Suara.pending = true;
    });
  };
  function onGesture() {
    if (keepWanted && keep && keep.paused) keep.play().catch(function () { });
    if (!askedNotif && S.me && S.me.role === 'Teknisi') { askedNotif = true; askNotif(); }
    if (Suara.pending) { Suara.pending = false; Suara.locked = false; Suara.play(true); return; }
    if (Suara.primed) return; Suara.primed = true; // buka kunci autoplay dengan memutar senyap sekali
    try { chime.volume = 0; const p = chime.play(); if (p && p.then) p.then(function () { chime.pause(); chime.currentTime = 0; chime.volume = 1; }).catch(function () { chime.volume = 1; Suara.primed = false; }); } catch (e) { chime.volume = 1; Suara.primed = false; }
  }
  ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) { W.addEventListener(ev, onGesture, { passive: true }); });

  // ---- tombol speaker (Dispatcher: bilah atas; Teknisi: header)
  function icon() { return ic(Suara.on ? 'volume' : 'mute', 20); }
  function btnHtml() { return '<button class="icon-btn snd' + (Suara.on ? '' : ' off') + '" id="btnSuara" aria-pressed="' + Suara.on + '" aria-label="Suara pesanan masuk: ' + (Suara.on ? 'aktif' : 'mati') + '" title="Suara pesanan masuk: ' + (Suara.on ? 'aktif' : 'mati') + ' (klik untuk ' + (Suara.on ? 'mematikan' : 'mengaktifkan') + ')">' + icon() + '</button>'; }
  Suara.set = function (v) {
    Suara.on = !!v; localStorage.setItem(KEY, v ? '1' : '0');
    const b = $('#btnSuara'); if (b) b.outerHTML = btnHtml(); bindBtn();
    if (v) { Suara.play(true); toast('Suara pesanan aktif. Anda akan mendengar "Ada pesanan masuk".', 'ok'); } else { if (W.speechSynthesis) speechSynthesis.cancel(); toast('Suara pesanan dimatikan.', 'info'); }
  };
  function bindBtn() { const b = $('#btnSuara'); if (b) b.onclick = function () { Suara.set(!Suara.on); }; }
  App.mountSoundBtn = function () {
    if ($('#btnSuara') || !S.me) return;
    const anchor = S.me.role === 'Admin' ? $('#btnBell') : $('.mbar .hav');
    if (anchor) anchor.insertAdjacentHTML('beforebegin', btnHtml()); bindBtn();
  };

  // ---- pemantau pesanan baru
  let wt = null, seen = null, run = false;
  const waitMs = function () { return Math.max(5, Number((S.cfg && S.cfg.Polling_Pesanan_Detik) || 20)) * 1000 * ((document.visibilityState === 'visible' || (S.me && S.me.role === 'Teknisi')) ? 1 : 2); };

  // ===== Dispatcher (Admin): perilaku TIDAK berubah
  function found(ids) {
    const id = ids[0];
    Suara.play();
    toast('Pesanan baru masuk #' + id + (ids.length > 1 ? ' (+' + (ids.length - 1) + ' lagi)' : ''), 'info', { label: 'Lihat', fn: function () { location.hash = '/papan/' + id; } });
    App.refresh().then(function () { if (App.badgeUpd) App.badgeUpd(); }).catch(function () { });
  }
  function handle(ids) {
    if (seen === null) { seen = {}; ids.forEach(function (i) { seen[i] = 1; }); return; } // data awal: tanpa suara
    const baru = ids.filter(function (i) { return !seen[i]; }); ids.forEach(function (i) { seen[i] = 1; });
    if (baru.length) found(baru);
  }

  // ===== Teknisi: bunyi berulang + pop-up sampai tugas dibuka
  const ALARM_MS = 7000, OPEN_KEY = 'fd-tugas-dibuka';
  const alarm = {}, pop = {}; let alarmT = null, siklus = 0;
  function opened() { try { return JSON.parse(localStorage.getItem(OPEN_KEY) || '[]'); } catch (e) { return []; } }
  function markOpened(id) { const a = opened(); if (a.indexOf(id) < 0) { a.push(id); while (a.length > 300) a.shift(); try { localStorage.setItem(OPEN_KEY, JSON.stringify(a)); } catch (e) { } } }
  function popupTugas(b) {
    if (pop[b.id]) return;
    const m = modal({ title: 'Tugas baru untuk Anda', noFocus: true, onClose: function () { delete pop[b.id]; },
      body: '<div class="tpop"><div class="tpop-ico">' + ic('wrench', 28) + '</div><b class="mono2">#' + esc(b.id) + '</b><p><b>' + esc(b.layanan) + '</b></p><small>' + esc(b.cust ? b.cust.nama : '') + ' • ' + esc(b.alamat) + '</small><small>' + hariLabel(b.tanggal) + ' • ' + esc(b.slot) + '</small><p class="muted sm">Suara akan terus berbunyi sampai tugas ini dibuka.</p></div>',
      actions: [{ label: 'Tutup sebentar', cls: 'ghost', fn: function (c) { c(); } }, { label: 'Buka Tugas Sekarang', cls: 'primary', fn: function (c) { c(); location.hash = '/tugas/' + b.id; } }] });
    pop[b.id] = m;
  }
  function ringLoop() {
    alarmT = null;
    if (!Object.keys(alarm).length) { keepOff(); return; }
    keepOn();
    if (Suara.on) Suara.play(true);
    Object.keys(alarm).forEach(function (id) { notifTugas(alarm[id]); });
    siklus++;
    if (siklus % 9 === 0) Object.keys(alarm).forEach(function (id) { if (!pop[id]) popupTugas(alarm[id]); }); // pop-up muncul lagi ±tiap menit
    alarmT = setTimeout(ringLoop, ALARM_MS);
  }
  function stopTugas(id) { delete alarm[id]; markOpened(id); if (pop[id]) pop[id].close(); if (!Object.keys(alarm).length) { if (alarmT) { clearTimeout(alarmT); alarmT = null; } siklus = 0; keepOff(); } }
  function stopSemua() { Object.keys(alarm).forEach(function (id) { delete alarm[id]; }); Object.keys(pop).forEach(function (id) { if (pop[id]) pop[id].close(); }); clearTimeout(alarmT); alarmT = null; siklus = 0; keepOff(); }
  function techSync(list) {
    const cur = /^#\/tugas\/([^\/?#]+)/.exec(location.hash || ''); if (cur) markOpened(decodeURIComponent(cur[1])); // sedang membuka tugas → dianggap sudah dilihat
    const dibuka = opened(), want = {}; // tugas hari ini atau yang akan datang, belum dibuka
    list.forEach(function (b) { if (b.status === 'Assigned' && String(b.tanggal) >= todayStr() && dibuka.indexOf(b.id) < 0) want[b.id] = b; });
    Object.keys(alarm).forEach(function (id) { if (!want[id]) { delete alarm[id]; if (pop[id]) pop[id].close(); } }); // sudah tidak ditugaskan / sudah dibuka
    let baru = false;
    Object.keys(want).forEach(function (id) { if (!alarm[id]) { alarm[id] = want[id]; baru = true; popupTugas(want[id]); } });
    if (baru && Router.cur === '/tugas' && !/#\/tugas\/.+/.test(location.hash) && !App.editing) Router.render(); // daftar tugas ikut diperbarui
    if (Object.keys(alarm).length && !alarmT) ringLoop();
    if (!Object.keys(alarm).length) { if (alarmT) { clearTimeout(alarmT); alarmT = null; } siklus = 0; keepOff(); }
  }
  W.addEventListener('hashchange', function () { // membuka detail tugas = berhenti berbunyi untuk tugas itu
    if (!S.me || S.me.role !== 'Teknisi') return;
    const m = /^#\/tugas\/([^\/?#]+)/.exec(location.hash || ''); if (m) stopTugas(decodeURIComponent(m[1]));
  });

  function tick() {
    clearTimeout(wt);
    if (!run || !S.token || !S.me) return;
    const role = S.me.role;
    (role === 'Admin' ? api('admin.antrean').then(function (r) { handle(r.pending); })
      : api('tugas.list').then(function (r) { if (!S.boot) return; S.boot.tugas = r.tugas; S.boot.tech = r.tech; App.persist(); techSync(r.tugas); }))
      .catch(function () { }).then(function () { if (run) wt = setTimeout(tick, waitMs()); });
  }
  App.watchNow = tick;
  App.startWatch = function () {
    App.stopWatch(); if (!S.me || (S.me.role !== 'Admin' && S.me.role !== 'Teknisi')) return;
    run = true; seen = null; App.mountSoundBtn(); tick();
  };
  App.stopWatch = function () { run = false; clearTimeout(wt); seen = null; stopSemua(); };
  document.addEventListener('visibilitychange', function () { if (run && document.visibilityState === 'visible') tick(); }); // kembali ke tab → cek seketika
  W.addEventListener('online', function () { if (run) tick(); });
})();
