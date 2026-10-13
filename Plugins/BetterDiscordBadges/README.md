# BetterDiscordBadges

BetterDiscordBadges shows client-mod badges on Discord user profiles using the fixed Alliance badge service. Discord's own native profile badges remain as Discord renders them. BetterDiscord and Allicord badges are always enabled; other client-mod badge sources can be switched on or off.

## Install

1. Download [BetterDiscordBadges.plugin.js](https://raw.githubusercontent.com/ItzFlibat/BetterDiscordPlugins/refs/heads/main/Plugins/BetterDiscordBadges/BetterDiscordBadges.plugin.js).
2. In Discord, open **Settings → BetterDiscord → Plugins → Open Plugins Folder**.
3. Place the file in that folder and enable **BetterDiscordBadges**.
4. Install and enable [YACBDP](../YACBDP/README.md) first; this plugin requires it.

## Settings

Use the plugin settings to toggle badges for Vencord, Equicord, BadgeVault, Nekocord, ReviewDB, Aero, Aliucord, Raincord, Velocity, Enmity, Paicord, Bunny, GooseMod, Replugged, Vendroid Enhanced, Revenge, and ReCord. BetterDiscord and Allicord are always on. The badge service address is fixed and has no user-editable setting.

Badges refresh periodically. If the service is unavailable, the last successfully loaded badges remain visible until the next successful refresh. Only badges the service provides for a user can be shown.

## Development

Requires Bun. From the repository root, run `bun install`, then `bun run --cwd Plugins/BetterDiscordBadges build`. The build type-checks and creates `dist/BetterDiscordBadges.plugin.js` and `BetterDiscordBadges.plugin.js`.
