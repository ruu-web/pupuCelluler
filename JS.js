
const APP_CONFIG = {
  api: {
    token: 'eyJhcHAiOiI1ODExNyIsImF1dGgiOiIyMDIxMDIwMiIsInNpZ24iOiJHWjRlRDB5S0c1aFUyUGhRUjNob2pBPT0ifQ==',
    token_user: '{{token_user}}',
    id_user: '{{id_user}}',
    perPage: 100
  },
  storageKey: 'bukaolshop_rekap_harga_v1',
  financeKey: 'financeData_v1'
};

let allTransactions = [];
let rekapProducts = [];
let allMutasi = [];
let catatanKeuangan = JSON.parse(localStorage.getItem(APP_CONFIG.financeKey) || '[]');

let activePeriod = 'semua';
let activeStatusFilter = 'semua';
let activeRekapFilter = 'semua';
let currentMutasiType = 'all';
let editingProductName = null;
let editingFinanceIndex = -1;
let loadedPages = { trx: false, rekap: false, mutasi: false };

function openSection(id) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
  const navMap = { beranda: 0, 'riwayat-transaksi': 1, rekap: 2, faq: 3, 'akun-saya': 4 };
  const navs = document.querySelectorAll('.nav-item');
  if (navMap[id] !== undefined && navs[navMap[id]]) navs[navMap[id]].classList.add('active');

  if (id === 'riwayat-transaksi' && !loadedPages.trx) {
    loadedPages.trx = true;
    showLoadingOverlay('Mengambil data transaksi...');
    loadAllTransaksi();
  }

  if (id === 'riwayat-rekap' && !loadedPages.rekap) {
    loadedPages.rekap = true;
    showLoadingOverlay('Mengambil data produk...');
    loadRekapProduk();
  }

  if (id === 'mutasi-saldo' && !loadedPages.mutasi) {
    loadedPages.mutasi = true;
    showLoadingOverlay('Mengambil data mutasi...');
    loadMutasiCatatan();
  }

  if (id === 'catatan-keuangan') renderFinance();
  if (id === 'downline') renderDownline();
  if (id === 'akun-saya') renderAccountSaldo();

  window.scrollTo(0, 0);
}

function hideOffcanvas() {
  const el = document.getElementById('menuOffcanvas');
  if (!el || typeof bootstrap === 'undefined') return;
  const instance = bootstrap.Offcanvas.getInstance(el) || new bootstrap.Offcanvas(el);
  instance.hide();
}

function showLoadingOverlay(text = 'Memuat data...') {
  let overlay = document.getElementById('loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.innerHTML = `<div class="loading-overlay-card"><div class="spinner-border text-light" role="status"></div><p id="loading-overlay-text"></p></div>`;
    document.body.appendChild(overlay);
  }
  document.getElementById('loading-overlay-text').textContent = text;
  overlay.classList.add('show');
}

function hideLoadingOverlay() {
  document.getElementById('loading-overlay')?.classList.remove('show');
}

function getUcapan() {
  const jam = new Date().getHours();
  let ucapan = 'Selamat Malam';
  if (jam >= 4 && jam < 11) ucapan = 'Selamat Pagi';
  else if (jam >= 11 && jam < 15) ucapan = 'Selamat Siang';
  else if (jam >= 15 && jam < 18) ucapan = 'Selamat Sore';
  const el = document.getElementById('ucapan');
  if (el) el.textContent = ucapan;
}

function formatRupiah(num) {
  num = Number(num) || 0;
  return 'Rp ' + num.toLocaleString('id-ID');
}

function formatRupiahSimple(num) {
  return Number(num || 0).toLocaleString('id-ID');
}

