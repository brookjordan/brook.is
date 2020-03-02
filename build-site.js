const CHILD_PROCESS_COUNT = process.env.SPAWN_COUNT || 10;

const promisify = require("util").promisify;
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");
const readdir = promisify(fs.readdir);
const writeFile = promisify(fs.writeFile);
const spawnBashProcess = require("./spawn-bash-process.js");

const GIF_FOLDER_NAME = "__gifs";
const GIF_FOLDER_PATH = path.join(__dirname, GIF_FOLDER_NAME);

const childProcesses = Array.from({ length: CHILD_PROCESS_COUNT }, () => spawnBashProcess());

async function buildCacheDetails(emotions) {
  if (process.env.ONLY_INDEX) { return; }

  const staticAssets = [
    "../",
    "../index.html",
    "../favicon.ico",

    ...emotions.flatMap(emotion => [
      `../${emotion}/index.html`,
      `../${emotion}/oembed.json`,
      `../__gifs/${emotion}.gif`,
      `../_jpegs/${emotion}.jpg`,
      `../_movs/${emotion}.mp4`,
      `../_movs/${emotion}.webm`,
      `../_movs_small/${emotion}.mp4`,
      `../_movs_small/${emotion}.webm`,
    ]),
  ];

  await writeFile(path.join(__dirname, "pwa", "cache-details.js"), `
    const cacheName = "squirish-v1";
    const staticAssets = ${JSON.stringify(staticAssets, null, 2)};
  `);

  console.log("Asset cache list built…");
}

async function buildNodeVersionLock(emotions) {
  let nodeVersion = /(\d+\.)*\d+/.exec(process.versions.node)[0];

  await writeFile(path.join(__dirname, ".nvmrc"), `${nodeVersion}\n`);

  console.log("Node version lock built…");
}

async function buildWebSite() {
  let buildNodeVersionLockPromise = buildNodeVersionLock();
  const gifs = (await readdir(GIF_FOLDER_PATH)).filter(fileName => fileName.endsWith(".gif"));
  let buildGifCount = 0;
  let startTime = performance.now();

  const filteredGifs = gifs
    .filter(fileName => !/-\d+\.gif$/.test(fileName));
  const emotions = filteredGifs
    .map(fileName => fileName.slice(0, -4));
  let buildCacheDetailsPromise = buildCacheDetails(emotions);
  let remainingEmotions = emotions.slice(0).reverse();

  let emotionBuilds;

  if (process.env.ONLY_INDEX) {
    emotionBuilds = [];
  } else {
    emotionBuilds = childProcesses.map(childProcess => (async function() {
      while (remainingEmotions.length) {
        let emotion = remainingEmotions.pop();
        try {
          await childProcess.run(`EMOTION=${emotion} GIF_FOLDER_NAME=${GIF_FOLDER_NAME} node build-page.js`);
        } catch (error) {
          console.log(`Error building ${emotion}:\n${error}`);
        }
        buildGifCount += 1;
        console.log(`${
          emotion} page built: ${
          +((buildGifCount / filteredGifs.length) * 100).toFixed(1)}% in ${
          +((performance.now() - startTime) / 1000).toFixed(1)
        }s`);
      }
      childProcess.end();
    })());
  }

  return Promise.all([
    buildCacheDetailsPromise,
    buildNodeVersionLockPromise,
    ...emotionBuilds,

    (async function() {
      let indexProcess = spawnBashProcess();
      await indexProcess.run(`GIF_FOLDER_NAME=${GIF_FOLDER_NAME} EMOTIONS=${emotions.join()} node build-index.js`);
      await indexProcess.end();
      console.log("index page built…");
    })(),
  ]);
}

(async function() {
  try {
    await buildWebSite();
    console.log("Site building complete");
  } catch (error) {
    console.log(error);
  }
}());
