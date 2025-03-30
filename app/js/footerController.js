angular.module('PromoApp')
    .controller('footerController', ['$scope', '$cookies', '$window', 'qbService', '$uibModal', 'subscribeUser', 'config', '$http', 'Notification', 'authService', '$sessionStorage',
        function($scope, $cookies, $window, qbService, $uibModal, subscribeUser, config, $http, Notification, authService, $sessionStorage) {
            $scope.user = authService.getUser();
            $scope.date = new Date();
            let session = authService.getSession();
            $scope.disabledSubscribe = false;
            $scope.subscribe = {
                email: null
            };
            $scope.starhovering = false;
            $scope.notificationshovering = false;
            $scope.searchhovering = false;
            $scope.profilehovering = false;
            $scope.showAppStoreLink = true;
            const subscribeToThirdParty = (email) => {
                let data = {
                    "email": email
                };
                let url = config.AWS_BASE_URL + "/subscribe";
                return $http({
                    method: 'POST',
                    url: url,
                    data: data,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    json: true
                });
            };

            $scope.popupOpen = true;
            $scope.userBrowerName = '';
            $scope.popCloseArr = [];

            //validating email
            $scope.validateEmail = () => {

                let subscribeEmail = $scope.subscribe.email;
                var filter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
                if (!filter.test(subscribeEmail)) {
                    let notify = {
                        type: 'error',
                        title: 'Oops!!',
                        content: 'Please provide a valid email address!',
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                } else {
                    if (!$scope.user) {
                        let notify = {
                            type: 'error',
                            title: 'Log In',
                            content: 'Please log in to subscribe ',
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                    } else if ($scope.user) {
                        let filter = {
                            user_id: $scope.user.id
                        };
                        $scope.disabledSubscribe = true;
                        subscribeUser.getSubscribedUser(filter)
                            .then(res => {
                                if (res && res.length > 0) {
                                    let notify = {
                                        type: 'info',
                                        title: 'Success',
                                        content: 'You are already subscribed to The Promo App',
                                        timeout: 5000 //time in ms
                                    };
                                    $scope.$emit('notify', notify);
                                    return Promise.resolve(false);
                                } else {
                                    let subscribeData = {
                                        user_id: $scope.user.id,
                                        email: subscribeEmail
                                    };
                                    return subscribeUser.addSubscribeUSer(subscribeData);
                                }
                            })
                            .then((res) => {
                                if (res) {
                                    return subscribeToThirdParty(subscribeEmail);
                                } else {
                                    return Promise.resolve(false);
                                }
                            })
                            .then(res => {
                                if (res) {
                                    let notify = {
                                        type: 'success',
                                        title: 'Success',
                                        content: 'Congratulations, You have successfully subscribed to The Promo App',
                                        timeout: 5000 //time in ms
                                    };
                                    $scope.$emit('notify', notify);
                                }
                                $scope.disabledSubscribe = false;
                                $scope.$digest();
                            })
                            .catch(err => {
                                console.log('fallow errro ::', err);
                                $scope.disabledSubscribe = false;
                                let notify = {
                                    type: 'error',
                                    title: 'Error',
                                    content: 'We are unable to subscribe. Please check your email if it is already subscribed',
                                    timeout: 5000 //time in ms
                                };
                                $scope.$emit('notify', notify);
                                $scope.$digest();
                            });
                    }
                }

            };

            $scope.showProfile = () => {
                let userSession = authService.getSession();
                let user = authService.getUser();
                if (userSession && user) {
                    $scope.profilehovering = true;
                    $scope.starhovering = false;
                    $scope.notificationshovering = false;
                    $scope.searchhovering = false;
                    location.href = "/myprofile";
                } else {
                    $scope.loginModalMethod();
                }

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

            $scope.openCreateEventModal = function() {

                let userSession = authService.getSession();
                let user = authService.getUser();
                if (userSession && user) {

                    let eventModelScope = $scope.$new(false, $scope);
                    eventModelScope.claimEvent = false;
                    eventModelScope.action = "Create";

                    $uibModal.open({
                        ariaLabelledBy: 'modal-title',
                        ariaDescribedBy: 'modal-body',
                        templateUrl: '../../partials/addEventModal.html',
                        openedClass: 'pa-create-event-modal pa-common-modal-style',
                        scope: eventModelScope,
                        size: 'lg'

                    });
                } else {
                    // create new scope for modal
                    let modalScope = $scope.$new(true);
                    modalScope.redirectUrl = '/?addevent=true';
                    modalScope.toSignup = `/signup?redirectSignup=${modalScope.redirectUrl}`;
                    $uibModal.open({
                        ariaLabelledBy: 'modal-title',
                        ariaDescribedBy: 'modal-body',
                        backdrop: 'static',
                        templateUrl: '../partials/loginModal.html',
                        controller: 'LoginModalController',
                        controllerAs: 'plm',
                        windowClass: 'login-modal login-modal-fix',
                        scope: modalScope
                    });
                }
            };

            $scope.closeProfile = () => {
                $scope.profilehovering = false;
            };

            $scope.username = '';
            $scope.profilePic = '';
            $scope.userUnreadMessageCount = 0;
            $scope.validateSession = function() {
                // Check if cookie present
                let userSession = authService.getSession();
                let user = authService.getUser();
                if (userSession && user) {

                    $scope.profilePic = user.imgUrl;
                    if ('full_name' in user && user.full_name && user.full_name != '') {
                        $scope.username = user.full_name;
                    } else {
                        $scope.username = user.login;
                    }

                    // Get unread message count
                    $scope.userUnreadMessageCount = authService.getObject('userUnreadMessageCount');
                } else {
                    location.href = "/login";
                }

            };

            $scope.getBrowserName = () => {
                let isIE = false;
                let browserName = '';
                let isChrome = '',
                    isOpera = '';
                if ((!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0) {
                    browserName = 'opera';
                    isOpera = true;
                } else if (typeof InstallTrigger !== 'undefined') {
                    browserName = 'firefox';
                } else if (/constructor/i.test(window.HTMLElement) || (function(p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window.safari || (typeof safari !== 'undefined' && safari.pushNotification))) {
                    browserName = 'safari';
                } else if ( /*@cc_on!@*/ false || !!document.documentMode) {
                    isIE = true;
                    browserName = 'ie';
                } else if (!isIE && !!window.StyleMedia) {
                    browserName = 'edge';
                } else if (!!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime)) {
                    browserName = 'chrome';
                    isChrome = true;
                } else if (isChrome && (navigator.userAgent.indexOf("Edg") != -1)) {
                    browserName = 'edgeChromium';
                } else if ((isChrome || isOpera) && !!window.CSS) {
                    browserName = 'blink';
                } else {
                    browserName = 'unknown';
                }
                return browserName;
            };

            const savePopCloseInLocal = (popinfo) => {
                popinfo = { popinfo: popinfo };
                $window.localStorage.setItem("popinfo", JSON.stringify(popinfo));
            };

            const readPopCloseInLocal = () => {
                let popinfo = $window.localStorage.getItem("popinfo");
                if (popinfo) {
                    popinfo = JSON.parse(popinfo);
                    return popinfo.popinfo;
                }
                return [];
            };

            $scope.closeCookiesPopup = () => {
                $scope.popCloseArr.push($scope.userBrowerName);
                savePopCloseInLocal($scope.popCloseArr);
                $scope.popupOpen = false;
            };

            $scope.init = function() {
                let userSession = authService.getSession();
                let user = authService.getUser();
                if (userSession && user) {
                    $scope.validateSession();
                }
                if (window.location.href.indexOf("tickets") > -1) {
                    $scope.notificationshovering = true;
                }
                if (window.location.pathname === '/') {
                    $scope.starhovering = true;
                }
                if (window.location.href.indexOf("search") > -1) {
                    $scope.searchhovering = true;
                }
                if (navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/Build/i)) {
                    $scope.showAppStoreLink = false;
                }

                $scope.userBrowerName = $scope.getBrowserName();
                $scope.popCloseArr = readPopCloseInLocal();

                if (($scope.popCloseArr.length > 0) && ($scope.popCloseArr.indexOf($scope.userBrowerName) !== -1)) {
                    $scope.popupOpen = false;
                }

            };

            $scope.init();

            $scope.logout = () => {
                authService.clearSession();
                location.href = "/login";
                qbService.initQBApp().then((res) => {});
            };

            $scope.searchMethod = () => {
                $scope.searchhovering = true;
                location.href = "/searchuser";
            };

            $scope.loginModalMethod = () => {
                let modalScope = $scope.$new(true);
                modalScope.toSignup = `/signup?redirectSignup=${modalScope.redirectUrl}`;
                $uibModal.open({
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

            $scope.notificationMethod = () => {
                $scope.notificationshovering = true;

                let userSession = authService.getSession();
                let user = authService.getUser();
                if (!userSession && !user) {
                    $scope.loginModalMethod();
                } else {
                    location.href = "/tickets";
                }
            };

            $scope.addMethod = () => {
                let userSession = authService.getSession();
                let user = authService.getUser();
                if (!userSession && !user) {
                    $scope.loginModalMethod();
                } else {
                    location.href = "/createevent";
                }
            };

            $scope.goToAppStore = function() {
                window.open(config.IOS_APP_URL, '_blank');
            };

            $scope.goToAndroidStore = function() {
                window.open(config.ANDROID_APP_URL, '_blank');
            };
        }
    ]);