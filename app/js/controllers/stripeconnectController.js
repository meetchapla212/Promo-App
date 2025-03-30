angular.module('PromoApp')
    .controller('StripeconnectController', ['$scope', 'config', '$uibModal', 'authService', 'stripeService', 'userService', 'Utils', '$route',
        function ($scope, config, $uibModal, authService, stripeService, userService, Utils, $route) {
            $scope.event_id = '';
            $scope.strip_connect_success = false;
            $scope.stripe_public_key = config.STRIPE_PUBLISH_KEY;
            $scope.user = [];

            $scope.data = {
                group1: 'Individual',
            };

            $scope.data = {
                group2: 'Savings',
            };

            $scope.removeItem = function () {
                $scope.radioData.pop();
            };

            $scope.goToPage = function (page) {
                location.href = page;
            };



            $scope.initOld = function () {

                if ($route.current.params && 'scope' in $route.current.params && 'code' in $route.current.params) {

                    let code = $route.current.params.code;
                    $scope.loading = true;
                    stripeService.connectStripeAccount(code).then((response) => {
                        if (response.success) {


                            if ('data' in response) {
                                $scope.strip_connect_success = true;
                                $scope.user = authService.getUser();
                                $scope.user.stripe_account_id = response.data;
                                authService.setUser($scope.user);
                            }

                            let notify = {
                                type: 'success',
                                title: 'Success',
                                content: response.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            authService.putWithExpiry('event_action_id', $scope.event_id);
                            if ('state' in $route.current.params) {
                                $scope.event_id = $route.current.params.state;
                                window.location.href = '/events/' + $scope.event_id + '/edit#3';
                            } else {
                                window.location.href = '/payout_methods';
                            }


                        } else {
                            let notify = {
                                type: 'error',
                                title: 'OOPS!!',
                                content: response.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                        }

                    }).catch(err => {

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
                    }).finally(() => {
                        $scope.loading = false;
                    });

                } else {

                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: "Sorry something went wrong. Please try later.",
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                }
            };


            $scope.init = function () {

                if ($route.current.params && 'success' in $route.current.params) {

                    if ($route.current.params.success == "true") {
                        $scope.user = authService.getUser();

                        userService.getUserProfile($scope.user.user_id).then((response) => {
                            if (response && 'data' in response) {
                                let user = response.data.data;
                                $scope.user.stripe_account_id = user.stripe_account_id;
                                $scope.user.stripe_country = user.stripe_country;
                                $scope.user.is_verified = user.is_verified;
                                $scope.user.charges_enabled = user.charges_enabled;
                                $scope.user.payouts_enabled = user.payouts_enabled;
                                authService.setUser($scope.user);
                            }
                            let notify = {
                                type: 'success',
                                title: 'Success',
                                content: "Your request sent successfully!",
                                timeout: 5000 //time in ms
                            };

                            $scope.$emit('notify', notify);
                            let redirecUrl = '';
                            if ('eventId' in $route.current.params) {
                                window.location.href = '/events/' + $route.current.params.eventId + '/edit#3';
                            } else {
                                window.location.href = '/payout_methods';
                            }
                        });




                    } else {
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: "Sorry something went wrong. Please try later.",
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);

                        if ('eventId' in $route.current.params) {
                            window.location.href = '/events/' + $route.current.params.eventId + '/edit#3';
                        } else {
                            window.location.href = '/payout_methods';
                        }
                    }
                }
            };

            $scope.init();

        }
    ]);