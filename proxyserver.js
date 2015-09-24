/* This module creates an HTTP server that can be used as a local proxy
 * to bundle requests for pages that are requested in the browser.
 */
var http = require('http');
var fs = require('fs');
var urllib = require('url');
var qs = require('querystring');
var constants = require('constants');
var _ = require('lodash');
var parseArgs = require('minimist');
var path = require('path');
var utils = require('./utils.js');

var bundler = require('equalitie-bundler');

var configFile = './psconfig.json';

var remaps = {};

var config = {
  // Proxy requests for documents and resources to another server
  "useProxy": false,
  "proxyAddress": "",
  "followFirstRedirect": true,
  "followAllRedirects": false,
  "listenPort": 9008,
  "listenAddress": "127.0.0.1",
  "redirectLimit": 10,
  // Headers to clone from the original request sent by the user.
  // See http://nodejs.org/api/http.html#http_message_headers
  "cloneHeaders": [],
  "htmlDir": ".",
  // A mapping of headers to values to write for them in requests.
  "spoofHeaders": {
  },
  "remapsFile": "./remaps.json",
  "loging": {
    "baseDir": ".",
    "allowConsole": true,
    "allowInfoFile": true,
    "allowErrFile": true,
    "infoFilename": "infoFile.log",
    "errFilename": "errorFile.log"
  }
};

var argv = parseArgs(process.argv.slice(2));
if (argv.config) {
  configFile = argv.config;
}

_.extend(config, JSON.parse(fs.readFileSync(configFile)));
_.extend(remaps, JSON.parse(fs.readFileSync(config.remapsFile)));

// Log to syslog when not running in verbose mode
/* if (process.argv[2] != '-v') {
 *	Syslog.init("bundler", Syslog.LOG_PID | Syslog.LOG_ODELAY, Syslog.LOG_LOCAL0);
 * }
 */

// Allow self-signed certs of all shapes and sizes.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

function renderErrorPage(req, res, error) {
  var url = qs.parse(urllib.parse(req.url).query).url;
  fs.readFile(path.join(config.htmlDir, 'error.html'), function(err, content) {
    if (err) {
      res.writeHead(500, {
        'Content-Type': 'text/plain'
      });
      res.write('An error occurred while trying to create a bundle for you.\n');
      res.write('Requested url: ' + url + '\n');
      res.write('The error provided says: ' + error.message + '\n');
      res.end();
    } else {
      if (!res.finished) {
        content = content.toString();
        res.writeHead(500, {
          'Content-Type': 'text/html'
        });
        content = content.replace('{{url}}', url);
        content = content.replace('{{error}}', error.message);
        content = content.replace('{{stack}}', error.stack);
        res.write(content);
        res.end();
      }
    }
  });
}

// Handler to simply print the value of options to be sent to request.
function printOptions(options, next) {
  console.log('\nprintOptions START');
  console.log(options);
  console.log('printOptions END\n');
  next(null, options);
}

function handleRequests(req, res) {
  var url = qs.parse(urllib.parse(req.url).query).url;
  var ping = qs.parse(urllib.parse(req.url).query).ping;

  console.log('Got request for ' + url);

  var bundleMaker = new bundler.Bundler(url);
  var isSameHost = utils.sameHostPredicate(url);

  // Only bundle resources belonging to the same host. Note: this does not stop them from being fetched.
  bundleMaker.on('originalReceived', bundler.predicated(isSameHost, bundler.replaceImages));
  bundleMaker.on('originalReceived', bundler.predicated(isSameHost, bundler.replaceJSFiles));
  bundleMaker.on('originalReceived', bundler.predicated(isSameHost, bundler.replaceCSSFiles));
  bundleMaker.on('originalReceived', bundler.predicated(isSameHost, bundler.replaceURLCalls));


  if (config.useProxy) {
    bundleMaker.on('originalRequest', bundler.proxyTo(config.proxyAddress));
    bundleMaker.on('resourceRequest', bundler.proxyTo(config.proxyAddress));
  }

  // Clone some headers from the incoming request to go into the original request.
  bundleMaker.on('originalRequest', bundler.spoofHeaders(utils.extractHeaders(req, config.cloneHeaders)));

  // Set the Host header to the hostname of the requested site.
  // This handler is attached before the spoofHeaders handlers so that, if
  // a Host header is provided in the config, it will overwrite this one.
  bundleMaker.on('originalRequest', utils.spoofHostAsDestination(url));
  bundleMaker.on('resourceRequest', utils.spoofHostAsDestination(url));

  bundleMaker.on('originalRequest', utils.reverseProxy(remaps));
  bundleMaker.on('resourceRequest', utils.reverseProxy(remaps));

  // Spoof certain headers on every request.
  bundleMaker.on('originalRequest', bundler.spoofHeaders(config.spoofHeaders));
  bundleMaker.on('resourceRequest', bundler.spoofHeaders(config.spoofHeaders));

  bundleMaker.on('originalRequest', bundler.followRedirects(
    config.followFirstRedirect, config.followAllRedirects, config.redirectLimit));

  bundleMaker.on('resourceReceived', bundler.bundleCSSRecursively);

  bundleMaker.on('originalRequest', printOptions);
  bundleMaker.on('resourceRequest', printOptions);

  if (ping) {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8'
    });
    res.write("OK");
    res.end();
  } else {

    bundleMaker.bundle(function(err, bundle) {
      if (err) {
        console.log('Failed to create bundle for ' + req.url);
        console.log('Error: ' + err.message);
        console.trace()
        renderErrorPage(req, res, err);
      } else {
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8'
        });
        res.write(bundle);
        res.end();
      }
    });
  }
}

http.createServer(handleRequests).listen(config.listenPort, config.listenAddress, function() {
  //Drop privileges if running as root
  if (process.getuid() === 0) {
    process.setgid(config.drop_group);
    process.setuid(config.drop_user);
  }
});
//console.log('Proxy server listening on ' + config.listenAddress + ":" + config.listenPort);
