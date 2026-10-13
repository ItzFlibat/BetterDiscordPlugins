import config from "./config.json";

interface MessageSnapshot {
    id: string;
    channelId: string;
    guildId: string | null;
    authorId: string;
    authorName: string;
    content: string;
    timestamp: string;
    attachments: Array<{ name: string; url: string }>;
}

interface LogEntry {
    kind: "delete" | "edit";
    message: MessageSnapshot;
    previousContent?: string;
    occurredAt: string;
}

interface Settings {
    logDeletes: boolean;
    keepDeletedVisible: boolean;
    logEdits: boolean;
    logDirectMessages: boolean;
    ignoreBots: boolean;
    ignoredUserIds: string;
    ignoredChannelIds: string;
    maxEntries: number;
}

const DEFAULT_SETTINGS: Settings = {
    logDeletes: true,
    keepDeletedVisible: true,
    logEdits: true,
    logDirectMessages: true,
    ignoreBots: false,
    ignoredUserIds: "",
    ignoredChannelIds: "",
    maxEntries: 5000
};

const PLUGIN_NAME = "MessageLogger";
const LOG_KEY = "logs";
const SETTINGS_KEY = "settings";
const GHOST_STYLE_ID = "message-logger-deleted";
const MENU_ID = "message-logger-channel";

export default class MessageLogger {
    private logs: LogEntry[] = [];
    private settings: Settings = { ...DEFAULT_SETTINGS };
    private dispatcher: any;
    private messageStore: any;
    private unpatches: Array<() => void> = [];
    private dependencyTimer: ReturnType<typeof setTimeout> | undefined;
    private dependencyAttempts = 0;
    private ghosts: string[] = [];

    getName() {
        return PLUGIN_NAME;
    }
    getAuthor() {
        return "ItzFlibat";
    }
    getVersion() {
        return config.version;
    }
    getDescription() {
        return "Locally records deleted messages and message edits for review in BetterDiscord.";
    }

    start() {
        const library = (window as any).YACBDP;
        if (!library?.requirePlugin?.(PLUGIN_NAME)) {
            if (this.dependencyAttempts++ < 20) {
                this.dependencyTimer = setTimeout(() => {
                    if (BdApi.Plugins.isEnabled(PLUGIN_NAME)) this.start();
                }, 500);
            } else {
                BdApi.UI.showToast("MessageLogger requires the enabled YACBDP plugin.", { type: "error" });
            }
            return;
        }
        this.dependencyAttempts = 0;
        library.registerPlugin?.({
            id: PLUGIN_NAME,
            version: config.version,
            changelog: [
                {
                    type: "added",
                    title: "Deleted messages",
                    items: ["Deleted messages from other people stay visible in the chat, highlighted, and are recorded reliably."]
                },
                {
                    type: "improved",
                    title: "Session only",
                    items: ["Logs are kept in memory and removed on reload. Your own deletions are logged and kept visible too."]
                },
                { type: "fixed", title: "Edits", items: ["Message edits are now recorded."] }
            ]
        });
        // Logs live in memory only and disappear when the client reloads. Remove anything an older version saved.
        this.logs = [];
        BdApi.Data.delete(PLUGIN_NAME, LOG_KEY);
        this.settings = { ...DEFAULT_SETTINGS, ...(BdApi.Data.load(PLUGIN_NAME, SETTINGS_KEY) ?? {}) };
        this.dispatcher =
            BdApi.Webpack.getByKeys("dispatch", "subscribe", "flushWaitQueue") ??
            BdApi.Webpack.getByKeys("actionLogger", "dispatch") ??
            BdApi.Webpack.getByKeys("dispatch", "subscribe");
        this.messageStore = BdApi.Webpack.getStore("MessageStore");
        if (!this.dispatcher || !this.messageStore) {
            BdApi.Logger.error(PLUGIN_NAME, "Could not find Discord's dispatcher or message store; logging is disabled.");
            BdApi.UI.showToast("MessageLogger could not find required Discord modules.", { type: "error" });
            return;
        }

        BdApi.Patcher.instead(PLUGIN_NAME, this.dispatcher, "dispatch", (instance: any, args: any[], original: (...args: any[]) => any) => {
            const event = args[0];
            if (event && typeof event.type === "string") {
                try {
                    if (event.type === "MESSAGE_DELETE" && this.settings.logDeletes) {
                        if (this.onDelete(event)) return undefined;
                    } else if (event.type === "MESSAGE_DELETE_BULK" && this.settings.logDeletes) {
                        const remaining = this.onBulkDelete(event);
                        if (remaining.length === 0) return undefined;
                        if (remaining.length !== (event.ids ?? []).length) args[0] = { ...event, ids: remaining };
                    } else if (event.type === "MESSAGE_UPDATE" && this.settings.logEdits) this.onUpdate(event);
                } catch (error) {
                    BdApi.Logger.error(PLUGIN_NAME, "Failed to record a message event.", error);
                }
            }
            return original.apply(instance, args);
        });
        BdApi.Logger.info(PLUGIN_NAME, `Recording message events. ${this.logs.length} entries this session.`);
        this.patchMenus();
    }

