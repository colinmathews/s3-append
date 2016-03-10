export default class FileContents {
    key: string;
    updated: Date;
    contentType: string;
    contents: string;
    constructor(key: string, updated: Date, contentType: string, contents: string);
}
