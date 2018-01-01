LoginPage = require( "./page-objects/login.js" );
ManageResidentsPage = require( "./page-objects/manage-residents.js" );
BuildingInfoPage = require( "./page-objects/building-info.js" );

// spec.js
describe('Views the residents', function()
{
	beforeEach(function()
	{
		LoginPage.login();
		browser.sleep(250);
	});


 	it("visits the edit resident modal", function()
	{
		// Go to the manage residents page (Could use setLocation(), but get() doesn't wait for the local news to load)
		browser.get('#/ManageResidents');

		// Verify our user is there
		var userInfo = ManageResidentsPage.findUserRowByEmail_Promise("testres1@mycondoally.com").then(function(userInfo)
		{
			expect(userInfo.name.trim()).toBe("TestRes1First TestRes1Last");

			userInfo.edit();

			// Find the e-mail address text box
			expect( element(by.model("editUser.email")).getAttribute('value') ).toBe( "testres1@mycondoally.com" );
		});
	});


	it("can started editing an info item", function()
	{
		browser.get('#/BuildingInfo');

		// Click on the first info item
		var infoItem = BuildingInfoPage.getInfoItemData( 0 );
		infoItem.edit();

		// Verify the title text box has the first info item's title
		expect( element(by.id("AddInfoItemTitleTextBox")).getAttribute('value') ).toBe( infoItem.title );
	});
});