const glob = require("glob");
const path = require("path");
const CssMinimizerWebpackPlugin = require("css-minimizer-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const autoprefixer = require("autoprefixer");
const fs = require("fs");

const { resolve } = require("../../utils");
const { CONFIG_TARGET } = require("../common/constants");
const {
    getMode,
    getBail,
    getDevTool,
    clearFolder,
    isProduction,
    isDevelopment,
    removeMaps,
} = require("../common/utils");

module.exports = (config) => {
    // ----------------------------------------
    // GENERAL
    // ----------------------------------------

    const newConfig = {
        target: CONFIG_TARGET,
        mode: getMode(),
        bail: getBail(),
        devtool: getDevTool(),
        entry: glob.sync(resolve(`${config.input}/**/[!_]*.scss`)).reduce((obj, el) => {
            const parsed = path.parse(el);
            const key = resolve(`${parsed.dir}/${parsed.name}`).replace(config.input, "").replace("/", "");
            obj[key] = resolve(el);

            return obj;
        }, {}),
        output: {
            path: config.output,
        },
        module: {
            rules: [
                {
                    test: /\.css$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: "css-loader",
                            options: {
                                url: false,
                            },
                        },
                    ],
                },
                {
                    test: /\.scss$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: "css-loader",
                            options: {
                                url: false,
                            },
                        },
                        "sass-loader",
                    ],
                    exclude: /node_modules/,
                },
            ],
        },
        plugins: [
            autoprefixer,
            new MiniCssExtractPlugin({ ignoreOrder: true, filename: "[name].css" }),
            {
                apply: (compiler) => {
                    compiler.hooks.beforeRun.tap("removerPlugin", () => {
                        clearFolder(config.output);
                    });

                    compiler.hooks.done.tap("removerPlugin", () => {
                        glob.sync(resolve(config.output, "**/*.{js,js.map}")).forEach((item) => {
                            fs.unlinkSync(item);
                        });

                        if (isProduction()) {
                            removeMaps(config.output);
                        }
                    });
                },
            },
        ],
    };

    // ----------------------------------------
    // FOR DEVELOPMENT
    // ----------------------------------------

    if (isDevelopment()) {
        newConfig.optimization = {
            minimize: false,
        };
        newConfig.cache = {
            type: "filesystem",
            cacheDirectory: resolve(`.webpack_cache/${config.cacheName ?? "css"}`),
            compression: "gzip",
        };
    }

    // ----------------------------------------
    // FOR PRODUCTION
    // ----------------------------------------

    if (isProduction()) {
        newConfig.optimization = {
            minimize: true,
            minimizer: [
                new CssMinimizerWebpackPlugin({
                    parallel: global.BUILD_WORKERS,
                }),
            ],
        };
    }

    return () => newConfig;
};
