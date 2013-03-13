module.exports = {
    "auth": { // Want to do login?
        "username": "foo",
        "password": "bar",
        "loginUrl": "http://localhost:8000/accounts/login/",
        "loginFunc": "djangoLogin" // You may specify your own function here
    },
    "html": [ // HTML files/URLs to check
        "http://localhost:8000/",
        "http://localhost:8000/article/1",
        "http://localhost:8000/login/",
        "http://localhost:8000/preferences/",
        "http://localhost:8000/en/search/?query=",
        "http://localhost:8000/en/search/?query=foo"
    ],
    "css": [ // CSS files to check
        "base.css"
    ],
    "whitelist": [".foo", ".bar"] // CSS rules to ignore
};
