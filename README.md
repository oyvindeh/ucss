## uCSS (v0.2.2-beta)
Find unused CSS selectors, as well as duplicate selectors. Also, you can get an overview of how many matches there are for each rule in your markup.

Key features:
* Find unused CSS selectors in a HTML code base.
* See how many times each CSS selector has been used.
* Find duplicate CSS selectors.

But wait, there's more! By setting up a config file, uCSS can also:
* Visit several URLs/HTML files in one go.
* Use several CSS files at once.
* Do login, and visit pages both as a logged in and logged out user.
* Whitelist CSS rules that should be ignored.

uCSS is written for [Node](http://www.nodejs.org/). It can be used both as a library and as a command line tool. With a little tweaking, it should also be easy to use it in other contexts as well.

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
  --html, -h        HTML to load.                                           
  --css, -c         CSS to load.                                            
  --config, -g      Config file to use.
  --used, -u        Show number of matches for each rule.
  --nosummary, -n   Do not output summary.
  --duplicates, -d  Show duplicates.

Either a config file, or HTML and CSS files are required. If no arguments are specified, uCSS
will look for a config_ucss.js file in the current directory.
```
So, to check a web page you could write
```
$ ucss -h http://example.com/foo.html -c http://example.com/foo.css
```
To output duplicates as well as all used and unused rules, you can do
```
$ ucss -d -u -h foo.html -c foo.css
```
As you can see in the examples above, files can be stored locally as well as on the web.

To use a config file ("config_ucss.js") that you have created in the current folder, simply run
```
$ ucss
```
or specify another file name using the -g option. For more info on the config file, see below.

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
uCSS allows multiple HTML files/URLs as argument, but it soon gets tiresome to write (and remember) them all. By creating a small config file, you can set up uCSS to automatically visit a set of URLs when you run it.

In addition to this, you can also specify a function that uCSS can use for login. uCSS will then visit each of the URLs in your config file both as a logged in and logged out user.

Furthermore, you can create a white list of selectors that should be ignored. This is useful if you have e.g. classes that are toggled by JavaScript and thus might not be visible when uCSS visits the page, or if you have special styling for various error situations that is tricky to trigger.

As well as using several html files, uCSS can also combine CSS from several files, which can also be specified in your config file.

If you name your config file "config_ucss.js", it will automatically be picked up by ucss. You can also name your config file something else, and use the -g option to point to it.

Please see the [example config file](https://github.com/operasoftware/ucss/blob/master/examples/config_ucss.js). If you want to write a custom login function, see below.

#### Logging in
Login requires you to set up a config file. In the config file, you can specify your own login function:

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
If you use Django, you can use the supplied Django login helper (see [example config file](https://github.com/operasoftware/ucss/blob/master/examples/config_ucss.js)).

### What is missing?
uCSS can (currently) NOT:
* Look for internal style sheets, or inline styles.
* Capture classes etc. that is switched on/off using JavaScript in a browser.

### I want to contribute!

Great! Feel free to pick one of the issues, or submit a bug/feature you would want to work on.

Please be tidy in your commits. Also, try to touch as small parts of the code as possible. This makes it easier to review and manage pull requests. Make sure your code is covered by tests.

If you plan to do big changes or refactorings, please notify me first, so that we can discuss this in advance.
