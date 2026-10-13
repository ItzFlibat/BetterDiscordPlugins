/*
 * BetterDiscordPlugins
 * Copyright (c) 2026 ItzFlibat
 * SPDX-License-Identifier: GPL-3.0-only
 */

export type Bits = bigint | string | number;

export interface Overwrite {
    id: string;
    type: number;
    allow: Bits;
    deny: Bits;
}

export interface Role {
    id: string;
    name: string;
    color?: number;
    position?: number;
    permissions: Bits;
    tags?: { bot_id?: string };
}

export interface Channel {
    id: string;
    guild_id: string;
    name: string;
    type: number;
    position: number;
    parent_id?: string | null;
    topic?: string;
    nsfw?: boolean;
    permissionOverwrites?: Record<string, Overwrite>;
    permission_overwrites?: Overwrite[];
    lastMessageId?: string;
    last_message_id?: string;
    lastPinTimestamp?: string;
    rateLimitPerUser?: number;
    rate_limit_per_user?: number;
    bitrate?: number;
    userLimit?: number;
    user_limit?: number;
    rtcRegion?: string;
    videoQualityMode?: number;
    defaultAutoArchiveDuration?: number;
    defaultThreadRateLimitPerUser?: number;
    defaultSortOrder?: number;
    defaultForumLayout?: number;
    flags?: number;
    availableTags?: { id: string; name: string; moderated?: boolean; emojiName?: string }[];
    defaultReactionEmoji?: { emojiId?: string; emojiName?: string };
    iconEmoji?: { id?: string; name?: string };
    isHidden?(): boolean;
    isGuildVocal?(): boolean;
}

export interface Guild {
    id: string;
    name: string;
    ownerId?: string;
    owner_id?: string;
    roles?: Record<string, Role>;
}

export interface Settings {
    hiddenChannelIcon: "lock" | "eye" | "none";
    sort: "native" | "bottom" | "extra";
    showPerms: boolean;
    showAdmin: "channel" | "always" | "never" | "exclude";
    hideUnreads: boolean;
    mutedStyle: boolean;
    shouldShowEmptyCategory: boolean;
    showLastMessage: boolean;
    debugMode: boolean;
    channels: Record<string, boolean>;
    blacklistedGuilds: Record<string, boolean>;
}

export interface ChannelRow {
    id: string;
    record: Channel;
    category: Category;
}

export interface Category {
    id: string;
    channels: Record<string, ChannelRow>;
    shownChannelIds: string[];
    hiddenChannelIds?: string[];
    isCollapsed?: boolean;
    shouldShowEmptyCategory?(): boolean;
}

export interface GuildChannels {
    categories: Record<string, Category>;
    collapsedCategoryIds: Record<string, boolean>;
    favoritesCategory?: Category;
    recentsCategory?: Category;
    noParentCategory?: Category;
    voiceChannelsCategory?: Category;
}

export interface GuildList {
    guildChannels: GuildChannels;
}
