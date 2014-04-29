# Node-read

Get Readable Content from any page. Based on Arc90's readability project.

## Features

1. Blazingly Fast. This project is based on Cheerio engine, which is 8x times faster than JSDOM.

## Why not Node-readability

Before starting this project I used Node-readability, but the dependencies of that project plus the slowness of JSDOM made it very frustrating to work with. The compiling of contextify module (dependency of JSDOM) failed 9/10 times. And if you wanted to use node-readability with node-webkit you had to manually rebuild contextify with nw-gyp, which is not the optimal solution.

So I decided to write my own version of Arc90's Readability using the fast Cheerio engine with the least number of dependencies.

The Usage of this module is similiar to node-readability, so it's easy to switch.

## Install

    npm install node-read
    
## Usage

`read(html [, options], callback)`

Where

  * **html** url or html code.
  * **options** is an optional options object
  * **callback** is the callback to run - `callback(error, article, meta)`

Example

    var read = require('node-read');

    read('http://howtonode.org/really-simple-file-uploads', function(err, article, res) {
    
      // Main Article.
      console.log(article.content);
      
      // Title
      console.log(article.title);

      // HTML 
      console.log(article.html);
      
      // DOM
      console.log(article.dom);
      
    });

##TODO

 * Tests. (Zero test coverage at this moment)
 * Get Comments with articles
 * Better scoring of content based on siblings
