"use strict";
require('source-map-support').install({
    handleUncaughtExceptions: false
});
var es6_promise_1 = require('es6-promise');
var chai_1 = require('chai');
var file_contents_1 = require('../lib/models/file-contents');
var format_1 = require('../lib/models/format');
var sort_contents_1 = require('../lib/util/sort-contents');
var sort_contents_2 = require('../lib/util/sort-contents');
describe('Sort', function () {
    describe('#isJSON', function () {
        var subject = sort_contents_2.isJSON;
        it('should be true for parsable content with the right extension', function () {
            var file = new file_contents_1.default('test.js', new Date(), '', '{"hi": 1}');
            var result = subject(file);
            chai_1.assert.isNotNull(result);
            chai_1.assert.equal(result.hi, 1);
        });
        it('should be true for parsable content with the right content type', function () {
            var file = new file_contents_1.default('test', new Date(), 'application/json', '{"hi": 1}');
            var result = subject(file);
            chai_1.assert.isNotNull(result);
            chai_1.assert.equal(result.hi, 1);
        });
        it('should be false for unparsable content with the right extension', function () {
            var file = new file_contents_1.default('test.js', new Date(), '', 'blah');
            var result = subject(file);
            chai_1.assert.isNull(result);
        });
    });
    describe('#getDate', function () {
        var subject = sort_contents_2.getDate;
        it('should pick up dates with a supported property', function () {
            var now = new Date();
            var result;
            result = subject({ date: now });
            chai_1.assert.equal(result, now);
            result = subject({ created: now });
            chai_1.assert.equal(result, now);
            result = subject({ creationDate: now });
            chai_1.assert.equal(result, now);
        });
        it('should not pick up dates on an supported property', function () {
            var now = new Date();
            var result;
            result = subject({ creationTime: now });
            chai_1.assert.isNull(result);
        });
        it('should pick up dates in priority order', function () {
            var now = new Date();
            var future = new Date(2100, 12, 1);
            var result;
            result = subject({ date: future, created: now });
            chai_1.assert.equal(result, now);
        });
    });
    describe('#sortJSON', function () {
        var subject = sort_contents_2.sortJSON;
        it('should sort files by date', function () {
            var now = new Date();
            var future = new Date(2100, 12, 1);
            var files = [
                new file_contents_1.default('test1.js', new Date(), '', JSON.stringify({ date: future })),
                new file_contents_1.default('test2.js', new Date(), '', JSON.stringify({ created: now }))
            ];
            var result = subject(files);
            chai_1.assert.isNotNull(result);
            chai_1.assert.lengthOf(result, 2);
            chai_1.assert.equal(new Date(result[0].created).valueOf(), now.valueOf());
            chai_1.assert.equal(new Date(result[1].date).valueOf(), future.valueOf());
        });
        it('should return null if files are not json', function () {
            var files = [
                new file_contents_1.default('test1.js', new Date(), '', "test"),
                new file_contents_1.default('test2.js', new Date(), '', "test 2")
            ];
            var result = subject(files);
            chai_1.assert.isNull(result);
        });
    });
    describe('#sort', function () {
        var subject = sort_contents_1.default;
        it('should sort text files', function () {
            var files = [
                new file_contents_1.default('test1.txt', new Date(), '', 'a\nz\nc'),
                new file_contents_1.default('test2.txt', new Date(), '', 'b\nq\n')
            ];
            return es6_promise_1.Promise.resolve()
                .then(function () {
                return subject(files);
            })
                .then(function (result) {
                chai_1.assert.isNotNull(result);
                chai_1.assert.equal(result.format, format_1.default.Text);
                chai_1.assert.equal(result.contents, ['a', 'b', 'c', 'q', 'z'].join('\n'));
            });
        });
        it('should sort JSON files with dates', function () {
            var now = new Date();
            var future = new Date(2100, 12, 1);
            var files = [
                new file_contents_1.default('test1.js', new Date(), '', JSON.stringify({ date: future })),
                new file_contents_1.default('test2.js', new Date(), '', JSON.stringify({ created: now }))
            ];
            return es6_promise_1.Promise.resolve()
                .then(function () {
                return subject(files);
            })
                .then(function (result) {
                chai_1.assert.isNotNull(result);
                chai_1.assert.equal(result.format, format_1.default.Json);
                chai_1.assert.equal(result.contents, JSON.stringify([
                    { created: now },
                    { date: future }
                ]));
            });
        });
        it("should sort JSON files even if some don't have dates", function () {
            var now = new Date();
            var future = new Date(2100, 12, 1);
            var files = [
                new file_contents_1.default('test1.js', new Date(), '', JSON.stringify({ notADate: 'hi' })),
                new file_contents_1.default('test2.js', new Date(), '', JSON.stringify({ created: now }))
            ];
            return es6_promise_1.Promise.resolve()
                .then(function () {
                return subject(files);
            })
                .then(function (result) {
                chai_1.assert.isNotNull(result);
                chai_1.assert.equal(result.format, format_1.default.Json);
                chai_1.assert.equal(result.contents, JSON.stringify([
                    { created: now },
                    { notADate: 'hi' }
                ]));
            });
        });
        it("should sort JSON files as text if one or more aren't JSON", function () {
            var now = new Date();
            var future = new Date(2100, 12, 1);
            var files = [
                new file_contents_1.default('test1.js', new Date(), '', JSON.stringify({ created: now })),
                new file_contents_1.default('test2.js', new Date(), '', 'not JSON')
            ];
            return es6_promise_1.Promise.resolve()
                .then(function () {
                return subject(files);
            })
                .then(function (result) {
                chai_1.assert.isNotNull(result);
                chai_1.assert.equal(result.format, format_1.default.Text);
                chai_1.assert.equal(result.contents, ['not JSON', JSON.stringify({ created: now })].join('\n'));
            });
        });
    });
});
//# sourceMappingURL=sort-spec.js.map