    stop() {
        if (this.dependencyTimer) clearTimeout(this.dependencyTimer);
        this.dependencyAttempts = 0;
        this.logs = [];
        BdApi.Patcher.unpatchAll(PLUGIN_NAME);
        BdApi.DOM.removeStyle(GHOST_STYLE_ID);
        this.ghosts = [];
        for (const unpatch of this.unpatches.splice(0)) unpatch();
    }

    getSettingsPanel() {
        const save = (key: keyof Settings, value: unknown) => {
            this.settings = { ...this.settings, [key]: value };
            BdApi.Data.save(PLUGIN_NAME, SETTINGS_KEY, this.settings);
            this.prune();
        };
        const categories = [
            {
                type: "category",
                id: "logging",
                name: "Logging",
                collapsible: true,
                shown: true,
                settings: [
                    {
                        type: "switch",
                        id: "logDeletes",
                        name: "Log deleted messages",
                        value: this.settings.logDeletes
                    },
                    {
                        type: "switch",
                        id: "keepDeletedVisible",
                        name: "Keep deleted messages visible",
                        note: "Deleted messages stay in the chat, highlighted, until you reload Discord. Your own deletions are logged too.",
                        value: this.settings.keepDeletedVisible
                    },
                    {
                        type: "switch",
                        id: "logEdits",
                        name: "Keep message edit history",
                        value: this.settings.logEdits
                    },
                    {
                        type: "switch",
                        id: "logDirectMessages",
                        name: "Include direct messages",
                        value: this.settings.logDirectMessages
                    },
                    {
                        type: "switch",
                        id: "ignoreBots",
                        name: "Ignore messages from bots",
                        value: this.settings.ignoreBots
                    }
                ]
            },
            {
                type: "category",
                id: "filters",
                name: "Filters and storage",
                collapsible: true,
                shown: false,
                settings: [
                    {
                        type: "textbox",
                        id: "ignoredUserIds",
                        name: "Ignored user IDs (comma separated)",
                        value: this.settings.ignoredUserIds
                    },
                    {
                        type: "textbox",
                        id: "ignoredChannelIds",
                        name: "Ignored channel IDs (comma separated)",
                        value: this.settings.ignoredChannelIds
                    },
                    {
                        type: "number",
                        id: "maxEntries",
                        name: "Maximum entries kept until Discord reloads",
                        value: this.settings.maxEntries,
                        min: 100,
                        max: 50000
                    }
                ]
            }
        ];
        const onChange = (_category: string, id: string, value: unknown) => save(id as keyof Settings, value);
        const library = (window as any).YACBDP;
        return library?.buildSettingsPanel
            ? library.buildSettingsPanel(PLUGIN_NAME, categories, onChange)
            : BdApi.UI.buildSettingsPanel({ settings: categories, onChange });
    }

    // Returns true when the deleted message should stay visible in the chat instead of being removed.
    private onDelete(event: any): boolean {
        const channelId = String(event.channelId ?? event.channel_id ?? "");
        const messageId = String(event.id ?? event.messageId ?? "");
        if (!channelId || !messageId) return false;
        const message = event.message ?? this.messageStore.getMessage(channelId, messageId);
        if (!message || this.isEphemeral(message) || !this.shouldLog(message, channelId)) return false;
        this.add({ kind: "delete", message: this.snapshot(message, channelId), occurredAt: new Date().toISOString() });
        return this.keepVisible(message, channelId);
    }

