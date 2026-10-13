# BetterDiscordPlugins

Yet Another Collection of BetterDiscord Plugins

<p align="center">
  <a href="https://github.com/ItzFlibat/BetterDiscordPlugins/graphs/contributors"><img alt="Contributors" src="https://img.shields.io/github/contributors/ItzFlibat/BetterDiscordPlugins?style=for-the-badge&color=1A91FF" /></a>
  <a href="https://flibat.com/discord"><img alt="Discord community" src="https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" /></a>
</p>

## Plugins

| Plugin | Description | Documentation | Download |
| --- | --- | --- | --- |
| YACBDP | Shared runtime and a dashboard for managing this collection. | [README](Plugins/YACBDP/README.md) | [YACBDP.plugin.js](https://raw.githubusercontent.com/ItzFlibat/BetterDiscordPlugins/refs/heads/main/Plugins/YACBDP/YACBDP.plugin.js) |
| ShowHiddenChannels | Show hidden channels and inspect the channel information available to your Discord client. | [README](Plugins/ShowHiddenChannels/README.md) | [ShowHiddenChannels.plugin.js](https://raw.githubusercontent.com/ItzFlibat/BetterDiscordPlugins/refs/heads/main/Plugins/ShowHiddenChannels/ShowHiddenChannels.plugin.js) |
| MessageLogger | Locally records deleted messages and message edits for review. | [README](Plugins/MessageLogger/README.md) | [MessageLogger.plugin.js](https://raw.githubusercontent.com/ItzFlibat/BetterDiscordPlugins/refs/heads/main/Plugins/MessageLogger/MessageLogger.plugin.js) |
| BetterDiscordBadges | Shows client-mod badges on profiles with source toggles. | [README](Plugins/BetterDiscordBadges/README.md) | [BetterDiscordBadges.plugin.js](https://raw.githubusercontent.com/ItzFlibat/BetterDiscordPlugins/refs/heads/main/Plugins/BetterDiscordBadges/BetterDiscordBadges.plugin.js) |

## Install a plugin

1. Install [BetterDiscord](https://betterdiscord.app/).
2. In Discord, open **Settings → BetterDiscord → Plugins → Open Plugins Folder**.
3. Download [YACBDP.plugin.js](https://raw.githubusercontent.com/ItzFlibat/BetterDiscordPlugins/refs/heads/main/Plugins/YACBDP/YACBDP.plugin.js), place it in that folder, and enable it.
4. Download the `.plugin.js` file for the plugin you want, place it in the same folder, and enable it. Leave YACBDP enabled.

Check the plugin’s README for its own features, settings, requirements, and limitations. Repository source, development dependencies, and build output are for contributors; install the standalone `.plugin.js` file.

## Repository layout

Plugins live in `Plugins/`, each with its own folder and README. The root README covers the collection as a whole; plugin-specific installation, usage, and support details belong in the corresponding plugin README.

## Development

Install [Bun](https://bun.sh/), then run these commands from the repository root:

```sh
bun install
bun run build:showhiddenchannels
bun run build:messagelogger
bun run build:betterdiscordbadges
bun run check:messagelogger
bun run check:betterdiscordbadges
bun run build:yacbdp
bun run check:yacbdp
```

The ShowHiddenChannels check type-checks, builds, and runs its regression tests. The other plugins have build and type-check commands. Each standalone plugin build is written to its folder and to `dist/`.

## Support and contributions

For help or to discuss the collection, join the [Discord community](https://flibat.com/discord) or open a [GitHub discussion](https://github.com/ItzFlibat/BetterDiscordPlugins/discussions). For a plugin issue, include its name and version, your Discord and BetterDiscord versions, steps to reproduce, and relevant console errors. Do not include account tokens or private message content.

You can support development by following me on [GitHub](https://github.com/ItzFlibat), starring, forking, or sharing the repository, contributing improvements, and joining the [Discord community](https://flibat.com/discord).

<a href="https://github.com/ItzFlibat/BetterDiscordPlugins/graphs/contributors" target="_blank"><img src="https://contrib.rocks/image?repo=ItzFlibat/BetterDiscordPlugins&columns=18" alt="Contributors to BetterDiscordPlugins"></a>
