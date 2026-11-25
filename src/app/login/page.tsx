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
          <h1 className="text-2xl font-semibold">여행 경비</h1>
          <p className="text-sm text-neutral-500">어디서 얼마 썼는지, 원화로 한눈에</p>
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
            className="h-12 rounded-xl border border-neutral-200 bg-white font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-50"
        >
          {googleLoading ? "구글로 이동 중…" : "Google로 계속하기"}
        </button>

        <div className="flex items-center gap-3 text-xs text-neutral-400">
          <span className="h-px flex-1 bg-neutral-200" />
          또는 이메일로
          <span className="h-px flex-1 bg-neutral-200" />
        </div>

        {status === "sent" ? (
            <p className="rounded-xl bg-neutral-100 p-4 text-center text-sm">
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
                  className="h-12 rounded-xl border border-neutral-200 px-4 outline-none focus:border-neutral-400"
              />
              <button
                  disabled={status === "sending"}
                  className="h-12 rounded-xl bg-neutral-900 font-medium text-white disabled:opacity-50"
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