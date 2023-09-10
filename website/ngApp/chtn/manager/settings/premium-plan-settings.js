var Ally;
(function (Ally) {
    /**
     * The controller for the page to view group premium plan settings
     */
    class PremiumPlanSettingsController {
        /**
         * The constructor for the class
         */
        constructor($http, siteInfo, appCacheService, $timeout, $scope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.$timeout = $timeout;
            this.$scope = $scope;
            this.settings = new Ally.ChtnSiteSettings();
            this.isLoading = false;
            this.isLoadingUsage = false;
            this.shouldShowPremiumPlanSection = true;
            this.shouldShowPaymentForm = false;
            this.stripeApi = null;
            this.stripeCardElement = null;
            this.isActivatingAnnual = true;
            this.monthlyDisabled = false;
            this.planExpirationColor = "red";
            this.groupEmailChartData = [];
            this.groupEmailAverage = 0;
            this.genInvoiceNumMonths = 1;
            this.genInvoiceShouldIncludeWireInfo = false;
            this.emailUsageChartData = [];
            this.emailUsageChartLabels = [];
            this.emailUsageChartOptions = {};
            this.emailUsageAverageNumMonths = 0;
            this.emailUsageAverageSent = 0;
            this.showInvoiceSection = false;
            this.paymentType = "ach";
            this.shouldShowTrialNote = false;
            this.shouldShowPremiumPlanSection = AppConfig.appShortName === "condo" || AppConfig.appShortName === "hoa";
            this.homeNamePlural = AppConfig.homeName.toLowerCase() + "s";
            this.showInvoiceSection = siteInfo.userInfo.isAdmin;
            try {
                this.stripeApi = Stripe(StripeApiKey);
            }
            catch (err) {
                console.log(err);
            }
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit() {
            this.monthlyDisabled = this.siteInfo.privateSiteInfo.numUnits <= 10;
            this.refreshData();
            // Get a view token to view the premium plan invoice should one be generated
            if (this.showInvoiceSection) // Add a slight delay to let the rest of the page load
                this.$timeout(() => this.$http.get("/api/DocumentLink/0").then((response) => this.viewPremiumInvoiceViewId = response.data.vid), 250);
            this.shouldShowTrialNote = this.siteInfo.privateSiteInfo.isPremiumPlanActive && moment().isBefore(moment(this.siteInfo.privateSiteInfo.creationDate).add(3, "months"));
        }
        /**
         * Occurs when the user clicks the button to cancel the premium plan auto-renewal
         */
        cancelPremiumAutoRenew() {
            if (!confirm("Are you sure?"))
                return;
            this.isLoading = true;
            this.$http.put("/api/Settings/CancelPremium", null).then(() => {
                this.isLoading = false;
                this.settings.premiumPlanIsAutoRenewed = false;
                this.shouldShowPaymentForm = false;
                this.refreshData();
            }, () => {
                this.isLoading = false;
                alert("Failed to cancel the premium plan. Refresh the page and try again or contact support if the problem persists.");
            });
        }
        showStripeError(errorMessage) {
            const displayError = document.getElementById('card-errors');
            if (HtmlUtil.isNullOrWhitespace(errorMessage))
                displayError.textContent = null; //'Unknown Error';
            else
                displayError.textContent = errorMessage;
        }
        initStripePayment() {
            const style = {
                base: {
                    color: "#32325d",
                    fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                    fontSmoothing: "antialiased",
                    fontSize: "16px",
                    "::placeholder": {
                        color: "#aab7c4"
                    }
                },
                invalid: {
                    color: "#fa755a",
                    iconColor: "#fa755a"
                }
            };
            const elements = this.stripeApi.elements();
            this.stripeCardElement = elements.create("card", { style: style });
            this.stripeCardElement.mount("#stripe-card-element");
            const onCardChange = (event) => {
                if (event.error)
                    this.showStripeError(event.error.message);
                else
                    this.showStripeError(null);
            };
            this.stripeCardElement.on('change', onCardChange);
        }
        submitCardToStripe() {
            this.isLoading = true;
            return this.stripeApi.createPaymentMethod({
                type: 'card',
                card: this.stripeCardElement,
            })
                .then((result) => {
                if (result.error) {
                    this.isLoading = false;
                    this.showStripeError(result.error.message);
                }
                else {
                    const activateInfo = {
                        stripePaymentMethodId: result.paymentMethod.id,
                        shouldPayAnnually: this.isActivatingAnnual
                    };
                    this.$http.put("/api/Settings/ActivatePremium", activateInfo).then(() => {
                        this.isLoading = false;
                        this.settings.premiumPlanIsAutoRenewed = true;
                        this.shouldShowPaymentForm = false;
                        this.refreshData();
                    }, (errorResponse) => {
                        this.isLoading = false;
                        alert("Failed to activate the premium plan. Refresh the page and try again or contact support if the problem persists: " + errorResponse.data.exceptionMessage);
                    });
                    //this.createSubscription( result.paymentMethod.id );
                }
                this.$scope.$apply();
            });
        }
        /**
         * Occurs when the user clicks the button to generate an annual invoice PDF
         */
        //viewPremiumInvoice()
        //{
        //    this.isLoading = true;
        //    this.$http.get( "/api/Settings/ViewPremiumInvoice" ).then(
        //        ( response: ng.IHttpPromiseCallbackArg<MeteredFeaturesUsage> ) =>
        //        {
        //            this.isLoading = false;
        //            this.settings.premiumPlanIsAutoRenewed = false;
        //            this.shouldShowPaymentForm = false;
        //            this.refreshData();
        //        },
        //        ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
        //        {
        //            this.isLoading = false;
        //            alert( "Failed to create invoice. Refresh the page and try again or contact support if the problem persists: " + errorResponse.data.exceptionMessage );
        //        }
        //    );
        //}
        /**
         * Occurs when the user clicks the button to generate a Stripe invoice
         */
        generateStripeInvoice(numMonths, shouldIncludeWireInfo) {
            const getUri = `PublicSettings/ViewPremiumInvoice?vid=${this.viewPremiumInvoiceViewId}&numMonths=${numMonths}&shouldIncludeWireInfo=${shouldIncludeWireInfo}`;
            window.open(this.siteInfo.publicSiteInfo.baseApiUrl + getUri, "_blank");
            this.$timeout(() => {
                // Refresh the view token in case the user clicks again
                this.$http.get("/api/DocumentLink/0").then((response) => this.viewPremiumInvoiceViewId = response.data.vid);
            }, 1250);
        }
        /**
         * Occurs when the user clicks the button to enable premium plan auto-renewal
         */
        activatePremiumRenewal() {
            this.shouldShowPaymentForm = true;
            this.updateCheckoutDescription();
            this.onPaymentTypeChange();
        }
        updateCheckoutDescription() {
            const renewedInPast = moment(this.premiumPlanRenewDate).isBefore();
            let payAmount;
            if (this.isActivatingAnnual) {
                payAmount = this.settings.premiumPlanCostDollars * 11;
                this.checkoutDescription = "You will be charged $" + payAmount + " ";
                if (renewedInPast)
                    this.checkoutDescription += " today and you will be charged annually on this date thereafter.";
                else
                    this.checkoutDescription += " on " + moment(this.premiumPlanRenewDate).format("dddd, MMMM Do YYYY") + " and you will be charged annually on that date thereafter.";
            }
            // Otherwise they'll be paying monthly
            else {
                payAmount = this.settings.premiumPlanCostDollars;
                this.checkoutDescription = "You will be charged $" + this.settings.premiumPlanCostDollars + " ";
                if (renewedInPast)
                    this.checkoutDescription += " today and you will be charged monthly on this date thereafter.";
                else
                    this.checkoutDescription += " on " + moment(this.premiumPlanRenewDate).format("dddd, MMMM Do YYYY") + " and you will be charged monthly on that date thereafter.";
            }
            if (renewedInPast)
                this.payButtonText = "Pay $" + payAmount;
            else
                this.payButtonText = "Schedule Payment";
        }
        createSubscription(paymentMethodId) {
            return (fetch('/create-subscription', {
                method: 'post',
                headers: {
                    'Content-type': 'application/json',
                },
                body: JSON.stringify({
                    paymentMethodId: paymentMethodId
                }),
            })
                .then((response) => {
                return response.json();
            })
                // If the card is declined, display an error to the user.
                .then((result) => {
                if (result.error) {
                    // The card had an error when trying to attach it to a customer.
                    throw result;
                }
                return result;
            })
                // Normalize the result to contain the object returned by Stripe.
                // Add the addional details we need.
                .then((result) => {
                return {
                    paymentMethodId: result.paymentMethodId,
                    priceId: result.priceId,
                    subscription: result.subscription,
                };
            })
                // Some payment methods require a customer to be on session
                // to complete the payment process. Check the status of the
                // payment intent to handle these actions.
                //.then( ( result: any ) => this.handlePaymentThatRequiresCustomerAction( result ) )
                // If attaching this card to a Customer object succeeds,
                // but attempts to charge the customer fail, you
                // get a requires_payment_method error.
                //.then( ( result: any ) => this.handleRequiresPaymentMethod( result ) )
                // No more actions required. Provision your service for the user.
                //.then( () =>
                //{
                //    //onSubscriptionComplete
                //    this.isLoading = true;
                //    const paymentInfo = {
                //        paymentId: 1
                //    };
                //} )
                .catch((error) => {
                // An error has happened. Display the failure to the user here.
                // We utilize the HTML element we created.
                this.showStripeError(error);
            }));
        }
        handlePaymentThatRequiresCustomerAction({ subscription, invoice, priceId, paymentMethodId, isRetry }) {
            if (subscription && subscription.status === 'active') {
                // Subscription is active, no customer actions required.
                return { subscription, priceId, paymentMethodId };
            }
            // If it's a first payment attempt, the payment intent is on the subscription latest invoice.
            // If it's a retry, the payment intent will be on the invoice itself.
            const paymentIntent = invoice ? invoice.payment_intent : subscription.latest_invoice.payment_intent;
            if (paymentIntent.status === 'requires_action' ||
                (isRetry === true && paymentIntent.status === 'requires_payment_method')) {
                return this.stripeApi
                    .confirmCardPayment(paymentIntent.client_secret, {
                    payment_method: paymentMethodId,
                })
                    .then((result) => {
                    if (result.error) {
                        // Start code flow to handle updating the payment details.
                        // Display error message in your UI.
                        // The card was declined (i.e. insufficient funds, card has expired, etc).
                        throw result;
                    }
                    else {
                        if (result.paymentIntent.status === 'succeeded') {
                            // Show a success message to your customer.
                            // There's a risk of the customer closing the window before the callback.
                            // We recommend setting up webhook endpoints later in this guide.
                            return {
                                priceId: priceId,
                                subscription: subscription,
                                invoice: invoice,
                                paymentMethodId: paymentMethodId,
                            };
                        }
                    }
                })
                    .catch((error) => {
                    this.showStripeError(error);
                });
            }
            else {
                // No customer action needed.
                return { subscription, priceId, paymentMethodId };
            }
        }
        handleRequiresPaymentMethod({ subscription, paymentMethodId, priceId, }) {
            if (subscription.status === 'active') {
                // subscription is active, no customer actions required.
                return { subscription, priceId, paymentMethodId };
            }
            else if (subscription.latest_invoice.payment_intent.status === 'requires_payment_method') {
                // Using localStorage to manage the state of the retry here,
                // feel free to replace with what you prefer.
                // Store the latest invoice ID and status.
                localStorage.setItem('latestInvoiceId', subscription.latest_invoice.id);
                localStorage.setItem('latestInvoicePaymentIntentStatus', subscription.latest_invoice.payment_intent.status);
                throw { error: { message: 'Your card was declined.' } };
            }
            else {
                return { subscription, priceId, paymentMethodId };
            }
        }
        /**
         * Retrieve the email usage from the server
         */
        refreshMeteredUsage() {
            this.isLoadingUsage = true;
            this.$http.get("/api/Settings/MeteredFeaturesUsage").then((response) => {
                this.isLoadingUsage = false;
                this.meteredUsage = response.data;
                this.meteredUsage.months = _.sortBy(this.meteredUsage.months, m => m.year.toString() + "_" + (m.month > 9 ? "" : "0") + m.month);
                this.emailUsageChartLabels = [];
                const emailsSentChartData = [];
                const groupEmailChartData = [];
                let totalEmailsSent = 0;
                let totalGroupEmailProcessed = 0;
                for (let i = 0; i < response.data.months.length; ++i) {
                    const curMonth = response.data.months[i];
                    const monthName = moment([curMonth.year, curMonth.month - 1, 1]).format("MMMM");
                    // Add the year to the first and last entries
                    if (i === 0 || i === this.meteredUsage.months.length - 1)
                        this.emailUsageChartLabels.push(monthName + " " + curMonth.year);
                    else
                        this.emailUsageChartLabels.push(monthName);
                    emailsSentChartData.push(curMonth.numEmailsSent);
                    groupEmailChartData.push(curMonth.numGroupEmailsProcessed);
                    totalEmailsSent += curMonth.numEmailsSent;
                    totalGroupEmailProcessed += curMonth.numGroupEmailsProcessed;
                }
                this.emailUsageChartData = [emailsSentChartData];
                this.groupEmailChartData = [groupEmailChartData];
                this.emailUsageAverageNumMonths = response.data.months.length;
                if (this.emailUsageAverageNumMonths > 1) {
                    this.emailUsageAverageSent = Math.round(totalEmailsSent / this.emailUsageAverageNumMonths);
                    this.groupEmailAverage = Math.round(totalGroupEmailProcessed / this.emailUsageAverageNumMonths);
                }
            });
            this.emailUsageChartOptions = {
                scales: {
                    yAxes: [
                        {
                            id: 'y-axis-1',
                            type: 'linear',
                            display: true,
                            position: 'left',
                            ticks: {
                                suggestedMin: 0,
                                // OR //
                                beginAtZero: true // minimum value will be 0.
                            }
                        }
                    ]
                }
            };
        }
        /**
         * Populate the page from the server
         */
        refreshData() {
            this.isLoading = true;
            this.$http.get("/api/Settings").then((response) => {
                this.isLoading = false;
                this.settings = response.data;
                this.isPremiumPlanActive = this.siteInfo.privateSiteInfo.isPremiumPlanActive;
                this.premiumPlanRenewDate = new Date();
                this.premiumPlanRenewDate = moment(this.settings.premiumPlanExpirationDate).add(1, "days").toDate();
                if (this.settings.premiumPlanIsAutoRenewed) {
                    this.planExpirationColor = "green";
                    this.$http.get("/api/Settings/StripeBillingPortal").then((response) => this.stripePortalUrl = response.data.portalUrl);
                }
                else {
                    const twoMonthsBefore = moment(this.settings.premiumPlanExpirationDate).add(-2, "months");
                    if (moment().isBefore(twoMonthsBefore))
                        this.planExpirationColor = "green";
                    else
                        this.planExpirationColor = "red";
                }
                this.refreshMeteredUsage();
            });
        }
        /**
         * Bring the user to view their email history
         */
        goToEmailHistory() {
            this.appCacheService.set("goToEmailHistory", "true");
            window.location.hash = "#!/ManageResidents";
            return true;
        }
        /**
         * Start the Stripe-Plaid ACH-linking flow
         */
        startPlaidAchConnection() {
            this.isLoading = true;
            this.$http.get("/api/Plaid/StripeLinkToken").then((httpResponse) => {
                this.isLoading = false;
                if (!httpResponse.data) {
                    alert("Failed to start Plaid connection. Please contact support.");
                    return;
                }
                const plaidConfig = {
                    token: httpResponse.data,
                    onSuccess: (public_token, metadata) => {
                        console.log("Plaid StripeLinkToken onSuccess", metadata);
                        this.completePlaidAchConnection(public_token, metadata.account_id);
                    },
                    onLoad: () => { },
                    onExit: (err, metadata) => { console.log("update onExit.err", err, metadata); },
                    onEvent: (eventName, metadata) => { console.log("update onEvent.eventName", eventName, metadata); },
                    receivedRedirectUri: null,
                };
                const plaidHandler = Plaid.create(plaidConfig);
                plaidHandler.open();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to start Plaid connection: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Complete the Stripe-Plaid ACH-linking flow
         */
        completePlaidAchConnection(accessToken, accountId) {
            this.isLoading = true;
            const postData = {
                accessToken,
                selectedAccountIds: [accountId]
            };
            this.$http.post("/api/Plaid/ProcessStripeAccessToken", postData).then(() => {
                this.isLoading = false;
                this.checkoutDescription = "Account successfully linked, reloading...";
                window.location.reload();
            }, (httpResponse) => {
                this.isLoading = false;
                alert("Failed to link account: " + httpResponse.data.exceptionMessage);
            });
        }
        /**
         * Complete the Stripe-Plaid ACH-linking flow
         */
        makeAchStripePayment() {
            this.isLoading = true;
            const activateInfo = {
                shouldPayAnnually: this.isActivatingAnnual,
                payViaAch: true
            };
            this.$http.put("/api/Settings/ActivatePremium", activateInfo).then(() => {
                this.isLoading = false;
                this.settings.premiumPlanIsAutoRenewed = true;
                this.shouldShowPaymentForm = false;
                this.refreshData();
            }, (errorResponse) => {
                this.isLoading = false;
                alert("Failed to activate the premium plan. Refresh the page and try again or contact support if the problem persists: " + errorResponse.data.exceptionMessage);
            });
        }
        onPaymentTypeChange() {
            // Tell Stripe to populate the card info area
            if (this.paymentType === "creditCard")
                this.$timeout(() => this.initStripePayment(), 250);
        }
    }
    PremiumPlanSettingsController.$inject = ["$http", "SiteInfo", "appCacheService", "$timeout", "$scope"];
    Ally.PremiumPlanSettingsController = PremiumPlanSettingsController;
    class GroupMonthEmails {
    }
    Ally.GroupMonthEmails = GroupMonthEmails;
})(Ally || (Ally = {}));
CA.angularApp.component("premiumPlanSettings", {
    templateUrl: "/ngApp/chtn/manager/settings/premium-plan-settings.html",
    controller: Ally.PremiumPlanSettingsController
});
class MeteredFeaturesUsage {
}
