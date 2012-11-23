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