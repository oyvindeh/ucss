var Q = require('q');
var async = require('async');
var url = require('url');
var cheerio = require('cheerio');
var fs = require('fs');
var request = require('request');
var events = require('events');


// Colors
var RED = "\033[31m";
var RESET = "\033[0m";


module.exports = {
    // TODO: Add documentation
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
     * @param {Object} headers Headers to send to server.
     * @param {String} cookie Cookie to use for login, on the form
     *                 "sessionid=foo". Each uri in the html parameter will
     *                 be visited both with and without the cookie set.
     * @param {Int}    timeout Request timeout
     * @param {Function} logger Custom log function
     * @returns {Promise} Result object
     */
    matchSelectors: function(pages, result, headers, cookie, timeout, logger) {
        this._logger = new events.EventEmitter();
        this._logger.on('request', logger);

        var deferred = Q.defer();
        var processed = []; // Array of processed items/pages
        var i, l;

        // Handle excludes by adding them to processed, so they won't be visited
        var excludedSubfolders = [];
        if (pages.exclude) {
            for (i=0, l=pages.exclude.length; i<l; i++) {
                var current = pages.exclude[i];
                if (current.indexOf("*") !== -1) {
                    var subfolder = current.substring(0, current.length - 1);
                    if (subfolder.indexOf("http") === 0) {
                        subfolder = url.parse(subfolder).pathname;
                    }
                    excludedSubfolders.push(subfolder);
                    continue;
                }

                processed.push(current.split("?")[0]);
            }
        }

        var queueItemHandler = this._queueItemHandler.bind(this);
        var queue = async.queue(function(item, queueCallback) {
            setImmediate(function() {
                queueItemHandler(item, processed, result, headers, timeout,
                                 cookie, excludedSubfolders, queue,
                                 queueCallback);
            });
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

        // Add pages included explicitly (e.g. in config) to queue
        if (pages.include) {
            for (i=0, l=pages.include.length; i<l; i++) {
                // Add to queue, with parameters
                queue.push({page: pages.include[i], followLinks: false});
            }
        }

        return deferred.promise;
    },

    /**
     * Handle an item in the queue of html documents to check.
     *
     * @param {Object} item HTML to process
     * @param {Object} processed Array of already processed items/pages
     * @param {Object} result Result object
     * @param {Object} headers Headers to send to server.
     * @param {String} cookie Cookie to use for login, on the form
     *                 "sessionid=foo". Each uri in the html parameter will
     *                 be visited both with and without the cookie set.
     * @param {Int}    timeout Request timeout
     * @param {Array}  excludedSubfolders List of sub domains to be excluded
     *                 when crawling.
     * @param {Object} queue Queue object from async, used to queue up new
     *                 items found during crawl.
     * @param {Function} queueCallback Callback to call when done.
     */

    _queueItemHandler: function(item, processed, result, headers, timeout,
                                cookie, excludedSubfolders, queue,
                                queueCallback) {
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

        // Gather all html resources as strings
        var htmlToCheck = [];
        var html = this._getHtmlAsString(page, result, headers, null, timeout);
        if (html) {
            htmlToCheck.push(html); // regular visit
        }
        if (cookie) {
            html = this._getHtmlAsString(page, result, headers, cookie, timeout);
            if (html) {
                htmlToCheck.push(html); // logged in visit
            }
        }
        processed.push(page);

        // TODO: Add documentation - why spread here???
        // Process html strings to match selectors
        var queueLinks = this._queueLinks.bind(this);
        var matchSelectorsInDocument = this._matchSelectorsInDocument.bind(this);

        Q.spread(htmlToCheck, function(regularResult, loggedInResult) {
            var context = {
                uri: uri,
                followLinks: item.followLinks,
                result: result,
                excludedSubfolders: excludedSubfolders
            };

            var document;
            if (regularResult) {
                document = cheerio.load(regularResult);

                matchSelectorsInDocument(document, result);
                if (context.followLinks) { // look for links in document, add to queue
                    queueLinks(document, queue, context);
                }
            }

            if (loggedInResult) {
                document = cheerio.load(loggedInResult);

                matchSelectorsInDocument(document, result);
                if (context.followLinks) { // look for links in document, add to queue
                    queueLinks(document, queue, context);
                }
            }
        }).fail(function(error) {
            console.error('Unable to read %s: %s', uri, error);
            console.log(error.stack);
        }).done(queueCallback);
    },

    /**
     * Finds links in a HTML string and adds them to queue of pages to
     * process.
     *
     * Will also find links and queue them for later processing (if
     * context.followLinks is true)
     *
     * @private
     * @param {Object}  document HTML as Cheerio document.
     * @param {Object}  queue Queue object, as returned from the Async library.
     * @param {Object}  context An object containing the context information:
     * @param {String}  context.uri Original URI to the html string
     * @param {Boolean} context.followLinks If links in html string should be followed
     * @param {Array}   context.selectors List of selectors to match
     * @param {Array}   context.excludedSubfolders List of subfolders to ignore
     * @param {Object}  context.result Object to append results to
     * @param {Object}  context.result.used E.g. {".foo": 1 }
     * @param {Object}  context.result.ignored E.g. {"@font-face": 1}
     */
    _queueLinks: function(document, queue, context) {
        var uri = context.uri;
        var excludedSubfolders = context.excludedSubfolders;
        var followLinks = context.followLinks;

        var links = document("a");
        for (var i=0, l=links.length; i<l; i++) {
            var link = links[i];

            if (!('href' in link.attribs)) {
                continue;
            }

            var href = link.attribs.href.split("#")[0];

            var protocol = url.parse(href).protocol
                ? url.parse(href).protocol : "http:";

            // If no href, URI is parameter only, or protocol is not http,
            // then skip.
            if (!href
                || href.indexOf("?") === 0
                || protocol.indexOf("http") === -1) {
                continue;
            }

            // If under excluded domain, skip
            var handleThis = true;
            for (var j=0; j<excludedSubfolders.length; j++) {
                var excluded = excludedSubfolders[j];
                if (href.indexOf(excluded) === 0 ||
                    url.parse(href).pathname.indexOf(excluded) === 0) {

                    handleThis = false;
                    break;
                }
            }

            if (handleThis) {
                this._addLinkToQueue(link.attribs.href, queue, uri,
                                     followLinks);
            }
        }
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

        // Resolve link. This handles domain relative URLs, as well as protocol
        // relative URLs. If link and parentUri points to different domains,
        // link is left alone.
        link = url.resolve(parentUri, link);

        if (url.parse(link).host === host) {
            queue.push({page: link, followLinks: followLinks});
//            console.log("PUSHED: " + link);
        }
    },

    // TODO: Document result object properly
    /**
     * Match selectors loaded into a Cheerio HTML document.
     *
     * @private
     * @param {Object} document HTML as Cheerio document.
     * @param {Object} result Result object.
     */
    _matchSelectorsInDocument: function(document, result) {
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
                } catch (error) {
                    console.log(RED + "Selector: \"" +
                                oSelector + "\" has " + error.name +
                                ". " + error.message + RESET);
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
     * @param {Object} result Result object
     * @param {Object} headers Headers to send to server.
     * @param {Array}  cookie Cookie to use for login, on the form
     *                 "sessionid=foo". Each uri in the html parameter will
     *                 be visited both with and without the cookie set.
     * @param {Int}    timeout Request timeout
     * @returns {Promise} HTML as string
     */
    _getHtmlAsString: function(page, result, headers, cookie, timeout) {
        var deferred = Q.defer();
        var data;

        // Get page as raw html
        // If URI is given, fetch HTML
        //
        // Note: _addLinkToQueue adds host etc. to relative URLs when crawling.
        if (0 === page.indexOf("http")) { // From URI
            var uri = page;

            var loggedIn = false;
            if (cookie) {
                headers["Cookie"] = cookie;
                headers["Referer"] = uri;

                loggedIn = true;
            }

            var options = { uri: uri,
                            headers: headers,
                            timeout: timeout || 10000,
                            pool: false };

            var self = this;

            request.get(options, function(error, res, data) {
                if (res && res.statusCode !== 200) {
                    self._logger.emit('request', res, uri, loggedIn);
                    result.load_errors.push({uri:uri, error: res.statusCode});
                } else if (error) {
                    if (error.toString().indexOf("TIMEDOUT" > -1)) {
                        self._logger.emit('request', null, uri, loggedIn, "Timeout");
                    } else {
                        self._logger.emit('request', null, uri, loggedIn, error);
                    }
                    result.load_errors.push({uri:uri, error: error});
                    data = "";
                } else {
                    // Check content type, ignore if not html (trust server).
                    // TODO: Look into ways of improving this further, as
                    // server may not be telling the truth.
                    var contentType = res.headers["content-type"];
                    if (contentType.indexOf("text/html") === -1) {
                        data = "";
                    } else {
                        self._logger.emit('request', res, uri, loggedIn);
                    }
                }

                deferred.resolve(data);
            });
        } else if (-1 === page.indexOf("<html>")) { // From file
            try {
                data = fs.readFileSync(page).toString();
            } catch (error) {
                console.error("Unable to read %s: %s", page, error.message);
            }
            deferred.resolve(data);
        } else { // From string
            deferred.resolve(page);
        }

        return deferred.promise;
    }
};
