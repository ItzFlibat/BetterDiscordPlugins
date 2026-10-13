<h1 align="center">
  <a href="https://betterdiscord.app/" target="_blank"><img src="https://github.com/user-attachments/assets/2bf8358c-d72e-4e65-9fa7-00ef91c4196f" alt="ShowHiddenChannels" width="800"></a>
</h1>

<p align="center">Show channels you cannot access and inspect information already available to your Discord client. This plugin does not give you access to messages in those channels.</p>

<p align="center">
  <a href="https://raw.githubusercontent.com/ItzFlibat/BetterDiscordPlugins/refs/heads/main/Plugins/ShowHiddenChannels/ShowHiddenChannels.plugin.js" target="_blank">🌐 Download</a>
  •
  <a href="https://betterdiscord.app" target="_blank">💙 BetterDiscord</a>
  •
  <a href="https://flibat.com/discord" target="_blank">☎️ Community</a>
  •
  <a href="https://github.com/ItzFlibat/BetterDiscordPlugins/discussions" target="_blank">💬 Discussions</a>
</p>

## Features

- Text, voice, announcement, stage, forum, and media channels, with individual controls for each supported type.
- Native channel order, hidden channels at the bottom of each category, or a separate **Hidden Channels** category.
- Lock or hidden-eye indicators, optional muted styling, and unread suppression.
- Channel details such as topic, creation date, available last-message timestamp, slowmode, age restriction, and voice settings.
- Forum guidelines, available tags, default reactions, archive duration, layout, and post settings.
- Role access calculations, locally known member access, administrator filters, and a table of permission overrides.
- Server exclusions in settings and the server context menu.
- Channel context actions to inspect information or copy channel details.
- Settings apply immediately, and existing plugin settings are migrated automatically.
- Requires the shared YACBDP plugin.

## How to install

1. Download [ShowHiddenChannels.plugin.js](https://raw.githubusercontent.com/ItzFlibat/BetterDiscordPlugins/refs/heads/main/Plugins/ShowHiddenChannels/ShowHiddenChannels.plugin.js).
2. In Discord, open **Settings → BetterDiscord → Plugins → Open Plugins Folder**.
3. Place the downloaded file in the plugins folder and enable **ShowHiddenChannels**.
4. Install and enable [YACBDP](../YACBDP/README.md) first; this plugin requires it.

Right-click a displayed hidden channel and choose **Hidden channel information** for its details. Opening a hidden text channel displays the information page. Selecting a hidden voice or stage channel shows its details without joining the call.

## Settings

| Setting | Behavior |
| --- | --- |
| Hidden channel icon | Choose a lock, hidden-eye, or no indicator. |
| Channel order | Keep Discord order, move hidden channels to the bottom of each category, or put them in a separate category. |
| Muted appearance | Dim hidden channels in the list. |
| Hide unread indicators | Suppress unread counts and mentions for displayed hidden channels. |
| Show empty categories | Keep empty categories visible. |
| Show permissions | Display role access, locally known members, and channel permission overrides. |
| Administrator roles | Show administrators with channel overrides, all administrators, exclude bot administrators, or hide them. |
| Last message timestamp | Show a timestamp when its message ID is already available locally. |
| Channel types | Enable or disable supported channel types individually. |
| Excluded servers | Disable hidden channel display for selected servers. |
| Debug logging | Log Discord module availability when the plugin starts. |

## Limits and privacy

ShowHiddenChannels only displays channel records already available to the Discord client. If Discord withholds hidden channel data from the client, the plugin cannot display it. It does not grant permission to read messages, load forum posts, join voice channels, or retrieve additional hidden channel data.

The plugin blocks message actions targeting displayed hidden channels. It does not fetch member profiles or permission details from the network. Role access is calculated for each role combined with `@everyone`; a member with multiple roles may have different effective access. Member results use locally cached role membership when available. Otherwise, an explicit channel allow is identified as such. The server owner always has access. Administrator display filters affect only the information page.

Discord's internal modules can change. If essential modules are missing, the plugin leaves channel permissions unchanged and logs details in the console. A live Discord session is needed to verify compatibility with a particular client build.

## Preview

![ShowHiddenChannels preview](https://github.com/user-attachments/assets/92a1e4c7-84f4-4501-becd-3663fd616989)

## Development

Requires Bun. From the repository root:

```sh
bun install
bun run --cwd Plugins/ShowHiddenChannels check
```

Use `bun run --cwd Plugins/ShowHiddenChannels watch` to rebuild when source files change. Builds write identical files to `dist/ShowHiddenChannels.plugin.js` and `ShowHiddenChannels.plugin.js`; installation is manual.

`bun run --cwd Plugins/ShowHiddenChannels check` type-checks the source, builds the plugin, and runs its regression tests. Source uses TypeScript, four-space indentation, double quotes, and semicolons.
