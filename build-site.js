let promisify = require('util').promisify;
let fs = require('fs');
let path = require('path');
let imageSize = require('image-size');
let readdir = promisify(fs.readdir);
let mkdir = promisify(fs.mkdir);
let exists = promisify(fs.exists);
let writeFile = promisify(fs.writeFile);

let imageSizes = {};

async function getImageSize(emotion) {
  // { width, height }
  if (imageSizes[emotion]) {
    return imageSizes[emotion];
  }
  return await new Promise((resolve, reject) => {
    imageSize(`${emotion}.gif`, function (error, dimensions) {
      if (error) {
        reject(error);
      } else {
        imageSizes[emotion] = dimensions;
        resolve(dimensions);
      }
    });
  });
}

async function buildOembedJSON(emotion) {
  let { width, height } = await getImageSize(emotion);
  return JSON.stringify({
    width,
    height,
    url: `https://brook.is/${emotion}.gif`,

    version: "1.0",
    type: "photo",
    title: `Brook is ${emotion}`,
    author_name: "Brook Jordan",
    author_url: "https://brook.dev/",
    provider_name: "Brook is",
    provider_url: "https://brook.is/",
  });
}

async function buildMetaTags(emotion) {
  let { width, height } = await getImageSize(emotion);
  return `<title>${emotion.slice(0,1).toUpperCase() + emotion.slice(1)}</title>
<meta name="description" content="Brook is totally ${emotion}">

<meta
  property="og:url"
  content="https://brook.is/"/>
<meta
  property="og:type"
  content="website"/>
<meta
  property="og:title"
  content="${emotion.slice(0,1).toUpperCase() + emotion.slice(1)}"/>
<meta
  property="og:description"
  content="Brook is totally ${emotion}"/>
<meta
  property="og:image"
  content="https://brook.is/${emotion}.gif"/>
<meta
  property="og:image:secure_url"
  content="https://brook.is/${emotion}.gif"/>
<meta
  property="og:image:alt"
  content="Brook is ${emotion}"/>
<meta
  property="og:image:width"
  content="${width}"/>
<meta
  property="og:image:height"
  content="${height}"/>
<meta
  property="og:video"
  content="https://brook.is/${emotion}.gif"/>

<link
  rel="alternate"
  type="application/json+oembed"
  href="https://brook.is/${emotion}/oembed.json"
  title="Brook is feeling ${emotion}"
/>`;
}

async function buildPageHTML(emotion) {
  let metaTags = await buildMetaTags(emotion);
  return `${metaTags}

<style>
  body,html {
    margin: 0;
    height: 100%;
  }
  img {
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    object-fit: cover;
  }
</style>

<img src="/${emotion}.gif" alt="Brook is ${emotion}">`;
}

async function buildWebSite() {
  let rootFiles = await readdir(__dirname);
  let gifs = rootFiles.filter(fileName => fileName.endsWith('.gif'));

  gifs.forEach(async fileName => {
    let emotion = fileName.slice(0, -4);
    if (!await exists(path.join(__dirname, emotion))) {
      await mkdir(path.join(__dirname, emotion));
    }
    await Promise.all([
      buildPageHTML(emotion)
      .then(pageHTML => {
        return writeFile(path.join(__dirname, emotion, 'index.html'), pageHTML);
      })
      .catch(error => { console.log(error); }),
      buildOembedJSON(emotion)
      .then(pageOembedJSON => {
        return writeFile(path.join(__dirname, emotion, 'oembed.json'), pageOembedJSON);
      })
      .catch(error => { console.log(error); }),
    ]);
  });
}

(async function() {
  await buildWebSite();
  console.log('site built');
}());
