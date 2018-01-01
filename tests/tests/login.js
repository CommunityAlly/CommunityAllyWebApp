LoginPage = require( "../page-objects/login.js" );
ManageResidentsPage = require( "../page-objects/manage-residents.js" );
BuildingInfoPage = require( "../page-objects/building-info.js" );
InputUtils = require( "../input-utils.js" );

// spec.js
describe('The login page', function()
{
	var ResetPasswordValue = "2asdfASDF2";


	beforeEach(function()
	{
		browser.get('#!/Login');
	});


	it("fails to login when you don't provide any information", function()
	{
		expect( element(by.id("error-label")).getText() ).toBe( "" );

		element(by.id("login-button")).click();

		expect( element(by.id("error-label")).isDisplayed() ).toBe( true );
	});


	it("fails to login when you don't provide a password", function()
	{
		expect( element(by.id("error-label")).getText() ).toBe( "" );

		InputUtils.clearAndSendKeys(by.id("login-email-textbox"), browser.params.login.user);

		element(by.id("login-button")).click();

		expect( element(by.id("error-label")).getText() ).toBe( "Failed to log in: Please enter a password" );
	});


	it("fails to login when providing an incorrect password", function()
	{
		expect( element(by.id("error-label")).getText() ).toBe( "" );

		InputUtils.clearAndSendKeys(by.id("login-email-textbox"), browser.params.login.user);

		InputUtils.clearAndSendKeys(by.id("login-password-textbox"), "not_the_password");		

		element(by.id("login-button")).click();

		expect( element(by.id("error-label")).getText() ).toBe( "Failed to log in: Incorrect password" );
	});


	it("fails to reset the password for an unknown user", function()
	{
		// Reset for president@mycondoally.com should always reset to known value
		element(by.id("login-reset-password")).click();
		
		InputUtils.clearAndSendKeys(by.id("login-email-textbox"), "not_an_email_address");

		element(by.id("submit-button")).click();

		expect( element(by.id("error-label")).getText() ).toBe( "Failed to process your request: Unknown e-mail address" );
	});


	it("can login with proper information", function()
	{
		LoginPage.login();

		InputUtils.waitForElementToBePresent( by.cssContainingText("h3","Local News") );

		LoginPage.logout();

		expect( element(by.id("login-button")).isDisplayed() ).toBe( true );
	});


	it("can reset password", function()
	{
		// Reset for president@mycondoally.com should always reset to known value
		element(by.id("login-reset-password")).click();
		
		InputUtils.clearAndSendKeys(by.id("login-email-textbox"), browser.params.login.user);

		element(by.id("submit-button")).click();

		expect( element(by.id("error-label")).getText() ).toBe( "Please check your e-mail for updated login information." );		
	});


	it("fails to login with the pre-reset password", function()
	{
		InputUtils.clearAndSendKeys(by.id("login-email-textbox"), browser.params.login.user);

		InputUtils.clearAndSendKeys(by.id("login-password-textbox"), browser.params.login.password);

		element(by.id("login-button")).click();

		expect( element(by.id("error-label")).getText() ).toBe( "Failed to log in: Incorrect password" );
	});


	it("can properly login with the new reset password", function()
	{
		LoginPage.login( ResetPasswordValue );

		InputUtils.waitForElementToBePresent( by.cssContainingText("h3","Local News") );

		LoginPage.logout();

		expect( element(by.id("login-button")).isDisplayed() ).toBe( true );
	});


	it("can change the password back to the original known password", function()
	{
		// Log in
		LoginPage.login( ResetPasswordValue );
		//LoginPage.login();

		// Go to profile
		element(by.id("my-profile-link")).click();
		
		InputUtils.waitForElementToBePresent( by.id("passwordTextBox") );
		
		InputUtils.clearAndSendKeys(by.id("passwordTextBox"), browser.params.login.password);

		element(by.id("save-profile-button")).click();
		
		expect( element(by.id("profile-error-label")).getText() ).toBe( "Your changes have been saved." );
		
		LoginPage.logout();
	});


	it("can login after resetting the password to the original value", function()
	{
		LoginPage.login();

		InputUtils.waitForElementToBePresent( by.cssContainingText("h3","Local News") );

		LoginPage.logout();

		expect( element(by.id("login-button")).isDisplayed() ).toBe( true );
	});
});