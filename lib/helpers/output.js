/*global module */
var util = require('util');
var crypto = require('crypto');


module.exports = {
    /**
     * @param {Object} result Object on the form:
     *         { used: { ".foo": 3, ".bar": 0 },
     *           duplicates { ".foo": 2 }
     *         }
     * @param {Boolean} used Should used rules, with numbers, also be output?
     * @param {Boolean} summary Should a summary text be output?
     * @param {Boolean} duplicates Should duplicate rules be output?
     */
    standard: function(result, used, summary, duplicates) {
        // Function for determining lenght of associative array
        var oSize = function(obj) {
            var size = 0, key;
            for (key in obj) {
                if (obj.hasOwnProperty(key)) {
                    size++;
                }
            }
            return size;
        };

        var sresult = [], rule;
        for (rule in result.used) {
            sresult.push([rule, result.used[rule]]);
        }
        sresult.sort(function(a, b) {return a[1] - b[1];});

        if (summary) {
            if (!used) {
                console.log("\nUnused rules:");
            }
            else {
                console.log("\nRules:");
            }
            console.log("-------------------------------------");
        }

        var j=0, i;
        for(i=0; i<sresult.length;i++) {
            if (0 < sresult[i][1]) {
                j++;
                if (!used) {
                    continue;
                }
            }

            if (!used) {
                console.log(sresult[i][0]);
            } else {
                console.log(sresult[i][0] + ": " + sresult[i][1]);
            }
        }
        if (duplicates && oSize(result.duplicates) > 0) {
            if (summary) {
                console.log("\nDuplicates:");
                console.log("-------------------------------------");
            } else {
                console.log("");
            }
            var dresult = [];
            for (rule in result.duplicates) {
                dresult.push([rule, result.duplicates[rule]]);
            }
            dresult.sort(function(a, b) {return a[1] - b[1];});
            for(var d=0; d<dresult.length;d++) {
                console.log(dresult[d][0] + ": " + dresult[d][1]);
            }
        }

        if (summary) {
            var duplicateText = "";
            if (0 === oSize(result.duplicates)) {
                duplicateText = ", no duplicates)";
            } else {
                duplicateText = ", " + oSize(result.duplicates);
                duplicateText += oSize(result.duplicates) > 1
                    ? " duplicates)" : " duplicate)";
            }

            console.log(["-------------------------------------\n", "Total: ",
                         i, " (", j, " used, ", i-j, " unused", duplicateText
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

        // Colors
        var RED = "\033[31m";
        var GREEN = "\033[32m";
        var YELLOW = "\033[33m";
        var GREY = "\033[90m";
        var BOLD = "\x1B[1m";
        var RESET = "\033[0m";

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