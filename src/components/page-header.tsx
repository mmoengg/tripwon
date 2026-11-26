import Link from "next/link";
import type { ReactNode } from "react";

// 모든 하위 화면 공통: 뒤로가기 + 명조체 제목 (디자인 D)
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="-ml-1 flex h-11 w-fit items-center gap-1 pr-2 text-sm text-muted hover:text-ink">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      <span className="max-w-[16rem] truncate">{children}</span>
    </Link>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="-mt-1 flex flex-col gap-1">
      <h1 className="font-serif text-[26px] font-extrabold tracking-tight break-keep">{children}</h1>
      {sub && <p className="text-sm text-muted">{sub}</p>}
    </header>
  );
}
