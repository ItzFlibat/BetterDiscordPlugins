interface ManagedPlugin {
    id: string;
    name: string;
    version: string;
    description: string;
}

const PLUGIN_NAME = "YACBDPLibrary";
const MANAGED_PLUGINS: ManagedPlugin[] = [
    { id: "YACBDPLibrary", name: "YACBDP Library", version: "1.0.0", description: "Shared library and plugin dashboard." },
    {
        id: "ShowHiddenChannels",
        name: "Show Hidden Channels",
        version: "2.1.0",
        description: "Show hidden channels and inspect available channel information."
    },
    { id: "MessageLogger", name: "Message Logger", version: "1.1.0", description: "Review locally recorded message deletions and edits." },
    { id: "BetterDiscordBadges", name: "BetterDiscord Badges", version: "1.1.0", description: "Show client-mod badges on user profiles." }
];

class PluginDashboard extends BdApi.React.Component<any, { tab: string; refresh: number }> {
    private timer: ReturnType<typeof setInterval>;

    constructor(props: any) {
        super(props);
        this.state = { tab: "plugins", refresh: 0 };
        this.timer = setInterval(() => this.setState((state: { tab: string; refresh: number }) => ({ refresh: state.refresh + 1 })), 1500);
    }

    componentWillUnmount() {
        clearInterval(this.timer);
    }

    private renderPlugin(plugin: ManagedPlugin) {
        const installed = BdApi.Plugins.get(plugin.id);
        const enabled = Boolean(installed && BdApi.Plugins.isEnabled(plugin.id));
        const isLibrary = plugin.id === PLUGIN_NAME;
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
                        {plugin.name} <small style={{ opacity: 0.65 }}>v{plugin.version}</small>
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
                <button
                    disabled={!installed || isLibrary}
                    onClick={() => {
                        if (enabled) BdApi.Plugins.disable(plugin.id);
                        else BdApi.Plugins.enable(plugin.id);
                        this.setState((state: { tab: string; refresh: number }) => ({ refresh: state.refresh + 1 }));
                    }}
                    style={{ minWidth: 110 }}
                >
                    {isLibrary ? "Required" : !installed ? "Not installed" : enabled ? "Disable" : "Enable"}
                </button>
            </article>
        );
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
                        <h1 style={{ margin: 0 }}>YACBDP Plugins</h1>
                        <a href="https://github.com/ItzFlibat" target="_blank" rel="noreferrer">
                            @ItzFlibat on GitHub
                        </a>
                    </div>
                </header>
                <nav style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--background-modifier-accent)", paddingBottom: 12 }}>
                    <button onClick={() => this.setState({ tab: "plugins" })} aria-selected={this.state.tab === "plugins"}>
                        YACBDP Plugins
                    </button>
                    <button onClick={() => this.setState({ tab: "about" })} aria-selected={this.state.tab === "about"}>
                        About
                    </button>
                </nav>
                {this.state.tab === "plugins" ? (
                    <section>
                        <p>
                            Manage your BetterDiscord plugins from one place. Install each plugin file into your BetterDiscord plugins
                            folder. The shared library is required and stays enabled.
                        </p>
                        {MANAGED_PLUGINS.map(plugin => this.renderPlugin(plugin))}
                    </section>
                ) : (
                    <section>
                        <h2>YACBDP Library</h2>
                        <p>This plugin provides the shared runtime required by the plugins in this collection.</p>
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

export default class YACBDPLibrary {
    private api = new BdApi(PLUGIN_NAME);

    getName() {
        return PLUGIN_NAME;
    }
    getAuthor() {
        return "ItzFlibat";
    }
    getVersion() {
        return "1.0.0";
    }
    getDescription() {
        return "Shared runtime and plugin dashboard for Yet Another Collection of BetterDiscord Plugins.";
    }

    start() {
        (window as any).YACBDPLibrary = {
            version: "1.0.0",
            requirePlugin: (name: string) => {
                const library = this.api.Plugins.get(PLUGIN_NAME);
                const available = Boolean(library && this.api.Plugins.isEnabled(PLUGIN_NAME));
                if (!available) this.api.UI.showToast(`${name} requires the YACBDP Library plugin to be enabled.`, { type: "error" });
                return available;
            }
        };
    }

    stop() {
        if ((window as any).YACBDPLibrary?.version === "1.0.0") delete (window as any).YACBDPLibrary;
    }

    getSettingsPanel() {
        return <PluginDashboard />;
    }
}
