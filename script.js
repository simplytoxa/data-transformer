'use strict';

module.exports = zipFile => {
  const fs             = require('fs'),
        unzip          = require('unzip'),
        csv            = require('fast-csv'),
        es             = require('event-stream'),
        csvFile        = './result.csv',
        resultJsonFile = './data.json';

  let arr  = [],
      json = [];

  new Promise((resolve, reject) => {

    fs.createReadStream(zipFile)
      .pipe(unzip.Parse())
      .on('entry', entry => entry.pipe(fs.createWriteStream(csvFile)))
      .on('close', () => resolve())
      .on('error', error => reject(new Error(error)));

  }).then(() => {

    let lineNr    = 0,
        headers   = [],
        file      = fs.readFileSync(csvFile, {encoding: 'utf-8'}),
        firstline = file.split('\n')[0];

    csv
      .fromString(firstline, {delimiter: '|'})
      .on('data', data => headers = data);

    let stream = fs.createReadStream(csvFile)
      .pipe(es.split())
      .pipe(es.mapSync(line => {
          stream.pause();

          lineNr++;


          if (lineNr > 1) {
            csv
              .fromString(line, {delimiter: '|', headers: headers})
              .on('data', data => {
                arr.push(data);
              });
          }

          stream.resume();
        })
          .on('end', () => {
            json = arr.map(i => ({
              "name": `${i.first_name} ${i.last_name}`,
              "phone": i.phone,
              "person": {
                "firstName": i.first_name,
                "lastName": i.last_name
              },
              "amount": parseInt(i.amount),
              "date": i.date.split('/').reverse().join('-'),
              "costCenterNum": i.cc
            }));


            fs.writeFileSync(resultJsonFile, JSON.stringify(json));

            fs.unlink(csvFile, () => console.log('Done!'));
          })
      );
  });
};