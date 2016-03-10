import S3Config from '../models/s3-config';
import Format from '../models/format';
import sorter from '../interfaces/sorter';
export default class S3Consolidator {
    config: S3Config;
    private s3;
    constructor(config: S3Config);
    concatonate(keys: string[], sort?: sorter): Promise<string>;
    consolidate(keys: string[], consolidatedKey: string, format: Format, sort?: sorter, acl?: string): Promise<any>;
    private encodeKey(key);
    private downloadAll(keys);
    private download(key);
    private write(key, format, contents, acl);
    private deleteAll(keys);
    private deleteKey(key);
}
