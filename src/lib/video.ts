export type VideoProvider = "youtube" | "vimeo" | "panda" | "unknown";

export interface ParsedVideo {
  provider: VideoProvider;
  videoId: string | null;
  // Panda Video uses tenant-specific subdomains (player-vz-XXXX.tv.pandavideo.com.br),
  // so we must preserve the host from the original URL to render the embed.
  embedHost?: string;
}

/**
 * Extract provider + video id from a raw YouTube/Vimeo/Panda URL.
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
 *
 * Supported Panda formats:
 *   - https://player-vz-XXXX.tv.pandavideo.com.br/embed/?v=VIDEO_ID
 *   - https://player-vz-XXXX.tv.pandavideo.com.br/VIDEO_ID
 *   - Full <iframe src="..."> snippet pasted by the producer
 */
export function parseVideoUrl(url: string): ParsedVideo {
  if (!url) return { provider: "unknown", videoId: null };

  // If the producer pasted the full <iframe> embed code, extract the src
  // and recurse with the URL alone.
  const iframeMatch = url.match(/src=["']([^"']+pandavideo[^"']+)["']/i);
  if (iframeMatch) {
    return parseVideoUrl(iframeMatch[1]);
  }

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

    // Panda Video
    if (
      host === "pandavideo.com.br" ||
      host.endsWith(".pandavideo.com.br") ||
      host.endsWith(".tv.pandavideo.com.br")
    ) {
      const vParam = u.searchParams.get("v");
      if (vParam) {
        return { provider: "panda", videoId: vParam, embedHost: u.host };
      }
      const pathParts = u.pathname.split("/").filter(Boolean);
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart !== "embed") {
        return { provider: "panda", videoId: lastPart, embedHost: u.host };
      }
      return { provider: "panda", videoId: null, embedHost: u.host };
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
