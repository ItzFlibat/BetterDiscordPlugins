const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const test = require("node:test");
const ts = require("typescript");

function source(file) {
    const filename = path.resolve(__dirname, "../src", file);
    const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS }
    }).outputText;
    const mod = new Module(filename, module);
    mod.filename = filename;
    mod.paths = module.paths;
    const originalRequire = mod.require.bind(mod);
    mod.require = id =>
        id.startsWith(".")
            ? source(path.relative(path.resolve(__dirname, "../src"), path.resolve(path.dirname(filename), `${id}.ts`)))
            : originalRequire(id);
    mod._compile(compiled, filename);
    return mod.exports;
}

const { loadSettings } = source("settings.ts");
const { roleCanView, memberCanView, VIEW_CHANNEL: VIEW, ADMINISTRATOR: ADMIN, CONNECT } = source("utils/permissions.ts");
const { transformChannelList } = source("utils/channelList.ts");
const { snowflakeDate } = source("utils/date.ts");

function environment({ missing = "", saved, failPatch = false } = {}) {
    const undo = [];
    const menus = new Map();
    const state = { styles: 0, messageRequests: 0, logs: [], toasts: [], refreshes: 0, alerts: [] };
    class Channel {
        constructor(data) {
            Object.assign(this, data);
        }
        isHidden() {
            return false;
        }
        isGuildVocal() {
            return [2, 13].includes(this.type);
        }
    }
    const channels = {
        visible: new Channel({
            id: "visible",
            guild_id: "guild",
            name: "Visible",
            type: 0,
            position: 0,
            parent_id: "category",
            accessible: true
        }),
        hidden: new Channel({
            id: "hidden",
            guild_id: "guild",
            name: "Hidden",
            type: 0,
            position: 1,
            parent_id: "category",
            accessible: false
        }),
        voice: new Channel({
            id: "voice",
            guild_id: "guild",
            name: "Voice",
            type: 2,
            position: 2,
            parent_id: "category",
            accessible: false
        }),
        category: new Channel({ id: "category", guild_id: "guild", name: "Category", type: 4, position: 0, accessible: true }),
        dm: new Channel({ id: "dm", name: "DM", type: 1, accessible: true })
    };
    const permissionStore = {
        can: (permission, channel) => (permission === VIEW ? !!channel?.accessible : true),
        emitChange: () => state.refreshes++
    };
    const channelStore = { getChannel: id => channels[id], getMutableGuildChannelsForGuild: () => channels };
    const listStore = {
        getGuild: () => ({ guildChannels: { categories: {}, collapsedCategoryIds: {} } }),
        emitChange: () => state.refreshes++
    };
    const guildStore = { getGuild: id => ({ id, name: "Guild" }), getGuilds: () => ({ guild: { id: "guild", name: "Guild" } }) };
    const reads = {
        getGuildChannelUnreadState: () => ({ mentionCount: 3, unread: true, extra: true }),
        getMentionCount: () => 3,
        getUnreadCount: () => 5,
        hasUnread: () => true
    };
    const actions = {
        fetchMessages: (...args) => {
            state.messageRequests++;
            return Promise.resolve(args);
        },
        jumpToMessage: () => {
            state.messageRequests++;
        },
        _sendMessage: () => {
            state.messageRequests++;
        }
    };
    const React = {
        createElement: (type, props, ...children) => ({
            type,
            props: { ...props, children: children.length === 1 ? children[0] : children }
        }),
        cloneElement: (element, props) => ({ ...element, props: { ...element.props, ...props } }),
        isValidElement: value => !!value?.props && !!value?.type,
        Children: { toArray: value => (value == null ? [] : Array.isArray(value) ? value : [value]) }
    };
    const routeElement = React.createElement("route", { computedMatch: { params: { guildId: "guild", channelId: "hidden" } } });
    const route = {
        render: () => {
            const marker = ".ImpressionTypes.PAGE,name:route,";
            void marker;
            return routeElement;
        }
    };
    const item = {
        render: props => {
            const marker = ".ALL_MESSAGES";
            void marker;
            return React.createElement(
                "div",
                { className: "wrapper", children: [] },
                React.createElement("a", { className: "link", onClick: props.onClick })
            );
        }
    };
    const stores = {
        ChannelStore: channelStore,
        PermissionStore: permissionStore,
        ChannelListStore: listStore,
        GuildStore: guildStore,
        ReadStateStore: reads,
        SelectedChannelStore: { getVoiceChannelId: () => undefined }
    };
    const originals = {
        can: permissionStore.can,
        fetchMessages: actions.fetchMessages,
        isHidden: Channel.prototype.isHidden,
        route: route.render,
        item: item.render
    };
    const api = {
        Data: {
            load: () => saved,
            save: (_key, value) => {
                state.saved = value;
            }
        },
        Patcher: {
            unpatchAll: () => {
                for (const restore of undo.splice(0).reverse()) restore();
            },
            instead: (object, key, callback) => patch("instead", object, key, callback),
            after: (object, key, callback) => patch("after", object, key, callback),
            before: (object, key, callback) => patch("before", object, key, callback)
        },
        DOM: {
            addStyle: () => state.styles++,
            removeStyle: () => {
                state.styles = 0;
            }
        },
        Logger: {
            error: (...args) => state.logs.push(args),
            warn: (...args) => state.logs.push(args),
            info: (...args) => state.logs.push(args)
        },
        UI: {
            showToast: (...args) => state.toasts.push(args),
            alert: (...args) => state.alerts.push(args),
            buildSettingsPanel: props => props
        },
        ContextMenu: {
            patch: (id, fn) => {
                menus.set(id, fn);
                return () => menus.delete(id);
            },
            buildItem: props => React.createElement("menuitem", props)
        }
    };
    function patch(kind, object, key, callback) {
        if (failPatch && key === "can") throw new Error("Mock patch failure");
        const original = object[key];
        object[key] = function (...args) {
            if (kind === "before") callback(this, args);
            if (kind === "instead") return callback(this, args, original.bind(this));
            const result = original.apply(this, args);
            if (kind === "after") return callback(this, args, result) ?? result;
            return result;
        };
        undo.push(() => {
            object[key] = original;
        });
    }
    function BdApi() {
        return api;
    }
    Object.assign(BdApi, {
        React,
        ReactUtils: { getOwnerInstance: () => undefined },
        Utils: {
            copyText: value => {
                state.copied = value;
            }
        },
        Webpack: {
            getStore: name => (name === missing ? undefined : stores[name]),
            getByKeys: (...keys) => (keys.includes("fetchMessages") ? (missing === "MessageActions" ? undefined : actions) : undefined),
            getModule: () => (missing === "ChannelRecord" ? undefined : Channel),
            getWithKey: filter => {
                if (missing !== "Route" && filter(route.render)) return [route, "render"];
                if (missing !== "ChannelItem" && filter(item.render)) return [item, "render"];
                return [];
            },
            getBySource: () => undefined
        }
    });
    global.BdApi = BdApi;
    global.document = { querySelector: () => null };
    delete require.cache[require.resolve("../ShowHiddenChannels.plugin.js")];
    const Plugin = require("../ShowHiddenChannels.plugin.js");
    const plugin = new Plugin();
    return { plugin, state, channels, permissionStore, actions, route, item, reads, menus, originals, api };
}

