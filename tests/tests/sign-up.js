LoginPage = require( "../page-objects/login.js" );
ManageResidentsPage = require( "../page-objects/manage-residents.js" );
BuildingInfoPage = require( "../page-objects/building-info.js" );
InputUtils = require( "../input-utils.js" );

// spec.js
describe('The association sign-up page', function()
{
	var LoadingOverlaySelector = by.xpath("//div[contains(@class, 'loading-overlay')][@data-ng-show='isLoading']");
	var SettingsLoadingOverlaySelector = by.xpath("//div[contains(@class, 'loading-overlay')][@data-ng-show='vm.isLoading']");
	
	var User_FirstName = "PrezFirst";
	var User_LastName = "PrezLast";
	var User_Email = "president@mycondoally.com";

	// Both these users already exist in the system. No matter what we put for the name, it will use
	// the users current profile name, so let's match those values
	var TestResident_FirstName = "test";
	var TestResident_LastName = "test";
	var TestResident_Email = "test@great.com";


	xit("get to the sign-up page", function()
	{
		LoginPage.login();
		browser.ignoreSynchronization = true;

		browser.setLocation('/SignUp');
		InputUtils.waitForElementToBePresent( by.id("big-ol-sign-up-button") );
		element(by.id("big-ol-sign-up-button")).click();

		InputUtils.waitForElementToBePresent( by.id("AssociationAddressTextBox") );
	});


	it("will enter the street address for the association", function()
	{
		LoginPage.login();
		
		//browser.get('/api/Public/t/SignUpWizard.aspx');
		//browser.get('/Public/index.html');
		browser.setLocation('/SignUp');
		browser.sleep( 3000 );

		//InputUtils.clearAndSendKeys( by.id("AssociationAddressTextBox"), "405 West Lawrence Ave, Chicago IL 60640" );
		element(by.id("building-0-address-text-box")).click().sendKeys("405 West Lawrence Ave, Chicago IL 60640");
		browser.sleep( 500 );
		element(by.id("building-0-address-text-box")).sendKeys(protractor.Key.TAB);
		browser.sleep( 1500 );

		// The address updates shortly after typing
		InputUtils.waitForElementToBeHidden( by.id("map-loading-overlay"), 30 * 1000 );

		//InputUtils.waitForElementToHaveText( by.id("association-name-text-box"), "405 W Lawrence Ave Condo Association" );
		expect( InputUtils.getValue(by.id("association-name-text-box") ) ).toBe("405 W Lawrence Ave Condo Association");

		//expect( element(by.id("association-name-text-box") ).getText() ).toBe("405 W Lawrence Ave Condo Association");
		//expect( element(by.id("GeocodeResultPanel") ).getText() ).toBe("Formatted Address: 405 West Lawrence Avenue, Chicago, IL 60640");
		
		element(by.id("next-button-0")).click();
	});


	it("set the number of units in the association", function()
	{
		InputUtils.waitForElementToBePresent( by.model("vm.numUnits") );

		// Sleeps are needed to allow the control JS to run
		// element(by.id("NumUnitsTextBox")).click();
		// browser.sleep( 150 );
		// element(by.id("NumUnitsTextBox")).sendKeys(protractor.Key.chord(protractor.Key.CONTROL, "a"));
		// browser.sleep( 150 );
		// element(by.id("NumUnitsTextBox")).sendKeys("3");

		element(by.model("vm.numUnits")).clear().sendKeys("4");
		InputUtils.waitForElementToBePresent( by.id("unit-name-textbox-3") );

		element(by.id("unit-name-type-EW")).click();
		
		expect( InputUtils.getValue(by.id("unit-name-textbox-0") ) ).toBe("1E");
		expect( InputUtils.getValue(by.id("unit-name-textbox-1") ) ).toBe("1W");
		expect( InputUtils.getValue(by.id("unit-name-textbox-2") ) ).toBe("2E");
		expect( element(by.id("unit-name-textbox-3") ).isPresent() ).toBeTruthy();		
		expect( InputUtils.getValue(by.id("unit-name-textbox-3") ) ).toBe("2W");
		
		element(by.id("next-button-1")).click();
	});

	
	it("can enter the user information", function()
	{
		InputUtils.clearAndSendKeys( by.model("vm.signUpInfo.signerUpInfo.firstName"), User_FirstName );
		InputUtils.clearAndSendKeys( by.model("vm.signUpInfo.signerUpInfo.lastName"), User_LastName );
		InputUtils.clearAndSendKeys( by.model("vm.signUpInfo.signerUpInfo.email"), User_Email );
		element(by.css("#signer-up-unit-select option[value='string:1']")).click();
		element(by.css("#signer-up-board-select option[value='8']")).click();
		
		expect( element(by.css("#signer-up-unit-select option:checked") ).getText() ).toBe("1W");
		expect( element(by.css("#signer-up-board-select option:checked") ).getText() ).toBe("Director");

		element(by.id("finish-button")).click();
	});


	xit("can enter a fellow resident", function()
	{
		InputUtils.clearAndSendKeys( by.id("ResidentInfoGridRow_2_Resident0_FirstName"), TestResident_FirstName );
		InputUtils.clearAndSendKeys( by.id("ResidentInfoGridRow_2_Resident0_LastName"), TestResident_LastName );
		InputUtils.clearAndSendKeys( by.id("ResidentInfoGridRow_2_Resident0_Email"), TestResident_Email );
	});


	it("submits and gets redirected to the new site", function()
	{
		//InputUtils.waitForElementToBeHidden( LoadingOverlaySelector, 60 * 1000 );

		InputUtils.waitForElementToBePresent( by.id("login-email-textbox"), 60 * 1000 );
	});


	it("can login to the new site", function()
	{
		element(By.id('login-email-textbox')).sendKeys(browser.params.login.user);
		element(By.id('login-password-textbox')).sendKeys(browser.params.login.password);
		element(By.id('login-button')).click();

		InputUtil.waitForElementToBePresent( By.id("local-news-header") );
	});

/*
	it("verifies the auto-created folders exist", function()
	{
		browser.setLocation('BuildingInfo');
		BuildingInfoPage.waitForDocumentsToLoad();

		expect( element(by.id("directory-name-0")).getText() ).toBe("Budgets");
		expect( element(by.id("directory-name-1")).getText() ).toBe("Governing Documents");
		expect( element(by.id("directory-name-2")).getText() ).toBe("Insurance");
		expect( element(by.id("directory-name-3")).getText() ).toBe("Meeting Minutes");
	});


	it("verifies our neighbor exists in thie building", function()
	{
		browser.setLocation('BuildingResidents');

		InputUtils.waitForElementToBeHidden( LoadingOverlaySelector );

		expect( element(by.id("owner-name-1-0")).getText() ).toBe( User_FirstName + " " + User_LastName );
		expect( element(by.id("owner-email-1-0")).getText() ).toBe( User_Email );

		expect( element(by.id("owner-name-2-0")).getText() ).toBe( "test test" );
		expect( element(by.id("owner-email-2-0")).getText() ).toBe( TestResident_Email );
	});


	it("verifies the user is presented with the assessment questionnaire", function()
	{
		browser.setLocation('ManagePayments');

		InputUtils.waitForElementToBeHidden( LoadingOverlaySelector );

		expect( element( by.id("periodic-payment-does-collect") ).isPresent() ).toBe( true );		
	});
*/

	it("deletes the site", function()
	{
		browser.setLocation('Settings');

		InputUtils.waitForElementToBePresent( by.id("qa-delete-site-button") );

		InputUtils.waitForElementToBeHidden( SettingsLoadingOverlaySelector );

		element( by.id("qa-delete-site-button") ).click();

		InputUtils.waitForUrlToChangeTo( "https://login.condoally.com/#!/Login" );

		//InputUtils.waitForElementToBePresent( by.id("big-ol-sign-up-button"), 15000 );
	});

});