function formatNumberInput(num) {
  return String(Number(num) || 0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseRupiahInput(val) {
  return parseInt(String(val || '').replace(/\D/g, ''), 10) || 0;
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function parseTanggalOpenApi(str) {
  if (!str) return null;
  const [tgl, jam = '00:00:00'] = String(str).split(' ');
  const [y, m, d] = tgl.split('-');
  const [hh, mm, ss] = jam.split(':');
  return new Date(+y, +m - 1, +d, +hh, +mm, +(ss || 0));
}

function formatTanggalLabel(date) {
  if (!date) return 'Tanpa tanggal';
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
}

function isBatal(tx) {
  const bayar = String(tx.status_bayar || '').toLowerCase();
  const kirim = String(tx.status_pengiriman || '').toLowerCase();
  return bayar.includes('batal') || kirim.includes('batal') || kirim.includes('gagal');
}

function isSukses(tx) {
  if (isBatal(tx)) return false;
  const bayar = String(tx.status_bayar || '').toLowerCase();
  const kirim = String(tx.status_pengiriman || '').toLowerCase();
  return bayar.includes('lunas') || bayar.includes('dibayar') || bayar.includes('sukses') || kirim.includes('selesai') || kirim.includes('dikirim');
}

function getStatusMeta(tx) {
  if (isBatal(tx)) return { cls: 'red', label: 'Gagal' };
  if (isSukses(tx)) return { cls: 'green', label: 'Sukses' };
  return { cls: 'orange', label: 'Proses' };
}

function buildTrxUrl(page) {
  return `https://openapi.bukaolshop.net/v1/user/transaksi?token=${encodeURIComponent(APP_CONFIG.api.token)}&token_user=${encodeURIComponent(APP_CONFIG.api.token_user)}&id_user=${encodeURIComponent(APP_CONFIG.api.id_user)}&page=${page}&total_data=${APP_CONFIG.api.perPage}`;
}

function buildProdukUrl(page) {
  return `https://openapi.bukaolshop.net/v1/app/produk?token=${encodeURIComponent(APP_CONFIG.api.token)}&token_user=${encodeURIComponent(APP_CONFIG.api.token_user)}&id_user=${encodeURIComponent(APP_CONFIG.api.id_user)}&page=${page}&total_data=${APP_CONFIG.api.perPage}`;
}

function buildCatatanUrl(page) {
  return `https://openapi.bukaolshop.net/v1/user/catatan?token=${encodeURIComponent(APP_CONFIG.api.token)}&token_user=${encodeURIComponent(APP_CONFIG.api.token_user)}&id_user=${encodeURIComponent(APP_CONFIG.api.id_user)}&tipe=saldo&page=${page}`;
}

function matchPeriod(date, period) {
  if (!date) return false;
  if (period === 'semua') return true;
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === 'hari') return date >= start;
  if (period === 'minggu') {
    start.setDate(start.getDate() - 6);
    return date >= start;
  }
  if (period === 'bulan') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  return true;
}

function loadAllTransaksi(page = 1, reset = true) {
  if (reset) allTransactions = [];
  fetch(buildTrxUrl(page))
    .then(r => r.json())
    .then(res => {
      const data = Array.isArray(res.data) ? res.data : [];
      allTransactions = allTransactions.concat(data);
      if (data.length === APP_CONFIG.api.perPage) loadAllTransaksi(page + 1, false);
      else {
        hideLoadingOverlay();
        renderHistory();
        renderRekap();
      }
    })
    .catch(() => {
      hideLoadingOverlay();
      renderHistory();
      renderRekap();
    });
}

function normalizeRekapProduk(item) {
  return {
    nama_produk: String(item.nama_produk || item.nama_barang || item.nama || item.judul || '').trim(),
    gambar_utama: item.url_gambar_produk || item.gambar_utama || item.gambar || item.foto || item.thumbnail || '',
    harga_produk: parseInt(item.harga_produk || item.harga_jual || item.harga || item.price || 0, 10) || 0,
    id_produk: item.id_produk || item.id || ''
  };
}

function loadRekapProduk(page = 1, reset = true) {
  if (reset) rekapProducts = [];
  fetch(buildProdukUrl(page))
    .then(r => r.json())
    .then(res => {
      const data = Array.isArray(res.data) ? res.data : [];
      rekapProducts = rekapProducts.concat(data.map(normalizeRekapProduk));
      if (data.length === APP_CONFIG.api.perPage) loadRekapProduk(page + 1, false);
      else {
        hideLoadingOverlay();
        renderRekap();
      }
    })
    .catch(() => {
      hideLoadingOverlay();
      renderRekap();
    });
}

function loadMutasiCatatan(page = 1, reset = true) {
  if (reset) allMutasi = [];
  fetch(buildCatatanUrl(page))
    .then(r => r.json())
    .then(res => {
      const data = Array.isArray(res.data) ? res.data : [];
      allMutasi = allMutasi.concat(data);
      if (data.length === APP_CONFIG.api.perPage) loadMutasiCatatan(page + 1, false);
      else {
        hideLoadingOverlay();
        renderMutasi();
      }
    })
    .catch(() => {
      hideLoadingOverlay();
      renderMutasi();
    });
}

function renderHistory() {
  const wrap = document.getElementById('historyList');
  const empty = document.getElementById('historyEmpty');
  const count = document.getElementById('historyCount');
  if (!wrap || !empty || !count) return;

  const search = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  const filtered = allTransactions.filter(tx => {
    const date = parseTanggalOpenApi(tx.tanggal);
    if (!date || !matchPeriod(date, activePeriod)) return false;
    const meta = getStatusMeta(tx);
    if (activeStatusFilter === 'sukses' && meta.cls !== 'green') return false;
    if (activeStatusFilter === 'proses' && meta.cls !== 'orange') return false;
    if (activeStatusFilter === 'gagal' && meta.cls !== 'red') return false;
    const text = [tx.nomor_pembayaran, tx.nama_barang, tx.status_bayar, tx.status_pengiriman].join(' ').toLowerCase();
    return !search || text.includes(search);
  });

  count.textContent = `${filtered.length} transaksi`;
  wrap.innerHTML = '';

  if (!filtered.length) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  const groups = {};
  filtered.forEach(tx => {
    const date = parseTanggalOpenApi(tx.tanggal);
    const key = date ? date.toDateString() : 'unknown';
    if (!groups[key]) groups[key] = { date, items: [] };
    groups[key].items.push(tx);
  });

  Object.keys(groups).sort((a, b) => (groups[b].date || 0) - (groups[a].date || 0)).forEach(key => {
    const group = groups[key];
    const header = document.createElement('div');
    header.className = 'date-header';
    header.textContent = formatTanggalLabel(group.date);
    wrap.appendChild(header);

    group.items.sort((a, b) => parseTanggalOpenApi(b.tanggal) - parseTanggalOpenApi(a.tanggal));
    group.items.forEach(tx => {
      const meta = getStatusMeta(tx);
      const item = document.createElement('div');
      item.className = 'transaction-card';
      item.innerHTML = `
        <img src="${escapeHtml(tx.url_gambar_produk || 'https://cdn-icons-png.flaticon.com/512/4076/4076549.png')}" alt="">
        <div class="transaction-details">
          <small>${escapeHtml(tx.tanggal || '')}</small>
          <strong>${escapeHtml(tx.nama_barang || '-')}</strong>
          <small>#${escapeHtml(tx.nomor_pembayaran || '-')}</small>
        </div>
        <div class="transaction-status ${meta.cls}">${meta.label}</div>
      `;
      item.addEventListener('click', () => {
        if (tx.link_transaksi) window.open(tx.link_transaksi, '_blank');
      });
      wrap.appendChild(item);
    });
  });
}

function loadPriceSettings() {
  try { return JSON.parse(localStorage.getItem(APP_CONFIG.storageKey) || '{}'); } catch { return {}; }
}

function savePriceSettings(data) {
  localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(data));
}

function getProductPrice(nama) {
  return loadPriceSettings()[(nama || '').trim()] || null;
}

function setProductPrice(nama, beli, jual, meta = {}) {
  const settings = loadPriceSettings();
  const key = (nama || '').trim();
  settings[key] = {
    hargaBeli: Math.max(0, parseInt(beli, 10) || 0),
    hargaJual: Math.max(0, parseInt(jual, 10) || 0),
    margin: Math.max(0, (parseInt(jual, 10) || 0) - (parseInt(beli, 10) || 0)),
    marginDiisi: true,
    hargaProdukApi: meta.hargaProdukApi || 0,
    idProduk: meta.idProduk || '',
    fromApi: !!meta.fromApi,
    manual: !!meta.manual
  };
  savePriceSettings(settings);
}

function buildRekapProductsFromTransactions(trxs) {
  const map = {};
  trxs.forEach(tx => {
    const nama = (tx.nama_barang || '').trim();
    if (!nama) return;
    if (!map[nama]) map[nama] = { nama_produk: nama, gambar_utama: tx.url_gambar_produk || '', harga_produk: 0 };
  });
  return Object.values(map).sort((a, b) => a.nama_produk.localeCompare(b.nama_produk));
}

function renderRekap() {
  const wrap = document.getElementById('rekapSection');
  if (!wrap) return;
  const settings = loadPriceSettings();
  const search = (document.getElementById('rekapSearch')?.value || '').toLowerCase().trim();
  const items = rekapProducts.length ? rekapProducts : buildRekapProductsFromTransactions(allTransactions);

  const filtered = items.filter(p => {
    const nama = p.nama_produk || p.nama || '';
    const cfg = settings[nama];
    const hasSet = cfg && cfg.marginDiisi && cfg.hargaJual;
    if (activeRekapFilter === 'sudah' && !hasSet) return false;
    if (activeRekapFilter === 'belum' && hasSet) return false;
    return !search || nama.toLowerCase().includes(search);
  });

  const totalSukses = allTransactions.filter(isSukses);
  let totalPenjualan = 0, totalUntung = 0, totalSudahSet = 0, totalBelumSet = 0;

  totalSukses.forEach(tx => {
    const nama = (tx.nama_barang || '').trim();
    const cfg = settings[nama];
    if (cfg && cfg.marginDiisi && cfg.hargaJual) {
      totalPenjualan += cfg.hargaJual;
      totalUntung += (cfg.hargaJual - (cfg.hargaBeli || 0));
      totalSudahSet++;
    } else {
      totalBelumSet++;
    }
  });

  let html = `
    <div class="rekap-summary-card">
      <div class="rekap-summary-top">
        <span>Ringkasan Penjualan</span>
        <h2>${formatRupiah(totalPenjualan)} <small>(Sukses)</small></h2>
      </div>
      <div class="rekap-summary-grid">
        <div class="rekap-summary-item in"><div class="label">Untung</div><div class="value">${formatRupiah(totalUntung)}</div></div>
        <div class="rekap-summary-item count"><div class="label">Sudah Set</div><div class="value">${totalSudahSet}</div></div>
        <div class="rekap-summary-item out"><div class="label">Belum Set</div><div class="value">${totalBelumSet}</div></div>
      </div>
      ${totalBelumSet ? `<div class="rekap-hint show">${totalBelumSet} data belum diatur harga</div>` : ''}
    </div>
    <div class="rekap-card">
      <div class="rekap-section-label"><h3>Daftar Produk</h3></div>
  `;

  if (!filtered.length) {
    html += `<div id="rekapEmpty" class="show" style="text-align:center;padding:40px 20px;color:#64748b;">
      <i class="material-icons-outlined" style="font-size:54px;color:#94a3b8;">inventory_2</i>
      <p class="mt-3">Tidak ada produk</p>
    </div>`;
  } else {
    html += `<div class="rekap-list-wrap">`;
    filtered.forEach(p => {
      const nama = p.nama_produk || p.nama || '';
      const cfg = settings[nama];
      const hasSet = cfg && cfg.marginDiisi && cfg.hargaJual;
      const badgeCls = hasSet ? 'green' : 'orange';
      const badgeTxt = hasSet ? 'Sudah Set' : 'Belum Set';
      const profit = hasSet ? (cfg.hargaJual - (cfg.hargaBeli || 0)) : 0;
      html += `
        <div class="rekap-tx-item" onclick="openPriceModal('${escapeHtml(nama)}')">
          <div class="rekap-tx-thumb">${p.gambar_utama ? `<img src="${escapeHtml(p.gambar_utama)}" alt="">` : '<i class="material-icons-outlined">inventory_2</i>'}</div>
          <div class="rekap-tx-body">
            <h4>${escapeHtml(nama)}</h4>
            <p>${hasSet ? formatRupiah(cfg.hargaJual) : 'Belum ada harga'}</p>
            <span class="rekap-profit-tag">${hasSet ? 'Untung ' + formatRupiah(profit) : 'Klik untuk setting harga'}</span>
          </div>
          <div class="rekap-tx-right"><span class="rekap-status ${badgeCls}">${badgeTxt}</span></div>
        </div>
      `;
    });
    html += `</div>`;
  }
  html += `</div>`;
  wrap.innerHTML = html;
}

function countSelesaiForProduct(nama, period) {
  return allTransactions.filter(tx => {
    if (!isSukses(tx)) return false;
    if ((tx.nama_barang || '').trim() !== nama) return false;
    return matchPeriod(parseTanggalOpenApi(tx.tanggal), period);
  }).length;
}

function openPriceModal(nama) {
  editingProductName = nama;
  const price = getProductPrice(nama) || {};
  const apiProd = rekapProducts.find(p => (p.nama_produk || '').trim() === (nama || '').trim()) || null;

  document.getElementById('priceProductPreview').innerHTML = `<strong>${escapeHtml(nama)}</strong>`;
  document.getElementById('apiPriceHint').textContent = apiProd && apiProd.harga_produk
    ? `Harga jual API: ${formatRupiah(apiProd.harga_produk)}`
    : 'Atur harga jual dan margin untuk produk ini.';

  document.getElementById('inputHargaJual').value = price.hargaJual ? formatNumberInput(price.hargaJual) : (apiProd && apiProd.harga_produk ? formatNumberInput(apiProd.harga_produk) : '');
  document.getElementById('inputMargin').value = price.margin ? formatNumberInput(price.margin) : '';
  document.getElementById('modalPrice').classList.add('show');
  updatePricePreview();
}

function closeModalPrice() {
  document.getElementById('modalPrice').classList.remove('show');
}

function updatePricePreview() {
  if (!editingProductName) return;
  const margin = parseRupiahInput(document.getElementById('inputMargin').value);
  const trxCount = countSelesaiForProduct(editingProductName, activePeriod);
  document.getElementById('previewMarginUnit').textContent = formatRupiah(margin);
  document.getElementById('previewTrxCount').textContent = trxCount;
  document.getElementById('previewProfitTotal').textContent = formatRupiah(margin * trxCount);
}

function isMutasiKeluar(v) {
  const inf = String(v.informasi_catatan || '').replace('Anda', 'Admin').replace('Member', 'Anda').replace('dari aplikasi bukaOlshop', '').replace('melalui API', '');
  return inf.includes('melakukan transaksi menggunakan saldo') || inf.includes('mengurangi saldo') || inf.includes('(kurang)');
}

function renderMutasiItem(v) {
  const inf = String(v.informasi_catatan || '').replace('Anda', 'Admin').replace('Member', 'Anda').replace('dari aplikasi bukaOlshop', '').replace('melalui API', '');
  const keluar = isMutasiKeluar(v);
  const warna = keluar ? 'text-danger' : 'text-success';
  const jml = (keluar ? '-' : '+') + formatRupiah(v.jumlah_dana || 0);
  const d = parseTanggalOpenApi(v.tanggal);
  const tgl = d ? `${d.getDate()} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()]} ${d.getFullYear()} · ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` : '';
  return `<div class="box-list"><div><div class="text-container"><p class="op-7 f-13 fwb-6">${escapeHtml(inf)}</p><p class="op-7 f-11">${escapeHtml(tgl)}</p></div><p class="fwb-6 f-14 text-end ${warna}">${jml}</p></div></div>`;
}

function renderMutasi() {
  const elSemua = document.getElementById('dataSemua');
  const elMasuk = document.getElementById('dataMasuk');
  const elKeluar = document.getElementById('dataKeluar');
  const totalEl = document.getElementById('mutasiTotal');
  if (!elSemua || !elMasuk || !elKeluar || !totalEl) return;

  const search = (document.getElementById('searchMutasi')?.value || '').toLowerCase().trim();
  const filtered = allMutasi.filter(item => {
    const text = `${item.informasi_catatan || ''} ${item.tanggal || ''}`.toLowerCase();
    const type = isMutasiKeluar(item) ? 'keluar' : 'masuk';
    if (currentMutasiType !== 'all' && currentMutasiType !== type) return false;
    return !search || text.includes(search);
  });

  totalEl.textContent = formatRupiah(filtered.reduce((a, b) => a + (parseInt(b.jumlah_dana || 0, 10) || 0), 0));
  elSemua.innerHTML = filtered.map(renderMutasiItem).join('');
  elMasuk.innerHTML = filtered.filter(i => !isMutasiKeluar(i)).map(renderMutasiItem).join('');
  elKeluar.innerHTML = filtered.filter(i => isMutasiKeluar(i)).map(renderMutasiItem).join('');

  document.getElementById('left').style.display = currentMutasiType === 'all' ? 'block' : 'none';
  document.getElementById('center').style.display = currentMutasiType === 'masuk' ? 'block' : 'none';
  document.getElementById('right').style.display = currentMutasiType === 'keluar' ? 'block' : 'none';
}

function filterMutasi(tab) {
  document.querySelectorAll('[data-mutasi-type]').forEach(el => el.classList.remove('active'));
  tab.classList.add('active');
  currentMutasiType = tab.getAttribute('data-mutasi-type') || 'all';
  renderMutasi();
}

function applyMutasiFilters() {
  renderMutasi();
}

function renderAccountSaldo() {
  const ids = ['saldo-member', 'account-saldo', 'account-saldo-text'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const val = el.getAttribute('data-saldo') || '0';
      el.textContent = formatRupiahSimple(val);
    }
  });
}

