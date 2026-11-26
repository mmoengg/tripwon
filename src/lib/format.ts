// "2026-12-01" → "2026.12.01"
const dot = (d: string) => d.replaceAll("-", ".");

// 여행 기간 표시: 같은 해면 끝 날짜에서 연도 생략
export function formatTripRange(start: string | null, end: string | null) {
  if (!start && !end) return "날짜 미정";
  if (start && !end) return `${dot(start)} ~`;
  if (!start && end) return `~ ${dot(end)}`;
  const sameYear = start!.slice(0, 4) === end!.slice(0, 4);
  return `${dot(start!)} – ${sameYear ? dot(end!.slice(5)) : dot(end!)}`;
}

const krwFmt = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const numFmt = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 });

export const formatKrw = (n: number) => `${krwFmt.format(n)}원`;
export const formatAmount = (n: number, currency: string) =>
  currency === "KRW" ? formatKrw(n) : `${numFmt.format(n)} ${currency}`;

// "2026-12-01" → "12월 1일 (월)"
export function formatDayHeader(d: string) {
  const date = new Date(`${d}T00:00:00`);
  const wd = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${wd})`;
}

// 서버에서 '오늘' 날짜를 한국 시간 기준 YYYY-MM-DD로
export function todayInSeoul() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

// 환율 표시: 1 미만(VND 등)은 소수 4자리, 그 외 2자리
export const formatRate = (r: number) =>
  new Intl.NumberFormat("ko-KR", { maximumFractionDigits: r < 1 ? 4 : 2 }).format(r);
