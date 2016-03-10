"use strict";
require('source-map-support').install({
    handleUncaughtExceptions: false
});
var path = require('path');
var fs = require('fs');
var chai_1 = require('chai');
var s3_config_1 = require('../lib/models/s3-config');
var format_1 = require('../lib/models/format');
var s3_append_1 = require('../lib/services/s3-append');
describe('Append', function () {
    var subject;
    var key;
    var before = function (format) {
        var jsonPath = path.resolve(__dirname, '../../aws-config.json');
        if (!fs.existsSync(jsonPath)) {
            throw new Error("Please create a 'aws-config.json' file in the root directory of this project to test with AWS resources");
        }
        var rawConfig = JSON.parse(fs.readFileSync(jsonPath));
        var s3Config = new s3_config_1.default(rawConfig);
        var now = new Date();
        var uniqueID = now.format('YYYY-MM-DD hh:mm:ss.SS');
        key = "" + rawConfig.testKeyPrefix + uniqueID + ".txt";
        subject = new s3_append_1.default(s3Config, key, format);
    };
    describe('#text', function () {
        beforeEach(function () {
            before(format_1.default.Text);
        });
        afterEach(function () {
            return subject.delete();
        });
        it('should append text', function () {
            this.timeout(10000);
            return subject.append('Test 1')
                .then(function () {
                return subject.append('Test 2', true);
            })
                .then(function () {
                return subject.getContents();
            })
                .then(function (contents) {
                chai_1.assert.equal(contents, 'Test 1\nTest 2\n');
            });
        });
        it('should format text', function () {
            this.timeout(10000);
            return subject.append('Hi %s, this is a test: %s', ['Colin', 5], true)
                .then(function () {
                return subject.getContents();
            })
                .then(function (contents) {
                chai_1.assert.equal(contents, 'Hi Colin, this is a test: 5\n');
            });
        });
        it('should append a date', function () {
            this.timeout(10000);
            return subject.appendWithDate('Test 1')
                .then(function () {
                return subject.appendWithDate('Test 2', true);
            })
                .then(function () {
                return subject.getContents();
            })
                .then(function (contents) {
                var lines = contents.split('\n');
                chai_1.assert.lengthOf(lines, 3);
                chai_1.assert.include(lines[0], 'Test 1');
                chai_1.assert.include(lines[1], 'Test 2');
                chai_1.assert.equal(lines[2], '');
                chai_1.assert.match(lines[0], /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}: Test 1$/);
            });
        });
        it('should allow back-to-back appends', function () {
            this.timeout(10000);
            subject.append('Test 1');
            return subject.append('Test 2', true)
                .then(function () {
                return subject.getContents();
            })
                .then(function (contents) {
                chai_1.assert.equal(contents, 'Test 1\nTest 2\n');
            });
        });
    });
    describe('#json', function () {
        beforeEach(function () {
            before(format_1.default.Json);
        });
        afterEach(function () {
            return subject.delete();
        });
        it('should append json', function () {
            var first = { a: 'one' };
            var second = { b: 'two' };
            this.timeout(10000);
            return subject.append(first)
                .then(function () {
                return subject.append(second, true);
            })
                .then(function () {
                return subject.getContents();
            })
                .then(function (contents) {
                chai_1.assert.equal(JSON.stringify(contents), JSON.stringify([first, second]));
            });
        });
    });
});
//# sourceMappingURL=append-spec.js.map