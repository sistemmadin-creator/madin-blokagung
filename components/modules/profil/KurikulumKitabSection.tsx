'use client';

import React, { useState } from 'react';
import { 
  BookOpen, 
  Clock, 
  GraduationCap, 
  ScrollText, 
  Sun, 
  Moon, 
  FileCheck2
} from 'lucide-react';

interface KitabItem {
  fan: string;
  kitab: string;
  kitabArab: string;
  kelas: string;
  target: string;
}

interface JenjangData {
  id: string;
  nama: string;
  durasi: string;
  fokus: string;
  targetHafalan: string;
  ujianAkhir: string;
  kitabList: KitabItem[];
}

export default function KurikulumKitabSection() {
  const [activeTab, setActiveTab] = useState<'Isti\'dad' | 'Ula' | 'Wustho' | 'Ulya'>('Ula');
  const [subView, setSubView] = useState<'kitab' | 'jadwal'>('kitab');

  const kurikulumData: Record<'Isti\'dad' | 'Ula' | 'Wustho' | 'Ulya', JenjangData> = {
    'Isti\'dad': {
      id: 'Isti\'dad',
      nama: 'Tingkat Isti\'dad (Persiapan)',
      durasi: '1 Tahun Ajaran',
      fokus: 'Pengenalan Huruf Arab Pegon, Imla\', Dasar Aqidah, serta Praktik Wudlu & Sholat Fardlu',
      targetHafalan: 'Surat-surat Pendek Juz \'Amma, Doa Sehari-hari, dan Nadzom Aqidatul Awwam Awal',
      ujianAkhir: 'Tes Lisan Praktik Ibadah & Imtihan Persiapan',
      kitabList: [
        { fan: 'Fiqih', kitab: 'Mabadi\'ul Fiqhiyyah Juz 1', kitabArab: 'مبادئ الفقهية', kelas: 'Isti\'dad', target: 'Thoharoh & Rukun Sholat' },
        { fan: 'Aqidah', kitab: 'Aqidatul Mubtadi\'in', kitabArab: 'عقيدة المبتدئين', kelas: 'Isti\'dad', target: 'Sifat Wajib 20 Bagi Allah' },
        { fan: 'Akhlaq', kitab: 'Tanbihul Muta\'allim', kitabArab: 'تنبيه المتعلم', kelas: 'Isti\'dad', target: 'Adab Kepada Guru & Teman' },
        { fan: 'Pegon & Imla\'', kitab: 'Al-Itqon Pegon', kitabArab: 'الإتقان في خط البيغون', kelas: 'Isti\'dad', target: 'Membaca & Menulis Gandeng' },
        { fan: 'Tajwid', kitab: 'Hidayatus Shibyan', kitabArab: 'هداية الصبيان', kelas: 'Isti\'dad', target: 'Hukum Nun Mati & Tanwin' },
      ],
    },
    'Ula': {
      id: 'Ula',
      nama: 'Tingkat Ula (Dasar Salaf)',
      durasi: '4 Tahun (Kelas 1 s/d 4 Ula)',
      fokus: 'Penguasaan Gramatika Bahasa Arab (Jurumiyyah & Imrithi), Ushul Fiqih Dasar (Safinah & Taqrib Awal), serta Tasrifan',
      targetHafalan: 'Nadzom Jurumiyyah, Al-Maqsud, Al-\'Imrithi, Juz \'Amma lengkap & Khulashoh Nurul Yaqin',
      ujianAkhir: 'Ulangan Umum Bersama (UUB), Daur Awwal/Tsani, dan Evaluasi Tingkat 4 Ula',
      kitabList: [
        { fan: 'Nahwu', kitab: 'Jurumiyyah Al-Bayan & Matan Jurumiyyah', kitabArab: 'الآجرومية والبيان', kelas: '1 - 2 Ula', target: 'I\'rab, Isim-Isim Marfu\' & Manshub' },
        { fan: 'Nahwu Lanjutan', kitab: 'Nadzom Al-\'Imrithi', kitabArab: 'نظم الدرة البهية (العمريطي)', kelas: '3 - 4 Ula', target: '254 Bait Nadzom I\'rab Lengkap' },
        { fan: 'Shorof', kitab: 'Tashrif Istilahi & Lughowi (Kaelani)', kitabArab: 'تصريف اصطلاحي ولغوي', kelas: '1 - 3 Ula', target: 'Bina\' Shohih s/d Mu\'tal 6 Bab' },
        { fan: 'Fiqih', kitab: 'Safinatun Najah & Sullamut Taufiq', kitabArab: 'سفينة النجاة وسلم التوفيق', kelas: '1 - 3 Ula', target: 'Fiqih Ibadah, Muamalah, Jenazah' },
        { fan: 'Fiqih Lanjutan', kitab: 'Matan Taqrib (Fathul Qorib Awal)', kitabArab: 'متن الغاية والتقريب', kelas: '4 Ula', target: 'Bab Thoharoh, Sholat, Zakat' },
        { fan: 'Aqidah', kitab: 'Aqidatul Awwam & Tuhfatul Murid', kitabArab: 'عقيدة العوام', kelas: '1 - 2 Ula', target: '50 Aqaid Seket & Kisah 25 Rasul' },
        { fan: 'Akhlaq', kitab: 'Taisirul Kholaq & Washoya Al-Abaa\'', kitabArab: 'تيسير الخلاق والوصايا', kelas: '1 - 3 Ula', target: 'Etika Penuntut Ilmu' },
        { fan: 'Tarikh Nabi', kitab: 'Khulashoh Nurul Yaqin Juz 1 & 2', kitabArab: 'خلاصة نور اليقين', kelas: '2 - 4 Ula', target: 'Sirah Nabawiyyah Makkiyah-Madaniyyah' },
      ],
    },
    'Wustho': {
      id: 'Wustho',
      nama: 'Tingkat Wustho (Menengah Salaf)',
      durasi: '2 Tahun (Kelas 1 s/d 2 Wustho)',
      fokus: 'Pendalaman Kitab Fathul Qorib, Penguasaan Alfiyyah Ibnu Malik, Qowa\'idul I\'rab, Faroidl (Mawaris), dan Risalatul Mahidl',
      targetHafalan: 'Alfiyyah Ibnu Malik (Bait 1 s/d 500 di Kelas 1, 501 s/d 1002 di Kelas 2) & Nadzom Faroidl',
      ujianAkhir: 'Tes Kitab Fathul Qorib (Al-Qur\'an & Taqrib), Daur Tsani, dan Syawir Kubro Wustho',
      kitabList: [
        { fan: 'Nahwu Akbar', kitab: 'Alfiyyah Ibnu Malik (Jilid 1 & 2)', kitabArab: 'ألفية ابن مالك في النحو', kelas: '1 - 2 Wustho', target: 'Khatam 1.002 Bait Alfiyyah' },
        { fan: 'Fiqih Syafi\'i', kitab: 'Syarah Fathul Qorib Al-Mujib', kitabArab: 'فتح القريب المجيب شرح تقريب', kelas: '1 - 2 Wustho', target: 'Muamalah, Munakahat, Jinayat' },
        { fan: 'Qowa\'id I\'rab', kitab: 'Qowa\'idul I\'rab Ibnu Hisyam', kitabArab: 'قواعد الإعراب لابن هشام', kelas: '1 Wustho', target: 'Tathbiq I\'rab Kalimat Kompleks' },
        { fan: 'I\'lal & Shorof', kitab: 'Qowa\'idul I\'lal & Nadzmul Maqsud', kitabArab: 'قواعد الإعلال ونظم المقصود', kelas: '1 - 2 Wustho', target: 'Kaidah 19 I\'lal Huruf \'Illat' },
        { fan: 'Tauhid Lanjutan', kitab: 'Khoridatul Bahiyyah & Kifayatul Awwam', kitabArab: 'الخريدة البهية', kelas: '1 - 2 Wustho', target: 'Dalil Aqli & Naqli Sifat 20' },
        { fan: 'Mawaris', kitab: 'Diklat Ilmu Faroidl', kitabArab: 'علم الفرائض والمواريث', kelas: '2 Wustho', target: 'Hitungan Ashabul Furudh & \'Ashobah' },
        { fan: 'Dima\' Jibliyyah', kitab: 'Risalatul Mahidl', kitabArab: 'رسالة المحيض', kelas: '1 Wustho Pi/Pa', target: 'Haidh, Nifas, Istihadlah & Salat' },
      ],
    },
    'Ulya': {
      id: 'Ulya',
      nama: 'Tingkat Ulya (Tinggi & Kader Ulama)',
      durasi: '2 Tahun (Kelas 1 s/d 2 Ulya)',
      fokus: 'Tafaqquh Fiddin Tingkat Tinggi (Fathul Mu\'in), Ibnu \'Aqil, Sastra Balaghah, Ushul Fiqh, Falakiyah, serta Praktik Pengalaman Lapangan (PPL)',
      targetHafalan: 'Jauharotut Tauhid, Jauharul Maknun (Balaghah), dan Sullamul Munauroq (Mantiq)',
      ujianAkhir: 'Ebtadin Ulya, Sidang Munaqosyah PPL, dan Ujian Bahtsul Masa\'il Kubro',
      kitabList: [
        { fan: 'Fiqih Tingkat Tinggi', kitab: 'Fathul Mu\'in bi Syarhi Qurratil \'Ain', kitabArab: 'فتح المعين بشرح قرة العين', kelas: '1 - 2 Ulya', target: 'Tathbiq Ibadah & Muamalah Turats' },
        { fan: 'Syarah Nahwu', kitab: 'Syarah Ibnu \'Aqil \'Ala Alfiyyah', kitabArab: 'شرح ابن عقيل على الألفية', kelas: '1 - 2 Ulya', target: 'Analisis Khilafiyah Bashrah & Kufah' },
        { fan: 'Sastra Balaghah', kitab: 'Al-Jauharul Maknun (Ma\'ani, Bayan, Badi\')', kitabArab: 'الجوهر المكنون في البلاغة', kelas: '1 - 2 Ulya', target: 'Keindahan Retorika Al-Qur\'an' },
        { fan: 'Logika Mantiq', kitab: 'Sullamul Munauroq & Idhohul Mubham', kitabArab: 'السلم المنورق في علم المنطق', kelas: '1 Ulya', target: 'Tashowwur & Tashdiq Argumentasi' },
        { fan: 'Mushtholah Hadits', kitab: 'Manzhumah Baiquniyyah & Tashilut Thuruqot', kitabArab: 'المنظومة البيقونية', kelas: '1 - 2 Ulya', target: 'Klasifikasi Hadits Shohih s/d Dlo\'if' },
        { fan: 'Astronomi Islam', kitab: 'Ilmu Falakiyah Darussalam', kitabArab: 'علم الفلك والمواقيت', kelas: '2 Ulya', target: 'Hisab Awal Bulan & Arah Kiblat' },
        { fan: 'Sastra \'Arudl', kitab: 'Ilmu \'Arudl wa Al-Qawafi', kitabArab: 'علم العروض والقوافي', kelas: '1 Ulya', target: '16 Bahar Sastra Arab' },
      ],
    },
  };

  const currentJenjang = kurikulumData[activeTab];

  return (
    <section id="kurikulum" className="py-16 sm:py-24 bg-white dark:bg-slate-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40 mb-3">
            Khazanah Turats Salafiyah
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-serif tracking-tight">
            Kurikulum Kitab Kuning & Jenjang Pendidikan
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            Disusun secara berjenjang mulai dari pengenalan Pegon hingga kitab turats tingkat tinggi untuk mencetak kader ulama yang mutafaqqih fiddin.
          </p>

          {/* Subview Toggle: Daftar Kitab vs Waktu Belajar */}
          <div className="mt-6 inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setSubView('kitab')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                subView === 'kitab'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Daftar Kitab Kuning</span>
            </button>
            <button
              onClick={() => setSubView('jadwal')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                subView === 'jadwal'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Waktu KBM Pesantren</span>
            </button>
          </div>
        </div>

        {subView === 'kitab' ? (
          <div>
            {/* Tab Navigasi Jenjang (Isti'dad, Ula, Wustho, Ulya) */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap mb-8">
              {(['Isti\'dad', 'Ula', 'Wustho', 'Ulya'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-bold transition-all flex items-center gap-2 border ${
                    activeTab === tab
                      ? 'bg-gradient-to-r from-emerald-800 to-emerald-900 text-amber-300 border-amber-400/40 shadow-md shadow-emerald-900/20 scale-105'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <GraduationCap className={`w-4 h-4 ${activeTab === tab ? 'text-amber-300' : 'text-emerald-600 dark:text-emerald-400'}`} />
                  <span>Jenjang {tab}</span>
                </button>
              ))}
            </div>

            {/* Banner Deskripsi Jenjang Terpilih */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-900 p-6 sm:p-8 text-white border border-amber-400/30 shadow-lg mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-800/60 pb-5 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      {currentJenjang.durasi}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold font-serif text-white">
                      {currentJenjang.nama}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-emerald-200/90 max-w-2xl">
                    {currentJenjang.fokus}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60">
                  <ScrollText className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-300 block mb-0.5">Target Muhafadzoh (Hafalan):</span>
                    <span className="text-emerald-100">{currentJenjang.targetHafalan}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60">
                  <FileCheck2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-emerald-300 block mb-0.5">Evaluasi & Syarat Kenaikan:</span>
                    <span className="text-emerald-100">{currentJenjang.ujianAkhir}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid Kitab Kuning per Jenjang */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {currentJenjang.kitabList.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-white dark:bg-slate-800/90 p-5 border border-slate-200/90 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:border-emerald-500/40 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {item.fan}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {item.kelas}
                      </span>
                    </div>

                    {/* Judul Kitab Latin & Teks Arab */}
                    <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                      {item.kitab}
                    </h4>
                    <p 
                      className="text-sm text-amber-700 dark:text-amber-300/90 font-serif font-semibold mt-1 mb-3 text-right"
                      dir="rtl"
                    >
                      {item.kitabArab}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Target Materi:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{item.target}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Subview Waktu KBM Pesantren */
          <div id="waktu-kbm" className="max-w-4xl mx-auto space-y-6">
            {/* Siang: Takror */}
            <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-amber-50 to-orange-50/40 dark:from-slate-800 dark:to-slate-800/60 border border-amber-300/50 dark:border-amber-500/20 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-amber-500 text-white shadow-sm">
                  <Sun className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-serif">
                    Takror Siang (Mudzakarah & Setoran Hafalan)
                  </h3>
                  <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    Pukul 13.30 – 15.00 WIB
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-slate-700">
                  <span className="font-bold text-amber-700 dark:text-amber-400 block mb-1">13.30 – 13.55 WIB</span>
                  <p className="text-slate-600 dark:text-slate-300">Persiapan, oprak-oprak kamar, dan penertiban lokal kelas.</p>
                </div>
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-slate-700">
                  <span className="font-bold text-amber-700 dark:text-amber-400 block mb-1">13.55 – 14.00 WIB</span>
                  <p className="text-slate-600 dark:text-slate-300">Pencegatan lokal & lalaran bait nadzom (Qobla al-Dirosah).</p>
                </div>
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-slate-700">
                  <span className="font-bold text-amber-700 dark:text-amber-400 block mb-1">14.00 – 15.00 WIB</span>
                  <p className="text-slate-600 dark:text-slate-300">Pelaksanaan 3 sesi takror 6 kelompok & setoran muhafadzoh.</p>
                </div>
              </div>
            </div>

            {/* Malam: Diniyyah */}
            <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 text-white border border-emerald-500/30 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-emerald-700 text-amber-300 shadow-sm border border-emerald-500/40">
                  <Moon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white font-serif">
                    Diniyyah Malam (KBM Pokok & Sorogan)
                  </h3>
                  <span className="text-xs font-semibold text-emerald-300">
                    Pukul 19.55 – 22.30 WIB
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs sm:text-sm">
                <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800/80">
                  <span className="font-bold text-amber-300 block mb-1">19.55 WIB</span>
                  <p className="text-emerald-100/90">Bel tanda masuk & pencegatan Tim Oprak-Oprak (TOP).</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800/80">
                  <span className="font-bold text-amber-300 block mb-1">20.00 – 20.45 WIB</span>
                  <p className="text-emerald-100/90">Jam Pelajaran I (Mata pelajaran pokok fanniyah).</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800/80">
                  <span className="font-bold text-amber-300 block mb-1">20.45 – 21.30 WIB</span>
                  <p className="text-emerald-100/90">Jam Pelajaran II (Gramatika & pendalaman nahwu-shorof).</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800/80">
                  <span className="font-bold text-amber-300 block mb-1">21.30 – 22.30 WIB</span>
                  <p className="text-emerald-100/90">Jam III / IV: Bandongan Ula & Sorogan Kitab Wustho/Ulya.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
