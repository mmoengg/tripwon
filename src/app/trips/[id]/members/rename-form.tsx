"use client";

import { useActionState } from "react";
import type { RenameState } from "../../member-actions";

// 이 여행에서 동행자들에게 보이는 내 이름
export function RenameForm({
  action,
  defaultName,
}: {
  action: (prev: RenameState, formData: FormData) => Promise<RenameState>;
  defaultName: string;
}) {
  const [state, formAction, pending] = useActionState<RenameState, FormData>(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <label htmlFor="display_name" className="text-sm font-medium">
        이 여행에서 보이는 내 이름
      </label>
      <div className="flex gap-2">
        <input
          id="display_name"
          name="display_name"
          required
          maxLength={40}
          defaultValue={defaultName}
          className="h-12 min-w-0 flex-1 rounded-xl border border-field-line bg-field px-4 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        <button disabled={pending} className="h-12 shrink-0 rounded-xl bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "…" : "저장"}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="text-sm text-accent-ink">저장했어요.</p>}
    </form>
  );
}