test("settings migrate old unread/icon/admin values and merge nested defaults", () => {
    const settings = loadSettings({
        MarkUnread: true,
        hiddenChannelIcon: false,
        showAdmin: "include",
        channels: { GUILD_TEXT: false },
        sort: "bottom"
    });
    assert.equal(settings.hideUnreads, false);
    assert.equal(settings.hiddenChannelIcon, "none");
    assert.equal(settings.showAdmin, "always");
    assert.equal(settings.channels.GUILD_TEXT, false);
    assert.equal(settings.channels.GUILD_MEDIA, true);
    assert.equal(settings.sort, "bottom");
    assert.equal(loadSettings({ sort: "invalid", showPerms: "false" }).showPerms, true);
    const one = loadSettings(null);
    one.channels.GUILD_TEXT = false;
    assert.equal(loadSettings(null).channels.GUILD_TEXT, true);
});

test("role permission precedence applies everyone then the specific role", () => {
    const roles = {
        guild: { id: "guild", permissions: "1024" },
        role: { id: "role", permissions: 0n },
        admin: { id: "admin", permissions: ADMIN }
    };
    const channel = { permissionOverwrites: { guild: { id: "guild", type: 0, deny: VIEW }, role: { id: "role", type: 0, allow: VIEW } } };
    assert.equal(roleCanView(channel, roles, "guild", "guild"), false);
    assert.equal(roleCanView(channel, roles, "guild", "role"), true);
    assert.equal(roleCanView(channel, roles, "guild", "admin"), true);
    assert.equal(roleCanView(channel, roles, "guild", "deleted"), false);
    channel.permissionOverwrites.role = { id: "role", type: 0, deny: VIEW };
    assert.equal(roleCanView(channel, roles, "guild", "role"), false);
});

