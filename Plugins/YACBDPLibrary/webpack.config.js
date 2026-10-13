const path = require("node:path");
const fs = require("node:fs");
const webpack = require("webpack");
const config = require("./src/config.json");

module.exports = {
    mode: "production",
    target: "electron-renderer",
    devtool: false,
    entry: "./src/index.tsx",
    output: {
        filename: "YACBDPLibrary.plugin.js",
        path: path.join(__dirname, "dist"),
        library: { type: "commonjs2", export: "default" }
    },
    optimization: { minimize: false },
    resolve: { extensions: [".ts", ".tsx", ".js", ".json"] },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: [
                            ["@babel/preset-env", { targets: { chrome: "108" } }],
                            ["@babel/preset-react", { pragma: "BdApi.React.createElement", pragmaFrag: "BdApi.React.Fragment" }],
                            "@babel/preset-typescript"
                        ]
                    }
                }
            }
        ]
    },
    plugins: [
        new webpack.BannerPlugin({
            raw: true,
            banner: ["/**", ...Object.entries(config).map(([key, value]) => ` * @${key} ${value}`), " */"].join("\n")
        }),
        {
            apply(compiler) {
                compiler.hooks.afterEmit.tap("YACBDPLibrary", () => {
                    const outputPath = path.join(__dirname, "dist/YACBDPLibrary.plugin.js");
                    const content = fs.readFileSync(outputPath, "utf8").replace(/[\t ]+$/gm, "");
                    fs.writeFileSync(outputPath, content);
                    fs.writeFileSync(path.join(__dirname, "YACBDPLibrary.plugin.js"), content);
                });
            }
        }
    ]
};
