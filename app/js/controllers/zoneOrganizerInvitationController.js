angular.module('PromoApp')
    .controller('zoneOrganiserInvitationController', ['$scope', 'apiService', '$route',
        function($scope, apiService, $route) {

            $scope.init = function() {
                if ($route.current.params && 'token' in $route.current.params && 'action' in $route.current.params) {
                    let data = {
                        "token": $route.current.params.token,
                        "action": $route.current.params.action
                    };

                    apiService.inviteOrganizerZoneProcess(data).then((response) => {
                        if (response.data.success === true) {
                            let notify = {
                                type: 'success',
                                title: 'Success',
                                content: response.data.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            setTimeout(function() {
                                window.location.href = '/';
                            }, 1000);
                        } else {
                            let notify = {
                                type: 'error',
                                title: 'Opps!!',
                                content: response.data.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                        }
                    }).catch(err => {
                        let content = err.data.message;
                        let notify = {
                            type: 'error',
                            title: 'Opps!!',
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