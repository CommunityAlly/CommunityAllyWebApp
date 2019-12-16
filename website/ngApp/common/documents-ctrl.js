/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../Scripts/typings/moment/moment.d.ts" />
/// <reference path="../../Scripts/typings/underscore/underscore.d.ts" />
/// <reference path="../Services/html-util.ts" />
var Ally;
(function (Ally) {
    var DocumentTreeFile = /** @class */ (function () {
        function DocumentTreeFile() {
        }
        return DocumentTreeFile;
    }());
    Ally.DocumentTreeFile = DocumentTreeFile;
    var DocLinkInfo = /** @class */ (function () {
        function DocLinkInfo() {
        }
        return DocLinkInfo;
    }());
    var DocumentDirectory = /** @class */ (function () {
        function DocumentDirectory() {
        }
        DocumentDirectory.prototype.getSubDirectoryByName = function (dirName) {
            if (!this.subdirectories)
                return null;
            for (var dirIndex = 0; dirIndex < this.subdirectories.length; ++dirIndex) {
                if (this.subdirectories[dirIndex].name === dirName)
                    return this.subdirectories[dirIndex];
            }
            return null;
        };
        return DocumentDirectory;
    }());
    Ally.DocumentDirectory = DocumentDirectory;
    /**
     * The controller for the documents widget that lets group view, upload, and modify documents
     */
    var DocumentsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function DocumentsController($http, $rootScope, $cacheFactory, $scope, siteInfo, fellowResidents) {
            var _this = this;
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.$cacheFactory = $cacheFactory;
            this.$scope = $scope;
            this.siteInfo = siteInfo;
            this.fellowResidents = fellowResidents;
            this.isLoading = false;
            this.filesSortDescend = false;
            this.title = "Documents";
            this.getDocsUri = "/api/ManageDocuments";
            this.showPopUpWarning = false;
            this.shouldShowSubdirectories = true;
            this.fileSortType = window.localStorage[DocumentsController.LocalStorageKey_SortType];
            if (!this.fileSortType)
                this.fileSortType = "title";
            this.filesSortDescend = window.localStorage[DocumentsController.LocalStorageKey_SortDirection] === "true";
            this.fileSearch = {
                all: ""
            };
            this.canManage = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager;
            // Make sure committee members can manage their data
            if (this.committee && !this.canManage)
                this.fellowResidents.isCommitteeMember(this.committee.committeeId, this.siteInfo.userInfo.userId).then(function (isCommitteeMember) { return _this.canManage = isCommitteeMember; });
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        DocumentsController.prototype.$onInit = function () {
            this.apiAuthToken = this.$rootScope.authToken;
            this.Refresh();
            var innerThis = this;
            var hookUpFileUpload = function () {
                $(function () {
                    var uploader = $('#JQDocsFileUploader');
                    uploader.fileupload({
                        autoUpload: true,
                        add: function (e, data) {
                            //var scopeElement = document.getElementById( 'documents-area' );
                            //var scope = angular.element( scopeElement ).scope();
                            //innerThis.$scope.$apply( function() { innerThis.isLoading = false; });
                            var MaxFileSize = 1024 * 1024 * 50;
                            if (data.files[0].size > MaxFileSize) {
                                var fileMB = Math.round(data.files[0].size / (1024 * 1024)) + 1;
                                alert("The selected file is too large (" + fileMB + "MB). The maximum file size allowed is 50MB.");
                                return;
                            }
                            var dirPath = innerThis.getSelectedDirectoryPath();
                            $("#FileUploadProgressContainer").show();
                            data.url = "api/DocumentUpload?dirPath=" + encodeURIComponent(dirPath);
                            var xhr = data.submit();
                            xhr.done(function (result) {
                                // Clear the document cache
                                innerThis.$cacheFactory.get('$http').remove(innerThis.getDocsUri);
                                $("#FileUploadProgressContainer").hide();
                                innerThis.Refresh();
                            });
                        },
                        beforeSend: function (xhr) {
                            xhr.setRequestHeader("ApiAuthToken", innerThis.apiAuthToken);
                        },
                        progressall: function (e, data) {
                            var progress = parseInt((data.loaded / data.total * 100).toString(), 10);
                            $('#FileUploadProgressBar').css('width', progress + '%');
                            if (progress === 100)
                                $("#FileUploadProgressLabel").text("Finalizing Upload...");
                            else
                                $("#FileUploadProgressLabel").text(progress + "%");
                        },
                        fail: function (xhr) {
                            $("#FileUploadProgressContainer").hide();
                            alert("Failed to upload document due led to upload document due to unexpected server error. Please re-log-in and try again.");
                        }
                    });
                });
            };
            setTimeout(hookUpFileUpload, 100);
            if (this.committee)
                this.title = "Committee Documents";
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Get the name of the selected directory. If it is a sub-directory then include the parent
        // name.
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.getSelectedDirectoryPath = function () {
            return this.getDirectoryFullPath(this.selectedDirectory);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Open a document via double-click
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.viewDoc = function (curFile, isForDownload) {
            var _this = this;
            this.isLoading = true;
            this.showPopUpWarning = false;
            var viewDocWindow;
            if (!isForDownload) {
                viewDocWindow = window.open('', '_blank');
                var wasPopUpBlocked = !viewDocWindow || viewDocWindow.closed || typeof viewDocWindow.closed === "undefined";
                if (wasPopUpBlocked) {
                    alert("Looks like your browser may be blocking pop-ups which are required to view documents. Please see the right of the address bar or your browser settings to enable pop-ups for " + AppConfig.appName + ".");
                    this.showPopUpWarning = true;
                }
                else
                    viewDocWindow.document.write('Loading document...');
            }
            this.$http.get("/api/DocumentLink/" + curFile.docId).then(function (response) {
                _this.isLoading = false;
                var fileUri = curFile.url + "?vid=" + response.data.vid;
                if (isForDownload) {
                    var link = document.createElement('a');
                    link.setAttribute("type", "hidden"); // make it hidden if needed
                    link.href = fileUri;
                    link.download = curFile.fileName;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                }
                else {
                    //let newWindow = window.open( fileUri, '_blank' );
                    viewDocWindow.location.href = fileUri;
                    //let wasPopUpBlocked = !newWindow || newWindow.closed || typeof newWindow.closed === "undefined";
                    //if( wasPopUpBlocked )
                    //    alert( `Looks like your browser may be blocking pop-ups which are required to view documents. Please see the right of the address bar or your browser settings to enable pop-ups for ${AppConfig.appName}.` );
                }
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to open document: " + response.data.exceptionMessage);
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Get the name of the selected directory. If it is a sub-directory then include the parent
        // name.
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.getDirectoryFullPath = function (dir) {
            var curPath = dir.name;
            var parentDir = dir.parentDirectory;
            while (parentDir) {
                curPath = parentDir.name + "/" + curPath;
                parentDir = parentDir.parentDirectory;
            }
            if (this.committee)
                curPath = DocumentsController.DirName_Committees + "/" + this.committee.committeeId + "/" + curPath;
            return curPath;
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Find a directory object by name
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.FindDirectoryByPath = function (dirPath) {
            if (!this.documentTree)
                return;
            // Remove the committee prefix if there is one
            if (this.committee && HtmlUtil.startsWith(dirPath, DocumentsController.DirName_Committees)) {
                dirPath = dirPath.substr(DocumentsController.DirName_Committees.length + 1);
                var lastSlashIndex = dirPath.indexOf('/');
                if (lastSlashIndex !== -1)
                    dirPath = dirPath.substr(lastSlashIndex + 1);
            }
            // Split on slashes
            var dirPathParts = dirPath.split("/");
            var curDir = this.documentTree;
            for (var i = 0; i < dirPathParts.length; ++i) {
                curDir = curDir.getSubDirectoryByName(dirPathParts[i]);
                if (!curDir)
                    break;
            }
            return curDir;
        };
        DocumentsController.prototype.updateFileFilter = function () {
            var lowerFilter = angular.lowercase(this.fileSearch.all) || '';
            var filterSearchFiles = function (file) {
                return angular.lowercase(file.localFilePath || '').indexOf(lowerFilter) !== -1
                    || angular.lowercase(file.uploadDateString || '').indexOf(lowerFilter) !== -1
                    || angular.lowercase(file.uploaderFullName || '').indexOf(lowerFilter) !== -1;
            };
            this.searchFileList = _.filter(this.fullSearchFileList, filterSearchFiles);
            setTimeout(function () {
                // Force redraw of the document. Not sure why, but the file list disappears on Chrome
                var element = document.getElementById("documents-area");
                var disp = element.style.display;
                element.style.display = 'none';
                var trick = element.offsetHeight;
                element.style.display = disp;
            }, 50);
        };
        // Make it so the user can drag and drop files between folders
        DocumentsController.prototype.hookUpFileDragging = function () {
            // If the user can't manage the association then do nothing
            if (!this.canManage)
                return;
            var innerThis = this;
            setTimeout(function () {
                // Make the folders accept dropped files
                var droppables = $(".droppable");
                droppables.droppable({
                    drop: function (event, ui) {
                        var selectedDirectoryPath = innerThis.getSelectedDirectoryPath();
                        var uiDraggable = $(ui.draggable);
                        uiDraggable.draggable("option", "revert", "false");
                        var destFolderName = $(this).attr("data-folder-path").trim();
                        innerThis.$scope.$apply(function () {
                            // Display the loading image
                            innerThis.isLoading = true;
                            var fileAction = {
                                relativeS3Path: innerThis.selectedFile.relativeS3Path,
                                action: "move",
                                newFileName: "",
                                sourceFolderPath: selectedDirectoryPath,
                                destinationFolderPath: destFolderName
                            };
                            //innerThis.selectedDirectory = null;
                            innerThis.selectedFile = null;
                            // Tell the server
                            innerThis.$http.put("/api/ManageDocuments/MoveFile", fileAction).then(function () {
                                innerThis.isLoading = false;
                                // Clear the document cache
                                innerThis.$cacheFactory.get('$http').remove(innerThis.getDocsUri);
                                innerThis.Refresh();
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
                            }, function (data) {
                                innerThis.isLoading = false;
                                var message = data.exceptionMessage || data.message || data;
                                alert("Failed to move file: " + message);
                            });
                        });
                    },
                    hoverClass: "Document_Folder_DropHover"
                });
                // Allow the files to be dragged
                var draggables = $(".draggable");
                draggables.draggable({
                    distance: 10,
                    revert: true,
                    helper: "clone",
                    opacity: 0.7,
                    containment: "document",
                    appendTo: "body",
                    start: function (event, ui) {
                        // Get the index of the file being dragged (ID is formatted like "File_12")
                        var fileIndexString = $(this).attr("id").substring("File_".length);
                        var fileIndex = parseInt(fileIndexString);
                        innerThis.$scope.$apply(function () {
                            var fileInfo = innerThis.selectedDirectory.files[fileIndex];
                            innerThis.selectedFile = fileInfo;
                        });
                    }
                });
            }, 250);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when a directory gets clicked. I made this an inline expression, but the model did
        // not refresh
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.onDirectoryClicked = function (dir) {
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
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to create a directory within the current directory
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.createDirectory = function () {
            this.createUnderParentDirName = null;
            if (this.committee)
                this.createUnderParentDirName = DocumentsController.DirName_Committees + "/" + this.committee.committeeId;
            this.shouldShowCreateFolderModal = true;
            setTimeout(function () { return $('#CreateDirectoryNameTextBox').focus(); }, 50);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to create a directory within the current directory
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.CreateSubDirectory = function () {
            this.createUnderParentDirName = this.selectedDirectory.name;
            if (this.committee)
                this.createUnderParentDirName = DocumentsController.DirName_Committees + "/" + this.committee.committeeId + "/" + this.createUnderParentDirName;
            this.shouldShowCreateFolderModal = true;
            setTimeout(function () { return $('#CreateDirectoryNameTextBox').focus(); }, 50);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to sort the files
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.SetFileSortType = function (sortType) {
            // If we're already sorting by this property, flip the order
            if (this.fileSortType === sortType)
                this.filesSortDescend = !this.filesSortDescend;
            else
                this.filesSortDescend = false;
            this.fileSortType = sortType;
            window.localStorage[DocumentsController.LocalStorageKey_SortType] = this.fileSortType;
            window.localStorage[DocumentsController.LocalStorageKey_SortDirection] = this.filesSortDescend;
            this.SortFiles();
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Sort the visible files according to our selected method
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.SortFiles = function () {
            if (!this.selectedDirectory || !this.selectedDirectory.files)
                return;
            if (this.fileSortType === "title" || this.fileSortType === "uploadDate")
                this.selectedDirectory.files = _.sortBy(this.selectedDirectory.files, this.fileSortType);
            if (this.filesSortDescend)
                this.selectedDirectory.files.reverse();
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to create a new directory
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.onCreateDirectoryClicked = function () {
            var _this = this;
            // Display the loading image
            this.isLoading = true;
            var putUri = "/api/ManageDocuments/CreateDirectory?folderName=" + encodeURIComponent(this.newDirectoryName);
            // If we're creating a subdirectory
            putUri += "&parentFolderPath=";
            if (this.createUnderParentDirName)
                putUri += encodeURIComponent(this.createUnderParentDirName);
            this.$http.put(putUri, null).then(function () {
                // Clear the document cache
                _this.$cacheFactory.get('$http').remove(_this.getDocsUri);
                _this.newDirectoryName = "";
                _this.Refresh();
                _this.shouldShowCreateFolderModal = false;
            }, function (response) {
                alert("Failed to create the folder: " + response.data.exceptionMessage);
                _this.isLoading = false;
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the cancel button when creating a new directory
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.onCancelAddDirectory = function () {
            this.shouldShowCreateFolderModal = false;
            this.newDirectoryName = "";
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when a file gets clicked
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.onFileClicked = function (file) {
            this.selectedFile = file;
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to rename a document
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.RenameDocument = function (document) {
            var _this = this;
            if (!document)
                return;
            var newTitle = prompt("Enter the new name for the file", document.title);
            if (newTitle === null)
                return;
            if (newTitle.length > 64)
                newTitle = newTitle.substr(0, 64);
            // Display the loading image
            this.isLoading = true;
            var fileAction = {
                relativeS3Path: document.relativeS3Path,
                action: "rename",
                newTitle: newTitle,
                sourceFolderPath: this.getSelectedDirectoryPath(),
                destinationFolderPath: ""
            };
            this.$http.put("/api/ManageDocuments/RenameFile", fileAction).then(function () {
                // Clear the local document cache
                _this.$cacheFactory.get('$http').remove(_this.getDocsUri);
                _this.Refresh();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to rename: " + response.data.exceptionMessage);
                _this.Refresh();
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to delete a document
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.DeleteDocument = function (document) {
            var _this = this;
            if (confirm("Are you sure you want to delete this file?")) {
                // Display the loading image
                this.isLoading = true;
                this.$http.delete("/api/ManageDocuments?docPath=" + document.relativeS3Path).then(function () {
                    // Clear the document cache
                    _this.$cacheFactory.get('$http').remove(_this.getDocsUri);
                    _this.Refresh();
                }, function (response) {
                    _this.isLoading = false;
                    alert("Failed to delete file: " + response.data.exceptionMessage);
                    _this.Refresh();
                });
            }
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to edit a directory name
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.RenameSelectedDirectory = function () {
            var _this = this;
            if (!this.selectedDirectory)
                return;
            var newDirectoryName = prompt("Enter the new name for the directory", this.selectedDirectory.name);
            if (newDirectoryName === null)
                return;
            if (newDirectoryName.length > 32)
                newDirectoryName = newDirectoryName.substr(0, 32);
            // Display the loading image
            this.isLoading = true;
            var oldDirectoryPath = encodeURIComponent(this.getSelectedDirectoryPath());
            var newDirectoryNameQS = encodeURIComponent(newDirectoryName);
            this.$http.put("/api/ManageDocuments/RenameDirectory?directoryPath=" + oldDirectoryPath + "&newDirectoryName=" + newDirectoryNameQS, null).then(function () {
                // Clear the document cache
                _this.$cacheFactory.get('$http').remove(_this.getDocsUri);
                // Update the selected directory name so we can reselect it
                _this.selectedDirectory.name = newDirectoryName;
                _this.Refresh();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed to rename directory: " + response.data.exceptionMessage);
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to delete a document
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.DeleteSelectedDirectory = function () {
            var _this = this;
            if (!this.selectedDirectory)
                return;
            if (this.selectedDirectory.files.length > 0) {
                alert("You can not delete a folder that contains files. Please delete or move all files from the folder.");
                return;
            }
            if (confirm("Are you sure you want to delete this folder?")) {
                // Display the loading image
                this.isLoading = true;
                var dirPath = this.getSelectedDirectoryPath();
                this.$http.delete("/api/ManageDocuments/DeleteDirectory?directoryPath=" + encodeURIComponent(dirPath)).then(function () {
                    // Clear the document cache
                    _this.$cacheFactory.get('$http').remove(_this.getDocsUri);
                    _this.Refresh();
                }, function (httpResult) {
                    _this.isLoading = false;
                    alert("Failed to delete the folder: " + httpResult.data.exceptionMessage);
                });
            }
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Get the icon for a file
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.getFileIcon = function (fileName) {
            if (!fileName)
                return "";
            var extension = fileName.split('.').pop().toLowerCase();
            var imagePath = null;
            switch (extension) {
                case "pdf":
                    imagePath = "PdfIcon.png";
                    break;
                case "doc":
                case "docx":
                    imagePath = "WordIcon.png";
                    break;
                case "xls":
                case "xlsx":
                    imagePath = "ExcelIcon.png";
                    break;
                case "jpeg":
                case "jpe":
                case "jpg":
                case "png":
                case "bmp":
                    imagePath = "ImageIcon.png";
                    break;
                case "zip":
                    imagePath = "ZipIcon.png";
                    break;
                default:
                    imagePath = "GenericFileIcon.png";
                    break;
            }
            return "/assets/images/FileIcons/" + imagePath;
        };
        DocumentsController.prototype.hookupParentDirs = function (dir) {
            var _this = this;
            dir.fullDirectoryPath = this.getDirectoryFullPath(dir);
            dir.getSubDirectoryByName = DocumentDirectory.prototype.getSubDirectoryByName;
            if (!dir.subdirectories)
                return;
            dir.subdirectories.forEach(function (subDir) {
                subDir.parentDirectory = dir;
                _this.hookupParentDirs(subDir);
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Refresh the file tree
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.Refresh = function () {
            // Store the name of the directory we have selected so we can re-select it after refreshing
            // the data
            var selectedDirectoryPath = null;
            if (this.selectedDirectory)
                selectedDirectoryPath = this.getSelectedDirectoryPath();
            // Display the loading image
            this.isLoading = true;
            this.selectedDirectory = null;
            this.selectedFile = null;
            this.getDocsUri = "/api/ManageDocuments";
            if (this.committee)
                this.getDocsUri += "/Committee/" + this.committee.committeeId;
            var innerThis = this;
            this.$http.get(this.getDocsUri, { cache: true }).then(function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.documentTree = httpResponse.data;
                innerThis.documentTree.getSubDirectoryByName = DocumentDirectory.prototype.getSubDirectoryByName;
                // Hook up parent directories
                innerThis.documentTree.subdirectories.forEach(function (dir) {
                    innerThis.hookupParentDirs(dir);
                });
                // Build an array of all local files
                var allFiles = [];
                var processDir = function (subdir) {
                    _.each(subdir.files, function (f) {
                        f.localFilePath = subdir.name + "/" + f.title;
                        f.uploadDateString = moment(f.uploadDate).format("MMMM D, YYYY");
                    });
                    Array.prototype.push.apply(allFiles, subdir.files);
                    _.each(subdir.subdirectories, processDir);
                };
                processDir(innerThis.documentTree);
                innerThis.fullSearchFileList = allFiles;
                // Find the directory we had selected before the refresh
                if (selectedDirectoryPath) {
                    innerThis.selectedDirectory = innerThis.FindDirectoryByPath(selectedDirectoryPath);
                    innerThis.SortFiles();
                }
                innerThis.hookUpFileDragging();
            }, function (response) {
                innerThis.isLoading = false;
                //$( "#FileTreePanel" ).hide();
                //innerThis.errorMessage = "Failed to retrieve the building documents.";
            });
        };
        DocumentsController.$inject = ["$http", "$rootScope", "$cacheFactory", "$scope", "SiteInfo", "fellowResidents"];
        DocumentsController.LocalStorageKey_SortType = "DocsInfo_FileSortType";
        DocumentsController.LocalStorageKey_SortDirection = "DocsInfo_FileSortDirection";
        DocumentsController.DirName_Committees = "Committees_Root";
        return DocumentsController;
    }());
    Ally.DocumentsController = DocumentsController;
})(Ally || (Ally = {}));
CA.angularApp.component("documents", {
    bindings: {
        committee: "<"
    },
    templateUrl: "/ngApp/common/documents.html",
    controller: Ally.DocumentsController
});
