/* jshint: */
/*global setTimeout public_functions assert require fs:true sinon:true */

fs = require("fs");

if (typeof require !== "undefined") {
    var buster = require("buster");
    var lib = require("../lib/ucss");
}


buster.testCase("uCSS crawler", {
    setUp: function () {
        var http = require("http");

        this.server = http.createServer(function (req, res) {
            if ("/markup1.html" === req.url) {
                res.end(["<html>",
                         "  <head>",
                         "  </head>",
                         "  <body class='foo'>",
                         "    <a href='markup2.html'>markup2</a>",
                         "    <a href='markup1.html'>markup1</a>",
                         "  </body>",
                         "</html>"].join(""));
            } else if ("/markup2.html" === req.url) {
                res.end(["<html>",
                         "  <head>",
                         "  </head>",
                         "  <body class='bar'>",
                         "    <a href='markup1.html'>markup1</a>",
                         "  </body>",
                         "</html>"].join(""));
            } else if ("/external_links.html" === req.url) {
                res.end(["<html>",
                         "  <head>",
                         "  </head>",
                         "  <body class='bar'>",
                         "    <a href='http://127.0.0.1:9989/index.html'>index.html</a>",
                         "    <a href='http://127.0.0.1:9988/markup1.html'>markup1</a>",
                         "    <a href='/markup2.html'>markup1</a>",
                         "  </body>",
                         "</html>"].join(""));
            } else if ("/rules1.css" === req.url) {
                res.end(".foo {} .bar {}");
            } else {
                res.writeHead(404);
                res.end();
            }
        }).listen(9988, "0.0.0.0");

        this.anotherServer = http.createServer(function (req, res) {
            if ("/index.html" === req.url) {
                res.end("<html><head></head><body class='baz'></body></html>");
            }
        }).listen(9989, "0.0.0.0");
    },

    tearDown: function () {
        this.server.close();
        this.anotherServer.close();
    },

    "can crawl webpages": function(done) {
        var markup = ["http://127.0.0.1:9988/markup1.html"];
        var css = ["http://127.0.0.1:9988/rules1.css"];

        var expected = {};
        expected.used = {};
        expected.used[".bar"] = 1;
        expected.used[".foo"] = 1;
        expected.duplicates = {};

        var context = {
            css: css,
            html: "http://127.0.0.1:9988/markup.html",
            crawl: true
        };

        lib.analyze(css, markup, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            done();
        });
    },

    "does not go outside given domain": function(done) {
        var markup = ["http://127.0.0.1:9988/external_links.html"];
        var css = ["http://127.0.0.1:9988/rules1.css"];

        var expected = {};
        expected.used = {};
        expected.used[".bar"] = 2;
        expected.used[".foo"] = 1;
        expected.duplicates = {};

        var context = {
            css: css,
            html: "http://127.0.0.1:9988/markup.html",
            crawl: true
        };

        lib.analyze(css, markup, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            done();
        });
    }
});

buster.testCase("uCSS crawler also", {
    setUp: function () {
        var http = require("http");

        this.server = http.createServer(function (req, res) {
            if ("/path1/relative_paths.html" === req.url) {
                res.end(["<html>",
                         "  <head>",
                         "  </head>",
                         "  <body>",
                         "    <a href='relative1.html'>index.html</a>",
                         "    <a href='../relative2.html'>markup1</a>",
                         "    <a href='/relative3.html'>markup1</a>",
                         "    <a href='../path2/relative4.html'>markup1</a>",
                         "  </body>",
                         "</html>"].join(""));
            } else if ("/path1/relative1.html" === req.url) {
                res.end(["<html>",
                         "  <head>",
                         "  </head>",
                         "  <body class='foo'>",
                         "  </body>",
                         "</html>"].join(""));
            } else if ("/relative2.html" === req.url) {
                res.end(["<html>",
                         "  <head>",
                         "  </head>",
                         "  <body class='bar'>",
                         "  </body>",
                         "</html>"].join(""));
            } else if ("/relative3.html" === req.url) {
                res.end(["<html>",
                         "  <head>",
                         "  </head>",
                         "  <body class='baz'>",
                         "  </body>",
                         "</html>"].join(""));
            } else if ("/path2/relative4.html" === req.url) {
                res.end(["<html>",
                         "  <head>",
                         "  </head>",
                         "  <body class='qux'>",
                         "  </body>",
                         "</html>"].join(""));
            } else if ("/rules1.css" === req.url) {
                res.end(".foo {} .bar {} .baz {} .qux {}");
            } else {
                res.writeHead(404);
                res.end();
            }
        }).listen(9988, "0.0.0.0");
    },

    tearDown: function () {
        this.server.close();
    },

    "handles relative paths": function(done) {
        var markup = ["http://127.0.0.1:9988/path1/relative_paths.html"];
        var css = ["http://127.0.0.1:9988/rules1.css"];

        var expected = {};
        expected.used = {};
        expected.used[".foo"] = 1;
        expected.used[".bar"] = 1;
        expected.used[".baz"] = 1;
        expected.used[".qux"] = 1;
        expected.duplicates = {};

        var context = {
            css: css,
            html: "http://127.0.0.1:9988/markup.html",
            crawl: true
        };

        lib.analyze(css, markup, null, null, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            done();
        });
    }

});
