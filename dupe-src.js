let { ncp } = require("ncp");
let path = require("path");

ncp(
  path.join(__dirname, "src"),
  path.join(__dirname, "build"),
  {
    filter() {
      return true;
    },
  },
  (error) => {
    if (error) {
      return console.error(error);
    }
    console.log("done!");
  },
);
