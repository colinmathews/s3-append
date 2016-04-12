"use strict";
var format_1 = require('../models/format');
var path = require('path');
var util = require('util');
var supportedDateFields = ['created', 'createDate', 'creationDate', 'date'];
function tryParse(text) {
    'use strict';
    try {
        return JSON.parse(text);
    }
    catch (err) {
        return null;
    }
}
function isJSON(file) {
    'use strict';
    if (file.contentType === 'application/json') {
        return tryParse(file.contents);
    }
    var extension = path.extname(file.key).toLowerCase();
    switch (extension) {
        case '.js':
        case '.json':
            return tryParse(file.contents);
        default:
            return null;
    }
}
exports.isJSON = isJSON;
function getDate(a) {
    'use strict';
    for (var i = 0; i < supportedDateFields.length; i++) {
        var key = supportedDateFields[i];
        var test_1 = a[key];
        if (test_1) {
            return test_1;
        }
    }
    return null;
}
exports.getDate = getDate;
function jsonCompare(a, b) {
    'use strict';
    var aDate = getDate(a);
    var bDate = getDate(b);
    if (aDate && bDate) {
        if (aDate < bDate) {
            return -1;
        }
        if (aDate > bDate) {
            return 1;
        }
    }
    if (aDate) {
        return -1;
    }
    if (bDate) {
        return 1;
    }
    return 0;
}
exports.jsonCompare = jsonCompare;
function sortJSON(files) {
    'use strict';
    var lines = files.reduce(function (result, row) {
        if (!result) {
            return result;
        }
        var json = isJSON(row);
        if (!json) {
            return null;
        }
        if (!util.isArray(json)) {
            json = [json];
        }
        return result.concat(json);
    }, []);
    if (!lines) {
        return null;
    }
    lines.sort(jsonCompare);
    return lines;
}
exports.sortJSON = sortJSON;
function sortContents(files) {
    'use strict';
    var json = sortJSON(files);
    if (!!json) {
        return {
            format: format_1.default.Json,
            contents: JSON.stringify(json)
        };
    }
    var lines = files.reduce(function (result, row) {
        var rowLines = row.contents.split('\n')
            .filter(function (inner) {
            return !!inner;
        });
        return result.concat(rowLines);
    }, []);
    lines.sort();
    return {
        format: format_1.default.Text,
        contents: lines.join('\n')
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = sortContents;
//# sourceMappingURL=sort-contents.js.map