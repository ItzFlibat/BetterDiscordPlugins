/**
 * @name ShowHiddenChannels
 * @displayName Show Hidden Channels
 * @version 2.1.0
 * @author ItzFlibat
 * @authorId 619203349954166804
 * @source https://github.com/ItzFlibat/BetterDiscordPlugins/tree/main/Plugins/ShowHiddenChannels
 * @website https://flibat.com
 * @description Show hidden channels and inspect locally available channel information and permissions. Does not grant access to messages or voice channels.
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/
/************************************************************************/
var __webpack_exports__ = {};

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": () => (/* binding */ ShowHiddenChannels)
});

;// ./src/components/HiddenChannelIcon.tsx
/*
 * BetterDiscordPlugins
 * Copyright (c) 2026 ItzFlibat
 * SPDX-License-Identifier: GPL-3.0-only
 */

function HiddenChannelIcon({
  icon = "lock"
}) {
  return BdApi.React.createElement("svg", {
    className: "shc-icon",
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    role: "img",
    "aria-label": "Hidden channel"
  }, BdApi.React.createElement("title", null, "Hidden channel"), icon === "eye" ? BdApi.React.createElement("path", {
    d: "M2 3.4 3.4 2 22 20.6 20.6 22l-3.2-3.2A12.4 12.4 0 0 1 12 21C5 21 1 12 1 12a23 23 0 0 1 4.1-5.3L2 3.4Zm6 6A4 4 0 0 0 13.6 15L8 9.4ZM12 3c7 0 11 9 11 9a23 23 0 0 1-3.3 4.5l-3-3A4 4 0 0 0 10.5 7L7.6 4.1A11.8 11.8 0 0 1 12 3Z"
  }) : BdApi.React.createElement("path", {
    d: "M6 10V7a6 6 0 0 1 12 0v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1Zm3 0h6V7a3 3 0 0 0-6 0v3Zm3 4a2 2 0 0 0-1 3.7V19h2v-1.3a2 2 0 0 0-1-3.7Z"
  }));
}
;// ./src/settings.ts
/*
 * BetterDiscordPlugins
 * Copyright (c) 2026 ItzFlibat
 * SPDX-License-Identifier: GPL-3.0-only
 */

