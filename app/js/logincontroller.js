angular.module('PromoApp')
    .controller('LoginController', ['$scope', '$parse', '$log', 'qbService', '$location', 'authService', 'apiService', 'eventsService', '$rootScope', 'awsService', 'config', 'locationService', 'Utils', '$window', '$route', '$interval', '$ocLazyLoad', 'deviceDetector', function($scope, $parse, $log, qbService, $location, authService, apiService, eventsService, $rootScope, awsService, config, locationService, Utils, $window, $route, $interval, $ocLazyLoad, deviceDetector) {
        let qbsession = {};
        $scope.loading = false;
        $scope.inputType = 'password';
        $scope.showAppStoreLink = 'desktop';
        $scope.showAndroid = false;
        $scope.showIos = false;
        $scope.otp = '';
        $scope.paramToken = $route.current.params.token;
        $scope.otp_verification_data = {};
        $scope.counter = 120; // in second 
        $scope.signup_type = 1;
        $scope.showToolTip = false;
        $scope.emailDisable = false;
        $scope.loginButtonHide = false;
        $scope.signupFooterHide = false;
        $scope.usernameError = false;
        $scope.switchFieldModel = false;
        $scope.mobileNumberError = false;
        $scope.tabSection = true;
        $scope.inputType = 'password';
        $scope.countryCode = "+1";
        $scope.tempEmailValue = '';
        $scope.tempMobileValue = '';
        $scope.searchTerm = '';
        $scope.location = {
            city: '',
            city_lat: '',
            city_long: ''
        };
        $scope.radioData = [
            { label: 'Email Address', value: 'email', checked: true },
            { label: 'Mobile Number', value: 'mobile' },
        ];
        $scope.$on('PerformLogin', function($event, data) {
            $scope.userName = data.username;
            $scope.password = data.password;
            $scope.signIn(data.redirect);
        });

        $scope.tabChange = (value) => {
            if (value == 'mobile') {
                $scope.tabSection = false;
                if (!$scope.tempMobileValue || $scope.tempMobileValue == '') {
                    $scope.tempEmailValue = $scope.singupValue;
                    $scope.tempMobileValue = '';
                    $scope.mobileNumberError = false;
                    $scope.singupValue = '';
                } else {
                    $scope.tempEmailValue = $scope.singupValue;
                    $scope.singupValue = $scope.tempMobileValue;
                    $scope.mobileNumberError = false;
                }
            } else {
                $scope.tabSection = true;
                if (!$scope.tempEmailValue || $scope.tempEmailValue == '') {
                    $scope.tempMobileValue = $scope.singupValue;
                    $scope.tempEmailValue = '';
                    $scope.usernameError = false;
                    $scope.singupValue = '';
                } else {
                    $scope.tempMobileValue = $scope.singupValue;
                    $scope.singupValue = $scope.tempEmailValue;
                    $scope.usernameError = false;
                }
            }
        };

        $scope.hideShowPassword = function() {
            if ($scope.inputType == 'password')
                $scope.inputType = 'text';
            else
                $scope.inputType = 'password';
        };

        $scope.goToPage = function(page) {
            $window.location.href = page;
        };

        /*
         **
         ** Sing In
         **
         */
        $scope.signIn = (redirect, form) => {
            $scope.loading = true;
            if (!$scope.userName && !$scope.password) {
                form.userName.$invalid = true;
                form.password.$invalid = true;
                $scope.loading = false;
                return false;
            } else if (!$scope.userName) {
                form.userName.$invalid = true;
                $scope.loading = false;
                return false;
            } else if (!$scope.password) {
                form.password.$invalid = true;
                $scope.loading = false;
                return false;
            }
            $scope.countryCode = $('#countryCodeValue').text();
            // Check if username contains @ then it is email else username
            var promoParams = {};
            var params = {};
            if ($scope.switchFieldModel) {
                let dial_code = ($scope.countryCode).toString().replace('+', '');
                $scope.signup_type = 2;
                promoParams = { "country_code": dial_code, 'mobile_number': $scope.userName, 'password': $scope.password, 'signin_type': ($scope.signup_type).toString() };
            } else {
                promoParams = { 'email': $scope.userName, 'password': $scope.password, 'signin_type': ($scope.signup_type).toString() };
                params = { 'username': $scope.userName, 'password': $scope.password };
            }

            // NOTE: This has changed to 2 hours since QB token is valid for 2 hours only.
            // In case this needs to be changed please check QB first
            var now = new Date();
            now.setMinutes(now.getMinutes() + 120);

            apiService.userLogin(promoParams).then((response) => {
                if (response.status == 200) {
                    let data = response.data;
                    if (data.success) {
                        if (data && 'data' in data && data.data != undefined) {
                            let user = response.data.data;
                            let user_info = {
                                id: user.user_id,
                                user_id: user.user_id,
                                quickblox_id: user.quickblox_id,
                                quickblox_pwd: 'thepromoappqb',
                                first_name: user.first_name,
                                last_name: user.last_name,
                                email: user.email,
                                is_email_verified: user.is_email_verified,
                                full_name: user.username,
                                name: user.username,
                                city: user.city,
                                city_lat: user.city_lat,
                                city_long: user.city_long,
                                about_you: user.about_you,
                                tag_list: 'promoapp',
                                selectedPlan: { 'id': 'basic' },
                                logo: user.logo,
                                url: user.url,
                                website_name: user.website_name,
                                stripe_account_id: user.stripe_account_id,
                                stripe_customer_id: user.stripe_customer_id,
                                is_verified: user.is_verified,
                                is_zone_owner: user.is_zone_owner,
                                is_zone_member: user.is_zone_member,
                                charges_enabled: user.charges_enabled,
                                payouts_enabled: user.payouts_enabled,
                                mobile_number: user.mobile_number,
                            };

                        if (user.profile_pic !== "") {
                            user_info.imgUrl = user.profile_pic;
                        }

                        if (user.paypal_email !== "") {
                            user_info.paypal_email = user.paypal_email;
                        }

                        if (user && 'current_plan' in user && user.current_plan != '') {
                            user_info.selectedPlan.id = user.current_plan;
                        }

                            authService.putWithExpiry('token', user.token);
                            authService.putWithExpiry('user', JSON.stringify(user_info));
                            let userUnreadMessageCount = 0;
                            apiService.getNotification(user.token).then((response) => {
                                if (response.status == 200) {
                                    let data = response.data;
                                    if (data.success) {
                                        if ('data' in data) {
                                            userUnreadMessageCount = data.data.length;
                                        }
                                    }
                                }
                            });
                            if ($scope.switchFieldModel) {
                                params = { 'username': user.username, 'password': $scope.password };
                            }
                            authService.putWithExpiry('userUnreadMessageCount', userUnreadMessageCount);
                            localStorage.setItem('user', JSON.stringify(user_info));
                        } else {
                            let notify = {
                                type: 'success',
                                title: 'Success',
                                content: data.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            let otp_verification_data = {};
                            if (data.signin_type == '2') {
                                otp_verification_data = {
                                    "mobile_number": $scope.userName,
                                    "country_code": ($scope.countryCode).toString().replace('+', ''),
                                    "verify_type": "login",
                                    "extra_info": {
                                        'password': $scope.password,
                                    }
                                };
                            } else {
                                otp_verification_data = {
                                    "email": $scope.userName,
                                    "verify_type": "login",
                                    "extra_info": {
                                        'password': $scope.password,
                                    }
                                };
                            }
                            authService.put('otp_verification_data', JSON.stringify(otp_verification_data), false);
                            $window.location.href = "/otp-verify";
                        }
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
            }).then(() => {
                return qbService.createUserSession(params);
            }).then((session) => {
                let user = authService.getUser();
                if (user) {
                    authService.putWithExpiry('session', JSON.stringify(session));
                    let qbParam = { 'login': user.full_name, 'password': user.quickblox_pwd };
                    return qbService.userLogin(qbParam).then((qbUser) => {
                        return qbUser;
                    }).catch(err => {
                        let qbParam = { 'login': user.email, 'password': user.quickblox_pwd };
                        return qbService.userLogin(qbParam).then((qbUser) => {
                            return qbUser;
                        }).catch(err => {
                            let qbParam = { 'email': user.email, 'password': user.quickblox_pwd };
                            return qbService.userLogin(qbParam);
                        });
                    });
                }
            }).then((qbUser) => {
                let user = authService.getUser();
                if (user) {
                    let qbFullname = user.first_name + " " + user.last_name;
                    if (qbUser.custom_data != 'set' && user.first_name) {
                        let userUp = { "full_name": user.first_name + " " + user.last_name, "custom_data": "set" };
                        qbService.updateUserProfile(qbUser.id, userUp);
                    } else if (qbFullname != qbUser.full_name) {
                        let userUp = { "full_name": user.first_name + " " + user.last_name, "custom_data": "set" };
                        qbService.updateUserProfile(qbUser.id, userUp);
                    }
                    return qbService.signInChat(qbUser.id, user.quickblox_pwd);
                }
            }).then(() => {
                // Check if you have any query string
                let user = authService.getUser();
                let queryStringObject = $location.search();
                if (queryStringObject && 'redirect' in queryStringObject && queryStringObject.redirect != '') {
                    let redirect = queryStringObject.redirect;
                    if (!redirect.startsWith('/')) {
                        redirect = '/' + redirect;
                    }
                    $window.location.assign(redirect);
                    Utils.applyChanges($scope);
                } else if (redirect) {
                    $location.search('redirectSignup', null);
                    $location.path(redirect);
                    Utils.applyChanges($scope);
                } else if (user) {
                    $window.location.href = "/";
                }
            }).catch(err => {
                console.log(err);
                let notify = {
                    type: 'error',
                    title: 'OOPS!!',
                    content: "Please check to make sure your email and password both are correct.",
                    timeout: 5000 //time in ms
                };
                $scope.$emit('notify', notify);
                Utils.applyChanges($scope);
                $scope.loading = false;
            }).finally(() => {
                $scope.loading = false;
            });
        };

        /*
         **
         ** Singup Type Step
         **
         */
        $scope.verifySignupType = (e, form) => {
            e.preventDefault();
            $scope.countryCode = $('#countryCodeValue').text();
            $scope.loading = true;
            if (!$scope.singupValue) {
                form.signUpValue.$invalid = true;
                $scope.loading = false;
                return false;
            }
            let signupDetail = {};
            let otp_verify_data = {};
            if ($scope.tabSection) { // email
                $scope.signup_type = 1;
                signupDetail = {
                    "email": $scope.singupValue,
                    "signup_type": ($scope.signup_type).toString()
                };
                otp_verify_data = {
                    "email": $scope.singupValue,
                    "signup_type": ($scope.signup_type).toString()
                };
            } else {
                $scope.signup_type = 2;
                signupDetail = {
                    "mobile_number": $scope.singupValue,
                    "country_code": ($scope.countryCode).toString().replace('+', ''),
                    "signup_type": ($scope.signup_type).toString()
                };
                otp_verify_data = {
                    "mobile_number": $scope.singupValue,
                    "country_code": ($scope.countryCode).toString().replace('+', ''),
                    "signup_type": ($scope.signup_type).toString()
                };
                $window.localStorage.setItem("countryCode", $scope.countryCode.toString());
            }

            apiService.signUpUserType(signupDetail).then((response) => {
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
                        $window.location.href = "/signup-verify";
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
                    content: err.data.message + '.',
                    timeout: 5000 //time in ms
                };
                $scope.$emit('notify', notify);
            }).finally((err) => {
                $scope.loading = false;
            });
        };

        /*
         **
         ** Signup Verfiy Step
         **
         */

        $scope.verifySignUpOTP = (otpValue, form) => {
            if (!otpValue) {
                form.otp_1.$invalid = true;
                form.otp_2.$invalid = true;
                form.otp_3.$invalid = true;
                form.otp_4.$invalid = true;
                form.otp_5.$invalid = true;
                form.otp_6.$invalid = true;
                return false;
            }
            if (authService.get('otp_verification_data')) {
                $scope.loading = true;
                let otp_verification_data = JSON.parse(authService.get('otp_verification_data'));
                let otp_verify_data = {};
                if (otp_verification_data.signup_type == '1') {
                    otp_verify_data = {
                        "email": otp_verification_data.email,
                        "signup_type": otp_verification_data.signup_type,
                        "otp": otpValue,
                    };
                } else {
                    otp_verify_data = {
                        "mobile_number": otp_verification_data.mobile_number,
                        "country_code": otp_verification_data.country_code,
                        "signup_type": otp_verification_data.signup_type,
                        "otp": otpValue,
                    };
                }

                apiService.signUpUserVerify(otp_verify_data).then((response) => {
                    if (response.status == 200) {
                        let data = response.data;
                        $scope.loading = true;
                        if (data.success) {
                            let notify = {
                                type: 'success',
                                title: 'Success',
                                content: data.message,
                                timeout: 5000 //time in ms
                            };
                            authService.putWithExpiry('token', data.token);
                            $scope.$emit('notify', notify);
                            $window.location.href = "/signup-confirm";
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
                            content: data.message,
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        Utils.applyChanges($scope);
                        $scope.loading = false;
                    }
                }).catch(err => {
                    console.log(err);
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: "Sorry something went wrong. Please try later.",
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    Utils.applyChanges($scope);
                    $scope.loading = false;
                });
            } else {
                let notify = {
                    type: 'error',
                    title: 'OOPS!!',
                    content: "Sorry something went wrong.Please try later 3.",
                    timeout: 5000 //time in ms
                };
                $scope.$emit('notify', notify);
            }
        };

        /*
         **
         ** Singup Step Final
         **
         */
        $scope.signUpConfirm = (e, forms) => {
            e.preventDefault();
            $scope.loading = true;
            if (!$scope.first_name && !$scope.last_name && !$scope.password && !$scope.location.city) {
                forms.city.$invalid = true;
                forms.firstName.$invalid = true;
                forms.lastName.$invalid = true;
                forms.password.$invalid = true;
                $scope.loading = false;
                return false;
            }
            let token = authService.get('token');
            $scope.signupForm.$invalid = true;
            let user = {
                'username': $scope.first_name,
                'first_name': $scope.first_name,
                'last_name': $scope.last_name,
                'password': $scope.password,
                'city': $scope.location.city,
                'city_lat': (typeof $scope.location.city_lat != 'undefined') ? ($scope.location.city_lat).toString() : '',
                'city_long': (typeof $scope.location.city_long != 'undefined') ? ($scope.location.city_long).toString() : '',
            };

            let isError = false;
            let notify = {
                type: 'error',
                title: 'OOPS!!',
                content: 'Error',
                timeout: 5000 //time in ms
            };

            if (!$scope.password) {
                notify.content = "Please enter password";
                isError = true;
            }

            if (!isError) {
                apiService.signUpUserConfirm(user, token).then((response) => {
                    if (response.status == 200) {
                        let data = response.data;
                        if (data.success) {
                            let notify = {
                                type: 'success',
                                title: 'Success',
                                content: 'You have successfully Signed Up!',
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            authService.clearSession();
                            $window.location.href = "/login";
                        } else {
                            $scope.loading = false;
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
                        $scope.loading = false;
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: data.message,
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        Utils.applyChanges($scope);
                    }
                }).catch((err) => {
                    $scope.loading = false;
                    let dataMessage = err.data.message;
                    let message = '';
                    if (dataMessage == '"city_lat" is not allowed to be empty') {
                        message = "City is not allowed to be empty.";
                    } else {
                        message = dataMessage;
                    }
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: message,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    Utils.applyChanges($scope);
                }).finally((err) => {
                    $scope.loading = false;
                });
            } else {
                $scope.$emit('notify', notify);
                $scope.loading = false;
            }
            return false;
        };

        $scope.signUp = (e) => {
            e.preventDefault();
            $scope.loading = true;
            let user = {};
            if ($scope.signup_type == 2) { //mobile 
                $scope.signupFormMobile.$invalid = true;
                let dial_code = $('.selected-dial-code').text();
                let mobile_number = ($scope.mobileNumber).replace(dial_code, '');
                dial_code = dial_code.replace('+', '');
                user = {
                    'signup_type': ($scope.signup_type).toString(),
                    'username': $scope.first_name,
                    'first_name': $scope.first_name,
                    'last_name': $scope.last_name,
                    'mobile_number': mobile_number,
                    'country_code': dial_code,
                    'password': $scope.password,
                    'city': $scope.location.city,
                    'city_lat': (typeof $scope.location.city_lat != 'undefined') ? ($scope.location.city_lat).toString() : '',
                    'city_long': (typeof $scope.location.city_long != 'undefined') ? ($scope.location.city_long).toString() : '',
                };
            } else { //email
                $scope.signupFormEmail.$invalid = true;
                user = {
                    'signup_type': ($scope.signup_type).toString(),
                    'username': $scope.first_name,
                    'first_name': $scope.first_name,
                    'last_name': $scope.last_name,
                    'email': $scope.Email,
                    'password': $scope.password,
                    'city': $scope.location.city,
                    'city_lat': (typeof $scope.location.city_lat != 'undefined') ? ($scope.location.city_lat).toString() : '',
                    'city_long': (typeof $scope.location.city_long != 'undefined') ? ($scope.location.city_long).toString() : '',
                };
            }

            let isError = false;
            let usernameValidationRegularExpression = /^[a-zA-Z0-9]*$/;
            let notify = {
                type: 'error',
                title: 'OOPS!!',
                content: 'Error',
                timeout: 5000 //time in ms
            };

            if (!$scope.password) {
                notify.content = "Please enter password";
                isError = true;
            } else if (usernameValidationRegularExpression.test($scope.userName) == false) {
                notify.content = "Username can only contains alphabets";
                isError = true;
            }

            if (!isError) {
                apiService.signUpUser(user).then((response) => {
                        if (response.status == 200) {
                            let data = response.data;
                            if (data.success) {
                                // As of now it should be allowed to handle for both success and error
                                if ($scope.signup_type == 2) { //mobile ;
                                    let notify = {
                                        type: 'success',
                                        title: 'Success',
                                        content: 'Please verify your phone number.',
                                        timeout: 5000 //time in ms
                                    };
                                    $scope.$emit('notify', notify);

                                    let otp_verification_data = {
                                        "mobile_number": user.mobile_number,
                                        "country_code": user.country_code,
                                        "verify_type": "signup",
                                        "extra_info": {
                                            'username': $scope.userName,
                                            'password': $scope.password,
                                        }
                                    };

                                    authService.put('otp_verification_data', JSON.stringify(otp_verification_data));
                                    $window.location.href = "/otp-verify";
                                } else {

                                    let notify1 = {
                                        type: 'success',
                                        title: 'Success',
                                        content: 'We have sent an email message to your registered email address, Please verify your email.',
                                        timeout: 5000 //time in ms
                                    };
                                    let notify2 = {
                                        type: 'success',
                                        title: 'Success',
                                        content: 'You have successfully Signed Up!',
                                        timeout: 5000 //time in ms
                                    };

                                    if ($route.current.params && 'admin_verification_token' in $route.current.params) {
                                        let data = {
                                            'token': $route.current.params.admin_verification_token
                                        };
                                        eventsService.createEventAdministrator(data).then((response) => {
                                            let notify3 = {
                                                type: 'success',
                                                title: 'Success',
                                                content: response.message,
                                                timeout: 5000 //time in ms
                                            };
                                            $scope.$emit('notify', notify1);
                                            $scope.$emit('notify', notify2);
                                            $scope.$emit('notify', notify3);
                                            $window.location.href = "/login";
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
                                        $scope.$emit('notify', notify1);
                                        $scope.$emit('notify', notify2);
                                        $window.location.href = "/login";
                                    }

                                }
                            } else {
                                $scope.loading = false;
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
                            $scope.loading = false;
                            let notify = {
                                type: 'error',
                                title: 'OOPS!!',
                                content: data.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            Utils.applyChanges($scope);
                        }
                    })
                    .catch((err) => {
                        $scope.loading = false;
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: err.data.message,
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        Utils.applyChanges($scope);
                    }).finally((err) => {
                        $scope.loading = false;
                    });
            } else {
                $scope.$emit('notify', notify);
                $scope.loading = false;
            }
            return false;
        };

        // function to decrypt data
        function decrypt(token) {
            let decrypted = KJUR.jws.JWS.readSafeJSONString(b64utoutf8((token).split(".")[1]));
            return decrypted;
        }

        $scope.clearUsername = function() {
            $scope.usernameError = false;
            $scope.switchFieldModel = false;
            $scope.userName = null;
            angular.element('#emailAddressField').focus();
        };

        $scope.clearPassword = function() {
            $scope.password = '';
            angular.element('#passwordField').focus();
        };

        $scope.forgotPassword = function(value) {
            let usernameValidation = /^[^+\s@]+@[^\s@]+\.[^\s@]{2,}$/;
            let mobileNumber = /^\d+$/;
            let mobileNumberValidation = /^\d{9,13}$/;
            $scope.countryCode = $('#countryCodeValue').text();
            if (value) {
                if (usernameValidation.test(value) == true || value !== '') {
                    $scope.usernameError = false;
                    $window.localStorage.setItem("forgotEmail", value);
                } else if (mobileNumber.test(value)) {
                    if (mobileNumberValidation.test(value) == true) {
                        $window.localStorage.setItem("forgotMobile", value);
                        $window.localStorage.setItem("countryCode", $scope.countryCode.toString());
                    }
                }
            }
            $window.location.href = "/forgotpassword";
        };

        $scope.usernameBlur = function(value) {
            let usernameValidation = /^[^+\s@]+@[^\s@]+\.[^\s@]{2,}$/;
            let mobileNumberValidation = /^\d{9,13}$/;
            let mobileNumber = /^\d+$/;
            if (value && usernameValidation.test(value) == false ) {
                $scope.switchFieldModel = false;
                $scope.usernameError = true;
            } else {
                $scope.usernameError = false;
            }
            if (mobileNumber.test(value) && value !== '') {
                $scope.switchFieldModel = true;
                if (mobileNumberValidation.test(value) == false) {
                    $scope.mobileNumberError = true;
                } else {
                    $scope.mobileNumberError = false;
                }
            } else {
                $scope.switchFieldModel = false;
                $scope.mobileNumberError = false;
                Utils.applyChanges($scope);
            }
        };

        $scope.signupBlur = function(value) {
            let usernameValidation = /^[^+\s@]+@[^\s@]+\.[^\s@]{2,}$/;
            let mobileNumberValidation = /^\+?\d{10}$/;
            let mobileNumber = /^\+?\d{10}$/;
            if (value !== '') {
                if ($scope.tabSection) {
                    if (usernameValidation.test(value) == false) {
                        $scope.usernameError = true;
                    } else {
                        $scope.usernameError = false;
                        $scope.validateSignup = false;
                    }
                } else {
                    if (mobileNumber.test(value)) {
                        if (mobileNumberValidation.test(value) == false) {
                            $scope.mobileNumberError = true;
                            $scope.validateSignup = true;
                        } else {
                            $scope.mobileNumberError = false;
                            $scope.validateSignup = false;
                        }
                    } else {
                        $scope.usernameError = false;
                        $scope.validateSignup = false;
                        $scope.mobileNumberError = false;
                    }
                }
            } else {
                $scope.usernameError = false;
                $scope.mobileNumberError = false;
                $scope.validateSignup = true;
            }
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
                            $scope.location = {};
                            authService.remove('userCurrentLocation');
                            locationService.getUserLocation(true).then((locationResponse) => {
                                if (locationResponse) {
                                    $scope.locationPlaceholder = 'Search Location';
                                    $scope.disableLocation = false;
                                    if ('city' in locationResponse) {
                                        $scope.location.city = locationResponse.city;
                                    } else if ('address' in locationResponse) {
                                        $scope.location.city = locationResponse.address;
                                    }

                                    $scope.location.city_lat = locationResponse.lat;
                                    $scope.location.city_long = locationResponse.lng;
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
                    $scope.location = {};
                    authService.remove('userCurrentLocation');
                    locationService.getUserLocation(true).then((locationResponse) => {
                        if (locationResponse) {
                            $scope.locationPlaceholder = 'Search Location';
                            $scope.disableLocation = false;
                            if ('city' in locationResponse) {
                                $scope.location.city = locationResponse.city;
                            } else if ('address' in locationResponse) {
                                $scope.location.city = locationResponse.address;
                            }

                            $scope.location.city_lat = locationResponse.lat;
                            $scope.location.city_long = locationResponse.lng;
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
                $scope.location = {};
                authService.remove('userCurrentLocation');
                locationService.getUserLocation(true).then((locationResponse) => {
                    if (locationResponse) {
                        $scope.locationPlaceholder = 'Search Location';
                        $scope.disableLocation = false;
                        if ('city' in locationResponse) {
                            $scope.location.city = locationResponse.city;
                        } else if ('address' in locationResponse) {
                            $scope.location.city = locationResponse.address;
                        }

                        $scope.location.city_lat = locationResponse.lat;
                        $scope.location.city_long = locationResponse.lng;
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
                        $scope.location = {};
                        authService.remove('userCurrentLocation');
                        locationService.getUserLocation(true).then((locationResponse) => {
                            if (locationResponse) {
                                $scope.locationPlaceholder = 'Search Location';
                                $scope.disableLocation = false;
                                if ('city' in locationResponse) {
                                    $scope.location.city = locationResponse.city;
                                } else if ('address' in locationResponse) {
                                    $scope.location.city = locationResponse.address;
                                }

                                $scope.location.city_lat = locationResponse.lat;
                                $scope.location.city_long = locationResponse.lng;
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
                $scope.location = {};
                authService.remove('userCurrentLocation');
                locationService.getUserLocation(true).then((locationResponse) => {
                    if (locationResponse) {
                        $scope.locationPlaceholder = 'Search Location';
                        $scope.disableLocation = false;
                        if ('city' in locationResponse) {
                            $scope.location.city = locationResponse.city;
                        } else if ('address' in locationResponse) {
                            $scope.location.city = locationResponse.address;
                        }

                        $scope.location.city_lat = locationResponse.lat;
                        $scope.location.city_long = locationResponse.lng;
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

        $scope.$watch('loct', function() {
            if ($scope.loct) {
                $scope.location.city_lat = $scope.loct.lat;
                $scope.location.city_long = $scope.loct.long;
                if ('city' in $scope.loct && $scope.loct.city) {
                    $scope.location.city = $scope.loct.city;
                }
            }
        });

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

            if (authService.get('otp_verification_data')) {
                $scope.loading = true;
                let otp_verification_data = JSON.parse(authService.get('otp_verification_data'));

                let otp_verify_data = {};

                if (otp_verification_data.mobile_number) {
                    otp_verify_data = {
                        "mobile_number": otp_verification_data.mobile_number,
                        "country_code": otp_verification_data.country_code,
                        "verify_type": otp_verification_data.verify_type,
                        "otp": otp,
                    };
                } else {
                    otp_verify_data = {
                        "email": otp_verification_data.email,
                        "verify_type": otp_verification_data.verify_type,
                        "otp": otp,
                    };
                }

                let token = '';
                if (otp_verification_data.verify_type == 'editprofile') {
                    token = authService.get('token');
                }

                apiService.verifyOTP(otp_verify_data, token).then((response) => {
                    if (response.status == 200) {
                        let data = response.data;
                        $scope.loading = true;
                        if (data.success) {
                            $scope.counter = 120;
                            let notify = {
                                type: 'success',
                                title: 'Success',
                                content: data.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            $scope.loading = true;
                            if (otp_verification_data.verify_type == 'signup') {
                                $window.location.href = "/login";
                            } else if (otp_verification_data.verify_type == 'forgotpassword') {
                                authService.putWithExpiry('received_otp', otp_verify_data.otp);
                                if (data.data) {
                                    if (data.data.token) {
                                        authService.putWithExpiry('resent_Token', data.data.token);
                                    }
                                }
                                $window.location.href = "/otp-reset-password";
                            } else if (otp_verification_data.verify_type == 'login') {
                                $scope.loading = true;
                                let user = data.data;
                                let user_info = {
                                    id: user.user_id,
                                    user_id: user.user_id,
                                    quickblox_id: user.quickblox_id,
                                    quickblox_pwd: 'thepromoappqb',
                                    first_name: user.first_name,
                                    last_name: user.last_name,
                                    email: user.email,
                                    is_email_verified: user.is_email_verified,
                                    full_name: user.username,
                                    name: user.username,
                                    city: user.city,
                                    city_lat: user.city_lat,
                                    city_long: user.city_long,
                                    about_you: user.about_you,
                                    tag_list: 'promoapp',
                                    selectedPlan: {
                                        'id': 'basic'
                                    },
                                    logo: user.logo,
                                    url: user.url,
                                    website_name: user.website_name,
                                    stripe_account_id: user.stripe_account_id,
                                    stripe_customer_id: user.stripe_customer_id,
                                    is_verified: user.is_verified,
                                    is_zone_owner: user.is_zone_owner,
                                    is_zone_member: user.is_zone_member,
                                    charges_enabled: user.charges_enabled,
                                    payouts_enabled: user.payouts_enabled,
                                    mobile_number: user.mobile_number,
                                };

                                if (user.profile_pic !== "") {
                                    user_info.imgUrl = user.profile_pic;
                                }

                                if (user.paypal_email !== "") {
                                    user_info.paypal_email = user.paypal_email;
                                }

                                if (user && 'current_plan' in user && user.current_plan != '') {
                                    user_info.selectedPlan.id = user.current_plan;
                                }

                                authService.putWithExpiry('token', user.token);
                                authService.putWithExpiry('user', JSON.stringify(user_info));

                                let userUnreadMessageCount = 0;

                                authService.putWithExpiry('userUnreadMessageCount', userUnreadMessageCount);
                                localStorage.setItem('user', JSON.stringify(user_info));

                                var params = { 'username': user.full_name, 'password': otp_verification_data.extra_info.password };

                                apiService.getNotification(user.token).then((response) => {
                                    $scope.loading = true;
                                    if (response.status == 200) {
                                        let data = response.data;
                                        if (data.success) {
                                            if ('data' in data) {
                                                userUnreadMessageCount = data.data.length;
                                                authService.putWithExpiry('userUnreadMessageCount', userUnreadMessageCount);
                                            }
                                        }
                                    }
                                }).then(() => {
                                    let user = authService.getUser();
                                    let qbParam = { 'login': user.full_name, 'password': user.quickblox_pwd };
                                    return qbService.createUserSession(params);
                                }).then((session) => {
                                    let user = authService.getUser();
                                    authService.putWithExpiry('session', JSON.stringify(session));
                                    let qbParam = { 'login': user.full_name, 'password': user.quickblox_pwd };
                                    return qbService.userLogin(qbParam).then((qbUser) => {
                                        return qbUser;
                                    }).catch(err => {
                                        let qbParam = { 'login': user.email, 'password': user.quickblox_pwd };
                                        return qbService.userLogin(qbParam).then((qbUser) => {
                                            return qbUser;
                                        }).catch(err => {
                                            let qbParam = { 'email': user.email, 'password': user.quickblox_pwd };
                                            return qbService.userLogin(qbParam);
                                        });
                                    });
                                }).then((qbUser) => {
                                    let user = authService.getUser();
                                    if (qbUser.custom_data != 'set' && user.first_name) {
                                        let userUp = { "full_name": user.first_name + " " + user.last_name, "custom_data": "set" };
                                        qbService.updateUserProfile(qbUser.id, userUp);
                                    }
                                    return qbService.signInChat(qbUser.id, user.quickblox_pwd);
                                }).then(() => {
                                    // Check if you have any query string
                                    let queryStringObject = $location.search();
                                    if (queryStringObject && 'redirect' in queryStringObject && queryStringObject.redirect != '') {
                                        let redirect = queryStringObject.redirect;

                                        if (!redirect.startsWith('/')) {
                                            redirect = '/' + redirect;
                                        }
                                        $window.location.assign(redirect);
                                        Utils.applyChanges($scope);
                                    } else {
                                        $window.location.href = "/";
                                    }
                                }).finally((err) => {
                                    $scope.loading = false;
                                });
                            } else if (otp_verification_data.verify_type == 'editprofile') {
                                let user_info = authService.getUser();
                                user_info.mobile_number = '+' + otp_verify_data.country_code + ' ' + otp_verify_data.mobile_number;
                                authService.putWithExpiry('user', JSON.stringify(user_info));
                                $window.location.href = "/myprofile";
                            }
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
                }).catch(err => {
                    console.log(err);
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

            } else {
                let notify = {
                    type: 'error',
                    title: 'OOPS!!',
                    content: "Sorry something went wrong.Please try later.",
                    timeout: 5000 //time in ms
                };
                $scope.$emit('notify', notify);
            }
        };

        $scope.resendOTP = (value) => {
            if (authService.get('otp_verification_data')) {
                $scope.otp_1 = "";
                $scope.otp_2 = "";
                $scope.otp_3 = "";
                $scope.otp_4 = "";
                $scope.otp_5 = "";
                $scope.otp_6 = "";
                let otp_verification_data = JSON.parse(authService.get('otp_verification_data'));
                let otp_verify_data = {};
                if (value) {
                    if (otp_verification_data.mobile_number) {
                        otp_verify_data = {
                            "mobile_number": otp_verification_data.mobile_number,
                            "country_code": otp_verification_data.country_code,
                            "signup_type": otp_verification_data.signup_type,
                        };
                    } else {
                        otp_verify_data = {
                            "email": otp_verification_data.email,
                            "signup_type": otp_verification_data.signup_type,
                        };
                    }
                } else {
                    if (otp_verification_data.mobile_number) {
                        otp_verify_data = {
                            "mobile_number": otp_verification_data.mobile_number,
                            "country_code": otp_verification_data.country_code,
                            "verify_type": otp_verification_data.verify_type,
                        };
                    } else {
                        otp_verify_data = {
                            "email": otp_verification_data.email,
                            "verify_type": otp_verification_data.verify_type,
                        };
                    }
                }
                $scope.loading = true;
                let token = '';
                if (otp_verification_data.verify_type == 'editprofile') {
                    token = authService.get('token');
                }
                if (value) {
                    apiService.signUpUserType(otp_verify_data).then((response) => {
                        if (response.status == 200) {
                            let data = response.data;
                            if (data.success) {
                                $scope.counter = 120;
                                let notify = {
                                    type: 'success',
                                    title: 'Success',
                                    content: data.message,
                                    timeout: 5000 //time in ms
                                };
                                $scope.$emit('notify', notify);
                                Utils.applyChanges($scope);
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
                            content: err.data.message + '.',
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                    }).finally((err) => {
                        $scope.loading = false;
                    });
                } else {
                    if (otp_verification_data.email) {
                        apiService.forgotpassword(otp_verify_data).then((response) => {
                            if (response.status == 200) {
                                authService.put('otp_verification_data', JSON.stringify(otp_verify_data));
                                let data = response.data;
                                if (data.success) {
                                    $scope.counter = 120;
                                    let notify = {
                                        type: 'success',
                                        title: 'Success',
                                        content: data.message,
                                        timeout: 5000 //time in ms
                                    };
                                    $scope.$emit('notify', notify);
                                    Utils.applyChanges($scope);
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
                        }).catch(err => {
                            console.log(err);
                            let notify = {
                                type: 'error',
                                title: 'OOPS!!',
                                content: "Sorry something went wrong. Please try later.",
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            Utils.applyChanges($scope);
                        }).finally(() => {
                            $scope.loading = false;
                        });
                    } else {
                        apiService.resendOTP(otp_verify_data, token).then((response) => {
                            if (response.status == 200) {
                                let data = response.data;
                                if (data.success) {
                                    $scope.counter = 120;
                                    let notify = {
                                        type: 'success',
                                        title: 'Success',
                                        content: data.message,
                                        timeout: 5000 //time in ms
                                    };
                                    $scope.$emit('notify', notify);
                                    Utils.applyChanges($scope);
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
                                $scope.loading = false;
                                let notify = {
                                    type: 'error',
                                    title: 'OOPS!!',
                                    content: "Sorry something went wrong. Please try later.",
                                    timeout: 5000 //time in ms
                                };
                                $scope.$emit('notify', notify);
                                Utils.applyChanges($scope);
                            }
                        }).catch(err => {
                            console.log(err);
                            let notify = {
                                type: 'error',
                                title: 'OOPS!!',
                                content: "Sorry something went wrong. Please try later.",
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            Utils.applyChanges($scope);
                        }).finally((err) => {
                            $scope.loading = false;
                        });
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
            }
        };

        $scope.passwordHasNumber = (password) => {
            return /\d/.test(password);
        };

        $scope.passwordHasUpperCase = (password) => {
            return /[A-Z]/.test(password);
        };

        $scope.passwordHasSpecialCharacter = (password) => {
            return /[$@$!%*#?&]/.test(password);
        };

        $scope.clearSearchTerm = () => {
            $scope.searchTerm = '';
        };

        $scope.adminDirectLogin = (redirect, token) => {
            let userInfo = authService.getUser();
            if (userInfo) {
                authService.clearSession();
            }
            $scope.loading = true;
            // params token for admin login
            var promoParams = { 'admin_key': token };
            var params = {};
            // NOTE: This has changed to 2 hours since QB token is valid for 2 hours only.
            // In case this needs to be changed please check QB first
            var now = new Date();
            now.setMinutes(now.getMinutes() + 120);

            apiService.adminUserLogin(promoParams).then((response) => {
                if (response.status == 200) {
                    let user = response.data;
                    let user_info = {
                        id: user.user_id,
                        user_id: user.user_id,
                        quickblox_id: user.quickblox_id,
                        quickblox_pwd: 'thepromoappqb',
                        first_name: user.first_name,
                        last_name: user.last_name,
                        email: user.email,
                        is_email_verified: user.is_email_verified,
                        full_name: user.username,
                        name: user.username,
                        city: user.city,
                        city_lat: user.city_lat,
                        city_long: user.city_long,
                        about_you: user.about_you,
                        tag_list: 'promoapp',
                        selectedPlan: {
                            'id': 'basic'
                        },
                        logo: user.logo,
                        url: user.url,
                        website_name: user.website_name,
                        stripe_account_id: user.stripe_account_id,
                        stripe_customer_id: user.stripe_customer_id,
                        is_verified: user.is_verified,
                        is_zone_owner: user.is_zone_owner,
                        is_zone_member: user.is_zone_member,
                        charges_enabled: user.charges_enabled,
                        payouts_enabled: user.payouts_enabled,
                        mobile_number: user.mobile_number,
                    };

                    if (user.profile_pic !== "") {
                        user_info.imgUrl = user.profile_pic;
                    }

                    if (user.paypal_email !== "") {
                        user_info.paypal_email = user.paypal_email;
                    }

                    if (user && 'current_plan' in user && user.current_plan != '') {
                        user_info.selectedPlan.id = user.current_plan;
                    }

                    authService.putWithExpiry('token', user.token);
                    authService.putWithExpiry('user', JSON.stringify(user_info));
                    let tokenRead = KJUR.jws.JWS.readSafeJSONString(b64utoutf8((user.token).split(".")[1]));
                    let userUnreadMessageCount = 0;

                    apiService.getNotification(user.token).then((response) => {
                        if (response.status == 200) {
                            let data = response.data;
                            if (data.success) {
                                if ('data' in data) {
                                    userUnreadMessageCount = data.data.length;
                                }
                            }
                        }
                    });
                    params = { 'username': user.username, 'password': user.quickblox_pwd };
                    authService.putWithExpiry('userUnreadMessageCount', userUnreadMessageCount);
                    localStorage.setItem('user', JSON.stringify(user_info));
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
            }).then(() => {
                return qbService.createUserSession(params);
            }).then((session) => {
                let user = authService.getUser();
                authService.putWithExpiry('session', JSON.stringify(session));
                let qbParam = { 'login': user.full_name, 'password': user.quickblox_pwd };
                return qbService.userLogin(qbParam).then((qbUser) => {
                    return qbUser;
                }).catch(err => {
                    let qbParam = { 'login': user.email, 'password': user.quickblox_pwd };
                    return qbService.userLogin(qbParam).then((qbUser) => {
                        return qbUser;
                    }).catch(err => {
                        let qbParam = { 'email': user.email, 'password': user.quickblox_pwd };
                        return qbService.userLogin(qbParam);
                    });
                });
            }).then((qbUser) => {
                let user = authService.getUser();
                if (qbUser.custom_data != 'set' && user.first_name) {
                    let userUp = { "full_name": user.first_name + " " + user.last_name, "custom_data": "set" };
                    qbService.updateUserProfile(qbUser.id, userUp);
                }
                return qbService.signInChat(qbUser.id, user.quickblox_pwd);
            }).then(() => {
                // Check if you have any query string
                let queryStringObject = $location.search();
                if (queryStringObject && 'redirect' in queryStringObject && queryStringObject.redirect != '') {
                    let redirect = queryStringObject.redirect;
                    if (!redirect.startsWith('/')) {
                        redirect = '/' + redirect;
                    }
                    $window.location.assign(redirect);
                    Utils.applyChanges($scope);
                } else if (redirect) {
                    $location.search('redirectSignup', null);
                    $location.path(redirect);
                    Utils.applyChanges($scope);
                } else {
                    $window.location.href = "/";
                }
            }).catch(err => {
                console.log(err);
                let notify = {
                    type: 'error',
                    title: 'OOPS!!',
                    content: "Please check to make sure your email and password both are correct.",
                    timeout: 5000 //time in ms
                };
                $scope.$emit('notify', notify);
                Utils.applyChanges($scope);
                $scope.loading = false;
            }).finally(() => {
                $scope.loading = false;
            });
        };

        $scope.init = function() {
            $.get("https://ipapi.co/json/").then(function(response) {
                $scope.countryCodeValue = response.country_calling_code;
                if ($route.current.$$route.originalPath == '/otp-verify' || $route.current.$$route.originalPath == '/profile-otp-verify' || $route.current.$$route.originalPath == '/signup-verify' || $route.current.$$route.originalPath == '/signup-confirm') {
                    if (authService.get('otp_verification_data')) {
                        $scope.otp_verification_data = JSON.parse(authService.get('otp_verification_data'));
                        if ($route.current.$$route.originalPath == '/signup-confirm') {
                            $scope.signup_type = $scope.otp_verification_data.signup_type;
                            if ($scope.otp_verification_data.signup_type === '1') {
                                $scope.tabSection = true;
                                $scope.userName = $scope.otp_verification_data.email;
                                $scope.radioData[1].isDisabled = true;
                            } else {
                                $scope.userName = $scope.otp_verification_data.mobile_number;
                                $scope.countryCode = $window.localStorage.getItem("countryCode");
                                $scope.countryCodeValue = $window.localStorage.getItem("countryCode");
                                $scope.radioData[0].isDisabled = true;
                                $scope.radioData[1].checked = true;
                                $scope.tabSection = false;
                            }
                            Utils.applyChanges($scope);
                        }
                        $interval(
                            function() {
                                if ($scope.counter > 0) {
                                    $scope.counter--;
                                }
                            }, 1000);
                    } else {
                        $window.location.href = "/";
                    }
                }
            });
            $ocLazyLoad.load({
                insertBefore: '#load_js_before',
                files: ["bower_components/quickblox/quickblox.min.js"],
                cache: true
            }).then(() => {
                qbService.initQBApp().then((res) => {
                    qbsession = res;
                });
            });
            if (('ev' in $location.$$search && $location.$$search.ev) && ('token' in $location.$$search && $location.$$search.token)) {
                let decryptToken = decrypt($location.$$search.token);
                if (decryptToken && Object.keys(decryptToken).length > 0) {
                    if ('login' in decryptToken && decryptToken.login && 'password' in decryptToken && decryptToken.password) {
                        $scope.userName = decryptToken.login;
                        $scope.password = decryptToken.password;
                        $scope.signIn(`/scanqrcode?ev=${$location.$$search.ev}`);
                    }
                }
            }
            if (navigator.userAgent.indexOf('Mac OS X') != -1) {
                $scope.agentType = 'os';
                $scope.showIos = true;
            } else if (navigator.userAgent.indexOf('Mac OS X') == -1) {
                $scope.agentType = 'android';
                $scope.showAndroid = true;
            }
            if (navigator.userAgent.match(/Android/i) && navigator.userAgent.match(/Build/i)) {
                $scope.showAndroid = false;
                $scope.showIos = false;
            }
            if (navigator.userAgent.match(/iphone/i)) {
                $scope.showAppStoreLink = 'iphone';
                $scope.showIos = true;
            }
            if ($route.current.$$route.originalPath == '/signup') {
                if ($route.current.params && 'admin_verification_token' in $route.current.params) {
                    $scope.emailDisable = true;
                    $scope.loginButtonHide = true;
                    $scope.signupFooterHide = true;
                    $scope.adminInfo = KJUR.jws.JWS.readSafeJSONString(b64utoutf8(($route.current.params.admin_verification_token).split(".")[1]));
                    $scope.Email = $scope.adminInfo.email;
                }
            }
            setTimeout(function() {
                angular.element('#emailAddressField').focus();
                if ($scope.paramToken) {
                    $scope.adminDirectLogin(false, $scope.paramToken);
                }
            }, 1500);
        };

        $scope.init();
    }]);