function bindEyeSaldo() {
  const toggle = document.getElementById('toggle-saldo');
  if (!toggle) return;

  const targets = ['saldo-member', 'account-saldo', 'account-saldo-text'];
  const asli = {};
  targets.forEach(id => {
    const el = document.getElementById(id);
    if (el) asli[id] = el.getAttribute('data-saldo') || '0';
  });

  let visible = false;
  toggle.addEventListener('click', function () {
    visible = !visible;
    targets.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const val = asli[id] || '0';
      el.textContent = visible ? formatRupiahSimple(val) : '*****';
    });
    toggle.textContent = visible ? 'visibility_off' : 'visibility';
  });
}

function renderDownline() {
  const list = document.getElementById('downlineList');
  const totalDownline = document.getElementById('totalDownline');
  const totalKomisi = document.getElementById('totalKomisi');
  if (!list || !totalDownline || !totalKomisi) return;

  const data = [
    { nama: 'Alya Putri', join: '2 hari lalu', komisi: 25000, status: 'Aktif' },
    { nama: 'Budi Santoso', join: '1 minggu lalu', komisi: 15000, status: 'Aktif' },
    { nama: 'Citra Wulandari', join: '3 minggu lalu', komisi: 0, status: 'Baru' }
  ];

  totalDownline.textContent = data.length;
  totalKomisi.textContent = formatRupiah(data.reduce((a, b) => a + Number(b.komisi || 0), 0));

  list.innerHTML = data.map(item => `
    <div class="downline-item">
      <div class="downline-item-avatar"><i class="material-icons-outlined">person</i></div>
      <div class="downline-item-info">
        <h6>${escapeHtml(item.nama)}</h6>
        <p>Gabung ${escapeHtml(item.join)} · Komisi ${formatRupiah(item.komisi)}</p>
      </div>
      <span class="downline-item-badge">${escapeHtml(item.status)}</span>
    </div>
  `).join('');
}

