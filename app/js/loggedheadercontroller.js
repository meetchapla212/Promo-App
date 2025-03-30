var app = angular.module('PromoApp');
app.controller('LoggedHeaderController', ['qbService', 'apiService', '$scope', 'authService', '$uibModal', '$location', 'Utils', 'config', 'userService', '$route', function(qbService, apiService, $scope, authService, $uibModal, $location, Utils, config, userService, $route) {
    $scope.username = '';
    $scope.profilePic = '';
    $scope.userUnreadMessageCount = 0;
    $scope.limitUserName = 7;
    $scope.starhovering = false;
    $scope.notificationshovering = false;
    $scope.searchhovering = false;
    $scope.selectedAll = true;
    $scope.selectedModifiedOption = 'Next 7 Days';
    $scope.closeBanner = true;
    $scope.closeGetAppBanner = true;
    $scope.showAppStoreLink = true;
    $scope.user = null;
    $scope.isCreateEvent = false;
    $scope.icon = null;
    $scope.notificationsclose = false;
    $scope.getclose = false;
    $scope.showMenu = false;

    $scope.logout = () => {
        authService.clearSession();
        location.href = "/login";
        qbService.initQBApp().then((res) => {});
    };

    $scope.GoToProfile = () => {
        location.href = "/myprofile";
    };

    $scope.hradRefresh = () => {
        $route.reload();
    };

    $scope.isSelectedPage = (page, exact) => {
        // Get location href
        if (location.href) {
            if (exact) {
                return location.pathname == page;
            }
            return location.pathname.includes(page);
        }
        return false;
    };

    $scope.validateSession = function() {
        // Check if cookie present
        let userSession = authService.getSession();
        let user = authService.getUser();
        if (userSession && user) {

            $scope.profilePic = user.imgUrl;
            $scope.user = user;
            if (!$scope.profilePic) {
                $scope.profilePic = '../img/defaultProfilePic.png';
            }
            if ('full_name' in user && user.full_name && user.full_name != '') {
                $scope.username = user.full_name;
            } else {
                $scope.username = user.login;
            }

            // Get unread message count
            $scope.userUnreadMessageCount = authService.getObject('userUnreadMessageCount');

            // Check if user has set city name or not
            // If not show city name banner
            // Check if user is already on edit profile page then do not show banner
            if ((location && location.pathname === "/settings") || (user.custom_data && 'city' in user.custom_data && user.custom_data.city)) {
                var x = angular.element('.md-custom-menu-content');
                x.addClass('top-130');
                $scope.closeWebBanner();
            }
        }

    };

    $scope.notificationMethod = () => {
        location.href = "/notifications";
        $scope.notificationshovering = true;
    };

    $scope.init = function() {
        $scope.validateSession();
        $scope.$emit("storeAppLinkSec", $scope.showAppStoreLink);
        $scope.$emit("isWebCityBanner", $scope.closeBanner);
        let queryStringObject = $location.search();
        if (queryStringObject && 'addevent' in queryStringObject) {
            $location.search('addevent', null);
            $location.path('/createevent', null);
        }
        if (navigator.userAgent.indexOf('Mac OS X') != -1) {
            $scope.forMacOnly = true;
        }
        if (navigator.userAgent.match(/Android/i) && navigator.userAgent.match(/Build/i)) {
            $scope.showAppStoreLink = false;
            $scope.$emit("storeAppLinkSec", $scope.showAppStoreLink);
        }

        // Check if create event
        if (window.location.href.includes('/createevent') || window.location.href.includes('/changeadmin')) {
            $scope.isCreateEvent = true;
        }

        let getPastSetItem = localStorage.getItem("rePosMap");
        if (getPastSetItem == 'null' || getPastSetItem == 'true') {
            $scope.closeGetAppBanner = true;
        } else if (getPastSetItem == 'false') {
            $scope.closeGetAppBanner = false;
        }

        // Check if home page
        $scope.icon = null;
        if (window.location.pathname === '/') {
            $scope.icon = 'list';
        }

        if (user && 'is_email_verified' in user && user.is_email_verified === 0) {
            setTimeout(function() {
                userService.getUserProfile(user.user_id)
                    .then((response) => {
                        if (response.status == 200) {
                            let data = response.data;
                            if (data.success) {
                                $scope.userInfo = data.data;
                                if ("is_email_verified" in $scope.userInfo && $scope.userInfo.is_email_verified) {
                                    user.is_email_verified = $scope.userInfo.is_email_verified;
                                    authService.putWithExpiry('user', JSON.stringify(user));
                                    $route.reload();
                                }
                            }
                        }
                    }).catch(err => {}).finally(() => {});
            }, 500);
        }

        if (user) {
            //cdoe to check payout active or not when user  edit event
            userService.getUserProfile(user.user_id).then((response) => {
                if (response && 'data' in response) {
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
                        selectedPlan: {
                            'id': 'unlimited'
                        },
                        logo: user.logo,
                        url: user.url,
                        website_name: user.website_name,
                        stripe_account_id: user.stripe_account_id,
                        stripe_country: user.stripe_country,
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
                    $scope.user = user_info;
                    localStorage.setItem('user', JSON.stringify(user_info));
                    authService.putWithExpiry('user', JSON.stringify(user_info));
                }
            });
        }
    };

    // check city modal when user is login
    let user = authService.getUser();
    $scope.modalCity = false;
    $scope.modalEmailVerify = false;
    $scope.verifcationEmailSend = false;
    if (user && 'city' in user && user.city != '') {
        $scope.modalCity = true;
    }

    if (user && 'is_email_verified' in user && user.is_email_verified == 1) {
        $scope.modalEmailVerify = true;
    }

    $scope.verifyEmail = function() {
        $scope.verifcationEmailSend = true;
        $scope.loading = true;
        let token = authService.get('token');
        apiService.verifyEmail(token).then((response) => {
                if (response.status == 200) {
                    let data = response.data;
                    if (data.success) {
                        let notify = {
                            type: 'success',
                            title: 'Success',
                            content: 'Please follow the instruction we have sent in your email.',
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);

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
                    content: "Sorry something went wrong. Please try later.",
                    timeout: 5000 //time in ms
                };
                $scope.$emit('notify', notify);
            }).finally(() => {
                $scope.loading = false;
            });
    };
    // Login modal
    $scope.openLoginModal = function(eventId, redirect) {
        // create new scope for modal
        let modalScope = $scope.$new(true);

        if (eventId) {
            modalScope.redirectUrl = `/?openevent=${eventId}`;
            modalScope.toSignup = `/signup?redirectSignup=${modalScope.redirectUrl}`;
        }

        if (redirect) {
            modalScope.redirectUrl = redirect;
        }

        var modalInstance = $uibModal.open({
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            backdrop: 'static',
            templateUrl: '../partials/loginModal.html',
            controller: 'LoginModalController',
            controllerAs: 'plm',
            windowClass: 'login-modal login-modal-fix',
            scope: modalScope
        });
    };

    $scope.openCreateEventModal = function() {
        let eventModelScope = $scope.$new(false, $scope);
        eventModelScope.claimEvent = false;
        eventModelScope.action = "Create";
        /** backdrop static to prevent outside close of modal **/
        let modalInstance = $uibModal.open({
            ariaLabelledBy: 'modal-title',
            ariaDescribedBy: 'modal-body',
            templateUrl: '../../partials/addEventModal.html',
            openedClass: 'pa-create-event-modal pa-common-modal-style',
            scope: eventModelScope,
            size: 'lg'

        });
        let body = angular.element('body');
        body.addClass('hideBodyScroll');
        modalInstance.result.then(function(result) {
            body.removeClass('hideBodyScroll');
        }).catch(err => {
            body.removeClass('hideBodyScroll');
        });

    };

    $scope.toggleView = function() {
        $scope.$emit("viewChange", { 'view': $scope.icon });
        if ($scope.icon === 'list') {
            $scope.icon = 'map';
        } else {
            $scope.icon = 'list';
        }
    };

    $scope.$on('setView', function($event, val) {
        if (val && 'view' in val) {
            if (val.view) {
                $scope.icon = 'list';
            } else {
                $scope.icon = 'map';
            }
            Utils.applyChanges($scope);
        }
    });

    $scope.toggleFilters = function() {
        $scope.$emit("toggleFilters", { 'filters': true });
    };
    $scope.goToAppStore = function() {
        if (navigator.userAgent.indexOf('Mac OS X') != -1) {
            window.open(config.IOS_APP_URL, '_blank');
        } else {
            window.open(config.ANDROID_APP_URL, '_blank');
        }
    };

    $scope.broadCastMessage = (message, data) => {
        setTimeout(function() {
            $scope.$broadcast(message, data);
        }, 50);
    };

    $scope.closeWebBanner = function() {
        $scope.closeBanner = false;
        $scope.$emit("rePosMapSec", $scope.closeBanner);
    };
    $scope.closeAppBanner = function() {
        $scope.closeGetAppBanner = false;
        localStorage.setItem('rePosMap', $scope.closeGetAppBanner);
        $scope.$emit("rePosMap", $scope.closeGetAppBanner);
    };
    $scope.getcloseFn = function() {
        $scope.getclose = true;
        $scope.$emit("getcloseFn");
    };
    $scope.notificationscloseFn = function() {
        $scope.notificationsclose = true;
        $scope.$emit("notificationscloseFn");
    };
    $scope.goToPage = function(page) {
        let isMobile = window.matchMedia("only screen and (max-width: 1024px)");
        if (page === '#' && window.location.pathname == '/' && isMobile.matches) {
            $scope.toggleFilters();
        } else {
            location.href = page;
        }
    };

    $scope.init();
}]);