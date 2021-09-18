const EMOTION = process.env.EMOTION;
const GIF_FOLDER_NAME = process.env.GIF_FOLDER_NAME || "__gifs";
const BASE_URL = process.env.BASE_URL || "https://brook.is";

Object.defineProperties(String.prototype, {
  sentenceCased: {
    get() {
      if (this.length === 0) {
        return this.toString();
      }
      return `${this.slice(0, 1).toUpperCase()}${this.slice(1)}`;
    },
  },

  humanised: {
    get() {
      if (this.length === 0) {
        return this.toString();
      }
      return this.replace(/-/g, " ");
    },
  },
});

const promisify = require("util").promisify;
const fs = require("fs");
const path = require("path");
const imageSize = require("image-size");
const gifResize = require('@gumlet/gif-resize');
const movieBuilder = require("fluent-ffmpeg");
var minifyHTML = require("html-minifier").minify;
if (process.env.FFMPEG_BINARY) {
  movieBuilder.setFfmpegPath(path.join(__dirname, process.env.FFMPEG_BINARY));
}
const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const copyFile = promisify(fs.copyFile);
const jimp = require("jimp");
const getImageColors = require("get-image-colors");
const dominantColors = (path) =>
  getImageColors(path).then((colors) => colors.map((color) => color.css()));

const SRC_FOLDER = path.join(__dirname, "build");
const BUILD_FOLDER = path.join(__dirname, "build");
const GIF_BIG_FOLDER_NAME = "__original-gifs";
const GIF_SMALL_FOLDER_NAME = "__small-gifs";
const GIF_FOLDER_PATH = path.join(BUILD_FOLDER, GIF_FOLDER_NAME);
const GIF_SRC_FOLDER_PATH = path.join(SRC_FOLDER, GIF_FOLDER_NAME);
const GIF_BIG_FOLDER_PATH = path.join(BUILD_FOLDER, GIF_BIG_FOLDER_NAME);
const GIF_SRC_BIG_FOLDER_PATH = path.join(SRC_FOLDER, GIF_BIG_FOLDER_NAME);
const GIF_SMALL_FOLDER_PATH = path.join(BUILD_FOLDER, GIF_SMALL_FOLDER_NAME);
const JPEG_FOLDER_NAME = "__jpegs";
const JPEG_FOLDER_PATH = path.join(BUILD_FOLDER, JPEG_FOLDER_NAME);
const MOVIE_FOLDER_NAME = "__movs";
const MOVIE_FOLDER_PATH = path.join(BUILD_FOLDER, MOVIE_FOLDER_NAME);
const MOVIE_SMALL_FOLDER_NAME = "__movs_small";
const MOVIE_SMALL_FOLDER_PATH = path.join(
  BUILD_FOLDER,
  MOVIE_SMALL_FOLDER_NAME,
);

const GIF_BIG_PATH = path.join(GIF_BIG_FOLDER_PATH, `${EMOTION}.gif`);
const GIF_PATH = path.join(GIF_FOLDER_PATH, `${EMOTION}.gif`);
const GIF_SMALL_PATH = path.join(GIF_SMALL_FOLDER_PATH, `${EMOTION}.gif`);
const GIF_SRC_PATH = path.join(GIF_SRC_FOLDER_PATH, `${EMOTION}.gif`);
const JPEG_PATH = path.join(JPEG_FOLDER_PATH, `${EMOTION}.jpg`);
const MOVIE_PATH = path.join(MOVIE_FOLDER_PATH, `${EMOTION}`);
const MOVIE_SMALL_PATH = path.join(MOVIE_SMALL_FOLDER_PATH, `${EMOTION}`);
const DIR_PATH = path.join(BUILD_FOLDER, EMOTION);
const GIF_URL = `/${GIF_FOLDER_NAME}/${EMOTION}.gif`;
const GIF_SMALL_URL = `/${GIF_SMALL_FOLDER_NAME}/${EMOTION}.gif`;
const JPEG_URL = `/${JPEG_FOLDER_NAME}/${EMOTION}.jpg`;
const MOVIE_URL = `/${MOVIE_FOLDER_NAME}/${EMOTION}`;

function exists(path) {
  return stat(path).catch(() => false);
}

let minImageSize = 200;

