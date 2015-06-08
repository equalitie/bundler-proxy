var should = require('should');
var utils = require('../utils');

describe('utils', function () { // BEGIN UTILS DESCRIPTION

describe('extractHeaders', function () {
  it('should produce an object containing values only of requested headers', function (done) {
    var headers = utils.extractHeaders({
      url: "http://hello.world.site",
      headers: {'Content-Type': 'text/plain', 'X-Made-With': 'Coffee'}
    }, ['X-Made-With']);
    should.exist(headers);
    headers.should.have.property('X-Made-With');
    headers['X-Made-With'].should.be.exactly('Coffee');
    headers.should.not.have.property('Content-Type');
    done();
  });

  it('should set values for headers not present in a request to null', function (done) {
    var headers = utils.extractHeaders({
      url: 'http://hello.world.site',
      headers: {'Content-Type': 'text/plain', 'X-Made-With': 'Coffee'}
    }, ['Content-Type', 'User-Agent']);
    should.exist(headers);
    headers.should.have.property('Content-Type');
    headers['Content-Type'].should.be.exactly('text/plain');
    headers.should.have.property('User-Agent');
    should.not.exist(headers['User-Agent']);
    done();
  });
});

describe('spoofHostAsdestination', function () {
  it('should set the Host header of requests to the hostname of the site', function (done) {
    utils.spoofHostAsDestination('http://hello.com')({
      url: 'http://hello.com',
      headers: {'Content-Type': 'text/plain', 'X-Made-With': 'Coffee'}
    }, function (err, options) {
      should.not.exist(err);
      should.exist(options);
      options.should.have.property('headers');
      options['headers'].should.have.property('Host');
      should.exist(options['headers']['Host']);
      options['headers']['Host'].should.be.exactly('hello.com');
      done();
    });
  });
});

describe('reverseProxy', function () {
  it('should remap the request URL and set the Host to the URL of the original request', function (done) {
    utils.reverseProxy({'hello.com': 'helloworld.org'})({
      url: 'http://hello.com',
      headers: {'Content-Type': 'text/plain', 'X-Made-With': 'Coffee'}
    }, function (err, options) {
      should.not.exist(err);
      should.exist(options);
      options.should.have.property('headers');
      options['headers'].should.have.property('Host');
      options['headers']['Host'].should.be.exactly('hello.com');
      done();
    });
  });
});

describe('sameHostPredicate', function () {
  it('should verify that two URLs point to the same host', function (done) {
    var sameHost = utils.sameHostPredicate('http://hello.com')('Hello world', 'http://hello.com/friends.jpg');
    sameHost.should.be.true;
    done();
  });

  it('should pass if the resource is provided by a relative path', function (done) {
    var sameHost = utils.sameHostPredicate('http://hello.com')('Hello world', '/path/to/image.jpg');
    sameHost.should.be.true;
    done();
  });

  it('should fail if the resource is on another host site', function (done) {
    var sameHost = utils.sameHostPredicate('http://hello.com')('Hello world', 'http://othersite.ca/resource.css');
    sameHost.should.be.false;
    done();
  });
});

describe('removeLinksToOtherHosts', function () {
  it('should pass the same url provided to it through if the resource is on the same host', function (done) {
    var newURL1 = utils.removeLinksToOtherHosts('http://hello.com', '/image.jpg');
    var newURL2 = utils.removeLinksToOtherHosts('http://hello.com', 'http://hello.com/resources/test.css');
    newURL1.should.be.exactly('/image.jpg');
    newURL2.should.be.exactly('http://hello.com/resources/test.css');
    done();
  });

  it('should produce an empty string for resources on another host site', function (done) {
    var newURL = utils.removeLinksToOtherHosts('http://hello.com', 'http://othersite.net/resource.png');
    newURL.should.be.empty;
    done();
  });
});

}); // END UTILS DESCRIPTION
