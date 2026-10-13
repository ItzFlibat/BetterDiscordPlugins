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
type DashboardState = { tab: string; refresh: number; busy: Record<string, boolean> };
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

class PluginDashboard extends BdApi.React.Component<any, DashboardState> {
    private timer: ReturnType<typeof setInterval>;

    constructor(props: any) {
        super(props);
        this.state = { tab: "plugins", refresh: 0, busy: {} };
        this.timer = setInterval(() => this.setState((current: DashboardState) => ({ refresh: current.refresh + 1 })), 1500);
    }

    componentWillUnmount() {
        clearInterval(this.timer);
    }

    private async run(id: string, action: () => Promise<unknown>) {
        this.setState((current: DashboardState) => ({ busy: { ...current.busy, [id]: true } }));
        try {
            await action();
        } finally {
            this.setState((current: DashboardState) => ({ busy: { ...current.busy, [id]: false }, refresh: current.refresh + 1 }));
        }
    }

    private renderPlugin(plugin: ManagedPlugin) {
        const version = installedVersion(plugin.id);
        const installed = Boolean(version);
        const enabled = Boolean(installed && BdApi.Plugins.isEnabled(plugin.id));
        const isLibrary = plugin.id === PLUGIN_NAME;
        const latest = state.available[plugin.id];
        const busy = Boolean(this.state.busy[plugin.id]);
        return (
            <article
                key={plugin.id}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: 16,
                    margin: "12px 0",
                    borderRadius: 8,
                    background: "var(--background-secondary)"
                }}
            >
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>
                        {plugin.name} {version && <small style={{ opacity: 0.65 }}>v{version}</small>}
                        {latest && <small style={{ marginLeft: 8, color: "var(--text-positive)" }}>v{latest} available</small>}
                    </div>
                    <div style={{ opacity: 0.8, marginTop: 5 }}>{plugin.description}</div>
                    <div style={{ marginTop: 8 }}>
                        <a
                            href={`https://github.com/ItzFlibat/BetterDiscordPlugins/tree/main/Plugins/${plugin.id}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            Source
                        </a>
                    </div>
                </div>
                {latest && (
                    <button
                        disabled={busy}
                        onClick={() => void this.run(plugin.id, () => installPlugin(plugin.id, true))}
                        style={{ minWidth: 90 }}
                    >
                        Update
                    </button>
                )}
                {!installed ? (
                    <button
                        disabled={busy}
                        onClick={() => void this.run(plugin.id, () => installPlugin(plugin.id, false))}
                        style={{ minWidth: 110 }}
                    >
                        Install
                    </button>
                ) : (
                    <button
                        disabled={isLibrary}
                        onClick={() => {
                            if (enabled) BdApi.Plugins.disable(plugin.id);
                            else BdApi.Plugins.enable(plugin.id);
                            this.setState((current: DashboardState) => ({ refresh: current.refresh + 1 }));
                        }}
                        style={{ minWidth: 110 }}
                    >
                        {isLibrary ? "Required" : enabled ? "Disable" : "Enable"}
                    </button>
                )}
            </article>
        );
    }

    private renderSettings() {
        const categories: SettingsCategory[] = [
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
            }
        ];
        return buildPanel(categories, (_category, id, value) => {
            if (!(id in DEFAULT_SETTINGS)) return;
            state.settings = { ...state.settings, [id]: Boolean(value) };
            BdApi.Data.save(PLUGIN_NAME, "library-settings", state.settings);
            if (id === "checkForUpdates" && value) void checkForUpdates();
        });
    }

    render() {
        return (
            <main style={{ maxWidth: 900, padding: 24, color: "var(--text-normal)" }}>
                <header style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                    <img
                        src="https://github.com/ItzFlibat.png"
                        alt="ItzFlibat GitHub profile"
                        style={{ width: 64, height: 64, borderRadius: "50%" }}
                    />
                    <div>
                        <h1 style={{ margin: 0 }}>YACBDP</h1>
                        <a href="https://github.com/ItzFlibat" target="_blank" rel="noreferrer">
                            @ItzFlibat on GitHub
                        </a>
                    </div>
                </header>
                <nav style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--background-modifier-accent)", paddingBottom: 12 }}>
                    <button onClick={() => this.setState({ tab: "plugins" })} aria-selected={this.state.tab === "plugins"}>
                        Plugins
                    </button>
                    <button onClick={() => this.setState({ tab: "settings" })} aria-selected={this.state.tab === "settings"}>
                        Settings
                    </button>
                    <button onClick={() => this.setState({ tab: "about" })} aria-selected={this.state.tab === "about"}>
                        About
                    </button>
                </nav>
                {this.state.tab === "plugins" ? (
                    <section>
                        <p>
                            Manage your BetterDiscord plugins from one place. The shared library is required and stays enabled. Plugins
                            update from GitHub when you choose.
                        </p>
                        <button disabled={state.checking} onClick={() => void checkForUpdates(true)}>
                            Check for updates
                        </button>
                        {MANAGED_PLUGINS.map(plugin => this.renderPlugin(plugin))}
                    </section>
                ) : this.state.tab === "settings" ? (
                    <section>{this.renderSettings()}</section>
                ) : (
                    <section>
                        <h2>YACBDP</h2>
                        <p>This plugin provides shared settings, update checks, and the plugin dashboard for this collection.</p>
                        <p>Version {VERSION}</p>
                        <p>
                            Website:{" "}
                            <a href="https://flibat.com" target="_blank" rel="noreferrer">
                                flibat.com
                            </a>
                        </p>
                        <p>
                            Discord:{" "}
                            <a href="https://flibat.com/discord" target="_blank" rel="noreferrer">
                                flibat.com/discord
                            </a>
                        </p>
                        <p>
                            Source:{" "}
                            <a href="https://github.com/ItzFlibat/BetterDiscordPlugins" target="_blank" rel="noreferrer">
                                GitHub repository
                            </a>
                        </p>
                    </section>
                )}
            </main>
        );
    }
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
        return <PluginDashboard />;
    }
}
