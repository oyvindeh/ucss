#!/usr/bin/env node
/* jshint: */
/*global module console process assert require fs:true sinon:true */

var ucss = require('../lib/ucss');
var fs = require('fs');
var optimist = require('optimist');


/**
 * Main.
 */
function main() {
    var showHelp = function() {
        optimist.showHelp();
        console.log("Either a config file, or HTML and CSS files are required. "
                    + "If no arguments are specified, uCSS will look for a "
                    + "ucss.json file in the current directory.");
    };

    var argv = optimist.usage('Check if CSS selectors matches anything in given HTML.\n'
                            + 'Usage: $0 [OPTION]...')
        .options({
            help: {
                description: 'This help text.'
            },
            html: {
                alias : 'h',
                description : 'HTML to load.'
            },
            css: {
                alias : 'c',
                description : 'CSS to load.'
            },
            config: {
                alias : 'g',
                description : 'Config file to use.',
                "default": true
            },
            used: {
                alias : 'u',
                description :
                    'Show numbers on used rules, in addition to unused rules.',
                "default": false
            },
            nosummary: {
                alias : 'n',
                description : 'Output summary.',
                "default": false
            },
            duplicates: {
                alias : 'd',
                description : 'Show duplicates.',
                "default": false
            }
        }).argv;

    if (argv.help) {
        showHelp();
        process.exit(0);
    }

    var config = null;

    var openConfig = function(filename) {
        var config;
        try {
            config = require(filename);
        } catch (e) {
            console.log("Problems reading file '" + filename + "'.");
            console.log(e.name + ": " + e.message);
            console.log("Please check that the file exists, and has the correct permissions.");
            process.exit(1);
        }

        return config;
    };

    // Either HTML and CSS, or config is required
    var htmlSet = typeof argv.html === "string";
    var cssSet  = typeof argv.css  === "string";
    if (htmlSet && cssSet) {
        // Do stuff with html & css
        argv.config = false;
    } else if (typeof argv.config  === "string") {
        // Use config file
        config = openConfig(argv.config);
    } else if (argv.config === true) {
        // Search for config.json
        config = openConfig(process.cwd() + "/config_ucss.js");
    } else {
        showHelp();
    }

    var css, html, whitelist, auth;
    if (config) {
        css = config.css;
        html = config.html;
        whitelist = config.whitelist;
        auth = config.auth;
    } else {
        css = argv.css;
        html = argv.html;
    }

    // Custom output function
    var done = function(result) {
        require('../lib/helpers/output').standard(
            result, argv.used, !argv.nosummary, argv.duplicates);
    };

    ucss.analyze(css, html, whitelist, auth, done);
}


if (require.main === module) {
    main();
}
