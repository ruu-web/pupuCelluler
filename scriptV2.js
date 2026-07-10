
   const navItems = document.querySelectorAll('.nav-item');
const saldoElement = document.getElementById('saldo-member');
const toggleIcon = document.getElementById('toggle-saldo');
const saldoAsli = saldoElement ? saldoElement.getAttribute('data-saldo') : '0';
let isVisible = false;
let pinValue = '';

const DEBT_KEY = 'catatan_hutang_data';
const token = 'eyJhcHAiOiI1ODExNyIsImF1dGgiOiIyMDIxMDIwMiIsInNpZ24iOiJHWjRlRDB5S0c1aFUyUGhRUjNob2pBPT0ifQ==';
const tokenUser = '{{token_user}}';
const idUser = '{{id_user}}';
const baseUrlMutasi = 'https://openapi.bukaolshop.net/v1/user/catatan';

let debts = [];
let transaksiCache = [];
let activeHistoryType = 'all';
let mutasiLoaded = false;
let mutasiCache = [];
let mutasiActiveTab = 'all';

async function fetchTransactions(page = 1) {
    try {
        const url = `https://openapi.bukaolshop.net/v1/user/transaksi?token=${encodeURIComponent(token)}&token_user=${encodeURIComponent(tokenUser)}&id_user=${encodeURIComponent(idUser)}&page=${page}`;
        const res = await fetch(url);
        const data = await res.json();
        return data && data.code === 200 && Array.isArray(data.data) ? data.data : [];
    } catch (e) {
        console.error('Gagal fetch transaksi:', e);
        return [];
    }
}

async function fetchMutasi(page = 1) {
    try {
        const url = `${baseUrlMutasi}?token=${encodeURIComponent(token)}&token_user=${encodeURIComponent(tokenUser)}&id_user=${encodeURIComponent(idUser)}&tipe=saldo&page=${page}`;
        const res = await fetch(url);
        const data = await res.json();
        return data && data.code === 200 && Array.isArray(data.data) ? data.data : [];
    } catch (e) {
        console.error('Gagal fetch mutasi:', e);
        return [];
    }
}

function normalizeMutasi(item) {
    const raw = String(item.informasi_catatan || item.keterangan || item.informasi || '').trim();
    const lower = raw.toLowerCase();
    const isOut = lower.includes('menggunakan saldo') || lower.includes('mengurangi saldo') || lower.includes('(kurang)') || lower.includes('saldo keluar');
    const amount = Number(item.jumlah_dana || item.nominal || item.amount || 0);

    return {
        date: item.tanggal || item.created_at || '',
        info: raw || 'Mutasi saldo',
        type: isOut ? 'out' : 'in',
        amount: isOut ? -Math.abs(amount) : Math.abs(amount)
    };
}

async function loadMutasiSaldo() {
    const boxLoad = document.getElementById('boxLoad');
    const semua = document.getElementById('dataSemua');
    const masuk = document.getElementById('dataMasuk');
    const keluar = document.getElementById('dataKeluar');

    if (!semua || !masuk || !keluar) return;

    boxLoad.innerHTML = `<div class="d-flex justify-content-center py-4"><div class="spinner-border text-info" role="status"></div></div>`;
    semua.innerHTML = '';
    masuk.innerHTML = '';
    keluar.innerHTML = '';
    mutasiCache = [];

    for (let page = 1; page <= 5; page++) {
        const data = await fetchMutasi(page);
        if (!data.length) break;
        mutasiCache = mutasiCache.concat(data.map(normalizeMutasi));
        if (data.length < 10) break;
    }

    boxLoad.innerHTML = '';
    renderMutasiTabs(mutasiCache);
    mutasiLoaded = true;
}

function formatRupiahNumber(n) {
    const val = Math.abs(Number(n || 0));
    return 'Rp ' + val.toLocaleString('id-ID');
}

function formatMutasiDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr.replace(' ', 'T'));
    if (isNaN(d)) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function renderMutasiTabs(data) {
    const semua = document.getElementById('dataSemua');
    const masuk = document.getElementById('dataMasuk');
    const keluar = document.getElementById('dataKeluar');
    if (!semua || !masuk || !keluar) return;

    const allHtml = [];
    const inHtml = [];
    const outHtml = [];

    data.forEach(item => {
        const warna = item.type === 'out' ? 'text-danger' : 'text-success';
        const prefix = item.type === 'out' ? '-' : '+';
        const amountText = `${prefix}${formatRupiahNumber(item.amount).replace('Rp ', 'Rp ')}`;

        const card = `
            <div class="box-list">
                <div>
                    <div class="text-container">
                        <p class="op-7 f-13 fwb-6">${item.info}</p>
                        <p class="op-7 f-11">${formatMutasiDate(item.date)}</p>
                    </div>
                    <p class="fwb-6 f-14 text-end ${warna}">${amountText}</p>
                </div>
            </div>
        `;

        allHtml.push(card);
        if (item.type === 'in') inHtml.push(card);
        if (item.type === 'out') outHtml.push(card);
    });

    semua.innerHTML = allHtml.join('') || emptyMutasi();
    masuk.innerHTML = inHtml.join('') || emptyMutasi();
    keluar.innerHTML = outHtml.join('') || emptyMutasi();
    applyMutasiTab(mutasiActiveTab);
}

function emptyMutasi() {
    return `<div class="box-list"><div><div class="text-container"><p class="op-7 f-13 fwb-6">Tidak ada data</p><p class="op-7 f-11">Mutasi saldo belum ditemukan.</p></div></div></div>`;
}

function noData() {
    document.getElementById("dataMasuk").innerHTML = emptyMutasi();
    document.getElementById("dataKeluar").innerHTML = emptyMutasi();
    document.getElementById("dataSemua").innerHTML = emptyMutasi();
}

function applyMutasiTab(tab) {
    mutasiActiveTab = tab;
    const left = document.getElementById('left');
    const center = document.getElementById('center');
    const right = document.getElementById('right');

    if (!left || !center || !right) return;

    left.style.display = tab === 'all' ? 'block' : 'none';
    center.style.display = tab === 'in' ? 'block' : 'none';
    right.style.display = tab === 'out' ? 'block' : 'none';

    document.querySelectorAll('.tablinks').forEach(btn => btn.classList.remove('active'));
    if (tab === 'all') document.getElementById('tablinkleft')?.classList.add('active');
    if (tab === 'in') document.getElementById('tablinkcenter')?.classList.add('active');
    if (tab === 'out') document.getElementById('tablinkright')?.classList.add('active');
}

function openCity(evt, cityName) {
    if (cityName === 'left') applyMutasiTab('all');
    if (cityName === 'center') applyMutasiTab('in');
    if (cityName === 'right') applyMutasiTab('out');
    if (evt && evt.currentTarget) evt.currentTarget.classList.add('active');
}

async function loadAllTransactions(page = 1) {
    const container = document.getElementById('history-list');
    if (!container) return;

    if (page === 1) {
        transaksiCache = [];
        container.innerHTML = '<div class="informasi-item"><i class="material-icons-outlined">sync</i><span><h6>Memuat riwayat...</h6><p>Mohon tunggu sebentar.</p></span></div>';
    }

    const data = await fetchTransactions(page);

    if (data.length > 0) {
        transaksiCache = transaksiCache.concat(data.map(normalizeTransaction));
        await loadAllTransactions(page + 1);
        return;
    }

    if (transaksiCache.length === 0) {
        container.innerHTML = '<div class="informasi-item"><i class="material-icons-outlined">inbox</i><span><h6>Tidak ada transaksi</h6><p>Riwayat transaksi belum ditemukan.</p></span></div>';
        updateHistorySummary([]);
        return;
    }

    renderRiwayatTransaksi(transaksiCache);
}

