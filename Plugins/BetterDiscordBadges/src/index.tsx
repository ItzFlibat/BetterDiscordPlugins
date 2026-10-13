import config from "./config.json";

interface ServiceBadge {
    tooltip: string;
    mod: string;
    badge: string;
    kind?: string;
}

interface Service {
    id: string;
    name: string;
    enabled: boolean;
    forced?: boolean;
}

const PLUGIN_NAME = "BetterDiscordBadges";
const BADGE_ID_PREFIX = "yacbdp-";
const API_URL = "https://alliance.flibat.com/api/badges/users";
const REFRESH_INTERVAL = 30 * 60 * 1000;
const SERVICES: Service[] = [
    { id: "vencord", name: "Vencord", enabled: true },
    { id: "equicord", name: "Equicord", enabled: false },
    { id: "badgevault", name: "BadgeVault", enabled: false },
    { id: "nekocord", name: "Nekocord", enabled: false },
    { id: "reviewdb", name: "ReviewDB", enabled: false },
    { id: "aero", name: "Aero", enabled: false },
    { id: "aliucord", name: "Aliucord", enabled: false },
    { id: "raincord", name: "Raincord", enabled: false },
    { id: "velocity", name: "Velocity", enabled: false },
    { id: "enmity", name: "Enmity", enabled: false },
    { id: "paicord", name: "Paicord", enabled: false },
    { id: "bunny", name: "Bunny", enabled: false },
    { id: "goosemod", name: "GooseMod", enabled: false },
    { id: "replugged", name: "Replugged", enabled: false },
    { id: "betterdiscord", name: "BetterDiscord", enabled: true, forced: true },
    { id: "vendroidenhanced", name: "Vendroid Enhanced", enabled: false },
    { id: "revenge", name: "Revenge", enabled: false },
    { id: "record", name: "ReCord", enabled: false },
    { id: "allicord", name: "Allicord", enabled: true, forced: true }
];

type ToggleSettings = Record<string, boolean>;

