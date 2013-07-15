var Q = require('q');
var async = require('async');
var fs = require('fs');
var cssom = require('cssom');
var request = require('request');


module.exports = {
    /**
     * Get CSS selectors from CSS
     * @param {Array} css CSS to search through. This can be either an array
     *         of Strings (containing CSS), an array of URIs to CSS files, or
     *         an array of paths to CSS files.
     */
    getSelectors: function(css) {
        var self = this;
        var deferred = Q.defer();
        var duplicates = {};

        var foundSelectors = {}; // Selectors found in CSS file, with count
        var selectors = []; // Selectors to search for in HTML

        // Find all selectors
        async.forEach(css, function(item, forEachCallback) {
            if (0 === item.indexOf("http")) { // From URI
                var options = { uri: item };

                request.get(options, function(error, res, data) {
                        foundSelectors = self._extractSelectorsFromString(
                                             data, foundSelectors);
                        forEachCallback();
                });

                return;
            } else if (-1 === item.indexOf("{")) { // From file
                try {
                    item = fs.readFileSync(item).toString(); // TODO: Could this be async?
                } catch (e) {
                    console.log(e.message);
                }
                foundSelectors = self._extractSelectorsFromString(item, foundSelectors);
            } else { // From string
                foundSelectors = self._extractSelectorsFromString(item, foundSelectors);
            }

            forEachCallback();
        }, function(err) {
            if (err) {
                // TODO: Error handling
                deferred.reject(new Error(err));
            } else {
                var result = { selectors: {}, duplicates: {} };

                for (var selector in foundSelectors) {
                    if ("" === selector) {
                        continue;
                    }
                    selectors.push(selector);
                    if (foundSelectors[selector] > 1) {
                        duplicates[selector] = foundSelectors[selector];
                    }
                }
                result.selectors = selectors;
                result.duplicates = duplicates;

                deferred.resolve(result);
            }
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
    _extractSelectorsFromString: function(css, foundSelectors) {
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

        foundSelectors = this._getSelectorsFromRules(rules, foundSelectors);

        return foundSelectors;
    },

    // TODO: Add docstring
    _getSelectorsFromRules: function(rules, selectors) {
        for (var i=0, l=rules.length; i<l; i++) {
            var rule = rules[i];

            // @-rules are ignored, except media queries. For media queries,
            // child rules are handled. Other rules are handled as if they
            // have a selector text.
            //
            // @media:
            if (rule.media && rule.cssRules) {
                selectors = this._getSelectorsFromRules(rule.cssRules, selectors);

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