CA.angularApp.directive( "groupComments", ["$http", "$rootScope", function( $http, $rootScope )
{
    function CommentController()
    {
        var ctrlVM = this;

        ctrlVM.threadId = "Home";

        ctrlVM.isQaSite = HtmlUtil.getSubdomain() === "qa" || HtmlUtil.getSubdomain() === "localtest";


        ctrlVM.editComment = {
            threadId: ctrlVM.threadId,
            commentText: "",
            replyToCommentId: null
        };


        ctrlVM.displayDiscussModal = function()
        {
            ctrlVM.showDiscussModal = true;
        };

        ctrlVM.hideDiscussModal = function()
        {
            //TODO put in a delay before we allow close to avoid the mobile tap-open-close issue
            ctrlVM.showDiscussModal = false;
        };


        ///////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Retrieve the comments from the server for the current thread
        ctrlVM.refreshComments = function()
        {
            ctrlVM.isLoading = true;

            $http.get( "/api/Comment?threadId=" + ctrlVM.threadId ).then( function( httpResponse )
            {
                ctrlVM.isLoading = false;
                ctrlVM.commentList = httpResponse.data;

                var markDates = function( c )
                {
                    c.postDateUtc = moment.utc( c.postDateUtc ).toDate();

                    if( c.lastEditDateUtc )
                        c.lastEditDateUtc = moment.utc( c.lastEditDateUtc ).toDate();

                    if( c.deletedDateUtc )
                        c.deletedDateUtc = moment.utc( c.deletedDateUtc ).toDate();

                    c.isMyComment = c.authorUserId === $rootScope.userInfo.userId;

                    if( c.replies )
                        _.each( c.replies, markDates );
                };

                // Convert the UTC dates to local dates and mark the user's comments
                _.each( ctrlVM.commentList, markDates );

            }, function()
            {
                ctrlVM.isLoading = false;
            } );
        };


        ///////////////////////////////////////////////////////////////////////////////////////////
        // Add a comment
        ///////////////////////////////////////////////////////////////////////////////////////////
        ctrlVM.postComment = function( commentData )
        {
            ctrlVM.isLoading = true;

            var httpFunc = $http.post;
            if( typeof ( commentData.existingCommentId ) === "number" )
                httpFunc = $http.put;

            httpFunc( "/api/Comment", commentData ).then( function()
            {
                ctrlVM.isLoading = false;
                ctrlVM.editComment = {};
                ctrlVM.showReplyBoxId = -1;
                ctrlVM.refreshComments();

            }, function( data )
            {
                ctrlVM.isLoading = false;

                var errorMessage = !!data.exceptionMessage ? data.exceptionMessage : data;
                alert( "Failed to post comment: " + errorMessage );
            } );
        };


        ///////////////////////////////////////////////////////////////////////////////////////////
        // Add a comment to the current thread
        ///////////////////////////////////////////////////////////////////////////////////////////
        ctrlVM.onPostCommentClicked = function()
        {
            if( ctrlVM.editComment.commentText.length === 0 )
                return;

            // Copy the object to avoid updating the UI
            var commentData = {
                threadId: ctrlVM.threadId,
                commentText: ctrlVM.editComment.commentText,
                replyToCommentId: null,
                existingCommentId: ctrlVM.editComment.existingCommentId
            };

            ctrlVM.postComment( commentData );
        };


        ///////////////////////////////////////////////////////////////////////////////////////////
        // Edit an existing comment
        ///////////////////////////////////////////////////////////////////////////////////////////
        ctrlVM.editMyComment = function( comment )
        {
            ctrlVM.editComment = {
                commentText: comment.commentText,
                existingCommentId: comment.commentId
            };
        };


        ///////////////////////////////////////////////////////////////////////////////////////////
        // Delete a comment
        ///////////////////////////////////////////////////////////////////////////////////////////
        ctrlVM.deleteMyComment = function( comment )
        {
            ctrlVM.isLoading = true;

            $http.delete( "/api/Comment?commentId=" + comment.commentId ).then( function()
            {
                ctrlVM.isLoading = false;
                ctrlVM.refreshComments();

            }, function( httpResponse )
            {
                ctrlVM.isLoading = false;

                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert( "Failed to post comment: " + errorMessage );
            } );
        };


        ///////////////////////////////////////////////////////////////////////////////////////////
        // Add a comment in response to a comment in the current thread
        ///////////////////////////////////////////////////////////////////////////////////////////
        ctrlVM.onPostReplyCommentClicked = function()
        {
            if( ctrlVM.editComment.replyText.length === 0 )
                return;

            // Copy the object to avoid updating the UI
            var commentData = {
                threadId: ctrlVM.threadId,
                commentText: ctrlVM.editComment.replyText,
                replyToCommentId: ctrlVM.editComment.replyToCommentId
            };

            ctrlVM.postComment( commentData );
        };


        ///////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to reply
        ///////////////////////////////////////////////////////////////////////////////////////////
        ctrlVM.clickReplyToComment = function( commentId )
        {
            ctrlVM.showReplyBoxId = commentId;

            ctrlVM.editComment = {
                commentText: "",
                replyToCommentId: commentId
            };
        };

        ctrlVM.refreshComments();
    };

    return {
        scope: {},
        restrict: 'E',
        replace: 'true',
        controllerAs: 'ctrlVM',
        templateUrl: '/ngApp/Services/CommentDirectiveTemplate.html',
        controller: CommentController
    };
}] );