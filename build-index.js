const EMOTIONS = process.env.EMOTIONS.split(',');

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
  await writeFile(path.join(__dirname, "build", "index.html"), `<html>
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
          padding: 0;
        }
        li {
          display: block;
        }
        a {
          position: relative;
          display: block;
          min-height: 200px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          transform: scale(1) translateY(0);
          line-height: 1.3;
          border-radius: 5px;
          margin: 10px;
          text-decoration: none;
          color: white;
          overflow: hidden;
          font-size: 20px;
          font-weight: 100;
          transition:
            box-shadow 0.15s,
            transform 0.15s
          ;
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
        li:hover a {
          transform: scale(1.2) translateY(-2px);
          z-index: 1;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        li:hover a::after {
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
        a img,
        a video {
          display: block;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        a video {
          display: none;
          opacity: 0;
          transition: opacity 0.15s;
        }
        li:hover span {
          opacity: 0;
          transition: opacity 0.15s;
        }
        li:hover video {
          display: block;
          opacity: 1;
        }
      </style>
    </head>
    <body>
      <h1>How is Brook today?</h1>
      <ul><li>${
        EMOTIONS.map(emotion => `
          <a href="/${emotion}/" data-emotion="${emotion}">
            <img src="/_jpegs/${emotion}.jpg" loading="lazy">
            <span class="emotion__label">${emotion.humanised}</span>
          </a>
        `).join("</li><li>")
      }</li></ul>

      <script>
        [...document.querySelectorAll("[data-emotion]")].forEach(link => {
          link.parentNode.addEventListener("mouseenter", () => {
            let video = document.createElement("video");
            let sourceMp4 = document.createElement("source");
            let sourceWebm = document.createElement("source");

            sourceMp4.src = \`/__movs_small/\${link.getAttribute("data-emotion")}.mp4\`;
            sourceMp4.type = "video/mp4";

            sourceWebm.src = \`/__movs_small/\${link.getAttribute("data-emotion")}.webm\`;
            sourceWebm.type = "video/webm";

            video.muted = "muted";
            video.autoplay = "autoplay";
            video.loop = "loop";
            video.append(sourceMp4);
            video.append(sourceWebm);
            link.insertBefore(video, link.querySelector(".emotion__label"));
          }, { once: true });
        });
      </script>
      <script src="./pwa/init.js" defer type="module"></script>
    </body>
  </html>`);
  return;
}());
