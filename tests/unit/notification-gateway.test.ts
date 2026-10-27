import { describe, it, expect } from 'vitest';
import { NotificationGatewayService } from '@/lib/services/notificationGatewayService';
import { QRCodeHelper } from '@/lib/utils/qrCodeHelper';

describe('NotificationGatewayService & QRCodeHelper (Fase 3: Otomasi Komunikasi)', () => {
  it('1. Memformat nomor telepon Indonesia ke standar internasional', () => {
    expect(NotificationGatewayService.formatPhoneNumber('081234567890')).toBe('6281234567890');
    expect(NotificationGatewayService.formatPhoneNumber('6281234567890')).toBe('6281234567890');
    expect(NotificationGatewayService.formatPhoneNumber('+62 812-3456-7890')).toBe('6281234567890');
  });

  it('2. Menghasilkan tautan WhatsApp Click-to-Chat dengan enkoding pesan yang benar', () => {
    const link = NotificationGatewayService.createWhatsAppLink('08123456789', 'Halo Santri');
    expect(link).toContain('https://wa.me/628123456789?text=Halo%20Santri');
  });

  it('3. Menghasilkan pesan presensi santri resmi madrasah', () => {
    const msg = NotificationGatewayService.formatSantriAbsensiMessage({
      namaSantri: 'Ahmad Faiz',
      noInduk: '2026001',
      kelas: '1 A ULA (PA)',
      tanggal: 'Selasa, 27 Oktober 2026',
      jamKe: 'Jam 1',
      status: 'Alfa',
      keterangan: 'Tanpa surat keterangan',
    });

    expect(msg).toContain('Ahmad Faiz');
    expect(msg).toContain('ALFA');
    expect(msg).toContain('Pesantren Darussalam Blokagung');
  });

  it('4. Menghasilkan pesan permohonan asatidz badal (pengganti KBM)', () => {
    const msg = NotificationGatewayService.formatBadalAsatidzMessage({
      namaGuruUtama: 'Ustadz Lukman',
      namaGuruPengganti: 'Ustadz Ahmad',
      hari: 'Sabtu',
      tanggal: '31 Oktober 2026',
      jamKe: 'Jam 1',
      kelas: '1 H ULA (PA)',
      fan: 'Akhlaq',
      lokasi: 'Aula Bir Aly',
    });

    expect(msg).toContain('Ustadz Ahmad');
    expect(msg).toContain('Ustadz Lukman');
    expect(msg).toContain('BADAL');
  });

  it('5. Menghasilkan dan mengurai QR Code payload untuk santri dan asatidz', () => {
    const qrSantri = QRCodeHelper.generateSantriPayload('2026001', 'Ahmad Faiz', 'ULA', '1 A');
    expect(qrSantri).toBe('MADIN:SANTRI:2026001:Ahmad Faiz:ULA:1 A');

    const parsedSantri = QRCodeHelper.parseScanInput(qrSantri);
    expect(parsedSantri.type).toBe('SANTRI');
    expect(parsedSantri.id).toBe('2026001');
    expect(parsedSantri.nama).toBe('Ahmad Faiz');

    const qrGuru = QRCodeHelper.generateAsatidzPayload('B12', 'Ustadz Lukman');
    const parsedGuru = QRCodeHelper.parseScanInput(qrGuru);
    expect(parsedGuru.type).toBe('ASATIDZ');
    expect(parsedGuru.id).toBe('B12');
  });
});
