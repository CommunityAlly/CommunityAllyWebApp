﻿namespace Ally
{
    class GroupEntry
    {
        groupId: number;
        baseUrl: string;
        shortName: string;
        appName: number;
        appNameString: string;
    }


    export class FoundGroup
    {
        groupId: number;
        appName: number;
        friendlyAppName: string;
        shortName: string;
        fullName: string;
        groupUrl: string;
        deactivationDateUtc: Date;

        // Not from the server
        viewUrl: string;
        dropDownLabel: string;
    }


    /**
     * The controller for the admin-only page to edit group boundary polygons
     */
    export class ManageGroupsController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$timeout"];
        groups: GroupEntry[];
        newAssociation: GroupEntry = new GroupEntry();
        changeShortNameData: any = { appName: "Condo" };
        isLoading: boolean;
        isLoadingHelper: boolean;
        isLoadingAllyAppSettings: boolean;
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
        curGroupCreationDate: Date;
        stripeConnectAccountId: string;
        noReplyEmailInfo = {
            to: "",
            subject: "",
            body: ""
        };
        changeShortNameResult: string;
        populateDocUsageGroupId: number;
        newAllyPaymentEntry: AllyPaymentEntry;
        premiumUpdateGroupId: number;
        premiumNewCost: number;
        premiumNewExpiration: Date;
        deactivateGroupIdsCsv: string;
        reactivateGroupId: number;
        allAllyAppSettings: AllyAppSetting[];
        editAllyAppSetting: AllyAppSetting;
        reactivateEmail: string;
        newAllyAppChangeLogEntry = new AllyAppChangeLogEntry();
        premiumPlanExpiration: Date;
        alliesOfAllyUsers: AllyOfAllyUser[];


        /**
        * The constructor for the class
        */
        constructor( private $http: ng.IHttpService, private siteInfo: Ally.SiteInfoService, private $timeout: ng.ITimeoutService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.curGroupApiUri = this.siteInfo.publicSiteInfo.baseApiUrl;
            this.curGroupId = this.curGroupApiUri.substring( "https://".length, this.curGroupApiUri.indexOf(".") );
            this.curGroupCreationDate = this.siteInfo.privateSiteInfo.creationDate;
            this.stripeConnectAccountId = this.siteInfo.privateSiteInfo.stripeConnectAccountId;
            this.premiumUpdateGroupId = parseInt(this.curGroupId);
            
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
                paymentDateUtc: new Date(),
                paymentMethod: "Check",
                paymentMethodId: "",
                status: "Complete"
            };

            this.$http.get( "/api/Settings/GetSiteSettings" ).then( ( response: ng.IHttpPromiseCallbackArg<ChtnSiteSettings> ) =>
            {
                this.premiumPlanExpiration = response.data.premiumPlanExpirationDate;
            } );

            this.$timeout( () => this.loadAllyAppSettings(), 100 );
        }


        /**
         * Retrieve the active group list
         */
        retrieveGroups = function()
        {
            this.isLoading = true;

            this.$http.get( "/api/Association/AdminList" ).then(
                ( response: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    this.isLoading = false;
                    this.groups = response.data;

                    // Add the app type string
                    _.each( this.groups, function( g: GroupEntry )
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
                },
                () =>
                {
                    this.isLoading = false;
                    alert( "Failed to retrieve groups" );
                }
            );
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
         * Find the groups to which a user, via email address, belongs
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
                    if( g.appName === 2 )
                        g.viewUrl = `https://${g.shortName}.homeally.org/`;
                    else if( g.appName === 3 )
                        g.viewUrl = `https://${g.shortName}.hoaally.org/`;
                    else if( g.appName === 4 )
                        g.viewUrl = `https://${g.shortName}.NeighborhoodAlly.org/`;
                    else if( g.appName === 6 )
                        g.viewUrl = `https://${g.shortName}.BlockClubAlly.org/`;
                    else
                        console.log( "Unknown appName value: " + g.appName );
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
            if( !confirm( `Are you sure you want to delete this (${association.shortName}, ID: ${association.groupId}) association?` ) )
                return;

            this.isLoading = true;

            this.$http.delete( "/api/Association/chtn/" + association.groupId ).then(
                () =>
                {
                    this.isLoading = false;

                    this.retrieveGroups();
                },
                ( error: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;

                    console.log( error.data.exceptionMessage );
                    alert( "Failed to delete group: " + error.data.exceptionMessage );
                }
            );
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
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
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

            this.$http.post( "/api/Association", this.newAssociation ).then(
                () =>
                {
                    this.isLoading = false;

                    this.newAssociation = new GroupEntry();

                    this.retrieveGroups();
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to create group: " + response.data.exceptionMessage );
                }
            );
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

            this.$http.get( "/api/AdminHelper/SendTestPostmarkEmail?email=" + this.testPostmarkEmail ).then(
                () =>
                {
                    this.isLoading = false;
                    alert( "Successfully sent email" );
                },
                () =>
                {
                    this.isLoading = false;
                    alert( "Failed to send email" );
                }
            );
        }


        onSendTestCalendarEmail()
        {
            this.isLoading = true;

            this.$http.get( "/api/AdminHelper/SendTestCalendarEmail" ).then(
                () =>
                {
                    this.isLoading = false;
                    alert( "Successfully sent email" );
                },
                () =>
                {
                    this.isLoading = false;
                    alert( "Failed to send email" );
                }
            );
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

            let request;
            if( postData )
                request = this.$http.post( apiPath, postData );
            else
                request = this.$http.get( apiPath );

            request.then(
                () => this.isLoadingHelper = false,
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoadingHelper = false;

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
            const postData = {
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
                    window.location.reload();
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


        refreshCurGroupDocumentUsage()
        {
            this.isLoading = true;

            const getUri = "/api/AdminHelper/RecalcGroupDocumentUsage?groupId=" + this.curGroupId;

            this.$http.get( getUri ).then(
                ( response: ng.IHttpPromiseCallbackArg<string> ) =>
                {
                    this.isLoading = false;
                    console.log( "Recalc Succeeded", response.data );
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


        updatePremiumCost()
        {
            this.isLoading = true;

            const postUri = `/api/AdminHelper/SetPremiumCost/${this.premiumUpdateGroupId}?cost=${this.premiumNewCost}`;
            this.$http.put( postUri, null ).then(
                ( response: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    this.isLoading = false;
                    this.premiumNewCost = 0;
                    alert( "Succeeded" );
                },
                ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed: " + response.data.exceptionMessage );
                }
            );
        }


        updatePremiumExpiration()
        {
            if( !this.premiumNewExpiration )
            {
                alert( "Hey, dummy, enter a date. Ha!" );
                return;
            }

            this.isLoading = true;

            const postUri = `/api/AdminHelper/SetPremiumExpiration/${this.premiumUpdateGroupId}?expirationDate=${encodeURIComponent(this.premiumNewExpiration.toISOString())}`;
            this.$http.put( postUri, null ).then(
                ( response: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    this.isLoading = false;
                    this.premiumNewExpiration = null;
                    alert( "Succeeded" );
                },
                ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed: " + response.data.exceptionMessage );
                }
            );
        }


        onDeactivateGroup()
        {
            this.isLoading = true;

            const getUri = `/api/AdminHelper/DeactivateGroups?groupIdsCsv=${this.deactivateGroupIdsCsv}`;
            this.$http.get( getUri ).then(
                ( response: ng.IHttpPromiseCallbackArg<string> ) =>
                {
                    this.isLoading = false;
                    this.deactivateGroupIdsCsv = null;
                    alert( "Deactivate Group Succeeded: " + response.data );
                },
                ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Deactivate Group Failed: " + response.data.exceptionMessage );
                }
            );
        }


        onReactivateGroup()
        {
            this.isLoading = true;

            const getUri = `/api/AdminHelper/ReactivateGroup?groupId=${this.reactivateGroupId}`;
            this.$http.get( getUri ).then(
                ( response: ng.IHttpPromiseCallbackArg<string> ) =>
                {
                    this.isLoading = false;
                    this.reactivateGroupId = null;
                    alert( "Reactivate Group Succeeded: " + response.data );
                },
                ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Reactivate Group Failed: " + response.data.exceptionMessage );
                }
            );
        }


        loadAllyAppSettings()
        {
            this.allAllyAppSettings = [];
            this.isLoadingAllyAppSettings = true;

            this.$http.get( `/api/AllyAppSettings/All` ).then(
                ( response: ng.IHttpPromiseCallbackArg<AllyAppSetting[]> ) =>
                {
                    this.isLoadingAllyAppSettings = false;
                    this.allAllyAppSettings = response.data;
                },
                ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoadingAllyAppSettings = false;
                    alert( "Failed to retrieve settings: " + response.data.exceptionMessage );
                }
            );
        }


        onReactivateEmail()
        {
            this.isLoading = true;

            const getUri = `/api/AdminHelper/ClearBadEmailStatus?emailAddress=${this.reactivateEmail}`;
            this.$http.get( getUri ).then(
                ( response: ng.IHttpPromiseCallbackArg<string> ) =>
                {
                    this.isLoading = false;
                    this.reactivateEmail = null;
                    alert( "Reactivate Email Succeeded: " + response.data );
                },
                ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Reactivate Failed: " + response.data.exceptionMessage );
                }
            );
        }


        onAddChangeLogEntry()
        {
            this.isLoading = true;

            const postUri = `/api/AllyAppChangeLog/AddNewEntry`;
            this.$http.post( postUri, this.newAllyAppChangeLogEntry ).then(
                ( response: ng.IHttpPromiseCallbackArg<string> ) =>
                {
                    this.isLoading = false;
                    this.newAllyAppChangeLogEntry = new AllyAppChangeLogEntry();
                    alert( "Successfully added new entry" );
                },
                ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Added Failed: " + response.data.exceptionMessage );
                }
            );
        }


        editAppSettingValue( curSetting: AllyAppSetting )
        {
            const newValue = prompt( "Enter the setting's new value", curSetting.settingValue );
            if( !newValue )
                return;

            curSetting.settingValue = newValue;

            this.isLoading = true;

            this.$http.put( `/api/AllyAppSettings/UpdateSetting`, curSetting ).then(
                () =>
                {
                    this.isLoading = false;
                    this.loadAllyAppSettings();
                },
                ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to update: " + response.data.exceptionMessage );
                }
            );
        }


        onAddNewAppSetting()
        {
            const newName = prompt( "Enter the new setting name" );
            if( !newName )
                return;

            const settingValue = prompt( "Enter the new setting's value" );
            if( !settingValue )
                return;

            const newSetting: AllyAppSetting = {
                settingId: 0,
                settingName: newName,
                settingValue: settingValue,
                settingType: "String",
                note: null
            };

            this.isLoading = true;

            this.$http.post( `/api/AllyAppSettings/AddSetting`, newSetting ).then(
                () =>
                {
                    this.isLoading = false;
                    this.loadAllyAppSettings();
                },
                ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Adding setting failed: " + response.data.exceptionMessage );
                }
            );
        }


        deleteAppSetting( curSetting: AllyAppSetting )
        {
            if( !confirm( `Are you sure you want to delete the '${curSetting.settingName}' setting? This cannot be undone.` ) )
                return;

            this.isLoading = true;

            this.$http.delete( `/api/AllyAppSettings/DeleteSetting/${curSetting.settingId}` ).then(
                () =>
                {
                    this.isLoading = false;
                    this.loadAllyAppSettings();
                },
                ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Adding setting failed: " + response.data.exceptionMessage );
                }
            );
        }


        loadAlliesOfAlly()
        {
            this.isLoading = true;

            this.$http.get( `/api/AdminHelper/AlliesOfAlly` ).then(
                (response:ng.IHttpPromiseCallbackArg<AllyOfAllyUser[]>) =>
                {
                    this.isLoading = false;
                    this.alliesOfAllyUsers = response.data;
                },
                ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to retreive allies: " + response.data.exceptionMessage );
                }
            );
        }
    }


    class AllyOfAllyUser
    {
        firstName: string;
        lastName: string;
        fullName: string;
        emailAddress: string;
        allyOfAllyLevel: number;
        allyOfAllyNotes: string;
        globalLastLoginDateUtc: string | null;
    }


    class AllyPaymentEntry
    {
        paymentId: number;
        groupId: number;
        description: string;
        entryDateUtc: Date;
        paymentDateUtc: Date;
        amount: number;
        netAmount: number | null;
        paymentMethod: string;
        paymentMethodId: string;
        status: string;
    }


    export class AllyAppSetting
    {
        settingId: number;
        settingName: string;
        settingValue: string;
        settingType: string;
        note: string;
    }


    export class AllyAppChangeLogEntry
    {
        changeLogId: number;
        title: string;
        description: string;
        addedDateUtc: Date = new Date();
        featureSize: number = 50;
    }
}


CA.angularApp.component( "manageGroups", {
    templateUrl: "/ngApp/admin/manage-groups.html",
    controller: Ally.ManageGroupsController
} );