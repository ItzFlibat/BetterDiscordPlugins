/*
 * BetterDiscordPlugins
 * Copyright (c) 2026 ItzFlibat
 * SPDX-License-Identifier: GPL-3.0-only
 */

import type { Settings } from "./types";

export const channelTypes: Record<number, string> = {
    0: "GUILD_TEXT",
    2: "GUILD_VOICE",
    4: "GUILD_CATEGORY",
    5: "GUILD_ANNOUNCEMENT",
    6: "GUILD_STORE",
    13: "GUILD_STAGE_VOICE",
    15: "GUILD_FORUM",
    16: "GUILD_MEDIA"
};

export const defaultSettings: Settings = {
    hiddenChannelIcon: "lock",
    sort: "native",
    showPerms: true,
    showAdmin: "channel",
    hideUnreads: true,
    mutedStyle: false,
    shouldShowEmptyCategory: false,
    showLastMessage: true,
    debugMode: false,
    channels: Object.fromEntries(Object.values(channelTypes).map(type => [type, true])),
    blacklistedGuilds: {}
};

export function loadSettings(value: unknown): Settings {
    const saved = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    const result: Settings = {
        ...defaultSettings,
        channels: { ...defaultSettings.channels },
        blacklistedGuilds: {}
    };

    for (const key of ["showPerms", "hideUnreads", "mutedStyle", "shouldShowEmptyCategory", "showLastMessage", "debugMode"] as const) {
        if (typeof saved[key] === "boolean") result[key] = saved[key];
    }
    if (typeof saved.hideUnreads !== "boolean" && typeof saved.MarkUnread === "boolean") result.hideUnreads = !saved.MarkUnread;
    if (["native", "bottom", "extra"].includes(String(saved.sort))) result.sort = saved.sort as Settings["sort"];
    if (["lock", "eye", "none"].includes(String(saved.hiddenChannelIcon)))
        result.hiddenChannelIcon = saved.hiddenChannelIcon as Settings["hiddenChannelIcon"];
    if (saved.hiddenChannelIcon === false) result.hiddenChannelIcon = "none";
    if (["channel", "always", "never", "exclude"].includes(String(saved.showAdmin)))
        result.showAdmin = saved.showAdmin as Settings["showAdmin"];
    if (saved.showAdmin === "include") result.showAdmin = "always";
    if (saved.showAdmin === false) result.showAdmin = "never";

    for (const key of ["channels", "blacklistedGuilds"] as const) {
        const values = saved[key];
        if (!values || typeof values !== "object") continue;
        for (const [id, enabled] of Object.entries(values)) {
            if (typeof enabled === "boolean" && (key !== "channels" || id in result.channels)) result[key][id] = enabled;
        }
    }

    return result;
}
