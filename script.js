const fs      = require('fs'),
      unzip   = require('unzip'),
      csv     = require('fast-csv'),
      csvFile = './result.csv',
      resultJsonFile = 'data.json';

let arr  = [],
    json = [];

new Promise((resolve, reject) => {

  fs.createReadStream('./data.zip')
    .pipe(unzip.Parse())
    .on('entry', entry => entry.pipe(fs.createWriteStream(csvFile)))
    .on('close', () => resolve())
    .on('error', error => reject(new Error(error)));

}).then(() => {

  fs.createReadStream('./result.csv')
    .pipe(csv({delimiter: '|', headers: true}))
    .on('data', data => arr.push(data))
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
    });
});
