const CHILD_PROCESS_COUNT = process.env.SPAWN_COUNT || 10;

const promisify = require("util").promisify;
const fs = require("fs");
const path = require("path");
const readdir = promisify(fs.readdir);
const spawnBashProcess = require("./spawn-bash-process.js");

const GIF_FOLDER_NAME = "__gifs";
const GIF_FOLDER_PATH = path.join(__dirname, GIF_FOLDER_NAME);

const childProcesses = Array.from({ length: CHILD_PROCESS_COUNT }, () => spawnBashProcess());

async function buildWebSite() {
  const gifs = await readdir(GIF_FOLDER_PATH);
  if (gifs.some(fileName => !fileName.endsWith(".gif"))) {
    throw "non-gif-image-error"
  }

  const emotions = gifs
    .filter(fileName => !/-\d+\.gif$/.test(fileName))
    .map(fileName => fileName.slice(0, -4));
  let remainingEmotions = emotions.slice(0).reverse();

  let emotionBuilds;

  if (process.env.ONLY_INDEX) {
    emotionBuilds = [];
  } else {
    emotionBuilds = childProcesses.map(childProcess => (async function() {
      while (remainingEmotions.length) {
        let emotion = remainingEmotions.pop();
        await childProcess.run(`EMOTION=${emotion} GIF_FOLDER_NAME=${GIF_FOLDER_NAME} node build-page.js`);
        console.log(`${emotion} page built…`);
      }
      childProcess.end();
    })());
  }

  return Promise.all([
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
