import config from "./config.json";

interface ManagedPlugin {
    id: string;
    name: string;
    description: string;
}

interface ChangelogEntry {
    type?: "added" | "improved" | "fixed" | "progress";
    title: string;
    items: string[];
}

interface RegisterOptions {
    id: string;
    version: string;
    changelog?: ChangelogEntry[];
}

type SettingsCategory = { id: string; name: string; settings: any[]; shown?: boolean; collapsible?: boolean };
type LibrarySettings = { checkForUpdates: boolean; notifyOnUpdate: boolean; notifyOnPluginUpdated: boolean };

const PLUGIN_NAME = "YACBDP";
const VERSION = config.version;
const RAW_BASE = "https://raw.githubusercontent.com/ItzFlibat/BetterDiscordPlugins/refs/heads/main/Plugins";
const CHECK_INTERVAL = 4 * 60 * 60 * 1000;
const DEFAULT_SETTINGS: LibrarySettings = { checkForUpdates: true, notifyOnUpdate: true, notifyOnPluginUpdated: true };
const MANAGED_PLUGINS: ManagedPlugin[] = [
    { id: "YACBDP", name: "YACBDP", description: "Shared settings, update checks, and plugin dashboard." },
    {
        id: "ShowHiddenChannels",
        name: "Show Hidden Channels",
        description: "Show hidden channels and inspect available channel information."
    },
    { id: "MessageLogger", name: "Message Logger", description: "Review locally recorded message deletions and edits." },
    { id: "BetterDiscordBadges", name: "BetterDiscord Badges", description: "Show client-mod badges on user profiles." }
];

const state = {
    settings: { ...DEFAULT_SETTINGS } as LibrarySettings,
    available: {} as Record<string, string>,
    notified: new Set<string>(),
    timer: undefined as ReturnType<typeof setInterval> | undefined,
    updateStart: undefined as ReturnType<typeof setTimeout> | undefined,
    checking: false
};

function parseVersion(version: string): number[] {
    return String(version)
        .split(".")
        .map(part => parseInt(part, 10) || 0);
}

function compareVersions(a: string, b: string): number {
    const left = parseVersion(a);
    const right = parseVersion(b);
    for (let i = 0; i < Math.max(left.length, right.length, 3); i++) {
        const diff = (left[i] ?? 0) - (right[i] ?? 0);
        if (diff) return diff > 0 ? 1 : -1;
    }
    return 0;
}

function rawUrl(id: string) {
    return `${RAW_BASE}/${id}/${id}.plugin.js`;
}

function installedVersion(id: string): string | undefined {
    const plugin = BdApi.Plugins.get(id);
    return plugin ? String(plugin.version) : undefined;
}

async function fetchSource(id: string): Promise<string> {
    const response = await fetch(`${rawUrl(id)}?t=${Date.now()}`, { cache: "no-cache" });
    if (!response.ok) throw new Error(`GitHub returned ${response.status} for ${id}`);
    return response.text();
}

function loadSettings(): LibrarySettings {
    const saved = BdApi.Data.load(PLUGIN_NAME, "library-settings") ?? {};
    const result = { ...DEFAULT_SETTINGS };
    for (const key of Object.keys(DEFAULT_SETTINGS) as Array<keyof LibrarySettings>) {
        if (typeof saved[key] === "boolean") result[key] = saved[key];
    }
    return result;
}

async function checkForUpdates(manual = false): Promise<number> {
    if (state.checking || (!manual && !state.settings.checkForUpdates)) return 0;
    state.checking = true;
    try {
        await Promise.all(
            MANAGED_PLUGINS.map(async plugin => {
                const current = installedVersion(plugin.id);
                if (!current) return;
                try {
                    const latest = (await fetchSource(plugin.id)).match(/@version\s+(\d+\.\d+\.\d+)/)?.[1];
                    if (!latest || compareVersions(latest, current) <= 0) {
                        delete state.available[plugin.id];
                        return;
                    }
                    state.available[plugin.id] = latest;
                    const key = `${plugin.id}@${latest}`;
                    if (state.settings.notifyOnUpdate && !state.notified.has(key)) {
                        state.notified.add(key);
                        BdApi.UI.showNotice(`${plugin.name} ${latest} is available (you have ${current}).`, {
                            type: "info",
                            buttons: [{ label: "Update", onClick: () => void installPlugin(plugin.id, true) }]
                        });
                    }
                } catch (error) {
                    BdApi.Logger.warn(PLUGIN_NAME, `Unable to check ${plugin.id} for updates.`, error);
                }
            })
        );
        if (manual) {
            const count = Object.keys(state.available).length;
            BdApi.UI.showToast(count ? `${count} plugin update(s) available.` : "All collection plugins are up to date.", {
                type: count ? "info" : "success"
            });
        }
        return Object.keys(state.available).length;
    } finally {
        state.checking = false;
    }
}

