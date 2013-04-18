/* global assert:true */


if (typeof require !== "undefined") {
    var buster = require("buster");
    var lib = require("../lib/ucss");
}


var pageSetOne = {
    "/rules1.css": ".foo {} .bar {}",
    "/rules2.css": ".foo {} .bar {} .baz {} .qux {}",
    "/rules3.css": ".foo {} .bar {} .baz {} .qux {} .quux {}",
    "/markup1.html":
            ["<html>",
            "  <head>",
            "  </head>",
            "  <body class='foo'>",
            "    <a href='markup2.html'>markup2</a>",
            "    <a href='markup1.html'>markup1</a>",
            "  </body>",
            "</html>"].join(""),
    "/markup2.html":
            ["<html>",
            "  <head>",
            "  </head>",
            "  <body class='bar'>",
            "    <a href='markup1.html'>markup1</a>",
            "  </body>",
            "</html>"].join(""),
    "/external_links.html":
            ["<html>",
            "  <head>",
            "  </head>",
            "  <body class='bar'>",
            "    <a href='http://127.0.0.1:9989/index.html'>index.html</a>",
            "    <a href='http://127.0.0.1:9988/markup1.html'>markup1</a>",
            "    <a href='/markup2.html'>markup1</a>",
            "  </body>",
            "</html>"].join(""),
    "/path1/relative_paths.html":
            ["<html>",
            "  <head>",
            "  </head>",
            "  <body>",
            "    <a href='relative1.html'>index.html</a>",
            "    <a href='../relative2.html'>markup1</a>",
            "    <a href='/relative3.html'>markup1</a>",
            "    <a href='../path2/relative4.html'>markup1</a>",
            "  </body>",
            "</html>"].join(""),
    "/path1/relative1.html":
            ["<html>",
            "  <head>",
            "  </head>",
            "  <body class='foo'>",
            "  </body>",
            "</html>"].join(""),
    "/relative2.html":
            ["<html>",
            "  <head>",
            "  </head>",
            "  <body class='bar'>",
            "  </body>",
            "</html>"].join(""),
    "/relative3.html":
            ["<html>",
            "  <head>",
            "  </head>",
            "  <body class='baz'>",
            "  </body>",
            "</html>"].join(""),
    "/path2/relative4.html":
            ["<html>",
            "  <head>",
            "  </head>",
            "  <body class='qux'>",
            "  </body>",
            "</html>"].join(""),
    "/not_linked_to.html":
            ["<html>",
            "  <head>",
            "  </head>",
            "  <body class='quux'>",
            "  </body>",
            "</html>"].join("")
};


var pageSetTwo = {
    "/index.html": "<html><head></head><body class='baz'></body></html>"
};


buster.testCase("uCSS crawler", {
    setUp: function () {
        var http = require("http");

        this.server = http.createServer(function (req, res) {
            if (req.url in pageSetOne) {
                res.end(pageSetOne[req.url]);
            } else {
                res.writeHead(404);
                res.end();
            }
        }).listen(9988, "0.0.0.0");

        this.anotherServer = http.createServer(function (req, res) {
            if (req.url in pageSetTwo) {
                res.end(pageSetTwo[req.url]);
            } else {
                res.writeHead(404);
                res.end();
            }
        }).listen(9989, "0.0.0.0");
    },

    tearDown: function () {
        this.server.close();
        this.anotherServer.close();
    },

    "can crawl webpages": function(done) {
        var context = {
            pages: {
                crawl: ["http://127.0.0.1:9988/markup1.html"]
            },
            css: ["http://127.0.0.1:9988/rules1.css"]
        };

        var expected = {};
        expected.used = {};
        expected.used[".bar"] = 1;
        expected.used[".foo"] = 1;
        expected.duplicates = {};

        lib.analyze(context, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            done();
        });
    },

    "does not go outside given domain": function(done) {
        var context = {
            pages: {
                crawl: ["http://127.0.0.1:9988/external_links.html"]
            },
            css: ["http://127.0.0.1:9988/rules1.css"]
        };

        var expected = {};
        expected.used = {};
        expected.used[".bar"] = 2;
        expected.used[".foo"] = 1;
        expected.duplicates = {};

        lib.analyze(context, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            done();
        });
    },

    "handles relative paths": function(done) {
        var context = {
            pages: {
                crawl: ["http://127.0.0.1:9988/path1/relative_paths.html"]
            },
            css: ["http://127.0.0.1:9988/rules2.css"]
        };

        var expected = {};
        expected.used = {};
        expected.used[".foo"] = 1;
        expected.used[".bar"] = 1;
        expected.used[".baz"] = 1;
        expected.used[".qux"] = 1;
        expected.duplicates = {};

        lib.analyze(context, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            done();
        });
    },

    "handles includes": function(done) {
        var context = {
            pages: {
                crawl: ["http://127.0.0.1:9988/path1/relative_paths.html"],
                include: ["http://127.0.0.1:9988/not_linked_to.html"]
            },
            css: ["http://127.0.0.1:9988/rules3.css"]
        };

        var expected = {};
        expected.used = {};
        expected.used[".foo"] = 1;
        expected.used[".bar"] = 1;
        expected.used[".baz"] = 1;
        expected.used[".qux"] = 1;
        expected.used[".quux"] = 1;
        expected.duplicates = {};

        lib.analyze(context, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            done();
        });
    },

    "handles excludes": function(done) {
        var context = {
            pages: {
                crawl: ["http://127.0.0.1:9988/path1/relative_paths.html"],
                exclude: ["http://127.0.0.1:9988/path1/relative1.html"]
            },
            css: ["http://127.0.0.1:9988/rules3.css"]
        };

        var expected = {};
        expected.used = {};
        expected.used[".foo"] = 0;
        expected.used[".bar"] = 1;
        expected.used[".baz"] = 1;
        expected.used[".qux"] = 1;
        expected.used[".quux"] = 0;
        expected.duplicates = {};

        lib.analyze(context, function(result) {
            assert.equals(result.used, expected.used);
            assert.equals(result.duplicates, expected.duplicates);
            done();
        });
    },

    "// Does not follow links in includes": function() {

    }
});
