require('source-map-support').install({
  handleUncaughtExceptions: false
});
let path = require('path');
let fs = require('fs');
import { assert } from 'chai';
import S3Config from '../lib/models/s3-config';
import Format from '../lib/models/format';
import S3Append from '../lib/services/s3-append';

describe('Append', () => {
  let subject: S3Append;
  let key;

  beforeEach(function () {
    let jsonPath = path.resolve(__dirname, '../../aws-config.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error("Please create a 'aws-config.json' file in the root directory of this project to test with AWS resources")
    }

    let rawConfig = JSON.parse(fs.readFileSync(jsonPath));
    let s3Config = new S3Config(rawConfig);
    let now = new Date();
    key = `${rawConfig.testKeyPrefix}${now}.${now.getMilliseconds()}.txt`;
    subject = new S3Append(s3Config, key, Format.Text);
  });

  afterEach(function() {
    return subject.delete();
  });

  describe('#basic', () => {
    it('should append text', function(){
      this.timeout(10000);
      return subject.append('Test 1')
      .then(() => {
        return subject.append('Test 2', true);
      })
      .then(() => {
        return subject.getContents();
      })
      .then((contents: string) => {
        assert.equal(contents, 'Test 1\nTest 2\n');
      });
    });

    it('should allow back-to-back appends', function(){
      this.timeout(10000);
      subject.append('Test 1');
      return subject.append('Test 2', true)
      .then(() => {
        return subject.getContents();
      })
      .then((contents: string) => {
        assert.equal(contents, 'Test 1\nTest 2\n');
      });
    });
  });
});