    private onBulkDelete(event: any): string[] {
        const channelId = String(event.channelId ?? event.channel_id ?? "");
        const ids: unknown[] = event.ids ?? event.messageIds ?? [];
        if (!channelId || !Array.isArray(ids)) return [];
        const remaining: string[] = [];
        for (const id of ids) {
            const message = this.messageStore.getMessage(channelId, String(id));
            if (message && !this.isEphemeral(message) && this.shouldLog(message, channelId)) {
                this.add({ kind: "delete", message: this.snapshot(message, channelId), occurredAt: new Date().toISOString() });
                if (this.keepVisible(message, channelId)) continue;
            }
            remaining.push(String(id));
        }
        return remaining;
    }

    private keepVisible(message: any, channelId: string): boolean {
        if (!this.settings.keepDeletedVisible) return false;
        this.ghosts.push(`chat-messages-${channelId}-${message.id}`);
        if (this.ghosts.length > 300) this.ghosts.shift();
        this.updateGhostStyle();
        return true;
    }

    private updateGhostStyle() {
        BdApi.DOM.removeStyle(GHOST_STYLE_ID);
        if (this.ghosts.length === 0) return;
        const selector = this.ghosts.map(id => `[id="${id}"]`);
        BdApi.DOM.addStyle(
            GHOST_STYLE_ID,
            `${selector.join(",")} { background: color-mix(in srgb, var(--status-danger, #f23f42) 12%, transparent) !important; }
${selector.map(item => `${item} [class*="contents"]::after`).join(",")} { content: "Deleted"; color: var(--status-danger, #f23f42); font-size: 11px; font-weight: 600; margin-left: 8px; }`
        );
    }

    private onUpdate(event: any) {
        const updated = event.message;
        if (!updated?.id || typeof updated.content !== "string") return;
        const channelId = String(updated.channel_id ?? updated.channelId ?? "");
        const cached = channelId ? this.messageStore.getMessage(channelId, String(updated.id)) : undefined;
        if (!cached || this.isEphemeral(cached) || !this.shouldLog(cached, channelId)) return;
        const previous = String(cached.content ?? "");
        if (previous === updated.content) return;
        this.add({
            kind: "edit",
            message: { ...this.snapshot(cached, channelId), content: updated.content },
            previousContent: previous,
            occurredAt: new Date().toISOString()
        });
    }

    private shouldLog(message: any, channelId: string) {
        const authorId = String(message.author?.id ?? message.authorId ?? "");
        const channel = BdApi.Webpack.getStore("ChannelStore")?.getChannel(channelId);
        const isDm = !channel?.guild_id && !channel?.guildId;
        if (isDm && !this.settings.logDirectMessages) return false;
        if (this.settings.ignoreBots && message.author?.bot) return false;
        if (this.ids(this.settings.ignoredUserIds).has(authorId) || this.ids(this.settings.ignoredChannelIds).has(channelId)) return false;
        return true;
    }

    private isEphemeral(message: any) {
        return (Number(message.flags) & 64) !== 0;
    }

    private snapshot(message: any, channelId: string): MessageSnapshot {
        const author = message.author ?? {};
        return {
            id: String(message.id),
            channelId,
            guildId: message.guild_id ?? message.guildId ?? null,
            authorId: String(author.id ?? message.authorId ?? ""),
            authorName: String(author.globalName ?? author.global_name ?? author.username ?? message.nick ?? "Unknown user"),
            content: String(message.content ?? ""),
            timestamp:
                message.timestamp instanceof Date ? message.timestamp.toISOString() : String(message.timestamp ?? new Date().toISOString()),
            attachments: Array.from(message.attachments?.values?.() ?? message.attachments ?? []).map((attachment: any) => ({
                name: String(attachment.filename ?? attachment.name ?? "Attachment"),
                url: String(attachment.url ?? attachment.proxy_url ?? "")
            }))
        };
    }

