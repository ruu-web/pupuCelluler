const navItems = document.querySelectorAll('.nav-item');
const saldoElement = document.getElementById('saldo-member');
const toggleIcon = document.getElementById('toggle-saldo');
const akunSaldoElement = document.getElementById('akun-saldo');
const saldoAsli = saldoElement ? saldoElement.getAttribute('data-saldo') : '0';
let isVisible = false;
let pinValue = '';

const DEBT_KEY = 'catatan_hutang_data';
const urlToko = 'https://pupucelluler.olshopku.com';
const token = 'eyJhcHAiOiI1ODExNyIsImF1dGgiOiIyMDIxMDIwMiIsInNpZ24iOiJHWjRlRDB5S0c1aFUyUGhRUjNob2pBPT0ifQ==';
const tokenUser = '{{token_user}}';
const idUser = '{{id_user}}';

let debts = [];
let riwayatTransaksi = [];

async function fetchTransactions(page = 1) {
    try {
        const url = `https://openapi.bukaolshop.net/v1/user/transaksi?token=${encodeURIComponent(token)}&token_user=${encodeURIComponent(tokenUser)}&id_user=${encodeURIComponent(idUser)}&page=${page}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.code === 200 && Array.isArray(data.data)) return data.data;
        return [];
    } catch (e) {
        return [];
    }
}

async function loadAllTransactions(page = 1) {
    const nextData = await fetchTransactions(page);
    if (nextData.length > 0) {
        riwayatTransaksi = riwayatTransaksi.concat(nextData);
        renderRiwayatTransaksi(riwayatTransaksi);
        await loadAllTransactions(page + 1);
    } else {
        renderRiwayatTransaksi(riwayatTransaksi);
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
    if (id === 'Mutasi-saldo') loadMutasiSaldo();
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

function formatDate(dateStr) {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function updateStatus(status) {
    const s = String(status || '').toLowerCase();
    if (s.includes('selesai') || s.includes('lunas') || s.includes('berhasil') || s.includes('sukses')) return { text: 'SUKSES', cls: 'success', icon: 'check' };
    if (s.includes('batal') || s.includes('gagal')) return { text: 'GAGAL', cls: 'failed', icon: 'close' };
    if (s.includes('kirim')) return { text: 'DIKIRIM', cls: 'success', icon: 'local_shipping' };
    return { text: 'PENDING', cls: 'pending', icon: 'schedule' };
}

function renderRiwayatTransaksi(transactions) {
    const container = document.getElementById('history-list');
    if (!container) return;

    container.innerHTML = '';

    if (!transactions.length) {
        container.innerHTML = `
            <div class="informasi-item">
                <i class="material-icons-outlined">inbox</i>
                <span><h6>Tidak ada transaksi</h6><p>Riwayat transaksi belum ditemukan.</p></span>
            </div>`;
        return;
    }

    const grouped = {};
    transactions.forEach(tx => {
        const dateKey = formatDate(tx.tanggal || tx.created_at || tx.waktu || '');
        const key = dateKey || 'Tanpa Tanggal';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(tx);
    });

    Object.keys(grouped).forEach(date => {
        const h5 = document.createElement('h5');
        h5.className = 'date-header';
        h5.innerHTML = `<i class="material-icons-outlined" style="margin-right:8px;">calendar_month</i>${date}`;
        container.appendChild(h5);

        grouped[date].forEach(tx => {
            const st = updateStatus(tx.status_pengiriman || tx.status || tx.ket);
            const card = document.createElement('div');
            card.className = 'history-item transaction-card';
            card.dataset.link = tx.link_transaksi || '';

            card.innerHTML = `
                <div class="history-icon ${st.cls}"><i class="material-icons-outlined">${st.icon}</i></div>
                <div class="history-content">
                    <div class="history-top">
                        <h6>${tx.nama_barang || tx.nama_produk || tx.produk || 'Transaksi'}</h6>
                        <span class="status ${st.cls}">${st.text}</span>
                    </div>
                    <p>${formatRupiah(tx.harga || tx.nominal || tx.amount || tx.total || 0)} • ${formatDate(tx.tanggal || tx.created_at || tx.waktu || '') || '-'}</p>
                    <small>ID Trx: ${tx.nomor_pembayaran || tx.id_trx || tx.invoice || tx.id || '-'}</small>
                </div>
            `;

            if (card.dataset.link) {
                card.style.cursor = 'pointer';
                card.addEventListener('click', () => window.open(card.dataset.link, '_blank'));
            }

            container.appendChild(card);
        });
    });

    applyAllFilters();
}

function applyAllFilters() {
    const container = document.getElementById('history-list');
    if (!container) return;

    const selectedDate = document.getElementById('datePickerDropdown') ? document.getElementById('datePickerDropdown').value : '';
    const selectedMonth = document.getElementById('monthPickerDropdown') ? document.getElementById('monthPickerDropdown').value : '';
    const keywordInput = document.querySelector('.search-bar input');
    const keyword = keywordInput ? keywordInput.value.toLowerCase() : '';
    const activeTab = document.querySelector('.history-filter-btn.active');
    const type = activeTab ? activeTab.textContent.trim().toLowerCase() : 'semua';

    const cards = container.querySelectorAll('.transaction-card');
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        let show = true;

        if (type === 'berhasil') show = text.includes('sukses') || text.includes('lunas') || text.includes('berhasil');
        else if (type === 'pending') show = text.includes('pending') || text.includes('proses');
        else if (type === 'gagal') show = text.includes('gagal') || text.includes('batal');

        if (show && keyword) show = text.includes(keyword);

        if (show && (selectedDate || selectedMonth)) {
            const dateText = card.previousElementSibling && card.previousElementSibling.classList.contains('date-header')
                ? card.previousElementSibling.textContent
                : '';
            if (selectedDate) show = dateText.includes(selectedDate);
            if (selectedMonth) show = true;
        }

        card.style.display = show ? 'flex' : 'none';
    });

    hideEmptyDateHeaders();
}

function hideEmptyDateHeaders() {
    const container = document.getElementById('history-list');
    if (!container) return;

    const headers = container.querySelectorAll('h5.date-header');
    headers.forEach(header => {
        let next = header.nextElementSibling;
        let hasVisible = false;
        while (next && !next.classList.contains('date-header')) {
            if (next.style.display !== 'none') {
                hasVisible = true;
                break;
            }
            next = next.nextElementSibling;
        }
        header.style.display = hasVisible ? 'block' : 'none';
    });
}

function loadDebts() {
    debts = JSON.parse(localStorage.getItem(DEBT_KEY) || '[]');
}

function saveDebtsToStorage() {
    localStorage.setItem(DEBT_KEY, JSON.stringify(debts));
}

function clearDebtForm() {
    document.getElementById('debt-name').value = '';
    document.getElementById('debt-phone').value = '';
    document.getElementById('debt-amount').value = '';
    document.getElementById('debt-note').value = '';
    document.getElementById('debt-due').value = '';
}

function saveDebt() {
    const name = document.getElementById('debt-name').value.trim();
    const phone = document.getElementById('debt-phone').value.trim();
    const amount = document.getElementById('debt-amount').value.trim();
    const note = document.getElementById('debt-note').value.trim();
    const due = document.getElementById('debt-due').value;

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

function editDebt(id) {
    const debt = debts.find(item => item.id === id);
    if (!debt) return;
    const name = prompt('Nama pelanggan:', debt.name);
    if (name === null) return;
    const phone = prompt('Nomor HP:', debt.phone);
    if (phone === null) return;
    const amount = prompt('Nominal hutang:', debt.amount);
    if (amount === null) return;
    const note = prompt('Catatan:', debt.note);
    if (note === null) return;
    const due = prompt('Tanggal jatuh tempo (YYYY-MM-DD):', debt.due);
    if (due === null) return;

    debt.name = name.trim();
    debt.phone = phone.trim();
    debt.amount = Number(amount);
    debt.note = note.trim();
    debt.due = due;
    saveDebtsToStorage();
    renderDebts();
}

function deleteDebt(id) {
    if (!confirm('Hapus data hutang ini?')) return;
    debts = debts.filter(item => item.id !== id);
    saveDebtsToStorage();
    renderDebts();
}

function markDebtPaid(id) {
    const debt = debts.find(item => item.id === id);
    if (!debt) return;
    const paid = prompt('Masukkan nominal pembayaran:', debt.amount - debt.paid);
    if (paid === null) return;
    debt.paid += Number(paid);
    if (debt.paid > debt.amount) debt.paid = debt.amount;
    saveDebtsToStorage();
    renderDebts();
}

function renderDebts() {
    const list = document.getElementById('debt-list');
    const totalEl = document.getElementById('debt-total');
    const paidEl = document.getElementById('debt-paid');
    const remainingEl = document.getElementById('debt-remaining');
    const countEl = document.getElementById('debt-count');

    if (!list) return;

    if (!debts.length) {
        list.innerHTML = '<div class="informasi-item"><i class="material-icons-outlined">inbox</i><span><h6>Belum ada data hutang</h6><p>Tambahkan data hutang pertama kamu.</p></span></div>';
    } else {
        list.innerHTML = debts.map(item => {
            const remaining = item.amount - item.paid;
            const statusClass = remaining <= 0 ? 'success' : item.paid > 0 ? 'pending' : 'failed';
            const statusText = remaining <= 0 ? 'Lunas' : item.paid > 0 ? 'Sebagian' : 'Belum Bayar';
            return `<div class="history-item"><div class="history-icon ${statusClass}"><i class="material-icons-outlined">person</i></div><div class="history-content"><div class="history-top"><h6>${item.name}</h6><span class="status ${statusClass}">${statusText}</span></div><p>${item.note}</p><small>${formatRupiah(item.amount)} • Bayar ${formatRupiah(item.paid)} • Sisa ${formatRupiah(remaining)}</small><small>HP: ${item.phone} • Jatuh tempo: ${item.due}</small><div class="account-action-list" style="margin-top:10px;"><button class="account-action-btn" onclick="markDebtPaid(${item.id})"><i class="material-icons-outlined">payments</i><span>Bayar</span></button><button class="account-action-btn" onclick="editDebt(${item.id})"><i class="material-icons-outlined">edit</i><span>Edit</span></button><button class="account-action-btn" onclick="deleteDebt(${item.id})"><i class="material-icons-outlined">delete</i><span>Hapus</span></button></div></div></div>`;
        }).join('');
    }

    const total = debts.reduce((sum, item) => sum + item.amount, 0);
    const paid = debts.reduce((sum, item) => sum + item.paid, 0);
    const remaining = total - paid;

    if (totalEl) totalEl.textContent = formatRupiah(total);
    if (paidEl) paidEl.textContent = formatRupiah(paid);
    if (remainingEl) remainingEl.textContent = formatRupiah(remaining);
    if (countEl) countEl.textContent = debts.length + ' Orang';
}

async function loadMutasiSaldo() {
    const list = document.getElementById('mutasi-list');
    if (list) list.innerHTML = '<div class="informasi-item"><i class="material-icons-outlined">sync</i><span><h6>Memuat mutasi...</h6><p>Mohon tunggu sebentar.</p></span></div>';
}

document.querySelectorAll('.history-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.history-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyAllFilters();
    });
});

document.querySelectorAll('.search-bar input').forEach(input => {
    input.addEventListener('focus', () => input.parentElement.classList.add('focused'));
    input.addEventListener('blur', () => input.parentElement.classList.remove('focused'));
    input.addEventListener('input', applyAllFilters);
});

function setTopupAmount(amount) {
    const el = document.getElementById('topup-amount');
    if (el) el.value = amount;
}

function submitTopup() {
    alert('Fitur top up siap diproses.');
}

getUcapan();
loadDebts();
renderDebts();

if (location.hash) openSection(location.hash.replace('#', ''));
if (isVisible && saldoElement) saldoElement.textContent = formatRupiah(saldoAsli).replace('Rp ', '');
updatePinDots();

document.addEventListener('DOMContentLoaded', () => {
    if (location.hash.replace('#', '') === 'transaksi') {
        loadAllTransactions(1);
    }
});