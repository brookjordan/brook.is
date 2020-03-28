const { spawn } = require("child_process");

module.exports = function spawnInstance() {
  const childProcess = spawn("bash");
  return {
    run(command) {
      return new Promise((resolve, reject) => {
        let buffer = Buffer.alloc(0);

        childProcess.stdout.on("data", (d) => {
          buffer = Buffer.concat([buffer, d]);
          if (buffer.includes("ERRORCODE")) {
            resolve(String(buffer));
          }
        });

        childProcess.stderr.on("data", (d) => {
          buffer = Buffer.concat([buffer, d]);
          reject(String(buffer));
        });

        childProcess.stdin.write(`${command} && echo ERRORCODE=$?\n`);
      });
    },

    end() {
      childProcess.stdin.end();
    },
  };
};
