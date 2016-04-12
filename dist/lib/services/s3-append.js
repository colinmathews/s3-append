"use strict";
var es6_promise_1 = require('es6-promise');
var format_1 = require('../models/format');
var aws_sdk_1 = require('aws-sdk');
var util = require('util');
var content_type_1 = require('../util/content-type');
require('date-format-lite');
var S3Append = (function () {
    function S3Append(config, key, format, acl) {
        if (format === void 0) { format = format_1.default.Text; }
        if (acl === void 0) { acl = 'private'; }
        this.config = config;
        this.key = key;
        this.format = format;
        this.acl = acl;
        this.hasChanges = false;
        this.pendingPromises = [];
        aws_sdk_1.config.update({
            credentials: new aws_sdk_1.Credentials(config.accessKeyId, config.secretAccessKey),
            region: config.region
        });
    }
    S3Append.prototype.appendWithDate = function (text, second, third) {
        var now = new Date();
        var formattedDate = now.format('YYYY-MM-DD hh:mm:ss.SS');
        return this.append(formattedDate + ": " + text, second, third);
    };
    S3Append.prototype.append = function (text, second, third) {
        var _this = this;
        var _a = this.parseAppendArgs(second, third), formatArgs = _a[0], autoFlush = _a[1];
        var promise = this.waitForPromises()
            .then(function () {
            return _this.readContents();
        })
            .then(function () {
            return _this.delegateAppend(text, formatArgs);
        })
            .then(function () {
            _this.hasChanges = true;
            if (autoFlush === true) {
                return _this.flush(promise);
            }
        });
        this.pendingPromises.push(promise);
        return promise;
    };
    S3Append.prototype.flush = function (promiseToIgnore) {
        var _this = this;
        return this.waitForPromises(promiseToIgnore)
            .then(function () {
            _this.pendingPromises = [];
            if (!_this.hasChanges) {
                return;
            }
            return _this.writeContents();
        });
    };
    S3Append.prototype.getContents = function () {
        var _this = this;
        return this.readContents()
            .then(function () {
            if (_this.format === format_1.default.Json) {
                return _this.contentsAsJson;
            }
            return _this.contents;
        });
    };
    S3Append.prototype.delete = function () {
        var _this = this;
        var s3 = new aws_sdk_1.S3();
        var args = {
            Bucket: this.config.bucket,
            Key: decodeURIComponent(this.key.replace(/\+/g, ' '))
        };
        return new es6_promise_1.Promise(function (ok, fail) {
            s3.deleteObject(args, function (err, data) {
                if (err) {
                    return fail(err);
                }
                _this.readDate = _this.contents = _this.contentsAsJson = null;
                ok();
            });
        });
    };
    S3Append.prototype.parseAppendArgs = function (second, third) {
        var formatArgs = [];
        var autoFlush = false;
        if (typeof (second) === 'boolean') {
            autoFlush = second;
        }
        else if (second instanceof Array) {
            formatArgs = second;
        }
        if (typeof (third) === 'boolean') {
            autoFlush = third;
        }
        return [formatArgs, autoFlush];
    };
    S3Append.prototype.waitForPromises = function (promiseToIgnore) {
        var wait = this.pendingPromises.filter(function (row) {
            return !promiseToIgnore || row !== promiseToIgnore;
        });
        return es6_promise_1.Promise.all(wait);
    };
    S3Append.prototype.readContents = function () {
        var _this = this;
        if (this.readDate) {
            return es6_promise_1.Promise.resolve();
        }
        var s3 = new aws_sdk_1.S3();
        var args = {
            Bucket: this.config.bucket,
            Key: decodeURIComponent(this.key.replace(/\+/g, ' '))
        };
        return new es6_promise_1.Promise(function (ok, fail) {
            s3.getObject(args, function (err, data) {
                if (err) {
                    if (err.code === 'AccessDenied') {
                        _this.onRead('');
                        return ok();
                    }
                    return fail(err);
                }
                var raw = data.Body.toString();
                _this.onRead(raw);
                ok();
            });
        });
    };
    S3Append.prototype.onRead = function (contents) {
        this.readDate = new Date();
        this.contents = contents;
        if (this.format === format_1.default.Json) {
            if (contents) {
                this.contentsAsJson = JSON.parse(contents);
            }
            else {
                this.contentsAsJson = [];
            }
        }
    };
    S3Append.prototype.writeContents = function () {
        var _this = this;
        var s3 = new aws_sdk_1.S3();
        var args = {
            Bucket: this.config.bucket,
            Key: this.key,
            ContentType: content_type_1.default(this.format),
            Body: new Buffer(this.contents),
            ACL: this.acl
        };
        return new es6_promise_1.Promise(function (ok, fail) {
            s3.putObject(args, function (err, data) {
                if (err) {
                    return fail(err);
                }
                _this.hasChanges = false;
                ok();
            });
        });
    };
    S3Append.prototype.delegateAppend = function (text, formatArgs) {
        switch (this.format) {
            case format_1.default.Text:
                return this.appendText(text, formatArgs);
            case format_1.default.Json:
                return this.appendJson(text, formatArgs);
            default:
                throw new Error('Unexpected format: ' + this.format);
        }
    };
    S3Append.prototype.appendText = function (text, formatArgs) {
        var message;
        if (typeof (text) === 'string') {
            message = util.format.apply(util, [text].concat(formatArgs));
        }
        else {
            message = JSON.stringify(text);
        }
        this.contents += message + '\n';
        return es6_promise_1.Promise.resolve();
    };
    S3Append.prototype.appendJson = function (text, formatArgs) {
        this.contentsAsJson.push(text);
        this.contents = JSON.stringify(this.contentsAsJson);
        return es6_promise_1.Promise.resolve();
    };
    return S3Append;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = S3Append;
//# sourceMappingURL=s3-append.js.map