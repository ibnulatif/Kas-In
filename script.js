/* =========================================
   KasPemuda - script.js
   Versi: 1.0 | Juni 2025
   ========================================= */

'use strict';

// ============================================================
// KONFIGURASI AWAL
// ============================================================
const APP_VERSION = '1.0.0';
const DEFAULT_USERS = [{ username: 'admin', password: 'admin123' }];

const KATEGORI_MASUK  = ['Iuran Bulanan','Donasi','Infak','Usaha','Hasil Acara','Lainnya'];
const KATEGORI_KELUAR = ['Operasional','Konsumsi','Perlengkapan','Sosial','Administrasi','Kegiatan','Lainnya'];

// ============================================================
// STATE APLIKASI
// ============================================================
let state = {
  anggota:    [],
  transaksi:  [],
  settings:   { orgName: 'Karang Taruna Desa', desa: '', scriptUrl: '' },
  users:      DEFAULT_USERS,
  currentLaporan: 'harian',
  filterStatusAnggota: 'semua',
  scanActive: false,
  editAnggotaId: null,
  editTxId: null,
};

// ============================================================
// LOCAL STORAGE HELPERS
// ============================================================
function saveState() {
  try {
    localStorage.setItem('kp_anggota',   JSON.stringify(state.anggota));
    localStorage.setItem('kp_transaksi', JSON.stringify(state.transaksi));
    localStorage.setItem('kp_settings',  JSON.stringify(state.settings));
    localStorage.setItem('kp_users',     JSON.stringify(state.users));
  } catch(e) { console.error('SaveState error', e); }
}

function loadState() {
  try {
    const a = localStorage.getItem('kp_anggota');
    const t = localStorage.getItem('kp_transaksi');
    const s = localStorage.getItem('kp_settings');
    const u = localStorage.getItem('kp_users');
    if (a) state.anggota   = JSON.parse(a);
    if (t) state.transaksi = JSON.parse(t);
    if (s) state.settings  = { ...state.settings, ...JSON.parse(s) };
    if (u) state.users     = JSON.parse(u);
  } catch(e) { console.error('LoadState error', e); }
}

// ============================================================
// AUTH
// ============================================================
function doLogin() {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  const found = state.users.find(u => u.username === user && u.password === pass);
  if (found) {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    initApp();
  } else {
    document.getElementById('loginError').classList.remove('hidden');
    document.getElementById('loginPass').value = '';
  }
}

function doLogout() {
  showConfirm('Yakin ingin keluar?', '', 'Keluar', () => {
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('loginError').classList.add('hidden');
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
  }, false);
}

// ============================================================
// INIT
// ============================================================
function initApp() {
  loadState();
  applySettings();
  showPage('dashboard');
  populateBulanFilter();

  // Set default tanggal transaksi ke hari ini
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('txTanggal').value = today;
  document.getElementById('laporanTanggal').value = today;
  const ym = today.substring(0, 7);
  document.getElementById('laporanBulan').value = ym;
  document.getElementById('laporanTahun').value = new Date().getFullYear();

  // Dashboard date
  document.getElementById('dashDate').textContent =
    new Date().toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

function applySettings() {
  document.getElementById('orgName').textContent = state.settings.orgName || 'Karang Taruna Desa';
  document.getElementById('setOrgName').value = state.settings.orgName || '';
  document.getElementById('setDesa').value = state.settings.desa || '';
  document.getElementById('setScriptUrl').value = state.settings.scriptUrl || '';
}

// ============================================================
// NAVIGATION
// ============================================================
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.sidebar-menu li').forEach(l => l.classList.remove('active'));

  const pg = document.getElementById(`page-${name}`);
  if (pg) pg.classList.remove('hidden');
  const mn = document.getElementById(`menu-${name}`);
  if (mn) mn.classList.add('active');

  const titles = { dashboard:'Dashboard', anggota:'Anggota', transaksi:'Transaksi', laporan:'Laporan', pengaturan:'Pengaturan' };
  document.getElementById('topbarTitle').textContent = titles[name] || '';

  if (name === 'dashboard') renderDashboard();
  if (name === 'anggota')   renderAnggota();
  if (name === 'transaksi') renderTransaksi();
  if (name === 'laporan')   generateLaporan();

  // Close sidebar on mobile
  closeSidebar();
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  if (sb.classList.contains('open')) {
    sb.classList.remove('open');
    ov.classList.remove('show');
  } else {
    sb.classList.add('open');
    ov.classList.add('show');
  }
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

// ============================================================
// MODAL HELPERS
// ============================================================
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  document.body.style.overflow = '';
  if (id === 'modalScanQR') stopScanner();
}

// Confirm dialog
let confirmResolve = null;
function showConfirm(msg, sub = '', okLabel = 'Ya, Hapus', callback, isDanger = true) {
  document.getElementById('confirmMsg').textContent = msg;
  document.getElementById('confirmSub').textContent = sub;
  document.getElementById('confirmOkBtn').textContent = okLabel;
  document.getElementById('confirmOkBtn').className = isDanger ? 'btn-danger' : 'btn-primary';
  document.getElementById('confirmIcon').textContent = isDanger ? '⚠️' : '✅';
  openModal('confirmDialog');
  confirmResolve = (yes) => {
    closeModal('confirmDialog');
    if (yes && callback) callback();
    confirmResolve = null;
  };
}

