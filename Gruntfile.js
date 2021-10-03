const sass = require('node-sass');

module.exports = function(grunt) {

var allyLibTopFiles = [
    'Website/js/lib/jquery/jquery-1.12.4.js',
    'Website/js/lib/angular/core/angular.js',
    'Website/js/lib/angular/core/angular-resource.js',
    'Website/js/lib/angular/core/angular-route.js',
    'Website/js/lib/angular/core/angular-sanitize.js',
    'Website/js/lib/angular/third-party/ng-date.js',
    'Website/js/lib/angular/third-party/ng-grid-2.0.11.min.js',
    'Website/js/lib/angular/third-party/ng-grid-flexible-height.js',
    'Website/js/lib/angular/third-party/ng-tags-input.js',
    'Website/js/lib/angular/third-party/angular-wizard.min.js',
    'Website/js/lib/angular/third-party/isteven-multi-select.js',
    'Website/js/lib/angular/third-party/xd-utils.js',
    'Website/js/lib/angular/third-party/xdLocalStorage.js',
    'Website/js/lib/angular/third-party/ng-xdLocalStorage.js',
    'Website/js/lib/ui-grid/ui-grid.min.js',
    'Website/js/lib/angular/third-party/angular-google-maps.min.js',
    'Website/js/lib/charts/Chart.min.js',
    'Website/js/lib/charts/angular-chart.js',
    'Website/js/lib/calendar/moment.min.js',
    'Website/js/lib/calendar/moment-timezone-with-data-10-year-range.js',
    'Website/js/lib/other/jsnlog.min.js',
    'Website/js/lib/other/lodash.compat.min.js',
    'Website/js/HtmlUtil.js',
    'Website/js/design_v2/jquery.hotkeys.js',
    'Website/js/design_v2/jquery.selectbox-0.2.min.js',
    'Website/js/design_v2/jquery.mCustomScrollbar.concat.min.js',
    'Website/js/design_v2/bootstrap-wysiwyg.js',
    'Website/js/design_v2/main.js',
    'Website/js/lib/jquery/jquery-ui-1.11.2.min.js'
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
                'Website/js/AllyLibTop.min.js': allyLibTopFiles
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
                'Website/js/AllyLibBottom.min.js': [
                    'Website/js/lib/jquery/jquery.jeditable.mini.js',
                    'Website/js/lib/jquery/jquery.maskedinput.js',
                    'Website/js/lib/jquery/jquery.validate.min.js',
                    'Website/js/lib/jquery/jquery.timepicker.js',
                    'Website/js/lib/jquery/jquery.csv.min.js',
                    'Website/js/lib/jquery/livestamp.min.js',
                    'Website/js/lib/calendar/fullcalendar.js',
                    'Website/js/lib/other/diQuery-collapsiblePanel.js',
                    'Website/js/lib/other/jquery.qtip.min.js',
                    'Website/js/lib/other/xeditable.min.js',
                    'Website/js/lib/other/FileUpload/jquery.fileupload.js',
                    'Website/js/lib/other/FileUpload/jquery.iframe-transport.js',
                    'Website/js/lib/other/FileUpload/vendor/jquery.ui.widget.js',
                    'Website/js/lib/other/clipboard.js',
                    'Website/js/lib/other/popper.min.js',
                    'Website/js/lib/other/tether.min.js',
                    'Website/js/lib/other/bootstrap.js',
                    'Website/js/lib/other/md5.js'
                ]
            }
        },

        templates:{
            files:{
                'Website/ngTemplates.min.js': ['Website/ngTemplates.js']
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
                'Website/assets/compiled-css/style.css': 'Website/assets/scss/style.scss'
            }
        }
    },

    // Minify the CSS
    cssmin: {
        dist: {
            files: {
                'Website/assets/compiled.min.css': [
                    'Website/third-party-css/font-awesome.css',
                    'Website/third-party-css/jquery.selectbox.css',
                    'Website/third-party-css/jquery.mCustomScrollbar.css',
                    'Website/third-party-css/jquery-ui-1.10.3.custom.css',
                    'Website/third-party-css/ng-tags-input.css',
                    'Website/third-party-css/editor.css',
                    'Website/third-party-css/animate.css',
                    'Website/third-party-css/diQuery-collapsiblePanel.css',
                    'Website/third-party-css/xeditable.css',
                    'Website/third-party-css/ng-grid.min.css',
                    'Website/js/lib/ui-grid/ui-grid.css',
                    'Website/third-party-css/angular-chart.css',
                    'Website/third-party-css/jquery.qtip.min.css',
                    'Website/third-party-css/jquery.timepicker.css',
                    'Website/third-party-css/angular-wizard.min.css',
                    'Website/third-party-css/isteven-multi-select.css',
                    'Website/assets/lib/fullcalendar/fullcalendar.min.css',
                    'Website/assets/compiled-css/bootstrap.css',
                    'Website/assets/compiled-css/style.css'
                ]
            }
        }
    },

    // Rebuild on any templates, app code, and CSS when changes are detected
    watch: {
        ts:{
            files: ['**/*.ts'],
            tasks: ['ally-app-bundle-task'],
            options:{ livereload: true }
        },
        
        templates:{
            files: ['Website/ngApp/**/*.html'],
            tasks: ['ngtemplates', 'uglify:templates'],
            options:{ livereload: true }
        },

        // allyAppBundle: {
        //     files: ['Website/ngApp/**/*.js',
        //             '!Website/ngApp/ally-app-bundle.js',
        //             '!Website/ngApp/ally-app-bundle.min.js'],
        //     tasks: ['ally-app-bundle', 'uglify:allyAppBundleMin']
        // },

        css: {
            files: ['Website/third-party-css/**/*.css',
                'Website/assets/**/*.css',
                'Website/assets/**/*.scss',
                '!Website/assets/compiled-css/style.css',
                '!Website/assets/compiled.min.css'],
            tasks: ['css-only'],
            options:{ livereload: true }
        },

        allyLibTop: {
            files: allyLibTopFiles,
            tasks: ['uglify:allyLibTop'],
            options:{ livereload: true }
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
            src: ['Website/ngApp/**/*.ts']
        }
    },

    copy: {
        dist: {
            files: [
                {expand: true, cwd: 'website/', src: ["404.html",
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
                    "js/lib/ui-grid/ui-grid.ttf"], dest: 'dist/'},

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
                livereload: 35729,
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
    grunt.registerTask('default', ['ngtemplates','concat','uglify:allyAppBundleMin','uglify:templates','sass', 'cssmin']);

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