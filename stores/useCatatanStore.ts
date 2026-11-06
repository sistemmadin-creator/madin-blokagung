import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';
import { useUndoRedoStore } from '@/stores/useUndoRedoStore';
import {
  CatatanItem,
  CatatanNoteCategory,
  CatatanColorTheme,
  CatatanTodoItem,
  TodoPriority,
} from '@/types/catatan';

export const KEY_DB_CATATAN_DATA = 'MADIN_CATATAN_DATA_V1';
export const LS_CATATAN_DATA = 'MADIN_CATATAN_LOCAL_V1';

export const DEFAULT_WAHA_GUIDE_CONTENT = `Bagian 1: Cara Mengatasi Risiko Keamanan Sesi WhatsApp Lokal (waha-gateway/auth_info_baileys)

A. Apa yang Sebenarnya Tersimpan di Komputer Anda?
Ketika Anda memindai QR Code WhatsApp hingga berstatus Terhubung, kode di waha-gateway/server.js membuat sebuah folder bernama:
d:\\Madin Blokagung\\Projek Madin Blokagung\\madinblokagung-next\\waha-gateway\\auth_info_baileys

Folder auth_info_baileys ini berisi file creds.json dan kunci enkripsi sesi (session token). Fungsinya sama seperti cookies login di browser: selama folder ini ada, Anda tidak perlu memindai QR Code lagi walaupun laptop dimatikan dan dinyalakan ulang besoknya.

B. 3 Langkah Praktis Mengamankannya
1. Perlindungan Otomatis Saat Upload Kode ke GitHub (.gitignore)
Kabar baiknya, di dalam file .gitignore proyek Anda sudah terpasang aturan pengaman otomatis:
# waha-gateway whatsapp session & auth credentials (jangan di-commit ke git!)
waha-gateway/auth_info_baileys/
waha-gateway/node_modules/

Artinya: Ketika Anda melakukan git add, git commit, atau git push ke GitHub/Vercel, folder kunci WhatsApp tersebut otomatis diabaikan dan tidak akan pernah ikut ter-upload ke internet.
Yang perlu Anda jaga secara manual: Jika suatu saat Anda menyalin seluruh folder proyek ke Flashdisk atau Google Drive untuk diberikan ke orang lain, hapus terlebih dahulu folder waha-gateway/auth_info_baileys di dalam salinan tersebut agar sesi WhatsApp Anda tidak ikut terbawa.

2. Cara Memutus Sesi Jika Laptop Dipakai Bergantian (Lewat Web)
Jika laptop sekretariat dipakai bergantian dengan orang lain yang tidak berwenang mengirim pesan WhatsApp atas nama Madrasah:
- Buka halaman Kirim WhatsApp (/kirim-wa), lalu klik tombol Pengaturan Gateway.
- Klik tombol merah Putuskan / Logout di sebelah kanan status WhatsApp Berhasil Terhubung.
- Saat tombol tersebut diklik, waha-gateway/server.js otomatis menjalankan sock.logout() dan menghapus bersih seluruh isi folder auth_info_baileys dari harddisk laptop.

3. Cara Memutus Sesi dari Jarak Jauh (Lewat HP Pengirim)
Seandainya Anda sedang berada di luar ruangan dan lupa melakukan Logout di laptop:
- Buka aplikasi WhatsApp di HP nomor pengirim.
- Ketuk menu Titik Tiga (⋮) -> Perangkat Tertaut (Linked Devices).
- Ketuk perangkat Chrome / Baileys (Linux/Windows) yang terdaftar, lalu pilih Keluar (Log Out).
- Seketika itu juga, akses di laptop langsung mati dan tidak bisa digunakan mengirim pesan lagi.

Bagian 2: Cara Mengatasi Risiko Pembaruan Protokol WhatsApp Sewaktu-waktu

A. Mengapa Hal Ini Bisa Terjadi dan Apa Gejalanya?
Aplikasi WhatsApp di HP dan WhatsApp Web memiliki nomor versi protokol komunikasi yang diperbarui oleh pihak Meta/WhatsApp setiap beberapa bulan sekali.
Perlindungan Lapis Pertama (Sudah Otomatis):
Di dalam waha-gateway/server.js, sudah dipasang fungsi:
const { version } = await fetchLatestBaileysVersion();

Fungsi ini secara otomatis mengambil nomor versi WhatsApp Web terbaru setiap kali start-waha-gateway.bat dinyalakan, sehingga untuk pembaruan rutin WhatsApp, sistem akan menyesuaikan diri secara otomatis tanpa perlu Anda utak-atik.

Kapan Perlu Tindakan Manual?:
Hanya jika suatu saat (biasanya 6-12 bulan sekali) pihak WhatsApp mengubah struktur kode internal mereka secara besar-besaran.
Gejalanya:
- QR Code tidak mau muncul terus-menerus (Status: STARTING atau FAILED berulang-ulang).
- Atau setelah QR Code dipindai di HP, loading berputar terus dan gagal masuk ke status WhatsApp Berhasil Terhubung.

B. Langkah Detail Mengatasinya Jika Suatu Saat Terjadi
Jika gejala di atas muncul di kemudian hari, Anda hanya perlu melakukan 3 langkah perbaikan cepat berikut (hanya memakan waktu sekitar 1 menit):

Langkah 1: Tutup Jendela start-waha-gateway.bat
Tutup jendela hitam (Command Prompt) WAHA Gateway yang sedang berjalan.

Langkah 2: Perbarui Pustaka @whiskeysockets/baileys ke Versi Terbaru
Anda bisa melakukannya dengan dua cara (pilih salah satu yang paling mudah bagi Anda):
- Cara A (Paling Mudah Lewat Chat Antigravity):
  Cukup ketik perintah di chat ini:
  "Tolong update package baileys di folder waha-gateway karena koneksi WA gagal menyambung"
  Maka asisten AI akan langsung memperbaruinya untuk Anda.
- Cara B (Mandiri Lewat Terminal / Command Prompt):
  1. Buka terminal atau Command Prompt di folder proyek Anda.
  2. Ketik perintah berikut lalu tekan Enter:
     cd waha-gateway
     npm install @whiskeysockets/baileys@latest
  3. Perintah di atas akan mengunduh pembaruan terbaru dari waha-gateway/package.json yang sudah disesuaikan dengan protokol WhatsApp terbaru.

Langkah 3: Bersihkan Sesi Lama & Nyalakan Kembali start-waha-gateway.bat
- Jika sesi lama macet, hapus folder waha-gateway/auth_info_baileys (atau klik tombol Putuskan / Logout di web).
- Jalankan kembali file start-waha-gateway.bat dengan klik dua kali (double-click).
- Pindai ulang QR Code dari menu Pengaturan Gateway di halaman /kirim-wa, dan koneksi WhatsApp gratis Anda akan langsung aktif kembali.`;

