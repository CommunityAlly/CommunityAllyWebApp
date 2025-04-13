﻿namespace Ally
{
    export class Comment
    {
        commentId: number;
        groupId: number;
        threadId: string;
        commentText: string;
        replyToCommentId: number;
        authorUserId: string;
        postDateUtc: Date;
        lastEditDateUtc: Date;
        deletedDateUtc: Date;
        authorFullName: string;
        authorEmailAddress: string;
        authorAvatarUrl: string;
        attachedDocPath: string;
        attachedDocDisplayName: string;
        replies: Comment[];

        // Not from server
        isMyComment: boolean;
        attachedDocPreviewUrl: string;
    }


    export class CommentThread
    {
        commentThreadId: number;
        groupId: number;
        title: string;
        createDateUtc: Date;
        archiveDateUtc: Date;
        authorUserId: string;
        pinnedDateUtc: Date;
        isReadOnly: boolean;
        postType: string | null;
        sellItemPrice: string | null;
        eventLocationText: string | null;
        eventDateUtc: Date | null;

        authorFullName: string;
        lastCommentDateUtc: Date;
        lastCommentAuthorName: string;
        numComments: number;

        // Populated locally
        firstComment: Comment;
        commentsAreVisible: boolean;
    }


    export class CommentThreadBBoard extends CommentThread
    {
        comments: Comment[];
        firstComment: Comment;

        // Populated locally
        visibleComments: Comment[];
        newRootCommentText: string;
        attachmentFile: File;
        attachmentPreviewUrl: string;
        shouldShowAttachmentFullScreen: boolean;
        isLoggedInUserAuthor: boolean;
        shouldShowEditButton: boolean;
        isLoading: boolean;
        editShouldRemoveAttachment: boolean;
    }


    /**
     * The controller for the discussion threads directive
     */
    export class GroupCommentThreadsController implements ng.IController
    {
        static $inject = ["$http", "$rootScope", "SiteInfo", "$scope", "fellowResidents", "$timeout"];

        isLoading: boolean = false;
        editComment: any;
        viewingThread: CommentThread = null;
        commentThreads: CommentThread[];
        showCreateNewModal: boolean = false;
        newThreadTitle: string;
        newBodyMceEditor: ITinyMce;
        newThreadIsBoardOnly: boolean;
        newThreadIsReadOnly: boolean;
        shouldSendNoticeForNewThread: boolean;
        newThreadErrorMessage: string;
        showBoardOnly: boolean = false;
        committeeId: number;
        autoOpenThreadId: number;
        archivedThreads: CommentThread[] = null;
        canCreateThreads: boolean = false;
        isDiscussionEmailEnabled: boolean = true;
        isPremiumPlanActive: boolean = false;
        attachmentFile: File;
        newThreadBodyText = "";


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService,
            private $rootScope: ng.IRootScopeService,
            private siteInfo: SiteInfoService,
            private $scope: ng.IScope,
            private fellowResidents: Ally.FellowResidentsService,
            private $timeout: ng.ITimeoutService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            this.canCreateThreads = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager;

            if( !this.canCreateThreads )
            {
                if( this.committeeId )
                {
                    // Make sure committee members can manage their data
                    this.fellowResidents.isCommitteeMember( this.committeeId ).then( isCommitteeMember => this.canCreateThreads = isCommitteeMember );
                }
                else
                {
                    if( !this.siteInfo.privateSiteInfo.whoCanCreateDiscussionThreads || this.siteInfo.privateSiteInfo.whoCanCreateDiscussionThreads === "everyone" )
                        this.canCreateThreads = true;
                    else if( this.siteInfo.privateSiteInfo.whoCanCreateDiscussionThreads === "board" )
                        this.canCreateThreads = this.siteInfo.userInfo.isSiteManager || this.siteInfo.userInfo.boardPosition !== 0;
                }
            }

            this.showBoardOnly = this.siteInfo.userInfo.isSiteManager || this.siteInfo.userInfo.boardPosition !== 0;
            
            this.editComment = {
                commentText: "",
                replyToCommentId: null
            };

            this.$scope.$on( "refreshCommentThreadList", () => this.refreshCommentThreads( false ) );

            this.refreshCommentThreads( false );
        }

        
        setDisplayCreateModal( shouldShow: boolean )
        {
            this.showCreateNewModal = shouldShow;
            this.newThreadTitle = "";
            this.newThreadIsBoardOnly = false;
            this.newThreadIsReadOnly = false;
            this.shouldSendNoticeForNewThread = true;
            this.newThreadErrorMessage = "";

            HtmlUtil2.initTinyMce( "new-thread-body-rte", 200, GroupCommentThreadViewController.TinyMceSettings ).then( e => this.newBodyMceEditor = e );

            // If we're displaying the modal, focus on the title text box
            if( shouldShow )
                setTimeout( () => $( "#new-thread-title-text-box" ).focus(), 100 );
        }


        displayDiscussModal( thread: CommentThread )
        {
            this.viewingThread = thread;
        }


        hideDiscussModal()
        {
            this.viewingThread = null;
        }


        /**
         * Occurs when the user clicks the pin to toggle a thread's pinned status
         * @param thread
         */
        onClickPin( thread: CommentThread )
        {
            this.isLoading = true;

            this.$http.put( "/api/CommentThread/TogglePinned/" + thread.commentThreadId, null ).then(
                () => //( response: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    this.isLoading = false;
                    this.refreshCommentThreads();
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to toggle: " + response.data.exceptionMessage );
                }
            );
        }


        createNewThread()
        {
            console.log( "In createNewThread" );

            this.isLoading = true;
            this.newThreadErrorMessage = null;

            //const createInfo = {
            //    title: this.newThreadTitle,
            //    body: this.newBodyMceEditor.getContent(),
            //    isBoardOnly: this.newThreadIsBoardOnly,
            //    isReadOnly: this.newThreadIsReadOnly,
            //    shouldSendNotice: this.shouldSendNoticeForNewThread,
            //    committeeId: this.committeeId
            //};

            const newThreadFormData = new FormData();
            newThreadFormData.append( "title", this.newThreadTitle );

            if( this.newBodyMceEditor )
                newThreadFormData.append( "body", this.newBodyMceEditor.getContent() );
            else
            {
                newThreadFormData.append( "body", this.newThreadBodyText );
            }

            newThreadFormData.append( "isBoardOnly", this.newThreadIsBoardOnly.toString() );
            newThreadFormData.append( "isReadOnly", this.newThreadIsReadOnly.toString() );
            newThreadFormData.append( "shouldSendNotice", this.shouldSendNoticeForNewThread.toString() );

            if( this.committeeId )
                newThreadFormData.append( "committeeId", this.committeeId.toString() );

            if( this.attachmentFile )
                newThreadFormData.append( "attachedFile", this.attachmentFile );

            const postHeaders: ng.IRequestShortcutConfig = {
                headers: { "Content-Type": undefined } // Need to remove this to avoid the JSON body assumption by the server
            };

            this.$http.post( "/api/CommentThread/CreateThreadFromForm", newThreadFormData, postHeaders ).then(
                () =>
                {
                    this.isLoading = false;
                    this.showCreateNewModal = false;
                    this.removeAttachment();
                    this.refreshCommentThreads( false );
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    this.newThreadErrorMessage = response.data.exceptionMessage;
                }
            );
        }


        /**
         * Retrieve the comments from the server for the current thread
         */
        refreshCommentThreads( retrieveArchived: boolean = false )
        {
            this.isLoading = true;

            let getUri = "/api/CommentThread";

            if( retrieveArchived )
                getUri += "/Archived";

            if( this.committeeId )
                getUri += "?committeeId=" + this.committeeId;

            this.$http.get( getUri ).then(
                ( response: ng.IHttpPromiseCallbackArg<CommentThread[]> ) =>
                {
                    this.isLoading = false;

                    // Sort by comment date, put unpinned threads 100 years in the past so pinned always show up on top
                    response.data = _.sortBy( response.data, ct => ct.pinnedDateUtc ? ct.pinnedDateUtc : moment( ct.lastCommentDateUtc ).subtract( 100, "years" ).toDate() ).reverse();

                    if( retrieveArchived )
                        this.archivedThreads = response.data;
                    else
                    {
                        this.commentThreads = response.data;
                        this.archivedThreads = null;

                        // If we should automatically open a discussion thread
                        if( this.autoOpenThreadId )
                        {
                            const autoOpenThread = _.find( this.commentThreads, t => t.commentThreadId === this.autoOpenThreadId );
                            if( autoOpenThread )
                                this.$timeout( () => this.displayDiscussModal( autoOpenThread ), 125 );

                            // Don't open again
                            this.autoOpenThreadId = null;
                        }
                    }
                },
                ( response: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    console.log( "Failed to load threads: " + response.data.exceptionMessage );
                }
            );
        }


        onFileAttached( event: Event )
        {
            this.attachmentFile = ( event.target as HTMLInputElement ).files[0];
        }


        removeAttachment()
        {
            this.attachmentFile = null;
            const fileInput = document.getElementById( "comment-attachment-input" ) as HTMLInputElement;
            if( fileInput )
                fileInput.value = null;
        }
    }
}
    

CA.angularApp.component( "groupCommentThreads", {
    bindings: {
        committeeId: "<?",
        autoOpenThreadId: "<?"
    },
    templateUrl: "/ngApp/services/group-comment-threads.html",
    controller: Ally.GroupCommentThreadsController
} );