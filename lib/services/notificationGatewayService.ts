/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';

export interface NotificationPayload {
  recipientType: 'santri' | 'asatidz' | 'wali' | 'grup' | 'mustahiq';
  recipientTarget: string;
  category: 'absensi' | 'hafalan' | 'badal' | 'kbm' | 'pengumuman';
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Service Fase 3: WhatsApp & Telegram Gateway Helper.
 * Menghasilkan pesan resmi standar Madrasah Diniyyah Al-Amiriyyah Blokagung
 * dan memfasilitasi integrasi Click-to-Chat serta bot otomatis.
 */
export const NotificationGatewayService = {
  /**
   * Format nomor telepon WhatsApp standar internasional (contoh: 081234 -> 6281234)
   */
  formatPhoneNumber(phone: string): string {
    const clean = String(phone || '').replace(/\D/g, '');
    if (clean.startsWith('0')) {
      return '62' + clean.slice(1);
    }
    if (clean.startsWith('62')) {
      return clean;
    }
    return clean;
  },

  /**
   * Membuat tautan langsung Click-to-Chat WhatsApp (wa.me)
   */
  createWhatsAppLink(phone: string, text: string): string {
    const formattedPhone = this.formatPhoneNumber(phone);
    const encoded = encodeURIComponent(text);
    return `https://wa.me/${formattedPhone}?text=${encoded}`;
  },

  /**
   * Template Pesan 1: Pemberitahuan Ketidakhadiran Santri (Alfa / Izin / Sakit)
   */
  formatSantriAbsensiMessage(params: {
    namaSantri: string;
    noInduk: string;
    kelas: string;
    tanggal: string;
    jamKe: string;
    status: string;
    keterangan?: string;
  }): string {
    return (
      `*PEMBERITAHUAN PRESENSI MADRASAH DINIYYAH AL-AMIRIYYAH*\n` +
      `Pesantren Darussalam Blokagung\n\n` +
      `Yth. Wali Santri dari ananda:\n` +
      `👤 *Nama:* ${params.namaSantri}\n` +
      `🆔 *No. Induk:* ${params.noInduk}\n` +
      `🏫 *Kelas Madin:* ${params.kelas}\n\n` +
      `Memberitahukan bahwa pada:\n` +
      `📅 *Tanggal:* ${params.tanggal}\n` +
      `⏰ *Sesi KBM:* ${params.jamKe}\n` +
      `📌 *Status Presensi:* *${params.status.toUpperCase()}*\n` +
      `${params.keterangan ? `📝 *Keterangan:* ${params.keterangan}\n\n` : '\n'}` +
      `Demikian pemberitahuan ini disampaikan demi kelancaran dan ketertiban belajar santri.\n` +
      `_Kantor Madin Al-Amiriyyah Blokagung_`
    );
  },

  /**
   * Template Pesan 2: Penunjukan Asatidz Badal (Guru Pengganti Sesi KBM)
   */
  formatBadalAsatidzMessage(params: {
    namaGuruUtama: string;
    namaGuruPengganti: string;
    hari: string;
    tanggal: string;
    jamKe: string;
    kelas: string;
    fan: string;
    lokasi: string;
  }): string {
    return (
      `*SURAT TUGAS BADAL KBM MADIN AL-AMIRIYYAH*\n\n` +
      `Assalamu'alaikum Wr. Wb.\n` +
      `Kepada Yth. Ustadz/Ustadzah:\n` +
      `⭐ *${params.namaGuruPengganti}*\n\n` +
      `Dimohon kesediaannya untuk menggantikan (badal) mengajar pada sesi KBM:\n` +
      `👤 *Guru Berhalangan:* ${params.namaGuruUtama}\n` +
      `📅 *Waktu:* ${params.hari}, ${params.tanggal} (${params.jamKe})\n` +
      `🏫 *Kelas:* ${params.kelas}\n` +
      `📖 *Fan Pelajaran:* ${params.fan}\n` +
      `📍 *Lokasi:* ${params.lokasi}\n\n` +
      `Semoga barokah dan terima kasih atas khidmahnya.\n` +
      `Wassalamu'alaikum Wr. Wb.\n` +
      `_Bagian Kurikulum & Personalia Madin_`
    );
  },

  /**
   * Template Pesan 3: Laporan Kelulusan Target Hafalan (Muhafadzoh)
   */
  formatMuhafadzohMilestoneMessage(params: {
    namaSantri: string;
    noInduk: string;
    itemHafalan: string;
    kategori: string;
    penjaga: string;
    tanggal: string;
  }): string {
    return (
      `*KABAR GEMBIRA CAPAIAN HAFALAN MADIN AL-AMIRIYYAH*\n\n` +
      `Alhamdulillah, ananda:\n` +
      `👤 *Nama:* ${params.namaSantri} (NIS: ${params.noInduk})\n\n` +
      `Telah berhasil menyelesaikan setoran hafalan:\n` +
      `🏆 *Kitab / Hafalan:* *${params.itemHafalan}*\n` +
      `🏷️ *Kategori:* ${params.kategori}\n` +
      `📅 *Tanggal Lulus:* ${params.tanggal}\n` +
      `✍️ *Disimak Oleh:* ${params.penjaga}\n\n` +
      `Semoga ilmunya barokah, manfaat bagi agama, nusa, dan bangsa.\n` +
      `_Pengurus Muhafadzoh Madin Al-Amiriyyah Blokagung_`
    );
  },

  /**
   * Mencatat riwayat pengiriman notifikasi ke Supabase (jika tabel notification_logs siap)
   */
  async recordNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      // Coba catat ke tabel notification_logs
      const { error } = await supabase.from('notification_logs' as any).insert([
        {
          recipient_type: payload.recipientType,
          recipient_target: payload.recipientTarget,
          category: payload.category,
          message: payload.message,
          channel: 'whatsapp',
          status: 'sent',
          metadata: payload.metadata || {},
        },
      ]);

      if (error) {
        // Fallback catat ke activity_logs jika tabel notification_logs belum tersedia
        await logActivity(
          'NOTIFIKASI WHATSAPP',
          `Kirim notif [${payload.category}] ke ${payload.recipientTarget} (${payload.recipientType})`
        );
      }

      return true;
    } catch {
      return false;
    }
  },
};
