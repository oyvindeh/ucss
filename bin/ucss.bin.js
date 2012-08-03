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
            spec: {
                alias : 's',
                description : 'Spec file to use.',
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
        optimist.showHelp();
        console.log("Either a spec file, or HTML and CSS files are required.\n");
        process.exit(0);
    }

    var spec = null;

    var openSpec = function(filename) {
        var spec;
        try {
            spec = fs.readFileSync(filename).toString();
        } catch (e) {
            console.log("Problems reading file '" + filename + "'.");
            console.log(e.name + ": " + e.message);
            console.log("Please check that the file exists, and has the correct permissions.");
            process.exit(1);
        }

        try {
            spec = JSON.parse(spec);
        } catch (e) {
            console.log("Problems parsing file '" + filename + "'.");
            console.log(e.name + ": " + e.message);
            console.log("Please check the formatting of the file.");
            process.exit(1);
        }
        return spec;
    };

    // Either HTML and CSS, or spec is required
    var htmlSet = (typeof argv.html === "string") ? true : false;
    var cssSet  = (typeof argv.css  === "string") ? true : false;
    if (htmlSet && cssSet) {
        // Do stuff with html & css
        argv.spec = false;
    } else if (typeof argv.spec  === "string") {
        // Use spec file
        spec = openSpec(argv.spec);
    } else if (argv.spec === true) {
        // Search for spec.json
        spec = openSpec("spec.json");
    } else {
        optimist.showHelp();
        console.log("Either a spec file, or HTML and CSS files are required.\n");
    }

    var css, html, whitelist, auth;
    if (spec) {
        css = spec.css;
        html = spec.html;
        whitelist = spec.whitelist;
        auth = spec.auth;
    } else {
        css = argv.css;
        html = argv.html;
    }

    // Custom output function
    var done = function(result) {
        require('../lib/helpers/output').standard(
            result, argv.used, !argv.nosummary, argv.duplicates);
    };

    ucss.analyze(css, html, whitelist, null, done);
}


if (require.main === module) {
    main();
}