const channelTypes = {
  0: "GUILD_TEXT",
  2: "GUILD_VOICE",
  4: "GUILD_CATEGORY",
  5: "GUILD_ANNOUNCEMENT",
  6: "GUILD_STORE",
  13: "GUILD_STAGE_VOICE",
  15: "GUILD_FORUM",
  16: "GUILD_MEDIA"
};
const defaultSettings = {
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
function loadSettings(value) {
  const saved = value && typeof value === "object" ? value : {};
  const result = {
    ...defaultSettings,
    channels: {
      ...defaultSettings.channels
    },
    blacklistedGuilds: {}
  };
  for (const key of ["showPerms", "hideUnreads", "mutedStyle", "shouldShowEmptyCategory", "showLastMessage", "debugMode"]) {
    if (typeof saved[key] === "boolean") result[key] = saved[key];
  }
  if (typeof saved.hideUnreads !== "boolean" && typeof saved.MarkUnread === "boolean") result.hideUnreads = !saved.MarkUnread;
  if (["native", "bottom", "extra"].includes(String(saved.sort))) result.sort = saved.sort;
  if (["lock", "eye", "none"].includes(String(saved.hiddenChannelIcon))) result.hiddenChannelIcon = saved.hiddenChannelIcon;
  if (saved.hiddenChannelIcon === false) result.hiddenChannelIcon = "none";
  if (["channel", "always", "never", "exclude"].includes(String(saved.showAdmin))) result.showAdmin = saved.showAdmin;
  if (saved.showAdmin === "include") result.showAdmin = "always";
  if (saved.showAdmin === false) result.showAdmin = "never";
  for (const key of ["channels", "blacklistedGuilds"]) {
    const values = saved[key];
    if (!values || typeof values !== "object") continue;
    for (const [id, enabled] of Object.entries(values)) {
      if (typeof enabled === "boolean" && (key !== "channels" || id in result.channels)) result[key][id] = enabled;
    }
  }
  return result;
}
;// ./src/utils/date.ts
/*
 * BetterDiscordPlugins
 * Copyright (c) 2026 ItzFlibat
 * SPDX-License-Identifier: GPL-3.0-only
 */

function snowflakeDate(id) {
  if (!id || !/^\d+$/.test(id)) return null;
  const date = new Date(Number((BigInt(id) >> 22n) + 1420070400000n));
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
}
function duration(seconds) {
  if (!seconds) return "Off";
  return [[86400, "d"], [3600, "h"], [60, "m"], [1, "s"]].map(([unit, label]) => {
    const count = Math.floor(seconds / Number(unit));
    seconds %= Number(unit);
    return count ? `${count}${label}` : "";
  }).filter(Boolean).join(" ");
}
;// ./src/utils/permissions.ts
/*
 * BetterDiscordPlugins
 * Copyright (c) 2026 ItzFlibat
 * SPDX-License-Identifier: GPL-3.0-only
 */

const VIEW_CHANNEL = 1024n;
const ADMINISTRATOR = 8n;
const CONNECT = 1048576n;
function bits(value) {
  try {
    return BigInt(value ?? 0);
  } catch {
    return 0n;
  }
}
function overwrites(channel) {
  return Object.values(channel.permissionOverwrites ?? channel.permission_overwrites ?? {});
}
function applyOverwrite(permissions, overwrite) {
  return overwrite ? permissions & ~bits(overwrite.deny) | bits(overwrite.allow) : permissions;
}
function roleCanView(channel, roles, guildId, roleId) {
  const role = roles[roleId];
  if (!role) return false;
  const base = bits(roles[guildId]?.permissions) | bits(role.permissions);
  if (base & ADMINISTRATOR) return true;
  const rules = overwrites(channel);
  const everyone = rules.find(rule => rule.type === 0 && rule.id === guildId);
  const specific = roleId === guildId ? undefined : rules.find(rule => rule.type === 0 && rule.id === roleId);
  return !!(applyOverwrite(applyOverwrite(base, everyone), specific) & VIEW_CHANNEL);
}
function memberCanView(channel, roles, guildId, userId, roleIds, ownerId) {
  if (userId === ownerId) return true;
  let permissions = bits(roles[guildId]?.permissions);
  for (const id of roleIds) permissions |= bits(roles[id]?.permissions);
  if (permissions & ADMINISTRATOR) return true;
  const rules = overwrites(channel);
  permissions = applyOverwrite(permissions, rules.find(rule => rule.type === 0 && rule.id === guildId));
  let allow = 0n;
  let deny = 0n;
  for (const rule of rules) {
    if (rule.type === 0 && rule.id !== guildId && roleIds.includes(rule.id)) {
      allow |= bits(rule.allow);
      deny |= bits(rule.deny);
    }
  }
  permissions = permissions & ~deny | allow;
  return !!(applyOverwrite(permissions, rules.find(rule => rule.type === 1 && rule.id === userId)) & VIEW_CHANNEL);
}
;// ./src/components/Lockscreen.tsx
/*
 * BetterDiscordPlugins
 * Copyright (c) 2026 ItzFlibat
 * SPDX-License-Identifier: GPL-3.0-only
 */





function roleColor(role) {
  return role.color ? `#${role.color.toString(16).padStart(6, "0")}` : undefined;
}
function Lockscreen({
  channel,
  settings,
  modules
}) {
  const guild = modules.GuildStore.getGuild(channel.guild_id);
  const roles = modules.GuildRoleStore?.getRolesSnapshot(channel.guild_id) ?? guild?.roles ?? {};
  const ownerId = guild?.ownerId ?? guild?.owner_id;
  const rules = overwrites(channel);
  const allowedRoles = Object.values(roles).filter(role => {
    const admin = !!(bits(role.permissions) & ADMINISTRATOR);
    if (admin && (settings.showAdmin === "never" || settings.showAdmin === "exclude" && role.tags?.bot_id)) return false;
    if (admin && settings.showAdmin === "channel" && !rules.some(rule => rule.id === role.id && rule.type === 0)) return false;
    return roleCanView(channel, roles, channel.guild_id, role.id);
  }).sort((a, b) => (b.position ?? 0) - (a.position ?? 0));
  const members = rules.filter(rule => rule.type === 1).map(rule => {
    const member = modules.GuildMemberStore?.getMember(channel.guild_id, rule.id);
    const known = !!member || rule.id === ownerId;
    const allowed = known ? memberCanView(channel, roles, channel.guild_id, rule.id, member?.roles ?? [], ownerId) : !!(bits(rule.allow) & VIEW_CHANNEL);
    return {
      rule,
      allowed,
      known
    };
  }).filter(member => member.allowed);
  const userName = id => {
    const user = modules.UserStore?.getUser(id);
    return user?.globalName ?? user?.username ?? id;
  };
  const forum = channel.type === 15 || channel.type === 16;
  const voice = channel.type === 2 || channel.type === 13;
  const typeName = channelTypes[channel.type]?.replace("GUILD_", "").toLowerCase() ?? "unknown";
  const details = [["Channel ID", channel.id], ["Category", modules.ChannelStore.getChannel(channel.parent_id ?? "")?.name], ["Created", snowflakeDate(channel.id)], ["Last message", settings.showLastMessage ? snowflakeDate(channel.lastMessageId ?? channel.last_message_id) : null], ["Last pin", channel.lastPinTimestamp ? new Date(channel.lastPinTimestamp).toLocaleString() : null], ["Age restricted", channel.nsfw ? "Yes" : "No"], ["Slowmode", duration(channel.rateLimitPerUser ?? channel.rate_limit_per_user ?? 0)], ["Icon emoji", channel.iconEmoji?.name ?? channel.iconEmoji?.id], ["Bitrate", voice && channel.bitrate ? `${channel.bitrate / 1000} kbps` : null], ["User limit", voice ? channel.userLimit ?? channel.user_limit ?? "Unlimited" : null], ["Voice region", voice ? channel.rtcRegion ?? "Automatic" : null], ["Video quality", voice ? channel.videoQualityMode === 2 ? "720p" : "Automatic" : null], ["Default archive duration", channel.defaultAutoArchiveDuration ? duration(channel.defaultAutoArchiveDuration * 60) : null], ["Post slowmode", forum ? duration(channel.defaultThreadRateLimitPerUser ?? 0) : null], ["Post sort order", forum ? channel.defaultSortOrder === 1 ? "Creation date" : "Latest activity" : null], ["Forum layout", forum ? ["Default", "List", "Gallery"][channel.defaultForumLayout ?? 0] : null], ["Tag required", forum ? (channel.flags ?? 0) & 16 ? "Yes" : "No" : null], ["Default reaction", channel.defaultReactionEmoji?.emojiName ?? channel.defaultReactionEmoji?.emojiId]];
  return BdApi.React.createElement("section", {
    className: `shc-lockscreen ${modules.chatClass ?? ""}`,
    "aria-label": "Hidden channel information"
  }, BdApi.React.createElement("div", {
    className: "shc-card"
  }, BdApi.React.createElement(HiddenChannelIcon, {
    icon: settings.hiddenChannelIcon
  }), BdApi.React.createElement("h1", null, "#", channel.name), BdApi.React.createElement("p", null, "This is a hidden ", typeName, " channel. You do not have permission to view its contents", voice ? " or join it" : "", "."), channel.topic && BdApi.React.createElement("div", {
    className: "shc-topic"
  }, BdApi.React.createElement("h2", null, forum ? "Guidelines" : "Topic"), BdApi.React.createElement("p", null, channel.topic)), BdApi.React.createElement("dl", {
    className: "shc-details"
  }, details.filter(([, value]) => value !== null && value !== undefined).map(([label, value]) => BdApi.React.createElement(BdApi.React.Fragment, {
    key: label
  }, BdApi.React.createElement("dt", null, label), BdApi.React.createElement("dd", null, value)))), !!channel.availableTags?.length && BdApi.React.createElement("div", null, BdApi.React.createElement("h2", null, "Available tags"), BdApi.React.createElement("div", {
    className: "shc-pills"
  }, channel.availableTags.map(tag => BdApi.React.createElement("span", {
    className: "shc-pill",
    key: tag.id,
    title: tag.moderated ? "Moderated tag" : undefined
  }, tag.emojiName, " ", tag.name, tag.moderated && " 🔒")))), settings.showPerms && BdApi.React.createElement("div", {
    className: "shc-permissions"
  }, BdApi.React.createElement("h2", null, "Roles with access"), BdApi.React.createElement("p", {
    className: "shc-note"
  }, "Each role is evaluated with @everyone and channel overrides. Multiple roles can change a member\u2019s access."), BdApi.React.createElement("div", {
    className: "shc-pills"
  }, allowedRoles.length ? allowedRoles.map(role => BdApi.React.createElement("span", {
    key: role.id,
    className: "shc-pill",
    style: {
      color: roleColor(role)
    },
    title: bits(role.permissions) & ADMINISTRATOR ? "Administrator" : role.id
  }, role.name, !!(bits(role.permissions) & ADMINISTRATOR) && " · Admin")) : BdApi.React.createElement("span", null, "No matching roles in the local data.")), BdApi.React.createElement("h2", null, "Members with access"), ownerId && BdApi.React.createElement("p", null, "Server owner: ", userName(ownerId)), BdApi.React.createElement("div", {
    className: "shc-pills"
  }, members.length ? members.map(({
    rule,
    known
  }) => BdApi.React.createElement("span", {
    key: rule.id,
    className: "shc-pill",
    title: rule.id
  }, userName(rule.id), !known && " · Explicit allow")) : BdApi.React.createElement("span", null, "No matching member overrides.")), BdApi.React.createElement("p", {
    className: "shc-note"
  }, "Only locally available members and overrides are shown. Member details are never fetched."), BdApi.React.createElement("details", null, BdApi.React.createElement("summary", null, "Permission overrides (", rules.length, ")"), BdApi.React.createElement("div", {
    className: "shc-table-wrap"
  }, BdApi.React.createElement("table", null, BdApi.React.createElement("thead", null, BdApi.React.createElement("tr", null, BdApi.React.createElement("th", null, "Role or member"), BdApi.React.createElement("th", null, "View channel"), BdApi.React.createElement("th", null, "Allow bits"), BdApi.React.createElement("th", null, "Deny bits"))), BdApi.React.createElement("tbody", null, rules.map(rule => BdApi.React.createElement("tr", {
    key: rule.id
  }, BdApi.React.createElement("td", null, rule.type === 0 ? roles[rule.id]?.name ?? rule.id : userName(rule.id)), BdApi.React.createElement("td", null, bits(rule.allow) & VIEW_CHANNEL ? "Allow" : bits(rule.deny) & VIEW_CHANNEL ? "Deny" : "Inherit"), BdApi.React.createElement("td", null, bits(rule.allow).toString()), BdApi.React.createElement("td", null, bits(rule.deny).toString())))))))), BdApi.React.createElement("p", {
    className: "shc-note"
  }, "Channel information is limited to data Discord has already sent to your client.")));
}
;// ./src/config.json
const config_namespaceObject = /*#__PURE__*/JSON.parse('{"UU":"ShowHiddenChannels","rE":"2.1.0"}');
;// ./src/styles.ts
/*
 * BetterDiscordPlugins
 * Copyright (c) 2026 ItzFlibat
 * SPDX-License-Identifier: GPL-3.0-only
 */

/* harmony default export */ const styles = (`
.shc-lockscreen { flex: 1; min-width: 0; overflow: auto; color: var(--text-normal); background: var(--background-primary); }
.shc-card { box-sizing: border-box; max-width: 850px; margin: 0 auto; padding: 40px 28px; }
.shc-card > .shc-icon { width: 64px; height: 64px; color: var(--text-muted); }
.shc-card h1 { color: var(--header-primary); font-size: 28px; font-weight: 700; margin: 16px 0; overflow-wrap: anywhere; }
.shc-card h2 { color: var(--header-primary); font-size: 17px; font-weight: 600; margin: 20px 0 10px; }
.shc-card p { line-height: 1.5; margin: 8px 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.shc-topic, .shc-permissions { background: var(--background-secondary); padding: 4px 20px 16px; margin: 20px 0; border-radius: 8px; }
.shc-details { display: grid; grid-template-columns: minmax(120px, 1fr) minmax(0, 2fr); gap: 12px; margin: 24px 0; }
.shc-details dt { color: var(--text-muted); }
.shc-details dd { margin: 0; overflow-wrap: anywhere; user-select: text; }
.shc-note { color: var(--text-muted); font-size: 13px; }
.shc-pills { display: flex; flex-wrap: wrap; gap: 8px; }
.shc-pill { border: 1px solid var(--background-modifier-accent); border-radius: 14px; padding: 4px 10px; font-size: 13px; overflow-wrap: anywhere; }
.shc-card summary { cursor: pointer; margin: 16px 0; }
.shc-table-wrap { overflow-x: auto; }
.shc-card table { width: 100%; border-collapse: collapse; font-size: 13px; }
.shc-card th, .shc-card td { text-align: left; padding: 8px; border-bottom: 1px solid var(--background-modifier-accent); }
.shc-hidden-channel { position: relative; }
.shc-hidden-channel > .shc-indicator { pointer-events: none; position: absolute; right: 8px; top: 50%; transform: translateY(-50%); display: flex; color: var(--text-muted); }
.shc-hidden-channel.shc-muted { opacity: .6; }
.shc-hidden-channel.shc-with-icon { padding-right: 28px; }
.shc-hidden-channel [class*="actionIcon"], .shc-hidden-channel [class*="iconItem"] { display: none; }
@media (max-width: 500px) { .shc-card { padding: 24px 16px; } .shc-details { grid-template-columns: 1fr; gap: 6px; } .shc-details dd { margin-bottom: 8px; } }
`);
;// ./src/utils/channelList.ts
/*
 * BetterDiscordPlugins
 * Copyright (c) 2026 ItzFlibat
 * SPDX-License-Identifier: GPL-3.0-only
 */

function copy(value) {
  return Object.assign(Object.create(Object.getPrototypeOf(value)), value);
}
function transformChannelList(source, settings, isHidden, extraId) {
  const result = copy(source);
  const list = result.guildChannels = copy(source.guildChannels);
  list.categories = {
    ...list.categories
  };
  list.collapsedCategoryIds = {
    ...list.collapsedCategoryIds
  };
  const categories = [];
  function cloneCategory(category) {
    const clone = copy(category);
    clone.channels = Object.fromEntries(Object.entries(category.channels).map(([id, row]) => [id, {
      ...copy(row),
      category: clone
    }]));
    clone.shownChannelIds = [...category.shownChannelIds];
    clone.hiddenChannelIds = category.hiddenChannelIds && [...category.hiddenChannelIds];
    if (settings.shouldShowEmptyCategory) clone.shouldShowEmptyCategory = () => true;
    categories.push(clone);
    return clone;
  }
  for (const [id, category] of Object.entries(list.categories)) list.categories[id] = cloneCategory(category);
  for (const key of ["favoritesCategory", "recentsCategory", "noParentCategory", "voiceChannelsCategory"]) {
    if (list[key]) list[key] = cloneCategory(list[key]);
  }
  if (settings.sort === "bottom") {
    for (const category of categories) {
      category.shownChannelIds.sort((a, b) => Number(isHidden(category.channels[a].record)) - Number(isHidden(category.channels[b].record)));
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
        extra.channels[id] = {
          ...row,
          record,
          category: extra
        };
        delete category.channels[id];
      }
      category.shownChannelIds = category.shownChannelIds.filter(id => id in category.channels);
      category.hiddenChannelIds = category.hiddenChannelIds?.filter(id => id in category.channels);
    }
    const ordered = Object.values(extra.channels).sort((a, b) => Number(!!a.record.isGuildVocal?.()) - Number(!!b.record.isGuildVocal?.()) || a.record.position - b.record.position || a.id.localeCompare(b.id));
    extra.shownChannelIds = extra.isCollapsed || list.collapsedCategoryIds[extraId] ? [] : ordered.map(row => row.id);
    extra.hiddenChannelIds = [];
  }
  return result;
}
;// ./src/utils/modules.ts
/*
 * BetterDiscordPlugins
 * Copyright (c) 2026 ItzFlibat
 * SPDX-License-Identifier: GPL-3.0-only
 */

