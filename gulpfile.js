// gulp
var gulp = require('gulp');
var argv = require('yargs').argv; // The contemporary library of choice for parsing command arguments (in this case flags)

// plugins
var useref = require('gulp-useref');
const filter = require('gulp-filter');
var gulpNgConfig = require('gulp-ng-config');
var connect = require('gulp-connect');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var minifyCSS = require('gulp-minify-css');
var clean = require('gulp-clean');
let babel = require('gulp-babel');
var runSequence = require('run-sequence');
var env = argv.env || 'test';
const cloudfront = require('gulp-cloudfront-invalidate');
const exec = require('gulp-exec');
const rev = require('gulp-rev');
const revReplace = require('gulp-rev-replace');
var historyApiFallback = require('connect-history-api-fallback');

const envConfig = {
    cloudfront: {
        live: "E2ACXJO6E127HQ",
        test: "E2A6X64NZ0VO06",
        dev: "E3IOWO7LOWIK1A"
    },
    s3: {
        live: 'promoappnewv1',
        test: 'promoapptest',
        dev: 'promoappv2'
    }
};
var config = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};

var s3 = require('gulp-s3-upload')(config);

// tasks
gulp.task('lint', function() {
    return gulp.src(['./app/**/*.js', '!./app/bower_components/**', '!./app/js/thirdparty/**'])
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(jshint.reporter('fail'));
});

gulp.task('clean', function() {
    return gulp.src('./dist/*').pipe(clean({
        force: true
    }));
});

gulp.task('html', function() {
    return gulp.src('app/index.html')
        .pipe(useref())
        .pipe(gulp.dest('dist'));
});

gulp.task('robots', function() {
    return gulp.src('app/robots.txt')
        .pipe(useref())
        .pipe(gulp.dest('dist'));
});

gulp.task('route-access', function() {
    return gulp.src('app/.htaccess')
        .pipe(useref())
        .pipe(gulp.dest('dist'));
});

gulp.task('minify-js', function() {
    return gulp.src('dist/js/all.min.js')
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(uglify())
        .pipe(rev())
        .pipe(gulp.dest('dist/js'))
        .pipe(rev.manifest({
            merge: true // Merge with the existing manifest if one exists
        }))
        .pipe(gulp.dest('dist/js'));
});

gulp.task('minify-css', function () {
    return gulp.src('dist/css/styles.min.css')
        .pipe(minifyCSS({
            comments: true,
            spare: true
        }))
        .pipe(rev())
        .pipe(gulp.dest('dist/css'))
        .pipe(rev.manifest({
            merge: true // Merge with the existing manifest if one exists
        }))
        .pipe(gulp.dest('dist/css'));
});

gulp.task('copy-bower-components', function() {
    return gulp.src('./app/bower_components/**')
        .pipe(gulp.dest('dist/bower_components'));
});

gulp.task('copy-html-files', function() {
    return gulp.src(['./app/**/*.html', '!./app/index.html'])
        .pipe(gulp.dest('dist/'));
});

gulp.task('copy-chat-files', function() {
    gulp.src(['./app/js/chat/*.js'])
        .pipe(gulp.dest('dist/js/chat'));
    gulp.src(['./app/css/chat/*.css'])
        .pipe(gulp.dest('dist/css/chat'));
    gulp.src(['./app/css/fonts/**'])
        .pipe(gulp.dest('dist/css/fonts'));
    return gulp.src(['app/css/site.css', 'app/css/header.css', 'app/css/style.css', 'app/css/paCommon.css', 'app/css/chat.css'])
        .pipe(gulp.dest('dist/css'));

});

gulp.task('copy-thirdparty', function() {
    return gulp.src(['./app/js/thirdparty/**'])
        .pipe(gulp.dest('dist/js/thirdparty'));
});

gulp.task('copy-fonts', function() {
    return gulp.src('./app/fonts/**')
        .pipe(gulp.dest('dist/fonts'));
});

gulp.task('copy-img-files', function() {
    return gulp.src('./app/img/*.*')
        .pipe(gulp.dest('dist/img'));
});

gulp.task('connect', function() {
    connect.server({
        root: 'app/',
        port: 8888,
        middleware: function() {
            return [historyApiFallback()];
        }
    });
});

gulp.task('connectrelease', function() {
    connect.server({
        root: 'dist/',
        port: 8888
    });
});

gulp.task('connectDist', function() {
    connect.server({
        root: 'dist/',
        port: 9999
    });
});

function replaceJsIfMap(filename) {
    if (filename.includes('.js')) {
        return 'js/' + filename;
    } else {
        return 'css/' + filename;
    }
}

gulp.task("replace-version", function () {
    var manifest = gulp.src(["./dist/js/rev-manifest.json", "./dist/css/rev-manifest.json"]);
    return gulp.src("./dist/index.html")
        .pipe(revReplace({
            manifest: manifest,
            modifyUnreved: replaceJsIfMap,
            modifyReved: replaceJsIfMap
        }))
        .pipe(gulp.dest("dist"))
});

gulp.task("upload", function () {

    let settings = {
        distribution: envConfig.cloudfront[env], // Cloudfront distribution ID
        paths: ['/*'], // Paths to invalidate
        accessKeyId: config.accessKeyId, // AWS Access Key ID
        secretAccessKey: config.secretAccessKey, // AWS Secret Access Key
        wait: true // Whether to wait until invalidation is completed (default: false)
    };

    let options = {
        continueOnError: false, // default = false, true means don't emit error event
        pipeStdout: true
    };

    let reportOptions = {
        err: true, // default = true, false means don't write err
        stderr: true, // default = true, false means don't write stderr
        stdout: true // default = true, false means don't write stdout
    };

    return gulp.src("./dist/**")
        .pipe(s3({
            Bucket: envConfig.s3[env], //  Required
            ACL: 'public-read' //  Needs to be user-defined
        }, {
            // S3 Constructor Options, ie:
            maxRetries: 5
        }))
        .pipe(exec(`aws s3 cp s3://${ envConfig.s3[env] }/bower_components s3://${ envConfig.s3[env] }/bower_components --cache-control max-age=86400 --recursive`, options))
        .pipe(exec.reporter(reportOptions))
        .pipe(exec(`aws s3 cp s3://${ envConfig.s3[env] }/fonts s3://${ envConfig.s3[env] }/fonts --cache-control max-age=86400 --recursive`, options))
        .pipe(exec.reporter(reportOptions))
        .pipe(exec(`aws s3 cp s3://${ envConfig.s3[env] }/img s3://${ envConfig.s3[env] }/img --cache-control max-age=86400 --recursive`, options))
        .pipe(exec.reporter(reportOptions))
        .pipe(cloudfront(settings));

});
gulp.task('create-config', function () {
    return gulp.src('./configFile.json')
        .pipe(gulpNgConfig('PromoApp', {
            createModule: false,
            environment: env
        }))
        .pipe(gulp.dest('./app/js/'))
});

// default task
gulp.task('default', gulp.series(['lint', 'connect']));
gulp.task('build', gulp.series(
    ['clean'], ['create-config'], ['lint', 'copy-html-files', 'copy-fonts', 'copy-bower-components', 'html', 'robots', 'route-access', 'copy-img-files', 'copy-chat-files', 'copy-thirdparty'], ['minify-js'], ['minify-css'], ['replace-version']
));
