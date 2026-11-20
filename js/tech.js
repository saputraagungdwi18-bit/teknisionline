/* FieldTech Direct — tech.js : W-05 Tugas Hari Ini, W-06 Detail & Check-in GPS, W-07 Dokumentasi, Peta */
(function () {
  'use strict';
  const R = Router, Tech = window.Tech = { pos: null };
  const tugas = function () { return (S.boot && S.boot.tugas) || []; };
  const put = function (b) { const l = S.boot.tugas, i = l.findIndex(function (x) { return x.id === b.id; }); if (i > -1) l[i] = b; else l.push(b); App.persist(); };
  const isAct = function (b) { return b.status === 'On_The_Way' || b.status === 'Working'; };

  // ------------------------------------------------------------------ pelacakan GPS latar (hanya saat tab terbuka)
  let tm = null;
  function pill(p, err) {
    const el = $('#gpsPill'); if (!el) return; el.className = 'gps-pill ' + (err ? 'bad' : 'ok');
    el.lastElementChild.textContent = err ? 'GPS Mati' : 'GPS Aktif • ±' + p.akurasi + 'm';
  }
  App.startTech = function () {
    App.stopTech();
    const tick = function () {
      if (document.visibilityState !== 'visible' || !S.boot || !S.boot.tech) { sched(); return; }
      const active = tugas().some(isAct), st = S.boot.tech.status;
      getPos().then(function (p) { Tech.pos = p; pill(p); if (st !== 'Off') apiRaw('tech.ping', p).catch(function () { }); }).catch(function () { pill(null, true); }).finally(sched);
    };
    const sched = function () { const active = S.boot && tugas().some(isAct); tm = setTimeout(tick, active ? 20000 : 120000); };
    tick();
  };
  App.stopTech = function () { clearTimeout(tm); tm = null; };

  function sorted(l) { const o = { On_The_Way: 0, Working: 0, Assigned: 1, Completed: 2, Canceled: 3, Pending: 1 }; return l.slice().sort(function (a, b) { return (o[a.status] - o[b.status]) || ((a.tanggal + a.slot) < (b.tanggal + b.slot) ? -1 : 1); }); }
  function distTxt(b) { if (!Tech.pos || b.lat == null) return ''; const k = jarakKm(Tech.pos.lat, Tech.pos.lng, b.lat, b.lng); return k == null ? '' : k.toFixed(1).replace('.', ',') + ' km dari posisi Anda' + (isAct(b) ? ' • Est. ' + Math.max(1, Math.round(k * 1.3 / Number(S.cfg.Kecepatan_Rata_Kmj || 22) * 60)) + ' mnt perjalanan' : ''); }
  function refreshList() { return api('tugas.list').then(function (r) { S.boot.tugas = r.tugas; S.boot.tech = r.tech; App.persist(); return r; }); }

  // ====================================================================== W-05
  R.routes['/tugas'] = {
    title: 'Tugas', prefetch: function () { refreshList().catch(function () { }); },
    render: function (v, params) {
      if (params[0]) return detail(v, params[0]);
      App.title('Tugas'); let f = 'all'; const live = alive();
      v.innerHTML = '<div class="pad stack" id="tg"></div>';
      const SW = [['Available', 'Siap Kerja', 'ok'], ['On-Duty', 'Bertugas', 'duty'], ['Off', 'Istirahat', 'off']];
      function draw() {
        if (!live()) return;
        const l = tugas(), t = S.boot.tech || { status: 'Off' }, done = l.filter(function (b) { return b.status === 'Completed'; }), wait = l.filter(function (b) { return b.status === 'Assigned' || b.status === 'Pending'; }), act = l.filter(isAct);
        let rows = sorted(l).filter(function (b) { return f === 'all' || (f === 'run' && isAct(b)) || (f === 'next' && b.status === 'Assigned') || (f === 'done' && b.status === 'Completed'); });
        $('#tg', v).innerHTML =
          '<section><h1 class="h1">Halo, ' + esc((S.me.nama || '').split(' ')[0]) + ' 👋</h1><p class="muted">' + ic('cal', 14) + ' ' + hariPanjang() + (S.me.hub ? ' • ' + esc(S.me.hub) : '') + '</p></section>' +
          '<section class="card"><div class="row between"><span class="eyebrow">' + ic('gps', 14) + ' STATUS KERJA ANDA</span><small class="ok-t">Tersinkronisasi</small></div><div class="seg" id="seg">' + SW.map(function (s) { return '<button data-s="' + s[0] + '" class="' + (t.status === s[0] ? 'on ' + s[2] : '') + '"><i></i>' + s[1] + '</button>'; }).join('') + '</div></section>' +
          '<div class="tiles"><div><small>Total</small><b>' + l.length + ' Tugas</b><em>Hari ini</em></div><div class="ok"><small>Selesai ' + ic('check', 14) + '</small><b>' + done.length + ' Order</b><em>' + (l.length ? Math.round(done.length / l.length * 100) : 0) + '% Beres</em></div><div class="ind"><small>Menunggu ' + ic('clock', 14) + '</small><b>' + wait.length + ' Antrean</b><em>' + act.length + ' Aktif</em></div></div>' +
          '<div class="chips scroll">' + [['all', 'Semua (' + l.length + ')'], ['run', 'Sedang Berjalan (' + act.length + ')'], ['next', 'Berikutnya (' + wait.length + ')'], ['done', 'Selesai (' + done.length + ')']].map(function (x) { return '<button class="chip ' + (f === x[0] ? 'sel' : '') + '" data-f="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
          (rows.length ? rows.map(card).join('') : empty('list', 'Tidak ada tugas', 'Tidak ada tugas pada filter ini. Nikmati waktu istirahat Anda.'));
        lazyProfil(v);
      }
      function card(b) {
        const col = { Assigned: 'assigned', On_The_Way: 'otw', Working: 'working', Completed: 'done', Canceled: 'cancel', Pending: 'pending' }[b.status], d = distTxt(b);
        return '<article class="tk ' + col + '" data-id="' + b.id + '"><div class="row between"><span class="slotp ' + (isAct(b) ? 'on' : '') + '">' + ic('clock', 14) + ' ' + esc(b.slot.replace(/\./g, '.')) + ' WIB' + (b.tanggal !== todayStr() ? ' • ' + tglID(b.tanggal) : '') + '</span>' + badge(b.status) + '</div>' +
          '<h3 class="' + (b.status === 'Completed' ? 'strike' : '') + '">' + esc(b.layanan) + '</h3><small class="mono muted">#' + esc(b.id) + '</small>' +
          '<div class="cbox"><div class="row gap">' + avPhoto(b.cust.nama, b.cust.id, b.cust.fotoAda, 36) + '<div class="grow"><b>' + esc(b.cust.nama) + '</b><small class="muted">' + esc(b.jenisAlamat) + '</small></div>' + (b.cust.hp && b.status !== 'Completed' ? '<a class="rbtn ok" href="tel:+' + esc(b.cust.hp) + '" aria-label="Telepon">' + ic('phone', 18) + '</a>' : '') + '</div>' +
          '<div class="row gap sm">' + ic('pin', 16) + '<span>' + esc(b.alamat) + '</span></div>' + (d ? '<small class="ind-t">' + ic('nav', 14) + ' ' + d + '</small>' : '') +
          (b.status === 'Completed' ? '<div class="row between sm"><span>Lunas ' + rp(b.total) + ' (Tunai/COD)</span><span class="ok-t">' + ic('shield', 14) + ' GPS Verified</span></div>' : '') + '</div>' +
          '<a class="btn ' + (isAct(b) ? 'primary' : 'secondary') + ' block" href="#/tugas/' + b.id + '">' + (isAct(b) ? 'Lanjutkan Tugas & Navigasi ' + ic('arrowr', 18) : ic('eye', 18) + ' Buka Detail Tugas') + '</a></article>';
      }
      v.addEventListener('click', function (e) {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.f) { f = b.dataset.f; draw(); }
        else if (b.dataset.s) {
          const t = S.boot.tech, prev = t.status; if (prev === b.dataset.s) return;
          if (b.dataset.s === 'Off' && tugas().some(isAct)) return toast('Selesaikan tugas yang sedang berjalan sebelum istirahat.', 'warn');
          t.status = b.dataset.s; draw(); App.persist();
          act('tech.status', { status: b.dataset.s }).then(function () { toast('Status kerja: ' + STATUS[b.dataset.s][0], 'ok'); }).catch(function (er) { t.status = prev; draw(); toastErr(er); });
        }
      });
      draw();
      const stop = poll(function () { return refreshList().then(draw); }, 30);
      refreshList().then(draw).catch(function (e) { toastErr(e, function () { R.render(); }); });
      return stop;
    }
  };

  // ====================================================================== W-06 / W-07 DETAIL
  function detail(v, id) {
    let b = tugas().find(function (x) { return x.id === id; });
    App.title('Detail Servis');
    if (!b) { v.innerHTML = '<div class="pad">' + skel(3, 100) + '</div>'; }
    let logs = null, map = null, mkT = null, stopped = false, stopPoll = null, noteT = null, saving = false;
    const local = { sebelum: [], sesudah: [] }; // placeholder unggahan {key,url,prog}

    function nextAction() {
      if (b.status === 'Assigned') return { aksi: 'mulai', label: 'Mulai Perjalanan', ico: 'nav', cls: 'primary' };
      if (b.status === 'On_The_Way' && !b.tiba) return { aksi: 'tiba', label: 'Tiba di Lokasi (Check-in GPS)', ico: 'gps', cls: 'primary' };
      if (b.status === 'On_The_Way') return { aksi: 'kerja', label: 'Mulai Kerja', ico: 'wrench', cls: 'primary' };
      if (b.status === 'Working') return { aksi: 'selesai', label: 'Selesaikan & Cetak BA', ico: 'check', cls: 'accent' };
      return null;
    }
    const docOpen = function () { return b.status === 'Working' || (b.status === 'On_The_Way' && b.tiba); };
    const lim = function () { return Math.round(b.harga * Number(S.cfg.Batas_Biaya_Tambahan_Persen || 20) / 100); };

    function hintInner(over) {
      return ic('info', 14) + (over ? ' Melebihi batas ' + rp(lim()) + ' — perlu persetujuan admin' + (b.persetujuan === 'Menunggu' ? ' (menunggu…)' : b.persetujuan === 'Disetujui' ? ' (disetujui ✓)' : b.persetujuan === 'Ditolak' ? ' (ditolak)' : '') : ' Biaya tambahan di bawah batas ' + rp(lim()) + ' otomatis masuk ke tagihan akhir.');
    }
    function billInner(exVal, over) {
      const hold = over && b.persetujuan !== 'Disetujui', tot = b.harga + b.transport + (hold ? 0 : exVal);
      return '<h4>Ringkasan Tagihan Pelanggan</h4><div><span>Tarif Servis Dasar</span><b>' + rp(b.harga) + '</b></div><div><span>Biaya Transport / Peralatan</span><b>' + rp(b.transport) + '</b></div>' + (exVal ? '<div class="' + (hold ? 'dim' : '') + '"><span>Biaya Tambahan</span><b>' + rp(exVal) + '</b></div>' : '') + '<div class="tot"><span>Total Tagihan Final<small>COD / Bayar di Tempat</small></span><b>' + rp(tot) + '</b></div><div class="pay">' + ic('wallet', 16) + 'Metode: Tunai / QRIS langsung ke teknisi <em>Siap Terima</em></div>';
    }
    function liveBill() { // hitung ulang seketika di klien (tanpa menunggu server)
      const on = $('#cx', v) && $('#cx', v).checked, ex = on ? angkaVal($('#tx', v).value) : 0, over = ex > lim();
      const bl = $('#bill', v), h = $('#hint', v); if (bl) bl.innerHTML = billInner(ex, over); if (h) { h.className = over ? 'warn-t' : 'muted'; h.innerHTML = hintInner(over); }
    }
    function slots(jenis, ids) {
      const arr = ids.map(function (f) { return '<div class="th"><img data-b="' + b.id + '" data-f="' + f + '" alt="Foto ' + jenis + '"><button class="del" data-del="' + f + '" data-j="' + jenis + '" aria-label="Hapus foto">' + ic('trash', 14) + '</button></div>'; })
        .concat(local[jenis].map(function (p) { return '<div class="th"><img src="' + p.url + '" alt=""><div class="prog"><i style="width:' + p.prog + '%"></i></div></div>'; }));
      if (ids.length + local[jenis].length < 3) arr.push('<label class="th add">' + ic('camera', 22) + '<small>+ Tambah</small><input type="file" accept="image/*" capture="environment" data-up="' + jenis + '" hidden></label>');
      return arr.join('');
    }
    function draw() {
      const na = nextAction(), fin = b.status === 'Completed', base = b.harga + b.transport, ex = $('#tx', v) ? angkaVal($('#tx', v).value) : b.tambahan, useEx = $('#cx', v) ? $('#cx', v).checked : b.tambahan > 0;
      const keepNote = $('#cat', v) ? $('#cat', v).value : b.catatan, keepPart = $('#px', v) ? $('#px', v).value : b.namaPart;
      const exVal = useEx ? ex : 0, over = exVal > lim(), tot = base + (over && b.persetujuan !== 'Disetujui' ? 0 : exVal);
      const ready = b.fotoSebelum.length + local.sebelum.length >= 1 && b.fotoSesudah.length + local.sesudah.length >= 1;
      v.innerHTML = '<div class="pad stack" id="dt">' +
        '<section class="card"><div class="row between"><span class="mono2">#' + esc(b.id) + '</span>' + badge(b.status) + '</div><h2 class="h2">' + esc(b.layanan) + '</h2><small class="muted">' + ic('clock', 14) + ' ' + hariLabel(b.tanggal) + ' • ' + esc(b.slot) + ' • <span class="ok-t">GARANSI AKTIF</span></small></section>' +
        (b.status === 'Assigned' ? '<div class="alert info">' + ic('info') + '<div><b>Siap berangkat?</b><br>Tekan "Mulai Perjalanan" agar pelanggan mendapat notifikasi dan posisi Anda terlacak.</div></div>' : '') +
        (b.status === 'On_The_Way' && !b.tiba ? '<div class="alert info">' + ic('info') + '<div><b>Prosedur Presensi Kedatangan</b><br>Tekan "Tiba di Lokasi" saat berada dalam radius &lt;' + esc(S.cfg.Jarak_Maks_Checkin || 150) + ' m dari titik pelanggan untuk validasi otomatis.</div></div>' : '') +
        (b.verifikasi === 'TRUE' ? '<div class="alert warn">' + ic('warn') + '<div>Check-in Anda tercatat ' + (b.jarakTiba || '?') + ' m dari titik pelanggan dan ditandai <b>perlu verifikasi</b> admin.</div></div>' : '') +
        '<section class="card"><div class="row gap">' + avPhoto(b.cust.nama, b.cust.id, b.cust.fotoAda, 48, 'ind') + '<div class="grow"><b class="lg">' + esc(b.cust.nama) + '</b><small class="ok-t">' + ic('shield', 13) + ' Pelanggan Terverifikasi</small></div><span class="pill ind">' + esc(b.jenisAlamat) + '</span></div>' +
        '<div class="grid2"><a class="btn secondary" href="tel:+' + esc(b.cust.hp) + '">' + ic('phone', 18) + ' ' + esc(b.cust.hp ? '+' + b.cust.hp.slice(0, 5) + 'xxxx' : 'Telepon') + '</a><a class="btn accent" target="_blank" rel="noopener" href="' + waLink(b.cust.hp, 'Halo, saya teknisi untuk pesanan #' + b.id) + '">' + ic('chat', 18) + ' WhatsApp</a></div>' + Chat.btn(b.id, 'Chat Pelanggan') +
        '<div class="addrbox">' + ic('pin', 16) + '<div><small>Alamat Pengerjaan</small><b>' + esc(b.alamat) + '</b>' + (b.patokan ? '<small>Patokan: ' + esc(b.patokan) + '</small>' : '') + '</div></div>' +
        '<h4>' + ic('warn', 16) + ' Keluhan Masalah Pelanggan:</h4><blockquote>“' + esc(b.keluhan) + '”</blockquote>' +
        (b.fotoBukti.length ? '<div class="thumbs sm">' + b.fotoBukti.map(function (f) { return '<div class="th"><img data-b="' + b.id + '" data-f="' + f + '" alt="Foto dari klien"></div>'; }).join('') + '</div><small class="muted">Foto unit dari klien • ketuk untuk memperbesar</small>' : '') + '</section>' +
        (fin || b.status === 'Canceled' ? '' : '<section class="card"><div class="row between"><h3>' + ic('nav', 18) + ' Rute Perjalanan & GPS</h3><span class="live">Live Tracking</span></div><div class="mapw"><div id="dmap" class="map"><div class="skeleton fill"></div></div><div class="mapo" id="dmo"></div></div><a class="btn secondary block" target="_blank" rel="noopener" href="' + mapsLink(b.lat, b.lng) + '">' + ic('nav', 18) + ' Buka Google Maps / Waze ' + ic('ext', 14) + '</a><div class="note">' + ic('gps', 16) + ' Batas toleransi radius check-in tiba di lokasi: <b>' + esc(S.cfg.Jarak_Maks_Checkin || 150) + ' meter</b> dari titik koordinat pelanggan.</div><div id="gpsm"></div></section>') +
        (docOpen() ? '<section class="card"><div class="alert info">' + ic('shield') + '<div><b>Ketentuan Bukti Kerja Lapangan (SOP)</b><br>Wajib unggah minimal 1 foto unit sebelum pengerjaan dan minimal 1 foto hasil setelah perbaikan sebelum menyelesaikan tugas.</div></div>' +
          '<h4>Foto Sebelum Perbaikan <small>(' + (b.fotoSebelum.length + local.sebelum.length) + '/3)</small></h4><div class="thumbs grid3" id="g1">' + slots('sebelum', b.fotoSebelum) + '</div>' +
          '<h4>Foto Sesudah Perbaikan <small>(' + (b.fotoSesudah.length + local.sesudah.length) + '/3)</small> ' + (b.fotoSesudah.length ? '' : '<span class="pill warn">Wajib Diisi</span>') + '</h4><div class="thumbs grid3" id="g2">' + slots('sesudah', b.fotoSesudah) + '</div>' +
          '<h4>Catatan Pengerjaan & Diagnosa <small id="ccnt">0/500</small></h4><textarea id="cat" class="ta" maxlength="500" placeholder="Tulis diagnosa dan tindakan yang dilakukan…">' + esc(keepNote) + '</textarea><small class="ok-t" id="saved"></small>' +
          '<label class="chk big"><input type="checkbox" id="cx" ' + (useEx ? 'checked' : '') + '> <span>' + ic('wrench', 16) + ' <b>Ada Komponen / Part Tambahan?</b></span></label>' +
          '<div id="exbox" ' + (useEx ? '' : 'hidden') + '><label class="lbl">Nama Part / Tindakan Tambahan</label><div class="inp"><input id="px" maxlength="100" value="' + esc(keepPart) + '"></div><label class="lbl">Nominal Biaya Tambahan</label><div class="inp ico"><b>Rp</b><input id="tx" inputmode="numeric" value="' + (ex ? String(ex).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '') + '"></div>' +
          '<small id="hint" class="' + (over ? 'warn-t' : 'muted') + '">' + hintInner(over) + '</small></div>' +
          '<div class="bill" id="bill">' + billInner(exVal, over) + '</div></section>' : '') +
        (fin ? '<section class="card"><div class="alert ok">' + ic('check') + '<div><b>Tugas selesai</b><br>Total ' + rp(b.total) + ' • ' + tglJam(b.selesai) + '</div></div><button class="btn secondary block" id="bBap">' + ic('dl', 18) + ' Cetak Berita Acara (PDF)</button></section>' : '') +
        '<section class="card"><h3>' + ic('clock', 18) + ' Log Aktivitas & GPS <small class="muted">Update Otomatis</small></h3><div id="lg">' + (logs ? logHtml() : skel(2, 50)) + '</div></section></div>' +
        (na ? '<div class="sticky-bar">' + (na.aksi === 'selesai' ? '<button class="btn ghost" id="bDraft">Simpan Draf</button>' : '') + '<button class="btn ' + na.cls + ' grow lg" id="bAksi" ' + (na.aksi === 'selesai' && !ready ? 'disabled' : '') + '>' + ic(na.ico, 18) + ' ' + na.label + '</button></div>' : '<div class="sticky-bar"><a class="btn ghost grow" href="#/tugas">Kembali ke daftar tugas</a></div>');
      $('#ccnt', v) && ($('#ccnt', v).textContent = ($('#cat', v).value.length) + '/500');
      lazyFoto(v); lazyProfil(v); bind(); mapUpdate(true);
    }
    function logHtml() {
      if (!logs.length) return '<p class="muted">Belum ada log.</p>';
      return '<div class="tl">' + logs.filter(function (l) { return l.s !== 'Foto'; }).map(function (l, i) { return '<div class="tli ' + (i === 0 ? 'now' : '') + '"><i></i><div><small class="mono">' + jam(l.t) + ' • [' + (l.lat != null ? 'GPS RECORDED' : 'SYSTEM') + ']' + (l.flag ? ' <span class="pill warn">' + esc(l.flag.replace('_', ' ')) + '</span>' : '') + '</small><p><b>Status: ' + esc(l.s) + '</b></p>' + (l.lat != null ? '<small class="mono muted">Lat ' + l.lat.toFixed(6) + ', Long ' + l.lng.toFixed(6) + (l.ak != null ? ' • Akurasi ' + l.ak + ' m' : '') + '</small>' : '') + (l.cat ? '<small class="muted">' + esc(l.cat) + '</small>' : '') + '</div></div>'; }).join('') + '</div>';
    }
    function mapUpdate(first) {
      const el = $('#dmap', v); if (!el || b.lat == null) return;
      const go = function () {
        const dest = [b.lat, b.lng], me = Tech.pos ? [Tech.pos.lat, Tech.pos.lng] : null;
        if (!map) return;
        if (!map._d) { map._d = L.marker(dest, { icon: mkHome() }).addTo(map); }
        if (me) { if (!mkT) { mkT = L.marker(me, { icon: mkTech('On-Duty', '', true) }).addTo(map); map.fitBounds([me, dest], { padding: [50, 50], maxZoom: 16 }); } else glide(mkT, me); } else if (first) map.setView(dest, 15);
        const o = $('#dmo', v); if (o) { const k = me ? jarakKm(me[0], me[1], dest[0], dest[1]) : null; o.innerHTML = k != null ? '<b>' + k.toFixed(1).replace('.', ',') + ' km</b><small>Sisa waktu ±' + Math.max(1, Math.round(k * 1.3 / Number(S.cfg.Kecepatan_Rata_Kmj || 22) * 60)) + ' mnt</small>' : '<small>Mencari sinyal GPS…</small>'; }
      };
      if (map && map.getContainer() !== el) { map.remove(); map = null; mkT = null; }
      if (map) return go();
      newMap(el, b.lat, b.lng, 15).then(function (m) { if (stopped) { m.remove(); return; } map = m; mkT = null; L.control.zoom({ position: 'bottomright' }).addTo(m); go(); });
    }
    function loadLogs() { return api('booking.get', { id: id }).then(function (r) { if (stopped) return; const old = JSON.stringify([b, logs]); put(r.b); b = r.b; logs = r.logs; if (JSON.stringify([b, logs]) !== old) { if ($('#lg', v) && !(docOpen() && document.activeElement && /TEXTAREA|INPUT/.test(document.activeElement.tagName))) { const prevStatus = old; draw(); } else if ($('#lg', v)) $('#lg', v).innerHTML = logHtml(); } }); }

    // ---- aksi
    async function aksi() {
      const na = nextAction(), btn = $('#bAksi', v); if (!na) return;
      const payload = { id: b.id, aksi: na.aksi };
      if (na.aksi === 'selesai') { payload.catatan = $('#cat', v).value; payload.namaPart = $('#cx', v).checked ? $('#px', v).value : ''; payload.biayaTambahan = $('#cx', v).checked ? angkaVal($('#tx', v).value) : 0; }
      busy(btn, (async function () {
        try {
          if (na.aksi === 'mulai' || na.aksi === 'tiba') { $('#gpsm', v) && ($('#gpsm', v).innerHTML = ''); const p = await getPos(); Object.assign(payload, p); Tech.pos = p; pill(p); }
          let r = await act('tugas.aksi', payload);
          if (r && r.needConfirm) {
            const y = await confirmDlg('Anda masih ' + r.jarak + ' meter dari lokasi pelanggan (batas ' + r.batas + ' m). Lanjutkan check-in? Catatan akan ditandai "perlu verifikasi" oleh Admin.', { title: 'Di luar radius', ok: 'Lanjutkan', batal: 'Batal' });
            if (!y) return; payload.konfirmasi = true; r = await act('tugas.aksi', payload);
          }
          put(r); b = r; toast(na.aksi === 'selesai' ? 'Tugas selesai. Terima kasih!' : na.aksi === 'mulai' ? 'Perjalanan dimulai. Posisi Anda kini terlacak.' : na.aksi === 'tiba' ? 'Check-in berhasil.' : 'Pengerjaan dimulai.', 'ok');
          if (na.aksi === 'selesai') { App.refresh().catch(function () { }); }
          loadLogs(); draw();
        } catch (e) {
          if (e.code === 'GPS') { const g = $('#gpsm', v); if (g) g.innerHTML = gpsKartu(e.message); toastErr(e); } else toastErr(e);
        }
      })());
    }
    function simpan(silent) {
      const p = { id: b.id, catatan: $('#cat', v).value, namaPart: $('#cx', v).checked ? $('#px', v).value : '', biayaTambahan: $('#cx', v).checked ? angkaVal($('#tx', v).value) : 0 };
      saving = true;
      return act('tugas.simpan', p).then(function (nb) { put(nb); b.persetujuan = nb.persetujuan; b.tambahan = nb.tambahan; b.total = nb.total; b.catatan = nb.catatan; saving = false; const s = $('#saved', v); if (s) s.innerHTML = ic('check', 14) + ' Tersimpan otomatis di cloud'; if (!silent) toast(nb.persetujuan === 'Menunggu' ? 'Disimpan. Biaya tambahan menunggu persetujuan admin.' : 'Draf tersimpan.', nb.persetujuan === 'Menunggu' ? 'warn' : 'ok'); }).catch(function (e) { saving = false; if (!silent) toastErr(e); });
    }
    async function upload(file, jenis) {
      const key = uid(); let k;
      try { k = await kompres(file); } catch (e) { return toastErr(e); }
      const ph = { key: key, url: k.dataUrl, prog: 15 }; local[jenis].push(ph); const grid = $(jenis === 'sebelum' ? '#g1' : '#g2', v); grid.innerHTML = slots(jenis, jenis === 'sebelum' ? b.fotoSebelum : b.fotoSesudah); lazyFoto(grid);
      const tick = setInterval(function () { ph.prog = Math.min(90, ph.prog + 12); const i = $$('.prog i', grid).pop(); if (i) i.style.width = ph.prog + '%'; }, 400);
      try {
        const r = await act('foto.upload', { id: b.id, jenis: jenis, nama: k.nama, mime: k.mime, data: k.data });
        fotoSet(b.id, r.id, k.dataUrl);
        if (jenis === 'sebelum') b.fotoSebelum = r.list; else b.fotoSesudah = r.list; put(b);
      } catch (e) { toastErr(e); }
      clearInterval(tick); local[jenis] = local[jenis].filter(function (x) { return x.key !== key; });
      const keep = { cat: $('#cat', v).value }; draw(); if ($('#cat', v)) $('#cat', v).value = keep.cat;
    }
    function bind() {
      const a = $('#bAksi', v); if (a) a.onclick = aksi;
      const d = $('#bDraft', v); if (d) d.onclick = function () { busy(d, simpan(false)); };
      const bp = $('#bBap', v); if (bp) bp.onclick = function () { busy(bp, bapPdf(b)); };
      $$('img', v).forEach(function (im) { im.onclick = function () { if (im.src && im.closest('.th') && !im.closest('.add')) lightbox(im.src); }; });
      $$('[data-up]', v).forEach(function (i) { i.onchange = function () { if (i.files[0]) upload(i.files[0], i.dataset.up); }; });
      $$('[data-del]', v).forEach(function (x) { x.onclick = function (e) { e.stopPropagation(); confirmDlg('Hapus foto ini?', { ok: 'Hapus', danger: true }).then(function (y) { if (!y) return; act('foto.hapus', { id: b.id, jenis: x.dataset.j, fileId: x.dataset.del }).then(function (r) { if (x.dataset.j === 'sebelum') b.fotoSebelum = r.list; else b.fotoSesudah = r.list; put(b); draw(); }).catch(toastErr); }); }; });
      const cat = $('#cat', v); if (cat) cat.oninput = function () { $('#ccnt', v).textContent = cat.value.length + '/500'; clearTimeout(noteT); const s = $('#saved', v); if (s) s.textContent = 'Menyimpan…'; noteT = setTimeout(function () { simpan(true); }, 1500); };
      const cx = $('#cx', v); if (cx) { cx.onchange = function () { $('#exbox', v).hidden = !cx.checked; liveBill(); simpan(true).then(liveBill); }; const tx = $('#tx', v); angka(tx); tx.oninput = function () { liveBill(); clearTimeout(noteT); noteT = setTimeout(function () { simpan(true).then(liveBill); }, 1200); }; const px = $('#px', v); px.onchange = function () { simpan(true); }; }
    }
    if (b) draw();
    api('booking.get', { id: id }).then(function (r) { if (stopped) return; put(r.b); b = r.b; logs = r.logs; draw(); }).catch(function (e) { v.innerHTML = '<div class="pad">' + empty('warn', 'Tugas tidak ditemukan', e.message, '<a class="btn primary" href="#/tugas">Kembali</a>') + '</div>'; });
    stopPoll = poll(function () { if (b && isAct(b) || (b && b.status === 'Assigned')) return loadLogs(); }, 25);
    const stopPos = poll(function () { mapUpdate(false); }, 10);
    return function () { stopped = true; clearTimeout(noteT); if (stopPoll) stopPoll(); stopPos(); if (map) map.remove(); };
  }

  // ====================================================================== PETA TEKNISI
  R.routes['/peta'] = {
    title: 'Peta', prefetch: function () { loadMap().catch(function () { }); },
    render: function (v) {
      App.title('Peta'); let map = null, stopped = false, mkMe = null;
      const list = sorted(tugas()).filter(function (b) { return b.status !== 'Canceled' && b.lat != null; });
      v.innerHTML = '<div class="pad stack"><section class="card"><div class="mapw tall"><div id="pm" class="map"><div class="skeleton fill"></div></div></div></section>' +
        (list.length ? list.map(function (b, i) { return '<article class="tk ' + ({ Assigned: 'assigned', On_The_Way: 'otw', Working: 'working', Completed: 'done' }[b.status]) + '"><div class="row between"><b>' + (i + 1) + '. ' + esc(b.layanan) + '</b>' + badge(b.status) + '</div><small class="muted">' + esc(b.slot) + ' • ' + esc(b.alamat) + '</small><div class="grid2"><button class="btn secondary sm" data-f="' + b.id + '">' + ic('locate', 16) + ' Fokus</button><a class="btn primary sm" target="_blank" rel="noopener" href="' + mapsLink(b.lat, b.lng) + '">' + ic('nav', 16) + ' Navigasi</a></div></article>'; }).join('') : empty('map', 'Belum ada lokasi tugas', 'Lokasi tugas hari ini akan tampil di peta.')) + '</div>';
      const mks = {};
      newMap($('#pm', v), Number(S.cfg.Pusat_Lat || -6.2), Number(S.cfg.Pusat_Long || 106.8), 12).then(function (m) {
        if (stopped) { m.remove(); return; } map = m; L.control.zoom({ position: 'topright' }).addTo(m);
        const pts = list.map(function (b, i) { const mk = L.marker([b.lat, b.lng], { icon: divIcon('<b>' + (i + 1) + '</b>', 'mk-home', 34) }).addTo(m); mk.bindPopup('<b>' + esc(b.layanan) + '</b><br>' + esc(b.cust.nama)); mks[b.id] = mk; return [b.lat, b.lng]; });
        const upd = function () { if (Tech.pos) { const ll = [Tech.pos.lat, Tech.pos.lng]; if (!mkMe) { mkMe = L.marker(ll, { icon: mkTech('On-Duty', '', true) }).addTo(m); pts.push(ll); if (pts.length) m.fitBounds(pts, { padding: [40, 40], maxZoom: 15 }); } else glide(mkMe, ll); } else if (pts.length && !mkMe && !m._fit) { m._fit = 1; m.fitBounds(pts, { padding: [40, 40], maxZoom: 15 }); } };
        upd(); m._t = poll(function () { upd(); }, 10);
      });
      v.addEventListener('click', function (e) { const b = e.target.closest('[data-f]'); if (b && mks[b.dataset.f] && map) { map.setView(mks[b.dataset.f].getLatLng(), 16); mks[b.dataset.f].openPopup(); window.scrollTo(0, 0); } });
      return function () { stopped = true; if (map) { if (map._t) map._t(); map.remove(); } };
    }
  };
})();
