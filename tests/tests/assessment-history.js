LoginPage = require( "../page-objects/login.js" );
InputUtils = require( "../input-utils.js" );

// spec.js
describe('The assessment history', function()
{
	var TestAmountName = 123.5;
	var LoadingOverlaySelector = by.xpath("//div[contains(@class, 'loading-overlay')][@data-ng-show='$ctrl.isLoading']");

	beforeEach(function()
	{
		//browser.ignoreSynchronization = true;
		LoginPage.login();

		//browser.get('#/AssessmentHistory');
		browser.setLocation('/AssessmentHistory');
		expect( element(by.id("assessment-table")).isPresent() ).toBeTruthy();
		InputUtils.waitForElementToBeHidden( LoadingOverlaySelector );
		
		//browser.setLocation('/AssessmentHistory');
	});


	afterEach(function()
	{
		LoginPage.logout();
	});
	

	it("can create a payment entry", function()
	{
		element(by.id("pay-cell-0-0")).click();
		
		element(by.id("is-paid-checkbox")).getAttribute('checked').then(function(isChecked)
		{
			// Ensure the check box is checked
			if( !isChecked )
				element(by.id("is-paid-checkbox")).click();

			element(by.id("save-edit-button")).click();
			
			// Wait for the dialog to close
			// browser.wait(function()
			// {
			//   return $('#edit-payment-container').isDisplayed().then(function(result){return !result});
			// }, 10000);
			InputUtils.waitForElementToBeHidden( by.id("edit-payment-container") );

			expect(element(by.id("pay-cell-0-0")).element(by.tagName("img")).isDisplayed()).toBe(true);
		});
		
	});


	it("can edit a payment entry", function()
	{
		var testAmount = Math.floor( Math.random() * 1000 ).toString();
		var testCheckNumber = Math.floor( Math.random() * 1000 ).toString();
		var testDate = "08/20/2014";
		var testNotes = (Math.random() * 100000).toString();

		element(by.id("pay-cell-0-0")).click();

		// Set properties
		InputUtils.clearAndSendKeys( by.id("paid-amount-textbox"), testAmount);
		InputUtils.clearAndSendKeys( by.model("$ctrl.editPayment.payment.checkNumber"), testCheckNumber);
		//InputUtils.clearAndSendKeys( by.model("editPayment.payment.payerUserId"), testCheckNumber);
		InputUtils.clearAndSendKeys( by.model("$ctrl.editPayment.payment.paymentDate"), testDate);
		
		// Close the date picker
		element(by.model("$ctrl.editPayment.payment.paymentDate")).sendKeys(protractor.Key.ESCAPE);

		InputUtils.clearAndSendKeys( by.model("$ctrl.editPayment.payment.notes"), testNotes);

		// Hit save
		browser.sleep(500);
		element(by.id("save-edit-button")).click();
		//browser.sleep(500);

		// Wait for the dialog to close
		InputUtils.waitForElementToBeHidden( by.id('edit-payment-container') );
		// browser.wait(function()
		// {
		//   return $('#edit-payment-container').isDisplayed().then(function(result){return !result});
		// }, 10000);

		// Refresh the page
		browser.navigate().refresh();
		//browser.sleep(500);

		expect( element(by.id("assessment-table")).isPresent() ).toBeTruthy();

		// Test properties
		element(by.id("pay-cell-0-0")).click();

		expect( InputUtils.getValue(by.id("paid-amount-textbox")) ).toBe(testAmount);
		expect( InputUtils.getValue(by.model("$ctrl.editPayment.payment.checkNumber")) ).toBe(testCheckNumber);
		expect( InputUtils.getValue(by.model("$ctrl.editPayment.payment.paymentDate")) ).toBe(testDate);
		expect( InputUtils.getValue(by.model("$ctrl.editPayment.payment.notes")) ).toBe(testNotes);

		element(by.id("cancel-edit-button")).click();
	});


	it("can remove a payment entry", function()
	{
		element(by.id("pay-cell-0-0")).click();
		
		element(by.id("is-paid-checkbox")).click();

		element(by.id("save-edit-button")).click();

		// Wait for the dialog to close
		browser.wait(function()
		{
		  return $('#edit-payment-container').isDisplayed().then(function(result){return !result});
		}, 10000);

		expect(element(by.id("pay-cell-0-0")).element(by.tagName("img")).isDisplayed()).toBe(false);
	});
});