function getLegalSize({ width, height } = {}) {
  let neededResize = false;
  if (width < minImageSize) {
    height = (height * minImageSize) / width;
    width = 200;
    neededResize = true;
  }
  if (height < minImageSize) {
    width = (width * minImageSize) / height;
    height = 200;
    neededResize = true;
  }
  return {
    width,
    height,
    neededResize,
  };
}

function getMinTwitterSize({ width, height } = {}) {
  let minWidth = 280;
  let minHeight = 150;
  let neededResize = false;
  let requiredAspectRatio = minWidth / minHeight;
  let aspectRatio = width / height;
  let newHeight = height;
  let newWidth = width;

  if (aspectRatio >= requiredAspectRatio) {
    newWidth = width * (minHeight / height);
    newHeight = minHeight;
  } else {
    newHeight = height * (minWidth / width);
    newWidth = minWidth;
  }
  if (newHeight !== height || newWidth !== width) {
    neededResize = true;
  }
  return {
    width: newWidth,
    height: newHeight,
    neededResize,
  };
}

const jimpGifPromise = jimp.read(GIF_SRC_PATH);
async function getGifSize() {
  let gifImage = await jimpGifPromise;
  return {
    width: gifImage.bitmap.width,
    height: gifImage.bitmap.height,
  };
}
async function buildJpeg() {
  try {
    if (await exists(JPEG_PATH)) {
      console.log(`${EMOTION} jpeg exists. Skipping creation.`);
      return await getImageSize(JPEG_PATH);
    }
    if (!(await exists(JPEG_FOLDER_PATH))) {
      await mkdir(JPEG_FOLDER_PATH);
    }
    let gifImage = await jimpGifPromise;
    let requiredSize = getLegalSize({
      width: gifImage.bitmap.width,
      height: gifImage.bitmap.height,
    });
    if (requiredSize.neededResize) {
      gifImage = gifImage.scaleToFit(
        Math.ceil(requiredSize.width),
        Math.ceil(requiredSize.height),
      );
    }
    await gifImage.quality(80).write(JPEG_PATH);
    return {
      width: gifImage.bitmap.width,
      height: gifImage.bitmap.height,
    };
  } catch (error) {
    console.log(`JPEG build error:\n${error}`);
  }
}
// this is used in multiple places so let’s cache it
const jpegBuildPromise = buildJpeg();

async function buildSmallGif() {
  try {
    if (await exists(GIF_SMALL_PATH)) {
      console.log(`${EMOTION} small gif exists. Skipping creation.`);
      return await getImageSize(GIF_SMALL_PATH);
    }
    if (!(await exists(GIF_SMALL_FOLDER_PATH))) {
      await mkdir(GIF_SMALL_FOLDER_PATH);
    }
    let gifPath = GIF_BIG_PATH;
    if (!(await exists(gifPath))) {
      gifPath = GIF_PATH;
    }
    let [gifBuffer, gifImage] = await Promise.all([
      readFile(gifPath),
      jimpGifPromise,
    ]);
    let requiredSize = getMinTwitterSize({
      width: gifImage.bitmap.width,
      height: gifImage.bitmap.height,
    });
    if (requiredSize.neededResize) {
      let resizedGif = await gifResize({
        width: Math.ceil(requiredSize.width),
        height: Math.ceil(requiredSize.height),
        optimizationLevel: 3,
        colors: 64,
        resize_method: "lanczos3",
      })(gifBuffer);
      await writeFile(GIF_SMALL_PATH, resizedGif);
    } else {
      await copyFile(GIF_PATH, GIF_SMALL_PATH);
    }
    return {
      width: gifImage.bitmap.width,
      height: gifImage.bitmap.height,
    };
  } catch (error) {
    console.log(`JPEG build error:\n${error}`);
  }
}

