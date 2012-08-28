var config = module.exports;

config["My tests"] = {
    rootPath: "../",
    environment: "node",
    resources: [
        "fixtures/*.css"
    ],
    tests: [
        "test/test.js"
    ]
};
// TODO add config for test-server.js, currently called via `node test/test-server.js`