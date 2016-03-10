require('source-map-support').install({
  handleUncaughtExceptions: false
});
import { Promise } from 'es6-promise';
import { assert } from 'chai';
import FileContents from '../lib/models/file-contents';
import Format from '../lib/models/format';
import sortContents from '../lib/util/sort-contents';
import { isJSON, getDate, sortJSON } from '../lib/util/sort-contents';

describe('Sort', () => {
  describe('#isJSON', () => {
    let subject = isJSON;

    it('should be true for parsable content with the right extension', function() {
      let file = new FileContents('test.js', new Date(), '', '{"hi": 1}');
      let result = subject(file);
      assert.isNotNull(result);
      assert.equal(result.hi, 1);
    });

    it('should be true for parsable content with the right content type', function() {
      let file = new FileContents('test', new Date(), 'application/json', '{"hi": 1}');
      let result = subject(file);
      assert.isNotNull(result);
      assert.equal(result.hi, 1);
    });

    it('should be false for unparsable content with the right extension', function() {
      let file = new FileContents('test.js', new Date(), '', 'blah');
      let result = subject(file);
      assert.isNull(result);
    });
  });

  describe('#getDate', () => {
    let subject = getDate;

    it('should pick up dates with a supported property', function() {
      let now = new Date();
      let result;
      result = subject({ date: now });
      assert.equal(result, now);
      result = subject({ created: now });
      assert.equal(result, now);
      result = subject({ creationDate: now });
      assert.equal(result, now);
    });

    it('should not pick up dates on an supported property', function() {
      let now = new Date();
      let result;
      result = subject({ creationTime: now });
      assert.isNull(result);
    });

    it('should pick up dates in priority order', function() {
      let now = new Date();
      let future = new Date(2100, 12, 1);
      let result;
      result = subject({ date: future, created: now });
      assert.equal(result, now);
    });
  });

  describe('#sortJSON', () => {
    let subject = sortJSON;

    it('should sort files by date', function() {
      let now = new Date();
      let future = new Date(2100, 12, 1);
      let files = [
        new FileContents('test1.js', new Date(), '', JSON.stringify({ date: future })),
        new FileContents('test2.js', new Date(), '', JSON.stringify({ created: now }))
      ];
      let result = subject(files);
      assert.isNotNull(result);
      assert.lengthOf(result, 2);
      assert.equal(new Date(result[0].created).valueOf(), now.valueOf());
      assert.equal(new Date(result[1].date).valueOf(), future.valueOf());
    });

    it('should return null if files are not json', function() {
      let files = [
        new FileContents('test1.js', new Date(), '', "test"),
        new FileContents('test2.js', new Date(), '', "test 2")
      ];
      let result = subject(files);
      assert.isNull(result);
    });
  });

  describe('#sort', () => {
    let subject = sortContents;

    it('should sort text files', function() {
      let files = [
        new FileContents('test1.txt', new Date(), '', 'a\nz\nc'),
        new FileContents('test2.txt', new Date(), '', 'b\nq\n')
      ];
      return Promise.resolve()
      .then(() => {
        return subject(files);
      })
      .then((result) => {
        assert.isNotNull(result);
        assert.equal(result.format, Format.Text);
        assert.equal(result.contents, ['a', 'b', 'c', 'q', 'z'].join('\n'));
      });
    });

    it('should sort JSON files with dates', function() {
      let now = new Date();
      let future = new Date(2100, 12, 1);
      let files = [
        new FileContents('test1.js', new Date(), '', JSON.stringify({ date: future })),
        new FileContents('test2.js', new Date(), '', JSON.stringify({ created: now }))
      ];
      return Promise.resolve()
      .then(() => {
        return subject(files);
      })
      .then((result) => {
        assert.isNotNull(result);
        assert.equal(result.format, Format.Json);
        assert.equal(result.contents, JSON.stringify([
          { created: now },
          { date: future }
        ]));
      });
    });

    it("should sort JSON files even if some don't have dates", function() {
      let now = new Date();
      let future = new Date(2100, 12, 1);
      let files = [
        new FileContents('test1.js', new Date(), '', JSON.stringify({ notADate: 'hi' })),
        new FileContents('test2.js', new Date(), '', JSON.stringify({ created: now }))
      ];
      return Promise.resolve()
        .then(() => {
          return subject(files);
        })
        .then((result) => {
          assert.isNotNull(result);
          assert.equal(result.format, Format.Json);
          assert.equal(result.contents, JSON.stringify([
            { created: now },
            { notADate: 'hi' }
          ]));
        });
    });

    it("should sort JSON files as text if one or more aren't JSON", function() {
      let now = new Date();
      let future = new Date(2100, 12, 1);
      let files = [
        new FileContents('test1.js', new Date(), '', JSON.stringify({ created: now })),
        new FileContents('test2.js', new Date(), '', 'not JSON')
      ];
      return Promise.resolve()
        .then(() => {
          return subject(files);
        })
        .then((result) => {
          assert.isNotNull(result);
          assert.equal(result.format, Format.Text);
          assert.equal(result.contents, ['not JSON', JSON.stringify({ created: now })].join('\n'));
        });
    });
  });
});
