/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />


namespace Ally
{
    export class CondoSignUpWizardController implements ng.IController
    {
        static $inject = ["$scope", "$http", "$timeout", "WizardHandler"];

        unitNumberingType: string = "Numbered";
        numUnits: number = 3;
        placeWasSelected: boolean = false;
        shouldCheckAddress: boolean = false;
        shouldShowHoaMessage: boolean = false;
        isLoading: boolean = false;
        addressAutocomplete: google.maps.places.Autocomplete;
        map: any = null;
        mapMarker: google.maps.Marker;
        isLoadingMap: boolean = false;
        hideWizard: boolean = false;
        resultMessage: string;
        isPageEnabled:boolean = null;

        // The default sign-up info object
        signUpInfo: any = {
            buildings: [{
                units: []
            }],
            signerUpInfo: {
                buildingIndex: 0,
                boardPositionValue: "1"
            },
            recaptchaKey: ""
        };


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
            const prepFunc = ( isPageEnabled: boolean ) =>
            {
                this.isPageEnabled = isPageEnabled;

                // Delay a bit to allow the wizard to render
                this.$timeout( () => this.initPage(), 300 );
            };
            
            this.$scope.$on( 'wizard:stepChanged', ( event, args ) =>
            {
                if( args.index === 2 )
                    this.$timeout( () => grecaptcha.render( "recaptcha-check-elem" ), 50 );
            } );

