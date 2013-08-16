## 2013.08.16, Version 0.4.0-beta

*   Features:
    - Add option --full to show full details for all rules.
    - Remove option --used (functionality covered by --full).
    - New output report, with more information.

*   Refactoring:
    - Refactored the result object. This has implications for custom
      output functions, as well as library use.
    - Add CSS selector position(s) in source file to result object.

## 2013.08.12, Version 0.3.2-beta

*   Features:
    - Added possibility to use custom logger and custom result handler.

## 2013.08.01, Version 0.3.1-beta

*   Bugs/issues fixed:
    - Parameters are now kept for links in pages.include (but removed from
      links found by the crawler).
    - Request pooling disabled, to avoid hangs
      (see https://github.com/mikeal/request/issues/465).
    - Added (configurable) timeout for requests.
    - Improved logging and error handling.
    - Handles links without href attributes.

## 2013.07.26, Version 0.3.0-beta

*   Features:
    - Follow links/crawl (#3).
      When running from command line, crawling is the new default.

*   Other:
    - Replace jsdom and jQuery with Cheerio.
    - Use request module instead of http/https (except in helpers/login.js).
    - Major refactoring, which includes introducing the promises pattern for
      managing callbacks (using Q).

## 2013.03.11, Version 0.2.2-beta

*   Bug fixes:
    - Make sure @keyframe and @font-face does not crash uCSS (issues #15, #16)

## 2012.11.23, Version 0.2.1-beta

*   Bug fixes:
    - Fix loading of config from relative paths.

## 2012.09.17, Version 0.2.0-beta

*   Changes:
    - Change config file format from JSON to Node module
      NOTE: This breaks backwards compability.
*   Bug fixes:
    - Fix custom login functions to work.

## 2012.09.10, Version 0.1.2-beta

*   Features:
    - Adds support for fetching CSS over HTTP.
*   Bug/stability fixes:
    - Now handles grouped selectors (issue #11)
    - Now tests selectors inside e.g. a media query (issue #10)
    - Now properly reads selectors after e.g. a media query (issue #10)
*   Dependency changes:
    - Adds cssom CSS parser, to properly extract selectors

## 2012.08.17, Version 0.1.1-beta

*   Stability fixes:
    - Ignore pseudo part of a selector.
    - Ignore at-rules (like @media and @font-face).

## 2012.08.10, Version 0.1.0-beta

*   First release.