const express = require('express');
const cors = require('cors');
const pino = require('pino');
const QRCode = require('qrcode');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  fetchLatestWaWebVersion,
  Browsers,
  delay,
} = require('@whiskeysockets/baileys');

// --- PATCH ANTI-401 UNTUK UPLOAD MEDIA BAILEYS ---
try {
  const messagesMedia = require('@whiskeysockets/baileys/lib/Utils/messages-media');
  if (messagesMedia && typeof messagesMedia.getWaUploadToServer === 'function') {
    const MEDIA_PATH_MAP = {
      image: '/mms/image',
      video: '/mms/video',
      document: '/mms/document',
      audio: '/mms/audio',
      sticker: '/mms/image',
      'thumbnail-link': '/mms/image',
      'product-catalog-image': '/product/image',
      'md-app-state': '',
      'md-msg-hist': '/mms/md-app-state',
    };

    const encodeB64ForUpload = (b64) =>
      encodeURIComponent(b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''));

    const toBuffer = async (input) => {
      if (Buffer.isBuffer(input)) return input;
      if (typeof input === 'string' && fs.existsSync(input)) return fs.readFileSync(input);
      const chunks = [];
      for await (const chunk of input) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    };

    messagesMedia.getWaUploadToServer = (
      { customUploadHosts = [], fetchAgent, options = {} },
      refreshMediaConn
    ) => {
      return async (streamOrPath, { mediaType, fileEncSha256B64, timeoutMs }) => {
        const bodyBuffer = await toBuffer(streamOrPath);
        const safeSha = encodeB64ForUpload(fileEncSha256B64);
        const mediaPath = MEDIA_PATH_MAP[mediaType] || '/mms/image';

        for (let attempt = 0; attempt < 2; attempt++) {
          const uploadInfo = await refreshMediaConn(attempt > 0);
          const hosts = [...customUploadHosts, ...(uploadInfo?.hosts || [])];

          for (const { hostname } of hosts) {
            const auth = encodeURIComponent(uploadInfo.auth);
            const url = `https://${hostname}${mediaPath}/${safeSha}?auth=${auth}&token=${safeSha}`;
            try {
              const { data } = await axios.post(url, bodyBuffer, {
                ...options,
                headers: {
                  ...(options.headers || {}),
                  'Content-Type': 'application/octet-stream',
                  'Content-Length': bodyBuffer.length,
                  Origin: 'https://web.whatsapp.com',
                  Referer: 'https://web.whatsapp.com/',
                  'User-Agent':
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                },
                httpsAgent: fetchAgent,
                timeout: timeoutMs || 30000,
                responseType: 'json',
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
              });

              if (data && (data.url || data.direct_path)) {
                return {
                  mediaUrl: data.url,
                  directPath: data.direct_path,
                };
              }
            } catch (err) {
              const status = err?.response?.status;
              console.warn(`[WARN] Upload media ke ${hostname} gagal (status: ${status || err.message})`);
              if (status === 401 || status === 403) {
                break; // Keluar dari loop host untuk force-refresh mediaConn pada attempt berikutnya
              }
            }
          }
        }
        throw new Error('Gagal mengunggah media ke server WhatsApp setelah refresh token.');
      };
    }
  }
} catch (patchErr) {
  console.warn('Info patch media:', patchErr.message);
}

const app = express();
const PORT = process.env.PORT || 3008;
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Api-Key, Accept, x-waha-target, x-api-key'
  );
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Key', 'Accept'],
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

let sock = null;
let currentStatus = 'STARTING';
let currentQrCodeDataUrl = null;
let connectedUser = null;
let connectionAttempts = 0;

const logger = pino({ level: 'silent' });

async function getLatestWaVersion() {
  try {
    const { data } = await axios.get(
      'https://web.whatsapp.com/check-update?version=1&platform=web',
      { timeout: 6000 }
    );
    if (data && data.currentVersion) {
      const parts = data.currentVersion.split('.').map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        return parts;
      }
    }
  } catch (e) {}

  try {
    if (typeof fetchLatestWaWebVersion === 'function') {
      const { version } = await fetchLatestWaWebVersion({});
      if (version) return version;
    }
  } catch (e) {}

  try {
    const { version } = await fetchLatestBaileysVersion();
    if (version) return version;
  } catch (e) {}

  return [2, 3000, 1023223821];
}

