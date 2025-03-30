angular.module('PromoApp')
    .controller('SignupController', ['$scope', '$parse', '$log', 'eventsService', '$location', 'authService', 'userService', 'apiService', '$rootScope', 'awsService', 'config', 'locationService', 'Utils', '$window', '$route', '$interval', '$uibModal', 'deviceDetector', function($scope, $parse, $log, eventsService, $location, authService, userService, apiService, $rootScope, awsService, config, locationService, Utils, $window, $route, $interval, $uibModal, deviceDetector) {

        $scope.showOTPForm = false;
        $scope.counter = 30; // in second 
        $scope.web_site_link = document.location.origin;
        $scope.signUp = () => {
            $scope.loading = true;

            let nameArr = $scope.full_name.split(" ");
            let first_name = '';
            let last_name = '';
            if (typeof nameArr[0] != 'undefined') {
                first_name = nameArr[0];
            }

            if (typeof nameArr[1] != 'undefined') {
                last_name = nameArr[1];
            }

            var params = {
                'email': $scope.Email,
                'first_name': first_name,
                'last_name': last_name,
                'event_id': $scope.eventID,
            };

            apiService.widgetUserRegister(params).then((response) => {
                    if (response.status == 200) {
                        let data = response.data;
                        if (data.success) {
                            $scope.counter = 120; // in second 
                            let notify = {
                                type: 'success',
                                title: 'Success',
                                content: data.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            Utils.applyChanges($scope);
                            $scope.showOTPForm = true;
                            $interval(
                                function() {
                                    if ($scope.counter > 0) {
                                        $scope.counter--;
                                    }
                                }, 1000);
                        } else {
                            let notify = {
                                type: 'error',
                                title: 'OOPS!!',
                                content: data.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            Utils.applyChanges($scope);
                            $scope.loading = false;
                        }

                    } else {
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: "Sorry something went wrong. Please try later.",
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        Utils.applyChanges($scope);
                        $scope.loading = false;
                    }
                })
                .catch(err => {
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: "Sorry something went wrong. Please try later.",
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    Utils.applyChanges($scope);
                    $scope.loading = false;
                }).finally(() => {
                    $scope.loading = false;
                });
        };


        $scope.optProcessSignupPast = (e) => {
            let input_value = e.originalEvent.clipboardData.getData('text');
            let input_value_arr = input_value.split("");

            if (input_value_arr.length == 6) {
                let i;
                for (i = 0; i < input_value_arr.length; i++) {
                    let index = i + 1;
                    let model_name = "otp_" + index;
                    // Get the model
                    var model = $parse(model_name);

                    // Assigns a value to it
                    model.assign($scope, input_value_arr[i]);
                    $scope.otp = parseInt(input_value);
                }
            }

        };

        $scope.optProcessSignup = () => {

            var num1 = document.getElementById("otp_1");
            var num2 = document.getElementById("otp_2");
            var num3 = document.getElementById("otp_3");
            var num4 = document.getElementById("otp_4");
            var num5 = document.getElementById("otp_5");
            var num6 = document.getElementById("otp_6");

            $scope.otp = parseInt(num1.value + num2.value + num3.value + num4.value + num5.value + num6.value);



            var container = document.getElementsByClassName("input-code")[0];
            container.onkeyup = function(e) {
                var target = e.target;
                var maxLength = parseInt(target.attributes.maxlength.value, 10);
                var myLength = target.value.length;
                if (myLength >= maxLength) {
                    var next = $(e.target);
                    while (next != null) {
                        next = next.next();
                        if (next == null)
                            break;
                        if (typeof next.prop("tagName") == 'undefined')
                            break;
                        if (next.prop("tagName").toLowerCase() == "input") {
                            next.focus();
                            break;
                        }
                    }
                } else if (myLength < maxLength) {
                    var prev = $(e.target);
                    while (prev != null) {
                        prev = prev.prev();
                        if (prev == null)
                            break;
                        if (typeof prev.prop("tagName") == 'undefined')
                            break;
                        if (prev.prop("tagName").toLowerCase() == "input") {
                            prev.focus();
                            break;
                        }
                    }
                }
            };
        };


        $scope.optProcess = () => {

            var num1 = document.getElementById("otp_1");
            var num2 = document.getElementById("otp_2");
            var num3 = document.getElementById("otp_3");
            var num4 = document.getElementById("otp_4");
            var num5 = document.getElementById("otp_5");
            var num6 = document.getElementById("otp_6");

            $scope.otp = parseInt(num1.value + num2.value + num3.value + num4.value + num5.value + num6.value);



            var container = document.getElementsByClassName("input-code")[0];
            container.onkeyup = function(e) {
                var target = e.target;

                var maxLength = parseInt(target.attributes.maxlength.value, 10);
                var myLength = target.value.length;
                if (myLength >= maxLength) {
                    var next = target;
                    //while (next = next.nextElementSibling) {
                    while (next != null) {
                        next = next.nextElementSibling;
                        if (next == null)
                            break;
                        if (next.tagName.toLowerCase() == "input") {
                            next.focus();
                            break;
                        }
                    }
                } else if (myLength < maxLength) {
                    var prev = target;
                    //while(prev = prev.previousElementSibling){
                    while (prev != null) {
                        prev = prev.previousElementSibling;
                        if (prev == null)
                            break;

                        if (prev.tagName.toLowerCase() == "input") {
                            prev.focus();
                            break;
                        }
                    }
                }
            };
        };

        $scope.verifyOTP = (otp) => {
            var num1 = document.getElementById("otp_1");
            var num2 = document.getElementById("otp_2");
            var num3 = document.getElementById("otp_3");
            var num4 = document.getElementById("otp_4");
            var num5 = document.getElementById("otp_5");
            var num6 = document.getElementById("otp_6");

            otp = num1.value + '' + num2.value + '' + num3.value + '' + num4.value + '' + num5.value + '' + num6.value;

            $scope.loading = true;

            let nameArr = $scope.full_name.split(" ");
            let first_name = '';
            let last_name = '';
            if (typeof nameArr[0] != 'undefined') {
                first_name = nameArr[0];
            }

            if (typeof nameArr[1] != 'undefined') {
                last_name = nameArr[1];
            }

            otp = otp.toString();
            let otp_verify_data = {
                "email": $scope.Email,
                "otp": otp,
                "first_name": first_name,
                "last_name": last_name,
                "city": $scope.city,
                'event_id': $scope.eventID,
            };


            apiService.widgetUserVerify(otp_verify_data).then((response) => {

                if (response.status == 200) {
                    let data = response.data;
                    $scope.loading = false;
                    if (data.success) {
                        $scope.counter = 120;
                        let notify = {
                            type: 'success',
                            title: 'Success',
                            content: 'Account verified successfully!',
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        return data;
                    } else {

                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: data.message,
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        Utils.applyChanges($scope);
                        $scope.loading = false;
                    }
                } else {

                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: "Sorry something went wrong. Please try later.",
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    Utils.applyChanges($scope);
                    $scope.loading = false;

                }
            }).then(function(data) {
                let widget_token = data.data.token;
                authService.put('widget_token', widget_token);
                let user_info = { email: $scope.Email };
                authService.putWithExpiry('widget_user', JSON.stringify(user_info));

                location.href = '/widget/checkout?ev=' + $scope.eventID + '&selection=' + $route.current.params.selection + '&widget_token=' + widget_token + '&email=' + $scope.Email;

            }).catch(err => {
                let notify = {
                    type: 'error',
                    title: 'OOPS!!',
                    content: "Sorry something went wrong. Please try later.",
                    timeout: 5000 //time in ms
                };
                $scope.$emit('notify', notify);
                Utils.applyChanges($scope);
                $scope.loading = false;
            }).finally((err) => {

            });
        };

        $scope.removeWidgetSession = () => {
            authService.remove('widget_token');
            authService.remove('widget_user');
        };

        $scope.locationAccessedModal = function() {
            let eventModelScope = $scope.$new(false, $scope);
            $uibModal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: '../../partials/locationAccessedModal.html',
                openedClass: 'pa-create-event-modal add-link-modal location-access',
                scope: eventModelScope,
                size: 'md'
            });
        };

        $scope.cancel = function(reason) {
            this.$dismiss('close');
            sendLocationPermission('true');
        };

        $scope.getCurrentPos = () => {
            if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1) {
                try {
                    navigator.permissions.query({
                        name: 'geolocation'
                    }).then(function(result) {
                        if (result.state == 'granted') {
                            $scope.locationPlaceholder = 'Getting Location..';
                            $scope.disableLocation = true;
                            locationService.getUserLocation(true).then((locationResponse) => {
                                if (locationResponse) {
                                    $scope.locationPlaceholder = 'Search Location';
                                    $scope.disableLocation = false;
                                    if ('city' in locationResponse) {
                                        $scope.city = locationResponse.city;
                                    } else if ('address' in locationResponse) {
                                        $scope.city = locationResponse.address;
                                    }

                                    $scope.city_lat = locationResponse.lat;
                                    $scope.city_long = locationResponse.lng;
                                    Utils.applyChanges($scope);
                                } else {
                                    $scope.locationPlaceholder = 'Search Location';
                                    $scope.locationAccessedModal();
                                }
                            }).catch((err) => {
                                $scope.locationPlaceholder = 'Search Location';
                                $scope.disableLocation = false;
                                Utils.applyChanges($scope);
                            });
                        } else if (result.state == 'prompt') {
                            navigator.geolocation.getCurrentPosition(function(position) {
                                lat0 = position.coords.latitude;
                                long0 = position.coords.longitude;
                                $window.location.reload();
                            });
                        } else if (result.state == 'denied') {
                            let notify = {
                                type: 'error',
                                title: 'ERROR',
                                content: "Please allow location access.",
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            return false;
                        }
                    });
                } catch (err) {
                    $scope.locationPlaceholder = 'Getting Location..';
                    $scope.disableLocation = true;
                    locationService.getUserLocation(true).then((locationResponse) => {
                        if (locationResponse) {
                            $scope.locationPlaceholder = 'Search Location';
                            $scope.disableLocation = false;
                            if ('city' in locationResponse) {
                                $scope.city = locationResponse.city;
                            } else if ('address' in locationResponse) {
                                $scope.city = locationResponse.address;
                            }

                            $scope.city_lat = locationResponse.lat;
                            $scope.city_long = locationResponse.lng;
                            Utils.applyChanges($scope);
                        } else {
                            $scope.locationPlaceholder = 'Search Location';
                            $scope.locationAccessedModal();
                        }
                    }).catch((err) => {
                        $scope.locationPlaceholder = 'Search Location';
                        $scope.disableLocation = false;
                        Utils.applyChanges($scope);
                    });
                }
            } else if (deviceDetector.device == 'iphone' || deviceDetector.device == 'ipad') {
                $scope.locationPlaceholder = 'Getting Location..';
                $scope.disableLocation = true;
                locationService.getUserLocation(true).then((locationResponse) => {
                    if (locationResponse) {
                        $scope.locationPlaceholder = 'Search Location';
                        $scope.disableLocation = false;
                        if ('city' in locationResponse) {
                            $scope.city = locationResponse.city;
                        } else if ('address' in locationResponse) {
                            $scope.city = locationResponse.address;
                        }

                        $scope.city_lat = locationResponse.lat;
                        $scope.city_long = locationResponse.lng;
                        Utils.applyChanges($scope);
                    } else {
                        $scope.locationPlaceholder = 'Search Location';
                        $scope.locationAccessedModal();
                    }
                }).catch((err) => {
                    $scope.locationPlaceholder = 'Search Location';
                    $scope.disableLocation = false;
                    Utils.applyChanges($scope);
                });
            } else if (navigator.userAgent.toLowerCase().indexOf('safari') > -1) {
                Notification.requestPermission(function(result) {
                    if (result == 'granted') {
                        $scope.locationPlaceholder = 'Getting Location..';
                        $scope.disableLocation = true;
                        locationService.getUserLocation(true).then((locationResponse) => {
                            if (locationResponse) {
                                $scope.locationPlaceholder = 'Search Location';
                                $scope.disableLocation = false;
                                if ('city' in locationResponse) {
                                    $scope.city = locationResponse.city;
                                } else if ('address' in locationResponse) {
                                    $scope.city = locationResponse.address;
                                }

                                $scope.city_lat = locationResponse.lat;
                                $scope.city_long = locationResponse.lng;
                                Utils.applyChanges($scope);
                            } else {
                                $scope.locationPlaceholder = 'Search Location';
                                $scope.locationAccessedModal();
                            }
                        }).catch((err) => {
                            $scope.locationPlaceholder = 'Search Location';
                            $scope.disableLocation = false;
                            Utils.applyChanges($scope);
                        });
                    } else if (result == 'prompt') {
                        navigator.geolocation.getCurrentPosition(function(position) {
                            lat0 = position.coords.latitude;
                            long0 = position.coords.longitude;
                            $window.location.reload();
                        });
                    } else if (result == 'denied') {
                        let notify = {
                            type: 'error',
                            title: 'ERROR',
                            content: "Please allow location access.",
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        return false;
                    }
                });
            } else {
                $scope.locationPlaceholder = 'Getting Location..';
                $scope.disableLocation = true;
                locationService.getUserLocation(true).then((locationResponse) => {
                    if (locationResponse) {
                        $scope.locationPlaceholder = 'Search Location';
                        $scope.disableLocation = false;
                        if ('city' in locationResponse) {
                            $scope.city = locationResponse.city;
                        } else if ('address' in locationResponse) {
                            $scope.city = locationResponse.address;
                        }

                        $scope.city_lat = locationResponse.lat;
                        $scope.city_long = locationResponse.lng;
                        Utils.applyChanges($scope);
                    } else {
                        $scope.locationPlaceholder = 'Search Location';
                        $scope.locationAccessedModal();
                    }
                }).catch((err) => {
                    $scope.locationPlaceholder = 'Search Location';
                    $scope.disableLocation = false;
                    Utils.applyChanges($scope);
                });
            }
        };

        $scope.cancel = function() {
            this.$dismiss('close');
        };

        const readSelectedSeatFileInLocalStorage = () => {
            let user_selected_seat = $window.localStorage.getItem("user_selected_seat");
            if (user_selected_seat) {
                return user_selected_seat;
            }
            return 'https://dummyimage.com/600x400/000/fff';
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
                    //$scope.checkoutDetails.price += (ticket.reserved * ticket.price);
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

        $scope.init = function() {


            if ($route.current.params && 'ev' in $route.current.params && $route.current.params.ev &&
                'selection' in $route.current.params && $route.current.params.selection) {
                $scope.eventID = $route.current.params.ev;
                eventsService.getEventDetails($route.current.params.ev)
                    .then((response => {
                        if (response.status == 200) {
                            let data = response.data;

                            if (Object.keys(data.data.layout_details).length > 0) {
                                $scope.layoutDetails = data.data.layout_details;
                            } else {
                                $scope.layoutDetails = false;
                            }
                            if (data.success) {
                                $scope.event = data.data;
                                $scope.event.tickets = [];
                                $scope.getTicketBillingInformation();
                            }
                        } else {
                            $scope.eventID = null;
                            Utils.showError($scope, "No such event exists");
                        }
                        $scope.loading = false;
                    })).catch(err => {
                        console.log(err);
                    });
            } else {
                $scope.user_email = $route.current.params.email;
            }
        };

        $scope.init();
    }]);