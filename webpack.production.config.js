var webpack = require('webpack');
var path = require('path');
var AssetsPlugin = require('assets-webpack-plugin');
var assetsPluginInstance = new AssetsPlugin();

module.exports = {
    entry: './src/app.js',
    output: {
        path: './dist/js',
        //publicPath: "assets/[hash]/",
        filename: "interactivemap.[hash].js",
        chunkFilename: "[id].[hash].bundle.js"
    },
    devtool: 'source-map',
    target: 'web',
    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            compress: {
                drop_console: true
            }
        }),
        assetsPluginInstance
    ],
    module: {
        loaders: [{
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'babel-loader',
        }, {
            test: /\.js$/,
            exclude: /node_modules/,
            loader: 'exports-loader',
        }]
    }
};