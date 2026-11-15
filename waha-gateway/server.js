const express = require('express');
const cors = require('cors');
const pino = require('pino');
const QRCode = require('qrcode');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const dns = require('dns');
const net = require('net');
const http = require('http');
const https = require('https');
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  fetchLatestWaWebVersion,
  Browsers,
  delay,
} = require('@whiskeysockets/baileys');

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
                break;
              }
            }
          }
        }
        throw new Error('Gagal mengunggah media ke server WhatsApp setelah refresh token.');
      };
    };
  }
} catch (patchErr) {
  console.warn('Info patch media:', patchErr.message);
}

const app = express();
const PORT = Number(process.env.PORT) || 3008;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const SESSION_NAME_REGEX = /^[a-zA-Z0-9_-]{1,32}$/;

const ALLOWED_CORS_ORIGINS = new Set(
  String(process.env.ALLOWED_CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (ALLOWED_CORS_ORIGINS.has(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Key', 'Accept'],
    maxAge: 600,
  })
);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getConfiguredApiKey() {
  return String(process.env.WAHA_API_KEY || '').trim();
}

function extractRequestApiKey(req) {
  const headerKey = req.headers['x-api-key'];
  if (typeof headerKey === 'string' && headerKey.trim()) {
    return headerKey.trim();
  }
  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return '';
}

function isValidApiKeyConstantTime(providedKey, expectedKey) {
  if (!providedKey || !expectedKey) return false;
  const providedDigest = crypto.createHash('sha256').update(String(providedKey), 'utf8').digest();
  const expectedDigest = crypto.createHash('sha256').update(String(expectedKey), 'utf8').digest();
  return crypto.timingSafeEqual(providedDigest, expectedDigest);
}

const rateBuckets = new Map();
const RATE_CLEANUP_INTERVAL_MS = 60 * 1000;
const rateCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateBuckets.entries()) {
    if (now > entry.resetAt) {
      rateBuckets.delete(key);
    }
  }
}, RATE_CLEANUP_INTERVAL_MS);
if (typeof rateCleanupTimer.unref === 'function') {
  rateCleanupTimer.unref();
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function createRateLimiter({ namespace, maxRequests, windowMs }) {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${namespace}:${getClientIp(req)}`;
    let entry = rateBuckets.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      rateBuckets.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: `Terlalu banyak permintaan ke gateway. Coba lagi dalam ${retryAfterSec} detik.`,
      });
    }
    next();
  };
}

const statusRateLimiter = createRateLimiter({
  namespace: 'status',
  maxRequests: 120,
  windowMs: 60 * 1000,
});

const mutationRateLimiter = createRateLimiter({
  namespace: 'mutation',
  maxRequests: 60,
  windowMs: 60 * 1000,
});

function requireApiKey(req, res, next) {
  const configuredKey = getConfiguredApiKey();
  if (!configuredKey || (IS_PRODUCTION && configuredKey.length < 32)) {
    return res.status(503).json({
      error:
        'WAHA_API_KEY belum dikonfigurasi dengan aman di server gateway (minimal 32 karakter di produksi).',
    });
  }

  const providedKey = extractRequestApiKey(req);
  if (!isValidApiKeyConstantTime(providedKey, configuredKey)) {
    return res.status(401).json({
      error: 'Akses ditolak: API Key tidak valid atau tidak disertakan.',
    });
  }

  next();
}

function isPrivateOrReservedIpv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b, c] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8 (RFC1918)
  if (a === 127) return true; // 127.0.0.0/8 (Loopback)
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 (Link-local / Cloud Metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 (RFC1918)
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 (RFC1918)
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // 192.0.0.0/24, 192.0.2.0/24
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15
  if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24
  if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24
  if (a >= 224) return true; // Multicast & Reserved (224.0.0.0/4+)
  return false;
}

function isPrivateOrReservedIp(ip) {
  const normalized = String(ip || '').trim().toLowerCase();
  const family = net.isIP(normalized);
  if (family === 4) {
    return isPrivateOrReservedIpv4(normalized);
  }
  if (family === 6) {
    if (normalized === '::1' || normalized === '::' || normalized === '0:0:0:0:0:0:0:1' || normalized === '0:0:0:0:0:0:0:0') {
      return true;
    }
    if (normalized.startsWith('::ffff:')) {
      const mappedV4 = normalized.slice('::ffff:'.length);
      if (net.isIP(mappedV4) === 4) {
        return isPrivateOrReservedIpv4(mappedV4);
      }
      return true;
    }
    const firstHextet = parseInt(normalized.split(':')[0] || '0', 16);
    if (Number.isNaN(firstHextet)) return true;
    if ((firstHextet & 0xfe00) === 0xfc00) return true; // fc00::/7 (Unique Local)
    if ((firstHextet & 0xffc0) === 0xfe80) return true; // fe80::/10 (Link-Local)
    if ((firstHextet & 0xff00) === 0xff00) return true; // ff00::/8 (Multicast)
    if (normalized.startsWith('2001:db8:')) return true; // Documentation
    return false;
  }
  return true;
}

function hasValidImageMagicBytes(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return false;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return true;
  }
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return true;
  }
  // WEBP: "RIFF" .... "WEBP"
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return true;
  }
  return false;
}

async function fetchRemoteImageSafe(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    const err = new Error('URL gambar tidak valid.');
    err.statusCode = 400;
    throw err;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    const err = new Error('Skema URL gambar harus http atau https.');
    err.statusCode = 400;
    throw err;
  }

  if (parsed.username || parsed.password) {
    const err = new Error('URL gambar tidak boleh menyertakan kredensial.');
    err.statusCode = 400;
    throw err;
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
  let records;
  try {
    records = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  } catch {
    const err = new Error('Gagal me-resolve domain URL gambar.');
    err.statusCode = 400;
    throw err;
  }

  if (!Array.isArray(records) || records.length === 0) {
    const err = new Error('Alamat IP URL gambar tidak ditemukan.');
    err.statusCode = 400;
    throw err;
  }

  for (const rec of records) {
    if (isPrivateOrReservedIp(rec.address)) {
      const err = new Error('Akses ke alamat IP internal/privat/metadata ditolak (SSRF Guard).');
      err.statusCode = 403;
      throw err;
    }
  }

  const pinnedRecord = records[0];
  const pinnedLookup = (_host, opts, cb) => {
    if (typeof opts === 'function') {
      cb = opts;
      opts = {};
    }
    if (opts && opts.all) {
      return cb(null, [{ address: pinnedRecord.address, family: pinnedRecord.family }]);
    }
    return cb(null, pinnedRecord.address, pinnedRecord.family);
  };

  const agentOptions = { lookup: pinnedLookup, keepAlive: false };
  const httpAgent = new http.Agent(agentOptions);
  const httpsAgent = new https.Agent(agentOptions);

  let resp;
  try {
    resp = await axios.get(parsed.toString(), {
      responseType: 'arraybuffer',
      timeout: 15000,
      maxRedirects: 0,
      maxContentLength: MAX_IMAGE_BYTES,
      maxBodyLength: MAX_IMAGE_BYTES,
      httpAgent,
      httpsAgent,
      validateStatus: (status) => status >= 200 && status < 300,
    });
  } catch (fetchErr) {
    const err = new Error(`Gagal mengunduh gambar dari URL eksternal: ${fetchErr.message}`);
    err.statusCode = 400;
    throw err;
  }

  const contentType = String(resp.headers?.['content-type'] || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  const allowedMimes = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
  const buffer = Buffer.from(resp.data);

  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    const err = new Error('Ukuran gambar tidak valid atau melebihi batas 10 MB.');
    err.statusCode = 400;
    throw err;
  }

  if ((contentType && !allowedMimes.has(contentType)) || !hasValidImageMagicBytes(buffer)) {
    const err = new Error('File yang diunduh bukan gambar PNG/JPEG/WEBP yang valid.');
    err.statusCode = 400;
    throw err;
  }

  return buffer;
}

function decodeImageInput(rawFile) {
  if (typeof rawFile !== 'string' || !rawFile.trim()) {
    const err = new Error('Data gambar tidak valid.');
    err.statusCode = 400;
    throw err;
  }

  const trimmed = rawFile.trim();
  if (trimmed.startsWith('data:')) {
    const match = trimmed.match(/^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=\r\n]+)$/i);
    if (!match) {
      const err = new Error('Format data URI gambar hanya mendukung PNG, JPEG, atau WEBP base64.');
      err.statusCode = 400;
      throw err;
    }
    const buf = Buffer.from(match[2], 'base64');
    if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES || !hasValidImageMagicBytes(buf)) {
      const err = new Error('Data gambar base64 rusak atau melebihi batas 10 MB.');
      err.statusCode = 400;
      throw err;
    }
    return Promise.resolve(buf);
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return fetchRemoteImageSafe(trimmed);
  }

  const buf = Buffer.from(trimmed, 'base64');
  if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES || !hasValidImageMagicBytes(buf)) {
    const err = new Error('Payload gambar bukan format PNG/JPEG/WEBP yang valid atau melebihi 10 MB.');
    err.statusCode = 400;
    throw err;
  }
  return Promise.resolve(buf);
}

let sock = null;
let currentStatus = 'STARTING';
let currentQrCodeDataUrl = null;
let connectedUser = null;
let connectionAttempts = 0;
let isInitializing = false;
let isLoggingOut = false;
let isShuttingDown = false;
let reconnectTimer = null;

const logger = pino({ level: 'silent' });

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect(waitTimeMs) {
  if (isShuttingDown || isLoggingOut) return;
  clearReconnectTimer();
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    initWhatsApp();
  }, waitTimeMs);
}

function cleanupCurrentSocket() {
  if (!sock) return;
  try {
    sock.ev?.removeAllListeners('creds.update');
    sock.ev?.removeAllListeners('connection.update');
    sock.ws?.close();
    sock.end?.(undefined);
  } catch {}
  sock = null;
}

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
  } catch {}

  try {
    if (typeof fetchLatestWaWebVersion === 'function') {
      const { version } = await fetchLatestWaWebVersion({});
      if (version) return version;
    }
  } catch {}

  try {
    const { version } = await fetchLatestBaileysVersion();
    if (version) return version;
  } catch {}

  return [2, 3000, 1023223821];
}

async function initWhatsApp() {
  if (isInitializing || isShuttingDown || isLoggingOut) {
    return;
  }
  isInitializing = true;
  clearReconnectTimer();

  try {
    cleanupCurrentSocket();
    currentStatus = 'STARTING';
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const version = await getLatestWaVersion();
    console.log('Menggunakan WA Web Version:', version.join('.'));

    const activeSock = makeWASocket({
      version,
      logger,
      auth: state,
      browser: Browsers?.ubuntu ? Browsers.ubuntu('Chrome') : ['Ubuntu', 'Chrome', '22.04.4'],
      syncFullHistory: false,
      connectTimeoutMs: 60000,
    });
    sock = activeSock;

    activeSock.ev.on('creds.update', saveCreds);

    activeSock.ev.on('connection.update', async (update) => {
      if (sock !== activeSock || isShuttingDown) return;
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
        console.log('>> QR CODE BARU TERSEDIA UNTUK PEMINDAIAN <<');
        console.log('=======================================================\n');
      }

      if (connection === 'close') {
        if (isLoggingOut || isShuttingDown) return;

        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log('Koneksi terputus. Status code:', statusCode, 'Reconnect:', shouldReconnect);
        currentStatus = 'STOPPED';
        connectedUser = null;
        currentQrCodeDataUrl = null;

        if (statusCode === DisconnectReason.loggedOut) {
          console.log('Pengguna logout dari perangkat. Menghapus sesi lama...');
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch {}
          scheduleReconnect(2000);
        } else if (shouldReconnect) {
          connectionAttempts++;
          const waitTime = Math.min(connectionAttempts * 2000, 10000);
          console.log(`Mencoba menyambung kembali dalam ${waitTime / 1000} detik...`);
          scheduleReconnect(waitTime);
        }
      } else if (connection === 'open') {
        connectionAttempts = 0;
        currentStatus = 'WORKING';
        currentQrCodeDataUrl = null;

        const user = activeSock.user;
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
  } finally {
    isInitializing = false;
  }
}

function validateSessionParam(req, res, next) {
  const session = req.params.session || 'default';
  if (!SESSION_NAME_REGEX.test(session)) {
    return res.status(400).json({ error: 'Nama session tidak valid.' });
  }
  next();
}

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    status: currentStatus,
  });
});

app.use('/api', requireApiKey);

app.get('/api/sessions/:session', statusRateLimiter, validateSessionParam, (req, res) => {
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

app.get('/api/sessions/:session/auth/qr', statusRateLimiter, validateSessionParam, (req, res) => {
  if (currentStatus === 'SCAN_QR_CODE' && currentQrCodeDataUrl) {
    res.json({ status: 'SCAN_QR_CODE', qrCode: currentQrCodeDataUrl });
  } else {
    res.json({ status: currentStatus, qrCode: null });
  }
});

app.get('/api/sessions', statusRateLimiter, (req, res) => {
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

  if (!/^[1-9][0-9]{7,14}$/.test(cleanNumber)) {
    const invalidErr = new Error('Nomor WhatsApp tujuan tidak valid (wajib 8-15 digit angka).');
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

app.post('/api/sendImage', mutationRateLimiter, async (req, res) => {
  try {
    if (currentStatus !== 'WORKING' || !sock) {
      return res.status(503).json({
        error: 'Server WhatsApp Gateway belum terhubung. Silakan scan QR code terlebih dahulu.',
      });
    }

    const { chatId, file, caption } = req.body || {};
    const rawFile = file?.url || file?.data || req.body?.image;
    const rawCaption = String(file?.caption ?? caption ?? '');

    if (!chatId || !rawFile) {
      return res.status(400).json({ error: 'Parameter chatId dan file.url wajib disertakan.' });
    }

    if (rawCaption.length > 4096) {
      return res.status(400).json({ error: 'Caption gambar melebihi batas 4096 karakter.' });
    }

    const targetJid = await resolveWhatsAppJid(chatId);
    const imageBuffer = await decodeImageInput(rawFile);

    const result = await sock.sendMessage(targetJid, {
      image: imageBuffer,
      caption: rawCaption,
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

app.post('/api/sendText', mutationRateLimiter, async (req, res) => {
  try {
    if (currentStatus !== 'WORKING' || !sock) {
      return res.status(503).json({ error: 'Server WhatsApp belum terhubung.' });
    }

    const { chatId, text } = req.body || {};
    const cleanText = typeof text === 'string' ? text.trim() : '';

    if (!chatId || !cleanText) {
      return res.status(400).json({ error: 'Parameter chatId dan text wajib diisi.' });
    }

    if (cleanText.length > 10000) {
      return res.status(400).json({ error: 'Pesan teks melebihi batas 10.000 karakter.' });
    }

    const targetJid = await resolveWhatsAppJid(chatId);

    const result = await sock.sendMessage(targetJid, { text: cleanText });
    return res.json({ id: result?.key?.id, jid: targetJid, status: 'success' });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({ error: err.message });
  }
});

app.post(
  '/api/sessions/:session/logout',
  mutationRateLimiter,
  validateSessionParam,
  async (req, res) => {
    if (isLoggingOut) {
      return res.status(409).json({ error: 'Proses logout sedang berlangsung.' });
    }
    isLoggingOut = true;
    clearReconnectTimer();

    try {
      if (sock) {
        try {
          await sock.logout();
        } catch {}
        cleanupCurrentSocket();
      }
      try {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      } catch {}
      currentStatus = 'STOPPED';
      connectedUser = null;
      currentQrCodeDataUrl = null;
      res.json({ message: 'Logout berhasil. Menginisialisasi QR baru...' });
      await delay(1500);
    } catch (err) {
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    } finally {
      isLoggingOut = false;
      if (!isShuttingDown) {
        initWhatsApp();
      }
    }
  }
);

app.get('/', (req, res) => {
  if (process.env.ENABLE_GATEWAY_UI !== 'true') {
    return res.status(403).json({
      ok: true,
      service: 'madin-waha-gateway',
      message:
        'Halaman status langsung dinonaktifkan demi keamanan. Kelola koneksi WhatsApp melalui dasbor aplikasi utama.',
    });
  }

  const configuredKey = getConfiguredApiKey();
  const queryKey = typeof req.query?.apiKey === 'string' ? req.query.apiKey.trim() : '';
  const providedKey = extractRequestApiKey(req) || queryKey;
  if (!configuredKey || !isValidApiKeyConstantTime(providedKey, configuredKey)) {
    return res.status(401).json({
      error: 'Akses UI Gateway membutuhkan WAHA_API_KEY yang valid.',
    });
  }

  const isConnected = currentStatus === 'WORKING';
  const isQr = currentStatus === 'SCAN_QR_CODE' && currentQrCodeDataUrl;
  const safePhone = escapeHtml(connectedUser?.phone || '');
  const safeName = escapeHtml(connectedUser?.name || 'Madin Bot');
  const safePort = escapeHtml(PORT);
  const safeQrDataUrl =
    typeof currentQrCodeDataUrl === 'string' && currentQrCodeDataUrl.startsWith('data:image/png;base64,')
      ? escapeHtml(currentQrCodeDataUrl)
      : '';

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
    .connected-info { background: #dcfce7; border: 1px solid #86efac; border-radius: 18px; padding: 22px; margin-bottom: 20px; }
    .phone-number { font-size: 18px; font-weight: 800; color: #14532d; margin-top: 4px; }
    .api-hint { font-size: 11px; color: #64748b; margin-top: 18px; line-height: 1.5; background: #f1f5f9; padding: 10px; border-radius: 10px; }
  </style>
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
        <div class="phone-number">+${safePhone}</div>
        <p style="font-size: 12px; color: #15803d; margin-top: 4px;">Akun: <strong>${safeName}</strong></p>
      </div>
    `
        : isQr && safeQrDataUrl
        ? `
      <div class="status-badge status-qr">
        <span>SILAKAN SCAN QR CODE</span>
      </div>
      <div class="qr-box">
        <img src="${safeQrDataUrl}" alt="QR Code WhatsApp" />
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
      <code style="font-weight: 700; color: #0f172a;">http://localhost:${safePort}</code>
    </div>
  </div>
</body>
</html>`;

  res.send(html);
});

const httpServer = app.listen(PORT, () => {
  const configuredKey = getConfiguredApiKey();
  console.log(`\n========================================================`);
  console.log(` WhatsApp Gateway Madin berjalan di: http://localhost:${PORT}`);
  if (!configuredKey) {
    console.warn(` [PERINGATAN KEAMANAN] WAHA_API_KEY belum diset! Semua endpoint /api/* akan menolak request (503).`);
  } else if (IS_PRODUCTION && configuredKey.length < 32) {
    console.warn(` [PERINGATAN KEAMANAN] WAHA_API_KEY kurang dari 32 karakter di mode production!`);
  }
  console.log(` Health check : http://localhost:${PORT}/health`);
  console.log(`========================================================\n`);
  initWhatsApp();
});

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n[${signal}] Menutup WhatsApp Gateway secara aman...`);
  clearReconnectTimer();
  clearInterval(rateCleanupTimer);
  cleanupCurrentSocket();

  httpServer.close(() => {
    console.log('HTTP server ditutup.');
    process.exit(0);
  });

  setTimeout(() => {
    process.exit(0);
  }, 5000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
