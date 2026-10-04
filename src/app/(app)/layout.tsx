import { BottomNav, SideNav } from "@/components/nav";
import { AiFab } from "@/components/ai-assistant";
import { getContext } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await getContext(); // auth + onboarding gate
  return (
    <div className="flex min-h-dvh">
      <SideNav />
      <main className="mx-auto w-full max-w-5xl flex-1 pb-28 md:px-10 md:pb-16">{children}</main>
      <BottomNav />
      <AiFab />
    </div>
  );
}
