# YACBDP

YACBDP provides the shared runtime required by the plugins in this collection and a plugin dashboard. Open **Settings → BetterDiscord → Plugins → YACBDP → Settings** to see installed collection plugins, their versions, source links, and enable or disable controls.

## Install

1. Download [YACBDP.plugin.js](https://raw.githubusercontent.com/ItzFlibat/BetterDiscordPlugins/refs/heads/main/Plugins/YACBDP/YACBDP.plugin.js).
2. In Discord, open **Settings → BetterDiscord → Plugins → Open Plugins Folder**.
3. Place the file in that folder and enable **YACBDP** before enabling the other plugins in this collection.

The collection plugins check for the enabled library when they start. Keep YACBDP enabled while using them. This dashboard is available through the library plugin's BetterDiscord settings panel.

## Development

Requires Bun. From the repository root, run `bun install`, then `bun run --cwd Plugins/YACBDP build`. The build type-checks and creates `dist/YACBDP.plugin.js` and `YACBDP.plugin.js`.
