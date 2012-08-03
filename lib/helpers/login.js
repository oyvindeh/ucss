/* jshint: */
/*global module buster */

var jsdom = require('jsdom');
var jQuery = require('jquery');

module.exports = {
    /**
     * Django login with CSRF handling. Uses login page with CSRF, username and
     * password fields.
     *
     * @param {String} url Login URL
     * @param {String} username Username
     * @param {String} password Password
     * @param {Function} callback, that must take a cookie string ("key=value;") as parameter.
     */
    djangoLogin: function(url, username, password, callback) {
        var parts = require('url').parse(url);
        var protocol = parts.protocol.replace(":", "");

        var host = parts.host.split(":")[0]; // Strip port from host
        var path = parts.path;
        var port = parts.port;

        // Set port
        if (!port) {
            if ("https" === protocol) port = 443;
            else port = 80;
        }
        var options = {
            host: host,
            port: port,
            path: path
        };

        // Get login form, find crsf token, log in to get cookie.
        require(protocol).get(options, function(res) {
            var data = "";
            res.on('data', function (chunk) {
                data += chunk.toString();
            }).on('end', function() {
                jsdom.env({
                    html: data,
                    done: function(error, window) {                      
                        $ = jQuery.create(window);
                        // Get token
                        var token = $("input[name='csrfmiddlewaretoken']").attr("value").trim();
                        var setCookie = res.headers["set-cookie"];
                        // Find csrftoken and sessionid in set-cookie header
                        var cp = setCookie[0].split(";"); // Cookie parts
                        cp = cp.concat(setCookie[1].split(";")); // Cookie parts

                        var csrftoken, sessionid;
                        for (var i=0; i<cp.length; i++) {
                            if (-1 < cp[i].indexOf("csrftoken")) {
                                csrftoken = cp[i].split("=")[1].trim();
                            }
                            if (-1 < cp[i].indexOf("sessionid")) {
                                sessionid = cp[i].split("=")[1].trim();
                            }
                        }

                        // Log in
                        var querystring = require("querystring");
                        var postData = querystring.stringify({
                            "username": username,
                            "password": password,
                            "csrfmiddlewaretoken": token
                        });
                        var cookie = "csrftoken=" + csrftoken + ";sessionid=" + sessionid;

                        options.method = "POST";
                        options.headers = { "Cookie": cookie,
                                            "X-CSRFToken": token,
                                            'Content-Length': postData.length,
                                            "Content-Type": "application/x-www-form-urlencoded"};

                        var postReq = require(protocol).request(options, function(res) {
                            res.setEncoding('utf8');
                            res.on('data', function (chunk) {
                                console.log('Response: ' + chunk);
                            }).on('end', function() {
                                var setCookie = res.headers["set-cookie"];

                                // Find csrftoken and sessionid in set-cookie header
                                var cp = setCookie[0].split(";"); // Cookie parts

                                var csrftoken, sessionid;
                                for (var i=0; i<cp.length; i++) {
                                    if (-1 < cp[i].indexOf("csrftoken")) {
                                        csrftoken = cp[i].split("=")[1].trim();
                                    }
                                    if (-1 < cp[i].indexOf("sessionid")) {
                                        sessionid = cp[i].split("=")[1].trim();
                                    }
                                }
                                callback("sessionid=" + sessionid);
                            });
                        });

                        // post the data
                        postReq.write(postData);
                        postReq.end();
                    }
                });
            });
        }).on('error', function(e) {
            console.log("Got error: " + e.message);
        });
    }
};
