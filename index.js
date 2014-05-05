var utils = require('./lib/utils.js');
var req = require('fetch').fetchUrl;
var cheerio = require('cheerio');
var url = require("url");

function Article(dom, options, uri) {
  this.$ = dom; // Will be modified in-place after analyzing
  this.originalDOM = dom; // Save the original DOM if the user needs it
  this.cache = {};
  if (uri && typeof uri != "undefined") {
    this.base = uri.protocol + "//" + uri.hostname;
    // including port.
    if(uri.port && uri.port != 80){
      this.base += ':' + uri.port;
    }
  } else {
    this.base = false;
  }
  this.options = options;
  this.__defineGetter__('content', function() {
    return this.getContent(true);
  });
  this.__defineGetter__('title', function() {
    return this.getTitle(true);
  });
  this.__defineGetter__('html', function() {
    return this.getHTML(true);
  });
  this.__defineGetter__('dom', function() {
    return this.getDOM(true);
  });
}

Article.prototype.getContent = function() {
  if (typeof this.cache['article-content'] !== 'undefined') {
    return this.cache['article-content'];
  }
  return this.cache['article-content'] = utils.extract(this.$, this.base, this.options).html();
}

// Better Article Title Extraction. 
// Author Zihua Li https://github.com/luin/node-readability
Article.prototype.getTitle = function() {
  if (typeof this.cache['article-title'] !== 'undefined') {
    return this.cache['article-title'];
  }

  // Prefer to pull the title from one of the class names known to hold
  // the article title (Instapaper conventions and
  // https://www.readability.com/developers/guidelines#publisher).
  var preferredTitle = this.$('.entry-title, .instapaper_title');
  if (preferredTitle.length > 0) {
    return this.cache['article-title'] = preferredTitle.first().text();
  }

  var title = this.$('title').text();
  var betterTitle;
  var commonSeparatingCharacters = [' | ', ' _ ', ' - ', '«', '»', '—'];

  var self = this;
  commonSeparatingCharacters.forEach(function(char) {
    var tmpArray = title.split(char);
    if (tmpArray.length > 1) {
      if (betterTitle) return self.cache['article-title'] = title;
      betterTitle = tmpArray[0].trim();
    }
  });

  if (betterTitle && betterTitle.length > 10) {
    return this.cache['article-title'] = betterTitle;
  }

  return this.cache['article-title'] = title;
}

Article.prototype.getDOM = function() {
  return this.originalDOM;
}

Article.prototype.getHTML = function() {
  return this.$.html();
}

var read = module.exports = function(html, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {considerDIVs: true};
  }

  if (!html.match(/^\s*</)) {
    req(html, options, function(err, meta, body) {
      if (err) {
        return callback(err);
      }
      parseDOM(body, url.parse(html), body);
    });
  } else {
    parseDOM(html, null);
  }

  function parseDOM(html, uri, body) {
    if (typeof html !== 'string') html = html.toString();
    if (!html) return callback(new Error('Empty html'));
    var $ = cheerio.load(html, {
      normalizeWhitespace: true
    });
    if ($('body').length < 1) return callback(new Error("No body tag was found"));
    return callback(null, new Article($, options, uri), body);
  }
}