test("member permission precedence combines roles and applies the member deny last", () => {
    const roles = { guild: { permissions: 0n }, allow: { permissions: 0n }, deny: { permissions: VIEW } };
    const channel = {
        permission_overwrites: [
            { id: "allow", type: 0, allow: VIEW },
            { id: "deny", type: 0, deny: VIEW },
            { id: "user", type: 1, deny: VIEW }
        ]
    };
    assert.equal(memberCanView(channel, roles, "guild", "user", ["allow", "deny"]), false);
    assert.equal(memberCanView(channel, roles, "guild", "other", ["allow", "deny"]), true);
    assert.equal(memberCanView(channel, roles, "guild", "owner", [], "owner"), true);
});

test("sorting preserves canonical records, prototypes, source arrays and collapsed categories", () => {
    class Category {
        shouldShowEmptyCategory() {
            return false;
        }
    }
    const category = Object.assign(new Category(), {
        id: "category",
        channels: {},
        shownChannelIds: ["h", "v"],
        hiddenChannelIds: [],
        isCollapsed: false
    });
    const extra = Object.assign(new Category(), { id: "guild_hidden", channels: {}, shownChannelIds: [], hiddenChannelIds: [] });
    const hidden = { id: "h", position: 0, parent_id: "category" };
    category.channels = { h: { id: "h", record: hidden, category }, v: { id: "v", record: { id: "v", position: 1 }, category } };
    const original = { guildChannels: { categories: { category, guild_hidden: extra }, collapsedCategoryIds: {} } };
    const bottom = transformChannelList(original, { ...loadSettings(null), sort: "bottom" }, c => c.id === "h", "guild_hidden");
    assert.deepEqual(bottom.guildChannels.categories.category.shownChannelIds, ["v", "h"]);
    assert.deepEqual(category.shownChannelIds, ["h", "v"]);
    const separated = transformChannelList(
        original,
        { ...loadSettings(null), sort: "extra", shouldShowEmptyCategory: true },
        c => c.id === "h",
        "guild_hidden"
    );
    const destination = separated.guildChannels.categories.guild_hidden;
    assert.equal(destination.channels.h.record.parent_id, "guild_hidden");
    assert.equal(hidden.parent_id, "category");
    assert.equal(category.channels.h.record, hidden);
    assert.equal(destination.channels.h.category, destination);
    assert.ok(separated.guildChannels.categories.category instanceof Category);
    assert.equal(separated.guildChannels.categories.category.shouldShowEmptyCategory(), true);
    assert.equal(category.shouldShowEmptyCategory(), false);
    original.guildChannels.collapsedCategoryIds.guild_hidden = true;
    assert.deepEqual(
        transformChannelList(original, { ...loadSettings(null), sort: "extra" }, c => c.id === "h", "guild_hidden").guildChannels.categories
            .guild_hidden.shownChannelIds,
        []
    );
});

test("snowflake dates reject invalid and synthetic IDs", () => {
    assert.equal(snowflakeDate("guild_hidden"), null);
    assert.equal(snowflakeDate("garbage"), null);
    assert.equal(snowflakeDate(undefined), null);
    assert.ok(snowflakeDate("619203349954166804"));
});

test("display permission does not expose messages, voice connections or direct messages", async () => {
    const env = environment();
    env.plugin.start();
    assert.equal(env.permissionStore.can(VIEW, env.channels.hidden), true);
    assert.equal(env.channels.hidden.isHidden(), true);
    assert.equal(env.channels.visible.isHidden(), false);
    assert.equal(env.channels.dm.isHidden(), false);
    assert.equal(env.permissionStore.can(CONNECT, env.channels.voice), false);
    assert.equal(env.permissionStore.can(2048n, env.channels.hidden), true);
    await env.actions.fetchMessages({ channelId: "hidden" });
    env.actions.jumpToMessage({ channelId: "hidden" });
    env.actions._sendMessage("hidden", { content: "blocked" });
    assert.equal(env.state.messageRequests, 0);
    await env.actions.fetchMessages({ channelId: "visible" }, "preserved argument");
    assert.equal(env.state.messageRequests, 1);
    const forwarded = await env.actions.fetchMessages({ channelId: "dm" }, "another argument");
    assert.equal(forwarded[1], "another argument");
    env.plugin.stop();
});

test("excluded servers and disabled types preserve real view permissions", () => {
    for (const saved of [{ blacklistedGuilds: { guild: true } }, { channels: { GUILD_TEXT: false } }]) {
        const env = environment({ saved });
        env.plugin.start();
        assert.equal(env.permissionStore.can(VIEW, env.channels.hidden), false);
        env.plugin.stop();
    }
});

