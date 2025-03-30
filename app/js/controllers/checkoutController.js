angular.module('PromoApp')
    .controller('checkoutController', ['$route', '$location', '$scope', 'eventsService', 'authService', 'apiService', 'stripeService', '$window', 'config', '$sce', 'awsService', 'Utils', '$interval', '$uibModal',
        function($route, $location, $scope, eventsService, authService, apiService, stripeService, $window, config, $sce, awsService, Utils, $interval, $uibModal) {
            let session = authService.getSession();
            $scope.event = {};
            $scope.eventID = null;
            $scope.currency = "$";
            $scope.loading = false;
            $scope.contentViewer = false;
            $scope.loadingMessage = "Initiating payment. Please do not refresh or reload.";
            $scope.loadingFreeMessage = "Please do not refresh or reload.";
            $scope.categoriesMap = config.CATEGORIES;
            $scope.paypalBaseUrl = $sce.trustAsResourceUrl(config.PAYPAL_BASE_URL);
            $scope.formUrl = $sce.trustAsResourceUrl($scope.paypalBaseUrl + '/cgi-bin/webscr');
            $scope.imgUrl = $sce.trustAsResourceUrl($scope.paypalBaseUrl + '/en_US/i/btn/btn_buynow_LG.gif');
            $scope.pixelUrl = $sce.trustAsResourceUrl($scope.paypalBaseUrl + '/en_US/i/scr/pixel.gif');
            $scope.payPalSuccessRedirectUrl = config.AWS_BASE_URL + "/tickets/paypal";
            $scope.userticket = null;
            $scope.confirmCancelTicketModel = '';
            $scope.checkoutDetails = { price: 0, quantity: 0 };
            $scope.passwordToken = authService.get('passwordToken');
            $scope.invitedId = authService.get('invitedId');
            $scope.showhide = { help: false };
            let counterStart = 480;
            $scope.counter = counterStart; // in second 
            $scope.price_calculation = [];
            $scope.sub_total = 0.00;
            $scope.total_fee = 0.00;
            $scope.total_amt = 0.00;
            $scope.layoutDetails = null;
            $scope.widget_token = '';

            const readSelectedSeatFileInLocalStorage = () => {
                let user_selected_seat = $window.localStorage.getItem("user_selected_seat");
                if (user_selected_seat) {
                    return user_selected_seat;
                }
                return 'https://dummyimage.com/600x400/000/fff';
            };

            $scope.goToTicketType = () => {
                if (widget) {
                    $window.location.href = '/widget/ticket_list?ev=' + $scope.eventID + '&selection=' + ($route.current.params.selection) + '&reload= 1';
                } else {
                    $window.location.href = '/ticket_type?ev=' + $scope.eventID + '&selection=' + ($route.current.params.selection) + '&reload= 1';
                }
            };

            $scope.goToTicketTypeNew = (widget) => {
                if (widget) {
                    $window.location.href = '/widget/ticket_list?ev=' + $scope.eventID;
                } else {
                    $window.location.href = '/ticket_type?ev=' + $scope.eventID;
                }
            };

            $scope.getTicketBillingInformation = () => {
                let obj = (KJUR.jws.JWS.readSafeJSONString(b64utoutf8(($route.current.params.selection).split(".")[1])));
                $scope.event.tickets = obj.tickets;
                $scope.currency = obj.currency;
                $scope.price_calculation = obj.calcuation;
                $scope.sub_total = obj.sub_total;
                $scope.total_fee = obj.total_fee;
                $scope.total_amt = obj.total_amt;

                let fixedFeeCharge = false;
                for (let ticket of $scope.event.tickets) {
                    if (ticket.reserved && ticket.reserved > 0) {
                        $scope.checkoutDetails.quantity += ticket.reserved;
                        if (ticket.price == ticket.total_price) {
                            $scope.checkoutDetails.price += (ticket.reserved * ticket.price);
                        } else {
                            fixedFeeCharge = true;
                            $scope.checkoutDetails.price += ((ticket.price + (ticket.price * 2.9) / 100) * ticket.reserved);
                        }
                    }
                }
                if (fixedFeeCharge) {
                    $scope.checkoutDetails.price = $scope.checkoutDetails.price + 0.49;
                }
                $scope.checkoutDetails.price = obj.total_amt;
            };

            const applyChanges = () => {
                if (!$scope.$$phase) {
                    $scope.$digest();
                }
            };

            $scope.paidLoader = () => {
                $scope.loading = true;
                $scope.loadingMessage = "Purchasing Your Ticket...";
            };

            $scope.cancel = function() {
                this.$dismiss('close');
            };

            $scope.getEventDetailsPageLink = function() {
                let event_name = $scope.event.event_name.replace(/\s+/g, '-').toLowerCase();
                let event_id = $scope.event.event_id;
                let eventdetailsPageLink = '/eventdetails/' + event_name + '/' + event_id;
                return eventdetailsPageLink;
            };

            $scope.goToEventDetailsFormModel = function(widget) {
                $scope.loadingInit = false;
                $scope.loading = true;
                $scope.loadingMessage = "Please wait, do not refresh or reload a page.";
                $scope.contentViewer = true;
                let token = authService.get('token');
                apiService.deleteUserHoldTickets(token).then((response) => {
                    response = response.data;
                    if (response.success) {
                        $scope.loading = false;
                        let notify = {
                            type: 'success',
                            title: 'Success',
                            content: response.message,
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        $scope.confirmCancelTicketModel.close();
                        $scope.goToTicketTypeNew(widget);
                    } else {
                        $scope.loading = false;
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: response.message,
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        $scope.confirmCancelTicketModel.close();
                    }
                }).catch(err => {
                    $scope.loading = false;
                    let content = "Sorry something went wrong. Please try later.";
                    if (err.data && 'message' in err.data) {
                        content = err.data.message;
                    }
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: content,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    $scope.confirmCancelTicketModel.close();
                });

            };

            $scope.openTicketPreview = function() {
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.imageURL = readSelectedSeatFileInLocalStorage();
                ticketPreviewModel = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/ticketPreviewModel.html',
                    openedClass: 'pa-create-event-modal add-link-modal ticket-popup-new-ui scroll_popup',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            $scope.checkoutLeftConfirmation = function(widget) {
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.widget = widget;
                $scope.confirmCancelTicketModel = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/checkoutLeftConfirmation.html',
                    openedClass: 'pa-create-event-modal add-link-modal ticket-popup-new-ui scroll_popup',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            $scope.goToEventDetails = function(widget) {
                $scope.loadingInit = false;
                if ($scope.counter == counterStart) {
                    $scope.goToTicketType(widget);
                } else {
                    $scope.checkoutLeftConfirmation(widget);
                }
            };

            $scope.init = () => {
                $scope.widget = false;
                let current_route = $location.path();

                if (current_route == '/widget/checkout') {
                    $scope.widget = true;
                }


                if ($route.current.params && 'widget_token' in $route.current.params) {
                    $scope.widget_token = $route.current.params.widget_token;
                    $scope.user_email = $route.current.params.email;
                }

                $interval(function() { if ($scope.counter > 0) { $scope.counter--; } }, 1000);

                // fow web
                let stripe = Stripe(config.STRIPE_PUBLISH_KEY);

                let elements = stripe.elements();

                // stripe new 
                var style = {
                    base: {
                        iconColor: '#666EE8',
                        color: '#333',
                        lineHeight: '30px',
                        fontWeight: '400',
                        fontSize: '16px',
                        height: '25px',

                        '::placeholder': {
                            color: '#CFD7E0',
                        },
                    },
                };
                var cardNumberElement = elements.create('cardNumber', {
                    style: style
                });
                cardNumberElement.mount('#card-number-element');

                var cardExpiryElement = elements.create('cardExpiry', {
                    style: style
                });
                cardExpiryElement.mount('#card-expiry-element');

                var cardCvcElement = elements.create('cardCvc', {
                    style: style
                });
                cardCvcElement.mount('#card-cvc-element');

                var postalCodeElement = elements.create('postalCode', {
                    style: style
                });
                postalCodeElement.mount('#card-postalcode-element');

                document.getElementById('submit_button').disabled = true;

                function setOutcome(result) {
                    var errorElement = document.querySelector('.error');
                    errorElement.classList.remove('visible');
                    if (result.token) {
                        $scope.buyTicket(result.token.id);
                    } else if (result.error) {
                        errorElement.textContent = result.error.message;
                        errorElement.classList.add('visible');
                    }
                }

                var cardBrandToPfClass = {
                    'visa': 'img/visa.png',
                    'mastercard': 'img/mastercard.png',
                    'amex': 'img/amex.png',
                    'discover': 'img/discover.png',
                    'diners': 'img/diners-club.png',
                    'jcb': 'img/jcb.png',
                    'unknown': 'img/credit-card.png',
                };

                function setBrandIcon(brand = 'unknown') {
                    var brandIconElement = document.getElementById('brand-image');
                    var pfClass = 'img/credit-card.png';
                    if (brand in cardBrandToPfClass) {
                        pfClass = cardBrandToPfClass[brand];
                    }
                    brandIconElement.style.backgroundImage = 'url(' + pfClass + ')';
                }

                cardNumberElement.on('change', function(event) {
                    if (event.complete) {
                        document.getElementById('submit_button').disabled = false;
                    } else {
                        document.getElementById('submit_button').disabled = true;
                    }
                    if (event.brand) {
                        setBrandIcon(event.brand);
                    }
                });
                setBrandIcon();
                $scope.form = document.getElementById('payment-form');
                $scope.form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    var options = {
                        address_zip: document.getElementById('card-postalcode-element').value,
                    };
                    stripe.createToken(cardNumberElement, options).then(setOutcome);
                });
                // new end

                // for mobile
                function setBrandIconMobile(brand = 'unknown') {
                    var brandIconElement = document.getElementById('brand-image-mobile');
                    var pfClass = 'img/credit-card.png';
                    if (brand in cardBrandToPfClassMobile) {
                        pfClass = cardBrandToPfClassMobile[brand];
                    }
                    brandIconElement.style.backgroundImage = 'url(' + pfClass + ')';
                }

                function setOutcomeMobile(result) {
                    var errorElement = document.querySelector('.error');
                    errorElement.classList.remove('visible');
                    if (result.token) {
                        $scope.buyTicket(result.token.id);
                    } else if (result.error) {
                        errorElement.textContent = result.error.message;
                        errorElement.classList.add('visible');
                    }
                }

                let card_element_2 = document.getElementById('card-element-2');

                if (card_element_2 != null) {
                    let stripe2 = Stripe(config.STRIPE_PUBLISH_KEY);

                    let elements2 = stripe2.elements();

                    var cardNumberElementMobile = elements2.create('cardNumber', {
                        style: style
                    });
                    cardNumberElementMobile.mount('#card-number-element-mobile');

                    var cardExpiryElementMobile = elements2.create('cardExpiry', {
                        style: style
                    });
                    cardExpiryElementMobile.mount('#card-expiry-element-mobile');

                    var cardCvcElementMobile = elements2.create('cardCvc', {
                        style: style
                    });
                    cardCvcElementMobile.mount('#card-cvc-element-mobile');

                    var postalCodeElementMobile = elements2.create('postalCode', {
                        style: style
                    });
                    postalCodeElementMobile.mount('#card-postalcode-element-mobile');

                    document.getElementById('submit_button2').disabled = true;



                    var cardBrandToPfClassMobile = {
                        'visa': 'img/visa.png',
                        'mastercard': 'img/mastercard.png',
                        'amex': 'img/amex.png',
                        'discover': 'img/discover.png',
                        'diners': 'img/diners-club.png',
                        'jcb': 'img/jcb.png',
                        'unknown': 'img/credit-card.png',
                    };



                    cardNumberElementMobile.on('change', function(event) {
                        if (event.complete) {
                            document.getElementById('submit_button2').disabled = false;
                        } else {
                            document.getElementById('submit_button2').disabled = true;
                        }
                        if (event.brand) {
                            setBrandIconMobile(event.brand);
                        }
                    });
                    setBrandIconMobile();
                    $scope.form2 = document.getElementById('payment-form-2');
                    $scope.form2.addEventListener('submit', function(event) {
                        event.preventDefault();
                        var options = {
                            address_zip: document.getElementById('card-postalcode-element-mobile').value,
                        };
                        stripe2.createToken(cardNumberElementMobile, options).then(setOutcomeMobile);
                    });

                }

                if ($route.current.params && 'ev' in $route.current.params && $route.current.params.ev &&
                    'selection' in $route.current.params && $route.current.params.selection) {
                    $scope.eventID = $route.current.params.ev;
                    let data = {};
                    if ($scope.invitedId) {
                        let info = {
                            invite_id: $scope.invitedId
                        };
                        data = info;
                    }
                    if ($scope.passwordToken) {
                        let info = {
                            passwordToken: $scope.passwordToken
                        };
                        data = info;
                    }
                    eventsService.getEventDetails($route.current.params.ev, data)
                        .then((response => {
                            if (response.status == 200) {
                                let data = response.data;
                                if (Object.keys(data.data.layout_details).length > 0) {
                                    $scope.layoutDetails = data.data.layout_details;
                                } else {
                                    $scope.layoutDetails = false;
                                }
                                if (data.success) {
                                    $scope.loading = true;
                                    $scope.loadingInit = true;
                                    $scope.event = data.data;
                                    $scope.loadingMessage = $scope.event.event_type === 'free' ? $scope.loadingFreeMessage : $scope.loadingMessage;
                                    $scope.event.tickets = [];
                                    $scope.getTicketBillingInformation();
                                    $scope.loading = false;
                                }
                            } else {
                                $scope.eventID = null;
                                Utils.showError($scope, "No such event exists");
                                $scope.loading = false;
                            }
                        })).catch(err => {
                            console.log(err);
                        });
                } else {
                    Utils.showError($scope, "Billing Data Not Available");
                }
            };

            $scope.buyFreeTicket = function() {
                let ticketDetils = [];
                $scope.loading = true;
                $scope.loadingMessage = "Registering Your Ticket...";
                angular.forEach($scope.event.tickets, function(value, key) {
                    let ticket = {
                        "ticket_qty": value.reserved,
                        "ticket_id": value.ticket_id
                    };
                    ticketDetils.push(ticket);
                });
                $scope.isMobile = window.matchMedia("only screen and (max-width: 1024px)");
                let deviceType = 1;
                if ($scope.isMobile.matches) {
                    deviceType = 2;
                }
                let ticketData = {
                    "token": "",
                    "card_id": "",
                    "event_id": $scope.eventID,
                    "ticketDetails": ticketDetils,
                    "device_type": deviceType
                };

                let authToken = '';

                if ($scope.widget) {
                    authToken = authService.get('widget_token');
                } else {
                    authToken = authService.get('token');
                }

                if (typeof authToken == 'undefined') {
                    authToken = $scope.widget_token;
                }


                stripeService.buyTicket(ticketData, authToken).then((response) => {
                    if (response.success) {
                        $scope.loading = false;
                        $scope.loadingInit = false;
                        if ($scope.widget) {
                            let notify = {
                                type: 'success',
                                title: 'Success',
                                content: "You have successfully purchase ticket. Please check you email for more details.",
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            location.href = '/widget/payment_success?email=' + $scope.user_email;
                        } else {
                            let notify = {
                                type: 'success',
                                title: 'Success',
                                content: "User is registered successfully.",
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            location.href = '/tickets';
                        }

                    } else {
                        $scope.loading = false;
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: response.message,
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                    }
                }).catch(err => {
                    $scope.loading = false;
                    let content = "Sorry something went wrong. Please try later.";
                    if (err.data && 'message' in err.data) {
                        content = err.data.message;
                    }
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: content,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                });
            };

            $scope.buyTicket = function(tonen) {
                let ticketDetils = [];
                $scope.loading = true;
                $scope.loadingMessage = "Registering Your Ticket...";
                angular.forEach($scope.price_calculation, function(value, key) {
                    let ticket = {
                        "ticket_id": value.ticket_id
                    };

                    if ('_tier_id' in value && value._tier_id > 0) {
                        ticket.tier_id = value._tier_id;
                    }

                    if ('seats' in value) {
                        ticket.seats = value.seats;
                    }

                    if ('ticket_type' in value && value.ticket_type == 'donation') {
                        ticket.amount = value.unit_price;
                    } else {
                        ticket.ticket_qty = value.qty;
                    }

                    ticketDetils.push(ticket);
                });
                $scope.isMobile = window.matchMedia("only screen and (max-width: 1024px)");
                let deviceType = 1;
                if ($scope.isMobile.matches) {
                    deviceType = 2;
                }
                let ticketData = {
                    "token": tonen,
                    "card_id": "",
                    "event_id": $scope.eventID,
                    "ticketDetails": ticketDetils,
                    "device_type": deviceType
                };

                if (Object.keys($scope.layoutDetails).length > 0) {
                    ticketData.layout_id = $scope.layoutDetails.layout_id;
                }

                let authToken = '';

                if ($scope.widget) {
                    authToken = authService.get('widget_token');
                } else {
                    authToken = authService.get('token');
                }

                if (typeof authToken == 'undefined') {
                    authToken = $scope.widget_token;
                }

                stripeService.buyTicket(ticketData, authToken).then((response) => {
                    if (response.success) {
                        // $scope.loading = false;
                        // $scope.loadingInit = false;

                        if ($scope.widget) {
                            let notify = {
                                type: 'success',
                                title: 'Success',
                                content: "You have successfully purchase ticket. Please check you email for more details.",
                                timeout: 5000 //time in ms
                            };
                            location.href = '/widget/payment_success?email=' + $scope.user_email;
                            $scope.$emit('notify', notify);
                        } else {
                            let notify = {
                                type: 'success',
                                title: 'Success',
                                content: response.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            location.href = '/tickets';
                        }

                    } else {
                        $scope.loading = false;
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: response.message,
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                    }
                }).catch(err => {
                    $scope.loading = false;
                    let content = "Sorry something went wrong. Please try later.";
                    if (err.data && 'message' in err.data) {
                        content = err.data.message;
                    }
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: content,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                });
            };

            $scope.isObjectEmpty = function(card) {
                return Object.keys(card).length === 0;
            };

            $scope.$watch('counter', function() {
                if ($scope.counter == 0) {
                    let event_name = $scope.event.event_name.replace(/\s+/g, '-').toLowerCase();
                    let event_id = $scope.event.event_id;
                    let eventdetailsPageLink = $scope.getEventDetailsPageLink();
                    $window.location.href = eventdetailsPageLink;
                }
            });
            $scope.init();
        }
    ]);