async function buildMov() {
  try {
    if (!(await exists(MOVIE_FOLDER_PATH))) {
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
        if (await exists(videoPath)) {
          console.log(`${EMOTION} mp4 exists. Skipping creation.`);
          resolve(true);
          return;
        }
        movieBuilder(gifPath)
          .withNoAudio()
          // .toFormat("mp4")
          .videoCodec("mpeg4") // libx264
          .output(videoPath)
          .on("end", (end) => {
            resolve(end);
          })
          .on("error", (error) => {
            reject(error);
          })
          .run();
      }),

      new Promise(async (resolve, reject) => {
        let videoPath = `${MOVIE_PATH}.webm`;
        if (await exists(videoPath)) {
          console.log(`${EMOTION} webm exists. Skipping creation.`);
          resolve(true);
          return;
        }
        movieBuilder(gifPath)
          .withNoAudio()
          .output(videoPath)
          // .toFormat("webm")
          // .videoCodec("vp9") // libvpx
          .on("end", (end) => {
            resolve(end);
          })
          .on("error", (error) => {
            reject(error);
          })
          .run();
      }),
    ]);
  } catch (error) {
    console.log(`Movie building error:\n${error}`);
  }
}

async function buildMovSmall() {
  try {
    if (!(await exists(MOVIE_SMALL_FOLDER_PATH))) {
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
          // .toFormat("mp4")
          .videoCodec("mpeg4") // libx264
          .withSize("?x150")
          .output(videoPath)
          .on("end", (end) => {
            resolve(end);
          })
          .on("error", (error) => {
            reject(error);
          })
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
          // .videoCodec("vp9") // libvpx
          .withSize("?x150")
          .output(videoPath)
          .on("end", (end) => {
            resolve(end);
          })
          .on("error", (error) => {
            reject(error);
          })
          .run();
      }),
    ]);
  } catch (error) {
    console.log(`Small movie building error:\n${error}`);
  }
}

