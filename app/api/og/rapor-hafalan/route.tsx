import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

interface HistoryItemParam {
  no?: number;
  tanggal: string;
  catatan?: string;
  tambah: string;
  status: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const nama = searchParams.get('nama') || 'ANDIKO DWI SAPUTRA';
    const nis = searchParams.get('nis') || '-';
    const kamar = searchParams.get('kamar') || '-';
    const mustahiq = searchParams.get('mustahiq') || '-';
    const kelasBadge = searchParams.get('kelasBadge') || '1A (1 WUSTHO A)';
    const kategori = searchParams.get('kategori') || 'Wajib';
    const materi = searchParams.get('materi') || "Juz Amma' (An-Naas - Adh-Dhuha)";
    const targetPreview = searchParams.get('targetPreview') || 'Baris 1 - 100';
    const capaianText = searchParams.get('capaianText') || 'Baris 0 / 100';
    const persenRaw = Number(searchParams.get('persen') || '0');
    const persen = Math.max(0, Math.min(100, Number.isFinite(persenRaw) ? persenRaw : 0));
    const satuan = searchParams.get('satuan') || 'Kalimat';
    const totalCatatan = searchParams.get('totalCatatan') || '0';
    const tanggalCetak =
      searchParams.get('tanggalCetak') ||
      new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    const rawHistory = searchParams.get('history') || '[]';

    let historyItems: HistoryItemParam[] = [];
    try {
      const parsed = JSON.parse(rawHistory);
      if (Array.isArray(parsed)) {
        historyItems = parsed.slice(-3);
      }
    } catch {
      historyItems = [];
    }

