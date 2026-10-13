# MessageLogger

MessageLogger keeps a local history of deleted messages and message edits that Discord sends to your client. Open a channel's context menu and select **View Message Log** to review its entries.

## Install

1. Download [MessageLogger.plugin.js](https://raw.githubusercontent.com/ItzFlibat/BetterDiscordPlugins/refs/heads/main/Plugins/MessageLogger/MessageLogger.plugin.js).
2. In Discord, open **Settings → BetterDiscord → Plugins → Open Plugins Folder**.
3. Place the file in that folder and enable **MessageLogger**.
4. Install and enable [YACBDP Library](../YACBDPLibrary/README.md) first; this plugin requires it.

## Features and settings

- Records message deletions, bulk deletions, and prior content when an edit arrives.
- Keeps logs across Discord restarts using BetterDiscord's local plugin data.
- Open a channel log from its context menu; submenu actions export the channel as JSON or clear its saved entries.
- Choose whether to log edits, deletions, or direct messages; ignore bot messages or selected user/channel IDs.
- Set a retention period and maximum number of entries.
- Ephemeral messages are skipped.

The plugin can only record events delivered to the running client. It cannot recover messages or edits from before it was enabled, and it does not retrieve message content from Discord's servers. Logs can contain private message content and attachment links; they remain in local BetterDiscord plugin data until removed or expired. Review and clear them on shared devices.

## Development

Requires Bun. From the repository root, run `bun install`, then `bun run --cwd Plugins/MessageLogger build`. The build type-checks and creates `dist/MessageLogger.plugin.js` and `MessageLogger.plugin.js`.
