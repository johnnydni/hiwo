"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import { Splash } from "@/components/app-context";

// Magic link fallback (link in the e-mail instead of typing the code).
export default function ConfirmPage() {
  return (
    <Suspense fallback={<Splash />}>
      <Confirm />
    </Suspense>
  );
}

function Confirm() {
  const params = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    const token_hash = params.get("token_hash");
    const type = (params.get("type") ?? "email") as EmailOtpType;
    const nextParam = params.get("next") ?? "/";
    const next = nextParam.startsWith("/") ? nextParam : "/";
    (async () => {
      if (token_hash) {
        const supabase = createClient();
        const { error } = await supabase.auth.verifyOtp({ token_hash, type });
        if (!error) {
          await supabase.rpc("accept_pending_invites");
          router.replace(next);
          return;
        }
      }
      router.replace("/login");
    })();
  }, [params, router]);
  return <Splash />;
}