function copyReferralCode() {
  const text = document.getElementById('referralCodeText')?.textContent || '';
  navigator.clipboard.writeText(text).then(() => alert('Kode referral disalin'));
}

function copyReferralLink() {
  const input = document.getElementById('referralLinkInput');
  if (!input) return;
  input.select();
  document.execCommand('copy');
  alert('Link referral disalin');
}

function shareReferral() {
  const text = document.getElementById('referralLinkInput')?.value || '';
  if (navigator.share) navigator.share({ title: 'Referral', text: 'Daftar pakai link ini', url: text });
  else copyReferralLink();
}

function saveFinance() {
  const type = document.getElementById('editFinanceType').value;
  const title = document.getElementById('editFinanceTitle').value.trim();
  const amount = parseRupiahInput(document.getElementById('editFinanceAmount').value);
  const date = document.getElementById('editFinanceDate').value;
  const note = document.getElementById('editFinanceNote').value.trim();

  if (!title || !amount || !date) return alert('Lengkapi data catatan');

  const item = {
    id: editingFinanceIndex >= 0 ? catatanKeuangan[editingFinanceIndex].id : Date.now(),
    type,
    title,
    amount,
    date,
    note
  };

  if (editingFinanceIndex >= 0) catatanKeuangan[editingFinanceIndex] = item;
  else catatanKeuangan.unshift(item);

  localStorage.setItem(APP_CONFIG.financeKey, JSON.stringify(catatanKeuangan));
  closeFinanceModal();
  renderFinance();
}

