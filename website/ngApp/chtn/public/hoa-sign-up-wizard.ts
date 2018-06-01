/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />


namespace Ally
{
    export class HoaSignerUpInfo
    {
        email: string;
        firstName: string;
        lastName: string;
        boardPositionValue: number = 1;
    }

    export class HoaSignUpInfo
    {
        name: string = "";
        streetAddress: string = "";
        isResident: boolean = true;
        signerUpInfo: HoaSignerUpInfo = new HoaSignerUpInfo();
        boundsGpsVertices: any[];
    }


    /**
     * The controller for the HOA Ally sign-up page
     */
    export class HoaSignUpWizardController implements ng.IController
    {
        static $inject = ["$scope", "$http", "$timeout", "WizardHandler"];

        placeWasSelected = false;
        shouldCheckAddress = false;
        isLoading = false;
        addressAutocomplete: google.maps.places.Autocomplete;
        map: google.maps.Map = null;
        mapMarker: google.maps.Marker;
        isLoadingMap = false;
        hideWizard = false;
        resultMessage: string;
        hoaPoly: any = { vertices: [] };
        showMap = false;

        // The default sign-up info object
        signUpInfo = new Ally.HoaSignUpInfo();


        /**
        * The constructor for the class
        */
        constructor( private $scope: ng.IScope, private $http: ng.IHttpService, private $timeout: ng.ITimeoutService, private WizardHandler: any )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            var innerThis = this;

            var innerThis = this;
            this.$scope.$on( 'wizard:stepChanged', function( event, args )
            {
                if( args.index === 1 )
                    innerThis.$timeout(() => innerThis.showMap = true, 50 );
                else
                    innerThis.showMap = false;
            } );
        }


        /**
         * Center the Google map on a polygon
         */
        centerMap( geometry: any )
        {
            // If the place has a geometry, then present it on a map.
            if( geometry.viewport )
            {
                this.map.fitBounds( geometry.viewport );
            } else
            {
                this.map.setCenter( geometry.location );
                this.map.setZoom( 17 );  // Why 17? Because it looks good.
            }

            this.mapMarker.setPosition( geometry.location );
            this.mapMarker.setVisible( true );
        }


        /**
         * Perform initialization to create the map and hook up address autocomplete
         */
        initMapStep()
        {
            if( typeof ( ( <any>window ).analytics ) !== "undefined" )
                ( <any>window ).analytics.track( "condoSignUpStarted" );

            this.showMap = true;

            var addressInput = <HTMLInputElement>document.getElementById( "association-address-text-box" );
            if( addressInput )
            {
                this.addressAutocomplete = new google.maps.places.Autocomplete( addressInput );
                this.addressAutocomplete.bindTo( 'bounds', this.map );
            }

            this.mapMarker = new google.maps.Marker( {
                map: this.map,
                position: null,
                anchorPoint: new google.maps.Point( 41.969638, -87.657423 ),
                icon: "/assets/images/MapMarkers/MapMarker_Home.png"
            } );

            // Occurs when the user selects a Google suggested address
            if( this.addressAutocomplete )
            {
                var innerThis = this;

                var onPlaceChanged = function()
                {
                    innerThis.setPlaceWasSelected();

                    //infowindow.close();
                    innerThis.mapMarker.setVisible( false );
                    var place = innerThis.addressAutocomplete.getPlace();


                    var readableAddress = place.formatted_address;

                    // Remove the trailing country if it's USA
                    if( readableAddress.indexOf( ", USA" ) === readableAddress.length - ", USA".length )
                        readableAddress = readableAddress.substring( 0, readableAddress.length - ", USA".length );

                    innerThis.signUpInfo.streetAddress = readableAddress;

                    if( !place.geometry )
                        return;

                    innerThis.setEditPolyForAddress( place.geometry.location );

                    innerThis.centerMap( place.geometry );
                };

                this.addressAutocomplete.addListener( 'place_changed', function()
                {
                    innerThis.$scope.$apply( onPlaceChanged );
                } );
            }
        }


