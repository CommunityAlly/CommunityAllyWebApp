var Ally;
(function (Ally) {
    /**
     * The controller for the admin-only page to edit group boundary polygons
     */
    class ManageAddressPolysController {
        /**
        * The constructor for the class
        */
        constructor($http, $q) {
            this.$http = $http;
            this.$q = $q;
            this.isLoading = false;
            this.includeAddresses = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            // Initialize the UI
            this.refreshAddresses();
        }
        getPolyInfo(url, polyType) {
            const deferred = this.$q.defer();
            this.isLoading = true;
            this.$http.get(url).then((httpResponse) => {
                this.isLoading = false;
                const addresses = httpResponse.data;
                // Mark address as opposed to group bounds
                _.each(addresses, (a) => {
                    a.polyType = polyType;
                    if (polyType === "Group") {
                        a.oneLiner = `${a.shortName}, ${a.appName} (ID: ${a.groupId})`;
                        if (a.appName === "Condo")
                            a.visitUrl = `https://${a.shortName}.condoally.com/`;
                        else if (a.appName === "Hoa")
                            a.visitUrl = `https://${a.shortName}.hoaally.org/`;
                    }
                });
                $.merge(this.addresses, addresses);
                deferred.resolve(this.addresses);
            }, (httpResponse) => {
                this.isLoading = false;
                const errorMessage = httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to retrieve addresses: " + errorMessage);
                deferred.reject();
            });
            return deferred.promise;
        }
        getGroupBoundPolys() {
            return this.getPolyInfo("/api/AdminMap/GetGroupBounds?filter=" + this.filterAddresses, "Group");
        }
        getAddressPolys() {
            return this.getPolyInfo("/api/AdminMap/GetAll?filter=" + this.filterAddresses, "Address");
        }
        // Get the addresses that are missing bounding polys
        refreshAddresses() {
            this.isLoading = true;
            this.addresses = [];
            const handleAddrs = (addresses) => {
                this.addressPoints = [];
                _.each(addresses, (a) => {
                    if (a.gpsPos) {
                        // The GoogleMapPoly directive uses the fullAddress for the marker tooltip
                        a.gpsPos.fullAddress = a.oneLiner;
                        this.addressPoints.push(a.gpsPos);
                    }
                });
            };
            if (this.includeAddresses)
                this.getAddressPolys().then(() => this.getGroupBoundPolys()).then(handleAddrs);
            else
                this.getGroupBoundPolys().then(handleAddrs);
        }
        onSavePoly() {
            this.isLoading = true;
            const serverVerts = { vertices: this.selectedAddress.gpsBounds.vertices };
            const url = this.selectedAddress.polyType === "Address" ? ("/api/AdminMap/UpdateAddress/" + this.selectedAddress.addressId) : ("/api/AdminMap/UpdateGroup/" + this.selectedAddress.groupId);
            this.$http.put(url, serverVerts).then(() => {
                this.isLoading = false;
            }, () => {
                this.isLoading = false;
            });
        }
        // Occurs when the user clicks an address link
        onAddressSelected(address) {
            //if ( address.gpsPos )
            //    this.mapInstance.setCenter( { lat: address.gpsPos.lat, lng: address.gpsPos.lon } );
            this.selectedAddress = address;
            // Ensure we have a valid array to work with
            if (!this.selectedAddress.gpsBounds)
                this.selectedAddress.gpsBounds = { vertices: [] };
            if (!this.selectedAddress.gpsBounds.vertices)
                this.selectedAddress.gpsBounds.vertices = [];
            // If the array is empty then create a default rectangle
            if (this.selectedAddress.gpsBounds.vertices.length == 0 && address.gpsPos) {
                //const southWest = new google.maps.LatLng( address.gpsPos.lat, address.gpsPos.lon );
                //const northEast = new google.maps.LatLng( address.gpsPos.lat + 0.001, address.gpsPos.lon + 0.001 );
                address.gpsBounds.vertices = [
                    { lat: address.gpsPos.lat, lon: address.gpsPos.lon },
                    { lat: address.gpsPos.lat + 0.001, lon: address.gpsPos.lon },
                    { lat: address.gpsPos.lat + 0.001, lon: address.gpsPos.lon + 0.001 },
                    { lat: address.gpsPos.lat, lon: address.gpsPos.lon + 0.001 }
                ];
            }
            this.selectedGpsPoly = address.gpsBounds;
            //createPolygon( this.mapInstance, address.gpsBounds.vertices );
        }
    }
    ManageAddressPolysController.$inject = ["$http", "$q"];
    Ally.ManageAddressPolysController = ManageAddressPolysController;
    class GroupBoundInfo {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("manageAddressPolys", {
    templateUrl: "/ngApp/admin/manage-address-polys.html",
    controller: Ally.ManageAddressPolysController
});

var Ally;
(function (Ally) {
    class GroupEntry {
    }
    class FoundGroup {
    }
    /**
     * The controller for the admin-only page to edit group boundary polygons
     */
    class ManageGroupsController {
        /**
        * The constructor for the class
        */
        constructor($http, siteInfo, $timeout) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.newAssociation = new GroupEntry();
            this.changeShortNameData = { appName: "Condo" };
            this.sendTestFromInmail = false;
            this.noReplyEmailInfo = {
                to: "",
                subject: "",
                body: ""
            };
            /**
             * Retrieve the active group list
             */
            this.retrieveGroups = function () {
                this.isLoading = true;
                this.$http.get("/api/Association/AdminList").then((response) => {
                    this.isLoading = false;
                    this.groups = response.data;
                    // Add the app type string
                    _.each(this.groups, function (g) {
                        if (g.appName === 0) {
                            g.appNameString = "Condo";
                            g.baseUrl = "https://" + g.shortName + ".CondoAlly.com/";
                        }
                        else if (g.appName === 1) {
                            g.appNameString = "NeighborhoodWatch";
                            g.baseUrl = "https://" + g.shortName + ".WatchAlly.com/";
                        }
                        else if (g.appName === 2) {
                            g.appNameString = "Home";
                            g.baseUrl = "https://" + g.shortName + ".HomeAlly.org/";
                        }
                        else if (g.appName === 3) {
                            g.appNameString = "Hoa";
                            g.baseUrl = "https://" + g.shortName + ".HoaAlly.org/";
                        }
                        else if (g.appName === 4) {
                            g.appNameString = "Neighborhood";
                            g.baseUrl = "https://" + g.shortName + ".NeighborhoodAlly.org/";
                        }
                        else if (g.appName === 5) {
                            g.appNameString = "PTA";
                            g.baseUrl = "https://" + g.shortName + ".PTAAlly.org/";
                        }
                        else if (g.appName === 6) {
                            g.appNameString = "BlockClub";
                            g.baseUrl = "https://" + g.shortName + ".BlockClubAlly.org/";
                        }
                    });
                }, () => {
                    this.isLoading = false;
                    alert("Failed to retrieve groups");
                });
            };
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.curGroupApiUri = this.siteInfo.publicSiteInfo.baseApiUrl;
            this.curGroupId = this.curGroupApiUri.substring("https://".length, this.curGroupApiUri.indexOf("."));
            this.curGroupCreationDate = this.siteInfo.privateSiteInfo.creationDate;
            this.premiumUpdateGroupId = parseInt(this.curGroupId);
            // A little shortcut for updating
            if (AppConfig.appShortName === "hoa")
                this.changeShortNameData.appName = "Hoa";
            this.changeShortNameData.old = this.siteInfo.publicSiteInfo.shortName;
            this.newAllyPaymentEntry = {
                paymentId: 0,
                groupId: parseInt(this.curGroupId),
                amount: 0,
                netAmount: null,
                description: "Annual Premium Plan",
                entryDateUtc: new Date(),
                paymentDateUtc: new Date(),
                paymentMethod: "Check",
                paymentMethodId: "",
                status: "Complete"
            };
            this.$timeout(() => this.loadAllyAppSettings(), 100);
        }
        /**
         * Change a group's short name
         */
        changeShortName() {
            this.changeShortNameResult = null;
            // Make sure the new short name is only letters and numbers and lower case
            if (/[^a-zA-Z0-9]/.test(this.changeShortNameData.newShortName)) {
                alert("The new short name must be alphanumeric");
                return;
            }
            if (this.changeShortNameData.newShortName !== this.changeShortNameData.newShortName.toLowerCase()) {
                alert("The new short name must be lower-case");
                return;
            }
            if (this.changeShortNameData.newShortName.length === 0) {
                alert("New short name must not be empty");
                return;
            }
            this.isLoading = true;
            this.$http.put("/api/AdminHelper/ChangeShortName?oldShortName=" + this.changeShortNameData.old + "&newShortName=" + this.changeShortNameData.newShortName + "&appName=" + this.changeShortNameData.appName, null).then((response) => {
                this.isLoading = false;
                this.changeShortNameResult = "Successfully changed";
            }, (response) => {
                this.isLoading = false;
                this.changeShortNameResult = "Failed to change: " + response.data.exceptionMessage;
            });
        }
        /**
         * Find the groups to which a user, via email address, belongs
         */
        findAssociationsForUser() {
            this.isLoading = true;
            this.$http.get("/api/AdminHelper/FindAssociationsForUser?email=" + this.findUserAssociationsEmail).then((response) => {
                this.isLoading = false;
                this.foundUserAssociations = response.data;
                _.forEach(this.foundUserAssociations, g => {
                    g.viewUrl = `https://${g.shortName}.condoally.com/`;
                    if (g.appName === 2)
                        g.viewUrl = `https://${g.shortName}.homeally.org/`;
                    else if (g.appName === 3)
                        g.viewUrl = `https://${g.shortName}.hoaally.org/`;
                    else if (g.appName === 4)
                        g.viewUrl = `https://${g.shortName}.NeighborhoodAlly.org/`;
                    else if (g.appName === 6)
                        g.viewUrl = `https://${g.shortName}.BlockClubAlly.org/`;
                    else
                        console.log("Unknown appName value: " + g.appName);
                });
            }, () => {
                this.isLoading = false;
                alert("Failed to find associations for user");
            });
        }
        /**
         * Delete a CHTN group
         */
        deleteAssociation(association) {
            if (!confirm("Are you sure you want to delete this association?"))
                return;
            this.isLoading = true;
            this.$http.delete("/api/Association/chtn/" + association.groupId).then(() => {
                this.isLoading = false;
                this.retrieveGroups();
            }, (error) => {
                this.isLoading = false;
                console.log(error.data.exceptionMessage);
                alert("Failed to delete group: " + error.data.exceptionMessage);
            });
        }
        /**
         * Add an address to full address
         */
        addAddress() {
            this.newAddressId = null;
            this.isLoading = true;
            this.$http.post("/api/AdminHelper/AddAddress?address=" + encodeURIComponent(this.newAddress), null).then((response) => {
                this.isLoading = false;
                this.newAddressId = response.data.newAddressId;
            }, (response) => {
                this.isLoading = false;
                alert("Failed to add address: " + response.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user presses the button to create a new association
         */
        onCreateAssociationClick() {
            this.isLoading = true;
            this.$http.post("/api/Association", this.newAssociation).then(() => {
                this.isLoading = false;
                this.newAssociation = new GroupEntry();
                this.retrieveGroups();
            });
        }
        onSendTestEmail() {
            this.makeHelperRequest(`/api/AdminHelper/SendTestEmail?testEmailRecipient=${encodeURIComponent(this.testEmailRecipient)}&sendFromInmail=${this.sendTestFromInmail ? 'true' : 'false'}`);
        }
        onSendTaylorTestEmail() {
            this.makeHelperRequest("/api/AdminHelper/SendFromTaylorEmail?testEmailRecipient=" + encodeURIComponent(this.testTaylorEmailRecipient));
        }
        onSendTaylorBulkUpdateEmail() {
            if (!confirm("Are you sure you want to SEND TO EVERYONE?!?!"))
                return;
            this.makeHelperRequest("/api/AdminHelper/SendBulkTaylorEmail3");
        }
        onSendTestPostmarkEmail() {
            this.isLoading = true;
            this.$http.get("/api/AdminHelper/SendTestPostmarkEmail?email=" + this.testPostmarkEmail).then(() => {
                this.isLoading = false;
                alert("Successfully sent email");
            }, () => {
                this.isLoading = false;
                alert("Failed to send email");
            });
        }
        onSendTestCalendarEmail() {
            this.isLoading = true;
            this.$http.get("/api/AdminHelper/SendTestCalendarEmail").then(() => {
                this.isLoading = false;
                alert("Successfully sent email");
            }, () => {
                this.isLoading = false;
                alert("Failed to send email");
            });
        }
        onSendNoReplyEmail() {
            this.isLoading = true;
            this.$http.post("/api/AdminHelper/SendNoReplyPostmarkEmail", this.noReplyEmailInfo).then(() => {
                this.isLoading = false;
                alert("Successfully sent email");
            }, (response) => {
                this.isLoading = false;
                alert("Failed to send email: " + response.data.exceptionMessage);
            });
        }
        makeHelperRequest(apiPath, postData = null) {
            this.isLoadingHelper = true;
            let request;
            if (postData)
                request = this.$http.post(apiPath, postData);
            else
                request = this.$http.get(apiPath);
            request.then(() => this.isLoadingHelper = false, (response) => {
                this.isLoadingHelper = false;
                const msg = response.data ? response.data.exceptionMessage : "";
                alert("Failed: " + msg);
            });
        }
        onTestException() {
            this.makeHelperRequest("/api/AdminHelper/TestException");
        }
        onClearElmahLogs() {
            this.makeHelperRequest("/api/AdminHelper/ClearElmah");
        }
        onClearCurrentAppGroupCache() {
            this.makeHelperRequest("/api/AdminHelper/ClearCurrentGroupFromCache");
        }
        onClearEntireAppGroupCache() {
            this.makeHelperRequest("/api/AdminHelper/ClearGroupCache");
        }
        onSendInactiveGroupsMail() {
            const postData = {
                shortNameLines: this.inactiveShortNames
            };
            this.makeHelperRequest("/api/AdminHelper/SendInactiveGroupsMail", postData);
        }
        logInAs() {
            this.isLoading = true;
            this.$http.get("/api/AdminHelper/LogInAs?email=" + this.logInAsEmail).then((response) => {
                this.siteInfo.setAuthToken(response.data);
                window.location.href = "/#!/Home";
                window.location.reload();
            }, (response) => {
                alert("Failed to perform login: " + response.data.exceptionMessage);
            }).finally(() => this.isLoading = false);
        }
        populateEmptyDocumentUsage() {
            this.isLoading = true;
            let getUri = "/api/AdminHelper/FillInMissingDocumentUsage?numGroups=10";
            if (this.populateDocUsageGroupId)
                getUri += "&groupId=" + this.populateDocUsageGroupId;
            this.$http.get(getUri).then((response) => {
                this.isLoading = false;
                alert("Succeeded: " + response.data);
            }, (response) => {
                this.isLoading = false;
                alert("Failed: " + response.data.exceptionMessage);
            });
        }
        refreshCurGroupDocumentUsage() {
            this.isLoading = true;
            const getUri = "/api/AdminHelper/RecalcGroupDocumentUsage?groupId=" + this.curGroupId;
            this.$http.get(getUri).then((response) => {
                this.isLoading = false;
                console.log("Recalc Succeeded", response.data);
                alert("Succeeded: " + response.data);
            }, (response) => {
                this.isLoading = false;
                alert("Failed: " + response.data.exceptionMessage);
            });
        }
        onAddAllyPayment() {
            this.isLoading = true;
            this.$http.post("/api/AdminHelper/AddAllyPaymentEntry", this.newAllyPaymentEntry).then((response) => {
                this.isLoading = false;
                this.newAllyPaymentEntry.amount = 0;
                this.newAllyPaymentEntry.netAmount = null;
                this.newAllyPaymentEntry.paymentMethodId = "";
                alert("Succeeded");
            }, (response) => {
                this.isLoading = false;
                alert("Failed: " + response.data.exceptionMessage);
            });
        }
        updatePremiumCost() {
            this.isLoading = true;
            const postUri = `/api/AdminHelper/SetPremiumCost/${this.premiumUpdateGroupId}?cost=${this.premiumNewCost}`;
            this.$http.put(postUri, null).then((response) => {
                this.isLoading = false;
                this.premiumNewCost = 0;
                alert("Succeeded");
            }, (response) => {
                this.isLoading = false;
                alert("Failed: " + response.data.exceptionMessage);
            });
        }
        updatePremiumExpiration() {
            if (!this.premiumNewExpiration) {
                alert("Hey, dummy, enter a date. Ha!");
                return;
            }
            this.isLoading = true;
            const postUri = `/api/AdminHelper/SetPremiumExpiration/${this.premiumUpdateGroupId}?expirationDate=${encodeURIComponent(this.premiumNewExpiration.toISOString())}`;
            this.$http.put(postUri, null).then((response) => {
                this.isLoading = false;
                this.premiumNewExpiration = null;
                alert("Succeeded");
            }, (response) => {
                this.isLoading = false;
                alert("Failed: " + response.data.exceptionMessage);
            });
        }
        onDeactivateGroup() {
            this.isLoading = true;
            const getUri = `/api/AdminHelper/DeactivateGroups?groupIdsCsv=${this.deactivateGroupIdsCsv}`;
            this.$http.get(getUri).then((response) => {
                this.isLoading = false;
                this.deactivateGroupIdsCsv = null;
                alert("Deactivate Succeeded: " + response.data);
            }, (response) => {
                this.isLoading = false;
                alert("Deactivate Failed: " + response.data.exceptionMessage);
            });
        }
        onReactivateGroup() {
            this.isLoading = true;
            const getUri = `/api/AdminHelper/ReactivateGroup?groupId=${this.reactivateGroupId}`;
            this.$http.get(getUri).then((response) => {
                this.isLoading = false;
                this.reactivateGroupId = null;
                alert("Reactivate Succeeded: " + response.data);
            }, (response) => {
                this.isLoading = false;
                alert("Reactivate Failed: " + response.data.exceptionMessage);
            });
        }
        loadAllyAppSettings() {
            this.allAllyAppSettings = [];
            this.isLoadingAllyAppSettings = true;
            this.$http.get(`/api/AllyAppSettings/All`).then((response) => {
                this.isLoadingAllyAppSettings = false;
                this.allAllyAppSettings = response.data;
            }, (response) => {
                this.isLoadingAllyAppSettings = false;
                alert("Failed to retrieve settings: " + response.data.exceptionMessage);
            });
        }
        saveAllyAppSetting() {
            this.$http.post("", this.editAllyAppSetting);
        }
    }
    ManageGroupsController.$inject = ["$http", "SiteInfo", "$timeout"];
    Ally.ManageGroupsController = ManageGroupsController;
    class AllyPaymentEntry {
    }
    class AllyAppSetting {
    }
    Ally.AllyAppSetting = AllyAppSetting;
})(Ally || (Ally = {}));
CA.angularApp.component("manageGroups", {
    templateUrl: "/ngApp/admin/manage-groups.html",
    controller: Ally.ManageGroupsController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the admin-only page to manage group homes/units
     */
    class ManageHomesController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.unitToEdit = new Ally.Unit();
            this.isEdit = false;
            this.isHoaAlly = false;
            this.isCondoAlly = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isAdmin = this.siteInfo.userInfo.isAdmin;
            this.homeName = AppConfig.homeName || "Unit";
            this.isCondoAlly = AppConfig.appShortName === "condo";
            this.refresh();
        }
        /**
         * Populate the page
         */
        refresh() {
            this.isLoading = true;
            this.$http.get("/api/Unit?includeAddressData=true").then((response) => {
                this.isLoading = false;
                this.units = response.data;
            }, (response) => {
                this.isLoading = false;
                alert("Failed to load homes: " + response.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user presses the button to create a new unit
         */
        onCreateUnitClick() {
            $("#AddUnitForm").validate();
            if (!$("#AddUnitForm").valid())
                return;
            this.isLoading = true;
            var onSave = () => {
                this.isLoading = false;
                this.isEdit = false;
                this.unitToEdit = new Ally.Unit();
                this.refresh();
            };
            var onError = (response) => {
                this.isLoading = false;
                alert("Failed to save: " + response.data.exceptionMessage);
            };
            if (this.isEdit)
                this.$http.put("/api/Unit", this.unitToEdit).then(onSave, onError);
            else
                this.$http.post("/api/Unit/AddSingle", this.unitToEdit).then(onSave, onError);
        }
        /**
         * Occurs when the user presses the button to edit a unit
         */
        onEditUnitClick(unit) {
            this.isEdit = true;
            this.unitToEdit = _.clone(unit);
            if (unit.fullAddress)
                this.unitToEdit.streetAddress = unit.fullAddress.oneLiner;
            document.getElementById("unit-edit-panel").scrollIntoView();
        }
        /**
         * Occurs when the user presses the button to refresh a unit's geocoded info from Google
         */
        onRefreshUnitFromGoogle(unit) {
            this.isLoading = true;
            this.$http.put("/api/Unit/ForceRefreshAddressFromGoogle?unitId=" + unit.unitId, null).then(() => {
                this.isLoading = false;
                this.refresh();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to refresh: " + response.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user presses the button to delete a unit
         */
        onDeleteUnitClick(unit) {
            this.isLoading = true;
            this.$http.delete("/api/Unit/" + unit.unitId).then(() => {
                this.isLoading = false;
                this.refresh();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to delete: " + response.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user presses the button to fast add units
         */
        onFastAddUnits() {
            this.isLoading = true;
            this.$http.post("/api/Unit/FastAdd?fastAdd=" + this.lastFastAddName, null).then(() => {
                this.isLoading = false;
                this.refresh();
            }, (response) => {
                this.isLoading = false;
                alert("Failed fast add: " + response.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user presses the button to add units from the multi-line text box
         */
        onAddUnitsPerLine() {
            var postData = {
                action: "onePerLine",
                lines: this.unitNamePerLine
            };
            this.isLoading = true;
            this.$http.post("/api/Unit/Multiline", postData).then(() => {
                this.isLoading = false;
                this.refresh();
            }, () => {
                this.isLoading = false;
                alert("Failed");
            });
        }
        /**
         * Occurs when the user presses the button to add homes from the address multi-line text box
         */
        onAddUnitsByAddressPerLine() {
            var postData = {
                action: "onePerLine",
                lines: this.unitAddressPerLine
            };
            this.isLoading = true;
            this.$http.post("/api/Unit/FromAddresses", postData).then(() => {
                this.isLoading = false;
                this.unitAddressPerLine = "";
                this.refresh();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to add: " + response.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user presses the button to delete all units
         */
        onDeleteAllClick() {
            if (!confirm("This will delete every unit! This should only be used for new sites!"))
                return;
            this.isLoading = true;
            this.$http.delete("/api/Unit/DeleteAll?deleteAction=all").then(() => {
                this.isLoading = false;
                this.refresh();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to delete units: " + response.data.exceptionMessage);
            });
        }
    }
    ManageHomesController.$inject = ["$http", "SiteInfo"];
    Ally.ManageHomesController = ManageHomesController;
})(Ally || (Ally = {}));
CA.angularApp.component("manageHomes", {
    templateUrl: "/ngApp/admin/manage-homes.html",
    controller: Ally.ManageHomesController
});

var Ally;
(function (Ally) {
    class ActivityLogEntry {
    }
    /**
     * The controller for the admin-only page to edit group boundary polygons
     */
    class ViewActivityLogController {
        /**
        * The constructor for the class
        */
        constructor($http) {
            this.$http = $http;
            this.isLoading = false;
            this.shouldHideLoginAndEmailMessages = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.shouldHideLoginAndEmailMessages = window.localStorage["activityLog_hideLoginAndEmailMessages"] === "true";
            // Initialize the UI
            this.retrieveEntries();
        }
        /**
         * Occurs when the users toggles the login/email filter checkbox
         */
        onHideLoginAndEmailMessagesChange() {
            window.localStorage["activityLog_hideLoginAndEmailMessages"] = this.shouldHideLoginAndEmailMessages;
            this.filterMessages();
        }
        /**
         * Load the activity log data
         */
        retrieveEntries() {
            this.isLoading = true;
            this.$http.get("/api/ActivityLog").then((logResponse) => {
                this.isLoading = false;
                this.allLogEntries = logResponse.data;
                // The date comes down as a string so let's convert it to a Date object for the local time zone
                _.each(this.allLogEntries, (e) => e.postDate = moment(e.postDate).toDate());
                this.filterMessages();
            }, (errorResponse) => {
                this.isLoading = false;
                alert("Failed to load activity log: " + errorResponse.data.exceptionMessage);
            });
        }
        /**
         * Update the visible messages based on filter criteria
         */
        filterMessages() {
            if (this.shouldHideLoginAndEmailMessages)
                this.filteredLogEntries = _.filter(this.allLogEntries, e => e.activityMessage !== "Logged in" && e.activityMessage.indexOf("Group email sent") !== 0);
            else
                this.filteredLogEntries = this.allLogEntries;
        }
    }
    ViewActivityLogController.$inject = ["$http"];
    Ally.ViewActivityLogController = ViewActivityLogController;
})(Ally || (Ally = {}));
CA.angularApp.component("viewActivityLog", {
    templateUrl: "/ngApp/admin/view-activity-log.html",
    controller: Ally.ViewActivityLogController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the admin-only page to polygon data
     */
    class ViewPolysController {
        /**
        * The constructor for the class
        */
        constructor($http) {
            this.$http = $http;
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.refreshAddresses();
        }
        findCenter(polys) {
            var currentCenter = {
                lat: 0,
                lng: 0
            };
            for (var polyIndex = 0; polyIndex < polys.length; ++polyIndex) {
                var curPoly = polys[polyIndex];
                if (!curPoly)
                    continue;
                var polyCenter = {
                    lat: 0,
                    lng: 0
                };
                for (var vertexIndex = 0; vertexIndex < curPoly.vertices.length; ++vertexIndex) {
                    var vertex = curPoly.vertices[vertexIndex];
                    polyCenter.lat += vertex.lat;
                    polyCenter.lng += vertex.lng;
                }
                polyCenter.lat /= curPoly.vertices.length;
                polyCenter.lng /= curPoly.vertices.length;
                currentCenter.lat += polyCenter.lat;
                currentCenter.lng += polyCenter.lng;
            }
            currentCenter.lat /= polys.length;
            currentCenter.lng /= polys.length;
            return currentCenter;
        }
        // Get the polygons to display
        refreshAddresses() {
            this.isLoading = true;
            this.neighborhoodPolys = [];
            var innerThis = this;
            this.$http.get("/api/Neighborhood/GetAll").then((httpResponse) => {
                innerThis.isLoading = false;
                innerThis.neighborhoods = httpResponse.data;
                innerThis.neighborhoodPolys = _.select(innerThis.neighborhoods, function (n) { return n.Bounds; });
                innerThis.mapCenter = innerThis.findCenter(this.neighborhoodPolys);
            }, (httpResponse) => {
                innerThis.isLoading = false;
                alert("Failed to retrieve neighborhoods: " + httpResponse.data.exceptionMessage);
            });
        }
        ;
    }
    ViewPolysController.$inject = ["$http", "$q"];
    Ally.ViewPolysController = ViewPolysController;
})(Ally || (Ally = {}));
CA.angularApp.component("viewPolys", {
    templateUrl: "/ngApp/admin/view-polys.html",
    controller: Ally.ViewPolysController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the admin-only page to view address research data
     */
    class ViewResearchController {
        /**
        * The constructor for the class
        */
        constructor($http) {
            this.$http = $http;
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.mapCenter = { lat: 41.99114, lng: -87.690425 };
            // Initialize the UI
            this.refreshCells();
        }
        addLine(map, minLat, minLon, maxLat, maxLon) {
            var lineCoordinates = [
                { lat: minLat, lng: minLon },
                { lat: maxLat, lng: maxLon }
            ];
            var linePath = new google.maps.Polyline({
                path: lineCoordinates,
                geodesic: false,
                strokeColor: '#FF0000',
                strokeOpacity: 1.0,
                strokeWeight: 2
            });
            linePath.setMap(map);
        }
        onBuildingSelected(building) {
        }
        onCellSelected(cell) {
            cell.gpsBounds.mapShapeObject.setOptions({ fillOpacity: 0.1 });
            if (this.selectedCell) {
                this.selectedCell.gpsBounds.mapShapeObject.setOptions({ fillOpacity: 0.35 });
            }
            this.selectedCell = cell;
            _.each(this.selectedCell.streets, function (s) {
                if (s.minLat != 0)
                    this.addLine(cell.gpsBounds.mapShapeObject.map, s.minLat, s.minLon, s.maxLat, s.maxLon);
            });
        }
        // Get the addresses that are missing bounding polys
        refreshCells() {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/ResearchMap").then((response) => {
                innerThis.isLoading = false;
                innerThis.cells = response.data;
                //this.cellPolys = _.map( this.cells, function ( c )
                //{
                //    var result = c.gpsBounds;
                //    result.ownerCell = c;
                //    result.onClick = function ()
                //    {
                //        this.onCellSelected( result.ownerCell );
                //    };
                //    return result;
                //} );
                innerThis.isLoading = true;
                innerThis.$http.get("/api/ResearchMap/Buildings").then(function (httpResponse) {
                    innerThis.isLoading = false;
                    innerThis.buildings = httpResponse.data;
                    //this.cellPolys = _.map( this.buildings, function ( b )
                    //{
                    //    var result = b.footprintPolygon;
                    //    result.ownerBuilding = b;
                    //    result.onClick = function ()
                    //    {
                    //        this.onBuildingSelected( result.ownerBuilding );
                    //    };
                    //    return result;
                    //} );
                    innerThis.buildingPoints = _.map(innerThis.buildings, function (b) {
                        var result = b.addressPos;
                        result.ownerBuilding = b;
                        result.onClick = function () {
                            //this.onBuildingSelected( result.ownerBuilding );
                        };
                        return result;
                    });
                });
            }, function (httpResponse) {
                innerThis.isLoading = false;
                alert("Failed to retrieve cells: " + httpResponse.data.exceptionMessage);
            });
        }
        // Occurs when the user clicks an address
        onAddressSelected(address) {
            //if ( address.gpsPos )
            //    this.mapInstance.setCenter( { lat: address.gpsPos.lat, lng: address.gpsPos.lon } );
            this.selectedAddress = address;
            // Ensure we have a valid array to work with
            if (!this.selectedAddress.gpsBounds)
                this.selectedAddress.gpsBounds = { vertices: [] };
            if (!this.selectedAddress.gpsBounds.vertices)
                this.selectedAddress.gpsBounds.vertices = [];
            // If the array is empty then create a default rectangle
            if (this.selectedAddress.gpsBounds.vertices.length == 0 && address.gpsPos) {
                var southWest = new google.maps.LatLng(address.gpsPos.lat, address.gpsPos.lon);
                var northEast = new google.maps.LatLng(address.gpsPos.lat + 0.001, address.gpsPos.lon + 0.001);
                address.gpsBounds.vertices = [
                    { lat: address.gpsPos.lat, lon: address.gpsPos.lon },
                    { lat: address.gpsPos.lat + 0.001, lon: address.gpsPos.lon },
                    { lat: address.gpsPos.lat + 0.001, lon: address.gpsPos.lon + 0.001 },
                    { lat: address.gpsPos.lat, lon: address.gpsPos.lon + 0.001 }
                ];
            }
            this.selectedGpsPoly = address.gpsBounds;
            //createPolygon( this.mapInstance, address.gpsBounds.vertices );
        }
    }
    ViewResearchController.$inject = ["$http"];
    Ally.ViewResearchController = ViewResearchController;
})(Ally || (Ally = {}));
CA.angularApp.component("viewResearch", {
    templateUrl: "/ngApp/admin/view-research.html",
    controller: Ally.ViewResearchController
});

// DEVLOCAL - Specify your group's API path to make all API requests to the live server, regardless
// of the local URL. This is useful when developing locally.
var OverrideBaseApiPath = null; // Should be something like "https://1234.webappapi.communityally.org/api/"
var OverrideOriginalUrl = null; // Should be something like "https://example.condoally.com/" or "https://example.hoaally.org/"
OverrideBaseApiPath = "https://28.webappapi.communityally.org/api/";
//OverrideBaseApiPath = "https://7478.webappapi.mycommunityally.org/api/";
OverrideOriginalUrl = "https://qa.condoally.com/";
//const StripeApiKey = "pk_test_FqHruhswHdrYCl4t0zLrUHXK";
const StripeApiKey = "pk_live_fV2yERkfAyzoO9oWSfORh5iH";
CA.angularApp.config(['$routeProvider', '$httpProvider', '$provide', "SiteInfoProvider", "$locationProvider",
    function ($routeProvider, $httpProvider, $provide, siteInfoProvider, $locationProvider) {
        $locationProvider.hashPrefix('!');
        const isLoginRequired = function ($location, $q, siteInfo, appCacheService) {
            const deferred = $q.defer();
            // We have no user information so they must login
            const isPublicHash = $location.path() === "/Home" || $location.path() === "/Login" || AppConfig.isPublicRoute($location.path());
            if (!siteInfo.userInfo && !isPublicHash) {
                // Home, the default page, and login don't need special redirection or user messaging
                if ($location.path() !== "/Home" || $location.path() !== "/Login") {
                    appCacheService.set(AppCacheService.Key_AfterLoginRedirect, $location.path());
                    appCacheService.set(AppCacheService.Key_WasLoggedIn401, "true");
                }
                deferred.reject();
                $location.path('/Login');
            }
            // The user does not need to login
            else
                deferred.resolve();
            return deferred.promise;
        };
        const universalResolvesWithLogin = {
            app: ["$q", "$http", "$rootScope", "$sce", "$location", "xdLocalStorage", "appCacheService",
                function ($q, $http, $rootScope, $sce, $location, xdLocalStorage, appCacheService) {
                    return Ally.SiteInfoHelper.loginInit($q, $http, $rootScope, $sce, xdLocalStorage).then(function (siteInfo) {
                        return isLoginRequired($location, $q, siteInfo, appCacheService);
                    });
                }]
        };
        const universalResolves = {
            app: ["$q", "$http", "$rootScope", "$sce", "xdLocalStorage", Ally.SiteInfoHelper.loginInit]
        };
        // This allows us to require SiteInfo to be retrieved before the app runs
        const customRouteProvider = angular.extend({}, $routeProvider, {
            when: function (path, route) {
                route.resolve = (route.resolve) ? route.resolve : {};
                if (route.allyRole === Role_All)
                    angular.extend(route.resolve, universalResolves);
                else
                    angular.extend(route.resolve, universalResolvesWithLogin);
                $routeProvider.when(path, route);
                return this;
            }
        });
        // Build our Angular routes
        for (let i = 0; i < AppConfig.menu.length; ++i) {
            const menuItem = AppConfig.menu[i];
            const routeObject = {
                controller: menuItem.controller,
                allyRole: menuItem.role,
                reloadOnSearch: menuItem.reloadOnSearch
            };
            if (menuItem.templateUrl)
                routeObject.templateUrl = menuItem.templateUrl;
            else
                routeObject.template = menuItem.templateHtml;
            if (menuItem.controllerAs)
                routeObject.controllerAs = menuItem.controllerAs;
            customRouteProvider.when(menuItem.path, routeObject);
        }
        $routeProvider.otherwise({ redirectTo: "/Home" });
        // Create an interceptor to redirect to the login page when unauthorized
        $provide.factory("http403Interceptor", ["$q", "$location", "$rootScope", "appCacheService", "$injector", function ($q, $location, $rootScope, appCacheService, $injector) {
                return {
                    response: function (response) {
                        // Let success pass through
                        return response;
                    },
                    responseError: function (response) {
                        const status = response.status;
                        // 401 - Unauthorized (not logged-in)
                        // 403 - Forbidden (Logged-in, but not allowed to perform the action
                        if (status === 401 || status === 403) {
                            // If the user's action is forbidden and we should not auto-handle the response
                            if (status === 403 && $rootScope.dontHandle403)
                                return $q.reject(response);
                            // If the user's action is forbidden and is logged-in then set this flag so we
                            // can display a helpful error message
                            if (status === 403 && $rootScope.isLoggedIn)
                                appCacheService.set(AppCacheService.Key_WasLoggedIn403, "true");
                            // If the user is unauthorized but has saved credentials, try to log-in then retry the request
                            if (status === 401 && HtmlUtil.isValidString(window.localStorage["rememberMe_Email"])) {
                                const $http = $injector.get("$http");
                                // Multiple requests can come in at the same time with 401, so let's store
                                // our login promise so subsequent calls can tie into the first login
                                // request
                                if (!$rootScope.retryLoginDeffered) {
                                    $rootScope.retryLoginDeffered = $q.defer();
                                    const loginInfo = {
                                        emailAddress: window.localStorage["rememberMe_Email"],
                                        password: atob(window.localStorage["rememberMe_Password"])
                                    };
                                    const retryLogin = function () {
                                        $http.post("/api/Login", loginInfo).then(function (httpResponse) {
                                            const loginData = httpResponse.data;
                                            const siteInfo = $injector.get("SiteInfo");
                                            // Store the new auth token
                                            siteInfo.setAuthToken(loginData.authToken);
                                            const loginDeffered = $rootScope.retryLoginDeffered;
                                            loginDeffered.resolve();
                                        }, function () {
                                            // Login failed so bail out all the way
                                            const loginDeffered = $rootScope.retryLoginDeffered;
                                            $rootScope.onLogOut_ClearData();
                                            loginDeffered.reject();
                                        }).finally(function () {
                                            $rootScope.retryLoginDeffered = null;
                                        });
                                    };
                                    // Wait, just a bit, to let any other requests come in with a 401
                                    setTimeout(retryLogin, 1000);
                                }
                                const retryRequestDeferred = $q.defer();
                                $rootScope.retryLoginDeffered.promise.then(function () {
                                    // Retry the request
                                    retryRequestDeferred.resolve($http(response.config));
                                    //$http( response.config ).then( function( newResponse )
                                    //{
                                    //    retryRequestDeferred.resolve( newResponse );
                                    //}, function()
                                    //{
                                    //    retryRequestDeferred.reject( response );
                                    //} );
                                }, function () {
                                    retryRequestDeferred.reject(response);
                                });
                                return retryRequestDeferred.promise;
                            }
                            // Home, the default page, and login don't need special redirection or user messaging
                            if (status === 401 && $location.path() !== "/Home" && $location.path() !== "/Login") {
                                appCacheService.set(AppCacheService.Key_AfterLoginRedirect, $location.path());
                                appCacheService.set(AppCacheService.Key_WasLoggedIn401, "true");
                            }
                            // The use is not authorized so let's clear the session data
                            $rootScope.onLogOut_ClearData();
                        }
                        // If we didn't handle the response up above then simply reject it
                        return $q.reject(response);
                    }
                };
            }]);
        $httpProvider.interceptors.push('http403Interceptor');
        // Make date strings convert to date objects
        $httpProvider.defaults.transformResponse.push(function (responseData) {
            // Fast skip HTML templates
            if (Ally.HtmlUtil2.isString(responseData) && responseData.length > 30)
                return responseData;
            Ally.HtmlUtil2.convertStringsToDates(responseData);
            return responseData;
        });
        // Create an interceptor so we can add our auth token header. Also, this allows us to set our
        // own base URL for API calls so local testing can use the live API.
        $provide.factory("apiUriInterceptor", ["$rootScope", "SiteInfo", function ($rootScope, siteInfo) {
                // If we're making a request because the Angular app's run block, then see if we have
                // a cached auth token
                if (typeof ($rootScope.authToken) !== "string" && window.localStorage)
                    $rootScope.authToken = window.localStorage.getItem("ApiAuthToken");
                return {
                    request: function (reqConfig) {
                        const BaseGenericUri = "https://0.webappapi.mycommunityally.org/api/";
                        const BaseLocalGenericUri = "https://0.webappapi.communityally.org/api/";
                        const isMakingGenericApiRequest = HtmlUtil.startsWith(reqConfig.url, BaseGenericUri)
                            || HtmlUtil.startsWith(reqConfig.url, BaseLocalGenericUri);
                        // If we're talking to the Community Ally API server, then we need to complete the
                        // relative URL and add the auth token
                        const isMakingApiRequest = HtmlUtil.startsWith(reqConfig.url, "/api/") || isMakingGenericApiRequest;
                        if (isMakingApiRequest) {
                            //console.log( `ApiBaseUrl: ${siteInfo.publicSiteInfo.baseApiUrl}, request URL: ${reqConfig.url}` );
                            // If we have an overridden URL to use for API requests
                            if (!HtmlUtil.startsWith(reqConfig.url, "http")) {
                                if (!HtmlUtil.isNullOrWhitespace(OverrideBaseApiPath))
                                    reqConfig.url = OverrideBaseApiPath + reqConfig.url.substr("/api/".length);
                                else if (siteInfo.publicSiteInfo.baseApiUrl)
                                    reqConfig.url = siteInfo.publicSiteInfo.baseApiUrl + reqConfig.url.substr("/api/".length);
                            }
                            else if (isMakingGenericApiRequest && !HtmlUtil.isNullOrWhitespace(OverrideBaseApiPath)) {
                                if (HtmlUtil.startsWith(reqConfig.url, BaseGenericUri))
                                    reqConfig.url = OverrideBaseApiPath + reqConfig.url.substr(BaseGenericUri.length);
                                else if (HtmlUtil.startsWith(reqConfig.url, BaseLocalGenericUri))
                                    reqConfig.url = OverrideBaseApiPath + reqConfig.url.substr(BaseLocalGenericUri.length);
                            }
                            // Add the auth token
                            reqConfig.headers["Authorization"] = "Bearer " + $rootScope.authToken;
                            // Certain folks with ad-blockers or using private browsing mode will not send
                            // the referrer up so we need to send it ourselves
                            //if( !HtmlUtil.isNullOrWhitespace( OverrideOriginalUrl ) )
                            reqConfig.headers["ReferrerOverride"] = OverrideOriginalUrl || window.location.href;
                        }
                        return reqConfig;
                    }
                };
            }]);
        $httpProvider.interceptors.push("apiUriInterceptor");
    }]);
CA.angularApp.run(["$rootScope", "$http", "$sce", "$location", "$templateCache", "$cacheFactory", "xdLocalStorage",
    function ($rootScope, $http, $sce, $location, $templateCache, $cacheFactory, xdLocalStorage) {
        $rootScope.bgImagePath = "/assets/images/Backgrounds/";
        $rootScope.appConfig = AppConfig;
        $rootScope.isLoggedIn = false;
        $rootScope.publicSiteInfo = {};
        $rootScope.shouldHideMenu = false;
        $rootScope.isAdmin = false;
        $rootScope.isSiteManager = false;
        $rootScope.menuItems = _.where(AppConfig.menu, function (menuItem) { return !HtmlUtil.isNullOrWhitespace(menuItem.menuTitle); });
        $rootScope.mainMenuItems = _.where($rootScope.menuItems, function (menuItem) { return menuItem.role === Role_Authorized; });
        $rootScope.manageMenuItems = _.where($rootScope.menuItems, function (menuItem) { return menuItem.role === Role_Manager; });
        $rootScope.adminMenuItems = _.where($rootScope.menuItems, function (menuItem) { return menuItem.role === Role_Admin; });
        $rootScope.publicMenuItems = null;
        // Populate the custom page list, setting to null if not valid
        $rootScope.populatePublicPageMenu = () => {
            $rootScope.publicMenuItems = null;
            if (!$rootScope.publicSiteInfo || !$rootScope.publicSiteInfo.customPages)
                return;
            const customPages = $rootScope.publicSiteInfo.customPages;
            if (customPages.length == 0)
                return;
            customPages.forEach(p => p.path = "/Page/" + p.pageSlug);
            $rootScope.publicMenuItems = customPages;
        };
        // Test localStorage here, fails in private browsing mode
        // If we have the association's public info cached then use it to load faster
        if (HtmlUtil.isLocalStorageAllowed()) {
            if (window.localStorage) {
                $rootScope.publicSiteInfo = angular.fromJson(window.localStorage.getItem("siteInfo"));
                $rootScope.authToken = window.localStorage.getItem("ApiAuthToken");
                if ($rootScope.publicSiteInfo === null || $rootScope.publicSiteInfo === undefined)
                    $rootScope.publicSiteInfo = {};
                else {
                    // Update the background
                    //if( !HtmlUtil.isNullOrWhitespace( $rootScope.publicSiteInfo.bgImagePath ) )
                    //    $( document.documentElement ).css( "background-image", "url(" + $rootScope.bgImagePath + $rootScope.publicSiteInfo.bgImagePath + ")" );
                }
                $rootScope.populatePublicPageMenu();
            }
        }
        xdLocalStorage.init({
            iframeUrl: "https://www.communityally.org/xd-local-storage.html"
        }).then(function () {
            //console.log( 'Got xdomain iframe ready' );
        });
        // Clear all local information about the logged-in user
        $rootScope.onLogOut_ClearData = function () {
            $rootScope.userInfo = {};
            $rootScope.isLoggedIn = false;
            $rootScope.isAdmin = false;
            $rootScope.isSiteManager = false;
            $rootScope.authToken = "";
            window.localStorage["rememberMe_Email"] = null;
            window.localStorage["rememberMe_Password"] = null;
            xdLocalStorage.removeItem("allyApiAuthToken");
            // Clear cached request results
            $cacheFactory.get('$http').removeAll();
            if (window.localStorage)
                window.localStorage.removeItem("siteInfo");
            $location.path('/Login');
        };
        // Log-out and notify the server
        $rootScope.onLogOut = function () {
            $http.get("/api/Login/Logout").then($rootScope.onLogOut_ClearData, $rootScope.onLogOut_ClearData);
        };
        // Clear the cache if needed
        $rootScope.$on('$routeChangeStart', function () {
            if (CA.clearTemplateCacheIfNeeded)
                CA.clearTemplateCacheIfNeeded($templateCache);
        });
        // Keep track of our current page
        $rootScope.$on("$routeChangeSuccess", function (event, toState, toParams, fromState) {
            //console.log( "In $routeChangeSuccess", event, toState );
            $rootScope.curPath = $location.path();
            // If there is a query string, track it
            let queryString = "";
            const path = $location.path();
            if (path.indexOf("?") !== -1)
                queryString = path.substring(path.indexOf("?"), path.length);
            // If there is a referrer, track it
            let referrer = "";
            if (fromState && fromState.name)
                referrer = $location.protocol() + "://" + $location.host() + "/#" + fromState.url;
            // Tell Segment about the route change
            analytics.page({
                path: path,
                referrer: referrer,
                search: queryString,
                url: $location.absUrl()
            });
            // Set the browser title
            if ($rootScope.publicSiteInfo && $rootScope.publicSiteInfo.fullName) {
                document.title = $rootScope.publicSiteInfo.fullName;
                if (toState.$$route && toState.$$route.originalPath) {
                    const menuItem = _.find(AppConfig.menu, menuItem => menuItem.path === toState.$$route.originalPath);
                    if (menuItem) {
                        if (menuItem.pageTitle)
                            document.title = $rootScope.publicSiteInfo.fullName + " - " + menuItem.pageTitle;
                        else if (menuItem.menuTitle)
                            document.title = $rootScope.publicSiteInfo.fullName + " - " + menuItem.menuTitle;
                    }
                }
            }
        });
    }
]);
//CA.angularApp.provider( '$exceptionHandler', {
//    $get: function( errorLogService )
//    {
//        return errorLogService;
//    }
//} );
//CA.angularApp.factory( "errorLogService", ["$log", function( $log )
//{
//    return function( exception )
//    {
//        $log.error.apply( $log, arguments );
//        if( typeof ( analytics ) !== "undefined" )
//            analytics.track( "AngularJS Error", { error: exception.message, stack: exception.stack } );
//    }
//}] );
var Ally;
(function (Ally) {
    class MenuItem_v3 {
    }
    Ally.MenuItem_v3 = MenuItem_v3;
})(Ally || (Ally = {}));

function RoutePath(path, templateUrl, controller, menuTitle, role = null) {
    if (path[0] !== '/')
        path = "/" + path;
    this.path = path;
    this.templateUrl = templateUrl;
    this.controller = controller;
    this.menuTitle = menuTitle;
    this.role = role || Role_Authorized;
    // authorized, all, manager, admin
    this.controllerAs = typeof controller === "function" ? "vm" : null;
}
function RoutePath_v2(routeOptions) {
    if (routeOptions.path[0] !== '/')
        routeOptions.path = "/" + routeOptions.path;
    this.path = routeOptions.path;
    this.templateUrl = routeOptions.templateUrl;
    this.templateHtml = routeOptions.templateHtml;
    this.controller = routeOptions.controller;
    this.menuTitle = routeOptions.menuTitle;
    this.role = routeOptions.role || Role_Authorized;
    // authorized, all, manager, admin
    this.controllerAs = typeof routeOptions.controller === "function" ? "vm" : null;
}
var Ally;
(function (Ally) {
    class RouteOptions_v3 {
    }
    Ally.RouteOptions_v3 = RouteOptions_v3;
    // For use with the newer Angular component objects
    class RoutePath_v3 {
        constructor(routeOptions) {
            this.reloadOnSearch = true;
            if (routeOptions.path[0] !== '/')
                routeOptions.path = "/" + routeOptions.path;
            this.path = routeOptions.path;
            this.templateHtml = routeOptions.templateHtml;
            this.menuTitle = routeOptions.menuTitle;
            this.role = routeOptions.role || Role_Authorized;
            this.reloadOnSearch = routeOptions.reloadOnSearch === undefined ? false : routeOptions.reloadOnSearch;
            this.pageTitle = routeOptions.pageTitle;
        }
    }
    Ally.RoutePath_v3 = RoutePath_v3;
    class AppConfigInfo {
    }
    AppConfigInfo.dwollaPreviewShortNames = ["qa", "dwollademo", "dwollademo1", "900wainslie", "elingtonvillagepoa"];
    AppConfigInfo.dwollaEnvironmentName = "prod";
    Ally.AppConfigInfo = AppConfigInfo;
    class PeriodicPaymentFrequency {
    }
    Ally.PeriodicPaymentFrequency = PeriodicPaymentFrequency;
})(Ally || (Ally = {}));
var Role_Authorized = "authorized";
var Role_All = "all";
var Role_Manager = "manager";
var Role_Admin = "admin";
// The names need to match the PeriodicPaymentFrequency enum
var PeriodicPaymentFrequencies = [
    { name: "Monthly", intervalName: "month", id: 50, signUpNote: "Billed on the 1st of each month" },
    { name: "Quarterly", intervalName: "quarter", id: 51, signUpNote: "Billed on January 1, April 1, July 1, October 1" },
    { name: "Semiannually", intervalName: "half-year", id: 52, signUpNote: "Billed on January 1 and July 1" },
    { name: "Annually", intervalName: "year", id: 53, signUpNote: "Billed on January 1" }
];
function FrequencyIdToInfo(frequencyId) {
    if (isNaN(frequencyId) || frequencyId < 50)
        return null;
    return PeriodicPaymentFrequencies[frequencyId - 50];
}
function GetLongPayPeriodNames(intervalName) {
    if (intervalName === "month") {
        return ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];
    }
    else if (intervalName === "quarter") {
        return ["Q1", "Q2", "Q3", "Q4"];
    }
    else if (intervalName === "half-year") {
        return ["First Half", "Second Half"];
    }
    return null;
}
function GetShortPayPeriodNames(intervalName) {
    if (intervalName === "month") {
        return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    }
    else if (intervalName === "quarter") {
        return ["Q1", "Q2", "Q3", "Q4"];
    }
    else if (intervalName === "half-year") {
        return ["1st Half", "2nd Half"];
    }
    return null;
}
///////////////////////////////////////////////////////////////////////////////////////////////////
// Condo Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
const CondoAllyAppConfig = {
    appShortName: "condo",
    appName: "Condo Ally",
    baseTld: "condoally.com",
    baseUrl: "https://condoally.com/",
    isChtnSite: true,
    homeName: "Unit",
    memberTypeLabel: "Resident",
    menu: [
        new Ally.RoutePath_v3({ path: "Home", templateHtml: "<chtn-home></chtn-home>", menuTitle: "Home" }),
        new Ally.RoutePath_v3({ path: "Home/DiscussionThread/:discussionThreadId", templateHtml: "<chtn-home></chtn-home>", pageTitle: "Discussion Thread" }),
        new Ally.RoutePath_v3({ path: "Info/Docs", templateHtml: "<association-info></association-info>", menuTitle: "Documents & Info", reloadOnSearch: false, pageTitle: "Documents" }),
        new Ally.RoutePath_v3({ path: "Info/:viewName", templateHtml: "<association-info></association-info>", pageTitle: "Info" }),
        new Ally.RoutePath_v3({ path: "Logbook", templateHtml: "<logbook-page></logbook-page>" }),
        new Ally.RoutePath_v3({ path: "Calendar", templateHtml: "<logbook-page></logbook-page>", menuTitle: "Calendar" }),
        new Ally.RoutePath_v3({ path: "Map", templateHtml: "<chtn-map></chtn-map>", menuTitle: "Map" }),
        new Ally.RoutePath_v3({ path: "BuildingResidents", templateHtml: "<group-members></group-members>", menuTitle: "Directory" }),
        new Ally.RoutePath_v3({ path: "Committee/:committeeId/:viewName", templateHtml: "<committee-parent></committee-parent>", pageTitle: "Committee" }),
        new Ally.RoutePath_v3({ path: "Committee/:committeeId/Home/DiscussionThread/:discussionThreadId", templateHtml: "<committee-parent></committee-parent>" }),
        new Ally.RoutePath_v3({ path: "ForgotPassword", templateHtml: "<forgot-password></forgot-password>", menuTitle: null, role: Role_All, pageTitle: "Forgot Password" }),
        new Ally.RoutePath_v3({ path: "Login", templateHtml: "<login-page></login-page>", menuTitle: null, role: Role_All, pageTitle: "Login" }),
        new Ally.RoutePath_v3({ path: "Help", templateHtml: "<help-form></help-form>", menuTitle: null, role: Role_All, pageTitle: "Help" }),
        new Ally.RoutePath_v3({ path: "SignUp", templateHtml: "<condo-sign-up-wizard></condo-sign-up-wizard>", menuTitle: null, role: Role_All }),
        new Ally.RoutePath_v3({ path: "EmailAbuse/:idValue", templateHtml: "<email-abuse></email-abuse>", role: Role_All }),
        new Ally.RoutePath_v3({ path: "DiscussionManage/:idValue", templateHtml: "<discussion-manage></discussion-manage>" }),
        new Ally.RoutePath_v3({ path: "NeighborSignUp", templateHtml: "<neighbor-sign-up></neighbor-sign-up>", role: Role_All }),
        new Ally.RoutePath_v3({ path: "GroupRedirect/:appName/:shortName", templateHtml: "<group-redirect></group-redirect>", role: Role_All }),
        new Ally.RoutePath_v3({ path: "MemberSignUp", templateHtml: "<pending-member-sign-up></pending-member-sign-up>", menuTitle: null, role: Role_All }),
        new Ally.RoutePath_v3({ path: "Page/:slug", templateHtml: "<custom-page-view></custom-page-view>", menuTitle: null, role: Role_All }),
        new Ally.RoutePath_v3({ path: "MyProfile", templateHtml: "<my-profile></my-profile>", pageTitle: "My Profile" }),
        new Ally.RoutePath_v3({ path: "ManageResidents", templateHtml: "<manage-residents></manage-residents>", menuTitle: "Residents", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "ManageCommittees", templateHtml: "<manage-committees></manage-committees>", menuTitle: "Committees", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "ManagePolls", templateHtml: "<manage-polls></manage-polls>", menuTitle: "Polls", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "Financials/OnlinePayments", templateHtml: "<financial-parent></financial-parent>", menuTitle: "Financials", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "Financials/StripeLinkRefresh", templateHtml: "<stripe-link-refresh></stripe-link-refresh>", role: Role_Manager }),
        //new Ally.RoutePath_v3( { path: "ManagePayments", templateHtml: "<div class='page'><div>Heads up! This page has moved to Manage -> Financials -> Online Payments. We will be removing this menu item soon.</div></div>", menuTitle: "Online Payments", role: Role_Manager } ),
        //new Ally.RoutePath_v3( { path: "AssessmentHistory", templateHtml: "<div class='page'><div>Heads up! This page has moved to Manage -> Financials -> Assessment History. We will be removing this menu item soon.</div></div>", menuTitle: "Assessment History", role: Role_Manager } ),
        new Ally.RoutePath_v3({ path: "Mailing/Invoice", templateHtml: "<mailing-parent></mailing-parent>", menuTitle: "Mailing", role: Role_Manager, pageTitle: "Send Invoice" }),
        new Ally.RoutePath_v3({ path: "ManageCustomPages", templateHtml: "<manage-custom-pages></manage-custom-pages>", menuTitle: "Custom Pages", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "Mailing/:viewName", templateHtml: "<mailing-parent></mailing-parent>", role: Role_Manager, pageTitle: "Mailing" }),
        new Ally.RoutePath_v3({ path: "Settings/SiteSettings", templateHtml: "<settings-parent></settings-parent>", menuTitle: "Settings", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "Settings/:viewName", templateHtml: "<settings-parent></settings-parent>", role: Role_Manager, pageTitle: "Settings" }),
        new Ally.RoutePath_v3({ path: "Financials/:viewName", templateHtml: "<financial-parent></financial-parent>", role: Role_Manager, pageTitle: "Financials" }),
        new Ally.RoutePath_v3({ path: "GroupAmenities", templateHtml: "<group-amenities></group-amenities>", role: Role_Manager, pageTitle: "Survey" }),
        new Ally.RoutePath_v3({ path: "Admin/ManageGroups", templateHtml: "<manage-groups></manage-groups>", menuTitle: "All Groups", role: Role_Admin }),
        new Ally.RoutePath_v3({ path: "Admin/ManageHomes", templateHtml: "<manage-homes></manage-homes>", menuTitle: "Homes", role: Role_Admin }),
        new Ally.RoutePath_v3({ path: "Admin/ViewActivityLog", templateHtml: "<view-activity-log></view-activity-log>", menuTitle: "Activity Log", role: Role_Admin }),
        new Ally.RoutePath_v3({ path: "Admin/ManageAddressPolys", templateHtml: "<manage-address-polys></manage-address-polys>", menuTitle: "View Groups on Map", role: Role_Admin }),
        new Ally.RoutePath_v3({ path: "Admin/ViewPolys", templateHtml: "<view-polys></view-polys>", menuTitle: "View Polygons", role: Role_Admin }),
        new Ally.RoutePath_v3({ path: "Admin/ViewResearch", templateHtml: "<view-research></view-research>", menuTitle: "View Research", role: Role_Admin }),
    ]
};
///////////////////////////////////////////////////////////////////////////////////////////////////
// Neighborhood Watch Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
//const WatchAppConfig: Ally.AppConfigInfo =
//{
//    appShortName: "watch",
//    appName: "Neighborhood Watch Ally",
//    baseTld: "watchally.org",
//    baseUrl: "https://watchally.org/",
//    menu: [
//        new RoutePath( "Home", "/ngApp/watch/member/WatchHome.html", WatchHomeCtrl, "Home" ),
//        new RoutePath( "Members", "/ngApp/watch/member/WatchMembers.html", WatchMembersCtrl, "Members" ),
//        new RoutePath( "Calendar", "/ngApp/watch/member/WatchCalendar.html", WatchCalendarCtrl, "Calendar" ),
//        new Ally.RoutePath_v3( { path: "ForgotPassword", templateHtml: "<forgot-password></forgot-password>", menuTitle: null, role: Role_All } ),
//        new Ally.RoutePath_v3( { path: "Login", templateHtml: "<login-page></login-page>", menuTitle: null, role: Role_All } ),
//        new Ally.RoutePath_v3( { path: "Help", templateHtml: "<help-form></help-form>", menuTitle: null, role: Role_All } ),
//        new Ally.RoutePath_v3( { path: "MyProfile", templateHtml: "<my-profile></my-profile>" } ),
//        new RoutePath( "ManageMembers", "/ngApp/watch/manager/ManageMembers.html", ManageMembersCtrl, "Members", Role_Manager ),
//        new RoutePath( "Settings", "/ngApp/watch/manager/Settings.html", WatchSettingsCtrl, "Settings", Role_Manager ),
//        new RoutePath( "/Admin/ManageWatchGroups", "/ngApp/Admin/ManageAssociations.html", "ManageAssociationsController", "Manage Groups", Role_Admin ),
//        new Ally.RoutePath_v3( { path: "/Admin/ViewActivityLog", templateHtml: "<view-activity-log></view-activity-log>", menuTitle: "View Activity Log", role: Role_Admin } ),
//        new Ally.RoutePath_v3( { path: "/Admin/ManageAddressPolys", templateHtml: "<manage-address-polys></manage-address-polys>", menuTitle: "Edit Addresses", role: Role_Admin } ),
//    ]
//};
///////////////////////////////////////////////////////////////////////////////////////////////////
// Service Professional Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
//const ServiceAppConfig: Ally.AppConfigInfo =
//{
//    appShortName: "service",
//    appName: "Service Professional Ally",
//    baseTld: "serviceally.org",
//    baseUrl: "https://serviceally.org/",
//    menu: [
//        new RoutePath( "Jobs", "/ngApp/service/Jobs.html", ServiceJobsCtrl, "Jobs" ),
//        new RoutePath( "BusinessInfo", "/ngApp/service/BusinessInfo.html", ServiceBusinessInfoCtrl, "Business Info" ),
//        new RoutePath( "Banking", "/ngApp/service/BankInfo.html", ServiceBankInfoCtrl, "Banking" ),
//        new Ally.RoutePath_v3( { path: "ForgotPassword", templateHtml: "<forgot-password></forgot-password>", menuTitle: null, role: Role_All } ),
//        new Ally.RoutePath_v3( { path: "Login", templateHtml: "<login-page></login-page>", menuTitle: null, role: Role_All } ),
//        new Ally.RoutePath_v3( { path: "Help", templateHtml: "<help-form></help-form>", menuTitle: null, role: Role_All } ),
//        new Ally.RoutePath_v3( { path: "MyProfile", templateHtml: "<my-profile></my-profile>" } ),
//        new Ally.RoutePath_v3( { path: "/Admin/ViewActivityLog", templateHtml: "<view-activity-log></view-activity-log>", menuTitle: "View Activity Log", role: Role_Admin } ),
//    ]
//};
///////////////////////////////////////////////////////////////////////////////////////////////////
// Home Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
const HomeAppConfig = {
    appShortName: "home",
    appName: "Home Ally",
    baseTld: "homeally.org",
    baseUrl: "https://homeally.org/",
    isChtnSite: false,
    homeName: "Home",
    memberTypeLabel: "User",
    menu: [
        //new RoutePath_v2( { path: "ToDo", templateUrl: "/ngApp/home/ToDos.html", controller: ServiceJobsCtrl, menuTitle: "Jobs" } ),
        new Ally.RoutePath_v3({ path: "SignUp", templateHtml: "<home-sign-up></home-sign-up>", role: Role_All }),
        new Ally.RoutePath_v3({ path: "ForgotPassword", templateHtml: "<forgot-password></forgot-password>", menuTitle: null, role: Role_All }),
        new Ally.RoutePath_v3({ path: "Login", templateHtml: "<login-page></login-page>", menuTitle: null, role: Role_All }),
        new Ally.RoutePath_v3({ path: "Help", templateHtml: "<help-form></help-form>", menuTitle: null, role: Role_All }),
        new Ally.RoutePath_v3({ path: "CPView/:slug", templateHtml: "<custom-page-view></custom-page-view>", menuTitle: null, role: Role_All }),
        new Ally.RoutePath_v3({ path: "MyProfile", templateHtml: "<my-profile></my-profile>" }),
        new Ally.RoutePath_v3({ path: "Home", templateHtml: "<home-group-home></home-group-home>", menuTitle: "Home" }),
        new Ally.RoutePath_v3({ path: "Info/Docs", templateHtml: "<association-info></association-info>", menuTitle: "Documents & Info" }),
        new Ally.RoutePath_v3({ path: "Info/:viewName", templateHtml: "<association-info></association-info>" }),
        new Ally.RoutePath_v3({ path: "Logbook", templateHtml: "<logbook-page></logbook-page>" }),
        new Ally.RoutePath_v3({ path: "Calendar", templateHtml: "<logbook-page></logbook-page>", menuTitle: "Calendar" }),
        new Ally.RoutePath_v3({ path: "Users", templateHtml: "<home-users></home-users>", menuTitle: "Users", role: Role_Manager }),
        //new Ally.RoutePath_v3( { path: "Map", templateHtml: "<chtn-map></chtn-map>", menuTitle: "Map" } ),
        new Ally.RoutePath_v3({ path: "Admin/ViewActivityLog", templateHtml: "<view-activity-log></view-activity-log>", menuTitle: "View Activity Log", role: Role_Admin }),
    ]
};
///////////////////////////////////////////////////////////////////////////////////////////////////
// HOA Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
const HOAAppConfig = _.clone(CondoAllyAppConfig);
HOAAppConfig.appShortName = "hoa";
HOAAppConfig.appName = "HOA Ally";
HOAAppConfig.baseTld = "hoaally.org";
HOAAppConfig.baseUrl = "https://hoaally.org/";
HOAAppConfig.homeName = "Home";
HOAAppConfig.menu.push(new Ally.RoutePath_v3({ path: "HoaSignUp", templateHtml: "<hoa-sign-up-wizard></hoa-sign-up-wizard>", role: Role_All }));
///////////////////////////////////////////////////////////////////////////////////////////////////
// Neighborhood Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
const NeighborhoodAppConfig = _.clone(CondoAllyAppConfig);
NeighborhoodAppConfig.appShortName = "neighborhood";
NeighborhoodAppConfig.appName = "Neighborhood Ally";
NeighborhoodAppConfig.baseTld = "neighborhoodally.org";
NeighborhoodAppConfig.baseUrl = "https://neighborhoodally.org/";
NeighborhoodAppConfig.homeName = "Home";
// Remove Residents and Manage Residents
NeighborhoodAppConfig.menu = _.reject(NeighborhoodAppConfig.menu, function (mi) { return mi.menuTitle === "Residents" || mi.menuTitle === "Directory"; });
// Add them back under the name "Members"
NeighborhoodAppConfig.menu.push(new Ally.RoutePath_v3({ path: "BuildingResidents", templateHtml: "<group-members></group-members>", menuTitle: "Members" }));
NeighborhoodAppConfig.menu.splice(0, 0, new Ally.RoutePath_v3({ path: "ManageResidents", templateHtml: "<manage-residents></manage-residents>", menuTitle: "Members", role: Role_Manager }));
// Remove assessment history and add dues history
NeighborhoodAppConfig.menu = _.reject(NeighborhoodAppConfig.menu, function (mi) { return mi.menuTitle === "Assessment History"; });
NeighborhoodAppConfig.menu.splice(3, 0, new Ally.RoutePath_v3({ path: "DuesHistory", menuTitle: "Dues History", templateHtml: "<dues-history></dues-history>", role: Role_Manager }));
NeighborhoodAppConfig.menu.push(new Ally.RoutePath_v3({ path: "NeighborhoodSignUp", templateHtml: "<neighborhood-sign-up-wizard></neighborhood-sign-up-wizard>", role: Role_All }));
//NeighborhoodAppConfig.menu.push( new Ally.RoutePath_v3( { path: "MemberSignUp", templateHtml: "<pending-member-sign-up></pending-member-sign-up>", role: Role_All } ) );
///////////////////////////////////////////////////////////////////////////////////////////////////
// Block Club Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
const BlockClubAppConfig = _.clone(CondoAllyAppConfig);
BlockClubAppConfig.appShortName = "block-club";
BlockClubAppConfig.appName = "Block Club Ally";
BlockClubAppConfig.baseTld = "blockclubally.org";
BlockClubAppConfig.baseUrl = "https://blockclubally.org/";
BlockClubAppConfig.homeName = "Home";
BlockClubAppConfig.memberTypeLabel = "Member";
// Remove Residents and Manage Residents
BlockClubAppConfig.menu = _.reject(BlockClubAppConfig.menu, function (mi) { return mi.menuTitle === "Residents" || mi.menuTitle === "Directory"; });
// Add them back under the name "Members"
BlockClubAppConfig.menu.push(new Ally.RoutePath_v3({ path: "BuildingResidents", templateHtml: "<group-members></group-members>", menuTitle: "Members" }));
BlockClubAppConfig.menu.splice(0, 0, new Ally.RoutePath_v3({ path: "ManageResidents", templateHtml: "<manage-residents></manage-residents>", menuTitle: "Members", role: Role_Manager }));
// Remove assessment history and add dues history
BlockClubAppConfig.menu = _.reject(BlockClubAppConfig.menu, function (mi) { return mi.menuTitle === "Assessment History"; });
BlockClubAppConfig.menu.splice(3, 0, new Ally.RoutePath_v3({ path: "AssessmentHistory", menuTitle: "Membership Dues History", templateHtml: "<assessment-history></assessment-history>", role: Role_Manager }));
BlockClubAppConfig.menu.push(new Ally.RoutePath_v3({ path: "NeighborhoodSignUp", templateHtml: "<neighborhood-sign-up-wizard></neighborhood-sign-up-wizard>", role: Role_All }));
//BlockClubAppConfig.menu.push( new Ally.RoutePath_v3( { path: "MemberSignUp", templateHtml: "<pending-member-sign-up></pending-member-sign-up>", role: Role_All } ) );
///////////////////////////////////////////////////////////////////////////////////////////////////
// PTA Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
const PtaAppConfig = _.clone(CondoAllyAppConfig);
PtaAppConfig.appShortName = "pta";
PtaAppConfig.appName = "PTA Ally";
PtaAppConfig.baseTld = "ptaally.org";
PtaAppConfig.baseUrl = "https://ptaally.org/";
PtaAppConfig.isChtnSite = false;
PtaAppConfig.homeName = "Home";
PtaAppConfig.memberTypeLabel = "Member";
PtaAppConfig.menu = [
    new Ally.RoutePath_v3({ path: "Home", templateHtml: "<chtn-home></chtn-home>", menuTitle: "Home" }),
    new Ally.RoutePath_v3({ path: "Info/Docs", templateHtml: "<association-info></association-info>", menuTitle: "Documents & Info" }),
    new Ally.RoutePath_v3({ path: "Info/:viewName", templateHtml: "<association-info></association-info>" }),
    new Ally.RoutePath_v3({ path: "Logbook", templateHtml: "<logbook-page></logbook-page>" }),
    new Ally.RoutePath_v3({ path: "Calendar", templateHtml: "<logbook-page></logbook-page>", menuTitle: "Calendar" }),
    //new Ally.RoutePath_v3( { path: "Map", templateHtml: "<chtn-map></chtn-map>", menuTitle: "Map" } ),
    new Ally.RoutePath_v3({ path: "BuildingResidents", templateHtml: "<group-members></group-members>", menuTitle: "Members" }),
    new Ally.RoutePath_v3({ path: "Committee/:committeeId/:viewName", templateHtml: "<committee-parent></committee-parent>" }),
    new Ally.RoutePath_v3({ path: "ForgotPassword", templateHtml: "<forgot-password></forgot-password>", menuTitle: null, role: Role_All }),
    new Ally.RoutePath_v3({ path: "Login", templateHtml: "<login-page></login-page>", menuTitle: null, role: Role_All }),
    new Ally.RoutePath_v3({ path: "Help", templateHtml: "<help-form></help-form>", menuTitle: null, role: Role_All }),
    new Ally.RoutePath_v3({ path: "MemberSignUp", templateHtml: "<pending-member-sign-up></pending-member-sign-up>", menuTitle: null, role: Role_All }),
    new Ally.RoutePath_v3({ path: "MyProfile", templateHtml: "<my-profile></my-profile>" }),
    new Ally.RoutePath_v3({ path: "ManageResidents", templateHtml: "<manage-residents></manage-residents>", menuTitle: "Members", role: Role_Manager }),
    new Ally.RoutePath_v3({ path: "ManageCommittees", templateHtml: "<manage-committees></manage-committees>", menuTitle: "Committees", role: Role_Manager }),
    new Ally.RoutePath_v3({ path: "ManagePolls", templateHtml: "<manage-polls></manage-polls>", menuTitle: "Polls", role: Role_Manager }),
    //new Ally.RoutePath_v3( { path: "ManagePayments", templateHtml: "<manage-payments></manage-payments>", menuTitle: "Online Payments", role: Role_Manager } ),
    new Ally.RoutePath_v3({ path: "AssessmentHistory", templateHtml: "<assessment-history></assessment-history>", menuTitle: "Membership Dues History", role: Role_Manager }),
    new Ally.RoutePath_v3({ path: "Settings", templateHtml: "<chtn-settings></chtn-settings>", menuTitle: "Settings", role: Role_Manager }),
    new Ally.RoutePath_v3({ path: "Admin/ManageGroups", templateHtml: "<manage-groups></manage-groups>", menuTitle: "All Groups", role: Role_Admin }),
    new Ally.RoutePath_v3({ path: "Admin/ViewActivityLog", templateHtml: "<view-activity-log></view-activity-log>", menuTitle: "Activity Log", role: Role_Admin }),
    new Ally.RoutePath_v3({ path: "Admin/ManageAddressPolys", templateHtml: "<manage-address-polys></manage-address-polys>", menuTitle: "View Groups on Map", role: Role_Admin })
];
var AppConfig = null;
let lowerDomain = document.domain.toLowerCase();
if (!HtmlUtil.isNullOrWhitespace(OverrideOriginalUrl) || lowerDomain === "localhost")
    lowerDomain = OverrideOriginalUrl;
if (!lowerDomain)
    console.log("Unable to find domain, make sure to set OverrideBaseApiPath and OverrideOriginalUrl at the top of ally-app.ts");
if (lowerDomain.indexOf("condo") !== -1)
    AppConfig = CondoAllyAppConfig;
//else if( lowerDomain.indexOf( "watchally" ) !== -1 )
//    AppConfig = WatchAppConfig;
//else if( lowerDomain.indexOf( "serviceally" ) !== -1 )
//    AppConfig = ServiceAppConfig;
else if (lowerDomain.indexOf("homeally") !== -1
    || lowerDomain.indexOf("helloathome") !== -1)
    AppConfig = HomeAppConfig;
else if (lowerDomain.indexOf("hoa") !== -1)
    AppConfig = HOAAppConfig;
else if (lowerDomain.indexOf("neighborhoodally") !== -1
    || lowerDomain.indexOf("helloneighborhood") !== -1)
    AppConfig = NeighborhoodAppConfig;
else if (lowerDomain.indexOf("chicagoblock") !== -1
    || lowerDomain.indexOf("blockclub") !== -1)
    AppConfig = BlockClubAppConfig;
else if (lowerDomain.indexOf("ptaally") !== -1)
    AppConfig = PtaAppConfig;
else {
    console.log("Unknown ally app");
    AppConfig = CondoAllyAppConfig;
}
// This is redundant due to how JS works, but we have it anyway to prevent confusion
window.AppConfig = AppConfig;
AppConfig.isPublicRoute = function (path) {
    // Default to the current hash
    if (!path)
        path = window.location.hash;
    // Remove the leading hashbang
    if (HtmlUtil.startsWith(path, "#!"))
        path = path.substr(2);
    // If the path has a parameter, only test the first word
    const hasParameter = path.indexOf("/", 1) !== -1;
    if (hasParameter)
        path = path.substr(0, path.indexOf("/", 1));
    const route = _.find(AppConfig.menu, function (m) {
        let testPath = m.path;
        if (!testPath)
            return false;
        // Only test the first part of paths with parameters
        if (hasParameter && testPath.indexOf("/", 1) !== -1)
            testPath = testPath.substr(0, testPath.indexOf("/", 1));
        return testPath === path;
    });
    if (!route)
        return false;
    return route.role === Role_All;
};
// Set the browser title
document.title = AppConfig.appName;
$(document).ready(function () {
    $("header").css("background-image", "url(/assets/images/header-img-" + AppConfig.appShortName + ".jpg)");
});

var Ally;
(function (Ally) {
    /**
     * The controller for the page to view membership dues payment history
     */
    class DuesHistoryController {
    }
    Ally.DuesHistoryController = DuesHistoryController;
})(Ally || (Ally = {}));
CA.angularApp.component("duesHistory", {
    templateUrl: "/ngApp/chtn/manager/dues-history.html",
    controller: Ally.DuesHistoryController
});

var Ally;
(function (Ally) {
    let PeriodicPaymentFrequency;
    (function (PeriodicPaymentFrequency) {
        PeriodicPaymentFrequency[PeriodicPaymentFrequency["Monthly"] = 50] = "Monthly";
        PeriodicPaymentFrequency[PeriodicPaymentFrequency["Quarterly"] = 51] = "Quarterly";
        PeriodicPaymentFrequency[PeriodicPaymentFrequency["Semiannually"] = 52] = "Semiannually";
        PeriodicPaymentFrequency[PeriodicPaymentFrequency["Annually"] = 53] = "Annually";
    })(PeriodicPaymentFrequency || (PeriodicPaymentFrequency = {}));
    class PeriodicPayment {
        constructor() {
            /// Indicates if this payment is simply a placeholder entry, i.e. doesn't have a backing entry in the DB
            this.isEmptyEntry = false;
        }
    }
    class AssessmentPayment extends PeriodicPayment {
    }
    Ally.AssessmentPayment = AssessmentPayment;
    class PayerInfo {
    }
    class FullPaymentHistory {
    }
    class SpecialAssessmentEntry {
    }
    /**
     * The controller for the page to view resident assessment payment history
     */
    class AssessmentHistoryController {
        /**
        * The constructor for the class
        */
        constructor($http, $location, siteInfo, appCacheService) {
            this.$http = $http;
            this.$location = $location;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.LocalStorageKey_ShowPaymentInfo = "AssessmentHistory_ShowPaymentInfo";
            this.LocalStorageKey_ShouldColorCodePayments = "AssessmentHistory_ColorCodePayment";
            this.LocalStorageKey_ShowBalanceCol = "AssessmentHistory_ShowBalanceCol";
            this.numPeriodsVisible = AssessmentHistoryController.ChtnDefaultNumPeriodsVisible;
            this.shouldShowBalanceCol = false;
            this.showRowType = "unit";
            this.isForMemberGroup = false;
            this.isSavingPayment = false;
            this.shouldColorCodePayments = false;
            this.shouldShowFillInSection = false;
            this.selectedFillInPeriod = null;
            this.shouldShowNeedsAssessmentSetup = false;
            this.hasAssessments = null;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.baseApiUri = this.siteInfo.publicSiteInfo.baseApiUrl;
            this.isForMemberGroup = AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club" || AppConfig.appShortName === "pta";
            if (this.isForMemberGroup)
                this.pageTitle = "Membership Dues Payment History";
            else
                this.pageTitle = "Assessment Payment History";
            // Show less columns for member groups since they're all annual, no need to see a decade
            this.numPeriodsVisible = AssessmentHistoryController.ChtnDefaultNumPeriodsVisible;
            if (this.isForMemberGroup)
                this.numPeriodsVisible = AssessmentHistoryController.MemberDefaultNumPeriodsVisible;
            if (this.shouldShowBalanceCol)
                --this.numPeriodsVisible;
            this.authToken = window.localStorage.getItem("ApiAuthToken");
            if (this.isForMemberGroup)
                this.showRowType = "member";
            else if (AppConfig.isChtnSite)
                this.showRowType = "unit";
            else
                console.log("Unhandled app type for payment history: " + AppConfig.appShortName);
            // Example
            //var payment =
            //{
            //    paymentId: 0,
            //    year: 2014,
            //    period: 1, // 1 = January
            //    isPaid: false,
            //    amount: 1.23,
            //    paymentDate: "1/2/14",
            //    checkNumber: "123",
            //    unitId: 1
            //};
            this.showPaymentInfo = window.localStorage[this.LocalStorageKey_ShowPaymentInfo] === "true";
            this.shouldColorCodePayments = window.localStorage[this.LocalStorageKey_ShouldColorCodePayments] === "true";
            this.shouldShowBalanceCol = window.localStorage[this.LocalStorageKey_ShowBalanceCol] === "true";
            if (!this.siteInfo.privateSiteInfo.assessmentFrequency) {
                this.hasAssessments = this.siteInfo.privateSiteInfo.hasAssessments;
                this.shouldShowNeedsAssessmentSetup = true;
                return;
            }
            this.assessmentFrequency = this.siteInfo.privateSiteInfo.assessmentFrequency;
            if (this.isForMemberGroup)
                this.assessmentFrequency = AssessmentHistoryController.PeriodicPaymentFrequency_Annually;
            // Set the period name
            this.payPeriodName = "month";
            if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Quarterly)
                this.payPeriodName = "quarter";
            else if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Semiannually)
                this.payPeriodName = "half-year";
            else if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Annually)
                this.payPeriodName = "year";
            // Set the range values
            this.maxPeriodRange = 12;
            if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Quarterly)
                this.maxPeriodRange = 4;
            else if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Semiannually)
                this.maxPeriodRange = 2;
            else if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Annually)
                this.maxPeriodRange = 1;
            this.todaysPayPeriod = this.getTodaysPayPeriod();
            // Set the label values
            //const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            //const shortMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            //const quarterNames = ["Quarter 1", "Quarter 2", "Quarter 3", "Quarter 4"];
            //const shortQuarterNames = ["Q1", "Q2", "Q3", "Q4"];
            //const semiannualNames = ["First Half", "Second Half"];
            //const shortSemiannualNames = ["1st Half", "2nd Half"];
            const payFrequencyInfo = FrequencyIdToInfo(this.assessmentFrequency);
            this.periodNames = GetLongPayPeriodNames(payFrequencyInfo.intervalName);
            this.shortPeriodNames = GetShortPayPeriodNames(payFrequencyInfo.intervalName);
            if (!this.periodNames) {
                this.periodNames = [""];
                this.shortPeriodNames = [""];
            }
            //if( this.assessmentFrequency === PeriodicPaymentFrequency_Quarterly )
            //{
            //    this.periodNames = quarterNames;
            //    this.shortPeriodNames = shortQuarterNames;
            //}
            //else if( this.assessmentFrequency === PeriodicPaymentFrequency_Semiannually )
            //{
            //    this.periodNames = semiannualNames;
            //    this.shortPeriodNames = shortSemiannualNames;
            //}
            //else if( this.assessmentFrequency === PeriodicPaymentFrequency_Annually )
            //{
            //    this.periodNames = [""];
            //    this.shortPeriodNames = [""];
            //}
            // Set the current period. We add 2 to the period so we have a buffer ahead of today's
            // date so we can show some future payments.
            this.startPeriodValue = new Date().getMonth() + 2;
            this.startYearValue = new Date().getFullYear();
            if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Quarterly) {
                this.startPeriodValue = Math.floor(new Date().getMonth() / 4) + 2;
            }
            else if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Semiannually) {
                this.startPeriodValue = Math.floor(new Date().getMonth() / 6) + 2;
            }
            else if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Annually) {
                this.startPeriodValue = 1;
                this.startYearValue = new Date().getFullYear() + 1;
            }
            // If we're past the year's number of pay periods, go to the next year
            if (this.startPeriodValue > this.maxPeriodRange) {
                this.startPeriodValue = 1;
                this.startYearValue += 1;
            }
            this.isPeriodicPaymentTrackingEnabled = this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled;
            this.retrievePaymentHistory();
            window.setTimeout(() => this.$http.get("/api/DocumentLink/0").then((response) => this.viewExportViewId = response.data.vid), 250);
            // Hook up Bootstrap v4 tooltips
            window.setTimeout(() => $('[data-toggle="tooltip"]').tooltip(), 1000);
        }
        getTodaysPayPeriod() {
            // We add 1's to periods because pay periods are 1-based, but Date.getMonth() is 0-based
            let periodValue = new Date().getMonth() + 1;
            let yearValue = new Date().getFullYear();
            if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Quarterly) {
                periodValue = Math.floor(new Date().getMonth() / 4) + 1;
            }
            else if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Semiannually) {
                periodValue = Math.floor(new Date().getMonth() / 6) + 1;
            }
            else if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Annually) {
                periodValue = 1; // Years only have one pay period
                yearValue = new Date().getFullYear();
            }
            return {
                periodValue,
                year: yearValue
            };
        }
        onChangePeriodicPaymentTracking() {
            if (this.isPeriodicPaymentTrackingEnabled === this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled)
                return;
            // If the user is enabling the tracking then make sure all units have a payment entered
            if (this.isPeriodicPaymentTrackingEnabled) {
                //if( Object.keys(vm.unitPayments).length !== SiteInfo.privateSiteInfo.NumUnits )
                //{
                //    vm.isPeriodicPaymentTrackingEnabled = false;
                //    alert( "You must specify this most recent payment for every unit." );
                //    return;
                //}
            }
            this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled = this.isPeriodicPaymentTrackingEnabled;
            this.isLoading = true;
            this.$http.put("/api/Association/updatePeriodicPaymentTracking?isPeriodicPaymentTrackingEnabled=" + this.isPeriodicPaymentTrackingEnabled, null).then(() => {
                this.isLoading = false;
            }, () => {
                alert("Failed to update the payment tracking");
                this.isLoading = false;
            });
        }
        /**
         * Add in entries to the payments array so every period has an entry
         */
        populateVisiblePaymentsForUnit(unit) {
            const defaultOwnerUserId = (unit.owners !== null && unit.owners.length > 0) ? unit.owners[0].userId : null;
            const sortedPayments = [];
            for (let periodIndex = 0; periodIndex < this.visiblePeriodEntries.length; ++periodIndex) {
                const curPeriodEntry = this.visiblePeriodEntries[periodIndex];
                let curPeriodPayment;
                if (curPeriodEntry.specialAssessmentId)
                    curPeriodPayment = _.find(unit.allPayments, p => p.specialAssessmentId === curPeriodEntry.specialAssessmentId);
                else
                    curPeriodPayment = _.find(unit.allPayments, (p) => p.period === curPeriodEntry.periodValue && p.year === curPeriodEntry.year);
                // If this pay period has not payment entry then add a filler
                if (curPeriodPayment === undefined || curPeriodPayment.isEmptyEntry) {
                    curPeriodPayment = {
                        paymentId: 0,
                        isPaid: false,
                        period: curPeriodEntry.periodValue,
                        year: curPeriodEntry.year,
                        amount: unit.assessment,
                        payerUserId: defaultOwnerUserId,
                        paymentDate: new Date(),
                        isEmptyEntry: true,
                        checkNumber: null,
                        wePayCheckoutId: null,
                        groupId: this.siteInfo.publicSiteInfo.groupId,
                        notes: null,
                        payerNotes: null,
                        paymentsInfoId: null,
                        wePayStatus: null,
                        specialAssessmentId: curPeriodEntry.specialAssessmentId,
                        unitId: unit.unitId
                    };
                }
                sortedPayments.push(curPeriodPayment);
            }
            return sortedPayments;
        }
        /**
         * Add in entries to the payments array so every period has an entry
         */
        fillInEmptyPaymentsForMember(member) {
            const sortedPayments = [];
            for (let periodIndex = 0; periodIndex < this.visiblePeriodEntries.length; ++periodIndex) {
                const curPeriod = this.visiblePeriodEntries[periodIndex];
                let curPeriodPayment;
                if (curPeriod.specialAssessmentId)
                    curPeriodPayment = _.find(member.enteredPayments, p => p.specialAssessmentId === curPeriod.specialAssessmentId);
                else
                    curPeriodPayment = _.find(member.enteredPayments, p => p.period === curPeriod.periodValue && p.year === curPeriod.year);
                if (curPeriodPayment === undefined || curPeriodPayment.isEmptyEntry) {
                    curPeriodPayment = {
                        isPaid: false,
                        paymentId: null,
                        period: curPeriod.periodValue,
                        year: curPeriod.year,
                        amount: 0,
                        payerUserId: member.userId,
                        paymentDate: new Date(),
                        isEmptyEntry: true,
                        wePayCheckoutId: null,
                        checkNumber: null,
                        notes: null,
                        payerNotes: null,
                        wePayStatus: null,
                        groupId: null,
                        paymentsInfoId: null,
                        specialAssessmentId: null
                    };
                }
                sortedPayments.push(curPeriodPayment);
            }
            return sortedPayments;
        }
        viewWePayDetails(wePayCheckoutId) {
            this.appCacheService.set("hwpid", wePayCheckoutId);
            this.$location.path("/Financials/OnlinePayments");
        }
        viewOnlinePaymentDetails(paymentsInfoId) {
            this.appCacheService.set("onpayid", paymentsInfoId.toString());
            this.$location.path("/Financials/OnlinePayments");
        }
        /**
         * Create a special assessment entry
         */
        onSaveSpecialAssessment() {
            this.isLoading = true;
            const httpMethod = this.editSpecialAssessment.specialAssessmentId ? this.$http.put : this.$http.post;
            httpMethod("/api/PaymentHistory/SpecialAssessment", this.editSpecialAssessment).then(() => {
                this.isLoading = false;
                this.editSpecialAssessment = null;
                this.retrievePaymentHistory();
            }, (httpResponse) => {
                this.isLoading = false;
                const errorMessage = httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to save special assessment: " + errorMessage);
            });
        }
        /**
         * Display the modal to create special assessments
         */
        showCreateSpecialAssessment() {
            this.editSpecialAssessment = new SpecialAssessmentEntry();
            this.editSpecialAssessment.assessmentDate = new Date();
            setTimeout(() => { $("#specialAssessmentName").focus(); }, 10);
        }
        /**
         * Go back a few pay periods
         */
        browsePast() {
            this.startPeriodValue = this.startPeriodValue - 6;
            while (this.startPeriodValue < 1) {
                this.startPeriodValue = this.maxPeriodRange + this.startPeriodValue;
                --this.startYearValue;
            }
            this.displayPaymentsForRange(this.startYearValue, this.startPeriodValue);
        }
        /**
         * Go ahead a few pay periods
         */
        browseFuture() {
            this.startPeriodValue = this.startPeriodValue + 6;
            while (this.startPeriodValue > this.maxPeriodRange) {
                this.startPeriodValue -= this.maxPeriodRange;
                ++this.startYearValue;
            }
            this.displayPaymentsForRange(this.startYearValue, this.startPeriodValue);
        }
        /*
         * Find the first special assessment entry between two dates
         */
        getSpecialAssessmentBetweenDates(startDate, endDate) {
            if (!this.specialAssessments || this.specialAssessments.length === 0)
                return null;
            let didSwapDates = false;
            if (startDate > endDate) {
                const temp = endDate;
                endDate = startDate;
                startDate = temp;
                didSwapDates = true;
            }
            const entries = this.specialAssessments.filter(e => e.assessmentDate.getTime() >= startDate.getTime() && e.assessmentDate.getTime() < endDate.getTime());
            if (didSwapDates)
                entries.reverse();
            return entries;
        }
        periodToDate(periodYear) {
            let monthIndex;
            if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Quarterly)
                monthIndex = periodYear.periodValue * 3;
            else if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Semiannually)
                monthIndex = periodYear.periodValue * 6;
            else if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Annually)
                monthIndex = 0;
            else
                monthIndex = periodYear.periodValue - 1;
            return new Date(periodYear.year, monthIndex, 1);
        }
        /**
         * Populate the display for a date range
         */
        displayPaymentsForRange(startYear, startPeriod) {
            this.startYearValue = startYear;
            this.startPeriodValue = startPeriod; // Pay period values start at 1, not 0
            this.visiblePeriodEntries = [];
            // Step from left to right in the output columns, going back a pay period each time
            const currentPeriod = new PeriodYear(this.startPeriodValue, this.startYearValue);
            let previousPeriod = null;
            for (let columnIndex = 0; columnIndex < this.numPeriodsVisible; ++columnIndex) {
                // If we stepped passed the first period, go the previous year
                if (currentPeriod.periodValue < 1) {
                    currentPeriod.periodValue = this.maxPeriodRange;
                    --currentPeriod.year;
                }
                if (previousPeriod) {
                    const currentPeriodDate = this.periodToDate(currentPeriod);
                    const previousPeriodDate = this.periodToDate(previousPeriod);
                    const specialAssessments = this.getSpecialAssessmentBetweenDates(previousPeriodDate, currentPeriodDate);
                    if (specialAssessments && specialAssessments.length > 0) {
                        for (const specEntry of specialAssessments) {
                            const specPeriodEntry = {
                                name: specEntry.assessmentName,
                                periodValue: AssessmentHistoryController.PeriodValueSpecial,
                                arrayIndex: columnIndex++,
                                year: specEntry.assessmentDate.getFullYear(),
                                isTodaysPeriod: false,
                                specialAssessmentId: specEntry.specialAssessmentId
                            };
                            this.visiblePeriodEntries.push(specPeriodEntry);
                        }
                    }
                }
                let headerName = this.shortPeriodNames[currentPeriod.periodValue - 1];
                if (currentPeriod.periodValue === 1 || currentPeriod.periodValue === this.maxPeriodRange)
                    headerName += " " + currentPeriod.year;
                if (this.isForMemberGroup)
                    headerName = currentPeriod.year + " - " + (currentPeriod.year + 1);
                const periodEntry = {
                    name: headerName,
                    periodValue: currentPeriod.periodValue,
                    arrayIndex: columnIndex,
                    year: currentPeriod.year,
                    isTodaysPeriod: currentPeriod.year === this.todaysPayPeriod.year && currentPeriod.periodValue === this.todaysPayPeriod.periodValue
                };
                this.visiblePeriodEntries.push(periodEntry);
                previousPeriod = new PeriodYear(currentPeriod.periodValue, currentPeriod.year);
                --currentPeriod.periodValue;
            }
            if (this.visiblePeriodEntries.length > this.numPeriodsVisible)
                this.visiblePeriodEntries = this.visiblePeriodEntries.slice(0, this.numPeriodsVisible);
            // Make sure every visible period has an valid entry object
            if (this.isForMemberGroup)
                _.each(this.payers, payer => payer.displayPayments = this.fillInEmptyPaymentsForMember(payer));
            else
                this.unitPayments.forEach((unit) => unit.displayPayments = this.populateVisiblePaymentsForUnit(unit));
        }
        /**
         * Populate the payment grid
         */
        retrievePaymentHistory() {
            this.isLoading = true;
            this.$http.get("/api/PaymentHistory?oldestDate=").then((httpResponse) => {
                const paymentInfo = httpResponse.data;
                this.specialAssessments = httpResponse.data.specialAssessments;
                this.shouldShowFillInSection = this.siteInfo.userInfo.isAdmin || (paymentInfo.payments.length < 2 && paymentInfo.units.length > 3);
                // Build the map of unit ID to unit information
                this.unitPayments = new Map();
                _.each(paymentInfo.units, (unit) => {
                    this.unitPayments.set(unit.unitId, unit);
                    const curEntry = this.unitPayments.get(unit.unitId);
                    // Only take the first two owners for now
                    curEntry.displayOwners = _.first(unit.owners, 2);
                    while (curEntry.displayOwners.length < 2)
                        curEntry.displayOwners.push({ name: "" });
                    curEntry.displayPayments = [];
                });
                // Add the payment information to the members
                if (this.isForMemberGroup && httpResponse.data.payers) {
                    _.each(httpResponse.data.payers, (payer) => {
                        payer.enteredPayments = _.filter(paymentInfo.payments, p => p.payerUserId === payer.userId);
                    });
                }
                // Add the payment information to the units
                _.each(paymentInfo.payments, (payment) => {
                    if (this.unitPayments.has(payment.unitId))
                        this.unitPayments.get(payment.unitId).displayPayments.push(payment);
                });
                // Store all of the payments rather than just what is visible
                _.each(paymentInfo.units, (unit) => {
                    // The newest payment will be at the start
                    unit.displayPayments = _.sortBy(unit.displayPayments, p => p.year * 100 + p.period);
                    unit.displayPayments.reverse();
                    unit.allPayments = unit.displayPayments;
                    // Since allPayments is sorted newest first, let's grab the first payment marked as paid
                    unit.estBalance = this.getEstimatedBalance(unit);
                });
                this.totalEstBalance = paymentInfo.units
                    .filter((u) => u.estBalance !== undefined && !isNaN(u.estBalance))
                    .map((u) => u.estBalance || 0)
                    .reduce((total, val) => total + val, 0);
                // Sort the units by name
                const sortedUnits = Array.from(this.unitPayments.values());
                this.nameSortedUnitPayments = Ally.HtmlUtil2.smartSortStreetAddresses(sortedUnits, "name");
                this.payers = _.sortBy(paymentInfo.payers, payer => payer.name);
                this.displayPaymentsForRange(this.startYearValue, this.startPeriodValue);
                this.isLoading = false;
            }, (response) => {
                this.isLoading = false;
                alert("Failed to retrieve payment history: " + response.data.exceptionMessage);
            });
        }
        /**
         * Determine the number of pay periods between two periods. For example, Jan 2023 to
         * Mar 2023 would be 1.
         */
        getNumPaymentsBetween(start, end) {
            if (start.year === end.year)
                return end.periodValue - start.periodValue;
            const numYearsBack = end.year - start.year;
            const yearsPaymentsMissed = (numYearsBack - 1) * this.maxPeriodRange;
            const periodsForStartYear = this.maxPeriodRange - start.periodValue;
            // Subtract to not include the end date
            return (end.periodValue + yearsPaymentsMissed + periodsForStartYear) - 1;
        }
        getEstimatedBalance(unit) {
            const mostRecentPayment = unit.allPayments.find(p => p.isPaid);
            if (!mostRecentPayment)
                return undefined;
            const paidEntries = unit.allPayments.filter(p => p.isPaid);
            const oldestPayment = paidEntries[paidEntries.length - 1];
            const startPeriod = new PeriodYear(oldestPayment.period, oldestPayment.year);
            // Add 2 to include the start and end pay periods
            const totalNumPayPeriods = this.getNumPaymentsBetween(startPeriod, this.todaysPayPeriod) + 2;
            const totalNumPayments = paidEntries.length;
            if (unit.name === "C")
                console.log("unit c", startPeriod, this.todaysPayPeriod, totalNumPayPeriods, totalNumPayments);
            const estBalance = (totalNumPayPeriods - totalNumPayments) * unit.assessment;
            // If the person is ahead on payments, still show 0 rather than negative due
            if (estBalance < 0)
                return 0;
            return estBalance;
            //let numMissedPayments = 0;
            //const todaysPayPeriod = this.getTodaysPayPeriod();
            //if( mostRecentPayment.year === todaysPayPeriod.year )
            //{
            //    return todaysPayPeriod.periodValue - mostRecentPayment.period;
            //}
            //else
            //{
            //    const numYearsBack = todaysPayPeriod.year - mostRecentPayment.year;
            //    const yearsPaymentsMissed = ( numYearsBack - 1 ) * this.maxPeriodRange;
            //    const periodsMissedForRecentYear = this.maxPeriodRange - mostRecentPayment.period;
            //    return todaysPayPeriod.periodValue + yearsPaymentsMissed + periodsMissedForRecentYear;
            //}
            //if( mostRecentPayment )
            //{
            //    let numMissedPayments = this.getEstimatedBalance( unit );
            //    // If the person is ahead on payments, still show 0 rather than negative due
            //    if( numMissedPayments <= 0 )
            //        numMissedPayments = 0;
            //    unit.estBalance = numMissedPayments * unit.assessment;
            //}
            //else
            //    unit.estBalance = undefined;
            //return 0;
        }
        /**
         * Get the amount paid by all units in a pay period
         */
        getPaymentSumForPayPeriod(periodIndex) {
            let sum = 0;
            if (AppConfig.isChtnSite) {
                const unitIds = Array.from(this.unitPayments.keys());
                for (let i = 0; i < unitIds.length; ++i) {
                    const unitId = unitIds[i];
                    const paymentInfo = this.unitPayments.get(unitId).displayPayments[periodIndex];
                    if (paymentInfo && paymentInfo.isPaid)
                        sum += paymentInfo.amount;
                }
            }
            else {
                for (let i = 0; i < this.payers.length; ++i) {
                    const paymentInfo = this.payers[i].displayPayments[periodIndex];
                    if (paymentInfo && paymentInfo.isPaid)
                        sum += paymentInfo.amount;
                }
            }
            return sum;
        }
        /**
         * Occurs when the user toggles whether or not to show payment info
         */
        onshowPaymentInfo() {
            window.localStorage[this.LocalStorageKey_ShowPaymentInfo] = this.showPaymentInfo;
            window.localStorage[this.LocalStorageKey_ShouldColorCodePayments] = this.shouldColorCodePayments;
        }
        /**
         * Occurs when the user toggles whether or not to show the balance column
         */
        onshowBalanceCol() {
            window.localStorage[this.LocalStorageKey_ShowBalanceCol] = this.shouldShowBalanceCol;
            // Show one less column so that we don't hang off the right
            if (this.isForMemberGroup)
                this.numPeriodsVisible = AssessmentHistoryController.MemberDefaultNumPeriodsVisible;
            else
                this.numPeriodsVisible = AssessmentHistoryController.ChtnDefaultNumPeriodsVisible;
            if (this.shouldShowBalanceCol)
                --this.numPeriodsVisible;
            this.displayPaymentsForRange(this.startYearValue, this.startPeriodValue);
        }
        /**
         * Occurs when the user clicks a date cell
         */
        onUnitPaymentCellClick(unit, periodPayment) {
            periodPayment.unitId = unit.unitId;
            let periodName = "";
            if (periodPayment.specialAssessmentId) {
                // Despite being on TS 4.5.5 as of this writing, the optional chaning feature causes an issue here
                const payEntry = this.specialAssessments.find(a => a.specialAssessmentId === periodPayment.specialAssessmentId);
                if (payEntry)
                    periodName = payEntry.assessmentName;
            }
            else
                periodName = this.periodNames[periodPayment.period - 1];
            this.editPayment = {
                unit: unit,
                payment: _.clone(periodPayment),
                periodName,
                filteredPayers: _.filter(this.payers, (payer) => {
                    return !_.some(unit.owners, (owner) => owner.userId === payer.userId);
                })
            };
            setTimeout(() => { $("#paid-amount-textbox").focus(); }, 10);
        }
        /**
         * Occurs when the user clicks a date cell
         */
        onMemberPaymentCellClick(payer, periodPayment) {
            periodPayment.payerUserId = payer.userId;
            this.editPayment = {
                unit: null,
                payment: _.clone(periodPayment),
                periodName: this.periodNames[periodPayment.period - 1],
                filteredPayers: null
            };
            setTimeout(() => { $("#paid-amount-textbox").focus(); }, 10);
        }
        onSavePayment(keyEvent) {
            if (keyEvent) {
                event.preventDefault();
                event.stopPropagation();
            }
            const onSave = () => {
                this.isSavingPayment = false;
                this.editPayment = null;
                this.retrievePaymentHistory();
            };
            const onError = (httpResponse) => {
                this.isSavingPayment = false;
                alert(httpResponse.data.message);
                this.editPayment = null;
            };
            // Convert invalid amount values to 0
            if (!this.editPayment.payment.amount)
                this.editPayment.payment.amount = 0;
            this.isSavingPayment = true;
            if (this.editPayment.payment.paymentId) {
                analytics.track("editAssessmentHistoryPayment");
                this.$http.put("/api/PaymentHistory", this.editPayment.payment).then(onSave, onError);
            }
            else {
                analytics.track("addAssessmentHistoryPayment");
                this.$http.post("/api/PaymentHistory", this.editPayment.payment).then(onSave, onError);
            }
            // Return false as this method may be invoked from an enter key press and we don't want
            // that to propogate
            return false;
        }
        /**
         * Mark all units as paid for a specific period
         */
        populatePaidForPeriod() {
            // This has a known issue that if there are most special assessments than columns then
            // you won't be able to view all special assessment entries
            if (!this.selectedFillInPeriod)
                return;
            const unitIds = Array.from(this.unitPayments.keys());
            this.isLoading = true;
            let numPosts = 0;
            for (let i = 0; i < unitIds.length; ++i) {
                const unitPayment = this.unitPayments.get(unitIds[i]);
                const paymentEntry = _.find(unitPayment.displayPayments, p => p.year === this.selectedFillInPeriod.year && p.period === this.selectedFillInPeriod.periodValue);
                if (paymentEntry) {
                    if (paymentEntry.isPaid)
                        continue;
                }
                const postData = {
                    Year: this.selectedFillInPeriod.year,
                    Period: this.selectedFillInPeriod.periodValue,
                    IsPaid: true,
                    Amount: unitPayment.assessment || 0,
                    PaymentDate: new Date(),
                    PayerUserId: this.siteInfo.userInfo.userId,
                    Notes: "Auto-marking all entries for " + this.selectedFillInPeriod.name.trim(),
                    unitId: unitPayment.unitId
                };
                ++numPosts;
                // Poor man's async for-loop
                window.setTimeout(() => this.$http.post("/api/PaymentHistory", postData), numPosts * 350);
            }
            window.setTimeout(() => {
                this.isLoading = false;
                this.retrievePaymentHistory();
            }, (numPosts + 1) * 350);
        }
        onExportClick(type) {
            // Get a new view token in case the user clicks export again
            window.setTimeout(() => this.$http.get("/api/DocumentLink/0").then((response) => this.viewExportViewId = response.data.vid), 500);
            analytics.track('exportAssessment' + type);
            return true;
        }
        showBulkSet() {
            this.shouldShowFillInSection = true;
            window.scrollTo(0, 0);
        }
        onPeriodHeaderClick(period) {
            if (!period.specialAssessmentId)
                return;
            this.editSpecialAssessment = this.specialAssessments.find(sa => sa.specialAssessmentId === period.specialAssessmentId);
            setTimeout(() => { $("#specialAssessmentName").focus(); }, 10);
        }
        onDeleteSpecialAssessment() {
            // If, somehow, we get in here with a new special assessment, just bail
            if (!this.editSpecialAssessment.specialAssessmentId) {
                this.editSpecialAssessment = null;
                return;
            }
            if (!confirm("Are you sure you want to delete this special assessment entry? This will delete any associated payment entires and CANNOT BE UNDONE."))
                return;
            this.isLoading = true;
            this.$http.delete("/api/PaymentHistory/SpecialAssessment/" + this.editSpecialAssessment.specialAssessmentId).then(() => {
                this.isLoading = false;
                this.editSpecialAssessment = null;
                this.retrievePaymentHistory();
            }, (httpResponse) => {
                this.isLoading = false;
                const errorMessage = httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to delete special assessment entry: " + errorMessage);
            });
        }
    }
    AssessmentHistoryController.$inject = ["$http", "$location", "SiteInfo", "appCacheService"];
    AssessmentHistoryController.PeriodicPaymentFrequency_Monthly = 50;
    AssessmentHistoryController.PeriodicPaymentFrequency_Quarterly = 51;
    AssessmentHistoryController.PeriodicPaymentFrequency_Semiannually = 52;
    AssessmentHistoryController.PeriodicPaymentFrequency_Annually = 53;
    AssessmentHistoryController.PeriodValueSpecial = 254;
    // The number of pay periods that are visible on the grid
    AssessmentHistoryController.ChtnDefaultNumPeriodsVisible = 9;
    AssessmentHistoryController.MemberDefaultNumPeriodsVisible = 8;
    Ally.AssessmentHistoryController = AssessmentHistoryController;
    class PeriodYear {
        constructor(periodValue, year) {
            this.periodValue = periodValue;
            this.year = year;
        }
    }
    class EditPaymentInfo {
    }
    class PeriodEntry {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("assessmentHistory", {
    templateUrl: "/ngApp/chtn/manager/financial/assessment-history.html",
    controller: Ally.AssessmentHistoryController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the page to track group spending
     */
    class BudgetToolController {
        /**
        * The constructor for the class
        */
        constructor($http, uiGridConstants, $q, $timeout, siteInfo) {
            this.$http = $http;
            this.uiGridConstants = uiGridConstants;
            this.$q = $q;
            this.$timeout = $timeout;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.financialCategoryMap = new Map();
            this.totalExpense = 0;
            this.totalIncome = 0;
            this.shouldRenderForPrint = false;
            this.shouldShowPrintPreviewButton = false;
            this.EditAmountTemplate = "<div class='ui-grid-cell-contents'><span data-ng-if='row.entity.hasChildren'>{{row.entity.amount | currency}}</span><span data-ng-if='!row.entity.hasChildren'>$<input type='number' style='width: 85%;' data-ng-model='row.entity.amount' data-ng-change='grid.appScope.$ctrl.onAmountChange(row.entity)' /></span></div>";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.expenseGridOptions =
                {
                    columnDefs: [
                        { field: "categoryTreeLabel", displayName: "Category", width: "*" },
                        { field: "amount", displayName: "Amount", width: 120, type: "number", cellFilter: "currency", cellTemplate: this.EditAmountTemplate }
                    ],
                    enableHorizontalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableColumnMenus: false,
                    enableRowHeaderSelection: false,
                    showTreeExpandNoChildren: false,
                    treeIndent: 20,
                    enableSorting: false,
                    enableTreeView: true,
                    showTreeRowHeader: true,
                    onRegisterApi: (gridApi) => {
                        this.expenseGridApi = gridApi;
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                        //this.expenseGridApi.treeBase.on.rowExpanded( this.$rootScope, ( row ) =>
                        //{
                        //    // console.log( "here", row );
                        //} );
                    }
                };
            this.incomeGridOptions = _.clone(this.expenseGridOptions);
            this.incomeGridOptions.onRegisterApi = (gridApi) => {
                this.incomeGridApi = gridApi;
                // Fix dumb scrolling
                HtmlUtil.uiGridFixScroll();
            };
            this.refreshData();
            this.shouldShowPrintPreviewButton = HtmlUtil.getSubdomain() === "hampshirevillageatmeadow" || HtmlUtil.getSubdomain() === "qa";
            this.groupName = this.siteInfo.publicSiteInfo.fullName;
            this.loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
            this.loadScript("https://html2canvas.hertzen.com/dist/html2canvas.min.js");
        }
        loadScript(sciptUrl) {
            const script = document.createElement("script");
            script.type = "text/javascript";
            script.src = sciptUrl;
            document.body.appendChild(script);
        }
        /**
        * Retrieve the group budgets from the server
        */
        refreshData() {
            this.isLoading = true;
            return this.$http.get("/api/Budget/PageData").then((httpResponse) => {
                this.isLoading = false;
                this.budgets = httpResponse.data.budgets;
                this.rootFinancialCategory = httpResponse.data.rootFinancialCategory;
                this.financialCategoryMap.clear();
                const visitNode = (node) => {
                    this.financialCategoryMap.set(node.financialCategoryId, node);
                    if (node.childCategories) {
                        for (let i = 0; i < node.childCategories.length; ++i)
                            visitNode(node.childCategories[i]);
                    }
                };
                visitNode(this.rootFinancialCategory);
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to retrieve data, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
            });
        }
        onAmountChange(row) {
            if (row) {
                let curParent = row.parentRow;
                while (curParent) {
                    curParent.amount = _.reduce(curParent.childRows, (memo, row) => memo + row.amount, 0);
                    curParent = curParent.parentRow;
                }
            }
            const incomeParentRow = _.find(this.curBudget.budgetRows, r => !r.parentRow && r.category.displayName === "Income");
            this.totalIncome = incomeParentRow.amount;
            const expenseLeafRows = this.curBudget.budgetRows.filter(r => !r.parentRow && r.category.displayName !== "Income");
            this.totalExpense = _.reduce(expenseLeafRows, (memo, r) => memo + r.amount, 0);
        }
        createBudget() {
            this.curBudget = new BudgetLocalEdit();
            this.curBudget.budgetName = "Unnamed";
            this.curBudget.budgetRows = [];
            const amountColumn = this.expenseGridOptions.columnDefs.find(c => c.field === "amount");
            amountColumn.cellTemplate = this.EditAmountTemplate;
            const visitNode = (curNode, depth, isIncomeRow) => {
                const hasChildren = curNode.childCategories != null && curNode.childCategories.length > 0;
                isIncomeRow = (depth === 0 && curNode.displayName === "Income") || isIncomeRow;
                if (curNode.displayName) {
                    const offsetDepth = isIncomeRow ? depth - 1 : depth;
                    const labelPrefix = BudgetToolController.catToTreePrefix(offsetDepth);
                    const parentRow = _.find(this.curBudget.budgetRows, r => r.category.financialCategoryId === curNode.parentFinancialCategoryId);
                    const newRow = {
                        financialCategoryId: curNode.financialCategoryId,
                        categoryDisplayName: curNode.displayName,
                        categoryTreeLabel: labelPrefix + curNode.displayName,
                        amount: 0,
                        $$treeLevel: offsetDepth,
                        hasChildren,
                        category: curNode,
                        parentRow,
                        childRows: [],
                        isIncomeRow,
                        parentBudgetRowId: null
                    };
                    if (parentRow)
                        newRow.parentRow.childRows.push(newRow);
                    this.curBudget.budgetRows.push(newRow);
                }
                if (!hasChildren)
                    return;
                for (let i = 0; i < curNode.childCategories.length; ++i) {
                    visitNode(curNode.childCategories[i], depth + 1, isIncomeRow);
                }
            };
            visitNode(this.rootFinancialCategory, -1, false); // Start at negative so the root's children have a level of 0
            this.refreshGridsFromCurBudget();
        }
        static catToTreePrefix(treeDepth) {
            if (treeDepth < 1)
                return "";
            const labelPrefix = Array((treeDepth - 1) * 4).join(String.fromCharCode(160)) + "|--";
            return labelPrefix;
        }
        loadBudget(budget) {
            const getCatDepth = (category, depth = 0) => {
                if (!category)
                    return depth;
                if (category.parentFinancialCategoryId && this.financialCategoryMap.has(category.parentFinancialCategoryId))
                    return getCatDepth(this.financialCategoryMap.get(category.parentFinancialCategoryId), depth + 1);
                return depth;
            };
            const amountColumn = this.expenseGridOptions.columnDefs.find(c => c.field === "amount");
            if (budget.finalizedDateUtc)
                amountColumn.cellTemplate = null;
            else
                amountColumn.cellTemplate = this.EditAmountTemplate;
            const editRows = budget.rows.map(r => {
                const cat = this.financialCategoryMap.has(r.financialCategoryId) ? this.financialCategoryMap.get(r.financialCategoryId) : undefined;
                const treeDepth = getCatDepth(cat);
                const offsetDepth = treeDepth; //isIncomeRow ? depth - 1 : depth;
                const labelPrefix = BudgetToolController.catToTreePrefix(offsetDepth);
                const editRow = {
                    amount: r.amount,
                    categoryDisplayName: r.categoryDisplayName,
                    financialCategoryId: r.financialCategoryId,
                    budgetId: r.budgetId,
                    budgetRowId: r.budgetRowId,
                    $$treeLevel: treeDepth,
                    category: cat,
                    childRows: [],
                    categoryTreeLabel: labelPrefix + (cat ? cat.displayName : r.categoryDisplayName),
                    hasChildren: false,
                    isIncomeRow: false,
                    parentRow: null,
                    parentBudgetRowId: r.parentBudgetRowId
                };
                return editRow;
            });
            // Fill in children and set the parent
            for (let i = 0; i < editRows.length; ++i) {
                const curRow = editRows[i];
                const curCat = curRow.category;
                if (curCat) {
                    curRow.hasChildren = curCat.childCategories && curCat.childCategories.length > 0;
                    if (curRow.hasChildren) {
                        const childCatIds = _.map(curCat.childCategories, c => c.financialCategoryId);
                        curRow.childRows = editRows.filter(r => childCatIds.indexOf(r.financialCategoryId) >= 0);
                    }
                    if (curCat.parentFinancialCategoryId)
                        curRow.parentRow = _.find(editRows, r => r.financialCategoryId === curCat.parentFinancialCategoryId);
                }
                else if (curRow.parentBudgetRowId) {
                    curRow.parentRow = _.find(editRows, r => r.budgetRowId === curRow.parentBudgetRowId);
                    curRow.childRows = editRows.filter(r => r.parentBudgetRowId === curRow.budgetRowId);
                }
            }
            const incomeCategory = this.rootFinancialCategory.childCategories.find(c => c.displayName === "Income");
            const incomeRoot = editRows.find(r => r.financialCategoryId === incomeCategory.financialCategoryId);
            const markIncome = (row) => {
                row.isIncomeRow = true;
                --row.$$treeLevel; // We don't show the top level
                row.categoryTreeLabel = BudgetToolController.catToTreePrefix(row.$$treeLevel) + row.categoryDisplayName;
                if (row.childRows)
                    row.childRows.forEach(r => markIncome(r));
            };
            markIncome(incomeRoot);
            this.curBudget = {
                budgetId: budget.budgetId,
                budgetName: budget.budgetName,
                budgetRows: editRows
            };
            this.refreshGridsFromCurBudget();
        }
        refreshGridsFromCurBudget() {
            const incomeRows = this.curBudget.budgetRows.filter(r => r.$$treeLevel >= 0 && r.isIncomeRow);
            this.incomeGridOptions.data = incomeRows;
            this.incomeGridOptions.minRowsToShow = incomeRows.length;
            this.incomeGridOptions.virtualizationThreshold = incomeRows.length;
            const expenseRows = this.curBudget.budgetRows.filter(r => !r.isIncomeRow);
            this.expenseGridOptions.data = expenseRows;
            this.expenseGridOptions.minRowsToShow = expenseRows.length;
            this.expenseGridOptions.virtualizationThreshold = expenseRows.length;
            this.$timeout(() => {
                this.expenseGridApi.treeBase.expandAllRows();
                this.incomeGridApi.treeBase.expandAllRows();
            }, 50);
            this.onAmountChange(null);
        }
        closeBudget() {
            this.curBudget = null;
            this.selectedBudget = null;
            this.incomeGridOptions.data = [];
            this.expenseGridOptions.data = [];
        }
        saveBudget() {
            if (this.curBudget.budgetId)
                this.saveExistingBudget();
            else
                this.saveNewBudget();
        }
        saveExistingBudget(refreshAfterSave = true) {
            this.isLoading = true;
            // Create a slimmed down version
            const putData = {
                budgetId: this.curBudget.budgetId,
                budgetName: this.curBudget.budgetName,
                rows: _.map(this.curBudget.budgetRows, r => {
                    return {
                        budgetRowId: r.budgetRowId,
                        amount: r.amount,
                        financialCategoryId: r.financialCategoryId
                    };
                })
            };
            return this.$http.put("/api/Budget", putData).then(() => {
                this.isLoading = false;
                if (refreshAfterSave)
                    this.completeRefresh();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
                return Promise.reject(httpResponse);
            });
        }
        saveNewBudget() {
            this.isLoading = true;
            // Create a slimmed down version
            const postData = {
                budgetId: 0,
                budgetName: this.curBudget.budgetName,
                rows: _.map(this.curBudget.budgetRows, r => {
                    return {
                        budgetRowId: 0,
                        amount: r.amount,
                        financialCategoryId: r.financialCategoryId
                    };
                })
            };
            this.$http.post("/api/Budget", postData).then(() => {
                this.isLoading = false;
                this.completeRefresh();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to retrieve data, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user selects a budget to view
         */
        onBudgetSelected() {
            if (!this.selectedBudget)
                return;
            this.loadBudget(this.selectedBudget);
        }
        /**
         * Occurs when the user presses the button to delete a budget
         */
        deleteBudget() {
            if (!confirm("Are you sure you want to deleted this budget?"))
                return;
            this.isLoading = true;
            this.$http.delete("/api/Budget/" + this.curBudget.budgetId).then(() => {
                this.isLoading = false;
                this.completeRefresh();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to delete, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
            });
        }
        completeRefresh() {
            this.curBudget = null;
            this.selectedBudget = null;
            this.incomeGridOptions.data = [];
            this.expenseGridOptions.data = [];
            return this.refreshData();
        }
        finalizeBudget() {
            if (!confirm("This makes the budget permanently read-only. Are you sure you want to finalize the budget?"))
                return;
            this.isLoading = true;
            this.saveExistingBudget(false).then(() => {
                this.$http.put("/api/Budget/Finalize/" + this.curBudget.budgetId, null).then(() => {
                    this.isLoading = false;
                    this.curBudget = null;
                    this.selectedBudget = null;
                    this.incomeGridOptions.data = [];
                    this.expenseGridOptions.data = [];
                    this.completeRefresh();
                }, (httpResponse) => {
                    this.isLoading = false;
                    alert("Failed to finalize, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
                });
            }, () => {
                this.isLoading = false;
                // Error is prompted via saveExistingBudget
            });
        }
        exportToCsv() {
            // We're sort of hacking the CSV logic to work for budgets since there's not a clear
            // column / row structure to it
            const csvColumns = [
                {
                    headerText: "",
                    fieldName: "col0"
                },
                {
                    headerText: "",
                    fieldName: "col1"
                },
                {
                    headerText: "",
                    fieldName: "col2"
                },
                {
                    headerText: "",
                    fieldName: "col3"
                },
                {
                    headerText: "",
                    fieldName: "col4"
                }
            ];
            const expenseRows = this.expenseGridOptions.data;
            const incomeRows = this.incomeGridOptions.data;
            const maxRows = Math.max(expenseRows.length, incomeRows.length);
            const csvRows = [];
            csvRows.push(new BudgetCsvRow("Budget:", this.curBudget.budgetName));
            csvRows.push(new BudgetCsvRow());
            csvRows.push(new BudgetCsvRow("Expenses", "", "", "Income"));
            const getSlashedLabel = (row) => {
                if (!row.parentRow)
                    return row.categoryDisplayName;
                return getSlashedLabel(row.parentRow) + "/" + row.categoryDisplayName;
            };
            for (let i = 0; i < maxRows; ++i) {
                const newRow = new BudgetCsvRow();
                if (i < expenseRows.length) {
                    newRow.col0 = getSlashedLabel(expenseRows[i]);
                    newRow.col1 = (expenseRows[i].amount || 0).toString();
                }
                if (i < incomeRows.length) {
                    newRow.col3 = getSlashedLabel(incomeRows[i]);
                    if (newRow.col3.startsWith("Income/"))
                        newRow.col3 = newRow.col3.substring("Income/".length);
                    newRow.col4 = (incomeRows[i].amount || 0).toString();
                }
                csvRows.push(newRow);
            }
            csvRows.push(new BudgetCsvRow("Expense Total", this.totalExpense.toString(), "", "Income Total", this.totalIncome.toString()));
            csvRows.push(new BudgetCsvRow());
            csvRows.push(new BudgetCsvRow("", "Net", (this.totalIncome - this.totalExpense).toString()));
            const csvDataString = Ally.createCsvString(csvRows, csvColumns, false);
            const fileName = "budget-" + Ally.HtmlUtil2.removeNonAlphanumeric(this.curBudget.budgetName) + ".csv";
            Ally.HtmlUtil2.downloadCsv(csvDataString, fileName);
        }
        /**
         * Occurs when the user presses the button to delete a budget
         */
        cloneBudget() {
            const newName = prompt("Enter the new, cloned budget's name:");
            if (!newName)
                return;
            const cloneInfo = {
                newName,
                budgetId: this.curBudget.budgetId
            };
            this.isLoading = true;
            this.$http.put("/api/Budget/Clone", cloneInfo).then((httpResponse) => {
                this.isLoading = false;
                this.completeRefresh().then(() => {
                    // Select the newly created budget
                    this.selectedBudget = this.budgets.find(b => b.budgetId === httpResponse.data);
                    this.onBudgetSelected();
                });
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to clone, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
            });
        }
        static generatePdfForElement(elementId, $q) {
            const deferred = $q.defer();
            html2canvas(document.getElementById(elementId)).then((canvas) => {
                const imgData = canvas.toDataURL("image/jpeg", 0.98);
                const jsPDF = window.jspdf;
                const pdfOpts = {
                    orientation: 'p',
                    unit: 'mm',
                    format: "letter",
                    putOnlyUsedFonts: true,
                    floatPrecision: 16,
                    title: "care-team-dashboard"
                };
                const pdfDoc = new jsPDF.jsPDF(pdfOpts);
                const padding = 7;
                const pdfPageWidth = pdfDoc.internal.pageSize.getWidth();
                const pdfPageHeight = pdfDoc.internal.pageSize.getHeight();
                // Scale to fit on one page vertically
                //const targetImgHeight = pdfPageHeight - ( padding * 2 );
                //const targetImgWidth = ( canvas.width * targetImgHeight ) / canvas.height;
                //const xOffset = ( pdfPageWidth - targetImgWidth ) / 2;
                //pdfDoc.addImage( imgData, 'JPEG', xOffset, padding, targetImgWidth, targetImgHeight );
                // Scale so it fits fills the page width
                const targetImgWidth = pdfPageWidth - (padding * 2);
                const targetImgHeight = (canvas.height * targetImgWidth) / canvas.width;
                const xOffset = (pdfPageWidth - targetImgWidth) / 2;
                const numPages = Math.ceil(targetImgHeight / pdfPageHeight);
                pdfDoc.addImage(imgData, 'JPEG', xOffset, padding, targetImgWidth, targetImgHeight);
                for (let pageIndex = 1; pageIndex < numPages; ++pageIndex) {
                    pdfDoc.addPage("letter", "portrait");
                    const yOffset = (pdfPageHeight * -pageIndex) + padding;
                    pdfDoc.addImage(imgData, 'JPEG', xOffset, yOffset, targetImgWidth, targetImgHeight);
                }
                //pdfDoc.save( "download.pdf" );
                //pdfDoc.output( 'dataurlnewwindow' );
                deferred.resolve(pdfDoc);
            }, (error) => {
                deferred.reject(error);
            });
            return deferred.promise;
        }
        generatePdf() {
            this.isLoading = true;
            this.shouldRenderForPrint = true;
            this.$timeout(() => {
                BudgetToolController.generatePdfForElement("budget-data-container", this.$q).then((pdfDoc) => {
                    this.isLoading = false;
                    this.shouldRenderForPrint = false;
                    window.open(URL.createObjectURL(pdfDoc.output("blob")));
                }, () => {
                    this.isLoading = false;
                    this.shouldRenderForPrint = false;
                    alert("Failed to generated PDF locally, please contact support");
                });
            }, 10);
        }
    }
    BudgetToolController.$inject = ["$http", "uiGridConstants", "$q", "$timeout", "SiteInfo"];
    Ally.BudgetToolController = BudgetToolController;
    class BudgetCsvRow {
        constructor(c0 = "", c1 = "", c2 = "", c3 = "", c4 = "") {
            this.col0 = c0;
            this.col1 = c1;
            this.col2 = c2;
            this.col3 = c3;
            this.col4 = c4;
        }
    }
    class SaveBudgetRow {
    }
    class SaveBudget {
    }
    class BudgetPageInfo {
    }
    class BudgetDto {
    }
    class BudgetLocalEdit {
    }
    class BudgetRowDto {
    }
    class BudgetRowLocalEdit extends BudgetRowDto {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("budgetTool", {
    bindings: {},
    templateUrl: "/ngApp/chtn/manager/financial/budget-tool.html",
    controller: Ally.BudgetToolController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the component to manage financial categories
     */
    class FinancialCategoryManagerController {
        /**
        * The constructor for the class
        */
        constructor($http, siteInfo, appCacheService, $rootScope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.$rootScope = $rootScope;
            this.isLoading = false;
            this.selectedCategory = null;
            this.newCategoryParent = null;
            this.deleteCategoryRessignTo = null;
            this.shouldShowNewCategoryArea = false;
            this.shouldShowDeleteCategoryArea = false;
            this.didMakeChanges = false;
            this.preselectById = null;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.refresh();
        }
        /**
         * Load all of the data on the page
         */
        refresh() {
            this.isLoading = true;
            this.$http.get(`/api/Ledger/FinancialCategories`).then((httpResponse) => {
                this.isLoading = false;
                this.rootFinancialCategory = httpResponse.data;
                this.flatCategoryList = [];
                const visitNode = (curNode, depth) => {
                    if (curNode.displayName) {
                        let labelPrefix = "";
                        if (depth > 1)
                            labelPrefix = Array((depth - 2) * 4).join(String.fromCharCode(160)) + "|--";
                        curNode.dropDownLabel = labelPrefix + curNode.displayName;
                        this.flatCategoryList.push(curNode);
                    }
                    if (curNode.childCategories == null || curNode.childCategories.length == 0)
                        return;
                    for (let i = 0; i < curNode.childCategories.length; ++i) {
                        visitNode(curNode.childCategories[i], depth + 1);
                    }
                };
                visitNode(this.rootFinancialCategory, 0);
                this.selectedCategory = this.flatCategoryList[0];
                if (this.preselectById) {
                    const preselectCat = this.flatCategoryList.filter(c => c.financialCategoryId === this.preselectById);
                    if (preselectCat && preselectCat.length > 0)
                        this.selectedCategory = preselectCat[0];
                    this.preselectById = null;
                }
                this.onCategorySelected();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to retrieve data, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
        * Occurs when a category is selected from the list
        */
        onCategorySelected() {
            this.editName = this.selectedCategory ? this.selectedCategory.displayName : "";
        }
        /**
        * Called when the user wants to close the manager
        */
        closeManager() {
            this.onClosed({ didMakeChanges: this.didMakeChanges });
        }
        /**
        * Display the section to add a new category
        */
        showNewCategoryArea() {
            this.shouldShowNewCategoryArea = true;
            this.shouldShowDeleteCategoryArea = false;
            this.newName = "";
            this.newCategoryParent = null;
        }
        /**
        * Update a category name
        */
        updateCategoryName() {
            if (!this.editName) {
                alert("Please enter a name");
                return;
            }
            this.isLoading = true;
            const putUri = `/api/Ledger/FinancialCategory/UpdateName/${this.selectedCategory.financialCategoryId}?newName=${encodeURIComponent(this.editName)}`;
            this.$http.put(putUri, null).then((httpResponse) => {
                this.isLoading = false;
                this.didMakeChanges = true;
                this.shouldShowNewCategoryArea = false;
                this.newName = "";
                this.preselectById = this.selectedCategory.financialCategoryId;
                this.refresh();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to update: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
        * Called when the user wants to add a new category
        */
        saveNewCategory() {
            if (!this.newName) {
                alert("Please enter a name");
                return;
            }
            this.isLoading = true;
            let postUri = `/api/Ledger/FinancialCategory/Add?name=${encodeURIComponent(this.newName)}`;
            if (this.newCategoryParent)
                postUri += "&parentCategoryId=" + this.newCategoryParent.financialCategoryId;
            this.$http.post(postUri, null).then((httpResponse) => {
                this.isLoading = false;
                this.didMakeChanges = true;
                this.preselectById = httpResponse.data;
                this.shouldShowNewCategoryArea = false;
                this.refresh();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
        * Called when the user wants to remove a category
        */
        deleteCategory() {
            if (this.selectedCategory.displayName === "Income") {
                alert("You cannot delete the income category");
                return;
            }
            this.isLoading = true;
            let deleteUri = `/api/Ledger/FinancialCategory/${this.selectedCategory.financialCategoryId}`;
            if (this.deleteCategoryRessignTo)
                deleteUri += "?reassignToCategoryId=" + this.deleteCategoryRessignTo.financialCategoryId;
            this.$http.delete(deleteUri).then((httpResponse) => {
                this.isLoading = false;
                this.didMakeChanges = true;
                this.shouldShowDeleteCategoryArea = false;
                this.refresh();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to delete: " + httpResponse.data.exceptionMessage);
            });
        }
    }
    FinancialCategoryManagerController.$inject = ["$http", "SiteInfo", "appCacheService", "$rootScope"];
    Ally.FinancialCategoryManagerController = FinancialCategoryManagerController;
})(Ally || (Ally = {}));
CA.angularApp.component("financialCategoryManager", {
    bindings: {
        onClosed: "&"
    },
    templateUrl: "/ngApp/chtn/manager/financial/financial-category-manager.html",
    controller: Ally.FinancialCategoryManagerController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the financial parent view
     */
    class FinancialParentController {
        /**
        * The constructor for the class
        */
        constructor($http, siteInfo, $routeParams, $cacheFactory, $rootScope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$routeParams = $routeParams;
            this.$cacheFactory = $cacheFactory;
            this.$rootScope = $rootScope;
            this.selectedView = null;
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            if (HtmlUtil.isValidString(this.$routeParams.viewName))
                this.selectedView = this.$routeParams.viewName;
            else
                this.selectedView = "OnlinePayments";
        }
    }
    FinancialParentController.$inject = ["$http", "SiteInfo", "$routeParams", "$cacheFactory", "$rootScope"];
    Ally.FinancialParentController = FinancialParentController;
})(Ally || (Ally = {}));
CA.angularApp.component("financialParent", {
    templateUrl: "/ngApp/chtn/manager/financial/financial-parent.html",
    controller: Ally.FinancialParentController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the page to track group spending
     */
    class FinancialReportsController {
        /**
        * The constructor for the class
        */
        constructor($http, siteInfo, appCacheService, $location) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.$location = $location;
            this.isLoading = false;
            this.incomeByCategoryData = null;
            this.incomeByCategoryLabels = null;
            this.incomeByCategoryCatIds = null;
            this.expenseByCategoryData = null;
            this.expenseByCategoryLabels = null;
            this.expenseByCategoryCatIds = null;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            if (window.sessionStorage.getItem("financialReport_startDate"))
                this.startDate = new Date(parseInt(window.sessionStorage.getItem("financialReport_startDate")));
            if (!this.startDate || isNaN(this.startDate.getTime()))
                this.startDate = moment().subtract(1, 'year').toDate();
            if (window.sessionStorage.getItem("financialReport_endDate"))
                this.endDate = new Date(parseInt(window.sessionStorage.getItem("financialReport_endDate")));
            if (!this.endDate || isNaN(this.endDate.getTime()))
                this.endDate = moment().toDate();
            const innerThis = this;
            this.doughnutChartOptions = {
                onClick: function (event) {
                    const elements = this.getElementAtEvent(event);
                    if (elements.length) {
                        const elem = elements[0];
                        const isExpenseChart = event.target.id === "expense-category-chart";
                        let categoryId;
                        if (isExpenseChart) {
                            //console.log( "Clicked on expense category: " + innerThis.expenseByCategoryLabels[elem._index] );
                            categoryId = innerThis.expenseByCategoryCatIds[elem._index];
                        }
                        else {
                            console.log("Clicked on income category: " + innerThis.incomeByCategoryLabels[elem._index]);
                            categoryId = innerThis.incomeByCategoryCatIds[elem._index];
                        }
                        innerThis.appCacheService.set("ledger_preselect_start", innerThis.startDate.getTime().toString());
                        innerThis.appCacheService.set("ledger_preselect_end", innerThis.endDate.getTime().toString());
                        innerThis.appCacheService.set("ledger_preselect_categoryId", categoryId.toString());
                        window.location.href = "/#!/Financials/BankTransactions";
                        //console.log( "in new", element[0] )
                    }
                },
            };
            this.refreshData();
        }
        /**
        * Retrieve the report data
        */
        refreshData() {
            this.isLoading = true;
            this.$http.get(`/api/FinancialReports/ChartData?startDate=${encodeURIComponent(this.startDate.toISOString())}&endDate=${encodeURIComponent(this.endDate.toISOString())}`).then((httpResponse) => {
                this.isLoading = false;
                this.reportData = httpResponse.data;
                this.reportData.incomeByCategory = _.sortBy(this.reportData.incomeByCategory, e => e.amount);
                this.incomeByCategoryData = _.map(this.reportData.incomeByCategory, e => Math.abs(e.amount));
                this.incomeByCategoryLabels = _.map(this.reportData.incomeByCategory, e => e.parentFinancialCategoryName);
                this.incomeByCategoryCatIds = _.map(this.reportData.incomeByCategory, e => e.parentFinancialCategoryId);
                this.reportData.expenseByCategory = _.sortBy(this.reportData.expenseByCategory, e => e.amount);
                this.expenseByCategoryData = _.map(this.reportData.expenseByCategory, e => Math.abs(e.amount));
                this.expenseByCategoryLabels = _.map(this.reportData.expenseByCategory, e => e.parentFinancialCategoryName);
                this.expenseByCategoryCatIds = _.map(this.reportData.expenseByCategory, e => e.parentFinancialCategoryId);
                window.sessionStorage.setItem("financialReport_startDate", this.startDate.getTime().toString());
                window.sessionStorage.setItem("financialReport_endDate", this.endDate.getTime().toString());
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to retrieve report data: " + httpResponse.data.exceptionMessage);
            });
        }
        onByCategoryClickChart(points, event) {
            if (!points || points.length === 0)
                return;
            const isExpenseChart = points[0]._chart.canvas.id === "expense-category-chart";
            console.log("Clicked", isExpenseChart, points[0], event);
            if (isExpenseChart) {
                console.log("Clicked on expense category: " + this.expenseByCategoryLabels[points[0]._index]);
            }
            else
                console.log("Clicked on income category: " + this.incomeByCategoryLabels[points[0]._index]);
        }
    }
    FinancialReportsController.$inject = ["$http", "SiteInfo", "appCacheService", "$location"];
    Ally.FinancialReportsController = FinancialReportsController;
    class DoughnutChartEntry {
    }
    class BalanceEntry {
    }
    class AccountBalanceMonth {
    }
    class FinancialReportData {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("financialReports", {
    templateUrl: "/ngApp/chtn/manager/financial/financial-reports.html",
    controller: Ally.FinancialReportsController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the page to track group spending
     */
    class LedgerController {
        /**
        * The constructor for the class
        */
        constructor($http, siteInfo, appCacheService, uiGridConstants, $rootScope, $timeout) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.uiGridConstants = uiGridConstants;
            this.$rootScope = $rootScope;
            this.$timeout = $timeout;
            this.isLoading = false;
            this.isLoadingEntries = false;
            this.shouldExpandPending = false;
            this.ledgerAccounts = [];
            this.accountsNeedingLogin = [];
            this.shouldShowAddTransaction = false;
            this.editAccount = null;
            this.editingTransaction = null;
            this.createAccountInfo = null;
            this.HistoryPageSize = 50;
            this.plaidHandler = null;
            this.newPlaidAccounts = [];
            this.hasPlaidAccounts = false;
            this.filter = new FilterCriteria();
            this.isPremiumPlanActive = false;
            this.ManageCategoriesDropId = -15;
            this.shouldShowCategoryEditModal = false;
            this.spendingChartData = null;
            this.spendingChartLabels = null;
            this.showDonut = true;
            this.isSuperAdmin = false;
            this.shouldShowImportModal = false;
            this.shouldShowOwnerFinanceTxn = false;
            this.hasActiveTxGridColFilter = false;
            this.uiGridCategoryDropDown = [];
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            this.isSuperAdmin = this.siteInfo.userInfo.isAdmin;
            this.homeName = AppConfig.homeName || "Unit";
            this.shouldShowOwnerFinanceTxn = this.siteInfo.privateSiteInfo.shouldShowOwnerFinanceTxn;
            // A callback to calculate the sum for a column across all ui-grid pages, not just the visible page
            const addAmountOverAllRows = () => {
                const allGridRows = this.ledgerGridApi.grid.rows;
                const visibleGridRows = allGridRows.filter(r => r.visible && r.entity && !isNaN(r.entity.amount));
                let sum = 0;
                visibleGridRows.forEach(item => sum += (item.entity.amount || 0));
                return sum;
            };
            this.ledgerGridOptions =
                {
                    columnDefs: [
                        { field: 'transactionDate', displayName: 'Date', width: 70, type: 'date', cellFilter: "date:'shortDate'", enableFiltering: false },
                        {
                            field: 'accountName', filter: {
                                type: this.uiGridConstants.filter.SELECT,
                                selectOptions: []
                            }, displayName: 'Account', enableCellEdit: false, width: 140, enableFiltering: true
                        },
                        { field: 'description', displayName: 'Description', enableCellEditOnFocus: true, enableFiltering: true, filter: { placeholder: "search" } },
                        { field: 'categoryDisplayName', editModelField: "financialCategoryId", displayName: 'Category', width: 170, editableCellTemplate: "ui-grid/dropdownEditor", editDropdownOptionsArray: [], enableFiltering: true },
                        { field: 'unitGridLabel', editModelField: "associatedUnitId", displayName: this.homeName, width: 120, editableCellTemplate: "ui-grid/dropdownEditor", editDropdownOptionsArray: [], enableFiltering: true },
                        { field: 'amount', displayName: 'Amount', width: 140, type: 'number', cellFilter: "currency", enableFiltering: true, aggregationType: addAmountOverAllRows, footerCellTemplate: '<div class="ui-grid-cell-contents">Total: {{col.getAggregationValue() | currency }}</div>' },
                        { field: 'id', displayName: 'Actions', enableSorting: false, enableCellEdit: false, enableFiltering: false, width: 90, cellTemplate: '<div class="ui-grid-cell-contents text-center"><img style="cursor: pointer;" data-ng-click="grid.appScope.$ctrl.editEntry( row.entity )" src="/assets/images/pencil-active.png" /><span class="close-x mt-0 mb-0 ml-3" data-ng-click="grid.appScope.$ctrl.deleteEntry( row.entity )" style="color: red; margin-left: 18px;">&times;</span></div>' }
                    ],
                    enableFiltering: true,
                    enableSorting: true,
                    showColumnFooter: true,
                    enableHorizontalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableColumnMenus: false,
                    enablePaginationControls: true,
                    paginationPageSize: this.HistoryPageSize,
                    paginationPageSizes: [this.HistoryPageSize],
                    enableRowSelection: true,
                    enableSelectAll: true,
                    enableFullRowSelection: false,
                    enableRowHeaderSelection: true,
                    onRegisterApi: (gridApi) => {
                        this.ledgerGridApi = gridApi;
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                        gridApi.edit.on.afterCellEdit(this.$rootScope, (rowEntity, colDef, newValue, oldValue) => {
                            console.log('edited row amount:' + rowEntity.amount + ' Column', colDef, ' newValue:' + newValue + ' oldValue:' + oldValue);
                            // Ignore no changes
                            if (oldValue === newValue)
                                return;
                            if (colDef.field === "categoryDisplayName" && rowEntity.financialCategoryId === this.ManageCategoriesDropId) {
                                rowEntity.financialCategoryId = oldValue;
                                this.shouldShowCategoryEditModal = true;
                                return;
                            }
                            const catEntry = this.flatCategoryList.find(c => c.financialCategoryId === rowEntity.financialCategoryId);
                            rowEntity.categoryDisplayName = catEntry ? catEntry.displayName : null;
                            const unitEntry = this.unitListEntries.find(c => c.unitId === rowEntity.associatedUnitId);
                            rowEntity.unitGridLabel = unitEntry ? unitEntry.unitWithOwnerLast : null;
                            this.$http.put("/api/Ledger/UpdateEntry", rowEntity).then(() => this.regenerateDateDonutChart());
                            //vm.msg.lastCellEdited = 'edited row id:' + rowEntity.id + ' Column:' + colDef.name + ' newValue:' + newValue + ' oldValue:' + oldValue;
                            //$scope.$apply();
                        });
                        gridApi.core.on.filterChanged(this.$rootScope, () => {
                            let hasFilter = false;
                            //let s = "";
                            for (let i = 0; i < gridApi.grid.columns.length; ++i) {
                                if (gridApi.grid.columns[i].filters && gridApi.grid.columns[i].filters.length > 0 && gridApi.grid.columns[i].filters[0].term) {
                                    hasFilter = true;
                                    break;
                                }
                                //    s += `|${gridApi.grid.columns[i].displayName}=${gridApi.grid.columns[i].filters[0].condition}`;
                            }
                            console.log("filterChanged", "hasFilter", hasFilter);
                            const needsFilterUpdate = this.hasActiveTxGridColFilter !== hasFilter;
                            this.hasActiveTxGridColFilter = hasFilter;
                            if (needsFilterUpdate)
                                this.updateLocalData();
                        });
                        const onSelectionChange = () => {
                            this.selectedEntries = _.clone(gridApi.selection.getSelectedRows());
                            let hasSplitTx = false;
                            for (const curRow of this.selectedEntries) {
                                if (curRow.isSplit) {
                                    gridApi.selection.unSelectRow(curRow);
                                    hasSplitTx = true;
                                }
                            }
                            this.selectedEntries = _.clone(gridApi.selection.getSelectedRows());
                            if (hasSplitTx)
                                alert("You cannot bulk recategorize split transactions. Split rows have been deslected.");
                        };
                        gridApi.selection.on.rowSelectionChanged(this.$rootScope, () => onSelectionChange());
                        gridApi.selection.on.rowSelectionChangedBatch(this.$rootScope, () => onSelectionChange());
                    }
                };
            this.pendingGridOptions =
                {
                    columnDefs: [
                        { field: 'transactionDate', displayName: 'Date', width: 70, type: 'date', cellFilter: "date:'shortDate'", enableFiltering: false },
                        {
                            field: 'accountName', filter: {
                                type: this.uiGridConstants.filter.SELECT,
                                selectOptions: []
                            }, displayName: 'Account', enableCellEdit: false, width: 140, enableFiltering: true
                        },
                        { field: 'description', displayName: 'Description', enableCellEditOnFocus: true, enableFiltering: true, filter: { placeholder: "search" } },
                        { field: 'amount', displayName: 'Amount', width: 140, type: 'number', cellFilter: "currency", enableFiltering: true, aggregationType: this.uiGridConstants.aggregationTypes.sum, footerCellTemplate: '<div class="ui-grid-cell-contents" >Total: {{col.getAggregationValue() | currency }}</div>' }
                    ],
                    enableSorting: true,
                    enableHorizontalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableColumnMenus: false,
                    enablePaginationControls: false,
                    enableRowHeaderSelection: false
                };
            this.previewImportGridOptions =
                {
                    columnDefs: [
                        { field: 'transactionDate', displayName: 'Date', width: 70, type: 'date', cellFilter: "date:'shortDate'", enableFiltering: false },
                        { field: 'description', displayName: 'Description', enableCellEditOnFocus: true, enableFiltering: true, filter: { placeholder: "search" } },
                        { field: 'categoryDisplayName', editModelField: "financialCategoryId", displayName: 'Category', width: 170, editableCellTemplate: "ui-grid/dropdownEditor", editDropdownOptionsArray: [], enableFiltering: true },
                        { field: 'unitGridLabel', editModelField: "associatedUnitId", displayName: this.homeName, width: 120, editableCellTemplate: "ui-grid/dropdownEditor", editDropdownOptionsArray: [], enableFiltering: true },
                        { field: 'amount', displayName: 'Amount', width: 140, type: 'number', cellFilter: "currency", enableFiltering: true, aggregationType: this.uiGridConstants.aggregationTypes.sum, footerCellTemplate: '<div class="ui-grid-cell-contents" >Total: {{col.getAggregationValue() | currency }}</div>' },
                        { field: 'id', displayName: '', enableSorting: false, enableCellEdit: false, enableFiltering: false, width: 40, cellTemplate: '<div class="ui-grid-cell-contents text-center"><span class="close-x mt-0 mb-0 ml-3" data-ng-click="grid.appScope.$ctrl.removeImportRow( row.entity )" style="color: red;">&times;</span></div>' }
                    ],
                    enableSorting: true,
                    showColumnFooter: false,
                    enableHorizontalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableColumnMenus: false
                };
            const preselectStartMillis = parseInt(this.appCacheService.getAndClear("ledger_preselect_start"));
            if (!isNaN(preselectStartMillis)) {
                // Let the page finish loading then update the filter or else the date filter will overwrite our date
                window.setTimeout(() => {
                    this.filter.startDate = new Date(preselectStartMillis);
                    const preselectEndMillis = parseInt(this.appCacheService.getAndClear("ledger_preselect_end"));
                    this.filter.endDate = new Date(preselectEndMillis);
                    this.preselectCategoryId = parseInt(this.appCacheService.getAndClear("ledger_preselect_categoryId"));
                    if (isNaN(this.preselectCategoryId))
                        this.preselectCategoryId = undefined;
                    this.fullRefresh();
                }, 100);
            }
            else {
                this.filter.startDate = moment().subtract(30, 'days').toDate();
                this.filter.endDate = moment().toDate();
                this.fullRefresh();
            }
            this.$timeout(() => this.loadImportHistory(), 1500);
            this.$http.get("/api/Ledger/OwnerTxNote").then((httpResponse) => this.ownerFinanceTxNote = httpResponse.data.ownerFinanceTxNote, (httpResponse) => console.log("Failed to load owner tx note: " + httpResponse.data.exceptionMessage));
        }
        /**
         * Load all of the data on the page
         */
        fullRefresh() {
            this.isLoading = true;
            let getUri = `/api/Ledger/PageInfo?startDate=${encodeURIComponent(this.filter.startDate.toISOString())}&endDate=${encodeURIComponent(this.filter.endDate.toISOString())}`;
            if (this.filter.description.length > 3)
                getUri += "&descriptionSearch=" + encodeURIComponent(this.filter.description);
            this.$http.get(getUri).then((httpResponse) => {
                this.isLoading = false;
                this.selectedEntries = [];
                const pageInfo = httpResponse.data;
                this.ledgerAccounts = pageInfo.accounts;
                _.forEach(this.ledgerAccounts, a => a.shouldShowInGrid = true);
                // Hide the account column if there's only one account
                const accountColumn = this.ledgerGridOptions.columnDefs.find(c => c.field === "accountName");
                if (accountColumn)
                    accountColumn.visible = this.ledgerAccounts.length > 1;
                // Add only the first account needing login for a Plaid item
                const accountsNeedingLogin = this.ledgerAccounts.filter(a => a.plaidNeedsRelogin);
                this.accountsNeedingLogin = [];
                for (let i = 0; i < accountsNeedingLogin.length; ++i) {
                    if (!this.accountsNeedingLogin.find(a => a.plaidItemId === accountsNeedingLogin[i].plaidItemId))
                        this.accountsNeedingLogin.push(accountsNeedingLogin[i]);
                }
                accountColumn.filter.selectOptions = this.ledgerAccounts.map(a => { return { value: a.accountName, label: a.accountName }; });
                this.hasPlaidAccounts = _.any(this.ledgerAccounts, a => a.syncType === 'plaid');
                this.allEntries = pageInfo.entries;
                this.pendingGridOptions.data = pageInfo.pendingEntries;
                this.flatCategoryList = [];
                const visitNode = (curNode, depth) => {
                    if (curNode.displayName) {
                        let labelPrefix = "";
                        if (depth > 1)
                            labelPrefix = Array((depth - 2) * 4).join(String.fromCharCode(160)) + "|--";
                        curNode.dropDownLabel = labelPrefix + curNode.displayName;
                        this.flatCategoryList.push(curNode);
                    }
                    if (curNode.childCategories == null || curNode.childCategories.length == 0)
                        return;
                    for (let i = 0; i < curNode.childCategories.length; ++i) {
                        visitNode(curNode.childCategories[i], depth + 1);
                    }
                };
                visitNode(pageInfo.rootFinancialCategory, 0);
                this.updateLocalData();
                this.uiGridCategoryDropDown = [];
                this.uiGridCategoryDropDown.push({ id: null, value: "" });
                for (let i = 0; i < this.flatCategoryList.length; ++i) {
                    this.uiGridCategoryDropDown.push({ id: this.flatCategoryList[i].financialCategoryId, value: this.flatCategoryList[i].dropDownLabel });
                }
                this.uiGridCategoryDropDown.push({ id: this.ManageCategoriesDropId, value: "Manage Categories..." });
                const categoryColumn = this.ledgerGridOptions.columnDefs.find(c => c.field === "categoryDisplayName");
                categoryColumn.editDropdownOptionsArray = this.uiGridCategoryDropDown;
                if (this.preselectCategoryId) {
                    window.setTimeout(() => {
                        const selectedCatEntry = this.flatCategoryList.filter(c => c.financialCategoryId === this.preselectCategoryId)[0];
                        this.preselectCategoryId = undefined;
                        const categoryColumn = this.ledgerGridApi.grid.columns.filter(c => c.displayName === "Category")[0];
                        categoryColumn.filters[0] = {
                            term: selectedCatEntry.displayName
                        };
                    }, 100);
                }
                this.unitListEntries = pageInfo.unitListEntries;
                // Populate the object used for quick editing the home
                const uiGridUnitDropDown = [];
                uiGridUnitDropDown.push({ id: null, value: "" });
                for (let i = 0; i < this.unitListEntries.length; ++i)
                    uiGridUnitDropDown.push({ id: this.unitListEntries[i].unitId, value: this.unitListEntries[i].unitWithOwnerLast });
                const unitColumn = this.ledgerGridOptions.columnDefs.find(c => c.field === "unitGridLabel");
                unitColumn.editDropdownOptionsArray = uiGridUnitDropDown;
                this.populateGridUnitLabels(this.allEntries);
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to retrieve data, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Populate the text that is shown for the unit column and split for category
         */
        populateGridUnitLabels(entries) {
            if (!entries || entries.length === 0)
                return;
            // Populate the unit names for the grid
            _.each(entries, (entry) => {
                if (entry.isSplit)
                    entry.categoryDisplayName = "(split)";
                if (entry.associatedUnitId) {
                    const unitListEntry = this.unitListEntries.find(u => u.unitId === entry.associatedUnitId);
                    if (unitListEntry)
                        entry.unitGridLabel = unitListEntry.unitWithOwnerLast;
                    else
                        entry.unitGridLabel = "UNK";
                }
                // Populate split entries
                if (entry.splitEntries && entry.splitEntries.length > 0)
                    this.populateGridUnitLabels(entry.splitEntries);
            });
        }
        refreshEntries() {
            this.isLoadingEntries = true;
            let getUri = `/api/Ledger/PageInfo?startDate=${encodeURIComponent(this.filter.startDate.toISOString())}&endDate=${encodeURIComponent(this.filter.endDate.toISOString())}`;
            if (this.filter.description.length > 3)
                getUri += "&descriptionSearch=" + encodeURIComponent(this.filter.description);
            this.$http.get(getUri).then((httpResponse) => {
                this.isLoadingEntries = false;
                this.allEntries = httpResponse.data.entries;
                this.updateLocalData();
                this.populateGridUnitLabels(this.allEntries);
            });
        }
        updateLocalData() {
            const enabledAccountIds = this.ledgerAccounts.filter(a => a.shouldShowInGrid).map(a => a.ledgerAccountId);
            let filteredList = this.allEntries.filter(e => enabledAccountIds.indexOf(e.ledgerAccountId) > -1);
            // If the user is filtering on a column, we need to break out split transactions
            if (this.hasActiveTxGridColFilter) {
                // Go through all transactions and for splits, remove the parent, and add the child splits to the main list
                const newFilteredList = [];
                for (let i = 0; i < filteredList.length; ++i) {
                    const isSplit = filteredList[i].isSplit && filteredList[i].splitEntries && filteredList[i].splitEntries.length > 0;
                    if (!isSplit) {
                        newFilteredList.push(filteredList[i]);
                        continue;
                    }
                    // Remove the parent entry
                    const parentEntry = filteredList[i];
                    for (let splitIndex = 0; splitIndex < parentEntry.splitEntries.length; ++splitIndex) {
                        // Clone the split so we can prefix the label with split
                        const curSplitCopy = _.clone(parentEntry.splitEntries[splitIndex]);
                        curSplitCopy.description = "[SPLIT] " + curSplitCopy.description;
                        curSplitCopy.accountName = parentEntry.accountName; // Account name doesn't get populated for split entries so copy it
                        newFilteredList.push(curSplitCopy);
                    }
                }
                filteredList = newFilteredList;
            }
            this.ledgerGridOptions.data = filteredList;
            this.ledgerGridOptions.enablePaginationControls = filteredList.length > this.HistoryPageSize;
            this.ledgerGridOptions.minRowsToShow = Math.min(filteredList.length, this.HistoryPageSize);
            this.ledgerGridOptions.virtualizationThreshold = this.ledgerGridOptions.minRowsToShow;
            this.regenerateDateDonutChart();
        }
        /**
         * Rebuild the data needed to populate the donut chart
         */
        regenerateDateDonutChart() {
            this.spendingChartData = null;
            if (this.allEntries.length === 0)
                return;
            const getParentCategoryId = (financialCategoryId) => {
                const cat = this.flatCategoryList.filter(c => c.financialCategoryId === financialCategoryId);
                if (cat && cat.length > 0) {
                    if (!cat[0].parentFinancialCategoryId)
                        return cat[0].financialCategoryId;
                    return getParentCategoryId(cat[0].parentFinancialCategoryId);
                }
                return 0;
            };
            const flattenedTransactions = [];
            for (let i = 0; i < this.allEntries.length; ++i) {
                if (this.allEntries[i].isSplit) {
                    for (const e of this.allEntries[i].splitEntries)
                        flattenedTransactions.push(e);
                }
                else
                    flattenedTransactions.push(this.allEntries[i]);
            }
            const entriesByParentCat = _.groupBy(flattenedTransactions, e => getParentCategoryId(e.financialCategoryId));
            let spendingChartEntries = [];
            // Go through all the parent categories and sum the transactions under them
            const parentCatIds = _.keys(entriesByParentCat);
            for (let i = 0; i < parentCatIds.length; ++i) {
                const parentCategoryId = +parentCatIds[i];
                const entries = entriesByParentCat[parentCategoryId];
                const cats = this.flatCategoryList.filter(c => c.financialCategoryId === +parentCategoryId);
                let parentCategory = null;
                if (cats && cats.length > 0)
                    parentCategory = cats[0];
                let sumTotal = 0;
                for (let entryIndex = 0; entryIndex < entries.length; ++entryIndex)
                    sumTotal += entries[entryIndex].amount;
                const newEntry = {
                    parentCategoryId,
                    parentCategoryDisplayName: parentCategory ? parentCategory.displayName : "Uncategorized",
                    sumTotal: Math.abs(sumTotal),
                    numLedgerEntries: entries.length
                };
                spendingChartEntries.push(newEntry);
            }
            spendingChartEntries = _.sortBy(spendingChartEntries, e => e.sumTotal).reverse();
            this.spendingChartData = [];
            this.spendingChartLabels = [];
            for (let i = 0; i < spendingChartEntries.length; ++i) {
                this.spendingChartData.push(spendingChartEntries[i].sumTotal);
                this.spendingChartLabels.push(spendingChartEntries[i].parentCategoryDisplayName);
            }
            // Force redraw
            this.showDonut = false;
            this.$timeout(() => this.showDonut = true, 100);
        }
        /**
         * Occurs when the user clicks the button to add a new transaction
         */
        onAddTransaction() {
            if (this.ledgerAccounts.length === 0) {
                alert("Please add at least one account first");
                return;
            }
            this.editingTransaction = new LedgerEntry();
            this.editingTransaction.ledgerAccountId = this.ledgerAccounts[0].ledgerAccountId;
            this.editingTransaction.transactionDate = new Date();
            window.setTimeout(() => document.getElementById("transaction-amount-input").focus(), 50);
        }
        completePlaidSync(accessToken, updatePlaidItemId, selectedAccountIds) {
            this.isLoading = true;
            this.plaidSuccessProgressMsg = "Contacting Plaid server for selected account information";
            const postData = {
                accessToken,
                updatePlaidItemId,
                selectedAccountIds
            };
            const postUri = updatePlaidItemId ? "/api/Plaid/UpdateAccessToken" : "/api/Plaid/ProcessNewAccessToken";
            this.$http.post(postUri, postData).then((httpResponse) => {
                this.isLoading = false;
                this.plaidSuccessProgressMsg = "Account information successfully retrieved";
                this.newPlaidAccounts = httpResponse.data;
                if (updatePlaidItemId)
                    window.location.reload();
            }, (httpResponse) => {
                this.isLoading = false;
                this.plaidSuccessProgressMsg = "Failed to retrieve account information from Plaid: " + httpResponse.data.exceptionMessage;
                alert("Failed to link: " + httpResponse.data.exceptionMessage);
            });
        }
        showAddAccount() {
            this.createAccountInfo = new CreateAccountInfo();
            this.createAccountInfo.type = null; // Explicitly set to simplify UI logic
        }
        updateAccountLink(ledgerAccount) {
            //this.createAccountInfo = new CreateAccountInfo();
            //this.createAccountInfo.type = null; // Explicitly set to simplify UI logic
            if (!this.isPremiumPlanActive)
                return;
            this.isLoading = true;
            this.$http.get("/api/Plaid/UpdateLinkToken/" + ledgerAccount.plaidItemId).then((httpResponse) => {
                this.isLoading = false;
                const newLinkToken = httpResponse.data;
                if (!newLinkToken) {
                    alert("Something went wrong on the server. Please contact support.");
                    return;
                }
                const plaidConfig = {
                    token: newLinkToken,
                    onSuccess: (public_token) => {
                        console.log("Plaid update onSuccess");
                        this.completePlaidSync(public_token, ledgerAccount.plaidItemId, null);
                    },
                    onLoad: () => { },
                    onExit: (err, metadata) => { console.log("onExit.err", err, metadata); },
                    onEvent: (eventName, metadata) => { console.log("onEvent.eventName", eventName, metadata); },
                    receivedRedirectUri: null,
                };
                this.plaidHandler = Plaid.create(plaidConfig);
                this.plaidHandler.open();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to update account link: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user wants to edit a transaction
         */
        editEntry(entry) {
            if (entry.parentLedgerEntryId) {
                const parentEntry = this.allEntries.find(e => e.ledgerEntryId === entry.parentLedgerEntryId);
                this.editingTransaction = _.clone(parentEntry);
            }
            else
                this.editingTransaction = _.clone(entry);
            if (this.editingTransaction.isSplit)
                this.onSplitAmountChange();
        }
        /**
         * Occurs when the user wants to delete a transaction
         */
        deleteEntry(entry) {
            if (!confirm("Are you sure you want to delete this entry? Deletion is permanent."))
                return;
            this.isLoading = true;
            this.$http.delete("/api/Ledger/DeleteEntry/" + entry.ledgerEntryId).then(() => {
                this.isLoading = false;
                this.editAccount = null;
                this.editingTransaction = null;
                this.fullRefresh();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to delete: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user clicks the button to save transaction details
         */
        onSaveEntry() {
            if (!this.editingTransaction.isSplit) {
                if (!this.editingTransaction.description) {
                    alert("Description is required");
                    return;
                }
                if (!this.editingTransaction.amount) {
                    alert("Non-zero amount is required");
                    return;
                }
            }
            else {
                for (let i = 0; i < this.editingTransaction.splitEntries.length; ++i) {
                    if (!this.editingTransaction.splitEntries[i].amount) {
                        alert("A non-zero amount is required for all split transaction entries");
                        return;
                    }
                }
            }
            this.isLoading = true;
            const onSave = () => {
                this.isLoading = false;
                this.editingTransaction = null;
                this.refreshEntries();
            };
            const onError = (httpResponse) => {
                this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            };
            if (this.editingTransaction.ledgerEntryId)
                this.$http.put("/api/Ledger/UpdateEntry", this.editingTransaction).then(onSave, onError);
            else
                this.$http.post("/api/Ledger/NewManualEntry", this.editingTransaction).then(onSave, onError);
        }
        /**
         * Occurs when the user clicks the button to add a new account
         */
        onSaveNewAccount() {
            this.isLoading = true;
            const onSave = () => {
                this.isLoading = false;
                this.createAccountInfo = null;
                this.fullRefresh();
            };
            const onError = (httpResponse) => {
                this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            };
            this.$http.post("/api/Ledger/NewBankAccount", this.createAccountInfo).then(onSave, onError);
        }
        startPlaidFlow() {
            if (this.createAccountInfo)
                this.createAccountInfo.type = 'plaid';
            if (!this.isPremiumPlanActive)
                return;
            this.isLoading = true;
            this.$http.get("/api/Plaid/NewLinkToken").then((httpResponse) => {
                this.isLoading = false;
                if (!httpResponse.data)
                    return;
                const plaidConfig = {
                    token: httpResponse.data,
                    onSuccess: (public_token, metadata) => {
                        console.log("Plaid onSuccess", metadata);
                        let selectedAccountIds = null;
                        if (metadata && metadata.accounts && metadata.accounts.length > 0)
                            selectedAccountIds = metadata.accounts.map((a) => a.id);
                        this.completePlaidSync(public_token, null, selectedAccountIds);
                    },
                    onLoad: () => { },
                    onExit: (err, metadata) => { console.log("update onExit.err", err, metadata); },
                    onEvent: (eventName, metadata) => { console.log("update onEvent.eventName", eventName, metadata); },
                    receivedRedirectUri: null,
                };
                this.plaidHandler = Plaid.create(plaidConfig);
                this.plaidHandler.open();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to start Plaid sign-up: " + httpResponse.data.exceptionMessage);
                this.closeAccountAndReload();
            });
        }
        openEditAccountModal(account) {
            this.editAccount = _.clone(account);
        }
        closeAccountAndReload() {
            this.createAccountInfo = null;
            this.fullRefresh();
        }
        onEditAccount() {
            const putUri = `/api/Ledger/UpdateAccount/${this.editAccount.ledgerAccountId}?newName=${encodeURIComponent(this.editAccount.accountName)}&newType=${encodeURIComponent(this.editAccount.accountType)}`;
            this.isLoading = true;
            this.$http.put(putUri, null).then(() => {
                this.isLoading = false;
                this.editAccount = null;
                this.fullRefresh();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to update: " + httpResponse.data.exceptionMessage);
            });
        }
        syncPlaidAccounts(shouldSyncRecent) {
            this.isLoading = true;
            const getUri = shouldSyncRecent ? "/api/Plaid/SyncRecentTransactions" : "/api/Plaid/SyncTwoYearTransactions";
            this.$http.get(getUri).then(() => {
                this.isLoading = false;
                this.refreshEntries();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to sync: " + httpResponse.data.exceptionMessage);
                if (httpResponse.data.exceptionMessage && httpResponse.data.exceptionMessage.indexOf("login credentials") > -1)
                    window.location.reload();
            });
        }
        onFilterDescriptionChange() {
            if (this.filter.description.length > 2 || this.filter.description.length == 0)
                this.refreshEntries();
        }
        onEditTransactionCategoryChange() {
            // Not used
        }
        onCategoryManagerClosed(didMakeChanges) {
            this.shouldShowCategoryEditModal = false;
            if (didMakeChanges)
                this.fullRefresh();
        }
        onDeleteAccount() {
            if (!confirm("Are you sure you want to remove this account?"))
                return;
            this.isLoading = true;
            this.$http.delete("/api/Ledger/DeleteAccount/" + this.editAccount.ledgerAccountId).then(() => {
                this.isLoading = false;
                this.editAccount = null;
                this.fullRefresh();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to delete: " + httpResponse.data.exceptionMessage);
            });
        }
        splitTransaction() {
            if (!this.editingTransaction.splitEntries)
                this.editingTransaction.splitEntries = [];
            this.editingTransaction.splitEntries.push(new LedgerEntry());
            this.editingTransaction.isSplit = true;
        }
        onSplitAmountChange() {
            this.splitAmountTotal = this.editingTransaction.splitEntries.reduce((sum, e) => sum + e.amount, 0);
            const roundedSplit = Math.round(this.splitAmountTotal * 100);
            const roundedTotal = Math.round(this.editingTransaction.amount * 100);
            this.isSplitAmountEqual = roundedSplit === roundedTotal;
        }
        removeSplit(splitEntry) {
            this.editingTransaction.splitEntries.splice(this.editingTransaction.splitEntries.indexOf(splitEntry), 1);
            this.onSplitAmountChange();
        }
        openImportFilePicker() {
            document.getElementById('importTransactionFileInput').click();
        }
        openImportModal() {
            this.shouldShowImportModal = true;
            this.previewImportGridOptions.data = null;
        }
        onImportFileSelected(event) {
            const importTransactionsFile = event.target.files[0];
            if (!importTransactionsFile)
                return;
            this.isLoading = true;
            this.importTxNotes = "";
            const formData = new FormData();
            formData.append("importFile", importTransactionsFile);
            const postHeaders = {
                headers: { "Content-Type": undefined } // Need to remove this to avoid the JSON body assumption by the server
            };
            const fileElem = document.getElementById("importTransactionFileInput");
            this.$http.post("/api/Ledger/PreviewImport", formData, postHeaders).then((httpResponse) => {
                this.isLoading = false;
                // Clear the value so the user can re-select the same file and trigger this handler
                fileElem.value = "";
                this.previewImportGridOptions.data = httpResponse.data;
                for (let i = 0; i < this.previewImportGridOptions.data.length; ++i) {
                    const curEntry = this.previewImportGridOptions.data[i];
                    curEntry.ledgerEntryId = i;
                    const unit = this.unitListEntries.find(u => u.unitId === curEntry.associatedUnitId);
                    if (unit)
                        curEntry.unitGridLabel = unit.unitWithOwnerLast;
                    const catEntry = this.flatCategoryList.find(c => c.financialCategoryId === curEntry.financialCategoryId);
                    curEntry.categoryDisplayName = catEntry ? catEntry.displayName : null;
                }
                this.previewImportGridOptions.minRowsToShow = httpResponse.data.length;
                this.previewImportGridOptions.virtualizationThreshold = this.previewImportGridOptions.minRowsToShow;
            }, (httpResponse) => {
                this.isLoading = false;
                // Clear the value so the user can re-select the same file and trigger this handler
                fileElem.value = "";
                alert("Failed to upload document: " + httpResponse.data.exceptionMessage);
            });
        }
        selectManualAccount() {
            this.createAccountInfo.type = "manual";
            setTimeout(() => document.getElementById("new-account-name-field").focus(), 100);
        }
        /** Bulk import transactions */
        importPreviewTransactions() {
            if (!this.bulkImportAccountId) {
                alert("Please select the account into which these transactions will be imported using the drop-down above the grid.");
                return;
            }
            this.isLoading = true;
            const entries = this.previewImportGridOptions.data;
            for (let i = 0; i < entries.length; ++i)
                entries[i].ledgerAccountId = this.bulkImportAccountId;
            const postTx = {
                notes: this.importTxNotes,
                entries: this.previewImportGridOptions.data
            };
            this.$http.post("/api/Ledger/BulkImport", postTx).then(() => {
                this.previewImportGridOptions.data = null;
                this.shouldShowImportModal = false;
                this.isLoading = false;
                this.refreshEntries();
                this.$timeout(() => this.loadImportHistory(), 1000);
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to import: " + httpResponse.data.exceptionMessage);
            });
        }
        removeImportRow(entry) {
            // For import rows, the row index is stored in ledgerEntryId
            const importEntries = this.previewImportGridOptions.data;
            importEntries.splice(entry.ledgerEntryId, 1);
            for (let i = 0; i < importEntries.length; ++i)
                importEntries[i].ledgerEntryId = i;
        }
        /** Export the transactions list as a CSV */
        exportTransactionsCsv() {
            const csvColumns = [
                {
                    headerText: "Date",
                    fieldName: "transactionDate",
                    dataMapper: function (value) {
                        if (!value)
                            return "";
                        return moment(value).format("YYYY-MM-DD");
                    }
                },
                {
                    headerText: "Description",
                    fieldName: "description"
                },
                {
                    headerText: "Category",
                    fieldName: "categoryDisplayName"
                },
                {
                    headerText: AppConfig.homeName,
                    fieldName: "unitGridLabel"
                },
                {
                    headerText: "Amount",
                    fieldName: "amount"
                },
                {
                    headerText: "Account",
                    fieldName: "accountName"
                }
            ];
            const csvDataString = Ally.createCsvString(this.ledgerGridOptions.data, csvColumns);
            Ally.HtmlUtil2.downloadCsv(csvDataString, "Transactions.csv");
        }
        /** Occurs when the user changes the setting to share transactions with owners */
        onShowOwnerTxnsChange() {
            this.isLoading = true;
            const putUri = "/api/Ledger/SetOwnerTxnViewing?shouldAllow=" + this.shouldShowOwnerFinanceTxn;
            this.$http.put(putUri, null).then(() => {
                this.isLoading = false;
                this.siteInfo.privateSiteInfo.shouldShowOwnerFinanceTxn = this.shouldShowOwnerFinanceTxn;
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to change setting: " + httpResponse.data.exceptionMessage);
            });
        }
        /** Retrieve the financial transaction import history */
        loadImportHistory() {
            this.$http.get("/api/Ledger/TxImportHistory").then((httpResponse) => {
                this.importHistoryEntries = httpResponse.data;
            }, (httpResponse) => {
                console.log("Failed to retrieve tx history: " + httpResponse.data.exceptionMessage);
            });
        }
        saveOwnerTxNote() {
            const putData = {
                ownerFinanceTxNote: this.ownerFinanceTxNote
            };
            this.isLoading = true;
            this.$http.put("/api/Ledger/OwnerTxNote", putData).then(() => {
                this.isLoading = false;
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to save note: " + httpResponse.data.exceptionMessage);
            });
        }
        bulkRecategorize() {
            if (this.selectedEntries.length === 0)
                return;
            const putInfo = {
                entryIds: this.selectedEntries.map(e => e.ledgerEntryId),
                financialCategoryId: this.bulkRecategorizeCategoryId
            };
            //console.log( `Setting ${putInfo.entryIds.join( ',' )} to category ${this.bulkRecategorizeCategoryId}` );
            this.isLoading = true;
            this.$http.put("/api/Ledger/BulkRecategorize", putInfo).then(() => {
                this.isLoading = false;
                this.fullRefresh();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to update: " + httpResponse.data.exceptionMessage);
            });
        }
    }
    LedgerController.$inject = ["$http", "SiteInfo", "appCacheService", "uiGridConstants", "$rootScope", "$timeout"];
    Ally.LedgerController = LedgerController;
    class BulkRecategorizeInfo {
    }
    class CategoryDropDownOption {
    }
    class UiGridRow {
    }
    Ally.UiGridRow = UiGridRow;
    class CreateAccountInfo {
    }
    class SpendingChartEntry {
    }
    class LedgerAccount {
    }
    class LedgerEntry {
    }
    Ally.LedgerEntry = LedgerEntry;
    class LedgerPageInfo {
    }
    class BasicUnitListEntry {
    }
    class FilterCriteria {
        constructor() {
            this.description = "";
            this.startDate = new Date();
            this.endDate = new Date();
            this.category = "";
        }
    }
    class FinancialCategory {
    }
    Ally.FinancialCategory = FinancialCategory;
    class FinancialTxImportHistoryEntry {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("ledger", {
    templateUrl: "/ngApp/chtn/manager/financial/ledger.html",
    controller: Ally.LedgerController
});

var Ally;
(function (Ally) {
    class ElectronicPayment {
    }
    Ally.ElectronicPayment = ElectronicPayment;
    class WePayBalanceDetail {
    }
    class PaymentPageInfo {
    }
    class UpdateAssessmentInfo {
    }
    /**
     * The controller for the page to view online payment information
     */
    class ManagePaymentsController {
        /**
        * The constructor for the class
        */
        constructor($http, siteInfo, appCacheService, uiGridConstants, $scope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.uiGridConstants = uiGridConstants;
            this.$scope = $scope;
            this.PaymentHistory = [];
            this.errorMessage = "";
            this.showPaymentPage = true; //AppConfig.appShortName === "condo";
            this.periodicPaymentFrequencies = PeriodicPaymentFrequencies;
            this.AssociationPaysAch = true;
            this.AssociationPaysCC = false; // Payer pays credit card fees
            this.lateFeeInfo = {};
            this.hasLoadedPage = false;
            this.isLoading = false;
            this.isLoadingUnits = false;
            this.isLoadingPayment = false;
            this.isLoadingLateFee = false;
            this.isLoadingCheckoutDetails = false;
            this.allowNewWePaySignUp = false;
            this.shouldShowDwollaAddAccountModal = false;
            this.shouldShowDwollaModalClose = false;
            this.shouldShowPaymentSignupModal = false;
            this.shouldShowMicroDepositModal = false;
            this.shouldShowPlaidTestSignUpButton = false;
            this.shouldShowStripePrefaceModal = false;
            this.shouldShowNewStripeSignUpMessage = false;
            this.isDwollaIavDone = false;
            this.shouldShowCustomInstructions = false;
            this.hasMultipleProviders = false;
            this.allowStripeSignUp = false;
            this.stripePayoutAccounts = null;
            this.exampleFeeService = "stripe";
            this.isPremiumPlanActive = false;
            this.HistoryPageSize = 50;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.homeName = AppConfig.homeName;
            this.highlightWePayCheckoutId = this.appCacheService.getAndClear("hwpid");
            const tempPayId = this.appCacheService.getAndClear("onpayid");
            if (HtmlUtil.isNumericString(tempPayId))
                this.highlightPaymentsInfoId = parseInt(tempPayId);
            this.isAssessmentTrackingEnabled = this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled;
            const StripeEnabledGroups = ["qa", "502wainslie"];
            const createdRecently = moment(new Date(2023, 6, 25)).isBefore(moment(this.siteInfo.privateSiteInfo.creationDate));
            this.allowStripeSignUp = (StripeEnabledGroups.indexOf(this.siteInfo.publicSiteInfo.shortName) !== -1) || createdRecently;
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            // Allow a single HOA to try WePay
            const wePayExemptGroupShortNames = ["tigertrace", "7mthope", "qa"];
            this.allowNewWePaySignUp = wePayExemptGroupShortNames.indexOf(this.siteInfo.publicSiteInfo.shortName) > -1;
            this.payments = [
                {
                    Date: "",
                    Unit: "",
                    Resident: "",
                    Amount: "",
                    Status: ""
                }
            ];
            this.testFee = {
                amount: 200
            };
            this.signUpStep = 0;
            this.signUpInfo =
                {
                    hasAssessments: null,
                    assessmentFrequency: PeriodicPaymentFrequencies[0].name,
                    frequencyIndex: 0,
                    allPayTheSame: true,
                    allPayTheSameAmount: 0,
                    units: []
                };
            this.paymentsGridOptions =
                {
                    columnDefs: [
                        { field: 'submitDateUtc', displayName: 'Date', width: 140, type: 'date', cellFilter: "date:'short'" },
                        { field: 'unitName', displayName: this.homeName, width: 80 },
                        { field: 'resident', displayName: 'Resident', width: 160 },
                        { field: 'amount', displayName: 'Amount', width: 100, type: 'number', cellFilter: "currency" },
                        { field: 'status', displayName: 'Status', width: 110 },
                        { field: 'notes', displayName: 'Notes' },
                        { field: 'id', displayName: '', width: 140, cellTemplate: '<div class="ui-grid-cell-contents"><span class="text-link" data-ng-if="row.entity.wePayCheckoutId" data-ng-click="grid.appScope.$ctrl.showWePayCheckoutInfo( row.entity.wePayCheckoutId )">WePay Details</span><span class="text-link" data-ng-if="row.entity.payPalCheckoutId" data-ng-click="grid.appScope.$ctrl.showPayPalCheckoutInfo( row.entity.payPalCheckoutId )">PayPal Details</span><span class="text-link" data-ng-if="row.entity.paragonReferenceNumber" data-ng-click="grid.appScope.$ctrl.showParagonCheckoutInfo( row.entity.paragonReferenceNumber )">Paragon Details</span><span class="text-link" data-ng-if="row.entity.dwollaTransferUri" data-ng-click="grid.appScope.$ctrl.showDwollaTransferInfo( row.entity )">Dwolla Details</span><span class="text-link" data-ng-if="row.entity.stripePaymentIntentId" data-ng-click="grid.appScope.$ctrl.showStripeTransferInfo( row.entity )">Stripe Details</span></div>' }
                    ],
                    enableSorting: true,
                    enableHorizontalScrollbar: window.innerWidth < 996 ? this.uiGridConstants.scrollbars.ALWAYS : this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableColumnMenus: false,
                    enablePaginationControls: true,
                    paginationPageSize: this.HistoryPageSize,
                    paginationPageSizes: [this.HistoryPageSize],
                    enableRowHeaderSelection: false,
                    onRegisterApi: () => {
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
            // Populate the page
            this.refresh();
        }
        /**
         * Load all of the data on the page
         */
        refresh() {
            this.isLoading = true;
            this.$http.get("/api/OnlinePayment").then((httpResponse) => {
                this.isLoading = false;
                this.hasLoadedPage = true;
                this.hasAssessments = this.siteInfo.privateSiteInfo.hasAssessments;
                if (this.hasAssessments) {
                    const assessmentFrequencyInfo = PeriodicPaymentFrequencies.find(ppf => ppf.id === this.siteInfo.privateSiteInfo.assessmentFrequency);
                    if (assessmentFrequencyInfo)
                        this.assessmentFrequencyLabel = assessmentFrequencyInfo.name;
                }
                const data = httpResponse.data;
                this.paymentInfo = data;
                this.paymentsGridOptions.data = this.paymentInfo.electronicPayments;
                this.paymentsGridOptions.enablePaginationControls = this.paymentInfo.electronicPayments.length > this.HistoryPageSize;
                this.paymentsGridOptions.minRowsToShow = Math.min(this.paymentInfo.electronicPayments.length, this.HistoryPageSize);
                this.paymentsGridOptions.virtualizationThreshold = this.paymentsGridOptions.minRowsToShow;
                let numProviders = 0;
                if (this.paymentInfo.isDwollaSetup)
                    ++numProviders;
                if (this.paymentInfo.isWePaySetup)
                    ++numProviders;
                if (this.paymentInfo.isStripeSetup)
                    ++numProviders;
                this.hasMultipleProviders = numProviders > 1;
                // If the user signed-up for Stripe within the last two days, show them a message on how to add more users to Stripe
                if (httpResponse.data.stripeConnectEnabledDateUtc)
                    this.shouldShowNewStripeSignUpMessage = moment().subtract(2, "days").isBefore(moment(httpResponse.data.stripeConnectEnabledDateUtc));
                this.stripePayoutAccounts = httpResponse.data.stripeConnectExternalAccountHints;
                if (Ally.HtmlUtil2.isValidString(this.paymentInfo.customFinancialInstructions))
                    this.showCustomInstructionsEditor();
                this.lateFeeInfo =
                    {
                        lateFeeDayOfMonth: data.lateFeeDayOfMonth,
                        lateFeeAmount: data.lateFeeAmount
                    };
                // Prepend flat fee late fees with a $
                if (!HtmlUtil.isNullOrWhitespace(this.lateFeeInfo.lateFeeAmount)
                    && !HtmlUtil.endsWith(this.lateFeeInfo.lateFeeAmount, "%"))
                    this.lateFeeInfo.lateFeeAmount = "$" + this.lateFeeInfo.lateFeeAmount;
                this.refreshUnits();
                this.updateTestFee();
                // If we were sent here to pre-open a transaction's details
                if (this.highlightPaymentsInfoId) {
                    const payment = data.electronicPayments.filter(e => e.paymentId === this.highlightPaymentsInfoId);
                    if (payment && payment.length > 0) {
                        if (payment[0].wePayCheckoutId)
                            this.showWePayCheckoutInfo(payment[0].wePayCheckoutId);
                        else if (payment[0].paragonReferenceNumber)
                            this.showParagonCheckoutInfo(payment[0].paragonReferenceNumber);
                        else if (payment[0].dwollaTransferUri)
                            this.showDwollaTransferInfo(payment[0]);
                        else if (payment[0].stripePaymentIntentId)
                            this.showStripeTransferInfo(payment[0]);
                    }
                    this.highlightPaymentsInfoId = null;
                }
            }, (httpResponse) => {
                this.isLoading = false;
                alert(`Failed to load page, please contact technical support. (${httpResponse.data.exceptionMessage})`);
            });
        }
        /**
         * Load all of the units on the page
         */
        refreshUnits() {
            // Load the units and assessments
            this.isLoadingUnits = true;
            this.$http.get("/api/Unit").then((httpResponse) => {
                this.units = httpResponse.data;
                _.each(this.units, function (u) { if (u.adjustedAssessment === null) {
                    u.adjustedAssessment = u.assessment;
                } });
                this.assessmentSum = _.reduce(this.units, function (memo, u) { return memo + u.assessment; }, 0);
                this.adjustedAssessmentSum = _.reduce(this.units, function (memo, u) { return memo + (u.adjustedAssessment || 0); }, 0);
                this.isLoadingUnits = false;
            }, (httpResponse) => {
                this.isLoading = false;
                alert(`Failed to load units, please contact technical support. (${httpResponse.data.exceptionMessage})`);
            });
        }
        getLateFeeDateSuper() {
            let dayOfMonth = this.lateFeeInfo.lateFeeDayOfMonth;
            if (typeof (dayOfMonth) === "string") {
                if (HtmlUtil.isNullOrWhitespace(dayOfMonth))
                    return "";
                dayOfMonth = parseInt(dayOfMonth);
                this.lateFeeInfo.lateFeeDayOfMonth = dayOfMonth;
            }
            if (isNaN(dayOfMonth) || dayOfMonth < 1) {
                dayOfMonth = "";
                return "";
            }
            if (dayOfMonth > 31) {
                dayOfMonth = "";
                return "";
            }
            // Teens are a special case
            if (dayOfMonth >= 10 && dayOfMonth <= 20)
                return "th";
            const onesDigit = dayOfMonth % 10;
            if (onesDigit === 1)
                return "st";
            else if (onesDigit === 2)
                return "nd";
            if (onesDigit === 3)
                return "rd";
            return "th";
        }
        /**
         * Allow the user to update their PayPal client ID and client secret
         */
        updatePayPalCredentials() {
            this.isUpdatingPayPalCredentials = true;
            //this.payPalSignUpClientId = this.paymentInfo.payPalClientId;
            this.payPalSignUpClientSecret = "";
            this.payPalSignUpErrorMessage = "";
        }
        /**
         * Save the allow setting
         */
        saveAllowSetting() {
            this.isLoading = true;
            this.$http.put("/api/OnlinePayment/SaveAllow?allowPayments=" + this.paymentInfo.areOnlinePaymentsAllowed, null).then(() => {
                window.location.reload();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user clicks the button to save the PayPal client ID and secret
         */
        enablePayPal() {
            this.isLoading = true;
            this.payPalSignUpErrorMessage = null;
            const enableInfo = {
                clientId: this.payPalSignUpClientId,
                clientSecret: this.payPalSignUpClientSecret
            };
            this.$http.put("/api/OnlinePayment/EnablePayPal", enableInfo).then(() => {
                this.payPalSignUpClientId = "";
                this.payPalSignUpClientSecret = "";
                window.location.reload();
            }, (httpResponse) => {
                this.isLoading = false;
                this.payPalSignUpErrorMessage = httpResponse.data.exceptionMessage;
            });
        }
        selectText() {
            // HACK: Timeout needed to fire after x-editable's activation
            setTimeout(function () {
                $('.editable-input').select();
            }, 50);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user presses the button to send money from the WePay account to their
        // association's account
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onWithdrawalClick() {
            this.errorMessage = "";
            this.$http.get("/api/OnlinePayment/PerformAction?action=withdrawal").then((httpResponse) => {
                const withdrawalInfo = httpResponse.data;
                if (withdrawalInfo.redirectUri)
                    window.location.href = withdrawalInfo.redirectUri;
                else
                    this.errorMessage = withdrawalInfo.message;
            }, (httpResponse) => {
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    this.errorMessage = httpResponse.data.exceptionMessage;
            });
        }
        /**
         * Occurs when the user presses the button to edit a unit's assessment
         */
        onUnitAssessmentChanged(unit) {
            this.isLoadingUnits = true;
            if (typeof (unit.adjustedAssessment) === "string")
                unit.adjustedAssessment = parseFloat(unit.adjustedAssessment);
            const updateInfo = {
                unitId: unit.unitId,
                assessment: unit.adjustedAssessment,
                assessmentNote: unit.adjustedAssessmentReason
            };
            this.$http.put("/api/Unit/UpdateAssessment", updateInfo).then(() => {
                this.isLoadingUnits = false;
                this.assessmentSum = _.reduce(this.units, function (memo, u) { return memo + u.assessment; }, 0);
                this.adjustedAssessmentSum = _.reduce(this.units, function (memo, u) { return memo + (u.adjustedAssessment || 0); }, 0);
            }, (response) => {
                alert("Failed to update: " + response.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user presses the button to set all units to the assessment
         */
        setAllUnitAssessments() {
            if (!this.setAllAssessmentAmount || isNaN(this.setAllAssessmentAmount) || this.setAllAssessmentAmount < 0) {
                alert("Enter a valid assessment amount");
                return;
            }
            this.isLoadingUnits = true;
            const updateInfo = {
                unitId: -1,
                assessment: this.setAllAssessmentAmount,
                assessmentNote: null
            };
            this.$http.put("/api/Unit/SetAllAssessments", updateInfo).then(() => {
                this.isLoadingUnits = false;
                this.refreshUnits();
            }, (response) => {
                alert("Failed to update: " + response.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user changes who covers the WePay transaction fee
         */
        onChangeFeePayerInfo(payTypeUpdated) {
            // See if any users have auto-pay setup for this payment type
            let needsFullRefresh = false;
            let needsReloadOfPage = false;
            if (this.paymentInfo.usersWithAutoPay && this.paymentInfo.usersWithAutoPay.length > 0) {
                const AchDBString = "ACH";
                const CreditDBString = "Credit Card";
                let usersAffected = [];
                if (payTypeUpdated === "ach")
                    usersAffected = _.where(this.paymentInfo.usersWithAutoPay, (u) => u.wePayAutoPayFundingSource === AchDBString);
                else if (payTypeUpdated === "cc")
                    usersAffected = _.where(this.paymentInfo.usersWithAutoPay, (u) => u.wePayAutoPayFundingSource === CreditDBString);
                // If users will be affected then display an error message to the user
                if (usersAffected.length > 0) {
                    // We need to reload the site if the user is affected so the home page updates that
                    // the user does not have auto-pay enabled
                    needsReloadOfPage = _.find(usersAffected, (u) => u.userId === this.siteInfo.userInfo.userId) !== undefined;
                    needsFullRefresh = true;
                    let message = "Adjusting the fee payer type will cause the follow units to have their auto-pay canceled and they will be informed by email:\n";
                    _.each(usersAffected, (u) => message += u.ownerName + "\n");
                    message += "\nDo you want to continue?";
                    if (!confirm(message)) {
                        // Reset the setting
                        if (payTypeUpdated === "ach")
                            this.paymentInfo.payerPaysAchFee = !this.paymentInfo.payerPaysAchFee;
                        else
                            this.paymentInfo.payerPaysCCFee = !this.paymentInfo.payerPaysCCFee;
                        return;
                    }
                }
            }
            this.isLoadingPayment = true;
            // We always need to full reload the page so the home page payment form reflects the
            // correct fee payer setting
            needsReloadOfPage = true;
            this.$http.put("/api/OnlinePayment", this.paymentInfo).then(() => {
                if (needsReloadOfPage)
                    window.location.reload();
                else {
                    this.isLoadingPayment = false;
                    // We need to refresh our data so we don't pop-up the auto-pay cancel warning again
                    if (needsFullRefresh)
                        this.refresh();
                }
            }, (response) => {
                alert("Failed to update: " + response.data.exceptionMessage);
            });
            this.updateTestFee();
        }
        /**
         * Used to show the sum of all assessments
         */
        getSignUpSum() {
            return _.reduce(this.signUpInfo.units, function (memo, u) { return memo + parseFloat(u.assessment); }, 0);
        }
        /**
         * Occurs when the user clicks the link to indicate if they have regular assessments or not
         */
        signUp_HasAssessments(hasAssessments) {
            this.signUpInfo.hasAssessments = hasAssessments;
            if (this.signUpInfo.hasAssessments) {
                this.signUpInfo.units = [];
                _.each(this.units, (u) => {
                    this.signUpInfo.units.push({ unitId: u.unitId, name: u.name, assessment: 0 });
                });
                this.signUpStep = 1;
            }
            else {
                this.signUp_Commit();
            }
        }
        /**
         * Handle the assessment frequency
         */
        signUp_AssessmentFrequency(frequencyIndex) {
            this.signUpInfo.frequencyIndex = frequencyIndex;
            this.signUpInfo.assessmentFrequency = PeriodicPaymentFrequencies[frequencyIndex].name;
            this.signUpStep = 2;
        }
        /**
         * Save the late fee info
         */
        saveLateFee() {
            this.isLoadingLateFee = true;
            this.$http.put("/api/OnlinePayment/LateFee?dayOfMonth=" + this.lateFeeInfo.lateFeeDayOfMonth + "&lateFeeAmount=" + this.lateFeeInfo.lateFeeAmount, null).then((httpResponse) => {
                this.isLoadingLateFee = false;
                const lateFeeResult = httpResponse.data;
                if (!lateFeeResult || !lateFeeResult.feeAmount || lateFeeResult.feeType === 0) {
                    if (this.lateFeeInfo.lateFeeDayOfMonth !== "")
                        alert("Failed to save the late fee. Please enter only a number for the date (ex. 5) and an amount (ex. 12.34) or percent (ex. 5%) for the fee. To disable late fees, clear the date field and hit save.");
                    this.lateFeeInfo.lateFeeDayOfMonth = "";
                    this.lateFeeInfo.lateFeeAmount = null;
                }
                else {
                    this.lateFeeInfo.lateFeeAmount = lateFeeResult.feeAmount;
                    // feeType of 2 is percent, 1 is flat, and 0 is invalid
                    if (lateFeeResult.feeType === 1)
                        this.lateFeeInfo.lateFeeAmount = "$" + this.lateFeeInfo.lateFeeAmount;
                    else if (lateFeeResult.feeType === 2)
                        this.lateFeeInfo.lateFeeAmount = "" + this.lateFeeInfo.lateFeeAmount + "%";
                }
            }, (httpResponse) => {
                this.isLoadingLateFee = false;
                const errorMessage = httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to update late fee: " + errorMessage);
            });
        }
        /**
         * Show the PayPal info for a specific transaction
         */
        showPayPalCheckoutInfo(payPalCheckoutId) {
            this.viewingPayPalCheckoutId = payPalCheckoutId;
            if (!this.viewingPayPalCheckoutId)
                return;
            this.isLoadingCheckoutDetails = true;
            this.checkoutInfo = {};
            this.$http.get("/api/OnlinePayment/PayPalCheckoutInfo?checkoutId=" + payPalCheckoutId, { cache: true }).then((httpResponse) => {
                this.isLoadingCheckoutDetails = false;
                this.checkoutInfo = httpResponse.data;
            }, (httpResponse) => {
                this.isLoadingCheckoutDetails = false;
                alert("Failed to retrieve checkout details: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Show the WePay info for a specific transaction
         */
        showWePayCheckoutInfo(wePayCheckoutId) {
            this.viewingWePayCheckoutId = wePayCheckoutId;
            if (!this.viewingWePayCheckoutId)
                return;
            this.isLoadingCheckoutDetails = true;
            this.checkoutInfo = {};
            this.$http.get("/api/OnlinePayment/WePayCheckoutInfo?checkoutId=" + wePayCheckoutId, { cache: true }).then((httpResponse) => {
                this.isLoadingCheckoutDetails = false;
                this.checkoutInfo = httpResponse.data;
            }, (httpResponse) => {
                this.isLoadingCheckoutDetails = false;
                alert("Failed to retrieve checkout details: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Show the Paragon info for a specific transaction
         */
        showParagonCheckoutInfo(paragonReferenceNumber) {
            this.viewingParagonReferenceNumber = paragonReferenceNumber;
            if (!this.viewingParagonReferenceNumber)
                return;
            this.isLoadingCheckoutDetails = true;
            this.checkoutInfo = {};
            this.$http.get("/api/OnlinePayment/ParagonCheckoutInfo?paymentReferenceNumber=" + paragonReferenceNumber, { cache: true }).then((httpResponse) => {
                this.isLoadingCheckoutDetails = false;
                this.checkoutInfo = httpResponse.data;
            }, (httpResponse) => {
                this.isLoadingCheckoutDetails = false;
                alert("Failed to retrieve checkout details: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Show the Dwolla info for a specific transaction
         */
        showDwollaTransferInfo(paymentEntry) {
            this.viewingDwollaEntry = paymentEntry;
            if (!this.viewingDwollaEntry)
                return;
            this.isLoadingCheckoutDetails = true;
            this.checkoutInfo = {};
            this.$http.get("/api/OnlinePayment/DwollaCheckoutInfo/" + paymentEntry.paymentId).then((httpResponse) => {
                this.isLoadingCheckoutDetails = false;
                this.checkoutInfo = httpResponse.data;
                this.checkoutInfo.payerNotes = paymentEntry.notes;
            }, (httpResponse) => {
                this.isLoadingCheckoutDetails = false;
                alert("Failed to retrieve checkout details: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Show the Dwolla info for a specific transaction
         */
        showStripeTransferInfo(paymentEntry) {
            this.viewingStripeEntry = paymentEntry;
            if (!this.viewingStripeEntry)
                return;
            this.isLoadingCheckoutDetails = true;
            this.checkoutInfo = {};
            this.$http.get("/api/OnlinePayment/StripeCheckoutInfo/" + paymentEntry.paymentId).then((httpResponse) => {
                this.isLoadingCheckoutDetails = false;
                this.checkoutInfo = httpResponse.data;
                this.checkoutInfo.payerNotes = paymentEntry.notes;
                // Sometimes the status updates on checking
                paymentEntry.status = httpResponse.data.status;
            }, (httpResponse) => {
                this.isLoadingCheckoutDetails = false;
                alert("Failed to retrieve checkout details: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Cancel a Dwolla transfer
         */
        cancelDwollaTransfer() {
            if (!this.viewingDwollaEntry)
                return;
            this.isLoadingCheckoutDetails = true;
            this.checkoutInfo = {};
            this.$http.get("/api/Dwolla/CancelTransfer/" + this.viewingDwollaEntry.paymentId).then((httpResponse) => {
                this.isLoadingCheckoutDetails = false;
                this.checkoutInfo = httpResponse.data;
                // Refresh the page to show the updated status
                window.location.reload();
            }, (httpResponse) => {
                this.isLoadingCheckoutDetails = false;
                alert("Failed to cancel transfer: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Save the sign-up answers
         */
        signUp_Commit() {
            this.isLoading = true;
            this.$http.post("/api/OnlinePayment/BasicInfo", this.signUpInfo).then(() => {
                // Update the unit assessments
                this.refreshUnits();
                // Update the assessment flag
                this.hasAssessments = this.signUpInfo.hasAssessments;
                this.siteInfo.privateSiteInfo.hasAssessments = this.hasAssessments;
                // Refresh the site info to reflect the assessment frequency
                window.location.reload();
            }, (httpResponse) => {
                this.isLoading = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    this.errorMessage = httpResponse.data.exceptionMessage;
            });
        }
        /**
         * Allow the admin to clear the WePay access token for testing
         */
        updateTestFee() {
            const numericAmount = parseFloat(this.testFee.amount);
            if (this.exampleFeeService === "wepay") {
                if (this.paymentInfo.payerPaysAchFee) {
                    this.testFee.achResidentPays = numericAmount + 1.5;
                    this.testFee.achAssociationReceives = numericAmount;
                }
                else {
                    this.testFee.achResidentPays = numericAmount;
                    this.testFee.achAssociationReceives = numericAmount - 1.5;
                }
                const ccFee = 1.3 + (numericAmount * 0.029);
                if (this.paymentInfo.payerPaysCCFee) {
                    this.testFee.ccResidentPays = numericAmount + ccFee;
                    this.testFee.ccAssociationReceives = numericAmount;
                }
                else {
                    this.testFee.ccResidentPays = numericAmount;
                    this.testFee.ccAssociationReceives = numericAmount - ccFee;
                }
            }
            else {
                const stripeFeeInfo = Ally.HtmlUtil2.getStripeFeeInfo(numericAmount, this.paymentInfo.payerPaysAchFee, this.siteInfo.privateSiteInfo.isPremiumPlanActive);
                this.testFee.achResidentPays = stripeFeeInfo.totalAmountPaid;
                this.testFee.achAssociationReceives = stripeFeeInfo.groupReceives;
            }
        }
        /**
         * Allow the admin to clear the WePay access token for testing
         */
        clearWePayAccessToken() {
            this.isLoading = true;
            this.$http.get("/api/OnlinePayment/ClearWePayAuthToken").then(() => {
                window.location.reload();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to disable WePay: " + httpResponse.data.exceptionMessage);
            });
        }
        showDwollaSignUpModal() {
            this.shouldShowDwollaAddAccountModal = true;
            window.setTimeout(() => {
                grecaptcha.render("recaptcha-check-elem");
            }, 200);
        }
        /**
         * Start the Dwolla IAV process
         */
        startDwollaSignUp() {
            const recaptchaKey = grecaptcha.getResponse();
            if (HtmlUtil.isNullOrWhitespace(recaptchaKey)) {
                alert("Please complete the reCAPTCHA field");
                return;
            }
            this.shouldShowDwollaModalClose = false;
            this.isDwollaIavDone = false;
            this.isLoading = true;
            const startDwollaIav = (iavToken) => {
                dwolla.configure(Ally.AppConfigInfo.dwollaEnvironmentName);
                dwolla.iav.start(iavToken, {
                    container: 'dwolla-iav-container',
                    stylesheets: [
                        'https://fonts.googleapis.com/css?family=Lato&subset=latin,latin-ext'
                    ],
                    microDeposits: true,
                    fallbackToMicroDeposits: true
                }, (err, res) => {
                    console.log('Error: ' + JSON.stringify(err) + ' -- Response: ' + JSON.stringify(res));
                    if (res && res._links && res._links["funding-source"] && res._links["funding-source"].href) {
                        const fundingSourceUri = res._links["funding-source"].href;
                        // Tell the server
                        this.$http.put("/api/Dwolla/SetGroupFundingSourceUri", { fundingSourceUri }).then(() => {
                            this.isDwollaIavDone = true;
                        }, (response) => {
                            this.isLoading = false;
                            this.shouldShowDwollaModalClose = true;
                            alert("Failed to complete sign-up: " + response.data.exceptionMessage);
                        });
                    }
                });
            };
            this.$http.get("/api/Dwolla/GroupIavToken?token=" + encodeURIComponent(recaptchaKey)).then((httpResponse) => {
                this.isLoading = false;
                this.dwollaIavToken = httpResponse.data.iavToken;
                startDwollaIav(this.dwollaIavToken);
            }, (httpResponse) => {
                this.isLoading = false;
                this.shouldShowDwollaAddAccountModal = false;
                grecaptcha.reset();
                alert("Failed to start instant account verification: " + httpResponse.data.exceptionMessage);
            });
        }
        hideDwollaAddAccountModal() {
            this.shouldShowDwollaAddAccountModal = false;
            this.dwollaIavToken = null;
            if (this.isDwollaIavDone) {
                this.isLoading = true;
                window.location.reload();
            }
        }
        /**
         * Disconnect the bank account from Dwolla
         */
        disconnectDwolla() {
            if (!confirm("Are you sure you want to disconnect the bank account? Residents will no longer be able to make payments."))
                return;
            this.isLoading = true;
            this.$http.put("/api/Dwolla/DisconnectGroupFundingSource", null).then(() => {
                window.location.reload();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to disconnect account" + httpResponse.data.exceptionMessage);
            });
        }
        showMicroDepositModal() {
            this.shouldShowMicroDepositModal = true;
            this.dwollaMicroDepositAmount1String = "0.01";
            this.dwollaMicroDepositAmount2String = "0.01";
        }
        submitDwollaMicroDepositAmounts() {
            this.isLoading = true;
            const postData = {
                amount1String: this.dwollaMicroDepositAmount1String,
                amount2String: this.dwollaMicroDepositAmount2String,
                isForGroup: true
            };
            this.$http.post("/api/Dwolla/VerifyMicroDeposit", postData).then(() => {
                window.location.reload();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to verify: " + httpResponse.data.exceptionMessage);
            });
        }
        addDwollaAccountViaPlaid() {
            this.isLoading = true;
            this.$http.post("/api/Dwolla/SignUpGroupFromPlaid/81", null).then(() => {
                window.location.reload();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to use Plaid account: " + httpResponse.data.exceptionMessage);
            });
        }
        showCustomInstructionsEditor() {
            this.shouldShowCustomInstructions = true;
            window.setTimeout(() => {
                Ally.HtmlUtil2.initTinyMce("tiny-mce-editor", 220, { menubar: false }).then(e => {
                    this.pageContentTinyMce = e;
                    this.pageContentTinyMce.setContent(this.paymentInfo.customFinancialInstructions || "");
                    //this.pageContentTinyMce.on( "change", ( e: any ) =>
                    //{
                    //    // Need to wrap this in a $scope.using because this event is invoked by vanilla JS, not Angular
                    //    this.$scope.$apply( () =>
                    //    {
                    //    } );
                    //} );
                });
            }, 25);
        }
        saveCustomInstructions() {
            this.isLoading = true;
            const putBody = {
                newInstructions: this.pageContentTinyMce.getContent()
            };
            this.$http.put("/api/OnlinePayment/UpdateCustomFinancialInstructions", putBody).then(() => {
                this.isLoading = false;
                if (!putBody.newInstructions)
                    this.shouldShowCustomInstructions = false;
                // Update the local value
                this.siteInfo.privateSiteInfo.customFinancialInstructions = putBody.newInstructions;
            }, (response) => {
                this.isLoading = false;
                alert("Failed to save: " + response.data.exceptionMessage);
            });
        }
        signUpForStripe() {
            this.isLoading = true;
            this.$http.get("/api/StripePayments/StartSignUp").then((response) => {
                // Don't stop the loading indicator, just redirect to Stripe
                //this.isLoading = false;
                //window.open( response.data, "_self" );
                window.location.href = response.data;
            }, (response) => {
                this.isLoading = false;
                alert("Failed to start Stripe sign-up: " + response.data.exceptionMessage);
            });
        }
    }
    ManagePaymentsController.$inject = ["$http", "SiteInfo", "appCacheService", "uiGridConstants", "$scope"];
    Ally.ManagePaymentsController = ManagePaymentsController;
    class ParagonPaymentDetails {
    }
    class DwollaPaymentDetails {
    }
    class StripePaymentDetails {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("managePayments", {
    templateUrl: "/ngApp/chtn/manager/financial/manage-payments.html",
    controller: Ally.ManagePaymentsController
});
class PaymentBasicInfoUnitAssessment {
}
class PaymentBasicInfo {
}

var Ally;
(function (Ally) {
    /**
     * The controller for the page to track group spending
     */
    class StripeLinkRefreshController {
        /**
        * The constructor for the class
        */
        constructor($http, siteInfo, appCacheService, $location) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.$location = $location;
            this.isLoading = false;
            this.statusMessage = "Refreshing Stripe Connection...";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.refreshLink();
        }
        /**
        * Retrieve the report data
        */
        refreshLink() {
            this.isLoading = true;
            this.$http.get("/api/StripePayments/StartSignUp").then((response) => {
                this.statusMessage = `Refreshed, redirecting to Stripe now...`;
                window.location.href = response.data;
            }, (response) => {
                this.isLoading = false;
                this.statusMessage = `Failed to restart Stripe sign-up, please refresh the page or contact support (Error: ${response.data.exceptionMessage})`;
                alert(this.statusMessage);
            });
        }
    }
    StripeLinkRefreshController.$inject = ["$http", "SiteInfo", "appCacheService", "$location"];
    Ally.StripeLinkRefreshController = StripeLinkRefreshController;
})(Ally || (Ally = {}));
CA.angularApp.component("stripeLinkRefresh", {
    templateUrl: "/ngApp/chtn/manager/financial/stripe-link-refresh.html",
    controller: Ally.StripeLinkRefreshController
});

var Ally;
(function (Ally) {
    class Committee {
        constructor() {
            this.isPrivate = false;
        }
    }
    Ally.Committee = Committee;
    /**
     * The controller for the page to add, edit, and delete committees
     */
    class ManageCommitteesController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, $cacheFactory) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$cacheFactory = $cacheFactory;
            this.includeInactive = false;
            this.activeCommittees = [];
            this.inactiveCommittees = [];
            this.showInactiveCommittees = false;
            this.editCommittee = null;
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.retrieveCommittees();
        }
        /**
        * Called when the user chooses to deactivate a committee
        */
        startEditCommittee(committee) {
            this.editCommittee = committee;
        }
        /**
        * Called when the user chooses to deactivate a committee
        */
        showCreateModal() {
            this.editCommittee = new Committee();
            this.editCommittee.committeeType = "Ongoing";
        }
        /**
        * Called when the user chooses to deactivate a committee
        */
        toggleCommitteeActive(committee) {
            this.isLoading = true;
            const putUri = (committee.deactivationDateUtc ? "/api/Committee/Reactivate/" : "/api/Committee/Deactivate/") + committee.committeeId;
            this.$http.put(putUri, null).then(() => {
                this.isLoading = false;
                this.retrieveCommittees();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to retrieve the modify committee: " + response.data.exceptionMessage);
            });
        }
        /**
        * Retrieve the list of available committees
        */
        retrieveCommittees() {
            this.isLoading = true;
            this.$http.get("/api/Committee?includeInactive=true").then((response) => {
                const committees = response.data;
                this.isLoading = false;
                this.activeCommittees = _.filter(committees, c => !c.deactivationDateUtc);
                this.inactiveCommittees = _.filter(committees, c => !!c.deactivationDateUtc);
                this.activeCommittees = _.sortBy(this.activeCommittees, c => c.name.toLowerCase());
                this.inactiveCommittees = _.sortBy(this.inactiveCommittees, c => c.name.toLowerCase());
                // Convert the last login timestamps to local time
                //_.forEach( committees, c => c.creationDateUtc = moment.utc( c.creationDateUtc ).toDate() );
            }, (response) => {
                this.isLoading = false;
                alert("Failed to retrieve the committee listing: " + response.data.exceptionMessage);
            });
        }
        /**
        * Create a new committee
        */
        saveCommittee() {
            if (HtmlUtil.isNullOrWhitespace(this.editCommittee.name)) {
                alert("Please enter a name for the new committee.");
                return;
            }
            if (!this.editCommittee.committeeType) {
                alert("Please select a type for the new committee.");
                return;
            }
            this.isLoading = true;
            const saveUri = `/api/Committee${(this.editCommittee.committeeId ? ("/" + this.editCommittee.committeeId.toString()) : "")}?name=${encodeURIComponent(this.editCommittee.name)}&type=${encodeURIComponent(this.editCommittee.committeeType)}&isPrivate=${this.editCommittee.isPrivate.toString()}`;
            const httpFunc = this.editCommittee.committeeId ? this.$http.put : this.$http.post;
            httpFunc(saveUri, null).then(() => {
                this.isLoading = false;
                this.editCommittee = null;
                this.retrieveCommittees();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to save the committee: " + response.data.exceptionMessage);
            });
        }
    }
    ManageCommitteesController.$inject = ["$http", "SiteInfo", "$cacheFactory"];
    Ally.ManageCommitteesController = ManageCommitteesController;
})(Ally || (Ally = {}));
CA.angularApp.component("manageCommittees", {
    templateUrl: "/ngApp/chtn/manager/manage-committees.html",
    controller: Ally.ManageCommitteesController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the page to add, edit, and delete custom pages
     */
    class ManageCustomPagesController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, $scope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$scope = $scope;
            this.isLoading = false;
            this.includeInactive = false;
            this.allPageListings = [];
            this.menuPageListings = [];
            this.selectedPageEntry = null;
            this.editPage = null;
            this.selectedLandingPageId = null;
            this.pageSizeString = "0 bytes";
            this.pageSizeBytes = 0;
            this.groupBaseUrl = this.siteInfo.publicSiteInfo.baseUrl;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.retrievePages();
            Ally.HtmlUtil2.initTinyMce("tiny-mce-editor", 900).then(e => {
                this.pageContentTinyMce = e;
                this.pageContentTinyMce.on("change", (e) => {
                    // Need to wrap this in a $scope.using because this event is invoked by vanilla JS, not Angular
                    this.$scope.$apply(() => {
                        this.updatePageSizeLabel();
                    });
                });
            });
            this.$http.get("/api/CustomPage/GroupLandingPage").then((response) => {
                this.selectedLandingPageId = response.data ? response.data : null;
            }, (response) => {
                console.log("Failed to retrieve current landing page: " + response.data.exceptionMessage);
            });
        }
        /**
         * Update the label under the editor showing the size of the page to download
         */
        updatePageSizeLabel() {
            if (!this.pageContentTinyMce)
                return;
            const bodyText = this.pageContentTinyMce.getContent() || "";
            this.pageSizeBytes = bodyText.length;
            this.pageSizeString = (this.pageSizeBytes / 1048576).toFixed(2) + " MB";
            //if( this.pageSizeBytes < 5 * 1024 )
            //    this.pageSizeString = this.pageSizeBytes.toString() + " bytes";
            //else if( this.pageSizeBytes < 1 * 1024 * 1024 )
            //    this.pageSizeString = Math.round( this.pageSizeBytes / 1024 ).toString() + " KB";
            //else
            //    this.pageSizeString = Math.round( this.pageSizeBytes / 1048576 ).toString() + " MB";
        }
        /**
        * Retrieve the list of custom pages
        */
        retrievePages() {
            this.isLoading = true;
            this.$http.get("/api/CustomPage/AllPages").then((response) => {
                this.isLoading = false;
                this.allPageListings = response.data;
                this.menuPageListings = _.clone(response.data);
                const addPage = new CustomPage();
                addPage.customPageId = -5;
                addPage.title = "Add New Page...";
                this.menuPageListings.push(addPage);
            }, (response) => {
                this.isLoading = false;
                alert("Failed to retrieve the custom pages: " + response.data.exceptionMessage);
            });
        }
        /**
        * Save the current page
        */
        savePage() {
            if (HtmlUtil.isNullOrWhitespace(this.editPage.title)) {
                alert("Please enter a title for the page");
                return;
            }
            if (HtmlUtil.isNullOrWhitespace(this.editPage.pageSlug)) {
                alert("Please enter a slug for the page");
                return;
            }
            this.editPage.markupHtml = this.pageContentTinyMce.getContent();
            this.isLoading = true;
            const httpFunc = this.editPage.customPageId ? this.$http.put : this.$http.post;
            httpFunc(`/api/CustomPage`, this.editPage).then(() => {
                this.isLoading = false;
                this.selectedPageEntry = null;
                this.editPage = null;
                this.pageContentTinyMce.setContent("");
                this.updatePageSizeLabel();
                this.retrievePages();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to save the page: " + response.data.exceptionMessage);
            });
        }
        /**
        * Permanently elete the current page
        */
        deletePage() {
            if (!confirm("Are you sure you want to permanently delete this page? This action CANNOT BE UNDONE."))
                return;
            this.isLoading = true;
            this.$http.delete("/api/CustomPage/" + this.editPage.customPageId).then(() => {
                this.isLoading = false;
                this.selectedPageEntry = null;
                this.editPage = null;
                this.pageContentTinyMce.setContent("");
                this.updatePageSizeLabel();
                this.retrievePages();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to delete the page: " + response.data.exceptionMessage);
            });
        }
        /**
        * Occurs when focus leaves the title input field
        */
        onTitleBlur() {
            if (!this.editPage || this.editPage.pageSlug || !this.editPage.title)
                return;
            this.editPage.pageSlug = (this.editPage.title || "").trim();
            this.editPage.pageSlug = this.editPage.pageSlug.replace(/[^0-9a-z- ]/gi, ''); // Remove non-alphanumeric+dash
            this.editPage.pageSlug = this.editPage.pageSlug.replace(/ /g, '-'); // Replace spaces with dashes
        }
        /**
        * Occurs when focus leaves the slug field, sanitizes the slug to be URL-friendly
        */
        onSlugBlur() {
            if (!this.editPage)
                return;
            this.editPage.pageSlug = (this.editPage.pageSlug || "").trim();
            this.editPage.pageSlug = this.editPage.pageSlug.replace(/ /g, '-'); // Replace spaces with dashes
        }
        /**
         * Occurs when the user selects a page to edit
         */
        onPageSelected() {
            if (this.selectedPageEntry.customPageId > 0) {
                this.isLoading = true;
                this.$http.get("/api/CustomPage/" + this.selectedPageEntry.customPageId).then((response) => {
                    this.isLoading = false;
                    this.editPage = response.data;
                    this.pageContentTinyMce.setContent(this.editPage.markupHtml);
                    this.updatePageSizeLabel();
                }, (response) => {
                    this.isLoading = false;
                    alert("Failed to retrieve custom page: " + response.data.exceptionMessage);
                });
            }
            else {
                this.editPage = new CustomPage();
                this.pageContentTinyMce.setContent("");
                this.updatePageSizeLabel();
            }
        }
        /**
         * Occurs when the user selects a new landing page for the group
         */
        onLandingPageSelected() {
            let putUri = "/api/CustomPage/SetGroupLandingPage";
            if (this.selectedLandingPageId)
                putUri += "?customPageId=" + this.selectedLandingPageId;
            this.isLoading = true;
            this.$http.put(putUri, null).then((response) => {
                this.isLoading = false;
                if (this.selectedLandingPageId)
                    this.siteInfo.publicSiteInfo.customLandingPagePath = null;
                else {
                    const selectedPage = this.allPageListings.find(p => p.customPageId === this.selectedLandingPageId);
                    if (selectedPage)
                        this.siteInfo.publicSiteInfo.customLandingPagePath = "#!/Page/" + selectedPage.pageSlug;
                }
            }, (response) => {
                this.isLoading = false;
                alert("Failed to update landing page: " + response.data.exceptionMessage);
            });
        }
    }
    ManageCustomPagesController.$inject = ["$http", "SiteInfo", "$scope"];
    Ally.ManageCustomPagesController = ManageCustomPagesController;
    class CustomPage {
    }
    class PublicCustomPageEntry {
    }
    Ally.PublicCustomPageEntry = PublicCustomPageEntry;
})(Ally || (Ally = {}));
CA.angularApp.component("manageCustomPages", {
    templateUrl: "/ngApp/chtn/manager/manage-custom-pages.html",
    controller: Ally.ManageCustomPagesController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the manage polls page
     */
    class ManagePollsController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, fellowResidents) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.fellowResidents = fellowResidents;
            this.editingItem = new Poll();
            this.pollHistory = [];
            this.isLoading = false;
            this.isSuperAdmin = false;
            this.shouldAllowMultipleAnswers = false;
            this.isPremiumPlanActive = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isSuperAdmin = this.siteInfo.userInfo.isAdmin;
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            const threeDaysLater = new Date();
            threeDaysLater.setDate(new Date().getDate() + 3);
            this.defaultPoll = new Poll();
            this.defaultPoll.expirationDate = threeDaysLater;
            this.defaultPoll.votingGroupShortName = "everyone";
            this.defaultPoll.answers = [
                new PollAnswer("Yes"),
                new PollAnswer("No"),
            ];
            // The new or existing news item that's being edited by the user
            this.editingItem = angular.copy(this.defaultPoll);
            this.shouldAllowMultipleAnswers = false;
            this.isLoading = true;
            this.fellowResidents.getGroupEmailObject().then((groupEmails) => {
                this.groupEmails = _.sortBy(groupEmails, e => e.displayName.toUpperCase());
                this.retrievePolls();
            }, () => this.retrievePolls());
        }
        /**
         * Populate the poll data
         */
        retrievePolls() {
            const AbstainAnswerSortOrder = 101;
            this.isLoading = true;
            this.$http.get("/api/Poll").then((httpResponse) => {
                this.pollHistory = httpResponse.data;
                // Convert the date strings to objects
                for (let i = 0; i < this.pollHistory.length; ++i) {
                    // The date comes down as a string so we need to convert it
                    this.pollHistory[i].expirationDate = new Date(this.pollHistory[i].expirationDate);
                    // Remove the abstain answer since it can't be edited, but save the full answer
                    // list for displaying results
                    this.pollHistory[i].fullResultAnswers = this.pollHistory[i].answers;
                    this.pollHistory[i].answers = _.reject(this.pollHistory[i].answers, function (pa) { return pa.sortOrder === AbstainAnswerSortOrder; });
                }
                this.isLoading = false;
            });
        }
        /**
         * Add a new answer
         */
        addAnswer() {
            if (!this.editingItem.answers)
                this.editingItem.answers = [];
            if (this.editingItem.answers.length > 19) {
                alert("You can only have 20 answers maxiumum per poll.");
                return;
            }
            this.editingItem.answers.push(new PollAnswer(""));
            window.setTimeout(() => document.getElementById("poll-answer-textbox-" + (this.editingItem.answers.length - 1)).focus(), 100);
        }
        /**
         * Stop editing a poll and reset the form
         */
        cancelEdit() {
            this.editingItem = angular.copy(this.defaultPoll);
            this.shouldAllowMultipleAnswers = false;
        }
        /**
         * Occurs when the user presses the button to save a poll
         */
        onSavePoll() {
            if (this.editingItem === null)
                return;
            this.isLoading = true;
            const onSave = () => {
                this.isLoading = false;
                this.editingItem = angular.copy(this.defaultPoll);
                this.shouldAllowMultipleAnswers = false;
                this.retrievePolls();
            };
            const onFailure = (response) => {
                this.isLoading = false;
                alert("Failed to save poll: " + response.data.exceptionMessage);
            };
            // If we're editing an existing news item
            if (typeof (this.editingItem.pollId) === "number") {
                analytics.track("editPoll");
                this.$http.put("/api/Poll", this.editingItem).then(onSave, onFailure);
            }
            // Otherwise create a new one
            else {
                analytics.track("addPoll");
                this.$http.post("/api/Poll", this.editingItem).then(onSave, onFailure);
            }
        }
        /**
         * Occurs when the user wants to edit an existing poll
         */
        onEditItem(item) {
            this.editingItem = angular.copy(item);
            window.scrollTo(0, 0);
            this.shouldAllowMultipleAnswers = this.editingItem.maxNumResponses > 1;
        }
        /**
         * Occurs when the user wants to delete a poll
         */
        onDeleteItem(item) {
            this.isLoading = true;
            this.$http.delete("/api/Poll?pollId=" + item.pollId).then(() => {
                this.retrievePolls();
            }, (httpResponse) => {
                this.isLoading = false;
                if (httpResponse.status === 403)
                    alert("You cannot authorized to delete this poll.");
                else
                    alert("Failed to delete: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user wants to view the results for a poll
         */
        onViewResults(poll) {
            if (!poll) {
                this.viewingPollResults = null;
                return;
            }
            const chartInfo = Ally.FellowResidentsService.pollReponsesToChart(poll, this.siteInfo);
            poll.chartData = chartInfo.chartData;
            poll.chartLabels = chartInfo.chartLabels;
            // Build the array for the counts to the right of the chart
            poll.answerCounts = [];
            for (let i = 0; i < poll.chartLabels.length; ++i) {
                poll.answerCounts.push({
                    label: poll.chartLabels[i],
                    count: poll.chartData[i]
                });
            }
            this.chartLabels = poll.chartLabels;
            this.chartData = poll.chartData;
            this.viewingPollResults = poll;
        }
        formatVoteGroupName(votingGroupShortName) {
            if (!this.groupEmails)
                return votingGroupShortName;
            const emailGroup = this.groupEmails.find(g => g.recipientTypeName.toLowerCase() === votingGroupShortName);
            if (!emailGroup)
                return votingGroupShortName;
            return emailGroup.displayName;
        }
        onMultiAnswerChange() {
            if (this.shouldAllowMultipleAnswers)
                this.editingItem.maxNumResponses = 2;
            else
                this.editingItem.maxNumResponses = 1;
        }
    }
    ManagePollsController.$inject = ["$http", "SiteInfo", "fellowResidents"];
    Ally.ManagePollsController = ManagePollsController;
    class Poll {
        constructor() {
            this.isAnonymous = true;
        }
    }
    Ally.Poll = Poll;
    class PollAnswer {
        constructor(answerText) {
            this.answerText = answerText;
        }
    }
    Ally.PollAnswer = PollAnswer;
    class PollResponse {
    }
    Ally.PollResponse = PollResponse;
})(Ally || (Ally = {}));
CA.angularApp.component("managePolls", {
    templateUrl: "/ngApp/chtn/manager/manage-polls.html",
    controller: Ally.ManagePollsController
});

var Ally;
(function (Ally) {
    class Unit {
    }
    Ally.Unit = Unit;
    class PayerInfo {
    }
    Ally.PayerInfo = PayerInfo;
    class UnitWithOwner extends Unit {
    }
    Ally.UnitWithOwner = UnitWithOwner;
    class UnitWithPayment extends UnitWithOwner {
    }
    Ally.UnitWithPayment = UnitWithPayment;
    class HomeEntry {
    }
    Ally.HomeEntry = HomeEntry;
    class HomeEntryWithName extends Ally.HomeEntry {
    }
    Ally.HomeEntryWithName = HomeEntryWithName;
    class Member {
    }
    Ally.Member = Member;
    class MemberWithBoard extends Member {
    }
    Ally.MemberWithBoard = MemberWithBoard;
    /// Represents a member of a CHTN site
    class Resident extends MemberWithBoard {
    }
    Ally.Resident = Resident;
    class UpdateResident extends Resident {
    }
    Ally.UpdateResident = UpdateResident;
    class RecentEmail {
    }
    class ResidentCsvRow {
    }
    class PendingMember {
    }
    Ally.PendingMember = PendingMember;
    /**
     * The controller for the page to add, edit, and delete members from the site
     */
    class ManageResidentsController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope, fellowResidents, uiGridConstants, siteInfo, appCacheService) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.fellowResidents = fellowResidents;
            this.uiGridConstants = uiGridConstants;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.isAdmin = false;
            this.showEmailSettings = true;
            this.shouldShowHomePicker = true;
            this.showKansasPtaExport = false;
            this.multiselectMulti = "single";
            this.isSavingUser = false;
            this.isLoading = false;
            this.isLoadingSettings = false;
            this.shouldSortUnitsNumerically = false;
            this.showEmailHistory = false;
            this.emailHistorySinceDate = new Date();
            this.emailHistoryNumMonths = 6;
            this.bulkParseNormalizeNameCase = false;
            this.showLaunchSite = true;
            this.showPendingMembers = false;
            this.isLoadingPending = false;
            this.selectedResidentDetailsView = "Primary";
            this.showAddHomeLink = false;
            this.hasMemberNotOwnerRenter = false;
            this.didLoadResidentGridState = false;
            this.shouldSaveResidentGridState = true;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isAdmin = this.siteInfo.userInfo.isAdmin;
            this.siteLaunchedDateUtc = this.siteInfo.privateSiteInfo.siteLaunchedDateUtc;
            this.bulkImportRows = [new ResidentCsvRow()];
            this.multiselectOptions = "";
            this.allUnits = null;
            this.homeName = AppConfig.homeName || "Unit";
            this.showIsRenter = AppConfig.appShortName === "condo" || AppConfig.appShortName === "hoa";
            this.shouldShowResidentPermissions = this.showIsRenter || AppConfig.appShortName === "block-club";
            this.shouldShowHomePicker = AppConfig.appShortName !== "pta";
            this.showKansasPtaExport = AppConfig.appShortName === "pta" && this.siteInfo.privateSiteInfo.groupAddress.state === "KS";
            this.showEmailSettings = !this.siteInfo.privateSiteInfo.isEmailSendingRestricted;
            this.memberTypeLabel = AppConfig.memberTypeLabel;
            this.showLaunchSite = AppConfig.appShortName !== "pta";
            this.showPendingMembers = AppConfig.appShortName === "pta" || AppConfig.appShortName === "block-club" || AppConfig.appShortName === "neighborhood";
            this.hasMemberNotOwnerRenter = AppConfig.appShortName === "pta" || AppConfig.appShortName === "block-club" || AppConfig.appShortName === "neighborhood";
            // Show the add home article link if the site isn't launched and is less than 8 days old
            const twoWeeksAfterCreate = moment(this.siteInfo.privateSiteInfo.creationDate).add(14, "days");
            this.showAddHomeLink = !this.siteInfo.privateSiteInfo.siteLaunchedDateUtc && moment().isBefore(twoWeeksAfterCreate);
            if (this.showPendingMembers) {
                this.pendingMemberSignUpUrl = `https://${HtmlUtil.getSubdomain()}.${AppConfig.baseTld}/#!/MemberSignUp`;
                // Hook up the address copy link
                setTimeout(() => {
                    const clipboard = new ClipboardJS(".clipboard-button");
                    clipboard.on("success", (e) => {
                        Ally.HtmlUtil2.showTooltip(e.trigger, "Copied!");
                        e.clearSelection();
                    });
                    clipboard.on("error", (e) => {
                        Ally.HtmlUtil2.showTooltip(e.trigger, "Auto-copy failed, press CTRL+C now");
                    });
                }, 750);
            }
            this.boardPositions = Ally.FellowResidentsService.BoardPositionNames;
            this.newResident = {
                boardPosition: 0,
                isRenter: false
            };
            this.editUser = null;
            const LocalKey_ResidentSort = "residentSort_v2";
            const defaultSort = { field: "lastName", direction: this.uiGridConstants.ASC };
            this.residentSortInfo = defaultSort;
            if (window.localStorage) {
                const sortOptions = window.localStorage.getItem(LocalKey_ResidentSort);
                if (sortOptions)
                    this.residentSortInfo = JSON.parse(sortOptions);
                if (!this.residentSortInfo.field)
                    this.residentSortInfo = defaultSort;
            }
            const homeColumnWidth = AppConfig.appShortName === "hoa" ? 140 : (this.showIsRenter ? 62 : 175);
            this.residentGridOptions =
                {
                    data: [],
                    enableFiltering: false,
                    columnDefs: [
                        { field: 'firstName', displayName: 'First Name', cellClass: "resident-cell-first", enableFiltering: true },
                        { field: 'lastName', displayName: 'Last Name', cellClass: "resident-cell-last", enableFiltering: true },
                        { field: 'email', displayName: 'Email', cellTemplate: '<div class="ui-grid-cell-contents" ng-class="col.colIndex()"><span ng-cell-text class="resident-cell-email" data-ng-style="{ \'color\': row.entity.postmarkReportedBadEmailUtc ? \'#F00\' : \'auto\' }">{{ row.entity.email }}</span></div>', enableFiltering: true },
                        { field: 'phoneNumber', displayName: 'Cell Phone', width: 150, cellClass: "resident-cell-phone", cellTemplate: '<div class="ui-grid-cell-contents" ng-class="col.colIndex()"><span ng-cell-text>{{ row.entity.phoneNumber | tel }}</span></div>', enableFiltering: true },
                        {
                            field: 'unitGridLabel',
                            displayName: AppConfig.appShortName === 'condo' ? 'Unit' : 'Residence',
                            cellClass: "resident-cell-unit",
                            width: homeColumnWidth,
                            visible: AppConfig.isChtnSite,
                            sortingAlgorithm: (a, b) => {
                                if (this.shouldSortUnitsNumerically) {
                                    return parseInt(a) - parseInt(b);
                                }
                                return a.toString().localeCompare(b.toString());
                            },
                            enableFiltering: true
                        },
                        {
                            field: 'isRenter',
                            displayName: 'Renter',
                            width: 80,
                            cellClass: "resident-cell-is-renter",
                            visible: this.showIsRenter,
                            cellTemplate: '<div class="ui-grid-cell-contents" style="text-align:center; padding-top: 8px;"><input type="checkbox" disabled="disabled" data-ng-checked="row.entity.isRenter"></div>',
                            enableFiltering: false
                        },
                        { field: 'boardPosition', displayName: 'Board', width: 125, cellClass: "resident-cell-board", cellTemplate: '<div class="ui-grid-cell-contents" ng-class="col.colIndex()"><span ng-cell-text>{{ grid.appScope.$ctrl.getBoardPositionName(row.entity.boardPosition) }}</span></div>', enableFiltering: false },
                        { field: 'isSiteManager', displayName: 'Admin', width: 80, cellClass: "resident-cell-site-manager", cellTemplate: '<div class="ui-grid-cell-contents" style="text-align:center; padding-top: 8px;"><input type="checkbox" disabled="disabled" data-ng-checked="row.entity.isSiteManager"></div>', enableFiltering: false },
                        { field: 'lastLoginDateUtc', displayName: 'Last Login', width: 140, enableFiltering: false, visible: false, type: 'date', cellFilter: "date:'short'" },
                        { field: 'alternatePhoneNumber', displayName: 'Alt Phone', width: 140, enableFiltering: false, visible: false },
                        { field: 'addedDateUtc', displayName: 'Added Date', width: 140, enableFiltering: false, visible: false, type: 'date', cellFilter: "date:'short'" },
                    ],
                    multiSelect: false,
                    enableSorting: true,
                    enableHorizontalScrollbar: window.innerWidth < 996 ? this.uiGridConstants.scrollbars.ALWAYS : this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableFullRowSelection: true,
                    enableColumnMenus: false,
                    enableGridMenu: true,
                    enableRowHeaderSelection: false,
                    onRegisterApi: (gridApi) => {
                        this.residentsGridApi = gridApi;
                        gridApi.selection.on.rowSelectionChanged(this.$rootScope, (row) => {
                            this.setEdit(row.entity);
                        });
                        gridApi.core.on.sortChanged(this.$rootScope, (grid, sortColumns) => {
                            if (!sortColumns || sortColumns.length === 0)
                                return;
                            // Remember the sort
                            this.residentSortInfo = { field: sortColumns[0].field, direction: sortColumns[0].sort.direction };
                            window.localStorage.setItem(LocalKey_ResidentSort, JSON.stringify(this.residentSortInfo));
                        });
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
            // Need to cast to any because property is missing from typed file
            this.residentGridOptions.gridMenuShowHideColumns = true;
            this.pendingMemberGridOptions =
                {
                    data: [],
                    columnDefs: [
                        { field: 'firstName', displayName: 'First Name' },
                        { field: 'lastName', displayName: 'Last Name' },
                        { field: 'email', displayName: 'Email' },
                        { field: 'phoneNumber', displayName: 'Phone Number', width: 150, cellClass: "resident-cell-phone", cellTemplate: '<div class="ui-grid-cell-contents" ng-class="col.colIndex()"><span ng-cell-text>{{ row.entity.phoneNumber | tel }}</span></div>' },
                    ],
                    multiSelect: false,
                    enableSorting: true,
                    enableHorizontalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableFullRowSelection: true,
                    enableColumnMenus: false,
                    enableRowHeaderSelection: false,
                    onRegisterApi: (gridApi) => {
                        this.pendingMemberGridApi = gridApi;
                        gridApi.selection.on.rowSelectionChanged(this.$rootScope, (row) => {
                            this.selectPendingMember(row.entity);
                        });
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
            if (window.innerWidth < 769) {
                for (let i = 2; i < this.residentGridOptions.columnDefs.length; ++i)
                    this.residentGridOptions.columnDefs[i].visible = false;
            }
            this.emailHistoryGridOptions =
                {
                    columnDefs: [
                        { field: 'senderName', displayName: 'Sender', width: 150 },
                        { field: 'recipientGroup', displayName: 'Sent To', width: 100 },
                        { field: 'messageSource', displayName: 'Source', width: 100 },
                        { field: 'subject', displayName: 'Subject' },
                        { field: 'sendDateUtc', displayName: 'Send Date', width: 140, type: 'date', cellFilter: "date:'short'" },
                        { field: 'numRecipients', displayName: '#Recip.', width: 70 },
                        { field: 'numAttachments', displayName: '#Attach.', width: 80 }
                    ],
                    enableSorting: true,
                    enableHorizontalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableColumnMenus: false,
                    enablePaginationControls: true,
                    paginationPageSize: 20,
                    paginationPageSizes: [20],
                    enableRowHeaderSelection: false,
                    onRegisterApi: (gridApi) => {
                        this.emailHistoryGridApi = gridApi;
                        gridApi.selection.on.rowSelectionChanged(this.$rootScope, (row) => {
                            this.viewingRecentEmailBody = row.entity.messageBody;
                        });
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
            this.refreshResidents()
                .then(() => this.loadSettings())
                .then(() => {
                if (this.appCacheService.getAndClear("goToEmailHistory") === "true") {
                    document.getElementById("toggle-email-history-link").scrollIntoView();
                    this.toggleEmailHistoryVisible();
                }
                if (this.residentsGridApi && window.localStorage[ManageResidentsController.StoreKeyResidentGridState]) {
                    const gridState = JSON.parse(window.localStorage[ManageResidentsController.StoreKeyResidentGridState]);
                    if (gridState && typeof (gridState) === "object") {
                        this.residentsGridApi.saveState.restore(this, gridState);
                        this.residentsGridApi.grid.clearAllFilters(true, true, false);
                        this.didLoadResidentGridState = true;
                    }
                }
                if (this.showPendingMembers)
                    this.loadPendingMembers();
            });
        }
        /**
         * Called on a controller when its containing scope is destroyed. Use this hook for releasing external resources,
         * watches and event handlers.
         */
        $onDestroy() {
            // Save the grid state (column order, widths, visible, etc.)
            if (this.shouldSaveResidentGridState) {
                const gridState = this.residentsGridApi.saveState.save();
                window.localStorage[ManageResidentsController.StoreKeyResidentGridState] = JSON.stringify(gridState);
            }
        }
        getBoardPositionName(boardValue) {
            if (!boardValue)
                return "";
            const boardPosition = jQuery.grep(Ally.FellowResidentsService.BoardPositionNames, (pos, i) => pos.id === boardValue)[0];
            if (!boardPosition)
                return "";
            return boardPosition.name;
        }
        /**
        * View a pending member's information
        */
        selectPendingMember(pendingMember) {
            this.pendingMemberGridApi.selection.clearSelectedRows();
            const newUserInfo = new UpdateResident();
            newUserInfo.firstName = pendingMember.firstName;
            newUserInfo.lastName = pendingMember.lastName;
            newUserInfo.email = pendingMember.email;
            newUserInfo.phoneNumber = pendingMember.phoneNumber;
            newUserInfo.pendingMemberId = pendingMember.pendingMemberId;
            //newUserInfo.firstName = pendingMember.schoolsAttended;
            //newUserInfo.firstName = pendingMember.streetAddress;
            newUserInfo.boardPosition = 0;
            newUserInfo.shouldSendWelcomeEmail = false;
            this.setEdit(newUserInfo);
        }
        closeViewingEmail() {
            this.viewingRecentEmailBody = null;
            this.emailHistoryGridApi.selection.clearSelectedRows();
        }
        /**
        * Edit a resident's information
        */
        setEdit(resident) {
            this.sentWelcomeEmail = false;
            if (resident === null) {
                this.editUser = null;
                return;
            }
            this.selectedResidentDetailsView = "Primary";
            this.editUserForm.$setPristine();
            const copiedUser = jQuery.extend({}, resident);
            this.editUser = copiedUser;
            // Initialize the home picker state
            this.editUser.showAdvancedHomePicker = this.allUnits ? this.allUnits.length > 20 : false;
            this.multiselectMulti = "single";
            if (typeof (this.editUser.units) === "object") {
                if (this.editUser.units.length > 0)
                    this.editUser.singleUnitId = this.editUser.units[0].unitId;
                if (this.editUser.units.length > 1) {
                    this.editUser.showAdvancedHomePicker = true;
                    this.multiselectMulti = "multiple";
                }
            }
            // Add an empty unit option for the advanced picker in single-select mode
            if (this.allUnits && this.allUnits.length > 20 && this.multiselectMulti === "single") {
                // Add an empty entry since the multi-select control doesn't allow deselection
                if (this.allUnits[0].unitId !== -5) {
                    const emptyUnit = new Ally.Unit();
                    emptyUnit.name = "None Selected";
                    emptyUnit.unitId = -5;
                    this.allUnits.unshift(emptyUnit);
                }
            }
            // Set the selected units
            _.each(this.allUnits, (allUnit) => {
                const isSelected = _.find(this.editUser.units, (userUnit) => userUnit.unitId === allUnit.unitId) !== undefined;
                allUnit.isSelectedForEditUser = isSelected;
            });
            if (this.editUser.postmarkReportedBadEmailUtc && Ally.HtmlUtil2.isValidString(this.editUser.postmarkReportedBadEmailReason)) {
                this.editUser.badEmailDate = this.editUser.postmarkReportedBadEmailUtc;
                if (this.editUser.postmarkReportedBadEmailReason === "SpamComplaint"
                    || this.editUser.postmarkReportedBadEmailReason === "SpamComplaint")
                    this.editUser.friendlyBadEmailReason = "SpamReport";
                else if (this.editUser.postmarkReportedBadEmailReason === "InactiveRecipient")
                    this.editUser.friendlyBadEmailReason = "Inactive";
                else if (this.editUser.postmarkReportedBadEmailReason === "HardBounce")
                    this.editUser.friendlyBadEmailReason = "Bounce";
                else if (this.editUser.postmarkReportedBadEmailReason === "FailedDuringSend")
                    this.editUser.friendlyBadEmailReason = "FailedSend";
                else
                    this.editUser.friendlyBadEmailReason = this.editUser.postmarkReportedBadEmailReason;
            }
            //this.residentGridOptions.selectAll( false );
            this.residentsGridApi.selection.clearSelectedRows();
            setTimeout("$( '#edit-user-first-text-box' ).focus();", 100);
        }
        /**
         * Send a resident the welcome email
         */
        onSendWelcome() {
            this.isSavingUser = true;
            this.$http.put("/api/Residents/" + this.editUser.userId + "/SendWelcome", null).then(() => {
                this.isSavingUser = false;
                this.sentWelcomeEmail = true;
            }, () => {
                this.isSavingUser = false;
                alert("Failed to send the welcome email, please contact support if this problem persists.");
            });
        }
        /**
         * Populate the text that is shown for the unit column in the resident grid
         */
        populateGridUnitLabels() {
            // Populate the unit names for the grid
            _.each(this.residentGridOptions.data, (res) => {
                const unitLabel = _.reduce(res.units, (memo, u) => {
                    if (memo.length > 0)
                        return memo + "," + u.name;
                    else
                        return u.name;
                }, "");
                res.unitGridLabel = unitLabel;
            });
        }
        /**
         * Populate the residents
         */
        refreshResidents() {
            this.isLoading = true;
            return this.$http.get("/api/Residents").then((response) => {
                this.isLoading = false;
                const residentArray = response.data;
                // The addedDateUtc property was added after we had associations setup so some
                // dates come down as DateTime.Min. Replace those with the add date.
                residentArray.forEach(r => {
                    if (r.addedDateUtc && moment(r.addedDateUtc).isBefore(this.siteInfo.privateSiteInfo.creationDate))
                        r.addedDateUtc = this.siteInfo.privateSiteInfo.creationDate;
                });
                this.residentGridOptions.data = residentArray;
                this.residentGridOptions.minRowsToShow = residentArray.length;
                this.residentGridOptions.virtualizationThreshold = residentArray.length;
                this.residentGridOptions.enableFiltering = residentArray.length > 15;
                this.residentsGridApi.core.notifyDataChange(this.uiGridConstants.dataChange.COLUMN);
                this.hasOneAdmin = _.filter(residentArray, r => r.isSiteManager).length === 1 && residentArray.length > 1;
                //this.gridApi.grid.notifyDataChange( uiGridConstants.dataChange.ALL );
                // If we have sort info to use
                if (this.residentSortInfo) {
                    const sortColumn = _.find(this.residentsGridApi.grid.columns, (col) => col.field === this.residentSortInfo.field);
                    if (sortColumn)
                        this.residentsGridApi.grid.sortColumn(sortColumn, this.residentSortInfo.direction, false);
                }
                // Build the full name and convert the last login to local time
                _.forEach(residentArray, (res) => {
                    res.fullName = res.firstName + " " + res.lastName;
                    if (typeof (res.email) === "string" && res.email.indexOf("@condoally.com") !== -1)
                        res.email = "";
                    // Convert the last login timestamps to local time
                    if (res.lastLoginDateUtc)
                        res.lastLoginDateUtc = moment.utc(res.lastLoginDateUtc).toDate();
                });
                this.populateGridUnitLabels();
                if (!this.allUnits && AppConfig.isChtnSite) {
                    this.isLoading = true;
                    this.$http.get("/api/Unit").then((httpResponse) => {
                        this.isLoading = false;
                        this.allUnits = httpResponse.data;
                        this.shouldSortUnitsNumerically = _.every(this.allUnits, u => HtmlUtil.isNumericString(u.name));
                        if (this.shouldSortUnitsNumerically)
                            this.allUnits = _.sortBy(this.allUnits, u => parseFloat(u.name));
                        // If we have a lot of units then allow searching
                        this.multiselectOptions = this.allUnits.length > 20 ? "filter" : "";
                        // Show the note on how to add homes if there's only one home
                        const twoMonthsAfterCreate = moment(this.siteInfo.privateSiteInfo.creationDate).add(2, "months");
                        this.showAddHomeLink = this.allUnits.length < 3 && moment().isBefore(twoMonthsAfterCreate);
                    }, () => {
                        this.isLoading = false;
                        alert("Failed to retrieve your association's home listing, please contact support.");
                    });
                }
            });
        }
        /**
         * Populate the pending members grid
         */
        loadPendingMembers() {
            this.isLoadingPending = true;
            this.$http.get("/api/Member/Pending").then((response) => {
                this.isLoadingPending = false;
                this.pendingMemberGridOptions.data = response.data;
                this.pendingMemberGridOptions.minRowsToShow = response.data.length;
                this.pendingMemberGridOptions.virtualizationThreshold = response.data.length;
            }, (response) => {
                this.isLoadingPending = false;
                console.log("Failed to load pending members: " + response.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user presses the button to allow multiple home selections
         */
        enableMultiHomePicker() {
            if (this.editUser)
                this.editUser.showAdvancedHomePicker = true;
            this.multiselectMulti = 'multiple';
            if (this.allUnits && this.allUnits.length > 0 && this.allUnits[0].unitId === null)
                this.allUnits.shift();
        }
        /**
         * Reject a pending member
         */
        rejectPendingMember() {
            if (!this.editUser.pendingMemberId)
                return;
            if (!confirm("Are you sure you want to remove this pending member? This action cannot be undone."))
                return;
            this.isLoading = false;
            this.$http.put("/api/Member/Pending/Deny/" + this.editUser.pendingMemberId, null).then(() => {
                this.isLoading = false;
                this.editUser = null;
                this.loadPendingMembers();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to reject pending member: " + response.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user presses the button to update a resident's information or create a new
         * resident
         */
        onSaveResident() {
            if (!this.editUser)
                return;
            $("#editUserForm").validate();
            if (!$("#editUserForm").valid())
                return;
            // If the resident's first name or email has changed and the resident has been here
            // more than 2 weeks, warn the editor they should add new residents, not edit existing
            const addedMoment = moment(this.editUser.addedDateUtc);
            const twoWeeksAgoMoment = moment().subtract(2, "weeks");
            if (addedMoment.isBefore(twoWeeksAgoMoment)) {
                const originalUser = this.residentGridOptions.data.find(u => u.userId === this.editUser.userId);
                if (originalUser.firstName !== this.editUser.firstName || originalUser.email !== this.editUser.email) {
                    const confirmMsg = "You're editing a resident's information in a way that looks like you're actually trying to add a new resident to your group. It's VERY IMPORTANT that new residents are added via the 'Add Resident' button rather than edit an existing resident. Hit cancel if you're trying to add a new resident and we'll automatically pop-up a new window to add a resident with this data.";
                    if (!confirm(confirmMsg)) {
                        // Copy the front page data
                        const newUserInfo = new UpdateResident();
                        newUserInfo.shouldSendWelcomeEmail = false;
                        newUserInfo.firstName = this.editUser.firstName;
                        newUserInfo.lastName = this.editUser.lastName;
                        newUserInfo.email = this.editUser.email;
                        newUserInfo.phoneNumber = this.editUser.phoneNumber;
                        newUserInfo.boardPosition = this.editUser.boardPosition;
                        newUserInfo.isRenter = this.editUser.isRenter;
                        newUserInfo.singleUnitId = this.editUser.singleUnitId;
                        newUserInfo.units = _.clone(this.editUser.units);
                        newUserInfo.units.forEach(u => delete u.userId); // Don't use the edit user's user ID
                        newUserInfo.showAdvancedHomePicker = this.editUser.showAdvancedHomePicker;
                        this.setEdit(newUserInfo);
                        return;
                    }
                }
            }
            // If the logged-in user is editing their own user
            if (this.editUser.userId === this.$rootScope.userInfo.userId) {
                // If the user is removing their ability to manage the site
                if (this.siteInfo.userInfo.isSiteManager && !this.editUser.isSiteManager) {
                    if (!confirm("If you remove yourself as a site admin you won't be able to continue making changes. Are you sure you want to remove yourself as a site admin?"))
                        return;
                }
            }
            // Map the UI entry of units to the type expected on the server
            if (!this.editUser.showAdvancedHomePicker) {
                if (!this.editUser.singleUnitId)
                    this.editUser.units = [];
                else
                    this.editUser.units = [{ unitId: this.editUser.singleUnitId, name: null, memberHomeId: null, userId: this.editUser.userId, isRenter: false }];
            }
            this.isSavingUser = true;
            const onSave = (response) => {
                this.isSavingUser = false;
                if (typeof (response.data.errorMessage) === "string") {
                    alert("Failed to add resident: " + response.data.errorMessage);
                    return;
                }
                if (this.editUser.pendingMemberId)
                    this.loadPendingMembers();
                this.editUser = null;
                this.refreshResidents();
            };
            let isAddingNew = false;
            const onError = (response) => {
                this.isSavingUser = false;
                let errorMessage = isAddingNew ? "Failed to add new resident" : "Failed to update resident";
                if (response && response.data && response.data.exceptionMessage)
                    errorMessage += ": " + response.data.exceptionMessage;
                alert(errorMessage);
            };
            // If we don't have a user ID then that means this is a new resident
            if (!this.editUser.userId) {
                isAddingNew = true;
                analytics.track("addNewResident");
                this.$http.post("/api/Residents", this.editUser).then(onSave, onError);
            }
            // Otherwise we're editing an existing resident
            else {
                isAddingNew = false;
                analytics.track("editResident");
                this.$http.put("/api/Residents/UpdateUser", this.editUser).then(onSave, onError);
            }
            // Update the fellow residents page next time we're there
            this.fellowResidents.clearResidentCache();
        }
        /**
         * Occurs when the user presses the button to set a user's password
         */
        OnAdminSetPassword() {
            const setPass = {
                userName: this.adminSetPass_Username,
                password: this.adminSetPass_Password
            };
            this.$http.post("/api/AdminHelper/SetPassword", setPass).then((response) => {
                this.adminSetPass_ResultMessage = response.data;
            }, (response) => {
                alert("Failed to set password: " + response.data.exceptionMessage);
            });
        }
        /**
         * Load the resident settings
         */
        loadSettings() {
            this.isLoadingSettings = true;
            this.$http.get("/api/Settings").then((response) => {
                this.isLoadingSettings = false;
                this.residentSettings = response.data;
                // Update the SiteInfoService so the privateSiteInfo properties reflects changes
                this.siteInfo.privateSiteInfo.rentersCanViewDocs = this.residentSettings.rentersCanViewDocs;
                this.siteInfo.privateSiteInfo.whoCanCreateDiscussionThreads = this.residentSettings.whoCanCreateDiscussionThreads;
            }, (response) => {
                this.isLoadingSettings = false;
                console.log("Failed to retrieve settings: " + response.data.exceptionMessage);
            });
        }
        /**
         * Export the resident list as a CSV
         */
        exportResidentCsv() {
            if (typeof (analytics) !== "undefined")
                analytics.track('exportResidentCsv');
            const csvColumns = [
                {
                    headerText: "First Name",
                    fieldName: "firstName"
                },
                {
                    headerText: "Last Name",
                    fieldName: "lastName"
                },
                {
                    headerText: "CellPhone",
                    fieldName: "phoneNumber"
                },
                {
                    headerText: "Email",
                    fieldName: "email"
                },
                {
                    headerText: "Unit",
                    fieldName: "unitGridLabel"
                },
                {
                    headerText: "Is Renter",
                    fieldName: "isRenter"
                },
                {
                    headerText: "Is Admin",
                    fieldName: "isSiteManager"
                },
                {
                    headerText: "Board Position",
                    fieldName: "boardPosition",
                    dataMapper: (value) => this.getBoardPositionName(value)
                },
                {
                    headerText: "Alternate Mailing",
                    fieldName: "mailingAddressObject",
                    dataMapper: (value) => {
                        if (!value)
                            return "";
                        if (value.recipientName)
                            return value.recipientName + " " + value.oneLiner;
                        return value.oneLiner;
                    }
                },
                {
                    headerText: "Alternate Phone",
                    fieldName: "alternatePhoneNumber"
                },
                {
                    headerText: "Manager Notes",
                    fieldName: "managerNotes"
                },
                {
                    headerText: "Last Login Date",
                    fieldName: "lastLoginDateUtc",
                    dataMapper: (value) => {
                        if (!value)
                            return "Has not logged-in";
                        return moment(value).format("YYYY-MM-DD HH:mm:00");
                    }
                }
            ];
            const csvDataString = Ally.createCsvString(this.residentGridOptions.data, csvColumns);
            Ally.HtmlUtil2.downloadCsv(csvDataString, "Residents.csv");
        }
        /**
         * Export the member list for a PTA in Kansas as a CSV ready to be uploaded to the state
         */
        exportKansasPtaCsv() {
            if (!this.siteInfo.privateSiteInfo.ptaUnitId) {
                alert("You must first set your PTA unit ID in Manage -> Settings before you can export in this format.");
                return;
            }
            if (typeof (analytics) !== "undefined")
                analytics.track('exportKansasPtaCsv');
            const csvColumns = [
                {
                    headerText: "Local_Unit",
                    fieldName: "Local_Unit"
                },
                {
                    headerText: "First_Name",
                    fieldName: "firstName"
                },
                {
                    headerText: "Last_Name",
                    fieldName: "lastName"
                },
                {
                    headerText: "Number_of_Members",
                    fieldName: "Number_of_Members"
                },
                {
                    headerText: "Membership_Name",
                    fieldName: "Membership_Name"
                },
                {
                    headerText: "Name_Prefix",
                    fieldName: "Name_Prefix"
                },
                {
                    headerText: "Middle_Name",
                    fieldName: "Middle_Name"
                },
                {
                    headerText: "Name_Suffix",
                    fieldName: "Name_Suffix"
                },
                {
                    headerText: "Email",
                    fieldName: "email"
                },
                {
                    headerText: "Address_1",
                    fieldName: "Address_1"
                },
                {
                    headerText: "Address_2",
                    fieldName: "Address_2"
                },
                {
                    headerText: "Address_3",
                    fieldName: "Address_3"
                },
                {
                    headerText: "City",
                    fieldName: "City"
                },
                {
                    headerText: "State",
                    fieldName: "State"
                },
                {
                    headerText: "Zip",
                    fieldName: "Zip"
                },
                {
                    headerText: "Home_Telephone",
                    fieldName: "phoneNumber"
                },
                {
                    headerText: "Work_Telephone",
                    fieldName: "Work_Telephone"
                },
                {
                    headerText: "Mobile_Number",
                    fieldName: "Mobile_Number"
                },
                {
                    headerText: "Position",
                    fieldName: "Position"
                },
                {
                    headerText: "Begin_Date",
                    fieldName: "Begin_Date"
                },
                {
                    headerText: "End_Date",
                    fieldName: "End_Date"
                },
                {
                    headerText: "Second_Name",
                    fieldName: "Second_Name"
                },
                {
                    headerText: "Second_Email",
                    fieldName: "Second_Email"
                },
                {
                    headerText: "Teacher1",
                    fieldName: "Teacher1"
                },
                {
                    headerText: "Teacher2",
                    fieldName: "Teacher2"
                },
                {
                    headerText: "Teacher3",
                    fieldName: "Teacher3"
                },
                {
                    headerText: "Children_Names",
                    fieldName: "Children_Names"
                }
            ];
            const copiedMembers = _.clone(this.residentGridOptions.data);
            for (const member of copiedMembers) {
                member.Local_Unit = this.siteInfo.privateSiteInfo.ptaUnitId.toString();
                member.Membership_Name = (!member.firstName || member.firstName === "N/A") ? member.lastName : member.firstName;
                if (member.boardPosition !== 0)
                    member.Position = this.getBoardPositionName(member.boardPosition);
            }
            let csvDataString = Ally.createCsvString(this.residentGridOptions.data, csvColumns);
            csvDataString = "data:text/csv;charset=utf-8," + csvDataString;
            const encodedUri = encodeURI(csvDataString);
            // Works, but can't set the file name
            //window.open( encodedUri );
            const csvLink = document.createElement("a");
            csvLink.setAttribute("href", encodedUri);
            csvLink.setAttribute("download", "pta-members.csv");
            document.body.appendChild(csvLink); // Required for FF
            csvLink.click(); // This will download the file
            setTimeout(() => document.body.removeChild(csvLink), 500);
        }
        /**
         * Save the resident settings to the server
         */
        saveResidentSettings() {
            analytics.track("editResidentSettings");
            this.isLoadingSettings = true;
            this.$http.put("/api/Settings", this.residentSettings).then(() => {
                this.isLoadingSettings = false;
                // Update the fellow residents page next time we're there
                this.fellowResidents.clearResidentCache();
                // Update the locally cached settings to match the saved values
                this.siteInfo.privateSiteInfo.canHideContactInfo = this.residentSettings.canHideContactInfo;
                this.siteInfo.privateSiteInfo.isDiscussionEmailGroupEnabled = this.residentSettings.isDiscussionEmailGroupEnabled;
            }, () => {
                this.isLoadingSettings = false;
                alert("Failed to update settings, please try again or contact support.");
            });
        }
        /**
         * Occurs when the user presses the button to delete a resident
         */
        onDeleteResident() {
            if (!confirm("Are you sure you want to remove this person from your building?"))
                return;
            if (this.siteInfo.userInfo.userId === this.editUser.userId) {
                if (!confirm("If you remove your own account you won't be able to login anymore. Are you still sure?"))
                    return;
            }
            this.isSavingUser = true;
            this.$http.delete("/api/Residents?userId=" + this.editUser.userId).then(() => {
                this.isSavingUser = false;
                this.editUser = null;
                // Update the fellow residents page next time we're there
                this.fellowResidents.clearResidentCache();
                this.refreshResidents();
            }, () => {
                alert("Failed to remove the resident. Please let support know if this continues to happen.");
                this.isSavingUser = false;
                this.editUser = null;
            });
        }
        /**
         * Occurs when the user presses the button to reset everyone's password
         */
        onSendAllWelcome() {
            if (!confirm("This will email all of the residents in your association. Do you want to proceed?"))
                return;
            this.isLoading = true;
            this.$http.put("/api/Residents/UserAction?userId&action=launchsite", null).then(() => {
                this.isLoading = false;
                this.sentWelcomeEmail = true;
                this.allEmailsSent = true;
            }, () => {
                this.isLoading = false;
                alert("Failed to send welcome email, please contact support if this problem persists.");
            });
        }
        /**
         * Parse the bulk resident CSV text
         */
        parseBulkCsv() {
            const csvParser = $.csv;
            const bulkRows = csvParser.toArrays(this.bulkImportCsv);
            this.bulkImportRows = [];
            const simplifyStreetName = (streetAddress) => {
                if (!streetAddress)
                    streetAddress = "";
                let simplifiedName = streetAddress.toLowerCase();
                simplifiedName = simplifiedName.replace(/0th /g, "0 ").replace(/1st /g, "1 ");
                simplifiedName = simplifiedName.replace(/2nd /g, "2 ").replace(/3rd /g, "3 ");
                simplifiedName = simplifiedName.replace(/4th /g, "4 ").replace(/5th /g, "5 ");
                simplifiedName = simplifiedName.replace(/6th /g, "6 ").replace(/7th /g, "7 ");
                simplifiedName = simplifiedName.replace(/8th /g, "8 ").replace(/9th /g, "9 ");
                simplifiedName = simplifiedName.replace(/\./g, "").replace(/ /g, "");
                simplifiedName = simplifiedName.replace(/street/g, "st").replace(/road/g, "rd").replace(/drive/g, "dr");
                simplifiedName = simplifiedName.replace(/place/g, "pl").replace(/avenue/g, "ave");
                return simplifiedName;
            };
            if (this.allUnits) {
                for (let i = 0; i < this.allUnits.length; ++i)
                    this.allUnits[i].csvTestName = simplifyStreetName(this.allUnits[i].name);
            }
            for (let i = 0; i < bulkRows.length; ++i) {
                const curRow = bulkRows[i];
                while (curRow.length < 10)
                    curRow.push("");
                // Skip the header row, if there is one
                if (curRow[0] === "Address/Unit" && curRow[1] === "Email" && curRow[2] === "First Name")
                    continue;
                // Clean up the data
                for (let j = 0; j < curRow.length; ++j) {
                    if (HtmlUtil.isNullOrWhitespace(curRow[j]))
                        curRow[j] = null;
                    else
                        curRow[j] = curRow[j].trim();
                }
                const newRow = {
                    unitName: curRow[0] || null,
                    unitId: undefined,
                    email: curRow[1],
                    firstName: curRow[2],
                    lastName: curRow[3],
                    phoneNumber: curRow[4],
                    isRenter: !HtmlUtil.isNullOrWhitespace(curRow[5]),
                    isAdmin: !HtmlUtil.isNullOrWhitespace(curRow[6]),
                    csvTestName: "",
                    mailingAddress: curRow[7],
                    alternatePhone: curRow[8],
                    managerNotes: curRow[9],
                    emailHasDupe: false
                };
                if (HtmlUtil.isNullOrWhitespace(newRow.unitName))
                    newRow.unitId = null;
                else {
                    newRow.csvTestName = simplifyStreetName(newRow.unitName);
                    const unit = _.find(this.allUnits, (u) => u.csvTestName === newRow.csvTestName);
                    if (unit)
                        newRow.unitId = unit.unitId;
                    else
                        newRow.unitId = undefined;
                }
                // If this row contains two people
                let spouseRow = null;
                if (newRow.firstName && newRow.firstName.toLowerCase().indexOf(" & ") !== -1)
                    newRow.firstName = newRow.firstName.replace(" & ", " and  ");
                if (newRow.firstName && newRow.firstName.toLowerCase().indexOf(" and ") !== -1) {
                    spouseRow = _.clone(newRow);
                    const splitFirst = newRow.firstName.split(" and ");
                    newRow.firstName = splitFirst[0];
                    spouseRow.firstName = splitFirst[1];
                    if (newRow.email && newRow.email.indexOf(" / ") !== -1) {
                        const splitEmail = newRow.email.split(" / ");
                        newRow.email = splitEmail[0];
                        spouseRow.email = splitEmail[1];
                    }
                    else
                        spouseRow.email = "";
                    spouseRow.phoneNumber = "";
                }
                if (this.bulkParseNormalizeNameCase) {
                    const capitalizeFirst = (str) => {
                        if (!str)
                            return str;
                        if (str.length === 1)
                            return str.toUpperCase();
                        return str.charAt(0).toUpperCase() + str.substring(1).toLowerCase();
                    };
                    newRow.firstName = capitalizeFirst(newRow.firstName);
                    newRow.lastName = capitalizeFirst(newRow.lastName);
                    if (spouseRow) {
                        spouseRow.firstName = capitalizeFirst(spouseRow.firstName);
                        spouseRow.lastName = capitalizeFirst(spouseRow.lastName);
                    }
                }
                this.bulkImportRows.push(newRow);
                if (spouseRow)
                    this.bulkImportRows.push(spouseRow);
            }
            // Find any duplicate email addresses
            for (const curRow of this.bulkImportRows)
                curRow.emailHasDupe = curRow.email && this.bulkImportRows.filter(r => r.email === curRow.email).length > 1;
        }
        /**
         * Submit the bulk creation rows to the server
         */
        submitBulkRows() {
            this.isLoading = true;
            this.$http.post("/api/Residents/BulkLoad", this.bulkImportRows, { timeout: 10 * 60 * 1000 }).then(() => {
                this.isLoading = false;
                this.bulkImportRows = [new ResidentCsvRow()];
                this.bulkImportCsv = "";
                alert("Success");
                this.refreshResidents();
            }, () => {
                this.isLoading = false;
                alert("Bulk upload failed");
            });
        }
        /**
         * Add a row to the bulk table
         */
        addBulkRow() {
            const newRow = {
                unitName: "",
                unitId: null,
                email: "",
                firstName: "",
                lastName: "",
                phoneNumber: "",
                isRenter: false,
                isAdmin: false,
                csvTestName: undefined,
                mailingAddress: "",
                alternatePhone: "",
                managerNotes: "",
                emailHasDupe: false
            };
            // Try to step to the next unit
            if (this.allUnits) {
                if (this.bulkImportRows.length > 0) {
                    const lastUnitId = this.bulkImportRows[this.bulkImportRows.length - 1].unitId;
                    let lastUnitIndex = _.findIndex(this.allUnits, (u) => u.unitId === lastUnitId);
                    ++lastUnitIndex;
                    if (lastUnitIndex < this.allUnits.length) {
                        newRow.unitName = this.allUnits[lastUnitIndex].name;
                        newRow.unitId = this.allUnits[lastUnitIndex].unitId;
                    }
                }
            }
            this.bulkImportRows.push(newRow);
        }
        /**
         * Display the list of recent emails
         */
        toggleEmailHistoryVisible() {
            this.showEmailHistory = !this.showEmailHistory;
            this.viewingRecentEmailBody = null;
            if (this.showEmailHistory && !this.emailHistoryGridOptions.data) {
                this.isLoadingSettings = true;
                this.$http.get("/api/Email/RecentGroupEmails").then((response) => {
                    this.isLoadingSettings = false;
                    this.emailHistoryGridOptions.data = response.data;
                }, (response) => {
                    this.isLoadingSettings = false;
                    alert("Failed to load emails: " + response.data.exceptionMessage);
                });
            }
        }
        /**
         * Load 6 more months of email history
         */
        loadMoreRecentEmails() {
            this.isLoadingSettings = true;
            const NumMonthsStep = 6;
            this.emailHistoryNumMonths += NumMonthsStep;
            this.emailHistorySinceDate = moment(this.emailHistorySinceDate).subtract(NumMonthsStep, "months").toDate();
            this.$http.get("/api/Email/RecentGroupEmails?sinceDateUtc=" + this.emailHistorySinceDate.toISOString()).then((response) => {
                this.isLoadingSettings = false;
                this.emailHistoryGridOptions.data = this.emailHistoryGridOptions.data.concat(response.data);
            }, (response) => {
                this.isLoadingSettings = false;
                alert("Failed to load emails: " + response.data.exceptionMessage);
            });
        }
        resetResidentGridState() {
            // Remove the saved grid state
            window.localStorage.removeItem(ManageResidentsController.StoreKeyResidentGridState);
            // Refresh the page, but don't save the grid state on exit
            this.shouldSaveResidentGridState = false;
            window.location.reload();
        }
        onAddNewMember() {
            const newUserInfo = new UpdateResident();
            newUserInfo.boardPosition = 0;
            newUserInfo.shouldSendWelcomeEmail = false;
            this.setEdit(newUserInfo);
        }
    }
    ManageResidentsController.$inject = ["$http", "$rootScope", "fellowResidents", "uiGridConstants", "SiteInfo", "appCacheService"];
    ManageResidentsController.StoreKeyResidentGridState = "AllyResGridState";
    Ally.ManageResidentsController = ManageResidentsController;
})(Ally || (Ally = {}));
CA.angularApp.component("manageResidents", {
    templateUrl: "/ngApp/chtn/manager/manage-residents.html",
    controller: Ally.ManageResidentsController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the manage polls page
     */
    class GroupAmenitiesController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, $location) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$location = $location;
            this.isLoading = false;
            this.appShortName = AppConfig.appShortName;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isLoading = true;
            this.$http.get("/api/Association/GroupAmenities").then((httpResponse) => {
                this.isLoading = false;
                this.groupAmenities = httpResponse.data;
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to retrieve amenity data: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
        * Called when the user clicks the save button
        */
        saveForm() {
            this.isLoading = true;
            this.$http.put("/api/Association/GroupAmenities", this.groupAmenities).then((httpResponse) => {
                this.$location.path("/Home");
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            });
        }
    }
    GroupAmenitiesController.$inject = ["$http", "SiteInfo", "$location"];
    Ally.GroupAmenitiesController = GroupAmenitiesController;
    class GroupAmenities {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("groupAmenities", {
    templateUrl: "/ngApp/chtn/manager/settings/group-amenities.html",
    controller: Ally.GroupAmenitiesController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the page to view group premium plan settings
     */
    class PremiumPlanSettingsController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, appCacheService, $timeout, $scope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.$timeout = $timeout;
            this.$scope = $scope;
            this.settings = new Ally.ChtnSiteSettings();
            this.isLoading = false;
            this.isLoadingUsage = false;
            this.shouldShowPremiumPlanSection = true;
            this.shouldShowPaymentForm = false;
            this.stripeApi = null;
            this.stripeCardElement = null;
            this.isActivatingAnnual = true;
            this.monthlyDisabled = false;
            this.planExpirationColor = "red";
            this.groupEmailChartData = [];
            this.groupEmailAverage = 0;
            this.genInvoiceNumMonths = 1;
            this.genInvoiceShouldIncludeWireInfo = false;
            this.emailUsageChartData = [];
            this.emailUsageChartLabels = [];
            this.emailUsageChartOptions = {};
            this.emailUsageAverageNumMonths = 0;
            this.emailUsageAverageSent = 0;
            this.showInvoiceSection = false;
            this.paymentType = "ach";
            this.shouldShowTrialNote = false;
            this.shouldShowPremiumPlanSection = AppConfig.appShortName === "condo" || AppConfig.appShortName === "hoa";
            this.homeNamePlural = AppConfig.homeName.toLowerCase() + "s";
            this.showInvoiceSection = siteInfo.userInfo.isAdmin;
            try {
                this.stripeApi = Stripe(StripeApiKey);
            }
            catch (err) {
                console.log(err);
            }
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            this.monthlyDisabled = this.siteInfo.privateSiteInfo.numUnits <= 10;
            this.refreshData();
            // Get a view token to view the premium plan invoice should one be generated
            if (this.showInvoiceSection) // Add a slight delay to let the rest of the page load
                this.$timeout(() => this.$http.get("/api/DocumentLink/0").then((response) => this.viewPremiumInvoiceViewId = response.data.vid), 250);
            this.shouldShowTrialNote = this.siteInfo.privateSiteInfo.isPremiumPlanActive && moment().isBefore(moment(this.siteInfo.privateSiteInfo.creationDate).add(3, "months"));
        }
        /**
         * Occurs when the user clicks the button to cancel the premium plan auto-renewal
         */
        cancelPremiumAutoRenew() {
            if (!confirm("Are you sure?"))
                return;
            this.isLoading = true;
            this.$http.put("/api/Settings/CancelPremium", null).then(() => {
                this.isLoading = false;
                this.settings.premiumPlanIsAutoRenewed = false;
                this.shouldShowPaymentForm = false;
                this.refreshData();
            }, () => {
                this.isLoading = false;
                alert("Failed to cancel the premium plan. Refresh the page and try again or contact support if the problem persists.");
            });
        }
        showStripeError(errorMessage) {
            const displayError = document.getElementById('card-errors');
            if (HtmlUtil.isNullOrWhitespace(errorMessage))
                displayError.textContent = null; //'Unknown Error';
            else
                displayError.textContent = errorMessage;
        }
        initStripePayment() {
            const style = {
                base: {
                    color: "#32325d",
                    fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                    fontSmoothing: "antialiased",
                    fontSize: "16px",
                    "::placeholder": {
                        color: "#aab7c4"
                    }
                },
                invalid: {
                    color: "#fa755a",
                    iconColor: "#fa755a"
                }
            };
            const elements = this.stripeApi.elements();
            this.stripeCardElement = elements.create("card", { style: style });
            this.stripeCardElement.mount("#stripe-card-element");
            const onCardChange = (event) => {
                if (event.error)
                    this.showStripeError(event.error.message);
                else
                    this.showStripeError(null);
            };
            this.stripeCardElement.on('change', onCardChange);
        }
        submitCardToStripe() {
            this.isLoading = true;
            return this.stripeApi.createPaymentMethod({
                type: 'card',
                card: this.stripeCardElement,
            })
                .then((result) => {
                if (result.error) {
                    this.isLoading = false;
                    this.showStripeError(result.error.message);
                }
                else {
                    const activateInfo = {
                        stripePaymentMethodId: result.paymentMethod.id,
                        shouldPayAnnually: this.isActivatingAnnual
                    };
                    this.$http.put("/api/Settings/ActivatePremium", activateInfo).then(() => {
                        this.isLoading = false;
                        this.settings.premiumPlanIsAutoRenewed = true;
                        this.shouldShowPaymentForm = false;
                        this.refreshData();
                    }, (errorResponse) => {
                        this.isLoading = false;
                        alert("Failed to activate the premium plan. Refresh the page and try again or contact support if the problem persists: " + errorResponse.data.exceptionMessage);
                    });
                    //this.createSubscription( result.paymentMethod.id );
                }
                this.$scope.$apply();
            });
        }
        /**
         * Occurs when the user clicks the button to generate an annual invoice PDF
         */
        //viewPremiumInvoice()
        //{
        //    this.isLoading = true;
        //    this.$http.get( "/api/Settings/ViewPremiumInvoice" ).then(
        //        ( response: ng.IHttpPromiseCallbackArg<MeteredFeaturesUsage> ) =>
        //        {
        //            this.isLoading = false;
        //            this.settings.premiumPlanIsAutoRenewed = false;
        //            this.shouldShowPaymentForm = false;
        //            this.refreshData();
        //        },
        //        ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
        //        {
        //            this.isLoading = false;
        //            alert( "Failed to create invoice. Refresh the page and try again or contact support if the problem persists: " + errorResponse.data.exceptionMessage );
        //        }
        //    );
        //}
        /**
         * Occurs when the user clicks the button to generate a Stripe invoice
         */
        generateStripeInvoice(numMonths, shouldIncludeWireInfo) {
            const getUri = `PublicSettings/ViewPremiumInvoice?vid=${this.viewPremiumInvoiceViewId}&numMonths=${numMonths}&shouldIncludeWireInfo=${shouldIncludeWireInfo}`;
            window.open(this.siteInfo.publicSiteInfo.baseApiUrl + getUri, "_blank");
            this.$timeout(() => {
                // Refresh the view token in case the user clicks again
                this.$http.get("/api/DocumentLink/0").then((response) => this.viewPremiumInvoiceViewId = response.data.vid);
            }, 1250);
        }
        /**
         * Occurs when the user clicks the button to enable premium plan auto-renewal
         */
        activatePremiumRenewal() {
            this.shouldShowPaymentForm = true;
            this.updateCheckoutDescription();
            this.onPaymentTypeChange();
        }
        updateCheckoutDescription() {
            const renewedInPast = moment(this.premiumPlanRenewDate).isBefore();
            let payAmount;
            if (this.isActivatingAnnual) {
                payAmount = this.settings.premiumPlanCostDollars * 11;
                this.checkoutDescription = "You will be charged $" + payAmount + " ";
                if (renewedInPast)
                    this.checkoutDescription += " today and you will be charged annually on this date thereafter.";
                else
                    this.checkoutDescription += " on " + moment(this.premiumPlanRenewDate).format("dddd, MMMM Do YYYY") + " and you will be charged annually on that date thereafter.";
            }
            // Otherwise they'll be paying monthly
            else {
                payAmount = this.settings.premiumPlanCostDollars;
                this.checkoutDescription = "You will be charged $" + this.settings.premiumPlanCostDollars + " ";
                if (renewedInPast)
                    this.checkoutDescription += " today and you will be charged monthly on this date thereafter.";
                else
                    this.checkoutDescription += " on " + moment(this.premiumPlanRenewDate).format("dddd, MMMM Do YYYY") + " and you will be charged monthly on that date thereafter.";
            }
            if (renewedInPast)
                this.payButtonText = "Pay $" + payAmount;
            else
                this.payButtonText = "Schedule Payment";
        }
        createSubscription(paymentMethodId) {
            return (fetch('/create-subscription', {
                method: 'post',
                headers: {
                    'Content-type': 'application/json',
                },
                body: JSON.stringify({
                    paymentMethodId: paymentMethodId
                }),
            })
                .then((response) => {
                return response.json();
            })
                // If the card is declined, display an error to the user.
                .then((result) => {
                if (result.error) {
                    // The card had an error when trying to attach it to a customer.
                    throw result;
                }
                return result;
            })
                // Normalize the result to contain the object returned by Stripe.
                // Add the addional details we need.
                .then((result) => {
                return {
                    paymentMethodId: result.paymentMethodId,
                    priceId: result.priceId,
                    subscription: result.subscription,
                };
            })
                // Some payment methods require a customer to be on session
                // to complete the payment process. Check the status of the
                // payment intent to handle these actions.
                //.then( ( result: any ) => this.handlePaymentThatRequiresCustomerAction( result ) )
                // If attaching this card to a Customer object succeeds,
                // but attempts to charge the customer fail, you
                // get a requires_payment_method error.
                //.then( ( result: any ) => this.handleRequiresPaymentMethod( result ) )
                // No more actions required. Provision your service for the user.
                //.then( () =>
                //{
                //    //onSubscriptionComplete
                //    this.isLoading = true;
                //    const paymentInfo = {
                //        paymentId: 1
                //    };
                //} )
                .catch((error) => {
                // An error has happened. Display the failure to the user here.
                // We utilize the HTML element we created.
                this.showStripeError(error);
            }));
        }
        handlePaymentThatRequiresCustomerAction({ subscription, invoice, priceId, paymentMethodId, isRetry }) {
            if (subscription && subscription.status === 'active') {
                // Subscription is active, no customer actions required.
                return { subscription, priceId, paymentMethodId };
            }
            // If it's a first payment attempt, the payment intent is on the subscription latest invoice.
            // If it's a retry, the payment intent will be on the invoice itself.
            const paymentIntent = invoice ? invoice.payment_intent : subscription.latest_invoice.payment_intent;
            if (paymentIntent.status === 'requires_action' ||
                (isRetry === true && paymentIntent.status === 'requires_payment_method')) {
                return this.stripeApi
                    .confirmCardPayment(paymentIntent.client_secret, {
                    payment_method: paymentMethodId,
                })
                    .then((result) => {
                    if (result.error) {
                        // Start code flow to handle updating the payment details.
                        // Display error message in your UI.
                        // The card was declined (i.e. insufficient funds, card has expired, etc).
                        throw result;
                    }
                    else {
                        if (result.paymentIntent.status === 'succeeded') {
                            // Show a success message to your customer.
                            // There's a risk of the customer closing the window before the callback.
                            // We recommend setting up webhook endpoints later in this guide.
                            return {
                                priceId: priceId,
                                subscription: subscription,
                                invoice: invoice,
                                paymentMethodId: paymentMethodId,
                            };
                        }
                    }
                })
                    .catch((error) => {
                    this.showStripeError(error);
                });
            }
            else {
                // No customer action needed.
                return { subscription, priceId, paymentMethodId };
            }
        }
        handleRequiresPaymentMethod({ subscription, paymentMethodId, priceId, }) {
            if (subscription.status === 'active') {
                // subscription is active, no customer actions required.
                return { subscription, priceId, paymentMethodId };
            }
            else if (subscription.latest_invoice.payment_intent.status === 'requires_payment_method') {
                // Using localStorage to manage the state of the retry here,
                // feel free to replace with what you prefer.
                // Store the latest invoice ID and status.
                localStorage.setItem('latestInvoiceId', subscription.latest_invoice.id);
                localStorage.setItem('latestInvoicePaymentIntentStatus', subscription.latest_invoice.payment_intent.status);
                throw { error: { message: 'Your card was declined.' } };
            }
            else {
                return { subscription, priceId, paymentMethodId };
            }
        }
        /**
         * Retrieve the email usage from the server
         */
        refreshMeteredUsage() {
            this.isLoadingUsage = true;
            this.$http.get("/api/Settings/MeteredFeaturesUsage").then((response) => {
                this.isLoadingUsage = false;
                this.meteredUsage = response.data;
                this.meteredUsage.months = _.sortBy(this.meteredUsage.months, m => m.year.toString() + "_" + (m.month > 9 ? "" : "0") + m.month);
                this.emailUsageChartLabels = [];
                const emailsSentChartData = [];
                const groupEmailChartData = [];
                let totalEmailsSent = 0;
                let totalGroupEmailProcessed = 0;
                for (let i = 0; i < response.data.months.length; ++i) {
                    const curMonth = response.data.months[i];
                    const monthName = moment([curMonth.year, curMonth.month - 1, 1]).format("MMMM");
                    // Add the year to the first and last entries
                    if (i === 0 || i === this.meteredUsage.months.length - 1)
                        this.emailUsageChartLabels.push(monthName + " " + curMonth.year);
                    else
                        this.emailUsageChartLabels.push(monthName);
                    emailsSentChartData.push(curMonth.numEmailsSent);
                    groupEmailChartData.push(curMonth.numGroupEmailsProcessed);
                    totalEmailsSent += curMonth.numEmailsSent;
                    totalGroupEmailProcessed += curMonth.numGroupEmailsProcessed;
                }
                this.emailUsageChartData = [emailsSentChartData];
                this.groupEmailChartData = [groupEmailChartData];
                this.emailUsageAverageNumMonths = response.data.months.length;
                if (this.emailUsageAverageNumMonths > 1) {
                    this.emailUsageAverageSent = Math.round(totalEmailsSent / this.emailUsageAverageNumMonths);
                    this.groupEmailAverage = Math.round(totalGroupEmailProcessed / this.emailUsageAverageNumMonths);
                }
            });
            this.emailUsageChartOptions = {
                scales: {
                    yAxes: [
                        {
                            id: 'y-axis-1',
                            type: 'linear',
                            display: true,
                            position: 'left',
                            ticks: {
                                suggestedMin: 0,
                                // OR //
                                beginAtZero: true // minimum value will be 0.
                            }
                        }
                    ]
                }
            };
        }
        /**
         * Populate the page from the server
         */
        refreshData() {
            this.isLoading = true;
            this.$http.get("/api/Settings").then((response) => {
                this.isLoading = false;
                this.settings = response.data;
                this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
                this.premiumPlanRenewDate = new Date();
                this.premiumPlanRenewDate = moment(this.settings.premiumPlanExpirationDate).add(1, "days").toDate();
                if (this.settings.premiumPlanIsAutoRenewed) {
                    this.planExpirationColor = "green";
                    this.$http.get("/api/Settings/StripeBillingPortal").then((response) => this.stripePortalUrl = response.data.portalUrl);
                }
                else {
                    const twoMonthsBefore = moment(this.settings.premiumPlanExpirationDate).add(-2, "months");
                    if (moment().isBefore(twoMonthsBefore))
                        this.planExpirationColor = "green";
                    else
                        this.planExpirationColor = "red";
                }
                this.refreshMeteredUsage();
            });
        }
        /**
         * Bring the user to view their email history
         */
        goToEmailHistory() {
            this.appCacheService.set("goToEmailHistory", "true");
            window.location.hash = "#!/ManageResidents";
            return true;
        }
        /**
         * Start the Stripe-Plaid ACH-linking flow
         */
        startPlaidAchConnection() {
            this.isLoading = true;
            this.$http.get("/api/Plaid/StripeLinkToken").then((httpResponse) => {
                this.isLoading = false;
                if (!httpResponse.data) {
                    alert("Failed to start Plaid connection. Please contact support.");
                    return;
                }
                const plaidConfig = {
                    token: httpResponse.data,
                    onSuccess: (public_token, metadata) => {
                        console.log("Plaid StripeLinkToken onSuccess", metadata);
                        this.completePlaidAchConnection(public_token, metadata.account_id);
                    },
                    onLoad: () => { },
                    onExit: (err, metadata) => { console.log("update onExit.err", err, metadata); },
                    onEvent: (eventName, metadata) => { console.log("update onEvent.eventName", eventName, metadata); },
                    receivedRedirectUri: null,
                };
                const plaidHandler = Plaid.create(plaidConfig);
                plaidHandler.open();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to start Plaid connection: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Complete the Stripe-Plaid ACH-linking flow
         */
        completePlaidAchConnection(accessToken, accountId) {
            this.isLoading = true;
            const postData = {
                accessToken,
                selectedAccountIds: [accountId]
            };
            this.$http.post("/api/Plaid/ProcessStripeAccessToken", postData).then(() => {
                this.isLoading = false;
                this.checkoutDescription = "Account successfully linked, reloading...";
                window.location.reload();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to link account: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Complete the Stripe-Plaid ACH-linking flow
         */
        makeAchStripePayment() {
            this.isLoading = true;
            const activateInfo = {
                shouldPayAnnually: this.isActivatingAnnual,
                payViaAch: true
            };
            this.$http.put("/api/Settings/ActivatePremium", activateInfo).then(() => {
                this.isLoading = false;
                this.settings.premiumPlanIsAutoRenewed = true;
                this.shouldShowPaymentForm = false;
                this.refreshData();
            }, (errorResponse) => {
                this.isLoading = false;
                alert("Failed to activate the premium plan. Refresh the page and try again or contact support if the problem persists: " + errorResponse.data.exceptionMessage);
            });
        }
        onPaymentTypeChange() {
            // Tell Stripe to populate the card info area
            if (this.paymentType === "creditCard")
                this.$timeout(() => this.initStripePayment(), 250);
        }
    }
    PremiumPlanSettingsController.$inject = ["$http", "SiteInfo", "appCacheService", "$timeout", "$scope"];
    Ally.PremiumPlanSettingsController = PremiumPlanSettingsController;
    class GroupMonthEmails {
    }
    Ally.GroupMonthEmails = GroupMonthEmails;
})(Ally || (Ally = {}));
CA.angularApp.component("premiumPlanSettings", {
    templateUrl: "/ngApp/chtn/manager/settings/premium-plan-settings.html",
    controller: Ally.PremiumPlanSettingsController
});
class MeteredFeaturesUsage {
}

var Ally;
(function (Ally) {
    /**
     * The controller for the settings parent view
     */
    class SettingsParentController {
        /**
        * The constructor for the class
        */
        constructor($http, siteInfo, $routeParams) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$routeParams = $routeParams;
            this.shouldShowPremiumPlanSection = true;
            this.selectedView = this.$routeParams.viewName || "SiteSettings";
            this.shouldShowPremiumPlanSection = AppConfig.appShortName === "condo" || AppConfig.appShortName === "hoa";
            if (!this.shouldShowPremiumPlanSection)
                this.selectedView = "SiteSettings";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
        }
    }
    SettingsParentController.$inject = ["$http", "SiteInfo", "$routeParams"];
    Ally.SettingsParentController = SettingsParentController;
})(Ally || (Ally = {}));
CA.angularApp.component("settingsParent", {
    templateUrl: "/ngApp/chtn/manager/settings/settings-parent.html",
    controller: Ally.SettingsParentController
});

var Ally;
(function (Ally) {
    class BaseSiteSettings {
    }
    Ally.BaseSiteSettings = BaseSiteSettings;
    /**
     * Represents settings for a Condo, HOA, or Neighborhood Ally site
     */
    class ChtnSiteSettings extends BaseSiteSettings {
    }
    Ally.ChtnSiteSettings = ChtnSiteSettings;
    /**
     * The controller for the page to view group site settings
     */
    class ChtnSettingsController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, $timeout, $scope, $rootScope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.$scope = $scope;
            this.$rootScope = $rootScope;
            this.settings = new ChtnSiteSettings();
            this.originalSettings = new ChtnSiteSettings();
            this.isLoading = false;
            this.showRightColumnSetting = true;
            this.showLocalNewsSetting = false;
            this.isPta = false;
            this.shouldShowWelcomeTooLongError = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            this.frontEndVersion = appVer.toString();
            this.defaultBGImage = $(document.documentElement).css("background-image");
            this.shouldShowQaButton = this.siteInfo.userInfo.emailAddress === "president@mycondoally.com" || this.siteInfo.userInfo.userId === "219eb985-613b-4fc0-a523-7474adb706bd";
            this.loginImageUrl = this.siteInfo.publicSiteInfo.loginImageUrl;
            this.showRightColumnSetting = this.siteInfo.privateSiteInfo.creationDate < Ally.SiteInfoService.AlwaysDiscussDate;
            this.showLocalNewsSetting = !this.showRightColumnSetting;
            this.isPta = AppConfig.appShortName === "pta";
            // Hook up the file upload control after everything is loaded and setup
            this.$timeout(() => this.hookUpLoginImageUpload(), 200);
            this.refreshData();
        }
        /**
         * Populate the page from the server
         */
        refreshData() {
            this.isLoading = true;
            this.$http.get("/api/Settings").then((response) => {
                this.isLoading = false;
                this.settings = response.data;
                this.originalSettings = _.clone(response.data);
                if (!this.tinyMceEditor) {
                    const tinyMceOpts = {
                        menubar: "edit format table",
                        toolbar: "styleselect | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link | checklist code formatpainter table"
                    };
                    Ally.HtmlUtil2.initTinyMce("tiny-mce-editor", 400, tinyMceOpts).then(e => {
                        this.tinyMceEditor = e;
                        if (this.settings.welcomeMessage)
                            this.tinyMceEditor.setContent(this.settings.welcomeMessage);
                        this.tinyMceEditor.on("keyup", () => {
                            // Need to wrap this in a $scope.using because this event is invoked by vanilla JS, not Angular
                            this.$scope.$apply(() => {
                                this.onWelcomeMessageEdit();
                            });
                        });
                    });
                }
            });
        }
        /**
         * Clear the login image
         */
        removeLoginImage() {
            analytics.track("clearLoginImage");
            this.isLoading = true;
            this.$http.get("/api/Settings/ClearLoginImage").then(() => {
                this.isLoading = false;
                this.siteInfo.publicSiteInfo.loginImageUrl = "";
                this.loginImageUrl = "";
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to remove loading image: " + httpResponse.data.exceptionMessage);
            });
        }
        static isEmptyHtml(testHtml) {
            if (HtmlUtil.isNullOrWhitespace(testHtml))
                return true;
            testHtml = testHtml.replaceAll("<p>", "");
            testHtml = testHtml.replaceAll("&nbsp;", "");
            testHtml = testHtml.replaceAll("</p>", "");
            return HtmlUtil.isNullOrWhitespace(testHtml);
        }
        /**
         * Save all of the settings
         */
        saveAllSettings() {
            analytics.track("editSettings");
            this.settings.welcomeMessage = this.tinyMceEditor.getContent();
            this.isLoading = true;
            this.$http.put("/api/Settings", this.settings).then(() => {
                this.isLoading = false;
                // Update the locally-stored values
                this.siteInfo.privateSiteInfo.homeRightColumnType = this.settings.homeRightColumnType;
                this.siteInfo.privateSiteInfo.welcomeMessage = this.settings.welcomeMessage;
                if (ChtnSettingsController.isEmptyHtml(this.siteInfo.privateSiteInfo.welcomeMessage))
                    this.siteInfo.privateSiteInfo.welcomeMessage = null;
                this.siteInfo.privateSiteInfo.ptaUnitId = this.settings.ptaUnitId;
                const didChangeFullName = this.settings.fullName !== this.originalSettings.fullName;
                // Reload the page to show the page title has changed
                if (didChangeFullName)
                    location.reload();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to save: " + response.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user clicks a new background image
         */
        onImageClick(bgImage) {
            this.settings.bgImageFileName = bgImage;
            //SettingsJS._defaultBG = bgImage;
            this.$http.put("/api/Settings", { BGImageFileName: this.settings.bgImageFileName }).then(() => {
                $(".test-bg-image").removeClass("test-bg-image-selected");
                //$( "img[src='" + $rootScope.bgImagePath + bgImage + "']" ).addClass( "test-bg-image-selected" );
                this.isLoading = false;
            }, (response) => {
                this.isLoading = false;
                alert("Failed to save: " + response.data);
            });
        }
        onImageHoverOver(bgImage) {
            //$( document.documentElement ).css( "background-image", "url(" + $rootScope.bgImagePath + bgImage + ")" );
        }
        onImageHoverOut() {
            //if( typeof ( this.settings.bgImageFileName ) === "string" && this.settings.bgImageFileName.length > 0 )
            //    $( document.documentElement ).css( "background-image", "url(" + $rootScope.bgImagePath + this.settings.bgImageFileName + ")" );
            //else
            //    $( document.documentElement ).css( "background-image", this.defaultBGImage );
        }
        onQaDeleteSite() {
            this.$http.get("/api/QA/DeleteThisAssociation").then(function () {
                location.reload();
            }, function (httpResponse) {
                alert("Failed to delete site: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Initialize the login image JQuery upload control
         */
        hookUpLoginImageUpload() {
            $(() => {
                $('#JQLoginImageFileUploader').fileupload({
                    dropZone: null,
                    pasteZone: null,
                    autoUpload: true,
                    add: (e, data) => {
                        this.$scope.$apply(() => {
                            this.isLoading = true;
                        });
                        analytics.track("setLoginImage");
                        $("#FileUploadProgressContainer").show();
                        data.url = "api/DocumentUpload/LoginImage";
                        if (this.siteInfo.publicSiteInfo.baseApiUrl)
                            data.url = this.siteInfo.publicSiteInfo.baseApiUrl + "DocumentUpload/LoginImage";
                        const xhr = data.submit();
                        xhr.done((result) => {
                            this.$scope.$apply(() => {
                                this.isLoading = false;
                                this.loginImageUrl = result.newUrl + "?cacheBreaker=" + new Date().getTime();
                                this.siteInfo.publicSiteInfo.loginImageUrl = this.loginImageUrl;
                            });
                            $("#FileUploadProgressContainer").hide();
                        });
                    },
                    beforeSend: (xhr) => {
                        if (this.siteInfo.publicSiteInfo.baseApiUrl)
                            xhr.setRequestHeader("Authorization", "Bearer " + this.$rootScope.authToken);
                        else
                            xhr.setRequestHeader("ApiAuthToken", this.$rootScope.authToken);
                    },
                    progressall: (e, data) => {
                        const progress = Math.floor((data.loaded * 100) / data.total);
                        $('#FileUploadProgressBar').css('width', progress + '%');
                        if (progress === 100)
                            $("#FileUploadProgressLabel").text("Finalizing Upload...");
                        else
                            $("#FileUploadProgressLabel").text(progress + "%");
                    }
                });
            });
        }
        /**
         * Occurs when the user clicks the link to force refresh the page
         */
        forceRefresh() {
            window.location.reload();
        }
        onWelcomeMessageEdit() {
            const MaxWelcomeLength = 10000;
            const welcomeHtml = this.tinyMceEditor.getContent();
            this.shouldShowWelcomeTooLongError = welcomeHtml.length > MaxWelcomeLength;
        }
    }
    ChtnSettingsController.$inject = ["$http", "SiteInfo", "$timeout", "$scope", "$rootScope"];
    Ally.ChtnSettingsController = ChtnSettingsController;
})(Ally || (Ally = {}));
CA.angularApp.component("chtnSiteSettings", {
    templateUrl: "/ngApp/chtn/manager/settings/site-settings.html",
    controller: Ally.ChtnSettingsController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the page used to navigate to other group info pages
     */
    class AssociationInfoController {
        /**
         * The constructor for the class
         */
        constructor(siteInfo, $routeParams) {
            this.siteInfo = siteInfo;
            this.$routeParams = $routeParams;
            this.hideDocuments = false;
            this.hideVendors = false;
            this.showMaintenance = false;
            this.showVendors = true;
            this.faqMenuText = "Info/FAQs";
            if (AppConfig.appShortName === "home")
                this.faqMenuText = "Notes";
            this.frontEndVersion = appVer.toString();
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.hideDocuments = this.siteInfo.userInfo.isRenter && !this.siteInfo.privateSiteInfo.rentersCanViewDocs;
            this.hideVendors = AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club";
            this.showMaintenance = AppConfig.appShortName === "home"
                || (AppConfig.appShortName === "condo")
                || (AppConfig.appShortName === "hoa");
            this.showVendors = AppConfig.appShortName !== "pta";
            if (this.hideDocuments)
                this.selectedView = "Info";
            else
                this.selectedView = "Docs";
            if (HtmlUtil.isValidString(this.$routeParams.viewName))
                this.selectedView = this.$routeParams.viewName;
        }
        /**
        * Occurs when the user clicks the link to force refresh the page
        */
        forceRefresh() {
            window.location.reload();
        }
    }
    AssociationInfoController.$inject = ["SiteInfo", "$routeParams"];
    Ally.AssociationInfoController = AssociationInfoController;
})(Ally || (Ally = {}));
CA.condoAllyControllers.
    directive('contenteditable', ['$sce', function ($sce) {
        return {
            restrict: 'A',
            require: '?ngModel',
            link: function (scope, element, attrs, ngModel) {
                if (!ngModel)
                    return; // do nothing if no ng-model
                // Specify how UI should be updated
                ngModel.$render = function () {
                    element.html($sce.getTrustedHtml(ngModel.$viewValue || ''));
                };
                // Listen for change events to enable binding
                element.on('blur keyup change', function () {
                    scope.$evalAsync(read);
                });
                read(); // initialize
                // Write data to the model
                function read() {
                    let html = element.html();
                    // When we clear the content editable the browser leaves a <br> behind
                    // If strip-br attribute is provided then we strip this out
                    if (attrs.stripBr && html === "<br>") {
                        html = '';
                    }
                    ngModel.$setViewValue(html);
                }
            }
        };
    }]);
// Highlight text that matches a string
CA.angularApp.filter("highlight", ["$sce", function ($sce) {
        return function (text, phrase) {
            text = text || "";
            if (phrase)
                text = text.replace(new RegExp('(' + phrase + ')', 'gi'), '<span class="fileSearchHighlight">$1</span>');
            return $sce.trustAsHtml(text);
        };
    }]);
CA.angularApp.component("associationInfo", {
    templateUrl: "/ngApp/chtn/member/association-info.html",
    controller: Ally.AssociationInfoController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the group site home page
     */
    class ChtnHomeController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope, siteInfo, $timeout, $scope, $routeParams, $sce) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.$scope = $scope;
            this.$routeParams = $routeParams;
            this.$sce = $sce;
            this.showDiscussionThreads = false;
            this.showLocalNews = false;
            this.testPay_ShouldShow = false;
            this.testPay_isValid = false;
            this.shouldShowOwnerFinanceTxn = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.testPay_ShouldShow = false; //this.siteInfo.publicSiteInfo.shortName === "qa" || this.siteInfo.publicSiteInfo.shortName === "localtest";
            if (this.testPay_ShouldShow) {
                this.testPay_ReturnUrl = window.location.href;
                this.testPay_IpnUrl = this.siteInfo.publicSiteInfo.baseUrl + "/api/PayPalIpn";
                this.testPay_UserFirst = this.siteInfo.userInfo.firstName;
                this.testPay_UserLast = this.siteInfo.userInfo.lastName;
                this.testPay_Description = "Assessment for " + this.siteInfo.publicSiteInfo.fullName;
            }
            this.welcomeMessage = this.siteInfo.privateSiteInfo.welcomeMessage;
            this.isWelcomeMessageHtml = this.welcomeMessage && this.welcomeMessage.indexOf("<") > -1;
            if (this.isWelcomeMessageHtml) {
                this.welcomeMessage = this.$sce.trustAsHtml(this.welcomeMessage);
                Ally.RichTextHelper.makeLinksOpenNewTab("welcome-message-panel");
            }
            this.canMakePayment = this.siteInfo.privateSiteInfo.isPaymentEnabled && !this.siteInfo.userInfo.isRenter;
            if (this.canMakePayment) {
                // Temporary logic until we're full to Stripe. If this site only has Dwolla active
                // and this user is not already active with Dwolla then they can't make payments.
                const onlyDwollaIsActive = this.siteInfo.privateSiteInfo.isDwollaPaymentActive && !this.siteInfo.privateSiteInfo.isWePayPaymentActive && !this.siteInfo.privateSiteInfo.isStripePaymentActive;
                if (onlyDwollaIsActive && !this.siteInfo.userInfo.dwollaFundingSourceIsVerified) {
                    //TEMP for user to make payment
                    if (this.siteInfo.userInfo.userId !== "c310aff7-6b80-4380-8832-f3a47fdc09e1")
                        this.canMakePayment = false;
                }
            }
            this.shouldShowOwnerFinanceTxn = this.siteInfo.privateSiteInfo.shouldShowOwnerFinanceTxn && !this.siteInfo.userInfo.isRenter;
            this.isFirstVisit = this.siteInfo.userInfo.lastLoginDateUtc === null;
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.showFirstVisitModal = this.isFirstVisit && !this.$rootScope.hasClosedFirstVisitModal && this.siteInfo.privateSiteInfo.siteLaunchedDateUtc === null;
            this.allyAppName = AppConfig.appName;
            this.homeRightColumnType = this.siteInfo.privateSiteInfo.homeRightColumnType;
            if (!this.homeRightColumnType && this.homeRightColumnType !== "")
                this.homeRightColumnType = "localnews";
            if (this.siteInfo.privateSiteInfo.creationDate > Ally.SiteInfoService.AlwaysDiscussDate) {
                this.showDiscussionThreads = true;
                this.showLocalNews = this.homeRightColumnType.indexOf("localnews") > -1;
            }
            else {
                this.showDiscussionThreads = this.homeRightColumnType.indexOf("chatwall") > -1;
                this.showLocalNews = this.homeRightColumnType.indexOf("localnews") > -1;
            }
            if (this.showDiscussionThreads && this.$routeParams && HtmlUtil.isNumericString(this.$routeParams.discussionThreadId))
                this.autoOpenDiscussionThreadId = parseInt(this.$routeParams.discussionThreadId);
            var innerThis = this;
            this.$scope.$on("homeHasActivePolls", () => innerThis.shouldShowAlertSection = true);
            this.$http.get("/api/Committee/MyCommittees", { cache: true }).then((response) => {
                this.usersCommittees = response.data;
                if (this.usersCommittees)
                    this.usersCommittees = _.sortBy(this.usersCommittees, c => c.name.toLowerCase());
            });
            // Delay the survey check since it's low priority and it lets the other parts of the page load faster
            if (AppConfig.appShortName === "condo" || AppConfig.appShortName === "hoa")
                this.$timeout(() => this.checkForSurveys(), 250);
        }
        /**
        * See if there's any surveys waiting to be completed for the current group+user
        */
        checkForSurveys() {
            this.$http.get("/api/AllySurvey/AnySurvey").then((response) => {
                this.allySurvey = response.data;
            }, (errorResponse) => {
                console.log("Failed to load ally survey", errorResponse.data.exceptionMessage);
            });
            this.allySurvey = null;
        }
        onTestPayAmtChange() {
            this.testPay_isValid = this.testPay_Amt > 5 && this.testPay_Amt < 5000;
        }
        hideFirstVisit() {
            this.$rootScope.hasClosedFirstVisitModal = true;
            this.showFirstVisitModal = false;
        }
    }
    ChtnHomeController.$inject = ["$http", "$rootScope", "SiteInfo", "$timeout", "$scope", "$routeParams", "$sce"];
    Ally.ChtnHomeController = ChtnHomeController;
    class AllySurveyInfo {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("chtnHome", {
    templateUrl: "/ngApp/chtn/member/chtn-home.html",
    controller: Ally.ChtnHomeController
});

var Ally;
(function (Ally) {
    class WelcomeTip {
    }
    /**
     * The controller for the page that shows useful info on a map
     */
    class ChtnMapController {
        /**
         * The constructor for the class
         */
        constructor($scope, $timeout, $http, siteInfo, appCacheService) {
            this.$scope = $scope;
            this.$timeout = $timeout;
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.editingTip = new WelcomeTip();
            this.hoaHomes = [];
            this.tips = [];
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            // If we know our group's position, let's tighten the 
            var autocompleteOptions = undefined;
            if (this.siteInfo.privateSiteInfo.googleGpsPosition) {
                var TwentyFiveMilesInMeters = 40234;
                var latLon = {
                    lat: 41.142248,
                    lng: -73.633228
                };
                var circle = new google.maps.Circle({
                    center: this.siteInfo.privateSiteInfo.googleGpsPosition,
                    radius: TwentyFiveMilesInMeters
                });
                autocompleteOptions = {
                    bounds: circle.getBounds()
                };
            }
            var addressInput = document.getElementById("edit-location-address-text-box");
            this.addressAutocomplete = new google.maps.places.Autocomplete(addressInput, autocompleteOptions);
            var innerThis = this;
            google.maps.event.addListener(this.addressAutocomplete, 'place_changed', function () {
                var place = innerThis.addressAutocomplete.getPlace();
                innerThis.editingTip.address = place.formatted_address;
            });
            this.retrieveHoaHomes();
            var innerThis = this;
            this.$timeout(() => innerThis.getWalkScore(), 1000);
            MapCtrlMapMgr.Init(this.siteInfo, this.$scope, this);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Populate the page
        ///////////////////////////////////////////////////////////////////////////////////////////////
        refresh() {
            this.isLoading = true;
            this.$http.get("/api/WelcomeTip").then((httpResponse) => {
                this.tips = httpResponse.data;
                MapCtrlMapMgr.ClearAllMarkers();
                if (AppConfig.appShortName === "condo")
                    MapCtrlMapMgr.AddMarker(MapCtrlMapMgr._homeGpsPos.lat(), MapCtrlMapMgr._homeGpsPos.lng(), "Home", MapCtrlMapMgr.MarkerNumber_Home, null);
                for (var locationIndex = 0; locationIndex < this.tips.length; ++locationIndex) {
                    var curLocation = this.tips[locationIndex];
                    if (curLocation.gpsPos === null)
                        continue;
                    curLocation.markerIndex = MapCtrlMapMgr.AddMarker(curLocation.gpsPos.lat, curLocation.gpsPos.lon, curLocation.name, curLocation.markerNumber, null);
                }
                // Add HOA homes
                _.each(this.hoaHomes, (home) => {
                    if (home.fullAddress && home.fullAddress.gpsPos) {
                        var markerIcon = MapCtrlMapMgr.MarkerNumber_Home;
                        var markerText = home.name;
                        if (_.any(this.siteInfo.userInfo.usersUnits, u => u.unitId === home.unitId)) {
                            markerIcon = MapCtrlMapMgr.MarkerNumber_MyHome;
                            markerText = "Your home: " + markerText;
                        }
                        MapCtrlMapMgr.AddMarker(home.fullAddress.gpsPos.lat, home.fullAddress.gpsPos.lon, markerText, markerIcon, home.unitId);
                    }
                });
                MapCtrlMapMgr.OnMarkersReady();
                this.isLoading = false;
            });
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to edit a tip
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onEditTip(tip) {
            this.editingTip = jQuery.extend({}, tip);
            window.scrollTo(0, document.body.scrollHeight);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to move a tip
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onMoveMarker(tip) {
            MapCtrlMapMgr.SetMarkerDraggable(tip.markerIndex, true);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to delete a tip
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onDeleteTip(tip) {
            if (!confirm('Are you sure you want to delete this item?'))
                return;
            this.isLoading = true;
            this.$http.delete("/api/WelcomeTip/" + tip.itemId).then(() => {
                this.isLoading = false;
                this.refresh();
            });
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to add a new tip
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onSaveTip() {
            if (this.editingTip === null)
                return;
            //$( "#new-item-form" ).validate();
            //if ( !$( "#new-item-form" ).valid() )
            //    return;
            var onSave = () => {
                this.isLoading = false;
                this.editingTip = new WelcomeTip();
                this.refresh();
            };
            var onFailure = (response) => {
                this.isLoading = false;
                alert("Failed to save item: " + response.data.exceptionMessage);
            };
            this.isLoading = true;
            // If we're editing an existing item
            if (this.editingTip.itemId)
                this.$http.put("/api/WelcomeTip", this.editingTip).then(onSave, onFailure);
            // Otherwise create a new one
            else
                this.$http.post("/api/WelcomeTip", this.editingTip).then(onSave, onFailure);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Used by the ng-repeats to filter locations vs tips
        ///////////////////////////////////////////////////////////////////////////////////////////////
        isLocationTip(tip) {
            return tip.gpsPos !== null;
        }
        isNotLocationTip(tip) {
            return tip.gpsPos === null;
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Get the URL to the image for a specific marker
        ///////////////////////////////////////////////////////////////////////////////////////////////
        getMarkerIconUrl(markerNumber) {
            var MarkerNumber_Home = -2;
            var MarkerNumber_Hospital = -3;
            var MarkerNumber_PostOffice = -4;
            var retPath = "/assets/images/MapMarkers/";
            if (markerNumber >= 1 && markerNumber <= 10)
                retPath += "green_" + markerNumber;
            else if (markerNumber === MarkerNumber_Home)
                retPath += "MapMarker_Home";
            else if (markerNumber === MarkerNumber_Hospital)
                retPath += "MapMarker_Hospital";
            else if (markerNumber === MarkerNumber_PostOffice)
                retPath += "MapMarker_PostOffice";
            else
                retPath += "green_blank";
            retPath += ".png";
            return retPath;
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Move a marker's position
        ///////////////////////////////////////////////////////////////////////////////////////////////
        updateItemGpsLocation(markerIndex, lat, lon) {
            var tip = _.find(this.tips, function (t) { return t.markerIndex === markerIndex; });
            var updateInfo = {
                itemId: tip.itemId,
                newLat: lat,
                newLon: lon
            };
            this.isLoading = true;
            var innerThis = this;
            this.$http.put("/api/WelcomeTip/UpdateGpsLocation", updateInfo).then(function () {
                innerThis.isLoading = false;
            });
        }
        /**
         * Set the walkscore info
         */
        getWalkScore() {
            var handleWalkScoreResult = function (httpResponse) {
                if (!httpResponse || !httpResponse.data || httpResponse.data === "Error") {
                    $("#WalkScorePanel").html("Failed to load Walk Score.");
                    $("#WalkScorePanel").hide();
                }
                else
                    $("#WalkScorePanel").html(httpResponse.data);
            };
            this.$http.get("/api/WelcomeTip/GetWalkScore").then(handleWalkScoreResult, handleWalkScoreResult);
        }
        /**
        * Load the houses onto the map
        */
        retrieveHoaHomes() {
            this.$http.get("/api/BuildingResidents/FullUnits").then((httpResponse) => {
                if (httpResponse.data) {
                    if (AppConfig.appShortName === "condo") {
                        // Only show homes if our units have an address other than the condo's address
                        let nonMainAddresses = _.filter(httpResponse.data, u => u.addressId && !!u.fullAddress);
                        nonMainAddresses = _.filter(nonMainAddresses, u => u.fullAddress.oneLiner != this.siteInfo.privateSiteInfo.groupAddress.oneLiner);
                        if (nonMainAddresses.length > 0)
                            this.hoaHomes = httpResponse.data;
                    }
                    else if (AppConfig.appShortName === "hoa")
                        this.hoaHomes = httpResponse.data;
                }
                this.refresh();
            }, () => {
                this.refresh();
            });
        }
    }
    ChtnMapController.$inject = ["$scope", "$timeout", "$http", "SiteInfo", "appCacheService"];
    Ally.ChtnMapController = ChtnMapController;
})(Ally || (Ally = {}));
CA.angularApp.component("chtnMap", {
    templateUrl: "/ngApp/chtn/member/chtn-map.html",
    controller: Ally.ChtnMapController
});
class MapCtrlMapMgr {
    /**
    * Called when the DOM structure is ready
    */
    static Init(siteInfo, scope, mapCtrl) {
        MapCtrlMapMgr.ngScope = scope;
        MapCtrlMapMgr.mapCtrl = mapCtrl;
        if (typeof (google) === "undefined")
            return;
        // Store our home position
        MapCtrlMapMgr._homeGpsPos = siteInfo.privateSiteInfo.googleGpsPosition;
        MapCtrlMapMgr._groupGpsBounds = siteInfo.privateSiteInfo.gpsBounds;
        // Create the map centered at our home
        var myOptions = {
            center: MapCtrlMapMgr._homeGpsPos,
            zoom: 25,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        MapCtrlMapMgr._mainMap = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
        // Add our home marker
        if (AppConfig.appShortName === "condo")
            MapCtrlMapMgr.AddMarker(MapCtrlMapMgr._homeGpsPos.lat(), MapCtrlMapMgr._homeGpsPos.lng(), "Home", MapCtrlMapMgr.MarkerNumber_Home, null);
        MapCtrlMapMgr.OnMapReady();
        // Add any markers that already exist to this map
        //for( var markerIndex = 0; markerIndex < MapCtrlMapMgr._markers.length; ++markerIndex )
        //{
        //    if( !MapCtrlMapMgr._markers[markerIndex].getMap() )
        //        MapCtrlMapMgr._markers[markerIndex].setMap( MapCtrlMapMgr._mainMap );
        //}
    }
    static OnMapReady() {
        MapCtrlMapMgr._isMapReady = true;
        if (MapCtrlMapMgr._areMarkersReady)
            MapCtrlMapMgr.OnMapAndMarkersReady();
    }
    static OnMarkersReady() {
        MapCtrlMapMgr._areMarkersReady = true;
        if (MapCtrlMapMgr._isMapReady)
            MapCtrlMapMgr.OnMapAndMarkersReady();
    }
    static OnMapAndMarkersReady() {
        for (var markerIndex = 0; markerIndex < MapCtrlMapMgr._tempMarkers.length; ++markerIndex) {
            var tempMarker = MapCtrlMapMgr._tempMarkers[markerIndex];
            var markerImageUrl = null;
            if (tempMarker.markerNumber >= 1 && tempMarker.markerNumber <= 10)
                markerImageUrl = "/assets/images/MapMarkers/green_" + tempMarker.markerNumber + ".png";
            else if (tempMarker.markerNumber === MapCtrlMapMgr.MarkerNumber_Home)
                markerImageUrl = "/assets/images/MapMarkers/MapMarker_Home.png";
            else if (tempMarker.markerNumber === MapCtrlMapMgr.MarkerNumber_Hospital)
                markerImageUrl = "/assets/images/MapMarkers/MapMarker_Hospital.png";
            else if (tempMarker.markerNumber === MapCtrlMapMgr.MarkerNumber_PostOffice)
                markerImageUrl = "/assets/images/MapMarkers/MapMarker_PostOffice.png";
            else if (tempMarker.markerNumber === MapCtrlMapMgr.MarkerNumber_MyHome)
                markerImageUrl = "/assets/images/MapMarkers/MapMarker_MyHome.png";
            else
                markerImageUrl = "/assets/images/MapMarkers/green_blank.png";
            var marker = new google.maps.Marker({
                position: new google.maps.LatLng(tempMarker.lat, tempMarker.lon),
                map: MapCtrlMapMgr._mainMap,
                animation: google.maps.Animation.DROP,
                title: tempMarker.name,
                icon: markerImageUrl
            });
            marker.markerIndex = markerIndex;
            google.maps.event.addListener(marker, 'dragend', function () {
                var marker = this;
                var gpsPos = marker.getPosition();
                MapCtrlMapMgr.ngScope.$apply(function () {
                    MapCtrlMapMgr.mapCtrl.updateItemGpsLocation(marker.markerIndex, gpsPos.lat(), gpsPos.lng());
                });
            });
            if (tempMarker.unitId) {
                marker.unitId = tempMarker.unitId;
                marker.addListener('click', function (innerMarker) {
                    return function () {
                        MapCtrlMapMgr.mapCtrl.appCacheService.set("scrollToUnitId", innerMarker.unitId.toString());
                        window.location.hash = "#!/BuildingResidents";
                    };
                }(marker));
            }
            MapCtrlMapMgr._markers.push(marker);
        }
        // We've processed all of the temp markes so clear the array
        MapCtrlMapMgr._tempMarkers = [];
        if (MapCtrlMapMgr._groupGpsBounds) {
            var groupBoundsPath = Ally.MapUtil.gpsBoundsToGooglePoly(MapCtrlMapMgr._groupGpsBounds);
            var groupBoundsPolylineOptions = {
                paths: groupBoundsPath,
                map: MapCtrlMapMgr._mainMap,
                strokeColor: '#0000FF',
                strokeOpacity: 0.5,
                strokeWeight: 1,
                fillColor: '#0000FF',
                fillOpacity: 0.15,
                zIndex: -1
            };
            MapCtrlMapMgr._groupBoundsShape = new google.maps.Polygon(groupBoundsPolylineOptions);
        }
        MapCtrlMapMgr.ZoomMapToFitMarkers();
    }
    /**
    * Add a marker to the map
    */
    static ClearAllMarkers() {
        for (var i = 0; i < MapCtrlMapMgr._markers.length; i++)
            MapCtrlMapMgr._markers[i].setMap(null);
        MapCtrlMapMgr._markers = [];
    }
    /**
    * Make a marker draggable or not
    */
    static SetMarkerDraggable(markerIndex, isDraggable) {
        MapCtrlMapMgr._markers[markerIndex].setDraggable(isDraggable);
    }
    /**
    * Add a marker to the map and return the index of that new marker
    */
    static AddMarker(lat, lon, name, markerNumber, unitId) {
        MapCtrlMapMgr._tempMarkers.push({
            lat: lat,
            lon: lon,
            name: name,
            markerNumber: markerNumber,
            unitId: unitId
        });
        return MapCtrlMapMgr._tempMarkers.length - 1;
    }
    /**
    * Set the map zoom so all markers are visible
    */
    static ZoomMapToFitMarkers() {
        //  Create a new viewpoint bound
        var bounds = new google.maps.LatLngBounds();
        //  Go through each marker and make the bounds extend to fit it
        for (var markerIndex = 0; markerIndex < MapCtrlMapMgr._markers.length; ++markerIndex)
            bounds.extend(MapCtrlMapMgr._markers[markerIndex].getPosition());
        if (MapCtrlMapMgr._groupBoundsShape) {
            var path = MapCtrlMapMgr._groupBoundsShape.getPath();
            for (var i = 0; i < path.getLength(); ++i)
                bounds.extend(path.getAt(i));
        }
        //  Fit these bounds to the map
        MapCtrlMapMgr._mainMap.fitBounds(bounds);
    }
}
//onMapApiLoaded: function ()
//{
//    MapCtrlMapMgr.Init();
//},
/*
* The map displaying the area around the building
* @type {google.maps.Map}
*/
MapCtrlMapMgr._mainMap = null;
/*
* The position of our home building
* @type {google.maps.LatLng}
*/
MapCtrlMapMgr._homeGpsPos = null;
MapCtrlMapMgr._groupGpsBounds = null;
MapCtrlMapMgr._groupBoundsShape = null;
/*
* The array of markers on the map. We keep track in case the map wasn't created yet when
* AddMarker was called.
* @type {Array.<google.maps.Marker>}
*/
MapCtrlMapMgr._markers = [];
/**
* The marker number that indicates the home marker icon
* @type {Number}
* @const
*/
MapCtrlMapMgr.MarkerNumber_Home = -2;
/**
* The marker number that indicates the home marker icon for the user's home
* @type {Number}
* @const
*/
MapCtrlMapMgr.MarkerNumber_MyHome = -5;
/**
* The marker number that indicates the hospital marker icon
* @type {Number}
* @const
*/
MapCtrlMapMgr.MarkerNumber_Hospital = -3;
/**
* The marker number that indicates the post office marker icon
* @type {Number}
* @const
*/
MapCtrlMapMgr.MarkerNumber_PostOffice = -4;
MapCtrlMapMgr._isMapReady = false;
MapCtrlMapMgr._areMarkersReady = false;
MapCtrlMapMgr._tempMarkers = [];
MapCtrlMapMgr.ngScope = null;
MapCtrlMapMgr.mapCtrl = null;

var Ally;
(function (Ally) {
    /**
     * The controller for the page that allows users to reset their password
     */
    class ForgotPasswordController {
        /**
         * The constructor for the class
         */
        constructor($http, appCacheService) {
            this.$http = $http;
            this.appCacheService = appCacheService;
            this.isLoading = false;
            this.loginInfo = new Ally.LoginInfo();
            this.shouldHideControls = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.loginInfo.emailAddress = this.appCacheService.getAndClear("forgotEmail");
        }
        /**
         * Occurs when the user clicks the log-in button
         */
        onSubmitEmail() {
            this.isLoading = true;
            // Retrieve information for the current association
            this.$http.post("/api/Login/Forgot", this.loginInfo).then(() => {
                this.shouldHideControls = true;
                this.isLoading = false;
                this.resultText = "Please check your email for updated login information.";
                this.resultTextColor = "#00F";
            }, (httpResponse) => {
                this.isLoading = false;
                this.resultText = "Failed to process your request: " + httpResponse.data.exceptionMessage;
                this.resultTextColor = "#F00";
            });
        }
    }
    ForgotPasswordController.$inject = ["$http", "appCacheService"];
    Ally.ForgotPasswordController = ForgotPasswordController;
})(Ally || (Ally = {}));
CA.angularApp.component("forgotPassword", {
    templateUrl: "/ngApp/chtn/member/forgot-password.html",
    controller: Ally.ForgotPasswordController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the page that lists group members
     */
    class GroupMembersController {
        /**
         * The constructor for the class
         */
        constructor(fellowResidents, siteInfo, appCacheService, $http) {
            this.fellowResidents = fellowResidents;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.$http = $http;
            this.isLoading = true;
            this.isLoadingGroupEmails = false;
            this.isLoadingSaveEmailGroup = false;
            this.emailLists = [];
            this.customEmailList = [];
            this.unitPrefix = "Unit ";
            this.groupEmailDomain = "";
            this.shouldShowNewCustomEmailModal = false;
            this.isPremiumPlanActive = false;
            this.allyAppName = AppConfig.appName;
            this.groupShortName = siteInfo.publicSiteInfo.shortName;
            this.showMemberList = AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club" || AppConfig.appShortName === "pta";
            this.groupEmailDomain = "inmail." + AppConfig.baseTld;
            this.unitPrefix = AppConfig.appShortName === "condo" ? "Unit " : "";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            this.fellowResidents.getByUnitsAndResidents().then((data) => {
                this.isLoading = false;
                this.unitList = data.byUnit;
                this.allResidents = data.residents;
                this.committees = data.committees;
                if (!this.allResidents && data.ptaMembers)
                    this.allResidents = data.ptaMembers;
                // Sort by last name for member lists, first name otherwise
                if (this.showMemberList)
                    this.allResidents = _.sortBy(this.allResidents, r => (r.lastName || "").toLowerCase());
                else
                    this.allResidents = _.sortBy(this.allResidents, r => (r.fullName || "").toLowerCase());
                this.boardMembers = _.filter(this.allResidents, (r) => r.boardPosition !== Ally.FellowResidentsService.BoardPos_None && r.boardPosition !== Ally.FellowResidentsService.BoardPos_PropertyManager);
                this.boardPropMgrs = _.filter(this.allResidents, (r) => r.boardPosition === Ally.FellowResidentsService.BoardPos_PropertyManager);
                this.boardMessageRecipient = null;
                if (this.boardMembers.length > 0) {
                    const hasBoardEmail = _.some(this.boardMembers, function (m) { return m.hasEmail; });
                    if (hasBoardEmail) {
                        this.boardMessageRecipient = {
                            fullName: "Entire Board",
                            firstName: "everyone on the board",
                            hasEmail: true,
                            userId: GroupMembersController.AllBoardUserId
                        };
                    }
                }
                // Remove board members from the member list
                if (AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club")
                    this.allResidents = _.filter(this.allResidents, function (r) { return r.boardPosition === 0; });
                for (let i = 0; i < this.boardMembers.length; ++i)
                    this.boardMembers[i].boardPositionName = _.find(Ally.FellowResidentsService.BoardPositionNames, (bm) => bm.id === this.boardMembers[i].boardPosition).name;
                this.boardPropMgrs.forEach(bpm => bpm.boardPositionName = _.find(Ally.FellowResidentsService.BoardPositionNames, (bm) => bm.id === bpm.boardPosition).name);
                const boardSortOrder = [
                    1,
                    64,
                    16,
                    2,
                    4,
                    8,
                    32
                ];
                this.boardMembers = _.sortBy(this.boardMembers, function (bm) {
                    let sortIndex = _.indexOf(boardSortOrder, bm.boardPosition);
                    if (sortIndex === -1)
                        sortIndex = 100;
                    return sortIndex;
                });
                const getEmails = function (memo, unit) {
                    Array.prototype.push.apply(memo, unit.owners);
                    return memo;
                };
                this.allOwners = _.reduce(this.unitList, getEmails, []);
                this.allOwners = _.map(_.groupBy(this.allOwners, function (resident) {
                    return resident.email;
                }), function (grouped) {
                    return grouped[0];
                });
                // Remove duplicates
                this.allOwnerEmails = _.reduce(this.allOwners, function (memo, owner) { if (HtmlUtil.isValidString(owner.email)) {
                    memo.push(owner.email);
                } return memo; }, []);
                if (this.unitList && this.unitList.length > 0)
                    this.unitList = Ally.HtmlUtil2.smartSortStreetAddresses(this.unitList, "name");
                if (this.committees) {
                    // Only show committees with a contact person
                    //TWC - 10/19/18 - Show committees even without a contact person
                    //this.committees = _.reject( this.committees, c => !c.contactUser );
                    this.committees = _.sortBy(this.committees, c => c.committeeName.toLowerCase());
                }
                // If we should scroll to a specific home
                const scrollToUnitId = this.appCacheService.getAndClear("scrollToUnitId");
                if (scrollToUnitId) {
                    const scrollToElemId = "unit-id-" + scrollToUnitId;
                    setTimeout(() => {
                        document.getElementById(scrollToElemId).scrollIntoView();
                        $("#" + scrollToElemId).effect("pulsate", { times: 3 }, 2000);
                    }, 300);
                }
                // Populate the email name lists, delayed to help the page render faster
                setTimeout(() => this.loadGroupEmails(), 500);
            }, (httpErrorResponse) => {
                alert("Failed to retrieve group members. Please let tech support know via the contact form in the bottom right.");
                console.log("Failed to retrieve group members: " + httpErrorResponse.data.exceptionMessage);
            });
        }
        updateMemberFilter() {
            //TODO
            const lowerFilter = (this.memberSearchTerm || '').toLowerCase();
            const filterSearchFiles = (unitListing) => {
                if ((unitListing.name || '').toLowerCase().indexOf(lowerFilter) !== -1)
                    return true;
                return false;
            };
            //this.searchFileList = _.filter( this.fullSearchFileList, filterSearchFiles );
        }
        loadGroupEmails() {
            this.hasMissingEmails = _.some(this.allResidents, function (r) { return !r.hasEmail; });
            this.groupEmailsLoadError = null;
            this.isLoadingGroupEmails = true;
            this.fellowResidents.getAllGroupEmails().then((emailGroups) => {
                this.isLoadingGroupEmails = false;
                this.emailLists = emailGroups.standardGroups;
                this.customEmailList = emailGroups.customGroups;
                // Populate custom group email names
                if (this.customEmailList) {
                    for (const curGroupEmail of this.customEmailList) {
                        curGroupEmail.usersFullNames = [];
                        for (const curGroupMember of curGroupEmail.members) {
                            const resident = this.allResidents.find(r => r.userId === curGroupMember.userId);
                            if (resident)
                                curGroupEmail.usersFullNames.push(resident.fullName);
                        }
                    }
                }
                // Hook up the address copy link
                setTimeout(function () {
                    const clipboard = new ClipboardJS(".clipboard-button");
                    clipboard.on("success", function (e) {
                        Ally.HtmlUtil2.showTooltip(e.trigger, "Copied!");
                        e.clearSelection();
                    });
                    clipboard.on("error", function (e) {
                        Ally.HtmlUtil2.showTooltip(e.trigger, "Auto-copy failed, press CTRL+C now");
                    });
                }, 750);
            }, (httpResponse) => {
                this.isLoadingGroupEmails = false;
                this.groupEmailsLoadError = "Failed to load group email addresses: " + httpResponse.data.exceptionMessage;
            });
        }
        /**
        * Called to open the model to create a new custom group email address
        */
        onAddNewCustomEmailGroup() {
            this.shouldShowNewCustomEmailModal = true;
            this.editGroupEmailInfo = new SaveEmailGroupInfo();
            this.allResidents.forEach(r => r.isAssociated = false);
            window.setTimeout(() => document.getElementById("custom-group-email-short-name-text").focus(), 50);
        }
        /**
        * Called to toggle membership in a custom group email address
        */
        onGroupEmailMemberClicked(resident) {
            // Add the user ID if it's not already in the list, remove it if it is
            const existingMemberIdIndex = this.editGroupEmailInfo.memberUserIds.indexOf(resident.userId);
            if (existingMemberIdIndex === -1)
                this.editGroupEmailInfo.memberUserIds.push(resident.userId);
            else
                this.editGroupEmailInfo.memberUserIds.splice(existingMemberIdIndex, 1);
        }
        /**
        * Called to save a custom group email address
        */
        saveCustomGroupEmailInfo() {
            this.isLoadingSaveEmailGroup = true;
            this.groupEmailSaveError = null;
            const onSave = () => {
                this.isLoadingSaveEmailGroup = false;
                this.shouldShowNewCustomEmailModal = false;
                this.editGroupEmailInfo = null;
                // Refresh the emails, clear the cache first since we added a new group email address
                this.fellowResidents.clearResidentCache();
                this.loadGroupEmails();
            };
            const onError = (httpResponse) => {
                this.isLoadingSaveEmailGroup = false;
                this.groupEmailSaveError = "Failed to process your request: " + httpResponse.data.exceptionMessage;
            };
            if (this.editGroupEmailInfo.existingGroupEmailId)
                this.$http.put("/api/BuildingResidents/EditCustomGroupEmail", this.editGroupEmailInfo).then(onSave, onError);
            else
                this.$http.post("/api/BuildingResidents/NewCustomGroupEmail", this.editGroupEmailInfo).then(onSave, onError);
        }
        /**
        * Called when the user clicks the button to edit a custom group email address
        */
        editCustomGroupEmail(groupEmail) {
            this.shouldShowNewCustomEmailModal = true;
            this.editGroupEmailInfo = new SaveEmailGroupInfo();
            this.editGroupEmailInfo.existingGroupEmailId = groupEmail.customGroupEmailId;
            this.editGroupEmailInfo.description = groupEmail.description;
            this.editGroupEmailInfo.shortName = groupEmail.shortName;
            this.editGroupEmailInfo.memberUserIds = groupEmail.members.map(m => m.userId);
            this.editGroupEmailInfo.allowPublicIncoming = groupEmail.allowPublicIncoming;
            this.allResidents.forEach(r => r.isAssociated = this.editGroupEmailInfo.memberUserIds.indexOf(r.userId) !== -1);
            window.setTimeout(() => document.getElementById("custom-group-email-short-name-text").focus(), 50);
        }
        /**
        * Called when the user clicks the button to delete a custom group email address
        */
        deleteGroupEmail(groupEmail) {
            if (!confirm("Are you sure you want to delete this group email address? Emails sent to this address will no longer be delivered."))
                return;
            this.isLoadingGroupEmails = true;
            this.$http.delete("/api/BuildingResidents/DeleteCustomGroupEmail/" + groupEmail.customGroupEmailId).then(() => {
                this.isLoadingGroupEmails = false;
                // Refresh the emails, clear the cache first since we added a new email group
                this.fellowResidents.clearResidentCache();
                this.loadGroupEmails();
            }, (httpResponse) => {
                this.isLoadingGroupEmails = false;
                this.groupEmailSaveError = "Failed to process your request: " + httpResponse.data.exceptionMessage;
            });
        }
    }
    GroupMembersController.$inject = ["fellowResidents", "SiteInfo", "appCacheService", "$http"];
    GroupMembersController.AllBoardUserId = "af615460-d92f-4878-9dfa-d5e4a9b1f488";
    Ally.GroupMembersController = GroupMembersController;
    class SaveEmailGroupInfo {
        constructor() {
            this.memberUserIds = [];
        }
    }
})(Ally || (Ally = {}));
CA.angularApp.component("groupMembers", {
    templateUrl: "/ngApp/chtn/member/group-members.html",
    controller: Ally.GroupMembersController
});

var Ally;
(function (Ally) {
    class HelpSendInfo {
    }
    /**
     * The controller for the page that allows users to submit feedback
     */
    class HelpFormController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.sendInfo = new HelpSendInfo();
            this.isLoading = false;
            this.wasMessageSent = false;
            this.isPageEnabled = null;
            this.shouldShowGroupNameField = false;
            /**
             * Occurs when the user clicks the log-in button
             */
            this.onSendHelp = function () {
                $("#help-form").validate();
                if (!$("#help-form").valid())
                    return;
                this.isLoading = true;
                // Retrieve information for the current association
                this.$http.post("/api/Help", this.sendInfo).then(() => {
                    this.isLoading = false;
                    this.sendInfo = {};
                    this.sendInfo.clientUrl = window.location.href;
                    this.wasMessageSent = true;
                    this.resultStyle.color = "#00F";
                    this.sendResult = "Your message has been sent. We'll do our best to get back to you within 24 hours.";
                }, () => {
                    this.isLoading = false;
                    this.resultStyle.color = "#F00";
                    this.sendResult = "Failed to send message.";
                });
            };
            this.resultStyle = {
                "text-align": "center",
                "font-size": "large",
                "font-weight": "bold"
            };
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.$http.get("/api/PublicAllyAppSettings/IsHelpPageEnabled").then((httpResponse) => this.isPageEnabled = httpResponse.data, (httpResponse) => {
                this.isPageEnabled = true; // Default to true if we can't get the setting
                console.log("Failed to get sign-up enabled status: " + httpResponse.data.exceptionMessage);
            });
            if (this.siteInfo.isLoggedIn)
                this.sendInfo.emailAddress = this.siteInfo.userInfo.emailAddress;
            this.sendInfo.clientUrl = window.location.href;
            this.shouldShowGroupNameField = HtmlUtil.getSubdomain(window.location.host) === "login";
        }
    }
    HelpFormController.$inject = ["$http", "SiteInfo"];
    Ally.HelpFormController = HelpFormController;
})(Ally || (Ally = {}));
CA.angularApp.component("helpForm", {
    templateUrl: "/ngApp/chtn/member/help.html",
    controller: Ally.HelpFormController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the page that lets users view a calender of events
     */
    class LogbookController {
        /**
         * The constructor for the class
         */
        constructor($scope, $timeout, $http, $rootScope, $q, fellowResidents, siteInfo) {
            this.$scope = $scope;
            this.$timeout = $timeout;
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.$q = $q;
            this.fellowResidents = fellowResidents;
            this.siteInfo = siteInfo;
            this.showBadNotificationDateWarning = false;
            this.isLoadingNews = false;
            this.isLoadingLogbookForCalendar = false;
            this.isLoadingPolls = false;
            this.isLoadingCalendarEvents = false;
            this.onlyRefreshCalendarEvents = false;
            this.showExpandedCalendarEventModel = false;
            this.currentTimeZoneAbbreviation = "CT";
            this.localTimeZoneDiffersFromGroup = false;
            this.associatedGroups = [];
            this.GroupShortNameIndividuals = "Individuals";
            ///////////////////////////////////////////////////////////////////////////////////////////////
            // Hide the read-only calendar event view
            ///////////////////////////////////////////////////////////////////////////////////////////////
            this.clearViewEvent = function () {
                this.viewEvent = null;
            };
        }
        getTimezoneAbbreviation(timeZoneIana = null) {
            // Need to cast moment to any because we don't have the tz typedef file
            const tempMoment = moment();
            if (!timeZoneIana)
                timeZoneIana = moment.tz.guess();
            const timeZoneInfo = tempMoment.tz(timeZoneIana);
            const timeZoneAbbreviation = timeZoneInfo.format('z');
            // Drop the daylight savings time (DST) info to avoid confusion with users
            if (timeZoneAbbreviation === "EST" || timeZoneAbbreviation === "EDT")
                return "ET";
            else if (timeZoneAbbreviation === "CST" || timeZoneAbbreviation === "CDT")
                return "CT";
            else if (timeZoneAbbreviation === "MST" || timeZoneAbbreviation === "MDT")
                return "MT";
            else if (timeZoneAbbreviation === "PST" || timeZoneAbbreviation === "PDT")
                return "PT";
            return timeZoneAbbreviation;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.currentTimeZoneAbbreviation = this.getTimezoneAbbreviation();
            if (this.siteInfo.privateSiteInfo.groupAddress && this.siteInfo.privateSiteInfo.groupAddress.timeZoneIana) {
                this.groupTimeZoneAbbreviation = this.getTimezoneAbbreviation(this.siteInfo.privateSiteInfo.groupAddress.timeZoneIana);
                if (this.groupTimeZoneAbbreviation != this.currentTimeZoneAbbreviation)
                    this.localTimeZoneDiffersFromGroup = true;
            }
            if (AppConfig.isChtnSite) {
                this.fellowResidents.getResidents().then((residents) => {
                    this.residents = residents;
                    this.residents = _.sortBy(this.residents, (r) => r.lastName);
                });
            }
            const innerThis = this;
            /* config object */
            var uiConfig = {
                height: 600,
                editable: false,
                header: {
                    //left: 'month agendaWeek',
                    left: 'prevYear prev next nextYear today',
                    center: 'title',
                    right: 'month listYear'
                },
                viewRender: (view, element) => {
                    $(element).css("cursor", "pointer");
                },
                dayClick: function (date) {
                    if (!innerThis.$rootScope.isSiteManager)
                        return;
                    // The date is wrong if time zone is considered
                    var clickedDate = moment(moment.utc(date).format(LogbookController.DateFormat)).toDate();
                    innerThis.$scope.$apply(function () {
                        var maxDaysBack = null; //3;
                        //if( moment( clickedDate ).subtract( maxDaysBack, 'day' ).isBefore( moment() ) )
                        //    maxDaysBack = moment( clickedDate ).diff( moment(), 'day' );
                        var eventDetails = {
                            date: clickedDate,
                            dateOnly: clickedDate,
                            associatedUserIds: [],
                            notificationEmailDaysBefore: maxDaysBack
                        };
                        innerThis.setEditEvent(eventDetails, false);
                    });
                },
                eventClick: function (event) {
                    innerThis.$scope.$apply(function () {
                        if (event.calendarEventObject) {
                            if (innerThis.$rootScope.isSiteManager)
                                innerThis.setEditEvent(event.calendarEventObject, true);
                            else {
                                innerThis.viewEvent = event.calendarEventObject;
                                // Make <a> links open in new tabs
                                //setTimeout( () => RichTextHelper.makeLinksOpenNewTab( "view-event-desc" ), 500 );
                            }
                        }
                    });
                },
                eventRender: function (event, element) {
                    //$( element ).css( "cursor", "default" );
                    $(element).qtip({
                        style: {
                            classes: 'qtip-light qtip-shadow'
                        },
                        content: {
                            text: event.fullDescription,
                            title: event.toolTipTitle
                        }
                    });
                },
                eventSources: [{
                        events: (start, end, timezone, callback) => {
                            innerThis.getAssociationEvents(start, end, timezone, callback);
                        }
                    },
                    {
                        events: (start, end, timezone, callback) => {
                            innerThis.getCalendarEvents(start, end, timezone, callback);
                        }
                    }]
            };
            $(document).ready(function () {
                $('.EditableEntry').editable('<%= Request.Url %>', {
                    id: 'EditEntryId',
                    type: 'textarea',
                    cancel: 'Cancel',
                    submit: 'Ok'
                });
                //$( ".collapsibleContainer" ).collapsiblePanel();
                $('#log-calendar').fullCalendar(uiConfig);
                $('#calendar-event-time').timepicker({ 'scrollDefault': '10:00am' });
                $(".fc-bg td.fc-today").append("<div class='today-note'>Today</div>");
            });
            this.fellowResidents.getGroupEmailObject().then((emailList) => {
                this.associatedGroups = emailList.map(e => {
                    const isCustomRecipientGroup = e.recipientType.toUpperCase() === Ally.FellowResidentsService.CustomRecipientType;
                    return {
                        groupShortName: isCustomRecipientGroup ? ("custom:" + e.recipientTypeName) : e.recipientType,
                        displayLabel: e.displayName,
                        isAssociated: false
                    };
                });
                this.associatedGroups.push({ displayLabel: this.GroupShortNameIndividuals, groupShortName: this.GroupShortNameIndividuals, isAssociated: false });
            });
        }
        getAllEvents(startDate, endDate) {
            const loadNewsToCalendar = false;
            const loadLogbookToCalendar = false;
            const loadPollsToCalendar = AppConfig.isChtnSite;
            //var firstDay = moment().startOf( "month" ).format( DateFormat );
            //var lastDay = moment().add( 1, "month" ).startOf( "month" ).format( DateFormat );
            const firstDay = startDate.format(LogbookController.DateFormat);
            const lastDay = endDate.format(LogbookController.DateFormat);
            const newsDeferred = this.$q.defer();
            const logbookDeferred = this.$q.defer();
            const pollDeferred = this.$q.defer();
            if (loadNewsToCalendar) {
                this.isLoadingNews = true;
                this.$http.get("/api/News/WithinDates?startDate=" + firstDay + "&endDate=" + lastDay).then((httpResponse) => {
                    var data = httpResponse.data;
                    this.isLoadingNews = false;
                    _.each(data, function (entry) {
                        var shortText = entry.text;
                        if (shortText.length > 10)
                            shortText = shortText.substring(0, 10) + "...";
                        var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.text + "</p>";
                        this.calendarEvents.push({
                            title: "Notice: " + shortText,
                            start: moment(entry.postDate).toDate(),
                            toolTipTitle: "Notice Added",
                            fullDescription: fullDescription
                        });
                    });
                    newsDeferred.resolve();
                }, () => {
                    this.isLoadingNews = false;
                    newsDeferred.resolve();
                });
            }
            else
                newsDeferred.resolve();
            if (loadLogbookToCalendar) {
                this.isLoadingLogbookForCalendar = true;
                this.$http.get("/api/Logbook?startDate=" + firstDay + "&endDate=" + lastDay).then((httpResponse) => {
                    var data = httpResponse.data;
                    this.isLoadingLogbookForCalendar = false;
                    _.each(data, function (entry) {
                        var shortText = entry.text;
                        if (shortText.length > 10)
                            shortText = shortText.substring(0, 10) + "...";
                        var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.text + "</p>";
                        this.calendarEvents.push({
                            title: "Logbook: " + shortText,
                            start: moment(entry.postDate).format("YYYY-MM-DD"),
                            toolTipTitle: "Logbook Entry Added",
                            fullDescription: fullDescription
                        });
                    });
                    logbookDeferred.resolve();
                }, () => {
                    this.isLoadingLogbookForCalendar = false;
                    logbookDeferred.resolve();
                });
            }
            else
                logbookDeferred.resolve();
            if (loadPollsToCalendar) {
                this.isLoadingPolls = true;
                this.$http.get("/api/Poll/DateRange?startDate=" + firstDay + "&endDate=" + lastDay).then((httpResponse) => {
                    var data = httpResponse.data;
                    this.isLoadingPolls = false;
                    _.each(data, (entry) => {
                        var shortText = entry.text;
                        if (shortText.length > 10)
                            shortText = shortText.substring(0, 10) + "...";
                        var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.text + "</p>";
                        this.calendarEvents.push({
                            title: "Poll: " + shortText,
                            start: moment(entry.postDate).toDate(),
                            calendarEventObject: null,
                            toolTipTitle: "Poll Added",
                            fullDescription: fullDescription,
                            allDay: false
                        });
                    });
                    pollDeferred.resolve();
                }, () => {
                    this.isLoadingPolls = false;
                    pollDeferred.resolve();
                });
            }
            else
                pollDeferred.resolve();
            return this.$q.all([newsDeferred.promise, logbookDeferred.promise, pollDeferred.promise]);
        }
        getAssociationEvents(start, end, timezone, callback) {
            if (this.onlyRefreshCalendarEvents) {
                this.onlyRefreshCalendarEvents = undefined;
                callback(this.calendarEvents);
                return;
            }
            this.calendarEvents = [];
            this.getAllEvents(start, end).then(() => {
                callback(this.calendarEvents);
            });
        }
        getCalendarEvents(start, end, timezone, callback) {
            this.isLoadingCalendarEvents = true;
            const firstDay = start.format(LogbookController.DateFormat);
            const lastDay = end.format(LogbookController.DateFormat);
            this.$http.get("/api/CalendarEvent?startDate=" + firstDay + "&endDate=" + lastDay).then((httpResponse) => {
                var associationEvents = [];
                this.isLoadingCalendarEvents = false;
                _.each(httpResponse.data, (entry) => {
                    const utcEventDate = moment.utc(entry.eventDateUtc);
                    const utcTimeOnly = utcEventDate.format(LogbookController.TimeFormat);
                    const isAllDay = utcTimeOnly == LogbookController.NoTime;
                    let dateEntry;
                    if (isAllDay) {
                        entry.timeOnly = "";
                        entry.dateOnly = new Date(utcEventDate.year(), utcEventDate.month(), utcEventDate.date());
                        dateEntry = new Date(utcEventDate.year(), utcEventDate.month(), utcEventDate.date());
                    }
                    else {
                        const localDate = moment.utc(entry.eventDateUtc).local();
                        entry.timeOnly = localDate.format(LogbookController.TimeFormat);
                        entry.dateOnly = localDate.clone().startOf('day').toDate();
                        dateEntry = localDate.toDate();
                    }
                    var shortText = entry.title;
                    if (shortText && shortText.length > 10)
                        shortText = shortText.substring(0, 10) + "...";
                    var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.title + "</p>";
                    associationEvents.push({
                        title: shortText,
                        start: dateEntry,
                        toolTipTitle: "Event",
                        fullDescription: fullDescription,
                        calendarEventObject: entry,
                        allDay: isAllDay
                    });
                });
                callback(associationEvents);
            }, () => {
                this.isLoadingCalendarEvents = false;
            });
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks a user in the calendar event modal
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onResidentClicked(resident) {
            if (!resident.hasEmail) {
                alert("That user cannot be included because they do not have an email address on file.");
                resident.isAssociated = false;
                return;
            }
            const alreadyExists = _.contains(this.editEvent.associatedUserIds, resident.userId);
            if (alreadyExists)
                this.editEvent.associatedUserIds = _.without(this.editEvent.associatedUserIds, resident.userId);
            else
                this.editEvent.associatedUserIds.push(resident.userId);
        }
        isDateInPast(date) {
            const momentDate = moment(date);
            const today = moment();
            return momentDate.isBefore(today, 'day') || momentDate.isSame(today, 'day');
        }
        onShouldSendChange() {
            // Don't allow the user to send remdiner emails for past dates
            if (this.editEvent.shouldSendNotification && this.isDateInPast(this.editEvent.dateOnly))
                this.editEvent.shouldSendNotification = false;
            else if (!this.editEvent.notificationEmailDaysBefore)
                this.editEvent.notificationEmailDaysBefore = 1;
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user changes the "days before" email setting
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onChangeEmailDaysBefore() {
            const notificationDate = moment(this.editEvent.dateOnly).subtract(this.editEvent.notificationEmailDaysBefore, 'day');
            const today = moment();
            this.showBadNotificationDateWarning = notificationDate.isBefore(today, 'day') || notificationDate.isSame(today, 'day');
            if (this.showBadNotificationDateWarning) {
                this.maxDaysBack = moment(this.editEvent.dateOnly).diff(today, 'day');
                this.editEvent.notificationEmailDaysBefore = this.maxDaysBack;
                this.$timeout(function () { this.showBadNotificationDateWarning = false; }, 10000);
            }
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Show the full calendar event edit modal
        ///////////////////////////////////////////////////////////////////////////////////////////////
        expandCalendarEventModel() {
            this.showExpandedCalendarEventModel = true;
            this.hookUpWysiwyg();
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Wire up the WYSIWYG description editor
        ///////////////////////////////////////////////////////////////////////////////////////////////
        hookUpWysiwyg() {
            this.$timeout(() => {
                Ally.HtmlUtil2.initTinyMce("tiny-mce-editor", 200, { menubar: false }).then(e => {
                    this.tinyMceEditor = e;
                    if (this.editEvent && this.editEvent.description)
                        this.tinyMceEditor.setContent(this.editEvent.description);
                    else
                        this.tinyMceEditor.setContent("");
                });
            }, 100);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Set the calendar event for us to edit
        ///////////////////////////////////////////////////////////////////////////////////////////////
        setEditEvent(eventObject, showDetails) {
            this.showExpandedCalendarEventModel = showDetails || false;
            this.editEvent = eventObject;
            // Clear this warning in case the user is clicking around quickly
            this.showBadNotificationDateWarning = false;
            if (this.editEvent) {
                // Simplify the UI logic by transforming this input
                if (this.residents) {
                    this.residents.forEach(r => r.isAssociated = false);
                    if (this.editEvent.associatedUserIds)
                        this.residents.filter(r => this.editEvent.associatedUserIds.indexOf(r.userId) !== -1).forEach(r => r.isAssociated = true);
                }
                // Set the checked status for the associated groups
                if (this.editEvent.associatedGroupShortNames) {
                    this.associatedGroups.forEach(ag => {
                        ag.isAssociated = this.editEvent.associatedGroupShortNames.indexOf(ag.groupShortName) !== -1;
                    });
                }
                else
                    this.associatedGroups.forEach(ag => ag.isAssociated = false);
                this.editEvent.associatedGroupShortNames = this.associatedGroups.filter(ag => ag.isAssociated).map(ag => ag.groupShortName);
                this.editEvent.shouldSendNotification = this.editEvent.notificationEmailDaysBefore !== null;
                // Set focus on the title so it's user friendly and ng-escape needs an input focused
                // to work
                setTimeout(function () { $("#calendar-event-title").focus(); }, 10);
                if (this.showExpandedCalendarEventModel)
                    this.hookUpWysiwyg();
            }
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Delete the calendar event that's being viewed
        ///////////////////////////////////////////////////////////////////////////////////////////////
        deleteCalendarEvent(eventId) {
            if (!confirm("Are you sure you want to remove this event?"))
                return;
            this.isLoadingCalendarEvents = true;
            this.$http.delete("/api/CalendarEvent?eventId=" + eventId).then(() => {
                this.isLoadingCalendarEvents = false;
                this.editEvent = null;
                this.onlyRefreshCalendarEvents = true;
                $('#log-calendar').fullCalendar('refetchEvents');
            }, () => {
                this.isLoadingCalendarEvents = false;
                alert("Failed to delete the calendar event.");
            });
        }
        getDaysBeforeValue() {
            let daysBefore = null;
            // We need to handle strings or numbers for this property
            if (this.editEvent.notificationEmailDaysBefore !== null && this.editEvent.notificationEmailDaysBefore !== undefined) {
                if (typeof this.editEvent.notificationEmailDaysBefore === "string") {
                    daysBefore = parseInt(this.editEvent.notificationEmailDaysBefore);
                    if (isNaN(daysBefore))
                        daysBefore = null;
                }
                else if (typeof this.editEvent.notificationEmailDaysBefore === "number")
                    daysBefore = this.editEvent.notificationEmailDaysBefore;
            }
            if (daysBefore !== null && daysBefore < 0)
                daysBefore = null;
            return daysBefore;
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Save the calendar event that's being viewed
        ///////////////////////////////////////////////////////////////////////////////////////////////
        saveCalendarEvent() {
            if (!Ally.HtmlUtil2.isValidString(this.editEvent.title)) {
                alert("Please enter a title in the 'what' field");
                return;
            }
            if (this.tinyMceEditor)
                this.editEvent.description = this.tinyMceEditor.getContent();
            // Ensure the user enters a 'days before' email setting
            if (this.editEvent.shouldSendNotification) {
                const daysBefore = this.getDaysBeforeValue();
                if (daysBefore === null) {
                    alert("Please enter a valid number for the 'days before' email send date");
                    return;
                }
            }
            // Build the list of the associated users
            if (this.residents) {
                var associatedUsers = _.filter(this.residents, function (r) { return r.isAssociated; });
                this.editEvent.associatedUserIds = _.map(associatedUsers, function (r) { return r.userId; });
            }
            var dateTimeString = "";
            if (typeof (this.editEvent.timeOnly) === "string" && this.editEvent.timeOnly.length > 1) {
                dateTimeString = moment(this.editEvent.dateOnly).format(LogbookController.DateFormat) + " " + this.editEvent.timeOnly;
                this.editEvent.eventDateUtc = moment(dateTimeString, LogbookController.DateFormat + " " + LogbookController.TimeFormat).utc().toDate();
            }
            else {
                dateTimeString = moment(this.editEvent.dateOnly).format(LogbookController.DateFormat) + " " + LogbookController.NoTime;
                this.editEvent.eventDateUtc = moment.utc(dateTimeString, LogbookController.DateFormat + " " + LogbookController.TimeFormat).toDate();
            }
            if (!this.editEvent.shouldSendNotification)
                this.editEvent.notificationEmailDaysBefore = null;
            this.editEvent.associatedGroupShortNames = this.associatedGroups.filter(ag => ag.isAssociated).map(ag => ag.groupShortName);
            let httpFunc;
            if (this.editEvent.eventId)
                httpFunc = this.$http.put;
            else
                httpFunc = this.$http.post;
            analytics.track("addCalendarEvent");
            this.isLoadingCalendarEvents = true;
            httpFunc("/api/CalendarEvent", this.editEvent).then(() => {
                this.isLoadingCalendarEvents = false;
                this.editEvent = null;
                this.onlyRefreshCalendarEvents = true;
                $('#log-calendar').fullCalendar('refetchEvents');
            }, (httpResponse) => {
                this.isLoadingCalendarEvents = false;
                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to save the calendar event: " + errorMessage);
            });
        }
        getNumSelectedIndividuals() {
            return this.residents.filter(r => r.isAssociated).length;
        }
        getNumSelectedGroups() {
            return this.associatedGroups.filter(g => g.isAssociated).length;
        }
    }
    LogbookController.$inject = ["$scope", "$timeout", "$http", "$rootScope", "$q", "fellowResidents", "SiteInfo"];
    LogbookController.DateFormat = "YYYY-MM-DD";
    LogbookController.TimeFormat = "h:mma";
    LogbookController.NoTime = "12:37am";
    Ally.LogbookController = LogbookController;
    class AssociatedGroup {
    }
    class CalendarEvent {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("logbookPage", {
    templateUrl: "/ngApp/chtn/member/logbook.html",
    controller: Ally.LogbookController
});

var Ally;
(function (Ally) {
    class LoginInfo {
        constructor() {
            this.emailAddress = "";
            this.password = "";
        }
    }
    Ally.LoginInfo = LoginInfo;
    /**
     * The controller for the login page
     */
    class LoginController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope, $location, appCacheService, siteInfo, xdLocalStorage) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.$location = $location;
            this.appCacheService = appCacheService;
            this.siteInfo = siteInfo;
            this.xdLocalStorage = xdLocalStorage;
            this.isDemoSite = false;
            this.loginInfo = new LoginInfo();
            this.showNeedAccessModal = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            if (!HtmlUtil.isLocalStorageAllowed())
                this.loginResultMessage = "You have cookies/local storage disabled. Condo Ally requires these features, please enable to continue. You may be in private browsing mode.";
            const nav = navigator.userAgent.toLowerCase();
            const ieVersion = (nav.indexOf('msie') != -1) ? parseInt(nav.split('msie')[1]) : 0;
            //var isIEBrowser = window.navigator.userAgent.indexOf( "MSIE " ) >= 0;
            if (ieVersion > 0 && ieVersion < 10)
                document.getElementById("bad-browser-panel").style.display = "block";
            this.isDemoSite = HtmlUtil.getSubdomain() === "demosite";
            // Allow admin to login if needed
            if (HtmlUtil.GetQueryStringParameter("s") === "1")
                this.isDemoSite = false;
            //const welcomeImageElem = document.getElementById( "welcome-image" ) as HTMLImageElement;
            //welcomeImageElem.addEventListener( "load", () => this.onWelcomeImageLoaded() );
            //welcomeImageElem.addEventListener( "error", () => this.onWelcomeImageError() );
            this.loginImageUrl = this.siteInfo.publicSiteInfo.loginImageUrl;
            this.sectionStyle = {
                position: "relative"
            };
            if (!this.isDemoSite) {
                this.welcomeImageContainerStyle = {
                    "margin-bottom": "21px",
                    "max-width": "100%"
                };
                // Pre-size the welcome image container to avoid jumping around
                const savedWelcomeImageWidth = window.localStorage["welcomeImage_width"];
                if (savedWelcomeImageWidth && savedWelcomeImageWidth != "0" && !HtmlUtil.isNullOrWhitespace(this.loginImageUrl)) {
                    this.welcomeImageContainerStyle["width"] = savedWelcomeImageWidth + "px";
                    this.welcomeImageContainerStyle["height"] = window.localStorage["welcomeImage_height"] + "px";
                }
                //this.sectionStyle["left"] = "50%";
                if (!HtmlUtil.isNullOrWhitespace(this.loginImageUrl)) {
                    this.sectionStyle["max-width"] = "760px";
                    //this.sectionStyle["margin-left"] = "-380px";
                }
                else {
                    this.sectionStyle["max-width"] = "500px";
                    //this.sectionStyle["max-width"] = "450px";
                    //this.sectionStyle["margin-left"] = "-225px";
                }
                this.sectionStyle["margin-left"] = "auto";
                this.sectionStyle["margin-right"] = "auto";
            }
            // If we got sent here for a 403, but the user was already logged in
            if (this.appCacheService.getAndClear(AppCacheService.Key_WasLoggedIn403) === "true") {
                if (this.$rootScope.isSiteManager)
                    this.loginResultMessage = "You are not authorized to perform that action. Please contact support.";
                else
                    this.loginResultMessage = "You are not authorized to perform that action. Please contact an admin.";
            }
            // Or if we got sent here for a 401
            else if (this.appCacheService.getAndClear(AppCacheService.Key_WasLoggedIn401) === "true")
                this.loginResultMessage = "Please login first.";
            // Focus on the email text box
            setTimeout(function () {
                $("#login-email-textbox").focus();
            }, 200);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the welcome image loads
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onWelcomeImageLoaded() {
            const welcomeImageElem = document.getElementById("welcome-image");
            //console.log( `Welcome image loaded ${welcomeImageElem.width}x${welcomeImageElem.height}` );
            window.localStorage["welcomeImage_width"] = welcomeImageElem.naturalWidth;
            window.localStorage["welcomeImage_height"] = welcomeImageElem.naturalHeight;
            this.welcomeImageContainerStyle["width"] = welcomeImageElem.naturalWidth + "px";
            this.welcomeImageContainerStyle["height"] = "auto";
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the welcome image fails to load
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onWelcomeImageError() {
            //var welcomeImageElem = document.getElementById( "welcome-image" ) as HTMLImageElement;
            console.log(`Welcome image error`);
            window.localStorage.removeItem("welcomeImage_width");
            window.localStorage.removeItem("welcomeImage_height");
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button when they forgot their password
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onForgotPassword() {
            this.appCacheService.set("forgotEmail", this.loginInfo.emailAddress);
            this.$location.path("/ForgotPassword");
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Log-in 
        ///////////////////////////////////////////////////////////////////////////////////////////////
        demoLogin() {
            this.loginInfo = {
                emailAddress: "testuser",
                password: "demosite"
            };
            this.onLogin();
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the log-in button
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onLogin() {
            this.isLoading = true;
            // Retrieve information for the current association
            this.$http.post("/api/Login", this.loginInfo).then((httpResponse) => {
                this.isLoading = false;
                const data = httpResponse.data;
                let redirectPath = this.appCacheService.getAndClear(AppCacheService.Key_AfterLoginRedirect);
                this.siteInfo.setAuthToken(data.authToken);
                this.siteInfo.handleSiteInfo(data.siteInfo, this.$rootScope);
                if (this.rememberMe) {
                    window.localStorage["rememberMe_Email"] = this.loginInfo.emailAddress;
                    window.localStorage["rememberMe_Password"] = btoa(this.loginInfo.password);
                }
                else {
                    window.localStorage["rememberMe_Email"] = null;
                    window.localStorage["rememberMe_Password"] = null;
                }
                // If the user hasn't accepted the terms yet then make them go to the profile page
                if (!data.siteInfo.userInfo.acceptedTermsDate && !this.isDemoSite)
                    this.$location.path("/MyProfile");
                else {
                    if (!HtmlUtil.isValidString(redirectPath) && redirectPath !== "/Login")
                        redirectPath = "/Home";
                    this.$location.path(redirectPath);
                }
            }, (httpResponse) => {
                this.isLoading = false;
                this.loginResultMessage = "Failed to log in: " + httpResponse.data.exceptionMessage;
            });
        }
    }
    LoginController.$inject = ["$http", "$rootScope", "$location", "appCacheService", "SiteInfo", "xdLocalStorage"];
    Ally.LoginController = LoginController;
})(Ally || (Ally = {}));
CA.angularApp.component("loginPage", {
    templateUrl: "/ngApp/chtn/member/login.html",
    controller: Ally.LoginController
});

var Ally;
(function (Ally) {
    class SimpleUserEntry {
    }
    Ally.SimpleUserEntry = SimpleUserEntry;
    class SimpleUserEntryWithTerms extends SimpleUserEntry {
    }
    Ally.SimpleUserEntryWithTerms = SimpleUserEntryWithTerms;
    class ProfileUserInfo extends SimpleUserEntryWithTerms {
    }
    class PtaMember extends SimpleUserEntry {
    }
    Ally.PtaMember = PtaMember;
    /**
     * The controller for the profile page
     */
    class MyProfileController {
        /**
         * The constructor for the class
         */
        constructor($rootScope, $http, $location, appCacheService, siteInfo, $scope) {
            this.$rootScope = $rootScope;
            this.$http = $http;
            this.$location = $location;
            this.appCacheService = appCacheService;
            this.siteInfo = siteInfo;
            this.$scope = $scope;
            this.showPassword = false;
            this.shouldShowPassword = false;
            this.selectedProfileView = "Primary";
            this.passwordComplexity = "short";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isDemoSite = HtmlUtil.getSubdomain() === "demosite";
            if (this.siteInfo.privateSiteInfo)
                this.canHideContactInfo = this.siteInfo.privateSiteInfo.canHideContactInfo;
            this.retrieveProfileData();
            const hookUpPhotoFileUpload = () => {
                const uploader = $('#JQFileUploader');
                uploader.fileupload({
                    dropZone: null,
                    pasteZone: null,
                    add: (e, data) => {
                        data.url = "api/DocumentUpload/ProfileImage?ApiAuthToken=" + this.siteInfo.authToken;
                        if (this.siteInfo.publicSiteInfo.baseApiUrl)
                            data.url = this.siteInfo.publicSiteInfo.baseApiUrl + "DocumentUpload/ProfileImage";
                        this.$scope.$apply(() => this.isLoading = true);
                        const xhr = data.submit();
                        xhr.done((result) => {
                            this.$scope.$apply(() => {
                                // Reload the page to see the changes
                                window.location.reload();
                            });
                        });
                    },
                    beforeSend: (xhr) => {
                        if (this.siteInfo.publicSiteInfo.baseApiUrl)
                            xhr.setRequestHeader("Authorization", "Bearer " + this.$rootScope.authToken);
                        else
                            xhr.setRequestHeader("ApiAuthToken", this.$rootScope.authToken);
                    },
                    fail: (e, data) => {
                        this.$scope.$apply(() => {
                            this.isLoading = false;
                            alert("Upload Failed: " + data.jqXHR.responseJSON.exceptionMessage);
                        });
                    }
                });
            };
            setTimeout(hookUpPhotoFileUpload, 500);
        }
        /**
         * Save the user's profile photo setting
         */
        saveProfilePhoto(type) {
            if (this.initialProfileImageType === "upload") {
                if (!confirm("Are you sure you want to change your profile image away from your uploaded photo? Your uploaded photo will be deleted.")) {
                    this.profileImageType = this.initialProfileImageType;
                    return;
                }
            }
            this.isLoading = true;
            this.$http.put("/api/MyProfile/ProfileImage?type=" + type, null).then(() => {
                this.isLoading = false;
                this.initialProfileImageType = this.profileImageType;
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user checks to box to see what they're typing
         */
        onShowPassword() {
            const passwordTextBox = document.getElementById("passwordTextBox");
            passwordTextBox.type = this.shouldShowPassword ? "text" : "password";
        }
        /**
         * Populate the page
         */
        retrieveProfileData() {
            this.isLoading = true;
            this.$http.get("/api/MyProfile").then((httpResponse) => {
                this.isLoading = false;
                this.profileInfo = httpResponse.data;
                this.initialProfileImageType = "blank";
                if (!this.profileInfo.avatarUrl || this.profileInfo.avatarUrl.indexOf("blank-headshot") !== -1)
                    this.initialProfileImageType = "blank";
                else if (this.profileInfo.avatarUrl && this.profileInfo.avatarUrl.indexOf("gravatar") !== -1)
                    this.initialProfileImageType = "gravatar";
                else if (this.profileInfo.avatarUrl && this.profileInfo.avatarUrl.length > 0)
                    this.initialProfileImageType = "upload";
                if (this.initialProfileImageType !== "upload")
                    this.profileInfo.avatarUrl = null;
                this.profileImageType = this.initialProfileImageType;
                this.gravatarUrl = "https://www.gravatar.com/avatar/" + md5((this.profileInfo.email || "").toLowerCase()) + "?s=80&d=identicon";
                // Don't show empty email address
                if (HtmlUtil.endsWith(this.profileInfo.email, "@condoally.com"))
                    this.profileInfo.email = "";
                this.needsToAcceptTerms = this.profileInfo.acceptedTermsDate === null && !this.isDemoSite;
                this.hasAcceptedTerms = !this.needsToAcceptTerms; // Gets set by the checkbox
                this.$rootScope.shouldHideMenu = this.needsToAcceptTerms;
                // Was used before, here for convenience
                this.saveButtonStyle = {
                    width: "100px",
                    "font-size": "1em"
                };
            });
        }
        /**
         * Occurs when the user hits the save button
         */
        onSaveInfo() {
            this.isLoading = true;
            this.$http.put("/api/MyProfile", this.profileInfo).then(() => {
                this.profileInfo.password = null;
                this.resultMessage = "Your changes have been saved.";
                // $rootScope.hideMenu is true when this is the user's first login
                if (this.$rootScope.shouldHideMenu) {
                    this.$rootScope.shouldHideMenu = false;
                    this.$location.path("/Home");
                }
                this.isLoading = false;
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user modifies the password field
         */
        onPasswordChange() {
            if (!this.profileInfo.password || this.profileInfo.password.length < 6) {
                this.passwordComplexity = "short";
                return;
            }
            const hasLetter = !!this.profileInfo.password.match(/[a-z]+/i);
            const hasNumber = !!this.profileInfo.password.match(/[0-9]+/);
            const hasSymbol = !!this.profileInfo.password.match(/[^a-z0-9]+/i);
            const isComplex = this.profileInfo.password.length >= 12
                && hasLetter
                && hasNumber
                && hasSymbol;
            this.passwordComplexity = isComplex ? "complex" : "simple";
        }
    }
    MyProfileController.$inject = ["$rootScope", "$http", "$location", "appCacheService", "SiteInfo", "$scope"];
    Ally.MyProfileController = MyProfileController;
})(Ally || (Ally = {}));
CA.angularApp.component("myProfile", {
    templateUrl: "/ngApp/chtn/member/my-profile.html",
    controller: Ally.MyProfileController
});

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
var Ally;
(function (Ally) {
    class CondoSignUpWizardController {
        /**
        * The constructor for the class
        */
        constructor($scope, $http, $timeout, WizardHandler) {
            this.$scope = $scope;
            this.$http = $http;
            this.$timeout = $timeout;
            this.WizardHandler = WizardHandler;
            this.unitNumberingType = "Numbered";
            this.numUnits = 3;
            this.placeWasSelected = false;
            this.shouldCheckAddress = false;
            this.shouldShowHoaMessage = false;
            this.isLoading = false;
            this.map = null;
            this.isLoadingMap = false;
            this.hideWizard = false;
            this.isPageEnabled = null;
            // The default sign-up info object
            this.signUpInfo = {
                buildings: [{
                        units: []
                    }],
                signerUpInfo: {
                    buildingIndex: 0,
                    boardPositionValue: "1"
                },
                recaptchaKey: ""
            };
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            const prepFunc = (isPageEnabled) => {
                this.isPageEnabled = isPageEnabled;
                // Delay a bit to allow the wizard to render
                this.$timeout(() => this.initPage(), 300);
            };
            this.$scope.$on('wizard:stepChanged', (event, args) => {
                if (args.index === 2)
                    this.$timeout(() => grecaptcha.render("recaptcha-check-elem"), 50);
            });
            this.$http.get("/api/PublicAllyAppSettings/IsSignUpEnabled").then((httpResponse) => prepFunc(httpResponse.data), (httpResponse) => {
                prepFunc(true); // Default to true if we can't get the setting
                console.log("Failed to get sign-up enabled status: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user changes the number of units
         */
        onNumUnitsChanged() {
            if (!this.numUnits)
                return;
            if (this.numUnits < 1)
                this.numUnits = 1;
            else if (this.numUnits > 100)
                this.numUnits = 100;
            const numNewUnits = this.numUnits - this.signUpInfo.buildings[0].units.length;
            this.signUpInfo.buildings[0].units.length = this.numUnits;
            if (numNewUnits > 0) {
                for (let i = this.numUnits - numNewUnits; i < this.numUnits; ++i) {
                    this.signUpInfo.buildings[0].units[i] = {
                        name: this.getUnitName(i),
                        residents: [{}]
                    };
                }
            }
        }
        /**
         * Occurs as the user presses keys in the association name field
         */
        onAssociationNameChanged() {
            if (!this.signUpInfo || !this.signUpInfo.name) {
                this.shouldShowHoaMessage = false;
                return;
            }
            this.shouldShowHoaMessage = this.signUpInfo.name.toLowerCase().indexOf("hoa") !== -1
                || this.signUpInfo.name.toLowerCase().indexOf("home") !== -1;
        }
        addResident(unit) {
            if (!unit.residents)
                unit.residents = [];
            unit.residents.push({});
        }
        ;
        /**
         * Get the unit name based on its index and the numbering type
         */
        getUnitName(unitIndex) {
            if (this.unitNumberingType === "Numbered")
                return (unitIndex + 1).toString();
            else if (this.unitNumberingType === "Lettered") {
                let unitName = "";
                // If we've gone passed 26 units, then start adding double characters
                const numLoopAlphabets = Math.floor(unitIndex / 26);
                if (numLoopAlphabets > 0)
                    unitName += String.fromCharCode("A".charCodeAt(0) + (numLoopAlphabets - 1));
                const letterIndex = unitIndex % 26;
                unitName += String.fromCharCode("A".charCodeAt(0) + letterIndex);
                return unitName;
            }
            else if (this.unitNumberingType === "EW" || this.unitNumberingType === "NS") {
                if ((unitIndex % 2 == 0))
                    return ((unitIndex / 2) + 1).toString() + (this.unitNumberingType === "EW" ? "E" : "N");
                else
                    return Math.ceil(unitIndex / 2).toString() + (this.unitNumberingType === "EW" ? "W" : "S");
            }
            return (unitIndex + 1).toString();
        }
        ;
        /**
         * Occurs when the user changes the unit numbering type
         */
        onNumberingTypeChange() {
            for (let i = 0; i < this.signUpInfo.buildings[0].units.length; ++i) {
                if (!this.signUpInfo.buildings[0].units[i])
                    this.signUpInfo.buildings[0].units[i] = {};
                this.signUpInfo.buildings[0].units[i].name = this.getUnitName(i);
            }
        }
        /**
         * Occurs when the user changes the unit numbering type
         */
        centerMap(geometry) {
            // If the place has a geometry, then present it on a map.
            if (geometry.viewport) {
                this.map.fitBounds(geometry.viewport);
            }
            else {
                this.map.setCenter(geometry.location);
                this.map.setZoom(17); // Why 17? Because it looks good.
            }
            this.mapMarker.setPosition(geometry.location);
            this.mapMarker.setVisible(true);
        }
        ;
        /**
         * Occurs when the user selects an address from the Google suggestions
         */
        setPlaceWasSelected() {
            this.placeWasSelected = true;
            this.shouldCheckAddress = false;
            // Clear the flag in case the user types in a new address
            setTimeout(() => this.placeWasSelected = true, 500);
        }
        ;
        /**
         * Perform any needed initialization
         */
        initPage() {
            if (typeof (window.analytics) !== "undefined")
                window.analytics.track("condoSignUpStarted", {
                    category: "SignUp",
                    label: "Started"
                });
            const mapDiv = document.getElementById("address-map");
            this.map = new google.maps.Map(mapDiv, {
                center: { lat: 41.869638, lng: -87.657423 },
                zoom: 9
            });
            const addressInput = document.getElementById("building-0-address-text-box");
            this.addressAutocomplete = new google.maps.places.Autocomplete(addressInput);
            this.addressAutocomplete.bindTo('bounds', this.map);
            this.mapMarker = new google.maps.Marker({
                map: this.map,
                position: null,
                anchorPoint: new google.maps.Point(41.969638, -87.657423),
                icon: "/assets/images/MapMarkers/MapMarker_Home.png"
            });
            // Occurs when the user selects a Google suggested address
            this.addressAutocomplete.addListener('place_changed', () => {
                this.setPlaceWasSelected();
                //infowindow.close();
                this.mapMarker.setVisible(false);
                const place = this.addressAutocomplete.getPlace();
                let readableAddress = place.formatted_address;
                // Remove the trailing country if it's USA
                if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                    readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                this.signUpInfo.buildings[0].streetAddress = readableAddress;
                // If the name hasn't been set yet, use the address
                if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.name)) {
                    this.$scope.$apply(() => {
                        this.signUpInfo.name = place.name + " Condo Association";
                    });
                }
                if (!place.geometry) {
                    //window.alert( "Autocomplete's returned place contains no geometry" );
                    return;
                }
                this.centerMap(place.geometry);
                $("#association-name-text-box").focus();
            });
            // Initialize the unit names
            this.onNumUnitsChanged();
        }
        /**
         * Refresh the map to center typed in address
         */
        checkAddress() {
            if (this.placeWasSelected || !this.shouldCheckAddress)
                return;
            this.shouldCheckAddress = false;
            this.refreshMapForBuildingAddress();
        }
        /**
         * Refresh the map to center typed in address
         */
        refreshMapForBuildingAddress() {
            this.isLoadingMap = true;
            HtmlUtil.geocodeAddress(this.signUpInfo.buildings[0].streetAddress, (results, status) => {
                this.$scope.$apply(() => {
                    this.isLoadingMap = false;
                    if (status != google.maps.GeocoderStatus.OK) {
                        //$( "#GeocodeResultPanel" ).text( "Failed to find address for the following reason: " + status );
                        return;
                    }
                    let readableAddress = results[0].formatted_address;
                    // Remove the trailing country if it's USA
                    if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                        readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                    this.signUpInfo.buildings[0].streetAddress = readableAddress;
                    this.centerMap(results[0].geometry);
                    // If the name hasn't been set yet, use the address
                    if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.name)) {
                        const street = HtmlUtil.getStringUpToFirst(readableAddress, ",");
                        this.signUpInfo.name = street + " Condo Association";
                    }
                });
            });
        }
        ;
        /**
         * Add a building to our sign-up info
         */
        addBuilding() {
            const MaxBuidlings = 25;
            if (this.signUpInfo.buildings.length + 1 >= MaxBuidlings) {
                alert("We do not support more than " + MaxBuidlings + " buildings.");
                return;
            }
            this.signUpInfo.buildings.push({});
        }
        ;
        /**
         * Called when the user press the button to complete the sign-up process
         */
        onFinishedWizard() {
            this.signUpInfo.recaptchaKey = grecaptcha.getResponse();
            if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.recaptchaKey)) {
                alert("Please complete the reCAPTCHA field");
                return;
            }
            this.isLoading = true;
            this.$http.post("/api/SignUpWizard", this.signUpInfo).then((httpResponse) => {
                this.isLoading = false;
                const signUpResult = httpResponse.data;
                // If the was an error creating the site
                if (!HtmlUtil.isNullOrWhitespace(signUpResult.errorMessage)) {
                    alert("Failed to complete sign-up: " + signUpResult.errorMessage);
                    this.WizardHandler.wizard().goTo(signUpResult.stepIndex);
                    grecaptcha.reset();
                }
                // Otherwise create succeeded
                else {
                    if (typeof (window.analytics) !== "undefined")
                        window.analytics.track("condoSignUpComplete", {
                            category: "SignUp",
                            label: "Success"
                        });
                    // Track Condo Ally sign-up with Fathom
                    if (typeof window.fathom === "object")
                        window.fathom.trackGoal('FIEMVITM', this.numUnits * 100); // * 100 to convert "cents" to whole numbers
                    // Log this as a conversion
                    //if( typeof ( ( <any>window ).goog_report_conversion ) !== "undefined" )
                    //    ( <any>window ).goog_report_conversion();
                    // Or if the user created an active signUpResult
                    if (!HtmlUtil.isNullOrWhitespace(signUpResult.createUrl)) {
                        window.location.href = signUpResult.createUrl;
                    }
                    // Otherwise the user needs to confirm sign-up via email
                    else {
                        this.hideWizard = true;
                        this.resultMessage = "Great work! We just sent you an email with instructions on how access your new site.";
                    }
                }
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to complete sign-up: " + httpResponse.data.exceptionMessage);
                grecaptcha.reset();
            });
        }
    }
    CondoSignUpWizardController.$inject = ["$scope", "$http", "$timeout", "WizardHandler"];
    Ally.CondoSignUpWizardController = CondoSignUpWizardController;
})(Ally || (Ally = {}));
CA.angularApp.component("condoSignUpWizard", {
    templateUrl: "/ngApp/chtn/public/condo-sign-up-wizard.html",
    controller: Ally.CondoSignUpWizardController
});

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
var Ally;
(function (Ally) {
    class DiscussionThread {
    }
    Ally.DiscussionThread = DiscussionThread;
    /**
     * The controller for the page that lets users unsubscribe from discussions
     */
    class DiscussionManageController {
        /**
         * The constructor for the class
         */
        constructor($http, $routeParams) {
            this.$http = $http;
            this.$routeParams = $routeParams;
            this.isLoading = false;
            this.activeView = "loading";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.unsubscribeUser();
        }
        /**
        * Load the discussion details
        */
        loadDiscussion() {
            var idVal = decodeURIComponent(this.$routeParams.idValue);
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/Discussion/" + idVal).then((httpResponse) => {
                innerThis.isLoading = false;
                innerThis.discussion = httpResponse.data;
            }, (httpResponse) => {
                innerThis.isLoading = false;
                innerThis.errorMessage = "Failed to find the discussion details. Please contact support to alert them to the issue.";
            });
        }
        /**
         * Unsubscribe the user from the discussion
         */
        unsubscribeUser() {
            var idVal = decodeURIComponent(this.$routeParams.idValue);
            this.isLoading = true;
            this.activeView = "loading";
            var innerThis = this;
            this.$http.put("/api/Discussion/Unsubscribe/" + idVal, null).then((httpResponse) => {
                innerThis.isLoading = false;
                innerThis.activeView = "unsubscribed";
                innerThis.discussion = httpResponse.data;
            }, (httpResponse) => {
                innerThis.isLoading = false;
                innerThis.activeView = "error";
                innerThis.errorMessage = "Failed to unsubscribe you from the discussion due to a server error.";
            });
        }
        /**
         * Resubscribe the user to a discussion
         */
        resubscribeUser() {
            var idVal = decodeURIComponent(this.$routeParams.idValue);
            this.isLoading = true;
            this.activeView = "loading";
            var innerThis = this;
            this.$http.put("/api/Discussion/Resubscribe/" + idVal, null).then((httpResponse) => {
                innerThis.isLoading = false;
                innerThis.activeView = "resubscribed";
            }, (httpResponse) => {
                innerThis.isLoading = false;
                innerThis.activeView = "error";
                innerThis.errorMessage = "Failed to unsubscribe you from the discussion due to a server error.";
            });
        }
    }
    DiscussionManageController.$inject = ["$http", "$routeParams"];
    Ally.DiscussionManageController = DiscussionManageController;
})(Ally || (Ally = {}));
CA.angularApp.component("discussionManage", {
    templateUrl: "/ngApp/chtn/public/discussion-manage.html",
    controller: Ally.DiscussionManageController
});

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../../Scripts/typings/angularjs/angular-route.d.ts" />
var Ally;
(function (Ally) {
    /**
     * The controller for a page that lets a user complain about group email utilization
     */
    class EmailAbuseController {
        /**
         * The constructor for the class
         */
        constructor($http, $routeParams) {
            this.$http = $http;
            this.$routeParams = $routeParams;
            this.isLoading = false;
            this.showButtons = true;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.boardEmail = `board.${HtmlUtil.getSubdomain()}@inmail.${AppConfig.baseTld}`;
        }
        /**
         * Ask that
         */
        reportAbuse(abuseReason) {
            if (abuseReason === "not-member") {
                if (!confirm("You should reach out to the board rather than contact technical support. Click 'OK' to still proceed with contacting technical support anyway."))
                    return;
            }
            // It's double encoded to prevent angular trouble, so double decode
            const idVal = decodeURIComponent(this.$routeParams.idValue);
            const postData = {
                abuseReason: abuseReason,
                idVal: idVal,
                otherReasonText: this.otherReasonText
            };
            this.isLoading = true;
            this.$http.post("/api/EmailAbuse/v3", postData).then(() => {
                this.isLoading = false;
                this.showButtons = false;
            });
        }
    }
    EmailAbuseController.$inject = ["$http", "$routeParams"];
    Ally.EmailAbuseController = EmailAbuseController;
})(Ally || (Ally = {}));
CA.angularApp.component("emailAbuse", {
    templateUrl: "/ngApp/chtn/public/email-abuse.html",
    controller: Ally.EmailAbuseController
});

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
var Ally;
(function (Ally) {
    class HoaSignerUpInfo {
        constructor() {
            this.boardPositionValue = 1;
        }
    }
    Ally.HoaSignerUpInfo = HoaSignerUpInfo;
    class HoaSignUpInfo {
        constructor() {
            this.name = "";
            this.streetAddress = "";
            this.isResident = true;
            this.signerUpInfo = new HoaSignerUpInfo();
            this.referralSource = "";
            this.recaptchaKey = "";
        }
    }
    Ally.HoaSignUpInfo = HoaSignUpInfo;
    /**
     * The controller for the HOA Ally sign-up page
     */
    class HoaSignUpWizardController {
        /**
        * The constructor for the class
        */
        constructor($scope, $http, $timeout, WizardHandler) {
            this.$scope = $scope;
            this.$http = $http;
            this.$timeout = $timeout;
            this.WizardHandler = WizardHandler;
            this.placeWasSelected = false;
            this.shouldCheckAddress = false;
            this.isLoading = false;
            this.shouldShowCondoMessage = false;
            this.map = null;
            this.isLoadingMap = false;
            this.hideWizard = false;
            this.hoaPoly = { vertices: [] };
            this.showMap = false;
            this.didSignUpForHoaAlert = false;
            this.isPageEnabled = null;
            // The default sign-up info object
            this.signUpInfo = new Ally.HoaSignUpInfo();
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.signUpInfo.referralSource = HtmlUtil.GetQueryStringParameter("utm_sourcecapterra");
            // Normalize anything invalid to null
            if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.referralSource))
                this.signUpInfo.referralSource = null;
            this.$scope.$on('wizard:stepChanged', (event, args) => {
                if (args.index === 1)
                    this.$timeout(() => this.showMap = true, 50);
                else if (args.index === 2)
                    this.$timeout(() => grecaptcha.render("recaptcha-check-elem"), 50);
                else
                    this.showMap = false;
            });
            this.$http.get("/api/PublicAllyAppSettings/IsSignUpEnabled").then((httpResponse) => this.isPageEnabled = httpResponse.data, (httpResponse) => {
                this.isPageEnabled = true; // Default to true if we can't get the setting
                console.log("Failed to get sign-up enabled status: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Occurs as the user presses keys in the HOA name field
         */
        onHoaNameChanged() {
            if (!this.signUpInfo || !this.signUpInfo.name) {
                this.shouldShowCondoMessage = false;
                return;
            }
            const shouldShowCondoMessage = this.signUpInfo.name.toLowerCase().indexOf("condo") !== -1;
            if (shouldShowCondoMessage && !this.shouldShowCondoMessage)
                $("#suggestCondoMessageLabel").css("font-size", "1.3em").css("margin", "25px auto").addClass("alert alert-warning").fadeIn(200).fadeOut(200).fadeIn(200).fadeOut(200).fadeIn(200).fadeIn(200).fadeOut(200).fadeIn(200);
            this.shouldShowCondoMessage = shouldShowCondoMessage;
        }
        /**
         * Center the Google map on a polygon
         */
        centerMap(geometry) {
            // If the place has a geometry, then present it on a map.
            if (geometry.viewport) {
                this.map.fitBounds(geometry.viewport);
            }
            else {
                this.map.setCenter(geometry.location);
                this.map.setZoom(17); // Why 17? Because it looks good.
            }
            this.mapMarker.setPosition(geometry.location);
            this.mapMarker.setVisible(true);
        }
        /**
         * Perform initialization to create the map and hook up address autocomplete
         */
        initMapStep() {
            if (typeof (window.analytics) !== "undefined")
                window.analytics.track("condoSignUpStarted");
            this.showMap = true;
            const addressInput = document.getElementById("association-address-text-box");
            if (addressInput) {
                this.addressAutocomplete = new google.maps.places.Autocomplete(addressInput);
                this.addressAutocomplete.bindTo('bounds', this.map);
            }
            this.mapMarker = new google.maps.Marker({
                map: this.map,
                position: null,
                anchorPoint: new google.maps.Point(41.969638, -87.657423),
                icon: "/assets/images/MapMarkers/MapMarker_Home.png"
            });
            // Occurs when the user selects a Google suggested address
            if (this.addressAutocomplete) {
                const onPlaceChanged = () => {
                    this.setPlaceWasSelected();
                    //infowindow.close();
                    this.mapMarker.setVisible(false);
                    const place = this.addressAutocomplete.getPlace();
                    let readableAddress = place.formatted_address;
                    // Remove the trailing country if it's USA
                    if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                        readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                    this.signUpInfo.streetAddress = readableAddress;
                    if (!place.geometry)
                        return;
                    this.setEditPolyForAddress(place.geometry.location);
                    this.centerMap(place.geometry);
                };
                this.addressAutocomplete.addListener('place_changed', () => {
                    this.$scope.$apply(onPlaceChanged);
                });
            }
        }
        onMapEditorReady(mapInstance) {
            this.map = mapInstance;
            this.initMapStep();
        }
        /**
         * Refresh the map to center typed in address
         */
        checkAddress() {
            if (this.placeWasSelected || !this.shouldCheckAddress)
                return;
            this.shouldCheckAddress = false;
            this.refreshMapForAddress();
        }
        /**
         * Occurs when the user selects an address from the Google suggestions
         */
        setPlaceWasSelected() {
            this.placeWasSelected = true;
            this.shouldCheckAddress = false;
            // Clear the flag in case the user types in a new address
            setTimeout(() => {
                this.placeWasSelected = true;
            }, 500);
        }
        /**
         * Refresh the map edit box when a place is geocoded
         */
        setEditPolyForAddress(homePos) {
            const OffsetLat = 0.001;
            const OffsetLon = 0.0014;
            this.hoaPoly = {
                vertices: [
                    { lat: homePos.lat() - OffsetLat, lon: homePos.lng() - OffsetLon },
                    { lat: homePos.lat() + OffsetLat, lon: homePos.lng() - OffsetLon },
                    { lat: homePos.lat() + OffsetLat, lon: homePos.lng() + OffsetLon },
                    { lat: homePos.lat() - OffsetLat, lon: homePos.lng() + OffsetLon }
                ]
            };
        }
        /**
         * Refresh the map to center typed in address
         */
        refreshMapForAddress() {
            this.isLoadingMap = true;
            HtmlUtil.geocodeAddress(this.signUpInfo.streetAddress, (results, status) => {
                this.$scope.$apply(() => {
                    this.isLoadingMap = false;
                    if (status != google.maps.GeocoderStatus.OK) {
                        //$( "#GeocodeResultPanel" ).text( "Failed to find address for the following reason: " + status );
                        return;
                    }
                    let readableAddress = results[0].formatted_address;
                    // Remove the trailing country if it's USA
                    if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                        readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                    this.signUpInfo.streetAddress = readableAddress;
                    if (!results[0].geometry)
                        return;
                    this.setEditPolyForAddress(results[0].geometry.location);
                    this.centerMap(results[0].geometry);
                });
            });
        }
        /**
         * Called when the user press the button to complete the sign-up process
         */
        onFinishedWizard() {
            this.signUpInfo.recaptchaKey = grecaptcha.getResponse();
            if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.recaptchaKey)) {
                alert("Please complete the reCAPTCHA field");
                return;
            }
            this.isLoading = true;
            this.signUpInfo.boundsGpsVertices = this.hoaPoly.vertices;
            this.$http.post("/api/SignUpWizard/Hoa", this.signUpInfo).then((httpResponse) => {
                this.isLoading = false;
                const signUpResult = httpResponse.data;
                // If the was an error creating the site
                if (!HtmlUtil.isNullOrWhitespace(signUpResult.errorMessage)) {
                    alert("Failed to complete sign-up: " + signUpResult.errorMessage);
                    this.WizardHandler.wizard().goTo(signUpResult.stepIndex);
                    grecaptcha.reset();
                }
                // Otherwise create succeeded
                else {
                    if (typeof (window.analytics) !== "undefined")
                        window.analytics.track("condoSignUpComplete");
                    // Log this as a conversion
                    if (typeof (window.goog_report_conversion) !== "undefined")
                        window.goog_report_conversion();
                    if (this.signUpInfo.referralSource && typeof (window.capterra_trackingListener_v2) !== "undefined")
                        window.capterra_trackingListener_v2();
                    // Track HOA Ally sign-up with Fathom
                    if (typeof window.fathom === "object") {
                        let numHomesInt = parseInt(this.signUpInfo.numHomes);
                        if (isNaN(numHomesInt))
                            numHomesInt = 0;
                        else
                            numHomesInt *= 100; // * 100 to convert "cents" to whole numbers
                        window.fathom.trackGoal('I6WZZSMM', numHomesInt);
                    }
                    // Or if the user created an active signUpResult
                    if (!HtmlUtil.isNullOrWhitespace(signUpResult.createUrl)) {
                        // Delay just a bit to let the Capterra tracking log, if needed
                        window.setTimeout(() => window.location.href = signUpResult.createUrl, 50);
                    }
                    // Otherwise the user needs to confirm sign-up via email
                    else {
                        this.hideWizard = true;
                        this.resultMessage = "Great work! We just sent you an email with instructions on how access your new site.";
                    }
                }
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to complete sign-up: " + httpResponse.data.exceptionMessage);
                grecaptcha.reset();
            });
        }
        /**
         * Called when the user press the button to submit their email address
         */
        submitEmailForHoaNotify() {
            if (HtmlUtil.isNullOrWhitespace(this.hoaAlertEmail)) {
                alert("Please enter a valid email address");
                return;
            }
            this.isLoading = true;
            this.$http.get("/api/PublicEmail/SignUpForHoaAllyAlert?email=" + encodeURIComponent(this.hoaAlertEmail) + "&numHomes=" + encodeURIComponent(this.hoaAlertNumHomes)).then((httpResponse) => {
                this.isLoading = false;
                this.didSignUpForHoaAlert = true;
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to submit: " + httpResponse.data.exceptionMessage);
            });
        }
    }
    HoaSignUpWizardController.$inject = ["$scope", "$http", "$timeout", "WizardHandler"];
    Ally.HoaSignUpWizardController = HoaSignUpWizardController;
})(Ally || (Ally = {}));
CA.angularApp.component("hoaSignUpWizard", {
    templateUrl: "/ngApp/chtn/public/hoa-sign-up-wizard.html",
    controller: Ally.HoaSignUpWizardController
});

var Ally;
(function (Ally) {
    class NewUserSignUpInfo {
    }
    /**
     * The controller for the Neighborhood Ally sign-up page
     */
    class NeighborSignUpController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.signUpInfo = new NewUserSignUpInfo();
            this.resultIsError = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            // Hook up address auto-complete, after the page has loaded
            setTimeout(() => {
                const autocompleteOptions = undefined;
                //if( this.siteInfo.publicSiteInfo.googleGpsPosition )
                //{
                //    var TwentyFiveMilesInMeters = 40234;
                //    var circle = new google.maps.Circle( {
                //        center: this.siteInfo.publicSiteInfo.googleGpsPosition,
                //        radius: TwentyFiveMilesInMeters
                //    } );
                //    autocompleteOptions = {
                //        bounds: circle.getBounds()
                //    };
                //}
                const addressInput = document.getElementById("address-text-box");
                new google.maps.places.Autocomplete(addressInput, autocompleteOptions);
            }, 750);
        }
        /**
         * Occurs when the user clicks the button to submit their email address
         */
        onSubmitInfo() {
            if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.emailAddress)) {
                alert("Please enter an email address");
                return;
            }
            this.isLoading = true;
            this.$http.post("/api/NeighborSignUp/SignUpNewUser", this.signUpInfo).then(() => {
                this.isLoading = false;
                this.resultIsError = false;
                this.resultMessage = "Your information has been successfully submitted. Look for a welcome email soon.";
            }, () => {
                this.isLoading = false;
                this.resultIsError = true;
                this.resultMessage = "There was an error submitting your information. Please try again.";
            });
        }
        /**
         * Occurs when the user wants to retry submission of their info
         */
        goBack() {
            this.resultMessage = null;
        }
    }
    NeighborSignUpController.$inject = ["$http"];
    Ally.NeighborSignUpController = NeighborSignUpController;
})(Ally || (Ally = {}));
CA.angularApp.component("neighborSignUp", {
    templateUrl: "/ngApp/chtn/public/neighbor-sign-up.html",
    controller: Ally.NeighborSignUpController
});

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
var Ally;
(function (Ally) {
    class TempNeighborhoodSignUpInfo {
        constructor() {
            this.fullName = "";
            this.email = "";
            this.address = "";
            this.neighborhoodName = "";
            this.notes = "";
        }
    }
    /**
     * The controller for the HOA Ally sign-up page
     */
    class NeighborhoodSignUpWizardController {
        /**
        * The constructor for the class
        */
        constructor($scope, $http, $timeout, WizardHandler) {
            this.$scope = $scope;
            this.$http = $http;
            this.$timeout = $timeout;
            this.WizardHandler = WizardHandler;
            this.placeWasSelected = false;
            this.shouldCheckAddress = false;
            this.isLoading = false;
            this.map = null;
            this.isLoadingMap = false;
            this.hideWizard = false;
            this.hoaPoly = { vertices: [] };
            this.showMap = false;
            this.tempSignUpInfo = new TempNeighborhoodSignUpInfo();
            // The default sign-up info object
            this.signUpInfo = new Ally.HoaSignUpInfo();
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.$scope.$on('wizard:stepChanged', (event, args) => {
                if (args.index === 1)
                    this.$timeout(() => this.showMap = true, 50);
                else
                    this.showMap = false;
            });
            setTimeout(() => {
                const addressInput = document.getElementById("signUpAddress");
                if (addressInput)
                    new google.maps.places.Autocomplete(addressInput);
            }, 500);
        }
        /**
         * Submit the
         */
        onSubmitTempInfo() {
            this.isLoading = true;
            this.$http.post("/api/SignUpWizard/TempNeighborhood", this.tempSignUpInfo).then(() => {
                this.isLoading = false;
                this.submitTempResult = "Thank you for your submission. We'll be in touch shortly.";
            }, (response) => {
                this.isLoading = false;
                this.submitTempResult = `Submission failed: ${response.data.exceptionMessage}. Feel free to refresh the page to try again or use the contact form at the bottom of the Community Ally home page.`;
            });
        }
        /**
         * Center the Google map on a polygon
         */
        centerMap(geometry) {
            // If the place has a geometry, then present it on a map.
            if (geometry.viewport) {
                this.map.fitBounds(geometry.viewport);
            }
            else {
                this.map.setCenter(geometry.location);
                this.map.setZoom(17); // Why 17? Because it looks good.
            }
            this.mapMarker.setPosition(geometry.location);
            this.mapMarker.setVisible(true);
        }
        /**
         * Perform initialization to create the map and hook up address autocomplete
         */
        initMapStep() {
            if (typeof (window.analytics) !== "undefined")
                window.analytics.track("condoSignUpStarted");
            this.showMap = true;
            const addressInput = document.getElementById("association-address-text-box");
            if (addressInput) {
                this.addressAutocomplete = new google.maps.places.Autocomplete(addressInput);
                this.addressAutocomplete.bindTo('bounds', this.map);
            }
            this.mapMarker = new google.maps.Marker({
                map: this.map,
                position: null,
                anchorPoint: new google.maps.Point(41.969638, -87.657423),
                icon: "/assets/images/MapMarkers/MapMarker_Home.png"
            });
            // Occurs when the user selects a Google suggested address
            if (this.addressAutocomplete) {
                const onPlaceChanged = () => {
                    this.setPlaceWasSelected();
                    //infowindow.close();
                    this.mapMarker.setVisible(false);
                    const place = this.addressAutocomplete.getPlace();
                    let readableAddress = place.formatted_address;
                    // Remove the trailing country if it's USA
                    if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                        readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                    this.signUpInfo.streetAddress = readableAddress;
                    if (!place.geometry)
                        return;
                    this.setEditPolyForAddress(place.geometry.location);
                    this.centerMap(place.geometry);
                };
                this.addressAutocomplete.addListener('place_changed', () => {
                    this.$scope.$apply(onPlaceChanged);
                });
            }
        }
        onMapEditorReady(mapInstance) {
            this.map = mapInstance;
            this.initMapStep();
        }
        /**
         * Refresh the map to center typed in address
         */
        checkAddress() {
            if (this.placeWasSelected || !this.shouldCheckAddress)
                return;
            this.shouldCheckAddress = false;
            this.refreshMapForAddress();
        }
        /**
         * Occurs when the user selects an address from the Google suggestions
         */
        setPlaceWasSelected() {
            this.placeWasSelected = true;
            this.shouldCheckAddress = false;
            // Clear the flag in case the user types in a new address
            setTimeout(() => {
                this.placeWasSelected = true;
            }, 500);
        }
        /**
         * Refresh the map edit box when a place is geocoded
         */
        setEditPolyForAddress(homePos) {
            const OffsetLat = 0.001;
            const OffsetLon = 0.0014;
            this.hoaPoly = {
                vertices: [
                    { lat: homePos.lat() - OffsetLat, lon: homePos.lng() - OffsetLon },
                    { lat: homePos.lat() + OffsetLat, lon: homePos.lng() - OffsetLon },
                    { lat: homePos.lat() + OffsetLat, lon: homePos.lng() + OffsetLon },
                    { lat: homePos.lat() - OffsetLat, lon: homePos.lng() + OffsetLon }
                ]
            };
        }
        /**
         * Refresh the map to center typed in address
         */
        refreshMapForAddress() {
            this.isLoadingMap = true;
            HtmlUtil.geocodeAddress(this.signUpInfo.streetAddress, (results, status) => {
                // Need to run this in $apply since it's invoked outside of Angular's digest cycle
                this.$scope.$apply(() => {
                    this.isLoadingMap = false;
                    if (status != google.maps.GeocoderStatus.OK) {
                        //$( "#GeocodeResultPanel" ).text( "Failed to find address for the following reason: " + status );
                        return;
                    }
                    let readableAddress = results[0].formatted_address;
                    // Remove the trailing country if it's USA
                    if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                        readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                    this.signUpInfo.streetAddress = readableAddress;
                    if (!results[0].geometry)
                        return;
                    this.setEditPolyForAddress(results[0].geometry.location);
                    this.centerMap(results[0].geometry);
                });
            });
        }
        /**
         * Called when the user press the button to complete the sign-up process
         */
        onFinishedWizard() {
            this.isLoading = true;
            this.signUpInfo.boundsGpsVertices = this.hoaPoly.vertices;
            this.$http.post("/api/SignUpWizard/Hoa", this.signUpInfo).then((httpResponse) => {
                this.isLoading = false;
                const signUpResult = httpResponse.data;
                // If the was an error creating the site
                if (!HtmlUtil.isNullOrWhitespace(signUpResult.errorMessage)) {
                    alert("Failed to complete sign-up: " + signUpResult.errorMessage);
                    this.WizardHandler.wizard().goTo(signUpResult.stepIndex);
                }
                // Otherwise create succeeded
                else {
                    if (typeof (window.analytics) !== "undefined")
                        window.analytics.track("condoSignUpComplete");
                    // Log this as a conversion
                    if (typeof (window.goog_report_conversion) !== "undefined")
                        window.goog_report_conversion();
                    // Or if the user created an active signUpResult
                    if (!HtmlUtil.isNullOrWhitespace(signUpResult.createUrl)) {
                        window.location.href = signUpResult.createUrl;
                    }
                    // Otherwise the user needs to confirm sign-up via email
                    else {
                        this.hideWizard = true;
                        this.resultMessage = "Great work! We just sent you an email with instructions on how access your new site.";
                    }
                }
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to complete sign-up: " + httpResponse.data.exceptionMessage);
            });
        }
    }
    NeighborhoodSignUpWizardController.$inject = ["$scope", "$http", "$timeout", "WizardHandler"];
    Ally.NeighborhoodSignUpWizardController = NeighborhoodSignUpWizardController;
})(Ally || (Ally = {}));
CA.angularApp.component("neighborhoodSignUpWizard", {
    templateUrl: "/ngApp/chtn/public/neighborhood-sign-up-wizard.html",
    controller: Ally.NeighborhoodSignUpWizardController
});

var Ally;
(function (Ally) {
    class MemberSignUpInfo {
    }
    /**
     * The controller for the page that allows anonymous users share their contact info to be
     * invited to the group's site
     */
    class PendingMemberSignUpController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope, siteInfo, $timeout, appCacheService) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.appCacheService = appCacheService;
            this.isLoading = false;
            this.signUpInfo = new MemberSignUpInfo();
            this.showInputForm = true;
            this.showSchoolField = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.groupName = this.siteInfo.publicSiteInfo.fullName;
            this.showSchoolField = AppConfig.appShortName === "pta";
            window.setTimeout(() => this.hookupAddressAutocomplete(), 300);
            this.$timeout(() => grecaptcha.render("recaptcha-check-elem"), 100);
        }
        /**
         * Attach the Google Places auto-complete logic to the address text box
         */
        hookupAddressAutocomplete() {
            // If we know our group's position, let's tighten the auto-complete suggestion radius
            var autocompleteOptions = undefined;
            //if( this.siteInfo.publicSiteInfo.googleGpsPosition )
            //{
            //    // Also mask phone numbers for US phones
            //    var phoneFields: any = $( ".mask-phone" );
            //    phoneFields.mask( "(999) 999-9999? x999", { autoclear: false } );
            //    const TwentyFiveMilesInMeters = 40234;
            //    var circle = new google.maps.Circle( {
            //        center: this.siteInfo.publicSiteInfo.googleGpsPosition,
            //        radius: TwentyFiveMilesInMeters
            //    } );
            //    autocompleteOptions = {
            //        bounds: circle.getBounds()
            //    };
            //}
            var addressInput = document.getElementById("member-home-address-text-box");
            this.addressAutocomplete = new google.maps.places.Autocomplete(addressInput, autocompleteOptions);
            var innerThis = this;
            google.maps.event.addListener(this.addressAutocomplete, "place_changed", function () {
                var place = innerThis.addressAutocomplete.getPlace();
                innerThis.signUpInfo.streetAddress = place.formatted_address;
            });
        }
        submitInfo() {
            this.signUpInfo.recaptchaKey = grecaptcha.getResponse();
            if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.recaptchaKey)) {
                this.errorMessage = "Please complete the reCAPTCHA field";
                return;
            }
            this.isLoading = true;
            this.errorMessage = null;
            this.$http.post("/api/PublicPendingUser", this.signUpInfo).then((response) => {
                this.isLoading = false;
                this.showInputForm = false;
            }, (response) => {
                this.isLoading = false;
                this.errorMessage = "Failed to submit: " + response.data.exceptionMessage;
            });
        }
    }
    PendingMemberSignUpController.$inject = ["$http", "$rootScope", "SiteInfo", "$timeout", "appCacheService"];
    Ally.PendingMemberSignUpController = PendingMemberSignUpController;
})(Ally || (Ally = {}));
CA.angularApp.component("pendingMemberSignUp", {
    templateUrl: "/ngApp/chtn/public/pending-member-sign-up.html",
    controller: Ally.PendingMemberSignUpController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the committee home page
     */
    class CommitteeHomeController {
        /**
         * The constructor for the class
         */
        constructor(siteInfo, fellowResidents, $routeParams) {
            this.siteInfo = siteInfo;
            this.fellowResidents = fellowResidents;
            this.$routeParams = $routeParams;
            this.canManage = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.canManage = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager;
            // Make sure committee members can manage their data
            if (this.committee && !this.canManage)
                this.fellowResidents.isCommitteeMember(this.committee.committeeId).then(isCommitteeMember => this.canManage = isCommitteeMember);
            if (this.$routeParams && HtmlUtil.isNumericString(this.$routeParams.discussionThreadId))
                this.autoOpenDiscussionThreadId = parseInt(this.$routeParams.discussionThreadId);
        }
    }
    CommitteeHomeController.$inject = ["SiteInfo", "fellowResidents", "$routeParams"];
    Ally.CommitteeHomeController = CommitteeHomeController;
})(Ally || (Ally = {}));
CA.angularApp.component("committeeHome", {
    bindings: {
        committee: "<"
    },
    templateUrl: "/ngApp/committee/committee-home.html",
    controller: Ally.CommitteeHomeController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the committee home page
     */
    class CommitteeMembersController {
        /**
         * The constructor for the class
         */
        constructor($http, fellowResidents, $cacheFactory, siteInfo) {
            this.$http = $http;
            this.fellowResidents = fellowResidents;
            this.$cacheFactory = $cacheFactory;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.canManage = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.populateAllMembers();
        }
        /**
         * Populate the full list of committee members
         */
        populateAllMembers() {
            this.isLoading = true;
            this.fellowResidents.getResidents().then(residents => {
                this.allGroupMembers = residents;
                this.getMembers();
            });
        }
        /**
         * Set the contact user for this committee
         */
        setContactMember() {
            this.isLoading = true;
            this.$http.put(`/api/Committee/${this.committee.committeeId}/SetContactMember?userId=` + this.contactUser.userId, null).then((response) => {
                this.isLoading = false;
                this.committee.contactMemberUserId = this.contactUser.userId;
                // Since we changed the committee data, clear the cache so we show the up-to-date info
                this.$cacheFactory.get('$http').remove("/api/Committee/" + this.committee.committeeId);
                // Update the fellow residents page next time we're there
                this.fellowResidents.clearResidentCache();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to set contact member: " + response.data.exceptionMessage);
            });
        }
        /**
         * Retrieve the full list of committee members from the server
         */
        getMembers() {
            this.isLoading = true;
            this.fellowResidents.getCommitteeMembers(this.committee.committeeId).then((committeeMembers) => {
                this.isLoading = false;
                this.members = committeeMembers;
                this.members = _.sortBy(this.members, m => (m.fullName || "").toLowerCase());
                var isMember = (u) => _.some(this.members, (m) => m.userId === u.userId);
                this.filteredGroupMembers = _.filter(this.allGroupMembers, m => !isMember(m));
                this.filteredGroupMembers = _.sortBy(this.filteredGroupMembers, m => (m.fullName || "").toLowerCase());
                this.contactUser = _.find(this.members, m => m.userId == this.committee.contactMemberUserId);
                // Admin or committee members can manage the committee
                this.canManage = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager || _.any(this.members, m => m.userId === this.siteInfo.userInfo.userId);
            }, (response) => {
                this.isLoading = false;
                alert("Failed to retrieve committee members, please refresh the page to try again");
            });
        }
        /**
         * Add a member to this committee
         */
        addSelectedMember() {
            if (!this.userForAdd)
                return;
            this.isLoading = true;
            this.$http.put(`/api/Committee/${this.committee.committeeId}/AddMember?userId=${this.userForAdd.userId}`, null).then((response) => {
                this.isLoading = false;
                this.getMembers();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to add member, please refresh the page to try again: " + response.data.exceptionMessage);
            });
        }
        /**
         * Remove a member from this committee
         */
        removeMember(member) {
            if (!confirm("Are you sure you want to remove this person from this committee?"))
                return;
            this.isLoading = true;
            this.$http.put(`/api/Committee/${this.committee.committeeId}/RemoveMember?userId=${member.userId}`, null).then((response) => {
                this.isLoading = false;
                this.getMembers();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to remove member, please refresh the page to try again: " + response.data.exceptionMessage);
            });
        }
    }
    CommitteeMembersController.$inject = ["$http", "fellowResidents", "$cacheFactory", "SiteInfo"];
    Ally.CommitteeMembersController = CommitteeMembersController;
})(Ally || (Ally = {}));
CA.angularApp.component("committeeMembers", {
    bindings: {
        committee: "<"
    },
    templateUrl: "/ngApp/committee/committee-members.html",
    controller: Ally.CommitteeMembersController
});


var Ally;
(function (Ally) {
    /**
     * The controller for the committee parent view
     */
    class CommitteeParentController {
        /**
        * The constructor for the class
        */
        constructor($http, siteInfo, $routeParams, $cacheFactory, $rootScope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$routeParams = $routeParams;
            this.$cacheFactory = $cacheFactory;
            this.$rootScope = $rootScope;
            this.canManage = false;
            this.initialView = "Home";
            this.selectedView = null;
            this.isLoading = false;
            this.committeeId = this.$routeParams.committeeId;
            this.initialView = this.$routeParams.viewName || "Home";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.canManage = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager;
            this.retrieveCommittee();
        }
        /*
         * Retreive the committee data
         */
        retrieveCommittee() {
            this.isLoading = true;
            // Set this flag so we don't redirect if sending results in a 403
            this.$rootScope.dontHandle403 = true;
            this.$http.get("/api/Committee/" + this.committeeId, { cache: true }).then((response) => {
                this.$rootScope.dontHandle403 = false;
                this.isLoading = false;
                this.committee = response.data;
                this.selectedView = this.initialView;
            }, (response) => {
                this.$rootScope.dontHandle403 = false;
                this.isLoading = false;
                if (response.status === 403) {
                    alert("You are not authorized to view this private committee. You must be a member of the committee to view its contents. Reach out to a board member to inquire about joining the committiee.");
                    window.location.href = "/#!/Home";
                }
                else
                    alert("Failed to load committee: " + response.data.exceptionMessage);
            });
        }
        /*
         * Called after the user edits the committee name
         */
        onUpdateCommitteeName() {
            this.isLoading = true;
            const putUri = "/api/Committee/" + this.committeeId + "?name=" + this.committee.name;
            this.$http.put(putUri, null).then(() => {
                this.isLoading = false;
                this.$cacheFactory.get('$http').remove("/api/Committee/" + this.committeeId);
            }, (response) => {
                this.isLoading = false;
                alert("Failed to update the committee name: " + response.data.exceptionMessage);
            });
        }
    }
    CommitteeParentController.$inject = ["$http", "SiteInfo", "$routeParams", "$cacheFactory", "$rootScope"];
    Ally.CommitteeParentController = CommitteeParentController;
})(Ally || (Ally = {}));
CA.angularApp.component("committeeParent", {
    templateUrl: "/ngApp/committee/committee-parent.html",
    controller: Ally.CommitteeParentController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the widget that lets members view and vote on active polls
     */
    class ActivePollsController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, $timeout, $rootScope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.$rootScope = $rootScope;
            this.isLoading = false;
            this.multiSelectWriteInPlaceholder = new Ally.PollAnswer("write-in");
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            this.refreshPolls();
        }
        /**
         * Retrieve any active polls from the server
         */
        populatePollData(pollData) {
            this.polls = pollData;
            // If there are polls then tell the home to display the poll area
            if (pollData && pollData.length > 0)
                this.$rootScope.$broadcast("homeHasActivePolls");
            for (let pollIndex = 0; pollIndex < this.polls.length; ++pollIndex) {
                const poll = this.polls[pollIndex];
                if (poll.hasUsersUnitVoted) {
                    if (poll.canViewResults) {
                        const chartInfo = Ally.FellowResidentsService.pollReponsesToChart(poll, this.siteInfo);
                        poll.chartData = chartInfo.chartData;
                        poll.chartLabels = chartInfo.chartLabels;
                    }
                }
            }
        }
        /**
         * Populate the polls section from the server
         */
        refreshPolls() {
            // Grab the polls from the server
            this.isLoading = true;
            this.$http.get("/api/Poll?getActive=1").then((httpResponse) => {
                this.isLoading = false;
                // Delay the processing a bit to help the home page load faster
                this.$timeout(() => this.populatePollData(httpResponse.data), 100);
            }, () => {
                this.isLoading = false;
            });
        }
        /**
         * Occurs when the user selects a poll answer
         */
        onPollAnswer(poll, pollAnswer) {
            this.isLoading = true;
            const answerIdsCsv = pollAnswer ? pollAnswer.pollAnswerId.toString() : "";
            const writeInAnswer = poll.writeInAnswer ? encodeURIComponent(poll.writeInAnswer) : "";
            const putUri = `/api/Poll/PollResponse?pollId=${poll.pollId}&answerIdsCsv=${answerIdsCsv}&writeInAnswer=${writeInAnswer}`;
            this.$http.put(putUri, null).then(() => {
                this.isLoading = false;
                this.refreshPolls();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to submit vote: " + response.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user selects a poll answer in a poll that allows multiple answers
         */
        onMultiResponseChange(poll, pollAnswer) {
            const isAbstain = pollAnswer.answerText === "Abstain";
            if (isAbstain && pollAnswer.isLocalMultiSelect) {
                poll.answers.filter(a => a.answerText !== "Abstain").forEach(a => a.isLocalMultiSelect = false);
                poll.isWriteInMultiSelected = false;
            }
            // If this is some other answer then unselect abstain
            if (!isAbstain) {
                const abstainAnswer = poll.answers.find(a => a.answerText === "Abstain");
                if (abstainAnswer)
                    abstainAnswer.isLocalMultiSelect = false;
            }
            let numSelectedAnswers = poll.answers.filter(a => a.isLocalMultiSelect).length;
            if (poll.isWriteInMultiSelected)
                ++numSelectedAnswers;
            if (numSelectedAnswers > poll.maxNumResponses) {
                alert(`You can only select at most ${poll.maxNumResponses} answers`);
                if (pollAnswer === this.multiSelectWriteInPlaceholder)
                    poll.isWriteInMultiSelected = false;
                else
                    pollAnswer.isLocalMultiSelect = false;
            }
            poll.localMultiSelectedAnswers = poll.answers.filter(a => a.isLocalMultiSelect);
        }
        onSubmitMultiAnswer(poll) {
            if (!poll.localMultiSelectedAnswers || poll.localMultiSelectedAnswers.length === 0) {
                alert("Please select at least one reponse");
                return;
            }
            const answerIdsCsv = poll.localMultiSelectedAnswers.map(a => a.pollAnswerId).join(",");
            this.isLoading = true;
            const putUri = `/api/Poll/PollResponse?pollId=${poll.pollId}&answerIdsCsv=${answerIdsCsv}&writeInAnswer=${(poll.isWriteInMultiSelected && poll.writeInAnswer) ? encodeURIComponent(poll.writeInAnswer) : ''}`;
            this.$http.put(putUri, null).then(() => {
                this.isLoading = false;
                this.refreshPolls();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to submit vote: " + response.data.exceptionMessage);
            });
        }
    }
    ActivePollsController.$inject = ["$http", "SiteInfo", "$timeout", "$rootScope", "fellowResidents"];
    Ally.ActivePollsController = ActivePollsController;
})(Ally || (Ally = {}));
CA.angularApp.component("activePolls", {
    templateUrl: "/ngApp/common/active-polls.html",
    controller: Ally.ActivePollsController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the widget that lets residents pay their assessments
     */
    class AssessmentPaymentFormController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, $rootScope, $sce, $timeout, $q, $scope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$rootScope = $rootScope;
            this.$sce = $sce;
            this.$timeout = $timeout;
            this.$q = $q;
            this.$scope = $scope;
            this.isLoading_Payment = false;
            this.isLoadingDwolla = false;
            this.showParagon = false;
            this.showParagonCheckingSignUpModal = false;
            this.showParagonCreditSignUpModal = false;
            this.dwollaSignUpInfo = {
                dateOfBirth: "",
                ssnLast4: "",
                ssnFull: "",
                streetAddress: new Ally.FullAddress()
            };
            this.isWePayPaymentActive = false;
            this.isDwollaEnabledOnGroup = false;
            this.isStripeEnabledOnGroup = false;
            this.isDwollaReadyForPayment = false;
            this.shouldShowDwollaAddAccountModal = false;
            this.shouldShowDwollaModalClose = false;
            this.hasComplexPassword = false;
            this.didAgreeToDwollaTerms = false;
            this.dwollaFeePercent = 0.5;
            this.dwollaStripeMaxFee = 5;
            this.dwollaDocUploadType = "license";
            this.dwollaDocUploadFile = null;
            this.dwollaBalance = -1;
            this.isDwollaIavDone = false;
            this.shouldShowMicroDepositModal = false;
            this.dwollaMicroDepositAmount1String = "0.01";
            this.dwollaMicroDepositAmount2String = "0.01";
            this.shouldShowOwnerFinanceTxn = false;
            this.shouldShowDwollaAutoPayArea = true;
            this.currentDwollaAutoPayAmount = null;
            this.hasMultipleProviders = false;
            this.allowDwollaSignUp = false;
            this.stripePaymentSucceeded = false;
            this.userHasStripeAutoPay = false;
            this.shouldAllowStripeAutoPay = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            this.showParagon = false; //this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.emailAddress === "president@mycondoally.com";
            this.paragonPaymentParams = `&BillingAddress1=${encodeURIComponent("900 W Ainslie St")}&BillingState=Illinois&BillingCity=Chicago&BillingZip=60640&FirstName=${encodeURIComponent(this.siteInfo.userInfo.firstName)}&LastName=${encodeURIComponent(this.siteInfo.userInfo.lastName)}`;
            this.paragonCheckingLast4 = this.siteInfo.userInfo.paragonCheckingLast4;
            this.paragonCardLast4 = this.siteInfo.userInfo.paragonCardLast4;
            this.isWePayPaymentActive = this.siteInfo.privateSiteInfo.isWePayPaymentActive;
            // Disable to Stripe testing
            if (this.siteInfo.publicSiteInfo.groupId === 28)
                this.isWePayPaymentActive = false;
            const shouldShowDwolla = true; //AppConfigInfo.dwollaPreviewShortNames.indexOf( this.siteInfo.publicSiteInfo.shortName ) > -1;
            if (shouldShowDwolla)
                this.isDwollaEnabledOnGroup = this.siteInfo.privateSiteInfo.isDwollaPaymentActive;
            const isSpecialUser = this.siteInfo.publicSiteInfo.shortName === "mesaridge" && this.siteInfo.userInfo.userId === "8fcc4783-b554-490e-91cc-82f5ddb3d1b7";
            this.isStripeEnabledOnGroup = this.siteInfo.privateSiteInfo.isStripePaymentActive;
            if (this.isStripeEnabledOnGroup || isSpecialUser)
                this.stripeApi = Stripe(StripeApiKey, { stripeAccount: this.siteInfo.privateSiteInfo.stripeConnectAccountId });
            this.dwollaFeePercent = this.siteInfo.privateSiteInfo.isPremiumPlanActive ? 0.5 : 1;
            this.dwollaStripeMaxFee = this.siteInfo.privateSiteInfo.isPremiumPlanActive ? 5 : 10;
            this.shouldShowOwnerFinanceTxn = this.siteInfo.privateSiteInfo.shouldShowOwnerFinanceTxn;
            this.currentDwollaAutoPayAmount = this.siteInfo.userInfo.dwollaAutoPayAmount;
            if (this.siteInfo.privateSiteInfo.customFinancialInstructions)
                this.customFinancialInstructions = this.$sce.trustAsHtml(this.siteInfo.privateSiteInfo.customFinancialInstructions);
            let numProviders = 0;
            if (this.isWePayPaymentActive)
                ++numProviders;
            if (this.isDwollaEnabledOnGroup)
                ++numProviders;
            if (this.isStripeEnabledOnGroup)
                ++numProviders;
            this.hasMultipleProviders = numProviders > 1;
            this.usersStripeBankAccountHint = this.siteInfo.userInfo.stripeBankAccountId ? this.siteInfo.userInfo.stripeBankAccountHint : null;
            this.userHasStripeAutoPay = !!this.siteInfo.userInfo.stripeAutoPaySubscriptionId;
            this.shouldAllowStripeAutoPay = this.siteInfo.publicSiteInfo.shortName === "qa";
            if (this.isDwollaEnabledOnGroup) {
                this.isDwollaUserAccountVerified = this.siteInfo.userInfo.isDwollaAccountVerified;
                if (this.isDwollaUserAccountVerified) {
                    this.dwollaUserStatus = "verified";
                    this.hasDwollaFundingSource = Ally.HtmlUtil2.isValidString(this.siteInfo.userInfo.dwollaFundingSourceName);
                    if (!this.hasDwollaFundingSource) {
                        this.$http.get("/api/Dwolla/HasComplexPassword").then((response) => this.hasComplexPassword = response.data);
                    }
                    else {
                        this.dwollaFundingSourceName = this.siteInfo.userInfo.dwollaFundingSourceName;
                        this.dwollaFundingSourceIsVerified = this.siteInfo.userInfo.dwollaFundingSourceIsVerified;
                        this.isDwollaReadyForPayment = this.isDwollaUserAccountVerified && this.dwollaFundingSourceIsVerified && this.siteInfo.privateSiteInfo.isDwollaPaymentActive;
                        if (this.isDwollaReadyForPayment) {
                            // Check the user's Dwolla balance, delayed since it's not important
                            this.$timeout(() => {
                                this.$http.get("/api/Dwolla/DwollaBalance").then((response) => this.dwollaBalance = response.data.balanceAmount);
                            }, 1000);
                        }
                    }
                }
                else {
                    this.dwollaUserStatus = "checking";
                    this.userFullName = this.siteInfo.userInfo.fullName;
                    this.userEmail = this.siteInfo.userInfo.emailAddress;
                    //const getDwollaDocUploadToken = () =>
                    //{
                    //    this.$http.get( "/api/Dwolla/DocumentUploadToken" ).then(
                    //        ( response: ng.IHttpPromiseCallbackArg<string> ) =>
                    //        {
                    //            const uploadToken = response.data;
                    //            window.setTimeout( () =>
                    //            {
                    //                dwolla.configure( {
                    //                    environment: AppConfigInfo.dwollaEnvironmentName,
                    //                    styles: "/main.css",
                    //                    token: () =>
                    //                    {
                    //                        const deferred = this.$q.defer();
                    //                        deferred.resolve( uploadToken );
                    //                        return deferred.promise;
                    //                    },
                    //                    //token: () => Promise.resolve( uploadToken ),
                    //                    success: ( res: any ) => alert( res ),
                    //                    error: ( err: any ) => alert( err )
                    //                } );
                    //            }, 200 );
                    //        },
                    //        ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                    //        {
                    //            this.dwollaUserStatus = "error";
                    //            console.log( "DocumentUploadToken failed: " + errorResponse.data.exceptionMessage );
                    //        }
                    //    );
                    //};
                    const checkDwollaStatus = () => {
                        this.$http.get("/api/Dwolla/MyAccountStatus").then((response) => {
                            this.dwollaUserStatus = response.data.status;
                            this.dwollaSignUpInfo.streetAddress = response.data.streetAddress;
                            //if( this.dwollaUserStatus === "document" )
                            //    getDwollaDocUploadToken();
                        }, (errorResponse) => {
                            this.dwollaUserStatus = "error";
                            console.log("Failed to get Dwolla account status: " + errorResponse.data.exceptionMessage);
                        });
                    };
                    this.$timeout(() => checkDwollaStatus(), 500);
                }
            }
            this.allyAppName = AppConfig.appName;
            this.isWePayAutoPayActive = this.siteInfo.userInfo.isAutoPayActive;
            this.wePayAssessmentCreditCardFeeLabel = this.siteInfo.privateSiteInfo.payerPaysCCFee ? "Service fee applies" : "No service fee";
            this.wePayAssessmentAchFeeLabel = this.siteInfo.privateSiteInfo.payerPaysAchFee ? "$1.50 service fee applies" : "No service fee";
            this.payerPaysAchFee = this.siteInfo.privateSiteInfo.payerPaysAchFee;
            this.errorPayInfoText = "Is the amount incorrect?";
            this.isWePaySetup = this.siteInfo.privateSiteInfo.isPaymentEnabled;
            this.hasAssessments = this.siteInfo.privateSiteInfo.hasAssessments;
            this.assessmentFrequency = this.siteInfo.privateSiteInfo.assessmentFrequency;
            if (!this.isWePayAutoPayActive && HtmlUtil.isNumericString(HtmlUtil.GetQueryStringParameter("preapproval_id"))) {
                // The user just set up auto-pay and it may take a second
                this.isWePayAutoPayActive = true;
            }
            this.nextAutoPayText = this.siteInfo.userInfo.nextAutoPayText;
            // Grab the assessment from the user's unit (TODO handle multiple units)
            if (this.siteInfo.userInfo.usersUnits != null && this.siteInfo.userInfo.usersUnits.length > 0) {
                this.assessmentAmount = this.siteInfo.userInfo.usersUnits
                    .filter(uu => !uu.isRenter)
                    .reduce((total, uu) => total + (uu.assessment || 0), 0);
            }
            else
                this.assessmentAmount = 0;
            // Show the Dwolla auto-pay area if the group's Dwolla is setup and
            // assessment frequncy is defined, or if the user already has auto-pay
            this.shouldShowDwollaAutoPayArea = (this.isDwollaReadyForPayment
                && this.siteInfo.privateSiteInfo.assessmentFrequency != null
                && this.assessmentAmount > 0)
                || (typeof this.currentDwollaAutoPayAmount === "number" && !isNaN(this.currentDwollaAutoPayAmount) && this.currentDwollaAutoPayAmount > 1);
            // Temporarily disable while we figure out the contract
            this.shouldShowDwollaAutoPayArea = false;
            if (this.shouldShowDwollaAutoPayArea) {
                this.assessmentFrequencyInfo = PeriodicPaymentFrequencies.find(ppf => ppf.id === this.siteInfo.privateSiteInfo.assessmentFrequency);
            }
            this.paymentInfo =
                {
                    paymentType: "other",
                    amount: this.assessmentAmount,
                    note: "",
                    fundingType: null,
                    paysFor: []
                };
            this.onPaymentAmountChange();
            const MaxNumRecentPayments = 24;
            this.historicPayments = this.siteInfo.userInfo.recentPayments;
            if (this.historicPayments && this.historicPayments.length > 0) {
                if (this.historicPayments.length > MaxNumRecentPayments)
                    this.historicPayments = this.historicPayments.slice(0, MaxNumRecentPayments);
                // Fill up the list so there's always MaxNumRecentPayments
                //while( this.historicPayments.length < MaxNumRecentPayments )
                //    this.historicPayments.push( {} );
            }
            // If the user lives in a unit and assessments are enabled
            if (this.siteInfo.privateSiteInfo.assessmentFrequency != null
                && this.siteInfo.userInfo.usersUnits != null
                && this.siteInfo.userInfo.usersUnits.length > 0) {
                this.paymentInfo.paymentType = "periodic";
                if (this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled) {
                    this.knowsNextPayment = true;
                    this.errorPayInfoText = "Is the amount or date incorrect?";
                    this.nextPaymentText = this.getNextPaymentText(this.siteInfo.userInfo.usersUnits[0].nextAssessmentDue, this.siteInfo.privateSiteInfo.assessmentFrequency);
                    this.updatePaymentText();
                }
            }
            //if( this.isStripeEnabledOnGroup )
            //    this.$timeout( () => this.hookUpStripeCheckout(), 300 );
            //setTimeout( () =>
            //{
            //    $( '#btn_view_pay_history' ).click( function()
            //    {
            //        $( '#pm_info' ).collapse( 'hide' );
            //        $( '#payment_history' ).collapse( 'show' );
            //    } );
            //    $( '#btn_view_pay_info' ).click( function()
            //    {
            //        $( '#payment_history' ).collapse( 'hide' );
            //        $( '#pm_info' ).collapse( 'show' );
            //    } );
            //    $( '.hide' ).click( function()
            //    {
            //        $( this ).parent().hide( '' );
            //    } );
            //}, 400 );
        }
        /**
         * Display the Paragon payment sign-up modal, with pre-population of data
         */
        showParagonSignUp() {
            this.showParagonCheckingSignUpModal = true;
            if (this.paragonSignUpInfo)
                return;
            // Pre-populate the user's info
            this.isLoading_Payment = true;
            this.$http.get("/api/Paragon/SignUpPrefill").then((response) => {
                this.isLoading_Payment = false;
                this.paragonSignUpInfo = response.data;
            }, (errorResponse) => {
                this.isLoading_Payment = false;
                this.paragonSignUpInfo = new ParagonPayerSignUpInfo();
                console.log("Failed to SignUpPrefill: " + errorResponse.data.exceptionMessage);
            });
        }
        /**
         * Submit the user's Paragon bank account information
         */
        showParagonCreditSignUp() {
            this.isLoading_Payment = true;
            this.paragonCardTokenizedUrl = null;
            this.paragonCardTokenizationMessage = "Connecting...";
            this.showParagonCreditSignUpModal = true;
            //this.paragonCardTokenizedUrl = this.$sce.trustAsResourceUrl( "https://login.mycondoally.com/api/PublicParagon/FinishCardTokenization2" );
            //this.isLoading_Payment = false;
            this.$http.get("/api/Paragon/CardTokenizationKey").then((response) => {
                this.isLoading_Payment = false;
                this.paragonCardTokenizedUrl = this.$sce.trustAsResourceUrl("https://stage.paragonsolutions.com/ws/hosted.aspx?Username=54cE7DU2p%2bBh7h9uwJWW8Q%3d%3d&Password=jYvmN41tt1lz%2bpiazUqQYK9Abl73Z%2bHoBG4vOZImo%2bYlKTbPeNPwOcMB0%2bmIS3%2bs&MerchantKey=1293&InvNum=" + response.data);
                this.paragonCardTokenizationMessage = null;
            }, (errorResponse) => {
                this.isLoading_Payment = false;
                this.paragonCardTokenizationMessage = "There was an error connecting to the server. Please close this window and try again. If this has happened more than once please contact support.";
                console.log("Failed in CardTokenizationKey: " + errorResponse.data.exceptionMessage);
            });
        }
        /**
         * Hide the paragon window, reloading the page if needed
         */
        hideParagonCreditSignUp() {
            this.showParagonCreditSignUpModal = false;
            // Reload the page to refresh the payment info
            if (this.paragonCardTokenizedUrl)
                window.location.reload();
        }
        /**
         * Submit the user's Paragon bank account information
         */
        submitParagonSignUp() {
            this.isLoading_Payment = true;
            this.paragonSignUpError = null;
            this.$http.post("/api/Paragon/CheckPaymentSignUp", this.paragonSignUpInfo).then(() => {
                // Reload the page to refresh the payment info. We don't really need to do this,
                // but makes sure the UI is up to date a little better as well updates the
                // siteInfo object.
                window.location.reload();
            }, (errorResponse) => {
                this.isLoading_Payment = false;
                this.paragonSignUpError = errorResponse.data.exceptionMessage;
            });
        }
        /**
         * Submit the user's Paragon bank account information
         */
        submitParagonPayment(paySource) {
            if (!confirm("This will submit payment."))
                return;
            this.paragonPaymentMessage = null;
            const paymentInfo = new ParagonPaymentRequest();
            paymentInfo.notes = this.paymentInfo.note;
            paymentInfo.paymentAmount = this.paymentInfo.amount;
            paymentInfo.paysFor = this.paymentInfo.paysFor;
            paymentInfo.paySource = paySource;
            this.isLoading_Payment = true;
            this.$http.post("/api/Paragon/MakePayment", paymentInfo).then(() => {
                this.isLoading_Payment = false;
                this.paragonPaymentMessage = "Payment Successfully Processed";
            }, (errorResponse) => {
                this.isLoading_Payment = false;
                this.paragonPaymentMessage = errorResponse.data.exceptionMessage;
            });
        }
        /**
         * Un-enroll a certain payment source from Paragon payments
         */
        unenrollParagonAccount(paySource) {
            this.isLoading_Payment = true;
            this.$http.get("/api/Paragon/UnenrollPayment?paySource=" + paySource).then(() => {
                // Reload the page to see the change
                window.location.reload();
            }, (errorResponse) => {
                this.isLoading_Payment = false;
                alert("Failed to un-enroll: " + errorResponse.data.exceptionMessage);
                this.paragonPaymentMessage = errorResponse.data.exceptionMessage;
            });
        }
        /**
         * Occurs when the user presses the button to make a payment to their organization
         */
        submitWePayPayment(fundingTypeName) {
            this.isLoading_Payment = true;
            this.paymentInfo.fundingType = fundingTypeName;
            // Remove leading dollar signs
            const testAmount = this.paymentInfo.amount;
            if (HtmlUtil.isValidString(testAmount) && testAmount[0] === '$')
                this.paymentInfo.amount = parseFloat(testAmount.substr(1));
            analytics.track("makePayment", {
                fundingType: fundingTypeName
            });
            this.$http.post("/api/WePayPayment/MakeNewPayment", this.paymentInfo).then((httpResponse) => {
                const checkoutInfo = httpResponse.data;
                if (checkoutInfo !== null && typeof (checkoutInfo.checkoutUri) === "string" && checkoutInfo.checkoutUri.length > 0) {
                    //if( checkoutInfo.pendingPaymentAmount )
                    //{
                    //    const pendingDateStr = moment( checkoutInfo.pendingPaymentDateUtc ).format("M/D/YYYY h:mma")
                    //    const pendingMessage = `You already have a pending payment of $${checkoutInfo.pendingPaymentAmount} made on ${pendingDateStr}. Would you still like to continue to a make a new payment?`;
                    //    if( !confirm( pendingMessage ) )
                    //    {
                    //        this.isLoading_Payment = false;
                    //        return;
                    //    }
                    //}
                    window.location.href = checkoutInfo.checkoutUri;
                }
                else {
                    this.isLoading_Payment = false;
                    alert("Unable to initiate WePay checkout");
                }
            }, (httpResponse) => {
                this.isLoading_Payment = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    alert(httpResponse.data.exceptionMessage);
            });
        }
        getMyRecentPayments() {
            this.$http.get("/api/WePayPayment/MyRecentPayments").then((httpResponse) => {
                this.myRecentPayments = httpResponse.data;
            }, (httpResponse) => {
                console.log("Failed to retrieve recent payments: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user clicks the helper link to prep an email to inquire the board as to
         * why their records don't line up.
         */
        onIncorrectPayDetails() {
            // Get the friendly looking assessment value (ex: 100, 101, 102.50)
            let amountString = this.assessmentAmount.toString();
            if (Math.round(this.assessmentAmount) != this.assessmentAmount)
                amountString = this.assessmentAmount.toFixed(2);
            // Tell the groupSendEmail component to prep an email for the board
            let prepEventData = amountString;
            if (this.knowsNextPayment && HtmlUtil.isValidString(this.nextPaymentText))
                prepEventData += "|" + this.nextPaymentText;
            this.$rootScope.$broadcast("prepAssessmentEmailToBoard", prepEventData);
        }
        /**
         * Refresh the note text for the payment field
         */
        updatePaymentText() {
            if (this.paymentInfo.paymentType === "periodic" && this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled) {
                // If we have a next payment string
                if (!HtmlUtil.isNullOrWhitespace(this.nextPaymentText)) {
                    if (this.siteInfo.userInfo.usersUnits[0].includesLateFee)
                        this.paymentInfo.note = "Assessment payment with late fee for ";
                    else
                        this.paymentInfo.note = "Assessment payment for ";
                    this.paymentInfo.note += this.nextPaymentText;
                }
            }
            else {
                this.paymentInfo.note = "";
            }
        }
        /**
         * Occurs when the user selects a payment type radio button
         */
        onSelectPaymentType(paymentType) {
            this.paymentInfo.paymentType = paymentType;
            this.paymentInfo.amount = paymentType == "periodic" ? this.assessmentAmount : 0;
            this.updatePaymentText();
            this.onPaymentAmountChange();
        }
        /**
         * Generate the friendly string describing to what the member's next payment applies
         */
        getNextPaymentText(curPeriod, assessmentFrequency) {
            if (!curPeriod)
                return "";
            let paymentText = "";
            const frequencyInfo = FrequencyIdToInfo(assessmentFrequency);
            const periodNames = GetLongPayPeriodNames(frequencyInfo.intervalName);
            if (periodNames)
                paymentText = periodNames[curPeriod.period - 1];
            paymentText += " " + curPeriod.year;
            this.paymentInfo.paysFor = [curPeriod];
            return paymentText;
        }
        /**
         * Occurs when the user presses the button to setup auto-pay for assessments
         */
        onSetupWePayAutoPay(fundingTypeName) {
            this.isLoading_Payment = true;
            this.$http.get("/api/WePayPayment/SetupAutoPay?fundingType=" + fundingTypeName).then((httpResponse) => {
                const redirectUrl = httpResponse.data;
                if (typeof (redirectUrl) === "string" && redirectUrl.length > 0)
                    window.location.href = redirectUrl;
                else {
                    this.isLoading_Payment = false;
                    alert("Unable to initiate WePay auto-pay setup");
                }
            }, (httpResponse) => {
                this.isLoading_Payment = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    alert(httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user clicks the button to disable auto-pay
         */
        onDisableAutoPay() {
            if (!confirm("Just to double check, this will disable your auto-payment. You need to make sure to manually make your regular payments to avoid any late fees your association may enforce."))
                return;
            this.isLoading_Payment = true;
            this.$http.get("/api/WePayPayment/DisableAutoPay").then(() => {
                this.isLoading_Payment = false;
                this.isWePayAutoPayActive = false;
            }, (httpResponse) => {
                this.isLoading_Payment = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    alert(httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Sign-up a user for Dwolla payments
         */
        dwollaSignUp() {
            if (!this.didAgreeToDwollaTerms) {
                alert("Please agree to Dwolla's terms and privacy policy");
                return;
            }
            this.isLoading_Payment = true;
            this.$http.post("/api/Dwolla/CreatePayer", this.dwollaSignUpInfo).then(() => {
                window.location.reload();
            }, (httpResponse) => {
                this.isLoading_Payment = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    alert(httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Begin the Dwolla IAV (instant account verification) process
         */
        dwollaStartIAV() {
            this.shouldShowDwollaAddAccountModal = true;
            this.shouldShowDwollaModalClose = false;
            this.isDwollaIavDone = false;
            this.isLoadingDwolla = true;
            const startIav = (iavToken) => {
                dwolla.configure(Ally.AppConfigInfo.dwollaEnvironmentName);
                dwolla.iav.start(iavToken, {
                    container: 'dwolla-iav-container',
                    stylesheets: [
                        'https://fonts.googleapis.com/css?family=Lato&subset=latin,latin-ext'
                    ],
                    microDeposits: true,
                    fallbackToMicroDeposits: true
                }, (err, res) => {
                    //console.log( 'Error: ' + JSON.stringify( err ) + ' -- Response: ' + JSON.stringify( res ) );
                    if (res && res._links && res._links["funding-source"] && res._links["funding-source"].href) {
                        const fundingSourceUri = res._links["funding-source"].href;
                        // Tell the server
                        this.$http.put("/api/Dwolla/SetUserFundingSourceUri", { fundingSourceUri }).then(() => {
                            this.isDwollaIavDone = true;
                        }, (httpResponse) => {
                            this.isLoadingDwolla = false;
                            this.shouldShowDwollaModalClose = true;
                            alert("Failed to complete sign-up: " + httpResponse.data.exceptionMessage);
                        });
                    }
                });
            };
            this.$http.get("/api/Dwolla/UserIavToken").then((httpResponse) => {
                this.isLoadingDwolla = false;
                window.setTimeout(() => startIav(httpResponse.data.iavToken), 150);
            }, (httpResponse) => {
                this.isLoadingDwolla = false;
                alert("Failed to start IAV: " + httpResponse.data.exceptionMessage);
            });
        }
        hideDwollaAddAccountModal() {
            this.shouldShowDwollaAddAccountModal = false;
            if (this.isDwollaIavDone) {
                this.isLoading_Payment = true;
                window.location.reload();
            }
        }
        /**
         * Submit the user's Paragon bank account information
         */
        submitDwollaPayment() {
            //if( !confirm( "This will submit payment." ) )
            //    return;
            this.dwollaPaymentMessage = null;
            this.isLoading_Payment = true;
            this.$http.post("/api/Dwolla/MakePayment", this.paymentInfo).then(() => {
                this.isLoading_Payment = false;
                this.dwollaPaymentMessage = "Payment Successfully Processed";
                this.refreshHistoricPayments();
            }, (errorResponse) => {
                this.isLoading_Payment = false;
                this.dwollaPaymentMessage = "Payment failed: " + errorResponse.data.exceptionMessage;
            });
        }
        refreshHistoricPayments() {
            this.isLoading_Payment = true;
            this.$http.get("/api/MyProfile/RecentPayments").then((response) => {
                this.isLoading_Payment = false;
                this.historicPayments = response.data;
            }, (errorResponse) => {
                this.isLoading_Payment = false;
                console.log("Failed to refresh rescent payments: " + errorResponse.data.exceptionMessage);
            });
        }
        /**
         * Unlink and remove a user's Dwolla funding source
         */
        unlinkDwollaFundingSource() {
            if (!confirm("Are you sure you want to disconnect the bank account? You will no longer be able to make payments."))
                return;
            this.isLoading_Payment = true;
            this.$http.put("/api/Dwolla/DisconnectUserFundingSource", null).then(() => {
                window.location.reload();
            }, (httpResponse) => {
                this.isLoading_Payment = false;
                alert("Failed to disconnect account" + httpResponse.data.exceptionMessage);
            });
        }
        getDwollaFeeAmount(amount) {
            // dwollaFeePercent is in display percent, so 0.5 = 0.5% = 0.005 scalar
            // So we only need to divide by 100 to get our rounded fee
            let feeAmount = Math.ceil(amount * this.dwollaFeePercent) / 100;
            // Cap the fee at $5 for premium, $10 for free plan groups
            if (feeAmount > this.dwollaStripeMaxFee)
                feeAmount = this.dwollaStripeMaxFee;
            return feeAmount;
        }
        getStripeFeeAmount(amount) {
            if (typeof amount === "string")
                amount = parseFloat(amount);
            if (isNaN(amount))
                amount = 0;
            if (!amount)
                return 0;
            const stripeFeeInfo = Ally.HtmlUtil2.getStripeFeeInfo(amount, this.siteInfo.privateSiteInfo.payerPaysAchFee, this.siteInfo.privateSiteInfo.isPremiumPlanActive);
            //let feeAmount: number;
            //if( this.siteInfo.privateSiteInfo.payerPaysAchFee )
            //{
            //    // dwollaFeePercent is in display percent, so 0.8 = 0.8% = 0.008 scalar
            //    // So we only need to divide by 100 to get our rounded fee
            //    const StripeAchFeePercent = 0.008;
            //    let totalWithFeeAmount = Math.round( ( amount * 100 ) / ( 1 - StripeAchFeePercent ) ) / 100;
            //    feeAmount = totalWithFeeAmount - amount;
            //    // Cap the fee at $5 for premium, $10 for free plan groups
            //    const MaxFeeAmount = 5;
            //    const useMaxFee = feeAmount > MaxFeeAmount;
            //    if( useMaxFee )
            //    {
            //        feeAmount = MaxFeeAmount;
            //        totalWithFeeAmount = amount + feeAmount;
            //    }
            //    if( !this.siteInfo.privateSiteInfo.isPremiumPlanActive )
            //    {
            //        if( useMaxFee )
            //            totalWithFeeAmount = amount + ( MaxFeeAmount * 2 );
            //        else
            //            totalWithFeeAmount = Math.round( ( totalWithFeeAmount * 100 ) / ( 1 - StripeAchFeePercent ) ) / 100;
            //        feeAmount = totalWithFeeAmount - amount;
            //        // This can happen at $618.12-$620.61
            //        //console.log( "feeAmount", feeAmount );
            //        if( feeAmount > MaxFeeAmount * 2 )
            //            feeAmount = MaxFeeAmount * 2;
            //    }
            //}
            //// Otherwise the group is paying the fee so the resident doesn not pay extra fee
            //else
            //    feeAmount = 0;
            return stripeFeeInfo.payerFee;
        }
        /**
         * Occurs when the amount to pay changes
         */
        onPaymentAmountChange() {
            const dwollaFeeAmount = this.getDwollaFeeAmount(this.paymentInfo.amount);
            this.dwollaFeeAmountString = "$" + dwollaFeeAmount.toFixed(2);
            if (this.paymentInfo.amount) {
                const stripeFeeAmount = this.getStripeFeeAmount(this.paymentInfo.amount);
                if (!stripeFeeAmount)
                    this.stripeAchFeeAmountString = "No service fee";
                else
                    this.stripeAchFeeAmountString = "Stripe fee: $" + stripeFeeAmount.toFixed(2);
            }
            else
                this.stripeAchFeeAmountString = "";
        }
        /**
         * Occurs when the user clicks the button to upload their Dwolla identification document
         */
        uploadDwollaDoc() {
            this.isLoading_Payment = true;
            this.dwollaDocUploadMessage = null;
            const formData = new FormData();
            formData.append("DocumentFile", this.dwollaDocUploadFile);
            formData.append("DocumentType", this.dwollaDocUploadType);
            const postHeaders = {
                headers: { "Content-Type": undefined } // Need to remove this to avoid the JSON body assumption by the server
            };
            this.$http.post("/api/Dwolla/UploadCustomerDocument", formData, postHeaders).then(() => {
                this.isLoading_Payment = false;
                this.dwollaDocUploadFile = null;
                this.dwollaDocUploadMessage = "Your document has been successfully uploaded. You will be notified when it is reviewed.";
            }, (httpResponse) => {
                this.isLoading_Payment = false;
                alert("Failed to upload document: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user selects a file for upload to Dwolla
         */
        onDwollaDocSelected(event) {
            if (!event)
                this.dwollaDocUploadFile = null;
            else
                this.dwollaDocUploadFile = event.target.files[0];
        }
        /**
         * Occurs when the user clicks the button to withdraw their Dwolla balance
         */
        withdrawDwollaBalance() {
            this.isLoading_Payment = true;
            this.dwollaBalanceMessage = null;
            this.$http.get("/api/Dwolla/WithdrawDwollaBalance").then(() => {
                this.isLoading_Payment = false;
                this.dwollaBalanceMessage = "Balance withdraw successfully initiated. Expect the transfer to complete in 1-2 business days.";
            }, (httpResponse) => {
                this.isLoading_Payment = false;
                alert("Failed to initiate withdraw: " + httpResponse.data.exceptionMessage);
            });
        }
        submitDwollaMicroDepositAmounts() {
            this.isLoading_Payment = true;
            const postData = {
                amount1String: this.dwollaMicroDepositAmount1String,
                amount2String: this.dwollaMicroDepositAmount2String,
                isForGroup: false
            };
            this.$http.post("/api/Dwolla/VerifyMicroDeposit", postData).then(() => {
                window.location.reload();
            }, (httpResponse) => {
                this.isLoading_Payment = false;
                alert("Failed to verify: " + httpResponse.data.exceptionMessage);
            });
        }
        reloadPage() {
            this.isLoading_Payment = true;
            window.location.reload();
        }
        enableDwollaAutoPay() {
            this.isLoading_Payment = true;
            this.$http.put("/api/Dwolla/EnableAutoPay/" + encodeURIComponent(this.assessmentAmount.toString()), null).then(() => {
                window.location.reload();
            }, (httpResponse) => {
                this.isLoading_Payment = false;
                alert("Failed to enable Dwolla auto-pay: " + httpResponse.data.exceptionMessage);
            });
        }
        disableDwollaAutoPay() {
            this.isLoading_Payment = true;
            this.$http.put("/api/Dwolla/DisableAutoPay", null).then(() => {
                window.location.reload();
            }, (httpResponse) => {
                this.isLoading_Payment = false;
                alert("Failed to disable Dwolla auto-pay: " + httpResponse.data.exceptionMessage);
            });
        }
        //hookUpStripeCheckout()
        //{
        //    const style = {
        //        base: {
        //            color: "#32325d",
        //            fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        //            fontSmoothing: "antialiased",
        //            fontSize: "16px",
        //            "::placeholder": {
        //                color: "#aab7c4"
        //            }
        //        },
        //        invalid: {
        //            color: "#fa755a",
        //            iconColor: "#fa755a"
        //        }
        //    };
        //    const stripeCheckoutOptions = {
        //        mode: 'payment',
        //        amount: 15 * 100,
        //        currency: 'usd',
        //        // Fully customizable with appearance API.
        //        appearance: {}
        //    };
        //    this.stripeElements = this.stripeApi.elements( stripeCheckoutOptions );
        //    this.stripeCardElement = this.stripeElements.create( "payment" );
        //    this.stripeCardElement.mount( "#stripe-card-element" );
        //    const onCardChange = ( event: any ) =>
        //    {
        //        if( event.error )
        //            this.showStripeError( event.error.message );
        //        else
        //            this.showStripeError( null );
        //    }
        //    this.stripeCardElement.on( 'change', onCardChange );
        //}
        showStripeError(errorMessage) {
            const displayError = document.getElementById('card-errors');
            if (HtmlUtil.isNullOrWhitespace(errorMessage))
                displayError.textContent = null; //'Unknown Error';
            else
                displayError.textContent = errorMessage;
        }
        async startStripeCardPayment() {
            this.stripeElements.update({ amount: Math.floor(this.paymentInfo.amount * 100) });
            // Trigger form validation and wallet collection
            this.stripeElements.submit().then(() => {
                this.isLoading_Payment = true;
                this.$http.post("/api/StripePayments/StartPaymentIntent", this.paymentInfo).then((response) => {
                    // Confirm the PaymentIntent using the details collected by the Payment Element
                    this.stripeApi.confirmPayment({
                        elements: this.stripeElements,
                        clientSecret: response.data,
                        confirmParams: {
                            return_url: this.siteInfo.publicSiteInfo.baseUrl + "/#!/Home",
                        },
                    });
                }, (errorResponse) => {
                    this.isLoading_Payment = false;
                    console.log("Failed to SignUpPrefill: " + errorResponse.data.exceptionMessage);
                    alert("Failed to start payment: " + errorResponse.data.exceptionMessage);
                });
            }, (error) => {
                console.log("Stripe error", error);
            });
            //this.stripeElements.submit();
            //if( submitError )
            //{
            //    this.showStripeError( submitError.message );
            //    return;
            //}
        }
        /**
         * Complete the Stripe-Plaid ACH-linking flow
         */
        completePlaidAchConnection(accessToken, accountId) {
            this.isLoading_Payment = true;
            const postData = {
                accessToken,
                selectedAccountIds: [accountId]
            };
            this.$http.post("/api/PlaidMember/ProcessUserStripeAccessToken", postData).then(() => {
                this.isLoading_Payment = false;
                console.log("Account successfully linked, reloading...");
                window.location.reload();
            }, (httpResponse) => {
                this.isLoading_Payment = false;
                alert("Failed to link account: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Start the Stripe-Plaid ACH-linking flow
         */
        startPlaidAchConnection() {
            this.isLoading_Payment = true;
            this.$http.get("/api/PlaidMember/StripeLinkToken").then((httpResponse) => {
                if (!httpResponse.data) {
                    this.isLoading_Payment = false;
                    alert("Failed to start Plaid connection. Please contact support.");
                    return;
                }
                const plaidConfig = {
                    token: httpResponse.data,
                    onSuccess: (public_token, metadata) => {
                        //console.log( "PlaidMember StripeLinkToken onSuccess", metadata );
                        this.completePlaidAchConnection(public_token, metadata.account_id);
                    },
                    onLoad: () => {
                        // Need to wrap this in a $scope.using because th Plaid.create call is invoked by vanilla JS, not AngularJS
                        this.$scope.$apply(() => {
                            this.isLoading_Payment = false;
                        });
                    },
                    onExit: (err, metadata) => {
                        //console.log( "update onExit.err", err, metadata );
                        // Need to wrap this in a $scope.using because th Plaid.create call is invoked by vanilla JS, not AngularJS
                        this.$scope.$apply(() => {
                            this.isLoading_Payment = false;
                        });
                    },
                    onEvent: (eventName, metadata) => {
                        console.log("update onEvent.eventName", eventName, metadata);
                    },
                    receivedRedirectUri: null,
                };
                const plaidHandler = Plaid.create(plaidConfig);
                plaidHandler.open();
            }, (httpResponse) => {
                this.isLoading_Payment = false;
                alert("Failed to start Plaid connection: " + httpResponse.data.exceptionMessage);
            });
        }
        makeStripeAchPayment() {
            this.isLoading_Payment = true;
            this.$http.post("/api/StripePayments/StartPaymentIntent", this.paymentInfo).then((response) => {
                const intentClientSecret = response.data;
                this.stripeApi.confirmUsBankAccountPayment(intentClientSecret, {
                    payment_method: this.siteInfo.userInfo.stripeBankAccountId,
                    //on_behalf_of: this.siteInfo.privateSiteInfo.stripeConnectAccountId
                }).then((result) => {
                    // Need to wrap this in a $scope.using because the confirmUsBankAccountPayment event is invoked by vanilla JS, not AngularJS
                    this.$scope.$apply(() => {
                        this.isLoading_Payment = false;
                        this.stripePaymentSucceeded = true;
                    });
                    if (result.error) {
                        // Inform the customer that there was an error.
                        console.log(result.error.message);
                    }
                    else {
                        //TODO Success
                        // Handle next step based on PaymentIntent's status.
                        console.log("PaymentIntent ID: " + result.paymentIntent.id);
                        console.log("PaymentIntent status: " + result.paymentIntent.status);
                    }
                }, (error) => {
                    // Need to wrap this in a $scope.using because th confirmUsBankAccountPayment event is invoked by vanilla JS, not Angular
                    this.$scope.$apply(() => {
                        this.isLoading_Payment = false;
                    });
                    console.log("Stripe Failed", error);
                    alert("Stripe Failed: " + error);
                });
            }, (errorResponse) => {
                this.isLoading_Payment = false;
                console.log("Failed to SignUpPrefill: " + errorResponse.data.exceptionMessage);
                alert("Failed to start payment: " + errorResponse.data.exceptionMessage);
            });
        }
        /**
         * Unlink and remove a user's Stripe funding source
         */
        unlinkStripeFundingSource() {
            if (!confirm("Are you sure you want to disconnect the bank account? You will no longer be able to make payments."))
                return;
            this.isLoading_Payment = true;
            this.$http.delete("/api/StripePayments/RemoveBankAccount").then(() => {
                window.location.reload();
            }, (httpResponse) => {
                this.isLoading_Payment = false;
                alert("Failed to disconnect account: " + httpResponse.data.exceptionMessage);
            });
        }
        setupStripeAutoPay() {
            this.isLoading_Payment = true;
            this.$http.put("/api/StripePayments/SetupUserAutoPay", null).then(() => {
                this.isLoading_Payment = false;
                this.userHasStripeAutoPay = true;
            }, (httpResponse) => {
                this.isLoading_Payment = false;
                alert("Failed to setup auto-pay: " + httpResponse.data.exceptionMessage);
            });
        }
        cancelStripeAutoPay() {
            this.isLoading_Payment = true;
            this.$http.delete("/api/StripePayments/CancelUserAutoPay").then(() => {
                this.isLoading_Payment = false;
                this.userHasStripeAutoPay = false;
            }, (httpResponse) => {
                this.isLoading_Payment = false;
                alert("Failed to setup auto-pay: " + httpResponse.data.exceptionMessage);
            });
        }
    }
    AssessmentPaymentFormController.$inject = ["$http", "SiteInfo", "$rootScope", "$sce", "$timeout", "$q", "$scope"];
    Ally.AssessmentPaymentFormController = AssessmentPaymentFormController;
    class CheckoutRequest {
    }
    class DwollaAccountStatusInfo {
    }
    class MakePaymentRequest {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("assessmentPaymentForm", {
    templateUrl: "/ngApp/common/assessment-payment-form.html",
    controller: Ally.AssessmentPaymentFormController
});
class CreateDwollaUser {
}
class ParagonPayerSignUpInfo {
    constructor() {
        this.billingAddress = new Ally.FullAddress();
        this.checkType = "PERSONAL";
        this.accountType = "CHECKING";
    }
}
class ParagonPaymentRequest {
}

var Ally;
(function (Ally) {
    /**
     * The controller for the page to track group spending
     */
    class CustomPageViewController {
        /**
        * The constructor for the class
        */
        constructor($http, siteInfo, $sce, $routeParams) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$sce = $sce;
            this.$routeParams = $routeParams;
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isLoading = true;
            this.$http.get("/api/PublicCustomPage/View/" + this.$routeParams.slug, { cache: true }).then((httpResponse) => {
                this.isLoading = false;
                this.customPage = httpResponse.data;
                this.markupHtml = this.$sce.trustAsHtml(this.customPage.markupHtml);
                // Make <a> links open in new tabs
                setTimeout(() => Ally.RichTextHelper.makeLinksOpenNewTab("custom-page-content"), 500);
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to load page, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
            });
        }
    }
    CustomPageViewController.$inject = ["$http", "SiteInfo", "$sce", "$routeParams"];
    Ally.CustomPageViewController = CustomPageViewController;
    class CustomPage {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("customPageView", {
    templateUrl: "/ngApp/common/custom-page-view.html",
    controller: Ally.CustomPageViewController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the page to track group spending
     */
    class DateRangePickerController {
        /**
        * The constructor for the class
        */
        constructor(appCacheService, $scope, $timeout) {
            this.appCacheService = appCacheService;
            this.$scope = $scope;
            this.$timeout = $timeout;
            this.filterPresetDateRange = "custom";
            this.lastChangeStart = null;
            this.lastChangeEnd = null;
            this.shouldSuppressCustom = false;
            this.thisYearLabel = new Date().getFullYear().toString();
            this.lastYearLabel = (new Date().getFullYear() - 1).toString();
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            //console.log( "In dateRangePicker.onInit", this.startDate, this.endDate );
            // Clear the time portion
            if (this.startDate)
                this.startDate = moment(this.startDate).startOf("day").toDate();
            if (this.endDate)
                this.endDate = moment(this.endDate).startOf("day").toDate();
            if (!this.startDate && !this.endDate)
                this.selectPresetDateRange(true);
            this.$scope.$watch("$ctrl.startDate", (newValue, oldValue) => {
                if (!newValue || newValue === oldValue || this.shouldSuppressCustom)
                    return;
                this.filterPresetDateRange = "custom";
            });
            this.$scope.$watch("$ctrl.endDate", (newValue, oldValue) => {
                if (!newValue || newValue === oldValue || this.shouldSuppressCustom)
                    return;
                this.filterPresetDateRange = "custom";
            });
        }
        selectPresetDateRange(suppressRefresh = false) {
            //console.log( "selectPresetDateRange", this.filterPresetDateRange );
            if (this.filterPresetDateRange === "last30days") {
                this.startDate = moment().subtract(30, 'days').toDate();
                this.endDate = moment().toDate();
            }
            else if (this.filterPresetDateRange === "thisMonth") {
                this.startDate = moment().startOf('month').toDate();
                this.endDate = moment().endOf('month').toDate();
            }
            else if (this.filterPresetDateRange === "lastMonth") {
                const lastMonth = moment().subtract(1, 'months');
                this.startDate = lastMonth.startOf('month').toDate();
                this.endDate = lastMonth.endOf('month').toDate();
            }
            else if (this.filterPresetDateRange === "thisYear") {
                this.startDate = moment().startOf('year').toDate();
                this.endDate = moment().endOf('year').toDate();
            }
            else if (this.filterPresetDateRange === "lastYear") {
                const lastYear = moment().subtract(1, 'years');
                this.startDate = lastYear.startOf('year').toDate();
                this.endDate = lastYear.endOf('year').toDate();
            }
            else if (this.filterPresetDateRange === "oneYear") {
                this.startDate = moment().subtract(1, 'years').toDate();
                this.endDate = moment().toDate();
            }
            // Remove the time portion
            this.startDate = moment(this.startDate).startOf("day").toDate();
            this.endDate = moment(this.endDate).startOf("day").toDate();
            // To prevent the dumb $watch from clearing our preselect label
            this.shouldSuppressCustom = true;
            window.setTimeout(() => this.shouldSuppressCustom = false, 25);
            if (!suppressRefresh && this.onChange)
                window.setTimeout(() => this.onChange(), 50); // Delay a bit to let Angular's digests run on the bound dates
        }
        onInternalChange(suppressChangeEvent = false) {
            //console.log( "In dateRangePicker.onInternalChange", fieldName, this.startDate, this.endDate );
            // Only call the change function if both strings are valid dates
            if (typeof this.startDate === "string") {
                if (this.startDate.length !== 10)
                    return;
                this.startDate = moment(this.startDate, "MM-DD-YYYY").toDate();
            }
            if (typeof this.endDate === "string") {
                if (this.endDate.length !== 10)
                    return;
                this.endDate = moment(this.endDate, "MM-DD-YYYY").toDate();
            }
            const didChangeOccur = !this.lastChangeStart
                || !this.lastChangeEnd
                || this.startDate.getTime() !== this.lastChangeStart.getTime()
                || this.endDate.getTime() !== this.lastChangeEnd.getTime();
            if (didChangeOccur && !suppressChangeEvent) {
                // Delay just a touch to let the model update
                this.$timeout(() => {
                    //console.log( "Call dateRangePicker.onChange", this.startDate.getTime(), this.lastChangeStart && this.lastChangeStart.getTime() || null, this.endDate.getTime(), this.lastChangeEnd && this.lastChangeEnd.getTime() || null );
                    if (this.onChange)
                        this.onChange();
                    this.lastChangeStart = this.startDate;
                    this.lastChangeEnd = this.endDate;
                }, 10);
            }
        }
    }
    DateRangePickerController.$inject = ["appCacheService", "$scope", "$timeout"];
    Ally.DateRangePickerController = DateRangePickerController;
})(Ally || (Ally = {}));
CA.angularApp.component("dateRangePicker", {
    bindings: {
        startDate: "=",
        endDate: "=",
        onChange: "&"
    },
    templateUrl: "/ngApp/common/date-range-picker.html",
    controller: Ally.DateRangePickerController
});

var Ally;
(function (Ally) {
    class DocumentTreeFile {
    }
    Ally.DocumentTreeFile = DocumentTreeFile;
    class DocLinkInfo {
    }
    Ally.DocLinkInfo = DocLinkInfo;
    class DocumentDirectory {
        getSubDirectoryByName(dirName) {
            if (!this.subdirectories)
                return null;
            for (let dirIndex = 0; dirIndex < this.subdirectories.length; ++dirIndex) {
                if (this.subdirectories[dirIndex].name === dirName)
                    return this.subdirectories[dirIndex];
            }
            return null;
        }
    }
    Ally.DocumentDirectory = DocumentDirectory;
    /**
     * The controller for the documents widget that lets group view, upload, and modify documents
     */
    class DocumentsController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope, $cacheFactory, $scope, siteInfo, fellowResidents, $location) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.$cacheFactory = $cacheFactory;
            this.$scope = $scope;
            this.siteInfo = siteInfo;
            this.fellowResidents = fellowResidents;
            this.$location = $location;
            this.isLoading = false;
            this.filesSortDescend = false;
            this.title = "Documents";
            this.getDocsUri = "/api/ManageDocuments";
            this.showPopUpWarning = false;
            this.shouldShowSubdirectories = true;
            this.docsHttpCache = this.$cacheFactory.get("docs-http-cache") || this.$cacheFactory("docs-http-cache");
            this.fileSortType = window.localStorage[DocumentsController.LocalStorageKey_SortType];
            if (!this.fileSortType)
                this.fileSortType = "title";
            this.filesSortDescend = window.localStorage[DocumentsController.LocalStorageKey_SortDirection] === "true";
            this.fileSearch = {
                all: ""
            };
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            this.canManage = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager;
            // Make sure committee members can manage their data
            if (this.committee && !this.canManage)
                this.fellowResidents.isCommitteeMember(this.committee.committeeId).then(isCommitteeMember => this.canManage = isCommitteeMember);
            this.apiAuthToken = this.$rootScope.authToken;
            this.Refresh();
            const hookUpFileUpload = () => {
                const uploader = $('#JQDocsFileUploader');
                uploader.fileupload({
                    autoUpload: true,
                    pasteZone: null,
                    add: (e, data) => {
                        //var scopeElement = document.getElementById( 'documents-area' );
                        //var scope = angular.element( scopeElement ).scope();
                        //this.$scope.$apply( () => this.isLoading = false );
                        const MaxFileSize = 1024 * 1024 * 50;
                        if (data.files[0].size > MaxFileSize) {
                            const fileMB = Math.round(data.files[0].size / (1024 * 1024)) + 1;
                            alert(`The selected file is too large (${fileMB}MB). The maximum file size allowed is 50MB.`);
                            return;
                        }
                        const dirPath = this.getSelectedDirectoryPath();
                        $("#FileUploadProgressContainer").show();
                        data.url = "api/DocumentUpload?dirPath=" + encodeURIComponent(dirPath);
                        if (this.siteInfo.publicSiteInfo.baseApiUrl)
                            data.url = this.siteInfo.publicSiteInfo.baseApiUrl + "DocumentUpload?dirPath=" + encodeURIComponent(dirPath);
                        const xhr = data.submit();
                        xhr.done(() => {
                            this.docsHttpCache.removeAll();
                            $("#FileUploadProgressContainer").hide();
                            this.Refresh();
                        });
                        xhr.error((jqXHR) => {
                            alert("Upload failed: " + jqXHR.responseJSON.exceptionMessage);
                            //console.log( "fail", jqXHR, textStatus, errorThrown );
                        });
                    },
                    beforeSend: (xhr) => {
                        if (this.siteInfo.publicSiteInfo.baseApiUrl)
                            xhr.setRequestHeader("Authorization", "Bearer " + this.apiAuthToken);
                        else
                            xhr.setRequestHeader("ApiAuthToken", this.apiAuthToken);
                    },
                    progressall: (e, data) => {
                        const progress = parseInt((data.loaded / data.total * 100).toString(), 10);
                        $('#FileUploadProgressBar').css('width', progress + '%');
                        if (progress === 100)
                            $("#FileUploadProgressLabel").text("Finalizing Upload...");
                        else
                            $("#FileUploadProgressLabel").text(progress + "%");
                    },
                    fail: (e, xhr) => {
                        $("#FileUploadProgressContainer").hide();
                        alert("Failed to upload document");
                        console.log("Failed to upload document", xhr);
                    }
                });
            };
            setTimeout(hookUpFileUpload, 100);
            if (this.committee)
                this.title = "Committee Documents";
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Get the name of the selected directory. If it is a sub-directory then include the parent
        // name.
        ///////////////////////////////////////////////////////////////////////////////////////////////
        getSelectedDirectoryPath() {
            return this.getDirectoryFullPath(this.selectedDirectory);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Open a document via double-click
        ///////////////////////////////////////////////////////////////////////////////////////////////
        viewDoc(curFile, isForDownload) {
            this.isLoading = true;
            this.showPopUpWarning = false;
            let viewDocWindow;
            // Force download of RTFs. Eventually we'll make this a allow-list of extensions that
            // browsers can display directly
            if (this.getDisplayExtension(curFile) === ".rtf")
                isForDownload = true;
            // Increment the local view count for fast feedback
            ++curFile.numViews;
            // If we're viewing the document in the browser, test if pop-ups are blocked
            if (!isForDownload) {
                viewDocWindow = window.open('', '_blank');
                const wasPopUpBlocked = !viewDocWindow || viewDocWindow.closed || typeof viewDocWindow.closed === "undefined";
                if (wasPopUpBlocked) {
                    alert(`Looks like your browser may be blocking pop-ups which are required to view documents. Please see the right of the address bar or your browser settings to enable pop-ups for ${AppConfig.appName}.`);
                    this.showPopUpWarning = true;
                }
                else
                    viewDocWindow.document.write('Loading document... (If the document cannot be viewed directly in your browser, it will be downloaded automatically)');
            }
            const viewUri = "/api/DocumentLink/" + curFile.docId;
            this.$http.get(viewUri).then((response) => {
                this.isLoading = false;
                let fileUri = `${curFile.url}?vid=${encodeURIComponent(response.data.vid)}`;
                if (HtmlUtil.startsWith(fileUri, "/api/"))
                    fileUri = fileUri.substr("/api/".length);
                fileUri = this.siteInfo.publicSiteInfo.baseApiUrl + fileUri;
                if (isForDownload) {
                    // Create a link and click it
                    const link = document.createElement('a');
                    link.setAttribute("type", "hidden"); // make it hidden if needed
                    link.href = fileUri + "&dl=" + encodeURIComponent(curFile.fileName);
                    link.download = curFile.fileName;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                }
                else {
                    // Android doesn't open PDFs in the browser, so let Google Docs do it
                    if (Ally.HtmlUtil2.isAndroid())
                        viewDocWindow.location.href = "http://docs.google.com/gview?embedded=true&url=" + encodeURIComponent(fileUri);
                    else
                        viewDocWindow.location.href = fileUri;
                }
            }, (response) => {
                this.isLoading = false;
                alert("Failed to open document: " + response.data.exceptionMessage);
            });
        }
        startZipGenDownload() {
            let refreshGenStatus = null;
            let numRefreshes = 0;
            refreshGenStatus = () => {
                this.$http.get("/api/DocumentUpload/GetZipGenStatus?vid=" + this.generatingZipId).then((response) => {
                    ++numRefreshes;
                    if (response.data.totalNumFiles === 0)
                        this.generatingZipStatus = "Still waiting...";
                    else
                        this.generatingZipStatus = `${response.data.numFilesProcessed} of ${response.data.totalNumFiles} files processed`;
                    if (response.data.isReady) {
                        this.generatingZipStatus = "ready";
                        this.downloadZipUrl = this.siteInfo.publicSiteInfo.baseApiUrl + "DocumentUpload/DownloadZipGen?vid=" + this.generatingZipId;
                    }
                    else
                        window.setTimeout(() => refreshGenStatus(), 750);
                }, (response) => {
                    this.generatingZipStatus = null;
                    alert("Zip file generation failed: " + response.data.exceptionMessage);
                });
            };
            this.generatingZipStatus = "Starting...";
            let getUri = "/api/DocumentUpload/StartFullZipGeneration";
            if (this.committee)
                getUri += "?committeeId=" + this.committee.committeeId;
            this.$http.get(getUri).then((response) => {
                this.generatingZipId = response.data.statusId;
                this.generatingZipStatus = "Waiting for update...";
                window.setTimeout(() => refreshGenStatus(), 1250);
            }, (response) => {
                this.generatingZipStatus = null;
                alert("Failed to start zip generation: " + response.data.exceptionMessage);
            });
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Get the name of the selected directory. If it is a sub-directory then include the parent
        // name.
        ///////////////////////////////////////////////////////////////////////////////////////////////
        getDirectoryFullPath(dir) {
            let curPath = dir.name;
            let parentDir = dir.parentDirectory;
            while (parentDir) {
                curPath = parentDir.name + "/" + curPath;
                parentDir = parentDir.parentDirectory;
            }
            if (this.committee)
                curPath = DocumentsController.DirName_Committees + "/" + this.committee.committeeId + "/" + curPath;
            return curPath;
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Find a directory object by name
        ///////////////////////////////////////////////////////////////////////////////////////////////
        FindDirectoryByPath(dirPath) {
            if (!this.documentTree)
                return;
            // Remove the committee prefix if there is one
            if (this.committee && HtmlUtil.startsWith(dirPath, DocumentsController.DirName_Committees)) {
                dirPath = dirPath.substr(DocumentsController.DirName_Committees.length + 1);
                const lastSlashIndex = dirPath.indexOf('/');
                if (lastSlashIndex !== -1)
                    dirPath = dirPath.substr(lastSlashIndex + 1);
            }
            // Split on slashes
            const dirPathParts = dirPath.split("/");
            let curDir = this.documentTree;
            for (let i = 0; i < dirPathParts.length; ++i) {
                curDir = curDir.getSubDirectoryByName(dirPathParts[i]);
                if (!curDir)
                    break;
            }
            return curDir;
        }
        updateFileFilter() {
            const lowerFilter = (this.fileSearch.all || '').toLowerCase();
            const filterSearchFiles = (file) => {
                return (file.localFilePath || '').toLowerCase().indexOf(lowerFilter) !== -1
                    || (file.uploadDateString || '').toLowerCase().indexOf(lowerFilter) !== -1
                    || (file.uploaderFullName || '').toLowerCase().indexOf(lowerFilter) !== -1;
            };
            this.searchFileList = _.filter(this.fullSearchFileList, filterSearchFiles);
            setTimeout(() => {
                // Force redraw of the document. Not sure why, but the file list disappears on Chrome
                const element = document.getElementById("documents-area");
                const disp = element.style.display;
                element.style.display = 'none';
                const trick = element.offsetHeight;
                element.style.display = disp;
            }, 50);
        }
        // Make it so the user can drag and drop files between folders
        hookUpFileDragging() {
            // If the user can't manage the association then do nothing
            if (!this.canManage)
                return;
            setTimeout(() => {
                // Make the folders accept dropped files
                const droppables = $(".droppable");
                droppables.droppable({
                    drop: (event, ui) => {
                        const selectedDirectoryPath = this.getSelectedDirectoryPath();
                        const uiDraggable = $(ui.draggable);
                        uiDraggable.draggable("option", "revert", "false");
                        const destFolderName = $(event.target).attr("data-folder-path").trim();
                        this.$scope.$apply(() => {
                            // Display the loading image
                            this.isLoading = true;
                            const fileAction = {
                                relativeS3Path: this.selectedFile.relativeS3Path,
                                action: "move",
                                newFileName: "",
                                sourceFolderPath: selectedDirectoryPath,
                                destinationFolderPath: destFolderName
                            };
                            this.selectedFile = null;
                            // Tell the server
                            this.$http.put("/api/ManageDocuments/MoveFile", fileAction).then(() => {
                                this.isLoading = false;
                                this.docsHttpCache.removeAll();
                                this.Refresh();
                                //innerThis.documentTree = httpResponse.data;
                                //innerThis.documentTree.getSubDirectoryByName = DocumentDirectory.prototype.getSubDirectoryByName;
                                //// Hook up parent directories
                                //innerThis.documentTree.subdirectories.forEach(( dir ) =>
                                //{
                                //    innerThis.hookupParentDirs( dir );
                                //} );
                                //innerThis.hookUpFileDragging();
                                //// Find the directory we had selected
                                //innerThis.selectedDirectory = innerThis.FindDirectoryByPath( selectedDirectoryPath );
                                //innerThis.SortFiles();
                            }, (data) => {
                                this.isLoading = false;
                                const message = data.exceptionMessage || data.message || data;
                                alert("Failed to move file: " + message);
                            });
                        });
                    },
                    hoverClass: "Document_Folder_DropHover"
                });
                // Allow the files to be dragged
                const draggables = $(".draggable");
                draggables.draggable({
                    distance: 10,
                    revert: true,
                    helper: "clone",
                    opacity: 1,
                    containment: "document",
                    appendTo: "body",
                    start: (event) => {
                        // Get the index of the file being dragged (ID is formatted like "File_12")
                        const fileIndexString = $(event.target).attr("id").substring("File_".length);
                        const fileIndex = parseInt(fileIndexString);
                        this.$scope.$apply(() => {
                            const fileInfo = this.selectedDirectory.files[fileIndex];
                            this.selectedFile = fileInfo;
                        });
                    }
                });
            }, 250);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when a directory gets clicked. I made this an inline expression, but the model did
        // not refresh
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onDirectoryClicked(dir) {
            // If the user clicked on the currently-selected directory, then toggle the subdirectories
            if (this.selectedDirectory === dir)
                this.shouldShowSubdirectories = !this.shouldShowSubdirectories;
            else
                this.shouldShowSubdirectories = true;
            this.selectedDirectory = dir;
            this.selectedFile = null;
            this.fileSearch.all = null;
            this.hookUpFileDragging();
            this.SortFiles();
            if (this.committee) {
                const committeePrefix = DocumentsController.DirName_Committees + "/" + this.committee.committeeId + "/";
                this.$location.search("directory", dir.fullDirectoryPath.substring(committeePrefix.length));
            }
            else
                this.$location.search("directory", dir.fullDirectoryPath);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to create a directory within the root directory
        ///////////////////////////////////////////////////////////////////////////////////////////////
        createDirectory() {
            this.createUnderParentDirName = null;
            if (this.committee)
                this.createUnderParentDirName = DocumentsController.DirName_Committees + "/" + this.committee.committeeId;
            this.shouldShowCreateFolderModal = true;
            setTimeout(() => $('#CreateDirectoryNameTextBox').focus(), 50);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to create a directory within the current directory
        ///////////////////////////////////////////////////////////////////////////////////////////////
        CreateSubDirectory() {
            this.createUnderParentDirName = this.selectedDirectory.fullDirectoryPath;
            if (this.committee)
                this.createUnderParentDirName = DocumentsController.DirName_Committees + "/" + this.committee.committeeId + "/" + this.createUnderParentDirName;
            this.shouldShowCreateFolderModal = true;
            setTimeout(() => $('#CreateDirectoryNameTextBox').focus(), 50);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to sort the files
        ///////////////////////////////////////////////////////////////////////////////////////////////
        SetFileSortType(sortType) {
            // If we're already sorting by this property, flip the order
            if (this.fileSortType === sortType)
                this.filesSortDescend = !this.filesSortDescend;
            else
                this.filesSortDescend = false;
            this.fileSortType = sortType;
            window.localStorage[DocumentsController.LocalStorageKey_SortType] = this.fileSortType;
            window.localStorage[DocumentsController.LocalStorageKey_SortDirection] = this.filesSortDescend;
            this.SortFiles();
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Sort the visible files according to our selected method
        ///////////////////////////////////////////////////////////////////////////////////////////////
        SortFiles() {
            if (!this.selectedDirectory || !this.selectedDirectory.files)
                return;
            if (this.fileSortType === "title" || this.fileSortType === "uploadDate")
                this.selectedDirectory.files = _.sortBy(this.selectedDirectory.files, this.fileSortType);
            if (this.filesSortDescend)
                this.selectedDirectory.files.reverse();
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to create a new directory
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onCreateDirectoryClicked() {
            // Display the loading image
            this.isLoading = true;
            let putUri = "/api/ManageDocuments/CreateDirectory?folderName=" + encodeURIComponent(this.newDirectoryName);
            // If we're creating a subdirectory
            putUri += "&parentFolderPath=";
            if (this.createUnderParentDirName)
                putUri += encodeURIComponent(this.createUnderParentDirName);
            this.$http.put(putUri, null).then(() => {
                this.docsHttpCache.removeAll();
                this.newDirectoryName = "";
                this.Refresh();
                this.shouldShowCreateFolderModal = false;
            }, (response) => {
                alert("Failed to create the folder: " + response.data.exceptionMessage);
                this.isLoading = false;
            });
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the cancel button when creating a new directory
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onCancelAddDirectory() {
            this.shouldShowCreateFolderModal = false;
            this.newDirectoryName = "";
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when a file gets clicked
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onFileClicked(file) {
            this.selectedFile = file;
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to rename a document
        ///////////////////////////////////////////////////////////////////////////////////////////////
        RenameDocument(document) {
            if (!document)
                return;
            let newTitle = prompt("Enter the new name for the file", document.title);
            if (newTitle === null)
                return;
            if (newTitle.length > 64)
                newTitle = newTitle.substr(0, 64);
            // Display the loading image
            this.isLoading = true;
            const fileAction = {
                relativeS3Path: document.relativeS3Path,
                action: "rename",
                newTitle: newTitle,
                sourceFolderPath: this.getSelectedDirectoryPath(),
                destinationFolderPath: ""
            };
            this.$http.put("/api/ManageDocuments/RenameFile", fileAction).then(() => {
                this.docsHttpCache.removeAll();
                this.Refresh();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to rename: " + response.data.exceptionMessage);
                this.Refresh();
            });
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to delete a document
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DeleteDocument(document) {
            if (confirm("Are you sure you want to delete this file?")) {
                // Display the loading image
                this.isLoading = true;
                this.$http.delete("/api/ManageDocuments?docPath=" + document.relativeS3Path).then(() => {
                    this.docsHttpCache.removeAll();
                    this.Refresh();
                }, (response) => {
                    this.isLoading = false;
                    alert("Failed to delete file: " + response.data.exceptionMessage);
                    this.Refresh();
                });
            }
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to edit a directory name
        ///////////////////////////////////////////////////////////////////////////////////////////////
        RenameSelectedDirectory() {
            if (!this.selectedDirectory)
                return;
            let newDirectoryName = prompt("Enter the new name for the directory", this.selectedDirectory.name);
            if (newDirectoryName === null)
                return;
            if (newDirectoryName.length > 32)
                newDirectoryName = newDirectoryName.substr(0, 32);
            // Display the loading image
            this.isLoading = true;
            const oldDirectoryPath = encodeURIComponent(this.getSelectedDirectoryPath());
            const newDirectoryNameQS = encodeURIComponent(newDirectoryName);
            this.$http.put("/api/ManageDocuments/RenameDirectory?directoryPath=" + oldDirectoryPath + "&newDirectoryName=" + newDirectoryNameQS, null).then(() => {
                this.docsHttpCache.removeAll();
                // Update the selected directory name so we can reselect it
                this.selectedDirectory.name = newDirectoryName;
                this.Refresh();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to rename directory: " + response.data.exceptionMessage);
            });
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to delete a document
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DeleteSelectedDirectory() {
            if (!this.selectedDirectory)
                return;
            if (this.selectedDirectory.files.length > 0) {
                alert("You can not delete a folder that contains files. Please delete or move all files from the folder.");
                return;
            }
            if (confirm("Are you sure you want to delete this folder?")) {
                // Display the loading image
                this.isLoading = true;
                const dirPath = this.getSelectedDirectoryPath();
                this.$http.delete("/api/ManageDocuments/DeleteDirectory?directoryPath=" + encodeURIComponent(dirPath)).then(() => {
                    this.docsHttpCache.removeAll();
                    this.Refresh();
                }, (httpResult) => {
                    this.isLoading = false;
                    alert("Failed to delete the folder: " + httpResult.data.exceptionMessage);
                });
            }
        }
        getFileIcon(fileName) {
            return Ally.HtmlUtil2.getFileIcon(fileName);
        }
        isGenericIcon(file) {
            const iconFilePath = Ally.HtmlUtil2.getFileIcon(file.fileName);
            const GenericIconPath = "/assets/images/FileIcons/GenericFileIcon.png";
            return iconFilePath === GenericIconPath;
        }
        getDisplayExtension(file) {
            const extension = file.fileName.split('.').pop().toLowerCase();
            return "." + extension;
        }
        hookupParentDirs(dir) {
            dir.fullDirectoryPath = this.getDirectoryFullPath(dir);
            dir.getSubDirectoryByName = DocumentDirectory.prototype.getSubDirectoryByName;
            if (!dir.subdirectories)
                return;
            dir.subdirectories.forEach((subDir) => {
                subDir.parentDirectory = dir;
                subDir.directoryDepth = dir.directoryDepth + 1;
                this.hookupParentDirs(subDir);
            });
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Refresh the file tree
        ///////////////////////////////////////////////////////////////////////////////////////////////
        Refresh() {
            // Store the name of the directory we have selected so we can re-select it after refreshing
            // the data
            let selectedDirectoryPath = null;
            if (this.selectedDirectory)
                selectedDirectoryPath = this.getSelectedDirectoryPath();
            else if (!HtmlUtil.isNullOrWhitespace(this.$location.search().directory)) {
                if (this.committee)
                    selectedDirectoryPath = DocumentsController.DirName_Committees + "/" + this.committee.committeeId + "/" + this.$location.search().directory;
                else
                    selectedDirectoryPath = this.$location.search().directory;
            }
            // Display the loading image
            this.isLoading = true;
            this.selectedDirectory = null;
            this.selectedFile = null;
            this.getDocsUri = "/api/ManageDocuments";
            if (this.committee)
                this.getDocsUri += "/Committee/" + this.committee.committeeId;
            this.$http.get(this.getDocsUri, { cache: this.docsHttpCache }).then((httpResponse) => {
                this.isLoading = false;
                this.documentTree = httpResponse.data;
                this.documentTree.getSubDirectoryByName = DocumentDirectory.prototype.getSubDirectoryByName;
                // Hook up parent directories
                this.documentTree.subdirectories.forEach((dir) => {
                    dir.directoryDepth = 0;
                    this.hookupParentDirs(dir);
                });
                // Build an array of all local files
                const allFiles = [];
                const processDir = (subdir) => {
                    _.each(subdir.files, (f) => {
                        f.localFilePath = subdir.name + "/" + f.title;
                        f.uploadDateString = moment(f.uploadDate).format("MMMM D, YYYY");
                    });
                    Array.prototype.push.apply(allFiles, subdir.files);
                    _.each(subdir.subdirectories, processDir);
                };
                processDir(this.documentTree);
                this.fullSearchFileList = allFiles;
                // Find the directory we had selected before the refresh
                if (selectedDirectoryPath) {
                    this.selectedDirectory = this.FindDirectoryByPath(selectedDirectoryPath);
                    this.SortFiles();
                }
                this.hookUpFileDragging();
            }, (response) => {
                alert("Failed to retrieve documents, please contact technical support. No need to worry, no documents have been lost.");
                this.isLoading = false;
                console.log("Failed to retrieve docs: " + response.data.exceptionMessage);
                //$( "#FileTreePanel" ).hide();
                //innerThis.errorMessage = "Failed to retrieve the building documents.";
            });
        }
    }
    DocumentsController.$inject = ["$http", "$rootScope", "$cacheFactory", "$scope", "SiteInfo", "fellowResidents", "$location"];
    DocumentsController.LocalStorageKey_SortType = "DocsInfo_FileSortType";
    DocumentsController.LocalStorageKey_SortDirection = "DocsInfo_FileSortDirection";
    DocumentsController.DirName_Committees = "Committees_Root";
    DocumentsController.ViewableExtensions = ["jpg", "jpeg", "png", "pdf", "txt"];
    Ally.DocumentsController = DocumentsController;
    class FullZipGenStatus {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("documents", {
    bindings: {
        committee: "<"
    },
    templateUrl: "/ngApp/common/documents.html",
    controller: Ally.DocumentsController
});

var Ally;
(function (Ally) {
    class InfoItem {
    }
    Ally.InfoItem = InfoItem;
    /**
     * The controller for the frequently asked questions widget
     */
    class FAQsController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope, siteInfo, $cacheFactory, fellowResidents) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$cacheFactory = $cacheFactory;
            this.fellowResidents = fellowResidents;
            this.isBodyMissing = false;
            this.canManage = false;
            this.headerText = "Information and Frequently Asked Questions (FAQs)";
            this.editingInfoItem = new InfoItem();
            if (AppConfig.appShortName === "home")
                this.headerText = "Home Notes";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.hideDocuments = this.$rootScope["userInfo"].isRenter && !this.siteInfo.privateSiteInfo.rentersCanViewDocs;
            this.canManage = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager;
            // Make sure committee members can manage their data
            if (this.committee && !this.canManage)
                this.fellowResidents.isCommitteeMember(this.committee.committeeId).then(isCommitteeMember => this.canManage = isCommitteeMember);
            this.faqsHttpCache = this.$cacheFactory.get("faqs-http-cache") || this.$cacheFactory("faqs-http-cache");
            this.retrieveInfo();
            // Hook up the rich text editor
            Ally.HtmlUtil2.initTinyMce("tiny-mce-editor", 500).then(e => this.tinyMceEditor = e);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Populate the info section
        ///////////////////////////////////////////////////////////////////////////////////////////////
        retrieveInfo() {
            this.isLoadingInfo = true;
            if (!this.getUri) {
                this.getUri = "/api/InfoItem";
                if (this.committee)
                    this.getUri = "/api/InfoItem/Committee/" + this.committee.committeeId;
            }
            this.$http.get(this.getUri, { cache: this.faqsHttpCache }).then((httpResponse) => {
                this.isLoadingInfo = false;
                this.infoItems = httpResponse.data;
                // Make <a> links open in new tabs
                setTimeout(() => {
                    for (let i = 0; i < this.infoItems.length; ++i)
                        RichTextHelper.makeLinksOpenNewTab("info-item-body-" + i);
                }, 500);
            });
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Scroll to an info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        scrollToInfo(infoItemIndex) {
            document.getElementById("info-item-title-" + infoItemIndex).scrollIntoView();
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user edits an info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onStartEditInfoItem(infoItem) {
            // Clone the object
            this.editingInfoItem = jQuery.extend({}, infoItem);
            this.tinyMceEditor.setContent(this.editingInfoItem.body);
            // Scroll down to the editor
            window.scrollTo(0, document.body.scrollHeight);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to add a new info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onSubmitItem() {
            this.editingInfoItem.body = this.tinyMceEditor.getContent();
            this.isBodyMissing = HtmlUtil.isNullOrWhitespace(this.editingInfoItem.body);
            const validateable = $("#info-item-edit-form");
            validateable.validate();
            if (!validateable.valid() || this.isBodyMissing)
                return;
            if (this.committee)
                this.editingInfoItem.committeeId = this.committee.committeeId;
            this.isLoadingInfo = true;
            const onSave = () => {
                this.isLoadingInfo = false;
                this.tinyMceEditor.setContent("");
                this.editingInfoItem = new InfoItem();
                // Switched to removeAll because when we switched to the new back-end, the cache
                // key is the full request URI, not just the "/api/InfoItem" form
                //this.faqsHttpCache.remove( this.getUri );
                this.faqsHttpCache.removeAll();
                this.retrieveInfo();
            };
            const onError = () => {
                this.isLoadingInfo = false;
                alert("Failed to save your information. Please try again and if this happens again contact support.");
            };
            // If we're editing an existing info item
            if (typeof (this.editingInfoItem.infoItemId) == "number")
                this.$http.put("/api/InfoItem", this.editingInfoItem).then(onSave);
            // Otherwise create a new one
            else
                this.$http.post("/api/InfoItem", this.editingInfoItem).then(onSave);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to delete an info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onDeleteInfoItem(infoItem) {
            if (!confirm('Are you sure you want to delete this information?'))
                return;
            this.isLoadingInfo = true;
            this.$http.delete("/api/InfoItem/" + infoItem.infoItemId).then(() => {
                this.isLoadingInfo = false;
                this.faqsHttpCache.removeAll();
                this.retrieveInfo();
                const shouldClearEdit = typeof (this.editingInfoItem.infoItemId) == "number" && this.editingInfoItem.infoItemId === infoItem.infoItemId;
                if (shouldClearEdit) {
                    this.editingInfoItem = new InfoItem();
                    this.tinyMceEditor.setContent("");
                }
            });
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to cancel editing of an info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        cancelInfoItemEdit() {
            this.editingInfoItem = new InfoItem();
            this.tinyMceEditor.setContent("");
        }
    }
    FAQsController.$inject = ["$http", "$rootScope", "SiteInfo", "$cacheFactory", "fellowResidents"];
    Ally.FAQsController = FAQsController;
    class RichTextHelper {
        static showFileUploadAlert(reason, detail) {
            let msg = "";
            if (reason === "unsupported-file-type")
                msg = "Unsupported format " + detail;
            else
                console.log("error uploading file", reason, detail);
            $('<div class="alert"> <button type="button" class="close" data-dismiss="alert">&times;</button>' +
                '<strong>File upload error</strong> ' + msg + ' </div>').prependTo('#alerts');
        }
        static makeLinksOpenNewTab(elemId) {
            window.setTimeout(() => {
                // Make links in the welcome message open in a new tab
                $("a", "#" + elemId).each((index, elem) => {
                    // Let local links modify the current tab
                    const isLocalLink = elem.href && (elem.href[0] === "#" || elem.href.indexOf(AppConfig.baseTld) > -1);
                    if (!isLocalLink)
                        $(elem).attr("target", "_blank");
                });
            }, 100);
        }
    }
    Ally.RichTextHelper = RichTextHelper;
})(Ally || (Ally = {}));
CA.angularApp.component("faqs", {
    bindings: {
        committee: "<?"
    },
    templateUrl: "/ngApp/common/FAQs.html",
    controller: Ally.FAQsController
});

var Ally;
(function (Ally) {
    /**
     * The controller for display a resident's financial transaction history
     */
    class ResidentTransactionsController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, $timeout, uiGridConstants, $scope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.uiGridConstants = uiGridConstants;
            this.$scope = $scope;
            this.shouldShowModal = false;
            this.isLoading = false;
            this.HistoryPageSize = 50;
            this.isUnitColVisible = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            this.homeName = AppConfig.homeName || "Unit";
            // A callback to calculate the sum for a column across all ui-grid pages, not just the visible page
            const addAmountOverAllRows = () => {
                const allGridRows = this.transactionGridApi.grid.rows;
                const visibleGridRows = allGridRows.filter(r => r.visible && r.entity && !isNaN(r.entity.amount));
                let sum = 0;
                visibleGridRows.forEach(item => sum += (item.entity.amount || 0));
                return sum;
            };
            this.transactionGridOptions =
                {
                    columnDefs: [
                        { field: 'transactionDate', displayName: 'Date', width: 70, type: 'date', cellFilter: "date:'shortDate'", enableFiltering: false },
                        //{
                        //    field: 'accountName', filter: {
                        //        type: this.uiGridConstants.filter.SELECT,
                        //        selectOptions: []
                        //    }, displayName: 'Account', enableCellEdit: false, width: 140, enableFiltering: true
                        //},
                        { field: 'description', displayName: 'Description', enableFiltering: true, filter: { placeholder: "search" } },
                        { field: 'categoryDisplayName', editModelField: "financialCategoryId", displayName: 'Category', width: 170, editDropdownOptionsArray: [], enableFiltering: true },
                        { field: 'unitGridLabel', editModelField: "associatedUnitId", displayName: this.homeName, width: 120, enableFiltering: true },
                        { field: 'amount', displayName: 'Amount', width: 140, type: 'number', cellFilter: "currency", enableFiltering: true, aggregationType: addAmountOverAllRows, footerCellTemplate: '<div class="ui-grid-cell-contents">Total: {{col.getAggregationValue() | currency }}</div>' }
                    ],
                    enableFiltering: true,
                    enableSorting: true,
                    showColumnFooter: true,
                    enableHorizontalScrollbar: window.innerWidth < 640 ? this.uiGridConstants.scrollbars.ALWAYS : this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableColumnMenus: false,
                    enablePaginationControls: true,
                    minRowsToShow: this.HistoryPageSize,
                    paginationPageSize: this.HistoryPageSize,
                    paginationPageSizes: [this.HistoryPageSize],
                    enableRowHeaderSelection: false,
                    onRegisterApi: (gridApi) => {
                        this.transactionGridApi = gridApi;
                    }
                };
        }
        /**
         * Populate the text that is shown for the unit column in the resident grid
         */
        populateGridUnitLabels() {
            return this.$http.get("/api/MemberUnit/NamesOnly").then((httpResponse) => {
                const allUnits = httpResponse.data;
                _.each(this.allFinancialTxns, (tx) => {
                    if (!tx.associatedUnitId)
                        return;
                    const unit = allUnits.find(u => u.unitId === tx.associatedUnitId);
                    if (!unit)
                        return;
                    tx.unitGridLabel = unit.name;
                });
            }, (httpResponse) => {
                //this.isLoading = false;
                console.log("Failed to load units");
                //alert( `Failed to load units, please contact technical support. (${httpResponse.data.exceptionMessage})` );
            });
        }
        showModal() {
            this.shouldShowModal = true;
            this.refreshEntries();
        }
        refreshEntries() {
            this.isLoading = true;
            this.$http.get(`/api/OwnerLedger/MyTransactions`).then((httpResponse) => {
                this.isLoading = false;
                this.allFinancialTxns = httpResponse.data.entries;
                this.ownerFinanceTxNote = httpResponse.data.ownerFinanceTxNote;
                this.ownerBalance = httpResponse.data.ownerBalance;
                // Hide the unit column if the owner only has one unit
                const allUnitIds = this.allFinancialTxns.map(u => u.associatedUnitId);
                const uniqueUnitIds = allUnitIds.filter((v, i, a) => a.indexOf(v) === i);
                const unitColumn = this.transactionGridOptions.columnDefs.find(c => c.field === "unitGridLabel");
                if (unitColumn) {
                    unitColumn.visible = uniqueUnitIds.length > 1 || this.siteInfo.userInfo.usersUnits.length > 1;
                    this.isUnitColVisible = unitColumn.visible;
                }
                //this.transactionGridOptions.data = httpResponse.data;
                //if( this.transactionGridOptions.data.length <= this.HistoryPageSize )
                //{
                //    this.transactionGridOptions.enablePagination = false;
                //    this.transactionGridOptions.enablePaginationControls = false;
                //}
                const initialLoad = () => {
                    if (this.allFinancialTxns.length > 1) {
                        // Transactions come down newest first
                        this.filterEndDate = this.allFinancialTxns[0].transactionDate;
                        this.filterStartDate = this.allFinancialTxns[this.allFinancialTxns.length - 1].transactionDate;
                    }
                    this.onFilterDateRangeChange();
                };
                // Put this in a slight delay so the date range picker can exist
                this.$timeout(() => {
                    if (this.isUnitColVisible)
                        this.populateGridUnitLabels().then(initialLoad, initialLoad);
                    else
                        initialLoad();
                }, 100);
            }, () => {
                this.isLoading = false;
            });
        }
        exportTransactionsCsv() {
            var csvColumns = [
                {
                    headerText: "Date",
                    fieldName: "transactionDate",
                    dataMapper: function (value) {
                        if (!value)
                            return "";
                        return moment(value).format("YYYY-MM-DD");
                    }
                },
                {
                    headerText: "Description",
                    fieldName: "description"
                },
                {
                    headerText: "Category",
                    fieldName: "categoryDisplayName"
                },
                {
                    headerText: AppConfig.homeName,
                    fieldName: "unitGridLabel"
                },
                {
                    headerText: "Amount",
                    fieldName: "amount"
                }
            ];
            var csvDataString = Ally.createCsvString(this.transactionGridOptions.data, csvColumns);
            Ally.HtmlUtil2.downloadCsv(csvDataString, "Owner-Transactions.csv");
        }
        onFilterDateRangeChange() {
            if (!this.filterStartDate || !this.filterEndDate)
                return;
            // Wrap this in $timeout so it refreshes properly, from here: https://stackoverflow.com/a/17958847/10315651
            this.$timeout(() => {
                const txRows = this.allFinancialTxns.filter(t => t.transactionDate >= this.filterStartDate && t.transactionDate <= this.filterEndDate);
                this.transactionGridOptions.data = txRows;
                this.transactionGridOptions.virtualizationThreshold = txRows.length + 1;
                if (this.transactionGridOptions.data.length <= this.HistoryPageSize) {
                    this.transactionGridOptions.enablePagination = false;
                    this.transactionGridOptions.enablePaginationControls = false;
                }
            }, 10);
        }
    }
    ResidentTransactionsController.$inject = ["$http", "SiteInfo", "$timeout", "uiGridConstants", "$scope"];
    Ally.ResidentTransactionsController = ResidentTransactionsController;
    class OwnerTxInfo {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("residentTransactions", {
    templateUrl: "/ngApp/common/financial/resident-transactions.html",
    controller: Ally.ResidentTransactionsController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the page that redirects to another group from Condo Ally
     */
    class GroupRedirectController {
        /**
         * The constructor for the class
         */
        constructor($routeParams) {
            this.$routeParams = $routeParams;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            var lowerAppName = (this.$routeParams.appName || "").toLowerCase();
            var appConfigs = [CondoAllyAppConfig, HomeAppConfig, HOAAppConfig, NeighborhoodAppConfig, BlockClubAppConfig];
            let domainName = null;
            for (let i = 0; i < appConfigs.length; ++i) {
                if (appConfigs[i].appShortName.toLowerCase() === lowerAppName) {
                    domainName = appConfigs[i].baseTld;
                    break;
                }
            }
            if (!domainName)
                domainName = "condoally.com";
            domainName = "myhoaally.org";
            var redirectUrl = `https://${this.$routeParams.shortName}.${domainName}/`;
            window.location.href = redirectUrl;
        }
    }
    GroupRedirectController.$inject = ["$routeParams"];
    Ally.GroupRedirectController = GroupRedirectController;
})(Ally || (Ally = {}));
CA.angularApp.component("groupRedirect", {
    templateUrl: "/ngApp/common/group-redirect.html",
    controller: Ally.GroupRedirectController
});

var Ally;
(function (Ally) {
    class SendEmailRecpientEntry {
    }
    class HomeEmailMessage {
        constructor() {
            this.recipientType = "board";
        }
    }
    /**
     * The controller for the widget that lets members send emails to the group
     */
    class GroupSendEmailController {
        /**
         * The constructor for the class
         */
        constructor($http, fellowResidents, $rootScope, siteInfo, $scope) {
            this.$http = $http;
            this.fellowResidents = fellowResidents;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$scope = $scope;
            this.isLoadingEmail = false;
            this.showDiscussionEveryoneWarning = false;
            this.showDiscussionLargeWarning = false;
            this.showUseDiscussSuggestion = false;
            this.showSendConfirmation = false;
            this.showEmailForbidden = false;
            this.showRestrictedGroupWarning = false;
            this.defaultSubject = "A message from your neighbor";
            this.memberLabel = "resident";
            this.memberPageName = "Residents";
            this.shouldShowSendAsBoard = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            this.groupEmailDomain = "inmail." + AppConfig.baseTld;
            this.messageObject = new HomeEmailMessage();
            this.showSendEmail = true;
            if (this.committee) {
                this.messageObject.committeeId = this.committee.committeeId;
                this.defaultSubject = "A message from a committee member";
            }
            else {
                this.loadGroupEmails();
                // Handle the global message that tells this component to prepare a draft of a message
                // to inquire about assessment inaccuracies
                this.$scope.$on("prepAssessmentEmailToBoard", (event, data) => this.prepBadAssessmentEmailForBoard(data));
                if (AppConfig.appShortName === "pta") {
                    this.defaultSubject = "A message from a PTA member";
                    this.memberLabel = "member";
                    this.memberPageName = "Members";
                }
                else
                    this.defaultSubject = "A message from your neighbor";
            }
            this.messageObject.subject = this.defaultSubject;
        }
        /**
         * Populate the group email options
         */
        loadGroupEmails() {
            this.isLoadingEmail = true;
            this.fellowResidents.getGroupEmailObject().then((emailList) => {
                this.isLoadingEmail = false;
                this.availableEmailGroups = emailList.filter(e => e.recipientType !== "Treasurer"); // No need to show treasurer in this list since it's a single person
                if (this.availableEmailGroups.length > 0) {
                    this.defaultMessageRecipient = this.availableEmailGroups[0];
                    this.selectedRecipient = this.availableEmailGroups[0];
                    this.onSelectEmailGroup();
                }
            });
        }
        /**
         * Setup an email to be sent to the board for assessment issues
         */
        prepBadAssessmentEmailForBoard(emitEventData) {
            const emitDataParts = emitEventData.split("|");
            const assessmentAmount = emitDataParts[0];
            let nextPaymentText = null;
            if (emitDataParts.length > 1)
                nextPaymentText = emitDataParts[1];
            // Create a message to the board
            this.messageObject.recipientType = "board";
            this.messageObject.subject = "Question About Assessment Amount";
            if (nextPaymentText)
                this.messageObject.message = "Hello Boardmembers,\n\nOur association's home page says my next payment of $" + assessmentAmount + " will cover " + nextPaymentText + ", but I believe that is incorrect. My records indicate my next payment of $" + assessmentAmount + " should pay for [INSERT PROPER DATE HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            else
                this.messageObject.message = "Hello Boardmembers,\n\nOur association's home page says my assessment payment is $" + assessmentAmount + ", but I believe that is incorrect. My records indicate my assessment payments should be $INSERT_PROPER_AMOUNT_HERE. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            document.getElementById("send-email-panel").scrollIntoView();
        }
        /**
         * Occurs when the user presses the button to send an email to members of the building
         */
        onSendEmail() {
            $("#message-form").validate();
            if (!$("#message-form").valid())
                return;
            this.isLoadingEmail = true;
            // Set this flag so we don't redirect if sending results in a 403
            this.$rootScope.dontHandle403 = true;
            analytics.track("sendEmail", {
                recipientId: this.messageObject.recipientType
            });
            this.$http.post("/api/Email/v2", this.messageObject).then(() => {
                this.$rootScope.dontHandle403 = false;
                this.isLoadingEmail = false;
                this.messageObject = new HomeEmailMessage();
                this.selectedRecipient = this.defaultMessageRecipient;
                this.messageObject.recipientType = this.defaultMessageRecipient.recipientType;
                this.messageObject.subject = this.defaultSubject;
                this.onSelectEmailGroup();
                if (this.committee)
                    this.messageObject.committeeId = this.committee.committeeId;
                this.showSendConfirmation = true;
                this.showSendEmail = false;
            }, (httpResponse) => {
                this.isLoadingEmail = false;
                this.$rootScope.dontHandle403 = false;
                if (httpResponse.status === 403) {
                    this.showEmailForbidden = true;
                }
                else
                    alert("Unable to send email: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user selects an email group from the drop-down
         */
        onSelectEmailGroup() {
            if (!this.selectedRecipient)
                return;
            this.messageObject.recipientType = this.selectedRecipient.recipientType;
            const isCustomRecipientGroup = this.messageObject.recipientType.toUpperCase() === Ally.FellowResidentsService.CustomRecipientType;
            this.messageObject.customRecipientShortName = isCustomRecipientGroup ? this.selectedRecipient.recipientTypeName : null;
            this.groupEmailAddress = (isCustomRecipientGroup ? this.selectedRecipient.recipientTypeName : this.selectedRecipient.recipientType) + "." + this.siteInfo.publicSiteInfo.shortName + "@inmail." + AppConfig.baseTld;
            // No need to show this right now as the showRestrictedGroupWarning is more clear
            this.showDiscussionEveryoneWarning = false; // this.messageObject.recipientType === "Everyone";
            const isSendingToOwners = this.messageObject.recipientType.toLowerCase().indexOf("owners") !== -1;
            if (!this.showDiscussionEveryoneWarning
                && isSendingToOwners
                && this.siteInfo.privateSiteInfo.numUnits > 30)
                this.showDiscussionLargeWarning = true;
            else
                this.showDiscussionLargeWarning = false;
            const isSendingToDiscussion = this.messageObject.recipientType.toLowerCase().indexOf("discussion") !== -1;
            const isSendingToBoard = this.messageObject.recipientType.toLowerCase().indexOf("board") !== -1;
            const isSendingToPropMgr = this.messageObject.recipientType.toLowerCase().indexOf("propertymanagers") !== -1;
            this.showDiscussionEveryoneWarning = false;
            this.showDiscussionLargeWarning = false;
            this.showUseDiscussSuggestion = !isSendingToDiscussion && !isSendingToBoard && !isSendingToPropMgr && AppConfig.isChtnSite && !isCustomRecipientGroup;
            this.showRestrictedGroupWarning = this.selectedRecipient.isRestrictedGroup;
            this.shouldShowSendAsBoard = Ally.FellowResidentsService.isNonPropMgrBoardPosition(this.siteInfo.userInfo.boardPosition) && !isSendingToBoard;
        }
    }
    GroupSendEmailController.$inject = ["$http", "fellowResidents", "$rootScope", "SiteInfo", "$scope"];
    Ally.GroupSendEmailController = GroupSendEmailController;
})(Ally || (Ally = {}));
CA.angularApp.component("groupSendEmail", {
    bindings: {
        committee: "<?"
    },
    templateUrl: "/ngApp/common/group-send-email.html",
    controller: Ally.GroupSendEmailController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the widget that shows news headlines for the local area
     */
    class LocalNewsFeedController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, $timeout) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.isLoading = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            // Load the news with a slight delay to help the page load faster
            this.isLoading = true;
            this.$timeout(() => this.loadNewsStories(), 200);
        }
        /**
         * Refresh the local news feed
         */
        loadNewsStories() {
            //window.location.host is subdomain.domain.com
            const subDomain = HtmlUtil.getSubdomain(window.location.host);
            // A little test to help the automated tests run faster
            let isTestSubdomain = subDomain === "qa" || subDomain === "localtest";
            isTestSubdomain = false; // Allow on test sites for now
            if (isTestSubdomain)
                return;
            this.isLoading = true;
            let localNewsUri;
            let queryParams;
            if (this.siteInfo.privateSiteInfo.country === "US") {
                localNewsUri = "https://localnewsally.azurewebsites.net/api/LocalNews";
                queryParams = {
                    clientId: "1001A194-B686-4C45-80BC-ECC0BB4916B4",
                    chicagoWard: this.siteInfo.privateSiteInfo.chicagoWard,
                    zipCode: this.siteInfo.privateSiteInfo.zipCode,
                    cityNeighborhood: this.siteInfo.privateSiteInfo.localNewsNeighborhoodQuery,
                    city: this.siteInfo.privateSiteInfo.groupAddress.city,
                    state2Char: this.siteInfo.privateSiteInfo.groupAddress.state
                };
            }
            else {
                localNewsUri = "https://localnewsally.azurewebsites.net/api/LocalNews/International/MajorCity";
                queryParams = {
                    clientId: "1001A194-B686-4C45-80BC-ECC0BB4916B4",
                    countryCode: this.siteInfo.privateSiteInfo.country,
                    city: this.siteInfo.privateSiteInfo.groupAddress.city
                };
            }
            this.$http.get(localNewsUri, {
                cache: true,
                params: queryParams
            }).then((httpResponse) => {
                this.isLoading = false;
                this.localNewStories = httpResponse.data;
            });
        }
    }
    LocalNewsFeedController.$inject = ["$http", "SiteInfo", "$timeout"];
    Ally.LocalNewsFeedController = LocalNewsFeedController;
})(Ally || (Ally = {}));
CA.angularApp.component("localNewsFeed", {
    templateUrl: "/ngApp/common/local-news-feed.html",
    controller: Ally.LocalNewsFeedController
});

var Ally;
(function (Ally) {
    class MailingHistoryInfo {
    }
    class MailingResultBase {
    }
    class MailingResultEmail extends MailingResultBase {
    }
    class MailingResultPaperMail extends MailingResultBase {
    }
    class MailingResults {
    }
    /**
     * The controller for the invoice mailing view
     */
    class MailingHistoryController {
        /**
        * The constructor for the class
        */
        constructor($http, siteInfo, $timeout) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.isLoading = false;
            this.viewingResults = null;
            this.historyGridOptions =
                {
                    data: [],
                    columnDefs: [
                        {
                            field: "sendDateUtc",
                            displayName: "Sent",
                            cellFilter: "date:'short'",
                            type: "date"
                        },
                        {
                            field: "numPaperLettersSent",
                            displayName: "# Letters",
                            type: "number",
                            width: 100
                        },
                        {
                            field: "numEmailsSent",
                            displayName: "# Emails",
                            type: "number",
                            width: 100
                        },
                        {
                            field: "amountPaid",
                            displayName: "Mailing Fee",
                            cellFilter: "currency",
                            type: "number",
                            width: 130
                        },
                        {
                            field: "sendingReason",
                            displayName: "Reason",
                            width: 150
                        },
                        {
                            field: "mailingResultObject",
                            displayName: "",
                            width: 130,
                            cellTemplate: '<div class="ui-grid-cell-contents"><span data-ng-click="grid.appScope.$ctrl.showMailingResults( row.entity )" class="text-link">View Results</span></div>'
                        }
                    ],
                    enableSorting: true,
                    enableHorizontalScrollbar: 0,
                    enableVerticalScrollbar: 0,
                    enableColumnMenus: false,
                    minRowsToShow: 5,
                    onRegisterApi: (gridApi) => {
                        this.historyGridApi = gridApi;
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
            this.resultsGridOptions =
                {
                    data: [],
                    columnDefs: [
                        {
                            field: "mailingType",
                            displayName: "Type",
                            width: 100
                        },
                        {
                            field: "recipient",
                            displayName: "Recipient",
                            width: 300,
                            cellTemplate: '<div class="ui-grid-cell-contents"><span title="{{row.entity.recipient}}">{{ row.entity.recipientEmail || row.entity.recipientStreetAddress.oneLiner }}</span></div>'
                        },
                        {
                            field: "didSuccessfullySend",
                            displayName: "Successful",
                            width: 100,
                            type: "boolean"
                        },
                        {
                            field: "resultMessage",
                            displayName: "Result Message",
                            cellTemplate: '<div class="ui-grid-cell-contents"><span title="{{row.entity.resultMessage}}">{{row.entity.resultMessage}}</span></div>'
                        }
                    ],
                    enableSorting: true,
                    enableHorizontalScrollbar: 0,
                    enableVerticalScrollbar: 0,
                    enableColumnMenus: false,
                    minRowsToShow: 5,
                    onRegisterApi: (gridApi) => {
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            this.refreshHistory();
        }
        /**
         * Display the results for a mailing
         */
        showMailingResults(mailingEntry) {
            // We need to put this in a timeout because ui-grid cannot properly size itself until
            // the DOM element for the grid is shown
            this.$timeout(() => {
                _.forEach(mailingEntry.mailingResultObject.emailResults, r => r.mailingType = "E-mail");
                _.forEach(mailingEntry.mailingResultObject.paperMailResults, r => r.mailingType = "Paper Letter");
                let resultsRows = [];
                resultsRows = resultsRows.concat(mailingEntry.mailingResultObject.emailResults, mailingEntry.mailingResultObject.paperMailResults);
                this.resultsGridOptions.data = resultsRows;
                this.resultsGridOptions.minRowsToShow = resultsRows.length;
                this.resultsGridOptions.virtualizationThreshold = resultsRows.length;
                this.resultsGridheight = (resultsRows.length + 1) * this.resultsGridOptions.rowHeight;
                this.$timeout(() => {
                    this.viewingResults = mailingEntry.mailingResultObject;
                    //var evt = document.createEvent( 'UIEvents' );
                    //evt.initUIEvent( 'resize', true, false, window, 0 );
                    //window.dispatchEvent( evt );
                }, 10);
            }, 0);
        }
        /**
         * Load the mailing history
         */
        refreshHistory() {
            this.isLoading = true;
            this.$http.get("/api/Mailing/History").then((response) => {
                this.isLoading = false;
                this.historyGridOptions.data = response.data;
                this.historyGridOptions.minRowsToShow = response.data.length;
                this.historyGridOptions.virtualizationThreshold = response.data.length;
            }, (response) => {
                this.isLoading = false;
                alert("Failed to load mailing history: " + response.data.exceptionMessage);
            });
        }
    }
    MailingHistoryController.$inject = ["$http", "SiteInfo", "$timeout"];
    Ally.MailingHistoryController = MailingHistoryController;
})(Ally || (Ally = {}));
CA.angularApp.component("mailingHistory", {
    templateUrl: "/ngApp/common/mailing/mailing-history.html",
    controller: Ally.MailingHistoryController
});

//declare var StripeCheckout: any;
var Ally;
(function (Ally) {
    class InvoiceMailingEntry {
        constructor() {
            this.isValidMailingAddress = null;
        }
    }
    class InvoiceFullMailing {
    }
    class FullMailingResult {
    }
    class AddressVerificationResult {
    }
    class InvoicePreviewInfo {
    }
    class InvoicePreviewInfoResult {
    }
    /**
     * The controller for the invoice mailing view
     */
    class MailingInvoiceController {
        /**
        * The constructor for the class
        */
        constructor($http, siteInfo, fellowResidents, wizardHandler, $scope, $timeout, $location) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.fellowResidents = fellowResidents;
            this.wizardHandler = wizardHandler;
            this.$scope = $scope;
            this.$timeout = $timeout;
            this.$location = $location;
            this.isLoading = false;
            this.selectedEntries = [];
            this.numEmailsToSend = 0;
            this.numPaperLettersToSend = 0;
            this.paperInvoiceDollars = 2;
            this.isAdmin = false;
            this.numInvalidMailingAddresses = 0;
            this.numAddressesToBulkValidate = 0;
            this.shouldShowAutoUnselect = false;
            this.paymentType = "creditCard";
            this.settings = new Ally.ChtnSiteSettings();
            this.stripeApi = null;
            this.stripeCardElement = null;
            this.payButtonText = "Pay $10";
            const amountCellTemplate = '<div class="ui-grid-cell-contents">$<input type="number" style="width: 90%;" data-ng-model="row.entity[col.field]" autocomplete="off" data-lpignore="true" data-form-type="other" /></div>';
            this.homesGridOptions =
                {
                    data: [],
                    columnDefs: [
                        {
                            field: "homeNames",
                            displayName: AppConfig.homeName,
                            width: 210
                        },
                        {
                            field: "ownerNames",
                            displayName: "Owners"
                        },
                        {
                            field: "amountDue",
                            displayName: "Amount Due",
                            width: 120,
                            cellTemplate: amountCellTemplate
                        },
                        {
                            field: "balanceForward",
                            displayName: "Balance Forward",
                            width: 140,
                            cellTemplate: amountCellTemplate
                        },
                        {
                            field: "lateFee",
                            displayName: "Late Fee",
                            width: 120,
                            cellTemplate: amountCellTemplate
                        },
                        {
                            field: "total",
                            displayName: "Total",
                            width: 90,
                            cellTemplate: '<div class="ui-grid-cell-contents">{{ row.entity.amountDue + (row.entity.balanceForward || 0) + (row.entity.lateFee || 0) | currency }}</div>'
                        }
                        //,{
                        //    field: "unitIds",
                        //    displayName: "",
                        //    width: 130,
                        //    cellTemplate: '<div class="ui-grid-cell-contents"><a data-ng-href="/api/Mailing/Preview/Invoice/{{row.entity.unitIds}}?ApiAuthToken=' + this.siteInfo.authToken + '" target="_blank">Preview Invoice</a></div>'
                        //}
                    ],
                    enableSorting: true,
                    enableHorizontalScrollbar: 0,
                    enableVerticalScrollbar: 0,
                    enableColumnMenus: false,
                    minRowsToShow: 5,
                    enableRowHeaderSelection: true,
                    multiSelect: true,
                    enableSelectAll: true,
                    onRegisterApi: (gridApi) => {
                        this.gridApi = gridApi;
                        const updateFromSelection = () => {
                            const selectedRows = gridApi.selection.getSelectedRows();
                            this.selectedEntries = selectedRows;
                            //_.forEach( <InvoiceMailingEntry[]>this.homesGridOptions.data, e => e.shouldIncludeForSending = false );
                            //_.forEach( this.selectedEntries, e => e.shouldIncludeForSending = true );
                        };
                        gridApi.selection.on.rowSelectionChanged($scope, () => updateFromSelection());
                        gridApi.selection.on.rowSelectionChangedBatch($scope, () => updateFromSelection());
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.authToken = this.siteInfo.authToken;
            this.isAdmin = this.siteInfo.userInfo.isAdmin;
            this.loadMailingInfo();
            this.$scope.$on('wizard:stepChanged', (event, args) => {
                this.activeStepIndex = args.index;
                console.log("wizard:stepChanged, step " + this.activeStepIndex);
                // If we moved to the second step, amounts due
                if (this.activeStepIndex === 1) {
                    this.$timeout(() => {
                        // Tell the grid to resize as there is a bug with UI-Grid
                        //$( window ).resize();
                        //$( window ).resize();
                        //var evt = document.createEvent( 'UIEvents' );
                        //evt.initUIEvent( 'resize', true, false, window, 0 );
                        //window.dispatchEvent( evt );
                        // Update the grid to show the selection based on our internal selection
                        for (const curRow of this.selectedEntries)
                            this.gridApi.selection.selectRow(curRow);
                        //this.$timeout( () => this.gridApi.selection.selectAllRows(), 200 );
                    }, 250);
                }
                // Or if we moved to the third step, contact method
                if (this.activeStepIndex === 2) {
                    // Filter out any fields with an empty due
                    // TWC - 6/25/19 - Had a request to still be able to send out $0 invoices, makes sense
                    //this.selectedEntries = _.filter( this.selectedEntries, e => this.getTotalDue( e ) != 0 );
                    // For long lists of homes, make sure the user is brought to the top
                    window.setTimeout(() => document.getElementById("delivery-method-header").scrollIntoView(true), 50);
                }
                // Or if we moved to the last step
                else if (this.activeStepIndex === 3) {
                    this.numEmailsToSend = _.filter(this.selectedEntries, e => e.shouldSendEmail).length;
                    this.numPaperLettersToSend = _.filter(this.selectedEntries, e => e.shouldSendPaperMail).length;
                    if (this.numPaperLettersToSend > 0)
                        this.$timeout(() => this.initStripePayment(), 100);
                }
            });
            this.shouldShowAutoUnselect = this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled
                && this.siteInfo.privateSiteInfo.assessmentFrequency >= 50;
            if (this.shouldShowAutoUnselect) {
                this.autoUnselectLabel = MailingInvoiceController.getCurrentPayPeriodLabel(this.siteInfo.privateSiteInfo.assessmentFrequency);
                if (!this.autoUnselectLabel)
                    this.shouldShowAutoUnselect = false;
            }
            try {
                this.stripeApi = Stripe(StripeApiKey);
            }
            catch (err) {
                console.log(err);
            }
            // This will be needed for ACH payments
            //this.$http.get( "/api/Settings" ).then( ( response: ng.IHttpPromiseCallbackArg<ChtnSiteSettings> ) => this.settings = response.data );
        }
        static getCurrentPayPeriod(assessmentFrequency) {
            const payPeriodInfo = FrequencyIdToInfo(assessmentFrequency);
            if (!payPeriodInfo)
                return null;
            const today = new Date();
            const periodInfo = {
                year: today.getFullYear(),
                period: -1,
                period1Based: -1
            };
            if (payPeriodInfo.intervalName === "month")
                periodInfo.period = today.getMonth();
            else if (payPeriodInfo.intervalName === "quarter")
                periodInfo.period = Math.floor(today.getMonth() / 3);
            else if (payPeriodInfo.intervalName === "half-year")
                periodInfo.period = Math.floor(today.getMonth() / 6);
            else if (payPeriodInfo.intervalName === "year")
                periodInfo.period = 0;
            periodInfo.period1Based = periodInfo.period + 1;
            return periodInfo;
        }
        static getCurrentPayPeriodLabel(assessmentFrequency) {
            const payPeriodInfo = FrequencyIdToInfo(assessmentFrequency);
            if (!payPeriodInfo)
                return null;
            const periodNames = GetLongPayPeriodNames(payPeriodInfo.intervalName);
            if (!periodNames)
                return new Date().getFullYear().toString();
            const currentPeriod = MailingInvoiceController.getCurrentPayPeriod(assessmentFrequency);
            const yearString = currentPeriod.year.toString();
            return periodNames[currentPeriod.period] + " " + yearString;
        }
        customizeNotes(recipient) {
            recipient.overrideNotes = this.fullMailingInfo.notes || " ";
        }
        uncustomizeNotes(recipient) {
            recipient.overrideNotes = null;
        }
        setAllDues() {
            _.forEach(this.fullMailingInfo.mailingEntries, e => e.amountDue = this.allDuesSetAmount);
        }
        getTotalDue(recipient) {
            return recipient.amountDue - Math.abs(recipient.balanceForward || 0) + (recipient.lateFee || 0);
        }
        onShouldSendPaperMailChange(recipient) {
            //if( recipient.shouldSendPaperMail )
            //    this.validateAddress( recipient );
            if (recipient.shouldSendPaperMail)
                this.testAddressRequiredFields(recipient);
            else {
                recipient.isValidMailingAddress = recipient.validationMessage = null;
                this.numInvalidMailingAddresses = _.filter(this.selectedEntries, e => e.isValidMailingAddress === false).length;
            }
        }
        onAddressChanged(recipient) {
            //if( recipient.shouldSendPaperMail )
            //    this.validateAddress( recipient );
            if (recipient.shouldSendPaperMail)
                this.testAddressRequiredFields(recipient);
        }
        /**
         * Test the mailability of an address
         */
        testAddressRequiredFields(recipient) {
            recipient.isValidating = true;
            recipient.isValidMailingAddress = null;
            recipient.validationMessage = null;
            return this.$http.post("/api/Mailing/TestMailability", recipient.streetAddressObject).then((response) => {
                recipient.isValidating = false;
                recipient.isValidMailingAddress = response.data.isValid;
                recipient.validationMessage = response.data.verificationMessage;
                this.numInvalidMailingAddresses = _.filter(this.selectedEntries, e => e.isValidMailingAddress === false).length;
            }, (response) => {
                recipient.isValidating = false;
                recipient.isValidMailingAddress = false;
                recipient.validatedAddress = null;
                recipient.validationMessage = "Address validation failed: " + response.data.exceptionMessage;
            });
        }
        /**
         * Run the recipient addresses through an address validator
         */
        validateAddress(recipient) {
            recipient.isValidating = true;
            recipient.isValidMailingAddress = null;
            const validateUri = "/api/Mailing/VerifyAddress?address=" + encodeURIComponent(JSON.stringify(recipient.streetAddressObject));
            return this.$http.get(validateUri).then((response) => {
                recipient.isValidating = false;
                recipient.isValidMailingAddress = response.data.isValid;
                recipient.validationMessage = response.data.verificationMessage;
                if (recipient.isValidMailingAddress)
                    recipient.validatedAddress = response.data.parsedStreetAddress.multiLiner;
            }, (response) => {
                recipient.isValidating = false;
                recipient.isValidMailingAddress = false;
                recipient.validatedAddress = null;
                recipient.validationMessage = response.data.exceptionMessage;
            });
        }
        previewInvoice(entry) {
            const previewPostInfo = new InvoicePreviewInfo();
            previewPostInfo.invoiceTitleString = this.fullMailingInfo.invoiceTitleString;
            previewPostInfo.dueDateString = this.fullMailingInfo.dueDateString;
            previewPostInfo.duesLabel = this.fullMailingInfo.duesLabel;
            previewPostInfo.fromAddress = this.fullMailingInfo.fromStreetAddress;
            previewPostInfo.mailingInfo = entry;
            previewPostInfo.notes = entry.overrideNotes || this.fullMailingInfo.notes;
            this.isLoading = true;
            entry.wasPopUpBlocked = false;
            this.$http.post("/api/Mailing/Preview/Invoice", previewPostInfo).then((response) => {
                this.isLoading = false;
                const getUri = this.siteInfo.publicSiteInfo.baseApiUrl + "PublicMailing/Preview/Invoice/" + response.data.previewId;
                const newWindow = window.open(getUri, "_blank");
                entry.wasPopUpBlocked = !newWindow || newWindow.closed || typeof newWindow.closed === "undefined";
            }, (response) => {
                this.isLoading = false;
                alert("Failed to preview invoice: " + response.data.exceptionMessage);
            });
            //var entryInfo = encodeURIComponent( JSON.stringify( entry ) );
            //var invoiceUri = `/api/Mailing/Preview/Invoice?ApiAuthToken=${this.authToken}&fromAddress=${encodeURIComponent( JSON.stringify( this.fullMailingInfo.fromStreetAddress ) )}&notes=${encodeURIComponent( this.fullMailingInfo.notes )}&dueDateString=${encodeURIComponent( this.fullMailingInfo.dueDateString )}&duesLabel=${encodeURIComponent( this.fullMailingInfo.duesLabel )}&mailingInfo=${entryInfo}`;
            //window.open( invoiceUri, "_blank" );
        }
        onFinishedWizard() {
            if (this.numPaperLettersToSend === 0) {
                if (this.numEmailsToSend === 0)
                    alert("No emails or paper letters selected to send.");
                else
                    this.submitFullMailingAfterCharge();
                return;
            }
            this.submitCardToStripe();
            //const checkoutHandler = StripeCheckout.configure( {
            //    key: StripeApiKey,
            //    image: '/assets/images/icons/Icon-144.png',
            //    locale: 'auto',
            //    email: this.siteInfo.userInfo.emailAddress,
            //    token: ( token: any ) =>
            //    {
            //        // You can access the token ID with `token.id`.
            //        // Get the token ID to your server-side code for use.
            //        this.fullMailingInfo.stripeToken = token.id;
            //        this.submitFullMailingAfterCharge();
            //    }
            //} );
            //this.isLoading = true;
            //// Open Checkout with further options:
            //checkoutHandler.open( {
            //    name: 'Community Ally',
            //    description: `Mailing ${this.numPaperLettersToSend} invoice${this.numPaperLettersToSend === 1 ? '' : 's'}`,
            //    zipCode: true,
            //    amount: this.numPaperLettersToSend * this.paperInvoiceDollars * 100 // Stripe uses cents
            //} );
            //// Close Checkout on page navigation:
            //window.addEventListener( 'popstate', function()
            //{
            //    checkoutHandler.close();
            //} );
        }
        submitFullMailingAfterCharge() {
            this.isLoading = true;
            this.$http.post("/api/Mailing/Send/Invoice", this.fullMailingInfo).then((response) => {
                this.isLoading = false;
                const message = `Your invoices have been successfully sent${response.data.hadErrors ? ', but there were errors' : ''}. You can view the status in the history tab.`;
                alert(message);
                this.$location.path("/Mailing/History");
            }, (response) => {
                this.isLoading = false;
                alert("There was a problem sending your mailing, none were sent and you were not charged. Error: " + response.data.exceptionMessage);
            });
        }
        /**
        * Retrieve mailing info from the server
        */
        loadMailingInfo() {
            this.isLoading = true;
            this.$http.get("/api/Mailing/RecipientInfo").then((response) => {
                this.isLoading = false;
                this.fullMailingInfo = response.data;
                this.homesGridOptions.data = response.data.mailingEntries;
                this.homesGridOptions.minRowsToShow = response.data.mailingEntries.length;
                this.homesGridOptions.virtualizationThreshold = response.data.mailingEntries.length;
                this.selectedEntries = _.clone(response.data.mailingEntries);
            });
        }
        /**
         * Scroll to the first invalid mail address
         */
        scrollToFirstAddressError() {
            const firstBadAddress = _.find(this.selectedEntries, e => e.isValidMailingAddress === false);
            if (!firstBadAddress)
                return;
            const badAddressIndex = _.indexOf(this.selectedEntries, firstBadAddress);
            if (badAddressIndex === -1)
                return;
            const badAddressElem = document.getElementById("recipient-entry-" + badAddressIndex);
            badAddressElem.scrollIntoView();
        }
        toggleAllSending(type) {
            if (this.selectedEntries.length === 0)
                return;
            if (type === "email") {
                const shouldSetTo = !this.selectedEntries[0].shouldSendEmail;
                for (let i = 0; i < this.selectedEntries.length; ++i) {
                    if (HtmlUtil.isNullOrWhitespace(this.selectedEntries[i].emailAddresses) || !this.selectedEntries[i].amountDue)
                        this.selectedEntries[i].shouldSendEmail = false;
                    else
                        this.selectedEntries[i].shouldSendEmail = shouldSetTo;
                }
            }
            // Otherwise the user toggled sending for paper mail
            else {
                const shouldSetTo = !this.selectedEntries[0].shouldSendPaperMail;
                for (let i = 0; i < this.selectedEntries.length; ++i) {
                    if (!this.selectedEntries[i].streetAddressObject || !this.selectedEntries[i].amountDue)
                        this.selectedEntries[i].shouldSendPaperMail = false;
                    else
                        this.selectedEntries[i].shouldSendPaperMail = shouldSetTo;
                }
                // If we disabled paper mail sending then clear the errors
                if (!shouldSetTo) {
                    _.each(this.selectedEntries, e => e.isValidMailingAddress = e.validationMessage = null);
                    this.numInvalidMailingAddresses = 0;
                }
                // Otherwise if we enabled the sending and there are selected recipients, then verify all addresses
                else if (shouldSetTo && this.selectedEntries.length > 0) {
                    const recipientsToVerify = _.clone(this.selectedEntries);
                    //const validateAllStep = () =>
                    //{
                    //    this.validateAddress( recipientsToVerify[0] ).then( () =>
                    //    {
                    //        recipientsToVerify.splice( 0, 1 );
                    //        while( recipientsToVerify.length > 0 && !recipientsToVerify[0].amountDue )
                    //            recipientsToVerify.splice( 0, 1 );
                    //        if( recipientsToVerify.length > 0 )
                    //            validateAllStep();
                    //    } );
                    //};
                    //validateAllStep();
                    this.numAddressesToBulkValidate = recipientsToVerify.length;
                    const testAddressAllStep = () => {
                        this.testAddressRequiredFields(recipientsToVerify[0]).then(() => {
                            recipientsToVerify.splice(0, 1);
                            while (recipientsToVerify.length > 0 && !recipientsToVerify[0].amountDue)
                                recipientsToVerify.splice(0, 1);
                            this.numAddressesToBulkValidate = recipientsToVerify.length;
                            if (recipientsToVerify.length > 0)
                                testAddressAllStep();
                        });
                    };
                    testAddressAllStep();
                }
            }
        }
        autoUnselectPaidOwners() {
            this.isLoading = true;
            const currentPeriod = MailingInvoiceController.getCurrentPayPeriod(this.siteInfo.privateSiteInfo.assessmentFrequency);
            const getUri = `/api/PaymentHistory/RecentPayPeriod/${currentPeriod.year}/${currentPeriod.period1Based}`;
            this.$http.get(getUri).then((response) => {
                this.isLoading = false;
                for (const mailingEntry of this.homesGridOptions.data) {
                    const paidUnits = response.data.filter(u => mailingEntry.unitIds.indexOf(u.unitId) !== -1);
                    const isPaid = paidUnits.length > 0;
                    if (isPaid)
                        this.gridApi.selection.unSelectRow(mailingEntry, null);
                    else
                        this.gridApi.selection.selectRow(mailingEntry, null);
                }
            }, (response) => {
                this.isLoading = false;
                alert("Failed to retrieve assessment status: " + response.data.exceptionMessage);
            });
        }
        initStripePayment() {
            const style = {
                base: {
                    color: "#32325d",
                    fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                    fontSmoothing: "antialiased",
                    fontSize: "16px",
                    "::placeholder": {
                        color: "#aab7c4"
                    }
                },
                invalid: {
                    color: "#fa755a",
                    iconColor: "#fa755a"
                }
            };
            const elements = this.stripeApi.elements();
            this.stripeCardElement = elements.create("card", { style: style });
            this.stripeCardElement.mount("#stripe-card-element");
            const onCardChange = (event) => {
                if (event.error)
                    this.showStripeError(event.error.message);
                else
                    this.showStripeError(null);
            };
            this.stripeCardElement.on('change', onCardChange);
        }
        showStripeError(errorMessage) {
            const displayError = document.getElementById("card-errors");
            if (HtmlUtil.isNullOrWhitespace(errorMessage))
                displayError.textContent = null; //'Unknown Error';
            else
                displayError.textContent = errorMessage;
        }
        async submitCardToStripe() {
            this.isLoading = true;
            const { token, error } = await this.stripeApi.createToken(this.stripeCardElement);
            this.isLoading = false;
            if (error) {
                // Inform the customer that there was an error.
                const errorElement = document.getElementById('card-errors');
                errorElement.textContent = error.message;
            }
            else {
                this.fullMailingInfo.stripePaymentToken = token.id;
                this.submitFullMailingAfterCharge();
                this.$scope.$apply();
            }
        }
    }
    MailingInvoiceController.$inject = ["$http", "SiteInfo", "fellowResidents", "WizardHandler", "$scope", "$timeout", "$location"];
    Ally.MailingInvoiceController = MailingInvoiceController;
})(Ally || (Ally = {}));
CA.angularApp.component("mailingInvoice", {
    templateUrl: "/ngApp/common/mailing/mailing-invoice.html",
    controller: Ally.MailingInvoiceController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the mailing parent view
     */
    class MailingParentController {
        /**
        * The constructor for the class
        */
        constructor($http, siteInfo, $routeParams, $cacheFactory, $rootScope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$routeParams = $routeParams;
            this.$cacheFactory = $cacheFactory;
            this.$rootScope = $rootScope;
            this.selectedView = null;
            this.selectedView = this.$routeParams.viewName || "Invoice";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
        }
    }
    MailingParentController.$inject = ["$http", "SiteInfo", "$routeParams", "$cacheFactory", "$rootScope"];
    Ally.MailingParentController = MailingParentController;
})(Ally || (Ally = {}));
CA.angularApp.component("mailingParent", {
    templateUrl: "/ngApp/common/mailing/mailing-parent.html",
    controller: Ally.MailingParentController
});

var Ally;
(function (Ally) {
    class MaintenanceProject {
    }
    Ally.MaintenanceProject = MaintenanceProject;
    class TagPickerItem {
    }
    class Equipment {
    }
    class VendorListItem {
    }
    Ally.VendorListItem = VendorListItem;
    class MaintenanceController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope, siteInfo, maintenanceService, fellowResidents) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.maintenanceService = maintenanceService;
            this.fellowResidents = fellowResidents;
            this.isSiteManager = false;
            this.shouldShowEditEquipmentModal = false;
            this.shouldShowManageEquipmentModal = false;
            this.maintenanceEntries = [];
            this.assigneeOptions = [];
            this.entriesSortAscending = true;
            this.equipmentTypeOptions = _.map(MaintenanceController.AutocompleteEquipmentTypeOptions, o => o.text);
            this.equipmentLocationOptions = _.map(MaintenanceController.AutocompleteLocationOptions, o => o.text);
            this.maintenanceTodoListId = siteInfo.privateSiteInfo.maintenanceTodoListId;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.equipmentGridOptions =
                {
                    data: [],
                    columnDefs: [
                        {
                            field: 'name',
                            displayName: 'Name',
                            cellTemplate: '<div class="ui-grid-cell-contents"><span class="text-link" data-ng-if="grid.appScope.$ctrl.isSiteManager" data-ng-click="grid.appScope.$ctrl.editEquipment( row.entity )">{{ row.entity.name }}</span><span data-ng-if="!grid.appScope.$ctrl.isSiteManager">{{ row.entity.name }}</span></div>'
                        },
                        { field: 'type', displayName: 'Type', width: 150 },
                        { field: 'installDate', displayName: "Installed", width: 90, cellFilter: "date:'shortDate'", type: "date" },
                        { field: 'initialCost', displayName: 'Cost', width: 90, cellFilter: "currency", type: "number" },
                        { field: 'addedDateUtc', displayName: 'Added', width: 90, cellFilter: "date:'shortDate'", type: "date" }
                    ],
                    multiSelect: false,
                    enableSorting: true,
                    enableHorizontalScrollbar: 0,
                    enableVerticalScrollbar: 1,
                    enableFullRowSelection: false,
                    enableColumnMenus: false,
                    enableRowHeaderSelection: false,
                    onRegisterApi: function (gridApi) {
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.fellowResidents.getResidents().then(residents => this.assigneeOptions = _.clone(residents)); // Cloned so we can edit locally
            this.entriesSortField = window.localStorage[MaintenanceController.StorageKey_SortField];
            if (!this.entriesSortField) {
                this.entriesSortField = "entryDate";
                this.entriesSortAscending = true;
            }
            else
                this.entriesSortAscending = window.localStorage[MaintenanceController.StorageKey_SortDir] === "true";
            this.loadEquipment()
                .then(() => this.loadVendors())
                .then(() => this.loadProjects())
                .then(() => this.loadMaintenanceTodos())
                .then(() => this.rebuildMaintenanceEntries());
        }
        /**
        * Rebuild the arrow of projects and to-do's
        */
        rebuildMaintenanceEntries() {
            this.maintenanceEntries = [];
            _.forEach(this.projects, p => {
                var newEntry = new Ally.MaintenanceEntry();
                newEntry.project = p;
                this.maintenanceEntries.push(newEntry);
            });
            _.forEach(this.maintenanceTodos.todoItems, t => {
                var newEntry = new Ally.MaintenanceEntry();
                newEntry.todo = t;
                this.maintenanceEntries.push(newEntry);
            });
            this.sortEntries();
        }
        /**
        * Retrieve the equipment available for this group
        */
        loadEquipment() {
            this.isLoading = true;
            return this.$http.get("/api/Maintenance/Equipment").then((response) => {
                this.isLoading = false;
                this.equipmentOptions = response.data;
                // Deep clone the data so we can modify the data
                this.equipmentGridOptions.data = JSON.parse(JSON.stringify(this.equipmentOptions));
                var addNewOption = new Equipment();
                addNewOption.name = "Add New...";
                addNewOption.equipmentId = MaintenanceController.EquipmentId_AddNew;
                this.equipmentOptions.push(addNewOption);
                _.forEach(this.equipmentOptions, e => {
                    e.typeTags = [{ text: e.type }];
                    e.locationTags = [{ text: e.location }];
                });
                // If this model displayed from the edit project modal
                if (this.editingProject
                    && this.editingProject.equipmentId === MaintenanceController.EquipmentId_AddNew
                    && this.equipmentOptions.length > 0) {
                    this.editingProject.equipmentId = _.max(this.equipmentOptions, e => e.equipmentId).equipmentId;
                }
            }, (response) => {
                this.isLoading = false;
                alert("Failed to retrieve equipment: " + response.data.exceptionMessage);
            });
        }
        /**
        * Occurs when the user clicks the button to delete equipment
        */
        deleteEquipment() {
            if (!confirm("Are you sure you want to delete this equipment? This action cannot be undone."))
                return;
            this.isLoading = true;
            this.$http.delete("/api/Maintenance/Equipment/" + this.editingEquipment.equipmentId).then(() => {
                this.isLoading = false;
                this.editingEquipment = null;
                this.shouldShowEditEquipmentModal = false;
                this.loadEquipment()
                    .then(() => this.loadProjects())
                    .then(() => this.rebuildMaintenanceEntries());
            }, (response) => {
                this.isLoading = false;
                alert("Failed to delete the equipment: " + response.data.exceptionMessage);
            });
        }
        /**
        * Retrieve the equipment available for this group
        */
        loadVendors() {
            this.isLoading = true;
            return this.$http.get("/api/PreferredVendors/ListItems").then((response) => {
                this.isLoading = false;
                this.vendorOptions = response.data;
            }, (response) => {
                this.isLoading = false;
                alert("Failed to retrieve vendors: " + response.data.exceptionMessage);
            });
        }
        /**
        * Occurs when the user selects an equipment from the project modal
        */
        onEquipmentSelectionChange() {
            if (this.editingProject.equipmentId === MaintenanceController.EquipmentId_AddNew)
                this.openAddNewEquipment();
        }
        /**
        * Retrieve the maintenance projects from the server
        */
        loadProjects() {
            this.isLoading = true;
            return this.maintenanceService.loadProjects().then((projects) => {
                this.isLoading = false;
                this.projects = projects;
            }, (error) => {
                this.isLoading = false;
                alert("Failed to retrieve projects: " + error.exceptionMessage);
            });
        }
        /**
        * Retrieve the maintenance to-do's from the server
        */
        loadMaintenanceTodos() {
            this.isLoading = true;
            return this.$http.get("/api/Todo/MaintenanceList").then((response) => {
                this.isLoading = false;
                this.maintenanceTodos = response.data;
            });
        }
        /**
         * An event handler invoked when the user selects a project start date
         */
        onProjectStartDateChange() {
            if (!this.editingProject.endDate)
                this.editingProject.endDate = this.editingProject.startDate;
        }
        /**
         * Display the modal to create a new project
         */
        openAddNewProject() {
            this.editingProject = new MaintenanceProject();
            setTimeout(() => $("#project-title-text-box").focus(), 100);
        }
        /**
         * Display the modal to add a new piece of equipment
         */
        openAddNewEquipment() {
            this.shouldShowEditEquipmentModal = true;
            this.editingEquipment = new Equipment();
            setTimeout(() => $("#equipment-name-text-box").focus(), 100);
        }
        /**
         * Save a project
         */
        saveProject() {
            this.isLoading = true;
            let httpFunc;
            if (this.editingProject.maintenanceProjectId)
                httpFunc = this.$http.put;
            else
                httpFunc = this.$http.post;
            httpFunc("/api/Maintenance/Project", this.editingProject).then(() => {
                this.isLoading = false;
                this.editingProject = null;
                this.loadProjects().then(() => this.rebuildMaintenanceEntries());
            }, (response) => {
                this.isLoading = false;
                alert("Failed to save: " + response.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user changes the new entry type
         */
        onEntryTypeChange(type) {
            if (type === "todo") {
                this.editingTodo = new Ally.TodoItem();
                this.editingTodo.owningTodoListId = this.maintenanceTodoListId;
                this.selectedAssignee = [];
                if (this.editingProject)
                    this.editingTodo.description = this.editingProject.title;
                this.editingProject = null;
                setTimeout(() => $("#edit-todo-name-text-box").focus(), 50);
            }
            else {
                this.editingProject = new MaintenanceProject();
                if (this.editingTodo)
                    this.editingProject.title = this.editingTodo.description;
                this.editingTodo = null;
                setTimeout(() => $("#project-title-text-box").focus(), 50);
            }
        }
        /**
         * Save a todo
         */
        saveTodo() {
            this.isLoading = true;
            if (this.selectedAssignee && this.selectedAssignee.length > 0)
                this.editingTodo.assignedToUserId = this.selectedAssignee[0].userId;
            let httpFunc;
            if (this.editingTodo.todoItemId)
                httpFunc = this.$http.put;
            else
                httpFunc = this.$http.post;
            httpFunc("/api/Todo/Item", this.editingTodo).then(() => {
                this.isLoading = false;
                this.editingTodo = null;
                this.selectedAssignee = [];
                this.loadMaintenanceTodos().then(() => this.rebuildMaintenanceEntries());
            }, (response) => {
                this.isLoading = false;
                alert("Failed to save: " + response.data.exceptionMessage);
            });
        }
        /**
         * Save equipment information
         */
        saveEquipment() {
            this.isLoading = true;
            // Convert the tags to strings
            //if( this.editingEquipment.typeTags && this.editingEquipment.typeTags.length > 0 )
            //    this.editingEquipment.type = this.editingEquipment.typeTags[0].text;
            //else
            //    this.editingEquipment.type = undefined;
            //if( this.editingEquipment.locationTags && this.editingEquipment.locationTags.length > 0 )
            //    this.editingEquipment.location = this.editingEquipment.locationTags[0].text;
            //else
            //    this.editingEquipment.location = undefined;            
            let httpFunc;
            if (this.editingEquipment.equipmentId)
                httpFunc = this.$http.put;
            else
                httpFunc = this.$http.post;
            httpFunc("/api/Maintenance/Equipment", this.editingEquipment).then(() => {
                this.isLoading = false;
                this.shouldShowEditEquipmentModal = false;
                this.loadEquipment();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to save: " + response.data.exceptionMessage);
            });
        }
        getEquipmentLocationAutocomplete(enteredText) {
            if (HtmlUtil.isNullOrWhitespace(enteredText))
                return MaintenanceController.AutocompleteLocationOptions;
            return _.where(MaintenanceController.AutocompleteLocationOptions, (option) => option.text.toLowerCase().indexOf(enteredText.toLowerCase()) !== -1);
        }
        /**
         * Get the auto-complete options based on when the user has already typed
         */
        getEquipmentTypeAutocomplete(enteredText) {
            if (this.editingEquipment.typeTags && this.editingEquipment.typeTags.length > 0 && !HtmlUtil.isNullOrWhitespace(this.editingEquipment.typeTags[0].text))
                return [];
            if (HtmlUtil.isNullOrWhitespace(enteredText))
                return MaintenanceController.AutocompleteEquipmentTypeOptions;
            return _.where(MaintenanceController.AutocompleteEquipmentTypeOptions, (option) => option.text.toLowerCase().indexOf(enteredText.toLowerCase()) !== -1);
        }
        /**
         * Open the equipment edit modal for the selected project
         */
        editEquipment(equipment) {
            this.shouldShowEditEquipmentModal = true;
            this.editingEquipment = _.clone(equipment);
            setTimeout(() => $("#equipment-name-text-box").focus(), 100);
        }
        /**
         * Occurs when the user clicks the button to edit a selected entry
         */
        onEditEntry(entry) {
            if (entry.project)
                this.editProject(entry.project);
            else {
                this.editingTodo = _.clone(entry.todo);
                // Needed for the searchable drop-down
                for (let i = 0; i < this.assigneeOptions.length; ++i)
                    (this.assigneeOptions[i]).isSelectedAssignee = false;
                //_.forEach( this.assigneeOptions, u => ( <any>u ).isSelectedAssignee = false );
                var foundAssignee = _.find(this.assigneeOptions, u => u.userId === this.editingTodo.assignedToUserId);
                if (foundAssignee) {
                    // Set isSelectedAssignee on a cloned object so we don't change the base list
                    foundAssignee.isSelectedAssignee = true;
                    this.selectedAssignee = [foundAssignee];
                }
                else
                    this.selectedAssignee = [];
                setTimeout(() => $("#edit-todo-name-text-box").focus(), 100);
            }
        }
        /**
         * Occurs when the user clicks the button to edit a selected entry
         */
        onDeleteEntry(entry) {
            if (!confirm("Are you sure you want to delete this entry? This action cannot be undone."))
                return;
            if (entry.project)
                this.onDeleteProject(entry.project);
            else {
                this.isLoading = true;
                this.$http.delete("/api/Todo/Item/" + entry.todo.todoItemId).then(() => {
                    this.isLoading = false;
                    this.loadMaintenanceTodos().then(() => this.rebuildMaintenanceEntries());
                }, (response) => {
                    this.isLoading = false;
                    alert("Failed to delete to-do: " + response.data.exceptionMessage);
                });
            }
        }
        /**
         * Open the project edit modal for the selected project
         */
        editProject(project) {
            this.editingProject = _.clone(project);
            setTimeout(() => $("#project-title-text-box").focus(), 100);
        }
        /**
         * Occurs when the user clicks the button to remove a project
         */
        onDeleteProject(project) {
            this.isLoading = true;
            this.$http.delete("/api/Maintenance/Project/" + project.maintenanceProjectId).then(() => {
                this.isLoading = false;
                this.loadProjects().then(() => this.rebuildMaintenanceEntries());
            }, (response) => {
                this.isLoading = false;
                alert("Failed to delete: " + response.data.exceptionMessage);
            });
        }
        /**
         * Export the maintenance records as a CSV (Ignores to-do items for simplicity's sake)
         */
        exportMaintenanceCsv() {
            if (typeof (analytics) !== "undefined")
                analytics.track('exportMaintenanceCsv');
            const csvColumns = [
                {
                    headerText: "Title",
                    fieldName: "title"
                },
                {
                    headerText: "Start Date",
                    fieldName: "startDate",
                    dataMapper: function (value) {
                        if (!value)
                            return "";
                        return moment(value).format("YYYY-MM-DD");
                    }
                },
                {
                    headerText: "End Date",
                    fieldName: "endDate",
                    dataMapper: function (value) {
                        if (!value)
                            return "";
                        return moment(value).format("YYYY-MM-DD");
                    }
                },
                {
                    headerText: "Description",
                    fieldName: "descriptionText"
                },
                {
                    headerText: "Cost",
                    fieldName: "cost"
                },
                {
                    headerText: "Vendor",
                    fieldName: "vendorCompanyName"
                },
                {
                    headerText: "Related Equipment",
                    fieldName: "equipmentName"
                },
                {
                    headerText: "Entered By",
                    fieldName: "creatorFullName"
                },
                {
                    headerText: "Status",
                    fieldName: "status"
                },
                {
                    headerText: "Assigned To",
                    fieldName: "assignedTo"
                }
            ];
            const projects = _.map(_.filter(this.maintenanceEntries, e => !!e.project), e => e.project);
            const csvDataString = Ally.createCsvString(projects, csvColumns);
            Ally.HtmlUtil2.downloadCsv(csvDataString, "Maintenance.csv");
        }
        /**
         * Sort the entries by a certain field
         */
        sortEntries() {
            const sortEntry = (e) => {
                if (this.entriesSortField === "status")
                    return e.project ? e.project.status : "ZZZZZ";
                else if (this.entriesSortField === "startDate")
                    return e.project ? e.project.startDate : new Date(1001, 12, 30);
                else
                    return e.getCreatedDate();
            };
            //console.log( `Sort by ${this.entriesSortField}, dir ${this.entriesSortAscending}` );
            this.maintenanceEntries = _.sortBy(this.maintenanceEntries, sortEntry);
            const shouldReverse = this.entriesSortField === "status" ? this.entriesSortAscending : !this.entriesSortAscending;
            if (shouldReverse)
                this.maintenanceEntries.reverse();
        }
        /**
         * Sort the entries by a certain field
         */
        updateEntriesSort(fieldName) {
            if (!fieldName)
                fieldName = "entryDate";
            if (this.entriesSortField === fieldName)
                this.entriesSortAscending = !this.entriesSortAscending;
            else {
                this.entriesSortField = fieldName;
                this.entriesSortAscending = false;
            }
            window.localStorage[MaintenanceController.StorageKey_SortField] = this.entriesSortField;
            window.localStorage[MaintenanceController.StorageKey_SortDir] = this.entriesSortAscending;
            this.sortEntries();
        }
    }
    MaintenanceController.$inject = ["$http", "$rootScope", "SiteInfo", "maintenance", "fellowResidents"];
    MaintenanceController.StorageKey_SortField = "maintenance_entriesSortField";
    MaintenanceController.StorageKey_SortDir = "maintenance_entriesSortAscending";
    MaintenanceController.EquipmentId_AddNew = -5;
    MaintenanceController.AutocompleteLocationOptions = [{ text: "Attic" },
        { text: "Back Yard" },
        { text: "Basement" },
        { text: "Front Yard" },
        { text: "Garage" },
        { text: "Interior" },
        { text: "Kitchen" },
        { text: "Exterior" },
        { text: "Side of Building" },
        { text: "Structural" }];
    MaintenanceController.AutocompleteEquipmentTypeOptions = [{ text: "Appliance" },
        { text: "Deck" },
        { text: "Driveway" },
        { text: "HVAC" },
        { text: "Patio" },
        { text: "Plumbing" },
        { text: "Roof" },
        { text: "Siding" },
        { text: "Structural" }];
    Ally.MaintenanceController = MaintenanceController;
})(Ally || (Ally = {}));
CA.angularApp.component("maintenance", {
    bindings: {},
    templateUrl: "/ngApp/common/maintenance.html",
    controller: Ally.MaintenanceController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the widget that lets members see work todo
     */
    class MaintenanceWidgetController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope, siteInfo) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.upcomingWork = [];
            this.recentProjects = [];
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            this.loadProjects();
        }
        /**
        * Retrieve the maintenance projects from the server
        */
        loadProjects() {
            this.isLoading = true;
            return this.$http.get("/api/Maintenance/Projects").then((response) => {
                this.isLoading = false;
                this.recentProjects = _.take(response.data, 3);
            }, (response) => {
                this.isLoading = false;
                alert("Failed to retrieve projects: " + response.data.exceptionMessage);
            });
        }
    }
    MaintenanceWidgetController.$inject = ["$http", "$rootScope", "SiteInfo"];
    Ally.MaintenanceWidgetController = MaintenanceWidgetController;
})(Ally || (Ally = {}));
CA.angularApp.component("maintenanceWidget", {
    templateUrl: "/ngApp/common/maintenance-widget.html",
    controller: Ally.MaintenanceWidgetController
});

/// <reference path="../../Scripts/typings/googlemaps/google.maps.d.ts" />
/// <reference path="../../Scripts/typings/underscore/underscore.d.ts" />
var Ally;
(function (Ally) {
    /**
     * Represents a street address
     */
    class SplitAddress {
    }
    Ally.SplitAddress = SplitAddress;
    /**
     * Represents a GPS position, analgolous to TCCommonWeb.GpsPoint
     */
    class GpsPoint {
    }
    Ally.GpsPoint = GpsPoint;
    /**
     * Represents a polygon with GPS coordinates for vertices, analgolous to TCCommonWeb.GpsPolygon
     */
    class GpsPolygon {
    }
    Ally.GpsPolygon = GpsPolygon;
    /**
     * Represents a street address
     */
    class FullAddress {
    }
    Ally.FullAddress = FullAddress;
    /**
     * Provides helper methods for dealing with map information
     */
    class MapUtil {
        /**
         * Initialize the Google map on the page
         * @param addressComponents The address data returned from AutoComplete or a geocode
         */
        static parseAddressComponents(addressComponents) {
            let splitAddress = new SplitAddress();
            let streetNumber = "";
            let streetName = "";
            for (var component of addressComponents) {
                if (component.types.indexOf("street_number") !== -1)
                    streetNumber = component.short_name;
                else if (component.types.indexOf("route") !== -1)
                    streetName = component.short_name;
                else if (component.types.indexOf("locality") !== -1)
                    splitAddress.city = component.short_name;
                else if (component.types.indexOf("administrative_area_level_1") !== -1)
                    splitAddress.state = component.short_name;
                else if (component.types.indexOf("postal_code") !== -1)
                    splitAddress.zip = component.short_name;
                else if (component.types.indexOf("country") !== -1)
                    splitAddress.country = component.short_name;
            }
            splitAddress.street = streetNumber + " " + streetName;
            return splitAddress;
        }
        /**
         * Convert Community Ally bounds to Google bounds
         * @param gpsBounds The array of
         */
        static gpsBoundsToGooglePoly(gpsBounds) {
            var path = _.map(gpsBounds.vertices, function (v) {
                return new google.maps.LatLng(v.lat, v.lon);
            });
            return path;
        }
        ;
    }
    Ally.MapUtil = MapUtil;
})(Ally || (Ally = {}));

var Ally;
(function (Ally) {
    class PaymentInfo {
    }
    /**
     * The controller for the widget that lets residents pay their assessments
     */
    class PayPalPaymentFormController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, $rootScope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$rootScope = $rootScope;
            this.isLoading = false;
            this.returnUrl = "https://localtest.mycondoally.com/#!/Home";
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            // Grab the assessment from the user's unit (TODO handle multiple units)
            if (this.siteInfo.userInfo.usersUnits != null && this.siteInfo.userInfo.usersUnits.length > 0)
                this.assessmentAmount = this.siteInfo.userInfo.usersUnits[0].assessment;
            else
                this.assessmentAmount = 0;
            this.errorPayInfoText = "Is the amount incorrect?";
            this.paymentInfo =
                {
                    paymentType: "other",
                    amount: this.assessmentAmount,
                    note: "",
                    fundingType: null,
                    paysFor: null
                };
            var MaxNumRecentPayments = 6;
            this.recentPayments = this.siteInfo.userInfo.recentPayments;
            if (this.recentPayments && this.recentPayments.length > 0) {
                if (this.recentPayments.length > MaxNumRecentPayments)
                    this.recentPayments = this.recentPayments.slice(0, MaxNumRecentPayments);
                // Fill up the list so there's always MaxNumRecentPayments
                while (this.recentPayments.length < MaxNumRecentPayments)
                    this.recentPayments.push({});
            }
            // If the user lives in a unit and assessments are enabled
            if (this.siteInfo.privateSiteInfo.assessmentFrequency != null
                && this.siteInfo.userInfo.usersUnits != null
                && this.siteInfo.userInfo.usersUnits.length > 0) {
                this.paymentInfo.paymentType = "periodic";
                if (this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled) {
                    this.knowsNextPayment = true;
                    this.errorPayInfoText = "Is the amount or date incorrect?";
                    this.nextPaymentText = this.getNextPaymentText([this.siteInfo.userInfo.usersUnits[0].nextAssessmentDue], this.siteInfo.privateSiteInfo.assessmentFrequency);
                    this.updatePaymentText();
                }
            }
            setTimeout(() => {
                $('#btn_view_pay_history').click(function () {
                    $('#pm_info').collapse('hide');
                    $('#payment_history').collapse('show');
                });
                $('#btn_view_pay_info').click(function () {
                    $('#payment_history').collapse('hide');
                    $('#pm_info').collapse('show');
                });
                $('.hide').click(function () {
                    $(this).parent().hide('');
                });
            }, 400);
            paypal.Button.render({
                //env: "production",
                env: "sandbox",
                commit: true,
                style: {
                    color: 'gold',
                    size: 'medium'
                },
                client: {
                    sandbox: null,
                    production: "AW51-dH9dRrczrhVVf1kZyavtifN8z23Q0BTJwpWcTJQL6YoqGCTwOb0JfbCHTJIA_usIXAgrxwQ7osQ"
                },
                payment: (data, actions) => {
                    this.isLoading = true;
                    /*
                     * Set up the payment here
                     */
                    return actions.payment.create({
                        payment: {
                            transactions: [
                                {
                                    amount: { total: this.paymentInfo.amount.toString(), currency: 'USD' }
                                }
                            ]
                        }
                    });
                },
                onAuthorize: (data, actions) => {
                    /*
                     * Execute the payment here
                     */
                    return actions.payment.execute().then((payment) => {
                        // The payment is complete!
                        // Tell the server about payment.id with memo
                        var memoInfo = {
                            PayPalCheckoutId: payment.id,
                            Memo: this.paymentInfo.note
                        };
                        this.isLoading = true;
                        this.$http.put("/api/OnlinePayment/SetMemo", memoInfo).then((httpResponse) => {
                            this.isLoading = false;
                        }, (httpResponse) => {
                            this.isLoading = false;
                            alert("Failed to save: " + httpResponse.data.exceptionMessage);
                        });
                        // You can now show a confirmation message to the customer
                    });
                },
                onCancel: (data, actions) => {
                    this.isLoading = false;
                    /*
                     * Buyer canceled the payment
                     */
                },
                onError: (err) => {
                    this.isLoading = false;
                    /*
                     * An error occurred during the transaction
                     */
                }
            }, "#paypal-button");
        }
        /**
         * Occurs when the user clicks the helper link to prep an email to inquire the board as to
         * why their records don't line up.
         */
        onIncorrectPayDetails() {
            // Get the friendly looking assessment value (ex: 100, 101, 102.50)
            let amountString = this.assessmentAmount.toString();
            if (Math.round(this.assessmentAmount) != this.assessmentAmount)
                amountString = this.assessmentAmount.toFixed(2);
            // Tell the groupSendEmail component to prep an email for the board
            let prepEventData = amountString;
            if (this.knowsNextPayment && HtmlUtil.isValidString(this.nextPaymentText))
                prepEventData += "|" + this.nextPaymentText;
            this.$rootScope.$broadcast("prepAssessmentEmailToBoard", prepEventData);
        }
        /**
         * Generate the friendly string describing to what the member's next payment applies
         */
        getNextPaymentText(payPeriods, assessmentFrequency) {
            if (payPeriods == null)
                return "";
            // Ensure the periods is an array
            if (payPeriods.constructor !== Array)
                payPeriods = [payPeriods];
            var paymentText = "";
            var frequencyInfo = FrequencyIdToInfo(assessmentFrequency);
            for (var periodIndex = 0; periodIndex < payPeriods.length; ++periodIndex) {
                var curPeriod = payPeriods[periodIndex];
                if (frequencyInfo.intervalName === "month") {
                    var monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
                    paymentText = monthNames[curPeriod.period - 1];
                }
                else if (frequencyInfo.intervalName === "quarter") {
                    var periodNames = ["Q1", "Q2", "Q3", "Q4"];
                    paymentText = periodNames[curPeriod.period - 1];
                }
                else if (frequencyInfo.intervalName === "half-year") {
                    var periodNames = ["First Half", "Second Half"];
                    paymentText = periodNames[curPeriod.period - 1];
                }
                paymentText += " " + curPeriod.year;
                this.paymentInfo.paysFor = [curPeriod];
            }
            return paymentText;
        }
        /**
         * Occurs when the user selects a payment type radio button
         */
        onSelectPaymentType(paymentType) {
            this.paymentInfo.paymentType = paymentType;
            this.paymentInfo.amount = paymentType == "periodic" ? this.assessmentAmount : 0;
            this.updatePaymentText();
        }
        /**
         * Refresh the note text for the payment field
         */
        updatePaymentText() {
            if (this.paymentInfo.paymentType === "periodic" && this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled) {
                // If we have a next payment string
                if (!HtmlUtil.isNullOrWhitespace(this.nextPaymentText)) {
                    if (this.siteInfo.userInfo.usersUnits[0].includesLateFee)
                        this.paymentInfo.note = "Assessment payment with late fee for ";
                    else
                        this.paymentInfo.note = "Assessment payment for ";
                    this.paymentInfo.note += this.nextPaymentText;
                }
            }
            else {
                this.paymentInfo.note = "";
            }
        }
    }
    PayPalPaymentFormController.$inject = ["$http", "SiteInfo", "$rootScope"];
    Ally.PayPalPaymentFormController = PayPalPaymentFormController;
})(Ally || (Ally = {}));
CA.angularApp.component("paypalPaymentForm", {
    templateUrl: "/ngApp/common/paypal-payment-form.html",
    controller: Ally.PayPalPaymentFormController
});

var Ally;
(function (Ally) {
    /**
     * The controller for an individual vendor entry
     */
    class PreferredVendorItemController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.isSiteManager = false;
            this.isInEditMode = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.isAddForm = this.vendorItem == null;
            if (this.isAddForm) {
                this.isInEditMode = true;
                this.vendorItem = new Ally.PreferredVendor();
                this.editVendorItem = new Ally.PreferredVendor();
                // Wait until the page renders then hook up the autocomplete
                window.setTimeout(() => this.hookupAddressAutocomplete(), 500);
            }
        }
        /**
         * Attach the Google Places auto-complete logic to the address text box
         */
        hookupAddressAutocomplete() {
            // Also mask phone numbers
            if (this.siteInfo.privateSiteInfo.country === "US" || this.siteInfo.privateSiteInfo.country === "CA") {
                const phoneFields = $(".mask-phone");
                phoneFields.mask("(999) 999-9999? x999", { autoclear: false });
            }
            // If we know our group's position, let's tighten the auto-complete suggestion radius
            let autocompleteOptions = undefined;
            if (this.siteInfo.privateSiteInfo.googleGpsPosition) {
                const TwentyFiveMilesInMeters = 40234;
                const circle = new google.maps.Circle({
                    center: this.siteInfo.privateSiteInfo.googleGpsPosition,
                    radius: TwentyFiveMilesInMeters
                });
                autocompleteOptions = {
                    bounds: circle.getBounds()
                };
            }
            const addressInput = document.getElementById("vendor-" + (this.vendorItem.preferredVendorId || "") + "-address-text-box");
            this.addressAutocomplete = new google.maps.places.Autocomplete(addressInput, autocompleteOptions);
            google.maps.event.addListener(this.addressAutocomplete, "place_changed", () => {
                const place = this.addressAutocomplete.getPlace();
                if (!this.editVendorItem.fullAddress)
                    this.editVendorItem.fullAddress = new Ally.FullAddress();
                this.editVendorItem.fullAddress.oneLiner = place.formatted_address;
            });
        }
        /**
         * Called when the user clicks the button to save the new/edit vendor data
         */
        onSaveVendor() {
            if (HtmlUtil.isNullOrWhitespace(this.editVendorItem.companyName)) {
                alert("Please enter a company name");
                return;
            }
            if (!this.editVendorItem.servicesTagArray || this.editVendorItem.servicesTagArray.length === 0) {
                alert("Please enter at least one service provided");
                return;
            }
            // Ensure the website starts properly
            if (!HtmlUtil.isNullOrWhitespace(this.editVendorItem.companyWeb)) {
                if (this.editVendorItem.companyWeb.indexOf("http") !== 0)
                    this.editVendorItem.companyWeb = "http://" + this.editVendorItem.companyWeb;
            }
            const saveMethod = this.editVendorItem.preferredVendorId == null ? this.$http.post : this.$http.put;
            this.isLoading = true;
            // Process ng-tag-input model into a pipe-separated string for the server
            let servicesProvidedString = "";
            _.each(this.editVendorItem.servicesTagArray, (tag) => {
                servicesProvidedString += "|" + tag.text;
            });
            servicesProvidedString += "|";
            this.editVendorItem.servicesProvided = servicesProvidedString;
            saveMethod("/api/PreferredVendors", this.editVendorItem).then(() => {
                this.isLoading = false;
                if (this.isAddForm) {
                    this.editVendorItem = new Ally.PreferredVendor();
                    if (this.onAddNewVendor)
                        this.onAddNewVendor();
                }
                else
                    this.isInEditMode = false;
                if (this.onParentDataNeedsRefresh)
                    this.onParentDataNeedsRefresh();
            }, (exception) => {
                this.isLoading = false;
                alert("Failed to save the vendor information: " + exception.exceptionMessage);
            });
        }
        onCancelEdit() {
            this.isInEditMode = false;
        }
        onEditItem() {
            // Deep clone the vendor item
            this.editVendorItem = JSON.parse(JSON.stringify(this.vendorItem));
            this.isInEditMode = true;
            window.setTimeout(() => this.hookupAddressAutocomplete(), 500);
        }
        deleteItem() {
            if (!confirm("Are you sure you want to remove this vendor?"))
                return;
            this.isLoading = true;
            this.$http.delete("/api/PreferredVendors/" + this.vendorItem.preferredVendorId).then(() => {
                this.isLoading = false;
                if (this.onParentDataNeedsRefresh)
                    this.onParentDataNeedsRefresh();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to delete the vendor: " + response.data.exceptionMessage);
            });
        }
        getServiceAutocomplete(enteredText) {
            return _.where(PreferredVendorItemController.AutocompleteServiceOptions, (option) => option.text.toLowerCase().indexOf(enteredText.toLowerCase()) !== -1);
        }
    }
    PreferredVendorItemController.$inject = ["$http", "SiteInfo"];
    PreferredVendorItemController.AutocompleteServiceOptions = [{ text: "Additions & Remodels" },
        { text: "Appliances" },
        { text: "Cabinets & Countertops" },
        { text: "Cleaning" },
        { text: "Concrete & Masonry" },
        { text: "Deck, Porch, & Gazebo" },
        { text: "Drywall & Insulation" },
        { text: "Electrical" },
        { text: "Fencing" },
        { text: "Flooring" },
        { text: "Garages" },
        { text: "Gutters" },
        { text: "Handy Man" },
        { text: "HVAC" },
        { text: "Landscaping, Lawn Care & Sprinklers" },
        { text: "Painting & Staining" },
        { text: "Pest Control" },
        { text: "Plumbing" },
        { text: "Remodeling" },
        { text: "Roofing" },
        { text: "Siding" },
        { text: "Snow Removal" },
        { text: "Solar Electric, Heating & Cooling" },
        { text: "Swimming Pools" },
        { text: "Windows & Doors" }];
    Ally.PreferredVendorItemController = PreferredVendorItemController;
})(Ally || (Ally = {}));
CA.angularApp.component("preferredVendorItem", {
    bindings: {
        vendorItem: "=?",
        onParentDataNeedsRefresh: "&?",
        onAddNewVendor: "&?"
    },
    templateUrl: "/ngApp/common/preferred-vendor-item.html",
    controller: Ally.PreferredVendorItemController
});

var Ally;
(function (Ally) {
    class PreferredVendor {
        constructor() {
            this.fullAddress = new Ally.FullAddress();
        }
    }
    Ally.PreferredVendor = PreferredVendor;
    /**
     * The controller for the vendors page
     */
    class PreferredVendorsController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.allVendors = [];
            this.filteredVendors = [];
            this.editVendor = new PreferredVendor();
            this.isLoading = false;
            this.isSiteManager = false;
            this.usedServiceTags = [];
            this.filterTags = [];
            this.entriesSortAscending = true;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.entriesSortField = window.localStorage[PreferredVendorsController.StorageKey_SortField];
            if (!this.entriesSortField) {
                this.entriesSortField = "name";
                this.entriesSortAscending = false;
            }
            else
                this.entriesSortAscending = window.localStorage[PreferredVendorsController.StorageKey_SortDir] === "true";
            this.retrieveVendors();
        }
        /**
         * Populate the vendors
         */
        retrieveVendors() {
            this.isLoading = true;
            this.$http.get("/api/PreferredVendors").then((response) => {
                const vendors = response.data;
                this.isLoading = false;
                this.allVendors = vendors;
                this.filteredVendors = vendors;
                this.sortEntries();
                // Process the tags into an array for the ng-tag-input control, build the list of
                // all used tags, and convert the add dates to local time
                this.usedServiceTags = [];
                _.each(this.allVendors, (v) => {
                    v.servicesTagArray = [];
                    _.each(v.servicesProvidedSplit, (ss) => v.servicesTagArray.push({ text: ss }));
                    this.usedServiceTags = this.usedServiceTags.concat(v.servicesProvidedSplit);
                    // Convert the added timestamps to local time
                    v.addedDateUtc = moment.utc(v.addedDateUtc).toDate();
                });
                // Remove any duplicate tags
                this.usedServiceTags = _.uniq(this.usedServiceTags);
                this.usedServiceTags.sort();
            });
        }
        /**
         * Export the vendor list as a CSV
         */
        exportVendorCsv() {
            if (typeof (analytics) !== "undefined")
                analytics.track('exportResidentCsv');
            const csvColumns = [
                {
                    headerText: "Company Name",
                    fieldName: "companyName"
                },
                {
                    headerText: "Company Phone",
                    fieldName: "companyPhone"
                },
                {
                    headerText: "Company Website",
                    fieldName: "companyWeb"
                },
                {
                    headerText: "Address",
                    fieldName: "fullAddress",
                    dataMapper: (value) => {
                        return !value ? "" : value.oneLiner;
                    }
                },
                {
                    headerText: "Contact Name",
                    fieldName: "contactName"
                },
                {
                    headerText: "Contact Phone",
                    fieldName: "contactPhone"
                },
                {
                    headerText: "Contact Email",
                    fieldName: "contactEmail"
                },
                {
                    headerText: "Services",
                    fieldName: "servicesProvided",
                    dataMapper: function (servicesProvided) {
                        if (HtmlUtil.isNullOrWhitespace(servicesProvided))
                            return servicesProvided;
                        // Trim leading and trailing pipes
                        if (HtmlUtil.startsWith(servicesProvided, "|"))
                            servicesProvided = servicesProvided.substr(1);
                        if (HtmlUtil.endsWith(servicesProvided, "|"))
                            servicesProvided = servicesProvided.substr(0, servicesProvided.length - 1);
                        return servicesProvided;
                    }
                },
                {
                    headerText: "Notes",
                    fieldName: "notes"
                }
            ];
            var csvDataString = Ally.createCsvString(this.allVendors, csvColumns);
            Ally.HtmlUtil2.downloadCsv(csvDataString, "Vendors.csv");
        }
        onTagFilterToggle(tagName) {
            // Add if the tag to our filter list if it's not there, remove it if it is
            var tagCurrentIndex = this.filterTags.indexOf(tagName);
            if (tagCurrentIndex === -1)
                this.filterTags.push(tagName);
            else
                this.filterTags.splice(tagCurrentIndex, 1);
            if (this.filterTags.length === 0)
                this.filteredVendors = this.allVendors;
            else {
                this.filteredVendors = [];
                // Grab any vendors that have one of the tags by which we're filtering
                _.each(this.allVendors, (v) => {
                    if (_.intersection(v.servicesProvidedSplit, this.filterTags).length > 0)
                        this.filteredVendors.push(v);
                });
            }
        }
        onAddedNewVendor() {
            this.retrieveVendors();
        }
        /**
         * Sort the entries by a certain field
         */
        sortEntries() {
            const sortEntry = (pv) => {
                if (this.entriesSortField === "name")
                    return pv.companyName.trim().toLocaleUpperCase();
                else
                    return pv.addedDateUtc;
            };
            this.filteredVendors = _.sortBy(this.filteredVendors, sortEntry);
            if (this.entriesSortAscending)
                this.filteredVendors.reverse();
        }
        /**
         * Sort the entries by a certain field
         */
        updateEntriesSort(fieldName) {
            if (!fieldName)
                fieldName = "entryDate";
            if (this.entriesSortField === fieldName)
                this.entriesSortAscending = !this.entriesSortAscending;
            else {
                this.entriesSortField = fieldName;
                this.entriesSortAscending = false;
            }
            window.localStorage[PreferredVendorsController.StorageKey_SortField] = this.entriesSortField;
            window.localStorage[PreferredVendorsController.StorageKey_SortDir] = this.entriesSortAscending;
            this.sortEntries();
        }
    }
    PreferredVendorsController.$inject = ["$http", "SiteInfo"];
    PreferredVendorsController.StorageKey_SortField = "vendors_entriesSortField";
    PreferredVendorsController.StorageKey_SortDir = "vendors_entriesSortAscending";
    Ally.PreferredVendorsController = PreferredVendorsController;
})(Ally || (Ally = {}));
CA.angularApp.component("preferredVendors", {
    templateUrl: "/ngApp/common/preferred-vendors.html",
    controller: Ally.PreferredVendorsController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the vendors page
     */
    class StreetAddressFormController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo) {
            this.$http = $http;
            this.siteInfo = siteInfo;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            // Normalize the values that could come from the binding
            this.shouldHideName = !this.shouldHideName ? false : true;
        }
        /**
         * Occurs when one of the input fields is changed
         */
        onComponentChange() {
            if (this.onChange)
                this.onChange();
        }
    }
    StreetAddressFormController.$inject = ["$http", "SiteInfo"];
    Ally.StreetAddressFormController = StreetAddressFormController;
})(Ally || (Ally = {}));
CA.angularApp.component("streetAddressForm", {
    bindings: {
        streetAddress: "=",
        onChange: "&",
        shouldHideName: "<",
        useCareOf: "<"
    },
    templateUrl: "/ngApp/common/street-address-form.html",
    controller: Ally.StreetAddressFormController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the HOA info wrapper page
     */
    class HoaInfoController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, $cacheFactory) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$cacheFactory = $cacheFactory;
            this.isSiteManager = false;
            this.hideDocuments = false;
            this.selectedView = "docs";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.hideDocuments = this.siteInfo.userInfo.isRenter && !this.siteInfo.privateSiteInfo.rentersCanViewDocs;
            if (this.hideDocuments)
                this.selectedView = "info";
            else
                this.selectedView = "docs";
        }
    }
    HoaInfoController.$inject = ["$http", "SiteInfo", "$cacheFactory"];
    Ally.HoaInfoController = HoaInfoController;
})(Ally || (Ally = {}));
CA.angularApp.component("hoaInfo", {
    templateUrl: "/ngApp/hoa/member/HoaInfo.html",
    controller: Ally.HoaInfoController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the HOA Ally home page
     */
    class HoaHomeController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, $cacheFactory) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$cacheFactory = $cacheFactory;
            this.isSiteManager = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
        }
    }
    HoaHomeController.$inject = ["$http", "SiteInfo", "$cacheFactory"];
    Ally.HoaHomeController = HoaHomeController;
})(Ally || (Ally = {}));
CA.angularApp.component("hoaHome", {
    templateUrl: "/ngApp/hoa/member/Home.html",
    controller: Ally.HoaHomeController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the Home Ally home page
     */
    class HomeGroupHomeController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope, siteInfo, $timeout, appCacheService) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.appCacheService = appCacheService;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.welcomeMessage = this.siteInfo.privateSiteInfo.welcomeMessage;
            this.isFirstVisit = this.siteInfo.userInfo.lastLoginDateUtc === null;
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.showFirstVisitModal = this.isFirstVisit && !this.$rootScope.hasClosedFirstVisitModal && this.siteInfo.privateSiteInfo.siteLaunchedDateUtc === null;
            this.homeRightColumnType = this.siteInfo.privateSiteInfo.homeRightColumnType;
            if (!this.homeRightColumnType)
                this.homeRightColumnType = "localnews";
            var subDomain = HtmlUtil.getSubdomain(window.location.host);
            this.allyAppName = AppConfig.appName;
            // The object that contains a message if the user wants to send one out
            this.messageObject = {};
            // If the user lives in a unit and assessments are enabled
            if (this.siteInfo.privateSiteInfo.assessmentFrequency !== null
                && this.siteInfo.userInfo.usersUnits !== null
                && this.siteInfo.userInfo.usersUnits.length > 0) {
                this.paymentInfo.paymentType = "periodic";
                if (this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled) {
                    this.knowsNextPayment = true;
                    this.errorPayInfoText = "Is the amount or date incorrect?";
                    this.nextPaymentText = this.getNextPaymentText([this.siteInfo.userInfo.usersUnits[0].nextAssessmentDue], this.siteInfo.privateSiteInfo.assessmentFrequency);
                    this.updatePaymentText();
                }
            }
            this.refreshData();
        }
        // Refresh the not text for the payment field
        updatePaymentText() {
            if (this.paymentInfo.paymentType === "periodic" && this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled) {
                // If we have a next payment string
                if (!HtmlUtil.isNullOrWhitespace(this.nextPaymentText)) {
                    if (this.siteInfo.userInfo.usersUnits[0].includesLateFee)
                        this.paymentInfo.note = "Assessment payment with late fee for ";
                    else
                        this.paymentInfo.note = "Assessment payment for ";
                    this.paymentInfo.note += this.nextPaymentText;
                }
            }
            else {
                this.paymentInfo.note = "";
            }
        }
        onSelectPaymentType(paymentType) {
            this.paymentInfo.paymentType = paymentType;
            this.paymentInfo.amount = paymentType === "periodic" ? this.siteInfo.userInfo.assessmentAmount : 0;
            this.updatePaymentText();
        }
        getNextPaymentText(payPeriods, assessmentFrequency) {
            if (payPeriods === null)
                return "";
            // Ensure the periods is an array
            if (payPeriods.constructor !== Array)
                payPeriods = [payPeriods];
            var paymentText = "";
            var frequencyInfo = FrequencyIdToInfo(assessmentFrequency);
            for (var periodIndex = 0; periodIndex < payPeriods.length; ++periodIndex) {
                var curPeriod = payPeriods[periodIndex];
                if (frequencyInfo.intervalName === "month") {
                    var monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
                    paymentText = monthNames[curPeriod.period - 1];
                }
                else if (frequencyInfo.intervalName === "quarter") {
                    var quarterNames = ["Q1", "Q2", "Q3", "Q4"];
                    paymentText = quarterNames[curPeriod.period - 1];
                }
                else if (frequencyInfo.intervalName === "half-year") {
                    var halfYearNames = ["First Half", "Second Half"];
                    paymentText = halfYearNames[curPeriod.period - 1];
                }
                paymentText += " " + curPeriod.year;
                this.paymentInfo.paysFor = [curPeriod];
            }
            return paymentText;
        }
        hideFirstVisit() {
            this.$rootScope.hasClosedFirstVisitModal = true;
            this.showFirstVisitModal = false;
        }
        onIncorrectPayDetails() {
            // Create a message to the board
            this.messageObject.recipientType = "board";
            if (this.knowsNextPayment)
                this.messageObject.message = "Hello Board Members,\n\nOur association's home page says my next payment of $" + this.siteInfo.userInfo.assessmentAmount + " will cover " + this.nextPaymentText + ", but I believe that is incorrect. My records indicate my next payment of $" + this.siteInfo.userInfo.assessmentAmount + " should pay for [INSERT PROPER DATE HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            else
                this.messageObject.message = "Hello Board Members,\n\nOur association's home page says my assessment payment is $" + this.siteInfo.userInfo.assessmentAmount + ", but I believe that is incorrect. My records indicate my assessment payments should be $[INSERT PROPER AMOUNT HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            document.getElementById("send-email-panel").scrollIntoView();
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Populate the page from the server
        ///////////////////////////////////////////////////////////////////////////////////////////////
        refreshData() {
            //window.location.host is subdomain.domain.com
            var subDomain = HtmlUtil.getSubdomain(window.location.host);
            // A little test to help the automated tests run faster
            var isTestSubdomain = subDomain === "qa" || subDomain === "localtest";
            isTestSubdomain = false;
            if (!isTestSubdomain && this.homeRightColumnType === "localnews") {
                this.isLoading_LocalNews = true;
                var localNewsUri;
                var queryParams;
                if (this.siteInfo.privateSiteInfo.country === "US") {
                    localNewsUri = "https://localnewsally.azurewebsites.net/api/LocalNews";
                    queryParams = {
                        clientId: "1001A194-B686-4C45-80BC-ECC0BB4916B4",
                        chicagoWard: this.siteInfo.privateSiteInfo.chicagoWard,
                        zipCode: this.siteInfo.privateSiteInfo.zipCode,
                        cityNeighborhood: this.siteInfo.privateSiteInfo.localNewsNeighborhoodQuery
                    };
                }
                else {
                    localNewsUri = "https://localnewsally.azurewebsites.net/api/LocalNews/International/MajorCity";
                    queryParams = {
                        clientId: "1001A194-B686-4C45-80BC-ECC0BB4916B4",
                        countryCode: this.siteInfo.privateSiteInfo.country,
                        city: this.siteInfo.privateSiteInfo.groupAddress.city
                    };
                }
                var innerThis = this;
                this.$http.get(localNewsUri, {
                    cache: true,
                    params: queryParams
                }).then(function (httpResponse) {
                    innerThis.localNews = httpResponse.data;
                    innerThis.isLoading_LocalNews = false;
                });
            }
        }
    }
    HomeGroupHomeController.$inject = ["$http", "$rootScope", "SiteInfo", "$timeout", "appCacheService"];
    Ally.HomeGroupHomeController = HomeGroupHomeController;
})(Ally || (Ally = {}));
CA.angularApp.component("homeGroupHome", {
    templateUrl: "/ngApp/home/home-group-home.html",
    controller: Ally.HomeGroupHomeController
});

var Ally;
(function (Ally) {
    class HomeValueResponse {
    }
    /**
     * The controller for the widget that lets members send emails to the group
     */
    class HomeValueWidgetController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope, siteInfo) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.shouldShowWidget = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            this.retrieveInfo();
        }
        /**
         * Retrieve the home value information from the server
         */
        retrieveInfo() {
            this.isLoading = true;
            this.$http.get("/api/HomeValue/ZillowInfo").then((response) => {
                this.isLoading = false;
                this.shouldShowWidget = !!response.data && !!response.data.chartImageUri;
                if (this.shouldShowWidget)
                    this.valueInfo = response.data;
            }, (response) => {
                this.isLoading = false;
                this.shouldShowWidget = false;
            });
        }
    }
    HomeValueWidgetController.$inject = ["$http", "$rootScope", "SiteInfo"];
    Ally.HomeValueWidgetController = HomeValueWidgetController;
})(Ally || (Ally = {}));
CA.angularApp.component("homeValueWidget", {
    templateUrl: "/ngApp/home/home-value-widget.html",
    controller: Ally.HomeValueWidgetController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the widget that lets members send emails to the group
     */
    class HomeUsersController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope, siteInfo) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.isAdmin = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            // Placeholder
        }
    }
    HomeUsersController.$inject = ["$http", "$rootScope", "SiteInfo"];
    Ally.HomeUsersController = HomeUsersController;
})(Ally || (Ally = {}));
CA.angularApp.component("homeUsers", {
    templateUrl: "/ngApp/home/manager/home-users.html",
    controller: Ally.HomeUsersController
});

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../../Scripts/typings/googlemaps/google.maps.d.ts" />
var Ally;
(function (Ally) {
    class SignerUpInfo {
    }
    class HomeInfo {
    }
    Ally.HomeInfo = HomeInfo;
    class SignUpInfo {
        constructor() {
            this.signerUpInfo = new SignerUpInfo();
            this.streetAddress = "";
            this.homeInfo = new HomeInfo();
        }
    }
    const LotSizeType_Acres = "Acres";
    const LotSizeType_SquareFeet = "SquareFeet";
    const SquareFeetPerAcre = 43560;
    /**
     * The controller for the Home Ally sign-up page
     */
    class HomeSignUpController {
        /**
         * The constructor for the class
         * @param $http The HTTP service object
         * @param $scope The Angular scope object
         */
        constructor($http, $scope, WizardHandler) {
            this.$http = $http;
            this.$scope = $scope;
            this.WizardHandler = WizardHandler;
            this.lotSizeUnit = LotSizeType_Acres;
            this.lotSquareUnits = 0;
            this.signUpInfo = new SignUpInfo();
            this.isLoadingHomeInfo = false;
            this.didLoadHomeInfo = false;
            this.isLoading = false;
            this.hideWizard = false;
            this.hasAlreadyCheckedForHomeInfo = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            // Listen for step changes
            this.$scope.$on('wizard:stepChanged', (event, args) => {
                // If we're now on the second step
                if (args.index === 1)
                    this.retrieveHomeInfoForAddress();
            });
            // The controller is ready, but let's wait a bit for the page to be ready
            var innerThis = this;
            setTimeout(() => { this.initMap(); }, 300);
        }
        /**
         * Retrieve information about the address provided from Zillow
         */
        retrieveHomeInfoForAddress() {
            if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.streetAddress) || this.hasAlreadyCheckedForHomeInfo)
                return;
            this.hasAlreadyCheckedForHomeInfo = true;
            var getUri = "/api/HomeSignUp/HomeInfo?streetAddress=" + encodeURIComponent(this.signUpInfo.streetAddress);
            this.$http.get(getUri, { cache: true }).then((response) => {
                if (!response.data)
                    return;
                this.signUpInfo.homeInfo = response.data;
                this.didLoadHomeInfo = true;
                this.processLotSizeHint(this.signUpInfo.homeInfo.lotSquareFeet);
            });
        }
        /**
         * Convert a lot size hint from Zillow into a UI friendly value
         * @param lotSquareFeet
         */
        processLotSizeHint(lotSquareFeet) {
            if (!lotSquareFeet)
                return;
            // Choose a square feet that makes sense
            if (lotSquareFeet > SquareFeetPerAcre) {
                this.lotSizeUnit = LotSizeType_Acres;
                this.lotSquareUnits = lotSquareFeet / SquareFeetPerAcre;
                // Round to nearest .25
                this.lotSquareUnits = parseFloat((Math.round(this.lotSquareUnits * 4) / 4).toFixed(2));
            }
            else {
                this.lotSizeUnit = LotSizeType_SquareFeet;
                this.lotSquareUnits = lotSquareFeet;
            }
        }
        /**
         * Initialize the Google map on the page
         */
        initMap() {
            var mapDiv = document.getElementById("address-map");
            this.map = new google.maps.Map(mapDiv, {
                center: { lat: 41.869638, lng: -87.657423 },
                zoom: 9
            });
            this.mapMarker = new google.maps.Marker({
                map: this.map,
                anchorPoint: new google.maps.Point(41.969638, -87.657423),
                icon: "/assets/images/MapMarkers/MapMarker_Home.png",
                position: null
            });
            var addressInput = document.getElementById("home-address-text-box");
            this.addressAutocomplete = new google.maps.places.Autocomplete(addressInput);
            this.addressAutocomplete.bindTo('bounds', this.map);
            // Occurs when the user selects a Google suggested address
            var innerThis = this;
            this.addressAutocomplete.addListener('place_changed', function () {
                //innerThis.setPlaceWasSelected();
                //infowindow.close();
                innerThis.mapMarker.setVisible(false);
                var place = innerThis.addressAutocomplete.getPlace();
                var readableAddress = place.formatted_address;
                // Remove the trailing country if it's USA
                if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                    readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                innerThis.signUpInfo.streetAddress = readableAddress;
                innerThis.selectedSplitAddress = Ally.MapUtil.parseAddressComponents(place.address_components);
                //innerThis.prepopulateHomeInfo();
                if (place.geometry)
                    innerThis.centerMap(place.geometry);
                $("#association-name-text-box").focus();
            });
        }
        /**
         * Occurs when the user hits enter in the address box
         */
        goNextStep() {
            this.WizardHandler.wizard().next();
        }
        /**
         * Called when the user completes the wizard
         */
        onFinishedWizard() {
            //if( this.lotSizeUnit === LotSizeType_Acres )
            //    this.signUpInfo.homeInfo.lotSquareFeet = this.lotSquareUnits * SquareFeetPerAcre;
            //else
            //    this.signUpInfo.homeInfo.lotSquareFeet = this.lotSquareUnits;
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/HomeSignUp", this.signUpInfo).then(function (httpResponse) {
                innerThis.isLoading = false;
                let signUpResult = httpResponse.data;
                // If we successfully created the site
                if (!HtmlUtil.isNullOrWhitespace(signUpResult.errorMessage)) {
                    alert("Failed to complete sign-up: " + signUpResult.errorMessage);
                    if (signUpResult.stepIndex >= 0)
                        innerThis.WizardHandler.wizard().goTo(signUpResult.stepIndex);
                }
                // Or if the user created an active signUpResult
                else if (!HtmlUtil.isNullOrWhitespace(signUpResult.createUrl)) {
                    window.location.href = signUpResult.createUrl;
                }
                // Otherwise the user needs to confirm sign-up via email
                else {
                    innerThis.hideWizard = true;
                    innerThis.resultMessage = "Great work! We just sent you an email with instructions on how access your new site.";
                }
            }, function (httpResponse) {
                innerThis.isLoading = false;
                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to complete sign-up: " + errorMessage);
            });
        }
        /**
         * Called when the user types in a new street address
         */
        onHomeAddressChanged() {
            var innerThis = this;
            HtmlUtil.geocodeAddress(this.signUpInfo.streetAddress, function (results, status) {
                innerThis.$scope.$apply(function () {
                    if (status != google.maps.GeocoderStatus.OK) {
                        //$( "#GeocodeResultPanel" ).text( "Failed to find address for the following reason: " + status );
                        return;
                    }
                    var readableAddress = results[0].formatted_address;
                    // Remove the trailing country if it's USA
                    if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                        readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                    innerThis.signUpInfo.streetAddress = readableAddress;
                    innerThis.centerMap(results[0].geometry);
                });
            });
        }
        /**
         * Center the map on a position
         * @param geometry The geometry on which to center
         */
        centerMap(geometry) {
            // If the place has a geometry, then present it on a map.
            if (geometry.viewport) {
                this.map.fitBounds(geometry.viewport);
            }
            else {
                this.map.setCenter(geometry.location);
                this.map.setZoom(17); // Why 17? Because it looks good.
            }
            this.mapMarker.setPosition(geometry.location);
            this.mapMarker.setVisible(true);
        }
        /**
         * Retrieve the home information from the server
         */
        prepopulateHomeInfo() {
            if (!this.selectedSplitAddress)
                return;
            this.isLoadingHomeInfo = true;
            let getUri = `/api/PropertyResearch/HomeInfo?street=${encodeURIComponent(this.selectedSplitAddress.street)}&city=${encodeURIComponent(this.selectedSplitAddress.city)}&state=${this.selectedSplitAddress.state}&zip=${this.selectedSplitAddress.zip}`;
            var innerThis = this;
            this.$http.get(getUri).then((httpResponse) => {
                innerThis.isLoadingHomeInfo = false;
                let homeInfo = httpResponse.data;
                if (homeInfo) {
                    innerThis.didLoadHomeInfo = true;
                    innerThis.signUpInfo.homeInfo = homeInfo;
                    innerThis.processLotSizeHint(homeInfo.lotSquareFeet);
                }
            }, () => {
                innerThis.isLoadingHomeInfo = false;
            });
        }
    }
    HomeSignUpController.$inject = ["$http", "$scope", "WizardHandler"];
    Ally.HomeSignUpController = HomeSignUpController;
})(Ally || (Ally = {}));
CA.angularApp.component('homeSignUp', {
    templateUrl: "/ngApp/home/public/home-sign-up.html",
    controller: Ally.HomeSignUpController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the PTA Ally home page
     */
    class PtaGroupHomeController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope, siteInfo, $timeout, appCacheService) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.appCacheService = appCacheService;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.welcomeMessage = this.siteInfo.privateSiteInfo.welcomeMessage;
            this.isFirstVisit = this.siteInfo.userInfo.lastLoginDateUtc === null;
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.showFirstVisitModal = this.isFirstVisit && !this.$rootScope.hasClosedFirstVisitModal && this.siteInfo.privateSiteInfo.siteLaunchedDateUtc === null;
            this.homeRightColumnType = this.siteInfo.privateSiteInfo.homeRightColumnType;
            if (!this.homeRightColumnType)
                this.homeRightColumnType = "localnews";
            var subDomain = HtmlUtil.getSubdomain(window.location.host);
            this.allyAppName = AppConfig.appName;
            // The object that contains a message if the user wants to send one out
            this.messageObject = {};
            // If the user lives in a unit and assessments are enabled
            if (this.siteInfo.privateSiteInfo.assessmentFrequency !== null
                && this.siteInfo.userInfo.usersUnits !== null
                && this.siteInfo.userInfo.usersUnits.length > 0) {
                this.paymentInfo.paymentType = "periodic";
                if (this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled) {
                    this.knowsNextPayment = true;
                    this.errorPayInfoText = "Is the amount or date incorrect?";
                    this.nextPaymentText = this.getNextPaymentText([this.siteInfo.userInfo.usersUnits[0].nextAssessmentDue], this.siteInfo.privateSiteInfo.assessmentFrequency);
                    this.updatePaymentText();
                }
            }
        }
        // Refresh the not text for the payment field
        updatePaymentText() {
            if (this.paymentInfo.paymentType === "periodic" && this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled) {
                // If we have a next payment string
                if (!HtmlUtil.isNullOrWhitespace(this.nextPaymentText)) {
                    if (this.siteInfo.userInfo.usersUnits[0].includesLateFee)
                        this.paymentInfo.note = "Assessment payment with late fee for ";
                    else
                        this.paymentInfo.note = "Assessment payment for ";
                    this.paymentInfo.note += this.nextPaymentText;
                }
            }
            else {
                this.paymentInfo.note = "";
            }
        }
        onSelectPaymentType(paymentType) {
            this.paymentInfo.paymentType = paymentType;
            this.paymentInfo.amount = paymentType === "periodic" ? this.siteInfo.userInfo.assessmentAmount : 0;
            this.updatePaymentText();
        }
        getNextPaymentText(payPeriods, assessmentFrequency) {
            if (payPeriods === null)
                return "";
            // Ensure the periods is an array
            if (payPeriods.constructor !== Array)
                payPeriods = [payPeriods];
            var paymentText = "";
            var frequencyInfo = FrequencyIdToInfo(assessmentFrequency);
            for (var periodIndex = 0; periodIndex < payPeriods.length; ++periodIndex) {
                var curPeriod = payPeriods[periodIndex];
                if (frequencyInfo.intervalName === "month") {
                    var monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
                    paymentText = monthNames[curPeriod.period - 1];
                }
                else if (frequencyInfo.intervalName === "quarter") {
                    var quarterNames = ["Q1", "Q2", "Q3", "Q4"];
                    paymentText = quarterNames[curPeriod.period - 1];
                }
                else if (frequencyInfo.intervalName === "half-year") {
                    var halfYearNames = ["First Half", "Second Half"];
                    paymentText = halfYearNames[curPeriod.period - 1];
                }
                paymentText += " " + curPeriod.year;
                this.paymentInfo.paysFor = [curPeriod];
            }
            return paymentText;
        }
        hideFirstVisit() {
            this.$rootScope.hasClosedFirstVisitModal = true;
            this.showFirstVisitModal = false;
        }
        onIncorrectPayDetails() {
            // Create a message to the board
            this.messageObject.recipientType = "board";
            if (this.knowsNextPayment)
                this.messageObject.message = "Hello Boardmembers,\n\nOur association's home page says my next payment of $" + this.siteInfo.userInfo.assessmentAmount + " will cover " + this.nextPaymentText + ", but I believe that is incorrect. My records indicate my next payment of $" + this.siteInfo.userInfo.assessmentAmount + " should pay for [INSERT PROPER DATE HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            else
                this.messageObject.message = "Hello Boardmembers,\n\nOur association's home page says my assessment payment is $" + this.siteInfo.userInfo.assessmentAmount + ", but I believe that is incorrect. My records indicate my assessment payments should be $[INSERT PROPER AMOUNT HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            document.getElementById("send-email-panel").scrollIntoView();
        }
    }
    PtaGroupHomeController.$inject = ["$http", "$rootScope", "SiteInfo", "$timeout", "appCacheService"];
    Ally.PtaGroupHomeController = PtaGroupHomeController;
})(Ally || (Ally = {}));
CA.angularApp.component("ptaGroupHome", {
    templateUrl: "/ngApp/pta/pta-group-home.html",
    controller: Ally.PtaGroupHomeController
});

function ServiceBankInfoCtrl( $http )
{
    var vm = this;
}
ServiceBankInfoCtrl.$inject = ["$http"];

function ServiceBusinessInfoCtrl( $http )
{
    var vm = this;
}
ServiceBusinessInfoCtrl.$inject = ["$http"];

function ServiceJobsCtrl( $http )
{
    var vm = this;
}
ServiceJobsCtrl.$inject = ["$http"];

class AppCacheService {
    set(key, value) { window.sessionStorage[AppCacheService.KeyPrefix + key] = value; }
    get(key) { return window.sessionStorage[AppCacheService.KeyPrefix + key]; }
    clear(key) {
        window.sessionStorage[AppCacheService.KeyPrefix + key] = void 0;
        delete window.sessionStorage[AppCacheService.KeyPrefix + key];
    }
    getAndClear(key) {
        var result;
        result = this.get(key);
        this.clear(key);
        return result;
    }
}
// The key for when the user gets redirect for a 401, but is logged in
AppCacheService.Key_WasLoggedIn403 = "wasLoggedIn403";
// Used to display a friendly message when a user is brought to the login page before redirection
AppCacheService.Key_WasLoggedIn401 = "wasLoggedIn401";
AppCacheService.Key_AfterLoginRedirect = "afterLoginRedirect";
AppCacheService.KeyPrefix = "AppCacheService_";
angular.module("CondoAlly").service("appCacheService", [AppCacheService]);

var Ally;
(function (Ally) {
    /**
     * Represents a column in a CSV spreadsheet
     */
    class CsvColumnDescriptor {
    }
    Ally.CsvColumnDescriptor = CsvColumnDescriptor;
    function ValueToCsvValue(valueObj) {
        if (!valueObj)
            return "";
        let value = valueObj.toString();
        if (HtmlUtil.isNullOrWhitespace(value))
            return "";
        const needsEscaping = value.indexOf('"') !== -1
            || value.indexOf(',') !== -1
            || value.indexOf('\r') !== -1
            || value.indexOf('\n') !== -1;
        if (needsEscaping) {
            // Double the double quotes
            value = value.replace(/"/g, "\"\"");
            // Wrap the whole thing in quotes
            value = "\"" + value + "\"";
        }
        return value;
    }
    Ally.ValueToCsvValue = ValueToCsvValue;
    /**
     * Generate a CSV for client-side download
     */
    function createCsvString(itemArray, descriptorArray, includeHeader = true) {
        let csvText = "";
        // Write the header
        if (includeHeader) {
            for (let i = 0; i < descriptorArray.length; ++i) {
                if (i > 0)
                    csvText += ",";
                csvText += ValueToCsvValue(descriptorArray[i].headerText);
            }
            csvText += "\n";
        }
        // Write the rows
        for (let rowIndex = 0; rowIndex < itemArray.length; ++rowIndex) {
            const curRow = itemArray[rowIndex];
            for (let columnIndex = 0; columnIndex < descriptorArray.length; ++columnIndex) {
                if (columnIndex > 0)
                    csvText += ",";
                const curColumn = descriptorArray[columnIndex];
                let columnValue = curRow[curColumn.fieldName];
                if (curColumn.dataMapper)
                    columnValue = curColumn.dataMapper(columnValue);
                csvText += ValueToCsvValue(columnValue);
            }
            csvText += "\n";
        }
        return csvText;
    }
    Ally.createCsvString = createCsvString;
})(Ally || (Ally = {}));

var Ally;
(function (Ally) {
    /**
     * Represents a group email address to which emails sent get forwarded to the whole group
     */
    class GroupEmailInfo {
    }
    Ally.GroupEmailInfo = GroupEmailInfo;
    class GroupEmailGroups {
    }
    Ally.GroupEmailGroups = GroupEmailGroups;
    class CustomEmailGroup {
    }
    Ally.CustomEmailGroup = CustomEmailGroup;
    class CustomEmailGroupMember {
    }
    Ally.CustomEmailGroupMember = CustomEmailGroupMember;
    class HomeEntry {
    }
    /**
     * Represents a member of a CHTN group
     */
    class FellowChtnResident extends Ally.SimpleUserEntry {
    }
    Ally.FellowChtnResident = FellowChtnResident;
    class CommitteeListingInfo {
    }
    Ally.CommitteeListingInfo = CommitteeListingInfo;
    class UnitListing {
    }
    Ally.UnitListing = UnitListing;
    class FellowResidents {
    }
    Ally.FellowResidents = FellowResidents;
    /**
     * Provides methods to accessing group member and home information
     */
    class FellowResidentsService {
        /**
         * The constructor for the class
         */
        constructor($http, $q, $cacheFactory) {
            this.$http = $http;
            this.$q = $q;
            this.$cacheFactory = $cacheFactory;
            this.httpCache = $cacheFactory("FellowResidentsService");
        }
        /**
         * Get the residents for the current group
         */
        getResidents() {
            return this.$http.get("/api/BuildingResidents", { cache: this.httpCache }).then((httpResponse) => {
                return httpResponse.data.residents;
            }, (httpResponse) => {
                return this.$q.reject(httpResponse);
            });
        }
        /**
         * Get the members for a committee
         */
        getCommitteeMembers(committeeId) {
            return this.$http.get(`/api/Committee/${committeeId}/Members`).then((httpResponse) => {
                return httpResponse.data;
            }, function (httpResponse) {
                return this.$q.reject(httpResponse);
            });
        }
        /**
         * Determine if the logged-in user is a committee member
         */
        isCommitteeMember(committeeId) {
            return this.$http.get(`/api/Committee/${committeeId}/IsMember`, { cache: this.httpCache }).then((httpResponse) => {
                return httpResponse.data;
            }, (httpResponse) => {
                return this.$q.reject(httpResponse);
            });
        }
        /**
         * Get the residents for an association, broken down by unit for easy display
         */
        getByUnits() {
            return this.$http.get("/api/BuildingResidents", { cache: this.httpCache }).then((httpResponse) => {
                return httpResponse.data.byUnit;
            }, (httpResponse) => {
                return this.$q.reject(httpResponse);
            });
        }
        /**
         * Get a list of residents and homes
         */
        getByUnitsAndResidents() {
            return this.$http.get("/api/BuildingResidents", { cache: this.httpCache }).then((httpResponse) => {
                return httpResponse.data;
            }, (httpResponse) => {
                return this.$q.reject(httpResponse);
            });
        }
        /**
         * Get the object describing the available group email addresses
         */
        getGroupEmailObject() {
            return this.$http.get("/api/BuildingResidents/EmailGroups", { cache: this.httpCache }).then(function (httpResponse) {
                return httpResponse.data;
            }, function (httpResponse) {
                return this.$q.reject(httpResponse);
            });
            //var innerThis = this;
            //return this.getByUnitsAndResidents().then( function( unitsAndResidents )
            //{
            //    var unitList = unitsAndResidents.byUnit;
            //    var allResidents = unitsAndResidents.residents;
            //    return innerThis.setupGroupEmailObject( allResidents, unitList, null );
            //} );
        }
        /**
         * Get the object describing the available group email addresses
         */
        getAllGroupEmails() {
            return this.$http.get("/api/BuildingResidents/AllEmailGroups", { cache: this.httpCache }).then((httpResponse) => {
                return httpResponse.data;
            }, (httpResponse) => {
                return this.$q.reject(httpResponse);
            });
            //var innerThis = this;
            //return this.getByUnitsAndResidents().then( function( unitsAndResidents )
            //{
            //    var unitList = unitsAndResidents.byUnit;
            //    var allResidents = unitsAndResidents.residents;
            //    return innerThis.setupGroupEmailObject( allResidents, unitList, null );
            //} );
        }
        /**
         * Populate the lists of group emails
         */
        _setupGroupEmailObject(allResidents, unitList) {
            let emailLists = {};
            emailLists = {
                everyone: [],
                owners: [],
                renters: [],
                board: [],
                residentOwners: [],
                nonResidentOwners: [],
                residentOwnersAndRenters: [],
                propertyManagers: [],
                discussion: []
            };
            // Go through each resident and add them to each email group they belong to
            for (let i = 0; i < allResidents.length; ++i) {
                const r = allResidents[i];
                const displayName = r.fullName + (r.hasEmail ? "" : "*");
                emailLists.everyone.push(displayName);
                if (r.boardPosition !== FellowResidentsService.BoardPos_None && r.boardPosition !== FellowResidentsService.BoardPos_PropertyManager)
                    emailLists.board.push(displayName);
                if (r.boardPosition === FellowResidentsService.BoardPos_PropertyManager)
                    emailLists.propertyManagers.push(displayName);
                if (r.includeInDiscussionEmail)
                    emailLists.discussion.push(displayName);
                let isOwner = false;
                let isRenter = false;
                let unitIsRented = false;
                for (let unitIndex = 0; unitIndex < r.homes.length; ++unitIndex) {
                    const simpleHome = r.homes[unitIndex];
                    if (!simpleHome.isRenter) {
                        isOwner = true;
                        const unit = _.find(unitList, function (u) { return u.unitId === simpleHome.unitId; });
                        unitIsRented = unit.renters.length > 0;
                    }
                    if (simpleHome.isRenter)
                        isRenter = true;
                }
                if (isOwner) {
                    emailLists.owners.push(displayName);
                    if (unitIsRented)
                        emailLists.nonResidentOwners.push(displayName);
                    else {
                        emailLists.residentOwners.push(displayName);
                        emailLists.residentOwnersAndRenters.push(displayName);
                    }
                }
                if (isRenter) {
                    emailLists.renters.push(displayName);
                    emailLists.residentOwnersAndRenters.push(displayName);
                }
            }
            // If there are no renters then there are no non-residents so hide those lists
            if (emailLists.renters.length === 0) {
                emailLists.residentOwners = [];
                emailLists.residentOwnersAndRenters = [];
                emailLists.nonResidentOwners = [];
            }
            return emailLists;
        }
        /**
         * Send an email message to another user
         */
        sendMessage(recipientUserId, messageBody, messageSubject, shouldSendAsBoard) {
            const postData = {
                recipientUserId: recipientUserId,
                messageBody: messageBody,
                messageSubject: messageSubject,
                shouldSendAsBoard: shouldSendAsBoard
            };
            return this.$http.post("/api/BuildingResidents/SendMessage", postData);
        }
        /**
         * Clear cached values, such as when the user changes values in Manage -> Residents
         */
        clearResidentCache() {
            this.httpCache.removeAll();
        }
        /**
         * Test if a board position is one of the officer positions
         */
        static isOfficerBoardPosition(boardPosition) {
            const OfficerPositions = [
                1,
                2,
                4,
                16,
                64, // Secretary + Treasurer
            ];
            return OfficerPositions.indexOf(boardPosition) !== -1;
        }
        /**
         * Test if a board position is any except the property manager
         */
        static isNonPropMgrBoardPosition(boardPosition) {
            if (boardPosition < 1 // Handle invalid values
                || boardPosition === FellowResidentsService.BoardPos_None
                || boardPosition === FellowResidentsService.BoardPos_PropertyManager)
                return false;
            return true;
        }
        static pollReponsesToChart(poll, siteInfo) {
            const talliedVotes = [];
            const logVote = function (answerId) {
                let count = talliedVotes.find(tv => tv.answerId === answerId);
                if (!count) {
                    count = new PollAnswerCount(answerId);
                    talliedVotes.push(count);
                }
                ++count.numVotes;
            };
            const logVotes = (answerIds) => answerIds.forEach(aid => logVote(aid));
            poll.responses.forEach(r => logVotes(r.answerIds));
            const results = {
                chartData: [],
                chartLabels: []
            };
            // Go through each answer and store the name and count for that answer
            for (const curTalliedVote of talliedVotes) {
                const pollAnswer = _.find(poll.answers, (a) => a.pollAnswerId === curTalliedVote.answerId);
                if (pollAnswer) {
                    results.chartLabels.push(pollAnswer.answerText);
                    results.chartData.push(curTalliedVote.numVotes);
                }
                else
                    console.log("Unknown answer ID found: " + curTalliedVote.answerId);
            }
            if (poll.responses && poll.responses.length < siteInfo.privateSiteInfo.numUnits) {
                results.chartLabels.push("No Response");
                const isMemberBasedGroup = AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club" || AppConfig.appShortName === "pta";
                if (isMemberBasedGroup)
                    results.chartData.push(siteInfo.privateSiteInfo.numMembers - poll.responses.length);
                else
                    results.chartData.push(siteInfo.privateSiteInfo.numUnits - poll.responses.length);
            }
            return results;
        }
    }
    FellowResidentsService.BoardPos_None = 0;
    FellowResidentsService.BoardPos_PropertyManager = 32;
    FellowResidentsService.CustomRecipientType = "CUSTOM";
    FellowResidentsService.BoardPositionNames = [
        { id: FellowResidentsService.BoardPos_None, name: "None" },
        { id: 1, name: "President" },
        { id: 2, name: "Treasurer" },
        { id: 4, name: "Secretary" },
        { id: 8, name: "Director/Member at Large" },
        { id: 16, name: "Vice President" },
        { id: FellowResidentsService.BoardPos_PropertyManager, name: "Property Manager" },
        { id: 64, name: "Secretary + Treasurer" }
    ];
    Ally.FellowResidentsService = FellowResidentsService;
    class PollAnswerCount {
        constructor(answerId) {
            this.numVotes = 0;
            this.answerId = answerId;
        }
    }
})(Ally || (Ally = {}));
angular.module("CondoAlly").service("fellowResidents", ["$http", "$q", "$cacheFactory", Ally.FellowResidentsService]);

CA.angularApp.directive( "googleMapPolyEditor", ["$http", function ( $http )
{
    var linkFunction = function ( scope, elem, attrs )
    {
        scope.mapInfo = {
            center: { lat: 39.5, lng: -98.35 },
            zoom: 4, // 19=House level, 4=USA fills
            disableDefaultUI: !scope.enableMapControls,
            mapTypeId: google.maps.MapTypeId.HYBRID,
            events: {
                // Occurs whenever tiles are loaded, but we disable the listener after the first so
                // this acts as an onLoaded handler
                tilesloaded: function ( map, eventName, args )
                {
                    // We only need to handle this event once to grab the map instance so don't listen again
                    google.maps.event.clearListeners( map, "tilesloaded" );
                }
            }
        };

        scope.markerClusterer = null;

        // Convert Google bounds to a Community Ally GpsBounds object
        scope.googlePolyToGpsBounds = function ( verts )
        {
            verts = _.map( verts, function ( v )
            {
                return { lat: v.lat(), lon: v.lng() };
            } );

            return verts;
        };


        scope.centerMapOnPoly = function ( verts )
        {
            if( !verts || verts.length === 0 )
                return;

            //  Create a new viewpoint bound
            var bounds = new google.maps.LatLngBounds();

            _.map( verts, function ( v )
            {
                bounds.extend( v );
            } );
            
            //  Fit these bounds to the map
            scope.mapInstance.fitBounds( bounds );
        };
        

        // Add the polygon that shows the current group's bounds
        scope.setGroupBounds = function ( groupBounds )
        {
            // If there is already a group shape then clear it
            if ( !groupBounds )
            {
                if ( scope.groupBoundsShape )
                {
                    scope.groupBoundsShape.setMap( null );
                    scope.groupBoundsShape = null;
                }

                return;
            }

            var path = Ally.MapUtil.gpsBoundsToGooglePoly( groupBounds );

            var polylineOptions = {
                paths: path,
                map: scope.mapInstance,
                strokeColor: '#0000FF',
                strokeOpacity: 0.5,
                strokeWeight: 1,
                fillColor: '#0000FF',
                fillOpacity: 0.15,
                zIndex:-1
            };

            if ( scope.activeShape )
                scope.activeShape.setMap( null );

            scope.groupBoundsShape = new google.maps.Polygon( polylineOptions );
        };

        // Make the map include all visible polygons
        scope.fitBoundsForPolys = function ()
        {
            var viewBounds = new google.maps.LatLngBounds();

            if( !scope.groupBoundsShape && ( !scope.currentVisiblePolys || scope.currentVisiblePolys.length === 0 ) )
                return;

            if ( scope.groupBoundsShape )
            {
                _.each( scope.groupBoundsShape.getPath().getArray(), function ( p )
                {
                    viewBounds.extend( p );
                } );
            }

            _.each( scope.currentVisiblePolys, function ( shape )
            {
                _.each( shape.getPath().getArray(), function ( p )
                {
                    viewBounds.extend( p );
                } );
            } );

            scope.mapInstance.fitBounds( viewBounds );
        };


        // Make the map include all visible points
        scope.fitBoundsForPoints = function ()
        {
            if( !scope.currentVisiblePoints || scope.currentVisiblePoints.length === 0 )
                return;

            var viewBounds = new google.maps.LatLngBounds();

            _.each( scope.currentVisiblePoints, function ( p )
            {
                viewBounds.extend( p.position );
            } );

            scope.mapInstance.fitBounds( viewBounds );
        };


        // Occurs when a polygon point has been moved and adds the delete button
        var onPointUpdatedAddDelete = function ( index )
        {
            var getDeleteButton = function( imageUrl ) { return $( "img[src$='" + imageUrl + "']" ); };

            var path = this;
            var btnDelete = getDeleteButton( path.btnDeleteImageUrl );

            if ( btnDelete.length === 0 )
            {
                var undoimg = $( "img[src$='http://maps.gstatic.com/mapfiles/undo_poly.png']" );

                undoimg.parent().css( 'height', '21px !important' );
                undoimg.parent().parent().append( '<div style="overflow-x: hidden; overflow-y: hidden; position: absolute; width: 30px; height: 27px;top:21px;"><img src="' + path.btnDeleteImageUrl + '" class="deletePoly" style="height:auto; width:auto; position: absolute; left:0;"/></div>' );

                // now get that button back again!
                btnDelete = getDeleteButton( path.btnDeleteImageUrl );
                btnDelete.hover( function () { $( this ).css( 'left', '-30px' ); return false; },
                    function () { $( this ).css( 'left', '0px' ); return false; } );
                btnDelete.mousedown( function () { $( this ).css( 'left', '-60px' ); return false; } );
            }

            // if we've already attached a handler, remove it
            if ( path.btnDeleteClickHandler )
                btnDelete.unbind( 'click', path.btnDeleteClickHandler );

            // now add a handler for removing the passed in index
            path.btnDeleteClickHandler = function ()
            {
                path.removeAt( index );
                return false;
            };
            btnDelete.click( path.btnDeleteClickHandler );
        };


        // Add the button to delete vertices on a polygon that's being edited
        var addDeleteButton = function ( poly, imageUrl )
        {
            var path = poly.getPath();
            path["btnDeleteClickHandler"] = {};
            path["btnDeleteImageUrl"] = imageUrl;

            google.maps.event.addListener( poly.getPath(), 'set_at', onPointUpdatedAddDelete );
            google.maps.event.addListener( poly.getPath(), 'insert_at', onPointUpdatedAddDelete );
        };

        scope.currentVisiblePolys = [];
        scope.currentVisiblePoints = [];

        // Occurs when the GpsBounds to the non-editable polys change
        scope.onVisiblePolysChange = function ( newPolys )
        {
            // Clear our current array
            _.each( scope.currentVisiblePolys, function ( p )
            {
                p.setMap( null );
            } );
            scope.currentVisiblePolys = [];

            _.each( newPolys, function ( p )
            {
                var path = Ally.MapUtil.gpsBoundsToGooglePoly( p );

                var polylineOptions = {
                    paths: path,
                    clickable: typeof(p.onClick) === "function",
                    map: scope.mapInstance,
                    strokeColor: '#0000FF',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: '#0000FF',
                    fillOpacity: 0.35,
                };

                var newShape = new google.maps.Polygon( polylineOptions );
                newShape.polyInfo = p;
                p.mapShapeObject = newShape;
                scope.currentVisiblePolys.push( newShape );

                if( polylineOptions.clickable )
                {
                    google.maps.event.addListener( newShape, 'click', function ()
                    {
                        newShape.polyInfo.onClick();
                    } );
                }
            } );

            scope.fitBoundsForPolys();
        };


        // Occurs when the GpsBounds to the non-editable polys change
        scope.onVisiblePointsChange = function ( newPoints )
        {
            // Clear our current array
            _.each( scope.currentVisiblePoints, function ( p )
            {
                p.setMap( null );
            } );
            scope.currentVisiblePoints = [];

            _.each( newPoints, function ( p )
            {
                var newMarker = new google.maps.Marker( {
                    position: { lat: p.lat, lng: p.lon },
                    map: scope.mapInstance,
                    title: p.fullAddress
                } );

                newMarker.pointSource = p;

                scope.currentVisiblePoints.push( newMarker );

                if( typeof(p.onClick) === "function" )
                {
                    google.maps.event.addListener( newMarker, 'click', function ()
                    {
                        newMarker.pointSource.onClick();
                    } );
                }
            } );

            scope.fitBoundsForPoints();

            if( scope.enableClustering )
            {
                if( scope.markerClusterer )
                    markerCluster.setMap( null );

                scope.markerCluster = new markerClusterer.MarkerClusterer( {
                    markers: scope.currentVisiblePoints,
                    map: scope.mapInstance
                } );
            }
        };


        // Occurs when the GpsBounds we're editing change
        scope.onEditPolyChange = function ( newGpsBounds )
        {
            if ( !newGpsBounds )
            {
                if ( scope.activeShape )
                    scope.activeShape.setMap( null );
                scope.activeShape = null;

                return;
            }

            var path = _.map( newGpsBounds.vertices, function ( v )
            {
                return new google.maps.LatLng( v.lat, v.lon );
            } );

            scope.centerMapOnPoly( path );

            var polylineOptions = {
                paths: path,
                editable: true,
                draggable: true,
                clickable: true,
                map: scope.mapInstance,
                strokeColor: '#FF0000',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#FF0000',
                fillOpacity: 0.35,
            };

            if ( scope.activeShape )
                scope.activeShape.setMap( null );

            scope.activeShape = new google.maps.Polygon( polylineOptions );
            
            var onPointUpdated = function ()
            {
                scope.editPolyVerts.vertices = scope.googlePolyToGpsBounds( scope.activeShape.getPath().getArray() );
            };

            google.maps.event.addListener( scope.activeShape.getPath(), 'set_at', onPointUpdated );
            google.maps.event.addListener( scope.activeShape.getPath(), 'insert_at', onPointUpdated );

            addDeleteButton( scope.activeShape, 'http://i.imgur.com/RUrKV.png' );

            return scope.activeShape;
        };


        // detect outside changes and update our input
        scope.$watch( 'editPolyVerts', function ( newPoly )
        {
            scope.onEditPolyChange( newPoly );
        } );

        scope.$watch( 'visiblePolys', function ( newPolys )
        {
            scope.onVisiblePolysChange( newPolys );
        } );

        scope.$watch( 'visiblePoints', function ( newPoints )
        {
            scope.onVisiblePointsChange( newPoints );
        } );

        scope.$watch( 'groupBoundsPoly', function ( newGroupBoundsPoly )
        {
            scope.setGroupBounds( newGroupBoundsPoly );
        } );

        scope.$watch( 'mapCenter', function ( newMapCenter )
        {
            if( !newMapCenter )
                return;

            newMapCenter = new google.maps.LatLng( newMapCenter.lat, newMapCenter.lon );

            scope.mapInstance.setCenter( newMapCenter );
        } );

        scope.mapInstance = new google.maps.Map( $( elem ).children( ".google-map-canvas" )[0], scope.mapInfo );

        if( scope.onMapEditorReady )
            scope.onMapEditorReady( { mapInstance: scope.mapInstance } );

        google.maps.event.addListener( scope.mapInstance, 'click', function ( mouseEvent )
        {
            var southWest = {
                lat: mouseEvent.latLng.lat(),
                lon: mouseEvent.latLng.lng()
            };
            var northEast = {
                lat: mouseEvent.latLng.lat() + 0.01,
                lon: mouseEvent.latLng.lng() + 0.01
            };

            var vertices = [
                southWest,
                { lat: northEast.lat, lon: southWest.lon },
                northEast,
                { lat: southWest.lat, lon: northEast.lon }
            ];

            if( scope.editPolyVerts )
                scope.editPolyVerts.vertices = vertices;
            scope.onEditPolyChange( scope.editPolyVerts );

            //var newShape = createPolygon( map, vertices );

            //newShape.myName = "Name" + ( Math.floor( Math.random() * 10000 ) );

            //google.maps.event.addListener( newShape, 'click', function ()
            //{
            //    $scope.$apply( function ()
            //    {
            //        $scope.geoJsonString = makeGeoJson( newShape );
            //    } );
            //} );
        } );
    };

    return {
        scope: {
            editPolyVerts: "=",
            visiblePolys: "=",
            visiblePoints: "=",
            groupBoundsPoly: "=",
            mapCenter: "=",
            onMapEditorReady: "&",
            enableMapControls: "=",
            enableClustering: "="
        },
        restrict: 'E',
        replace: 'true',
        templateUrl: '/ngApp/services/GoogleMapPolyEditorTemplate.html',
        link: linkFunction
    };
}] );
var Ally;
(function (Ally) {
    class ReplyComment {
    }
    class CommentsState {
    }
    /**
     * The controller for the committee home page
     */
    class GroupCommentThreadViewController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope, siteInfo, $scope, $sce) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$scope = $scope;
            this.$sce = $sce;
            this.isLoading = false;
            this.editCommentShouldRemoveAttachment = false;
            this.shouldShowAdminControls = false;
            this.digestFrequency = null;
            this.shouldShowAddComment = true;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.defaultDigestFrequency = this.siteInfo.userInfo.defaultDigestFrequency;
            this.shouldShowAdminControls = this.siteInfo.userInfo.isSiteManager;
            this.threadUrl = this.siteInfo.publicSiteInfo.baseUrl + "/#!/Home/DiscussionThread/" + this.thread.commentThreadId;
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            this.retrieveComments();
            if (!this.thread.isReadOnly && !this.thread.archiveDateUtc)
                this.initCommentTinyMce("new-comment-tiny-mce-editor");
        }
        initCommentTinyMce(elemId) {
            // Auto-focus on replies and edits
            if (elemId === "reply-tiny-mce-editor" || elemId === "edit-tiny-mce-editor")
                GroupCommentThreadViewController.TinyMceSettings.autoFocusElemId = elemId;
            else
                GroupCommentThreadViewController.TinyMceSettings.autoFocusElemId = undefined;
            Ally.HtmlUtil2.initTinyMce(elemId, 200, GroupCommentThreadViewController.TinyMceSettings).then(e => {
                if (elemId === "reply-tiny-mce-editor")
                    this.replyTinyMceEditor = e;
                else if (elemId === "edit-tiny-mce-editor")
                    this.editTinyMceEditor = e;
                else
                    this.newCommentTinyMceEditor = e;
                // Hook up CTRL+enter to submit a comment
                e.shortcuts.add('ctrl+13', 'CTRL ENTER to submit comment', () => {
                    this.$scope.$apply(() => {
                        if (elemId === "reply-tiny-mce-editor")
                            this.submitReplyComment();
                        else if (elemId === "edit-tiny-mce-editor")
                            this.submitCommentEdit();
                        else
                            this.submitNewComment();
                    });
                });
            });
        }
        /**
         * Handle the key down message on the message text area
         */
        onTextAreaKeyDown(e, messageType) {
            // keyCode = ( e.keyCode ? e.keyCode : e.which );
            const KeyCode_Enter = 13;
            if (e.keyCode == KeyCode_Enter) {
                e.preventDefault();
                if (messageType === "new")
                    this.submitNewComment();
                else if (messageType === "edit")
                    this.submitCommentEdit();
                else if (messageType === "reply")
                    this.submitReplyComment();
            }
        }
        /**
         * Occurs when the user elects to set the thread digest frequency
         */
        onChangeDigestFrequency() {
            this.isLoading = true;
            const putUri = `/api/CommentThread/${this.thread.commentThreadId}/DigestFrequency/${this.commentsState.digestFrequency}`;
            this.$http.put(putUri, null).then(() => {
                this.isLoading = false;
            }, (response) => {
                this.isLoading = false;
                alert("Failed to change: " + response.data.exceptionMessage);
            });
        }
        /**
         * Retrieve the comments from the server
         */
        retrieveComments() {
            this.isLoading = true;
            this.$http.get(`/api/CommentThread/${this.thread.commentThreadId}/Comments`).then((response) => {
                this.isLoading = false;
                this.commentsState = response.data;
                const processComments = (c) => {
                    c.isMyComment = c.authorUserId === this.$rootScope.userInfo.userId;
                    c.commentText = this.$sce.trustAsHtml(c.commentText);
                    if (c.replies)
                        _.each(c.replies, processComments);
                };
                _.forEach(this.commentsState.comments, processComments);
                this.commentsState.comments = _.sortBy(this.commentsState.comments, ct => ct.postDateUtc).reverse();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to retrieve comments: " + response.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user clicks the button to reply to a comment
         */
        startReplyToComment(comment) {
            this.replyToCommentId = comment.commentId;
            this.replyCommentText = "";
            this.editCommentId = -1;
            this.shouldShowAddComment = false;
            this.initCommentTinyMce("reply-tiny-mce-editor");
        }
        /**
         * Edit an existing comment
         * @param comment
         */
        startEditComment(comment) {
            this.editCommentId = comment.commentId;
            this.editCommentText = comment.commentText;
            this.editCommentShouldRemoveAttachment = false;
            this.replyToCommentId = -1;
            this.shouldShowAddComment = false;
            this.initCommentTinyMce("edit-tiny-mce-editor");
        }
        /**
         * Delete a comment
         */
        deleteComment(comment) {
            let deleteMessage = "Are you sure you want to delete this comment?";
            if (this.commentsState.comments.length === 1)
                deleteMessage = "Since there is only one comment, if you delete this comment you'll delete the thread. Are you sure you want to delete this comment?";
            if (!confirm(deleteMessage))
                return;
            this.isLoading = true;
            this.$http.delete(`/api/CommentThread/${this.thread.commentThreadId}/${comment.commentId}`).then(() => {
                this.isLoading = false;
                if (this.commentsState.comments.length === 1) {
                    // Tell the parent thread list to refresh
                    this.$rootScope.$broadcast("refreshCommentThreadList");
                    this.closeModal(false);
                }
                else
                    this.retrieveComments();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to post comment: " + response.data.exceptionMessage);
            });
        }
        /**
         * Archive this thread
         */
        archiveThread(shouldArchive = true) {
            this.isLoading = true;
            let putUri = `/api/CommentThread/Archive/${this.thread.commentThreadId}`;
            if (!shouldArchive)
                putUri = `/api/CommentThread/Unarchive/${this.thread.commentThreadId}`;
            this.$http.put(putUri, null).then(() => {
                this.isLoading = false;
                // Tell the parent thread list to refresh
                this.$rootScope.$broadcast("refreshCommentThreadList");
                this.closeModal(false);
            }, (response) => {
                this.isLoading = false;
                alert("Failed to archive: " + response.data.exceptionMessage);
            });
        }
        /**
         * Modify an existing comment
         */
        submitCommentEdit() {
            const editInfo = {
                commentId: this.editCommentId,
                newCommentText: this.editTinyMceEditor.getContent(),
                shouldRemoveAttachment: this.editCommentShouldRemoveAttachment
            };
            if (!editInfo.newCommentText) {
                alert("Comments cannot be empty. If you want to delete the comment, click the delete button.");
                return;
            }
            this.isLoading = true;
            this.$http.put(`/api/CommentThread/${this.thread.commentThreadId}/EditComment`, editInfo).then(() => {
                this.isLoading = false;
                this.editCommentId = -1;
                this.editCommentText = "";
                this.editCommentShouldRemoveAttachment = false;
                this.editTinyMceEditor.setContent("");
                this.removeAttachment();
                this.retrieveComments();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to edit comment: " + response.data.exceptionMessage);
            });
        }
        /**
         * Add a comment in reply to another
         */
        submitReplyComment() {
            const replyCommentText = this.replyTinyMceEditor.getContent();
            if (!replyCommentText) {
                alert("Please enter some text to add a reply");
                return;
            }
            const newCommentFormData = new FormData();
            newCommentFormData.append("commentText", replyCommentText);
            newCommentFormData.append("replyToCommentId", this.replyToCommentId.toString());
            //newCommentFormData.append( "attachedFile", null );
            //newCommentFormData.append( "attachedGroupDocId", null );
            const putHeaders = {
                headers: { "Content-Type": undefined } // Need to remove this to avoid the JSON body assumption by the server
            };
            this.isLoading = true;
            this.$http.put(`/api/CommentThread/${this.thread.commentThreadId}/AddCommentFromForm`, newCommentFormData, putHeaders).then(() => {
                this.isLoading = false;
                this.replyToCommentId = -1;
                this.replyCommentText = "";
                this.replyTinyMceEditor.setContent("");
                this.removeAttachment();
                this.retrieveComments();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to add comment: " + response.data.exceptionMessage);
            });
        }
        /**
         * Add a new comment to this thread
         */
        submitNewComment() {
            const newCommentText = this.newCommentTinyMceEditor.getContent();
            if (!newCommentText) {
                alert("You must enter text to submit a comment");
                return;
            }
            const newCommentFormData = new FormData();
            newCommentFormData.append("commentText", newCommentText);
            if (this.attachmentFile)
                newCommentFormData.append("attachedFile", this.attachmentFile);
            //newCommentFormData.append( "attachedGroupDocId", null );
            const putHeaders = {
                headers: { "Content-Type": undefined } // Need to remove this to avoid the JSON body assumption by the server
            };
            this.isLoading = true;
            this.$http.put(`/api/CommentThread/${this.thread.commentThreadId}/AddCommentFromForm`, newCommentFormData, putHeaders).then(() => {
                this.isLoading = false;
                this.newCommentText = "";
                this.newCommentTinyMceEditor.setContent("");
                this.removeAttachment();
                this.retrieveComments();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to add comment: " + response.data.exceptionMessage);
            });
        }
        closeModal(isFromOverlayClick) {
            if (this.onClosed)
                this.onClosed();
        }
        copyThreadLink($event) {
            $event.stopPropagation();
            $event.preventDefault();
            if (Ally.HtmlUtil2.copyTextToClipboard(this.threadUrl))
                Ally.HtmlUtil2.showTooltip($event.target, "Copied!");
            else
                Ally.HtmlUtil2.showTooltip($event.target, "Auto-copy failed, right-click and copy link address");
            return false;
        }
        showAddComment() {
            this.shouldShowAddComment = true;
            this.removeAttachment();
            this.initCommentTinyMce("new-comment-tiny-mce-editor");
        }
        cancelCommentEdit() {
            this.editCommentId = -1;
            this.removeAttachment();
            this.showAddComment();
        }
        cancelCommentReply() {
            this.replyToCommentId = -1;
            this.removeAttachment();
            this.showAddComment();
        }
        onFileAttached(event) {
            this.attachmentFile = event.target.files[0];
        }
        removeAttachment() {
            this.attachmentFile = null;
            const fileInput = document.getElementById("comment-attachment-input");
            if (fileInput)
                fileInput.value = null;
        }
        getFileIcon(fileName) {
            return Ally.HtmlUtil2.getFileIcon(fileName);
        }
        onViewAttachedDoc(comment) {
            this.isLoading = true;
            const viewDocWindow = window.open('', '_blank');
            const wasPopUpBlocked = !viewDocWindow || viewDocWindow.closed || typeof viewDocWindow.closed === "undefined";
            if (wasPopUpBlocked) {
                alert(`Looks like your browser may be blocking pop-ups which are required to view documents. Please see the right of the address bar or your browser settings to enable pop-ups for ${AppConfig.appName}.`);
                //this.showPopUpWarning = true;
            }
            else
                viewDocWindow.document.write('Loading document... (If the document cannot be viewed directly in your browser, it will be downloaded automatically)');
            const viewUri = "/api/DocumentLink/DiscussionAttachment/" + comment.commentId;
            this.$http.get(viewUri).then((response) => {
                this.isLoading = false;
                const s3Path = comment.attachedDocPath.substring("s3:".length);
                let fileUri = `Documents/${s3Path}?vid=${encodeURIComponent(response.data.vid)}`;
                fileUri = this.siteInfo.publicSiteInfo.baseApiUrl + fileUri;
                viewDocWindow.location.href = fileUri;
            }, (response) => {
                this.isLoading = false;
                alert("Failed to open document: " + response.data.exceptionMessage);
            });
        }
    }
    GroupCommentThreadViewController.$inject = ["$http", "$rootScope", "SiteInfo", "$scope", "$sce"];
    GroupCommentThreadViewController.TinyMceSettings = {
        menubar: false,
        toolbar: "bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link emoticons"
    };
    Ally.GroupCommentThreadViewController = GroupCommentThreadViewController;
})(Ally || (Ally = {}));
CA.angularApp.component("groupCommentThreadView", {
    bindings: {
        thread: "<",
        onClosed: "&"
    },
    templateUrl: "/ngApp/services/group-comment-thread-view.html",
    controller: Ally.GroupCommentThreadViewController
});

var Ally;
(function (Ally) {
    class CommentThread {
    }
    Ally.CommentThread = CommentThread;
    /**
     * The controller for the discussion threads directive
     */
    class GroupCommentThreadsController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope, siteInfo, $scope, fellowResidents, $timeout) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$scope = $scope;
            this.fellowResidents = fellowResidents;
            this.$timeout = $timeout;
            this.isLoading = false;
            this.viewingThread = null;
            this.showCreateNewModal = false;
            this.showBoardOnly = false;
            this.archivedThreads = null;
            this.canCreateThreads = false;
            this.isDiscussionEmailEnabled = true;
            this.isPremiumPlanActive = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            this.canCreateThreads = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager;
            if (!this.canCreateThreads) {
                if (this.committeeId) {
                    // Make sure committee members can manage their data
                    this.fellowResidents.isCommitteeMember(this.committeeId).then(isCommitteeMember => this.canCreateThreads = isCommitteeMember);
                }
                else {
                    if (!this.siteInfo.privateSiteInfo.whoCanCreateDiscussionThreads || this.siteInfo.privateSiteInfo.whoCanCreateDiscussionThreads === "everyone")
                        this.canCreateThreads = true;
                    else if (this.siteInfo.privateSiteInfo.whoCanCreateDiscussionThreads === "board")
                        this.canCreateThreads = this.siteInfo.userInfo.isSiteManager || this.siteInfo.userInfo.boardPosition !== 0;
                }
            }
            this.showBoardOnly = this.siteInfo.userInfo.isSiteManager || this.siteInfo.userInfo.boardPosition !== 0;
            this.editComment = {
                commentText: "",
                replyToCommentId: null
            };
            this.$scope.$on("refreshCommentThreadList", (event, data) => this.refreshCommentThreads(false));
            this.refreshCommentThreads(false);
        }
        setDisplayCreateModal(shouldShow) {
            this.showCreateNewModal = shouldShow;
            this.newThreadTitle = "";
            this.newThreadIsBoardOnly = false;
            this.newThreadIsReadOnly = false;
            this.shouldSendNoticeForNewThread = true;
            this.newThreadErrorMessage = "";
            Ally.HtmlUtil2.initTinyMce("new-thread-body-rte", 200, Ally.GroupCommentThreadViewController.TinyMceSettings).then(e => this.newBodyMceEditor = e);
            // If we're displaying the modal, focus on the title text box
            if (shouldShow)
                setTimeout(() => $("#new-thread-title-text-box").focus(), 100);
        }
        displayDiscussModal(thread) {
            this.viewingThread = thread;
        }
        hideDiscussModal() {
            this.viewingThread = null;
        }
        /**
         * Occurs when the user clicks the pin to toggle a thread's pinned status
         * @param thread
         */
        onClickPin(thread) {
            this.isLoading = true;
            this.$http.put("/api/CommentThread/TogglePinned/" + thread.commentThreadId, null).then((response) => {
                this.isLoading = false;
                this.refreshCommentThreads();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to toggle: " + response.data.exceptionMessage);
            });
        }
        createNewThread() {
            console.log("In createNewThread");
            this.isLoading = true;
            this.newThreadErrorMessage = null;
            //const createInfo = {
            //    title: this.newThreadTitle,
            //    body: this.newBodyMceEditor.getContent(),
            //    isBoardOnly: this.newThreadIsBoardOnly,
            //    isReadOnly: this.newThreadIsReadOnly,
            //    shouldSendNotice: this.shouldSendNoticeForNewThread,
            //    committeeId: this.committeeId
            //};
            const newThreadFormData = new FormData();
            newThreadFormData.append("title", this.newThreadTitle);
            newThreadFormData.append("body", this.newBodyMceEditor.getContent());
            newThreadFormData.append("isBoardOnly", this.newThreadIsBoardOnly.toString());
            newThreadFormData.append("isReadOnly", this.newThreadIsReadOnly.toString());
            newThreadFormData.append("shouldSendNotice", this.shouldSendNoticeForNewThread.toString());
            if (this.committeeId)
                newThreadFormData.append("committeeId", this.committeeId.toString());
            if (this.attachmentFile)
                newThreadFormData.append("attachedFile", this.attachmentFile);
            const postHeaders = {
                headers: { "Content-Type": undefined } // Need to remove this to avoid the JSON body assumption by the server
            };
            this.$http.post("/api/CommentThread/CreateThreadFromForm", newThreadFormData, postHeaders).then(() => {
                this.isLoading = false;
                this.showCreateNewModal = false;
                this.removeAttachment();
                this.refreshCommentThreads(false);
            }, (response) => {
                this.isLoading = false;
                this.newThreadErrorMessage = response.data.exceptionMessage;
            });
        }
        /**
         * Retrieve the comments from the server for the current thread
         */
        refreshCommentThreads(retrieveArchived = false) {
            this.isLoading = true;
            let getUri = "/api/CommentThread";
            if (retrieveArchived)
                getUri += "/Archived";
            if (this.committeeId)
                getUri += "?committeeId=" + this.committeeId;
            this.$http.get(getUri).then((response) => {
                this.isLoading = false;
                // Sort by comment date, put unpinned threads 100 years in the past so pinned always show up on top
                response.data = _.sortBy(response.data, ct => ct.pinnedDateUtc ? ct.pinnedDateUtc : moment(ct.lastCommentDateUtc).subtract(100, "years").toDate()).reverse();
                if (retrieveArchived)
                    this.archivedThreads = response.data;
                else {
                    this.commentThreads = response.data;
                    this.archivedThreads = null;
                    // If we should automatically open a discussion thread
                    if (this.autoOpenThreadId) {
                        const autoOpenThread = _.find(this.commentThreads, t => t.commentThreadId === this.autoOpenThreadId);
                        if (autoOpenThread)
                            this.$timeout(() => this.displayDiscussModal(autoOpenThread), 125);
                        // Don't open again
                        this.autoOpenThreadId = null;
                    }
                }
            }, (response) => {
                this.isLoading = false;
            });
        }
        onFileAttached(event) {
            this.attachmentFile = event.target.files[0];
        }
        removeAttachment() {
            this.attachmentFile = null;
            const fileInput = document.getElementById("comment-attachment-input");
            if (fileInput)
                fileInput.value = null;
        }
    }
    GroupCommentThreadsController.$inject = ["$http", "$rootScope", "SiteInfo", "$scope", "fellowResidents", "$timeout"];
    Ally.GroupCommentThreadsController = GroupCommentThreadsController;
})(Ally || (Ally = {}));
CA.angularApp.component("groupCommentThreads", {
    bindings: {
        committeeId: "<?",
        autoOpenThreadId: "<?"
    },
    templateUrl: "/ngApp/services/group-comment-threads.html",
    controller: Ally.GroupCommentThreadsController
});

var Ally;
(function (Ally) {
    class Comment {
    }
    Ally.Comment = Comment;
    /**
     * The controller for the committee home page
     */
    class GroupCommentsController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.isLoading = false;
            this.showDiscussModal = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isQaSite = false; //HtmlUtil.getSubdomain() === "qa" || HtmlUtil.getSubdomain() === "localtest";
            if (!this.threadId)
                this.threadId = "Home";
            this.editComment = {
                threadId: this.threadId,
                commentText: "",
                replyToCommentId: null
            };
            this.refreshComments();
        }
        displayDiscussModal() {
            this.showDiscussModal = true;
        }
        hideDiscussModal() {
            //TODO put in a delay before we allow close to avoid the mobile tap-open-close issue
            this.showDiscussModal = false;
        }
        /**
         * Retrieve the comments from the server for the current thread
         */
        refreshComments() {
            this.isLoading = true;
            this.$http.get("/api/Comment?threadId=" + this.threadId).then((response) => {
                this.isLoading = false;
                this.commentList = response.data;
                const processComments = (c) => {
                    c.isMyComment = c.authorUserId === this.$rootScope.userInfo.userId;
                    if (c.replies)
                        _.each(c.replies, processComments);
                };
                // Convert the UTC dates to local dates and mark the user's comments
                _.each(this.commentList, processComments);
            }, (response) => {
                this.isLoading = false;
                alert("Failed to refresh comments: " + response.data.exceptionMessage);
            });
        }
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Add a comment
        ///////////////////////////////////////////////////////////////////////////////////////////
        postComment(commentData) {
            this.isLoading = true;
            let httpFunc = this.$http.post;
            if (typeof (commentData.existingCommentId) === "number")
                httpFunc = this.$http.put;
            httpFunc("/api/Comment", commentData).then(() => {
                this.isLoading = false;
                this.editComment = {};
                this.showReplyBoxId = -1;
                this.refreshComments();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to post comment: " + response.data.exceptionMessage);
            });
        }
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Add a comment to the current thread
        ///////////////////////////////////////////////////////////////////////////////////////////
        onPostCommentClicked() {
            if (this.editComment.commentText.length === 0)
                return;
            // Copy the object to avoid updating the UI
            const commentData = {
                threadId: this.threadId,
                commentText: this.editComment.commentText,
                replyToCommentId: null,
                existingCommentId: this.editComment.existingCommentId
            };
            this.postComment(commentData);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Edit an existing comment
        ///////////////////////////////////////////////////////////////////////////////////////////
        editMyComment(comment) {
            this.editComment = {
                commentText: comment.commentText,
                existingCommentId: comment.commentId
            };
        }
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Delete a comment
        ///////////////////////////////////////////////////////////////////////////////////////////
        deleteMyComment(comment) {
            this.isLoading = true;
            this.$http.delete("/api/Comment?commentId=" + comment.commentId).then(() => {
                this.isLoading = false;
                this.refreshComments();
            }, (httpResponse) => {
                this.isLoading = false;
                const errorMessage = httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to post comment: " + errorMessage);
            });
        }
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Add a comment in response to a comment in the current thread
        ///////////////////////////////////////////////////////////////////////////////////////////
        onPostReplyCommentClicked() {
            if (this.editComment.replyText.length === 0)
                return;
            // Copy the object to avoid updating the UI
            const commentData = {
                threadId: this.threadId,
                commentText: this.editComment.replyText,
                replyToCommentId: this.editComment.replyToCommentId
            };
            this.postComment(commentData);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to reply
        ///////////////////////////////////////////////////////////////////////////////////////////
        clickReplyToComment(commentId) {
            this.showReplyBoxId = commentId;
            this.editComment = {
                commentText: "",
                replyToCommentId: commentId
            };
        }
    }
    GroupCommentsController.$inject = ["$http", "$rootScope"];
    Ally.GroupCommentsController = GroupCommentsController;
})(Ally || (Ally = {}));
CA.angularApp.component("groupComments", {
    bindings: {
        threadId: "@?"
    },
    templateUrl: "/ngApp/services/group-comments.html",
    controller: Ally.GroupCommentsController
});

/// <reference path="../../Scripts/typings/googlemaps/google.maps.d.ts" />
var Ally;
(function (Ally) {
    class HtmlUtil2 {
        static convertStringsToDates(obj) {
            if ($.isArray(obj)) {
                HtmlUtil2.convertDatesFromArray(obj);
            }
            if (HtmlUtil2.isObject(obj)) {
                // Recursively evaluate nested objects
                for (const curPropName in obj) {
                    const value = obj[curPropName];
                    if (HtmlUtil2.isObject(value)) {
                        HtmlUtil2.convertStringsToDates(value);
                    }
                    else if ($.isArray(value)) {
                        HtmlUtil2.convertDatesFromArray(value);
                    }
                    else if (HtmlUtil2.isString(value) && value.length > 10 && HtmlUtil2.dotNetTimeRegEx2.test(value)) {
                        //If it is a string of the expected form convert to date
                        let parsedDate;
                        if (HtmlUtil.endsWith(curPropName, "_UTC")
                            || HtmlUtil.endsWith(curPropName, "Utc")) {
                            parsedDate = HtmlUtil2.serverUtcDateToLocal(value);
                        }
                        else
                            parsedDate = new Date(value);
                        obj[curPropName] = parsedDate;
                    }
                }
            }
        }
        static convertDatesFromArray(array) {
            for (let i = 0; i < array.length; i++) {
                const value = array[i];
                if (HtmlUtil2.isObject(value)) {
                    HtmlUtil2.convertStringsToDates(value);
                }
                else if (HtmlUtil2.isString(value) && HtmlUtil2.iso8601RegEx.test(value)) {
                    array[i] = new Date(value);
                }
            }
        }
        static isObject(value) {
            return Object.prototype.toString.call(value) === "[object Object]";
        }
        static isString(value) {
            return Object.prototype.toString.call(value) === "[object String]";
        }
        /// Test if an object is a string, if it is not empty, and if it's not "null"
        static isValidString(str) {
            if (!str || typeof (str) !== "string")
                return false;
            if (str === "null")
                return false;
            return str.length > 0;
        }
        // Convert a UTC date string from the server to a local date object
        static serverUtcDateToLocal(dbString) {
            if (typeof dbString !== "string")
                return dbString;
            if (HtmlUtil.isNullOrWhitespace(dbString))
                return null;
            return moment.utc(dbString).toDate();
        }
        static showTooltip(element, text) {
            $(element).qtip({
                style: {
                    classes: 'qtip-light qtip-shadow'
                },
                position: {
                    my: "leftMiddle",
                    at: "rightMiddle"
                },
                content: { text: text },
                events: {
                    hide: function (e) {
                        $(e.originalEvent.currentTarget).qtip("destroy");
                    }
                }
            });
            $(element).qtip("show");
        }
        static removeNonAlphanumeric(str) {
            return str.replace(/\W/g, '');
        }
        /** Download a CSV string as a file */
        static downloadCsv(csvText, downloadFileName) {
            HtmlUtil2.downloadFile(csvText, downloadFileName, "text/csv");
        }
        /** Download a XML string as a file */
        static downloadXml(xmlText, downloadFileName) {
            HtmlUtil2.downloadFile(xmlText, downloadFileName, "text/xml");
        }
        /** Download a string as a file */
        static downloadFile(fileContents, downloadFileName, contentType) {
            if (typeof (Blob) !== "undefined") {
                const a = document.createElement("a");
                document.body.appendChild(a);
                a.style.display = "none";
                const blob = new Blob([fileContents], { type: contentType });
                const url = window.URL.createObjectURL(blob);
                a.href = url;
                a.download = downloadFileName;
                a.click();
                window.URL.revokeObjectURL(url);
            }
            else {
                const wrappedFileDataString = "data:" + contentType + ";charset=utf-8," + fileContents;
                const encodedFileDataUri = encodeURI(wrappedFileDataString);
                const downloadLink = document.createElement("a");
                downloadLink.setAttribute("href", encodedFileDataUri);
                downloadLink.setAttribute("download", downloadFileName);
                document.body.appendChild(downloadLink);
                downloadLink.click(); // This will download the file
                setTimeout(function () { document.body.removeChild(downloadLink); }, 500);
            }
        }
        /** Determine if a string starts with a numeric string */
        static startsWithNumber(testString, shouldTrim = true) {
            if (HtmlUtil.isNullOrWhitespace(testString))
                return false;
            if (shouldTrim)
                testString = testString.trim();
            let firstWhitespaceIndex = testString.search(/[\s,]/); // Find the first whitespace or comma
            // If no whitespace was found then test the whole string
            if (firstWhitespaceIndex === -1)
                firstWhitespaceIndex = testString.length;
            testString = testString.substring(0, firstWhitespaceIndex);
            return HtmlUtil.isNumericString(testString);
        }
        /** Determine if a string ends with a numeric string */
        static endsWithNumber(testString, shouldTrim = true) {
            if (HtmlUtil.isNullOrWhitespace(testString))
                return false;
            if (shouldTrim)
                testString = testString.trim();
            return /[0-9]+$/.test(testString);
        }
        /** Get the number at the end of a string, null if the string doesn't end with a number */
        static getNumberAtEnd(testString) {
            if (HtmlUtil2.endsWithNumber(testString))
                return parseInt(testString.match(/[0-9]+$/)[0]);
            return null;
        }
        /** Get the number at the start of a string, null if the string doesn't start with a number */
        static getNumberAtStart(testString) {
            if (HtmlUtil2.startsWithNumber(testString))
                return parseInt(testString.match(/^[0-9]+/)[0]);
            return null;
        }
        static isAndroid() {
            const ua = navigator.userAgent.toLowerCase();
            return ua.indexOf("android") > -1;
        }
        // From https://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript
        static copyTextToClipboard(text) {
            const textArea = document.createElement("textarea");
            //
            // *** This styling is an extra step which is likely not required. ***
            //
            // Why is it here? To ensure:
            // 1. the element is able to have focus and selection.
            // 2. if the element was to flash render it has minimal visual impact.
            // 3. less flakyness with selection and copying which **might** occur if
            //    the textarea element is not visible.
            //
            // The likelihood is the element won't even render, not even a
            // flash, so some of these are just precautions. However in
            // Internet Explorer the element is visible whilst the popup
            // box asking the user for permission for the web page to
            // copy to the clipboard.
            //
            // Place in the top-left corner of screen regardless of scroll position.
            textArea.style.position = "fixed";
            textArea.style.top = "0";
            textArea.style.left = "0";
            // Ensure it has a small width and height. Setting to 1px / 1em
            // doesn't work as this gives a negative w/h on some browsers.
            textArea.style.width = "2em";
            textArea.style.height = "2em";
            // We don"t need padding, reducing the size if it does flash render.
            textArea.style.padding = "0";
            // Clean up any borders.
            textArea.style.border = "none";
            textArea.style.outline = "none";
            textArea.style.boxShadow = "none";
            // Avoid flash of the white box if rendered for any reason.
            textArea.style.background = "transparent";
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            let didCopy = false;
            try {
                const successful = document.execCommand("copy");
                const msg = successful ? "successful" : "unsuccessful";
                console.log("Copying text command was " + msg);
                didCopy = successful;
            }
            catch (err) {
                console.log("Oops, unable to copy");
            }
            document.body.removeChild(textArea);
            return didCopy;
        }
        /* eslint-disable  @typescript-eslint/no-explicit-any */
        static smartSortStreetAddresses(homeList, namePropName) {
            if (!homeList || homeList.length === 0)
                return homeList;
            // If all homes have a numeric name then lets sort numerically
            const shouldUseNumericNames = _.every(homeList, u => HtmlUtil.isNumericString(u[namePropName]));
            if (shouldUseNumericNames)
                return _.sortBy(homeList, u => +u[namePropName]);
            // If all homes share the same suffix then sort by only the first part, if numeric
            const firstHomeName = homeList[0][namePropName];
            const firstSuffix = firstHomeName.substr(firstHomeName.indexOf(" "));
            const allHaveNumericPrefix = _.every(homeList, u => HtmlUtil2.startsWithNumber(u[namePropName]));
            const allHaveSameSuffix = _.every(homeList, u => HtmlUtil.endsWith(u[namePropName], firstSuffix));
            if (allHaveNumericPrefix && allHaveSameSuffix)
                return _.sortBy(homeList, u => parseInt(u[namePropName].substr(0, u[namePropName].indexOf(" "))));
            // And the flip, if all names start with the same string "Unit #" and end with a number, sort by that number
            const firstNumberIndex = firstHomeName.search(/[0-9]/);
            if (firstNumberIndex >= 0) {
                const firstPrefix = firstHomeName.substr(0, firstNumberIndex);
                const allHaveSamePrefix = _.every(homeList, u => HtmlUtil.startsWith(u[namePropName], firstPrefix));
                const allEndWithNumber = _.every(homeList, u => HtmlUtil2.endsWithNumber(u[namePropName]));
                if (allHaveSamePrefix && allEndWithNumber)
                    return _.sortBy(homeList, u => HtmlUtil2.getNumberAtEnd(u[namePropName]));
            }
            // If all units start with a number and end with a string (Like,
            // 123 Elm St) then first sort by the street, then number
            if (allHaveNumericPrefix) {
                const sortByStreet = (s1, s2) => {
                    const suffix1 = getAfterNumber(s1);
                    const suffix2 = getAfterNumber(s2);
                    if (suffix1 === suffix2) {
                        const num1 = parseInt(s1.substr(0, s1.search(/\s/)));
                        const num2 = parseInt(s2.substr(0, s2.search(/\s/)));
                        return num1 - num2;
                    }
                    return suffix1.localeCompare(suffix2);
                };
                const getAfterNumber = (str) => str.substring(str.search(/\s/) + 1);
                return homeList.sort((h1, h2) => sortByStreet(h1[namePropName], h2[namePropName]));
                //return _.sortBy( homeList, u => [getAfterNumber( u[namePropName] ), parseInt( u[namePropName].substr( 0, u[namePropName].search( /\s/ ) ) )] );
            }
            let firstPrefix = null;
            if (firstHomeName.includes(" "))
                firstPrefix = firstHomeName.substr(0, firstHomeName.indexOf(" ") + 1); // +1 to include the space
            if (firstPrefix) {
                const allHaveSamePrefix = _.every(homeList, u => HtmlUtil.startsWith(u[namePropName], firstPrefix));
                if (allHaveSamePrefix) {
                    const allHaveNumAfterPrefix = _.every(homeList, u => HtmlUtil2.startsWithNumber(u[namePropName].substr(firstPrefix.length)));
                    if (allHaveNumAfterPrefix) {
                        return _.sortBy(homeList, u => HtmlUtil2.getNumberAtStart(u[namePropName].substr(firstPrefix.length)));
                    }
                }
            }
            return _.sortBy(homeList, u => (u[namePropName] || "").toLowerCase());
        }
        /**
         * Resize a base 64 image. From https://stackoverflow.com/a/63348962/10315651
         * @param {String} base64 - The base64 string (must include MIME type)
         * @param {Number} newWidth - The width of the image in pixels
         * @param {Number} newHeight - The height of the image in pixels
         */
        static resizeBase64Img(base64, newWidth, newHeight) {
            return new Promise((resolve, reject) => {
                const canvas = document.createElement("canvas");
                canvas.width = newWidth;
                canvas.height = newHeight;
                const context = canvas.getContext("2d");
                const image = document.createElement("img");
                image.onload = function () {
                    context.drawImage(image, 0, 0, image.width, image.height, 0, 0, newWidth, newHeight);
                    resolve(canvas.toDataURL());
                };
                image.src = base64;
            });
        }
        /**
         * Resize an image
         * @param {HTMLImageElement} image - The image to resize
         * @param {Number} newWidth - The width of the image in pixels
         * @param {Number} newHeight - The height of the image in pixels
         */
        static resizeFromImg(image, newWidth, newHeight) {
            return new Promise((resolve, reject) => {
                const canvas = document.createElement("canvas");
                canvas.width = newWidth;
                canvas.height = newHeight;
                const context = canvas.getContext("2d");
                context.scale(newWidth / image.width, newHeight / image.height);
                context.drawImage(image, 0, 0);
                resolve(canvas.toDataURL());
            });
        }
        /**
         * Resize an image and output a blob
         * @param {HTMLImageElement} image - The image to resize
         * @param {Number} newWidth - The width of the image in pixels
         * @param {Number} newHeight - The height of the image in pixels
         */
        static resizeFromImgToBlob(image, newWidth, newHeight, mimeType = "image/jpeg") {
            return new Promise((resolve, reject) => {
                const canvas = document.createElement("canvas");
                canvas.width = newWidth;
                canvas.height = newHeight;
                const context = canvas.getContext("2d");
                context.drawImage(image, 0, 0, image.width, image.height, 0, 0, newWidth, newHeight);
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, mimeType, 0.75);
            });
        }
        static initTinyMce(elemId = "tiny-mce-editor", heightPixels = 400, overrideOptions = null) {
            const mcePromise = new Promise((resolve, reject) => {
                const loadRtes = () => {
                    tinymce.remove();
                    const menubar = (overrideOptions && overrideOptions.menubar !== undefined) ? overrideOptions.menubar : "edit insert format table";
                    const toolbar = (overrideOptions && overrideOptions.toolbar !== undefined) ? overrideOptions.toolbar : "styleselect | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | checklist code formatpainter table";
                    const autoFocusElemId = (overrideOptions && overrideOptions.toolbar !== undefined) ? overrideOptions.autoFocusElemId : undefined;
                    tinymce.init({
                        selector: '#' + elemId,
                        auto_focus: autoFocusElemId,
                        statusbar: true,
                        elementpath: false,
                        wordcount: true,
                        resize: true,
                        menubar,
                        //plugins: 'a11ychecker advcode casechange export formatpainter image editimage linkchecker autolink lists checklist media mediaembed pageembed permanentpen powerpaste table advtable tableofcontents tinycomments tinymcespellchecker',
                        plugins: 'image link autolink lists media table code emoticons',
                        //toolbar: 'a11ycheck addcomment showcomments casechange checklist code export formatpainter image editimage pageembed permanentpen table tableofcontents',
                        toolbar,
                        //toolbar_mode: 'floating',
                        //tinycomments_mode: 'embedded',
                        //tinycomments_author: 'Author name',
                        height: heightPixels,
                        file_picker_types: 'image',
                        image_description: false,
                        file_picker_callback: function (cb, value, meta) {
                            const input = document.createElement('input');
                            input.setAttribute('type', 'file');
                            input.setAttribute('accept', 'image/*');
                            /*
                              Note: In modern browsers input[type="file"] is functional without
                              even adding it to the DOM, but that might not be the case in some older
                              or quirky browsers like IE, so you might want to add it to the DOM
                              just in case, and visually hide it. And do not forget do remove it
                              once you do not need it anymore.
                            */
                            input.onchange = function (evt) {
                                // debugger; // This code gets called on uploaded file selection
                                const selectedFile = evt.target.files[0];
                                const reader = new FileReader();
                                reader.onload = function (fileObject) {
                                    /*
                                      Note: Now we need to register the blob in TinyMCEs image blob
                                      registry. In the next release this part hopefully won't be
                                      necessary, as we are looking to handle it internally.
                                    */
                                    const newBlobId = 'blobid' + (new Date()).getTime();
                                    const blobCache = tinymce.activeEditor.editorUpload.blobCache;
                                    const base64 = reader.result.split(',')[1];
                                    //console.log( "Image base64 size: " + base64.length );
                                    // If the image is larger than 1MB, let's downsize
                                    const OneMB = 1024 * 1024;
                                    if (base64.length > OneMB) {
                                        const tempImage = new Image();
                                        tempImage.onload = function () {
                                            // access image size here 
                                            //console.log( "image width", tempImage.width );
                                            // Resize so the largest edge is 1k pixels
                                            const xScalar = 1000 / tempImage.width;
                                            const yScalar = 1000 / tempImage.height;
                                            let imageScalar = xScalar;
                                            if (yScalar < xScalar)
                                                imageScalar = yScalar;
                                            HtmlUtil2.resizeFromImgToBlob(tempImage, Math.round(tempImage.width * imageScalar), Math.round(tempImage.height * imageScalar), selectedFile.type).then((resizedBlob) => {
                                                //console.log( "Resized image base64 size: " + resizedBlob.size );
                                                //const resizedTempImage = new Image();
                                                //resizedTempImage.onload = function()
                                                //{
                                                //    //console.log( "resized image width", resizedTempImage.width );
                                                //    var resizedReader = new FileReader();
                                                //    resizedReader.readAsDataURL( resizedBlob );
                                                //    resizedReader.onloadend = function()
                                                //    {
                                                //        const resizedFile = new File( [resizedBlob], selectedFile.name, resizedBlob )
                                                //        const resizedBase64 = ( resizedReader.result as string ).split( ',' )[1];
                                                //        const blobInfo = blobCache.create( newBlobId, resizedFile, resizedBase64 );
                                                //        blobCache.add( blobInfo );
                                                //        /* call the callback and populate the Title field with the file name */
                                                //        cb( blobInfo.blobUri(), { title: selectedFile.name } );
                                                //    }
                                                //};
                                                //var resizedImgUrl = URL.createObjectURL( resizedBlob );
                                                //resizedTempImage.src = resizedImgUrl;
                                                const resizedReader = new FileReader();
                                                resizedReader.readAsDataURL(resizedBlob);
                                                resizedReader.onloadend = function () {
                                                    const resizedFileObject = new File([resizedBlob], selectedFile.name, resizedBlob);
                                                    const resizedBase64 = resizedReader.result.split(',')[1];
                                                    const blobInfo = blobCache.create(newBlobId, resizedFileObject, resizedBase64);
                                                    blobCache.add(blobInfo);
                                                    /* call the callback and populate the Title field with the file name */
                                                    cb(blobInfo.blobUri(), { title: selectedFile.name });
                                                };
                                            });
                                        };
                                        tempImage.src = fileObject.target.result;
                                    }
                                    else {
                                        const blobInfo = blobCache.create(newBlobId, selectedFile, base64);
                                        blobCache.add(blobInfo);
                                        /* call the callback and populate the Title field with the file name */
                                        cb(blobInfo.blobUri(), { title: selectedFile.name });
                                    }
                                };
                                reader.readAsDataURL(selectedFile);
                            };
                            input.click();
                        },
                    }).then((e) => {
                        resolve(e[0]);
                    });
                };
                // Need to delay a bit for TinyMCE to load in case the user is started from a fresh
                // page reload
                setTimeout(() => {
                    if (typeof (tinymce) === "undefined")
                        setTimeout(() => loadRtes(), 400);
                    else
                        loadRtes();
                }, 100);
            });
            return mcePromise;
        }
        /**
         * Get the icon for a file
         * @param fileName The full path, file name, extension, or extension with dot
         * @returns A path to the image file for this type
         */
        static getFileIcon(fileName) {
            if (!fileName)
                fileName = "";
            const extension = fileName.split('.').pop().toLowerCase();
            let imagePath = null;
            switch (extension) {
                case "pdf":
                    imagePath = "PdfIcon.png";
                    break;
                case "doc":
                case "docx":
                    imagePath = "WordIcon.png";
                    break;
                case "xls":
                case "xlsx":
                    imagePath = "ExcelIcon.png";
                    break;
                case "ppt":
                case "pptx":
                    imagePath = "PptxIcon.png";
                    break;
                case "jpeg":
                case "jpe":
                case "jpg":
                case "png":
                case "bmp":
                    imagePath = "ImageIcon.png";
                    break;
                case "zip":
                    imagePath = "ZipIcon.png";
                    break;
                case "txt":
                    imagePath = "TxtIcon.png";
                    break;
                case "mp4":
                    imagePath = "Mp4Icon.png";
                    break;
                default:
                    imagePath = "GenericFileIcon.png";
                    break;
            }
            return "/assets/images/FileIcons/" + imagePath;
        }
        static getStripeFeeInfo(paymentAmount, payerPaysFee, isPremiumPlanActive) {
            let feeAmount;
            let totalAmountPaid;
            let groupReceives;
            let payerFee;
            const StripeAchFeePercent = 0.008;
            const StripeMaxFee = 5;
            if (payerPaysFee) {
                groupReceives = paymentAmount;
                // dwollaFeePercent is in display percent, so 0.8 = 0.8% = 0.008 scalar
                // So we only need to divide by 100 to get our rounded fee
                totalAmountPaid = paymentAmount / (1 - StripeAchFeePercent);
                feeAmount = totalAmountPaid - paymentAmount;
                //paymentAmount = totalAmountPaid - paymentAmount;
                // Cap the fee at $5 for premium, $10 for free plan groups
                const MaxFeeAmount = 5;
                const useMaxFee = feeAmount > MaxFeeAmount;
                if (useMaxFee) {
                    feeAmount = MaxFeeAmount;
                    totalAmountPaid = paymentAmount + feeAmount;
                }
                // On the free plan there's an additional fee
                if (!isPremiumPlanActive) {
                    if (useMaxFee)
                        totalAmountPaid = paymentAmount + (MaxFeeAmount * 2);
                    else
                        totalAmountPaid = totalAmountPaid / (1 - StripeAchFeePercent);
                    feeAmount = totalAmountPaid - paymentAmount;
                    // This can happen at $618.12-$620.61
                    //console.log( "feeAmount", feeAmount );
                    if (feeAmount > MaxFeeAmount * 2)
                        feeAmount = MaxFeeAmount * 2;
                }
                payerFee = feeAmount;
            }
            // Otherwise the group pays the fee
            else {
                totalAmountPaid = paymentAmount;
                payerFee = 0;
                feeAmount = paymentAmount * StripeAchFeePercent;
                if (feeAmount > StripeMaxFee)
                    feeAmount = StripeMaxFee;
                // On the free plan, add 0.8% app fee and track total 1.6% fee
                if (!isPremiumPlanActive)
                    feeAmount *= 2;
                groupReceives = paymentAmount - feeAmount;
            }
            return {
                totalAmountPaid,
                feeAmount,
                groupReceives,
                payerFee
            };
        }
    }
    // Matches YYYY-MM-ddThh:mm:ss.sssZ where .sss is optional
    //"2018-03-12T22:00:33"
    HtmlUtil2.iso8601RegEx = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
    //static dotNetTimeRegEx = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
    // Not sure how the Community Ally server differs from other .Net WebAPI apps, but this
    // regex is needed for the dates that come down
    HtmlUtil2.dotNetTimeRegEx2 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?$/;
    Ally.HtmlUtil2 = HtmlUtil2;
    /**
     * Represents an exception returned from an API endpoint
     */
    class ExceptionResult {
    }
    Ally.ExceptionResult = ExceptionResult;
})(Ally || (Ally = {}));

var Ally;
(function (Ally) {
    class MaintenanceEntry {
        getTitle() {
            if (this.project)
                return this.project.title;
            else
                return this.todo.description;
        }
        getTypeName() {
            if (this.project)
                return "Maintenance Record";
            else
                return "To-Do";
        }
        getAuthorName() {
            if (this.project)
                return this.project.creatorFullName;
            else
                return this.todo.addedByFullName;
        }
        getCreatedDate() {
            if (this.project)
                return this.project.createDateUtc;
            else
                return this.todo.addedDateUtc;
        }
    }
    Ally.MaintenanceEntry = MaintenanceEntry;
    /**
     * Provides methods to accessing maintenance information
     */
    class MaintenanceService {
        /**
         * The constructor for the class
         */
        constructor($http, $q, $cacheFactory) {
            this.$http = $http;
            this.$q = $q;
            this.$cacheFactory = $cacheFactory;
        }
        /**
        * Retrieve the maintenance projects from the server
        */
        loadProjects() {
            return this.$http.get("/api/Maintenance/Projects").then((response) => {
                return response.data;
            }, (response) => {
                return this.$q.reject(response.data);
            });
        }
    }
    Ally.MaintenanceService = MaintenanceService;
})(Ally || (Ally = {}));
angular.module("CondoAlly").service("maintenance", ["$http", "$q", "$cacheFactory", Ally.MaintenanceService]);

var Ally;
(function (Ally) {
    /**
     * The controller for the committee home page
     */
    class SendMessageController {
        /**
         * The constructor for the class
         */
        constructor($rootScope, fellowResidents, siteInfo) {
            this.$rootScope = $rootScope;
            this.fellowResidents = fellowResidents;
            this.siteInfo = siteInfo;
            this.shouldShowSendModal = false;
            this.shouldShowButtons = false;
            this.isSending = false;
            this.messageBody = "";
            this.messageSubject = "";
            this.sendResultIsError = false;
            this.isPremiumPlanActive = false;
            this.isSendingToSelf = false;
            this.shouldShowSendAsBoard = false;
            this.shouldSendAsBoard = false;
            this.messageSubject = `${siteInfo.userInfo.fullName} has sent you a message via your ${AppConfig.appName} site`;
        }
        /// Called on each controller after all the controllers on an element have been constructed
        $onInit() {
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            this.isSendingToSelf = this.recipientInfo.userId === this.siteInfo.userInfo.userId;
            const isRecipientWholeBoard = this.recipientInfo.userId === Ally.GroupMembersController.AllBoardUserId;
            this.shouldShowSendAsBoard = Ally.FellowResidentsService.isNonPropMgrBoardPosition(this.siteInfo.userInfo.boardPosition) && !isRecipientWholeBoard;
        }
        /// Display the send modal
        showSendModal() {
            this.shouldShowSendModal = true;
            this.sendResultMessage = "";
            this.shouldShowButtons = true;
            // Focus on the message box once displayed
            if (this.isPremiumPlanActive)
                setTimeout(() => document.getElementById("message-text-box").focus(), 100);
        }
        /// Hide the send modal
        hideModal() {
            this.shouldShowSendModal = false;
            this.messageBody = "";
        }
        /// Send the user's message
        sendMessage() {
            this.shouldShowButtons = false;
            this.isSending = true;
            this.sendResultMessage = "";
            this.fellowResidents.sendMessage(this.recipientInfo.userId, this.messageBody, this.messageSubject, this.shouldSendAsBoard).then((response) => {
                this.isSending = false;
                this.sendResultIsError = false;
                this.messageBody = "";
                this.sendResultMessage = "Message sent successfully!";
            }, (response) => {
                this.shouldShowButtons = true;
                this.isSending = false;
                this.sendResultIsError = true;
                this.sendResultMessage = "Failed to send: " + response.data.exceptionMessage;
            });
        }
        /// Occurs when the user clicks the checkbox to toggle if they're sending as the board
        onSendAsBoardChanged() {
            if (this.shouldSendAsBoard)
                this.messageSubject = `Your ${this.siteInfo.publicSiteInfo.fullName} board has sent you a message via your ${AppConfig.appName} site`;
            else
                this.messageSubject = `${this.siteInfo.userInfo.fullName} has sent you a message via your ${AppConfig.appName} site`;
        }
    }
    SendMessageController.$inject = ["$rootScope", "fellowResidents", "SiteInfo"];
    Ally.SendMessageController = SendMessageController;
})(Ally || (Ally = {}));
CA.angularApp.component("sendMessage", {
    bindings: {
        recipientInfo: "="
    },
    templateUrl: "/ngApp/services/send-message.html",
    controller: Ally.SendMessageController
});

// Allow enter key event
// From http://stackoverflow.com/questions/15417125/submit-form-on-pressing-enter-with-angularjs
angular.module("CondoAlly").directive("ngEnter", function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            const EnterKeyCode = 13;
            if (event.which === EnterKeyCode) {
                scope.$apply(function () {
                    scope.$eval(attrs.ngEnter, { '$event': event });
                });
                event.preventDefault();
            }
        });
    };
});
// Allow ctrl+enter key event
angular.module("CondoAlly").directive("ngCtrlEnter", function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            const EnterKeyCode = 13;
            if (event.which === EnterKeyCode && event.ctrlKey) {
                scope.$apply(function () {
                    scope.$eval(attrs.ngEnter, { '$event': event });
                });
                event.preventDefault();
            }
        });
    };
});
angular.module("CondoAlly").directive("ngEscape", function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            const EscapeKeyCode = 27;
            if (event.which === EscapeKeyCode) {
                scope.$apply(function () {
                    scope.$eval(attrs.ngEscape, { '$event': event });
                });
                event.preventDefault();
            }
        });
    };
});
angular.module("CondoAlly").directive("imageonload", function () {
    return {
        restrict: "A",
        link: function (scope, element, attrs) {
            element.bind("load", function (evt) {
                if (attrs.imageonload)
                    scope.$apply(attrs.imageonload);
            });
        }
    };
});
angular.module("CondoAlly").directive("imageonerror", function () {
    return {
        restrict: "A",
        link: function (scope, element, attrs) {
            element.bind("error", function (evt) {
                if (attrs.imageonerror)
                    scope.$apply(attrs.imageonerror);
            });
        }
    };
});
angular.module("CondoAlly").directive('onFileChange', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            element.bind("change", function (event) {
                scope.$apply(function () {
                    scope.$eval(attrs.onFileChange, { '$event': event });
                });
                event.preventDefault();
            });
        }
    };
});

// Allow conditional inline values
// From http://stackoverflow.com/questions/14164371/inline-conditionals-in-angular-js
CA.angularApp.filter('iif', function () {
    return function (input, trueValue, falseValue) {
        return input ? trueValue : falseValue;
    };
});
CA.angularApp.filter('tel', function () {
    return function (tel) {
        if (!tel) {
            return '';
        }
        var value = tel.toString().trim().replace(/^\+/, '');
        if (value.match(/[^0-9]/)) {
            return tel;
        }
        var country, city, number;
        switch (value.length) {
            case 7: // ####### -> ###-####
                country = 1;
                city = "";
                number = value;
                break;
            case 10: // +1PPP####### -> C (PPP) ###-####
                country = 1;
                city = value.slice(0, 3);
                number = value.slice(3);
                break;
            case 11: // +CPPP####### -> CCC (PP) ###-####
                country = value[0];
                city = value.slice(1, 4);
                number = value.slice(4);
                break;
            case 12: // +CCCPP####### -> CCC (PP) ###-####
                country = value.slice(0, 3);
                city = value.slice(3, 5);
                number = value.slice(5);
                break;
            default:
                city = "";
                return tel;
        }
        // Ignore USA
        if (country === 1)
            country = "";
        number = number.slice(0, 3) + '-' + number.slice(3);
        if (city.length > 0)
            city = "(" + city + ")";
        return (country + " " + city + " " + number).trim();
    };
});
CA.angularApp.filter("filesize", function () {
    return function (size) {
        if (isNaN(size))
            size = 0;
        if (size < 1024)
            return size + " bytes";
        size /= 1024;
        if (size < 1024)
            return size.toFixed(2) + " KB";
        size /= 1024;
        if (size < 1024)
            return size.toFixed(2) + " MB";
        size /= 1024;
        if (size < 1024)
            return size.toFixed(2) + " GB";
        size /= 1024;
        return size.toFixed(2) + " TB";
    };
});

var Ally;
(function (Ally) {
    /**
     * Represents a home owned or rented by a user
     */
    class UsersHome {
    }
    Ally.UsersHome = UsersHome;
    class PayPeriod {
    }
    Ally.PayPeriod = PayPeriod;
    /**
     * The logged-in user's info
     */
    class UserInfo {
    }
    Ally.UserInfo = UserInfo;
    /**
     * Information that is provided to anyone that visits the group's site, even if not logged-in
     */
    class PublicSiteInfo {
    }
    Ally.PublicSiteInfo = PublicSiteInfo;
    class RecentPayment {
    }
    Ally.RecentPayment = RecentPayment;
    /**
     * Represents the group descriptive information that can only be accessed by a member of the
     * group
     */
    class PrivateSiteInfo {
    }
    Ally.PrivateSiteInfo = PrivateSiteInfo;
    /**
     * Represents the descriptive information for a CHTN group (condo, HOA, townhome, neighborhood)
     */
    class ChtnPrivateSiteInfo extends PrivateSiteInfo {
    }
    Ally.ChtnPrivateSiteInfo = ChtnPrivateSiteInfo;
    /**
     * The current group's site information
     */
    class SiteInfoService {
        constructor() {
            this.publicSiteInfo = new PublicSiteInfo();
            this.privateSiteInfo = new ChtnPrivateSiteInfo();
            this.userInfo = new Ally.UserInfo();
            this.isLoggedIn = false;
        }
        // Retrieve the basic information for the current site
        refreshSiteInfo($rootScope, $http, $q) {
            this._rootScope = $rootScope;
            const deferred = $q.defer();
            $rootScope.isLoadingSite = true;
            if (HtmlUtil.getSubdomain() === "login") {
                $rootScope.isLoadingSite = false;
                this.handleSiteInfo(null, $rootScope);
                deferred.resolve();
                return deferred.promise;
            }
            const onSiteInfoReceived = (siteInfo) => {
                $rootScope.isLoadingSite = false;
                this.handleSiteInfo(siteInfo, $rootScope);
                deferred.resolve(siteInfo);
            };
            const onRequestFailed = () => {
                $rootScope.isLoadingSite = false;
                deferred.reject();
            };
            // Retrieve information for the current association
            //const GetInfoUri = "/api/GroupSite";
            const GetInfoUri = "https://0.webappapi.communityally.org/api/GroupSite";
            //const GetInfoUri = "https://0.webappapi.mycommunityally.org/api/GroupSite";
            $http.get(GetInfoUri).then((httpResponse) => {
                // If we received data but the user isn't logged-in
                if (httpResponse.data && !httpResponse.data.userInfo) {
                    // Check the cross-domain localStorage for an auth token
                    this.xdLocalStorage.getItem("allyApiAuthToken").then((response) => {
                        // If we received an auth token then retry accessing the group data
                        if (response && HtmlUtil.isValidString(response.value)) {
                            //console.log( "Received cross domain token:" + response.value );
                            this.setAuthToken(response.value);
                            $http.get(GetInfoUri).then((httpResponse) => {
                                onSiteInfoReceived(httpResponse.data);
                            }, onRequestFailed);
                        }
                        // Otherwise just handle what we received
                        else
                            onSiteInfoReceived(httpResponse.data);
                    }, () => {
                        // We failed to get a cross domain token so continue on with what we received
                        onSiteInfoReceived(httpResponse.data);
                    });
                }
                else
                    onSiteInfoReceived(httpResponse.data);
            }, onRequestFailed);
            return deferred.promise;
        }
        ;
        // Returns if a page is for a neutral (public, no login required) page
        testIfIsNeutralPage(locationHash) {
            // We only care about Angular paths
            const HashPrefix = "#!/";
            if (!HtmlUtil.startsWith(locationHash, HashPrefix))
                return false;
            // Remove that prefix and add a slash as that's what the menu item stores
            locationHash = "/" + locationHash.substring(HashPrefix.length);
            const menuItem = _.find(AppConfig.menu, (menuItem) => menuItem.path === locationHash);
            return typeof (menuItem) === "object";
        }
        ;
        // Log-in and application start both retrieve information about the current association's site.
        // This function should be used to properly populate the scope with the information.
        handleSiteInfo(siteInfo, $rootScope) {
            const subdomain = HtmlUtil.getSubdomain(window.location.host);
            if (!this.authToken && $rootScope.authToken)
                this.setAuthToken($rootScope.authToken);
            // If we're at an unknown subdomain
            if (siteInfo === null || siteInfo === "null" || siteInfo === "") {
                // Allow the user to log-in with no subdomain, create a temp site info object
                const isNeutralSubdomain = subdomain === null || subdomain === "www" || subdomain === "login";
                const isNeutralPage = this.testIfIsNeutralPage(window.location.hash);
                if (isNeutralSubdomain && isNeutralPage) {
                    // Create a default object used to populate a site
                    siteInfo = {};
                    siteInfo.publicSiteInfo =
                        {
                            bgImagePath: "",
                            fullName: AppConfig.appName,
                            //siteLogo: "<span style='font-size: 22pt; color: #FFF;'>Welcome to <a style='color:#a3e0ff; text-decoration: underline;' href='https://" + AppConfig.baseTld + "'>" + AppConfig.appName + "</a></span>"
                            siteLogo: "<span style='font-size: 22pt; color: #FFF;'>Welcome to " + AppConfig.appName + "</span>",
                            baseApiUrl: "https://0.webappapi.communityally.org/api/"
                        };
                }
                // Otherwise we are at an unknown, non-neutral subdomain so get back to safety!
                else {
                    // Go to generic login                
                    GlobalRedirect("https://login." + AppConfig.baseTld + "/#!/Login");
                    return;
                }
            }
            // Store the site info to the root scope for access by the app module
            $rootScope.publicSiteInfo = siteInfo.publicSiteInfo;
            this.publicSiteInfo = siteInfo.publicSiteInfo;
            $rootScope.populatePublicPageMenu();
            // Handle private (logged-in only) info
            let privateSiteInfo = siteInfo.privateSiteInfo;
            if (!privateSiteInfo)
                privateSiteInfo = {};
            this.privateSiteInfo = privateSiteInfo;
            // Store the Google lat/lon object to make life easier later
            if (this.privateSiteInfo.gpsPosition && typeof (google) !== "undefined")
                this.privateSiteInfo.googleGpsPosition = new google.maps.LatLng(this.privateSiteInfo.gpsPosition.lat, this.privateSiteInfo.gpsPosition.lon);
            // Set the site title
            document.title = this.publicSiteInfo.fullName;
            $rootScope.isPremiumPlanActive = this.privateSiteInfo.isPremiumPlanActive;
            $rootScope.isPremiumPlanTrial = moment().isBefore(moment(this.privateSiteInfo.creationDate).add(3, "months"));
            this.userInfo = siteInfo.userInfo;
            $rootScope.userInfo = siteInfo.userInfo;
            if (HtmlUtil.isLocalStorageAllowed())
                window.localStorage.setItem("siteInfo", angular.toJson(this.publicSiteInfo));
            // If the user is logged-in
            this.isLoggedIn = $rootScope.userInfo !== null && $rootScope.userInfo !== undefined;
            $rootScope.isLoggedIn = this.isLoggedIn;
            // Update the background
            if (!HtmlUtil.isNullOrWhitespace(this.publicSiteInfo.bgImagePath))
                $(document.documentElement).css("background-image", "url(" + $rootScope.bgImagePath + this.publicSiteInfo.bgImagePath + ")");
            if (this.isLoggedIn) {
                const prepopulateZopim = () => {
                    if (typeof ($zopim) !== "undefined") {
                        $zopim(() => {
                            if ($rootScope.userInfo) {
                                $zopim.livechat.setName($rootScope.userInfo.firstName + " " + $rootScope.userInfo.lastName);
                                if ($rootScope.userInfo.emailAddress && $rootScope.userInfo.emailAddress.indexOf("@") !== -1)
                                    $zopim.livechat.setEmail($rootScope.userInfo.emailAddress);
                            }
                        });
                    }
                };
                setTimeout(prepopulateZopim, 8000); // Zopim delays 5sec before setup so wait longer than than
                $rootScope.isAdmin = $rootScope.userInfo.isAdmin;
                $rootScope.isSiteManager = $rootScope.userInfo.isSiteManager;
                // Tell Segment we know who the user is
                if (typeof (analytics) !== "undefined") {
                    analytics.identify($rootScope.userInfo.emailAddress, {
                        name: $rootScope.userInfo.fullName
                    });
                }
            }
            // Otherwise the user is not logged-in
            else {
                $rootScope.userInfo = null;
                // If we're not at the log-in page, the get us there
                const LoginPath = "#!/Login";
                if (window.location.hash != LoginPath && !AppConfig.isPublicRoute(window.location.hash)) {
                    // If we're at a valid subdomain
                    if (this.publicSiteInfo && this.publicSiteInfo.baseUrl) {
                        if (window.location.hash && window.location.hash !== "#!/Home") {
                            // An ugly sidestep becuase AppCacheService isn't ready when this code is
                            // called
                            window.sessionStorage[AppCacheService.KeyPrefix + AppCacheService.Key_AfterLoginRedirect] = window.location.hash.substr(2); // Remove the leading #!
                            window.sessionStorage[AppCacheService.KeyPrefix + AppCacheService.Key_WasLoggedIn401] = "true";
                        }
                        // Need to set the hash "manually" as $location is not available in the config
                        // block and GlobalRedirect will go to the wrong TLD when working locally
                        if (this.publicSiteInfo.customLandingPagePath)
                            window.location.hash = this.publicSiteInfo.customLandingPagePath;
                        else
                            window.location.hash = LoginPath;
                        //$location.path( "/Login" );
                        //GlobalRedirect( this.publicSiteInfo.baseUrl + loginPath );
                        return;
                    }
                    else
                        GlobalRedirect("https://login." + AppConfig.baseTld + LoginPath);
                }
            }
            // If we need to redirect from the login subdomain
            if (this.publicSiteInfo.baseUrl && subdomain === "login") {
                if ((subdomain === null || subdomain !== this.publicSiteInfo.shortName)
                    && HtmlUtil.isNullOrWhitespace(OverrideBaseApiPath)) {
                    GlobalRedirect(this.publicSiteInfo.baseUrl + "/#!/Home");
                }
            }
        }
        setAuthToken(authToken) {
            if (window.localStorage)
                window.localStorage.setItem("ApiAuthToken", authToken);
            this._rootScope.authToken = authToken;
            this.xdLocalStorage.setItem("allyApiAuthToken", authToken).then((response) => {
                //console.log( "Set cross domain auth token" );
            });
            this.authToken = authToken;
            //appCacheService.clear( appCacheService.Key_AfterLoginRedirect );
        }
    }
    SiteInfoService.AlwaysDiscussDate = new Date(2018, 7, 1); // Groups created after August 1, 2018 always have discussion enabled
    Ally.SiteInfoService = SiteInfoService;
    class SiteInfoHelper {
        static loginInit($q, $http, $rootScope, $sce, xdLocalStorage) {
            const deferred = $q.defer();
            SiteInfoProvider.siteInfo.xdLocalStorage = xdLocalStorage;
            if (SiteInfoProvider.isSiteInfoLoaded) {
                deferred.resolve(SiteInfoProvider.siteInfo);
            }
            else {
                SiteInfoProvider.siteInfo.refreshSiteInfo($rootScope, $http, $q).then(() => {
                    SiteInfoProvider.isSiteInfoLoaded = true;
                    // Used to control the loading indicator on the site
                    $rootScope.isSiteInfoLoaded = true;
                    $rootScope.siteTitle = {
                        text: $rootScope.publicSiteInfo.siteTitleText
                    };
                    // The logo contains markup so use sce to display HTML content
                    if ($rootScope.publicSiteInfo.siteLogo)
                        $rootScope.siteTitle.logoHtml = $sce.trustAsHtml($rootScope.publicSiteInfo.siteLogo);
                    //$rootScope.siteTitleText = $rootScope.publicSiteInfo.siteTitleText;
                    // Occurs when the user saves changes to the site title
                    $rootScope.onUpdateSiteTitleText = () => {
                        analytics.track("updateSiteTitle");
                        $http.put("/api/Settings", { siteTitle: $rootScope.siteTitle.text });
                    };
                    deferred.resolve(SiteInfoProvider.siteInfo);
                });
            }
            return deferred.promise;
        }
        ;
    }
    Ally.SiteInfoHelper = SiteInfoHelper;
    class SiteInfoProvider {
        $get() {
            if (!SiteInfoProvider.isSiteInfoLoaded)
                console.log("Not yet loaded!");
            return SiteInfoProvider.siteInfo;
        }
    }
    SiteInfoProvider.isSiteInfoLoaded = false;
    // Use statics because this class is used to resolve the route before the Angular app is
    // allowed to run
    SiteInfoProvider.siteInfo = new Ally.SiteInfoService();
    Ally.SiteInfoProvider = SiteInfoProvider;
})(Ally || (Ally = {}));
angular.module('CondoAlly').provider("SiteInfo", Ally.SiteInfoProvider);

var Ally;
(function (Ally) {
    class TodoItem {
    }
    Ally.TodoItem = TodoItem;
    class TodoList {
    }
    Ally.TodoList = TodoList;
    class TodoListCtrl {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, fellowResidents) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.fellowResidents = fellowResidents;
            this.todoLists = [];
            this.isLoading = false;
            this.newListName = "";
            this.isFixedList = false;
            this.shouldExpandTodoItemModal = false;
            this.canManage = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isFixedList = !!this.fixedTodoListId;
            if (this.isFixedList)
                this.loadFixedTodoList();
            else
                this.loadAllTodoLists();
            this.canManage = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager;
            // Make sure committee members can manage their data
            if (this.committee && !this.canManage)
                this.fellowResidents.isCommitteeMember(this.committee.committeeId).then(isCommitteeMember => this.canManage = isCommitteeMember);
        }
        /**
         * Retrieve a todo list by ID
         */
        loadFixedTodoList() {
            this.isLoading = true;
            this.$http.get("/api/Todo/List/" + this.fixedTodoListId).then((httpResponse) => {
                this.isLoading = false;
                this.todoLists = [httpResponse.data];
            });
        }
        /**
         * Retrieve all available todo lists
         */
        loadAllTodoLists() {
            this.isLoading = true;
            let getUri = "/api/Todo";
            if (this.committee)
                getUri = "/api/Todo/ListsForCommittee/" + this.committee.committeeId;
            this.$http.get(getUri).then((httpResponse) => {
                this.isLoading = false;
                this.todoLists = httpResponse.data;
            });
        }
        /**
         * Create a new to-do list
         */
        onAddList() {
            this.isLoading = true;
            let postUri = "/api/Todo/newList?listName=" + encodeURIComponent(this.newListName);
            if (this.committee)
                postUri += "&committeeId=" + this.committee.committeeId;
            this.$http.post(postUri, null).then(() => {
                this.isLoading = false;
                this.newListName = "";
                this.loadAllTodoLists();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to create: " + response.data.exceptionMessage);
            });
        }
        /**
         * Create a new to-do item
         */
        onAddItem(todoListId) {
            this.isLoading = true;
            const postUri = "/api/Todo/newItem/" + todoListId + "?description=" + encodeURIComponent(this.newItemDescription);
            this.$http.post(postUri, null).then(() => {
                this.isLoading = false;
                this.newItemDescription = "";
                this.loadAllTodoLists();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to create: " + response.data.exceptionMessage);
            });
        }
        /**
         * Create a new to-do
         */
        addNewItem(todoListId) {
            this.editTodoItem = new TodoItem();
            this.editTodoItem.owningTodoListId = todoListId;
            if (this.committee)
                this.editTodoItem.owningTodoListId = todoListId;
            this.shouldExpandTodoItemModal = false;
            window.setTimeout(() => $("#edit-todo-name-text-box").focus(), 100);
        }
        /**
         * Save changes to a to-do item
         */
        saveTodoItem() {
            this.isLoading = true;
            const postUri = "/api/Todo/Item";
            this.$http.post(postUri, this.editTodoItem).then(() => {
                this.isLoading = false;
                this.newItemDescription = "";
                this.editTodoItem = null;
                this.loadAllTodoLists();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to create: " + response.data.exceptionMessage);
            });
        }
        /**
         * Toggle an item's completed state
         */
        onToggleComplete(todoListId, todoItemId) {
            this.isLoading = true;
            this.$http.put("/api/Todo/toggleComplete/" + todoListId + "/" + todoItemId, null).then(() => {
                this.isLoading = false;
                this.loadAllTodoLists();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to toggle: " + response.data.exceptionMessage);
            });
        }
        /**
         * Delete a to-do item
         */
        deleteTodoItem(curItem) {
            this.isLoading = true;
            this.$http.delete("/api/Todo/Item/" + curItem.todoItemId).then(() => {
                this.isLoading = false;
                this.loadAllTodoLists();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to delete: " + response.data.exceptionMessage);
            });
        }
        /**
         * Delete a to-do list
         */
        deleteTodoList(curList) {
            if (curList.todoItems.length > 0) {
                if (!confirm("Are you sure you want to delete this list with active to-dos?"))
                    return;
            }
            this.isLoading = true;
            this.$http.delete("/api/Todo/List/" + curList.todoListId).then(() => {
                this.isLoading = false;
                this.loadAllTodoLists();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to delete: " + response.data.exceptionMessage);
            });
        }
        /**
         * Export the lists to CSV
         */
        exportAllToCsv() {
            if (typeof (analytics) !== "undefined")
                analytics.track('exportTodoListCsv');
            const a = this.todoLists[0].todoItems;
            a[0].completedByFullName;
            const csvColumns = [
                {
                    headerText: "List",
                    fieldName: "owningTodoListName"
                },
                {
                    headerText: "Description",
                    fieldName: "description"
                },
                {
                    headerText: "Due Date",
                    fieldName: "dueDate",
                    dataMapper: function (value) {
                        if (!value)
                            return "";
                        return moment(value).format("YYYY-MM-DD");
                    }
                },
                {
                    headerText: "Added On",
                    fieldName: "addedDateUtc"
                },
                {
                    headerText: "Added By",
                    fieldName: "addedByFullName"
                },
                {
                    headerText: "Completed On",
                    fieldName: "completedDateUtc"
                },
                {
                    headerText: "Completed By",
                    fieldName: "completedByFullName"
                }
            ];
            let csvDataString = "";
            for (let listIndex = 0; listIndex < this.todoLists.length; ++listIndex) {
                const curList = this.todoLists[listIndex];
                for (let i = 0; i < curList.todoItems.length; ++i)
                    curList.todoItems[i].owningTodoListName = curList.name;
                csvDataString += Ally.createCsvString(curList.todoItems, csvColumns, listIndex === 0);
            }
            let filename = "ToDos.csv";
            if (this.committee)
                filename = this.committee.name.replace(/\W/g, '') + "_" + filename;
            Ally.HtmlUtil2.downloadCsv(csvDataString, filename);
        }
    }
    TodoListCtrl.$inject = ["$http", "SiteInfo", "fellowResidents"];
    Ally.TodoListCtrl = TodoListCtrl;
})(Ally || (Ally = {}));
CA.angularApp.component("todoList", {
    bindings: {
        fixedTodoListId: "<?",
        committee: "<?"
    },
    templateUrl: "/ngApp/services/todo-list.html",
    controller: Ally.TodoListCtrl
});

/// <reference path="../../Scripts/typings/googlemaps/google.maps.d.ts" />
var Ally;
(function (Ally) {
    /**
     * Represents an exception returned from an API endpoint
     */
    var ExceptionResult = /** @class */ (function () {
        function ExceptionResult() {
        }
        return ExceptionResult;
    }());
    Ally.ExceptionResult = ExceptionResult;
})(Ally || (Ally = {}));

function ManageMembersCtrl( $scope, $http, $rootScope, $interval, $http )
{

    var vm = this;

    // Test data
    $scope.members = [];


    $scope.newMember = {
        boardPosition: 0,
        isRenter: false
    };

    $scope.editUser = null;


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Select a member and open a modal to edit their information
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.setEdit = function( member )
    {
        $scope.sentWelcomeEmail = false;

        if( member === null )
        {
            $scope.editUser = null;
            return;
        }

        $scope.editUserForm.$setPristine();

        var copiedMember = jQuery.extend( {}, member );
        $scope.editUser = copiedMember;

        $scope.memberGridOptions.selectAll( false );

        setTimeout( "$( '#edit-user-first-text-box' ).focus();", 100 );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Send a member the welcome e-mail
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.onSendWelcome = function()
    {
        $scope.isSavingUser = true;

        $http.put( "/api/Member/" + $scope.editUser.userId + "/SendWelcome" ).then( function()
        {
            $scope.isSavingUser = false;
            $scope.sentWelcomeEmail = true;
        }, function()
        {
            alert( "Failed to send the welcome e-mail, please contact support if this problem persists." )
            $scope.isSavingUser = false;
        } );
    };


    //$scope.memberGridOptions = {
    //    data: 'members'
    //};

    var MembersResource = $resource( '/api/Member', null,
        {
            'update': { method: 'PUT' }
        } );

    var defaultSort = { fields: ['lastName'], directions: ['asc'] };
    var memberSortInfo = defaultSort;
    if( window.localStorage )
    {
        var sortOptions = window.localStorage.getItem( "memberSort" );
        if( sortOptions )
            memberSortInfo = JSON.parse( sortOptions );

        if( memberSortInfo.fields.length === 0 )
            memberSortInfo = defaultSort;

        // Store the grid's sort state every 2 seconds to maintain whatever was last selected.
        // Why not just when the sort changes?
        $interval( function()
        {
            var simpleSortInfo = { fields: $scope.memberGridOptions.sortInfo.fields, directions: $scope.memberGridOptions.sortInfo.directions };
            window.localStorage.setItem( "memberSort", JSON.stringify( simpleSortInfo ) );
        }, 2000 );
    }

    $scope.memberGridOptions =
    {
        data: "members",
        plugins: [new ngGridFlexibleHeightPlugin()],
        columnDefs:
        [
            { field: 'firstName', displayName: 'First Name', cellClass: "resident-cell-first" },
            { field: 'lastName', displayName: 'Last Name', cellClass: "resident-cell-last" },
            { field: 'email', displayName: 'E-mail', cellClass: "resident-cell-email" },
            { field: 'isSiteManager', displayName: 'Admin', width: 60, cellClass: "resident-cell-site-manager", cellTemplate: '<div style="text-align:center; padding-top: 8px;"><input type="checkbox" disabled="disabled" ng-checked="row.getProperty(col.field)"></div>' },
            { field: 'phoneNumber', displayName: 'Phone Number', width: 150, cellClass: "resident-cell-phone", cellTemplate: '<div class="ngCellText" ng-class="col.colIndex()"><span ng-cell-text>{{ row.getProperty(col.field) | tel }}</span></div>' },
        ],
        afterSelectionChange: function( rowItem )
        {
            if( rowItem.selected )
                $scope.setEdit( rowItem.entity );
        },
        sortInfo: memberSortInfo,
        multiSelect: false
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Populate the members
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.refresh = function()
    {
        $scope.isLoading = true;

        $http.get( "/api/Member/Watch" ).then( function( httpResponse )
        {
            $scope.members = httpResponse.data;

            // Hide e-mail address that are @condoally.com that indicates no e-mail address is
            // set
            _.forEach( $scope.members, function( res )
            {
                res.fullName = res.firstName + " " + res.lastName;
                if( typeof ( res.email ) === "string" && res.email.indexOf( "@condoally.com" ) !== -1 )
                    res.email = "";
            } );

            $scope.isLoading = false;
        } );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user presses the button to update a member's information or create a new
    // member
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.onSaveMember = function()
    {
        if( $scope.editUser == null )
            return;

        $( "#editUserForm" ).validate();
        if( !$( "#editUserForm" ).valid() )
            return;

        $scope.isSavingUser = true;

        var onSave = function()
        {
            $scope.editUser = null;
            $scope.isSavingUser = false;
            $scope.refresh();
        };

        var onError = onSave;

        if( !$scope.editUser.userId )
            $http.post( "/api/Member", $scope.editUser ).then( onSave, onError );
        else
            $http.put( "/api/Member", $scope.editUser ).then( onSave, onError );

        // TODO Update the fellow residents page next time we're there
        // $cacheFactory.get('$http').remove("/api/BuildingResidents");
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user presses the button to set a user's password
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.OnAdminSetPassword = function()
    {
        var setPass =
            {
                userName: $scope.adminSetPass_Username,
                password: $scope.adminSetPass_Password
            };

        $http.post( "/api/AdminHelper/SetPassword", setPass ).then( function( httpResponse )
        {
            $scope.adminSetPass_ResultMessage = httpResponse.data;
        }, function()
        {
        } );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user presses the button to delete a resident
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.onDeleteMember = function()
    {
        if( !confirm( "Are you sure you want to remove this person from your neighborhood watch group?" ) )
            return;

        $http.delete( "/api/Member", { userId: $scope.editUser.userId, unitId: $scope.editUser.unitId } ).then( function()
        {
            $scope.editUser = null;
            $scope.refresh();
        } );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user presses the button to reset everyone's password
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.onSendAllWelcome = function()
    {
        $scope.isLoading = true;

        $http.put( "/api/Member?userId&action=launchsite" ).then( function()
        {
            $scope.isLoading = false;
            $scope.sentWelcomeEmail = true;
            $scope.allEmailsSent = true;
        }, function()
        {
            alert( "Failed to send welcome e-mail, please contact support if this problem persists." )
            $scope.isLoading = false;
        } );
    };

    $scope.refresh();
}
ManageMembersCtrl.$inject = ['$scope', '$http', '$rootScope', '$interval', '$http'];
function WatchSettingsCtrl($http, $rootScope, $resource, SiteInfo)
{
    var vm = this;

    // Test data
    vm.settings = {};

    vm.defaultBGImage = $( document.documentElement ).css( "background-image" );

    vm.showQaButton = $rootScope.userInfo.emailAddress === "president@mycondoally.com";
    

    var SettingsResource = $resource( '/api/Settings', null,
        {
            'update': { method: 'PUT' }
        } );


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Populate the page from the server
    ///////////////////////////////////////////////////////////////////////////////////////////////
    vm.refreshData = function()
    {
        vm.isLoading = true;

        vm.settings = SettingsResource.get( function()
        {
            vm.isLoading = false;
        } );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user wants to save a new site title
    ///////////////////////////////////////////////////////////////////////////////////////////////
    vm.onSiteTitleChange = function()
    {
        vm.isLoading = true;

        SettingsResource.update( { siteTitle: vm.settings.siteTitle }, function()
        {
            location.reload();
            vm.isLoading = false;
        } );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user wants to save a new welcome message
    ///////////////////////////////////////////////////////////////////////////////////////////////
    vm.onWelcomeMessageUpdate = function()
    {
        vm.isLoading = true;

        SettingsResource.update( { welcomeMessage: vm.settings.welcomeMessage }, function()
        {
            SiteInfo.privateSiteInfo.welcomeMessage = vm.settings.welcomeMessage;
            vm.isLoading = false;
        } );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user clicks a new background image
    ///////////////////////////////////////////////////////////////////////////////////////////////
    vm.onImageClick = function( bgImage )
    {
        vm.settings.bgImageFileName = bgImage;
        SettingsJS._defaultBG = bgImage;

        SettingsResource.update( { BGImageFileName: vm.settings.bgImageFileName }, function()
        {
            $( ".test-bg-image" ).removeClass( "test-bg-image-selected" );

            $( "img[src='" + $rootScope.bgImagePath + bgImage + "']" ).addClass( "test-bg-image-selected" );

            vm.isLoading = false;
        } );
    };


    vm.onImageHoverOver = function( bgImage )
    {
        $( document.documentElement ).css( "background-image", "url(" + $rootScope.bgImagePath + bgImage + ")" );
    };


    vm.onImageHoverOut = function()
    {
        if( typeof ( vm.settings.bgImageFileName ) === "string" && vm.settings.bgImageFileName.length > 0 )
            $( document.documentElement ).css( "background-image", "url(" + $rootScope.bgImagePath + vm.settings.bgImageFileName + ")" );
        else
            $( document.documentElement ).css( "background-image", vm.defaultBGImage );
    };


    vm.onQaDeleteSite = function()
    {
        $http.get( "/api/QA/DeleteThisAssociation" ).then( function()
        {
            location.reload();
        }, function( httpResponse )
        {
            alert( "Failed to delete site: " + httpResponse.data.message );
        } );
    };

    vm.mapInstance = new google.maps.Map( document.getElementById( 'map-canvas' ), vm.mapInfo );


    vm.refreshData();
}

WatchSettingsCtrl.$inject = ["$http", "$rootScope", "$resource", "SiteInfo"];

function WatchCalendarCtrl( $scope, $timeout, $http, $rootScope, $q ) {

    var vm = this;

    var calendarEvents = [];

    var DateFormat = "YYYY-MM-DD";
    var TimeFormat = "h:mma";

    var NoTime = "12:37am";

    $scope.today = new Date();

    var getCalendarEvents = function ( start, end, timezone, callback ) {
        $scope.isLoadingCalendarEvents = true;

        var firstDay = start.format( DateFormat );
        var lastDay = end.format( DateFormat );

        $http.get( "/api/CalendarEvent?startDate=" + firstDay + "&endDate=" + lastDay ).then( function ( httpResponse ) {
            var associationEvents = [];

            var data = httpResponse.data;

            $scope.isLoadingCalendarEvents = false;

            _.each( data, function ( entry ) {
                entry.timeOnly = moment.utc( entry.date ).format( TimeFormat );
                entry.dateOnly = entry.date;

                if ( entry.timeOnly == NoTime )
                    entry.timeOnly = "";

                var shortText = entry.title;
                if ( shortText.length > 17 )
                    shortText = shortText.substring( 0, 17 ) + "...";

                var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.title + "</p>";

                associationEvents.push( {
                    title: shortText,
                    start: entry.date.substring( 0, 10 ), // 10 = length of YYYY-MM-DD
                    toolTipTitle: "Event",
                    fullDescription: fullDescription,
                    calendarEventObject: entry
                } );
            } );

            callback( associationEvents );

        }, function () {
            $scope.isLoadingCalendarEvents = false;
        } );
    };

    /* config object */
    var uiConfig = {
        height: 600,
        editable: false,
        header: {
            left: 'month agendaWeek',
            center: 'title',
            right: 'today prev,next'
        },
        viewRender: function ( view, element ) {
            if ( $rootScope.isSiteManager )
                $( element ).css( "cursor", "pointer" );
        },
        dayClick: function ( date ) {
            if ( !$rootScope.isSiteManager )
                return;

            // The date is wrong if time zone is considered
            var clickedDate = moment( moment.utc( date ).format( DateFormat ) ).toDate();

            $scope.$apply( function () {
                $scope.setEditEvent( { date: clickedDate, dateOnly: clickedDate, associatedUserIds: [] } );
            } );
        },
        eventClick: function ( event ) {
            $scope.$apply( function () {
                if ( event.calendarEventObject ) {
                    $scope.setEditEvent( event.calendarEventObject, true );
                }
            } );
        },
        eventRender: function ( event, element ) {
            $( element ).css( "cursor", "default" );

            $( element ).qtip( {
                style: {
                    classes: 'qtip-light qtip-shadow'
                },
                content: {
                    text: event.fullDescription,
                    title: event.toolTipTitle
                }
            } );
        },
        eventSources: [{
            events: getCalendarEvents
        }]
    };


    $( document ).ready( function () {
        $( '.EditableEntry' ).editable( '<%= Request.Url %>',
        {
            id: 'EditEntryId',
            type: 'textarea',
            cancel: 'Cancel',
            submit: 'Ok'
        } );

        //$( ".collapsibleContainer" ).collapsiblePanel();

        $( '#log-calendar' ).fullCalendar( uiConfig );
    } );


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user clicks a user in the calendar event modal
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.onResidentClicked = function ( userId ) {
        var alreadyExists = _.contains( $scope.editEvent.associatedUserIds, userId );

        if ( alreadyExists )
            $scope.editEvent.associatedUserIds = _.without( $scope.editEvent.associatedUserIds, userId );
        else
            $scope.editEvent.associatedUserIds.push( userId );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Returns if a specific user's ID is associated with the currently selected event
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.isUserAssociated = function ( userId )
    {
        if ( $scope.editEvent && $scope.editEvent.associatedUserIds )
            return _.contains( $scope.editEvent.associatedUserIds, userId );

        return false;
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Show the full calendar event edit modal
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.expandCalendarEventModel = function () {
        $scope.showExpandedCalendarEventModel = true;

        //TODO Animate this?
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Set the calendar event for us to edit
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.setEditEvent = function ( eventObject, showDetails ) {
        $scope.showExpandedCalendarEventModel = showDetails || false;
        $scope.editEvent = eventObject;

        // Set focus on the title so it's user friendly and ng-escape needs an input focused to
        // work
        if ( eventObject )
            setTimeout( function () { $( "#calendar-event-title" ).focus(); }, 10 );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Delete the calendar event that's being viewed
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.deleteCalendarEvent = function ( eventId ) {
        if ( !confirm( "Are you sure you want to remove this calendar event?" ) )
            return;

        $scope.isLoadingCalendarEvents = true;

        $http.delete( "/api/CalendarEvent?eventId=" + eventId ).then( function () {
            $scope.isLoadingCalendarEvents = false;

            $scope.editEvent = null;

            $scope.onlyRefreshCalendarEvents = true;
            $( '#log-calendar' ).fullCalendar( 'refetchEvents' );
        }, function () {
            $scope.isLoadingCalendarEvents = false;
            alert( "Failed to delete the calendar event." );
        } );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Save the calendar event that's being viewed
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.saveCalendarEvent = function () {
        var dateTimeString = "";
        if ( typeof ( $scope.editEvent.timeOnly ) === "string" && $scope.editEvent.timeOnly.length > 1 )
            dateTimeString = moment.utc( $scope.editEvent.date ).format( DateFormat ) + " " + $scope.editEvent.timeOnly;
        else
            dateTimeString = moment.utc( $scope.editEvent.date ).format( DateFormat ) + " " + NoTime;

        $scope.editEvent.date = moment.utc( dateTimeString, DateFormat + " " + TimeFormat ).toDate();

        var httpFunc;
        if ( $scope.editEvent.eventId )
            httpFunc = $http.put;
        else
            httpFunc = $http.post;

        $scope.isLoadingCalendarEvents = true;

        httpFunc( "/api/CalendarEvent", $scope.editEvent ).then( function () {
            $scope.isLoadingCalendarEvents = false;
            $scope.editEvent = null;

            $scope.onlyRefreshCalendarEvents = true;
            $( '#log-calendar' ).fullCalendar( 'refetchEvents' );
        }, function () {
            $scope.isLoadingCalendarEvents = false;
        } );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user wants to delete a news item
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.onDeleteItem = function ( item ) {
        if ( !confirm( 'Are you sure you want to delete this information?' ) )
            return;

        $scope.isLoading = true;

        LogEntryResource.delete( { logEntryId: item.logEntryId }, function () {
            $scope.RetrieveItems();
        } );
    };
    
    $( '#calendar-event-time' ).timepicker( { 'scrollDefault': '10:00am' } );
}
WatchCalendarCtrl.$inject = ['$scope', '$timeout', '$http', '$rootScope', "$q"];
function WatchHomeCtrl($rootScope, $resource, SiteInfo)
{
    var vm = this;

    var WatchMembersResource = $resource( '/api/Watch/Home' );
    var LocalNewsResource = $resource( 'https://localnewsally.azurewebsites.net/api/LocalNews', null, { cache: true } );


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Populate the page from the server
    ///////////////////////////////////////////////////////////////////////////////////////////////
    vm.refreshData = function()
    {
        vm.isLoading = true;

        vm.watchMembers = WatchMembersResource.get( function()
        {            
            vm.isLoading = false;
        } );
    };

    LocalNewsResource.query( {
        clientId: "1001A194-B686-4C45-80BC-ECC0BB4916B4",
        chicagoWard: SiteInfo.publicSiteInfo.chicagoWard,
        zipCode: SiteInfo.privateSiteInfo.zipCode,
        cityNeighborhood: SiteInfo.publicSiteInfo.localNewsNeighborhoodQuery
    }, function ( localNews )
    {
        vm.localNews = localNews;
        //console.log(localNews);
        vm.isLoading_LocalNews = false;
    } );
}

WatchHomeCtrl.$inject = ["$rootScope", "$resource", "SiteInfo"];
function WatchMembersCtrl( $rootScope, $resource, SiteInfo )
{
    var vm = this;

    var WatchMembersResource = $resource( '/api/Watch/MemberList' );
    
    
    var getHousePolys = function ( memberList )
    {
        var usedAddressIds = [];
        var housePolys = [];

        _.each( memberList, function ( m )
        {
            if ( !m.houseGpsBounds )
                return;

            var addressHasAlreadyBeenAdded = _.some( usedAddressIds, function ( id ) { return id == m.addressId; } );
            if ( addressHasAlreadyBeenAdded )
                return;

            usedAddressIds.push( m.addressId );
            housePolys.push( m.houseGpsBounds );
        } );

        return housePolys;
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Populate the page from the server
    ///////////////////////////////////////////////////////////////////////////////////////////////
    vm.refreshData = function () {
        vm.isLoading = true;

        vm.memberList = WatchMembersResource.query( function () {
            vm.isLoading = false;
            
            vm.housePolys = getHousePolys( vm.memberList );
        } );
    };

    vm.mapCenter = SiteInfo.privateSiteInfo.gpsPosition;
    vm.groupBounds = SiteInfo.publicSiteInfo.gpsBounds;

    vm.refreshData();
}

WatchMembersCtrl.$inject = [ "$rootScope", "$resource", "SiteInfo" ];