    const targetDisplay =
      targetPreview && !materi.includes(targetPreview)
        ? `${materi} (${targetPreview})`
        : materi;

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#f1f5f9',
            fontFamily: 'sans-serif',
            padding: '28px',
            boxSizing: 'border-box',
          }}
        >
          {/* Outer Card */}
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              border: '3px solid #059669',
              boxShadow: '0 16px 28px rgba(15, 23, 42, 0.08)',
              overflow: 'hidden',
            }}
          >
            {/* Header Resmi Madrasah */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#064e3b',
                color: '#ffffff',
                padding: '18px 32px',
                borderBottom: '4px solid #10b981',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '15px',
                    color: '#064e3b',
                    border: '2px solid #34d399',
                  }}
                >
                  MADIN
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span
                    style={{
                      fontSize: '20px',
                      fontWeight: 800,
                      letterSpacing: '-0.3px',
                    }}
                  >
                    MADRASAH DINIYYAH AL AMIRIYYAH BLOKAGUNG
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      color: '#a7f3d0',
                      fontWeight: 600,
                      marginTop: '2px',
                    }}
                  >
                    Kartu Rapor Digital Hafalan Mingguan Santri (Mustahiq)
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#047857',
                  padding: '7px 16px',
                  borderRadius: '999px',
                  border: '1.5px solid #34d399',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                  Laporan Resmi Wali Santri
                </span>
              </div>
            </div>

            {/* Body Container: Gabungan Gambar 3 (Atas) & Gambar 4 (Bawah) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                padding: '22px 32px',
                gap: '18px',
                justifyContent: 'flex-start',
              }}
            >
              {/* BAGIAN 1: Identitas Santri, Target & Progress Bar (Sesuai Gambar 3) */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: '#ffffff',
                  borderRadius: '18px',
                  border: '1.5px solid #e2e8f0',
                  padding: '18px 24px',
                  gap: '12px',
                }}
              >
                {/* Baris Nama + Badge Kelas & Kategori */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span
                      style={{
                        fontSize: '24px',
                        fontWeight: 900,
                        color: '#0f172a',
                        letterSpacing: '-0.3px',
                      }}
                    >
                      {nama}
                    </span>
                    <span
                      style={{
                        fontSize: '14px',
                        color: '#64748b',
                        fontWeight: 600,
                        marginTop: '4px',
                      }}
                    >
                      {`NIS: ${nis}  •  Kamar: ${kamar}  •  Mustahiq: ${mustahiq}`}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: '#ecfdf5',
                        border: '1.5px solid #a7f3d0',
                        color: '#047857',
                        padding: '6px 16px',
                        borderRadius: '999px',
                        fontSize: '14px',
                        fontWeight: 800,
                      }}
                    >
                      {kelasBadge}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: '#f1f5f9',
                        border: '1.5px solid #e2e8f0',
                        color: '#334155',
                        padding: '6px 14px',
                        borderRadius: '999px',
                        fontSize: '13px',
                        fontWeight: 800,
                      }}
                    >
                      {`Hafalan ${kategori}`}
                    </div>
                  </div>
                </div>

                {/* Baris Target Hafalan Saat Ini */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '10px',
                  }}
                >
                  <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>
                    Target Hafalan Saat Ini:
                  </span>
                  <span style={{ fontSize: '15px', color: '#0f172a', fontWeight: 800 }}>
                    {targetDisplay}
                  </span>
                </div>

                {/* Baris Capaian Setoran Hafalan + Progress Bar */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '10px',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '14px', color: '#475569', fontWeight: 600 }}>
                      Capaian Setoran Hafalan:
                    </span>
                    <span style={{ fontSize: '15px', color: '#065f46', fontWeight: 800 }}>
                      {`${capaianText} (${persen}%)`}
                    </span>
                  </div>

                  {/* Progress Track */}
                  <div
                    style={{
                      width: '100%',
                      height: '12px',
                      backgroundColor: '#f1f5f9',
                      borderRadius: '999px',
                      display: 'flex',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(persen > 0 ? 3 : 0, persen)}%`,
                        height: '100%',
                        backgroundColor: '#10b981',
                        borderRadius: '999px',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* BAGIAN 2: Tabel 3 Riwayat Setor Terakhir (Sesuai Gambar 4) */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  gap: '8px',
                }}
              >
                {/* Header Riwayat Setor */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 4px',
                  }}
                >
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>
                    {`Riwayat Setor (${materi})`}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>
                    {`${totalCatatan} Catatan`}
                  </span>
                </div>

                {/* Tabel Riwayat */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '16px',
                    border: '1.5px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    overflow: 'hidden',
                  }}
                >
                  {/* Table Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: '#f8fafc',
                      borderBottom: '1.5px solid #e2e8f0',
                      padding: '10px 20px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#64748b',
                    }}
                  >
                    <span style={{ width: '60px' }}>No</span>
                    <span style={{ flex: 2.2 }}>Tanggal</span>
                    <span style={{ flex: 1.5, textAlign: 'center' }}>{`Tambah ${satuan}`}</span>
                    <span style={{ flex: 1.5 }}>Rincian Status</span>
                  </div>

                  {/* Table Body (Maksimal 3 Riwayat Setor Terakhir) */}
                  {historyItems.length === 0 ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '38px 20px',
                        fontSize: '14px',
                        color: '#94a3b8',
                        fontWeight: 600,
                      }}
                    >
                      {`Belum ada catatan riwayat setoran untuk materi ${materi}.`}
                    </div>
                  ) : (
                    historyItems.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '11px 20px',
                          borderBottom:
                            idx < historyItems.length - 1 ? '1px solid #f1f5f9' : 'none',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <span
                          style={{
                            width: '60px',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#94a3b8',
                          }}
                        >
                          {item.no ?? idx + 1}
                        </span>

                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 2.2,
                          }}
                        >
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 700,
                              color: '#334155',
                            }}
                          >
                            {item.tanggal}
                          </span>
                          {item.catatan ? (
                            <span
                              style={{
                                fontSize: '12px',
                                color: '#94a3b8',
                                fontStyle: 'italic',
                                marginTop: '2px',
                              }}
                            >
                              {item.catatan}
                            </span>
                          ) : null}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            flex: 1.5,
                            justifyContent: 'center',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              backgroundColor: '#ecfdf5',
                              color: '#047857',
                              padding: '4px 12px',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: 800,
                            }}
                          >
                            {item.tambah}
                          </div>
                        </div>

                        <span
                          style={{
                            flex: 1.5,
                            fontSize: '14px',
                            fontWeight: 800,
                            color: '#065f46',
                          }}
                        >
                          {item.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                padding: '12px 32px',
                borderTop: '1.5px solid #e2e8f0',
                fontSize: '12px',
                color: '#64748b',
                fontWeight: 600,
              }}
            >
              <span>{`Tanggal Laporan: ${tanggalCetak}`}</span>
              <span style={{ color: '#059669', fontWeight: 700 }}>
                PKM. Muhafadzoh • Madrasah Diniyyah Al Amiriyyah Blokagung
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 720,
      }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return new Response(`Failed to generate rapor image: ${msg}`, { status: 500 });
  }
}
