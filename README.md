## uCSS library
Find unused CSS, as well as duplicate CSS. Also, you can get an overview of how many times each rule has been used in your markup.

Key features:
* Find unused CSS selectors in a HTML code base.
* See how many times each CSS selector has been used.
* Find duplicate CSS selectors.

But wait, there's more! By setting up a config file, uCSS can also:
* Visit several URLs/HTML files in one go.
* Use several CSS files at once.
* Do login, and visit all pages both as a logged in and logged out user.
* Whitelist CSS rules that should be ignored.

uCSS is written for Node (http://www.nodejs.org/). It can be used both as a library and as a command line tool. With a little tweaking, it should also be easy to use it in other contexts as well.

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
  --config, -g      Config file to use.                                       [default: true]
  --used, -u        Show numbers on used rules, in addition to unused rules.  [default: false]
  --nosummary, -n   Output summary.                                           [default: false]
  --duplicates, -d  Show duplicates.                                          [default: false]

Either a config file, or HTML and CSS files are required. If no arguments are specified, uCSS
will look for a ucss.json file in the current directory.
```
So, to check a web page you could write
```
$ ucss -h http://example.com/foo.html -c foo.css
```
Note that the CSS file has to be stored locally (for the time being). To check multiple pages, and also output duplicates as well as all used and unused rules, you can do
```
$ ucss -d -u -h http://example.com/foo.html -h http://example.com/bar.html -c foo.css
```
To use a config file ("ucss.json") that you have created in the current folder, simply run
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

If you want to do more fancy stuff than visiting one URL/file at a time, you can specify a config file.

A config file will let you visit several URLs/files in one go, as well as fetch CSS from several files. You can also perform login, and white list rules that should be ignored. See the examples folder for an example config file.

You can specify several config files, either one for each of your projects, or several for one project, if needed.

There is an example config file in the the examples folder.

#### Logging in
Login requires you to set up a config file. In the config file, you can specify your own login function:

```
{
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
...or you can just specify a login helper:

```
    "loginFunc": "djangoLogin"
```
There is currently only one login helper available, for Django.

### Custom output

If you use uCSS as a library, you can specify a custom output function.