'use strict';

module.exports = zipFile => {
  const fs             = require('fs'),
        csv            = require('fast-csv'),
        es             = require('event-stream'),
        extract        = require('extract-zip'),
        resultJsonFile = './data.json';

  new Promise((resolve, reject) => {

    extract(zipFile, {dir: 'unzipped'}, err => {

      err && reject(new Error(err));

      resolve();
    });

  }).then(() => {

    let lineNr = 0,
        headers   = [],
        file = '',
        firstline = '',
        lastLineNr = 0,
        /**
         * The function that transforms data from .csv to .json
         * @return {data.json} Creates data.json file
         */
        transformFunc = (csvFile, idx) => {

          idx === 0 && fs.appendFile(resultJsonFile, '[');

          csv
            .fromString(firstline, {delimiter: '|'})
            .on('data', data => headers = data);

          let stream = fs.createReadStream(`./unzipped/${csvFile}`)
            .pipe(es.split())
            .pipe(es.mapSync(line => {
                stream.pause();

                lineNr++;

                if (lineNr > 1) {
                  csv
                    .fromString(line, {delimiter: '|', headers: headers})
                    .on('error', err => {
                      parseErr = true;
                      transformFunc();
                    })
                    .on('data', data => {
                      let obj = {
                        "name": `${data.first_name} ${data.last_name}`,
                        "phone": data.phone,
                        "person": {
                          "firstName": data.first_name,
                          "lastName": data.last_name
                        },
                        "amount": parseInt(data.amount),
                        "date": data.date.split('/').reverse().join('-'),
                        "costCenterNum": data.cc
                      };

                    fs.appendFile(resultJsonFile, `${JSON.stringify(obj)}, `);
                    });
                }

                stream.resume();
              })
              .on('error', err => console.log('EventStream-ERROR', err))
              .on('end', () => {
                fs.appendFile(resultJsonFile, ']');
                console.log(lastLineNr);

                // fs.unlink(csvFile, () => console.log('Done!'));
              }));
        };

    // fs.unlink('unziped', err => console.log(err)); //Removing folder

    fs.readdir('./unzipped', (err, files) => {
      if (err) {

        err.code === 'ENOENT' && console.log('No such directory "./unzipped"');

        return console.error(err);
      }

      /**
       * Take each unzipped csv file and parse
       */
      files.forEach((csvFile, idx) => {
        file      = fs.readFileSync(`./unzipped/${csvFile}`, {encoding: 'utf-8'});
        firstline = file.split('\n')[0];

        // Determining last line
        file.split('\n').forEach((i, idx) => lastLineNr = idx);


        /**
         * Remove old data.json file if it exists or create the new one
         */
        fs.stat(resultJsonFile, (err, stats) => {
          if (err) {

            if (err.code === 'ENOENT' ) {
              return transformFunc(csvFile, idx);
            }

            return console.error(err);
          }

          fs.unlink(resultJsonFile, () => transformFunc(csvFile, idx));
        });
      });
    });
  }).catch(err => console.log(err));
};
