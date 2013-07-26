#!/usr/bin/env node
/* global module */

var ucss = require('../lib/ucss');
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
                description : 'HTML to load (local file or URL).'
            },
            css: {
                alias : 'c',
                description : 'CSS to load (local file or URL).'
            },
            config: {
                alias : 'g',
                description : 'Config file to use.'
            },
            used: {
                alias : 'u',
                description :
                    'Show number of matches for each rule.'
            },
            nosummary: {
                alias : 'n',
                description : 'Do not output summary, only list of unused rules.'
            },
            duplicates: {
                alias : 'd',
                description : 'Show duplicates.'
            }
        }).argv;

    if (argv.help) {
        showHelp();
        process.exit(0);
    }

    if(undefined === argv.config) {
        argv.config = true;
    }
    if(undefined === argv.used) {
        argv.used = false;
    }
    if(undefined === argv.nosummary) {
        argv.nosummary = false;
    }
    if(undefined === argv.duplicates) {
        argv.duplicates = false;
    }


    var config = null;

    var openConfig = function(filename) {
        var config;
        try {
            config = require(filename);
        } catch (e) {
            try {
                config = require(process.cwd() + "/" + filename);
            } catch (e) {
                console.log("Problems reading file '" + filename + "'.");
                console.log(e.name + ": " + e.message);
                console.log("Please check that the file exists, and has the correct permissions.");
                process.exit(1);
            }
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

    var css, pages, whitelist, auth;
    if (config) {
        css = config.css;
        pages = config.pages;
        whitelist = config.whitelist;
        auth = config.auth;
    } else {
        css = argv.css;
        pages = { "crawl": argv.html };
    }

    // Custom output function
    var done = function(result) {
        require('../lib/helpers/output').standard(
            result, argv.used, !argv.nosummary, argv.duplicates);
    };

    var context = {
        whitelist: whitelist,
        auth: auth
    };

    ucss.analyze(pages, css, context, done);
}


if (require.main === module) {
    main();
}
