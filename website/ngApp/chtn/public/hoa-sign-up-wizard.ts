﻿namespace Ally
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
        referralSource: string = "";
        recaptchaKey: string = "";
        numHomes: string;
    }


    /**
     * The controller for the HOA Ally sign-up page
     */
    export class HoaSignUpWizardController implements ng.IController
    {
        static $inject = ["$scope", "$http", "$timeout", "WizardHandler"];

        placeWasSelected: boolean = false;
        shouldCheckAddress: boolean = false;
        isLoading: boolean = false;
        shouldShowCondoMessage: boolean = false;
        addressAutocomplete: google.maps.places.Autocomplete;
        map: google.maps.Map = null;
        mapMarker: google.maps.Marker;
        isLoadingMap: boolean = false;
        hideWizard: boolean = false;
        resultMessage: string;
        hoaPoly: any = { vertices: [] };
        showMap = false;
        hoaAlertEmail: string;
        hoaAlertNumHomes: string;
        didSignUpForHoaAlert: boolean = false;
        isPageEnabled: boolean = null;

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
            this.signUpInfo.referralSource = HtmlUtil.GetQueryStringParameter( "utm_sourcecapterra" );

            // Normalize anything invalid to null
            if( HtmlUtil.isNullOrWhitespace( this.signUpInfo.referralSource ) )
                this.signUpInfo.referralSource = null;

            this.$scope.$on( 'wizard:stepChanged', ( event, args ) =>
            {
                if( args.index === 1 )
                    this.$timeout( () => this.showMap = true, 50 );
                else if( args.index === 2 )
                    this.$timeout( () => grecaptcha.render( "recaptcha-check-elem" ), 50 );
                else
                    this.showMap = false;
            } );

            this.$http.get( "/api/PublicAllyAppSettings/IsSignUpEnabled" ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<boolean> ) => this.isPageEnabled = httpResponse.data,
                ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    this.isPageEnabled = true; // Default to true if we can't get the setting
                    console.log( "Failed to get sign-up enabled status: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Occurs as the user presses keys in the HOA name field
         */
        onHoaNameChanged()
        {
            if( !this.signUpInfo || !this.signUpInfo.name )
            {
                this.shouldShowCondoMessage = false;
                return;
            }

            const shouldShowCondoMessage = this.signUpInfo.name.toLowerCase().indexOf( "condo" ) !== -1;

            if( shouldShowCondoMessage && !this.shouldShowCondoMessage )
                $( "#suggestCondoMessageLabel" ).css( "font-size", "1.3em" ).css( "margin", "25px auto" ).addClass( "alert alert-warning" ).fadeIn( 200 ).fadeOut( 200 ).fadeIn( 200 ).fadeOut( 200 ).fadeIn( 200 ).fadeIn( 200 ).fadeOut( 200 ).fadeIn( 200 );

            this.shouldShowCondoMessage = shouldShowCondoMessage;
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

            const addressInput = document.getElementById( "association-address-text-box" ) as HTMLInputElement;
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

            HtmlUtil.geocodeAddress( this.signUpInfo.streetAddress, ( results, status ) =>
            {
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
            } );
        }


        /**
         * Called when the user press the button to complete the sign-up process
         */
        onFinishedWizard()
        {
            this.signUpInfo.recaptchaKey = grecaptcha.getResponse();
            
            if( HtmlUtil.isNullOrWhitespace( this.signUpInfo.recaptchaKey ) )
            {
                alert( "Please complete the reCAPTCHA field" );
                return;
            }
            
            this.isLoading = true;

            this.signUpInfo.boundsGpsVertices = this.hoaPoly.vertices;

            this.$http.post( "/api/SignUpWizard/Hoa", this.signUpInfo ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    this.isLoading = false;

                    const signUpResult: any = httpResponse.data;

                    // If the was an error creating the site
                    if( !HtmlUtil.isNullOrWhitespace( signUpResult.errorMessage ) )
                    {
                        alert( "Failed to complete sign-up: " + signUpResult.errorMessage );
                        this.WizardHandler.wizard().goTo( signUpResult.stepIndex );
                        grecaptcha.reset();
                    }
                    // Otherwise create succeeded
                    else
                    {
                        if( typeof ( ( <any>window ).analytics ) !== "undefined" )
                            ( <any>window ).analytics.track( "condoSignUpComplete" );

                        // Log this as a conversion
                        if( typeof ( ( <any>window ).goog_report_conversion ) !== "undefined" )
                            ( <any>window ).goog_report_conversion();

                        if( this.signUpInfo.referralSource && typeof ( ( <any>window ).capterra_trackingListener_v2 ) !== "undefined" )
                            ( <any>window ).capterra_trackingListener_v2();

                        // Track HOA Ally sign-up with Fathom
                        if( typeof ( window as any ).fathom === "object" )
                        {
                            let numHomesInt = parseInt( this.signUpInfo.numHomes );
                            if( isNaN( numHomesInt ) )
                                numHomesInt = 0;
                            else
                                numHomesInt *= 100; // * 100 to convert "cents" to whole numbers

                            ( window as any ).fathom.trackGoal( 'I6WZZSMM', numHomesInt );
                        }
                        // Or if the user created an active signUpResult
                        if( !HtmlUtil.isNullOrWhitespace( signUpResult.createUrl ) )
                        {
                            // Delay just a bit to let the Capterra tracking log, if needed
                            window.setTimeout( () => window.location.href = signUpResult.createUrl, 50 );
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
                    grecaptcha.reset();
                }
            );
        }


        /**
         * Called when the user press the button to submit their email address
         */
        submitEmailForHoaNotify()
        {
            if( HtmlUtil.isNullOrWhitespace( this.hoaAlertEmail ) )
            {
                alert( "Please enter a valid email address" );
                return;
            }

            this.isLoading = true;

            const getUri = "/api/PublicEmail/SignUpForHoaAllyAlert?email=" + encodeURIComponent( this.hoaAlertEmail ) + "&numHomes=" + encodeURIComponent( this.hoaAlertNumHomes );
            this.$http.get( getUri ).then(
                () =>
                {
                    this.isLoading = false;
                    this.didSignUpForHoaAlert = true;
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to submit: " + httpResponse.data.exceptionMessage );
                }
            );
        }
    }
}


CA.angularApp.component( "hoaSignUpWizard", {
    templateUrl: "/ngApp/chtn/public/hoa-sign-up-wizard.html",
    controller: Ally.HoaSignUpWizardController
} );