const babylon = require('babylon');
const fs = require('fs');
const path = require('path');

const handleAny = require('./interpreter');

function readSource(file) {
  return fs.readFileSync(file, 'utf-8');
}

function readAndParse(file) {
  return babylon.parse(readSource(file));
}

const folderpath = path.resolve('node_modules/express/lib');
const filepath = path.join(folderpath, 'application.js');

const ast = readAndParse(filepath);

// console.log(ast);
// console.log(JSON.stringify(ast.program.body[0], null, 2));

const programBody = ast.program.body;

programBody.forEach(handleAny);
