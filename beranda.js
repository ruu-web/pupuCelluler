function selectMenu(name){ alert('Menu dipilih: ' + name); }

    function refreshSaldo(btn, ids){
      if(btn){
        btn.classList.add('is-spinning');
        setTimeout(()=>btn.classList.remove('is-spinning'), 900);
      }
      ids.forEach(id => {
        const el = document.getElementById(id);
        if(!el) return;
        const raw = el.getAttribute('data-saldo') || el.textContent || '0';
        el.textContent = formatRupiah(raw);
      });
      showToast('Saldo diperbarui');
    }

    function showPage(id){
      document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
      const page = document.getElementById(id);
      if(page) page.classList.add('active');
      document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
      const map = {beranda:0, riwayat:1, rekap:2, faq:3, akun:4};
      const btn = document.querySelectorAll('.nav-btn')[map[id]];
      if(btn) btn.classList.add('active');
      window.scrollTo({top:0, behavior:'smooth'});
    }

    const pageOrder = ['beranda','riwayat','rekap','faq','akun'];
    let currentPage = 'beranda';
    let swipeStartX = 0;
    let swipeStartY = 0;
    let swipeActive = false;

    function showPage(id){
      currentPage = id;
      document.querySelectorAll('.page').forEach(p=>{
        p.classList.remove('active','is-swiping');
        p.style.transform = 'translateX(0)';
        p.style.opacity = '0';
      });
      const page = document.getElementById(id);
      if(page){
        page.classList.add('active');
        page.style.opacity = '1';
      }
      document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
      const map = {beranda:0, riwayat:1, rekap:2, faq:3, akun:4};
      const btn = document.querySelectorAll('.nav-btn')[map[id]];
      if(btn) btn.classList.add('active');
      window.scrollTo({top:0, behavior:'smooth'});
    }

    function gotoRelativePage(dir){
      const idx = pageOrder.indexOf(currentPage);
      const next = pageOrder[idx + dir];
      if(next) showPage(next);
    }

    document.addEventListener('touchstart', (e)=>{
      if(e.touches.length !== 1) return;
      swipeStartX = e.touches[0].clientX;
      swipeStartY = e.touches[0].clientY;
      swipeActive = true;
    }, {passive:true});

    document.addEventListener('touchend', (e)=>{
      if(!swipeActive) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - swipeStartX;
      const dy = t.clientY - swipeStartY;
      swipeActive = false;
      if(Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy)) return;
      if(dx < 0) gotoRelativePage(1);
      else gotoRelativePage(-1);
    }, {passive:true});

    function getUcapan() {
      const jam = new Date().getHours();
      let ucapan = 'Selamat Malam';
      if (jam >= 4 && jam < 11) ucapan = 'Selamat Pagi';
      else if (jam >= 11 && jam < 15) ucapan = 'Selamat Siang';
      else if (jam >= 15 && jam < 18) ucapan = 'Selamat Sore';
      document.getElementById('ucapan').textContent = ucapan;
      const r = document.getElementById('ucapan-riwayat');
      const k = document.getElementById('ucapan-rekap');
      const f = document.getElementById('ucapan-faq');
      const a = document.getElementById('ucapan-akun');
      if (r) r.textContent = ucapan;
      if (k) k.textContent = ucapan;
      if (f) f.textContent = ucapan;
      if (a) a.textContent = ucapan;
    }

    function formatRupiah(num) {
      const n = Number(String(num || 0).replace(/[^\d.-]/g, '')) || 0;
      return 'Rp ' + n.toLocaleString('id-ID');
    }

    function applyRupiahFormat() {
      const saldoIds = ['saldo-member', 'saldo-member-rekap', 'saldo-member-akun'];
      saldoIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const raw = el.getAttribute('data-saldo') || el.textContent || '0';
        el.textContent = formatRupiah(raw);
      });
    }

    function getSaldoValue() {
      const el = document.getElementById('saldo-member-akun') || document.getElementById('saldo-member');
      if (!el) return 0;
      const raw = el.getAttribute('data-saldo') || el.textContent || '0';
      const cleaned = String(raw).replace(/[^\d.-]/g, '');
      return cleaned === '' ? 0 : cleaned;
    }

    function bindEyeSaldo() {
      const toggle = document.getElementById('toggle-saldo');
      const saldoMember = document.getElementById('saldo-member-akun');
      if (!toggle || !saldoMember) return;

      const saldoAsli = getSaldoValue();
      let visible = true;

      const syncUI = () => {
        saldoMember.textContent = visible ? formatRupiah(saldoAsli) : '*****';
        toggle.classList.toggle('active', visible);
      };

      toggle.addEventListener('click', function () {
        visible = !visible;
        syncUI();
      });

      syncUI();
    }

    function bindNotifToggle() {
      const toggle = document.getElementById('notifToggle');
      if (!toggle) return;
      const notifState = localStorage.getItem('notif_profile') !== '0';
      toggle.classList.toggle('active', notifState);

      toggle.addEventListener('click', function () {
        const active = !toggle.classList.contains('active');
        toggle.classList.toggle('active', active);
        localStorage.setItem('notif_profile', active ? '1' : '0');
      });
    }

    function getNextPromoEnd(now){
      const target = new Date(now);
      target.setHours(7, 0, 0, 0);
      if(now >= target) target.setDate(target.getDate() + 1);
      return target;
    }

    function tick(){
      const now = new Date();
      const target = getNextPromoEnd(now);
      const diff = Math.max(0, target - now);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      document.getElementById('hh').textContent = String(h).padStart(2,'0');
      document.getElementById('mm').textContent = String(m).padStart(2,'0');
      document.getElementById('ss').textContent = String(s).padStart(2,'0');
    }
    tick();
    setInterval(tick, 1000);

    const faqData = [
      { cat:'Umum', q:'Bagaimana cara menghubungi customer service?', a:'Silakan gunakan kontak bantuan yang tersedia di halaman ini atau hubungi layanan dukungan melalui kanal resmi.' },
      { cat:'Umum', q:'Apakah layanan ini tersedia 24 jam?', a:'Ya, informasi dan layanan utama dapat diakses kapan saja selama 24/7.' },
      { cat:'Transaksi', q:'Kenapa transaksi saya masih proses?', a:'Biasanya karena sistem atau penyedia layanan masih memverifikasi transaksi. Tunggu beberapa menit lalu cek kembali.' },
      { cat:'Transaksi', q:'Apa yang harus dilakukan jika transaksi gagal?', a:'Periksa koneksi internet, saldo, dan ulangi transaksi. Jika tetap gagal, hubungi customer service.' },
      { cat:'Transaksi', q:'Kenapa pulsa belum masuk setelah pembayaran?', a:'Proses bisa memerlukan beberapa saat karena antrian sistem atau gangguan jaringan operator. Tunggu sebentar lalu cek riwayat transaksi.' },
      { cat:'Produk', q:'Apa itu PPOB pulsa?', a:'PPOB pulsa adalah layanan pembayaran dan pembelian pulsa secara digital untuk isi ulang pulsa, paket data, dan kebutuhan top up lainnya.' },
      { cat:'Produk', q:'Bagaimana cara membeli pulsa lewat PPOB?', a:'Pilih menu pulsa, masukkan nomor tujuan, pilih nominal, lalu konfirmasi pembayaran. Setelah berhasil, pulsa akan diproses otomatis.' },
      { cat:'Produk', q:'Apakah bisa beli pulsa semua operator?', a:'Umumnya tersedia untuk berbagai operator populer. Ketersediaan produk tergantung pada stok dan dukungan sistem saat itu.' },
      { cat:'Produk', q:'Apakah ada minimal pembelian pulsa?', a:'Ya, minimal pembelian mengikuti ketentuan nominal produk yang tersedia di sistem PPOB.' },
      { cat:'Akun', q:'Bagaimana jika lupa data transaksi?', a:'Cek riwayat transaksi di akun Anda. Jika masih belum ditemukan, hubungi customer service dengan detail waktu transaksi.' }
    ];
    const categories = ['Semua', ...new Set(faqData.map(x => x.cat))];
    let currentOpenIndex = -1;
    let activeCategory = 'Semua';

    function showToast(text){
      const toast = document.getElementById('toast') || (() => {
        const el = document.createElement('div');
        el.id = 'toast';
        el.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] hidden';
        el.innerHTML = '<div class="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl text-sm font-semibold border border-white/10"><span id="toastText"></span></div>';
        document.body.appendChild(el);
        return el;
      })();
      document.getElementById('toastText').textContent = text;
      toast.classList.remove('hidden');
      clearTimeout(window.__toastT);
      window.__toastT = setTimeout(() => toast.classList.add('hidden'), 1800);
    }

    function renderCategories(){
      const row = document.getElementById('categoryRow');
      if(!row) return;
      row.innerHTML = categories.map(cat => `<button type="button" class="faq-chip ${activeCategory === cat ? 'active' : ''}" onclick="setCategory('${cat}')">${cat}</button>`).join('');
      document.getElementById('totalKategori').textContent = categories.length - 1;
      document.getElementById('totalFAQ').textContent = faqData.length;
    }

    function setCategory(cat){
      activeCategory = cat;
      currentOpenIndex = -1;
      renderCategories();
      renderFAQ();
    }

    function toggleFAQ(index){
      currentOpenIndex = currentOpenIndex === index ? -1 : index;
      renderFAQ();
    }

    function renderFAQ(){
      const q = (document.getElementById('faqSearchTop').value || '').toLowerCase().trim();
      const list = document.getElementById('faqList');
      const filtered = faqData
        .map((item, index) => ({ ...item, index }))
        .filter(x => (activeCategory === 'Semua' || x.cat === activeCategory) && (!q || (x.q + ' ' + x.a + ' ' + x.cat).toLowerCase().includes(q)));

      document.getElementById('totalFAQ').textContent = faqData.length;
      document.getElementById('totalKategori').textContent = categories.length - 1;

      list.innerHTML = filtered.map(item => `
        <div class="faq-item ${item.index === currentOpenIndex ? 'open' : ''}">
          <button class="faq-question" onclick="toggleFAQ(${item.index})" type="button" aria-expanded="${item.index === currentOpenIndex ? 'true' : 'false'}">
            <span>${item.q}</span>
            <span class="material-icons-outlined">expand_more</span>
          </button>
          <div class="faq-answer"><p>${item.a}</p></div>
        </div>
      `).join('') || '<div class="faq-empty">Tidak ada hasil yang cocok.</div>';
    }

    function resetFAQ(){
      document.getElementById('faqSearchTop').value = '';
      activeCategory = 'Semua';
      currentOpenIndex = -1;
      renderCategories();
      renderFAQ();
      showToast('Pencarian telah direset');
    }

    const flashTrack = document.getElementById('flashTrack');
    const flashSlides = flashTrack ? Array.from(flashTrack.querySelectorAll('.flash-slide')) : [];
    const flashCounter = document.getElementById('flashCounter');
    const flashDots = document.getElementById('flashDots');
    let flashIndex = 0;

    function buildFlashDots(){
      if(!flashDots) return;
      flashDots.innerHTML = '';
      flashSlides.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.className = 'flash-dot' + (i === 0 ? ' active' : '');
        dot.addEventListener('click', () => scrollToFlash(i));
        flashDots.appendChild(dot);
      });
    }

    function updateFlashUI(index){
      flashIndex = Math.max(0, Math.min(index, flashSlides.length - 1));
      if (flashCounter) flashCounter.textContent = `${flashIndex + 1} / ${flashSlides.length}`;
      document.querySelectorAll('.flash-dot').forEach((d, i) => d.classList.toggle('active', i === flashIndex));
    }

    function scrollToFlash(index){
      if(!flashTrack || !flashSlides.length) return;
      const slide = flashSlides[Math.max(0, Math.min(index, flashSlides.length - 1))];
      flashTrack.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
      updateFlashUI(index);
    }

    function setupFlashSwipe(){
      if(!flashTrack || !flashSlides.length) return;
      const prev = document.getElementById('flashPrev');
      const next = document.getElementById('flashNext');
      buildFlashDots();
      updateFlashUI(0);
      prev?.addEventListener('click', () => scrollToFlash(flashIndex - 1));
      next?.addEventListener('click', () => scrollToFlash(flashIndex + 1));
      let raf = null;
      const syncFromScroll = () => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const trackLeft = flashTrack.scrollLeft;
          let nearest = 0;
          let minDiff = Infinity;
          flashSlides.forEach((slide, i) => {
            const diff = Math.abs(slide.offsetLeft - trackLeft);
            if (diff < minDiff) {
              minDiff = diff;
              nearest = i;
            }
          });
          updateFlashUI(nearest);
        });
      };
      flashTrack.addEventListener('scroll', syncFromScroll, { passive: true });
    }

    const API_CONFIG = {
      baseUrl: 'https://openapi.bukaolshop.net/v1/user/transaksi',
      token: 'eyJhcHAiOiI1ODExNyIsImF1dGgiOiIyMDIxMDIwMiIsInNpZ24iOiJHWjRlRDB5S0c1aFUyUGhRUjNob2pBPT0ifQ==',
      tokenUser: '{{token_user}}',
      idUser: '{{id_user}}'
    };

    let allTransactions = [];
    let currentFilter = 'semua';
    let currentKeyword = '';
    let isLoaded = false;

    function formatDate(dateStr) {
      const d = new Date(dateStr);
      if (isNaN(d)) return '-';
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }

    function normalizeStatus(status) {
      const s = String(status || '').toLowerCase();
      if (['selesai', 'lunas', 'di kirim', 'dikirim', 'success', 'berhasil'].some(v => s.includes(v))) return 'success';
      if (['di proses', 'proses', 'pending'].some(v => s.includes(v))) return 'pending';
      if (['di batalkan', 'batal', 'gagal', 'failed'].some(v => s.includes(v))) return 'failed';
      return 'gray';
    }

    function getStatusText(status) {
      const s = String(status || '').toLowerCase();
      if (['selesai', 'lunas', 'di kirim', 'dikirim', 'success', 'berhasil'].some(v => s.includes(v))) return 'SUKSES';
      if (['di proses', 'proses', 'pending'].some(v => s.includes(v))) return 'PROSES';
      if (['di batalkan', 'batal', 'gagal', 'failed'].some(v => s.includes(v))) return 'GAGAL';
      return 'PROSES';
    }

    function normalizeItems(result) {
      if (Array.isArray(result)) return result;
      if (Array.isArray(result.data)) return result.data;
      if (Array.isArray(result.result)) return result.result;
      if (Array.isArray(result.transaksi)) return result.transaksi;
      return [];
    }

    function getField(item, keys, fallback = '-') {
      for (const key of keys) {
        if (item && item[key] !== undefined && item[key] !== null && String(item[key]).trim() !== '') return item[key];
      }
      return fallback;
    }

    function renderFilterButtons() {
      document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === currentFilter);
      });
    }

    function updateStats(items) {
      const total = items.length;
      const sukses = items.filter(i => normalizeStatus(getField(i, ['status', 'status_pengiriman', 'keterangan', 'state'], '')) === 'success').length;
      const proses = items.filter(i => normalizeStatus(getField(i, ['status', 'status_pengiriman', 'keterangan', 'state'], '')) === 'pending').length;
      document.getElementById('stat-total').textContent = total;
      document.getElementById('stat-success').textContent = sukses;
      document.getElementById('stat-pending').textContent = proses;
    }

    function renderTransactions() {
      const container = document.getElementById('riwayat-list');
      const empty = document.getElementById('riwayat-empty');
      if (!container) return;

      const filtered = allTransactions.filter(item => {
        const status = normalizeStatus(getField(item, ['status', 'status_pengiriman', 'keterangan', 'state'], ''));
        const matchFilter =
          currentFilter === 'semua' ||
          (currentFilter === 'sukses' && status === 'success') ||
          (currentFilter === 'proses' && status === 'pending') ||
          (currentFilter === 'gagal' && status === 'failed');

        const keyword = currentKeyword.toLowerCase();
        const text = [
          getField(item, ['nama_barang', 'nama_produk', 'product_name', 'nama'], ''),
          getField(item, ['nomor_pembayaran', 'ref_id', 'id_transaksi', 'invoice_id'], ''),
          getField(item, ['status', 'status_pengiriman', 'keterangan', 'state'], '')
        ].join(' ').toLowerCase();

        return matchFilter && (!keyword || text.includes(keyword));
      });

      renderFilterButtons();
      updateStats(allTransactions);

      if (!filtered.length) {
        container.innerHTML = '';
        empty.style.display = 'block';
        empty.textContent = isLoaded ? (currentKeyword ? 'Data tidak ditemukan.' : 'Belum ada transaksi.') : 'Memuat data...';
        return;
      }

      empty.style.display = 'none';

      const grouped = {};
      filtered.forEach(item => {
        const key = formatDate(getField(item, ['tanggal', 'created_at', 'date'], ''));
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      });

      container.innerHTML = '';
      Object.keys(grouped).forEach(date => {
        const header = document.createElement('div');
        header.className = 'date-header';
        header.innerHTML = `<i class="material-icons-outlined text-[16px] text-blue-600">event</i><span>${date}</span>`;
        container.appendChild(header);

        grouped[date].forEach(item => {
          const statusRaw = getField(item, ['status', 'status_pengiriman', 'keterangan', 'state'], '');
          const card = document.createElement('div');
          card.className = 'transaction-card';

          const name = getField(item, ['nama_barang', 'nama_produk', 'product_name', 'nama'], '-');
          const nomor = getField(item, ['nomor_pembayaran', 'ref_id', 'id_transaksi', 'invoice_id'], '-');
          const tanggal = getField(item, ['tanggal', 'created_at', 'date'], '-');
          const img = getField(item, ['url_gambar_produk', 'image', 'gambar'], 'https://via.placeholder.com/60');

          card.innerHTML = `
            <img src="${img}" alt="${name}" loading="lazy" />
            <div class="transaction-details">
              <small>${formatDate(tanggal)}</small>
              <strong>${name}</strong>
              <div class="meta-row">
                <span class="meta-pill">#${nomor}</span>
              </div>
            </div>
            <div class="transaction-status ${normalizeStatus(statusRaw)}">${getStatusText(statusRaw)}</div>
          `;

          const link = getField(item, ['link_transaksi', 'link'], '');
          if (link && link !== '-') {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => window.open(link, '_blank'));
          }
          container.appendChild(card);
        });
      });
    }

    async function loadTransactions(page = 1, reset = true) {
      const url = `${API_CONFIG.baseUrl}?token=${encodeURIComponent(API_CONFIG.token)}&token_user=${encodeURIComponent(API_CONFIG.tokenUser)}&id_user=${encodeURIComponent(API_CONFIG.idUser)}&page=${page}`;
      const container = document.getElementById('riwayat-list');
      if (page === 1 && container) container.innerHTML = '<div class="riwayat-loading">Memuat transaksi...</div>';

      try {
        const res = await fetch(url);
        const json = await res.json();
        const data = normalizeItems(json);

        if (reset) allTransactions = [];
        if (data.length) {
          allTransactions = allTransactions.concat(data);
          isLoaded = true;
          renderTransactions();
          if (data.length > 0) loadTransactions(page + 1, false);
        } else {
          isLoaded = true;
          renderTransactions();
        }
      } catch (err) {
        isLoaded = true;
        if (container) container.innerHTML = '<div class="riwayat-loading error">Gagal memuat data transaksi.</div>';
      }
    }

    function bindEvents() {
      document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', function () {
          currentFilter = this.dataset.filter;
          renderTransactions();
        });
      });

      document.getElementById('search-transaksi')?.addEventListener('input', function () {
        currentKeyword = this.value.trim();
        renderTransactions();
      });

      document.getElementById('clear-search')?.addEventListener('click', function () {
        const input = document.getElementById('search-transaksi');
        if (input) input.value = '';
        currentKeyword = '';
        renderTransactions();
      });

      document.getElementById('clear-faq-search')?.addEventListener('click', function () {
        resetFAQ();
      });
    }

    document.addEventListener('DOMContentLoaded', function () {
      getUcapan();
      applyRupiahFormat();
      bindEyeSaldo();
      bindNotifToggle();
      renderCategories();
      renderFAQ();
      bindEvents();
      setupFlashSwipe();
      loadTransactions(1, true);
    });