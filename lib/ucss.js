/* jshint: */
/*global module buster ucss:true public_functions:true*/


var jsdom = require('jsdom');
var jQuery = require('jquery');
var fs = require('fs');
var async = require('async');


var ucss = {
    /**
     * List of CSS pseudo elements to be removed before using jQuery to search.
     */
    _pseudoElements: [/\:{1,2}link/g,
                      /\:{1,2}visited/g,
                      /\:{1,2}active/g,
                      /\:{1,2}hover/g,
                      /\:{1,2}focus/g,
                      /\:{1,2}first-letter/g,
                      /\:{1,2}first-line/g,
                      /\:{1,2}first-child/g,
                      /\:{1,2}before/g,
                      /\:{1,2}after/g
                     ],

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

        // If css is file path, open file
        if (-1 === css.indexOf("{")) {
            try {
                css = fs.readFileSync(css).toString();
            } catch (e) {
                console.log(e.message);
                return rules;
            }
        }

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
     * @param {Array} css Array of strings (containing CSS rules), or an
     *         array of paths to CSS files.
     * @param {Array} html Html to search through. This can be either an array
     *         of Strings (containing html code), an array of URLs to visit, or
     *         an array of paths to html files.
     * @param {String} cookie Cookie to use for login, on the form
     *         "sessionid=foo". Each url in the html parameter will
     *         be visited both with and without the cookie.
     * @param {Function} donecb Callback for when done. Should take a result
     *         object as argument.
     */
    search: function(css, html, cookie, whitelist, donecb) {
        if ((html == false || css == false)) {
            donecb({});
            return null;
        }

        var self = this
        ,   foundRules = {} // Rules found in CSS file
        ,   rules = [] // Rules to search for in HTML
        ,   result = { used: {}, duplicates: {} };

        // Find all rules
        for (var i=0; i<css.length; i++) {
            foundRules = ucss._findRules(css[i], foundRules);
        }
        if (!foundRules) return null;

        for (var rule in foundRules) {
            if ("" === rule) continue;
            rules.push(rule);
            if (foundRules[rule] > 1) {
                result.duplicates[rule] = foundRules[rule];
            }
        }

        // If cookie is provided, duplicate all html instances, and add login
        // info to one of each.
        var items = [];
        if (cookie) {
            for (i=0;i<html.length;i++) {
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

                        if (rule) {
                            // Remove pseudo selectors, to avoid jQuery error
                            var oRule = rule
                            ,   pe = self._pseudoElements;

                            for (var j=0; j<pe.length; j++) {
                                rule = rule.replace(pe[j] , "");
                            }

                            // Add rule to index, if not already added
                            if (undefined === result.used[oRule]) {
                                result.used[oRule] = 0;
                            }

                            // Check if rule is used
                            if ($(rule).length > 0) {
                                result.used[oRule] = result.used[oRule]
                                    + $(rule).length;
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
