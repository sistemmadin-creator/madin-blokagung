'use client';

import React from 'react';

export interface KartuData {
  nama: string;
  bin: string;
  nis: string;
  ttl: string;
  mustahiq: string;
  kelas: string;
  kec: string;
  kab: string;
  prov: string;
  penjaga: string;
  hafalan: string;
  tglSetor: string;
}

interface KartuBuktiSetoranProps {
  data: KartuData;
  scale?: number;
}

export default function KartuBuktiSetoran({ data, scale = 1 }: KartuBuktiSetoranProps) {
  return (
    <div
      className="kartu-container shadow-sm bg-white text-slate-900 mx-auto select-none"
      style={{
        width: '600px',
        minWidth: '600px',
        aspectRatio: '6 / 3',
        border: '3px solid #333',
        borderRadius: '12px',
        padding: '15px',
        position: 'relative',
        fontFamily: "'Times New Roman', Times, serif",
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top center',
      }}
    >
      {/* Badge PKM */}
      <div
        className="kartu-pkm font-bold text-xs italic text-black"
        style={{ position: 'absolute', top: '15px', right: '15px' }}
      >
        PKM MUHAFAZAH
      </div>

      {/* Header Kartu */}
      <div
        className="kartu-header flex items-center justify-between pb-1 mb-3"
        style={{ borderBottom: '4px solid #333' }}
      >
        <div
          className="kartu-logo rounded-full flex items-center justify-center font-bold text-[10px] text-center flex-shrink-0"
          style={{
            width: '70px',
            height: '70px',
            border: '1px solid #ccc',
            backgroundColor: '#e8f5e9',
            lineHeight: 1.2,
          }}
        >
          <div>
            LOGO
            <br />
            MADIN
          </div>
        </div>

        <div className="kartu-title text-center flex-grow px-2">
          <h3
            className="m-0 text-xl font-bold tracking-wide text-black"
            style={{ fontFamily: "'Traditional Arabic', 'Amiri', serif" }}
          >
            المدرسة الأميرية الدينية
          </h3>
          <h3 className="m-0 text-lg font-bold tracking-wider text-black">
            MADRASAH DINIYYAH AL AMIRIYYAH
          </h3>
          <p
            className="m-0 text-[11px] font-bold text-white bg-neutral-800 px-2 py-0.5 rounded inline-block mt-1"
          >
            Pondok Pesantren Darussalam Blokagung Tegalsari Banyuwangi
          </p>
        </div>
      </div>

      {/* Row 1: NAMA | BIN/TI */}
      <div className="k-row flex items-center mb-2">
        <div className="k-label font-bold text-sm text-black flex-shrink-0" style={{ width: '100px' }}>
          NAMA
        </div>
        <div
          className="k-input font-bold border-2 border-neutral-800 rounded-md px-2 py-1 min-h-[26px] text-sm flex items-center flex-grow bg-neutral-50"
        >
          {data.nama || ''}
        </div>
        <div className="k-label font-bold text-sm text-black flex-shrink-0 ms-2" style={{ width: '50px' }}>
          BIN/TI
        </div>
        <div
          className="k-input border-2 border-neutral-800 rounded-md px-2 py-1 min-h-[26px] text-sm flex items-center bg-neutral-50"
          style={{ width: '130px', flexGrow: 0 }}
        >
          {data.bin || ''}
        </div>
      </div>

      {/* Row 2: NIS | TTL */}
      <div className="k-row flex items-center mb-2">
        <div className="k-label font-bold text-sm text-black flex-shrink-0" style={{ width: '100px' }}>
          NIS
        </div>
        <div
          className="k-input border-2 border-neutral-800 rounded-md px-2 py-1 min-h-[26px] text-sm flex items-center font-mono bg-neutral-50"
          style={{ width: '120px', flexGrow: 0 }}
        >
          {data.nis || ''}
        </div>
        <div className="k-label font-bold text-sm text-black flex-shrink-0 ms-2" style={{ width: '40px' }}>
          TTL
        </div>
        <div
          className="k-input border-2 border-neutral-800 rounded-md px-2 py-1 min-h-[26px] text-sm flex items-center flex-grow bg-neutral-50"
        >
          {data.ttl || ''}
        </div>
      </div>

      {/* Row 3: ASATIDZ | KELAS */}
      <div className="k-row flex items-center mb-2">
        <div className="k-label font-bold text-sm text-black flex-shrink-0" style={{ width: '100px' }}>
          ASATIDZ
        </div>
        <div
          className="k-input border-2 border-neutral-800 rounded-md px-2 py-1 min-h-[26px] text-sm flex items-center flex-grow bg-neutral-50"
        >
          Ust/Ustdz. <span className="ms-1 font-bold">{data.mustahiq || ''}</span>
        </div>
        <div className="k-label font-bold text-sm text-black flex-shrink-0 ms-2" style={{ width: '55px' }}>
          KELAS
        </div>
        <div
          className="k-input border-2 border-neutral-800 rounded-md px-2 py-1 min-h-[26px] text-sm flex items-center bg-neutral-50"
          style={{ width: '120px', flexGrow: 0 }}
        >
          {data.kelas || ''}
        </div>
      </div>

      {/* Row 4: ALAMAT */}
      <div className="k-row flex items-center mb-2">
        <div className="k-label font-bold text-sm text-black flex-shrink-0" style={{ width: '100px' }}>
          ALAMAT
        </div>
        <div
          className="k-input border-2 border-neutral-800 rounded-md px-2 py-1 min-h-[26px] text-sm flex items-center flex-1 bg-neutral-50"
        >
          Kec. <span className="ms-1">{data.kec || ''}</span>
        </div>
        <div
          className="k-input border-2 border-neutral-800 rounded-md px-2 py-1 min-h-[26px] text-sm flex items-center flex-1 ms-2 bg-neutral-50"
        >
          Kab. <span className="ms-1">{data.kab || ''}</span>
        </div>
        <div
          className="k-input border-2 border-neutral-800 rounded-md px-2 py-1 min-h-[26px] text-sm flex items-center flex-1 ms-2 bg-neutral-50"
        >
          Prov. <span className="ms-1">{data.prov || ''}</span>
        </div>
      </div>

      {/* Row 5: PENJAGA | TTD PKM */}
      <div className="k-row flex items-center mb-2">
        <div className="k-label font-bold text-sm text-black flex-shrink-0" style={{ width: '100px' }}>
          PENJAGA
        </div>
        <div
          className="k-input border-2 border-neutral-800 rounded-md px-2 py-1 min-h-[26px] text-sm flex items-center flex-grow bg-neutral-50"
        >
          Ust/Ustdz. <span className="ms-1 font-bold">{data.penjaga || ''}</span>
        </div>
        <div className="k-label font-bold text-sm text-black flex-shrink-0 ms-2" style={{ width: '70px' }}>
          TTD PKM
        </div>
        <div
          className="k-input border-2 border-neutral-800 rounded-md px-2 py-1 min-h-[26px] text-sm flex items-center bg-neutral-50"
          style={{ width: '110px', flexGrow: 0 }}
        ></div>
      </div>

      {/* Row 6: HAFALAN | TGL SETOR */}
      <div className="k-row flex items-center">
        <div className="k-label font-bold text-sm text-black flex-shrink-0" style={{ width: '100px' }}>
          HAFALAN
        </div>
        <div
          className="k-input font-bold border-2 border-neutral-800 rounded-md px-2 py-1 min-h-[26px] text-sm flex items-center flex-grow bg-neutral-50 text-emerald-800"
        >
          {data.hafalan || ''}
        </div>
        <div className="k-label font-bold text-sm text-black flex-shrink-0 ms-2" style={{ width: '85px' }}>
          TGL SETOR
        </div>
        <div
          className="k-input border-2 border-neutral-800 rounded-md px-2 py-1 min-h-[26px] text-sm flex items-center bg-neutral-50 font-semibold"
          style={{ width: '110px', flexGrow: 0 }}
        >
          {data.tglSetor || ''}
        </div>
      </div>
    </div>
  );
}
