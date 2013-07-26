## uCSS (v0.3.0-beta)
Crawl website to find unused CSS selectors, as well as duplicate selectors.

Basic features:
* Find unused CSS selectors in a HTML code base.
* Find duplicate CSS selectors.
* Count matches for each rule.
* Follows links (crawl), within the given domain.

But wait, there's more! By setting up a config file, uCSS can also:
* Do login, and visit pages both as a logged in and logged out user.
* Exclude specific pages and/or subdomains (when crawling).
* Visit individual pages instead of, or in addition to, crawling.
* White list CSS rules to be ignored (e.g. those toggled by JavaScript).

uCSS is written for [Node](http://www.nodejs.org/). It can be used both as a
library and as a command line tool. With a little tweaking, it should be easy
to use it in other contexts as well.

Want to contribute? Please read below.

Please note: uCSS is currently in beta.

### Installation

`npm install ucss`

### Usage (command line)

```
$ ucss --help
Usage: ucss [OPTION]...

Options:
  --help            This help text.
  --html, -h        HTML to load (local file or URL).
  --css, -c         CSS to load (local file or URL).
  --config, -g      Config file to use.
  --used, -u        Show number of matches for each rule.
  --nosummary, -n   Do not output summary.
  --duplicates, -d  Show duplicates.

Either a config file, or HTML and CSS files are required. If no arguments are
specified, uCSS will look for a config_ucss.js file in the current directory.
```
So, to check a web page you could write
```
$ ucss -h http://example.com/foo.html -c http://example.com/foo.css
```
To output duplicates as well as all used and unused rules, you can do
```
$ ucss -d -u -h foo.html -c foo.css
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

### Usage (as library)

```
var css = ".foo {} .bar {} .baz {}";
var html = "<html><head></head><body class='foo'></body></html>";
var whitelist = [".baz"];
var auth = null;
ucss.analyze(css, html, whitelist, auth, function(result) {
    require('../lib/helpers/output').standard(
        result, false, false, false);
    };);
```

### Setting up a config file
There are several things you can do with a config file, that you cannot do with
command line arguments.

uCSS follows links by default. But there may be specific files, or whole
subdomains, that you don't want to check. Those can be listed inside
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

### Things to be aware of

#### Pages not reachable by crawler
Some pages are not accessible when crawling:
* Pages that are only accessible by posting a form will not be checked. You may
add them to pages.include if they reachable without posting data.
* All parameters in links are stripped away, so pages that are only accessible
through giving parameters will not be checked.
* Pages that are not linked to will not be checked. You may add them to pages.include.

#### At-rules
All at-rules are ignored, except @media: All the content inside media queries
is read as if there were no media query.

### What features are missing?
uCSS can (currently) NOT:
* Look for internal style sheets, or inline styles.
* Capture rules that are switched on using JavaScript after page load.

These features may, or may not, be added in the future.

### I want to contribute!

Great! Feel free to pick one of the issues, or submit a bug/feature you would
want to work on.

Please be tidy in your commits. Also, try to touch as small parts of the code
as possible. This makes it easier to review and manage pull requests. Make sure
your code is covered by tests, and write new ones if needed.

If you plan to do big changes or refactoring, please notify me first, so that
we can discuss this in advance.
