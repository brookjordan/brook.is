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
        *,
        ::before,
        ::after {
          box-sizing: border-box;
        }
        html {
          background-color: #ddd;
        }
        body {
          font-family: sans-serif;
        }
        ul {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          padding-left: 20px;
        }
        li {
          display: block;
          break-inside: avoid;
          break-inside: avoid-column;
        }
        a {
          position: relative;
          display: block;
          min-height: 200px;
          line-height: 1.3;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          border-radius: 5px;
          margin: 10px;
          text-decoration: none;
          transform: scale(1) translateY(0);
          transition: box-shadow 0.15s, transform 0.15s;
          color: white;
          overflow: hidden;
          font-size: 20px;
          font-weight: 100;
          background-size: cover;
          background-position: 50% 50%;
        }
        a::after {
          content: "";
          display: block;
          background: rgba(0,0,0,0.5);
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          transition: opacity 0.5s;
        }
        a:hover {
          transform: scale(1.2) translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          z-index: 1;
        }
        a:hover::after {
          opacity: 0;
          transition: opacity 0.15s;
        }
        a:active {
          text-decoration: none;
          text-decoration: underline;
          transform: scale(0.98) translateY(2px);
          box-shadow: 0 0 rgba(0,0,0,0.3);
          transition-duration: 0.05s;
        }
        a span {
          display: block;
          position: absolute;
          transition: opacity 0.5s;
          top: 10px;
          left: 10px;
          max-width: calc(100% - 20px);
          z-index: 1;
        }
        a img {
          display: block;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        a img + img {
          display: none;
          opacity: 0;
          transition: opacity 0.15s;
        }
        a:hover span {
          opacity: 0;
          transition: opacity 0.15s;
        }
        a:hover img + img {
          display: block;
          opacity: 1;
        }
      </style>
    </head>
    <body>
      <h1>How is Brook today?</h1>
      <ul><li>${
        EMOTIONS.map(emotion => `
          <a href="${BASE_URL}/${emotion}">
            <img src="./_jpegs/${emotion}.jpg" loading="lazy">
            <img data-src="./__gifs/${emotion}.gif">
            <span>${emotion.humanised}</span>
          </a>
        `).join("</li><li>")
      }</li></ul>

      <script>
        [...document.querySelectorAll("img[data-src]")].forEach(img => {
          img.parentNode.parentNode.addEventListener("mouseenter", () => {
            img.src = img.getAttribute("data-src");
          }, { once: false });
        });
      </script>
    </body>
  </html>`);
}());
