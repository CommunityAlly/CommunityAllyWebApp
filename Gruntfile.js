const sass = require('sass');

module.exports = function(grunt) {

var allyLibTopFiles = [
    'website/js/lib/jquery/jquery-1.12.4.js',
    'website/js/lib/angular/core/angular.js',
    'website/js/lib/angular/core/angular-resource.js',
    'website/js/lib/angular/core/angular-route.js',
    'website/js/lib/angular/core/angular-sanitize.js',
    'website/js/lib/angular/third-party/ng-date.js',
    'website/js/lib/angular/third-party/ng-grid-2.0.11.min.js',
    'website/js/lib/angular/third-party/ng-grid-flexible-height.js',
    'website/js/lib/angular/third-party/ng-tags-input.js',
    'website/js/lib/angular/third-party/angular-wizard.min.js',
    'website/js/lib/angular/third-party/isteven-multi-select.js',
    'website/js/lib/angular/third-party/xd-utils.js',
    'website/js/lib/angular/third-party/xdLocalStorage.js',
    'website/js/lib/angular/third-party/ng-xdLocalStorage.js',
    'website/js/lib/ui-grid/ui-grid.min.js',
    'website/js/lib/angular/third-party/angular-google-maps.min.js',
    'website/js/lib/charts/Chart.min.js',
    'website/js/lib/charts/angular-chart.js',
    'website/js/lib/calendar/moment.min.js',
    'website/js/lib/calendar/moment-timezone-with-data-10-year-range.js',
    'website/js/lib/other/jsnlog.min.js',
    'website/js/lib/other/lodash.compat.min.js',
    'website/js/HtmlUtil.js',
    'website/js/design_v2/jquery.hotkeys.js',
    'website/js/design_v2/jquery.mCustomScrollbar.concat.min.js',
    'website/js/design_v2/main.js',
    'website/js/lib/jquery/jquery-ui-1.11.2.min.js'
];

// Project configuration.
grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    // Build the Angular templates file
    ngtemplates: {
        app: {
            cwd:      'website',
            src:      'ngApp/**/**.html',
            dest:     'website/ngTemplates.js',
            options: {
                htmlmin: {
                    collapseBooleanAttributes:      false,
                    collapseWhitespace:             true,
                    removeAttributeQuotes:          false,
                    removeComments:                 true, // Only if you don't use comment directives! 
                    removeEmptyAttributes:          false,
                    removeRedundantAttributes:      false,
                    removeScriptTypeAttributes:     true,
                    removeStyleLinkTypeAttributes:  true,
                    minifyCSS: true
                },
                module:"CondoAlly",
                prefix:'/'
            }
        }
    },

    // Make the ally-app-bundle.js file which contains all of the AngularJS app code
    concat: {
        allyAppBundle: {
            src : ['website/ngApp/**/*.js',
                    '!website/ngApp/ally-app-bundle.js',
                    '!website/ngApp/ally-app-bundle.min.js'],
            dest : 'website/ngApp/ally-app-bundle.js'
        }
    },

    // Minify the app, libraries, and Angular templates JS files
    uglify: {
        options: {
            banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
        },

        allyAppBundleMin:{
            files:{
                'website/ngApp/ally-app-bundle.min.js': ['website/ngApp/ally-app-bundle.js']
            }
        },

        allyLibTop:{
            options:{
                output:{
                    comments:/^!/
                }
            },
            files:{
                'website/js/AllyLibTop.min.js': allyLibTopFiles
            }
        },

        allyLibBottom:{
            options:{
                output:{
                    comments:/^!/
                },
                mangle:false
            },
            files:{
                'website/js/AllyLibBottom.min.js': [
                    'website/js/lib/jquery/jquery.jeditable.mini.js',
                    'website/js/lib/jquery/jquery.maskedinput.js',
                    'website/js/lib/jquery/jquery.validate.min.js',
                    'website/js/lib/jquery/jquery.timepicker.js',
                    'website/js/lib/jquery/jquery.csv.min.js',
                    'website/js/lib/jquery/livestamp.min.js',
                    'website/js/lib/calendar/fullcalendar.js',
                    'website/js/lib/other/diQuery-collapsiblePanel.js',
                    'website/js/lib/other/jquery.qtip.min.js',
                    'website/js/lib/other/xeditable.min.js',
                    'website/js/lib/other/FileUpload/jquery.fileupload.js',
                    'website/js/lib/other/FileUpload/jquery.iframe-transport.js',
                    'website/js/lib/other/FileUpload/vendor/jquery.ui.widget.js',
                    'website/js/lib/other/clipboard.js',
                    'website/js/lib/other/popper.min.js',
                    'website/js/lib/other/tether.min.js',
                    'website/js/lib/other/bootstrap.bundle.min.js',
                    'website/js/lib/other/md5.js'
                ]
            }
        },

        templates:{
            files:{
                'website/ngTemplates.min.js': ['website/ngTemplates.js']
            }
        }
    },

    // Compile SASS files into CSS
    sass: {
        options: {
            implementation: sass,
            sourceMap: false
        },
        dist: {
            files: {
                'website/assets/compiled-css/style.css': 'website/assets/scss/style.scss'
            }
        }
    },

    // Minify the CSS
    cssmin: {
        dist: {
            files: {
                'website/assets/compiled.min.css': [
                    'website/third-party-css/font-awesome.css',
                    'website/third-party-css/jquery.selectbox.css',
                    'website/third-party-css/jquery.mCustomScrollbar.css',
                    'website/third-party-css/jquery-ui-1.10.3.custom.css',
                    'website/third-party-css/ng-tags-input.css',
                    'website/third-party-css/editor.css',
                    'website/third-party-css/animate.css',
                    'website/third-party-css/diQuery-collapsiblePanel.css',
                    'website/third-party-css/xeditable.css',
                    'website/third-party-css/ng-grid.min.css',
                    'website/js/lib/ui-grid/ui-grid.css',
                    'website/third-party-css/angular-chart.css',
                    'website/third-party-css/jquery.qtip.min.css',
                    'website/third-party-css/jquery.timepicker.css',
                    'website/third-party-css/angular-wizard.min.css',
                    'website/third-party-css/isteven-multi-select.css',
                    'website/assets/lib/fullcalendar/fullcalendar.min.css',
                    'website/assets/compiled-css/bootstrap.min.css',
                    'website/assets/compiled-css/style.css'
                ]
            }
        }
    },

    // Rebuild on any templates, app code, and CSS when changes are detected
    watch: {
        ts:{
            files: ['**/*.ts'],
            tasks: ['ally-app-bundle-task'],
            options:{ livereload: 35735 }
        },
        
        templates:{
            files: ['website/ngApp/**/*.html'],
            tasks: ['ngtemplates', 'uglify:templates'],
            options:{ livereload: 35735 }
        },

        // allyAppBundle: {
        //     files: ['website/ngApp/**/*.js',
        //             '!website/ngApp/ally-app-bundle.js',
        //             '!website/ngApp/ally-app-bundle.min.js'],
        //     tasks: ['ally-app-bundle', 'uglify:allyAppBundleMin']
        // },

        css: {
            files: ['website/third-party-css/**/*.css',
                'website/assets/**/*.css',
                'website/assets/**/*.scss',
                '!website/assets/compiled-css/style.css',
                '!website/assets/compiled.min.css'],
            tasks: ['css-only'],
            options:{ livereload: 35735 }
        },

        allyLibTop: {
            files: allyLibTopFiles,
            tasks: ['uglify:allyLibTop'],
            options:{ livereload: 35735 }
        }
    },

    ts: {
        default : {
            tsconfig: './website/tsconfig.json',
            options: {
                compiler: './node_modules/typescript/bin/tsc',
                comments: true,
                sourceMap: false
            },
            src: ['website/ngApp/**/*.ts']
        }
    },

    copy: {
        dist: {
            files: [
                {
                    expand: true,
                    cwd: 'website/',
                    src: [
                        "404.html",
                        "error-page.html",
                        "favicon.ico",
                        "index.html",
                        "ngTemplates.min.js",
                        "PrivacyPolicy.html",
                        "robots.txt",
                        "sitemap.xml",
                        "TermsOfService.html",
                        "js/AllyLibBottom.min.js",
                        "js/AllyLibTop.min.js",
                        "js/AllyLibBottom.min.js",
                        "assets/compiled.min.css",
                        "assets/images/**",
                        "assets/files/**",
                        "ngApp/ally-app-bundle.js",
                        "ngApp/ally-app-bundle.min.js",
                        "third-party-css/fontawesome-webfont.woff",
                        "third-party-css/fontawesome-webfont.ttf",
                        "js/lib/ui-grid/ui-grid.woff",
                        "js/lib/ui-grid/ui-grid.ttf",
                    ],
                    dest: 'dist/'
                },
                {expand: true, src: ['path/*'], dest: 'dest/', filter: 'isFile'}
            ]
        }
    },

    clean: {
        dist: ['dist']
    },

    connect: {
        server: {
            options: {
                hostname: "localhost",
                livereload: 35735,
                base: 'website/',
                port: 8085,
                open: true
            }
        }
    }
});

    // Load the plugins
    grunt.loadNpmTasks('grunt-angular-templates');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-sass');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-ts');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-connect');

    // Build the Angular templates, app code, and CSS
    grunt.registerTask('default', ['ngtemplates','ts','concat:allyAppBundle','uglify:allyAppBundleMin','uglify:templates','sass', 'cssmin']);

    // Compile the SASS and minify the CSS
    grunt.registerTask('css-only', ['sass', 'cssmin']);

    // Only build the app code file
    grunt.registerTask('ally-app-bundle-task', ['ts','concat:allyAppBundle','uglify:allyAppBundleMin']);

    // Only build the top and bottom file
    grunt.registerTask('js-lib', ['uglify:allyLibTop','uglify:allyLibBottom']);

    // Build everything, including the full JS libraries
    grunt.registerTask('full', ['ngtemplates','concat','uglify','sass', 'cssmin']);

    grunt.registerTask('make-dist', ['clean:dist', 'copy:dist']);

    // Start web server
    grunt.registerTask('serve', ['connect:server','watch']);
};