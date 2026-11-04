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
import { useRbacStore } from '@/stores/useRbacStore';
import {
  canViewPage,
  getFirstAllowedRoute,
  resolvePageIdFromPathname,
} from '@/lib/utils/rbacHelper';
import { supabase } from '@/lib/supabase/client';
import { ShieldAlert } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSidebarCollapsed } = useAppStore();
  const {
    currentAccount,
    fetchCurrentAccount,
    fetchAppSecurityStatus,
  } = useRbacStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      supabase.auth.getUser(),
      fetchAppSecurityStatus(),
    ]).then(([{ data: { user } }, isSecurityEnabled]) => {
      if (!isMounted) return;
      if (!user && isSecurityEnabled) {
        const nextQuery = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
        router.replace(`/login${nextQuery}`);
      } else if (user) {
        fetchCurrentAccount();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        const isSecurityEnabled = await fetchAppSecurityStatus();
        if (isSecurityEnabled) {
          router.replace('/login');
          router.refresh();
        }
      } else if (session?.user) {
        fetchCurrentAccount();
      }
    });

    const rbacChannel = supabase
      .channel('user-accounts-rbac-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_accounts' },
        () => {
          fetchCurrentAccount();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_security_config' },
        async () => {
          const isSecurityEnabled = await fetchAppSecurityStatus();
          if (isSecurityEnabled) {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
              router.replace('/login');
              router.refresh();
            }
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      supabase.removeChannel(rbacChannel);
    };
  }, [pathname, router, fetchCurrentAccount, fetchAppSecurityStatus]);

  const currentPageId = resolvePageIdFromPathname(pathname || '');
  const isRouteAllowed =
    !currentPageId || canViewPage(currentAccount, currentPageId, pathname || '');

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
          {isRouteAllowed ? (
            children
          ) : (
            <div
              role="alert"
              className="max-w-lg mx-auto my-12 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 text-center shadow-xs space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Akses Halaman Dibatasi
                </h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Akun Anda (<strong>@{currentAccount?.username}</strong>) tidak memiliki otoritas untuk membuka halaman ini.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.replace(getFirstAllowedRoute(currentAccount))}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0b5751] hover:bg-[#115e59] text-white text-xs font-bold transition"
              >
                Kembali ke Halaman Utama
              </button>
            </div>
          )}
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
