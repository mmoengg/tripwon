import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

// 서버 컴포넌트 / Route Handler / Server Action용 — 요청마다 새로 만들 것
export async function createClient() {
  // supabase-js가 내부에서 Date.now()를 씀(토큰 만료 확인) → 미리 그리는 단계에서는 여기서 멈추고
  // 실제 요청 때만 진행하게 함. 서버 액션·라우트 핸들러에서는 바로 통과됨
  await connection();
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // 서버 컴포넌트에서는 쿠키를 못 씀 — proxy가 세션 갱신을 맡으므로 무시
          }
        },
      },
    },
  );
}
