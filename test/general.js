/* global assert:true */

var fs = require('fs');

if (typeof require !== 'undefined') {
  var buster = require('buster');
  var lib = require('../lib/ucss');
}

var assert = buster.referee.assert;
var refute = buster.referee.refute;


buster.testCase('uCSS', {
  setUp: function () {
  },

  tearDown: function () {
  },

  'handles no markup given': function (done) {
    var pages = {};
    var css = '.foo {}';

    var expected = {};

    lib.analyze(pages, css, null, null, function (result) {
      assert.equals(result, expected);
      done();
    });
  },

  'handles empty markup': function (done) {
    var pages = {};
    var css = '.foo {}';

    var expected = {};

    lib.analyze(pages, css, null, null, function (result) {
      assert.equals(result, expected);
      done();
    });
  },

  'handles no CSS given': function (done) {
    var pages = {
      include: ['<html></html>']
    };

    var expected = {};

    lib.analyze(pages, null, null, null, function (result) {
      assert.equals(result, expected);
      done();
    });
  },
  'handles empty CSS': function (done) {
    var pages = {
      include: ['<html></html>']
    };

    var expected = {};

    lib.analyze(pages, null, null, null, function (result) {
      assert.equals(result, expected);
      done();
    });
  },

  'works with several css instances': function (done) {
    var pages = {
      include: ["<html><head></head><body class='foo bar'></body></html>"]
    };
    var css = ['.foo {}', '.bar {}'];

    var expected = {
      selectors: {
        '.foo': {
          'matches_html': 1, 'occurences_css': 1 },
        '.bar': {
          'matches_html': 1, 'occurences_css': 1 }
      },
      total_used: 2,
      total_unused: 0,
      total_ignored: 0,
      total_duplicates: 0
    };

    lib.analyze(pages, css, null, null, function (result) {
      assert.match(result, expected);
      done();
    });
  },

  'finds duplicates': function (done) {
    var pages = {
      include: ["<html><head></head><body class='foo'></body></html>"]
    };
    var css = ['.foo {} .bar{} .foo{} .foo{}',
                   '.bar{} .baz{}'];

    var expected = {
      selectors: {
        '.foo': {
          'matches_html': 1, 'occurences_css': 3 },
        '.bar': {
          'matches_html': 0, 'occurences_css': 2 },
        '.baz': {
          'matches_html': 0, 'occurences_css': 1 }
      },
      total_used: 1,
      total_unused: 2,
      total_ignored: 0,
      total_duplicates: 2
    };

    lib.analyze(pages, css, null, null, function (result) {
      assert.match(result, expected);
      done();
    });
  },

  'finds unused rules': function (done) {
    var pages = {
      include: [fs.readFileSync('fixtures/markup.html').toString()]
    };
    var css = fs.readFileSync('fixtures/rules.css').toString();

    var expected = {
      selectors: {
        '*': {
          'matches_html': 9, 'occurences_css': 1 },
        '.foo': {
          'matches_html': 1, 'occurences_css': 1 },
        '.bar': {
          'matches_html': 1, 'occurences_css': 2 },
        '.foo .bar': {
          'matches_html': 0, 'occurences_css': 1 },
        '.bar #baz': {
          'matches_html': 1, 'occurences_css': 1 },
        '.qux': {
          'matches_html': 1, 'occurences_css': 1 },
        '.quux': {
          'matches_html': 0, 'occurences_css': 1 },
        'span[dir="ltr"]': {
          'matches_html': 1, 'occurences_css': 1 },
        '.bar span[dir="ltr"]': {
          'matches_html': 1, 'occurences_css': 1 },
        '.foo span[dir="ltr"]': {
          'matches_html': 0, 'occurences_css': 1 },
        '.foo .qux .bar': {
          'matches_html': 0, 'occurences_css': 1 },
        '.foo .qux .bar .baz': {
          'matches_html': 0, 'occurences_css': 1 }
      },
      total_used: 7,
      total_unused: 5,
      total_ignored: 8,
      total_duplicates: 1
    };

    lib.analyze(pages, css, null, null, function (result) {
      assert.match(result, expected);
      done();
    });
  },

  'finds unused rules, with whitelist': function (done) {
    var pages = {
      include: [fs.readFileSync('fixtures/markup.html').toString()]
    };
    var css = fs.readFileSync('fixtures/rules.css').toString();
    var context = {
      whitelist: ['.foo .qux .bar', '.foo .qux .bar .baz']
    };

    var expected = {
      selectors: {
        '*': {
          'matches_html': 9, 'occurences_css': 1, whitelisted: false },
        '.foo': {
          'matches_html': 1, 'occurences_css': 1, whitelisted: false },
        '.bar': {
          'matches_html': 1, 'occurences_css': 2, whitelisted: false },
        '.foo .bar': {
          'matches_html': 0, 'occurences_css': 1, whitelisted: false },
        '.bar #baz': {
          'matches_html': 1, 'occurences_css': 1, whitelisted: false },
        '.qux': {
          'matches_html': 1, 'occurences_css': 1, whitelisted: false },
        '.quux': {
          'matches_html': 0, 'occurences_css': 1, whitelisted: false },
        'span[dir="ltr"]': {
          'matches_html': 1, 'occurences_css': 1, whitelisted: false },
        '.bar span[dir="ltr"]': {
          'matches_html': 1, 'occurences_css': 1, whitelisted: false },
        '.foo span[dir="ltr"]': {
          'matches_html': 0, 'occurences_css': 1, whitelisted: false },
        '.foo .qux .bar': {
          'matches_html': 0, 'occurences_css': 1, whitelisted: true },
        '.foo .qux .bar .baz': {
          'matches_html': 0, 'occurences_css': 1, whitelisted: true }
      },
      total_used: 7,
      total_unused: 3,
      total_ignored: 10,
      total_duplicates: 1
    };

    lib.analyze(pages, css, context, null, function (result) {
      assert.match(result, expected);
      done();
    });
  },

  'finds unused rules in several files': function (done) {
    var pages = {
      include: [fs.readFileSync('fixtures/markup.html').toString(),
                      fs.readFileSync('fixtures/markup2.html').toString()]
    };
    var css = fs.readFileSync('fixtures/rules.css').toString();

    var expected = {
      selectors: {
        '*': {
          'matches_html': 18, 'occurences_css': 1 },
        '.foo': {
          'matches_html': 3, 'occurences_css': 1 },
        '.bar': {
          'matches_html': 2, 'occurences_css': 2 },
        '.foo .bar': {
          'matches_html': 0, 'occurences_css': 1 },
        '.bar #baz': {
          'matches_html': 2, 'occurences_css': 1 },
        '.qux': {
          'matches_html': 2, 'occurences_css': 1 },
        '.quux': {
          'matches_html': 0, 'occurences_css': 1 },
        'span[dir="ltr"]': {
          'matches_html': 2, 'occurences_css': 1 },
        '.bar span[dir="ltr"]': {
          'matches_html': 2, 'occurences_css': 1 },
        '.foo span[dir="ltr"]': {
          'matches_html': 1, 'occurences_css': 1 },
        '.foo .qux .bar': {
          'matches_html': 0, 'occurences_css': 1 },
        '.foo .qux .bar .baz': {
          'matches_html': 0, 'occurences_css': 1 }
      },
      total_used: 8,
      total_unused: 4,
      total_ignored: 8,
      total_duplicates: 1
    };

    lib.analyze(pages, css, null, null, function (result) {
      assert.match(result, expected);
      done();
    });
  },

  'checks that lists works as params': function (done) {
    var pages = {
      include: ["<html><head></head><body class='foo bar'></body></html>"]
    };
    var css = ['.foo {}'];

    var expected = {
      selectors: {
        '.foo': {
          'matches_html': 1, 'occurences_css': 1 }
      },
      total_used: 1,
      total_unused: 0,
      total_ignored: 0,
      total_duplicates: 0
    };

    lib.analyze(pages, css, null, null, function (result) {
      assert.match(result, expected);
      done();
    });
  },

  'checks that strings works as params': function (done) {
    var pages = {
      include: "<html><head></head><body class='foo bar'></body></html>"
    };
    var css = '.foo {}';

    var expected = {
      selectors: {
        '.foo': {
          'matches_html': 1, 'occurences_css': 1 }
      },
      total_used: 1,
      total_unused: 0,
      total_ignored: 0,
      total_duplicates: 0
    };

    lib.analyze(pages, css, null, null, function (result) {
      assert.match(result, expected);
      done();
    });
  }
});
