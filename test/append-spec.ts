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

  let before = (format) => {
    let jsonPath = path.resolve(__dirname, '../../aws-config.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error("Please create a 'aws-config.json' file in the root directory of this project to test with AWS resources")
    }

    let rawConfig = JSON.parse(fs.readFileSync(jsonPath));
    let s3Config = new S3Config(rawConfig);
    let now = new Date();
    let uniqueID = (<any>now).format('YYYY-MM-DD hh:mm:ss.SS');
    key = `${rawConfig.testKeyPrefix}${uniqueID}.txt`;
    subject = new S3Append(s3Config, key, format);
  };

  describe('#text', () => {
    beforeEach(function () {
      before(Format.Text);
    });

    afterEach(function() {
      return subject.delete();
    });

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

    it('should format text', function(){
      this.timeout(10000);
      return subject.append('Hi %s, this is a test: %s', ['Colin', 5], true)
      .then(() => {
        return subject.getContents();
      })
      .then((contents: string) => {
        assert.equal(contents, 'Hi Colin, this is a test: 5\n');
      });
    });

    it('should append a date', function(){
      this.timeout(10000);
      return subject.appendWithDate('Test 1')
      .then(() => {
        return subject.appendWithDate('Test 2', true);
      })
      .then(() => {
        return subject.getContents();
      })
      .then((contents: string) => {
        let lines = contents.split('\n');
        assert.lengthOf(lines, 3);
        assert.include(lines[0], 'Test 1');
        assert.include(lines[1], 'Test 2');
        assert.equal(lines[2], '');
        assert.match(lines[0], /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}: Test 1$/);
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

  describe('#json', () => {
    beforeEach(function () {
      before(Format.Json);
    });

    afterEach(function() {
      return subject.delete();
    });

    it('should append json', function(){
      let first = { a: 'one' };
      let second = { b: 'two' };
      this.timeout(10000);
      return subject.append(first)
      .then(() => {
        return subject.append(second, true);
      })
      .then(() => {
        return subject.getContents();
      })
      .then((contents: any) => {
        assert.equal(JSON.stringify(contents), JSON.stringify([first, second]));
      });
    });
  });
});
