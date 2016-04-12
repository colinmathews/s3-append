export default class FileContents {
  constructor(
    public key: string,
    public updated: Date,
    public contentType: string,
    public contents: string) { }
}
