import { Promise } from 'es6-promise';
import S3Config from '../models/s3-config';
import Format from '../models/format';
import { S3, config as awsConfig, Credentials } from 'aws-sdk';
import util = require('util');
import contentType from '../util/content-type';
require('date-format-lite');

export default class S3Append {
  private readDate: Date;
  private contents: string;
  private contentsAsJson: any;
  private hasChanges: boolean = false;
  private pendingPromises: Promise<any>[] = [];

  constructor(
    public config: S3Config,
    public key: string,
    public format: Format = Format.Text,
    public acl: string = 'private') {
    awsConfig.update({
      credentials: new Credentials(config.accessKeyId, config.secretAccessKey),
      region: config.region
    });
  }

  appendWithDate(text: string, second?: boolean|any[], third?: boolean): Promise<any> {
    let now = new Date();
    let formattedDate = (now as any).format('YYYY-MM-DD hh:mm:ss.SS');
    return this.append(`${formattedDate}: ${text}`, second, third);
  }

  append(text: string|any, second?: boolean|any[], third?: boolean): Promise<any> {
    let [formatArgs, autoFlush] = this.parseAppendArgs(second, third);
    let promise = this.waitForPromises()
    .then(() => {
      return this.readContents();
    })
    .then(() => {
      return this.delegateAppend(text, formatArgs);
    })
    .then(() => {
      this.hasChanges = true;
      if (autoFlush === true) {
        return this.flush(promise);
      }
    });
    this.pendingPromises.push(promise);
    return promise;
  }

  flush(promiseToIgnore?: Promise<any>): Promise<any> {
    return this.waitForPromises(promiseToIgnore)
    .then(() => {
      this.pendingPromises = [];
      if (!this.hasChanges) {
        return;
      }
      return this.writeContents();
    });
  }

  getContents(): Promise<string|any> {
    return this.readContents()
    .then(() => {
      if (this.format === Format.Json) {
        return this.contentsAsJson;
      }
      return this.contents;
    });
  }

  delete(): Promise<any> {
    let s3 = new S3();
    let args = {
      Bucket: this.config.bucket,
      Key: decodeURIComponent(this.key.replace(/\+/g, ' '))
    };

    return new Promise((ok, fail) => {
      (s3 as any).deleteObject(args, (err, data) => {
        if (err) {
          return fail(err);
        }
        this.readDate = this.contents = this.contentsAsJson = null;
        ok();
      });
    });
  }

  private parseAppendArgs(second?: boolean | any[], third?: boolean): [any[], boolean] {
    let formatArgs: any[] = [];
    let autoFlush: boolean = false;
    if (typeof (second) === 'boolean') {
      autoFlush = second as boolean;
    }
    else if (second instanceof Array) {
      formatArgs = second as any[];
    }
    if (typeof (third) === 'boolean') {
      autoFlush = third;
    }
    return [formatArgs, autoFlush];
  }

  private waitForPromises(promiseToIgnore?: Promise<any>): Promise<any> {
    let wait = this.pendingPromises.filter((row) => {
      return !promiseToIgnore || row !== promiseToIgnore;
    });
    return Promise.all(wait);
  }

  private readContents(): Promise<any> {
    if (this.readDate) {
      return Promise.resolve();
    }

    let s3 = new S3();
    let args = {
      Bucket: this.config.bucket,
      Key: decodeURIComponent(this.key.replace(/\+/g, ' '))
    };

    return new Promise((ok, fail) => {
      s3.getObject(args, (err, data) => {
        if (err) {
          if (err.code === 'AccessDenied') {
            this.onRead('');
            return ok();
          }
          return fail(err);
        }
        let raw = data.Body.toString();
        this.onRead(raw);
        ok();
      });
    });
  }

  private onRead(contents: string): void {
    this.readDate = new Date();
    this.contents = contents;
    if (this.format === Format.Json) {
      if (contents) {
        this.contentsAsJson = JSON.parse(contents);
      }
      else {
        this.contentsAsJson  = [];
      }
    }
  }

  private writeContents(): Promise<any> {
    let s3 = new S3();
    let args = {
      Bucket: this.config.bucket,
      Key: this.key,
      ContentType : contentType(this.format),
      Body: new Buffer(this.contents),
      ACL: this.acl
    };

    return new Promise((ok, fail) => {
      s3.putObject(args, (err, data) => {
        if (err) {
          return fail(err);
        }
        this.hasChanges = false;
        ok();
      });
    });
  }

  private delegateAppend(text: string|any, formatArgs: any[]): Promise<any> {
    switch (this.format) {
        case Format.Text:
          return this.appendText(text, formatArgs);
        case Format.Json:
          return this.appendJson(text, formatArgs);
        default:
          throw new Error('Unexpected format: ' + this.format);
      }
  }

  private appendText(text: string|any, formatArgs: any[]): Promise<any> {
    let message;
    if (typeof(text) === 'string') {
      message = util.format.apply(util, [text].concat(formatArgs));
    }
    else {
      message = JSON.stringify(text);
    }
    this.contents += message + '\n';
    return Promise.resolve();
  }

  private appendJson(text: string|any, formatArgs: any[]): Promise<any> {
    this.contentsAsJson.push(text);
    this.contents = JSON.stringify(this.contentsAsJson);
    return Promise.resolve();
  }
}
