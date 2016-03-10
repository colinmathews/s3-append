"use strict";
var S3Config = (function () {
    function S3Config(props) {
        var _this = this;
        if (props === void 0) { props = {}; }
        Object.keys(props).forEach(function (key) {
            _this[key] = props[key];
        });
    }
    return S3Config;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = S3Config;
//# sourceMappingURL=s3-config.js.map