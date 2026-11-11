'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  X,
  Scan,
  RefreshCw,
  Zap,
  ZapOff,
  Building2,
  Package,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Search,
  ExternalLink,
  MapPin,
  Clock,
  User,
} from 'lucide-react';
import { useSaprasStore } from '@/stores/useSaprasStore';
import {
  InventarisMadinItem,
  KATEGORI_INVENTARIS_MADIN_META,
  KONDISI_SAPRAS_META,
  SaprasTempatLokasi,
} from '@/types/sapras';
import { generateQrSvgPath } from '@/lib/utils/qrSvgGenerator';

interface ModalBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset?: (asset: InventarisMadinItem) => void;
  onSelectTempat?: (tempat: SaprasTempatLokasi) => void;
  onOpenMutasi?: (asset: InventarisMadinItem) => void;
  onAuditKelas?: (kelasCode: string) => void;
}

export type ScanResultType = 'ASET' | 'LOKASI' | 'KELAS' | 'LOGISTIK' | 'UNKNOWN';

export interface ParsedScanResult {
  raw: string;
  type: ScanResultType;
  asset?: InventarisMadinItem;
  tempat?: SaprasTempatLokasi;
  kelasCode?: string;
  logistikSku?: string;
  title: string;
  description: string;
}

export function ModalBarcodeScanner({
  isOpen,
  onClose,
  onSelectAsset,
  onSelectTempat,
  onOpenMutasi,
  onAuditKelas,
}: ModalBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<ParsedScanResult | null>(null);

  const { inventarisMadinList, tempatList, logistikStok } = useSaprasStore();

  // Play synthetic pleasant beep via Web Audio API
  const playBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 30, 40]);
      }
    } catch {
      // Ignore audio policy restriction
    }
  }, []);

  // Parse any scanned text or barcode string
  const parseCode = useCallback(
    (codeText: string): ParsedScanResult => {
      const text = codeText.trim();
      const upper = text.toUpperCase();

      // 1. Cek apakah ASET Inventaris Madin (MBD-AST-... atau MBD:AST:...)
      if (upper.startsWith('MBD-AST-') || upper.startsWith('MBD:AST:') || upper.startsWith('AST-')) {
        const cleanCode = upper.replace(/:/g, '-');
        const found = inventarisMadinList.find(
          (i) => i.kodeBarcode.toUpperCase() === cleanCode || i.kodeBarcode.toUpperCase() === upper
        );
        if (found) {
          const loc = tempatList.find((t) => t.id === found.tempatId);
          return {
            raw: text,
            type: 'ASET',
            asset: found,
            title: found.namaBarang,
            description: `Aset Terdaftar di ${loc?.nama || 'Lokasi Madin'} • Kondisi: ${KONDISI_SAPRAS_META[found.kondisi]?.label || found.kondisi}`,
          };
        }
        return {
          raw: text,
          type: 'ASET',
          title: `Kode Aset: ${text}`,
          description: 'Aset tidak ditemukan dalam database saat ini atau kode belum terdaftar.',
        };
      }

      // 2. Cek apakah LOKASI Kantor / Posko (MBD-LOC-... atau MBD:LOC:...)
      if (upper.startsWith('MBD-LOC-') || upper.startsWith('MBD:LOC:') || upper.startsWith('LOC-')) {
        const parts = upper.split(/[-:]/);
        const locCode = parts[parts.length - 1];
        const found = tempatList.find(
          (t) => t.kode.toUpperCase() === locCode || t.id.toUpperCase() === upper.toLowerCase()
        );
        if (found) {
          const itemCount = inventarisMadinList.filter((i) => i.tempatId === found.id).length;
          return {
            raw: text,
            type: 'LOKASI',
            tempat: found,
            title: found.nama,
            description: `Kode: ${found.kode} • PIC: ${found.penanggungJawab || '-'} • Memiliki ${itemCount} aset terdaftar.`,
          };
        }
        return {
          raw: text,
          type: 'LOKASI',
          title: `Lokasi: ${text}`,
          description: 'Kode tempat belum terdaftar di pengaturan lokasi Madin.',
        };
      }

      // 3. Cek apakah KELAS KBM (MBD-KLS-... atau MBD:KLS:...)
      if (upper.startsWith('MBD-KLS-') || upper.startsWith('MBD:KLS:') || upper.startsWith('KLS-')) {
        return {
          raw: text,
          type: 'KELAS',
          kelasCode: text,
          title: `Smart Room Tag: ${text}`,
          description: 'Pintu Ruang Kelas KBM Santri terdeteksi. Siap untuk audit kelayakan atau lapor fasilitas.',
        };
      }

      // 4. Cek apakah LOGISTIK (MBD-LOG-... atau MBD:LOG:...)
      if (upper.startsWith('MBD-LOG-') || upper.startsWith('MBD:LOG:') || upper.startsWith('ATK-') || upper.startsWith('ELK-')) {
        const cleanSku = upper.replace(/^MBD[-:]LOG[-:]/, '');
        const found = logistikStok.find((l) => l.kode.toUpperCase() === cleanSku || l.kode.toUpperCase() === upper);
        if (found) {
          return {
            raw: text,
            type: 'LOGISTIK',
            logistikSku: found.kode,
            title: found.namaBarang,
            description: `SKU: ${found.kode} • Sisa Stok Gudang: ${found.stokSaatIni} ${found.satuan}`,
          };
        }
      }

      // 5. Default pencarian berdasarkan nama aset atau kode barcode apapun
      const fallbackAsset = inventarisMadinList.find(
        (i) =>
          i.kodeBarcode.toLowerCase() === text.toLowerCase() ||
          i.namaBarang.toLowerCase().includes(text.toLowerCase())
      );
      if (fallbackAsset) {
        const loc = tempatList.find((t) => t.id === fallbackAsset.tempatId);
        return {
          raw: text,
          type: 'ASET',
          asset: fallbackAsset,
          title: fallbackAsset.namaBarang,
          description: `Aset Terdaftar di ${loc?.nama || 'Lokasi Madin'} • Kondisi: ${KONDISI_SAPRAS_META[fallbackAsset.kondisi]?.label || fallbackAsset.kondisi}`,
        };
      }

      return {
        raw: text,
        type: 'UNKNOWN',
        title: `Hasil Pindai: ${text}`,
        description: 'Format barcode belum sesuai dengan standar MBD-AST, MBD-LOC, atau MBD-KLS.',
      };
    },
    [inventarisMadinList, tempatList, logistikStok]
  );

  const handleApplyCode = (code: string) => {
    if (!code.trim()) return;
    playBeep();
    const result = parseCode(code);
    setScanResult(result);
  };

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  // Start camera with facing mode
  const startCamera = useCallback(
    async (mode: 'environment' | 'user') => {
      setCameraError(null);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Browser tidak mendukung WebRTC kamera. Silakan gunakan input manual kode.');
        return;
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play().catch(() => {});
        }

        // Check torch capability
        const track = mediaStream.getVideoTracks()[0];
        const capabilities = track.getCapabilities ? (track.getCapabilities() as { torch?: boolean }) : {};
        setHasTorch(Boolean(capabilities.torch));
      } catch (err: unknown) {
        console.warn('Gagal akses kamera ideal:', err);
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          setStream(fallbackStream);
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            await videoRef.current.play().catch(() => {});
          }
        } catch (fbErr: unknown) {
          const msg = fbErr instanceof Error ? fbErr.message : String(fbErr);
          setCameraError(`Kamera tidak dapat diakses (${msg}). Anda dapat memasukkan kode secara manual di bawah.`);
        }
      }
    },
    [stream]
  );

  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
      const nextTorch = !torchOn;
      await (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch {
      // Torch not supported
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScanResult(null);
      setManualCode('');
      setTorchOn(false);
      return;
    }
    startCamera(facingMode);
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-scanner-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header Scanner */}
        <div className="px-5 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Scan className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 id="modal-scanner-title" className="text-sm sm:text-base font-extrabold text-white">
                Pemindai Barcode & QR PKM. Sapras
              </h2>
              <p className="text-[11px] text-slate-400">
                Pindai stiker fisik meja, inventaris kantor, atau QR pintu kelas
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Tutup modal scanner"
            data-testid="btn-close-scanner"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Scanner Kamera */}
        <div className="relative bg-black aspect-4/3 sm:aspect-16/10 flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-slate-400 max-w-sm">
              <Camera className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-xs text-rose-400 font-medium mb-1">Akses Kamera Terkendala</p>
              <p className="text-[11px] text-slate-400 mb-4">{cameraError}</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
              >
                Coba Buka Kamera Lagi
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Laser HUD Frame */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
                <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-emerald-500/40 rounded-3xl overflow-hidden shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                  {/* Neon laser line animating up & down */}
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-bounce" />

                  {/* Corner Marks */}
                  <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />

                  <div className="absolute bottom-3 inset-x-0 text-center">
                    <span className="text-[10px] font-mono tracking-wider text-emerald-400/90 bg-black/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      ARAHKAN KE BARCODE / QR
                    </span>
                  </div>
                </div>
              </div>

              {/* Controls Overlay */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`p-2 rounded-xl backdrop-blur-md border transition-all ${
                      torchOn
                        ? 'bg-amber-500 text-white border-amber-400 shadow-lg'
                        : 'bg-black/50 text-white/80 border-white/20 hover:bg-black/70'
                    }`}
                    title={torchOn ? 'Matikan Senter' : 'Nyalakan Senter'}
                  >
                    {torchOn ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
                  }
                  className="p-2 rounded-xl bg-black/50 backdrop-blur-md text-white/80 border border-white/20 hover:bg-black/70 transition-colors"
                  title="Ganti Kamera Depan/Belakang"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Scan Result Card or Manual Input */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 bg-slate-900">
          {scanResult ? (
            <div className="bg-slate-800/90 border border-emerald-500/40 rounded-2xl p-4 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      scanResult.type === 'ASET'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        : scanResult.type === 'LOKASI'
                        ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {scanResult.type === 'ASET' ? (
                      <Package className="w-5 h-5" />
                    ) : scanResult.type === 'LOKASI' ? (
                      <Building2 className="w-5 h-5" />
                    ) : (
                      <Scan className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                        {scanResult.type}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{scanResult.raw}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white mt-1">{scanResult.title}</h3>
                    <p className="text-xs text-slate-300 mt-0.5">{scanResult.description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setScanResult(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                  title="Pindai Ulang"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Action Buttons based on scanned entity */}
              <div className="mt-3 pt-3 border-t border-slate-700/60 flex flex-wrap items-center gap-2">
                {scanResult.asset && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectAsset?.(scanResult.asset!);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Lihat Kartu Aset
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenMutasi?.(scanResult.asset!);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Pindahkan / Mutasi
                    </button>
                  </>
                )}

                {scanResult.tempat && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTempat?.(scanResult.tempat!);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Buka Aset di Ruangan Ini
                  </button>
                )}

                {scanResult.type === 'KELAS' && (
                  <button
                    type="button"
                    onClick={() => {
                      onAuditKelas?.(scanResult.kelasCode || scanResult.raw);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mulai Audit Kelas
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                Input Kode Barcode Manual atau Uji Coba:
              </label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleApplyCode(manualCode);
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Contoh: MBD-AST-ELK-001 / MBD-LOC-KMP"
                    className="w-full bg-slate-800 text-white placeholder-slate-500 pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                >
                  Cari / Cek
                </button>
              </form>

              {/* Quick sample click buttons for easy testing */}
              <div>
                <p className="text-[11px] text-slate-400 mb-1.5">Sampel Barcode Tersedia (Klik Cepat):</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApplyCode('MBD-AST-ELK-001')}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-mono text-emerald-400 transition-colors"
                  >
                    MBD-AST-ELK-001 (Printer Pusat)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyCode('MBD-LOC-KMP')}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-mono text-purple-400 transition-colors"
                  >
                    MBD-LOC-KMP (Kantor Pusat)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyCode('MBD-LOC-KM-GP')}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-mono text-purple-400 transition-colors"
                  >
                    MBD-LOC-KM-GP (Kantor GP)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyCode('MBD-KLS-ULA-1-A-PA')}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-mono text-blue-400 transition-colors"
                  >
                    MBD-KLS-ULA-1-A-PA (Pintu 1A Ula)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
