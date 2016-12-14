/* global process */
var webpack = require('webpack');
var production = process.argv.indexOf('-p') !== -1;

var config = {
  entry: './webpack-entry.js',
  output: {
    path: './apps/dg/build',
    filename: 'codap-lib-bundle.js'
  }
};

config.plugins = config.plugins||[];
if (production) {
  config.plugins.push(new webpack.DefinePlugin({
    'process.env': {
      'NODE_ENV': "production"
    }
  }));
  config.plugins.push(new webpack.optimize.UglifyJsPlugin({
    compress: {
      // ignore warnings from uglify
      warnings: false
    }
  }));
}

module.exports = config;
