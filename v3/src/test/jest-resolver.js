// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// https://jestjs.io/docs/upgrading-to-jest28#packagejson-exports
// https://github.com/microsoft/accessibility-insights-web/pull/5421#issuecomment-1109168149
// https://github.com/microsoft/accessibility-insights-web/pull/5421/commits/9ad4e618019298d82732d49d00aafb846fb6bac7
module.exports = (path, options) => {
    // Call the defaultResolver, so we leverage its cache, error handling, etc.
    return options.defaultResolver(path, {
        ...options,
        // Use packageFilter to process parsed `package.json` before the resolution (see https://www.npmjs.com/package/resolve#resolveid-opts-cb)
        packageFilter: pkg => {
            // This is a workaround for https://github.com/uuidjs/uuid/pull/616
            //
            // jest-environment-jsdom 28+ tries to use browser exports instead of default exports,
            // but uuid/nanoid only offer an ESM browser export and not a CommonJS one. Jest does not
            // yet support ESM modules natively, so this causes a Jest error related to trying to parse
            // "export" syntax.
            //
            // This workaround prevents Jest from considering uuid/nanoid's module-based exports at all;
            // it falls back to uuid/nanoid's CommonJS+node "main" property.
            //
            // Once we're able to migrate our Jest config to ESM and a browser crypto
            // implementation is available for the browser+ESM version of uuid/nanoid to use (eg, via
            // https://github.com/jsdom/jsdom/pull/3352 or a similar polyfill), this can go away.
            if (["nanoid", "uuid"].includes(pkg.name)) {
                delete pkg.exports
                delete pkg.module
            }
            return pkg
        },
    })
}
