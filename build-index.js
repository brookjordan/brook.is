const EMOTIONS = process.env.EMOTIONS.split(',');
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
const writeFile = promisify(fs.writeFile);

(async function() {
  await writeFile(path.join(__dirname, "index.html"), `<html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">

      <title>Brook is…</title>
      <meta name="description" content="How is Brook today?">

      <style>
        ul {
          column-width: 130px;
          column-gap: 40px;
          padding-left: 20px;
        }
        li {
          display: block;
          break-inside: avoid;
          break-inside: avoid-column;
        }
        a {
          display: block;
          padding: 6px 0;
          line-height: 1.3;
        }
      </style>
    </head>
    <body>
      <h1>How is Brook today?</h1>
      <ul><li>${
        EMOTIONS.map(emotion => `
          <a href="${BASE_URL}/${GIF_FOLDER_NAME}/${emotion}.gif">
            Brook is ${emotion.humanised}
          </a>
        `).join("</li><li>")
      }</li></ul>
    </body>
  </html>`);
}());
