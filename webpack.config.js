/* global process, __dirname */
var path = require('path'),
    ExtractTextPlugin = require("extract-text-webpack-plugin"),
    webpack = require('webpack');
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
                  test: /\.js(.ignore)?$/i,
                  compress: {
                    // ignore warnings from uglify
                    warnings: false
                  }
                }));
}

var dstBundleName = 'codap-lib-bundle.js.ignore';

/*
 * Configuration
 */
var config = {
  entry: './webpack-entry.js',
  output: {
    path: bundlePath,
    filename: dstBundleName
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
