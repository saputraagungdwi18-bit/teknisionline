/* FieldTech Direct — app.js
 * Login (W-01), boot instan dari cache, shell per peran, sesi & logout. */
(function () {
  'use strict';
  const App = window.App = {};
  const NAV = {
    Customer: { home: '/pesan', items: [['/pesan', 'Pesan', 'cal'], ['/lacak', 'Lacak', 'nav'], ['/riwayat', 'Riwayat', 'history'], ['/profil', 'Profil', 'user']] },
    Teknisi: { home: '/tugas', items: [['/tugas', 'Tugas', 'list'], ['/peta', 'Peta', 'map'], ['/profil', 'Profil', 'user']] },
    Admin: { home: '/dashboard', items: [['/dashboard', 'Dashboard', 'dash'], ['/papan', 'Papan Penugasan', 'list'], ['/chat', 'Chat Pesanan', 'chat'], ['/armada', 'Peta Teknisi Live', 'gps'], ['/katalog', 'Katalog Layanan', 'wrench'], ['/laporan', 'Laporan & Ekspor', 'chart'], ['/pengguna', 'Pengguna & Teknisi', 'users'], ['/pengaturan', 'Pengaturan', 'sliders']] }
  };
  const ROLE_LBL = { Customer: 'Pelanggan', Teknisi: 'Teknisi', Admin: 'Dispatcher' };
  App.appName = function () { return (S.cfg && S.cfg.Nama_Aplikasi) || (App.pubName) || 'FieldTech Direct'; };
  const logoSvg = '<span class="logo">' + ic('wrench', 18) + '</span>';

  // ------------------------------------------------------------------ boot
  let saveT = null;
  App.persist = function () { clearTimeout(saveT); saveT = setTimeout(function () { LS.set('boot', S.boot); }, 400); };
  App.applyBoot = function (b) {
    S.boot = b; S.me = b.me; S.cfg = b.cfg || {}; S.services = b.services || [];
    App.persist();
  };
  App.refresh = function () {
    return api('boot').then(function (b) {
      const ch = JSON.stringify(b.bookings || b.tugas || b.techs || '') !== JSON.stringify(S.boot && (S.boot.bookings || S.boot.tugas || S.boot.techs) || '') || JSON.stringify(b.me) !== JSON.stringify(S.me);
      const svBerubah = JSON.stringify(b.services || []) !== JSON.stringify((S.boot && S.boot.services) || []);
      App.applyBoot(b); setSync(true);
      if (svBerubah && window.clearAllLayananFoto) clearAllLayananFoto();   // gambar layanan diubah admin → muat ulang gambar
      if (svBerubah && Router.cur === '/pesan') window.dispatchEvent(new Event('fd-svc'));   // hanya daftar layanan yang diperbarui; isian tetap aman
      if ((ch || svBerubah) && Router.cur && !App.editing) Router.render();
      return b;
    }).catch(function (e) { setSync(false); throw e; });
  };
  function setSync(ok) { const el = $('#sync'); if (el) { el.className = 'sync ' + (ok ? 'ok' : 'bad'); el.lastElementChild.textContent = ok ? 'Sistem Sinkron • Google Sheets DB' : 'Tidak terhubung'; } }

  App.start = function () {
    const cached = S.token && LS.get('boot', null);
    if (S.token && cached && cached.me) { // tampil instan dari cache, segarkan di latar
      App.applyBoot(cached); App.shell();
      App.refresh().catch(function (e) { if (e.code !== 'AUTH' && e.code !== 'NET') toastErr(e); });
    } else if (S.token) {
      $('#root').innerHTML = '<div class="splash">' + logoSvg + '<div class="spin lg"></div></div>';
      api('boot').then(function (b) { App.applyBoot(b); App.shell(); }).catch(function (e) { if (e.code !== 'AUTH') { toastErr(e); } App.login(); });
    } else App.login();
  };
  App.logout = function (silent) {
    const lastRole = S.me && S.me.role; S.token = ''; S.me = null; S.boot = null; LS.clear(); S.epoch++; if (lastRole) LS.set('lastRole', lastRole);
    if (Router.cleanup) { try { Router.cleanup(); } catch (e) { } Router.cleanup = null; }
    if (App.stopTech) App.stopTech(); if (App.stopWatch) App.stopWatch(); if (App.stopChat) App.stopChat();
    try { sessionStorage.setItem('fd-pesan', silent ? 'Sesi berakhir. Silakan masuk kembali.' : 'Anda telah keluar dari akun. Masuk kembali kapan saja.'); } catch (e) { }
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { } // hapus hash tanpa memicu popstate
    armed = false; App.login();
  };
  App.afterLogin = function (r) {
    S.token = r.token; LS.set('tok', r.token);
    S.me = r.me; $('#root').innerHTML = '<div class="splash">' + logoSvg + '<div class="spin lg"></div></div>';
    return api('boot').then(function (b) { App.applyBoot(b); location.hash = ''; App.shell(); if (r.baru || !b.me.profilLengkap) { toast('Lengkapi profil Anda untuk mulai memesan.', 'info'); location.hash = '/profil/ubah'; } });
  };


  // Tombol layar penuh: hanya bila browser mendukung dan aplikasi belum berjalan dalam mode layar penuh/PWA
  App.mountFs = function () {
    const old = $('#btnFs'); if (old) old.remove();
    if (!window.fsSupported || (standalone() && !fsOn())) return; // aplikasi terpasang (layar penuh bawaan) tidak perlu tombol; saat layar penuh aktif tombol tetap tampil untuk keluar
    const btn = '<button class="icon-btn fs" id="btnFs" aria-label="Layar penuh" title="Layar penuh">' + ic(fsOn() ? 'shrink' : 'expand', 20) + '</button>';
    const loginEl = $('.login'), bar = $('.mbar .hav'), bell = $('#btnBell');
    if (bell) bell.insertAdjacentHTML('beforebegin', btn);
    else if (bar) bar.insertAdjacentHTML('beforebegin', btn);
    else if (loginEl) loginEl.insertAdjacentHTML('afterbegin', btn.replace('class="icon-btn fs"', 'class="fsbtn"'));
    else return;
    $('#btnFs').onclick = function () { fsToggle(); };
  };


  // Tombol refresh di header setiap menu: segarkan data server lalu muat ulang halaman aktif
  App.mountRefresh = function () {
    const old = $('#btnRefresh'); if (old) old.remove();
    const btn = '<button class="icon-btn rfs" id="btnRefresh" aria-label="Segarkan data" title="Segarkan data">' + ic('refresh', 20) + '</button>';
    const anchor = $('#btnSuara') || $('#btnFs') || $('#btnBell') || $('.mbar .hav');
    if (anchor) anchor.insertAdjacentHTML('beforebegin', btn); else return;
    $('#btnRefresh').onclick = function () { App.doRefresh(); };
  };
  App.doRefresh = function () {
    const b = $('#btnRefresh'); if (!S.token || !S.boot) return;
    if (b && b.classList.contains('spinning')) return;
    if (b) b.classList.add('spinning');
    S.epoch++; if (window.clearMem) clearMem();
    App.refresh().then(function () {
      if (App.badgeUpd) App.badgeUpd();
      if (App.editing) { toast('Data diperbarui. Isian formulir Anda tidak diubah.', 'ok'); return; }   // jangan hilangkan isian yang sedang diketik
      Router.render(); toast('Data diperbarui.', 'ok');
    }).catch(function (e) { toastErr(e, App.doRefresh); })
      .then(function () { const x = $('#btnRefresh'); if (x) x.classList.remove('spinning'); });
  };

  // ------------------------------------------------------------------ shell per peran
  App.title = function (t) { const el = $('#ptitle'); if (el) el.textContent = t; };
  App.shell = function () {
    const role = S.me.role, nav = NAV[role], R = Router;
    R.home = nav.home; R.role = role;
    R.onRoute = function (key) {
      $$('[data-nav]').forEach(function (a) { const on = a.dataset.nav === key || (key === '/pesan' && a.dataset.nav === '/pesan'); a.classList.toggle('active', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    };
    const allowed = nav.items.map(function (i) { return i[0]; }).concat(['/profil', '/chat']);
    const orig = R.routes; // hanya rute yang diizinkan peran
    R.guard = function (key) { return allowed.indexOf(key) > -1; };
    document.body.classList.toggle('admin', role === 'Admin');
    if (role === 'Admin') shellAdmin(nav); else shellMobile(nav, role);
    $$('[data-nav]').forEach(prefetchNav);
    const first = '/' + location.hash.replace(/^#\/?/, '').split('/')[0];
    if (!R.guard(first)) history.replaceState(null, '', '#' + nav.home); // deep link / reload / shortcut PWA tetap dirender
    R.render();
    if (role === 'Teknisi' && App.startTech) App.startTech();
    App.badgeLoop();
    if (App.startWatch) App.startWatch(); // suara "Ada pesanan masuk" (Dispatcher & Teknisi)
    if (App.startChat) App.startChat();   // pemantau pesan chat baru
    App.mountFs(); App.mountRefresh();
  };
  function avatarBtn() {
    const f = LS.get('foto', null);
    return '<a class="hav" href="#/profil" aria-label="Profil">' + (f ? '<img src="' + f + '" alt="">' : avatar(S.me.nama, 36)) + '</a>';
  }
  function shellMobile(nav, role) {
    $('#root').innerHTML =
      '<div class="mshell"><header class="mbar"><div class="mbrand">' + logoSvg + '<div><small>' + esc(App.appName().toUpperCase()) + '</small><b id="ptitle"></b></div></div>' + (role === 'Teknisi' ? '<span class="gps-pill" id="gpsPill">' + ic('gps', 14) + '<i>GPS</i></span>' : '') + avatarBtn() + '</header>' +
      '<main id="view" class="view"></main>' +
      '<nav class="bnav" aria-label="Navigasi utama">' + nav.items.map(function (i) { return '<a href="#' + i[0] + '" data-nav="' + i[0] + '">' + ic(i[2], 22) + '<span>' + i[1] + '</span></a>'; }).join('') + '</nav></div>';
  }
  function shellAdmin(nav) {
    $('#root').innerHTML =
      '<div class="ashell"><aside class="side"><div class="side-h">' + logoSvg + '<div><b>' + esc(App.appName()) + '</b><small>DIRECT</small></div><em>ADMIN</em></div>' +
      '<nav>' + nav.items.map(function (i) { return '<a href="#' + i[0] + '" data-nav="' + i[0] + '">' + ic(i[2], 20) + '<span>' + i[1] + '</span>' + (i[0] === '/papan' ? '<i class="nbadge" id="nbPapan" hidden></i>' : '') + '</a>'; }).join('') + '</nav>' +
      '<div class="side-f"><div class="u">' + avatar(S.me.nama, 34, 'ind') + '<div><b>' + esc(S.me.nama) + '</b><small>Senior Dispatcher</small></div></div><a href="#/profil" class="sl">' + ic('user', 16) + '<span>Profil</span></a><button class="sl" id="btnOut">' + ic('logout', 16) + '<span>Keluar</span></button></div></aside>' +
      '<div class="amain"><header class="atop"><div class="crumb"><span>Operasional</span>' + ic('right', 14) + '<b id="ptitle"></b></div>' +
      '<label class="gsearch">' + ic('search', 16) + '<input id="gq" placeholder="Cari tiket, klien, armada…" aria-label="Cari"></label>' +
      '<span class="sync ok" id="sync"><i></i><span>Sistem Sinkron • Google Sheets DB</span></span>' +
      '<button class="icon-btn" id="btnBell" aria-label="Notifikasi">' + ic('bell') + '<i class="dot" id="bellDot" hidden></i></button>' + avatarBtn() + '</header>' +
      '<main id="view" class="view"></main></div></div>';
    $('#btnOut').onclick = doLogout;
    $('#btnBell').onclick = function () { location.hash = '/papan'; };
    $('#gq').addEventListener('keydown', function (e) { if (e.key === 'Enter') { S.papanQ = e.target.value; location.hash = '/papan'; if (Router.cur === '/papan') Router.render(); } });
  }
  function doLogout() { confirmDlg('Keluar dari akun ini?', { ok: 'Keluar', danger: true }).then(function (y) { if (y) { apiRaw('ping').catch(function () { }); App.logout(); } }); }
  App.doLogout = doLogout;
  App.badgeLoop = function () { // badge Papan: jumlah Pending
    const upd = function () { if (S.me && S.me.role === 'Admin' && S.boot) { const n = (S.boot.bookings || []).filter(function (b) { return b.status === 'Pending'; }).length, el = $('#nbPapan'), d = $('#bellDot'); if (el) { el.hidden = !n; el.textContent = n + ' Baru'; } if (d) d.hidden = !n; } };
    App.badgeUpd = upd; upd();
  };


  // ------------------------------------------------------------------ Konfirmasi keluar aplikasi (halaman login)
  // Browser tidak mengizinkan halaman menutup dirinya sendiri, jadi konfirmasi dipasang di dua tempat:
  // 1) tombol kembali (Android/PWA): muncul "Keluar dari aplikasi?"
  // 2) tutup/muat ulang tab di browser: dialog konfirmasi bawaan browser
  let armed = false, allowLeave = false, exitOpen = false;
  function armExit() {
    if (armed || S.token) return;
    armed = true;
    try { history.pushState({ fdExit: 1 }, '', location.href); } catch (e) { }
  }
  function leaveApp() {
    allowLeave = true; armed = false;
    try { window.close(); } catch (e) { }
    try { history.go(-2); } catch (e) { }
    setTimeout(function () { if (!document.hidden) toast('Tutup jendela atau aplikasi ini untuk keluar.', 'info'); }, 900);
  }
  function showExitConfirm() {
    if (exitOpen) return; exitOpen = true;
    modal({ title: 'Keluar dari aplikasi?', noFocus: true, onClose: function () { exitOpen = false; },
      body: '<div class="tpop"><div class="tpop-ico" style="background:#FEF3C7;color:#B45309">' + ic('warn', 28) + '</div><p>Anda akan meninggalkan <b>' + esc(App.appName()) + '</b>.</p><small class="muted">Sesi login yang diingat tetap tersimpan di perangkat ini.</small></div>',
      actions: [{ label: 'Batal', cls: 'ghost', fn: function (c) { c(); } }, { label: 'Ya, keluar', cls: 'danger', fn: function (c) { c(); leaveApp(); } }] });
  }
  window.addEventListener('popstate', function (e) {
    if (!armed) return;
    if (S.token) { // sudah login: lewati penanda agar tombol kembali bekerja normal di dalam aplikasi
      if (e.state && e.state.fdExit) { armed = false; history.back(); }
      return;
    }
    if (allowLeave) return;
    try { history.pushState({ fdExit: 1 }, '', location.href); } catch (err) { }
    showExitConfirm();
  });
  window.addEventListener('beforeunload', function (e) { // tutup/muat ulang tab saat di halaman login → konfirmasi bawaan browser
    if (!S.token && !allowLeave) { e.preventDefault(); e.returnValue = ''; }
  });

  // ------------------------------------------------------------------ Login (W-01) — isi & validasi mengikuti peran
  const LOGIN = {
    Customer: { lbl: 'PELANGGAN', ico: 'home', idLabel: 'Nomor WhatsApp / Email Google / ID Pengguna', ph: '0812-xxxx-xxxx atau ID', hint: 'Contoh ID Pelanggan: <code>USR-0128</code> atau nomor WhatsApp aktif.', gHint: 'Pelanggan baru otomatis terdaftar saat pertama kali masuk dengan Google.', gText: 'continue_with', demo: 'Pelanggan',
      lupa: 'Masuk dengan Akun Google, lalu atur PIN baru di menu Profil → Ganti PIN. Atau hubungi Customer Service.' },
    Teknisi: { lbl: 'TEKNISI', ico: 'wrench', idLabel: 'ID Teknisi / Nomor WhatsApp / Email', ph: 'TEK-001 atau 0812-xxxx-xxxx', hint: 'Contoh ID Teknisi: <code>TEK-001</code> (diberikan oleh Dispatcher).', gHint: 'Gunakan email Google yang didaftarkan Admin sebagai mitra teknisi.', gText: 'signin_with', demo: 'Teknisi',
      lupa: 'Hubungi Dispatcher untuk mereset PIN Anda. PIN baru akan diberikan sekali dan dapat Anda ganti di menu Profil.' },
    Admin: { lbl: 'DISPATCHER', ico: 'shield', idLabel: 'ID Dispatcher / Email Google', ph: 'ADM-001 atau email Google', hint: 'Contoh ID Dispatcher: <code>ADM-001</code> atau email Google admin.', gHint: 'Hanya email Google yang terdaftar sebagai Admin yang dapat masuk.', gText: 'signin_with', demo: 'Dispatcher',
      lupa: 'Minta Admin lain mereset PIN Anda di Pengguna & Teknisi, atau gunakan Akun Google. Pemilik sistem dapat memakai akses darurat.' }
  };
  let LCFG = { waCs: '', demo: [], googleClientId: '' }, LTAB = 'Customer';
  const roleIco = function (r) { return r === 'Admin' ? 'shield' : r === 'Teknisi' ? 'wrench' : 'user'; };
  function loginErr(e) {
    if (e.code === 'PERAN' && e.res && e.res.peranBenar) { toast(e.message, 'warn', { label: 'Pindah ke tab ' + ROLE_LBL[e.res.peranBenar], fn: function () { setTab(e.res.peranBenar); } }); return; }
    toastErr(e);
  }
  function renderRoleInfo() {
    const R = LOGIN[LTAB], box = $('#rinfo'); if (!box) return;
    const wa = LCFG.waCs ? waLink(LCFG.waCs, 'Halo, saya ingin mendaftar sebagai mitra teknisi ' + App.appName() + '.') : '';
    box.innerHTML = LTAB === 'Customer'
      ? '<b>' + ic('info', 18) + ' Belum Memiliki Akun?</b><ul><li><b>Pelanggan baru:</b> cukup masuk dengan Akun Google untuk pendaftaran instan tanpa biaya registrasi.</li><li>Butuh bantuan? Hubungi Customer Service' + (LCFG.waCs ? ' via <a target="_blank" rel="noopener" href="' + esc(waLink(LCFG.waCs, 'Halo, saya butuh bantuan login.')) + '">WhatsApp</a>' : '') + '.</li></ul>'
      : LTAB === 'Teknisi'
        ? '<b>' + ic('wrench', 18) + ' Akun Mitra Teknisi</b><ul><li>Akun dibuat oleh <b>Admin Dispatcher</b> setelah uji sertifikasi kelayakan. Tidak ada pendaftaran mandiri.</li><li>Masuk dengan <b>ID Teknisi + PIN</b>, atau Akun Google yang didaftarkan Admin.</li></ul>' + (wa ? '<a class="rlink" target="_blank" rel="noopener" href="' + esc(wa) + '">' + ic('chat', 16) + ' Daftar Mitra Teknisi</a>' : '<small class="muted">Hubungi Dispatcher untuk mendaftar sebagai mitra.</small>')
        : '<b>' + ic('shield', 18) + ' Akses Dispatcher / Admin</b><ul><li>Akun Admin dikelola oleh pemilik sistem; tidak ada pendaftaran mandiri.</li><li>Masuk dengan <b>Akun Google</b> yang terdaftar sebagai Admin, atau <b>ID + PIN</b>.</li></ul><a class="rlink" href="#" id="darurat">' + ic('lock', 16) + ' Akses darurat pemilik sistem</a>';
  }
  function renderDemo() {
    const list = (LCFG.demo || []).filter(function (d) { return d.role === LTAB; }), box = $('#demoBox'); if (!box) return;
    box.hidden = !list.length; if (!list.length) return;
    $('#demoT').textContent = 'Mode Demo — akun ' + LOGIN[LTAB].demo;
    $('#demoList').innerHTML = list.map(function (d) { return '<button class="demo" data-id="' + esc(d.id) + '"><span class="dav ' + d.role + '">' + ic(roleIco(d.role), 18) + '</span><span><b>' + esc(d.nama) + '</b><small>ID: ' + esc(d.id) + ' • ' + esc(d.info) + '</small></span>' + ic('logout', 16) + '</button>'; }).join('');
  }
  function setTab(role, silent) {
    if (!LOGIN[role]) role = 'Customer'; LTAB = role; LS.set('lastRole', role);
    const R = LOGIN[role];
    $$('.rtab').forEach(function (x) { const on = x.dataset.r === role; x.classList.toggle('on', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; });
    $('#lrole').textContent = R.lbl; $('#lidl').textContent = R.idLabel; $('#lid').placeholder = R.ph; $('#lhint').innerHTML = R.hint; $('#ghint').textContent = R.gHint;
    $('.login-wrap').dataset.role = role; $('#lid').value = ''; $('#lpin').value = '';
    renderRoleInfo(); renderDemo(); if (!silent) $('#lid').focus();
    if (window.google && google.accounts && LCFG.googleClientId) drawGoogle();
  }
  function drawGoogle() {
    const g = $('#gbtn'); if (!g || !(window.google && google.accounts)) return;
    g.innerHTML = ''; google.accounts.id.renderButton(g, { theme: 'outline', size: 'large', text: LOGIN[LTAB].gText, shape: 'pill', width: Math.min(360, g.clientWidth || 320), locale: 'id' });
  }
  App.login = function () {
    const root = $('#root'); document.body.classList.remove('admin');
    root.innerHTML = '<div class="login"><div class="login-wrap">' + loginHtml() + '</div></div>';
    let pesan = null; try { pesan = sessionStorage.getItem('fd-pesan'); sessionStorage.removeItem('fd-pesan'); } catch (e) { }
    if (pesan) $('.login-wrap').insertAdjacentHTML('afterbegin', '<div class="alert ok" id="pesanKeluar" role="status">' + ic('check', 18) + '<div>' + esc(pesan) + '</div></div>');
    $$('.rtab').forEach(function (b, i, all) {
      b.onclick = function () { const pk = $('#pesanKeluar'); if (pk) pk.remove(); setTab(b.dataset.r); };
      b.onkeydown = function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = all[(i + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length]; setTab(n.dataset.r, true); n.focus(); } };
    });
    $('#eye').onclick = function () { const i = $('#lpin'); i.type = i.type === 'password' ? 'text' : 'password'; };
    $('#lupa').onclick = function (e) { e.preventDefault(); modal({ title: 'Lupa PIN / sandi?', foot: false, noFocus: true, body: '<p>' + esc(LOGIN[LTAB].lupa) + '</p>' + (LCFG.waCs ? '<a class="btn accent block" target="_blank" rel="noopener" href="' + esc(waLink(LCFG.waCs, 'Halo, saya lupa PIN akun ' + LOGIN[LTAB].demo + '.')) + '">' + ic('chat', 18) + ' Hubungi lewat WhatsApp</a>' : '') }); };
    $('#lform').onsubmit = function (e) {
      e.preventDefault(); const btn = $('#lgo'), id = $('#lid').value.trim(), pin = $('#lpin').value;
      if (!id) return toast('Isi ' + LOGIN[LTAB].idLabel.split(' / ')[0] + ' Anda.', 'warn');
      if (!/^\d{6}$/.test(pin)) return toast('PIN harus 6 digit angka.', 'warn');
      busy(btn, apiRaw('auth.pin', { id: id, pin: pin, ingat: $('#lrem').checked, peran: LTAB }, '').then(App.afterLogin).catch(loginErr));
    };
    root.addEventListener('click', function (e) {
      const d = e.target.closest('.demo'); if (d) { busy(d, apiRaw('auth.demo', { id: d.dataset.id, peran: LTAB }, '').then(App.afterLogin).catch(loginErr)); return; }
      if (e.target.closest('#darurat')) { e.preventDefault(); daruratDlg(); }
    });
    setTab(LS.get('lastRole', 'Customer'), true);
    // konfigurasi publik: Client ID Google, akun demo, nomor CS
    apiRaw('auth.config', {}, '').then(function (c) {
      LCFG = c; App.pubName = c.appName; $('#lname').textContent = c.appName; document.title = c.appName;
      renderDemo(); renderRoleInfo();
      if (c.googleClientId) initGoogle(c.googleClientId);
      else { $('#gbtn').innerHTML = '<button class="btn secondary block" id="gfallback">' + ic('info', 18) + ' Login Google belum dikonfigurasi</button>'; $('#gfallback').onclick = function () { toast('Admin perlu mengisi Google Client ID di Pengaturan (masuk dulu dengan akses darurat).', 'info'); }; }
    }).catch(function (e) { $('#gbtn').innerHTML = '<div class="alert warn">' + ic('warn') + '<div>' + esc(e.message) + '</div></div>'; });
    App.renderInstall(); App.mountFs(); armExit();
  };
  function loginHtml() {
    return '<div class="card login-h"><div class="hero-row">' + logoSvg + '<div><h1 id="lname">' + esc(App.appName()) + '</h1><p>Servis teknisi peralatan rumah tangga langsung ke lokasi Anda.</p></div></div></div>' +
      '<div class="lbl-row rrow"><b>Pilih Hak Akses Masuk:</b><span class="rlbl" id="lrole">PELANGGAN</span></div>' +
      '<div class="rtabs" role="tablist" aria-label="Peran masuk"><button class="rtab on" role="tab" data-r="Customer" aria-selected="true">' + ic('home', 18) + '<b>Pelanggan</b><small>Rumah & Toko</small></button><button class="rtab" role="tab" data-r="Teknisi" aria-selected="false" tabindex="-1">' + ic('wrench', 18) + '<b>Teknisi</b><small>Mitra Kerja</small></button><button class="rtab" role="tab" data-r="Admin" aria-selected="false" tabindex="-1">' + ic('shield', 18) + '<b>Dispatcher</b><small>Admin Kantor</small></button></div>' +
      '<div class="card"><div class="lbl-row"><span class="eyebrow">' + ic('zap', 14) + ' REKOMENDASI UTAMA</span><small>Otentikasi Instan</small></div><div id="gbtn" class="gbtn"><div class="skeleton" style="height:44px"></div></div>' +
      '<div class="hint">' + ic('shield', 16) + '<span id="ghint"></span></div>' +
      '<div class="or"><span>ATAU MASUK DENGAN ID TERDAFTAR</span></div>' +
      '<form id="lform" autocomplete="on"><label class="lbl" for="lid" id="lidl"></label><div class="inp ico">' + ic('user', 18) + '<input id="lid" autocomplete="username" inputmode="text"></div><small class="fhint" id="lhint"></small>' +
      '<div class="lbl-row"><label class="lbl" for="lpin">PIN Keamanan (6 digit)</label><a href="#" id="lupa" class="lupa">Lupa Sandi?</a></div><div class="inp ico">' + ic('lock', 18) + '<input id="lpin" type="password" inputmode="numeric" maxlength="6" placeholder="••••••" autocomplete="current-password"><button type="button" id="eye" class="icon-btn" aria-label="Tampilkan PIN">' + ic('eye', 18) + '</button></div>' +
      '<label class="chk"><input type="checkbox" id="lrem" checked> Ingat sesi di perangkat ini selama 30 hari</label>' +
      '<button class="btn primary block lg" id="lgo" type="submit">Masuk ke Sistem ' + ic('arrowr', 18) + '</button></form></div>' +
      '<div class="card demo-box" id="demoBox" hidden><div class="demo-h">' + ic('zap', 18) + '<b id="demoT">Mode Demo / Pengujian</b><span class="tag">DEV</span></div><p class="muted sm">Pilih akun contoh untuk mencoba alur tanpa memasukkan kredensial.</p><div id="demoList"></div></div>' +
      '<div class="card info-box" id="rinfo"></div>' +
      '<div class="inst-slot"></div><p class="foot-note">' + ic('lock', 14) + ' Koneksi terenkripsi (HTTPS) • Data tersimpan di Google Sheets</p>';
  }
  function initGoogle(cid) {
    loadScript('https://accounts.google.com/gsi/client').then(function () {
      google.accounts.id.initialize({ client_id: cid, callback: function (r) { busy($('#lgo'), apiRaw('auth.google', { idToken: r.credential, ingat: $('#lrem') ? $('#lrem').checked : false, peran: LTAB }, '').then(App.afterLogin).catch(loginErr)); }, ux_mode: 'popup' });
      drawGoogle();
    }).catch(function () { $('#gbtn').innerHTML = '<div class="alert warn">' + ic('warn') + '<div>Login Google gagal dimuat. Gunakan ID & PIN.</div></div>'; });
  }
  function daruratDlg() {
    modal({ title: 'Akses darurat admin', body: '<p class="muted sm">Hanya untuk mengisi konfigurasi awal (Google Client ID, token WhatsApp) bila login normal belum bisa dipakai.</p><label class="lbl">Nama pengguna</label><div class="inp"><input id="du" autocomplete="off"></div><label class="lbl">Kata sandi</label><div class="inp"><input id="dp" type="password" autocomplete="off"></div>',
      actions: [{ label: 'Batal', cls: 'ghost' }, { label: 'Masuk', cls: 'primary', fn: function (c, b) { busy(b, apiRaw('auth.darurat', { username: $('#du').value, password: $('#dp').value }, '').then(function (r) { c(); return App.afterLogin(r); }).catch(toastErr)); } }] });
  }

  // ------------------------------------------------------------------ PWA: pasang, pembaruan, offline
  let deferred = null;
  const standalone = function () { return (window.matchMedia && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches)) || navigator.standalone === true; };
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone();
  App.canInstall = function () { return !standalone() && (!!deferred || isIOS); };
  App.renderInstall = function () {
    const html = App.canInstall() ? '<button class="inst" data-install>' + logoSvg + '<span><b>Pasang Aplikasi</b><small>' + (isIOS && !deferred ? 'Buka cepat dari layar utama, tanpa browser' : 'Buka instan dari layar utama, bisa dipakai saat sinyal lemah') + '</small></span>' + ic('dl', 20) + '</button>' : '';
    $$('.inst-slot').forEach(function (el) { el.innerHTML = html; });
  };
  App.doInstall = function () {
    if (deferred) { deferred.prompt(); deferred.userChoice.then(function (c) { if (c.outcome === 'accepted') toast('Aplikasi dipasang. Cari ikon FieldTech di layar utama.', 'ok'); deferred = null; App.renderInstall(); }); return; }
    if (isIOS) modal({ title: 'Pasang di iPhone / iPad', foot: false, noFocus: true, body: '<ol class="steps"><li>Buka halaman ini di <b>Safari</b>.</li><li>Ketuk ikon <b>Bagikan</b> ' + ic('ext', 16) + ' di bilah bawah.</li><li>Pilih <b>Tambah ke Layar Utama</b>, lalu ketuk <b>Tambah</b>.</li></ol>' });
  };
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; App.renderInstall(); });
  window.addEventListener('appinstalled', function () { deferred = null; App.renderInstall(); });
  document.addEventListener('click', function (e) { if (e.target.closest('[data-install]')) App.doInstall(); });

  function offBar() { offUI(!navigator.onLine); }
  window.addEventListener('offline', offBar);
  window.addEventListener('online', function () { offBar(); S.epoch++; if (S.token && S.boot) App.refresh().catch(function () { }); }); // segarkan data begitu online kembali

  setInterval(function () { // pemulihan andal walau event 'online' tidak terkirim: coba segarkan selagi bar offline tampil
    const b = $('#offbar'); if (!b || b.hidden || navigator.onLine === false) return;
    if (!S.token) { offUI(false); return; }
    S.epoch++; App.refresh().catch(function () { });
  }, 4000);

  function registerSW() {
    if (!('serviceWorker' in navigator) || location.protocol.indexOf('http') !== 0) return;
    const had = !!navigator.serviceWorker.controller; let reloading = false;
    navigator.serviceWorker.addEventListener('message', function (e) { if (e.data && e.data.type === 'open' && e.data.url && e.data.url.indexOf('#') > -1) location.hash = e.data.url.slice(e.data.url.indexOf('#') + 1); }); // klik notifikasi tugas → buka tugas
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (!had || reloading) return; reloading = true; location.reload(); });
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(function (reg) {
      const ask = function (w) { toast('Versi baru aplikasi tersedia.', 'info', { label: 'Perbarui', fn: function () { w.postMessage('SKIP_WAITING'); } }); };
      if (reg.waiting && navigator.serviceWorker.controller) ask(reg.waiting);
      reg.addEventListener('updatefound', function () { const w = reg.installing; if (w) w.addEventListener('statechange', function () { if (w.state === 'installed' && navigator.serviceWorker.controller) ask(w); }); });
      setInterval(function () { reg.update().catch(function () { }); }, 3600e3);
    }).catch(function () { });
  }

  // Splash: tampil minimal 2 detik (0,7 dtk jika pengguna mengurangi gerakan), lalu memudar
  function hideSplash() { const s = $('#splash'); if (!s) return; s.classList.add('out'); setTimeout(function () { s.remove(); }, 500); }
  document.addEventListener('DOMContentLoaded', function () {
    registerSW(); offBar();
    const t0 = Date.now(), kurangiGerak = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    App.start();
    setTimeout(hideSplash, Math.max(0, (kurangiGerak ? 700 : 5000) - (Date.now() - t0)));
  });
})();
