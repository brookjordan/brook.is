const promisify = require("util").promisify;
const fs = require("fs");
const path = require("path");
const imageSize = require("image-size");
const readdir = promisify(fs.readdir);
const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);
const writeFile = promisify(fs.writeFile);
const jimp = require("jimp")

const adjectives = [
  'damn',
  'super',
  'quite',
  'rather',
  'totally',
  'stupidly',
  'seriouslu',
  'ridiculously',
];

const imageSizes = {};

function randomAdjective() {
  return adjectives[Math.floor(Math.random() * adjectives.length)];
}

function humanise(str) {
  return str.replace(/-/g, ' ');
}

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
    title: `Brook is ${randomAdjective()} ${humanise(emotion)}`,
    author_name: "Brook Jordan",
    author_url: "https://brook.dev/",
    provider_name: "Brook is",
    provider_url: "https://brook.is/",
  });
}

async function buildMetaTags(emotion) {
  const { width, height } = await getImageSize(emotion);
  return `<title>${humanise(emotion.slice(0,1).toUpperCase() + emotion.slice(1))}</title>
<meta name="description" content="Brook is ${randomAdjective()} ${humanise(emotion)}">

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
  content="https://brook.is/${emotion}/"/>
<meta
  property="og:type"
  content="website"/>
<meta
  property="og:title"
  content="${humanise(emotion.slice(0,1).toUpperCase() + emotion.slice(1))}"/>
<meta
  property="og:description"
  content="Brook is ${randomAdjective()} ${humanise(emotion)}"/>
<meta
  property="og:updated_time"
  content="${new Date().toISOString()}"/>

<meta
  itemprop="image"
  property="og:image"
  content="https://brook.is/static/${emotion}.jpg"/>
<meta
  itemprop="image"
  property="og:image:secure_url"
  content="https://brook.is/static/${emotion}.jpg"/>
<meta
  property="og:image:type"
  content="image/jpeg"/>
<meta
  property="og:image:alt"
  content="Brook is ${randomAdjective()} ${humanise(emotion)}"/>
<meta
  property="og:image:width"
  content="${width}"/>
<meta
  property="og:image:height"
  content="${height}"/>

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
  content="Brook is ${randomAdjective()} ${humanise(emotion)}"/>
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
  title="Brook is  ${randomAdjective()} ${humanise(emotion)}"
/>

<script type="application/ld+json">
{
  "@context": "https://schema.org/",
  "@type": "ImageObject",
  "url": "https://brook.is/static/${emotion}.jpg",
  "height": ${width},
  "width": ${height}
}
</script>`;
}

async function buildPageHTML(emotion) {
  const metaTags = await buildMetaTags(emotion);
  return `<head>
    ${metaTags}

    <style>
      body,html {
        margin: 0;
        height: 100%;
        background: no-repeat 50% 50% / cover url("/${emotion}.gif");
      }
      body {
        background-size: contain;
      }
    </style>
  </head>

  <body>
    <link itemprop="thumbnailUrl" href="https://brook.is/static/${emotion}.jpg">
    <span itemprop="thumbnail" itemscope itemtype="https://schema.org/ImageObject">
      <link itemprop="url" href="https://brook.is/static/${emotion}.jpg">
    </span>
  </body>`;
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
          .write(`static/${emotion}.jpg`);
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
