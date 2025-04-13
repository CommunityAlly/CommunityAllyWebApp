﻿// eslint-disable-next-line no-var
declare var html2canvas: any;


namespace Ally
{
    /**
     * The controller for the page to track group spending
     */
    export class BudgetToolController implements ng.IController
    {
        static $inject = ["$http", "uiGridConstants", "$q", "$timeout", "SiteInfo"];

        isLoading: boolean = false;
        expenseGridOptions: uiGrid.IGridOptionsOf<BudgetRowLocalEdit>;
        expenseGridApi: uiGrid.IGridApiOf<BudgetRowLocalEdit>;
        incomeGridOptions: uiGrid.IGridOptionsOf<BudgetRowLocalEdit>;
        incomeGridApi: uiGrid.IGridApiOf<BudgetRowLocalEdit>;
        selectedBudget: BudgetDto;
        budgets: BudgetDto[];
        rootFinancialCategory: FinancialCategory;
        financialCategoryMap: Map<number, FinancialCategory> = new Map<number, FinancialCategory>();
        curBudget: BudgetLocalEdit;
        totalExpense: number = 0;
        totalIncome: number = 0;
        shouldRenderForPrint = false;
        shouldShowPrintPreviewButton = false;
        groupName: string;
        readonly EditAmountTemplate = "<div class='ui-grid-cell-contents'><span data-ng-if='row.entity.hasChildren'>{{row.entity.amount | currency}}</span><span data-ng-if='!row.entity.hasChildren'>$<input type='number' style='width: 85%;' data-ng-model='row.entity.amount' data-ng-change='grid.appScope.$ctrl.onAmountChange(row.entity)' /></span></div>";


        /**
        * The constructor for the class
        */
        constructor( private $http: ng.IHttpService,
            private uiGridConstants: uiGrid.IUiGridConstants,
            private $q: ng.IQService,
            private $timeout: ng.ITimeoutService,
            private siteInfo: Ally.SiteInfoService )
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            this.expenseGridOptions =
            {
                columnDefs:
                    [
                        { field: "categoryTreeLabel", displayName: "Category", width: "*" },
                        { field: "amount", displayName: "Amount", width: 120, type: "number", cellFilter: "currency", cellTemplate: this.EditAmountTemplate }
                    ],
                enableHorizontalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                enableColumnMenus: false,
                enableRowHeaderSelection: false,
                showTreeExpandNoChildren: false,
                treeIndent: 20,
                enableSorting: false,
                enableTreeView: true,
                showTreeRowHeader: true,
                onRegisterApi: ( gridApi ) =>
                {
                    this.expenseGridApi = gridApi;

                    // Fix dumb scrolling
                    HtmlUtil.uiGridFixScroll();

                    //this.expenseGridApi.treeBase.on.rowExpanded( this.$rootScope, ( row ) =>
                    //{
                    //    // console.log( "here", row );
                    //} );
                }
            };

            this.incomeGridOptions = _.clone( this.expenseGridOptions );
            this.incomeGridOptions.onRegisterApi = ( gridApi ) =>
            {
                this.incomeGridApi = gridApi;

                // Fix dumb scrolling
                HtmlUtil.uiGridFixScroll();
            };

            this.refreshData();

            this.shouldShowPrintPreviewButton = HtmlUtil.getSubdomain() === "hampshirevillageatmeadow" || HtmlUtil.getSubdomain() === "qa";
            this.groupName = this.siteInfo.publicSiteInfo.fullName;

            this.loadScript( "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" );
            this.loadScript( "https://html2canvas.hertzen.com/dist/html2canvas.min.js" );
        }


        loadScript( sciptUrl: string )
        {
            const script = document.createElement( "script" );
            script.type = "text/javascript";
            script.src = sciptUrl;
            document.body.appendChild( script );
        }


