import { Promise } from 'es6-promise';
import FileContents from '../models/file-contents';
import Format from '../models/format';
import path = require('path');
import util = require('util');

const supportedDateFields = ['created', 'createDate', 'creationDate', 'date'];

function tryParse(text: string): any {
  'use strict';
  try {
    return JSON.parse(text);
  }
  catch (err) {
    return null;
  }
}

export function isJSON(file: FileContents): any {
  'use strict';
  if (file.contentType === 'application/json') {
    return tryParse(file.contents);
  }
  let extension = path.extname(file.key).toLowerCase();
  switch (extension) {
    case '.js':
    case '.json':
      return tryParse(file.contents);
    default:
      return null;
  }
}

export function getDate(a: any): Date {
  'use strict';
  for (let i = 0; i < supportedDateFields.length; i++) {
    let key = supportedDateFields[i];
    let test = a[key];
    if (test) {
      return test;
    }
  }
  return null;
}

export function jsonCompare(a: any, b: any): number {
  'use strict';
  let aDate = getDate(a);
  let bDate = getDate(b);
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

export function sortJSON(files: FileContents[]): any[] {
  'use strict';
  let lines = files.reduce(
    (result, row) => {
      if (!result) {
        return result;
      }
      let json = isJSON(row);
      if (!json) {
        return null;
      }
      if (!util.isArray(json)) {
        json = [json];
      }
      return result.concat(json);
    },
    []
  );
  if (!lines) {
    return null;
  }

  lines.sort(jsonCompare);
  return lines;
}

export default function sortContents(files: FileContents[]): any | Promise<any> {
  'use strict';
  let json = sortJSON(files);
  if (!!json) {
    return {
      format: Format.Json,
      contents: JSON.stringify(json)
    };
  }

  let lines = files.reduce(
    (result, row) => {
      let rowLines = row.contents.split('\n')
        .filter((inner) => {
          return !!inner;
        });
      return result.concat(rowLines);
    },
    []
  );
  lines.sort();
  return {
    format: Format.Text,
    contents: lines.join('\n')
  };
}
