LoginPage = require( "../page-objects/login.js" );
ManageResidentsPage = require( "../page-objects/manage-residents.js" );
BuildingInfoPage = require( "../page-objects/building-info.js" );
InputUtils = require( "../input-utils.js" );

// spec.js
describe("The poll management page", function()
{
	var TestPollQuestion = "TestPoll_" + new Date().getTime();
	var LoadingOverlaySelector = by.xpath("//div[contains(@class, 'loading-overlay')][@data-ng-show='isLoading']");
	var NewTestAnswer3 = "This is the new answer 3";

	beforeEach(function()
	{
		LoginPage.login();
		//browser.get('#!/ManagePolls');
		browser.setLocation('/ManagePolls');
		expect( element(by.id("poll-table")).isPresent() ).toBeTruthy();
	});


	afterEach(function()
	{
		LoginPage.logout();
	});


	it("will clear existing polls", function()
	{
		var deleteFirst = function()
		{
			element( by.id("delete-poll-0") ).isPresent().then( function( isPresent )
			{
				if( isPresent )
				{
					element(by.id("delete-poll-0")).click();
					InputUtils.waitForElementToBeHidden( LoadingOverlaySelector );
					deleteFirst();
				}
			} );
		};

		deleteFirst();
	});


	it("can create a new poll", function()
	{
		var TestAnswer3 = "TestAnswer3";

		expect( element(by.id("delete-poll-0")).isPresent() ).not.toBeTruthy();

		// Find it on the home page
		InputUtils.clearAndSendKeys(by.id("poll-question-textbox"), TestPollQuestion);
		
		element(by.id("add-poll-answer-button")).click();

		InputUtils.clearAndSendKeys(by.css("input#poll-answer-textbox-2"), TestAnswer3);
		//element(by.css("input#poll-answer-textbox-2")).sendKeys(TestAnswer3);

		element(by.id("poll-submit")).click();

		InputUtils.waitForElementToBeHidden( LoadingOverlaySelector );
		
		browser.get('#!/Home');

		InputUtil.waitForElementToBePresent( by.id('poll-answer-text-0-0') );

		// Find the poll on the home page
		expect( element(by.cssContainingText("p",TestPollQuestion) ).isPresent() ).toBeTruthy();

		element(by.id("poll-answer-text-0-2")).getText().then( function( answerText )
		{
			expect( answerText.trim() ).toBe( TestAnswer3 );
		} );

		element(by.id("poll-answer-text-0-3")).getText().then( function( answerText )
		{
			expect( answerText.trim() ).toBe( "Abstain" );
		} );
	});


 	it("can edit a poll", function()
	{
		element(by.id("edit-poll-0")).click();

		InputUtils.clearAndSendKeys(by.css("input#poll-answer-textbox-2"), NewTestAnswer3);

		element(by.id("poll-submit")).click();

		InputUtils.waitForElementToBeHidden( LoadingOverlaySelector );

		browser.get('#!/Home');

		InputUtil.waitForElementToBePresent( by.id('poll-answer-text-0-0') );

		element(by.id("poll-answer-text-0-2")).getText().then( function( answerText )
		{
			expect( answerText.trim() ).toBe( NewTestAnswer3 );
		} );
	});


 	it("can vote on a poll and not yet view the results", function()
	{
		browser.get('#!/Home');

		InputUtil.waitForElementToBePresent( by.id('poll-answer-text-0-2') );

		element(by.id("poll-answer-text-0-2")).click();

		InputUtil.waitForElementToBePresent( by.id('change-vote-button') );

		expect( element(by.id("selected-vote-text")).getText() ).toBe( NewTestAnswer3 );
	});


	it("can change a poll vote", function()
	{
		browser.get('#!/Home');

		InputUtil.waitForElementToBePresent( by.id('change-vote-button') );

		element(by.id("change-vote-button")).click();

		InputUtil.waitForElementToBePresent( by.id('poll-answer-text-0-0') );

		element(by.id("poll-answer-text-0-0")).click();

		expect( element(by.id("selected-vote-text")).getText() ).toBe( "Yes" );
	});


 	//TODO Should this fail actually? We can't edit a poll once a vote is cast.
 	xit("can change the expiration date on a poll so we can view the results", function()
	{
	});


	it("can delete a poll", function()
	{
		element(by.id("delete-poll-0")).click();

		InputUtils.waitForElementToBeHidden( LoadingOverlaySelector );

		expect( element( by.id("delete-poll-0") ).isPresent() ).not.toBeTruthy();
	});
});