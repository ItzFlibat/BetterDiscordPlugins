/*
 * BetterDiscordPlugins
 * Copyright (c) 2026 ItzFlibat
 * SPDX-License-Identifier: GPL-3.0-only
 */

export default `
.shc-lockscreen { flex: 1; min-width: 0; overflow: auto; color: var(--text-default, var(--text-normal)); background: var(--background-base-low, var(--background-primary)); }
.shc-card { box-sizing: border-box; max-width: 850px; margin: 0 auto; padding: 40px 28px; }
.shc-card > .shc-icon { width: 64px; height: 64px; color: var(--text-muted, var(--text-subtle)); }
.shc-card h1 { color: var(--text-strong, var(--header-primary)); font-size: 28px; font-weight: 700; margin: 16px 0; overflow-wrap: anywhere; }
.shc-card h2 { color: var(--text-strong, var(--header-primary)); font-size: 17px; font-weight: 600; margin: 20px 0 10px; }
.shc-card p { line-height: 1.5; margin: 8px 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.shc-topic, .shc-permissions { background: var(--background-surface-high, var(--background-secondary)); padding: 4px 20px 16px; margin: 20px 0; border-radius: 8px; }
.shc-details { display: grid; grid-template-columns: minmax(120px, 1fr) minmax(0, 2fr); gap: 12px; margin: 24px 0; }
.shc-details dt { color: var(--text-muted, var(--text-subtle)); }
.shc-details dd { margin: 0; overflow-wrap: anywhere; user-select: text; }
.shc-note { color: var(--text-muted, var(--text-subtle)); font-size: 13px; }
.shc-pills { display: flex; flex-wrap: wrap; gap: 8px; }
.shc-pill { border: 1px solid var(--border-subtle, var(--background-modifier-accent)); border-radius: 14px; padding: 4px 10px; font-size: 13px; overflow-wrap: anywhere; }
.shc-card summary { cursor: pointer; margin: 16px 0; }
.shc-table-wrap { overflow-x: auto; }
.shc-card table { width: 100%; border-collapse: collapse; font-size: 13px; }
.shc-card th, .shc-card td { text-align: left; padding: 8px; border-bottom: 1px solid var(--border-subtle, var(--background-modifier-accent)); }
.shc-hidden-channel { position: relative; }
.shc-hidden-channel > .shc-indicator { pointer-events: none; position: absolute; right: 8px; top: 50%; transform: translateY(-50%); display: flex; color: var(--text-muted, var(--text-subtle)); }
.shc-hidden-channel.shc-muted { opacity: .6; }
.shc-hidden-channel.shc-with-icon { padding-right: 28px; }
.shc-hidden-channel [class*="actionIcon"], .shc-hidden-channel [class*="iconItem"] { display: none; }
@media (max-width: 500px) { .shc-card { padding: 24px 16px; } .shc-details { grid-template-columns: 1fr; gap: 6px; } .shc-details dd { margin-bottom: 8px; } }
`;