async function initWhatsApp() {
  try {
    currentStatus = 'STARTING';
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const version = await getLatestWaVersion();
    console.log('Menggunakan WA Web Version:', version.join('.'));

    sock = makeWASocket({
      version,
      logger,
      auth: state,
      browser: Browsers?.ubuntu ? Browsers.ubuntu('Chrome') : ['Ubuntu', 'Chrome', '22.04.4'],
      syncFullHistory: false,
      connectTimeoutMs: 60000,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentStatus = 'SCAN_QR_CODE';
        try {
          currentQrCodeDataUrl = await QRCode.toDataURL(qr, {
            width: 340,
            margin: 2,
            color: { dark: '#0f5132', light: '#ffffff' },
          });
        } catch (e) {
          console.error('Gagal membuat dataURL QR', e);
        }
        console.log('\n=======================================================');
        console.log('>> QR CODE BARU TERSEDIA! Buka http://localhost:' + PORT + ' untuk scan <<');
        console.log('=======================================================\n');
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log('Koneksi terputus. Status code:', statusCode, 'Reconnect:', shouldReconnect);
        currentStatus = 'STOPPED';
        connectedUser = null;
        currentQrCodeDataUrl = null;

        if (statusCode === DisconnectReason.loggedOut) {
          console.log('Pengguna logout. Menghapus sesi lama...');
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch (e) {}
          await delay(2000);
          initWhatsApp();
        } else if (shouldReconnect) {
          connectionAttempts++;
          const waitTime = Math.min(connectionAttempts * 2000, 10000);
          console.log(`Mencoba menyambung kembali dalam ${waitTime / 1000} detik...`);
          await delay(waitTime);
          initWhatsApp();
        }
      } else if (connection === 'open') {
        connectionAttempts = 0;
        currentStatus = 'WORKING';
        currentQrCodeDataUrl = null;

        const user = sock.user;
        connectedUser = {
          id: user?.id ? user.id.split(':')[0] + '@c.us' : 'WhatsApp User',
          phone: user?.id ? user.id.split(':')[0] : '',
          name: user?.name || 'Madin Blokagung Bot',
        };

        console.log('\n=======================================================');
        console.log('>> WHATSAPP BERHASIL TERHUBUNG! <<');
        console.log('Nomor:', connectedUser.phone);
        console.log('Nama :', connectedUser.name);
        console.log('=======================================================\n');
      }
    });
  } catch (err) {
    console.error('Error inisialisasi Baileys:', err);
    currentStatus = 'FAILED';
  }
}

app.get('/api/sessions/:session', (req, res) => {
  res.json({
    name: req.params.session || 'default',
    status: currentStatus,
    qrCode: currentStatus === 'SCAN_QR_CODE' ? currentQrCodeDataUrl : null,
    me:
      currentStatus === 'WORKING' && connectedUser
        ? {
            id: connectedUser.id,
            pushName: connectedUser.name,
          }
        : null,
  });
});

app.get('/api/sessions/:session/auth/qr', (req, res) => {
  if (currentStatus === 'SCAN_QR_CODE' && currentQrCodeDataUrl) {
    res.json({ status: 'SCAN_QR_CODE', qrCode: currentQrCodeDataUrl });
  } else {
    res.json({ status: currentStatus, qrCode: null });
  }
});

app.get('/api/sessions', (req, res) => {
  res.json([
    {
      name: 'default',
      status: currentStatus,
      qrCode: currentStatus === 'SCAN_QR_CODE' ? currentQrCodeDataUrl : null,
      me:
        currentStatus === 'WORKING' && connectedUser
          ? {
              id: connectedUser.id,
              pushName: connectedUser.name,
            }
          : null,
    },
  ]);
});

async function resolveWhatsAppJid(rawChatId) {
  const cleanNumber = String(rawChatId || '')
    .replace('@c.us', '')
    .replace('@s.whatsapp.net', '')
    .replace(/[^0-9]/g, '');

  if (!cleanNumber) {
    const invalidErr = new Error('Nomor WhatsApp tujuan tidak valid.');
    invalidErr.statusCode = 400;
    throw invalidErr;
  }

  if (typeof sock?.onWhatsApp === 'function') {
    const results = await sock.onWhatsApp(cleanNumber);
    const match = Array.isArray(results) ? results[0] : null;
    if (!match || !match.exists) {
      const notFoundErr = new Error(
        `Nomor ${cleanNumber} tidak terdaftar atau tidak aktif di WhatsApp.`
      );
      notFoundErr.statusCode = 400;
      throw notFoundErr;
    }
    return match.jid || `${cleanNumber}@s.whatsapp.net`;
  }

  return `${cleanNumber}@s.whatsapp.net`;
}

