import S3Config from '../models/s3-config';
import Format from '../models/format';
export default class S3Append {
    config: S3Config;
    key: string;
    format: Format;
    acl: string;
    private readDate;
    private contents;
    private contentsAsJson;
    private hasChanges;
    private pendingPromises;
    constructor(config: S3Config, key: string, format?: Format, acl?: string);
    appendWithDate(text: string, second?: boolean | any[], third?: boolean): Promise<any>;
    append(text: string | any, second?: boolean | any[], third?: boolean): Promise<any>;
    flush(promiseToIgnore?: Promise<any>): Promise<any>;
    getContents(): Promise<string | any>;
    delete(): Promise<any>;
    private parseAppendArgs(second?, third?);
    private waitForPromises(promiseToIgnore?);
    private readContents();
    private onRead(contents);
    private writeContents();
    private delegateAppend(text, formatArgs);
    private appendText(text, formatArgs);
    private appendJson(text, formatArgs);
}
