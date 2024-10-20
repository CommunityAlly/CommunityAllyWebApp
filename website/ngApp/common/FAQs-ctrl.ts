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
        static $inject = ["$http", "$rootScope", "SiteInfo", "$cacheFactory", "fellowResidents", "$scope", "$timeout"];
        
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
        tinyMceDidNotLoad = false;
        editNewInfoDebounceTimerId: number;
        shouldShowUnsavedEntry = false;
        static readonly StoreKeyInfoItemNewText = "InfoItemNewText";

        
        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService,
            private $rootScope: ng.IRootScopeService,
            private siteInfo: SiteInfoService,
            private $cacheFactory: ng.ICacheFactoryService,
            private fellowResidents: Ally.FellowResidentsService,
            private $scope: ng.IScope,
            private $timeout: ng.ITimeoutService )
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

            this.shouldShowUnsavedEntry = window.localStorage && window.localStorage[FAQsController.StoreKeyInfoItemNewText] && ( window.localStorage[FAQsController.StoreKeyInfoItemNewText] as string ).length > 0;

            // Make sure committee members can manage their data
            if( this.committee && !this.canManage )
                this.fellowResidents.isCommitteeMember( this.committee.committeeId ).then( isCommitteeMember => this.canManage = isCommitteeMember );

            this.faqsHttpCache = this.$cacheFactory.get( "faqs-http-cache" ) || this.$cacheFactory( "faqs-http-cache" );

            this.retrieveInfo();

            // Hook up the rich text editor
            HtmlUtil2.initTinyMce( "tiny-mce-editor", 500 ).then( e =>
            {
                this.tinyMceEditor = e;

                // Only hook up the change event if we have access to localStorage
                if( window.localStorage )
                {
                    this.tinyMceEditor.on( "keyup", () =>
                    {
                        this.shouldShowUnsavedEntry = false;

                        // Only cache if we're editing a new info item
                        const isEditingExisting = this.editingInfoItem && typeof ( this.editingInfoItem.infoItemId ) === "number" && this.editingInfoItem.infoItemId > 0;
                        if( isEditingExisting )
                            return;

                        const DebounceTimeMs = 500;
                        this.debounceEditNewInfo( () =>
                        {
                            //console.log( "In editNewInfo debounce", this.tinyMceEditor.getContent() );

                            // Need to wrap this in a $scope.using because this event is invoked by vanilla JS, not Angular
                            this.$scope.$apply( () =>
                            {   
                                const newContent = this.tinyMceEditor.getContent();

                                // Don't cache if the content is too large
                                const MaxSizeBytes = 100 * 1024; // 100kb
                                if( newContent && newContent.length < MaxSizeBytes )
                                    window.localStorage[FAQsController.StoreKeyInfoItemNewText] = newContent;
                                else
                                    window.localStorage.removeItem( FAQsController.StoreKeyInfoItemNewText );
                            } );

                        }, DebounceTimeMs );
                    } );
                }

                this.tinyMceDidNotLoad = !e;

                if( this.tinyMceEditor && this.shouldShowUnsavedEntry )
                    this.tinyMceEditor.setContent( window.localStorage[FAQsController.StoreKeyInfoItemNewText] );
            } );
        }

        
        debounceEditNewInfo( callback: () => void, delay: number )
        {
            // Clear the previous timer to prevent the execution of 'mainFunction'
            if( this.editNewInfoDebounceTimerId )
                clearTimeout( this.editNewInfoDebounceTimerId );

            // Set a new timer that will execute 'mainFunction' after the specified delay
            this.editNewInfoDebounceTimerId = window.setTimeout( () =>
            {
                callback();
            }, delay );
        };


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
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Scroll to an info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        scrollToInfo( infoItemIndex: number )
        {
            document.getElementById( "info-item-title-" + infoItemIndex ).scrollIntoView();
        }


        scrollToSave()
        {
            document.getElementById( "AddNewInfoButton" ).scrollIntoView();
            this.shouldShowUnsavedEntry = false;
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user edits an info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onStartEditInfoItem( infoItem: InfoItem )
        {
            // Clone the object
            this.editingInfoItem = jQuery.extend( {}, infoItem ) as InfoItem;
            if( this.tinyMceEditor )
                this.tinyMceEditor.setContent( this.editingInfoItem.body );

            // Clear any cached value
            if( window.localStorage )
                window.localStorage.removeItem( FAQsController.StoreKeyInfoItemNewText );
            this.shouldShowUnsavedEntry = false;

            // Scroll down to the editor
            window.scrollTo( 0, document.body.scrollHeight );
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to add a new info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onSubmitItem()
        {
            if( this.tinyMceEditor )
                this.editingInfoItem.body = this.tinyMceEditor.getContent();

            this.isBodyMissing = HtmlUtil.isNullOrWhitespace( this.editingInfoItem.body );

            const validateable: any = $( "#info-item-edit-form" );
            validateable.validate();
            if( !validateable.valid() || this.isBodyMissing )
            {
                alert( "Failed to save, correct the errors above and try again." );
                return;
            }

            if( this.committee )
                this.editingInfoItem.committeeId = this.committee.committeeId;

            this.isLoadingInfo = true;

            const onSave = () =>
            {
                this.isLoadingInfo = false;
                if( this.tinyMceEditor )
                    this.tinyMceEditor.setContent( "" );

                // Clear any cached new entry text
                if( window.localStorage )
                    window.localStorage.removeItem( FAQsController.StoreKeyInfoItemNewText );
                this.shouldShowUnsavedEntry = false;

                this.editingInfoItem = new InfoItem();

                // Switched to removeAll because when we switched to the new back-end, the cache
                // key is the full request URI, not just the "/api/InfoItem" form
                //this.faqsHttpCache.remove( this.getUri );
                this.faqsHttpCache.removeAll();

                this.retrieveInfo();
            };

            const onError = () =>
            {
                this.isLoadingInfo = false;
                alert( "Failed to save your information. Please try again and if this happens again contact support." );
            };

            // If we're editing an existing info item
            if( typeof ( this.editingInfoItem.infoItemId ) === "number" )
                this.$http.put( "/api/InfoItem", this.editingInfoItem ).then( onSave, onError );
            // Otherwise create a new one
            else
                this.$http.post( "/api/InfoItem", this.editingInfoItem ).then( onSave, onError );
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

                const shouldClearEdit = typeof ( this.editingInfoItem.infoItemId ) == "number" && this.editingInfoItem.infoItemId === infoItem.infoItemId;
                if( shouldClearEdit )
                {
                    this.editingInfoItem = new InfoItem();
                    if( this.tinyMceEditor )
                        this.tinyMceEditor.setContent( "" );
                }
            });
        }


        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to cancel editing of an info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        cancelInfoItemEdit()
        {
            this.editingInfoItem = new InfoItem();
            if( this.tinyMceEditor )
                this.tinyMceEditor.setContent( "" );

            // Warn the user if they have unsaved changes?

            // Clear any cached new entry text
            if( window.localStorage )
                window.localStorage.removeItem( FAQsController.StoreKeyInfoItemNewText );
            this.shouldShowUnsavedEntry = false;
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