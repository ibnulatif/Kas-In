// ============================================================
// KasPemuda - Google Apps Script (Code.gs)
// Salin seluruh kode ini ke Google Apps Script
// ============================================================

// ====== KONFIGURASI — GANTI DENGAN ID SPREADSHEET ANDA ======
const SPREADSHEET_ID = '1P0bHtMQ6zmHOexSSGQdHf4xcoX1Ia6p_XCoyeI4Hu4w';
// Contoh: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms'

const SHEET_ANGGOTA   = 'Anggota';
const SHEET_TRANSAKSI = 'Transaksi';
const SHEET_LOG       = 'Log';

// ====== CORS HEADERS ======
function setCorsHeaders(output) {
  return output
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ====== ENTRY POINTS ======
function doGet(e) {
  const action = e?.parameter?.action || '';

  let result = {};

  if (action === 'ping') {
    result = { status: 'ok', message: 'KasPemuda Apps Script aktif!', timestamp: new Date().toISOString() };
  } else if (action === 'getAnggota') {
    result = { status: 'ok', data: getAnggota() };
  } else if (action === 'getTransaksi') {
    result = { status: 'ok', data: getTransaksi() };
  } else if (action === 'getAll') {
    result = { status: 'ok', anggota: getAnggota(), transaksi: getTransaksi() };
  } else {
    result = { status: 'ok', message: 'KasPemuda API siap digunakan.' };
  }

  const output = ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);

  return setCorsHeaders(output);
}

function doPost(e) {
  let result = {};

  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action || '';

    if (action === 'syncAll') {
      syncAnggota(body.anggota || []);
      syncTransaksi(body.transaksi || []);
      addLog('SYNC_ALL', `Sinkronisasi ${(body.anggota||[]).length} anggota, ${(body.transaksi||[]).length} transaksi`);
      result = { status: 'ok', message: 'Data berhasil disinkronkan!' };
    } else if (action === 'addAnggota') {
      addAnggota(body.data);
      addLog('ADD_ANGGOTA', body.data?.nama);
      result = { status: 'ok', message: 'Anggota ditambahkan!' };
    } else if (action === 'updateAnggota') {
      updateAnggota(body.data);
      addLog('UPDATE_ANGGOTA', body.data?.nama);
      result = { status: 'ok', message: 'Anggota diperbarui!' };
    } else if (action === 'deleteAnggota') {
      deleteAnggota(body.id);
      addLog('DELETE_ANGGOTA', body.id);
      result = { status: 'ok', message: 'Anggota dihapus!' };
    } else if (action === 'addTransaksi') {
      addTransaksi(body.data);
      addLog('ADD_TX', `${body.data?.jenis} - ${body.data?.nominal}`);
      result = { status: 'ok', message: 'Transaksi dicatat!' };
    } else if (action === 'deleteTransaksi') {
      deleteTransaksi(body.id);
      addLog('DELETE_TX', body.id);
      result = { status: 'ok', message: 'Transaksi dihapus!' };
    } else {
      result = { status: 'error', message: 'Action tidak dikenal: ' + action };
    }
  } catch (err) {
    result = { status: 'error', message: err.toString() };
    addLog('ERROR', err.toString());
  }

  const output = ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);

  return setCorsHeaders(output);
}

// ====== INIT SPREADSHEET ======
function initSpreadsheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Sheet Anggota
  let shAnggota = ss.getSheetByName(SHEET_ANGGOTA);
  if (!shAnggota) {
    shAnggota = ss.insertSheet(SHEET_ANGGOTA);
    const header = ['ID', 'Nama', 'HP', 'Alamat', 'Status', 'Tanggal Dibuat'];
    shAnggota.getRange(1, 1, 1, header.length).setValues([header]);
    shAnggota.getRange(1, 1, 1, header.length)
      .setBackground('#166534').setFontColor('#ffffff')
      .setFontWeight('bold');
    shAnggota.setFrozenRows(1);
  }

  // Sheet Transaksi
  let shTx = ss.getSheetByName(SHEET_TRANSAKSI);
  if (!shTx) {
    shTx = ss.insertSheet(SHEET_TRANSAKSI);
    const header = ['ID', 'Tanggal', 'ID Anggota', 'Nama Anggota', 'Jenis', 'Kategori', 'Nominal', 'Keterangan', 'Petugas', 'Dibuat'];
    shTx.getRange(1, 1, 1, header.length).setValues([header]);
    shTx.getRange(1, 1, 1, header.length)
      .setBackground('#166534').setFontColor('#ffffff')
      .setFontWeight('bold');
    shTx.setFrozenRows(1);
  }

  // Sheet Log
  let shLog = ss.getSheetByName(SHEET_LOG);
  if (!shLog) {
    shLog = ss.insertSheet(SHEET_LOG);
    shLog.getRange(1, 1, 1, 3).setValues([['Waktu', 'Aksi', 'Detail']]);
    shLog.getRange(1, 1, 1, 3).setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold');
    shLog.setFrozenRows(1);
  }

  return ss;
}

