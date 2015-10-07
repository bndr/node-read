/*
 * Url module. Required for resolving relative paths.
 */

var url = require("url");

/*
 * Regexp from origin Arc90 Readability.
 */

var regexps = {
  unlikelyCandidatesRe: /combx|pager|comment|disqus|foot|header|menu|meta|nav|rss|shoutbox|sidebar|sponsor|share|bookmark|social|advert|leaderboard|instapaper_ignore|entry-unrelated/i,
  okMaybeItsACandidateRe: /and|article|body|column|main/i,
  positiveRe: /article|body|content|entry|hentry|page|pagination|post|text/i,
  negativeRe: /combx|comment|captcha|contact|foot|footer|footnote|link|media|meta|promo|related|scroll|shoutbox|sponsor|utility|tags|widget|tip|dialog/i,
  divToPElementsRe: /<(a|blockquote|dl|div|img|ol|p|pre|table|ul)/i,
  replaceBrsRe: /(<br[^>]*>[ \n\r\t]*){2,}/gi,
  replaceFontsRe: /<(\/?)font[^>]*>/gi,
  trimRe: /^\s+|\s+$/g,
  normalizeRe: /\s{2,}/g,
  killBreaksRe: /(<br\s*\/?>(\s|&nbsp;?)*){1,}/g,
  videoRe: /http:\/\/(www\.)?(youtube|vimeo|youku|tudou|56|yinyuetai)\.com/i,
  nextLink: /(next|weiter|continue|>([^\|]|$)|»([^\|]|$))/i // Will be used to get the next Page of Article
};

/**
 * Node Types and their classification
 **/

var nodeTypes = {
  'mostPositive': ['div'],
  'positive': ['pre', 'td', 'blockquote'],
  'negative': ['address', 'ol', 'ul', 'dl', 'dd', 'dt', 'li'],
  'mostNegative': ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'th']
};

/**
 * Select the TopCandidate from all possible candidates
 **/

function getArticle(candidates, $, options) {
  var topCandidate = null;

  candidates.forEach(function(elem) {
    var linkDensity = getLinkDensity(elem, $);
    var score = elem.data('readabilityScore');
    var siblings = elem.children('p').length;

    elem.data('readabilityScore', Math.min(2, Math.max(siblings, 1)) * score * (1 - linkDensity));
    if (!topCandidate || elem.data('readabilityScore') > topCandidate.data('readabilityScore')) {
      topCandidate = elem;
    }
  });
  /**
   * If we still have no top candidate, just use the body as a last resort.
   * Should not happen.
   **/
  if (topCandidate === null) {
    return $('body');
  }

  // Perhaps the topCandidate is the parent?
  var parent;
  if (!(parent = topCandidate.parent()) || parent.length == 0 || topCandidate.children('p').length > 5) {
    return filterCandidates(topCandidate, topCandidate.children(), $);
  } else {
    return filterCandidates(topCandidate, parent.children(), $);
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

    var node = $(this);
    var append = false;
    var type = node.get(0).name;
    var score = node.data('readabilityScore');
    var children = siblings.contents().length;

    if (node.is(topCandidate) || score > siblingScoreThreshold) {
      append = true;
    }

    if (children > 0) {
      siblings.contents().each(function(index, elem) {
        if (elem.name == "img") append = true;
      });
    }

    if (!append && (type == 'p' || type == 'ul' || type == 'blockquote' || type == 'pre' || type == 'h2')) {
     $(elem).find('a').each(function(index, elems) {
          if ($(elems).text().length > 1) return;
          if (elems.name == "a") $(elems).remove();
        });
      
      var linkDensity = getLinkDensity(node, $);
      var len = node.text().length;
      if (len < 3) return;

      if (len > 80 && linkDensity < 0.25) {
        append = true;
      } else if (len < 80 && linkDensity == 0 && node.text().replace(regexps.trimRe, "").length > 0) {
        append = true;
      }

    }
    if (append) {
      articleContent.append(node);
    }
  });
  return articleContent;
}

/**
 * Traverse all Nodes and remove unlikely Candidates.
 **/

