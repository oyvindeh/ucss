var config = module.exports;

config["My tests"] = {
    rootPath: "../",
    environment: "node",
    resources: [
        "fixtures/*.css"
    ],
    tests: [
        "test/test.js",
        "test/*-test.js"
    ]
};