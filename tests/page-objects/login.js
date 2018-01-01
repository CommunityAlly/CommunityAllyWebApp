InputUtil = require( "../input-utils.js" );


function LoginPage()
{

}

LoginPage.login = function( password )
{
	password = password || browser.params.login.password;

	browser.get('#!/Login');

	InputUtil.waitForElementToBePresent( by.id('login-email-textbox') );

	element(By.id('login-email-textbox')).sendKeys(browser.params.login.user);
	browser.sleep(150);
	element(By.id('login-password-textbox')).sendKeys(password);
	browser.sleep(150);
	element(By.id('login-button')).click();
	
	InputUtil.waitForElementToBePresent( by.cssContainingText("h3","Send E-mail") );
}


LoginPage.logout = function()
{
	element(by.id("log-out-button")).click();

	// Protractor was crashing frequently until I added this line. My theory is that Selenium did not like
	// starting a new test while a page was loading. This line here lets the browser to finish loading
	// before starting another test.
	InputUtils.waitForElementToBePresent( by.id("login-email-textbox") );
};

module.exports = LoginPage;