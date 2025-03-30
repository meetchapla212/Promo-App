angular.module('PromoApp').controller('VerifyEmailController', ['$scope', '$location', 'apiService', 'authService', function($scope, $location, apiService, authService) {

    $scope.goToPage = function(page) {
        location.href = page;
    };

    $scope.applyChanges = function() {
        if (!$scope.$$phase) {
            $scope.$digest();
        }
    };

    $scope.init = function() {
        let queryStringObject = $location.search();
        $scope.user = authService.getUser();
        if ($location.path() == '/verify-email') {
            if (queryStringObject && 'token' in queryStringObject && 'email' in queryStringObject && queryStringObject.token != '') {
                $scope.loading = true;
                var params = ({ token: queryStringObject.token, email: queryStringObject.email });
                apiService.validateEmail(params).then((response) => {
                    if (response.status == 200) {
                        let data = response.data;
                        if (data.success) {
                            let notify = {
                                type: 'success',
                                title: 'Success',
                                content: data.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            if ($scope.user) {
                                $scope.goToPage("/");
                            } else {
                                $scope.goToPage("/login");
                            }
                        } else {
                            let notify = {
                                type: 'error',
                                title: 'OOPS!!',
                                content: data.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            if ($scope.user) {
                                $scope.goToPage("/");
                            } else {
                                $scope.goToPage("/login");
                            }
                        }

                    } else {
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: "Sorry something went wrong. Please try later.",
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        if ($scope.user) {
                            $scope.goToPage("/");
                        } else {
                            $scope.goToPage("/login");
                        }
                    }
                }).catch(err => {
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: "We are experiencing technical problems and cannot reset your password right now. Please, try again later.",
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                }).finally(() => {
                    $scope.loading = false;
                    if ($scope.user) {
                        $scope.goToPage("/");
                    } else {
                        $scope.goToPage("/login");
                    }
                });
            } else {
                if ($scope.user) {
                    $scope.goToPage("/");
                } else {
                    $scope.goToPage("/login");
                }
            }
        }
    };

    $scope.init();

}]);