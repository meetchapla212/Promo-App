angular.module('PromoApp')
    .controller('AccountHistoryController', ['phqservice', '$scope', 'config', '$rootScope', 'awsService', 'authService', 'qbService', 'eventsService', '$location', 'userService', 'Utils', '$uibModal', '$route', '$window', function(phqservice, $scope, config, $rootScope, awsService, authService, qbService, eventsService, $location, userService, Utils, $uibModal, $route, $window) {
        const stripe = Stripe(config.STRIPE_KEY);
        const elements = stripe.elements(Utils.stripeInitElements());
        $scope.plans = config.PLANS;
        $scope.numPerPage = 10;
        $scope.status = "claimed";
        $scope.page = 1;
        $scope.gateway = null;

        $scope.showhide = {
            tabs: true,
            downgrade: false,
            upgrade: false,
            couponChecked: false,
            couponDisablePay: true,
            payByAnotherCard: false
        };
        $scope.tabs = {
            billingHistory: {
                currentPage: 1
            },
            claimedHistory: {
                currentPage: 1
            }
        };
        $scope.gatewayID = null;

        $scope.newSelectedPlan = null;
        const DATE_FORMAT = "DD/MM/YYYY hh:mm a";
        let user = authService.getUser();
        $scope.billingHistories = [];
        $scope.claimedHistories = [];
        $scope.loading = false;
        $scope.coupon = null;
        $scope.loaderText = 'Loading';
        $scope.selectedPlan = $scope.plans.filter(p => p.frequency != null)[0];
        $scope.accountDisablePay = true;
        $scope.cardDetails = {
            card: false,
            cvv: false,
            expiry: false
        };
        $scope.currentPlanId = null;
        $scope.submitButtonText = null;

        $scope.validateCoupon = function() {

            if ($scope.showhide.couponChecked && $scope.coupon && $scope.coupon.trim() != '') {
                // Make call to API
                $scope.loading = true;
                return awsService.getCoupon($scope.coupon)
                    .then((coupon) => {
                        $scope.loading = false;
                        $scope.showhide.couponDisablePay = false;
                        Utils.applyChanges($scope);
                        Utils.showSuccess($scope, 'Coupon applied successfully', 'Congratulations');
                        return Promise.resolve(coupon.data);
                    })
                    .catch((err) => {
                        $scope.loading = false;
                        $scope.showhide.couponDisablePay = true;
                        console.log(err);
                        let message = MESSAGES.SOMETHING_WENT_WRONG;
                        if (err && err.data && err.data.message) {
                            message = err.data.message;
                        }
                        Utils.showError($scope, message);
                        return Promise.reject(message);
                    });
            } else {
                return Promise.resolve(null);
            }
        };

        $scope.initStripeStatus = false;

        let cardBrandToPfClass = {
            'visa': 'fa-cc-visa',
            'mastercard': 'fa-cc-mastercard',
            'amex': 'fa-cc-amex',
            'discover': 'fa-cc-discover',
            'diners': 'fa-cc-diners-club',
            'jcb': 'fa-cc-jcb',
            'unknown': 'fa-credit-card',
        };

        function setBrandIcon(brand) {
            let brandIconElement = document.getElementById('brand-icon');
            let pfClass = 'pf-credit-card';
            if (brand in cardBrandToPfClass) {
                pfClass = cardBrandToPfClass[brand];
            }
            for (let i = brandIconElement.classList.length - 1; i >= 0; i--) {
                brandIconElement.classList.remove(brandIconElement.classList[i]);
            }
            brandIconElement.classList.add('fa');
            brandIconElement.classList.add(pfClass);
        }

        function updateButtonState() {
            $scope.accountDisablePay = !($scope.cardDetails.card && $scope.cardDetails.cvv && $scope.cardDetails.expiry);
        }

        $scope.changePlan = function(result, coupon) {

            let data = {
                "amount": $scope.newSelectedPlan.amount,
                "description": $scope.newSelectedPlan.subtitle,
                "plan_id": $scope.newSelectedPlan.id,
            };

            if (result) {
                data.token = result.token.id;
            }
            if (coupon) {
                data.coupon = coupon.id;
            }
            if ($scope.newSelectedPlan.frequency) {
                data.subscription = true;
                if ($scope.selectedPlan && $scope.selectedPlan.id != 'free') {
                    data.old_plan_id = $scope.selectedPlan.id;
                }
            }
            $scope.loading = true;
            let token = authService.get('token');
            awsService.completeTransaction(data, token).then(res => {
                console.log('payment success', res);
                if (res.data.customerID) {
                    authService.remove("gatewayID");
                    Utils.showSuccess($scope, 'Payment Successful', 'Congratulations');
                } else {
                    Utils.showSuccess($scope, res.data.message, 'Congratulations');
                }
                $scope.loading = false;
                let user = authService.getUser();
                user.selectedPlan.id = $scope.newSelectedPlan.id;
                authService.setUser(user);
                if ($scope.redirectid) {
                    location.href = `/events/${$scope.redirectid}/edit#3`;
                } else {
                    //need to change user paln
                    $window.location.reload();
                }
                $scope.accountDisablePay = true;
            }).catch(err => {
                Utils.showError($scope, "Payment unsuccessful");
                $scope.accountDisablePay = false;
                $scope.loading = false;
            });
        };
        $scope.initStripe = function() {
            // Custom styling can be passed to options when creating an Element.
            let style = Utils.stripeStyle();

            // Create an instance of the card Element.
            let card = elements.create('cardNumber', { style: style });

            // Add an instance of the card Element into the `account-card-element` <div>.
            card.mount('#account-card-element');

            let cardExpiry = elements.create('cardExpiry', { style: style });
            cardExpiry.mount('#account-card-expiry');

            cardExpiry.addEventListener('change', function(event) {
                if (event.complete) {
                    $scope.cardDetails.expiry = true;
                } else {
                    $scope.cardDetails.expiry = false;
                }
                updateButtonState();
                Utils.applyChanges($scope);
            });

            let cardCvc = elements.create('cardCvc', {
                style: style,
                placeholder: 'e.g. 012',
                classes: { base: 'cvc-code-img' }
            });
            cardCvc.mount('#account-card-cvc');

            cardCvc.addEventListener('change', function(event) {
                if (event.complete) {
                    $scope.cardDetails.cvv = true;
                } else {
                    $scope.cardDetails.cvv = false;
                }
                updateButtonState();
                Utils.applyChanges($scope);
            });

            card.addEventListener('change', function(event) {
                //  var displayError = document.getElementById('card-errors');
                // Switch brand logo
                if (event.brand) {
                    setBrandIcon(event.brand);
                }

                if (event.error) {
                    Utils.showError($scope, event.error.message);
                    $scope.cardDetails.card = false;
                }

                if (event.complete) {
                    $scope.cardDetails.card = true;
                } else {
                    $scope.cardDetails.card = false;
                }
                updateButtonState();
                Utils.applyChanges($scope);
            });


            var form = document.getElementById('account-payment-form');
            form.addEventListener('submit', function(event) {
                event.preventDefault();

                // Check if coupon is applied then validate coupon
                let coupon = null;
                $scope.validateCoupon()
                    .then((res) => {
                        coupon = res;
                        $scope.accountDisablePay = true;
                        $scope.loading = true;
                        return stripe.createToken(card);
                    })
                    .then(function(result) {
                        if (result.error) {
                            // Inform the customer that there was an error.
                            Utils.showError($scope, result.error.message);
                            $scope.accountDisablePay = false;
                            $scope.loading = false;
                        } else {
                            // Send the token to your server.
                            $scope.changePlan(result, coupon);
                        }
                    })
                    .catch((err) => {
                        console.log(err);
                    });

            });
        };

        // This method is used to select the plan
        $scope.selectPlan = function(plan, upgrade, downgrade) {
            $scope.newSelectedPlan = $scope.plans.find(p => p.id === plan);
            if ($scope.currentPlanId && ($scope.currentPlanId == $scope.selectedPlan.id)) {
                $scope.newSelectedPlan.subscribed = true;
            }

            if (downgrade) {
                $scope.showhide.tabs = false;
                $scope.showhide.downgrade = true;
                $scope.showhide.upgrade = false;
            }
            if (upgrade) {
                $scope.showhide.tabs = false;
                $scope.showhide.downgrade = false;
                $scope.showhide.upgrade = true;

                if (!$scope.initStripeStatus) {
                    $scope.initStripe();
                }
            }
        };

        $scope.backToTabs = function() {
            $scope.showhide.tabs = true;
            $scope.showhide.downgrade = false;
            $scope.showhide.upgrade = false;
        };
        $scope.redirectid = null;
        $scope.init = function() {
            // Check if you have any query string
            let queryStringObject = $location.search();
            if (queryStringObject && 'redirect' in queryStringObject && queryStringObject.redirect != '') {
                let redirect = queryStringObject.redirect;
                $scope.redirectid = redirect;
            }

            $scope.plans.push({
                id: 'free',
                title: 'FREE',
                amount: 0,
                image: 'neutral.svg',
                description: [
                    { title: "Ticketed Events", allowed: false },
                    { title: "Unlimited Event Creation", allowed: true },
                    { title: "Unlimited Claims + Highlights", allowed: false }
                ]
            });
            $scope.selectedPlan = $scope.plans.filter(p => p.id === 'free')[0];

            if (authService.getSession() && user) {
                $scope.userSession = authService.getSession();
                let token = authService.get('token');
                $scope.loading = true;
                let promises = [];

                $scope.currentPlanId = user.selectedPlan.id;
                // Make selected plan
                console.log($scope.currentPlanId);
                $scope.selectedPlan = $scope.plans.filter(p => p.id === $scope.currentPlanId)[0];

                if ($scope.currentPlanId === $scope.selectedPlan.id) {
                    $scope.accountDisablePay = true;
                    $scope.selectedPlan.subscribed = true;
                }

                promises.push(getBillingHistoryOnLoad(token));
                let filter = { "status": $scope.status, "page": $scope.page, "limit": $scope.numPerPage };
                promises.push(getClaimedHistoryOnLoad(filter));
                $scope.loading = false;
                return Promise.all(promises);

            } else {
                $location.path('/login');
            }
        };

        $scope.billingInfo = function() {
            let eventModelScope = $scope.$new(false, $scope);
            let modalInstance = $uibModal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: '../../partials/billingInformationModal.html',
                openedClass: 'pa-create-event-modal add-link-modal',
                scope: eventModelScope,
                size: 'md'
            });
        };

        let getBillingHistoryOnLoad = function(token) {
            if (token) {
                $scope.loadingBilling = true;
                $scope.loaderBillingMessage = 'loading...';
                return awsService.get(`/billing/billingHistory`, token).then(res => {
                    if (res && res.data) {
                        $scope.billingHistories = res.data;
                        $scope.billingHistories.forEach(function(history) {
                            history.created = moment.utc(history.created * 1000).format(DATE_FORMAT);
                            history.plan = $scope.plans.filter(p => (p.amount * 100) == history.amount)[0];
                        });
                    }
                    $scope.loadingBilling = false;
                    return Promise.resolve();
                }).catch(err => {
                    return Promise.resolve();
                });
            } else {
                return Promise.resolve();
            }
        };

        let getClaimedHistoryOnLoad = function(filter) {
            $scope.loadingBilling = true;
            $scope.loaderBillingMessage = 'Loading...';
            return eventsService.getEventsByStatus(filter)
                .then(res => {
                    $scope.claimedHistories = res.data;

                    $scope.claimedHistories.forEach(function(history) {
                        history.plan = $scope.plans.filter(p => p.id == history.plan_id)[0];
                        history.created = moment.utc(history.created_at * 1000).format(DATE_FORMAT);
                        let event_date_time = moment.utc(history.created);
                        let current_date_time = moment.utc().startOf('day');
                        history.disabledEdit = current_date_time.isBefore(event_date_time);

                    });
                    $scope.loadingBilling = false;
                    applyChanges();
                    return Promise.resolve();
                }).catch(err => {
                    console.log('error in getting claim history', err);
                    return Promise.resolve();
                });
        };

        const applyChanges = () => {
            if (!$scope.$$phase) {
                $scope.$digest();
            }
        };

        $scope.cancel = function() {
            this.$dismiss('close');
        };

        $scope.downgradeSubscription = function() {
            if ($scope.newSelectedPlan.id === 'free') {
                $scope.showConfirmCancellation();
            } else {
                // change subscription
                $scope.changePlan();
            }
        };

        $scope.showConfirmCancellation = function() {
            angular.element('#confirmModalButton').click();
        };

        //for unsubscribing the plan
        $scope.cancelSubscription = function() {
            $scope.loading = true;
            $scope.accountDisablePay = true;
            let token = authService.get('token');
            awsService.unsubscribeStripePlan(token).then(res => {

                let user = authService.getUser();
                user.selectedPlan.id = 'free';
                authService.setUser(user);
                $scope.loading = false;
                Utils.showSuccess($scope, "Account updated successfully");
                $window.location.reload();
            }).catch(err => {
                $scope.loading = false;
                if (err.status == 400) {
                    Utils.showError($scope, err.data.message);
                } else {
                    Utils.showError($scope, MESSAGES.SOMETHING_WENT_WRONG);
                }
            });

        };

        $scope.openAccountEditModal = function(history) {
            if (history.disabledEdit) {
                console.log("history" + JSON.stringify(history, null, 4));
                $window.location.href = Utils.getEditUrl(history.event_id);
            }
        };

        $scope.init();

    }]);