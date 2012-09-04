/* jshint: */
/*global module buster ucss:true public_functions:true*/


var jsdom = require('jsdom');
var jQuery = require('jquery');
var fs = require('fs');
var async = require('async');


var ucss = {
    /**
     * Find CSS rules in a CSS file
     * @param {String} css Path to CSS file, or CSS code
     * @param {Object} rules (optional) object to append found rules to.
     * @returns {Object} Object containing found rules, and number of
     *           occurences for each rule.
     */
    _findRules: function(css, rules) {
        if (!css) return {};
        if (!rules) rules = {};

        // Replace newlines and other whitespace with single space
        css = css.replace(/\s+/g, " ");

        // Remove comments
        css = css.replace(/\/\*.+?\*\//g, "");

        var rule
        ,   pattern = new RegExp("(?:^|})(.*?)(?:{|$)" , "g");

        // Add each found rule, and count occurences
        while ((rule = pattern.exec(css))) {
            if (rule && rule[1]) {
                var r = rule[1].trim();
                if (undefined === rules[r]) {
                    rules[r] = 1;
                } else {
                    rules[r]++;
                }
            }
        }

        return rules;
    },

    /**
     * Search for rules in HTML.
     * @param {Array} css CSS to search through. This can be either an array
     *         of Strings (containing CSS), an array of URLs to CSS files, or
     *         an array of paths to CSS files.
     * @param {Array} html Html to search through. This can be either an array
     *         of Strings (containing html code), an array of URLs to visit, or
     *         an array of paths to html files.
     * @param {String} cookie Cookie to use for login, on the form
     *         "sessionid=foo". Each url in the html parameter will
     *         be visited both with and without the cookie.
     * @param {String} whitelist List of selectors to ignore.
     * @param {Function} donecb Callback for when done. Should take a result
     *         object as argument.
     */
    search: function(css, html, cookie, whitelist, donecb) {
        if ((html == false || css == false)) {
            donecb({});
            return null;
        }

        var self = this;

        self._getCssSelectors(css, function(rules, result) {
            self._processHtml(self, html, cookie, rules, whitelist, result, donecb);
        });
    },

    /**
     * Get CSS selectors from CSS
     * @param {Array} css CSS to search through. This can be either an array
     *         of Strings (containing CSS), an array of URLs to CSS files, or
     *         an array of paths to CSS files.
     * @param {Function} donecb Callback for when done. Should take two
     *         arguments, one set of rules and one set of results (see
     *         documentation for _processHtml for more info on these)
     */
    _getCssSelectors: function(css, donecb) {
        var result = { used: {}, duplicates: {} };
        var foundRules = {} // Rules found in CSS file
        ,   rules = []; // Rules to search for in HTML

        // Find all rules
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
                        foundRules = ucss._findRules(data, foundRules);
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
                foundRules = ucss._findRules(item, foundRules);
            } else { // From string
                foundRules = ucss._findRules(item, foundRules);
            }

            callback();
        }, function(err) {
            if (!foundRules) return null;
            for (var rule in foundRules) {
                if ("" === rule) continue;
                rules.push(rule);
                if (foundRules[rule] > 1) {
                    result.duplicates[rule] = foundRules[rule];
                }
            }
            if (donecb) donecb(rules, result);
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
     * @param {Array} rules Array of CSS selectors
     * @param {Object} result Object on the form { used: { ".foo": 1 },
     *                                             duplicates: { ".bar": 0 } }
     * @param {Function} donecb Function to execute when done. An object on the
     *         form { "<rule>": count } is passed to it, where count is the
     *         number of occurnces of <rule>.

     */
    _processHtml: function(self, html, cookie, rules, whitelist, result, donecb) {
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

        // Search html for rules
        async.forEach(items, function(item, callback) {
            var html = item.html ? item.html : item
            ,   cookie = item.cookie ? item.cookie : "";

            jsdom.env({
                html: html,
                headers: { 'Cookie': cookie },
                done: function(errors, window) {
                    var $ = jQuery.create(window);
                    for (var i=0; i<rules.length; i++) {
                        var rule = rules[i];

                        // If current rule is whitelisted, skip.
                        if (whitelist && -1 < whitelist.indexOf(rule)) continue;
                        if (-1 < rule.indexOf("@")) continue;

                        if (rule) {
                            var oRule = rule;

                            // Add rule to index, if not already added
                            if (undefined === result.used[oRule]) {
                                result.used[oRule] = 0;
                            }

                            // Remove pseudo part of selector
                            rule = rule.split(":")[0];

                            // Check if rule is used
                            try {
                                if ($(rule).length > 0) {
                                    result.used[oRule] = result.used[oRule]
                                        + $(rule).length;
                                }
                            } catch (e) {
                                console.log("Problem with selector: " + oRule);
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
     * Analyze CSS: Find number of times a rule has been used, and if there are
     * duplicates.
     *
     * @param {String} cssPath Path to css file
     * @param {String} html Html code or URL to html code.
     * @param {Object} auth (optional) Login info on the form
     *         {username: "", password: "", loginUrl: "", loginFunc: ""}
     *         where loginFunc can be a function, or the name of a
     *         login helper (see loginhelpers.js).
     * @param {Function} done Function to execute when done. An object on the
     *         form { "<rule>": count } is passed to it, where count is the
     *         number of occurnces of <rule>.
     */
    analyze: function(css, html, whitelist, auth, done) {
        if (!(html instanceof Array)) html = [html];
        if (!(css instanceof Array)) css = [css];

        // Default result handler
        done = done ? done : function(result) {
            console.log("\nresult: ", result);
        };

        // If login info is given, do login.
        if (auth) {
            var loginFunc;
            var username = auth.username;
            var password = auth.password;
            var loginUrl = auth.loginUrl;

            if (!(auth.loginFunc instanceof Function)) {
                loginFunc = require('./helpers/login')[auth.loginFunc];
            } else {
                loginFunc = auth.loginFunc;
            }

            loginFunc(loginUrl, username, password, function(cookie) {
                ucss.search(css, html, cookie, whitelist, done);
            });
        } else {
            ucss.search(css, html, null, whitelist, done);
        }
    }
};
