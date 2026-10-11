import type { DayOfWeek } from "@/lib/types";

/** Text color per weekday. Fri/Sat/Sun keep the original Weekend Fun colors. */
export const DAY_TEXT: Record<DayOfWeek, string> = {
  Mon: "text-[var(--good)]",
  Tue: "text-[#fda4af]",
  Wed: "text-[#5eead4]",
  Thu: "text-[#fdba74]",
  Fri: "text-[var(--accent)]",
  Sat: "text-[var(--accent-2)]",
  Sun: "text-[var(--warm)]",
};

export const DAY_CHIP: Record<DayOfWeek, string> = {
  Mon: "border-[rgba(134,239,172,0.4)] bg-[rgba(134,239,172,0.14)] text-[var(--good)]",
  Tue: "border-[rgba(253,164,175,0.4)] bg-[rgba(253,164,175,0.14)] text-[#fda4af]",
  Wed: "border-[rgba(94,234,212,0.4)] bg-[rgba(94,234,212,0.14)] text-[#5eead4]",
  Thu: "border-[rgba(253,186,116,0.4)] bg-[rgba(253,186,116,0.14)] text-[#fdba74]",
  Fri: "border-[rgba(125,211,252,0.4)] bg-[rgba(125,211,252,0.14)] text-[var(--accent)]",
  Sat: "border-[rgba(196,181,253,0.4)] bg-[rgba(196,181,253,0.14)] text-[var(--accent-2)]",
  Sun: "border-[rgba(251,191,36,0.4)] bg-[rgba(251,191,36,0.14)] text-[var(--warm)]",
};

export const DAY_WASH: Record<DayOfWeek, string> = {
  Mon: "from-[rgba(134,239,172,0.4)] via-[#13231d] to-[rgba(125,211,252,0.22)]",
  Tue: "from-[rgba(253,164,175,0.42)] via-[#241622] to-[rgba(196,181,253,0.22)]",
  Wed: "from-[rgba(94,234,212,0.4)] via-[#132324] to-[rgba(125,211,252,0.22)]",
  Thu: "from-[rgba(253,186,116,0.42)] via-[#241b16] to-[rgba(253,164,175,0.22)]",
  Fri: "from-[rgba(125,211,252,0.45)] via-[#16203d] to-[rgba(196,181,253,0.28)]",
  Sat: "from-[rgba(196,181,253,0.5)] via-[#1a1733] to-[rgba(125,211,252,0.22)]",
  Sun: "from-[rgba(251,191,36,0.42)] via-[#241c16] to-[rgba(196,181,253,0.22)]",
};
