'use client';

import React, { useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Check,
  Edit2,
  Sparkles,
  Info,
  CloudUpload,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  FolderInput,
  Loader2,
} from 'lucide-react';
import { useSidebarConfigStore } from '@/stores/useSidebarConfigStore';
import { ConfigMenuGroup, ConfigMenuItem, ConfigSubMenuItem } from '@/types/sidebar-config';

export default function SidebarConfigEditor() {
  const {
    groups,
    renameGroup,
    renameItem,
    renameSubItem,
    toggleGroupVisibility,
    toggleItemVisibility,
    moveGroup,
    moveItem,
    moveItemToGroup,
    resetToDefault,
    saveToSupabase,
    cloudSyncStatus,
    cloudMessage,
    lastUpdated,
  } = useSidebarConfigStore();

  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingSubItemId, setEditingSubItemId] = useState<string | null>(null);
  const [expandedSubMenuId, setExpandedSubMenuId] = useState<string | null>(null);

  const [groupDraftName, setGroupDraftName] = useState('');
  const [itemDraftName, setItemDraftName] = useState('');
  const [subItemDraftName, setSubItemDraftName] = useState('');

  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [targetGroupSelect, setTargetGroupSelect] = useState<string>('');

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Group rename
  const startEditGroup = (grp: ConfigMenuGroup) => {
    setEditingGroupId(grp.id);
    setGroupDraftName(grp.group);
  };

  const saveGroup = (groupId: string) => {
    if (groupDraftName.trim()) {
      renameGroup(groupId, groupDraftName.trim());
      showStatus(`Nama grup diperbarui menjadi "${groupDraftName.trim()}"`);
    }
    setEditingGroupId(null);
  };

  // Item rename
  const startEditItem = (item: ConfigMenuItem) => {
    setEditingItemId(item.id);
    setItemDraftName(item.title);
  };

  const saveItem = (groupId: string, itemId: string) => {
    if (itemDraftName.trim()) {
      renameItem(groupId, itemId, itemDraftName.trim());
      showStatus(`Nama menu diperbarui menjadi "${itemDraftName.trim()}"`);
    }
    setEditingItemId(null);
  };

  // Sub-item rename
  const startEditSubItem = (sub: ConfigSubMenuItem) => {
    setEditingSubItemId(sub.id);
    setSubItemDraftName(sub.title);
  };

  const saveSubItem = (groupId: string, itemId: string, subId: string) => {
    if (subItemDraftName.trim()) {
      renameSubItem(groupId, itemId, subId, subItemDraftName.trim());
      showStatus(`Nama sub-menu diperbarui menjadi "${subItemDraftName.trim()}"`);
    }
    setEditingSubItemId(null);
  };

  const toggleSubExpand = (itemId: string) => {
    setExpandedSubMenuId((prev) => (prev === itemId ? null : itemId));
  };

  const handleMoveToGroup = (sourceGroupId: string, itemId: string) => {
    if (targetGroupSelect && targetGroupSelect !== sourceGroupId) {
      moveItemToGroup(sourceGroupId, targetGroupSelect, itemId);
      const targetGroup = groups.find((g) => g.id === targetGroupSelect);
      showStatus(`Menu berhasil dipindahkan ke grup "${targetGroup?.group || targetGroupSelect}"`);
      setMovingItemId(null);
      setTargetGroupSelect('');
    }
  };

  const handleReset = () => {
    if (confirm('Kembalikan seluruh susunan sidebar dan nama menu ke pengaturan standar bawaan sistem?')) {
      resetToDefault();
      showStatus('Susunan sidebar telah di-reset ke bawaan standar!');
    }
  };

  const handleSaveToCloud = async () => {
    const success = await saveToSupabase();
    if (success) {
      showStatus('Berhasil disinkronkan ke Cloud Supabase & dicatat ke Log Audit!');
    }
  };

  return (
    <div data-testid="sidebar-editor-container" className="space-y-6">
      {/* Top Banner & Control Actions */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold mb-2 backdrop-blur-sm border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Kustomisasi Navigasi &amp; Sinkronisasi Dua Lapis</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              Ubah Susunan &amp; Tata Letak Menu Sidebar
            </h2>
            <p className="text-xs md:text-sm text-emerald-100/80 mt-1 max-w-xl">
              Ubah nama grup, sembunyikan/tampilkan menu, pindah urutan, ubah sub-menu, dan sinkronkan langsung ke basis data Supabase.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              data-testid="btn-save-cloud"
              onClick={handleSaveToCloud}
              disabled={cloudSyncStatus === 'syncing'}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold transition active:scale-95 shadow-md disabled:opacity-50"
            >
              {cloudSyncStatus === 'syncing' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4 text-slate-900" />
                  <span>Simpan ke Cloud</span>
                </>
              )}
            </button>

            <button
              type="button"
              data-testid="btn-reset-sidebar"
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition active:scale-95 shadow-sm"
            >
              <RotateCcw className="w-4 h-4 text-amber-300" />
              <span>Reset Standar</span>
            </button>
          </div>
        </div>

        {/* Cloud Status Indicator */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                cloudSyncStatus === 'synced'
                  ? 'bg-emerald-400 animate-pulse'
                  : cloudSyncStatus === 'syncing'
                  ? 'bg-amber-400 animate-spin'
                  : cloudSyncStatus === 'error'
                  ? 'bg-rose-400'
                  : 'bg-slate-400'
              }`}
            />
            <span className="text-white/80 font-medium">
              Status Sinkron: {cloudMessage || (cloudSyncStatus === 'synced' ? 'Tersimpan di Cloud' : 'Tersimpan Lokal di Peramban')}
            </span>
          </div>

          {lastUpdated && (
            <span className="text-[11px] text-white/50 font-mono">
              Terakhir diubah: {new Date(lastUpdated).toLocaleTimeString('id-ID')}
            </span>
          )}
        </div>

        {statusMessage && (
          <div className="mt-3 p-3 bg-emerald-700/90 border border-emerald-400/40 rounded-xl text-xs text-white font-medium flex items-center gap-2 animate-fade-in shadow-inner">
            <Check className="w-4 h-4 text-amber-300 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Info Tip */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold">Fitur Kustomisasi Fase 2:</p>
          <p className="text-amber-800">
            • Klik ikon mata <strong>[ 👁️ ]</strong> untuk menyembunyikan/menampilkan menu atau grup dari sidebar.
            <br />
            • Klik <strong>[ 🔀 Pindah Grup ]</strong> untuk memindahkan menu ke kategori grup lain.
            <br />
            • Buka accordion <strong>Sub-menu</strong> untuk mengubah nama tautan anak (misal: <em>Jadwal KBM Per Kelas</em>).
            <br />
            • Klik <strong>[ ☁️ Simpan ke Cloud ]</strong> agar perubahan tersimpan permanen di Supabase dan tercatat pada Log Audit Lembaga.
          </p>
        </div>
      </div>

      {/* Group List */}
      <div className="space-y-4">
        {groups.map((grp, grpIndex) => (
          <div
            key={grp.id}
            data-testid={`group-row-${grp.id}`}
            className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all ${
              grp.hidden
                ? 'border-dashed border-slate-300 opacity-60 bg-slate-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {/* Header Grup */}
            <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {grpIndex + 1}
                </span>

                {editingGroupId === grp.id ? (
                  <div className="flex items-center gap-2 flex-1 max-w-sm">
                    <input
                      type="text"
                      data-testid={`input-group-${grp.id}`}
                      value={groupDraftName}
                      onChange={(e) => setGroupDraftName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveGroup(grp.id)}
                      className="px-2.5 py-1 text-xs font-bold text-slate-800 border border-emerald-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-full"
                      autoFocus
                    />
                    <button
                      type="button"
                      data-testid={`btn-save-group-${grp.id}`}
                      onClick={() => saveGroup(grp.id)}
                      className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition"
                    >
                      Simpan
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-bold text-slate-800 text-sm tracking-wide truncate">
                      {grp.group}
                    </span>
                    <button
                      type="button"
                      data-testid={`btn-edit-group-${grp.id}`}
                      onClick={() => startEditGroup(grp)}
                      className="p-1 rounded-md text-slate-400 hover:text-emerald-700 hover:bg-slate-200/60 transition"
                      title="Ganti nama grup"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {grp.hidden && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-600 border border-rose-200">
                        Grup Disembunyikan
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Aksi Grup: Toggle Visibility & Naik / Turun */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[11px] font-medium text-slate-400 mr-1 hidden sm:inline">
                  {grp.items.length} Menu
                </span>

                {/* Toggle Visibility Grup */}
                <button
                  type="button"
                  data-testid={`btn-toggle-group-visibility-${grp.id}`}
                  onClick={() => {
                    toggleGroupVisibility(grp.id);
                    showStatus(
                      grp.hidden
                        ? `Grup "${grp.group}" ditampilkan kembali di sidebar`
                        : `Grup "${grp.group}" disembunyikan dari sidebar`
                    );
                  }}
                  className={`p-1.5 rounded-lg border transition ${
                    grp.hidden
                      ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                  title={grp.hidden ? 'Tampilkan Grup di Sidebar' : 'Sembunyikan Grup dari Sidebar'}
                >
                  {grp.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  data-testid={`btn-move-group-up-${grp.id}`}
                  onClick={() => {
                    moveGroup(grp.id, 'up');
                    showStatus(`Grup "${grp.group}" dipindahkan ke atas`);
                  }}
                  disabled={grpIndex === 0}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Pindahkan Grup ke Atas"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  data-testid={`btn-move-group-down-${grp.id}`}
                  onClick={() => {
                    moveGroup(grp.id, 'down');
                    showStatus(`Grup "${grp.group}" dipindahkan ke bawah`);
                  }}
                  disabled={grpIndex === groups.length - 1}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Pindahkan Grup ke Bawah"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Daftar Item Menu di Dalam Grup */}
            <div className="divide-y divide-slate-100">
              {grp.items.map((item, itemIndex) => (
                <div
                  key={item.id}
                  data-testid={`item-row-${item.id}`}
                  className={`px-4 py-3 transition ${
                    item.hidden ? 'bg-slate-50/60 opacity-60' : 'hover:bg-slate-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-slate-300 text-xs font-mono w-4">
                        {grpIndex + 1}.{itemIndex + 1}
                      </span>

                      {editingItemId === item.id ? (
                        <div className="flex items-center gap-2 flex-1 max-w-sm">
                          <input
                            type="text"
                            data-testid={`input-item-${item.id}`}
                            value={itemDraftName}
                            onChange={(e) => setItemDraftName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveItem(grp.id, item.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-800 border border-emerald-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-full"
                            autoFocus
                          />
                          <button
                            type="button"
                            data-testid={`btn-save-item-${item.id}`}
                            onClick={() => saveItem(grp.id, item.id)}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition"
                          >
                            Simpan
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 truncate flex-wrap">
                          <span
                            className={`text-sm font-semibold truncate ${
                              item.hidden ? 'text-slate-400 line-through' : 'text-slate-700'
                            }`}
                          >
                            {item.title}
                          </span>
                          <button
                            type="button"
                            data-testid={`btn-edit-item-${item.id}`}
                            onClick={() => startEditItem(item)}
                            className="p-1 rounded-md text-slate-400 hover:text-emerald-700 hover:bg-slate-200/50 transition"
                            title="Ganti nama menu"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {item.href && (
                            <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded hidden sm:inline">
                              {item.href}
                            </span>
                          )}

                          {item.children && (
                            <button
                              type="button"
                              data-testid={`btn-expand-sub-${item.id}`}
                              onClick={() => toggleSubExpand(item.id)}
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-full transition"
                            >
                              <span>{item.children.length} Sub-menu</span>
                              {expandedSubMenuId === item.id ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          )}

                          {item.hidden && (
                            <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">
                              Disembunyikan
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Aksi Menu: Pindah Grup, Visibility, Naik / Turun */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Tombol Buka Mode Pindah Grup */}
                      <button
                        type="button"
                        data-testid={`btn-open-move-group-${item.id}`}
                        onClick={() =>
                          setMovingItemId((prev) => (prev === item.id ? null : item.id))
                        }
                        className={`p-1.5 rounded-lg border text-xs transition ${
                          movingItemId === item.id
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                        title="Pindahkan Menu ke Grup Lain"
                      >
                        <FolderInput className="w-3.5 h-3.5" />
                      </button>

                      {/* Toggle Visibility Menu */}
                      <button
                        type="button"
                        data-testid={`btn-toggle-item-visibility-${item.id}`}
                        onClick={() => {
                          toggleItemVisibility(grp.id, item.id);
                          showStatus(
                            item.hidden
                              ? `Menu "${item.title}" ditampilkan di sidebar`
                              : `Menu "${item.title}" disembunyikan dari sidebar`
                          );
                        }}
                        className={`p-1.5 rounded-lg border transition ${
                          item.hidden
                            ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                        title={item.hidden ? 'Tampilkan Menu' : 'Sembunyikan Menu'}
                      >
                        {item.hidden ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        data-testid={`btn-move-item-up-${item.id}`}
                        onClick={() => {
                          moveItem(grp.id, item.id, 'up');
                          showStatus(`Menu "${item.title}" dipindahkan ke atas`);
                        }}
                        disabled={itemIndex === 0}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        title="Pindahkan Menu ke Atas"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        data-testid={`btn-move-item-down-${item.id}`}
                        onClick={() => {
                          moveItem(grp.id, item.id, 'down');
                          showStatus(`Menu "${item.title}" dipindahkan ke bawah`);
                        }}
                        disabled={itemIndex === grp.items.length - 1}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                        title="Pindahkan Menu ke Bawah"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Panel Pindah Grup Dropdown */}
                  {movingItemId === item.id && (
                    <div className="mt-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center gap-2 animate-fade-in">
                      <span className="text-xs font-semibold text-emerald-900">
                        Pindahkan menu ini ke grup:
                      </span>
                      <select
                        data-testid={`select-move-group-${item.id}`}
                        value={targetGroupSelect}
                        onChange={(e) => setTargetGroupSelect(e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-emerald-300 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">-- Pilih Grup Tujuan --</option>
                        {groups
                          .filter((g) => g.id !== grp.id)
                          .map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.group}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        data-testid={`btn-confirm-move-group-${item.id}`}
                        onClick={() => handleMoveToGroup(grp.id, item.id)}
                        disabled={!targetGroupSelect}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition"
                      >
                        Konfirmasi Pindah
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMovingItemId(null);
                          setTargetGroupSelect('');
                        }}
                        className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-800"
                      >
                        Batal
                      </button>
                    </div>
                  )}

                  {/* Accordion Sub-Menu Editor */}
                  {expandedSubMenuId === item.id && item.children && (
                    <div className="mt-3 ml-6 pl-4 border-l-2 border-amber-300 space-y-2 animate-fade-in">
                      <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wide">
                        Kelola Sub-Menu dari &quot;{item.title}&quot;:
                      </div>

                      <div className="space-y-1.5">
                        {item.children.map((sub, subIdx) => (
                          <div
                            key={sub.id}
                            data-testid={`subitem-row-${sub.id}`}
                            className="flex items-center justify-between p-2 rounded-lg bg-amber-50/60 border border-amber-100 hover:bg-amber-100/50 transition"
                          >
                            {editingSubItemId === sub.id ? (
                              <div className="flex items-center gap-2 flex-1 max-w-sm">
                                <input
                                  type="text"
                                  data-testid={`input-sub-${sub.id}`}
                                  value={subItemDraftName}
                                  onChange={(e) => setSubItemDraftName(e.target.value)}
                                  onKeyDown={(e) =>
                                    e.key === 'Enter' && saveSubItem(grp.id, item.id, sub.id)
                                  }
                                  className="px-2 py-1 text-xs font-semibold text-slate-800 border border-amber-500 rounded-md bg-white w-full focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  data-testid={`btn-save-sub-${sub.id}`}
                                  onClick={() => saveSubItem(grp.id, item.id, sub.id)}
                                  className="px-2 py-1 bg-amber-600 text-white text-xs font-bold rounded-md hover:bg-amber-700 transition"
                                >
                                  Simpan
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono text-slate-400">
                                  {subIdx + 1}.
                                </span>
                                <span className="text-xs font-semibold text-slate-800">
                                  {sub.title}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 bg-white/70 px-1.5 py-0.5 rounded">
                                  {sub.href}
                                </span>
                              </div>
                            )}

                            <button
                              type="button"
                              data-testid={`btn-edit-sub-${sub.id}`}
                              onClick={() => startEditSubItem(sub)}
                              className="p-1 rounded text-slate-400 hover:text-amber-700 transition"
                              title="Ganti nama sub-menu"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
