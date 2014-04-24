/*
 * Url module. Required for resolving relative paths.
 */

var url = require("url");

/*
 * Regexp from origin Arc90 Readability.
 */

var regexps = {
  unlikelyCandidatesRe: /combx|pager|comment|disqus|foot|header|menu|meta|nav|rss|shoutbox|sidebar|sponsor|share|bookmark|social|advert|leaderboard|instapaper_ignore/i,
  okMaybeItsACandidateRe: /and|article|body|column|main/i,
  positiveRe: /article|body|content|entry|hentry|page|pagination|post|text/i,
  negativeRe: /combx|comment|contact|foot|footer|footnote|link|media|meta|promo|related|scroll|shoutbox|sponsor|utility|tags|widget/i,
  divToPElementsRe: /<(a|blockquote|dl|div|img|ol|p|pre|table|ul)/i,
  replaceBrsRe: /(<br[^>]*>[ \n\r\t]*){2,}/gi,
  replaceFontsRe: /<(\/?)font[^>]*>/gi,
  trimRe: /^\s+|\s+$/g,
  normalizeRe: /\s{2,}/g,
  killBreaksRe: /(<br\s*\/?>(\s|&nbsp;?)*){1,}/g,
  videoRe: /http:\/\/(www\.)?(youtube|vimeo|youku|tudou|56|yinyuetai)\.com/i
};

/**
 * Node Types and their classification
 **/

var nodeTypes = {
  'mostPositive': ['div'],
  'positive': ['pre', 'td', 'blockquote'],
  'negative': ['address', 'ol', 'ul', 'dl', 'dd', 'dt', 'li'],
  'mostNegative': ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'th']
}

/**
 * We're getting only the readable content + images, no other nodes are needed.
 **/

var trashNodes = 'iframe,noscript,script,style,link,aside,object,form';

/**
 * Select the TopCandidate from all possible candidates
 **/

function getArticle(candidates, $) {
  var topCandidate = null;

  candidates.forEach(function(elem) {
    var linkDensity = getLinkDensity(elem, $);
    var score = elem.data('readabilityScore');
    elem.data('readabilityScore', score * (1 - linkDensity));
    if (!topCandidate || elem.data('readabilityScore') > topCandidate.data('readabilityScore')) {
      topCandidate = elem;
    }
  });

  /**
   * If we still have no top candidate, just use the body as a last resort.
   * We also have to copy the body node so it is something we can modify.
   **/
  if (topCandidate === null) {
    // With no top candidate, bail out if no body tag exists as last resort.
    if (!$('body')) return new Error("No body tag was found.");
    return $('body');
  }
  // Perhaps the topCandidate is the parent?
  if (topCandidate.children().length > 5) {
    return filterCandidates(topCandidate, topCandidate.children(), $);
  } else {
    return filterCandidates(topCandidate, topCandidate.parent().children(), $);
  }
}

/**
 * Filter TopCandidate Siblings (Children) based on their Link Density, and readabilityScore
 * Append the nodes to articleContent
 **/

function filterCandidates(topCandidate, siblings, $) {

  var articleContent = $("<div id='readabilityArticle'></div>");
  var siblingScoreThreshold = Math.max(10, topCandidate.data('readabilityScore') * 0.2);

  siblings.each(function(index, elem) {
    var sibling = $(this);
    var append = false;
    var type = sibling.get(0).name;
    var score = sibling.data('readabilityScore');

    if (sibling === topCandidate || score > siblingScoreThreshold) {
      append = true;
    }
    if (!append && type == 'p') {
      var linkDensity = getLinkDensity(sibling, $);
      var len = sibling.text().length;
      if (len < 3) return;

      if (len > 80 && linkDensity < 0.25) {
        append = true;
      } else if (len < 80 && linkDensity == 0 && sibling.text().search(/\.( |$)/) !== -1) {
        append = true;
      }
    }
    if (append) {
      articleContent.append(sibling);
    }
  });
  return articleContent;
}

/**
 * Traverse all Nodes and remove unlikely Candidates.
 **/

