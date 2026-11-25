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
