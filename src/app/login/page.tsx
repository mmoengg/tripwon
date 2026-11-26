"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const authError = params.get("error");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const redirectTo = () =>
      `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function loginWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
    }
  }

  async function loginWithGoogle() {
    setGoogleLoading(true);
    const supabase = createClient();
    // 성공하면 구글 화면으로 페이지가 넘어가므로 그 뒤 코드는 에러일 때만 실행됨
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });
    if (error) {
      setGoogleLoading(false);
      setStatus("error");
      setMessage(error.message);
    }
  }

  return (
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">tripwon</h1>
          <p className="text-sm text-muted">어디서 얼마 썼는지, 원화로 한눈에</p>
        </header>

        {authError && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              로그인에 실패했어요. 다시 시도해주세요.
            </p>
        )}

        <button
            type="button"
            onClick={loginWithGoogle}
            disabled={googleLoading}
            className="h-12 rounded-xl border border-line bg-card font-medium text-ink hover:bg-paper disabled:opacity-50"
        >
          {googleLoading ? "구글로 이동 중…" : "Google로 계속하기"}
        </button>

        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" />
          또는 이메일로
          <span className="h-px flex-1 bg-line" />
        </div>

        {status === "sent" ? (
            <p className="rounded-xl bg-line-soft p-4 text-center text-sm">
              📮 <b>{email}</b> 으로 로그인 링크를 보냈어요.
              <br />
              메일함을 확인해주세요.
            </p>
        ) : (
            <form onSubmit={loginWithEmail} className="flex flex-col gap-3">
              <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-12 min-w-0 rounded-xl border border-field-line bg-field px-4 text-base text-ink outline-none placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <button
                  disabled={status === "sending"}
                  className="h-12 rounded-xl bg-accent font-semibold text-white disabled:opacity-50"
              >
                {status === "sending" ? "보내는 중…" : "로그인 링크 받기"}
              </button>
              {status === "error" && <p className="text-sm text-red-600">{message}</p>}
            </form>
        )}
      </main>
  );
}

export default function LoginPage() {
  return (
      <Suspense>
        <LoginForm />
      </Suspense>
  );
}