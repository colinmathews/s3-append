import { Promise } from 'es6-promise';
import S3Config from '../models/s3-config';
import Format from '../models/format';
import { S3, config as awsConfig, Config, Credentials } from 'aws-sdk';

export default class S3Append {
  private readDate: Date;
  private contents: string;
  private contentsAsJson: any;
  private hasChanges: boolean = false;
  private pendingPromises: Promise<any>[] = [];

  constructor(public config: S3Config, 
    public key: string,
    public format: Format = Format.Text,
    public acl: string = 'private') {
    awsConfig.update({
      credentials: new Credentials(config.accessKeyId, config.secretAccessKey),
      region: config.region
    });
  }

  append (text: string|any, autoFlush: boolean = false) {
    var promise = this.waitForPromises()
    .then(() => {
      return this.readContents();
    })
    .then(() => {
      switch(this.format) {
        case Format.Text:
          return this.appendText(text);
        case Format.Json:
          return this.appendJson(text);
        default:
          throw new Error('Unexpected format: ' + this.format);
      }
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

  flush (promiseToIgnore?: Promise<any>): Promise<any> {
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

  delete() : Promise<any> {
    let s3 = new S3();
    let args = {
      Bucket: this.config.bucket,
      Key: decodeURIComponent(this.key.replace(/\+/g, " "))
    };

    return new Promise((ok, fail) => {
      (<any>s3).deleteObject(args, (err, data) => {
        if (err) {
          return fail(err);
        }
        this.readDate = this.contents = this.contentsAsJson = null;
        ok();
      });
    }); 
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
      Key: decodeURIComponent(this.key.replace(/\+/g, " "))
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

  private onRead(contents: string) {
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

  private getContentType(): string {
    switch(this.format) {
      case Format.Text:
        return 'text/plain';
      case Format.Json:
        return 'application/json';
      default:
        throw new Error('Unexpected format: ' + this.format);
    }
  }

  private writeContents(): Promise<any> {
    let s3 = new S3();
    let args = {
      Bucket: this.config.bucket,
      Key: this.key,
      ContentType : this.getContentType(),
      Body: new Buffer(this.contents),
      ACL: this.acl
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

  private appendText(text: string|any): Promise<any> {
    let message;
    if (typeof(text) === 'string') {
      message = text;
    }
    else {
      message = JSON.stringify(text);
    }
    this.contents += message + '\n';
    return Promise.resolve();
  }

  private appendJson(text: string|any): Promise<any> {
    this.contentsAsJson.push(text);
    this.contents = JSON.stringify(this.contentsAsJson);
    return Promise.resolve();
  }
}
