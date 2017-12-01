// Script to apply Babel transformation
var fs = require('fs');
var babel = require('babel-core');
var cordy = require('./cordy');

var inputFile = process.argv[2];
var outputFile = 'output.js'
var checkTaintFile = 'checkTaint.js';

var checkTaintSrc = fs.readFileSync(checkTaintFile, 'utf-8');
// console.log(checkTaintSrc.toString());

fs.readFile(inputFile, 'utf-8', function(err, data) {
  var src = data.toString();

  var out = babel.transform(src, {
    plugins: [cordy]
  });

  // console.log(checkTaintSrc.toString() + out.code);
  out.code = checkTaintSrc.toString() + out.code;
  fs.writeFile(outputFile, out.code, function(err, data) {
    if (err) {
      console.log(err);
    }
  })
});
