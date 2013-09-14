#!/bin/sh

rm packed-extension.zip

mkdir packed-extension

cp -r native panel icons background.js \
      devtools.html devtools.js manifest.json \
      LICENSE README.md \
      packed-extension 

zip -r packed-extension.zip packed-extension

#rm -r packed-extension