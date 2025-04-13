var Ally;
(function (Ally) {
    /**
     * The controller for the admin-only page to polygon data
     */
    class ViewPolysController {
        /**
        * The constructor for the class
        */
        constructor($http) {
            this.$http = $http;
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            this.refreshAddresses();
        }
        findCenter(polys) {
            const currentCenter = {
                lat: 0,
                lng: 0
            };
            for (let polyIndex = 0; polyIndex < polys.length; ++polyIndex) {
                const curPoly = polys[polyIndex];
                if (!curPoly)
                    continue;
                const polyCenter = {
                    lat: 0,
                    lng: 0
                };
                for (let vertexIndex = 0; vertexIndex < curPoly.vertices.length; ++vertexIndex) {
                    const vertex = curPoly.vertices[vertexIndex];
                    polyCenter.lat += vertex.lat;
                    polyCenter.lng += vertex.lng;
                }
                polyCenter.lat /= curPoly.vertices.length;
                polyCenter.lng /= curPoly.vertices.length;
                currentCenter.lat += polyCenter.lat;
                currentCenter.lng += polyCenter.lng;
            }
            currentCenter.lat /= polys.length;
            currentCenter.lng /= polys.length;
            return currentCenter;
        }
        // Get the polygons to display
        refreshAddresses() {
            this.isLoading = true;
            this.neighborhoodPolys = [];
            this.$http.get("/api/Neighborhood/GetAll").then((httpResponse) => {
                this.isLoading = false;
                this.neighborhoods = httpResponse.data;
                this.neighborhoodPolys = _.select(this.neighborhoods, function (n) { return n.Bounds; });
                this.mapCenter = this.findCenter(this.neighborhoodPolys);
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to retrieve neighborhoods: " + httpResponse.data.exceptionMessage);
            });
        }
        ;
    }
    ViewPolysController.$inject = ["$http", "$q"];
    Ally.ViewPolysController = ViewPolysController;
})(Ally || (Ally = {}));
CA.angularApp.component("viewPolys", {
    templateUrl: "/ngApp/admin/view-polys.html",
    controller: Ally.ViewPolysController
});
