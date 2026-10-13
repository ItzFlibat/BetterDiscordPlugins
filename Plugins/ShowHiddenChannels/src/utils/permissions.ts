/*
 * BetterDiscordPlugins
 * Copyright (c) 2026 ItzFlibat
 * SPDX-License-Identifier: GPL-3.0-only
 */

import type { Bits, Channel, Overwrite, Role } from "../types";

export const VIEW_CHANNEL = 1024n;
export const ADMINISTRATOR = 8n;
export const CONNECT = 1048576n;

export function bits(value: Bits | undefined): bigint {
    try {
        return BigInt(value ?? 0);
    } catch {
        return 0n;
    }
}

export function overwrites(channel: Channel): Overwrite[] {
    return Object.values(channel.permissionOverwrites ?? channel.permission_overwrites ?? {});
}

export function applyOverwrite(permissions: bigint, overwrite?: Overwrite): bigint {
    return overwrite ? (permissions & ~bits(overwrite.deny)) | bits(overwrite.allow) : permissions;
}

export function roleCanView(channel: Channel, roles: Record<string, Role>, guildId: string, roleId: string): boolean {
    const role = roles[roleId];
    if (!role) return false;
    const base = bits(roles[guildId]?.permissions) | bits(role.permissions);
    if (base & ADMINISTRATOR) return true;
    const rules = overwrites(channel);
    const everyone = rules.find(rule => rule.type === 0 && rule.id === guildId);
    const specific = roleId === guildId ? undefined : rules.find(rule => rule.type === 0 && rule.id === roleId);
    return !!(applyOverwrite(applyOverwrite(base, everyone), specific) & VIEW_CHANNEL);
}

export function memberCanView(
    channel: Channel,
    roles: Record<string, Role>,
    guildId: string,
    userId: string,
    roleIds: string[],
    ownerId?: string
): boolean {
    if (userId === ownerId) return true;
    let permissions = bits(roles[guildId]?.permissions);
    for (const id of roleIds) permissions |= bits(roles[id]?.permissions);
    if (permissions & ADMINISTRATOR) return true;
    const rules = overwrites(channel);
    permissions = applyOverwrite(
        permissions,
        rules.find(rule => rule.type === 0 && rule.id === guildId)
    );
    let allow = 0n;
    let deny = 0n;
    for (const rule of rules) {
        if (rule.type === 0 && rule.id !== guildId && roleIds.includes(rule.id)) {
            allow |= bits(rule.allow);
            deny |= bits(rule.deny);
        }
    }
    permissions = (permissions & ~deny) | allow;
    return !!(
        applyOverwrite(
            permissions,
            rules.find(rule => rule.type === 1 && rule.id === userId)
        ) & VIEW_CHANNEL
    );
}
