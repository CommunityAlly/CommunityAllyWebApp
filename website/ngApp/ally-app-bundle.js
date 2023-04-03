var Ally;
(function (Ally) {
    /**
     * The controller for the admin-only page to edit group boundary polygons
     */
    var ManageAddressPolysController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function ManageAddressPolysController($http, $q) {
            this.$http = $http;
            this.$q = $q;
            this.isLoading = false;
            this.includeAddresses = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ManageAddressPolysController.prototype.$onInit = function () {
            // Initialize the UI
            this.refreshAddresses();
        };
        ManageAddressPolysController.prototype.getPolyInfo = function (url, polyType) {
            var _this = this;
            var deferred = this.$q.defer();
            this.isLoading = true;
            this.$http.get(url).then(function (httpResponse) {
                _this.isLoading = false;
                var addresses = httpResponse.data;
                // Mark address as opposed to group bounds
                _.each(addresses, function (a) {
                    a.polyType = polyType;
                    if (polyType == "Group")
                        a.oneLiner = a.shortName + ", " + a.appName;
                });
                $.merge(_this.addresses, addresses);
                deferred.resolve(_this.addresses);
            }, function (httpResponse) {
                _this.isLoading = false;
                var errorMessage = httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to retrieve addresses: " + errorMessage);
                deferred.reject();
            });
            return deferred.promise;
        };
        ManageAddressPolysController.prototype.getGroupBoundPolys = function () {
            return this.getPolyInfo("/api/AdminMap/GetGroupBounds?filter=" + this.filterAddresses, "Group");
        };
        ManageAddressPolysController.prototype.getAddressPolys = function () {
            return this.getPolyInfo("/api/AdminMap/GetAll?filter=" + this.filterAddresses, "Address");
        };
        // Get the addresses that are missing bounding polys
        ManageAddressPolysController.prototype.refreshAddresses = function () {
            var _this = this;
            this.isLoading = true;
            this.addresses = [];
            var handleAddrs = function (addresses) {
                _this.addressPoints = [];
                _.each(addresses, function (a) {
                    if (a.gpsPos) {
                        // The GoogleMapPoly directive uses the fullAddress for the marker tooltip
                        a.gpsPos.fullAddress = a.oneLiner;
                        _this.addressPoints.push(a.gpsPos);
                    }
                });
            };
            if (this.includeAddresses)
                this.getAddressPolys().then(function () { return _this.getGroupBoundPolys(); }).then(handleAddrs);
            else
                this.getGroupBoundPolys().then(handleAddrs);
        };
        ManageAddressPolysController.prototype.onSavePoly = function () {
            var _this = this;
            this.isLoading = true;
            var serverVerts = { vertices: this.selectedAddress.gpsBounds.vertices };
            var url = this.selectedAddress.polyType === "Address" ? ("/api/AdminMap/UpdateAddress/" + this.selectedAddress.addressId) : ("/api/AdminMap/UpdateGroup/" + this.selectedAddress.groupId);
            this.$http.put(url, serverVerts).then(function () {
                _this.isLoading = false;
            }, function () {
                _this.isLoading = false;
            });
        };
        // Occurs when the user clicks an address
        ManageAddressPolysController.prototype.onAddressSelected = function (address) {
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
        };
        ManageAddressPolysController.$inject = ["$http", "$q"];
        return ManageAddressPolysController;
    }());
    Ally.ManageAddressPolysController = ManageAddressPolysController;
})(Ally || (Ally = {}));
CA.angularApp.component("manageAddressPolys", {
    templateUrl: "/ngApp/admin/manage-address-polys.html",
    controller: Ally.ManageAddressPolysController
});

var Ally;
(function (Ally) {
    var GroupEntry = /** @class */ (function () {
        function GroupEntry() {
        }
        return GroupEntry;
    }());
    var FoundGroup = /** @class */ (function () {
        function FoundGroup() {
        }
        return FoundGroup;
    }());
    /**
     * The controller for the admin-only page to edit group boundary polygons
     */
    var ManageGroupsController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function ManageGroupsController($http, siteInfo) {
            this.$http = $http;
            this.siteInfo = siteInfo;
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
                var _this = this;
                this.isLoading = true;
                this.$http.get("/api/Association/AdminList").then(function (response) {
                    _this.isLoading = false;
                    _this.groups = response.data;
                    // Add the app type string
                    _.each(_this.groups, function (g) {
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
                }, function () {
                    _this.isLoading = false;
                    alert("Failed to retrieve groups");
                });
            };
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ManageGroupsController.prototype.$onInit = function () {
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
        };
        /**
         * Change a group's short name
         */
        ManageGroupsController.prototype.changeShortName = function () {
            var _this = this;
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
            this.$http.put("/api/AdminHelper/ChangeShortName?oldShortName=" + this.changeShortNameData.old + "&newShortName=" + this.changeShortNameData.newShortName + "&appName=" + this.changeShortNameData.appName, null).then(function (response) {
                _this.isLoading = false;
                _this.changeShortNameResult = "Successfully changed";
            }, function (response) {
                _this.isLoading = false;
                _this.changeShortNameResult = "Failed to change: " + response.data.exceptionMessage;
            });
        };
        /**
         * Find the groups to which a user, via email address, belongs
         */
        ManageGroupsController.prototype.findAssociationsForUser = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/AdminHelper/FindAssociationsForUser?email=" + this.findUserAssociationsEmail).then(function (response) {
                _this.isLoading = false;
                _this.foundUserAssociations = response.data;
                _.forEach(_this.foundUserAssociations, function (g) {
                    g.viewUrl = "https://" + g.shortName + ".condoally.com/";
                    if (g.appName === 3)
                        g.viewUrl = "https://" + g.shortName + ".hoaally.org/";
                });
            }, function () {
                _this.isLoading = false;
                alert("Failed to find associations for user");
            });
        };
        /**
         * Delete a CHTN group
         */
        ManageGroupsController.prototype.deleteAssociation = function (association) {
            var _this = this;
            if (!confirm("Are you sure you want to delete this association?"))
                return;
            this.isLoading = true;
            this.$http.delete("/api/Association/chtn/" + association.groupId).then(function () {
                _this.isLoading = false;
                _this.retrieveGroups();
            }, function (error) {
                _this.isLoading = false;
                console.log(error.data.exceptionMessage);
                alert("Failed to delete group: " + error.data.exceptionMessage);
            });
        };
        /**
         * Add an address to full address
         */
        ManageGroupsController.prototype.addAddress = function () {
            var _this = this;
            this.newAddressId = null;
            this.isLoading = true;
            this.$http.post("/api/AdminHelper/AddAddress?address=" + encodeURIComponent(this.newAddress), null).then(function (response) {
                _this.isLoading = false;
                _this.newAddressId = response.data.newAddressId;
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to add address: " + response.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user presses the button to create a new association
         */
        ManageGroupsController.prototype.onCreateAssociationClick = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.post("/api/Association", this.newAssociation).then(function () {
                _this.isLoading = false;
                _this.newAssociation = new GroupEntry();
                _this.retrieveGroups();
            });
        };
        ManageGroupsController.prototype.onSendTestEmail = function () {
            this.makeHelperRequest("/api/AdminHelper/SendTestEmail?testEmailRecipient=" + encodeURIComponent(this.testEmailRecipient) + "&sendFromInmail=" + (this.sendTestFromInmail ? 'true' : 'false'));
        };
        ManageGroupsController.prototype.onSendTaylorTestEmail = function () {
            this.makeHelperRequest("/api/AdminHelper/SendFromTaylorEmail?testEmailRecipient=" + encodeURIComponent(this.testTaylorEmailRecipient));
        };
        ManageGroupsController.prototype.onSendTaylorBulkUpdateEmail = function () {
            if (!confirm("Are you sure you want to SEND TO EVERYONE?!?!"))
                return;
            this.makeHelperRequest("/api/AdminHelper/SendBulkTaylorEmail3");
        };
        ManageGroupsController.prototype.onSendTestPostmarkEmail = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/AdminHelper/SendTestPostmarkEmail?email=" + this.testPostmarkEmail).then(function () {
                _this.isLoading = false;
                alert("Successfully sent email");
            }, function () {
                _this.isLoading = false;
                alert("Failed to send email");
            });
        };
        ManageGroupsController.prototype.onSendTestCalendarEmail = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/AdminHelper/SendTestCalendarEmail").then(function () {
                _this.isLoading = false;
                alert("Successfully sent email");
            }, function () {
                _this.isLoading = false;
                alert("Failed to send email");
            });
        };
        ManageGroupsController.prototype.onSendNoReplyEmail = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.post("/api/AdminHelper/SendNoReplyPostmarkEmail", this.noReplyEmailInfo).then(function () {
                _this.isLoading = false;
                alert("Successfully sent email");
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to send email: " + response.data.exceptionMessage);
            });
        };
        ManageGroupsController.prototype.makeHelperRequest = function (apiPath, postData) {
            var _this = this;
            if (postData === void 0) { postData = null; }
            this.isLoadingHelper = true;
            var request;
            if (postData)
                request = this.$http.post(apiPath, postData);
            else
                request = this.$http.get(apiPath);
            request.then(function () { return _this.isLoadingHelper = false; }, function (response) {
                _this.isLoadingHelper = false;
                var msg = response.data ? response.data.exceptionMessage : "";
                alert("Failed: " + msg);
            });
        };
        ManageGroupsController.prototype.onTestException = function () {
            this.makeHelperRequest("/api/AdminHelper/TestException");
        };
        ManageGroupsController.prototype.onClearElmahLogs = function () {
            this.makeHelperRequest("/api/AdminHelper/ClearElmah");
        };
        ManageGroupsController.prototype.onClearCurrentAppGroupCache = function () {
            this.makeHelperRequest("/api/AdminHelper/ClearCurrentGroupFromCache");
        };
        ManageGroupsController.prototype.onClearEntireAppGroupCache = function () {
            this.makeHelperRequest("/api/AdminHelper/ClearGroupCache");
        };
        ManageGroupsController.prototype.onSendInactiveGroupsMail = function () {
            var postData = {
                shortNameLines: this.inactiveShortNames
            };
            this.makeHelperRequest("/api/AdminHelper/SendInactiveGroupsMail", postData);
        };
        ManageGroupsController.prototype.logInAs = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/AdminHelper/LogInAs?email=" + this.logInAsEmail).then(function (response) {
                _this.siteInfo.setAuthToken(response.data);
                window.location.href = "/#!/Home";
                window.location.reload(false);
            }, function (response) {
                alert("Failed to perform login: " + response.data.exceptionMessage);
            }).finally(function () { return _this.isLoading = false; });
        };
        ManageGroupsController.prototype.populateEmptyDocumentUsage = function () {
            var _this = this;
            this.isLoading = true;
            var getUri = "/api/AdminHelper/FillInMissingDocumentUsage?numGroups=10";
            if (this.populateDocUsageGroupId)
                getUri += "&groupId=" + this.populateDocUsageGroupId;
            this.$http.get(getUri).then(function (response) {
                _this.isLoading = false;
                alert("Succeeded: " + response.data);
            }, function (response) {
                _this.isLoading = false;
                alert("Failed: " + response.data.exceptionMessage);
            });
        };
        ManageGroupsController.prototype.refreshCurGroupDocumentUsage = function () {
            var _this = this;
            this.isLoading = true;
            var getUri = "/api/AdminHelper/RecalcGroupDocumentUsage?groupId=" + this.curGroupId;
            this.$http.get(getUri).then(function (response) {
                _this.isLoading = false;
                console.log("Recalc Succeeded", response.data);
                alert("Succeeded: " + response.data);
            }, function (response) {
                _this.isLoading = false;
                alert("Failed: " + response.data.exceptionMessage);
            });
        };
        ManageGroupsController.prototype.onAddAllyPayment = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.post("/api/AdminHelper/AddAllyPaymentEntry", this.newAllyPaymentEntry).then(function (response) {
                _this.isLoading = false;
                _this.newAllyPaymentEntry.amount = 0;
                _this.newAllyPaymentEntry.netAmount = null;
                _this.newAllyPaymentEntry.paymentMethodId = "";
                alert("Succeeded");
            }, function (response) {
                _this.isLoading = false;
                alert("Failed: " + response.data.exceptionMessage);
            });
        };
        ManageGroupsController.prototype.updatePremiumCost = function () {
            var _this = this;
            this.isLoading = true;
            var postUri = "/api/AdminHelper/SetPremiumCost/" + this.premiumUpdateGroupId + "?cost=" + this.premiumNewCost;
            this.$http.put(postUri, null).then(function (response) {
                _this.isLoading = false;
                _this.premiumNewCost = 0;
                alert("Succeeded");
            }, function (response) {
                _this.isLoading = false;
                alert("Failed: " + response.data.exceptionMessage);
            });
        };
        ManageGroupsController.prototype.updatePremiumExpiration = function () {
            var _this = this;
            if (!this.premiumNewExpiration) {
                alert("Hey, dummy, enter a date. Ha!");
                return;
            }
            this.isLoading = true;
            var postUri = "/api/AdminHelper/SetPremiumExpiration/" + this.premiumUpdateGroupId + "?expirationDate=" + encodeURIComponent(this.premiumNewExpiration.toISOString());
            this.$http.put(postUri, null).then(function (response) {
                _this.isLoading = false;
                _this.premiumNewExpiration = null;
                alert("Succeeded");
            }, function (response) {
                _this.isLoading = false;
                alert("Failed: " + response.data.exceptionMessage);
            });
        };
        ManageGroupsController.prototype.onDeactivateGroup = function () {
            var _this = this;
            this.isLoading = true;
            var getUri = "/api/AdminHelper/DeactivateGroups?groupIdsCsv=" + this.deactivateGroupIdsCsv;
            this.$http.get(getUri).then(function (response) {
                _this.isLoading = false;
                _this.deactivateGroupIdsCsv = null;
                alert("Deactivate Succeeded: " + response.data);
            }, function (response) {
                _this.isLoading = false;
                alert("Deactivate Failed: " + response.data.exceptionMessage);
            });
        };
        ManageGroupsController.prototype.onReactivateGroup = function () {
            var _this = this;
            this.isLoading = true;
            var getUri = "/api/AdminHelper/ReactivateGroup?groupId=" + this.reactivateGroupId;
            this.$http.get(getUri).then(function (response) {
                _this.isLoading = false;
                _this.reactivateGroupId = null;
                alert("Reactivate Succeeded: " + response.data);
            }, function (response) {
                _this.isLoading = false;
                alert("Reactivate Failed: " + response.data.exceptionMessage);
            });
        };
        ManageGroupsController.$inject = ["$http", "SiteInfo"];
        return ManageGroupsController;
    }());
    Ally.ManageGroupsController = ManageGroupsController;
    var AllyPaymentEntry = /** @class */ (function () {
        function AllyPaymentEntry() {
        }
        return AllyPaymentEntry;
    }());
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
    var ManageHomesController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ManageHomesController($http, siteInfo) {
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
        ManageHomesController.prototype.$onInit = function () {
            this.isAdmin = this.siteInfo.userInfo.isAdmin;
            this.homeName = AppConfig.homeName || "Unit";
            this.isCondoAlly = AppConfig.appShortName === "condo";
            this.refresh();
        };
        /**
         * Populate the page
         */
        ManageHomesController.prototype.refresh = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Unit?includeAddressData=true").then(function (response) {
                _this.isLoading = false;
                _this.units = response.data;
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to load homes: " + response.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user presses the button to create a new unit
         */
        ManageHomesController.prototype.onCreateUnitClick = function () {
            var _this = this;
            $("#AddUnitForm").validate();
            if (!$("#AddUnitForm").valid())
                return;
            this.isLoading = true;
            var onSave = function () {
                _this.isLoading = false;
                _this.isEdit = false;
                _this.unitToEdit = new Ally.Unit();
                _this.refresh();
            };
            var onError = function (response) {
                _this.isLoading = false;
                alert("Failed to save: " + response.data.exceptionMessage);
            };
            if (this.isEdit)
                this.$http.put("/api/Unit", this.unitToEdit).then(onSave, onError);
            else
                this.$http.post("/api/Unit/AddSingle", this.unitToEdit).then(onSave, onError);
        };
        /**
         * Occurs when the user presses the button to edit a unit
         */
        ManageHomesController.prototype.onEditUnitClick = function (unit) {
            this.isEdit = true;
            this.unitToEdit = _.clone(unit);
            if (unit.fullAddress)
                this.unitToEdit.streetAddress = unit.fullAddress.oneLiner;
            document.getElementById("unit-edit-panel").scrollIntoView();
        };
        /**
         * Occurs when the user presses the button to refresh a unit's geocoded info from Google
         */
        ManageHomesController.prototype.onRefreshUnitFromGoogle = function (unit) {
            var _this = this;
            this.isLoading = true;
            this.$http.put("/api/Unit/ForceRefreshAddressFromGoogle?unitId=" + unit.unitId, null).then(function () {
                _this.isLoading = false;
                _this.refresh();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to refresh: " + response.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user presses the button to delete a unit
         */
        ManageHomesController.prototype.onDeleteUnitClick = function (unit) {
            var _this = this;
            this.isLoading = true;
            this.$http.delete("/api/Unit/" + unit.unitId).then(function () {
                _this.isLoading = false;
                _this.refresh();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to delete: " + response.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user presses the button to fast add units
         */
        ManageHomesController.prototype.onFastAddUnits = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.post("/api/Unit/FastAdd?fastAdd=" + this.lastFastAddName, null).then(function () {
                _this.isLoading = false;
                _this.refresh();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed fast add: " + response.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user presses the button to add units from the multi-line text box
         */
        ManageHomesController.prototype.onAddUnitsPerLine = function () {
            var _this = this;
            var postData = {
                action: "onePerLine",
                lines: this.unitNamePerLine
            };
            this.isLoading = true;
            this.$http.post("/api/Unit/Multiline", postData).then(function () {
                _this.isLoading = false;
                _this.refresh();
            }, function () {
                _this.isLoading = false;
                alert("Failed");
            });
        };
        /**
         * Occurs when the user presses the button to add homes from the address multi-line text box
         */
        ManageHomesController.prototype.onAddUnitsByAddressPerLine = function () {
            var _this = this;
            var postData = {
                action: "onePerLine",
                lines: this.unitAddressPerLine
            };
            this.isLoading = true;
            this.$http.post("/api/Unit/FromAddresses", postData).then(function () {
                _this.isLoading = false;
                _this.unitAddressPerLine = "";
                _this.refresh();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to add: " + response.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user presses the button to delete all units
         */
        ManageHomesController.prototype.onDeleteAllClick = function () {
            var _this = this;
            if (!confirm("This will delete every unit! This should only be used for new sites!"))
                return;
            this.isLoading = true;
            this.$http.delete("/api/Unit/DeleteAll?deleteAction=all").then(function () {
                _this.isLoading = false;
                _this.refresh();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to delete units: " + response.data.exceptionMessage);
            });
        };
        ManageHomesController.$inject = ["$http", "SiteInfo"];
        return ManageHomesController;
    }());
    Ally.ManageHomesController = ManageHomesController;
})(Ally || (Ally = {}));
CA.angularApp.component("manageHomes", {
    templateUrl: "/ngApp/admin/manage-homes.html",
    controller: Ally.ManageHomesController
});

var Ally;
(function (Ally) {
    var ActivityLogEntry = /** @class */ (function () {
        function ActivityLogEntry() {
        }
        return ActivityLogEntry;
    }());
    /**
     * The controller for the admin-only page to edit group boundary polygons
     */
    var ViewActivityLogController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function ViewActivityLogController($http) {
            this.$http = $http;
            this.isLoading = false;
            this.shouldHideLoginAndEmailMessages = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ViewActivityLogController.prototype.$onInit = function () {
            this.shouldHideLoginAndEmailMessages = window.localStorage["activityLog_hideLoginAndEmailMessages"] === "true";
            // Initialize the UI
            this.retrieveEntries();
        };
        /**
         * Occurs when the users toggles the login/email filter checkbox
         */
        ViewActivityLogController.prototype.onHideLoginAndEmailMessagesChange = function () {
            window.localStorage["activityLog_hideLoginAndEmailMessages"] = this.shouldHideLoginAndEmailMessages;
            this.filterMessages();
        };
        /**
         * Load the activity log data
         */
        ViewActivityLogController.prototype.retrieveEntries = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/ActivityLog").then(function (logResponse) {
                _this.isLoading = false;
                _this.allLogEntries = logResponse.data;
                // The date comes down as a string so let's convert it to a Date object for the local time zone
                _.each(_this.allLogEntries, function (e) { return e.postDate = moment(e.postDate).toDate(); });
                _this.filterMessages();
            }, function (errorResponse) {
                _this.isLoading = false;
                alert("Failed to load activity log: " + errorResponse.data.exceptionMessage);
            });
        };
        /**
         * Update the visible messages based on filter criteria
         */
        ViewActivityLogController.prototype.filterMessages = function () {
            if (this.shouldHideLoginAndEmailMessages)
                this.filteredLogEntries = _.filter(this.allLogEntries, function (e) { return e.activityMessage !== "Logged in" && e.activityMessage.indexOf("Group email sent") !== 0; });
            else
                this.filteredLogEntries = this.allLogEntries;
        };
        ViewActivityLogController.$inject = ["$http"];
        return ViewActivityLogController;
    }());
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
    var ViewPolysController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function ViewPolysController($http) {
            this.$http = $http;
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ViewPolysController.prototype.$onInit = function () {
            this.refreshAddresses();
        };
        ViewPolysController.prototype.findCenter = function (polys) {
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
        };
        // Get the polygons to display
        ViewPolysController.prototype.refreshAddresses = function () {
            var _this = this;
            this.isLoading = true;
            this.neighborhoodPolys = [];
            var innerThis = this;
            this.$http.get("/api/Neighborhood/GetAll").then(function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.neighborhoods = httpResponse.data;
                innerThis.neighborhoodPolys = _.select(innerThis.neighborhoods, function (n) { return n.Bounds; });
                innerThis.mapCenter = innerThis.findCenter(_this.neighborhoodPolys);
            }, function (httpResponse) {
                innerThis.isLoading = false;
                alert("Failed to retrieve neighborhoods: " + httpResponse.data.exceptionMessage);
            });
        };
        ;
        ViewPolysController.$inject = ["$http", "$q"];
        return ViewPolysController;
    }());
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
    var ViewResearchController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function ViewResearchController($http) {
            this.$http = $http;
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ViewResearchController.prototype.$onInit = function () {
            this.mapCenter = { lat: 41.99114, lng: -87.690425 };
            // Initialize the UI
            this.refreshCells();
        };
        ViewResearchController.prototype.addLine = function (map, minLat, minLon, maxLat, maxLon) {
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
        };
        ViewResearchController.prototype.onBuildingSelected = function (building) {
        };
        ViewResearchController.prototype.onCellSelected = function (cell) {
            cell.gpsBounds.mapShapeObject.setOptions({ fillOpacity: 0.1 });
            if (this.selectedCell) {
                this.selectedCell.gpsBounds.mapShapeObject.setOptions({ fillOpacity: 0.35 });
            }
            this.selectedCell = cell;
            _.each(this.selectedCell.streets, function (s) {
                if (s.minLat != 0)
                    this.addLine(cell.gpsBounds.mapShapeObject.map, s.minLat, s.minLon, s.maxLat, s.maxLon);
            });
        };
        // Get the addresses that are missing bounding polys
        ViewResearchController.prototype.refreshCells = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/ResearchMap").then(function (response) {
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
        };
        // Occurs when the user clicks an address
        ViewResearchController.prototype.onAddressSelected = function (address) {
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
        };
        ViewResearchController.$inject = ["$http"];
        return ViewResearchController;
    }());
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
//const StripeApiKey = "pk_test_FqHruhswHdrYCl4t0zLrUHXK";
var StripeApiKey = "pk_live_fV2yERkfAyzoO9oWSfORh5iH";
CA.angularApp.config(['$routeProvider', '$httpProvider', '$provide', "SiteInfoProvider", "$locationProvider",
    function ($routeProvider, $httpProvider, $provide, siteInfoProvider, $locationProvider) {
        $locationProvider.hashPrefix('!');
        var isLoginRequired = function ($location, $q, siteInfo, appCacheService) {
            var deferred = $q.defer();
            // We have no user information so they must login
            var isPublicHash = $location.path() === "/Home" || $location.path() === "/Login" || AppConfig.isPublicRoute($location.path());
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
        var universalResolvesWithLogin = {
            app: ["$q", "$http", "$rootScope", "$sce", "$location", "xdLocalStorage", "appCacheService",
                function ($q, $http, $rootScope, $sce, $location, xdLocalStorage, appCacheService) {
                    return Ally.SiteInfoHelper.loginInit($q, $http, $rootScope, $sce, xdLocalStorage).then(function (siteInfo) {
                        return isLoginRequired($location, $q, siteInfo, appCacheService);
                    });
                }]
        };
        var universalResolves = {
            app: ["$q", "$http", "$rootScope", "$sce", "xdLocalStorage", Ally.SiteInfoHelper.loginInit]
        };
        // This allows us to require SiteInfo to be retrieved before the app runs
        var customRouteProvider = angular.extend({}, $routeProvider, {
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
        for (var i = 0; i < AppConfig.menu.length; ++i) {
            var menuItem = AppConfig.menu[i];
            var routeObject = {
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
                        var status = response.status;
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
                                var $http_1 = $injector.get("$http");
                                // Multiple requests can come in at the same time with 401, so let's store
                                // our login promise so subsequent calls can tie into the first login
                                // request
                                if (!$rootScope.retryLoginDeffered) {
                                    $rootScope.retryLoginDeffered = $q.defer();
                                    var loginInfo_1 = {
                                        emailAddress: window.localStorage["rememberMe_Email"],
                                        password: atob(window.localStorage["rememberMe_Password"])
                                    };
                                    var retryLogin = function () {
                                        $http_1.post("/api/Login", loginInfo_1).then(function (httpResponse) {
                                            var loginData = httpResponse.data;
                                            var siteInfo = $injector.get("SiteInfo");
                                            // Store the new auth token
                                            siteInfo.setAuthToken(loginData.authToken);
                                            var loginDeffered = $rootScope.retryLoginDeffered;
                                            loginDeffered.resolve();
                                        }, function () {
                                            // Login failed so bail out all the way
                                            var loginDeffered = $rootScope.retryLoginDeffered;
                                            $rootScope.onLogOut_ClearData();
                                            loginDeffered.reject();
                                        }).finally(function () {
                                            $rootScope.retryLoginDeffered = null;
                                        });
                                    };
                                    // Wait, just a bit, to let any other requests come in with a 401
                                    setTimeout(retryLogin, 1000);
                                }
                                var retryRequestDeferred_1 = $q.defer();
                                $rootScope.retryLoginDeffered.promise.then(function () {
                                    // Retry the request
                                    retryRequestDeferred_1.resolve($http_1(response.config));
                                    //$http( response.config ).then( function( newResponse )
                                    //{
                                    //    retryRequestDeferred.resolve( newResponse );
                                    //}, function()
                                    //{
                                    //    retryRequestDeferred.reject( response );
                                    //} );
                                }, function () {
                                    retryRequestDeferred_1.reject(response);
                                });
                                return retryRequestDeferred_1.promise;
                            }
                            // Home, the default page, and login don't need special redirection or user messaging
                            if ($location.path() !== "/Home" && $location.path() !== "/Login") {
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
                        var BaseGenericUri = "https://0.webappapi.mycommunityally.org/api/";
                        var BaseLocalGenericUri = "https://0.webappapi.communityally.org/api/";
                        var isMakingGenericApiRequest = HtmlUtil.startsWith(reqConfig.url, BaseGenericUri)
                            || HtmlUtil.startsWith(reqConfig.url, BaseLocalGenericUri);
                        // If we're talking to the Community Ally API server, then we need to complete the
                        // relative URL and add the auth token
                        var isMakingApiRequest = HtmlUtil.startsWith(reqConfig.url, "/api/") || isMakingGenericApiRequest;
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
        $rootScope.populatePublicPageMenu = function () {
            $rootScope.publicMenuItems = null;
            if (!$rootScope.publicSiteInfo || !$rootScope.publicSiteInfo.customPages)
                return;
            var customPages = $rootScope.publicSiteInfo.customPages;
            if (customPages.length == 0)
                return;
            customPages.forEach(function (p) { return p.path = "/Page/" + p.pageSlug; });
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
            $rootScope.curPath = $location.path();
            // If there is a query string, track it
            var queryString = "";
            var path = $location.path();
            if (path.indexOf("?") !== -1)
                queryString = path.substring(path.indexOf("?"), path.length);
            // If there is a referrer, track it
            var referrer = "";
            if (fromState && fromState.name)
                referrer = $location.protocol() + "://" + $location.host() + "/#" + fromState.url;
            // Tell Segment about the route change
            analytics.page({
                path: path,
                referrer: referrer,
                search: queryString,
                url: $location.absUrl()
            });
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
    var MenuItem_v3 = /** @class */ (function () {
        function MenuItem_v3() {
        }
        return MenuItem_v3;
    }());
    Ally.MenuItem_v3 = MenuItem_v3;
})(Ally || (Ally = {}));

function RoutePath(path, templateUrl, controller, menuTitle, role) {
    if (role === void 0) { role = null; }
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
    var RouteOptions_v3 = /** @class */ (function () {
        function RouteOptions_v3() {
        }
        return RouteOptions_v3;
    }());
    Ally.RouteOptions_v3 = RouteOptions_v3;
    // For use with the newer Angular component objects
    var RoutePath_v3 = /** @class */ (function () {
        function RoutePath_v3(routeOptions) {
            this.reloadOnSearch = true;
            if (routeOptions.path[0] !== '/')
                routeOptions.path = "/" + routeOptions.path;
            this.path = routeOptions.path;
            this.templateHtml = routeOptions.templateHtml;
            this.menuTitle = routeOptions.menuTitle;
            this.role = routeOptions.role || Role_Authorized;
            this.reloadOnSearch = routeOptions.reloadOnSearch === undefined ? false : routeOptions.reloadOnSearch;
        }
        return RoutePath_v3;
    }());
    Ally.RoutePath_v3 = RoutePath_v3;
    var AppConfigInfo = /** @class */ (function () {
        function AppConfigInfo() {
        }
        AppConfigInfo.dwollaPreviewShortNames = ["qa", "dwollademo", "dwollademo1", "900wainslie", "elingtonvillagepoa"];
        AppConfigInfo.dwollaEnvironmentName = "prod";
        return AppConfigInfo;
    }());
    Ally.AppConfigInfo = AppConfigInfo;
    var PeriodicPaymentFrequency = /** @class */ (function () {
        function PeriodicPaymentFrequency() {
        }
        return PeriodicPaymentFrequency;
    }());
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
var CondoAllyAppConfig = {
    appShortName: "condo",
    appName: "Condo Ally",
    baseTld: "condoally.com",
    baseUrl: "https://condoally.com/",
    isChtnSite: true,
    homeName: "Unit",
    memberTypeLabel: "Resident",
    menu: [
        new Ally.RoutePath_v3({ path: "Home", templateHtml: "<chtn-home></chtn-home>", menuTitle: "Home" }),
        new Ally.RoutePath_v3({ path: "Home/DiscussionThread/:discussionThreadId", templateHtml: "<chtn-home></chtn-home>" }),
        new Ally.RoutePath_v3({ path: "Info/Docs", templateHtml: "<association-info></association-info>", menuTitle: "Documents & Info", reloadOnSearch: false }),
        new Ally.RoutePath_v3({ path: "Info/:viewName", templateHtml: "<association-info></association-info>" }),
        new Ally.RoutePath_v3({ path: "Logbook", templateHtml: "<logbook-page></logbook-page>", menuTitle: "Calendar" }),
        new Ally.RoutePath_v3({ path: "Map", templateHtml: "<chtn-map></chtn-map>", menuTitle: "Map" }),
        new Ally.RoutePath_v3({ path: "BuildingResidents", templateHtml: "<group-members></group-members>", menuTitle: "Directory" }),
        new Ally.RoutePath_v3({ path: "Committee/:committeeId/:viewName", templateHtml: "<committee-parent></committee-parent>" }),
        new Ally.RoutePath_v3({ path: "Committee/:committeeId/Home/DiscussionThread/:discussionThreadId", templateHtml: "<committee-parent></committee-parent>" }),
        new Ally.RoutePath_v3({ path: "ForgotPassword", templateHtml: "<forgot-password></forgot-password>", menuTitle: null, role: Role_All }),
        new Ally.RoutePath_v3({ path: "Login", templateHtml: "<login-page></login-page>", menuTitle: null, role: Role_All }),
        new Ally.RoutePath_v3({ path: "Help", templateHtml: "<help-form></help-form>", menuTitle: null, role: Role_All }),
        new Ally.RoutePath_v3({ path: "SignUp", templateHtml: "<condo-sign-up-wizard></condo-sign-up-wizard>", menuTitle: null, role: Role_All }),
        new Ally.RoutePath_v3({ path: "EmailAbuse/:idValue", templateHtml: "<email-abuse></email-abuse>", role: Role_All }),
        new Ally.RoutePath_v3({ path: "DiscussionManage/:idValue", templateHtml: "<discussion-manage></discussion-manage>" }),
        new Ally.RoutePath_v3({ path: "NeighborSignUp", templateHtml: "<neighbor-sign-up></neighbor-sign-up>", role: Role_All }),
        new Ally.RoutePath_v3({ path: "GroupRedirect/:appName/:shortName", templateHtml: "<group-redirect></group-redirect>", role: Role_All }),
        new Ally.RoutePath_v3({ path: "MemberSignUp", templateHtml: "<pending-member-sign-up></pending-member-sign-up>", menuTitle: null, role: Role_All }),
        new Ally.RoutePath_v3({ path: "Page/:slug", templateHtml: "<custom-page-view></custom-page-view>", menuTitle: null, role: Role_All }),
        new Ally.RoutePath_v3({ path: "MyProfile", templateHtml: "<my-profile></my-profile>" }),
        new Ally.RoutePath_v3({ path: "ManageResidents", templateHtml: "<manage-residents></manage-residents>", menuTitle: "Residents", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "ManageCommittees", templateHtml: "<manage-committees></manage-committees>", menuTitle: "Committees", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "ManagePolls", templateHtml: "<manage-polls></manage-polls>", menuTitle: "Polls", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "Financials/OnlinePayments", templateHtml: "<financial-parent></financial-parent>", menuTitle: "Financials", role: Role_Manager }),
        //new Ally.RoutePath_v3( { path: "ManagePayments", templateHtml: "<div class='page'><div>Heads up! This page has moved to Manage -> Financials -> Online Payments. We will be removing this menu item soon.</div></div>", menuTitle: "Online Payments", role: Role_Manager } ),
        //new Ally.RoutePath_v3( { path: "AssessmentHistory", templateHtml: "<div class='page'><div>Heads up! This page has moved to Manage -> Financials -> Assessment History. We will be removing this menu item soon.</div></div>", menuTitle: "Assessment History", role: Role_Manager } ),
        new Ally.RoutePath_v3({ path: "Mailing/Invoice", templateHtml: "<mailing-parent></mailing-parent>", menuTitle: "Mailing", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "ManageCustomPages", templateHtml: "<manage-custom-pages></manage-custom-pages>", menuTitle: "Custom Pages", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "Mailing/:viewName", templateHtml: "<mailing-parent></mailing-parent>", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "Settings/SiteSettings", templateHtml: "<settings-parent></settings-parent>", menuTitle: "Settings", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "Settings/:viewName", templateHtml: "<settings-parent></settings-parent>", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "Financials/:viewName", templateHtml: "<financial-parent></financial-parent>", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "GroupAmenities", templateHtml: "<group-amenities></group-amenities>", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "/Admin/ManageGroups", templateHtml: "<manage-groups></manage-groups>", menuTitle: "All Groups", role: Role_Admin }),
        new Ally.RoutePath_v3({ path: "/Admin/ManageHomes", templateHtml: "<manage-homes></manage-homes>", menuTitle: "Homes", role: Role_Admin }),
        new Ally.RoutePath_v3({ path: "/Admin/ViewActivityLog", templateHtml: "<view-activity-log></view-activity-log>", menuTitle: "Activity Log", role: Role_Admin }),
        new Ally.RoutePath_v3({ path: "/Admin/ManageAddressPolys", templateHtml: "<manage-address-polys></manage-address-polys>", menuTitle: "View Groups on Map", role: Role_Admin }),
        new Ally.RoutePath_v3({ path: "/Admin/ViewPolys", templateHtml: "<view-polys></view-polys>", menuTitle: "View Polygons", role: Role_Admin }),
        new Ally.RoutePath_v3({ path: "/Admin/ViewResearch", templateHtml: "<view-research></view-research>", menuTitle: "View Research", role: Role_Admin }),
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
var HomeAppConfig = {
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
        new Ally.RoutePath_v3({ path: "Logbook", templateHtml: "<logbook-page></logbook-page>", menuTitle: "Calendar" }),
        new Ally.RoutePath_v3({ path: "Users", templateHtml: "<home-users></home-users>", menuTitle: "Users", role: Role_Manager }),
        //new Ally.RoutePath_v3( { path: "Map", templateHtml: "<chtn-map></chtn-map>", menuTitle: "Map" } ),
        new Ally.RoutePath_v3({ path: "/Admin/ViewActivityLog", templateHtml: "<view-activity-log></view-activity-log>", menuTitle: "View Activity Log", role: Role_Admin }),
    ]
};
///////////////////////////////////////////////////////////////////////////////////////////////////
// HOA Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
var HOAAppConfig = _.clone(CondoAllyAppConfig);
HOAAppConfig.appShortName = "hoa";
HOAAppConfig.appName = "HOA Ally";
HOAAppConfig.baseTld = "hoaally.org";
HOAAppConfig.baseUrl = "https://hoaally.org/";
HOAAppConfig.homeName = "Home";
HOAAppConfig.menu.push(new Ally.RoutePath_v3({ path: "HoaSignUp", templateHtml: "<hoa-sign-up-wizard></hoa-sign-up-wizard>", role: Role_All }));
///////////////////////////////////////////////////////////////////////////////////////////////////
// Neighborhood Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
var NeighborhoodAppConfig = _.clone(CondoAllyAppConfig);
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
var BlockClubAppConfig = _.clone(CondoAllyAppConfig);
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
var PtaAppConfig = _.clone(CondoAllyAppConfig);
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
    new Ally.RoutePath_v3({ path: "Logbook", templateHtml: "<logbook-page></logbook-page>", menuTitle: "Calendar" }),
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
    new Ally.RoutePath_v3({ path: "/Admin/ManageGroups", templateHtml: "<manage-groups></manage-groups>", menuTitle: "All Groups", role: Role_Admin }),
    new Ally.RoutePath_v3({ path: "/Admin/ViewActivityLog", templateHtml: "<view-activity-log></view-activity-log>", menuTitle: "Activity Log", role: Role_Admin }),
    new Ally.RoutePath_v3({ path: "/Admin/ManageAddressPolys", templateHtml: "<manage-address-polys></manage-address-polys>", menuTitle: "View Groups on Map", role: Role_Admin })
];
var AppConfig = null;
var lowerDomain = document.domain.toLowerCase();
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
    var hasParameter = path.indexOf("/", 1) !== -1;
    if (hasParameter)
        path = path.substr(0, path.indexOf("/", 1));
    var route = _.find(AppConfig.menu, function (m) {
        var testPath = m.path;
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
document.title = AppConfig.appName;
$(document).ready(function () {
    $("header").css("background-image", "url(/assets/images/header-img-" + AppConfig.appShortName + ".jpg)");
});

var Ally;
(function (Ally) {
    /**
     * The controller for the page to view membership dues payment history
     */
    var DuesHistoryController = /** @class */ (function () {
        function DuesHistoryController() {
        }
        return DuesHistoryController;
    }());
    Ally.DuesHistoryController = DuesHistoryController;
})(Ally || (Ally = {}));
CA.angularApp.component("duesHistory", {
    templateUrl: "/ngApp/chtn/manager/dues-history.html",
    controller: Ally.DuesHistoryController
});

var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Ally;
(function (Ally) {
    var PeriodicPaymentFrequency;
    (function (PeriodicPaymentFrequency) {
        PeriodicPaymentFrequency[PeriodicPaymentFrequency["Monthly"] = 50] = "Monthly";
        PeriodicPaymentFrequency[PeriodicPaymentFrequency["Quarterly"] = 51] = "Quarterly";
        PeriodicPaymentFrequency[PeriodicPaymentFrequency["Semiannually"] = 52] = "Semiannually";
        PeriodicPaymentFrequency[PeriodicPaymentFrequency["Annually"] = 53] = "Annually";
    })(PeriodicPaymentFrequency || (PeriodicPaymentFrequency = {}));
    var PeriodicPayment = /** @class */ (function () {
        function PeriodicPayment() {
            /// Indicates if this payment is simply a placeholder entry, i.e. doesn't have a backing entry in the DB
            this.isEmptyEntry = false;
        }
        return PeriodicPayment;
    }());
    var AssessmentPayment = /** @class */ (function (_super) {
        __extends(AssessmentPayment, _super);
        function AssessmentPayment() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return AssessmentPayment;
    }(PeriodicPayment));
    Ally.AssessmentPayment = AssessmentPayment;
    var PayerInfo = /** @class */ (function () {
        function PayerInfo() {
        }
        return PayerInfo;
    }());
    var FullPaymentHistory = /** @class */ (function () {
        function FullPaymentHistory() {
        }
        return FullPaymentHistory;
    }());
    var SpecialAssessmentEntry = /** @class */ (function () {
        function SpecialAssessmentEntry() {
        }
        return SpecialAssessmentEntry;
    }());
    /**
     * The controller for the page to view resident assessment payment history
     */
    var AssessmentHistoryController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function AssessmentHistoryController($http, $location, siteInfo, appCacheService) {
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
        AssessmentHistoryController.prototype.$onInit = function () {
            var _this = this;
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
            var payFrequencyInfo = FrequencyIdToInfo(this.assessmentFrequency);
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
            window.setTimeout(function () { return _this.$http.get("/api/DocumentLink/0").then(function (response) { return _this.viewExportViewId = response.data.vid; }); }, 250);
            // Hook up Bootstrap v4 tooltips
            window.setTimeout(function () { return $('[data-toggle="tooltip"]').tooltip(); }, 1000);
        };
        AssessmentHistoryController.prototype.getTodaysPayPeriod = function () {
            // We add 1's to periods because pay periods are 1-based, but Date.getMonth() is 0-based
            var periodValue = new Date().getMonth() + 1;
            var yearValue = new Date().getFullYear();
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
                periodValue: periodValue,
                yearValue: yearValue
            };
        };
        AssessmentHistoryController.prototype.onChangePeriodicPaymentTracking = function () {
            var _this = this;
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
            this.$http.put("/api/Association/updatePeriodicPaymentTracking?isPeriodicPaymentTrackingEnabled=" + this.isPeriodicPaymentTrackingEnabled, null).then(function () {
                _this.isLoading = false;
            }, function () {
                alert("Failed to update the payment tracking");
                _this.isLoading = false;
            });
        };
        /**
         * Add in entries to the payments array so every period has an entry
         */
        AssessmentHistoryController.prototype.populateVisiblePaymentsForUnit = function (unit) {
            var defaultOwnerUserId = (unit.owners !== null && unit.owners.length > 0) ? unit.owners[0].userId : null;
            var sortedPayments = [];
            var _loop_1 = function (periodIndex) {
                var curPeriodEntry = this_1.visiblePeriodEntries[periodIndex];
                var curPeriodPayment = void 0;
                if (curPeriodEntry.specialAssessmentId)
                    curPeriodPayment = _.find(unit.allPayments, function (p) { return p.specialAssessmentId === curPeriodEntry.specialAssessmentId; });
                else
                    curPeriodPayment = _.find(unit.allPayments, function (p) { return p.period === curPeriodEntry.periodValue && p.year === curPeriodEntry.year; });
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
                        groupId: this_1.siteInfo.publicSiteInfo.groupId,
                        notes: null,
                        payerNotes: null,
                        paymentsInfoId: null,
                        wePayStatus: null,
                        specialAssessmentId: curPeriodEntry.specialAssessmentId,
                        unitId: unit.unitId
                    };
                }
                sortedPayments.push(curPeriodPayment);
            };
            var this_1 = this;
            for (var periodIndex = 0; periodIndex < this.visiblePeriodEntries.length; ++periodIndex) {
                _loop_1(periodIndex);
            }
            return sortedPayments;
        };
        /**
         * Add in entries to the payments array so every period has an entry
         */
        AssessmentHistoryController.prototype.fillInEmptyPaymentsForMember = function (member) {
            var sortedPayments = [];
            var _loop_2 = function (periodIndex) {
                var curPeriod = this_2.visiblePeriodEntries[periodIndex];
                var curPeriodPayment = void 0;
                if (curPeriod.specialAssessmentId)
                    curPeriodPayment = _.find(member.enteredPayments, function (p) { return p.specialAssessmentId === curPeriod.specialAssessmentId; });
                else
                    curPeriodPayment = _.find(member.enteredPayments, function (p) { return p.period === curPeriod.periodValue && p.year === curPeriod.year; });
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
            };
            var this_2 = this;
            for (var periodIndex = 0; periodIndex < this.visiblePeriodEntries.length; ++periodIndex) {
                _loop_2(periodIndex);
            }
            return sortedPayments;
        };
        AssessmentHistoryController.prototype.viewWePayDetails = function (wePayCheckoutId) {
            this.appCacheService.set("hwpid", wePayCheckoutId);
            this.$location.path("/Financials/OnlinePayments");
        };
        AssessmentHistoryController.prototype.viewOnlinePaymentDetails = function (paymentsInfoId) {
            this.appCacheService.set("onpayid", paymentsInfoId.toString());
            this.$location.path("/Financials/OnlinePayments");
        };
        /**
         * Create a special assessment entry
         */
        AssessmentHistoryController.prototype.onSaveSpecialAssessment = function () {
            var _this = this;
            this.isLoading = true;
            var httpMethod = this.editSpecialAssessment.specialAssessmentId ? this.$http.put : this.$http.post;
            httpMethod("/api/PaymentHistory/SpecialAssessment", this.editSpecialAssessment).then(function () {
                _this.isLoading = false;
                _this.editSpecialAssessment = null;
                _this.retrievePaymentHistory();
            }, function (httpResponse) {
                _this.isLoading = false;
                var errorMessage = httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to save special assessment: " + errorMessage);
            });
        };
        /**
         * Display the modal to create special assessments
         */
        AssessmentHistoryController.prototype.showCreateSpecialAssessment = function () {
            this.editSpecialAssessment = new SpecialAssessmentEntry();
            this.editSpecialAssessment.assessmentDate = new Date();
            setTimeout(function () { $("#specialAssessmentName").focus(); }, 10);
        };
        /**
         * Go back a few pay periods
         */
        AssessmentHistoryController.prototype.browsePast = function () {
            this.startPeriodValue = this.startPeriodValue - 6;
            while (this.startPeriodValue < 1) {
                this.startPeriodValue = this.maxPeriodRange + this.startPeriodValue;
                --this.startYearValue;
            }
            this.displayPaymentsForRange(this.startYearValue, this.startPeriodValue);
        };
        /**
         * Go ahead a few pay periods
         */
        AssessmentHistoryController.prototype.browseFuture = function () {
            this.startPeriodValue = this.startPeriodValue + 6;
            while (this.startPeriodValue > this.maxPeriodRange) {
                this.startPeriodValue -= this.maxPeriodRange;
                ++this.startYearValue;
            }
            this.displayPaymentsForRange(this.startYearValue, this.startPeriodValue);
        };
        /*
         * Find the first special assessment entry between two dates
         */
        AssessmentHistoryController.prototype.getSpecialAssessmentBetweenDates = function (startDate, endDate) {
            if (!this.specialAssessments || this.specialAssessments.length === 0)
                return null;
            var didSwapDates = false;
            if (startDate > endDate) {
                var temp = endDate;
                endDate = startDate;
                startDate = temp;
                didSwapDates = true;
            }
            var entries = this.specialAssessments.filter(function (e) { return e.assessmentDate.getTime() >= startDate.getTime() && e.assessmentDate.getTime() < endDate.getTime(); });
            if (didSwapDates)
                entries.reverse();
            return entries;
        };
        AssessmentHistoryController.prototype.periodToDate = function (periodYear) {
            var monthIndex;
            if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Quarterly)
                monthIndex = periodYear.periodValue * 3;
            else if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Semiannually)
                monthIndex = periodYear.periodValue * 6;
            else if (this.assessmentFrequency === AssessmentHistoryController.PeriodicPaymentFrequency_Annually)
                monthIndex = 0;
            else
                monthIndex = periodYear.periodValue - 1;
            return new Date(periodYear.year, monthIndex, 1);
        };
        /**
         * Populate the display for a date range
         */
        AssessmentHistoryController.prototype.displayPaymentsForRange = function (startYear, startPeriod) {
            var _this = this;
            this.startYearValue = startYear;
            this.startPeriodValue = startPeriod; // Pay period values start at 1, not 0
            this.visiblePeriodEntries = [];
            // Step from left to right in the output columns, going back a pay period each time
            var currentPeriod = new PeriodYear(this.startPeriodValue, this.startYearValue);
            var previousPeriod = null;
            for (var columnIndex = 0; columnIndex < this.numPeriodsVisible; ++columnIndex) {
                // If we stepped passed the first period, go the previous year
                if (currentPeriod.periodValue < 1) {
                    currentPeriod.periodValue = this.maxPeriodRange;
                    --currentPeriod.year;
                }
                if (previousPeriod) {
                    var currentPeriodDate = this.periodToDate(currentPeriod);
                    var previousPeriodDate = this.periodToDate(previousPeriod);
                    var specialAssessments = this.getSpecialAssessmentBetweenDates(previousPeriodDate, currentPeriodDate);
                    if (specialAssessments && specialAssessments.length > 0) {
                        for (var _i = 0, specialAssessments_1 = specialAssessments; _i < specialAssessments_1.length; _i++) {
                            var specEntry = specialAssessments_1[_i];
                            var specPeriodEntry = {
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
                var headerName = this.shortPeriodNames[currentPeriod.periodValue - 1];
                if (currentPeriod.periodValue === 1 || currentPeriod.periodValue === this.maxPeriodRange)
                    headerName += " " + currentPeriod.year;
                if (this.isForMemberGroup)
                    headerName = currentPeriod.year + " - " + (currentPeriod.year + 1);
                var periodEntry = {
                    name: headerName,
                    periodValue: currentPeriod.periodValue,
                    arrayIndex: columnIndex,
                    year: currentPeriod.year,
                    isTodaysPeriod: currentPeriod.year === this.todaysPayPeriod.yearValue && currentPeriod.periodValue === this.todaysPayPeriod.periodValue
                };
                this.visiblePeriodEntries.push(periodEntry);
                previousPeriod = new PeriodYear(currentPeriod.periodValue, currentPeriod.year);
                --currentPeriod.periodValue;
            }
            if (this.visiblePeriodEntries.length > this.numPeriodsVisible)
                this.visiblePeriodEntries = this.visiblePeriodEntries.slice(0, this.numPeriodsVisible);
            // Make sure every visible period has an valid entry object
            if (this.isForMemberGroup)
                _.each(this.payers, function (payer) { return payer.displayPayments = _this.fillInEmptyPaymentsForMember(payer); });
            else
                this.unitPayments.forEach(function (unit) { return unit.displayPayments = _this.populateVisiblePaymentsForUnit(unit); });
        };
        /**
         * Populate the payment grid
         */
        AssessmentHistoryController.prototype.retrievePaymentHistory = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/PaymentHistory?oldestDate=").then(function (httpResponse) {
                var paymentInfo = httpResponse.data;
                _this.specialAssessments = httpResponse.data.specialAssessments;
                _this.shouldShowFillInSection = _this.siteInfo.userInfo.isAdmin || (paymentInfo.payments.length < 2 && paymentInfo.units.length > 3);
                // Build the map of unit ID to unit information
                _this.unitPayments = new Map();
                _.each(paymentInfo.units, function (unit) {
                    _this.unitPayments.set(unit.unitId, unit);
                    var curEntry = _this.unitPayments.get(unit.unitId);
                    // Only take the first two owners for now
                    curEntry.displayOwners = _.first(unit.owners, 2);
                    while (curEntry.displayOwners.length < 2)
                        curEntry.displayOwners.push({ name: "" });
                    curEntry.displayPayments = [];
                });
                // Add the payment information to the members
                if (_this.isForMemberGroup && httpResponse.data.payers) {
                    _.each(httpResponse.data.payers, function (payer) {
                        payer.enteredPayments = _.filter(paymentInfo.payments, function (p) { return p.payerUserId === payer.userId; });
                    });
                }
                // Add the payment information to the units
                _.each(paymentInfo.payments, function (payment) {
                    if (_this.unitPayments.has(payment.unitId))
                        _this.unitPayments.get(payment.unitId).displayPayments.push(payment);
                });
                // Store all of the payments rather than just what is visible
                _.each(paymentInfo.units, function (unit) {
                    // The newest payment will be at the start
                    unit.displayPayments = _.sortBy(unit.displayPayments, function (p) { return p.year * 100 + p.period; });
                    unit.displayPayments.reverse();
                    unit.allPayments = unit.displayPayments;
                    // Since allPayments is sorted newest first, let's grab the first payment marked as paid
                    var mostRecentPayment = unit.allPayments.find(function (p) { return p.isPaid; });
                    if (mostRecentPayment) {
                        var numMissedPayments = _this.getNumMissedPayments(mostRecentPayment);
                        // If the person is ahead on payments, still show 0 rather than negative due
                        if (numMissedPayments <= 0)
                            numMissedPayments = 0;
                        unit.estBalance = numMissedPayments * unit.assessment;
                    }
                    else
                        unit.estBalance = undefined;
                });
                _this.totalEstBalance = paymentInfo.units
                    .filter(function (u) { return u.estBalance !== undefined && !isNaN(u.estBalance); })
                    .map(function (u) { return u.estBalance || 0; })
                    .reduce(function (total, val) { return total + val; }, 0);
                // Sort the units by name
                var sortedUnits = Array.from(_this.unitPayments.values());
                _this.nameSortedUnitPayments = Ally.HtmlUtil2.smartSortStreetAddresses(sortedUnits, "name");
                _this.payers = _.sortBy(paymentInfo.payers, function (payer) { return payer.name; });
                _this.displayPaymentsForRange(_this.startYearValue, _this.startPeriodValue);
                _this.isLoading = false;
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to retrieve payment history: " + response.data.exceptionMessage);
            });
        };
        AssessmentHistoryController.prototype.getNumMissedPayments = function (mostRecentPayment) {
            var todaysPayPeriod = this.getTodaysPayPeriod();
            if (mostRecentPayment.year === todaysPayPeriod.yearValue) {
                return todaysPayPeriod.periodValue - mostRecentPayment.period;
            }
            else {
                var numYearsBack = todaysPayPeriod.yearValue - mostRecentPayment.year;
                var yearsPaymentsMissed = (numYearsBack - 1) * this.maxPeriodRange;
                var periodsMissedForRecentYear = this.maxPeriodRange - mostRecentPayment.period;
                return todaysPayPeriod.periodValue + yearsPaymentsMissed + periodsMissedForRecentYear;
            }
            return 0;
        };
        /**
         * Get the amount paid by all units in a pay period
         */
        AssessmentHistoryController.prototype.getPaymentSumForPayPeriod = function (periodIndex) {
            var sum = 0;
            if (AppConfig.isChtnSite) {
                var unitIds = Array.from(this.unitPayments.keys());
                for (var i = 0; i < unitIds.length; ++i) {
                    var unitId = unitIds[i];
                    var paymentInfo = this.unitPayments.get(unitId).displayPayments[periodIndex];
                    if (paymentInfo && paymentInfo.isPaid)
                        sum += paymentInfo.amount;
                }
            }
            else {
                for (var i = 0; i < this.payers.length; ++i) {
                    var paymentInfo = this.payers[i].displayPayments[periodIndex];
                    if (paymentInfo && paymentInfo.isPaid)
                        sum += paymentInfo.amount;
                }
            }
            return sum;
        };
        /**
         * Occurs when the user toggles whether or not to show payment info
         */
        AssessmentHistoryController.prototype.onshowPaymentInfo = function () {
            window.localStorage[this.LocalStorageKey_ShowPaymentInfo] = this.showPaymentInfo;
            window.localStorage[this.LocalStorageKey_ShouldColorCodePayments] = this.shouldColorCodePayments;
        };
        /**
         * Occurs when the user toggles whether or not to show the balance column
         */
        AssessmentHistoryController.prototype.onshowBalanceCol = function () {
            window.localStorage[this.LocalStorageKey_ShowBalanceCol] = this.shouldShowBalanceCol;
            // Show one less column so that we don't hang off the right
            if (this.isForMemberGroup)
                this.numPeriodsVisible = AssessmentHistoryController.MemberDefaultNumPeriodsVisible;
            else
                this.numPeriodsVisible = AssessmentHistoryController.ChtnDefaultNumPeriodsVisible;
            if (this.shouldShowBalanceCol)
                --this.numPeriodsVisible;
            this.displayPaymentsForRange(this.startYearValue, this.startPeriodValue);
        };
        /**
         * Occurs when the user clicks a date cell
         */
        AssessmentHistoryController.prototype.onUnitPaymentCellClick = function (unit, periodPayment) {
            periodPayment.unitId = unit.unitId;
            var periodName = "";
            if (periodPayment.specialAssessmentId) {
                // Despite being on TS 4.5.5 as of this writing, the optional chaning feature causes an issue here
                var payEntry = this.specialAssessments.find(function (a) { return a.specialAssessmentId === periodPayment.specialAssessmentId; });
                if (payEntry)
                    periodName = payEntry.assessmentName;
            }
            else
                periodName = this.periodNames[periodPayment.period - 1];
            this.editPayment = {
                unit: unit,
                payment: _.clone(periodPayment),
                periodName: periodName,
                filteredPayers: _.filter(this.payers, function (payer) {
                    return !_.some(unit.owners, function (owner) { return owner.userId === payer.userId; });
                })
            };
            setTimeout(function () { $("#paid-amount-textbox").focus(); }, 10);
        };
        /**
         * Occurs when the user clicks a date cell
         */
        AssessmentHistoryController.prototype.onMemberPaymentCellClick = function (payer, periodPayment) {
            periodPayment.payerUserId = payer.userId;
            this.editPayment = {
                unit: null,
                payment: _.clone(periodPayment),
                periodName: this.periodNames[periodPayment.period - 1],
                filteredPayers: null
            };
            setTimeout(function () { $("#paid-amount-textbox").focus(); }, 10);
        };
        AssessmentHistoryController.prototype.onSavePayment = function (keyEvent) {
            var _this = this;
            if (keyEvent) {
                event.preventDefault();
                event.stopPropagation();
            }
            var onSave = function () {
                _this.isSavingPayment = false;
                _this.editPayment = null;
                _this.retrievePaymentHistory();
            };
            var onError = function (httpResponse) {
                _this.isSavingPayment = false;
                alert(httpResponse.data.message);
                _this.editPayment = null;
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
        };
        /**
         * Mark all units as paid for a specific period
         */
        AssessmentHistoryController.prototype.populatePaidForPeriod = function () {
            var _this = this;
            // This has a known issue that if there are most special assessments than columns then
            // you won't be able to view all special assessment entries
            if (!this.selectedFillInPeriod)
                return;
            var unitIds = Array.from(this.unitPayments.keys());
            this.isLoading = true;
            var numPosts = 0;
            var _loop_3 = function (i) {
                var unitPayment = this_3.unitPayments.get(unitIds[i]);
                var paymentEntry = _.find(unitPayment.displayPayments, function (p) { return p.year === _this.selectedFillInPeriod.year && p.period === _this.selectedFillInPeriod.periodValue; });
                if (paymentEntry) {
                    if (paymentEntry.isPaid)
                        return "continue";
                }
                var postData = {
                    Year: this_3.selectedFillInPeriod.year,
                    Period: this_3.selectedFillInPeriod.periodValue,
                    IsPaid: true,
                    Amount: unitPayment.assessment || 0,
                    PaymentDate: new Date(),
                    PayerUserId: this_3.siteInfo.userInfo.userId,
                    Notes: "Auto-marking all entries for " + this_3.selectedFillInPeriod.name.trim(),
                    unitId: unitPayment.unitId
                };
                ++numPosts;
                // Poor man's async for-loop
                window.setTimeout(function () { return _this.$http.post("/api/PaymentHistory", postData); }, numPosts * 350);
            };
            var this_3 = this;
            for (var i = 0; i < unitIds.length; ++i) {
                _loop_3(i);
            }
            window.setTimeout(function () {
                _this.isLoading = false;
                _this.retrievePaymentHistory();
            }, (numPosts + 1) * 350);
        };
        AssessmentHistoryController.prototype.onExportClick = function (type) {
            var _this = this;
            // Get a new view token in case the user clicks export again
            window.setTimeout(function () { return _this.$http.get("/api/DocumentLink/0").then(function (response) { return _this.viewExportViewId = response.data.vid; }); }, 500);
            analytics.track('exportAssessment' + type);
            return true;
        };
        AssessmentHistoryController.prototype.showBulkSet = function () {
            this.shouldShowFillInSection = true;
            window.scrollTo(0, 0);
        };
        AssessmentHistoryController.prototype.onPeriodHeaderClick = function (period) {
            if (!period.specialAssessmentId)
                return;
            this.editSpecialAssessment = this.specialAssessments.find(function (sa) { return sa.specialAssessmentId === period.specialAssessmentId; });
            setTimeout(function () { $("#specialAssessmentName").focus(); }, 10);
        };
        AssessmentHistoryController.prototype.onDeleteSpecialAssessment = function () {
            var _this = this;
            // If, somehow, we get in here with a new special assessment, just bail
            if (!this.editSpecialAssessment.specialAssessmentId) {
                this.editSpecialAssessment = null;
                return;
            }
            if (!confirm("Are you sure you want to delete this special assessment entry? This will delete any associated payment entires and CANNOT BE UNDONE."))
                return;
            this.isLoading = true;
            this.$http.delete("/api/PaymentHistory/SpecialAssessment/" + this.editSpecialAssessment.specialAssessmentId).then(function () {
                _this.isLoading = false;
                _this.editSpecialAssessment = null;
                _this.retrievePaymentHistory();
            }, function (httpResponse) {
                _this.isLoading = false;
                var errorMessage = httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to delete special assessment entry: " + errorMessage);
            });
        };
        AssessmentHistoryController.$inject = ["$http", "$location", "SiteInfo", "appCacheService"];
        AssessmentHistoryController.PeriodicPaymentFrequency_Monthly = 50;
        AssessmentHistoryController.PeriodicPaymentFrequency_Quarterly = 51;
        AssessmentHistoryController.PeriodicPaymentFrequency_Semiannually = 52;
        AssessmentHistoryController.PeriodicPaymentFrequency_Annually = 53;
        AssessmentHistoryController.PeriodValueSpecial = 254;
        // The number of pay periods that are visible on the grid
        AssessmentHistoryController.ChtnDefaultNumPeriodsVisible = 9;
        AssessmentHistoryController.MemberDefaultNumPeriodsVisible = 8;
        return AssessmentHistoryController;
    }());
    Ally.AssessmentHistoryController = AssessmentHistoryController;
    var PeriodYear = /** @class */ (function () {
        function PeriodYear(periodValue, year) {
            this.periodValue = periodValue;
            this.year = year;
        }
        return PeriodYear;
    }());
    var EditPaymentInfo = /** @class */ (function () {
        function EditPaymentInfo() {
        }
        return EditPaymentInfo;
    }());
    var PeriodEntry = /** @class */ (function () {
        function PeriodEntry() {
        }
        return PeriodEntry;
    }());
})(Ally || (Ally = {}));
CA.angularApp.component("assessmentHistory", {
    templateUrl: "/ngApp/chtn/manager/financial/assessment-history.html",
    controller: Ally.AssessmentHistoryController
});

var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Ally;
(function (Ally) {
    /**
     * The controller for the page to track group spending
     */
    var BudgetToolController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function BudgetToolController($http, appCacheService, uiGridConstants, $rootScope) {
            this.$http = $http;
            this.appCacheService = appCacheService;
            this.uiGridConstants = uiGridConstants;
            this.$rootScope = $rootScope;
            this.isLoading = false;
            this.financialCategoryMap = new Map();
            this.totalExpense = 0;
            this.totalIncome = 0;
            this.EditAmountTemplate = "<div class='ui-grid-cell-contents'><span data-ng-if='row.entity.hasChildren'>{{row.entity.amount | currency}}</span><span data-ng-if='!row.entity.hasChildren'>$<input type='number' style='width: 85%;' data-ng-model='row.entity.amount' data-ng-change='grid.appScope.$ctrl.onAmountChange(row.entity)' /></span></div>";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        BudgetToolController.prototype.$onInit = function () {
            var _this = this;
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
                    onRegisterApi: function (gridApi) {
                        _this.expenseGridApi = gridApi;
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                        _this.expenseGridApi.treeBase.on.rowExpanded(_this.$rootScope, function (row) {
                            // console.log( "here", row );
                        });
                    }
                };
            this.incomeGridOptions = _.clone(this.expenseGridOptions);
            this.incomeGridOptions.onRegisterApi = function (gridApi) {
                _this.incomeGridApi = gridApi;
                // Fix dumb scrolling
                HtmlUtil.uiGridFixScroll();
            };
            this.refreshData();
        };
        /**
        * Retrieve the group budgets from the server
        */
        BudgetToolController.prototype.refreshData = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Budget/PageData").then(function (httpResponse) {
                _this.isLoading = false;
                _this.budgets = httpResponse.data.budgets;
                _this.rootFinancialCategory = httpResponse.data.rootFinancialCategory;
                _this.financialCategoryMap.clear();
                var visitNode = function (node) {
                    _this.financialCategoryMap.set(node.financialCategoryId, node);
                    if (node.childCategories) {
                        for (var i = 0; i < node.childCategories.length; ++i)
                            visitNode(node.childCategories[i]);
                    }
                };
                visitNode(_this.rootFinancialCategory);
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to retrieve data, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
            });
        };
        BudgetToolController.prototype.onAmountChange = function (row) {
            if (row) {
                var curParent = row.parentRow;
                while (curParent) {
                    curParent.amount = _.reduce(curParent.childRows, function (memo, row) { return memo + row.amount; }, 0);
                    curParent = curParent.parentRow;
                }
            }
            var incomeParentRow = _.find(this.curBudget.budgetRows, function (r) { return !r.parentRow && r.category.displayName === "Income"; });
            this.totalIncome = incomeParentRow.amount;
            var expenseLeafRows = this.curBudget.budgetRows.filter(function (r) { return !r.parentRow && r.category.displayName !== "Income"; });
            this.totalExpense = _.reduce(expenseLeafRows, function (memo, r) { return memo + r.amount; }, 0);
        };
        BudgetToolController.prototype.createBudget = function () {
            var _this = this;
            this.curBudget = new BudgetLocalEdit();
            this.curBudget.budgetName = "Unnamed";
            this.curBudget.budgetRows = [];
            var amountColumn = this.expenseGridOptions.columnDefs.find(function (c) { return c.field === "amount"; });
            amountColumn.cellTemplate = this.EditAmountTemplate;
            var visitNode = function (curNode, depth, isIncomeRow) {
                var hasChildren = curNode.childCategories != null && curNode.childCategories.length > 0;
                isIncomeRow = (depth === 0 && curNode.displayName === "Income") || isIncomeRow;
                if (curNode.displayName) {
                    var offsetDepth = isIncomeRow ? depth - 1 : depth;
                    var labelPrefix = BudgetToolController.catToTreePrefix(offsetDepth);
                    var parentRow = _.find(_this.curBudget.budgetRows, function (r) { return r.category.financialCategoryId === curNode.parentFinancialCategoryId; });
                    var newRow = {
                        financialCategoryId: curNode.financialCategoryId,
                        categoryDisplayName: curNode.displayName,
                        categoryTreeLabel: labelPrefix + curNode.displayName,
                        amount: 0,
                        $$treeLevel: offsetDepth,
                        hasChildren: hasChildren,
                        category: curNode,
                        parentRow: parentRow,
                        childRows: [],
                        isIncomeRow: isIncomeRow,
                        parentBudgetRowId: null
                    };
                    if (parentRow)
                        newRow.parentRow.childRows.push(newRow);
                    _this.curBudget.budgetRows.push(newRow);
                }
                if (!hasChildren)
                    return;
                for (var i = 0; i < curNode.childCategories.length; ++i) {
                    visitNode(curNode.childCategories[i], depth + 1, isIncomeRow);
                }
            };
            visitNode(this.rootFinancialCategory, -1, false); // Start at negative so the root's children have a level of 0
            this.refreshGridsFromCurBudget();
        };
        BudgetToolController.catToTreePrefix = function (treeDepth) {
            if (treeDepth < 1)
                return "";
            var labelPrefix = Array((treeDepth - 1) * 4).join(String.fromCharCode(160)) + "|--";
            return labelPrefix;
        };
        BudgetToolController.prototype.loadBudget = function (budget) {
            var _this = this;
            var getCatDepth = function (category, depth) {
                if (depth === void 0) { depth = 0; }
                if (!category)
                    return depth;
                if (category.parentFinancialCategoryId && _this.financialCategoryMap.has(category.parentFinancialCategoryId))
                    return getCatDepth(_this.financialCategoryMap.get(category.parentFinancialCategoryId), depth + 1);
                return depth;
            };
            var amountColumn = this.expenseGridOptions.columnDefs.find(function (c) { return c.field === "amount"; });
            if (budget.finalizedDateUtc)
                amountColumn.cellTemplate = null;
            else
                amountColumn.cellTemplate = this.EditAmountTemplate;
            var editRows;
            editRows = budget.rows.map(function (r) {
                var cat = _this.financialCategoryMap.has(r.financialCategoryId) ? _this.financialCategoryMap.get(r.financialCategoryId) : undefined;
                var treeDepth = getCatDepth(cat);
                var offsetDepth = treeDepth; //isIncomeRow ? depth - 1 : depth;
                var labelPrefix = BudgetToolController.catToTreePrefix(offsetDepth);
                var editRow = {
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
            var _loop_1 = function (i) {
                var curRow = editRows[i];
                var curCat = curRow.category;
                if (curCat) {
                    curRow.hasChildren = curCat.childCategories && curCat.childCategories.length > 0;
                    if (curRow.hasChildren) {
                        var childCatIds_1 = _.map(curCat.childCategories, function (c) { return c.financialCategoryId; });
                        curRow.childRows = editRows.filter(function (r) { return childCatIds_1.indexOf(r.financialCategoryId) >= 0; });
                    }
                    if (curCat.parentFinancialCategoryId)
                        curRow.parentRow = _.find(editRows, function (r) { return r.financialCategoryId === curCat.parentFinancialCategoryId; });
                }
                else if (curRow.parentBudgetRowId) {
                    curRow.parentRow = _.find(editRows, function (r) { return r.budgetRowId === curRow.parentBudgetRowId; });
                    curRow.childRows = editRows.filter(function (r) { return r.parentBudgetRowId === curRow.budgetRowId; });
                }
            };
            // Fill in children and set the parent
            for (var i = 0; i < editRows.length; ++i) {
                _loop_1(i);
            }
            var incomeCategory = this.rootFinancialCategory.childCategories.find(function (c) { return c.displayName === "Income"; });
            var incomeRoot = editRows.find(function (r) { return r.financialCategoryId === incomeCategory.financialCategoryId; });
            var markIncome = function (row) {
                row.isIncomeRow = true;
                --row.$$treeLevel; // We don't show the top level
                row.categoryTreeLabel = BudgetToolController.catToTreePrefix(row.$$treeLevel) + row.categoryDisplayName;
                if (row.childRows)
                    row.childRows.forEach(function (r) { return markIncome(r); });
            };
            markIncome(incomeRoot);
            this.curBudget = {
                budgetId: budget.budgetId,
                budgetName: budget.budgetName,
                budgetRows: editRows
            };
            this.refreshGridsFromCurBudget();
        };
        BudgetToolController.prototype.refreshGridsFromCurBudget = function () {
            var _this = this;
            var incomeRows = this.curBudget.budgetRows.filter(function (r) { return r.$$treeLevel >= 0 && r.isIncomeRow; });
            this.incomeGridOptions.data = incomeRows;
            this.incomeGridOptions.minRowsToShow = incomeRows.length;
            this.incomeGridOptions.virtualizationThreshold = incomeRows.length;
            var expenseRows = this.curBudget.budgetRows.filter(function (r) { return !r.isIncomeRow; });
            this.expenseGridOptions.data = expenseRows;
            this.expenseGridOptions.minRowsToShow = expenseRows.length;
            this.expenseGridOptions.virtualizationThreshold = expenseRows.length;
            window.setTimeout(function () {
                _this.expenseGridApi.treeBase.expandAllRows();
                _this.incomeGridApi.treeBase.expandAllRows();
            }, 50);
            this.onAmountChange(null);
        };
        BudgetToolController.prototype.closeBudget = function () {
            this.curBudget = null;
            this.selectedBudget = null;
            this.incomeGridOptions.data = [];
            this.expenseGridOptions.data = [];
        };
        BudgetToolController.prototype.saveBudget = function () {
            if (this.curBudget.budgetId)
                this.saveExistingBudget();
            else
                this.saveNewBudget();
        };
        BudgetToolController.prototype.saveExistingBudget = function (refreshAfterSave) {
            var _this = this;
            if (refreshAfterSave === void 0) { refreshAfterSave = true; }
            this.isLoading = true;
            // Create a slimmed down version
            var putData = {
                budgetId: this.curBudget.budgetId,
                budgetName: this.curBudget.budgetName,
                rows: _.map(this.curBudget.budgetRows, function (r) {
                    return {
                        budgetRowId: r.budgetRowId,
                        amount: r.amount,
                        financialCategoryId: r.financialCategoryId
                    };
                })
            };
            return this.$http.put("/api/Budget", putData).then(function (httpResponse) {
                _this.isLoading = false;
                if (refreshAfterSave)
                    _this.completeRefresh();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
                return Promise.reject(null);
            });
        };
        BudgetToolController.prototype.saveNewBudget = function () {
            var _this = this;
            this.isLoading = true;
            // Create a slimmed down version
            var postData = {
                budgetId: 0,
                budgetName: this.curBudget.budgetName,
                rows: _.map(this.curBudget.budgetRows, function (r) {
                    return {
                        budgetRowId: 0,
                        amount: r.amount,
                        financialCategoryId: r.financialCategoryId
                    };
                })
            };
            this.$http.post("/api/Budget", postData).then(function (httpResponse) {
                _this.isLoading = false;
                _this.completeRefresh();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to retrieve data, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user selects a budget to view
         */
        BudgetToolController.prototype.onBudgetSelected = function () {
            if (!this.selectedBudget)
                return;
            this.loadBudget(this.selectedBudget);
        };
        /**
         * Occurs when the user presses the button to delete a budget
         */
        BudgetToolController.prototype.deleteBudget = function () {
            var _this = this;
            if (!confirm("Are you sure you want to deleted this budget?"))
                return;
            this.isLoading = true;
            this.$http.delete("/api/Budget/" + this.curBudget.budgetId).then(function (httpResponse) {
                _this.isLoading = false;
                _this.completeRefresh();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to delete, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
            });
        };
        BudgetToolController.prototype.completeRefresh = function () {
            this.curBudget = null;
            this.selectedBudget = null;
            this.incomeGridOptions.data = [];
            this.expenseGridOptions.data = [];
            this.refreshData();
        };
        BudgetToolController.prototype.finalizeBudget = function () {
            var _this = this;
            if (!confirm("This makes the budget permanently read-only. Are you sure you want to finalize the budget?"))
                return;
            this.isLoading = true;
            this.saveExistingBudget(false).then(function () {
                _this.$http.put("/api/Budget/Finalize/" + _this.curBudget.budgetId, null).then(function (httpResponse) {
                    _this.isLoading = false;
                    _this.curBudget = null;
                    _this.selectedBudget = null;
                    _this.incomeGridOptions.data = [];
                    _this.expenseGridOptions.data = [];
                    _this.completeRefresh();
                }, function (httpResponse) {
                    _this.isLoading = false;
                    alert("Failed to finalize, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
                });
            }, function (httpResponse) {
                _this.isLoading = false;
            });
        };
        BudgetToolController.prototype.exportToCsv = function () {
            // We're sort of hacking the CSV logic to work for budgets since there's not a clear
            // column / row structure to it
            var csvColumns = [
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
            var expenseRows = this.expenseGridOptions.data;
            var incomeRows = this.incomeGridOptions.data;
            var maxRows = Math.max(expenseRows.length, incomeRows.length);
            var csvRows = [];
            csvRows.push(new BudgetCsvRow("Budget:", this.curBudget.budgetName));
            csvRows.push(new BudgetCsvRow());
            csvRows.push(new BudgetCsvRow("Expenses", "", "", "Income"));
            var getSlashedLabel = function (row) {
                if (!row.parentRow)
                    return row.categoryDisplayName;
                return getSlashedLabel(row.parentRow) + "/" + row.categoryDisplayName;
            };
            for (var i = 0; i < maxRows; ++i) {
                var newRow = new BudgetCsvRow();
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
            var csvDataString = Ally.createCsvString(csvRows, csvColumns, false);
            var fileName = "budget-" + Ally.HtmlUtil2.removeNonAlphanumeric(this.curBudget.budgetName) + ".csv";
            Ally.HtmlUtil2.downloadCsv(csvDataString, fileName);
        };
        BudgetToolController.$inject = ["$http", "appCacheService", "uiGridConstants", "$rootScope"];
        return BudgetToolController;
    }());
    Ally.BudgetToolController = BudgetToolController;
    var BudgetCsvRow = /** @class */ (function () {
        function BudgetCsvRow(c0, c1, c2, c3, c4) {
            if (c0 === void 0) { c0 = ""; }
            if (c1 === void 0) { c1 = ""; }
            if (c2 === void 0) { c2 = ""; }
            if (c3 === void 0) { c3 = ""; }
            if (c4 === void 0) { c4 = ""; }
            this.col0 = c0;
            this.col1 = c1;
            this.col2 = c2;
            this.col3 = c3;
            this.col4 = c4;
        }
        return BudgetCsvRow;
    }());
    var SaveBudgetRow = /** @class */ (function () {
        function SaveBudgetRow() {
        }
        return SaveBudgetRow;
    }());
    var SaveBudget = /** @class */ (function () {
        function SaveBudget() {
        }
        return SaveBudget;
    }());
    var BudgetPageInfo = /** @class */ (function () {
        function BudgetPageInfo() {
        }
        return BudgetPageInfo;
    }());
    var BudgetDto = /** @class */ (function () {
        function BudgetDto() {
        }
        return BudgetDto;
    }());
    var BudgetLocalEdit = /** @class */ (function () {
        function BudgetLocalEdit() {
        }
        return BudgetLocalEdit;
    }());
    var BudgetRowDto = /** @class */ (function () {
        function BudgetRowDto() {
        }
        return BudgetRowDto;
    }());
    var BudgetRowLocalEdit = /** @class */ (function (_super) {
        __extends(BudgetRowLocalEdit, _super);
        function BudgetRowLocalEdit() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return BudgetRowLocalEdit;
    }(BudgetRowDto));
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
    var FinancialCategoryManagerController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function FinancialCategoryManagerController($http, siteInfo, appCacheService, $rootScope) {
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
        FinancialCategoryManagerController.prototype.$onInit = function () {
            this.refresh();
        };
        /**
         * Load all of the data on the page
         */
        FinancialCategoryManagerController.prototype.refresh = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Ledger/FinancialCategories").then(function (httpResponse) {
                _this.isLoading = false;
                _this.rootFinancialCategory = httpResponse.data;
                _this.flatCategoryList = [];
                var visitNode = function (curNode, depth) {
                    if (curNode.displayName) {
                        var labelPrefix = "";
                        if (depth > 1)
                            labelPrefix = Array((depth - 2) * 4).join(String.fromCharCode(160)) + "|--";
                        curNode.dropDownLabel = labelPrefix + curNode.displayName;
                        _this.flatCategoryList.push(curNode);
                    }
                    if (curNode.childCategories == null || curNode.childCategories.length == 0)
                        return;
                    for (var i = 0; i < curNode.childCategories.length; ++i) {
                        visitNode(curNode.childCategories[i], depth + 1);
                    }
                };
                visitNode(_this.rootFinancialCategory, 0);
                _this.selectedCategory = _this.flatCategoryList[0];
                if (_this.preselectById) {
                    var preselectCat = _this.flatCategoryList.filter(function (c) { return c.financialCategoryId === _this.preselectById; });
                    if (preselectCat && preselectCat.length > 0)
                        _this.selectedCategory = preselectCat[0];
                    _this.preselectById = null;
                }
                _this.onCategorySelected();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to retrieve data, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
        * Occurs when a category is selected from the list
        */
        FinancialCategoryManagerController.prototype.onCategorySelected = function () {
            this.editName = this.selectedCategory ? this.selectedCategory.displayName : "";
        };
        /**
        * Called when the user wants to close the manager
        */
        FinancialCategoryManagerController.prototype.closeManager = function () {
            this.onClosed({ didMakeChanges: this.didMakeChanges });
        };
        /**
        * Display the section to add a new category
        */
        FinancialCategoryManagerController.prototype.showNewCategoryArea = function () {
            this.shouldShowNewCategoryArea = true;
            this.shouldShowDeleteCategoryArea = false;
            this.newName = "";
            this.newCategoryParent = null;
        };
        /**
        * Update a category name
        */
        FinancialCategoryManagerController.prototype.updateCategoryName = function () {
            var _this = this;
            if (!this.editName) {
                alert("Please enter a name");
                return;
            }
            this.isLoading = true;
            var putUri = "/api/Ledger/FinancialCategory/UpdateName/" + this.selectedCategory.financialCategoryId + "?newName=" + encodeURIComponent(this.editName);
            this.$http.put(putUri, null).then(function (httpResponse) {
                _this.isLoading = false;
                _this.didMakeChanges = true;
                _this.shouldShowNewCategoryArea = false;
                _this.newName = "";
                _this.preselectById = _this.selectedCategory.financialCategoryId;
                _this.refresh();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to update: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
        * Called when the user wants to add a new category
        */
        FinancialCategoryManagerController.prototype.saveNewCategory = function () {
            var _this = this;
            if (!this.newName) {
                alert("Please enter a name");
                return;
            }
            this.isLoading = true;
            var postUri = "/api/Ledger/FinancialCategory/Add?name=" + encodeURIComponent(this.newName);
            if (this.newCategoryParent)
                postUri += "&parentCategoryId=" + this.newCategoryParent.financialCategoryId;
            this.$http.post(postUri, null).then(function (httpResponse) {
                _this.isLoading = false;
                _this.didMakeChanges = true;
                _this.preselectById = httpResponse.data;
                _this.shouldShowNewCategoryArea = false;
                _this.refresh();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
        * Called when the user wants to remove a category
        */
        FinancialCategoryManagerController.prototype.deleteCategory = function () {
            var _this = this;
            if (this.selectedCategory.displayName === "Income") {
                alert("You cannot delete the income category");
                return;
            }
            this.isLoading = true;
            var deleteUri = "/api/Ledger/FinancialCategory/" + this.selectedCategory.financialCategoryId;
            if (this.deleteCategoryRessignTo)
                deleteUri += "?reassignToCategoryId=" + this.deleteCategoryRessignTo.financialCategoryId;
            this.$http.delete(deleteUri).then(function (httpResponse) {
                _this.isLoading = false;
                _this.didMakeChanges = true;
                _this.shouldShowDeleteCategoryArea = false;
                _this.refresh();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to delete: " + httpResponse.data.exceptionMessage);
            });
        };
        FinancialCategoryManagerController.$inject = ["$http", "SiteInfo", "appCacheService", "$rootScope"];
        return FinancialCategoryManagerController;
    }());
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
    var FinancialParentController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function FinancialParentController($http, siteInfo, $routeParams, $cacheFactory, $rootScope) {
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
        FinancialParentController.prototype.$onInit = function () {
            if (HtmlUtil.isValidString(this.$routeParams.viewName))
                this.selectedView = this.$routeParams.viewName;
            else
                this.selectedView = "OnlinePayments";
        };
        FinancialParentController.$inject = ["$http", "SiteInfo", "$routeParams", "$cacheFactory", "$rootScope"];
        return FinancialParentController;
    }());
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
    var FinancialReportsController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function FinancialReportsController($http, siteInfo, appCacheService, $location) {
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
        FinancialReportsController.prototype.$onInit = function () {
            if (window.sessionStorage.getItem("financialReport_startDate"))
                this.startDate = new Date(parseInt(window.sessionStorage.getItem("financialReport_startDate")));
            if (!this.startDate || isNaN(this.startDate.getTime()))
                this.startDate = moment().subtract(1, 'year').toDate();
            if (window.sessionStorage.getItem("financialReport_endDate"))
                this.endDate = new Date(parseInt(window.sessionStorage.getItem("financialReport_endDate")));
            if (!this.endDate || isNaN(this.endDate.getTime()))
                this.endDate = moment().toDate();
            var innerThis = this;
            this.doughnutChartOptions = {
                onClick: function (event) {
                    var elements = this.getElementAtEvent(event);
                    if (elements.length) {
                        var elem = elements[0];
                        var isExpenseChart = event.target.id === "expense-category-chart";
                        var categoryId = void 0;
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
        };
        /**
        * Retrieve the report data
        */
        FinancialReportsController.prototype.refreshData = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/FinancialReports/ChartData?startDate=" + encodeURIComponent(this.startDate.toISOString()) + "&endDate=" + encodeURIComponent(this.endDate.toISOString())).then(function (httpResponse) {
                _this.isLoading = false;
                _this.reportData = httpResponse.data;
                _this.reportData.incomeByCategory = _.sortBy(_this.reportData.incomeByCategory, function (e) { return e.amount; });
                _this.incomeByCategoryData = _.map(_this.reportData.incomeByCategory, function (e) { return Math.abs(e.amount); });
                _this.incomeByCategoryLabels = _.map(_this.reportData.incomeByCategory, function (e) { return e.parentFinancialCategoryName; });
                _this.incomeByCategoryCatIds = _.map(_this.reportData.incomeByCategory, function (e) { return e.parentFinancialCategoryId; });
                _this.reportData.expenseByCategory = _.sortBy(_this.reportData.expenseByCategory, function (e) { return e.amount; });
                _this.expenseByCategoryData = _.map(_this.reportData.expenseByCategory, function (e) { return Math.abs(e.amount); });
                _this.expenseByCategoryLabels = _.map(_this.reportData.expenseByCategory, function (e) { return e.parentFinancialCategoryName; });
                _this.expenseByCategoryCatIds = _.map(_this.reportData.expenseByCategory, function (e) { return e.parentFinancialCategoryId; });
                window.sessionStorage.setItem("financialReport_startDate", _this.startDate.getTime().toString());
                window.sessionStorage.setItem("financialReport_endDate", _this.endDate.getTime().toString());
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to retrieve report data: " + httpResponse.data.exceptionMessage);
            });
        };
        FinancialReportsController.prototype.onByCategoryClickChart = function (points, event) {
            if (!points || points.length === 0)
                return;
            var isExpenseChart = points[0]._chart.canvas.id === "expense-category-chart";
            console.log("Clicked", isExpenseChart, points[0], event);
            if (isExpenseChart) {
                console.log("Clicked on expense category: " + this.expenseByCategoryLabels[points[0]._index]);
            }
            else
                console.log("Clicked on income category: " + this.incomeByCategoryLabels[points[0]._index]);
        };
        FinancialReportsController.$inject = ["$http", "SiteInfo", "appCacheService", "$location"];
        return FinancialReportsController;
    }());
    Ally.FinancialReportsController = FinancialReportsController;
    var DoughnutChartEntry = /** @class */ (function () {
        function DoughnutChartEntry() {
        }
        return DoughnutChartEntry;
    }());
    var BalanceEntry = /** @class */ (function () {
        function BalanceEntry() {
        }
        return BalanceEntry;
    }());
    var AccountBalanceMonth = /** @class */ (function () {
        function AccountBalanceMonth() {
        }
        return AccountBalanceMonth;
    }());
    var FinancialReportData = /** @class */ (function () {
        function FinancialReportData() {
        }
        return FinancialReportData;
    }());
})(Ally || (Ally = {}));
CA.angularApp.component("financialReports", {
    templateUrl: "/ngApp/chtn/manager/financial/financial-reports.html",
    controller: Ally.FinancialReportsController
});

var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Ally;
(function (Ally) {
    /**
     * The controller for the page to track group spending
     */
    var LedgerController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function LedgerController($http, siteInfo, appCacheService, uiGridConstants, $rootScope, $timeout) {
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
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        LedgerController.prototype.$onInit = function () {
            var _this = this;
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            this.isSuperAdmin = this.siteInfo.userInfo.isAdmin;
            this.homeName = AppConfig.homeName || "Unit";
            this.shouldShowOwnerFinanceTxn = this.siteInfo.privateSiteInfo.shouldShowOwnerFinanceTxn;
            // A callback to calculate the sum for a column across all ui-grid pages, not just the visible page
            var addAmountOverAllRows = function () {
                var allGridRows = _this.ledgerGridApi.grid.rows;
                var visibleGridRows = allGridRows.filter(function (r) { return r.visible && r.entity && !isNaN(r.entity.amount); });
                var sum = 0;
                visibleGridRows.forEach(function (item) { return sum += (item.entity.amount || 0); });
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
                        { field: 'id', displayName: 'Actions', enableSorting: false, enableCellEdit: false, enableFiltering: false, width: 90, cellTemplate: '<div class="ui-grid-cell-contents text-center"><img style="cursor: pointer;" data-ng-click="grid.appScope.$ctrl.editEntry( row.entity )" src="/assets/images/pencil-active.png" /><span class="close-x mt-0 mb-0 ml-3" data-ng-click="grid.appScope.$ctrl.deleteEntry( row.entity )" style="color: red;">&times;</span></div>' }
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
                    enableRowHeaderSelection: false,
                    onRegisterApi: function (gridApi) {
                        _this.ledgerGridApi = gridApi;
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                        gridApi.edit.on.afterCellEdit(_this.$rootScope, function (rowEntity, colDef, newValue, oldValue) {
                            console.log('edited row amount:' + rowEntity.amount + ' Column', colDef, ' newValue:' + newValue + ' oldValue:' + oldValue);
                            // Ignore no changes
                            if (oldValue === newValue)
                                return;
                            if (colDef.field === "categoryDisplayName" && rowEntity.financialCategoryId === _this.ManageCategoriesDropId) {
                                rowEntity.financialCategoryId = oldValue;
                                _this.shouldShowCategoryEditModal = true;
                                return;
                            }
                            var catEntry = _this.flatCategoryList.find(function (c) { return c.financialCategoryId === rowEntity.financialCategoryId; });
                            rowEntity.categoryDisplayName = catEntry ? catEntry.displayName : null;
                            var unitEntry = _this.unitListEntries.find(function (c) { return c.unitId === rowEntity.associatedUnitId; });
                            rowEntity.unitGridLabel = unitEntry ? unitEntry.unitWithOwnerLast : null;
                            _this.$http.put("/api/Ledger/UpdateEntry", rowEntity).then(function () { return _this.regenerateDateDonutChart(); });
                            //vm.msg.lastCellEdited = 'edited row id:' + rowEntity.id + ' Column:' + colDef.name + ' newValue:' + newValue + ' oldValue:' + oldValue;
                            //$scope.$apply();
                        });
                        gridApi.core.on.filterChanged(_this.$rootScope, function () {
                            var hasFilter = false;
                            //let s = "";
                            for (var i = 0; i < gridApi.grid.columns.length; ++i) {
                                if (gridApi.grid.columns[i].filters && gridApi.grid.columns[i].filters.length > 0 && gridApi.grid.columns[i].filters[0].term) {
                                    hasFilter = true;
                                    break;
                                }
                                //    s += `|${gridApi.grid.columns[i].displayName}=${gridApi.grid.columns[i].filters[0].condition}`;
                            }
                            console.log("filterChanged", "hasFilter", hasFilter);
                            var needsFilterUpdate = _this.hasActiveTxGridColFilter !== hasFilter;
                            _this.hasActiveTxGridColFilter = hasFilter;
                            if (needsFilterUpdate)
                                _this.updateLocalData();
                        });
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
            var preselectStartMillis = parseInt(this.appCacheService.getAndClear("ledger_preselect_start"));
            if (!isNaN(preselectStartMillis)) {
                // Let the page finish loading then update the filter or else the date filter will overwrite our date
                window.setTimeout(function () {
                    _this.filter.startDate = new Date(preselectStartMillis);
                    var preselectEndMillis = parseInt(_this.appCacheService.getAndClear("ledger_preselect_end"));
                    _this.filter.endDate = new Date(preselectEndMillis);
                    _this.preselectCategoryId = parseInt(_this.appCacheService.getAndClear("ledger_preselect_categoryId"));
                    if (isNaN(_this.preselectCategoryId))
                        _this.preselectCategoryId = undefined;
                    _this.fullRefresh();
                }, 100);
            }
            else {
                this.filter.startDate = moment().subtract(30, 'days').toDate();
                this.filter.endDate = moment().toDate();
                this.fullRefresh();
            }
            this.$timeout(function () { return _this.loadImportHistory(); }, 1500);
            this.$http.get("/api/Ledger/OwnerTxNote").then(function (httpResponse) { return _this.ownerFinanceTxNote = httpResponse.data.ownerFinanceTxNote; }, function (httpResponse) { return console.log("Failed to load owner tx note: " + httpResponse.data.exceptionMessage); });
        };
        /**
         * Load all of the data on the page
         */
        LedgerController.prototype.fullRefresh = function () {
            var _this = this;
            this.isLoading = true;
            var getUri = "/api/Ledger/PageInfo?startDate=" + encodeURIComponent(this.filter.startDate.toISOString()) + "&endDate=" + encodeURIComponent(this.filter.endDate.toISOString());
            if (this.filter.description.length > 3)
                getUri += "&descriptionSearch=" + encodeURIComponent(this.filter.description);
            this.$http.get(getUri).then(function (httpResponse) {
                _this.isLoading = false;
                var pageInfo = httpResponse.data;
                _this.ledgerAccounts = pageInfo.accounts;
                _.forEach(_this.ledgerAccounts, function (a) { return a.shouldShowInGrid = true; });
                // Hide the account column if there's only one account
                var accountColumn = _this.ledgerGridOptions.columnDefs.find(function (c) { return c.field === "accountName"; });
                if (accountColumn)
                    accountColumn.visible = _this.ledgerAccounts.length > 1;
                // Add only the first account needing login for a Plaid item
                var accountsNeedingLogin = _this.ledgerAccounts.filter(function (a) { return a.plaidNeedsRelogin; });
                _this.accountsNeedingLogin = [];
                var _loop_1 = function (i) {
                    if (!_this.accountsNeedingLogin.find(function (a) { return a.plaidItemId === accountsNeedingLogin[i].plaidItemId; }))
                        _this.accountsNeedingLogin.push(accountsNeedingLogin[i]);
                };
                for (var i = 0; i < accountsNeedingLogin.length; ++i) {
                    _loop_1(i);
                }
                accountColumn.filter.selectOptions = _this.ledgerAccounts.map(function (a) { return { value: a.accountName, label: a.accountName }; });
                _this.hasPlaidAccounts = _.any(_this.ledgerAccounts, function (a) { return a.syncType === 'plaid'; });
                _this.allEntries = pageInfo.entries;
                _this.pendingGridOptions.data = pageInfo.pendingEntries;
                _this.flatCategoryList = [];
                var visitNode = function (curNode, depth) {
                    if (curNode.displayName) {
                        var labelPrefix = "";
                        if (depth > 1)
                            labelPrefix = Array((depth - 2) * 4).join(String.fromCharCode(160)) + "|--";
                        curNode.dropDownLabel = labelPrefix + curNode.displayName;
                        _this.flatCategoryList.push(curNode);
                    }
                    if (curNode.childCategories == null || curNode.childCategories.length == 0)
                        return;
                    for (var i = 0; i < curNode.childCategories.length; ++i) {
                        visitNode(curNode.childCategories[i], depth + 1);
                    }
                };
                visitNode(pageInfo.rootFinancialCategory, 0);
                _this.updateLocalData();
                var uiGridCategoryDropDown = [];
                uiGridCategoryDropDown.push({ id: null, value: "" });
                for (var i = 0; i < _this.flatCategoryList.length; ++i) {
                    uiGridCategoryDropDown.push({ id: _this.flatCategoryList[i].financialCategoryId, value: _this.flatCategoryList[i].dropDownLabel });
                }
                uiGridCategoryDropDown.push({ id: _this.ManageCategoriesDropId, value: "Manage Categories..." });
                var categoryColumn = _this.ledgerGridOptions.columnDefs.find(function (c) { return c.field === "categoryDisplayName"; });
                categoryColumn.editDropdownOptionsArray = uiGridCategoryDropDown;
                if (_this.preselectCategoryId) {
                    window.setTimeout(function () {
                        var selectedCatEntry = _this.flatCategoryList.filter(function (c) { return c.financialCategoryId === _this.preselectCategoryId; })[0];
                        _this.preselectCategoryId = undefined;
                        var categoryColumn = _this.ledgerGridApi.grid.columns.filter(function (c) { return c.displayName === "Category"; })[0];
                        categoryColumn.filters[0] = {
                            term: selectedCatEntry.displayName
                        };
                    }, 100);
                }
                _this.unitListEntries = pageInfo.unitListEntries;
                // Populate the object used for quick editing the home
                var uiGridUnitDropDown = [];
                uiGridUnitDropDown.push({ id: null, value: "" });
                for (var i = 0; i < _this.unitListEntries.length; ++i)
                    uiGridUnitDropDown.push({ id: _this.unitListEntries[i].unitId, value: _this.unitListEntries[i].unitWithOwnerLast });
                var unitColumn = _this.ledgerGridOptions.columnDefs.find(function (c) { return c.field === "unitGridLabel"; });
                unitColumn.editDropdownOptionsArray = uiGridUnitDropDown;
                _this.populateGridUnitLabels(_this.allEntries);
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to retrieve data, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Populate the text that is shown for the unit column and split for category
         */
        LedgerController.prototype.populateGridUnitLabels = function (entries) {
            var _this = this;
            if (!entries || entries.length === 0)
                return;
            // Populate the unit names for the grid
            _.each(entries, function (entry) {
                if (entry.isSplit)
                    entry.categoryDisplayName = "(split)";
                if (entry.associatedUnitId) {
                    var unitListEntry = _this.unitListEntries.find(function (u) { return u.unitId === entry.associatedUnitId; });
                    if (unitListEntry)
                        entry.unitGridLabel = unitListEntry.unitWithOwnerLast;
                    else
                        entry.unitGridLabel = "UNK";
                }
                // Populate split entries
                if (entry.splitEntries && entry.splitEntries.length > 0)
                    _this.populateGridUnitLabels(entry.splitEntries);
            });
        };
        LedgerController.prototype.refreshEntries = function () {
            var _this = this;
            this.isLoadingEntries = true;
            var getUri = "/api/Ledger/PageInfo?startDate=" + encodeURIComponent(this.filter.startDate.toISOString()) + "&endDate=" + encodeURIComponent(this.filter.endDate.toISOString());
            if (this.filter.description.length > 3)
                getUri += "&descriptionSearch=" + encodeURIComponent(this.filter.description);
            this.$http.get(getUri).then(function (httpResponse) {
                _this.isLoadingEntries = false;
                _this.allEntries = httpResponse.data.entries;
                _this.updateLocalData();
                _this.populateGridUnitLabels(_this.allEntries);
            });
        };
        LedgerController.prototype.updateLocalData = function () {
            var enabledAccountIds = this.ledgerAccounts.filter(function (a) { return a.shouldShowInGrid; }).map(function (a) { return a.ledgerAccountId; });
            var filteredList = this.allEntries.filter(function (e) { return enabledAccountIds.indexOf(e.ledgerAccountId) > -1; });
            // If the user is filtering on a column, we need to break out split transactions
            if (this.hasActiveTxGridColFilter) {
                // Go through all transactions and for splits, remove the parent, and add the child splits to the main list
                var newFilteredList = [];
                for (var i = 0; i < filteredList.length; ++i) {
                    var isSplit = filteredList[i].isSplit && filteredList[i].splitEntries && filteredList[i].splitEntries.length > 0;
                    if (!isSplit) {
                        newFilteredList.push(filteredList[i]);
                        continue;
                    }
                    // Remove the parent entry
                    var parentEntry = filteredList[i];
                    for (var splitIndex = 0; splitIndex < parentEntry.splitEntries.length; ++splitIndex) {
                        // Clone the split so we can prefix the label with split
                        var curSplitCopy = _.clone(parentEntry.splitEntries[splitIndex]);
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
        };
        /**
         * Rebuild the data needed to populate the donut chart
         */
        LedgerController.prototype.regenerateDateDonutChart = function () {
            var _this = this;
            this.spendingChartData = null;
            if (this.allEntries.length === 0)
                return;
            var getParentCategoryId = function (financialCategoryId) {
                var cat = _this.flatCategoryList.filter(function (c) { return c.financialCategoryId === financialCategoryId; });
                if (cat && cat.length > 0) {
                    if (!cat[0].parentFinancialCategoryId)
                        return cat[0].financialCategoryId;
                    return getParentCategoryId(cat[0].parentFinancialCategoryId);
                }
                return 0;
            };
            var flattenedTransactions = [];
            for (var i = 0; i < this.allEntries.length; ++i) {
                if (this.allEntries[i].isSplit) {
                    for (var _i = 0, _a = this.allEntries[i].splitEntries; _i < _a.length; _i++) {
                        var e = _a[_i];
                        flattenedTransactions.push(e);
                    }
                }
                else
                    flattenedTransactions.push(this.allEntries[i]);
            }
            var entriesByParentCat = _.groupBy(flattenedTransactions, function (e) { return getParentCategoryId(e.financialCategoryId); });
            var spendingChartEntries = [];
            // Go through all the parent categories and sum the transactions under them
            var parentCatIds = _.keys(entriesByParentCat);
            var _loop_2 = function (i) {
                var parentCategoryId = +parentCatIds[i];
                var entries = entriesByParentCat[parentCategoryId];
                var cats = this_1.flatCategoryList.filter(function (c) { return c.financialCategoryId === +parentCategoryId; });
                var parentCategory = null;
                if (cats && cats.length > 0)
                    parentCategory = cats[0];
                var sumTotal = 0;
                for (var entryIndex = 0; entryIndex < entries.length; ++entryIndex)
                    sumTotal += entries[entryIndex].amount;
                var newEntry = {
                    parentCategoryId: parentCategoryId,
                    parentCategoryDisplayName: parentCategory ? parentCategory.displayName : "Uncategorized",
                    sumTotal: Math.abs(sumTotal),
                    numLedgerEntries: entries.length
                };
                spendingChartEntries.push(newEntry);
            };
            var this_1 = this;
            for (var i = 0; i < parentCatIds.length; ++i) {
                _loop_2(i);
            }
            spendingChartEntries = _.sortBy(spendingChartEntries, function (e) { return e.sumTotal; }).reverse();
            this.spendingChartData = [];
            this.spendingChartLabels = [];
            for (var i = 0; i < spendingChartEntries.length; ++i) {
                this.spendingChartData.push(spendingChartEntries[i].sumTotal);
                this.spendingChartLabels.push(spendingChartEntries[i].parentCategoryDisplayName);
            }
            // Force redraw
            this.showDonut = false;
            this.$timeout(function () { return _this.showDonut = true; }, 100);
        };
        /**
         * Occurs when the user clicks the button to add a new transaction
         */
        LedgerController.prototype.onAddTransaction = function () {
            if (this.ledgerAccounts.length === 0) {
                alert("Please add at least one account first");
                return;
            }
            this.editingTransaction = new LedgerEntry();
            this.editingTransaction.ledgerAccountId = this.ledgerAccounts[0].ledgerAccountId;
            this.editingTransaction.transactionDate = new Date();
            window.setTimeout(function () { return document.getElementById("transaction-amount-input").focus(); }, 50);
        };
        LedgerController.prototype.completePlaidSync = function (accessToken, updatePlaidItemId, selectedAccountIds) {
            var _this = this;
            this.isLoading = true;
            this.plaidSuccessProgressMsg = "Contacting Plaid server for selected account information";
            var postData = {
                accessToken: accessToken,
                updatePlaidItemId: updatePlaidItemId,
                selectedAccountIds: selectedAccountIds
            };
            var postUri = updatePlaidItemId ? "/api/Plaid/UpdateAccessToken" : "/api/Plaid/ProcessNewAccessToken";
            this.$http.post(postUri, postData).then(function (httpResponse) {
                _this.isLoading = false;
                _this.plaidSuccessProgressMsg = "Account information successfully retrieved";
                _this.newPlaidAccounts = httpResponse.data;
                if (updatePlaidItemId)
                    window.location.reload();
            }, function (httpResponse) {
                _this.isLoading = false;
                _this.plaidSuccessProgressMsg = "Failed to retrieve account information from Plaid: " + httpResponse.data.exceptionMessage;
                alert("Failed to link: " + httpResponse.data.exceptionMessage);
            });
        };
        LedgerController.prototype.showAddAccount = function () {
            this.createAccountInfo = new CreateAccountInfo();
            this.createAccountInfo.type = null; // Explicitly set to simplify UI logic
        };
        LedgerController.prototype.updateAccountLink = function (ledgerAccount) {
            //this.createAccountInfo = new CreateAccountInfo();
            //this.createAccountInfo.type = null; // Explicitly set to simplify UI logic
            var _this = this;
            if (!this.isPremiumPlanActive)
                return;
            this.isLoading = true;
            this.$http.get("/api/Plaid/UpdateLinkToken/" + ledgerAccount.plaidItemId).then(function (httpResponse) {
                _this.isLoading = false;
                var newLinkToken = httpResponse.data;
                if (!newLinkToken) {
                    alert("Something went wrong on the server. Please contact support.");
                    return;
                }
                var plaidConfig = {
                    token: newLinkToken,
                    onSuccess: function (public_token, metadata) {
                        console.log("Plaid update onSuccess");
                        _this.completePlaidSync(public_token, ledgerAccount.plaidItemId, null);
                    },
                    onLoad: function () { },
                    onExit: function (err, metadata) { console.log("onExit.err", err, metadata); },
                    onEvent: function (eventName, metadata) { console.log("onEvent.eventName", eventName, metadata); },
                    receivedRedirectUri: null,
                };
                _this.plaidHandler = Plaid.create(plaidConfig);
                _this.plaidHandler.open();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to update account link: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user wants to edit a transaction
         */
        LedgerController.prototype.editEntry = function (entry) {
            this.editingTransaction = _.clone(entry);
            if (this.editingTransaction.isSplit)
                this.onSplitAmountChange();
        };
        /**
         * Occurs when the user wants to delete a transaction
         */
        LedgerController.prototype.deleteEntry = function (entry) {
            var _this = this;
            if (!confirm("Are you sure you want to delete this entry? Deletion is permanent."))
                return;
            this.isLoading = true;
            this.$http.delete("/api/Ledger/DeleteEntry/" + entry.ledgerEntryId).then(function (httpResponse) {
                _this.isLoading = false;
                _this.editAccount = null;
                _this.editingTransaction = null;
                _this.fullRefresh();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to delete: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user clicks the button to save transaction details
         */
        LedgerController.prototype.onSaveEntry = function () {
            var _this = this;
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
                for (var i = 0; i < this.editingTransaction.splitEntries.length; ++i) {
                    if (!this.editingTransaction.splitEntries[i].amount) {
                        alert("A non-zero amount is required for all split transaction entries");
                        return;
                    }
                }
            }
            this.isLoading = true;
            var onSave = function (httpResponse) {
                _this.isLoading = false;
                _this.editingTransaction = null;
                _this.refreshEntries();
            };
            var onError = function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            };
            if (this.editingTransaction.ledgerEntryId)
                this.$http.put("/api/Ledger/UpdateEntry", this.editingTransaction).then(onSave, onError);
            else
                this.$http.post("/api/Ledger/NewManualEntry", this.editingTransaction).then(onSave, onError);
        };
        /**
         * Occurs when the user clicks the button to add a new account
         */
        LedgerController.prototype.onSaveNewAccount = function () {
            var _this = this;
            this.isLoading = true;
            var onSave = function (httpResponse) {
                _this.isLoading = false;
                _this.createAccountInfo = null;
                _this.fullRefresh();
            };
            var onError = function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            };
            this.$http.post("/api/Ledger/NewBankAccount", this.createAccountInfo).then(onSave, onError);
        };
        LedgerController.prototype.startPlaidFlow = function () {
            var _this = this;
            if (this.createAccountInfo)
                this.createAccountInfo.type = 'plaid';
            if (!this.isPremiumPlanActive)
                return;
            this.isLoading = true;
            this.$http.get("/api/Plaid/NewLinkToken").then(function (httpResponse) {
                _this.isLoading = false;
                if (!httpResponse.data)
                    return;
                var plaidConfig = {
                    token: httpResponse.data,
                    onSuccess: function (public_token, metadata) {
                        console.log("Plaid onSuccess", metadata);
                        var selectedAccountIds = null;
                        if (metadata && metadata.accounts && metadata.accounts.length > 0)
                            selectedAccountIds = metadata.accounts.map(function (a) { return a.id; });
                        _this.completePlaidSync(public_token, null, selectedAccountIds);
                    },
                    onLoad: function () { },
                    onExit: function (err, metadata) { console.log("update onExit.err", err, metadata); },
                    onEvent: function (eventName, metadata) { console.log("update onEvent.eventName", eventName, metadata); },
                    receivedRedirectUri: null,
                };
                _this.plaidHandler = Plaid.create(plaidConfig);
                _this.plaidHandler.open();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to start Plaid sign-up: " + httpResponse.data.exceptionMessage);
                _this.closeAccountAndReload();
            });
        };
        LedgerController.prototype.openEditAccountModal = function (account) {
            this.editAccount = _.clone(account);
        };
        LedgerController.prototype.closeAccountAndReload = function () {
            this.createAccountInfo = null;
            this.fullRefresh();
        };
        LedgerController.prototype.onEditAccount = function () {
            var _this = this;
            var putUri = "/api/Ledger/UpdateAccount/" + this.editAccount.ledgerAccountId + "?newName=" + encodeURIComponent(this.editAccount.accountName) + "&newType=" + encodeURIComponent(this.editAccount.accountType);
            this.isLoading = true;
            this.$http.put(putUri, null).then(function (httpResponse) {
                _this.isLoading = false;
                _this.editAccount = null;
                _this.fullRefresh();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to update: " + httpResponse.data.exceptionMessage);
            });
        };
        LedgerController.prototype.syncPlaidAccounts = function (shouldSyncRecent) {
            var _this = this;
            this.isLoading = true;
            var getUri = shouldSyncRecent ? "/api/Plaid/SyncRecentTransactions" : "/api/Plaid/SyncTwoYearTransactions";
            this.$http.get(getUri).then(function (httpResponse) {
                _this.isLoading = false;
                _this.refreshEntries();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to sync: " + httpResponse.data.exceptionMessage);
                if (httpResponse.data.exceptionMessage && httpResponse.data.exceptionMessage.indexOf("login credentials") > -1)
                    window.location.reload();
            });
        };
        LedgerController.prototype.onFilterDescriptionChange = function () {
            if (this.filter.description.length > 2 || this.filter.description.length == 0)
                this.refreshEntries();
        };
        LedgerController.prototype.onEditTransactionCategoryChange = function () {
        };
        LedgerController.prototype.onCategoryManagerClosed = function (didMakeChanges) {
            this.shouldShowCategoryEditModal = false;
            if (didMakeChanges)
                this.fullRefresh();
        };
        LedgerController.prototype.onDeleteAccount = function () {
            var _this = this;
            if (!confirm("Are you sure you want to remove this account?"))
                return;
            this.isLoading = true;
            this.$http.delete("/api/Ledger/DeleteAccount/" + this.editAccount.ledgerAccountId).then(function (httpResponse) {
                _this.isLoading = false;
                _this.editAccount = null;
                _this.fullRefresh();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to delete: " + httpResponse.data.exceptionMessage);
            });
        };
        LedgerController.prototype.splitTransaction = function () {
            if (!this.editingTransaction.splitEntries)
                this.editingTransaction.splitEntries = [];
            this.editingTransaction.splitEntries.push(new LedgerEntry());
            this.editingTransaction.isSplit = true;
        };
        LedgerController.prototype.onSplitAmountChange = function () {
            this.splitAmountTotal = this.editingTransaction.splitEntries.reduce(function (sum, e) { return sum + e.amount; }, 0);
            var roundedSplit = Math.round(this.splitAmountTotal * 100);
            var roundedTotal = Math.round(this.editingTransaction.amount * 100);
            this.isSplitAmountEqual = roundedSplit === roundedTotal;
        };
        LedgerController.prototype.removeSplit = function (splitEntry) {
            this.editingTransaction.splitEntries.splice(this.editingTransaction.splitEntries.indexOf(splitEntry), 1);
            this.onSplitAmountChange();
        };
        LedgerController.prototype.openImportFilePicker = function () {
            document.getElementById('importTransactionFileInput').click();
        };
        LedgerController.prototype.openImportModal = function () {
            this.shouldShowImportModal = true;
            this.previewImportGridOptions.data = null;
        };
        LedgerController.prototype.onImportFileSelected = function (event) {
            var _this = this;
            var importTransactionsFile = event.target.files[0];
            if (!importTransactionsFile)
                return;
            this.isLoading = true;
            this.importTxNotes = "";
            var formData = new FormData();
            formData.append("importFile", importTransactionsFile);
            var postHeaders = {
                headers: { "Content-Type": undefined } // Need to remove this to avoid the JSON body assumption by the server
            };
            var fileElem = document.getElementById("importTransactionFileInput");
            this.$http.post("/api/Ledger/PreviewImport", formData, postHeaders).then(function (httpResponse) {
                _this.isLoading = false;
                // Clear the value so the user can re-select the same file and trigger this handler
                fileElem.value = "";
                _this.previewImportGridOptions.data = httpResponse.data;
                var _loop_3 = function (i) {
                    var curEntry = _this.previewImportGridOptions.data[i];
                    curEntry.ledgerEntryId = i;
                    var unit = _this.unitListEntries.find(function (u) { return u.unitId === curEntry.associatedUnitId; });
                    if (unit)
                        curEntry.unitGridLabel = unit.unitWithOwnerLast;
                    var catEntry = _this.flatCategoryList.find(function (c) { return c.financialCategoryId === curEntry.financialCategoryId; });
                    curEntry.categoryDisplayName = catEntry ? catEntry.displayName : null;
                };
                for (var i = 0; i < _this.previewImportGridOptions.data.length; ++i) {
                    _loop_3(i);
                }
                _this.previewImportGridOptions.minRowsToShow = httpResponse.data.length;
                _this.previewImportGridOptions.virtualizationThreshold = _this.previewImportGridOptions.minRowsToShow;
            }, function (httpResponse) {
                _this.isLoading = false;
                // Clear the value so the user can re-select the same file and trigger this handler
                fileElem.value = "";
                alert("Failed to upload document: " + httpResponse.data.exceptionMessage);
            });
        };
        LedgerController.prototype.selectManualAccount = function () {
            this.createAccountInfo.type = "manual";
            setTimeout(function () { return document.getElementById("new-account-name-field").focus(); }, 100);
        };
        /** Bulk import transactions */
        LedgerController.prototype.importPreviewTransactions = function () {
            var _this = this;
            if (!this.bulkImportAccountId) {
                alert("Please select the account into which these transactions will be imported using the drop-down above the grid.");
                return;
            }
            this.isLoading = true;
            var entries = this.previewImportGridOptions.data;
            for (var i = 0; i < entries.length; ++i)
                entries[i].ledgerAccountId = this.bulkImportAccountId;
            var postTx = {
                notes: this.importTxNotes,
                entries: this.previewImportGridOptions.data
            };
            this.$http.post("/api/Ledger/BulkImport", postTx).then(function (httpResponse) {
                _this.previewImportGridOptions.data = null;
                _this.shouldShowImportModal = false;
                _this.isLoading = false;
                _this.refreshEntries();
                _this.$timeout(function () { return _this.loadImportHistory(); }, 1000);
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to import: " + httpResponse.data.exceptionMessage);
            });
        };
        LedgerController.prototype.removeImportRow = function (entry) {
            // For import rows, the row index is stored in ledgerEntryId
            var importEntries = this.previewImportGridOptions.data;
            importEntries.splice(entry.ledgerEntryId, 1);
            for (var i = 0; i < importEntries.length; ++i)
                importEntries[i].ledgerEntryId = i;
        };
        /** Export the transactions list as a CSV */
        LedgerController.prototype.exportTransactionsCsv = function () {
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
                },
                {
                    headerText: "Account",
                    fieldName: "accountName"
                }
            ];
            var csvDataString = Ally.createCsvString(this.ledgerGridOptions.data, csvColumns);
            Ally.HtmlUtil2.downloadCsv(csvDataString, "Transactions.csv");
        };
        /** Occurs when the user changes the setting to share transactions with owners */
        LedgerController.prototype.onShowOwnerTxnsChange = function () {
            var _this = this;
            this.isLoading = true;
            var putUri = "/api/Ledger/SetOwnerTxnViewing?shouldAllow=" + this.shouldShowOwnerFinanceTxn;
            this.$http.put(putUri, null).then(function (httpResponse) {
                _this.isLoading = false;
                _this.siteInfo.privateSiteInfo.shouldShowOwnerFinanceTxn = _this.shouldShowOwnerFinanceTxn;
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to change setting: " + httpResponse.data.exceptionMessage);
            });
        };
        /** Retrieve the financial transaction import history */
        LedgerController.prototype.loadImportHistory = function () {
            var _this = this;
            this.$http.get("/api/Ledger/TxImportHistory").then(function (httpResponse) {
                _this.importHistoryEntries = httpResponse.data;
            }, function (httpResponse) {
                console.log("Failed to retrieve tx history: " + httpResponse.data.exceptionMessage);
            });
        };
        LedgerController.prototype.saveOwnerTxNote = function () {
            var _this = this;
            var putData = {
                ownerFinanceTxNote: this.ownerFinanceTxNote
            };
            this.isLoading = true;
            this.$http.put("/api/Ledger/OwnerTxNote", putData).then(function () {
                _this.isLoading = false;
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to save note: " + httpResponse.data.exceptionMessage);
            });
        };
        LedgerController.$inject = ["$http", "SiteInfo", "appCacheService", "uiGridConstants", "$rootScope", "$timeout"];
        return LedgerController;
    }());
    Ally.LedgerController = LedgerController;
    var UiGridRow = /** @class */ (function () {
        function UiGridRow() {
        }
        return UiGridRow;
    }());
    Ally.UiGridRow = UiGridRow;
    var CategoryOption = /** @class */ (function () {
        function CategoryOption() {
        }
        return CategoryOption;
    }());
    var CreateAccountInfo = /** @class */ (function () {
        function CreateAccountInfo() {
        }
        return CreateAccountInfo;
    }());
    var SpendingChartEntry = /** @class */ (function () {
        function SpendingChartEntry() {
        }
        return SpendingChartEntry;
    }());
    var LedgerAccount = /** @class */ (function () {
        function LedgerAccount() {
        }
        return LedgerAccount;
    }());
    var LedgerEntry = /** @class */ (function () {
        function LedgerEntry() {
        }
        return LedgerEntry;
    }());
    Ally.LedgerEntry = LedgerEntry;
    var LedgerListEntry = /** @class */ (function (_super) {
        __extends(LedgerListEntry, _super);
        function LedgerListEntry() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return LedgerListEntry;
    }(LedgerEntry));
    var LedgerPageInfo = /** @class */ (function () {
        function LedgerPageInfo() {
        }
        return LedgerPageInfo;
    }());
    var BasicUnitListEntry = /** @class */ (function () {
        function BasicUnitListEntry() {
        }
        return BasicUnitListEntry;
    }());
    var FilterCriteria = /** @class */ (function () {
        function FilterCriteria() {
            this.description = "";
            this.startDate = new Date();
            this.endDate = new Date();
            this.category = "";
        }
        return FilterCriteria;
    }());
    var FinancialCategory = /** @class */ (function () {
        function FinancialCategory() {
        }
        return FinancialCategory;
    }());
    Ally.FinancialCategory = FinancialCategory;
    var FinancialTxImportHistoryEntry = /** @class */ (function () {
        function FinancialTxImportHistoryEntry() {
        }
        return FinancialTxImportHistoryEntry;
    }());
})(Ally || (Ally = {}));
CA.angularApp.component("ledger", {
    templateUrl: "/ngApp/chtn/manager/financial/ledger.html",
    controller: Ally.LedgerController
});

var Ally;
(function (Ally) {
    var ElectronicPayment = /** @class */ (function () {
        function ElectronicPayment() {
        }
        return ElectronicPayment;
    }());
    Ally.ElectronicPayment = ElectronicPayment;
    var PaymentPageInfo = /** @class */ (function () {
        function PaymentPageInfo() {
        }
        return PaymentPageInfo;
    }());
    var UpdateAssessmentInfo = /** @class */ (function () {
        function UpdateAssessmentInfo() {
        }
        return UpdateAssessmentInfo;
    }());
    /**
     * The controller for the page to view online payment information
     */
    var ManagePaymentsController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function ManagePaymentsController($http, siteInfo, appCacheService, uiGridConstants, $scope) {
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
            this.isDwollaIavDone = false;
            this.shouldShowMicroDepositModal = false;
            this.shouldShowPlaidTestSignUpButton = false;
            this.shouldShowCustomInstructions = false;
            this.HistoryPageSize = 50;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ManagePaymentsController.prototype.$onInit = function () {
            this.homeName = AppConfig.homeName;
            this.highlightWePayCheckoutId = this.appCacheService.getAndClear("hwpid");
            var tempPayId = this.appCacheService.getAndClear("onpayid");
            if (HtmlUtil.isNumericString(tempPayId))
                this.highlightPaymentsInfoId = parseInt(tempPayId);
            this.isAssessmentTrackingEnabled = this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled;
            // Allow a single HOA to try WePay
            var wePayExemptGroupShortNames = ["tigertrace", "7mthope", "qa"];
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
                        { field: 'id', displayName: '', width: 140, cellTemplate: '<div class="ui-grid-cell-contents"><span class="text-link" data-ng-if="row.entity.wePayCheckoutId" data-ng-click="grid.appScope.$ctrl.showWePayCheckoutInfo( row.entity.wePayCheckoutId )">WePay Details</span><span class="text-link" data-ng-if="row.entity.payPalCheckoutId" data-ng-click="grid.appScope.$ctrl.showPayPalCheckoutInfo( row.entity.payPalCheckoutId )">PayPal Details</span><span class="text-link" data-ng-if="row.entity.paragonReferenceNumber" data-ng-click="grid.appScope.$ctrl.showParagonCheckoutInfo( row.entity.paragonReferenceNumber )">Paragon Details</span><span class="text-link" data-ng-if="row.entity.dwollaTransferUri" data-ng-click="grid.appScope.$ctrl.showDwollaTransferInfo( row.entity )">Dwolla Details</span></div>' }
                    ],
                    enableSorting: true,
                    enableHorizontalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableColumnMenus: false,
                    enablePaginationControls: true,
                    paginationPageSize: this.HistoryPageSize,
                    paginationPageSizes: [this.HistoryPageSize],
                    enableRowHeaderSelection: false,
                    onRegisterApi: function () {
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
            // Populate the page
            this.refresh();
        };
        /**
         * Load all of the data on the page
         */
        ManagePaymentsController.prototype.refresh = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/OnlinePayment").then(function (httpResponse) {
                _this.isLoading = false;
                _this.hasLoadedPage = true;
                _this.hasAssessments = _this.siteInfo.privateSiteInfo.hasAssessments;
                if (_this.hasAssessments) {
                    var assessmentFrequencyInfo = PeriodicPaymentFrequencies.find(function (ppf) { return ppf.id === _this.siteInfo.privateSiteInfo.assessmentFrequency; });
                    if (assessmentFrequencyInfo)
                        _this.assessmentFrequencyLabel = assessmentFrequencyInfo.name;
                }
                var data = httpResponse.data;
                _this.paymentInfo = data;
                _this.paymentsGridOptions.data = _this.paymentInfo.electronicPayments;
                _this.paymentsGridOptions.enablePaginationControls = _this.paymentInfo.electronicPayments.length > _this.HistoryPageSize;
                _this.paymentsGridOptions.minRowsToShow = Math.min(_this.paymentInfo.electronicPayments.length, _this.HistoryPageSize);
                _this.paymentsGridOptions.virtualizationThreshold = _this.paymentsGridOptions.minRowsToShow;
                if (Ally.HtmlUtil2.isValidString(_this.paymentInfo.customFinancialInstructions))
                    _this.showCustomInstructionsEditor();
                _this.lateFeeInfo =
                    {
                        lateFeeDayOfMonth: data.lateFeeDayOfMonth,
                        lateFeeAmount: data.lateFeeAmount
                    };
                // Prepend flat fee late fees with a $
                if (!HtmlUtil.isNullOrWhitespace(_this.lateFeeInfo.lateFeeAmount)
                    && !HtmlUtil.endsWith(_this.lateFeeInfo.lateFeeAmount, "%"))
                    _this.lateFeeInfo.lateFeeAmount = "$" + _this.lateFeeInfo.lateFeeAmount;
                _this.refreshUnits();
                _this.updateTestFee();
                // If we were sent here to pre-open a transaction's details
                if (_this.highlightPaymentsInfoId) {
                    var payment = data.electronicPayments.filter(function (e) { return e.paymentId === _this.highlightPaymentsInfoId; });
                    if (payment && payment.length > 0) {
                        if (payment[0].wePayCheckoutId)
                            _this.showWePayCheckoutInfo(payment[0].wePayCheckoutId);
                        else if (payment[0].paragonReferenceNumber)
                            _this.showParagonCheckoutInfo(payment[0].paragonReferenceNumber);
                        else if (payment[0].dwollaTransferUri)
                            _this.showDwollaTransferInfo(payment[0]);
                    }
                    _this.highlightPaymentsInfoId = null;
                }
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to load page, please contact technical support. (" + httpResponse.data.exceptionMessage + ")");
            });
        };
        /**
         * Load all of the units on the page
         */
        ManagePaymentsController.prototype.refreshUnits = function () {
            var _this = this;
            // Load the units and assessments
            this.isLoadingUnits = true;
            this.$http.get("/api/Unit").then(function (httpResponse) {
                _this.units = httpResponse.data;
                _.each(_this.units, function (u) { if (u.adjustedAssessment === null) {
                    u.adjustedAssessment = u.assessment;
                } });
                _this.assessmentSum = _.reduce(_this.units, function (memo, u) { return memo + u.assessment; }, 0);
                _this.adjustedAssessmentSum = _.reduce(_this.units, function (memo, u) { return memo + (u.adjustedAssessment || 0); }, 0);
                _this.isLoadingUnits = false;
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to load units, please contact technical support. (" + httpResponse.data.exceptionMessage + ")");
            });
        };
        ManagePaymentsController.prototype.getLateFeeDateSuper = function () {
            var dayOfMonth = this.lateFeeInfo.lateFeeDayOfMonth;
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
            var onesDigit = dayOfMonth % 10;
            if (onesDigit === 1)
                return "st";
            else if (onesDigit === 2)
                return "nd";
            if (onesDigit === 3)
                return "rd";
            return "th";
        };
        /**
         * Allow the user to update their PayPal client ID and client secret
         */
        ManagePaymentsController.prototype.updatePayPalCredentials = function () {
            this.isUpdatingPayPalCredentials = true;
            //this.payPalSignUpClientId = this.paymentInfo.payPalClientId;
            this.payPalSignUpClientSecret = "";
            this.payPalSignUpErrorMessage = "";
        };
        /**
         * Save the allow setting
         */
        ManagePaymentsController.prototype.saveAllowSetting = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.put("/api/OnlinePayment/SaveAllow?allowPayments=" + this.paymentInfo.areOnlinePaymentsAllowed, null).then(function () {
                window.location.reload();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user clicks the button to save the PayPal client ID and secret
         */
        ManagePaymentsController.prototype.enablePayPal = function () {
            var _this = this;
            this.isLoading = true;
            this.payPalSignUpErrorMessage = null;
            var enableInfo = {
                clientId: this.payPalSignUpClientId,
                clientSecret: this.payPalSignUpClientSecret
            };
            this.$http.put("/api/OnlinePayment/EnablePayPal", enableInfo).then(function () {
                _this.payPalSignUpClientId = "";
                _this.payPalSignUpClientSecret = "";
                window.location.reload();
            }, function (httpResponse) {
                _this.isLoading = false;
                _this.payPalSignUpErrorMessage = httpResponse.data.exceptionMessage;
            });
        };
        ManagePaymentsController.prototype.selectText = function () {
            // HACK: Timeout needed to fire after x-editable's activation
            setTimeout(function () {
                $('.editable-input').select();
            }, 50);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user presses the button to send money from the WePay account to their
        // association's account
        ///////////////////////////////////////////////////////////////////////////////////////////////
        ManagePaymentsController.prototype.onWithdrawalClick = function () {
            var _this = this;
            this.errorMessage = "";
            this.$http.get("/api/OnlinePayment/PerformAction?action=withdrawal").then(function (httpResponse) {
                var withdrawalInfo = httpResponse.data;
                if (withdrawalInfo.redirectUri)
                    window.location.href = withdrawalInfo.redirectUri;
                else
                    _this.errorMessage = withdrawalInfo.message;
            }, function (httpResponse) {
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    _this.errorMessage = httpResponse.data.exceptionMessage;
            });
        };
        /**
         * Occurs when the user presses the button to edit a unit's assessment
         */
        ManagePaymentsController.prototype.onUnitAssessmentChanged = function (unit) {
            var _this = this;
            this.isLoadingUnits = true;
            if (typeof (unit.adjustedAssessment) === "string")
                unit.adjustedAssessment = parseFloat(unit.adjustedAssessment);
            var updateInfo = {
                unitId: unit.unitId,
                assessment: unit.adjustedAssessment,
                assessmentNote: unit.adjustedAssessmentReason
            };
            this.$http.put("/api/Unit/UpdateAssessment", updateInfo).then(function () {
                _this.isLoadingUnits = false;
                _this.assessmentSum = _.reduce(_this.units, function (memo, u) { return memo + u.assessment; }, 0);
                _this.adjustedAssessmentSum = _.reduce(_this.units, function (memo, u) { return memo + (u.adjustedAssessment || 0); }, 0);
            }, function (response) {
                alert("Failed to update: " + response.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user presses the button to set all units to the assessment
         */
        ManagePaymentsController.prototype.setAllUnitAssessments = function () {
            var _this = this;
            if (!this.setAllAssessmentAmount || isNaN(this.setAllAssessmentAmount) || this.setAllAssessmentAmount < 0) {
                alert("Enter a valid assessment amount");
                return;
            }
            this.isLoadingUnits = true;
            var updateInfo = {
                unitId: -1,
                assessment: this.setAllAssessmentAmount,
                assessmentNote: null
            };
            this.$http.put("/api/Unit/SetAllAssessments", updateInfo).then(function () {
                _this.isLoadingUnits = false;
                _this.refreshUnits();
            }, function (response) {
                alert("Failed to update: " + response.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user changes who covers the WePay transaction fee
         */
        ManagePaymentsController.prototype.onChangeFeePayerInfo = function (payTypeUpdated) {
            var _this = this;
            // See if any users have auto-pay setup for this payment type
            var needsFullRefresh = false;
            var needsReloadOfPage = false;
            if (this.paymentInfo.usersWithAutoPay && this.paymentInfo.usersWithAutoPay.length > 0) {
                var AchDBString_1 = "ACH";
                var CreditDBString_1 = "Credit Card";
                var usersAffected = [];
                if (payTypeUpdated === "ach")
                    usersAffected = _.where(this.paymentInfo.usersWithAutoPay, function (u) { return u.wePayAutoPayFundingSource === AchDBString_1; });
                else if (payTypeUpdated === "cc")
                    usersAffected = _.where(this.paymentInfo.usersWithAutoPay, function (u) { return u.wePayAutoPayFundingSource === CreditDBString_1; });
                // If users will be affected then display an error message to the user
                if (usersAffected.length > 0) {
                    // We need to reload the site if the user is affected so the home page updates that
                    // the user does not have auto-pay enabled
                    needsReloadOfPage = _.find(usersAffected, function (u) { return u.userId === _this.siteInfo.userInfo.userId; }) !== undefined;
                    needsFullRefresh = true;
                    var message_1 = "Adjusting the fee payer type will cause the follow units to have their auto-pay canceled and they will be informed by email:\n";
                    _.each(usersAffected, function (u) { return message_1 += u.ownerName + "\n"; });
                    message_1 += "\nDo you want to continue?";
                    if (!confirm(message_1)) {
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
            this.$http.put("/api/OnlinePayment", this.paymentInfo).then(function () {
                if (needsReloadOfPage)
                    window.location.reload();
                else {
                    _this.isLoadingPayment = false;
                    // We need to refresh our data so we don't pop-up the auto-pay cancel warning again
                    if (needsFullRefresh)
                        _this.refresh();
                }
            }, function (response) {
                alert("Failed to update: " + response.data.exceptionMessage);
            });
            this.updateTestFee();
        };
        /**
         * Used to show the sum of all assessments
         */
        ManagePaymentsController.prototype.getSignUpSum = function () {
            return _.reduce(this.signUpInfo.units, function (memo, u) { return memo + parseFloat(u.assessment); }, 0);
        };
        /**
         * Occurs when the user clicks the link to indicate if they have regular assessments or not
         */
        ManagePaymentsController.prototype.signUp_HasAssessments = function (hasAssessments) {
            var _this = this;
            this.signUpInfo.hasAssessments = hasAssessments;
            if (this.signUpInfo.hasAssessments) {
                this.signUpInfo.units = [];
                _.each(this.units, function (u) {
                    _this.signUpInfo.units.push({ unitId: u.unitId, name: u.name, assessment: 0 });
                });
                this.signUpStep = 1;
            }
            else {
                this.signUp_Commit();
            }
        };
        /**
         * Handle the assessment frequency
         */
        ManagePaymentsController.prototype.signUp_AssessmentFrequency = function (frequencyIndex) {
            this.signUpInfo.frequencyIndex = frequencyIndex;
            this.signUpInfo.assessmentFrequency = PeriodicPaymentFrequencies[frequencyIndex].name;
            this.signUpStep = 2;
        };
        /**
         * Save the late fee info
         */
        ManagePaymentsController.prototype.saveLateFee = function () {
            var _this = this;
            this.isLoadingLateFee = true;
            this.$http.put("/api/OnlinePayment/LateFee?dayOfMonth=" + this.lateFeeInfo.lateFeeDayOfMonth + "&lateFeeAmount=" + this.lateFeeInfo.lateFeeAmount, null).then(function (httpResponse) {
                _this.isLoadingLateFee = false;
                var lateFeeResult = httpResponse.data;
                if (!lateFeeResult || !lateFeeResult.feeAmount || lateFeeResult.feeType === 0) {
                    if (_this.lateFeeInfo.lateFeeDayOfMonth !== "")
                        alert("Failed to save the late fee. Please enter only a number for the date (ex. 5) and an amount (ex. 12.34) or percent (ex. 5%) for the fee. To disable late fees, clear the date field and hit save.");
                    _this.lateFeeInfo.lateFeeDayOfMonth = "";
                    _this.lateFeeInfo.lateFeeAmount = null;
                }
                else {
                    _this.lateFeeInfo.lateFeeAmount = lateFeeResult.feeAmount;
                    // feeType of 2 is percent, 1 is flat, and 0 is invalid
                    if (lateFeeResult.feeType === 1)
                        _this.lateFeeInfo.lateFeeAmount = "$" + _this.lateFeeInfo.lateFeeAmount;
                    else if (lateFeeResult.feeType === 2)
                        _this.lateFeeInfo.lateFeeAmount = "" + _this.lateFeeInfo.lateFeeAmount + "%";
                }
            }, function (httpResponse) {
                _this.isLoadingLateFee = false;
                var errorMessage = httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to update late fee: " + errorMessage);
            });
        };
        /**
         * Show the PayPal info for a specific transaction
         */
        ManagePaymentsController.prototype.showPayPalCheckoutInfo = function (payPalCheckoutId) {
            var _this = this;
            this.viewingPayPalCheckoutId = payPalCheckoutId;
            if (!this.viewingPayPalCheckoutId)
                return;
            this.isLoadingCheckoutDetails = true;
            this.checkoutInfo = {};
            this.$http.get("/api/OnlinePayment/PayPalCheckoutInfo?checkoutId=" + payPalCheckoutId, { cache: true }).then(function (httpResponse) {
                _this.isLoadingCheckoutDetails = false;
                _this.checkoutInfo = httpResponse.data;
            }, function (httpResponse) {
                _this.isLoadingCheckoutDetails = false;
                alert("Failed to retrieve checkout details: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Show the WePay info for a specific transaction
         */
        ManagePaymentsController.prototype.showWePayCheckoutInfo = function (wePayCheckoutId) {
            var _this = this;
            this.viewingWePayCheckoutId = wePayCheckoutId;
            if (!this.viewingWePayCheckoutId)
                return;
            this.isLoadingCheckoutDetails = true;
            this.checkoutInfo = {};
            this.$http.get("/api/OnlinePayment/WePayCheckoutInfo?checkoutId=" + wePayCheckoutId, { cache: true }).then(function (httpResponse) {
                _this.isLoadingCheckoutDetails = false;
                _this.checkoutInfo = httpResponse.data;
            }, function (httpResponse) {
                _this.isLoadingCheckoutDetails = false;
                alert("Failed to retrieve checkout details: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Show the Paragon info for a specific transaction
         */
        ManagePaymentsController.prototype.showParagonCheckoutInfo = function (paragonReferenceNumber) {
            var _this = this;
            this.viewingParagonReferenceNumber = paragonReferenceNumber;
            if (!this.viewingParagonReferenceNumber)
                return;
            this.isLoadingCheckoutDetails = true;
            this.checkoutInfo = {};
            this.$http.get("/api/OnlinePayment/ParagonCheckoutInfo?paymentReferenceNumber=" + paragonReferenceNumber, { cache: true }).then(function (httpResponse) {
                _this.isLoadingCheckoutDetails = false;
                _this.checkoutInfo = httpResponse.data;
            }, function (httpResponse) {
                _this.isLoadingCheckoutDetails = false;
                alert("Failed to retrieve checkout details: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Show the Dwolla info for a specific transaction
         */
        ManagePaymentsController.prototype.showDwollaTransferInfo = function (paymentEntry) {
            var _this = this;
            this.viewingDwollaEntry = paymentEntry;
            if (!this.viewingDwollaEntry)
                return;
            this.isLoadingCheckoutDetails = true;
            this.checkoutInfo = {};
            this.$http.get("/api/OnlinePayment/DwollaCheckoutInfo/" + paymentEntry.paymentId).then(function (httpResponse) {
                _this.isLoadingCheckoutDetails = false;
                _this.checkoutInfo = httpResponse.data;
            }, function (httpResponse) {
                _this.isLoadingCheckoutDetails = false;
                alert("Failed to retrieve checkout details: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Cancel a Dwolla transfer
         */
        ManagePaymentsController.prototype.cancelDwollaTransfer = function () {
            var _this = this;
            if (!this.viewingDwollaEntry)
                return;
            this.isLoadingCheckoutDetails = true;
            this.checkoutInfo = {};
            this.$http.get("/api/Dwolla/CancelTransfer/" + this.viewingDwollaEntry.paymentId).then(function (httpResponse) {
                _this.isLoadingCheckoutDetails = false;
                _this.checkoutInfo = httpResponse.data;
            }, function (httpResponse) {
                _this.isLoadingCheckoutDetails = false;
                alert("Failed to cancel transfer: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Save the sign-up answers
         */
        ManagePaymentsController.prototype.signUp_Commit = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.post("/api/OnlinePayment/BasicInfo", this.signUpInfo).then(function () {
                // Update the unit assessments
                _this.refreshUnits();
                // Update the assessment flag
                _this.hasAssessments = _this.signUpInfo.hasAssessments;
                _this.siteInfo.privateSiteInfo.hasAssessments = _this.hasAssessments;
                // Refresh the site info to reflect the assessment frequency
                window.location.reload();
            }, function (httpResponse) {
                _this.isLoading = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    _this.errorMessage = httpResponse.data.exceptionMessage;
            });
        };
        /**
         * Allow the admin to clear the WePay access token for testing
         */
        ManagePaymentsController.prototype.updateTestFee = function () {
            var numericAmount = parseFloat(this.testFee.amount);
            if (this.paymentInfo.payerPaysAchFee) {
                this.testFee.achResidentPays = numericAmount + 1.5;
                this.testFee.achAssociationReceives = numericAmount;
            }
            else {
                this.testFee.achResidentPays = numericAmount;
                this.testFee.achAssociationReceives = numericAmount - 1.5;
            }
            var ccFee = 1.3 + (numericAmount * 0.029);
            if (this.paymentInfo.payerPaysCCFee) {
                this.testFee.ccResidentPays = numericAmount + ccFee;
                this.testFee.ccAssociationReceives = numericAmount;
            }
            else {
                this.testFee.ccResidentPays = numericAmount;
                this.testFee.ccAssociationReceives = numericAmount - ccFee;
            }
        };
        /**
         * Allow the admin to clear the WePay access token for testing
         */
        ManagePaymentsController.prototype.clearWePayAccessToken = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/OnlinePayment/ClearWePayAuthToken").then(function () {
                window.location.reload();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to disable WePay: " + httpResponse.data.exceptionMessage);
            });
        };
        ManagePaymentsController.prototype.showDwollaSignUpModal = function () {
            this.shouldShowDwollaAddAccountModal = true;
            window.setTimeout(function () {
                grecaptcha.render("recaptcha-check-elem");
            }, 200);
        };
        /**
         * Start the Dwolla IAV process
         */
        ManagePaymentsController.prototype.startDwollaSignUp = function () {
            var _this = this;
            var recaptchaKey = grecaptcha.getResponse();
            if (HtmlUtil.isNullOrWhitespace(recaptchaKey)) {
                alert("Please complete the reCAPTCHA field");
                return;
            }
            this.shouldShowDwollaModalClose = false;
            this.isDwollaIavDone = false;
            this.isLoading = true;
            var startDwollaIav = function (iavToken) {
                dwolla.configure(Ally.AppConfigInfo.dwollaEnvironmentName);
                dwolla.iav.start(iavToken, {
                    container: 'dwolla-iav-container',
                    stylesheets: [
                        'https://fonts.googleapis.com/css?family=Lato&subset=latin,latin-ext'
                    ],
                    microDeposits: true,
                    fallbackToMicroDeposits: true
                }, function (err, res) {
                    console.log('Error: ' + JSON.stringify(err) + ' -- Response: ' + JSON.stringify(res));
                    if (res && res._links && res._links["funding-source"] && res._links["funding-source"].href) {
                        var fundingSourceUri = res._links["funding-source"].href;
                        // Tell the server
                        _this.$http.put("/api/Dwolla/SetGroupFundingSourceUri", { fundingSourceUri: fundingSourceUri }).then(function () {
                            _this.isDwollaIavDone = true;
                        }, function (response) {
                            _this.isLoading = false;
                            _this.shouldShowDwollaModalClose = true;
                            alert("Failed to complete sign-up: " + response.data.exceptionMessage);
                        });
                    }
                });
            };
            this.$http.get("/api/Dwolla/GroupIavToken?token=" + encodeURIComponent(recaptchaKey)).then(function (httpResponse) {
                _this.isLoading = false;
                _this.dwollaIavToken = httpResponse.data.iavToken;
                startDwollaIav(_this.dwollaIavToken);
            }, function (httpResponse) {
                _this.isLoading = false;
                _this.shouldShowDwollaAddAccountModal = false;
                grecaptcha.reset();
                alert("Failed to start instant account verification: " + httpResponse.data.exceptionMessage);
            });
        };
        ManagePaymentsController.prototype.hideDwollaAddAccountModal = function () {
            this.shouldShowDwollaAddAccountModal = false;
            this.dwollaIavToken = null;
            if (this.isDwollaIavDone) {
                this.isLoading = true;
                window.location.reload();
            }
        };
        /**
         * Disconnect the bank account from Dwolla
         */
        ManagePaymentsController.prototype.disconnectDwolla = function () {
            var _this = this;
            if (!confirm("Are you sure you want to disconnect the bank account? Residents will no longer be able to make payments."))
                return;
            this.isLoading = true;
            this.$http.put("/api/Dwolla/DisconnectGroupFundingSource", null).then(function () {
                window.location.reload();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to disconnect account" + httpResponse.data.exceptionMessage);
            });
        };
        ManagePaymentsController.prototype.showMicroDepositModal = function () {
            this.shouldShowMicroDepositModal = true;
            this.dwollaMicroDepositAmount1String = "0.01";
            this.dwollaMicroDepositAmount2String = "0.01";
        };
        ManagePaymentsController.prototype.submitDwollaMicroDepositAmounts = function () {
            var _this = this;
            this.isLoading = true;
            var postData = {
                amount1String: this.dwollaMicroDepositAmount1String,
                amount2String: this.dwollaMicroDepositAmount2String,
                isForGroup: true
            };
            this.$http.post("/api/Dwolla/VerifyMicroDeposit", postData).then(function () {
                window.location.reload();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to verify: " + httpResponse.data.exceptionMessage);
            });
        };
        ManagePaymentsController.prototype.addDwollaAccountViaPlaid = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.post("/api/Dwolla/SignUpGroupFromPlaid/81", null).then(function () {
                window.location.reload();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to use Plaid account: " + httpResponse.data.exceptionMessage);
            });
        };
        ManagePaymentsController.prototype.showCustomInstructionsEditor = function () {
            var _this = this;
            this.shouldShowCustomInstructions = true;
            window.setTimeout(function () {
                Ally.HtmlUtil2.initTinyMce("tiny-mce-editor", 220, { menubar: false }).then(function (e) {
                    _this.pageContentTinyMce = e;
                    _this.pageContentTinyMce.setContent(_this.paymentInfo.customFinancialInstructions || "");
                    //this.pageContentTinyMce.on( "change", ( e: any ) =>
                    //{
                    //    // Need to wrap this in a $scope.using because this event is invoked by vanilla JS, not Angular
                    //    this.$scope.$apply( () =>
                    //    {
                    //    } );
                    //} );
                });
            }, 25);
        };
        ManagePaymentsController.prototype.saveCustomInstructions = function () {
            var _this = this;
            this.isLoading = true;
            var putBody = {
                newInstructions: this.pageContentTinyMce.getContent()
            };
            this.$http.put("/api/OnlinePayment/UpdateCustomFinancialInstructions", putBody).then(function () {
                _this.isLoading = false;
                if (!putBody.newInstructions)
                    _this.shouldShowCustomInstructions = false;
                // Update the local value
                _this.siteInfo.privateSiteInfo.customFinancialInstructions = putBody.newInstructions;
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to save: " + response.data.exceptionMessage);
            });
        };
        ManagePaymentsController.$inject = ["$http", "SiteInfo", "appCacheService", "uiGridConstants", "$scope"];
        return ManagePaymentsController;
    }());
    Ally.ManagePaymentsController = ManagePaymentsController;
    var ParagonPaymentDetails = /** @class */ (function () {
        function ParagonPaymentDetails() {
        }
        return ParagonPaymentDetails;
    }());
    var DwollaPaymentDetails = /** @class */ (function () {
        function DwollaPaymentDetails() {
        }
        return DwollaPaymentDetails;
    }());
})(Ally || (Ally = {}));
CA.angularApp.component("managePayments", {
    templateUrl: "/ngApp/chtn/manager/financial/manage-payments.html",
    controller: Ally.ManagePaymentsController
});
var PaymentBasicInfoUnitAssessment = /** @class */ (function () {
    function PaymentBasicInfoUnitAssessment() {
    }
    return PaymentBasicInfoUnitAssessment;
}());
var PaymentBasicInfo = /** @class */ (function () {
    function PaymentBasicInfo() {
    }
    return PaymentBasicInfo;
}());

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../../Scripts/typings/underscore/underscore.d.ts" />
/// <reference path="../../Services/html-util.ts" />
var Ally;
(function (Ally) {
    var Committee = /** @class */ (function () {
        function Committee() {
            this.isPrivate = false;
        }
        return Committee;
    }());
    Ally.Committee = Committee;
    /**
     * The controller for the page to add, edit, and delete committees
     */
    var ManageCommitteesController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ManageCommitteesController($http, siteInfo, $cacheFactory) {
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
        ManageCommitteesController.prototype.$onInit = function () {
            this.retrieveCommittees();
        };
        /**
        * Called when the user chooses to deactivate a committee
        */
        ManageCommitteesController.prototype.startEditCommittee = function (committee) {
            this.editCommittee = committee;
        };
        /**
        * Called when the user chooses to deactivate a committee
        */
        ManageCommitteesController.prototype.showCreateModal = function () {
            this.editCommittee = new Committee();
            this.editCommittee.committeeType = "Ongoing";
        };
        /**
        * Called when the user chooses to deactivate a committee
        */
        ManageCommitteesController.prototype.toggleCommitteeActive = function (committee) {
            var _this = this;
            this.isLoading = true;
            var putUri = (committee.deactivationDateUtc ? "/api/Committee/Reactivate/" : "/api/Committee/Deactivate/") + committee.committeeId;
            this.$http.put(putUri, null).then(function () {
                _this.isLoading = false;
                _this.retrieveCommittees();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to retrieve the modify committee: " + response.data.exceptionMessage);
            });
        };
        /**
        * Retrieve the list of available committees
        */
        ManageCommitteesController.prototype.retrieveCommittees = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Committee?includeInactive=true").then(function (response) {
                var committees = response.data;
                _this.isLoading = false;
                _this.activeCommittees = _.filter(committees, function (c) { return !c.deactivationDateUtc; });
                _this.inactiveCommittees = _.filter(committees, function (c) { return !!c.deactivationDateUtc; });
                _this.activeCommittees = _.sortBy(_this.activeCommittees, function (c) { return c.name.toLowerCase(); });
                _this.inactiveCommittees = _.sortBy(_this.inactiveCommittees, function (c) { return c.name.toLowerCase(); });
                // Convert the last login timestamps to local time
                //_.forEach( committees, c => c.creationDateUtc = moment.utc( c.creationDateUtc ).toDate() );
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to retrieve the committee listing: " + response.data.exceptionMessage);
            });
        };
        /**
        * Create a new committee
        */
        ManageCommitteesController.prototype.saveCommittee = function () {
            var _this = this;
            if (HtmlUtil.isNullOrWhitespace(this.editCommittee.name)) {
                alert("Please enter a name for the new committee.");
                return;
            }
            if (!this.editCommittee.committeeType) {
                alert("Please select a type for the new committee.");
                return;
            }
            this.isLoading = true;
            var saveUri = "/api/Committee" + (this.editCommittee.committeeId ? ("/" + this.editCommittee.committeeId.toString()) : "") + "?name=" + encodeURIComponent(this.editCommittee.name) + "&type=" + encodeURIComponent(this.editCommittee.committeeType) + "&isPrivate=" + this.editCommittee.isPrivate.toString();
            var httpFunc = this.editCommittee.committeeId ? this.$http.put : this.$http.post;
            httpFunc(saveUri, null).then(function () {
                _this.isLoading = false;
                _this.editCommittee = null;
                _this.retrieveCommittees();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to save the committee: " + response.data.exceptionMessage);
            });
        };
        ManageCommitteesController.$inject = ["$http", "SiteInfo", "$cacheFactory"];
        return ManageCommitteesController;
    }());
    Ally.ManageCommitteesController = ManageCommitteesController;
})(Ally || (Ally = {}));
CA.angularApp.component("manageCommittees", {
    templateUrl: "/ngApp/chtn/manager/manage-committees.html",
    controller: Ally.ManageCommitteesController
});

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../../Scripts/typings/underscore/underscore.d.ts" />
/// <reference path="../../Services/html-util.ts" />
var Ally;
(function (Ally) {
    /**
     * The controller for the page to add, edit, and delete custom pages
     */
    var ManageCustomPagesController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ManageCustomPagesController($http, siteInfo, $scope) {
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
        ManageCustomPagesController.prototype.$onInit = function () {
            var _this = this;
            this.retrievePages();
            Ally.HtmlUtil2.initTinyMce("tiny-mce-editor", 900).then(function (e) {
                _this.pageContentTinyMce = e;
                _this.pageContentTinyMce.on("change", function (e) {
                    // Need to wrap this in a $scope.using because this event is invoked by vanilla JS, not Angular
                    _this.$scope.$apply(function () {
                        _this.updatePageSizeLabel();
                    });
                });
            });
            this.$http.get("/api/CustomPage/GroupLandingPage").then(function (response) {
                _this.selectedLandingPageId = response.data ? response.data : null;
            }, function (response) {
                console.log("Failed to retrieve current landing page: " + response.data.exceptionMessage);
            });
        };
        /**
         * Update the label under the editor showing the size of the page to download
         */
        ManageCustomPagesController.prototype.updatePageSizeLabel = function () {
            if (!this.pageContentTinyMce)
                return;
            var bodyText = this.pageContentTinyMce.getContent() || "";
            this.pageSizeBytes = bodyText.length;
            this.pageSizeString = (this.pageSizeBytes / 1048576).toFixed(2) + " MB";
            //if( this.pageSizeBytes < 5 * 1024 )
            //    this.pageSizeString = this.pageSizeBytes.toString() + " bytes";
            //else if( this.pageSizeBytes < 1 * 1024 * 1024 )
            //    this.pageSizeString = Math.round( this.pageSizeBytes / 1024 ).toString() + " KB";
            //else
            //    this.pageSizeString = Math.round( this.pageSizeBytes / 1048576 ).toString() + " MB";
        };
        /**
        * Retrieve the list of custom pages
        */
        ManageCustomPagesController.prototype.retrievePages = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/CustomPage/AllPages").then(function (response) {
                _this.isLoading = false;
                _this.allPageListings = response.data;
                _this.menuPageListings = _.clone(response.data);
                var addPage = new CustomPage();
                addPage.customPageId = -5;
                addPage.title = "Add New Page...";
                _this.menuPageListings.push(addPage);
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to retrieve the custom pages: " + response.data.exceptionMessage);
            });
        };
        /**
        * Save the current page
        */
        ManageCustomPagesController.prototype.savePage = function () {
            var _this = this;
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
            var httpFunc = this.editPage.customPageId ? this.$http.put : this.$http.post;
            httpFunc("/api/CustomPage", this.editPage).then(function () {
                _this.isLoading = false;
                _this.selectedPageEntry = null;
                _this.editPage = null;
                _this.pageContentTinyMce.setContent("");
                _this.updatePageSizeLabel();
                _this.retrievePages();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to save the page: " + response.data.exceptionMessage);
            });
        };
        /**
        * Permanently elete the current page
        */
        ManageCustomPagesController.prototype.deletePage = function () {
            var _this = this;
            if (!confirm("Are you sure you want to permanently delete this page? This action CANNOT BE UNDONE."))
                return;
            this.isLoading = true;
            this.$http.delete("/api/CustomPage/" + this.editPage.customPageId).then(function () {
                _this.isLoading = false;
                _this.selectedPageEntry = null;
                _this.editPage = null;
                _this.pageContentTinyMce.setContent("");
                _this.updatePageSizeLabel();
                _this.retrievePages();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to delete the page: " + response.data.exceptionMessage);
            });
        };
        /**
        * Occurs when focus leaves the title input field
        */
        ManageCustomPagesController.prototype.onTitleBlur = function () {
            if (!this.editPage || this.editPage.pageSlug || !this.editPage.title)
                return;
            this.editPage.pageSlug = (this.editPage.title || "").trim();
            this.editPage.pageSlug = this.editPage.pageSlug.replace(/[^0-9a-z- ]/gi, ''); // Remove non-alphanumeric+dash
            this.editPage.pageSlug = this.editPage.pageSlug.replace(/ /g, '-'); // Replace spaces with dashes
        };
        /**
        * Occurs when focus leaves the slug field, sanitizes the slug to be URL-friendly
        */
        ManageCustomPagesController.prototype.onSlugBlur = function () {
            if (!this.editPage)
                return;
            this.editPage.pageSlug = (this.editPage.pageSlug || "").trim();
            this.editPage.pageSlug = this.editPage.pageSlug.replace(/ /g, '-'); // Replace spaces with dashes
        };
        /**
         * Occurs when the user selects a page to edit
         */
        ManageCustomPagesController.prototype.onPageSelected = function () {
            var _this = this;
            if (this.selectedPageEntry.customPageId > 0) {
                this.isLoading = true;
                this.$http.get("/api/CustomPage/" + this.selectedPageEntry.customPageId).then(function (response) {
                    _this.isLoading = false;
                    _this.editPage = response.data;
                    _this.pageContentTinyMce.setContent(_this.editPage.markupHtml);
                    _this.updatePageSizeLabel();
                }, function (response) {
                    _this.isLoading = false;
                    alert("Failed to retrieve custom page: " + response.data.exceptionMessage);
                });
            }
            else {
                this.editPage = new CustomPage();
                this.pageContentTinyMce.setContent("");
                this.updatePageSizeLabel();
            }
        };
        /**
         * Occurs when the user selects a new landing page for the group
         */
        ManageCustomPagesController.prototype.onLandingPageSelected = function () {
            var _this = this;
            var putUri = "/api/CustomPage/SetGroupLandingPage";
            if (this.selectedLandingPageId)
                putUri += "?customPageId=" + this.selectedLandingPageId;
            this.isLoading = true;
            this.$http.put(putUri, null).then(function (response) {
                _this.isLoading = false;
                if (_this.selectedLandingPageId)
                    _this.siteInfo.publicSiteInfo.customLandingPagePath = null;
                else {
                    var selectedPage = _this.allPageListings.find(function (p) { return p.customPageId === _this.selectedLandingPageId; });
                    if (selectedPage)
                        _this.siteInfo.publicSiteInfo.customLandingPagePath = "#!/Page/" + selectedPage.pageSlug;
                }
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to update landing page: " + response.data.exceptionMessage);
            });
        };
        ManageCustomPagesController.$inject = ["$http", "SiteInfo", "$scope"];
        return ManageCustomPagesController;
    }());
    Ally.ManageCustomPagesController = ManageCustomPagesController;
    var CustomPage = /** @class */ (function () {
        function CustomPage() {
        }
        return CustomPage;
    }());
    var PublicCustomPageEntry = /** @class */ (function () {
        function PublicCustomPageEntry() {
        }
        return PublicCustomPageEntry;
    }());
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
    var ManagePollsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ManagePollsController($http, siteInfo, fellowResidents) {
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
        ManagePollsController.prototype.$onInit = function () {
            var _this = this;
            this.isSuperAdmin = this.siteInfo.userInfo.isAdmin;
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            var threeDaysLater = new Date();
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
            this.fellowResidents.getGroupEmailObject().then(function (groupEmails) {
                _this.groupEmails = _.sortBy(groupEmails, function (e) { return e.displayName.toUpperCase(); });
                _this.retrievePolls();
            }, function () { return _this.retrievePolls(); });
        };
        /**
         * Populate the poll data
         */
        ManagePollsController.prototype.retrievePolls = function () {
            var _this = this;
            var AbstainAnswerSortOrder = 101;
            this.isLoading = true;
            this.$http.get("/api/Poll").then(function (httpResponse) {
                _this.pollHistory = httpResponse.data;
                // Convert the date strings to objects
                for (var i = 0; i < _this.pollHistory.length; ++i) {
                    // The date comes down as a string so we need to convert it
                    _this.pollHistory[i].expirationDate = new Date(_this.pollHistory[i].expirationDate);
                    // Remove the abstain answer since it can't be edited, but save the full answer
                    // list for displaying results
                    _this.pollHistory[i].fullResultAnswers = _this.pollHistory[i].answers;
                    _this.pollHistory[i].answers = _.reject(_this.pollHistory[i].answers, function (pa) { return pa.sortOrder === AbstainAnswerSortOrder; });
                }
                _this.isLoading = false;
            });
        };
        /**
         * Add a new answer
         */
        ManagePollsController.prototype.addAnswer = function () {
            var _this = this;
            if (!this.editingItem.answers)
                this.editingItem.answers = [];
            if (this.editingItem.answers.length > 19) {
                alert("You can only have 20 answers maxiumum per poll.");
                return;
            }
            this.editingItem.answers.push(new PollAnswer(""));
            window.setTimeout(function () { return document.getElementById("poll-answer-textbox-" + (_this.editingItem.answers.length - 1)).focus(); }, 100);
        };
        /**
         * Stop editing a poll and reset the form
         */
        ManagePollsController.prototype.cancelEdit = function () {
            this.editingItem = angular.copy(this.defaultPoll);
            this.shouldAllowMultipleAnswers = false;
        };
        /**
         * Occurs when the user presses the button to save a poll
         */
        ManagePollsController.prototype.onSavePoll = function () {
            var _this = this;
            if (this.editingItem === null)
                return;
            this.isLoading = true;
            var onSave = function () {
                _this.isLoading = false;
                _this.editingItem = angular.copy(_this.defaultPoll);
                _this.shouldAllowMultipleAnswers = false;
                _this.retrievePolls();
            };
            var onFailure = function (response) {
                _this.isLoading = false;
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
        };
        /**
         * Occurs when the user wants to edit an existing poll
         */
        ManagePollsController.prototype.onEditItem = function (item) {
            this.editingItem = angular.copy(item);
            window.scrollTo(0, 0);
            this.shouldAllowMultipleAnswers = this.editingItem.maxNumResponses > 1;
        };
        /**
         * Occurs when the user wants to delete a poll
         */
        ManagePollsController.prototype.onDeleteItem = function (item) {
            var _this = this;
            this.isLoading = true;
            this.$http.delete("/api/Poll?pollId=" + item.pollId).then(function () {
                _this.retrievePolls();
            }, function (httpResponse) {
                _this.isLoading = false;
                if (httpResponse.status === 403)
                    alert("You cannot authorized to delete this poll.");
                else
                    alert("Failed to delete: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user wants to view the results for a poll
         */
        ManagePollsController.prototype.onViewResults = function (poll) {
            if (!poll) {
                this.viewingPollResults = null;
                return;
            }
            var chartInfo = Ally.FellowResidentsService.pollReponsesToChart(poll, this.siteInfo);
            poll.chartData = chartInfo.chartData;
            poll.chartLabels = chartInfo.chartLabels;
            // Build the array for the counts to the right of the chart
            poll.answerCounts = [];
            for (var i = 0; i < poll.chartLabels.length; ++i) {
                poll.answerCounts.push({
                    label: poll.chartLabels[i],
                    count: poll.chartData[i]
                });
            }
            this.chartLabels = poll.chartLabels;
            this.chartData = poll.chartData;
            this.viewingPollResults = poll;
        };
        ManagePollsController.prototype.formatVoteGroupName = function (votingGroupShortName) {
            if (!this.groupEmails)
                return votingGroupShortName;
            var emailGroup = this.groupEmails.find(function (g) { return g.recipientTypeName.toLowerCase() === votingGroupShortName; });
            if (!emailGroup)
                return votingGroupShortName;
            return emailGroup.displayName;
        };
        ManagePollsController.prototype.onMultiAnswerChange = function () {
            if (this.shouldAllowMultipleAnswers)
                this.editingItem.maxNumResponses = 2;
            else
                this.editingItem.maxNumResponses = 1;
        };
        ManagePollsController.$inject = ["$http", "SiteInfo", "fellowResidents"];
        return ManagePollsController;
    }());
    Ally.ManagePollsController = ManagePollsController;
    var Poll = /** @class */ (function () {
        function Poll() {
            this.isAnonymous = true;
        }
        return Poll;
    }());
    Ally.Poll = Poll;
    var PollAnswer = /** @class */ (function () {
        function PollAnswer(answerText) {
            this.answerText = answerText;
        }
        return PollAnswer;
    }());
    Ally.PollAnswer = PollAnswer;
    var PollResponse = /** @class */ (function () {
        function PollResponse() {
        }
        return PollResponse;
    }());
    Ally.PollResponse = PollResponse;
})(Ally || (Ally = {}));
CA.angularApp.component("managePolls", {
    templateUrl: "/ngApp/chtn/manager/manage-polls.html",
    controller: Ally.ManagePollsController
});

/// <reference path="../../../Scripts/typings/ui-grid/ui-grid.d.ts" />
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Ally;
(function (Ally) {
    var Unit = /** @class */ (function () {
        function Unit() {
        }
        return Unit;
    }());
    Ally.Unit = Unit;
    var PayerInfo = /** @class */ (function () {
        function PayerInfo() {
        }
        return PayerInfo;
    }());
    Ally.PayerInfo = PayerInfo;
    var UnitWithOwner = /** @class */ (function (_super) {
        __extends(UnitWithOwner, _super);
        function UnitWithOwner() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return UnitWithOwner;
    }(Unit));
    Ally.UnitWithOwner = UnitWithOwner;
    var UnitWithPayment = /** @class */ (function (_super) {
        __extends(UnitWithPayment, _super);
        function UnitWithPayment() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return UnitWithPayment;
    }(UnitWithOwner));
    Ally.UnitWithPayment = UnitWithPayment;
    var HomeEntry = /** @class */ (function () {
        function HomeEntry() {
        }
        return HomeEntry;
    }());
    Ally.HomeEntry = HomeEntry;
    var HomeEntryWithName = /** @class */ (function (_super) {
        __extends(HomeEntryWithName, _super);
        function HomeEntryWithName() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return HomeEntryWithName;
    }(Ally.HomeEntry));
    Ally.HomeEntryWithName = HomeEntryWithName;
    var Member = /** @class */ (function () {
        function Member() {
        }
        return Member;
    }());
    Ally.Member = Member;
    var MemberWithBoard = /** @class */ (function (_super) {
        __extends(MemberWithBoard, _super);
        function MemberWithBoard() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return MemberWithBoard;
    }(Member));
    Ally.MemberWithBoard = MemberWithBoard;
    /// Represents a member of a CHTN site
    var Resident = /** @class */ (function (_super) {
        __extends(Resident, _super);
        function Resident() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return Resident;
    }(MemberWithBoard));
    Ally.Resident = Resident;
    var UpdateResident = /** @class */ (function (_super) {
        __extends(UpdateResident, _super);
        function UpdateResident() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return UpdateResident;
    }(Resident));
    Ally.UpdateResident = UpdateResident;
    var RecentEmail = /** @class */ (function () {
        function RecentEmail() {
        }
        return RecentEmail;
    }());
    var ResidentCsvRow = /** @class */ (function () {
        function ResidentCsvRow() {
        }
        return ResidentCsvRow;
    }());
    var PendingMember = /** @class */ (function () {
        function PendingMember() {
        }
        return PendingMember;
    }());
    Ally.PendingMember = PendingMember;
    /**
     * The controller for the page to add, edit, and delete members from the site
     */
    var ManageResidentsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ManageResidentsController($http, $rootScope, fellowResidents, uiGridConstants, siteInfo, appCacheService) {
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
        ManageResidentsController.prototype.$onInit = function () {
            var _this = this;
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
            var twoWeeksAfterCreate = moment(this.siteInfo.privateSiteInfo.creationDate).add(14, "days");
            this.showAddHomeLink = !this.siteInfo.privateSiteInfo.siteLaunchedDateUtc && moment().isBefore(twoWeeksAfterCreate);
            if (this.showPendingMembers) {
                this.pendingMemberSignUpUrl = "https://" + HtmlUtil.getSubdomain() + "." + AppConfig.baseTld + "/#!/MemberSignUp";
                // Hook up the address copy link
                setTimeout(function () {
                    var clipboard = new Clipboard(".clipboard-button");
                    clipboard.on("success", function (e) {
                        Ally.HtmlUtil2.showTooltip(e.trigger, "Copied!");
                        e.clearSelection();
                    });
                    clipboard.on("error", function (e) {
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
            var LocalKey_ResidentSort = "residentSort_v2";
            var defaultSort = { field: "lastName", direction: this.uiGridConstants.ASC };
            this.residentSortInfo = defaultSort;
            if (window.localStorage) {
                var sortOptions = window.localStorage.getItem(LocalKey_ResidentSort);
                if (sortOptions)
                    this.residentSortInfo = JSON.parse(sortOptions);
                if (!this.residentSortInfo.field)
                    this.residentSortInfo = defaultSort;
            }
            var homeColumnWidth = AppConfig.appShortName === "hoa" ? 140 : (this.showIsRenter ? 62 : 175);
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
                            sortingAlgorithm: function (a, b) {
                                if (_this.shouldSortUnitsNumerically) {
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
                    ],
                    multiSelect: false,
                    enableSorting: true,
                    enableHorizontalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableFullRowSelection: true,
                    enableColumnMenus: false,
                    enableGridMenu: true,
                    enableRowHeaderSelection: false,
                    onRegisterApi: function (gridApi) {
                        _this.residentsGridApi = gridApi;
                        gridApi.selection.on.rowSelectionChanged(_this.$rootScope, function (row) {
                            var msg = 'row selected ' + row.isSelected;
                            _this.setEdit(row.entity);
                        });
                        gridApi.core.on.sortChanged(_this.$rootScope, function (grid, sortColumns) {
                            if (!sortColumns || sortColumns.length === 0)
                                return;
                            // Remember the sort
                            _this.residentSortInfo = { field: sortColumns[0].field, direction: sortColumns[0].sort.direction };
                            window.localStorage.setItem(LocalKey_ResidentSort, JSON.stringify(_this.residentSortInfo));
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
                    onRegisterApi: function (gridApi) {
                        _this.pendingMemberGridApi = gridApi;
                        gridApi.selection.on.rowSelectionChanged(_this.$rootScope, function (row) {
                            _this.selectPendingMember(row.entity);
                        });
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
            if (window.innerWidth < 769) {
                for (var i = 2; i < this.residentGridOptions.columnDefs.length; ++i)
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
                    onRegisterApi: function (gridApi) {
                        _this.emailHistoryGridApi = gridApi;
                        gridApi.selection.on.rowSelectionChanged(_this.$rootScope, function (row) {
                            _this.viewingRecentEmailBody = row.entity.messageBody;
                        });
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
            this.refreshResidents()
                .then(function () { return _this.loadSettings(); })
                .then(function () {
                if (_this.appCacheService.getAndClear("goToEmailHistory") === "true") {
                    document.getElementById("toggle-email-history-link").scrollIntoView();
                    _this.toggleEmailHistoryVisible();
                }
                if (_this.residentsGridApi && window.localStorage[ManageResidentsController.StoreKeyResidentGridState]) {
                    var gridState = JSON.parse(window.localStorage[ManageResidentsController.StoreKeyResidentGridState]);
                    if (gridState && typeof (gridState) === "object") {
                        _this.residentsGridApi.saveState.restore(_this, gridState);
                        _this.residentsGridApi.grid.clearAllFilters(true, true, false);
                        _this.didLoadResidentGridState = true;
                    }
                }
                if (_this.showPendingMembers)
                    _this.loadPendingMembers();
            });
        };
        /**
         * Called on a controller when its containing scope is destroyed. Use this hook for releasing external resources,
         * watches and event handlers.
         */
        ManageResidentsController.prototype.$onDestroy = function () {
            // Save the grid state (column order, widths, visible, etc.)
            if (this.shouldSaveResidentGridState) {
                var gridState = this.residentsGridApi.saveState.save();
                window.localStorage[ManageResidentsController.StoreKeyResidentGridState] = JSON.stringify(gridState);
            }
        };
        ManageResidentsController.prototype.getBoardPositionName = function (boardValue) {
            if (!boardValue)
                return "";
            var boardPosition = jQuery.grep(Ally.FellowResidentsService.BoardPositionNames, function (pos, i) { return pos.id === boardValue; })[0];
            if (!boardPosition)
                return "";
            return boardPosition.name;
        };
        /**
        * View a pending member's information
        */
        ManageResidentsController.prototype.selectPendingMember = function (pendingMember) {
            this.pendingMemberGridApi.selection.clearSelectedRows();
            var newUserInfo = new UpdateResident();
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
        };
        ManageResidentsController.prototype.closeViewingEmail = function () {
            this.viewingRecentEmailBody = null;
            this.emailHistoryGridApi.selection.clearSelectedRows();
        };
        /**
        * Edit a resident's information
        */
        ManageResidentsController.prototype.setEdit = function (resident) {
            var _this = this;
            this.sentWelcomeEmail = false;
            if (resident === null) {
                this.editUser = null;
                return;
            }
            this.selectedResidentDetailsView = "Primary";
            this.editUserForm.$setPristine();
            var copiedUser = jQuery.extend({}, resident);
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
                    var emptyUnit = new Ally.Unit();
                    emptyUnit.name = "None Selected";
                    emptyUnit.unitId = -5;
                    this.allUnits.unshift(emptyUnit);
                }
            }
            // Set the selected units
            _.each(this.allUnits, function (allUnit) {
                var isSelected = _.find(_this.editUser.units, function (userUnit) { return userUnit.unitId === allUnit.unitId; }) !== undefined;
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
        };
        /**
         * Send a resident the welcome email
         */
        ManageResidentsController.prototype.onSendWelcome = function () {
            var _this = this;
            this.isSavingUser = true;
            this.$http.put("/api/Residents/" + this.editUser.userId + "/SendWelcome", null).then(function () {
                _this.isSavingUser = false;
                _this.sentWelcomeEmail = true;
            }, function () {
                _this.isSavingUser = false;
                alert("Failed to send the welcome email, please contact support if this problem persists.");
            });
        };
        /**
         * Populate the text that is shown for the unit column in the resident grid
         */
        ManageResidentsController.prototype.populateGridUnitLabels = function () {
            // Populate the unit names for the grid
            _.each(this.residentGridOptions.data, function (res) {
                var unitLabel = _.reduce(res.units, function (memo, u) {
                    if (memo.length > 0)
                        return memo + "," + u.name;
                    else
                        return u.name;
                }, "");
                res.unitGridLabel = unitLabel;
            });
        };
        /**
         * Populate the residents
         */
        ManageResidentsController.prototype.refreshResidents = function () {
            var _this = this;
            this.isLoading = true;
            return this.$http.get("/api/Residents").then(function (response) {
                _this.isLoading = false;
                var residentArray = response.data;
                _this.residentGridOptions.data = residentArray;
                _this.residentGridOptions.minRowsToShow = residentArray.length;
                _this.residentGridOptions.virtualizationThreshold = residentArray.length;
                _this.residentGridOptions.enableFiltering = residentArray.length > 15;
                _this.residentsGridApi.core.notifyDataChange(_this.uiGridConstants.dataChange.COLUMN);
                _this.hasOneAdmin = _.filter(residentArray, function (r) { return r.isSiteManager; }).length === 1 && residentArray.length > 1;
                //this.gridApi.grid.notifyDataChange( uiGridConstants.dataChange.ALL );
                // If we have sort info to use
                if (_this.residentSortInfo) {
                    var sortColumn = _.find(_this.residentsGridApi.grid.columns, function (col) { return col.field === _this.residentSortInfo.field; });
                    if (sortColumn)
                        _this.residentsGridApi.grid.sortColumn(sortColumn, _this.residentSortInfo.direction, false);
                }
                // Build the full name and convert the last login to local time
                _.forEach(residentArray, function (res) {
                    res.fullName = res.firstName + " " + res.lastName;
                    if (typeof (res.email) === "string" && res.email.indexOf("@condoally.com") !== -1)
                        res.email = "";
                    // Convert the last login timestamps to local time
                    if (res.lastLoginDateUtc)
                        res.lastLoginDateUtc = moment.utc(res.lastLoginDateUtc).toDate();
                });
                _this.populateGridUnitLabels();
                if (!_this.allUnits && AppConfig.isChtnSite) {
                    _this.isLoading = true;
                    _this.$http.get("/api/Unit").then(function (httpResponse) {
                        _this.isLoading = false;
                        _this.allUnits = httpResponse.data;
                        _this.shouldSortUnitsNumerically = _.every(_this.allUnits, function (u) { return HtmlUtil.isNumericString(u.name); });
                        if (_this.shouldSortUnitsNumerically)
                            _this.allUnits = _.sortBy(_this.allUnits, function (u) { return parseFloat(u.name); });
                        // If we have a lot of units then allow searching
                        _this.multiselectOptions = _this.allUnits.length > 20 ? "filter" : "";
                        // Show the note on how to add homes if there's only one home
                        var twoMonthsAfterCreate = moment(_this.siteInfo.privateSiteInfo.creationDate).add(2, "months");
                        _this.showAddHomeLink = _this.allUnits.length < 3 && moment().isBefore(twoMonthsAfterCreate);
                    }, function () {
                        _this.isLoading = false;
                        alert("Failed to retrieve your association's home listing, please contact support.");
                    });
                }
            });
        };
        /**
         * Populate the pending members grid
         */
        ManageResidentsController.prototype.loadPendingMembers = function () {
            var _this = this;
            this.isLoadingPending = true;
            this.$http.get("/api/Member/Pending").then(function (response) {
                _this.isLoadingPending = false;
                _this.pendingMemberGridOptions.data = response.data;
                _this.pendingMemberGridOptions.minRowsToShow = response.data.length;
                _this.pendingMemberGridOptions.virtualizationThreshold = response.data.length;
            }, function (response) {
                _this.isLoadingPending = false;
            });
        };
        /**
         * Occurs when the user presses the button to allow multiple home selections
         */
        ManageResidentsController.prototype.enableMultiHomePicker = function () {
            if (this.editUser)
                this.editUser.showAdvancedHomePicker = true;
            this.multiselectMulti = 'multiple';
            if (this.allUnits && this.allUnits.length > 0 && this.allUnits[0].unitId === null)
                this.allUnits.shift();
        };
        /**
         * Reject a pending member
         */
        ManageResidentsController.prototype.rejectPendingMember = function () {
            var _this = this;
            if (!this.editUser.pendingMemberId)
                return;
            if (!confirm("Are you sure you want to remove this pending member? This action cannot be undone."))
                return;
            this.isLoading = false;
            this.$http.put("/api/Member/Pending/Deny/" + this.editUser.pendingMemberId, null).then(function () {
                _this.isLoading = false;
                _this.editUser = null;
                _this.loadPendingMembers();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to reject pending member: " + response.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user presses the button to update a resident's information or create a new
         * resident
         */
        ManageResidentsController.prototype.onSaveResident = function () {
            var _this = this;
            if (!this.editUser)
                return;
            $("#editUserForm").validate();
            if (!$("#editUserForm").valid())
                return;
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
            var onSave = function (response) {
                _this.isSavingUser = false;
                if (typeof (response.data.errorMessage) === "string") {
                    alert("Failed to add resident: " + response.data.errorMessage);
                    return;
                }
                if (_this.editUser.pendingMemberId)
                    _this.loadPendingMembers();
                _this.editUser = null;
                _this.refreshResidents();
            };
            var isAddingNew = false;
            var onError = function (response) {
                _this.isSavingUser = false;
                var errorMessage = isAddingNew ? "Failed to add new resident" : "Failed to update resident";
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
        };
        /**
         * Occurs when the user presses the button to set a user's password
         */
        ManageResidentsController.prototype.OnAdminSetPassword = function () {
            var _this = this;
            var setPass = {
                userName: this.adminSetPass_Username,
                password: this.adminSetPass_Password
            };
            this.$http.post("/api/AdminHelper/SetPassword", setPass).then(function (response) {
                _this.adminSetPass_ResultMessage = response.data;
            }, function (response) {
                alert("Failed to set password: " + response.data.exceptionMessage);
            });
        };
        /**
         * Load the resident settings
         */
        ManageResidentsController.prototype.loadSettings = function () {
            var _this = this;
            this.isLoadingSettings = true;
            this.$http.get("/api/Settings").then(function (response) {
                _this.isLoadingSettings = false;
                _this.residentSettings = response.data;
                // Update the SiteInfoService so the privateSiteInfo properties reflects changes
                _this.siteInfo.privateSiteInfo.rentersCanViewDocs = _this.residentSettings.rentersCanViewDocs;
                _this.siteInfo.privateSiteInfo.whoCanCreateDiscussionThreads = _this.residentSettings.whoCanCreateDiscussionThreads;
            }, function (response) {
                _this.isLoadingSettings = false;
                console.log("Failed to retrieve settings: " + response.data.exceptionMessage);
            });
        };
        /**
         * Export the resident list as a CSV
         */
        ManageResidentsController.prototype.exportResidentCsv = function () {
            var _this = this;
            if (typeof (analytics) !== "undefined")
                analytics.track('exportResidentCsv');
            var csvColumns = [
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
                    dataMapper: function (value) { return _this.getBoardPositionName(value); }
                },
                {
                    headerText: "Alternate Mailing",
                    fieldName: "mailingAddressObject",
                    dataMapper: function (value) {
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
                    dataMapper: function (value) {
                        if (!value)
                            return "Has not logged-in";
                        return moment(value).format("YYYY-MM-DD HH:mm:00");
                    }
                }
            ];
            var csvDataString = Ally.createCsvString(this.residentGridOptions.data, csvColumns);
            Ally.HtmlUtil2.downloadCsv(csvDataString, "Residents.csv");
        };
        /**
         * Export the member list for a PTA in Kansas as a CSV ready to be uploaded to the state
         */
        ManageResidentsController.prototype.exportKansasPtaCsv = function () {
            if (!this.siteInfo.privateSiteInfo.ptaUnitId) {
                alert("You must first set your PTA unit ID in Manage -> Settings before you can export in this format.");
                return;
            }
            if (typeof (analytics) !== "undefined")
                analytics.track('exportKansasPtaCsv');
            var csvColumns = [
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
            var copiedMembers = _.clone(this.residentGridOptions.data);
            for (var _i = 0, copiedMembers_1 = copiedMembers; _i < copiedMembers_1.length; _i++) {
                var member = copiedMembers_1[_i];
                member.Local_Unit = this.siteInfo.privateSiteInfo.ptaUnitId.toString();
                member.Membership_Name = (!member.firstName || member.firstName === "N/A") ? member.lastName : member.firstName;
                if (member.boardPosition !== 0)
                    member.Position = this.getBoardPositionName(member.boardPosition);
            }
            var csvDataString = Ally.createCsvString(this.residentGridOptions.data, csvColumns);
            csvDataString = "data:text/csv;charset=utf-8," + csvDataString;
            var encodedUri = encodeURI(csvDataString);
            // Works, but can't set the file name
            //window.open( encodedUri );
            var csvLink = document.createElement("a");
            csvLink.setAttribute("href", encodedUri);
            csvLink.setAttribute("download", "pta-members.csv");
            document.body.appendChild(csvLink); // Required for FF
            csvLink.click(); // This will download the file
            setTimeout(function () { return document.body.removeChild(csvLink); }, 500);
        };
        /**
         * Save the resident settings to the server
         */
        ManageResidentsController.prototype.saveResidentSettings = function () {
            var _this = this;
            analytics.track("editResidentSettings");
            this.isLoadingSettings = true;
            this.$http.put("/api/Settings", this.residentSettings).then(function () {
                _this.isLoadingSettings = false;
                // Update the fellow residents page next time we're there
                _this.fellowResidents.clearResidentCache();
                // Update the locally cached settings to match the saved values
                _this.siteInfo.privateSiteInfo.canHideContactInfo = _this.residentSettings.canHideContactInfo;
                _this.siteInfo.privateSiteInfo.isDiscussionEmailGroupEnabled = _this.residentSettings.isDiscussionEmailGroupEnabled;
            }, function () {
                _this.isLoadingSettings = false;
                alert("Failed to update settings, please try again or contact support.");
            });
        };
        /**
         * Occurs when the user presses the button to delete a resident
         */
        ManageResidentsController.prototype.onDeleteResident = function () {
            var _this = this;
            if (!confirm("Are you sure you want to remove this person from your building?"))
                return;
            if (this.siteInfo.userInfo.userId === this.editUser.userId) {
                if (!confirm("If you remove your own account you won't be able to login anymore. Are you still sure?"))
                    return;
            }
            this.isSavingUser = true;
            this.$http.delete("/api/Residents?userId=" + this.editUser.userId).then(function () {
                _this.isSavingUser = false;
                _this.editUser = null;
                // Update the fellow residents page next time we're there
                _this.fellowResidents.clearResidentCache();
                _this.refreshResidents();
            }, function () {
                alert("Failed to remove the resident. Please let support know if this continues to happen.");
                _this.isSavingUser = false;
                _this.editUser = null;
            });
        };
        /**
         * Occurs when the user presses the button to reset everyone's password
         */
        ManageResidentsController.prototype.onSendAllWelcome = function () {
            var _this = this;
            if (!confirm("This will email all of the residents in your association. Do you want to proceed?"))
                return;
            this.isLoading = true;
            this.$http.put("/api/Residents/UserAction?userId&action=launchsite", null).then(function () {
                _this.isLoading = false;
                _this.sentWelcomeEmail = true;
                _this.allEmailsSent = true;
            }, function () {
                _this.isLoading = false;
                alert("Failed to send welcome email, please contact support if this problem persists.");
            });
        };
        /**
         * Parse the bulk resident CSV text
         */
        ManageResidentsController.prototype.parseBulkCsv = function () {
            var csvParser = $.csv;
            var bulkRows = csvParser.toArrays(this.bulkImportCsv);
            this.bulkImportRows = [];
            var simplifyStreetName = function (streetAddress) {
                if (!streetAddress)
                    streetAddress = "";
                var simplifiedName = streetAddress.toLowerCase();
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
                for (var i = 0; i < this.allUnits.length; ++i)
                    this.allUnits[i].csvTestName = simplifyStreetName(this.allUnits[i].name);
            }
            var _loop_1 = function (i) {
                var curRow = bulkRows[i];
                while (curRow.length < 10)
                    curRow.push("");
                // Skip the header row, if there is one
                if (curRow[0] === "Address/Unit" && curRow[1] === "Email" && curRow[2] === "First Name")
                    return "continue";
                // Clean up the data
                for (var j = 0; j < curRow.length; ++j) {
                    if (HtmlUtil.isNullOrWhitespace(curRow[j]))
                        curRow[j] = null;
                    else
                        curRow[j] = curRow[j].trim();
                }
                var newRow = {
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
                    var unit = _.find(this_1.allUnits, function (u) { return u.csvTestName === newRow.csvTestName; });
                    if (unit)
                        newRow.unitId = unit.unitId;
                    else
                        newRow.unitId = undefined;
                }
                // If this row contains two people
                var spouseRow = null;
                if (newRow.firstName && newRow.firstName.toLowerCase().indexOf(" & ") !== -1)
                    newRow.firstName = newRow.firstName.replace(" & ", " and  ");
                if (newRow.firstName && newRow.firstName.toLowerCase().indexOf(" and ") !== -1) {
                    spouseRow = _.clone(newRow);
                    var splitFirst = newRow.firstName.split(" and ");
                    newRow.firstName = splitFirst[0];
                    spouseRow.firstName = splitFirst[1];
                    if (newRow.email && newRow.email.indexOf(" / ") !== -1) {
                        var splitEmail = newRow.email.split(" / ");
                        newRow.email = splitEmail[0];
                        spouseRow.email = splitEmail[1];
                    }
                    else
                        spouseRow.email = "";
                    spouseRow.phoneNumber = "";
                }
                if (this_1.bulkParseNormalizeNameCase) {
                    var capitalizeFirst = function (str) {
                        if (!str)
                            return str;
                        if (str.length === 1)
                            return str.toUpperCase();
                        return str.charAt(0).toUpperCase() + str.substr(1).toLowerCase();
                    };
                    newRow.firstName = capitalizeFirst(newRow.firstName);
                    newRow.lastName = capitalizeFirst(newRow.lastName);
                    if (spouseRow) {
                        spouseRow.firstName = capitalizeFirst(spouseRow.firstName);
                        spouseRow.lastName = capitalizeFirst(spouseRow.lastName);
                    }
                }
                this_1.bulkImportRows.push(newRow);
                if (spouseRow)
                    this_1.bulkImportRows.push(spouseRow);
            };
            var this_1 = this;
            for (var i = 0; i < bulkRows.length; ++i) {
                _loop_1(i);
            }
            var _loop_2 = function (curRow) {
                curRow.emailHasDupe = curRow.email && this_2.bulkImportRows.filter(function (r) { return r.email === curRow.email; }).length > 1;
            };
            var this_2 = this;
            // Find any duplicate email addresses
            for (var _i = 0, _a = this.bulkImportRows; _i < _a.length; _i++) {
                var curRow = _a[_i];
                _loop_2(curRow);
            }
        };
        /**
         * Submit the bulk creation rows to the server
         */
        ManageResidentsController.prototype.submitBulkRows = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.post("/api/Residents/BulkLoad", this.bulkImportRows, { timeout: 10 * 60 * 1000 }).then(function () {
                _this.isLoading = false;
                _this.bulkImportRows = [new ResidentCsvRow()];
                _this.bulkImportCsv = "";
                alert("Success");
                _this.refreshResidents();
            }, function () {
                _this.isLoading = false;
                alert("Bulk upload failed");
            });
        };
        /**
         * Add a row to the bulk table
         */
        ManageResidentsController.prototype.addBulkRow = function () {
            var newRow = {
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
                    var lastUnitId_1 = this.bulkImportRows[this.bulkImportRows.length - 1].unitId;
                    var lastUnitIndex = _.findIndex(this.allUnits, function (u) { return u.unitId === lastUnitId_1; });
                    ++lastUnitIndex;
                    if (lastUnitIndex < this.allUnits.length) {
                        newRow.unitName = this.allUnits[lastUnitIndex].name;
                        newRow.unitId = this.allUnits[lastUnitIndex].unitId;
                    }
                }
            }
            this.bulkImportRows.push(newRow);
        };
        /**
         * Display the list of recent emails
         */
        ManageResidentsController.prototype.toggleEmailHistoryVisible = function () {
            var _this = this;
            this.showEmailHistory = !this.showEmailHistory;
            this.viewingRecentEmailBody = null;
            if (this.showEmailHistory && !this.emailHistoryGridOptions.data) {
                this.isLoadingSettings = true;
                this.$http.get("/api/Email/RecentGroupEmails").then(function (response) {
                    _this.isLoadingSettings = false;
                    _this.emailHistoryGridOptions.data = response.data;
                }, function (response) {
                    _this.isLoadingSettings = false;
                    alert("Failed to load emails: " + response.data.exceptionMessage);
                });
            }
        };
        /**
         * Load 6 more months of email history
         */
        ManageResidentsController.prototype.loadMoreRecentEmails = function () {
            var _this = this;
            this.isLoadingSettings = true;
            var NumMonthsStep = 6;
            this.emailHistoryNumMonths += NumMonthsStep;
            this.emailHistorySinceDate = moment(this.emailHistorySinceDate).subtract(NumMonthsStep, "months").toDate();
            this.$http.get("/api/Email/RecentGroupEmails?sinceDateUtc=" + this.emailHistorySinceDate.toISOString()).then(function (response) {
                _this.isLoadingSettings = false;
                _this.emailHistoryGridOptions.data = _this.emailHistoryGridOptions.data.concat(response.data);
            }, function (response) {
                _this.isLoadingSettings = false;
                alert("Failed to load emails: " + response.data.exceptionMessage);
            });
        };
        ManageResidentsController.prototype.resetResidentGridState = function () {
            // Remove the saved grid state
            window.localStorage.removeItem(ManageResidentsController.StoreKeyResidentGridState);
            // Refresh the page, but don't save the grid state on exit
            this.shouldSaveResidentGridState = false;
            window.location.reload();
        };
        ManageResidentsController.$inject = ["$http", "$rootScope", "fellowResidents", "uiGridConstants", "SiteInfo", "appCacheService"];
        ManageResidentsController.StoreKeyResidentGridState = "AllyResGridState";
        return ManageResidentsController;
    }());
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
    var GroupAmenitiesController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function GroupAmenitiesController($http, siteInfo, $location) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$location = $location;
            this.isLoading = false;
            this.appShortName = AppConfig.appShortName;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        GroupAmenitiesController.prototype.$onInit = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Association/GroupAmenities").then(function (httpResponse) {
                _this.isLoading = false;
                _this.groupAmenities = httpResponse.data;
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to retrieve amenity data: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
        * Called when the user clicks the save button
        */
        GroupAmenitiesController.prototype.saveForm = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.put("/api/Association/GroupAmenities", this.groupAmenities).then(function (httpResponse) {
                _this.$location.path("/Home");
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            });
        };
        GroupAmenitiesController.$inject = ["$http", "SiteInfo", "$location"];
        return GroupAmenitiesController;
    }());
    Ally.GroupAmenitiesController = GroupAmenitiesController;
    var GroupAmenities = /** @class */ (function () {
        function GroupAmenities() {
        }
        return GroupAmenities;
    }());
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
    var PremiumPlanSettingsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function PremiumPlanSettingsController($http, siteInfo, appCacheService, $timeout, $scope) {
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
        PremiumPlanSettingsController.prototype.$onInit = function () {
            var _this = this;
            this.monthlyDisabled = this.siteInfo.privateSiteInfo.numUnits <= 10;
            this.refreshData();
            // Get a view token to view the premium plan invoice should one be generated
            if (this.showInvoiceSection) // Add a slight delay to let the rest of the page load
                this.$timeout(function () { return _this.$http.get("/api/DocumentLink/0").then(function (response) { return _this.viewPremiumInvoiceViewId = response.data.vid; }); }, 250);
            this.shouldShowTrialNote = this.siteInfo.privateSiteInfo.isPremiumPlanActive && moment().isBefore(moment(this.siteInfo.privateSiteInfo.creationDate).add(3, "months"));
        };
        /**
         * Occurs when the user clicks the button to cancel the premium plan auto-renewal
         */
        PremiumPlanSettingsController.prototype.cancelPremiumAutoRenew = function () {
            var _this = this;
            if (!confirm("Are you sure?"))
                return;
            this.isLoading = true;
            this.$http.put("/api/Settings/CancelPremium", null).then(function (response) {
                _this.isLoading = false;
                _this.settings.premiumPlanIsAutoRenewed = false;
                _this.shouldShowPaymentForm = false;
                _this.refreshData();
            }, function () {
                _this.isLoading = false;
                alert("Failed to cancel the premium plan. Refresh the page and try again or contact support if the problem persists.");
            });
        };
        PremiumPlanSettingsController.prototype.showStripeError = function (errorMessage) {
            var displayError = document.getElementById('card-errors');
            if (HtmlUtil.isNullOrWhitespace(errorMessage))
                displayError.textContent = null; //'Unknown Error';
            else
                displayError.textContent = errorMessage;
        };
        PremiumPlanSettingsController.prototype.initStripePayment = function () {
            var _this = this;
            var style = {
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
            var elements = this.stripeApi.elements();
            this.stripeCardElement = elements.create("card", { style: style });
            this.stripeCardElement.mount("#stripe-card-element");
            var onCardChange = function (event) {
                if (event.error)
                    _this.showStripeError(event.error.message);
                else
                    _this.showStripeError(null);
            };
            this.stripeCardElement.on('change', onCardChange);
        };
        PremiumPlanSettingsController.prototype.submitCardToStripe = function () {
            var _this = this;
            this.isLoading = true;
            return this.stripeApi.createPaymentMethod({
                type: 'card',
                card: this.stripeCardElement,
            })
                .then(function (result) {
                if (result.error) {
                    _this.isLoading = false;
                    _this.showStripeError(result.error.message);
                }
                else {
                    var activateInfo = {
                        stripePaymentMethodId: result.paymentMethod.id,
                        shouldPayAnnually: _this.isActivatingAnnual
                    };
                    _this.$http.put("/api/Settings/ActivatePremium", activateInfo).then(function (response) {
                        _this.isLoading = false;
                        _this.settings.premiumPlanIsAutoRenewed = true;
                        _this.shouldShowPaymentForm = false;
                        _this.refreshData();
                    }, function (errorResponse) {
                        _this.isLoading = false;
                        alert("Failed to activate the premium plan. Refresh the page and try again or contact support if the problem persists: " + errorResponse.data.exceptionMessage);
                    });
                    //this.createSubscription( result.paymentMethod.id );
                }
                _this.$scope.$apply();
            });
        };
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
        PremiumPlanSettingsController.prototype.generateStripeInvoice = function (numMonths, shouldIncludeWireInfo) {
            var _this = this;
            var getUri = "PublicSettings/ViewPremiumInvoice?vid=" + this.viewPremiumInvoiceViewId + "&numMonths=" + numMonths + "&shouldIncludeWireInfo=" + shouldIncludeWireInfo;
            window.open(this.siteInfo.publicSiteInfo.baseApiUrl + getUri, "_blank");
            this.$timeout(function () {
                // Refresh the view token in case the user clicks again
                _this.$http.get("/api/DocumentLink/0").then(function (response) { return _this.viewPremiumInvoiceViewId = response.data.vid; });
            }, 1250);
        };
        /**
         * Occurs when the user clicks the button to enable premium plan auto-renewal
         */
        PremiumPlanSettingsController.prototype.activatePremiumRenewal = function () {
            var _this = this;
            this.shouldShowPaymentForm = true;
            this.updateCheckoutDescription();
            this.$timeout(function () { return _this.initStripePayment(); }, 250);
        };
        PremiumPlanSettingsController.prototype.updateCheckoutDescription = function () {
            var renewedInPast = moment(this.premiumPlanRenewDate).isBefore();
            var payAmount;
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
        };
        PremiumPlanSettingsController.prototype.createSubscription = function (paymentMethodId) {
            var _this = this;
            return (fetch('/create-subscription', {
                method: 'post',
                headers: {
                    'Content-type': 'application/json',
                },
                body: JSON.stringify({
                    paymentMethodId: paymentMethodId
                }),
            })
                .then(function (response) {
                return response.json();
            })
                // If the card is declined, display an error to the user.
                .then(function (result) {
                if (result.error) {
                    // The card had an error when trying to attach it to a customer.
                    throw result;
                }
                return result;
            })
                // Normalize the result to contain the object returned by Stripe.
                // Add the addional details we need.
                .then(function (result) {
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
                .catch(function (error) {
                // An error has happened. Display the failure to the user here.
                // We utilize the HTML element we created.
                _this.showStripeError(error);
            }));
        };
        PremiumPlanSettingsController.prototype.handlePaymentThatRequiresCustomerAction = function (_a) {
            var _this = this;
            var subscription = _a.subscription, invoice = _a.invoice, priceId = _a.priceId, paymentMethodId = _a.paymentMethodId, isRetry = _a.isRetry;
            if (subscription && subscription.status === 'active') {
                // Subscription is active, no customer actions required.
                return { subscription: subscription, priceId: priceId, paymentMethodId: paymentMethodId };
            }
            // If it's a first payment attempt, the payment intent is on the subscription latest invoice.
            // If it's a retry, the payment intent will be on the invoice itself.
            var paymentIntent = invoice ? invoice.payment_intent : subscription.latest_invoice.payment_intent;
            if (paymentIntent.status === 'requires_action' ||
                (isRetry === true && paymentIntent.status === 'requires_payment_method')) {
                return this.stripeApi
                    .confirmCardPayment(paymentIntent.client_secret, {
                    payment_method: paymentMethodId,
                })
                    .then(function (result) {
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
                    .catch(function (error) {
                    _this.showStripeError(error);
                });
            }
            else {
                // No customer action needed.
                return { subscription: subscription, priceId: priceId, paymentMethodId: paymentMethodId };
            }
        };
        PremiumPlanSettingsController.prototype.handleRequiresPaymentMethod = function (_a) {
            var subscription = _a.subscription, paymentMethodId = _a.paymentMethodId, priceId = _a.priceId;
            if (subscription.status === 'active') {
                // subscription is active, no customer actions required.
                return { subscription: subscription, priceId: priceId, paymentMethodId: paymentMethodId };
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
                return { subscription: subscription, priceId: priceId, paymentMethodId: paymentMethodId };
            }
        };
        /**
         * Retrieve the email usage from the server
         */
        PremiumPlanSettingsController.prototype.refreshMeteredUsage = function () {
            var _this = this;
            this.isLoadingUsage = true;
            this.$http.get("/api/Settings/MeteredFeaturesUsage").then(function (response) {
                _this.isLoadingUsage = false;
                _this.meteredUsage = response.data;
                _this.meteredUsage.months = _.sortBy(_this.meteredUsage.months, function (m) { return m.year.toString() + "_" + (m.month > 9 ? "" : "0") + m.month; });
                _this.emailUsageChartLabels = [];
                var emailsSentChartData = [];
                var groupEmailChartData = [];
                var totalEmailsSent = 0;
                var totalGroupEmailProcessed = 0;
                for (var i = 0; i < response.data.months.length; ++i) {
                    var curMonth = response.data.months[i];
                    var monthName = moment([curMonth.year, curMonth.month - 1, 1]).format("MMMM");
                    // Add the year to the first and last entries
                    if (i === 0 || i === _this.meteredUsage.months.length - 1)
                        _this.emailUsageChartLabels.push(monthName + " " + curMonth.year);
                    else
                        _this.emailUsageChartLabels.push(monthName);
                    emailsSentChartData.push(curMonth.numEmailsSent);
                    groupEmailChartData.push(curMonth.numGroupEmailsProcessed);
                    totalEmailsSent += curMonth.numEmailsSent;
                    totalGroupEmailProcessed += curMonth.numGroupEmailsProcessed;
                }
                _this.emailUsageChartData = [emailsSentChartData];
                _this.groupEmailChartData = [groupEmailChartData];
                _this.emailUsageAverageNumMonths = response.data.months.length;
                if (_this.emailUsageAverageNumMonths > 1) {
                    _this.emailUsageAverageSent = Math.round(totalEmailsSent / _this.emailUsageAverageNumMonths);
                    _this.groupEmailAverage = Math.round(totalGroupEmailProcessed / _this.emailUsageAverageNumMonths);
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
        };
        /**
         * Populate the page from the server
         */
        PremiumPlanSettingsController.prototype.refreshData = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Settings").then(function (response) {
                _this.isLoading = false;
                _this.settings = response.data;
                _this.isPremiumPlanActive = _this.siteInfo.privateSiteInfo.isPremiumPlanActive;
                _this.premiumPlanRenewDate = new Date();
                _this.premiumPlanRenewDate = moment(_this.settings.premiumPlanExpirationDate).add(1, "days").toDate();
                if (_this.settings.premiumPlanIsAutoRenewed) {
                    _this.planExpirationColor = "green";
                    _this.$http.get("/api/Settings/StripeBillingPortal").then(function (response) { return _this.stripePortalUrl = response.data.portalUrl; });
                }
                else {
                    var twoMonthsBefore = moment(_this.settings.premiumPlanExpirationDate).add(-2, "months");
                    if (moment().isBefore(twoMonthsBefore))
                        _this.planExpirationColor = "green";
                    else
                        _this.planExpirationColor = "red";
                }
                _this.refreshMeteredUsage();
            });
        };
        /**
         * Bring the user to view their email history
         */
        PremiumPlanSettingsController.prototype.goToEmailHistory = function () {
            this.appCacheService.set("goToEmailHistory", "true");
            window.location.hash = "#!/ManageResidents";
            return true;
        };
        /**
         * Start the Stripe-Plaid ACH-linking flow
         */
        PremiumPlanSettingsController.prototype.startPlaidAchConnection = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Plaid/StripeLinkToken").then(function (httpResponse) {
                _this.isLoading = false;
                if (!httpResponse.data) {
                    alert("Failed to start Plaid connection. Please contact support.");
                    return;
                }
                var plaidConfig = {
                    token: httpResponse.data,
                    onSuccess: function (public_token, metadata) {
                        console.log("Plaid StripeLinkToken onSuccess", metadata);
                        _this.completePlaidAchConnection(public_token, metadata.account_id);
                    },
                    onLoad: function () { },
                    onExit: function (err, metadata) { console.log("update onExit.err", err, metadata); },
                    onEvent: function (eventName, metadata) { console.log("update onEvent.eventName", eventName, metadata); },
                    receivedRedirectUri: null,
                };
                var plaidHandler = Plaid.create(plaidConfig);
                plaidHandler.open();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to start Plaid connection: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Complete the Stripe-Plaid ACH-linking flow
         */
        PremiumPlanSettingsController.prototype.completePlaidAchConnection = function (accessToken, accountId) {
            var _this = this;
            this.isLoading = true;
            var postData = {
                accessToken: accessToken,
                selectedAccountIds: [accountId]
            };
            this.$http.post("/api/Plaid/ProcessStripeAccessToken", postData).then(function (httpResponse) {
                _this.isLoading = false;
                _this.checkoutDescription = "Account successfully linked, reloading...";
                window.location.reload();
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to link account: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Complete the Stripe-Plaid ACH-linking flow
         */
        PremiumPlanSettingsController.prototype.makeAchStripePayment = function () {
            var _this = this;
            this.isLoading = true;
            var activateInfo = {
                shouldPayAnnually: this.isActivatingAnnual,
                payViaAch: true
            };
            this.$http.put("/api/Settings/ActivatePremium", activateInfo).then(function (response) {
                _this.isLoading = false;
                _this.settings.premiumPlanIsAutoRenewed = true;
                _this.shouldShowPaymentForm = false;
                _this.refreshData();
            }, function (errorResponse) {
                _this.isLoading = false;
                alert("Failed to activate the premium plan. Refresh the page and try again or contact support if the problem persists: " + errorResponse.data.exceptionMessage);
            });
        };
        PremiumPlanSettingsController.prototype.onPaymentTypeChange = function () {
            var _this = this;
            // Tell Stripe to populate the card info area
            if (this.paymentType === "creditCard")
                this.$timeout(function () { return _this.initStripePayment(); }, 250);
        };
        PremiumPlanSettingsController.$inject = ["$http", "SiteInfo", "appCacheService", "$timeout", "$scope"];
        return PremiumPlanSettingsController;
    }());
    Ally.PremiumPlanSettingsController = PremiumPlanSettingsController;
    var GroupMonthEmails = /** @class */ (function () {
        function GroupMonthEmails() {
        }
        return GroupMonthEmails;
    }());
    Ally.GroupMonthEmails = GroupMonthEmails;
})(Ally || (Ally = {}));
CA.angularApp.component("premiumPlanSettings", {
    templateUrl: "/ngApp/chtn/manager/settings/premium-plan-settings.html",
    controller: Ally.PremiumPlanSettingsController
});
var StripePayNeedsCustomer = /** @class */ (function () {
    function StripePayNeedsCustomer() {
    }
    return StripePayNeedsCustomer;
}());
var MeteredFeaturesUsage = /** @class */ (function () {
    function MeteredFeaturesUsage() {
    }
    return MeteredFeaturesUsage;
}());

var Ally;
(function (Ally) {
    /**
     * The controller for the settings parent view
     */
    var SettingsParentController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function SettingsParentController($http, siteInfo, $routeParams) {
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
        SettingsParentController.prototype.$onInit = function () {
        };
        SettingsParentController.$inject = ["$http", "SiteInfo", "$routeParams"];
        return SettingsParentController;
    }());
    Ally.SettingsParentController = SettingsParentController;
})(Ally || (Ally = {}));
CA.angularApp.component("settingsParent", {
    templateUrl: "/ngApp/chtn/manager/settings/settings-parent.html",
    controller: Ally.SettingsParentController
});

var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Ally;
(function (Ally) {
    var BaseSiteSettings = /** @class */ (function () {
        function BaseSiteSettings() {
        }
        return BaseSiteSettings;
    }());
    Ally.BaseSiteSettings = BaseSiteSettings;
    /**
     * Represents settings for a Condo, HOA, or Neighborhood Ally site
     */
    var ChtnSiteSettings = /** @class */ (function (_super) {
        __extends(ChtnSiteSettings, _super);
        function ChtnSiteSettings() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return ChtnSiteSettings;
    }(BaseSiteSettings));
    Ally.ChtnSiteSettings = ChtnSiteSettings;
    /**
     * The controller for the page to view group site settings
     */
    var ChtnSettingsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ChtnSettingsController($http, siteInfo, $timeout, $scope, $rootScope) {
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
        ChtnSettingsController.prototype.$onInit = function () {
            var _this = this;
            this.frontEndVersion = appVer.toString();
            this.defaultBGImage = $(document.documentElement).css("background-image");
            this.showQaButton = this.siteInfo.userInfo.emailAddress === "president@mycondoally.com";
            this.loginImageUrl = this.siteInfo.publicSiteInfo.loginImageUrl;
            this.showRightColumnSetting = this.siteInfo.privateSiteInfo.creationDate < Ally.SiteInfoService.AlwaysDiscussDate;
            this.showLocalNewsSetting = !this.showRightColumnSetting;
            this.isPta = AppConfig.appShortName === "pta";
            // Hook up the file upload control after everything is loaded and setup
            this.$timeout(function () { return _this.hookUpLoginImageUpload(); }, 200);
            this.refreshData();
        };
        /**
         * Populate the page from the server
         */
        ChtnSettingsController.prototype.refreshData = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Settings").then(function (response) {
                _this.isLoading = false;
                _this.settings = response.data;
                _this.originalSettings = _.clone(response.data);
                if (!_this.tinyMceEditor) {
                    var tinyMceOpts = {
                        menubar: "edit format table",
                        toolbar: "styleselect | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link | checklist code formatpainter table"
                    };
                    Ally.HtmlUtil2.initTinyMce("tiny-mce-editor", 400, tinyMceOpts).then(function (e) {
                        _this.tinyMceEditor = e;
                        _this.tinyMceEditor.setContent(_this.settings.welcomeMessage);
                        _this.tinyMceEditor.on("keyup", function () {
                            // Need to wrap this in a $scope.using because this event is invoked by vanilla JS, not Angular
                            _this.$scope.$apply(function () {
                                _this.onWelcomeMessageEdit();
                            });
                        });
                    });
                }
            });
        };
        /**
         * Clear the login image
         */
        ChtnSettingsController.prototype.removeLoginImage = function () {
            var _this = this;
            analytics.track("clearLoginImage");
            this.isLoading = true;
            this.$http.get("/api/Settings/ClearLoginImage").then(function () {
                _this.isLoading = false;
                _this.siteInfo.publicSiteInfo.loginImageUrl = "";
                _this.loginImageUrl = "";
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to remove loading image: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Save all of the settings
         */
        ChtnSettingsController.prototype.saveAllSettings = function () {
            var _this = this;
            analytics.track("editSettings");
            this.settings.welcomeMessage = this.tinyMceEditor.getContent();
            this.isLoading = true;
            this.$http.put("/api/Settings", this.settings).then(function () {
                _this.isLoading = false;
                // Update the locally-stored values
                _this.siteInfo.privateSiteInfo.homeRightColumnType = _this.settings.homeRightColumnType;
                _this.siteInfo.privateSiteInfo.welcomeMessage = _this.settings.welcomeMessage;
                _this.siteInfo.privateSiteInfo.ptaUnitId = _this.settings.ptaUnitId;
                var didChangeFullName = _this.settings.fullName !== _this.originalSettings.fullName;
                // Reload the page to show the page title has changed
                if (didChangeFullName)
                    location.reload();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to save: " + response.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user clicks a new background image
         */
        ChtnSettingsController.prototype.onImageClick = function (bgImage) {
            var _this = this;
            this.settings.bgImageFileName = bgImage;
            //SettingsJS._defaultBG = bgImage;
            this.$http.put("/api/Settings", { BGImageFileName: this.settings.bgImageFileName }).then(function () {
                $(".test-bg-image").removeClass("test-bg-image-selected");
                //$( "img[src='" + $rootScope.bgImagePath + bgImage + "']" ).addClass( "test-bg-image-selected" );
                _this.isLoading = false;
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to save: " + response.data);
            });
        };
        ChtnSettingsController.prototype.onImageHoverOver = function (bgImage) {
            //$( document.documentElement ).css( "background-image", "url(" + $rootScope.bgImagePath + bgImage + ")" );
        };
        ChtnSettingsController.prototype.onImageHoverOut = function () {
            //if( typeof ( this.settings.bgImageFileName ) === "string" && this.settings.bgImageFileName.length > 0 )
            //    $( document.documentElement ).css( "background-image", "url(" + $rootScope.bgImagePath + this.settings.bgImageFileName + ")" );
            //else
            //    $( document.documentElement ).css( "background-image", this.defaultBGImage );
        };
        ChtnSettingsController.prototype.onQaDeleteSite = function () {
            this.$http.get("/api/QA/DeleteThisAssociation").then(function () {
                location.reload();
            }, function (httpResponse) {
                alert("Failed to delete site: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Initialize the login image JQuery upload control
         */
        ChtnSettingsController.prototype.hookUpLoginImageUpload = function () {
            var _this = this;
            $(function () {
                $('#JQLoginImageFileUploader').fileupload({
                    dropZone: null,
                    pasteZone: null,
                    autoUpload: true,
                    add: function (e, data) {
                        _this.$scope.$apply(function () {
                            _this.isLoading = true;
                        });
                        analytics.track("setLoginImage");
                        $("#FileUploadProgressContainer").show();
                        data.url = "api/DocumentUpload/LoginImage";
                        if (_this.siteInfo.publicSiteInfo.baseApiUrl)
                            data.url = _this.siteInfo.publicSiteInfo.baseApiUrl + "DocumentUpload/LoginImage";
                        var xhr = data.submit();
                        xhr.done(function (result) {
                            _this.$scope.$apply(function () {
                                _this.isLoading = false;
                                _this.loginImageUrl = result.newUrl + "?cacheBreaker=" + new Date().getTime();
                                _this.siteInfo.publicSiteInfo.loginImageUrl = _this.loginImageUrl;
                            });
                            $("#FileUploadProgressContainer").hide();
                        });
                    },
                    beforeSend: function (xhr) {
                        if (_this.siteInfo.publicSiteInfo.baseApiUrl)
                            xhr.setRequestHeader("Authorization", "Bearer " + _this.$rootScope.authToken);
                        else
                            xhr.setRequestHeader("ApiAuthToken", _this.$rootScope.authToken);
                    },
                    progressall: function (e, data) {
                        var progress = Math.floor((data.loaded * 100) / data.total);
                        $('#FileUploadProgressBar').css('width', progress + '%');
                        if (progress === 100)
                            $("#FileUploadProgressLabel").text("Finalizing Upload...");
                        else
                            $("#FileUploadProgressLabel").text(progress + "%");
                    }
                });
            });
        };
        /**
         * Occurs when the user clicks the link to force refresh the page
         */
        ChtnSettingsController.prototype.forceRefresh = function () {
            window.location.reload(true);
        };
        ChtnSettingsController.prototype.onWelcomeMessageEdit = function () {
            var MaxWelcomeLength = 4000;
            var welcomeHtml = this.tinyMceEditor.getContent();
            this.shouldShowWelcomeTooLongError = welcomeHtml.length > MaxWelcomeLength;
        };
        ChtnSettingsController.$inject = ["$http", "SiteInfo", "$timeout", "$scope", "$rootScope"];
        return ChtnSettingsController;
    }());
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
    var AssociationInfoController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function AssociationInfoController(siteInfo, $routeParams) {
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
        AssociationInfoController.prototype.$onInit = function () {
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
        };
        /**
        * Occurs when the user clicks the link to force refresh the page
        */
        AssociationInfoController.prototype.forceRefresh = function () {
            window.location.reload(true);
        };
        AssociationInfoController.$inject = ["SiteInfo", "$routeParams"];
        return AssociationInfoController;
    }());
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
                    var html = element.html();
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
    var ChtnHomeController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ChtnHomeController($http, $rootScope, siteInfo, $timeout, $scope, $routeParams, $sce) {
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
        ChtnHomeController.prototype.$onInit = function () {
            var _this = this;
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
            this.$scope.$on("homeHasActivePolls", function () { return innerThis.shouldShowAlertSection = true; });
            this.$http.get("/api/Committee/MyCommittees", { cache: true }).then(function (response) {
                _this.usersCommittees = response.data;
                if (_this.usersCommittees)
                    _this.usersCommittees = _.sortBy(_this.usersCommittees, function (c) { return c.name.toLowerCase(); });
            });
            // Delay the survey check since it's low priority and it lets the other parts of the page load faster
            if (AppConfig.appShortName === "condo" || AppConfig.appShortName === "hoa")
                this.$timeout(function () { return _this.checkForSurveys(); }, 250);
        };
        /**
        * See if there's any surveys waiting to be completed for the current group+user
        */
        ChtnHomeController.prototype.checkForSurveys = function () {
            var _this = this;
            this.$http.get("/api/AllySurvey/AnySurvey").then(function (response) {
                _this.allySurvey = response.data;
            }, function (errorResponse) {
                console.log("Failed to load ally survey", errorResponse.data.exceptionMessage);
            });
            this.allySurvey = null;
        };
        ChtnHomeController.prototype.onTestPayAmtChange = function () {
            this.testPay_isValid = this.testPay_Amt > 5 && this.testPay_Amt < 5000;
        };
        ChtnHomeController.prototype.hideFirstVisit = function () {
            this.$rootScope.hasClosedFirstVisitModal = true;
            this.showFirstVisitModal = false;
        };
        ChtnHomeController.$inject = ["$http", "$rootScope", "SiteInfo", "$timeout", "$scope", "$routeParams", "$sce"];
        return ChtnHomeController;
    }());
    Ally.ChtnHomeController = ChtnHomeController;
    var AllySurveyInfo = /** @class */ (function () {
        function AllySurveyInfo() {
        }
        return AllySurveyInfo;
    }());
})(Ally || (Ally = {}));
CA.angularApp.component("chtnHome", {
    templateUrl: "/ngApp/chtn/member/chtn-home.html",
    controller: Ally.ChtnHomeController
});

var Ally;
(function (Ally) {
    var WelcomeTip = /** @class */ (function () {
        function WelcomeTip() {
        }
        return WelcomeTip;
    }());
    /**
     * The controller for the page that shows useful info on a map
     */
    var ChtnMapController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ChtnMapController($scope, $timeout, $http, siteInfo, appCacheService) {
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
        ChtnMapController.prototype.$onInit = function () {
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
            this.$timeout(function () { return innerThis.getWalkScore(); }, 1000);
            MapCtrlMapMgr.Init(this.siteInfo, this.$scope, this);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Populate the page
        ///////////////////////////////////////////////////////////////////////////////////////////////
        ChtnMapController.prototype.refresh = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/WelcomeTip").then(function (httpResponse) {
                _this.tips = httpResponse.data;
                MapCtrlMapMgr.ClearAllMarkers();
                if (AppConfig.appShortName === "condo")
                    MapCtrlMapMgr.AddMarker(MapCtrlMapMgr._homeGpsPos.lat(), MapCtrlMapMgr._homeGpsPos.lng(), "Home", MapCtrlMapMgr.MarkerNumber_Home, null);
                for (var locationIndex = 0; locationIndex < _this.tips.length; ++locationIndex) {
                    var curLocation = _this.tips[locationIndex];
                    if (curLocation.gpsPos === null)
                        continue;
                    curLocation.markerIndex = MapCtrlMapMgr.AddMarker(curLocation.gpsPos.lat, curLocation.gpsPos.lon, curLocation.name, curLocation.markerNumber, null);
                }
                // Add HOA homes
                _.each(_this.hoaHomes, function (home) {
                    if (home.fullAddress && home.fullAddress.gpsPos) {
                        var markerIcon = MapCtrlMapMgr.MarkerNumber_Home;
                        var markerText = home.name;
                        if (_.any(_this.siteInfo.userInfo.usersUnits, function (u) { return u.unitId === home.unitId; })) {
                            markerIcon = MapCtrlMapMgr.MarkerNumber_MyHome;
                            markerText = "Your home: " + markerText;
                        }
                        MapCtrlMapMgr.AddMarker(home.fullAddress.gpsPos.lat, home.fullAddress.gpsPos.lon, markerText, markerIcon, home.unitId);
                    }
                });
                MapCtrlMapMgr.OnMarkersReady();
                _this.isLoading = false;
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to edit a tip
        ///////////////////////////////////////////////////////////////////////////////////////////////
        ChtnMapController.prototype.onEditTip = function (tip) {
            this.editingTip = jQuery.extend({}, tip);
            window.scrollTo(0, document.body.scrollHeight);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to move a tip
        ///////////////////////////////////////////////////////////////////////////////////////////////
        ChtnMapController.prototype.onMoveMarker = function (tip) {
            MapCtrlMapMgr.SetMarkerDraggable(tip.markerIndex, true);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to delete a tip
        ///////////////////////////////////////////////////////////////////////////////////////////////
        ChtnMapController.prototype.onDeleteTip = function (tip) {
            var _this = this;
            if (!confirm('Are you sure you want to delete this item?'))
                return;
            this.isLoading = true;
            this.$http.delete("/api/WelcomeTip/" + tip.itemId).then(function () {
                _this.isLoading = false;
                _this.refresh();
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to add a new tip
        ///////////////////////////////////////////////////////////////////////////////////////////////
        ChtnMapController.prototype.onSaveTip = function () {
            var _this = this;
            if (this.editingTip === null)
                return;
            //$( "#new-item-form" ).validate();
            //if ( !$( "#new-item-form" ).valid() )
            //    return;
            var onSave = function () {
                _this.isLoading = false;
                _this.editingTip = new WelcomeTip();
                _this.refresh();
            };
            var onFailure = function (response) {
                _this.isLoading = false;
                alert("Failed to save item: " + response.data.exceptionMessage);
            };
            this.isLoading = true;
            // If we're editing an existing item
            if (this.editingTip.itemId)
                this.$http.put("/api/WelcomeTip", this.editingTip).then(onSave, onFailure);
            // Otherwise create a new one
            else
                this.$http.post("/api/WelcomeTip", this.editingTip).then(onSave, onFailure);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Used by the ng-repeats to filter locations vs tips
        ///////////////////////////////////////////////////////////////////////////////////////////////
        ChtnMapController.prototype.isLocationTip = function (tip) {
            return tip.gpsPos !== null;
        };
        ChtnMapController.prototype.isNotLocationTip = function (tip) {
            return tip.gpsPos === null;
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Get the URL to the image for a specific marker
        ///////////////////////////////////////////////////////////////////////////////////////////////
        ChtnMapController.prototype.getMarkerIconUrl = function (markerNumber) {
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
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Move a marker's position
        ///////////////////////////////////////////////////////////////////////////////////////////////
        ChtnMapController.prototype.updateItemGpsLocation = function (markerIndex, lat, lon) {
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
        };
        /**
         * Set the walkscore info
         */
        ChtnMapController.prototype.getWalkScore = function () {
            var handleWalkScoreResult = function (httpResponse) {
                if (!httpResponse || !httpResponse.data || httpResponse.data === "Error") {
                    $("#WalkScorePanel").html("Failed to load Walk Score.");
                    $("#WalkScorePanel").hide();
                }
                else
                    $("#WalkScorePanel").html(httpResponse.data);
            };
            this.$http.get("/api/WelcomeTip/GetWalkScore").then(handleWalkScoreResult, handleWalkScoreResult);
        };
        /**
        * Load the houses onto the map
        */
        ChtnMapController.prototype.retrieveHoaHomes = function () {
            var _this = this;
            this.$http.get("/api/BuildingResidents/FullUnits").then(function (httpResponse) {
                if (httpResponse.data) {
                    if (AppConfig.appShortName === "condo") {
                        // Only show homes if our units have an address other than the condo's address
                        var nonMainAddresses = _.filter(httpResponse.data, function (u) { return u.addressId && !!u.fullAddress; });
                        nonMainAddresses = _.filter(nonMainAddresses, function (u) { return u.fullAddress.oneLiner != _this.siteInfo.privateSiteInfo.groupAddress.oneLiner; });
                        if (nonMainAddresses.length > 0)
                            _this.hoaHomes = httpResponse.data;
                    }
                    else if (AppConfig.appShortName === "hoa")
                        _this.hoaHomes = httpResponse.data;
                }
                _this.refresh();
            }, function () {
                _this.refresh();
            });
        };
        ChtnMapController.$inject = ["$scope", "$timeout", "$http", "SiteInfo", "appCacheService"];
        return ChtnMapController;
    }());
    Ally.ChtnMapController = ChtnMapController;
})(Ally || (Ally = {}));
CA.angularApp.component("chtnMap", {
    templateUrl: "/ngApp/chtn/member/chtn-map.html",
    controller: Ally.ChtnMapController
});
var MapCtrlMapMgr = /** @class */ (function () {
    function MapCtrlMapMgr() {
    }
    /**
    * Called when the DOM structure is ready
    */
    MapCtrlMapMgr.Init = function (siteInfo, scope, mapCtrl) {
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
    };
    MapCtrlMapMgr.OnMapReady = function () {
        MapCtrlMapMgr._isMapReady = true;
        if (MapCtrlMapMgr._areMarkersReady)
            MapCtrlMapMgr.OnMapAndMarkersReady();
    };
    MapCtrlMapMgr.OnMarkersReady = function () {
        MapCtrlMapMgr._areMarkersReady = true;
        if (MapCtrlMapMgr._isMapReady)
            MapCtrlMapMgr.OnMapAndMarkersReady();
    };
    MapCtrlMapMgr.OnMapAndMarkersReady = function () {
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
    };
    /**
    * Add a marker to the map
    */
    MapCtrlMapMgr.ClearAllMarkers = function () {
        for (var i = 0; i < MapCtrlMapMgr._markers.length; i++)
            MapCtrlMapMgr._markers[i].setMap(null);
        MapCtrlMapMgr._markers = [];
    };
    /**
    * Make a marker draggable or not
    */
    MapCtrlMapMgr.SetMarkerDraggable = function (markerIndex, isDraggable) {
        MapCtrlMapMgr._markers[markerIndex].setDraggable(isDraggable);
    };
    /**
    * Add a marker to the map and return the index of that new marker
    */
    MapCtrlMapMgr.AddMarker = function (lat, lon, name, markerNumber, unitId) {
        MapCtrlMapMgr._tempMarkers.push({
            lat: lat,
            lon: lon,
            name: name,
            markerNumber: markerNumber,
            unitId: unitId
        });
        return MapCtrlMapMgr._tempMarkers.length - 1;
    };
    /**
    * Set the map zoom so all markers are visible
    */
    MapCtrlMapMgr.ZoomMapToFitMarkers = function () {
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
    };
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
    return MapCtrlMapMgr;
}());

var Ally;
(function (Ally) {
    /**
     * The controller for the page that allows users to reset their password
     */
    var ForgotPasswordController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ForgotPasswordController($http, appCacheService) {
            this.$http = $http;
            this.appCacheService = appCacheService;
            this.isLoading = false;
            this.loginInfo = new Ally.LoginInfo();
            this.shouldHideControls = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ForgotPasswordController.prototype.$onInit = function () {
            this.loginInfo.emailAddress = this.appCacheService.getAndClear("forgotEmail");
        };
        /**
         * Occurs when the user clicks the log-in button
         */
        ForgotPasswordController.prototype.onSubmitEmail = function () {
            var _this = this;
            this.isLoading = true;
            // Retrieve information for the current association
            this.$http.post("/api/Login/Forgot", this.loginInfo).then(function () {
                _this.shouldHideControls = true;
                _this.isLoading = false;
                _this.resultText = "Please check your email for updated login information.";
                _this.resultTextColor = "#00F";
            }, function (httpResponse) {
                _this.isLoading = false;
                _this.resultText = "Failed to process your request: " + httpResponse.data.exceptionMessage;
                _this.resultTextColor = "#F00";
            });
        };
        ForgotPasswordController.$inject = ["$http", "appCacheService"];
        return ForgotPasswordController;
    }());
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
    var GroupMembersController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function GroupMembersController(fellowResidents, siteInfo, appCacheService, $http) {
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
            this.allyAppName = AppConfig.appName;
            this.groupShortName = siteInfo.publicSiteInfo.shortName;
            this.showMemberList = AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club" || AppConfig.appShortName === "pta";
            this.groupEmailDomain = "inmail." + AppConfig.baseTld;
            this.unitPrefix = AppConfig.appShortName === "condo" ? "Unit " : "";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        GroupMembersController.prototype.$onInit = function () {
            var _this = this;
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.fellowResidents.getByUnitsAndResidents().then(function (data) {
                _this.isLoading = false;
                _this.unitList = data.byUnit;
                _this.allResidents = data.residents;
                _this.committees = data.committees;
                if (!_this.allResidents && data.ptaMembers)
                    _this.allResidents = data.ptaMembers;
                // Sort by last name for member lists, first name otherwise
                if (_this.showMemberList)
                    _this.allResidents = _.sortBy(_this.allResidents, function (r) { return (r.lastName || "").toLowerCase(); });
                else
                    _this.allResidents = _.sortBy(_this.allResidents, function (r) { return (r.fullName || "").toLowerCase(); });
                _this.boardMembers = _.filter(_this.allResidents, function (r) { return r.boardPosition !== Ally.FellowResidentsService.BoardPos_None && r.boardPosition !== Ally.FellowResidentsService.BoardPos_PropertyManager; });
                _this.boardPropMgrs = _.filter(_this.allResidents, function (r) { return r.boardPosition === Ally.FellowResidentsService.BoardPos_PropertyManager; });
                _this.boardMessageRecipient = null;
                if (_this.boardMembers.length > 0) {
                    var hasBoardEmail = _.some(_this.boardMembers, function (m) { return m.hasEmail; });
                    if (hasBoardEmail) {
                        _this.boardMessageRecipient = {
                            fullName: "Entire Board",
                            firstName: "everyone on the board",
                            hasEmail: true,
                            userId: GroupMembersController.AllBoardUserId
                        };
                    }
                }
                // Remove board members from the member list
                if (AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club")
                    _this.allResidents = _.filter(_this.allResidents, function (r) { return r.boardPosition === 0; });
                var _loop_1 = function (i) {
                    _this.boardMembers[i].boardPositionName = _.find(Ally.FellowResidentsService.BoardPositionNames, function (bm) { return bm.id === _this.boardMembers[i].boardPosition; }).name;
                };
                for (var i = 0; i < _this.boardMembers.length; ++i) {
                    _loop_1(i);
                }
                _this.boardPropMgrs.forEach(function (bpm) { return bpm.boardPositionName = _.find(Ally.FellowResidentsService.BoardPositionNames, function (bm) { return bm.id === bpm.boardPosition; }).name; });
                var boardSortOrder = [
                    1,
                    64,
                    16,
                    2,
                    4,
                    8,
                    32
                ];
                _this.boardMembers = _.sortBy(_this.boardMembers, function (bm) {
                    var sortIndex = _.indexOf(boardSortOrder, bm.boardPosition);
                    if (sortIndex === -1)
                        sortIndex = 100;
                    return sortIndex;
                });
                var getEmails = function (memo, unit) {
                    Array.prototype.push.apply(memo, unit.owners);
                    return memo;
                };
                _this.allOwners = _.reduce(_this.unitList, getEmails, []);
                _this.allOwners = _.map(_.groupBy(_this.allOwners, function (resident) {
                    return resident.email;
                }), function (grouped) {
                    return grouped[0];
                });
                // Remove duplicates
                _this.allOwnerEmails = _.reduce(_this.allOwners, function (memo, owner) { if (HtmlUtil.isValidString(owner.email)) {
                    memo.push(owner.email);
                } return memo; }, []);
                if (_this.unitList && _this.unitList.length > 0)
                    _this.unitList = Ally.HtmlUtil2.smartSortStreetAddresses(_this.unitList, "name");
                if (_this.committees) {
                    // Only show committees with a contact person
                    //TWC - 10/19/18 - Show committees even without a contact person
                    //this.committees = _.reject( this.committees, c => !c.contactUser );
                    _this.committees = _.sortBy(_this.committees, function (c) { return c.committeeName.toLowerCase(); });
                }
                // If we should scroll to a specific home
                var scrollToUnitId = _this.appCacheService.getAndClear("scrollToUnitId");
                if (scrollToUnitId) {
                    var scrollToElemId_1 = "unit-id-" + scrollToUnitId;
                    setTimeout(function () {
                        document.getElementById(scrollToElemId_1).scrollIntoView();
                        $("#" + scrollToElemId_1).effect("pulsate", { times: 3 }, 2000);
                    }, 300);
                }
                // Populate the email name lists, delayed to help the page render faster
                setTimeout(function () { return _this.loadGroupEmails(); }, 500);
            }, function (httpErrorResponse) {
                alert("Failed to retrieve group members. Please let tech support know via the contact form in the bottom right.");
                console.log("Failed to retrieve group members: " + httpErrorResponse.data.exceptionMessage);
            });
        };
        GroupMembersController.prototype.updateMemberFilter = function () {
            //TODO
            var lowerFilter = (this.memberSearchTerm || '').toLowerCase();
            var filterSearchFiles = function (unitListing) {
                if ((unitListing.name || '').toLowerCase().indexOf(lowerFilter) !== -1)
                    return true;
                return false;
            };
            //this.searchFileList = _.filter( this.fullSearchFileList, filterSearchFiles );
        };
        GroupMembersController.prototype.loadGroupEmails = function () {
            var _this = this;
            this.hasMissingEmails = _.some(this.allResidents, function (r) { return !r.hasEmail; });
            this.groupEmailsLoadError = null;
            this.isLoadingGroupEmails = true;
            this.fellowResidents.getAllGroupEmails().then(function (emailGroups) {
                _this.isLoadingGroupEmails = false;
                _this.emailLists = emailGroups.standardGroups;
                _this.customEmailList = emailGroups.customGroups;
                // Populate custom group email names
                if (_this.customEmailList) {
                    for (var _i = 0, _a = _this.customEmailList; _i < _a.length; _i++) {
                        var curGroupEmail = _a[_i];
                        curGroupEmail.usersFullNames = [];
                        var _loop_2 = function (curGroupMember) {
                            var resident = _this.allResidents.find(function (r) { return r.userId === curGroupMember.userId; });
                            if (resident)
                                curGroupEmail.usersFullNames.push(resident.fullName);
                        };
                        for (var _b = 0, _c = curGroupEmail.members; _b < _c.length; _b++) {
                            var curGroupMember = _c[_b];
                            _loop_2(curGroupMember);
                        }
                    }
                }
                // Hook up the address copy link
                setTimeout(function () {
                    var clipboard = new Clipboard(".clipboard-button");
                    clipboard.on("success", function (e) {
                        Ally.HtmlUtil2.showTooltip(e.trigger, "Copied!");
                        e.clearSelection();
                    });
                    clipboard.on("error", function (e) {
                        Ally.HtmlUtil2.showTooltip(e.trigger, "Auto-copy failed, press CTRL+C now");
                    });
                }, 750);
            }, function (httpResponse) {
                _this.isLoadingGroupEmails = false;
                _this.groupEmailsLoadError = "Failed to load group email addresses: " + httpResponse.data.exceptionMessage;
            });
        };
        /**
        * Called to open the model to create a new custom group email address
        */
        GroupMembersController.prototype.onAddNewCustomEmailGroup = function () {
            this.shouldShowNewCustomEmailModal = true;
            this.editGroupEmailInfo = new SaveEmailGroupInfo();
            this.allResidents.forEach(function (r) { return r.isAssociated = false; });
            window.setTimeout(function () { return document.getElementById("custom-group-email-short-name-text").focus(); }, 50);
        };
        /**
        * Called to toggle membership in a custom group email address
        */
        GroupMembersController.prototype.onGroupEmailMemberClicked = function (resident) {
            // Add the user ID if it's not already in the list, remove it if it is
            var existingMemberIdIndex = this.editGroupEmailInfo.memberUserIds.indexOf(resident.userId);
            if (existingMemberIdIndex === -1)
                this.editGroupEmailInfo.memberUserIds.push(resident.userId);
            else
                this.editGroupEmailInfo.memberUserIds.splice(existingMemberIdIndex, 1);
        };
        /**
        * Called to save a custom group email address
        */
        GroupMembersController.prototype.saveGroupEmailInfo = function () {
            var _this = this;
            this.isLoadingSaveEmailGroup = true;
            this.groupEmailSaveError = null;
            var onSave = function () {
                _this.isLoadingSaveEmailGroup = false;
                _this.shouldShowNewCustomEmailModal = false;
                _this.editGroupEmailInfo = null;
                // Refresh the emails, clear the cache first since we added a new group email address
                _this.fellowResidents.clearResidentCache();
                _this.loadGroupEmails();
            };
            var onError = function (httpResponse) {
                _this.isLoadingSaveEmailGroup = false;
                _this.groupEmailSaveError = "Failed to process your request: " + httpResponse.data.exceptionMessage;
            };
            if (this.editGroupEmailInfo.existingGroupEmailId)
                this.$http.put("/api/BuildingResidents/EditCustomGroupEmail", this.editGroupEmailInfo).then(onSave, onError);
            else
                this.$http.post("/api/BuildingResidents/NewCustomGroupEmail", this.editGroupEmailInfo).then(onSave, onError);
        };
        /**
        * Called when the user clicks the button to edit a custom group email address
        */
        GroupMembersController.prototype.editGroupEmail = function (groupEmail) {
            var _this = this;
            this.shouldShowNewCustomEmailModal = true;
            this.editGroupEmailInfo = new SaveEmailGroupInfo();
            this.editGroupEmailInfo.existingGroupEmailId = groupEmail.customGroupEmailId;
            this.editGroupEmailInfo.description = groupEmail.description;
            this.editGroupEmailInfo.shortName = groupEmail.shortName;
            this.editGroupEmailInfo.memberUserIds = groupEmail.members.map(function (m) { return m.userId; });
            this.allResidents.forEach(function (r) { return r.isAssociated = _this.editGroupEmailInfo.memberUserIds.indexOf(r.userId) !== -1; });
            window.setTimeout(function () { return document.getElementById("custom-group-email-short-name-text").focus(); }, 50);
        };
        /**
        * Called when the user clicks the button to delete a custom group email address
        */
        GroupMembersController.prototype.deleteGroupEmail = function (groupEmail) {
            var _this = this;
            if (!confirm("Are you sure you want to delete this group email address? Emails sent to this address will no longer be delivered."))
                return;
            this.isLoadingGroupEmails = true;
            this.$http.delete("/api/BuildingResidents/DeleteCustomGroupEmail/" + groupEmail.customGroupEmailId).then(function () {
                _this.isLoadingGroupEmails = false;
                // Refresh the emails, clear the cache first since we added a new email group
                _this.fellowResidents.clearResidentCache();
                _this.loadGroupEmails();
            }, function (httpResponse) {
                _this.isLoadingGroupEmails = false;
                _this.groupEmailSaveError = "Failed to process your request: " + httpResponse.data.exceptionMessage;
            });
        };
        GroupMembersController.$inject = ["fellowResidents", "SiteInfo", "appCacheService", "$http"];
        GroupMembersController.AllBoardUserId = "af615460-d92f-4878-9dfa-d5e4a9b1f488";
        return GroupMembersController;
    }());
    Ally.GroupMembersController = GroupMembersController;
    var SaveEmailGroupInfo = /** @class */ (function () {
        function SaveEmailGroupInfo() {
            this.memberUserIds = [];
        }
        return SaveEmailGroupInfo;
    }());
})(Ally || (Ally = {}));
CA.angularApp.component("groupMembers", {
    templateUrl: "/ngApp/chtn/member/group-members.html",
    controller: Ally.GroupMembersController
});

var Ally;
(function (Ally) {
    var HelpSendInfo = /** @class */ (function () {
        function HelpSendInfo() {
        }
        return HelpSendInfo;
    }());
    /**
     * The controller for the page that allows users to submit feedback
     */
    var HelpFormController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function HelpFormController($http, siteInfo) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.sendInfo = new HelpSendInfo();
            this.isLoading = false;
            this.wasMessageSent = false;
            /**
             * Occurs when the user clicks the log-in button
             */
            this.onSendHelp = function () {
                $("#help-form").validate();
                if (!$("#help-form").valid())
                    return;
                this.isLoading = true;
                // Retrieve information for the current association
                var innerThis = this;
                this.$http.post("/api/Help", this.sendInfo).then(function () {
                    innerThis.isLoading = false;
                    innerThis.sendInfo = {};
                    innerThis.wasMessageSent = true;
                    innerThis.resultStyle.color = "#00F";
                    innerThis.sendResult = "Your message has been sent. We'll do our best to get back to you within 24 hours.";
                }, function () {
                    innerThis.isLoading = false;
                    innerThis.resultStyle.color = "#F00";
                    innerThis.sendResult = "Failed to send message.";
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
        HelpFormController.prototype.$onInit = function () {
            if (this.siteInfo.isLoggedIn)
                this.sendInfo.emailAddress = this.siteInfo.userInfo.emailAddress;
        };
        HelpFormController.$inject = ["$http", "SiteInfo"];
        return HelpFormController;
    }());
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
    var LogbookController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function LogbookController($scope, $timeout, $http, $rootScope, $q, fellowResidents, siteInfo) {
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
        LogbookController.prototype.getTimezoneAbbreviation = function (timeZoneIana) {
            if (timeZoneIana === void 0) { timeZoneIana = null; }
            // Need to cast moment to any because we don't have the tz typedef file
            var tempMoment = moment();
            if (!timeZoneIana)
                timeZoneIana = moment.tz.guess();
            var timeZoneInfo = tempMoment.tz(timeZoneIana);
            var timeZoneAbbreviation = timeZoneInfo.format('z');
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
        };
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        LogbookController.prototype.$onInit = function () {
            var _this = this;
            this.currentTimeZoneAbbreviation = this.getTimezoneAbbreviation();
            if (this.siteInfo.privateSiteInfo.groupAddress && this.siteInfo.privateSiteInfo.groupAddress.timeZoneIana) {
                this.groupTimeZoneAbbreviation = this.getTimezoneAbbreviation(this.siteInfo.privateSiteInfo.groupAddress.timeZoneIana);
                if (this.groupTimeZoneAbbreviation != this.currentTimeZoneAbbreviation)
                    this.localTimeZoneDiffersFromGroup = true;
            }
            if (AppConfig.isChtnSite) {
                this.fellowResidents.getResidents().then(function (residents) {
                    _this.residents = residents;
                    _this.residents = _.sortBy(_this.residents, function (r) { return r.lastName; });
                });
            }
            var innerThis = this;
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
                viewRender: function (view, element) {
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
                        events: function (start, end, timezone, callback) {
                            innerThis.getAssociationEvents(start, end, timezone, callback);
                        }
                    },
                    {
                        events: function (start, end, timezone, callback) {
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
            this.fellowResidents.getGroupEmailObject().then(function (emailList) {
                _this.associatedGroups = emailList.map(function (e) {
                    var isCustomRecipientGroup = e.recipientType.toUpperCase() === Ally.FellowResidentsService.CustomRecipientType;
                    return {
                        groupShortName: isCustomRecipientGroup ? ("custom:" + e.recipientTypeName) : e.recipientType,
                        displayLabel: e.displayName,
                        isAssociated: false
                    };
                });
                _this.associatedGroups.push({ displayLabel: _this.GroupShortNameIndividuals, groupShortName: _this.GroupShortNameIndividuals, isAssociated: false });
            });
        };
        LogbookController.prototype.getAllEvents = function (startDate, endDate) {
            var _this = this;
            var loadNewsToCalendar = false;
            var loadLogbookToCalendar = false;
            var loadPollsToCalendar = AppConfig.isChtnSite;
            //var firstDay = moment().startOf( "month" ).format( DateFormat );
            //var lastDay = moment().add( 1, "month" ).startOf( "month" ).format( DateFormat );
            var firstDay = startDate.format(LogbookController.DateFormat);
            var lastDay = endDate.format(LogbookController.DateFormat);
            var newsDeferred = this.$q.defer();
            var logbookDeferred = this.$q.defer();
            var pollDeferred = this.$q.defer();
            if (loadNewsToCalendar) {
                this.isLoadingNews = true;
                this.$http.get("/api/News/WithinDates?startDate=" + firstDay + "&endDate=" + lastDay).then(function (httpResponse) {
                    var data = httpResponse.data;
                    _this.isLoadingNews = false;
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
                }, function () {
                    _this.isLoadingNews = false;
                    newsDeferred.resolve();
                });
            }
            else
                newsDeferred.resolve();
            if (loadLogbookToCalendar) {
                this.isLoadingLogbookForCalendar = true;
                this.$http.get("/api/Logbook?startDate=" + firstDay + "&endDate=" + lastDay).then(function (httpResponse) {
                    var data = httpResponse.data;
                    _this.isLoadingLogbookForCalendar = false;
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
                }, function () {
                    _this.isLoadingLogbookForCalendar = false;
                    logbookDeferred.resolve();
                });
            }
            else
                logbookDeferred.resolve();
            if (loadPollsToCalendar) {
                this.isLoadingPolls = true;
                this.$http.get("/api/Poll/DateRange?startDate=" + firstDay + "&endDate=" + lastDay).then(function (httpResponse) {
                    var data = httpResponse.data;
                    _this.isLoadingPolls = false;
                    _.each(data, function (entry) {
                        var shortText = entry.text;
                        if (shortText.length > 10)
                            shortText = shortText.substring(0, 10) + "...";
                        var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.text + "</p>";
                        _this.calendarEvents.push({
                            title: "Poll: " + shortText,
                            start: moment(entry.postDate).toDate(),
                            calendarEventObject: null,
                            toolTipTitle: "Poll Added",
                            fullDescription: fullDescription,
                            allDay: false
                        });
                    });
                    pollDeferred.resolve();
                }, function () {
                    _this.isLoadingPolls = false;
                    pollDeferred.resolve();
                });
            }
            else
                pollDeferred.resolve();
            return this.$q.all([newsDeferred.promise, logbookDeferred.promise, pollDeferred.promise]);
        };
        LogbookController.prototype.getAssociationEvents = function (start, end, timezone, callback) {
            var _this = this;
            if (this.onlyRefreshCalendarEvents) {
                this.onlyRefreshCalendarEvents = undefined;
                callback(this.calendarEvents);
                return;
            }
            this.calendarEvents = [];
            this.getAllEvents(start, end).then(function () {
                callback(_this.calendarEvents);
            });
        };
        LogbookController.prototype.getCalendarEvents = function (start, end, timezone, callback) {
            var _this = this;
            this.isLoadingCalendarEvents = true;
            var firstDay = start.format(LogbookController.DateFormat);
            var lastDay = end.format(LogbookController.DateFormat);
            this.$http.get("/api/CalendarEvent?startDate=" + firstDay + "&endDate=" + lastDay).then(function (httpResponse) {
                var associationEvents = [];
                _this.isLoadingCalendarEvents = false;
                _.each(httpResponse.data, function (entry) {
                    var utcEventDate = moment.utc(entry.eventDateUtc);
                    var utcTimeOnly = utcEventDate.format(LogbookController.TimeFormat);
                    var isAllDay = utcTimeOnly == LogbookController.NoTime;
                    var dateEntry;
                    if (isAllDay) {
                        entry.timeOnly = "";
                        entry.dateOnly = new Date(utcEventDate.year(), utcEventDate.month(), utcEventDate.date());
                        dateEntry = new Date(utcEventDate.year(), utcEventDate.month(), utcEventDate.date());
                    }
                    else {
                        var localDate = moment.utc(entry.eventDateUtc).local();
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
            }, function () {
                _this.isLoadingCalendarEvents = false;
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks a user in the calendar event modal
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LogbookController.prototype.onResidentClicked = function (resident) {
            if (!resident.hasEmail) {
                alert("That user cannot be included because they do not have an email address on file.");
                resident.isAssociated = false;
                return;
            }
            var alreadyExists = _.contains(this.editEvent.associatedUserIds, resident.userId);
            if (alreadyExists)
                this.editEvent.associatedUserIds = _.without(this.editEvent.associatedUserIds, resident.userId);
            else
                this.editEvent.associatedUserIds.push(resident.userId);
        };
        LogbookController.prototype.isDateInPast = function (date) {
            var momentDate = moment(date);
            var today = moment();
            return momentDate.isBefore(today, 'day') || momentDate.isSame(today, 'day');
        };
        LogbookController.prototype.onShouldSendChange = function () {
            // Don't allow the user to send remdiner emails for past dates
            if (this.editEvent.shouldSendNotification && this.isDateInPast(this.editEvent.dateOnly))
                this.editEvent.shouldSendNotification = false;
            else if (!this.editEvent.notificationEmailDaysBefore)
                this.editEvent.notificationEmailDaysBefore = 1;
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user changes the "days before" email setting
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LogbookController.prototype.onChangeEmailDaysBefore = function () {
            var notificationDate = moment(this.editEvent.dateOnly).subtract(this.editEvent.notificationEmailDaysBefore, 'day');
            var today = moment();
            this.showBadNotificationDateWarning = notificationDate.isBefore(today, 'day') || notificationDate.isSame(today, 'day');
            if (this.showBadNotificationDateWarning) {
                this.maxDaysBack = moment(this.editEvent.dateOnly).diff(today, 'day');
                this.editEvent.notificationEmailDaysBefore = this.maxDaysBack;
                this.$timeout(function () { this.showBadNotificationDateWarning = false; }, 10000);
            }
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Show the full calendar event edit modal
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LogbookController.prototype.expandCalendarEventModel = function () {
            this.showExpandedCalendarEventModel = true;
            this.hookUpWysiwyg();
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Wire up the WYSIWYG description editor
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LogbookController.prototype.hookUpWysiwyg = function () {
            var _this = this;
            this.$timeout(function () {
                Ally.HtmlUtil2.initTinyMce("tiny-mce-editor", 200, { menubar: false }).then(function (e) {
                    _this.tinyMceEditor = e;
                    if (_this.editEvent && _this.editEvent.description)
                        _this.tinyMceEditor.setContent(_this.editEvent.description);
                    else
                        _this.tinyMceEditor.setContent("");
                });
            }, 100);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Set the calendar event for us to edit
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LogbookController.prototype.setEditEvent = function (eventObject, showDetails) {
            var _this = this;
            this.showExpandedCalendarEventModel = showDetails || false;
            this.editEvent = eventObject;
            // Clear this warning in case the user is clicking around quickly
            this.showBadNotificationDateWarning = false;
            if (this.editEvent) {
                // Simplify the UI logic by transforming this input
                if (this.residents) {
                    this.residents.forEach(function (r) { return r.isAssociated = false; });
                    if (this.editEvent.associatedUserIds)
                        this.residents.filter(function (r) { return _this.editEvent.associatedUserIds.indexOf(r.userId) !== -1; }).forEach(function (r) { return r.isAssociated = true; });
                }
                // Set the checked status for the associated groups
                if (this.editEvent.associatedGroupShortNames) {
                    this.associatedGroups.forEach(function (ag) {
                        ag.isAssociated = _this.editEvent.associatedGroupShortNames.indexOf(ag.groupShortName) !== -1;
                    });
                }
                else
                    this.associatedGroups.forEach(function (ag) { return ag.isAssociated = false; });
                this.editEvent.associatedGroupShortNames = this.associatedGroups.filter(function (ag) { return ag.isAssociated; }).map(function (ag) { return ag.groupShortName; });
                this.editEvent.shouldSendNotification = this.editEvent.notificationEmailDaysBefore !== null;
                // Set focus on the title so it's user friendly and ng-escape needs an input focused
                // to work
                setTimeout(function () { $("#calendar-event-title").focus(); }, 10);
                if (this.showExpandedCalendarEventModel)
                    this.hookUpWysiwyg();
            }
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Delete the calendar event that's being viewed
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LogbookController.prototype.deleteCalendarEvent = function (eventId) {
            var _this = this;
            if (!confirm("Are you sure you want to remove this event?"))
                return;
            this.isLoadingCalendarEvents = true;
            this.$http.delete("/api/CalendarEvent?eventId=" + eventId).then(function () {
                _this.isLoadingCalendarEvents = false;
                _this.editEvent = null;
                _this.onlyRefreshCalendarEvents = true;
                $('#log-calendar').fullCalendar('refetchEvents');
            }, function () {
                _this.isLoadingCalendarEvents = false;
                alert("Failed to delete the calendar event.");
            });
        };
        LogbookController.prototype.getDaysBeforeValue = function () {
            var daysBefore = null;
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
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Save the calendar event that's being viewed
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LogbookController.prototype.saveCalendarEvent = function () {
            var _this = this;
            if (!Ally.HtmlUtil2.isValidString(this.editEvent.title)) {
                alert("Please enter a title in the 'what' field");
                return;
            }
            if (this.tinyMceEditor)
                this.editEvent.description = this.tinyMceEditor.getContent();
            // Ensure the user enters a 'days before' email setting
            if (this.editEvent.shouldSendNotification) {
                var daysBefore = this.getDaysBeforeValue();
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
            this.editEvent.associatedGroupShortNames = this.associatedGroups.filter(function (ag) { return ag.isAssociated; }).map(function (ag) { return ag.groupShortName; });
            var httpFunc;
            if (this.editEvent.eventId)
                httpFunc = this.$http.put;
            else
                httpFunc = this.$http.post;
            analytics.track("addCalendarEvent");
            this.isLoadingCalendarEvents = true;
            httpFunc("/api/CalendarEvent", this.editEvent).then(function () {
                _this.isLoadingCalendarEvents = false;
                _this.editEvent = null;
                _this.onlyRefreshCalendarEvents = true;
                $('#log-calendar').fullCalendar('refetchEvents');
            }, function (httpResponse) {
                _this.isLoadingCalendarEvents = false;
                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to save the calendar event: " + errorMessage);
            });
        };
        LogbookController.prototype.getNumSelectedIndividuals = function () {
            return this.residents.filter(function (r) { return r.isAssociated; }).length;
        };
        LogbookController.prototype.getNumSelectedGroups = function () {
            return this.associatedGroups.filter(function (g) { return g.isAssociated; }).length;
        };
        LogbookController.$inject = ["$scope", "$timeout", "$http", "$rootScope", "$q", "fellowResidents", "SiteInfo"];
        LogbookController.DateFormat = "YYYY-MM-DD";
        LogbookController.TimeFormat = "h:mma";
        LogbookController.NoTime = "12:37am";
        return LogbookController;
    }());
    Ally.LogbookController = LogbookController;
    var AssociatedGroup = /** @class */ (function () {
        function AssociatedGroup() {
        }
        return AssociatedGroup;
    }());
    var CalendarEvent = /** @class */ (function () {
        function CalendarEvent() {
        }
        return CalendarEvent;
    }());
})(Ally || (Ally = {}));
CA.angularApp.component("logbookPage", {
    templateUrl: "/ngApp/chtn/member/logbook.html",
    controller: Ally.LogbookController
});

var Ally;
(function (Ally) {
    var LoginInfo = /** @class */ (function () {
        function LoginInfo() {
            this.emailAddress = "";
            this.password = "";
        }
        return LoginInfo;
    }());
    Ally.LoginInfo = LoginInfo;
    /**
     * The controller for the login page
     */
    var LoginController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function LoginController($http, $rootScope, $location, appCacheService, siteInfo, xdLocalStorage) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.$location = $location;
            this.appCacheService = appCacheService;
            this.siteInfo = siteInfo;
            this.xdLocalStorage = xdLocalStorage;
            this.isDemoSite = false;
            this.loginInfo = new LoginInfo();
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        LoginController.prototype.$onInit = function () {
            if (!HtmlUtil.isLocalStorageAllowed())
                this.loginResult = "You have cookies/local storage disabled. Condo Ally requires these features, please enable to continue. You may be in private browsing mode.";
            var nav = navigator.userAgent.toLowerCase();
            var ieVersion = (nav.indexOf('msie') != -1) ? parseInt(nav.split('msie')[1]) : 0;
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
                var savedWelcomeImageWidth = window.localStorage["welcomeImage_width"];
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
                    this.loginResult = "You are not authorized to perform that action. Please contact support.";
                else
                    this.loginResult = "You are not authorized to perform that action. Please contact an admin.";
            }
            // Or if we got sent here for a 401
            else if (this.appCacheService.getAndClear(AppCacheService.Key_WasLoggedIn401) === "true")
                this.loginResult = "Please login first.";
            // Focus on the email text box
            setTimeout(function () {
                $("#login-email-textbox").focus();
            }, 200);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the welcome image loads
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LoginController.prototype.onWelcomeImageLoaded = function (event) {
            var welcomeImageElem = document.getElementById("welcome-image");
            //console.log( `Welcome image loaded ${welcomeImageElem.width}x${welcomeImageElem.height}` );
            window.localStorage["welcomeImage_width"] = welcomeImageElem.naturalWidth;
            window.localStorage["welcomeImage_height"] = welcomeImageElem.naturalHeight;
            this.welcomeImageContainerStyle["width"] = welcomeImageElem.naturalWidth + "px";
            this.welcomeImageContainerStyle["height"] = "auto";
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the welcome image fails to load
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LoginController.prototype.onWelcomeImageError = function () {
            var welcomeImageElem = document.getElementById("welcome-image");
            console.log("Welcome image error");
            window.localStorage.removeItem("welcomeImage_width");
            window.localStorage.removeItem("welcomeImage_height");
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button when they forgot their password
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LoginController.prototype.onForgotPassword = function () {
            this.appCacheService.set("forgotEmail", this.loginInfo.emailAddress);
            this.$location.path("/ForgotPassword");
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Log-in 
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LoginController.prototype.demoLogin = function () {
            this.loginInfo = {
                emailAddress: "testuser",
                password: "demosite"
            };
            this.onLogin();
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the log-in button
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LoginController.prototype.onLogin = function () {
            this.isLoading = true;
            // Retrieve information for the current association
            var innerThis = this;
            this.$http.post("/api/Login", this.loginInfo).then(function (httpResponse) {
                innerThis.isLoading = false;
                var data = httpResponse.data;
                var redirectPath = innerThis.appCacheService.getAndClear(AppCacheService.Key_AfterLoginRedirect);
                innerThis.siteInfo.setAuthToken(data.authToken);
                innerThis.siteInfo.handleSiteInfo(data.siteInfo, innerThis.$rootScope);
                if (innerThis.rememberMe) {
                    window.localStorage["rememberMe_Email"] = innerThis.loginInfo.emailAddress;
                    window.localStorage["rememberMe_Password"] = btoa(innerThis.loginInfo.password);
                }
                else {
                    window.localStorage["rememberMe_Email"] = null;
                    window.localStorage["rememberMe_Password"] = null;
                }
                // If the user hasn't accepted the terms yet then make them go to the profile page
                if (!data.siteInfo.userInfo.acceptedTermsDate && !innerThis.isDemoSite)
                    innerThis.$location.path("/MyProfile");
                else {
                    if (!HtmlUtil.isValidString(redirectPath) && redirectPath !== "/Login")
                        redirectPath = "/Home";
                    innerThis.$location.path(redirectPath);
                }
            }, function (httpResponse) {
                innerThis.isLoading = false;
                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                innerThis.loginResult = "Failed to log in: " + errorMessage;
            });
        };
        LoginController.$inject = ["$http", "$rootScope", "$location", "appCacheService", "SiteInfo", "xdLocalStorage"];
        return LoginController;
    }());
    Ally.LoginController = LoginController;
})(Ally || (Ally = {}));
CA.angularApp.component("loginPage", {
    templateUrl: "/ngApp/chtn/member/login.html",
    controller: Ally.LoginController
});

var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Ally;
(function (Ally) {
    var SimpleUserEntry = /** @class */ (function () {
        function SimpleUserEntry() {
        }
        return SimpleUserEntry;
    }());
    Ally.SimpleUserEntry = SimpleUserEntry;
    var SimpleUserEntryWithTerms = /** @class */ (function (_super) {
        __extends(SimpleUserEntryWithTerms, _super);
        function SimpleUserEntryWithTerms() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return SimpleUserEntryWithTerms;
    }(SimpleUserEntry));
    Ally.SimpleUserEntryWithTerms = SimpleUserEntryWithTerms;
    var ProfileUserInfo = /** @class */ (function (_super) {
        __extends(ProfileUserInfo, _super);
        function ProfileUserInfo() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return ProfileUserInfo;
    }(SimpleUserEntryWithTerms));
    var PtaMember = /** @class */ (function (_super) {
        __extends(PtaMember, _super);
        function PtaMember() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return PtaMember;
    }(SimpleUserEntry));
    Ally.PtaMember = PtaMember;
    /**
     * The controller for the profile page
     */
    var MyProfileController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function MyProfileController($rootScope, $http, $location, appCacheService, siteInfo, $scope) {
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
        MyProfileController.prototype.$onInit = function () {
            var _this = this;
            this.isDemoSite = HtmlUtil.getSubdomain() === "demosite";
            if (this.siteInfo.privateSiteInfo)
                this.canHideContactInfo = this.siteInfo.privateSiteInfo.canHideContactInfo;
            this.retrieveProfileData();
            var hookUpPhotoFileUpload = function () {
                var uploader = $('#JQFileUploader');
                uploader.fileupload({
                    dropZone: null,
                    pasteZone: null,
                    add: function (e, data) {
                        data.url = "api/DocumentUpload/ProfileImage?ApiAuthToken=" + _this.siteInfo.authToken;
                        if (_this.siteInfo.publicSiteInfo.baseApiUrl)
                            data.url = _this.siteInfo.publicSiteInfo.baseApiUrl + "DocumentUpload/ProfileImage";
                        _this.$scope.$apply(function () { return _this.isLoading = true; });
                        var xhr = data.submit();
                        xhr.done(function (result) {
                            _this.$scope.$apply(function () {
                                // Reload the page to see the changes
                                window.location.reload();
                            });
                        });
                    },
                    beforeSend: function (xhr) {
                        if (_this.siteInfo.publicSiteInfo.baseApiUrl)
                            xhr.setRequestHeader("Authorization", "Bearer " + _this.$rootScope.authToken);
                        else
                            xhr.setRequestHeader("ApiAuthToken", _this.$rootScope.authToken);
                    },
                    fail: function (e, data) {
                        _this.$scope.$apply(function () {
                            _this.isLoading = false;
                            alert("Upload Failed: " + data.jqXHR.responseJSON.exceptionMessage);
                        });
                    }
                });
            };
            setTimeout(hookUpPhotoFileUpload, 500);
        };
        /**
         * Save the user's profile photo setting
         */
        MyProfileController.prototype.saveProfilePhoto = function (type) {
            var _this = this;
            if (this.initialProfileImageType === "upload") {
                if (!confirm("Are you sure you want to change your profile image away from your uploaded photo? Your uploaded photo will be deleted.")) {
                    this.profileImageType = this.initialProfileImageType;
                    return;
                }
            }
            this.isLoading = true;
            this.$http.put("/api/MyProfile/ProfileImage?type=" + type, null).then(function () {
                _this.isLoading = false;
                _this.initialProfileImageType = _this.profileImageType;
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user checks to box to see what they're typing
         */
        MyProfileController.prototype.onShowPassword = function () {
            var passwordTextBox = document.getElementById("passwordTextBox");
            passwordTextBox.type = this.shouldShowPassword ? "text" : "password";
        };
        /**
         * Populate the page
         */
        MyProfileController.prototype.retrieveProfileData = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/MyProfile").then(function (httpResponse) {
                _this.isLoading = false;
                _this.profileInfo = httpResponse.data;
                _this.initialProfileImageType = "blank";
                if (!_this.profileInfo.avatarUrl || _this.profileInfo.avatarUrl.indexOf("blank-headshot") !== -1)
                    _this.initialProfileImageType = "blank";
                else if (_this.profileInfo.avatarUrl && _this.profileInfo.avatarUrl.indexOf("gravatar") !== -1)
                    _this.initialProfileImageType = "gravatar";
                else if (_this.profileInfo.avatarUrl && _this.profileInfo.avatarUrl.length > 0)
                    _this.initialProfileImageType = "upload";
                if (_this.initialProfileImageType !== "upload")
                    _this.profileInfo.avatarUrl = null;
                _this.profileImageType = _this.initialProfileImageType;
                _this.gravatarUrl = "https://www.gravatar.com/avatar/" + md5((_this.profileInfo.email || "").toLowerCase()) + "?s=80&d=identicon";
                // Don't show empty email address
                if (HtmlUtil.endsWith(_this.profileInfo.email, "@condoally.com"))
                    _this.profileInfo.email = "";
                _this.needsToAcceptTerms = _this.profileInfo.acceptedTermsDate === null && !_this.isDemoSite;
                _this.hasAcceptedTerms = !_this.needsToAcceptTerms; // Gets set by the checkbox
                _this.$rootScope.shouldHideMenu = _this.needsToAcceptTerms;
                // Was used before, here for convenience
                _this.saveButtonStyle = {
                    width: "100px",
                    "font-size": "1em"
                };
            });
        };
        /**
         * Occurs when the user hits the save button
         */
        MyProfileController.prototype.onSaveInfo = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.put("/api/MyProfile", this.profileInfo).then(function () {
                _this.profileInfo.password = null;
                _this.resultMessage = "Your changes have been saved.";
                // $rootScope.hideMenu is true when this is the user's first login
                if (_this.$rootScope.shouldHideMenu) {
                    _this.$rootScope.shouldHideMenu = false;
                    _this.$location.path("/Home");
                }
                _this.isLoading = false;
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user modifies the password field
         */
        MyProfileController.prototype.onPasswordChange = function () {
            if (!this.profileInfo.password || this.profileInfo.password.length < 6) {
                this.passwordComplexity = "short";
                return;
            }
            var hasLetter = !!this.profileInfo.password.match(/[a-z]+/i);
            var hasNumber = !!this.profileInfo.password.match(/[0-9]+/);
            var hasSymbol = !!this.profileInfo.password.match(/[^a-z0-9]+/i);
            var isComplex = this.profileInfo.password.length >= 12
                && hasLetter
                && hasNumber
                && hasSymbol;
            this.passwordComplexity = isComplex ? "complex" : "simple";
        };
        MyProfileController.$inject = ["$rootScope", "$http", "$location", "appCacheService", "SiteInfo", "$scope"];
        return MyProfileController;
    }());
    Ally.MyProfileController = MyProfileController;
})(Ally || (Ally = {}));
CA.angularApp.component("myProfile", {
    templateUrl: "/ngApp/chtn/member/my-profile.html",
    controller: Ally.MyProfileController
});

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
var Ally;
(function (Ally) {
    var CondoSignUpWizardController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function CondoSignUpWizardController($scope, $http, $timeout, WizardHandler) {
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
        CondoSignUpWizardController.prototype.$onInit = function () {
            var _this = this;
            var innerThis = this;
            var onReady = function () {
                innerThis.init();
            };
            this.$timeout(onReady, 500);
            this.$scope.$on('wizard:stepChanged', function (event, args) {
                if (args.index === 2)
                    _this.$timeout(function () { return grecaptcha.render("recaptcha-check-elem"); }, 50);
            });
        };
        /**
         * Occurs when the user changes the number of units
         */
        CondoSignUpWizardController.prototype.onNumUnitsChanged = function () {
            if (!this.numUnits)
                return;
            if (this.numUnits < 1)
                this.numUnits = 1;
            else if (this.numUnits > 100)
                this.numUnits = 100;
            var numNewUnits = this.numUnits - this.signUpInfo.buildings[0].units.length;
            this.signUpInfo.buildings[0].units.length = this.numUnits;
            if (numNewUnits > 0) {
                for (var i = this.numUnits - numNewUnits; i < this.numUnits; ++i) {
                    this.signUpInfo.buildings[0].units[i] = {
                        name: this.getUnitName(i),
                        residents: [{}]
                    };
                }
            }
        };
        /**
         * Occurs as the user presses keys in the association name field
         */
        CondoSignUpWizardController.prototype.onAssociationNameChanged = function () {
            if (!this.signUpInfo || !this.signUpInfo.name) {
                this.shouldShowHoaMessage = false;
                return;
            }
            this.shouldShowHoaMessage = this.signUpInfo.name.toLowerCase().indexOf("hoa") !== -1
                || this.signUpInfo.name.toLowerCase().indexOf("home") !== -1;
        };
        CondoSignUpWizardController.prototype.addResident = function (unit) {
            if (!unit.residents)
                unit.residents = [];
            unit.residents.push({});
        };
        ;
        /**
         * Get the unit name based on its index and the numbering type
         */
        CondoSignUpWizardController.prototype.getUnitName = function (unitIndex) {
            if (this.unitNumberingType === "Numbered")
                return (unitIndex + 1).toString();
            else if (this.unitNumberingType === "Lettered") {
                var unitName = "";
                // If we've gone passed 26 units, then start adding double characters
                var numLoopAlphabets = Math.floor(unitIndex / 26);
                if (numLoopAlphabets > 0)
                    unitName += String.fromCharCode("A".charCodeAt(0) + (numLoopAlphabets - 1));
                var letterIndex = unitIndex % 26;
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
        };
        ;
        /**
         * Occurs when the user changes the unit numbering type
         */
        CondoSignUpWizardController.prototype.onNumberingTypeChange = function () {
            for (var i = 0; i < this.signUpInfo.buildings[0].units.length; ++i) {
                if (!this.signUpInfo.buildings[0].units[i])
                    this.signUpInfo.buildings[0].units[i] = {};
                this.signUpInfo.buildings[0].units[i].name = this.getUnitName(i);
            }
        };
        /**
         * Occurs when the user changes the unit numbering type
         */
        CondoSignUpWizardController.prototype.centerMap = function (geometry) {
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
        };
        ;
        /**
         * Occurs when the user selects an address from the Google suggestions
         */
        CondoSignUpWizardController.prototype.setPlaceWasSelected = function () {
            this.placeWasSelected = true;
            this.shouldCheckAddress = false;
            // Clear the flag in case the user types in a new address
            var innerThis = this;
            setTimeout(function () {
                innerThis.placeWasSelected = true;
            }, 500);
        };
        ;
        /**
         * Perform any needed initialization
         */
        CondoSignUpWizardController.prototype.init = function () {
            if (typeof (window.analytics) !== "undefined")
                window.analytics.track("condoSignUpStarted", {
                    category: "SignUp",
                    label: "Started"
                });
            var mapDiv = document.getElementById("address-map");
            this.map = new google.maps.Map(mapDiv, {
                center: { lat: 41.869638, lng: -87.657423 },
                zoom: 9
            });
            var addressInput = document.getElementById("building-0-address-text-box");
            this.addressAutocomplete = new google.maps.places.Autocomplete(addressInput);
            this.addressAutocomplete.bindTo('bounds', this.map);
            this.mapMarker = new google.maps.Marker({
                map: this.map,
                position: null,
                anchorPoint: new google.maps.Point(41.969638, -87.657423),
                icon: "/assets/images/MapMarkers/MapMarker_Home.png"
            });
            // Occurs when the user selects a Google suggested address
            var innerThis = this;
            this.addressAutocomplete.addListener('place_changed', function () {
                innerThis.setPlaceWasSelected();
                //infowindow.close();
                innerThis.mapMarker.setVisible(false);
                var place = innerThis.addressAutocomplete.getPlace();
                var readableAddress = place.formatted_address;
                // Remove the trailing country if it's USA
                if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                    readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                innerThis.signUpInfo.buildings[0].streetAddress = readableAddress;
                // If the name hasn't been set yet, use the address
                if (HtmlUtil.isNullOrWhitespace(innerThis.signUpInfo.name)) {
                    innerThis.$scope.$apply(function () {
                        innerThis.signUpInfo.name = place.name + " Condo Association";
                    });
                }
                if (!place.geometry) {
                    //window.alert( "Autocomplete's returned place contains no geometry" );
                    return;
                }
                innerThis.centerMap(place.geometry);
                $("#association-name-text-box").focus();
            });
            // Initialize the unit names
            innerThis.onNumUnitsChanged();
        };
        /**
         * Refresh the map to center typed in address
         */
        CondoSignUpWizardController.prototype.checkAddress = function () {
            if (this.placeWasSelected || !this.shouldCheckAddress)
                return;
            this.shouldCheckAddress = false;
            this.refreshMapForBuildingAddress();
        };
        /**
         * Refresh the map to center typed in address
         */
        CondoSignUpWizardController.prototype.refreshMapForBuildingAddress = function () {
            this.isLoadingMap = true;
            var innerThis = this;
            HtmlUtil.geocodeAddress(this.signUpInfo.buildings[0].streetAddress, function (results, status) {
                innerThis.$scope.$apply(function () {
                    innerThis.isLoadingMap = false;
                    if (status != google.maps.GeocoderStatus.OK) {
                        //$( "#GeocodeResultPanel" ).text( "Failed to find address for the following reason: " + status );
                        return;
                    }
                    var readableAddress = results[0].formatted_address;
                    // Remove the trailing country if it's USA
                    if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                        readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                    innerThis.signUpInfo.buildings[0].streetAddress = readableAddress;
                    innerThis.centerMap(results[0].geometry);
                    // If the name hasn't been set yet, use the address
                    if (HtmlUtil.isNullOrWhitespace(innerThis.signUpInfo.name)) {
                        var street = HtmlUtil.getStringUpToFirst(readableAddress, ",");
                        innerThis.signUpInfo.name = street + " Condo Association";
                    }
                });
            });
        };
        ;
        /**
         * Add a building to our sign-up info
         */
        CondoSignUpWizardController.prototype.addBuilding = function () {
            var MaxBuidlings = 25;
            if (this.signUpInfo.buildings.length + 1 >= MaxBuidlings) {
                alert("We do not support more than " + MaxBuidlings + " buildings.");
                return;
            }
            this.signUpInfo.buildings.push({});
        };
        ;
        /**
         * Called when the user press the button to complete the sign-up process
         */
        CondoSignUpWizardController.prototype.onFinishedWizard = function () {
            var _this = this;
            this.signUpInfo.recaptchaKey = grecaptcha.getResponse();
            if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.recaptchaKey)) {
                alert("Please complete the reCAPTCHA field");
                return;
            }
            this.isLoading = true;
            this.$http.post("/api/SignUpWizard", this.signUpInfo).then(function (httpResponse) {
                _this.isLoading = false;
                var signUpResult = httpResponse.data;
                // If the was an error creating the site
                if (!HtmlUtil.isNullOrWhitespace(signUpResult.errorMessage)) {
                    alert("Failed to complete sign-up: " + signUpResult.errorMessage);
                    _this.WizardHandler.wizard().goTo(signUpResult.stepIndex);
                    grecaptcha.reset();
                }
                // Otherwise create succeeded
                else {
                    if (typeof (window.analytics) !== "undefined")
                        window.analytics.track("condoSignUpComplete", {
                            category: "SignUp",
                            label: "Success"
                        });
                    // Log this as a conversion
                    //if( typeof ( ( <any>window ).goog_report_conversion ) !== "undefined" )
                    //    ( <any>window ).goog_report_conversion();
                    // Or if the user created an active signUpResult
                    if (!HtmlUtil.isNullOrWhitespace(signUpResult.createUrl)) {
                        window.location.href = signUpResult.createUrl;
                    }
                    // Otherwise the user needs to confirm sign-up via email
                    else {
                        _this.hideWizard = true;
                        _this.resultMessage = "Great work! We just sent you an email with instructions on how access your new site.";
                    }
                }
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to complete sign-up: " + httpResponse.data.exceptionMessage);
                grecaptcha.reset();
            });
        };
        CondoSignUpWizardController.$inject = ["$scope", "$http", "$timeout", "WizardHandler"];
        return CondoSignUpWizardController;
    }());
    Ally.CondoSignUpWizardController = CondoSignUpWizardController;
})(Ally || (Ally = {}));
CA.angularApp.component("condoSignUpWizard", {
    templateUrl: "/ngApp/chtn/public/condo-sign-up-wizard.html",
    controller: Ally.CondoSignUpWizardController
});

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
var Ally;
(function (Ally) {
    var DiscussionThread = /** @class */ (function () {
        function DiscussionThread() {
        }
        return DiscussionThread;
    }());
    Ally.DiscussionThread = DiscussionThread;
    /**
     * The controller for the page that lets users unsubscribe from discussions
     */
    var DiscussionManageController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function DiscussionManageController($http, $routeParams) {
            this.$http = $http;
            this.$routeParams = $routeParams;
            this.isLoading = false;
            this.activeView = "loading";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        DiscussionManageController.prototype.$onInit = function () {
            this.unsubscribeUser();
        };
        /**
        * Load the discussion details
        */
        DiscussionManageController.prototype.loadDiscussion = function () {
            var idVal = decodeURIComponent(this.$routeParams.idValue);
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/Discussion/" + idVal).then(function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.discussion = httpResponse.data;
            }, function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.errorMessage = "Failed to find the discussion details. Please contact support to alert them to the issue.";
            });
        };
        /**
         * Unsubscribe the user from the discussion
         */
        DiscussionManageController.prototype.unsubscribeUser = function () {
            var idVal = decodeURIComponent(this.$routeParams.idValue);
            this.isLoading = true;
            this.activeView = "loading";
            var innerThis = this;
            this.$http.put("/api/Discussion/Unsubscribe/" + idVal, null).then(function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.activeView = "unsubscribed";
                innerThis.discussion = httpResponse.data;
            }, function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.activeView = "error";
                innerThis.errorMessage = "Failed to unsubscribe you from the discussion due to a server error.";
            });
        };
        /**
         * Resubscribe the user to a discussion
         */
        DiscussionManageController.prototype.resubscribeUser = function () {
            var idVal = decodeURIComponent(this.$routeParams.idValue);
            this.isLoading = true;
            this.activeView = "loading";
            var innerThis = this;
            this.$http.put("/api/Discussion/Resubscribe/" + idVal, null).then(function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.activeView = "resubscribed";
            }, function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.activeView = "error";
                innerThis.errorMessage = "Failed to unsubscribe you from the discussion due to a server error.";
            });
        };
        DiscussionManageController.$inject = ["$http", "$routeParams"];
        return DiscussionManageController;
    }());
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
    var EmailAbuseController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function EmailAbuseController($http, $routeParams) {
            this.$http = $http;
            this.$routeParams = $routeParams;
            this.isLoading = false;
            this.showButtons = true;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        EmailAbuseController.prototype.$onInit = function () {
            this.boardEmail = "board." + HtmlUtil.getSubdomain() + "@inmail." + AppConfig.baseTld;
        };
        /**
         * Ask that
         */
        EmailAbuseController.prototype.reportAbuse = function (abuseReason) {
            var _this = this;
            if (abuseReason === "not-member") {
                if (!confirm("You should reach out to the board rather than contact technical support. Click 'OK' to still proceed with contacting technical support anyway."))
                    return;
            }
            // It's double encoded to prevent angular trouble, so double decode
            var idVal = decodeURIComponent(this.$routeParams.idValue);
            var postData = {
                abuseReason: abuseReason,
                idVal: idVal,
                otherReasonText: this.otherReasonText
            };
            this.isLoading = true;
            this.$http.post("/api/EmailAbuse/v3", postData).then(function () {
                _this.isLoading = false;
                _this.showButtons = false;
            });
        };
        EmailAbuseController.$inject = ["$http", "$routeParams"];
        return EmailAbuseController;
    }());
    Ally.EmailAbuseController = EmailAbuseController;
})(Ally || (Ally = {}));
CA.angularApp.component("emailAbuse", {
    templateUrl: "/ngApp/chtn/public/email-abuse.html",
    controller: Ally.EmailAbuseController
});

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
var Ally;
(function (Ally) {
    var HoaSignerUpInfo = /** @class */ (function () {
        function HoaSignerUpInfo() {
            this.boardPositionValue = 1;
        }
        return HoaSignerUpInfo;
    }());
    Ally.HoaSignerUpInfo = HoaSignerUpInfo;
    var HoaSignUpInfo = /** @class */ (function () {
        function HoaSignUpInfo() {
            this.name = "";
            this.streetAddress = "";
            this.isResident = true;
            this.signerUpInfo = new HoaSignerUpInfo();
            this.referralSource = "";
            this.recaptchaKey = "";
        }
        return HoaSignUpInfo;
    }());
    Ally.HoaSignUpInfo = HoaSignUpInfo;
    /**
     * The controller for the HOA Ally sign-up page
     */
    var HoaSignUpWizardController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function HoaSignUpWizardController($scope, $http, $timeout, WizardHandler) {
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
            // The default sign-up info object
            this.signUpInfo = new Ally.HoaSignUpInfo();
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        HoaSignUpWizardController.prototype.$onInit = function () {
            var _this = this;
            this.signUpInfo.referralSource = HtmlUtil.GetQueryStringParameter("utm_sourcecapterra");
            // Normalize anything invalid to null
            if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.referralSource))
                this.signUpInfo.referralSource = null;
            this.$scope.$on('wizard:stepChanged', function (event, args) {
                if (args.index === 1)
                    _this.$timeout(function () { return _this.showMap = true; }, 50);
                else if (args.index === 2)
                    _this.$timeout(function () { return grecaptcha.render("recaptcha-check-elem"); }, 50);
                else
                    _this.showMap = false;
            });
        };
        /**
         * Occurs as the user presses keys in the HOA name field
         */
        HoaSignUpWizardController.prototype.onHoaNameChanged = function () {
            if (!this.signUpInfo || !this.signUpInfo.name) {
                this.shouldShowCondoMessage = false;
                return;
            }
            var shouldShowCondoMessage = this.signUpInfo.name.toLowerCase().indexOf("condo") !== -1;
            if (shouldShowCondoMessage && !this.shouldShowCondoMessage)
                $("#suggestCondoMessageLabel").css("font-size", "1.3em").css("margin", "25px auto").addClass("alert alert-warning").fadeIn(200).fadeOut(200).fadeIn(200).fadeOut(200).fadeIn(200).fadeIn(200).fadeOut(200).fadeIn(200);
            this.shouldShowCondoMessage = shouldShowCondoMessage;
        };
        /**
         * Center the Google map on a polygon
         */
        HoaSignUpWizardController.prototype.centerMap = function (geometry) {
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
        };
        /**
         * Perform initialization to create the map and hook up address autocomplete
         */
        HoaSignUpWizardController.prototype.initMapStep = function () {
            if (typeof (window.analytics) !== "undefined")
                window.analytics.track("condoSignUpStarted");
            this.showMap = true;
            var addressInput = document.getElementById("association-address-text-box");
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
                var innerThis = this;
                var onPlaceChanged = function () {
                    innerThis.setPlaceWasSelected();
                    //infowindow.close();
                    innerThis.mapMarker.setVisible(false);
                    var place = innerThis.addressAutocomplete.getPlace();
                    var readableAddress = place.formatted_address;
                    // Remove the trailing country if it's USA
                    if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                        readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                    innerThis.signUpInfo.streetAddress = readableAddress;
                    if (!place.geometry)
                        return;
                    innerThis.setEditPolyForAddress(place.geometry.location);
                    innerThis.centerMap(place.geometry);
                };
                this.addressAutocomplete.addListener('place_changed', function () {
                    innerThis.$scope.$apply(onPlaceChanged);
                });
            }
        };
        HoaSignUpWizardController.prototype.onMapEditorReady = function (mapInstance) {
            this.map = mapInstance;
            this.initMapStep();
        };
        /**
         * Refresh the map to center typed in address
         */
        HoaSignUpWizardController.prototype.checkAddress = function () {
            if (this.placeWasSelected || !this.shouldCheckAddress)
                return;
            this.shouldCheckAddress = false;
            this.refreshMapForAddress();
        };
        /**
         * Occurs when the user selects an address from the Google suggestions
         */
        HoaSignUpWizardController.prototype.setPlaceWasSelected = function () {
            this.placeWasSelected = true;
            this.shouldCheckAddress = false;
            // Clear the flag in case the user types in a new address
            var innerThis = this;
            setTimeout(function () {
                innerThis.placeWasSelected = true;
            }, 500);
        };
        /**
         * Refresh the map edit box when a place is geocoded
         */
        HoaSignUpWizardController.prototype.setEditPolyForAddress = function (homePos) {
            var OffsetLat = 0.001;
            var OffsetLon = 0.0014;
            this.hoaPoly = {
                vertices: [
                    { lat: homePos.lat() - OffsetLat, lon: homePos.lng() - OffsetLon },
                    { lat: homePos.lat() + OffsetLat, lon: homePos.lng() - OffsetLon },
                    { lat: homePos.lat() + OffsetLat, lon: homePos.lng() + OffsetLon },
                    { lat: homePos.lat() - OffsetLat, lon: homePos.lng() + OffsetLon }
                ]
            };
        };
        /**
         * Refresh the map to center typed in address
         */
        HoaSignUpWizardController.prototype.refreshMapForAddress = function () {
            this.isLoadingMap = true;
            var innerThis = this;
            HtmlUtil.geocodeAddress(this.signUpInfo.streetAddress, function (results, status) {
                innerThis.$scope.$apply(function () {
                    innerThis.isLoadingMap = false;
                    if (status != google.maps.GeocoderStatus.OK) {
                        //$( "#GeocodeResultPanel" ).text( "Failed to find address for the following reason: " + status );
                        return;
                    }
                    var readableAddress = results[0].formatted_address;
                    // Remove the trailing country if it's USA
                    if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                        readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                    innerThis.signUpInfo.streetAddress = readableAddress;
                    if (!results[0].geometry)
                        return;
                    innerThis.setEditPolyForAddress(results[0].geometry.location);
                    innerThis.centerMap(results[0].geometry);
                });
            });
        };
        /**
         * Called when the user press the button to complete the sign-up process
         */
        HoaSignUpWizardController.prototype.onFinishedWizard = function () {
            var _this = this;
            this.signUpInfo.recaptchaKey = grecaptcha.getResponse();
            if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.recaptchaKey)) {
                alert("Please complete the reCAPTCHA field");
                return;
            }
            this.isLoading = true;
            this.signUpInfo.boundsGpsVertices = this.hoaPoly.vertices;
            this.$http.post("/api/SignUpWizard/Hoa", this.signUpInfo).then(function (httpResponse) {
                _this.isLoading = false;
                var signUpResult = httpResponse.data;
                // If the was an error creating the site
                if (!HtmlUtil.isNullOrWhitespace(signUpResult.errorMessage)) {
                    alert("Failed to complete sign-up: " + signUpResult.errorMessage);
                    _this.WizardHandler.wizard().goTo(signUpResult.stepIndex);
                    grecaptcha.reset();
                }
                // Otherwise create succeeded
                else {
                    if (typeof (window.analytics) !== "undefined")
                        window.analytics.track("condoSignUpComplete");
                    // Log this as a conversion
                    if (typeof (window.goog_report_conversion) !== "undefined")
                        window.goog_report_conversion();
                    if (_this.signUpInfo.referralSource && typeof (window.capterra_trackingListener_v2) !== "undefined")
                        window.capterra_trackingListener_v2();
                    // Or if the user created an active signUpResult
                    if (!HtmlUtil.isNullOrWhitespace(signUpResult.createUrl)) {
                        // Delay just a bit to let the Capterra tracking log, if needed
                        window.setTimeout(function () { return window.location.href = signUpResult.createUrl; }, 50);
                    }
                    // Otherwise the user needs to confirm sign-up via email
                    else {
                        _this.hideWizard = true;
                        _this.resultMessage = "Great work! We just sent you an email with instructions on how access your new site.";
                    }
                }
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to complete sign-up: " + httpResponse.data.exceptionMessage);
                grecaptcha.reset();
            });
        };
        /**
         * Called when the user press the button to submit their email address
         */
        HoaSignUpWizardController.prototype.submitEmailForHoaNotify = function () {
            var _this = this;
            if (HtmlUtil.isNullOrWhitespace(this.hoaAlertEmail)) {
                alert("Please enter a valid email address");
                return;
            }
            this.isLoading = true;
            this.$http.get("/api/PublicEmail/SignUpForHoaAllyAlert?email=" + encodeURIComponent(this.hoaAlertEmail) + "&numHomes=" + encodeURIComponent(this.hoaAlertNumHomes)).then(function (httpResponse) {
                _this.isLoading = false;
                _this.didSignUpForHoaAlert = true;
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to submit: " + httpResponse.data.exceptionMessage);
            });
        };
        HoaSignUpWizardController.$inject = ["$scope", "$http", "$timeout", "WizardHandler"];
        return HoaSignUpWizardController;
    }());
    Ally.HoaSignUpWizardController = HoaSignUpWizardController;
})(Ally || (Ally = {}));
CA.angularApp.component("hoaSignUpWizard", {
    templateUrl: "/ngApp/chtn/public/hoa-sign-up-wizard.html",
    controller: Ally.HoaSignUpWizardController
});

var Ally;
(function (Ally) {
    var NewUserSignUpInfo = /** @class */ (function () {
        function NewUserSignUpInfo() {
        }
        return NewUserSignUpInfo;
    }());
    /**
     * The controller for the Neighborhood Ally sign-up page
     */
    var NeighborSignUpController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function NeighborSignUpController($http, siteInfo) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.signUpInfo = new NewUserSignUpInfo();
            this.resultIsError = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        NeighborSignUpController.prototype.$onInit = function () {
            // Hook up address auto-complete, after the page has loaded
            setTimeout(function () {
                var autocompleteOptions = undefined;
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
                var addressInput = document.getElementById("address-text-box");
                new google.maps.places.Autocomplete(addressInput, autocompleteOptions);
            }, 750);
        };
        /**
         * Occurs when the user clicks the button to submit their email address
         */
        NeighborSignUpController.prototype.onSubmitInfo = function () {
            var _this = this;
            if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.emailAddress)) {
                alert("Please enter an email address");
                return;
            }
            this.isLoading = true;
            this.$http.post("/api/NeighborSignUp/SignUpNewUser", this.signUpInfo).then(function () {
                _this.isLoading = false;
                _this.resultIsError = false;
                _this.resultMessage = "Your information has been successfully submitted. Look for a welcome email soon.";
            }, function () {
                _this.isLoading = false;
                _this.resultIsError = true;
                _this.resultMessage = "There was an error submitting your information. Please try again.";
            });
        };
        /**
         * Occurs when the user wants to retry submission of their info
         */
        NeighborSignUpController.prototype.goBack = function () {
            this.resultMessage = null;
        };
        NeighborSignUpController.$inject = ["$http"];
        return NeighborSignUpController;
    }());
    Ally.NeighborSignUpController = NeighborSignUpController;
})(Ally || (Ally = {}));
CA.angularApp.component("neighborSignUp", {
    templateUrl: "/ngApp/chtn/public/neighbor-sign-up.html",
    controller: Ally.NeighborSignUpController
});

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
var Ally;
(function (Ally) {
    var TempNeighborhoodSignUpInfo = /** @class */ (function () {
        function TempNeighborhoodSignUpInfo() {
            this.fullName = "";
            this.email = "";
            this.address = "";
            this.neighborhoodName = "";
            this.notes = "";
        }
        return TempNeighborhoodSignUpInfo;
    }());
    /**
     * The controller for the HOA Ally sign-up page
     */
    var NeighborhoodSignUpWizardController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function NeighborhoodSignUpWizardController($scope, $http, $timeout, WizardHandler) {
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
        NeighborhoodSignUpWizardController.prototype.$onInit = function () {
            var _this = this;
            this.$scope.$on('wizard:stepChanged', function (event, args) {
                if (args.index === 1)
                    _this.$timeout(function () { return _this.showMap = true; }, 50);
                else
                    _this.showMap = false;
            });
            setTimeout(function () {
                var addressInput = document.getElementById("signUpAddress");
                if (addressInput)
                    new google.maps.places.Autocomplete(addressInput);
            }, 500);
        };
        /**
         * Submit the
         */
        NeighborhoodSignUpWizardController.prototype.onSubmitTempInfo = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.post("/api/SignUpWizard/TempNeighborhood", this.tempSignUpInfo).then(function () {
                _this.isLoading = false;
                _this.submitTempResult = "Thank you for your submission. We'll be in touch shortly.";
            }, function (response) {
                _this.isLoading = false;
                _this.submitTempResult = "Submission failed: " + response.data.exceptionMessage + ". Feel free to refresh the page to try again or use the contact form at the bottom of the Community Ally home page.";
            });
        };
        /**
         * Center the Google map on a polygon
         */
        NeighborhoodSignUpWizardController.prototype.centerMap = function (geometry) {
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
        };
        /**
         * Perform initialization to create the map and hook up address autocomplete
         */
        NeighborhoodSignUpWizardController.prototype.initMapStep = function () {
            var _this = this;
            if (typeof (window.analytics) !== "undefined")
                window.analytics.track("condoSignUpStarted");
            this.showMap = true;
            var addressInput = document.getElementById("association-address-text-box");
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
                var onPlaceChanged_1 = function () {
                    _this.setPlaceWasSelected();
                    //infowindow.close();
                    _this.mapMarker.setVisible(false);
                    var place = _this.addressAutocomplete.getPlace();
                    var readableAddress = place.formatted_address;
                    // Remove the trailing country if it's USA
                    if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                        readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                    _this.signUpInfo.streetAddress = readableAddress;
                    if (!place.geometry)
                        return;
                    _this.setEditPolyForAddress(place.geometry.location);
                    _this.centerMap(place.geometry);
                };
                this.addressAutocomplete.addListener('place_changed', function () {
                    _this.$scope.$apply(onPlaceChanged_1);
                });
            }
        };
        NeighborhoodSignUpWizardController.prototype.onMapEditorReady = function (mapInstance) {
            this.map = mapInstance;
            this.initMapStep();
        };
        /**
         * Refresh the map to center typed in address
         */
        NeighborhoodSignUpWizardController.prototype.checkAddress = function () {
            if (this.placeWasSelected || !this.shouldCheckAddress)
                return;
            this.shouldCheckAddress = false;
            this.refreshMapForAddress();
        };
        /**
         * Occurs when the user selects an address from the Google suggestions
         */
        NeighborhoodSignUpWizardController.prototype.setPlaceWasSelected = function () {
            var _this = this;
            this.placeWasSelected = true;
            this.shouldCheckAddress = false;
            // Clear the flag in case the user types in a new address
            setTimeout(function () {
                _this.placeWasSelected = true;
            }, 500);
        };
        /**
         * Refresh the map edit box when a place is geocoded
         */
        NeighborhoodSignUpWizardController.prototype.setEditPolyForAddress = function (homePos) {
            var OffsetLat = 0.001;
            var OffsetLon = 0.0014;
            this.hoaPoly = {
                vertices: [
                    { lat: homePos.lat() - OffsetLat, lon: homePos.lng() - OffsetLon },
                    { lat: homePos.lat() + OffsetLat, lon: homePos.lng() - OffsetLon },
                    { lat: homePos.lat() + OffsetLat, lon: homePos.lng() + OffsetLon },
                    { lat: homePos.lat() - OffsetLat, lon: homePos.lng() + OffsetLon }
                ]
            };
        };
        /**
         * Refresh the map to center typed in address
         */
        NeighborhoodSignUpWizardController.prototype.refreshMapForAddress = function () {
            var _this = this;
            this.isLoadingMap = true;
            HtmlUtil.geocodeAddress(this.signUpInfo.streetAddress, function (results, status) {
                // Need to run this in $apply since it's invoked outside of Angular's digest cycle
                _this.$scope.$apply(function () {
                    _this.isLoadingMap = false;
                    if (status != google.maps.GeocoderStatus.OK) {
                        //$( "#GeocodeResultPanel" ).text( "Failed to find address for the following reason: " + status );
                        return;
                    }
                    var readableAddress = results[0].formatted_address;
                    // Remove the trailing country if it's USA
                    if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                        readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                    _this.signUpInfo.streetAddress = readableAddress;
                    if (!results[0].geometry)
                        return;
                    _this.setEditPolyForAddress(results[0].geometry.location);
                    _this.centerMap(results[0].geometry);
                });
            });
        };
        /**
         * Called when the user press the button to complete the sign-up process
         */
        NeighborhoodSignUpWizardController.prototype.onFinishedWizard = function () {
            var _this = this;
            this.isLoading = true;
            this.signUpInfo.boundsGpsVertices = this.hoaPoly.vertices;
            this.$http.post("/api/SignUpWizard/Hoa", this.signUpInfo).then(function (httpResponse) {
                _this.isLoading = false;
                var signUpResult = httpResponse.data;
                // If the was an error creating the site
                if (!HtmlUtil.isNullOrWhitespace(signUpResult.errorMessage)) {
                    alert("Failed to complete sign-up: " + signUpResult.errorMessage);
                    _this.WizardHandler.wizard().goTo(signUpResult.stepIndex);
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
                        _this.hideWizard = true;
                        _this.resultMessage = "Great work! We just sent you an email with instructions on how access your new site.";
                    }
                }
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to complete sign-up: " + httpResponse.data.exceptionMessage);
            });
        };
        NeighborhoodSignUpWizardController.$inject = ["$scope", "$http", "$timeout", "WizardHandler"];
        return NeighborhoodSignUpWizardController;
    }());
    Ally.NeighborhoodSignUpWizardController = NeighborhoodSignUpWizardController;
})(Ally || (Ally = {}));
CA.angularApp.component("neighborhoodSignUpWizard", {
    templateUrl: "/ngApp/chtn/public/neighborhood-sign-up-wizard.html",
    controller: Ally.NeighborhoodSignUpWizardController
});

var Ally;
(function (Ally) {
    var MemberSignUpInfo = /** @class */ (function () {
        function MemberSignUpInfo() {
        }
        return MemberSignUpInfo;
    }());
    /**
     * The controller for the page that allows anonymous users share their contact info to be
     * invited to the group's site
     */
    var PendingMemberSignUpController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function PendingMemberSignUpController($http, $rootScope, siteInfo, $timeout, appCacheService) {
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
        PendingMemberSignUpController.prototype.$onInit = function () {
            var _this = this;
            this.groupName = this.siteInfo.publicSiteInfo.fullName;
            this.showSchoolField = AppConfig.appShortName === "pta";
            window.setTimeout(function () { return _this.hookupAddressAutocomplete(); }, 300);
            this.$timeout(function () { return grecaptcha.render("recaptcha-check-elem"); }, 100);
        };
        /**
         * Attach the Google Places auto-complete logic to the address text box
         */
        PendingMemberSignUpController.prototype.hookupAddressAutocomplete = function () {
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
        };
        PendingMemberSignUpController.prototype.submitInfo = function () {
            var _this = this;
            this.signUpInfo.recaptchaKey = grecaptcha.getResponse();
            if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.recaptchaKey)) {
                this.errorMessage = "Please complete the reCAPTCHA field";
                return;
            }
            this.isLoading = true;
            this.errorMessage = null;
            this.$http.post("/api/PublicPendingUser", this.signUpInfo).then(function (response) {
                _this.isLoading = false;
                _this.showInputForm = false;
            }, function (response) {
                _this.isLoading = false;
                _this.errorMessage = "Failed to submit: " + response.data.exceptionMessage;
            });
        };
        PendingMemberSignUpController.$inject = ["$http", "$rootScope", "SiteInfo", "$timeout", "appCacheService"];
        return PendingMemberSignUpController;
    }());
    Ally.PendingMemberSignUpController = PendingMemberSignUpController;
})(Ally || (Ally = {}));
CA.angularApp.component("pendingMemberSignUp", {
    templateUrl: "/ngApp/chtn/public/pending-member-sign-up.html",
    controller: Ally.PendingMemberSignUpController
});

/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../Services/html-util.ts" />
var Ally;
(function (Ally) {
    /**
     * The controller for the committee home page
     */
    var CommitteeHomeController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function CommitteeHomeController(siteInfo, fellowResidents, $routeParams) {
            this.siteInfo = siteInfo;
            this.fellowResidents = fellowResidents;
            this.$routeParams = $routeParams;
            this.canManage = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        CommitteeHomeController.prototype.$onInit = function () {
            var _this = this;
            this.canManage = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager;
            // Make sure committee members can manage their data
            if (this.committee && !this.canManage)
                this.fellowResidents.isCommitteeMember(this.committee.committeeId).then(function (isCommitteeMember) { return _this.canManage = isCommitteeMember; });
            if (this.$routeParams && HtmlUtil.isNumericString(this.$routeParams.discussionThreadId))
                this.autoOpenDiscussionThreadId = parseInt(this.$routeParams.discussionThreadId);
        };
        CommitteeHomeController.$inject = ["SiteInfo", "fellowResidents", "$routeParams"];
        return CommitteeHomeController;
    }());
    Ally.CommitteeHomeController = CommitteeHomeController;
})(Ally || (Ally = {}));
CA.angularApp.component("committeeHome", {
    bindings: {
        committee: "<"
    },
    templateUrl: "/ngApp/committee/committee-home.html",
    controller: Ally.CommitteeHomeController
});

/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../Services/html-util.ts" />
var Ally;
(function (Ally) {
    /**
     * The controller for the committee home page
     */
    var CommitteeMembersController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function CommitteeMembersController($http, fellowResidents, $cacheFactory, siteInfo) {
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
        CommitteeMembersController.prototype.$onInit = function () {
            this.populateAllMembers();
        };
        /**
         * Populate the full list of committee members
         */
        CommitteeMembersController.prototype.populateAllMembers = function () {
            var _this = this;
            this.isLoading = true;
            this.fellowResidents.getResidents().then(function (residents) {
                _this.allGroupMembers = residents;
                _this.getMembers();
            });
        };
        /**
         * Set the contact user for this committee
         */
        CommitteeMembersController.prototype.setContactMember = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.put("/api/Committee/" + this.committee.committeeId + "/SetContactMember?userId=" + this.contactUser.userId, null).then(function (response) {
                _this.isLoading = false;
                _this.committee.contactMemberUserId = _this.contactUser.userId;
                // Since we changed the committee data, clear the cache so we show the up-to-date info
                _this.$cacheFactory.get('$http').remove("/api/Committee/" + _this.committee.committeeId);
                // Update the fellow residents page next time we're there
                _this.fellowResidents.clearResidentCache();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to set contact member: " + response.data.exceptionMessage);
            });
        };
        /**
         * Retrieve the full list of committee members from the server
         */
        CommitteeMembersController.prototype.getMembers = function () {
            var _this = this;
            this.isLoading = true;
            this.fellowResidents.getCommitteeMembers(this.committee.committeeId).then(function (committeeMembers) {
                _this.isLoading = false;
                _this.members = committeeMembers;
                _this.members = _.sortBy(_this.members, function (m) { return (m.fullName || "").toLowerCase(); });
                var isMember = function (u) { return _.some(_this.members, function (m) { return m.userId === u.userId; }); };
                _this.filteredGroupMembers = _.filter(_this.allGroupMembers, function (m) { return !isMember(m); });
                _this.filteredGroupMembers = _.sortBy(_this.filteredGroupMembers, function (m) { return (m.fullName || "").toLowerCase(); });
                _this.contactUser = _.find(_this.members, function (m) { return m.userId == _this.committee.contactMemberUserId; });
                // Admin or committee members can manage the committee
                _this.canManage = _this.siteInfo.userInfo.isAdmin || _this.siteInfo.userInfo.isSiteManager || _.any(_this.members, function (m) { return m.userId === _this.siteInfo.userInfo.userId; });
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to retrieve committee members, please refresh the page to try again");
            });
        };
        /**
         * Add a member to this committee
         */
        CommitteeMembersController.prototype.addSelectedMember = function () {
            var _this = this;
            if (!this.userForAdd)
                return;
            this.isLoading = true;
            this.$http.put("/api/Committee/" + this.committee.committeeId + "/AddMember?userId=" + this.userForAdd.userId, null).then(function (response) {
                _this.isLoading = false;
                _this.getMembers();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to add member, please refresh the page to try again: " + response.data.exceptionMessage);
            });
        };
        /**
         * Remove a member from this committee
         */
        CommitteeMembersController.prototype.removeMember = function (member) {
            var _this = this;
            if (!confirm("Are you sure you want to remove this person from this committee?"))
                return;
            this.isLoading = true;
            this.$http.put("/api/Committee/" + this.committee.committeeId + "/RemoveMember?userId=" + member.userId, null).then(function (response) {
                _this.isLoading = false;
                _this.getMembers();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to remove member, please refresh the page to try again: " + response.data.exceptionMessage);
            });
        };
        CommitteeMembersController.$inject = ["$http", "fellowResidents", "$cacheFactory", "SiteInfo"];
        return CommitteeMembersController;
    }());
    Ally.CommitteeMembersController = CommitteeMembersController;
})(Ally || (Ally = {}));
CA.angularApp.component("committeeMembers", {
    bindings: {
        committee: "<"
    },
    templateUrl: "/ngApp/committee/committee-members.html",
    controller: Ally.CommitteeMembersController
});


/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../Services/html-util.ts" />
/// <reference path="../chtn/manager/manage-committees-ctrl.ts" />
var Ally;
(function (Ally) {
    /**
     * The controller for the committee parent view
     */
    var CommitteeParentController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function CommitteeParentController($http, siteInfo, $routeParams, $cacheFactory, $rootScope) {
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
        CommitteeParentController.prototype.$onInit = function () {
            this.canManage = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager;
            this.retrieveCommittee();
        };
        /*
         * Retreive the committee data
         */
        CommitteeParentController.prototype.retrieveCommittee = function () {
            var _this = this;
            this.isLoading = true;
            // Set this flag so we don't redirect if sending results in a 403
            this.$rootScope.dontHandle403 = true;
            this.$http.get("/api/Committee/" + this.committeeId, { cache: true }).then(function (response) {
                _this.$rootScope.dontHandle403 = false;
                _this.isLoading = false;
                _this.committee = response.data;
                _this.selectedView = _this.initialView;
            }, function (response) {
                _this.$rootScope.dontHandle403 = false;
                _this.isLoading = false;
                if (response.status === 403) {
                    alert("You are not authorized to view this private committee. You must be a member of the committee to view its contents. Reach out to a board member to inquire about joining the committiee.");
                    window.location.href = "/#!/Home";
                }
                else
                    alert("Failed to load committee: " + response.data.exceptionMessage);
            });
        };
        /*
         * Called after the user edits the committee name
         */
        CommitteeParentController.prototype.onUpdateCommitteeName = function () {
            var _this = this;
            this.isLoading = true;
            var putUri = "/api/Committee/" + this.committeeId + "?name=" + this.committee.name;
            this.$http.put(putUri, null).then(function () {
                _this.isLoading = false;
                _this.$cacheFactory.get('$http').remove("/api/Committee/" + _this.committeeId);
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to update the committee name: " + response.data.exceptionMessage);
            });
        };
        CommitteeParentController.$inject = ["$http", "SiteInfo", "$routeParams", "$cacheFactory", "$rootScope"];
        return CommitteeParentController;
    }());
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
    var ActivePollsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ActivePollsController($http, siteInfo, $timeout, $rootScope) {
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
        ActivePollsController.prototype.$onInit = function () {
            this.refreshPolls();
        };
        /**
         * Retrieve any active polls from the server
         */
        ActivePollsController.prototype.populatePollData = function (pollData) {
            this.polls = pollData;
            // If there are polls then tell the home to display the poll area
            if (pollData && pollData.length > 0)
                this.$rootScope.$broadcast("homeHasActivePolls");
            for (var pollIndex = 0; pollIndex < this.polls.length; ++pollIndex) {
                var poll = this.polls[pollIndex];
                if (poll.hasUsersUnitVoted) {
                    if (poll.canViewResults) {
                        var chartInfo = Ally.FellowResidentsService.pollReponsesToChart(poll, this.siteInfo);
                        poll.chartData = chartInfo.chartData;
                        poll.chartLabels = chartInfo.chartLabels;
                    }
                }
            }
        };
        /**
         * Populate the polls section from the server
         */
        ActivePollsController.prototype.refreshPolls = function () {
            var _this = this;
            // Grab the polls from the server
            this.isLoading = true;
            this.$http.get("/api/Poll?getActive=1").then(function (httpResponse) {
                _this.isLoading = false;
                // Delay the processing a bit to help the home page load faster
                _this.$timeout(function () { return _this.populatePollData(httpResponse.data); }, 100);
            }, function () {
                _this.isLoading = false;
            });
        };
        /**
         * Occurs when the user selects a poll answer
         */
        ActivePollsController.prototype.onPollAnswer = function (poll, pollAnswer) {
            var _this = this;
            this.isLoading = true;
            var answerIdsCsv = pollAnswer ? pollAnswer.pollAnswerId.toString() : "";
            var writeInAnswer = poll.writeInAnswer ? encodeURIComponent(poll.writeInAnswer) : "";
            var putUri = "/api/Poll/PollResponse?pollId=" + poll.pollId + "&answerIdsCsv=" + answerIdsCsv + "&writeInAnswer=" + writeInAnswer;
            this.$http.put(putUri, null).then(function () {
                _this.isLoading = false;
                _this.refreshPolls();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to submit vote: " + response.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user selects a poll answer in a poll that allows multiple answers
         */
        ActivePollsController.prototype.onMultiResponseChange = function (poll, pollAnswer) {
            var isAbstain = pollAnswer.answerText === "Abstain";
            if (isAbstain && pollAnswer.isLocalMultiSelect) {
                poll.answers.filter(function (a) { return a.answerText !== "Abstain"; }).forEach(function (a) { return a.isLocalMultiSelect = false; });
                poll.isWriteInMultiSelected = false;
            }
            // If this is some other answer then unselect abstain
            if (!isAbstain) {
                var abstainAnswer = poll.answers.find(function (a) { return a.answerText === "Abstain"; });
                if (abstainAnswer)
                    abstainAnswer.isLocalMultiSelect = false;
            }
            var numSelectedAnswers = poll.answers.filter(function (a) { return a.isLocalMultiSelect; }).length;
            if (poll.isWriteInMultiSelected)
                ++numSelectedAnswers;
            if (numSelectedAnswers > poll.maxNumResponses) {
                alert("You can only select at most " + poll.maxNumResponses + " answers");
                if (pollAnswer === this.multiSelectWriteInPlaceholder)
                    poll.isWriteInMultiSelected = false;
                else
                    pollAnswer.isLocalMultiSelect = false;
            }
            poll.localMultiSelectedAnswers = poll.answers.filter(function (a) { return a.isLocalMultiSelect; });
        };
        ActivePollsController.prototype.onSubmitMultiAnswer = function (poll) {
            var _this = this;
            if (!poll.localMultiSelectedAnswers || poll.localMultiSelectedAnswers.length === 0) {
                alert("Please select at least one reponse");
                return;
            }
            var answerIdsCsv = poll.localMultiSelectedAnswers.map(function (a) { return a.pollAnswerId; }).join(",");
            this.isLoading = true;
            var putUri = "/api/Poll/PollResponse?pollId=" + poll.pollId + "&answerIdsCsv=" + answerIdsCsv + "&writeInAnswer=" + ((poll.isWriteInMultiSelected && poll.writeInAnswer) ? encodeURIComponent(poll.writeInAnswer) : '');
            this.$http.put(putUri, null).then(function () {
                _this.isLoading = false;
                _this.refreshPolls();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to submit vote: " + response.data.exceptionMessage);
            });
        };
        ActivePollsController.$inject = ["$http", "SiteInfo", "$timeout", "$rootScope", "fellowResidents"];
        return ActivePollsController;
    }());
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
    var AssessmentPaymentFormController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function AssessmentPaymentFormController($http, siteInfo, $rootScope, $sce, $timeout, $q) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$rootScope = $rootScope;
            this.$sce = $sce;
            this.$timeout = $timeout;
            this.$q = $q;
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
            this.isDwollaReadyForPayment = false;
            this.shouldShowDwollaAddAccountModal = false;
            this.shouldShowDwollaModalClose = false;
            this.hasComplexPassword = false;
            this.didAgreeToDwollaTerms = false;
            this.dwollaFeePercent = 0.5;
            this.dwollaMaxFee = 5;
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
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        AssessmentPaymentFormController.prototype.$onInit = function () {
            var _this = this;
            this.showParagon = false; //this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.emailAddress === "president@mycondoally.com";
            this.paragonPaymentParams = "&BillingAddress1=" + encodeURIComponent("900 W Ainslie St") + "&BillingState=Illinois&BillingCity=Chicago&BillingZip=60640&FirstName=" + encodeURIComponent(this.siteInfo.userInfo.firstName) + "&LastName=" + encodeURIComponent(this.siteInfo.userInfo.lastName);
            this.paragonCheckingLast4 = this.siteInfo.userInfo.paragonCheckingLast4;
            this.paragonCardLast4 = this.siteInfo.userInfo.paragonCardLast4;
            this.isWePayPaymentActive = this.siteInfo.privateSiteInfo.isWePayPaymentActive;
            var shouldShowDwolla = true; //AppConfigInfo.dwollaPreviewShortNames.indexOf( this.siteInfo.publicSiteInfo.shortName ) > -1;
            if (shouldShowDwolla)
                this.isDwollaEnabledOnGroup = this.siteInfo.privateSiteInfo.isDwollaPaymentActive;
            this.dwollaFeePercent = this.siteInfo.privateSiteInfo.isPremiumPlanActive ? 0.5 : 1;
            this.dwollaMaxFee = this.siteInfo.privateSiteInfo.isPremiumPlanActive ? 5 : 10;
            this.shouldShowOwnerFinanceTxn = this.siteInfo.privateSiteInfo.shouldShowOwnerFinanceTxn;
            this.currentDwollaAutoPayAmount = this.siteInfo.userInfo.dwollaAutoPayAmount;
            if (this.siteInfo.privateSiteInfo.customFinancialInstructions)
                this.customFinancialInstructions = this.$sce.trustAsHtml(this.siteInfo.privateSiteInfo.customFinancialInstructions);
            if (this.isDwollaEnabledOnGroup) {
                this.isDwollaUserAccountVerified = this.siteInfo.userInfo.isDwollaAccountVerified;
                if (this.isDwollaUserAccountVerified) {
                    this.dwollaUserStatus = "verified";
                    this.hasDwollaFundingSource = Ally.HtmlUtil2.isValidString(this.siteInfo.userInfo.dwollaFundingSourceName);
                    if (!this.hasDwollaFundingSource) {
                        this.$http.get("/api/Dwolla/HasComplexPassword").then(function (response) { return _this.hasComplexPassword = response.data; });
                    }
                    else {
                        this.dwollaFundingSourceName = this.siteInfo.userInfo.dwollaFundingSourceName;
                        this.dwollaFundingSourceIsVerified = this.siteInfo.userInfo.dwollaFundingSourceIsVerified;
                        this.isDwollaReadyForPayment = this.isDwollaUserAccountVerified && this.dwollaFundingSourceIsVerified && this.siteInfo.privateSiteInfo.isDwollaPaymentActive;
                        if (this.isDwollaReadyForPayment) {
                            // Check the user's Dwolla balance, delayed since it's not important
                            this.$timeout(function () {
                                _this.$http.get("/api/Dwolla/DwollaBalance").then(function (response) { return _this.dwollaBalance = response.data.balanceAmount; });
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
                    var checkDwollaStatus_1 = function () {
                        _this.$http.get("/api/Dwolla/MyAccountStatus").then(function (response) {
                            _this.dwollaUserStatus = response.data.status;
                            _this.dwollaSignUpInfo.streetAddress = response.data.streetAddress;
                            //if( this.dwollaUserStatus === "document" )
                            //    getDwollaDocUploadToken();
                        }, function (errorResponse) {
                            _this.dwollaUserStatus = "error";
                            console.log("Failed to get Dwolla account status: " + errorResponse.data.exceptionMessage);
                        });
                    };
                    this.$timeout(function () { return checkDwollaStatus_1(); }, 500);
                }
            }
            this.allyAppName = AppConfig.appName;
            this.isWePayAutoPayActive = this.siteInfo.userInfo.isAutoPayActive;
            this.assessmentCreditCardFeeLabel = this.siteInfo.privateSiteInfo.payerPaysCCFee ? "Service fee applies" : "No service fee";
            this.assessmentAchFeeLabel = this.siteInfo.privateSiteInfo.payerPaysAchFee ? "Service fee applies" : "No service fee";
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
                    .filter(function (uu) { return !uu.isRenter; })
                    .reduce(function (total, uu) { return total + (uu.assessment || 0); }, 0);
            }
            else
                this.assessmentAmount = 0;
            // Show the Dwolla auto-pay area if the group's Dwolla is setup and
            // assessment frequncy is defined, or if the user already has auto-pay
            this.shouldShowDwollaAutoPayArea = (this.isDwollaReadyForPayment
                && this.siteInfo.privateSiteInfo.assessmentFrequency != null
                && this.assessmentAmount > 0)
                || (typeof this.currentDwollaAutoPayAmount === "number" && !isNaN(this.currentDwollaAutoPayAmount) && this.currentDwollaAutoPayAmount > 1);
            if (this.shouldShowDwollaAutoPayArea) {
                this.assessmentFrequencyInfo = PeriodicPaymentFrequencies.find(function (ppf) { return ppf.id === _this.siteInfo.privateSiteInfo.assessmentFrequency; });
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
            var MaxNumRecentPayments = 24;
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
        };
        /**
         * Display the Paragon payment sign-up modal, with pre-population of data
         */
        AssessmentPaymentFormController.prototype.showParagonSignUp = function () {
            var _this = this;
            this.showParagonCheckingSignUpModal = true;
            if (this.paragonSignUpInfo)
                return;
            // Pre-populate the user's info
            this.isLoading_Payment = true;
            this.$http.get("/api/Paragon/SignUpPrefill").then(function (response) {
                _this.isLoading_Payment = false;
                _this.paragonSignUpInfo = response.data;
            }, function (errorResponse) {
                _this.isLoading_Payment = false;
                _this.paragonSignUpInfo = new ParagonPayerSignUpInfo();
                console.log("Failed to SignUpPrefill: " + errorResponse.data.exceptionMessage);
            });
        };
        /**
         * Submit the user's Paragon bank account information
         */
        AssessmentPaymentFormController.prototype.showParagonCreditSignUp = function () {
            var _this = this;
            this.isLoading_Payment = true;
            this.paragonCardTokenizedUrl = null;
            this.paragonCardTokenizationMessage = "Connecting...";
            this.showParagonCreditSignUpModal = true;
            //this.paragonCardTokenizedUrl = this.$sce.trustAsResourceUrl( "https://login.mycondoally.com/api/PublicParagon/FinishCardTokenization2" );
            //this.isLoading_Payment = false;
            this.$http.get("/api/Paragon/CardTokenizationKey").then(function (response) {
                _this.isLoading_Payment = false;
                _this.paragonCardTokenizedUrl = _this.$sce.trustAsResourceUrl("https://stage.paragonsolutions.com/ws/hosted.aspx?Username=54cE7DU2p%2bBh7h9uwJWW8Q%3d%3d&Password=jYvmN41tt1lz%2bpiazUqQYK9Abl73Z%2bHoBG4vOZImo%2bYlKTbPeNPwOcMB0%2bmIS3%2bs&MerchantKey=1293&InvNum=" + response.data);
                _this.paragonCardTokenizationMessage = null;
            }, function (errorResponse) {
                _this.isLoading_Payment = false;
                _this.paragonCardTokenizationMessage = "There was an error connecting to the server. Please close this window and try again. If this has happened more than once please contact support.";
                console.log("Failed in CardTokenizationKey: " + errorResponse.data.exceptionMessage);
            });
        };
        /**
         * Hide the paragon window, reloading the page if needed
         */
        AssessmentPaymentFormController.prototype.hideParagonCreditSignUp = function () {
            this.showParagonCreditSignUpModal = false;
            // Reload the page to refresh the payment info
            if (this.paragonCardTokenizedUrl)
                window.location.reload();
        };
        /**
         * Submit the user's Paragon bank account information
         */
        AssessmentPaymentFormController.prototype.submitParagonSignUp = function () {
            var _this = this;
            this.isLoading_Payment = true;
            this.paragonSignUpError = null;
            this.$http.post("/api/Paragon/CheckPaymentSignUp", this.paragonSignUpInfo).then(function () {
                // Reload the page to refresh the payment info. We don't really need to do this,
                // but makes sure the UI is up to date a little better as well updates the
                // siteInfo object.
                window.location.reload();
            }, function (errorResponse) {
                _this.isLoading_Payment = false;
                _this.paragonSignUpError = errorResponse.data.exceptionMessage;
            });
        };
        /**
         * Submit the user's Paragon bank account information
         */
        AssessmentPaymentFormController.prototype.submitParagonPayment = function (paySource) {
            var _this = this;
            if (!confirm("This will submit payment."))
                return;
            this.paragonPaymentMessage = null;
            var paymentInfo = new ParagonPaymentRequest();
            paymentInfo.notes = this.paymentInfo.note;
            paymentInfo.paymentAmount = this.paymentInfo.amount;
            paymentInfo.paysFor = this.paymentInfo.paysFor;
            paymentInfo.paySource = paySource;
            this.isLoading_Payment = true;
            this.$http.post("/api/Paragon/MakePayment", paymentInfo).then(function () {
                _this.isLoading_Payment = false;
                _this.paragonPaymentMessage = "Payment Successfully Processed";
            }, function (errorResponse) {
                _this.isLoading_Payment = false;
                _this.paragonPaymentMessage = errorResponse.data.exceptionMessage;
            });
        };
        /**
         * Un-enroll a certain payment source from Paragon payments
         */
        AssessmentPaymentFormController.prototype.unenrollParagonAccount = function (paySource) {
            var _this = this;
            this.isLoading_Payment = true;
            this.$http.get("/api/Paragon/UnenrollPayment?paySource=" + paySource).then(function () {
                // Reload the page to see the change
                window.location.reload();
            }, function (errorResponse) {
                _this.isLoading_Payment = false;
                alert("Failed to un-enroll: " + errorResponse.data.exceptionMessage);
                _this.paragonPaymentMessage = errorResponse.data.exceptionMessage;
            });
        };
        /**
         * Occurs when the user presses the button to make a payment to their organization
         */
        AssessmentPaymentFormController.prototype.submitWePayPayment = function (fundingTypeName) {
            var _this = this;
            this.isLoading_Payment = true;
            this.paymentInfo.fundingType = fundingTypeName;
            // Remove leading dollar signs
            var testAmount = this.paymentInfo.amount;
            if (HtmlUtil.isValidString(testAmount) && testAmount[0] === '$')
                this.paymentInfo.amount = parseFloat(testAmount.substr(1));
            analytics.track("makePayment", {
                fundingType: fundingTypeName
            });
            this.$http.post("/api/WePayPayment/MakeNewPayment", this.paymentInfo).then(function (httpResponse) {
                var checkoutInfo = httpResponse.data;
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
                    _this.isLoading_Payment = false;
                    alert("Unable to initiate WePay checkout");
                }
            }, function (httpResponse) {
                _this.isLoading_Payment = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    alert(httpResponse.data.exceptionMessage);
            });
        };
        AssessmentPaymentFormController.prototype.getMyRecentPayments = function () {
            var _this = this;
            this.$http.get("/api/WePayPayment/MyRecentPayments").then(function (httpResponse) {
                _this.myRecentPayments = httpResponse.data;
            }, function (httpResponse) {
                console.log("Failed to retrieve recent payments: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user clicks the helper link to prep an email to inquire the board as to
         * why their records don't line up.
         */
        AssessmentPaymentFormController.prototype.onIncorrectPayDetails = function () {
            // Get the friendly looking assessment value (ex: 100, 101, 102.50)
            var amountString = this.assessmentAmount.toString();
            if (Math.round(this.assessmentAmount) != this.assessmentAmount)
                amountString = this.assessmentAmount.toFixed(2);
            // Tell the groupSendEmail component to prep an email for the board
            var prepEventData = amountString;
            if (this.knowsNextPayment && HtmlUtil.isValidString(this.nextPaymentText))
                prepEventData += "|" + this.nextPaymentText;
            this.$rootScope.$broadcast("prepAssessmentEmailToBoard", prepEventData);
        };
        /**
         * Refresh the note text for the payment field
         */
        AssessmentPaymentFormController.prototype.updatePaymentText = function () {
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
        };
        /**
         * Occurs when the user selects a payment type radio button
         */
        AssessmentPaymentFormController.prototype.onSelectPaymentType = function (paymentType) {
            this.paymentInfo.paymentType = paymentType;
            this.paymentInfo.amount = paymentType == "periodic" ? this.assessmentAmount : 0;
            this.updatePaymentText();
            this.onPaymentAmountChange();
        };
        /**
         * Generate the friendly string describing to what the member's next payment applies
         */
        AssessmentPaymentFormController.prototype.getNextPaymentText = function (curPeriod, assessmentFrequency) {
            if (!curPeriod)
                return "";
            var paymentText = "";
            var frequencyInfo = FrequencyIdToInfo(assessmentFrequency);
            var periodNames = GetLongPayPeriodNames(frequencyInfo.intervalName);
            if (periodNames)
                paymentText = periodNames[curPeriod.period - 1];
            paymentText += " " + curPeriod.year;
            this.paymentInfo.paysFor = [curPeriod];
            return paymentText;
        };
        /**
         * Occurs when the user presses the button to setup auto-pay for assessments
         */
        AssessmentPaymentFormController.prototype.onSetupWePayAutoPay = function (fundingTypeName) {
            var _this = this;
            this.isLoading_Payment = true;
            this.$http.get("/api/WePayPayment/SetupAutoPay?fundingType=" + fundingTypeName).then(function (httpResponse) {
                var redirectUrl = httpResponse.data;
                if (typeof (redirectUrl) === "string" && redirectUrl.length > 0)
                    window.location.href = redirectUrl;
                else {
                    _this.isLoading_Payment = false;
                    alert("Unable to initiate WePay auto-pay setup");
                }
            }, function (httpResponse) {
                _this.isLoading_Payment = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    alert(httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user clicks the button to disable auto-pay
         */
        AssessmentPaymentFormController.prototype.onDisableAutoPay = function () {
            var _this = this;
            if (!confirm("Just to double check, this will disable your auto-payment. You need to make sure to manually make your regular payments to avoid any late fees your association may enforce."))
                return;
            this.isLoading_Payment = true;
            this.$http.get("/api/WePayPayment/DisableAutoPay").then(function () {
                _this.isLoading_Payment = false;
                _this.isWePayAutoPayActive = false;
            }, function (httpResponse) {
                _this.isLoading_Payment = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    alert(httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Sign-up a user for Dwolla payments
         */
        AssessmentPaymentFormController.prototype.dwollaSignUp = function () {
            var _this = this;
            if (!this.didAgreeToDwollaTerms) {
                alert("Please agree to Dwolla's terms and privacy policy");
                return;
            }
            this.isLoading_Payment = true;
            this.$http.post("/api/Dwolla/CreatePayer", this.dwollaSignUpInfo).then(function () {
                window.location.reload();
            }, function (httpResponse) {
                _this.isLoading_Payment = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    alert(httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Begin the Dwolla IAV (instant account verification) process
         */
        AssessmentPaymentFormController.prototype.dwollaStartIAV = function () {
            var _this = this;
            this.shouldShowDwollaAddAccountModal = true;
            this.shouldShowDwollaModalClose = false;
            this.isDwollaIavDone = false;
            this.isLoadingDwolla = true;
            var startIav = function (iavToken) {
                dwolla.configure(Ally.AppConfigInfo.dwollaEnvironmentName);
                dwolla.iav.start(iavToken, {
                    container: 'dwolla-iav-container',
                    stylesheets: [
                        'https://fonts.googleapis.com/css?family=Lato&subset=latin,latin-ext'
                    ],
                    microDeposits: true,
                    fallbackToMicroDeposits: true
                }, function (err, res) {
                    //console.log( 'Error: ' + JSON.stringify( err ) + ' -- Response: ' + JSON.stringify( res ) );
                    if (res && res._links && res._links["funding-source"] && res._links["funding-source"].href) {
                        var fundingSourceUri = res._links["funding-source"].href;
                        // Tell the server
                        _this.$http.put("/api/Dwolla/SetUserFundingSourceUri", { fundingSourceUri: fundingSourceUri }).then(function () {
                            _this.isDwollaIavDone = true;
                        }, function (httpResponse) {
                            _this.isLoadingDwolla = false;
                            _this.shouldShowDwollaModalClose = true;
                            alert("Failed to complete sign-up: " + httpResponse.data.exceptionMessage);
                        });
                    }
                });
            };
            this.$http.get("/api/Dwolla/UserIavToken").then(function (httpResponse) {
                _this.isLoadingDwolla = false;
                window.setTimeout(function () { return startIav(httpResponse.data.iavToken); }, 150);
            }, function (httpResponse) {
                _this.isLoadingDwolla = false;
                alert("Failed to start IAV: " + httpResponse.data.exceptionMessage);
            });
        };
        AssessmentPaymentFormController.prototype.hideDwollaAddAccountModal = function () {
            this.shouldShowDwollaAddAccountModal = false;
            if (this.isDwollaIavDone) {
                this.isLoading_Payment = true;
                window.location.reload();
            }
        };
        /**
         * Submit the user's Paragon bank account information
         */
        AssessmentPaymentFormController.prototype.submitDwollaPayment = function () {
            //if( !confirm( "This will submit payment." ) )
            //    return;
            var _this = this;
            this.dwollaPaymentMessage = null;
            this.isLoading_Payment = true;
            this.$http.post("/api/Dwolla/MakePayment", this.paymentInfo).then(function () {
                _this.isLoading_Payment = false;
                _this.dwollaPaymentMessage = "Payment Successfully Processed";
                _this.refreshHistoricPayments();
            }, function (errorResponse) {
                _this.isLoading_Payment = false;
                _this.dwollaPaymentMessage = "Payment failed: " + errorResponse.data.exceptionMessage;
            });
        };
        AssessmentPaymentFormController.prototype.refreshHistoricPayments = function () {
            var _this = this;
            this.isLoading_Payment = true;
            this.$http.get("/api/MyProfile/RecentPayments").then(function (response) {
                _this.isLoading_Payment = false;
                _this.historicPayments = response.data;
            }, function (errorResponse) {
                _this.isLoading_Payment = false;
                console.log("Failed to refresh rescent payments: " + errorResponse.data.exceptionMessage);
            });
        };
        /**
         * Unlink and remove a user's Dwolla funding source
         */
        AssessmentPaymentFormController.prototype.unlinkDwollaFundingSource = function () {
            var _this = this;
            if (!confirm("Are you sure you want to disconnect the bank account? You will no longer be able to make payments."))
                return;
            this.isLoading_Payment = true;
            this.$http.put("/api/Dwolla/DisconnectUserFundingSource", null).then(function () {
                window.location.reload();
            }, function (httpResponse) {
                _this.isLoading_Payment = false;
                alert("Failed to disconnect account" + httpResponse.data.exceptionMessage);
            });
        };
        AssessmentPaymentFormController.prototype.getFeeAmount = function (amount) {
            // dwollaFeePercent is in display percent, so 0.5 = 0.5% = 0.005 scalar
            // So we only need to divide by 100 to get our rounded fee
            var feeAmount = Math.ceil(amount * this.dwollaFeePercent) / 100;
            // Cap the fee at $5 for premium, $10 for free plan groups
            if (feeAmount > this.dwollaMaxFee)
                feeAmount = this.dwollaMaxFee;
            return feeAmount;
        };
        /**
         * Occurs when the amount to pay changes
         */
        AssessmentPaymentFormController.prototype.onPaymentAmountChange = function () {
            var feeAmount = this.getFeeAmount(this.paymentInfo.amount);
            this.dwollaFeeAmountString = "$" + feeAmount.toFixed(2);
        };
        /**
         * Occurs when the user clicks the button to upload their Dwolla identification document
         */
        AssessmentPaymentFormController.prototype.uploadDwollaDoc = function () {
            var _this = this;
            this.isLoading_Payment = true;
            this.dwollaDocUploadMessage = null;
            var formData = new FormData();
            formData.append("DocumentFile", this.dwollaDocUploadFile);
            formData.append("DocumentType", this.dwollaDocUploadType);
            var postHeaders = {
                headers: { "Content-Type": undefined } // Need to remove this to avoid the JSON body assumption by the server
            };
            this.$http.post("/api/Dwolla/UploadCustomerDocument", formData, postHeaders).then(function () {
                _this.isLoading_Payment = false;
                _this.dwollaDocUploadFile = null;
                _this.dwollaDocUploadMessage = "Your document has been successfully uploaded. You will be notified when it is reviewed.";
            }, function (httpResponse) {
                _this.isLoading_Payment = false;
                alert("Failed to upload document: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user selects a file for upload to Dwolla
         */
        AssessmentPaymentFormController.prototype.onDwollaDocSelected = function (event) {
            if (!event)
                this.dwollaDocUploadFile = null;
            else
                this.dwollaDocUploadFile = event.target.files[0];
        };
        /**
         * Occurs when the user clicks the button to withdraw their Dwolla balance
         */
        AssessmentPaymentFormController.prototype.withdrawDwollaBalance = function () {
            var _this = this;
            this.isLoading_Payment = true;
            this.dwollaBalanceMessage = null;
            this.$http.get("/api/Dwolla/WithdrawDwollaBalance").then(function () {
                _this.isLoading_Payment = false;
                _this.dwollaBalanceMessage = "Balance withdraw successfully initiated. Expect the transfer to complete in 1-2 business days.";
            }, function (httpResponse) {
                _this.isLoading_Payment = false;
                alert("Failed to initiate withdraw: " + httpResponse.data.exceptionMessage);
            });
        };
        AssessmentPaymentFormController.prototype.submitDwollaMicroDepositAmounts = function () {
            var _this = this;
            this.isLoading_Payment = true;
            var postData = {
                amount1String: this.dwollaMicroDepositAmount1String,
                amount2String: this.dwollaMicroDepositAmount2String,
                isForGroup: false
            };
            this.$http.post("/api/Dwolla/VerifyMicroDeposit", postData).then(function () {
                window.location.reload();
            }, function (httpResponse) {
                _this.isLoading_Payment = false;
                alert("Failed to verify: " + httpResponse.data.exceptionMessage);
            });
        };
        AssessmentPaymentFormController.prototype.reloadPage = function () {
            this.isLoading_Payment = true;
            window.location.reload();
        };
        AssessmentPaymentFormController.prototype.enableDwollaAutoPay = function () {
            var _this = this;
            this.isLoading_Payment = true;
            this.$http.put("/api/Dwolla/EnableAutoPay/" + encodeURIComponent(this.assessmentAmount.toString()), null).then(function () {
                window.location.reload();
            }, function (httpResponse) {
                _this.isLoading_Payment = false;
                alert("Failed to enable Dwolla auto-pay: " + httpResponse.data.exceptionMessage);
            });
        };
        AssessmentPaymentFormController.prototype.disableDwollaAutoPay = function () {
            var _this = this;
            this.isLoading_Payment = true;
            this.$http.put("/api/Dwolla/DisableAutoPay", null).then(function () {
                window.location.reload();
            }, function (httpResponse) {
                _this.isLoading_Payment = false;
                alert("Failed to disable Dwolla auto-pay: " + httpResponse.data.exceptionMessage);
            });
        };
        AssessmentPaymentFormController.$inject = ["$http", "SiteInfo", "$rootScope", "$sce", "$timeout", "$q"];
        return AssessmentPaymentFormController;
    }());
    Ally.AssessmentPaymentFormController = AssessmentPaymentFormController;
    var CheckoutRequest = /** @class */ (function () {
        function CheckoutRequest() {
        }
        return CheckoutRequest;
    }());
    var DwollaAccountStatusInfo = /** @class */ (function () {
        function DwollaAccountStatusInfo() {
        }
        return DwollaAccountStatusInfo;
    }());
    var MakePaymentRequest = /** @class */ (function () {
        function MakePaymentRequest() {
        }
        return MakePaymentRequest;
    }());
})(Ally || (Ally = {}));
CA.angularApp.component("assessmentPaymentForm", {
    templateUrl: "/ngApp/common/assessment-payment-form.html",
    controller: Ally.AssessmentPaymentFormController
});
var CreateDwollaUser = /** @class */ (function () {
    function CreateDwollaUser() {
    }
    return CreateDwollaUser;
}());
var ParagonPayerSignUpInfo = /** @class */ (function () {
    function ParagonPayerSignUpInfo() {
        this.billingAddress = new Ally.FullAddress();
        this.checkType = "PERSONAL";
        this.accountType = "CHECKING";
    }
    return ParagonPayerSignUpInfo;
}());
var ParagonPaymentRequest = /** @class */ (function () {
    function ParagonPaymentRequest() {
    }
    return ParagonPaymentRequest;
}());

var Ally;
(function (Ally) {
    /**
     * The controller for the page to track group spending
     */
    var CustomPageViewController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function CustomPageViewController($http, siteInfo, $sce, $routeParams) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$sce = $sce;
            this.$routeParams = $routeParams;
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        CustomPageViewController.prototype.$onInit = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/PublicCustomPage/View/" + this.$routeParams.slug, { cache: true }).then(function (httpResponse) {
                _this.isLoading = false;
                _this.customPage = httpResponse.data;
                _this.markupHtml = _this.$sce.trustAsHtml(_this.customPage.markupHtml);
                // Make <a> links open in new tabs
                setTimeout(function () { return Ally.RichTextHelper.makeLinksOpenNewTab("custom-page-content"); }, 500);
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to load page, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage);
            });
        };
        CustomPageViewController.$inject = ["$http", "SiteInfo", "$sce", "$routeParams"];
        return CustomPageViewController;
    }());
    Ally.CustomPageViewController = CustomPageViewController;
    var CustomPage = /** @class */ (function () {
        function CustomPage() {
        }
        return CustomPage;
    }());
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
    var DateRangePickerController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function DateRangePickerController(appCacheService, $scope, $timeout) {
            this.appCacheService = appCacheService;
            this.$scope = $scope;
            this.$timeout = $timeout;
            this.filterPresetDateRange = "custom";
            this.shouldSuppressCustom = false;
            this.thisYearLabel = new Date().getFullYear().toString();
            this.lastYearLabel = (new Date().getFullYear() - 1).toString();
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        DateRangePickerController.prototype.$onInit = function () {
            var _this = this;
            if (!this.startDate && !this.endDate)
                this.selectPresetDateRange(true);
            this.$scope.$watch("$ctrl.startDate", function (newValue, oldValue) {
                if (!newValue || newValue === oldValue || _this.shouldSuppressCustom)
                    return;
                _this.filterPresetDateRange = "custom";
            });
            this.$scope.$watch("$ctrl.endDate", function (newValue, oldValue) {
                if (!newValue || newValue === oldValue || _this.shouldSuppressCustom)
                    return;
                _this.filterPresetDateRange = "custom";
            });
        };
        DateRangePickerController.prototype.selectPresetDateRange = function (suppressRefresh) {
            var _this = this;
            if (suppressRefresh === void 0) { suppressRefresh = false; }
            if (this.filterPresetDateRange === "last30days") {
                this.startDate = moment().subtract(30, 'days').toDate();
                this.endDate = moment().toDate();
            }
            else if (this.filterPresetDateRange === "thisMonth") {
                this.startDate = moment().startOf('month').toDate();
                this.endDate = moment().endOf('month').toDate();
            }
            else if (this.filterPresetDateRange === "lastMonth") {
                var lastMonth = moment().subtract(1, 'months');
                this.startDate = lastMonth.startOf('month').toDate();
                this.endDate = lastMonth.endOf('month').toDate();
            }
            else if (this.filterPresetDateRange === "thisYear") {
                this.startDate = moment().startOf('year').toDate();
                this.endDate = moment().endOf('year').toDate();
            }
            else if (this.filterPresetDateRange === "lastYear") {
                var lastYear = moment().subtract(1, 'years');
                this.startDate = lastYear.startOf('year').toDate();
                this.endDate = lastYear.endOf('year').toDate();
            }
            else if (this.filterPresetDateRange === "oneYear") {
                this.startDate = moment().subtract(1, 'years').toDate();
                this.endDate = moment().toDate();
            }
            // To prevent the dumb $watch from clearing our preselect label
            this.shouldSuppressCustom = true;
            window.setTimeout(function () { return _this.shouldSuppressCustom = false; }, 25);
            if (!suppressRefresh && this.onChange)
                window.setTimeout(function () { return _this.onChange(); }, 50); // Delay a bit to let Angular's digests run on the bound dates
        };
        DateRangePickerController.prototype.onInternalChange = function (suppressChangeEvent) {
            var _this = this;
            if (suppressChangeEvent === void 0) { suppressChangeEvent = false; }
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
            if (!suppressChangeEvent) {
                // Delay just a touch to let the model update
                this.$timeout(function () {
                    if (_this.onChange)
                        _this.onChange();
                }, 10);
            }
        };
        DateRangePickerController.$inject = ["appCacheService", "$scope", "$timeout"];
        return DateRangePickerController;
    }());
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

/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../Scripts/typings/moment/moment.d.ts" />
/// <reference path="../../Scripts/typings/underscore/underscore.d.ts" />
/// <reference path="../Services/html-util.ts" />
var Ally;
(function (Ally) {
    var DocumentTreeFile = /** @class */ (function () {
        function DocumentTreeFile() {
        }
        return DocumentTreeFile;
    }());
    Ally.DocumentTreeFile = DocumentTreeFile;
    var DocLinkInfo = /** @class */ (function () {
        function DocLinkInfo() {
        }
        return DocLinkInfo;
    }());
    Ally.DocLinkInfo = DocLinkInfo;
    var DocumentDirectory = /** @class */ (function () {
        function DocumentDirectory() {
        }
        DocumentDirectory.prototype.getSubDirectoryByName = function (dirName) {
            if (!this.subdirectories)
                return null;
            for (var dirIndex = 0; dirIndex < this.subdirectories.length; ++dirIndex) {
                if (this.subdirectories[dirIndex].name === dirName)
                    return this.subdirectories[dirIndex];
            }
            return null;
        };
        return DocumentDirectory;
    }());
    Ally.DocumentDirectory = DocumentDirectory;
    /**
     * The controller for the documents widget that lets group view, upload, and modify documents
     */
    var DocumentsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function DocumentsController($http, $rootScope, $cacheFactory, $scope, siteInfo, fellowResidents, $location) {
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
        DocumentsController.prototype.$onInit = function () {
            var _this = this;
            this.canManage = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager;
            // Make sure committee members can manage their data
            if (this.committee && !this.canManage)
                this.fellowResidents.isCommitteeMember(this.committee.committeeId).then(function (isCommitteeMember) { return _this.canManage = isCommitteeMember; });
            this.apiAuthToken = this.$rootScope.authToken;
            this.Refresh();
            var hookUpFileUpload = function () {
                var uploader = $('#JQDocsFileUploader');
                uploader.fileupload({
                    autoUpload: true,
                    pasteZone: null,
                    add: function (e, data) {
                        //var scopeElement = document.getElementById( 'documents-area' );
                        //var scope = angular.element( scopeElement ).scope();
                        //this.$scope.$apply( () => this.isLoading = false );
                        var MaxFileSize = 1024 * 1024 * 50;
                        if (data.files[0].size > MaxFileSize) {
                            var fileMB = Math.round(data.files[0].size / (1024 * 1024)) + 1;
                            alert("The selected file is too large (" + fileMB + "MB). The maximum file size allowed is 50MB.");
                            return;
                        }
                        var dirPath = _this.getSelectedDirectoryPath();
                        $("#FileUploadProgressContainer").show();
                        data.url = "api/DocumentUpload?dirPath=" + encodeURIComponent(dirPath);
                        if (_this.siteInfo.publicSiteInfo.baseApiUrl)
                            data.url = _this.siteInfo.publicSiteInfo.baseApiUrl + "DocumentUpload?dirPath=" + encodeURIComponent(dirPath);
                        var xhr = data.submit();
                        xhr.done(function () {
                            _this.docsHttpCache.removeAll();
                            $("#FileUploadProgressContainer").hide();
                            _this.Refresh();
                        });
                        xhr.error(function (jqXHR) {
                            alert("Upload failed: " + jqXHR.responseJSON.exceptionMessage);
                            //console.log( "fail", jqXHR, textStatus, errorThrown );
                        });
                    },
                    beforeSend: function (xhr) {
                        if (_this.siteInfo.publicSiteInfo.baseApiUrl)
                            xhr.setRequestHeader("Authorization", "Bearer " + _this.apiAuthToken);
                        else
                            xhr.setRequestHeader("ApiAuthToken", _this.apiAuthToken);
                    },
                    progressall: function (e, data) {
                        var progress = parseInt((data.loaded / data.total * 100).toString(), 10);
                        $('#FileUploadProgressBar').css('width', progress + '%');
                        if (progress === 100)
                            $("#FileUploadProgressLabel").text("Finalizing Upload...");
                        else
                            $("#FileUploadProgressLabel").text(progress + "%");
                    },
                    fail: function (e, xhr) {
                        $("#FileUploadProgressContainer").hide();
                        alert("Failed to upload document");
                        console.log("Failed to upload document", xhr);
                    }
                });
            };
            setTimeout(hookUpFileUpload, 100);
            if (this.committee)
                this.title = "Committee Documents";
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Get the name of the selected directory. If it is a sub-directory then include the parent
        // name.
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.getSelectedDirectoryPath = function () {
            return this.getDirectoryFullPath(this.selectedDirectory);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Open a document via double-click
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.viewDoc = function (curFile, isForDownload) {
            var _this = this;
            this.isLoading = true;
            this.showPopUpWarning = false;
            var viewDocWindow;
            // Force download of RTFs. Eventually we'll make this a allow-list of extensions that
            // browsers can display directly
            if (this.getDisplayExtension(curFile) === ".rtf")
                isForDownload = true;
            ++curFile.numViews;
            if (!isForDownload) {
                viewDocWindow = window.open('', '_blank');
                var wasPopUpBlocked = !viewDocWindow || viewDocWindow.closed || typeof viewDocWindow.closed === "undefined";
                if (wasPopUpBlocked) {
                    alert("Looks like your browser may be blocking pop-ups which are required to view documents. Please see the right of the address bar or your browser settings to enable pop-ups for " + AppConfig.appName + ".");
                    this.showPopUpWarning = true;
                }
                else
                    viewDocWindow.document.write('Loading document... (If the document cannot be viewed directly in your browser, it will be downloaded automatically)');
            }
            var viewUri = "/api/DocumentLink/" + curFile.docId;
            this.$http.get(viewUri).then(function (response) {
                _this.isLoading = false;
                var fileUri = curFile.url + "?vid=" + encodeURIComponent(response.data.vid);
                if (HtmlUtil.startsWith(fileUri, "/api/"))
                    fileUri = fileUri.substr("/api/".length);
                fileUri = _this.siteInfo.publicSiteInfo.baseApiUrl + fileUri;
                if (isForDownload) {
                    // Create a link and click it
                    var link = document.createElement('a');
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
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to open document: " + response.data.exceptionMessage);
            });
        };
        DocumentsController.prototype.startZipGenDownload = function () {
            var _this = this;
            var refreshGenStatus = null;
            var numRefreshes = 0;
            refreshGenStatus = function () {
                _this.$http.get("/api/DocumentUpload/GetZipGenStatus?vid=" + _this.generatingZipId).then(function (response) {
                    ++numRefreshes;
                    if (response.data.totalNumFiles === 0)
                        _this.generatingZipStatus = "Still waiting...";
                    else
                        _this.generatingZipStatus = response.data.numFilesProcessed + " of " + response.data.totalNumFiles + " files processed";
                    if (response.data.isReady) {
                        _this.generatingZipStatus = "ready";
                        _this.downloadZipUrl = _this.siteInfo.publicSiteInfo.baseApiUrl + "DocumentUpload/DownloadZipGen?vid=" + _this.generatingZipId;
                    }
                    else
                        window.setTimeout(function () { return refreshGenStatus(); }, 750);
                }, function (response) {
                    _this.generatingZipStatus = null;
                    alert("Zip file generation failed: " + response.data.exceptionMessage);
                });
            };
            this.generatingZipStatus = "Starting...";
            var getUri = "/api/DocumentUpload/StartFullZipGeneration";
            if (this.committee)
                getUri += "?committeeId=" + this.committee.committeeId;
            this.$http.get(getUri).then(function (response) {
                _this.generatingZipId = response.data.statusId;
                _this.generatingZipStatus = "Waiting for update...";
                window.setTimeout(function () { return refreshGenStatus(); }, 1250);
            }, function (response) {
                _this.generatingZipStatus = null;
                alert("Failed to start zip generation: " + response.data.exceptionMessage);
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Get the name of the selected directory. If it is a sub-directory then include the parent
        // name.
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.getDirectoryFullPath = function (dir) {
            var curPath = dir.name;
            var parentDir = dir.parentDirectory;
            while (parentDir) {
                curPath = parentDir.name + "/" + curPath;
                parentDir = parentDir.parentDirectory;
            }
            if (this.committee)
                curPath = DocumentsController.DirName_Committees + "/" + this.committee.committeeId + "/" + curPath;
            return curPath;
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Find a directory object by name
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.FindDirectoryByPath = function (dirPath) {
            if (!this.documentTree)
                return;
            // Remove the committee prefix if there is one
            if (this.committee && HtmlUtil.startsWith(dirPath, DocumentsController.DirName_Committees)) {
                dirPath = dirPath.substr(DocumentsController.DirName_Committees.length + 1);
                var lastSlashIndex = dirPath.indexOf('/');
                if (lastSlashIndex !== -1)
                    dirPath = dirPath.substr(lastSlashIndex + 1);
            }
            // Split on slashes
            var dirPathParts = dirPath.split("/");
            var curDir = this.documentTree;
            for (var i = 0; i < dirPathParts.length; ++i) {
                curDir = curDir.getSubDirectoryByName(dirPathParts[i]);
                if (!curDir)
                    break;
            }
            return curDir;
        };
        DocumentsController.prototype.updateFileFilter = function () {
            var lowerFilter = (this.fileSearch.all || '').toLowerCase();
            var filterSearchFiles = function (file) {
                return (file.localFilePath || '').toLowerCase().indexOf(lowerFilter) !== -1
                    || (file.uploadDateString || '').toLowerCase().indexOf(lowerFilter) !== -1
                    || (file.uploaderFullName || '').toLowerCase().indexOf(lowerFilter) !== -1;
            };
            this.searchFileList = _.filter(this.fullSearchFileList, filterSearchFiles);
            setTimeout(function () {
                // Force redraw of the document. Not sure why, but the file list disappears on Chrome
                var element = document.getElementById("documents-area");
                var disp = element.style.display;
                element.style.display = 'none';
                var trick = element.offsetHeight;
                element.style.display = disp;
            }, 50);
        };
        // Make it so the user can drag and drop files between folders
        DocumentsController.prototype.hookUpFileDragging = function () {
            var _this = this;
            // If the user can't manage the association then do nothing
            if (!this.canManage)
                return;
            setTimeout(function () {
                // Make the folders accept dropped files
                var droppables = $(".droppable");
                droppables.droppable({
                    drop: function (event, ui) {
                        var selectedDirectoryPath = _this.getSelectedDirectoryPath();
                        var uiDraggable = $(ui.draggable);
                        uiDraggable.draggable("option", "revert", "false");
                        var destFolderName = $(event.target).attr("data-folder-path").trim();
                        _this.$scope.$apply(function () {
                            // Display the loading image
                            _this.isLoading = true;
                            var fileAction = {
                                relativeS3Path: _this.selectedFile.relativeS3Path,
                                action: "move",
                                newFileName: "",
                                sourceFolderPath: selectedDirectoryPath,
                                destinationFolderPath: destFolderName
                            };
                            _this.selectedFile = null;
                            // Tell the server
                            _this.$http.put("/api/ManageDocuments/MoveFile", fileAction).then(function () {
                                _this.isLoading = false;
                                _this.docsHttpCache.removeAll();
                                _this.Refresh();
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
                            }, function (data) {
                                _this.isLoading = false;
                                var message = data.exceptionMessage || data.message || data;
                                alert("Failed to move file: " + message);
                            });
                        });
                    },
                    hoverClass: "Document_Folder_DropHover"
                });
                // Allow the files to be dragged
                var draggables = $(".draggable");
                draggables.draggable({
                    distance: 10,
                    revert: true,
                    helper: "clone",
                    opacity: 1,
                    containment: "document",
                    appendTo: "body",
                    start: function (event) {
                        // Get the index of the file being dragged (ID is formatted like "File_12")
                        var fileIndexString = $(event.target).attr("id").substring("File_".length);
                        var fileIndex = parseInt(fileIndexString);
                        _this.$scope.$apply(function () {
                            var fileInfo = _this.selectedDirectory.files[fileIndex];
                            _this.selectedFile = fileInfo;
                        });
                    }
                });
            }, 250);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when a directory gets clicked. I made this an inline expression, but the model did
        // not refresh
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.onDirectoryClicked = function (dir) {
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
                var committeePrefix = DocumentsController.DirName_Committees + "/" + this.committee.committeeId + "/";
                this.$location.search("directory", dir.fullDirectoryPath.substring(committeePrefix.length));
            }
            else
                this.$location.search("directory", dir.fullDirectoryPath);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to create a directory within the root directory
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.createDirectory = function () {
            this.createUnderParentDirName = null;
            if (this.committee)
                this.createUnderParentDirName = DocumentsController.DirName_Committees + "/" + this.committee.committeeId;
            this.shouldShowCreateFolderModal = true;
            setTimeout(function () { return $('#CreateDirectoryNameTextBox').focus(); }, 50);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to create a directory within the current directory
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.CreateSubDirectory = function () {
            this.createUnderParentDirName = this.selectedDirectory.fullDirectoryPath;
            if (this.committee)
                this.createUnderParentDirName = DocumentsController.DirName_Committees + "/" + this.committee.committeeId + "/" + this.createUnderParentDirName;
            this.shouldShowCreateFolderModal = true;
            setTimeout(function () { return $('#CreateDirectoryNameTextBox').focus(); }, 50);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to sort the files
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.SetFileSortType = function (sortType) {
            // If we're already sorting by this property, flip the order
            if (this.fileSortType === sortType)
                this.filesSortDescend = !this.filesSortDescend;
            else
                this.filesSortDescend = false;
            this.fileSortType = sortType;
            window.localStorage[DocumentsController.LocalStorageKey_SortType] = this.fileSortType;
            window.localStorage[DocumentsController.LocalStorageKey_SortDirection] = this.filesSortDescend;
            this.SortFiles();
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Sort the visible files according to our selected method
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.SortFiles = function () {
            if (!this.selectedDirectory || !this.selectedDirectory.files)
                return;
            if (this.fileSortType === "title" || this.fileSortType === "uploadDate")
                this.selectedDirectory.files = _.sortBy(this.selectedDirectory.files, this.fileSortType);
            if (this.filesSortDescend)
                this.selectedDirectory.files.reverse();
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to create a new directory
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.onCreateDirectoryClicked = function () {
            var _this = this;
            // Display the loading image
            this.isLoading = true;
            var putUri = "/api/ManageDocuments/CreateDirectory?folderName=" + encodeURIComponent(this.newDirectoryName);
            // If we're creating a subdirectory
            putUri += "&parentFolderPath=";
            if (this.createUnderParentDirName)
                putUri += encodeURIComponent(this.createUnderParentDirName);
            this.$http.put(putUri, null).then(function () {
                _this.docsHttpCache.removeAll();
                _this.newDirectoryName = "";
                _this.Refresh();
                _this.shouldShowCreateFolderModal = false;
            }, function (response) {
                alert("Failed to create the folder: " + response.data.exceptionMessage);
                _this.isLoading = false;
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the cancel button when creating a new directory
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.onCancelAddDirectory = function () {
            this.shouldShowCreateFolderModal = false;
            this.newDirectoryName = "";
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when a file gets clicked
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.onFileClicked = function (file) {
            this.selectedFile = file;
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to rename a document
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.RenameDocument = function (document) {
            var _this = this;
            if (!document)
                return;
            var newTitle = prompt("Enter the new name for the file", document.title);
            if (newTitle === null)
                return;
            if (newTitle.length > 64)
                newTitle = newTitle.substr(0, 64);
            // Display the loading image
            this.isLoading = true;
            var fileAction = {
                relativeS3Path: document.relativeS3Path,
                action: "rename",
                newTitle: newTitle,
                sourceFolderPath: this.getSelectedDirectoryPath(),
                destinationFolderPath: ""
            };
            this.$http.put("/api/ManageDocuments/RenameFile", fileAction).then(function () {
                _this.docsHttpCache.removeAll();
                _this.Refresh();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to rename: " + response.data.exceptionMessage);
                _this.Refresh();
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to delete a document
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.DeleteDocument = function (document) {
            var _this = this;
            if (confirm("Are you sure you want to delete this file?")) {
                // Display the loading image
                this.isLoading = true;
                this.$http.delete("/api/ManageDocuments?docPath=" + document.relativeS3Path).then(function () {
                    _this.docsHttpCache.removeAll();
                    _this.Refresh();
                }, function (response) {
                    _this.isLoading = false;
                    alert("Failed to delete file: " + response.data.exceptionMessage);
                    _this.Refresh();
                });
            }
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to edit a directory name
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.RenameSelectedDirectory = function () {
            var _this = this;
            if (!this.selectedDirectory)
                return;
            var newDirectoryName = prompt("Enter the new name for the directory", this.selectedDirectory.name);
            if (newDirectoryName === null)
                return;
            if (newDirectoryName.length > 32)
                newDirectoryName = newDirectoryName.substr(0, 32);
            // Display the loading image
            this.isLoading = true;
            var oldDirectoryPath = encodeURIComponent(this.getSelectedDirectoryPath());
            var newDirectoryNameQS = encodeURIComponent(newDirectoryName);
            this.$http.put("/api/ManageDocuments/RenameDirectory?directoryPath=" + oldDirectoryPath + "&newDirectoryName=" + newDirectoryNameQS, null).then(function () {
                _this.docsHttpCache.removeAll();
                // Update the selected directory name so we can reselect it
                _this.selectedDirectory.name = newDirectoryName;
                _this.Refresh();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to rename directory: " + response.data.exceptionMessage);
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to delete a document
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.DeleteSelectedDirectory = function () {
            var _this = this;
            if (!this.selectedDirectory)
                return;
            if (this.selectedDirectory.files.length > 0) {
                alert("You can not delete a folder that contains files. Please delete or move all files from the folder.");
                return;
            }
            if (confirm("Are you sure you want to delete this folder?")) {
                // Display the loading image
                this.isLoading = true;
                var dirPath = this.getSelectedDirectoryPath();
                this.$http.delete("/api/ManageDocuments/DeleteDirectory?directoryPath=" + encodeURIComponent(dirPath)).then(function () {
                    _this.docsHttpCache.removeAll();
                    _this.Refresh();
                }, function (httpResult) {
                    _this.isLoading = false;
                    alert("Failed to delete the folder: " + httpResult.data.exceptionMessage);
                });
            }
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Get the icon for a file
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.getFileIcon = function (fileName) {
            if (!fileName)
                return "";
            var extension = fileName.split('.').pop().toLowerCase();
            var imagePath = null;
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
        };
        DocumentsController.prototype.isGenericIcon = function (file) {
            var iconFilePath = this.getFileIcon(file.fileName);
            var GenericIconPath = "/assets/images/FileIcons/GenericFileIcon.png";
            return iconFilePath === GenericIconPath;
        };
        DocumentsController.prototype.getDisplayExtension = function (file) {
            var extension = file.fileName.split('.').pop().toLowerCase();
            return "." + extension;
        };
        DocumentsController.prototype.hookupParentDirs = function (dir) {
            var _this = this;
            dir.fullDirectoryPath = this.getDirectoryFullPath(dir);
            dir.getSubDirectoryByName = DocumentDirectory.prototype.getSubDirectoryByName;
            if (!dir.subdirectories)
                return;
            dir.subdirectories.forEach(function (subDir) {
                subDir.parentDirectory = dir;
                subDir.directoryDepth = dir.directoryDepth + 1;
                _this.hookupParentDirs(subDir);
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Refresh the file tree
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.Refresh = function () {
            var _this = this;
            // Store the name of the directory we have selected so we can re-select it after refreshing
            // the data
            var selectedDirectoryPath = null;
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
            this.$http.get(this.getDocsUri, { cache: this.docsHttpCache }).then(function (httpResponse) {
                _this.isLoading = false;
                _this.documentTree = httpResponse.data;
                _this.documentTree.getSubDirectoryByName = DocumentDirectory.prototype.getSubDirectoryByName;
                // Hook up parent directories
                _this.documentTree.subdirectories.forEach(function (dir) {
                    dir.directoryDepth = 0;
                    _this.hookupParentDirs(dir);
                });
                // Build an array of all local files
                var allFiles = [];
                var processDir = function (subdir) {
                    _.each(subdir.files, function (f) {
                        f.localFilePath = subdir.name + "/" + f.title;
                        f.uploadDateString = moment(f.uploadDate).format("MMMM D, YYYY");
                    });
                    Array.prototype.push.apply(allFiles, subdir.files);
                    _.each(subdir.subdirectories, processDir);
                };
                processDir(_this.documentTree);
                _this.fullSearchFileList = allFiles;
                // Find the directory we had selected before the refresh
                if (selectedDirectoryPath) {
                    _this.selectedDirectory = _this.FindDirectoryByPath(selectedDirectoryPath);
                    _this.SortFiles();
                }
                _this.hookUpFileDragging();
            }, function (response) {
                alert("Failed to retrieve documents, please contact technical support. No need to worry, no documents have been lost.");
                _this.isLoading = false;
                console.log("Failed to retrieve docs: " + response.data.exceptionMessage);
                //$( "#FileTreePanel" ).hide();
                //innerThis.errorMessage = "Failed to retrieve the building documents.";
            });
        };
        DocumentsController.$inject = ["$http", "$rootScope", "$cacheFactory", "$scope", "SiteInfo", "fellowResidents", "$location"];
        DocumentsController.LocalStorageKey_SortType = "DocsInfo_FileSortType";
        DocumentsController.LocalStorageKey_SortDirection = "DocsInfo_FileSortDirection";
        DocumentsController.DirName_Committees = "Committees_Root";
        return DocumentsController;
    }());
    Ally.DocumentsController = DocumentsController;
    var FullZipGenStatus = /** @class */ (function () {
        function FullZipGenStatus() {
        }
        return FullZipGenStatus;
    }());
})(Ally || (Ally = {}));
CA.angularApp.component("documents", {
    bindings: {
        committee: "<"
    },
    templateUrl: "/ngApp/common/documents.html",
    controller: Ally.DocumentsController
});

/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../Services/html-util.ts" />
var Ally;
(function (Ally) {
    var InfoItem = /** @class */ (function () {
        function InfoItem() {
        }
        return InfoItem;
    }());
    Ally.InfoItem = InfoItem;
    /**
     * The controller for the frequently asked questions widget
     */
    var FAQsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function FAQsController($http, $rootScope, siteInfo, $cacheFactory, fellowResidents) {
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
        FAQsController.prototype.$onInit = function () {
            var _this = this;
            this.hideDocuments = this.$rootScope["userInfo"].isRenter && !this.siteInfo.privateSiteInfo.rentersCanViewDocs;
            this.canManage = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager;
            // Make sure committee members can manage their data
            if (this.committee && !this.canManage)
                this.fellowResidents.isCommitteeMember(this.committee.committeeId).then(function (isCommitteeMember) { return _this.canManage = isCommitteeMember; });
            this.faqsHttpCache = this.$cacheFactory.get("faqs-http-cache") || this.$cacheFactory("faqs-http-cache");
            this.retrieveInfo();
            // Hook up the rich text editor
            Ally.HtmlUtil2.initTinyMce("tiny-mce-editor", 500).then(function (e) { return _this.tinyMceEditor = e; });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Populate the info section
        ///////////////////////////////////////////////////////////////////////////////////////////////
        FAQsController.prototype.retrieveInfo = function () {
            var _this = this;
            this.isLoadingInfo = true;
            if (!this.getUri) {
                this.getUri = "/api/InfoItem";
                if (this.committee)
                    this.getUri = "/api/InfoItem/Committee/" + this.committee.committeeId;
            }
            this.$http.get(this.getUri, { cache: this.faqsHttpCache }).then(function (httpResponse) {
                _this.isLoadingInfo = false;
                _this.infoItems = httpResponse.data;
                // Make <a> links open in new tabs
                setTimeout(function () {
                    for (var i = 0; i < _this.infoItems.length; ++i)
                        RichTextHelper.makeLinksOpenNewTab("info-item-body-" + i);
                }, 500);
            });
        };
        ;
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Scroll to an info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        FAQsController.prototype.scrollToInfo = function (infoItemIndex) {
            document.getElementById("info-item-title-" + infoItemIndex).scrollIntoView();
        };
        ;
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user edits an info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        FAQsController.prototype.onStartEditInfoItem = function (infoItem) {
            // Clone the object
            this.editingInfoItem = jQuery.extend({}, infoItem);
            this.tinyMceEditor.setContent(this.editingInfoItem.body);
            // Scroll down to the editor
            window.scrollTo(0, document.body.scrollHeight);
        };
        ;
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to add a new info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        FAQsController.prototype.onSubmitItem = function () {
            var _this = this;
            this.editingInfoItem.body = this.tinyMceEditor.getContent();
            this.isBodyMissing = HtmlUtil.isNullOrWhitespace(this.editingInfoItem.body);
            var validateable = $("#info-item-edit-form");
            validateable.validate();
            if (!validateable.valid() || this.isBodyMissing)
                return;
            if (this.committee)
                this.editingInfoItem.committeeId = this.committee.committeeId;
            this.isLoadingInfo = true;
            var onSave = function () {
                _this.isLoadingInfo = false;
                _this.tinyMceEditor.setContent("");
                _this.editingInfoItem = new InfoItem();
                // Switched to removeAll because when we switched to the new back-end, the cache
                // key is the full request URI, not just the "/api/InfoItem" form
                //this.faqsHttpCache.remove( this.getUri );
                _this.faqsHttpCache.removeAll();
                _this.retrieveInfo();
            };
            var onError = function () {
                _this.isLoadingInfo = false;
                alert("Failed to save your information. Please try again and if this happens again contact support.");
            };
            // If we're editing an existing info item
            if (typeof (this.editingInfoItem.infoItemId) == "number")
                this.$http.put("/api/InfoItem", this.editingInfoItem).then(onSave);
            // Otherwise create a new one
            else
                this.$http.post("/api/InfoItem", this.editingInfoItem).then(onSave);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to delete an info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        FAQsController.prototype.onDeleteInfoItem = function (infoItem) {
            var _this = this;
            if (!confirm('Are you sure you want to delete this information?'))
                return;
            this.isLoadingInfo = true;
            this.$http.delete("/api/InfoItem/" + infoItem.infoItemId).then(function () {
                _this.isLoadingInfo = false;
                _this.faqsHttpCache.removeAll();
                _this.retrieveInfo();
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to cancel editing of an info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        FAQsController.prototype.cancelInfoItemEdit = function () {
            this.editingInfoItem = new InfoItem();
            this.tinyMceEditor.setContent("");
        };
        FAQsController.$inject = ["$http", "$rootScope", "SiteInfo", "$cacheFactory", "fellowResidents"];
        return FAQsController;
    }());
    Ally.FAQsController = FAQsController;
    var RichTextHelper = /** @class */ (function () {
        function RichTextHelper() {
        }
        RichTextHelper.showFileUploadAlert = function (reason, detail) {
            var msg = "";
            if (reason === "unsupported-file-type")
                msg = "Unsupported format " + detail;
            else
                console.log("error uploading file", reason, detail);
            $('<div class="alert"> <button type="button" class="close" data-dismiss="alert">&times;</button>' +
                '<strong>File upload error</strong> ' + msg + ' </div>').prependTo('#alerts');
        };
        RichTextHelper.makeLinksOpenNewTab = function (elemId) {
            window.setTimeout(function () {
                // Make links in the welcome message open in a new tab
                $("a", "#" + elemId).each(function (index, elem) {
                    // Let local links modify the current tab
                    var isLocalLink = elem.href && (elem.href[0] === "#" || elem.href.indexOf(AppConfig.baseTld) > -1);
                    if (!isLocalLink)
                        $(elem).attr("target", "_blank");
                });
            }, 100);
        };
        return RichTextHelper;
    }());
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
    var ResidentTransactionsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ResidentTransactionsController($http, siteInfo, $timeout, uiGridConstants, $scope) {
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
        ResidentTransactionsController.prototype.$onInit = function () {
            var _this = this;
            this.homeName = AppConfig.homeName || "Unit";
            // A callback to calculate the sum for a column across all ui-grid pages, not just the visible page
            var addAmountOverAllRows = function () {
                var allGridRows = _this.transactionGridApi.grid.rows;
                var visibleGridRows = allGridRows.filter(function (r) { return r.visible && r.entity && !isNaN(r.entity.amount); });
                var sum = 0;
                visibleGridRows.forEach(function (item) { return sum += (item.entity.amount || 0); });
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
                    onRegisterApi: function (gridApi) {
                        _this.transactionGridApi = gridApi;
                    }
                };
        };
        /**
         * Populate the text that is shown for the unit column in the resident grid
         */
        ResidentTransactionsController.prototype.populateGridUnitLabels = function () {
            var _this = this;
            return this.$http.get("/api/MemberUnit/NamesOnly").then(function (httpResponse) {
                var allUnits = httpResponse.data;
                _.each(_this.allFinancialTxns, function (tx) {
                    if (!tx.associatedUnitId)
                        return;
                    var unit = allUnits.find(function (u) { return u.unitId === tx.associatedUnitId; });
                    if (!unit)
                        return;
                    tx.unitGridLabel = unit.name;
                });
            }, function (httpResponse) {
                //this.isLoading = false;
                console.log("Failed to load units");
                //alert( `Failed to load units, please contact technical support. (${httpResponse.data.exceptionMessage})` );
            });
        };
        ResidentTransactionsController.prototype.showModal = function () {
            this.shouldShowModal = true;
            this.refreshEntries();
        };
        ResidentTransactionsController.prototype.refreshEntries = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/OwnerLedger/MyTransactions").then(function (httpResponse) {
                _this.isLoading = false;
                _this.allFinancialTxns = httpResponse.data.entries;
                _this.ownerFinanceTxNote = httpResponse.data.ownerFinanceTxNote;
                _this.ownerBalance = httpResponse.data.ownerBalance;
                // Hide the unit column if the owner only has one unit
                var allUnitIds = _this.allFinancialTxns.map(function (u) { return u.associatedUnitId; });
                var uniqueUnitIds = allUnitIds.filter(function (v, i, a) { return a.indexOf(v) === i; });
                var unitColumn = _this.transactionGridOptions.columnDefs.find(function (c) { return c.field === "unitGridLabel"; });
                if (unitColumn) {
                    unitColumn.visible = uniqueUnitIds.length > 1 || _this.siteInfo.userInfo.usersUnits.length > 1;
                    _this.isUnitColVisible = unitColumn.visible;
                }
                //this.transactionGridOptions.data = httpResponse.data;
                //if( this.transactionGridOptions.data.length <= this.HistoryPageSize )
                //{
                //    this.transactionGridOptions.enablePagination = false;
                //    this.transactionGridOptions.enablePaginationControls = false;
                //}
                var initialLoad = function () {
                    if (_this.allFinancialTxns.length > 1) {
                        // Transactions come down newest first
                        _this.filterEndDate = _this.allFinancialTxns[0].transactionDate;
                        _this.filterStartDate = _this.allFinancialTxns[_this.allFinancialTxns.length - 1].transactionDate;
                    }
                    _this.onFilterDateRangeChange();
                };
                // Put this in a slight delay so the date range picker can exist
                _this.$timeout(function () {
                    if (_this.isUnitColVisible)
                        _this.populateGridUnitLabels().then(initialLoad, initialLoad);
                    else
                        initialLoad();
                }, 100);
            }, function () {
                _this.isLoading = false;
            });
        };
        ResidentTransactionsController.prototype.exportTransactionsCsv = function () {
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
        };
        ResidentTransactionsController.prototype.onFilterDateRangeChange = function () {
            var _this = this;
            if (!this.filterStartDate || !this.filterEndDate)
                return;
            // Wrap this in $timeout so it refreshes properly, from here: https://stackoverflow.com/a/17958847/10315651
            this.$timeout(function () {
                var txRows = _this.allFinancialTxns.filter(function (t) { return t.transactionDate >= _this.filterStartDate && t.transactionDate <= _this.filterEndDate; });
                _this.transactionGridOptions.data = txRows;
                _this.transactionGridOptions.virtualizationThreshold = txRows.length + 1;
                if (_this.transactionGridOptions.data.length <= _this.HistoryPageSize) {
                    _this.transactionGridOptions.enablePagination = false;
                    _this.transactionGridOptions.enablePaginationControls = false;
                }
            }, 10);
        };
        ResidentTransactionsController.$inject = ["$http", "SiteInfo", "$timeout", "uiGridConstants", "$scope"];
        return ResidentTransactionsController;
    }());
    Ally.ResidentTransactionsController = ResidentTransactionsController;
    var OwnerTxInfo = /** @class */ (function () {
        function OwnerTxInfo() {
        }
        return OwnerTxInfo;
    }());
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
    var GroupRedirectController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function GroupRedirectController($routeParams) {
            this.$routeParams = $routeParams;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        GroupRedirectController.prototype.$onInit = function () {
            var lowerAppName = (this.$routeParams.appName || "").toLowerCase();
            var appConfigs = [CondoAllyAppConfig, HomeAppConfig, HOAAppConfig, NeighborhoodAppConfig, BlockClubAppConfig];
            var domainName = null;
            for (var i = 0; i < appConfigs.length; ++i) {
                if (appConfigs[i].appShortName.toLowerCase() === lowerAppName) {
                    domainName = appConfigs[i].baseTld;
                    break;
                }
            }
            if (!domainName)
                domainName = "condoally.com";
            domainName = "myhoaally.org";
            var redirectUrl = "https://" + this.$routeParams.shortName + "." + domainName + "/";
            window.location.href = redirectUrl;
        };
        GroupRedirectController.$inject = ["$routeParams"];
        return GroupRedirectController;
    }());
    Ally.GroupRedirectController = GroupRedirectController;
})(Ally || (Ally = {}));
CA.angularApp.component("groupRedirect", {
    templateUrl: "/ngApp/common/group-redirect.html",
    controller: Ally.GroupRedirectController
});

var Ally;
(function (Ally) {
    var SendEmailRecpientEntry = /** @class */ (function () {
        function SendEmailRecpientEntry() {
        }
        return SendEmailRecpientEntry;
    }());
    var HomeEmailMessage = /** @class */ (function () {
        function HomeEmailMessage() {
            this.recipientType = "board";
        }
        return HomeEmailMessage;
    }());
    /**
     * The controller for the widget that lets members send emails to the group
     */
    var GroupSendEmailController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function GroupSendEmailController($http, fellowResidents, $rootScope, siteInfo, $scope) {
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
        GroupSendEmailController.prototype.$onInit = function () {
            var _this = this;
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
                this.$scope.$on("prepAssessmentEmailToBoard", function (event, data) { return _this.prepBadAssessmentEmailForBoard(data); });
                if (AppConfig.appShortName === "pta") {
                    this.defaultSubject = "A message from a PTA member";
                    this.memberLabel = "member";
                    this.memberPageName = "Members";
                }
                else
                    this.defaultSubject = "A message from your neighbor";
            }
            this.messageObject.subject = this.defaultSubject;
        };
        /**
         * Populate the group email options
         */
        GroupSendEmailController.prototype.loadGroupEmails = function () {
            var _this = this;
            this.isLoadingEmail = true;
            this.fellowResidents.getGroupEmailObject().then(function (emailList) {
                _this.isLoadingEmail = false;
                _this.availableEmailGroups = emailList.filter(function (e) { return e.recipientType !== "Treasurer"; }); // No need to show treasurer in this list since it's a single person
                if (_this.availableEmailGroups.length > 0) {
                    _this.defaultMessageRecipient = _this.availableEmailGroups[0];
                    _this.selectedRecipient = _this.availableEmailGroups[0];
                    _this.onSelectEmailGroup();
                }
            });
        };
        /**
         * Setup an email to be sent to the board for assessment issues
         */
        GroupSendEmailController.prototype.prepBadAssessmentEmailForBoard = function (emitEventData) {
            var emitDataParts = emitEventData.split("|");
            var assessmentAmount = emitDataParts[0];
            var nextPaymentText = null;
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
        };
        /**
         * Occurs when the user presses the button to send an email to members of the building
         */
        GroupSendEmailController.prototype.onSendEmail = function () {
            var _this = this;
            $("#message-form").validate();
            if (!$("#message-form").valid())
                return;
            this.isLoadingEmail = true;
            // Set this flag so we don't redirect if sending results in a 403
            this.$rootScope.dontHandle403 = true;
            analytics.track("sendEmail", {
                recipientId: this.messageObject.recipientType
            });
            this.$http.post("/api/Email/v2", this.messageObject).then(function () {
                _this.$rootScope.dontHandle403 = false;
                _this.isLoadingEmail = false;
                _this.messageObject = new HomeEmailMessage();
                _this.selectedRecipient = _this.defaultMessageRecipient;
                _this.messageObject.recipientType = _this.defaultMessageRecipient.recipientType;
                _this.messageObject.subject = _this.defaultSubject;
                _this.onSelectEmailGroup();
                if (_this.committee)
                    _this.messageObject.committeeId = _this.committee.committeeId;
                _this.showSendConfirmation = true;
                _this.showSendEmail = false;
            }, function (httpResponse) {
                _this.isLoadingEmail = false;
                _this.$rootScope.dontHandle403 = false;
                if (httpResponse.status === 403) {
                    _this.showEmailForbidden = true;
                }
                else
                    alert("Unable to send email: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user selects an email group from the drop-down
         */
        GroupSendEmailController.prototype.onSelectEmailGroup = function () {
            if (!this.selectedRecipient)
                return;
            this.messageObject.recipientType = this.selectedRecipient.recipientType;
            var isCustomRecipientGroup = this.messageObject.recipientType.toUpperCase() === Ally.FellowResidentsService.CustomRecipientType;
            this.messageObject.customRecipientShortName = isCustomRecipientGroup ? this.selectedRecipient.recipientTypeName : null;
            this.groupEmailAddress = (isCustomRecipientGroup ? this.selectedRecipient.recipientTypeName : this.selectedRecipient.recipientType) + "." + this.siteInfo.publicSiteInfo.shortName + "@inmail." + AppConfig.baseTld;
            // No need to show this right now as the showRestrictedGroupWarning is more clear
            this.showDiscussionEveryoneWarning = false; // this.messageObject.recipientType === "Everyone";
            var isSendingToOwners = this.messageObject.recipientType.toLowerCase().indexOf("owners") !== -1;
            if (!this.showDiscussionEveryoneWarning
                && isSendingToOwners
                && this.siteInfo.privateSiteInfo.numUnits > 30)
                this.showDiscussionLargeWarning = true;
            else
                this.showDiscussionLargeWarning = false;
            var isSendingToDiscussion = this.messageObject.recipientType.toLowerCase().indexOf("discussion") !== -1;
            var isSendingToBoard = this.messageObject.recipientType.toLowerCase().indexOf("board") !== -1;
            var isSendingToPropMgr = this.messageObject.recipientType.toLowerCase().indexOf("propertymanagers") !== -1;
            this.showDiscussionEveryoneWarning = false;
            this.showDiscussionLargeWarning = false;
            this.showUseDiscussSuggestion = !isSendingToDiscussion && !isSendingToBoard && !isSendingToPropMgr && AppConfig.isChtnSite && !isCustomRecipientGroup;
            this.showRestrictedGroupWarning = this.selectedRecipient.isRestrictedGroup;
            this.shouldShowSendAsBoard = Ally.FellowResidentsService.isNonPropMgrBoardPosition(this.siteInfo.userInfo.boardPosition) && !isSendingToBoard;
        };
        GroupSendEmailController.$inject = ["$http", "fellowResidents", "$rootScope", "SiteInfo", "$scope"];
        return GroupSendEmailController;
    }());
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
    var LocalNewsFeedController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function LocalNewsFeedController($http, siteInfo, $timeout) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.isLoading = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        LocalNewsFeedController.prototype.$onInit = function () {
            var _this = this;
            // Load the news with a slight delay to help the page load faster
            this.isLoading = true;
            this.$timeout(function () { return _this.loadNewsStories(); }, 200);
        };
        /**
         * Refresh the local news feed
         */
        LocalNewsFeedController.prototype.loadNewsStories = function () {
            var _this = this;
            //window.location.host is subdomain.domain.com
            var subDomain = HtmlUtil.getSubdomain(window.location.host);
            // A little test to help the automated tests run faster
            var isTestSubdomain = subDomain === "qa" || subDomain === "localtest";
            isTestSubdomain = false; // Allow on test sites for now
            if (isTestSubdomain)
                return;
            this.isLoading = true;
            var localNewsUri;
            var queryParams;
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
            }).then(function (httpResponse) {
                _this.isLoading = false;
                _this.localNewStories = httpResponse.data;
            });
        };
        LocalNewsFeedController.$inject = ["$http", "SiteInfo", "$timeout"];
        return LocalNewsFeedController;
    }());
    Ally.LocalNewsFeedController = LocalNewsFeedController;
})(Ally || (Ally = {}));
CA.angularApp.component("localNewsFeed", {
    templateUrl: "/ngApp/common/local-news-feed.html",
    controller: Ally.LocalNewsFeedController
});

var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Ally;
(function (Ally) {
    var MailingHistoryInfo = /** @class */ (function () {
        function MailingHistoryInfo() {
        }
        return MailingHistoryInfo;
    }());
    var MailingResultBase = /** @class */ (function () {
        function MailingResultBase() {
        }
        return MailingResultBase;
    }());
    var MailingResultEmail = /** @class */ (function (_super) {
        __extends(MailingResultEmail, _super);
        function MailingResultEmail() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return MailingResultEmail;
    }(MailingResultBase));
    var MailingResultPaperMail = /** @class */ (function (_super) {
        __extends(MailingResultPaperMail, _super);
        function MailingResultPaperMail() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return MailingResultPaperMail;
    }(MailingResultBase));
    var MailingResults = /** @class */ (function () {
        function MailingResults() {
        }
        return MailingResults;
    }());
    /**
     * The controller for the invoice mailing view
     */
    var MailingHistoryController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function MailingHistoryController($http, siteInfo, $timeout) {
            var _this = this;
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
                    onRegisterApi: function (gridApi) {
                        _this.historyGridApi = gridApi;
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
                    onRegisterApi: function (gridApi) {
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        MailingHistoryController.prototype.$onInit = function () {
            this.refreshHistory();
        };
        /**
         * Display the results for a mailing
         */
        MailingHistoryController.prototype.showMailingResults = function (mailingEntry) {
            var _this = this;
            // We need to put this in a timeout because ui-grid cannot properly size itself until
            // the DOM element for the grid is shown
            this.$timeout(function () {
                _.forEach(mailingEntry.mailingResultObject.emailResults, function (r) { return r.mailingType = "E-mail"; });
                _.forEach(mailingEntry.mailingResultObject.paperMailResults, function (r) { return r.mailingType = "Paper Letter"; });
                var resultsRows = [];
                resultsRows = resultsRows.concat(mailingEntry.mailingResultObject.emailResults, mailingEntry.mailingResultObject.paperMailResults);
                _this.resultsGridOptions.data = resultsRows;
                _this.resultsGridOptions.minRowsToShow = resultsRows.length;
                _this.resultsGridOptions.virtualizationThreshold = resultsRows.length;
                _this.resultsGridheight = (resultsRows.length + 1) * _this.resultsGridOptions.rowHeight;
                _this.$timeout(function () {
                    _this.viewingResults = mailingEntry.mailingResultObject;
                    //var evt = document.createEvent( 'UIEvents' );
                    //evt.initUIEvent( 'resize', true, false, window, 0 );
                    //window.dispatchEvent( evt );
                }, 10);
            }, 0);
        };
        /**
         * Load the mailing history
         */
        MailingHistoryController.prototype.refreshHistory = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Mailing/History").then(function (response) {
                _this.isLoading = false;
                _this.historyGridOptions.data = response.data;
                _this.historyGridOptions.minRowsToShow = response.data.length;
                _this.historyGridOptions.virtualizationThreshold = response.data.length;
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to load mailing history: " + response.data.exceptionMessage);
            });
        };
        MailingHistoryController.$inject = ["$http", "SiteInfo", "$timeout"];
        return MailingHistoryController;
    }());
    Ally.MailingHistoryController = MailingHistoryController;
})(Ally || (Ally = {}));
CA.angularApp.component("mailingHistory", {
    templateUrl: "/ngApp/common/mailing/mailing-history.html",
    controller: Ally.MailingHistoryController
});

var Ally;
(function (Ally) {
    var InvoiceMailingEntry = /** @class */ (function () {
        function InvoiceMailingEntry() {
            this.isValidMailingAddress = null;
        }
        return InvoiceMailingEntry;
    }());
    var InvoiceFullMailing = /** @class */ (function () {
        function InvoiceFullMailing() {
        }
        return InvoiceFullMailing;
    }());
    var FullMailingResult = /** @class */ (function () {
        function FullMailingResult() {
        }
        return FullMailingResult;
    }());
    var AddressVerificationResult = /** @class */ (function () {
        function AddressVerificationResult() {
        }
        return AddressVerificationResult;
    }());
    var InvoicePreviewInfo = /** @class */ (function () {
        function InvoicePreviewInfo() {
        }
        return InvoicePreviewInfo;
    }());
    var InvoicePreviewInfoResult = /** @class */ (function () {
        function InvoicePreviewInfoResult() {
        }
        return InvoicePreviewInfoResult;
    }());
    /**
     * The controller for the invoice mailing view
     */
    var MailingInvoiceController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function MailingInvoiceController($http, siteInfo, fellowResidents, wizardHandler, $scope, $timeout, $location) {
            var _this = this;
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
            var amountCellTemplate = '<div class="ui-grid-cell-contents">$<input type="number" style="width: 90%;" data-ng-model="row.entity[col.field]" autocomplete="off" data-lpignore="true" data-form-type="other" /></div>';
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
                    onRegisterApi: function (gridApi) {
                        _this.gridApi = gridApi;
                        var updateFromSelection = function () {
                            var selectedRows = gridApi.selection.getSelectedRows();
                            _this.selectedEntries = selectedRows;
                            //_.forEach( <InvoiceMailingEntry[]>this.homesGridOptions.data, e => e.shouldIncludeForSending = false );
                            //_.forEach( this.selectedEntries, e => e.shouldIncludeForSending = true );
                        };
                        gridApi.selection.on.rowSelectionChanged($scope, function () { return updateFromSelection(); });
                        gridApi.selection.on.rowSelectionChangedBatch($scope, function () { return updateFromSelection(); });
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        MailingInvoiceController.prototype.$onInit = function () {
            var _this = this;
            this.authToken = this.siteInfo.authToken;
            this.isAdmin = this.siteInfo.userInfo.isAdmin;
            this.loadMailingInfo();
            this.$scope.$on('wizard:stepChanged', function (event, args) {
                // If we moved to the second step, amounts due
                _this.activeStepIndex = args.index;
                if (_this.activeStepIndex === 1) {
                    _this.$timeout(function () {
                        // Tell the grid to resize as there is a bug with UI-Grid
                        //$( window ).resize();
                        //$( window ).resize();
                        //var evt = document.createEvent( 'UIEvents' );
                        //evt.initUIEvent( 'resize', true, false, window, 0 );
                        //window.dispatchEvent( evt );
                        // Update the grid to show the selection based on our internal selection
                        for (var _i = 0, _a = _this.selectedEntries; _i < _a.length; _i++) {
                            var curRow = _a[_i];
                            _this.gridApi.selection.selectRow(curRow);
                        }
                        //this.$timeout( () => this.gridApi.selection.selectAllRows(), 200 );
                    }, 250);
                }
                // Or if we moved to the third step, contact method
                if (_this.activeStepIndex === 2) {
                    // Filter out any fields with an empty due
                    // TWC - 6/25/19 - Had a request to still be able to send out $0 invoices, makes sense
                    //this.selectedEntries = _.filter( this.selectedEntries, e => this.getTotalDue( e ) != 0 );
                    // For long lists of homes, make sure the user is brought to the top
                    window.setTimeout(function () { return document.getElementById("delivery-method-header").scrollIntoView(true); }, 50);
                }
                // Or if we moved to the last step
                else if (_this.activeStepIndex === 3) {
                    _this.numEmailsToSend = _.filter(_this.selectedEntries, function (e) { return e.shouldSendEmail; }).length;
                    _this.numPaperLettersToSend = _.filter(_this.selectedEntries, function (e) { return e.shouldSendPaperMail; }).length;
                }
            });
            this.shouldShowAutoUnselect = this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled
                && this.siteInfo.privateSiteInfo.assessmentFrequency >= 50;
            if (this.shouldShowAutoUnselect) {
                this.autoUnselectLabel = MailingInvoiceController.getCurrentPayPeriodLabel(this.siteInfo.privateSiteInfo.assessmentFrequency);
                if (!this.autoUnselectLabel)
                    this.shouldShowAutoUnselect = false;
            }
        };
        MailingInvoiceController.getCurrentPayPeriod = function (assessmentFrequency) {
            var payPeriodInfo = FrequencyIdToInfo(assessmentFrequency);
            if (!payPeriodInfo)
                return null;
            var today = new Date();
            var periodInfo = {
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
        };
        MailingInvoiceController.getCurrentPayPeriodLabel = function (assessmentFrequency) {
            var payPeriodInfo = FrequencyIdToInfo(assessmentFrequency);
            if (!payPeriodInfo)
                return null;
            var periodNames = GetLongPayPeriodNames(payPeriodInfo.intervalName);
            if (!periodNames)
                return new Date().getFullYear().toString();
            var currentPeriod = MailingInvoiceController.getCurrentPayPeriod(assessmentFrequency);
            var yearString = currentPeriod.year.toString();
            return periodNames[currentPeriod.period] + " " + yearString;
        };
        MailingInvoiceController.prototype.customizeNotes = function (recipient) {
            recipient.overrideNotes = this.fullMailingInfo.notes || " ";
        };
        MailingInvoiceController.prototype.uncustomizeNotes = function (recipient) {
            recipient.overrideNotes = null;
        };
        MailingInvoiceController.prototype.setAllDues = function () {
            var _this = this;
            _.forEach(this.fullMailingInfo.mailingEntries, function (e) { return e.amountDue = _this.allDuesSetAmount; });
        };
        MailingInvoiceController.prototype.getTotalDue = function (recipient) {
            return recipient.amountDue - Math.abs(recipient.balanceForward || 0) + (recipient.lateFee || 0);
        };
        MailingInvoiceController.prototype.onShouldSendPaperMailChange = function (recipient) {
            //if( recipient.shouldSendPaperMail )
            //    this.validateAddress( recipient );
            if (recipient.shouldSendPaperMail)
                this.testAddressRequiredFields(recipient);
            else {
                recipient.isValidMailingAddress = recipient.validationMessage = null;
                this.numInvalidMailingAddresses = _.filter(this.selectedEntries, function (e) { return e.isValidMailingAddress === false; }).length;
            }
        };
        MailingInvoiceController.prototype.onAddressChanged = function (recipient) {
            //if( recipient.shouldSendPaperMail )
            //    this.validateAddress( recipient );
            if (recipient.shouldSendPaperMail)
                this.testAddressRequiredFields(recipient);
        };
        /**
         * Test the mailability of an address
         */
        MailingInvoiceController.prototype.testAddressRequiredFields = function (recipient) {
            var _this = this;
            recipient.isValidating = true;
            recipient.isValidMailingAddress = null;
            recipient.validationMessage = null;
            return this.$http.post("/api/Mailing/TestMailability", recipient.streetAddressObject).then(function (response) {
                recipient.isValidating = false;
                recipient.isValidMailingAddress = response.data.isValid;
                recipient.validationMessage = response.data.verificationMessage;
                _this.numInvalidMailingAddresses = _.filter(_this.selectedEntries, function (e) { return e.isValidMailingAddress === false; }).length;
            }, function (response) {
                recipient.isValidating = false;
                recipient.isValidMailingAddress = false;
                recipient.validatedAddress = null;
                recipient.validationMessage = "Address validation failed: " + response.data.exceptionMessage;
            });
        };
        /**
         * Run the recipient addresses through an address validator
         */
        MailingInvoiceController.prototype.validateAddress = function (recipient) {
            recipient.isValidating = true;
            recipient.isValidMailingAddress = null;
            var validateUri = "/api/Mailing/VerifyAddress?address=" + encodeURIComponent(JSON.stringify(recipient.streetAddressObject));
            return this.$http.get(validateUri).then(function (response) {
                recipient.isValidating = false;
                recipient.isValidMailingAddress = response.data.isValid;
                recipient.validationMessage = response.data.verificationMessage;
                if (recipient.isValidMailingAddress)
                    recipient.validatedAddress = response.data.parsedStreetAddress.multiLiner;
            }, function (response) {
                recipient.isValidating = false;
                recipient.isValidMailingAddress = false;
                recipient.validatedAddress = null;
                recipient.validationMessage = response.data.exceptionMessage;
            });
        };
        MailingInvoiceController.prototype.previewInvoice = function (entry) {
            var _this = this;
            var previewPostInfo = new InvoicePreviewInfo();
            previewPostInfo.invoiceTitleString = this.fullMailingInfo.invoiceTitleString;
            previewPostInfo.dueDateString = this.fullMailingInfo.dueDateString;
            previewPostInfo.duesLabel = this.fullMailingInfo.duesLabel;
            previewPostInfo.fromAddress = this.fullMailingInfo.fromStreetAddress;
            previewPostInfo.mailingInfo = entry;
            previewPostInfo.notes = entry.overrideNotes || this.fullMailingInfo.notes;
            this.isLoading = true;
            entry.wasPopUpBlocked = false;
            this.$http.post("/api/Mailing/Preview/Invoice", previewPostInfo).then(function (response) {
                _this.isLoading = false;
                var getUri = _this.siteInfo.publicSiteInfo.baseApiUrl + "PublicMailing/Preview/Invoice/" + response.data.previewId;
                var newWindow = window.open(getUri, "_blank");
                entry.wasPopUpBlocked = !newWindow || newWindow.closed || typeof newWindow.closed === "undefined";
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to preview invoice: " + response.data.exceptionMessage);
            });
            //var entryInfo = encodeURIComponent( JSON.stringify( entry ) );
            //var invoiceUri = `/api/Mailing/Preview/Invoice?ApiAuthToken=${this.authToken}&fromAddress=${encodeURIComponent( JSON.stringify( this.fullMailingInfo.fromStreetAddress ) )}&notes=${encodeURIComponent( this.fullMailingInfo.notes )}&dueDateString=${encodeURIComponent( this.fullMailingInfo.dueDateString )}&duesLabel=${encodeURIComponent( this.fullMailingInfo.duesLabel )}&mailingInfo=${entryInfo}`;
            //window.open( invoiceUri, "_blank" );
        };
        MailingInvoiceController.prototype.onFinishedWizard = function () {
            var _this = this;
            if (this.numPaperLettersToSend === 0) {
                if (this.numEmailsToSend === 0)
                    alert("No emails or paper letters selected to send.");
                else
                    this.submitFullMailingAfterCharge();
                return;
            }
            var checkoutHandler = StripeCheckout.configure({
                key: StripeApiKey,
                image: '/assets/images/icons/Icon-144.png',
                locale: 'auto',
                email: this.siteInfo.userInfo.emailAddress,
                token: function (token) {
                    // You can access the token ID with `token.id`.
                    // Get the token ID to your server-side code for use.
                    _this.fullMailingInfo.stripeToken = token.id;
                    _this.submitFullMailingAfterCharge();
                }
            });
            this.isLoading = true;
            // Open Checkout with further options:
            checkoutHandler.open({
                name: 'Community Ally',
                description: "Mailing " + this.numPaperLettersToSend + " invoice" + (this.numPaperLettersToSend === 1 ? '' : 's'),
                zipCode: true,
                amount: this.numPaperLettersToSend * this.paperInvoiceDollars * 100 // Stripe uses cents
            });
            // Close Checkout on page navigation:
            window.addEventListener('popstate', function () {
                checkoutHandler.close();
            });
        };
        MailingInvoiceController.prototype.submitFullMailingAfterCharge = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.post("/api/Mailing/Send/Invoice", this.fullMailingInfo).then(function (response) {
                _this.isLoading = false;
                var message = "Your invoices have been successfully sent" + (response.data.hadErrors ? ', but there were errors' : '') + ". You can view the status in the history tab.";
                alert(message);
                _this.$location.path("/Mailing/History");
            }, function (response) {
                _this.isLoading = false;
                alert("There was a problem sending your mailing, none were sent and you were not charged. Error: " + response.data.exceptionMessage);
            });
        };
        /**
        * Retrieve mailing info from the server
        */
        MailingInvoiceController.prototype.loadMailingInfo = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Mailing/RecipientInfo").then(function (response) {
                _this.isLoading = false;
                _this.fullMailingInfo = response.data;
                _this.homesGridOptions.data = response.data.mailingEntries;
                _this.homesGridOptions.minRowsToShow = response.data.mailingEntries.length;
                _this.homesGridOptions.virtualizationThreshold = response.data.mailingEntries.length;
                _this.selectedEntries = _.clone(response.data.mailingEntries);
            });
        };
        /**
         * Scroll to the first invalid mail address
         */
        MailingInvoiceController.prototype.scrollToFirstAddressError = function () {
            var firstBadAddress = _.find(this.selectedEntries, function (e) { return e.isValidMailingAddress === false; });
            if (!firstBadAddress)
                return;
            var badAddressIndex = _.indexOf(this.selectedEntries, firstBadAddress);
            if (badAddressIndex === -1)
                return;
            var badAddressElem = document.getElementById("recipient-entry-" + badAddressIndex);
            badAddressElem.scrollIntoView();
        };
        MailingInvoiceController.prototype.toggleAllSending = function (type) {
            var _this = this;
            if (this.selectedEntries.length === 0)
                return;
            if (type === "email") {
                var shouldSetTo = !this.selectedEntries[0].shouldSendEmail;
                for (var i = 0; i < this.selectedEntries.length; ++i) {
                    if (HtmlUtil.isNullOrWhitespace(this.selectedEntries[i].emailAddresses) || !this.selectedEntries[i].amountDue)
                        this.selectedEntries[i].shouldSendEmail = false;
                    else
                        this.selectedEntries[i].shouldSendEmail = shouldSetTo;
                }
            }
            // Otherwise the user toggled sending for paper mail
            else {
                var shouldSetTo = !this.selectedEntries[0].shouldSendPaperMail;
                for (var i = 0; i < this.selectedEntries.length; ++i) {
                    if (!this.selectedEntries[i].streetAddressObject || !this.selectedEntries[i].amountDue)
                        this.selectedEntries[i].shouldSendPaperMail = false;
                    else
                        this.selectedEntries[i].shouldSendPaperMail = shouldSetTo;
                }
                // If we disabled paper mail sending then clear the errors
                if (!shouldSetTo) {
                    _.each(this.selectedEntries, function (e) { return e.isValidMailingAddress = e.validationMessage = null; });
                    this.numInvalidMailingAddresses = 0;
                }
                // Otherwise if we enabled the sending and there are selected recipients, then verify all addresses
                else if (shouldSetTo && this.selectedEntries.length > 0) {
                    var recipientsToVerify_1 = _.clone(this.selectedEntries);
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
                    this.numAddressesToBulkValidate = recipientsToVerify_1.length;
                    var testAddressAllStep_1 = function () {
                        _this.testAddressRequiredFields(recipientsToVerify_1[0]).then(function () {
                            recipientsToVerify_1.splice(0, 1);
                            while (recipientsToVerify_1.length > 0 && !recipientsToVerify_1[0].amountDue)
                                recipientsToVerify_1.splice(0, 1);
                            _this.numAddressesToBulkValidate = recipientsToVerify_1.length;
                            if (recipientsToVerify_1.length > 0)
                                testAddressAllStep_1();
                        });
                    };
                    testAddressAllStep_1();
                }
            }
        };
        MailingInvoiceController.prototype.autoUnselectPaidOwners = function () {
            var _this = this;
            this.isLoading = true;
            var currentPeriod = MailingInvoiceController.getCurrentPayPeriod(this.siteInfo.privateSiteInfo.assessmentFrequency);
            var getUri = "/api/PaymentHistory/RecentPayPeriod/" + currentPeriod.year + "/" + currentPeriod.period1Based;
            this.$http.get(getUri).then(function (response) {
                _this.isLoading = false;
                var _loop_1 = function (mailingEntry) {
                    var paidUnits = response.data.filter(function (u) { return mailingEntry.unitIds.indexOf(u.unitId) !== -1; });
                    var isPaid = paidUnits.length > 0;
                    if (isPaid)
                        _this.gridApi.selection.unSelectRow(mailingEntry, null);
                    else
                        _this.gridApi.selection.selectRow(mailingEntry, null);
                };
                for (var _i = 0, _a = _this.homesGridOptions.data; _i < _a.length; _i++) {
                    var mailingEntry = _a[_i];
                    _loop_1(mailingEntry);
                }
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to retrieve assessment status: " + response.data.exceptionMessage);
            });
        };
        MailingInvoiceController.$inject = ["$http", "SiteInfo", "fellowResidents", "WizardHandler", "$scope", "$timeout", "$location"];
        return MailingInvoiceController;
    }());
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
    var MailingParentController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function MailingParentController($http, siteInfo, $routeParams, $cacheFactory, $rootScope) {
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
        MailingParentController.prototype.$onInit = function () {
        };
        MailingParentController.$inject = ["$http", "SiteInfo", "$routeParams", "$cacheFactory", "$rootScope"];
        return MailingParentController;
    }());
    Ally.MailingParentController = MailingParentController;
})(Ally || (Ally = {}));
CA.angularApp.component("mailingParent", {
    templateUrl: "/ngApp/common/mailing/mailing-parent.html",
    controller: Ally.MailingParentController
});

var Ally;
(function (Ally) {
    var MaintenanceProject = /** @class */ (function () {
        function MaintenanceProject() {
        }
        return MaintenanceProject;
    }());
    Ally.MaintenanceProject = MaintenanceProject;
    var TagPickerItem = /** @class */ (function () {
        function TagPickerItem() {
        }
        return TagPickerItem;
    }());
    var Equipment = /** @class */ (function () {
        function Equipment() {
        }
        return Equipment;
    }());
    var VendorListItem = /** @class */ (function () {
        function VendorListItem() {
        }
        return VendorListItem;
    }());
    Ally.VendorListItem = VendorListItem;
    var MaintenanceController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function MaintenanceController($http, $rootScope, siteInfo, maintenanceService, fellowResidents) {
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
            this.equipmentTypeOptions = _.map(MaintenanceController.AutocompleteEquipmentTypeOptions, function (o) { return o.text; });
            this.equipmentLocationOptions = _.map(MaintenanceController.AutocompleteLocationOptions, function (o) { return o.text; });
            this.maintenanceTodoListId = siteInfo.privateSiteInfo.maintenanceTodoListId;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        MaintenanceController.prototype.$onInit = function () {
            var _this = this;
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
            this.fellowResidents.getResidents().then(function (residents) { return _this.assigneeOptions = _.clone(residents); }); // Cloned so we can edit locally
            this.entriesSortField = window.localStorage[MaintenanceController.StorageKey_SortField];
            if (!this.entriesSortField) {
                this.entriesSortField = "entryDate";
                this.entriesSortAscending = true;
            }
            else
                this.entriesSortAscending = window.localStorage[MaintenanceController.StorageKey_SortDir] === "true";
            this.loadEquipment()
                .then(function () { return _this.loadVendors(); })
                .then(function () { return _this.loadProjects(); })
                .then(function () { return _this.loadMaintenanceTodos(); })
                .then(function () { return _this.rebuildMaintenanceEntries(); });
        };
        /**
        * Rebuild the arrow of projects and to-do's
        */
        MaintenanceController.prototype.rebuildMaintenanceEntries = function () {
            var _this = this;
            this.maintenanceEntries = [];
            _.forEach(this.projects, function (p) {
                var newEntry = new Ally.MaintenanceEntry();
                newEntry.project = p;
                _this.maintenanceEntries.push(newEntry);
            });
            _.forEach(this.maintenanceTodos.todoItems, function (t) {
                var newEntry = new Ally.MaintenanceEntry();
                newEntry.todo = t;
                _this.maintenanceEntries.push(newEntry);
            });
            this.sortEntries();
        };
        /**
        * Retrieve the equipment available for this group
        */
        MaintenanceController.prototype.loadEquipment = function () {
            var _this = this;
            this.isLoading = true;
            return this.$http.get("/api/Maintenance/Equipment").then(function (response) {
                _this.isLoading = false;
                _this.equipmentOptions = response.data;
                // Deep clone the data so we can modify the data
                _this.equipmentGridOptions.data = JSON.parse(JSON.stringify(_this.equipmentOptions));
                var addNewOption = new Equipment();
                addNewOption.name = "Add New...";
                addNewOption.equipmentId = MaintenanceController.EquipmentId_AddNew;
                _this.equipmentOptions.push(addNewOption);
                _.forEach(_this.equipmentOptions, function (e) {
                    e.typeTags = [{ text: e.type }];
                    e.locationTags = [{ text: e.location }];
                });
                // If this model displayed from the edit project modal
                if (_this.editingProject
                    && _this.editingProject.equipmentId === MaintenanceController.EquipmentId_AddNew
                    && _this.equipmentOptions.length > 0) {
                    _this.editingProject.equipmentId = _.max(_this.equipmentOptions, function (e) { return e.equipmentId; }).equipmentId;
                }
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to retrieve equipment: " + response.data.exceptionMessage);
            });
        };
        /**
        * Occurs when the user clicks the button to delete equipment
        */
        MaintenanceController.prototype.deleteEquipment = function () {
            var _this = this;
            if (!confirm("Are you sure you want to delete this equipment? This action cannot be undone."))
                return;
            this.isLoading = true;
            this.$http.delete("/api/Maintenance/Equipment/" + this.editingEquipment.equipmentId).then(function () {
                _this.isLoading = false;
                _this.editingEquipment = null;
                _this.shouldShowEditEquipmentModal = false;
                _this.loadEquipment()
                    .then(function () { return _this.loadProjects(); })
                    .then(function () { return _this.rebuildMaintenanceEntries(); });
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to delete the equipment: " + response.data.exceptionMessage);
            });
        };
        /**
        * Retrieve the equipment available for this group
        */
        MaintenanceController.prototype.loadVendors = function () {
            var _this = this;
            this.isLoading = true;
            return this.$http.get("/api/PreferredVendors/ListItems").then(function (response) {
                _this.isLoading = false;
                _this.vendorOptions = response.data;
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to retrieve vendors: " + response.data.exceptionMessage);
            });
        };
        /**
        * Occurs when the user selects an equipment from the project modal
        */
        MaintenanceController.prototype.onEquipmentSelectionChange = function () {
            if (this.editingProject.equipmentId === MaintenanceController.EquipmentId_AddNew)
                this.openAddNewEquipment();
        };
        /**
        * Retrieve the maintenance projects from the server
        */
        MaintenanceController.prototype.loadProjects = function () {
            var _this = this;
            this.isLoading = true;
            return this.maintenanceService.loadProjects().then(function (projects) {
                _this.isLoading = false;
                _this.projects = projects;
            }, function (error) {
                _this.isLoading = false;
                alert("Failed to retrieve projects: " + error.exceptionMessage);
            });
        };
        /**
        * Retrieve the maintenance to-do's from the server
        */
        MaintenanceController.prototype.loadMaintenanceTodos = function () {
            var _this = this;
            this.isLoading = true;
            return this.$http.get("/api/Todo/MaintenanceList").then(function (response) {
                _this.isLoading = false;
                _this.maintenanceTodos = response.data;
            });
        };
        /**
         * An event handler invoked when the user selects a project start date
         */
        MaintenanceController.prototype.onProjectStartDateChange = function () {
            if (!this.editingProject.endDate)
                this.editingProject.endDate = this.editingProject.startDate;
        };
        /**
         * Display the modal to create a new project
         */
        MaintenanceController.prototype.openAddNewProject = function () {
            this.editingProject = new MaintenanceProject();
            setTimeout(function () { return $("#project-title-text-box").focus(); }, 100);
        };
        /**
         * Display the modal to add a new piece of equipment
         */
        MaintenanceController.prototype.openAddNewEquipment = function () {
            this.shouldShowEditEquipmentModal = true;
            this.editingEquipment = new Equipment();
            setTimeout(function () { return $("#equipment-name-text-box").focus(); }, 100);
        };
        /**
         * Save a project
         */
        MaintenanceController.prototype.saveProject = function () {
            var _this = this;
            this.isLoading = true;
            var httpFunc;
            if (this.editingProject.maintenanceProjectId)
                httpFunc = this.$http.put;
            else
                httpFunc = this.$http.post;
            httpFunc("/api/Maintenance/Project", this.editingProject).then(function () {
                _this.isLoading = false;
                _this.editingProject = null;
                _this.loadProjects().then(function () { return _this.rebuildMaintenanceEntries(); });
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to save: " + response.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user changes the new entry type
         */
        MaintenanceController.prototype.onEntryTypeChange = function (type) {
            if (type === "todo") {
                this.editingTodo = new Ally.TodoItem();
                this.editingTodo.owningTodoListId = this.maintenanceTodoListId;
                this.selectedAssignee = [];
                if (this.editingProject)
                    this.editingTodo.description = this.editingProject.title;
                this.editingProject = null;
                setTimeout(function () { return $("#edit-todo-name-text-box").focus(); }, 50);
            }
            else {
                this.editingProject = new MaintenanceProject();
                if (this.editingTodo)
                    this.editingProject.title = this.editingTodo.description;
                this.editingTodo = null;
                setTimeout(function () { return $("#project-title-text-box").focus(); }, 50);
            }
        };
        /**
         * Save a todo
         */
        MaintenanceController.prototype.saveTodo = function () {
            var _this = this;
            this.isLoading = true;
            if (this.selectedAssignee && this.selectedAssignee.length > 0)
                this.editingTodo.assignedToUserId = this.selectedAssignee[0].userId;
            var httpFunc;
            if (this.editingTodo.todoItemId)
                httpFunc = this.$http.put;
            else
                httpFunc = this.$http.post;
            httpFunc("/api/Todo/Item", this.editingTodo).then(function () {
                _this.isLoading = false;
                _this.editingTodo = null;
                _this.selectedAssignee = [];
                _this.loadMaintenanceTodos().then(function () { return _this.rebuildMaintenanceEntries(); });
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to save: " + response.data.exceptionMessage);
            });
        };
        /**
         * Save equipment information
         */
        MaintenanceController.prototype.saveEquipment = function () {
            var _this = this;
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
            var httpFunc;
            if (this.editingEquipment.equipmentId)
                httpFunc = this.$http.put;
            else
                httpFunc = this.$http.post;
            httpFunc("/api/Maintenance/Equipment", this.editingEquipment).then(function () {
                _this.isLoading = false;
                _this.shouldShowEditEquipmentModal = false;
                _this.loadEquipment();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to save: " + response.data.exceptionMessage);
            });
        };
        MaintenanceController.prototype.getEquipmentLocationAutocomplete = function (enteredText) {
            if (HtmlUtil.isNullOrWhitespace(enteredText))
                return MaintenanceController.AutocompleteLocationOptions;
            return _.where(MaintenanceController.AutocompleteLocationOptions, function (option) { return option.text.toLowerCase().indexOf(enteredText.toLowerCase()) !== -1; });
        };
        /**
         * Get the auto-complete options based on when the user has already typed
         */
        MaintenanceController.prototype.getEquipmentTypeAutocomplete = function (enteredText) {
            if (this.editingEquipment.typeTags && this.editingEquipment.typeTags.length > 0 && !HtmlUtil.isNullOrWhitespace(this.editingEquipment.typeTags[0].text))
                return [];
            if (HtmlUtil.isNullOrWhitespace(enteredText))
                return MaintenanceController.AutocompleteEquipmentTypeOptions;
            return _.where(MaintenanceController.AutocompleteEquipmentTypeOptions, function (option) { return option.text.toLowerCase().indexOf(enteredText.toLowerCase()) !== -1; });
        };
        /**
         * Open the equipment edit modal for the selected project
         */
        MaintenanceController.prototype.editEquipment = function (equipment) {
            this.shouldShowEditEquipmentModal = true;
            this.editingEquipment = _.clone(equipment);
            setTimeout(function () { return $("#equipment-name-text-box").focus(); }, 100);
        };
        /**
         * Occurs when the user clicks the button to edit a selected entry
         */
        MaintenanceController.prototype.onEditEntry = function (entry) {
            var _this = this;
            if (entry.project)
                this.editProject(entry.project);
            else {
                this.editingTodo = _.clone(entry.todo);
                // Needed for the searchable drop-down
                for (var i = 0; i < this.assigneeOptions.length; ++i)
                    (this.assigneeOptions[i]).isSelectedAssignee = false;
                //_.forEach( this.assigneeOptions, u => ( <any>u ).isSelectedAssignee = false );
                var foundAssignee = _.find(this.assigneeOptions, function (u) { return u.userId === _this.editingTodo.assignedToUserId; });
                if (foundAssignee) {
                    // Set isSelectedAssignee on a cloned object so we don't change the base list
                    foundAssignee.isSelectedAssignee = true;
                    this.selectedAssignee = [foundAssignee];
                }
                else
                    this.selectedAssignee = [];
                setTimeout(function () { return $("#edit-todo-name-text-box").focus(); }, 100);
            }
        };
        /**
         * Occurs when the user clicks the button to edit a selected entry
         */
        MaintenanceController.prototype.onDeleteEntry = function (entry) {
            var _this = this;
            if (!confirm("Are you sure you want to delete this entry? This action cannot be undone."))
                return;
            if (entry.project)
                this.onDeleteProject(entry.project);
            else {
                this.isLoading = true;
                this.$http.delete("/api/Todo/Item/" + entry.todo.todoItemId).then(function () {
                    _this.isLoading = false;
                    _this.loadMaintenanceTodos().then(function () { return _this.rebuildMaintenanceEntries(); });
                }, function (response) {
                    _this.isLoading = false;
                    alert("Failed to delete to-do: " + response.data.exceptionMessage);
                });
            }
        };
        /**
         * Open the project edit modal for the selected project
         */
        MaintenanceController.prototype.editProject = function (project) {
            this.editingProject = _.clone(project);
            setTimeout(function () { return $("#project-title-text-box").focus(); }, 100);
        };
        /**
         * Occurs when the user clicks the button to remove a project
         */
        MaintenanceController.prototype.onDeleteProject = function (project) {
            var _this = this;
            this.isLoading = true;
            this.$http.delete("/api/Maintenance/Project/" + project.maintenanceProjectId).then(function () {
                _this.isLoading = false;
                _this.loadProjects().then(function () { return _this.rebuildMaintenanceEntries(); });
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to delete: " + response.data.exceptionMessage);
            });
        };
        /**
         * Export the maintenance records as a CSV (Ignores to-do items for simplicity's sake)
         */
        MaintenanceController.prototype.exportMaintenanceCsv = function () {
            if (typeof (analytics) !== "undefined")
                analytics.track('exportMaintenanceCsv');
            var csvColumns = [
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
            var projects = _.map(_.filter(this.maintenanceEntries, function (e) { return !!e.project; }), function (e) { return e.project; });
            var csvDataString = Ally.createCsvString(projects, csvColumns);
            Ally.HtmlUtil2.downloadCsv(csvDataString, "Maintenance.csv");
        };
        /**
         * Sort the entries by a certain field
         */
        MaintenanceController.prototype.sortEntries = function () {
            var _this = this;
            var sortEntry = function (e) {
                if (_this.entriesSortField === "status")
                    return e.project ? e.project.status : "ZZZZZ";
                else if (_this.entriesSortField === "startDate")
                    return e.project ? e.project.startDate : new Date(1001, 12, 30);
                else
                    return e.getCreatedDate();
            };
            //console.log( `Sort by ${this.entriesSortField}, dir ${this.entriesSortAscending}` );
            this.maintenanceEntries = _.sortBy(this.maintenanceEntries, sortEntry);
            var shouldReverse = this.entriesSortField === "status" ? this.entriesSortAscending : !this.entriesSortAscending;
            if (shouldReverse)
                this.maintenanceEntries.reverse();
        };
        /**
         * Sort the entries by a certain field
         */
        MaintenanceController.prototype.updateEntriesSort = function (fieldName) {
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
        };
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
        return MaintenanceController;
    }());
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
    var MaintenanceWidgetController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function MaintenanceWidgetController($http, $rootScope, siteInfo) {
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
        MaintenanceWidgetController.prototype.$onInit = function () {
            this.loadProjects();
        };
        /**
        * Retrieve the maintenance projects from the server
        */
        MaintenanceWidgetController.prototype.loadProjects = function () {
            var _this = this;
            this.isLoading = true;
            return this.$http.get("/api/Maintenance/Projects").then(function (response) {
                _this.isLoading = false;
                _this.recentProjects = _.take(response.data, 3);
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to retrieve projects: " + response.data.exceptionMessage);
            });
        };
        MaintenanceWidgetController.$inject = ["$http", "$rootScope", "SiteInfo"];
        return MaintenanceWidgetController;
    }());
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
    var SplitAddress = /** @class */ (function () {
        function SplitAddress() {
        }
        return SplitAddress;
    }());
    Ally.SplitAddress = SplitAddress;
    /**
     * Represents a GPS position, analgolous to TCCommonWeb.GpsPoint
     */
    var GpsPoint = /** @class */ (function () {
        function GpsPoint() {
        }
        return GpsPoint;
    }());
    Ally.GpsPoint = GpsPoint;
    /**
     * Represents a polygon with GPS coordinates for vertices, analgolous to TCCommonWeb.GpsPolygon
     */
    var GpsPolygon = /** @class */ (function () {
        function GpsPolygon() {
        }
        return GpsPolygon;
    }());
    Ally.GpsPolygon = GpsPolygon;
    /**
     * Represents a street address
     */
    var FullAddress = /** @class */ (function () {
        function FullAddress() {
        }
        return FullAddress;
    }());
    Ally.FullAddress = FullAddress;
    /**
     * Provides helper methods for dealing with map information
     */
    var MapUtil = /** @class */ (function () {
        function MapUtil() {
        }
        /**
         * Initialize the Google map on the page
         * @param addressComponents The address data returned from AutoComplete or a geocode
         */
        MapUtil.parseAddressComponents = function (addressComponents) {
            var splitAddress = new SplitAddress();
            var streetNumber = "";
            var streetName = "";
            for (var _i = 0, addressComponents_1 = addressComponents; _i < addressComponents_1.length; _i++) {
                var component = addressComponents_1[_i];
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
        };
        /**
         * Convert Community Ally bounds to Google bounds
         * @param gpsBounds The array of
         */
        MapUtil.gpsBoundsToGooglePoly = function (gpsBounds) {
            var path = _.map(gpsBounds.vertices, function (v) {
                return new google.maps.LatLng(v.lat, v.lon);
            });
            return path;
        };
        ;
        return MapUtil;
    }());
    Ally.MapUtil = MapUtil;
})(Ally || (Ally = {}));

var Ally;
(function (Ally) {
    var PaymentInfo = /** @class */ (function () {
        function PaymentInfo() {
        }
        return PaymentInfo;
    }());
    /**
     * The controller for the widget that lets residents pay their assessments
     */
    var PayPalPaymentFormController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function PayPalPaymentFormController($http, siteInfo, $rootScope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$rootScope = $rootScope;
            this.isLoading = false;
            this.returnUrl = "https://localtest.mycondoally.com/#!/Home";
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        PayPalPaymentFormController.prototype.$onInit = function () {
            var _this = this;
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
            setTimeout(function () {
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
                payment: function (data, actions) {
                    _this.isLoading = true;
                    /*
                     * Set up the payment here
                     */
                    return actions.payment.create({
                        payment: {
                            transactions: [
                                {
                                    amount: { total: _this.paymentInfo.amount.toString(), currency: 'USD' }
                                }
                            ]
                        }
                    });
                },
                onAuthorize: function (data, actions) {
                    /*
                     * Execute the payment here
                     */
                    return actions.payment.execute().then(function (payment) {
                        // The payment is complete!
                        // Tell the server about payment.id with memo
                        var memoInfo = {
                            PayPalCheckoutId: payment.id,
                            Memo: _this.paymentInfo.note
                        };
                        _this.isLoading = true;
                        _this.$http.put("/api/OnlinePayment/SetMemo", memoInfo).then(function (httpResponse) {
                            _this.isLoading = false;
                        }, function (httpResponse) {
                            _this.isLoading = false;
                            alert("Failed to save: " + httpResponse.data.exceptionMessage);
                        });
                        // You can now show a confirmation message to the customer
                    });
                },
                onCancel: function (data, actions) {
                    _this.isLoading = false;
                    /*
                     * Buyer canceled the payment
                     */
                },
                onError: function (err) {
                    _this.isLoading = false;
                    /*
                     * An error occurred during the transaction
                     */
                }
            }, "#paypal-button");
        };
        /**
         * Occurs when the user clicks the helper link to prep an email to inquire the board as to
         * why their records don't line up.
         */
        PayPalPaymentFormController.prototype.onIncorrectPayDetails = function () {
            // Get the friendly looking assessment value (ex: 100, 101, 102.50)
            var amountString = this.assessmentAmount.toString();
            if (Math.round(this.assessmentAmount) != this.assessmentAmount)
                amountString = this.assessmentAmount.toFixed(2);
            // Tell the groupSendEmail component to prep an email for the board
            var prepEventData = amountString;
            if (this.knowsNextPayment && HtmlUtil.isValidString(this.nextPaymentText))
                prepEventData += "|" + this.nextPaymentText;
            this.$rootScope.$broadcast("prepAssessmentEmailToBoard", prepEventData);
        };
        /**
         * Generate the friendly string describing to what the member's next payment applies
         */
        PayPalPaymentFormController.prototype.getNextPaymentText = function (payPeriods, assessmentFrequency) {
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
        };
        /**
         * Occurs when the user selects a payment type radio button
         */
        PayPalPaymentFormController.prototype.onSelectPaymentType = function (paymentType) {
            this.paymentInfo.paymentType = paymentType;
            this.paymentInfo.amount = paymentType == "periodic" ? this.assessmentAmount : 0;
            this.updatePaymentText();
        };
        /**
         * Refresh the note text for the payment field
         */
        PayPalPaymentFormController.prototype.updatePaymentText = function () {
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
        };
        PayPalPaymentFormController.$inject = ["$http", "SiteInfo", "$rootScope"];
        return PayPalPaymentFormController;
    }());
    Ally.PayPalPaymentFormController = PayPalPaymentFormController;
})(Ally || (Ally = {}));
CA.angularApp.component("paypalPaymentForm", {
    templateUrl: "/ngApp/common/paypal-payment-form.html",
    controller: Ally.PayPalPaymentFormController
});

/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../Services/html-util.ts" />
/// <reference path="../Common/map-util.ts" />
/// <reference path="preferred-vendors-ctrl.ts" />
var Ally;
(function (Ally) {
    /**
     * The controller for an individual vendor entry
     */
    var PreferredVendorItemController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function PreferredVendorItemController($http, siteInfo) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.isSiteManager = false;
            this.isInEditMode = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        PreferredVendorItemController.prototype.$onInit = function () {
            var _this = this;
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.isAddForm = this.vendorItem == null;
            if (this.isAddForm) {
                this.isInEditMode = true;
                this.vendorItem = new Ally.PreferredVendor();
                this.editVendorItem = new Ally.PreferredVendor();
                // Wait until the page renders then hook up the autocomplete
                window.setTimeout(function () { return _this.hookupAddressAutocomplete(); }, 500);
            }
        };
        /**
         * Attach the Google Places auto-complete logic to the address text box
         */
        PreferredVendorItemController.prototype.hookupAddressAutocomplete = function () {
            var _this = this;
            // Also mask phone numbers
            if (this.siteInfo.privateSiteInfo.country === "US" || this.siteInfo.privateSiteInfo.country === "CA") {
                var phoneFields = $(".mask-phone");
                phoneFields.mask("(999) 999-9999? x999", { autoclear: false });
            }
            // If we know our group's position, let's tighten the auto-complete suggestion radius
            var autocompleteOptions = undefined;
            if (this.siteInfo.privateSiteInfo.googleGpsPosition) {
                var TwentyFiveMilesInMeters = 40234;
                var circle = new google.maps.Circle({
                    center: this.siteInfo.privateSiteInfo.googleGpsPosition,
                    radius: TwentyFiveMilesInMeters
                });
                autocompleteOptions = {
                    bounds: circle.getBounds()
                };
            }
            var addressInput = document.getElementById("vendor-" + (this.vendorItem.preferredVendorId || "") + "-address-text-box");
            this.addressAutocomplete = new google.maps.places.Autocomplete(addressInput, autocompleteOptions);
            google.maps.event.addListener(this.addressAutocomplete, "place_changed", function () {
                var place = _this.addressAutocomplete.getPlace();
                if (!_this.editVendorItem.fullAddress)
                    _this.editVendorItem.fullAddress = new Ally.FullAddress();
                _this.editVendorItem.fullAddress.oneLiner = place.formatted_address;
            });
        };
        /**
         * Called when the user clicks the button to save the new/edit vendor data
         */
        PreferredVendorItemController.prototype.onSaveVendor = function () {
            var _this = this;
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
            var saveMethod = this.editVendorItem.preferredVendorId == null ? this.$http.post : this.$http.put;
            this.isLoading = true;
            // Process ng-tag-input model into a pipe-separated string for the server
            var servicesProvidedString = "";
            _.each(this.editVendorItem.servicesTagArray, function (tag) {
                servicesProvidedString += "|" + tag.text;
            });
            servicesProvidedString += "|";
            this.editVendorItem.servicesProvided = servicesProvidedString;
            saveMethod("/api/PreferredVendors", this.editVendorItem).then(function () {
                _this.isLoading = false;
                if (_this.isAddForm) {
                    _this.editVendorItem = new Ally.PreferredVendor();
                    if (_this.onAddNewVendor)
                        _this.onAddNewVendor();
                }
                else
                    _this.isInEditMode = false;
                if (_this.onParentDataNeedsRefresh)
                    _this.onParentDataNeedsRefresh();
            }, function (exception) {
                _this.isLoading = false;
                alert("Failed to save the vendor information: " + exception.exceptionMessage);
            });
        };
        PreferredVendorItemController.prototype.onCancelEdit = function () {
            this.isInEditMode = false;
        };
        PreferredVendorItemController.prototype.onEditItem = function () {
            var _this = this;
            // Deep clone the vendor item
            this.editVendorItem = JSON.parse(JSON.stringify(this.vendorItem));
            this.isInEditMode = true;
            window.setTimeout(function () { return _this.hookupAddressAutocomplete(); }, 500);
        };
        PreferredVendorItemController.prototype.deleteItem = function () {
            var _this = this;
            if (!confirm("Are you sure you want to remove this vendor?"))
                return;
            this.isLoading = true;
            this.$http.delete("/api/PreferredVendors/" + this.vendorItem.preferredVendorId).then(function () {
                _this.isLoading = false;
                if (_this.onParentDataNeedsRefresh)
                    _this.onParentDataNeedsRefresh();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to delete the vendor: " + response.data.exceptionMessage);
            });
        };
        PreferredVendorItemController.prototype.getServiceAutocomplete = function (enteredText) {
            return _.where(PreferredVendorItemController.AutocompleteServiceOptions, function (option) { return option.text.toLowerCase().indexOf(enteredText.toLowerCase()) !== -1; });
        };
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
        return PreferredVendorItemController;
    }());
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

/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../Scripts/typings/moment/moment.d.ts" />
/// <reference path="../Services/html-util.ts" />
/// <reference path="../Common/map-util.ts" />
var Ally;
(function (Ally) {
    var PreferredVendor = /** @class */ (function () {
        function PreferredVendor() {
            this.fullAddress = new Ally.FullAddress();
        }
        return PreferredVendor;
    }());
    Ally.PreferredVendor = PreferredVendor;
    /**
     * The controller for the vendors page
     */
    var PreferredVendorsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function PreferredVendorsController($http, siteInfo) {
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
        PreferredVendorsController.prototype.$onInit = function () {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.entriesSortField = window.localStorage[PreferredVendorsController.StorageKey_SortField];
            if (!this.entriesSortField) {
                this.entriesSortField = "name";
                this.entriesSortAscending = false;
            }
            else
                this.entriesSortAscending = window.localStorage[PreferredVendorsController.StorageKey_SortDir] === "true";
            this.retrieveVendors();
        };
        /**
         * Populate the vendors
         */
        PreferredVendorsController.prototype.retrieveVendors = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/PreferredVendors").then(function (response) {
                var vendors = response.data;
                _this.isLoading = false;
                _this.allVendors = vendors;
                _this.filteredVendors = vendors;
                _this.sortEntries();
                // Process the tags into an array for the ng-tag-input control, build the list of
                // all used tags, and convert the add dates to local time
                _this.usedServiceTags = [];
                _.each(_this.allVendors, function (v) {
                    v.servicesTagArray = [];
                    _.each(v.servicesProvidedSplit, function (ss) { return v.servicesTagArray.push({ text: ss }); });
                    _this.usedServiceTags = _this.usedServiceTags.concat(v.servicesProvidedSplit);
                    // Convert the added timestamps to local time
                    v.addedDateUtc = moment.utc(v.addedDateUtc).toDate();
                });
                // Remove any duplicate tags
                _this.usedServiceTags = _.uniq(_this.usedServiceTags);
                _this.usedServiceTags.sort();
            });
        };
        /**
         * Export the vendor list as a CSV
         */
        PreferredVendorsController.prototype.exportVendorCsv = function () {
            if (typeof (analytics) !== "undefined")
                analytics.track('exportResidentCsv');
            var csvColumns = [
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
                    dataMapper: function (value) {
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
        };
        PreferredVendorsController.prototype.onTagFilterToggle = function (tagName) {
            var _this = this;
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
                _.each(this.allVendors, function (v) {
                    if (_.intersection(v.servicesProvidedSplit, _this.filterTags).length > 0)
                        _this.filteredVendors.push(v);
                });
            }
        };
        PreferredVendorsController.prototype.onAddedNewVendor = function () {
            this.retrieveVendors();
        };
        /**
         * Sort the entries by a certain field
         */
        PreferredVendorsController.prototype.sortEntries = function () {
            var _this = this;
            var sortEntry = function (pv) {
                if (_this.entriesSortField === "name")
                    return pv.companyName.trim().toLocaleUpperCase();
                else
                    return pv.addedDateUtc;
            };
            this.filteredVendors = _.sortBy(this.filteredVendors, sortEntry);
            if (this.entriesSortAscending)
                this.filteredVendors.reverse();
        };
        /**
         * Sort the entries by a certain field
         */
        PreferredVendorsController.prototype.updateEntriesSort = function (fieldName) {
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
        };
        PreferredVendorsController.$inject = ["$http", "SiteInfo"];
        PreferredVendorsController.StorageKey_SortField = "vendors_entriesSortField";
        PreferredVendorsController.StorageKey_SortDir = "vendors_entriesSortAscending";
        return PreferredVendorsController;
    }());
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
    var StreetAddressFormController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function StreetAddressFormController($http, siteInfo) {
            this.$http = $http;
            this.siteInfo = siteInfo;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        StreetAddressFormController.prototype.$onInit = function () {
            // Normalize the values that could come from the binding
            this.shouldHideName = !this.shouldHideName ? false : true;
        };
        /**
         * Occurs when one of the input fields is changed
         */
        StreetAddressFormController.prototype.onComponentChange = function () {
            if (this.onChange)
                this.onChange();
        };
        StreetAddressFormController.$inject = ["$http", "SiteInfo"];
        return StreetAddressFormController;
    }());
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

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../Services/html-util.ts" />
var Ally;
(function (Ally) {
    /**
     * The controller for the HOA info wrapper page
     */
    var HoaInfoController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function HoaInfoController($http, siteInfo, $cacheFactory) {
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
        HoaInfoController.prototype.$onInit = function () {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.hideDocuments = this.siteInfo.userInfo.isRenter && !this.siteInfo.privateSiteInfo.rentersCanViewDocs;
            if (this.hideDocuments)
                this.selectedView = "info";
            else
                this.selectedView = "docs";
        };
        HoaInfoController.$inject = ["$http", "SiteInfo", "$cacheFactory"];
        return HoaInfoController;
    }());
    Ally.HoaInfoController = HoaInfoController;
})(Ally || (Ally = {}));
CA.angularApp.component("hoaInfo", {
    templateUrl: "/ngApp/hoa/member/HoaInfo.html",
    controller: Ally.HoaInfoController
});

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../Services/html-util.ts" />
var Ally;
(function (Ally) {
    /**
     * The controller for the HOA Ally home page
     */
    var HoaHomeController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function HoaHomeController($http, siteInfo, $cacheFactory) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$cacheFactory = $cacheFactory;
            this.isSiteManager = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        HoaHomeController.prototype.$onInit = function () {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
        };
        HoaHomeController.$inject = ["$http", "SiteInfo", "$cacheFactory"];
        return HoaHomeController;
    }());
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
    var HomeGroupHomeController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function HomeGroupHomeController($http, $rootScope, siteInfo, $timeout, appCacheService) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.appCacheService = appCacheService;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        HomeGroupHomeController.prototype.$onInit = function () {
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
        };
        // Refresh the not text for the payment field
        HomeGroupHomeController.prototype.updatePaymentText = function () {
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
        };
        HomeGroupHomeController.prototype.onSelectPaymentType = function (paymentType) {
            this.paymentInfo.paymentType = paymentType;
            this.paymentInfo.amount = paymentType === "periodic" ? this.siteInfo.userInfo.assessmentAmount : 0;
            this.updatePaymentText();
        };
        HomeGroupHomeController.prototype.getNextPaymentText = function (payPeriods, assessmentFrequency) {
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
        };
        HomeGroupHomeController.prototype.hideFirstVisit = function () {
            this.$rootScope.hasClosedFirstVisitModal = true;
            this.showFirstVisitModal = false;
        };
        HomeGroupHomeController.prototype.onIncorrectPayDetails = function () {
            // Create a message to the board
            this.messageObject.recipientType = "board";
            if (this.knowsNextPayment)
                this.messageObject.message = "Hello Board Members,\n\nOur association's home page says my next payment of $" + this.siteInfo.userInfo.assessmentAmount + " will cover " + this.nextPaymentText + ", but I believe that is incorrect. My records indicate my next payment of $" + this.siteInfo.userInfo.assessmentAmount + " should pay for [INSERT PROPER DATE HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            else
                this.messageObject.message = "Hello Board Members,\n\nOur association's home page says my assessment payment is $" + this.siteInfo.userInfo.assessmentAmount + ", but I believe that is incorrect. My records indicate my assessment payments should be $[INSERT PROPER AMOUNT HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            document.getElementById("send-email-panel").scrollIntoView();
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Populate the page from the server
        ///////////////////////////////////////////////////////////////////////////////////////////////
        HomeGroupHomeController.prototype.refreshData = function () {
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
        };
        HomeGroupHomeController.$inject = ["$http", "$rootScope", "SiteInfo", "$timeout", "appCacheService"];
        return HomeGroupHomeController;
    }());
    Ally.HomeGroupHomeController = HomeGroupHomeController;
})(Ally || (Ally = {}));
CA.angularApp.component("homeGroupHome", {
    templateUrl: "/ngApp/home/home-group-home.html",
    controller: Ally.HomeGroupHomeController
});

var Ally;
(function (Ally) {
    var HomeValueResponse = /** @class */ (function () {
        function HomeValueResponse() {
        }
        return HomeValueResponse;
    }());
    /**
     * The controller for the widget that lets members send emails to the group
     */
    var HomeValueWidgetController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function HomeValueWidgetController($http, $rootScope, siteInfo) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.shouldShowWidget = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        HomeValueWidgetController.prototype.$onInit = function () {
            this.retrieveInfo();
        };
        /**
         * Retrieve the home value information from the server
         */
        HomeValueWidgetController.prototype.retrieveInfo = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/HomeValue/ZillowInfo").then(function (response) {
                _this.isLoading = false;
                _this.shouldShowWidget = !!response.data && !!response.data.chartImageUri;
                if (_this.shouldShowWidget)
                    _this.valueInfo = response.data;
            }, function (response) {
                _this.isLoading = false;
                _this.shouldShowWidget = false;
            });
        };
        HomeValueWidgetController.$inject = ["$http", "$rootScope", "SiteInfo"];
        return HomeValueWidgetController;
    }());
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
    var HomeUsersController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function HomeUsersController($http, $rootScope, siteInfo) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.isAdmin = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        HomeUsersController.prototype.$onInit = function () {
            // Placeholder
        };
        HomeUsersController.$inject = ["$http", "$rootScope", "SiteInfo"];
        return HomeUsersController;
    }());
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
    var SignerUpInfo = /** @class */ (function () {
        function SignerUpInfo() {
        }
        return SignerUpInfo;
    }());
    var HomeInfo = /** @class */ (function () {
        function HomeInfo() {
        }
        return HomeInfo;
    }());
    Ally.HomeInfo = HomeInfo;
    var SignUpInfo = /** @class */ (function () {
        function SignUpInfo() {
            this.signerUpInfo = new SignerUpInfo();
            this.streetAddress = "";
            this.homeInfo = new HomeInfo();
        }
        return SignUpInfo;
    }());
    var LotSizeType_Acres = "Acres";
    var LotSizeType_SquareFeet = "SquareFeet";
    var SquareFeetPerAcre = 43560;
    /**
     * The controller for the Home Ally sign-up page
     */
    var HomeSignUpController = /** @class */ (function () {
        /**
         * The constructor for the class
         * @param $http The HTTP service object
         * @param $scope The Angular scope object
         */
        function HomeSignUpController($http, $scope, WizardHandler) {
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
        HomeSignUpController.prototype.$onInit = function () {
            var _this = this;
            // Listen for step changes
            this.$scope.$on('wizard:stepChanged', function (event, args) {
                // If we're now on the second step
                if (args.index === 1)
                    _this.retrieveHomeInfoForAddress();
            });
            // The controller is ready, but let's wait a bit for the page to be ready
            var innerThis = this;
            setTimeout(function () { _this.initMap(); }, 300);
        };
        /**
         * Retrieve information about the address provided from Zillow
         */
        HomeSignUpController.prototype.retrieveHomeInfoForAddress = function () {
            var _this = this;
            if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.streetAddress) || this.hasAlreadyCheckedForHomeInfo)
                return;
            this.hasAlreadyCheckedForHomeInfo = true;
            var getUri = "/api/HomeSignUp/HomeInfo?streetAddress=" + encodeURIComponent(this.signUpInfo.streetAddress);
            this.$http.get(getUri, { cache: true }).then(function (response) {
                if (!response.data)
                    return;
                _this.signUpInfo.homeInfo = response.data;
                _this.didLoadHomeInfo = true;
                _this.processLotSizeHint(_this.signUpInfo.homeInfo.lotSquareFeet);
            });
        };
        /**
         * Convert a lot size hint from Zillow into a UI friendly value
         * @param lotSquareFeet
         */
        HomeSignUpController.prototype.processLotSizeHint = function (lotSquareFeet) {
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
        };
        /**
         * Initialize the Google map on the page
         */
        HomeSignUpController.prototype.initMap = function () {
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
        };
        /**
         * Occurs when the user hits enter in the address box
         */
        HomeSignUpController.prototype.goNextStep = function () {
            this.WizardHandler.wizard().next();
        };
        /**
         * Called when the user completes the wizard
         */
        HomeSignUpController.prototype.onFinishedWizard = function () {
            //if( this.lotSizeUnit === LotSizeType_Acres )
            //    this.signUpInfo.homeInfo.lotSquareFeet = this.lotSquareUnits * SquareFeetPerAcre;
            //else
            //    this.signUpInfo.homeInfo.lotSquareFeet = this.lotSquareUnits;
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/HomeSignUp", this.signUpInfo).then(function (httpResponse) {
                innerThis.isLoading = false;
                var signUpResult = httpResponse.data;
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
        };
        /**
         * Called when the user types in a new street address
         */
        HomeSignUpController.prototype.onHomeAddressChanged = function () {
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
        };
        /**
         * Center the map on a position
         * @param geometry The geometry on which to center
         */
        HomeSignUpController.prototype.centerMap = function (geometry) {
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
        };
        /**
         * Retrieve the home information from the server
         */
        HomeSignUpController.prototype.prepopulateHomeInfo = function () {
            if (!this.selectedSplitAddress)
                return;
            this.isLoadingHomeInfo = true;
            var getUri = "/api/PropertyResearch/HomeInfo?street=" + encodeURIComponent(this.selectedSplitAddress.street) + "&city=" + encodeURIComponent(this.selectedSplitAddress.city) + "&state=" + this.selectedSplitAddress.state + "&zip=" + this.selectedSplitAddress.zip;
            var innerThis = this;
            this.$http.get(getUri).then(function (httpResponse) {
                innerThis.isLoadingHomeInfo = false;
                var homeInfo = httpResponse.data;
                if (homeInfo) {
                    innerThis.didLoadHomeInfo = true;
                    innerThis.signUpInfo.homeInfo = homeInfo;
                    innerThis.processLotSizeHint(homeInfo.lotSquareFeet);
                }
            }, function () {
                innerThis.isLoadingHomeInfo = false;
            });
        };
        HomeSignUpController.$inject = ["$http", "$scope", "WizardHandler"];
        return HomeSignUpController;
    }());
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
    var PtaGroupHomeController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function PtaGroupHomeController($http, $rootScope, siteInfo, $timeout, appCacheService) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.appCacheService = appCacheService;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        PtaGroupHomeController.prototype.$onInit = function () {
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
        };
        // Refresh the not text for the payment field
        PtaGroupHomeController.prototype.updatePaymentText = function () {
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
        };
        PtaGroupHomeController.prototype.onSelectPaymentType = function (paymentType) {
            this.paymentInfo.paymentType = paymentType;
            this.paymentInfo.amount = paymentType === "periodic" ? this.siteInfo.userInfo.assessmentAmount : 0;
            this.updatePaymentText();
        };
        PtaGroupHomeController.prototype.getNextPaymentText = function (payPeriods, assessmentFrequency) {
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
        };
        PtaGroupHomeController.prototype.hideFirstVisit = function () {
            this.$rootScope.hasClosedFirstVisitModal = true;
            this.showFirstVisitModal = false;
        };
        PtaGroupHomeController.prototype.onIncorrectPayDetails = function () {
            // Create a message to the board
            this.messageObject.recipientType = "board";
            if (this.knowsNextPayment)
                this.messageObject.message = "Hello Boardmembers,\n\nOur association's home page says my next payment of $" + this.siteInfo.userInfo.assessmentAmount + " will cover " + this.nextPaymentText + ", but I believe that is incorrect. My records indicate my next payment of $" + this.siteInfo.userInfo.assessmentAmount + " should pay for [INSERT PROPER DATE HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            else
                this.messageObject.message = "Hello Boardmembers,\n\nOur association's home page says my assessment payment is $" + this.siteInfo.userInfo.assessmentAmount + ", but I believe that is incorrect. My records indicate my assessment payments should be $[INSERT PROPER AMOUNT HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            document.getElementById("send-email-panel").scrollIntoView();
        };
        PtaGroupHomeController.$inject = ["$http", "$rootScope", "SiteInfo", "$timeout", "appCacheService"];
        return PtaGroupHomeController;
    }());
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

var AppCacheService = /** @class */ (function () {
    function AppCacheService() {
    }
    AppCacheService.prototype.set = function (key, value) { window.sessionStorage[AppCacheService.KeyPrefix + key] = value; };
    AppCacheService.prototype.get = function (key) { return window.sessionStorage[AppCacheService.KeyPrefix + key]; };
    AppCacheService.prototype.clear = function (key) {
        window.sessionStorage[AppCacheService.KeyPrefix + key] = void 0;
        delete window.sessionStorage[AppCacheService.KeyPrefix + key];
    };
    AppCacheService.prototype.getAndClear = function (key) {
        var result;
        result = this.get(key);
        this.clear(key);
        return result;
    };
    // The key for when the user gets redirect for a 401, but is logged in
    AppCacheService.Key_WasLoggedIn403 = "wasLoggedIn403";
    // Used to display a friendly message when a user is brought to the login page before redirection
    AppCacheService.Key_WasLoggedIn401 = "wasLoggedIn401";
    AppCacheService.Key_AfterLoginRedirect = "afterLoginRedirect";
    AppCacheService.KeyPrefix = "AppCacheService_";
    return AppCacheService;
}());
angular.module("CondoAlly").service("appCacheService", [AppCacheService]);

var Ally;
(function (Ally) {
    /**
     * Represents a column in a CSV spreadsheet
     */
    var CsvColumnDescriptor = /** @class */ (function () {
        function CsvColumnDescriptor() {
        }
        return CsvColumnDescriptor;
    }());
    Ally.CsvColumnDescriptor = CsvColumnDescriptor;
    function ValueToCsvValue(valueObj) {
        if (!valueObj)
            return "";
        var value = valueObj.toString();
        if (HtmlUtil.isNullOrWhitespace(value))
            return "";
        var needsEscaping = value.indexOf('"') !== -1
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
    function createCsvString(itemArray, descriptorArray, includeHeader) {
        if (includeHeader === void 0) { includeHeader = true; }
        var csvText = "";
        // Write the header
        if (includeHeader) {
            for (var i = 0; i < descriptorArray.length; ++i) {
                if (i > 0)
                    csvText += ",";
                csvText += ValueToCsvValue(descriptorArray[i].headerText);
            }
            csvText += "\n";
        }
        // Write the rows
        for (var rowIndex = 0; rowIndex < itemArray.length; ++rowIndex) {
            var curRow = itemArray[rowIndex];
            for (var columnIndex = 0; columnIndex < descriptorArray.length; ++columnIndex) {
                if (columnIndex > 0)
                    csvText += ",";
                var curColumn = descriptorArray[columnIndex];
                var columnValue = curRow[curColumn.fieldName];
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

var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Ally;
(function (Ally) {
    /**
     * Represents a group email address to which emails sent get forwarded to the whole group
     */
    var GroupEmailInfo = /** @class */ (function () {
        function GroupEmailInfo() {
        }
        return GroupEmailInfo;
    }());
    Ally.GroupEmailInfo = GroupEmailInfo;
    var GroupEmailGroups = /** @class */ (function () {
        function GroupEmailGroups() {
        }
        return GroupEmailGroups;
    }());
    Ally.GroupEmailGroups = GroupEmailGroups;
    var CustomEmailGroup = /** @class */ (function () {
        function CustomEmailGroup() {
        }
        return CustomEmailGroup;
    }());
    Ally.CustomEmailGroup = CustomEmailGroup;
    var CustomEmailGroupMember = /** @class */ (function () {
        function CustomEmailGroupMember() {
        }
        return CustomEmailGroupMember;
    }());
    Ally.CustomEmailGroupMember = CustomEmailGroupMember;
    var HomeEntry = /** @class */ (function () {
        function HomeEntry() {
        }
        return HomeEntry;
    }());
    /**
     * Represents a member of a CHTN group
     */
    var FellowChtnResident = /** @class */ (function (_super) {
        __extends(FellowChtnResident, _super);
        function FellowChtnResident() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return FellowChtnResident;
    }(Ally.SimpleUserEntry));
    Ally.FellowChtnResident = FellowChtnResident;
    var CommitteeListingInfo = /** @class */ (function () {
        function CommitteeListingInfo() {
        }
        return CommitteeListingInfo;
    }());
    Ally.CommitteeListingInfo = CommitteeListingInfo;
    var UnitListing = /** @class */ (function () {
        function UnitListing() {
        }
        return UnitListing;
    }());
    Ally.UnitListing = UnitListing;
    var FellowResidents = /** @class */ (function () {
        function FellowResidents() {
        }
        return FellowResidents;
    }());
    Ally.FellowResidents = FellowResidents;
    /**
     * Provides methods to accessing group member and home information
     */
    var FellowResidentsService = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function FellowResidentsService($http, $q, $cacheFactory) {
            this.$http = $http;
            this.$q = $q;
            this.$cacheFactory = $cacheFactory;
            this.httpCache = $cacheFactory("FellowResidentsService");
        }
        /**
         * Get the residents for the current group
         */
        FellowResidentsService.prototype.getResidents = function () {
            var _this = this;
            return this.$http.get("/api/BuildingResidents", { cache: this.httpCache }).then(function (httpResponse) {
                return httpResponse.data.residents;
            }, function (httpResponse) {
                return _this.$q.reject(httpResponse);
            });
        };
        /**
         * Get the members for a committee
         */
        FellowResidentsService.prototype.getCommitteeMembers = function (committeeId) {
            return this.$http.get("/api/Committee/" + committeeId + "/Members").then(function (httpResponse) {
                return httpResponse.data;
            }, function (httpResponse) {
                return this.$q.reject(httpResponse);
            });
        };
        /**
         * Determine if the logged-in user is a committee member
         */
        FellowResidentsService.prototype.isCommitteeMember = function (committeeId) {
            var _this = this;
            return this.$http.get("/api/Committee/" + committeeId + "/IsMember", { cache: this.httpCache }).then(function (httpResponse) {
                return httpResponse.data;
            }, function (httpResponse) {
                return _this.$q.reject(httpResponse);
            });
        };
        /**
         * Get the residents for an association, broken down by unit for easy display
         */
        FellowResidentsService.prototype.getByUnits = function () {
            var _this = this;
            return this.$http.get("/api/BuildingResidents", { cache: this.httpCache }).then(function (httpResponse) {
                return httpResponse.data.byUnit;
            }, function (httpResponse) {
                return _this.$q.reject(httpResponse);
            });
        };
        /**
         * Get a list of residents and homes
         */
        FellowResidentsService.prototype.getByUnitsAndResidents = function () {
            var _this = this;
            return this.$http.get("/api/BuildingResidents", { cache: this.httpCache }).then(function (httpResponse) {
                return httpResponse.data;
            }, function (httpResponse) {
                return _this.$q.reject(httpResponse);
            });
        };
        /**
         * Get the object describing the available group email addresses
         */
        FellowResidentsService.prototype.getGroupEmailObject = function () {
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
        };
        /**
         * Get the object describing the available group email addresses
         */
        FellowResidentsService.prototype.getAllGroupEmails = function () {
            var _this = this;
            return this.$http.get("/api/BuildingResidents/AllEmailGroups", { cache: this.httpCache }).then(function (httpResponse) {
                return httpResponse.data;
            }, function (httpResponse) {
                return _this.$q.reject(httpResponse);
            });
            //var innerThis = this;
            //return this.getByUnitsAndResidents().then( function( unitsAndResidents )
            //{
            //    var unitList = unitsAndResidents.byUnit;
            //    var allResidents = unitsAndResidents.residents;
            //    return innerThis.setupGroupEmailObject( allResidents, unitList, null );
            //} );
        };
        /**
         * Populate the lists of group emails
         */
        FellowResidentsService.prototype._setupGroupEmailObject = function (allResidents, unitList) {
            var emailLists = {};
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
            for (var i = 0; i < allResidents.length; ++i) {
                var r = allResidents[i];
                var displayName = r.fullName + (r.hasEmail ? "" : "*");
                emailLists.everyone.push(displayName);
                if (r.boardPosition !== FellowResidentsService.BoardPos_None && r.boardPosition !== FellowResidentsService.BoardPos_PropertyManager)
                    emailLists.board.push(displayName);
                if (r.boardPosition === FellowResidentsService.BoardPos_PropertyManager)
                    emailLists.propertyManagers.push(displayName);
                if (r.includeInDiscussionEmail)
                    emailLists.discussion.push(displayName);
                var isOwner = false;
                var isRenter = false;
                var unitIsRented = false;
                var _loop_1 = function (unitIndex) {
                    var simpleHome = r.homes[unitIndex];
                    if (!simpleHome.isRenter) {
                        isOwner = true;
                        var unit = _.find(unitList, function (u) { return u.unitId === simpleHome.unitId; });
                        unitIsRented = unit.renters.length > 0;
                    }
                    if (simpleHome.isRenter)
                        isRenter = true;
                };
                for (var unitIndex = 0; unitIndex < r.homes.length; ++unitIndex) {
                    _loop_1(unitIndex);
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
        };
        /**
         * Send an email message to another user
         */
        FellowResidentsService.prototype.sendMessage = function (recipientUserId, messageBody, messageSubject, shouldSendAsBoard) {
            var postData = {
                recipientUserId: recipientUserId,
                messageBody: messageBody,
                messageSubject: messageSubject,
                shouldSendAsBoard: shouldSendAsBoard
            };
            return this.$http.post("/api/BuildingResidents/SendMessage", postData);
        };
        /**
         * Clear cached values, such as when the user changes values in Manage -> Residents
         */
        FellowResidentsService.prototype.clearResidentCache = function () {
            this.httpCache.removeAll();
        };
        /**
         * Test if a board position is one of the officer positions
         */
        FellowResidentsService.isOfficerBoardPosition = function (boardPosition) {
            var OfficerPositions = [
                1,
                2,
                4,
                16,
                64,
            ];
            return OfficerPositions.indexOf(boardPosition) !== -1;
        };
        /**
         * Test if a board position is any except the property manager
         */
        FellowResidentsService.isNonPropMgrBoardPosition = function (boardPosition) {
            if (boardPosition < 1 // Handle invalid values
                || boardPosition === FellowResidentsService.BoardPos_None
                || boardPosition === FellowResidentsService.BoardPos_PropertyManager)
                return false;
            return true;
        };
        FellowResidentsService.pollReponsesToChart = function (poll, siteInfo) {
            var talliedVotes = [];
            var logVote = function (answerId) {
                var count = talliedVotes.find(function (tv) { return tv.answerId === answerId; });
                if (!count) {
                    count = new PollAnswerCount(answerId);
                    talliedVotes.push(count);
                }
                ++count.numVotes;
            };
            var logVotes = function (answerIds) { return answerIds.forEach(function (aid) { return logVote(aid); }); };
            poll.responses.forEach(function (r) { return logVotes(r.answerIds); });
            var results = {
                chartData: [],
                chartLabels: []
            };
            var _loop_2 = function (curTalliedVote) {
                var pollAnswer = _.find(poll.answers, function (a) { return a.pollAnswerId === curTalliedVote.answerId; });
                if (pollAnswer) {
                    results.chartLabels.push(pollAnswer.answerText);
                    results.chartData.push(curTalliedVote.numVotes);
                }
                else
                    console.log("Unknown answer ID found: " + curTalliedVote.answerId);
            };
            // Go through each answer and store the name and count for that answer
            for (var _i = 0, talliedVotes_1 = talliedVotes; _i < talliedVotes_1.length; _i++) {
                var curTalliedVote = talliedVotes_1[_i];
                _loop_2(curTalliedVote);
            }
            if (poll.responses && poll.responses.length < siteInfo.privateSiteInfo.numUnits) {
                results.chartLabels.push("No Response");
                var isMemberBasedGroup = AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club" || AppConfig.appShortName === "pta";
                if (isMemberBasedGroup)
                    results.chartData.push(siteInfo.privateSiteInfo.numMembers - poll.responses.length);
                else
                    results.chartData.push(siteInfo.privateSiteInfo.numUnits - poll.responses.length);
            }
            return results;
        };
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
        return FellowResidentsService;
    }());
    Ally.FellowResidentsService = FellowResidentsService;
    var PollAnswerCount = /** @class */ (function () {
        function PollAnswerCount(answerId) {
            this.numVotes = 0;
            this.answerId = answerId;
        }
        return PollAnswerCount;
    }());
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
    var ReplyComment = /** @class */ (function () {
        function ReplyComment() {
        }
        return ReplyComment;
    }());
    var CommentsState = /** @class */ (function () {
        function CommentsState() {
        }
        return CommentsState;
    }());
    /**
     * The controller for the committee home page
     */
    var GroupCommentThreadViewController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function GroupCommentThreadViewController($http, $rootScope, siteInfo) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.shouldShowAdminControls = false;
            this.digestFrequency = null;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        GroupCommentThreadViewController.prototype.$onInit = function () {
            this.defaultDigestFrequency = this.siteInfo.userInfo.defaultDigestFrequency;
            this.shouldShowAdminControls = this.siteInfo.userInfo.isSiteManager;
            this.threadUrl = this.siteInfo.publicSiteInfo.baseUrl + "/#!/Home/DiscussionThread/" + this.thread.commentThreadId;
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            this.retrieveComments();
        };
        /**
         * Handle the key down message on the message text area
         */
        GroupCommentThreadViewController.prototype.onTextAreaKeyDown = function (e, messageType) {
            var keyCode = (e.keyCode ? e.keyCode : e.which);
            var KeyCode_Enter = 13;
            if (e.keyCode == KeyCode_Enter) {
                e.preventDefault();
                if (messageType === "new")
                    this.submitNewComment();
                else if (messageType === "edit")
                    this.submitCommentEdit();
                else if (messageType === "reply")
                    this.submitReplyComment();
            }
        };
        /**
         * Occurs when the user elects to set the thread digest frequency
         */
        GroupCommentThreadViewController.prototype.onChangeDigestFrequency = function () {
            var _this = this;
            this.isLoading = true;
            var putUri = "/api/CommentThread/" + this.thread.commentThreadId + "/DigestFrequency/" + this.commentsState.digestFrequency;
            this.$http.put(putUri, null).then(function () {
                _this.isLoading = false;
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to change: " + response.data.exceptionMessage);
            });
        };
        /**
         * Retrieve the comments from the server
         */
        GroupCommentThreadViewController.prototype.retrieveComments = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/CommentThread/" + this.thread.commentThreadId + "/Comments").then(function (response) {
                _this.isLoading = false;
                _this.commentsState = response.data;
                var processComments = function (c) {
                    c.isMyComment = c.authorUserId === _this.$rootScope.userInfo.userId;
                    if (c.replies)
                        _.each(c.replies, processComments);
                };
                _.forEach(_this.commentsState.comments, processComments);
                _this.commentsState.comments = _.sortBy(_this.commentsState.comments, function (ct) { return ct.postDateUtc; }).reverse();
            }, function (response) {
                _this.isLoading = false;
            });
        };
        /**
         * Occurs when the user clicks the button to reply to a comment
         */
        GroupCommentThreadViewController.prototype.startReplyToComment = function (comment) {
            this.replyToCommentId = comment.commentId;
            this.replyCommentText = "";
            setTimeout(function () { return $(".reply-to-textarea").focus(); }, 150);
        };
        /**
         * Edit an existing comment
         * @param comment
         */
        GroupCommentThreadViewController.prototype.startEditComment = function (comment) {
            this.editCommentId = comment.commentId;
            this.editCommentText = comment.commentText;
        };
        ;
        /**
         * Delete a comment
         */
        GroupCommentThreadViewController.prototype.deleteComment = function (comment) {
            var _this = this;
            var deleteMessage = "Are you sure you want to delete this comment?";
            if (this.commentsState.comments.length === 1)
                deleteMessage = "Since there is only one comment, if you delete this comment you'll delete the thread. Are you sure you want to delete this comment?";
            if (!confirm(deleteMessage))
                return;
            this.isLoading = true;
            this.$http.delete("/api/CommentThread/" + this.thread.commentThreadId + "/" + comment.commentId).then(function () {
                _this.isLoading = false;
                if (_this.commentsState.comments.length === 1) {
                    // Tell the parent thread list to refresh
                    _this.$rootScope.$broadcast("refreshCommentThreadList");
                    _this.closeModal(false);
                }
                else
                    _this.retrieveComments();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to post comment: " + response.data.exceptionMessage);
            });
        };
        /**
         * Archive this thread
         */
        GroupCommentThreadViewController.prototype.archiveThread = function (shouldArchive) {
            var _this = this;
            if (shouldArchive === void 0) { shouldArchive = true; }
            this.isLoading = true;
            var putUri = "/api/CommentThread/Archive/" + this.thread.commentThreadId;
            if (!shouldArchive)
                putUri = "/api/CommentThread/Unarchive/" + this.thread.commentThreadId;
            this.$http.put(putUri, null).then(function () {
                _this.isLoading = false;
                // Tell the parent thread list to refresh
                _this.$rootScope.$broadcast("refreshCommentThreadList");
                _this.closeModal(false);
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to archive: " + response.data.exceptionMessage);
            });
        };
        /**
         * Modify an existing comment
         */
        GroupCommentThreadViewController.prototype.submitCommentEdit = function () {
            var _this = this;
            var editInfo = {
                commentId: this.editCommentId,
                newCommentText: this.editCommentText
            };
            this.isLoading = true;
            this.$http.put("/api/CommentThread/" + this.thread.commentThreadId + "/EditComment", editInfo).then(function () {
                _this.isLoading = false;
                _this.editCommentId = -1;
                _this.editCommentText = "";
                _this.retrieveComments();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to edit comment: " + response.data.exceptionMessage);
            });
        };
        /**
         * Add a comment in reply to another
         */
        GroupCommentThreadViewController.prototype.submitReplyComment = function () {
            var _this = this;
            var newComment = {
                replyToCommentId: this.replyToCommentId,
                commentText: this.replyCommentText
            };
            this.isLoading = true;
            this.$http.put("/api/CommentThread/" + this.thread.commentThreadId + "/AddComment", newComment).then(function (response) {
                _this.isLoading = false;
                _this.replyToCommentId = -1;
                _this.replyCommentText = "";
                _this.retrieveComments();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to add comment: " + response.data.exceptionMessage);
            });
        };
        /**
         * Add a new comment to this thread
         */
        GroupCommentThreadViewController.prototype.submitNewComment = function () {
            var _this = this;
            var newComment = {
                commentText: this.newCommentText
            };
            this.isLoading = true;
            this.$http.put("/api/CommentThread/" + this.thread.commentThreadId + "/AddComment", newComment).then(function (response) {
                _this.isLoading = false;
                _this.newCommentText = "";
                _this.retrieveComments();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to add comment: " + response.data.exceptionMessage);
            });
        };
        GroupCommentThreadViewController.prototype.closeModal = function (isFromOverlayClick) {
            if (this.onClosed)
                this.onClosed();
        };
        GroupCommentThreadViewController.prototype.copyThreadLink = function ($event) {
            $event.stopPropagation();
            $event.preventDefault();
            if (Ally.HtmlUtil2.copyTextToClipboard(this.threadUrl))
                Ally.HtmlUtil2.showTooltip($event.target, "Copied!");
            else
                Ally.HtmlUtil2.showTooltip($event.target, "Auto-copy failed, right-click and copy link address");
            return false;
        };
        GroupCommentThreadViewController.$inject = ["$http", "$rootScope", "SiteInfo"];
        return GroupCommentThreadViewController;
    }());
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
    var CommentThread = /** @class */ (function () {
        function CommentThread() {
        }
        return CommentThread;
    }());
    Ally.CommentThread = CommentThread;
    /**
     * The controller for the discussion threads directive
     */
    var GroupCommentThreadsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function GroupCommentThreadsController($http, $rootScope, siteInfo, $scope, fellowResidents, $timeout) {
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
        GroupCommentThreadsController.prototype.$onInit = function () {
            var _this = this;
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            this.canCreateThreads = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager;
            if (!this.canCreateThreads) {
                if (this.committeeId) {
                    // Make sure committee members can manage their data
                    this.fellowResidents.isCommitteeMember(this.committeeId).then(function (isCommitteeMember) { return _this.canCreateThreads = isCommitteeMember; });
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
            this.$scope.$on("refreshCommentThreadList", function (event, data) { return _this.refreshCommentThreads(false); });
            this.refreshCommentThreads(false);
        };
        GroupCommentThreadsController.prototype.setDisplayCreateModal = function (shouldShow) {
            this.showCreateNewModal = shouldShow;
            this.newThreadTitle = "";
            this.newThreadBody = "";
            this.newThreadIsBoardOnly = false;
            this.newThreadIsReadOnly = false;
            this.shouldSendNoticeForNewThread = true;
            this.newThreadErrorMessage = "";
            // If we're displaying the modal, focus on the title text box
            if (shouldShow)
                setTimeout(function () { return $("#new-thread-title-text-box").focus(); }, 100);
        };
        GroupCommentThreadsController.prototype.displayDiscussModal = function (thread) {
            this.viewingThread = thread;
        };
        GroupCommentThreadsController.prototype.hideDiscussModal = function () {
            this.viewingThread = null;
        };
        /**
         * Occurs when the user clicks the pin to toggle a thread's pinned status
         * @param thread
         */
        GroupCommentThreadsController.prototype.onClickPin = function (thread) {
            var _this = this;
            this.isLoading = true;
            this.$http.put("/api/CommentThread/TogglePinned/" + thread.commentThreadId, null).then(function (response) {
                _this.isLoading = false;
                _this.refreshCommentThreads();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to toggle: " + response.data.exceptionMessage);
            });
        };
        GroupCommentThreadsController.prototype.createNewThread = function () {
            var _this = this;
            this.isLoading = true;
            this.newThreadErrorMessage = null;
            var createInfo = {
                title: this.newThreadTitle,
                body: this.newThreadBody,
                isBoardOnly: this.newThreadIsBoardOnly,
                isReadOnly: this.newThreadIsReadOnly,
                shouldSendNotice: this.shouldSendNoticeForNewThread,
                committeeId: this.committeeId
            };
            this.$http.post("/api/CommentThread", createInfo).then(function (response) {
                _this.isLoading = false;
                _this.showCreateNewModal = false;
                _this.refreshCommentThreads(false);
            }, function (response) {
                _this.isLoading = false;
                _this.newThreadErrorMessage = response.data.exceptionMessage;
            });
        };
        /**
         * Retrieve the comments from the server for the current thread
         */
        GroupCommentThreadsController.prototype.refreshCommentThreads = function (retrieveArchived) {
            var _this = this;
            if (retrieveArchived === void 0) { retrieveArchived = false; }
            this.isLoading = true;
            var getUri = "/api/CommentThread";
            if (retrieveArchived)
                getUri += "/Archived";
            if (this.committeeId)
                getUri += "?committeeId=" + this.committeeId;
            this.$http.get(getUri).then(function (response) {
                _this.isLoading = false;
                // Sort by comment date, put unpinned threads 100 years in the past so pinned always show up on top
                response.data = _.sortBy(response.data, function (ct) { return ct.pinnedDateUtc ? ct.pinnedDateUtc : moment(ct.lastCommentDateUtc).subtract(100, "years").toDate(); }).reverse();
                if (retrieveArchived)
                    _this.archivedThreads = response.data;
                else {
                    _this.commentThreads = response.data;
                    _this.archivedThreads = null;
                    // If we should automatically open a discussion thread
                    if (_this.autoOpenThreadId) {
                        var autoOpenThread_1 = _.find(_this.commentThreads, function (t) { return t.commentThreadId === _this.autoOpenThreadId; });
                        if (autoOpenThread_1)
                            _this.$timeout(function () { return _this.displayDiscussModal(autoOpenThread_1); }, 125);
                        // Don't open again
                        _this.autoOpenThreadId = null;
                    }
                }
            }, function (response) {
                _this.isLoading = false;
            });
        };
        GroupCommentThreadsController.$inject = ["$http", "$rootScope", "SiteInfo", "$scope", "fellowResidents", "$timeout"];
        return GroupCommentThreadsController;
    }());
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
    var Comment = /** @class */ (function () {
        function Comment() {
        }
        return Comment;
    }());
    Ally.Comment = Comment;
    /**
     * The controller for the committee home page
     */
    var GroupCommentsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function GroupCommentsController($http, $rootScope) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.isLoading = false;
            this.showDiscussModal = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        GroupCommentsController.prototype.$onInit = function () {
            this.isQaSite = false; //HtmlUtil.getSubdomain() === "qa" || HtmlUtil.getSubdomain() === "localtest";
            if (!this.threadId)
                this.threadId = "Home";
            this.editComment = {
                threadId: this.threadId,
                commentText: "",
                replyToCommentId: null
            };
            this.refreshComments();
        };
        GroupCommentsController.prototype.displayDiscussModal = function () {
            this.showDiscussModal = true;
        };
        GroupCommentsController.prototype.hideDiscussModal = function () {
            //TODO put in a delay before we allow close to avoid the mobile tap-open-close issue
            this.showDiscussModal = false;
        };
        /**
         * Retrieve the comments from the server for the current thread
         */
        GroupCommentsController.prototype.refreshComments = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Comment?threadId=" + this.threadId).then(function (response) {
                _this.isLoading = false;
                _this.commentList = response.data;
                var processComments = function (c) {
                    c.isMyComment = c.authorUserId === _this.$rootScope.userInfo.userId;
                    if (c.replies)
                        _.each(c.replies, processComments);
                };
                // Convert the UTC dates to local dates and mark the user's comments
                _.each(_this.commentList, processComments);
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to refresh comments: " + response.data.exceptionMessage);
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Add a comment
        ///////////////////////////////////////////////////////////////////////////////////////////
        GroupCommentsController.prototype.postComment = function (commentData) {
            var _this = this;
            this.isLoading = true;
            var httpFunc = this.$http.post;
            if (typeof (commentData.existingCommentId) === "number")
                httpFunc = this.$http.put;
            httpFunc("/api/Comment", commentData).then(function () {
                _this.isLoading = false;
                _this.editComment = {};
                _this.showReplyBoxId = -1;
                _this.refreshComments();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to post comment: " + response.data.exceptionMessage);
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Add a comment to the current thread
        ///////////////////////////////////////////////////////////////////////////////////////////
        GroupCommentsController.prototype.onPostCommentClicked = function () {
            if (this.editComment.commentText.length === 0)
                return;
            // Copy the object to avoid updating the UI
            var commentData = {
                threadId: this.threadId,
                commentText: this.editComment.commentText,
                replyToCommentId: null,
                existingCommentId: this.editComment.existingCommentId
            };
            this.postComment(commentData);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Edit an existing comment
        ///////////////////////////////////////////////////////////////////////////////////////////
        GroupCommentsController.prototype.editMyComment = function (comment) {
            this.editComment = {
                commentText: comment.commentText,
                existingCommentId: comment.commentId
            };
        };
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Delete a comment
        ///////////////////////////////////////////////////////////////////////////////////////////
        GroupCommentsController.prototype.deleteMyComment = function (comment) {
            var _this = this;
            this.isLoading = true;
            this.$http.delete("/api/Comment?commentId=" + comment.commentId).then(function () {
                _this.isLoading = false;
                _this.refreshComments();
            }, function (httpResponse) {
                _this.isLoading = false;
                var errorMessage = httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to post comment: " + errorMessage);
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Add a comment in response to a comment in the current thread
        ///////////////////////////////////////////////////////////////////////////////////////////
        GroupCommentsController.prototype.onPostReplyCommentClicked = function () {
            if (this.editComment.replyText.length === 0)
                return;
            // Copy the object to avoid updating the UI
            var commentData = {
                threadId: this.threadId,
                commentText: this.editComment.replyText,
                replyToCommentId: this.editComment.replyToCommentId
            };
            this.postComment(commentData);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to reply
        ///////////////////////////////////////////////////////////////////////////////////////////
        GroupCommentsController.prototype.clickReplyToComment = function (commentId) {
            this.showReplyBoxId = commentId;
            this.editComment = {
                commentText: "",
                replyToCommentId: commentId
            };
        };
        GroupCommentsController.$inject = ["$http", "$rootScope"];
        return GroupCommentsController;
    }());
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
    var HtmlUtil2 = /** @class */ (function () {
        function HtmlUtil2() {
        }
        HtmlUtil2.convertStringsToDates = function (obj) {
            if ($.isArray(obj)) {
                HtmlUtil2.convertDatesFromArray(obj);
            }
            if (HtmlUtil2.isObject(obj)) {
                // Recursively evaluate nested objects
                for (var curPropName in obj) {
                    var value = obj[curPropName];
                    if (HtmlUtil2.isObject(value)) {
                        HtmlUtil2.convertStringsToDates(value);
                    }
                    else if ($.isArray(value)) {
                        HtmlUtil2.convertDatesFromArray(value);
                    }
                    else if (HtmlUtil2.isString(value) && value.length > 10 && HtmlUtil2.dotNetTimeRegEx2.test(value)) {
                        //If it is a string of the expected form convert to date
                        var parsedDate = void 0;
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
        };
        HtmlUtil2.convertDatesFromArray = function (array) {
            for (var i = 0; i < array.length; i++) {
                var value = array[i];
                if (HtmlUtil2.isObject(value)) {
                    HtmlUtil2.convertStringsToDates(value);
                }
                else if (HtmlUtil2.isString(value) && HtmlUtil2.iso8601RegEx.test(value)) {
                    array[i] = new Date(value);
                }
            }
        };
        HtmlUtil2.isObject = function (value) {
            return Object.prototype.toString.call(value) === "[object Object]";
        };
        HtmlUtil2.isString = function (value) {
            return Object.prototype.toString.call(value) === "[object String]";
        };
        /// Test if an object is a string, if it is not empty, and if it's not "null"
        HtmlUtil2.isValidString = function (str) {
            if (!str || typeof (str) !== "string")
                return false;
            if (str === "null")
                return false;
            return str.length > 0;
        };
        // Convert a UTC date string from the server to a local date object
        HtmlUtil2.serverUtcDateToLocal = function (dbString) {
            if (typeof dbString !== "string")
                return dbString;
            if (HtmlUtil.isNullOrWhitespace(dbString))
                return null;
            return moment.utc(dbString).toDate();
        };
        HtmlUtil2.showTooltip = function (element, text) {
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
        };
        HtmlUtil2.removeNonAlphanumeric = function (str) {
            return str.replace(/\W/g, '');
        };
        /** Download a CSV string as a file */
        HtmlUtil2.downloadCsv = function (csvText, downloadFileName) {
            HtmlUtil2.downloadFile(csvText, downloadFileName, "text/csv");
        };
        /** Download a XML string as a file */
        HtmlUtil2.downloadXml = function (xmlText, downloadFileName) {
            HtmlUtil2.downloadFile(xmlText, downloadFileName, "text/xml");
        };
        /** Download a string as a file */
        HtmlUtil2.downloadFile = function (fileContents, downloadFileName, contentType) {
            if (typeof (Blob) !== "undefined") {
                var a = document.createElement("a");
                document.body.appendChild(a);
                a.style.display = "none";
                var blob = new Blob([fileContents], { type: contentType });
                var url = window.URL.createObjectURL(blob);
                a.href = url;
                a.download = downloadFileName;
                a.click();
                window.URL.revokeObjectURL(url);
            }
            else {
                var wrappedFileDataString = "data:" + contentType + ";charset=utf-8," + fileContents;
                var encodedFileDataUri = encodeURI(wrappedFileDataString);
                var downloadLink_1 = document.createElement("a");
                downloadLink_1.setAttribute("href", encodedFileDataUri);
                downloadLink_1.setAttribute("download", downloadFileName);
                document.body.appendChild(downloadLink_1);
                downloadLink_1.click(); // This will download the file
                setTimeout(function () { document.body.removeChild(downloadLink_1); }, 500);
            }
        };
        /** Determine if a string starts with a numeric string */
        HtmlUtil2.startsWithNumber = function (testString, shouldTrim) {
            if (shouldTrim === void 0) { shouldTrim = true; }
            if (HtmlUtil.isNullOrWhitespace(testString))
                return false;
            if (shouldTrim)
                testString = testString.trim();
            var firstWhitespaceIndex = testString.search(/\s/);
            // If no whitespace was found then test the whole string
            if (firstWhitespaceIndex === -1)
                firstWhitespaceIndex = testString.length;
            testString = testString.substring(0, firstWhitespaceIndex - 1);
            return HtmlUtil.isNumericString(testString);
        };
        /** Determine if a string ends with a numeric string */
        HtmlUtil2.endsWithNumber = function (testString, shouldTrim) {
            if (shouldTrim === void 0) { shouldTrim = true; }
            if (HtmlUtil.isNullOrWhitespace(testString))
                return false;
            if (shouldTrim)
                testString = testString.trim();
            return /[0-9]+$/.test(testString);
        };
        /** Get the number at the end of a string, null if the string doesn't end with a number */
        HtmlUtil2.getNumberAtEnd = function (testString) {
            if (HtmlUtil2.endsWithNumber(testString))
                return parseInt(testString.match(/[0-9]+$/)[0]);
            return null;
        };
        HtmlUtil2.isAndroid = function () {
            var ua = navigator.userAgent.toLowerCase();
            return ua.indexOf("android") > -1;
        };
        // From https://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript
        HtmlUtil2.copyTextToClipboard = function (text) {
            var textArea = document.createElement("textarea");
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
            var didCopy = false;
            try {
                var successful = document.execCommand("copy");
                var msg = successful ? "successful" : "unsuccessful";
                console.log("Copying text command was " + msg);
                didCopy = successful;
            }
            catch (err) {
                console.log("Oops, unable to copy");
            }
            document.body.removeChild(textArea);
            return didCopy;
        };
        /* eslint-disable  @typescript-eslint/no-explicit-any */
        HtmlUtil2.smartSortStreetAddresses = function (homeList, namePropName) {
            if (!homeList || homeList.length === 0)
                return homeList;
            // If all homes have a numeric name then lets sort numerically
            var shouldUseNumericNames = _.every(homeList, function (u) { return HtmlUtil.isNumericString(u[namePropName]); });
            if (shouldUseNumericNames)
                return _.sortBy(homeList, function (u) { return +u[namePropName]; });
            // If all homes share the same suffix then sort by only the first part, if numeric
            var firstSuffix = homeList[0][namePropName].substr(homeList[0][namePropName].indexOf(" "));
            var allHaveNumericPrefix = _.every(homeList, function (u) { return HtmlUtil2.startsWithNumber(u[namePropName]); });
            var allHaveSameSuffix = _.every(homeList, function (u) { return HtmlUtil.endsWith(u[namePropName], firstSuffix); });
            if (allHaveNumericPrefix && allHaveSameSuffix)
                return _.sortBy(homeList, function (u) { return parseInt(u[namePropName].substr(0, u[namePropName].indexOf(" "))); });
            // And the flip, if all names start with the same string "Unit #" and end with a number, sort by that number
            var firstNumberIndex = homeList[0][namePropName].search(/[0-9]/);
            if (firstNumberIndex >= 0) {
                var firstPrefix_1 = homeList[0][namePropName].substr(0, firstNumberIndex);
                var allHaveSamePrefix = _.every(homeList, function (u) { return HtmlUtil.startsWith(u[namePropName], firstPrefix_1); });
                var allEndWithNumber = _.every(homeList, function (u) { return HtmlUtil2.endsWithNumber(u[namePropName]); });
                if (allHaveSamePrefix && allEndWithNumber)
                    return _.sortBy(homeList, function (u) { return HtmlUtil2.getNumberAtEnd(u[namePropName]); });
            }
            // If all units start with a number and end with a string (Like,
            // 123 Elm St) then first sort by the street, then number
            if (allHaveNumericPrefix) {
                var sortByStreet_1 = function (s1, s2) {
                    var suffix1 = getAfterNumber_1(s1);
                    var suffix2 = getAfterNumber_1(s2);
                    if (suffix1 === suffix2) {
                        var num1 = parseInt(s1.substr(0, s1.search(/\s/)));
                        var num2 = parseInt(s2.substr(0, s2.search(/\s/)));
                        return num1 - num2;
                    }
                    return suffix1.localeCompare(suffix2);
                };
                var getAfterNumber_1 = function (str) { return str.substring(str.search(/\s/) + 1); };
                return homeList.sort(function (h1, h2) { return sortByStreet_1(h1[namePropName], h2[namePropName]); });
                //return _.sortBy( homeList, u => [getAfterNumber( u[namePropName] ), parseInt( u[namePropName].substr( 0, u[namePropName].search( /\s/ ) ) )] );
            }
            return _.sortBy(homeList, function (u) { return (u[namePropName] || "").toLowerCase(); });
        };
        /**
         * Resize a base 64 image. From https://stackoverflow.com/a/63348962/10315651
         * @param {String} base64 - The base64 string (must include MIME type)
         * @param {Number} newWidth - The width of the image in pixels
         * @param {Number} newHeight - The height of the image in pixels
         */
        HtmlUtil2.resizeBase64Img = function (base64, newWidth, newHeight) {
            return new Promise(function (resolve, reject) {
                var canvas = document.createElement("canvas");
                canvas.width = newWidth;
                canvas.height = newHeight;
                var context = canvas.getContext("2d");
                var image = document.createElement("img");
                image.onload = function () {
                    context.drawImage(image, 0, 0, image.width, image.height, 0, 0, newWidth, newHeight);
                    resolve(canvas.toDataURL());
                };
                image.src = base64;
            });
        };
        /**
         * Resize an image
         * @param {HTMLImageElement} image - The image to resize
         * @param {Number} newWidth - The width of the image in pixels
         * @param {Number} newHeight - The height of the image in pixels
         */
        HtmlUtil2.resizeFromImg = function (image, newWidth, newHeight) {
            return new Promise(function (resolve, reject) {
                var canvas = document.createElement("canvas");
                canvas.width = newWidth;
                canvas.height = newHeight;
                var context = canvas.getContext("2d");
                context.scale(newWidth / image.width, newHeight / image.height);
                context.drawImage(image, 0, 0);
                resolve(canvas.toDataURL());
            });
        };
        /**
         * Resize an image and output a blob
         * @param {HTMLImageElement} image - The image to resize
         * @param {Number} newWidth - The width of the image in pixels
         * @param {Number} newHeight - The height of the image in pixels
         */
        HtmlUtil2.resizeFromImgToBlob = function (image, newWidth, newHeight, mimeType) {
            if (mimeType === void 0) { mimeType = "image/jpeg"; }
            return new Promise(function (resolve, reject) {
                var canvas = document.createElement("canvas");
                canvas.width = newWidth;
                canvas.height = newHeight;
                var context = canvas.getContext("2d");
                context.drawImage(image, 0, 0, image.width, image.height, 0, 0, newWidth, newHeight);
                canvas.toBlob(function (blob) {
                    resolve(blob);
                }, mimeType, 0.75);
            });
        };
        HtmlUtil2.initTinyMce = function (elemId, heightPixels, overrideOptions) {
            if (elemId === void 0) { elemId = "tiny-mce-editor"; }
            if (heightPixels === void 0) { heightPixels = 400; }
            if (overrideOptions === void 0) { overrideOptions = null; }
            var mcePromise = new Promise(function (resolve, reject) {
                var loadRtes = function () {
                    tinymce.remove();
                    var menubar = (overrideOptions && overrideOptions.menubar !== undefined) ? overrideOptions.menubar : "edit insert format table";
                    var toolbar = (overrideOptions && overrideOptions.toolbar !== undefined) ? overrideOptions.toolbar : "styleselect | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | checklist code formatpainter table";
                    tinymce.init({
                        selector: '#' + elemId,
                        menubar: menubar,
                        //plugins: 'a11ychecker advcode casechange export formatpainter image editimage linkchecker autolink lists checklist media mediaembed pageembed permanentpen powerpaste table advtable tableofcontents tinycomments tinymcespellchecker',
                        plugins: 'image link autolink lists media table code',
                        //toolbar: 'a11ycheck addcomment showcomments casechange checklist code export formatpainter image editimage pageembed permanentpen table tableofcontents',
                        toolbar: toolbar,
                        //toolbar_mode: 'floating',
                        //tinycomments_mode: 'embedded',
                        //tinycomments_author: 'Author name',
                        height: heightPixels,
                        file_picker_types: 'image',
                        image_description: false,
                        file_picker_callback: function (cb, value, meta) {
                            var input = document.createElement('input');
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
                                var selectedFile = evt.target.files[0];
                                var reader = new FileReader();
                                reader.onload = function (fileObject) {
                                    /*
                                      Note: Now we need to register the blob in TinyMCEs image blob
                                      registry. In the next release this part hopefully won't be
                                      necessary, as we are looking to handle it internally.
                                    */
                                    var newBlobId = 'blobid' + (new Date()).getTime();
                                    var blobCache = tinymce.activeEditor.editorUpload.blobCache;
                                    var base64 = reader.result.split(',')[1];
                                    //console.log( "Image base64 size: " + base64.length );
                                    // If the image is larger than 1MB, let's downsize
                                    var OneMB = 1024 * 1024;
                                    if (base64.length > OneMB) {
                                        var tempImage_1 = new Image();
                                        tempImage_1.onload = function () {
                                            // access image size here 
                                            //console.log( "image width", tempImage.width );
                                            // Resize so the largest edge is 1k pixels
                                            var xScalar = 1000 / tempImage_1.width;
                                            var yScalar = 1000 / tempImage_1.height;
                                            var imageScalar = xScalar;
                                            if (yScalar < xScalar)
                                                imageScalar = yScalar;
                                            HtmlUtil2.resizeFromImgToBlob(tempImage_1, Math.round(tempImage_1.width * imageScalar), Math.round(tempImage_1.height * imageScalar), selectedFile.type).then(function (resizedBlob) {
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
                                                var resizedReader = new FileReader();
                                                resizedReader.readAsDataURL(resizedBlob);
                                                resizedReader.onloadend = function () {
                                                    var resizedFileObject = new File([resizedBlob], selectedFile.name, resizedBlob);
                                                    var resizedBase64 = resizedReader.result.split(',')[1];
                                                    var blobInfo = blobCache.create(newBlobId, resizedFileObject, resizedBase64);
                                                    blobCache.add(blobInfo);
                                                    /* call the callback and populate the Title field with the file name */
                                                    cb(blobInfo.blobUri(), { title: selectedFile.name });
                                                };
                                            });
                                        };
                                        tempImage_1.src = fileObject.target.result;
                                    }
                                    else {
                                        var blobInfo = blobCache.create(newBlobId, selectedFile, base64);
                                        blobCache.add(blobInfo);
                                        /* call the callback and populate the Title field with the file name */
                                        cb(blobInfo.blobUri(), { title: selectedFile.name });
                                    }
                                };
                                reader.readAsDataURL(selectedFile);
                            };
                            input.click();
                        },
                    }).then(function (e) {
                        resolve(e[0]);
                    });
                };
                // Need to delay a bit for TinyMCE to load in case the user is started from a fresh
                // page reload
                setTimeout(function () {
                    if (typeof (tinymce) === "undefined")
                        setTimeout(function () { return loadRtes(); }, 400);
                    else
                        loadRtes();
                }, 100);
            });
            return mcePromise;
        };
        // Matches YYYY-MM-ddThh:mm:ss.sssZ where .sss is optional
        //"2018-03-12T22:00:33"
        HtmlUtil2.iso8601RegEx = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
        //static dotNetTimeRegEx = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
        // Not sure how the Community Ally server differs from other .Net WebAPI apps, but this
        // regex is needed for the dates that come down
        HtmlUtil2.dotNetTimeRegEx2 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?$/;
        return HtmlUtil2;
    }());
    Ally.HtmlUtil2 = HtmlUtil2;
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

var Ally;
(function (Ally) {
    var MaintenanceEntry = /** @class */ (function () {
        function MaintenanceEntry() {
        }
        MaintenanceEntry.prototype.getTitle = function () {
            if (this.project)
                return this.project.title;
            else
                return this.todo.description;
        };
        MaintenanceEntry.prototype.getTypeName = function () {
            if (this.project)
                return "Maintenance Record";
            else
                return "To-Do";
        };
        MaintenanceEntry.prototype.getAuthorName = function () {
            if (this.project)
                return this.project.creatorFullName;
            else
                return this.todo.addedByFullName;
        };
        MaintenanceEntry.prototype.getCreatedDate = function () {
            if (this.project)
                return this.project.createDateUtc;
            else
                return this.todo.addedDateUtc;
        };
        return MaintenanceEntry;
    }());
    Ally.MaintenanceEntry = MaintenanceEntry;
    /**
     * Provides methods to accessing maintenance information
     */
    var MaintenanceService = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function MaintenanceService($http, $q, $cacheFactory) {
            this.$http = $http;
            this.$q = $q;
            this.$cacheFactory = $cacheFactory;
        }
        /**
        * Retrieve the maintenance projects from the server
        */
        MaintenanceService.prototype.loadProjects = function () {
            var _this = this;
            return this.$http.get("/api/Maintenance/Projects").then(function (response) {
                return response.data;
            }, function (response) {
                return _this.$q.reject(response.data);
            });
        };
        return MaintenanceService;
    }());
    Ally.MaintenanceService = MaintenanceService;
})(Ally || (Ally = {}));
angular.module("CondoAlly").service("maintenance", ["$http", "$q", "$cacheFactory", Ally.MaintenanceService]);

var Ally;
(function (Ally) {
    /**
     * The controller for the committee home page
     */
    var SendMessageController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function SendMessageController($rootScope, fellowResidents, siteInfo) {
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
            this.messageSubject = siteInfo.userInfo.fullName + " has sent you a message via your " + AppConfig.appName + " site";
        }
        /// Called on each controller after all the controllers on an element have been constructed
        SendMessageController.prototype.$onInit = function () {
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            this.isSendingToSelf = this.recipientInfo.userId === this.siteInfo.userInfo.userId;
            var isRecipientWholeBoard = this.recipientInfo.userId === Ally.GroupMembersController.AllBoardUserId;
            this.shouldShowSendAsBoard = Ally.FellowResidentsService.isNonPropMgrBoardPosition(this.siteInfo.userInfo.boardPosition) && !isRecipientWholeBoard;
        };
        /// Display the send modal
        SendMessageController.prototype.showSendModal = function () {
            this.shouldShowSendModal = true;
            this.sendResultMessage = "";
            this.shouldShowButtons = true;
            // Focus on the message box once displayed
            if (this.isPremiumPlanActive)
                setTimeout(function () { return document.getElementById("message-text-box").focus(); }, 100);
        };
        /// Hide the send modal
        SendMessageController.prototype.hideModal = function () {
            this.shouldShowSendModal = false;
            this.messageBody = "";
        };
        /// Send the user's message
        SendMessageController.prototype.sendMessage = function () {
            var _this = this;
            this.shouldShowButtons = false;
            this.isSending = true;
            this.sendResultMessage = "";
            this.fellowResidents.sendMessage(this.recipientInfo.userId, this.messageBody, this.messageSubject, this.shouldSendAsBoard).then(function (response) {
                _this.isSending = false;
                _this.sendResultIsError = false;
                _this.messageBody = "";
                _this.sendResultMessage = "Message sent successfully!";
            }, function (response) {
                _this.shouldShowButtons = true;
                _this.isSending = false;
                _this.sendResultIsError = true;
                _this.sendResultMessage = "Failed to send: " + response.data.exceptionMessage;
            });
        };
        /// Occurs when the user clicks the checkbox to toggle if they're sending as the board
        SendMessageController.prototype.onSendAsBoardChanged = function () {
            if (this.shouldSendAsBoard)
                this.messageSubject = "Your " + this.siteInfo.publicSiteInfo.fullName + " board has sent you a message via your " + AppConfig.appName + " site";
            else
                this.messageSubject = this.siteInfo.userInfo.fullName + " has sent you a message via your " + AppConfig.appName + " site";
        };
        SendMessageController.$inject = ["$rootScope", "fellowResidents", "SiteInfo"];
        return SendMessageController;
    }());
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
            var EnterKeyCode = 13;
            if (event.which === EnterKeyCode) {
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
            var EscapeKeyCode = 27;
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

var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Ally;
(function (Ally) {
    /**
     * Represents a home owned or rented by a user
     */
    var UsersHome = /** @class */ (function () {
        function UsersHome() {
        }
        return UsersHome;
    }());
    Ally.UsersHome = UsersHome;
    var PayPeriod = /** @class */ (function () {
        function PayPeriod() {
        }
        return PayPeriod;
    }());
    Ally.PayPeriod = PayPeriod;
    /**
     * The logged-in user's info
     */
    var UserInfo = /** @class */ (function () {
        function UserInfo() {
        }
        return UserInfo;
    }());
    Ally.UserInfo = UserInfo;
    /**
     * Information that is provided to anyone that visits the group's site, even if not logged-in
     */
    var PublicSiteInfo = /** @class */ (function () {
        function PublicSiteInfo() {
        }
        return PublicSiteInfo;
    }());
    Ally.PublicSiteInfo = PublicSiteInfo;
    var RecentPayment = /** @class */ (function () {
        function RecentPayment() {
        }
        return RecentPayment;
    }());
    Ally.RecentPayment = RecentPayment;
    /**
     * Represents the group descriptive information that can only be accessed by a member of the
     * group
     */
    var PrivateSiteInfo = /** @class */ (function () {
        function PrivateSiteInfo() {
        }
        return PrivateSiteInfo;
    }());
    Ally.PrivateSiteInfo = PrivateSiteInfo;
    /**
     * Represents the descriptive information for a CHTN group (condo, HOA, townhome, neighborhood)
     */
    var ChtnPrivateSiteInfo = /** @class */ (function (_super) {
        __extends(ChtnPrivateSiteInfo, _super);
        function ChtnPrivateSiteInfo() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return ChtnPrivateSiteInfo;
    }(PrivateSiteInfo));
    Ally.ChtnPrivateSiteInfo = ChtnPrivateSiteInfo;
    /**
     * The current group's site information
     */
    var SiteInfoService = /** @class */ (function () {
        function SiteInfoService() {
            this.publicSiteInfo = new PublicSiteInfo();
            this.privateSiteInfo = new ChtnPrivateSiteInfo();
            this.userInfo = new Ally.UserInfo();
            this.isLoggedIn = false;
        }
        // Retrieve the basic information for the current site
        SiteInfoService.prototype.refreshSiteInfo = function ($rootScope, $http, $q) {
            var _this = this;
            this._rootScope = $rootScope;
            var deferred = $q.defer();
            $rootScope.isLoadingSite = true;
            if (HtmlUtil.getSubdomain() === "login") {
                $rootScope.isLoadingSite = false;
                this.handleSiteInfo(null, $rootScope);
                deferred.resolve();
                return deferred.promise;
            }
            var onSiteInfoReceived = function (siteInfo) {
                $rootScope.isLoadingSite = false;
                _this.handleSiteInfo(siteInfo, $rootScope);
                deferred.resolve(siteInfo);
            };
            var onRequestFailed = function () {
                $rootScope.isLoadingSite = false;
                deferred.reject();
            };
            // Retrieve information for the current association
            //const GetInfoUri = "/api/GroupSite";
            var GetInfoUri = "https://0.webappapi.communityally.org/api/GroupSite";
            //const GetInfoUri = "https://0.webappapi.mycommunityally.org/api/GroupSite";
            $http.get(GetInfoUri).then(function (httpResponse) {
                // If we received data but the user isn't logged-in
                if (httpResponse.data && !httpResponse.data.userInfo) {
                    // Check the cross-domain localStorage for an auth token
                    _this.xdLocalStorage.getItem("allyApiAuthToken").then(function (response) {
                        // If we received an auth token then retry accessing the group data
                        if (response && HtmlUtil.isValidString(response.value)) {
                            //console.log( "Received cross domain token:" + response.value );
                            _this.setAuthToken(response.value);
                            $http.get(GetInfoUri).then(function (httpResponse) {
                                onSiteInfoReceived(httpResponse.data);
                            }, onRequestFailed);
                        }
                        // Otherwise just handle what we received
                        else
                            onSiteInfoReceived(httpResponse.data);
                    }, function () {
                        // We failed to get a cross domain token so continue on with what we received
                        onSiteInfoReceived(httpResponse.data);
                    });
                }
                else
                    onSiteInfoReceived(httpResponse.data);
            }, onRequestFailed);
            return deferred.promise;
        };
        ;
        // Returns if a page is for a neutral (public, no login required) page
        SiteInfoService.prototype.testIfIsNeutralPage = function (locationHash) {
            // We only care about Angular paths
            var HashPrefix = "#!/";
            if (!HtmlUtil.startsWith(locationHash, HashPrefix))
                return false;
            // Remove that prefix and add a slash as that's what the menu item stores
            locationHash = "/" + locationHash.substring(HashPrefix.length);
            var menuItem = _.find(AppConfig.menu, function (menuItem) { return menuItem.path === locationHash; });
            return typeof (menuItem) === "object";
        };
        ;
        // Log-in and application start both retrieve information about the current association's site.
        // This function should be used to properly populate the scope with the information.
        SiteInfoService.prototype.handleSiteInfo = function (siteInfo, $rootScope) {
            var subdomain = HtmlUtil.getSubdomain(window.location.host);
            if (!this.authToken && $rootScope.authToken)
                this.setAuthToken($rootScope.authToken);
            // If we're at an unknown subdomain
            if (siteInfo === null || siteInfo === "null" || siteInfo === "") {
                // Allow the user to log-in with no subdomain, create a temp site info object
                var isNeutralSubdomain = subdomain === null || subdomain === "www" || subdomain === "login";
                var isNeutralPage = this.testIfIsNeutralPage(window.location.hash);
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
            var privateSiteInfo = siteInfo.privateSiteInfo;
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
                var prepopulateZopim = function () {
                    if (typeof ($zopim) !== "undefined") {
                        $zopim(function () {
                            $zopim.livechat.setName($rootScope.userInfo.firstName + " " + $rootScope.userInfo.lastName);
                            if ($rootScope.userInfo.emailAddress.indexOf("@") !== -1)
                                $zopim.livechat.setEmail($rootScope.userInfo.emailAddress);
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
                var LoginPath = "#!/Login";
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
        };
        SiteInfoService.prototype.setAuthToken = function (authToken) {
            if (window.localStorage)
                window.localStorage.setItem("ApiAuthToken", authToken);
            this._rootScope.authToken = authToken;
            this.xdLocalStorage.setItem("allyApiAuthToken", authToken).then(function (response) {
                //console.log( "Set cross domain auth token" );
            });
            this.authToken = authToken;
            //appCacheService.clear( appCacheService.Key_AfterLoginRedirect );
        };
        SiteInfoService.AlwaysDiscussDate = new Date(2018, 7, 1); // Groups created after August 1, 2018 always have discussion enabled
        return SiteInfoService;
    }());
    Ally.SiteInfoService = SiteInfoService;
    var SiteInfoHelper = /** @class */ (function () {
        function SiteInfoHelper() {
        }
        SiteInfoHelper.loginInit = function ($q, $http, $rootScope, $sce, xdLocalStorage) {
            var deferred = $q.defer();
            SiteInfoProvider.siteInfo.xdLocalStorage = xdLocalStorage;
            if (SiteInfoProvider.isSiteInfoLoaded) {
                deferred.resolve(SiteInfoProvider.siteInfo);
            }
            else {
                SiteInfoProvider.siteInfo.refreshSiteInfo($rootScope, $http, $q).then(function () {
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
                    $rootScope.onUpdateSiteTitleText = function () {
                        analytics.track("updateSiteTitle");
                        $http.put("/api/Settings", { siteTitle: $rootScope.siteTitle.text });
                    };
                    deferred.resolve(SiteInfoProvider.siteInfo);
                });
            }
            return deferred.promise;
        };
        ;
        return SiteInfoHelper;
    }());
    Ally.SiteInfoHelper = SiteInfoHelper;
    var SiteInfoProvider = /** @class */ (function () {
        function SiteInfoProvider() {
        }
        SiteInfoProvider.prototype.$get = function () {
            if (!SiteInfoProvider.isSiteInfoLoaded)
                console.log("Not yet loaded!");
            return SiteInfoProvider.siteInfo;
        };
        SiteInfoProvider.isSiteInfoLoaded = false;
        // Use statics because this class is used to resolve the route before the Angular app is
        // allowed to run
        SiteInfoProvider.siteInfo = new Ally.SiteInfoService();
        return SiteInfoProvider;
    }());
    Ally.SiteInfoProvider = SiteInfoProvider;
})(Ally || (Ally = {}));
angular.module('CondoAlly').provider("SiteInfo", Ally.SiteInfoProvider);

var Ally;
(function (Ally) {
    var TodoItem = /** @class */ (function () {
        function TodoItem() {
        }
        return TodoItem;
    }());
    Ally.TodoItem = TodoItem;
    var TodoList = /** @class */ (function () {
        function TodoList() {
        }
        return TodoList;
    }());
    Ally.TodoList = TodoList;
    var TodoListCtrl = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function TodoListCtrl($http, siteInfo, fellowResidents) {
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
        TodoListCtrl.prototype.$onInit = function () {
            var _this = this;
            this.isFixedList = !!this.fixedTodoListId;
            if (this.isFixedList)
                this.loadFixedTodoList();
            else
                this.loadAllTodoLists();
            this.canManage = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager;
            // Make sure committee members can manage their data
            if (this.committee && !this.canManage)
                this.fellowResidents.isCommitteeMember(this.committee.committeeId).then(function (isCommitteeMember) { return _this.canManage = isCommitteeMember; });
        };
        /**
         * Retrieve a todo list by ID
         */
        TodoListCtrl.prototype.loadFixedTodoList = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Todo/List/" + this.fixedTodoListId).then(function (httpResponse) {
                _this.isLoading = false;
                _this.todoLists = [httpResponse.data];
            });
        };
        /**
         * Retrieve all available todo lists
         */
        TodoListCtrl.prototype.loadAllTodoLists = function () {
            var _this = this;
            this.isLoading = true;
            var getUri = "/api/Todo";
            if (this.committee)
                getUri = "/api/Todo/ListsForCommittee/" + this.committee.committeeId;
            this.$http.get(getUri).then(function (httpResponse) {
                _this.isLoading = false;
                _this.todoLists = httpResponse.data;
            });
        };
        /**
         * Create a new to-do list
         */
        TodoListCtrl.prototype.onAddList = function () {
            var _this = this;
            this.isLoading = true;
            var postUri = "/api/Todo/newList?listName=" + encodeURIComponent(this.newListName);
            if (this.committee)
                postUri += "&committeeId=" + this.committee.committeeId;
            this.$http.post(postUri, null).then(function () {
                _this.isLoading = false;
                _this.newListName = "";
                _this.loadAllTodoLists();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to create: " + response.data.exceptionMessage);
            });
        };
        /**
         * Create a new to-do item
         */
        TodoListCtrl.prototype.onAddItem = function (todoListId) {
            var _this = this;
            this.isLoading = true;
            var postUri = "/api/Todo/newItem/" + todoListId + "?description=" + encodeURIComponent(this.newItemDescription);
            this.$http.post(postUri, null).then(function () {
                _this.isLoading = false;
                _this.newItemDescription = "";
                _this.loadAllTodoLists();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to create: " + response.data.exceptionMessage);
            });
        };
        /**
         * Create a new to-do
         */
        TodoListCtrl.prototype.addNewItem = function (todoListId) {
            this.editTodoItem = new TodoItem();
            this.editTodoItem.owningTodoListId = todoListId;
            if (this.committee)
                this.editTodoItem.owningTodoListId = todoListId;
            this.shouldExpandTodoItemModal = false;
            window.setTimeout(function () { return $("#edit-todo-name-text-box").focus(); }, 100);
        };
        /**
         * Save changes to a to-do item
         */
        TodoListCtrl.prototype.saveTodoItem = function () {
            var _this = this;
            this.isLoading = true;
            var postUri = "/api/Todo/Item";
            this.$http.post(postUri, this.editTodoItem).then(function () {
                _this.isLoading = false;
                _this.newItemDescription = "";
                _this.editTodoItem = null;
                _this.loadAllTodoLists();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to create: " + response.data.exceptionMessage);
            });
        };
        /**
         * Toggle an item's completed state
         */
        TodoListCtrl.prototype.onToggleComplete = function (todoListId, todoItemId) {
            var _this = this;
            this.isLoading = true;
            this.$http.put("/api/Todo/toggleComplete/" + todoListId + "/" + todoItemId, null).then(function () {
                _this.isLoading = false;
                _this.loadAllTodoLists();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to toggle: " + response.data.exceptionMessage);
            });
        };
        /**
         * Delete a to-do item
         */
        TodoListCtrl.prototype.deleteTodoItem = function (curItem) {
            var _this = this;
            this.isLoading = true;
            this.$http.delete("/api/Todo/Item/" + curItem.todoItemId).then(function () {
                _this.isLoading = false;
                _this.loadAllTodoLists();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to delete: " + response.data.exceptionMessage);
            });
        };
        /**
         * Delete a to-do list
         */
        TodoListCtrl.prototype.deleteTodoList = function (curList) {
            var _this = this;
            if (curList.todoItems.length > 0) {
                if (!confirm("Are you sure you want to delete this list with active to-dos?"))
                    return;
            }
            this.isLoading = true;
            this.$http.delete("/api/Todo/List/" + curList.todoListId).then(function () {
                _this.isLoading = false;
                _this.loadAllTodoLists();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to delete: " + response.data.exceptionMessage);
            });
        };
        /**
         * Export the lists to CSV
         */
        TodoListCtrl.prototype.exportAllToCsv = function () {
            if (typeof (analytics) !== "undefined")
                analytics.track('exportTodoListCsv');
            var a = this.todoLists[0].todoItems;
            a[0].completedByFullName;
            var csvColumns = [
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
            var csvDataString = "";
            for (var listIndex = 0; listIndex < this.todoLists.length; ++listIndex) {
                var curList = this.todoLists[listIndex];
                for (var i = 0; i < curList.todoItems.length; ++i)
                    curList.todoItems[i].owningTodoListName = curList.name;
                csvDataString += Ally.createCsvString(curList.todoItems, csvColumns, listIndex === 0);
            }
            var filename = "ToDos.csv";
            if (this.committee)
                filename = this.committee.name.replace(/\W/g, '') + "_" + filename;
            Ally.HtmlUtil2.downloadCsv(csvDataString, filename);
        };
        TodoListCtrl.$inject = ["$http", "SiteInfo", "fellowResidents"];
        return TodoListCtrl;
    }());
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