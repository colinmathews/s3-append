require('source-map-support').install({
  handleUncaughtExceptions: false
});
let path = require('path');
let fs = require('fs');
import { assert } from 'chai';
import S3Config from '../lib/models/s3-config';
import Format from '../lib/models/format';
import FileContents from '../lib/models/file-contents';
import S3Consolidator from '../lib/services/s3-consolidator';
import { S3, config as awsConfig, Config, Credentials } from 'aws-sdk';

function deleteKey(config: S3Config, s3: S3, key: string): Promise<any> {
  return new Promise((ok, fail) => {
    let args = {
      Bucket: config.bucket,
      Key: decodeURIComponent(key.replace(/\+/g, " "))
    };
    (<any>s3).deleteObject(args, (err, data) => {
      if (err) {
        return fail(err);
      }
      ok();
    });
  });
}

function writeKey(config: S3Config, s3: S3, key: string, contents: string): Promise<any> {
  let args = {
    Bucket: config.bucket,
    Key: key,
    ContentType: 'text/plain',
    Body: new Buffer(contents),
    ACL: 'private'
  };

  return new Promise((ok, fail) => {
    s3.putObject(args, (err, data) => {
      if (err) {
        return fail(err);
      }
      ok();
    });
  });
}

function downloadKey(config: S3Config, s3: S3, key: string): Promise<any> {
  return new Promise((ok, fail) => {
    let args = {
      Bucket: config.bucket,
      Key: decodeURIComponent(key.replace(/\+/g, " "))
    };
    s3.getObject(args, (err, data) => {
      if (err) {
        if (err.code === 'NoSuchKey' || err.code === 'AccessDenied') {
          return ok(null);
        }
        return fail(err);
      }
      let raw = data.Body.toString();
      ok(raw);
    });
  });
}

describe('Consolidator', () => {
  let subject: S3Consolidator;
  let s3;
  let s3Config;
  let testKeyPrefix;
  let key;
  let files;
  let thirdFile;

  before(() => {
    let jsonPath = path.resolve(__dirname, '../../aws-config.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error("Please create a 'aws-config.json' file in the root directory of this project to test with AWS resources")
    }

    let rawConfig = JSON.parse(fs.readFileSync(jsonPath));
    s3Config = new S3Config(rawConfig);
    testKeyPrefix = rawConfig.testKeyPrefix;
    if (typeof(testKeyPrefix) === 'undefined') {
      throw new Error('Please set "testKeyPrefix" in your aws-config.json file');
    }
    subject = new S3Consolidator(s3Config);
    s3 = new S3({
      credentials: new Credentials(s3Config.accessKeyId, s3Config.secretAccessKey),
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

  describe('#concatonate', () => {
    beforeEach(function() {
      let promises = files.map((row) => {
        return writeKey(s3Config, s3, row.key, row.contents);
      });
      return Promise.all(promises);
    });

    afterEach(function() {
      let promises = files.map((row) => {
        return deleteKey(s3Config, s3, row.key);
      });
      return Promise.all(promises);
    });

    it('should concatonate two files', function() {
      return subject.concatonate(files.map((row) => row.key))
      .then((result) => {
        assert.isNotNull(result);
        assert.equal(result.contents, ['a', 'b', 'c', 'x', 'z'].join('\n'));
      });
    });
  });

  describe('#consolidate', () => {
    beforeEach(function() {
      this.timeout(5000);
      let promises = files.map((row) => {
        return writeKey(s3Config, s3, row.key, row.contents);
      });
      return Promise.all(promises);
    });

    afterEach(function() {
      this.timeout(5000);
      let promises = files.map((row) => {
        return deleteKey(s3Config, s3, row.key);
      })
      .concat([deleteKey(s3Config, s3, thirdFile)]);
      return Promise.all(promises);
    });

    it('should consolidate two files into a new file', function() {
      this.timeout(5 * 1000);
      return subject.consolidate(files.map((row) => row.key), thirdFile)
      .then((result) => {
        let promises = [files[0].key, files[1].key, thirdFile].map((row) => {
          return downloadKey(s3Config, s3, row);
        });
        return Promise.all(promises);
      })
      .then((result) => {
        assert.isNotNull(result);
        assert.lengthOf(result, 3);
        assert.isNull(result[0]);
        assert.isNull(result[1]);
        assert.equal(result[2], ['a', 'b', 'c', 'x', 'z'].join('\n'));
      });
    });

    it('should consolidate two files into a one of the same files', function() {
      return subject.consolidate(files.map((row) => row.key), files[0].key)
      .then((result) => {
        let promises = [files[0].key, files[1].key].map((row) => {
          return downloadKey(s3Config, s3, row);
        });
        return Promise.all(promises);
      })
      .then((result) => {
        assert.isNotNull(result);
        assert.lengthOf(result, 2);
        assert.isNull(result[1]);
        assert.equal(result[0], ['a', 'b', 'c', 'x', 'z'].join('\n'));
      });
    });
  });
});
