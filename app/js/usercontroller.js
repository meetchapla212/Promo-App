angular.module('PromoApp')
    .controller('UserController', ['$route', '$scope', 'qbService', 'apiService', 'eventsService', 'sessionService', 'followUser', '$window', 'authService', 'Utils', 'locationService', '$mdDialog', 'config', 'deviceDetector', '$ocLazyLoad', function($route, $scope, qbService, apiService, eventsService, sessionService, followUser, $window, authService, Utils, locationService, $mdDialog, config, deviceDetector, $ocLazyLoad) {
        let user = authService.getUser();
        let session = authService.getSession();
        let qbsession = {};
        $scope.user = user;
        $scope.forms = {};
        $scope.isUpdated = false;
        $scope.loading = false;
        $scope.imageSelected = false;
        $scope.isCropped = false;
        $scope.enableUpdate = false;
        $scope.editUser = null;
        $scope.defaultProfileImage = '../img/defaultProfilePic.png';
        $scope.editPhoto = false;
        $scope.emailFormat = /^[a-z]+[a-z0-9._]+@[a-z]+\.[a-z.]{2,5}$/;
        $scope.isMobile = window.matchMedia("only screen and (max-width: 1024px)");
        $scope.mobile_number_disable = true;
        $scope.countryCode = "+1";
        $scope.validateMobile = true;
        $scope.mobile_number = '';
        $scope.countryCodeValue = '';
        $scope.aboutCount = 150;

        $scope.chngMobileNum = (form, value) => {
            $scope.loading = true;
            $scope.countryCode = $('#countryCodeValue').text();
            let mobileNumber = /^[0-9]{9,13}$/;
            $scope.mobileNumber = value;
            if (!mobileNumber.test(value)) {
                $scope.mobileNumberError = true;
                $scope.loading = false;
                return false;
            } else if (!$scope.mobileNumber) {
                form.mobile_number.$invalid = true;
                $scope.loading = false;
                return false;
            }
            let dial_code = ($scope.countryCode).replace('+', '');
            let mobile_number = ($scope.mobileNumber).toString();

            let otp_verification_data = {
                "mobile_number": mobile_number,
                "country_code": dial_code,
                "verify_type": 'editprofile'
            };

            authService.put('otp_verification_data', JSON.stringify(otp_verification_data));
            var token = authService.get('token');
            apiService.resendOTP(otp_verification_data, token).then((response) => {

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
                        location.href = "/profile-otp-verify";
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

        $scope.makeMobileNumberEnable = function() {
            $scope.mobile_number_disable = false;
        };

        $scope.init = () => {
            $.get("https://ipapi.co/json/").then(function(response) {
                $scope.countryCodeValue = response.country_calling_code;
                Utils.applyChanges($scope);
            });
            $("body").removeClass("modal-open");
            if (!user) {
                location.href = "/login";
            }
            $scope.editUser = {
                profilePic: user.imgUrl,
                username: user.full_name,
                email: user.email,
                mobile_number: user.mobile_number,
                firstName: user.first_name,
                lastName: user.last_name,
                city: user.city,
                city_lat: user.city_lat,
                city_long: user.city_long,
                aboutYou: user.about_you
            };
            $ocLazyLoad.load({
                insertBefore: '#load_js_before',
                files: ["bower_components/quickblox/quickblox.min.js"],
                cache: true
            }).then(() => {
                qbService.initQBApp().then((res) => {
                    qbsession = res;
                });
            });
        };

        $scope.changeEmail = (form) => {
            if (!$scope.editUser.email) {
                form.email.$invalid = true;
                $scope.loading = false;
                return false;
            }
        };

        $scope.updateUser = () => {
            if (!($scope.editUser.firstName && $scope.editUser.firstName.length > 0)) {
                Utils.showError($scope, "Please Enter the First Name.");
                return;
            }
            $scope.isUpdated = false;
            $scope.enableUpdate = true;
            $scope.loading = true;
            let userUp = null;
            $scope.getUpdatedData()
                .then((response) => {
                    var sess = authService.getSession('session');
                    userUp = response;
                    let token = authService.get('token');
                    return apiService.updateUserProfile(token, userUp);
                })
                .then(response => {
                    $scope.loading = false;
                    if (response.status == 200) {

                        let data = response.data;
                        if (data.success) {
                            let user_info = {};
                            user_info.user_id = user.user_id;
                            user_info.first_name = userUp.first_name;
                            user_info.last_name = userUp.last_name;
                            user_info.full_name = user.full_name;
                            user_info.email = userUp.email;
                            user_info.mobile_number = user.mobile_number;
                            user_info.city = userUp.city;
                            user_info.city_lat = userUp.city_lat;
                            user_info.city_long = userUp.city_long;
                            user_info.about_you = userUp.about_you;
                            user_info.logo = userUp.logo;
                            user_info.url = userUp.url;
                            user_info.website_name = userUp.website_name;
                            user_info.stripe_account_id = userUp.stripe_account_id;
                            user_info.stripe_customer_id = userUp.stripe_customer_id;
                            user_info.is_verified = userUp.is_verified;
                            user_info.is_zone_owner = userUp.is_zone_owner;
                            user_info.is_zone_member = data.is_zone_member;
                            user_info.charges_enabled = data.charges_enabled;
                            user_info.payouts_enabled = data.payouts_enabled;
                            user_info.selectedPlan = {};
                            user_info.selectedPlan.id = user.selectedPlan.id;
                            if (userUp.profile_pic !== null) {
                                user_info.imgUrl = userUp.profile_pic;
                            } else if (userUp.profile_pic !== undefined) {
                                user_info.imgUrl = userUp.profile_pic;
                            } else if (user_info.imgUrl !== null) {
                                user_info.imgUrl = userUp.profile_pic;
                            } else {
                                user_info.imgUrl = '../img/defaultProfilePic.png';
                            }
                            authService.putWithExpiry('user', JSON.stringify(user_info));
                            let locationData = {
                                lat: userUp.city_lat,
                                lng: userUp.city_long,
                                address: $scope.editUser.city
                            };
                            authService.putWithExpiry('lastSearchedLocation', JSON.stringify(locationData));
                            let notify = {
                                type: 'success',
                                title: 'Success',
                                content: 'Profile successfully updated',
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            $scope.loading = false;
                            location.href = "/myprofile";

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
                        console.log(err);
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
                    console.log(err);
                    let notify = {
                        type: 'error',
                        title: 'Error',
                        content: 'User Profile updation failed. Please try again later',
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    $scope.loading = false;
                }).finally(() => {
                    $scope.loading = false;
                });

        };

        $scope.chngPassword = (form) => {
            $scope.enableUpdate = true;
            $scope.loading = true;
            if (!$scope.editUser.currentPassword && !$scope.editUser.newPassword && !$scope.editUser.confPassword) {
                form.currentPassword.$invalid = true;
                form.newPassword.$invalid = true;
                form.confPassword.$invalid = true;
                $scope.loading = false;
                return false;
            } else if (!$scope.editUser.currentPassword && !$scope.editUser.newPassword) {
                form.currentPassword.$invalid = true;
                form.newPassword.$invalid = true;
                $scope.loading = false;
                return false;
            } else if (!$scope.editUser.newPassword && !$scope.editUser.confPassword) {
                form.newPassword.$invalid = true;
                form.confPassword.$invalid = true;
                $scope.loading = false;
                return false;
            } else if (!$scope.editUser.confPassword && !$scope.editUser.currentPassword) {
                form.currentPassword.$invalid = true;
                form.confPassword.$invalid = true;
                $scope.loading = false;
                return false;
            } else {
                if (!$scope.editUser.currentPassword) {
                    form.currentPassword.$invalid = true;
                    $scope.loading = false;
                    return false;
                } else if (!$scope.editUser.newPassword) {
                    form.newPassword.$invalid = true;
                    $scope.loading = false;
                    return false;
                } else if (!$scope.editUser.confPassword) {
                    form.confPassword.$invalid = true;
                    $scope.loading = false;
                    return false;
                }
            }

            let user = {
                'currentPassword': $scope.editUser.currentPassword,
                'newPassword': $scope.editUser.newPassword
            };
            let isError = false;
            let notify = {
                type: 'error',
                title: 'OOPS!!',
                content: 'Error',
                timeout: 5000 //time in ms
            };

            if (!$scope.editUser.currentPassword) {
                notify.content = "Please enter old password";
                isError = true;
            } else if (!$scope.editUser.newPassword) {
                notify.content = "Please enter new password";
                isError = true;
            } else if ($scope.editUser.newPassword != $scope.editUser.confPassword) {
                notify.content = "Password do not match";
                isError = true;
            }

            if (!isError) {
                let token = authService.get('token');
                apiService.changePassword(token, user).then(response => {
                        if (response.status == 200) {
                            let data = response.data;
                            if (data.success) {
                                let notify = {
                                    type: 'success',
                                    title: 'Success',
                                    content: 'Your password successfully changed!',
                                    timeout: 5000 //time in ms
                                };
                                $scope.$emit('notify', notify);
                                location.href = "/myprofile";
                            } else {
                                let notify = {
                                    type: 'error',
                                    title: 'OOPS!!',
                                    content: data.message,
                                    timeout: 5000 //time in ms
                                };
                                $scope.$emit('notify', notify);
                            }
                            Utils.applyChanges($scope);
                            $scope.loading = false;
                        } else {
                            console.log(err);
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
                        console.log(err);
                        console.log('Change Password updation failed. Please try again later');
                    });
            } else {
                $scope.$emit('notify', notify);
                $scope.loading = false;
            }
            return false;
        };

        $scope.inputType = 'password';
        $scope.hideShowPassword = function() {
            if ($scope.inputType == 'password')
                $scope.inputType = 'text';
            else
                $scope.inputType = 'password';
        };


        $scope.inputTypeNew = 'password';
        $scope.hideShowPasswordNew = function() {
            if ($scope.inputTypeNew == 'password')
                $scope.inputTypeNew = 'text';
            else
                $scope.inputTypeNew = 'password';
        };

        $scope.inputTypeCon = 'password';
        $scope.hideShowPasswordCon = function() {
            if ($scope.inputTypeCon == 'password')
                $scope.inputTypeCon = 'text';
            else
                $scope.inputTypeCon = 'password';
        };


        $scope.guestUser = null;
        $scope.goToPage = function(page) {
            location.href = page;
        };

        function dataURItoBlob(dataURI) {
            // convert base64/URLEncoded data component to raw binary data held in a string
            var byteString;
            if (dataURI.split(',')[0].indexOf('base64') >= 0)
                byteString = atob(dataURI.split(',')[1]);
            else
                byteString = unescape(dataURI.split(',')[1]);

            // separate out the mime component
            var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

            // write the bytes of the string to a typed array
            var ia = new Uint8Array(byteString.length);
            for (var i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }

            return new Blob([ia], { type: mimeString });
        }

        $scope.getUpdatedData = () => {

            return new Promise((resolve, reject) => {
                Utils.applyChanges($scope);
                let promise = null;
                if ($scope.files) {
                    let fileName = $scope.user.user_id + '-' + Date.now() + '.png';
                    let blob = dataURItoBlob($scope.files);
                    let file = new File([blob], fileName);
                    let aws_config = {
                        'bucket': config.AWS_BUCKET,
                        'access_key': config.AWS_ACCESS_KEY,
                        'secret_key': config.AWS_SECRET_KEY,
                        'region': config.AWS_REGION,
                        'path': config.USER_IMG_UPLOAD_FOLDER,
                        'img_show_url': config.AWS_IMG_SHOW_URL
                    };
                    promise = eventsService.uploadImg(file, aws_config);
                } else {
                    promise = Promise.resolve(null);
                }
                promise.then(res => {
                        let userUp = {
                            first_name: $scope.editUser.firstName,
                            last_name: $scope.editUser.lastName,
                            email: $scope.editUser.email,
                            about_you: ($scope.editUser.aboutYou) ? $scope.editUser.aboutYou : '',
                            city: $scope.editUser.city,
                            city_lat: ($scope.editUser.city_lat).toString(),
                            city_long: ($scope.editUser.city_long).toString(),
                        };
                        if (res && 'file_url' in res && res !== null) {
                            userUp.profile_pic = res.file_url;
                        } else {
                            if ($scope.user.imgUrl != null) {
                                userUp.profile_pic = $scope.user.imgUrl;
                            } else {
                                userUp.profile_pic = '../img/defaultProfilePic.png';
                            }
                        }
                        let userUps = { "full_name": userUp.first_name + " " + userUp.last_name, "custom_data": "set" };
                        qbService.updateUserProfile($scope.user.quickblox_id, userUps);
                        resolve(userUp);
                    })
                    .catch(err => {
                        alert('Profile picture could not be updated. please try again.');
                        reject(err);
                    });
            });
        };

        $scope.$watch('loct', function() {
            if ($scope.loct) {
                $scope.editUser.city_lat = $scope.loct.lat;
                $scope.editUser.city_long = $scope.loct.long;
                if ('city' in $scope.loct && $scope.loct.city) {
                    $scope.editUser.city = $scope.loct.city;
                }
            }
        });

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
                                        $scope.editUser.city = locationResponse.city;
                                    } else if ('address' in locationResponse) {
                                        $scope.editUser.city = locationResponse.address;
                                    }

                                    $scope.editUser.city_lat = locationResponse.lat;
                                    $scope.editUser.city_long = locationResponse.lng;
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
                                $scope.editUser.city = locationResponse.city;
                            } else if ('address' in locationResponse) {
                                $scope.editUser.city = locationResponse.address;
                            }

                            $scope.editUser.city_lat = locationResponse.lat;
                            $scope.editUser.city_long = locationResponse.lng;
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
                            $scope.editUser.city = locationResponse.city;
                        } else if ('address' in locationResponse) {
                            $scope.editUser.city = locationResponse.address;
                        }

                        $scope.editUser.city_lat = locationResponse.lat;
                        $scope.editUser.city_long = locationResponse.lng;
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
                                    $scope.editUser.city = locationResponse.city;
                                } else if ('address' in locationResponse) {
                                    $scope.editUser.city = locationResponse.address;
                                }

                                $scope.editUser.city_lat = locationResponse.lat;
                                $scope.editUser.city_long = locationResponse.lng;
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
                            $scope.editUser.city = locationResponse.city;
                        } else if ('address' in locationResponse) {
                            $scope.editUser.city = locationResponse.address;
                        }

                        $scope.editUser.city_lat = locationResponse.lat;
                        $scope.editUser.city_long = locationResponse.lng;
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

        $scope.handleFileSelect = function(files, evt, invalidFiles, isMobile) {
            let file = files;
            if (file) {
                let reader = new FileReader();
                $scope.imageSelected = true;
                reader.onload = function(evt) {
                    $scope.$apply(function($scope) {
                        $scope.myImage = evt.target.result;

                        if (!isMobile) {
                            $mdDialog.show({
                                    controller: ['$scope', '$mdDialog', 'imageForCropping', function($scope, $mdDialog, imageForCropping) {
                                        $scope.imageForCropping = imageForCropping;
                                        $scope.croppedImage = null;
                                        $scope.closeDialog = function(state) {
                                            $mdDialog.hide({ state: state, image: $scope.croppedImage });
                                        };
                                    }],
                                    templateUrl: 'cropImage.html',
                                    parent: angular.element(document.body),
                                    clickOutsideToClose: false,
                                    fullscreen: true,
                                    locals: {
                                        imageForCropping: $scope.myImage
                                    },
                                    onShowing: function(scope, element) {
                                        element.addClass('pa-background-white');
                                    }
                                })
                                .then(function(state) {

                                    if (state.state === 'save') {
                                        $scope.files = state.image;
                                        $scope.mfiles = (state.image).replace('data:base64', 'data:image/jpeg;base64');
                                        $scope.selectImage();
                                    } else {
                                        $scope.revertImage();
                                    }
                                }, function() {
                                    $scope.status = 'You cancelled the dialog.';
                                });
                        }
                    });
                };
                reader.readAsDataURL(file);
            }
        };

        // This function is used to click file selector
        $scope.clickImageSelector = function() {
            angular.element('#ngf-image-selector').click();
        };

        $scope.selectImage = function(isMobile) {
            if (isMobile) {
                $scope.files = $scope.croppedImage;
            }
            $scope.imageSelected = false;
            $scope.editPhoto = true;
        };

        $scope.revertImage = function() {

            $scope.files = ($scope.editUser.profilePic || $scope.defaultProfileImage);
            $scope.imageSelected = false;
            if (!$scope.editUser.profilePic) {
                $scope.editPhoto = false;
            }
        };

        $scope.editProfileEvent = function(event) {
            $window.location.href = Utils.getEditUrl(event._id);
        };
        $scope.deleteProfileEvent = function(event) {
            deleteEvent(event.id);
        };
        $scope.cancel = function() {
            this.$dismiss('close');
        };
        //---------------------------------------------code for chat ends here------------------------
        $scope.init();
    }]).directive('backImg', function() {
        return function(scope, element, attrs) {
            var url = attrs.backImg;
            element.css({
                'background-image': 'url(' + url + ')',
                'background-size': 'cover'
            });
        };
    }).filter('start', function() {
        return function(input, start) {
            if (!input || !input.length) {
                return;
            }
            start = +start;
            return input.slice(start);
        };
    });