// /home/lenovo/code/ltphongssvn/task-management-final/build-css.js
const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const tailwindcss = require('@tailwindcss/postcss');
const autoprefixer = require('autoprefixer');

const inputFile = path.join(__dirname, 'public/css/input.css');
const outputFile = path.join(__dirname, 'public/css/style.css');

const css = fs.readFileSync(inputFile, 'utf8');

postcss([tailwindcss, autoprefixer])
  .process(css, { from: inputFile, to: outputFile })
  .then(result => {
    fs.writeFileSync(outputFile, result.css);
    console.log('CSS built successfully!');
  })
  .catch(err => {
    console.error('Build failed:', err);
  });
