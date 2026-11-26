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
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-6 py-10">
        {/* 엽서 한 장: 항공우편 줄무늬 + ₩ 우표 */}
        <header className="airmail rounded-[10px] p-1.5">
          <div className="relative flex flex-col gap-3 rounded-md bg-card px-6 pt-8 pb-7">
            <span
                className="absolute top-5 right-5 flex h-[62px] w-[54px] rotate-[6deg] flex-col items-center justify-center rounded border-2 border-dashed border-stamp text-stamp-ink"
                aria-hidden="true"
            >
              <span className="font-serif text-2xl font-extrabold leading-none">₩</span>
              <span className="mt-1 text-[10px] font-semibold tracking-wider">KRW</span>
            </span>
            <span className="text-xs tracking-[2px] text-muted">TRAVEL · EXPENSES</span>
            <h1 className="font-serif text-[40px] leading-none font-extrabold tracking-tight">tripwon</h1>
            <p className="text-[15px] leading-relaxed text-muted">
              어디서 얼마 썼는지,
              <br />
              원화로 한눈에.
            </p>
          </div>
        </header>

        {authError && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              로그인에 실패했어요. 다시 시도해주세요.
            </p>
        )}

        <button
            type="button"
            onClick={loginWithGoogle}
            disabled={googleLoading}
            className="h-12 rounded-xl border border-field-line bg-field font-semibold text-ink hover:bg-card disabled:opacity-50"
        >
          {googleLoading ? "구글로 이동 중…" : "Google로 계속하기"}
        </button>

        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" />
          또는 이메일로
          <span className="h-px flex-1 bg-line" />
        </div>

        {status === "sent" ? (
            <div className="flex flex-col items-center gap-2 rounded-[14px] bg-card p-5 text-center text-sm shadow-[0_1px_0_var(--color-line)]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-accent" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
              <p>
                <b className="break-all">{email}</b> 으로
                <br />
                로그인 링크를 보냈어요. 메일함을 확인해주세요.
              </p>
            </div>
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
              {status === "error" && <p className="text-sm text-red-700">{message}</p>}
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