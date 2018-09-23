//var HtmlReporter = require('protractor-html-screenshot-reporter');
// Make sure to copy CATestFile.txt to c:\ before running the documents test

exports.config = {
    specs: [
    	//"tests/*.js"
        //'read-only-tests.js'
        //"tests/manage-residents.js"
        //,"tests/assessment-history.js"
        //"tests/documents.js"
        //"tests/polls.js"
        //,"tests/login.js"
        // "tests/news.js"
         //"tests/logbook.js"
        // "tests/association-info.js"
        "tests/sign-up.js"
    ],

    exclude: [
    	//"tests/polls.js"
    	//"tests/logbook.js"
    	//"tests/documents.js",
    	//"tests/login.js",
    	//"tests/sign-up.js" // Don't want to create an association every night
    ],
    
    allScriptsTimeout: 15000,
    baseUrl: "https://qa.condoally.com/",
    //baseUrl: "https://localtest.mycondoally.com/",
    
    jasmineNodeOpts:
    {
      isVerbose: true,
      defaultTimeoutInterval: 60000
    },

    params:
    {
		login:
		{
			user: 'president@mycondoally.com',
			password: 'asdfASDF1'
		}
	},

    // capabilities:
    // {
    //     browserName: 'chrome',
    //     shardTestFiles: true,
    //     maxInstances: 3        
    // },

	// capabilities:
	// {
	// 	browserName: 'phantomjs',
	// 	'phantomjs.binary.path': require('phantomjs').path
	// },

	// capabilities:
	// {
	// 	browserName: 'firefox'
	// },

	onPrepare: function()
	{
		// Add a screenshot reporter and store screenshots to `/tmp/screnshots`:
		// jasmine.getEnv().addReporter(new HtmlReporter({
		// 	baseDirectory: 'protractor_screenshots',
		// 	takeScreenShotsOnlyForFailedSpecs: true
		// }));

	    browser.manage().timeouts().implicitlyWait(500);
	}

	// multiCapabilities: [
	// {
	// 	'browserName': 'firefox'
	// },
	// {
	// 	'browserName': 'chrome'
	// },
	// {
	// 	'browserName': 'internet explorer'
	// },
	// {
	// 	'browserName': 'opera'
	// },
	// {
	// 	'browserName': 'safari'
	// }],

	// sauceUser: "taylorclark",
 //  	sauceKey: "37468861-a31b-4ca7-93a7-0378be5df51c",

};