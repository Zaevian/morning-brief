/**
 * HTTPS hosts optimized through next/image.
 * `next.config.ts` reads this list. Any other HTTPS image still renders
 * through a plain img tag, so a new event CDN does not fail the build.
 * Wildcard hostnames use the same `**.example.com` form as Next.js.
 */
export const eventImageRemotePatterns: {
  protocol: "https";
  hostname: string;
  pathname: "/**";
}[] = [
  { protocol: "https", hostname: "**.evbuc.com", pathname: "/**" },
  { protocol: "https", hostname: "**.eventbrite.com", pathname: "/**" },
  { protocol: "https", hostname: "**.eventbriteapi.com", pathname: "/**" },
  { protocol: "https", hostname: "**.ticketmaster.com", pathname: "/**" },
  { protocol: "https", hostname: "**.ticketm.net", pathname: "/**" },
  { protocol: "https", hostname: "**.ticketweb.com", pathname: "/**" },
  { protocol: "https", hostname: "**.axs.com", pathname: "/**" },
  { protocol: "https", hostname: "**.seetickets.com", pathname: "/**" },
  { protocol: "https", hostname: "dice.fm", pathname: "/**" },
  { protocol: "https", hostname: "**.dice.fm", pathname: "/**" },
  { protocol: "https", hostname: "**.bandsintown.com", pathname: "/**" },
  { protocol: "https", hostname: "**.songkick.com", pathname: "/**" },
  { protocol: "https", hostname: "**.sk-static.com", pathname: "/**" },
  { protocol: "https", hostname: "**.residentadvisor.net", pathname: "/**" },
  { protocol: "https", hostname: "images.universe.com", pathname: "/**" },
  { protocol: "https", hostname: "**.meetupstatic.com", pathname: "/**" },
  { protocol: "https", hostname: "**.cloudinary.com", pathname: "/**" },
  { protocol: "https", hostname: "**.imgix.net", pathname: "/**" },
  { protocol: "https", hostname: "**.fbcdn.net", pathname: "/**" },
  { protocol: "https", hostname: "**.cdninstagram.com", pathname: "/**" },
  { protocol: "https", hostname: "**.googleusercontent.com", pathname: "/**" },
  { protocol: "https", hostname: "**.squarespace-cdn.com", pathname: "/**" },
  { protocol: "https", hostname: "**.wp.com", pathname: "/**" },
  { protocol: "https", hostname: "upload.wikimedia.org", pathname: "/**" },
  { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
  { protocol: "https", hostname: "**.unsplash.com", pathname: "/**" },
  { protocol: "https", hostname: "i.scdn.co", pathname: "/**" },
];

function hostnameMatches(hostname: string, pattern: string): boolean {
  if (pattern.startsWith("**.")) {
    return hostname.endsWith(`.${pattern.slice(3)}`);
  }
  return hostname === pattern;
}

export function isOptimizableEventImage(src: string): boolean {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return eventImageRemotePatterns.some((pattern) =>
    hostnameMatches(url.hostname, pattern.hostname)
  );
}
