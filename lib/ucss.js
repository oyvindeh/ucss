/* global module */


var fs = require('fs');
var async = require('async');
var cssom = require('cssom');
var cheerio = require('cheerio');
var url = require('url');
var crypto = require('crypto');
var request = require('request');
var Q = require('q');


var ucss = {
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

        Q.fcall(function() { return self.css.getSelectors(self.css, css); })
        .then(function(res) {
            var selectors = res.selectors;
            var result = res.result;
            // TODO: Use context object
            self.html.matchSelectors(self.html, pages, cookie, selectors,
                                            whitelist, result, doneCallback);
            }
        ).done();
    }
};


ucss.css = {
    /**
     * Get CSS selectors from CSS
     * @param {Array} css CSS to search through. This can be either an array
     *         of Strings (containing CSS), an array of URIs to CSS files, or
     *         an array of paths to CSS files.
     * @param {Function} doneCallback Callback for when done. Should take two
     *         arguments, one list of selectors and one set of results (see
     *         documentation for _processItem for more info on these)
     */
    getSelectors: function(self, css) {
        var deferred = Q.defer();

        var result = { used: {}, duplicates: {}, ignored: {} };
        var foundSelectors = {}; // Selectors found in CSS file, with count
        var selectors = []; // Selectors to search for in HTML

        // Find all selectors
        async.forEach(css, function(item, forEachCallback) {
            if (0 === item.indexOf("http")) { // From URI
                var options = { uri: item };

                request.get(options, function(error, res, data) {
                        foundSelectors = self._extractSelectorsFromString(
                            self, data, foundSelectors);
                        forEachCallback();
                });

                return;
            } else if (-1 === item.indexOf("{")) { // From file
                try {
                    item = fs.readFileSync(item).toString(); // TODO: Could this be async?
                } catch (e) {
                    console.log(e.message);
                }
                foundSelectors = self._extractSelectorsFromString(self, item, foundSelectors);
            } else { // From string
                foundSelectors = self._extractSelectorsFromString(self, item, foundSelectors);
            }

            forEachCallback();
        }, function(err) {
            if (err) {
                // TODO: Error handling
            }

            if (!foundSelectors) {
                return null;
            }
            for (var selector in foundSelectors) {
                if ("" === selector) {
                    continue;
                }
                selectors.push(selector);
                if (foundSelectors[selector] > 1) {
                    result.duplicates[selector] = foundSelectors[selector];
                }
            }
            var obj = {};
            obj.selectors = selectors;
            obj.result = result;

            deferred.resolve(obj);
        });

        return deferred.promise;
    },

    /**
     * Find selectors in CSS string
     * @param {String} css CSS code
     * @param {Object} foundSelectors (optional) object to append found selectors
     *        to. Also keeps count (e.g. {'.foo': 2})
     * @returns {Object} Object containing found selectors, and number of
     *           occurences for each selector.
     */
    _extractSelectorsFromString: function(self, css, foundSelectors) {
        if (!foundSelectors) {
            foundSelectors = {};
        }
        if (!css) {
            return foundSelectors;
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
        for (var i=0, l=unsupported.length; i<l; i++) {
            css = css.replace(unsupported[i], "");
        }

        var styles = cssom.parse(css);
        var rules = styles.cssRules;

        if (!rules) {
            return foundSelectors;
        }

        foundSelectors = self._getSelectorsFromRules(self, rules, foundSelectors);

        return foundSelectors;
    },

    // TODO: Add docstring
    _getSelectorsFromRules: function(self, rules, selectors) {
        for (var i=0, l=rules.length; i<l; i++) {
            var rule = rules[i];

            // @-rules are ignored, except media queries. For media queries,
            // child rules are handled. Other rules are handled as if they
            // have a selector text.
            //
            // @media:
            if (rule.media && rule.cssRules) {
                selectors = self._getSelectorsFromRules(self, rule.cssRules, selectors);

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

                for (var j=0, sl=selectorList.length; j<sl; j++) {
                    var s = selectorList[j].trim();
                    selectors[s] = (selectors[s] || 0) + 1;
                }
            }
        }
        return selectors;
    }
};


ucss.html = {
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
    matchSelectors: function(self, pages, cookie, selectors,
                             whitelist, result, doneCallback) {
        var processed = [];

        var i, l;

        // Handle excludes (except subdomains, which will be handled during crawl)
        // Add to processed, so they won't be visited
        // TODO: Could this be simplified, i.e. by merging this code with the code
        // inside q? Also, are there any hidden pitfalls here where something may
        // be crawled even if it shouldn't?
        var excludedSubdomains = [];
        if (pages.exclude) {
            for (i=0, l=pages.exclude.length; i<l; i++) {
                var current = pages.exclude[i];
                if (current.indexOf("*") !== -1) {
                    excludedSubdomains.push(current.substring(0, current.length - 1));
                    continue;
                }

                var hash = crypto.createHash('md5').update(current + cookie).digest("hex");
                processed.push(hash);
            }
        }

        var queue = async.queue(function(item, queueCallback) {
            // If under excluded domain, skip
            for (var i=0; i<excludedSubdomains.length; i++) {
                var excluded = excludedSubdomains[i];
                if (item.page.indexOf(excluded) === 0) {
                    queueCallback();
                    return;
                }
            }

            // If in processed, skip (may have been in excluded list)
            var hash1 = crypto.createHash('md5').update(item.page).digest("hex");
            var hash2 = crypto.createHash('md5').update(item.page + item.cookie).digest("hex");
            if (-1 < processed.indexOf(hash1) || -1 < processed.indexOf(hash2)) {
                queueCallback();
                return;
            }

            // TODO: Refactor away some of the callback complexity?
            self._getHtmlAsString(self, item,
                             queue, processed,
                             function(htmlString, uri, followLinks) {
                self._processHtmlString(self, htmlString, followLinks, uri,
                                        selectors, whitelist, cookie, result,
                                        processed, queue, queueCallback);
            }, queueCallback); // Passing queue callback, in case it needs to abort
        }, 8);

        queue.drain = function() { // TODO: Handle err
            if (doneCallback) { doneCallback(result);}
        };

        // Crawl to find all HTML links
        if (pages.crawl) {
            for (i=0, l=pages.crawl.length; i<l; i++) {
                queue.push({page: pages.crawl[i], followLinks: true, cookie: null});

                if (cookie) {
                    queue.push({page: pages.crawl[i], followLinks: true, cookie: cookie});
                }
            }
        }

        if (pages.include) {
            for (i=0, l=pages.include.length; i<l; i++) {
                queue.push({page: pages.include[i], followLinks: false, cookie: null});

                if (cookie) {
                    queue.push({page: pages.include[i], followLinks: false, cookie: cookie});
                }
            }
        }
    },

    // TODO: Rename. Add docstring. Clean up parameters.
    _processHtmlString: function(self, html, followLinks, currentUri, selectors, whitelist, cookie, result, processed, queue, queueCallback) {
        var document = cheerio.load(html);

        if (followLinks) { // look for links in document, add to queue
            var links = document("a");
            if (links.length) {
                for (var i=0, l=links.length; i<l; i++) {
                    self._handleLink(links[i], processed, currentUri, followLinks, queue, cookie);
                }
            }
        }

        // Process current document
        self._matchSelectorsInString(document, selectors, whitelist, result, queueCallback);
    },

    _handleLink: function(link, processed, currentUri, followLinks, queue, cookie) {
        link = link.attribs.href;
        var hash2 = crypto.createHash('md5').update(link).digest("hex");
        if (-1 === processed.indexOf(hash2)) { // If not processed yet, process
            if (0 === link.indexOf(currentUri)) { // current domain
                queue.push({page: link, followLinks: followLinks});

                // TODO: Nesting too deep
                if (cookie) {
                    queue.push({page: link, followLinks: followLinks, cookie: cookie});
                }
            } else if (0 === link.indexOf("http")) { // another
                // Skip, another domain
            } else {
                // TODO: Nesting too deep
                if (currentUri) {
                    link = url.resolve(currentUri, link);
                    queue.push({page: link, followLinks: followLinks});

                    if (cookie) {
                        queue.push({page: link, followLinks: followLinks, cookie: cookie});
                    }
                } else {
                    console.log("Could not resolve " + link);
                }
            }
        }
    },

    // TODO: Rename. Add docstring. Clean up parameters.
    _matchSelectorsInString: function(htmlString, selectors, whitelist, result, queueCallback) {
        // Loop through selectors
        for (var k=0, l=selectors.length; k<l; k++) {
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
                    if (htmlString(selector).length > 0) {
                        result.used[oSelector] =
                            result.used[oSelector]
                            + htmlString(selector).length;
                    }
                } catch (e) {
                    console.log("Problem with selector: "
                                + oSelector);
                }
            }
        }
        queueCallback();
    },

    // TODO: Add docstring. Clean up parameters.
    _getHtmlAsString: function(self, item, q, processed, receivedHtmlCallback, queueCallback) {
        var page = item.page;
        var followLinks = item.followLinks;
        var cookie = item.cookie || null;
        var hash = crypto.createHash('md5').update(page + cookie).digest("hex");

        if (-1 < processed.indexOf(hash)) {
            queueCallback();
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
                                       receivedHtmlCallback(data, uri, followLinks);
                                   });
        } else if (-1 === page.indexOf("<html>")) { // From file
            try {
                page = fs.readFileSync(page).toString();
            } catch (e) {
                console.log(e.message);
            }
            receivedHtmlCallback(page, null, followLinks);
        } else { // From string
            receivedHtmlCallback(page, null, followLinks);
        }
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
