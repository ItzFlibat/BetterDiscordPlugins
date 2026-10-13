/**
 * @name BetterDiscordBadges
 * @displayName BetterDiscord Badges
 * @version 1.3.0
 * @author ItzFlibat
 * @authorId 619203349954166804
 * @source https://github.com/ItzFlibat/BetterDiscordPlugins/tree/main/Plugins/BetterDiscordBadges
 * @website https://flibat.com
 * @description Shows client-mod badges from the Alliance badge service on Discord profiles.
 */
/******/ (() => {
    // webpackBootstrap
    /******/ "use strict";
    /******/ // The require scope
    /******/ const __webpack_require__ = {};
    /******/
    /************************************************************************/
    /******/ /* webpack/runtime/define property getters */
    /******/ // define getter/value functions for harmony exports
    /******/ __webpack_require__.d = (exports, definition) => {
        /******/ for (var key in definition) {
            /******/ if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
                /******/ Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
                /******/
            }
            /******/
        }
        /******/
    };
    /******/
    /******/ /* webpack/runtime/hasOwnProperty shorthand */
    /******/ __webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
    /******/
    /************************************************************************/
    let __webpack_exports__ = {};

    // EXPORTS
    __webpack_require__.d(__webpack_exports__, {
        default: () => /* binding */ BetterDiscordBadges
    }); // ./src/config.json

    const config_namespaceObject = { rE: "1.3.0" }; // ./src/index.tsx
    const PLUGIN_NAME = "BetterDiscordBadges";
    const BADGE_ID_PREFIX = "yacbdp-";
    const API_URL = "https://alliance.flibat.com/api/badges/users";
    const REFRESH_INTERVAL = 30 * 60 * 1000;
    const SERVICES = [
        {
            id: "vencord",
            name: "Vencord",
            enabled: true
        },
        {
            id: "equicord",
            name: "Equicord",
            enabled: false
        },
        {
            id: "badgevault",
            name: "BadgeVault",
            enabled: false
        },
        {
            id: "nekocord",
            name: "Nekocord",
            enabled: false
        },
        {
            id: "reviewdb",
            name: "ReviewDB",
            enabled: false
        },
        {
            id: "aero",
            name: "Aero",
            enabled: false
        },
        {
            id: "aliucord",
            name: "Aliucord",
            enabled: false
        },
        {
            id: "raincord",
            name: "Raincord",
            enabled: false
        },
        {
            id: "velocity",
            name: "Velocity",
            enabled: false
        },
        {
            id: "enmity",
            name: "Enmity",
            enabled: false
        },
        {
            id: "paicord",
            name: "Paicord",
            enabled: false
        },
        {
            id: "bunny",
            name: "Bunny",
            enabled: false
        },
        {
            id: "goosemod",
            name: "GooseMod",
            enabled: false
        },
        {
            id: "replugged",
            name: "Replugged",
            enabled: false
        },
        {
            id: "betterdiscord",
            name: "BetterDiscord",
            enabled: true,
            forced: true
        },
        {
            id: "vendroidenhanced",
            name: "Vendroid Enhanced",
            enabled: false
        },
        {
            id: "revenge",
            name: "Revenge",
            enabled: false
        },
        {
            id: "record",
            name: "ReCord",
            enabled: false
        },
        {
            id: "allicord",
            name: "Allicord",
            enabled: true,
            forced: true
        }
    ];
    class BetterDiscordBadges {
        users = {};
        settings = {};
        cache = new Map();
        stopped = false;
        dependencyAttempts = 0;
        getName() {
            return PLUGIN_NAME;
        }
        getAuthor() {
            return "ItzFlibat";
        }
        getVersion() {
            return config_namespaceObject.rE;
        }
        getDescription() {
            return "Shows client-mod badges from the Alliance badge service on Discord profiles.";
        }
        start() {
            const library = window.YACBDP;
            if (!library?.requirePlugin?.(PLUGIN_NAME)) {
                if (this.dependencyAttempts++ < 20) {
                    this.dependencyTimer = setTimeout(() => {
                        if (BdApi.Plugins.isEnabled(PLUGIN_NAME)) this.start();
                    }, 500);
                } else {
                    BdApi.UI.showToast("BetterDiscordBadges requires the enabled YACBDP plugin.", {
                        type: "error"
                    });
                }
                return;
            }
            this.dependencyAttempts = 0;
            library.registerPlugin?.({
                id: PLUGIN_NAME,
                version: config_namespaceObject.rE,
                changelog: [
                    {
                        type: "fixed",
                        title: "Profile badges",
                        items: ["Badges are placed on profiles again after Discord changed its badge component."]
                    },
                    {
                        type: "added",
                        title: "Updates",
                        items: ["Update checks and change notices through YACBDP."]
                    }
                ]
            });
            this.stopped = false;
            const saved = BdApi.Data.load(PLUGIN_NAME, "settings") ?? {};
            this.settings = Object.fromEntries(
                SERVICES.map(service => [service.id, service.forced ? true : (saved[service.id] ?? service.enabled)])
            );
            BdApi.Data.save(PLUGIN_NAME, "settings", this.settings);
            this.tryProfilePatch();
            void this.loadBadges();
            this.interval = setInterval(() => void this.loadBadges(), REFRESH_INTERVAL);
        }
        stop() {
            this.stopped = true;
            if (this.dependencyTimer) clearTimeout(this.dependencyTimer);
            this.lazyAbort?.abort();
            this.dependencyAttempts = 0;
            this.request?.abort();
            if (this.interval) clearInterval(this.interval);
            BdApi.Patcher.unpatchAll(PLUGIN_NAME);
            this.patch = undefined;
        }
        getSettingsPanel() {
            const setting = service => ({
                type: "switch",
                id: service.id,
                name: `Show ${service.name} badges`,
                value: service.forced ? true : this.settings[service.id],
                disabled: Boolean(service.forced)
            });
            const categories = [
                {
                    type: "category",
                    id: "required",
                    name: "Always shown",
                    collapsible: true,
                    shown: true,
                    settings: SERVICES.filter(service => service.forced).map(setting)
                },
                {
                    type: "category",
                    id: "clients",
                    name: "Client badges",
                    collapsible: true,
                    shown: true,
                    settings: SERVICES.filter(service => !service.forced).map(setting)
                }
            ];
            const onChange = (_category, id, value) => {
                const service = SERVICES.find(item => item.id === id);
                if (!service || service.forced) return;
                this.settings[id] = value;
                this.cache.clear();
                BdApi.Data.save(PLUGIN_NAME, "settings", this.settings);
            };
            const library = window.YACBDP;
            return library?.buildSettingsPanel
                ? library.buildSettingsPanel(PLUGIN_NAME, categories, onChange)
                : BdApi.UI.buildSettingsPanel({
                      settings: categories,
                      onChange
                  });
        }
        isBadgeList(value) {
            if (typeof value !== "function") return false;
            try {
                const code = Function.prototype.toString.call(value);
                return (
                    code.includes("UserProfileBadgeListRows") || (code.includes("pendingBadges") && code.includes("showPendingBadgeEdits"))
                );
            } catch {
                return false;
            }
        }
        tryProfilePatch() {
            if (this.stopped || this.patch) return;
            const pair = BdApi.Webpack.getWithKey(value => this.isBadgeList(value), {
                searchExports: true
            });
            if (pair?.[0] && pair[1]) {
                this.applyProfilePatch(pair[0], pair[1]);
                return;
            }
            // Discord only loads the profile badge module the first time a profile renders, so wait for it.
            const wait = BdApi.Webpack.waitForModule ?? BdApi.Webpack.getLazy;
            if (typeof wait !== "function") {
                BdApi.Logger.error(PLUGIN_NAME, "This BetterDiscord version cannot wait for Discord modules. Update BetterDiscord.");
                BdApi.UI.showToast("BetterDiscord Badges needs a newer BetterDiscord version.", {
                    type: "error"
                });
                return;
            }
            this.lazyAbort = new AbortController();
            wait.call(
                BdApi.Webpack,
                exports => exports && typeof exports === "object" && Object.keys(exports).some(key => this.isBadgeList(exports[key])),
                {
                    defaultExport: false,
                    signal: this.lazyAbort.signal
                }
            )
                .then(exports => {
                    if (!exports || this.stopped || this.patch) return;
                    const key = Object.keys(exports).find(name => this.isBadgeList(exports[name]));
                    if (key) this.applyProfilePatch(exports, key);
                })
                .catch(error => BdApi.Logger.warn(PLUGIN_NAME, "Stopped waiting for the profile badge renderer.", error));
        }
        applyProfilePatch(module, key) {
            // The list merges `pendingBadges` into the badges it renders, which lets us add ours without touching its markup.
            this.patch = BdApi.Patcher.before(PLUGIN_NAME, module, key, (_, args) => {
                const props = args[0];
                const userId = props?.displayProfile?.userId;
                if (!userId) return;
                const badges = this.makeBadges(String(userId));
                if (badges.length === 0) return;
                args[0] = {
                    ...props,
                    pendingBadges: [...(props.pendingBadges ?? []), ...badges]
                };
            });
            // Discord appends pending badges after its own, so reorder the rendered rows to put ours first.
            BdApi.Patcher.after(PLUGIN_NAME, module, key, (_, __, result) => this.reorder(result));
        }
        reorder(result) {
            const rows = result?.props?.children;
            if (!Array.isArray(rows)) return result;
            const lists = rows.map(row => row?.props?.badges);
            if (!lists.every(Array.isArray)) return result;
            const all = lists.flat();
            const ours = badge => typeof badge?.id === "string" && badge.id.startsWith(BADGE_ID_PREFIX);
            const allicord = badge => badge.id.startsWith(`${BADGE_ID_PREFIX}allicord-`);
            const sorted = [
                ...all.filter(allicord),
                ...all.filter(badge => ours(badge) && !allicord(badge)),
                ...all.filter(badge => !ours(badge))
            ];
            if (sorted.every((badge, index) => badge === all[index])) return result;
            let offset = 0;
            const children = rows.map((row, index) => {
                const length = lists[index].length;
                const badges = sorted.slice(offset, offset + length);
                offset += length;
                return BdApi.React.cloneElement(row, {
                    badges
                });
            });
            return BdApi.React.cloneElement(result, {}, ...children);
        }
        async loadBadges() {
            this.request?.abort();
            const request = new AbortController();
            this.request = request;
            try {
                const response = await fetch(API_URL, {
                    cache: "no-cache",
                    signal: request.signal
                });
                if (!response.ok) throw new Error(`Badge service returned ${response.status}`);
                const data = await response.json();
                if (!data || typeof data.users !== "object" || Array.isArray(data.users))
                    throw new Error("Badge service returned an invalid response.");
                if (!this.stopped) {
                    this.users = data.users;
                    this.cache.clear();
                }
            } catch (error) {
                if (error?.name !== "AbortError") BdApi.Logger.warn(PLUGIN_NAME, "Unable to refresh profile badges.", error);
            }
        }
        makeBadges(userId) {
            const raw = this.users[userId] ?? [];
            const cacheKey = `${userId}:${raw.length}:${Object.values(this.settings).filter(Boolean).length}`;
            const cached = this.cache.get(userId);
            if (cached?.key === cacheKey) return cached.badges;
            const seen = new Set();
            const badges = raw.flatMap((badge, index) => {
                if (!badge || typeof badge.badge !== "string" || typeof badge.tooltip !== "string") return [];
                if (!this.settings[badge.mod] && badge.mod !== "allicord" && badge.mod !== "betterdiscord") return [];
                let url;
                try {
                    const parsed = new URL(badge.badge, "https://alliance.flibat.com/");
                    if (parsed.protocol !== "https:") return [];
                    url = parsed.href;
                } catch {
                    return [];
                }
                const key = `${badge.mod}:${badge.tooltip}:${url}`;
                if (seen.has(key)) return [];
                seen.add(key);
                return [
                    {
                        id: `${BADGE_ID_PREFIX}${badge.mod}-${index}`,
                        description: badge.tooltip,
                        iconSrc: url
                    }
                ];
            });
            this.cache.set(userId, {
                key: cacheKey,
                badges
            });
            return badges;
        }
    }
    module.exports = __webpack_exports__["default"];
    /******/
})();
