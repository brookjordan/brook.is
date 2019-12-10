const promisify = require("util").promisify;
const fs = require("fs");
const path = require("path");
const imageSize = require("image-size");
const readdir = promisify(fs.readdir);
const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const jimp = require("jimp")

const imageSizes = {};

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
  const { width, height } = await getImageSize(emotion);
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
  const { width, height } = await getImageSize(emotion);
  return `<title>${emotion.slice(0,1).toUpperCase() + emotion.slice(1)}</title>
<meta name="description" content="Brook is totally ${emotion}">

<meta name="twitter:card" content="summary" />
<meta name="twitter:site" content="brook.is" />
<meta name="twitter:creator" content="brook.dev" />

<meta
  property="og:url"
  content="https://brook.is/${emotion}/"/>
<meta
  property="og:type"
  content="article"/>
<meta
  property="og:title"
  content="${emotion.slice(0,1).toUpperCase() + emotion.slice(1)}"/>
<meta
  property="og:description"
  content="Brook is totally ${emotion}"/>
<meta
  property="og:updated_time"
  content="${Math.round(+new Date() / 1000)}"/>

<meta
  itemprop="image"
  property="og:image:secure_url"
  content="https://brook.is/${emotion}.jpg"/>
<meta
  property="og:image:type"
  content="image/jpeg"/>
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
  property="og:video:url"
  content="https://brook.is/${emotion}.gif"/>
<meta
  property="og:video:secure_url"
  content="https://brook.is/${emotion}.gif"/>
<meta
  property="og:video:type"
  content="image/gif"/>
<meta
  property="og:video:width"
  content="${width}"/>
<meta
  property="og:video:height"
  content="${height}"/>

<link
  rel="alternate"
  type="application/json+oembed"
  href="https://brook.is/${emotion}/oembed.json"
  title="Brook is feeling ${emotion}"
/>`;
}

/*

<meta
  property="og:image"
  content="https://brook.is/${emotion}.gif"/>
<meta
  property="og:image:secure_url"
  content="https://brook.is/${emotion}.gif"/>
<meta
  property="og:image:type"
  content="image/gif"/>
<meta
  property="og:image:alt"
  content="Brook is ${emotion}"/>
<meta
  property="og:image:width"
  content="${width}"/>
<meta
  property="og:image:height"
  content="${height}"/>

*/

async function buildPageHTML(emotion) {
  const metaTags = await buildMetaTags(emotion);
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
  const rootFiles = await readdir(__dirname);
  const gifs = rootFiles.filter(fileName => fileName.endsWith(".gif"));

  gifs.forEach(async fileName => {
    const emotion = fileName.slice(0, -4);
    if (!await exists(path.join(__dirname, emotion))) {
      await mkdir(path.join(__dirname, emotion));
    }

    await Promise.all([
      jimp.read(path.join(__dirname, `${emotion}.gif`))
      .then(gifImage => {
        return gifImage
          .quality(80)
          .write(`${emotion}.jpg`);
      })
      .catch(error => { console.log(error); }),

      buildPageHTML(emotion)
      .then(pageHTML => {
        return writeFile(path.join(__dirname, emotion, "index.html"), pageHTML);
      })
      .catch(error => { console.log(error); }),

      buildOembedJSON(emotion)
      .then(pageOembedJSON => {
        return writeFile(path.join(__dirname, emotion, "oembed.json"), pageOembedJSON);
      })
      .catch(error => { console.log(error); }),
    ]);
  });
}

(async function() {
  try {
    await buildWebSite();
    console.log("site built");
  } catch (error) {
    console.log(error);
  }
}());