function findFunction(...strings) {
  const filter = value => typeof value === "function" && strings.every(search => typeof search === "string" ? String(value).includes(search) : search.test(String(value)));
  const [object, key] = BdApi.Webpack.getWithKey(filter, {
    searchExports: true
  }) ?? [];
  return object && key ? {
    object,
    key
  } : undefined;
}
function loadModules() {
  const {
    Webpack
  } = BdApi;
  const ChannelStore = Webpack.getStore("ChannelStore");
  const PermissionStore = Webpack.getStore("PermissionStore") ?? Webpack.getByKeys("getChannelPermissions");
  const ChannelListStore = Webpack.getStore("ChannelListStore");
  const GuildStore = Webpack.getStore("GuildStore");
  const MessageActions = Webpack.getByKeys("fetchMessages", "jumpToMessage");
  const ChannelRecord = Webpack.getModule(value => typeof value === "function" && typeof value.prototype?.isHidden === "function", {
    searchExports: true
  });
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
  }).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length || !Route) return {
    missing
  };
  let ChannelItem = findFunction(".ALL_MESSAGES");
  const itemModule = Webpack.getBySource?.(".iconContainerWithGuildIcon,");
  const itemRenderer = Object.values(itemModule ?? {}).find(value => typeof value?.render === "function" && String(value.render).includes(".ALL_MESSAGES"));
  if (itemRenderer) ChannelItem = {
    object: itemRenderer,
    key: "render"
  };
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
function refreshChannels(modules) {
  const graph = modules.Dispatcher?._actionHandlers?._dependencyGraph;
  for (const store of [modules.PermissionStore, modules.ChannelListStore]) {
    const node = Object.values(graph?.nodes ?? {}).find(value => value.name === (store === modules.PermissionStore ? "PermissionStore" : "ChannelListStore"));
    node?.actionHandler?.CONNECTION_OPEN?.();
    store.emitChange?.();
  }
  const element = modules.containerClass && document.querySelector(`.${modules.containerClass}`);
  if (element) BdApi.ReactUtils.getOwnerInstance(element)?.forceUpdate?.();
}
;// ./src/index.ts
/*
 * BetterDiscordPlugins
 * Copyright (c) 2026 ItzFlibat
 * SPDX-License-Identifier: GPL-3.0-only
 */









