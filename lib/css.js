var Q = require('q');
var async = require('async');
var fs = require('fs');
var cssom = require('cssom');
var request = require('request');
var crypto = require('crypto');


module.exports = {
    newRule: function() {
        return {
            ignored: false,
            matches_html: 0,
            occurences_css: 0,
            pos_css: {}
        };
    },

    /**
     * Get CSS selectors from CSS
     * @param {Array} css CSS to search through. This can be either an array
     *         of Strings (containing CSS), an array of URIs to CSS files, or
     *         an array of paths to CSS files.
     * @returns {Promise} Object on the form { duplicates: { ".foo": 1 },
     *                                         ignored: { ".bar": 0 } }
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
                var selectors = []; // Selectors to search for in HTML
                var duplicates = {};
                var pos = {};

                var foundSelectors = result.foundSelectors;

                for (var selector in foundSelectors) {
                    if ("" === selector) {
                        continue;
                    }

                    selectors.push(selector);
                    if (foundSelectors[selector] && foundSelectors[selector].count > 1) {
                        duplicates[selector] = foundSelectors[selector].count;
                    }
                    if (foundSelectors[selector] && foundSelectors[selector].pos) {
                        pos[selector] = foundSelectors[selector].pos;
                    }
                }
                deferred.resolve(result);
            }
        });

        return deferred.promise;
    },

    /**
     * Find selectors in CSS string
     *
     * @private
     * @param {String} css CSS code
     * @param {Object} foundSelectors (optional) object to append found selectors
     *        to. Also keeps count (e.g. {'.foo': 2})
     * @returns {Object} Object containing found selectors, and number of
     *           occurences for each selector.
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

    /**
     * @private
     * @param {Object} rules Object as given by cssom.parse().cssRules.
     * @param {Object} selectors Already found selectors, with count.
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
                result.foundSelectors[sel] = this.newRule();
                result.foundSelectors[sel].occurences_css++;

            // Other rules, containing selector(s)
            } else {
                var selectorGroup = rule.selectorText;

                // Several selectors can be grouped together, separated by
                // comma, e.g. ".foo, .bar":
                var selectorList = selectorGroup.split(",");
                var foundSelectors = result.foundSelectors;

                for (var j=0, sl=selectorList.length; j<sl; j++) {
                    var s = selectorList[j].trim();

                    if (undefined === foundSelectors[s]) {
                        foundSelectors[s] = this.newRule();
                        foundSelectors[s].occurences_css = 1;
                    } else {
                        foundSelectors[s].occurences_css++;
                    }

                    if (undefined === foundSelectors[s].pos_css[itemId]) {
                        foundSelectors[s].pos_css[itemId] = [pos];
                    } else {
                        foundSelectors[s].pos_css[itemId].push(pos);
                        result.total_duplicates++;
                    }
                }
            }
        }

        return result;
    }
};