var request = require('request'),
  jschardet = require('jschardet'),
  zlib = require("zlib"),
  iconvLite = require('iconv-lite');

module.exports = getHTML;
/**
 * GET html from specified uri.
 * @param options reference to https://www.npmjs.org/package/request
 * @param next callback function
 */
function getHTML(options, next){
  if(typeof options.encoding == 'undefined'){
    options.encoding = null;
  }
  request(options, function(error, response, body){
    // handle error.
    if (error){
      return next(error);
    }
    // status code not 200.
    var statusCode = 500;
    if(response && (statusCode = response.statusCode) != 200){
      return next(new Error('Can not resolve url, status code:' + statusCode));
    }

    response.uri = options.uri;

    var contentEncoding = response.headers['content-encoding'];
    if (contentEncoding && contentEncoding.toLowerCase().indexOf('gzip') >= 0) {
      // unzip if needed.
      zlib.gunzip(response.body, function (error, body) {
        // handle error.
        if (error) {
          return next(error);
        }
        if(!body){
          return next(new Error('response body is empty.'));
        }
        response.body = body;

        decodeHTML(response, next);
      });
    } else {
      // normal
      decodeHTML(response, next);
    }
  });
}
/**
 * decode content by encoding way
 * @param response http response
 * @param next callback
 * @return {Boolean}
 */
function decodeHTML(response, next){
  response.body = response.body || '';

  // detect encoding.
  var detected = jschardet.detect(response.body);
  if (detected && detected.encoding && (detected.encoding != "utf-8" && detected.encoding != "ascii")) {
      response.body = iconvLite.decode(response.body, detected.encoding);
  }
  // make sure response body is string.
  if (typeof response.body != "string") {
    response.body = response.body.toString("utf8");
  }
  next(null, response);
}