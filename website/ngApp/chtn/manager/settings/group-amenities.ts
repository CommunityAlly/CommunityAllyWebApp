namespace Ally
{
    /**
     * The controller for the manage polls page
     */
    export class GroupAmenitiesController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$location"];

        groupAmenities: GroupAmenities;
        appShortName: string;
        isLoading: boolean = false;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService,
            private siteInfo: Ally.SiteInfoService,
            private $location: ng.ILocationService )
        {
            this.appShortName = AppConfig.appShortName;
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.isLoading = true;

            this.$http.get( "/api/Association/GroupAmenities" ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<GroupAmenities> ) =>
                {
                    this.isLoading = false;
                    this.groupAmenities = httpResponse.data;
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to retrieve amenity data: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        /**
        * Called when the user clicks the save button
        */
        saveForm()
        {
            this.isLoading = true;

            this.$http.put( "/api/Association/GroupAmenities", this.groupAmenities ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<GroupAmenities> ) =>
                {
                    this.$location.path( "/Home" );
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to save: " + httpResponse.data.exceptionMessage );
                }
            );
        }
    }


    class GroupAmenities
    {
        constructionDecade: number | null;
        associationPaysForWater: boolean | null;
        associationPaysForElectric: boolean | null;
        associationPaysForGas: boolean | null;
        associationPaysForGarbage: boolean | null;
        hasClubHouse: boolean | null;
        numPools: number | null;
        landscapeSpending: number | null;
        maintainsOwnRoads: boolean | null;
        isGatedCommunity: boolean | null;
        hasDoorman: boolean | null;
        hasCommonBalconies: boolean | null;
        exteriorMaterial: string | null;
        hiresPropertyManager: boolean | null;
        lastUpdateDateUtc: Date | null;
        lastUpdateUserId: string | null;
    }
}


CA.angularApp.component( "groupAmenities", {
    templateUrl: "/ngApp/chtn/manager/settings/group-amenities.html",
    controller: Ally.GroupAmenitiesController
} );