function renderFinance() {
  const list = document.getElementById('financeList');
  const totalEl = document.getElementById('financeTotal');
  const incomeEl = document.getElementById('financeIncome');
  const expenseEl = document.getElementById('financeExpense');
  if (!list || !totalEl || !incomeEl || !expenseEl) return;

  const totalIncome = catatanKeuangan.filter(i => i.type === 'income').reduce((a, b) => a + Number(b.amount || 0), 0);
  const totalExpense = catatanKeuangan.filter(i => i.type === 'expense').reduce((a, b) => a + Number(b.amount || 0), 0);

  totalEl.textContent = formatRupiah(totalIncome - totalExpense);
  incomeEl.textContent = formatRupiah(totalIncome);
  expenseEl.textContent = formatRupiah(totalExpense);

  if (!catatanKeuangan.length) {
    list.innerHTML = `<div class="text-center py-4 text-muted">Belum ada catatan keuangan</div>`;
    return;
  }

  list.innerHTML = catatanKeuangan.map((item, index) => `
    <div class="finance-item">
      <div class="left">
        <span class="finance-type ${item.type === 'income' ? 'in' : 'out'}">${item.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</span>
        <h6>${escapeHtml(item.title)}</h6>
        <p>${escapeHtml(item.date)}${item.note ? ' · ' + escapeHtml(item.note) : ''}</p>
      </div>
      <div class="finance-actions">
        <button type="button" onclick="editFinance(${index})"><i class="material-icons-outlined">edit</i></button>
        <button type="button" class="delete" onclick="deleteFinance(${index})"><i class="material-icons-outlined">delete</i></button>
      </div>
    </div>
  `).join('');
}

