var Ally;
(function (Ally) {
    /**
     * The controller for viewing available E-form templates
     */
    class EformFieldController {
        /**
         * The constructor for the class
         */
        constructor() {
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit() {
            const dateTypes = ["dateOnly", "dateTime", "timeOnly"];
            if (dateTypes.includes(this.fieldEntry.template.type) && this.fieldEntry.instance.valuesJson)
                this.fieldEntry.instance.valuesJson = moment(this.fieldEntry.instance.valuesJson).toDate();
        }
        onFieldChange() {
            this.fieldEntry.instance.lastEditDateUtc = moment.utc().toDate();
            //console.log( "New value", this.fieldEntry.template.slug, this.fieldEntry.instance.valuesJson );
        }
    }
    EformFieldController.$inject = [];
    Ally.EformFieldController = EformFieldController;
})(Ally || (Ally = {}));
CA.angularApp.component("eformField", {
    bindings: {
        fieldEntry: "<",
        parentEform: "<"
    },
    templateUrl: "/ngApp/common/eforms/eform-field.html",
    controller: Ally.EformFieldController
});
