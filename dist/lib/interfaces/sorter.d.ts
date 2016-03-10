import FileContents from '../models/file-contents';
interface sorter extends Function {
    (files: FileContents[]): string | Promise<string>;
}
export default sorter;
