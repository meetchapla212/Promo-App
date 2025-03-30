angular.module('PromoApp')
    .controller('invitationProcessController', ['$scope', 'config', '$uibModal', 'authService', 'eventsService', 'Utils', '$route',
        function($scope, config, $uibModal, authService, eventsService, Utils, $route) {

            $scope.goToPage = function(page) {
                location.href = page;
            };

            $scope.init = function() {

                if ($route.current.params && 'token' in $route.current.params && 'action' in $route.current.params) {

                    let data = {
                        "token": $route.current.params.token,
                        "action": $route.current.params.action
                    };

                    eventsService.eventAdministratorRequest(data).then((response) => {
                        if (response.success === true) {
                            if ($route.current.params.action == "accept" && response.signup === true) {
                                window.location.href = '/signup?admin_verification_token=' + response.token;
                            } else {
                                window.location.href = '/admin_request_reject';
                            }
                        } else {
                            let notify = {
                                type: 'error',
                                title: 'Oops!!',
                                content: response.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                        }
                    }).catch(err => {
                        let content = err.message;
                        let notify = {
                            type: 'error',
                            title: 'Oops!!',
                            content: content,
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                    });

                } else {
                    window.location.href = '/';
                }
            };

            $scope.init();

        }
    ]);