/**
 * @name MessageLogger
 * @displayName Message Logger
 * @version 1.1.0
 * @author ItzFlibat
 * @authorId 619203349954166804
 * @source https://github.com/ItzFlibat/BetterDiscordPlugins/tree/main/Plugins/MessageLogger
 * @website https://flibat.com
 * @description Locally records deleted messages and message edits for review in BetterDiscord.
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	const __webpack_require__ = {};
/******/
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	// define getter/value functions for harmony exports
/******/ 	__webpack_require__.d = (exports, definition) => {
/******/ 		for(var key in definition) {
/******/ 			if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 			}
/******/ 		}
/******/ 	};
/******/
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop));
/******/
/************************************************************************/
let __webpack_exports__ = {};
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ MessageLogger)
/* harmony export */ });
const DEFAULT_SETTINGS = {
  logDeletes: true,
  logEdits: true,
  logDirectMessages: true,
  ignoreBots: false,
  ignoredUserIds: "",
  ignoredChannelIds: "",
  retentionDays: 30,
  maxEntries: 5000
};
const PLUGIN_NAME = "MessageLogger";
const LOG_KEY = "logs";
const SETTINGS_KEY = "settings";
const MENU_ID = "message-logger-channel";
class MessageLogger {
  logs = [];
  settings = {
    ...DEFAULT_SETTINGS
  };
  unpatches = [];
  dependencyAttempts = 0;
  getName() {
    return PLUGIN_NAME;
  }
  getAuthor() {
    return "ItzFlibat";
  }
  getVersion() {
    return "1.1.0";
  }
  getDescription() {
    return "Locally records deleted messages and message edits for review in BetterDiscord.";
  }
  start() {
    const library = window.YACBDPLibrary;
    if (!library?.requirePlugin?.(PLUGIN_NAME)) {
      if (this.dependencyAttempts++ < 20) {
        this.dependencyTimer = setTimeout(() => {
          if (BdApi.Plugins.isEnabled(PLUGIN_NAME)) this.start();
        }, 500);
      } else {
        BdApi.UI.showToast("MessageLogger requires the enabled YACBDP Library plugin.", {
          type: "error"
        });
      }
      return;
    }
    this.dependencyAttempts = 0;
    this.logs = BdApi.Data.load(PLUGIN_NAME, LOG_KEY) ?? [];
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(BdApi.Data.load(PLUGIN_NAME, SETTINGS_KEY) ?? {})
    };
    this.prune();
    this.dispatcher = BdApi.Webpack.getByKeys("dispatch", "subscribe");
    this.messageStore = BdApi.Webpack.getStore("MessageStore");
    if (!this.dispatcher || !this.messageStore) {
      BdApi.Logger.error(PLUGIN_NAME, "Could not find Discord's dispatcher or message store; logging is disabled.");
      BdApi.UI.showToast("MessageLogger could not find required Discord modules.", {
        type: "error"
      });
      return;
    }
    BdApi.Patcher.before(PLUGIN_NAME, this.dispatcher, "dispatch", (_, args) => {
      const event = args[0];
      if (!event || typeof event.type !== "string") return;
      try {
        if (event.type === "MESSAGE_DELETE" && this.settings.logDeletes) this.onDelete(event);else if (event.type === "MESSAGE_DELETE_BULK" && this.settings.logDeletes) this.onBulkDelete(event);else if (event.type === "MESSAGE_UPDATE" && this.settings.logEdits) this.onUpdate(event);
      } catch (error) {
        BdApi.Logger.error(PLUGIN_NAME, "Failed to record a message event.", error);
      }
    });
    this.patchMenus();
  }
  stop() {
    if (this.dependencyTimer) clearTimeout(this.dependencyTimer);
    this.dependencyAttempts = 0;
    BdApi.Patcher.unpatchAll(PLUGIN_NAME);
    for (const unpatch of this.unpatches.splice(0)) unpatch();
  }
  getSettingsPanel() {
    const save = (key, value) => {
      this.settings = {
        ...this.settings,
        [key]: value
      };
      BdApi.Data.save(PLUGIN_NAME, SETTINGS_KEY, this.settings);
    };
    return BdApi.UI.buildSettingsPanel({
      settings: [{
        type: "switch",
        id: "logDeletes",
        name: "Log deleted messages",
        value: this.settings.logDeletes,
        onChange: v => save("logDeletes", v)
      }, {
        type: "switch",
        id: "logEdits",
        name: "Keep message edit history",
        value: this.settings.logEdits,
        onChange: v => save("logEdits", v)
      }, {
        type: "switch",
        id: "logDirectMessages",
        name: "Include direct messages",
        value: this.settings.logDirectMessages,
        onChange: v => save("logDirectMessages", v)
      }, {
        type: "switch",
        id: "ignoreBots",
        name: "Ignore messages from bots",
        value: this.settings.ignoreBots,
        onChange: v => save("ignoreBots", v)
      }, {
        type: "textbox",
        id: "ignoredUserIds",
        name: "Ignored user IDs (comma separated)",
        value: this.settings.ignoredUserIds,
        onChange: v => save("ignoredUserIds", v)
      }, {
        type: "textbox",
        id: "ignoredChannelIds",
        name: "Ignored channel IDs (comma separated)",
        value: this.settings.ignoredChannelIds,
        onChange: v => save("ignoredChannelIds", v)
      }, {
        type: "number",
        id: "retentionDays",
        name: "Keep entries for days (0 = forever)",
        value: this.settings.retentionDays,
        min: 0,
        max: 3650,
        onChange: v => save("retentionDays", v)
      }, {
        type: "number",
        id: "maxEntries",
        name: "Maximum stored entries",
        value: this.settings.maxEntries,
        min: 100,
        max: 50000,
        onChange: v => save("maxEntries", v)
      }]
    });
  }
  onDelete(event) {
    const channelId = String(event.channelId ?? event.channel_id ?? "");
    const messageId = String(event.id ?? event.messageId ?? "");
    if (!channelId || !messageId) return;
    const message = event.message ?? this.messageStore.getMessage(channelId, messageId);
    if (!message || this.isEphemeral(message) || !this.shouldLog(message, channelId)) return;
    this.add({
      kind: "delete",
      message: this.snapshot(message, channelId),
      occurredAt: new Date().toISOString()
    });
  }
  onBulkDelete(event) {
    const channelId = String(event.channelId ?? event.channel_id ?? "");
    const ids = event.ids ?? event.messageIds ?? [];
    if (!channelId || !Array.isArray(ids)) return;
    for (const id of ids) {
      const message = this.messageStore.getMessage(channelId, String(id));
      if (!message || this.isEphemeral(message) || !this.shouldLog(message, channelId)) continue;
      this.add({
        kind: "delete",
        message: this.snapshot(message, channelId),
        occurredAt: new Date().toISOString()
      });
    }
  }
  onUpdate(event) {
    const updated = event.message;
    if (!updated?.id) return;
    const channelId = String(updated.channel_id ?? updated.channelId ?? "");
    const messageId = String(updated.id);
    const cached = this.messageStore.getMessage(channelId, messageId);
    const oldEntry = this.logs.filter(entry => entry.message.id === messageId && entry.message.channelId === channelId).at(-1);
    const nextContent = typeof updated.content === "string" ? updated.content : String(cached?.content ?? "");
    if (!channelId || !cached || this.isEphemeral(cached) || !this.shouldLog(cached, channelId)) return;
    if (!oldEntry || oldEntry.kind !== "edit" || oldEntry.message.content === nextContent) return;
    this.add({
      kind: "edit",
      message: {
        ...this.snapshot(cached, channelId),
        content: nextContent
      },
      previousContent: oldEntry.message.content,
      occurredAt: new Date().toISOString()
    });
  }
  shouldLog(message, channelId) {
    const authorId = String(message.author?.id ?? message.authorId ?? "");
    const channel = BdApi.Webpack.getStore("ChannelStore")?.getChannel(channelId);
    const isDm = !channel?.guild_id && !channel?.guildId;
    if (isDm && !this.settings.logDirectMessages) return false;
    if (this.settings.ignoreBots && message.author?.bot) return false;
    if (this.ids(this.settings.ignoredUserIds).has(authorId) || this.ids(this.settings.ignoredChannelIds).has(channelId)) return false;
    return true;
  }
  isEphemeral(message) {
    return (Number(message.flags) & 64) !== 0;
  }
  snapshot(message, channelId) {
    const author = message.author ?? {};
    return {
      id: String(message.id),
      channelId,
      guildId: message.guild_id ?? message.guildId ?? null,
      authorId: String(author.id ?? message.authorId ?? ""),
      authorName: String(author.globalName ?? author.global_name ?? author.username ?? message.nick ?? "Unknown user"),
      content: String(message.content ?? ""),
      timestamp: message.timestamp instanceof Date ? message.timestamp.toISOString() : String(message.timestamp ?? new Date().toISOString()),
      attachments: Array.from(message.attachments?.values?.() ?? message.attachments ?? []).map(attachment => ({
        name: String(attachment.filename ?? attachment.name ?? "Attachment"),
        url: String(attachment.url ?? attachment.proxy_url ?? "")
      }))
    };
  }
  add(entry) {
    this.logs.push(entry);
    this.prune();
    BdApi.Data.save(PLUGIN_NAME, LOG_KEY, this.logs);
  }
  prune() {
    const retention = Number(this.settings.retentionDays);
    if (retention > 0) {
      const cutoff = Date.now() - retention * 86400000;
      this.logs = this.logs.filter(entry => Date.parse(entry.occurredAt) >= cutoff);
    }
    const maximum = Math.max(100, Number(this.settings.maxEntries) || DEFAULT_SETTINGS.maxEntries);
    if (this.logs.length > maximum) this.logs = this.logs.slice(-maximum);
    BdApi.Data.save(PLUGIN_NAME, LOG_KEY, this.logs);
  }
  ids(value) {
    return new Set(value.split(",").map(id => id.trim()).filter(Boolean));
  }
  patchMenus() {
    try {
      this.unpatches.push(BdApi.ContextMenu.patch("channel-context", (tree, props) => {
        const channelId = String(props.channel?.id ?? "");
        if (!channelId) return;
        const children = tree?.props?.children;
        if (!Array.isArray(children)) return;
        children.push(BdApi.React.createElement(BdApi.ContextMenu.Item, {
          id: MENU_ID,
          label: "View Message Log",
          action: () => this.openLog(channelId, props.channel?.name ?? "Channel"),
          children: [BdApi.React.createElement(BdApi.ContextMenu.Item, {
            id: `${MENU_ID}-export`,
            label: "Export as JSON",
            action: () => this.exportChannel(channelId)
          }), BdApi.React.createElement(BdApi.ContextMenu.Item, {
            id: `${MENU_ID}-clear`,
            label: "Clear Channel Log",
            action: () => this.confirmClear(channelId)
          })]
        }));
      }));
    } catch (error) {
      BdApi.Logger.warn(PLUGIN_NAME, "The channel context menu is unavailable.", error);
    }
  }
  openLog(channelId, channelName) {
    const entries = this.logs.filter(entry => entry.message.channelId === channelId).slice().reverse();
    const content = BdApi.React.createElement("div", {
      style: {
        maxHeight: "60vh",
        overflow: "auto",
        minWidth: 360
      }
    }, BdApi.React.createElement("h2", null, channelName, " \xB7 ", entries.length, " events"), entries.length === 0 && BdApi.React.createElement("p", null, "No deleted messages or edits have been recorded for this channel."), entries.map((entry, index) => BdApi.React.createElement("article", {
      key: `${entry.message.id}-${entry.occurredAt}-${index}`,
      style: {
        borderBottom: "1px solid var(--background-modifier-accent)",
        padding: "10px 0"
      }
    }, BdApi.React.createElement("strong", null, entry.kind === "delete" ? "Deleted" : "Edited", " \xB7 ", entry.message.authorName), BdApi.React.createElement("div", {
      style: {
        opacity: 0.7,
        fontSize: 12
      }
    }, new Date(entry.occurredAt).toLocaleString(), " \xB7 message ", entry.message.id), entry.kind === "edit" && BdApi.React.createElement("p", null, BdApi.React.createElement("strong", null, "Before:"), " ", entry.previousContent || "(empty)"), BdApi.React.createElement("p", {
      style: {
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere"
      }
    }, entry.message.content || "(empty message)"), entry.message.attachments.map((attachment, i) => BdApi.React.createElement("div", {
      key: i
    }, BdApi.React.createElement("a", {
      href: attachment.url,
      target: "_blank",
      rel: "noreferrer"
    }, attachment.name))))));
    BdApi.UI.alert("Message Logger", content);
  }
  clearChannel(channelId) {
    this.logs = this.logs.filter(entry => entry.message.channelId !== channelId);
    BdApi.Data.save(PLUGIN_NAME, LOG_KEY, this.logs);
    BdApi.UI.showToast("Channel log cleared.", {
      type: "success"
    });
  }
  confirmClear(channelId) {
    BdApi.UI.showConfirmationModal("Clear channel log?", "This permanently removes the saved entries for this channel.", {
      confirmText: "Clear log",
      danger: true,
      onConfirm: () => this.clearChannel(channelId)
    });
  }
  exportChannel(channelId) {
    const entries = this.logs.filter(entry => entry.message.channelId === channelId);
    BdApi.UI.showConfirmationModal("Export channel log", BdApi.React.createElement("pre", {
      style: {
        maxHeight: "60vh",
        overflow: "auto",
        whiteSpace: "pre-wrap"
      }
    }, JSON.stringify(entries, null, 2)), {
      confirmText: "Copy JSON",
      cancelText: "Close",
      onConfirm: () => BdApi.UI.copyToClipboard(JSON.stringify(entries, null, 2))
    });
  }
}
module.exports = __webpack_exports__["default"];
/******/ })()
;