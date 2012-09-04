/* jshint: */
/*global setTimeout public_functions assert require fs:true sinon:true */

fs = require("fs");

if (typeof require !== "undefined") {
    var buster = require("buster");
    var lib = require("../lib/ucss");
}


buster.testCase("Functional tests:", {
    setUp: function () {
    },

    tearDown: function () {
    },

    "works with empty markup": function(done) {
        var markup = "";
        var css = ".foo {}";

        var expected = {};

        lib.analyze(css, markup, null, null, function(result) {
            assert.equals(result, expected);
            done();
        });
    },

    "works with several css instances": function(done) {
        var markup = "<html><head></head><body class='foo bar'></body></html>";
        var css = [".foo {}", ".bar {}"];

        var expected = {};
        expected.used = { ".foo": 1, ".bar": 1 };
        expected.duplicates = {};

        lib.analyze(css, markup, null, null, function(result) {
            assert.equals(result, expected);
            done();
        });
    },

    "works with empty CSS": function(done) {
        var markup = "<html></html>";
        var css = "";

        var expected = {};

        lib.analyze(css, markup, null, null, function(result) {
            assert.equals(result, expected);
            done();
        });
    },

    "finds duplicates": function(done) {
        var markup = "<html><head></head><body class='foo'></body></html>";
        var css = ".foo {} .bar{} .foo{} .foo{} .bar{} .baz{}";

        var expected = {};
        expected.used = { ".bar": 0, ".foo": 1, ".baz": 0 };
        expected.duplicates = {".foo": 3, ".bar": 2};

        lib.analyze(css, markup, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            done();
        });
    },

    "handles pseudo elements": function(done) {
        var markup = "<html><head></head><body class='foo'></body></html>";
        var css = ".foo::link{} .bar:lang(nb){} .foo::link{}"
                + ".foo{} .foo{} .bar{} .baz:after{} input:invalid{}";

        var expected = {};
        expected.used = { ".bar": 0, ".bar:lang(nb)": 0, ".baz:after": 0,
                          ".foo": 1, ".foo::link": 1, "input:invalid": 0 };
        expected.duplicates = { ".foo": 2, ".foo::link": 2 };

        lib.analyze(css, markup, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            done();
        });
    },

    "find unused rules": function(done) {
        var markup = fs.readFileSync("fixtures/markup.html").toString();
        var css = fs.readFileSync("fixtures/rules.css").toString();

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
        expected.used['.foo .qux .bar'] = 0;
        expected.used['.foo .qux .bar .baz'] = 0;

        expected.duplicates = {};

        lib.analyze(css, markup, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            done();
        });
    },

    "find unused rules, with whitelist": function(done) {
        var markup = fs.readFileSync("fixtures/markup.html").toString();
        var css = fs.readFileSync("fixtures/rules.css").toString();

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

        expected.duplicates = {};

        var whitelist = ['.foo .qux .bar', '.foo .qux .bar .baz'];

        lib.analyze(css, markup, whitelist, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            done();
        });
    },

    "find unused rules in several files": function(done) {
        var markup = [fs.readFileSync("fixtures/markup.html").toString(),
                      fs.readFileSync("fixtures/markup2.html").toString()];
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

        lib.analyze(css, markup, null, null, function(result) {
            assert.equals(result.used, expected);
            done();
        });
    },

    // Doesn't do actual login, but checks that occurences are doubled, since
    // every page is checked twice (once with cookie set, and once without).
    "find unused rules in several files (with login)": function(done) {
        var markup = [fs.readFileSync("fixtures/markup.html").toString(),
                      fs.readFileSync("fixtures/markup2.html").toString()];
        var css = fs.readFileSync("fixtures/rules.css").toString();

        var expected = {};
        expected['*'] = 36;
        expected['.foo'] = 6;
        expected['.bar'] = 4;
        expected['.foo .bar'] = 0;
        expected['.bar #baz'] = 4;
        expected['.qux'] = 4;
        expected['.quux'] = 0;
        expected['span[dir="ltr"]'] = 4;
        expected['.bar span[dir="ltr"]'] = 4;
        expected['.foo span[dir="ltr"]'] = 2;
        expected['.foo .qux .bar'] = 0;
        expected['.foo .qux .bar .baz'] = 0;

        var auth = {
            "username": "foo",
            "password": "bar",
            "loginUrl": "http://example.com/login/",
            "loginFunc": function(url, username, password, callback) {
                callback("1234");
            }
        };

        lib.analyze(css, markup, null, auth, function(result) {
            assert.equals(result.used, expected);
            done();
        });
    }
});
