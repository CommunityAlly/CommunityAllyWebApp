namespace Ally
{
    /**
     * The controller for viewing available E-form templates
     */
    export class EformFieldController implements ng.IController
    {
        static $inject: string[] = [];
        fieldEntry: EformFieldEntry;
        parentEform: EformInstanceDto;


        /**
         * The constructor for the class
         */
        constructor()
        {
        }


        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        $onInit()
        {
            const dateTypes = ["dateOnly", "dateTime", "timeOnly"];
            if( dateTypes.includes( this.fieldEntry.template.type ) && this.fieldEntry.instance.valuesJson )
                this.fieldEntry.instance.valuesJson = moment( this.fieldEntry.instance.valuesJson ).toDate();
        }


        onFieldChange()
        {
            this.fieldEntry.instance.lastEditDateUtc = moment.utc().toDate();

            //console.log( "New value", this.fieldEntry.template.slug, this.fieldEntry.instance.valuesJson );
        }
    }
}

CA.angularApp.component( "eformField", {
    bindings: {
        fieldEntry: "<",
        parentEform: "<"
    },
    templateUrl: "/ngApp/common/eforms/eform-field.html",
    controller: Ally.EformFieldController
} );
