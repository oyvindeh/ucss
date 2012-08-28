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
		sett.addResource({ path: "/rules.css", content: fs.readFileSync("fixtures/rules.css").toString() });
		sett.addResource({ path: "/rules-2.css", content: fs.readFileSync("fixtures/rules-2.css").toString() });
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
	
	"load css from url": function(done) {
		var markup = "<html><head></head><body></body></html>";
        var css = this.docRoot + "rules.css";
        var expected = {};

        lib.analyze(css, markup, null, null, function(result) {
            assert.equals(result.duplicates, expected);
            done();
        });
	}
});