"use client";

import { useState, useSyncExternalStore, useTransition } from "react";

// 브라우저에서만 알 수 있는 값 (서버 렌더링 때는 기본값). 바뀌지 않으므로 구독은 하지 않음
const noSubscribe = () => () => {};

type Props = {
  code: string | null;
  tripName: string;
  create: () => Promise<{ error?: string }>;
  disable: () => Promise<{ error?: string }>;
};

// 초대 링크: 만들기 · 복사 · 공유(폰) · 새로 바꾸기 · 끄기
export function InviteBox({ code, tripName, create, disable }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  // 주소는 브라우저에서만 알 수 있음 (배포 주소·localhost 둘 다 맞게)
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
  const canShare = useSyncExternalStore(noSubscribe, () => "share" in navigator, () => false);

  const url = code && origin ? `${origin}/join/${code}` : "";
  const run = (fn: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      setError("");
      const r = await fn();
      if (r.error) setError(r.error);
    });

  if (!code) {
    return (
      <section className="flex flex-col gap-3 rounded-[14px] bg-card p-4">
        <div>
          <p className="text-sm font-medium">동행자 초대</p>
          <p className="text-xs text-muted">링크를 받은 사람은 로그인하고 이 여행에 참여할 수 있어요.</p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(create)}
          className="h-12 rounded-xl bg-accent font-semibold text-white disabled:opacity-50"
        >
          {pending ? "만드는 중…" : "초대 링크 만들기"}
        </button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-[14px] bg-card p-4">
      <div>
        <p className="text-sm font-medium">초대 링크</p>
        <p className="text-xs text-muted">이 링크가 있는 사람은 누구나 참여할 수 있어요. 믿는 사람에게만 보내주세요.</p>
      </div>
      <p className="truncate rounded-lg border border-field-line bg-field px-3 py-2.5 font-mono text-[13px] text-muted">
        {url || "…"}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!url}
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="h-11 rounded-xl border border-field-line bg-field text-sm font-semibold"
        >
          {copied ? "복사했어요 ✓" : "링크 복사"}
        </button>
        {canShare ? (
          <button
            type="button"
            disabled={!url}
            onClick={() => navigator.share({ title: `tripwon · ${tripName}`, text: `'${tripName}' 여행 경비를 같이 기록해요`, url }).catch(() => {})}
            className="h-11 rounded-xl bg-accent text-sm font-semibold text-white"
          >
            공유하기
          </button>
        ) : (
          <span />
        )}
      </div>
      <div className="flex justify-between text-xs">
        <button type="button" disabled={pending} onClick={() => run(create)} className="h-9 text-muted underline">
          새 링크로 바꾸기
        </button>
        <button type="button" disabled={pending} onClick={() => run(disable)} className="h-9 text-muted underline">
          링크 끄기
        </button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </section>
  );
}