export const DEFAULT_WAHA_GUIDE_NOTE: CatatanItem = {
  id: 'note-panduan-waha-gateway',
  title: 'Panduan Keamanan Sesi & Pembaruan Protokol WhatsApp Gateway (WAHA Lokal)',
  summary:
    'Dokumentasi lengkap pengamanan folder sesi auth_info_baileys serta 3 langkah perbaikan cepat apabila protokol WhatsApp pusat diperbarui.',
  content: DEFAULT_WAHA_GUIDE_CONTENT,
  structuredSections: [
    {
      id: 'sec-1a',
      heading:
        'Bagian 1: Cara Mengatasi Risiko Keamanan Sesi WhatsApp Lokal (waha-gateway/auth_info_baileys)',
      paragraphs: [
        'A. Apa yang Sebenarnya Tersimpan di Komputer Anda?',
        'Ketika Anda memindai QR Code WhatsApp hingga berstatus Terhubung, kode di waha-gateway/server.js membuat sebuah folder bernama:',
        'Folder auth_info_baileys ini berisi file creds.json dan kunci enkripsi sesi (session token). Fungsinya sama seperti cookies login di browser: selama folder ini ada, Anda tidak perlu memindai QR Code lagi walaupun laptop dimatikan dan dinyalakan ulang besoknya.',
      ],
      codeSnippet: {
        label: 'Lokasi Folder Sesi WhatsApp Lokal',
        language: 'text',
        code: 'd:\\Madin Blokagung\\Projek Madin Blokagung\\madinblokagung-next\\waha-gateway\\auth_info_baileys',
      },
    },
    {
      id: 'sec-1b',
      heading: 'B. 3 Langkah Praktis Mengamankannya',
      paragraphs: [
        '1. Perlindungan Otomatis Saat Upload Kode ke GitHub (.gitignore): Di dalam file .gitignore proyek Anda sudah terpasang aturan pengaman otomatis. Ketika Anda melakukan git add, git commit, atau git push ke GitHub/Vercel, folder kunci WhatsApp tersebut otomatis diabaikan dan tidak akan pernah ikut ter-upload ke internet.',
        'Yang perlu Anda jaga secara manual: Jika suatu saat Anda menyalin seluruh folder proyek ke Flashdisk atau Google Drive untuk diberikan ke orang lain, hapus terlebih dahulu folder waha-gateway/auth_info_baileys di dalam salinan tersebut agar sesi WhatsApp Anda tidak ikut terbawa.',
      ],
      codeSnippet: {
        label: 'Aturan Pengaman di .gitignore',
        language: 'gitignore',
        code: '# waha-gateway whatsapp session & auth credentials (jangan di-commit ke git!)\nwaha-gateway/auth_info_baileys/\nwaha-gateway/node_modules/',
      },
      bullets: [
        '2. Cara Memutus Sesi Jika Laptop Dipakai Bergantian (Lewat Web): Buka halaman Kirim WhatsApp (/kirim-wa) -> klik Pengaturan Gateway -> klik tombol merah Putuskan / Logout. Saat diklik, waha-gateway/server.js otomatis menjalankan sock.logout() dan menghapus bersih seluruh isi folder auth_info_baileys dari harddisk laptop.',
        '3. Cara Memutus Sesi dari Jarak Jauh (Lewat HP Pengirim): Buka aplikasi WhatsApp di HP nomor pengirim -> ketuk menu Titik Tiga (⋮) -> Perangkat Tertaut (Linked Devices) -> ketuk perangkat Chrome / Baileys (Linux/Windows) yang terdaftar -> pilih Keluar (Log Out). Seketika itu juga akses di laptop langsung mati.',
      ],
    },
    {
      id: 'sec-2a',
      heading: 'Bagian 2: Cara Mengatasi Risiko Pembaruan Protokol WhatsApp Sewaktu-waktu',
      paragraphs: [
        'A. Mengapa Hal Ini Bisa Terjadi dan Apa Gejalanya?',
        'Aplikasi WhatsApp di HP dan WhatsApp Web memiliki nomor versi protokol komunikasi yang diperbarui oleh pihak Meta/WhatsApp setiap beberapa bulan sekali.',
        'Perlindungan Lapis Pertama (Sudah Otomatis): Di dalam waha-gateway/server.js sudah dipasang fungsi fetchLatestBaileysVersion() yang otomatis mengambil nomor versi WhatsApp Web terbaru setiap kali start-waha-gateway.bat dinyalakan.',
      ],
      codeSnippet: {
        label: 'Baris Penyesuaian Versi Otomatis di waha-gateway/server.js',
        language: 'javascript',
        code: 'const { version } = await fetchLatestBaileysVersion();',
      },
      bullets: [
        'Kapan Perlu Tindakan Manual?: Hanya jika suatu saat (biasanya 6-12 bulan sekali) pihak WhatsApp mengubah struktur kode internal mereka secara besar-besaran.',
        'Gejala 1: QR Code tidak mau muncul terus-menerus (Status: STARTING atau FAILED berulang-ulang).',
        'Gejala 2: Setelah QR Code dipindai di HP, loading berputar terus dan gagal masuk ke status WhatsApp Berhasil Terhubung.',
      ],
    },
    {
      id: 'sec-2b',
      heading: 'B. Langkah Detail Mengatasinya Jika Suatu Saat Terjadi (Waktu ~1 Menit)',
      paragraphs: [
        'Langkah 1: Tutup Jendela start-waha-gateway.bat (Command Prompt) yang sedang berjalan.',
        'Langkah 2: Perbarui Pustaka @whiskeysockets/baileys ke Versi Terbaru. Pilih Cara A (ketik di Chat Antigravity: "Tolong update package baileys di folder waha-gateway karena koneksi WA gagal menyambung") atau Cara B (jalankan perintah terminal di bawah ini):',
      ],
      codeSnippet: {
        label: 'Perintah Update Baileys (Cara B via Terminal / Command Prompt)',
        language: 'powershell',
        code: 'cd waha-gateway\nnpm install @whiskeysockets/baileys@latest',
      },
      bullets: [
        'Langkah 3.1: Jika sesi lama macet, hapus folder waha-gateway/auth_info_baileys (atau klik tombol Putuskan / Logout di web).',
        'Langkah 3.2: Jalankan kembali file start-waha-gateway.bat dengan klik dua kali (double-click).',
        'Langkah 3.3: Pindai ulang QR Code dari menu Pengaturan Gateway di halaman /kirim-wa, dan koneksi WhatsApp gratis Anda akan langsung aktif kembali.',
      ],
    },
  ],
  category: 'panduan',
  colorTheme: 'emerald',
  isPinned: true,
  todos: [
    {
      id: 'todo-waha-1',
      text: 'Pastikan folder waha-gateway/auth_info_baileys terdaftar di .gitignore dan tidak disalin ke Flashdisk/Drive publik',
      completed: true,
      priority: 'penting',
      createdAt: '2026-11-06T07:00:00.000Z',
    },
    {
      id: 'todo-waha-2',
      text: 'Gunakan tombol Putuskan / Logout di Pengaturan Gateway jika laptop sekretariat dipakai bergantian',
      completed: false,
      priority: 'penting',
      createdAt: '2026-11-06T07:01:00.000Z',
    },
    {
      id: 'todo-waha-3',
      text: 'Jika suatu saat QR gagal menyambung karena update protokol WA, jalankan: cd waha-gateway && npm install @whiskeysockets/baileys@latest',
      completed: false,
      priority: 'normal',
      createdAt: '2026-11-06T07:02:00.000Z',
    },
  ],
  tags: ['WAHA Gateway', 'Keamanan Sesi', 'Baileys', 'WhatsApp Rapor'],
  createdAt: '2026-11-06T07:00:00.000Z',
  updatedAt: '2026-11-06T07:00:00.000Z',
  author: 'Master Administrator',
};

