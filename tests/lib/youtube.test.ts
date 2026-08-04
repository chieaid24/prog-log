// YouTube link handling for the Expedition answer flow (ADR-0019): id parsing
// across every supported URL form, thumbnail derivation, and the oEmbed title
// lookup with its null-on-failure fallback.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchYouTubeTitle, parseYouTubeVideoId, youtubeThumbnailUrl } from "@/lib/youtube";

const ID = "dQw4w9WgXcQ";

describe("parseYouTubeVideoId", () => {
  it.each([
    ["watch", `https://www.youtube.com/watch?v=${ID}`],
    ["watch without www", `https://youtube.com/watch?v=${ID}`],
    ["watch on m.", `https://m.youtube.com/watch?v=${ID}`],
    ["watch with extra params", `https://www.youtube.com/watch?v=${ID}&t=43s&list=PLx`],
    ["watch over http", `http://www.youtube.com/watch?v=${ID}`],
    ["youtu.be", `https://youtu.be/${ID}`],
    ["youtu.be with share params", `https://youtu.be/${ID}?si=abcDEF123`],
    ["shorts", `https://www.youtube.com/shorts/${ID}`],
    ["embed", `https://www.youtube.com/embed/${ID}`],
    ["surrounding whitespace", `  https://youtu.be/${ID}  `],
  ])("parses the id from a %s URL", (_form, url) => {
    expect(parseYouTubeVideoId(url)).toBe(ID);
  });

  it.each([
    ["not a URL", "not a url"],
    ["another site", `https://vimeo.com/123456`],
    ["a lookalike host", `https://fakeyoutube.com/watch?v=${ID}`],
    ["watch with no v param", "https://www.youtube.com/watch"],
    ["a malformed id", "https://www.youtube.com/watch?v=short"],
    ["a bare youtu.be", "https://youtu.be/"],
    ["a playlist", "https://www.youtube.com/playlist?list=PLx"],
    ["a channel path", "https://www.youtube.com/@someone"],
    ["a non-http scheme", `ftp://www.youtube.com/watch?v=${ID}`],
    ["an empty string", ""],
  ])("rejects %s", (_form, url) => {
    expect(parseYouTubeVideoId(url)).toBeNull();
  });
});

describe("youtubeThumbnailUrl", () => {
  it("derives the mqdefault thumbnail from the id", () => {
    expect(youtubeThumbnailUrl(ID)).toBe(`https://img.youtube.com/vi/${ID}/mqdefault.jpg`);
  });
});

describe("fetchYouTubeTitle", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads the title from the oEmbed endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ title: "But what is a neural network?" })),
    );
    vi.stubGlobal("fetch", fetchMock);

    const url = `https://www.youtube.com/watch?v=${ID}`;
    await expect(fetchYouTubeTitle(url)).resolves.toBe("But what is a neural network?");
    expect(fetchMock).toHaveBeenCalledWith(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    );
  });

  it("resolves null on a non-ok response (private or removed video)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Not Found", { status: 404 })));
    await expect(fetchYouTubeTitle(`https://youtu.be/${ID}`)).resolves.toBeNull();
  });

  it("resolves null on a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(fetchYouTubeTitle(`https://youtu.be/${ID}`)).resolves.toBeNull();
  });

  it("resolves null when the payload has no usable title", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ title: "  " }))),
    );
    await expect(fetchYouTubeTitle(`https://youtu.be/${ID}`)).resolves.toBeNull();
  });
});
