var utils = require('./utils.js');
var cheerio = require('cheerio');
var request = require('request');

function Article(dom, options, uri) {
  this.$ = dom; // Will be modified in-place after analyzing
  this.originalDOM = dom; // Save the original DOM if the user needs it
  this.cache = {};
  if (typeof uri != "undefined") {
    this.base = uri.protocol + "//" + uri.hostname;
  } else {
    this.base = false;
  }
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
  return this.cache['article-content'] = utils.extract(this.$, this.base).html();
}

// Better Article Title Extraction. 
// Author Zihua Li https://github.com/luin/node-readability
Article.prototype.getTitle = function() {
  if (typeof this.cache['article-title'] !== 'undefined') {
    return this.cache['article-title'];
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
  if (html.indexOf('<') === -1) {
    request(html, options, function(err, res, buffer) {
      parseDOM(buffer.toString(), res);
    });
  } else {
    parseDOM(html, null);
  }

  function parseDOM(html, res) {
    if (typeof html !== 'string') html = html.toString();
    if (!html) return callback(new Error('Empty html'));
    var $ = cheerio.load(html, {
      normalizeWhitespace: true,
      xmlMode: true
    });
    return callback(null, new Article($, options, res.request.uri), res);
  }
}