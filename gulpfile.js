var gulp = require('gulp');
var concat = require('gulp-concat');
var minifyCSS = require('gulp-clean-css');
var rename = require('gulp-rename');
var preprocess = require('gulp-preprocess');
var imagemin = require('gulp-imagemin');
var gulpSequence = require('gulp-sequence');
var uglify = require('gulp-uglify');
var pump = require('pump');
var del = require('del');
var path = require('path');
var spawn = require('child_process').spawn;
var fs = require('fs');
var gutil = require('gulp-util');
var replace = require('gulp-replace');

var webpack = require('webpack');
var AssetsPlugin = require('assets-webpack-plugin');
var assetsPluginInstance = new AssetsPlugin();
var webpackConfig = require('./webpack.config');
var webpackProductionConfig = require('./webpack.production.config');

var deploy_dir = '/srv/www/devilesk.com/dota2/apps/drawablemap';

function getHash() {
    var obj = JSON.parse(fs.readFileSync('webpack-assets.json', 'utf8'));
    console.log(obj.main.js.split(".")[1]);
    return obj.main.js.split(".")[1];
}

gulp.task('default', ['build']);

gulp.task('build', gulpSequence('clean-build', 'webpack-production', ['css', 'html', 'image', 'fonts', 'copy-files']));

gulp.task("webpack-dev", function(callback) {
    // run webpack
    webpack(webpackConfig, function(err, stats) {
        if(err) throw new gutil.PluginError("webpack", err);
        gutil.log("[webpack]", stats.toString({
            // output options
        }));
        callback();
    });
});

gulp.task("webpack-production", ['build-ol'], function(callback) {
    // run webpack
    webpack(webpackProductionConfig, function(err, stats) {
        if(err) throw new gutil.PluginError("webpack", err);
        gutil.log("[webpack]", stats.toString({
            // output options
        }));
        callback();
    });
});

gulp.task('css', function () {
    return gulp.src([
            'www/css/miniheroes_sprite.css',
            'www/css/jquery-ui.css',
            'www/css/font-awesome.css',
            'www/css/color-picker.css',
            'www/css/openlayers.css',
            'www/css/interactivemap.css'
        ])
        .pipe(concat('interactivemap.' + getHash() + '.css'))
        .pipe(minifyCSS())
        .pipe(gulp.dest('dist/css'))
});

gulp.task('html', function () {
    return gulp.src('www/index.html')
        .pipe(preprocess({context: { NODE_ENV: 'production'}})) //To set environment variables in-line 
        .pipe(replace('css/interactivemap.css', 'css/interactivemap.' + getHash() + '.css'))
        .pipe(replace('js/interactivemap.js', 'js/interactivemap.' + getHash() + '.js'))
        .pipe(gulp.dest('dist/'))
});

gulp.task('fonts', function () {
    return gulp.src('www/fonts/**/*')
        .pipe(gulp.dest('dist/fonts'))
});

gulp.task('image', function () {
    return gulp.src('www/images/**/*')
        .pipe(imagemin())
        .pipe(gulp.dest('dist/images'))
});

gulp.task('build-ol', function (cb) {
    var dir = path.resolve(process.cwd(), './ol2/build');
    console.log(dir);
    spawn('python', ['build.py', '-c', 'none', '../../interactivemap.cfg'], { cwd: dir, stdio: 'inherit' }).on('close', cb);
});

gulp.task('copy-files', function () {
    return gulp
        .src([
            'www/*.json',
            'www/save.php'
        ])
        .pipe(gulp.dest('dist'));
});

gulp.task('clean-build', function () {
    return del([
        'dist/**/*'
    ], {force: true});
});

gulp.task('clean', function () {
    return del([
        deploy_dir +'/**/*',
        '!' + deploy_dir +'/save',
        '!' + deploy_dir +'/save/*'
    ], {force: true});
});

gulp.task('deploy', ['clean'], function () {
    return gulp
        .src('dist/**/*')
        .pipe(gulp.dest(deploy_dir));
});