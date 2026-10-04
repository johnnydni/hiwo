import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-[#efe9df] via-paper to-paper">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col px-6">
        <div className="animate-fade-up flex flex-1 flex-col items-center justify-center pt-16 text-center">
          <h1 className="font-serif text-[72px] leading-none">hiwo</h1>
          <p className="mt-2 text-[16px] text-muted">hier wohne ich.</p>
          <p className="mt-10 max-w-[16rem] text-[15px] leading-relaxed text-ink/70">
            Dein Zuhause. Organisiert. Inspirierend.
          </p>
        </div>
        <div className="pb-12">
          <LoginForm next={next?.startsWith("/") ? next : "/"} />
        </div>
      </div>
    </main>
  );
}
