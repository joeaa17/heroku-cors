
const { exec } = require('child_process');

const run = async (cmd) => {
  exec(
    cmd
    , (err, stdout, stderr) => {
    if (err) {
      // node couldn't execute the command
      console.log('err', err);
      return;
    }

    // the *entire* stdout and stderr (buffered)
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
  });

}


// Heroku defines the environment variable PORT, and requires the binding address to be 0.0.0.0
var host = process.env.PORT ? '0.0.0.0' : '127.0.0.1';
var port = process.env.PORT || 8080;

// Grab the blacklist from the command-line so that we can update the blacklist without deploying
// again. CORS Anywhere is open by design, and this blacklist is not used, except for countering
// immediate abuse (e.g. denial of service). If you want to block all origins except for some,
// use originWhitelist instead.
var originBlacklist = parseEnvList(process.env.CORSANYWHERE_BLACKLIST);
var originWhitelist = parseEnvList(process.env.CORSANYWHERE_WHITELIST);
function parseEnvList(env) {
  if (!env) {
    return [];
  }
  return env.split(',');
}

// Set up rate-limiting to avoid abuse of the public CORS Anywhere server.
var checkRateLimit = require('./lib/rate-limit')(process.env.CORSANYWHERE_RATELIMIT);
var cors_proxy = require('./lib/cors-anywhere');

const main = async () => {
  
  // generate key.pem
  // await run('openssl req -x509 -newkey rsa:4096 -keyout lib/key.pem -out lib/cert.pem -sha256 -days 365');
  // generate cert.pem
  


cors_proxy.createServer({
  originBlacklist: originBlacklist,
  originWhitelist: originWhitelist,
  requireHeader: [
  ],
  checkRateLimit: checkRateLimit,
  removeHeaders: [
    'cookie',
    'cookie2',
    // Strip Heroku-specific headers
    'x-heroku-queue-wait-time',
    'x-heroku-queue-depth',
    'x-heroku-dynos-in-use',
    'x-request-start',
  ],
  redirectSameOrigin: true,
  httpProxyOptions: {
    // Do not add X-Forwarded-For, etc. headers, because Heroku already adds it.
    xfwd: false,
    secure: false,
    toProxy: true,
    changeOrigin: true,
    agent: false,
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'accept-language': 'en-US,en;q=0.9',
      'accept-encoding': 'gzip, deflate, br',
      'cache-control': 'max-age=0',
    },

    proxyTimeout: 30000,
    timeout: 30000,
    selfHandleResponse: true,
    followRedirects: true,
    autoRewrite: true,
    preserveHeaderKeyCase: true,

  },
  
  setHeaders: {
    'Access-Control-Allow-Origin': ['*'],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
    'Access-Control-Allow-Credentials': true
  },

  referrerPolicy: 'no-referrer',

}).listen(port, host, function() {
  console.log('Running CORS Anywhere on ' + host + ':' + port);
});

}

main();
