namespace Ally
{
    /**
     * The controller for the page to view membership dues payment history
     */
    export class DuesHistoryController implements ng.IController
    {
    }
}

CA.angularApp.component( "duesHistory", {
    templateUrl: "/ngApp/chtn/manager/dues-history.html",
    controller: Ally.DuesHistoryController
} );