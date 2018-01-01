InputUtils = require( "../input-utils.js" );

function ManageResidentsPage()
{

}

ManageResidentsPage.COLINDEX_FirstName = 0;
ManageResidentsPage.COLINDEX_Email = 2;
ManageResidentsPage.COLINDEX_Unit = 3;


///////////////////////////////////////////////////////////////////////////////////////////////////
// Get the information for a row in the user table
///////////////////////////////////////////////////////////////////////////////////////////////////
ManageResidentsPage.rowToObject_Columns = function(userColumns)
{
	var userInfo = {
		name: "",
		email: "",
		unit: "",
		nameElement: userColumns[ManageResidentsPage.COLINDEX_FirstName],
		edit: function()
		{
			return this.nameElement.click();
		}
	};

	var promises = [
		userColumns[ManageResidentsPage.COLINDEX_FirstName].getText().then(function(value){ userInfo.name = value.trim(); console.log("Found user, name: " + userInfo.name); }),
		userColumns[ManageResidentsPage.COLINDEX_Email].getText().then(function(value){userInfo.email = value.trim();}),
		userColumns[ManageResidentsPage.COLINDEX_Unit].getText().then(function(value){userInfo.unit = value.trim();})
	];

	return protractor.promise.all(promises).then(function(){return userInfo;});
};


///////////////////////////////////////////////////////////////////////////////////////////////////
// Get the information for a row in the user table
///////////////////////////////////////////////////////////////////////////////////////////////////
ManageResidentsPage.rowToObject_Cell = function(emailCell, email)
{
	var userInfo = {
		name: "",
		email: email,
		unit: "",
		emailElement: emailCell,
		edit: function()
		{
			return this.emailElement.click();
		}
	};

	var promises = [];
	// var infoCellSelector = emailCell.element(by.xpath("../../..")).element(by.css(".resident-cell-last .ui-grid-cell-contents")).then(function(infoCell)
	// {
	// 	return infoCell.getText().then(function(text){ userInfo.lastName = text; } );
	// } );
	// promises.push( infoCellSelector );

	// var firstLastSelector = emailCell.element(by.xpath("../../..")).element(by.css(".resident-cell-first .ui-grid-cell-contents")).then(function(infoCell)
	// {
	// 	return infoCell.getText().then(function(text){ userInfo.firstName = text; } );
	// } );
	// promises.push( firstLastSelector );

	// var unitCellSelector = emailCell.element(by.xpath("../../..")).element(by.css(".resident-cell-unit .ui-grid-cell-contents")).then(function(infoCell)
	// {
	// 	return infoCell.getText().then(function(text){ userInfo.unit = text; } );
	// } );
	// promises.push( unitCellSelector );

	var infoCellSelector = emailCell.element(by.xpath("../../..")).element(by.css(".resident-cell-last .ui-grid-cell-contents")).getText().then(function(text)
	{
		return userInfo.lastName = text;
	} );
	promises.push( infoCellSelector );

	var firstLastSelector = emailCell.element(by.xpath("../../..")).element(by.css(".resident-cell-first .ui-grid-cell-contents")).getText().then(function(text)
	{
		return userInfo.firstName = text;
	} );
	promises.push( firstLastSelector );

	var unitCellSelector = emailCell.element(by.xpath("../../..")).element(by.css(".resident-cell-unit .ui-grid-cell-contents")).getText().then(function(text)
	{
		return userInfo.unit = text;
	} );
	promises.push( unitCellSelector );


	return protractor.promise.all(promises).then(function()
	{
		userInfo.name = userInfo.firstName + " " + userInfo.lastName;
		//console.log( "Found full user from table: " + userInfo.name );
		return userInfo;
	});
};


