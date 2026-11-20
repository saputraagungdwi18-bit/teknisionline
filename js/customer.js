/* FieldTech Direct — customer.js : W-02 Pesan, W-03 Lacak, W-04 Riwayat + Berita Acara PDF */
(function () {
  'use strict';
  const R = Router, ACTIVE = ['Pending', 'Assigned', 'On_The_Way', 'Working'];
  const bks = function () { return (S.boot && S.boot.bookings) || []; };
  const upsertB = function (b) { const l = S.boot.bookings, i = l.findIndex(function (x) { return x.id === b.id; }); if (i > -1) l[i] = b; else l.unshift(b); App.persist(); };
  const svc = function (id) { return S.services.find(function (s) { return s.id === id; }); };
  const D = window.Draft = { kat: '', layananId: '', keluhan: '', fotos: [], tanggal: '', slot: '', jenis: 'Rumah', alamat: '', patokan: '', lat: null, lng: null, idem: '' };
  function resetDraft() { Object.assign(D, { kat: '', layananId: '', keluhan: '', fotos: [], tanggal: '', slot: '', jenis: 'Rumah', alamat: '', patokan: '', lat: null, lng: null, idem: '' }); }

  // ====================================================================== W-02 PESAN
  R.routes['/pesan'] = {
    title: 'Pesan', prefetch: function () { loadMap().catch(function () { }); },
    render: function (v) {
      App.title('Pesan'); App.editing = true;
      const cfg = S.cfg, slots = cfg.Slot_List || [], minHari = Number(cfg.Min_Hari_Kunjungan || 1), minTgl = todayStr(minHari);
      const kats = Object.keys(CAT).filter(function (k) { return S.services.some(function (s) { return s.kategori === k; }); });
      if (!D.kat) D.kat = kats[0] || '';
      if (!D.layananId) { const f = S.services.find(function (s) { return s.kategori === D.kat; }); D.layananId = f ? f.id : ''; }
      if (!D.tanggal || D.tanggal < minTgl) D.tanggal = minTgl;
      if (!D.slot) D.slot = slots[0] || '';
      const addrs = (S.boot.addresses || []);
      if (!D.alamat && !D.lat && addrs.length) { const a = addrs.find(function (x) { return x.utama; }) || addrs[0]; pakaiAlamat(a); }
      let map = null, mk = null, stopped = false;

      v.innerHTML =
        '<section class="pad"><span class="pill ok">' + ic('shield', 14) + ' Jaminan Garansi ' + esc(cfg.Garansi_Hari || 14) + ' Hari</span><h1 class="h1">Pesan Servis Teknisi</h1><p class="muted">Teknisi profesional siap datang ke lokasi Anda dalam hitungan jam.</p></section>' +
        '<div class="pad stack">' +
        '<section class="card" id="c1"><h3 class="sec"><b class="num">1</b> Pilih Layanan <small class="req">Wajib</small></h3><div class="svgrid" id="svcs"></div><button class="btn secondary block svall" id="svAll" type="button" hidden></button></section>' +
        '<section class="card" id="c2"><h3 class="sec"><b class="num">2</b> Detail Kerusakan & Keluhan</h3><label class="lbl" for="kel">Deskripsi Keluhan (minimal 10 karakter) <span class="cnt" id="kcnt">0/250</span></label><textarea id="kel" class="ta" maxlength="250" placeholder="Contoh: AC kamar bocor menetes air dan tidak dingin sejak kemarin malam…"></textarea><div class="err" id="kerr"></div><p class="muted sm">Jelaskan merek, tipe, dan gejala kerusakan untuk estimasi akurat.</p><label class="lbl">Foto Kerusakan (maks. 5 foto)</label><div class="thumbs" id="fotos"></div></section>' +
        '<section class="card" id="c3"><h3 class="sec"><b class="num">3</b> Jadwal Kunjungan Teknisi</h3><label class="lbl" for="tgl">Pilih Tanggal</label><div class="inp ico">' + ic('cal', 18) + '<input type="date" id="tgl" min="' + minTgl + '"></div><label class="lbl">Pilih Jam Kedatangan</label><div class="slots" id="slots"></div></section>' +
        '<section class="card" id="c4"><h3 class="sec"><b class="num">4</b> Alamat & Lokasi Kunjungan</h3><div class="chips" id="jenis"></div><div class="chips" id="saved"></div><label class="lbl" for="alm">Alamat Lengkap</label><textarea id="alm" class="ta sm" maxlength="300" placeholder="Jl. nama jalan, nomor, RT/RW, kelurahan, kota"></textarea><label class="lbl" for="pat">Patokan (opsional)</label><div class="inp"><input id="pat" maxlength="150" placeholder="Contoh: pagar hitam, sebelah minimarket"></div><div class="mapbox"><div id="fmap" class="map"><div class="skeleton fill"></div></div><div class="mapbar"><span class="pill" id="pinst">' + ic('pin', 14) + ' Geser pin ke titik tepat</span><button class="btn sm primary" id="btnLoc">' + ic('locate', 16) + ' Gunakan Lokasi Saya</button></div></div><div id="gpsmsg"></div></section>' +
        '<section class="cost" id="cost"></section></div>' +
        '<div class="sticky-bar"><button class="btn ghost" id="bBatal">Batal</button><button class="btn primary grow lg" id="bKirim" disabled>Kirim Pesanan ' + ic('arrowr', 18) + '</button></div>';

      const $c = function (i) { return $('#' + i, v); };
      // Ikon kategori; bila ada layanan kategori tersebut yang punya gambar, gambar itu yang tampil
  function catImg(k) {
    const sv = S.services.find(function (s) { return s.kategori === k && s.fotoAda; });
    return sv ? '<span class="lf" data-lf="' + esc(sv.id) + '" style="display:block;width:100%;height:100%">' + ic(CAT[k].i, 22) + '</span>' : ic(CAT[k].i, 22);
  }
  let showAll = false;
  function catCls(k) { return k === 'AC' ? 'c-ac' : k === 'Kulkas' ? 'c-kulkas' : k === 'Mesin Cuci' ? 'c-mesin' : 'c-lain'; }
  function svFoto(s) { const ico = (CAT[s.kategori] || CAT.Lainnya).i; return s.fotoAda ? '<span class="lf" data-lf="' + esc(s.id) + '">' + ic(ico, 28) + '</span>' : ic(ico, 28); }
  function renderCats() {
        const list = S.services.slice(), lim = showAll ? list.length : 8;
        $c('svcs').innerHTML = list.slice(0, lim).map(function (s) {
          return '<button type="button" class="svtile ' + (D.layananId === s.id ? 'sel' : '') + '" data-id="' + esc(s.id) + '" aria-pressed="' + (D.layananId === s.id) + '"><span class="svimg ' + catCls(s.kategori) + '">' + svFoto(s) + '</span><b>' + esc(s.nama) + '</b><small>' + rp(s.harga) + '</small></button>';
        }).join('') || empty('box', 'Layanan belum tersedia', 'Hubungi Customer Service.');
        const ba = $c('svAll'); ba.hidden = list.length <= 8; ba.textContent = showAll ? 'Tutup daftar' : 'Lihat semua (' + list.length + ')';
        lazyLayanan(v);
      }
      function renderSlots() { $c('slots').innerHTML = slots.map(function (s) { return '<button class="slot ' + (D.slot === s ? 'sel' : '') + '" data-s="' + esc(s) + '">' + esc(s) + '</button>'; }).join(''); }
      function renderJenis() {
        $c('jenis').innerHTML = ['Rumah', 'Kantor', 'Apartemen', 'Lainnya'].map(function (j) { return '<button class="chip ' + (D.jenis === j ? 'sel' : '') + '" data-j="' + j + '">' + j + '</button>'; }).join('');
        $c('saved').innerHTML = addrs.length ? '<small class="muted">Alamat tersimpan:</small>' + addrs.map(function (a) { return '<button class="chip out" data-a="' + esc(a.id) + '">' + ic('pin', 14) + esc(a.label) + (a.utama ? ' • Utama' : '') + '</button>'; }).join('') : '';
      }
      function renderFotos() {
        $c('fotos').innerHTML = D.fotos.map(function (f, i) { return '<div class="th"><img src="' + f.dataUrl + '" alt="Foto ' + (i + 1) + '"><button class="del" data-i="' + i + '" aria-label="Hapus foto">' + ic('x', 14) + '</button></div>'; }).join('') +
          (D.fotos.length < 5 ? '<label class="th add">' + ic('camera', 22) + '<small>+ Tambah Foto</small><input type="file" id="finp" accept="image/jpeg,image/png" multiple hidden></label>' : '');
        const fi = $c('finp'); if (fi) fi.onchange = function () { addFotos(Array.prototype.slice.call(fi.files)); };
      }
      function renderCost() {
        const s = svc(D.layananId), h = s ? s.harga : 0, t = s ? s.transport : 0;
        $c('cost').innerHTML = '<div class="cost-h"><b>' + ic('file', 18) + ' Ringkasan Estimasi Biaya</b><span class="pill">Transparan</span></div><div class="cost-r"><span>' + esc(s ? s.nama : 'Pilih layanan') + '</span><b>' + rp(h) + '</b></div><div class="cost-r"><span>Biaya Transport & Alat Operasional</span><b>' + rp(t) + '</b></div><div class="cost-t"><span>Total Estimasi<small>(Belum termasuk spare part opsional)</small></span><b>' + rp(h + t) + '</b></div><div class="cost-n">' + ic('info', 16) + ' Pembayaran di tempat setelah servis teknisi selesai & diuji coba.</div>';
      }
      function validate() {
        const ok = D.layananId && D.keluhan.trim().length >= 10 && D.tanggal >= minTgl && D.slot && D.jenis && D.alamat.trim().length >= 8 && D.lat != null && D.lng != null;
        $c('bKirim').disabled = !ok;
        $c('kerr').textContent = D.keluhan.length && D.keluhan.trim().length < 10 ? 'Keluhan minimal 10 karakter' : '';
        return ok;
      }
      function pakaiAlamat(a) { D.alamat = a.alamat; D.patokan = a.patokan || ''; D.lat = a.lat; D.lng = a.lng; if (['Rumah', 'Kantor', 'Apartemen'].indexOf(a.label) > -1) D.jenis = a.label; }
      function setPin(lat, lng, zoom) { D.lat = lat; D.lng = lng; if (map && mk) { mk.setLatLng([lat, lng]); map.setView([lat, lng], zoom || map.getZoom()); } $c('pinst').className = 'pill ok'; $c('pinst').innerHTML = ic('check', 14) + ' Pin terpasang'; validate(); }
      async function addFotos(files) {
        for (const f of files) { if (D.fotos.length >= 5) { toast('Maksimal 5 foto.', 'warn'); break; } try { D.fotos.push(await kompres(f)); } catch (e) { toastErr(e); } }
        renderFotos();
      }

      // nilai awal
      $c('kel').value = D.keluhan; $c('kcnt').textContent = D.keluhan.length + '/250'; $c('tgl').value = D.tanggal; $c('alm').value = D.alamat; $c('pat').value = D.patokan;
      renderCats(); renderSlots(); renderJenis(); renderFotos(); renderCost(); validate();
      const onSvc = function () { renderCats(); }; window.addEventListener('fd-svc', onSvc);

      // event (delegasi, tanpa render ulang halaman)
      v.addEventListener('click', function (e) {
        const t = e.target.closest('button,label'); if (!t) return;
        if (t.id === 'svAll') { showAll = !showAll; renderCats(); } else if (t.dataset.k) { D.kat = t.dataset.k; const f = S.services.find(function (s) { return s.kategori === D.kat; }); D.layananId = f ? f.id : ''; renderCats(); renderCost(); validate(); }
        else if (t.dataset.id) { D.layananId = t.dataset.id; D.kat = (svc(D.layananId) || {}).kategori || D.kat; renderCats(); renderCost(); validate(); }
        else if (t.dataset.s) { D.slot = t.dataset.s; renderSlots(); validate(); }
        else if (t.dataset.j) { D.jenis = t.dataset.j; renderJenis(); }
        else if (t.dataset.a) { const a = addrs.find(function (x) { return x.id === t.dataset.a; }); pakaiAlamat(a); $c('alm').value = D.alamat; $c('pat').value = D.patokan; renderJenis(); setPin(a.lat, a.lng, 16); }
        else if (t.classList.contains('del')) { D.fotos.splice(Number(t.dataset.i), 1); renderFotos(); }
      });
      $c('kel').oninput = function (e) { D.keluhan = e.target.value; $c('kcnt').textContent = D.keluhan.length + '/250'; validate(); };
      $c('alm').oninput = function (e) { D.alamat = e.target.value; validate(); };
      $c('pat').oninput = function (e) { D.patokan = e.target.value; };
      $c('tgl').onchange = function (e) { D.tanggal = e.target.value || minTgl; if (D.tanggal < minTgl) { D.tanggal = minTgl; e.target.value = minTgl; toast('Tanggal kunjungan minimal ' + hariLabel(minTgl).toLowerCase() + '.', 'warn'); } validate(); };
      $c('btnLoc').onclick = function () {
        $c('gpsmsg').innerHTML = '';
        busy($c('btnLoc'), getPos().then(function (p) { setPin(p.lat, p.lng, 17); toast('Lokasi ditemukan (akurasi ±' + p.akurasi + ' m). Geser pin bila perlu.', 'ok'); }).catch(function (e) { $c('gpsmsg').innerHTML = gpsKartu(e.message); }));
      };
      $c('bBatal').onclick = function () { confirmDlg('Hapus isian formulir pesanan ini?', { ok: 'Hapus', danger: true }).then(function (y) { if (y) { resetDraft(); R.render(); } }); };
      $c('bKirim').onclick = function () {
        if (!validate()) return;
        if (!D.idem) D.idem = uid();
        const fotos = D.fotos.slice(), payload = { layananId: D.layananId, keluhan: D.keluhan.trim(), tanggal: D.tanggal, slot: D.slot, jenisAlamat: D.jenis, alamat: D.alamat.trim(), patokan: D.patokan.trim(), lat: D.lat, lng: D.lng, idem: D.idem };
        busy($c('bKirim'), act('booking.create', payload).then(function (b) {
          upsertB(b); resetDraft(); toast('Pesanan #' + b.id + ' terkirim. Konfirmasi dikirim ke WhatsApp Anda.', 'ok');
          App.editing = false; location.hash = '/lacak/' + b.id;
          uploadBukti(b.id, fotos);
        }).catch(function (e) { if (e.code === 'PROFIL') { toastErr(e); location.hash = '/profil/ubah'; } else toastErr(e); }));
      };
      // peta: dimuat setelah form tampil
      const c0 = [Number(D.lat != null ? D.lat : cfg.Pusat_Lat || -6.2), Number(D.lng != null ? D.lng : cfg.Pusat_Long || 106.8)];
      newMap($c('fmap'), c0[0], c0[1], D.lat != null ? 16 : 12).then(function (m) {
        if (stopped) { m.remove(); return; } map = m;
        mk = L.marker(c0, { draggable: true, icon: divIcon(ic('pin', 20), 'mk-home', 36) }).addTo(m);
        mk.on('dragend', function () { const p = mk.getLatLng(); setPin(p.lat, p.lng); });
        m.on('click', function (e) { setPin(e.latlng.lat, e.latlng.lng); });
        L.control.zoom({ position: 'topright' }).addTo(m);
        if (D.lat != null) { $c('pinst').className = 'pill ok'; $c('pinst').innerHTML = ic('check', 14) + ' Pin terpasang'; }
      }).catch(function (e) { $c('fmap').innerHTML = '<div class="alert warn">' + ic('warn') + '<div>' + esc(e.message) + '</div></div>'; });
      return function () { stopped = true; App.editing = false; window.removeEventListener('fd-svc', onSvc); if (map) map.remove(); };
    }
  };
  function uploadBukti(id, fotos) {
    if (!fotos.length) return;
    let ok = 0;
    (async function () {
      for (const f of fotos) {
        try { const r = await act('foto.upload', { id: id, jenis: 'bukti', nama: f.nama, mime: f.mime, data: f.data }); fotoSet(id, r.id, f.dataUrl); ok++; } catch (e) { toast('Foto gagal diunggah: ' + e.message, 'warn'); }
      }
      if (ok) toast(ok + ' foto bukti kerusakan terunggah.', 'ok');
      api('booking.get', { id: id }).then(function (r) { upsertB(r.b); if (R.cur === '/lacak') R.render(); }).catch(function () { });
    })();
  }

  // ====================================================================== W-03 LACAK
  const LOGMSG = {
    'Pesanan Dibuat': function () { return 'Pesanan reservasi online berhasil dibuat oleh pelanggan.'; },
    'Ditugaskan': function () { return 'Pesanan diverifikasi dan teknisi ditugaskan oleh Dispatcher.'; },
    'Mulai Perjalanan': function (b) { return 'Teknisi ' + (b.tech ? b.tech.nama : '') + ' memulai perjalanan menuju lokasi Anda.'; },
    'Tiba': function (b) { return 'Teknisi ' + (b.tech ? b.tech.nama : '') + ' telah tiba di lokasi Anda.'; },
    'Mulai Kerja': function () { return 'Teknisi mulai mengerjakan servis.'; },
    'Selesai': function () { return 'Servis selesai dikerjakan dan diuji coba.'; },
    'Dibatalkan': function (b, l) { return 'Pesanan dibatalkan' + (l.cat ? ': ' + l.cat : '.'); }
  };
  function stepper(st) {
    const L = [['Dibuat', 'check'], ['Ditugaskan', 'check'], ['OTW', 'nav'], ['Proses', 'wrench'], ['Selesai', 'check']];
    const done = { Pending: 1, Assigned: 2, On_The_Way: 2, Working: 3, Completed: 5 }[st] || 0, act = { Pending: 1, Assigned: 2, On_The_Way: 2, Working: 3 }[st];
    return '<div class="stepper">' + L.map(function (l, i) { return '<div class="st ' + (i < done ? 'done' : '') + ' ' + (i === act ? 'act' : '') + '"><i>' + ic(i < done ? 'check' : l[1], 16) + '</i><span>' + l[0] + '</span></div>'; }).join('') + '</div>';
  }
  function timeline(b, logs) {
    const rows = (logs || []).filter(function (l) { return LOGMSG[l.s]; });
    if (!rows.length) return '<p class="muted">Belum ada catatan.</p>';
    return '<div class="tl">' + rows.map(function (l, i) { return '<div class="tli ' + (i === 0 ? 'now' : '') + '"><i></i><div><small><b>' + jam(l.t) + '</b>' + (i === 0 ? ' <span class="pill">Terbaru</span>' : '') + '</small><p>' + esc(LOGMSG[l.s](b, l)) + '</p></div></div>'; }).join('') + '</div>';
  }
  R.routes['/lacak'] = {
    title: 'Lacak', prefetch: function () { loadMap().catch(function () { }); },
    render: function (v, params) {
      App.title('Lacak');
      const aktifL = bks().filter(function (b) { return ACTIVE.indexOf(b.status) > -1; });
      let id = params[0];
      if (!id) id = (aktifL.find(function (b) { return b.status === 'On_The_Way'; }) || aktifL[0] || bks()[0] || {}).id;
      let b = bks().find(function (x) { return x.id === id; });
      if (!b) { v.innerHTML = '<div class="pad">' + empty('nav', 'Belum ada pesanan aktif', 'Pesan teknisi sekarang dan lacak posisinya secara langsung di sini.', '<a class="btn primary" href="#/pesan">Pesan Teknisi Sekarang</a>') + '</div>'; return; }
      let state = { logs: null, pos: null, eta: null, jarak: null }, map = null, mkT = null, mkH = null, route = null, stopped = false, stopPoll = null;
      const sel = aktifL.length > 1 ? '<div class="chips scroll pad">' + aktifL.map(function (x) { return '<a class="chip ' + (x.id === b.id ? 'sel' : '') + '" href="#/lacak/' + x.id + '">#' + esc(x.id.split('-').pop()) + ' • ' + esc(x.layanan) + '</a>'; }).join('') + '</div>' : '';
      v.innerHTML = sel + '<div class="trk-map"><div id="tmap" class="map"><div class="skeleton fill"></div></div><div class="eta" id="eta"></div><span class="auto" id="auto"></span></div><div class="pad stack" id="trk"></div>';

      function drawInfo() {
        b = bks().find(function (x) { return x.id === id; }) || b;
        const t = b.tech, canCancel = b.status === 'Pending', fin = b.status === 'Completed';
        $('#trk', v).innerHTML =
          '<section class="card"><div class="row between"><h3>Status Reservasi</h3>' + badge(b.status) + '</div>' + (b.status === 'Canceled' ? '<div class="alert err">' + ic('ban') + '<div><b>Pesanan dibatalkan</b><br>' + esc(b.alasanBatal || '') + '</div></div>' : stepper(b.status)) + '</section>' +
          (t ? '<section class="card"><div class="row gap">' + avPhoto(t.nama, t.userId, t.fotoAda, 56, 'ind') + '<div class="grow"><div class="row between"><b class="lg">' + esc(t.nama) + '</b><span class="rate">' + ic('star', 14) + (t.rating ? t.rating.toFixed(1) : 'Baru') + (t.ulasan ? ' <small>(' + t.ulasan + ')</small>' : '') + '</span></div><div class="chips">' + t.keahlian.slice(0, 3).map(function (k) { return '<span class="chip soft">' + esc(k) + '</span>'; }).join('') + '</div><small class="muted">' + ic('bike', 14) + ' ' + esc(t.kendaraan) + ' • <span class="mono">' + esc(t.plat) + '</span></small></div></div><div class="grid2"><a class="btn secondary" href="tel:+' + esc(t.hp) + '">' + ic('phone', 18) + ' Telepon</a><a class="btn accent" target="_blank" rel="noopener" href="' + waLink(t.hp, 'Halo, saya pemesan #' + b.id) + '">' + ic('chat', 18) + ' Chat WhatsApp</a></div>' + (ACTIVE.indexOf(b.status) > -1 && t ? Chat.btn(b.id, 'Chat Teknisi') : '') + '</section>'
            : (b.status === 'Pending' ? '<section class="card"><div class="alert info">' + ic('clock') + '<div><b>Menunggu penugasan teknisi</b><br>Dispatcher sedang mencarikan teknisi terdekat dan sesuai keahlian. Anda akan menerima notifikasi WhatsApp.</div></div></section>' : '')) +
          '<section class="card"><div class="row between"><div><small class="muted">ID RESERVASI</small><h3 class="mono2">#' + esc(b.id) + '</h3></div><span class="pill">' + rp(b.total) + ' (COD)</span></div>' +
          '<dl class="dl"><dt>' + ic(catIc(b.kategori), 18) + '</dt><dd><small>Layanan Dipesan</small><b>' + esc(b.layanan) + '</b></dd><dt>' + ic('clock', 18) + '</dt><dd><small>Jadwal Kedatangan</small><b>' + hariLabel(b.tanggal) + ' • Slot ' + esc(b.slot) + '</b></dd><dt>' + ic('pin', 18) + '</dt><dd><small>Alamat Pengerjaan</small><b>' + esc(b.alamat) + '</b>' + (b.patokan ? '<small>Patokan: ' + esc(b.patokan) + '</small>' : '') + '</dd></dl>' +
          (b.fotoBukti.length ? '<div class="thumbs sm">' + b.fotoBukti.map(function (f) { return '<div class="th"><img data-b="' + b.id + '" data-f="' + f + '" alt="Foto kerusakan"></div>'; }).join('') + '</div>' : '') +
          (b.persetujuan === 'Menunggu' ? '<div class="alert warn">' + ic('info') + '<div>Teknisi mengajukan biaya tambahan <b>' + rp(b.tambahan) + '</b> (' + esc(b.namaPart) + '). Menunggu persetujuan dispatcher.</div></div>' : '') + '</section>' +
          '<section class="card"><div class="row between"><h3>Catatan Perjalanan</h3><span class="live">Real-time</span></div><div id="tlbox">' + (state.logs ? timeline(b, state.logs) : skel(2, 40)) + '</div></section>' +
          (b.status === 'On_The_Way' ? '<section class="tip">' + ic('info', 20) + '<div><b>Tips Persiapan</b><p>Teknisi sedang dalam perjalanan. Siapkan akses tangga dan area kerja unit agar servis lebih efisien.</p></div></section>' : '') +
          (fin ? '<section class="card">' + (b.rating ? '<div class="rate big">' + '★'.repeat(b.rating) + '☆'.repeat(5 - b.rating) + '</div><p class="muted">Terima kasih atas penilaian Anda.</p>' : '<button class="btn primary block" id="bRate">' + ic('star', 18) + ' Beri Penilaian</button>') + '<button class="btn secondary block" id="bBap">' + ic('dl', 18) + ' Unduh Berita Acara (PDF)</button></section>' : '') +
          (canCancel ? '<button class="btn danger-o block" id="bCancel">' + ic('x', 18) + ' Batalkan Pesanan</button>' : '') +
          (S.cfg.WA_CS ? '<a class="help" target="_blank" rel="noopener" href="' + waLink(S.cfg.WA_CS, 'Halo CS, saya butuh bantuan untuk pesanan #' + b.id) + '">' + ic('info', 18) + ' <b>Butuh Bantuan? Laporkan Kendala</b></a>' : '');
        lazyFoto(v); lazyProfil(v);
        const bc = $('#bCancel', v); if (bc) bc.onclick = cancel;
        const br = $('#bRate', v); if (br) br.onclick = function () { rateDlg(b, function (nb) { upsertB(nb); drawInfo(); }); };
        const bb = $('#bBap', v); if (bb) bb.onclick = function () { busy(bb, bapPdf(b)); };
      }
      function drawMap() {
        if (!map) return;
        const dest = [b.lat, b.lng];
        if (!mkH) { mkH = L.marker(dest, { icon: mkHome() }).addTo(map); }
        const p = state.pos;
        if (p) {
          const ll = [p.lat, p.lng];
          if (!mkT) { mkT = L.marker(ll, { icon: mkTech('On-Duty', b.tech && b.tech.nama, b.status === 'On_The_Way') }).addTo(map); route = L.polyline([ll, dest], { color: '#4F46E5', weight: 4, dashArray: '8 8', opacity: .8 }).addTo(map); map.fitBounds([ll, dest], { padding: [50, 50], maxZoom: 16 }); }
          else { glide(mkT, ll); route.setLatLngs([ll, dest]); }
        } else if (!mkT) map.setView(dest, 15);
        const eta = $('#eta', v);
        if (state.eta && b.status === 'On_The_Way') eta.innerHTML = '<span class="dotp"></span><b>' + state.eta + ' Menit</b> • ' + (state.jarak / 1000).toFixed(1).replace('.', ',') + ' km lagi';
        else eta.innerHTML = { Pending: ic('clock', 16) + ' Menunggu teknisi ditugaskan', Assigned: ic('user', 16) + ' Teknisi ditugaskan • belum berangkat', Working: ic('wrench', 16) + ' Teknisi sedang mengerjakan', Completed: ic('check', 16) + ' Servis selesai', Canceled: ic('ban', 16) + ' Dibatalkan', On_The_Way: ic('nav', 16) + ' Teknisi dalam perjalanan' }[b.status] || '';
      }
      function fetchTrack() {
        return api('booking.track', { id: id }).then(function (r) {
          if (stopped) return;
          const old = JSON.stringify([bks().find(function (x) { return x.id === id; }), state.logs]);
          upsertB(r.b); state.logs = r.logs; state.pos = r.pos; state.eta = r.eta; state.jarak = r.jarak;
          if (JSON.stringify([r.b, r.logs]) !== old) drawInfo(); else $('#tlbox', v) && !$('#tlbox .tl', v) && drawInfo();
          drawMap(); const a = $('#auto', v); if (a) a.innerHTML = ic('refresh', 12) + ' Auto-update ' + (S.cfg.Polling_Pelanggan_Detik || 20) + ' dtk';
          if (ACTIVE.indexOf(r.b.status) === -1 && stopPoll) { stopPoll(); stopPoll = null; }
        });
      }
      function cancel() {
        confirmDlg('Batalkan pesanan #' + b.id + '? Tindakan ini tidak dapat dibatalkan.', { ok: 'Ya, batalkan', batal: 'Tidak', danger: true }).then(function (y) {
          if (!y) return; const prev = Object.assign({}, b);
          upsertB(Object.assign({}, b, { status: 'Canceled', alasanBatal: 'Dibatalkan oleh pelanggan' })); drawInfo(); drawMap();
          act('booking.cancel', { id: b.id }).then(function (nb) { upsertB(nb); toast('Pesanan dibatalkan.', 'ok'); drawInfo(); }).catch(function (e) { upsertB(prev); drawInfo(); drawMap(); toastErr(e); });
        });
      }
      drawInfo();
      newMap($('#tmap', v), b.lat || Number(S.cfg.Pusat_Lat), b.lng || Number(S.cfg.Pusat_Long), 15).then(function (m) { if (stopped) { m.remove(); return; } map = m; L.control.zoom({ position: 'bottomright' }).addTo(m); drawMap(); });
      fetchTrack().catch(function (e) { toastErr(e, fetchTrack); });
      const sec = Number(S.cfg.Polling_Pelanggan_Detik || 20);
      stopPoll = poll(function () { if (ACTIVE.indexOf(b.status) > -1) return fetchTrack(); }, b.status === 'On_The_Way' ? sec : sec * 2);
      return function () { stopped = true; if (stopPoll) stopPoll(); if (map) map.remove(); };
    }
  };

  // ====================================================================== W-04 RIWAYAT
  function rateDlg(b, done) {
    let n = 5;
    const m = modal({ title: 'Beri penilaian', body: '<p class="muted">Bagaimana layanan teknisi ' + esc(b.tech ? b.tech.nama : '') + '?</p><div class="stars" id="stars">' + [1, 2, 3, 4, 5].map(function (i) { return '<button data-n="' + i + '" class="on" aria-label="' + i + ' bintang">' + ic('star', 34) + '</button>'; }).join('') + '</div><label class="lbl">Ulasan (opsional)</label><textarea id="ul" class="ta sm" maxlength="200" placeholder="Ceritakan pengalaman Anda"></textarea>', actions: [{ label: 'Nanti', cls: 'ghost' }, { label: 'Kirim', cls: 'primary', fn: function (c, btn) { busy(btn, act('booking.rate', { id: b.id, rating: n, ulasan: $('#ul', m.el).value }).then(function (nb) { c(); toast('Terima kasih atas penilaian Anda!', 'ok'); done(nb); }).catch(toastErr)); } }] });
    $('#stars', m.el).onclick = function (e) { const x = e.target.closest('button'); if (!x) return; n = Number(x.dataset.n); $$('#stars button', m.el).forEach(function (s, i) { s.classList.toggle('on', i < n); }); };
  }
  function detailDlg(b) {
    const m = modal({ title: '#' + b.id, body: '<div id="dd">' + skel(2, 60) + '</div>', foot: false, noFocus: true });
    api('booking.get', { id: b.id }).then(function (r) {
      const x = r.b;
      $('#dd', m.el).innerHTML = '<div class="row between">' + badge(x.status) + '<b>' + rp(x.total) + '</b></div><h3>' + esc(x.layanan) + '</h3><p class="muted">' + hariLabel(x.tanggal) + ' • ' + esc(x.slot) + '<br>' + esc(x.alamat) + '</p>' + (x.catatan ? '<div class="alert info">' + ic('file') + '<div><b>Catatan teknisi</b><br>' + esc(x.catatan) + '</div></div>' : '') +
        '<dl class="costl"><div><span>Tarif servis dasar</span><b>' + rp(x.harga) + '</b></div><div><span>Biaya transport</span><b>' + rp(x.transport) + '</b></div>' + (x.tambahan && x.persetujuan !== 'Ditolak' ? '<div><span>Biaya tambahan' + (x.namaPart ? ' (' + esc(x.namaPart) + ')' : '') + '</span><b>' + rp(x.tambahan) + '</b></div>' : '') + '<div class="tot"><span>Total</span><b>' + rp(x.total) + '</b></div></dl>' +
        ((x.fotoSebelum.length + x.fotoSesudah.length) ? '<h4>Dokumentasi</h4><div class="thumbs sm">' + x.fotoSebelum.concat(x.fotoSesudah).map(function (f) { return '<div class="th"><img data-b="' + x.id + '" data-f="' + f + '" alt="Dokumentasi"></div>'; }).join('') + '</div>' : '') + '<h4>Riwayat</h4>' + timeline(x, r.logs);
      lazyFoto(m.el);
      $$('.th img', m.el).forEach(function (im) { im.onclick = function () { if (im.src) lightbox(im.src); }; });
    }).catch(function (e) { $('#dd', m.el).innerHTML = '<div class="alert err">' + esc(e.message) + '</div>'; });
  }
  R.routes['/riwayat'] = {
    title: 'Riwayat',
    render: function (v) {
      App.title('Riwayat'); const live = alive();
      let f = 'all', q = '', lama = false, lim = 20;
      v.innerHTML = '<section class="pad"><div class="row between"><h1 class="h1">Riwayat Servis</h1><span class="pill ok">' + ic('shield', 14) + ' Akun Terverifikasi</span></div><p class="muted">Pantau status pesanan aktif dan arsip pengerjaan teknisi Anda.</p><div class="inp ico">' + ic('search', 18) + '<input id="q" placeholder="Cari no. tiket, layanan, atau teknisi…"></div><div class="chips scroll" id="fl"></div></section><div class="pad stack" id="list"></div>';
      const FL = [['all', 'Semua'], ['act', 'Sedang Berjalan'], ['done', 'Selesai'], ['cancel', 'Dibatalkan']];
      function draw() {
        if (!live()) return;
        const all = bks(), cnt = { all: all.length, act: all.filter(function (b) { return ACTIVE.indexOf(b.status) > -1; }).length, done: all.filter(function (b) { return b.status === 'Completed'; }).length, cancel: all.filter(function (b) { return b.status === 'Canceled'; }).length };
        $('#fl', v).innerHTML = FL.map(function (x) { return '<button class="chip ' + (f === x[0] ? 'sel' : '') + '" data-f="' + x[0] + '">' + x[1] + ' (' + cnt[x[0]] + ')</button>'; }).join('');
        let rows = all.filter(function (b) { return f === 'all' || (f === 'act' && ACTIVE.indexOf(b.status) > -1) || (f === 'done' && b.status === 'Completed') || (f === 'cancel' && b.status === 'Canceled'); });
        if (q) rows = rows.filter(function (b) { return (b.id + ' ' + b.layanan + ' ' + (b.tech ? b.tech.nama : '')).toLowerCase().indexOf(q) > -1; });
        const box = $('#list', v);
        if (!rows.length) { box.innerHTML = empty('history', all.length ? 'Tidak ada hasil' : 'Belum ada pesanan', all.length ? 'Coba ubah filter atau kata kunci.' : 'Pesan teknisi sekarang untuk memulai.', all.length ? '' : '<a class="btn primary" href="#/pesan">Pesan teknisi sekarang</a>'); return; }
        const act = rows.filter(function (b) { return ACTIVE.indexOf(b.status) > -1; }), rest = rows.filter(function (b) { return ACTIVE.indexOf(b.status) === -1; });
        box.innerHTML = (act.length ? '<h3 class="sec2">Pesanan Sedang Berjalan <span class="live">Live Update</span></h3>' + act.map(card).join('') : '') +
          (rest.length ? '<h3 class="sec2">Riwayat Selesai & Berita Acara <small>' + rest.length + ' dokumen</small></h3>' + rest.slice(0, lim).map(card).join('') : '') +
          (rest.length > lim ? '<button class="btn secondary block" id="more">Tampilkan lebih banyak</button>' : '') +
          (!lama ? '<button class="btn ghost block" id="older">Muat riwayat lebih lama</button>' : '') +
          '<section class="tip">' + ic('shield', 20) + '<div><b>Garansi Pengerjaan ' + esc(S.cfg.Garansi_Hari || 14) + ' Hari</b><p>Semua pengerjaan teknisi resmi dilindungi garansi servis. Hubungi CS bila kendala yang sama berulang.</p></div></section>';
      }
      function card(b) {
        const col = { Pending: 'pending', Assigned: 'assigned', On_The_Way: 'otw', Working: 'working', Completed: 'done', Canceled: 'cancel' }[b.status];
        return '<article class="bk ' + col + '" data-id="' + b.id + '"><div class="row between"><small class="muted mono">#' + esc(b.id) + '</small>' + badge(b.status) + '</div><div class="row gap"><span class="ico-box">' + ic(catIc(b.kategori), 22) + '</span><div class="grow"><b>' + esc(b.layanan) + '</b><small class="muted">' + hariLabel(b.tanggal) + ' • ' + esc(b.slot) + (b.tech ? ' • ' + esc(b.tech.nama) : '') + '</small></div><b>' + rp(b.total) + '</b></div>' +
          (b.rating ? '<div class="rate">' + ic('star', 14) + ' ' + b.rating + '.0 <small class="muted">' + esc(b.ulasan) + '</small></div>' : '') +
          '<div class="row gap">' + (ACTIVE.indexOf(b.status) > -1 ? '<a class="btn primary grow" href="#/lacak/' + b.id + '">' + ic('nav', 16) + ' Lacak & Detail</a>' : '<button class="btn ghost grow" data-d="' + b.id + '">' + ic('eye', 16) + ' Lihat Detail</button>') +
          (b.status === 'Completed' ? '<button class="btn secondary" data-bap="' + b.id + '">' + ic('dl', 16) + ' BAP</button>' + (b.rating ? '' : '<button class="btn secondary" data-rate="' + b.id + '">' + ic('star', 16) + '</button>') : '') +
          (b.status === 'Completed' || b.status === 'Canceled' ? '<button class="btn ghost" data-again="' + b.id + '">' + ic('refresh', 16) + ' Ulang</button>' : '') + '</div></article>';
      }
      v.addEventListener('click', function (e) {
        const t = e.target.closest('button'); if (!t) return;
        const get = function (id) { return bks().find(function (b) { return b.id === id; }); };
        if (t.dataset.f) { f = t.dataset.f; draw(); }
        else if (t.dataset.d) detailDlg(get(t.dataset.d));
        else if (t.dataset.bap) busy(t, bapPdf(get(t.dataset.bap)));
        else if (t.dataset.rate) rateDlg(get(t.dataset.rate), function (nb) { upsertB(nb); draw(); });
        else if (t.dataset.again) { const b = get(t.dataset.again); resetDraft(); const s = svc(b.layananId); if (s) { D.kat = s.kategori; D.layananId = s.id; } D.alamat = b.alamat; D.patokan = b.patokan; D.lat = b.lat; D.lng = b.lng; D.jenis = b.jenisAlamat; D.keluhan = ''; location.hash = '/pesan'; toast('Data pesanan sebelumnya dimuat. Lengkapi keluhan baru.', 'info'); }
        else if (t.id === 'more') { lim += 20; draw(); }
        else if (t.id === 'older') busy(t, api('booking.list', { all: true, limit: 300 }).then(function (r) { lama = true; S.boot.bookings = r.list; App.persist(); draw(); }).catch(toastErr));
      });
      $('#q', v).oninput = function (e) { q = e.target.value.trim().toLowerCase(); draw(); };
      draw();
      // segarkan status pesanan aktif di latar (tanpa menunggu)
      const stop = poll(function () { return App.refresh().then(draw); }, 30);
      return stop;
    }
  };

  // ====================================================================== Berita Acara (PDF, sisi klien)
  function drawBap(doc, b) {
      const W = doc.internal.pageSize.getWidth();
      doc.setFillColor(79, 70, 229); doc.rect(0, 0, W, 70, 'F');
      doc.setTextColor(255); doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.text(App.appName(), 40, 34);
      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text('BERITA ACARA SERVIS', 40, 54);
      // Stempel status pesanan (SELESAI / DIBATALKAN) di kanan atas
      const batal = b.status === 'Canceled';
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(batal ? 220 : 255, batal ? 38 : 255, batal ? 38 : 255);
      doc.text(batal ? 'DIBATALKAN' : 'SELESAI', W - 40, 50, { align: 'right' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(255);
      doc.text('Status pesanan', W - 40, 32, { align: 'right' });
      doc.setTextColor(30, 41, 59); doc.setFontSize(11);
      const rows = [['No. Reservasi', '#' + b.id], ['Tanggal Kunjungan', tglID(b.tanggal) + ', ' + b.slot], ['Pelanggan', b.cust ? b.cust.nama : '-'], ['Teknisi', b.tech ? b.tech.nama + ' (' + b.tech.id + ')' : '-'], ['Layanan', b.layanan], ['Alamat', b.alamat], ['Keluhan', b.keluhan], ['Catatan Teknisi', b.catatan || '-'], ...(batal ? [['Alasan pembatalan', b.alasanBatal || '-']] : []), ['Waktu Tiba', b.tiba ? tglJam(b.tiba) : '-'], ['Waktu Selesai', b.selesai ? tglJam(b.selesai) : '-']];
      doc.autoTable({ startY: 95, body: rows, theme: 'plain', styles: { fontSize: 10, cellPadding: 5, overflow: 'linebreak' }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 120, textColor: [100, 116, 139] } } });
      const biaya = batal ? [['Pesanan dibatalkan', 'tidak ada biaya']] : [['Tarif servis dasar', rp(b.harga)], ['Biaya transport & alat', rp(b.transport)]];
      if (!batal && b.tambahan && b.persetujuan !== 'Ditolak') biaya.push(['Biaya tambahan' + (b.namaPart ? ' (' + b.namaPart + ')' : ''), rp(b.tambahan)]);
      biaya.push([batal ? 'TOTAL TAGIHAN' : 'TOTAL TAGIHAN (bayar di tempat)', batal ? rp(0) : rp(b.total)]);
      doc.autoTable({ startY: doc.lastAutoTable.finalY + 14, head: [['Rincian Biaya', 'Jumlah']], body: biaya, headStyles: { fillColor: [79, 70, 229] }, styles: { fontSize: 10 }, columnStyles: { 1: { halign: 'right' } }, didParseCell: function (d) { if (d.row.index === biaya.length - 1 && d.section === 'body') d.cell.styles.fontStyle = 'bold'; } });
      const y = doc.lastAutoTable.finalY + 60;
      doc.setFontSize(10); doc.text('Pelanggan', 90, y); doc.text('Teknisi', W - 160, y);
      doc.line(60, y + 70, 190, y + 70); doc.line(W - 190, y + 70, W - 60, y + 70);
      doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text('Garansi pengerjaan ' + (S.cfg.Garansi_Hari || 14) + ' hari. Dokumen dibuat otomatis oleh sistem pada ' + tglJam(new Date().toISOString()) + '.', 40, 800);
  }
  window.drawBap = drawBap;
  // Versi cetak Berita Acara (dipakai bila pembuatan PDF gagal di perangkat ini)
  window.baHtml = function (b) {
    const batal = b.status === 'Canceled';
    return '<h2>Berita Acara Servis #' + esc(b.id) + ' — ' + (batal ? 'DIBATALKAN' : 'SELESAI') + '</h2>' + (batal && b.alasanBatal ? '<p><b>Alasan pembatalan:</b> ' + esc(b.alasanBatal) + '</p>' : '') + '<p>' + esc(b.layanan) + ' • ' + tglID(b.tanggal) + ', ' + esc(b.slot) + '</p>' +
      '<p>Pelanggan: ' + esc(b.cust ? b.cust.nama : '-') + '</p><p>Alamat: ' + esc(b.alamat) + '</p><p>Teknisi: ' + esc(b.tech ? b.tech.nama : '-') + '</p>' +
      '<p>Keluhan: ' + esc(b.keluhan) + '</p><p>Catatan teknisi: ' + esc(b.catatan || '-') + '</p>' +
      '<table><tbody><tr><td>Tarif servis dasar</td><td class="r">' + rp(b.harga) + '</td></tr><tr><td>Transport & alat</td><td class="r">' + rp(b.transport) + '</td></tr>' +
      (b.tambahan && b.persetujuan !== 'Ditolak' ? '<tr><td>Biaya tambahan' + (b.namaPart ? ' (' + esc(b.namaPart) + ')' : '') + '</td><td class="r">' + rp(b.tambahan) + '</td></tr>' : '') +
      '<tr><td><b>Total tagihan (bayar di tempat)</b></td><td class="r"><b>' + rp(b.total) + '</b></td></tr></tbody></table>' +
      '<p class="pf">Garansi pengerjaan ' + esc(S.cfg.Garansi_Hari || 14) + ' hari. Dibuat ' + tglJam(new Date().toISOString()) + '.</p>';
  };
  window.bapPdf = function (b) {
    return libPdf().then(function () {
      const doc = new jspdf.jsPDF({ unit: 'pt', format: 'a4' }); drawBap(doc, b);
      saveFile(doc.output('blob'), 'Berita_Acara_' + b.id + '.pdf');
    }).catch(function () {
      unduhHtml('Berita Acara ' + b.id, baHtml(b), 'Berita_Acara_' + b.id + '.html');
      toast('PDF tidak dapat dibuat di perangkat ini. Berita Acara diunduh sebagai HTML: buka lalu Cetak → Simpan sebagai PDF.', 'warn');
    });
  };
  // Satu PDF berisi banyak Berita Acara (satu halaman per pesanan). Bila gagal, dibuka versi cetak.
  window.bapPdfMulti = function (list, onProgress) {
    return libPdf().then(async function () {
      const doc = new jspdf.jsPDF({ unit: 'pt', format: 'a4' });
      for (let i = 0; i < list.length; i++) { if (i) doc.addPage(); drawBap(doc, list[i]); if (onProgress) onProgress(i + 1, list.length); if (i % 4 === 3) await tick(); }
      saveFile(doc.output('blob'), 'Berita_Acara_' + list.length + '_pesanan.pdf');
    }).catch(function () {
      unduhHtml('Berita Acara (' + list.length + ' pesanan)', list.map(baHtml).join('<div style="page-break-after:always"></div>'), 'Berita_Acara_' + list.length + '_pesanan.html');
      toast('PDF tidak dapat dibuat di perangkat ini. Berita Acara diunduh sebagai HTML: buka lalu Cetak → Simpan sebagai PDF.', 'warn');
    });
  };
})();
