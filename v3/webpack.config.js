'use strict'

const os = require('os')
const path = require('path')
const Dotenv = require('dotenv-webpack')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const ESLintPlugin = require('eslint-webpack-plugin')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')

// DEPLOY_PATH is set by the s3-deploy-action its value will be:
// `branch/[branch-name]/` or `version/[tag-name]/`
// See the following documentation for more detail:
//   https://github.com/concord-consortium/s3-deploy-action/blob/main/README.md#top-branch-example
const DEPLOY_PATH = process.env.DEPLOY_PATH

const CACHE_DIRECTORY = '.cache'

module.exports = (env, argv) => {
  const devMode = argv.mode !== 'production'

  const webpackPlugins = [
    new Dotenv(),
    new MiniCssExtractPlugin({
      filename: devMode ? 'assets/[name].css' : 'assets/[name].[contenthash].css',
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'src/index.html',
      favicon: 'src/public/favicon.ico',
    }),
    ...(DEPLOY_PATH ? [new HtmlWebpackPlugin({
      filename: "index-top.html",
      template: "src/index.html",
      favicon: "src/public/favicon.ico",
      publicPath: DEPLOY_PATH
    })] : []),
    new CleanWebpackPlugin(),
  ]
  if (devMode && !process.env.SKIP_ESLINT) {
    // `build` script runs eslint independently in production mode,
    // so we don't need to run it again as part of the webpack build
    webpackPlugins.push(new ESLintPlugin({
      cacheLocation: path.resolve(__dirname, `${CACHE_DIRECTORY}/eslint-webpack-plugin/.eslintcache`),
      configType: 'flat',
      extensions: ['ts', 'tsx', 'js', 'jsx'],
      lintDirtyModulesOnly: true
    }))
  }
  if (!process.env.CODE_COVERAGE) {
    webpackPlugins.push(new ForkTsCheckerWebpackPlugin({ typescript: { memoryLimit: 3072 } }))
  }

  return {
    context: __dirname, // to automatically find tsconfig.json
    devServer: {
      allowedHosts: 'all',
      static: 'dist',
      hot: true,
      server: {
        type: 'https',
        options: {
          key: path.resolve(os.homedir(), '.localhost-ssl/localhost.key'),
          cert: path.resolve(os.homedir(), '.localhost-ssl/localhost.pem')
        }
      },
      client: {
        overlay: {
          errors: true,
          warnings: false,
        },
      },
      // static: {
      //   directory: path.resolve(__dirname, 'public'),
      // },
    },
    devtool: devMode ? 'eval-cheap-module-source-map' : 'source-map',
    entry: './src/index.tsx',
    mode: 'development',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'assets/index.[contenthash].js',
    },
    snapshot: {
      // When computing the cache, use the hash if the timestamp is different
      // In the Cypress github actions job, the timestamps are changing
      module: { timestamp: true, hash: true},
      resolve: { timestamp: true, hash: true},
    },
    cache: {
      buildDependencies: {
        config: [__filename],
      },
      cacheDirectory: path.resolve(__dirname, `${CACHE_DIRECTORY}/webpack`),
      type: 'filesystem',
    },
    performance: { hints: false },
    optimization: devMode ? {
      removeAvailableModules: false,
      removeEmptyChunks: false,
      splitChunks: false,
    } : {},
    module: {
      rules: [
        {
          test: /.(ts|tsx)$/,
          include: path.resolve(__dirname, "src"),
          use: process.env.CODE_COVERAGE ? { loader: "ts-loader" } : {
            loader: "swc-loader",
            options: {
              jsc: {
                parser: {
                  syntax: "typescript",
                  decorators: true,
                  tsx: false,
                  dynamicImport: false,
                },
              },
            },
          },
        },
        // This code coverage instrumentation should only be added when needed. It makes
        // the code larger and slower
        process.env.CODE_COVERAGE ? {
          test: /\.[tj]sx?$/,
          loader: '@jsdevtools/coverage-istanbul-loader',
          options: { esModules: true },
          enforce: 'post',
          exclude: path.join(__dirname, 'node_modules'),
        } : {},
        {
          test: /\.json5$/,
          loader: 'json5-loader'
        },
        {
          test: /\.(sa|sc|le|c)ss$/i,
          use: [
            devMode ? 'style-loader' : MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                modules: {
                  // required for :import from scss files
                  // cf. https://github.com/webpack-contrib/css-loader#separating-interoperable-css-only-and-css-module-features
                  // v6 changed from `compileType` to `mode`
                  mode: 'icss',
                  namedExport: false
                }
              }
            },
            'postcss-loader',
            'sass-loader',
          ]
        },
        {
          test: /\.(csv)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/data/[name].[contenthash:6][ext]'
          }
        },
        {
          test: /\.(eot|otf|ttf|woff|woff2)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/fonts/[name].[contenthash:6][ext]'
          }
        },
        {
          test: /\.(gif|png)$/,
          type: 'asset',
          generator: {
            filename: 'assets/images/[name].[contenthash:6][ext]'
          }
        },
        {
          test: /\.nosvgr\.svg$/i,
          include: path.resolve(__dirname, 'src/assets/plugins'),
          type: 'asset/resource',
          generator: {
            filename: 'assets/plugins/[name][ext]'
          }
        },
        { // disable svgo optimization for files ending in .nosvgo.svg
          test: /\.nosvgo\.svg$/i,
          loader: '@svgr/webpack',
          options: {
            svgo: false
          }
        },
        {
          test: /\.nosvgr\.svg$/i,
          exclude: path.resolve(__dirname, 'src/assets/plugins'),
          type: 'asset/resource',
          generator: {
            filename: 'assets/cfm/[name].[contenthash:6][ext]'
          }
        },
        {
          test: /\.svg$/i,
          exclude: /\.nosvg[or]\.svg$/i,
          oneOf: [
            {
              // Do not apply SVGR import in CSS files.
              issuer: /\.(css|scss|less)$/,
              type: 'asset',
              generator: {
                filename: 'assets/images/[name].[contenthash:6][ext]'
              }
            },
            {
              issuer: /\.tsx?$/,
              loader: '@svgr/webpack',
              options: {
                svgoConfig: {
                  plugins: [
                    {
                      // cf. https://github.com/svg/svgo/releases/tag/v2.4.0
                      name: 'preset-default',
                      params: {
                        overrides: {
                          // don't minify "id"s (i.e. turn randomly-generated unique ids into "a", "b", ...)
                          // https://github.com/svg/svgo/blob/master/plugins/cleanupIDs.js
                          cleanupIds: { minify: false },
                          // leave <line>s, <rect>s and <circle>s alone
                          // https://github.com/svg/svgo/blob/master/plugins/convertShapeToPath.js
                          convertShapeToPath: false,
                          // leave "stroke"s and "fill"s alone
                          // https://github.com/svg/svgo/blob/master/plugins/removeUnknownsAndDefaults.js
                          removeUnknownsAndDefaults: { defaultAttrs: false },
                        }
                      }
                    }
                  ]
                }
              }
            }
          ]
        },
        {
          test: /@concord-consortium\/cloud-file-manager\/dist\/css\/app\.css$/,
          loader: require.resolve('string-replace-loader'),
          options: {
            multiple: [
              { // disable `body` styles
                search: "}body{",
                replace: "}#CC-disable-body-styles{",
                strict: true  // fail build if replacement not performed
              }
            ]
          }
        }
      ]
    },
    resolve: {
      alias: {
        'mobx-state-tree': '@concord-consortium/mobx-state-tree'
      },
      extensions: [ '.ts', '.tsx', '.js', '.json5' ],
      fallback: {
        // required for react-data-grid/React 17
        // cf. https://github.com/adazzle/react-data-grid/issues/2787#issuecomment-1071978035
        'react/jsx-runtime': 'react/jsx-runtime.js',
        'react/jsx-dev-runtime': 'react/jsx-dev-runtime.js',
      },
    },
    plugins: webpackPlugins,
    watchOptions: {
      // for some systems, watching many files can result in a lot of CPU or memory usage
      // https://webpack.js.org/configuration/watch/#watchoptionsignored
      // don't use this pattern, if you have a monorepo with linked packages
      ignored: /node_modules/,
    }
  }
}
