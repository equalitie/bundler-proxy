var should = require('should');

describe('utils', function () { // BEGIN UTILS DESCRIPTION

describe('extractHeaders', function () {
  it('should produce an object containing values only of requested headers', function (done) {
    var headers = extractHeaders({
      url: "hello.world.site",
      headers: {'Content-Type': 'text/plain', 'X-Made-With': 'Coffee'}
    }, ['X-Made-With']);
    should.exist(headers);
    headers.should.have.property('X-Made-With');
    headers['X-Made-With'].should.be('Coffee');
    headers.should.not.have.property('Content-Type');
    done();
  });

  it('should set values for headers not present in a request to null', function (done) {
    var headers = extractHeaders({
      url: 'hello.world.site',
      headers: {'Content-Type': 'text/plain', 'X-Made-With': 'Coffee'}
    }, ['Content-Type', 'User-Agent']);
    should.exist(headers);
    headers.should.have.property('Content-Type');
    headers['Content-Type'].should.be('text/plain');
    headers.should.have.property('User-Agent');
    should.not.exist(headers['User-Agent']);
    done();
  });
});

describe('spoofHostAsdestination', function () {
  it('should set the Host header of requests to the hostname of the site', function (done) {
    spoofHostAsDestination('hello.com')({
      url: 'hello.com',
      headers: {'Content-Type': 'text/plain', 'X-Made-With': 'Coffee'}
    }, function (err, options) {
      should.not.exist(err);
      should.exist(options);
      options.should.have.property('headers');
      options['headers'].should.have.property('Host');
      options['headers']['Host'].should.be('hello.com');
      done();
    });
  });
});

describe('reverseProxy', function () {
  it('should remap the request URL and set the Host to the URL of the original request', function (done) {
    reverseProxy({'hello.com': 'helloworld.org'})({
      url: 'hello.com',
      headers: {'Content-Type': 'text/plain', 'X-Made-With': 'Coffee'}
    }, function (err, options) {
      should.not.exist(err);
      should.exist(options);
      options.should.have.property('headers');
      options['headers'].should.have.property('Host');
      options['headers']['Host'].should.be('hello.com');
      done();
    });
  });
});

describe('sameHostPredicate', function () {
  it('should verify that two URLs point to the same host', function (done) {
    var sameHost = sameHostPredicate('hello.com')('Hello world', 'hello.com/friends.jpg');
    sameHost.should.be.true;
    done();
  });

  it('should pass if the resource is provided by a relative path', function (done) {
    var sameHost = sameHostPredicate('hello.com')('Hello world', '/path/to/image.jpg');
    sameHost.should.be.true;
    done();
  });

  it('should fail if the resource is on another host site', function (done) {
    var sameHost = sameHostPredicate('hello.com')('Hello world', 'othersite.ca/resource.css');
    sameHost.should.be.false;
    done();
  });
});

describe('removeLinksToOtherHosts', function () {
  it('should pass the same url provided to it through if the resource is on the same host', function (done) {
    var newURL1 = removeLinksToOtherHosts('hello.com', '/image.jpg');
    var newURL2 = removeLinksToOtherHosts('hello.com', 'hello.com/resources/test.css');
    newURL1.should.be('/image.jpg');
    newURL2.should.be('hello.com/resources/test.css');
    done();
  });

  it('should produce an empty string for resources on another host site', function (done) {
    var newURL = removeLinksToOtherHosts('hello.com', 'othersite.net/resource.png');
    newURL.should.be.empty;
    done();
  });
});

}); // END UTILS DESCRIPTION