        /**
        * Retrieve the group budgets from the server
        */
        refreshData()
        {
            this.isLoading = true;

            return this.$http.get( "/api/Budget/PageData" ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<BudgetPageInfo> ) =>
                {
                    this.isLoading = false;
                    this.budgets = httpResponse.data.budgets;
                    this.rootFinancialCategory = httpResponse.data.rootFinancialCategory;

                    this.financialCategoryMap.clear();
                    const visitNode = ( node: FinancialCategory ) =>
                    {
                        this.financialCategoryMap.set( node.financialCategoryId, node );
                        if( node.childCategories )
                        {
                            for( let i = 0; i < node.childCategories.length; ++i )
                                visitNode( node.childCategories[i] );
                        }
                    };
                    visitNode( this.rootFinancialCategory );
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to retrieve data, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        onAmountChange( row: BudgetRowLocalEdit )
        {
            if( row )
            {
                let curParent = row.parentRow;
                while( curParent )
                {
                    curParent.amount = _.reduce( curParent.childRows, ( memo: number, row: BudgetRowLocalEdit ) => memo + row.amount, 0 );
                    curParent = curParent.parentRow;
                }
            }

            const incomeParentRow = _.find( this.curBudget.budgetRows, r => !r.parentRow && r.category.displayName === "Income" );
            this.totalIncome = incomeParentRow.amount;

            const expenseLeafRows = this.curBudget.budgetRows.filter( r => !r.parentRow && r.category.displayName !== "Income" );
            this.totalExpense = _.reduce( expenseLeafRows, ( memo, r: BudgetRowLocalEdit ) => memo + r.amount, 0 );
        }


        createBudget()
        {
            this.curBudget = new BudgetLocalEdit();
            this.curBudget.budgetName = "Unnamed";

            this.curBudget.budgetRows = [];

            const amountColumn = this.expenseGridOptions.columnDefs.find( c => c.field === "amount" );
            amountColumn.cellTemplate = this.EditAmountTemplate;

            const visitNode = ( curNode: FinancialCategory, depth: number, isIncomeRow: boolean ) =>
            {
                const hasChildren = curNode.childCategories != null && curNode.childCategories.length > 0;
                isIncomeRow = ( depth === 0 && curNode.displayName === "Income" ) || isIncomeRow;

                if( curNode.displayName )
                {
                    const offsetDepth = isIncomeRow ? depth - 1 : depth;

                    const labelPrefix = BudgetToolController.catToTreePrefix( offsetDepth );

                    const parentRow = _.find( this.curBudget.budgetRows, r => r.category.financialCategoryId === curNode.parentFinancialCategoryId );

                    const newRow: BudgetRowLocalEdit = {
                        financialCategoryId: curNode.financialCategoryId,
                        categoryDisplayName: curNode.displayName,
                        categoryTreeLabel: labelPrefix + curNode.displayName,
                        amount: 0,
                        $$treeLevel: offsetDepth,
                        hasChildren,
                        category: curNode,
                        parentRow,
                        childRows: [],
                        isIncomeRow,
                        parentBudgetRowId: null
                    };

                    if( parentRow )
                        newRow.parentRow.childRows.push( newRow );

                    this.curBudget.budgetRows.push( newRow );
                }

                if( !hasChildren )
                    return;

                for( let i = 0; i < curNode.childCategories.length; ++i )
                {
                    visitNode( curNode.childCategories[i], depth + 1, isIncomeRow );
                }
            };
            visitNode( this.rootFinancialCategory, -1, false ); // Start at negative so the root's children have a level of 0

            this.refreshGridsFromCurBudget();
        }


        static catToTreePrefix( treeDepth: number )
        {
            if( treeDepth < 1 )
                return "";

            const labelPrefix = Array( ( treeDepth - 1 ) * 4 ).join( String.fromCharCode( 160 ) ) + "|--";
            return labelPrefix;
        }


        loadBudget( budget: BudgetDto )
        {
            const getCatDepth = ( category: FinancialCategory, depth: number = 0 ): number =>
            {
                if( !category )
                    return depth;

                if( category.parentFinancialCategoryId && this.financialCategoryMap.has( category.parentFinancialCategoryId ) )
                    return getCatDepth( this.financialCategoryMap.get( category.parentFinancialCategoryId ), depth + 1 );

                return depth;
            }

            const amountColumn = this.expenseGridOptions.columnDefs.find( c => c.field === "amount" );
            if( budget.finalizedDateUtc )
                amountColumn.cellTemplate = null;
            else
                amountColumn.cellTemplate = this.EditAmountTemplate;

            const editRows: BudgetRowLocalEdit[] = budget.rows.map( r =>
            {
                const cat = this.financialCategoryMap.has( r.financialCategoryId ) ? this.financialCategoryMap.get( r.financialCategoryId ) : undefined;
                const treeDepth = getCatDepth( cat );
                const offsetDepth = treeDepth;//isIncomeRow ? depth - 1 : depth;

                const labelPrefix = BudgetToolController.catToTreePrefix( offsetDepth );

                const editRow: BudgetRowLocalEdit = {
                    amount: r.amount,
                    categoryDisplayName: r.categoryDisplayName,
                    financialCategoryId: r.financialCategoryId,
                    budgetId: r.budgetId,
                    budgetRowId: r.budgetRowId,
                    $$treeLevel: treeDepth,
                    category: cat,
                    childRows: [],
                    categoryTreeLabel: labelPrefix + ( cat ? cat.displayName : r.categoryDisplayName ),
                    hasChildren: false,
                    isIncomeRow: false,
                    parentRow: null,
                    parentBudgetRowId: r.parentBudgetRowId
                };

                return editRow;
            } );

            // Fill in children and set the parent
            for( let i = 0; i < editRows.length; ++i )
            {
                const curRow = editRows[i];

                const curCat = curRow.category;
                if( curCat )
                {
                    curRow.hasChildren = curCat.childCategories && curCat.childCategories.length > 0;

                    if( curRow.hasChildren )
                    {
                        const childCatIds = _.map( curCat.childCategories, c => c.financialCategoryId );
                        curRow.childRows = editRows.filter( r => childCatIds.indexOf( r.financialCategoryId ) >= 0 );
                    }

                    if( curCat.parentFinancialCategoryId )
                        curRow.parentRow = _.find( editRows, r => r.financialCategoryId === curCat.parentFinancialCategoryId );
                }
                else if( curRow.parentBudgetRowId )
                {
                    curRow.parentRow = _.find( editRows, r => r.budgetRowId === curRow.parentBudgetRowId );

                    curRow.childRows = editRows.filter( r => r.parentBudgetRowId === curRow.budgetRowId );
                }
            }

            const incomeCategory = this.rootFinancialCategory.childCategories.find( c => c.displayName === "Income" );
            const incomeRoot = editRows.find( r => r.financialCategoryId === incomeCategory.financialCategoryId );
            const markIncome = ( row: BudgetRowLocalEdit ) =>
            {
                row.isIncomeRow = true;
                --row.$$treeLevel; // We don't show the top level
                row.categoryTreeLabel = BudgetToolController.catToTreePrefix( row.$$treeLevel ) + row.categoryDisplayName;

                if( row.childRows )
                    row.childRows.forEach( r => markIncome( r ) );
            };
            markIncome( incomeRoot );

            this.curBudget = {
                budgetId: budget.budgetId,
                budgetName: budget.budgetName,
                budgetRows: editRows
            };

            this.refreshGridsFromCurBudget();
        }


        refreshGridsFromCurBudget()
        {
            const incomeRows = this.curBudget.budgetRows.filter( r => r.$$treeLevel >= 0 && r.isIncomeRow );
            this.incomeGridOptions.data = incomeRows;
            this.incomeGridOptions.minRowsToShow = incomeRows.length;
            this.incomeGridOptions.virtualizationThreshold = incomeRows.length;

            const expenseRows = this.curBudget.budgetRows.filter( r => !r.isIncomeRow );
            this.expenseGridOptions.data = expenseRows;
            this.expenseGridOptions.minRowsToShow = expenseRows.length;
            this.expenseGridOptions.virtualizationThreshold = expenseRows.length;

            this.$timeout( () =>
            {
                this.expenseGridApi.treeBase.expandAllRows();
                this.incomeGridApi.treeBase.expandAllRows();
            }, 50 );

            this.onAmountChange( null );
        }


        closeBudget()
        {
            this.curBudget = null;
            this.selectedBudget = null;
            this.incomeGridOptions.data = [];
            this.expenseGridOptions.data = [];
        }


        saveBudget()
        {
            if( this.curBudget.budgetId )
                this.saveExistingBudget();
            else
                this.saveNewBudget();
        }


        saveExistingBudget(refreshAfterSave: boolean = true)
        {
            this.isLoading = true;

            // Create a slimmed down version
            const putData: SaveBudget = {
                budgetId: this.curBudget.budgetId,
                budgetName: this.curBudget.budgetName,
                rows: _.map( this.curBudget.budgetRows, r =>
                {
                    return {
                        budgetRowId: r.budgetRowId,
                        amount: r.amount,
                        financialCategoryId: r.financialCategoryId
                    }
                } )
            };
            
            return this.$http.put( "/api/Budget", putData ).then(
                () =>
                {
                    this.isLoading = false;

                    if( refreshAfterSave )
                        this.completeRefresh();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to save: " + httpResponse.data.exceptionMessage );
                    return Promise.reject( httpResponse );
                }
            );
        }


        saveNewBudget()
        {
            this.isLoading = true;

            // Create a slimmed down version
            const postData: SaveBudget = {
                budgetId: 0,
                budgetName: this.curBudget.budgetName,
                rows: _.map( this.curBudget.budgetRows, r =>
                {
                    return {
                        budgetRowId: 0,
                        amount: r.amount,
                        financialCategoryId: r.financialCategoryId
                    }
                } )
            };

            this.$http.post( "/api/Budget", postData ).then(
                () =>
                {
                    this.isLoading = false;
                    this.completeRefresh();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to retrieve data, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Occurs when the user selects a budget to view
         */
        onBudgetSelected()
        {
            if( !this.selectedBudget )
                return;

            this.loadBudget( this.selectedBudget );
        }


        /**
         * Occurs when the user presses the button to delete a budget
         */
        deleteBudget()
        {
            if( !confirm( "Are you sure you want to deleted this budget?" ) )
                return;

            this.isLoading = true;

            this.$http.delete( "/api/Budget/" + this.curBudget.budgetId ).then(
                () =>
                {
                    this.isLoading = false;
                    this.completeRefresh();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to delete, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        completeRefresh()
        {
            this.curBudget = null;
            this.selectedBudget = null;
            this.incomeGridOptions.data = [];
            this.expenseGridOptions.data = [];

            return this.refreshData();
        }


        finalizeBudget()
        {
            if( !confirm( "This makes the budget permanently read-only. Are you sure you want to finalize the budget?" ) )
                return;

            this.isLoading = true;

            this.saveExistingBudget( false ).then(
                () =>
                {
                    this.$http.put( "/api/Budget/Finalize/" + this.curBudget.budgetId, null ).then(
                        () =>
                        {
                            this.isLoading = false;

                            this.curBudget = null;
                            this.selectedBudget = null;
                            this.incomeGridOptions.data = [];
                            this.expenseGridOptions.data = [];

                            this.completeRefresh();
                        },
                        ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                        {
                            this.isLoading = false;
                            alert( "Failed to finalize, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage );
                        }
                    );
                },
                () =>
                {
                    this.isLoading = false;
                    // Error is prompted via saveExistingBudget
                }
            );
        }


        exportToCsv()
        {
            // We're sort of hacking the CSV logic to work for budgets since there's not a clear
            // column / row structure to it
            const csvColumns = [
                {
                    headerText: "",
                    fieldName: "col0"
                },
                {
                    headerText: "",
                    fieldName: "col1"
                },
                {
                    headerText: "",
                    fieldName: "col2"
                },
                {
                    headerText: "",
                    fieldName: "col3"
                },
                {
                    headerText: "",
                    fieldName: "col4"
                }
            ];

            const expenseRows = this.expenseGridOptions.data as BudgetRowLocalEdit[];
            const incomeRows = this.incomeGridOptions.data as BudgetRowLocalEdit[];

            const maxRows = Math.max( expenseRows.length, incomeRows.length );

            const csvRows: BudgetCsvRow[] = [];
            csvRows.push( new BudgetCsvRow( "Budget:", this.curBudget.budgetName ) );
            csvRows.push( new BudgetCsvRow() );
            csvRows.push( new BudgetCsvRow( "Expenses", "", "", "Income" ) );

            const getSlashedLabel = ( row: BudgetRowLocalEdit ): string =>
            {
                if( !row.parentRow )
                    return row.categoryDisplayName;

                return getSlashedLabel( row.parentRow ) + "/" + row.categoryDisplayName;
            };

            for( let i = 0; i < maxRows; ++i )
            {
                const newRow = new BudgetCsvRow();
                if( i < expenseRows.length )
                {
                    newRow.col0 = getSlashedLabel( expenseRows[i] );
                    newRow.col1 = (expenseRows[i].amount || 0).toString();
                }

                if( i < incomeRows.length )
                {
                    newRow.col3 = getSlashedLabel( incomeRows[i] );
                    if( newRow.col3.startsWith( "Income/" ) )
                        newRow.col3 = newRow.col3.substring( "Income/".length );
                    newRow.col4 = ( incomeRows[i].amount || 0 ).toString();
                }

                csvRows.push( newRow );
            }

            csvRows.push( new BudgetCsvRow( "Expense Total", this.totalExpense.toString(), "", "Income Total", this.totalIncome.toString() ) );
            csvRows.push( new BudgetCsvRow() );
            csvRows.push( new BudgetCsvRow( "", "Net", ( this.totalIncome - this.totalExpense ).toString() ) );

            const csvDataString = Ally.createCsvString( csvRows, csvColumns, false );

            const fileName = "budget-" + HtmlUtil2.removeNonAlphanumeric( this.curBudget.budgetName ) + ".csv";
            HtmlUtil2.downloadCsv( csvDataString, fileName );
        }


        /**
         * Occurs when the user presses the button to delete a budget
         */
        cloneBudget()
        {
            const newName = prompt( "Enter the new, cloned budget's name:" )
            if( !newName )
                return;

            const cloneInfo = {
                newName,
                budgetId: this.curBudget.budgetId
            };

            this.isLoading = true;

            this.$http.put( "/api/Budget/Clone", cloneInfo ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<number> ) =>
                {
                    this.isLoading = false;
                    this.completeRefresh().then( () =>
                    {
                        // Select the newly created budget
                        this.selectedBudget = this.budgets.find( b => b.budgetId === httpResponse.data );
                        this.onBudgetSelected();
                    } );
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading = false;
                    alert( "Failed to clone, try refreshing the page. If the problem persists, contact support: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        static generatePdfForElement( elementId: string, $q: ng.IQService ): ng.IPromise<any>
        {
            const deferred = $q.defer<any>();

            html2canvas( document.getElementById( elementId ) ).then(
                ( canvas: HTMLCanvasElement ) =>
                {
                    const imgData = canvas.toDataURL( "image/jpeg", 0.98 );

                    const jsPDF = ( <any>window ).jspdf;

                    const pdfOpts: any = {
                        orientation: 'p',
                        unit: 'mm',
                        format: "letter",
                        putOnlyUsedFonts: true,
                        floatPrecision: 16, // or "smart", default is 16
                        title: "care-team-dashboard"
                    };

                    const pdfDoc = new jsPDF.jsPDF( pdfOpts );

                    const padding = 7;

                    const pdfPageWidth = pdfDoc.internal.pageSize.getWidth();
                    const pdfPageHeight = pdfDoc.internal.pageSize.getHeight();


                    // Scale to fit on one page vertically
                    //const targetImgHeight = pdfPageHeight - ( padding * 2 );
                    //const targetImgWidth = ( canvas.width * targetImgHeight ) / canvas.height;
                    //const xOffset = ( pdfPageWidth - targetImgWidth ) / 2;
                    //pdfDoc.addImage( imgData, 'JPEG', xOffset, padding, targetImgWidth, targetImgHeight );



                    // Scale so it fits fills the page width
                    const targetImgWidth = pdfPageWidth - ( padding * 2 );
                    const targetImgHeight = ( canvas.height * targetImgWidth ) / canvas.width;
                    const xOffset = ( pdfPageWidth - targetImgWidth ) / 2;
                    const numPages = Math.ceil( targetImgHeight / pdfPageHeight );

                    pdfDoc.addImage( imgData, 'JPEG', xOffset, padding, targetImgWidth, targetImgHeight );

                    for( let pageIndex = 1; pageIndex < numPages; ++pageIndex )
                    {
                        pdfDoc.addPage( "letter", "portrait" );
                        const yOffset = ( pdfPageHeight * -pageIndex ) + padding;
                        pdfDoc.addImage( imgData, 'JPEG', xOffset, yOffset, targetImgWidth, targetImgHeight );
                    }


                    //pdfDoc.save( "download.pdf" );
                    //pdfDoc.output( 'dataurlnewwindow' );
                    deferred.resolve( pdfDoc );
                },
                ( error: any ) =>
                {
                    deferred.reject( error );
                }
            );

            return deferred.promise;
        }


        generatePdf()
        {
            this.isLoading = true;
            this.shouldRenderForPrint = true;

            this.$timeout( () =>
            {
                BudgetToolController.generatePdfForElement( "budget-data-container", this.$q ).then(
                    ( pdfDoc: any ) =>
                    {
                        this.isLoading = false;
                        this.shouldRenderForPrint = false;
                        window.open( URL.createObjectURL( pdfDoc.output( "blob" ) ) )
                    },
                    () =>
                    {
                        this.isLoading = false;
                        this.shouldRenderForPrint = false;
                        alert( "Failed to generated PDF locally, please contact support" );
                    }
                );
            }, 10 );
        }
    }


    class BudgetCsvRow
    {
        constructor( c0: string = "", c1: string = "", c2: string = "", c3: string = "", c4: string = "" )
        {
            this.col0 = c0;
            this.col1 = c1;
            this.col2 = c2;
            this.col3 = c3;
            this.col4 = c4;
        }

        col0: string;
        col1: string;
        col2: string;
        col3: string;
        col4: string;
    }


    class SaveBudgetRow
    {
        budgetRowId: number;
        amount: number;
        financialCategoryId: number;
    }


    class SaveBudget
    {
        budgetId: number;
        budgetName: string;
        rows: SaveBudgetRow[];
    }


    class BudgetPageInfo
    {
        budgets: BudgetDto[];
        rootFinancialCategory: FinancialCategory;
    }


    class BudgetDto
    {
        budgetId: number;
        budgetName: string;
        createdByUserId: number;
        createdOnDateUtc: Date;
        finalizedUserId: number;
        finalizedDateUtc: Date;
        rows: BudgetRowDto[];
    }


    class BudgetLocalEdit
    {
        budgetId: number;
        budgetName: string;
        budgetRows: BudgetRowLocalEdit[];
    }


    class BudgetRowDto
    {
        budgetRowId?: number;
        budgetId?: number;
        financialCategoryId: number | null;
        categoryDisplayName: string;
        amount: number;
        parentBudgetRowId: number | null;
    }


    class BudgetRowLocalEdit extends BudgetRowDto
    {
        categoryTreeLabel: string;
        $$treeLevel: number;
        hasChildren: boolean;
        category: FinancialCategory;
        parentRow: BudgetRowLocalEdit;
        childRows: BudgetRowLocalEdit[];
        isIncomeRow: boolean;
    }
}


CA.angularApp.component( "budgetTool", {
    bindings: {
    },
    templateUrl: "/ngApp/chtn/manager/financial/budget-tool.html",
    controller: Ally.BudgetToolController
} );