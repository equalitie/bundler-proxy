var urllib = require('url');

module.exports = { // BEGIN MODULE

// Create a function that always returns the same value
constant: function (x) {
  return function () {
    return x;
  };
},

// Extract the values of an array of provided headers into an object.
extractHeaders: function (req, headers) {
	var newHeaders = {};
	for (var i = 0, len = headers.length; i < len; ++i) {
		if (req.headers.hasOwnProperty(headers[i])) {
			newHeaders[headers[i]] = req.headers[headers[i]];
		} else {
      newHeaders[headers[i]] = null;
    }
	}
	return newHeaders;
},

// Spoof the Host header in proxied requests to be the hostname of the site
// being requested. This will (and should) be called before bundler.spoofHeaders
// so that, if a Host header is set in the config, it will overwrite the
// default provided by this function.
spoofHostAsDestination: function (url) {
  return function (options, next) {
    var hostname = urllib.parse(url).hostname;
    // Remove all subdomains. e.g. learn.distributed.deflect.ca becomes deflect.ca
    if (!options.hasOwnProperty('headers')) {
      options.headers = {};
    }
    options.headers['Host'] = hostname;
    next(null, options);
  };
},

// Set up a request for reverse proxying
reverseProxy: function (remapper) {
  return function (options, next) {
  	var url = urllib.parse(options.url);
  	var hostname = url.hostname;
  	var resource = url.path;
  	var protocol = url.protocol;
  	if (!options.hasOwnProperty('headers')) {
  	  options.headers = {};
  	}
  	if (remapper.hasOwnProperty(hostname)) {
  	  options.url = urllib.resolve(protocol + '//' + remapper[hostname], resource);
      console.log("Remapped URL is %s", options.url)
  	  options.headers['Host'] = hostname;
  	}
  	next(null, options);
  };
},

// Create a predicate for bundler's `predicated` helper function that determines
// whether a resource being requested has the same host as that of the original document.
sameHostPredicate: function (originalURL) {
  if (typeof originalURL === 'undefined' || !originalURL) {
    return this.constant(false);
  }
  var originalHost = urllib.parse(originalURL).host; // Matches hostname and port
  return function (originalDoc, resourceURL) {
    var resourceHost = urllib.parse(resourceURL).host;
    // If the resource is on a relative path (e.g. href=/path/to/resource), host will be null.
    return (resourceHost === null) || (originalHost === resourceHost);
  };
},

// A replacement function for bundler's `replaceLinks` handler that will remove
// any links not on the same site as the originalURL, preventing requests to outside sources.
removeLinksToOtherHosts: function (originalURL, resourceURL) {
  // Remove all links found in resources where the original URL is indeterminate.
  // This should only happen when we've received a request for something like a favicon.
  if (typeof originalURL === 'undefined' || !originalURL) {
    return '';
  }
  var originalHost = urllib.parse(originalURL).host;
  var resourceHost = urllib.parse(resourceURL).host;
  if ((resourceHost === null) || (originalHost === resourceHost)) {
    return resourceURL;
  } else {
    return '';
  }
}

}; // END MODULE
