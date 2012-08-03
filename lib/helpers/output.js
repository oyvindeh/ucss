/* jshint: */
/*global module buster */


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
                if (obj.hasOwnProperty(key)) size++;
            }
            return size;
        };

        var sresult = [], rule;
        for (rule in result.used) sresult.push([rule, result.used[rule]]);
        sresult.sort(function(a, b) {return a[1] - b[1];});

        if (summary) {
            if (!used) console.log("Unused rules:");
            else console.log("\nRules:");
            console.log("-------------------------------------");
        }

        var j=0, i;
        for(i=0; i<sresult.length;i++) {
            if (0 < sresult[i][1]) {
                j++;
                if (!used) continue;
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
            for (rule in result.duplicates) dresult.push([rule, result.duplicates[rule]]);
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
    }
};