async function installPlugin(id: string, update: boolean) {
    try {
        const source = await fetchSource(id);
        if (!/@version\s+\d+\.\d+\.\d+/.test(source)) throw new Error("Downloaded file is not a BetterDiscord plugin.");
        const fs = (window as any).require?.("fs");
        const path = (window as any).require?.("path");
        if (!fs || !path) throw new Error("File access is unavailable.");
        fs.writeFileSync(path.join(BdApi.Plugins.folder, `${id}.plugin.js`), source);
        delete state.available[id];
        BdApi.UI.showToast(`${id} ${update ? "updated" : "installed"}. BetterDiscord will reload it.`, { type: "success" });
    } catch (error) {
        BdApi.Logger.error(PLUGIN_NAME, `Could not ${update ? "update" : "install"} ${id}.`, error);
        BdApi.UI.showToast(`Could not ${update ? "update" : "install"} ${id}. See the console for details.`, { type: "error" });
    }
}

function registerPlugin(options: RegisterOptions): "installed" | "updated" | "unchanged" | "downgraded" {
    const versions = BdApi.Data.load(PLUGIN_NAME, "versions") ?? {};
    const previous: string | undefined = versions[options.id];
    if (previous === options.version) return "unchanged";
    versions[options.id] = options.version;
    BdApi.Data.save(PLUGIN_NAME, "versions", versions);
    if (!previous) return "installed";
    const outcome = compareVersions(options.version, previous) > 0 ? "updated" : "downgraded";
    if (outcome === "updated" && state.settings.notifyOnPluginUpdated) {
        BdApi.UI.showToast(`${options.id} updated from ${previous} to ${options.version}.`, { type: "success" });
        if (options.changelog?.length && typeof BdApi.UI.showChangelogModal === "function") {
            BdApi.UI.showChangelogModal({
                title: options.id,
                subtitle: `v${options.version}`,
                changes: options.changelog.map(entry => ({ title: entry.title, type: entry.type ?? "improved", items: entry.items }))
            });
        }
    }
    return outcome;
}

const drawerStates: Record<string, Record<string, boolean>> = {};

function buildPanel(categories: SettingsCategory[], onChange: (category: string, id: string, value: unknown) => void, owner = PLUGIN_NAME) {
    const drawers = (drawerStates[owner] ??= BdApi.Data.load(owner, "settings-drawers") ?? {});
    return BdApi.UI.buildSettingsPanel({
        settings: categories.map(category => ({ ...category, type: "category", collapsible: category.collapsible ?? true })),
        onChange,
        getDrawerState: (id: string, defaultShown: boolean) => drawers[id] ?? defaultShown,
        onDrawerToggle: (id: string, shown: boolean) => {
            drawers[id] = shown;
            BdApi.Data.save(owner, "settings-drawers", drawers);
        }
    });
}

function useTicker() {
    const [, setTick] = BdApi.React.useState(0);
    BdApi.React.useEffect(() => {
        const timer = setInterval(() => setTick((tick: number) => tick + 1), 1500);
        return () => clearInterval(timer);
    }, []);
    return () => setTick((tick: number) => tick + 1);
}

function UIButton(props: { label: string; onClick: () => void; disabled?: boolean; primary?: boolean }) {
    const Button = BdApi.Components?.Button;
    if (!Button) {
        return (
            <button disabled={props.disabled} onClick={props.onClick}>
                {props.label}
            </button>
        );
    }
    return (
        <Button
            color={props.primary ? Button.Colors?.BRAND : Button.Colors?.PRIMARY}
            size={Button.Sizes?.SMALL}
            disabled={props.disabled}
            onClick={props.onClick}
        >
            {props.label}
        </Button>
    );
}

function PluginRow(props: { plugin: ManagedPlugin }) {
    const refresh = useTicker();
    const [busy, setBusy] = BdApi.React.useState(false);
    const { plugin } = props;
    const version = installedVersion(plugin.id);
    const enabled = Boolean(version && BdApi.Plugins.isEnabled(plugin.id));
    const isLibrary = plugin.id === PLUGIN_NAME;
    const latest = state.available[plugin.id];
    const run = async (action: () => Promise<unknown>) => {
        setBusy(true);
        try {
            await action();
        } finally {
            setBusy(false);
            refresh();
        }
    };
    const Text = BdApi.Components?.Text;
    const label = (text: string) => (Text ? <Text>{text}</Text> : <span>{text}</span>);
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "flex-end" }}>
            <div style={{ flex: 1, opacity: 0.8 }}>
                {label(version ? `Installed: v${version}` : "Not installed")}
                {latest && label(`Available: v${latest}`)}
            </div>
            {latest && <UIButton primary label="Update" disabled={busy} onClick={() => void run(() => installPlugin(plugin.id, true))} />}
            {!version ? (
                <UIButton primary label="Install" disabled={busy} onClick={() => void run(() => installPlugin(plugin.id, false))} />
            ) : (
                <UIButton
                    label={isLibrary ? "Required" : enabled ? "Disable" : "Enable"}
                    disabled={isLibrary}
                    onClick={() => {
                        if (enabled) BdApi.Plugins.disable(plugin.id);
                        else BdApi.Plugins.enable(plugin.id);
                        refresh();
                    }}
                />
            )}
        </div>
    );
}

