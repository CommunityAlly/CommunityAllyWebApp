LoginPage = require( "../page-objects/login.js" );
ManageResidentsPage = require( "../page-objects/manage-residents.js" );
BuildingInfoPage = require( "../page-objects/building-info.js" );
InputUtils = require( "../input-utils.js" );

// spec.js
describe("The association info page", function()
{
	var LoadingOverlaySelector = by.xpath("//div[contains(@class, 'loading-overlay')][@data-ng-show='isLoadingInfo']");

	
	beforeEach(function()
	{
		LoginPage.login();

		//browser.get('#/BuildingInfo');
		browser.setLocation('/BuildingInfo');

		InputUtils.waitForElementToBeHidden( LoadingOverlaySelector );
		expect( element(by.id("AddInfoItemTitleTextBox")).isPresent() ).toBeTruthy();
	});


	afterEach(function()
	{
		LoginPage.logout();
	});


	it("will clear existing info entries", function()
	{
		var deleteFirst = function()
		{
			element( by.id("info-item-delete-0-button") ).isPresent().then( function( isPresent )
			{
				if( isPresent )
				{
					BuildingInfoPage.deleteInfoItem( 0 );
					deleteFirst();
				}
			} );
		};

		deleteFirst();
	});


	xit("can create a new info entry", function()
	{
		var testTitle = "Test Title_" + new Date().getTime();
		var testBody = "Testing the body_" + new Date().getTime();

		InputUtils.clearAndSendKeys(by.id("AddInfoItemTitleTextBox"), testTitle);
	
		browser.ignoreSynchronization = true;

		browser.switchTo().frame("info-body-text-box_ifr");
		element(by.id("tinymce")).sendKeys(testBody);		
		browser.switchTo().defaultContent();

		browser.ignoreSynchronization = false;
		browser.sleep( 150 );
		
		// Tab over to the add button then click it with the space bar
		browser.actions().sendKeys(protractor.Key.TAB).sendKeys(protractor.Key.SPACE).perform();

		InputUtils.waitForElementToBeHidden( LoadingOverlaySelector );

		expect( element(by.id("info-item-title-0")).getText() ).toBe( testTitle );

		expect( element(by.id("info-item-body-0")).getText() ).toBe( testBody );
	});


	it("can create a new info entry", function()
	{
		var testTitle = "Test Title_" + new Date().getTime();
		var testBody = "Testing the body_" + new Date().getTime();

		InputUtils.clearAndSendKeys(by.id("AddInfoItemTitleTextBox"), testTitle);

		InputUtils.clearAndSendKeys(by.id("editor"), testBody);
		
		element( by.id("AddNewInfoButton") ).click();

		InputUtils.waitForElementToBeHidden( LoadingOverlaySelector );

		expect( element(by.id("info-item-title-0")).getText() ).toBe( testTitle );

		expect( element(by.id("info-item-body-0")).getText() ).toBe( testBody );
	});


 	it("can edit an info entry", function()
	{
		var newTitle = "NewGreatTitle_" + new Date().getTime();

		element( by.id("info-item-edit-0-button") ).click();

		InputUtils.clearAndSendKeys(by.id("AddInfoItemTitleTextBox"), newTitle);

		element( by.id("AddNewInfoButton") ).click();
		InputUtils.waitForElementToBeHidden( LoadingOverlaySelector );

		expect( element(by.id("info-item-title-0")).getText() ).toBe( newTitle );
	});



 	it("removes the test info entry", function()
	{
		BuildingInfoPage.deleteInfoItem( 0 );

		expect( element( by.id("info-item-body-0") ).isPresent() ).not.toBeTruthy();
	});
});