// ====== ANGGOTA FUNCTIONS ======
function getAnggota() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(SHEET_ANGGOTA);
  if (!sh) return [];

  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];

  const data = sh.getRange(2, 1, lastRow - 1, 6).getValues();
  return data
    .filter(r => r[0]) // filter empty rows
    .map(r => ({
      id:        r[0],
      nama:      r[1],
      hp:        r[2],
      alamat:    r[3],
      status:    r[4],
      createdAt: r[5]
    }));
}

function syncAnggota(anggotaList) {
  const ss = initSpreadsheet();
  const sh = ss.getSheetByName(SHEET_ANGGOTA);

  // Clear existing data (keep header)
  const lastRow = sh.getLastRow();
  if (lastRow > 1) sh.getRange(2, 1, lastRow - 1, 6).clearContent();

  if (anggotaList.length === 0) return;

  const rows = anggotaList.map(a => [
    a.id || '',
    a.nama || '',
    a.hp || '',
    a.alamat || '',
    a.status || 'aktif',
    a.createdAt || new Date().toISOString()
  ]);

  sh.getRange(2, 1, rows.length, 6).setValues(rows);

  // Auto-resize columns
  sh.autoResizeColumns(1, 6);
}

function addAnggota(data) {
  const ss = initSpreadsheet();
  const sh = ss.getSheetByName(SHEET_ANGGOTA);
  const lastRow = sh.getLastRow() + 1;
  sh.getRange(lastRow, 1, 1, 6).setValues([[
    data.id || '', data.nama || '', data.hp || '',
    data.alamat || '', data.status || 'aktif',
    data.createdAt || new Date().toISOString()
  ]]);
}

function updateAnggota(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(SHEET_ANGGOTA);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return;

  const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === data.id) {
      sh.getRange(i + 2, 1, 1, 6).setValues([[
        data.id, data.nama, data.hp,
        data.alamat, data.status, data.createdAt
      ]]);
      return;
    }
  }
}

function deleteAnggota(id) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(SHEET_ANGGOTA);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return;

  const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = ids.length - 1; i >= 0; i--) {
    if (ids[i][0] === id) {
      sh.deleteRow(i + 2);
      return;
    }
  }
}

// ====== TRANSAKSI FUNCTIONS ======
function getTransaksi() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(SHEET_TRANSAKSI);
  if (!sh) return [];

  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];

  const data = sh.getRange(2, 1, lastRow - 1, 10).getValues();
  return data
    .filter(r => r[0])
    .map(r => ({
      id:        r[0],
      tanggal:   r[1],
      anggotaId: r[2],
      anggota:   r[3],
      jenis:     r[4],
      kategori:  r[5],
      nominal:   r[6],
      keterangan:r[7],
      petugas:   r[8],
      createdAt: r[9]
    }));
}

function syncTransaksi(transaksiList) {
  const ss = initSpreadsheet();
  const sh = ss.getSheetByName(SHEET_TRANSAKSI);

  const lastRow = sh.getLastRow();
  if (lastRow > 1) sh.getRange(2, 1, lastRow - 1, 10).clearContent();

  if (transaksiList.length === 0) return;

  const rows = transaksiList.map(t => [
    t.id || '',
    t.tanggal || '',
    t.anggotaId || '',
    t.anggota || '',
    t.jenis || '',
    t.kategori || '',
    t.nominal || 0,
    t.keterangan || '',
    t.petugas || '',
    t.createdAt || new Date().toISOString()
  ]);

  sh.getRange(2, 1, rows.length, 10).setValues(rows);

  // Format nominal column as currency (Rupiah)
  sh.getRange(2, 7, rows.length, 1)
    .setNumberFormat('"Rp "#,##0');

  sh.autoResizeColumns(1, 10);
}

function addTransaksi(data) {
  const ss = initSpreadsheet();
  const sh = ss.getSheetByName(SHEET_TRANSAKSI);
  const lastRow = sh.getLastRow() + 1;
  sh.getRange(lastRow, 1, 1, 10).setValues([[
    data.id || '', data.tanggal || '', data.anggotaId || '',
    data.anggota || '', data.jenis || '', data.kategori || '',
    data.nominal || 0, data.keterangan || '',
    data.petugas || '', data.createdAt || new Date().toISOString()
  ]]);
}

function deleteTransaksi(id) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(SHEET_TRANSAKSI);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return;

  const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = ids.length - 1; i >= 0; i--) {
    if (ids[i][0] === id) {
      sh.deleteRow(i + 2);
      return;
    }
  }
}

// ====== LOG ======
function addLog(action, detail) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sh = ss.getSheetByName(SHEET_LOG);
    if (!sh) sh = ss.insertSheet(SHEET_LOG);
    sh.appendRow([new Date().toLocaleString('id-ID'), action, detail]);
  } catch(e) { /* ignore log errors */ }
}

// ====== TRIGGER SETUP ======
// Jalankan fungsi ini SEKALI dari menu Apps Script untuk setup
function setupTrigger() {
  // Inisialisasi spreadsheet dengan header
  initSpreadsheet();
  Logger.log('Spreadsheet berhasil diinisialisasi!');
}