app.post('/api/sendImage', async (req, res) => {
  try {
    if (currentStatus !== 'WORKING' || !sock) {
      return res.status(503).json({
        error: 'Server WhatsApp Gateway belum terhubung. Silakan scan QR code terlebih dahulu.',
      });
    }

    const { chatId, file, caption } = req.body;
    const rawFile = file?.url || file?.data || req.body?.image;

    if (!chatId || !rawFile) {
      return res.status(400).json({ error: 'Parameter chatId dan file.url wajib disertakan.' });
    }

    const targetJid = await resolveWhatsAppJid(chatId);
    let targetJid = String(chatId).replace('@c.us', '@s.whatsapp.net');
    if (!targetJid.includes('@')) {
      targetJid = `${targetJid}@s.whatsapp.net`;
    }

    let imageBuffer;
    if (rawFile.startsWith('data:image')) {
      const base64Data = rawFile.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else if (rawFile.startsWith('http://') || rawFile.startsWith('https://')) {
      const resp = await axios.get(rawFile, { responseType: 'arraybuffer', timeout: 20000 });
      imageBuffer = Buffer.from(resp.data);
    } else {
      imageBuffer = Buffer.from(rawFile, 'base64');
    }

    const result = await sock.sendMessage(targetJid, {
      image: imageBuffer,
      caption: file?.caption || caption || '',
    });

    console.log(`[SUKSES] Gambar terkirim ke: ${targetJid} (ID: ${result?.key?.id})`);
    return res.json({
      id: result?.key?.id || `msg_${Date.now()}`,
      jid: targetJid,
      status: 'success',
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    console.error('[GAGAL] Gagal mengirim gambar:', err.message);
    return res.status(statusCode).json({
      error: err.message,
    });
  }
});

app.post('/api/sendText', async (req, res) => {
  try {
    if (currentStatus !== 'WORKING' || !sock) {
      return res.status(503).json({ error: 'Server WhatsApp belum terhubung.' });
    }

    const { chatId, text } = req.body;
    const targetJid = await resolveWhatsAppJid(chatId);
    let targetJid = String(chatId).replace('@c.us', '@s.whatsapp.net');
    if (!targetJid.includes('@')) targetJid = `${targetJid}@s.whatsapp.net`;

    const result = await sock.sendMessage(targetJid, { text: text || '' });
    return res.json({ id: result?.key?.id, jid: targetJid, status: 'success' });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({ error: err.message });
  }
});

app.post('/api/sessions/:session/logout', async (req, res) => {
  try {
    if (sock) {
      await sock.logout();
    }
    try {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    } catch (e) {}
    currentStatus = 'STOPPED';
    connectedUser = null;
    currentQrCodeDataUrl = null;
    res.json({ message: 'Logout berhasil. Menginisialisasi QR baru...' });
    await delay(1500);
    initWhatsApp();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  const isConnected = currentStatus === 'WORKING';
  const isQr = currentStatus === 'SCAN_QR_CODE' && currentQrCodeDataUrl;

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsApp Gateway - Madin Al Amiriyyah Blokagung</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
    body { background: #f0fdf4; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; color: #1e293b; }
    .card { background: #ffffff; border: 1px solid #bbf7d0; border-radius: 28px; padding: 36px 32px; max-width: 480px; width: 100%; box-shadow: 0 20px 40px -15px rgba(22, 101, 52, 0.12); text-align: center; }
    .logo-badge { display: inline-flex; align-items: center; gap: 8px; background: #dcfce7; color: #166534; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 9999px; margin-bottom: 16px; border: 1px solid #86efac; }
    h1 { font-size: 20px; font-weight: 800; color: #14532d; margin-bottom: 8px; }
    p.desc { font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 24px; }
    .status-badge { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; padding: 8px 18px; border-radius: 14px; margin-bottom: 20px; }
    .status-working { background: #16a34a; color: white; }
    .status-qr { background: #ca8a04; color: white; }
    .status-starting { background: #475569; color: white; }
    .qr-box { background: white; border: 3px dashed #86efac; border-radius: 20px; padding: 18px; display: inline-block; margin-bottom: 20px; }
    .qr-box img { display: block; border-radius: 12px; max-width: 100%; height: auto; }
    .steps { text-align: left; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 18px; padding: 18px 20px; margin-bottom: 22px; }
    .steps h3 { font-size: 12px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
    .steps ol { padding-left: 20px; font-size: 12px; color: #475569; line-height: 1.7; }
    .btn-logout { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; font-size: 12px; font-weight: 700; padding: 10px 20px; border-radius: 12px; cursor: pointer; }
    .connected-info { background: #dcfce7; border: 1px solid #86efac; border-radius: 18px; padding: 22px; margin-bottom: 20px; }
    .phone-number { font-size: 18px; font-weight: 800; color: #14532d; margin-top: 4px; }
    .api-hint { font-size: 11px; color: #64748b; margin-top: 18px; line-height: 1.5; background: #f1f5f9; padding: 10px; border-radius: 10px; }
  </style>
  <script>
    setInterval(async () => {
      try {
        const res = await fetch('/api/sessions/default');
        const data = await res.json();
        const currentIsWorking = ${isConnected ? 'true' : 'false'};
        if ((data.status === 'WORKING' && !currentIsWorking) || (data.status !== 'WORKING' && currentIsWorking)) {
          window.location.reload();
        }
      } catch (e) {}
    }, 3000);
  </script>
</head>
<body>
  <div class="card">
    <div class="logo-badge">
      <span>Madin Al Amiriyyah Blokagung</span>
    </div>
    <h1>WhatsApp Gateway</h1>
    <p class="desc">Server pengiriman Kartu Rapor Digital Hafalan santri.</p>
    ${
      isConnected
        ? `
      <div class="status-badge status-working">
        <span>●</span>
        <span>TERHUBUNG SECARA ONLINE</span>
      </div>
      <div class="connected-info">
        <p style="font-size: 12px; color: #166534; font-weight: 600;">Nomor WhatsApp Terhubung:</p>
        <div class="phone-number">+${connectedUser?.phone || ''}</div>
        <p style="font-size: 12px; color: #15803d; margin-top: 4px;">Akun: <strong>${connectedUser?.name || 'Madin Bot'}</strong></p>
      </div>
      <button class="btn-logout" onclick="fetch('/api/sessions/default/logout', {method:'POST'}).then(() => location.reload())">
        Putuskan Koneksi / Ganti Nomor
      </button>
    `
        : isQr
        ? `
      <div class="status-badge status-qr">
        <span>SILAKAN SCAN QR CODE</span>
      </div>
      <div class="qr-box">
        <img src="${currentQrCodeDataUrl}" alt="QR Code WhatsApp" />
      </div>
      <div class="steps">
        <h3>Langkah Menghubungkan:</h3>
        <ol>
          <li>Buka aplikasi <strong>WhatsApp</strong> di HP Anda.</li>
          <li>Ketuk menu titik tiga (⋮) atau <strong>Pengaturan</strong> &gt; <strong>Perangkat Tertaut</strong>.</li>
          <li>Pilih <strong>Tautkan Perangkat</strong> dan arahkan kamera HP ke QR Code di atas.</li>
        </ol>
      </div>
    `
        : `
      <div class="status-badge status-starting">
        <span>MEMULAI ENGINE WHATSAPP...</span>
      </div>
      <p style="font-size: 12px; color: #64748b; margin: 20px 0;">Mohon tunggu beberapa saat, QR Code sedang dipersiapkan...</p>
    `
    }
    <div class="api-hint">
      <strong>URL Server untuk Aplikasi Madin Blokagung:</strong><br>
      <code style="font-weight: 700; color: #0f172a;">http://localhost:${PORT}</code>
    </div>
  </div>
</body>
</html>`;

  res.send(html);
});

app.listen(PORT, () => {
  console.log(`\n========================================================`);
  console.log(` WhatsApp Gateway Madin berjalan di: http://localhost:${PORT}`);
  console.log(` Buka URL di browser untuk melihat status dan Scan QR.`);
  console.log(`========================================================\n`);
  initWhatsApp();
});