function UpdateRow() {
    useTicker();
    return (
        <UIButton
            primary
            label={state.checking ? "Checking..." : "Check for updates"}
            disabled={state.checking}
            onClick={() => void checkForUpdates(true)}
        />
    );
}

function buildDashboard() {
    const categories: SettingsCategory[] = [
        {
            id: "plugins",
            name: "Plugins",
            shown: true,
            settings: [
                {
                    type: "custom",
                    id: "check-updates",
                    name: "Updates",
                    note: "Plugins update from GitHub when you choose.",
                    inline: true,
                    children: <UpdateRow />
                },
                ...MANAGED_PLUGINS.map(plugin => ({
                    type: "custom",
                    id: `plugin-${plugin.id}`,
                    name: plugin.name,
                    note: plugin.description,
                    inline: true,
                    children: <PluginRow plugin={plugin} />
                }))
            ]
        },
        {
            id: "updates",
            name: "Updates",
            shown: true,
            settings: [
                {
                    type: "switch",
                    id: "checkForUpdates",
                    name: "Check for plugin updates",
                    note: "Checks GitHub every few hours for newer versions of the collection plugins.",
                    value: state.settings.checkForUpdates
                },
                {
                    type: "switch",
                    id: "notifyOnUpdate",
                    name: "Show a notice when an update is available",
                    value: state.settings.notifyOnUpdate
                },
                {
                    type: "switch",
                    id: "notifyOnPluginUpdated",
                    name: "Show what changed after a plugin updates",
                    value: state.settings.notifyOnPluginUpdated
                }
            ]
        },
        {
            id: "about",
            name: "About",
            shown: false,
            settings: [
                {
                    type: "custom",
                    id: "about-links",
                    name: `YACBDP v${VERSION}`,
                    note: "Shared settings, update checks, and plugin dashboard for Yet Another Collection of BetterDiscord Plugins.",
                    children: (
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                            <a href="https://github.com/ItzFlibat/BetterDiscordPlugins" target="_blank" rel="noreferrer">
                                GitHub
                            </a>
                            <a href="https://flibat.com" target="_blank" rel="noreferrer">
                                flibat.com
                            </a>
                            <a href="https://flibat.com/discord" target="_blank" rel="noreferrer">
                                Discord
                            </a>
                        </div>
                    )
                }
            ]
        }
    ];
    return buildPanel(categories, (_category, id, value) => {
        if (!(id in DEFAULT_SETTINGS)) return;
        state.settings = { ...state.settings, [id]: Boolean(value) };
        BdApi.Data.save(PLUGIN_NAME, "library-settings", state.settings);
        if (id === "checkForUpdates" && value) void checkForUpdates();
    });
}

export default class YACBDP {
    getName() {
        return PLUGIN_NAME;
    }
    getAuthor() {
        return config.author;
    }
    getVersion() {
        return VERSION;
    }
    getDescription() {
        return config.description;
    }

    start() {
        state.settings = loadSettings();
        (window as any).YACBDP = {
            version: VERSION,
            requirePlugin: (name: string) => {
                const available = Boolean(BdApi.Plugins.get(PLUGIN_NAME) && BdApi.Plugins.isEnabled(PLUGIN_NAME));
                if (!available) BdApi.UI.showToast(`${name} requires the YACBDP plugin to be enabled.`, { type: "error" });
                return available;
            },
            registerPlugin,
            checkForUpdates,
            buildSettingsPanel: (
                pluginName: string,
                categories: SettingsCategory[],
                onChange: (category: string, id: string, value: unknown) => void
            ) => buildPanel(categories, onChange, pluginName)
        };
        registerPlugin({
            id: PLUGIN_NAME,
            version: VERSION,
            changelog: [
                {
                    type: "added",
                    title: "Update checks",
                    items: ["Checks GitHub for newer versions of the collection plugins and can update or install them from the dashboard."]
                },
                { type: "added", title: "Update detection", items: ["Plugins now report when they were updated and what changed."] }
            ]
        });
        state.updateStart = setTimeout(() => void checkForUpdates(), 5000);
        state.timer = setInterval(() => void checkForUpdates(), CHECK_INTERVAL);
    }

    stop() {
        if (state.updateStart) clearTimeout(state.updateStart);
        if (state.timer) clearInterval(state.timer);
        state.timer = undefined;
        state.updateStart = undefined;
        if ((window as any).YACBDP?.version === VERSION) delete (window as any).YACBDP;
    }

    getSettingsPanel() {
        return buildDashboard();
    }
}
