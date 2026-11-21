/* FieldTech Direct — admin.js : W-08 Dashboard, W-09 Papan Penugasan, W-10 Peta Live, W-11/12 Katalog,
 * W-13 Laporan & Ekspor, Pengguna & Teknisi, Pengaturan (rahasia, demo, import data lama) */
(function () {
  'use strict';
  const R = Router, ACTIVE = ['Pending', 'Assigned', 'On_The_Way', 'Working'];
  const bks = function () { return (S.boot && S.boot.bookings) || []; };
  const techs = function () { return (S.boot && S.boot.techs) || []; };
  const sec = function (k, d) { return Number(S.cfg[k] || d); };
  const own = function (fn) { App.editing = true; return function () { App.editing = false; fn && fn(); }; };
  const putB = function (b) { const l = S.boot.bookings, i = l.findIndex(function (x) { return x.id === b.id; }); if (i > -1) l[i] = b; else l.unshift(b); App.persist(); if (App.badgeUpd) App.badgeUpd(); };
  const field = function (l, h, id) { return '<label class="lbl"' + (id ? ' for="' + id + '"' : '') + '>' + l + '</label>' + h; };
  const hari = function (tgl) { return ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][new Date(tgl + 'T00:00:00').getDay()]; };
  const kpi = function (ico, lbl, val, unit, sub, cls) { return '<div class="kpi ' + (cls || '') + '"><div class="row between"><small>' + lbl + '</small><span class="kic">' + ic(ico, 20) + '</span></div><div class="kv"><b>' + val + '</b>' + (unit ? '<span>' + unit + '</span>' : '') + '</div><div class="ks">' + sub + '</div></div>'; };
  function refreshBoot() { return App.refresh().then(function () { if (App.badgeUpd) App.badgeUpd(); }); }

  // ====================================================================== W-08 DASHBOARD
  R.routes['/dashboard'] = {
    title: 'Dashboard', prefetch: function () { api('admin.dashboard').catch(function () { }); },
    render: function (v) {
      App.title('Dashboard Utama'); const done = own(), live = alive();
      const WARNA = { Completed: '#10B981', Working: '#8B5CF6', On_The_Way: '#3B82F6', Assigned: '#6366F1', Pending: '#F59E0B' };
      function draw() {
        if (!live()) return;
        const d = S.boot.dash; if (!d) { v.innerHTML = '<div class="pad">' + skel(4, 120) + '</div>'; return; }
        const dl = d.masukKemarin ? Math.round((d.masuk - d.masukKemarin) / d.masukKemarin * 1000) / 10 : (d.masuk ? 100 : 0), mx = Math.max.apply(null, d.seri.map(function (s) { return s.n; }).concat([1]));
        const tot = Object.keys(WARNA).reduce(function (s, k) { return s + (d.sebaran[k] || 0); }, 0); let acc = 0;
        const grad = tot ? Object.keys(WARNA).map(function (k) { const a = acc / tot * 100; acc += d.sebaran[k] || 0; return WARNA[k] + ' ' + a + '% ' + acc / tot * 100 + '%'; }).join(',') : '#E2E8F0 0 100%';
        const urgent = bks().filter(function (b) { return b.status === 'Pending'; }).slice(0, 5);
        const kat = Object.keys(d.kategori || {}), katTot = kat.reduce(function (s, k) { return s + d.kategori[k]; }, 0) || 1;
        v.innerHTML = '<div class="apad"><div class="row between wrap"><div><span class="eyebrow">' + ic('gps', 14) + ' LIVE DISPATCHER CENTER • <span class="ok-t">Auto-sync aktif</span></span><h1 class="h1">Ringkasan Operasional & Dashboard Utama</h1><p class="muted">Pantau performa layanan, kapasitas teknisi lapangan, dan antrean pesanan secara real-time.</p></div><div class="row gap"><button class="btn secondary" id="rf">' + ic('refresh', 16) + ' Muat Ulang</button><a class="btn primary" href="#/papan">' + ic('list', 16) + ' Buka Papan Dispatch</a></div></div>' +
          '<div class="kpis">' + kpi('list', 'TOTAL PESANAN MASUK', d.masuk, 'Tiket', '<span class="trend ' + (dl >= 0 ? 'up' : 'dn') + '">' + (dl >= 0 ? '↗ +' : '↘ ') + dl + '%</span> vs kemarin (' + d.masukKemarin + ')') +
          kpi('users', 'TEKNISI BERTUGAS', d.teknisiAktif, '/ ' + d.teknisiTotal + ' Siap', '<i class="sd ok"></i>' + d.standby + ' Standby <i class="sd ind"></i>' + d.menuju + ' Menuju <i class="sd pur"></i>' + d.servis + ' Servis', 'ok') +
          kpi('check', 'SERVIS SELESAI HARI INI', d.selesai, 'Pekerjaan', '<span class="trend up">' + d.sukses + '% Sukses</span> Rata-rata ' + d.durasi + ' mnt/unit') +
          kpi('warn', 'PERLU TINDAKAN DISPATCH', d.pending, 'Menunggu Alokasi', '<span class="pill warn">' + ic('clock', 12) + ' Tunggu: ' + d.tunggu + ' menit</span> <a href="#/papan">Tugaskan Segera</a>', 'warn') + '</div>' +
          '<div class="g21"><section class="card"><div class="row between"><h3>Tren Pesanan & Volume Servis <small class="pill">7 Hari Terakhir</small></h3></div><div class="bars">' + d.seri.map(function (s, i) { return '<div class="bar ' + (i === 6 ? 'now' : '') + '"><span class="bv">' + s.n + '</span><i style="height:' + Math.max(4, s.n / mx * 100) + '%"></i><small>' + hari(s.tgl) + '</small></div>'; }).join('') + '</div>' +
          '<div class="row gap wrap sm">' + kat.map(function (k) { return '<span class="pill">' + esc((CAT[k] || { s: k }).s) + ' ' + Math.round(d.kategori[k] / katTot * 100) + '% (' + d.kategori[k] + ')</span>'; }).join('') + '</div></section>' +
          '<section class="card"><div class="row between"><h3>Status Tiket Hari Ini</h3><span class="pill ok">' + tot + ' Total</span></div><div class="donut" style="background:conic-gradient(' + grad + ')"><div><b>' + tot + '</b><small>TIKET TERDATA</small></div></div><div class="legend">' + Object.keys(WARNA).map(function (k) { const n = d.sebaran[k] || 0; return '<div><i style="background:' + WARNA[k] + '"></i><span>' + STATUS[k][0] + '</span><b>' + n + ' <small>(' + (tot ? Math.round(n / tot * 1000) / 10 : 0) + '%)</small></b></div>'; }).join('') + '</div></section></div>' +
          '<div class="g21"><section class="card"><div class="row between"><div><h3>Pesanan Memerlukan Tindakan <span class="pill warn">Prioritas Alur</span></h3><small class="muted">Segera tugaskan teknisi terdekat untuk tiket berstatus antrean</small></div></div>' +
          (urgent.length ? '<div class="tw"><table class="tbl"><thead><tr><th>ID TIKET</th><th>KLIEN & LOKASI</th><th>LAYANAN</th><th>JADWAL SLOT</th><th>STATUS</th><th></th></tr></thead><tbody>' + urgent.map(function (b) { return '<tr><td><a class="mono2" href="#/papan/' + b.id + '">#' + esc(b.id) + '</a></td><td><b>' + esc(b.cust.nama) + '</b><small>' + ic('pin', 12) + ' ' + esc(b.alamat.split(',').slice(-3, -1).join(',')) + '</small></td><td>' + esc(b.layanan) + '</td><td>' + esc(b.slot) + '<small>' + hariLabel(b.tanggal) + '</small></td><td>' + badge(b.status) + '</td><td><a class="btn sm primary" href="#/papan/' + b.id + '">Tugaskan</a></td></tr>'; }).join('') + '</tbody></table></div>' : empty('check', 'Semua pesanan sudah teralokasi', 'Tidak ada tiket menunggu penugasan.')) +
          '<div class="foot-l"><small class="muted">Menampilkan ' + urgent.length + ' dari ' + d.pending + ' pesanan menunggu</small><a href="#/papan">Lihat semua di Papan Dispatch ' + ic('arrowr', 14) + '</a></div></section>' +
          '<section class="card"><div class="row between"><h3>Peringatan Sistem</h3>' + ic('bell', 18) + '</div><small class="muted">Notifikasi anomali GPS dan integrasi</small>' + d.alert.map(function (a) {
            if (a.tipe === 'geofence') return '<div class="al warn"><b>' + ic('ban', 16) + ' Check-in Luar Radius (' + a.jarak + ' m)</b><small>' + esc(a.teknisi) + ' pada <span class="mono">#' + esc(a.id) + '</span> melakukan absen di luar geofence ' + sec('Jarak_Maks_Checkin', 150) + ' m.</small><div class="row gap"><button class="btn sm danger" data-vf="' + a.id + '">Verifikasi Lokasi</button><a class="btn sm ghost" href="#/papan/' + a.id + '">Lihat</a></div></div>';
            return '<div class="al warn"><b>' + ic('wrench', 16) + ' Biaya tambahan ' + rp(a.nominal) + '</b><small>#' + esc(a.id) + ' • ' + esc(a.part || 'Part tambahan') + ' — melebihi batas.</small><div class="row gap"><button class="btn sm primary" data-by="1" data-id="' + a.id + '">Setujui</button><button class="btn sm danger-o" data-by="0" data-id="' + a.id + '">Tolak</button></div></div>'; }).join('') +
          '<div class="al ' + (d.antrean.gagal ? 'warn' : 'ok') + '"><b>' + ic('chat', 16) + ' Antrean Notifikasi WhatsApp</b><small>' + d.antrean.pending + ' menunggu kirim • ' + d.antrean.gagal + ' gagal. Dikirim otomatis tiap menit via gateway.</small></div>' +
          '<div class="al ok"><b>' + ic('refresh', 16) + ' Sinkronisasi Database GAS</b><small>Terakhir ' + detik(d.t) + '. Koneksi Google Sheets stabil dengan cache berlapis.</small></div>' +
          '<div class="csat"><span class="pill warn">' + ic('star', 14) + '</span><div><small>Kepuasan Pelanggan (30 hari)</small><b>' + (d.csat ? d.csat.toFixed(2) : '-') + ' <small>/ 5.00</small></b></div><span class="pill ok">' + d.ulasan + ' Ulasan</span></div></section></div></div>';
      }
      v.addEventListener('click', function (e) {
        const b = e.target.closest('button'); if (!b) return;
        if (b.id === 'rf') busy(b, refreshBoot().then(draw).catch(toastErr));
        else if (b.dataset.vf) busy(b, act('admin.verifikasi', { id: b.dataset.vf }).then(function (nb) { putB(nb); return refreshBoot().then(draw); }).then(function () { toast('Check-in ditandai terverifikasi.', 'ok'); }).catch(toastErr));
        else if (b.dataset.by) busy(b, act('admin.biaya', { id: b.dataset.id, setuju: b.dataset.by === '1' }).then(function (nb) { putB(nb); return refreshBoot().then(draw); }).then(function () { toast('Keputusan biaya tersimpan.', 'ok'); }).catch(toastErr));
      });
      draw();
      const stop = poll(function () { return refreshBoot().then(draw); }, sec('Polling_Admin_Detik', 30));
      return function () { stop(); done(); };
    }
  };

  // ====================================================================== W-09 PAPAN & PENUGASAN
  function kandidat(b) {
    const hubRef = [b.lat, b.lng];
    return techs().filter(function (t) { return t.aktif !== false; }).map(function (t) {
      const ref = t.pos ? [t.pos.lat, t.pos.lng] : (t.hubLat != null ? [t.hubLat, t.hubLng] : null), km = ref ? jarakKm(ref[0], ref[1], hubRef[0], hubRef[1]) : null;
      const cocok = !b.kategori || t.keahlian.some(function (k) { return k === b.kategori || (CAT[b.kategori] && k === CAT[b.kategori].s); });
      const bentrok = bks().find(function (x) { return x.id !== b.id && x.tech && x.tech.id === t.id && x.tanggal === b.tanggal && x.slot === b.slot && ['Assigned', 'On_The_Way', 'Working'].indexOf(x.status) > -1; });
      const hari = bks().filter(function (x) { return x.tech && x.tech.id === t.id && x.tanggal === b.tanggal; });
      const blok = t.status === 'Off' || !!bentrok;
      const skor = (blok ? -1000 : 0) + (cocok ? 100 : 0) - (km == null ? 30 : km * 4) + t.rating * 3 - hari.length * 2 + (t.status === 'Available' ? 10 : 0);
      return { t: t, km: km, cocok: cocok, bentrok: bentrok, blok: blok, skor: skor, selesai: hari.filter(function (x) { return x.status === 'Completed'; }).length, aktif: hari.filter(function (x) { return ACTIVE.indexOf(x.status) > 0; }).length };
    }).sort(function (a, b) { return b.skor - a.skor; });
  }
  R.routes['/papan'] = {
    title: 'Papan Penugasan',
    render: function (v, params) {
      App.title('Papan Penugasan Dispatch'); const done = own(), live = alive();
      let tab = 'pending', q = S.papanQ || '', sel = params[0] || null, selTech = null, map = null, mapFor = null, extra = [], selIds = {}, olderLoaded = false;
      const FINAL = ['Completed', 'Canceled'], isFinal = function (b) { return FINAL.indexOf(b.status) > -1; };
      const pool = function () { const base = bks(), ids = {}; base.forEach(function (x) { ids[x.id] = 1; }); return base.concat(extra.filter(function (x) { return !ids[x.id]; })); }; // papan + riwayat lama yang dimuat
      v.innerHTML = '<div class="apad"><div class="row between wrap"><div><span class="eyebrow">F-30 • DISPATCH CORE • Sinkronisasi real-time</span><h1 class="h1">Papan Penugasan & Dispatching</h1><p class="muted">Kelola pesanan masuk dan tugaskan teknisi terdekat secara real-time.</p></div><div class="mini" id="mini"></div></div>' +
        '<div class="chips scroll" id="tabs"></div><div class="filters"><div class="inp ico grow">' + ic('search', 16) + '<input id="pq" placeholder="Cari ID booking, nama pelanggan, atau lokasi…" value="' + esc(q) + '"></div><button class="btn secondary" id="prf">' + ic('refresh', 16) + '</button></div>' +
        '<div class="split"><aside class="card q" id="ql"></aside><section id="qd"></section></div></div>';
      const TABS = [['all', 'Semua Pesanan', function () { return true; }], ['pending', 'Menunggu Penugasan', function (b) { return b.status === 'Pending'; }], ['assigned', 'Ditugaskan', function (b) { return b.status === 'Assigned'; }], ['otw', 'On The Way', function (b) { return b.status === 'On_The_Way'; }], ['work', 'Sedang Pengerjaan', function (b) { return b.status === 'Working'; }], ['done', 'Selesai Hari Ini', function (b) { return b.status === 'Completed' && (b.selesai || '').slice(0, 10) === todayStr(); }], ['hist', 'Riwayat (Selesai & Batal)', function (b) { return isFinal(b); }]];
      const match = function (b) { if (!q) return true; const s = (b.id + ' ' + b.cust.nama + ' ' + b.alamat + ' ' + b.layanan).toLowerCase(); return s.indexOf(q.toLowerCase()) > -1; };
      function drawList() {
        if (!live()) return;
        const all = pool(), d = S.boot.dash || {};
        $('#mini', v).innerHTML = '<div><small>Antrean Aktif</small><b>' + all.filter(function (b) { return b.status === 'Pending'; }).length + ' Order</b></div><div><small>Rata-rata Respon</small><b>' + (d.tunggu || 0) + ' Menit</b></div><div class="ok"><small>Armada Siap</small><b>' + techs().filter(function (t) { return t.status === 'Available'; }).length + ' Teknisi</b></div>';
        $('#tabs', v).innerHTML = TABS.map(function (t) { const n = all.filter(t[2]).length; return '<button class="chip ' + (tab === t[0] ? 'sel' : '') + '" data-t="' + t[0] + '">' + t[1] + ' <b>' + n + '</b></button>'; }).join('');
        const f = TABS.find(function (t) { return t[0] === tab; })[2], rows = all.filter(function (b) { return f(b) && match(b); });
        const shown = tab === 'hist' ? rows.slice(0, 200) : rows;
        Object.keys(selIds).forEach(function (k) { if (!all.some(function (x) { return x.id === k; })) delete selIds[k]; });
        const nSel = Object.keys(selIds).length, bar = tab === 'hist' ? '<div class="histbar"><label class="chk"><input type="checkbox" id="hAll" ' + (shown.length && shown.every(function (b) { return selIds[b.id]; }) ? 'checked' : '') + '> Pilih semua (' + shown.length + ')</label><button class="btn sm danger" id="hDel" ' + (nSel ? '' : 'disabled') + '>' + ic('trash', 14) + ' Hapus terpilih (' + nSel + ')</button>' + (olderLoaded ? '' : '<button class="btn sm ghost" id="hOld">Muat riwayat lebih lama</button>') + '</div>' + (rows.length > 200 ? '<small class="muted">Menampilkan 200 dari ' + rows.length + ' — gunakan pencarian untuk mempersempit.</small>' : '') : '';
        $('#ql', v).innerHTML = (tab === 'hist' ? '<h3>Riwayat Pesanan <span class="pill">' + rows.length + ' pesanan</span></h3><small class="muted">Selesai & Dibatalkan. Hapus permanen atas izin admin — juga hilang dari riwayat pelanggan & teknisi.</small>' : '<h3>Antrean Pesanan Masuk <span class="pill warn">' + all.filter(function (b) { return b.status === 'Pending'; }).length + ' Perlu Diproses</span></h3>') + bar + (rows.length ? shown.map(function (b) { const t = Math.round((Date.now() - new Date(b.dibuat)) / 60000); return '<article class="qi ' + (sel === b.id ? 'sel' : '') + '" data-id="' + b.id + '"><div class="row between">' + (tab === 'hist' ? '<label class="hck-w"><input type="checkbox" class="hck" data-id="' + b.id + '" ' + (selIds[b.id] ? 'checked' : '') + ' aria-label="Pilih #' + esc(b.id) + '"></label>' : '') + '<b class="mono2">#' + esc(b.id) + '</b>' + badge(b.status) + '<small class="muted">' + (t < 60 ? t + ' mnt lalu' : Math.round(t / 60) + ' jam lalu') + '</small></div><div class="row between"><b>' + esc(b.cust.nama) + '</b><small class="muted">' + esc(b.alamat.split(',').slice(-3, -1).join(',')) + '</small></div><div class="sm">' + ic(catIc(b.kategori), 14) + ' ' + esc(b.layanan) + '</div>' + (b.status === 'Pending' ? '<div class="qk">“' + esc(b.keluhan.slice(0, 60)) + '…”</div>' : '') + '<div class="row between"><small>Slot: ' + esc(b.slot) + '</small>' + (b.tech ? '<span class="pill ind">' + esc(b.tech.nama) + '</span>' : '<small class="warn-t">Butuh penugasan</small>') + '</div></article>'; }).join('') : empty('check', 'Tidak ada pesanan', 'Tidak ada pesanan pada filter ini.'));
      }
      function drawDetail() {
        if (!live()) return;
        const b = pool().find(function (x) { return x.id === sel; }), box = $('#qd', v);
        if (!b) { box.innerHTML = '<div class="card">' + empty('list', 'Pilih pesanan', 'Pilih tiket di antrean untuk melihat detail dan menugaskan teknisi.') + '</div>'; return; }
        const c = b.status === 'Pending' || b.status === 'Assigned' ? kandidat(b) : [];
        if (!selTech || !c.some(function (x) { return x.t.id === selTech && !x.blok; })) { const best = c.find(function (x) { return !x.blok; }); selTech = best ? best.t.id : null; if (b.tech && b.status === 'Assigned' && c.some(function (x) { return x.t.id === b.tech.id; })) selTech = b.tech.id; }
        box.innerHTML = '<div class="card"><div class="row between wrap"><div class="row gap"><h2 class="h2 mono2">#' + esc(b.id) + '</h2>' + badge(b.status) + '<small class="muted">Dibuat: ' + jam(b.dibuat) + '</small></div><span class="pill ok">' + ic('lock', 12) + ' LockService Aktif • Sesi aman</span></div>' +
          '<div class="g2"><div class="box"><small class="eyebrow">PROFIL PELANGGAN</small><div class="row gap">' + avatar(b.cust.nama, 40, 'ind') + '<div><b>' + esc(b.cust.nama) + '</b><small>' + ic('phone', 12) + ' ' + esc(b.cust.hp ? '+' + b.cust.hp : '-') + ' ' + (b.cust.hp ? '<a target="_blank" rel="noopener" href="' + waLink(b.cust.hp) + '">Buka WA</a>' : '') + '</small></div></div><small class="eyebrow mt">ALAMAT LENGKAP</small><p>' + esc(b.alamat) + '</p>' + (b.patokan ? '<div class="note">Patokan: ' + esc(b.patokan) + '</div>' : '') + '</div><div class="box"><div id="pmap" class="map sm"><div class="skeleton fill"></div></div><small class="muted">' + (b.lat != null ? b.lat.toFixed(4) + ', ' + b.lng.toFixed(4) : '') + '</small></div></div>' +
          '<div class="box"><div class="row between"><small class="eyebrow">DESKRIPSI KERUSAKAN & INSTRUKSI</small>' + (b.status === 'Pending' ? '<small class="warn-t">' + ic('warn', 12) + ' Cek peralatan</small>' : '') + '</div><p class="quote">“' + esc(b.keluhan) + '”</p>' + (b.fotoBukti.length ? '<small class="eyebrow">FOTO LAMPIRAN PELANGGAN (' + b.fotoBukti.length + ')</small><div class="thumbs sm">' + b.fotoBukti.map(function (f) { return '<div class="th"><img data-b="' + b.id + '" data-f="' + f + '" alt="Lampiran"></div>'; }).join('') + '</div>' : '') + '</div>' +
          '<div class="box"><small class="eyebrow">ESTIMASI RINCIAN BIAYA</small><div class="row between wrap"><span>Servis Pokok: <b>' + rp(b.harga) + '</b> • Transport: <b>' + rp(b.transport) + '</b>' + (b.tambahan ? ' • Tambahan: <b>' + rp(b.tambahan) + '</b>' + (b.persetujuan ? ' <span class="pill ' + (b.persetujuan === 'Menunggu' ? 'warn' : b.persetujuan === 'Disetujui' ? 'ok' : 'off') + '">' + b.persetujuan + '</span>' : '') : '') + '</span><div><span class="pill ok">Metode Bayar: COD (Tunai)</span> <b class="big">' + rp(b.total) + '</b></div></div></div>' +
          (b.persetujuan === 'Menunggu' ? '<div class="alert warn">' + ic('wrench') + '<div><b>Biaya tambahan ' + rp(b.tambahan) + ' menunggu persetujuan</b><br>' + esc(b.namaPart) + '<div class="row gap mt"><button class="btn sm primary" data-by="1">Setujui</button><button class="btn sm danger-o" data-by="0">Tolak</button></div></div></div>' : '') +
          (b.verifikasi === 'TRUE' ? '<div class="alert warn">' + ic('warn') + '<div><b>Check-in di luar radius (' + b.jarakTiba + ' m)</b><br>Perlu verifikasi dispatcher. <button class="btn sm danger" data-vf="1">Tandai Terverifikasi</button></div></div>' : '') + '</div>' +
          (c.length ? '<div class="card"><div class="row between"><div><h3>' + ic('users', 18) + ' ' + (b.status === 'Assigned' ? 'Tugaskan Ulang Teknisi' : 'Pilih & Tugaskan Teknisi') + '</h3><small class="muted">Rekomendasi algoritma berdasarkan radius dan spesialisasi</small></div><span class="pill ind">Keahlian Cocok: ' + esc((CAT[b.kategori] || { s: b.kategori }).s) + '</span></div><div class="cands">' + c.map(function (x, i) { const t = x.t; return '<label class="cand ' + (x.blok ? 'blok' : '') + ' ' + (selTech === t.id ? 'sel' : '') + '"><input type="radio" name="tk" value="' + t.id + '" ' + (selTech === t.id ? 'checked' : '') + ' ' + (x.blok ? 'disabled' : '') + '>' + avatar(t.nama, 44, 'ind') + '<div class="grow"><div class="row gap wrap"><b>' + esc(t.nama) + '</b><span class="rate">' + ic('star', 12) + ' ' + (t.rating ? t.rating.toFixed(1) : 'Baru') + ' <small>(' + t.ulasan + ')</small></span>' + badge(t.status) + (i === 0 && !x.blok ? '<span class="pill ok">Rekomendasi Terbaik</span>' : '') + '</div><small class="muted">' + ic('nav', 12) + ' ' + (x.km != null ? x.km.toFixed(1).replace('.', ',') + ' km' + (t.pos ? '' : ' dari hub') + ' • Est. ' + Math.max(1, Math.round(x.km * 1.3 / sec('Kecepatan_Rata_Kmj', 22) * 60)) + ' mnt' : 'Lokasi belum tersedia') + ' • Jadwal: ' + x.selesai + ' Selesai / ' + x.aktif + ' Aktif</small><div class="chips">' + t.keahlian.map(function (k) { return '<span class="chip soft ' + (CAT[b.kategori] && k === CAT[b.kategori].s ? 'hl' : '') + '">' + esc(k) + '</span>'; }).join('') + '</div>' + (x.bentrok ? '<small class="warn-t">' + ic('warn', 12) + ' Bentrok dengan #' + esc(x.bentrok.id) + ' (slot sama)</small>' : t.status === 'Off' ? '<small class="warn-t">Sedang tidak aktif</small>' : '') + '</div></label>'; }).join('') + '</div>' +
            '<div class="note">' + ic('chat', 16) + ' <b>Otomatisasi Dispatch (F-32)</b> Sistem mengirim notifikasi WhatsApp ke teknisi terpilih dan mengunci jadwal otomatis di Google Sheets (LockService).</div>' : '') +
          '<div class="row gap end wrap mt">' + (ACTIVE.indexOf(b.status) > -1 ? '<button class="btn danger-o" id="xCancel">' + ic('x', 16) + ' Batalkan Pesanan</button>' : '') + '<a class="btn secondary" target="_blank" rel="noopener" href="' + waLink(b.cust.hp, 'Halo ' + b.cust.nama + ', terkait pesanan #' + b.id) + '">' + ic('phone', 16) + ' Hubungi Pelanggan</a>' + (c.length ? '<button class="btn primary lg" id="xAssign" ' + (selTech ? '' : 'disabled') + '>' + ic('check', 18) + ' ' + (selTech ? 'Tugaskan ' + esc((techs().find(function (t) { return t.id === selTech; }) || {}).nama || '') + ' ke Pesanan Ini' : 'Tidak ada teknisi tersedia') + '</button>' : '') + '</div>' + (c.length ? '</div>' : '') +
          (isFinal(b) ? '<div class="card"><div class="row gap wrap">' + '<button class="btn secondary" id="xBap">' + ic('dl', 16) + ' Berita Acara (PDF)</button>' + '<button class="btn danger-o" id="xDel">' + ic('trash', 16) + ' Hapus dari Riwayat</button></div><small class="muted mt">Penghapusan permanen: pesanan ini juga hilang dari riwayat pelanggan dan teknisi.</small></div>' : '');
        lazyFoto(box); $$('.th img', box).forEach(function (im) { im.onclick = function () { if (im.src) lightbox(im.src); }; });
        if (mapFor !== b.id || !map || map.getContainer() !== $('#pmap', v)) {
          if (map) { map.remove(); map = null; } mapFor = b.id;
          if (b.lat != null) newMap($('#pmap', v), b.lat, b.lng, 15, { dragging: true }).then(function (m) { map = m; L.marker([b.lat, b.lng], { icon: mkHome() }).addTo(m); });
        }
      }
      function hapusRiwayat(ids) {
        ids = ids.filter(Boolean); if (!ids.length) return;
        const n = ids.length, bulk = n > 1;
        const m = modal({ title: 'Hapus riwayat pesanan', noFocus: !bulk,
          body: '<div class="alert err">' + ic('warn') + '<div><b>Hapus permanen ' + n + ' pesanan' + (n === 1 ? ' #' + esc(ids[0]) : '') + '?</b><br>Tidak dapat dibatalkan.</div></div><ul class="steps"><li>Hilang dari <b>riwayat pelanggan</b> dan <b>riwayat teknisi</b>.</li><li>Hilang dari <b>laporan</b>; penilaian (rating) pesanan ini ikut terhapus.</li><li>Log perjalanan dan <b>foto di Drive</b> ikut dihapus.</li></ul>' + (bulk ? '<label class="lbl">Ketik <b>HAPUS</b> untuk melanjutkan</label><div class="inp"><input id="hk" autocomplete="off" placeholder="HAPUS"></div>' : ''),
          actions: [{ label: 'Batal', cls: 'ghost' }, { label: 'Ya, hapus permanen', cls: 'danger', fn: function (c, bt) {
            busy(bt, act('admin.bookingHapus', { ids: ids }).then(function (r) {
              const gone = {}; r.ids.forEach(function (i) { gone[i] = 1; delete selIds[i]; });
              S.boot.bookings = S.boot.bookings.filter(function (x) { return !gone[x.id]; }); extra = extra.filter(function (x) { return !gone[x.id]; }); App.persist();
              if (gone[sel]) { sel = null; history.replaceState(null, '', '#/papan'); }
              c(); toast(r.dihapus + ' pesanan dihapus dari riwayat.', 'ok'); drawList(); drawDetail(); refreshBoot().then(function () { drawList(); }).catch(function () { });
            }).catch(toastErr));
          } }] });
        const go = $('.modal-f .btn.danger', m.el);
        if (bulk) { go.disabled = true; $('#hk', m.el).oninput = function (e) { go.disabled = e.target.value.trim().toUpperCase() !== 'HAPUS'; }; setTimeout(function () { $('#hk', m.el).focus(); }, 60); }
      }
      function select(id) { sel = id; selTech = null; history.replaceState(null, '', '#/papan/' + id); App.title('Papan Penugasan Dispatch'); drawList(); drawDetail(); if (window.innerWidth < 900) $('#qd', v).scrollIntoView({ behavior: 'smooth' }); }
      v.addEventListener('click', function (e) {
        const t = e.target.closest('[data-t]'), qi = e.target.closest('.qi'), btn = e.target.closest('button'), b = pool().find(function (x) { return x.id === sel; });
        if (e.target.closest('.hck-w') || e.target.id === 'hAll') return; // checkbox ditangani event 'change'
        if (t) { tab = t.dataset.t; drawList(); return; }
        if (btn && btn.id === 'hDel') return hapusRiwayat(Object.keys(selIds));
        if (btn && btn.id === 'xDel') return hapusRiwayat([b.id]);
        if (btn && btn.id === 'hOld') return busy(btn, api('booking.list', { all: true, status: FINAL, limit: 500 }).then(function (r) { extra = r.list; olderLoaded = true; toast(r.list.length + ' riwayat dimuat (total di server: ' + r.total + ').', 'ok'); drawList(); }).catch(toastErr));
        if (btn && btn.id === 'prf') return busy(btn, refreshBoot().then(function () { drawList(); drawDetail(); }).catch(toastErr));
        if (btn && btn.id === 'xAssign') {
          const tid = selTech, prev = Object.assign({}, b), tn = techs().find(function (x) { return x.id === tid; });
          putB(Object.assign({}, b, { status: 'Assigned', tech: tn })); drawList(); drawDetail();
          busy(btn, act('booking.assign', { id: b.id, techId: tid }).then(function (nb) { putB(nb); toast('Teknisi ' + tn.nama + ' ditugaskan. Notifikasi WhatsApp dikirim.', 'ok'); drawList(); drawDetail(); refreshBoot().then(function () { drawList(); }); }).catch(function (er) { putB(prev); drawList(); drawDetail(); toastErr(er); }));
        } else if (btn && btn.id === 'xCancel') {
          modal({ title: 'Batalkan pesanan #' + b.id, body: '<label class="lbl">Alasan pembatalan</label><textarea id="al" class="ta sm" maxlength="150" placeholder="Contoh: pelanggan tidak dapat dihubungi"></textarea>', actions: [{ label: 'Kembali', cls: 'ghost' }, { label: 'Batalkan Pesanan', cls: 'danger', fn: function (c, bt, ov) { busy(bt, act('booking.cancel', { id: b.id, alasan: $('#al', ov).value }).then(function (nb) { putB(nb); c(); toast('Pesanan dibatalkan.', 'ok', { label: 'Hapus dari riwayat', fn: function () { hapusRiwayat([nb.id]); } }); drawList(); drawDetail(); }).catch(toastErr)); } }] });
        } else if (btn && btn.dataset.by) busy(btn, act('admin.biaya', { id: b.id, setuju: btn.dataset.by === '1' }).then(function (nb) { putB(nb); toast('Keputusan biaya tersimpan.', 'ok'); drawList(); drawDetail(); }).catch(toastErr));
        else if (btn && btn.dataset.vf) busy(btn, act('admin.verifikasi', { id: b.id }).then(function (nb) { putB(nb); drawDetail(); toast('Check-in terverifikasi.', 'ok'); }).catch(toastErr));
        else if (btn && btn.id === 'xBap') busy(btn, act('booking.get', { id: b.id }).then(function (r) { return bapPdf(r.b); }).catch(toastErr));
        else if (qi && !e.target.closest('a')) select(qi.dataset.id);
      });
      v.addEventListener('change', function (e) {
        if (e.target.name === 'tk') { selTech = e.target.value; drawDetail(); return; }
        if (e.target.classList.contains('hck')) { if (e.target.checked) selIds[e.target.dataset.id] = 1; else delete selIds[e.target.dataset.id]; drawList(); return; }
        if (e.target.id === 'hAll') { const f = TABS.find(function (x) { return x[0] === 'hist'; })[2]; pool().filter(function (x) { return f(x) && match(x); }).slice(0, 200).forEach(function (x) { if (e.target.checked) selIds[x.id] = 1; else delete selIds[x.id]; }); drawList(); }
      });
      $('#pq', v).oninput = function (e) { q = e.target.value; S.papanQ = q; drawList(); };
      if (!sel) { const f = bks().find(function (b) { return b.status === 'Pending'; }); if (f) sel = f.id; } else { const f = bks().find(function (b) { return b.id === sel; }); if (f && f.status !== 'Pending') tab = 'all'; }
      drawList(); drawDetail();
      const stop = poll(function () { return refreshBoot().then(function () { drawList(); if (!document.querySelector('.modal')) drawDetail(); }); }, sec('Polling_Admin_Detik', 30));
      return function () { stop(); if (map) map.remove(); done(); };
    }
  };

  // ====================================================================== W-10 PETA TEKNISI LIVE
  R.routes['/armada'] = {
    title: 'Peta Teknisi Live', prefetch: function () { loadMap().catch(function () { }); },
    render: function (v) {
      App.title('Peta Teknisi Live'); const done = own(), live = alive();
      let list = techs().map(function (t) { return t; }), flt = 'all', q = '', map = null, mk = {}, route = null, focus = null, stopped = false, lastT = null, pollLocked = false;
      v.innerHTML = '<div class="apad"><div class="row between wrap"><div><span class="eyebrow">OPERASIONAL LIVE • Fleet GPS Telemetry</span><h1 class="h1">Peta Pemantauan Armada Teknisi Real-Time</h1><p class="muted">Pantau koordinat GPS aktif, status ketersediaan, rute penugasan, dan akurasi sinyal teknisi.</p></div><div class="row gap"><span class="pill ok" id="asy"></span><button class="btn primary" id="rl">' + ic('refresh', 16) + ' Muat Ulang Lokasi</button></div></div><div class="chips scroll" id="ff"></div>' +
        '<div class="armada"><aside class="card fl"><div class="inp ico">' + ic('search', 16) + '<input id="fq" placeholder="Cari teknisi, keahlian, atau plat…"></div><div class="mini2" id="fm"></div><div id="fl"></div></aside><section class="mapcol"><div class="mapw tall"><div id="am" class="map"><div class="skeleton fill"></div></div><div class="legend">' + ['<i class="ok"></i> Siap Kerja', '<i class="duty"></i> Menuju Lokasi / Bertugas', '<i class="off"></i> Istirahat', '<i class="bad"></i> Anomali Radius'].join('<br>') + '</div><div class="telem" id="tl" hidden></div></div></section></div></div>';
      const FF = [['all', 'Semua Armada', function () { return true; }], ['Available', 'Siap Kerja', function (t) { return t.status === 'Available' && !t.tiket; }], ['otw', 'Menuju Lokasi', function (t) { return t.tiket && t.tiket.status === 'On_The_Way'; }], ['work', 'Sedang Servis', function (t) { return t.tiket && t.tiket.status === 'Working'; }], ['Off', 'Istirahat', function (t) { return t.status === 'Off'; }], ['bad', 'Anomali', function (t) { return t.tiket && t.tiket.verifikasi === 'TRUE'; }]];
      const stCls = function (t) { return t.tiket && t.tiket.verifikasi === 'TRUE' ? 'anomali' : (t.status === 'Available' && !t.tiket ? 'Available' : t.status === 'Off' ? 'Off' : 'On-Duty'); };
      function draw() {
        if (!live()) return;
        const f = FF.find(function (x) { return x[0] === flt; })[2], rows = list.filter(function (t) { return f(t) && (!q || (t.nama + t.keahlian.join(' ') + t.plat).toLowerCase().indexOf(q) > -1); });
        $('#ff', v).innerHTML = FF.map(function (x) { return '<button class="chip ' + (flt === x[0] ? 'sel' : '') + '" data-f="' + x[0] + '">' + x[1] + ' <b>' + list.filter(x[2]).length + '</b></button>'; }).join('');
        const gps = list.filter(function (t) { return t.pos; }), baik = gps.filter(function (t) { return t.pos.ak != null && t.pos.ak <= 15; }).length;
        $('#fm', v).innerHTML = '<div><small>Armada Bergerak</small><b>' + list.filter(function (t) { return t.tiket && t.tiket.status === 'On_The_Way'; }).length + ' / ' + list.length + '</b></div><div><small>Akurasi GPS Baik</small><b class="ind-t">' + (gps.length ? Math.round(baik / gps.length * 100) : 0) + '% (≤15m)</b></div>';
        $('#fl', v).innerHTML = rows.length ? rows.map(function (t) { return '<article class="ft ' + (focus === t.id ? 'sel' : '') + '" data-id="' + t.id + '"><div class="row gap">' + avatar(t.nama, 40, 'ind') + '<div class="grow"><b>' + esc(t.nama) + '</b> <small class="mono muted">' + esc(t.id) + '</small><small class="muted">' + esc(t.keahlian.join(' • ')) + '</small></div>' + (t.tiket && t.tiket.verifikasi === 'TRUE' ? '<span class="pill err">Anomali</span>' : badge(t.tiket ? (t.tiket.status === 'Working' ? 'Working' : 'On_The_Way') : t.status)) + '</div>' + (t.tiket ? '<div class="box sm"><small>Tujuan Tiket: <b>#' + esc(t.tiket.id) + '</b> (' + esc(t.tiket.cust) + ')</small>' + (t.tiket.eta ? '<small>ETA ' + t.tiket.eta + ' mnt • ' + (t.tiket.jarak / 1000).toFixed(1) + ' km</small>' : '') + '</div>' : '<small class="muted">' + ic('pin', 12) + ' ' + esc(t.hub || 'Standby') + '</small>') + '<div class="row between sm"><small class="muted">GPS: ' + (t.pos ? '±' + (t.pos.ak == null ? '?' : t.pos.ak) + 'm (' + detik(t.pos.t) + ')' : 'tidak ada sinyal') + '</small><span class="mono muted">' + esc(t.plat) + '</span></div><div class="row gap"><a class="btn sm ghost" target="_blank" rel="noopener" href="' + waLink(t.hp) + '">' + ic('chat', 14) + ' WhatsApp</a>' + (!t.tiket && t.status !== 'Off' ? '<a class="btn sm primary" href="#/papan">Tugaskan Cepat</a>' : '') + '<button class="btn sm secondary" data-fc="' + t.id + '">' + ic('locate', 14) + ' Fokus</button></div></article>'; }).join('') : empty('users', 'Tidak ada teknisi', 'Tidak ada teknisi pada filter ini.');
        $('#asy', v).innerHTML = '<i class="dotp"></i> Auto-Sync GAS (' + sec('Polling_Admin_Detik', 30) + 's) • ' + (lastT ? detik(lastT) : 'memuat…');
        markers(); telem();
      }
      function markers() {
        if (!map) return; const seen = {};
        list.forEach(function (t) {
          if (!t.pos) return; seen[t.id] = 1; const ll = [t.pos.lat, t.pos.lng];
          if (!mk[t.id]) { mk[t.id] = L.marker(ll, { icon: mkTech(stCls(t), t.nama, t.tiket && t.tiket.status === 'On_The_Way') }).addTo(map); mk[t.id].on('click', function () { focus = t.id; draw(); }); }
          else { glide(mk[t.id], ll); mk[t.id].setIcon(mkTech(stCls(t), t.nama, t.tiket && t.tiket.status === 'On_The_Way')); }
          mk[t.id].bindTooltip('<b>' + esc(t.nama) + '</b><br>' + (t.tiket ? 'Tiket #' + esc(t.tiket.id) : STATUS[t.status][0]), { direction: 'top' });
        });
        Object.keys(mk).forEach(function (id) { if (!seen[id]) { map.removeLayer(mk[id]); delete mk[id]; } });
        if (route) { map.removeLayer(route); route = null; }
        const t = list.find(function (x) { return x.id === focus; });
        if (t && t.pos && t.tiket && t.tiket.lat != null) route = L.polyline([[t.pos.lat, t.pos.lng], [t.tiket.lat, t.tiket.lng]], { color: '#4F46E5', weight: 4, dashArray: '8 8' }).addTo(map);
      }
      function telem() {
        const t = list.find(function (x) { return x.id === focus; }), el = $('#tl', v); if (!t) { el.hidden = true; return; }
        el.hidden = false; el.innerHTML = '<div class="row between"><div><small class="eyebrow">TELEMETRI RUTE TERPILIH</small><b>' + esc(t.nama) + '</b></div><span class="live">Live Stream</span></div><div class="g3"><div><small>Sinyal GPS</small><b>' + (t.pos && t.pos.ak != null ? '±' + t.pos.ak + ' m' : '-') + '</b></div><div><small>Sisa Jarak</small><b class="ind-t">' + (t.tiket && t.tiket.jarak != null ? (t.tiket.jarak / 1000).toFixed(1) + ' km' : '-') + '</b></div><div><small>Estimasi Tiba</small><b>' + (t.tiket && t.tiket.eta ? new Date(Date.now() + t.tiket.eta * 60000).toTimeString().slice(0, 5).replace(':', '.') + ' WIB' : '-') + '</b></div></div><div class="grid2"><a class="btn secondary sm" href="tel:+' + esc(t.hp) + '">' + ic('phone', 14) + ' Hubungi</a>' + (t.tiket ? '<a class="btn primary sm" href="#/papan/' + esc(t.tiket.id) + '">' + ic('nav', 14) + ' Alihkan Tiket</a>' : '') + '</div>';
      }
      function load() { return api('admin.armada').then(function (r) { if (stopped) return; list = r.techs; lastT = r.t; S.boot.techs = list.map(function (t) { return { id: t.id, userId: t.userId, nama: t.nama, hp: t.hp, keahlian: t.keahlian, status: t.status, kendaraan: t.kendaraan, plat: t.plat, hub: t.hub, hubLat: t.hubLat, hubLng: t.hubLng, rating: t.rating, ulasan: t.ulasan, selesai: t.selesai, aktif: t.aktif, pos: t.pos }; }); draw(); }); }
      v.addEventListener('click', function (e) {
        const b = e.target.closest('button'), a = e.target.closest('.ft');
        if (b && b.dataset.f) { flt = b.dataset.f; draw(); } else if (b && b.id === 'rl') busy(b, load().catch(toastErr));
        else if ((b && b.dataset.fc) || (a && !e.target.closest('a'))) { focus = b ? b.dataset.fc : a.dataset.id; const t = list.find(function (x) { return x.id === focus; }); if (t && t.pos && map) map.setView([t.pos.lat, t.pos.lng], 16); draw(); }
      });
      $('#fq', v).oninput = function (e) { q = e.target.value.trim().toLowerCase(); draw(); };
      draw();
      newMap($('#am', v), Number(S.cfg.Pusat_Lat || -6.2), Number(S.cfg.Pusat_Long || 106.8), 12).then(function (m) { if (stopped) { m.remove(); return; } map = m; L.control.zoom({ position: 'topright' }).addTo(m); markers(); const pts = list.filter(function (t) { return t.pos; }).map(function (t) { return [t.pos.lat, t.pos.lng]; }); if (pts.length) m.fitBounds(pts, { padding: [60, 60], maxZoom: 14 }); });
      load().catch(function (e) { toastErr(e, load); });
      const stop = poll(load, sec('Polling_Admin_Detik', 30));
      const tk = setInterval(function () { const s = $('#asy', v); if (s && lastT) s.lastChild.textContent = ' Auto-Sync GAS • ' + detik(lastT); }, 5000);
      return function () { stopped = true; stop(); clearInterval(tk); if (map) map.remove(); done(); };
    }
  };

  // ====================================================================== W-11 / W-12 KATALOG
  R.routes['/katalog'] = {
    title: 'Katalog Layanan',
    render: function (v, params) {
      if (params[0]) return formLayanan(v, params[0]);
      App.title('Katalog Layanan'); let q = '', kat = '';
      v.innerHTML = '<div class="apad"><div class="row between wrap"><div><h1 class="h1">Katalog Layanan</h1><p class="muted">Kelola daftar layanan, harga dasar, dan biaya transport (F-34).</p></div><a class="btn primary" href="#/katalog/baru">' + ic('plus', 16) + ' Tambah Layanan</a></div><div class="filters"><div class="inp ico grow">' + ic('search', 16) + '<input id="kq" placeholder="Cari layanan…"></div><select id="kk" class="selbox"><option value="">Semua kategori</option>' + Object.keys(CAT).map(function (k) { return '<option value="' + k + '">' + esc(CAT[k].n) + '</option>'; }).join('') + '</select></div><section class="card"><div class="tw" id="kt"></div></section></div>';
      function draw() {
        const rows = S.services.filter(function (s) { return (!kat || s.kategori === kat) && (!q || (s.nama + s.deskripsi).toLowerCase().indexOf(q) > -1); });
        const kCls = function (k) { return k === 'AC' ? 'c-ac' : k === 'Kulkas' ? 'c-kulkas' : k === 'Mesin Cuci' ? 'c-mesin' : 'c-lain'; };
        const kFoto = function (s) { const ico = (CAT[s.kategori] || CAT.Lainnya).i; return s.fotoAda ? '<span class="lf" data-lf="' + esc(s.id) + '">' + ic(ico, 28) + '</span>' : ic(ico, 28); };
        $('#kt', v).innerHTML = '<div class="svgrid adm">' + rows.map(function (s) {
          return '<a class="svtile ' + (s.aktif ? '' : 'off') + '" href="#/katalog/' + esc(s.id) + '" data-tile="' + esc(s.id) + '"><span class="svimg ' + kCls(s.kategori) + '">' + kFoto(s) + '</span><b>' + esc(s.nama) + '</b><small>' + rp(s.harga) + (s.aktif ? '' : ' · nonaktif') + '</small></a>';
        }).join('') + '<a class="svtile add" href="#/katalog/baru"><span class="svimg add">' + ic('plus', 26) + '</span><b>Tambah Layanan</b></a></div>' + (rows.length ? '' : empty('box', 'Belum ada layanan', 'Tambahkan layanan pertama Anda.'));
        lazyLayanan(v);
      }
      v.addEventListener('click', function (e) { const b = e.target.closest('[data-d]'); if (!b) return; const s = S.services.find(function (x) { return x.id === b.dataset.d; }); confirmDlg('Hapus layanan "' + s.nama + '"? Bila sudah pernah dipesan, layanan hanya dinonaktifkan.', { ok: 'Hapus', danger: true }).then(function (y) { if (y) act('admin.layananHapus', { id: s.id }).then(function (r) { S.services = r.list; S.boot.services = r.list; App.persist(); draw(); toast('Layanan diperbarui.', 'ok'); }).catch(toastErr); }); });
      $('#kq', v).oninput = function (e) { q = e.target.value.trim().toLowerCase(); draw(); }; $('#kk', v).onchange = function (e) { kat = e.target.value; draw(); };
      draw();
    }
  };
  function formLayanan(v, id) {
    const s = id === 'baru' ? null : S.services.find(function (x) { return x.id === id; }), edit = !!s; App.title(edit ? 'Edit Layanan' : 'Tambah Layanan'); const done = own();
    if (id !== 'baru' && !s) { v.innerHTML = '<div class="apad">' + empty('warn', 'Layanan tidak ditemukan', '', '<a class="btn primary" href="#/katalog">Kembali</a>') + '</div>'; return; }
    v.innerHTML = '<div class="apad narrow"><a class="back" href="#/katalog">' + ic('left', 18) + ' Kembali</a><h1 class="h1">' + (edit ? 'Edit Layanan' : 'Tambah Layanan') + '</h1><section class="card"><h3 class="sec">Informasi Layanan</h3>' +
      field('Nama Layanan <b class="rq">*</b>', '<div class="inp"><input id="ln" maxlength="80" value="' + esc(s ? s.nama : '') + '"></div>', 'ln') + field('Kategori <b class="rq">*</b>', '<select id="lk" class="selbox">' + Object.keys(CAT).map(function (k) { return '<option value="' + k + '" ' + (s && s.kategori === k ? 'selected' : '') + '>' + esc(CAT[k].n) + '</option>'; }).join('') + '</select>', 'lk') +
      '<div class="grid2"><div>' + field('Harga Dasar <b class="rq">*</b>', '<div class="inp ico"><b>Rp</b><input id="lh" inputmode="numeric" value="' + (s ? String(s.harga).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '') + '"></div>', 'lh') + '</div><div>' + field('Biaya Transport', '<div class="inp ico"><b>Rp</b><input id="lt" inputmode="numeric" value="' + (s ? String(s.transport).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '15.000') + '"></div>', 'lt') + '</div></div>' +
      field('Deskripsi', '<textarea id="ld" class="ta sm" maxlength="300">' + esc(s ? s.deskripsi : '') + '</textarea>', 'ld') + '<label class="chk big"><span class="sw"><input type="checkbox" id="la" ' + (!s || s.aktif ? 'checked' : '') + '><i></i></span> <b>Aktif</b> <small class="muted">(tampil di formulir pelanggan)</small></label></section><section class="card"><h3 class="sec">Gambar Layanan</h3><div class="fotol" id="fotoBox"></div><input type="file" id="lfile" accept="image/jpeg,image/png" hidden><div class="row gap wrap"><button class="btn secondary" id="lpick">Pilih gambar</button><button class="btn danger-o" id="lhapus">Hapus gambar</button></div><small class="muted">JPG/PNG, otomatis diperkecil. Jika kosong, layanan memakai ikon kategori.</small></section></div><div class="sticky-bar"><a class="btn ghost" href="#/katalog">Batal</a><button class="btn primary grow lg" id="ls">Simpan</button>' + (edit ? '<button class="btn danger-o lg" id="ldel">' + ic('trash', 16) + ' Hapus</button>' : '') + '</div>';
    angka($('#lh', v)); angka($('#lt', v));
    if (edit) $('#ldel', v).onclick = function () {
      confirmDlg('Hapus layanan "' + s.nama + '"? Bila sudah pernah dipesan, layanan hanya dinonaktifkan (tidak dihapus permanen).', { title: 'Hapus layanan', ok: 'Ya, hapus', danger: true }).then(function (y) {
        if (!y) return;
        busy($('#ldel', v), act('admin.layananHapus', { id: s.id }).then(function (r) { S.services = r.list; S.boot.services = r.list; App.persist(); clearLayananFoto(s.id); toast(r.message || 'Layanan dihapus.', 'ok'); location.hash = '/katalog'; }).catch(toastErr));
      });
    };
    let pick = null, hapusFoto = false;
    const tampilFoto = function (url) { $('#fotoBox', v).innerHTML = url ? '<img src="' + url + '" alt="">' : avSvc(s || { kategori: 'Lainnya' }, 120); };
    if (s && s.fotoAda) layananFotoUrl(s.id).then(tampilFoto).catch(function () { tampilFoto(null); }); else tampilFoto(null);
    $('#lpick', v).onclick = function () { $('#lfile', v).click(); };
    $('#lfile', v).onchange = function (e) { const f = e.target.files[0]; if (!f) return; kompres(f, 512, 0.85).then(function (k) { pick = k; hapusFoto = false; tampilFoto(k.dataUrl); }).catch(toastErr); };
    $('#lhapus', v).onclick = function () { pick = null; hapusFoto = true; tampilFoto(null); };
    $('#ls', v).onclick = function () {
      const p = { id: edit ? s.id : '', nama: $('#ln', v).value, kategori: $('#lk', v).value, harga: angkaVal($('#lh', v).value), transport: angkaVal($('#lt', v).value), deskripsi: $('#ld', v).value, aktif: $('#la', v).checked };
      if (p.nama.trim().length < 3) return toast('Nama layanan minimal 3 karakter.', 'warn');
      busy($('#ls', v), act('admin.layananSimpan', p).then(function (l) {
        const id = edit ? s.id : ((l.filter(function (x) { return x.nama === p.nama; }).pop()) || {}).id;
        const gambar = (pick && id) ? act('layanan.foto', { id: id, mime: pick.mime, data: pick.data }) : (hapusFoto && id && edit && s.fotoAda) ? act('layanan.foto', { id: id, data: '' }) : null;
        if (id) clearLayananFoto(id);
        return Promise.resolve(gambar).then(function () { return api('admin.layananList'); }).then(function (fresh) { return fresh; }, function (e) { toast('Layanan tersimpan, tetapi gambar gagal: ' + e.message, 'warn'); return l; });
      }).then(function (l) { S.services = l; S.boot.services = l; App.persist(); toast('Layanan disimpan.', 'ok'); done(); location.hash = '/katalog'; }).catch(toastErr));
    };
    return done;
  }

  // ====================================================================== W-13 LAPORAN & EKSPOR
  // Tabel dikirim per HALAMAN dari server (cepat); ekspor/cetak mengambil data bertahap dengan indikator kemajuan.
  R.routes['/laporan'] = {
    title: 'Laporan & Ekspor', prefetch: function () { libPdf().catch(function () { }); },
    render: function (v) {
      App.title('Laporan & Ekspor'); const done = own(), live = alive();
      const F = { dari: todayStr(-6), sampai: todayStr(), techId: '', kategori: '', status: 'Completed', soloGeo: false };
      let q = '', hal = 1, per = 10, data = null, seq = 0, qT = null, warmed = false; const pilih = {}, CACHE = {};
      const TTL = 30000, MAXX = 20000, MAXP = 3000, MAXC = 1000, MAXB = 50, noop = function () { };
      const params = function (x) { return Object.assign({ dari: F.dari, sampai: F.sampai, techId: F.techId, kategori: F.kategori, status: F.status, soloGeo: F.soloGeo, q: q }, x || {}); };
      const lab = function (btn, t) { const s = btn.lastElementChild; if (s) s.textContent = t; };
      const rpn = function (n) { return Math.round(Number(n) || 0).toLocaleString('id-ID'); };
      const filterText = function () { return [F.status ? 'Status: ' + STATUS[F.status][0] : 'Semua status', F.techId ? 'Teknisi: ' + ((techs().find(function (t) { return t.id === F.techId; }) || {}).nama || F.techId) : 'Semua teknisi', F.kategori ? 'Kategori: ' + F.kategori : 'Semua kategori', F.soloGeo ? 'Hanya GPS aman' : ''].filter(Boolean).join(' • '); };

      v.innerHTML = '<div class="apad"><div class="card"><div class="row between wrap"><div><span class="eyebrow">MODUL W-13 • GAS Pipeline Sync Active</span><h1 class="h1">Laporan Operasional & Ekspor Data</h1><p class="muted">Analisis performa servis, pendapatan, verifikasi GPS kedatangan, dan unduh ke Excel atau PDF.</p></div>' +
        '<div class="row gap wrap lap-act"><button class="btn accent" id="xl" title="Unduh semua hasil filter sebagai Excel">' + ic('dl', 16) + '<span>Ekspor Excel (.xlsx)</span></button><button class="btn primary" id="bp" title="Satu PDF berisi Berita Acara pesanan yang dicentang (atau semua yang Selesai, maks. 50)">' + ic('file', 16) + '<span>Berita Acara (PDF)<em id="nBap"></em></span></button><button class="btn secondary" id="pd" title="Laporan ringkas + tabel dalam PDF">' + ic('file', 16) + '<span>Laporan (PDF)</span></button><button class="btn ghost" id="pr" title="Cetak hasil filter">' + ic('file', 16) + '<span>Cetak</span></button></div></div></div>' +
        '<section class="card"><div class="row between wrap"><h3>' + ic('filter', 18) + ' Parameter Filter & Audit</h3><div class="chips" id="qr"></div></div><div class="grid4">' + field('Dari', '<div class="inp"><input type="date" id="fd" value="' + F.dari + '"></div>') + field('Sampai', '<div class="inp"><input type="date" id="fs" value="' + F.sampai + '"></div>') + field('Teknisi', '<select id="ft" class="selbox"><option value="">Semua teknisi (' + techs().length + ')</option>' + techs().map(function (t) { return '<option value="' + t.id + '">' + esc(t.nama) + '</option>'; }).join('') + '</select>') + field('Kategori', '<select id="fk" class="selbox"><option value="">Semua kategori</option>' + Object.keys(CAT).map(function (k) { return '<option value="' + k + '">' + esc(CAT[k].s) + '</option>'; }).join('') + '</select>') + field('Status', '<select id="fu" class="selbox"><option value="">Semua status</option>' + ['Completed', 'Canceled', 'Working', 'On_The_Way', 'Assigned', 'Pending'].map(function (k) { return '<option value="' + k + '" ' + (k === F.status ? 'selected' : '') + '>' + STATUS[k][0] + '</option>'; }).join('') + '</select>') + '</div>' +
        '<div class="row between wrap mt"><label class="chk"><input type="checkbox" id="fg"> Tampilkan hanya verifikasi GPS terkonfirmasi (geofence radius aman)</label><div class="row gap"><button class="btn ghost" id="fr">Reset Filter</button><button class="btn primary" id="fa" data-busy="Memuat…">Terapkan Filter</button></div></div></section>' +
        '<div id="lk">' + skel(1, 110) + '</div>' +
        '<section class="card lapcard"><div class="row between wrap"><h3>Data Transaksi & Log Servis <span class="pill ind" id="lcount">memuat…</span></h3><div class="inp ico sm">' + ic('search', 14) + '<input id="lq" placeholder="Cari ID, pelanggan, teknisi…" autocomplete="off" aria-label="Cari di tabel"></div></div><div class="tw" id="ltb">' + skel(4, 52) + '</div><div class="pager" id="lpg"></div><div class="lapload" id="lload" hidden><span class="spin lg"></span><b>Memuat data…</b></div></section></div>';

      // ---------------------------------------------------------------- tampilan
      function setLoading(on) { const l = $('#lload', v); if (l) l.hidden = !on; }
      function renderKpi() {
        const s = data.ringkas;
        $('#lk', v).innerHTML = '<div class="kpis">' + kpi('check', 'TIKET SELESAI', s.selesai, '', 'Total GMV: <b>' + rp(s.gmv) + '</b>', 'ok') + kpi('clock', 'RERATA DURASI SERVIS', s.durasi, 'Menit / Unit', 'dihitung dari check-in hingga selesai') + kpi('gps', 'KEPATUHAN GEOFENCE GPS', s.geofence + '%', '≤' + sec('Jarak_Maks_Checkin', 150) + 'm radius', 'Hanya ' + s.anomali + ' tiket anomali verifikasi log', 'ind') + kpi('star', 'SKOR KEPUASAN (CSAT)', s.csat ? s.csat.toFixed(2) : '-', '/ 5.00', 'Berdasarkan ' + s.ulasan + ' ulasan klien', 'warn') + '</div>';
      }
      function renderTable() {
        const rows = data.rows, sel = rows.filter(function (r) { return r.status === 'Completed' || r.status === 'Canceled'; });
        $('#lcount', v).textContent = data.total + (q ? ' data ditemukan' : ' data terfilter');
        $('#ltb', v).innerHTML = '<table class="tbl" id="rt"><thead><tr><th class="ck"><input type="checkbox" id="lall" aria-label="Pilih semua pesanan Selesai di halaman ini" ' + (sel.length && sel.every(function (r) { return pilih[r.id]; }) ? 'checked' : '') + ' ' + (sel.length ? '' : 'disabled') + '></th><th>ID TIKET</th><th>WAKTU</th><th>PELANGGAN & WILAYAH</th><th>LAYANAN</th><th>TEKNISI</th><th>VERIFIKASI GPS & FOTO</th><th>STATUS</th><th class="r">TOTAL</th><th></th></tr></thead><tbody>' +
          (rows.length ? rows.map(function (r) {
            const g = r.verifikasi === 'TRUE', fin = r.status === 'Completed' || r.status === 'Canceled';
            return '<tr class="' + (g ? 'warnrow' : '') + '"><td class="ck">' + (fin ? '<input type="checkbox" class="rck" data-id="' + esc(r.id) + '" ' + (pilih[r.id] ? 'checked' : '') + ' aria-label="Pilih #' + esc(r.id) + '">' : '') + '</td><td><b class="mono2">#' + esc(r.id) + '</b></td><td>' + tglID(r.tanggal) + '<small>' + (r.selesai ? jam(r.selesai) : esc(r.slot)) + '</small></td><td><b>' + esc(r.pelanggan) + '</b><small>' + esc(r.jenisAlamat) + ' • ' + esc(r.wilayah) + '</small></td><td>' + esc(r.layanan) + '<small>' + esc(r.kategori) + '</small></td><td>' + avatar(r.teknisi, 26, 'ind') + ' ' + esc(r.teknisi) + '</td><td>' + (r.jarakTiba != null ? '<span class="pill ' + (g ? 'warn' : 'ok') + '">' + (g ? 'GPS Anomali ' + r.jarakTiba + ' m' : 'GPS ' + r.jarakTiba + ' m') + ' • ' + r.foto + ' Foto</span>' : '<small class="muted">—</small>') + '</td><td>' + badge(r.status) + '</td><td class="r"><b>' + rp(r.total) + '</b></td><td class="act">' + (fin ? '<button class="icon-btn bapone" data-bap="' + esc(r.id) + '" title="Unduh Berita Acara (PDF)" aria-label="Unduh Berita Acara #' + esc(r.id) + '">' + ic('dl', 16) + '</button>' : '') + '</td></tr>';
          }).join('') : '<tr><td colspan="10">' + empty('file', q ? 'Tidak ada yang cocok' : 'Tidak ada data', q ? 'Coba kata kunci lain.' : 'Ubah filter lalu terapkan kembali.') + '</td></tr>') + '</tbody></table>';
      }
      function renderPager() {
        const d = data, from = d.total ? (d.hal - 1) * d.per + 1 : 0, to = Math.min(d.hal * d.per, d.total), start = Math.max(1, Math.min(d.hal - 2, d.pages - 4));
        $('#lpg', v).innerHTML = '<small class="muted">Menampilkan ' + from + ' - ' + to + ' dari ' + d.total + ' data</small><label class="perp">Baris per halaman <select id="lper" class="selbox sm">' + [10, 25, 50, 100].map(function (n) { return '<option ' + (n === d.per ? 'selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label><div class="pg"><button data-p="1" ' + (d.hal <= 1 ? 'disabled' : '') + ' aria-label="Halaman pertama">«</button><button data-p="' + (d.hal - 1) + '" ' + (d.hal <= 1 ? 'disabled' : '') + ' aria-label="Sebelumnya">‹</button>' + Array.from({ length: Math.min(d.pages, 5) }, function (_, i) { const p = start + i; return '<button data-p="' + p + '" class="' + (p === d.hal ? 'on' : '') + '">' + p + '</button>'; }).join('') + '<button data-p="' + (d.hal + 1) + '" ' + (d.hal >= d.pages ? 'disabled' : '') + ' aria-label="Berikutnya">›</button><button data-p="' + d.pages + '" ' + (d.hal >= d.pages ? 'disabled' : '') + ' aria-label="Halaman terakhir">»</button></div>';
      }
      function updBap() { const n = Object.keys(pilih).length, e = $('#nBap', v); if (e) e.textContent = n ? ' (' + n + ')' : ''; }
      function renderAll() { if (!live() || !data) return; renderKpi(); renderTable(); renderPager(); updBap(); setLoading(false); }
      function renderError(e) {
        setLoading(false); if (!live()) return;
        $('#lk', v).innerHTML = ''; $('#lpg', v).innerHTML = ''; $('#lcount', v).textContent = 'gagal';
        $('#ltb', v).innerHTML = '<div class="lap-err">' + ic('warn', 40) + '<h3>Data laporan belum bisa dimuat</h3><p>' + esc(e && e.message || 'Terjadi kesalahan.') + '</p><button class="btn primary" id="lRetry">' + ic('refresh', 16) + ' Coba lagi</button></div>';
      }
      function markChips() {
        const P = [['Hari Ini', 0], ['7 Hari Terakhir', 6], ['30 Hari', 29], ['Bulan Ini', 'm']], mulai = todayStr().slice(0, 8) + '01';
        $('#qr', v).innerHTML = P.map(function (x) { const on = F.sampai === todayStr() && F.dari === (x[1] === 'm' ? mulai : todayStr(-x[1])); return '<button class="chip ' + (on ? 'sel' : '') + '" data-q="' + x[1] + '">' + x[0] + '</button>'; }).join('');
      }

      // ---------------------------------------------------------------- memuat data (cache klien + abaikan respons usang)
      function prefetch() { if (data && data.hal < data.pages) { const p = params({ hal: data.hal + 1, per: per }), k = JSON.stringify(p); if (!CACHE[k]) api('admin.laporan', p).then(function (r) { CACHE[k] = { t: Date.now(), v: r }; }).catch(noop); } }
      function warm() { if (warmed) return; warmed = true; setTimeout(function () { if (live()) { libPdf().catch(noop); } }, 1200); } // pustaka ekspor disiapkan di latar → klik ekspor instan
      function load(force) {
        const p = params({ hal: hal, per: per }), key = JSON.stringify(p), my = ++seq, hit = CACHE[key];
        if (hit && !force && Date.now() - hit.t < TTL) { data = hit.v; hal = data.hal; renderAll(); prefetch(); return Promise.resolve(); }
        setLoading(!!data);
        return api('admin.laporan', p).then(function (r) {
          if (my !== seq || !live()) return;
          CACHE[key] = { t: Date.now(), v: r }; data = r; hal = r.hal; renderAll(); prefetch(); warm();
        }).catch(function (e) {
          if (my !== seq || !live()) return; setLoading(false);
          if (!data) renderError(e); else toastErr(e, function () { load(true); });
        });
      }
      function apply() {
        const d = $('#fd', v).value, s = $('#fs', v).value;
        if (!d || !s) { toast('Isi tanggal mulai dan tanggal akhir.', 'warn'); return Promise.resolve(); }
        F.dari = d <= s ? d : s; F.sampai = d <= s ? s : d;
        if (d > s) { $('#fd', v).value = F.dari; $('#fs', v).value = F.sampai; toast('Tanggal dibalik agar berurutan.', 'info'); }
        F.techId = $('#ft', v).value; F.kategori = $('#fk', v).value; F.status = $('#fu', v).value; F.soloGeo = $('#fg', v).checked;
        hal = 1; markChips(); return load();
      }

      // ---------------------------------------------------------------- ekspor (bertahap, ada indikator kemajuan)
      async function ambilSemua(max, btn, label, extra) {
        const out = []; let off = 0, total = Infinity, ringkas = data && data.ringkas;
        while (off < total && out.length < max) {
          const r = await api('admin.laporanEkspor', params(Object.assign({ offset: off, limit: Math.min(MAXC, max - out.length) }, extra)));
          total = r.total; ringkas = r.ringkas; off += r.rows.length; out.push.apply(out, r.rows);
          lab(btn, label + ' ' + out.length + '/' + Math.min(total, max)); if (!r.rows.length) break;
        }
        return { rows: out, total: total === Infinity ? out.length : total, ringkas: ringkas };
      }
      const excelRow = function (r) { return { 'ID Tiket': r.id, 'Tanggal Kunjungan': r.tanggal, 'Slot': r.slot, 'Selesai': r.selesai ? tglJam(r.selesai) : '', 'Pelanggan': r.pelanggan, 'Wilayah': r.wilayah, 'Jenis Alamat': r.jenisAlamat, 'Layanan': r.layanan, 'Kategori': r.kategori, 'Teknisi': r.teknisi, 'Status': STATUS[r.status] ? STATUS[r.status][0] : r.status, 'Tarif Dasar (Rp)': r.harga, 'Transport (Rp)': r.transport, 'Biaya Tambahan (Rp)': r.tambahan, 'Total (Rp)': r.total, 'Jarak Check-in (m)': r.jarakTiba == null ? '' : r.jarakTiba, 'Akurasi GPS (m)': r.akurasi == null ? '' : r.akurasi, 'Verifikasi GPS': r.verifikasi === 'TRUE' ? 'ANOMALI' : (r.jarakTiba == null ? '' : 'OK'), 'Jumlah Foto': r.foto, 'Rating': r.rating || '' }; };
      function unduhCsv(rows, nama) {
        const h = Object.keys(excelRow(rows[0] || { status: '' })), esc2 = function (x) { x = String(x == null ? '' : x); return /[";\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; };
        const lines = ['sep=;', h.join(';')].concat(rows.map(function (r) { const o = excelRow(r); return h.map(function (k) { return esc2(o[k]); }).join(';'); }));
        saveFile(new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), nama);
      }
      async function ekspExcel(btn) {
        if (!data || !data.total) return toast('Tidak ada data untuk diekspor. Terapkan filter dulu.', 'warn');
        const all = await ambilSemua(MAXX, btn, 'Mengambil data', {});
        if (all.total > all.rows.length) toast('Ekspor dibatasi ' + rpn(MAXX) + ' baris pertama. Persempit rentang tanggal.', 'warn');
        lab(btn, 'Menyusun Excel…'); await tick();
        const nama = 'Laporan_' + F.dari + '_sd_' + F.sampai, rk = all.ringkas;
        try {
          const objs = all.rows.map(excelRow);
          const hdr = objs.length ? Object.keys(objs[0]) : Object.keys(excelRow({ status: '' }));
          const money = hdr.map(function (h, i) { return /\(Rp\)/.test(h) ? i : -1; }).filter(function (i) { return i >= 0; });
          const data2 = [hdr].concat(objs.map(function (o) { return hdr.map(function (h) { return o[h]; }); }));
          const ringkas = [
            ['Laporan Operasional — ' + App.appName()], [],
            ['Periode', tglID(F.dari) + ' s.d. ' + tglID(F.sampai)], ['Filter', filterText()], ['Dibuat', tglJam(new Date().toISOString())], [],
            ['Tiket sesuai filter', rk.total], ['Tiket selesai', rk.selesai], ['Total GMV (Rp)', rk.gmv], ['Rerata durasi servis (menit)', rk.durasi],
            ['Kepatuhan geofence (%)', rk.geofence], ['Tiket anomali GPS', rk.anomali], ['Skor kepuasan (CSAT)', rk.csat], ['Jumlah ulasan', rk.ulasan]
          ];
          const widths = hdr.map(function (h) { return /Layanan|Pelanggan|Wilayah/.test(h) ? 28 : /Rp|Tanggal|Selesai|Teknisi/.test(h) ? 18 : 14; });
          const blob = makeXlsx([
            { nm: 'Ringkasan', rows: ringkas, widths: [34, 46] },
            { nm: 'Data', rows: data2, widths: widths, money: money, header: true, freeze: true, autofilter: true }
          ]);
          saveFile(blob, nama + '.xlsx');
          toast('Excel diunduh (' + rpn(objs.length) + ' baris).', 'ok');
        } catch (e) {
          unduhCsv(all.rows, nama + '.csv');
          toast('Excel tidak dapat dibuat di perangkat ini. File CSV (bisa dibuka di Excel) diunduh.', 'warn');
        }
      }
      // Isi laporan dalam bentuk HTML (dipakai untuk cetak dan sebagai cadangan PDF)
      function laporanHtml(rows, rk) {
        return '<h2>Laporan Operasional — ' + esc(App.appName()) + '</h2><p>Periode ' + tglID(F.dari) + ' s.d. ' + tglID(F.sampai) + ' • ' + esc(filterText()) + '</p>' +
          '<p><b>Tiket</b> ' + rk.total + ' • <b>Selesai</b> ' + rk.selesai + ' • <b>GMV</b> ' + rp(rk.gmv) + ' • <b>Durasi rata-rata</b> ' + rk.durasi + ' mnt • <b>Geofence</b> ' + rk.geofence + '% • <b>CSAT</b> ' + (rk.csat || '-') + '</p>' +
          '<table><thead><tr><th>ID</th><th>Tanggal</th><th>Pelanggan</th><th>Layanan</th><th>Teknisi</th><th>Status</th><th>GPS</th><th class="r">Total</th></tr></thead><tbody>' +
          rows.map(function (r) { return '<tr><td>' + esc(r.id) + '</td><td>' + esc(r.tanggal) + '</td><td>' + esc(r.pelanggan) + '</td><td>' + esc(r.layanan) + '</td><td>' + esc(r.teknisi) + '</td><td>' + esc(STATUS[r.status] ? STATUS[r.status][0] : r.status) + '</td><td>' + (r.jarakTiba == null ? '-' : r.jarakTiba + ' m' + (r.verifikasi === 'TRUE' ? ' !' : '')) + '</td><td class="r">' + rp(r.total) + '</td></tr>'; }).join('') +
          '</tbody></table><p class="pf">Dicetak ' + tglJam(new Date().toISOString()) + ' • ' + rows.length + ' baris</p>';
      }
      async function ekspPdf(btn) {
        if (!data || !data.total) return toast('Tidak ada data untuk diekspor. Terapkan filter dulu.', 'warn');
        const all = await ambilSemua(MAXP, btn, 'Mengambil data', {});
        if (all.total > all.rows.length) toast('PDF dibatasi ' + rpn(MAXP) + ' baris pertama. Gunakan Excel untuk data lebih banyak.', 'warn');
        lab(btn, 'Menyusun PDF…'); await tick();
        const nama = 'Laporan_' + F.dari + '_sd_' + F.sampai + '.pdf', rk = all.ringkas;
        try {
          await libPdf();
          const ok = function (t) { return String(t == null ? '' : t).replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/→/g, '->').replace(/[^\x00-\xFF•—–…’“”]/g, '?'); };
          const doc = new jspdf.jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' }), W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
          doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(15, 23, 42);
          doc.text(ok('Laporan Operasional — ' + App.appName()), 40, 38);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
          const info = ok('Periode ' + tglID(F.dari) + ' s.d. ' + tglID(F.sampai) + '  •  ' + filterText());
          const kpi = ok('Tiket: ' + rk.total + '  •  Selesai: ' + rk.selesai + '  •  GMV: ' + rp(rk.gmv) + '  •  Durasi rata-rata: ' + rk.durasi + ' mnt  •  Geofence: ' + rk.geofence + '%  •  CSAT: ' + (rk.csat || '-'));
          const bagi = function (t) { return doc.splitTextToSize(t, W - 80); };
          const li = bagi(info), lk = bagi(kpi);
          doc.text(li, 40, 54); doc.text(lk, 40, 54 + li.length * 11 + 2);
          const yAwal = 54 + (li.length + lk.length) * 11 + 10;
          await tick();
          doc.autoTable({ startY: yAwal, head: [['ID', 'Tanggal', 'Pelanggan', 'Layanan', 'Teknisi', 'Status', 'GPS', 'Total']],
            body: all.rows.map(function (r) { return [r.id, r.tanggal, ok(r.pelanggan), ok(r.layanan), ok(r.teknisi), STATUS[r.status] ? STATUS[r.status][0] : r.status, r.jarakTiba == null ? '-' : r.jarakTiba + ' m' + (r.verifikasi === 'TRUE' ? ' !' : ''), ok(rp(r.total))]; }),
            styles: { fontSize: 7.5, cellPadding: 3, overflow: 'linebreak', valign: 'middle' }, headStyles: { fillColor: [79, 70, 229], textColor: 255 }, alternateRowStyles: { fillColor: [247, 247, 255] },
            columnStyles: { 7: { halign: 'right' } }, margin: { left: 40, right: 40, bottom: 36 }, tableWidth: 'auto' });
          const n = doc.internal.getNumberOfPages(); doc.setFontSize(8);
          for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setTextColor(100, 116, 139); doc.text('Halaman ' + i + ' dari ' + n, W - 40, H - 18, { align: 'right' }); doc.text('Dibuat ' + tglJam(new Date().toISOString()), 40, H - 18); }
          saveFile(doc.output('blob'), nama);
          toast('PDF diunduh (' + rpn(all.rows.length) + ' baris, ' + n + ' halaman).', 'ok');
        } catch (e) {
          unduhHtml('Laporan Operasional', laporanHtml(all.rows, rk), nama.replace(/\.pdf$/, '.html'));
          toast('PDF tidak dapat dibuat di perangkat ini. Laporan diunduh sebagai HTML: buka lalu Cetak → Simpan sebagai PDF.', 'warn');
        }
      }
      async function ekspBap(btn) {
        let ids = Object.keys(pilih);
        if (!ids.length) {
          if (!data || !data.total) return toast('Tidak ada pesanan pada filter ini. Ubah filter, lalu centang pesanan yang ingin dibuatkan Berita Acara.', 'warn');
          const y = await confirmDlg('Belum ada pesanan yang dicentang. Buat Berita Acara untuk SEMUA pesanan Selesai & Dibatalkan pada hasil filter (maks. ' + MAXB + ' pesanan pertama)?', { title: 'Berita Acara (PDF)', ok: 'Buat PDF' });
          if (!y) return;
          lab(btn, 'Mengambil data…'); const r = await api('admin.laporanEkspor', params({ status: '', offset: 0, limit: 1000 })); ids = r.rows.filter(function (x) { return x.status === 'Completed' || x.status === 'Canceled'; }).map(function (x) { return x.id; });
          if (!ids.length) throw new Error('Tidak ada pesanan Selesai atau Dibatalkan pada filter ini.');
        }
        if (ids.length > MAXB) { toast('Dibatasi ' + MAXB + ' pesanan per PDF; ' + MAXB + ' pertama dibuat.', 'warn'); ids = ids.slice(0, MAXB); }
        lab(btn, 'Mengambil data…'); const r = await api('admin.beritaAcara', { ids: ids });
        if (!r.list.length) throw new Error('Tidak ada pesanan Selesai atau Dibatalkan yang dapat dibuatkan Berita Acara.');
        await bapPdfMulti(r.list, function (i, n) { lab(btn, 'Menyusun ' + i + '/' + n + '…'); });
        toast('Berita Acara diunduh (' + r.list.length + ' pesanan).', 'ok');
      }
      async function cetak(btn) {
        if (!data || !data.total) return toast('Tidak ada data untuk dicetak. Terapkan filter dulu.', 'warn');
        const MAXPR = 1000, all = await ambilSemua(MAXPR, btn, 'Menyiapkan', {});
        if (all.total > all.rows.length) toast('Cetak dibatasi ' + rpn(MAXPR) + ' baris pertama. Gunakan Laporan (PDF) atau Excel untuk data lebih banyak.', 'warn');
        lab(btn, 'Membuka cetak…'); await tick(60);
        if (!printHtml('Laporan Operasional', laporanHtml(all.rows, all.ringkas))) toast('Pop-up diblokir. Laporan diunduh sebagai file HTML: buka lalu cetak.', 'warn');
      }
      const bersihCetak = function () { document.body.classList.remove('printing'); const p = $('#printArea'); if (p) p.innerHTML = ''; };
      window.onafterprint = bersihCetak;
      // Tombol ekspor: simpan tampilan asli SEBELUM fungsi dijalankan (sebelumnya tersimpan setelah label diubah → macet),
      // satu proses sekaligus, dan selalu dipulihkan (berhasil, gagal, atau dibatalkan).
      let sibuk = false;
      async function jalankan(btn, label, fn) {
        if (sibuk) return; sibuk = true;
        const asli = btn.innerHTML, dulu = btn.disabled;
        btn.disabled = true; btn.classList.add('loading');
        btn.innerHTML = '<span class="spin"></span><span>' + esc(label) + '</span>';
        try { await fn(btn); }
        catch (e) { toastErr(e); }
        finally { btn.innerHTML = asli; btn.disabled = dulu; btn.classList.remove('loading'); sibuk = false; updBap(); }
      }

      // ---------------------------------------------------------------- event
      v.addEventListener('click', function (e) {
        const b = e.target.closest('button'); if (!b) return;
        if (b.id === 'fa') busy(b, apply());
        else if (b.id === 'fr') { Object.assign(F, { dari: todayStr(-6), sampai: todayStr(), techId: '', kategori: '', status: 'Completed', soloGeo: false }); $('#fd', v).value = F.dari; $('#fs', v).value = F.sampai; $('#ft', v).value = ''; $('#fk', v).value = ''; $('#fu', v).value = 'Completed'; $('#fg', v).checked = false; q = ''; $('#lq', v).value = ''; hal = 1; markChips(); busy($('#fa', v), load()); }
        else if (b.dataset.q !== undefined) { const m = b.dataset.q === 'm'; $('#fd', v).value = m ? todayStr().slice(0, 8) + '01' : todayStr(-Number(b.dataset.q)); $('#fs', v).value = todayStr(); busy($('#fa', v), apply()); }
        else if (b.dataset.p) { hal = Math.max(1, Number(b.dataset.p)); load(); }
        else if (b.id === 'lRetry') { data = null; load(true); }
        else if (b.dataset.bap) jalankan(b, 'Menyiapkan…', function () { return api('admin.beritaAcara', { ids: [b.dataset.bap] }).then(function (r) { if (!r.list.length) throw new Error('Berita Acara hanya untuk pesanan Selesai.'); return bapPdf(r.list[0]); }); });
        else if (b.id === 'xl') jalankan(b, 'Menyiapkan…', ekspExcel);
        else if (b.id === 'pd') jalankan(b, 'Menyiapkan…', ekspPdf);
        else if (b.id === 'bp') jalankan(b, 'Menyiapkan…', ekspBap);
        else if (b.id === 'pr') jalankan(b, 'Menyiapkan…', cetak);
      });
      v.addEventListener('change', function (e) {
        const t = e.target;
        if (t.classList.contains('rck')) { if (t.checked) pilih[t.dataset.id] = 1; else delete pilih[t.dataset.id]; updBap(); const sel = data.rows.filter(function (r) { return r.status === 'Completed'; }), al = $('#lall', v); if (al) al.checked = sel.length > 0 && sel.every(function (r) { return pilih[r.id]; }); }
        else if (t.id === 'lall') { data.rows.filter(function (r) { return r.status === 'Completed' || r.status === 'Canceled'; }).forEach(function (r) { if (t.checked) pilih[r.id] = 1; else delete pilih[r.id]; }); $$('.rck', v).forEach(function (c) { c.checked = t.checked; }); updBap(); }
        else if (t.id === 'lper') { per = Number(t.value); hal = 1; load(); }
      });
      $('#lq', v).oninput = function (e) { clearTimeout(qT); const val = e.target.value.trim(); qT = setTimeout(function () { if (val === q) return; q = val; hal = 1; load(); }, 400); }; // tunggu berhenti mengetik
      markChips(); load();
      return function () { seq++; clearTimeout(qT); window.onafterprint = null; bersihCetak(); done(); };
    }
  };

  // ====================================================================== PENGGUNA & TEKNISI
  R.routes['/pengguna'] = {
    title: 'Pengguna & Teknisi',
    render: function (v) {
      App.title('Pengguna & Teknisi'); const done = own(), live = alive(); let users = [], tab = 'Teknisi', q = '', sel = null;
      v.innerHTML = '<div class="apad"><div class="row between wrap"><div><span class="eyebrow">Operasional • F-35 RBAC</span><h1 class="h1">Manajemen Pengguna & Armada Teknisi</h1><p class="muted">Kelola akun, hak akses peran, status penugasan armada, dan keahlian teknisi.</p></div><button class="btn primary" id="ua">' + ic('plus', 16) + ' Tambah Pengguna</button></div><div class="kpis" id="uk"></div><div class="g21 ug"><section class="card"><div class="chips" id="ut"></div><div class="filters"><div class="inp ico grow">' + ic('search', 16) + '<input id="uq" placeholder="Cari nama, email, ID…"></div></div><div class="tw" id="ul">' + skel(3, 60) + '</div></section><aside class="card" id="ui"></aside></div></div>';
      const T = [['all', 'Semua Pengguna', function () { return true; }], ['Teknisi', 'Teknisi Lapangan', function (u) { return u.role === 'Teknisi'; }], ['Admin', 'Admin & Dispatcher', function (u) { return u.role === 'Admin'; }], ['Customer', 'Pelanggan', function (u) { return u.role === 'Customer'; }]];
      function draw() {
        if (!live()) return;
        const n = function (f) { return users.filter(f).length; }, tk = users.filter(function (u) { return u.role === 'Teknisi'; });
        $('#uk', v).innerHTML = kpi('users', 'TOTAL AKUN TERDAFTAR', users.length, '', n(T[3][2]) + ' Pelanggan / ' + tk.length + ' Teknisi / ' + n(T[2][2]) + ' Admin') + kpi('zap', 'ARMADA TEKNISI AKTIF', tk.filter(function (u) { return u.aktif && u.tech && u.tech.status !== 'Off'; }).length, '/ ' + tk.length, tk.filter(function (u) { return u.tech && u.tech.status === 'Available'; }).length + ' Tersedia • ' + tk.filter(function (u) { return u.tech && u.tech.status === 'On-Duty'; }).length + ' Bertugas', 'ok') + kpi('shield', 'AKUN NONAKTIF', n(function (u) { return !u.aktif; }), '', 'Tidak dapat masuk ke sistem') + kpi('lock', 'AKUN BER-PIN', n(function (u) { return u.pinAda; }), '', 'Dapat login dengan ID + PIN', 'ind');
        $('#ut', v).innerHTML = T.map(function (t) { return '<button class="chip ' + (tab === t[0] ? 'sel' : '') + '" data-t="' + t[0] + '">' + t[1] + ' <b>' + n(t[2]) + '</b></button>'; }).join('');
        const f = T.find(function (t) { return t[0] === tab; })[2], rows = users.filter(function (u) { return f(u) && (!q || (u.nama + u.email + u.id + (u.tech ? u.tech.id : '')).toLowerCase().indexOf(q) > -1); });
        $('#ul', v).innerHTML = rows.length ? '<table class="tbl utbl"><thead><tr><th>PENGGUNA</th><th>PERAN</th><th>KEAHLIAN / INFO</th><th>STATUS</th><th></th></tr></thead><tbody>' + rows.map(function (u) { return '<tr class="' + (sel === u.id ? 'selrow' : '') + '" data-id="' + esc(u.id) + '"><td><div class="row gap">' + avPhoto(u.nama, u.id, u.fotoAda, 36, 'ind') + '<div><b>' + esc(u.nama) + '</b>' + (u.tech ? ' <small class="mono">' + esc(u.tech.id) + '</small>' : '') + '<small>' + esc(u.email) + '</small></div></div></td><td><span class="chip soft">' + ({ Customer: 'Pelanggan', Teknisi: 'Teknisi Lapangan', Admin: 'Admin / Dispatcher' }[u.role]) + '</span></td><td>' + (u.tech ? u.tech.keahlian.map(function (k) { return '<span class="chip soft">' + esc(k) + '</span>'; }).join('') : '<small class="muted">' + esc(u.hp ? '+' + u.hp : '-') + '</small>') + '</td><td>' + (!u.aktif ? '<span class="badge cancel"><i></i>Nonaktif</span>' : u.tech ? badge(u.tech.status) : '<span class="badge done"><i></i>Aktif</span>') + '</td><td class="act">' + (u.role === 'Admin' ? '' : '<button class="icon-btn" data-ed="' + esc(u.id) + '" aria-label="Edit ' + esc(u.nama) + '" title="Edit">' + ic('edit', 16) + '</button><button class="icon-btn" data-del="' + esc(u.id) + '" aria-label="Hapus ' + esc(u.nama) + '" title="Hapus">' + ic('trash', 16) + '</button>') + '</td></tr>'; }).join('') + '</tbody></table>' : empty('users', 'Tidak ada pengguna', '');
        info();
        lazyProfil(v);
      }
      function info() {
        const u = users.find(function (x) { return x.id === sel; }), box = $('#ui', v);
        if (!u) { box.innerHTML = empty('user', 'Inspeksi Detail', 'Pilih pengguna di tabel untuk melihat detail dan aksi.'); return; }
        const t = u.tech;
        box.innerHTML = '<div class="row between"><h3>' + ic('users', 18) + ' Inspeksi Detail ' + (t ? 'Armada' : 'Pengguna') + '</h3>' + (u.aktif ? '<span class="pill ok">AKTIF</span>' : '<span class="pill err">NONAKTIF</span>') + '</div><div class="row gap">' + avPhoto(u.nama, u.id, u.fotoAda, 64, 'ind') + '<div><h2 class="h2">' + esc(u.nama) + '</h2><small>' + esc(u.email) + '</small>' + (t ? '<small class="rate">' + ic('star', 12) + ' ' + (t.rating ? t.rating.toFixed(1) : 'Baru') + ' • ' + t.selesai + ' servis selesai</small>' : '') + '</div></div><div class="g2s"><div class="box"><small>ID Sistem</small><b class="mono ind-t">' + esc(t ? t.id : u.id) + '</b><small class="mono muted">' + esc(u.id) + '</small></div><div class="box"><small>' + (t ? 'Kendaraan' : 'WhatsApp') + '</small><b>' + esc(t ? t.kendaraan || '-' : (u.hp ? '+' + u.hp : '-')) + '</b><small class="mono muted">' + esc(t ? t.plat : '') + '</small></div></div>' + (t ? '<div class="box"><small>' + ic('pin', 12) + ' Alamat & Basecamp</small><b>' + esc(t.hub || '-') + '</b></div><h4>Keahlian Tersertifikasi</h4><div class="chips">' + (t.keahlian.map(function (k) { return '<span class="chip soft">' + ic('check', 12) + ' ' + esc(k) + '</span>'; }).join('') || '<small class="muted">Belum diisi</small>') + '</div>' : '') +
          '<div class="box"><b>' + ic('shield', 14) + ' Hak Akses Modul (RBAC)</b><small>' + ({ Customer: 'W-02/W-03/W-04: pesan, lacak, riwayat. Dibatasi: modul teknisi & admin.', Teknisi: 'W-05/W-06/W-07: terima penugasan, check-in GPS, input foto & biaya. Dibatasi: modul Admin, keuangan, log global.', Admin: 'Semua modul: dashboard, penugasan, peta, katalog, laporan, pengguna, pengaturan.' }[u.role]) + '</small></div>' +
          '<div class="row gap wrap"><button class="btn secondary grow" data-a="pin">' + ic('lock', 16) + ' Reset PIN</button><button class="btn secondary grow" data-a="sesi">' + ic('logout', 16) + ' Cabut Sesi</button></div><div class="row gap wrap mt">' + (t ? '<a class="btn secondary grow" href="#/armada">' + ic('gps', 16) + ' Lacak GPS</a>' : '') + '<button class="btn primary grow" data-a="edit">' + ic('edit', 16) + ' Edit Data</button>' + (t ? '<button class="btn secondary grow" data-a="status">' + ic('check', 16) + ' Atur Status Kerja</button>' : '') + '</div>' + (u.role === 'Admin' ? '' : '<button class="btn danger-o block mt" data-a="del">' + ic('trash', 16) + ' Hapus ' + (u.role === 'Teknisi' ? 'Teknisi' : 'Pelanggan') + '</button>');
      }
      // Foto pengguna (pelanggan/teknisi) diubah admin: pratinjau, pilih, hapus
      function fotoPicker(u) {
        return '<label class="lbl">Foto profil</label><div class="row gap wrap"><div class="fotou" id="fuBox">' + avPhoto(u ? u.nama : 'Baru', u ? u.id : '', u && u.fotoAda, 72, 'ind') + '</div><div class="col gap"><button type="button" class="btn secondary sm" id="fuPick">' + ic('camera', 16) + ' Pilih foto</button><button type="button" class="btn danger-o sm" id="fuHapus">' + ic('trash', 16) + ' Hapus foto</button><small class="muted">JPG/PNG, otomatis diperkecil.</small></div></div>';
      }
      function bindFoto(m, u) {
        let pick = null, hapus = false;
        $('#fuPick', m.el).onclick = function () { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/jpeg,image/png'; i.onchange = function () { const f = i.files[0]; if (!f) return; kompres(f, 256, 0.85).then(function (k) { pick = k; hapus = false; $('#fuBox', m.el).innerHTML = '<img src="' + k.dataUrl + '" alt="" style="width:72px;height:72px;border-radius:50%;object-fit:cover">'; }).catch(toastErr); }; i.click(); };
        $('#fuHapus', m.el).onclick = function () { pick = null; hapus = true; $('#fuBox', m.el).innerHTML = avPhoto(u ? u.nama : 'Baru', '', false, 72, 'ind'); };
        return { get: function () { return { pick: pick, hapus: hapus }; } };
      }
      function simpanFoto(id, f) {
        if (!id || (!f.pick && !f.hapus)) return Promise.resolve();
        return act('admin.fotoUser', { id: id, mime: f.pick ? f.pick.mime : '', data: f.pick ? f.pick.data : '' });
      }
      function userDlg(u) {
        const t = u && u.tech; let ahli = t ? t.keahlian.slice() : [], role = u ? u.role : 'Customer';
        const m = modal({ title: u ? 'Ubah Pengguna' : 'Tambah Pengguna', body: fotoPicker(u) + field('Nama Lengkap', '<div class="inp"><input id="un" maxlength="80" value="' + esc(u ? u.nama : '') + '"></div>') + field('Email Google', '<div class="inp"><input id="ue" type="email" value="' + esc(u ? u.email : '') + '"></div>') + field('Nomor WhatsApp', '<div class="inp"><input id="uh" value="' + esc(u && u.hp ? '+' + u.hp : '') + '"></div>') + field('Alamat <small class="muted" style="display:inline">(pelanggan)</small>', '<div class="inp"><input id="ual" maxlength="300" value="' + esc(u && u.alamat ? u.alamat : '') + '"></div>') + field('Peran', '<select id="ur" class="selbox">' + [['Customer', 'Pelanggan'], ['Teknisi', 'Teknisi Lapangan'], ['Admin', 'Admin / Dispatcher']].map(function (r) { return '<option value="' + r[0] + '" ' + (role === r[0] ? 'selected' : '') + '>' + r[1] + '</option>'; }).join('') + '</select>') +
          '<div id="tf" ' + (role === 'Teknisi' ? '' : 'hidden') + '><label class="lbl">Keahlian</label><div class="chips" id="ua2">' + Object.keys(CAT).map(function (k) { return '<button type="button" class="chip ' + (ahli.indexOf(k) > -1 ? 'sel' : '') + '" data-k="' + k + '">' + esc(CAT[k].s) + '</button>'; }).join('') + '</div><div class="grid2">' + field('Kendaraan', '<div class="inp"><input id="uk2" value="' + esc(t ? t.kendaraan : '') + '"></div>') + field('Plat', '<div class="inp"><input id="up" value="' + esc(t ? t.plat : '') + '"></div>') + '</div>' + field('Basecamp / Hub', '<div class="inp"><input id="ub" value="' + esc(t ? t.hub : '') + '"></div>') + '</div><label class="chk big"><span class="sw"><input type="checkbox" id="uac" ' + (!u || u.aktif ? 'checked' : '') + '><i></i></span> <b>Akun aktif</b></label>' + (u ? '' : '<label class="chk"><input type="checkbox" id="upn" checked> Buat PIN login otomatis (ditampilkan sekali)</label>'),
          actions: [{ label: 'Batal', cls: 'ghost' }, { label: 'Simpan', cls: 'primary', fn: function (c, b, ov) {
            const p = { id: u ? u.id : '', nama: $('#un', ov).value, email: $('#ue', ov).value, hp: $('#uh', ov).value, role: $('#ur', ov).value, aktif: $('#uac', ov).checked, keahlian: ahli, kendaraan: $('#uk2', ov).value, plat: $('#up', ov).value, hub: $('#ub', ov).value, alamat: $('#ual', ov).value, buatPin: !u && $('#upn', ov).checked };
            busy(b, act('admin.userSimpan', p).then(function (r) { return simpanFoto(r.id, fotoCtl.get()).then(function () { return r; }); }).then(function (r) { c(); toast(u ? 'Pengguna diperbarui.' : 'Pengguna ditambahkan.', 'ok'); sel = r.id; if (r.pin) pinShow(p.nama, r.pin); return load(); }).catch(toastErr)); } }] });
        $('#ur', m.el).onchange = function (e) { $('#tf', m.el).hidden = e.target.value !== 'Teknisi'; };
        const fotoCtl = bindFoto(m, u);
        $('#ua2', m.el).onclick = function (e) { const b = e.target.closest('button'); if (!b) return; const i = ahli.indexOf(b.dataset.k); if (i > -1) ahli.splice(i, 1); else ahli.push(b.dataset.k); b.classList.toggle('sel'); };
      }
      function hapus(u) {
        const info = u.role === 'Teknisi' ? 'Akun, data armada, dan PIN-nya akan dihapus.' : 'Akun, alamat tersimpan, foto profil, dan PIN-nya akan dihapus.';
        confirmDlg('Hapus ' + u.nama + ' (' + (u.role === 'Teknisi' ? 'Teknisi' : 'Pelanggan') + ') secara permanen? ' + info + ' Riwayat pesanan tetap tersimpan, tetapi namanya tidak lagi tampil. Untuk berhenti sementara, gunakan Edit → matikan "Akun aktif".', { title: 'Hapus pengguna', ok: 'Ya, hapus', danger: true }).then(function (y) {
          if (!y) return;
          act('admin.userHapus', { id: u.id }).then(function (r) { users = users.filter(function (x) { return x.id !== u.id; }); if (sel === u.id) sel = null; draw(); toast('Pengguna dihapus.', 'ok'); }).catch(toastErr);
        });
      }
      function pinShow(nama, pin) { modal({ title: 'PIN untuk ' + nama, body: '<p class="muted">PIN hanya ditampilkan sekarang. Sampaikan kepada pengguna dengan aman.</p><div class="pinbox">' + esc(pin) + '</div>', actions: [{ label: 'Salin', cls: 'secondary', fn: function () { navigator.clipboard && navigator.clipboard.writeText(pin); toast('PIN disalin.', 'ok'); } }, { label: 'Selesai', cls: 'primary' }] }); }
      function load() { return api('admin.users').then(function (r) { users = r.list; draw(); }); }
      v.addEventListener('click', function (e) {
        const b = e.target.closest('button'), tr = e.target.closest('tr[data-id]'), u = users.find(function (x) { return x.id === sel; });
        if (b && b.dataset.ed) { userDlg(users.find(function (x) { return x.id === b.dataset.ed; })); }
        else if (b && b.dataset.del) { hapus(users.find(function (x) { return x.id === b.dataset.del; })); }
        else if (b && b.dataset.a === 'del') hapus(u);
        else if (b && b.dataset.t) { tab = b.dataset.t; draw(); } else if (b && b.id === 'ua') userDlg(null);
        else if (b && b.dataset.a === 'edit') userDlg(u);
        else if (b && b.dataset.a === 'status') {
          const tid = u.tech && u.tech.id; if (!tid) return toast('Data teknisi tidak ditemukan.', 'warn');
          const atur = function (st, label) { act('tech.status', { status: st, techId: tid }).then(function () { toast('Status ' + u.nama + ': ' + label, 'ok'); Router.render(); }).catch(toastErr); };
          modal({ title: 'Atur status kerja ' + u.nama, body: '<p class="muted">Teknisi berstatus <b>Siap Kerja</b> dapat ditugaskan. Status <b>Istirahat</b> tidak dapat menerima tugas baru.</p><p class="sm">Status saat ini: <b>' + esc(u.tech && u.tech.status === 'Available' ? 'Siap Kerja' : u.tech && u.tech.status === 'On-Duty' ? 'Bertugas' : 'Istirahat') + '</b></p>',
            actions: [{ label: 'Batal', cls: 'ghost', fn: function (c) { c(); } }, { label: 'Istirahat', cls: 'ghost', fn: function (c) { c(); atur('Off', 'Istirahat'); } }, { label: 'Siap Kerja', cls: 'primary', fn: function (c) { c(); atur('Available', 'Siap Kerja'); } }] });
        }
        else if (b && b.dataset.a === 'pin') confirmDlg('Buat PIN baru untuk ' + u.nama + '? PIN lama tidak berlaku dan semua sesinya dikeluarkan.', { ok: 'Buat PIN' }).then(function (y) { if (y) act('admin.pinReset', { id: u.id }).then(function (r) { pinShow(u.nama, r.pin); load(); }).catch(toastErr); });
        else if (b && b.dataset.a === 'sesi') confirmDlg('Keluarkan ' + u.nama + ' dari semua perangkat?', { ok: 'Cabut Sesi', danger: true }).then(function (y) { if (y) act('admin.cabutSesi', { id: u.id }).then(function () { toast('Semua sesi dicabut.', 'ok'); }).catch(toastErr); });
        else if (tr) { sel = tr.dataset.id; draw(); }
      });
      $('#uq', v).oninput = function (e) { q = e.target.value.trim().toLowerCase(); draw(); };
      swr('admin.users', {}, function (r) { users = r.list; draw(); }, 5000); draw();
      return done;
    }
  };

  // ====================================================================== PENGATURAN
  R.routes['/pengaturan'] = {
    title: 'Pengaturan',
    render: function (v) {
      App.title('Pengaturan'); const done = own(), live = alive();
      v.innerHTML = '<div class="apad narrow"><h1 class="h1">Pengaturan</h1><p class="muted">Parameter operasional, integrasi, keamanan, dan migrasi data. Rahasia disimpan di Script Properties dan hanya tampil tersamar.</p><div id="pg">' + skel(3, 140) + '</div></div>';
      Promise.all([api('admin.config'), api('rahasia.status')]).then(function (r) { draw(r[0], r[1]); }).catch(function (e) { $('#pg', v).innerHTML = '<div class="alert err">' + esc(e.message) + '</div>'; });
      function draw(cfg, st) {
        if (!live()) return;
        $('#pg', v).innerHTML = '<section class="card"><h3 class="sec">' + ic('sliders', 18) + ' Parameter Operasional</h3><div class="cfg">' + cfg.map(function (c) { return c.key === 'Versi_App' ? '' : '<div class="cfgi"><label class="lbl" for="c_' + c.key + '">' + esc(c.key.replace(/_/g, ' ')) + '</label><div class="inp"><input id="c_' + c.key + '" data-k="' + c.key + '" value="' + esc(c.value) + '"></div><small class="muted">' + esc(c.ket) + '</small></div>'; }).join('') + '</div><div class="row end mt"><button class="btn primary" id="sc">Simpan Parameter</button></div></section>' +
          '<section class="card"><h3 class="sec">' + ic('lock', 18) + ' Integrasi & Keamanan</h3>' +
          secret('GOOGLE_CLIENT_ID', 'Google OAuth Client ID', 'xxxx.apps.googleusercontent.com', st.googleClientId, 'Dibutuhkan untuk tombol "Masuk dengan Google". Tambahkan alamat GitHub Pages Anda ke Authorized JavaScript origins.') +
          secret('FONNTE_TOKEN', 'Token WhatsApp Gateway (Fonnte)', 'Tempel token Fonnte', st.fonnte, 'Dipakai server untuk mengirim notifikasi. Tidak pernah dikirim ke browser.') +
          '<div class="row between sec3"><div><b>Mode Demo</b><small class="muted">Menampilkan akun contoh di halaman login. <b class="warn-t">Matikan sebelum produksi.</b></small></div><label class="sw"><input type="checkbox" id="dm" ' + (st.demo ? 'checked' : '') + '><i></i></label></div>' +
          '<div class="sec3"><b>Ganti sandi akses darurat</b><small class="muted">Minimal 12 karakter, kombinasi huruf dan angka.</small><div class="row gap mt"><div class="inp grow"><input id="dp" type="password" autocomplete="new-password" placeholder="Sandi darurat baru"></div><button class="btn secondary" id="db">Ganti</button></div></div></section>' +
          '<section class="card"><h3 class="sec">' + ic('refresh', 18) + ' Import Data dari Aplikasi Lama</h3><p class="muted sm">Sumber hanya <b>dibaca</b>, tidak diubah. Aman diulang (tidak ada data dobel). Gunakan akun Google yang sama dengan pemilik aplikasi lama.</p><label class="lbl">URL / ID Spreadsheet lama</label><div class="inp"><input id="is" placeholder="https://docs.google.com/spreadsheets/d/…"></div><div class="chips" id="isch">' + ['Users', 'Technicians', 'Services', 'Addresses', 'Bookings', 'Service_Logs'].map(function (s) { return '<label class="chip ' + (s === 'Service_Logs' ? '' : 'sel') + '"><input type="checkbox" value="' + s + '" ' + (s === 'Service_Logs' ? '' : 'checked') + ' hidden>' + s + '</label>'; }).join('') + '</div><label class="chk"><input type="checkbox" id="iw"> Timpa data layanan & teknisi yang sudah ada</label><div class="row gap mt"><button class="btn secondary" id="ip">' + ic('search', 16) + ' Pindai (Dry-run)</button><button class="btn primary" id="ij">' + ic('dl', 16) + ' Jalankan Import</button></div><div id="ir"></div></section>' +
          '<p class="foot-note">Versi aplikasi ' + esc(((window.APP_CONFIG || {}).VERSI) || '1.0.0') + ' • Backend v' + esc((cfg.find(function (c) { return c.key === 'Versi_App'; }) || {}).value || '') + '</p>';
      }
      function secret(k, lbl, ph, s, ket) { return '<div class="sec3"><div class="row between"><b>' + lbl + '</b><span class="pill ' + (s.ada ? 'ok' : 'warn') + '">' + (s.ada ? 'Terisi • ' + esc(s.samar) : 'Belum diisi') + '</span></div><div class="row gap mt"><div class="inp grow"><input type="password" autocomplete="off" data-sk="' + k + '" placeholder="' + ph + '"></div><button class="btn secondary" data-ss="' + k + '">Simpan</button>' + (s.ada ? '<button class="btn danger-o" data-sd="' + k + '">Hapus</button>' : '') + '</div><small class="muted">' + ket + '</small></div>'; }
      const importOpts = function () { return { source: $('#is', v).value, sheets: $$('#isch input:checked', v).map(function (i) { return i.value; }), overwrite: $('#iw', v).checked }; };
      function report(r) {
        const rows = Object.keys(r.report).map(function (k) { const x = r.report[k]; return '<tr><td><b>' + k + '</b></td><td class="r">' + x.source + '</td><td class="r ok-t">' + x.inserted + '</td><td class="r">' + x.updated + '</td><td class="r muted">' + x.skipped + '</td><td><small class="muted">' + esc(x.catatan || '') + '</small></td></tr>'; }).join('');
        $('#ir', v).innerHTML = '<div class="alert ' + (r.dryRun ? 'info' : 'ok') + '">' + ic('info') + '<div><b>' + (r.dryRun ? 'Hasil pindai (tidak ada data ditulis)' : 'Import selesai') + '</b> — ' + esc(r.source.name) + '</div></div><div class="tw"><table class="tbl"><thead><tr><th>DATA</th><th class="r">DI APP LAMA</th><th class="r">DITAMBAH</th><th class="r">DIPERBARUI</th><th class="r">DILEWATI</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' + r.warnings.map(function (w) { return '<div class="alert warn">' + ic('warn') + '<div>' + esc(w) + '</div></div>'; }).join('');
      }
      v.addEventListener('click', function (e) {
        const b = e.target.closest('button'), lb = e.target.closest('#isch label'); if (lb) { setTimeout(function () { lb.classList.toggle('sel', $('input', lb).checked); }, 0); return; } if (!b) return;
        if (b.id === 'sc') { const values = {}; $$('[data-k]', v).forEach(function (i) { values[i.dataset.k] = i.value; }); busy(b, act('admin.configSimpan', { values: values }).then(function (r) { S.cfg = Object.assign(S.cfg, r.cfg); S.boot.cfg = S.cfg; App.persist(); toast('Parameter disimpan.', 'ok'); }).catch(toastErr)); }
        else if (b.dataset.ss) { const i = $('[data-sk="' + b.dataset.ss + '"]', v); busy(b, act('rahasia.simpan', { kunci: b.dataset.ss, nilai: i.value }).then(function (r) { i.value = ''; toast('Tersimpan: ' + r.samar, 'ok'); return Promise.all([api('admin.config'), api('rahasia.status')]).then(function (x) { draw(x[0], x[1]); }); }).catch(toastErr)); }
        else if (b.dataset.sd) confirmDlg('Hapus nilai ini dari Script Properties?', { ok: 'Hapus', danger: true }).then(function (y) { if (y) act('rahasia.simpan', { kunci: b.dataset.sd, nilai: '__HAPUS__' }).then(function () { return Promise.all([api('admin.config'), api('rahasia.status')]).then(function (x) { draw(x[0], x[1]); }); }).catch(toastErr); });
        else if (b.id === 'db') busy(b, act('darurat.rotasi', { sandi: $('#dp', v).value }).then(function () { $('#dp', v).value = ''; toast('Sandi darurat diganti.', 'ok'); }).catch(toastErr));
        else if (b.id === 'ip') busy(b, act('import.jalankan', Object.assign(importOpts(), { dryRun: true })).then(report).catch(toastErr));
        else if (b.id === 'ij') confirmDlg('Jalankan import sekarang? Data baru akan ditambahkan ke aplikasi ini. Sumber tidak diubah.', { ok: 'Jalankan Import' }).then(function (y) { if (y) busy(b, act('import.jalankan', Object.assign(importOpts(), { dryRun: false })).then(function (r) { report(r); toast('Import selesai.', 'ok'); App.refresh().catch(function () { }); }).catch(toastErr)); });
      });
      v.addEventListener('change', function (e) { if (e.target.id === 'dm') { const on = e.target.checked; act('pengaturan.demo', { aktif: on }).then(function () { toast(on ? 'Mode demo aktif.' : 'Mode demo dimatikan.', on ? 'warn' : 'ok'); }).catch(function (er) { e.target.checked = !on; toastErr(er); }); } });
      return done;
    }
  };
})();
