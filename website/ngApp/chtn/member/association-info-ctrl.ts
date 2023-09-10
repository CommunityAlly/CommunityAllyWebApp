declare var appVer: number; // Defined in index.html


namespace Ally
{
    interface IGroupInfoRouteParams extends ng.route.IRouteParamsService
    {
        viewName: string;
    }


    /**
     * The controller for the page used to navigate to other group info pages
     */
    export class AssociationInfoController implements ng.IController
    {
        static $inject = ["SiteInfo", "$routeParams"];

        hideDocuments: boolean = false;
        hideVendors: boolean = false;
        selectedView: string;
        showMaintenance: boolean = false;
        showVendors: boolean = true;
        faqMenuText: string = "Info/FAQs";
        frontEndVersion: string;


        /**
         * The constructor for the class
         */
        constructor( private siteInfo: Ally.SiteInfoService, private $routeParams: IGroupInfoRouteParams )
        {
            if( AppConfig.appShortName === "home" )
                this.faqMenuText = "Notes";

            this.frontEndVersion = appVer.toString();
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.hideDocuments = this.siteInfo.userInfo.isRenter && !this.siteInfo.privateSiteInfo.rentersCanViewDocs;
            this.hideVendors = AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club";
            this.showMaintenance = AppConfig.appShortName === "home"
                                    || ( AppConfig.appShortName === "condo" )
                                    || ( AppConfig.appShortName === "hoa" );
            this.showVendors = AppConfig.appShortName !== "pta";

            if( this.hideDocuments )
                this.selectedView = "Info";
            else
                this.selectedView = "Docs";

            if( HtmlUtil.isValidString( this.$routeParams.viewName ) )
                this.selectedView = this.$routeParams.viewName;
        }


        /**
        * Occurs when the user clicks the link to force refresh the page
        */
        forceRefresh()
        {
            window.location.reload();
        }
    }
}


CA.condoAllyControllers.
    directive( 'contenteditable', ['$sce', function( $sce: ng.ISCEService )
    {
        return {
            restrict: 'A', // only activate on element attribute
            require: '?ngModel', // get a hold of NgModelController
            link: function( scope: ng.IScope, element: any, attrs: any, ngModel: any )
            {
                if( !ngModel ) return; // do nothing if no ng-model

                // Specify how UI should be updated
                ngModel.$render = function()
                {
                    element.html( $sce.getTrustedHtml( ngModel.$viewValue || '' ) );
                };

                // Listen for change events to enable binding
                element.on( 'blur keyup change', function()
                {
                    scope.$evalAsync( read );
                } );

                read(); // initialize

                // Write data to the model
                function read()
                {
                    let html = element.html();

                    // When we clear the content editable the browser leaves a <br> behind
                    // If strip-br attribute is provided then we strip this out
                    if( attrs.stripBr && html === "<br>" )
                    {
                        html = '';
                    }

                    ngModel.$setViewValue( html );
                }
            }
        };
    }] );


// Highlight text that matches a string
CA.angularApp.filter( "highlight", ["$sce", function( $sce: ng.ISCEService )
{
    return function( text: string, phrase: string )
    {
        text = text || "";

        if( phrase )
            text = text.replace( new RegExp( '(' + phrase + ')', 'gi' ), '<span class="fileSearchHighlight">$1</span>' );

        return $sce.trustAsHtml( text );
    }
}] );


CA.angularApp.component( "associationInfo", {
    templateUrl: "/ngApp/chtn/member/association-info.html",
    controller: Ally.AssociationInfoController
} );