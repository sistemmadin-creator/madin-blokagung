'use client';

import React from 'react';
import ModalHierarchyBuilder from './ModalHierarchyBuilder';
import { HierarchyRule } from '@/lib/services/hierarchy-service';

export interface HierarchySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules?: HierarchyRule[];
  onSave?: (rules: HierarchyRule[]) => Promise<void>;
}

export function HierarchySettingsModal({
  isOpen,
  onClose,
}: HierarchySettingsModalProps) {
  return <ModalHierarchyBuilder isOpen={isOpen} onClose={onClose} />;
}

export default HierarchySettingsModal;