export default class BetterDiscordBadges {
    private users: Record<string, ServiceBadge[]> = {};
    private settings: ToggleSettings = {};
    private interval: ReturnType<typeof setInterval> | undefined;
    private patch: (() => void) | undefined;
    private cache = new Map<string, { key: string; badges: any[] }>();
    private request: AbortController | undefined;
    private stopped = false;
    private dependencyTimer: ReturnType<typeof setTimeout> | undefined;
    private dependencyAttempts = 0;
    private lazyAbort: AbortController | undefined;

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
        return "Shows client-mod badges from the Alliance badge service on Discord profiles.";
    }

    start() {
        const library = (window as any).YACBDP;
        if (!library?.requirePlugin?.(PLUGIN_NAME)) {
            if (this.dependencyAttempts++ < 20) {
                this.dependencyTimer = setTimeout(() => {
                    if (BdApi.Plugins.isEnabled(PLUGIN_NAME)) this.start();
                }, 500);
            } else {
                BdApi.UI.showToast("BetterDiscordBadges requires the enabled YACBDP plugin.", { type: "error" });
            }
            return;
        }
        this.dependencyAttempts = 0;
        library.registerPlugin?.({
            id: PLUGIN_NAME,
            version: config.version,
            changelog: [
                {
                    type: "fixed",
                    title: "Profile badges",
                    items: ["Badges are placed on profiles again after Discord changed its badge component."]
                },
                { type: "added", title: "Updates", items: ["Update checks and change notices through YACBDP."] }
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
        const setting = (service: Service) => ({
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
        const onChange = (_category: string, id: string, value: boolean) => {
            const service = SERVICES.find(item => item.id === id);
            if (!service || service.forced) return;
            this.settings[id] = value;
            this.cache.clear();
            BdApi.Data.save(PLUGIN_NAME, "settings", this.settings);
        };
        const library = (window as any).YACBDP;
        return library?.buildSettingsPanel
            ? library.buildSettingsPanel(PLUGIN_NAME, categories, onChange)
            : BdApi.UI.buildSettingsPanel({ settings: categories, onChange });
    }

    private isBadgeList(value: any): boolean {
        if (typeof value !== "function") return false;
        try {
            const code = Function.prototype.toString.call(value);
            return code.includes("UserProfileBadgeListRows") || (code.includes("pendingBadges") && code.includes("showPendingBadgeEdits"));
        } catch {
            return false;
        }
    }

    private tryProfilePatch() {
        if (this.stopped || this.patch) return;
        const pair = BdApi.Webpack.getWithKey((value: any) => this.isBadgeList(value), { searchExports: true });
        if (pair?.[0] && pair[1]) {
            this.applyProfilePatch(pair[0], pair[1]);
            return;
        }
        // Discord only loads the profile badge module the first time a profile renders, so wait for it.
        const wait = BdApi.Webpack.waitForModule ?? BdApi.Webpack.getLazy;
        if (typeof wait !== "function") {
            BdApi.Logger.error(PLUGIN_NAME, "This BetterDiscord version cannot wait for Discord modules. Update BetterDiscord.");
            BdApi.UI.showToast("BetterDiscord Badges needs a newer BetterDiscord version.", { type: "error" });
            return;
        }
        this.lazyAbort = new AbortController();
        wait.call(
            BdApi.Webpack,
            (exports: any) => exports && typeof exports === "object" && Object.keys(exports).some(key => this.isBadgeList(exports[key])),
            { defaultExport: false, signal: this.lazyAbort.signal }
        )
            .then((exports: any) => {
                if (!exports || this.stopped || this.patch) return;
                const key = Object.keys(exports).find(name => this.isBadgeList(exports[name]));
                if (key) this.applyProfilePatch(exports, key);
            })
            .catch((error: unknown) => BdApi.Logger.warn(PLUGIN_NAME, "Stopped waiting for the profile badge renderer.", error));
    }

    private applyProfilePatch(module: any, key: string) {
        // The list merges `pendingBadges` into the badges it renders, which lets us add ours without touching its markup.
        this.patch = BdApi.Patcher.before(PLUGIN_NAME, module, key, (_: unknown, args: any[]) => {
            const props = args[0];
            const userId = props?.displayProfile?.userId;
            if (!userId) return;
            const badges = this.makeBadges(String(userId));
            if (badges.length === 0) return;
            args[0] = { ...props, pendingBadges: [...(props.pendingBadges ?? []), ...badges] };
        });
        // Discord appends pending badges after its own, so reorder the rendered rows to put ours first.
        BdApi.Patcher.after(PLUGIN_NAME, module, key, (_: unknown, __: any[], result: any) => this.reorder(result));
    }

    private reorder(result: any) {
        const rows = result?.props?.children;
        if (!Array.isArray(rows)) return result;
        const lists: any[][] = rows.map((row: any) => row?.props?.badges);
        if (!lists.every(Array.isArray)) return result;
        const all = lists.flat();
        const ours = (badge: any) => typeof badge?.id === "string" && badge.id.startsWith(BADGE_ID_PREFIX);
        const allicord = (badge: any) => badge.id.startsWith(`${BADGE_ID_PREFIX}allicord-`);
        const sorted = [
            ...all.filter(allicord),
            ...all.filter(badge => ours(badge) && !allicord(badge)),
            ...all.filter(badge => !ours(badge))
        ];
        if (sorted.every((badge, index) => badge === all[index])) return result;
        let offset = 0;
        const children = rows.map((row: any, index: number) => {
            const length = lists[index].length;
            const badges = sorted.slice(offset, offset + length);
            offset += length;
            return BdApi.React.cloneElement(row, { badges });
        });
        return BdApi.React.cloneElement(result, {}, ...children);
    }

    private async loadBadges() {
        this.request?.abort();
        const request = new AbortController();
        this.request = request;
        try {
            const response = await fetch(API_URL, { cache: "no-cache", signal: request.signal });
            if (!response.ok) throw new Error(`Badge service returned ${response.status}`);
            const data = await response.json();
            if (!data || typeof data.users !== "object" || Array.isArray(data.users))
                throw new Error("Badge service returned an invalid response.");
            if (!this.stopped) {
                this.users = data.users as Record<string, ServiceBadge[]>;
                this.cache.clear();
            }
        } catch (error) {
            if ((error as Error)?.name !== "AbortError") BdApi.Logger.warn(PLUGIN_NAME, "Unable to refresh profile badges.", error);
        }
    }

    private makeBadges(userId: string): any[] {
        const raw = this.users[userId] ?? [];
        const cacheKey = `${userId}:${raw.length}:${Object.values(this.settings).filter(Boolean).length}`;
        const cached = this.cache.get(userId);
        if (cached?.key === cacheKey) return cached.badges;
        const seen = new Set<string>();
        const badges = raw.flatMap((badge, index) => {
            if (!badge || typeof badge.badge !== "string" || typeof badge.tooltip !== "string") return [];
            if (!this.settings[badge.mod] && badge.mod !== "allicord" && badge.mod !== "betterdiscord") return [];
            let url: string;
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
            return [{ id: `${BADGE_ID_PREFIX}${badge.mod}-${index}`, description: badge.tooltip, iconSrc: url }];
        });
        this.cache.set(userId, { key: cacheKey, badges });
        return badges;
    }
}
