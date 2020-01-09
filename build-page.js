const EMOTION = process.env.EMOTION;
const GIF_FOLDER_NAME = process.env.GIF_FOLDER_NAME;
const BASE_URL = process.env.BASE_URL || "https://brook.is";

Object.defineProperties(String.prototype, {
  sentenceCased: {
    get() {
      if (this.length === 0) { return this.toString(); }
      return `${this.slice(0,1).toUpperCase()}${this.slice(1)}`;
    },
  },

  humanised: {
    get() {
      if (this.length === 0) { return this.toString(); }
      return this.replace(/-/g, " ");
    },
  },
});

const promisify = require("util").promisify;
const fs = require("fs");
const path = require("path");
const imageSize = require("image-size");
const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);
const writeFile = promisify(fs.writeFile);
const jimp = require("jimp");
const getImageColors = require("get-image-colors");
const dominantColors = path => getImageColors(path).then(colors => colors.map(color => color.css()));

const imageSizes = {};

const GIF_FOLDER_PATH = path.join(__dirname, GIF_FOLDER_NAME);
const JPEG_FOLDER_NAME = "_jpegs";
const JPEG_FOLDER_PATH = path.join(__dirname, JPEG_FOLDER_NAME);

const GIF_PATH = path.join(GIF_FOLDER_PATH, `${EMOTION}.gif`);
const JPEG_PATH = path.join(JPEG_FOLDER_PATH, `${EMOTION}.jpg`);
const DIR_PATH = path.join(__dirname, EMOTION);
const GIF_URL = `${BASE_URL}/${GIF_FOLDER_NAME}/${EMOTION}.gif`;
const JPEG_URL = `${BASE_URL}/${JPEG_FOLDER_NAME}/${EMOTION}.jpg`;

const jpegImagePromise = jimp
  .read(GIF_PATH)
  .then(gifImage => gifImage.quality(80).write(JPEG_PATH))
  .catch(error => { console.log(error); });

function getImageSize(EMOTION) {
  // { width, height }
  if (imageSizes[EMOTION]) {
    return imageSizes[EMOTION];
  }
  return new Promise((resolve, reject) => {
    imageSize(GIF_PATH, (error, dimensions) => {
      if (error) {
        reject(error);
      } else {
        imageSizes[EMOTION] = dimensions;
        resolve(dimensions);
      }
    });
  });
}

async function buildOembedJSON(EMOTION) {
  const { width, height } = await getImageSize(EMOTION);
  return JSON.stringify({
    width,
    height,
    url: GIF_URL,

    version: "1.0",
    type: "photo",
    title: `Brook is ${EMOTION.humanised}`,
    author_name: "Brook Jordan",
    author_url: "https://brook.dev/",
    provider_name: "Brook is",
    provider_url: `${BASE_URL}/`,
  });
}

async function buildMetaTags(EMOTION) {
  const { width, height } = await getImageSize(EMOTION);
  return `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>${EMOTION.humanised.sentenceCased}</title>
  <meta name="description" content="Brook is ${EMOTION.humanised}">

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
    content="${BASE_URL}/${EMOTION}/"/>
  <meta
    property="og:type"
    content="website"/>
  <meta
    property="og:title"
    content="${EMOTION.humanised.sentenceCased}"/>
  <meta
    property="og:description"
    content="Brook is ${EMOTION.humanised}"/>
  <meta
    property="og:updated_time"
    content="${new Date().toISOString()}"/>

  <meta
    itemprop="image"
    property="og:image"
    content="${BASE_URL}/${JPEG_FOLDER_NAME}/${EMOTION}.jpg"/>
  <meta
    itemprop="image"
    property="og:image:secure_url"
    content="${BASE_URL}/${JPEG_FOLDER_NAME}/${EMOTION}.jpg"/>
  <meta
    property="og:image:type"
    content="image/jpeg"/>
  <meta
    property="og:image:alt"
    content="Brook is ${EMOTION.humanised}"/>
  <meta
    property="og:image:width"
    content="${width}"/>
  <meta
    property="og:image:height"
    content="${height}"/>

  <meta
    property="og:video:url"
    content="${GIF_URL}"/>
  <meta
    property="og:video:secure_url"
    content="${GIF_URL}"/>
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
    href="${BASE_URL}/${EMOTION}/oembed.json"
    title="Brook is ${EMOTION.humanised}"
  />

  <script type="application/ld+json">
  {
    "@context": "https://schema.org/",
    "@type": "ImageObject",
    "url": "${JPEG_URL}",
    "height": ${width},
    "width": ${height}
  }
  </script>`;
}

async function buildPageHTML(EMOTION) {
  const metaTagsPromise = buildMetaTags(EMOTION);
  await jpegImagePromise;
  let [
    metaTags,
    backgroundColors,
  ] = await Promise.all([
    metaTagsPromise,
    dominantColors(JPEG_PATH),
  ]);
  return `
<!DOCTYPE html>
<html lang="en">
  <head>${metaTags}
    <style>
      body,html {
        margin: 0;
        width: 100%;
        height: 100%;
      }
      html {
        position: fixed;
        top: 0;
        left: 0;
        background-color: ${backgroundColors[0]};
        background:
          linear-gradient(to bottom right,
            ${backgroundColors[1]},
            ${backgroundColors[0]},
            ${backgroundColors[2]}
          )
        ;
        background:
          linear-gradient(to bottom right,
            ${backgroundColors[1]},
            20%,
            ${backgroundColors[0]},
            80%,
            ${backgroundColors[2]}
          )
        ;
      }
      body::before {
        content: '';
        display: block;
        position: absolute;
        top: 50%;
        left: 50%;
        width: 5%;
        height: 5%;
        background:
          50% 50% / cover
          url("${BASE_URL}/${JPEG_FOLDER_NAME}/${EMOTION}.jpg")
        ;
        filter: blur(0.1vmax);
        opacity: 0.5;
        transform:
          translate(-50%, -50%)
          scale(24)
        ;
        will-change: transform;
      }
      img {
        position: relative;
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
        will-change: transform;
      }
    </style>
  </head>

  <body>
    <img
      src="${GIF_URL}"
      alt="Brook is ${EMOTION.humanised}"
    >
    <link itemprop="thumbnailUrl" href="${BASE_URL}/${JPEG_FOLDER_NAME}/${EMOTION}.jpg">
    <span itemprop="thumbnail" itemscope itemtype="https://schema.org/ImageObject">
      <link itemprop="url" href="${BASE_URL}/${JPEG_FOLDER_NAME}/${EMOTION}.jpg">
    </span>
  </body>
</html>`;
}

(async function() {
  if (!await exists(DIR_PATH)) {
    await mkdir(DIR_PATH);
  }

  Promise.all([
    jpegImagePromise,

    buildPageHTML(EMOTION)
      .then(pageHTML => writeFile(path.join(DIR_PATH, "index.html"), pageHTML))
      .catch(error => { console.log(error); }),

    buildOembedJSON(EMOTION)
      .then(pageOembedJSON => writeFile(path.join(DIR_PATH, "oembed.json"), pageOembedJSON))
      .catch(error => { console.log(error); }),
  ]);
}());
