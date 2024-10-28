const { execSync, exec } = require("child_process");

const { getFreeMem, getTotalMem, getAvailableMem, resolve } = require("./build/utils");
const {
    getParams,
    getOldSpaceSize,
    getAvailableWorkers,
    isWatch,
    run,
    isProduction,
} = require("./build/webpack/common/utils");
const { MIN_DEV_BUILD_MEM, MIN_PROD_BUILD_MEM } = require("./build/webpack/common/constants");
const scssConfig = require("./build/webpack/configs/scss");
const vueConfig = require("./build/webpack/configs/vue");

/**
 * Available params
 *
 * --mode=production | development
 * Determines which build mode to use
 * Example: --mode=production | --mode=development
 *
 * --watch=<boolean>
 * Determines whether to use watch mode
 * Example: --watch=true | --watch=false | --watch
 *
 * --bail=<boolean>
 * Fail out on the first error instead of tolerating it. By default, webpack will log these errors in red in the
 * terminal, as well as the browser console when using HMR, but continue bundling.
 * See: https://webpack.js.org/configuration/other-options/#bail
 * Example: --bail=true | --bail=false | --bail
 *
 * --devtool=source-map | inline-source-map | hidden-source-map | eval-source-map | nosources-source-map | cheap-source-map | cheap-module-source-map | eval
 * Choose a style of source mapping to enhance the debugging process. These values can affect build and rebuild speed dramatically.
 * See: https://webpack.js.org/configuration/devtool/#devtool
 *
 * --skip=js,css
 * Skip the specified configuration
 * Example: --skip=js,css | --skip=js | --skip=css
 *
 * --max-workers=<number>
 * The maximum number of workers that can be started. By default, the number of processor threads - 1
 *
 * --max-memory=<number>
 * Specifies how much memory can be used at most. By default, all available system memory is used
 *
 * --reserved-percent-memory=<number>
 * Specifies how much memory to reserve for other processes. By default, 0.2
 * This means if you have 16GB of memory and you specify 0.1, then 1.6GB of memory will be reserved for other processes,
 * and free memory for node.js will be the remaining 14.4GB.
 * The reserved-percent-memory will be used from the system memory value or from max-memory.
 *
 * VUE CONFIGURATION
 *
 * --sentry-project=<string>
 * Sentry project name
 *
 * --sentry-release=<string>
 * Sentry release name
 *
 * --token=<string>
 * Sentry token
 *
 * --sentry-url-prefix=<string>
 * To change the URL prefix for the source maps
 *
 * --syncfusion-key=<string>
 * Syncfusion license key
 */

// ----------------------------------------
// SETUP GLOBAL CONSTANTS
// ----------------------------------------

global.BUILD_WORKERS = getAvailableWorkers();

// ----------------------------------------
// RUN BUILD
// ----------------------------------------

if (getParams().hasOwnProperty("build")) {
    run({
        scss: [
            scssConfig({
                cacheName: "scss-v3",
                input: resolve("../htdocs/scss/"),
                output: resolve("../data/s/"),
            }),
        ],
        js: [
            vueConfig({
                cacheName: "js",
                input: {
                    "page-login": "./pages/login/app.ts",
                    "toast": "./widgets/toast/app.ts",
                },
                output: resolve("../data/s/"),
            }),
        ],
    });

    return;
}

// ----------------------------------------
// CHECK MAXIMUM OLD SPACE SIZE AND RERUN THIS FILE
// ----------------------------------------

const params = (() => {
    return Object.keys(getParams())
        .reduce((prev, key) => {
            prev.push(`--${key}=${getParams()[key]}`);
            return prev;
        }, [])
        .join(" ");
})();
const oldSpaceSize = getOldSpaceSize();
const availableMemory = getAvailableMem();

console.log("========================================");
console.log(`Total RAM: ${getTotalMem()}Gb`);
console.log(`Free RAM: ${getFreeMem()}Gb`);
console.log(`Minimum RAM for dev build: ${MIN_DEV_BUILD_MEM}Gb`);
console.log(`Minimum RAM for prod build: ${MIN_PROD_BUILD_MEM}Gb`);
console.log(`Available RAM: ${availableMemory}Gb`);
console.log(`Old Space Size RAM: ${oldSpaceSize}Mb`);
console.log(`Available Workers: ${getAvailableWorkers()}`);
console.log("========================================");

if (availableMemory < (isProduction() ? MIN_PROD_BUILD_MEM : MIN_DEV_BUILD_MEM)) {
    console.log("\x1b[31m");
    console.log("Not enough memory to build the project. Will use the swap file. Please, increase the memory.");
    console.log("\x1b[0m");
}

console.log(`Run: node --expose-gc --max-old-space-size=${oldSpaceSize} ./webpack.js ${params} --build`);

if (isWatch()) {
    const res = exec(`node --expose-gc --max-old-space-size=${oldSpaceSize} ./webpack.js ${params} --build`);
    res.stdout.on("data", (data) => {
        console.log(data);
    });
} else {
    console.log(
        execSync(`node --expose-gc --max-old-space-size=${oldSpaceSize} ./webpack.js ${params} --build`).toString()
    );
}
