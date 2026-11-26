// DB check 제약과 같은 값. 순서 = 화면 표시 순서
export const LOCAL_CATEGORIES = [
  { value: "food", label: "식비", emoji: "🍜" },
  { value: "snack", label: "간식·카페", emoji: "☕" },
  { value: "transit", label: "교통", emoji: "🚇" },
  { value: "shopping", label: "쇼핑", emoji: "🛍️" },
  { value: "sightseeing", label: "관광", emoji: "🎡" },
  { value: "lodging", label: "숙소", emoji: "🏨" },
  { value: "etc", label: "기타", emoji: "🧾" },
] as const;

// 주로 출발 전에 한국에서 결제하는 것들
export const BOOKING_CATEGORIES = [
  { value: "flight", label: "항공", emoji: "✈️" },
  { value: "transport_booking", label: "교통 예약", emoji: "🚄" },
  { value: "ticket", label: "티켓·입장권", emoji: "🎟️" },
] as const;

export const CATEGORIES = [...LOCAL_CATEGORIES, ...BOOKING_CATEGORIES];
export type Category = (typeof CATEGORIES)[number]["value"];

export function isCategory(v: string): v is Category {
  return CATEGORIES.some((c) => c.value === v);
}

export function categoryInfo(v: string) {
  return CATEGORIES.find((c) => c.value === v) ?? { value: v, label: v, emoji: "🧾" };
}