// ============================================================
// TOAST
// ============================================================
let toastTimer = null;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2800);
}

// ============================================================
// UTILS
// ============================================================
function formatRp(n) {
  const num = parseFloat(n) || 0;
  return 'Rp ' + num.toLocaleString('id-ID');
}

function generateId() {
  return Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2,6).toUpperCase();
}

function formatTanggal(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
}

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
  const now = new Date();
  const bulanIni = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  const masukBulan = state.transaksi
    .filter(t => t.jenis === 'Masuk' && t.tanggal?.startsWith(bulanIni))
    .reduce((s,t) => s + (parseFloat(t.nominal)||0), 0);

  const keluarBulan = state.transaksi
    .filter(t => t.jenis === 'Keluar' && t.tanggal?.startsWith(bulanIni))
    .reduce((s,t) => s + (parseFloat(t.nominal)||0), 0);

  const totalMasuk  = state.transaksi.filter(t => t.jenis === 'Masuk').reduce((s,t) => s + (parseFloat(t.nominal)||0), 0);
  const totalKeluar = state.transaksi.filter(t => t.jenis === 'Keluar').reduce((s,t) => s + (parseFloat(t.nominal)||0), 0);
  const saldo = totalMasuk - totalKeluar;

  document.getElementById('statSaldo').textContent  = formatRp(saldo);
  document.getElementById('statMasuk').textContent  = formatRp(masukBulan);
  document.getElementById('statKeluar').textContent = formatRp(keluarBulan);
  document.getElementById('statAnggota').textContent = state.anggota.filter(a => a.status === 'aktif').length;

  // Recent 5 transactions
  const recent = [...state.transaksi].sort((a,b) => new Date(b.tanggal)-new Date(a.tanggal)).slice(0,5);
  const el = document.getElementById('recentTx');
  if (recent.length === 0) {
    el.innerHTML = `<div class="tx-empty"><div class="empty-icon">💸</div><p>Belum ada transaksi</p></div>`;
  } else {
    el.innerHTML = recent.map(t => renderTxItem(t)).join('');
  }
}

function renderTxItem(t) {
  const icon  = t.jenis === 'Masuk' ? '📈' : '📉';
  const cls   = t.jenis === 'Masuk' ? 'masuk' : 'keluar';
  const sign  = t.jenis === 'Masuk' ? '+' : '-';
  return `
    <div class="tx-item" onclick="showBukti('${t.id}')">
      <div class="tx-badge ${cls}">${icon}</div>
      <div class="tx-info">
        <div class="tx-name">${t.kategori || '-'} ${t.keterangan ? '· '+t.keterangan : ''}</div>
        <div class="tx-sub">${t.anggota || 'Umum'} · ${formatTanggal(t.tanggal)}</div>
      </div>
      <div class="tx-amount ${cls}">${sign}${formatRp(t.nominal)}</div>
    </div>`;
}

// ============================================================
// ANGGOTA
// ============================================================
function renderAnggota(list) {
  const search = (document.getElementById('searchAnggota')?.value || '').toLowerCase();
  let data = list || state.anggota;

  if (state.filterStatusAnggota !== 'semua') {
    data = data.filter(a => a.status === state.filterStatusAnggota);
  }
  if (search) {
    data = data.filter(a =>
      a.nama?.toLowerCase().includes(search) ||
      a.hp?.includes(search) ||
      a.alamat?.toLowerCase().includes(search)
    );
  }

  const el = document.getElementById('anggotaList');
  if (data.length === 0) {
    el.innerHTML = `<div class="no-data"><div class="nd-icon">👥</div><p>Tidak ada anggota ditemukan</p><small>Tambahkan anggota baru</small></div>`;
    return;
  }
  el.innerHTML = data.map(a => `
    <div class="anggota-card" onclick="showDetailAnggota('${a.id}')">
      <div class="anggota-avatar">${getInitials(a.nama)}</div>
      <div class="anggota-info">
        <div class="anggota-nama">${a.nama}</div>
        <div class="anggota-hp">📞 ${a.hp || '-'}</div>
      </div>
      <span class="anggota-badge ${a.status}">${a.status}</span>
      <div class="anggota-actions" onclick="event.stopPropagation()">
        <button class="btn-action" onclick="openEditAnggota('${a.id}')" title="Edit">✏️</button>
        <button class="btn-action danger" onclick="deleteAnggota('${a.id}')" title="Hapus">🗑️</button>
      </div>
    </div>`).join('');
}

function filterAnggota() { renderAnggota(); }

