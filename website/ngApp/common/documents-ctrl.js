var Ally;
(function (Ally) {
    class DocumentTreeFile {
    }
    Ally.DocumentTreeFile = DocumentTreeFile;
    class DocLinkInfo {
    }
    Ally.DocLinkInfo = DocLinkInfo;
    class DocumentDirectory {
        getSubDirectoryByName(dirName) {
            if (!this.subdirectories)
                return null;
            for (let dirIndex = 0; dirIndex < this.subdirectories.length; ++dirIndex) {
                if (this.subdirectories[dirIndex].name === dirName)
                    return this.subdirectories[dirIndex];
            }
            return null;
        }
    }
    Ally.DocumentDirectory = DocumentDirectory;
    /**
     * The controller for the documents widget that lets group view, upload, and modify documents
     */
    class DocumentsController {
        /**
         * The constructor for the class
         */
        constructor($http, $rootScope, $cacheFactory, $scope, siteInfo, fellowResidents, $location) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.$cacheFactory = $cacheFactory;
            this.$scope = $scope;
            this.siteInfo = siteInfo;
            this.fellowResidents = fellowResidents;
            this.$location = $location;
            this.isLoading = false;
            this.filesSortDescend = false;
            this.title = "Documents";
            this.getDocsUri = "/api/ManageDocuments";
            this.showPopUpWarning = false;
            this.shouldShowSubdirectories = true;
            // Get or create the docs data cache
            this.docsHttpCache = this.$cacheFactory.get("docs-http-cache") || this.$cacheFactory("docs-http-cache");
            this.fileSortType = window.localStorage[DocumentsController.LocalStorageKey_SortType];
            if (!this.fileSortType)
                this.fileSortType = "title";
            this.filesSortDescend = window.localStorage[DocumentsController.LocalStorageKey_SortDirection] === "true";
            this.fileSearch = {
                all: ""
            };
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            this.canManage = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager;
            // Make sure committee members can manage their data
            if (this.committee && !this.canManage)
                this.fellowResidents.isCommitteeMember(this.committee.committeeId).then(isCommitteeMember => this.canManage = isCommitteeMember);
            this.apiAuthToken = this.$rootScope.authToken;
            this.Refresh();
            const hookUpFileUpload = () => {
                const uploader = $('#JQDocsFileUploader');
                uploader.fileupload({
                    autoUpload: true,
                    pasteZone: null,
                    add: (e, data) => {
                        //var scopeElement = document.getElementById( 'documents-area' );
                        //var scope = angular.element( scopeElement ).scope();
                        //this.$scope.$apply( () => this.isLoading = false );
                        const MaxFileSize = 1024 * 1024 * 50;
                        if (data.files[0].size > MaxFileSize) {
                            const fileMB = Math.round(data.files[0].size / (1024 * 1024)) + 1;
                            alert(`The selected file is too large (${fileMB}MB). The maximum file size allowed is 50MB.`);
                            return;
                        }
                        const dirPath = this.getSelectedDirectoryPath();
                        $("#FileUploadProgressContainer").show();
                        data.url = "api/DocumentUpload?dirPath=" + encodeURIComponent(dirPath);
                        if (this.siteInfo.publicSiteInfo.baseApiUrl)
                            data.url = this.siteInfo.publicSiteInfo.baseApiUrl + "DocumentUpload?dirPath=" + encodeURIComponent(dirPath);
                        const xhr = data.submit();
                        xhr.done(() => {
                            // Clear the cached documents since we uploaded a file
                            this.docsHttpCache.removeAll();
                            $("#FileUploadProgressContainer").hide();
                            this.Refresh();
                        });
                        xhr.error((jqXHR) => {
                            alert("Upload failed: " + jqXHR.responseJSON.exceptionMessage);
                            //console.log( "fail", jqXHR, textStatus, errorThrown );
                        });
                    },
                    beforeSend: (xhr) => {
                        if (this.siteInfo.publicSiteInfo.baseApiUrl)
                            xhr.setRequestHeader("Authorization", "Bearer " + this.apiAuthToken);
                        else
                            xhr.setRequestHeader("ApiAuthToken", this.apiAuthToken);
                    },
                    progressall: (e, data) => {
                        const progress = parseInt((data.loaded / data.total * 100).toString(), 10);
                        $('#FileUploadProgressBar').css('width', progress + '%');
                        if (progress === 100)
                            $("#FileUploadProgressLabel").text("Finalizing Upload...");
                        else
                            $("#FileUploadProgressLabel").text(progress + "%");
                    },
                    fail: (e, xhr) => {
                        $("#FileUploadProgressContainer").hide();
                        alert("Failed to upload document");
                        console.log("Failed to upload document", xhr);
                    }
                });
            };
            setTimeout(hookUpFileUpload, 100);
            if (this.committee)
                this.title = "Committee Documents";
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Get the name of the selected directory. If it is a sub-directory then include the parent
        // name.
        ///////////////////////////////////////////////////////////////////////////////////////////////
        getSelectedDirectoryPath() {
            return this.getDirectoryFullPath(this.selectedDirectory);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Open a document via double-click
        ///////////////////////////////////////////////////////////////////////////////////////////////
        viewDoc(curFile, isForDownload) {
            this.isLoading = true;
            this.showPopUpWarning = false;
            let viewDocWindow;
            // Force download of RTFs. Eventually we'll make this a allow-list of extensions that
            // browsers can display directly
            if (this.getDisplayExtension(curFile) === ".rtf")
                isForDownload = true;
            // Increment the local view count for fast feedback
            ++curFile.numViews;
            // If we're viewing the document in the browser, test if pop-ups are blocked
            if (!isForDownload) {
                viewDocWindow = window.open('', '_blank');
                const wasPopUpBlocked = !viewDocWindow || viewDocWindow.closed || typeof viewDocWindow.closed === "undefined";
                if (wasPopUpBlocked) {
                    alert(`Looks like your browser may be blocking pop-ups which are required to view documents. Please see the right of the address bar or your browser settings to enable pop-ups for ${AppConfig.appName}.`);
                    this.showPopUpWarning = true;
                }
                else
                    viewDocWindow.document.write('Loading document... (If the document cannot be viewed directly in your browser, it will be downloaded automatically)');
            }
            const viewUri = "/api/DocumentLink/" + curFile.docId;
            this.$http.get(viewUri).then((response) => {
                this.isLoading = false;
                let fileUri = `${curFile.url}?vid=${encodeURIComponent(response.data.vid)}`;
                if (HtmlUtil.startsWith(fileUri, "/api/"))
                    fileUri = fileUri.substr("/api/".length);
                fileUri = this.siteInfo.publicSiteInfo.baseApiUrl + fileUri;
                if (isForDownload) {
                    // Create a link and click it
                    const link = document.createElement('a');
                    link.setAttribute("type", "hidden"); // make it hidden if needed
                    link.href = fileUri + "&dl=" + encodeURIComponent(curFile.fileName);
                    link.download = curFile.fileName;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                }
                else {
                    // Android doesn't open PDFs in the browser, so let Google Docs do it
                    if (Ally.HtmlUtil2.isAndroid())
                        viewDocWindow.location.href = "http://docs.google.com/gview?embedded=true&url=" + encodeURIComponent(fileUri);
                    else
                        viewDocWindow.location.href = fileUri;
                }
            }, (response) => {
                this.isLoading = false;
                alert("Failed to open document: " + response.data.exceptionMessage);
            });
        }
        startZipGenDownload() {
            let refreshGenStatus = null;
            //let numRefreshes = 0;
            refreshGenStatus = () => {
                this.$http.get("/api/DocumentUpload/GetZipGenStatus?vid=" + this.generatingZipId).then((response) => {
                    //++numRefreshes;
                    if (response.data.totalNumFiles === 0)
                        this.generatingZipStatus = "Still waiting...";
                    else
                        this.generatingZipStatus = `${response.data.numFilesProcessed} of ${response.data.totalNumFiles} files processed`;
                    if (response.data.isReady) {
                        this.generatingZipStatus = "ready";
                        this.downloadZipUrl = this.siteInfo.publicSiteInfo.baseApiUrl + "DocumentUpload/DownloadZipGen?vid=" + this.generatingZipId;
                    }
                    else
                        window.setTimeout(() => refreshGenStatus(), 750);
                }, (response) => {
                    this.generatingZipStatus = null;
                    alert("Zip file generation failed: " + response.data.exceptionMessage);
                });
            };
            this.generatingZipStatus = "Starting...";
            let getUri = "/api/DocumentUpload/StartFullZipGeneration";
            if (this.committee)
                getUri += "?committeeId=" + this.committee.committeeId;
            this.$http.get(getUri).then((response) => {
                this.generatingZipId = response.data.statusId;
                this.generatingZipStatus = "Waiting for update...";
                window.setTimeout(() => refreshGenStatus(), 1250);
            }, (response) => {
                this.generatingZipStatus = null;
                alert("Failed to start zip generation: " + response.data.exceptionMessage);
            });
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Get the name of the selected directory. If it is a sub-directory then include the parent
        // name.
        ///////////////////////////////////////////////////////////////////////////////////////////////
        getDirectoryFullPath(dir) {
            let curPath = dir.name;
            let parentDir = dir.parentDirectory;
            while (parentDir) {
                curPath = parentDir.name + "/" + curPath;
                parentDir = parentDir.parentDirectory;
            }
            if (this.committee)
                curPath = DocumentsController.DirName_Committees + "/" + this.committee.committeeId + "/" + curPath;
            return curPath;
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Find a directory object by name
        ///////////////////////////////////////////////////////////////////////////////////////////////
        FindDirectoryByPath(dirPath) {
            if (!this.documentTree)
                return;
            // Remove the committee prefix if there is one
            if (this.committee && HtmlUtil.startsWith(dirPath, DocumentsController.DirName_Committees)) {
                dirPath = dirPath.substr(DocumentsController.DirName_Committees.length + 1);
                const lastSlashIndex = dirPath.indexOf('/');
                if (lastSlashIndex !== -1)
                    dirPath = dirPath.substr(lastSlashIndex + 1);
            }
            // Split on slashes
            const dirPathParts = dirPath.split("/");
            let curDir = this.documentTree;
            for (let i = 0; i < dirPathParts.length; ++i) {
                curDir = curDir.getSubDirectoryByName(dirPathParts[i]);
                if (!curDir)
                    break;
            }
            return curDir;
        }
        updateFileFilter() {
            const lowerFilter = (this.fileSearch.all || '').toLowerCase();
            const filterSearchFiles = (file) => {
                return (file.localFilePath || '').toLowerCase().indexOf(lowerFilter) !== -1
                    || (file.uploadDateString || '').toLowerCase().indexOf(lowerFilter) !== -1
                    || (file.uploaderFullName || '').toLowerCase().indexOf(lowerFilter) !== -1;
            };
            this.searchFileList = _.filter(this.fullSearchFileList, filterSearchFiles);
            setTimeout(() => {
                // Force redraw of the document. Not sure why, but the file list disappears on Chrome
                const element = document.getElementById("documents-area");
                const disp = element.style.display;
                element.style.display = 'none';
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const trick = element.offsetHeight;
                element.style.display = disp;
            }, 50);
        }
        // Make it so the user can drag and drop files between folders
        hookUpFileDragging() {
            // If the user can't manage the association then do nothing
            if (!this.canManage)
                return;
            setTimeout(() => {
                // Make the folders accept dropped files
                const droppables = $(".droppable");
                droppables.droppable({
                    drop: (event, ui) => {
                        const selectedDirectoryPath = this.getSelectedDirectoryPath();
                        const uiDraggable = $(ui.draggable);
                        uiDraggable.draggable("option", "revert", "false");
                        const destFolderName = $(event.target).attr("data-folder-path").trim();
                        this.$scope.$apply(() => {
                            // Display the loading image
                            this.isLoading = true;
                            const fileAction = {
                                relativeS3Path: this.selectedFile.relativeS3Path,
                                action: "move",
                                newFileName: "",
                                sourceFolderPath: selectedDirectoryPath,
                                destinationFolderPath: destFolderName
                            };
                            this.selectedFile = null;
                            // Tell the server
                            this.$http.put("/api/ManageDocuments/MoveFile", fileAction).then(() => {
                                this.isLoading = false;
                                // Clear the docs cache so we fully refresh the file list since a file has moved
                                this.docsHttpCache.removeAll();
                                this.Refresh();
                                //innerThis.documentTree = httpResponse.data;
                                //innerThis.documentTree.getSubDirectoryByName = DocumentDirectory.prototype.getSubDirectoryByName;
                                //// Hook up parent directories
                                //innerThis.documentTree.subdirectories.forEach(( dir ) =>
                                //{
                                //    innerThis.hookupParentDirs( dir );
                                //} );
                                //innerThis.hookUpFileDragging();
                                //// Find the directory we had selected
                                //innerThis.selectedDirectory = innerThis.FindDirectoryByPath( selectedDirectoryPath );
                                //innerThis.SortFiles();
                            }, (data) => {
                                this.isLoading = false;
                                const message = data.exceptionMessage || data.message || data;
                                alert("Failed to move file: " + message);
                            });
                        });
                    },
                    hoverClass: "Document_Folder_DropHover"
                });
                // Allow the files to be dragged
                const draggables = $(".draggable");
                draggables.draggable({
                    distance: 10,
                    revert: true,
                    helper: "clone",
                    opacity: 1,
                    containment: "document",
                    appendTo: "body",
                    start: (event) => {
                        // Get the index of the file being dragged (ID is formatted like "File_12")
                        const fileIndexString = $(event.target).attr("id").substring("File_".length);
                        const fileIndex = parseInt(fileIndexString);
                        this.$scope.$apply(() => {
                            const fileInfo = this.selectedDirectory.files[fileIndex];
                            this.selectedFile = fileInfo;
                        });
                    }
                });
            }, 250);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when a directory gets clicked. I made this an inline expression, but the model did
        // not refresh
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onDirectoryClicked(dir) {
            // If the user clicked on the currently-selected directory, then toggle the subdirectories
            if (this.selectedDirectory === dir)
                this.shouldShowSubdirectories = !this.shouldShowSubdirectories;
            else
                this.shouldShowSubdirectories = true;
            this.selectedDirectory = dir;
            this.selectedFile = null;
            this.fileSearch.all = null;
            this.hookUpFileDragging();
            this.SortFiles();
            if (this.committee) {
                const committeePrefix = DocumentsController.DirName_Committees + "/" + this.committee.committeeId + "/";
                this.$location.search("directory", dir.fullDirectoryPath.substring(committeePrefix.length));
            }
            else
                this.$location.search("directory", dir.fullDirectoryPath);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to create a directory within the root directory
        ///////////////////////////////////////////////////////////////////////////////////////////////
        createDirectory() {
            this.createUnderParentDirName = null;
            if (this.committee)
                this.createUnderParentDirName = DocumentsController.DirName_Committees + "/" + this.committee.committeeId;
            this.shouldShowCreateFolderModal = true;
            setTimeout(() => $('#CreateDirectoryNameTextBox').focus(), 50);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to create a directory within the current directory
        ///////////////////////////////////////////////////////////////////////////////////////////////
        createSubDirectory() {
            //console.log( "In createSubDirectory", this.selectedDirectory.fullDirectoryPath );
            this.createUnderParentDirName = this.selectedDirectory.fullDirectoryPath;
            this.shouldShowCreateFolderModal = true;
            setTimeout(() => $('#CreateDirectoryNameTextBox').focus(), 50);
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to sort the files
        ///////////////////////////////////////////////////////////////////////////////////////////////
        SetFileSortType(sortType) {
            // If we're already sorting by this property, flip the order
            if (this.fileSortType === sortType)
                this.filesSortDescend = !this.filesSortDescend;
            else
                this.filesSortDescend = false;
            this.fileSortType = sortType;
            window.localStorage[DocumentsController.LocalStorageKey_SortType] = this.fileSortType;
            window.localStorage[DocumentsController.LocalStorageKey_SortDirection] = this.filesSortDescend;
            this.SortFiles();
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Sort the visible files according to our selected method
        ///////////////////////////////////////////////////////////////////////////////////////////////
        SortFiles() {
            if (!this.selectedDirectory || !this.selectedDirectory.files)
                return;
            if (this.fileSortType === "title" || this.fileSortType === "uploadDate")
                this.selectedDirectory.files = _.sortBy(this.selectedDirectory.files, this.fileSortType);
            if (this.filesSortDescend)
                this.selectedDirectory.files.reverse();
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to create a new directory
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onCreateDirectoryClicked() {
            // Display the loading image
            this.isLoading = true;
            let putUri = "/api/ManageDocuments/CreateDirectory?folderName=" + encodeURIComponent(this.newDirectoryName);
            // If we're creating a subdirectory
            putUri += "&parentFolderPath=";
            if (this.createUnderParentDirName)
                putUri += encodeURIComponent(this.createUnderParentDirName);
            this.$http.put(putUri, null).then(() => {
                // Clear the docs cache so we fully refresh the file list since a new directory exists
                this.docsHttpCache.removeAll();
                this.newDirectoryName = "";
                this.Refresh();
                this.shouldShowCreateFolderModal = false;
            }, (response) => {
                alert("Failed to create the folder: " + response.data.exceptionMessage);
                this.isLoading = false;
            });
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the cancel button when creating a new directory
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onCancelAddDirectory() {
            this.shouldShowCreateFolderModal = false;
            this.newDirectoryName = "";
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when a file gets clicked
        ///////////////////////////////////////////////////////////////////////////////////////////////
        onFileClicked(file) {
            this.selectedFile = file;
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to rename a document
        ///////////////////////////////////////////////////////////////////////////////////////////////
        RenameDocument(document) {
            if (!document)
                return;
            let newTitle = prompt("Enter the new name for the file", document.title);
            if (newTitle === null)
                return;
            if (newTitle.length > 64)
                newTitle = newTitle.substr(0, 64);
            // Display the loading image
            this.isLoading = true;
            const fileAction = {
                relativeS3Path: document.relativeS3Path,
                action: "rename",
                newTitle: newTitle,
                sourceFolderPath: this.getSelectedDirectoryPath(),
                destinationFolderPath: ""
            };
            this.$http.put("/api/ManageDocuments/RenameFile", fileAction).then(() => {
                // Clear the docs cache so we fully refresh the file list since a file was renamed
                this.docsHttpCache.removeAll();
                this.Refresh();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to rename: " + response.data.exceptionMessage);
                this.Refresh();
            });
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to delete a document
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DeleteDocument(document) {
            if (confirm("Are you sure you want to delete this file?")) {
                // Display the loading image
                this.isLoading = true;
                this.$http.delete("/api/ManageDocuments?docPath=" + document.relativeS3Path).then(() => {
                    // Clear the docs cache so we fully refresh the file list since a file was deleted
                    this.docsHttpCache.removeAll();
                    this.Refresh();
                }, (response) => {
                    this.isLoading = false;
                    alert("Failed to delete file: " + response.data.exceptionMessage);
                    this.Refresh();
                });
            }
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to edit a directory name
        ///////////////////////////////////////////////////////////////////////////////////////////////
        RenameSelectedDirectory() {
            if (!this.selectedDirectory)
                return;
            let newDirectoryName = prompt("Enter the new name for the directory", this.selectedDirectory.name);
            if (newDirectoryName === null)
                return;
            if (newDirectoryName.length > 32)
                newDirectoryName = newDirectoryName.substr(0, 32);
            // Display the loading image
            this.isLoading = true;
            const oldDirectoryPath = encodeURIComponent(this.getSelectedDirectoryPath());
            const newDirectoryNameQS = encodeURIComponent(newDirectoryName);
            this.$http.put("/api/ManageDocuments/RenameDirectory?directoryPath=" + oldDirectoryPath + "&newDirectoryName=" + newDirectoryNameQS, null).then(() => {
                // Clear the docs cache so we fully refresh the file list since a directory was renamed
                this.docsHttpCache.removeAll();
                // Update the selected directory name so we can reselect it
                this.selectedDirectory.name = newDirectoryName;
                this.Refresh();
            }, (response) => {
                this.isLoading = false;
                alert("Failed to rename directory: " + response.data.exceptionMessage);
            });
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to delete a document
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DeleteSelectedDirectory() {
            if (!this.selectedDirectory)
                return;
            if (this.selectedDirectory.files.length > 0) {
                alert("You can not delete a folder that contains files. Please delete or move all files from the folder.");
                return;
            }
            if (confirm(`Are you sure you want to delete this folder? (${this.selectedDirectory.name})`)) {
                // Display the loading image
                this.isLoading = true;
                const dirPath = this.getSelectedDirectoryPath();
                this.$http.delete("/api/ManageDocuments/DeleteDirectory?directoryPath=" + encodeURIComponent(dirPath)).then(() => {
                    // Clear the docs cache so we fully refresh the file list since a directory was deleted
                    this.docsHttpCache.removeAll();
                    this.Refresh();
                }, (httpResult) => {
                    this.isLoading = false;
                    alert("Failed to delete the folder: " + httpResult.data.exceptionMessage);
                });
            }
        }
        getFileIcon(fileName) {
            return Ally.HtmlUtil2.getFileIcon(fileName);
        }
        isGenericIcon(file) {
            const iconFilePath = Ally.HtmlUtil2.getFileIcon(file.fileName);
            const GenericIconPath = "/assets/images/FileIcons/GenericFileIcon.png";
            return iconFilePath === GenericIconPath;
        }
        getDisplayExtension(file) {
            const extension = file.fileName.split('.').pop().toLowerCase();
            return "." + extension;
        }
        hookupParentDirs(dir) {
            dir.fullDirectoryPath = this.getDirectoryFullPath(dir);
            dir.getSubDirectoryByName = DocumentDirectory.prototype.getSubDirectoryByName;
            if (!dir.subdirectories)
                return;
            dir.subdirectories.forEach((subDir) => {
                subDir.parentDirectory = dir;
                subDir.directoryDepth = dir.directoryDepth + 1;
                this.hookupParentDirs(subDir);
            });
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Refresh the file tree
        ///////////////////////////////////////////////////////////////////////////////////////////////
        Refresh() {
            // Store the name of the directory we have selected so we can re-select it after refreshing
            // the data
            let selectedDirectoryPath = null;
            if (this.selectedDirectory)
                selectedDirectoryPath = this.getSelectedDirectoryPath();
            else if (!HtmlUtil.isNullOrWhitespace(this.$location.search().directory)) {
                if (this.committee)
                    selectedDirectoryPath = DocumentsController.DirName_Committees + "/" + this.committee.committeeId + "/" + this.$location.search().directory;
                else
                    selectedDirectoryPath = this.$location.search().directory;
            }
            // Display the loading image
            this.isLoading = true;
            this.selectedDirectory = null;
            this.selectedFile = null;
            this.getDocsUri = "/api/ManageDocuments";
            if (this.committee)
                this.getDocsUri += "/Committee/" + this.committee.committeeId;
            this.$http.get(this.getDocsUri, { cache: this.docsHttpCache }).then((httpResponse) => {
                this.isLoading = false;
                this.documentTree = httpResponse.data;
                this.documentTree.getSubDirectoryByName = DocumentDirectory.prototype.getSubDirectoryByName;
                // Hook up parent directories
                this.documentTree.subdirectories.forEach((dir) => {
                    dir.directoryDepth = 0;
                    this.hookupParentDirs(dir);
                });
                // Build an array of all local files
                const allFiles = [];
                const processDir = (subdir) => {
                    _.each(subdir.files, (f) => {
                        f.localFilePath = subdir.name + "/" + f.title;
                        f.uploadDateString = moment(f.uploadDate).format("MMMM D, YYYY");
                    });
                    Array.prototype.push.apply(allFiles, subdir.files);
                    _.each(subdir.subdirectories, processDir);
                };
                processDir(this.documentTree);
                this.fullSearchFileList = allFiles;
                // Find the directory we had selected before the refresh
                if (selectedDirectoryPath) {
                    this.selectedDirectory = this.FindDirectoryByPath(selectedDirectoryPath);
                    this.SortFiles();
                }
                this.hookUpFileDragging();
            }, (response) => {
                alert("Failed to retrieve documents, please contact technical support. No need to worry, no documents have been lost.");
                this.isLoading = false;
                console.log("Failed to retrieve docs: " + response.data.exceptionMessage);
                //$( "#FileTreePanel" ).hide();
                //innerThis.errorMessage = "Failed to retrieve the building documents.";
            });
        }
    }
    DocumentsController.$inject = ["$http", "$rootScope", "$cacheFactory", "$scope", "SiteInfo", "fellowResidents", "$location"];
    DocumentsController.LocalStorageKey_SortType = "DocsInfo_FileSortType";
    DocumentsController.LocalStorageKey_SortDirection = "DocsInfo_FileSortDirection";
    DocumentsController.DirName_Committees = "Committees_Root";
    DocumentsController.ViewableExtensions = ["jpg", "jpeg", "png", "pdf", "txt"];
    Ally.DocumentsController = DocumentsController;
    class FullZipGenStatus {
    }
})(Ally || (Ally = {}));
CA.angularApp.component("documents", {
    bindings: {
        committee: "<"
    },
    templateUrl: "/ngApp/common/documents.html",
    controller: Ally.DocumentsController
});
