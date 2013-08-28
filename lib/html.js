var Q = require('q');
var async = require('async');
var url = require('url');
var cheerio = require('cheerio');
var fs = require('fs');
var request = require('request');
var events = require('events');


module.exports = {
    _logger: null,

    // TODO: Document result object properly
    /**
     * Iterates through a set of HTML resources, to check for matches of given
     * CSS selectors.
     *
     * @param {Array}  pages HTML pages to search through. This can be either an
     *                 array of Strings (containing html code), an array of URIs
     *                 to visit, or an array of paths to html files.
     * @param {Object} result Result object
     * @param {String} cookie Cookie to use for login, on the form
     *                 "sessionid=foo". Each uri in the html parameter will
     *                 be visited both with and without the cookie set.
     * @param {Int}    timeout Request timeout
     * @param {Function} customLogger Custom log function
     * @returns {Promise} Result object
     */
    matchSelectors: function(pages, result, cookie, timeout, customLogger) {
        this._logger = new events.EventEmitter();
        this._logger.on('request', customLogger);

        var deferred = Q.defer();
        var processed = [];
        var i, l;
        // Handle excludes by adding them to processed, so they won't be visited
        var excludedSubdomains = [];
        if (pages.exclude) {
            for (i=0, l=pages.exclude.length; i<l; i++) {
                var current = pages.exclude[i];
                if (current.indexOf("*") !== -1) {
                    var subdomain = current.substring(0, current.length - 1);
                    if (subdomain.indexOf("http") === 0) {
                        subdomain = url.parse(subdomain).pathname;
                    }
                    excludedSubdomains.push(subdomain);
                    continue;
                }

                processed.push(current.split("?")[0]);
            }
        }

        var self = this;
        var queue = async.queue(function(item, queueCallback) {
            // If in processed, skip (may have been in excluded list)
            if (-1 !== processed.indexOf(item.page)) {
                queueCallback();
                return;
            }

            var page = item.page;
            var uri, host;
            if (0 === page.indexOf("http")) {
                uri = page;
                host = url.parse(uri).host || "";
            }

            var pagesToVisit = [];
            pagesToVisit.push(self._getHtmlAsString(page, null, timeout)); // regular visit
            if (cookie) {
                pagesToVisit.push(self._getHtmlAsString(page, cookie, timeout)); // logged in visit
            }
            processed.push(page);

            Q.all(pagesToVisit)
            .spread(function(regularResult, loggedInResult) {
                var context = {
                    uri: uri,
                    followLinks: item.followLinks,
                    result: result,
                    excludedSubdomains: excludedSubdomains
                };

                if (regularResult) {
                    self._processHtmlString(regularResult, context, queue);
                }

                if (loggedInResult) {
                    self._processHtmlString(loggedInResult, context, queue);
                }
            }).fail(function(error) {
                console.error('Unable to load %s: %s', uri, error);
                console.log(error.stack);
            }).done(queueCallback);
        }, 8);

        queue.drain = function(err) { // TODO: Handle err
            if (err) {
                deferred.reject(new Error(err));
            } else {
                deferred.resolve(result);
            }
        };

        // Crawl to find all HTML links
        if (pages.crawl) {
            for (i=0, l=pages.crawl.length; i<l; i++) {
                // Strip away parameters when crawling
                var page = pages.crawl[i].split("?")[0];

                queue.push({page: page, followLinks: true});
            }
        }

        if (pages.include) {
            for (i=0, l=pages.include.length; i<l; i++) {
                // Add to queue, with parameters
                queue.push({page: pages.include[i], followLinks: false});
            }
        }

        return deferred.promise;
    },

    /**
     * Takes a HTML string and matches CSS selectors in it, and adds/updates
     * them to the result object given in the context parameter.
     *
     * If context.followLinks is true, found links are added to queue so that
     * they will be processed as well.
     *
     * @private
     * @param {String}  html Html to search through.
     * @param {Object}  context An object containing the context information:
     * @param {String}  context.uri Original URI to the html string
     * @param {Boolean} context.followLinks If links in html string should be followed
     * @param {Array}   context.selectors List of selectors to match
     * @param {Array}   context.excludedSubdomains List of subdomains to ignore
     * @param {Object}  context.result Object to append results to
     * @param {Object}  context.result.used E.g. {".foo": 1 }
     * @param {Object}  context.result.ignored E.g. {"@font-face": 1}
     * @param {Object}  queue Queue object, as returned from the Async library.
     */
    _processHtmlString: function(html, context, queue) {
        var uri = context.uri;
        var followLinks = context.followLinks;
        var result = context.result;
        var excludedSubdomains = context.excludedSubdomains;

        var document = cheerio.load(html);

        if (followLinks) { // look for links in document, add to queue
            var links = document("a");
            for (var i=0, l=links.length; i<l; i++) {
                var handleThis = true;
                var link = links[i];

                if (!('href' in link.attribs)) {
                    continue;
                }

                var href = link.attribs.href.split("#")[0];

                // No href, or current URI with parameter, continue
                if (!href || href.indexOf("?") === 0) {
                    continue;
                }

                // If under excluded domain, skip
                for (var j=0; j<excludedSubdomains.length; j++) {
                    var excluded = excludedSubdomains[j];
                    if (href.indexOf(excluded) === 0 ||
                        url.parse(href).pathname.indexOf(excluded) === 0) {

                        handleThis = false;
                        break;
                    }
                }

                if (handleThis) {
                    this._addLinkToQueue(link.attribs.href, queue, uri, followLinks);
                }
            }
        }

        // Process current document
        return this._matchSelectorsInString(document, result);
    },

    /**
     * Add link to queue (but only if it's on the same host as parentUri).
     *
     * @private
     * @param {String}  link Link to handle.
     * @param {Object}  queue Queue object, as returned from the Async library.
     * @param {String}  parentUri URL to document containing this link.
     * @param {Boolean} followLinks Should links in the document link refers to
     *                  be followed?
     */
    _addLinkToQueue: function(link, queue, parentUri, followLinks) {
        var host = url.parse(parentUri).host;

        // Strip away parameters when crawling
        link = link.split("?")[0];

        if (0 === link.indexOf("http")) { // Absolute url
            if (url.parse(link).host === host) {
                queue.push({page: link, followLinks: followLinks});
            } else {
                // Skip, another domain
            }
        } else { // Relative url?
            if (parentUri) { // Yes
                link = url.resolve(parentUri, link);
                queue.push({page: link, followLinks: followLinks});
            } else { // What Is This Thing Called Link?
                console.log("Could not resolve " + link);
            }
        }
    },

    // TODO: Document result object properly
    /**
     * Match selectors in a html string.
     *
     * @private
     * @param {Object} document Cheerio document
     * @param {Object} result Result object
     */
    _matchSelectorsInString: function(document, result) {
        // Loop through selectors
        for (var selector in result.selectors) {
            // If current selector is whitelisted, skip.
            if (result.selectors[selector].whitelisted) {
                continue;
            }

            if (selector) {
                if (-1 < selector.indexOf("@")) {
                    result.selectors[selector].ignored = true;

                    continue;
                }

                var oSelector = selector;
                // Remove pseudo part of selector
                selector = selector.split(":")[0];
                // Check if selector is used
                try {
                    var len = document(selector).length;
                    if (len > 0) {
                        // Increment total number of selectors used
                        if (result.selectors[oSelector].matches_html == 0) {
                            result.total_used++;
                        }

                        // Add number of matches for selector to total matches
                        result.selectors[oSelector].matches_html =
                            result.selectors[oSelector].matches_html + len;
                    }
                } catch (e) {
                    console.log("Problem with selector: "
                                + oSelector);
                }
            }
        }
        return;
    },

    /**
     * Match selectors in a html string.
     *
     * @private
     * @param {String} page URL, path or HTML as string.
     * @param {Array}  cookie Cookie to use for login, on the form
     *                 "sessionid=foo". Each uri in the html parameter will
     *                 be visited both with and without the cookie set.
     * @param {Int}    timeout Request timeout
     * @returns {Promise} HTML as string
     */
    _getHtmlAsString: function(page, cookie, timeout) {
        var deferred = Q.defer();
        var data;

        // Get page as raw html
        // If URI is given, fetch HTML
        //
        // Note: _addLinkToQueue adds host etc. to relative URLs when crawling.
        if (0 === page.indexOf("http")) { // From URI
            var uri = page;

            var headers = {};
            var loggedIn = false;
            if (cookie) {
                headers = {
                    "Cookie": cookie,
                    "Referer": uri
                };

                loggedIn = true;
            }

            var options = { uri: uri,
                            headers: headers,
                            timeout: timeout || 4000,
                            pool: false };

            var self = this;

            request.get(options, function(error, res, data) {
                if (error) {
                    console.error("Error loading %s: %s", uri, error);
                    return;
                }

                self._logger.emit('request', res, uri, loggedIn);

                deferred.resolve(data);
            });
        } else if (-1 === page.indexOf("<html>")) { // From file
            try {
                data = fs.readFileSync(page).toString();
            } catch (e) {
                console.warn("_getHtmlAsString() failed to read %s: %s", page, e.message);
            }
            deferred.resolve(data);
        } else { // From string
            deferred.resolve(page);
        }

        return deferred.promise;
    }
};
