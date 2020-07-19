var Ally;
(function (Ally) {
    /**
     * The controller for the page to view group premium plan settings
     */
    var PremiumPlanSettingsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function PremiumPlanSettingsController($http, siteInfo, $timeout, $scope, $rootScope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.$scope = $scope;
            this.$rootScope = $rootScope;
            this.settings = new Ally.ChtnSiteSettings();
            this.originalSettings = new Ally.ChtnSiteSettings();
            this.isLoading = false;
            this.shouldShowPremiumPlanSection = true;
            this.shouldShowPaymentForm = false;
            this.stripeApi = null;
            this.stripeCardElement = null;
            this.isActivatingAnnual = false;
            this.emailUsageChartData = [];
            this.emailUsageChartLabels = [];
            this.emailUsageChartOptions = {};
            this.shouldShowPremiumPlanSection = AppConfig.appShortName === "condo" || AppConfig.appShortName === "hoa";
            this.homeNamePlural = AppConfig.homeName.toLowerCase() + "s";
            var StripeKey = "pk_test_FqHruhswHdrYCl4t0zLrUHXK";
            //const StripeKey = "pk_live_fV2yERkfAyzoO9oWSfORh5iH";
            this.stripeApi = Stripe(StripeKey);
        }
        ;
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        PremiumPlanSettingsController.prototype.$onInit = function () {
            this.refreshData();
        };
        /**
         * Occurs when the user clicks the button to cancel the premium plan auto-renewal
         */
        PremiumPlanSettingsController.prototype.cancelPremiumAutoRenew = function () {
            var _this = this;
            if (!confirm("Are you sure?"))
                return;
            this.isLoading = true;
            this.$http.put("/api/Settings/CancelPremium", null).then(function (response) {
                _this.isLoading = false;
                _this.settings.premiumPlanIsAutoRenewed = false;
                _this.shouldShowPaymentForm = false;
                _this.refreshData();
            }, function () {
                _this.isLoading = false;
                alert("Failed to cancel the premium plan. Refresh the page and try again or contact support if the problem persists.");
            });
        };
        PremiumPlanSettingsController.prototype.showStripeError = function (errorMessage) {
            var displayError = document.getElementById('card-errors');
            if (HtmlUtil.isNullOrWhitespace(errorMessage))
                displayError.textContent = '';
            else
                displayError.textContent = errorMessage;
        };
        PremiumPlanSettingsController.prototype.initStripePayment = function () {
            var _this = this;
            var style = {
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
            var elements = this.stripeApi.elements();
            this.stripeCardElement = elements.create("card", { style: style });
            this.stripeCardElement.mount("#stripe-card-element");
            var onCardChange = function (event) {
                var displayError = document.getElementById('card-errors');
                if (event.error)
                    _this.showStripeError(event.error.message);
                else
                    _this.showStripeError(null);
            };
            this.stripeCardElement.on('change', onCardChange);
        };
        PremiumPlanSettingsController.prototype.submitCardToStripe = function () {
            var _this = this;
            this.isLoading = true;
            return this.stripeApi.createPaymentMethod({
                type: 'card',
                card: this.stripeCardElement,
            })
                .then(function (result) {
                if (result.error) {
                    _this.isLoading = false;
                    _this.showStripeError(result.error);
                }
                else {
                    var activateInfo = {
                        stripePaymentMethodId: result.paymentMethod.id,
                        shouldPayAnnually: false
                    };
                    _this.$http.put("/api/Settings/ActivatePremium", activateInfo).then(function (response) {
                        _this.isLoading = false;
                        _this.settings.premiumPlanIsAutoRenewed = true;
                        _this.shouldShowPaymentForm = false;
                        _this.refreshData();
                    }, function () {
                        _this.isLoading = false;
                        alert("Failed to activate the premium plan. Refresh the page and try again or contact support if the problem persists.");
                    });
                    //this.createSubscription( result.paymentMethod.id );
                }
            });
        };
        /**
         * Occurs when the user clicks the button to enable premium plan auto-renewal
         */
        PremiumPlanSettingsController.prototype.activatePremiumRenewal = function () {
            var _this = this;
            this.shouldShowPaymentForm = true;
            this.updateCheckoutDescription();
            setTimeout(function () { return _this.initStripePayment(); }, 250);
        };
        PremiumPlanSettingsController.prototype.updateCheckoutDescription = function () {
            var renewedInPast = moment(this.premiumPlanRenewDate).isBefore();
            var payAmount;
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
        };
        PremiumPlanSettingsController.prototype.createSubscription = function (paymentMethodId) {
            var _this = this;
            return (fetch('/create-subscription', {
                method: 'post',
                headers: {
                    'Content-type': 'application/json',
                },
                body: JSON.stringify({
                    paymentMethodId: paymentMethodId
                }),
            })
                .then(function (response) {
                return response.json();
            })
                // If the card is declined, display an error to the user.
                .then(function (result) {
                if (result.error) {
                    // The card had an error when trying to attach it to a customer.
                    throw result;
                }
                return result;
            })
                // Normalize the result to contain the object returned by Stripe.
                // Add the addional details we need.
                .then(function (result) {
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
                .catch(function (error) {
                // An error has happened. Display the failure to the user here.
                // We utilize the HTML element we created.
                _this.showStripeError(error);
            }));
        };
        PremiumPlanSettingsController.prototype.handlePaymentThatRequiresCustomerAction = function (_a) {
            var _this = this;
            var subscription = _a.subscription, invoice = _a.invoice, priceId = _a.priceId, paymentMethodId = _a.paymentMethodId, isRetry = _a.isRetry;
            if (subscription && subscription.status === 'active') {
                // Subscription is active, no customer actions required.
                return { subscription: subscription, priceId: priceId, paymentMethodId: paymentMethodId };
            }
            // If it's a first payment attempt, the payment intent is on the subscription latest invoice.
            // If it's a retry, the payment intent will be on the invoice itself.
            var paymentIntent = invoice ? invoice.payment_intent : subscription.latest_invoice.payment_intent;
            if (paymentIntent.status === 'requires_action' ||
                (isRetry === true && paymentIntent.status === 'requires_payment_method')) {
                return this.stripeApi
                    .confirmCardPayment(paymentIntent.client_secret, {
                    payment_method: paymentMethodId,
                })
                    .then(function (result) {
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
                    .catch(function (error) {
                    _this.showStripeError(error);
                });
            }
            else {
                // No customer action needed.
                return { subscription: subscription, priceId: priceId, paymentMethodId: paymentMethodId };
            }
        };
        PremiumPlanSettingsController.prototype.handleRequiresPaymentMethod = function (_a) {
            var subscription = _a.subscription, paymentMethodId = _a.paymentMethodId, priceId = _a.priceId;
            if (subscription.status === 'active') {
                // subscription is active, no customer actions required.
                return { subscription: subscription, priceId: priceId, paymentMethodId: paymentMethodId };
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
                return { subscription: subscription, priceId: priceId, paymentMethodId: paymentMethodId };
            }
        };
        /**
         * Retrieve the email usage from the server
         */
        PremiumPlanSettingsController.prototype.refreshMeteredUsage = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Settings/MeteredFeaturesUsage").then(function (response) {
                _this.isLoading = false;
                _this.meteredUsage = response.data;
                _this.emailUsageChartLabels = [];
                var chartData = [];
                for (var i = 0; i < response.data.months.length; ++i) {
                    var curMonth = response.data.months[i];
                    var monthName = moment([curMonth.year, curMonth.month - 1, 1]).format("MMMM");
                    _this.emailUsageChartLabels.push(monthName);
                    chartData.push(curMonth.numEmailsSent);
                }
                _this.emailUsageChartData = [chartData];
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
        };
        /**
         * Populate the page from the server
         */
        PremiumPlanSettingsController.prototype.refreshData = function () {
            var _this = this;
            this.isLoading = true;
            this.$http.get("/api/Settings").then(function (response) {
                _this.isLoading = false;
                _this.settings = response.data;
                _this.originalSettings = _.clone(response.data);
                _this.isPremiumPlanActive = _this.siteInfo.privateSiteInfo.isPremiumPlanActive;
                _this.premiumPlanRenewDate = new Date();
                _this.premiumPlanRenewDate = moment(_this.settings.premiumPlanExpirationDate).add(1, "days").toDate();
                _this.refreshMeteredUsage();
            });
        };
        PremiumPlanSettingsController.$inject = ["$http", "SiteInfo", "$timeout", "$scope", "$rootScope"];
        return PremiumPlanSettingsController;
    }());
    Ally.PremiumPlanSettingsController = PremiumPlanSettingsController;
    var GroupMonthEmails = /** @class */ (function () {
        function GroupMonthEmails() {
        }
        return GroupMonthEmails;
    }());
    Ally.GroupMonthEmails = GroupMonthEmails;
})(Ally || (Ally = {}));
CA.angularApp.component("premiumPlanSettings", {
    templateUrl: "/ngApp/chtn/manager/settings/premium-plan-settings.html",
    controller: Ally.PremiumPlanSettingsController
});
var StripePayNeedsCustomer = /** @class */ (function () {
    function StripePayNeedsCustomer() {
    }
    return StripePayNeedsCustomer;
}());
var MeteredFeaturesUsage = /** @class */ (function () {
    function MeteredFeaturesUsage() {
    }
    return MeteredFeaturesUsage;
}());
