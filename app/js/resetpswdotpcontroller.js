angular.module('PromoApp')

.controller('ResetPswdOTPController', ['$scope', '$log', '$location', 'apiService', 'qbService', 'authService', function($scope, $log, $location, apiService, qbService, authService) {


    $scope.goToPage = function(page) {
        location.href = page;
    };
    $scope.inputType = 'password';
    $scope.inputTypeCon = 'password';

    $scope.hideShowPassword = function() {
        if ($scope.inputType == 'password')
            $scope.inputType = 'text';
        else
            $scope.inputType = 'password';
    };

    $scope.hideShowPasswordCon = function() {
        if ($scope.inputTypeCon == 'password')
            $scope.inputTypeCon = 'text';
        else
            $scope.inputTypeCon = 'password';
    };


    $scope.applyChanges = function() {
        if (!$scope.$$phase) {
            $scope.$digest();
        }
    };


    $scope.resetPswd = () => {
        $scope.loading = true;

        if (!$scope.newPassword) {
            let notify = {
                type: 'error',
                title: 'OOPS!!',
                content: "Please enter your new password",
                timeout: 5000 //time in ms
            };
            $scope.$emit('notify', notify);
            $scope.loading = false;
        }

        let otp_verification_data = JSON.parse(authService.get('otp_verification_data'));
        let received_otp = authService.get('received_otp');

        if (otp_verification_data.email) {
            var params = { 'newPassword': $scope.newPassword };
            let token = authService.get('resent_Token');

            apiService.resetPassword(params, token).then((response) => {
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
                            location.href = "/login";
                        } else {
                            let notify = {
                                type: 'error',
                                title: 'OOPS!!',
                                content: data.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            Utils.applyChanges($scope);
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
                    }
                })
                .catch(err => {
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: "We are experiencing technical problems and cannot reset your password right now. Please, try again later.",
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                }).finally(() => {
                    $scope.loading = false;
                });
        } else {
            let params = {
                "mobile_number": otp_verification_data.mobile_number,
                "country_code": otp_verification_data.country_code,
                "new_password": $scope.newPassword,
                "otp": received_otp
            };


            apiService.resetPasswordPhone(params).then((response) => {
                    if (response.status == 200) {
                        console.log(1);
                        let data = response.data;
                        if (data.success) {
                            console.log(2);
                            let notify = {
                                type: 'success',
                                title: 'Success',
                                content: data.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            location.href = "/login";
                        } else {
                            console.log(3);
                            let notify = {
                                type: 'error',
                                title: 'OOPS!!',
                                content: data.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            Utils.applyChanges($scope);
                        }

                    } else {
                        console.log(4);
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: "Sorry something went wrong. Please try later.",
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        Utils.applyChanges($scope);
                    }
                })
                .catch(err => {
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: "We are experiencing technical problems and cannot reset your password right now. Please, try again later.",
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                }).finally(() => {
                    $scope.loading = false;
                });
        }
    };

}]);