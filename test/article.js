var read = require('../index.js')

describe("Readability Test suite", function() {
	it("should get the article Content and Title from URL", function(done) {
		read("http://www.theguardian.com/world/2014/apr/27/ukraine-kidnapped-observers-slavyansk-vyacheslav-ponomarev", function(err, article, res) {
			article.content.should.include("The rebels did not exhibit five members of Ukraine's armed forces captured at the same time on Friday");
			article.title.should.include("Ukraine: kidnapped observers paraded by pro-Russian gunmen in Slavyansk");
			done();
		});
	});

	it("should get title from HTML", function(done) {
		read("<html><head><title>Random Title</title></head><body>Random Body</body></html", function(err, article, res) {
			article.content.should.include("Random Body");
			article.title.should.include("Random Title");
			done();
		});
	});

	it("Should throw exception if no body is present", function(done) {
		read("<html></html", function(err, article, res) {
			err.message.should.equal("No body tag was found");
			done();
		});
	});

	it("Should parse sites with uncommon encoding correctly", function(done) {
		read("http://www.shfinancialnews.com/xww/2009jrb/node5019/node5036/node5044/userobject1ai127332.html", function(err, article, res) {
			article.content.should.include("机构名称");
			article.title.should.include("中国银");
			done();
		});
	});

});