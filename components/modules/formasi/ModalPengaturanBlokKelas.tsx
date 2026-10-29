'use client';

import React from 'react';
import ModalHierarkiBlokKBM from './ModalHierarkiBlokKBM';
import { useFormasiStore } from '@/stores/useFormasiStore';

interface ModalPengaturanBlokKelasProps {
  fixedGender?: 'PA' | 'PI';
}

/**
 * @deprecated Fitur Pengaturan Blok Kelas lama telah dihapus dan digantikan oleh
 * ModalHierarkiBlokKBM (Hierarki Blok Diniyyah & Blok Takror).
 */
export default function ModalPengaturanBlokKelas({
  fixedGender = 'PA',
}: ModalPengaturanBlokKelasProps) {
  const { isBlokModalOpen, closeBlokModal, hierarkiModalDefaultCategory } = useFormasiStore();

  return (
    <ModalHierarkiBlokKBM
      isOpen={isBlokModalOpen}
      onClose={closeBlokModal}
      defaultCategory={hierarkiModalDefaultCategory || (fixedGender === 'PI' ? 'takror' : 'diniyyah')}
    />
  );
}
