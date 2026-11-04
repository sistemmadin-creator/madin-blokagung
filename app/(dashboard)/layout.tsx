'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import SidebarDesktop from '@/components/layout/SidebarDesktop';
import BottomNavMobile from '@/components/layout/BottomNavMobile';
import UndoRedoGlobalHandler from '@/components/common/UndoRedoGlobalHandler';
import FloatingUndoToast from '@/components/common/FloatingUndoToast';
import UndoConflictModal from '@/components/common/UndoConflictModal';
import RealtimeSyncListener from '@/components/common/RealtimeSyncListener';
import OfflineStatusIndicator from '@/components/common/OfflineStatusIndicator';
import { useAppStore } from '@/stores/useAppStore';
import { supabase } from '@/lib/supabase/client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSidebarCollapsed } = useAppStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (isMounted && !user) {
        const nextQuery = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
        router.replace(`/login${nextQuery}`);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.replace('/login');
        router.refresh();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

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
      <UndoConflictModal />
      <RealtimeSyncListener />
      <OfflineStatusIndicator />
    </div>
  );
}