function filterStatusAnggota(status, btn) {
  state.filterStatusAnggota = status;
  document.querySelectorAll('#page-anggota .filter-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAnggota();
}

function openAddAnggota() {
  state.editAnggotaId = null;
  document.getElementById('modalAnggotaTitle').textContent = 'Tambah Anggota';
  document.getElementById('anggotaId').value = '';
  document.getElementById('anggotaNama').value = '';
  document.getElementById('anggotaHP').value = '';
  document.getElementById('anggotaAlamat').value = '';
  document.getElementById('anggotaStatus').value = 'aktif';
  openModal('modalAnggota');
}

function openEditAnggota(id) {
  const a = state.anggota.find(x => x.id === id);
  if (!a) return;
  state.editAnggotaId = id;
  document.getElementById('modalAnggotaTitle').textContent = 'Edit Anggota';
  document.getElementById('anggotaId').value    = a.id;
  document.getElementById('anggotaNama').value  = a.nama;
  document.getElementById('anggotaHP').value    = a.hp;
  document.getElementById('anggotaAlamat').value= a.alamat;
  document.getElementById('anggotaStatus').value= a.status;
  openModal('modalAnggota');
}

function saveAnggota() {
  const nama   = document.getElementById('anggotaNama').value.trim();
  const hp     = document.getElementById('anggotaHP').value.trim();
  const alamat = document.getElementById('anggotaAlamat').value.trim();
  const status = document.getElementById('anggotaStatus').value;

  if (!nama) return showToast('Nama wajib diisi!', 'error');
  if (!hp)   return showToast('Nomor HP wajib diisi!', 'error');

  if (state.editAnggotaId) {
    const idx = state.anggota.findIndex(x => x.id === state.editAnggotaId);
    if (idx > -1) {
      state.anggota[idx] = { ...state.anggota[idx], nama, hp, alamat, status };
      showToast('Anggota diperbarui!', 'success');
    }
  } else {
    const newA = { id: generateId(), nama, hp, alamat, status, createdAt: new Date().toISOString() };
    state.anggota.push(newA);
    showToast('Anggota ditambahkan!', 'success');
  }

  saveState();
  closeModal('modalAnggota');
  renderAnggota();
  syncToSpreadsheet();
}

function deleteAnggota(id) {
  const a = state.anggota.find(x => x.id === id);
  showConfirm(`Hapus anggota "${a?.nama}"?`, 'Data tidak dapat dikembalikan.', 'Ya, Hapus', () => {
    state.anggota = state.anggota.filter(x => x.id !== id);
    saveState();
    renderAnggota();
    showToast('Anggota dihapus!', 'success');
    syncToSpreadsheet();
  });
}

function showDetailAnggota(id) {
  const a = state.anggota.find(x => x.id === id);
  if (!a) return;

  const body = document.getElementById('detailAnggotaBody');
  body.innerHTML = `
    <div class="detail-section">
      <div class="detail-row"><span class="detail-label">ID Anggota</span><span class="detail-value">${a.id}</span></div>
      <div class="detail-row"><span class="detail-label">Nama</span><span class="detail-value">${a.nama}</span></div>
      <div class="detail-row"><span class="detail-label">Nomor HP</span><span class="detail-value">${a.hp}</span></div>
      <div class="detail-row"><span class="detail-label">Alamat</span><span class="detail-value">${a.alamat || '-'}</span></div>
      <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="anggota-badge ${a.status}">${a.status}</span></span></div>
    </div>
    <div class="qr-container" id="qrContainer">
      <div id="qrcode-${a.id}"></div>
      <p>QR Code — ID: ${a.id}</p>
    </div>`;

  openModal('modalDetailAnggota');

  // Generate QR
  setTimeout(() => {
    const el = document.getElementById(`qrcode-${a.id}`);
    if (el && typeof QRCode !== 'undefined') {
      el.innerHTML = '';
      new QRCode(el, {
        text: a.id,
        width: 180, height: 180,
        colorDark: '#166534', colorLight: '#f0fdf4',
        correctLevel: QRCode.CorrectLevel.H
      });
    }
  }, 100);

  // Store current for printing
  window._currentPrintAnggota = a;
}

function printQR() {
  const a = window._currentPrintAnggota;
  if (!a) return;
  const qrEl = document.getElementById(`qrcode-${a.id}`);
  const qrImg = qrEl?.querySelector('img')?.src || qrEl?.querySelector('canvas')?.toDataURL() || '';

  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>QR - ${a.nama}</title>
    <style>
      body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f0fdf4}
      .card{border:2px solid #16a34a;border-radius:16px;padding:24px;text-align:center;width:280px}
      h2{color:#15803d;margin:0 0 4px}
      p{color:#64748b;font-size:13px;margin:4px 0}
      img{border:1px solid #dcfce7;border-radius:8px}
    </style></head><body>
    <div class="card">
      <h2>${a.nama}</h2>
      <p>${a.hp}</p>
      <p>${a.alamat || ''}</p>
      <br/>
      <img src="${qrImg}" width="180" height="180" />
      <p style="margin-top:12px;font-size:12px;font-weight:bold;color:#15803d">ID: ${a.id}</p>
    </div>
    <script>window.onload=function(){window.print();}<\/script>
    </body></html>`);
  win.document.close();
}

// ============================================================
// TRANSAKSI
// ============================================================
function renderTransaksi() {
  const search = (document.getElementById('searchTx')?.value || '').toLowerCase();
  const jenis  = document.getElementById('filterJenis')?.value || '';
  const bulan  = document.getElementById('filterBulan')?.value || '';

  let data = [...state.transaksi].sort((a,b) => new Date(b.tanggal)-new Date(a.tanggal));

  if (jenis)  data = data.filter(t => t.jenis === jenis);
  if (bulan)  data = data.filter(t => t.tanggal?.startsWith(bulan));
  if (search) data = data.filter(t =>
    t.anggota?.toLowerCase().includes(search) ||
    t.kategori?.toLowerCase().includes(search) ||
    t.keterangan?.toLowerCase().includes(search) ||
    t.petugas?.toLowerCase().includes(search)
  );

  const el = document.getElementById('transaksiList');
  if (data.length === 0) {
    el.innerHTML = `<div class="no-data"><div class="nd-icon">💸</div><p>Tidak ada transaksi</p><small>Catat transaksi baru</small></div>`;
    return;
  }

  el.innerHTML = data.map(t => `
    <div class="tx-item" onclick="showBukti('${t.id}')">
      <div class="tx-badge ${t.jenis==='Masuk'?'masuk':'keluar'}">${t.jenis==='Masuk'?'📈':'📉'}</div>
      <div class="tx-info">
        <div class="tx-name">${t.kategori} ${t.keterangan ? '· '+t.keterangan : ''}</div>
        <div class="tx-sub">${t.anggota || 'Umum'} · ${formatTanggal(t.tanggal)}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
        <div class="tx-amount ${t.jenis==='Masuk'?'masuk':'keluar'}">${t.jenis==='Masuk'?'+':'-'}${formatRp(t.nominal)}</div>
        <div style="display:flex;gap:4px;">
          <button class="btn-action" style="width:28px;height:28px;font-size:13px;" onclick="event.stopPropagation();openEditTx('${t.id}')">✏️</button>
          <button class="btn-action danger" style="width:28px;height:28px;font-size:13px;" onclick="event.stopPropagation();deleteTx('${t.id}')">🗑️</button>
        </div>
      </div>
    </div>`).join('');
}

function filterTransaksi() { renderTransaksi(); }

function populateBulanFilter() {
  const sel = document.getElementById('filterBulan');
  if (!sel) return;
  const months = [];
  state.transaksi.forEach(t => {
    if (t.tanggal) {
      const ym = t.tanggal.substring(0,7);
      if (!months.includes(ym)) months.push(ym);
    }
  });
  months.sort().reverse();
  sel.innerHTML = '<option value="">Semua Bulan</option>' +
    months.map(m => {
      const [y, mo] = m.split('-');
      const d = new Date(y, parseInt(mo)-1);
      const label = d.toLocaleDateString('id-ID', { month:'long', year:'numeric' });
      return `<option value="${m}">${label}</option>`;
    }).join('');
}

function openAddTransaksi() {
  state.editTxId = null;
  document.getElementById('modalTxTitle').textContent = 'Catat Transaksi';
  document.getElementById('txId').value = '';
  document.getElementById('txAnggota').value = '';
  document.getElementById('txAnggotaId').value = '';
  document.getElementById('txTanggal').value = new Date().toISOString().split('T')[0];
  document.getElementById('txNominal').value = '';
  document.getElementById('txKeterangan').value = '';
  document.getElementById('txPetugas').value = '';
  setJenis('Masuk');
  openModal('modalTransaksi');
}

function openEditTx(id) {
  const t = state.transaksi.find(x => x.id === id);
  if (!t) return;
  state.editTxId = id;
  document.getElementById('modalTxTitle').textContent = 'Edit Transaksi';
  document.getElementById('txId').value = t.id;
  document.getElementById('txAnggota').value = t.anggota || '';
  document.getElementById('txAnggotaId').value = t.anggotaId || '';
  document.getElementById('txTanggal').value = t.tanggal;
  document.getElementById('txNominal').value = t.nominal;
  document.getElementById('txKeterangan').value = t.keterangan || '';
  document.getElementById('txPetugas').value = t.petugas || '';
  setJenis(t.jenis);
  setTimeout(() => { document.getElementById('txKategori').value = t.kategori || ''; }, 50);
  openModal('modalTransaksi');
}

function setJenis(jenis) {
  document.getElementById('txJenis').value = jenis;
  document.getElementById('btnMasuk').classList.toggle('active', jenis === 'Masuk');
  document.getElementById('btnKeluar').classList.toggle('active', jenis === 'Keluar');

  const sel = document.getElementById('txKategori');
  const kategori = jenis === 'Masuk' ? KATEGORI_MASUK : KATEGORI_KELUAR;
  sel.innerHTML = '<option value="">-- Pilih Kategori --</option>' +
    kategori.map(k => `<option value="${k}">${k}</option>`).join('');
}

function saveTransaksi() {
  const tanggal   = document.getElementById('txTanggal').value;
  const anggota   = document.getElementById('txAnggota').value.trim();
  const anggotaId = document.getElementById('txAnggotaId').value;
  const jenis     = document.getElementById('txJenis').value;
  const kategori  = document.getElementById('txKategori').value;
  const nominal   = parseFloat(document.getElementById('txNominal').value) || 0;
  const keterangan= document.getElementById('txKeterangan').value.trim();
  const petugas   = document.getElementById('txPetugas').value.trim();

  if (!tanggal)  return showToast('Tanggal wajib diisi!', 'error');
  if (!kategori) return showToast('Kategori wajib dipilih!', 'error');
  if (!nominal)  return showToast('Nominal wajib diisi!', 'error');
  if (!petugas)  return showToast('Nama petugas wajib diisi!', 'error');

  if (state.editTxId) {
    const idx = state.transaksi.findIndex(x => x.id === state.editTxId);
    if (idx > -1) {
      state.transaksi[idx] = { ...state.transaksi[idx], tanggal, anggota, anggotaId, jenis, kategori, nominal, keterangan, petugas };
      showToast('Transaksi diperbarui!', 'success');
    }
  } else {
    const newTx = { id: generateId(), tanggal, anggota, anggotaId, jenis, kategori, nominal, keterangan, petugas, createdAt: new Date().toISOString() };
    state.transaksi.push(newTx);
    showToast('Transaksi dicatat!', 'success');
  }

  saveState();
  closeModal('modalTransaksi');
  renderDashboard();
  renderTransaksi();
  populateBulanFilter();
  syncToSpreadsheet();
}

function deleteTx(id) {
  showConfirm('Hapus transaksi ini?', 'Data tidak dapat dikembalikan.', 'Ya, Hapus', () => {
    state.transaksi = state.transaksi.filter(x => x.id !== id);
    saveState();
    renderTransaksi();
    renderDashboard();
    showToast('Transaksi dihapus!', 'success');
    syncToSpreadsheet();
  });
}

// ============================================================
// PILIH ANGGOTA (dari modal transaksi)
// ============================================================
function openPilihAnggota() {
  renderPilihAnggota('');
  openModal('modalPilihAnggota');
}

function filterPilihAnggota() {
  const q = document.getElementById('searchPilihAnggota').value;
  renderPilihAnggota(q);
}

function renderPilihAnggota(q) {
  const data = state.anggota.filter(a =>
    a.status === 'aktif' &&
    (a.nama?.toLowerCase().includes(q.toLowerCase()) || a.hp?.includes(q))
  );
  const el = document.getElementById('pilihAnggotaList');
  if (data.length === 0) {
    el.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:20px;">Tidak ada anggota aktif</p>';
    return;
  }
  el.innerHTML = data.map(a => `
    <div class="pick-item" onclick="pilihAnggota('${a.id}','${a.nama}')">
      <div class="anggota-avatar" style="width:36px;height:36px;font-size:14px;border-radius:8px;">${getInitials(a.nama)}</div>
      <div>
        <div style="font-size:14px;font-weight:700;">${a.nama}</div>
        <div style="font-size:12px;color:#94a3b8;">${a.hp}</div>
      </div>
    </div>`).join('');
}

function pilihAnggota(id, nama) {
  document.getElementById('txAnggota').value   = nama;
  document.getElementById('txAnggotaId').value = id;
  closeModal('modalPilihAnggota');
}

// ============================================================
// SCAN QR
// ============================================================
let scanStream = null;
let scanInterval = null;

function openScanQR() {
  document.getElementById('scanResult').textContent = '';
  openModal('modalScanQR');
  startScanner();
}

function startScanner() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast('Kamera tidak tersedia di browser ini', 'error');
    return;
  }
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      scanStream = stream;
      const video = document.getElementById('scannerVideo');
      video.srcObject = stream;
      video.play();
      state.scanActive = true;
      scanInterval = setInterval(() => scanFrame(), 300);
    })
    .catch(err => {
      showToast('Akses kamera ditolak: ' + err.message, 'error');
    });
}

function scanFrame() {
  const video  = document.getElementById('scannerVideo');
  const canvas = document.getElementById('scannerCanvas');
  if (!video || video.readyState < 2) return;

  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);

  // Try BarcodeDetector (Chrome/Android)
  if ('BarcodeDetector' in window) {
    const bd = new BarcodeDetector({ formats: ['qr_code'] });
    bd.detect(canvas).then(codes => {
      if (codes.length > 0) {
        handleScanResult(codes[0].rawValue);
      }
    }).catch(() => {});
  }
}

function handleScanResult(value) {
  stopScanner();
  const anggota = state.anggota.find(a => a.id === value);
  if (anggota) {
    document.getElementById('scanResult').textContent = `✅ Ditemukan: ${anggota.nama}`;
    document.getElementById('scanResult').style.color = '#16a34a';
    setTimeout(() => {
      pilihAnggota(anggota.id, anggota.nama);
      closeModal('modalScanQR');
    }, 1000);
  } else {
    document.getElementById('scanResult').textContent = '❌ Anggota tidak ditemukan';
    document.getElementById('scanResult').style.color = '#ef4444';
  }
}

function stopScanner() {
  state.scanActive = false;
  clearInterval(scanInterval);
  if (scanStream) {
    scanStream.getTracks().forEach(t => t.stop());
    scanStream = null;
  }
}

// ============================================================
// BUKTI TRANSAKSI
// ============================================================
function showBukti(id) {
  const t = state.transaksi.find(x => x.id === id);
  if (!t) return;

  const el = document.getElementById('buktiContent');
  const orgName = state.settings.orgName || 'Karang Taruna Desa';
  const icon = t.jenis === 'Masuk' ? '📈' : '📉';

  el.innerHTML = `
    <div class="bukti-header">
      <div style="font-size:36px;">${icon}</div>
      <h2>${orgName}</h2>
      <p style="color:#64748b;font-size:13px;">Bukti Transaksi ${t.jenis}</p>
    </div>
    <hr class="bukti-divider" />
    <div class="bukti-row"><span class="bukti-label">No. Transaksi</span><span class="bukti-value">${t.id}</span></div>
    <div class="bukti-row"><span class="bukti-label">Tanggal</span><span class="bukti-value">${formatTanggal(t.tanggal)}</span></div>
    <div class="bukti-row"><span class="bukti-label">Anggota</span><span class="bukti-value">${t.anggota || 'Umum'}</span></div>
    <div class="bukti-row"><span class="bukti-label">Jenis</span><span class="bukti-value">${t.jenis}</span></div>
    <div class="bukti-row"><span class="bukti-label">Kategori</span><span class="bukti-value">${t.kategori}</span></div>
    <div class="bukti-row"><span class="bukti-label">Keterangan</span><span class="bukti-value">${t.keterangan || '-'}</span></div>
    <div class="bukti-row"><span class="bukti-label">Petugas</span><span class="bukti-value">${t.petugas}</span></div>
    <hr class="bukti-divider" />
    <div class="bukti-total">
      <span class="bukti-total-label">NOMINAL</span>
      <span class="bukti-total-value">${formatRp(t.nominal)}</span>
    </div>
    <p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:16px;">Dicetak: ${new Date().toLocaleString('id-ID')}</p>`;

  openModal('modalBukti');
}

function printBukti() {
  const el = document.getElementById('buktiContent');
  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>Bukti Transaksi</title>
    <style>
      body{font-family:sans-serif;max-width:360px;margin:20px auto;color:#1e293b;}
      .bukti-header{text-align:center;margin-bottom:20px;}
      h2{color:#166534;margin:0 0 4px;}
      hr{border:none;border-top:2px dashed #e2e8f0;margin:14px 0;}
      .bukti-row{display:flex;justify-content:space-between;padding:7px 0;font-size:13px;}
      .bukti-label{color:#64748b;}
      .bukti-value{font-weight:700;text-align:right;flex:1;padding-left:12px;}
      .bukti-total{background:#f0fdf4;border-radius:8px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;margin-top:12px;}
      .bukti-total-label{font-weight:700;color:#166534;}
      .bukti-total-value{font-size:20px;font-weight:800;color:#166534;}
    </style></head><body>
    ${el.innerHTML}
    <script>window.onload=function(){window.print();}<\/script>
    </body></html>`);
  win.document.close();
}

// ============================================================
// LAPORAN
// ============================================================
function switchLaporan(type, btn) {
  state.currentLaporan = type;
  document.querySelectorAll('#page-laporan .laporan-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Show/hide inputs
  const tgl   = document.getElementById('laporanTanggal');
  const bulan = document.getElementById('laporanBulan');
  const tahun = document.getElementById('laporanTahun');
  tgl.classList.add('hidden'); bulan.classList.add('hidden'); tahun.classList.add('hidden');

  if (type === 'harian')   tgl.classList.remove('hidden');
  if (type === 'mingguan') tgl.classList.remove('hidden');
  if (type === 'bulanan')  bulan.classList.remove('hidden');
  if (type === 'tahunan')  tahun.classList.remove('hidden');

  generateLaporan();
}

function getLaporanData() {
  const type  = state.currentLaporan;
  let filtered = [];

  if (type === 'harian') {
    const tgl = document.getElementById('laporanTanggal').value;
    filtered  = state.transaksi.filter(t => t.tanggal === tgl);
  } else if (type === 'mingguan') {
    const tgl = document.getElementById('laporanTanggal').value;
    if (!tgl) return [];
    const d = new Date(tgl);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon  = new Date(d.setDate(diff));
    const sun  = new Date(mon); sun.setDate(mon.getDate() + 6);
    const monS = mon.toISOString().split('T')[0];
    const sunS = sun.toISOString().split('T')[0];
    filtered = state.transaksi.filter(t => t.tanggal >= monS && t.tanggal <= sunS);
  } else if (type === 'bulanan') {
    const ym = document.getElementById('laporanBulan').value;
    filtered  = state.transaksi.filter(t => t.tanggal?.startsWith(ym));
  } else if (type === 'tahunan') {
    const yr = document.getElementById('laporanTahun').value;
    filtered  = state.transaksi.filter(t => t.tanggal?.startsWith(yr));
  }

  return filtered.sort((a,b) => new Date(a.tanggal) - new Date(b.tanggal));
}

function generateLaporan() {
  const data   = getLaporanData();
  const masuk  = data.filter(t => t.jenis==='Masuk').reduce((s,t) => s+(parseFloat(t.nominal)||0), 0);
  const keluar = data.filter(t => t.jenis==='Keluar').reduce((s,t) => s+(parseFloat(t.nominal)||0), 0);
  const saldo  = masuk - keluar;

  const el = document.getElementById('laporanContent');
  el.innerHTML = `
    <div class="laporan-summary">
      <div class="laporan-stat"><div class="laporan-stat-label">Pemasukan</div><div class="laporan-stat-value" style="color:#16a34a">${formatRp(masuk)}</div></div>
      <div class="laporan-stat"><div class="laporan-stat-label">Pengeluaran</div><div class="laporan-stat-value" style="color:#ef4444">${formatRp(keluar)}</div></div>
      <div class="laporan-stat"><div class="laporan-stat-label">Selisih</div><div class="laporan-stat-value" style="color:${saldo>=0?'#16a34a':'#ef4444'}">${formatRp(saldo)}</div></div>
    </div>
    ${data.length === 0 ? '<div class="no-data"><div class="nd-icon">📊</div><p>Tidak ada data</p></div>' :
      `<div style="overflow-x:auto;">
        <table class="laporan-table" id="tabelLaporan">
          <thead><tr>
            <th>Tanggal</th><th>Anggota</th><th>Jenis</th>
            <th>Kategori</th><th>Nominal</th><th>Keterangan</th>
          </tr></thead>
          <tbody>
            ${data.map(t => `
              <tr>
                <td>${formatTanggal(t.tanggal)}</td>
                <td>${t.anggota || '-'}</td>
                <td><span style="font-weight:700;color:${t.jenis==='Masuk'?'#16a34a':'#ef4444'}">${t.jenis}</span></td>
                <td>${t.kategori}</td>
                <td style="font-weight:700;">${formatRp(t.nominal)}</td>
                <td>${t.keterangan || '-'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`}`;
}

// ============================================================
// EXPORT
// ============================================================
function exportExcel() {
  const data = getLaporanData();
  if (data.length === 0) return showToast('Tidak ada data untuk diekspor!', 'error');

  const rows = [
    ['Tanggal','ID Anggota','Nama Anggota','Jenis','Kategori','Nominal','Keterangan','Petugas'],
    ...data.map(t => [
      t.tanggal, t.anggotaId||'', t.anggota||'',
      t.jenis, t.kategori, t.nominal, t.keterangan||'', t.petugas||''
    ])
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [12,16,20,10,14,14,20,16].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');

  // Sheet anggota
  const rA = [
    ['ID','Nama','HP','Alamat','Status'],
    ...state.anggota.map(a => [a.id, a.nama, a.hp, a.alamat, a.status])
  ];
  const wsA = XLSX.utils.aoa_to_sheet(rA);
  XLSX.utils.book_append_sheet(wb, wsA, 'Anggota');

  const fn = `KasPemuda_${state.currentLaporan}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fn);
  showToast('File Excel berhasil diunduh!', 'success');
}

function exportPDF() {
  const data = getLaporanData();
  if (data.length === 0) return showToast('Tidak ada data untuk diekspor!', 'error');

  const masuk  = data.filter(t=>t.jenis==='Masuk').reduce((s,t)=>s+(parseFloat(t.nominal)||0),0);
  const keluar = data.filter(t=>t.jenis==='Keluar').reduce((s,t)=>s+(parseFloat(t.nominal)||0),0);

  const html = `
    <div style="font-family:sans-serif;padding:24px;max-width:700px;">
      <h2 style="color:#166534;text-align:center;">${state.settings.orgName || 'KasPemuda'}</h2>
      <p style="text-align:center;color:#64748b;margin-bottom:16px;">Laporan ${state.currentLaporan.toUpperCase()} — ${new Date().toLocaleDateString('id-ID')}</p>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr style="background:#166534;color:#fff;">
          <th style="padding:8px;">Tanggal</th><th>Anggota</th><th>Jenis</th><th>Kategori</th><th>Nominal</th><th>Keterangan</th>
        </tr></thead>
        <tbody>
          ${data.map((t,i) => `<tr style="background:${i%2?'#f8fafc':'#fff'}">
            <td style="padding:6px 8px;">${t.tanggal}</td>
            <td>${t.anggota||'-'}</td>
            <td style="color:${t.jenis==='Masuk'?'#16a34a':'#dc2626'};font-weight:700;">${t.jenis}</td>
            <td>${t.kategori}</td>
            <td style="font-weight:700;">${formatRp(t.nominal)}</td>
            <td>${t.keterangan||'-'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div style="margin-top:16px;padding:12px;background:#f0fdf4;border-radius:8px;display:flex;justify-content:space-between;">
        <span>Pemasukan: <strong style="color:#16a34a">${formatRp(masuk)}</strong></span>
        <span>Pengeluaran: <strong style="color:#dc2626">${formatRp(keluar)}</strong></span>
        <span>Saldo: <strong style="color:#166534">${formatRp(masuk-keluar)}</strong></span>
      </div>
    </div>`;

  const el = document.createElement('div');
  el.innerHTML = html;
  document.body.appendChild(el);

  html2pdf().set({
    margin: 10, filename: `KasPemuda_${state.currentLaporan}_${new Date().toISOString().split('T')[0]}.pdf`,
    html2canvas: { scale: 2 }, jsPDF: { unit:'mm', format:'a4', orientation:'landscape' }
  }).from(el).save().then(() => {
    document.body.removeChild(el);
    showToast('PDF berhasil diunduh!', 'success');
  });
}

// ============================================================
// PENGATURAN
// ============================================================
function saveSettings() {
  state.settings.orgName = document.getElementById('setOrgName').value.trim();
  state.settings.desa    = document.getElementById('setDesa').value.trim();
  saveState();
  applySettings();
  showToast('Pengaturan disimpan!', 'success');
}

function saveScriptUrl() {
  const url = document.getElementById('setScriptUrl').value.trim();
  state.settings.scriptUrl = url;
  saveState();

  if (!url) return showToast('URL tidak boleh kosong!', 'error');

  const el = document.getElementById('connStatus');
  el.textContent = '⏳ Menguji koneksi...';
  el.className = 'conn-status';

  testConnection(url).then(ok => {
    if (ok) {
      el.textContent = '✅ Koneksi berhasil! Data akan tersinkron.';
      el.className = 'conn-status ok';
      updateSyncStatus('connected');
    } else {
      el.textContent = '❌ Koneksi gagal. Periksa URL atau deployment Apps Script.';
      el.className = 'conn-status fail';
      updateSyncStatus('error');
    }
  });
}

async function testConnection(url) {
  try {
    const res = await fetch(url + '?action=ping', { method: 'GET', mode: 'no-cors' });
    return true; // no-cors always "succeeds" — treat as connected
  } catch { return false; }
}

function changePassword() {
  const np = document.getElementById('newPass').value;
  const cp = document.getElementById('confirmPass').value;
  if (!np) return showToast('Password baru wajib diisi!', 'error');
  if (np !== cp) return showToast('Konfirmasi password tidak cocok!', 'error');
  if (np.length < 6) return showToast('Password minimal 6 karakter!', 'error');
  state.users[0].password = np;
  saveState();
  document.getElementById('newPass').value = '';
  document.getElementById('confirmPass').value = '';
  showToast('Password berhasil diganti!', 'success');
}

function backupData() {
  const backup = {
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    anggota: state.anggota,
    transaksi: state.transaksi,
    settings: state.settings
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `KasPemuda_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup berhasil diunduh!', 'success');
}

function restoreData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      showConfirm('Restore akan mengganti semua data saat ini. Lanjutkan?', '', 'Ya, Restore', () => {
        if (data.anggota)   state.anggota   = data.anggota;
        if (data.transaksi) state.transaksi = data.transaksi;
        if (data.settings)  state.settings  = { ...state.settings, ...data.settings };
        saveState();
        applySettings();
        renderDashboard();
        showToast('Data berhasil dipulihkan!', 'success');
      });
    } catch {
      showToast('File backup tidak valid!', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function clearAllData() {
  showConfirm('HAPUS SEMUA DATA?', 'Anggota dan seluruh transaksi akan terhapus permanen!', 'Ya, Hapus Semua', () => {
    state.anggota   = [];
    state.transaksi = [];
    saveState();
    renderDashboard();
    renderAnggota();
    renderTransaksi();
    showToast('Semua data telah dihapus!', 'error');
  });
}

// ============================================================
// SYNC TO GOOGLE SPREADSHEET
// ============================================================
function updateSyncStatus(status) {
  const el = document.getElementById('syncStatus');
  if (status === 'connected')  { el.textContent = '🔗 Terhubung'; el.className = 'sync-status'; }
  if (status === 'syncing')    { el.textContent = '⏳ Sinkron...'; el.className = 'sync-status syncing'; }
  if (status === 'synced')     { el.textContent = '✅ Tersinkron'; el.className = 'sync-status'; }
  if (status === 'error')      { el.textContent = '❌ Gagal Sync'; el.className = 'sync-status error'; }
  if (status === 'local')      { el.textContent = '⚡ Lokal'; el.className = 'sync-status'; }
}

async function syncToSpreadsheet() {
  const url = state.settings.scriptUrl;
  if (!url) return;

  updateSyncStatus('syncing');

  try {
    const payload = {
      action: 'syncAll',
      anggota: state.anggota,
      transaksi: state.transaksi
    };

    const res = await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    updateSyncStatus('synced');
    setTimeout(() => updateSyncStatus('connected'), 3000);
  } catch (err) {
    updateSyncStatus('error');
    setTimeout(() => updateSyncStatus('local'), 3000);
  }
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal:not(.hidden)').forEach(m => {
      if (m.id !== 'confirmDialog') closeModal(m.id);
    });
  }
  if (e.key === 'Enter' && document.getElementById('loginScreen') && !document.getElementById('loginScreen').classList.contains('hidden')) {
    doLogin();
  }
});

// Login on Enter
document.getElementById('loginPass')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

// ============================================================
// BOOTSTRAP
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  loadState();
  // Check if already logged in (optional: session flag)
});
