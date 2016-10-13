/* global module */

var cheerio = require('cheerio');
var querystring = require('querystring');

module.exports = {
    /**
     * Django login with CSRF handling. Uses login page with CSRF, username and
     * password fields.
     *
     * PLEASE NOTE:
     * Django does not give any indication wheter login was succesfull or not,
     * so this code won't know.
     *
     * This code is rudimentary, and you may have to tweak it to make it work
     * for you. If so, you may want to copy it to "loginFunc" in your uCSS
     * config file.
     *
     * This code is not covered by any tests.
     *
     * @param {String} url Login URL
     * @param {String} username Username
     * @param {String} password Password
     * @param {Function} callback, that must take a cookie string ("key=value;") as parameter.
     */
  djangoLogin: function (url, username, password, callback) {
    var parts = require('url').parse(url);
    var protocol = parts.protocol.replace(':', '');

    var host = parts.host.split(':')[0]; // Strip port from host
    var path = parts.path;
    var port = parts.port;

        // Set port
    if (!port) {
      if ('https' === protocol) {
        port = 443;
      }
      else {
        port = 80;
      }
    }
    var options = {
      host: host,
      port: port,
      path: path
    };

        // Create a cookie string from the set-cookie header
    var makeCookieString = function (setCookie) {
            // Make string from array parts
      var cp = setCookie.join(';');
            // Split string to get cookie parts
      cp = cp.split(';');

      var csrftoken, sessionid;
      for (var i = 0; i < cp.length; i++) {
        if (-1 < cp[i].indexOf('csrftoken')) {
          csrftoken = cp[i].split('=')[1].trim();
        }
        if (-1 < cp[i].indexOf('sessionid')) {
          sessionid = cp[i].split('=')[1].trim();
        }
      }
      var cookie = 'sessionid=' + sessionid;
      if (csrftoken) {
        cookie += ';csrftoken=' + csrftoken;
      }

      return cookie;
    };

        // Get login form, find crsf token, log in to get cookie.
    require(protocol).get(options, function (res) {
      var data = '';
      res.on('data', function (chunk) {
        data += chunk.toString();
      }).on('end', function () {
        var $ = cheerio.load(data);

                // Get token
        var token = $("input[name='csrfmiddlewaretoken']").attr('value').trim();

                // Find csrftoken and sessionid in set-cookie header
        var cookie = makeCookieString(res.headers['set-cookie']);

                // Log in
        var postData = querystring.stringify({
          'username': username,
          'password': password,
          'csrfmiddlewaretoken': token
        });

        options.method = 'POST';
        options.headers = { 'Cookie': cookie,
                                    'X-CSRFToken': token,
                                    'Content-Length': postData.length,
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    'Referer': url
                };
        var postReq = require(protocol).request(options, function (res) {
          var cookie = makeCookieString(res.headers['set-cookie']);
          callback(cookie);
        });

                // post the data
        postReq.write(postData);
        postReq.end();
      });
    }).on('error', function (e) {
      console.log('Got error: ' + e.message);
    });
  }
};
