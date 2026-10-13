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
    private warned = false;
    private request: AbortController | undefined;
    private stopped = false;
    private dependencyTimer: ReturnType<typeof setTimeout> | undefined;
    private dependencyAttempts = 0;
    private patchTimer: ReturnType<typeof setTimeout> | undefined;
    private patchAttempts = 0;

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
        this.patchAttempts = 0;
        this.tryProfilePatch();
        void this.loadBadges();
        this.interval = setInterval(() => void this.loadBadges(), REFRESH_INTERVAL);
    }

    stop() {
        this.stopped = true;
        if (this.dependencyTimer) clearTimeout(this.dependencyTimer);
        if (this.patchTimer) clearTimeout(this.patchTimer);
        this.dependencyAttempts = 0;
        this.request?.abort();
        if (this.interval) clearInterval(this.interval);
        this.patch?.();
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
            BdApi.Data.save(PLUGIN_NAME, "settings", this.settings);
        };
        const library = (window as any).YACBDP;
        return library?.buildSettingsPanel
            ? library.buildSettingsPanel(PLUGIN_NAME, categories, onChange)
            : BdApi.UI.buildSettingsPanel({ settings: categories, onChange });
    }

    private tryProfilePatch() {
        if (this.stopped || this.patch) return;
        if (this.installProfilePatch()) return;
        if (this.patchAttempts++ < 10) {
            this.patchTimer = setTimeout(() => this.tryProfilePatch(), 3000);
            return;
        }
        BdApi.Logger.error(PLUGIN_NAME, "Could not find Discord's profile badge renderer. Badges will not appear until Discord updates.");
        BdApi.UI.showToast("BetterDiscord Badges could not find the profile badge area.", { type: "error" });
    }

    private installProfilePatch(): boolean {
        // Discord compiles intl keys to hashes, so PROFILE_USER_BADGES never appears in source. The badge list
        // component renders badge objects through their iconSrc, so match on that instead.
        const source = (value: any): string => {
            try {
                return Function.prototype.toString.call(value);
            } catch {
                return "";
            }
        };
        const looksLikeBadgeList = (code: string) => code.includes("iconSrc") && /aria-label|ariaLabel|forceOpen|ariaHidden/.test(code);
        const resolve = (value: any): { target: any; key: string } | undefined => {
            if (typeof value === "function") return undefined;
            if (value && typeof value === "object") {
                if (typeof value.type === "function" && looksLikeBadgeList(source(value.type))) return { target: value, key: "type" };
                if (typeof value.render === "function" && looksLikeBadgeList(source(value.render))) return { target: value, key: "render" };
            }
            return undefined;
        };
        const filter = (value: any) =>
            (typeof value === "function" && looksLikeBadgeList(source(value))) ||
            (value && typeof value === "object" && Boolean(resolve(value)));
        const pair = BdApi.Webpack.getWithKey(filter, { searchExports: true });
        if (!pair || !pair[0] || !pair[1]) return false;
        let [module, key] = pair;
        const inner = resolve(module[key]);
        if (inner) {
            module = inner.target;
            key = inner.key;
        }
        this.patch = BdApi.Patcher.after(PLUGIN_NAME, module, key, (_: unknown, args: any[], result: any) => {
            const userId = this.findUserId(args);
            if (!userId || !result) return result;
            const badges = this.makeElements(userId);
            if (badges.length === 0) return result;
            const updated = this.appendToBadgeRow(result, badges);
            if (updated) return updated;
            if (!this.warned) {
                this.warned = true;
                BdApi.Logger.warn(PLUGIN_NAME, "The profile badge layout changed; using a fallback placement.");
            }
            const children = Array.isArray(result.props?.children) ? result.props.children.slice() : [result.props?.children];
            return BdApi.React.cloneElement(result, {}, ...children.filter(Boolean), this.makeRow(badges));
        });
        return true;
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
            if (!this.stopped) this.users = data.users as Record<string, ServiceBadge[]>;
        } catch (error) {
            if ((error as Error)?.name !== "AbortError") BdApi.Logger.warn(PLUGIN_NAME, "Unable to refresh profile badges.", error);
        }
    }

    private findUserId(args: any[]): string | undefined {
        const seen = new Set<any>();
        const search = (value: any, depth: number): string | undefined => {
            if (!value || typeof value !== "object" || depth > 5 || seen.has(value)) return undefined;
            seen.add(value);
            const likely =
                value.userId ??
                value.user_id ??
                value.displayProfile?.userId ??
                value.displayProfile?.user?.id ??
                value.user?.id ??
                value.profile?.userId;
            if (likely != null && /^\d{15,25}$/.test(String(likely))) return String(likely);
            for (const key of ["props", "displayProfile", "profile", "user", "children"]) {
                const found = search(value[key], depth + 1);
                if (found) return found;
            }
            return undefined;
        };
        return search(args, 0);
    }

    private makeElements(userId: string): any[] {
        const visible = (this.users[userId] ?? []).filter(badge => {
            if (!badge || typeof badge.badge !== "string" || typeof badge.tooltip !== "string") return false;
            return Boolean(this.settings[badge.mod]) || badge.mod === "allicord" || badge.mod === "betterdiscord";
        });
        const seen = new Set<string>();
        return visible.flatMap((badge, index) => {
            let url: string;
            try {
                url = new URL(badge.badge, "https://alliance.flibat.com/").href;
                if (new URL(url).protocol !== "https:") return [];
            } catch {
                return [];
            }
            const key = `${badge.mod}:${badge.tooltip}:${url}`;
            if (seen.has(key)) return [];
            seen.add(key);
            return [
                BdApi.React.createElement("img", {
                    key: `${badge.mod}-${index}-${userId}`,
                    className: "bd-badges-client-mod",
                    src: url,
                    alt: badge.tooltip,
                    title: badge.tooltip,
                    "aria-label": badge.tooltip,
                    style: {
                        width: 22,
                        height: 22,
                        objectFit: "contain",
                        borderRadius: "50%",
                        marginInlineStart: 4,
                        verticalAlign: "middle"
                    }
                })
            ];
        });
    }

    private makeRow(badges: any[]) {
        return BdApi.React.createElement(
            "span",
            { className: "bd-badges-client-mod-row", style: { display: "inline-flex", alignItems: "center" } },
            ...badges
        );
    }

    private appendToBadgeRow(root: any, badges: any[]): any {
        const visit = (node: any, depth: number): any => {
            if (!node || typeof node !== "object" || depth > 20) return node;
            if (Array.isArray(node)) return node.map(item => visit(item, depth + 1));
            if (!node.props) return node;
            const props = node.props;
            const own = `${props.className ?? ""} ${props["aria-label"] ?? ""} ${props.title ?? ""}`.toLowerCase();
            const children = props.children;
            const hasImage = (value: any): boolean =>
                Array.isArray(value)
                    ? value.some(hasImage)
                    : Boolean(value?.type === "img" || (value?.props?.src && (value?.props?.alt || value?.props?.["aria-label"])));
            if (/badge/.test(own) && (hasImage(children) || /profile.*badge/.test(own))) {
                const existing = Array.isArray(children) ? children : children == null ? [] : [children];
                if (existing.some((child: any) => child?.props?.className === "bd-badges-client-mod")) return node;
                return BdApi.React.cloneElement(node, {}, ...existing, ...badges);
            }
            if (children) {
                const updated = (Array.isArray(children) ? children : [children]).map(child => visit(child, depth + 1));
                if (updated.some((child, index) => child !== (Array.isArray(children) ? children[index] : children))) {
                    return BdApi.React.cloneElement(node, {}, ...updated);
                }
            }
            return node;
        };
        const hasBadgeRow = (node: any, depth: number): boolean => {
            if (!node || depth > 20) return false;
            if (Array.isArray(node)) return node.some(child => hasBadgeRow(child, depth + 1));
            if (typeof node !== "object" || !node.props) return false;
            const own = `${node.props.className ?? ""} ${node.props["aria-label"] ?? ""} ${node.props.title ?? ""}`.toLowerCase();
            const children = node.props.children;
            const hasImage = (value: any): boolean =>
                Array.isArray(value)
                    ? value.some(hasImage)
                    : Boolean(value?.type === "img" || (value?.props?.src && (value?.props?.alt || value?.props?.["aria-label"])));
            return (/badge/.test(own) && (hasImage(children) || /profile.*badge/.test(own))) || hasBadgeRow(children, depth + 1);
        };
        if (!hasBadgeRow(root, 0)) return null;
        const updated = visit(root, 0);
        return updated;
    }
}
