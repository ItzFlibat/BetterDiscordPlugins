/*
 * BetterDiscordPlugins
 * Copyright (c) 2026 ItzFlibat
 * SPDX-License-Identifier: GPL-3.0-only
 */

export function snowflakeDate(id?: string): string | null {
    if (!id || !/^\d+$/.test(id)) return null;
    const date = new Date(Number((BigInt(id) >> 22n) + 1420070400000n));
    return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
}

export function duration(seconds: number): string {
    if (!seconds) return "Off";
    return [
        [86400, "d"],
        [3600, "h"],
        [60, "m"],
        [1, "s"]
    ]
        .map(([unit, label]) => {
            const count = Math.floor(seconds / Number(unit));
            seconds %= Number(unit);
            return count ? `${count}${label}` : "";
        })
        .filter(Boolean)
        .join(" ");
}
