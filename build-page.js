const EMOTION = process.env.EMOTION;
const GIF_FOLDER_NAME = process.env.GIF_FOLDER_NAME || "__gifs";
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
const movieBuilder = require("fluent-ffmpeg");
if (process.env.FFMPEG_BINARY) {
  movieBuilder.setFfmpegPath(path.join(__dirname, process.env.FFMPEG_BINARY));
}
const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);
const writeFile = promisify(fs.writeFile);
const jimp = require("jimp");
const getImageColors = require("get-image-colors");
const dominantColors = path => getImageColors(path).then(colors => colors.map(color => color.css()));

const imageSizes = {};

const GIF_BIG_FOLDER_NAME = "__original-gifs";
const GIF_FOLDER_PATH = path.join(__dirname, GIF_FOLDER_NAME);
const GIF_BIG_FOLDER_PATH = path.join(__dirname, GIF_BIG_FOLDER_NAME);
const JPEG_FOLDER_NAME = "_jpegs";
const JPEG_FOLDER_PATH = path.join(__dirname, JPEG_FOLDER_NAME);
const MOVIE_FOLDER_NAME = "_movs";
const MOVIE_FOLDER_PATH = path.join(__dirname, MOVIE_FOLDER_NAME);
const MOVIE_SMALL_FOLDER_NAME = "_movs_small";
const MOVIE_SMALL_FOLDER_PATH = path.join(__dirname, MOVIE_SMALL_FOLDER_NAME);

const GIF_BIG_PATH = path.join(GIF_BIG_FOLDER_PATH, `${EMOTION}.gif`);
const GIF_PATH = path.join(GIF_FOLDER_PATH, `${EMOTION}.gif`);
const JPEG_PATH = path.join(JPEG_FOLDER_PATH, `${EMOTION}.jpg`);
const MOVIE_PATH = path.join(MOVIE_FOLDER_PATH, `${EMOTION}`);
const MOVIE_SMALL_PATH = path.join(MOVIE_SMALL_FOLDER_PATH, `${EMOTION}`);
const DIR_PATH = path.join(__dirname, EMOTION);
const GIF_URL = `${BASE_URL}/${GIF_FOLDER_NAME}/${EMOTION}.gif`;
const JPEG_URL = `${BASE_URL}/${JPEG_FOLDER_NAME}/${EMOTION}.jpg`;
const MOVIE_URL = `${BASE_URL}/${MOVIE_FOLDER_NAME}/${EMOTION}`;
const MOVIE_SMALL_URL = `${BASE_URL}/${MOVIE_SMALL_FOLDER_NAME}/${EMOTION}`;

async function buildJpeg() {
  try {
    if (!await exists(JPEG_FOLDER_PATH)) {
      await mkdir(JPEG_FOLDER_PATH);
    }
    let gifImage = await jimp.read(GIF_PATH);
    return gifImage.quality(80).write(JPEG_PATH);
  } catch (error) {
    console.log(`JPEG build error:\n${error}`);
  }
}
const jpegBuildPromise = buildJpeg();

async function buildMov() {
  try {
    if (!await exists(MOVIE_FOLDER_PATH)) {
      await mkdir(MOVIE_FOLDER_PATH);
    }
    let gifPath;
    if (await exists(GIF_BIG_PATH)) {
      gifPath = GIF_BIG_PATH;
    } else {
      gifPath = GIF_PATH;
    }
    return Promise.all([
      new Promise(async (resolve, reject) => {
        let videoPath = `${MOVIE_PATH}.mp4`;
        if (await exists(videoPath))
        { console.log(`${EMOTION} mp4 exists. Skipping creation.`);
          resolve(true);
          return;
        }
        movieBuilder(gifPath)
          .withNoAudio()
          .toFormat("mp4")
          .videoCodec("mpeg4")
          .output(videoPath)
          .on("end", end => { resolve(end); })
          .on("error", error => { reject(error); })
          .run();
      }),

      new Promise(async (resolve, reject) => {
        let videoPath = `${MOVIE_PATH}.webm`;
        if (await exists(videoPath))
        { console.log(`${EMOTION} webm exists. Skipping creation.`);
          resolve(true);
          return;
        }
        movieBuilder(gifPath)
          .withNoAudio()
          .output(videoPath)
          .on("end", end => { resolve(end); })
          .on("error", error => { reject(error); })
          .run();
      }),
    ]);
  } catch (error) {
    console.log(`Movie building error:\n${error}`);
  }
}

