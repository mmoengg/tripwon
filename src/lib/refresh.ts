import { revalidatePath } from "next/cache";

// 데이터가 바뀐 뒤 화면 새로 그리기.
// 여행 상세뿐 아니라 그 아래 화면(지출 수정·요약·정산·멤버 등)과 홈 목록까지 같이 갱신
// → 미리 불러와 둔(prefetch) 예전 화면이 보이지 않게
export function refreshTrips() {
  revalidatePath("/trips/[id]", "layout");
  revalidatePath("/");
}
