// DB check 제약 (prepaid / cash / credit) 과 같은 값
export const PAYMENT_METHODS = [
  { value: "prepaid", label: "충전카드", hint: "하나머니·트래블월렛처럼 미리 충전한 카드. 환전 평균 환율로 계산해요." },
  { value: "cash", label: "현금", hint: "환전한 현금. 충전카드와 같은 주머니로 보고 환전 평균 환율로 계산해요." },
  { value: "credit", label: "신용카드", hint: "여행 기본 환율로 예상 금액을 계산해요. 명세서가 나오면 실제 금액으로 고칠 수 있어요." },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

export function isPaymentMethod(v: string): v is PaymentMethod {
  return PAYMENT_METHODS.some((m) => m.value === v);
}

export function paymentLabel(v: string) {
  return PAYMENT_METHODS.find((m) => m.value === v)?.label ?? v;
}
