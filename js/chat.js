/* FieldTech Direct — chat.js : Chat per pesanan (pelanggan ↔ teknisi) & daftar percakapan untuk dispatcher.
 * Pesan tersimpan di data admin (sheet "Chat"). Memperbarui otomatis tiap beberapa detik. */
(function () {
  'use strict';
  const R = Router, Chat = window.Chat = { unread: {}, total: 0 };
  const seenMap = function () { return LS.get('chatSeen', {}); };
  const markSeen = function (bid, waktu) { const m = seenMap(); if (waktu && (!m[bid] || waktu > m[bid])) { m[bid] = waktu; LS.set('chatSeen', m); } };
  const hm = function (iso) { const d = new Date(iso); return isNaN(d) ? '' : ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); };
  const stat = function (s) { return (STATUS[s] || [s])[0]; };
  // Suara bubble chat (mengikuti tombol speaker). Diputar hanya untuk pesan masuk dari lawan bicara.
  const bubbleSnd = new Audio('./audio/chat-bubble.mp3'); bubbleSnd.preload = 'auto';
  const playBubble = function () { if (!window.Suara || !Suara.on) return; try { bubbleSnd.currentTime = 0; const p = bubbleSnd.play(); if (p && p.catch) p.catch(function () { }); } catch (e) { } };
  Chat.bunyi = playBubble;

  // Tombol "Chat" di kartu pesanan (dengan jumlah pesan baru)
  Chat.btn = function (bid, label) {
    const n = Chat.unread[bid] || 0;
    return '<a class="btn primary block chatbtn" href="#/chat/' + esc(bid) + '">' + ic('chat', 18) + ' ' + esc(label) + (n ? ' <span class="badge-n">' + n + '</span>' : '') + '</a>';
  };

  R.routes['/chat'] = {
    title: 'Chat',
    render: function (v, params) {
      if (!params[0]) { if (S.me.role === 'Admin') return listView(v); R.go(R.home); return; }
      return threadView(v, params[0]);
    }
  };

  function bubble(p) {
    return '<div class="bub ' + (p.saya ? 'me' : 'them') + (p.pending ? ' pending' : '') + '"><small>' + (p.saya ? 'Anda' : esc(p.nama) + ' • ' + esc(p.peran)) + ' • ' + hm(p.waktu) + '</small><p>' + esc(p.isi).replace(/\n/g, '<br>') + '</p></div>';
  }

  function threadView(v, bid) {
    App.title('Chat'); let stopped = false, lastN = -1, sending = false;
    const back = S.me.role === 'Admin' ? '#/chat' : (S.me.role === 'Teknisi' ? '#/tugas/' + bid : '#/lacak/' + bid);
    v.innerHTML = '<div class="chatwrap"><div class="chathead"><a class="icon-btn" href="' + back + '" aria-label="Kembali">' + ic('left', 20) + '</a><div class="grow" id="chTitle"><b>Chat</b><small id="chSub"></small></div>' + (S.me.role === 'Admin' ? '<button class="icon-btn" id="chDel" aria-label="Hapus riwayat chat" title="Hapus riwayat chat">' + ic('trash', 20) + '</button>' : '') + '</div>' +
      '<div class="chatlist" id="chList">' + skel(2, 48) + '</div>' +
      '<form class="chatbar" id="chForm" autocomplete="off"><textarea id="chIn" rows="1" maxlength="500" placeholder="Tulis pesan…" aria-label="Tulis pesan"></textarea><button class="btn primary" id="chGo" type="submit" aria-label="Kirim">' + ic('arrowr', 18) + '</button></form></div>';

    function draw(d) {
      $('#chTitle', v).innerHTML = '<b>' + esc(d.layanan) + '</b><small id="chSub"></small>';
      $('#chSub', v).textContent = (d.lawan ? d.lawan.nama + ' • ' + d.lawan.peran : '') + (d.status ? ' • ' + stat(d.status) : '');
      const box = $('#chList', v), dekat = box.scrollTop + box.clientHeight >= box.scrollHeight - 60;
      if (!d.pesan.length) box.innerHTML = '<div class="chatkosong">' + ic('chat', 40) + '<b>Belum ada pesan</b><small>' + (d.bisaKirim ? 'Sapa lawan bicara Anda di sini.' : 'Chat dibuka setelah teknisi ditugaskan.') + '</small></div>';
      else { box.innerHTML = d.pesan.map(bubble).join(''); if (dekat || lastN < 0 || d.pesan.length !== lastN) box.scrollTop = box.scrollHeight; }
      const kirim = !!d.bisaKirim; $('#chIn', v).disabled = !kirim; $('#chGo', v).disabled = !kirim;
      $('#chIn', v).placeholder = kirim ? 'Tulis pesan…' : 'Chat belum tersedia';
      if (d.pesan.length) markSeen(bid, d.pesan[d.pesan.length - 1].waktu);
      if (lastN > 0 && !d.pesan.length && S.me.role !== 'Admin') toast('Riwayat chat ini telah dihapus oleh dispatcher.', 'info');
      if (lastN >= 0 && d.pesan.length > lastN && !d.pesan[d.pesan.length - 1].saya) playBubble();
      lastN = d.pesan.length;
    }
    const load = function () {
      return api('chat.thread', { bid: bid }).then(function (d) { if (!stopped) draw(d); })
        .catch(function (e) { if (!stopped && lastN < 0) $('#chList', v).innerHTML = empty('warn', 'Chat tidak dapat dibuka', e.message); });
    };
    load(); const stopPoll = poll(load, 5);
    const del = $('#chDel', v);
    if (del) del.onclick = function () {
      confirmDlg('Hapus SELURUH riwayat chat pesanan ini? Pelanggan dan teknisi tidak lagi melihat pesan-pesan ini. Tindakan ini tidak dapat dibatalkan.', { title: 'Hapus riwayat chat', ok: 'Ya, hapus', danger: true })
        .then(function (y) { if (!y) return; busy(del, act('chat.hapus', { bid: bid }).then(function (r) { toast(r.message, 'ok'); lastN = 0; load(); }).catch(toastErr)); });
    };

    $('#chForm', v).onsubmit = function (e) {
      e.preventDefault(); const inp = $('#chIn', v), isi = inp.value.trim();
      if (!isi || sending) return;
      sending = true; inp.value = '';
      const box = $('#chList', v); box.insertAdjacentHTML('beforeend', bubble({ saya: true, nama: 'Anda', peran: '', isi: isi, waktu: new Date().toISOString(), pending: true })); box.scrollTop = box.scrollHeight;
      act('chat.kirim', { bid: bid, isi: isi }).then(function () { sending = false; load(); }).catch(function (er) { sending = false; inp.value = isi; toastErr(er); load(); });
    };
    $('#chIn', v).onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#chForm', v).dispatchEvent(new Event('submit', { cancelable: true })); } };
    return function () { stopped = true; stopPoll(); };
  }

  function listView(v) {
    App.title('Chat Pesanan'); let stopped = false, q = '', rows = [], qT = null;
    v.innerHTML = '<div class="apad"><div class="row between wrap"><div><h1 class="h1">Chat Pesanan</h1><p class="muted">Percakapan pelanggan dan teknisi per pesanan. Semua chat tersimpan di data admin.</p></div></div>' +
      '<div class="filters"><div class="inp ico grow">' + ic('search', 16) + '<input id="cq" placeholder="Cari ID, pelanggan, teknisi, layanan…" autocomplete="off"></div></div>' +
      '<section class="card"><div id="cList">' + skel(3, 64) + '</div></section></div>';
    function draw() {
      if (stopped) return;
      $('#cList', v).innerHTML = rows.length ? rows.map(function (x) {
        const n = Chat.unread[x.bid] || 0;
        return '<a class="crow" href="#/chat/' + esc(x.bid) + '"><div class="grow"><div class="row between gap"><b>' + esc(x.pelanggan) + ' ↔ ' + esc(x.teknisi) + '</b><small>' + rel(x.terakhirWaktu) + '</small></div>' +
          '<small class="muted mono">#' + esc(x.bid) + ' • ' + esc(x.layanan) + ' • ' + esc(stat(x.status)) + '</small><p class="sm">' + (x.terakhirNama ? '<b>' + esc(x.terakhirNama) + ':</b> ' : '') + esc(x.terakhirIsi) + '</p></div>' +
          (n ? '<span class="pill warn">' + n + ' baru</span>' : '<span class="pill">' + x.jumlah + '</span>') + '</a>';
      }).join('') : empty('chat', q ? 'Tidak ada yang cocok' : 'Belum ada percakapan', q ? 'Coba kata kunci lain.' : 'Percakapan muncul setelah pelanggan atau teknisi mengirim pesan.');
    }
    const load = function () {
      return api('chat.daftar', { q: q }).then(function (r) {
        rows = r.list; const seen = seenMap(), ids = {};
        rows.forEach(function (x) { ids[x.bid] = seen[x.bid] || ''; });
        return api('chat.belum', { seen: ids }).then(function (b) { Chat.unread = b.bids; Chat.total = b.total; draw(); });
      }).catch(function (e) { if (!stopped) $('#cList', v).innerHTML = empty('warn', 'Daftar chat belum bisa dimuat', e.message); });
    };
    $('#cq', v).oninput = function (e) { clearTimeout(qT); const val = e.target.value.trim(); qT = setTimeout(function () { if (val !== q) { q = val; load(); } }, 350); };
    load(); const stopPoll = poll(load, 15);
    return function () { stopped = true; clearTimeout(qT); stopPoll(); };
  }

  // Pemantau pesan baru untuk semua peran: toast saat ada pesan masuk ketika tidak sedang di halaman chat
  let timer = null, inited = false, lastTotal = 0;
  App.startChat = function () {
    App.stopChat();
    const cek = function () {
      if (!S.token || !S.me) return;
      const ids = {};
      const prep = S.me.role === 'Admin' ? api('chat.daftar', {}).then(function (r) { const s = seenMap(); r.list.forEach(function (x) { ids[x.bid] = s[x.bid] || ''; }); }) : Promise.resolve();
      prep.then(function () { return api('chat.belum', { seen: ids }); }).then(function (b) {
        Chat.unread = b.bids;
        if (!inited) { inited = true; lastTotal = b.total; }
        else if (b.total > lastTotal && !/^#\/chat\//.test(location.hash)) {
          playBubble();
          const bid = Object.keys(b.bids)[0];
          toast('Pesan baru' + (bid ? ' pada #' + bid : '') + '.', 'info', { label: 'Buka chat', fn: function () { if (bid) location.hash = '/chat/' + bid; } });
        }
        lastTotal = b.total;
        if (R.cur === '/lacak' || R.cur === '/tugas') { const x = document.querySelector('.chatbtn .badge-n'); if (!x && b.total) R.render(); }
      }).catch(function () { });
    };
    cek(); timer = setInterval(cek, 15000);
  };
  App.stopChat = function () { if (timer) clearInterval(timer); timer = null; inited = false; lastTotal = 0; Chat.unread = {}; };
})();
