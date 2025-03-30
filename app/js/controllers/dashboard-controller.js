angular.module('PromoApp')
    .controller('DashboardController', ['$scope', '$route', 'metaTagsService', 'Utils', 'authService', 'apiService', 'locationService', '$window', '$uibModal', 'deviceDetector', 'userService', function($scope, $route, metaTagsService, Utils, authService, apiService, locationService, $window, $uibModal, deviceDetector, userService) {
        $scope.forMacOnly = false;
        $scope.loading = false;
        $scope.zoneID = $route.current.params.zoneId;
        $scope.zoneList = 0;
        $scope.zoneDetails = '';
        $scope.zoneEvents = '';
        $scope.zoneMembers = [];
        $scope.zoneOwners = '';
        $scope.zoneEventOrganizer = [];
        $scope.zoneUrl = '';
        $scope.curretZoneName = '';
        $scope.selectedItem = '';
        $scope.userList = [];
        $scope.inviteModalscope = '';
        $scope.userListData = [];
        $scope.userFollowListData = [];
        $scope.selectedUsers = {
            selectedUser: []
        };
        $scope.limitDesc = 240;
        $scope.errorMail = false;
        $scope.signup_type = 1;
        $scope.currentZoneData = '';
        $scope.pagination = {
            currentPage: 1,
            numPerPage: 10,
            maxSize: 5
        };
        $scope.dropdowns = {
            userData: {
                selectAll: "Tick all",
                selectNone: "Select none",
                reset: "Undo all",
                search: "Type here to search...",
                nothingSelected: "Select User..." //default-label is deprecated and replaced with this.
            },
        };
        $scope.styleForMacOnly = () => {
            if (navigator.userAgent.indexOf('Mac OS X') != -1) {
                $("body").addClass("mac");
                $scope.forMacOnly = true;
            }
        };

        /*
         ** Check Valid Email
         */
        $scope.checkAllValidMail = function() {
            var exp = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
            for (var i of $scope.selectedUsers.selectedUser) {
                if (exp.test(i.email)) {
                    $scope.errorMail = false;
                } else {
                    $scope.errorMail = true;
                    $scope.selectedUsers.selectedUser.slice(i, 1);
                    break;
                }
            }
        };

        $scope.afterSelection = function($item) {};

        $scope.afterRemoving = function($item) {};

        $scope.tagTransform = function(newTag) {
            var item = {
                user_id: '',
                username: '',
                first_name: newTag,
                last_name: '',
                email: newTag.toLowerCase(),
                iconImage: '../img/defaultProfilePic.png'
            };
            return item;
        };

        /*
         ** Link Copy of the zone signup
         */
        $scope.copyLink = () => {
            let notify = {
                type: 'success',
                title: 'Success',
                content: 'Zone Registration URL Copied Successfully.',
                timeout: 1500 //time in ms
            };
            $scope.$emit('notify', notify);
        };

        /*
         ** Get Zone List
         */
        $scope.getZoneList = () => {
            $scope.loading = true;
            let token = authService.get('token');
            apiService.getZoneList(token).then((response) => {
                if (response.data.success) {
                    $scope.zoneList = response.data.data.data;
                    let hostDomain = window.location.host;
                    $scope.zoneList.forEach(function(data) {
                        if (data.zone_id == $scope.zoneID) {
                            $scope.currentZoneData = data;
                            $scope.curretZoneName = data.name;
                            let dataName = data.name.replace(/[^a-zA-Z ]/g, "").replace(/\W+(?!$)/g, '-').toLowerCase();
                            // Go to detail page
                            $scope.zoneUrl = `${hostDomain}/signup/${dataName}/${data.zone_id}`;
                        }
                    });
                    Utils.applyChanges($scope);
                } else {
                    $scope.goToPage("/");
                }
            }).catch((err) => {
                console.log("Get Zone List", err);
            }).finally(() => {
                $scope.loading = false;
            });
        };

        /*
         ** Get Zone Details
         */
        $scope.getZoneDetails = (id) => {
            $scope.loading = true;
            let token = authService.get('token');
            apiService.getZoneDetail(token, id).then((response) => {
                if (response.data.success) {
                    $scope.zoneDetails = response.data.data;
                }
                Utils.applyChanges($scope);
            }).catch((err) => {
                console.log("Get Zone Details", err);
            }).finally(() => {
                $scope.loading = false;
            });
        };

        /*
         ** Get Zone Events
         */
        $scope.getZoneEvents = (id) => {
            $scope.loading = true;
            let token = authService.get('token');
            apiService.getZoneEvents(token, id).then((response) => {
                if (response.data.success) {
                    $scope.zoneEvents = response.data.data.data;
                }
                Utils.applyChanges($scope);
            }).catch((err) => {
                console.log("Get Zone Details", err);
            }).finally(() => {
                $scope.loading = false;
            });
        };

        /*
         ** Get Zone Members
         */
        $scope.getZoneMembers = (id) => {
            $scope.loading = true;
            let token = authService.get('token');
            apiService.getZoneMembers(token, id).then((response) => {
                if (response.data.success) {
                    let zoneMembers = response.data.data.data;
                    if (zoneMembers.length > 0) {
                        zoneMembers.forEach((data) => {
                            if (data.is_block == 0) {
                                data.is_block = 1;
                            } else {
                                data.is_block = 0;
                            }
                            $scope.zoneMembers.push(data);
                        });
                    } else {
                        $scope.zoneMembers = [];
                    }
                    Utils.applyChanges($scope);
                }
            }).catch((err) => {
                console.log("Get Zone Members", err);
            }).finally(() => {
                $scope.loading = false;
            });
        };

        /*
         ** Get Zone Owners
         */
        $scope.getZoneOwners = (id) => {
            $scope.loading = true;
            let token = authService.get('token');
            apiService.getZoneOwners(token, id).then((response) => {
                if (response.data.success) {
                    $scope.zoneOwners = response.data.data.data;
                    Utils.applyChanges($scope);
                }
            }).catch((err) => {
                console.log("Get Zone Owners", err);
            }).finally(() => {
                $scope.loading = false;
            });
        };

        /*
         ** Get Zone Event Organizer
         */
        $scope.getEventOrganizer = (id) => {
            $scope.loading = true;
            let token = authService.get('token');
            apiService.getZoneEventOrganizer(token, id).then((response) => {
                if (response.data.success) {
                    let zoneEventOrganizer = response.data.data.data;
                    if (zoneEventOrganizer.length > 0) {
                        zoneEventOrganizer.forEach((data) => {
                            if (data.is_block == 0) {
                                data.is_block = 1;
                            } else {
                                data.is_block = 0;
                            }
                            $scope.zoneEventOrganizer.push(data);
                        });
                    } else {
                        $scope.zoneEventOrganizer = [];
                    }
                    Utils.applyChanges($scope);
                }
            }).catch((err) => {
                console.log("Get Zone Event Organizer", err);
            }).finally(() => {
                $scope.loading = false;
            });
        };

        /*
         ** Zone Change
         */
        $scope.zoneListSelected = (id) => {
            $window.location.href = `/zoneDashboard/${id}`;
            Utils.applyChanges($scope);
        };

        /*
         ** Remove Zone Member
         */
        $scope.deleteZoneMember = (id) => {
            $scope.loading = true;
            let token = authService.get('token');
            let zoneId = $scope.zoneID;
            apiService.deleteZoneMember(token, id, zoneId).then((response) => {
                if (response.data.success) {
                    let notify = {
                        type: 'success',
                        title: 'Success',
                        content: 'Zone Member Removed Successfully.',
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    $scope.getZoneMembers($scope.zoneID);
                }
            }).catch((err) => {
                console.log("Delete Zone Member", err);
            }).finally(() => {
                $scope.loading = false;
            });
        };

        /*
         ** Goto Page
         */
        $scope.goToPage = function(page, userid, zoneId) {
            if (userid) {
                page += userid;
            }

            if (zoneId) {
                location.href = page + '?zpId=' + zoneId;
            } else {
                location.href = page;
            }
        };


        /*
         ** Signup Zone Member
         */
        $scope.inputType = 'password';
        $scope.hideShowPassword = function() {
            if ($scope.inputType == 'password')
                $scope.inputType = 'text';
            else
                $scope.inputType = 'password';
        };

        $scope.signUp = (e) => {
            e.preventDefault();
            $scope.loading = true;
            $scope.signupFormEmail.$invalid = true;
            let user = {
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
                                $scope.$emit('notify', notify1);
                                $scope.$emit('notify', notify2);
                                let signupToken = data.data.token;
                                apiService.addZoneMember(signupToken, $scope.zoneID).then((resData) => {
                                    let notify3 = {
                                        type: 'success',
                                        title: 'Success',
                                        content: resData.data.message,
                                        timeout: 5000 //time in ms
                                    };
                                    $scope.$emit('notify', notify3);
                                }).catch(err => {
                                    $scope.loading = false;
                                    console.log(err);
                                    let notify = {
                                        type: 'error',
                                        title: 'OOPS!!',
                                        content: "Sorry something went wrong. Please try later.",
                                        timeout: 5000 //time in ms
                                    };
                                    $scope.$emit('notify', notify);
                                }).finally((err) => {
                                    $scope.loading = false;
                                    location.href = "/login";
                                });
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
                                content: "Sorry something went wrong. Please try later.",
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            Utils.applyChanges($scope);
                        }
                    })
                    .catch(err => {
                        $scope.loading = false;
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: err.data.message,
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        Utils.applyChanges($scope);
                    });
            } else {
                $scope.$emit('notify', notify);
                $scope.loading = false;
            }
            return false;
        };

        /*
         ** Get Location
         */

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
                                    if ('address' in locationResponse) {
                                        $scope.location.city = locationResponse.address;
                                    } else if ('city' in locationResponse) {
                                        $scope.location.city = locationResponse.city;
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
                            if ('address' in locationResponse) {
                                $scope.location.city = locationResponse.address;
                            } else if ('city' in locationResponse) {
                                $scope.location.city = locationResponse.city;
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
                        if ('address' in locationResponse) {
                            $scope.location.city = locationResponse.address;
                        } else if ('city' in locationResponse) {
                            $scope.location.city = locationResponse.city;
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
                                if ('address' in locationResponse) {
                                    $scope.location.city = locationResponse.address;
                                } else if ('city' in locationResponse) {
                                    $scope.location.city = locationResponse.city;
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
                        if ('address' in locationResponse) {
                            $scope.location.city = locationResponse.address;
                        } else if ('city' in locationResponse) {
                            $scope.location.city = locationResponse.city;
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

        $scope.passwordHasNumber = (password) => {
            return /\d/.test(password);
        };

        $scope.passwordHasUpperCase = (password) => {
            return /[A-Z]/.test(password);
        };

        $scope.passwordHasSpecialCharacter = (password) => {
            return /[$@$!%*#?&]/.test(password);
        };

        /*
         ** Block Zone Member
         */
        $scope.activeDeactiveMember = (userId, blockFlag) => {
            $scope.loading = true;
            let token = authService.get('token');
            let zoneId = $scope.zoneID;
            let bFlag = '';
            if (blockFlag) {
                bFlag = 0;
            } else {
                bFlag = 1;
            }
            let data = {
                "zone_id": zoneId,
                "is_block": bFlag
            };
            apiService.blockZoneMember(token, userId, data).then((response) => {
                if (response.data.success) {
                    let content = '';
                    if (blockFlag) {
                        content = "Zone member unblocked successfully.";
                    } else {
                        content = "Zone member blocked successfully.";
                    }
                    let notify = {
                        type: 'success',
                        title: 'Success',
                        content: content,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    Utils.applyChanges($scope);
                }
            }).catch((err) => {
                console.log("Delete Zone Member", err);
            }).finally(() => {
                $scope.loading = false;
            });
        };

        /*
         ** Block Zone Organizer
         */
        $scope.activeDeactiveOrganizer = (userId, blockFlag) => {
            $scope.loading = true;
            let token = authService.get('token');
            let zoneId = $scope.zoneID;
            let bFlag = '';
            if (blockFlag) {
                bFlag = 0;
            } else {
                bFlag = 1;
            }
            let data = {
                "zone_id": zoneId,
                "is_block": bFlag
            };
            apiService.blockZoneOrganizer(token, userId, data).then((response) => {
                if (response.data.success) {
                    let content = '';
                    if (blockFlag) {
                        content = "Zone Organizer unblocked successfully.";
                    } else {
                        content = "Zone Organizer blocked successfully.";
                    }
                    let notify = {
                        type: 'success',
                        title: 'Success',
                        content: content,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    Utils.applyChanges($scope);
                }
            }).catch((err) => {
                console.log("Delete Zone Organizer", err);
            }).finally(() => {
                $scope.loading = false;
            });
        };

        /*
         ** Remove Zone Organizer
         */
        $scope.deleteZoneOrganizer = (id) => {
            $scope.loading = true;
            let token = authService.get('token');
            let zoneId = $scope.zoneID;
            apiService.removeZoneOrganiser(token, zoneId, id).then((response) => {
                if (response.data.success) {
                    let notify = {
                        type: 'success',
                        title: 'Success',
                        content: 'Zone Organizer Removed Successfully.',
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    $scope.getEventOrganizer($scope.zoneID);
                }
            }).catch((err) => {
                console.log("Delete Zone Organiser", err);
            }).finally(() => {
                $scope.loading = false;
            });
        };

        /*
         ** Leave Zone Confirmation Modal
         */
        $scope.removeZoneConfirmation = (zoneId, zoneStatus) => {
            let eventModelScope = $scope.$new(false, $scope);
            eventModelScope.status = zoneStatus;
            $scope.confirmPublishTicketModel = $uibModal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: '../../partials/zone/leaveZoneConfirmationModal.html',
                openedClass: 'pa-create-event-modal add-link-modal ticket-popup-new-ui scroll_popup',
                scope: eventModelScope,
                size: 'md'
            });
        };

        /*
         ** Leave Zone
         */
        $scope.leaveZoneOwner = () => {
            $scope.loading = true;
            let token = authService.get('token');
            let zoneId = $scope.zoneID;
            let data = {
                "zone_id": zoneId
            };
            apiService.leaveZone(token, data).then((response) => {
                if (response.data.success) {
                    let notify = {
                        type: 'success',
                        title: 'Success',
                        content: 'Zone leaved successfully.',
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    setTimeout(function() {
                        $scope.goToPage("/myzone");
                    }, 1500);
                }
            }).catch((err) => {
                console.log("Leave Zone Member", err);
            }).finally(() => {
                $scope.loading = false;
            });
        };

        /*
         ** Remove User Confirmation Modal
         */
        $scope.removeUserConfirmation = (id, status) => {
            let eventModelScope = $scope.$new(false, $scope);
            eventModelScope.userId = id;
            eventModelScope.status = status;
            $scope.confirmPublishTicketModel = $uibModal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: '../partials/zone/removeFromZoneConfirmationModal.html',
                openedClass: 'pa-create-event-modal add-link-modal ticket-popup-new-ui scroll_popup',
                scope: eventModelScope,
                size: 'md'
            });
        };

        /*
         ** Get All User List
         */
        $scope.getAllUserList = () => {
            $scope.loading = true;
            userService.getUsersFollowList().then((response) => {
                if (response.data.success) {
                    $scope.userList = [];
                    Utils.applyChanges($scope);
                    $scope.userList.push(...response.data.data.followerList);
                    $scope.userList.push(...response.data.data.followingList);
                    angular.forEach($scope.userList, function(element) {
                        if (element.first_name) {
                            element.username = element.first_name + ' ' + element.last_name;
                        }
                        if (element.profile_pic) {
                            element.iconImage = element.profile_pic || '../img/defaultProfilePic.png';
                        } else {
                            element.iconImage = '../img/defaultProfilePic.png';
                        }

                        let newElement = {
                            "id": element.user_id,
                            "name": element.username,
                            "first_name": element.first_name,
                            "last_name": element.last_name,
                            "email": element.email,
                            "iconImage": element.iconImage
                        };
                        if (element.email != '') {
                            $scope.userListData.push(newElement);
                        }
                    });

                    Utils.applyChanges($scope);
                }
            }).catch((err) => {
                console.log("Get User List", err);
            }).finally(() => {
                $scope.loading = false;
            });
        };

        /*
         ** Invite User Modal
         */
        $scope.inviteUserModal = (action) => {
            let modalScope = $scope.$new(false, $scope);
            modalScope.status = action;
            $scope.userListData = [];
            Utils.applyChanges($scope);
            $scope.getAllUserList();
            $scope.inviteModalscope = $uibModal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                backdrop: 'static',
                templateUrl: './partials/zone/inviteUserModal.html',
                windowClass: 'pa-common-modal-style tt-scan-qr-modal',
                openedClass: 'attendee_main_parent invitemodal add_existing_user_model scroll_popup',
                scope: modalScope,
                size: 'sm'
            });
            Utils.applyChanges($scope);
        };

        /*
         ** Invite Zone Owner
         */
        $scope.inviteOwnerZone = (selectedData) => {
            $scope.loading = true;
            let token = authService.get('token');
            let sendingData = [];
            selectedData.forEach((data) => {
                let newElement = {
                    "user_id": data.id,
                    "username": data.name,
                    "first_name": data.first_name,
                    "last_name": data.last_name,
                    "email": data.email,
                    "profile_pic": data.iconImage
                };
                sendingData.push(newElement);
            });
            let data = {
                "invitationToZone": $scope.currentZoneData,
                "invitationsToUsers": sendingData
            };
            apiService.inviteOwnerZone(token, data).then((response) => {
                if (response.data.success) {
                    let notify = {
                        type: 'success',
                        title: 'Success',
                        content: response.data.message,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    $scope.zoneOwners = [];
                    $scope.getZoneOwners($scope.zoneID);
                    $scope.inviteModalscope.close();
                }
            }).catch((err) => {
                console.log("Invite Zone Owners", err);
            }).finally(() => {
                $scope.loading = false;
            });
        };

        /*
         ** Invite Zone Member
         */
        $scope.inviteMemberZone = (selectedData) => {
            $scope.loading = true;
            let token = authService.get('token');
            let sendingData = [];
            selectedData.forEach((data) => {
                let newElement = {
                    "user_id": data.id,
                    "username": data.name,
                    "first_name": data.first_name,
                    "last_name": data.last_name,
                    "email": data.email,
                    "profile_pic": data.iconImage
                };
                sendingData.push(newElement);
            });
            let data = {
                "invitationToZone": $scope.currentZoneData,
                "invitationsToUsers": sendingData
            };
            apiService.inviteMemberZone(token, data).then((response) => {
                if (response.data.success) {
                    let notify = {
                        type: 'success',
                        title: 'Success',
                        content: response.data.message,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    $scope.zoneMembers = [];
                    $scope.getZoneMembers($scope.zoneID);
                    $scope.inviteModalscope.close();
                }
            }).catch((err) => {
                console.log("Invite Zone Member", err);
            }).finally(() => {
                $scope.loading = false;
            });
        };

        /*
         ** Invite Zone Organizer
         */
        $scope.inviteOrganizerZone = (selectedData) => {
            $scope.loading = true;
            let token = authService.get('token');
            let sendingData = [];
            selectedData.forEach((data) => {
                let newElement = {
                    "user_id": data.id,
                    "username": data.name,
                    "first_name": data.first_name,
                    "last_name": data.last_name,
                    "email": data.email,
                    "profile_pic": data.iconImage
                };
                sendingData.push(newElement);
            });
            let data = {
                "invitationToZone": $scope.currentZoneData,
                "invitationsToUsers": sendingData
            };
            apiService.inviteOrganizerZone(token, data).then((response) => {
                if (response.data.success) {
                    let notify = {
                        type: 'success',
                        title: 'Success',
                        content: response.data.message,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    $scope.zoneEventOrganizer = [];
                    $scope.getEventOrganizer($scope.zoneID);
                    $scope.inviteModalscope.close();
                }
            }).catch((err) => {
                console.log("Invite Zone Organizer", err);
            }).finally(() => {
                $scope.loading = false;
            });
        };

        /*
         ** Close Modal Function
         */
        $scope.cancel = function() {
            this.$dismiss('close');
        };

        /*
         ** Init Function
         */
        $scope.init = () => {
            $scope.user = JSON.parse(localStorage.getItem('user'));
            $scope.styleForMacOnly();
            $scope.selectedItem = $scope.zoneID;
            if ($scope.user) {
                if (!$scope.user.is_zone_owner) {
                    $scope.goToPage("/");
                } else {
                    if ($scope.zoneID != undefined && $scope.user != null && $scope.user.is_zone_owner) {
                        $scope.getZoneEvents($scope.zoneID);
                        $scope.getZoneMembers($scope.zoneID);
                        $scope.getZoneOwners($scope.zoneID);
                        $scope.getEventOrganizer($scope.zoneID);
                        $scope.getZoneDetails($scope.zoneID);
                    }
                    if ($scope.user != null && $scope.user.is_zone_owner) {
                        $scope.getZoneList();
                    }
                }
            }
            metaTagsService.setDefaultTags({
                'title': "The Promo App | Social Event Management Network - Find Events or Create Your Own",
                'description': "Make your every social event & event management work easier than ever before with The Promo App. Find events, buy and sell tickets; promote events, and more at one platform.",
                'keywords': 'Social Event Management Network, Online events, Event Management Network',
                // OpenGraph
                'og:site_name': 'thepromoapp',
                'og:title': 'The Best Events',
                'og:description': 'Bringing you and your friends together in real life at incredible events',
                'og:image': '/img/event-promo-app.jpeg',
                'og:url': 'https://thepromoapp.com',
                // Twitter
                'twitter:title': 'Thousands of Events',
                'twitter:description': "Have a social life again - bring your friends",
                'twitter:image': '/img/event-promo-app.jpeg',
                'twitter:card': '/img/event-promo-app.jpeg',
            });
        };

        $scope.init();
    }]);