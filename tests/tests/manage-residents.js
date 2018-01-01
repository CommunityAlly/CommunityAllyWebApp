LoginPage = require( "../page-objects/login.js" );
ManageResidentsPage = require( "../page-objects/manage-residents.js" );
BuildingInfoPage = require( "../page-objects/building-info.js" );
InputUtils = require( "../input-utils.js" );

// spec.js
describe('The manage residents page', function()
{
	var TestEmail = "testres1@mycondoally.com";
	var TestFirst = "TestRes1First";
	var TestLast = "TestRes1Last";

	beforeEach(function()
	{
		LoginPage.login();
		
		// Go to the manage residents page (Could use setLocation(), but get() doesn't wait for the local news to load)
		//browser.get('#/ManageResidents');
		browser.setLocation('/ManageResidents');

		// Wait for the loading to stop
		//InputUtils.waitForElementToBeHidden( by.xpath('//div[data-ng-show="isLoading"]') );
		InputUtils.waitForElementToBeHidden( by.css("[data-ng-show='$ctrl.isLoading']") );

		expect( element(by.css("div[data-ui-grid='$ctrl.residentGridOptions']")).isPresent() ).toBeTruthy();
	});

	var afterCount = 0;

	afterEach(function()
	{
		// Log out fails for some reason if we don't wait a bit
		//browser.sleep(750);
		// console.log("In afterEach " + ++afterCount);
		LoginPage.logout();
	});


	var deleteUserWithExpectTest = function(email)
	{
		ManageResidentsPage.deleteUserNoPromise( email );

		var doesUserExist = ManageResidentsPage.doesUserExist( email );

		expect(doesUserExist).toBe(false);
	};


	xit("The manage residents page", function()
	{
		// var testFind = element(by.cssContainingText('.resident-cell-email .ngCellText', 'test@great.com'));
		
		// var info = {};

		// var promises = [
		// 	testFind.isPresent().then( function( isPresent ){ info.isPresent = isPresent; } ),
		// 	testFind.getAttribute("id").then( function( id ){ info.id = id; } ),
		// 	testFind.getText().then( function( text ){ info.text = text; } )
		// ];

		// protractor.promise.all(promises).then(function()
		// 	{
		// 		//console.log( "Found: " + testFind + ", isPresent: " + info.isPresent + ", id: " + info.id + ", text: " + info.text );

		// 		expect(info).not.toBe(null);
		// 	});

		var userInfo = ManageResidentsPage.findUserRowByEmail_Css_NoPromise( "president@mycondoally.com" );
		userInfo = ManageResidentsPage.findUserRowByEmail_Css_NoPromise( "prasdf" );
		userInfo = ManageResidentsPage.findUserRowByEmail_Css_NoPromise( "president@mycondoally.com" );

		userInfo = ManageResidentsPage.findUserRowByEmail_Css_NoPromise( "president@mycondoally.com" );
		expect( userInfo.firstName ).toBe( "PrezFirst" );
		expect( userInfo.lastName ).toBe( "PrezLast" );


		// ManageResidentsPage.findUserRowByEmail_Css_Promise( "test@great.com" ).then(function(userInfo)
		// {
		// 	expect(true).toEqual(false);
		// },function(errorMsg)
		// {
		// 	// The user should not exist
		// 	expect(true).toEqual(true);
		// });

		// var testFind22 = element.all(by.css('.resident-cell-email')).then(function(emailCells)
		// 	{
		// 		console.log("Found " + emailCells.length + " resident-cell-email cells");
		// 	});

		// var testFind23 = element.all(by.css('.ngCellText')).then(function(emailCells)
		// 	{
		// 		console.log("Found " + emailCells.length + " ngCellText cells");
		// 	});

		// var testFind24 = element.all(by.css('.resident-cell-email.ngCellText')).then(function(emailCells)
		// 	{
		// 		console.log("Found " + emailCells.length + " .resident-cell-email.ngCellText cells");
		// 	});

		// var testFind24 = element.all(by.css('.resident-cell-email.ngCellText')).then(function(emailCells)
		// 	{
		// 		console.log("Found " + emailCells.length + " .resident-cell-email.ngCellText cells");

		// 		for( var cellIndex = 0; cellIndex < emailCells.length; ++cellIndex )
		// 		{
		// 			var cellElement = emailCells[cellIndex];

		// 			cellElement.element(by.xpath("../../..")).element(by.css(".resident-cell-last.ngCellText")).then(function(parentRow)
		// 			{
		// 				parentRow.getText().then(function(text){console.log("Found last name: " + text); } );
		// 			} );
		// 		}
		// 	});


		// var testFind2 = element(by.css('.resident-cell-email')).all(by.css('.ngCellText')).then(function(emailCells)
		// 	{
		// 		console.log("Found " + emailCells.length + " e-mail cells");
		// 	});

	});

	it("tries to delete the test user before starting", function()
	{
		ManageResidentsPage.doesUserExist( TestEmail ).then( function( doesExist )
		{
			if( doesExist )
				deleteUserWithExpectTest( TestEmail );

			// console.log("End of test 1");
		});
	});


	it("can create a resident for testing", function()
	{
		var buttonLocator = by.buttonText("Add New Resident");
		element(buttonLocator).click();

		ManageResidentsPage.setUserDetails( TestFirst, TestLast, TestEmail );

		element(by.id("save-edit-button")).click();

		InputUtils.waitForElementToBeHidden( by.id("EditUserContainer") );
		
		expect( ManageResidentsPage.doesUserExist( TestEmail ) ).toEqual( true );

		// console.log("End of test 2");
		// ManageResidentsPage.findUserRowByEmail_Css_Promise( TestEmail ).then(function(userInfo)
		// {
		// 	// The user should exist
		// 	expect(true).toEqual(true);
		// },function(errorMsg)
		// {
		// 	expect(true).toEqual(false);
		// });
		//expect( element(by.model("editUser.email")).getAttribute('value') ).toBe( TestEmail );
	});


 	xit("can edit a resident's first name", function()
	{
		var ModifiedFirstName = "MyNewFirstName";

		// Verify our user is there
		var userInfo = ManageResidentsPage.findUserRowByEmail_Css_Promise( TestEmail ).then(function(userInfo)
		{
			//expect(userInfo.name).toBe("TestRes1First TestRes1Last");

			return userInfo.edit();
		})
		.then(function()
		{
			// Find the e-mail address text box
			expect( element(by.id("edit-user-email-text-box")).getAttribute('value') ).toBe( TestEmail );

			var firstNameTextBox = element(by.id("edit-user-first-text-box"));
			firstNameTextBox.clear();
			return firstNameTextBox.sendKeys( ModifiedFirstName );
		})
		.then(function()
		{
			return element(by.id("save-edit-button")).click();
		})
		.then(function()
		{
			// Sort by unit
			return element(by.cssContainingText('.ui-grid-header-cell-label', 'Unit')).click();
		})
		.then(function(userInfo)
		{
			//browser.sleep(2500);
			return ManageResidentsPage.findUserRowByEmail_Css_Promise( TestEmail )
		})
		.then(function(userInfo)
		{
			var compareFullName = ModifiedFirstName + " " + TestLast;
			expect( userInfo.name ).toBe( compareFullName );
		});
	});


	it("can edit a resident's first name without crazy promises", function()
	{
		var ModifiedFirstName = "MyNewFirstName";

		// Verify our user is there
		var userInfo = ManageResidentsPage.findUserRowByEmail_Css_NoPromise( TestEmail );
		userInfo.edit();

		// Find the e-mail address text box
		expect( element(by.id("edit-user-email-text-box")).getAttribute('value') ).toBe( TestEmail );

		var firstNameTextBox = element(by.id("edit-user-first-text-box"));
		firstNameTextBox.clear();
		firstNameTextBox.sendKeys( ModifiedFirstName );

		element(by.id("save-edit-button")).click();

		InputUtils.waitForElementToBeHidden( by.id("EditUserContainer") );

		// Sort by unit
		//element(by.cssContainingText('.ngHeaderText', 'Unit')).click();

		//browser.sleep(2500);
		userInfo = ManageResidentsPage.findUserRowByEmail_Css_NoPromise( TestEmail );

		expect( userInfo.firstName ).toBe( ModifiedFirstName );
		expect( userInfo.lastName ).toBe( TestLast );

		// console.log("End of test 3");
	});


	it("cleans up the test user", function()
	{
		expect( ManageResidentsPage.doesUserExist(TestEmail) ).toBe( true );

		deleteUserWithExpectTest( TestEmail );

		expect( ManageResidentsPage.doesUserExist(TestEmail) ).toBe( false );

		// console.log("End of test 4");
	});
});