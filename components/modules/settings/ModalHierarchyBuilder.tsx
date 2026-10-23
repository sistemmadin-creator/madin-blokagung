'use client';

import React, { useState, useEffect } from 'react';
import Dialog from '@/components/ui/Dialog';
import { supabase } from '@/lib/supabase/client';
import { useAppStore } from '@/stores/useAppStore';
import { logActivity } from '@/lib/utils/audit';
import { FolderTree, Plus, Trash2, Save, Layers } from 'lucide-react';

interface RuleItem {
  id: string;
  parentPath: string; // e.g. "Putra > Darussalam > A"
  type: 'numeric' | 'alpha' | 'manual';
  start?: string;
  end?: string;
  manualText?: string;
}

export default function ModalHierarchyBuilder({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { settings, setSettings } = useAppStore();
  const [activeTab, setActiveTab] = useState<'tree1' | 'tree2'>('tree1');
  const [rulesTree1, setRulesTree1] = useState<RuleItem[]>([]);
  const [rulesTree2, setRulesTree2] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'APP_SETTINGS')
          .maybeSingle();

        if (error) throw error;
        if (data && data.value) {
          const val = data.value;
          setSettings(val);
          if (typeof val.tree1 === 'string') {
            setRulesTree2(typeof val.tree2 === 'string' ? val.tree2 : JSON.stringify(val.tree2, null, 2));
          }
        }
      } catch (err) {
        console.error('Load settings error:', err);
      }
    };

    loadSettings();
  }, [isOpen, setSettings]);

  const handleAddRuleTree1 = () => {
    setRulesTree1((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        parentPath: 'Putra > Darussalam > A',
        type: 'numeric',
        start: '1',
        end: '10',
      },
    ]);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedSettings = {
        ...settings,
        tree1: typeof settings.tree1 === 'string' ? settings.tree1 : 'Blok > Asrama > Kode > Kamar',
        tree2: rulesTree2,
      };

      const { error } = await supabase
        .from('app_settings')
        .upsert([{ key: 'APP_SETTINGS', value: updatedSettings }], { onConflict: 'key' });

      if (error) throw error;

      await logActivity('SIMPAN PENGATURAN', 'Memperbarui konfigurasi hierarki sistem');
      setSettings(updatedSettings);
      alert('Pengaturan hierarki berhasil disimpan!');
      onClose();
    } catch (err: unknown) {
      alert('Gagal menyimpan pengaturan: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Pengaturan Hierarki Kamar & Kelas Formal"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Tab Selector */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('tree1')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition ${
              activeTab === 'tree1'
                ? 'border-madin-700 text-madin-700 bg-madin-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            Hierarki Kamar (Tree 1: Blok &gt; Asrama &gt; Kode &gt; Kamar)
          </button>
          <button
            onClick={() => setActiveTab('tree2')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition ${
              activeTab === 'tree2'
                ? 'border-madin-700 text-madin-700 bg-madin-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            Hierarki Kelas Formal (Tree 2: Unit &gt; Jurusan &gt; Kelas)
          </button>
        </div>

        {/* Tab 1: Tree 1 */}
        {activeTab === 'tree1' && (
          <div className="space-y-3">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              Aturan hierarki kamar menentukan dropdown berjenjang pada formulir pendaftaran santri dan dewan asatidz.
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto p-1">
              <div className="p-3 border border-slate-200 rounded-xl bg-white shadow-2xs space-y-2">
                <label className="text-xs font-semibold text-slate-700">Rute Induk Pengelompokan Kamar</label>
                <input
                  type="text"
                  defaultValue="Putra > Darussalam > A"
                  className="w-full text-xs py-1.5 px-3 rounded-lg border border-slate-200 font-mono"
                />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-slate-500">Rentang Awal</label>
                    <input type="text" defaultValue="01" className="w-full text-xs py-1 px-2 border rounded" />
                  </div>
                  <div>
                    <label className="text-slate-500">Rentang Akhir</label>
                    <input type="text" defaultValue="20" className="w-full text-xs py-1 px-2 border rounded" />
                  </div>
                </div>
              </div>

              {rulesTree1.map((rule) => (
                <div key={rule.id} className="p-3 border border-slate-200 rounded-xl bg-white shadow-2xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-medium text-slate-600">{rule.parentPath}</span>
                    <button
                      type="button"
                      onClick={() => setRulesTree1((prev) => prev.filter((r) => r.id !== rule.id))}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddRuleTree1}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-dashed border-madin-600 text-madin-700 hover:bg-madin-50 w-full justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Aturan Kamar Baru</span>
            </button>
          </div>
        )}

        {/* Tab 2: Tree 2 */}
        {activeTab === 'tree2' && (
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
              Aturan hierarki pendidikan formal (SMP, MTs, SMA, MA, SMK, Institut).
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Konfigurasi JSON / Format Rute Kelas Formal
              </label>
              <textarea
                rows={10}
                value={rulesTree2}
                onChange={(e) => setRulesTree2(e.target.value)}
                placeholder="Contoh: SMP > MIPA > 1 > VII > A"
                className="w-full text-xs p-3 rounded-lg border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-madin-600"
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-madin-700 hover:bg-madin-800 text-white shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi'}</span>
          </button>
        </div>
      </div>
    </Dialog>
  );
}
