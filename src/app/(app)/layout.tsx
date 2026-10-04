"use client";

import { BottomNav, SideNav } from "@/components/nav";
import { AiFab } from "@/components/ai-assistant";
import { AppProvider } from "@/components/app-context";
import { NotConfigured } from "@/components/not-configured";
import { isConfigured } from "@/lib/supabase";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isConfigured) return <NotConfigured />;
  return (
    <AppProvider>
      <div className="flex min-h-dvh">
        <SideNav />
        <main className="mx-auto w-full max-w-5xl flex-1 pb-28 md:px-10 md:pb-16">{children}</main>
        <BottomNav />
        <AiFab />
      </div>
    </AppProvider>
  );
}
