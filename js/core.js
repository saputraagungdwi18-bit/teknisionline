/* FieldTech Direct — core.js
 * API (POST text/plain → bebas CORS preflight), cache stale-while-revalidate, batcher,
 * router hash, polling adaptif, helper UI, loader peta, kompresi foto. Vanilla JS. */
(function () {
  'use strict';
  const W = window;
  W.$ = function (s, r) { return (r || document).querySelector(s); };
  W.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  W.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  // ---------------------------------------------------------------- Ikon (garis, gaya Lucide)
  const P = {
    check: '<path d="M20 6 9 17l-5-5"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>', right: '<path d="m9 18 6-6-6-6"/>', down: '<path d="m6 9 6 6 6-6"/>', left: '<path d="m12 19-7-7 7-7M19 12H5"/>', arrowr: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>', clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>', camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>', wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    nav: '<path d="M3 11l19-9-9 19-2-8-8-2z"/>', history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5M12 7v5l4 2"/>', logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    list: '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5h6M9 12h6M9 16h4"/>',
    dash: '<path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/>', map: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    chart: '<path d="M12 20V10M18 20V4M6 20v-4"/>', sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>', shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>', trash: '<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    edit: '<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>', eye: '<path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    refresh: '<path d="M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0 1 14.8-3.4L23 10M1 14l4.7 4.4A9 9 0 0 0 20.5 15"/>', lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    warn: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>', info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    locate: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>', snow: '<path d="M12 2v20M4.9 6.5l14.2 11M4.9 17.5l14.2-11M9 3.5 12 6l3-2.5M9 20.5 12 18l3 2.5"/>',
    fridge: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 10h14M9 6v1M9 14v3"/>', wash: '<rect x="3" y="2" width="18" height="20" rx="2"/><circle cx="12" cy="14" r="5"/><path d="M7 6h.01M11 6h.01"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>', bike: '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h3l2 6M5.5 17.5 9 9h5l3 8.5"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/>', menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
    wa: '<path d="M21 11.5a8.4 8.4 0 0 1-12.5 7.3L3 20l1.3-5.3A8.4 8.4 0 1 1 21 11.5z"/>', ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>',
    expand: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>', shrink: '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>',
    volume: '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>', mute: '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m22 9-6 6M16 9l6 6"/>',
    gps: '<path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.5"/>', filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>', ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>', wallet: '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4M4 6v12a2 2 0 0 0 2 2h14v-4M18 12a2 2 0 0 0 0 4h4v-4z"/>'
  };
  W.ic = function (n, s, c) { return '<svg class="ic ' + (c || '') + '" width="' + (s || 20) + '" height="' + (s || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || '') + '</svg>'; };

  // ---------------------------------------------------------------- Format & label
  W.rp = function (n) { return 'Rp' + Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'], HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  W.todayStr = function (plus) { const d = new Date(Date.now() + (plus || 0) * 864e5 + (new Date().getTimezoneOffset() + 420) * 60000); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
  W.tglID = function (s) { const p = String(s || '').slice(0, 10).split('-'); return p.length === 3 ? Number(p[2]) + ' ' + BLN[Number(p[1]) - 1] + ' ' + p[0] : ''; };
  W.hariLabel = function (s) { if (s === todayStr()) return 'Hari ini'; if (s === todayStr(1)) return 'Besok'; return tglID(s); };
  W.hariPanjang = function () { const d = new Date(); return HARI[d.getDay()] + ', ' + tglID(todayStr()); };
  W.jam = function (iso) { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : ('0' + d.getHours()).slice(-2) + '.' + ('0' + d.getMinutes()).slice(-2) + ' WIB'; };
  W.tglJam = function (iso) { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear() + ' • ' + jam(iso); };
  W.rel = function (iso) { if (!iso) return '-'; const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); if (m < 1) return 'baru saja'; if (m < 60) return m + ' mnt lalu'; if (m < 1440) return Math.round(m / 60) + ' jam lalu'; return Math.round(m / 1440) + ' hari lalu'; };
  W.detik = function (iso) { if (!iso) return '-'; const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000)); return s < 60 ? s + ' dtk lalu' : Math.round(s / 60) + ' mnt lalu'; };
  W.inisial = function (n) { return String(n || '?').trim().split(/\s+/).slice(0, 2).map(function (x) { return x[0]; }).join('').toUpperCase(); };
  W.avatar = function (n, s, cls) { return '<span class="av ' + (cls || '') + '" style="width:' + (s || 40) + 'px;height:' + (s || 40) + 'px;font-size:' + Math.round((s || 40) * .38) + 'px">' + esc(inisial(n)) + '</span>'; };
  W.STATUS = { Pending: ['Menunggu', 'pending'], Assigned: ['Ditugaskan', 'assigned'], On_The_Way: ['Menuju Lokasi', 'otw'], Working: ['Dikerjakan', 'working'], Completed: ['Selesai', 'done'], Canceled: ['Dibatalkan', 'cancel'], Available: ['Tersedia', 'done'], 'On-Duty': ['Bertugas', 'assigned'], Off: ['Tidak aktif', 'off'] };
  W.badge = function (st) { const s = STATUS[st] || [st, 'off']; return '<span class="badge ' + s[1] + '"><i></i>' + esc(s[0]) + '</span>'; };
  W.CAT = { AC: { n: 'AC (Air Conditioner)', s: 'AC', i: 'snow' }, Kulkas: { n: 'Kulkas', s: 'Kulkas', i: 'fridge' }, 'Mesin Cuci': { n: 'Mesin Cuci', s: 'Mesin Cuci', i: 'wash' }, Lainnya: { n: 'Elektronik Lain', s: 'Lainnya', i: 'zap' } };
  W.catIc = function (k) { return (CAT[k] || CAT.Lainnya).i; };
  W.waLink = function (hp, teks) { const n = String(hp || '').replace(/\D/g, ''); return n ? 'https://wa.me/' + n + (teks ? '?text=' + encodeURIComponent(teks) : '') : '#'; };
  W.mapsLink = function (lat, lng) { return 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng; };
  W.jarakKm = function (a, b, c, d) { if ([a, b, c, d].some(function (x) { return x == null || isNaN(x); })) return null; const R = 6371, r = Math.PI / 180, dl = (c - a) * r, dg = (d - b) * r, x = Math.sin(dl / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dg / 2) ** 2; return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)); };
  W.skel = function (n, h) { let s = ''; for (let i = 0; i < (n || 3); i++) s += '<div class="skeleton" style="height:' + (h || 84) + 'px;margin-bottom:12px"></div>'; return s; };
  W.empty = function (ico, judul, teks, cta) { return '<div class="empty">' + ic(ico || 'box', 44) + '<h3>' + esc(judul) + '</h3><p>' + esc(teks || '') + '</p>' + (cta || '') + '</div>'; };
  W.uid = function () { return (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)); };

  // ---------------------------------------------------------------- Penyimpanan lokal (per pengguna)
  const LS = W.LS = {
    get: function (k, d) { try { const v = localStorage.getItem('fd1:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('fd1:' + k, JSON.stringify(v)); } catch (e) { } },
    del: function (k) { try { localStorage.removeItem('fd1:' + k); } catch (e) { } },
    clear: function () { try { Object.keys(localStorage).filter(function (k) { return k.indexOf('fd1:') === 0; }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) { } }
  };

  // ---------------------------------------------------------------- State global
  const S = W.S = { token: LS.get('tok', ''), me: null, boot: null, cfg: {}, services: [], epoch: 0 };

  // ---------------------------------------------------------------- API
  function offUI(v) { const b = document.getElementById('offbar'); if (b) b.hidden = !v; } W.offUI = offUI;
  function gasUrl() { const u = (W.APP_CONFIG || {}).GAS_URL || ''; return /GANTI|XXXX/.test(u) || !u ? '' : u; }
  function post(action, data, token, ms) {
    const url = gasUrl();
    if (!url) return Promise.reject(Object.assign(new Error('Konfigurasi belum lengkap: isi GAS_URL di js/config.js'), { code: 'CONFIG' }));
    if (navigator.onLine === false) { offUI(true); return Promise.reject(Object.assign(new Error('Anda sedang offline. Perubahan tidak dapat dikirim.'), { code: 'NET' })); } // gagal cepat, tidak menggantung
    const ctl = new AbortController(), to = setTimeout(function () { ctl.abort(); }, ms || 45000);
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, token: token || S.token || '', data: data || {} }), signal: ctl.signal, redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .then(function (j) { offUI(false); return j; })
      .catch(function (e) { offUI(true); throw Object.assign(new Error(e && e.name === 'AbortError' ? 'Koneksi lambat. Coba lagi.' : 'Tidak dapat terhubung ke server. Periksa internet Anda.'), { code: 'NET' }); })
      .finally(function () { clearTimeout(to); });
  }
  function handle(res) {
    if (res && res.success) return res.data;
    const e = new Error((res && res.message) || 'Terjadi kesalahan.'); e.code = res && res.code; e.res = res;
    if (e.code === 'AUTH' && W.App && S.token) { W.App.logout(true); }
    throw e;
  }
  // Batcher: permintaan baca dalam satu tick digabung menjadi 1 panggilan HTTP
  let Q = [], qT = null;
  function flushQ() {
    const batch = Q; Q = []; qT = null;
    if (batch.length === 1) { const b = batch[0]; post(b.a, b.d).then(function (r) { b.ok(r); }, b.no); return; }
    post('batch', { calls: batch.map(function (b) { return { action: b.a, data: b.d }; }) }).then(function (r) {
      if (!r.success) { batch.forEach(function (b) { b.ok(r); }); return; }
      batch.forEach(function (b, i) { b.ok(r.data.results[i]); });
    }, function (e) { batch.forEach(function (b) { b.no(e); }); });
  }
  const inflight = {}, MEM = {};
  function stale(tok) { return tok && tok !== S.token ? Object.assign(new Error('Sesi berganti'), { code: 'STALE' }) : null; } // respons dari sesi lama diabaikan (mis. logout saat permintaan berjalan)
  W.api = function (action, data, o) { // baca (dedup + batch)
    const k = S.epoch + '|' + action + '|' + JSON.stringify(data || {}), tok = S.token;
    if (inflight[k]) return inflight[k];
    const p = new Promise(function (ok, no) { Q.push({ a: action, d: data, ok: ok, no: no }); if (!qT) qT = setTimeout(flushQ, 0); }).then(handle).then(function (v) { const s = stale(tok); if (s) throw s; return v; });
    inflight[k] = p; const done = function () { delete inflight[k]; }; p.then(done, done);
    return p;
  };
  W.act = function (action, data) { // tulis: tanpa batch; membatalkan cache baca
    S.epoch++; Object.keys(MEM).forEach(function (k) { MEM[k].t = 0; });
    const tok = S.token;
    return post(action, data).then(handle).then(function (v) { const s = stale(tok); if (s) throw s; return v; });
  };
  W.apiRaw = function (action, data, token) { return post(action, data, token).then(handle); };
  // Stale-while-revalidate: tampilkan cache seketika, segarkan di latar
  W.swr = function (action, data, render, ttl) {
    const k = action + '|' + JSON.stringify(data || {}), hit = MEM[k], now = Date.now();
    if (hit && hit.v !== undefined) render(hit.v, true);
    if (hit && now - hit.t < (ttl || 6000)) return Promise.resolve(hit.v);
    return api(action, data).then(function (v) { const changed = !hit || JSON.stringify(hit.v) !== JSON.stringify(v); MEM[k] = { t: Date.now(), v: v }; if (changed) render(v, false); return v; })
      .catch(function (e) { if (!hit) { toastErr(e); } return hit ? hit.v : null; });
  };
  W.clearMem = function () { Object.keys(MEM).forEach(function (k) { delete MEM[k]; }); };
  W.memPut = function (action, data, v) { MEM[action + '|' + JSON.stringify(data || {})] = { t: Date.now(), v: v }; };

  // ---------------------------------------------------------------- Toast, modal, konfirmasi
  W.toast = function (msg, tipe, aksi) {
    let c = $('#toasts'); if (!c) { c = document.createElement('div'); c.id = 'toasts'; c.setAttribute('aria-live', 'polite'); document.body.appendChild(c); }
    const t = document.createElement('div'); t.className = 'toast ' + (tipe || 'ok');
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (aksi ? '<button class="link">' + esc(aksi.label) + '</button>' : '');
    if (aksi) $('button', t).onclick = function () { t.remove(); aksi.fn(); };
    c.appendChild(t); setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 250); }, aksi ? 8000 : 4000);
  };
  W.toastErr = function (e, retry) { if (e && e.code === 'STALE') return; toast(e && e.message || 'Terjadi kesalahan', 'err', retry ? { label: 'Coba lagi', fn: retry } : null); };
  W.modal = function (o) {
    const ov = document.createElement('div'); ov.className = 'overlay';
    ov.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><div class="modal-h"><h3>' + esc(o.title || '') + '</h3><button class="icon-btn" data-x aria-label="Tutup">' + ic('x') + '</button></div><div class="modal-b">' + (o.body || '') + '</div>' + (o.foot === false ? '' : '<div class="modal-f"></div>') + '</div>';
    document.body.appendChild(ov); document.body.classList.add('noscroll');
    const close = function () { ov.remove(); document.body.classList.remove('noscroll'); if (o.onClose) o.onClose(); };
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(); });
    $('[data-x]', ov).onclick = close;
    const f = $('.modal-f', ov);
    (o.actions || []).forEach(function (a) { const b = document.createElement('button'); b.className = 'btn ' + (a.cls || 'ghost'); b.textContent = a.label; b.onclick = function () { a.fn ? a.fn(close, b, ov) : close(); }; f.appendChild(b); });
    const first = $('input,select,textarea', ov); if (first && !o.noFocus) setTimeout(function () { first.focus(); }, 60);
    return { el: ov, close: close };
  };
  W.confirmDlg = function (msg, o) {
    o = o || {};
    return new Promise(function (res) {
      let done = false; const fin = function (v) { if (!done) { done = true; res(v); } };
      modal({ title: o.title || 'Konfirmasi', body: '<p class="mb0">' + esc(msg) + '</p>', onClose: function () { fin(false); }, actions: [{ label: o.batal || 'Batal', cls: 'ghost', fn: function (c) { fin(false); c(); } }, { label: o.ok || 'Ya, lanjutkan', cls: o.danger ? 'danger' : 'primary', fn: function (c) { fin(true); c(); } }] });
    });
  };
  // tombol sibuk: spinner + cegah klik ganda
  W.busy = function (btn, p) {
    if (!btn) return p; const t = btn.innerHTML; btn.disabled = true; btn.classList.add('loading'); btn.innerHTML = '<span class="spin"></span><span>' + (btn.dataset.busy || t.replace(/<[^>]+>/g, '')) + '</span>';
    const fin = function () { btn.disabled = false; btn.classList.remove('loading'); btn.innerHTML = t; };
    p.then(fin, fin); return p;
  };

  // ---------------------------------------------------------------- Router hash
  const R = W.Router = { routes: {}, cur: null, cleanup: null, role: null, gen: 0 };
  W.alive = function () { const g = R.gen; return function () { return g === R.gen; }; }; // true selama pengguna masih di halaman yang sama
  R.go = function (path) { if (location.hash === '#' + path) R.render(); else location.hash = path; };
  R.render = function () {
    const raw = (location.hash || '').slice(1) || R.home || '/', seg = raw.split('/').filter(Boolean), key = '/' + (seg[0] || ''), params = seg.slice(1);
    if (R.guard && !R.guard(key)) { location.replace('#' + R.home); return; }
    const r = R.routes[key] || R.routes[R.home];
    if (!r) return;
    if (R.cleanup) { try { R.cleanup(); } catch (e) { } R.cleanup = null; }
    const prevCur = R.cur, savedY = W.scrollY || 0, sameRoute = prevCur === key;
    let view = $('#view'); if (!view) return;
    // Elemen #view diganti baru tiap render: membuang SEMUA penangan event lama (cegah aksi ganda / dialog berlipat setelah bolak-balik menu)
    const fresh = view.cloneNode(false); view.parentNode.replaceChild(fresh, view); view = fresh;
    R.cur = key; R.gen++;
    if (!sameRoute) { W.scrollTo(0, 0); view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter'); }
    else requestAnimationFrame(function () { W.scrollTo(0, savedY); }); // render ulang halaman yang sama (pembaruan otomatis): posisi scroll dipertahankan
    if (R.onRoute) R.onRoute(key, params);
    try { R.cleanup = r.render(view, params) || null; } catch (e) { console.error(e); view.innerHTML = empty('warn', 'Halaman gagal dimuat', e.message); }
    document.title = (r.title ? r.title + ' • ' : '') + ((S.cfg && S.cfg.Nama_Aplikasi) || 'FieldTech Direct');
  };
  W.addEventListener('hashchange', function () { R.render(); });
  // prefetch saat disentuh/hover → klik terasa instan
  W.prefetchNav = function (el) {
    const f = function () { const r = R.routes['/' + (el.getAttribute('href') || '').replace('#/', '').split('/')[0]]; if (r && r.prefetch && !el._pf) { el._pf = 1; setTimeout(function () { el._pf = 0; }, 5000); try { r.prefetch(); } catch (e) { } } };
    el.addEventListener('pointerdown', f, { passive: true }); el.addEventListener('mouseenter', f, { passive: true });
  };

  // ---------------------------------------------------------------- Polling adaptif (hemat kuota GAS)
  let lastAct = Date.now();
  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (e) { W.addEventListener(e, function () { lastAct = Date.now(); }, { passive: true }); });
  W.poll = function (fn, baseSec) {
    let t = null, stop = false, running = false;
    const next = function () {
      if (stop) return;
      const idle = Date.now() - lastAct > 120000, ms = (baseSec || 20) * 1000 * (idle ? 3 : 1);
      t = setTimeout(tick, ms);
    };
    const tick = function () {
      if (stop) return;
      if (document.visibilityState !== 'visible' || running || !navigator.onLine) { next(); return; }
      running = true; Promise.resolve().then(fn).catch(function () { }).finally(function () { running = false; next(); });
    };
    const vis = function () { if (document.visibilityState === 'visible' && !stop) { clearTimeout(t); tick(); } };
    document.addEventListener('visibilitychange', vis);
    next();
    return function () { stop = true; clearTimeout(t); document.removeEventListener('visibilitychange', vis); };
  };
  W.addEventListener('offline', function () { toast('Anda sedang offline', 'warn'); });
  W.addEventListener('online', function () { toast('Kembali online', 'ok'); });

  // ---------------------------------------------------------------- Muat skrip/CSS eksternal sesuai kebutuhan
  const loaded = {};
  W.loadScript = function (u, ms) {
    return loaded[u] || (loaded[u] = new Promise(function (ok, no) {
      const s = document.createElement('script'); s.src = u; s.async = true;
      const t = setTimeout(function () { s.remove(); delete loaded[u]; no(new Error('Pustaka terlalu lama dimuat. Periksa koneksi internet lalu coba lagi.')); }, ms || 25000);
      s.onload = function () { clearTimeout(t); ok(); };
      s.onerror = function () { clearTimeout(t); delete loaded[u]; no(new Error('Gagal memuat pustaka. Periksa koneksi internet.')); };
      document.head.appendChild(s);
    }));
  };
  W.loadCss = function (u) { if (loaded[u]) return; loaded[u] = 1; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = u; document.head.appendChild(l); };

  // ---------------------------------------------------------------- Peta (Leaflet + OpenStreetMap, tanpa API key)
  const LV = '1.9.4';
  W.loadMap = function () {
    loadCss('https://cdnjs.cloudflare.com/ajax/libs/leaflet/' + LV + '/leaflet.min.css');
    return W.L ? Promise.resolve(W.L) : loadScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet/' + LV + '/leaflet.min.js').then(function () { return W.L; });
  };
  // Satu elemen peta hanya boleh punya satu peta. Panggilan kedua untuk elemen yang sama memakai proses yang sedang berjalan,
  // dan peta lama di elemen itu dibuang lebih dulu (mencegah error Leaflet "map container is being reused by another instance").
  W.newMap = function (el, lat, lng, zoom, o) {
    if (el._fdBusy) return el._fdBusy;
    const p = loadMap().then(function (L) {
      if (el._fdMap) { try { el._fdMap.remove(); } catch (e) { } el._fdMap = null; }
      el.innerHTML = '';
      try { delete el._leaflet_id; } catch (e) { el._leaflet_id = undefined; }
      const m = L.map(el, Object.assign({ zoomControl: false, attributionControl: true, touchZoom: false }, o || {})).setView([lat, lng], zoom || 14); // cubit peta dimatikan; zoom lewat tombol +/−
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
      setTimeout(function () { try { m.invalidateSize(); } catch (e) { } }, 150);
      el._fdMap = m;
      return m;
    }).catch(function () { // pustaka peta gagal dimuat: tampilkan pesan, fitur lain tetap jalan
      el._fdBusy = null;
      el.innerHTML = '<div class="alert warn" style="margin:0">' + ic('warn') + '<div>Peta tidak dapat dimuat. Periksa koneksi internet.<br><button class="btn sm secondary" data-retry-map>Coba lagi</button></div></div>';
      const b = $('[data-retry-map]', el); if (b) b.onclick = function () { if (W.Router) Router.render(); };
      return new Promise(function () { });
    });
    el._fdBusy = p;
    p.then(function () { el._fdBusy = null; }, function () { el._fdBusy = null; });
    return p;
  };
  W.divIcon = function (html, cls, size) { return W.L.divIcon({ html: html, className: 'mk ' + (cls || ''), iconSize: [size || 36, size || 36], iconAnchor: [(size || 36) / 2, (size || 36) / 2] }); };
  W.mkHome = function () { return divIcon(ic('home', 18), 'mk-home', 34); };
  W.mkTech = function (st, nama, otw) { return divIcon(ic('user', 18), 'mk-tech ' + (otw ? 'pulse ' : '') + ({ Available: 'ok', 'On-Duty': 'duty', Off: 'off', anomali: 'bad' }[st] || 'duty'), 36); };
  // gerakkan marker halus
  W.glide = function (mk, to) { const a = mk.getLatLng(); if (!a || Math.abs(a.lat - to[0]) + Math.abs(a.lng - to[1]) < 1e-6) return; let i = 0; const n = 12, dl = (to[0] - a.lat) / n, dg = (to[1] - a.lng) / n; const st = function () { i++; mk.setLatLng([a.lat + dl * i, a.lng + dg * i]); if (i < n) requestAnimationFrame(st); }; st(); };

  // ---------------------------------------------------------------- GPS & foto
  W.getPos = function (hi) {
    return new Promise(function (ok, no) {
      if (!navigator.geolocation) return no(Object.assign(new Error('Perangkat tidak mendukung GPS.'), { code: 'GPS' }));
      navigator.geolocation.getCurrentPosition(function (p) { ok({ lat: p.coords.latitude, lng: p.coords.longitude, akurasi: Math.round(p.coords.accuracy) }); },
        function (e) { no(Object.assign(new Error(e.code === 1 ? 'Izin lokasi ditolak. Aktifkan izin lokasi di browser, atau buka aplikasi di tab baru.' : 'Lokasi tidak tersedia. Coba lagi di tempat terbuka.'), { code: 'GPS', denied: e.code === 1 })); },
        { enableHighAccuracy: hi !== false, timeout: 15000, maximumAge: hi === false ? 60000 : 5000 });
    });
  };
  W.gpsKartu = function (msg) { return '<div class="alert warn">' + ic('warn') + '<div><b>' + esc(msg) + '</b><br><a class="btn sm secondary" target="_blank" rel="noopener" href="' + esc(location.href.split('#')[0]) + '">' + ic('ext', 16) + ' Buka di tab baru</a></div></div>'; };
  W.kompres = function (file, max, q) { // sisi terpanjang 1280px, JPEG 0,8 (PRD 4.2)
    return new Promise(function (ok, no) {
      const fr = new FileReader();
      fr.onerror = function () { no(new Error('Foto tidak dapat dibaca.')); };
      fr.onload = function () {
        const im = new Image();
        im.onerror = function () { no(new Error('Berkas bukan gambar yang valid.')); };
        im.onload = function () {
          const k = Math.min(1, (max || 1280) / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          const url = c.toDataURL('image/jpeg', q || 0.8);
          ok({ dataUrl: url, data: url.split(',')[1], mime: 'image/jpeg', nama: (file.name || 'foto').replace(/\.[^.]+$/, '') });
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  };
  // cache foto (dataURL) dari server; hanya diminta saat dibutuhkan
  const FOTO = {};
  W.fotoUrl = function (bid, fid) {
    const k = bid + fid; if (FOTO[k]) return FOTO[k];
    return (FOTO[k] = api('foto.get', { id: bid, fileId: fid }).then(function (r) { return r.dataUrl; }).catch(function (e) { delete FOTO[k]; throw e; }));
  };
  W.fotoSet = function (bid, fid, url) { FOTO[bid + fid] = Promise.resolve(url); };
  W.lazyFoto = function (root) { // isi <img data-b data-f> secara lazy
    $$('img[data-f]', root).forEach(function (im) {
      const go = function () { fotoUrl(im.dataset.b, im.dataset.f).then(function (u) { im.src = u; im.classList.add('ld'); }).catch(function () { im.alt = 'Foto tidak tersedia'; }); };
      if ('IntersectionObserver' in W) { const o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { o.disconnect(); go(); } }, { rootMargin: '200px' }); o.observe(im); } else go();
    });
  };
  W.lightbox = function (src) { const m = modal({ title: 'Foto', body: '<img src="' + src + '" style="width:100%;border-radius:8px">', foot: false, noFocus: true }); return m; };

  // ---------------------------------------------------------------- Ekspor sisi klien (Excel & PDF) — dimuat saat dipakai
  // Pustaka ekspor dimuat sekali (promise di-cache); kegagalan tidak "menempel" sehingga bisa dicoba lagi.
  let xlsxP = null, pdfP = null;
  W.libXlsx = function () {
    if (W.XLSX) return Promise.resolve();
    return xlsxP || (xlsxP = loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js').then(function () { if (!W.XLSX) throw new Error('Pustaka Excel tidak lengkap.'); }).catch(function (e) { xlsxP = null; throw e; }));
  };
  W.libPdf = function () {
    if (W.jspdf && W.jspdf.jsPDF && W.jspdf.jsPDF.API && W.jspdf.jsPDF.API.autoTable) return Promise.resolve();
    return pdfP || (pdfP = loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
      .then(function () { return loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'); })
      .then(function () { if (!(W.jspdf && W.jspdf.jsPDF.API.autoTable)) throw new Error('Pustaka PDF tidak lengkap.'); })
      .catch(function (e) { pdfP = null; throw e; }));
  };
  W.tick = function (ms) { return new Promise(function (r) { setTimeout(r, ms || 20); }); }; // beri browser kesempatan menggambar (spinner tetap berputar)
  W.unduh = function (blob, nama) { const a = document.createElement('a'), u = URL.createObjectURL(blob); a.href = u; a.download = nama; document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); URL.revokeObjectURL(u); }, 1500); };
  // Simpan berkas: di HP memakai lembar Bagikan (Simpan ke Berkas/Drive), di komputer unduhan biasa.
  // Penulis .xlsx mandiri (tanpa pustaka luar): zip STORE + XML SpreadsheetML. Hasilnya divalidasi di uji dengan openpyxl.
  W.makeXlsx = function (sheets) {
    const enc = new TextEncoder();
    const CRC = (function () { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let x = n; for (let k = 0; k < 8; k++) x = (x & 1) ? (0xEDB88320 ^ (x >>> 1)) : (x >>> 1); t[n] = x >>> 0; } return t; })();
    const crc32 = function (b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
    const xe = function (s) { return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[<>&"']/g, function (ch) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[ch]; }); };
    const col = function (i) { let s = '', n = i + 1; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
    const nm = function (s, i) { let t = String(s || 'Sheet' + (i + 1)).replace(/[\[\]:*?\/\\]/g, '').slice(0, 31); return t || 'Sheet' + (i + 1); };
    const names = sheets.map(function (sh, i) { return nm(sh.nm, i); });
    const cellX = function (v, ref, money, head) {
      if (v === null || v === undefined || v === '') return '';
      const s = head ? ' s="2"' : (money ? ' s="1"' : '');
      if (typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '"' + s + '><v>' + v + '</v></c>';
      if (typeof v === 'boolean') return '<c r="' + ref + '" t="b"' + s + '><v>' + (v ? 1 : 0) + '</v></c>';
      return '<c r="' + ref + '" t="inlineStr"' + s + '><is><t xml:space="preserve">' + xe(v) + '</t></is></c>';
    };
    const sheetX = function (sh) {
      const rows = sh.rows || [], maxC = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 1), last = col(maxC - 1) + rows.length;
      let sd = '';
      rows.forEach(function (r, ri) {
        let cells = ''; r.forEach(function (v, ci) { cells += cellX(v, col(ci) + (ri + 1), !!(sh.money && sh.money.indexOf(ci) > -1 && ri > 0 || (sh.moneyAll && ri > 0 && sh.money && sh.money.indexOf(ci) > -1)), !!(sh.header && ri === 0)); });
        sd += '<row r="' + (ri + 1) + '">' + cells + '</row>';
      });
      const cols = (sh.widths || []).map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join('');
      return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        (sh.freeze ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : '') +
        (cols ? '<cols>' + cols + '</cols>' : '') + '<sheetData>' + sd + '</sheetData>' + (sh.autofilter && rows.length ? '<autoFilter ref="A1:' + last + '"/>' : '') + '</worksheet>';
    };
    const wbSheets = sheets.map(function (s, i) { return '<sheet name="' + xe(names[i]) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('');
    const filt = sheets.map(function (s, i) { return s.autofilter && s.rows && s.rows.length ? '<definedName name="_xlnm._FilterDatabase" localSheetId="' + i + '" hidden="1">' + "'" + xe(names[i]) + "'" + '!$A$1:$' + col(Math.max.apply(null, s.rows.map(function (r) { return r.length; })) - 1) + '$' + s.rows.length + '</definedName>' : ''; }).join('');
    const files = [
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' + sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + wbSheets + '</sheets>' + (filt ? '<definedNames>' + filt + '</definedNames>' : '') + '</workbook>'],
      ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
      ['xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>']
    ];
    sheets.forEach(function (s, i) { files.push(['xl/worksheets/sheet' + (i + 1) + '.xml', sheetX(s)]); });
    const now = new Date(), dosD = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate(), dosT = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
    const parts = [], central = []; let off = 0;
    files.forEach(function (f) {
      const nb = enc.encode(f[0]), data = enc.encode(f[1]), crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true); lh.setUint16(10, dosT, true); lh.setUint16(12, dosD, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, nb.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), nb, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, dosT, true); ch.setUint16(14, dosD, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, nb.length, true); ch.setUint32(42, off, true);
      central.push(new Uint8Array(ch.buffer), nb);
      off += 30 + nb.length + data.length;
    });
    const cdSize = central.reduce(function (a, p) { return a + p.length; }, 0);
    const eo = new DataView(new ArrayBuffer(22));
    eo.setUint32(0, 0x06054b50, true); eo.setUint16(8, files.length, true); eo.setUint16(10, files.length, true); eo.setUint32(12, cdSize, true); eo.setUint32(16, off, true);
    return new Blob(parts.concat(central, [new Uint8Array(eo.buffer)]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  };
  // Berkas langsung diunduh/disimpan ke folder Download perangkat
  W.saveFile = function (blob, nama) { unduh(blob, nama); };
  // Cetak / simpan PDF lewat jendela browser sendiri (tanpa pustaka luar). Bila pop-up diblokir, berkas HTML diunduh.
  W.htmlDoc = function (judul, isi) {
    return '<!doctype html><html lang="id"><head><meta charset="utf-8"><title>' + esc(judul) + '</title><style>' +
      'body{font:11px/1.35 Arial,Helvetica,sans-serif;color:#111;margin:14px}h2{font-size:16px;margin:0 0 4px}p{margin:3px 0;color:#444}' +
      'table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#eef2ff;text-align:left;font-size:9.5px;text-transform:uppercase;padding:4px 6px;border-bottom:1.5px solid #4f46e5}' +
      'td{padding:3px 6px;border-bottom:1px solid #ddd;font-size:10px}thead{display:table-header-group}tr{page-break-inside:avoid}.r{text-align:right}' +
      '.pf{margin-top:10px;font-size:9px;color:#777}@page{size:A4 landscape;margin:12mm}.noprint{margin:12px 0}@media print{.noprint{display:none}}' +
      '</style></head><body>' + isi + '<p class="noprint"><button onclick="window.print()">Cetak / Simpan sebagai PDF</button></p>' +
      '<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},250)});<\/script></body></html>';
  };
  // Unduh laporan sebagai HTML (dibuka lalu Cetak → Simpan sebagai PDF); dipakai bila pembuatan PDF di perangkat gagal
  W.unduhHtml = function (judul, isi, nama) { unduh(new Blob([htmlDoc(judul, isi)], { type: 'text/html;charset=utf-8' }), nama || (judul || 'laporan').replace(/\W+/g, '_') + '.html'); };
  // Cetak lewat jendela baru (dialog cetak browser). Bila pop-up diblokir, berkas HTML diunduh.
  W.printHtml = function (judul, isi) {
    const html = htmlDoc(judul, isi);
    const w = window.open('', '_blank');
    if (w) { w.document.open(); w.document.write(html); w.document.close(); return true; }
    unduh(new Blob([html], { type: 'text/html;charset=utf-8' }), (judul || 'laporan').replace(/\W+/g, '_') + '.html');
    return false;
  };
  W.angka = function (el) { // input Rupiah dengan pemisah ribuan
    el.addEventListener('input', function () { const v = el.value.replace(/\D/g, ''); el.value = v ? v.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''; });
  };
  W.angkaVal = function (v) { return Number(String(v || '').replace(/\D/g, '')) || 0; };

  // ---------------------------------------------------------------- Gambar layanan (katalog)
  const LF = {};
  W.layananFotoUrl = function (id) {
    if (!LF[id]) LF[id] = api('foto.get', { layanan: true, layananId: id }).then(function (r) { return r.dataUrl; }).catch(function (e) { delete LF[id]; throw e; });
    return LF[id];
  };
  W.clearLayananFoto = function (id) { delete LF[id]; };
  W.clearAllLayananFoto = function () { Object.keys(LF).forEach(function (k) { delete LF[k]; }); };
  // Gambar layanan jika ada, jika tidak ikon kategori. Gambar dimuat lazy oleh lazyLayanan().
  W.avSvc = function (s, size) {
    const z = size || 44, ico = ((s && CAT[s.kategori]) || CAT.Lainnya).i, px = 'width:' + z + 'px;height:' + z + 'px';
    if (s && s.fotoAda) return '<span class="svc-av lf" data-lf="' + esc(s.id) + '" style="' + px + '">' + ic(ico, Math.round(z * .5)) + '</span>';
    return '<span class="svc-av" style="' + px + '">' + ic(ico, Math.round(z * .5)) + '</span>';
  };
  W.lazyLayanan = function (root) {
    $$('span.lf[data-lf]', root).forEach(function (el) {
      if (el.dataset.ld) return; el.dataset.ld = '1';
      layananFotoUrl(el.dataset.lf).then(function (url) { el.innerHTML = '<img src="' + url + '" alt="">'; }).catch(function () { el.dataset.ld = ''; });
    });
  };

  // ---------------------------------------------------------------- Foto profil lawan (teknisi ↔ pelanggan)
  const PF = {};
  W.profilFotoUrl = function (uid) {
    if (!PF[uid]) PF[uid] = api('foto.get', { profil: true, userId: uid }).then(function (r) { return r.dataUrl; }).catch(function (e) { delete PF[uid]; throw e; });
    return PF[uid];
  };
  // Inisial bila belum ada foto; foto dimuat lazy setelah elemen dirender
  W.avPhoto = function (nama, uid, ada, size, cls) {
    const s = size || 40;
    if (!ada || !uid) return avatar(nama, s, cls);
    return '<span class="av avp ' + (cls || '') + '" data-pu="' + esc(uid) + '" style="width:' + s + 'px;height:' + s + 'px;font-size:' + Math.round(s * .38) + 'px">' + esc(inisial(nama)) + '</span>';
  };
  W.lazyProfil = function (root) {
    $$('span.avp[data-pu]', root).forEach(function (el) {
      if (el.dataset.ld) return; el.dataset.ld = '1';
      profilFotoUrl(el.dataset.pu).then(function (url) { el.innerHTML = '<img src="' + url + '" alt="">'; }).catch(function () { el.dataset.ld = ''; });
    });
  };

  // ---------------------------------------------------------------- Tampilan native: tanpa zoom, layar penuh
  (function nativeFeel() {
    const stop = function (e) { e.preventDefault(); };
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (t) { document.addEventListener(t, stop, { passive: false }); }); // pinch iOS Safari
    document.addEventListener('touchmove', function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false }); // cubit dua jari
    document.addEventListener('wheel', function (e) { if (e.ctrlKey) e.preventDefault(); }, { passive: false }); // Ctrl + scroll
    document.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0', 'Add', 'Subtract'].indexOf(e.key) > -1) e.preventDefault(); }); // Ctrl + (+ − 0)
  })();
  W.fsSupported = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  W.fsOn = function () { return !!(document.fullscreenElement || document.webkitFullscreenElement); };
  W.fsToggle = function () {
    try {
      if (fsOn()) { return (document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen()); }
      const el = document.documentElement, req = el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen();
      if (req && req.catch) req.catch(function () { toast('Browser ini tidak mengizinkan layar penuh. Pasang aplikasi dari tombol "Pasang Aplikasi" untuk tampilan penuh.', 'info'); });
    } catch (e) { toast('Layar penuh tidak tersedia di browser ini.', 'info'); }
  };
  document.addEventListener('fullscreenchange', function () { const b = $('#btnFs'); if (b) b.innerHTML = ic(fsOn() ? 'shrink' : 'expand', 20); });
  document.addEventListener('webkitfullscreenchange', function () { const b = $('#btnFs'); if (b) b.innerHTML = ic(fsOn() ? 'shrink' : 'expand', 20); });
})();
