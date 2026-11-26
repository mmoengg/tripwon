"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const authError = params.get("error");
  const [message, setMessage] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const redirectTo = () =>
      `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

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
            className="flex h-[52px] items-center justify-center gap-2 rounded-xl border border-field-line bg-field font-semibold text-ink hover:bg-card disabled:opacity-50"
        >
          {googleLoading ? "구글로 이동 중…" : "Google로 계속하기"}
        </button>

        {message && <p className="text-sm text-red-700">{message}</p>}

        <p className="text-center text-xs leading-relaxed text-muted">
          구글 계정으로 로그인해요. 동행자도 초대 링크를 열고 구글로 로그인하면 바로 참여할 수 있어요.
        </p>
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