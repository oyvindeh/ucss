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