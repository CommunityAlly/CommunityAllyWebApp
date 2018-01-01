function BuildingInfoPage()
{

}


///////////////////////////////////////////////////////////////////////////////////////////////////
// Get the relevant information for a building info item
///////////////////////////////////////////////////////////////////////////////////////////////////
BuildingInfoPage.getInfoItemData = function(infoItemIndex)
{
	return {
		title: element(by.xpath("//div[@id='info-item-" + infoItemIndex + "']/div[1]/h2")).getText(),
		description: element(by.xpath("//div[@id='info-item-" + infoItemIndex + "']/div[@data-ng-bind-html='info.body']")).getText(),
		index: infoItemIndex,
		edit:function()
		{
			element(by.id("info-item-edit-" + this.index + "-button")).click();
		},
		delete:function()
		{

		}
	};
};


///////////////////////////////////////////////////////////////////////////////////////////////////
// Create a directory
///////////////////////////////////////////////////////////////////////////////////////////////////
BuildingInfoPage.createDirectory = function(directoryName)
{
	element(by.id("create-new-folder-button")).click();
		
	element(by.model("$ctrl.newDirectoryName")).sendKeys(directoryName);

	browser.sleep( 200 );

	element(by.id("create-directory-button")).click();

	BuildingInfoPage.waitForDocumentsToLoad();
};


///////////////////////////////////////////////////////////////////////////////////////////////////
// Select a directory by name
///////////////////////////////////////////////////////////////////////////////////////////////////
BuildingInfoPage.waitForDocumentsToLoad = function()
{
	// Wait for the loading overlay to be hidden
	browser.wait(function()
	{
	  return $('#file-tree-panel-overlay').isDisplayed().then(function(result){return !result});
	}, 10000);

	// Make sure the "new folder" button is visible
	browser.wait(function()
	{
	  return element(by.id("create-new-folder-button")).isDisplayed().then(function(result){return result});
	}, 10000);
};


///////////////////////////////////////////////////////////////////////////////////////////////////
// Select a directory by name
///////////////////////////////////////////////////////////////////////////////////////////////////
BuildingInfoPage.selectDirectory = function(directoryName)
{
	element(by.cssContainingText(".directory-name",directoryName)).click();
};


///////////////////////////////////////////////////////////////////////////////////////////////////
// Select a file by name in the currently selected directory
///////////////////////////////////////////////////////////////////////////////////////////////////
BuildingInfoPage.selectFile = function(fileName)
{
	element(by.cssContainingText(".file-name",fileName)).click();
};


///////////////////////////////////////////////////////////////////////////////////////////////////
// Rename a file in the current directory
///////////////////////////////////////////////////////////////////////////////////////////////////
BuildingInfoPage.renameFile = function(oldFileName, newFileName)
{
	BuildingInfoPage.selectFile( oldFileName );

	element(by.id("rename-document-button-0")).click();
	browser.sleep( 250 ); // Alerts take a little bit to open up

	var promptDialog = browser.switchTo().alert();
	promptDialog.sendKeys( newFileName );
	promptDialog.accept();

	// Wait for the delete to finish
	BuildingInfoPage.waitForDocumentsToLoad();

	// Let the code start the refresh
	browser.sleep( 150 );

	// Wait for the refresh to finish
	BuildingInfoPage.waitForDocumentsToLoad();
};


///////////////////////////////////////////////////////////////////////////////////////////////////
// Delete a file in the current directory
///////////////////////////////////////////////////////////////////////////////////////////////////
BuildingInfoPage.deleteFile = function(fileName)
{
	BuildingInfoPage.selectFile( fileName );

	element(by.id("delete-document-button-0")).click();
	browser.sleep( 250 ); // Alerts take a little bit to open up

	browser.switchTo().alert().accept();

	// Wait for the delete to finish
	BuildingInfoPage.waitForDocumentsToLoad();

	// Let the code start the refresh
	browser.sleep( 150 );

	// Wait for the refresh to finish
	BuildingInfoPage.waitForDocumentsToLoad();
};


///////////////////////////////////////////////////////////////////////////////////////////////////
// Delete a directory by name
///////////////////////////////////////////////////////////////////////////////////////////////////
BuildingInfoPage.deleteDirectory = function(directoryName)
{
	element(by.cssContainingText(".directory-name",directoryName)).click();

	element(by.id("delete-directory-button")).click();
	browser.sleep( 250 ); // Alerts take a little bit to open up

	browser.switchTo().alert().accept();

    // Wait for the delete to finish
	BuildingInfoPage.waitForDocumentsToLoad();

	// Let the code start the refresh
	browser.sleep( 150 );

	// Wait for the refresh to finish
	BuildingInfoPage.waitForDocumentsToLoad();
};


BuildingInfoPage.deleteInfoItem = function( itemIndex, loadingOverlaySelector )
{
	itemIndex = itemIndex || 0;

	loadingOverlaySelector = loadingOverlaySelector || by.xpath("//div[contains(@class, 'loading-overlay')][@data-ng-show='isLoadingInfo']");

	element(by.id("info-item-delete-" + itemIndex + "-button")).click();
	browser.sleep( 250 ); // Alerts take a little bit to open up
	
	browser.switchTo().alert().accept();
	InputUtils.waitForElementToBeHidden( loadingOverlaySelector );
};


module.exports = BuildingInfoPage;