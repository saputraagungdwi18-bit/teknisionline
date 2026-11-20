/* FieldTech Direct — profil.js : W-14 Profil (semua peran), ubah profil & alamat, PIN, foto */
(function () {
  'use strict';
  const R = Router, ROLE = { Customer: 'Pelanggan', Teknisi: 'Teknisi', Admin: 'Admin / Dispatcher' };
  const hdrAv = function () { const a = $('.hav'); if (a) { const f = LS.get('foto', null); a.innerHTML = f ? '<img src="' + f + '" alt="">' : avatar(S.me.nama, 36); } };
  function setMe(me) { S.me = me; S.boot.me = me; App.persist(); hdrAv(); }

  function fetchFoto() {
    if (S.me.fotoId && !LS.get('foto', null)) api('foto.get', { profil: true }).then(function (r) { LS.set('foto', r.dataUrl); hdrAv(); if (R.cur === '/profil') R.render(); }).catch(function () { });
  }
  function save(patch) { // simpan profil (optimistik)
    const m = S.me, body = Object.assign({ nama: m.nama, hp: m.hp, alamat: m.alamat, notifWa: m.notifWa, notifEmail: m.notifEmail }, patch);
    return act('profil.simpan', body).then(function (me) { setMe(me); return me; });
  }

  R.routes['/profil'] = {
    title: 'Profil',
    render: function (v, params) {
      if (params[0] === 'ubah') return editView(v);
      App.title('Profil'); fetchFoto();
      const m = S.me, role = m.role, bk = (S.boot.bookings || []), tech = S.boot.tech;
      const stat = role === 'Customer' ? [[bk.filter(function (b) { return b.status === 'Completed'; }).length, 'Servis Selesai'], [bk.filter(function (b) { return ['Pending', 'Assigned', 'On_The_Way', 'Working'].indexOf(b.status) > -1; }).length, 'Servis Berjalan'], [tglID(m.dibuat).split(' ').slice(1).join(' ') || '-', 'Member Sejak']]
        : role === 'Teknisi' ? [[tech ? tech.selesai : 0, 'Servis Selesai'], [tech && tech.rating ? tech.rating.toFixed(1) : '-', 'Rating'], [m.techId || '-', 'ID Teknisi']] : null;
      const foto = LS.get('foto', null);
      v.innerHTML = '<div class="pad stack">' +
        '<section class="card prof-h"><label class="av-up" title="Ganti foto">' + (foto ? '<img src="' + foto + '" alt="Foto profil">' : avatar(m.nama, 84, 'ind')) + '<i>' + ic('camera', 16) + '</i><input type="file" id="pf" accept="image/jpeg,image/png" hidden></label>' +
        '<div class="grow"><div class="row gap"><h2 class="h2">' + esc(m.nama || 'Pengguna') + '</h2>' + (m.profilLengkap ? '<span class="pill ok">' + ic('check', 14) + ' Terverifikasi</span>' : '<span class="pill warn">Lengkapi profil</span>') + '</div><small class="mono">ID: ' + esc(m.id) + '</small><div class="row gap wrap"><span>' + esc(m.hp ? '+' + m.hp : 'Nomor belum diisi') + '</span>' + (m.hp ? '<span class="pill ok">' + ic('wa', 12) + ' WA Aktif</span>' : '') + '</div><span class="pill ind">' + ROLE[role] + '</span></div>' +
        '<div class="lockbox">' + ic('lock', 16) + '<div><b>' + esc(m.email) + '</b><small>Terkoneksi akun Google (hanya-baca)</small></div></div></section>' +
        (stat ? '<div class="stats3">' + stat.map(function (s) { return '<div><b>' + esc(s[0]) + '</b><small>' + s[1] + '</small></div>'; }).join('') + '</div>' : '') +
        '<section class="card list"><h4 class="eyebrow">PROFIL & DATA PRIBADI</h4><a class="li" href="#/profil/ubah"><span class="lic">' + ic('user', 20) + '</span><span class="grow"><b>Ubah Nama & Nomor Kontak</b><small>' + esc(m.hp ? '+' + m.hp : 'Belum diisi') + '</small></span>' + ic('right', 18) + '</a>' +
        (role === 'Customer' ? '<a class="li" href="#/profil/ubah"><span class="lic">' + ic('pin', 20) + '</span><span class="grow"><b>Daftar Alamat Tersimpan <span class="pill ind">' + (S.boot.addresses || []).length + ' Alamat</span></b><small>' + esc((S.boot.addresses || []).map(function (a) { return a.label; }).join(', ') || 'Belum ada alamat') + '</small></span>' + ic('right', 18) + '</a>' : '') +
        (role === 'Teknisi' ? '<a class="li" href="#/profil/ubah"><span class="lic">' + ic('wrench', 20) + '</span><span class="grow"><b>Keahlian & Kendaraan</b><small>' + esc(m.keahlian.join(', ') || 'Belum dipilih') + ' • ' + esc(m.kendaraan || '-') + '</small></span>' + ic('right', 18) + '</a>' : '') + '</section>' +
        (role !== 'Admin' ? '<section class="card list"><h4 class="eyebrow">PREFERENSI & NOTIFIKASI</h4><div class="li"><span class="lic ok">' + ic('chat', 20) + '</span><span class="grow"><b>Notifikasi WhatsApp</b><small>Update status langsung via WhatsApp</small></span><label class="sw"><input type="checkbox" id="swWa" ' + (m.notifWa ? 'checked' : '') + '><i></i></label></div>' +
          '<div class="li"><span class="lic">' + ic('file', 20) + '</span><span class="grow"><b>Salinan ke Email</b><small>Kirim Berita Acara & notifikasi ke email</small></span><label class="sw"><input type="checkbox" id="swEm" ' + (m.notifEmail ? 'checked' : '') + '><i></i></label></div></section>' : '') +
        '<section class="card list"><h4 class="eyebrow">KEAMANAN</h4><button class="li" id="bPin"><span class="lic">' + ic('lock', 20) + '</span><span class="grow"><b>' + (m.pinAda ? 'Ganti PIN Login' : 'Atur PIN Login') + '</b><small>PIN 6 digit untuk masuk tanpa Google</small></span>' + ic('right', 18) + '</button></section>' +
        (role === 'Customer' ? '<section class="card list"><h4 class="eyebrow">DOKUMEN & GARANSI</h4><a class="li" href="#/riwayat"><span class="lic">' + ic('file', 20) + '</span><span class="grow"><b>Arsip Berita Acara & Faktur</b><small>' + bk.filter(function (b) { return b.status === 'Completed'; }).length + ' berkas laporan pengerjaan</small></span>' + ic('right', 18) + '</a><div class="li"><span class="lic ok">' + ic('shield', 20) + '</span><span class="grow"><b>Garansi Servis Aktif <span class="pill ok">' + esc(S.cfg.Garansi_Hari || 14) + ' Hari</span></b><small>Berlaku untuk pengerjaan terbaru yang selesai</small></span></div></section>' : '') +
        (S.cfg.WA_CS ? '<a class="cs" target="_blank" rel="noopener" href="' + waLink(S.cfg.WA_CS, 'Halo CS, saya butuh bantuan.') + '">' + ic('chat', 22) + '<div><b>Hubungi Customer Service</b><small>WhatsApp siaga 08.00 - 20.00</small></div><span class="pill">Respon Cepat</span></a>' : '') +
        '<div class="inst-slot"></div><button class="btn danger-o block" id="bOut">' + ic('logout', 18) + ' Keluar Akun</button><p class="foot-note">' + esc(App.appName()) + ' v' + esc((window.APP_CONFIG || {}).VERSI || '1.0.0') + '</p></div>';

      $('#pf', v).onchange = function (e) { const f = e.target.files[0]; if (!f) return; kompres(f, 256, 0.8).then(function (k) { return act('profil.foto', { mime: k.mime, data: k.data }).then(function (r) { LS.set('foto', k.dataUrl); S.me.fotoId = r.fotoId; hdrAv(); R.render(); toast('Foto profil diperbarui.', 'ok'); }); }).catch(toastErr); };
      const tg = function (id, key) { const el = $('#' + id, v); if (!el) return; el.onchange = function () { const val = el.checked, prev = S.me[key]; S.me[key] = val; const p = {}; p[key] = val; save(p).catch(function (er) { S.me[key] = prev; el.checked = prev; toastErr(er); }); }; };
      tg('swWa', 'notifWa'); tg('swEm', 'notifEmail');
      App.renderInstall(); $('#bPin', v).onclick = pinDlg;
      $('#bOut', v).onclick = App.doLogout;
    }
  };

  function pinDlg() {
    const ada = S.me.pinAda;
    modal({ title: ada ? 'Ganti PIN' : 'Atur PIN', body: (ada ? '<label class="lbl">PIN lama</label><div class="inp"><input id="p0" type="password" inputmode="numeric" maxlength="6" autocomplete="off"></div>' : '') + '<label class="lbl">PIN baru (6 digit angka)</label><div class="inp"><input id="p1" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div><label class="lbl">Ulangi PIN baru</label><div class="inp"><input id="p2" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div>',
      actions: [{ label: 'Batal', cls: 'ghost' }, { label: 'Simpan PIN', cls: 'primary', fn: function (c, b) {
        const p1 = $('#p1').value, p2 = $('#p2').value;
        if (!/^\d{6}$/.test(p1)) return toast('PIN harus 6 digit angka.', 'warn');
        if (p1 !== p2) return toast('Konfirmasi PIN tidak sama.', 'warn');
        busy(b, act('pin.set', { pin: p1, lama: ada ? $('#p0').value : '' }).then(function () { S.me.pinAda = true; c(); toast('PIN tersimpan. Anda bisa masuk dengan ID + PIN.', 'ok'); if (R.cur === '/profil') R.render(); }).catch(toastErr));
      } }] });
  }

  // ------------------------------------------------------------------ Ubah Profil & Alamat
  function editView(v) {
    App.title('Ubah Profil'); App.editing = true;
    const m = S.me, role = m.role, kats = Object.keys(CAT).filter(function (k) { return S.services.some(function (s) { return s.kategori === k; }) || role === 'Teknisi'; });
    let ahli = (m.keahlian || []).slice();
    v.innerHTML = '<div class="pad stack"><a class="back" href="#/profil">' + ic('left', 18) + ' Kembali</a><section class="card"><h3 class="sec">' + ic('user', 20) + ' Informasi Akun & Data Pribadi</h3>' +
      '<label class="lbl" for="en">Nama Lengkap <b class="rq">*</b></label><div class="inp"><input id="en" maxlength="80" value="' + esc(m.nama) + '"></div>' +
      '<label class="lbl" for="eh">Nomor WhatsApp / HP <b class="rq">*</b> ' + (m.hp ? '<span class="pill ok">' + ic('wa', 12) + ' WA</span>' : '') + '</label><div class="inp ico">' + ic('phone', 18) + '<input id="eh" inputmode="tel" placeholder="0812 3456 7890" value="' + esc(m.hp ? '+' + m.hp : '') + '"></div>' +
      '<label class="lbl">Email Google <span class="pill ind">' + ic('lock', 12) + ' Terkunci</span></label><div class="inp ico dis">' + ic('lock', 18) + '<input value="' + esc(m.email) + '" disabled></div><p class="muted sm">Email disinkronkan dari login Google dan tidak dapat diubah.</p>' +
      (role === 'Teknisi' ? '<label class="lbl">Keahlian</label><div class="chips" id="ahli">' + kats.map(function (k) { return '<button type="button" class="chip ' + (ahli.indexOf(k) > -1 ? 'sel' : '') + '" data-k="' + k + '">' + esc(CAT[k].s) + '</button>'; }).join('') + '</div><div class="grid2"><div><label class="lbl" for="ek">Kendaraan</label><div class="inp"><input id="ek" maxlength="40" value="' + esc(m.kendaraan) + '"></div></div><div><label class="lbl" for="ep">Plat nomor</label><div class="inp"><input id="ep" maxlength="15" value="' + esc(m.plat) + '"></div></div></div>' : '') +
      '</section>' + (role === 'Customer' ? '<section class="card" id="alm"><div class="row between"><h3 class="sec">' + ic('pin', 20) + ' Alamat Tersimpan</h3><button class="btn sm secondary" id="addA">' + ic('plus', 16) + ' Tambah Baru</button></div><div id="alist"></div></section>' : '') + '</div>' +
      '<div class="sticky-bar"><button class="btn ghost" id="eb">Batal</button><button class="btn primary grow lg" id="es">Simpan Perubahan</button></div>';
    const out = function () { App.editing = false; };
    $('#eb', v).onclick = function () { out(); location.hash = '/profil'; };
    const ah = $('#ahli', v); if (ah) ah.onclick = function (e) { const b = e.target.closest('button'); if (!b) return; const k = b.dataset.k, i = ahli.indexOf(k); if (i > -1) ahli.splice(i, 1); else ahli.push(k); b.classList.toggle('sel'); };
    $('#es', v).onclick = function () {
      const nama = $('#en', v).value.trim(), hp = $('#eh', v).value.trim();
      if (nama.length < 2) return toast('Nama minimal 2 karakter.', 'warn');
      if (hp.replace(/\D/g, '').length < 10) return toast('Nomor WhatsApp tidak valid.', 'warn');
      const p = { nama: nama, hp: hp }; if (role === 'Teknisi') { p.keahlian = ahli; p.kendaraan = $('#ek', v).value; p.plat = $('#ep', v).value; }
      busy($('#es', v), save(p).then(function () { out(); toast('Profil disimpan.', 'ok'); location.hash = '/profil'; }).catch(toastErr));
    };
    if (role === 'Customer') {
      const draw = function () {
        const l = S.boot.addresses || [];
        $('#alist', v).innerHTML = l.length ? l.map(function (a) { return '<div class="addr"><div class="row between"><div><span class="pill ' + (a.utama ? 'ok' : 'ind') + '">' + esc(a.label) + (a.utama ? ' (Utama)' : '') + '</span></div><span class="mono sm">' + (a.lat != null ? a.lat.toFixed(4) + ', ' + a.lng.toFixed(4) : '') + '</span></div><p>' + esc(a.alamat) + '</p>' + (a.patokan ? '<small class="muted">Patokan: ' + esc(a.patokan) + '</small>' : '') + '<div class="row gap"><button class="btn sm ghost" data-e="' + a.id + '">' + ic('edit', 14) + ' Ubah</button><button class="btn sm danger-o" data-h="' + a.id + '">' + ic('trash', 14) + ' Hapus</button></div></div>'; }).join('') : empty('pin', 'Belum ada alamat', 'Tambahkan alamat agar pemesanan lebih cepat.');
      };
      draw();
      $('#alm', v).onclick = function (e) {
        const b = e.target.closest('button'); if (!b) return;
        if (b.id === 'addA') addrDlg(null, draw);
        else if (b.dataset.e) addrDlg((S.boot.addresses || []).find(function (a) { return a.id === b.dataset.e; }), draw);
        else if (b.dataset.h) confirmDlg('Hapus alamat ini?', { ok: 'Hapus', danger: true }).then(function (y) { if (y) act('alamat.hapus', { id: b.dataset.h }).then(function (l) { S.boot.addresses = l; App.persist(); draw(); toast('Alamat dihapus.', 'ok'); }).catch(toastErr); });
      };
    }
    return out;
  }
  function addrDlg(a, done) {
    let map = null, mk = null, lat = a ? a.lat : Number(S.cfg.Pusat_Lat), lng = a ? a.lng : Number(S.cfg.Pusat_Long), set = !!a;
    const m = modal({
      title: a ? 'Ubah Alamat' : 'Tambah Alamat Baru', onClose: function () { if (map) map.remove(); },
      body: '<label class="lbl">Label Alamat</label><div class="chips" id="al">' + ['Rumah', 'Kantor', 'Apartemen', 'Lainnya'].map(function (x) { return '<button type="button" class="chip ' + ((a ? a.label : 'Rumah') === x ? 'sel' : '') + '" data-l="' + x + '">' + x + '</button>'; }).join('') + '</div><label class="lbl">Nama Penerima</label><div class="inp"><input id="an" maxlength="80" value="' + esc(a ? a.nama : S.me.nama) + '"></div><button class="btn primary block" id="ag" type="button">' + ic('locate', 18) + ' Gunakan Lokasi Saat Ini (GPS)</button><div id="amap" class="map sm"><div class="skeleton fill"></div></div><div id="agm"></div><small class="muted">Geser pin untuk menyesuaikan titik temu teknisi.</small><label class="lbl">Alamat Lengkap <b class="rq">*</b></label><textarea id="aa" class="ta sm" maxlength="300">' + esc(a ? a.alamat : '') + '</textarea><label class="lbl">Patokan Khusus</label><div class="inp"><input id="ap" maxlength="150" value="' + esc(a ? a.patokan : '') + '"></div><label class="chk"><input type="checkbox" id="au" ' + (a && a.utama ? 'checked' : '') + '> Jadikan alamat utama</label>',
      actions: [{ label: 'Batal', cls: 'ghost' }, { label: 'Simpan', cls: 'primary', fn: function (c, b) {
        if (!set) return toast('Tentukan titik lokasi dengan GPS atau geser pin.', 'warn');
        busy(b, act('alamat.simpan', { id: a ? a.id : '', label: ($('#al .sel', m.el) || {}).dataset.l, nama: $('#an', m.el).value, alamat: $('#aa', m.el).value, patokan: $('#ap', m.el).value, lat: lat, lng: lng, utama: $('#au', m.el).checked }).then(function (l) { S.boot.addresses = l; App.persist(); c(); toast('Alamat disimpan.', 'ok'); done(); }).catch(toastErr));
      } }]
    });
    $('#al', m.el).onclick = function (e) { const b = e.target.closest('button'); if (!b) return; $$('#al button', m.el).forEach(function (x) { x.classList.toggle('sel', x === b); }); };
    const place = function (la, lo, z) { lat = la; lng = lo; set = true; if (mk) { mk.setLatLng([la, lo]); map.setView([la, lo], z || map.getZoom()); } };
    $('#ag', m.el).onclick = function () { busy($('#ag', m.el), getPos().then(function (p) { place(p.lat, p.lng, 17); }).catch(function (e) { $('#agm', m.el).innerHTML = gpsKartu(e.message); })); };
    newMap($('#amap', m.el), lat, lng, a ? 16 : 12).then(function (mp) {
      map = mp; mk = L.marker([lat, lng], { draggable: true, icon: divIcon(ic('pin', 20), 'mk-home', 36) }).addTo(mp);
      mk.on('dragend', function () { const p = mk.getLatLng(); lat = p.lat; lng = p.lng; set = true; }); mp.on('click', function (e) { place(e.latlng.lat, e.latlng.lng); });
    });
  }
})();