function getCandidates($, base) {

  // Irrelevat tags
  $(trashNodes).remove();

  // Remove Comments
  $('body').contents().filter(function(i, node) {
    if (node.type === "comment") return true;
  }).remove();

  // Candidates Array
  var candidates = [];

  // Iterate over all Nodes in body
  $("*", 'body').each(function(index, element) {
    var node = $(this);
    var nodeType = node.get(0).name;

    // Remove Unlikely Candidates
    var classAndID = $(this).attr('class') + $(this).attr('id');
    if (typeof classAndID != "string") classAndID = "";
    if (classAndID.search(regexps.unlikelyCandidatesRe) !== -1 && classAndID.search(regexps.okMaybeItsACandidateRe) == -1) {
      node.remove();
      return;
    }

    // Remove Elements that have no children and have no content
    if (nodeType == "div" && node.children().length < 1 && node.text().length < 1) {
      node.remove();
      return;
    }

    // Remove Class and Style 
    node.removeAttr('class');
    node.removeAttr('style');

    if (nodeType == "p") {
      var txt = node.text();
      var contentScore = 0;

      // Add a point for the paragraph itself as a base. */
      ++contentScore;

      // Add points for any commas within this paragraph */
      // support Chinese commas.
      contentScore += txt.replace('，', ',').split(',').length;

      // For every 100 characters in this paragraph, add another point. Up to 3 points. */
      contentScore += Math.min(Math.floor(txt.length / 100), 3);
      var parent = node.parent();

      // Initialize Parent and Grandparent
      // First initialize the parent node with contentScore / 1, then grandParentNode with contentScore / 2
      for (var i = 1; i <= 2; i++) {
        if (typeof parent.data('readabilityScore') == "undefined" && parent.get(0) != "undefined") {
          var score = initializeNode(parent);
          parent.data('readabilityScore', score + contentScore / i)
          candidates.push(parent);
        }
        parent = parent.parent();
      }
    }

    // Resolve URLs
    if (nodeType == "img" && typeof node.attr('href') != "undefined") {
      node.attr('src', url.resolve(base, node.attr('src')));
    }
    if (nodeType == "a" && typeof node.attr('href') != "undefined") {
      node.attr('href', url.resolve(base, node.attr('href')));
    }

  });
  return candidates;
}

/**
 * Check the type of node, and get its Weight
 **/

function initializeNode(node) {
  if (typeof node.get(0) == "undefined") return 0;
  var tag = node.get(0).name;
  if (nodeTypes['mostPositive'].indexOf(tag)) return 5 + getClassWeight(node);
  if (nodeTypes['positive'].indexOf(tag)) return 3 + getClassWeight(node);
  if (nodeTypes['negative'].indexOf(tag)) return -3 + getClassWeight(node);
  if (nodeTypes['mostNegative'].indexOf(tag)) return -5 + getClassWeight(node);
}

/**
 * Node Weight is calculated based on className and ID of the node.
 **/

function getClassWeight(node) {
  if (node == null) return;
  var classAndID = node.attr('class') + node.attr('id');
  if (typeof classAndID != "string") return 0;
  var weight = 0;
  if (classAndID.search(regexps.negativeRe) !== -1) weight -= 25;
  if (classAndID.search(regexps.positiveRe) !== -1) weight += 25;

  return weight;
}

/**
 * Get Link density of this node.
 * Total length of text in this node divided by the link text of the node.
 * Relative links are not included.
 **/

function getLinkDensity(node, $) {
  var links = node.find('a');
  var textLength = node.text().length;
  var linkLength = 0;
  links.each(function(index, elem) {
    var href = $(this).attr('href');
    if (!href || (href.length > 0 && href[0] === '#')) return;
    linkLength += $(this).text().length;
  });
  return linkLength / textLength;
}

/**
 * Main method
 * If the first run does not succeed, try the body element;
 **/

module.exports.extract = function($, base) {
  var candidates = getCandidates($, base);
  article = getArticle(candidates, $);
  if (article.length < 1) {
    article = getArticle([$('body')], $)
  }
  return article;
}