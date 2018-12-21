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
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ManageAddressPolysController.prototype.$onInit = function () {
            // Initialize the UI
            this.refreshAddresses();
        };
        ManageAddressPolysController.prototype.getPolyInfo = function (url, polyType) {
            var deferred = this.$q.defer();
            this.isLoading = true;
            var innerThis = this;
            this.$http.get(url).then(function (httpResponse) {
                innerThis.isLoading = false;
                var addresses = httpResponse.data;
                // Mark address as opposed to group bounds
                _.each(addresses, function (a) {
                    a.polyType = polyType;
                    if (polyType == "Group")
                        a.oneLiner = a.shortName + ", " + a.appName;
                });
                $.merge(innerThis.addresses, addresses);
                deferred.resolve(innerThis.addresses);
            }, function (httpResponse) {
                this.isLoading = false;
                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to retrieve addresses: " + errorMessage);
                deferred.reject();
            });
            return deferred.promise;
        };
        ManageAddressPolysController.prototype.getGroupBoundPolys = function () {
            return this.getPolyInfo("/api/AdminMap/GetGroupBounds?filter=" + this.filterAddresses, "Group");
        };
        ManageAddressPolysController.prototype.getAddressPolys = function () {
            return this.getPolyInfo("/api/AdminMap?filter=" + this.filterAddresses, "Address");
        };
        // Get the addresses that are missing bounding polys
        ManageAddressPolysController.prototype.refreshAddresses = function () {
            this.isLoading = true;
            this.addresses = [];
            var innerThis = this;
            this.getAddressPolys().then(function () { return innerThis.getGroupBoundPolys(); }).then(function (addresses) {
                innerThis.addressPoints = [];
                _.each(addresses, function (a) {
                    if (a.gpsPos) {
                        // The GoogleMapPoly directive uses the fullAddress for the marker tooltip
                        a.gpsPos.fullAddress = a.oneLiner;
                        innerThis.addressPoints.push(a.gpsPos);
                    }
                });
            });
        };
        ManageAddressPolysController.prototype.onSavePoly = function () {
            this.isLoading = true;
            var serverVerts = { vertices: this.selectedAddress.gpsBounds.vertices };
            var url = this.selectedAddress.polyType === "Address" ? ("/api/AdminMap?addressId=" + this.selectedAddress.addressId) : ("/api/AdminMap?groupId=" + this.selectedAddress.groupId);
            var innerThis = this;
            this.$http.put(url, serverVerts).then(function () {
                innerThis.isLoading = false;
            }, function () {
                innerThis.isLoading = false;
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
        function ManageGroupsController($timeout, $http, siteInfo) {
            this.$timeout = $timeout;
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
                this.isLoading = true;
                var innerThis = this;
                this.$http.get("/api/Association/adminList").then(function (response) {
                    innerThis.isLoading = false;
                    innerThis.groups = response.data;
                    // Add the app type string
                    _.each(innerThis.groups, function (g) {
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
                    });
                }, function () {
                    innerThis.isLoading = false;
                    alert("Failed to retrieve groups");
                });
            };
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ManageGroupsController.prototype.$onInit = function () {
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
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/Admin/findAssociationsForUser?email=" + this.findUserAssociationsEmail).then(function (response) {
                innerThis.isLoading = false;
                innerThis.foundUserAssociations = response.data;
            }, function () {
                innerThis.isLoading = false;
                alert("Failed to find associations for user");
            });
        };
        /**
         * Delete a CHTN group
         */
        ManageGroupsController.prototype.deleteAssociation = function (association) {
            if (!confirm("Are you sure you want to delete this association?"))
                return;
            this.isLoading = true;
            var innerThis = this;
            this.$http.delete("/api/Association/chtn/" + association.groupId).then(function () {
                innerThis.isLoading = false;
                innerThis.retrieveGroups();
            }, function (error) {
                innerThis.isLoading = false;
                console.log(error.data.exceptionMessage);
                alert("Failed to delete group: " + error.data.exceptionMessage);
            });
        };
        /**
         * Add an address to full address
         */
        ManageGroupsController.prototype.addAddress = function () {
            this.newAddressId = null;
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/AdminHelper/AddAddress?address=" + encodeURIComponent(this.newAddress), null).success(function (response) {
                innerThis.isLoading = false;
                innerThis.newAddressId = response.data.newAddressId;
            }).error(function (response) {
                innerThis.isLoading = false;
                alert("Failed to add address: " + response.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user presses the button to create a new association
         */
        ManageGroupsController.prototype.onCreateAssociationClick = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/Association", this.newAssociation).then(function () {
                innerThis.isLoading = false;
                innerThis.newAssociation = new GroupEntry();
                innerThis.retrieveGroups();
            });
        };
        ManageGroupsController.prototype.onSendTestEmail = function () {
            this.makeHelperRequest("/api/AdminHelper/SendTestEmail?testEmailRecipient=" + encodeURIComponent(this.testEmailRecipient) + "&sendFromInmail=" + (this.sendTestFromInmail ? 'true' : 'false'));
        };
        ManageGroupsController.prototype.onSendTaylorTestEmail = function () {
            this.makeHelperRequest("/api/AdminHelper/SendFromTaylorEmail?testEmailRecipient=" + encodeURIComponent(this.testTaylorEmailRecipient));
        };
        ManageGroupsController.prototype.onSendTestPostmarkEmail = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/AdminHelper/SendTestPostmarkEmail?email=" + this.testPostmarkEmail).success(function () {
                innerThis.isLoading = false;
                alert("Successfully sent email");
            }).error(function () {
                innerThis.isLoading = false;
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
            if (postData === void 0) { postData = null; }
            this.isLoadingHelper = true;
            var request;
            if (postData)
                request = this.$http.post(apiPath, postData);
            else
                request = this.$http.get(apiPath);
            var innerThis = this;
            request.then(function () { return innerThis.isLoadingHelper = false; }, function () { innerThis.isLoadingHelper = false; alert("Failed"); });
        };
        ManageGroupsController.prototype.onTestException = function () {
            this.makeHelperRequest("/api/Association/testException");
        };
        ManageGroupsController.prototype.onClearElmahLogs = function () {
            this.makeHelperRequest("/api/Admin/clearElmah");
        };
        ManageGroupsController.prototype.onClearAppGroupCache = function () {
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
        ManageGroupsController.$inject = ["$timeout", "$http", "SiteInfo"];
        return ManageGroupsController;
    }());
    Ally.ManageGroupsController = ManageGroupsController;
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
        function ManageHomesController($http, $q) {
            this.$http = $http;
            this.$q = $q;
            this.isLoading = false;
            this.unitToEdit = new Ally.Unit();
            this.isEdit = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ManageHomesController.prototype.$onInit = function () {
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
                alert("Failed to load homes");
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
            if (this.isEdit)
                this.$http.put("/api/Unit", this.unitToEdit).then(onSave);
            else
                this.$http.post("/api/Unit", this.unitToEdit).then(onSave);
        };
        /**
         * Occurs when the user presses the button to edit a unit
         */
        ManageHomesController.prototype.onEditUnitClick = function (unit) {
            this.isEdit = true;
            this.unitToEdit = unit;
            if (unit.fullAddress)
                this.unitToEdit.streetAddress = unit.fullAddress.oneLiner;
        };
        /**
         * Occurs when the user presses the button to delete a unit
         */
        ManageHomesController.prototype.onDeleteUnitClick = function (unit) {
            var _this = this;
            this.$http.delete("/api/Unit/" + unit.unitId).then(function () {
                _this.refresh();
            });
        };
        /**
         * Occurs when the user presses the button to fast add units
         */
        ManageHomesController.prototype.onFastAddUnits = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.post("/api/Unit?fastAdd=" + this.lastFastAddName, null).then(function () {
                _this.isLoading = false;
                _this.refresh();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed fast add:" + response.data.exceptionMessage);
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
            this.$http.post("/api/Unit?onePerLine=1", postData).then(function () {
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
                _this.refresh();
            }, function () {
                _this.isLoading = false;
                alert("Failed");
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user presses the button to delete all units
        ///////////////////////////////////////////////////////////////////////////////////////////////
        ManageHomesController.prototype.onDeleteAllClick = function () {
            var _this = this;
            if (!confirm("This will delete every unit! This should only be used for new sites!"))
                return;
            this.$http.get("/api/Unit?deleteAction=all").then(function () {
                _this.refresh();
            }, function () {
            });
        };
        ManageHomesController.$inject = ["$http", "$rootScope"];
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
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ViewActivityLogController.prototype.$onInit = function () {
            // Initialize the UI
            this.retrieveEntries();
        };
        /**
         * Load the activity log data
         */
        ViewActivityLogController.prototype.retrieveEntries = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/ActivityLog").then(function (logResponse) {
                innerThis.isLoading = false;
                innerThis.logEntries = logResponse.data;
                // The date comes down as a string so let's convert it to a Date object for the local time zone
                _.each(innerThis.logEntries, function (e) { return e.postDate = moment(e.postDate).toDate(); });
            }, function (errorResponse) {
                innerThis.isLoading = false;
                alert("Failed to load activity log: " + errorResponse.data.exceptionMessage);
            });
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
            this.$http.get("/api/Neighborhood").then(function (httpResponse) {
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
var OverrideBaseApiPath = null;
CA.angularApp.config(['$routeProvider', '$httpProvider', '$provide', "SiteInfoProvider", "$locationProvider",
    function ($routeProvider, $httpProvider, $provide, siteInfoProvider, $locationProvider) {
        $locationProvider.hashPrefix('!');
        var subdomain = HtmlUtil.getSubdomain(OverrideBaseApiPath);
        if (subdomain === null && window.location.hash !== "#!/Login") {
            GlobalRedirect(AppConfig.baseUrl);
            return;
        }
        var isLoginRequired = function ($location, $q, siteInfo, appCacheService) {
            var deferred = $q.defer();
            // We have no user information so they must login
            if (!siteInfo.userInfo) {
                // Home, the default page, and login don't need special redirection or user messaging
                if ($location.path() !== "/Home" && $location.path() !== "/Login") {
                    appCacheService.set(appCacheService.Key_AfterLoginRedirect, $location.path());
                    appCacheService.set(appCacheService.Key_WasLoggedIn401, "true");
                }
                deferred.reject();
                $location.path('/Login');
            }
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
                allyRole: menuItem.role
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
                                appCacheService.set(appCacheService.Key_WasLoggedIn403, "true");
                            // If the user is unauthorized but has saved credentials, try to log-in then retry the request
                            if (status === 401 && HtmlUtil.isValidString(window.localStorage["rememberMe_Email"])) {
                                var $http = $injector.get("$http");
                                // Multiple requests can come in at the same time with 401, so let's store
                                // our login promise so subsequent calls can tie into the first login
                                // request
                                if (!$rootScope.retryLoginDeffered) {
                                    $rootScope.retryLoginDeffered = $q.defer();
                                    var loginInfo = {
                                        emailAddress: window.localStorage["rememberMe_Email"],
                                        password: atob(window.localStorage["rememberMe_Password"])
                                    };
                                    var retryLogin = function () {
                                        $http.post("/api/Login", loginInfo).then(function (httpResponse) {
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
                                var retryRequestDeferred = $q.defer();
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
                            if ($location.path() !== "/Home" && $location.path() !== "/Login") {
                                appCacheService.set(appCacheService.Key_AfterLoginRedirect, $location.path());
                                appCacheService.set(appCacheService.Key_WasLoggedIn401, "true");
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
        $provide.factory("apiUriInterceptor", ["$rootScope", function ($rootScope) {
                // If we're making a request because the Angular app's run block, then see if we have
                // a cached auth token
                if (typeof ($rootScope.authToken) !== "string" && window.localStorage)
                    $rootScope.authToken = window.localStorage.getItem("ApiAuthToken");
                return {
                    request: function (reqConfig) {
                        // If we're talking to the Community Ally API server
                        if (HtmlUtil.startsWith(reqConfig.url, "/api/")) {
                            // If we have an overridden URL to use for API requests
                            if (!HtmlUtil.isNullOrWhitespace(OverrideBaseApiPath)) {
                                reqConfig.url = OverrideBaseApiPath + reqConfig.url;
                            }
                            // Add the auth token
                            reqConfig.headers["Authorization"] = "Bearer " + $rootScope.authToken;
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
        $rootScope.hideMenu = false;
        $rootScope.isAdmin = false;
        $rootScope.isSiteManager = false;
        $rootScope.menuItems = _.where(AppConfig.menu, function (menuItem) { return !HtmlUtil.isNullOrWhitespace(menuItem.menuTitle); });
        $rootScope.mainMenuItems = _.where($rootScope.menuItems, function (menuItem) { return menuItem.role === Role_Authorized; });
        $rootScope.manageMenuItems = _.where($rootScope.menuItems, function (menuItem) { return menuItem.role === Role_Manager; });
        $rootScope.adminMenuItems = _.where($rootScope.menuItems, function (menuItem) { return menuItem.role === Role_Admin; });
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
            }
        }
        xdLocalStorage.init({
            /* required */
            iframeUrl: "https://communityally.org/xd-local-storage.html"
        }).then(function () {
            //an option function to be called once the iframe was loaded and ready for action
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
            if (routeOptions.path[0] !== '/')
                routeOptions.path = "/" + routeOptions.path;
            this.path = routeOptions.path;
            this.templateHtml = routeOptions.templateHtml;
            this.menuTitle = routeOptions.menuTitle;
            this.role = routeOptions.role || Role_Authorized;
        }
        return RoutePath_v3;
    }());
    Ally.RoutePath_v3 = RoutePath_v3;
    var AppConfigInfo = /** @class */ (function () {
        function AppConfigInfo() {
        }
        return AppConfigInfo;
    }());
    Ally.AppConfigInfo = AppConfigInfo;
})(Ally || (Ally = {}));
var Role_Authorized = "authorized";
var Role_All = "all";
var Role_Manager = "manager";
var Role_Admin = "admin";
// The names need to match the PeriodicPaymentFrequency enum
var PeriodicPaymentFrequencies = [
    { name: "Monthly", intervalName: "month", id: 50 },
    { name: "Quarterly", intervalName: "quarter", id: 51 },
    { name: "Semiannually", intervalName: "half-year", id: 52 },
    { name: "Annually", intervalName: "year", id: 53 }
];
function FrequencyIdToInfo(frequencyId) {
    return PeriodicPaymentFrequencies[frequencyId - 50];
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
    segmentWriteKey: "GnlZNd8jKCpDgFqRKbA4nftkuFIaqKPQ",
    homeName: "Unit",
    memberTypeLabel: "Resident",
    menu: [
        new Ally.RoutePath_v3({ path: "Home", templateHtml: "<chtn-home></chtn-home>", menuTitle: "Home" }),
        new Ally.RoutePath_v3({ path: "Info/Docs", templateHtml: "<association-info></association-info>", menuTitle: "Documents & Info" }),
        new Ally.RoutePath_v3({ path: "Info/:viewName", templateHtml: "<association-info></association-info>" }),
        new Ally.RoutePath_v3({ path: "Logbook", templateHtml: "<logbook-page></logbook-page>", menuTitle: "Calendar" }),
        new Ally.RoutePath_v3({ path: "Map", templateHtml: "<chtn-map></chtn-map>", menuTitle: "Map" }),
        new Ally.RoutePath_v3({ path: "BuildingResidents", templateHtml: "<group-members></group-members>", menuTitle: "Residents" }),
        new Ally.RoutePath_v3({ path: "Committee/:committeeId/:viewName", templateHtml: "<committee-parent></committee-parent>" }),
        new Ally.RoutePath_v3({ path: "ForgotPassword", templateHtml: "<forgot-password></forgot-password>", menuTitle: null, role: Role_All }),
        new Ally.RoutePath_v3({ path: "Login", templateHtml: "<login-page></login-page>", menuTitle: null, role: Role_All }),
        new Ally.RoutePath_v3({ path: "Help", templateHtml: "<help-form></help-form>", menuTitle: null, role: Role_All }),
        new Ally.RoutePath_v3({ path: "SignUp", templateHtml: "<condo-sign-up-wizard></condo-sign-up-wizard>", menuTitle: null, role: Role_All }),
        new Ally.RoutePath_v3({ path: "EmailAbuse/:idValue", templateHtml: "<email-abuse></email-abuse>", role: Role_All }),
        new Ally.RoutePath_v3({ path: "DiscussionManage/:idValue", templateHtml: "<discussion-manage></discussion-manage>" }),
        new Ally.RoutePath_v3({ path: "NeighborSignUp", templateHtml: "<neighbor-sign-up></neighbor-sign-up>", role: Role_All }),
        new Ally.RoutePath_v3({ path: "GroupRedirect/:appName/:shortName", templateHtml: "<group-redirect></group-redirect>", role: Role_All }),
        new Ally.RoutePath_v3({ path: "MyProfile", templateHtml: "<my-profile></my-profile>" }),
        new Ally.RoutePath_v3({ path: "ManageResidents", templateHtml: "<manage-residents></manage-residents>", menuTitle: "Residents", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "ManageCommittees", templateHtml: "<manage-committees></manage-committees>", menuTitle: "Committees", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "ManagePolls", templateHtml: "<manage-polls></manage-polls>", menuTitle: "Polls", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "ManagePayments", templateHtml: "<manage-payments></manage-payments>", menuTitle: "Online Payments", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "AssessmentHistory", templateHtml: "<assessment-history></assessment-history>", menuTitle: "Assessment History", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "Mailing/Invoice", templateHtml: "<mailing-parent></mailing-parent>", menuTitle: "Mailing", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "Mailing/:viewName", templateHtml: "<mailing-parent></mailing-parent>", role: Role_Manager }),
        new Ally.RoutePath_v3({ path: "Settings", templateHtml: "<chtn-settings></chtn-settings>", menuTitle: "Settings", role: Role_Manager }),
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
//var WatchAppConfig: Ally.AppConfigInfo =
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
//var ServiceAppConfig: Ally.AppConfigInfo =
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
NeighborhoodAppConfig.menu = _.reject(NeighborhoodAppConfig.menu, function (mi) { return mi.menuTitle === "Residents"; });
// Add them back under the name "Members"
NeighborhoodAppConfig.menu.push(new Ally.RoutePath_v3({ path: "BuildingResidents", templateHtml: "<group-members></group-members>", menuTitle: "Members" }));
NeighborhoodAppConfig.menu.splice(0, 0, new Ally.RoutePath_v3({ path: "ManageResidents", templateHtml: "<manage-residents></manage-residents>", menuTitle: "Residents", role: Role_Manager }));
// Remove assessment history and add dues history
NeighborhoodAppConfig.menu = _.reject(NeighborhoodAppConfig.menu, function (mi) { return mi.menuTitle === "Assessment History"; });
NeighborhoodAppConfig.menu.splice(3, 0, new Ally.RoutePath_v3({ path: "DuesHistory", menuTitle: "Dues History", templateHtml: "<dues-history></dues-history>", role: Role_Manager }));
NeighborhoodAppConfig.menu.push(new Ally.RoutePath_v3({ path: "NeighborhoodSignUp", templateHtml: "<neighborhood-sign-up-wizard></neighborhood-sign-up-wizard>", role: Role_All }));
///////////////////////////////////////////////////////////////////////////////////////////////////
// Block Club Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
var BlockClubAppConfig = _.clone(CondoAllyAppConfig);
BlockClubAppConfig.appShortName = "block-club";
BlockClubAppConfig.appName = "Block Club Ally";
BlockClubAppConfig.baseTld = "chicagoblock.club";
BlockClubAppConfig.baseUrl = "https://chicagoblock.club/";
BlockClubAppConfig.homeName = "Home";
// Remove Residents and Manage Residents
BlockClubAppConfig.menu = _.reject(BlockClubAppConfig.menu, function (mi) { return mi.menuTitle === "Residents"; });
// Add them back under the name "Members"
BlockClubAppConfig.menu.push(new Ally.RoutePath_v3({ path: "BuildingResidents", templateHtml: "<group-members></group-members>", menuTitle: "Members" }));
BlockClubAppConfig.menu.splice(0, 0, new Ally.RoutePath_v3({ path: "ManageResidents", templateHtml: "<manage-residents></manage-residents>", menuTitle: "Residents", role: Role_Manager }));
// Remove assessment history and add dues history
BlockClubAppConfig.menu = _.reject(BlockClubAppConfig.menu, function (mi) { return mi.menuTitle === "Assessment History"; });
BlockClubAppConfig.menu.splice(3, 0, new Ally.RoutePath_v3({ path: "DuesHistory", menuTitle: "Dues History", templateHtml: "<dues-history></dues-history>", role: Role_Manager }));
BlockClubAppConfig.menu.push(new Ally.RoutePath_v3({ path: "NeighborhoodSignUp", templateHtml: "<neighborhood-sign-up-wizard></neighborhood-sign-up-wizard>", role: Role_All }));
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
    new Ally.RoutePath_v3({ path: "MemberSignUp", templateHtml: "<pta-member-sign-up></pta-member-sign-up>", menuTitle: null, role: Role_All }),
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
if (!HtmlUtil.isNullOrWhitespace(OverrideBaseApiPath))
    lowerDomain = OverrideBaseApiPath.toLowerCase();
if (lowerDomain.indexOf("condoally") !== -1
    || lowerDomain.indexOf("hellocondo") !== -1)
    AppConfig = CondoAllyAppConfig;
else if (lowerDomain.indexOf("homeally") !== -1
    || lowerDomain.indexOf("helloathome") !== -1)
    AppConfig = HomeAppConfig;
else if (lowerDomain.indexOf("hoaally") !== -1
    || lowerDomain.indexOf("hellohoa") !== -1)
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
    if (!path)
        path = window.location.hash;
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
            // The number of pay periods that are visible on the grid
            this.NumPeriodsVisible = 10;
            this.shouldShowCreateSpecialAssessment = false;
            this.unitPayments = {};
            this.showRowType = "unit";
            this.onSavePayment = function () {
                var innerThis = this;
                var onSave = function () {
                    innerThis.isSavingPayment = false;
                    innerThis.editPayment = null;
                    innerThis.retrievePaymentHistory();
                };
                var onError = function (httpResponse) {
                    innerThis.isSavingPayment = false;
                    alert(httpResponse.data.message);
                    innerThis.editPayment = null;
                };
                this.isSavingPayment = true;
                if (this.editPayment.payment.paymentId) {
                    analytics.track("editAssessmentHistoryPayment");
                    this.$http.put("/api/PaymentHistory", this.editPayment.payment).then(onSave, onError);
                }
                else {
                    analytics.track("addAssessmentHistoryPayment");
                    this.$http.post("/api/PaymentHistory", this.editPayment.payment).then(onSave, onError);
                }
            };
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        AssessmentHistoryController.prototype.$onInit = function () {
            var isMembershipGroup = AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club" || AppConfig.appShortName === "pta";
            if (isMembershipGroup)
                this.pageTitle = "Membership Dues Payment History";
            else
                this.pageTitle = "Assessment Payment History";
            this.authToken = window.localStorage.getItem("ApiAuthToken");
            if (AppConfig.isChtnSite)
                this.showRowType = "unit";
            else if (isMembershipGroup)
                this.showRowType = "member";
            else
                console.log("Unhandled app type for payment history: " + AppConfig.appShortName);
            this.units = [
                { name: "A", monthPayments: [1, 2, 3] },
                { name: "B", monthPayments: [1, 2, 3] },
                { name: "C", monthPayments: [1, 2, 3] }
            ];
            // Example
            var payment = {
                paymentId: 0,
                year: 2014,
                period: 1,
                isPaid: false,
                amount: 1.23,
                paymentDate: "1/2/14",
                checkNumber: "123",
                unitId: 1
            };
            this.showPaymentInfo = window.localStorage[this.LocalStorageKey_ShowPaymentInfo] === "true";
            var PeriodicPaymentFrequency_Monthly = 50;
            var PeriodicPaymentFrequency_Quarterly = 51;
            var PeriodicPaymentFrequency_Semiannually = 52;
            var PeriodicPaymentFrequency_Annually = 53;
            this.assessmentFrequency = this.siteInfo.privateSiteInfo.assessmentFrequency;
            if (isMembershipGroup)
                this.assessmentFrequency = PeriodicPaymentFrequency_Annually;
            // Set the period name
            this.payPeriodName = "month";
            if (this.assessmentFrequency === PeriodicPaymentFrequency_Quarterly)
                this.payPeriodName = "quarter";
            else if (this.assessmentFrequency === PeriodicPaymentFrequency_Semiannually)
                this.payPeriodName = "half-year";
            else if (this.assessmentFrequency === PeriodicPaymentFrequency_Annually)
                this.payPeriodName = "year";
            // Set the range values
            this.maxPeriodRange = 12;
            if (this.assessmentFrequency === PeriodicPaymentFrequency_Quarterly)
                this.maxPeriodRange = 4;
            else if (this.assessmentFrequency === PeriodicPaymentFrequency_Semiannually)
                this.maxPeriodRange = 2;
            else if (this.assessmentFrequency === PeriodicPaymentFrequency_Annually)
                this.maxPeriodRange = 1;
            // Set the label values
            this.monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            var shortMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            var quarterNames = ["Quarter 1", "Quarter 2", "Quarter 3", "Quarter 4"];
            var shortQuarterNames = ["Q1", "Q2", "Q3", "Q4"];
            var semiannualNames = ["First Half", "Second Half"];
            var shortSemiannualNames = ["1st Half", "2nd Half"];
            this.periodNames = this.monthNames;
            this.shortPeriodNames = shortMonthNames;
            if (this.assessmentFrequency === PeriodicPaymentFrequency_Quarterly) {
                this.periodNames = quarterNames;
                this.shortPeriodNames = shortQuarterNames;
            }
            else if (this.assessmentFrequency === PeriodicPaymentFrequency_Semiannually) {
                this.periodNames = semiannualNames;
                this.shortPeriodNames = shortSemiannualNames;
            }
            else if (this.assessmentFrequency === PeriodicPaymentFrequency_Annually) {
                this.periodNames = [""];
                this.shortPeriodNames = [""];
            }
            // Set the current period
            this.startPeriodValue = new Date().getMonth() + 2;
            this.startYearValue = new Date().getFullYear();
            if (this.assessmentFrequency === PeriodicPaymentFrequency_Quarterly) {
                this.startPeriodValue = Math.floor(new Date().getMonth() / 4) + 2;
            }
            else if (this.assessmentFrequency === PeriodicPaymentFrequency_Semiannually) {
                this.startPeriodValue = Math.floor(new Date().getMonth() / 6) + 2;
            }
            else if (this.assessmentFrequency === PeriodicPaymentFrequency_Annually) {
                this.startPeriodValue = 1;
                this.startYearValue = new Date().getFullYear() + 1;
            }
            if (this.startPeriodValue > this.maxPeriodRange) {
                this.startPeriodValue = 1;
                this.startYearValue += 1;
            }
            this.isPeriodicPaymentTrackingEnabled = this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled;
            this.retrievePaymentHistory();
        };
        AssessmentHistoryController.prototype.onChangePeriodicPaymentTracking = function () {
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
            var innerThis = this;
            this.$http.put("/api/Association/updatePeriodicPaymentTracking?isPeriodicPaymentTrackingEnabled=" + this.isPeriodicPaymentTrackingEnabled, null).then(function () {
                innerThis.isLoading = false;
            }, function () {
                alert("Failed to update the payment tracking");
                innerThis.isLoading = false;
            });
        };
        /**
         * Add in entries to the payments array so every period has an entry
         */
        AssessmentHistoryController.prototype.fillInEmptyPaymentsForUnit = function (unit) {
            var defaultOwnerUserId = (unit.owners !== null && unit.owners.length > 0) ? unit.owners[0].userId : null;
            var sortedPayments = [];
            var curPeriod = this.startPeriodValue;
            var curYearValue = this.startYearValue;
            for (var periodIndex = 0; periodIndex < this.NumPeriodsVisible; ++periodIndex) {
                if (curPeriod < 1) {
                    curPeriod = this.maxPeriodRange;
                    --curYearValue;
                }
                var curPeriodPayment = _.find(unit.allPayments, function (p) { return p.period === curPeriod && p.year === curYearValue; });
                if (curPeriodPayment === undefined || curPeriodPayment.isEmptyEntry) {
                    curPeriodPayment = {
                        isPaid: false,
                        period: curPeriod,
                        year: curYearValue,
                        amount: unit.assessment,
                        payerUserId: defaultOwnerUserId,
                        paymentDate: new Date(),
                        isEmptyEntry: true
                    };
                }
                sortedPayments.push(curPeriodPayment);
                // curPeriod goes 1-vm.maxPeriodRange
                curPeriod--;
            }
            return sortedPayments;
        };
        /**
         * Add in entries to the payments array so every period has an entry
         */
        AssessmentHistoryController.prototype.fillInEmptyPaymentsForMember = function (member) {
            var sortedPayments = [];
            var curPeriod = this.startPeriodValue;
            var curYearValue = this.startYearValue;
            for (var periodIndex = 0; periodIndex < this.NumPeriodsVisible; ++periodIndex) {
                if (curPeriod < 1) {
                    curPeriod = this.maxPeriodRange;
                    --curYearValue;
                }
                var curPeriodPayment = _.find(member.enteredPayments, function (p) { return p.period === curPeriod && p.year === curYearValue; });
                if (curPeriodPayment === undefined || curPeriodPayment.isEmptyEntry) {
                    curPeriodPayment = {
                        isPaid: false,
                        paymentId: null,
                        period: curPeriod,
                        year: curYearValue,
                        amount: 0,
                        payerUserId: member.userId,
                        paymentDate: new Date(),
                        isEmptyEntry: true,
                        wePayCheckoutId: null,
                        checkNumber: null,
                        notes: null,
                        payerNotes: null,
                        wePayStatus: null,
                        groupId: null
                    };
                }
                sortedPayments.push(curPeriodPayment);
                // curPeriod goes 1-vm.maxPeriodRange
                curPeriod--;
            }
            return sortedPayments;
        };
        AssessmentHistoryController.prototype.viewWePayDetails = function (wePayCheckoutId) {
            this.appCacheService.set("hwpid", wePayCheckoutId);
            this.$location.path("/ManagePayments");
        };
        /**
         * Create a special assessment entry
         */
        AssessmentHistoryController.prototype.addSpecialAssessment = function () {
            // JS is 0 based month plus Angular uses strings so move to 1-based integer for the server
            this.createSpecialAssessment = parseInt(this.createSpecialAssessment) + 1;
            // Create the special assessment
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/PaymentHistory/SpecialAssessment", this.createSpecialAssessment).then(function () {
                innerThis.isLoading = false;
                innerThis.shouldShowCreateSpecialAssessment = false;
                innerThis.retrievePaymentHistory();
            }, function (httpResponse) {
                innerThis.isLoading = false;
                var errorMessage = httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to add special assessment: " + errorMessage);
            });
        };
        /**
         * Display the modal to create special assessments
         */
        AssessmentHistoryController.prototype.showCreateSpecialAssessment = function () {
            this.shouldShowCreateSpecialAssessment = true;
            this.createSpecialAssessment = {
                year: new Date().getFullYear(),
                month: new Date().getMonth().toString(),
                notes: "",
                amount: null
            };
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
        /**
         * Populate the display for a date range
         */
        AssessmentHistoryController.prototype.displayPaymentsForRange = function (startYear, startPeriod) {
            var _this = this;
            this.startYearValue = startYear;
            this.startPeriodValue = startPeriod;
            this.visiblePeriodNames = [];
            var year = this.startYearValue;
            var currentPeriod = this.startPeriodValue;
            for (var columnIndex = 0; columnIndex < this.NumPeriodsVisible; ++columnIndex) {
                if (currentPeriod < 1) {
                    currentPeriod = this.maxPeriodRange;
                    --year;
                }
                var headerName = this.shortPeriodNames[currentPeriod - 1];
                if (currentPeriod === 1 || currentPeriod === this.maxPeriodRange)
                    headerName += " " + year;
                this.visiblePeriodNames.push({
                    name: headerName,
                    periodIndex: currentPeriod,
                    arrayIndex: columnIndex,
                    year: year
                });
                --currentPeriod;
            }
            // Make sure every visible period has an valid entry object
            if (AppConfig.appShortName === "pta")
                _.each(this.payers, function (payer) { return payer.displayPayments = _this.fillInEmptyPaymentsForMember(payer); });
            else
                _.each(this.unitPayments, function (unit) { return unit.payments = _this.fillInEmptyPaymentsForUnit(unit); });
        };
        /**
         * Populate the payment grid
         */
        AssessmentHistoryController.prototype.retrievePaymentHistory = function () {
            var _this = this;
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/PaymentHistory?oldestDate=").then(function (httpResponse) {
                var paymentInfo = httpResponse.data;
                // Build the map of unit ID to unit information
                innerThis.unitPayments = {};
                _.each(paymentInfo.units, function (unit) {
                    innerThis.unitPayments[unit.unitId] = unit;
                    // Only take the first two owners for now
                    innerThis.unitPayments[unit.unitId].displayOwners = _.first(unit.owners, 2);
                    while (innerThis.unitPayments[unit.unitId].displayOwners.length < 2)
                        innerThis.unitPayments[unit.unitId].displayOwners.push({ name: "" });
                    innerThis.unitPayments[unit.unitId].payments = [];
                });
                // Add the payment information to the units
                if (AppConfig.appShortName === "pta") {
                    _.each(httpResponse.data.payers, function (payer) {
                        payer.enteredPayments = _.filter(paymentInfo.payments, function (p) { return p.payerUserId === payer.userId; });
                    });
                }
                // Add the payment information to the units
                _.each(paymentInfo.payments, function (payment) {
                    if (innerThis.unitPayments[payment.unitId])
                        innerThis.unitPayments[payment.unitId].payments.push(payment);
                });
                // Store all of the payments rather than just what is visible
                _.each(paymentInfo.units, function (unit) {
                    unit.allPayments = unit.payments;
                });
                // Sort the units by name
                var sortedUnits = [];
                for (var key in innerThis.unitPayments)
                    sortedUnits.push(innerThis.unitPayments[key]);
                innerThis.unitPayments = _.sortBy(sortedUnits, function (unit) { return unit.name; });
                innerThis.payers = _.sortBy(paymentInfo.payers, function (payer) { return payer.name; });
                innerThis.displayPaymentsForRange(innerThis.startYearValue, innerThis.startPeriodValue);
                innerThis.isLoading = false;
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to retrieve payment history: " + response.data.exceptionMessage);
            });
        };
        /**
         * Get the amount paid by all units in a pay period
         */
        AssessmentHistoryController.prototype.getPaymentSumForPayPeriod = function (periodIndex) {
            var sum = 0;
            if (AppConfig.isChtnSite) {
                var unitIds = _.keys(this.unitPayments);
                for (var i = 0; i < unitIds.length; ++i) {
                    var unitId = unitIds[i];
                    var paymentInfo = this.unitPayments[unitId].payments[periodIndex];
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
        };
        /**
         * Occurs when the user clicks a date cell
         */
        AssessmentHistoryController.prototype.onUnitPaymentCellClick = function (unit, periodPayment) {
            periodPayment.unitId = unit.unitId;
            this.editPayment = {
                unit: unit,
                payment: _.clone(periodPayment),
                periodName: this.periodNames[periodPayment.period - 1],
                filteredPayers: _.filter(this.payers, function (payer) {
                    return !_.some(unit.owners, function (owner) {
                        return owner.userId === payer.userId;
                    });
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
        AssessmentHistoryController.$inject = ["$http", "$location", "SiteInfo", "appCacheService"];
        return AssessmentHistoryController;
    }());
    Ally.AssessmentHistoryController = AssessmentHistoryController;
})(Ally || (Ally = {}));
CA.angularApp.component("assessmentHistory", {
    templateUrl: "/ngApp/chtn/manager/assessment-history.html",
    controller: Ally.AssessmentHistoryController
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
            this.isLoading = true;
            var putUri = (committee.deactivationDateUtc ? "/api/Committee/Reactivate/" : "/api/Committee/Deactivate/") + committee.committeeId;
            var innerThis = this;
            this.$http.put(putUri, null).success(function (committees) {
                innerThis.isLoading = false;
                innerThis.retrieveCommittees();
            }).error(function (exc) {
                innerThis.isLoading = false;
                alert("Failed to retrieve the modify committee: " + exc.exceptionMessage);
            });
        };
        /**
        * Retrieve the list of available committees
        */
        ManageCommitteesController.prototype.retrieveCommittees = function () {
            var _this = this;
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/Committee?includeInactive=true").success(function (committees) {
                _this.isLoading = false;
                _this.activeCommittees = _.filter(committees, function (c) { return !c.deactivationDateUtc; });
                _this.inactiveCommittees = _.filter(committees, function (c) { return !!c.deactivationDateUtc; });
                _this.activeCommittees = _.sortBy(_this.activeCommittees, function (c) { return c.name.toLowerCase(); });
                _this.inactiveCommittees = _.sortBy(_this.inactiveCommittees, function (c) { return c.name.toLowerCase(); });
                // Convert the last login timestamps to local time
                //_.forEach( committees, c => c.creationDateUtc = moment.utc( c.creationDateUtc ).toDate() );
            }).error(function (exc) {
                _this.isLoading = false;
                alert("Failed to retrieve the committee listing");
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
            httpFunc(saveUri, null).success(function () {
                _this.isLoading = false;
                _this.editCommittee = null;
                _this.retrieveCommittees();
            }).error(function (error) {
                _this.isLoading = false;
                alert("Failed to save the committee: " + error.exceptionMessage);
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

var Ally;
(function (Ally) {
    var PaymentPageInfo = /** @class */ (function () {
        function PaymentPageInfo() {
        }
        return PaymentPageInfo;
    }());
    /**
     * The controller for the page to view online payment information
     */
    var ManagePaymentsController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function ManagePaymentsController($http, siteInfo, appCacheService) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.PaymentHistory = [];
            this.message = "";
            this.showPaymentPage = true; //AppConfig.appShortName === "condo";
            this.PeriodicPaymentFrequencies = PeriodicPaymentFrequencies;
            this.AssociationPaysAch = true;
            this.AssociationPaysCC = false; // Payer pays credit card fees
            this.lateFeeInfo = {};
            this.hasLoadedPage = false;
            this.isLoading = false;
            this.isLoadingUnits = false;
            this.isLoadingPayment = false;
            this.isLoadingLateFee = false;
            this.isLoadingCheckoutDetails = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ManagePaymentsController.prototype.$onInit = function () {
            this.highlightWePayCheckoutId = this.appCacheService.getAndClear("hwpid");
            this.isAssessmentTrackingEnabled = this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled;
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
                    assessmentFrequency: 0,
                    allPayTheSame: true,
                    allPayTheSameAmount: null,
                    units: []
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
                var data = httpResponse.data;
                _this.paymentInfo = data;
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
            });
        };
        /**
         * Load all of the untis on the page
         */
        ManagePaymentsController.prototype.refreshUnits = function () {
            // Load the units and assessments
            this.isLoadingUnits = true;
            var innerThis = this;
            this.$http.get("/api/Unit").then(function (httpResponse) {
                innerThis.units = httpResponse.data;
                _.each(innerThis.units, function (u) { if (u.adjustedAssessment === null) {
                    u.adjustedAssessment = u.assessment;
                } });
                innerThis.assessmentSum = _.reduce(innerThis.units, function (memo, u) { return memo + u.assessment; }, 0);
                innerThis.adjustedAssessmentSum = _.reduce(innerThis.units, function (memo, u) { return memo + (u.adjustedAssessment || 0); }, 0);
                innerThis.isLoadingUnits = false;
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
            if (dayOfMonth == NaN || dayOfMonth < 1) {
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
            this.$http.put("/api/OnlinePayment/SaveAllow?allowPayments=" + this.paymentInfo.areOnlinePaymentsAllowed, null).then(function (httpResponse) {
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
            this.$http.put("/api/OnlinePayment/EnablePayPal", enableInfo).then(function (httpResponse) {
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
            this.message = "";
            this.$http.get("/api/OnlinePayment?action=withdrawal").then(function (httpResponse) {
                var withdrawalInfo = httpResponse.data;
                if (withdrawalInfo.redirectUri)
                    window.location.href = withdrawalInfo.redirectUri;
                else
                    _this.message = withdrawalInfo.message;
            }, function (httpResponse) {
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    _this.message = httpResponse.data.exceptionMessage;
            });
        };
        /**
         * Occurs when the user presses the button to edit a unit's assessment
         */
        ManagePaymentsController.prototype.onUnitAssessmentChanged = function (unit) {
            this.isLoadingUnits = true;
            // The UI inputs string values for these fields, so convert them to numbers
            if (typeof (unit.assessment) === "string")
                unit.assessment = parseFloat(unit.assessment);
            if (typeof (unit.adjustedAssessment) === "string")
                unit.adjustedAssessment = parseFloat(unit.adjustedAssessment);
            var innerThis = this;
            this.$http.put("/api/Unit", unit).then(function () {
                innerThis.isLoadingUnits = false;
                innerThis.assessmentSum = _.reduce(innerThis.units, function (memo, u) { return memo + u.assessment; }, 0);
                innerThis.adjustedAssessmentSum = _.reduce(innerThis.units, function (memo, u) { return memo + (u.adjustedAssessment || 0); }, 0);
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
                var AchDBString = "ACH";
                var CreditDBString = "Credit Card";
                var usersAffected = [];
                if (payTypeUpdated === "ach")
                    usersAffected = _.where(this.paymentInfo.usersWithAutoPay, function (u) { return u.wePayAutoPayFundingSource === AchDBString; });
                else if (payTypeUpdated === "cc")
                    usersAffected = _.where(this.paymentInfo.usersWithAutoPay, function (u) { return u.wePayAutoPayFundingSource === CreditDBString; });
                // If users will be affected then display an error message to the user
                if (usersAffected.length > 0) {
                    // We need to reload the site if the user is affected so the home page updates that
                    // the user does not have auto-pay enabled
                    needsReloadOfPage = _.find(usersAffected, function (u) { return u.userId === _this.siteInfo.userInfo.userId; }) !== undefined;
                    needsFullRefresh = true;
                    var message = "Adjusting the fee payer type will cause the follow units to have their auto-pay cancelled and they will be informed by e-mail:\n";
                    _.each(usersAffected, function (u) { return message += u.ownerName + "\n"; });
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
            var innerThis = this;
            this.$http.put("/api/OnlinePayment", this.paymentInfo).then(function () {
                if (needsReloadOfPage)
                    window.location.reload();
                else {
                    innerThis.isLoadingPayment = false;
                    // We need to refresh our data so we don't pop-up the auto-pay cancel warning again
                    if (needsFullRefresh)
                        innerThis.refresh();
                }
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
         * Occurs when the user changes where the WePay fee payment comes from
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
                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
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
            this.$http.get("/api/OnlinePayment/CheckoutInfo?checkoutId=" + wePayCheckoutId, { cache: true }).then(function (httpResponse) {
                _this.isLoadingCheckoutDetails = false;
                _this.checkoutInfo = httpResponse.data;
            }, function (httpResponse) {
                _this.isLoadingCheckoutDetails = false;
                alert("Failed to retrieve checkout details: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Save the sign-up answers
         */
        ManagePaymentsController.prototype.signUp_Commit = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.post("/api/OnlinePayment/BasicInfo", this.signUpInfo).then(function () {
                _this.isLoading = false;
                // Update the unit assessments
                _this.refreshUnits();
                // Update the assesment flag
                _this.hasAssessments = _this.signUpInfo.hasAssessments;
                _this.siteInfo.privateSiteInfo.hasAssessments = _this.hasAssessments;
            }, function (httpResponse) {
                _this.isLoading = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    _this.message = httpResponse.data.exceptionMessage;
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
        ManagePaymentsController.prototype.admin_ClearAccessToken = function () {
            alert("TODO hook this up");
        };
        ManagePaymentsController.$inject = ["$http", "SiteInfo", "appCacheService"];
        return ManagePaymentsController;
    }());
    Ally.ManagePaymentsController = ManagePaymentsController;
})(Ally || (Ally = {}));
CA.angularApp.component("managePayments", {
    templateUrl: "/ngApp/chtn/manager/manage-payments.html",
    controller: Ally.ManagePaymentsController
});

var Ally;
(function (Ally) {
    var Poll = /** @class */ (function () {
        function Poll() {
            this.isAnonymous = true;
        }
        return Poll;
    }());
    /**
     * The controller for the manage polls page
     */
    var ManagePollsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ManagePollsController($http, siteInfo) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.editingItem = new Poll();
            this.pollHistory = [];
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ManagePollsController.prototype.$onInit = function () {
            var threeDaysLater = new Date();
            threeDaysLater.setDate(new Date().getDate() + 3);
            this.defaultPoll = new Poll();
            this.defaultPoll.expirationDate = threeDaysLater;
            this.defaultPoll.answers = [
                {
                    answerText: "Yes"
                },
                {
                    answerText: "No"
                }
            ];
            // The new or existing news item that's being edited by the user
            this.editingItem = angular.copy(this.defaultPoll);
            this.retrieveItems();
        };
        /**
         * Populate the poll data
         */
        ManagePollsController.prototype.retrieveItems = function () {
            var AbstainAnswerSortOrder = 101;
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/Poll").then(function (httpResponse) {
                innerThis.pollHistory = httpResponse.data;
                // Convert the date strings to objects
                for (var i = 0; i < innerThis.pollHistory.length; ++i) {
                    // The date comes down as a string so we need to convert it
                    innerThis.pollHistory[i].expirationDate = new Date(innerThis.pollHistory[i].expirationDate);
                    // Remove the abstain answer since it can't be edited, but save the full answer
                    // list for displaying results
                    innerThis.pollHistory[i].fullResultAnswers = innerThis.pollHistory[i].answers;
                    innerThis.pollHistory[i].answers = _.reject(innerThis.pollHistory[i].answers, function (pa) { return pa.sortOrder === AbstainAnswerSortOrder; });
                }
                innerThis.isLoading = false;
            });
        };
        /**
         * Add a new answer
         */
        ManagePollsController.prototype.addAnswer = function () {
            if (!this.editingItem.answers)
                this.editingItem.answers = [];
            if (this.editingItem.answers.length > 19) {
                alert("You can only have 20 answers maxiumum per poll.");
                return;
            }
            this.editingItem.answers.push({ answerText: '' });
        };
        /**
         * Stop editing a poll and reset the form
         */
        ManagePollsController.prototype.cancelEdit = function () {
            this.editingItem = angular.copy(this.defaultPoll);
        };
        /**
         * Occurs when the user presses the button to save a poll
         */
        ManagePollsController.prototype.onSaveItem = function () {
            if (this.editingItem === null)
                return;
            //$( "#new-item-form" ).validate();
            //if ( !$( "#new-item-form" ).valid() )
            //    return;
            this.isLoading = true;
            var innerThis = this;
            var onSave = function () {
                innerThis.isLoading = false;
                innerThis.editingItem = angular.copy(innerThis.defaultPoll);
                innerThis.retrieveItems();
            };
            var onFailure = function (response) {
                innerThis.isLoading = false;
                alert("Failed to save poll: " + response.data.exceptionMessage);
            };
            // If we're editing an existing news item
            if (typeof (this.editingItem.pollId) === "number") {
                analytics.track("editPoll");
                this.$http.put("/api/Poll", this.editingItem).then(onSave, onFailure);
            }
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
        };
        /**
         * Occurs when the user wants to delete a poll
         */
        ManagePollsController.prototype.onDeleteItem = function (item) {
            this.isLoading = true;
            var innerThis = this;
            this.$http.delete("/api/Poll?pollId=" + item.pollId).then(function () {
                innerThis.retrieveItems();
            }, function (httpResponse) {
                innerThis.isLoading = false;
                if (httpResponse.status === 403)
                    alert("You cannot authorized to delete this poll.");
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
            // Group the responses by the answer they selected
            var responsesGroupedByAnswer = _.groupBy(poll.responses, "answerId");
            poll.chartData = [];
            poll.chartLabels = [];
            var _loop_1 = function () {
                // Ignore inherited properties
                if (!responsesGroupedByAnswer.hasOwnProperty(answerIdStr))
                    return "continue";
                // for..in provides the keys as strings
                var answerId = parseInt(answerIdStr);
                answer = _.find(poll.fullResultAnswers, function (a) { return a.pollAnswerId === answerId; });
                if (answer) {
                    poll.chartLabels.push(answer.answerText);
                    poll.chartData.push(responsesGroupedByAnswer[answerIdStr].length);
                }
            };
            var answer;
            // Go through each answer and store the name and count for that answer
            for (var answerIdStr in responsesGroupedByAnswer) {
                _loop_1();
            }
            if (poll.responses && poll.responses.length < this.siteInfo.privateSiteInfo.numUnits) {
                poll.chartLabels.push("No Response");
                poll.chartData.push(this.siteInfo.privateSiteInfo.numUnits - poll.responses.length);
            }
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
        ManagePollsController.$inject = ["$http", "SiteInfo"];
        return ManagePollsController;
    }());
    Ally.ManagePollsController = ManagePollsController;
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
        function ManageResidentsController($http, $rootScope, $interval, fellowResidents, uiGridConstants, siteInfo) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.$interval = $interval;
            this.fellowResidents = fellowResidents;
            this.uiGridConstants = uiGridConstants;
            this.siteInfo = siteInfo;
            this.isAdmin = false;
            this.showEmailSettings = true;
            this.shouldShowHomePicker = true;
            this.showKansasPtaExport = false;
            this.multiselectMulti = "single";
            this.isSavingUser = false;
            this.isLoading = false;
            this.isLoadingSettings = false;
            this.showEmailHistory = false;
            this.bulkParseNormalizeNameCase = false;
            this.showLaunchSite = true;
            this.showPendingMembers = false;
            this.isLoadingPending = false;
            this.selectedResidentDetailsView = "Primary";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ManageResidentsController.prototype.$onInit = function () {
            var _this = this;
            this.isAdmin = this.siteInfo.userInfo.isAdmin;
            this.siteLaunchedDateUtc = this.siteInfo.privateSiteInfo.siteLaunchedDateUtc;
            this.bulkImportRows = [{}];
            this.multiselectOptions = "";
            this.allUnits = null;
            this.homeName = AppConfig.homeName || "Unit";
            this.showIsRenter = AppConfig.appShortName === "condo" || AppConfig.appShortName === "hoa";
            this.shouldShowHomePicker = AppConfig.appShortName !== "pta";
            this.showKansasPtaExport = AppConfig.appShortName === "pta" && this.siteInfo.privateSiteInfo.groupAddress.state === "KS";
            this.showEmailSettings = !this.siteInfo.privateSiteInfo.isEmailSendingRestricted;
            this.memberTypeLabel = AppConfig.memberTypeLabel;
            this.showLaunchSite = AppConfig.appShortName !== "pta";
            this.showPendingMembers = AppConfig.appShortName === "pta";
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
            this.boardPositions = [
                { id: 0, name: "None" },
                { id: 1, name: "President" },
                { id: 2, name: "Treasurer" },
                { id: 4, name: "Secretary" },
                { id: 8, name: "Director/Trustee" },
                { id: 16, name: "Vice President" },
                { id: 32, name: "Property Manager" }
            ];
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
            var innerThis = this;
            this.residentGridOptions =
                {
                    data: [],
                    columnDefs: [
                        { field: 'firstName', displayName: 'First Name', cellClass: "resident-cell-first" },
                        { field: 'lastName', displayName: 'Last Name', cellClass: "resident-cell-last" },
                        { field: 'email', displayName: 'E-mail', cellTemplate: '<div class="ui-grid-cell-contents" ng-class="col.colIndex()"><span ng-cell-text class="resident-cell-email" data-ng-style="{ \'color\': row.entity.postmarkReportedBadEmailUtc ? \'#F00\' : \'auto\' }">{{ row.entity.email }}</span></div>' },
                        { field: 'phoneNumber', displayName: 'Phone Number', width: 150, cellClass: "resident-cell-phone", cellTemplate: '<div class="ui-grid-cell-contents" ng-class="col.colIndex()"><span ng-cell-text>{{ row.entity.phoneNumber | tel }}</span></div>' },
                        {
                            field: 'unitGridLabel',
                            displayName: AppConfig.appShortName === 'condo' ? 'Unit' : 'Residence',
                            cellClass: "resident-cell-unit",
                            width: homeColumnWidth,
                            visible: AppConfig.isChtnSite,
                            sortingAlgorithm: function (a, b) { return a.toString().localeCompare(b.toString()); }
                        },
                        {
                            field: 'isRenter',
                            displayName: 'Renter',
                            width: 80,
                            cellClass: "resident-cell-is-renter",
                            visible: this.showIsRenter,
                            cellTemplate: '<div class="ui-grid-cell-contents" style="text-align:center; padding-top: 8px;"><input type="checkbox" disabled="disabled" data-ng-checked="row.entity.isRenter"></div>'
                        },
                        { field: 'boardPosition', displayName: 'Board', width: 125, cellClass: "resident-cell-board", cellTemplate: '<div class="ui-grid-cell-contents" ng-class="col.colIndex()"><span ng-cell-text>{{ grid.appScope.$ctrl.getBoardPositionName(row.entity.boardPosition) }}</span></div>' },
                        { field: 'isSiteManager', displayName: 'Admin', width: 80, cellClass: "resident-cell-site-manager", cellTemplate: '<div class="ui-grid-cell-contents" style="text-align:center; padding-top: 8px;"><input type="checkbox" disabled="disabled" data-ng-checked="row.entity.isSiteManager"></div>' }
                    ],
                    multiSelect: false,
                    enableSorting: true,
                    enableHorizontalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableFullRowSelection: true,
                    enableColumnMenus: false,
                    enableRowHeaderSelection: false,
                    onRegisterApi: function (gridApi) {
                        innerThis.gridApi = gridApi;
                        gridApi.selection.on.rowSelectionChanged(innerThis.$rootScope, function (row) {
                            var msg = 'row selected ' + row.isSelected;
                            innerThis.setEdit(row.entity);
                        });
                        gridApi.core.on.sortChanged(innerThis.$rootScope, function (grid, sortColumns) {
                            if (!sortColumns || sortColumns.length === 0)
                                return;
                            // Remember the sort
                            var simpleSortInfo = { field: sortColumns[0].field, direction: sortColumns[0].sort.direction };
                            window.localStorage.setItem(LocalKey_ResidentSort, JSON.stringify(simpleSortInfo));
                        });
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
            this.pendingMemberGridOptions =
                {
                    data: [],
                    columnDefs: [
                        { field: 'firstName', displayName: 'First Name' },
                        { field: 'lastName', displayName: 'Last Name' },
                        { field: 'email', displayName: 'E-mail' },
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
                        innerThis.pendingMemberGridApi = gridApi;
                        gridApi.selection.on.rowSelectionChanged(innerThis.$rootScope, function (row) {
                            innerThis.selectPendingMember(row.entity);
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
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
            this.refresh()
                .then(function () { return _this.loadSettings(); })
                .then(function () {
                if (AppConfig.appShortName === "pta")
                    _this.loadPendingMembers();
            });
        };
        ManageResidentsController.prototype.getBoardPositionName = function (boardValue) {
            if (!boardValue)
                return "";
            var boardPosition = jQuery.grep(this.boardPositions, function (pos, i) { return pos.id === boardValue; })[0];
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
            //this.residentGridOptions.selectAll( false );
            this.gridApi.selection.clearSelectedRows();
            setTimeout("$( '#edit-user-first-text-box' ).focus();", 100);
        };
        /**
         * Send a resident the welcome e-mail
         */
        ManageResidentsController.prototype.onSendWelcome = function () {
            this.isSavingUser = true;
            var innerThis = this;
            this.$http.put("/api/Residents/" + this.editUser.userId + "/SendWelcome", null).success(function () {
                innerThis.isSavingUser = false;
                innerThis.sentWelcomeEmail = true;
            }).error(function () {
                innerThis.isSavingUser = false;
                alert("Failed to send the welcome e-mail, please contact support if this problem persists.");
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
        ManageResidentsController.prototype.refresh = function () {
            this.isLoading = true;
            var innerThis = this;
            return this.$http.get("/api/Residents").success(function (residentArray) {
                innerThis.isLoading = false;
                innerThis.residentGridOptions.data = residentArray;
                innerThis.residentGridOptions.minRowsToShow = residentArray.length;
                innerThis.residentGridOptions.virtualizationThreshold = residentArray.length;
                innerThis.hasOneAdmin = _.filter(residentArray, function (r) { return r.isSiteManager; }).length === 1 && residentArray.length > 1;
                //this.gridApi.grid.notifyDataChange( uiGridConstants.dataChange.ALL );
                // If we have sort info to use
                if (innerThis.residentSortInfo) {
                    var sortColumn = _.find(innerThis.gridApi.grid.columns, function (col) { return col.field === innerThis.residentSortInfo.field; });
                    if (sortColumn)
                        innerThis.gridApi.grid.sortColumn(sortColumn, innerThis.residentSortInfo.direction, false);
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
                innerThis.populateGridUnitLabels();
                if (!innerThis.allUnits && AppConfig.isChtnSite) {
                    innerThis.isLoading = true;
                    innerThis.$http.get("/api/Unit").then(function (httpResponse) {
                        innerThis.isLoading = false;
                        innerThis.allUnits = httpResponse.data;
                        // If we have a lot of units then allow searching
                        innerThis.multiselectOptions = innerThis.allUnits.length > 20 ? "filter" : "";
                    }, function () {
                        innerThis.isLoading = false;
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
            if (!this.editUser.showAdvancedHomePicker)
                this.editUser.units = [{ unitId: this.editUser.singleUnitId, name: null, memberHomeId: null, userId: this.editUser.userId, isRenter: null }];
            this.isSavingUser = true;
            var innerThis = this;
            var onSave = function (response) {
                innerThis.isSavingUser = false;
                if (typeof (response.data.errorMessage) === "string") {
                    alert("Failed to add resident: " + response.data.errorMessage);
                    return;
                }
                if (innerThis.editUser.pendingMemberId)
                    innerThis.loadPendingMembers();
                innerThis.editUser = null;
                innerThis.refresh();
            };
            var isAddingNew = false;
            var onError = function (response) {
                innerThis.isSavingUser = false;
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
            else {
                isAddingNew = false;
                analytics.track("editResident");
                this.$http.put("/api/Residents", this.editUser).then(onSave, onError);
            }
            // Update the fellow residents page next time we're there
            this.fellowResidents.clearResidentCache();
        };
        /**
         * Occurs when the user presses the button to set a user's password
         */
        ManageResidentsController.prototype.OnAdminSetPassword = function () {
            var setPass = {
                userName: this.adminSetPass_Username,
                password: this.adminSetPass_Password
            };
            var innerThis = this;
            this.$http.post("/api/AdminHelper/SetPassword", setPass).success(function (resultMessage) {
                innerThis.adminSetPass_ResultMessage = resultMessage;
            }).error(function (data) {
                var errorMessage = data.exceptionMessage ? data.exceptionMessage : data;
                alert("Failed to set password: " + errorMessage);
            });
        };
        /**
         * Load the resident settings
         */
        ManageResidentsController.prototype.loadSettings = function () {
            var _this = this;
            this.isLoadingSettings = true;
            var innerThis = this;
            this.$http.get("/api/Settings").success(function (data) {
                innerThis.isLoadingSettings = false;
                _this.residentSettings = data;
            }).error(function (exc) {
                innerThis.isLoadingSettings = false;
                console.log("Failed to retrieve settings");
            });
        };
        /**
         * Export the resident list as a CSV
         */
        ManageResidentsController.prototype.exportResidentCsv = function () {
            if (typeof (analytics) !== "undefined")
                analytics.track('exportResidentCsv');
            var innerThis = this;
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
                    headerText: "Phone",
                    fieldName: "phoneNumber"
                },
                {
                    headerText: "E-mail",
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
                    dataMapper: function (value) {
                        return innerThis.getBoardPositionName(value);
                    }
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
            csvDataString = "data:text/csv;charset=utf-8," + csvDataString;
            var encodedUri = encodeURI(csvDataString);
            // Works, but can't set the file name
            //window.open( encodedUri );
            var csvLink = document.createElement("a");
            csvLink.setAttribute("href", encodedUri);
            csvLink.setAttribute("download", "Residents.csv");
            document.body.appendChild(csvLink); // Required for FF
            csvLink.click(); // This will download the data file named "my_data.csv"
            setTimeout(function () { document.body.removeChild(csvLink); }, 500);
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
            var innerThis = this;
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
            setTimeout(function () { document.body.removeChild(csvLink); }, 500);
        };
        /**
         * Save the resident settings to the server
         */
        ManageResidentsController.prototype.saveResidentSettings = function () {
            analytics.track("editResidentSettings");
            this.isLoadingSettings = true;
            var innerThis = this;
            this.$http.put("/api/Settings", this.residentSettings).success(function () {
                innerThis.isLoadingSettings = false;
                // Update the fellow residents page next time we're there
                innerThis.fellowResidents.clearResidentCache();
                innerThis.siteInfo.privateSiteInfo.canHideContactInfo = innerThis.residentSettings.canHideContactInfo;
            }).error(function () {
                innerThis.isLoadingSettings = false;
                alert("Failed to update settings, please try again or contact support.");
            });
        };
        /**
         * Occurs when the user presses the button to delete a resident
         */
        ManageResidentsController.prototype.onDeleteResident = function () {
            if (!confirm("Are you sure you want to remove this person from your building?"))
                return;
            if (this.siteInfo.userInfo.userId === this.editUser.userId) {
                if (!confirm("If you remove your own account you won't be able to login anymore. Are you still sure?"))
                    return;
            }
            this.isSavingUser = true;
            var innerThis = this;
            this.$http.delete("/api/Residents?userId=" + this.editUser.userId).success(function () {
                innerThis.isSavingUser = false;
                innerThis.editUser = null;
                // Update the fellow residents page next time we're there
                innerThis.fellowResidents.clearResidentCache();
                innerThis.refresh();
            }).error(function () {
                alert("Failed to remove the resident. Please let support know if this continues to happen.");
                innerThis.isSavingUser = false;
                innerThis.editUser = null;
            });
        };
        /**
         * Occurs when the user presses the button to reset everyone's password
         */
        ManageResidentsController.prototype.onSendAllWelcome = function () {
            if (!confirm("This will e-mail all of the residents in your association. Do you want to proceed?"))
                return;
            this.isLoading = true;
            var innerThis = this;
            this.$http.put("/api/Residents?userId&action=launchsite", null).success(function (data) {
                innerThis.isLoading = false;
                innerThis.sentWelcomeEmail = true;
                innerThis.allEmailsSent = true;
            }).error(function () {
                innerThis.isLoading = false;
                alert("Failed to send welcome e-mail, please contact support if this problem persists.");
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
            var _loop_1 = function () {
                var curRow = bulkRows[i];
                while (curRow.length < 7)
                    curRow.push("");
                // Skip the header row, if there is one
                if (curRow[0] === "unit name" && curRow[1] === "e-mail address" && curRow[2] === "first name")
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
                    csvTestName: ""
                };
                if (HtmlUtil.isNullOrWhitespace(newRow.unitName))
                    newRow.unitId = null;
                else {
                    newRow.csvTestName = simplifyStreetName(newRow.unitName);
                    unit = _.find(this_1.allUnits, function (u) { return u.csvTestName === newRow.csvTestName; });
                    if (unit)
                        newRow.unitId = unit.unitId;
                    else
                        newRow.unitId = undefined;
                }
                // If this row contains two people
                var spouseRow = null;
                if (newRow.firstName && newRow.firstName.toLowerCase().indexOf(" and ") !== -1) {
                    spouseRow = _.clone(newRow);
                    splitFirst = newRow.firstName.split(" and ");
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
            var this_1 = this, unit, splitFirst;
            for (var i = 0; i < bulkRows.length; ++i) {
                _loop_1();
            }
        };
        /**
         * Submit the bulk creation rows to the server
         */
        ManageResidentsController.prototype.submitBulkRows = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/Residents/BulkLoad", this.bulkImportRows).success(function () {
                innerThis.isLoading = false;
                innerThis.bulkImportRows = [{}];
                innerThis.bulkImportCsv = "";
                alert("Success");
            }).error(function () {
                innerThis.isLoading = false;
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
                csvTestName: undefined
            };
            // Try to step to the next unit
            if (this.allUnits) {
                if (this.bulkImportRows.length > 0) {
                    var lastUnitId = this.bulkImportRows[this.bulkImportRows.length - 1].unitId;
                    var lastUnitIndex = _.findIndex(this.allUnits, function (u) { return u.unitId === lastUnitId; });
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
         * Display the list of recent e-mails
         */
        ManageResidentsController.prototype.toggleEmailHistoryVisible = function () {
            var _this = this;
            this.showEmailHistory = !this.showEmailHistory;
            if (this.showEmailHistory && !this.emailHistoryGridOptions.data) {
                this.isLoadingSettings = true;
                this.$http.get("/api/Email/RecentGroupEmails").then(function (response) {
                    _this.isLoadingSettings = false;
                    _this.emailHistoryGridOptions.data = response.data;
                }, function (response) {
                    _this.isLoadingSettings = false;
                    alert("Failed to load e-mails: " + response.data.exceptionMessage);
                });
            }
        };
        ManageResidentsController.$inject = ["$http", "$rootScope", "$interval", "fellowResidents", "uiGridConstants", "SiteInfo"];
        return ManageResidentsController;
    }());
    Ally.ManageResidentsController = ManageResidentsController;
})(Ally || (Ally = {}));
CA.angularApp.component("manageResidents", {
    templateUrl: "/ngApp/chtn/manager/manage-residents.html",
    controller: Ally.ManageResidentsController
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
        function ChtnSettingsController($http, siteInfo, $timeout, $scope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.$scope = $scope;
            this.settings = new ChtnSiteSettings();
            this.originalSettings = new ChtnSiteSettings();
            this.showRightColumnSetting = true;
            this.showLocalNewsSetting = false;
            this.isPta = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        ChtnSettingsController.prototype.$onInit = function () {
            var _this = this;
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
            });
        };
        /**
         * Clear the login image
         */
        ChtnSettingsController.prototype.removeLoginImage = function () {
            analytics.track("clearLoginImage");
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/Settings/ClearLoginImage").then(function () {
                innerThis.isLoading = false;
                innerThis.siteInfo.publicSiteInfo.loginImageUrl = "";
                innerThis.loginImageUrl = "";
            }, function (httpResponse) {
                innerThis.isLoading = false;
                alert("Failed to remove loading image: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Save all of the settings
         */
        ChtnSettingsController.prototype.saveAllSettings = function () {
            var _this = this;
            analytics.track("editSettings");
            this.isLoading = true;
            this.$http.put("/api/Settings", this.settings).then(function () {
                _this.isLoading = false;
                // Update the locally-stored values
                _this.siteInfo.privateSiteInfo.homeRightColumnType = _this.settings.homeRightColumnType;
                _this.siteInfo.privateSiteInfo.welcomeMessage = _this.settings.welcomeMessage;
                _this.siteInfo.privateSiteInfo.ptaUnitId = _this.settings.ptaUnitId;
                _this.siteInfo.privateSiteInfo.homeRightColumnType = _this.settings.homeRightColumnType;
                var didChangeFullName = _this.settings.fullName !== _this.originalSettings.fullName;
                // Reload the page to show the page title has changed
                if (didChangeFullName)
                    location.reload();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to save: " + response.data);
            });
        };
        /**
         * Occurs when the user clicks a new background image
         */
        ChtnSettingsController.prototype.onImageClick = function (bgImage) {
            var _this = this;
            this.settings.bgImageFileName = bgImage;
            //SettingsJS._defaultBG = bgImage;
            var innerThis = this;
            this.$http.put("/api/Settings", { BGImageFileName: this.settings.bgImageFileName }).then(function () {
                $(".test-bg-image").removeClass("test-bg-image-selected");
                //$( "img[src='" + $rootScope.bgImagePath + bgImage + "']" ).addClass( "test-bg-image-selected" );
                innerThis.isLoading = false;
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
         * Hooked up the login image JQuery upload control
         */
        ChtnSettingsController.prototype.hookUpLoginImageUpload = function () {
            var innerThis = this;
            $(function () {
                $('#JQLoginImageFileUploader').fileupload({
                    autoUpload: true,
                    add: function (e, data) {
                        innerThis.$scope.$apply(function () {
                            innerThis.isLoading = true;
                        });
                        analytics.track("setLoginImage");
                        $("#FileUploadProgressContainer").show();
                        data.url = "api/DocumentUpload/LoginImage?ApiAuthToken=" + innerThis.siteInfo.authToken;
                        var xhr = data.submit();
                        xhr.done(function (result) {
                            innerThis.$scope.$apply(function () {
                                innerThis.isLoading = false;
                                innerThis.loginImageUrl = result.newUrl + "?cacheBreaker=" + new Date().getTime();
                                innerThis.siteInfo.publicSiteInfo.loginImageUrl = innerThis.loginImageUrl;
                            });
                            $("#FileUploadProgressContainer").hide();
                        });
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
        ChtnSettingsController.$inject = ["$http", "SiteInfo", "$timeout", "$scope"];
        return ChtnSettingsController;
    }());
    Ally.ChtnSettingsController = ChtnSettingsController;
})(Ally || (Ally = {}));
CA.angularApp.component("chtnSettings", {
    templateUrl: "/ngApp/chtn/manager/settings.html",
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
        function ChtnHomeController($http, $rootScope, siteInfo, $timeout, $scope) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.$scope = $scope;
            this.showDiscussionThreads = false;
            this.showLocalNews = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ChtnHomeController.prototype.$onInit = function () {
            var _this = this;
            this.welcomeMessage = this.siteInfo.privateSiteInfo.welcomeMessage;
            this.canMakePayment = this.siteInfo.privateSiteInfo.isPaymentEnabled && !this.siteInfo.userInfo.isRenter;
            this.isFirstVisit = this.siteInfo.userInfo.lastLoginDateUtc === null;
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.showFirstVisitModal = this.isFirstVisit && !this.$rootScope.hasClosedFirstVisitModal && this.siteInfo.privateSiteInfo.siteLaunchedDateUtc === null;
            this.allyAppName = AppConfig.appName;
            this.homeRightColumnType = this.siteInfo.privateSiteInfo.homeRightColumnType;
            if (!this.homeRightColumnType && this.homeRightColumnType !== "")
                this.homeRightColumnType = "localnews";
            if (this.siteInfo.privateSiteInfo.creationDate > Ally.SiteInfoService.AlwaysDiscussDate) {
                this.showDiscussionThreads = true;
                this.showLocalNews = this.homeRightColumnType.indexOf("localnews") !== -1;
            }
            else {
                this.showDiscussionThreads = this.homeRightColumnType === "chatwall";
                this.showLocalNews = this.homeRightColumnType === "localnews";
            }
            var subDomain = HtmlUtil.getSubdomain(window.location.host);
            var innerThis = this;
            this.$scope.$on("homeHasActivePolls", function () { return innerThis.shouldShowAlertSection = true; });
            this.$http.get("/api/Committee/MyCommittees", { cache: true }).then(function (response) {
                _this.usersCommittees = response.data;
                if (_this.usersCommittees)
                    _this.usersCommittees = _.sortBy(_this.usersCommittees, function (c) { return c.name.toLowerCase(); });
            });
        };
        ChtnHomeController.prototype.hideFirstVisit = function () {
            this.$rootScope.hasClosedFirstVisitModal = true;
            this.showFirstVisitModal = false;
        };
        ChtnHomeController.$inject = ["$http", "$rootScope", "SiteInfo", "$timeout", "$scope"];
        return ChtnHomeController;
    }());
    Ally.ChtnHomeController = ChtnHomeController;
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
            if (this.siteInfo.publicSiteInfo.googleGpsPosition) {
                var TwentyFiveMilesInMeters = 40234;
                var latLon = {
                    lat: 41.142248,
                    lng: -73.633228
                };
                var circle = new google.maps.Circle({
                    center: this.siteInfo.publicSiteInfo.googleGpsPosition,
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
            if (AppConfig.appShortName === "hoa")
                this.retrieveHoaHomes();
            else
                this.refresh();
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
                _this.hoaHomes = httpResponse.data;
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
        MapCtrlMapMgr._homeGpsPos = siteInfo.publicSiteInfo.googleGpsPosition;
        MapCtrlMapMgr._groupGpsBounds = siteInfo.publicSiteInfo.gpsBounds;
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
            if (AppConfig.appShortName === "hoa" && tempMarker.unitId) {
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
            this.isLoading = true;
            // Retrieve information for the current association
            var innerThis = this;
            this.$http.post("/api/Login/Forgot", this.loginInfo).then(function () {
                innerThis.shouldHideControls = true;
                innerThis.isLoading = false;
                innerThis.resultText = "Please check your e-mail for updated login information.";
                innerThis.resultTextColor = "#00F";
            }, function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.resultText = "Failed to process your request: " + httpResponse.data;
                innerThis.resultTextColor = "#F00";
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
        function GroupMembersController(fellowResidents, siteInfo, appCacheService) {
            this.fellowResidents = fellowResidents;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.isLoading = true;
            this.emailLists = [];
            this.unitPrefix = "Unit ";
            this.groupEmailDomain = "";
            this.allyAppName = AppConfig.appName;
            this.groupShortName = HtmlUtil.getSubdomain();
            this.showMemberList = AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club" || AppConfig.appShortName === "pta";
            this.groupEmailDomain = "inmail." + AppConfig.baseTld;
            this.unitPrefix = AppConfig.appShortName === "condo" ? "Unit " : "";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        GroupMembersController.prototype.$onInit = function () {
            var _this = this;
            this.fellowResidents.getByUnitsAndResidents().then(function (data) {
                _this.isLoading = false;
                _this.unitList = data.byUnit;
                _this.allResidents = data.residents;
                _this.committees = data.committees;
                if (!_this.allResidents && data.ptaMembers)
                    _this.allResidents = data.ptaMembers;
                // Sort by last name
                _this.allResidents = _.sortBy(_this.allResidents, function (r) { return r.lastName; });
                _this.boardMembers = _.filter(_this.allResidents, function (r) { return r.boardPosition !== 0; });
                _this.boardMessageRecipient = null;
                if (_this.boardMembers.length > 0) {
                    var hasBoardEmail = _.some(_this.boardMembers, function (m) { return m.hasEmail; });
                    if (hasBoardEmail) {
                        _this.boardMessageRecipient = {
                            fullName: "Entire Board",
                            firstName: "everyone on the board",
                            hasEmail: true,
                            userId: "af615460-d92f-4878-9dfa-d5e4a9b1f488"
                        };
                    }
                }
                // Remove board members from the member list
                if (AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club")
                    _this.allResidents = _.filter(_this.allResidents, function (r) { return r.boardPosition === 0; });
                var boardPositionNames = [
                    { id: 0, name: "None" },
                    { id: 1, name: "President" },
                    { id: 2, name: "Treasurer" },
                    { id: 4, name: "Secretary" },
                    { id: 8, name: "Director" },
                    { id: 16, name: "Vice President" },
                    { id: 32, name: "Property Manager" }
                ];
                for (var i = 0; i < _this.boardMembers.length; ++i) {
                    _this.boardMembers[i].boardPositionName = _.find(boardPositionNames, function (bm) { return bm.id === _this.boardMembers[i].boardPosition; }).name;
                }
                var boardSortOrder = [
                    1,
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
                if (_this.unitList && _this.unitList.length > 0) {
                    var useNumericNames = _.every(_this.unitList, function (u) { return HtmlUtil.isNumericString(u.name); });
                    if (useNumericNames)
                        _this.unitList = _.sortBy(_this.unitList, function (u) { return +u.name; });
                    else {
                        var firstSuffix = _this.unitList[0].name.substr(_this.unitList[0].name.indexOf(" "));
                        var allHaveSameSuffix = _.every(_this.unitList, function (u) { return HtmlUtil.endsWith(u.name, firstSuffix); });
                        if (allHaveSameSuffix) {
                            _this.unitList = _.sortBy(_this.unitList, function (u) { return parseInt(u.name.substr(0, u.name.indexOf(" "))); });
                        }
                    }
                }
                if (_this.committees) {
                    // Only show commitees with a contact person
                    //TWC - 10/19/18 - Show committees even without a contact person
                    //this.committees = _.reject( this.committees, c => !c.contactUser );
                    _this.committees = _.sortBy(_this.committees, function (c) { return c.committeeName.toLowerCase(); });
                }
                // If we should scroll to a specific home
                var scrollToUnitId = _this.appCacheService.getAndClear("scrollToUnitId");
                if (scrollToUnitId) {
                    var scrollToElemId = "unit-id-" + scrollToUnitId;
                    setTimeout(function () { return document.getElementById(scrollToElemId).scrollIntoView(); }, 300);
                }
                // Populate the e-mail name lists
                _this.setupGroupEmails();
            });
        };
        GroupMembersController.prototype.setupGroupEmails = function () {
            var _this = this;
            this.hasMissingEmails = _.some(this.allResidents, function (r) { return !r.hasEmail; });
            var innerThis = this;
            this.fellowResidents.getGroupEmailObject().then(function (emailLists) {
                _this.emailLists = emailLists;
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
            });
        };
        GroupMembersController.$inject = ["fellowResidents", "SiteInfo", "appCacheService"];
        return GroupMembersController;
    }());
    Ally.GroupMembersController = GroupMembersController;
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
    templateUrl: "/ngApp/chtn/member/Help.html",
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
        function LogbookController($scope, $timeout, $http, $rootScope, $q, fellowResidents) {
            this.$scope = $scope;
            this.$timeout = $timeout;
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.$q = $q;
            this.fellowResidents = fellowResidents;
            this.showBadNotificationDateWarning = false;
            this.isLoadingNews = false;
            this.isLoadingLogbookForCalendar = false;
            this.isLoadingPolls = false;
            this.isLoadingCalendarEvents = false;
            this.onlyRefreshCalendarEvents = false;
            this.showExpandedCalendarEventModel = false;
            ///////////////////////////////////////////////////////////////////////////////////////////////
            // Occurs when the user clicks a user in the calendar event modal
            ///////////////////////////////////////////////////////////////////////////////////////////////
            this.onResidentClicked = function (resident) {
                if (!resident.hasEmail) {
                    alert("That user cannot be included because they do not have an e-mail address on file.");
                    resident.isAssociated = false;
                    return;
                }
                var alreadyExists = _.contains(this.editEvent.associatedUserIds, resident.userId);
                if (alreadyExists)
                    this.editEvent.associatedUserIds = _.without(this.editEvent.associatedUserIds, resident.userId);
                else
                    this.editEvent.associatedUserIds.push(resident.userId);
            };
            ///////////////////////////////////////////////////////////////////////////////////////////////
            // Hide the read-only calendar event view
            ///////////////////////////////////////////////////////////////////////////////////////////////
            this.clearViewEvent = function () {
                this.viewEvent = null;
            };
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        LogbookController.prototype.$onInit = function () {
            var _this = this;
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
                            else
                                innerThis.viewEvent = event.calendarEventObject;
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
        };
        LogbookController.prototype.getAllEvents = function (startDate, endDate) {
            var _this = this;
            var loadNewsToCalendar = false;
            var loadLogbookToCalendar = true;
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
                var innerThis = this;
                this.$http.get("/api/News?startDate=" + firstDay + "&endDate=" + lastDay).then(function (httpResponse) {
                    var data = httpResponse.data;
                    innerThis.isLoadingNews = false;
                    _.each(data, function (entry) {
                        var shortText = entry.text;
                        if (shortText.length > 10)
                            shortText = shortText.substring(0, 10) + "...";
                        var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.text + "</p>";
                        innerThis.calendarEvents.push({
                            title: "Notice: " + shortText,
                            start: moment(entry.postDate).format("YYYY-MM-DD"),
                            toolTipTitle: "Notice Added",
                            fullDescription: fullDescription
                        });
                    });
                    newsDeferred.resolve();
                }, function () {
                    innerThis.isLoadingNews = false;
                    newsDeferred.resolve();
                });
            }
            else
                newsDeferred.resolve();
            if (loadLogbookToCalendar) {
                this.isLoadingLogbookForCalendar = true;
                var innerThis = this;
                this.$http.get("/api/Logbook?startDate=" + firstDay + "&endDate=" + lastDay).then(function (httpResponse) {
                    var data = httpResponse.data;
                    innerThis.isLoadingLogbookForCalendar = false;
                    _.each(data, function (entry) {
                        var shortText = entry.text;
                        if (shortText.length > 10)
                            shortText = shortText.substring(0, 10) + "...";
                        var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.text + "</p>";
                        innerThis.calendarEvents.push({
                            title: "Logbook: " + shortText,
                            start: moment(entry.postDate).format("YYYY-MM-DD"),
                            toolTipTitle: "Logbook Entry Added",
                            fullDescription: fullDescription
                        });
                    });
                    logbookDeferred.resolve();
                }, function () {
                    innerThis.isLoadingLogbookForCalendar = false;
                    logbookDeferred.resolve();
                });
            }
            else
                logbookDeferred.resolve();
            if (loadPollsToCalendar) {
                this.isLoadingPolls = true;
                this.$http.get("/api/Poll?startDate=" + firstDay + "&endDate=" + lastDay).then(function (httpResponse) {
                    var data = httpResponse.data;
                    _this.isLoadingPolls = false;
                    _.each(data, function (entry) {
                        var shortText = entry.text;
                        if (shortText.length > 10)
                            shortText = shortText.substring(0, 10) + "...";
                        var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.text + "</p>";
                        _this.calendarEvents.push({
                            title: "Poll: " + shortText,
                            start: moment(entry.postDate).format("YYYY-MM-DD"),
                            toolTipTitle: "Poll Added",
                            fullDescription: fullDescription
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
            if (this.onlyRefreshCalendarEvents) {
                this.onlyRefreshCalendarEvents = undefined;
                callback(this.calendarEvents);
                return;
            }
            this.calendarEvents = [];
            var innerThis = this;
            this.getAllEvents(start, end).then(function () {
                callback(innerThis.calendarEvents);
            });
        };
        LogbookController.prototype.getCalendarEvents = function (start, end, timezone, callback) {
            this.isLoadingCalendarEvents = true;
            var firstDay = start.format(LogbookController.DateFormat);
            var lastDay = end.format(LogbookController.DateFormat);
            var innerThis = this;
            this.$http.get("/api/CalendarEvent?startDate=" + firstDay + "&endDate=" + lastDay).then(function (httpResponse) {
                var data = httpResponse.data;
                var associationEvents = [];
                innerThis.isLoadingCalendarEvents = false;
                _.each(data, function (entry) {
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
                        //title: "Event: " + shortText,
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
                innerThis.isLoadingCalendarEvents = false;
            });
        };
        LogbookController.prototype.isUserAssociated = function (userId) {
            if (this.editEvent && this.editEvent.associatedUserIds)
                return _.contains(this.editEvent.associatedUserIds, userId);
            return false;
        };
        LogbookController.prototype.isDateInPast = function (date) {
            var momentDate = moment(date);
            var today = moment();
            return momentDate.isBefore(today, 'day') || momentDate.isSame(today, 'day');
        };
        LogbookController.prototype.onShouldSendChange = function () {
            // Don't allow the user to send remdiner e-mails for past dates
            if (this.editEvent.shouldSendNotification && this.isDateInPast(this.editEvent.dateOnly))
                this.editEvent.shouldSendNotification = false;
        };
        LogbookController.prototype.onChangeEmailDaysBefore = function () {
            var notificationDate = moment(this.editEvent.dateOnly).subtract(this.editEvent.notificationEmailDaysBefore, 'day');
            var today = moment();
            this.showBadNotificationDateWarning = notificationDate.isBefore(today, 'day') || notificationDate.isSame(today, 'day');
            if (this.showBadNotificationDateWarning) {
                this.maxDaysBack = moment(this.editEvent.dateOnly).diff(today, 'day');
                this.editEvent.notificationEmailDaysBefore = this.maxDaysBack;
                var innerThis = this;
                this.$timeout(function () { innerThis.showBadNotificationDateWarning = false; }, 10000);
            }
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Show the full calendar event edit modal
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LogbookController.prototype.expandCalendarEventModel = function () {
            this.showExpandedCalendarEventModel = true;
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
                if (this.residents)
                    _.each(this.residents, function (r) { return r.isAssociated = _this.isUserAssociated(r.userId); });
                this.editEvent.shouldSendNotification = this.editEvent.notificationEmailDaysBefore !== null;
                // Set focus on the title so it's user friendly and ng-escape needs an input focused
                // to work
                setTimeout(function () { $("#calendar-event-title").focus(); }, 10);
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
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Save the calendar event that's being viewed
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LogbookController.prototype.saveCalendarEvent = function () {
            var _this = this;
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
        ;
        LogbookController.$inject = ["$scope", "$timeout", "$http", "$rootScope", "$q", "fellowResidents"];
        LogbookController.DateFormat = "YYYY-MM-DD";
        LogbookController.TimeFormat = "h:mma";
        LogbookController.NoTime = "12:37am";
        return LogbookController;
    }());
    Ally.LogbookController = LogbookController;
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
            this.loginImageUrl = this.siteInfo.publicSiteInfo.loginImageUrl;
            this.sectionStyle = {
                position: "relative"
            };
            if (!this.isDemoSite) {
                //this.sectionStyle["left"] = "50%";
                if (this.loginImageUrl) {
                    this.sectionStyle["max-width"] = "760px";
                    this.sectionStyle["margin-left"] = "auto";
                    this.sectionStyle["margin-right"] = "auto";
                    //this.sectionStyle["margin-left"] = "-380px";
                }
                else {
                    this.sectionStyle["max-width"] = "500px";
                    this.sectionStyle["margin-left"] = "auto";
                    this.sectionStyle["margin-right"] = "auto";
                    //this.sectionStyle["max-width"] = "450px";
                    //this.sectionStyle["margin-left"] = "-225px";
                }
            }
            // If we got sent here for a 403, but the user was already logged in
            if (this.appCacheService.getAndClear(this.appCacheService.Key_WasLoggedIn403) === "true") {
                if (this.$rootScope.isSiteManager)
                    this.loginResult = "You are not authorized to perform that action. Please contact support.";
                else
                    this.loginResult = "You are not authorized to perform that action. Please contact an admin.";
            }
            else if (this.appCacheService.getAndClear(this.appCacheService.Key_WasLoggedIn401) === "true")
                this.loginResult = "Please login first.";
            // Focus on the e-mail text box
            setTimeout(function () {
                $("#login-email-textbox").focus();
            }, 200);
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
                var redirectPath = innerThis.appCacheService.getAndClear(innerThis.appCacheService.Key_AfterLoginRedirect);
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
                if (data.siteInfo.userInfo.acceptedTermsDate === null && !innerThis.isDemoSite)
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
                    beforeSend: function (xhr, data) {
                        xhr.setRequestHeader("Authorization", "Bearer " + _this.siteInfo.authToken);
                    },
                    add: function (e, data) {
                        data.url = "api/DocumentUpload/ProfileImage?ApiAuthToken=" + _this.siteInfo.authToken;
                        _this.$scope.$apply(function () { return _this.isLoading = true; });
                        var xhr = data.submit();
                        xhr.done(function (result) {
                            _this.$scope.$apply(function () {
                                // Reload the page to see the changes
                                window.location.reload();
                            });
                        });
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
                // Don't show empty e-mail address
                if (HtmlUtil.endsWith(_this.profileInfo.email, "@condoally.com"))
                    _this.profileInfo.email = "";
                _this.needsToAcceptTerms = _this.profileInfo.acceptedTermsDate === null && !_this.isDemoSite;
                _this.hasAcceptedTerms = !_this.needsToAcceptTerms; // Gets set by the checkbox
                _this.$rootScope.hideMenu = _this.needsToAcceptTerms;
                // Was used before, here for covenience
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
                _this.resultMessage = "Your changes have been saved.";
                // $rootScope.hideMenu is true when this is the user's first login
                if (_this.$rootScope.hideMenu) {
                    _this.$rootScope.hideMenu = false;
                    _this.$location.path("/Home");
                }
                _this.isLoading = false;
            }, function (httpResponse) {
                _this.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            });
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
                }
            };
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        CondoSignUpWizardController.prototype.$onInit = function () {
            var innerThis = this;
            var onReady = function () {
                innerThis.init();
            };
            this.$timeout(onReady, 500);
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
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/SignUpWizard", this.signUpInfo).then(function (httpResponse) {
                innerThis.isLoading = false;
                var signUpResult = httpResponse.data;
                // If the was an error creating the site
                if (!HtmlUtil.isNullOrWhitespace(signUpResult.errorMessage)) {
                    alert("Failed to complete sign-up: " + signUpResult.errorMessage);
                    innerThis.WizardHandler.wizard().goTo(signUpResult.stepIndex);
                }
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
                    else {
                        innerThis.hideWizard = true;
                        innerThis.resultMessage = "Great work! We just sent you an e-mail with instructions on how access your new site.";
                    }
                }
            }, function (httpResponse) {
                innerThis.isLoading = false;
                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to complete sign-up: " + errorMessage);
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
     * The controller for a page that lets a user complain about group e-mail utilization
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
        };
        /**
         * Ask that
         */
        EmailAbuseController.prototype.reportAbuse = function (abuseReason) {
            // It's double encoded to prevent angular trouble, so double decode
            var idVal = decodeURIComponent(this.$routeParams.idValue);
            var postData = {
                abuseReason: abuseReason,
                idVal: idVal,
                otherReasonText: this.otherReasonText
            };
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/EmailAbuse/v3", postData).then(function () {
                innerThis.isLoading = false;
                innerThis.showButtons = false;
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
            // The default sign-up info object
            this.signUpInfo = new Ally.HoaSignUpInfo();
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        HoaSignUpWizardController.prototype.$onInit = function () {
            var _this = this;
            this.$scope.$on('wizard:stepChanged', function (event, args) {
                if (args.index === 1)
                    _this.$timeout(function () { return _this.showMap = true; }, 50);
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
                $("#suggestCondoMessageLabel").css("font-size", "1.3em").css("margin", "25px auto").fadeIn(200).fadeOut(200).fadeIn(200).fadeOut(200).fadeIn(200);
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
            this.isLoading = true;
            this.signUpInfo.boundsGpsVertices = this.hoaPoly.vertices;
            var innerThis = this;
            this.$http.post("/api/SignUpWizard/Hoa", this.signUpInfo).then(function (httpResponse) {
                innerThis.isLoading = false;
                var signUpResult = httpResponse.data;
                // If the was an error creating the site
                if (!HtmlUtil.isNullOrWhitespace(signUpResult.errorMessage)) {
                    alert("Failed to complete sign-up: " + signUpResult.errorMessage);
                    innerThis.WizardHandler.wizard().goTo(signUpResult.stepIndex);
                }
                else {
                    if (typeof (window.analytics) !== "undefined")
                        window.analytics.track("condoSignUpComplete");
                    // Log this as a conversion
                    if (typeof (window.goog_report_conversion) !== "undefined")
                        window.goog_report_conversion();
                    if (typeof (window.capterra_report_conversion) !== "undefined")
                        window.capterra_report_conversion();
                    // Or if the user created an active signUpResult
                    if (!HtmlUtil.isNullOrWhitespace(signUpResult.createUrl)) {
                        window.location.href = signUpResult.createUrl;
                    }
                    else {
                        innerThis.hideWizard = true;
                        innerThis.resultMessage = "Great work! We just sent you an e-mail with instructions on how access your new site.";
                    }
                }
            }, function (httpResponse) {
                innerThis.isLoading = false;
                alert("Failed to complete sign-up: " + httpResponse.data.exceptionMessage);
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
        function NeighborSignUpController($http) {
            this.$http = $http;
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
                var addressInput = document.getElementById("address-text-box");
                new google.maps.places.Autocomplete(addressInput);
            }, 750);
        };
        /**
         * Occurs when the user clicks the button to submit their e-mail address
         */
        NeighborSignUpController.prototype.onSubmitInfo = function () {
            if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.emailAddress)) {
                alert("Please enter an e-mail address");
                return;
            }
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/NeighborSignUp/SignUpNewUser", this.signUpInfo).then(function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.resultIsError = false;
                innerThis.resultMessage = "Your information has been successfully submitted. Look for a welcome email soon.";
            }, function () {
                innerThis.isLoading = false;
                innerThis.resultIsError = true;
                innerThis.resultMessage = "There was an error submitting your information. Please try again.";
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
            var innerThis = this;
            var innerThis = this;
            this.$scope.$on('wizard:stepChanged', function (event, args) {
                if (args.index === 1)
                    innerThis.$timeout(function () { return innerThis.showMap = true; }, 50);
                else
                    innerThis.showMap = false;
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
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/SignUpWizard/TempNeighborhood", this.tempSignUpInfo).then(function () {
                innerThis.isLoading = false;
                innerThis.submitTempResult = "Thank you for your submission. We'll be in touch shortly.";
            }, function (response) {
                innerThis.isLoading = false;
                innerThis.submitTempResult = "Submission failed: " + response.data.exceptionMessage + ". Feel free to refresh the page to try again or use the contact form at the bottom of the Community Ally home page.";
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
        NeighborhoodSignUpWizardController.prototype.onFinishedWizard = function () {
            this.isLoading = true;
            this.signUpInfo.boundsGpsVertices = this.hoaPoly.vertices;
            var innerThis = this;
            this.$http.post("/api/SignUpWizard/Hoa", this.signUpInfo).then(function (httpResponse) {
                innerThis.isLoading = false;
                var signUpResult = httpResponse.data;
                // If the was an error creating the site
                if (!HtmlUtil.isNullOrWhitespace(signUpResult.errorMessage)) {
                    alert("Failed to complete sign-up: " + signUpResult.errorMessage);
                    innerThis.WizardHandler.wizard().goTo(signUpResult.stepIndex);
                }
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
                    else {
                        innerThis.hideWizard = true;
                        innerThis.resultMessage = "Great work! We just sent you an e-mail with instructions on how access your new site.";
                    }
                }
            }, function (httpResponse) {
                innerThis.isLoading = false;
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
        function CommitteeHomeController($http, $rootScope, siteInfo, $cacheFactory) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$cacheFactory = $cacheFactory;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        CommitteeHomeController.prototype.$onInit = function () {
        };
        CommitteeHomeController.$inject = ["$http", "$rootScope", "SiteInfo", "$cacheFactory"];
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
        function CommitteeMembersController($http, fellowResidents, $cacheFactory) {
            this.$http = $http;
            this.fellowResidents = fellowResidents;
            this.$cacheFactory = $cacheFactory;
            this.isLoading = false;
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
            this.$http.get("/api/Committee/" + this.committee.committeeId + "/Members").then(function (response) {
                _this.isLoading = false;
                _this.members = response.data;
                _this.members = _.sortBy(_this.members, function (m) { return (m.fullName || "").toLowerCase(); });
                var isMember = function (u) { return _.some(_this.members, function (m) { return m.userId === u.userId; }); };
                _this.filteredGroupMembers = _.filter(_this.allGroupMembers, function (m) { return !isMember(m); });
                _this.filteredGroupMembers = _.sortBy(_this.filteredGroupMembers, function (m) { return (m.fullName || "").toLowerCase(); });
                _this.contactUser = _.find(_this.members, function (m) { return m.userId == _this.committee.contactMemberUserId; });
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
        CommitteeMembersController.$inject = ["$http", "fellowResidents", "$cacheFactory"];
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
            this.canManage = this.siteInfo.userInfo.isSiteManager;
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
            var putUri = "/api/Committee/" + this.committeeId + "?newName=" + this.committee.name;
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
        function FAQsController($http, $rootScope, siteInfo, $cacheFactory) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$cacheFactory = $cacheFactory;
            this.isBodyMissing = false;
            this.isSiteManager = false;
            this.headerText = "Information and Frequently Asked Questions (FAQs)";
            this.editingInfoItem = new InfoItem();
            if (AppConfig.appShortName === "home")
                this.headerText = "Home Notes";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        FAQsController.prototype.$onInit = function () {
            this.hideDocuments = this.$rootScope["userInfo"].isRenter && !this.siteInfo.privateSiteInfo.rentersCanViewDocs;
            this.isSiteManager = this.$rootScope["isSiteManager"];
            this.retrieveInfo();
            // Hook up the rich text editor
            window.setTimeout(function () {
                var showErrorAlert = function (reason, detail) {
                    var msg = "";
                    if (reason === "unsupported-file-type")
                        msg = "Unsupported format " + detail;
                    else
                        console.log("error uploading file", reason, detail);
                    $('<div class="alert"> <button type="button" class="close" data-dismiss="alert">&times;</button>' +
                        '<strong>File upload error</strong> ' + msg + ' </div>').prependTo('#alerts');
                };
                function initToolbarBootstrapBindings() {
                    var fonts = ['Serif', 'Sans', 'Arial', 'Arial Black', 'Courier',
                        'Courier New', 'Comic Sans MS', 'Helvetica', 'Impact', 'Lucida Grande', 'Lucida Sans', 'Tahoma', 'Times',
                        'Times New Roman', 'Verdana'], fontTarget = $('[title=Font]').siblings('.dropdown-menu');
                    $.each(fonts, function (idx, fontName) {
                        fontTarget.append($('<li><a data-edit="fontName ' + fontName + '" style="font-family:\'' + fontName + '\'">' + fontName + '</a></li>'));
                    });
                    var tooltipper = $('a[title]');
                    tooltipper.tooltip({ container: 'body' });
                    $('.dropdown-menu input')
                        .click(function () { return false; })
                        .change(function () {
                        var drops = $(this).parent('.dropdown-menu').siblings('.dropdown-toggle');
                        drops.dropdown('toggle');
                    })
                        .keydown('esc', function () { this.value = ''; $(this).change(); });
                    $('[data-role=magic-overlay]').each(function () {
                        var overlay = $(this), target = $(overlay.data('target'));
                        overlay.css('opacity', 0).css('position', 'absolute').offset(target.offset()).width(target.outerWidth()).height(target.outerHeight());
                    });
                    if ("onwebkitspeechchange" in document.createElement("input")) {
                        var editorOffset = $('#editor').offset();
                        $('#voiceBtn').css('position', 'absolute').offset({ top: editorOffset.top, left: editorOffset.left + $('#editor').innerWidth() - 35 });
                    }
                    else {
                        $('#voiceBtn').hide();
                    }
                }
                ;
                initToolbarBootstrapBindings();
                var editorElem = $('#editor');
                editorElem.wysiwyg({ fileUploadError: showErrorAlert });
            }, 10);
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
            this.$http.get(this.getUri, { cache: true }).then(function (httpResponse) {
                _this.isLoadingInfo = false;
                _this.infoItems = httpResponse.data;
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
            $("#editor").html(this.editingInfoItem.body);
            // Scroll down to the editor
            window.scrollTo(0, document.body.scrollHeight);
        };
        ;
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to add a new info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        FAQsController.prototype.onSubmitItem = function () {
            this.editingInfoItem.body = $("#editor").html();
            this.isBodyMissing = HtmlUtil.isNullOrWhitespace(this.editingInfoItem.body);
            var validateable = $("#info-item-edit-form");
            validateable.validate();
            if (!validateable.valid() || this.isBodyMissing)
                return;
            if (this.committee)
                this.editingInfoItem.committeeId = this.committee.committeeId;
            this.isLoadingInfo = true;
            var innerThis = this;
            var onSave = function () {
                innerThis.isLoadingInfo = false;
                $("#editor").html("");
                innerThis.editingInfoItem = new InfoItem();
                innerThis.$cacheFactory.get('$http').remove(innerThis.getUri);
                innerThis.retrieveInfo();
            };
            var onError = function () {
                innerThis.isLoadingInfo = false;
                alert("Failed to save your information. Please try again and if this happens again contact support.");
            };
            // If we're editing an existing info item
            if (typeof (this.editingInfoItem.infoItemId) == "number")
                this.$http.put("/api/InfoItem", this.editingInfoItem).then(onSave);
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
                _this.$cacheFactory.get('$http').remove(_this.getUri);
                _this.retrieveInfo();
            });
        };
        FAQsController.$inject = ["$http", "$rootScope", "SiteInfo", "$cacheFactory"];
        return FAQsController;
    }());
    Ally.FAQsController = FAQsController;
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
                        var answers = _.groupBy(poll.responses, "answerId");
                        poll.chartData = [];
                        poll.chartLabels = [];
                        for (var answerId in answers) {
                            if (answers.hasOwnProperty(answerId)) {
                                poll.chartLabels.push(_.find(poll.answers, function (a) { return a.pollAnswerId == answerId; }).answerText);
                                poll.chartData.push(answers[answerId].length);
                                //poll.chartData.push(
                                //{
                                //    key: _.find( poll.answers, function( a ) { return a.pollAnswerId == answerId; } ).answerText,
                                //    y: answers[answerId].length
                                //} );
                            }
                        }
                        if (poll.responses && poll.responses.length < this.siteInfo.privateSiteInfo.numUnits) {
                            poll.chartLabels.push("No Response");
                            poll.chartData.push(this.siteInfo.privateSiteInfo.numUnits - poll.responses.length);
                        }
                    }
                }
            }
        };
        /**
         * Populate the polls section from the server
         */
        ActivePollsController.prototype.refreshPolls = function () {
            // Grab the polls
            this.isLoading = true;
            var innerThis = this;
            this.$http({ method: 'GET', url: '/api/Poll?getActive=1' }).
                then(function (httpResponse) {
                innerThis.isLoading = false;
                // Delay the processing a bit to help the home page load faster
                innerThis.$timeout(function () {
                    innerThis.populatePollData(httpResponse.data);
                }, 100);
            }, function () {
                innerThis.isLoading = false;
            });
        };
        /**
         * Occurs when the user selects a poll answer
         */
        ActivePollsController.prototype.onPollAnswer = function (poll, pollAnswer, writeInAnswer) {
            this.isLoading = true;
            var putUri = "/api/PollResponse?pollId=" + poll.pollId + "&answerId=" + (pollAnswer ? pollAnswer.pollAnswerId : "") + "&writeInAnswer=" + writeInAnswer;
            var innerThis = this;
            this.$http.put(putUri, null).
                then(function (httpResponse) {
                innerThis.polls = httpResponse.data;
                innerThis.isLoading = false;
                innerThis.refreshPolls();
            }, function () {
                innerThis.isLoading = false;
            });
        };
        ActivePollsController.$inject = ["$http", "SiteInfo", "$timeout", "$rootScope"];
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
        function AssessmentPaymentFormController($http, siteInfo, $rootScope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$rootScope = $rootScope;
            this.isLoading_Payment = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        AssessmentPaymentFormController.prototype.$onInit = function () {
            this.allyAppName = AppConfig.appName;
            this.isAutoPayActive = this.siteInfo.userInfo.isAutoPayActive;
            this.assessmentCreditCardFeeLabel = this.siteInfo.privateSiteInfo.payerPaysCCFee ? "Service fee applies" : "No service fee";
            this.assessmentAchFeeLabel = this.siteInfo.privateSiteInfo.payerPaysAchFee ? "Service fee applies" : "No service fee";
            this.payerPaysAchFee = this.siteInfo.privateSiteInfo.payerPaysAchFee;
            this.errorPayInfoText = "Is the amount incorrect?";
            this.isWePaySetup = this.siteInfo.privateSiteInfo.isPaymentEnabled;
            this.hasAssessments = this.siteInfo.privateSiteInfo.hasAssessments;
            this.assessmentFrequency = this.siteInfo.privateSiteInfo.assessmentFrequency;
            if (!this.isAutoPayActive && HtmlUtil.isNumericString(HtmlUtil.GetQueryStringParameter("preapproval_id"))) {
                // The user just set up auto-pay and it may take a second
                this.isAutoPayActive = true;
            }
            this.nextAutoPayText = this.siteInfo.userInfo.nextAutoPayText;
            // Grab the assessment from the user's unit (TODO handle multiple units)
            if (this.siteInfo.userInfo.usersUnits != null && this.siteInfo.userInfo.usersUnits.length > 0) {
                this.assessmentAmount = this.siteInfo.userInfo.usersUnits[0].assessment;
            }
            else
                this.assessmentAmount = 0;
            this.paymentInfo =
                {
                    paymentType: "other",
                    amount: this.assessmentAmount,
                    note: "",
                    fundingType: null
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
                    this.nextPaymentText = this.getNextPaymentText(this.siteInfo.userInfo.usersUnits[0].nextAssessmentDue, this.siteInfo.privateSiteInfo.assessmentFrequency);
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
        };
        /**
         * Occurs when the user presses the button to make a payment to their organization
         */
        AssessmentPaymentFormController.prototype.makePayment = function (fundingTypeName) {
            this.isLoading_Payment = true;
            this.paymentInfo.fundingType = fundingTypeName;
            // Remove leading dollar signs
            if (HtmlUtil.isValidString(this.paymentInfo.amount) && this.paymentInfo.amount[0] === '$')
                this.paymentInfo.amount = this.paymentInfo.amount.substr(1);
            analytics.track("makePayment", {
                fundingType: fundingTypeName
            });
            var innerThis = this;
            this.$http.post("/api/WePayPayment", this.paymentInfo).then(function (httpResponse) {
                var checkoutInfo = httpResponse.data;
                if (checkoutInfo !== null && typeof (checkoutInfo.checkoutUri) === "string" && checkoutInfo.checkoutUri.length > 0)
                    window.location.href = checkoutInfo.checkoutUri;
                else {
                    innerThis.isLoading_Payment = false;
                    alert("Unable to initiate WePay checkout");
                }
            }, function (httpResponse) {
                innerThis.isLoading_Payment = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    alert(httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user clicks the helper link to prep an e-mail to inquire the board as to
         * why their records don't line up.
         */
        AssessmentPaymentFormController.prototype.onIncorrectPayDetails = function () {
            // Get the friendly looking assessment value (ex: 100, 101, 102.50)
            var amountString = this.assessmentAmount.toString();
            if (Math.round(this.assessmentAmount) != this.assessmentAmount)
                amountString = this.assessmentAmount.toFixed(2);
            // Tell the groupSendEmail component to prep an e-mail for the board
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
        };
        /**
         * Generate the friendly string describing to what the member's next payment applies
         */
        AssessmentPaymentFormController.prototype.getNextPaymentText = function (payPeriods, assessmentFrequency) {
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
         * Occurs when the user presses the button to etup auto-pay for assessments
         */
        AssessmentPaymentFormController.prototype.onSetupAutoPay = function (fundingTypeName) {
            this.isLoading_Payment = true;
            var innerThis = this;
            this.$http.get("/api/WePayPayment/SetupAutoPay?fundingType=" + fundingTypeName).then(function (httpResponse) {
                var redirectUrl = httpResponse.data;
                if (typeof (redirectUrl) === "string" && redirectUrl.length > 0)
                    window.location.href = redirectUrl;
                else {
                    innerThis.isLoading_Payment = false;
                    alert("Unable to initiate WePay auto-pay setup");
                }
            }, function (httpResponse) {
                innerThis.isLoading_Payment = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    alert(httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user clicks the button to disable auto-pay
         */
        AssessmentPaymentFormController.prototype.onDisableAutoPay = function () {
            if (!confirm("Just to double check, this will disable your auto-payment. You need to make sure to manually make your regular payments to avoid any late fees your association may enforce."))
                return;
            this.isLoading_Payment = true;
            var innerThis = this;
            this.$http.get("/api/WePayPayment/DisableAutoPay").then(function () {
                innerThis.isLoading_Payment = false;
                innerThis.isAutoPayActive = false;
            }, function (httpResponse) {
                innerThis.isLoading_Payment = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    alert(httpResponse.data.exceptionMessage);
            });
        };
        AssessmentPaymentFormController.$inject = ["$http", "SiteInfo", "$rootScope"];
        return AssessmentPaymentFormController;
    }());
    Ally.AssessmentPaymentFormController = AssessmentPaymentFormController;
})(Ally || (Ally = {}));
CA.angularApp.component("assessmentPaymentForm", {
    templateUrl: "/ngApp/common/assessment-payment-form.html",
    controller: Ally.AssessmentPaymentFormController
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
        function DocumentsController($http, $rootScope, $cacheFactory, $scope) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.$cacheFactory = $cacheFactory;
            this.$scope = $scope;
            this.isLoading = false;
            this.filesSortDescend = false;
            this.title = "Documents";
            this.getDocsUri = "/api/ManageDocuments";
            this.fileSortType = window.localStorage[DocumentsController.LocalStorageKey_SortType];
            if (!this.fileSortType)
                this.fileSortType = "title";
            this.filesSortDescend = window.localStorage[DocumentsController.LocalStorageKey_SortDirection] === "true";
            this.fileSearch = {
                all: ""
            };
            this.isSiteManager = $rootScope["isSiteManager"];
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        DocumentsController.prototype.$onInit = function () {
            this.apiAuthToken = this.$rootScope.authToken;
            this.Refresh();
            var innerThis = this;
            var hookUpFileUpload = function () {
                $(function () {
                    var uploader = $('#JQDocsFileUploader');
                    uploader.fileupload({
                        autoUpload: true,
                        add: function (e, data) {
                            //var scopeElement = document.getElementById( 'documents-area' );
                            //var scope = angular.element( scopeElement ).scope();
                            //innerThis.$scope.$apply( function() { innerThis.isLoading = false; });
                            var dirPath = innerThis.getSelectedDirectoryPath();
                            $("#FileUploadProgressContainer").show();
                            data.url = "api/DocumentUpload?dirPath=" + encodeURIComponent(dirPath) + "&ApiAuthToken=" + innerThis.apiAuthToken;
                            var xhr = data.submit();
                            xhr.done(function (result) {
                                // Clear the document cache
                                innerThis.$cacheFactory.get('$http').remove(innerThis.getDocsUri);
                                $("#FileUploadProgressContainer").hide();
                                innerThis.Refresh();
                            });
                        },
                        progressall: function (e, data) {
                            var progress = parseInt((data.loaded / data.total * 100).toString(), 10);
                            $('#FileUploadProgressBar').css('width', progress + '%');
                            if (progress === 100)
                                $("#FileUploadProgressLabel").text("Finalizing Upload...");
                            else
                                $("#FileUploadProgressLabel").text(progress + "%");
                        }
                    });
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
        DocumentsController.prototype.viewDoc = function (curFile) {
            window.open(curFile.url + "?ApiAuthToken=" + this.apiAuthToken, '_blank');
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
            var lowerFilter = angular.lowercase(this.fileSearch.all) || '';
            var filterSearchFiles = function (file) {
                return angular.lowercase(file.localFilePath || '').indexOf(lowerFilter) !== -1
                    || angular.lowercase(file.uploadDateString || '').indexOf(lowerFilter) !== -1
                    || angular.lowercase(file.uploaderFullName || '').indexOf(lowerFilter) !== -1;
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
            // If the user can't manage the association then do nothing
            if (!this.isSiteManager)
                return;
            var innerThis = this;
            setTimeout(function () {
                // Make the folders accept dropped files
                var droppables = $(".droppable");
                droppables.droppable({
                    drop: function (event, ui) {
                        var selectedDirectoryPath = innerThis.getSelectedDirectoryPath();
                        var uiDraggable = $(ui.draggable);
                        uiDraggable.draggable("option", "revert", "false");
                        var destFolderName = $(this).attr("data-folder-path").trim();
                        innerThis.$scope.$apply(function () {
                            // Display the loading image
                            innerThis.isLoading = true;
                            var fileAction = {
                                relativeS3Path: innerThis.selectedFile.relativeS3Path,
                                action: "move",
                                newFileName: "",
                                sourceFolderPath: selectedDirectoryPath,
                                destinationFolderPath: destFolderName
                            };
                            //innerThis.selectedDirectory = null;
                            innerThis.selectedFile = null;
                            // Tell the server
                            innerThis.$http.put("/api/ManageDocuments/MoveFile", fileAction).then(function () {
                                innerThis.isLoading = false;
                                // Clear the document cache
                                innerThis.$cacheFactory.get('$http').remove(innerThis.getDocsUri);
                                innerThis.Refresh();
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
                                innerThis.isLoading = false;
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
                    opacity: 0.7,
                    containment: "document",
                    appendTo: "body",
                    start: function (event, ui) {
                        // Get the index of the file being dragged (ID is formatted like "File_12")
                        var fileIndexString = $(this).attr("id").substring("File_".length);
                        var fileIndex = parseInt(fileIndexString);
                        innerThis.$scope.$apply(function () {
                            var fileInfo = innerThis.selectedDirectory.files[fileIndex];
                            innerThis.selectedFile = fileInfo;
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
            this.selectedDirectory = dir;
            this.selectedFile = null;
            this.fileSearch.all = null;
            this.hookUpFileDragging();
            this.SortFiles();
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to create a directory within the current directory
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
            this.createUnderParentDirName = this.selectedDirectory.name;
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
                // Clear the document cache
                _this.$cacheFactory.get('$http').remove(_this.getDocsUri);
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
                // Clear the document cache
                _this.$cacheFactory.get('$http').remove(_this.getDocsUri);
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
                    // Clear the document cache
                    _this.$cacheFactory.get('$http').remove(_this.getDocsUri);
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
                // Clear the document cache
                _this.$cacheFactory.get('$http').remove(_this.getDocsUri);
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
                    // Clear the document cache
                    _this.$cacheFactory.get('$http').remove(_this.getDocsUri);
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
                default:
                    imagePath = "GenericFileIcon.png";
                    break;
            }
            return "/assets/images/FileIcons/" + imagePath;
        };
        DocumentsController.prototype.hookupParentDirs = function (dir) {
            var _this = this;
            dir.fullDirectoryPath = this.getDirectoryFullPath(dir);
            dir.getSubDirectoryByName = DocumentDirectory.prototype.getSubDirectoryByName;
            if (!dir.subdirectories)
                return;
            dir.subdirectories.forEach(function (subDir) {
                subDir.parentDirectory = dir;
                _this.hookupParentDirs(subDir);
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Refresh the file tree
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.Refresh = function () {
            // Store the name of the directory we have selected so we can re-select it after refreshing
            // the data
            var selectedDirectoryPath = null;
            if (this.selectedDirectory)
                selectedDirectoryPath = this.getSelectedDirectoryPath();
            // Display the loading image
            this.isLoading = true;
            this.selectedDirectory = null;
            this.selectedFile = null;
            this.getDocsUri = "/api/ManageDocuments";
            if (this.committee)
                this.getDocsUri += "/Committee/" + this.committee.committeeId;
            var innerThis = this;
            this.$http.get(this.getDocsUri, { cache: true }).then(function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.documentTree = httpResponse.data;
                innerThis.documentTree.getSubDirectoryByName = DocumentDirectory.prototype.getSubDirectoryByName;
                // Hook up parent directories
                innerThis.documentTree.subdirectories.forEach(function (dir) {
                    innerThis.hookupParentDirs(dir);
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
                processDir(innerThis.documentTree);
                innerThis.fullSearchFileList = allFiles;
                // Find the directory we had selected before the refresh
                if (selectedDirectoryPath) {
                    innerThis.selectedDirectory = innerThis.FindDirectoryByPath(selectedDirectoryPath);
                    innerThis.SortFiles();
                }
                innerThis.hookUpFileDragging();
            }, function (response) {
                innerThis.isLoading = false;
                //$( "#FileTreePanel" ).hide();
                //innerThis.errorMessage = "Failed to retrieve the building documents.";
            });
        };
        DocumentsController.$inject = ["$http", "$rootScope", "$cacheFactory", "$scope"];
        DocumentsController.LocalStorageKey_SortType = "DocsInfo_FileSortType";
        DocumentsController.LocalStorageKey_SortDirection = "DocsInfo_FileSortDirection";
        DocumentsController.DirName_Committees = "Committees_Root";
        return DocumentsController;
    }());
    Ally.DocumentsController = DocumentsController;
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
     * The controller for the widget that lets members send e-mails to the group
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
            this.defaultMessageRecipient = "board";
            this.showDiscussionEveryoneWarning = false;
            this.showDiscussionLargeWarning = false;
            this.showUseDiscussSuggestion = false;
            this.showSendConfirmation = false;
            this.showEmailForbidden = false;
            this.showRestrictedGroupWarning = false;
            this.defaultSubject = "A message from your neighbor";
            this.memberLabel = "resident";
            this.memberPageName = "Residents";
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
         * Populate the group e-mail options
         */
        GroupSendEmailController.prototype.loadGroupEmails = function () {
            this.isLoadingEmail = true;
            var innerThis = this;
            this.fellowResidents.getGroupEmailObject().then(function (emailList) {
                innerThis.isLoadingEmail = false;
                innerThis.availableEmailGroups = emailList;
                if (innerThis.availableEmailGroups.length > 0) {
                    innerThis.defaultMessageRecipient = innerThis.availableEmailGroups[0].recipientType;
                    innerThis.messageObject.recipientType = innerThis.defaultMessageRecipient;
                    innerThis.onSelectEmailGroup();
                }
            });
        };
        /**
         * Setup an e-mail to be sent to the board for assessment issues
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
                this.messageObject.message = "Hello Boardmembers,\n\nOur association's home page says my assessment payment is $" + assessmentAmount + ", but I believe that is incorrect. My records indicate my assessment payments should be $[INSERT PROPER AMOUNT HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            document.getElementById("send-email-panel").scrollIntoView();
        };
        /**
         * Occurs when the user presses the button to send an e-mail to members of the building
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
                _this.messageObject.recipientType = _this.defaultMessageRecipient;
                _this.messageObject.subject = _this.defaultSubject;
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
                    alert("Unable to send e-mail, please contact technical support.");
            });
        };
        /**
         * Occurs when the user selects an e-mail group from the drop-down
         */
        GroupSendEmailController.prototype.onSelectEmailGroup = function () {
            var _this = this;
            var shortName = HtmlUtil.getSubdomain(window.location.host).toLowerCase();
            this.groupEmailAddress = this.messageObject.recipientType + "." + shortName + "@inmail." + AppConfig.baseTld;
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
            this.showUseDiscussSuggestion = !isSendingToDiscussion && !isSendingToBoard && !isSendingToPropMgr && AppConfig.isChtnSite;
            var groupInfo = _.find(this.availableEmailGroups, function (g) { return g.recipientType === _this.messageObject.recipientType; });
            this.showRestrictedGroupWarning = groupInfo.isRestrictedGroup;
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
     * The controller for the widget that lets members send e-mails to the group
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
            // Load the news with a slight delay to help the page load faster
            this.isLoading = true;
            var innerThis = this;
            this.$timeout(function () { return innerThis.loadNewsStories(); }, 200);
        };
        /**
         * Refresh the local news feed
         */
        LocalNewsFeedController.prototype.loadNewsStories = function () {
            //window.location.host is subdomain.domain.com
            var subDomain = HtmlUtil.getSubdomain(window.location.host);
            // A little test to help the automated tests run faster
            var isTestSubdomain = subDomain === "qa" || subDomain === "localtest";
            isTestSubdomain = false;
            if (isTestSubdomain)
                return;
            this.isLoading = true;
            var localNewsUri;
            var queryParams;
            if (this.siteInfo.privateSiteInfo.country === "US") {
                localNewsUri = "https://localnewsally.org/api/LocalNews";
                queryParams = {
                    clientId: "1001A194-B686-4C45-80BC-ECC0BB4916B4",
                    chicagoWard: this.siteInfo.publicSiteInfo.chicagoWard,
                    zipCode: this.siteInfo.publicSiteInfo.zipCode,
                    cityNeighborhood: this.siteInfo.publicSiteInfo.localNewsNeighborhoodQuery
                };
            }
            else {
                localNewsUri = "https://localnewsally.org/api/LocalNews/International/MajorCity";
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
                innerThis.isLoading = false;
                innerThis.localNewStories = httpResponse.data;
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
                            displayName: "# E-mails",
                            type: "number",
                            width: 100
                        },
                        {
                            field: "amountPaid",
                            displayName: "Amount Paid",
                            cellFilter: "currency",
                            type: "number",
                            width: 110
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
            this.isValid = null;
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
            var amountCellTemplate = '<div class="ui-grid-cell-contents">$<input type="number" style="width: 90%;" data-ng-model="row.entity[col.field]" /></div>';
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
                            cellTemplate: '<div class="ui-grid-cell-contents">{{ row.entity.amountDue - (row.entity.balanceForward || 0) + (row.entity.lateFee || 0) | currency }}</div>'
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
                        gridApi.selection.on.rowSelectionChanged($scope, function (row) { return updateFromSelection(); });
                        gridApi.selection.on.rowSelectionChangedBatch($scope, function (row) { return updateFromSelection(); });
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
                    _this.selectedEntries = _.filter(_this.selectedEntries, function (e) { return _this.getTotalDue(e) != 0; });
                }
                else if (_this.activeStepIndex === 3) {
                    _this.numEmailsToSend = _.filter(_this.selectedEntries, function (e) { return e.shouldSendEmail; }).length;
                    _this.numPaperLettersToSend = _.filter(_this.selectedEntries, function (e) { return e.shouldSendPaperMail; }).length;
                }
            });
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
        };
        MailingInvoiceController.prototype.onAddressChanged = function (recipient) {
            if (recipient.shouldSendPaperMail)
                this.validateAddress(recipient);
        };
        /**
         * Run the recipient addresses through an address validator
         */
        MailingInvoiceController.prototype.validateAddress = function (recipient) {
            recipient.isValidating = true;
            recipient.isValid = null;
            var validateUri = "/api/Mailing/VerifyAddress?address=" + encodeURIComponent(JSON.stringify(recipient.streetAddressObject));
            return this.$http.get(validateUri).then(function (response) {
                recipient.isValidating = false;
                recipient.isValid = response.data.isValid;
                recipient.validationMessage = response.data.verificationMessage;
                if (recipient.isValid)
                    recipient.validatedAddress = response.data.parsedStreetAddress.multiLiner;
            }, function (response) {
                recipient.isValidating = false;
                recipient.isValid = false;
                recipient.validatedAddress = null;
                recipient.validationMessage = response.data.exceptionMessage;
            });
        };
        MailingInvoiceController.prototype.previewInvoice = function (entry) {
            var _this = this;
            var previewPostInfo = new InvoicePreviewInfo();
            previewPostInfo.dueDateString = this.fullMailingInfo.dueDateString;
            previewPostInfo.duesLabel = this.fullMailingInfo.duesLabel;
            previewPostInfo.fromAddress = this.fullMailingInfo.fromStreetAddress;
            previewPostInfo.mailingInfo = entry;
            previewPostInfo.notes = this.fullMailingInfo.notes;
            this.isLoading = true;
            entry.wasPopUpBlocked = false;
            this.$http.post("/api/Mailing/Preview/Invoice", previewPostInfo).then(function (response) {
                _this.isLoading = false;
                var getUri = "/api/Mailing/Preview/Invoice/" + response.data.previewId;
                getUri += "?ApiAuthToken=" + _this.authToken;
                var newWindow = window.open(getUri, "_blank");
                entry.wasPopUpBlocked = !newWindow || newWindow.closed || typeof newWindow.closed === "undefined";
            }, function (response) {
                _this.isLoading = false;
            });
            //var entryInfo = encodeURIComponent( JSON.stringify( entry ) );
            //var invoiceUri = `/api/Mailing/Preview/Invoice?ApiAuthToken=${this.authToken}&fromAddress=${encodeURIComponent( JSON.stringify( this.fullMailingInfo.fromStreetAddress ) )}&notes=${encodeURIComponent( this.fullMailingInfo.notes )}&dueDateString=${encodeURIComponent( this.fullMailingInfo.dueDateString )}&duesLabel=${encodeURIComponent( this.fullMailingInfo.duesLabel )}&mailingInfo=${entryInfo}`;
            //window.open( invoiceUri, "_blank" );
        };
        MailingInvoiceController.prototype.onFinishedWizard = function () {
            var _this = this;
            if (this.numPaperLettersToSend === 0) {
                if (this.numEmailsToSend === 0)
                    alert("No e-mails or paper letters selected to send.");
                else
                    this.submitFullMailingAfterCharge();
                return;
            }
            //let stripeKey = "pk_test_FqHruhswHdrYCl4t0zLrUHXK";
            var stripeKey = "pk_live_fV2yERkfAyzoO9oWSfORh5iH";
            var checkoutHandler = StripeCheckout.configure({
                key: stripeKey,
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
            else {
                var shouldSetTo = !this.selectedEntries[0].shouldSendPaperMail;
                for (var i = 0; i < this.selectedEntries.length; ++i) {
                    if (!this.selectedEntries[i].streetAddressObject || !this.selectedEntries[i].amountDue)
                        this.selectedEntries[i].shouldSendPaperMail = false;
                    else
                        this.selectedEntries[i].shouldSendPaperMail = shouldSetTo;
                }
                // If we enabled the sending and there are selected recipients, then verify all addresses
                if (shouldSetTo && this.selectedEntries.length > 0) {
                    var recipientsToVerify_1 = _.clone(this.selectedEntries);
                    var validateAllStep = function () {
                        _this.validateAddress(recipientsToVerify_1[0]).then(function () {
                            recipientsToVerify_1.splice(0, 1);
                            while (recipientsToVerify_1.length > 0 && !recipientsToVerify_1[0].amountDue)
                                recipientsToVerify_1.splice(0, 1);
                            if (recipientsToVerify_1.length > 0)
                                validateAllStep();
                        });
                    };
                    //validateAllStep();
                }
            }
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
                            cellTemplate: '<div class="ui-grid-cell-contents"><span class="text-link" data-ng-click="grid.appScope.$ctrl.editEquipment( row.entity )">{{ row.entity.name }}</span></div>'
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
            this.maintenanceEntries = _.sortBy(this.maintenanceEntries, function (e) { return e.getCreatedDate(); }).reverse();
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
                this.editingProject = null;
                setTimeout(function () { return $("#edit-todo-name-text-box").focus(); }, 50);
            }
            else {
                this.editingTodo = null;
                this.editingProject = new MaintenanceProject();
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
            if (this.editingEquipment.locationTags && this.editingEquipment.locationTags.length > 0)
                this.editingEquipment.location = this.editingEquipment.locationTags[0].text;
            else
                this.editingEquipment.location = undefined;
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
        MaintenanceController.$inject = ["$http", "$rootScope", "SiteInfo", "maintenance", "fellowResidents"];
        MaintenanceController.EquipmentId_AddNew = -5;
        MaintenanceController.AutocompleteLocationOptions = [{ text: "Attic" },
            { text: "Back Yard" },
            { text: "Basement" },
            { text: "Front Yard" },
            { text: "Inside" },
            { text: "Kitchen" },
            { text: "Outside" },
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
     * The controller for the widget that lets members send e-mails to the group
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
                    this.nextPaymentText = this.getNextPaymentText(this.siteInfo.userInfo.usersUnits[0].nextAssessmentDue, this.siteInfo.privateSiteInfo.assessmentFrequency);
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
                     * Buyer cancelled the payment
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
         * Occurs when the user clicks the helper link to prep an e-mail to inquire the board as to
         * why their records don't line up.
         */
        PayPalPaymentFormController.prototype.onIncorrectPayDetails = function () {
            // Get the friendly looking assessment value (ex: 100, 101, 102.50)
            var amountString = this.assessmentAmount.toString();
            if (Math.round(this.assessmentAmount) != this.assessmentAmount)
                amountString = this.assessmentAmount.toFixed(2);
            // Tell the groupSendEmail component to prep an e-mail for the board
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
            // Also mask phone numbers
            if (this.siteInfo.privateSiteInfo.country === "US" || this.siteInfo.privateSiteInfo.country === "CA") {
                var phoneFields = $(".mask-phone");
                phoneFields.mask("(999) 999-9999? x999", { autoclear: false });
            }
            // If we know our group's position, let's tighten the auto-complete suggestion radius
            var autocompleteOptions = undefined;
            if (this.siteInfo.publicSiteInfo.googleGpsPosition) {
                var TwentyFiveMilesInMeters = 40234;
                var circle = new google.maps.Circle({
                    center: this.siteInfo.publicSiteInfo.googleGpsPosition,
                    radius: TwentyFiveMilesInMeters
                });
                autocompleteOptions = {
                    bounds: circle.getBounds()
                };
            }
            var addressInput = document.getElementById("vendor-" + (this.vendorItem.preferredVendorId || "") + "-address-text-box");
            this.addressAutocomplete = new google.maps.places.Autocomplete(addressInput, autocompleteOptions);
            var innerThis = this;
            google.maps.event.addListener(this.addressAutocomplete, "place_changed", function () {
                var place = innerThis.addressAutocomplete.getPlace();
                if (!innerThis.editVendorItem.fullAddress)
                    innerThis.editVendorItem.fullAddress = new Ally.FullAddress();
                innerThis.editVendorItem.fullAddress.oneLiner = place.formatted_address;
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
            var innerThis = this;
            saveMethod("/api/PreferredVendors", this.editVendorItem).success(function () {
                innerThis.isLoading = false;
                if (_this.isAddForm) {
                    innerThis.editVendorItem = new Ally.PreferredVendor();
                    if (innerThis.onAddNewVendor)
                        innerThis.onAddNewVendor();
                }
                else
                    innerThis.isInEditMode = false;
                if (innerThis.onParentDataNeedsRefresh)
                    innerThis.onParentDataNeedsRefresh();
            }).error(function (exception) {
                innerThis.isLoading = false;
                alert("Failed to save the vendor information: " + exception.exceptionMessage);
            });
        };
        PreferredVendorItemController.prototype.onCancelEdit = function () {
            this.isInEditMode = false;
        };
        PreferredVendorItemController.prototype.onEditItem = function () {
            // Deep clone the vendor item
            this.editVendorItem = JSON.parse(JSON.stringify(this.vendorItem));
            this.isInEditMode = true;
            var innerThis = this;
            window.setTimeout(function () { innerThis.hookupAddressAutocomplete(); }, 500);
        };
        PreferredVendorItemController.prototype.deleteItem = function () {
            if (!confirm("Are you sure you want to remove this vendor?"))
                return;
            this.isLoading = true;
            var innerThis = this;
            this.$http.delete("/api/PreferredVendors/" + this.vendorItem.preferredVendorId).success(function () {
                innerThis.isLoading = false;
                if (innerThis.onParentDataNeedsRefresh)
                    innerThis.onParentDataNeedsRefresh();
            }).error(function (exception) {
                innerThis.isLoading = false;
                alert("Failed to delete the vendor: " + exception.exceptionMessage);
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
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        PreferredVendorsController.prototype.$onInit = function () {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.retrieveVendors();
        };
        /**
         * Populate the vendors
         */
        PreferredVendorsController.prototype.retrieveVendors = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/PreferredVendors").success(function (vendors) {
                innerThis.isLoading = false;
                innerThis.allVendors = vendors;
                innerThis.filteredVendors = vendors;
                // Process the tags into an array for the ng-tag-input control, build the list of
                // all used tags, and convert the add dates to local time
                innerThis.usedServiceTags = [];
                _.each(innerThis.allVendors, function (v) {
                    v.servicesTagArray = [];
                    _.each(v.servicesProvidedSplit, function (ss) { return v.servicesTagArray.push({ text: ss }); });
                    innerThis.usedServiceTags = innerThis.usedServiceTags.concat(v.servicesProvidedSplit);
                    // Convert the added timestamps to local time
                    v.addedDateUtc = moment.utc(v.addedDateUtc).toDate();
                });
                // Remove any duplicate tags
                innerThis.usedServiceTags = _.uniq(innerThis.usedServiceTags);
                innerThis.usedServiceTags.sort();
            });
        };
        PreferredVendorsController.prototype.onTagFilterToggle = function (tagName) {
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
                var innerThis = this;
                _.each(this.allVendors, function (v) {
                    if (_.intersection(v.servicesProvidedSplit, innerThis.filterTags).length > 0)
                        innerThis.filteredVendors.push(v);
                });
            }
        };
        PreferredVendorsController.prototype.onAddedNewVendor = function () {
            this.retrieveVendors();
        };
        PreferredVendorsController.$inject = ["$http", "SiteInfo"];
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
        onChange: "&"
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
            var MaxNumRecentPayments = 6;
            this.recentPayments = this.siteInfo.userInfo.recentPayments;
            if (this.recentPayments) {
                if (this.recentPayments.length > MaxNumRecentPayments)
                    this.recentPayments = this.recentPayments.slice(0, MaxNumRecentPayments);
                this.numRecentPayments = this.recentPayments.length;
                // Fill up the list so there's always MaxNumRecentPayments
                while (this.recentPayments.length < MaxNumRecentPayments)
                    this.recentPayments.push({});
            }
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
                    this.nextPaymentText = this.getNextPaymentText(this.siteInfo.userInfo.usersUnits[0].nextAssessmentDue, this.siteInfo.privateSiteInfo.assessmentFrequency);
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
                this.messageObject.message = "Hello Boardmembers,\n\nOur association's home page says my next payment of $" + this.siteInfo.userInfo.assessmentAmount + " will cover " + this.nextPaymentText + ", but I believe that is incorrect. My records indicate my next payment of $" + this.siteInfo.userInfo.assessmentAmount + " should pay for [INSERT PROPER DATE HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            else
                this.messageObject.message = "Hello Boardmembers,\n\nOur association's home page says my assessment payment is $" + this.siteInfo.userInfo.assessmentAmount + ", but I believe that is incorrect. My records indicate my assessment payments should be $[INSERT PROPER AMOUNT HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
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
                    localNewsUri = "https://localnewsally.org/api/LocalNews";
                    queryParams = {
                        clientId: "1001A194-B686-4C45-80BC-ECC0BB4916B4",
                        chicagoWard: this.siteInfo.publicSiteInfo.chicagoWard,
                        zipCode: this.siteInfo.publicSiteInfo.zipCode,
                        cityNeighborhood: this.siteInfo.publicSiteInfo.localNewsNeighborhoodQuery
                    };
                }
                else {
                    localNewsUri = "https://localnewsally.org/api/LocalNews/International/MajorCity";
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
     * The controller for the widget that lets members send e-mails to the group
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
     * The controller for the widget that lets members send e-mails to the group
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
                else if (!HtmlUtil.isNullOrWhitespace(signUpResult.createUrl)) {
                    window.location.href = signUpResult.createUrl;
                }
                else {
                    innerThis.hideWizard = true;
                    innerThis.resultMessage = "Great work! We just sent you an e-mail with instructions on how access your new site.";
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
            var MaxNumRecentPayments = 6;
            this.recentPayments = this.siteInfo.userInfo.recentPayments;
            if (this.recentPayments) {
                if (this.recentPayments.length > MaxNumRecentPayments)
                    this.recentPayments = this.recentPayments.slice(0, MaxNumRecentPayments);
                this.numRecentPayments = this.recentPayments.length;
                // Fill up the list so there's always MaxNumRecentPayments
                while (this.recentPayments.length < MaxNumRecentPayments)
                    this.recentPayments.push({});
            }
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
                    this.nextPaymentText = this.getNextPaymentText(this.siteInfo.userInfo.usersUnits[0].nextAssessmentDue, this.siteInfo.privateSiteInfo.assessmentFrequency);
                    this.updatePaymentText();
                }
            }
            this.refreshData();
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
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Populate the page from the server
        ///////////////////////////////////////////////////////////////////////////////////////////////
        PtaGroupHomeController.prototype.refreshData = function () {
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
                    localNewsUri = "https://localnewsally.org/api/LocalNews";
                    queryParams = {
                        clientId: "1001A194-B686-4C45-80BC-ECC0BB4916B4",
                        chicagoWard: this.siteInfo.publicSiteInfo.chicagoWard,
                        zipCode: this.siteInfo.publicSiteInfo.zipCode,
                        cityNeighborhood: this.siteInfo.publicSiteInfo.localNewsNeighborhoodQuery
                    };
                }
                else {
                    localNewsUri = "https://localnewsally.org/api/LocalNews/International/MajorCity";
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
        PtaGroupHomeController.$inject = ["$http", "$rootScope", "SiteInfo", "$timeout", "appCacheService"];
        return PtaGroupHomeController;
    }());
    Ally.PtaGroupHomeController = PtaGroupHomeController;
})(Ally || (Ally = {}));
CA.angularApp.component("ptaGroupHome", {
    templateUrl: "/ngApp/pta/pta-group-home.html",
    controller: Ally.PtaGroupHomeController
});

var Ally;
(function (Ally) {
    var MemberSignUpInfo = /** @class */ (function () {
        function MemberSignUpInfo() {
        }
        return MemberSignUpInfo;
    }());
    /**
     * The controller for the PTA Ally home page
     */
    var PtaMemberSignUpController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function PtaMemberSignUpController($http, $rootScope, siteInfo, $timeout, appCacheService) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.appCacheService = appCacheService;
            this.isLoading = false;
            this.signUpInfo = new MemberSignUpInfo();
            this.showInputForm = true;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        PtaMemberSignUpController.prototype.$onInit = function () {
            var _this = this;
            this.groupName = this.siteInfo.publicSiteInfo.fullName;
            window.setTimeout(function () { return _this.hookupAddressAutocomplete(); }, 300);
        };
        /**
         * Attach the Google Places auto-complete logic to the address text box
         */
        PtaMemberSignUpController.prototype.hookupAddressAutocomplete = function () {
            // If we know our group's position, let's tighten the auto-complete suggestion radius
            var autocompleteOptions = undefined;
            if (this.siteInfo.publicSiteInfo.googleGpsPosition) {
                // Also mask phone numbers for US phones
                var phoneFields = $(".mask-phone");
                phoneFields.mask("(999) 999-9999? x999", { autoclear: false });
                var TwentyFiveMilesInMeters = 40234;
                var circle = new google.maps.Circle({
                    center: this.siteInfo.publicSiteInfo.googleGpsPosition,
                    radius: TwentyFiveMilesInMeters
                });
                autocompleteOptions = {
                    bounds: circle.getBounds()
                };
            }
            var addressInput = document.getElementById("member-home-address-text-box");
            this.addressAutocomplete = new google.maps.places.Autocomplete(addressInput, autocompleteOptions);
            var innerThis = this;
            google.maps.event.addListener(this.addressAutocomplete, "place_changed", function () {
                var place = innerThis.addressAutocomplete.getPlace();
                innerThis.signUpInfo.streetAddress = place.formatted_address;
            });
        };
        PtaMemberSignUpController.prototype.submitInfo = function () {
            var _this = this;
            this.signUpInfo.recaptchaKey = grecaptcha.getResponse();
            if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.recaptchaKey)) {
                this.errorMessage = "Please complete the reCAPTCHA field";
                return;
            }
            this.isLoading = true;
            this.errorMessage = null;
            this.$http.post("/api/PublicPta", this.signUpInfo).then(function (response) {
                _this.isLoading = false;
                _this.showInputForm = false;
            }, function (response) {
                _this.isLoading = false;
                _this.errorMessage = "Failed to submit: " + response.data.exceptionMessage;
            });
        };
        PtaMemberSignUpController.$inject = ["$http", "$rootScope", "SiteInfo", "$timeout", "appCacheService"];
        return PtaMemberSignUpController;
    }());
    Ally.PtaMemberSignUpController = PtaMemberSignUpController;
})(Ally || (Ally = {}));
CA.angularApp.component("ptaMemberSignUp", {
    templateUrl: "/ngApp/pta/pta-member-sign-up.html",
    controller: Ally.PtaMemberSignUpController
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
            enableMapControls: "="
        },
        restrict: 'E',
        replace: 'true',
        templateUrl: '/ngApp/Services/GoogleMapPolyEditorTemplate.html',
        link: linkFunction
    };
}] );
// Allow enter key event
// From http://stackoverflow.com/questions/15417125/submit-form-on-pressing-enter-with-angularjs
angular.module( "CondoAlly" ).directive( "ngEnter", function()
{
    return function( scope, element, attrs )
    {
        element.bind( "keydown keypress", function( event )
        {
            var EnterKeyCode = 13;
            if( event.which === EnterKeyCode )
            {
                scope.$apply( function()
                {
                    scope.$eval( attrs.ngEnter, { 'event': event } );
                } );

                event.preventDefault();
            }
        } );
    };
} );

angular.module( "CondoAlly" ).directive( "ngEscape", function()
{
    return function( scope, element, attrs )
    {
        element.bind( "keydown keypress", function( event )
        {
            var EscapeKeyCode = 27;
            if( event.which === EscapeKeyCode )
            {
                scope.$apply( function()
                {
                    scope.$eval( attrs.ngEscape, { 'event': event } );
                } );

                event.preventDefault();
            }
        } );
    };
} );
// Allow conditional inline values
// From http://stackoverflow.com/questions/14164371/inline-conditionals-in-angular-js
CA.angularApp.filter( 'iif', function()
{
    return function( input, trueValue, falseValue )
    {
        return input ? trueValue : falseValue;
    };
} );


CA.angularApp.filter( 'tel', function()
{
    return function( tel )
    {
        if( !tel ) { return ''; }

        var value = tel.toString().trim().replace( /^\+/, '' );

        if( value.match( /[^0-9]/ ) )
        {
            return tel;
        }

        var country, city, number;

        switch( value.length )
        {
            case 7: // ####### -> ###-####
                country = 1;
                city = "";
                number = value;
                break;

            case 10: // +1PPP####### -> C (PPP) ###-####
                country = 1;
                city = value.slice( 0, 3 );
                number = value.slice( 3 );
                break;

            case 11: // +CPPP####### -> CCC (PP) ###-####
                country = value[0];
                city = value.slice( 1, 4 );
                number = value.slice( 4 );
                break;

            case 12: // +CCCPP####### -> CCC (PP) ###-####
                country = value.slice( 0, 3 );
                city = value.slice( 3, 5 );
                number = value.slice( 5 );
                break;

            default:
                city = "";
                return tel;
        }

        // Ignore USA
        if( country === 1 )
            country = "";

        number = number.slice( 0, 3 ) + '-' + number.slice( 3 );

        if( city.length > 0 )
            city = "(" + city + ")";

        return ( country + " " + city + " " + number ).trim();
    };
} );

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

var AppCacheService = /** @class */ (function () {
    function AppCacheService() {
        // The key for when the user gets redirect for a 401, but is logged in
        this.Key_WasLoggedIn403 = "wasLoggedIn403";
        this.Key_WasLoggedIn401 = "wasLoggedIn401";
        this.Key_AfterLoginRedirect = "afterLoginRedirect";
        this.KeyPrefix = "AppCacheService_";
    }
    AppCacheService.prototype.set = function (key, value) { window.sessionStorage[this.KeyPrefix + key] = value; };
    AppCacheService.prototype.get = function (key) { return window.sessionStorage[this.KeyPrefix + key]; };
    AppCacheService.prototype.clear = function (key) {
        window.sessionStorage[this.KeyPrefix + key] = void 0;
        delete window.sessionStorage[this.KeyPrefix + key];
    };
    AppCacheService.prototype.getAndClear = function (key) {
        var result;
        result = this.get(key);
        this.clear(key);
        return result;
    };
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
            value = value.replace("\"", "\"\"");
            // Wrap the whole thing in quotes
            value = "\"" + value + "\"";
        }
        return value;
    }
    Ally.ValueToCsvValue = ValueToCsvValue;
    /**
     * Generate a CSV for client-side download
     */
    function createCsvString(itemArray, descriptorArray) {
        var csvText = "";
        // Write the header
        for (var i = 0; i < descriptorArray.length; ++i) {
            if (i > 0)
                csvText += ",";
            csvText += ValueToCsvValue(descriptorArray[i].headerText);
        }
        // Write the rows
        for (var rowIndex = 0; rowIndex < itemArray.length; ++rowIndex) {
            csvText += "\n";
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
     * Represents a group e-mail address to which e-mails sent get forwarded to the whole group
     */
    var GroupEmailInfo = /** @class */ (function () {
        function GroupEmailInfo() {
        }
        return GroupEmailInfo;
    }());
    Ally.GroupEmailInfo = GroupEmailInfo;
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
        }
        /**
         * Get the residents for the current group
         */
        FellowResidentsService.prototype.getResidents = function () {
            var innerThis = this;
            return this.$http.get("/api/BuildingResidents", { cache: true }).then(function (httpResponse) {
                return httpResponse.data.residents;
            }, function (httpResponse) {
                return innerThis.$q.reject(httpResponse);
            });
        };
        /**
         * Get the residents for an association, broken down by unit for easy display
         */
        FellowResidentsService.prototype.getByUnits = function () {
            var innerThis = this;
            return this.$http.get("/api/BuildingResidents", { cache: true }).then(function (httpResponse) {
                return httpResponse.data.byUnit;
            }, function (httpResponse) {
                return innerThis.$q.reject(httpResponse);
            });
        };
        /**
         * Get a list of residents and homes
         */
        FellowResidentsService.prototype.getByUnitsAndResidents = function () {
            var _this = this;
            var innerThis = this;
            return this.$http.get("/api/BuildingResidents", { cache: true }).then(function (httpResponse) {
                return httpResponse.data;
            }, function (httpResponse) {
                return _this.$q.reject(httpResponse);
            });
        };
        /**
         * Get the object describing the available group e-mail addresses
         */
        FellowResidentsService.prototype.getGroupEmailObject = function () {
            var innerThis = this;
            return this.$http.get("/api/BuildingResidents/EmailGroups", { cache: true }).then(function (httpResponse) {
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
         * Populate the lists of group e-mails
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
            // Go through each resident and add them to each e-mail group they belong to
            for (var i = 0; i < allResidents.length; ++i) {
                var r = allResidents[i];
                var displayName = r.fullName + (r.hasEmail ? "" : "*");
                emailLists.everyone.push(displayName);
                var BoardPos_None = 0;
                var BoardPos_PropertyManager = 32;
                if (r.boardPosition !== BoardPos_None && r.boardPosition !== BoardPos_PropertyManager)
                    emailLists.board.push(displayName);
                if (r.boardPosition === BoardPos_PropertyManager)
                    emailLists.propertyManagers.push(displayName);
                if (r.includeInDiscussionEmail)
                    emailLists.discussion.push(displayName);
                var isOwner = false;
                var isRenter = false;
                var unitIsRented = false;
                for (var unitIndex = 0; unitIndex < r.homes.length; ++unitIndex) {
                    var simpleHome = r.homes[unitIndex];
                    if (!simpleHome.isRenter) {
                        isOwner = true;
                        var unit = _.find(unitList, function (u) { return u.unitId === simpleHome.unitId; });
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
        };
        /**
         * Send an e-mail message to another user
         */
        FellowResidentsService.prototype.sendMessage = function (recipientUserId, messageBody, messageSubject) {
            var postData = {
                recipientUserId: recipientUserId,
                messageBody: messageBody,
                messageSubject: messageSubject
            };
            return this.$http.post("/api/BuildingResidents/SendMessage", postData);
        };
        /**
         * Clear cached values, such as when the user changes values in Manage -> Residents
         */
        FellowResidentsService.prototype.clearResidentCache = function () {
            this.$cacheFactory.get("$http").remove("/api/BuildingResidents");
            this.$cacheFactory.get("$http").remove("/api/BuildingResidents/EmailGroups");
        };
        return FellowResidentsService;
    }());
    Ally.FellowResidentsService = FellowResidentsService;
})(Ally || (Ally = {}));
angular.module("CondoAlly").service("fellowResidents", ["$http", "$q", "$cacheFactory", Ally.FellowResidentsService]);

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
            this.shouldShowAdminControls = this.siteInfo.userInfo.isSiteManager;
            this.retrieveComments();
        };
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
        GroupCommentThreadViewController.prototype.archiveThread = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.put("/api/CommentThread/Archive/" + this.thread.commentThreadId, null).then(function () {
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
        function GroupCommentThreadsController($http, $rootScope, siteInfo, $scope) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$scope = $scope;
            this.isLoading = false;
            this.viewingThread = null;
            this.showCreateNewModal = false;
            this.showBoardOnly = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        GroupCommentThreadsController.prototype.$onInit = function () {
            var _this = this;
            this.showBoardOnly = this.siteInfo.userInfo.isSiteManager || this.siteInfo.userInfo.boardPosition !== 0;
            this.editComment = {
                commentText: "",
                replyToCommentId: null
            };
            this.$scope.$on("refreshCommentThreadList", function (event, data) { return _this.refreshCommentThreads(); });
            this.refreshCommentThreads();
        };
        GroupCommentThreadsController.prototype.setDisplayCreateModal = function (shouldShow) {
            this.showCreateNewModal = shouldShow;
            this.newThreadTitle = "";
            this.newThreadBody = "";
            this.newThreadIsBoardOnly = false;
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
        GroupCommentThreadsController.prototype.createNewThread = function () {
            var _this = this;
            this.isLoading = true;
            this.newThreadErrorMessage = null;
            var createInfo = {
                title: this.newThreadTitle,
                body: this.newThreadBody,
                isBoardOnly: this.newThreadIsBoardOnly,
                shouldSendNotice: this.shouldSendNoticeForNewThread,
                committeeId: this.committeeId
            };
            this.$http.post("/api/CommentThread", createInfo).then(function (response) {
                _this.isLoading = false;
                _this.showCreateNewModal = false;
                _this.refreshCommentThreads();
            }, function (response) {
                _this.isLoading = false;
                _this.newThreadErrorMessage = response.data.exceptionMessage;
            });
        };
        /**
         * Retrieve the comments from the server for the current thread
         */
        GroupCommentThreadsController.prototype.refreshCommentThreads = function () {
            var _this = this;
            this.isLoading = true;
            var getUri = "/api/CommentThread";
            if (this.committeeId)
                getUri += "?committeeId=" + this.committeeId;
            this.$http.get(getUri).then(function (response) {
                _this.isLoading = false;
                _this.commentThreads = response.data;
                _this.commentThreads = _.sortBy(_this.commentThreads, function (ct) { return ct.lastCommentDateUtc; }).reverse();
            }, function (response) {
                _this.isLoading = false;
            });
        };
        GroupCommentThreadsController.$inject = ["$http", "$rootScope", "SiteInfo", "$scope"];
        return GroupCommentThreadsController;
    }());
    Ally.GroupCommentThreadsController = GroupCommentThreadsController;
})(Ally || (Ally = {}));
CA.angularApp.component("groupCommentThreads", {
    bindings: {
        committeeId: "<?"
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
        ;
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Delete a comment
        ///////////////////////////////////////////////////////////////////////////////////////////
        GroupCommentsController.prototype.deleteMyComment = function (comment) {
            this.isLoading = true;
            this.$http.delete("/api/Comment?commentId=" + comment.commentId).then(function () {
                this.isLoading = false;
                this.refreshComments();
            }, function (httpResponse) {
                this.isLoading = false;
                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
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
                        var parsedDate;
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
        // Matches YYYY-MM-ddThh:mm:ss.sssZ where .sss is optional
        //"2018-03-12T22:00:33"
        HtmlUtil2.iso8601RegEx = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
        //static dotNetTimeRegEx = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
        // Not sure how the Community Ally server differs from other .Net WebAPI apps, but this
        // regex is needed for the dates that come down
        HtmlUtil2.dotNetTimeRegEx2 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;
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
            this.shouldShowSendModal = false;
            this.shouldShowButtons = false;
            this.isSending = false;
            this.messageBody = "";
            this.messageSubject = "";
            this.sendResultIsError = false;
            this.messageSubject = siteInfo.userInfo.fullName + " has sent you a message via your " + AppConfig.appName + " site";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        SendMessageController.prototype.$onInit = function () {
        };
        // Display the send modal
        SendMessageController.prototype.showSendModal = function () {
            this.shouldShowSendModal = true;
            this.sendResultMessage = "";
            this.shouldShowButtons = true;
            // Focus on the message box once displayed
            setTimeout(function () { return document.getElementById("message-text-box").focus(); }, 50);
        };
        // Hide the send modal
        SendMessageController.prototype.hideModal = function () {
            this.shouldShowSendModal = false;
            this.messageBody = "";
        };
        // Send the user's message
        SendMessageController.prototype.sendMessage = function () {
            var _this = this;
            this.shouldShowButtons = false;
            this.isSending = true;
            this.sendResultMessage = "";
            this.fellowResidents.sendMessage(this.recipientInfo.userId, this.messageBody, this.messageSubject).then(function (response) {
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
        ;
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
            this._rootScope = $rootScope;
            var deferred = $q.defer();
            $rootScope.isLoadingSite = true;
            var innerThis = this;
            var onSiteInfoReceived = function (siteInfo) {
                $rootScope.isLoadingSite = false;
                innerThis.handleSiteInfo(siteInfo, $rootScope);
                deferred.resolve();
            };
            var onRequestFailed = function () {
                $rootScope.isLoadingSite = false;
                deferred.reject();
            };
            // Retrieve information for the current association
            $http.get("/api/GroupSite").then(function (httpResponse) {
                // If we received data but the user isn't logged-in
                if (httpResponse.data && !httpResponse.data.userInfo) {
                    // Check the cross-domain localStorage for an auth token
                    innerThis.xdLocalStorage.getItem("allyApiAuthToken").then(function (response) {
                        // If we received an auth token then retry accessing the group data
                        if (response && HtmlUtil.isValidString(response.value)) {
                            //console.log( "Received cross domain token:" + response.value );
                            innerThis.setAuthToken(response.value);
                            $http.get("/api/GroupSite").then(function (httpResponse) {
                                onSiteInfoReceived(httpResponse.data);
                            }, onRequestFailed);
                        }
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
            if (siteInfo === null || siteInfo === "null") {
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
                            siteLogo: "<span style='font-size: 22pt; color: #FFF;'>Welcome to " + AppConfig.appName + "</span>"
                        };
                }
                else {
                    // Go to generic login                
                    GlobalRedirect("https://login." + AppConfig.baseTld + "/#!/Login");
                    return;
                }
            }
            // Store the site info to the root scope for access by the app module
            $rootScope.publicSiteInfo = siteInfo.publicSiteInfo;
            this.publicSiteInfo = siteInfo.publicSiteInfo;
            if (this.publicSiteInfo.gpsPosition && typeof (google) !== "undefined")
                this.publicSiteInfo.googleGpsPosition = new google.maps.LatLng(this.publicSiteInfo.gpsPosition.lat, this.publicSiteInfo.gpsPosition.lon);
            // Handle private (logged-in only) info
            var privateSiteInfo = siteInfo.privateSiteInfo;
            if (!privateSiteInfo)
                privateSiteInfo = {};
            this.privateSiteInfo = privateSiteInfo;
            // Set the site title
            document.title = this.publicSiteInfo.fullName;
            this.userInfo = siteInfo.userInfo;
            $rootScope.userInfo = siteInfo.userInfo;
            if (HtmlUtil.isLocalStorageAllowed())
                window.localStorage.setItem("siteInfo", angular.toJson(this.publicSiteInfo));
            // If the user is logged-in
            this.isLoggedIn = $rootScope.userInfo !== null && $rootScope.userInfo !== undefined;
            $rootScope.isLoggedIn = this.isLoggedIn;
            if (this.isLoggedIn) {
                if (typeof ($zopim) !== "undefined") {
                    $zopim(function () {
                        $zopim.livechat.setName($rootScope.userInfo.firstName + " " + $rootScope.userInfo.lastName);
                        if ($rootScope.userInfo.emailAddress.indexOf("@") !== -1)
                            $zopim.livechat.setEmail($rootScope.userInfo.emailAddress);
                    });
                }
                $rootScope.isAdmin = $rootScope.userInfo.isAdmin;
                $rootScope.isSiteManager = $rootScope.userInfo.isSiteManager;
                // Tell Segment we know who the user is
                if (typeof (analytics) !== "undefined") {
                    analytics.identify($rootScope.userInfo.emailAddress, {
                        name: $rootScope.userInfo.fullName
                    });
                }
            }
            else {
                $rootScope.userInfo = null;
                // If we're not at the log-in page, the get us there
                var LoginPath = "#!/Login";
                if (window.location.hash != LoginPath && !AppConfig.isPublicRoute(window.location.hash)) {
                    // If we're at a valid subdomain
                    if (this.publicSiteInfo && this.publicSiteInfo.baseUrl) {
                        // Need to set the hash "manually" as $location is not available in the config
                        // block and GlobalRedirect will go to the wrong TLD when working locally
                        window.location.hash = LoginPath;
                        //$location.path( "/Login" );
                        //GlobalRedirect( this.publicSiteInfo.baseUrl + loginPath );
                    }
                    else
                        GlobalRedirect(AppConfig.baseUrl + LoginPath);
                }
            }
            // Update the background
            if (!HtmlUtil.isNullOrWhitespace(this.publicSiteInfo.bgImagePath))
                $(document.documentElement).css("background-image", "url(" + $rootScope.bgImagePath + this.publicSiteInfo.bgImagePath + ")");
            // If we need to redirect
            if (this.publicSiteInfo.baseUrl) {
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
                alert("Not yet loaded!");
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
        function TodoListCtrl($http) {
            this.$http = $http;
            this.todoLists = [];
            this.isLoading = false;
            this.isFixedList = false;
            this.shouldExpandTodoItemModal = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        TodoListCtrl.prototype.$onInit = function () {
            this.isFixedList = !!this.fixedTodoListId;
            if (this.isFixedList)
                this.loadFixedTodoList();
            else
                this.loadAllTodoLists();
        };
        /**
         * Retrieve a todo list
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
         * Retrieve the todo lists
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
                _this.loadAllTodoLists();
            });
        };
        /**
         * Create a new to-do item
         */
        TodoListCtrl.prototype.onAddItem = function (todoListId) {
            var _this = this;
            this.isLoading = true;
            var postUri = "/api/Todo/newItem/" + todoListId + "?description=" + encodeURIComponent(this.newItemDescription);
            this.$http.post(postUri, null).then(function (response) {
                _this.isLoading = false;
                _this.newItemDescription = "";
                _this.loadAllTodoLists();
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
            this.$http.post(postUri, this.editTodoItem).then(function (response) {
                _this.isLoading = false;
                _this.newItemDescription = "";
                _this.editTodoItem = null;
                _this.loadAllTodoLists();
            });
        };
        /**
         * Toggle an item's completed state
         */
        TodoListCtrl.prototype.onToggleComplete = function (todoListId, todoItemId) {
            var _this = this;
            this.isLoading = true;
            this.$http.put("/api/Todo/toggleComplete/" + todoListId + "/" + todoItemId, null).then(function (response) {
                _this.isLoading = false;
                _this.loadAllTodoLists();
            });
        };
        TodoListCtrl.$inject = ["$http"];
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

        $http.get( "/api/Member" ).then( function( httpResponse )
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
    var LocalNewsResource = $resource( 'https://localnewsally.org/api/LocalNews', null, { cache: true } );


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
        zipCode: SiteInfo.publicSiteInfo.zipCode,
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

    //var debugKey = "AIzaSyD5fTq9-A3iDFpPSUtRR0Qr38l-xl694b0";
    //var releaseKey = "AIzaSyCiRqxdfryvJirNOjZlQIFwYhHXNAoDtHI";

    //var script = document.createElement( 'script' );
    //script.type = 'text/javascript';
    //script.src = "https://maps.googleapis.com/maps/api/js?sensor=false&key=" + debugKey + "&callback=WelcomeJS.onMapApiLoaded";
    //document.body.appendChild( script );

    vm.refreshData();
}

WatchMembersCtrl.$inject = [ "$rootScope", "$resource", "SiteInfo" ];