// This script supplies a simple HTTP server whose only function is to accept requests
// and log out any interesting data.  Meant to ensure that headers set by the proxy
// server are intact by the time they make it to a host.

var http = require('http');

var port = 9009;
var address = '127.0.0.1';

function log_requests(req, res) {
  console.log('Request URL = ' + req.url);
  console.log(req.headers);
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('Acknowledged\n');
  res.end();
}

http.createServer(log_requests).listen(port, address);
