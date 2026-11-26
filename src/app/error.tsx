"use client"; // 에러 화면은 클라이언트 컴포넌트여야 함

import Link from "next/link";
import { useEffect } from "react";

// 데이터를 못 불러왔을 때: 빈 화면 대신 알려주고 다시 시도
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const message = error instanceof globalThis.Error ? error.message : String(error);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-4 px-6">
      <div className="flex flex-col gap-2 rounded-[14px] bg-card p-6">
        <p className="font-serif text-xl font-extrabold">불러오지 못했어요</p>
        <p className="text-sm text-muted">데이터는 그대로 있어요. 잠시 후 다시 시도해주세요.</p>
        <p className="mt-1 rounded-lg bg-paper px-3 py-2 font-mono text-xs break-all text-muted">{message}</p>
      </div>
      <button type="button" onClick={() => retry()} className="h-12 rounded-xl bg-accent font-semibold text-white">
        다시 시도
      </button>
      <Link href="/" className="flex h-11 items-center justify-center text-sm text-muted underline">
        내 여행으로
      </Link>
    </main>
  );
}
