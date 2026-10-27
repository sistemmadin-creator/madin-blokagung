'use client';

import React from 'react';
import Navbar from '@/components/layout/Navbar';
import SidebarDesktop from '@/components/layout/SidebarDesktop';
import BottomNavMobile from '@/components/layout/BottomNavMobile';
import UndoRedoGlobalHandler from '@/components/common/UndoRedoGlobalHandler';
import FloatingUndoToast from '@/components/common/FloatingUndoToast';
import { useAppStore } from '@/stores/useAppStore';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSidebarCollapsed } = useAppStore();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800">
      <UndoRedoGlobalHandler />
      <Navbar />
      <SidebarDesktop />
      <main
        className={`pt-[70px] pb-24 md:pb-8 transition-all duration-300 ease-in-out min-h-screen ${
          isSidebarCollapsed ? 'ml-0 md:ml-[88px]' : 'ml-0 md:ml-[260px]'
        }`}
      >
        <div className="w-full p-4 md:p-8">
          {children}
        </div>
      </main>
      <BottomNavMobile />
      <FloatingUndoToast />
    </div>
  );
}
