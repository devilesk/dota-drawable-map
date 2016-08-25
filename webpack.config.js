 module.exports = {
     entry: './src/app.js',
     output: {
         path: './www/js',
         filename: 'bundle.js'
     },
     module: {
         loaders: [
             {
                 test: /\.js$/,
                 exclude: /node_modules/,
                 loader: 'babel-loader',
             },
             {
                 test: /\.js$/,
                 exclude: /node_modules/,
                 loader: 'exports-loader',
             }
         ]
     }
 };