const { spawn } = require('child_process');

module.exports = function spawnInstance() {
  const childProcess = spawn('bash')
  return {
    run (command) {
      return new Promise((resolve, reject) => {
        var buf = Buffer.alloc(0)
        childProcess.stdout.on('data', (d) => {
          buf = Buffer.concat([buf, d])
          if (buf.includes('ERRORCODE'))
            resolve(String(buf))
        });
        childProcess.stderr.on('data', d => {
          buf = Buffer.concat([buf, d])
          reject(String(buf))
        });
        childProcess.stdin.write(`${command} && echo ERRORCODE=$?\n`);
      })
    },

    end() {
      childProcess.stdin.end();
    },
  };
};
