var Q = require('q');
var async = require('async');
var fs = require('fs');
var cssom = require('cssom');
var request = require('request');
var crypto = require('crypto');


module.exports = {
    // TODO: Make private, add documentation. Rename to newSelector?
    newRule: function() {
        return {
            ignored: false,
            matches_html: 0,
            occurences_css: 0,
            pos_css: {}
        };
    },

    // TODO: Document result object properly
    /**
     * Get selectors from CSS
     * @param {Array}  css CSS to search through. This can be either an array
     *         of Strings (containing CSS), an array of URIs to CSS files, or
     *         an array of paths to CSS files.
     * @param {Object} result Result object
     * @param {Int}    timeout Request timeout
     * @returns {Promise} Result object
     */
    getSelectors: function(css, result, timeout) {
        var self = this;
        var deferred = Q.defer();

        // Find all selectors
        async.forEach(css, function(item, forEachCallback) {
            var itemId = "";
            if (0 === item.indexOf("http")) { // From URI
                itemId = item;

                var options = { uri: item,
                                timeout: timeout || 4000,
                                pool: false };

                request.get(options, function(error, res, data) {
                        self._extractSelectorsFromString(
                                itemId, data, result);
                        forEachCallback();
                });

                return;
            } else if (-1 === item.indexOf("{")) { // From file
                itemId = item;

                try {
                    item = fs.readFileSync(item).toString();
                } catch (e) {
                    console.warn("getSelectors(): unable to read file %s: %s,", item, e.message);
                }
                self._extractSelectorsFromString(itemId, item, result);
            } else { // From string
                itemId = crypto.createHash('md5').update(item).digest('hex');

                self._extractSelectorsFromString(itemId, item, result);
            }

            forEachCallback();
        }, function(err) {
            if (err) {
                // TODO: Error handling
                deferred.reject(new Error(err));
            } else {
                deferred.resolve(result);
            }
        });

        return deferred.promise;
    },

    // TODO: Document result object properly
    /**
     * Find selectors in CSS string
     *
     * @private
     * @param {String} css CSS code
     * @param {Object} selectors (optional) object to append found selectors
     *        to. Also keeps count (e.g. {'.foo': 2})
     * @param {Object} result Result object
     * @returns {Object} Result object
     */
    _extractSelectorsFromString: function(itemId, css, result) {
        if (!css) {
            return result;
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
            return result;
        }

        this._getSelectorsFromRules(itemId, rules, result);

        return result;
    },

    // TODO: Document result object properly
    /**
     * @private
     * @param {Object} rules Object as given by cssom.parse().cssRules.
     * @param {Object} selectors Already found selectors, with count.
     * @param {Object} result Result object
     * @returns {Object} Result object
     */
    _getSelectorsFromRules: function(itemId, rules, result) {
        for (var i=0, l=rules.length; i<l; i++) {
            var rule = rules[i];
            var pos = rule.__starts;

            // @-rules are ignored, except media queries. For media queries,
            // child rules are handled. Other rules are handled as if they
            // have a selector text.
            //
            // @media:
            if (rule.media && rule.cssRules) {
                this._getSelectorsFromRules(itemId, rule.cssRules, result);

            // Rules without selectorText are not processed (@-rules,
            // except @media)
            } else if (!rule.selectorText) {
                // Cleaning: Only want the first part (e.g. @font-face),
                // not full rule
                var sel = rule.cssText.split("{")[0].trim();
                result.selectors[sel] = this.newRule();
                result.selectors[sel].occurences_css++;
                result.total++;

            // Other rules, containing selector(s)
            } else {
                var selectorGroup = rule.selectorText;

                // Several selectors can be grouped together, separated by
                // comma, e.g. ".foo, .bar":
                var selectorList = selectorGroup.split(",");
                var selectors = result.selectors;

                for (var j=0, sl=selectorList.length; j<sl; j++) {
                    var s = selectorList[j].trim();

                    if (undefined === selectors[s]) {
                        selectors[s] = this.newRule();
                        selectors[s].occurences_css = 1;
                        result.total++;
                    } else {
                        selectors[s].occurences_css++;
                    }

                    if (undefined === selectors[s].pos_css[itemId]) {
                        selectors[s].pos_css[itemId] = [pos];
                    } else {
                        selectors[s].pos_css[itemId].push(pos);
                    }
                }
            }
        }

        return result;
    }
};
