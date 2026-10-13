/*
 * BetterDiscordPlugins
 * Copyright (c) 2026 ItzFlibat
 * SPDX-License-Identifier: GPL-3.0-only
 */

import type { Category, Channel, GuildList, Settings } from "../types";

function ids(value: unknown): string[] {
    return Array.isArray(value) ? [...value] : value instanceof Set ? [...value] : [];
}

function copy<T extends object>(value: T): T {
    return Object.assign(Object.create(Object.getPrototypeOf(value)), value);
}

export function transformChannelList(
    source: GuildList,
    settings: Settings,
    isHidden: (channel: Channel) => boolean,
    extraId: string
): GuildList {
    const result = copy(source);
    const list = (result.guildChannels = copy(source.guildChannels));
    list.categories = { ...list.categories };
    list.collapsedCategoryIds = { ...list.collapsedCategoryIds };
    const categories: Category[] = [];

    function cloneCategory(category: Category): Category {
        const clone = copy(category);
        clone.channels = Object.fromEntries(
            Object.entries(category.channels ?? {}).map(([id, row]) => [id, { ...copy(row), category: clone }])
        );
        clone.shownChannelIds = ids(category.shownChannelIds);
        clone.hiddenChannelIds = category.hiddenChannelIds && ids(category.hiddenChannelIds);
        if (settings.shouldShowEmptyCategory) clone.shouldShowEmptyCategory = () => true;
        categories.push(clone);
        return clone;
    }

    for (const [id, category] of Object.entries(list.categories)) list.categories[id] = cloneCategory(category);
    for (const key of ["favoritesCategory", "recentsCategory", "noParentCategory", "voiceChannelsCategory"] as const) {
        if (list[key]) list[key] = cloneCategory(list[key]);
    }

    if (settings.sort === "bottom") {
        for (const category of categories) {
            category.shownChannelIds.sort(
                (a, b) => Number(isHidden(category.channels[a]?.record)) - Number(isHidden(category.channels[b]?.record))
            );
        }
    }

    const extra = list.categories[extraId];
    if (settings.sort === "extra" && extra) {
        extra.channels = {};
        for (const category of categories) {
            if (category.id === extraId) continue;
            for (const [id, row] of Object.entries(category.channels)) {
                if (!isHidden(row.record)) continue;
                const record = copy(row.record);
                record.parent_id = extraId;
                extra.channels[id] = { ...row, record, category: extra };
                delete category.channels[id];
            }
            category.shownChannelIds = category.shownChannelIds.filter(id => id in category.channels);
            category.hiddenChannelIds = category.hiddenChannelIds?.filter(id => id in category.channels);
        }
        const ordered = Object.values(extra.channels).sort(
            (a, b) =>
                Number(!!a.record.isGuildVocal?.()) - Number(!!b.record.isGuildVocal?.()) ||
                a.record.position - b.record.position ||
                a.id.localeCompare(b.id)
        );
        extra.shownChannelIds = extra.isCollapsed || list.collapsedCategoryIds[extraId] ? [] : ordered.map(row => row.id);
        extra.hiddenChannelIds = [];
    }

    return result;
}
