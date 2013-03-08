/* jshint: */
/*global module buster ucss:true public_functions:true*/


var jsdom = require('jsdom');
var jQuery = require('jquery');
var fs = require('fs');
var async = require('async');
var cssom = require('cssom');


var ucss = {
    /**
     * Find selectors in CSS string
     * @param {String} css CSS code
     * @param {Object} selectors (optional) object to append matched selectors
     *        to.
     * @returns {Object} Object containing matched selectors, and number of
     *           occurences for each selector.
     */
    _extractSelectors: function(css, selectors) {
        if (!css) return {};
        if (!selectors) selectors = {};

        var styles = cssom.parse(css);
        if (!styles.cssRules) return;
        var rules = styles.cssRules;

        // Shake object so that selectors fall out
        var _shake = function(rules) {
            for (var i=0; i<rules.length; i++) {
                var rule = rules[i];

                // @-rules are ignored, except media queries. For media queries,
                // child rules are handled. Other rules are handled as if they
                // have a selector text.
                //
                // @media:
                if (rule.media && rule.cssRules) {
                    selectors = _shake(rule.cssRules);

                // Rules without selectorText are not processed (@-rules,
                // except @media)
                } else if (!rule.selectorText) {
                    // Cleaning: Only want the first part (e.g. @font-face),
                    // not full rule
                    var sel = rule.cssText.split("{")[0].trim();
                    selectors[sel] = null;

                // Other rules, containing selector(s)
                } else {
                    var selectorGroup = rule.selectorText;

                    // Several selectors can be grouped together, separated by
                    // comma, e.g. ".foo, .bar":
                    var selectorList = selectorGroup.split(",");

                    for (var j=0; j<selectorList.length; j++) {
                        var s = selectorList[j].trim();
                        if (undefined === selectors[s]) {
                            selectors[s] = 1;
                        } else {
                            selectors[s]++;
                        }
                    }
                }
            }
            return selectors;
        };

        selectors = _shake(rules);

        return selectors;
    },

    /**
     * Search for (match) selectors used in HTML.
     * @param {Object} Context object, containing CSS, HTML, whitelist, and
     *         cookie.
     *
     *         css: The CSS to search through. This can be either an array
     *         of Strings (containing CSS), an array of URLs to CSS files, or
     *         an array of paths to CSS files.
     *
     *         html: The HTML to search through. This can be either an array
     *         of Strings (containing html code), an array of URLs to visit, or
     *         an array of paths to html files.
     *
     *         cookie: Cookie to use for login, on the form
     *         "sessionid=foo". Each url in the html parameter will
     *         be visited both with and without the cookie.
     *
     *         whitelist: Array of selectors to ignore.
     * @param {Function} donecb Callback for when done. Should take a result
     *         object as argument.
     */
    search: function(context, donecb) {
        var css = context.css;
        var html = context.html;
        var cookie = context.cookie;
        var whitelist = context.whitelist;

        if ((html == false || css == false)) {
            donecb({});
            return null;
        }

        var self = this;

        self._collectCssSelectors(css, function(selectors, result) {
            self._processHtml(self, html, cookie, selectors,
                              whitelist, result, donecb);
        });
    },

    /**
     * Get CSS selectors from CSS
     * @param {Array} css CSS to search through. This can be either an array
     *         of Strings (containing CSS), an array of URLs to CSS files, or
     *         an array of paths to CSS files.
     * @param {Function} donecb Callback for when done. Should take two
     *         arguments, one list of selectors and one set of results (see
     *         documentation for _processHtml for more info on these)
     */
    _collectCssSelectors: function(css, donecb) {
        var result = { used: {}, duplicates: {}, ignored: {} };
        var matchedSelectors = {} // Selectors matched in CSS file
        ,   selectors = []; // Selectors to search for in HTML

        // Find all selectors
        async.forEach(css, function(item, callback) {
            if (0 === item.indexOf("http")) { // From URL
                var url = item;
                var parts = require('url').parse(url);
                var protocol = parts.protocol.replace(":", "");
                var port = parts.port;

                if (!port) {
                    port = ("https" === protocol) ? 443: 80;
                }
                var options = { host: parts.host.split(":")[0],
                                port: port,
                                path: parts.path };
                require(protocol).get(options, function(res) {
                    var data = "";
                    res.on('data', function (chunk) {
                        data += chunk.toString();
                    }).on('end', function() {
                        matchedSelectors = ucss._extractSelectors(
                            data, matchedSelectors);
                        callback();
                    });
                });

                return;
            } else if (-1 === item.indexOf("{")) { // From file
                try {
                    item = fs.readFileSync(item).toString();
                } catch (e) {
                    console.log(e.message);
                }
                matchedSelectors = ucss._extractSelectors(item, matchedSelectors);
            } else { // From string
                matchedSelectors = ucss._extractSelectors(item, matchedSelectors);
            }

            callback();
        }, function(err) {
            if (!matchedSelectors) return null;
            for (var selector in matchedSelectors) {
                if ("" === selector) continue;
                selectors.push(selector);
                if (matchedSelectors[selector] > 1) {
                    result.duplicates[selector] = matchedSelectors[selector];
                }
            }
            if (donecb) donecb(selectors, result);
        });
    },

    /*
     * Go through HTML to match CSS selectors
     * @param {Object} self Reference to context
     * @param {Array} html Html to search through. This can be either an array
     *         of Strings (containing html code), an array of URLs to visit, or
     *         an array of paths to html files.
     * @param {String} cookie Cookie to use for login, on the form
     *         "sessionid=foo". Each url in the html parameter will
     *         be visited both with and without the cookie.
     * @param {String} whitelist List of selectors to ignore.
     * @param {Array} selectors Array of CSS selectors
     * @param {Object} result Object on the form { used: { ".foo": 1 },
     *                                             duplicates: { ".bar": 0 } }
     * @param {Function} donecb Function to execute when done. An object on the
     *         form { "<selector>": count } is passed to it, where count is the
     *         number of occurnces of <selector>.

     */
    _processHtml: function(self, html, cookie, selectors,
                           whitelist, result, donecb) {
        // If cookie is provided, duplicate all html instances, and add login
        // info to one of each.
        var items = [];
        if (cookie) {
            for (var i=0;i<html.length;i++) {
                items.push({ html: html[i], cookie: "" });
                items.push({ html: html[i], cookie: cookie });
            }
        } else {
            items = html;
        }

        // Search html for selectors
        async.forEach(items, function(item, callback) {
            var html = item.html ? item.html : item
            ,   cookie = item.cookie ? item.cookie : "";

            jsdom.env({
                html: html,
                headers: { 'Cookie': cookie },
                done: function(errors, window) {
                    // !TODO: jQuery should probably be replaced by Sizzle,
                    // or some other selector engine.
                    var $ = jQuery.create(window);
                    for (var i=0; i<selectors.length; i++) {
                        var selector = selectors[i];

                        // If current selector is whitelisted, skip.
                        if (whitelist && -1 < whitelist.indexOf(selector)) {
                            continue;
                        }
                        if (-1 < selector.indexOf("@")) {
                            result.ignored[selector] = 1;
                            continue;
                        }

                        if (selector) {
                            var oSelector = selector;

                            // Add selector to index, if not already added
                            if (undefined === result.used[oSelector]) {
                                result.used[oSelector] = 0;
                            }

                            // Remove pseudo part of selector
                            selector = selector.split(":")[0];

                            // Check if selector is used
                            try {
                                if ($(selector).length > 0) {
                                    result.used[oSelector] =
                                        result.used[oSelector]
                                        + $(selector).length;
                                }
                            } catch (e) {
                                console.log("Problem with selector: "
                                            + oSelector);
                            }
                        }
                    }
                    callback();
                }
            });
        }, function(err) { if (donecb) donecb(result); });
    }
};


module.exports = {
    /**
     * Analyze CSS: Find number of times a selector has been used, and if
     * there are duplicates.
     *
     * @param {String} cssPath Path to css file
     * @param {String} html Html code or URL to html code.
     * @param {Object} auth (optional) Login info on the form
     *         {username: "", password: "", loginUrl: "", loginFunc: ""}
     *         where loginFunc can be a function, or the name of a
     *         login helper (see loginhelpers.js).
     * @param {Function} done Function to execute when done. An object on the
     *         form { "<selector>": count } is passed to it, where count is the
     *         number of occurnces of <selector>.
     */
    analyze: function(css, html, whitelist, auth, done) {
        if (!(html instanceof Array)) html = [html];
        if (!(css instanceof Array)) css = [css];

        // Default result handler
        done = done ? done : function(result) {
            console.log("\nresult: ", result);
        };

        var context = {
            css: css,
            html: html,
            cookie: null,
            whitelist: whitelist
        };

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
