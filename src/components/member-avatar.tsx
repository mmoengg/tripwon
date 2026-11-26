// 멤버 동그라미: 이름 첫 글자. 색은 순서대로 (색만으로 구분하지 않게 항상 이름과 같이 쓰거나 aria-label)
const TONES = [
  { bg: "#4E6B4A", fg: "#FFFFFF" }, // 올리브
  { bg: "#C9893A", fg: "#24302A" }, // 우표
  { bg: "#34506B", fg: "#FFFFFF" }, // 남색
  { bg: "#8A4630", fg: "#FFFFFF" }, // 벽돌
  { bg: "#5B4A6B", fg: "#FFFFFF" }, // 보라
  { bg: "#2F5D57", fg: "#FFFFFF" }, // 청록
];

export function MemberAvatar({ name, index, size = 32 }: { name: string; index: number; size?: number }) {
  const t = TONES[index % TONES.length];
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-paper"
      style={{ width: size, height: size, background: t.bg, color: t.fg, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {Array.from(name.trim())[0] ?? "?"}
    </span>
  );
}