export const DEFAULT_CATATAN_LIST: CatatanItem[] = [
  DEFAULT_WAHA_GUIDE_NOTE,
  {
    id: 'note-todo-mingguan-muhafadzoh',
    title: 'Checklist Evaluasi Mingguan Setoran & Rapor Hafalan Santri',
    summary:
      'Daftar tugas rutin mingguan PKM Muhafadzoh sebelum mengirimkan Kartu Rapor Digital Hafalan ke WhatsApp wali santri.',
    content:
      'Pastikan seluruh Mustahiq telah menginput setoran mingguan santri (baik lewat tabel, kartu, maupun scan barcode) sebelum melakukan broadcast Kartu Rapor Digital Hafalan pada hari Jumat.',
    category: 'muhafadzoh',
    colorTheme: 'blue',
    isPinned: false,
    todos: [
      {
        id: 'todo-mhf-1',
        text: 'Periksa kelengkapan input setoran mingguan kelas tingkat ULA, WUSTHO, dan ULYA',
        completed: true,
        priority: 'penting',
        createdAt: '2026-11-06T07:05:00.000Z',
      },
      {
        id: 'todo-mhf-2',
        text: 'Lengkapi No. Telepon / WA Aktif wali santri yang masih kosong di halaman Kirim WhatsApp',
        completed: false,
        priority: 'penting',
        createdAt: '2026-11-06T07:06:00.000Z',
      },
      {
        id: 'todo-mhf-3',
        text: 'Nyalakan start-waha-gateway.bat dan kirim Kartu Rapor Digital Hafalan per kelas',
        completed: false,
        priority: 'normal',
        createdAt: '2026-11-06T07:07:00.000Z',
      },
    ],
    tags: ['To-Do Mingguan', 'Setor Mustahiq', 'Rapor WA'],
    createdAt: '2026-11-06T07:05:00.000Z',
    updatedAt: '2026-11-06T07:05:00.000Z',
    author: 'PKM. Muhafadzoh',
  },
];

