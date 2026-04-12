export type VideoProvider = "youtube" | "vimeo" | "unknown";

export interface ParsedVideo {
  provider: VideoProvider;
  videoId: string | null;
}

/**
 * Extract provider + video id from a raw YouTube/Vimeo URL.
 * Returns { provider: 'unknown', videoId: null } if it can't be parsed.
 *
 * Supported YouTube formats:
 *   - https://www.youtube.com/watch?v=ID
 *   - https://youtu.be/ID
 *   - https://www.youtube.com/embed/ID
 *   - https://www.youtube.com/shorts/ID
 *
 * Supported Vimeo formats:
 *   - https://vimeo.com/123456789
 *   - https://player.vimeo.com/video/123456789
 *   - https://vimeo.com/channels/staffpicks/123456789
 */
export function parseVideoUrl(url: string): ParsedVideo {
  if (!url) return { provider: "unknown", videoId: null };

  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    // YouTube
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.searchParams.get("v")) {
        return { provider: "youtube", videoId: u.searchParams.get("v") };
      }
      const embedMatch = u.pathname.match(/^\/(?:embed|shorts|v)\/([^/?#]+)/);
      if (embedMatch) return { provider: "youtube", videoId: embedMatch[1] };
    }
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split(/[/?#]/)[0];
      if (id) return { provider: "youtube", videoId: id };
    }

    // Vimeo
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const parts = u.pathname.split("/").filter(Boolean);
      const numeric = parts.find((p) => /^\d+$/.test(p));
      if (numeric) return { provider: "vimeo", videoId: numeric };
    }

    return { provider: "unknown", videoId: null };
  } catch {
    return { provider: "unknown", videoId: null };
  }
}

export function buildEmbedUrl(video: ParsedVideo, origin?: string): string | null {
  if (!video.videoId) return null;

  if (video.provider === "youtube") {
    const params = new URLSearchParams({
      enablejsapi: "1",
      modestbranding: "1",
      rel: "0",
      playsinline: "1",
      ...(origin && { origin }),
    });
    return `https://www.youtube-nocookie.com/embed/${video.videoId}?${params.toString()}`;
  }

  if (video.provider === "vimeo") {
    const params = new URLSearchParams({
      dnt: "1",
      title: "0",
      byline: "0",
      portrait: "0",
    });
    return `https://player.vimeo.com/video/${video.videoId}?${params.toString()}`;
  }

  return null;
}
