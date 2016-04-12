"use strict";
var es6_promise_1 = require('es6-promise');
var file_contents_1 = require('../models/file-contents');
var aws_sdk_1 = require('aws-sdk');
var content_type_1 = require('../util/content-type');
var sort_contents_1 = require('../util/sort-contents');
require('date-format-lite');
var S3Consolidator = (function () {
    function S3Consolidator(config) {
        this.config = config;
        aws_sdk_1.config.update({
            credentials: new aws_sdk_1.Credentials(config.accessKeyId, config.secretAccessKey),
            region: config.region
        });
        this.s3 = new aws_sdk_1.S3({
            credentials: new aws_sdk_1.Credentials(config.accessKeyId, config.secretAccessKey),
            region: config.region,
            bucket: config.bucket
        });
    }
    S3Consolidator.prototype.concatonate = function (keys, sort) {
        if (sort === void 0) { sort = sort_contents_1.default; }
        return this.downloadAll(keys)
            .then(function (result) {
            return sort(result);
        });
    };
    S3Consolidator.prototype.consolidate = function (keys, consolidatedKey, sort, acl) {
        var _this = this;
        if (sort === void 0) { sort = sort_contents_1.default; }
        if (acl === void 0) { acl = 'private'; }
        return this.concatonate(keys, sort)
            .then(function (result) {
            return _this.write(consolidatedKey, result.format, result.contents, acl);
        })
            .then(function () {
            var keysToDelete = keys.filter(function (row) {
                return row !== consolidatedKey;
            });
            return _this.deleteAll(keysToDelete);
        });
    };
    S3Consolidator.prototype.encodeKey = function (key) {
        return decodeURIComponent(key.replace(/\+/g, ' '));
    };
    S3Consolidator.prototype.downloadAll = function (keys) {
        var _this = this;
        var promises = keys.map(function (key) {
            return _this.download(key);
        });
        return es6_promise_1.Promise.all(promises);
    };
    S3Consolidator.prototype.download = function (key) {
        var _this = this;
        return new es6_promise_1.Promise(function (ok, fail) {
            var args = {
                Bucket: _this.config.bucket,
                Key: _this.encodeKey(key)
            };
            _this.s3.getObject(args, function (err, data) {
                if (err) {
                    if (err.code === 'NoSuchKey' || err.code === 'AccessDenied') {
                        return ok(null);
                    }
                    return fail(err);
                }
                var raw = data.Body.toString();
                ok(new file_contents_1.default(key, data.LastModified, data.ContentType, raw));
            });
        });
    };
    S3Consolidator.prototype.write = function (key, format, contents, acl) {
        var s3 = new aws_sdk_1.S3();
        var args = {
            Bucket: this.config.bucket,
            Key: key,
            ContentType: content_type_1.default(format),
            Body: new Buffer(contents),
            ACL: acl
        };
        return new es6_promise_1.Promise(function (ok, fail) {
            s3.putObject(args, function (err, data) {
                if (err) {
                    return fail(err);
                }
                ok();
            });
        });
    };
    S3Consolidator.prototype.deleteAll = function (keys) {
        var _this = this;
        var promises = keys.map(function (key) {
            return _this.deleteKey(key);
        });
        return es6_promise_1.Promise.all(promises);
    };
    S3Consolidator.prototype.deleteKey = function (key) {
        var _this = this;
        return new es6_promise_1.Promise(function (ok, fail) {
            var args = {
                Bucket: _this.config.bucket,
                Key: _this.encodeKey(key)
            };
            _this.s3.deleteObject(args, function (err, data) {
                if (err) {
                    return fail(err);
                }
                ok();
            });
        });
    };
    return S3Consolidator;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = S3Consolidator;
//# sourceMappingURL=s3-consolidator.js.map