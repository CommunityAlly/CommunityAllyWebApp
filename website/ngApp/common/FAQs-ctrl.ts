/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../Services/html-util.ts" />



namespace Ally
{
    export class InfoItem
    {
        infoItemId: number;
        groupId: number;
        title: string;
        body: string;
        committeeId: number;
    }


    /**
     * The controller for the frequently asked questions widget
     */
    export class FAQsController implements ng.IController
    {
        static $inject = ["$http", "$rootScope", "SiteInfo", "$cacheFactory", "fellowResidents"];
        
        editingInfoItem: InfoItem;
        hideDocuments: boolean;
        isLoadingInfo: boolean;
        infoItems: InfoItem[];
        isBodyMissing = false;
        canManage: boolean = false;
        getUri: string;
        committee: Ally.Committee;
        headerText: string = "Information and Frequently Asked Questions (FAQs)";
        faqsHttpCache: ng.ICacheObject;
        tinyMceEditor: ITinyMce;

        
        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService,
            private $rootScope: ng.IRootScopeService,
            private siteInfo: SiteInfoService,
            private $cacheFactory: ng.ICacheFactoryService,
            private fellowResidents: Ally.FellowResidentsService )
        {
            this.editingInfoItem = new InfoItem();
            if( AppConfig.appShortName === "home" )
                this.headerText = "Home Notes";
        }

        
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.hideDocuments = this.$rootScope["userInfo"].isRenter && !this.siteInfo.privateSiteInfo.rentersCanViewDocs;
            this.canManage = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager;

            // Make sure committee members can manage their data
            if( this.committee && !this.canManage )
                this.fellowResidents.isCommitteeMember( this.committee.committeeId ).then( isCommitteeMember => this.canManage = isCommitteeMember );

            this.faqsHttpCache = this.$cacheFactory.get( "faqs-http-cache" ) || this.$cacheFactory( "faqs-http-cache" );

            this.retrieveInfo();

            // Hook up the rich text editor
            HtmlUtil2.initTinyMce( "tiny-mce-editor", 500 ).then( e => this.tinyMceEditor = e );
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Populate the info section
        ///////////////////////////////////////////////////////////////////////////////////////////////
        retrieveInfo()
        {
            this.isLoadingInfo = true;

            if( !this.getUri )
            {
                this.getUri = "/api/InfoItem";
                if( this.committee )
                    this.getUri = "/api/InfoItem/Committee/" + this.committee.committeeId;
            }
            
            this.$http.get( this.getUri, { cache: this.faqsHttpCache }).then( ( httpResponse: ng.IHttpPromiseCallbackArg<InfoItem[]> ) =>
            {            
                this.isLoadingInfo = false;
                this.infoItems = httpResponse.data;

                // Make <a> links open in new tabs
                setTimeout( () =>
                {
                    for( let i = 0; i < this.infoItems.length; ++i )
                        RichTextHelper.makeLinksOpenNewTab( "info-item-body-" + i );
                }, 500 );
            });
        };


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Scroll to an info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        scrollToInfo( infoItemIndex: number )
        {
            document.getElementById( "info-item-title-" + infoItemIndex ).scrollIntoView();
        };


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user edits an info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onStartEditInfoItem( infoItem: InfoItem )
        {
            // Clone the object
            this.editingInfoItem = jQuery.extend( {}, infoItem ) as InfoItem;
            this.tinyMceEditor.setContent( this.editingInfoItem.body );

            // Scroll down to the editor
            window.scrollTo( 0, document.body.scrollHeight );
        };


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to add a new info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onSubmitItem()
        {
            this.editingInfoItem.body = this.tinyMceEditor.getContent();
            this.isBodyMissing = HtmlUtil.isNullOrWhitespace( this.editingInfoItem.body );

            var validateable: any = $( "#info-item-edit-form" );
            validateable.validate();
            if( !validateable.valid() || this.isBodyMissing )
                return;

            if( this.committee )
                this.editingInfoItem.committeeId = this.committee.committeeId;

            this.isLoadingInfo = true;

            var onSave = () =>
            {
                this.isLoadingInfo = false;
                this.tinyMceEditor.setContent( "" );
                this.editingInfoItem = new InfoItem();

                // Switched to removeAll because when we switched to the new back-end, the cache
                // key is the full request URI, not just the "/api/InfoItem" form
                //this.faqsHttpCache.remove( this.getUri );
                this.faqsHttpCache.removeAll();

                this.retrieveInfo();
            };

            var onError = () =>
            {
                this.isLoadingInfo = false;
                alert( "Failed to save your information. Please try again and if this happens again contact support." );
            };

            // If we're editing an existing info item
            if( typeof ( this.editingInfoItem.infoItemId ) == "number" )
                this.$http.put( "/api/InfoItem", this.editingInfoItem ).then( onSave );
            // Otherwise create a new one
            else
                this.$http.post( "/api/InfoItem", this.editingInfoItem ).then( onSave );
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to delete an info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onDeleteInfoItem( infoItem: InfoItem )
        {
            if( !confirm( 'Are you sure you want to delete this information?' ) )
                return;

            this.isLoadingInfo = true;

            this.$http.delete( "/api/InfoItem/" + infoItem.infoItemId ).then( () =>
            {
                this.isLoadingInfo = false;
                this.faqsHttpCache.removeAll();
                this.retrieveInfo();
            });
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to cancel editing of an info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        cancelInfoItemEdit()
        {
            this.editingInfoItem = new InfoItem();
            this.tinyMceEditor.setContent( "" );
        }
    }

    export class RichTextHelper
    {
        static showFileUploadAlert( reason: string, detail: any )
        {
            let msg = "";
            if( reason === "unsupported-file-type" )
                msg = "Unsupported format " + detail;
            else
                console.log( "error uploading file", reason, detail );

            $( '<div class="alert"> <button type="button" class="close" data-dismiss="alert">&times;</button>' +
                '<strong>File upload error</strong> ' + msg + ' </div>' ).prependTo( '#alerts' );
        }

        static makeLinksOpenNewTab( elemId: string )
        {
            window.setTimeout( () =>
            {
                // Make links in the welcome message open in a new tab
                $( "a", "#" + elemId ).each( ( index, elem: HTMLAnchorElement ) =>
                {
                    // Let local links modify the current tab
                    const isLocalLink = elem.href && ( elem.href[0] === "#" || elem.href.indexOf( AppConfig.baseTld ) > -1 );
                    if( !isLocalLink )
                        $( elem ).attr( "target", "_blank" );
                } );
            }, 100 );
        }
    }
}

CA.angularApp.component( "faqs", {
    bindings: {
        committee: "<?"
    },
    templateUrl: "/ngApp/common/FAQs.html",
    controller: Ally.FAQsController
});