function normalizeTransaction(tx) {
    return {
        tanggal: tx.tanggal || tx.created_at || tx.waktu || tx.date || '',
        tanggalRaw: tx.tanggal || tx.created_at || tx.waktu || tx.date || '',
        nama_barang: tx.nama_barang || tx.nama_produk || tx.produk || tx.name || 'Transaksi',
        nomor_pembayaran: tx.nomor_pembayaran || tx.id_trx || tx.invoice || tx.id || '-',
        status_pengiriman: tx.status_pengiriman || tx.status || tx.ket || '',
        url_gambar_produk: tx.url_gambar_produk || tx.gambar || tx.image || 'https://cdn-icons-png.flaticon.com/512/4076/4076549.png',
        link_transaksi: tx.link_transaksi || tx.link || '#',
        harga: tx.harga || tx.nominal || tx.total || tx.price || ''
    };
}

function renderRiwayatTransaksi(transactions) {
    const container = document.getElementById('history-list');
    if (!container) return;
    container.innerHTML = '';

    const filteredByType = transactions.filter(tx => {
        const info = getStatusInfo(tx.status_pengiriman);
        if (activeHistoryType === 'all') return true;
        if (activeHistoryType === 'success') return info.key === 'success';
        if (activeHistoryType === 'pending') return info.key === 'pending';
        if (activeHistoryType === 'failed') return info.key === 'failed';
        return true;
    });

    if (!filteredByType.length) {
        container.innerHTML = '<div class="informasi-item"><i class="material-icons-outlined">inbox</i><span><h6>Tidak ada transaksi</h6><p>Riwayat transaksi belum ditemukan.</p></span></div>';
        updateHistorySummary([]);
        return;
    }

    filteredByType.forEach(tx => {
        const info = getStatusInfo(tx.status_pengiriman);
        const dateValue = tx.tanggalRaw || tx.tanggal || '';
        const formattedDate = formatDateTime(dateValue);
        const dayOnly = formattedDate ? formattedDate.split(',')[0] : '';
        const timeOnly = formattedDate.includes(',') ? formattedDate.split(',')[1].trim() : '';

        const card = document.createElement('div');
        card.className = 'history-item';
        card.dataset.type = info.key;
        card.dataset.link = tx.link_transaksi || '';
        card.dataset.search = `${tx.nama_barang} ${tx.nomor_pembayaran} ${tx.status_pengiriman}`.toLowerCase();
        card.dataset.date = dateValue ? String(dateValue).slice(0, 10) : '';

        card.innerHTML = `
            <div class="history-icon ${info.cls}">
                <i class="material-icons-outlined">${info.icon}</i>
            </div>
            <div class="history-content">
                <div class="history-top">
                    <div>
                        <h6>${tx.nama_barang}</h6>
                        <div class="history-meta">
                            <span class="history-id">ID Trx: ${tx.nomor_pembayaran}</span>
                            <span class="history-dot">•</span>
                            <span class="history-date">${dayOnly}${timeOnly ? ' · ' + timeOnly : ''}</span>
                        </div>
                    </div>
                    <span class="status ${info.cls}">${info.text}</span>
                </div>

                <div class="history-info-row">
                    <div class="history-price">${tx.harga ? formatRupiah(tx.harga) : 'Rp 0'}</div>
                    <div class="history-chip ${info.cls}">${info.key === 'success' ? 'Selesai' : info.key === 'failed' ? 'Dibatalkan' : 'Diproses'}</div>
                </div>
            </div>
        `;

        if (card.dataset.link && card.dataset.link !== '#') {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => window.open(card.dataset.link, '_blank'));
        }

        container.appendChild(card);
    });

    applyAllFilters();
    updateHistorySummary(transactions);
}

function getStatusInfo(status) {
    const s = String(status || '').toLowerCase();
    if (s.includes('selesai') || s.includes('lunas') || s.includes('berhasil') || s.includes('sukses')) return { key: 'success', text: 'Berhasil', cls: 'success', icon: 'check' };
    if (s.includes('batal') || s.includes('gagal') || s.includes('cancel')) return { key: 'failed', text: 'Gagal', cls: 'failed', icon: 'close' };
    if (s.includes('kirim') || s.includes('proses') || s.includes('pending') || s.includes('tunggu')) return { key: 'pending', text: 'Pending', cls: 'pending', icon: 'schedule' };
    return { key: 'pending', text: 'Proses', cls: 'pending', icon: 'schedule' };
}

