/*global assert:true */

/* PLEASE NOTE: There are tests elsewhere that also does login. */


if (typeof require !== "undefined") {
    var buster = require("buster");
    var lib = require("../lib/ucss");
}

var assert = buster.referee.assert;
var refute = buster.referee.refute;


var pageSet = {
    "/rules1.css": ".logged-in {} .logged-out {} .foo {}",
    "/markup1.html": {
        "logged-out":
            ["<html>",
             "  <head>",
             "  </head>",
             "  <body class='foo'>",
             "  <p class='logged-out'>You are logged in</p>",
             "  </body>",
             "</html>"].join(""),
        "logged-in":
            ["<html>",
             "  <head>",
             "  </head>",
             "  <body class='foo'>",
             "    <p class='logged-in'>You are not logged in</p>",
             "  </body>",
             "</html>"].join("")
    }
};

buster.testCase("uCSS", {
    setUp: function () {
        var http = require("http");
        this.server = http.createServer(function (req, res) {
            res.setHeader("content-type", "text/html");

            if (req.url) {
                if (pageSet && req.url.indexOf("html") > -1) { // HTML
                    if (req.headers["cookie"]) { // Logged in
                        res.end(pageSet[req.url]["logged-in"]);
                    } else { // Not logged in
                        res.end(pageSet[req.url]["logged-out"]);
                    }
                } else { // CSS
                    res.end(pageSet[req.url]);
                }
            } else {
                res.writeHead(404);
                res.end();
            }
        }).listen(9988, "0.0.0.0");
    },

    tearDown: function () {
        this.server.close();
    },

    "finds different classes when logged in than when logged out (and vice versa)": function(done) {
        var pages = {
            crawl: ["http://127.0.0.1:9988/markup1.html"]
        };
        var css = ["http://127.0.0.1:9988/rules1.css"];

        var context = {
            auth: {
                "username": "foo",
                "password": "bar",
                "loginUrl": "http://example.com/login/",
                "loginFunc": function(url, username, password, callback) {
                    callback("1234");
                }
            }
        };

        var expected = {
            selectors: {
                ".foo": {
                    "matches_html": 2, "occurences_css": 1 },
                ".logged-in": {
                    "matches_html": 1, "occurences_css": 1 },
                ".logged-out": {
                    "matches_html": 1, "occurences_css": 1 }
            },
            total_used: 3,
            total_unused: 0,
            total_ignored: 0,
            total_duplicates: 0
        };

        lib.analyze(pages, css, context, null, function(result) {
            assert.match(result, expected);
            done();
        });
    },

    "does not find classes for logged in pages when logged out": function(done) {
        var pages = {
            crawl: ["http://127.0.0.1:9988/markup1.html"]
        };
        var css = ["http://127.0.0.1:9988/rules1.css"];

        var expected = {
            selectors: {
                ".foo": {
                    "matches_html": 1, "occurences_css": 1 },
                ".logged-in": {
                    "matches_html": 0, "occurences_css": 1 },
                ".logged-out": {
                    "matches_html": 1, "occurences_css": 1 }
            },
            total_used: 2,
            total_unused: 1,
            total_ignored: 0,
            total_duplicates: 0
        };

        lib.analyze(pages, css, null, null, function(result) {
            assert.match(result, expected);
            done();
        });
    }
});