function ensureDefaultWahaGuide(items: CatatanItem[]): CatatanItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    return DEFAULT_CATATAN_LIST;
  }
  const hasWahaGuide = items.some((it) => it.id === DEFAULT_WAHA_GUIDE_NOTE.id);
  if (!hasWahaGuide) {
    return [DEFAULT_WAHA_GUIDE_NOTE, ...items];
  }
  return items;
}

function readLocalCatatan(): CatatanItem[] {
  if (typeof window === 'undefined') return DEFAULT_CATATAN_LIST;
  try {
    const raw = localStorage.getItem(LS_CATATAN_DATA);
    if (!raw) return DEFAULT_CATATAN_LIST;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return ensureDefaultWahaGuide(parsed);
    }
  } catch {
    // Abaikan error parse
  }
  return DEFAULT_CATATAN_LIST;
}

function writeLocalCatatan(items: CatatanItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_CATATAN_DATA, JSON.stringify(items));
  } catch {
    // Abaikan error storage penuh
  }
}

async function persistCatatanToCloud(items: CatatanItem[]) {
  writeLocalCatatan(items);
  try {
    await supabase.from('app_settings').upsert(
      {
        key: KEY_DB_CATATAN_DATA,
        value: items,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  } catch {
    // Tetap aman menggunakan cadangan localStorage
  }
}

interface CatatanState {
  notes: CatatanItem[];
  isLoading: boolean;
  fetchCatatan: () => Promise<void>;
  addCatatan: (input: {
    title: string;
    summary?: string;
    content: string;
    category: CatatanNoteCategory;
    colorTheme?: CatatanColorTheme;
    isPinned?: boolean;
    todos?: Array<{ text: string; priority?: TodoPriority }>;
    tags?: string[];
    author?: string;
  }) => Promise<CatatanItem>;
  updateCatatan: (
    id: string,
    updates: Partial<
      Pick<
        CatatanItem,
        | 'title'
        | 'summary'
        | 'content'
        | 'category'
        | 'colorTheme'
        | 'isPinned'
        | 'tags'
        | 'todos'
      >
    >
  ) => Promise<void>;
  deleteCatatan: (id: string) => Promise<void>;
  togglePinCatatan: (id: string) => Promise<void>;
  addTodoItem: (
    noteId: string,
    text: string,
    priority?: TodoPriority
  ) => Promise<void>;
  toggleTodoItem: (noteId: string, todoId: string) => Promise<void>;
  deleteTodoItem: (noteId: string, todoId: string) => Promise<void>;
}

export const useCatatanStore = create<CatatanState>((set, get) => ({
  notes: DEFAULT_CATATAN_LIST,
  isLoading: false,

  fetchCatatan: async () => {
    set({ isLoading: true });
    const localItems = readLocalCatatan();
    set({ notes: localItems });

    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', KEY_DB_CATATAN_DATA)
        .maybeSingle();

      if (!error && data && Array.isArray(data.value) && data.value.length > 0) {
        const merged = ensureDefaultWahaGuide(data.value as CatatanItem[]);
        writeLocalCatatan(merged);
        set({ notes: merged, isLoading: false });
        return;
      }
    } catch {
      // Gunakan data lokal jika koneksi sedang offline
    }

    set({ isLoading: false });
  },

  addCatatan: async (input) => {
    const prevNotes = get().notes;
    const now = new Date().toISOString();
    const cleanContent = input.content.trim();
    const autoSummary =
      input.summary?.trim() ||
      cleanContent.split('\n').find((line) => line.trim().length > 0)?.slice(0, 140) ||
      'Catatan & daftar tugas operasional madrasah.';

    const newTodos: CatatanTodoItem[] = (input.todos || [])
      .filter((t) => t.text.trim().length > 0)
      .map((t, idx) => ({
        id: `todo-${Date.now()}-${idx}`,
        text: t.text.trim(),
        completed: false,
        priority: t.priority || 'normal',
        createdAt: now,
      }));

    const newItem: CatatanItem = {
      id: `note-${Date.now()}`,
      title: input.title.trim(),
      summary: autoSummary,
      content: cleanContent,
      category: input.category,
      colorTheme: input.colorTheme || 'emerald',
      isPinned: Boolean(input.isPinned),
      todos: newTodos,
      tags: input.tags && input.tags.length > 0 ? input.tags : ['Catatan'],
      createdAt: now,
      updatedAt: now,
      author: input.author || 'Pengurus Madrasah',
    };

    const nextNotes = [newItem, ...prevNotes];
    set({ notes: nextNotes });
    await persistCatatanToCloud(nextNotes);

    useUndoRedoStore.getState().recordAction({
      module: 'umum',
      title: `[CATATAN] Tambah Catatan: ${newItem.title}`,
      undo: async () => {
        set({ notes: prevNotes });
        await persistCatatanToCloud(prevNotes);
      },
      redo: async () => {
        set({ notes: nextNotes });
        await persistCatatanToCloud(nextNotes);
      },
    });

    void logActivity('CREATE_CATATAN', `Menambahkan catatan baru: ${newItem.title}`);
    return newItem;
  },

  updateCatatan: async (id, updates) => {
    const prevNotes = get().notes;
    const now = new Date().toISOString();
    const nextNotes = prevNotes.map((item) => {
      if (item.id !== id) return item;
      const updatedContent =
        updates.content !== undefined ? updates.content : item.content;
      const updatedSummary =
        updates.summary !== undefined
          ? updates.summary
          : updates.content !== undefined && item.id !== DEFAULT_WAHA_GUIDE_NOTE.id
          ? updatedContent
              .split('\n')
              .find((l) => l.trim().length > 0)
              ?.slice(0, 140) || item.summary
          : item.summary;

      return {
        ...item,
        ...updates,
        content: updatedContent,
        summary: updatedSummary,
        updatedAt: now,
      };
    });

    set({ notes: nextNotes });
    await persistCatatanToCloud(nextNotes);
  },

  deleteCatatan: async (id) => {
    const prevNotes = get().notes;
    const target = prevNotes.find((n) => n.id === id);
    if (!target) return;

    const nextNotes = prevNotes.filter((n) => n.id !== id);
    set({ notes: nextNotes });
    await persistCatatanToCloud(nextNotes);

    useUndoRedoStore.getState().recordAction({
      module: 'umum',
      title: `[CATATAN] Hapus Catatan: ${target.title}`,
      undo: async () => {
        set({ notes: prevNotes });
        await persistCatatanToCloud(prevNotes);
      },
      redo: async () => {
        set({ notes: nextNotes });
        await persistCatatanToCloud(nextNotes);
      },
    });

    void logActivity('DELETE_CATATAN', `Menghapus catatan: ${target.title}`);
  },

  togglePinCatatan: async (id) => {
    const prevNotes = get().notes;
    const nextNotes = prevNotes.map((n) =>
      n.id === id ? { ...n, isPinned: !n.isPinned, updatedAt: new Date().toISOString() } : n
    );
    set({ notes: nextNotes });
    await persistCatatanToCloud(nextNotes);
  },

  addTodoItem: async (noteId, text, priority = 'normal') => {
    const clean = text.trim();
    if (!clean) return;
    const prevNotes = get().notes;
    const now = new Date().toISOString();
    const newTodo: CatatanTodoItem = {
      id: `todo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: clean,
      completed: false,
      priority,
      createdAt: now,
    };

    const nextNotes = prevNotes.map((n) =>
      n.id === noteId
        ? { ...n, todos: [...n.todos, newTodo], updatedAt: now }
        : n
    );
    set({ notes: nextNotes });
    await persistCatatanToCloud(nextNotes);
  },

  toggleTodoItem: async (noteId, todoId) => {
    const prevNotes = get().notes;
    const now = new Date().toISOString();
    const nextNotes = prevNotes.map((n) => {
      if (n.id !== noteId) return n;
      return {
        ...n,
        todos: n.todos.map((t) =>
          t.id === todoId ? { ...t, completed: !t.completed } : t
        ),
        updatedAt: now,
      };
    });
    set({ notes: nextNotes });
    await persistCatatanToCloud(nextNotes);
  },

  deleteTodoItem: async (noteId, todoId) => {
    const prevNotes = get().notes;
    const now = new Date().toISOString();
    const nextNotes = prevNotes.map((n) => {
      if (n.id !== noteId) return n;
      return {
        ...n,
        todos: n.todos.filter((t) => t.id !== todoId),
        updatedAt: now,
      };
    });
    set({ notes: nextNotes });
    await persistCatatanToCloud(nextNotes);
  },
}));