function formatDateTime(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function updateHistorySummary(transactions) {
    const totalEl = document.getElementById('total-transaksi-text');
    const successEl = document.getElementById('success-transaksi-text');
    const pendingEl = document.getElementById('pending-transaksi-text');
    const failedEl = document.getElementById('failed-transaksi-text');

    const total = transactions.length;
    const success = transactions.filter(t => getStatusInfo(t.status_pengiriman).key === 'success').length;
    const pending = transactions.filter(t => getStatusInfo(t.status_pengiriman).key === 'pending').length;
    const failed = transactions.filter(t => getStatusInfo(t.status_pengiriman).key === 'failed').length;

    if (totalEl) totalEl.textContent = total;
    if (successEl) successEl.textContent = success;
    if (pendingEl) pendingEl.textContent = pending;
    if (failedEl) failedEl.textContent = failed;
}

function applyAllFilters() {
    const searchValue = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const selectedDate = document.getElementById('datePickerDropdown')?.value || '';
    const selectedMonth = document.getElementById('monthPickerDropdown')?.value || '';

    document.querySelectorAll('#history-list .history-item').forEach(el => {
        let show = true;

        if (activeHistoryType !== 'all') show = el.dataset.type === activeHistoryType;
        if (show && searchValue) show = (el.dataset.search || '').includes(searchValue);
        if (show && selectedDate) show = el.dataset.date === selectedDate;
        if (show && selectedMonth !== '') {
            const d = new Date(el.dataset.date);
            show = !isNaN(d) && String(d.getMonth()) === selectedMonth;
        }

        el.style.display = show ? 'flex' : 'none';
    });

    updateNoDataMessage();
}

function updateNoDataMessage() {
    const container = document.getElementById('history-list');
    if (!container) return;
    const visibleCards = container.querySelectorAll('.history-item:not([style*="display: none"])');
    let msg = document.getElementById('no-data-message');

    if (visibleCards.length === 0) {
        if (!msg) {
            msg = document.createElement('div');
            msg.id = 'no-data-message';
            msg.className = 'informasi-item';
            msg.innerHTML = '<i class="material-icons-outlined">inbox</i><span><h6>Tidak ada transaksi</h6><p>Riwayat transaksi belum ditemukan.</p></span>';
            container.appendChild(msg);
        }
    } else if (msg) {
        msg.remove();
    }
}

function openSection(id) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) target.classList.add('active');

    navItems.forEach(btn => btn.classList.remove('active'));
    const map = { beranda: 0, transaksi: 1, rekap: 2, informasi: 3, akun: 4 };
    if (navItems[map[id]]) navItems[map[id]].classList.add('active');

    window.location.hash = id;

    if (id === 'transaksi') loadAllTransactions(1);
    if (id === 'Mutasi-saldo' && !mutasiLoaded) loadMutasiSaldo();
    if (id === 'catatan-hutang') renderDebts();
}

function hideOffcanvas() {
    const el = document.getElementById('menuOffcanvas');
    if (!el || typeof bootstrap === 'undefined' || !bootstrap.Offcanvas) return;
    const instance = bootstrap.Offcanvas.getInstance(el) || new bootstrap.Offcanvas(el);
    instance.hide();
}

