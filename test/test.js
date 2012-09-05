/* jshint: */
/*global setTimeout public_functions assert require fs:true sinon:true */

fs = require("fs");

if (typeof require !== "undefined") {
    var buster = require("buster");
    var lib = require("../lib/ucss");
}


buster.testCase("uCSS", {
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

    "finds unused rules": function(done) {
        var markup = fs.readFileSync("fixtures/markup.html").toString();
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

        expected.duplicates = {};

        lib.analyze(css, markup, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            done();
        });
    },

    "finds unused rules, with whitelist": function(done) {
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

    "finds unused rules in several files": function(done) {
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
    "finds unused rules in several files (with login)": function(done) {
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


buster.testCase("uCSS (using http)", {
    setUp: function () {
        var http = require("http");

        this.server = http.createServer(function (req, res) {
            if ("/markup1.html" === req.url) {
                res.end("<html><head></head><body class='foo'></body></html>");
            } else if ("/markup2.html" === req.url) {
                res.end("<html><head></head><body class='bar'></body></html>");
            } else if ("/rules1.css" === req.url) {
                res.end(".foo {} .bar {}");
            } else if ("/rules2.css" === req.url) {
                res.end(".baz {}");
            } else {
                res.writeHead(404);
                res.end();
            }
        }).listen(9988, "0.0.0.0");
    },

    tearDown: function () {
        this.server.close();
    },

    "can load and process resources": function(done) {
        var markup = ["http://127.0.0.1:9988/markup1.html",
                      "http://127.0.0.1:9988/markup2.html"];
        var css = ["http://127.0.0.1:9988/rules1.css",
                   "http://127.0.0.1:9988/rules2.css"];

        var expected = {};
        expected.used = {};
        expected.used[".bar"] = 1;
        expected.used[".baz"] = 0;
        expected.used[".foo"] = 1;
        expected.duplicates = {};

        lib.analyze(css, markup, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            done();
        });
    }
});