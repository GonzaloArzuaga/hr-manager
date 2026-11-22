import React from "react";
import { Block, CardsGridSkeleton, Panel, TitleSkeleton, TwoColumnStackSkeleton } from "./shared";

export default function DashboardEmployerSkeleton() {
  return (
    <div className="flex min-h-screen bg-[#f7f8ff] p-[1.375rem] font-sans text-slate-800 antialiased" role="status" aria-live="polite">
      <main className="mx-auto w-full max-w-[96.875rem] space-y-4">
        <TitleSkeleton compact />
        <CardsGridSkeleton count={4} columns={4} />

        <Panel>
          <Block className="h-3.5 w-52" />
          <Block className="mt-4 h-32 w-full" />
        </Panel>

        <TwoColumnStackSkeleton
          left={
            <Panel className="h-[20rem]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <Block className="h-3.5 w-40" />
                <Block className="h-5 w-24 rounded-full" />
              </div>
              <div className="space-y-2.5">
                {Array.from({ length: 4 }, (_, index) => (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-[#f3f6ff] p-2.5" key={index}>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <Block className="h-8 w-8 rounded-full" />
                      <div className="w-full space-y-1.5">
                        <Block className="h-2.5 w-2/3" />
                        <Block className="h-2 w-1/2" />
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Block className="h-6 w-16" />
                      <Block className="h-6 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          }
          right={
            <Panel className="h-[20rem]">
              <Block className="h-3.5 w-36" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-[#f0f4ff] p-2.5" key={index}>
                    <div className="flex min-w-0 items-center gap-2">
                      <Block className="h-7 w-7 rounded-full" />
                      <div className="w-full space-y-1.5">
                        <Block className="h-2.5 w-24" />
                        <Block className="h-2 w-28" />
                      </div>
                    </div>
                    <Block className="h-5 w-16 rounded-sm" />
                  </div>
                ))}
              </div>
            </Panel>
          }
        />
      </main>
    </div>
  );
}
