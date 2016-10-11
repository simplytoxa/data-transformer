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
      lastLineNr = 0;

  var LineByLineReader = require('line-by-line');

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
          let file = fs.readFileSync(csvFile, {encoding: 'utf-8'});

          firstline = file.split('\n')[0];

          // Determining last line
          file.split('\n').forEach((i, indx) => lastLineNr = indx + 1);

          resolve();
        });
      });
    });
  }).then(() => {

    let lineNr = 0,
        headers   = [],
        /**
         * The function that transforms data from .csv to .json
         * @return {data.json} Creates data.json file
         */
        transformFunc = () => {
          new Promise(res => {
            fs.appendFile(resultJsonFile, '[', err => err && console.log(err));

            csv
              .fromString(firstline, {delimiter: '|'})
              .on('data', data => headers = data);

            let lr = new LineByLineReader(csvFile);

            lr.on('line', function (line) {
            	// pause emitting of lines...
            	lr.pause();

              lineNr++;

              firstline.includes(line) && lastLineNr--;

              if (lineNr > 1 && !firstline.includes(line)) {
                let obj = {};

                csv
                  .fromString(line, {delimiter: '|', headers: headers})
                  .on('error', err => console.log(err))
                  .on('data', data => {
                    obj = {
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

                    if (lineNr === lastLineNr + 2) {
                      fs.appendFile(resultJsonFile, `${JSON.stringify(obj)}`, err => err && console.log(err));
                    } else {
                      fs.appendFile(resultJsonFile, `${JSON.stringify(obj)}, `, err => err && console.log(err));
                    }
                });
              }

              lr.resume();
            });

            lr.on('end', function () {
              res();
              // console.log(lastLineNr);
            });


            // let stream = fs.createReadStream(csvFile)
            //   .pipe(es.split())
            //   .pipe(es.mapSync(line => {
            //       stream.pause();
            //
            //       lineNr++;
            //
            //       if (lineNr > 1 && !firstline.includes(line)) {
            //         csv
            //           .fromString(line, {delimiter: '|', headers: headers})
            //           .on('error', err => console.log(err))
            //           .on('data', data => {
            //             let obj = {
            //               "name": `${data.first_name} ${data.last_name}`,
            //               "phone": data.phone,
            //               "person": {
            //                 "firstName": data.first_name,
            //                 "lastName": data.last_name
            //               },
            //               "amount": parseInt(data.amount),
            //               "date": data.date.split('/').reverse().join('-'),
            //               "costCenterNum": data.cc
            //             };
            //
            //           fs.appendFile(resultJsonFile, `${JSON.stringify(obj)}, `);
            //           });
            //       }
            //
            //       stream.resume();
            //     })
            //     .on('error', err => console.log('EventStream-ERROR', err))
            //     .on('end', () => {
            //       fs.appendFile(resultJsonFile, ']');
            //       console.log(lastLineNr);
            //
            //       // fs.unlink(csvFile, () => console.log('Done!'));
            //     }));
          }).then(() => {
            setTimeout(() => {fs.appendFile(resultJsonFile, ']', err => err && console.log(err))}, 2000);
            // fs.appendFile(resultJsonFile, ']', err => err && console.log(err));
          });
        };


    // fs.unlink('unziped', err => console.log(err)); //Removing folder

    /**
     * Remove old data.json file if it exists or create the new one
     */
    fs.stat(resultJsonFile, (err, stats) => {
      if (err) {

        if (err.code === 'ENOENT' ) {
          return transformFunc();
        }

        return console.error(err);
      }

      fs.unlink(resultJsonFile, () => transformFunc());
    });
  }).catch(err => console.log(err));
};
