var Ally;
(function (Ally) {
    /**
     * The controller for the discussion threads directive
     */
    class BulletinBoardController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, $timeout, $scope, fellowResidents) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.$scope = $scope;
            this.fellowResidents = fellowResidents;
            this.isLoading = false;
            this.isSiteManager = false;
            this.shouldShowEditPostModal = false;
            this.shouldIncludeArchived = false;
            this.couldBeMorePosts = true;
            this.canCreateThreads = false;
            this.isPremiumPlanActive = false;
            this.shouldSendNoticeForNewThread = false;
            this.sortPostsByFieldName = "lastCommentDateUtc";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.usersFullName = this.siteInfo.userInfo.fullName;
            this.usersAvatarUrl = this.siteInfo.userInfo.avatarUrl;
            this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
            // Just a little delay to help the home page layout faster
            this.$timeout(() => this.refreshCommentThreads(), 5);
            this.$scope.$on("refreshBBoardPosts", () => this.refreshCommentThreads());
            this.$scope.$on("refreshSingleBBoardPost", (event, commentThreadId) => this.refreshSingleCommentThread(commentThreadId));
            this.canCreateThreads = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager;
            if (!this.canCreateThreads) {
                if (this.committeeId) {
                    // Make sure committee members can manage their data
                    this.fellowResidents.isCommitteeMember(this.committeeId).then(isCommitteeMember => this.canCreateThreads = isCommitteeMember);
                }
                else {
                    if (!this.siteInfo.privateSiteInfo.whoCanCreateDiscussionThreads || this.siteInfo.privateSiteInfo.whoCanCreateDiscussionThreads === "everyone")
                        this.canCreateThreads = true;
                    else if (this.siteInfo.privateSiteInfo.whoCanCreateDiscussionThreads === "board")
                        this.canCreateThreads = this.siteInfo.userInfo.isSiteManager || this.siteInfo.userInfo.boardPosition !== 0;
                }
            }
        }
        //loadPosts()
        //{
        //    const getUri = `/api/WallPost/ActivePostsForGroup`;
        //    this.$http.get( getUri ).then(
        //        ( response: ng.IHttpPromiseCallbackArg<WallPost[]> ) =>
        //        {
        //            this.isLoading = false;
        //            this.allPosts = response.data;
        //        },
        //        ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
        //        {
        //            this.isLoading = false;
        //            console.log( "Failed to load posts: " + response.data.exceptionMessage );
        //        }
        //    );
        //}
        showEditPostModal(editItem) {
            if (editItem) {
                this.editPostItem = editItem;
                this.editPostBody = editItem.firstComment ? editItem.firstComment.commentText : "";
                if (editItem.eventDateUtc) {
                    this.editPostDateOnly = moment(editItem.eventDateUtc).toDate();
                    this.editPostTimeOnly = moment(editItem.eventDateUtc).format("h:mma");
                }
            }
            else {
                this.editPostItem = new Ally.CommentThreadBBoard();
                this.editPostItem.postType = "normal";
                this.editPostBody = "";
                this.editPostDateOnly = new Date();
                this.editPostTimeOnly = "9:00am";
                this.shouldSendNoticeForNewThread = false;
                window.setTimeout(() => document.getElementById("new-thread-body-rte").focus(), 50);
            }
            this.shouldShowEditPostModal = true;
            this.onNewPostTypeChanged();
        }
        onNewPostTypeChanged() {
            if (this.editPostItem && this.editPostItem.postType === "event")
                window.setTimeout(() => { console.log("time", $("#new-post-event-time")); $("#new-post-event-time").timepicker({ scrollDefault: "9:00am" }); }, 100);
        }
        /**
         * Retrieve the comments from the server for the current thread
         */
        refreshCommentThreads(isLoadMore = false) {
            this.isLoading = true;
            let getUri = "/api/CommentThread/BulletinBoard/PostsOnly?a=1";
            if (this.shouldIncludeArchived)
                getUri += "&includeArchived=true";
            if (isLoadMore && this.commentThreads.length > 0)
                getUri += "&lookBackDateUtc=" + this.commentThreads[this.commentThreads.length - 1].lastCommentDateUtc.toISOString();
            if (this.committeeId)
                getUri += "&committeeId=" + this.committeeId;
            this.$http.get(getUri).then((response) => {
                this.isLoading = false;
                for (const curThread of response.data) {
                    const localDate = moment(curThread.eventDateUtc).local();
                    //curThread.timeOnly = localDate.format( LogbookController.TimeFormat );
                    curThread.calLinkStartTimeOnly = localDate.format("HH:mm");
                    ;
                    curThread.calLinkEndTimeOnly = localDate.clone().add(1, 'hours').format("HH:mm");
                    ;
                    curThread.calLinkDateOnly = localDate.clone().startOf('day').toDate();
                }
                // Pinned threads can come down twice so let's remove them
                const curThreadIds = (this.commentThreads && this.commentThreads.length > 0) ? this.commentThreads.map(ct => ct.commentThreadId) : [];
                let newThreads = response.data.filter(nt => !curThreadIds.includes(nt.commentThreadId));
                newThreads.forEach(nt => this.prepThreadForDisplay(nt));
                if (isLoadMore) {
                    this.commentThreads.push(...newThreads);
                }
                // Sort by comment date, put unpinned threads 100 years in the past so pinned always show up on top
                else {
                    newThreads = _.sortBy(newThreads, ct => ct.pinnedDateUtc ? ct.pinnedDateUtc : moment(ct[this.sortPostsByFieldName]).subtract(100, "years").toDate()).reverse();
                    this.commentThreads = newThreads;
                }
                this.couldBeMorePosts = newThreads.length > 0;
            }, (response) => {
                this.isLoading = false;
                console.log("Failed to load post threads: " + response.data.exceptionMessage);
            });
        }
        /**
         * Retrieve the comments from the server for the current thread
         */
        refreshSingleCommentThread(commentThreadId) {
            const commentThread = this.commentThreads.find(ct => ct.commentThreadId === commentThreadId);
            const getUri = "/api/CommentThread/BBoardPostById/" + commentThreadId;
            commentThread.isLoading = true;
            return this.$http.get(getUri).then((response) => {
                commentThread.isLoading = false;
                const existingThreadIndex = this.commentThreads.findIndex(ct => ct.commentThreadId === commentThread.commentThreadId);
                if (existingThreadIndex > -1)
                    this.commentThreads.splice(existingThreadIndex, 1, response.data);
                else {
                    this.commentThreads.push(response.data);
                    // Sort by comment date, put unpinned threads 100 years in the past so pinned always show up on top
                    this.commentThreads = _.sortBy(this.commentThreads, ct => ct.pinnedDateUtc ? ct.pinnedDateUtc : moment(ct[this.sortPostsByFieldName]).subtract(100, "years").toDate()).reverse();
                }
                this.prepThreadForDisplay(response.data);
                return response.data;
            }, (response) => {
                commentThread.isLoading = false;
                console.log("Failed to load post threads: " + response.data.exceptionMessage);
                return null;
            });
        }
        loadPreviewImagesForThread(curThread) {
            const commentsToProcess = [];
            const processComment = (curComment) => {
                if (curComment.attachedDocPath && !curComment.attachedDocPreviewUrl)
                    commentsToProcess.push({ curThread, curComment });
                for (const curReply of curComment.replies)
                    processComment(curReply);
            };
            //for( const curThread of this.commentThreads )
            //{
            //    if( curThread.firstComment && curThread.firstComment.attachedDocPath && !curThread.firstComment.attachedDocPreviewUrl )
            //        commentsToProcess.push( { curThread, curComment: curThread.firstComment } );
            //    for( const curComment of curThread.comments )
            //        processComment( curThread, curComment );
            //}
            if (curThread.firstComment && curThread.firstComment.attachedDocPath && !curThread.firstComment.attachedDocPreviewUrl)
                commentsToProcess.push({ curThread, curComment: curThread.firstComment });
            if (curThread.comments) {
                for (const curComment of curThread.comments)
                    processComment(curComment);
            }
            const getImagePreviewUrl = (thread, comment) => {
                // If we already have the preview URL, skip
                if (comment.attachedDocPreviewUrl)
                    return;
                const getUri = `/api/CommentThread/${thread.commentThreadId}/AttachmentPreview/${comment.commentId}/0`;
                this.$http.get(getUri).then((response) => comment.attachedDocPreviewUrl = response.data, (response) => console.log("Failed to retrieve comment image attachment preview: " + response.data.exceptionMessage));
            };
            for (let i = 0; i < commentsToProcess.length; ++i) {
                const curEntry = commentsToProcess[i];
                this.$timeout(() => getImagePreviewUrl(curEntry.curThread, curEntry.curComment), i * 50);
            }
        }
        /**
         * Prepare a thread for display on the UI
         */
        prepThreadForDisplay(thread) {
            thread.isLoggedInUserAuthor = thread.authorUserId === this.siteInfo.userInfo.userId;
            thread.shouldShowEditButton = thread.isLoggedInUserAuthor || this.siteInfo.userInfo.isSiteManager;
            // Hook up the first comment
            //const firstCommentIndex = thread.comments.findIndex( cct => cct.postDateUtc.getTime() === thread.createDateUtc.getTime() );
            //if( firstCommentIndex > -1 )
            //{
            //    thread.firstComment = thread.comments[firstCommentIndex];
            //    // Remove the comment since it's shown up top
            //    thread.comments.splice( firstCommentIndex, 1 );
            //    // If the root comment has a reply, add it as a root comment. This can
            //    // happen if the thread is from the old discussion-style posts where you
            //    // could comment on the first post
            //    if( thread.firstComment.replies && thread.firstComment.replies.length > 0 )
            //    {
            //        thread.comments.push( ...thread.firstComment.replies );
            //    }
            //}
            // If the root comment has a reply, add it as a root comment. This can
            // happen if the thread is from the old discussion-style posts where you
            // could comment on the first post
            if (thread.comments && thread.firstComment && thread.firstComment.replies && thread.firstComment.replies.length > 0) {
                thread.comments.push(...thread.firstComment.replies);
            }
            this.loadPreviewImagesForThread(thread);
            // View all comments now that we hide comments on view
            thread.visibleComments = thread.comments;
            //const MaxInitialCommentsToDisplay = 3;
            //if( thread.comments && thread.comments.length > MaxInitialCommentsToDisplay )
            //{
            //    thread.visibleComments = thread.comments.slice( 0, MaxInitialCommentsToDisplay );
            //}
            //else
            //    thread.visibleComments = thread.comments;
        }
        //createNewPost()
        //{
        //    this.isLoading = true;
        //    this.$http.post( "/api/WallPost/CreateNewPost", this.editPostItem ).then(
        //        () =>
        //        {
        //            this.shouldShowEditPostModal = false;
        //            this.loadPosts();
        //        },
        //        ( response: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
        //        {
        //            this.isLoading = false;
        //            alert( "Failed to create post: " + response.data.exceptionMessage );
        //        }
        //    );
        //}
        saveCommentThread() {
            const newThreadFormData = new FormData();
            if (this.editPostItem.title)
                newThreadFormData.append("title", this.editPostItem.title);
            newThreadFormData.append("postType", this.editPostItem.postType);
            if (this.editPostItem.sellItemPrice)
                newThreadFormData.append("sellItemPrice", this.editPostItem.sellItemPrice);
            if (this.editPostItem.eventLocationText)
                newThreadFormData.append("eventLocationText", this.editPostItem.eventLocationText);
            newThreadFormData.append("shouldSendNotice", this.shouldSendNoticeForNewThread.toString());
            if (this.committeeId)
                newThreadFormData.append("committeeId", this.committeeId.toString());
            // Combine the event date and time
            let eventDateUtcString = null;
            if (this.editPostItem.postType && this.editPostDateOnly && this.editPostTimeOnly && typeof (this.editPostTimeOnly) === "string" && this.editPostTimeOnly.length > 1) {
                const dateTimeString = moment(this.editPostDateOnly).format(Ally.LogbookController.DateFormat) + " " + this.editPostTimeOnly;
                eventDateUtcString = moment(dateTimeString, Ally.LogbookController.DateFormat + " " + Ally.LogbookController.TimeFormat).utc().toISOString(); // .toDate();
            }
            if (eventDateUtcString)
                newThreadFormData.append("eventDateUtc", eventDateUtcString);
            if (this.newBodyMceEditor)
                newThreadFormData.append("body", this.newBodyMceEditor.getContent());
            else {
                newThreadFormData.append("body", this.editPostBody);
            }
            //newThreadFormData.append( "isBoardOnly", this.newThreadIsBoardOnly.toString() );
            //newThreadFormData.append( "isReadOnly", this.newThreadIsReadOnly.toString() );
            if (this.editPostAttachmentFile)
                newThreadFormData.append("attachedFile", this.editPostAttachmentFile);
            const postHeaders = {
                headers: { "Content-Type": undefined } // Need to remove this to avoid the JSON body assumption by the server which blocks file upload
            };
            let postUri = "/api/CommentThread/CreateThreadFromForm";
            if (this.editPostItem.commentThreadId) {
                postUri = `/api/CommentThread/EditThreadFromForm/${this.editPostItem.commentThreadId}`;
                if (this.editPostItem.editShouldRemoveAttachment)
                    newThreadFormData.append("editShouldRemoveAttachment", "true");
            }
            this.isLoading = true;
            this.$http.post(postUri, newThreadFormData, postHeaders).then(() => {
                this.isLoading = false;
                this.shouldShowEditPostModal = false;
                this.removeNewPostAttachment();
                // Ensure we refresh everything
                this.commentThreads = [];
                this.refreshCommentThreads(false);
            }, (response) => {
                this.isLoading = false;
                alert("Failed to create post: " + response.data.exceptionMessage);
            });
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        addComment(curThread, parentComment) {
            const newCommentText = this.newBodyMceEditor ? this.newBodyMceEditor.getContent() : curThread.newRootCommentText;
            if (!newCommentText) {
                alert("You must enter text to submit a comment");
                return;
            }
            const newCommentFormData = new FormData();
            newCommentFormData.append("commentText", newCommentText);
            if (curThread.attachmentFile) // && this.attachmentFiles.length > 0 )
             {
                newCommentFormData.append("attachedFile", curThread.attachmentFile);
                //for( let i = 0; i < this.attachmentFiles.length; ++i )
                //    newCommentFormData.append( "attachedFile" + i, this.attachmentFiles[i] );
            }
            //newCommentFormData.append( "attachedGroupDocId", null );
            const putHeaders = {
                headers: { "Content-Type": undefined } // Need to remove this to avoid the JSON body assumption by the server
            };
            curThread.isLoading = true;
            this.$http.put(`/api/CommentThread/${curThread.commentThreadId}/AddCommentFromForm`, newCommentFormData, putHeaders).then(() => {
                curThread.isLoading = false;
                this.newCommentText = "";
                if (this.newBodyMceEditor)
                    this.newBodyMceEditor.setContent("");
                this.removeAttachment(curThread);
                this.refreshSingleCommentThread(curThread.commentThreadId).then(newThread => newThread.commentsAreVisible = true);
            }, (response) => {
                curThread.isLoading = false;
                alert("Failed to add comment: " + response.data.exceptionMessage);
            });
        }
        onAttachmentFileSelected(curThread, parentComment, event) {
            curThread.attachmentFile = event.target.files[0];
            if (curThread.attachmentFile)
                curThread.attachmentPreviewUrl = URL.createObjectURL(curThread.attachmentFile);
            else
                curThread.attachmentPreviewUrl = null;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        openAttachmentFilePicker(curThread, parentComment) {
            const fileElemId = "file-attacher-root-" + curThread.commentThreadId;
            document.getElementById(fileElemId).click();
        }
        removeAttachment(curThread) {
            const fileElemId = "file-attacher-root-" + curThread.commentThreadId;
            curThread.attachmentFile = null;
            curThread.attachmentPreviewUrl = null;
            const fileInput = document.getElementById(fileElemId);
            if (fileInput)
                fileInput.value = null;
        }
        onNewPostFileAttached(event) {
            this.editPostAttachmentFile = event.target.files[0];
            this.newPostAttachmentPreviewUrl = null;
            if (this.editPostAttachmentFile) {
                const fileType = this.editPostAttachmentFile['type'];
                const validImageTypes = ['image/gif', 'image/jpeg', 'image/png'];
                if (validImageTypes.includes(fileType)) {
                    this.newPostAttachmentPreviewUrl = URL.createObjectURL(this.editPostAttachmentFile);
                }
            }
        }
        removeNewPostAttachment() {
            this.editPostAttachmentFile = null;
            this.newPostAttachmentPreviewUrl = null;
            const fileInput = document.getElementById("new-post-attachment-input");
            if (fileInput)
                fileInput.value = null;
        }
        getFileIcon(fileName) {
            return Ally.HtmlUtil2.getFileIcon(fileName);
        }
        onViewAttachedDoc(comment) {
            BulletinBoardController.sharedViewAttachedDoc(comment, this.$http, this.siteInfo);
        }
        static sharedViewAttachedDoc(comment, $http, siteInfo) {
            const viewDocWindow = window.open('', '_blank');
            const wasPopUpBlocked = !viewDocWindow || viewDocWindow.closed || typeof viewDocWindow.closed === "undefined";
            if (wasPopUpBlocked) {
                alert(`Looks like your browser may be blocking pop-ups which are required to view documents. Please see the right of the address bar or your browser settings to enable pop-ups for ${AppConfig.appName}.`);
                //this.showPopUpWarning = true;
            }
            else
                viewDocWindow.document.write('Loading document... (If the document cannot be viewed directly in your browser, it will be downloaded automatically)');
            //this.isLoading = true;
            const viewUri = "/api/DocumentLink/DiscussionAttachment/" + comment.commentId;
            $http.get(viewUri).then((response) => {
                //this.isLoading = false;
                const s3Path = comment.attachedDocPath.substring("s3:".length);
                let fileUri = `Documents/${s3Path}?vid=${encodeURIComponent(response.data.vid)}`;
                fileUri = siteInfo.publicSiteInfo.baseApiUrl + fileUri;
                viewDocWindow.location.href = fileUri;
            }, (response) => {
                //this.isLoading = false;
                alert("Failed to open document: " + response.data.exceptionMessage);
            });
        }
        /**
         * Archive this thread
         */
        archiveThread(thread, shouldArchive = true) {
            if (shouldArchive) {
                let message = "Are you sure you want to remove this post? This will remove the post from the bulletin board, but can be recovered by site admin.";
                if (!thread.isLoggedInUserAuthor)
                    message += "\n\nIf you proceed, since you're removing someone else's post, it would be good to notify them why you took down their post.";
                if (!confirm(message))
                    return;
            }
            thread.isLoading = true;
            let putUri = `/api/CommentThread/Archive/${thread.commentThreadId}`;
            if (!shouldArchive)
                putUri = `/api/CommentThread/Unarchive/${thread.commentThreadId}`;
            this.$http.put(putUri, null).then(() => {
                thread.isLoading = false;
                // No need to refresh everything, just remove this thread entry
                if (this.shouldIncludeArchived)
                    this.refreshCommentThreads();
                else if (shouldArchive)
                    this.commentThreads = this.commentThreads.filter(ct => ct.commentThreadId !== thread.commentThreadId);
                else
                    this.refreshSingleCommentThread(thread.commentThreadId);
            }, (response) => {
                thread.isLoading = false;
                alert("Failed to remove post: " + response.data.exceptionMessage);
            });
        }
        /**
         * Occurs when the user clicks the text link to display a post's comments
         */
        showCommentsForThread(commentThread) {
            //console.log( "In showCommentsForThread", commentThread.commentThreadId, commentThread );
            // If we've already loaded the comments, just toggle the visibility
            if (commentThread.comments) {
                commentThread.commentsAreVisible = true;
                return;
            }
            this.refreshSingleCommentThread(commentThread.commentThreadId).then((newThread) => newThread.commentsAreVisible = true);
        }
        /**
         * Occurs when the user clicks the text links to change the post sort
         */
        changePostSort(newSort) {
            // Ensure a sensible default on bad input
            const validValues = ["lastCommentDateUtc", "createDateUtc"];
            if (!validValues.includes(newSort))
                newSort = "lastCommentDateUtc";
            this.sortPostsByFieldName = newSort;
            this.commentThreads = _.sortBy(this.commentThreads, ct => ct.pinnedDateUtc ? ct.pinnedDateUtc : moment(ct[this.sortPostsByFieldName]).subtract(100, "years").toDate()).reverse();
        }
        /**
         * Occurs when the user clicks the text links to change the post sort
         */
        togglePostPinned(commentThread) {
            console.log("In togglePostPinned");
            this.isLoading = true;
            this.$http.put("/api/CommentThread/TogglePinned/" + commentThread.commentThreadId, null).then(() => {
                this.isLoading = false;
                this.refreshCommentThreads();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to toggle post pinned state: " + response.data.exceptionMessage);
            });
        }
    }
    BulletinBoardController.$inject = ["$http", "SiteInfo", "$timeout", "$scope", "fellowResidents"];
    Ally.BulletinBoardController = BulletinBoardController;
})(Ally || (Ally = {}));
CA.angularApp.component("bulletinBoard", {
    bindings: {
        committeeId: "<?"
    },
    templateUrl: "/ngApp/services/bulletin-board.html",
    controller: Ally.BulletinBoardController
});
