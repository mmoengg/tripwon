import { createClient } from "@supabase/supabase-js";

// Supabase 무료 플랜은 7일간 활동이 없으면 프로젝트를 일시정지함
// → Vercel Cron이 하루 1번 이 주소를 불러 DB에 가벼운 조회를 보냄 (vercel.json 참고)
export async function GET(request: Request) {
  // Vercel은 CRON_SECRET 환경 변수가 있으면 cron 호출에 이 헤더를 붙여줌. 아무나 못 부르게 확인
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 쿠키 없는 익명 클라이언트: RLS 때문에 행은 0개가 오지만, 쿼리 자체는 DB에서 실행돼 활동으로 잡힘
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { error } = await supabase.from("trips").select("id").limit(1);
  if (error) {
    // 실패하면 Vercel 대시보드 cron 로그에 500으로 남음
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true, at: new Date().toISOString() });
}
