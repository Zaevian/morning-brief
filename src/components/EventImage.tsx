"use client";

import { useState, type SyntheticEvent } from "react";
import Image from "next/image";
import type { DayOfWeek } from "@/lib/types";
import { DAY_WASH } from "@/lib/day-style";
import { isOptimizableEventImage } from "@/lib/image-hosts";

function Placeholder({ day }: { day: DayOfWeek }) {
  return (
    <div
      className={`absolute inset-0 bg-gradient-to-br ${DAY_WASH[day]}`}
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

function useBrokenImage() {
  const [failed, setFailed] = useState(false);
  const markBroken = () => setFailed(true);
  const noteLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    if (event.currentTarget.naturalWidth === 0) markBroken();
  };
  const noteElement = (node: HTMLImageElement | null) => {
    if (!node) return;
    const check = () => {
      if (node.complete && node.naturalWidth === 0) markBroken();
    };
    check();
    node.addEventListener("load", check);
    node.addEventListener("error", markBroken);
    const timer = window.setTimeout(check, 1200);
    return () => {
      node.removeEventListener("load", check);
      node.removeEventListener("error", markBroken);
      window.clearTimeout(timer);
    };
  };
  return { failed, markBroken, noteElement, noteLoad };
}

export function EventImage({
  src,
  day,
}: {
  src: string | null;
  day: DayOfWeek;
}) {
  const { failed, markBroken, noteElement, noteLoad } = useBrokenImage();
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
          onError={markBroken}
          onLoad={noteLoad}
        />
      ) : (
        // Hosts outside remotePatterns stay on a plain img so a new CDN cannot fail the build.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={noteElement}
          src={photo}
          alt=""
          className="h-full w-full object-cover motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:scale-[1.04]"
          onError={markBroken}
          onLoad={noteLoad}
        />
      )}
    </div>
  );
}
