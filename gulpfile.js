const { src, dest, parallel, series, watch } = require("gulp"),
  browserSync = require("browser-sync").create(),
  fileInclude = require("gulp-file-include"),
  del = require("del"),
  project_folder = "dist",
  source_folder = "app",
  scss = require("gulp-sass"),
  autoprefixer = require("gulp-autoprefixer"),
  groupmedia = require("gulp-group-css-media-queries"),
  cleancss = require("gulp-clean-css"),
  rename = require("gulp-rename"),
  uglify = require("gulp-uglify-es").default,
  babel = require("gulp-babel"),
  browserify = require("browserify"),
  sourceStream = require("vinyl-source-stream"),
  streamify = require("gulp-streamify"),
  imagemin = require("gulp-imagemin"),
  webp = require("gulp-webp"),
  webphtml = require("gulp-webp-html"),
  ttf2woff = require("gulp-ttf2woff"),
  ttf2woff2 = require("gulp-ttf2woff2"),
  fs = require("fs"),
  path = {
    build: {
      html: project_folder + "/",
      css: project_folder + "/css/",
      js: project_folder + "/js/",
      assets: project_folder + "/assets/",
      fonts: project_folder + "/fonts/",
    },
    src: {
      html: [source_folder + "/*.html", "!" + source_folder + "/_*.html"],
      css: source_folder + "/scss/style.scss",
      js: source_folder + "/js/script.js",
      assets: source_folder + "/assets/**/*.{jpg,png,svg,gif,ico}",
      fonts: source_folder + "/fonts/*.ttf",
    },
    watch: {
      html: source_folder + "/**/*.html",
      css: source_folder + "/scss/**/*.scss",
      js: source_folder + "/js/**/*.js",
      assets: source_folder + "/assets/**/*.{jpg,png,svg,gif,ico}",
    },
    clean: "./" + project_folder + "/",
  };

function browsersync() {
  browserSync.init({
    server: { baseDir: path.clean },
    port: 3000,
    notify: false,
    online: true,
  });
}

function html() {
  return src(path.src.html)
    .pipe(fileInclude())
    .pipe(webphtml())
    .pipe(dest(path.build.html))
    .pipe(browserSync.stream());
}

function css() {
  return src(path.src.css)
    .pipe(
      scss({
        outputStyle: "expanded",
      })
    )
    .pipe(groupmedia())
    .pipe(
      autoprefixer({
        overrideBrowserslist: ["last 5 versions"],
        cascade: true,
      })
    )
    .pipe(dest(path.build.css))
    .pipe(cleancss())
    .pipe(
      rename({
        extname: ".min.css",
      })
    )
    .pipe(dest(path.build.css))
    .pipe(browserSync.stream());
}

function js() {
  return (bundleStream = browserify(path.src.js)
    .bundle()
    .pipe(sourceStream("bundle.js"))
    .pipe(streamify(uglify()))
    .pipe(
      streamify(
        babel({
          presets: ["@babel/env"],
        })
      )
    )
    .pipe(dest(path.build.js))
    .pipe(browserSync.stream()));
}

function assets() {
  return src(path.src.assets)
    .pipe(
      webp({
        quality: 75,
      })
    )
    .pipe(dest(path.build.assets))
    .pipe(src(path.src.assets))
    .pipe(
      imagemin({
        interlaced: true,
        progressive: true,
        optimizationLevel: 4,
        svgoPlugins: [
          {
            removeViewBox: true,
          },
        ],
      })
    )
    .pipe(dest(path.build.assets))
    .pipe(browserSync.stream());
}

function fonts(params) {
  src(path.src.fonts).pipe(ttf2woff()).pipe(dest(path.build.fonts));

  return src(path.src.fonts).pipe(ttf2woff2()).pipe(dest(path.build.fonts));
}

function clean() {
  return del(path.clean);
}

async function fontsStyle() {
  let file_content = fs.readFileSync(source_folder + "/scss/fonts.scss");
  if (file_content == "") {
    fs.writeFileSync(source_folder + "/scss/fonts.scss", "", cb);
    return await fs.readdir(path.build.fonts, function (err, items) {
      if (items) {
        let c_fontname;
        for (var i = 0; i < items.length; i++) {
          let fontname = items[i].split(".");
          fontname = fontname[0];
          if (c_fontname != fontname) {
            fs.appendFile(
              source_folder + "/scss/fonts.scss",
              '@include font("' +
                fontname +
                '", "' +
                fontname +
                '", "400", "normal");\r\n',
              cb
            );
          }
          c_fontname = fontname;
        }
      }
    });
  }
}

function cb() {}

function watchFiles() {
  watch([path.watch.html], html);
  watch([path.watch.css], css);
  watch([path.watch.js], js);
  watch([path.watch.assets], assets);
}

const build = series(clean, parallel(css, html, js, assets, fonts)),
  orlean = parallel(build, watchFiles, browsersync),
  gulpfonts = series(clean, fonts, fontsStyle);

exports.fonts = gulpfonts;
exports.build = build;
exports.orlean = orlean;
exports.default = orlean;
