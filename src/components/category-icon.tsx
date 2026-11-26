// 카테고리 선 아이콘 + 옅은 바탕 (이모지 대신). 색만으로 구분하지 않게 항상 이름과 같이 씀
const STYLES: Record<string, { bg: string; fg: string }> = {
  food: { bg: "#E5EBE1", fg: "#3F5A3B" },
  snack: { bg: "#F4EAD6", fg: "#7E5A16" },
  transit: { bg: "#E4E9EF", fg: "#34506B" },
  shopping: { bg: "#F2E3DC", fg: "#8A4630" },
  sightseeing: { bg: "#E0ECEA", fg: "#2F5D57" },
  lodging: { bg: "#ECE6EF", fg: "#5B4A6B" },
  etc: { bg: "#ECE9E3", fg: "#5E665F" },
  flight: { bg: "#E4E9EF", fg: "#34506B" },
  transport_booking: { bg: "#E4E9EF", fg: "#34506B" },
  ticket: { bg: "#E0ECEA", fg: "#2F5D57" },
};

const PATHS: Record<string, React.ReactNode> = {
  food: <path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 2-3 5s1 4 3 4v9" />,
  snack: (
    <>
      <path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9z" />
      <path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16M9 3v3M12 3v3" />
    </>
  ),
  transit: (
    <>
      <rect x="5" y="3" width="14" height="14" rx="3" />
      <path d="M5 11h14M8 17l-2 4M16 17l2 4" />
    </>
  ),
  shopping: (
    <>
      <path d="M6 8h12l-1 12H7L6 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  sightseeing: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  lodging: (
    <>
      <path d="M3 19V7M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6" />
      <circle cx="7" cy="11" r="2" />
    </>
  ),
  etc: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  flight: <path d="M10 13l-6-2 1-2 7 1 4-5c1-1 3-1 3 1l-4 5 1 7-2 1-2-6-3 3v2l-2 1-1-3-3-1 1-2h2z" />,
  transport_booking: (
    <>
      <rect x="5" y="3" width="14" height="14" rx="3" />
      <path d="M5 11h14M8 17l-2 4M16 17l2 4" />
    </>
  ),
  ticket: (
    <>
      <path d="M3 9a2 2 0 0 0 0 6v3h18v-3a2 2 0 0 1 0-6V6H3v3z" />
      <path d="M14 6v12" strokeDasharray="2 2" />
    </>
  ),
};

export function CategoryIcon({ category, size = 36 }: { category: string; size?: number }) {
  const s = STYLES[category] ?? STYLES.etc;
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-lg"
      style={{ width: size, height: size, background: s.bg, color: s.fg }}
      aria-hidden="true"
    >
      <svg
        width={size / 2}
        height={size / 2}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {PATHS[category] ?? PATHS.etc}
      </svg>
    </span>
  );
}