test("unread suppression respects preferences and leaves visible channels alone", () => {
    const env = environment();
    env.plugin.start();
    assert.equal(env.reads.getMentionCount("hidden"), 0);
    assert.equal(env.reads.getMentionCount("visible"), 3);
    assert.deepEqual(env.reads.getGuildChannelUnreadState(env.channels.hidden), { mentionCount: 0, unread: false, extra: true });
    env.plugin.stop();
    const enabled = environment({ saved: { hideUnreads: false } });
    enabled.plugin.start();
    assert.equal(enabled.reads.getMentionCount("hidden"), 3);
    enabled.plugin.stop();
});

test("hidden route renders channel information without changing original React props", () => {
    const env = environment();
    const original = env.originals.route();
    env.plugin.start();
    const rendered = env.route.render();
    assert.notEqual(rendered, original);
    assert.equal(typeof rendered.props.render, "function");
    assert.equal(original.props.render, undefined);
    assert.equal(rendered.props.render().props.channel.id, "hidden");
    env.plugin.stop();
});

test("start and stop restore all patches, styles and menu handlers and allow restart", () => {
    const env = environment();
    env.plugin.start();
    env.plugin.start();
    assert.equal(env.state.styles, 1);
    assert.equal(env.menus.size, 2);
    env.plugin.stop();
    assert.equal(env.permissionStore.can, env.originals.can);
    assert.equal(env.actions.fetchMessages, env.originals.fetchMessages);
    assert.equal(Object.getPrototypeOf(env.channels.hidden).isHidden, env.originals.isHidden);
    assert.equal(env.route.render, env.originals.route);
    assert.equal(env.item.render, env.originals.item);
    assert.equal(env.state.styles, 0);
    assert.equal(env.menus.size, 0);
    env.plugin.start();
    assert.equal(env.permissionStore.can(VIEW, env.channels.hidden), true);
    env.plugin.stop();
});

test("missing critical modules fail without patching or injecting styles", () => {
    for (const missing of ["PermissionStore", "MessageActions", "ChannelRecord", "Route"]) {
        const env = environment({ missing });
        env.plugin.start();
        assert.equal(env.permissionStore.can, env.originals.can, missing);
        assert.equal(env.actions.fetchMessages, env.originals.fetchMessages, missing);
        assert.equal(env.state.styles, 0, missing);
        assert.ok(env.state.toasts.length, missing);
    }
});

test("partial startup failure removes already installed patches", () => {
    const env = environment({ failPatch: true });
    env.plugin.start();
    assert.equal(env.actions.fetchMessages, env.originals.fetchMessages);
    assert.equal(env.route.render, env.originals.route);
    assert.equal(Object.getPrototypeOf(env.channels.hidden).isHidden, env.originals.isHidden);
    assert.equal(env.state.styles, 0);
});

test("settings panel saves changes immediately and server context toggles survive restart", () => {
    const env = environment();
    env.plugin.start();
    const panel = env.plugin.getSettingsPanel();
    panel.onChange("general", "sort", "bottom");
    assert.equal(env.state.saved.sort, "bottom");
    panel.onChange("channels", "GUILD_TEXT", false);
    assert.equal(env.permissionStore.can(VIEW, env.channels.hidden), false);
    const menu = { props: { children: [] } };
    env.menus.get("guild-context")(menu, { guild: { id: "guild" } });
    menu.props.children[0].props.action();
    assert.equal(env.state.saved.blacklistedGuilds.guild, true);
    env.plugin.stop();
    const restarted = environment({ saved: env.state.saved });
    restarted.plugin.start();
    assert.equal(restarted.permissionStore.can(VIEW, restarted.channels.voice), false);
    restarted.plugin.stop();
});

test("synthetic category stays out of canonical channel store", () => {
    const env = environment({ saved: { sort: "extra" } });
    env.plugin.start();
    const store = BdApi.Webpack.getStore("ChannelStore");
    assert.equal(store.getChannel("guild_hidden").type, 4);
    assert.ok(store.getMutableGuildChannelsForGuild("guild").guild_hidden);
    assert.equal(env.channels.guild_hidden, undefined);
    assert.equal(env.channels.hidden.parent_id, "category");
    env.plugin.stop();
    assert.equal(store.getChannel("guild_hidden"), undefined);
});

test("voice rows open information instead of joining and decorate only one wrapper", () => {
    const env = environment();
    env.plugin.start();
    let attempted = false;
    const row = env.item.render({
        channel: env.channels.voice,
        onClick: () => {
            attempted = true;
        }
    });
    assert.ok(row.props.className.includes("shc-hidden-channel"));
    const link = row.props.children[0];
    link.props.onClick({ preventDefault() {}, stopPropagation() {} });
    assert.equal(attempted, false);
    assert.equal(env.state.alerts.length, 1);
    assert.equal(row.props.children[1].props.className, "shc-indicator");
    env.plugin.stop();
});
