// YouTube link handling for the Expedition answer flow (ADR-0019). The video
// id is parsed from the pasted URL; the title comes from one server-side
// oEmbed fetch at answer time and may be null (private/removed video, network
// failure), in which case the showcase falls back to the raw link. The
// thumbnail is derived from the id, so nothing is stored or re-fetched.

/** Canonical YouTube video ids: 11 URL-safe base64 characters. */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

function idOrNull(candidate: string | null | undefined): string | null {
  return candidate && VIDEO_ID.test(candidate) ? candidate : null;
}

/**
 * Extract the video id from a YouTube URL: `watch?v=`, `youtu.be/`,
 * `/shorts/` and `/embed/` forms, on any youtube.com subdomain. Returns null
 * when the URL is not parseable YouTube - link-required means a valid link.
 */
export function parseYouTubeVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

  const host = parsed.hostname.toLowerCase();
  const segments = parsed.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") return idOrNull(segments[0]);
  if (host !== "youtube.com" && !host.endsWith(".youtube.com")) return null;
  if (parsed.pathname === "/watch") return idOrNull(parsed.searchParams.get("v"));
  if (segments[0] === "shorts" || segments[0] === "embed") return idOrNull(segments[1]);
  return null;
}

/** Thumbnail for an answered Expedition, derived from the id (ADR-0019). */
export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

/**
 * Resolve the video's title via YouTube's keyless public oEmbed endpoint.
 * Server-side, once, at answer time. Any failure resolves null rather than
 * blocking the answer (ADR-0019).
 */
export async function fetchYouTubeTitle(url: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    );
    if (!res.ok) return null;
    const payload: unknown = await res.json();
    const title = (payload as { title?: unknown }).title;
    return typeof title === "string" && title.trim().length > 0 ? title : null;
  } catch {
    return null;
  }
}
