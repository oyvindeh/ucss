/*global module */
var util = require('util');
var crypto = require('crypto');


// Colors
var RED = "\033[31m";
var GREEN = "\033[32m";
var YELLOW = "\033[33m";
var GREY = "\033[90m";
var BOLD = "\x1B[1m";
var RESET = "\033[0m";


module.exports = {
    // TODO: Document result object properly
    /**
     * @param {Object} result Result object
     * @param {Boolean} showFull Show full report
     * @param {Boolean} summary Show summary text
     * @param {Boolean} duplicates Show duplicate rules
     */
    standard: function(result, showFull, showSummary, showDuplicates) {
        var selectors = result.selectors;

        if (showSummary) {
            if (!showFull) {
                console.log("\nUnused rules:");
            }
            else {
                console.log("\nRules:");
            }
            console.log("-------------------------------------");
        }

        // Output unused rules:
        if (!showFull) {
            for(var s in selectors) {
                if (selectors[s].matches_html > 0 ||
                    selectors[s].ignored ||
                    selectors[s].whitelisted
                   ) {
                    continue;
                }
                console.log(s);
            }
        } else { // Output all rules, both used and unused
            for(var s in result.selectors) {
                var ignoredText = "";
                var duplicateText = "";
                var matchesText = "";
                var whitelistText = "";

                // Matches text
                if (selectors[s].matches_html === 0) {
                    matchesText = s + ": " + RED + selectors[s].matches_html
                        + " matches " + RESET;
                } else {
                    matchesText = s + ": " + GREEN + selectors[s].matches_html
                        + " matches " + RESET;
                }

                // Ignored text
                if (selectors[s].ignored) {
                    ignoredText = RED + "[IGNORED] " + RESET;
                }

                // Whitelisted text
                if (selectors[s].whitelisted) {
                    whitelistText = YELLOW + "[WHITELIST] " + RESET;
                }

                // Duplicates text
                if (selectors[s].occurences_css === 2) {
                    duplicateText = YELLOW + "("
                        + (selectors[s].occurences_css - 1)
                        + " duplicate)" + RESET;
                } else if (selectors[s].occurences_css > 2) {
                    duplicateText = YELLOW + "("
                        + (selectors[s].occurences_css - 1)
                        + " duplicates)" + RESET;
                }

                console.log(ignoredText + whitelistText + matchesText + duplicateText);
            }
        }

        // Output duplicates:
        if (showDuplicates) {
            if (showSummary) {
                console.log("\nDuplicates:");
                console.log("-------------------------------------");
            } else {
                console.log(""); // Empty line, as separator
            }
            for(var s in result.selectors) {
                if (selectors[s].occurences_css > 1) {
                    console.log(s + ": " + selectors[s].occurences_css);
                }
            }
        }

        // Summary
        if (showSummary) {
            var duplicateText = "";
            if (0 === result.total_duplicates) {
                duplicateText = ", no duplicates";
            } else {
                duplicateText = ", " + result.total_duplicates;
                duplicateText += result.total_duplicates > 1
                    ? " duplicates" : " duplicate";
            }

            var ignoredText = "";
            if (0 === result.total_ignored) {
                ignoredText = ", none ignored)";
            } else {
                ignoredText = ", " + result.total_ignored + " ignored)";
            }

            console.log(["-------------------------------------\n",
                         "Total: ", result.total,
                         " (", result.total_used, " used, ",
                         result.total_unused, " unused",
                         duplicateText, ignoredText
                        ].join(""));
        }

    },

    /**
     * Log to console for each visited URL.
     *
     * @param {Object} res Response object, as given by the request module.
     * @param {String} reqHref The href that was requested
     * @param {Boolean} loggedIn true if logged in, false if not.
     */
    logger: function(res, reqHref, loggedIn) {
        var outputStr = "";
        var statusStr = "";

        // Create a hash of content. Useful for checking if content of e.g. a
        // logged in and logged out version of a page is equal.
        var md5sum;
        if (res.body) {
            md5sum = crypto.createHash('md5').update(res.body).digest('hex');
        }

        // Status code, with color
        if (res.statusCode <= 300) {
            statusStr = GREEN + res.statusCode + RESET;
        } else if (res.statusCode >= 400) {
            statusStr = RED + BOLD + res.statusCode + RESET;
        }

        // Notify if redirect
        if (res.request.href === reqHref) {
            outputStr = util.format("HTTP %s %s", statusStr, res.request.href);
        } else {
            outputStr = util.format("HTTP %s %s " + YELLOW + "=>" + RESET + " %s",
                                    statusStr, reqHref, res.request.href);
        }

        // Notify if logged in
        if (loggedIn) {
            outputStr += YELLOW + " (with login)" + RESET;
        }

        // Log to console
        outputStr += " " + GREY + md5sum + RESET;
        console.log(outputStr);
    }
};