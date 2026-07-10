const navItems = document.querySelectorAll('.nav-item');
const saldoElement = document.getElementById('saldo-member');
const toggleIcon = document.getElementById('toggle-saldo');
const akunSaldoElement = document.getElementById('akun-saldo');
const saldoAsli = saldoElement ? saldoElement.getAttribute('data-saldo') : '0';
let isVisible = false;
let pinValue = '';

const DEBT_KEY = 'catatan_hutang_data';
let debts = [];

function openSection(id) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) target.classList.add('active');

    navItems.forEach(btn => btn.classList.remove('active'));
    const map = { beranda: 0, transaksi: 1, rekap: 2, informasi: 3, akun: 4 };
    if (navItems[map[id]]) navItems[map[id]].classList.add('active');

    window.location.hash = id;
    if (id === 'Chut') renderDebts();
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

if (toggleIcon && saldoElement) {
    toggleIcon.addEventListener('click', () => {
        isVisible = !isVisible;
        if (isVisible) {
            saldoElement.textContent = formatRupiah(saldoAsli).replace('Rp ', '');
            if (akunSaldoElement) akunSaldoElement.textContent = formatRupiah(saldoAsli).replace('Rp ', '');
            toggleIcon.textContent = 'visibility_off';
        } else {
            saldoElement.textContent = '*****';
            if (akunSaldoElement) akunSaldoElement.textContent = '*****';
            toggleIcon.textContent = 'visibility';
        }
    });
}

function getUcapan() {
    const jam = new Date().getHours();
    let ucapan = '';
    if (jam >= 4 && jam < 11) ucapan = 'Selamat Pagi';
    else if (jam >= 11 && jam < 15) ucapan = 'Selamat Siang';
    else if (jam >= 15 && jam < 18) ucapan = 'Selamat Sore';
    else ucapan = 'Selamat Malam';
    const ucapanEl = document.getElementById('ucapan');
    if (ucapanEl) ucapanEl.textContent = ucapan;
}

function updatePinDots() {
    document.querySelectorAll('.pin-dot').forEach((dot, index) => {
        dot.classList.toggle('filled', index < pinValue.length);
    });
}

function addPin(num) {
    if (pinValue.length >= 6) return;
    pinValue += num;
    updatePinDots();
}

function backspacePin() {
    pinValue = pinValue.slice(0, -1);
    updatePinDots();
}

function clearPin() {
    pinValue = '';
    updatePinDots();
}

function confirmPin() {
    alert('PIN dimasukkan: ' + pinValue);
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

    const debt = {
        id: Date.now(),
        name,
        phone,
        amount: Number(amount),
        note,
        due,
        paid: 0
    };

    debts.unshift(debt);
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
    alert('Data hutang berhasil diubah.');
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

            return `
                <div class="history-item">
                    <div class="history-icon ${statusClass}"><i class="material-icons-outlined">person</i></div>
                    <div class="history-content">
                        <div class="history-top">
                            <h6>${item.name}</h6>
                            <span class="status ${statusClass}">${statusText}</span>
                        </div>
                        <p>${item.note}</p>
                        <small>${formatRupiah(item.amount)} • Bayar ${formatRupiah(item.paid)} • Sisa ${formatRupiah(remaining)}</small>
                        <small>HP: ${item.phone} • Jatuh tempo: ${item.due}</small>
                        <div class="account-action-list" style="margin-top:10px;">
                            <button class="account-action-btn" onclick="markDebtPaid(${item.id})"><i class="material-icons-outlined">payments</i><span>Bayar</span></button>
                            <button class="account-action-btn" onclick="editDebt(${item.id})"><i class="material-icons-outlined">edit</i><span>Edit</span></button>
                            <button class="account-action-btn" onclick="deleteDebt(${item.id})"><i class="material-icons-outlined">delete</i><span>Hapus</span></button>
                        </div>
                    </div>
                </div>
            `;
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

document.querySelectorAll('.history-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.history-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

document.querySelectorAll('.search-bar input').forEach(input => {
    input.addEventListener('focus', () => input.parentElement.classList.add('focused'));
    input.addEventListener('blur', () => input.parentElement.classList.remove('focused'));
});

getUcapan();
loadDebts();
renderDebts();

if (location.hash) openSection(location.hash.replace('#', ''));
if (isVisible && saldoElement) saldoElement.textContent = formatRupiah(saldoAsli).replace('Rp ', '');
updatePinDots();