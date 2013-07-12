/* global module */

var Q = require('q');


var ucss = {
    css: require('../lib/css'),
    html: require('../lib/html'),

    /**
     * Search for (match) selectors used in HTML.
     * @param {Object} Context object, containing CSS, HTML, whitelist, and
     *         cookie.
     *
     *         css: The CSS to search through. This can be either an array
     *         of Strings (containing CSS), an array of URIs to CSS files, or
     *         an array of paths to CSS files.
     *
     *         html: The HTML to search through. This can be either an array
     *         of Strings (containing html code), an array of URIs to visit, or
     *         an array of paths to html files.
     *
     *         cookie: Cookie to use for login, on the form
     *         "sessionid=foo". Each uri in the html parameter will
     *         be visited both with and without the cookie.
     *
     *         whitelist: Array of selectors to ignore.
     */
    search: function(context, doneCallback) {
        var css = context.css;
        var pages = context.pages;
        var cookie = context.cookie;
        var whitelist = context.whitelist;
        var result = { used: {}, duplicates: {}, ignored: {} };

        var self = this;

        Q.fcall(function() {
            return self.css.getSelectors(self.css, css);
        })
        .then(function(fulfillment) {
            // TODO: Use context object
            result.duplicates = fulfillment.duplicates;

            return self.html.matchSelectors(self.html, pages, cookie,
                                            fulfillment.selectors, whitelist);
        })
        .then(function(fulfillment) {
            result.used = fulfillment.used;
            result.ignored = fulfillment.ignored;

            doneCallback(result);
        })
        .done();
    }
};


module.exports = {
    /**
     * Analyze CSS: Find number of times a selector has been used, and if
     * there are duplicates.
     *
     * @param {String} cssPath Path to css file
     * @param {String} html Html code or URI to html code.
     * @param {Object} auth (optional) Login info on the form
     *         {username: "", password: "", loginUrl: "", loginFunc: ""}
     *         where loginFunc can be a function, or the name of a
     *         login helper (see loginhelpers.js).
     * @param {Function} done Function to execute when done. An object on the
     *         form { "<selector>": count } is passed to it, where count is the
     *         number of occurnces of <selector>.
     */
    analyze: function(context, done) {
        // Check that needed resources is available
        if (undefined === context.pages.crawl && undefined === context.pages.include) {
            console.log("No HTML given, nothing to do.");
            done({});
            return null;
        }
        if (undefined === context.css) {
            console.log("No CSS given, nothing to do.");
            done({});
            return null;
        }

        // Make sure resources is given as lists
        if (context.pages.include) {
            if (!(context.pages.include instanceof Array)) {
                context.pages.include = [context.pages.include];
            }
        }
        if (context.pages.crawl) {
            if (!(context.pages.crawl instanceof Array)) {
                context.pages.crawl = [context.pages.crawl];
            }
        }
        if (context.pages.exclude) {
            if (!(context.pages.exclude instanceof Array)) {
                context.pages.exclude = [context.pages.exclude];
            }
        }
        if (!(context.css instanceof Array)) {
            context.css = [context.css];
        }

        // Default result handler
        done = done ? done : function(result) {
            console.log("\nresult: ", result);
        };

        var auth = context.auth ? context.auth : null;

        // If login info is given, do login.
        if (auth) {
            var loginFunc;
            var username = auth.username;
            var password = auth.password;
            var loginUrl = auth.loginUrl;

            if (auth.loginFunc instanceof Function) {
                loginFunc = auth.loginFunc;
            } else {
                loginFunc = require('./helpers/login')[auth.loginFunc];
            }

            loginFunc(loginUrl, username, password, function(cookie) {
                context.cookie = cookie;
                ucss.search(context, done);
            });
        } else {
            ucss.search(context, done);
        }
    }
};