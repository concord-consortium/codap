/* global process, __dirname */
var path = require('path'),
    MiniCssExtractPlugin = require("mini-css-extract-plugin"),
    webpack = require('webpack');
var production = (process.env.NODE_ENV === 'production'),
    bundlePath = path.resolve(__dirname, 'apps/dg/resources/build'),
    plugins = [
      new MiniCssExtractPlugin({filename:'codap-lib-bundle.css'})
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
  devtool: production ? '' : 'source-map',
  mode: production? 'production': 'development',
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      }
    ]
  },
  optimization: {
    minimize: production
  },
  plugins: plugins,
  performance: {
    // turn off bundle size warnings
    hints: false
  }
};

module.exports = config;
