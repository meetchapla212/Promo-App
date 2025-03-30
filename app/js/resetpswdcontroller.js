angular.module('PromoApp')

.controller('ResetPswdController', ['$scope', '$log', '$location', 'apiService', 'qbService', 'authService', '$window', function($scope, $log, $location, apiService, qbService, authService, $window) {

    $scope.resetPwdToken = '';
    $scope.reset_type = '';
    $scope.inputType = 'password';
    $scope.inputTypeCon = 'password';
    $scope.tabSection = true;
    $scope.countryCode = $window.localStorage.getItem("countryCode") ? $window.localStorage.getItem("countryCode") : "+1";
    $scope.validateMobile = true;
    $scope.mobile_number = parseInt($window.localStorage.getItem("forgotMobile"));
    $scope.Email = $window.localStorage.getItem("forgotEmail");

    $scope.goToPage = function(page) {
        $window.location.href = page;
    };

    $scope.radioData = [
        { label: 'Email Address', value: 'email', checked: $scope.mobile_number ? false : true },
        { label: 'Mobile Number', value: 'mobile', checked: $scope.mobile_number ? true : false },
    ];

    $scope.forgetPswdEmail = (eValue, form) => {
        $scope.loading = true;
        if (!eValue) {
            form.email.$invalid = true;
            $scope.loading = false;
            return false;
        }
        let isError = false;
        if (!isError) {
            var params = { 'email': eValue, "verify_type": "forgotpassword" };
            apiService.forgotpassword(params).then((response) => {
                    if (response.status == 200) {
                        authService.put('otp_verification_data', JSON.stringify(params));
                        let data = response.data;
                        if (data.success) {
                            let notify = {
                                type: 'success',
                                title: 'Success',
                                content: data.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            $window.location.href = "/otp-verify";
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
                .catch(err => {}).finally(() => {
                    $scope.loading = false;
                });
        } else {
            $scope.$emit('notify', notify);
            $scope.loading = false;
            $scope.applyChanges();
        }
    };

    $scope.signupBlur = function(value) {
        let mobileNumberValidation = /^\+?\d{10}$/;
        let mobileNumber = /^\+?\d{10}$/;
        if (value !== '') {
            if (mobileNumber.test(value)) {
                if (mobileNumberValidation.test(value) == false) {
                    $scope.mobileNumberError = true;
                    $scope.validateMobile = true;
                } else {
                    $scope.mobileNumberError = false;
                    $scope.validateMobile = false;
                }
            } else {
                $scope.validateMobile = false;
                $scope.mobileNumberError = false;
            }
        } else {
            $scope.mobileNumberError = false;
            $scope.validateMobile = true;
        }
    };

    $scope.forgetPswdMobile = (mobileNumber, form) => {
        $scope.loading = true;
        if (!mobileNumber) {
            form.mobileNumber.$invalid = true;
            $scope.loading = false;
            return false;
        }
        $scope.countryCode = $('#countryCodeValue').text();
        let otp_verify_data = {
            "mobile_number": (mobileNumber).toString(),
            "country_code": ($scope.countryCode).toString().replace('+', ''),
            "verify_type": "forgotpassword",
        };

        apiService.resendOTP(otp_verify_data).then((response) => {
            if (response.status == 200) {
                let data = response.data;
                if (data.success) {
                    authService.put('otp_verification_data', JSON.stringify(otp_verify_data));
                    let notify = {
                        type: 'success',
                        title: 'Success',
                        content: data.message,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    $window.location.href = "/otp-verify";

                } else {
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: data.message,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                }
            } else {
                $scope.loading = false;
                let notify = {
                    type: 'error',
                    title: 'OOPS!!',
                    content: "Sorry something went wrong. Please try later.",
                    timeout: 5000 //time in ms
                };
                $scope.$emit('notify', notify);
            }
        }).catch(err => {
            let notify = {
                type: 'error',
                title: 'OOPS!!',
                content: "Sorry something went wrong. Please try later.",
                timeout: 5000 //time in ms
            };
            $scope.$emit('notify', notify);
        }).finally((err) => {
            $scope.loading = false;
        });
    };

    $scope.tabChange = (value) => {
        if (value == 'mobile') {
            $scope.tabSection = false;
        } else {
            $scope.tabSection = true;
        }
    };

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

    //code for hundel resetpassword link
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


        if ($scope.resetPwdToken == '') {
            let notify = {
                type: 'error',
                title: 'OOPS!!',
                content: "We are experiencing technical problems and cannot reset your password right now. Please, try again later.",
                timeout: 5000 //time in ms
            };
            $scope.$emit('notify', notify);
            $scope.loading = false;
        }


        var params = { 'newPassword': $scope.newPassword };
        let token = $scope.resetPwdToken;

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
                        $window.location.href = "/login";
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

    };

    $scope.init = function() {
        if ($scope.mobile_number) {
            $scope.loading = true;
        }
        $.get("https://ipapi.co/json/").then(function(response) {
            $scope.countryCodeValue = response.country_calling_code;
            if ($scope.mobile_number) {
                $scope.countryCodeValue = $scope.countryCode;
            }
            $scope.loading = false;
        });

        setTimeout(function() {
            angular.element('#emailAddressField').focus();
            $window.localStorage.removeItem("forgotEmail");
            $window.localStorage.removeItem("forgotMobile");
            $window.localStorage.removeItem("countryCode");
            $scope.tabSection = $scope.mobile_number ? false : true;
        }, 1500);
        let queryStringObject = $location.search();
        if ($location.path() != '/forgotpassword') {
            if (queryStringObject && 'token' in queryStringObject && queryStringObject.token != '') {
                $scope.resetPwdToken = queryStringObject.token;
            } else {
                if ($location.path() != '/otp-reset-password') {
                    $scope.goToPage("/login");
                }
            }
        }
    };

    $scope.init();
}]);