class ShowHiddenChannels {
  api = new BdApi(config_namespaceObject.UU);
  settings = loadSettings(this.api.Data.load("settings"));
  cleanups = [];
  started = false;
  dependencyAttempts = 0;
  start() {
    if (this.started) return;
    const library = window.YACBDP;
    if (!library?.requirePlugin?.(config_namespaceObject.UU)) {
      if (this.dependencyAttempts++ < 20) {
        this.dependencyTimer = setTimeout(() => {
          if (this.api.Plugins.isEnabled(config_namespaceObject.UU)) this.start();
        }, 500);
      } else {
        this.api.UI.showToast("ShowHiddenChannels requires the enabled YACBDP plugin.", {
          type: "error"
        });
      }
      return;
    }
    this.dependencyAttempts = 0;
    let loaded;
    try {
      loaded = loadModules();
    } catch (error) {
      this.api.Logger.error("Could not discover Discord modules.", error);
      this.api.UI.showToast("ShowHiddenChannels could not discover Discord modules. See the console for details.", {
        type: "error"
      });
      return;
    }
    const {
      modules,
      missing
    } = loaded;
    if (!modules) {
      this.api.Logger.error("Could not start. Missing Discord modules:", missing);
      this.api.UI.showToast("ShowHiddenChannels could not start. A Discord update may require a plugin update. See the console for details.", {
        type: "error"
      });
      return;
    }
    this.modules = modules;
    this.originalCan = modules.PermissionStore.can.bind(modules.PermissionStore);
    try {
      this.patchMessages(modules);
      this.patchRoute(modules);
      this.patchPermissions(modules);
      this.patchReadState(modules);
      this.patchChannelList(modules);
      this.patchChannelItem(modules);
      this.patchContextMenus(modules);
      this.api.DOM.addStyle(styles);
      this.started = true;
      refreshChannels(modules);
      if (this.settings.debugMode) this.api.Logger.info("Started", {
        version: config_namespaceObject.rE,
        channelItem: !!modules.ChannelItem,
        channelIcon: !!modules.ChannelIcon
      });
    } catch (error) {
      this.stop();
      this.api.Logger.error("Could not start ShowHiddenChannels.", error);
      this.api.UI.showToast("ShowHiddenChannels could not start. Its changes have been removed.", {
        type: "error"
      });
    }
  }
  stop() {
    if (this.dependencyTimer) clearTimeout(this.dependencyTimer);
    this.dependencyAttempts = 0;
    this.api.Patcher.unpatchAll();
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    this.api.DOM.removeStyle();
    this.started = false;
    if (this.modules) {
      try {
        refreshChannels(this.modules);
      } catch (error) {
        this.api.Logger.warn("Could not refresh the channel list after stopping.", error);
      }
    }
    this.modules = undefined;
    this.originalCan = undefined;
  }
  isHidden(channel) {
    return !!(channel?.guild_id && channelTypes[channel.type] && !channel.id.endsWith("_hidden") && this.originalCan && !this.originalCan(VIEW_CHANNEL, channel));
  }
  shouldShow(channel) {
    return !!(channel && this.isHidden(channel) && !this.settings.blacklistedGuilds[channel.guild_id] && this.settings.channels[channelTypes[channel.type]]);
  }
  patchPermissions(modules) {
    this.api.Patcher.instead(modules.ChannelRecord.prototype, "isHidden", (channel, _args, original) => channel.guild_id && channelTypes[channel.type] ? this.isHidden(channel) : original());
    this.api.Patcher.after(modules.PermissionStore, "can", (_instance, [permission, channel], result) => {
      if (!this.isHidden(channel)) return result;
      if (permission === CONNECT) return false;
      return permission === VIEW_CHANNEL && this.shouldShow(channel) ? true : result;
    });
  }
  patchMessages(modules) {
    for (const key of ["fetchMessages", "fetchMessagesAround", "fetchMessage", "fetchPins", "fetchPinnedMessages", "jumpToMessage", "sendMessage", "_sendMessage"]) {
      if (typeof modules.MessageActions[key] !== "function") continue;
      this.api.Patcher.instead(modules.MessageActions, key, (_instance, args, original) => {
        const id = typeof args[0] === "string" ? args[0] : args[0]?.channelId ?? args[0]?.channel_id;
        return this.isHidden(modules.ChannelStore.getChannel(id)) ? Promise.resolve() : original(...args);
      });
    }
  }
  patchRoute(modules) {
    this.api.Patcher.after(modules.Route.object, modules.Route.key, (_instance, _args, result) => {
      const params = result?.props?.computedMatch?.params ?? result?.props?.match?.params;
      const channel = params?.channelId && modules.ChannelStore.getChannel(params.channelId);
      if (!this.shouldShow(channel) || channel.id === modules.SelectedChannelStore?.getVoiceChannelId()) return result;
      return BdApi.React.cloneElement(result, {
        render: () => BdApi.React.createElement(Lockscreen, {
          channel,
          modules,
          settings: this.settings
        })
      });
    });
  }
  patchReadState(modules) {
    const store = modules.ReadStateStore;
    if (!store) return;
    for (const key of ["getGuildChannelUnreadState", "getMentionCount", "getUnreadCount", "hasTrackedUnread", "hasUnread", "hasUnreadPins"]) {
      if (typeof store[key] !== "function") continue;
      this.api.Patcher.after(store, key, (_instance, [value], result) => {
        const channel = typeof value === "string" ? modules.ChannelStore.getChannel(value) : value;
        if (!this.settings.hideUnreads || !this.shouldShow(channel)) return result;
        if (key === "getGuildChannelUnreadState") return {
          ...result,
          mentionCount: 0,
          unread: false
        };
        return key.startsWith("get") ? 0 : false;
      });
    }
  }
  extraCategory(modules, guildId, channels) {
    if (this.settings.sort !== "extra" || this.settings.blacklistedGuilds[guildId] || !Object.values(channels).some(channel => channel.type !== 4 && this.shouldShow(channel))) return;
    const position = Math.max(0, ...Object.values(channels).filter(channel => channel.type === 4).map(channel => channel.position ?? 0)) + 1;
    return new modules.ChannelRecord({
      id: `${guildId}_hidden`,
      guild_id: guildId,
      name: "Hidden Channels",
      type: 4,
      position
    });
  }
  patchChannelList(modules) {
    this.api.Patcher.after(modules.ChannelStore, "getChannel", (_instance, [id], result) => {
      if (typeof id !== "string" || !id.endsWith("_hidden")) return result;
      const guildId = id.slice(0, -7);
      return this.extraCategory(modules, guildId, modules.ChannelStore.getMutableGuildChannelsForGuild(guildId)) ?? result;
    });
    this.api.Patcher.after(modules.ChannelStore, "getMutableGuildChannelsForGuild", (_instance, [guildId], result) => {
      if (!result) return result;
      const extra = this.extraCategory(modules, guildId, result);
      return extra ? {
        ...result,
        [extra.id]: extra
      } : result;
    });
    if (modules.GuildChannelStore?.getChannels) {
      this.api.Patcher.after(modules.GuildChannelStore, "getChannels", (_instance, [guildId], result) => {
        if (!result) return result;
        const extra = this.extraCategory(modules, guildId, modules.ChannelStore.getMutableGuildChannelsForGuild(guildId));
        if (!extra) return result;
        return {
          ...result,
          4: [...(result[4] ?? []).filter(row => row.channel.id !== extra.id), {
            channel: extra,
            comparator: extra.position
          }]
        };
      });
    }
    this.api.Patcher.after(modules.ChannelListStore, "getGuild", (_instance, [guildId], result) => {
      if (!result?.guildChannels || this.settings.blacklistedGuilds[guildId]) return result;
      if (this.settings.sort === "native" && !this.settings.shouldShowEmptyCategory) return result;
      const transformed = transformChannelList(result, this.settings, channel => channel.type !== 4 && this.shouldShow(channel), `${guildId}_hidden`);
      const extra = transformed.guildChannels.categories[`${guildId}_hidden`];
      if (extra && modules.CategoryStore?.isCollapsed(extra.id)) {
        extra.isCollapsed = true;
        extra.shownChannelIds = [];
      }
      return transformed;
    });
  }
  patchChannelItem(modules) {
    if (modules.ChannelIcon) {
      this.api.Patcher.before(modules.ChannelIcon.object, modules.ChannelIcon.key, (_instance, args) => {
        if (this.shouldShow(args[0]) && args[2]?.locked) args[2] = {
          ...args[2],
          locked: false
        };
      });
    }
    if (!modules.ChannelItem) {
      this.api.Logger.warn("Channel icons and voice channel navigation are unavailable on this Discord build.");
      this.api.UI.showToast("ShowHiddenChannels: channel styling is unavailable on this Discord build. Use the channel context menu to inspect hidden channels.", {
        type: "warning"
      });
      return;
    }
    this.api.Patcher.after(modules.ChannelItem.object, modules.ChannelItem.key, (_instance, [props], result) => {
      const channel = props?.channel;
      if (!channel || !this.shouldShow(channel)) return result;
      const vocal = channel.type === 2 || channel.type === 13;
      const connected = channel.id === modules.SelectedChannelStore?.getVoiceChannelId();
      let decorated = false;
      const visit = (node, root) => {
        if (Array.isArray(node)) return node.map(child => visit(child, false));
        if (!BdApi.React.isValidElement(node)) return node;
        const next = {};
        const interactive = typeof node.type === "string" && (node.props.role === "link" || node.type === "a" || typeof node.props.onClick === "function" && node.props.className?.includes("link"));
        if (vocal && !connected && interactive) {
          next.onClick = event => {
            event.preventDefault();
            event.stopPropagation();
            this.showChannel(channel);
          };
          next.onMouseDown = undefined;
          next.onMouseUp = undefined;
          next.onDoubleClick = undefined;
          next.onKeyDown = event => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              this.showChannel(channel);
            }
          };
          next.href = undefined;
        }
        const wrapper = !decorated && typeof node.type === "string" && (root || node.props.className?.includes("wrapper"));
        if (wrapper) {
          decorated = true;
          next.className = [node.props.className, "shc-hidden-channel", this.settings.mutedStyle && "shc-muted", this.settings.hiddenChannelIcon !== "none" && "shc-with-icon"].filter(Boolean).join(" ");
          if (vocal && !connected) {
            next.onMouseDown = undefined;
            next.onMouseUp = undefined;
            next.onDoubleClick = undefined;
          }
        }
        const children = visit(node.props.children, false);
        next.children = wrapper && this.settings.hiddenChannelIcon !== "none" ? [children, BdApi.React.createElement("span", {
          key: "shc-indicator",
          className: "shc-indicator"
        }, BdApi.React.createElement(HiddenChannelIcon, {
          icon: this.settings.hiddenChannelIcon
        }))] : children;
        return BdApi.React.cloneElement(node, next);
      };
      return visit(result, true);
    });
  }
  showChannel(channel) {
    if (!this.modules) return;
    this.api.UI.alert("Hidden channel information", BdApi.React.createElement(Lockscreen, {
      channel,
      modules: this.modules,
      settings: this.settings
    }));
  }
  patchContextMenus(modules) {
    this.cleanups.push(this.api.ContextMenu.patch("guild-context", (menu, {
      guild
    }) => {
      if (!guild || !menu?.props) return;
      const item = this.api.ContextMenu.buildItem({
        id: "shc-toggle",
        type: "toggle",
        label: "Show hidden channels",
        checked: !this.settings.blacklistedGuilds[guild.id],
        action: () => {
          this.settings.blacklistedGuilds[guild.id] = !this.settings.blacklistedGuilds[guild.id];
          this.saveSettings();
        }
      });
      menu.props.children = [...BdApi.React.Children.toArray(menu.props.children), item];
    }));
    this.cleanups.push(this.api.ContextMenu.patch("channel-context", (menu, {
      channel
    }) => {
      if (!channel || !this.shouldShow(channel) || !menu?.props) return;
      const items = this.api.ContextMenu.buildItem({
        type: "group",
        items: [{
          id: "shc-info",
          label: "Hidden channel information",
          action: () => this.showChannel(channel)
        }, {
          id: "shc-copy",
          label: "Copy channel details",
          action: () => {
            const guild = modules.GuildStore.getGuild(channel.guild_id);
            BdApi.Utils.copyText(`${guild?.name ?? channel.guild_id} / #${channel.name}\nChannel ID: ${channel.id}\n${channel.topic ?? ""}`.trim());
          }
        }]
      });
      menu.props.children = [...BdApi.React.Children.toArray(menu.props.children), items];
    }));
  }
  saveSettings() {
    this.settings = loadSettings(this.settings);
    this.api.Data.save("settings", this.settings);
    if (this.modules) refreshChannels(this.modules);
  }
  getSettingsPanel() {
    const select = (id, name, note, options) => ({
      type: "dropdown",
      id,
      name,
      note,
      value: this.settings[id],
      options: options.map(([label, value]) => ({
        label,
        value
      }))
    });
    const toggle = (id, name, note) => ({
      type: "switch",
      id,
      name,
      note,
      value: this.settings[id]
    });
    const guilds = this.modules?.GuildStore.getGuilds() ?? BdApi.Webpack.getStore("GuildStore")?.getGuilds() ?? {};
    const categories = [{
      type: "category",
      id: "general",
      name: "Appearance and information",
      collapsible: true,
      shown: true,
      settings: [select("hiddenChannelIcon", "Hidden channel icon", "Choose the indicator shown beside hidden channels.", [["Lock", "lock"], ["Hidden eye", "eye"], ["None", "none"]]), select("sort", "Channel order", "Choose where hidden channels appear.", [["Discord order", "native"], ["Bottom of each category", "bottom"], ["Separate Hidden Channels category", "extra"]]), toggle("mutedStyle", "Muted appearance", "Dim hidden channels in the channel list."), toggle("hideUnreads", "Hide unread indicators", "Suppress unread counts and mentions for displayed hidden channels."), toggle("shouldShowEmptyCategory", "Show empty categories", "Keep empty categories visible."), toggle("showPerms", "Show permissions", "Show roles, known members and permission overrides."), select("showAdmin", "Administrator roles", "Choose which administrator roles appear in channel information.", [["Channel overrides only", "channel"], ["All administrators", "always"], ["Exclude bot administrators", "exclude"], ["None", "never"]]), toggle("showLastMessage", "Last message timestamp", "Show the timestamp only when its ID is already available."), toggle("debugMode", "Debug logging", "Log module availability when the plugin starts.")]
    }, {
      type: "category",
      id: "channels",
      name: "Channel types",
      collapsible: true,
      shown: false,
      settings: Object.values(channelTypes).map(id => ({
        type: "switch",
        id,
        name: id.replace("GUILD_", "").toLowerCase().replace(/_/g, " ").replace(/^./, letter => letter.toUpperCase()),
        value: this.settings.channels[id]
      }))
    }, {
      type: "category",
      id: "blacklistedGuilds",
      name: "Excluded servers",
      collapsible: true,
      shown: false,
      settings: Object.values(guilds).sort((a, b) => a.name.localeCompare(b.name)).map(guild => ({
        type: "switch",
        id: guild.id,
        name: guild.name,
        note: "Hide hidden channels in this server.",
        value: !!this.settings.blacklistedGuilds[guild.id]
      }))
    }];
    const onChange = (category, id, value) => {
      if (category === "channels" || category === "blacklistedGuilds") this.settings[category][id] = !!value;else this.settings = loadSettings({
        ...this.settings,
        [id]: value
      });
      this.saveSettings();
    };
    const library = window.YACBDP;
    return library?.buildSettingsPanel ? library.buildSettingsPanel(config_namespaceObject.UU, categories, onChange) : this.api.UI.buildSettingsPanel({
      settings: categories,
      onChange
    });
  }
}
module.exports = __webpack_exports__["default"];
/******/ })()
;