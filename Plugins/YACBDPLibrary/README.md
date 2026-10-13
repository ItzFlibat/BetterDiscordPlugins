# YACBDP Library

YACBDP Library provides the shared runtime required by the plugins in this collection and a **YACBDP Plugins** dashboard. Open **Settings → BetterDiscord → Plugins → YACBDP Library → Settings** to see installed collection plugins, their versions, source links, and enable or disable controls.

## Install

1. Download [YACBDPLibrary.plugin.js](https://raw.githubusercontent.com/ItzFlibat/BetterDiscordPlugins/refs/heads/main/Plugins/YACBDPLibrary/YACBDPLibrary.plugin.js).
2. In Discord, open **Settings → BetterDiscord → Plugins → Open Plugins Folder**.
3. Place the file in that folder and enable **YACBDP Library** before enabling the other plugins in this collection.

The collection plugins check for the enabled library when they start. Keep YACBDP Library enabled while using them. This dashboard is available through the library plugin's BetterDiscord settings panel.

## Development

Requires Bun. From the repository root, run `bun install`, then `bun run --cwd Plugins/YACBDPLibrary build`. The build type-checks and creates `dist/YACBDPLibrary.plugin.js` and `YACBDPLibrary.plugin.js`.