///////////////////////////////////////////////////////////////////////////////////////////////////
// Get the information for a row in the user table
///////////////////////////////////////////////////////////////////////////////////////////////////
ManageResidentsPage.rowToObject_Cell_NoPromise = function(emailCell, email)
{
	//console.log( "In rowToObject_Cell_NoPromise");

	var userInfo = {
		firstName: "",
		lastName: "",
		email: email,
		unit: "",
		emailElement: emailCell,
		edit: function()
		{
			return this.emailElement.click();
		}
	};

	var parentElement = emailCell.element(by.xpath("../../.."));

	userInfo.firstName = parentElement.element(by.css(".resident-cell-first .ui-grid-cell-contents")).getText();
	userInfo.lastName = parentElement.element(by.css(".resident-cell-last .ui-grid-cell-contents")).getText();

	//console.log( "Found name: " + userInfo.firstName);

	userInfo.unit = parentElement.element(by.css(".resident-cell-unit .ui-grid-cell-contents")).getText();

	//console.log( "Found unit: " + userInfo.unit);

	return userInfo;
};


///////////////////////////////////////////////////////////////////////////////////////////////////
// Delete a user if they exist
///////////////////////////////////////////////////////////////////////////////////////////////////
ManageResidentsPage.deleteUser = function(emailAddress)
{
	return ManageResidentsPage.findUserRowByEmail_Css_Promise( emailAddress ).then( function(userInfo)
	{
		if( userInfo === null )
			return null;

		//console.log("Going to edit user to delete"); 
		userInfo.edit();

		//console.log("Deleting user"); 
		element(by.id("remove-resident-button")).click();

		var alertDialog = protractor.getInstance().switchTo().alert();
    	return alertDialog.accept();
	}, function()
	{
		return null;
	});
};


///////////////////////////////////////////////////////////////////////////////////////////////////
// Delete a user if they exist
///////////////////////////////////////////////////////////////////////////////////////////////////
ManageResidentsPage.deleteUserNoPromise = function(emailAddress)
{
	var userInfo = ManageResidentsPage.findUserRowByEmail_Css_NoPromise( emailAddress );

	if( userInfo === null )
		return null;

	//console.log("Going to edit user to delete"); 
	userInfo.edit();

	//console.log("Deleting user"); 
	element(by.id("remove-resident-button")).click();
	browser.sleep( 250 );

	browser.switchTo().alert().accept();

	InputUtils.waitForElementToBeHidden( by.id("EditUserContainer") );

	// Wait for the refresh to start
	browser.sleep( 100 );

	// Wait for the loading to stop
	//InputUtils.waitForElementToBeHidden( by.css("div[contains(@class, 'loading-overlay')][data-ng-show='vm.isLoading']") );
	InputUtils.waitForElementToBeHidden( by.css("[data-ng-show='$ctrl.isLoading']") );
};


///////////////////////////////////////////////////////////////////////////////////////////////////
// Delete a user if they exist
///////////////////////////////////////////////////////////////////////////////////////////////////
ManageResidentsPage.setUserDetails = function( first, last, email, unit )
{
	if( first !== null )
		InputUtils.clearAndSendKeys( by.id("edit-user-first-text-box"), first );

	if( last !== null )
		InputUtils.clearAndSendKeys( by.id("edit-user-last-name-text-box"), last );

	if( email !== null )
		InputUtils.clearAndSendKeys( by.id("edit-user-email-text-box"), email );
};


///////////////////////////////////////////////////////////////////////////////////////////////////
// Find a user in the user table by the user's e-mail address
///////////////////////////////////////////////////////////////////////////////////////////////////
ManageResidentsPage.findUserRowByEmail_Css_NoPromise = function(emailAddress)
{
	var emailCell = element(by.cssContainingText(".resident-cell-email",emailAddress));

	return ManageResidentsPage.rowToObject_Cell_NoPromise( emailCell, emailAddress );
};


