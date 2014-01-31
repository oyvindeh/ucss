## uCSS (v0.4.3-beta)
uCSS is made for crawling (large) websites to find unused CSS selectors.

### Features
Features of uCSS include:
* Find unused CSS selectors, given a HTML code base.
* Find duplicate CSS selectors.
* Count matches for each rule.
* Follows links (crawl), within the given domain.
* Give information about server responses, redirects, etc. while crawling, allowing you to find e.g. dead links.

By setting up a config file, uCSS can also:
* Do login, and visit pages both as a logged in and logged out user.
* Exclude specific pages and/or subdomains.
* Visit specific pages instead of, or in addition to, crawling.
* White list CSS rules to be ignored (e.g. those toggled by JavaScript).
* Customizable output.

uCSS is written for [Node](http://www.nodejs.org/). It can be used both as a
library and as a command line tool.

Want to contribute? Please see at the bottom.

Please note: uCSS is currently in beta. There will be bugs, docs may be
outdated, and functionality may change.

#### What uCSS can't do
uCSS does NOT:
* Capture rules that are switched on using JavaScript after page load.
* Look for style sheet URLs, internal style sheets, or inline styles in HTML
  code.
* Remove unused CSS. If you need to automatically strip away unused CSS from your favourite CSS library, you may find [UnCSS](https://github.com/giakki/uncss) helpful.

These features may, or may not, be added in the future.

### Installation

`npm install ucss -g`

If you use [Grunt](http://gruntjs.com/), check out [grunt-ucss](https://github.com/ullmark/grunt-ucss).

### Usage (command line)

For basic usage, you can use the command line options:
```
$ ucss --help
Usage: ucss [OPTION]...

Options:
  --help            This help text.
  --html, -h        HTML to load (local file or URL).
  --css, -c         CSS to load (local file or URL).
  --config, -g      Config file to use.
  --full, -f        Show full report, with details for each rule.
  --silent, -s      Only output list of rules. Nice if you need to pipe the output somewhere.
  --duplicates, -d  Show duplicates.

Either a config file, or HTML and CSS files are required. If no arguments are
specified, uCSS will look for a config_ucss.js file in the current directory.
```
So, to check a web page you could write
```
$ ucss -h http://example.com/foo.html -c http://example.com/foo.css

Note that if you use a selector both inside and outside a media query, it will
be counted as a duplicate.
```
To output a full report, with all found selectors and an overview of duplicates
and ignored ones, you can do:
```
$ ucss -f -h foo.html -c foo.css
```
As you can see in the examples above, files can be stored locally as well as on
the web.

To use a config file ("config_ucss.js") that you have created in the current
folder, simply run
```
$ ucss
```
or specify another file name using the -g option. For more info on the config
file, see below.

For advanced usage, please see the sections about config files.

### Usage (as library)

```
// css can be an array of strings, file paths, or URLs
var css = [".foo {} .bar {} .baz {}"];

// html can be an array of strings, file paths, or URLs
var html = ["<html><head></head><body class='foo'></body></html>"];

var context = {
    whitelist: [".baz"], // CSS selectors to ignore
    auth: null, // For login (please se example elsewhere)
    timeout: 400 // Request timeout (defaults to 400ms)
};
var logger = null; // Function for logging HTTP requests

// Do the magic
ucss.analyze(html, css, context, logger, function(result) {
    // Do something to the result object
    console.log(result);
);
```

### Setting up a config file
There are several things you can do with a config file, that you cannot do with
command line arguments.

uCSS follows links by default. But there may be specific files, or whole
subdomains, that you don't want to check. These can be listed inside
pages.exclude. If you want to exclude a whole subdomain, use a wildcard ("*")
at the end of the url (please see [example config
file](https://github.com/operasoftware/ucss/blob/master/examples/config_ucss.js)).

In other cases, you may want to visit just a single file, or there are files that
the crawler cannot reach (e.g. because they are not linked to). Those can be
added to pages.include. Also, if you want to visit certain pages under an
excluded subdomain, you can add those to pages.include. Note that pages.include
does not support wildcards.

In addition to managing what pages to visit (and not to visit), you can check
pages both as a regular visitor and as a logged in user. This is done by
specifying a function that performs a log in, and then returns a session cookie
for uCSS to use for identifying itself to the server.

Furthermore, you can create a white list of selectors to be ignored. This is
useful if you e.g. have classes toggled by JavaScript, or if you have special
styling for various error situations that is tricky to trigger.

As well as checking several html files, uCSS can also combine CSS from several
files. You can specify a list of CSS files in your config file.

If you name your config file "config_ucss.js", it will automatically be picked
up by ucss. You can also name your config file something else, and use the -g
option to point to it.

Again, please see the [example config
file](https://github.com/operasoftware/ucss/blob/master/examples/config_ucss.js).
If you want to write a custom login function, please see below.

#### Logging in
Login requires you to set up a config file. In the config file, you can specify
your own login function:

```
module.exports = {
    ...,
    auth: {
        "username": "foo",
        "password": "bar",
        "loginUrl": "http://example.com/login/",
        "loginFunc": function(url, username, password, callback) {
            // Do login, get cookie
            var cookie = "sessionid:1234"
            callback(cookie);
        }
    },
   ...
}

```
If you use Django, you can use the supplied Django login helper (see [example
config file](https://github.com/operasoftware/ucss/blob/master/examples/config_ucss.js)).

### Understanding the output
While crawling, uCSS will output all URLs it visits, with response status code.
If logged in, it will say so. It will also output a hash of the response body,
which may be useful if you want to make sure that uCSS was successfully logged
in (compare the hash of the logged in and the logged out visit).

When the crawling is done, you will get a list of all unused selectors. If
you've asked for a list of duplicates, that will be printed as well.

Lastly, a summary will be printed. This contains the total amount of CSS
selectors found, and how many used, unused and duplicates there were.

Using the --full option, you will get a more detailed and colorful output, with
all rules being listed with number of matches, in addition to number of
duplicates in CSS and details about ignored and whitelisted rules.

If the output doesn't suit your needs, and you know some JavaScript, you may
customize it.

### Customizable output
You can configure uCSS to do logging and handle the result differently from
what's default. Do this by adding an "output" property in the config, which can
contain two functions, named "logger" and "result".

```
module.exports = {
    ...,
    "output": {
        "logger": function(response, originalUrl, loggedIn) {
            // Do some logging here, e.g. using console.log.
        },
        "result": function(result) {
            // Do something with the result object, e.g. print every rule
            // found, together with positions in CSS file:
            for (var s in result.selectors) {
                // Only unused rules:
                if (result.selectors[s].matches_html === 0) {
                    // Print position(s), given it's only one CSS file:
                    var pos_css = result.selectors[s].pos_css;
                    var key = Object.keys(pos_css)[0];
                    console.log(s + ": " + pos_css[key]);
                }
            }
        }
   },
   ...
}

```

#### Logging
The "logger" function is called every time there is a response to a HTTP
request. It takes three parameters: "res" is a response object, as returned by
[request](https://github.com/mikeal/request). "originalUrl" is a string that
points to the HTML instance being visited. "loggedIn" is a boolean that is true
if uCSS has sent an authentication cookie in the request header.

This function is normally used for logging, but you can make it do whatever you
want. Just note that it is triggered by an event, so uCSS will not wait for it
to return.

Setting "logger" to null will silence logging.

#### Result
The "result" function is called when uCSS is done. It recieves an object with
three properties: "used", "duplicates" and "ignored". "used" shows all CSS
rules that has been matched in the HTML (including how many times).
"duplicates" shows all duplicate CSS rules, including how many times they've
been found. "ignored" shows all ignored rules.

This function can also whatever you want, e.g. write the result to a file.

### Nice to know

#### Some pages are not reachable by crawler
Some pages are not accessible when crawling:
* Pages that are only accessible by posting a form will not be checked. You may
add them to pages.include if they are reachable without posting data.
* All parameters in links are normally stripped away when crawling, which may
have side effects for the rendering of some pages. If you want an URL to be
visited with specific parameters, you have to include it in pages.include.
* When crawling, pages that are not linked to in other pages will not be
checked. You may add them to pages.include.

#### At-rules
All at-rules are ignored, except @media: All the content inside media queries
is read as if there were no media query.

### I want to contribute!

Great! Feel free to pick one of the issues, or submit a bug/feature you would
want to work on.

Please be tidy in your commits. Also, try to touch as small parts of the code
as possible. This makes it easier to review and manage pull requests. Make sure
your code is covered by tests, and write new ones if needed.

If you plan to do big changes or refactoring, please notify me first, so that
we can discuss this in advance.
