import FileContents from '../models/file-contents';
export declare function isJSON(file: FileContents): any;
export declare function getDate(a: any): Date;
export declare function jsonCompare(a: any, b: any): number;
export declare function sortJSON(files: FileContents[]): any[];
export default function sortContents(files: FileContents[]): any | Promise<any>;
