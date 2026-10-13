/**
 * @name YACBDP
 * @displayName YACBDP
 * @version 1.0.0
 * @author ItzFlibat
 * @authorId 619203349954166804
 * @source https://github.com/ItzFlibat/BetterDiscordPlugins/tree/main/Plugins/YACBDP
 * @website https://flibat.com
 * @description Shared runtime and plugin dashboard for Yet Another Collection of BetterDiscord Plugins.
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
/* harmony export */   "default": () => (/* binding */ YACBDP)
/* harmony export */ });
const PLUGIN_NAME = "YACBDP";
const MANAGED_PLUGINS = [{
  id: "YACBDP",
  name: "YACBDP",
  version: "1.0.0",
  description: "Shared settings and plugin dashboard."
}, {
  id: "ShowHiddenChannels",
  name: "Show Hidden Channels",
  version: "2.1.0",
  description: "Show hidden channels and inspect available channel information."
}, {
  id: "MessageLogger",
  name: "Message Logger",
  version: "1.1.0",
  description: "Review locally recorded message deletions and edits."
}, {
  id: "BetterDiscordBadges",
  name: "BetterDiscord Badges",
  version: "1.1.0",
  description: "Show client-mod badges on user profiles."
}];
class PluginDashboard extends BdApi.React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tab: "plugins",
      refresh: 0
    };
    this.timer = setInterval(() => this.setState(state => ({
      refresh: state.refresh + 1
    })), 1500);
  }
  componentWillUnmount() {
    clearInterval(this.timer);
  }
  renderPlugin(plugin) {
    const installed = BdApi.Plugins.get(plugin.id);
    const enabled = Boolean(installed && BdApi.Plugins.isEnabled(plugin.id));
    const isLibrary = plugin.id === PLUGIN_NAME;
    return BdApi.React.createElement("article", {
      key: plugin.id,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: 16,
        margin: "12px 0",
        borderRadius: 8,
        background: "var(--background-secondary)"
      }
    }, BdApi.React.createElement("div", {
      style: {
        flex: 1
      }
    }, BdApi.React.createElement("div", {
      style: {
        fontWeight: 700,
        fontSize: 16
      }
    }, plugin.name, " ", BdApi.React.createElement("small", {
      style: {
        opacity: 0.65
      }
    }, "v", plugin.version)), BdApi.React.createElement("div", {
      style: {
        opacity: 0.8,
        marginTop: 5
      }
    }, plugin.description), BdApi.React.createElement("div", {
      style: {
        marginTop: 8
      }
    }, BdApi.React.createElement("a", {
      href: `https://github.com/ItzFlibat/BetterDiscordPlugins/tree/main/Plugins/${plugin.id}`,
      target: "_blank",
      rel: "noreferrer"
    }, "Source"))), BdApi.React.createElement("button", {
      disabled: !installed || isLibrary,
      onClick: () => {
        if (enabled) BdApi.Plugins.disable(plugin.id);else BdApi.Plugins.enable(plugin.id);
        this.setState(state => ({
          refresh: state.refresh + 1
        }));
      },
      style: {
        minWidth: 110
      }
    }, isLibrary ? "Required" : !installed ? "Not installed" : enabled ? "Disable" : "Enable"));
  }
  render() {
    return BdApi.React.createElement("main", {
      style: {
        maxWidth: 900,
        padding: 24,
        color: "var(--text-normal)"
      }
    }, BdApi.React.createElement("header", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 16,
        marginBottom: 24
      }
    }, BdApi.React.createElement("img", {
      src: "https://github.com/ItzFlibat.png",
      alt: "ItzFlibat GitHub profile",
      style: {
        width: 64,
        height: 64,
        borderRadius: "50%"
      }
    }), BdApi.React.createElement("div", null, BdApi.React.createElement("h1", {
      style: {
        margin: 0
      }
    }, "YACBDP"), BdApi.React.createElement("a", {
      href: "https://github.com/ItzFlibat",
      target: "_blank",
      rel: "noreferrer"
    }, "@ItzFlibat on GitHub"))), BdApi.React.createElement("nav", {
      style: {
        display: "flex",
        gap: 8,
        borderBottom: "1px solid var(--background-modifier-accent)",
        paddingBottom: 12
      }
    }, BdApi.React.createElement("button", {
      onClick: () => this.setState({
        tab: "plugins"
      }),
      "aria-selected": this.state.tab === "plugins"
    }, "Plugins"), BdApi.React.createElement("button", {
      onClick: () => this.setState({
        tab: "about"
      }),
      "aria-selected": this.state.tab === "about"
    }, "About")), this.state.tab === "plugins" ? BdApi.React.createElement("section", null, BdApi.React.createElement("p", null, "Manage your BetterDiscord plugins from one place. Install each plugin file into your BetterDiscord plugins folder. The shared library is required and stays enabled."), MANAGED_PLUGINS.map(plugin => this.renderPlugin(plugin))) : BdApi.React.createElement("section", null, BdApi.React.createElement("h2", null, "YACBDP"), BdApi.React.createElement("p", null, "This plugin provides shared settings and the plugin dashboard for this collection."), BdApi.React.createElement("p", null, "Website:", " ", BdApi.React.createElement("a", {
      href: "https://flibat.com",
      target: "_blank",
      rel: "noreferrer"
    }, "flibat.com")), BdApi.React.createElement("p", null, "Discord:", " ", BdApi.React.createElement("a", {
      href: "https://flibat.com/discord",
      target: "_blank",
      rel: "noreferrer"
    }, "flibat.com/discord")), BdApi.React.createElement("p", null, "Source:", " ", BdApi.React.createElement("a", {
      href: "https://github.com/ItzFlibat/BetterDiscordPlugins",
      target: "_blank",
      rel: "noreferrer"
    }, "GitHub repository"))));
  }
}
class YACBDP {
  api = new BdApi(PLUGIN_NAME);
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
    window.YACBDP = {
      version: "1.0.0",
      requirePlugin: name => {
        const library = this.api.Plugins.get(PLUGIN_NAME);
        const available = Boolean(library && this.api.Plugins.isEnabled(PLUGIN_NAME));
        if (!available) this.api.UI.showToast(`${name} requires the YACBDP plugin to be enabled.`, {
          type: "error"
        });
        return available;
      },
      buildSettingsPanel: (pluginName, categories, onChange) => {
        const drawerStates = this.api.Data.load(pluginName, "settings-drawers") ?? {};
        return this.api.UI.buildSettingsPanel({
          settings: categories.map(category => ({
            ...category,
            type: "category",
            collapsible: category.collapsible ?? true
          })),
          onChange,
          getDrawerState: (id, defaultShown) => drawerStates[id] ?? defaultShown,
          onDrawerToggle: (id, shown) => {
            drawerStates[id] = shown;
            this.api.Data.save(pluginName, "settings-drawers", drawerStates);
          }
        });
      }
    };
  }
  stop() {
    if (window.YACBDP?.version === "1.0.0") delete window.YACBDP;
  }
  getSettingsPanel() {
    return BdApi.React.createElement(PluginDashboard, null);
  }
}
module.exports = __webpack_exports__["default"];
/******/ })()
;