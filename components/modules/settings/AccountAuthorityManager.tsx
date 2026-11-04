'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Shield,
  UserPlus,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
  Lock,
  Layers,
  Users,
  Settings,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useRbacStore, UpsertAccountInput } from '@/stores/useRbacStore';
import {
  APP_PAGE_CATALOG,
  AppPageId,
  GenderScope,
  PageAccessMode,
  PagePermissionsMap,
  PengaturanAuthorityStatus,
  UserAccountRecord,
} from '@/types/rbac';
import {
  createDefaultPagePermissions,
  createDefaultSpecialAuthorities,
} from '@/lib/utils/rbacHelper';
import {
  DEFAULT_HIERARCHY_RULES,
  extractHierarchyEnums,
  loadHierarchyRules,
} from '@/lib/services/hierarchy-service';

export default function AccountAuthorityManager() {
  const {
    currentAccount,
    accountsList,
    isLoadingList,
    fetchAllAccounts,
    upsertAccount,
    deleteAccount,
  } = useRbacStore();

  const [availableBloks, setAvailableBloks] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [roleType, setRoleType] = useState<'custom_user' | 'master_admin'>('custom_user');
  const [roleLabel, setRoleLabel] = useState('Pengurus');

  const [pagePermissions, setPagePermissions] = useState<PagePermissionsMap>(() =>
    createDefaultPagePermissions('edit')
  );
  const [isAllBlok, setIsAllBlok] = useState(true);
  const [selectedBloks, setSelectedBloks] = useState<string[]>([]);
  const [genderScope, setGenderScope] = useState<GenderScope>('semua');
  const [pengaturanStatus, setPengaturanStatus] =
    useState<PengaturanAuthorityStatus>('aktif');
  const [hideEditPages, setHideEditPages] = useState<AppPageId[]>([]);
  const [hideDeletePages, setHideDeletePages] = useState<AppPageId[]>([]);

  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserAccountRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Muat daftar akun dan daftar Blok dari Hierarki Kamar (Tree 1 Gambar 2)
  useEffect(() => {
    fetchAllAccounts();
    loadHierarchyRules()
      .then((rules) => {
        const enums = extractHierarchyEnums(
          rules && rules.length > 0 ? rules : DEFAULT_HIERARCHY_RULES
        );
        setAvailableBloks(enums.bloks);
      })
      .catch(() => {
        const fallback = extractHierarchyEnums(DEFAULT_HIERARCHY_RULES);
        setAvailableBloks(fallback.bloks);
      });
  }, [fetchAllAccounts]);

  const groupedCatalog = useMemo(() => {
    const map = new Map<string, typeof APP_PAGE_CATALOG>();
    for (const item of APP_PAGE_CATALOG) {
      const existing = map.get(item.group) || [];
      existing.push(item);
      map.set(item.group, existing);
    }
    return Array.from(map.entries());
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setUsername('');
    setFullName('');
    setPassword('');
    setShowPassword(false);
    setRoleType('custom_user');
    setRoleLabel('Pengurus');
    setPagePermissions(createDefaultPagePermissions('edit'));
    const defaults = createDefaultSpecialAuthorities();
    setIsAllBlok(true);
    setSelectedBloks([]);
    setGenderScope(defaults.gender_scope);
    setPengaturanStatus(defaults.pengaturan_status);
    setHideEditPages([]);
    setHideDeletePages([]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (acc: UserAccountRecord) => {
    setEditingId(acc.id);
    setUsername(acc.username);
    setFullName(acc.full_name);
    setPassword('');
    setShowPassword(false);
    const isMaster = acc.role === 'master_admin' || acc.username === 'admin';
    setRoleType(isMaster ? 'master_admin' : 'custom_user');
    setRoleLabel(acc.role_label || (isMaster ? 'Master Admin' : 'Pengurus'));
    setPagePermissions({ ...acc.page_permissions });

    const sa = acc.special_authorities;
    if (sa.blok_scope === 'SEMUA' || !Array.isArray(sa.blok_scope)) {
      setIsAllBlok(true);
      setSelectedBloks([]);
    } else {
      setIsAllBlok(false);
      setSelectedBloks([...sa.blok_scope]);
    }
    setGenderScope(sa.gender_scope || 'semua');
    setPengaturanStatus(sa.pengaturan_status || 'aktif');
    setHideEditPages([...(sa.hide_edit_pages || [])]);
    setHideDeletePages([...(sa.hide_delete_pages || [])]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSetAllPagesAccess = (mode: PageAccessMode) => {
    setPagePermissions(createDefaultPagePermissions(mode));
    if (mode === 'sembunyikan') {
      setPengaturanStatus('non_aktif');
    }
  };

  const handleToggleBlok = (blokName: string) => {
    setIsAllBlok(false);
    setSelectedBloks((prev) =>
      prev.includes(blokName)
        ? prev.filter((b) => b !== blokName)
        : [...prev, blokName]
    );
  };

  const handleToggleHideEditPage = (pageId: AppPageId) => {
    setHideEditPages((prev) =>
      prev.includes(pageId)
        ? prev.filter((p) => p !== pageId)
        : [...prev, pageId]
    );
  };

  const handleToggleHideDeletePage = (pageId: AppPageId) => {
    setHideDeletePages((prev) =>
      prev.includes(pageId)
        ? prev.filter((p) => p !== pageId)
        : [...prev, pageId]
    );
  };

  const handlePengaturanStatusChange = (status: PengaturanAuthorityStatus) => {
    setPengaturanStatus(status);
    if (status === 'non_aktif') {
      setPagePermissions((prev) => ({ ...prev, pengaturan: 'sembunyikan' }));
    } else if (pagePermissions.pengaturan === 'sembunyikan') {
      setPagePermissions((prev) => ({ ...prev, pengaturan: 'baca' }));
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanFullName = fullName.trim();

    if (!cleanUsername || !cleanFullName) {
      setFormError('Username dan Nama Lengkap wajib diisi.');
      return;
    }

    if (!editingId && password.trim().length < 6) {
      setFormError('Kata sandi untuk akun baru minimal 6 karakter.');
      return;
    }

    if (editingId && password.trim().length > 0 && password.trim().length < 6) {
      setFormError('Kata sandi baru minimal 6 karakter (atau kosongkan jika tidak diubah).');
      return;
    }

    if (!isAllBlok && selectedBloks.length === 0) {
      setFormError('Pilih minimal 1 Blok atau aktifkan pilihan "Semua Blok".');
      return;
    }

    setIsSaving(true);

    const finalPermissions: PagePermissionsMap = {
      ...pagePermissions,
      pengaturan:
        pengaturanStatus === 'non_aktif'
          ? 'sembunyikan'
          : pagePermissions.pengaturan,
    };

    const payload: UpsertAccountInput = {
      id: editingId,
      username: cleanUsername,
      password: password.trim() || undefined,
      full_name: cleanFullName,
      role: cleanUsername === 'admin' ? 'master_admin' : roleType,
      role_label:
        roleLabel.trim() ||
        (roleType === 'master_admin' ? 'Master Admin' : 'Pengurus'),
      page_permissions: finalPermissions,
      special_authorities: {
        blok_scope: isAllBlok ? 'SEMUA' : selectedBloks,
        gender_scope: genderScope,
        pengaturan_status: pengaturanStatus,
        hide_edit_pages: hideEditPages,
        hide_delete_pages: hideDeletePages,
      },
    };

    const res = await upsertAccount(payload);
    setIsSaving(false);

    if (!res.ok) {
      setFormError(res.error || 'Gagal menyimpan konfigurasi akun.');
      return;
    }

    setIsModalOpen(false);
    setFeedbackToast(
      editingId
        ? `Akun @${cleanUsername} beserta otoritasnya berhasil diperbarui.`
        : `Akun baru @${cleanUsername} berhasil dibuat.`
    );
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const res = await deleteAccount(deleteTarget.id, deleteTarget.username);
    setIsDeleting(false);
    if (res.ok) {
      setFeedbackToast(`Akun @${deleteTarget.username} telah dihapus.`);
      setDeleteTarget(null);
      setTimeout(() => setFeedbackToast(null), 4000);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Panel Manajemen Akun */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Manajemen Akun &amp; Otoritas Pengurus
            </h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Buat, ubah, atau hapus akun pengurus serta atur otoritas halaman (Baca, Edit, Sembunyikan) dan 5 aturan otoritas khusus (Blok, Gender, Pengaturan, Edit, Hapus).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => fetchAllAccounts()}
            disabled={isLoadingList}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingList ? 'animate-spin' : ''}`} />
            <span>Muat Ulang</span>
          </button>

          <button
            type="button"
            data-testid="btn-tambah-akun"
            onClick={openCreateModal}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0b5751] hover:bg-[#115e59] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Akun Baru</span>
          </button>
        </div>
      </div>

      {feedbackToast && (
        <div
          role="status"
          aria-live="polite"
          className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2.5"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Daftar Akun Terdaftar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {accountsList.map((acc) => {
          const isMaster = acc.role === 'master_admin' || acc.username === 'admin';
          const isSelf = currentAccount?.id === acc.id;
          const perms = Object.values(acc.page_permissions || {});
          const countEdit = perms.filter((m) => m === 'edit').length;
          const countBaca = perms.filter((m) => m === 'baca').length;
          const countHide = perms.filter((m) => m === 'sembunyikan').length;

          const sa = acc.special_authorities;
          const blokSummary =
            sa.blok_scope === 'SEMUA' || !Array.isArray(sa.blok_scope)
              ? 'Semua Blok'
              : `${sa.blok_scope.length} Blok (${sa.blok_scope.slice(0, 3).join(', ')}${
                  sa.blok_scope.length > 3 ? '...' : ''
                })`;

          const genderSummary =
            sa.gender_scope === 'putra'
              ? 'Khusus Putra (PA)'
              : sa.gender_scope === 'putri'
              ? 'Khusus Putri (PI)'
              : 'Semua Gender (PA & PI)';

          return (
            <div
              key={acc.id}
              data-testid={`account-card-${acc.username}`}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900">
                        {acc.full_name}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          isMaster
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {acc.role_label}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-600 mt-0.5">
                      Username: <strong className="text-slate-900">@{acc.username}</strong>
                    </p>
                  </div>
                </div>

                {/* Ringkasan Matriks & Otoritas Khusus */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                      {countEdit} Halaman Edit
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 font-semibold">
                      {countBaca} Halaman Baca
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                      {countHide} Disembunyikan
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-slate-700">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                      <span className="text-slate-500 block">Otoritas Blok:</span>
                      <span className="font-bold text-slate-800">{blokSummary}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                      <span className="text-slate-500 block">Otoritas Gender:</span>
                      <span className="font-bold text-slate-800">{genderSummary}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                      <span className="text-slate-500 block">Otoritas Pengaturan:</span>
                      <span
                        className={`font-bold ${
                          sa.pengaturan_status === 'non_aktif'
                            ? 'text-rose-700'
                            : 'text-emerald-800'
                        }`}
                      >
                        {sa.pengaturan_status === 'non_aktif' ? 'Non-Aktif (Disembunyikan)' : 'Aktif'}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                      <span className="text-slate-500 block">Pembatasan Tombol:</span>
                      <span className="font-bold text-slate-800">
                        Edit Off: {sa.hide_edit_pages.length} hal · Hapus Off: {sa.hide_delete_pages.length} hal
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                {acc.username !== 'admin' && !isSelf && (
                  <button
                    type="button"
                    data-testid={`btn-hapus-akun-${acc.username}`}
                    onClick={() => setDeleteTarget(acc)}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold inline-flex items-center gap-1.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Akun</span>
                  </button>
                )}

                <button
                  type="button"
                  data-testid={`btn-edit-akun-${acc.username}`}
                  onClick={() => openEditModal(acc)}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Akun &amp; Otoritas</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Konfirmasi Hapus Akun */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 shadow-xl space-y-4">
            <h3 id="delete-account-title" className="text-base font-bold text-slate-900">
              Konfirmasi Hapus Akun Pengurus
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun <strong>{deleteTarget.full_name}</strong> (
              <span className="font-mono">@{deleteTarget.username}</span>)? Akun ini tidak akan dapat masuk lagi ke sistem.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                data-testid="btn-konfirmasi-hapus-akun"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Akun'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Buat / Edit Akun & Otoritas */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-account-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 overflow-y-auto"
        >
          <div className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 id="modal-account-title" className="text-base font-bold">
                  {editingId
                    ? `Edit Akun & Otoritas (@${username})`
                    : 'Buat Akun Pengurus & Atur Otoritas'}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Konfigurasikan kredensial login, matriks akses halaman, dan 5 otoritas khusus.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Tutup modal konfigurasi akun"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveAccount} className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
              {formError && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-semibold flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* BAGIAN 1: IDENTITAS & KREDENSIAL */}
              <section className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                  <Lock className="w-4 h-4 text-[#0b5751]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    1. Identitas &amp; Kredensial Login (Supabase Auth)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="acc-fullname"
                      className="block text-xs font-bold text-slate-800 mb-1"
                    >
                      Nama Lengkap / Nama Akun
                    </label>
                    <input
                      id="acc-fullname"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Contoh: PKM. Kurikulum / Pengurus Blok 4"
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b5751]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="acc-username"
                      className="block text-xs font-bold text-slate-800 mb-1"
                    >
                      Username Login
                    </label>
                    <input
                      id="acc-username"
                      type="text"
                      required
                      disabled={username === 'admin' && Boolean(editingId)}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Contoh: kurikulum atau blok4pa"
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono text-slate-900 disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0b5751]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="acc-password"
                      className="block text-xs font-bold text-slate-800 mb-1"
                    >
                      {editingId
                        ? 'Kata Sandi Baru (Kosongkan jika tidak diubah)'
                        : 'Kata Sandi Login'}
                    </label>
                    <div className="relative">
                      <input
                        id="acc-password"
                        type={showPassword ? 'text' : 'password'}
                        required={!editingId}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={
                          editingId
                            ? 'Ketik sandi baru untuk mereset...'
                            : 'Minimal 6 karakter'
                        }
                        className="w-full min-h-[40px] pl-3 pr-10 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b5751]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label
                        htmlFor="acc-role-label"
                        className="block text-xs font-bold text-slate-800 mb-1"
                      >
                        Label Jabatan
                      </label>
                      <input
                        id="acc-role-label"
                        type="text"
                        value={roleLabel}
                        onChange={(e) => setRoleLabel(e.target.value)}
                        placeholder="PKM. Kurikulum"
                        className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b5751]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="acc-role-type"
                        className="block text-xs font-bold text-slate-800 mb-1"
                      >
                        Level Otoritas
                      </label>
                      <select
                        id="acc-role-type"
                        disabled={username === 'admin'}
                        value={roleType}
                        onChange={(e) =>
                          setRoleType(e.target.value as 'custom_user' | 'master_admin')
                        }
                        className="w-full min-h-[40px] px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900 disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0b5751]"
                      >
                        <option value="custom_user">Otoritas Kustom</option>
                        <option value="master_admin">Master Admin (Penuh)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              {roleType === 'master_admin' ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
                  Akun dengan level <strong>Master Admin</strong> otomatis memiliki akses penuh (Baca, Tambah, Edit, Hapus, Pengaturan) ke seluruh halaman, seluruh Blok, dan seluruh Gender. Pilih <strong>Otoritas Kustom</strong> jika ingin membatasi halaman atau mengaktifkan 5 Otoritas Khusus.
                </div>
              ) : (
                <>
                  {/* BAGIAN 2: MATRIKS OTORITAS AKSES HALAMAN (BACA / EDIT / SEMBUNYIKAN) */}
                  <section className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#0b5751]" />
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                            2. Otoritas Akses Seluruh Halaman (Baca / Edit / Sembunyikan)
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Atur hak akses untuk masing-masing halaman di dalam aplikasi.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleSetAllPagesAccess('edit')}
                          className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-[11px] font-bold transition"
                        >
                          Set Semua Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetAllPagesAccess('baca')}
                          className="px-2.5 py-1.5 rounded-lg border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-900 text-[11px] font-bold transition"
                        >
                          Set Semua Baca
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetAllPagesAccess('sembunyikan')}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold transition"
                        >
                          Set Semua Sembunyikan
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {groupedCatalog.map(([groupName, pages]) => (
                        <div
                          key={groupName}
                          className="rounded-xl border border-slate-200 overflow-hidden"
                        >
                          <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-700">
                            Grup Menu: {groupName}
                          </div>
                          <div className="divide-y divide-slate-100">
                            {pages.map((page) => {
                              const currentMode = pagePermissions[page.id] || 'edit';
                              return (
                                <div
                                  key={page.id}
                                  className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                >
                                  <div>
                                    <span className="text-xs font-bold text-slate-800">
                                      {page.label}
                                    </span>
                                    <span className="ml-2 text-[11px] font-mono text-slate-500">
                                      {page.routes[0]}
                                    </span>
                                  </div>

                                  <div
                                    role="group"
                                    aria-label={`Akses halaman ${page.label}`}
                                    className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-0.5 self-start sm:self-auto"
                                  >
                                    {(
                                      [
                                        { key: 'edit', label: 'Edit' },
                                        { key: 'baca', label: 'Baca' },
                                        { key: 'sembunyikan', label: 'Sembunyikan' },
                                      ] as { key: PageAccessMode; label: string }[]
                                    ).map((opt) => {
                                      const active = currentMode === opt.key;
                                      return (
                                        <button
                                          key={opt.key}
                                          type="button"
                                          data-testid={`perm-${page.id}-${opt.key}`}
                                          onClick={() => {
                                            setPagePermissions((prev) => ({
                                              ...prev,
                                              [page.id]: opt.key,
                                            }));
                                            if (
                                              page.id === 'pengaturan' &&
                                              opt.key === 'sembunyikan'
                                            ) {
                                              setPengaturanStatus('non_aktif');
                                            }
                                          }}
                                          className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                            active
                                              ? opt.key === 'edit'
                                                ? 'bg-emerald-700 text-white shadow-2xs'
                                                : opt.key === 'baca'
                                                ? 'bg-sky-700 text-white shadow-2xs'
                                                : 'bg-slate-800 text-white shadow-2xs'
                                              : 'text-slate-600 hover:text-slate-900'
                                          }`}
                                        >
                                          {opt.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* BAGIAN 3: 5 OTORITAS KHUSUS */}
                  <section className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-5">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                      <Settings className="w-4 h-4 text-[#0b5751]" />
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          3. Pengaturan 5 Otoritas Khusus (Granular Override)
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Walaupun akun diberi akses &quot;Edit&quot;, aturan khusus di bawah ini tetap mengikat akun tersebut.
                        </p>
                      </div>
                    </div>

                    {/* 3.1 Otoritas Khusus 1: BLOK (Multi-Select sesuai Gambar 2) */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h5 className="text-xs font-bold text-slate-900">
                            A. Otoritas Blok (Multi-Select Sesuai Hierarki Kamar)
                          </h5>
                          <p className="text-[11px] text-slate-500">
                            Akun hanya menampilkan data santri, asatidz, dan kelas menurut hierarki Blok yang dipilih.
                          </p>
                        </div>

                        <button
                          type="button"
                          data-testid="btn-blok-semua"
                          onClick={() => {
                            setIsAllBlok(true);
                            setSelectedBloks([]);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition self-start sm:self-auto ${
                            isAllBlok
                              ? 'bg-[#0b5751] text-white border-[#0b5751]'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          Semua Blok ({availableBloks.length})
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                        {availableBloks.map((blokName) => {
                          const checked = !isAllBlok && selectedBloks.includes(blokName);
                          return (
                            <button
                              key={blokName}
                              type="button"
                              data-testid={`chip-blok-${blokName}`}
                              onClick={() => handleToggleBlok(blokName)}
                              className={`px-3 py-2 rounded-xl border text-left text-xs font-semibold flex items-center justify-between gap-2 transition ${
                                checked
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span className="truncate">{blokName}</span>
                              {checked && <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3.2 & 3.3 Otoritas Khusus 2 (GENDER) & 3 (PENGATURAN) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Gender */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-emerald-700" />
                          <h5 className="text-xs font-bold text-slate-900">
                            B. Otoritas Gender
                          </h5>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Membatasi tampilan dan input data berdasarkan jenis kelamin santri/asatidz/kelas.
                        </p>
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          {(
                            [
                              { key: 'semua', label: 'Semua' },
                              { key: 'putra', label: 'Putra (PA)' },
                              { key: 'putri', label: 'Putri (PI)' },
                            ] as { key: GenderScope; label: string }[]
                          ).map((g) => (
                            <button
                              key={g.key}
                              type="button"
                              data-testid={`gender-scope-${g.key}`}
                              onClick={() => setGenderScope(g.key)}
                              className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition ${
                                genderScope === g.key
                                  ? 'bg-[#0b5751] text-white border-[#0b5751]'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {g.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Pengaturan */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
                        <div className="flex items-center gap-1.5">
                          <Settings className="w-4 h-4 text-emerald-700" />
                          <h5 className="text-xs font-bold text-slate-900">
                            C. Otoritas Pengaturan (Terpusat &amp; Halaman)
                          </h5>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Jika Non-Aktif, menu Pengaturan utama dan seluruh tombol pengaturan di tiap halaman disembunyikan.
                        </p>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {(
                            [
                              { key: 'aktif', label: 'Aktif' },
                              { key: 'non_aktif', label: 'Non-Aktif' },
                            ] as { key: PengaturanAuthorityStatus; label: string }[]
                          ).map((p) => (
                            <button
                              key={p.key}
                              type="button"
                              data-testid={`pengaturan-scope-${p.key}`}
                              onClick={() => handlePengaturanStatusChange(p.key)}
                              className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                                pengaturanStatus === p.key
                                  ? p.key === 'aktif'
                                    ? 'bg-emerald-700 text-white border-emerald-700'
                                    : 'bg-rose-700 text-white border-rose-700'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 3.4 Otoritas Khusus 4: SEMBUNYIKAN TOMBOL EDIT PER HALAMAN */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">
                          D. Otoritas Edit: Sembunyikan Tombol Edit pada Halaman Tertentu
                        </h5>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Centang halaman yang tombol <strong>Edit / Ubah data lamanya</strong> ingin disembunyikan (tombol <strong>Tambah / Input Baru</strong> tetap muncul selama halaman diberi akses Edit).
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {APP_PAGE_CATALOG.filter((p) => p.supportsEditOverride).map((page) => {
                          const isHidden = hideEditPages.includes(page.id);
                          return (
                            <button
                              key={page.id}
                              type="button"
                              data-testid={`hide-edit-${page.id}`}
                              onClick={() => handleToggleHideEditPage(page.id)}
                              className={`px-3 py-2 rounded-xl border text-left text-xs font-semibold flex items-center justify-between gap-2 transition ${
                                isHidden
                                  ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span className="truncate">{page.label}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                                  isHidden
                                    ? 'bg-amber-200 text-amber-900'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {isHidden ? 'Edit Disembunyikan' : 'Normal'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3.5 Otoritas Khusus 5: SEMBUNYIKAN TOMBOL HAPUS PER HALAMAN */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">
                          E. Otoritas Hapus: Sembunyikan Tombol Hapus pada Halaman Tertentu
                        </h5>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Centang halaman yang tombol <strong>Hapus (satuan maupun massal)</strong>-nya ingin disembunyikan walaupun halaman diberi akses Edit.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {APP_PAGE_CATALOG.filter((p) => p.supportsDeleteOverride).map((page) => {
                          const isHidden = hideDeletePages.includes(page.id);
                          return (
                            <button
                              key={page.id}
                              type="button"
                              data-testid={`hide-delete-${page.id}`}
                              onClick={() => handleToggleHideDeletePage(page.id)}
                              className={`px-3 py-2 rounded-xl border text-left text-xs font-semibold flex items-center justify-between gap-2 transition ${
                                isHidden
                                  ? 'bg-rose-50 border-rose-400 text-rose-900 font-bold'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span className="truncate">{page.label}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                                  isHidden
                                    ? 'bg-rose-200 text-rose-900'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {isHidden ? 'Hapus Disembunyikan' : 'Normal'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                </>
              )}

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  data-testid="btn-simpan-akun-otoritas"
                  disabled={isSaving}
                  className="min-h-[42px] px-5 py-2 rounded-xl bg-[#0b5751] hover:bg-[#115e59] text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  {isSaving ? 'Menyimpan Otoritas...' : 'Simpan Akun & Otoritas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
