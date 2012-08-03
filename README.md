## uCSS library
Find unused CSS, as well as duplicate CSS. Also, you can get an overview of how many times each rule has been used.

Key features:
* Find unused CSS selectors in a HTML code base
* See how many times each CSS selector has been used
* Find duplicate CSS selectors

But wait, there's more! By creating a small JSON file with some specs, you can also:
* Visit several URLs/HTML files in one go
* Use several CSS files at once
* Do login, and visit all pages both as a logged in user and logged out
* Whitelist CSS rules to be ignored

The library is written for Node (http://www.nodejs.org/). However, it should be easy to use it in other contexts as well.

uCSS can also be used as a command line tool.

### Installation

`npm install ucss`

### Usage (command line)

```
$ ucss --help
Find out if CSS rules are used or not.
Usage: ucss [OPTION]...

Options:
  --help            This help text.                                         
  --html, -h        HTML to load.                                           
  --css, -c         CSS to load.                                            
  --spec, -s        Spec file to use.                                         [default: true]
  --used, -u        Show numbers on used rules, in addition to unused rules.  [default: false]
  --nosummary, -n   Output summary.                                           [default: false]
  --duplicates, -d  Show duplicates.                                          [default: false]

Either a spec file, or HTML and CSS files are required.
```

For examples on writing a spec file, please see the examples folder.

### Usage (as library)

```
var css = ".foo {} .bar {} .baz {}";
var html = "<html><head></head><body class='foo'></body></html>";
var whitelist = [".baz"];
var auth = null;
ucss.analyze(css, html, whitelist, auth, function(result) {
    require('../lib/helpers/output').standard(
        result, argv.used, !argv.nosummary, argv.duplicates);
    };);
```

### Logging in

Specify your own login function in spec file.

### Custom output

Specify your own output function (currently only available when using as library, not from command line/spec)
