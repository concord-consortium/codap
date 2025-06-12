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
        test: /slate.*\.js$/,
        loader: require.resolve('string-replace-loader'),
        options: {
          // SproutCore replaces Array.prototype.find() with a version that returns null on failure
          // rather than undefined. Slate's onQuery function continues propagation on undefined,
          // but treats all other values as the query's result. The SchemaPlugin returns the result
          // of Array.prototype.find() to indicate true if the find was successful but that
          // propagation should continue on failure. These replacements change the SchemaPlugin
          // implementation so that undefined is returned on failure of Array.prototype.find(),
          // independent of whether Array.prototype.find() returns undefined or null on failure.
          multiple: [
            {
              search: "return rule && rule.isAtomic;",
              replace: "return rule ? rule.isAtomic : undefined; // [CC] workaround for SC's Array.prototype.find() override",
              strict: true  // fail build if replacement not performed
            },
            {
              search: "return rule && rule.isVoid;",
              replace: "return rule ? rule.isVoid : undefined; // [CC] workaround for SC's Array.prototype.find() override",
              strict: true  // fail build if replacement not performed
            }
          ]
        }
      },
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
