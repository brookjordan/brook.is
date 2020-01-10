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
        html {
          background-color: #ddd;
        }
        body {
          font-family: sans-serif;
        }
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
        li::before,
        li::after {
          content: "";
          display: table;
        }
        a {
          display: block;
          padding: 6px 10px;
          line-height: 1.3;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          border-radius: 5px;
          margin: 10px;
          text-decoration: none;
          transition: box-shadow 0.15s, transform 0.15s;
          background: white;
        }
        a:hover {
          text-decoration: underline;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        a:active {
          text-decoration: none;
          text-decoration: underline;
          transform: translateY(2px);
          box-shadow: 0 0 rgba(0,0,0,0.3);
          transition-duration: 0.05s;
        }
      </style>
    </head>
    <body>
      <h1>How is Brook today?</h1>
      <ul><li>${
        EMOTIONS.map(emotion => `
          <a href="${BASE_URL}/${emotion}">
            Brook is ${emotion.humanised}
          </a>
        `).join("</li><li>")
      }</li></ul>
    </body>
  </html>`);
}());
