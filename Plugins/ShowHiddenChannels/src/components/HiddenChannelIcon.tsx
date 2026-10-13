/*
 * BetterDiscordPlugins
 * Copyright (c) 2026 ItzFlibat
 * SPDX-License-Identifier: GPL-3.0-only
 */

export function HiddenChannelIcon({ icon = "lock" }: { icon?: string }) {
    return (
        <svg className="shc-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="Hidden channel">
            <title>Hidden channel</title>
            {icon === "eye" ? (
                <path d="M2 3.4 3.4 2 22 20.6 20.6 22l-3.2-3.2A12.4 12.4 0 0 1 12 21C5 21 1 12 1 12a23 23 0 0 1 4.1-5.3L2 3.4Zm6 6A4 4 0 0 0 13.6 15L8 9.4ZM12 3c7 0 11 9 11 9a23 23 0 0 1-3.3 4.5l-3-3A4 4 0 0 0 10.5 7L7.6 4.1A11.8 11.8 0 0 1 12 3Z" />
            ) : (
                <path d="M6 10V7a6 6 0 0 1 12 0v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1Zm3 0h6V7a3 3 0 0 0-6 0v3Zm3 4a2 2 0 0 0-1 3.7V19h2v-1.3a2 2 0 0 0-1-3.7Z" />
            )}
        </svg>
    );
}
