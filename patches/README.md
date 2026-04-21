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
