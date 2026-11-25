import React from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-blue-200 bg-blue-50/40 px-5 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-blue-100 bg-white text-blue-600 shadow-xs">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-[#0F172A]">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
