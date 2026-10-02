"use client";

import { useState } from "react";
import Image from "next/image";
import type { WeekendDay } from "@/lib/types";
import { isOptimizableEventImage } from "@/lib/image-hosts";

const WASH: Record<WeekendDay, string> = {
  Fri: "from-[rgba(125,211,252,0.45)] via-[#16203d] to-[rgba(196,181,253,0.28)]",
  Sat: "from-[rgba(196,181,253,0.5)] via-[#1a1733] to-[rgba(125,211,252,0.22)]",
  Sun: "from-[rgba(251,191,36,0.42)] via-[#241c16] to-[rgba(196,181,253,0.22)]",
};

function Placeholder({ day }: { day: WeekendDay }) {
  return (
    <div
      className={`absolute inset-0 bg-gradient-to-br ${WASH[day]}`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_24%,rgba(255,255,255,0.2),transparent_34%),radial-gradient(circle_at_78%_78%,rgba(255,255,255,0.1),transparent_32%)]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-sm">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-white/85" fill="none">
            <path
              d="M12 3.5 13.8 8.7 19.3 9.2 15.4 12.8 16.6 18.2 12 15.4 7.4 18.2 8.6 12.8 4.7 9.2 10.2 8.7 12 3.5Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}

export function EventImage({
  src,
  day,
}: {
  src: string | null;
  day: WeekendDay;
}) {
  const [failed, setFailed] = useState(false);
  const photo = src != null && !failed ? src : null;

  return (
    <div className="absolute inset-0">
      {photo == null ? (
        <Placeholder day={day} />
      ) : isOptimizableEventImage(photo) ? (
        <Image
          src={photo}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:scale-[1.04]"
          onError={() => setFailed(true)}
        />
      ) : (
        // Hosts outside remotePatterns stay on a plain img so a new CDN cannot fail the build.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt=""
          className="h-full w-full object-cover motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:scale-[1.04]"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