function editFinance(index) {
  editingFinanceIndex = index;
  const item = catatanKeuangan[index];
  document.getElementById('editFinanceType').value = item.type || 'income';
  document.getElementById('editFinanceTitle').value = item.title || '';
  document.getElementById('editFinanceAmount').value = formatRupiahSimple(item.amount || 0);
  document.getElementById('editFinanceDate').value = item.date || '';
  document.getElementById('editFinanceNote').value = item.note || '';
  openFinanceModal();
}

function deleteFinance(index) {
  if (!confirm('Hapus catatan ini?')) return;
  catatanKeuangan.splice(index, 1);
  localStorage.setItem(APP_CONFIG.financeKey, JSON.stringify(catatanKeuangan));
  renderFinance();
}

function openFinanceModal() {
  const el = document.getElementById('financeEditOffcanvas');
  if (!el || typeof bootstrap === 'undefined') return;
  const inst = bootstrap.Offcanvas.getInstance(el) || new bootstrap.Offcanvas(el);
  inst.show();
  if (editingFinanceIndex < 0) {
    document.getElementById('editFinanceType').value = 'income';
    document.getElementById('editFinanceTitle').value = '';
    document.getElementById('editFinanceAmount').value = '';
    document.getElementById('editFinanceDate').valueAsDate = new Date();
    document.getElementById('editFinanceNote').value = '';
  }
}

