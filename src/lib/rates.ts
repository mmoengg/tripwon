import { cacheLife } from "next/cache";

export type KrwRate = { rate: number; updatedAt: string };

// 1 {code} = ?원. 무료 API는 하루 1번 갱신 → 통화별로 몇 시간 캐시해서 호출 제한(429)도 피함
// 출처 표기 필수: "Rates By Exchange Rate API" (폼에 링크 있음)
export async function getKrwRate(code: string): Promise<KrwRate | null> {
  "use cache";
  cacheLife("hours");

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${code}`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      result: string;
      time_last_update_unix: number;
      rates?: Record<string, number>;
    };
    const krw = data.rates?.KRW;
    if (data.result !== "success" || !krw) return null;
    return {
      rate: krw,
      updatedAt: new Date(data.time_last_update_unix * 1000).toISOString().slice(0, 10),
    };
  } catch {
    return null;
  }
}
