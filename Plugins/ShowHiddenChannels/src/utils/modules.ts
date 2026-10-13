/*
 * BetterDiscordPlugins
 * Copyright (c) 2026 ItzFlibat
 * SPDX-License-Identifier: GPL-3.0-only
 */

import type { Channel, Guild, GuildList, Role } from "../types";

export interface RenderTarget {
    object: Record<string, any>;
    key: string;
}

export interface Modules {
    ChannelStore: {
        getChannel(id: string): Channel | undefined;
        getMutableGuildChannelsForGuild(id: string): Record<string, Channel>;
    };
    PermissionStore: { can(permission: bigint, channel: Channel): boolean };
    ChannelListStore: { getGuild(id: string): GuildList };
    GuildStore: { getGuild(id: string): Guild | undefined; getGuilds(): Record<string, Guild> };
    GuildRoleStore?: { getRolesSnapshot(id: string): Record<string, Role> };
    GuildMemberStore?: { getMember(guildId: string, userId: string): { roles: string[] } | undefined };
    UserStore?: { getUser(id: string): { username: string; globalName?: string } | undefined };
    ReadStateStore?: Record<string, any>;
    GuildChannelStore?: Record<string, any>;
    CategoryStore?: { isCollapsed(id: string): boolean };
    SelectedChannelStore?: { getVoiceChannelId(): string | undefined };
    Dispatcher?: Record<string, any>;
    MessageActions: Record<string, any>;
    ChannelRecord: new (data: Partial<Channel>) => Channel;
    Route: RenderTarget;
    ChannelItem?: RenderTarget;
    ChannelIcon?: RenderTarget;
    chatClass?: string;
    containerClass?: string;
}

export function findFunction(...strings: (string | RegExp)[]): RenderTarget | undefined {
    const filter = (value: unknown) =>
        typeof value === "function" &&
        strings.every(search => (typeof search === "string" ? String(value).includes(search) : search.test(String(value))));
    const [object, key] = BdApi.Webpack.getWithKey(filter, { searchExports: true }) ?? [];
    return object && key ? { object, key } : undefined;
}

export function loadModules(): { modules?: Modules; missing: string[] } {
    const { Webpack } = BdApi;
    const ChannelStore = Webpack.getStore("ChannelStore");
    const PermissionStore = Webpack.getStore("PermissionStore") ?? Webpack.getByKeys("getChannelPermissions");
    const ChannelListStore = Webpack.getStore("ChannelListStore");
    const GuildStore = Webpack.getStore("GuildStore");
    const MessageActions = Webpack.getByKeys("fetchMessages", "jumpToMessage");
    const ChannelRecord = Webpack.getModule(
        (value: any) => typeof value === "function" && typeof value.prototype?.isHidden === "function",
        { searchExports: true }
    );
    const Route = findFunction(/\.ImpressionTypes\.PAGE,name:\w+,/);
    const missing = Object.entries({
        "ChannelStore.getChannel": ChannelStore?.getChannel,
        "ChannelStore.getMutableGuildChannelsForGuild": ChannelStore?.getMutableGuildChannelsForGuild,
        "PermissionStore.can": PermissionStore?.can,
        "ChannelListStore.getGuild": ChannelListStore?.getGuild,
        "GuildStore.getGuild": GuildStore?.getGuild,
        "MessageActions.fetchMessages": MessageActions?.fetchMessages,
        ChannelRecord,
        Route
    })
        .filter(([, value]) => !value)
        .map(([key]) => key);
    if (missing.length || !Route) return { missing };

    let ChannelItem = findFunction(".ALL_MESSAGES");
    const itemModule = Webpack.getBySource?.(".iconContainerWithGuildIcon,");
    const itemRenderer = Object.values(itemModule ?? {}).find(
        (value: any) => typeof value?.render === "function" && String(value.render).includes(".ALL_MESSAGES")
    ) as Record<string, any> | undefined;
    if (itemRenderer) ChannelItem = { object: itemRenderer, key: "render" };

    return {
        missing,
        modules: {
            ChannelStore,
            PermissionStore,
            ChannelListStore,
            GuildStore,
            MessageActions,
            ChannelRecord,
            Route,
            ChannelItem,
            ChannelIcon: findFunction(",textFocused:"),
            GuildRoleStore: Webpack.getStore("GuildRoleStore"),
            GuildMemberStore: Webpack.getStore("GuildMemberStore"),
            UserStore: Webpack.getStore("UserStore"),
            ReadStateStore: Webpack.getStore("ReadStateStore"),
            GuildChannelStore: Webpack.getStore("GuildChannelStore"),
            CategoryStore: Webpack.getStore("CategoryCollapseStore") ?? Webpack.getByKeys("isCollapsed", "getCollapsedCategories"),
            SelectedChannelStore: Webpack.getStore("SelectedChannelStore"),
            Dispatcher: Webpack.getByKeys("dispatch", "subscribe"),
            chatClass: Webpack.getByKeys("chat", "chatContent")?.chat,
            containerClass: Webpack.getByKeys("container", "hubContainer")?.container
        }
    };
}

export function refreshChannels(modules: Modules): void {
    const graph = modules.Dispatcher?._actionHandlers?._dependencyGraph;
    for (const store of [modules.PermissionStore, modules.ChannelListStore]) {
        const node = Object.values(graph?.nodes ?? {}).find(
            (value: any) => value.name === (store === modules.PermissionStore ? "PermissionStore" : "ChannelListStore")
        ) as { actionHandler?: Record<string, () => void> } | undefined;
        node?.actionHandler?.CONNECTION_OPEN?.();
        (store as { emitChange?(): void }).emitChange?.();
    }
    const element = modules.containerClass && document.querySelector(`.${modules.containerClass}`);
    if (element) BdApi.ReactUtils.getOwnerInstance(element)?.forceUpdate?.();
}