function closeFinanceModal() {
  const el = document.getElementById('financeEditOffcanvas');
  if (!el || typeof bootstrap === 'undefined') return;
  const inst = bootstrap.Offcanvas.getInstance(el) || new bootstrap.Offcanvas(el);
  inst.hide();
}

function bindRekapPriceModal() {
  const modal = document.getElementById('modalPrice');
  if (!modal) return;

  modal.addEventListener('click', e => {
    if (e.target && e.target.getAttribute('data-close') === 'modalPrice') closeModalPrice();
  });

  document.getElementById('inputHargaJual')?.addEventListener('input', function () {
    if (this.readOnly) return;
    this.value = String(parseRupiahInput(this.value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    updatePricePreview();
  });

  document.getElementById('inputMargin')?.addEventListener('input', function () {
    this.value = String(parseRupiahInput(this.value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    updatePricePreview();
  });

  document.getElementById('btnSavePrice')?.addEventListener('click', function () {
    if (!editingProductName) return;
    const jual = parseRupiahInput(document.getElementById('inputHargaJual').value);
    const margin = parseRupiahInput(document.getElementById('inputMargin').value);
    if (!jual || document.getElementById('inputMargin').value.trim() === '') return alert('Isi harga jual dan margin');

    const beli = Math.max(0, jual - margin);
    setProductPrice(editingProductName, beli, jual, { marginDiisi: true, manual: true });
    closeModalPrice();
    renderRekap();
  });

  document.querySelectorAll('.rekap-chip').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.rekap-chip').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      activeRekapFilter = this.getAttribute('data-rekap-filter') || 'semua';
      renderRekap();
    });
  });

  document.getElementById('rekapSearch')?.addEventListener('input', function () {
    const clear = document.querySelector('.rekap-search-clear');
    if (clear) clear.classList.toggle('visible', !!this.value.trim());
    renderRekap();
  });

  document.querySelector('.rekap-search-clear')?.addEventListener('click', function () {
    const input = document.getElementById('rekapSearch');
    if (input) input.value = '';
    this.classList.remove('visible');
    renderRekap();
  });

  document.getElementById('btnAnalyticsPrice')?.addEventListener('click', function () {
    alert('Analytics belum tersedia');
  });

  window.openPriceModal = openPriceModal;
  window.closeModalPrice = closeModalPrice;
}

