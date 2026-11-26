// 여행 통화 고정 목록 (A안). 나중에 전체 ISO 검색으로 바꿔도 DB는 그대로.
export const CURRENCIES = [
  { code: "JPY", name: "일본 엔" },
  { code: "USD", name: "미국 달러" },
  { code: "EUR", name: "유로" },
  { code: "THB", name: "태국 바트" },
  { code: "VND", name: "베트남 동" },
  { code: "TWD", name: "대만 달러" },
  { code: "CNY", name: "중국 위안" },
  { code: "HKD", name: "홍콩 달러" },
  { code: "SGD", name: "싱가포르 달러" },
  { code: "PHP", name: "필리핀 페소" },
  { code: "GBP", name: "영국 파운드" },
  { code: "AUD", name: "호주 달러" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export function isCurrencyCode(v: string): v is CurrencyCode {
  return CURRENCIES.some((c) => c.code === v);
}

export function currencyName(code: string) {
  return CURRENCIES.find((c) => c.code === code)?.name ?? code;
}

// 우표 모양 배지에 쓰는 통화 기호
const SYMBOLS: Record<string, string> = {
  JPY: "¥", USD: "$", EUR: "€", THB: "฿", VND: "₫", TWD: "NT$",
  CNY: "¥", HKD: "HK$", SGD: "S$", PHP: "₱", GBP: "£", AUD: "A$", KRW: "₩",
};
export const currencySymbol = (code: string) => SYMBOLS[code] ?? code;
