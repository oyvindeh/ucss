/* global assert:true */

var fs = require("fs");

if (typeof require !== "undefined") {
    var buster = require("buster");
    var lib = require("../lib/ucss");
}

/**
 * Simple CSS selector tests.
 *
 * As uCSS does not have its own selector engine, this is not meant as a
 * complete CSS selector test suite.
 */
buster.testCase("CSS Selectors:", {
    setUp: function () {
    },

    tearDown: function () {
    },

    "Class": function(done) {
        var pages = {
            include: ["<html><head></head><body class='foo'></body></html>"]
        };
        var css = ".foo {}";

        var expected = {
            foundSelectors: {
                ".foo": {
                    "matches_html": 1, "occurences_css": 1 }
            }
        };

        lib.analyze(pages, css, null, null, function(result) {
            assert.match(result, expected);
            done();
        });
    },

    "Id": function(done) {
        var pages = {
            include: ["<html><head></head><body id='foo'></body></html>"]
        };
        var css = "#foo {}";

        var expected = {
            foundSelectors: {
                "#foo": {
                    "matches_html": 1, "occurences_css": 1 }
            }
        };


        lib.analyze(pages, css, null, null, function(result) {
            assert.match(result, expected);
            done();
        });
    },

    "All": function(done) {
        var pages = {
            include: ["<html><head></head><body><div></div></body></html>"]
        };
        var css = "* {}";

        var expected = {
            foundSelectors: {
                "*": {
                    "matches_html": 4, "occurences_css": 1 }
            }
        };

        lib.analyze(pages, css, null, null, function(result) {
            assert.match(result, expected);
            done();
        });
    },

    "Element": function(done) {
        var pages = {
            include: ["<html><head></head><body><div></div></body></html>"]
        };
        var css = "div {}";

        var expected = {
            foundSelectors: {
                "div": {
                    "matches_html": 1, "occurences_css": 1 }
            }
        };

        lib.analyze(pages, css, null, null, function(result) {
            assert.match(result, expected);
            done();
        });
    },

    "Element, element": function(done) {
        var pages = {
            include: [fs.readFileSync("fixtures/markup.html").toString()]
        };
        var css = ".foo, .bar { color: red; }";


        var expected = {
            foundSelectors: {
                ".foo": {
                    "matches_html": 1, "occurences_css": 1 },
                ".bar": {
                    "matches_html": 1, "occurences_css": 1 }

            }
        };

        lib.analyze(pages, css, null, null, function(result) {
            assert.match(result, expected);
            done();
        });
    },

    "Element + element": function(done) {
        var pages = {
            include: [fs.readFileSync("fixtures/markup.html").toString()]
        };
        var css = ".foo + .bar { color: red; }";

        var expected = {
            foundSelectors: {
                ".foo + .bar": {
                    "matches_html": 1, "occurences_css": 1 }
            }
        };

        lib.analyze(pages, css, null, null, function(result) {
            assert.match(result, expected);
            done();
        });
    },

    "[attribute=value]": function(done) {
        var pages = {
            include: ["<html><head></head><body><div dir='rtl'></div></body></html>"]
        };
        var css = "div[dir='rtl'] {}";

        var expected = {
            foundSelectors: {
                "div[dir='rtl']": {
                    "matches_html": 1, "occurences_css": 1 }
            }
        };

        lib.analyze(pages, css, null, null, function(result) {
            assert.match(result, expected);
            done();
        });
    },

    "Element1~element2": function(done) {
        var pages = {
            include: ["<html><head></head><body><div></div><br/><p><br/><div></div><br/></body></html>"]
        };
        var css = "div~br {}";

        var expected = {
            foundSelectors: {
                "div~br": {
                    "matches_html": 2, "occurences_css": 1 }
            }
        };

        lib.analyze(pages, css, null, null, function(result) {
            assert.match(result, expected);
            done();
        });
    },


    "handles pseudo elements": function(done) {
        var pages = {
            include: ["<html><head></head><body class='foo'></body></html>"]
        };
        var css = [".foo::link{} .bar:lang(nb){} .foo::link{}",
                  ".foo{} .foo{} .bar{} .baz:after{} input:invalid{}"].join("");

        var expected = {
            foundSelectors: {
                ".bar": {
                    "matches_html": 0, "occurences_css": 1 },
                ".bar:lang(nb)": {
                    "matches_html": 0, "occurences_css": 1 },
                ".baz:after": {
                    "matches_html": 0, "occurences_css": 1 },
                ".foo": {
                    "matches_html": 1, "occurences_css": 2 },
                ".foo::link": {
                    "matches_html": 1, "occurences_css": 2 },
                "input:invalid": {
                    "matches_html": 0, "occurences_css": 1 }
            }
        };

        lib.analyze(pages, css, null, null, function(result) {
            assert.match(result, expected);
            done();
        });
    }
});


/**
 * Checks that @-rules is handled.
 *
 * The goal for now is to not crash when these are encountered.
 */
