/* jshint maxdepth:5 */
/* global module */


var fs = require('fs');
var async = require('async');
var cssom = require('cssom');
var cheerio = require('cheerio');
var url = require('url');
var crypto = require('crypto');


var ucss = {
    /**
     * Find selectors in CSS string
     * @param {String} css CSS code
     * @param {Object} selectors (optional) object to append matched selectors
     *        to.
     * @returns {Object} Object containing matched selectors, and number of
     *           occurences for each selector.
     */
    _extractSelectorsFromString: function(css, selectors) {
        if (!css) {
            return {};
        }
        if (!selectors) {
            selectors = {};
        }

        // Delete unsupported rules before CSSOM parsing, to avoid crash
        // TODO: Remove these, when/if they get supported by CSSOM
        var unsupported = [
            // "@supports { .foo { ... }}" or
            // "@-prefix-supports { .foo { ... }}"
            /@-*\w*-*supports\s.*?\}\s*?\}/g,

            // "@document url(http://example.com) { .foo { ... }}" or
            // "@-prefix-document url(http://example.com) { .foo { ... }}"
            /@-*\w*-*document\s.*?\}\s*?\}/g];
        for (var i=0; i<unsupported.length; i++) {
            css = css.replace(new RegExp(unsupported[i]), "");
        }

        var styles = cssom.parse(css);

        if (!styles.cssRules) {
            return;
        }

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
     * Get CSS selectors from CSS
     * @param {Array} css CSS to search through. This can be either an array
     *         of Strings (containing CSS), an array of URIs to CSS files, or
     *         an array of paths to CSS files.
     * @param {Function} doneCallback Callback for when done. Should take two
     *         arguments, one list of selectors and one set of results (see
     *         documentation for _processItem for more info on these)
     */
    _collectCssSelectors: function(css, doneCallback) {
        var result = { used: {}, duplicates: {}, ignored: {} };
        var matchedSelectors = {}; // Selectors matched in CSS file
        var selectors = []; // Selectors to search for in HTML

        // Find all selectors
        async.forEach(css, function(item, callback) {
            if (0 === item.indexOf("http")) { // From URI
                var uri = item;

                var options = { uri: uri };
                require('request').get(options, function(error, res, data) {
                        matchedSelectors = ucss._extractSelectorsFromString(
                            data, matchedSelectors);
                        callback();
                });

                return;
            } else if (-1 === item.indexOf("{")) { // From file
                try {
                    item = fs.readFileSync(item).toString();
                } catch (e) {
                    console.log(e.message);
                }
                matchedSelectors = ucss._extractSelectorsFromString(item, matchedSelectors);
            } else { // From string
                matchedSelectors = ucss._extractSelectorsFromString(item, matchedSelectors);
            }

            callback();
        }, function(err) {
            if (err) {
                // TODO: Error handling
            }

            if (!matchedSelectors) {
                return null;
            }
            for (var selector in matchedSelectors) {
                if ("" === selector) {
                    continue;
                }
                selectors.push(selector);
                if (matchedSelectors[selector] > 1) {
                    result.duplicates[selector] = matchedSelectors[selector];
                }
            }
            if (doneCallback) {
                doneCallback(selectors, result);
            }
        });
    },

    /*
     * Go through HTML to match CSS selectors
     * @param {Object} self Reference to context
     * @param {Array} html Html to search through. This can be either an array
     *         of Strings (containing html code), an array of URIs to visit, or
     *         an array of paths to html files.
     * @param {String} cookie Cookie to use for login, on the form
     *         "sessionid=foo". Each uri in the html parameter will
     *         be visited both with and without the cookie.
     * @param {String} whitelist List of selectors to ignore.
     * @param {Array} selectors Array of CSS selectors
     * @param {Object} result Object on the form { used: { ".foo": 1 },
     *                                             duplicates: { ".bar": 0 } }
     * @param {Function} doneCallback Function to execute when done. An object on the
     *         form { "<selector>": count } is passed to it, where count is the
     *         number of occurnces of <selector>.

     */
    _matchSelectorsInHtml: function(self, pages, cookie, selectors,
                           whitelist, result, doneCallback) {
        var processed = [];

        // Handle all excludes
        // Add to processed, so they won't be visited
        if (pages.exclude) {
            for (var i=0; i<pages.exclude.length; i++) {
                var c = pages.exclude[i];
                var hash = crypto.createHash('md5').update(c + cookie).digest("hex");
                processed.push(hash);
            }
        }

        var q = async.queue(function(item, asyncCallback) {
            // Get html

            // If in processed, skip (may have been in excluded list)
            var hash1 = crypto.createHash('md5').update(item.page).digest("hex");
            var hash2 = crypto.createHash('md5').update(item.page + item.cookie).digest("hex");
            if (-1 < processed.indexOf(hash1) || -1 < processed.indexOf(hash2)) {
                asyncCallback();
                return;
            }

            self._getRawHtml(self, item,
                             q, processed, function(html, uri, followLinks) {
                // Do something to the html
                self._crawl(self, html, followLinks, uri, selectors, whitelist,
                            result, processed, q, asyncCallback);
            }, asyncCallback); //Passing asyncCallback, in case it needs to abort
        }, 8);

        q.drain = function(err) {
            if (doneCallback) { doneCallback(result);}
        };

        // Crawl to find all HTML links
        if (pages.crawl) {
            for (var i=0; i<pages.crawl.length; i++) {
                q.push({page: pages.crawl[i], followLinks: true, cookie: null});

                if (cookie) {
                    q.push({page: pages.crawl[i], followLinks: true, cookie: cookie});
                }
            }
        }

        if (pages.include) {
            for (var i=0; i<pages.include.length; i++) {
                q.push({page: pages.include[i], followLinks: false, cookie: null});

                if (cookie) {
                    q.push({page: pages.include[i], followLinks: false, cookie: cookie});
                }
            }
        }
    },

    _crawl: function(self, html, followLinks, currentUri, selectors, whitelist, result, processed, q, callback) {
        var document = cheerio.load(html);

        // TODO: Make sure there is always an URL from which domain can be picked

        // Look for links, add to queue;
        if (followLinks) {
        var links = document("a");
            if (links.length) {
                for (var i=0; i<links.length; i++) {
                    var link = links[i].attribs.href;
                    var hash2 = crypto.createHash('md5').update(link).digest("hex");
                    if (-1 === processed.indexOf(hash2)) {
                        if (0 === link.indexOf(currentUri)) { // current domain
                            q.push({page: link, followLinks: followLinks});
                        } else if (0 === link.indexOf("http")) { // another
                            // Skip, another domain
                        } else {
                            if (currentUri) {
                                link = url.resolve(currentUri, link);
                                q.push({page: link, followLinks: followLinks});
                            } else {
                                console.log("Could not resolve " + link);
                            }
                        }
                    }
                }
            }
        }

        self._process(document, selectors, whitelist, result, callback);
    },

    _process: function(document, selectors, whitelist, result, callback) {
        // Loop through selectors
        for (var k=0; k<selectors.length; k++) {
            var selector = selectors[k];

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
                    if (document(selector).length > 0) {
                        result.used[oSelector] =
                            result.used[oSelector]
                            + document(selector).length;
                    }
                } catch (e) {
                    console.log("Problem with selector: "
                                + oSelector);
                }
            }
        }
        callback();
    },

    // TODO: Rename. resolveLinks?
    _getRawHtml: function(self, item, q, processed, processHtml, asyncCallback) {
        var page = item.page;
        var followLinks = item.followLinks;
        var cookie = item.cookie || null;
        var hash = crypto.createHash('md5').update(page + cookie).digest("hex");

        if (-1 < processed.indexOf(hash)) {
            asyncCallback();
            return;
        } else {
            processed.push(hash);
        }

        // Get page as raw html
        // If URI is given, fetch HTML
        if (0 === page.indexOf("http")) { // From URI
            var uri = page;

            var headers = {};
            if (cookie) {
                headers = {
                    "Cookie": cookie,
                    "Referer": uri
                };
            }

            var options = { uri: uri,
                            headers: headers };
            require('request').get(options, function(error, res, data) {
                                       // TODO: Error checking, response status code, etc.
                                       processHtml(data, uri, followLinks);
                                   });
        } else if (-1 === page.indexOf("<html>")) { // From file
            try {
                page = fs.readFileSync(page).toString();
            } catch (e) {
                console.log(e.message);
            }
            processHtml(page, null, followLinks);
        } else { // From string
            processHtml(page, null, followLinks);
        }
    },

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
     * @param {Function} doneCallback Callback for when done. Should take a result
     *         object as argument.
     */
    search: function(context, doneCallback) {
        var css = context.css;
        var pages = context.pages;
        var cookie = context.cookie;
        var whitelist = context.whitelist;

        var self = this;

        self._collectCssSelectors(css, function(selectors, result) {
            self._matchSelectorsInHtml(self, pages, cookie, selectors,
                                       whitelist, result, doneCallback);
        });
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