            this.$http.get( "/api/PublicAllyAppSettings/IsSignUpEnabled" ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<boolean> ) => prepFunc( httpResponse.data ),
                ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    prepFunc( true ); // Default to true if we can't get the setting
                    console.log( "Failed to get sign-up enabled status: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Occurs when the user changes the number of units
         */
        onNumUnitsChanged()
        {
            if( !this.numUnits )
                return;

            if( this.numUnits < 1 )
                this.numUnits = 1;
            else if( this.numUnits > 100 )
                this.numUnits = 100;

            const numNewUnits = this.numUnits - this.signUpInfo.buildings[0].units.length;

            this.signUpInfo.buildings[0].units.length = this.numUnits;

            if( numNewUnits > 0 )
            {
                for( let i = this.numUnits - numNewUnits; i < this.numUnits; ++i )
                {
                    this.signUpInfo.buildings[0].units[i] = {
                        name: this.getUnitName( i ),
                        residents: [{}]
                    };
                }
            }
        }


        /**
         * Occurs as the user presses keys in the association name field
         */
        onAssociationNameChanged()
        {
            if( !this.signUpInfo || !this.signUpInfo.name )
            {
                this.shouldShowHoaMessage = false;
                return;
            }

            this.shouldShowHoaMessage = this.signUpInfo.name.toLowerCase().indexOf( "hoa" ) !== -1
                || this.signUpInfo.name.toLowerCase().indexOf( "home" ) !== -1;
        }


        addResident( unit: any )
        {
            if( !unit.residents )
                unit.residents = [];

            unit.residents.push( {} )
        };


        /**
         * Get the unit name based on its index and the numbering type
         */
        getUnitName( unitIndex: number ): string
        {
            if( this.unitNumberingType === "Numbered" )
                return ( unitIndex + 1 ).toString();
            else if( this.unitNumberingType === "Lettered" )
            {
                let unitName = "";

                // If we've gone passed 26 units, then start adding double characters
                const numLoopAlphabets = Math.floor( unitIndex / 26 );
                if( numLoopAlphabets > 0 )
                    unitName += String.fromCharCode( "A".charCodeAt( 0 ) + ( numLoopAlphabets - 1 ) );

                const letterIndex = unitIndex % 26;
                unitName += String.fromCharCode( "A".charCodeAt( 0 ) + letterIndex );

                return unitName;
            }
            else if( this.unitNumberingType === "EW" || this.unitNumberingType === "NS" )
            {
                if( ( unitIndex % 2 == 0 ) )
                    return ( ( unitIndex / 2 ) + 1 ).toString() + ( this.unitNumberingType === "EW" ? "E" : "N" );
                else
                    return Math.ceil( unitIndex / 2 ).toString() + ( this.unitNumberingType === "EW" ? "W" : "S" );
            }

            return ( unitIndex + 1 ).toString();
        };


        /**
         * Occurs when the user changes the unit numbering type
         */
        onNumberingTypeChange()
        {
            for( let i = 0; i < this.signUpInfo.buildings[0].units.length; ++i )
            {
                if( !this.signUpInfo.buildings[0].units[i] )
                    this.signUpInfo.buildings[0].units[i] = {};

                this.signUpInfo.buildings[0].units[i].name = this.getUnitName( i );
            }
        }


        /**
         * Occurs when the user changes the unit numbering type
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
        };


        /**
         * Occurs when the user selects an address from the Google suggestions
         */
        setPlaceWasSelected()
        {
            this.placeWasSelected = true;
            this.shouldCheckAddress = false;

            // Clear the flag in case the user types in a new address
            setTimeout( () => this.placeWasSelected = true, 500 );
        };


        /**
         * Perform any needed initialization
         */
        initPage()
        {
            if( typeof ( ( <any>window ).analytics ) !== "undefined" )
                ( <any>window ).analytics.track( "condoSignUpStarted", {
                    category: "SignUp",
                    label: "Started"
                } );

            const mapDiv = document.getElementById( "address-map" );

            this.map = new google.maps.Map( mapDiv, {
                center: { lat: 41.869638, lng: -87.657423 },
                zoom: 9
            } );

            const addressInput = <HTMLInputElement>document.getElementById( "building-0-address-text-box" );
            this.addressAutocomplete = new google.maps.places.Autocomplete( addressInput );
            this.addressAutocomplete.bindTo( 'bounds', this.map );

            this.mapMarker = new google.maps.Marker( {
                map: this.map,
                position: null,
                anchorPoint: new google.maps.Point( 41.969638, -87.657423 ),
                icon: "/assets/images/MapMarkers/MapMarker_Home.png"
            } );

            // Occurs when the user selects a Google suggested address
            this.addressAutocomplete.addListener( 'place_changed', () =>
            {
                this.setPlaceWasSelected();

                //infowindow.close();
                this.mapMarker.setVisible( false );
                const place = this.addressAutocomplete.getPlace();


                let readableAddress = place.formatted_address;

                // Remove the trailing country if it's USA
                if( readableAddress.indexOf( ", USA" ) === readableAddress.length - ", USA".length )
                    readableAddress = readableAddress.substring( 0, readableAddress.length - ", USA".length );

                this.signUpInfo.buildings[0].streetAddress = readableAddress;


                // If the name hasn't been set yet, use the address
                if( HtmlUtil.isNullOrWhitespace( this.signUpInfo.name ) )
                {
                    this.$scope.$apply( () =>
                    {
                        this.signUpInfo.name = place.name + " Condo Association";
                    } );
                }

                if( !place.geometry )
                {
                    //window.alert( "Autocomplete's returned place contains no geometry" );
                    return;
                }

                this.centerMap( place.geometry );

                $( "#association-name-text-box" ).focus();
            } );

            // Initialize the unit names
            this.onNumUnitsChanged();
        }


        /**
         * Refresh the map to center typed in address
         */
        checkAddress()
        {
            if( this.placeWasSelected || !this.shouldCheckAddress )
                return;

            this.shouldCheckAddress = false;
            this.refreshMapForBuildingAddress();
        }


        /**
         * Refresh the map to center typed in address
         */
        refreshMapForBuildingAddress()
        {
            this.isLoadingMap = true;

            HtmlUtil.geocodeAddress( this.signUpInfo.buildings[0].streetAddress, ( results, status ) =>
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

                    this.signUpInfo.buildings[0].streetAddress = readableAddress;

                    this.centerMap( results[0].geometry );

                    // If the name hasn't been set yet, use the address
                    if( HtmlUtil.isNullOrWhitespace( this.signUpInfo.name ) )
                    {
                        const street = HtmlUtil.getStringUpToFirst( readableAddress, "," );

                        this.signUpInfo.name = street + " Condo Association";
                    }
                } );
            } );
        };


        /**
         * Add a building to our sign-up info
         */
        addBuilding()
        {
            const MaxBuidlings = 25;
            if( this.signUpInfo.buildings.length + 1 >= MaxBuidlings )
            {
                alert( "We do not support more than " + MaxBuidlings + " buildings." );
                return;
            }

            this.signUpInfo.buildings.push( {} );
        };


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

            this.$http.post( "/api/SignUpWizard", this.signUpInfo ).then(
                ( httpResponse ) =>
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
                            ( <any>window ).analytics.track( "condoSignUpComplete", {
                                category: "SignUp",
                                label: "Success"
                            } );

                        // Track Condo Ally sign-up with Fathom
                        if( typeof ( window as any ).fathom === "object" )
                            ( window as any ).fathom.trackGoal( 'FIEMVITM', this.numUnits * 100 ); // * 100 to convert "cents" to whole numbers

                        // Log this as a conversion
                        //if( typeof ( ( <any>window ).goog_report_conversion ) !== "undefined" )
                        //    ( <any>window ).goog_report_conversion();

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
                    grecaptcha.reset();
                }
            );
        }
    }
}


CA.angularApp.component( "condoSignUpWizard", {
    templateUrl: "/ngApp/chtn/public/condo-sign-up-wizard.html",
    controller: Ally.CondoSignUpWizardController
} );