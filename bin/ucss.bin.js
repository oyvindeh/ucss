#!/usr/bin/env node
/* global module */

var ucss = require('../lib/ucss');
var optimist = require('optimist');


/**
 * Read configuration file
 */
function openConfig (filename) {
  var config;
  try {
    config = require(filename);
  } catch (e) {
    try {
      config = require(process.cwd() + '/' + filename);
    } catch (e) {
      console.log("Problems reading file '" + filename + "'.");
      console.log(e.name + ': ' + e.message);
      console.log('Please check that the file exists, and has the correct permissions.');
      process.exit(1);
    }
  }

  return config;
}


/**
 * Main.
 */
function main () {
  var showHelp = function () {
    optimist.showHelp();
    console.log('Either a config file or a CSS file is required. '
                + 'If no HTML is given, uCSS will only look for duplicate CSS.'
                + '\nIf no arguments are specified, uCSS will assume there is a '
                + 'config_ucss.js file in the current directory.');
  };

  // Arguments parsing
  var argv = optimist.usage('Check if CSS selectors matches anything in given HTML.\n'
                            + 'Usage: $0 [OPTION]...')
      .options({
        help: {
          description: 'This help text.'
        },
        html: {
          alias: 'h',
          description: 'HTML to load (local file or URL).'
        },
        css: {
          alias: 'c',
          description: 'CSS to load (local file or URL).'
        },
        config: {
          alias: 'g',
          description: 'Config file to use.'
        },
        full: {
          alias: 'f',
          description:
          'Show full report, with details for each rule.'
        },
        silent: {
          alias: 's',
          description: 'Only output list of rules. Nice if you need to pipe the output somewhere.'
        },
        duplicates: {
          alias: 'd',
          description: 'Show duplicates. If only CSS is given, this is enabled by default.'
        }
      }).argv;

  if (argv.help) {
    showHelp();
    process.exit(0);
  }

  if (undefined === argv.config) {
    argv.config = true;
  }
  if (undefined === argv.full) {
    argv.full = false;
  }
  if (undefined === argv.duplicates) {
    argv.duplicates = false;
  }

  var silent = true;
  if (undefined === argv.silent) {
    silent = false;
  }

  // CSS or config file is required
  var config = null;
  var cssIsSet = typeof argv.css === 'string';
  if (cssIsSet) {
    // Do stuff with html & css
    argv.config = false;
  } else if (typeof argv.config === 'string') {
    // Use config file
    config = openConfig(argv.config);
  } else if (argv.config === true) {
    // Search for config.json
    config = openConfig(process.cwd() + '/config_ucss.js');
  } else {
    showHelp();
  }

  // Read from config, if it was found
  var css, pages, whitelist, auth, headers, timeout, logger, resultHandler;
  if (config) {
    css = config.css;
    pages = config.pages || null;
    whitelist = config.whitelist;
    auth = config.auth;
    timeout = config.timeout;
    headers = config.headers;

    if (config.output) {
      if (undefined !== config.output.logger) {
        logger = config.output.logger;
      }
      if (undefined !== config.output.result) {
        resultHandler = config.output.result;
      }
    }
  } else { // No config, using CSS and HTML arguments
    css = argv.css;

    if (argv.html) {
      pages = { 'crawl': argv.html };
    } else {
      pages = null;
    }
  }

  // Set up logger (custom, or default)
  if (typeof logger === 'undefined' && !silent) {
    logger = require('../lib/helpers/output').logger;
  }

  var done;
  if (typeof resultHandler === 'undefined') {
    done = function (result) {
      var gotHtml = pages ? true : false;

      require('../lib/helpers/output').report(
        result, argv.full, silent, argv.duplicates, gotHtml);

      process.exit(0);
    };
  } else {
    done = resultHandler;
  }

  var context = {
    whitelist: whitelist,
    auth: auth,
    headers: headers,
    timeout: timeout
  };

  ucss.analyze(pages, css, context, logger, done);
}

if (require.main === module) {
  main();
}
