/*
 * BetterDiscordPlugins
 * Copyright (c) 2026 ItzFlibat
 * SPDX-License-Identifier: GPL-3.0-only
 */

import { HiddenChannelIcon } from "./components/HiddenChannelIcon";
import { Lockscreen } from "./components/Lockscreen";
import config from "./config.json";
import { channelTypes, loadSettings } from "./settings";
import styles from "./styles";
import type { Channel, GuildList, Settings } from "./types";
import { transformChannelList } from "./utils/channelList";
import { loadModules, Modules, refreshChannels } from "./utils/modules";
import { CONNECT, VIEW_CHANNEL } from "./utils/permissions";

export default class ShowHiddenChannels {
    private api = new BdApi(config.name);
    private settings = loadSettings(this.api.Data.load("settings"));
    private modules?: Modules;
    private originalCan?: Modules["PermissionStore"]["can"];
    private cleanups: (() => void)[] = [];
    private started = false;
    private dependencyTimer?: ReturnType<typeof setTimeout>;
    private dependencyAttempts = 0;

    start(): void {
        if (this.started) return;
        const library = (window as any).YACBDPLibrary;
        if (!library?.requirePlugin?.(config.name)) {
            if (this.dependencyAttempts++ < 20) {
                this.dependencyTimer = setTimeout(() => {
                    if (this.api.Plugins.isEnabled(config.name)) this.start();
                }, 500);
            } else {
                this.api.UI.showToast("ShowHiddenChannels requires the enabled YACBDP Library plugin.", { type: "error" });
            }
            return;
        }
        this.dependencyAttempts = 0;
        let loaded: ReturnType<typeof loadModules>;
        try {
            loaded = loadModules();
        } catch (error) {
            this.api.Logger.error("Could not discover Discord modules.", error);
            this.api.UI.showToast("ShowHiddenChannels could not discover Discord modules. See the console for details.", { type: "error" });
            return;
        }
        const { modules, missing } = loaded;
        if (!modules) {
            this.api.Logger.error("Could not start. Missing Discord modules:", missing);
            this.api.UI.showToast(
                "ShowHiddenChannels could not start. A Discord update may require a plugin update. See the console for details.",
                { type: "error" }
            );
            return;
        }
        this.modules = modules;
        this.originalCan = modules.PermissionStore.can.bind(modules.PermissionStore);
        try {
            this.patchMessages(modules);
            this.patchRoute(modules);
            this.patchPermissions(modules);
            this.patchReadState(modules);
            this.patchChannelList(modules);
            this.patchChannelItem(modules);
            this.patchContextMenus(modules);
            this.api.DOM.addStyle(styles);
            this.started = true;
            refreshChannels(modules);
            if (this.settings.debugMode)
                this.api.Logger.info("Started", {
                    version: config.version,
                    channelItem: !!modules.ChannelItem,
                    channelIcon: !!modules.ChannelIcon
                });
        } catch (error) {
            this.stop();
            this.api.Logger.error("Could not start ShowHiddenChannels.", error);
            this.api.UI.showToast("ShowHiddenChannels could not start. Its changes have been removed.", { type: "error" });
        }
    }

    stop(): void {
        if (this.dependencyTimer) clearTimeout(this.dependencyTimer);
        this.dependencyAttempts = 0;
        this.api.Patcher.unpatchAll();
        for (const cleanup of this.cleanups.splice(0)) cleanup();
        this.api.DOM.removeStyle();
        this.started = false;
        if (this.modules) {
            try {
                refreshChannels(this.modules);
            } catch (error) {
                this.api.Logger.warn("Could not refresh the channel list after stopping.", error);
            }
        }
        this.modules = undefined;
        this.originalCan = undefined;
    }

    private isHidden(channel?: Channel): boolean {
        return !!(
            channel?.guild_id &&
            channelTypes[channel.type] &&
            !channel.id.endsWith("_hidden") &&
            this.originalCan &&
            !this.originalCan(VIEW_CHANNEL, channel)
        );
    }

    private shouldShow(channel?: Channel): boolean {
        return !!(
            channel &&
            this.isHidden(channel) &&
            !this.settings.blacklistedGuilds[channel.guild_id] &&
            this.settings.channels[channelTypes[channel.type]]
        );
    }

    private patchPermissions(modules: Modules): void {
        this.api.Patcher.instead(
            modules.ChannelRecord.prototype,
            "isHidden",
            (channel: Channel, _args: unknown[], original: () => boolean) =>
                channel.guild_id && channelTypes[channel.type] ? this.isHidden(channel) : original()
        );
        this.api.Patcher.after(
            modules.PermissionStore,
            "can",
            (_instance: unknown, [permission, channel]: [bigint, Channel], result: boolean) => {
                if (!this.isHidden(channel)) return result;
                if (permission === CONNECT) return false;
                return permission === VIEW_CHANNEL && this.shouldShow(channel) ? true : result;
            }
        );
    }

