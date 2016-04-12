"use strict";
require('source-map-support').install({
    handleUncaughtExceptions: false
});
var path = require('path');
var fs = require('fs');
var chai_1 = require('chai');
var s3_config_1 = require('../lib/models/s3-config');
var s3_consolidator_1 = require('../lib/services/s3-consolidator');
var aws_sdk_1 = require('aws-sdk');
function deleteKey(config, s3, key) {
    return new Promise(function (ok, fail) {
        var args = {
            Bucket: config.bucket,
            Key: decodeURIComponent(key.replace(/\+/g, " "))
        };
        s3.deleteObject(args, function (err, data) {
            if (err) {
                return fail(err);
            }
            ok();
        });
    });
}
function writeKey(config, s3, key, contents) {
    var args = {
        Bucket: config.bucket,
        Key: key,
        ContentType: 'text/plain',
        Body: new Buffer(contents),
        ACL: 'private'
    };
    return new Promise(function (ok, fail) {
        s3.putObject(args, function (err, data) {
            if (err) {
                return fail(err);
            }
            ok();
        });
    });
}
function downloadKey(config, s3, key) {
    return new Promise(function (ok, fail) {
        var args = {
            Bucket: config.bucket,
            Key: decodeURIComponent(key.replace(/\+/g, " "))
        };
        s3.getObject(args, function (err, data) {
            if (err) {
                if (err.code === 'NoSuchKey' || err.code === 'AccessDenied') {
                    return ok(null);
                }
                return fail(err);
            }
            var raw = data.Body.toString();
            ok(raw);
        });
    });
}
describe('Consolidator', function () {
    var subject;
    var s3;
    var s3Config;
    var testKeyPrefix;
    var key;
    var files;
    var thirdFile;
    before(function () {
        var jsonPath = path.resolve(__dirname, '../../aws-config.json');
        if (!fs.existsSync(jsonPath)) {
            throw new Error("Please create a 'aws-config.json' file in the root directory of this project to test with AWS resources");
        }
        var rawConfig = JSON.parse(fs.readFileSync(jsonPath));
        s3Config = new s3_config_1.default(rawConfig);
        testKeyPrefix = rawConfig.testKeyPrefix;
        if (typeof (testKeyPrefix) === 'undefined') {
            throw new Error('Please set "testKeyPrefix" in your aws-config.json file');
        }
        subject = new s3_consolidator_1.default(s3Config);
        s3 = new aws_sdk_1.S3({
            credentials: new aws_sdk_1.Credentials(s3Config.accessKeyId, s3Config.secretAccessKey),
            region: s3Config.region,
            bucket: s3Config.bucket
        });
        files = [{
                key: testKeyPrefix + 'one.txt',
                contents: 'a\nz\nc'
            }, {
                key: testKeyPrefix + 'two.txt',
                contents: 'b\nx\n'
            }];
        thirdFile = testKeyPrefix + 'three.txt';
    });
    describe('#concatonate', function () {
        beforeEach(function () {
            var promises = files.map(function (row) {
                return writeKey(s3Config, s3, row.key, row.contents);
            });
            return Promise.all(promises);
        });
        afterEach(function () {
            var promises = files.map(function (row) {
                return deleteKey(s3Config, s3, row.key);
            });
            return Promise.all(promises);
        });
        it('should concatonate two files', function () {
            return subject.concatonate(files.map(function (row) { return row.key; }))
                .then(function (result) {
                chai_1.assert.isNotNull(result);
                chai_1.assert.equal(result.contents, ['a', 'b', 'c', 'x', 'z'].join('\n'));
            });
        });
    });
    describe('#consolidate', function () {
        beforeEach(function () {
            this.timeout(5000);
            var promises = files.map(function (row) {
                return writeKey(s3Config, s3, row.key, row.contents);
            });
            return Promise.all(promises);
        });
        afterEach(function () {
            this.timeout(5000);
            var promises = files.map(function (row) {
                return deleteKey(s3Config, s3, row.key);
            })
                .concat([deleteKey(s3Config, s3, thirdFile)]);
            return Promise.all(promises);
        });
        it('should consolidate two files into a new file', function () {
            this.timeout(5 * 1000);
            return subject.consolidate(files.map(function (row) { return row.key; }), thirdFile)
                .then(function (result) {
                var promises = [files[0].key, files[1].key, thirdFile].map(function (row) {
                    return downloadKey(s3Config, s3, row);
                });
                return Promise.all(promises);
            })
                .then(function (result) {
                chai_1.assert.isNotNull(result);
                chai_1.assert.lengthOf(result, 3);
                chai_1.assert.isNull(result[0]);
                chai_1.assert.isNull(result[1]);
                chai_1.assert.equal(result[2], ['a', 'b', 'c', 'x', 'z'].join('\n'));
            });
        });
        it('should consolidate two files into a one of the same files', function () {
            return subject.consolidate(files.map(function (row) { return row.key; }), files[0].key)
                .then(function (result) {
                var promises = [files[0].key, files[1].key].map(function (row) {
                    return downloadKey(s3Config, s3, row);
                });
                return Promise.all(promises);
            })
                .then(function (result) {
                chai_1.assert.isNotNull(result);
                chai_1.assert.lengthOf(result, 2);
                chai_1.assert.isNull(result[1]);
                chai_1.assert.equal(result[0], ['a', 'b', 'c', 'x', 'z'].join('\n'));
            });
        });
    });
});
//# sourceMappingURL=consolidator-spec.js.map