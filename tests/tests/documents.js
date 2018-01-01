LoginPage = require( "../page-objects/login.js" );
BuildingInfoPage = require( "../page-objects/building-info.js" );
InputUtils = require( "../input-utils.js" );

// spec.js
describe('The documents section', function()
{
	var TestDirName = "TestDir" + new Date().getTime().toString();
	var TestDirName2 = "2TestDirx" + (new Date().getTime() + 12345).toString() + "x2";
	var TestFileName = "CATestFile";
	var NewTestFileName = "TestFile" + new Date().getTime().toString();

	beforeEach(function()
	{
		//browser.ignoreSynchronization = true;

		LoginPage.login();

		// Go to the manage residents page (Could use setLocation(), but get() doesn't wait for the local news to load)
		browser.setLocation('/BuildingInfo');
		
		element(by.id("info-sub-view-link-docs")).click();
		
		expect( element(by.cssContainingText("h3","Documents")).isPresent() ).toBeTruthy();
		BuildingInfoPage.waitForDocumentsToLoad();
	});

	var afterCount = 0;

	afterEach(function()
	{
		// Log out fails for some reason if we don't wait a bit
		//browser.sleep(400);
		// console.log("In afterEach " + ++afterCount);
		LoginPage.logout();

		// Bail out if any test fails - Not working
		// var passed = jasmine.getEnv().currentSpec.results().passed();
		// if(!passed)
		// {
		// 	jasmine.getEnv().specFilter = function(spec) {
		// 		return false;
		// 	};
		// }
	});
	
	var testIndex = 0;
	it("can create two directories", function()
	{
		BuildingInfoPage.createDirectory( TestDirName );

		expect(element(by.cssContainingText(".directory-name",TestDirName)).isPresent()).toBe(true);


		BuildingInfoPage.createDirectory( TestDirName2 );

		expect(element(by.cssContainingText(".directory-name",TestDirName2)).isPresent()).toBe(true);

		// console.log("End of test " + ++testIndex);
	});


	it("can upload a document", function()
	{
		BuildingInfoPage.selectDirectory( TestDirName );

		//browser.executeScript("var elem = $('input[type=\"file\"]');elem.css('visibility','visible'); elem.height('1px'); elem.width('1px'); elem.css('opacity',1);" );
		browser.executeScript("var elem = $('#JQFileUploader'); elem.css('visibility','visible'); elem.height('1px'); elem.width('1px'); elem.css('opacity',1);" );
		
		//element(by.css("input[type='file']")).sendKeys("c:\\CATestFile.txt");
		element(by.id("JQFileUploader")).sendKeys("c:\\CATestFile.txt");

		BuildingInfoPage.waitForDocumentsToLoad();

		browser.sleep( 500 );

		expect(element(by.id("file-name-0")).getText()).toBe( TestFileName );

		// console.log("End of test " + ++testIndex);
	});


	it("can rename a document", function()
	{
		BuildingInfoPage.selectDirectory( TestDirName );

		BuildingInfoPage.renameFile( TestFileName, NewTestFileName );

		BuildingInfoPage.waitForDocumentsToLoad();

		expect(element(by.id("file-name-0")).getText()).toBe( NewTestFileName );

		// console.log("End of test " + ++testIndex);
	});


	it("can move a document to another directory", function()
	{
		BuildingInfoPage.selectDirectory( TestDirName );

		var offset = {x:0,y:0};

		InputUtils.waitForElementToBePresent(by.id("file-name-0"));
		var fileElement = element(by.id("file-name-0"));
		var targetDirectoryElement = element(by.cssContainingText(".directory-name",TestDirName2));

		browser.sleep( 100 );

		fileElement.click();
		
		browser.actions().
		   mouseDown( fileElement ).
		   mouseMove( targetDirectoryElement ). // [] optional
		   mouseUp().
		   perform();

		browser.sleep( 100 );
		
		BuildingInfoPage.waitForDocumentsToLoad();

		BuildingInfoPage.selectDirectory( TestDirName2 );
		InputUtils.waitForElementToBePresent(by.id("file-name-0"));

		expect(element(by.id("file-name-0")).getText()).toBe( NewTestFileName );

		// console.log("End of test " + ++testIndex);
	});


	xit("can delete a document", function()
	{
		BuildingInfoPage.selectDirectory( TestDirName );

		BuildingInfoPage.deleteFile( NewTestFileName );

		expect(element(by.id("file-name-0")).isPresent()).toBe(false);

    	// console.log("End of test " + ++testIndex);
	});


	xit("can delete our test directories", function()
	{
		BuildingInfoPage.deleteDirectory( TestDirName );
		
		expect(element(by.cssContainingText(".directory-name",TestDirName)).isPresent()).toBe(false);
		

		BuildingInfoPage.deleteDirectory( TestDirName2 );
		
		expect(element(by.cssContainingText(".directory-name",TestDirName2)).isPresent()).toBe(false);

		// console.log("End of test " + ++testIndex);
	});
});