buster.testCase("CSS @-rules:", {
    setUp: function () {
    },

    tearDown: function () {
    },

    "Nested selectors (@media)": function(done) {
        var pages = {
            include: [fs.readFileSync("fixtures/markup.html").toString()]
        };
        var css = [".foo { color: red; } ",
                   "@media all and (min-width: 500px) {",
                     ".bar { background: blue; }",
                   " }"].join("");

        var expected = {
            foundSelectors: {
                ".foo": {
                    "matches_html": 1, "occurences_css": 1 },
                ".bar": {
                    "matches_html": 1, "occurences_css": 1 }
            }
        };

        lib.analyze(pages, css, null, null, function(result) {
            assert.match(result, expected);
            done();
        });
    },

    "Selectors succeding nested selectors (@media)": function(done) {
        var pages = {
            include: [fs.readFileSync("fixtures/markup.html").toString()]
        };
        var css = [".foo { color: red; } ",
                   "@media all and (min-width: 500px) ",
                     "{ .bar { background: blue; } ",
                   "} .qux { float: left; }"].join("");


        var expected = {
            foundSelectors: {
                ".foo": {
                    "matches_html": 1, "occurences_css": 1 },
                ".bar": {
                    "matches_html": 1, "occurences_css": 1 },
                ".qux": {
                    "matches_html": 1, "occurences_css": 1 }
            }
        };

        lib.analyze(pages, css, null, null, function(result) {
            assert.match(result, expected);
            done();
        });
    },

    "Ignores @font-face": function(done) {
        var pages = {
            include: ["<html><head></head><body class='foo'></body></html>"]
        };
        var css = ["@font-face {font-family: 'MyWebFont'; ",
                   "src: url('webfont.eot'); src: url('webfont.eot?#iefix') ",
                   "format('embedded-opentype'), url('webfont.woff') ",
                   "format('woff'), url('webfont.ttf') format('truetype'), ",
                   "url('webfont.svg#svgFontName') format('svg');}"].join("");

        var expected = {
            foundSelectors: {
                "@font-face": {
                    "matches_html": 0, "occurences_css": 1, ignored: true }
            }
        };

        lib.analyze(pages, css, null, null, function(result) {
            assert.match(result, expected);
            done();
        });
    },

    "Ignores @keyframe": function(done) {
        var pages = {
            include: ["<html><head></head><body class='foo'></body></html>"]
        };
        var css = ["@-webkit-keyframes progress-bar-stripes{",
                     "from{background-position:40px 0}",
                     "to{background-position:0 0}",
                   "}@-moz-keyframes progress-bar-stripes{",
                     "from{background-position:40px 0}",
                     "to{background-position:0 0}",
                   "}@-ms-keyframes progress-bar-stripes{",
                     "from{background-position:40px 0}",
                     "to{background-position:0 0}",
                   "}@-o-keyframes progress-bar-stripes{",
                     "from{background-position:0 0}",
                     "to{background-position:40px 0}",
                   "}@keyframes progress-bar-stripes{",
                     "from{background-position:40px 0}",
                     "to{background-position:0 0}}"].join("");

        var expected = {
            foundSelectors: {
                "@-webkit-keyframes progress-bar-stripes": {
                    "matches_html": 0, "occurences_css": 1, ignored: true },
                "@-moz-keyframes progress-bar-stripes": {
                    "matches_html": 0, "occurences_css": 1, ignored: true },
                "@-ms-keyframes progress-bar-stripes": {
                    "matches_html": 0, "occurences_css": 1, ignored: true },
                "@-o-keyframes progress-bar-stripes": {
                    "matches_html": 0, "occurences_css": 1, ignored: true },
                "@keyframes progress-bar-stripes": {
                    "matches_html": 0, "occurences_css": 1, ignored: true }
            },
            total_used: 0,
            total_ignored: 5
        };

        lib.analyze(pages, css, null, null, function(result) {
            assert.match(result, expected);
            done();
        });
    },

    "Handles @supports": function(done) {
            var pages = {
                include: ["<html><head></head><body class='foo baz'></body></html>"]
            };
            var css = [".foo { background: blue } ",
                   "@supports (box-shadow: 2px 2px 2px black) { ",
                   ".bar { box-shadow: 2px 2px 2px black; }} ",
                   "@-prefix-supports (box-shadow: 2px 2px 2px black) { ",
                   ".bar { box-shadow: 2px 2px 2px black; }} ",
                   ".baz { background: red }"].join("");

        var expected = {
            foundSelectors: {
                ".foo": {
                    "matches_html": 1, "occurences_css": 1 },
                ".baz": {
                    "matches_html": 1, "occurences_css": 1 }
            }
        };

        lib.analyze(pages, css, null, null, function(result) {
            assert.match(result, expected);
            done();
        });
    },

    "Handles @document": function(done) {
        var pages = {
            include: ["<html><head></head><body class='foo baz'></body></html>"]
        };
        var css = [".foo { background: blue } ",
                   "@document url(http://www.example.com/), ",
                     "url-prefix(http://www.example.com/Style/), ",
                     "domain(example.com),  regexp('https:.*') { ",
                       "body { color: red; background: blue; }}",
                   "@-prefix-document url(http://www.example.com/), ",
                     "url-prefix(http://www.example.com/Style/), ",
                     "domain(example.com),  regexp('https:.*') { ",
                       "body { color: red; background: blue; }}",
                   ".baz { background: red }"].join("");

        var expected = {
            foundSelectors: {
                ".foo": {
                    "matches_html": 1, "occurences_css": 1 },
                ".baz": {
                    "matches_html": 1, "occurences_css": 1 }
            }
        };

        lib.analyze(pages, css, null, null, function(result) {
            assert.match(result, expected);
            done();
        });
    }
});