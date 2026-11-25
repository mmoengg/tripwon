import Link from "next/link";
import { NewTripForm } from "./new-trip-form";

export default function NewTripPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-8">
      <header className="flex items-center gap-3">
        <Link href="/" className="text-sm text-neutral-500" aria-label="목록으로">
          ← 목록
        </Link>
      </header>
      <h1 className="text-2xl font-semibold">새 여행</h1>
      <NewTripForm />
    </main>
  );
}
