# s3-append
Appends text or JSON to files on S3. 

## Installation
```
npm install s3-append
```

## Limitations
Appending isn't magic: as files get larger the initial read and any flushes will take longer to run. However, appending is still smart and allows synchronous calls for quick logging. Writing the file only happens when `.flush()` is called. There is no inherent concurrency support, but see [this section](#consolidating-files) for how you can handle this.

## Configuration
Create an `S3Config` object to authenticate with AWS:
```javascript
var S3Config = require('s3-append').S3Config;
var config = new S3Config({
  "accessKeyId": "<YOUR DATA>",
  "secretAccessKey": "<YOUR DATA>",
  "region": "<YOUR DATA>",
  "bucket": "<YOUR DATA>"
});
```

## Appending text
```javascript
// Using config from above
var S3Append = require('s3-append').S3Append;
var service = new S3Append(config, 'folder/log.txt', Format.Text);

service.append("This is simple logging");
service.appendWithDate("This is logging that prefixes the line with a sortable date string");
service.append("This is logging that allows %s", ['replacements']);

service.flush()
.then(function() {
  console.log("Done!");
})
.catch(function(err) {
  console.error(err.message);
});
```

Your resulting file would look like this
```
This is simple logging
2016-03-10 11:21:30.083: This is logging that prefixes the line with a sortable date string
This is logging that allows replacements
```

## Appending JSON
Alternatively, you can append JSON objects and they'll be stored as an array.

```javascript
// Using config from above
var S3Append = require('s3-append').S3Append;
var service = new S3Append(config, 'folder/log.txt', Format.Json);

service.append({ a: 1, b: "Hi" });
service.append({ a: 2, b: "Goodbye" });

service.flush()
.then(function() {
  console.log("Done!");
})
.catch(function(err) {
  console.error(err.message);
});
```

Your resulting file would look like this
```
[{"a":1,"b":"Hi"},{"a":2,"b":"Goodbye"}]
```

## Consolidating files
You can easily consolidate many files into one and apply sorting to the final file. This is a great way to get passed the concurrency limitations: each parallel process should log to its own file and then they can get merged together. 

```javascript
// Using config from above
var S3Consolidator = require('s3-append').S3Consolidator;
var service = new S3Consolidator(config);

service.consolidate(['logs1.txt', 'logs2.txt'], 'logs.txt')
.then(function() {
  console.log("Done!");
})
.catch(function(err) {
  console.error(err.message);
});
```

After running this code, `logs1.txt` and `logs2.txt` will no longer exist and `logs.txt` will contain text from both files.

## API
### Format enum
`var Format = require('s3-append').Format;`

-   **Text** - Writes plain text
-   **Json** `String` - Appends objects into an array

### S3Append
`var S3Append = require('s3-append').S3Append;`
A service to append text to S3 files.


#### `constructor(config, key, [format], [acl])`
-   **config** `S3Config` - Configuration details
-   **key** `String` - Where to write the file to on S3.
-   **format** `Format, optional` - How to write the data, defaults to `Format.Text`
-   **acl** `String, optional` - The permissions to assign to the file on S3, defaults to `private`


#### `append(text, [formatArgs], [autoFlush]):Promise`
Appends text or JSON to the file. The returned promise can be ignored unless flushing.

-   **text** `String|Object` - The object or text to append.
-   **formatArgs** `Array, optional` - An array of objects to format the text with.
-   **autoFlush** `Boolean, optional` - True to force writing to S3.


#### `appendWithDate(text, [formatArgs], [autoFlush]):Promise`
Only for text appending, automatically prefixes the line with a sortable date. The returned promise can be ignored unless flushing.

-   **text** `String|Object` - The object or text to append.
-   **formatArgs** `Array, optional` - An array of objects to format the text with.
-   **autoFlush** `Boolean, optional` - True to force writing to S3.


#### `flush(): Promise`
Waits for all contents to be written.


#### `getContents(): Promise`
Returns the up-to-date text or JSON contents of the file.


#### `delete(): Promise`
Permanently deletes the log file.


### S3Consolidator
`var S3Consolidator = require('s3-append').S3Consolidator;`
A service to consolidate separate log files into one.


#### `constructor(config)`
-   **config** `S3Config` - Configuration details


#### `concatonate(keys, [sorter]):Promise`
Reads and stitches together the contents of these keys. By default text lines are sorted alphabetically and JSON arrays are sorted by date if the object has one of these keys: `'created', 'createDate', 'creationDate', 'date'`

-   **keys** `String[]` - A list of keys on S3.
-   **sorter** `(FileContents[]) => string|Promise, optional` - A custom way to sort files.

You'll get back an object like this:
-   **format** `Format` - The deciphered format of the data.
-   **contents** `string` - The full contents of the logs.


#### `consolidate(keys, consolidatedKey, [sorter], [acl]):Promise`
Reads and stitches together the contents of these keys and then writes them to the `consolidatedKey`. Performs the same sorting as `concatonate`. All keys except for `consolidatedKey` will be deleted.

-   **keys** `String[]` - A list of keys on S3.
-   **consolidatedKey** `String` - The key to write the consolidated data to.
-   **sorter** `(FileContents[]) => string|Promise, optional` - A custom way to sort files.
-   **acl** `String, optional` - The permissions to assign to the file on S3, defaults to `private`