    private patchMessages(modules: Modules): void {
        for (const key of [
            "fetchMessages",
            "fetchMessagesAround",
            "fetchMessage",
            "fetchPins",
            "fetchPinnedMessages",
            "jumpToMessage",
            "sendMessage",
            "_sendMessage"
        ]) {
            if (typeof modules.MessageActions[key] !== "function") continue;
            this.api.Patcher.instead(
                modules.MessageActions,
                key,
                (_instance: unknown, args: any[], original: (...args: any[]) => unknown) => {
                    const id = typeof args[0] === "string" ? args[0] : (args[0]?.channelId ?? args[0]?.channel_id);
                    return this.isHidden(modules.ChannelStore.getChannel(id)) ? Promise.resolve() : original(...args);
                }
            );
        }
    }

    private patchRoute(modules: Modules): void {
        this.api.Patcher.after(modules.Route.object, modules.Route.key, (_instance: unknown, _args: unknown[], result: any) => {
            const params = result?.props?.computedMatch?.params ?? result?.props?.match?.params;
            const channel = params?.channelId && modules.ChannelStore.getChannel(params.channelId);
            if (!this.shouldShow(channel) || channel.id === modules.SelectedChannelStore?.getVoiceChannelId()) return result;
            return BdApi.React.cloneElement(result, {
                render: () => BdApi.React.createElement(Lockscreen, { channel, modules, settings: this.settings })
            });
        });
    }

    private patchReadState(modules: Modules): void {
        const store = modules.ReadStateStore;
        if (!store) return;
        for (const key of [
            "getGuildChannelUnreadState",
            "getMentionCount",
            "getUnreadCount",
            "hasTrackedUnread",
            "hasUnread",
            "hasUnreadPins"
        ]) {
            if (typeof store[key] !== "function") continue;
            this.api.Patcher.after(store, key, (_instance: unknown, [value]: [string | Channel], result: unknown) => {
                const channel = typeof value === "string" ? modules.ChannelStore.getChannel(value) : value;
                if (!this.settings.hideUnreads || !this.shouldShow(channel)) return result;
                if (key === "getGuildChannelUnreadState") return { ...(result as object), mentionCount: 0, unread: false };
                return key.startsWith("get") ? 0 : false;
            });
        }
    }

    private extraCategory(modules: Modules, guildId: string, channels: Record<string, Channel>): Channel | undefined {
        if (
            this.settings.sort !== "extra" ||
            this.settings.blacklistedGuilds[guildId] ||
            !Object.values(channels).some(channel => channel.type !== 4 && this.shouldShow(channel))
        )
            return;
        const position =
            Math.max(
                0,
                ...Object.values(channels)
                    .filter(channel => channel.type === 4)
                    .map(channel => channel.position ?? 0)
            ) + 1;
        return new modules.ChannelRecord({ id: `${guildId}_hidden`, guild_id: guildId, name: "Hidden Channels", type: 4, position });
    }

    private patchChannelList(modules: Modules): void {
        this.api.Patcher.after(modules.ChannelStore, "getChannel", (_instance: unknown, [id]: [string], result: Channel | undefined) => {
            if (typeof id !== "string" || !id.endsWith("_hidden")) return result;
            const guildId = id.slice(0, -7);
            return this.extraCategory(modules, guildId, modules.ChannelStore.getMutableGuildChannelsForGuild(guildId)) ?? result;
        });
        this.api.Patcher.after(
            modules.ChannelStore,
            "getMutableGuildChannelsForGuild",
            (_instance: unknown, [guildId]: [string], result: Record<string, Channel>) => {
                if (!result) return result;
                const extra = this.extraCategory(modules, guildId, result);
                return extra ? { ...result, [extra.id]: extra } : result;
            }
        );
        if (modules.GuildChannelStore?.getChannels) {
            this.api.Patcher.after(
                modules.GuildChannelStore,
                "getChannels",
                (_instance: unknown, [guildId]: [string], result: Record<number, any[]>) => {
                    if (!result) return result;
                    const extra = this.extraCategory(modules, guildId, modules.ChannelStore.getMutableGuildChannelsForGuild(guildId));
                    if (!extra) return result;
                    return {
                        ...result,
                        4: [...(result[4] ?? []).filter(row => row.channel.id !== extra.id), { channel: extra, comparator: extra.position }]
                    };
                }
            );
        }
        this.api.Patcher.after(modules.ChannelListStore, "getGuild", (_instance: unknown, [guildId]: [string], result: GuildList) => {
            if (!result?.guildChannels || this.settings.blacklistedGuilds[guildId]) return result;
            if (this.settings.sort === "native" && !this.settings.shouldShowEmptyCategory) return result;
            const transformed = transformChannelList(
                result,
                this.settings,
                channel => channel.type !== 4 && this.shouldShow(channel),
                `${guildId}_hidden`
            );
            const extra = transformed.guildChannels.categories[`${guildId}_hidden`];
            if (extra && modules.CategoryStore?.isCollapsed(extra.id)) {
                extra.isCollapsed = true;
                extra.shownChannelIds = [];
            }
            return transformed;
        });
    }

