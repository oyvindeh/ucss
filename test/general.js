/* global assert:true */

var fs = require("fs");

if (typeof require !== "undefined") {
    var buster = require("buster");
    var lib = require("../lib/ucss");
}


buster.testCase("uCSS", {
    setUp: function () {
    },

    tearDown: function () {
    },

    "handles no markup given": function(done) {
        var pages = {};
        var css = ".foo {}";

        var expected = {};

        lib.analyze(pages, css, null, null, function(result) {
            assert.equals(result, expected);
            done();
        });
    },
    "handles empty markup": function(done) {
        var pages = {};
        var css = ".foo {}";

        var expected = {};

        lib.analyze(pages, css, null, null, function(result) {
            assert.equals(result, expected);
            done();
        });
    },

    "handles no CSS given": function(done) {
        var pages = {
                include: ["<html></html>"]
        };

        var expected = {};

        lib.analyze(pages, null, null, null, function(result) {
            assert.equals(result, expected);
            done();
        });
    },
    "handles empty CSS": function(done) {
        var pages = {
            include: ["<html></html>"]
        };

        var expected = {};

        lib.analyze(pages, null, null, null, function(result) {
            assert.equals(result, expected);
            done();
        });
    },

    "works with several css instances": function(done) {
        var pages = {
            include: ["<html><head></head><body class='foo bar'></body></html>"]
        };
        var css = [".foo {}", ".bar {}"];

        var expected = {};
        expected.used = { ".foo": 1, ".bar": 1 };
        expected.duplicates = {};
        expected.ignored = {};

        lib.analyze(pages, css, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            assert.equals(result.ignored, expected.ignored);
            done();
        });
    },

    "finds duplicates": function(done) {
        var pages = {
            include: ["<html><head></head><body class='foo'></body></html>"]
        };
        var css = [".foo {} .bar{} .foo{} .foo{}",
                   ".bar{} .baz{}"];

        var expected = {};
        expected.used = { ".bar": 0, ".foo": 1, ".baz": 0 };
        expected.duplicates = {".foo": 3, ".bar": 2};

        lib.analyze(pages, css, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            done();
        });
    },

    "finds unused rules": function(done) {
        var pages = {
            include: [fs.readFileSync("fixtures/markup.html").toString()]
        };
        var css = fs.readFileSync("fixtures/rules.css").toString();

        var expected = {};
        expected.used = {'*': 9,
                         '.foo': 1,
                         '.bar': 1,
                         '.foo .bar': 0,
                         '.bar #baz': 1,
                         '.qux': 1,
                         '.quux': 0,
                         'span[dir="ltr"]': 1,
                         '.bar span[dir="ltr"]': 1,
                         '.foo span[dir="ltr"]': 0,
                         '.foo .qux .bar': 0,
                         '.foo .qux .bar .baz': 0 };

        expected.duplicates = {'.bar': 2};

        lib.analyze(pages, css, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            done();
        });
    },

    "finds unused rules, with whitelist": function(done) {
        var pages = {
            include: [fs.readFileSync("fixtures/markup.html").toString()]
        };
        var css = fs.readFileSync("fixtures/rules.css").toString();
        var context = {
            whitelist: ['.foo .qux .bar', '.foo .qux .bar .baz']
        };

        var expected = {};
        expected.used = {};
        expected.used['*'] = 9;
        expected.used['.foo'] = 1;
        expected.used['.bar'] = 1;
        expected.used['.foo .bar'] = 0;
        expected.used['.bar #baz'] = 1;
        expected.used['.qux'] = 1;
        expected.used['.quux'] = 0;
        expected.used['span[dir="ltr"]'] = 1;
        expected.used['.bar span[dir="ltr"]'] = 1;
        expected.used['.foo span[dir="ltr"]'] = 0;

        expected.duplicates = {'.bar': 2};

        lib.analyze(pages, css, context, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            done();
        });
    },

    "finds unused rules in several files": function(done) {
        var pages = {
            include: [fs.readFileSync("fixtures/markup.html").toString(),
                      fs.readFileSync("fixtures/markup2.html").toString()]
        };
        var css = fs.readFileSync("fixtures/rules.css").toString();

        var expected = {};
        expected['*'] = 18;
        expected['.foo'] = 3;
        expected['.bar'] = 2;
        expected['.foo .bar'] = 0;
        expected['.bar #baz'] = 2;
        expected['.qux'] = 2;
        expected['.quux'] = 0;
        expected['span[dir="ltr"]'] = 2;
        expected['.bar span[dir="ltr"]'] = 2;
        expected['.foo span[dir="ltr"]'] = 1;
        expected['.foo .qux .bar'] = 0;
        expected['.foo .qux .bar .baz'] = 0;

        lib.analyze(pages, css, null, null, function(result) {
            assert.equals(result.used, expected);
            done();
        });
    },

    "checks that lists works as params": function(done) {
        var pages = {
            include: ["<html><head></head><body class='foo bar'></body></html>"]
        };
        var css = [".foo {}"];

        var expected = {};
        expected.used = { ".foo": 1};
        expected.duplicates = {};
        expected.ignored = {};

        lib.analyze(pages, css, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            assert.equals(result.ignored, expected.ignored);
            done();
        });
    },

    "checks that strings works as params": function(done) {
        var pages = {
            include: "<html><head></head><body class='foo bar'></body></html>"
        };
        var css = ".foo {}";

        var expected = {};
        expected.used = { ".foo": 1};
        expected.duplicates = {};
        expected.ignored = {};

        lib.analyze(pages, css, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            assert.equals(result.ignored, expected.ignored);
            done();
        });
    }
});
