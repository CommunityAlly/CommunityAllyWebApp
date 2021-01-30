namespace Ally
{
    class GroupEntry
    {
        groupId: number;
        baseUrl: string;
        shortName: string;
        appName: number;
        appNameString: string;
    }


    class FoundGroup
    {
        groupId: number;
        appName: number;
        shortName: string;

        // Not from the server
        viewUrl: string;
    }


    /**
     * The controller for the admin-only page to edit group boundary polygons
     */
    export class ManageGroupsController implements ng.IController
    {
        static $inject = ["$timeout", "$http", "SiteInfo"];
        groups: GroupEntry[];
        newAssociation: GroupEntry = new GroupEntry();
        changeShortNameData: any = { appName: "Condo" };
        isLoading: boolean;
        isLoadingHelper: boolean;
        findUserAssociationsEmail: string;
        foundUserAssociations: FoundGroup[];
        newAddressId: number;
        newAddress: string;
        testEmailRecipient: string;
        testTaylorEmailRecipient: string;
        testPostmarkEmail: string;
        inactiveShortNames: string;
        logInAsEmail: string;
        sendTestFromInmail: boolean = false;
        curGroupApiUri: string;
        curGroupId: string;
        noReplyEmailInfo = {
            to: "",
            subject: "",
            body: ""
        };
        changeShortNameResult: string;
        populateDocUsageGroupId: number;
        newAllyPaymentEntry: AllyPaymentEntry;


        /**
        * The constructor for the class
        */
        constructor( private $timeout: ng.ITimeoutService, private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.curGroupApiUri = this.siteInfo.publicSiteInfo.baseApiUrl;
            this.curGroupId = this.curGroupApiUri.substring( "https://".length, this.curGroupApiUri.indexOf(".") );

            // A little shortcut for updating
            if( AppConfig.appShortName === "hoa" )
                this.changeShortNameData.appName = "Hoa";
            this.changeShortNameData.old = this.siteInfo.publicSiteInfo.shortName;

            this.newAllyPaymentEntry = {
                paymentId: 0,
                groupId: parseInt( this.curGroupId ),
                amount: 0,
                netAmount: null,
                description: "Annual Premium Plan",
                entryDateUtc: new Date(),
                paymentMethod: "Check",
                paymentMethodId: "",
                status: "Complete"
            };
        }


        /**
         * Retrieve the active group list
         */
        retrieveGroups = function()
        {
            this.isLoading = true;

            var innerThis = this;
            this.$http.get( "/api/Association/AdminList" ).then(( response: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                innerThis.isLoading = false;
                innerThis.groups = response.data;

                // Add the app type string
                _.each( innerThis.groups, function( g: GroupEntry )
                {
                    if( g.appName === 0 )
                    {
                        g.appNameString = "Condo";
                        g.baseUrl = "https://" + g.shortName + ".CondoAlly.com/";
                    }
                    else if( g.appName === 1 )
                    {
                        g.appNameString = "NeighborhoodWatch";
                        g.baseUrl = "https://" + g.shortName + ".WatchAlly.com/";
                    }
                    else if( g.appName === 2 )
                    {
                        g.appNameString = "Home";
                        g.baseUrl = "https://" + g.shortName + ".HomeAlly.org/";
                    }
                    else if( g.appName === 3 )
                    {
                        g.appNameString = "Hoa";
                        g.baseUrl = "https://" + g.shortName + ".HoaAlly.org/";
                    }
                    else if( g.appName === 4 )
                    {
                        g.appNameString = "Neighborhood";
                        g.baseUrl = "https://" + g.shortName + ".NeighborhoodAlly.org/";
                    }
                    else if( g.appName === 5 )
                    {
                        g.appNameString = "PTA";
                        g.baseUrl = "https://" + g.shortName + ".PTAAlly.org/";
                    }
                    else if( g.appName === 6 )
                    {
                        g.appNameString = "BlockClub";
                        g.baseUrl = "https://" + g.shortName + ".BlockClubAlly.org/";
                    }
                } );
            }, function()
                {
                    innerThis.isLoading = false;
                    alert( "Failed to retrieve groups" );
                } );
        }


        /**
         * Change a group's short name
         */
        changeShortName()
        {
            this.changeShortNameResult = null;

            // Make sure the new short name is only letters and numbers and lower case
            if( /[^a-zA-Z0-9]/.test( this.changeShortNameData.newShortName ) )
            {
                alert( "The new short name must be alphanumeric" );
                return;
            }

            if( this.changeShortNameData.newShortName !== this.changeShortNameData.newShortName.toLowerCase() )
            {
                alert( "The new short name must be lower-case" );
                return;
            }

            if( this.changeShortNameData.newShortName.length === 0 )
            {
                alert( "New short name must not be empty" );
                return;
            }

            this.isLoading = true;

            this.$http.put( "/api/AdminHelper/ChangeShortName?oldShortName=" + this.changeShortNameData.old + "&newShortName=" + this.changeShortNameData.newShortName + "&appName=" + this.changeShortNameData.appName, null ).then( ( response: ng.IHttpPromiseCallbackArg<any> ) =>
            {
                this.isLoading = false;
                this.changeShortNameResult = "Successfully changed";

            }, ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
            {
                this.isLoading = false;
                this.changeShortNameResult = "Failed to change: " + response.data.exceptionMessage;
            } );
        }


        /**
         * Find the groups to which a user, via e-mail address, belongs
         */
        findAssociationsForUser()
        {
            this.isLoading = true;

            this.$http.get( "/api/AdminHelper/FindAssociationsForUser?email=" + this.findUserAssociationsEmail ).then( ( response: ng.IHttpPromiseCallbackArg<FoundGroup[]> ) =>
            {
                this.isLoading = false;
                this.foundUserAssociations = response.data;

                _.forEach( this.foundUserAssociations, g =>
                {
                    g.viewUrl = `https://${g.shortName}.condoally.com/`;
                    if( g.appName === 3 )
                        g.viewUrl = `https://${g.shortName}.hoaally.org/`;
                } );

            }, () =>
            {
                this.isLoading = false;
                alert( "Failed to find associations for user" );
            } );
        }


        /**
         * Delete a CHTN group
         */
        deleteAssociation( association: GroupEntry )
        {
            if( !confirm( "Are you sure you want to delete this association?" ) )
                return;

            this.isLoading = true;

            var innerThis = this;
            this.$http.delete( "/api/Association/chtn/" + association.groupId ).then(() =>
            {
                innerThis.isLoading = false;

                innerThis.retrieveGroups();
            }, ( error: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    innerThis.isLoading = false;

                    console.log( error.data.exceptionMessage );
                    alert( "Failed to delete group: " + error.data.exceptionMessage );
                } );
        }


        /**
         * Add an address to full address
         */
        addAddress()
        {
            this.newAddressId = null;
            this.isLoading = true;

            this.$http.post( "/api/AdminHelper/AddAddress?address=" + encodeURIComponent( this.newAddress ), null ).then(
                ( response: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    this.isLoading = false;
                    this.newAddressId = response.data.newAddressId;
                },
                ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to add address: " + response.data.exceptionMessage );
                }
            );
        }


        /**
         * Occurs when the user presses the button to create a new association
         */
        onCreateAssociationClick()
        {
            this.isLoading = true;

            var innerThis = this;
            this.$http.post( "/api/Association", this.newAssociation ).then(() =>
            {
                innerThis.isLoading = false;

                innerThis.newAssociation = new GroupEntry();

                innerThis.retrieveGroups();
            } );
        }


        onSendTestEmail()
        {
            this.makeHelperRequest( `/api/AdminHelper/SendTestEmail?testEmailRecipient=${encodeURIComponent( this.testEmailRecipient )}&sendFromInmail=${this.sendTestFromInmail ? 'true' : 'false'}` );
        }


        onSendTaylorTestEmail()
        {
            this.makeHelperRequest( "/api/AdminHelper/SendFromTaylorEmail?testEmailRecipient=" + encodeURIComponent( this.testTaylorEmailRecipient ) );
        }


        onSendTaylorBulkUpdateEmail()
        {
            if( !confirm( "Are you sure you want to SEND TO EVERYONE?!?!" ) )
                return;

            this.makeHelperRequest( "/api/AdminHelper/SendBulkTaylorEmail3" );
        }


        onSendTestPostmarkEmail()
        {
            this.isLoading = true;

            var innerThis = this;
            this.$http.get( "/api/AdminHelper/SendTestPostmarkEmail?email=" + this.testPostmarkEmail ).success( function()
            {
                innerThis.isLoading = false;
                alert( "Successfully sent email" );
            } ).error( function()
            {
                innerThis.isLoading = false;
                alert( "Failed to send email" );
            } );
        }


        onSendNoReplyEmail()
        {
            this.isLoading = true;
            
            this.$http.post( "/api/AdminHelper/SendNoReplyPostmarkEmail", this.noReplyEmailInfo ).then( () =>
            {
                this.isLoading = false;
                alert( "Successfully sent email" );

            }, (response: ng.IHttpPromiseCallbackArg<ExceptionResult>) =>
            {
                this.isLoading = false;
                alert( "Failed to send email: " + response.data.exceptionMessage );
            } );
        }


        makeHelperRequest( apiPath: string, postData: any = null )
        {
            this.isLoadingHelper = true;

            var request;
            if( postData )
                request = this.$http.post( apiPath, postData );
            else
                request = this.$http.get( apiPath );

            var innerThis = this;
            request.then(
                () => innerThis.isLoadingHelper = false,
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    innerThis.isLoadingHelper = false;

                    const msg = response.data ? response.data.exceptionMessage : "";
                    alert( "Failed: " + msg );
                }
            );
        }


        onTestException()
        {
            this.makeHelperRequest( "/api/AdminHelper/TestException" );
        }

        onClearElmahLogs()
        {
            this.makeHelperRequest( "/api/AdminHelper/ClearElmah" );
        }


        onClearCurrentAppGroupCache()
        {
            this.makeHelperRequest( "/api/AdminHelper/ClearCurrentGroupFromCache" );
        }


        onClearEntireAppGroupCache()
        {
            this.makeHelperRequest( "/api/AdminHelper/ClearGroupCache" );
        }


        onSendInactiveGroupsMail()
        {
            var postData = {
                shortNameLines: this.inactiveShortNames
            };

            this.makeHelperRequest( "/api/AdminHelper/SendInactiveGroupsMail", postData );
        }


        logInAs()
        {
            this.isLoading = true;

            this.$http.get( "/api/AdminHelper/LogInAs?email=" + this.logInAsEmail ).then(
                ( response: ng.IHttpPromiseCallbackArg<string> ) =>
                {
                    this.siteInfo.setAuthToken( response.data );
                    window.location.href = "/#!/Home";
                    window.location.reload( false );
                },
                ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    alert( "Failed to perform login: " + response.data.exceptionMessage );
                }
            ).finally( () => this.isLoading = false );
        }


        populateEmptyDocumentUsage()
        {
            this.isLoading = true;

            let getUri = "/api/AdminHelper/FillInMissingDocumentUsage?numGroups=10";
            if( this.populateDocUsageGroupId )
                getUri += "&groupId=" + this.populateDocUsageGroupId;

            this.$http.get( getUri ).then(
                ( response: ng.IHttpPromiseCallbackArg<string> ) =>
                {
                    this.isLoading = false;
                    alert( "Succeeded: " + response.data );
                },
                ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed: " + response.data.exceptionMessage );
                }
            );
        }


        onAddAllyPayment()
        {
            this.isLoading = true;

            this.$http.post( "/api/AdminHelper/AddAllyPaymentEntry", this.newAllyPaymentEntry ).then(
                ( response: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    this.isLoading = false;
                    this.newAllyPaymentEntry.amount = 0;
                    this.newAllyPaymentEntry.netAmount = null;
                    this.newAllyPaymentEntry.paymentMethodId = "";
                    alert( "Succeeded" );
                },
                ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed: " + response.data.exceptionMessage );
                }
            );
        }
    }

    class AllyPaymentEntry
    {
        paymentId: number;
        groupId: number;
        description: string;
        entryDateUtc: Date;
        amount: number;
        netAmount: number | null;
        paymentMethod: string;
        paymentMethodId: string;
        status: string;
    }
}


CA.angularApp.component( "manageGroups", {
    templateUrl: "/ngApp/admin/manage-groups.html",
    controller: Ally.ManageGroupsController
} );