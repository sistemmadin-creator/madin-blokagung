import React from 'react';
import Navbar from '@/components/layout/Navbar';
import SidebarDesktop from '@/components/layout/SidebarDesktop';
import BottomNavMobile from '@/components/layout/BottomNavMobile';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <SidebarDesktop />
      <main className="flex-1 md:pl-20 pt-16 pb-20 md:pb-8 transition-all duration-300">
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <BottomNavMobile />
    </div>
  );
}
