'use strict';

module.exports = zipFile => {
  const fs             = require('fs'),
        es             = require('event-stream'),
        extract        = require('extract-zip'),
        concat         = require('concat-files'),
        JSONStream     = require('JSONStream'),
        Converter      = require("csvtojson").Converter,
        csvConverter   = new Converter({
          workerNum: 4,
          constructResult: false,
          delimiter: '|',
          toArrayString: true,
          trim: true,
          ignoreEmpty: true
        }),
        csvFile        = './_tmp/result.csv',
        resultJsonFile = './data.json';

  let lineNr = 0,
      lastLineNr = 0;

  return new Promise((resolve, reject) => {

    extract(zipFile, {dir: '_tmp'}, err => {

      err && reject(new Error(err));

      fs.readdir('./_tmp', (err, files) => {
        if (err) {

          err.code === 'ENOENT' && console.log('No such directory "./_tmp"');

          return console.error(err);
        }

        files = files.map(file => `./_tmp/${file}`);

        // Concatenating files unzipped files
        concat(files, csvFile, () => {
          let readStream = fs.createReadStream(csvFile),
              writeStream = fs.createWriteStream('./_tmp/_data.json');

          csvConverter.on('record_parsed', (resultRow, rawRow, rowIndex) => {
            lastLineNr = rowIndex;
          });

          readStream.pipe(csvConverter).pipe(writeStream).on('close', () => resolve());
        });
      });
    });
  }).then(() => {

      let writeStream = fs.createWriteStream(resultJsonFile),
          obj = {};

      let getStream = () => {
        let stream = fs.createReadStream('./_tmp/_data.json', {encoding: 'utf8'}),
            parser = JSONStream.parse('*');

        return stream.pipe(parser);
      };

      // Reformating .json file
      getStream()
        .pipe(es.mapSync(data => {

          lineNr++;

          obj = {
            "name": data.name,
            "phone": data.phone,
            "person": {
              "firstName": data.first_name,
              "lastName": data.last_name
            },
            "amount": parseInt(data.amount),
            "date": data.date.split('/').reverse().join('-'),
            "costCenterNum": data.cc
          };

          if (data.first_name === "first_name") {
            return;
          } else if (lineNr - 1 === lastLineNr) {
            // Last line
            return `${JSON.stringify(obj)}]`;
          } else if (lineNr === 1) {
            // First line
            return `[${JSON.stringify(obj)}, `;
          } else {
            return `${JSON.stringify(obj)}, `;
          }
        }))
        .pipe(writeStream)
        .on('close', () => {
          const dir = './_tmp';

        	fs.readdir(dir, (err, files) => {
            err && console.log(err);

            files.forEach((file, idx) => {
              fs.unlink(`./_tmp/${file}`, () => {
                // Remove the directory when the last file in it is removed
                (idx === files.length - 1) && fs.rmdir(dir, () => console.log('Done!'));
              });
            });
          });
        });
  }).catch(err => console.log(err));
};
