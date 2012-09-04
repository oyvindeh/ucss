if (typeof require !== "undefined") {
    var buster = require("buster");
    var lib = require("../lib/ucss");
}

buster.testCase("Functional tests with server:", {

    setUp: function () {
        var http = require("http");
        var fs = require("fs");
        var rs = require("buster-resources");
        var virtualDocRoot = "/styles";
        var port = 9988;
        var middleware = rs.resourceMiddleware.create(virtualDocRoot);
        var sett = rs.resourceSet.create();
        sett.addResource({ path: "/rules-remote-1.css", content: fs.readFileSync("fixtures/rules-remote-1.css").toString() });
        sett.addResource({ path: "/rules-remote-2.css", content: fs.readFileSync("fixtures/rules-remote-2.css").toString() });
        middleware.mount("/", sett);

        this.server = http.createServer(function (req, res) {
            if (middleware.respond(req, res)) { return; }
            res.writeHead(404);
            res.end();
        }).listen(port);
        this.docRoot = "http://localhost:"+ port + virtualDocRoot + "/";
    },
    tearDown: function () {
        this.server.close();
    },
    
    "load css from url - multiple files": function(done) {
        var markup = "<html><head></head><body></body></html>";
        var css = [ this.docRoot + "rules-remote-1.css" , this.docRoot + "rules-remote-2.css" ];
        var expected = {
            total: 6+6
        };
        var oSize = function(obj) {
                var size = 0, key;
                for (key in obj) {
                    if (obj.hasOwnProperty(key)) size++;
                }
                return size;
        };

        lib.analyze(css, markup, null, null, function(result) {
            var total = oSize(result.used);
        
            assert.equals(total, expected.total);
            done();
        });
    },
    
    "load css from url - same files": function(done) {
        var markup = "<html><head></head><body></body></html>";
        var css = [ this.docRoot + "rules-remote-1.css" , this.docRoot + "rules-remote-1.css" ];
        var expected = {
            total: 6
        };
        var oSize = function(obj) {
                var size = 0, key;
                for (key in obj) {
                    if (obj.hasOwnProperty(key)) size++;
                }
                return size;
        };

        lib.analyze(css, markup, null, null, function(result) {
            var total = oSize(result.used);
        
            assert.equals(total, expected.total);
            done();
        });
    }    
});