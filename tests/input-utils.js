var InputUtils = {

	WaitForElement: 7 * 1000,


	clickAndWait: function(selector, waitMilliseconds)
	{
		if (waitMilliseconds == null)
			waitMilliseconds = 1000;

		element(selector).click();
		return browser.sleep(waitMilliseconds);
	},

	
	getValue: function(locator) {
		return element(locator).getAttribute('value');
	},


	clearAndSendKeys: function( locator, keys )
	{
		var el = element(locator);
		el.clear();
		el.sendKeys( keys );
	},


	waitForElementToBeHidden: function( selector, timeout )
	{
		timeout = timeout || InputUtils.WaitForElement;

		// Wait until a condition is true, in this case that an element is not displayed
		browser.wait(function()
		{
		  return element( selector ).isDisplayed().then(function(result){return !result});
		}, timeout);
	},


	waitForElementToBePresent: function( selector, timeout )
	{
		timeout = timeout || InputUtils.WaitForElement;

		// Wait until a condition is true in this case that an element is present
		browser.wait(function()
		{
		  return element( selector ).isPresent().then(function(result){return result;});
		}, timeout);
	},


	waitForElementToHaveText: function( selector, expectedText, timeout )
	{
		timeout = timeout || InputUtils.WaitForElement;

		// Wait until a condition is true, in this case that an element has certain text
		browser.wait(function()
		{
		  return element( selector ).getText().then(function(text){return text === expectedText;});
		}, timeout);
	},

	waitForUrlToChangeTo: function( expectedUrl, timeout )
	{
		timeout = timeout || InputUtils.WaitForElement;

		browser.wait(function()
		{
		  return browser.getCurrentUrl().then(function(url){return url === expectedUrl;});
		}, timeout);
	}
};


module.exports = InputUtils;