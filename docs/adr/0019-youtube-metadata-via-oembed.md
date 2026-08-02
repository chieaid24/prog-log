# 0019 - Resolve a YouTube title and thumbnail via oEmbed at answer time

- **Status:** accepted
- **Date:** 2026-08-02
- **Related:** PRD #55 (expeditions), ADR-0018 (expeditions model)

## Context

An answered Expedition shows a small thumbnail and the video's real title, linking out to YouTube
(ADR-0018). The owner pastes only a YouTube URL when answering. We need the video's title and a
thumbnail from that URL alone, on the app's free-tier footing, without provisioning a YouTube API key,
quota, or OAuth, and without shipping a heavy player onto the showcase.

## Decision

At answer time we parse the video id from the pasted URL - handling `watch?v=`, `youtu.be/`,
`/shorts/`, and `/embed/` forms - then fetch YouTube's public oEmbed endpoint
(`https://www.youtube.com/oembed?url=<url>&format=json`) server-side to read the video `title`. We
store `youtube_video_id` and `youtube_title` on the row and derive the thumbnail URL from the id
(`https://img.youtube.com/vi/<id>/mqdefault.jpg`), so no asset is stored and no API key is needed.
The title is captured once at answer time, not re-fetched on render. If the URL has no parseable id we
reject the answer (link-required means a *valid* link). If oEmbed fails at answer time (private or
removed video, network error) we still store the id with a null title, and the showcase falls back to
the raw link.

## Consequences

- No YouTube Data API key, quota, or OAuth to manage; one fetch happens at write time and nothing at
  render; thumbnails are a plain `<img>` URL derived from the id.
- A stored title can go stale if the owner later renames the video - acceptable, and re-answering or
  editing the link refreshes it. oEmbed can be rate-limited or briefly down at answer time, which is
  why a null-title fallback exists rather than blocking the answer on the fetch.
- Rejected: the YouTube Data API (needs a key and quota for data oEmbed gives keyless); a client-side
  iframe embed per answered card (heavy, privacy-leaky, and "make it small" wants a thumbnail, not a
  player); storing nothing and scraping the title on every render (slow, fragile, and repeated).
