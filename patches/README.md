# Yammbo Tv patches

## stremio-colors red palette

File: `patches/stremio-colors.yammbo-red.less`

This overrides `@stremio/stremio-colors/less/stremio-colors.less` to swap
the primary purple palette (hue 275.1 / 276.8) for a Yammbo red
(hue 0, saturation 75%).

**How to re-apply after `pnpm install` (which resets node_modules):**

```bash
cp patches/stremio-colors.yammbo-red.less \
   node_modules/@stremio/stremio-colors/less/stremio-colors.less
```

Or use `pnpm patch` to persist the override:

```bash
pnpm patch @stremio/stremio-colors
# edit stremio-colors.less in the temp dir as desired
pnpm patch-commit <path-printed-by-previous-cmd>
```

After patching, rebuild:

```bash
pnpm run build
```

Then rsync `build/` to the Laravel `public/app/` directory.

## PWA manifest colors

`manifest.json` also carries `theme_color=#dc2626` and
`background_color=#000000` for the PWA install prompt.

## YouTube trailer language

File: `patches/YouTubeVideo.yambo-lang.js`

This overrides `@stremio/stremio-video/src/YouTubeVideo/YouTubeVideo.js` so the
embedded trailer player follows the interface language instead of defaulting to
English: it passes `hl` and `cc_lang_pref` from the resolved Yammbo locale, and
`cc_load_policy` forces subtitles on for every language except English.

**How to re-apply after `pnpm install` (which resets node_modules):**

```bash
cp patches/YouTubeVideo.yambo-lang.js \
   node_modules/@stremio/stremio-video/src/YouTubeVideo/YouTubeVideo.js
```

The copy above is the whole patched file, kept in the repo because the edit
lived only in node_modules and any install would have silently reverted it.

## HLS detection for live TV

File: `patches/getContentType.yambo-hls.js`

This overrides `@stremio/stremio-video/src/HTMLVideo/getContentType.js`.
HTMLVideo hands a stream to hls.js only when this returns exactly
`application/vnd.apple.mpegurl`; anything else goes to `<video src>`, and the
native HLS of Chrome 150 fails on many live streams that hls.js plays ("Video
is not supported", e.g. Cartoon Network). The override:

- normalises HLS types (`application/x-mpegURL`, `...; charset=utf-8`,
  `audio/mpegurl`): ~18% of live channels answer the `HEAD` that way;
- treats a `.m3u8` path as HLS when the `HEAD` answered with a generic type or
  a non-2xx status (an answer at all proves CORS, which is all hls.js needs);
- skips the `HEAD` for `.m3u8` in browsers without native HLS (Firefox).

Only a `HEAD` that fails outright (no CORS) falls back to `<video src>`, which
does not need CORS. Measured 2026-11-11 in Chrome 150 on 42 sampled channels,
2 tries per path: 34 played before, 38 after. The data build of `yammbocom/yammbo-iptv`
(`scripts/build.mjs`, `isM3u8Path`) relies on this: it publishes `.m3u8`
links without checking the `HEAD`, so the two tests must stay identical.

**How to re-apply after `pnpm install` (which resets node_modules):**

```bash
cp patches/getContentType.yambo-hls.js \
   node_modules/@stremio/stremio-video/src/HTMLVideo/getContentType.js
```
