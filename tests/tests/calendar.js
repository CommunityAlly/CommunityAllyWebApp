LoginPage = require( "../page-objects/login.js" );
ManageResidentsPage = require( "../page-objects/manage-residents.js" );
BuildingInfoPage = require( "../page-objects/building-info.js" );
InputUtils = require( "../input-utils.js" );

// spec.js
describe("The logbook page", function()
{
	var TestPollQuestion = "TestPoll_" + new Date().getTime();
	var LoadingOverlaySelector = by.xpath("(//div[contains(@class, 'loading-overlay')][@data-ng-show='isLoading'])[1]");

	var TestBodyText = "QATEST_293840923 09283409283 4029384209834 209834098";
	var TestEditBodyText = "QATEST_aslkdfj3@#RK aasdlfkj lkasjdf lkj l2k3rj";

	beforeEach(function()
	{
		LoginPage.login();
		
		//browser.get('#/Logbook');
		browser.setLocation('/Logbook');

		InputUtils.waitForElementToBeHidden( LoadingOverlaySelector );
		expect( element(by.id("new-entry-textarea")).isPresent() ).toBeTruthy();
	});


	afterEach(function()
	{
		LoginPage.logout();
	});


	it("will clear existing logbook entries", function()
	{
		var deleteFirst = function()
		{
			element( by.id("delete-entry-button-0") ).isPresent().then( function( isPresent )
			{
				if( isPresent )
				{
					element(by.id("delete-entry-button-0")).click();

					var alertDialog = browser.switchTo().alert();
    				alertDialog.accept();

					InputUtils.waitForElementToBeHidden( LoadingOverlaySelector );
					deleteFirst();
				}
			} );
		};

		deleteFirst();
	});


	it("can create a new logbook entry", function()
	{
		// Test body and post date
		InputUtils.clearAndSendKeys(by.id("new-entry-textarea"), TestBodyText);

		element(by.id("add-entry-button")).click();

		InputUtils.waitForElementToBeHidden( LoadingOverlaySelector );	

		expect( element(by.id("entryTextBox_0")).getText() ).toBe( TestBodyText );
	});


 	it("can edit a logbook entry's text", function()
	{
		element(by.id("edit-entry-button-0")).click();

		InputUtils.clearAndSendKeys(by.id("new-entry-textarea"), TestEditBodyText);

		element(by.id("add-entry-button")).click();

		InputUtils.waitForElementToBeHidden( LoadingOverlaySelector );

		expect( element(by.id("entryTextBox_0")).getText() ).toBe( TestEditBodyText );
	});


	it("can edit a logbook entry's post date", function()
	{
		element(by.id("edit-entry-button-0")).click();

		var newTestDate = "10/11/1983";

		InputUtils.clearAndSendKeys(by.id("LogEntryDateOverrideTextBox"), newTestDate);
		element(by.id("LogEntryDateOverrideTextBox")).sendKeys(protractor.Key.TAB);

		element(by.id("add-entry-button")).click();

		InputUtils.waitForElementToBeHidden( LoadingOverlaySelector );

		// Test the post date
		expect( element(by.id("entry-short-post-date-0")).getInnerHtml() ).toBe( newTestDate );
	});


 	it("removes the test logbook entry", function()
	{
		element(by.id("delete-entry-button-0")).click();

		var alertDialog = browser.switchTo().alert();
		alertDialog.accept();

		InputUtils.waitForElementToBeHidden( LoadingOverlaySelector );

		expect( element( by.id("entryTextBox_0") ).isPresent() ).not.toBeTruthy();
	});
});