    private add(entry: LogEntry) {
        this.logs.push(entry);
        this.prune();
    }

    private prune() {
        const maximum = Math.max(100, Number(this.settings.maxEntries) || DEFAULT_SETTINGS.maxEntries);
        if (this.logs.length > maximum) this.logs = this.logs.slice(-maximum);
    }

    private ids(value: string) {
        return new Set(
            value
                .split(",")
                .map(id => id.trim())
                .filter(Boolean)
        );
    }

    private patchMenus() {
        try {
            this.unpatches.push(
                BdApi.ContextMenu.patch("channel-context", (tree: any, props: any) => {
                    const channelId = String(props.channel?.id ?? "");
                    if (!channelId) return;
                    const children = tree?.props?.children;
                    if (!Array.isArray(children)) return;
                    children.push(
                        BdApi.ContextMenu.buildItem({
                            type: "submenu",
                            id: MENU_ID,
                            label: "Message Log",
                            items: [
                                {
                                    id: `${MENU_ID}-view`,
                                    label: "View",
                                    action: () => this.openLog(channelId, props.channel?.name ?? "Channel")
                                },
                                { id: `${MENU_ID}-export`, label: "Export as JSON", action: () => this.exportChannel(channelId) },
                                { id: `${MENU_ID}-clear`, label: "Clear", color: "danger", action: () => this.confirmClear(channelId) }
                            ]
                        })
                    );
                })
            );
        } catch (error) {
            BdApi.Logger.warn(PLUGIN_NAME, "The channel context menu is unavailable.", error);
        }
    }

    private openLog(channelId: string, channelName: string) {
        const entries = this.logs
            .filter(entry => entry.message.channelId === channelId)
            .slice()
            .reverse();
        const content = (
            <div style={{ maxHeight: "60vh", overflow: "auto", minWidth: 360 }}>
                <h2>
                    {channelName} · {entries.length} events
                </h2>
                {entries.length === 0 && <p>No deleted messages or edits have been recorded for this channel.</p>}
                {entries.map((entry, index) => (
                    <article
                        key={`${entry.message.id}-${entry.occurredAt}-${index}`}
                        style={{ borderBottom: "1px solid var(--border-subtle, var(--background-modifier-accent))", padding: "10px 0" }}
                    >
                        <strong>
                            {entry.kind === "delete" ? "Deleted" : "Edited"} · {entry.message.authorName}
                        </strong>
                        <div style={{ opacity: 0.7, fontSize: 12 }}>
                            {new Date(entry.occurredAt).toLocaleString()} · message {entry.message.id}
                        </div>
                        {entry.kind === "edit" && (
                            <p>
                                <strong>Before:</strong> {entry.previousContent || "(empty)"}
                            </p>
                        )}
                        <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{entry.message.content || "(empty message)"}</p>
                        {entry.message.attachments.map((attachment, i) => (
                            <div key={i}>
                                <a href={attachment.url} target="_blank" rel="noreferrer">
                                    {attachment.name}
                                </a>
                            </div>
                        ))}
                    </article>
                ))}
            </div>
        );
        BdApi.UI.alert("Message Logger", content);
    }

    private clearChannel(channelId: string) {
        this.logs = this.logs.filter(entry => entry.message.channelId !== channelId);
        BdApi.UI.showToast("Channel log cleared.", { type: "success" });
    }

    private confirmClear(channelId: string) {
        BdApi.UI.showConfirmationModal("Clear channel log?", "This permanently removes the saved entries for this channel.", {
            confirmText: "Clear log",
            danger: true,
            onConfirm: () => this.clearChannel(channelId)
        });
    }

    private exportChannel(channelId: string) {
        const entries = this.logs.filter(entry => entry.message.channelId === channelId);
        BdApi.UI.showConfirmationModal(
            "Export channel log",
            <pre style={{ maxHeight: "60vh", overflow: "auto", whiteSpace: "pre-wrap" }}>{JSON.stringify(entries, null, 2)}</pre>,
            {
                confirmText: "Copy JSON",
                cancelText: "Close",
                onConfirm: () => BdApi.UI.copyToClipboard(JSON.stringify(entries, null, 2))
            }
        );
    }
}
