export default class S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;

  constructor(props: any = {}) {
    Object.keys(props).forEach((key) => {
      this[key] = props[key];
    });
  }
}
