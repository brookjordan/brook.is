const EMOTION = process.env.EMOTION;
const BASE_URL = process.env.BASE_URL || 'https://brook.is';
//process.send(`beginning page build for ${emotion}…`);

const promisify = require("util").promisify;
const fs = require("fs");
const path = require("path");
const imageSize = require("image-size");
const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);
const writeFile = promisify(fs.writeFile);
const jimp = require("jimp");

const imageSizes = {};

const GIF_FOLDER_NAME = '__gifs';
const GIF_FOLDER_PATH = path.join(__dirname, GIF_FOLDER_NAME);
const JPEG_FOLDER_NAME = '_jpegs';

const humanise = (str) => str.replace(/-/g, ' ');
const imagePath = (emotion) => path.join(GIF_FOLDER_PATH, `${emotion}.gif`);
const folderPath = (emotion) => path.join(__dirname, emotion);
const gifURL = (emotion) => `${BASE_URL}/${GIF_FOLDER_NAME}/${emotion}.gif`;


function getImageSize(emotion) {
  // { width, height }
  if (imageSizes[emotion]) {
    return imageSizes[emotion];
  }
  return new Promise((resolve, reject) => {
    imageSize(imagePath(emotion), (error, dimensions) => {
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
    url: gifURL(emotion),

    version: "1.0",
    type: "photo",
    title: `Brook is ${humanise(emotion)}`,
    author_name: "Brook Jordan",
    author_url: "https://brook.dev/",
    provider_name: "Brook is",
    provider_url: `${BASE_URL}/`,
  });
}

async function buildMetaTags(emotion) {
  const { width, height } = await getImageSize(emotion);
  return `
  <title>${humanise(emotion.slice(0,1).toUpperCase() + emotion.slice(1))}</title>
  <meta name="description" content="Brook is ${humanise(emotion)}">

  <meta name="twitter:card" content="summary" />
  <meta name="twitter:site" content="brook.is" />
  <meta name="twitter:creator" content="brook.dev" />

  <meta
    property="fb:app_id"
    content="1567003380105198"/>
  <meta
    property="og:site_name"
    content="Brook is">
  <meta
    property="og:url"
    content="${BASE_URL}/${emotion}/"/>
  <meta
    property="og:type"
    content="website"/>
  <meta
    property="og:title"
    content="${humanise(emotion.slice(0,1).toUpperCase() + emotion.slice(1))}"/>
  <meta
    property="og:description"
    content="Brook is ${humanise(emotion)}"/>
  <meta
    property="og:updated_time"
    content="${new Date().toISOString()}"/>

  <meta
    itemprop="image"
    property="og:image"
    content="${BASE_URL}/${JPEG_FOLDER_NAME}/${emotion}.jpg"/>
  <meta
    itemprop="image"
    property="og:image:secure_url"
    content="${BASE_URL}/${JPEG_FOLDER_NAME}/${emotion}.jpg"/>
  <meta
    property="og:image:type"
    content="image/jpeg"/>
  <meta
    property="og:image:alt"
    content="Brook is ${humanise(emotion)}"/>
  <meta
    property="og:image:width"
    content="${width}"/>
  <meta
    property="og:image:height"
    content="${height}"/>

  <meta
    property="og:video:url"
    content="${gifURL(emotion)}"/>
  <meta
    property="og:video:secure_url"
    content="${gifURL(emotion)}"/>
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
    href="${BASE_URL}/${emotion}/oembed.json"
    title="Brook is ${humanise(emotion)}"
  />

  <script type="application/ld+json">
  {
    "@context": "https://schema.org/",
    "@type": "ImageObject",
    "url": "${BASE_URL}/${JPEG_FOLDER_NAME}/${emotion}.jpg",
    "height": ${width},
    "width": ${height}
  }
  </script>`;
}

async function buildPageHTML(emotion) {
  const metaTags = await buildMetaTags(emotion);
  return `
  <head>${metaTags}
    <style>
      body,html {
        margin: 0;
        height: 100%;
      }
      body {
        background: no-repeat 50% 50% / cover url("${BASE_URL}/${JPEG_FOLDER_NAME}/${emotion}.jpg");
      }
      img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    </style>
  </head>

  <body>
    <img
      src="${gifURL(emotion)}"
      alt="Brook is ${humanise(emotion)}"
    >
    <link itemprop="thumbnailUrl" href="${BASE_URL}/${JPEG_FOLDER_NAME}/${emotion}.jpg">
    <span itemprop="thumbnail" itemscope itemtype="https://schema.org/ImageObject">
      <link itemprop="url" href="${BASE_URL}/${JPEG_FOLDER_NAME}/${emotion}.jpg">
    </span>
  </body>`;
}

(async function() {
  if (!await exists(folderPath(EMOTION))) {
    await mkdir(folderPath(EMOTION));
  }

  Promise.all([
    jimp.read(imagePath(EMOTION))
      .then(gifImage => {
        let imageManip = gifImage
          .quality(80)
          .write(`${JPEG_FOLDER_NAME}/${EMOTION}.jpg`);
        //process.send(`static image for ${emotion} done…`);
        return imageManip;
      })
      .catch(error => { console.log(error); }),

    buildPageHTML(EMOTION)
      .then(pageHTML => writeFile(path.join(folderPath(EMOTION), "index.html"), pageHTML))
      //.then(() => { process.send(`html for ${emotion} done…`); })
      .catch(error => { console.log(error); }),

    buildOembedJSON(EMOTION)
      .then(pageOembedJSON => writeFile(path.join(folderPath(EMOTION), "oembed.json"), pageOembedJSON))
      //.then(() => { process.send(`oembed for ${emotion} done…`); })
      .catch(error => { console.log(error); }),
  ]);
}());