        onMapEditorReady( mapInstance: google.maps.Map )
        {
            this.map = mapInstance;
            this.initMapStep();
        }


        /**
         * Refresh the map to center typed in address
         */
        checkAddress()
        {
            if( this.placeWasSelected || !this.shouldCheckAddress )
                return;

            this.shouldCheckAddress = false;
            this.refreshMapForAddress();
        }


        /**
         * Occurs when the user selects an address from the Google suggestions
         */
        setPlaceWasSelected()
        {
            this.placeWasSelected = true;
            this.shouldCheckAddress = false;

            // Clear the flag in case the user types in a new address
            var innerThis = this;
            setTimeout( function()
            {
                innerThis.placeWasSelected = true;
            }, 500 );
        }


        /**
         * Refresh the map edit box when a place is geocoded
         */
        setEditPolyForAddress( homePos: google.maps.LatLng )
        {
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
        }



        /**
         * Refresh the map to center typed in address
         */
        refreshMapForAddress()
        {
            this.isLoadingMap = true;

            var innerThis = this;
            HtmlUtil.geocodeAddress( this.signUpInfo.streetAddress, function( results, status )
            {
                innerThis.$scope.$apply( function()
                {
                    innerThis.isLoadingMap = false;

                    if( status != google.maps.GeocoderStatus.OK )
                    {
                        //$( "#GeocodeResultPanel" ).text( "Failed to find address for the following reason: " + status );
                        return;
                    }

                    var readableAddress = results[0].formatted_address;

                    // Remove the trailing country if it's USA
                    if( readableAddress.indexOf( ", USA" ) === readableAddress.length - ", USA".length )
                        readableAddress = readableAddress.substring( 0, readableAddress.length - ", USA".length );

                    innerThis.signUpInfo.streetAddress = readableAddress;

                    if( !results[0].geometry )
                        return;

                    innerThis.setEditPolyForAddress( results[0].geometry.location );

                    innerThis.centerMap( results[0].geometry );
                } );
            } );
        }


        /**
         * Called when the user press the button to complete the sign-up process
         */
        onFinishedWizard()
        {
            this.isLoading = true;

            this.signUpInfo.boundsGpsVertices = this.hoaPoly.vertices;

            var innerThis = this;
            this.$http.post( "/api/SignUpWizard/Hoa", this.signUpInfo ).then( function( httpResponse )
            {
                innerThis.isLoading = false;

                var signUpResult: any = httpResponse.data;

                // If the was an error creating the site
                if( !HtmlUtil.isNullOrWhitespace( signUpResult.errorMessage ) )
                {
                    alert( "Failed to complete sign-up: " + signUpResult.errorMessage );
                    innerThis.WizardHandler.wizard().goTo( signUpResult.stepIndex );
                }
                // Otherwise create succeeded
                else
                {
                    if( typeof ( ( <any>window ).analytics ) !== "undefined" )
                        ( <any>window ).analytics.track( "condoSignUpComplete" );

                    // Log this as a conversion
                    if( typeof ( ( <any>window ).goog_report_conversion ) !== "undefined" )
                        ( <any>window ).goog_report_conversion();

                    if( typeof ( ( <any>window ).capterra_report_conversion ) !== "undefined" )
                        ( <any>window ).capterra_report_conversion();

                    // Or if the user created an active signUpResult
                    if( !HtmlUtil.isNullOrWhitespace( signUpResult.createUrl ) )
                    {
                        window.location.href = signUpResult.createUrl;
                    }
                    // Otherwise the user needs to confirm sign-up via e-mail
                    else
                    {
                        innerThis.hideWizard = true;

                        innerThis.resultMessage = "Great work! We just sent you an e-mail with instructions on how access your new site.";
                    }
                }

            }, function( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> )
            {
                innerThis.isLoading = false;

                alert( "Failed to complete sign-up: " + httpResponse.data.exceptionMessage );
            } );
        }
    }
}


CA.angularApp.component( "hoaSignUpWizard", {
    templateUrl: "/ngApp/chtn/public/hoa-sign-up-wizard.html",
    controller: Ally.HoaSignUpWizardController
} );