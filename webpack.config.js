const path = require('path')
const webpack = require('webpack')
const autoprefixer = require('autoprefixer')
const deepFiles = require('deep-files')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CircularDependencyPlugin = require('circular-dependency-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const WebpackCopyPlugin = require('copy-webpack-plugin')
const CssNanoWebpackPlugin = require('cssnano-webpack-plugin')
const ReplaceInFileWebpackPlugin = require('replace-in-file-webpack-plugin')

const PROD = 'production'

const env = (process.env.NODE_ENV || PROD).toLowerCase()
const isProduction = env === PROD

const pages = deepFiles('src/pages', '*[!system].pug').reduce((acc, pathToPage) => {
  const match = pathToPage.match(/((\d|\w|-|_)+).pug/)

  if (match && typeof match[1] === 'string') {
    acc.push({ name: `${match[1]}.html`, source: pathToPage })
  }

  return acc
}, [])

const plugins = [
  new webpack.ProgressPlugin(),
  new MiniCssExtractPlugin(),
  new CssNanoWebpackPlugin({
    sourceMap: true,
    cssnanoOptions: {
      preset: [
        'default',
        {
          discardComments: { removeAll: true },
        },
      ],
    },
  }),
  new webpack.DefinePlugin({
    'process.env.NODE_ENV': JSON.stringify(env),
  }),
  new CircularDependencyPlugin({
    exclude: /node_modules/,
    failOnError: true,
    cwd: process.cwd(),
  }),
  new WebpackCopyPlugin([{ from: 'src/images', to: 'images' }]),
  ...pages.map(({ name, source }) => new HtmlWebpackPlugin({ template: source, filename: path.resolve(__dirname, `dist/${name}`) })),
]

if (isProduction) {
  plugins.push(
    new ReplaceInFileWebpackPlugin([
      {
        dir: 'dist',
        files: pages.map(p => p.name),
        rules: [
          {
            search: /src="(images\/\S+\.(png|jpe?g|gif))"/gi,
            replace: (match, p) => {
              return match.replace(p, `assets/${p}`)
            },
          },
        ],
      },
    ])
  )
}

module.exports = {
  // target: 'node',
  mode: env,
  entry: ['./src/scripts/main.ts', './src/styles/main.scss'],
  output: {
    filename: '[name].js',
    path: path.join(__dirname, `dist${isProduction ? '/assets' : ''}`),
    publicPath: isProduction ? 'assets' : '',
    sourceMapFilename: '[file].map',
  },
  devtool: 'source-map',
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    port: 8000,
    compress: false,
  },
  module: {
    rules: [
      {
        test: /\.pug$/,
        exclude: /node_modules/,
        use: [
          'html-loader?attrs=false',
          {
            loader: 'pug-html-loader',
            options: {
              data: {
                ...require('./pug.constants'),
                pages: pages.filter(p => p.name !== 'index.html').map(p => p.name),
              },
            },
          },
        ],
      },
      {
        test: /\.(js|ts)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-typescript', '@babel/preset-env'],
            },
          },
        ],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ['source-map-loader'],
        enforce: 'pre',
      },
      {
        test: /\.(css|s[ac]ss)$/,
        exclude: /node_modules/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
              url: false,
              importLoaders: 1
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              plugins: [autoprefixer({ grid: 'autoplace' })],
              sourceMap: true,
            },
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true,
            },
          },
        ],
      },
      {
        test: /\.(eot|ttf|woff|woff2)$/i,
        exclude: /node_modules/,
        loader: 'file-loader',
        options: {
          name: '[name].[ext]',
          outputPath: 'fonts',
          publicPath: 'fonts',
        },
      },
    ],
  },
  plugins,
}
