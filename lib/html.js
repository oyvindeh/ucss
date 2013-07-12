var Q = require('q');
var async = require('async');
var crypto = require('crypto');
var url = require('url');
var cheerio = require('cheerio');


module.exports = {
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
     */
    matchSelectors: function(self, pages, cookie, selectors,
                             whitelist, result) {
        var deferred = Q.defer();
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
            deferred.resolve(result);
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

        return deferred.promise;
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
