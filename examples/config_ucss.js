module.exports = {
    "auth": { // Want to do login?
        "username": "foo",
        "password": "bar",
        "loginUrl": "http://localhost:8000/accounts/login/",
        "loginFunc": "djangoLogin" // You may specify your own function here
    },
    "pages": {
        "crawl": "http://localhost:8000/",
        "include": [ // HTML files/URLs to check
            "http://localhost:8001/unlinked_articles/1",
            "http://localhost:8001/unlinked_articles/2"
        ],
        "exclude": [ // HTML files/URLs to check
            "http://localhost:8000/admin/*",
            "http://localhost:8000/foo/"
        ]
    },
    "css": [ // CSS files to check
        "base.css"
    ],
    "whitelist": [".foo", ".bar"] // CSS rules to ignore
};
