var config = module.exports;

config["My tests"] = {
    rootPath: "../",
    environment: "node",
    resources: [
        "fixtures/*.css"
    ],
    tests: [
        "test/general.js",
        "test/http.js",
        "test/selectors.js",
        "test/crawler.js"
    ]
};