    private patchChannelItem(modules: Modules): void {
        if (modules.ChannelIcon) {
            this.api.Patcher.before(modules.ChannelIcon.object, modules.ChannelIcon.key, (_instance: unknown, args: any[]) => {
                if (this.shouldShow(args[0]) && args[2]?.locked) args[2] = { ...args[2], locked: false };
            });
        }
        if (!modules.ChannelItem) {
            this.api.Logger.warn("Channel icons and voice channel navigation are unavailable on this Discord build.");
            this.api.UI.showToast(
                "ShowHiddenChannels: channel styling is unavailable on this Discord build. Use the channel context menu to inspect hidden channels.",
                { type: "warning" }
            );
            return;
        }
        this.api.Patcher.after(modules.ChannelItem.object, modules.ChannelItem.key, (_instance: unknown, [props]: [any], result: any) => {
            const channel = props?.channel as Channel | undefined;
            if (!channel || !this.shouldShow(channel)) return result;
            const vocal = channel.type === 2 || channel.type === 13;
            const connected = channel.id === modules.SelectedChannelStore?.getVoiceChannelId();
            let decorated = false;
            const visit = (node: any, root: boolean): any => {
                if (Array.isArray(node)) return node.map(child => visit(child, false));
                if (!BdApi.React.isValidElement(node)) return node;
                const next: Record<string, any> = {};
                const interactive =
                    typeof node.type === "string" &&
                    (node.props.role === "link" ||
                        node.type === "a" ||
                        (typeof node.props.onClick === "function" && node.props.className?.includes("link")));
                if (vocal && !connected && interactive) {
                    next.onClick = (event: MouseEvent) => {
                        event.preventDefault();
                        event.stopPropagation();
                        this.showChannel(channel);
                    };
                    next.onMouseDown = undefined;
                    next.onMouseUp = undefined;
                    next.onDoubleClick = undefined;
                    next.onKeyDown = (event: KeyboardEvent) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            this.showChannel(channel);
                        }
                    };
                    next.href = undefined;
                }
                const wrapper = !decorated && typeof node.type === "string" && (root || node.props.className?.includes("wrapper"));
                if (wrapper) {
                    decorated = true;
                    next.className = [
                        node.props.className,
                        "shc-hidden-channel",
                        this.settings.mutedStyle && "shc-muted",
                        this.settings.hiddenChannelIcon !== "none" && "shc-with-icon"
                    ]
                        .filter(Boolean)
                        .join(" ");
                    if (vocal && !connected) {
                        next.onMouseDown = undefined;
                        next.onMouseUp = undefined;
                        next.onDoubleClick = undefined;
                    }
                }
                const children = visit(node.props.children, false);
                next.children =
                    wrapper && this.settings.hiddenChannelIcon !== "none"
                        ? [
                              children,
                              BdApi.React.createElement(
                                  "span",
                                  { key: "shc-indicator", className: "shc-indicator" },
                                  BdApi.React.createElement(HiddenChannelIcon, { icon: this.settings.hiddenChannelIcon })
                              )
                          ]
                        : children;
                return BdApi.React.cloneElement(node, next);
            };
            return visit(result, true);
        });
    }

    private showChannel(channel: Channel): void {
        if (!this.modules) return;
        this.api.UI.alert(
            "Hidden channel information",
            BdApi.React.createElement(Lockscreen, { channel, modules: this.modules, settings: this.settings })
        );
    }

    private patchContextMenus(modules: Modules): void {
        this.cleanups.push(
            this.api.ContextMenu.patch("guild-context", (menu: any, { guild }: { guild?: { id: string } }) => {
                if (!guild || !menu?.props) return;
                const item = this.api.ContextMenu.buildItem({
                    id: "shc-toggle",
                    type: "toggle",
                    label: "Show hidden channels",
                    checked: !this.settings.blacklistedGuilds[guild.id],
                    action: () => {
                        this.settings.blacklistedGuilds[guild.id] = !this.settings.blacklistedGuilds[guild.id];
                        this.saveSettings();
                    }
                });
                menu.props.children = [...BdApi.React.Children.toArray(menu.props.children), item];
            })
        );
        this.cleanups.push(
            this.api.ContextMenu.patch("channel-context", (menu: any, { channel }: { channel?: Channel }) => {
                if (!channel || !this.shouldShow(channel) || !menu?.props) return;
                const items = this.api.ContextMenu.buildItem({
                    type: "group",
                    items: [
                        { id: "shc-info", label: "Hidden channel information", action: () => this.showChannel(channel) },
                        {
                            id: "shc-copy",
                            label: "Copy channel details",
                            action: () => {
                                const guild = modules.GuildStore.getGuild(channel.guild_id);
                                BdApi.Utils.copyText(
                                    `${guild?.name ?? channel.guild_id} / #${channel.name}\nChannel ID: ${channel.id}\n${channel.topic ?? ""}`.trim()
                                );
                            }
                        }
                    ]
                });
                menu.props.children = [...BdApi.React.Children.toArray(menu.props.children), items];
            })
        );
    }

    private saveSettings(): void {
        this.settings = loadSettings(this.settings);
        this.api.Data.save("settings", this.settings);
        if (this.modules) refreshChannels(this.modules);
    }

    getSettingsPanel(): unknown {
        const select = (id: keyof Settings, name: string, note: string, options: [string, string][]) => ({
            type: "dropdown",
            id,
            name,
            note,
            value: this.settings[id],
            options: options.map(([label, value]) => ({ label, value }))
        });
        const toggle = (id: keyof Settings, name: string, note: string) => ({ type: "switch", id, name, note, value: this.settings[id] });
        const guilds = this.modules?.GuildStore.getGuilds() ?? BdApi.Webpack.getStore("GuildStore")?.getGuilds() ?? {};
        return this.api.UI.buildSettingsPanel({
            settings: [
                {
                    type: "category",
                    id: "general",
                    name: "Appearance and information",
                    collapsible: true,
                    shown: true,
                    settings: [
                        select("hiddenChannelIcon", "Hidden channel icon", "Choose the indicator shown beside hidden channels.", [
                            ["Lock", "lock"],
                            ["Hidden eye", "eye"],
                            ["None", "none"]
                        ]),
                        select("sort", "Channel order", "Choose where hidden channels appear.", [
                            ["Discord order", "native"],
                            ["Bottom of each category", "bottom"],
                            ["Separate Hidden Channels category", "extra"]
                        ]),
                        toggle("mutedStyle", "Muted appearance", "Dim hidden channels in the channel list."),
                        toggle(
                            "hideUnreads",
                            "Hide unread indicators",
                            "Suppress unread counts and mentions for displayed hidden channels."
                        ),
                        toggle("shouldShowEmptyCategory", "Show empty categories", "Keep empty categories visible."),
                        toggle("showPerms", "Show permissions", "Show roles, known members and permission overrides."),
                        select("showAdmin", "Administrator roles", "Choose which administrator roles appear in channel information.", [
                            ["Channel overrides only", "channel"],
                            ["All administrators", "always"],
                            ["Exclude bot administrators", "exclude"],
                            ["None", "never"]
                        ]),
                        toggle("showLastMessage", "Last message timestamp", "Show the timestamp only when its ID is already available."),
                        toggle("debugMode", "Debug logging", "Log module availability when the plugin starts.")
                    ]
                },
                {
                    type: "category",
                    id: "channels",
                    name: "Channel types",
                    collapsible: true,
                    shown: false,
                    settings: Object.values(channelTypes).map(id => ({
                        type: "switch",
                        id,
                        name: id
                            .replace("GUILD_", "")
                            .toLowerCase()
                            .replace(/_/g, " ")
                            .replace(/^./, letter => letter.toUpperCase()),
                        value: this.settings.channels[id]
                    }))
                },
                {
                    type: "category",
                    id: "blacklistedGuilds",
                    name: "Excluded servers",
                    collapsible: true,
                    shown: false,
                    settings: Object.values(guilds)
                        .sort((a: any, b: any) => a.name.localeCompare(b.name))
                        .map((guild: any) => ({
                            type: "switch",
                            id: guild.id,
                            name: guild.name,
                            note: "Hide hidden channels in this server.",
                            value: !!this.settings.blacklistedGuilds[guild.id]
                        }))
                }
            ],
            onChange: (category: string, id: string, value: unknown) => {
                if (category === "channels" || category === "blacklistedGuilds") this.settings[category][id] = !!value;
                else this.settings = loadSettings({ ...this.settings, [id]: value });
                this.saveSettings();
            }
        });
    }
}
