module.exports = {
    "auth": { // Want to do login?
        "username": "foo",
        "password": "bar",
        "loginUrl": "http://localhost:8000/accounts/login/",
        "loginFunc": "djangoLogin" // You may specify your own function here
    },
    "pages": {
        "crawl": "http://localhost:8000/",
        "exclude": [ // List of HTML files/URLs to check
            "http://localhost:8000/admin/*",
            "http://localhost:8000/foo/"
        ],
        "include": [ // List of HTML files/URLs to check
            "http://localhost:8001/unlinked_articles/1",
            "http://localhost:8001/unlinked_articles/2"
        ]
    },
    "css": [ // List of CSS files to check
        "base.css"
    ],
    "whitelist": [".foo", ".bar"], // CSS rules to ignore, e.g. ones added by JavaScript
    "timeout": 4000 // Timeout for HTTP requests (default is 4000ms).
};
