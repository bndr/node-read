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

	it("should prefer to get title from entry-title class", function(done) {
		read("<html><head><title>Incorrect Title</title></head><body><h1 class=\"entry-title\">Preferred Title</h1>Random Body</body></html", function(err, article, res) {
			article.content.should.include("Random Body");
			article.title.should.include("Preferred Title");
			done();
		});
	});

	it("should prefer to get title from instapaper_title class", function(done) {
		read("<html><head><title>Incorrect Title</title></head><body><h1 class=\"instapaper_title\">Preferred Title</h1>Random Body</body></html", function(err, article, res) {
			article.content.should.include("Random Body");
			article.title.should.include("Preferred Title");
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

describe("Random Sites test", function() {
	it("Article From the guardian", function(done) {
		read("http://www.theguardian.com/world/2014/apr/27/ukraine-kidnapped-observers-slavyansk-vyacheslav-ponomarev", function(err, article, res) {
			article.content.should.include("The rebels did not exhibit five members of Ukraine's armed forces captured at the same time on Friday");
			article.title.should.include("Ukraine: kidnapped observers paraded by pro-Russian gunmen in Slavyansk");
			done();
		});
	});
	it("Article From Blog", function(done) {
		read("http://blog.atom.io/2014/05/06/atom-is-now-open-source.html", function(err, article, res) {
			article.content.should.include("still a ton to do before Atom is ready for version");
			article.title.should.include("Atom Blog");
			done();
		});
	});
	it("Article From CNN", function(done) {
		read("http://edition.cnn.com/2014/05/06/world/africa/nigeria-boko-haram-analysis/index.html?hpt=hp_c1", function(err, article, res) {
			article.content.should.include("Why would anyone join a group so focused on killing, maiming and kidnapping");
			article.title.should.include("The essence of terror");
			done();
		});
	});
	it("Article From Chinese Finance", function(done) {
		read("http://finance.ce.cn/rolling/201405/04/t20140504_2752995.shtml", function(err, article, res) {
			article.content.should.include("上海老凤祥银楼杭州区域经理杜锋也告诉记者，随着五月份婚嫁进入高峰期，这个五一期间");
			done();
		});
	});
	it("Article From Russian News", function(done) {
		read("http://newsru.com/world/06may2014/ref.html", function(err, article, res) {
			article.content.should.include("Объясняя свою позицию, Бригинец пишет, что референдум не может проводиться");
			article.title.should.include("Верховная Рада провалила голосование");
			done();
		});
	});
	it("Article From CNN", function(done) {
		read("http://edition.cnn.com/2014/05/06/world/africa/nigeria-boko-haram-analysis/index.html?hpt=hp_c1", function(err, article, res) {
			article.content.should.include("Why would anyone join a group so focused on killing, maiming and kidnapping");
			article.title.should.include("The essence of terror");
			done();
		});
	});
	it("Article From Delfi.lt", function(done) {
		read("http://www.delfi.lt/news/daily/lithuania/v-uspaskicho-gynyba-maskvoje-politikas-ne-derge-lietuva-o-rupinosi-jos-ateitimi.d?id=64717919", function(err, article, res) {
			article.content.should.include("Parlamentaro teigimu, straipsnio autoriaus teiginiai, kad „likęs Maskvoje jis, nerinkdamas žodžių");
			article.title.should.include("Maskvoje politikas ne dergė Lietuvą");
			done();
		});
	});
	it("Article From Spiegel.de", function(done) {
		read("http://www.spiegel.de/wirtschaft/unternehmen/russland-vtb-bank-erhoeht-zinsen-fuer-deutsche-sparer-a-967807.html", function(err, article, res) {
			article.content.should.include("Trotzdem hielt der Kaupthing-Schock nur kurz. Zum Zeitpunkt der Pleite im September 2008 hatten deutsche");
			article.title.should.include("VTB Bank erhöht Zinsen für deutsche Sparer");
			done();
		});
	});
});