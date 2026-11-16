'use client';

import React, { useEffect, useState } from 'react';
import { X, Check, Sliders } from 'lucide-react';
import { useGaleriSosmedStore } from '@/stores/useGaleriSosmedStore';
import { CreatorChannelConfig } from '@/types/galeri-sosmed';

export default function ModalChannelConfigSosmed() {
  const {
    channelConfig,
    isChannelModalOpen,
    closeChannelModal,
    saveChannelConfig,
  } = useGaleriSosmedStore();

  const [form, setForm] = useState<CreatorChannelConfig>(channelConfig);

  useEffect(() => {
    setForm(channelConfig);
  }, [channelConfig, isChannelModalOpen]);

  useEffect(() => {
    if (!isChannelModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeChannelModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isChannelModalOpen, closeChannelModal]);

  if (!isChannelModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveChannelConfig(form);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-channel-config-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-[#0b5751] to-[#0e6962] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-amber-300" />
            <h3 id="modal-channel-config-title" className="text-base font-bold font-serif">
              Pengaturan Profil Studio &amp; Kanal Resmi Media Madin
            </h3>
          </div>
          <button
            type="button"
            onClick={closeChannelModal}
            aria-label="Tutup pengaturan kanal"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Nama Studio / Identitas Portofolio
            </label>
            <input
              type="text"
              required
              value={form.creatorTitle}
              onChange={(e) => setForm({ ...form, creatorTitle: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Tagline / Bio Studio Kreator
            </label>
            <textarea
              rows={2}
              required
              value={form.creatorTagline}
              onChange={(e) => setForm({ ...form, creatorTagline: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Username YouTube
              </label>
              <input
                type="text"
                value={form.youtubeHandle}
                onChange={(e) => setForm({ ...form, youtubeHandle: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                URL Kanal YouTube
              </label>
              <input
                type="url"
                value={form.youtubeUrl}
                onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Username Instagram
              </label>
              <input
                type="text"
                value={form.instagramHandle}
                onChange={(e) => setForm({ ...form, instagramHandle: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                URL Profil Instagram
              </label>
              <input
                type="url"
                value={form.instagramUrl}
                onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Username TikTok
              </label>
              <input
                type="text"
                value={form.tiktokHandle}
                onChange={(e) => setForm({ ...form, tiktokHandle: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                URL Profil TikTok
              </label>
              <input
                type="url"
                value={form.tiktokUrl}
                onChange={(e) => setForm({ ...form, tiktokUrl: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeChannelModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 text-xs font-extrabold"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Profil Kanal</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
