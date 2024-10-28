const path = require("path");
const CssMinimizerWebpackPlugin = require("css-minimizer-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const fs = require("fs");
const TerserPlugin = require("terser-webpack-plugin");
const { VueLoaderPlugin } = require("vue-loader");
const { DefinePlugin } = require("webpack");
const { execSync } = require("child_process");

const { resolve } = require("../../utils");
const { CONFIG_TARGET } = require("../common/constants");
const {
    getParams,
    getMode,
    getBail,
    getDevTool,
    getJSStyleHandler,
    clearFolder,
    isProduction,
    removeMaps,
    isDevelopment,
} = require("../common/utils");

const removeMapInProd = (dirPath) => {
    removeMaps(dirPath);

    console.log("Map files have been removed!");
};

module.exports = (config) => {
    const CONFIG_STYLE_HANDLER = getJSStyleHandler();

    // ----------------------------------------
    // GENERAL
    // ----------------------------------------

    const newConfig = {
        target: CONFIG_TARGET,
        mode: getMode(),
        bail: getBail(),
        devtool: getDevTool(),
        entry: config.input,
        output: {
            path: config.output,
            filename: "[name].js",
            library: {
                name: ["FR2", "[name]"],
                type: "window",
            },
            globalObject: "this",
            chunkLoadingGlobal: "chunkJsapp3",
        },
        optimization: {
            runtimeChunk: "single",
            splitChunks: {
                maxInitialRequests: Infinity,
                minSize: 0,
                cacheGroups: {
                    vendor: {
                        test: /([\\/]node_modules[\\/])|([\\/]common[\\/])/,
                        chunks: "initial",
                        name: "vendors",
                        enforce: true,
                    },
                },
            },
        },
        resolve: {
            alias: {
                "@": resolve("./"),
                "vue": "vue/dist/vue.esm-bundler.js",
                "common": resolve("./common"),
                "pages": resolve("./pages"),
                "widgets": resolve("./widgets"),
                "commonStatic": resolve("../htdocs/scss"),
                "@htdocs": resolve("../htdocs"),
            },
            extensions: [".tsx", ".ts", ".js", ".vue"],
        },
        module: {
            rules: [
                {
                    test: /\.m?js/,
                    resolve: {
                        fullySpecified: false,
                    },
                },
                {
                    test: /\.tsx?$/,
                    loader: "ts-loader",
                    exclude: ["/node_modules/"],
                    options: {
                        appendTsSuffixTo: [/\.vue$/],
                        happyPackMode: true,
                    },
                },
                {
                    test: /\.css$/i,
                    use: [CONFIG_STYLE_HANDLER, "css-loader"],
                },
                {
                    test: /\.s[ac]ss$/i,
                    use: [CONFIG_STYLE_HANDLER, "css-loader", "sass-loader"],
                },
                {
                    test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
                    type: "asset",
                },
                {
                    test: /\.vue$/,
                    use: "vue-loader",
                },
            ],
        },
        plugins: [
            new VueLoaderPlugin(),
            new DefinePlugin({
                "process.env": getMode(),
                "__VUE_OPTIONS_API__": "true",
                "__VUE_PROD_HYDRATION_MISMATCH_DETAILS__": isProduction() ? "false" : "true",
                "__VUE_PROD_DEVTOOLS__": isProduction() ? "false" : "true",
            }),
            {
                apply: (compiler) => {
                    compiler.hooks.beforeRun.tap("removerPlugin", () => {
                        clearFolder(config.output);
                    });
                },
            },
            {
                apply: (compiler) => {
                    compiler.hooks.beforeRun.tap("syncfusionRegistration", () => {
                        if (!getParams()["syncfusion-key"]) {
                            return;
                        }

                        const licensePath = resolve(`syncfusion-license.txt`);
                        const file = fs.openSync(licensePath, "w");

                        fs.writeSync(file, getParams()["syncfusion-key"]);
                        fs.closeSync(file);

                        try {
                            console.log(execSync("npx syncfusion-license activate").toString());
                        } catch (e) {
                            console.log("\x1b[31m");
                            console.log(`Error: ${e.message}`);
                            console.log("\x1b[0m");
                        }

                        fs.unlinkSync(licensePath);
                    });
                },
            },
        ],
    };

    // ----------------------------------------
    // FOR DEVELOPMENT
    // ----------------------------------------

    if (isDevelopment()) {
        newConfig.optimization.minimize = false;
        newConfig.cache = {
            type: "filesystem",
            cacheDirectory: resolve(`.webpack_cache/${config.cacheName ?? "js"}`),
            compression: "gzip",
        };
    }

    // ----------------------------------------
    // FOR PRODUCTION
    // ----------------------------------------

    if (isProduction()) {
        newConfig.devtool = "source-map";
        newConfig.optimization.minimize = true;
        newConfig.optimization.minimizer = [
            ...(newConfig.optimization.minimizer ?? []),
            new CssMinimizerWebpackPlugin({
                parallel: global.BUILD_WORKERS,
            }),
            new TerserPlugin({
                parallel: global.BUILD_WORKERS,
            }),
        ];
        newConfig.plugins.push(new MiniCssExtractPlugin());

        if (getParams().hasOwnProperty("sentry-project")) {
            newConfig.plugins.push({
                apply: (compiler) => {
                    compiler.hooks.done.tap("sentryUploader", () => {
                        let sentryProject = getParams()["sentry-project"];
                        let sentryRelease = getParams()["sentry-release"];
                        let sentryUrlPrefix = getParams()["sentry-url-prefix"];
                        let token = getParams()["token"];
                        let data = null;

                        if (!token) {
                            console.log("\x1b[31m");
                            console.log(`Error: Token empty`);
                            console.log("\x1b[0m");
                            return;
                        }

                        try {
                            data = JSON.parse(fs.readFileSync(resolve("../VERSION.json"), "utf8"));
                        } catch (err) {
                            console.log("\x1b[31m");
                            console.log(`Error: `, err);
                            console.log("\x1b[0m");
                        }

                        if (!sentryRelease) {
                            if (data) {
                                sentryRelease = data.tag;
                            } else {
                                console.log("\x1b[31m");
                                console.log(`Error: Sentry release is not found`);
                                console.log("\x1b[0m");
                                return;
                            }
                        }

                        (Array.isArray(sentryProject) ? sentryProject : [sentryProject]).forEach((project) => {
                            const urlRelease = sentryUrlPrefix || sentryRelease.replaceAll(".", "-");
                            const command = `${resolve("./node_modules/.bin/sentry-cli")} releases files upload-sourcemaps --auth-token ${token} --project ${project} --url-prefix '~/s/${urlRelease}/jsapp/' --release ${sentryRelease} ${config.output}`;

                            console.log(`> ${command}`);

                            try {
                                console.log(execSync(command).toString());
                            } catch (e) {
                                console.log("\x1b[31m");
                                console.log(`Error: ${e.message}`);
                                console.log("\x1b[0m");
                            }
                        });

                        removeMapInProd(config.output);
                    });
                },
            });
        } else {
            newConfig.plugins.push({
                apply: (compiler) => {
                    compiler.hooks.done.tap("removeMaps", () => {
                        removeMapInProd(config.output);
                    });
                },
            });
        }
    }

    return () => newConfig;
};
