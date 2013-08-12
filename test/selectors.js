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

        var expected = {};
        expected.used = { ".foo": 1 };
        expected.duplicates = {};
        expected.ignored = {};

        lib.analyze(pages, css, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            assert.equals(result.ignored, expected.ignored);
            done();
        });
    },

    "Id": function(done) {
        var pages = {
            include: ["<html><head></head><body id='foo'></body></html>"]
        };
        var css = "#foo {}";

        var expected = {};
        expected.used = { "#foo": 1 };
        expected.duplicates = {};
        expected.ignored = {};

        lib.analyze(pages, css, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            assert.equals(result.ignored, expected.ignored);
            done();
        });
    },

    "All": function(done) {
        var pages = {
            include: ["<html><head></head><body><div></div></body></html>"]
        };
        var css = "* {}";

        var expected = {};
        expected.used = { "*": 4 };
        expected.duplicates = {};
        expected.ignored = {};

        lib.analyze(pages, css, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            assert.equals(result.ignored, expected.ignored);
            done();
        });
    },

    "Element": function(done) {
        var pages = {
            include: ["<html><head></head><body><div></div></body></html>"]
        };
        var css = "div {}";

        var expected = {};
        expected.used = { "div": 1 };
        expected.duplicates = {};
        expected.ignored = {};

        lib.analyze(pages, css, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            assert.equals(result.ignored, expected.ignored);
            done();
        });
    },

    "Element, element": function(done) {
        var pages = {
            include: [fs.readFileSync("fixtures/markup.html").toString()]
        };
        var css = ".foo, .bar { color: red; }";

        var expected = {};
        expected.duplicates = {};
        expected.used = { ".foo": 1, ".bar": 1 };
        expected.ignored = {};

        lib.analyze(pages, css, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            assert.equals(result.ignored, expected.ignored);
            done();
        });
    },

    "Element + element": function(done) {
        var pages = {
            include: [fs.readFileSync("fixtures/markup.html").toString()]
        };
        var css = ".foo + .bar { color: red; }";

        var expected = {};
        expected.duplicates = {};
        expected.used = { ".foo + .bar": 1 };
        expected.ignored = {};

        lib.analyze(pages, css, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            assert.equals(result.ignored, expected.ignored);
            done();
        });
    },

    "[attribute=value]": function(done) {
        var pages = {
            include: ["<html><head></head><body><div dir='rtl'></div></body></html>"]
        };
        var css = "div[dir='rtl'] {}";

        var expected = {};
        expected.used = { "div[dir='rtl']": 1 };
        expected.duplicates = {};
        expected.ignored = {};

        lib.analyze(pages, css, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            assert.equals(result.ignored, expected.ignored);
            done();
        });
    },

    "Element1~element2": function(done) {
        var pages = {
            include: ["<html><head></head><body><div></div><br/><p><br/><div></div><br/></body></html>"]
        };
        var css = "div~br {}";

        var expected = {};
        expected.used = { "div~br": 2 };
        expected.duplicates = {};
        expected.ignored = {};

        lib.analyze(pages, css, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            assert.equals(result.ignored, expected.ignored);
            done();
        });
    },


    "handles pseudo elements": function(done) {
        var pages = {
            include: ["<html><head></head><body class='foo'></body></html>"]
        };
        var css = [".foo::link{} .bar:lang(nb){} .foo::link{}",
                  ".foo{} .foo{} .bar{} .baz:after{} input:invalid{}"].join("");

        var expected = {};
        expected.used = { ".bar": 0, ".bar:lang(nb)": 0, ".baz:after": 0,
                          ".foo": 1, ".foo::link": 1, "input:invalid": 0 };
        expected.duplicates = { ".foo": 2, ".foo::link": 2 };

        lib.analyze(pages, css, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
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

        var expected = {};
        expected.duplicates = {};
        expected.used = { ".foo": 1, ".bar": 1};
        expected.ignored = {};

        lib.analyze(pages, css, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            assert.equals(result.ignored, expected.ignored);
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

        var expected = {};
        expected.duplicates = {};
        expected.used = { ".foo": 1, ".bar": 1, ".qux": 1};
        expected.ignored = {};

        lib.analyze(pages, css, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            assert.equals(result.ignored, expected.ignored);
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

        var expected = {};
        expected.duplicates = {};
        expected.used = {};
        expected.ignored = {
            "@font-face": 1
        };

        lib.analyze(pages, css, null, null, function(result) {
            assert.equals(result.duplicates, expected.duplicates);
            assert.equals(result.used, expected.used);
            assert.equals(result.ignored, expected.ignored);
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

        var expected = {};
        expected.duplicates = {};
        expected.used = {};
        expected.ignored = {
            '@-webkit-keyframes progress-bar-stripes': 1,
            '@-moz-keyframes progress-bar-stripes': 1,
            '@-ms-keyframes progress-bar-stripes': 1,
            '@-o-keyframes progress-bar-stripes': 1,
            '@keyframes progress-bar-stripes': 1
        };

        lib.analyze(pages, css, null, null, function(result) {
            assert.equals(result.duplicates, expected.duplicates);
            assert.equals(result.used, expected.used);
            assert.equals(result.ignored, expected.ignored);
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



        var expected = {};
        expected.duplicates = {};
        expected.used = { ".foo": 1, ".baz": 1 };
        expected.ignored = {};

        lib.analyze(pages, css, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            assert.equals(result.ignored, expected.ignored);
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

        var expected = {};
        expected.duplicates = {};
        expected.used = { ".foo": 1, ".baz": 1 };
        expected.ignored = {};

        lib.analyze(pages, css, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            assert.equals(result.ignored, expected.ignored);
            done();
        });
    }
});
