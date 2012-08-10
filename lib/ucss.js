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

        var rule;
        var pattern = new RegExp("(?:^|})(.*?)(?:{|$)" , "g");

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
     * Search for rules in HTML
     * @param {Array} rules Array of Strings, containing CSS rules.
     * @param {Array} item Html to search through. This can be either:
               a) A String, or Array of Strings, containing html code
               a) An URL, or Array of URLs to html code
               c) Array of objects with HTML/URLs and a cookie (with session
                  information) for each, on the form { html: "", cookie: ""}.
     * @param {Function} donecb Callback for when done. Should take a result
     *         object as argument.
     */
    search: function(css, item, whitelist, donecb) {
        if ((item == false || css == false)) {
            donecb({});
            return null;
        }

        // Object to return
        var result = {};
        result.used = {};
        result.duplicates = {};

        // Find all rules
        var found = {};
        for (var i=0; i<css.length; i++) {
            found = ucss._findRules(css[i], found);
        }
        if (!found) return;

        var rules = [];
        for (var rule in found) {
            if ("" === rule) continue;
            rules.push(rule);
            if (found[rule] > 1) {
                result.duplicates[rule] = found[rule];
            }
        }

        // Search html for rules
        async.forEach(item, function(item, callback) {
            var html, cookie;
            if (item.html) {
                html = item.html;
            } else {
                html = item;
            }

            if (item.cookie) {
                cookie = item.cookie;
            } else {
                cookie = "";
            }

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
                            // Removing pseudo selectors, to avoid jQuery
                            // giving up
                            var oRule = rule;
                            rule = rule.replace(/\:hover/g, "");
                            rule = rule.replace(/\:before/g, "");
                            rule = rule.replace(/\:after/g, "");
                            rule = rule.replace(/\:active/g, "");

                            // Add rule to index, if not already added
                            if (undefined === result.used[oRule]) {
                                result.used[oRule] = 0;
                            }

                            // Checking if rule is used
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
                // Duplicate all html instances, add login info to one of each
                var items = [];
                for (var i=0;i<html.length;i++) {
                    items.push({ html: html[i], cookie: "" });
                    items.push({ html: html[i], cookie: cookie });
                }
                ucss.search(css, items, whitelist, done);
            });
        } else {
            ucss.search(css, html, whitelist, done);
        }
    }
};
