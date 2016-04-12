import Format from '../models/format';

export default function contentType(format: Format): string {
  'use strict';
  switch (format) {
    case Format.Text:
      return 'text/plain';
    case Format.Json:
      return 'application/json';
    default:
      throw new Error('Unexpected format: ' + format);
  }
}
