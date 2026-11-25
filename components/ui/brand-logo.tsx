import React from "react";

export function BrandLogo({
  compact = false,
  showCredit = true,
}: {
  compact?: boolean;
  showCredit?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div
        className={`flex shrink-0 items-center justify-center rounded-xl bg-[#141534] border border-[#D5DD54]/40 shadow-[0_2px_8px_-2px_rgba(20,21,52,0.28)] ${
          compact ? "h-8 w-8" : "h-9 w-9"
        }`}
      >
        <span
          className={`font-heading font-black tracking-tight text-white ${
            compact ? "text-xs" : "text-sm"
          }`}
        >
          V<span className="text-[#D5DD54]">W</span>
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-heading text-sm font-bold tracking-tight text-[#141534]">
            Vision<span className="text-[#585A74]">Cont</span>
          </p>
        </div>
        {showCredit && (
          <p className="truncate font-mono text-[10px] font-medium uppercase tracking-wider text-[#585A74]">
            by Vision<span className="text-[#141534] font-bold">Web</span>
          </p>
        )}
      </div>
    </div>
  );
}