function formatRupiah(angka) {
    const val = String(angka || 0).replace(/[^\d]/g, '');
    return 'Rp ' + val.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function loadDebts() {
    debts = JSON.parse(localStorage.getItem(DEBT_KEY) || '[]');
}

function saveDebtsToStorage() {
    localStorage.setItem(DEBT_KEY, JSON.stringify(debts));
}

function clearDebtForm() {
    ['debt-name', 'debt-phone', 'debt-amount', 'debt-note', 'debt-due'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

function saveDebt() {
    const name = document.getElementById('debt-name')?.value.trim();
    const phone = document.getElementById('debt-phone')?.value.trim();
    const amount = document.getElementById('debt-amount')?.value.trim();
    const note = document.getElementById('debt-note')?.value.trim();
    const due = document.getElementById('debt-due')?.value;

    if (!name || !phone || !amount || !note || !due) {
        alert('Lengkapi semua data hutang.');
        return;
    }

    debts.unshift({ id: Date.now(), name, phone, amount: Number(amount), note, due, paid: 0 });
    saveDebtsToStorage();
    clearDebtForm();
    renderDebts();
    alert('Data hutang berhasil disimpan.');
}

function renderDebts() {
    const list = document.getElementById('debt-list');
    if (!list) return;
    if (!debts.length) {
        list.innerHTML = '<div class="informasi-item"><i class="material-icons-outlined">inbox</i><span><h6>Belum ada data hutang</h6><p>Tambahkan data hutang pertama kamu.</p></span></div>';
        return;
    }
    list.innerHTML = debts.map(item => {
        const remaining = item.amount - item.paid;
        const statusClass = remaining <= 0 ? 'success' : item.paid > 0 ? 'pending' : 'failed';
        const statusText = remaining <= 0 ? 'Lunas' : item.paid > 0 ? 'Sebagian' : 'Belum Bayar';
        return `<div class="history-item">
            <div class="history-icon ${statusClass}"><i class="material-icons-outlined">person</i></div>
            <div class="history-content">
                <div class="history-top">
                    <h6>${item.name}</h6>
                    <span class="status ${statusClass}">${statusText}</span>
                </div>
                <p>${item.note}</p>
                <small>${formatRupiah(item.amount)} • Bayar ${formatRupiah(item.paid)} • Sisa ${formatRupiah(remaining)}</small>
                <small>HP: ${item.phone} • Jatuh tempo: ${item.due}</small>
            </div>
        </div>`;
    }).join('');
}

function setTopupAmount(amount) { const el = document.getElementById('topup-amount'); if (el) el.value = amount; }
function submitTopup() { alert('Fitur top up siap diproses.'); }
function getUcapan() {}
function updatePinDots() {}

document.addEventListener('DOMContentLoaded', () => {
    loadDebts();
    renderDebts();
    updatePinDots();

    if (location.hash) openSection(location.hash.replace('#', ''));

    const filterOpenBtn = document.getElementById('filterOpenBtn');
    const filterCard = document.getElementById('filterCard');
    const filterApplyBtn = document.getElementById('filterApplyBtn');
    const filterCancelBtn = document.getElementById('filterCancelBtn');
    const searchInput = document.getElementById('searchInput');
    const datePicker = document.getElementById('datePickerDropdown');
    const monthPicker = document.getElementById('monthPickerDropdown');

    if (filterOpenBtn && filterCard) {
        filterOpenBtn.addEventListener('click', () => {
            filterCard.style.display = filterCard.style.display === 'none' || !filterCard.style.display ? 'block' : 'none';
        });
    }

    if (filterApplyBtn) filterApplyBtn.addEventListener('click', applyAllFilters);

    if (filterCancelBtn) {
        filterCancelBtn.addEventListener('click', () => {
            if (datePicker) datePicker.value = '';
            if (monthPicker) monthPicker.value = '';
            if (searchInput) searchInput.value = '';
            activeHistoryType = 'all';
            document.querySelectorAll('.history-filter-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
            applyAllFilters();
        });
    }

    if (datePicker) {
        datePicker.addEventListener('input', () => {
            if (datePicker.value && monthPicker) monthPicker.value = '';
            applyAllFilters();
        });
    }

    if (monthPicker) {
        monthPicker.addEventListener('change', () => {
            if (monthPicker.value && datePicker) datePicker.value = '';
            applyAllFilters();
        });
    }

    if (searchInput) searchInput.addEventListener('input', applyAllFilters);

    document.querySelectorAll('.history-filter-btn').forEach((btn, idx) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.history-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeHistoryType = idx === 0 ? 'all' : idx === 1 ? 'success' : idx === 2 ? 'pending' : 'failed';
            applyAllFilters();
        });
    });

    if (location.hash.replace('#', '') === 'transaksi') loadAllTransactions(1);
    if (location.hash.replace('#', '') === 'Mutasi-saldo') loadMutasiSaldo();
});

function setHistoryFilter(btn) {
    document.querySelectorAll('.history-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeHistoryType = btn.getAttribute('data-type') || 'all';
    applyAllFilters();
} 