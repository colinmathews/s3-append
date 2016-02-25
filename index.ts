import S3Config from './lib/models/s3-config';
import Format from './lib/models/format';
import S3Append from './lib/services/s3-append';

// TODO: Figure out why if we don't 
// export a class with access to the import statements,
// the .d.ts file will not bring over the import statements.
export class shim {
  a: S3Config;
  b: S3Append;
  c: Format;
}

export {
  S3Config,
  S3Append,
  Format
}
