'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Dialog from '@/components/ui/Dialog';
import { Camera, RefreshCw, X, AlertCircle, Upload } from 'lucide-react';
import { cropVideoTo3x4, compressImageFile } from '@/lib/utils/image';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64: string) => void;
}

export default function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isStarting, setIsStarting] = useState(false);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    setIsStarting(true);
    setErrorMsg(null);

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('Perangkat atau browser Anda tidak mendukung akses kamera langsung (WebRTC).');
      setIsStarting(false);
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: unknown) {
      console.warn('Gagal membuka kamera dengan facingMode ideal, mencoba fallback video sederhana:', err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        setStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (fallbackErr: unknown) {
        const message = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        setErrorMsg('Tidak dapat mengakses kamera: ' + message + '. Anda dapat memilih foto dari galeri/file.');
      }
    } finally {
      setIsStarting(false);
    }
  }, [stream]);

  // Mulai / Hentikan Kamera saat modal buka / tutup
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setErrorMsg(null);
      return;
    }

    startCamera(facingMode);

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, startCamera, stopCamera]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    try {
      const base64 = cropVideoTo3x4(videoRef.current, 450, 0.8);
      if (base64) {
        onCapture(base64);
        onClose();
      }
    } catch (err) {
      console.error('Error saat mengambil foto:', err);
    }
  };

  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleFallbackFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file, 600, 0.75);
      onCapture(compressed);
      onClose();
    } catch {
      alert('Gagal memproses foto dari file.');
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Ambil Foto Santri Langsung (Kamera 3x4)"
      maxWidth="md"
    >
      <div className="space-y-4">
        {errorMsg ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Akses Kamera Bermasalah</p>
                <p className="mt-0.5 text-amber-700">{errorMsg}</p>
              </div>
            </div>
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => fallbackInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs transition"
              >
                <Upload className="w-3.5 h-3.5" />
                Pilih Dari File / Kamera HP
              </button>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-[360px] bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-700 shadow-inner">
            {isStarting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 text-white z-20">
                <RefreshCw className="w-6 h-6 animate-spin mb-2 text-madin-400" />
                <span className="text-xs">Menyiapkan kamera...</span>
              </div>
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Overlay Grid 3x4 Guideline */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-[180px] h-[240px] border-2 border-white/80 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] relative flex items-center justify-center">
                <div className="absolute top-2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-white/90 font-medium">
                  Rasio Pas Foto 3x4
                </div>
                <div className="w-24 h-32 border border-dashed border-white/40 rounded-full opacity-60" />
              </div>
            </div>

            {/* Tombol Ganti Kamera (Front/Back) */}
            <button
              type="button"
              onClick={handleToggleFacingMode}
              title="Ganti Kamera Depan / Belakang"
              className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-xs transition z-30"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}

        <input
          type="file"
          ref={fallbackInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleFallbackFile}
          className="hidden"
        />

        {/* Footer Tombol Kontrol */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
          >
            <X className="w-3.5 h-3.5" />
            Batal
          </button>

          {!errorMsg && (
            <button
              type="button"
              onClick={handleCapture}
              disabled={isStarting}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              Jepret Foto 3x4
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
