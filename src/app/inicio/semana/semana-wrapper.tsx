"use client";

import { Suspense } from "react";
import SemanaContent from "./semana-content";

export default function SemanaWrapper() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-6">
          <p className="text-center text-slate-500 dark:text-slate-400">
            Carregando…
          </p>
        </div>
      }
    >
      <SemanaContent />
    </Suspense>
  );
}