///////////////////////////////////////////////////////////////////////////////////////////////////
// Find a user in the user table by the user's e-mail address
///////////////////////////////////////////////////////////////////////////////////////////////////
ManageResidentsPage.findUserRowByEmail_Css_Promise = function(emailAddress)
{
	var deferred = protractor.promise.defer();

	var numTestedRows = 0;

	element.all(by.css('.resident-cell-email')).then(function(emailCells)
	{
		//console.log("Found " + emailCells.length + " .resident-cell-email .ui-grid-cell-contents cells");

		for( var cellIndex = 0; cellIndex < emailCells.length; ++cellIndex )
		{
			var cellElement = emailCells[cellIndex];

			cellElement.getText().then(function(cellEmail)
			{
				cellEmail = cellEmail.trim();
				
				//console.log("Comparing '" + cellEmail + "' to '" + emailAddress + "'");
				if( cellEmail == emailAddress )
				{
					return deferred.fulfill( ManageResidentsPage.rowToObject_Cell( cellElement, emailAddress ) );
				}

				if( ++numTestedRows >= emailCells.length )	
				{
					//console.log("Failed to find user");
					return deferred.fulfill(null);
				}	
			} );
		}
	});

	return deferred.promise;
};


///////////////////////////////////////////////////////////////////////////////////////////////////
// Test if a user exists
///////////////////////////////////////////////////////////////////////////////////////////////////
ManageResidentsPage.doesUserExist = function(emailAddress)
{
	return ManageResidentsPage.findUserRowByEmail_Css_Promise(emailAddress).then(function(userInfo)
	{
		return userInfo !== null;
	});
};


///////////////////////////////////////////////////////////////////////////////////////////////////
// Find a user in the user table by the user's e-mail address
///////////////////////////////////////////////////////////////////////////////////////////////////
ManageResidentsPage.findUserRowByEmail_Promise = function(emailAddress)
{
	var deferred = protractor.promise.defer();

	//element.all(by.repeater('row in renderedRows')).then(function(userRows)
	element.all(by.css('.ngRow')).then(function(userRows)
	{
		var numTestedRows = 0;

		//console.log(userRows);
		console.log("Found " + userRows.length + " rows");

		var promises = [];
		var rows = [];

		for(var i = 0; i < userRows.length; ++i)
		{
			//userRows[i].all(by.repeater('col in renderedColumns')).then(function(userColumns)
			userRows[i].all(by.css('.ngCell')).then(function(userColumns)
			{
				console.log("Found " + userColumns.length + " columns");

				userColumns[ManageResidentsPage.COLINDEX_Email].getText().then( function(userEmail)
				{	
					userEmail = userEmail.trim();

					console.log("Comparing '" + userEmail + "' to '" + emailAddress + "'");
					if( userEmail == emailAddress )
					{
						return deferred.fulfill( ManageResidentsPage.rowToObject_Columns( userColumns ) );
					}

					if( ++numTestedRows >= userRows.length )						
						return deferred.reject("Failed to find user");
				});
			});


			return protractor.promise.all(promises).then(function()
			{
				return userInfo;
			});
		}
	});

	return deferred.promise;
};


///////////////////////////////////////////////////////////////////////////////////////////////////
// Find a user in the user table by the user's e-mail address
///////////////////////////////////////////////////////////////////////////////////////////////////
ManageResidentsPage.findUserRowByEmail = function(emailAddress)
{
	var deferred = protractor.promise.defer();

	var userRows = element.all(by.repeater('row in renderedRows'));

	for(var i=0;i<userRows.length; ++i)
	{
		var userColumns = userRows[i].all(by.repeater('col in renderedColumns'));

		console.log("Looking at user " + userColumns[ManageResidentsPage.COLINDEX_Email].getText());

		for(var columnIndex = 0; columnIndex < userColumns.length; ++columnIndex)
		{
			var userEmail = userColumns[ManageResidentsPage.COLINDEX_Email].getText();
			if( userEmail === emailAddress )
			{
				return ManageResidentsPage.rowToObject_Columns( userColumns );
			}
		}
	}

	return null;
};

module.exports = ManageResidentsPage;