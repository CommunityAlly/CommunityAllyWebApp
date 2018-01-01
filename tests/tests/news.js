LoginPage = require( "../page-objects/login.js" );
ManageResidentsPage = require( "../page-objects/manage-residents.js" );
BuildingInfoPage = require( "../page-objects/building-info.js" );
InputUtils = require( "../input-utils.js" );

// spec.js
describe("The news management page", function()
{
	var TestNewsBody = "TestNews_" + new Date().getTime();
	var TestNewsExpiration = "4/30/2014";

	var LoadingOverlaySelector = by.xpath("//div[contains(@class, 'loading-overlay')][@data-ng-show='isLoading']");

	beforeEach(function()
	{
		LoginPage.login();
		
		//browser.get('#/ManageNews');
		browser.setLocation('/ManageNews');

		InputUtils.waitForElementToBeHidden( LoadingOverlaySelector );
		expect( element(by.id("news-table")).isPresent() ).toBeTruthy();
	});


	afterEach(function()
	{
		LoginPage.logout();
	});


	it("will clear existing news stories", function()
	{
		var deleteFirst = function()
		{
			element( by.id("news-delete-0") ).isPresent().then( function( isPresent )
			{
				if( isPresent )
				{
					element(by.id("news-delete-0")).click();
					InputUtils.waitForElementToBeHidden( LoadingOverlaySelector );
					deleteFirst();
				}
			} );
		};

		deleteFirst();
	});


	it("can create a news story", function()
	{
		InputUtils.clearAndSendKeys(by.id("news-body-textbox"), TestNewsBody);

		InputUtils.clearAndSendKeys(by.id("news-expiration-textbox"), TestNewsExpiration);

		element(by.id("news-expiration-textbox")).sendKeys(protractor.Key.TAB);
		browser.sleep( 500 ); // Let the date picker hide

		element(by.id("news-story-submit")).click();
		InputUtils.waitForElementToBeHidden( LoadingOverlaySelector );

		expect( element(by.id("news-body-0")).getText() ).toBe( TestNewsBody );
		expect( element(by.id("news-expiration-0")).getText() ).toBe( TestNewsExpiration );
	});


 	xit("can find that news story on the home page", function()
	{
		browser.get('#!/Home');

		InputUtil.waitForElementToBePresent( by.id('poll-answer-0-0') );
	});


 	it("can remove our test news item", function()
	{
		element(by.id("news-delete-0")).click();

		InputUtils.waitForElementToBeHidden( LoadingOverlaySelector );

		expect( element( by.id("news-body-0") ).isPresent() ).not.toBeTruthy();
	});
});