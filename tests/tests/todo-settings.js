LoginPage = require( "../page-objects/login.js" );
ManageResidentsPage = require( "../page-objects/manage-residents.js" );
BuildingInfoPage = require( "../page-objects/building-info.js" );
InputUtils = require( "../input-utils.js" );

// spec.js
describe("The new neighbor welcome page", function()
{
	var TestPollQuestion = "TestPoll_" + new Date().getTime();
	var LoadingOverlaySelector = by.xpath("//div[contains(@class, 'loading-overlay')][@data-ng-show='isLoading']");
	var NewTestAnswer3 = "This is the new answer 3";

	beforeEach(function()
	{
		LoginPage.login();
		//browser.get('#/ManagePolls');
		browser.setLocation('/Settings');
		//expect( element(by.model("settings.siteTitle")).isPresent() ).toBeTruthy();
	});


	afterEach(function()
	{
		LoginPage.logout();
	});


	xit("can set a welcome message", function()
	{
		var originalTitle = "QA Site";		
		var newTestTitle = "QA - My great test title";

		InputUtils.clearAndSendKeys( by.model("settings.siteTitle"), newTestTitle );

		
	});


	xit("can edit the site title", function()
	{
		
	});
});