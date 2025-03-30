angular.module('PromoApp')
    .controller('BillingInformationController', ['$scope', 'config', 'awsService', 'Utils', 'authService', '$window', function($scope, config, awsService, Utils, authService, $window) {

        $scope.forms = {};
        const stripe = Stripe(config.STRIPE_KEY);
        const elements = stripe.elements(Utils.stripeInitElements());
        $scope.cardDetails = {
            card: false,
            cvv: false,
            expiry: false
        };
        $scope.accountDisablePay = true;
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

        $scope.initStripe = function() {

            let gatewayID = authService.get('gatewayID');
            if (gatewayID) {
                $scope.gateway = JSON.parse(gatewayID);
            }
            // Custom styling can be passed to options when creating an Element.
            let style = Utils.stripeStyle();

            // Create an instance of the card Element.
            let card = elements.create('cardNumber', { style: style });

            // Add an instance of the card Element into the `account-card-element` <div>.
            card.mount('#bi-card-element');

            let cardExpiry = elements.create('cardExpiry', { style: style });
            cardExpiry.mount('#bi-card-expiry');

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
            cardCvc.mount('#bi-card-cvc');

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


            var form = document.getElementById('bi-payment-form');
            form.addEventListener('submit', function(event) {
                event.preventDefault();
                $scope.loading = true;
                stripe.createToken(card)
                    .then(function(result) {
                        if (result.error) {
                            // Inform the customer that there was an error.
                            Utils.showError($scope, result.error.message);
                            $scope.accountDisablePay = false;
                            $scope.loading = false;
                            return Promise.reject();
                        } else {
                            // Send the token to your server.
                            let session = authService.getSession();
                            return awsService.post(`/user/${$scope.gateway.gateway_id}/card`, { id: $scope.gateway._id, gateway_id: $scope.gateway.gateway_id, source: result.token.id }, session.token);
                        }
                    })
                    .then(res => {
                        Utils.showSuccess($scope, "Card updated successfully");
                        authService.remove('gatewayID');
                        $scope.loading = false;
                        Utils.applyChanges($scope);
                        $window.location.reload();
                    })
                    .catch((err) => {
                        console.log(err);
                        if (err && err.message) {
                            Utils.showError($scope, err.message);
                        }
                    });
            });
        };

        $scope.initStripe();


        $scope.cancel = function() {
            this.$dismiss('close');
        };
    }]);