function getCandidates($, base, options) {

  // Removing unnecessary nodes
  $(options.nodesToRemove).remove();

  // Candidates Array
  var candidates = [];

  // Iterate over all Nodes in body
  $('*', 'body').each(function(index, element) {
    var node = $(this);

    // If node is null, return, otherwise Illegal Access Error
    if (!node || node.length == 0) return;
    var nodeType = node.get(0).name;

    // Remove Unlikely Candidates
    var classAndID = (node.attr('class') || "") + (node.attr('id') || "");
    if (classAndID.search(regexps.unlikelyCandidatesRe) !== -1 && classAndID.search(regexps.okMaybeItsACandidateRe) == -1) {
      return node.remove();
    }

    // Remove Elements that have no children and have no content
    if (nodeType == "div" && node.children().length < 1 && node.text().trim().length < 1) {
      return node.remove();
    }

    // Remove Style 
    node.removeAttr('style');

    // turn all divs that don't have children block level elements into p's
    if (nodeType === "div" && options.considerDIVs) {
      if (node.html().search(regexps.divToPElementsRe) === -1) {
        node.replaceWith('<p class="node-read-div2p">' + node.html() + '</p>');
      } else {
        node.contents().each(function(index, element) {
          var child = $(this),
            childEntity;
          if (!child || !(childEntity = child.get(0))) {
            return;
          }
          if (childEntity.type == 'text' && childEntity.data && childEntity.data.replace(regexps.trimRe, '').length > 1) {
            child.replaceWith('<p class="node-read-div2p">' + childEntity.data + '</p>');
          }
        });
      }
    }

    // score paragraphs.
    if (nodeType == "p" || nodeType == "pre") {
      return calculateNodeScore(node, candidates);
    }

    // Resolve URLs
    if (base) {
      if (nodeType == "img" && typeof node.attr('src') != "undefined") {
        node.attr('src', url.resolve(base, node.attr('src')));
      }
      if (nodeType == "a" && typeof node.attr('href') != "undefined") {
        node.attr('href', url.resolve(base, node.attr('href')));
      }
    }

    // Clean the headers
    if (["h1", "h2", "h3", "h4", "h5", "h6"].indexOf(nodeType) !== -1) {
      var weight = getClassWeight(node, $);
      var density = getLinkDensity(node, $);
      if (weight < 0 || density > 0.3) {
        node.remove();
      }
    }

  });
  // calculate scores of `P`s that were turned from DIV by us.
  $('p.node-read-div2p', 'body').each(function() {
    calculateNodeScore($(this), candidates);
  });

  return candidates;
}

/**
 * Give a score to each node based on the Content.
 * @param node
 * @param contentScore
 * @param candidates
 */
function scoreCandidate(node, contentScore, candidates) {
  var score;
  if (typeof node.data('readabilityScore') == "undefined") {
    score = initializeNode(node);
    candidates.push(node);
  } else {
    score = node.data('readabilityScore') || 0;
  }
  node.data('readabilityScore', score + contentScore)
}

/**
 * calculate score of specified node.
 * @param node
 * @param candidates
 */
function calculateNodeScore(node, candidates) {
  var txt = node.text();
  var contentScore = 1;

  // Ignore too small nodes
  if (txt.length < 25) return;

  // Add points for any commas within this paragraph
  // support Chinese commas.
  var commas = txt.match(/[,，.。;；?？、]/g);
  if (commas && commas.length) {
    contentScore += commas.length;
  }

  // For every 100 characters in this paragraph, add another point. Up to 3 points.
  contentScore += Math.min(Math.floor(txt.length / 100), 3);

  // Initialize Parent and Grandparent
  // First initialize the parent node with contentScore / 1, then grandParentNode with contentScore / 2
  var parent = node.parent();

  if (parent && parent.length > 0) {
    scoreCandidate(parent, contentScore, candidates);
    var grandParent = parent.parent();
    if (grandParent && grandParent.length > 0) {
      scoreCandidate(grandParent, contentScore / 2, candidates);
    }
  }
}

/**
 * Check the type of node, and get its Weight
 **/

function initializeNode(node) {
  if (!node || node.length == 0) return 0;
  var tag = node.get(0).name;
  if (nodeTypes['mostPositive'].indexOf(tag) >= 0) return 5 + getClassWeight(node);
  if (nodeTypes['positive'].indexOf(tag) >= 0) return 3 + getClassWeight(node);
  if (nodeTypes['negative'].indexOf(tag) >= 0) return -3 + getClassWeight(node);
  if (nodeTypes['mostNegative'].indexOf(tag) >= 0) return -5 + getClassWeight(node);
  return -1;
}

/**
 * Node Weight is calculated based on className and ID of the node.
 **/

function getClassWeight(node) {
  if (node == null || node.length == 0) return 0;
  var classAndID = (node.attr('class') || "") + (node.attr('id') || "");
  var weight = 0;

  if (node.get(0).name == "article") weight += 25;
  if (classAndID.search(regexps.negativeRe) !== -1) weight -= 25;
  if (classAndID.search(regexps.positiveRe) !== -1) weight += 25;

  return weight;
}

/**
 * Get Link density of this node.
 * Total length of link text in this node divided by the total text of the node.
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

  return (linkLength / textLength) || 0;
}

/**
 * Main method
 * If the first run does not succeed, try the body element;
 **/

module.exports.extract = function($, base, options) {
  var candidates = getCandidates($, base, options);
  article = getArticle(candidates, $, options);
  if (article.length < 1) {
    article = getArticle([$('body')], $, options)
  }
  return article;
}
