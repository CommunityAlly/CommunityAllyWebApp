var Ally;
(function (Ally) {
    /**
     * The controller for the page to view membership dues payment history
     */
    var DuesHistoryController = /** @class */ (function () {
        function DuesHistoryController() {
        }
        return DuesHistoryController;
    }());
    Ally.DuesHistoryController = DuesHistoryController;
})(Ally || (Ally = {}));
CA.angularApp.component("duesHistory", {
    templateUrl: "/ngApp/chtn/manager/dues-history.html",
    controller: Ally.DuesHistoryController
});
