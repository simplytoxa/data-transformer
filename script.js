'use strict';

module.exports = zipFile => {
  const fs             = require('fs'),
        csv            = require('fast-csv'),
        es             = require('event-stream'),
        extract        = require('extract-zip'),
        concat         = require('concat-files'),
        csvFile        = './result.csv',
        resultJsonFile = './data.json';

  let firstline = '',
      lineNr = 0,
      lastLineNr = 0;

  var LineByLineReader = require('line-by-line');
  var Converter = require("csvtojson").Converter;
  let JSONStream = require('JSONStream');
  var csvConverter = new Converter({
    workerNum:4,
    constructResult: false,
    delimiter: '|',
    toArrayString: true,
    trim: true,
    ignoreEmpty: true
  });

  new Promise((resolve, reject) => {

    extract(zipFile, {dir: 'unzipped'}, err => {

      err && reject(new Error(err));

      fs.readdir('./unzipped', (err, files) => {
        if (err) {

          err.code === 'ENOENT' && console.log('No such directory "./unzipped"');

          return console.error(err);
        }

        files = files.map(file => `./unzipped/${file}`);

        concat(files, csvFile, () => {
          let readStream = fs.createReadStream(csvFile);

          csvConverter.on("record_parsed",function(resultRow,rawRow,rowIndex){
            lastLineNr = rowIndex;
          });

          let writeStream = fs.createWriteStream(resultJsonFile);

          readStream.pipe(csvConverter).pipe(writeStream).on('close', () => resolve());
        });
      });
    });
  }).then(() => {

      let writeStream = fs.createWriteStream('RESULT.json');

      var getStream = function () {
        var jsonData = 'data.json',
            stream = fs.createReadStream(jsonData, {encoding: 'utf8'}),
            parser = JSONStream.parse('*');
            return stream.pipe(parser);
      };
      let obj = {};

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

          if (lineNr - 1 === lastLineNr) {
            return `${JSON.stringify(obj)}]`;
          } else if (lineNr === 1) {
            return `[${JSON.stringify(obj)}, `;
          } else {
            return `${JSON.stringify(obj)}, `;
          }
        }))
        .on('end', () => {
          console.log('end');
          console.log(lineNr);
          console.log(lastLineNr);
        })
        .pipe(writeStream);


    // /**
    //  * Remove old data.json file if it exists or create the new one
    //  */
    // fs.stat(resultJsonFile, (err, stats) => {
    //   if (err) {
    //
    //     if (err.code === 'ENOENT') {
    //       return transformFunc();
    //     }
    //
    //     return console.error(err);
    //   }
    //
    //   fs.unlink(resultJsonFile, () => transformFunc());
    // });
  }).catch(err => console.log(err));
};
