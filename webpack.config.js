/* global process, __dirname */
var path = require('path'),
    ExtractTextPlugin = require("extract-text-webpack-plugin"),
    webpack = require('webpack'),
    WebpackShellPlugin = require('webpack-shell-plugin');
var production = (process.env.NODE_ENV === 'production'),
    bundlePath = path.resolve(__dirname, 'apps/dg/resources/build'),
    plugins = [
      new ExtractTextPlugin('codap-lib-bundle.css')
    ];

/*
 * Configure production-only plugins
 */
if (production) {
  plugins.push(new webpack.DefinePlugin({
                  'process.env': {
                    'NODE_ENV': JSON.stringify('production')
                  }
                }));

  plugins.push(new webpack.optimize.UglifyJsPlugin({
                  compress: {
                    // ignore warnings from uglify
                    warnings: false
                  }
                }));
}

/*
 * Uglify plugin requires that bundle have .js extension for minimization to occur.
 * But the SproutCore build system fails if the bundle is in the application folder
 * and has a .js extension because the YUI compressor chokes on the minimized bundle.
 * Therefore, we build the bundle with a .js extension initially and then rename it
 * with the .js.ignore extension after all plugins have run.
 */
var srcBundleName = 'codap-lib-bundle.js',
    dstBundleName = 'codap-lib-bundle.js.ignore',
    srcBundle = path.resolve(bundlePath, srcBundleName),
    dstBundle = path.resolve(bundlePath, dstBundleName),
    echoCmd = "echo Renaming '" + srcBundleName + "' to '" + dstBundleName + "'...\n",
    renameBundleCmd = ['mv', srcBundle, dstBundle].join(' ');
plugins.push(new WebpackShellPlugin({
                onBuildEnd: [echoCmd, renameBundleCmd]
              }));

/*
 * Configuration
 */
var config = {
  entry: './webpack-entry.js',
  output: {
    path: bundlePath,
    filename: srcBundleName
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          fallback: "style-loader",
          use: "css-loader"
        })
      }
    ]
  },
  plugins: plugins,
  performance: {
    // turn off bundle size warnings
    hints: false
  }
};

module.exports = config;