function getImageSize(imagePath) {
  return new Promise((resolve, reject) => {
    imageSize(imagePath, (error, dimensions) => {
      if (error) {
        reject(error);
      } else {
        resolve(dimensions);
      }
    });
  });
}
async function buildOembedJSON(EMOTION) {
  const { width, height } = await jpegBuildPromise;
  return JSON.stringify({
    width,
    height,
    url: `${BASE_URL}${GIF_URL}`,

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
  const promiseValues = [
    { width: jpegWidth, height: jpegHeight },
    { width: gifWidth, height: gifHeight },
  ] = await Promise.all([
    jpegBuildPromise,
    getGifSize(),
  ]);

  return `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>${EMOTION.humanised.sentenceCased}</title>
  <meta name="description" content="Brook is ${EMOTION.humanised}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="brook.is">
  <meta name="twitter:creator" content="brook@brook.is">
  <meta name="twitter:title" content="${EMOTION.humanised.sentenceCased}">
  <meta name="twitter:description" content="Brook is ${EMOTION.humanised}">
  <meta name="twitter:image" content="${BASE_URL}${GIF_SMALL_URL}">
  <meta name="twitter:image:alt" content="${EMOTION.humanised.sentenceCased}">

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
    content="video.other"/>
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
    content="${BASE_URL}${GIF_URL}"/>
  ${
    ""
    // <meta
    //   property="og:image:secure_url"
    //   content="${BASE_URL}${GIF_URL}"/>
  }
  <meta
    property="og:image:type"
    content="image/gif"/>
  <meta
    property="og:image:width"
    content="${gifWidth}"/>
  <meta
    property="og:image:height"
    content="${gifHeight}"/>
  <meta
    property="og:image:alt"
    content="Brook is ${EMOTION.humanised}"/>

  <meta
    itemprop="image"
    property="og:image"
    content="${BASE_URL}${JPEG_URL}"/>
  <meta
    property="og:image:type"
    content="image/jpeg"/>
  <meta
    property="og:image:width"
    content="${gifWidth}"/>
  <meta
    property="og:image:height"
    content="${gifHeight}"/>
  <meta
    property="og:image:alt"
    content="Brook is ${EMOTION.humanised}"/>

  <meta
    itemprop="video"
    property="og:video"
    content="${BASE_URL}${MOVIE_URL}"/>
  <meta
    property="og:video:secure_url"
    content="${BASE_URL}${MOVIE_URL}"/>
  <meta
    property="og:video:type"
    content="video/mp4"/>
  <meta
    property="og:video:width"
    content="${gifWidth}"/>
  <meta
    property="og:video:height"
    content="${gifHeight}"/>

  <link
    rel="alternate"
    type="application/json+oembed"
    href="${BASE_URL}/${EMOTION}/oembed.json"
    title="Brook is ${EMOTION.humanised}"
  />

  <script type="application/ld+json">${JSON.stringify({
    "@context": "http://schema.org",
    "@type": "Article",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://brook.is/${EMOTION}`
    },
    headline: `Brook is ${EMOTION.humanised}`,
    image: {
      "@type": "ImageObject",
      url: `${BASE_URL}${GIF_URL}`,
      contentUrl: `${BASE_URL}${GIF_URL}`,
      encodingFormat: "image/gif",
      caption: `Brook is ${EMOTION.humanised}`,
      height: gifHeight,
      width: gifWidth,
      representativeOfPage: true,
    },
    datePublished: new Date().toISOString(),
    publisher: {
        "@type": "Person",
        name: "Brook Jordan",
        email: "brook@brook.dev",
        // logo: {
        //     "@type": "ImageObject",
        //     url: "https://giphy.com/static/img/giphy_logo_square_social.png",
        //     width: "300",
        //     height: "300"
        // }
    }
  })}</script>`;
}

async function getDominantColors() {
  await jpegBuildPromise;
  return await dominantColors(JPEG_PATH);
}

async function buildPageHTML(EMOTION) {
  const metaTagsPromise = buildMetaTags(EMOTION);
  let [metaTags, backgroundColors] = await Promise.all([
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
          url("${BASE_URL}")
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

      .back-link,
      .share-button {
        display: block;
        position: fixed;
        padding: 10px 20px;
        margin: 0;
        border: 0;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        background: white;
        color: inherit;
        font: inherit;
        font-size: 30px;
        font-family: sans-serif;
        opacity: 0.1;
        will-change: transform;
        transition: opacity 0.15s;
        cursor: pointer;
        text-decoration: none;
      }
      .back-link {
        top: 0;
        left: 0;
        border-bottom-right-radius: 25px;
      }
      .share-button {
        bottom: 0;
        right: 0;
        border-top-left-radius: 25px;
      }
      .back-link:hover,
      .share-button:hover {
        opacity: 1;
        text-decoration: underline;
      }
    </style>
  </head>

  <body>
    <video
      muted
      autoplay
      loop
      poster="${JPEG_URL}"
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
    <link itemprop="thumbnailUrl" href="${JPEG_URL}">
    <span itemprop="thumbnail" itemscope itemtype="https://schema.org/ImageObject">
      <link itemprop="url" href="${JPEG_URL}">
    </span>

    <script async src="data:application/javascript;base64,${Buffer.from(
      `
      let shareButton = document.createElement("button");
      shareButton.classList.add("share-button");
      shareButton.innerText = "Share";

      let backLink = document.createElement("a");
      backLink.classList.add("back-link");
      backLink.href = "/";
      backLink.innerText = "…";

      if ("share" in window.navigator) {
        shareButton.addEventListener("click", event => {
          event.preventDefault();
          window.navigator.share({
            url: location.href,
            text: "",
            title: "",
          });
        });
      } else {
        shareButton.addEventListener("click", event => {
          event.preventDefault();
          prompt("Copy this link to send your friends:", location.href);
        });
      }

      document.body.appendChild(backLink);
      document.body.appendChild(shareButton);
    `.replace(/\s+/g, " "),
    ).toString("base64")}"></script>
  </body>
</html>`;
}

(async function () {
  if (!(await exists(DIR_PATH))) {
    await mkdir(DIR_PATH);
  }

  try {
    await Promise.all([
      jpegBuildPromise,
      buildMovSmall(),
      buildMov(),
      buildSmallGif(),

      (async function () {
        let indexFilePath = path.join(DIR_PATH, "index.html");
        if (await exists(indexFilePath)) {
          return;
        }
        try {
          let pageHTML = minifyHTML(await buildPageHTML(EMOTION), {
            collapseWhitespace: true,
            minifyCSS: true,
            removeAttributeQuotes: true,
            preserveLineBreaks: true,
          });
          await writeFile(indexFilePath, pageHTML);
        } catch (error) {
          console.log(error);
        }
      })(),

      buildOembedJSON(EMOTION)
        .then((pageOembedJSON) =>
          writeFile(path.join(DIR_PATH, "oembed.json"), pageOembedJSON),
        )
        .catch((error) => {
          console.log(`OEmbed build error:\n${error}`);
        }),
    ]);
  } catch (error) {
    console.log(`Error build assets for ${EMOTION}\n${error}`);
  }
})();