function renderHistoryStatusTabs() {
  document.querySelectorAll('.history-tabs .tab[data-period]').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.history-tabs .tab[data-period]').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      activePeriod = this.getAttribute('data-period') || 'semua';
      const label = document.getElementById('periodLabel');
      if (label) label.textContent = this.textContent;
      renderHistory();
    });
  });

  document.querySelectorAll('.history-tabs .tab[data-status]').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.history-tabs .tab[data-status]').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      activeStatusFilter = this.getAttribute('data-status') || 'semua';
      renderHistory();
    });
  });
}

function renderMutasiTabInit() {
  document.querySelectorAll('[data-mutasi-type]').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('[data-mutasi-type]').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentMutasiType = this.getAttribute('data-mutasi-type') || 'all';
      renderMutasi();
    });
  });
}

function togglePeriodMenu() {
  const tabs = document.querySelectorAll('.history-tabs .tab[data-period]');
  if (!tabs.length) return;
  const active = Array.from(tabs).find(btn => btn.classList.contains('active'));
  if (active) {
    const options = ['semua', 'sukses', 'proses', 'gagal'];
    const current = active.getAttribute('data-period');
    const idx = options.indexOf(current);
    const next = options[(idx + 1) % options.length];
    const nextBtn = Array.from(tabs).find(btn => btn.getAttribute('data-period') === next);
    if (nextBtn) nextBtn.click();
  }
}

document.addEventListener('DOMContentLoaded', function () {
  getUcapan();
  bindEyeSaldo();
  bindRekapPriceModal();
  renderHistoryStatusTabs();
  renderMutasiTabInit();
  renderAccountSaldo();
  openSection('beranda');

  const financeBtn = document.querySelector('.finance-fab');
  if (financeBtn) financeBtn.addEventListener('click', openFinanceModal);

  window.openFinanceModal = openFinanceModal;
  window.closeFinanceModal = closeFinanceModal;
  window.saveFinance = saveFinance;
  window.editFinance = editFinance;
  window.deleteFinance = deleteFinance;
  window.filterMutasi = filterMutasi;
  window.applyMutasiFilters = applyMutasiFilters;
  window.copyReferralCode = copyReferralCode;
  window.copyReferralLink = copyReferralLink;
  window.shareReferral = shareReferral;
  window.renderDownline = renderDownline;
  window.openSection = openSection;
  window.togglePeriodMenu = togglePeriodMenu;
});
