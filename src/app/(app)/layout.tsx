"use client";

import { BottomNav, SideNav } from "@/components/nav";
import { AppProvider } from "@/components/app-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div className="flex min-h-dvh">
        <SideNav />
        <main className="mx-auto w-full max-w-5xl flex-1 pb-28 md:px-10 md:pb-16">{children}</main>
        <BottomNav />
      </div>
    </AppProvider>
  );
}
