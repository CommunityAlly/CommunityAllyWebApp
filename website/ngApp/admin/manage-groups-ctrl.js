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
         * Find the groups to which a user, via e-mail address, belongs
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
