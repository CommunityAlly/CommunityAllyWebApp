/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />


namespace Ally
{
    class TempNeighborhoodSignUpInfo
    {
        fullName: string = "";
        email: string = "";
        address: string = "";
        neighborhoodName: string = "";
        notes: string = "";
    }


    /**
     * The controller for the HOA Ally sign-up page
     */
    export class NeighborhoodSignUpWizardController implements ng.IController
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

        // For the temp form
        submitTempResult: string;
        tempSignUpInfo: TempNeighborhoodSignUpInfo = new TempNeighborhoodSignUpInfo();


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
            this.$scope.$on( 'wizard:stepChanged', ( event, args ) =>
            {
                if( args.index === 1 )
                    this.$timeout( () => this.showMap = true, 50 );
                else
                    this.showMap = false;
            } );

            setTimeout(() =>
            {
                const addressInput = <HTMLInputElement>document.getElementById( "signUpAddress" );
                if( addressInput )
                    new google.maps.places.Autocomplete( addressInput );
            }, 500 );
        }


        /**
         * Submit the 
         */
        onSubmitTempInfo()
        {
            this.isLoading = true;

            this.$http.post( "/api/SignUpWizard/TempNeighborhood", this.tempSignUpInfo ).then(
                () =>
                {
                    this.isLoading = false;
                    this.submitTempResult = "Thank you for your submission. We'll be in touch shortly.";

                },
                ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    this.submitTempResult = `Submission failed: ${response.data.exceptionMessage}. Feel free to refresh the page to try again or use the contact form at the bottom of the Community Ally home page.`;
                }
            );
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

            const addressInput = <HTMLInputElement>document.getElementById( "association-address-text-box" );
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
                const onPlaceChanged = () =>
                {
                    this.setPlaceWasSelected();

                    //infowindow.close();
                    this.mapMarker.setVisible( false );
                    const place = this.addressAutocomplete.getPlace();

                    let readableAddress = place.formatted_address;

                    // Remove the trailing country if it's USA
                    if( readableAddress.indexOf( ", USA" ) === readableAddress.length - ", USA".length )
                        readableAddress = readableAddress.substring( 0, readableAddress.length - ", USA".length );

                    this.signUpInfo.streetAddress = readableAddress;

                    if( !place.geometry )
                        return;

                    this.setEditPolyForAddress( place.geometry.location );

                    this.centerMap( place.geometry );
                };

                this.addressAutocomplete.addListener( 'place_changed', () =>
                {
                    this.$scope.$apply( onPlaceChanged );
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
            setTimeout( () =>
            {
                this.placeWasSelected = true;
            }, 500 );
        }


        /**
         * Refresh the map edit box when a place is geocoded
         */
        setEditPolyForAddress( homePos: google.maps.LatLng )
        {
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
        refreshMapForAddress()
        {
            this.isLoadingMap = true;

            HtmlUtil.geocodeAddress( this.signUpInfo.streetAddress,
                ( results, status ) =>
                {
                    // Need to run this in $apply since it's invoked outside of Angular's digest cycle
                    this.$scope.$apply( () =>
                    {
                        this.isLoadingMap = false;

                        if( status != google.maps.GeocoderStatus.OK )
                        {
                            //$( "#GeocodeResultPanel" ).text( "Failed to find address for the following reason: " + status );
                            return;
                        }

                        let readableAddress = results[0].formatted_address;

                        // Remove the trailing country if it's USA
                        if( readableAddress.indexOf( ", USA" ) === readableAddress.length - ", USA".length )
                            readableAddress = readableAddress.substring( 0, readableAddress.length - ", USA".length );

                        this.signUpInfo.streetAddress = readableAddress;

                        if( !results[0].geometry )
                            return;

                        this.setEditPolyForAddress( results[0].geometry.location );

                        this.centerMap( results[0].geometry );
                    } );
                }
            );
        }


        /**
         * Called when the user press the button to complete the sign-up process
         */
        onFinishedWizard()
        {
            this.isLoading = true;

            this.signUpInfo.boundsGpsVertices = this.hoaPoly.vertices;

            this.$http.post( "/api/SignUpWizard/Hoa", this.signUpInfo ).then(
                ( httpResponse ) =>
                {
                    this.isLoading = false;

                    const signUpResult: any = httpResponse.data;

                    // If the was an error creating the site
                    if( !HtmlUtil.isNullOrWhitespace( signUpResult.errorMessage ) )
                    {
                        alert( "Failed to complete sign-up: " + signUpResult.errorMessage );
                        this.WizardHandler.wizard().goTo( signUpResult.stepIndex );
                    }
                    // Otherwise create succeeded
                    else
                    {
                        if( typeof ( ( <any>window ).analytics ) !== "undefined" )
                            ( <any>window ).analytics.track( "condoSignUpComplete" );

                        // Log this as a conversion
                        if( typeof ( ( <any>window ).goog_report_conversion ) !== "undefined" )
                            ( <any>window ).goog_report_conversion();

                        // Or if the user created an active signUpResult
                        if( !HtmlUtil.isNullOrWhitespace( signUpResult.createUrl ) )
                        {
                            window.location.href = signUpResult.createUrl;
                        }
                        // Otherwise the user needs to confirm sign-up via email
                        else
                        {
                            this.hideWizard = true;

                            this.resultMessage = "Great work! We just sent you an email with instructions on how access your new site.";
                        }
                    }

                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;

                    alert( "Failed to complete sign-up: " + httpResponse.data.exceptionMessage );
                }
            );
        }
    }
}


CA.angularApp.component( "neighborhoodSignUpWizard", {
    templateUrl: "/ngApp/chtn/public/neighborhood-sign-up-wizard.html",
    controller: Ally.NeighborhoodSignUpWizardController
} );