async function buildMovSmall() {
  try {
    if (!await exists(MOVIE_SMALL_FOLDER_PATH)) {
      await mkdir(MOVIE_SMALL_FOLDER_PATH);
    }
    let gifPath;
    if (await exists(GIF_BIG_PATH)) {
      gifPath = GIF_BIG_PATH;
    } else {
      gifPath = GIF_PATH;
    }
    return Promise.all([
      new Promise(async (resolve, reject) => {
        let videoPath = `${MOVIE_SMALL_PATH}.mp4`;
        if (await exists(videoPath)) {
          console.log(`${EMOTION} small mp4 exists. Skipping creation.`);
          resolve(true);
          return;
        }
        movieBuilder(gifPath)
          .withNoAudio()
          .videoBitrate("16")
          .toFormat("mp4")
          .videoCodec("mpeg4")
          .withSize("?x150")
          .output(videoPath)
          .on("end", end => { resolve(end); })
          .on("error", error => { reject(error); })
          .run();
      }),

      new Promise(async (resolve, reject) => {
        let videoPath = `${MOVIE_SMALL_PATH}.webm`;
        if (await exists(videoPath)) {
          console.log(`${EMOTION} small webm exists. Skipping creation.`);
          resolve(true);
          return;
        }
        movieBuilder(gifPath)
          .withNoAudio()
          .videoBitrate("32")
          // .toFormat("webm")
          // .videoCodec("libvpx")
          .withSize("?x150")
          .output(videoPath)
          .on("end", end => { resolve(end); })
          .on("error", error => { reject(error); })
          .run();
      }),
    ]);
  } catch (error) {
    console.log(`Small movie building error:\n${error}`);
  }
}

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

  <meta
    property="og:video:url"
    content="${MOVIE_URL}"/>
  <meta
    property="og:video:secure_url"
    content="${MOVIE_URL}"/>
  <meta
    property="og:video:type"
    content="video/mp4"/>
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

async function getDominantColors() {
  await jpegBuildPromise;
  return await dominantColors(JPEG_PATH);
}

async function buildPageHTML(EMOTION) {
  const metaTagsPromise = buildMetaTags(EMOTION);
  let [
    metaTags,
    backgroundColors,
  ] = await Promise.all([
    metaTagsPromise,
    getDominantColors(),
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
        content: "";
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
      img,
      video {
        display: block;
        position: relative;
        width: 100%;
        height: 100%;
        object-fit: contain;
        will-change: transform;
      }
    </style>
  </head>

  <body>
    <video
      muted
      autoplay
      loop
      poster="${BASE_URL}/${JPEG_FOLDER_NAME}/${EMOTION}.jpg"
      alt="Brook is ${EMOTION.humanised}"
    >
      <source
        src="${MOVIE_URL}.webm"
        type="video/webm">
      <source
        src="${MOVIE_URL}.mp4"
        type="video/mp4">
      <img
        src="${GIF_URL}"
        alt="Brook is ${EMOTION.humanised}"
      >
    </video>
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

  try {
    await Promise.all([
      jpegBuildPromise,
      buildMovSmall(),
      buildMov(),

      buildPageHTML(EMOTION)
        .then(pageHTML => writeFile(path.join(DIR_PATH, "index.html"), pageHTML))
        .catch(error => { console.log(error); }),

      buildOembedJSON(EMOTION)
        .then(pageOembedJSON => writeFile(path.join(DIR_PATH, "oembed.json"), pageOembedJSON))
        .catch(error => { console.log(`OEmbed build error:\n${error}`); }),
    ]);
  } catch (error) {
    console.log(`Error build assets for ${EMOTION}\n${error}`)
  }
}());
