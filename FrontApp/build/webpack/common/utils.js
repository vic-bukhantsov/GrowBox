const glob = require("glob");
const fs = require("fs");
const webpack = require("webpack");
const os = require("node:os");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const {
    getParamsFromProcess,
    getAvailableMem,
    resolve,
    getReservedMem,
    getReservedPercentMem,
} = require("../../utils");
const {
    DEVELOPMENT,
    PRODUCTION,
    MIN_PARALLEL_PROCESS,
    MIN_PROD_BUILD_MEM,
    MIN_DEV_BUILD_MEM,
    MAX_WATCH_MEM,
    MAX_BUILD_MEM,
    RESERVED_MEM_PERCENT,
} = require("./constants");

/**
 * Getting parameters from the command line that are passed to the NPM script
 */
const getParams = (refresh = false) => {
    if (global.BUILD_PARAMS !== undefined && !refresh) {
        return global.BUILD_PARAMS;
    }

    global.BUILD_PARAMS = getParamsFromProcess();

    return global.BUILD_PARAMS;
};

/**
 * Delete all source-map files from the folder
 *
 * @param dirPath
 */
const removeMaps = (dirPath) => {
    glob.sync(resolve(dirPath, "**/*.{js,css}")).forEach((item) => {
        const text = fs.readFileSync(item).toString().split("\n");
        const line = text.findIndex((lineText) => /\/\/#\s+sourceMappingURL=(.*?)\.map$/gm.test(lineText));

        if (line >= 0) {
            text.splice(line, 1);
            fs.writeFileSync(item, text.join("\n"));
        }
    });

    glob.sync(resolve(dirPath, "**/*.map")).forEach((item) => {
        fs.unlinkSync(item);
    });
};

/**
 * Delete all files from the folder
 *
 * @param dirPath
 */
const clearFolder = (dirPath) => {
    glob.sync(resolve(dirPath, "**/*.*")).forEach((item) => {
        fs.unlinkSync(item);
    });

    glob.sync(resolve(dirPath, "**"))
        .map((item) => item.replace(dirPath, ""))
        .filter((item) => item.trim())
        .map((item) => resolve(dirPath, item.replace("/", "")))
        .reverse()
        .forEach((item) => {
            fs.rmdirSync(item);
        });
};

/**
 * Check for watch mode
 *
 * @returns {boolean}
 */
const isWatch = () => getParams().hasOwnProperty("watch");

/**
 * Checks for production mode
 *
 * @returns {boolean}
 */
const isProduction = () => getParams().mode === PRODUCTION;

/**
 * Checks for development mode
 *
 * @returns {boolean}
 */
const isDevelopment = () => getParams().mode === DEVELOPMENT;

/**
 * Get the build mode. If not passed, then by default development
 *
 * @returns {string}
 */
const getMode = () => getParams().mode ?? DEVELOPMENT;

/**
 * Get the bail parameter
 * This is a parameter that stops the build at the first error
 *
 * @returns {boolean}
 */
const getBail = () => getParams().hasOwnProperty("bail") && !isWatch();

/**
 * Get the devtool parameter
 * This is a parameter that specifies how to generate the source-map
 * In development mode, source-map is the default
 *
 * @returns {string|*|boolean}
 */
const getDevTool = () =>
    getParams().devtool && isDevelopment() ? getParams().devtool : isDevelopment() ? "source-map" : false;

/**
 * Get the minimum amount of memory required for the build
 *
 * @returns {number}
 */
const getMinBuildMem = () => (isProduction() ? MIN_PROD_BUILD_MEM : MIN_DEV_BUILD_MEM);

/**
 * Get the amount of memory per worker
 *
 * @returns {number}
 */
const getPerWorkerMem = () => getMinBuildMem() * 0.5;

/**
 * Get the size of the space for node.js
 *
 * @returns {number}
 */
const getOldSpaceSize = () =>
    Math.floor(
        Math.min(
            Math.max(
                getAvailableMem() - getReservedMem() * (getReservedPercentMem() * RESERVED_MEM_PERCENT),
                getMinBuildMem()
            ),
            isWatch() ? MAX_WATCH_MEM : MAX_BUILD_MEM
        ) * 1024
    );

/**
 * Get the number of parallel processes
 * Depending on the amount of free memory and the number of cores
 *
 * @returns {number}
 */
const getAvailableWorkers = () => {
    const oldSpaceSize = getOldSpaceSize() / 1024;
    const hasMaxWorkers = getParams().hasOwnProperty("max-workers");
    const maxWorkers = hasMaxWorkers ? +getParams()["max-workers"] : null;
    const cpusMax = os.cpus().length - 1;
    const workers = Math.floor(oldSpaceSize / getPerWorkerMem());

    if (hasMaxWorkers && !Number.isFinite(maxWorkers)) {
        throw new Error("max-workers must be a number");
    }

    if (isWatch()) {
        return Math.max(Math.max(workers, 1), MIN_PARALLEL_PROCESS);
    }

    if (hasMaxWorkers) {
        return maxWorkers > workers ? (workers > cpusMax ? cpusMax : Math.max(workers, 1)) : Math.max(maxWorkers, 1);
    }

    return workers > cpusMax ? cpusMax : Math.max(workers, 1);
};

/**
 * Get the style handler depending on the build mode
 *
 * @returns {string|string}
 */
const getJSStyleHandler = () => (isProduction() ? MiniCssExtractPlugin.loader : "style-loader");

/**
 * Run build
 *
 * @param configs
 */
const run = (configs) => {
    const statsConfig = {
        colors: true,
        errors: true,
        errorDetails: true,
        modules: false,
        children: false,
        chunks: false,
        chunkModules: false,
    };

    const newConfigs = Object.keys(configs)
        .reduce((prev, key) => {
            if (!getParams().skip?.includes(key)) {
                prev.push(...configs[key]);
            }

            return prev;
        }, [])
        .map((config) => config());

    const webpackCompiler = webpack(newConfigs);

    if (isWatch() && isDevelopment()) {
        webpackCompiler.watch(
            {
                ignored: /node_modules/,
            },
            (err, stats) => {
                try {
                    process.stdout.write(stats.toString(statsConfig) + "\n");
                } catch (e) {
                    console.error(e);
                    throw new Error(err);
                }
            }
        );
    } else {
        webpackCompiler.run((err, stats) => {
            try {
                process.stdout.write(stats.toString(statsConfig) + "\n");
            } catch (e) {
                console.error(err);
                throw new Error(err);
            }
        });
    }
};

module.exports = {
    isWatch,
    isProduction,
    isDevelopment,
    getParams,
    getMode,
    getBail,
    getDevTool,
    getAvailableWorkers,
    getOldSpaceSize,
    getJSStyleHandler,
    removeMaps,
    clearFolder,
    run,
};
