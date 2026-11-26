import type { NextRequest } from "next/server";
import { getExpenses, getMembers, getTrip, type ExpenseRow } from "@/lib/trips";
import { categoryInfo } from "@/lib/categories";
import { paymentLabel } from "@/lib/payment-methods";

const RATE_SOURCE_LABEL: Record<ExpenseRow["rate_source"], string> = {
  krw: "원화 입력",
  actual: "명세서 금액",
  exchange: "환전 평균 환율",
  trip: "기본 환율(예상)",
};

// CSV 한 칸: 쉼표·따옴표·줄바꿈이 있으면 따옴표로 감쌈.
// 엑셀이 =, +, -, @ 로 시작하는 글자를 수식으로 실행하지 않게 앞에 ' 를 붙임
function cell(v: string | number) {
  let s = String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

// 로그인은 proxy가 확인하고, 내 여행인지는 RLS + getTrip이 확인함
export async function GET(_req: NextRequest, ctx: RouteContext<"/trips/[id]/export">) {
  const { id } = await ctx.params;
  const trip = await getTrip(id);
  if (!trip) return new Response("Not found", { status: 404 });

  // 화면은 최신순이지만 파일은 날짜 순서대로
  const [all, members] = await Promise.all([getExpenses(id), getMembers(id)]);
  const expenses = all.reverse();
  const nameOf = (uid: string | null) => members.find((m) => m.user_id === uid)?.display_name ?? "";

  const header = ["날짜", "내용", "카테고리", "결제 장소", "결제 수단", "금액", "통화", "원화 금액", "환산 기준", "낸 사람", "메모"];
  const rows = expenses.map((e) => [
    e.spent_on,
    e.title,
    categoryInfo(e.category).label,
    e.paid_where === "korea" ? "한국에서 미리" : "현지",
    paymentLabel(e.method, trip.currency === "KRW"),
    e.amount,
    e.currency,
    e.amount_krw,
    RATE_SOURCE_LABEL[e.rate_source] ?? e.rate_source,
    e.from_pool ? "공금" : nameOf(e.paid_by),
    e.memo ?? "",
  ]);
  const total = expenses.reduce((s, e) => s + e.amount_krw, 0);
  rows.push(["", "합계", "", "", "", "", "", total, "", "", ""]);

  // ﻿(BOM): 엑셀이 UTF-8로 인식해서 한글이 안 깨짐. 줄바꿈은 엑셀 기본인 CRLF
  const csv = "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");

  const filename = `${trip.name}_지출.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      // 한글 파일명은 filename*로, 구형 브라우저용 filename은 ASCII 대체
      "Content-Disposition": `attachment; filename="trip-expenses.csv"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
