"use strict";
var format_1 = require('../models/format');
function contentType(format) {
    'use strict';
    switch (format) {
        case format_1.default.Text:
            return 'text/plain';
        case format_1.default.Json:
            return 'application/json';
        default:
            throw new Error('Unexpected format: ' + format);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = contentType;
//# sourceMappingURL=content-type.js.map