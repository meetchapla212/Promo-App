angular.module('PromoApp')
    .controller('ProfileController', ['$scope', 'qbService', 'eventsService', '$window', 'authService', 'Utils', 'userService', '$location', 'config', '$routeParams', 'apiService', 'metaTagsService', '$uibModal', 'deviceDetector',
        function($scope, qbService, eventsService, $window, authService, Utils, userService, $location, config, $routeParams, apiService, metaTagsService, $uibModal, deviceDetector) {
            $scope.tabs = {
                "mytickets": {
                    id: 1,
                    displayName: 'My Tickets',
                    selected: true,
                    hide: false
                },
                "interestedevents": {
                    id: 2,
                    displayName: "Events I'm Interested In",
                    selected: false,
                    hide: false
                },
                "closedevents": {
                    id: 3,
                    displayName: "Closed Events",
                    selected: false,
                    hide: false
                }
            };
            $scope.eventAttending = '1';
            $scope.currentTab = true;
            $scope.categoriesMap = config.CATEGORIES;
            $scope.loading = false;
            $scope.checkFollow = false;
            $scope.user = null;
            $scope.loggedInUser = null;
            $scope.allInterestedInEvents = [];
            $scope.allGoingEventsUpComing = [];
            $scope.allGoingEventsPast = [];
            $scope.followViewButton = false;
            $scope.interestedeventsList = [];
            $scope.SharedEvents = [];
            $scope.userTicketsEvents = [];
            $scope.deviceiPhone = false;
            $scope.filterDateFrom = moment.utc();
            $scope.filterDateTo = null;
            $scope.userProfileView = false;
            $scope.filteredGoingEvents = [];
            $scope.filteredClosedEvents = [];
            $scope.filteredAllGoingEvents = [];
            $scope.filteredUserTicketsEvents = [];
            $scope.otherUserEventList = [];
            $scope.isShow = false;
            $scope.currentPage = 1;
            $scope.currentPageMyTickets = 1;
            $scope.currentPageGoing = 1;
            $scope.numPerPage = 10;
            $scope.maxSize = 5;
            $scope.showMore = false;
            $scope.modalEmailVerify = false;
            $scope.verifcationEmailSend = false;
            $scope.closeBanner = true;
            $scope.dashboardRoute = false;
            $scope.dashboardRouteUrl = '';
            $scope.zoneListData = '';
            $scope.isMobile = window.matchMedia("only screen and (max-width: 1024px)");

            $scope.selectTab = function(tab) {
                // Mark current tab as selected and remaining as unselected
                for (let tab of Object.values($scope.tabs)) {
                    tab.selected = false;
                }
                tab.selected = true;

                switch (tab.id) {
                    case 1:
                        $scope.filterDateFrom = moment.utc();
                        $scope.filterDateTo = null;
                        $scope.getMyTicketsEvents();
                        break;
                    case 2:
                        $scope.filterDateFrom = moment.utc();
                        $scope.filterDateTo = null;
                        $scope.getInterestedInEvents();
                        if (!$scope.isMobile.matches) {
                            $scope.getSharedEvents();
                        }
                        Utils.applyChanges($scope);
                        break;
                    case 3:
                        $scope.filterDateFrom = null;
                        $scope.filterDateTo = moment.utc();
                        $scope.getMyTicketsEvents();
                        $scope.getInterestedInEvents();
                        Utils.applyChanges($scope);
                        break;
                }
            };

            $scope.goToPage = (location) => {
                $window.location.href = location;
            };

            $scope.getMyTicketsEvents = () => {
                $scope.loading = true;
                eventsService.getUserTickets($scope.user.id, true)
                    .then((userTickets) => {
                        if (userTickets.status == 200) {
                            if (userTickets.data.success) {
                                if (userTickets.data.data) {
                                    $scope.userTicketsEvents = userTickets.data.data;
                                }
                            }
                        }
                        $scope.loading = false;
                        Utils.applyChanges($scope);
                    });
            };

            $scope.getInterestedInEvents = function() {
                if ($scope.allInterestedInEvents.length === 0) {
                    let token = authService.get("token");
                    apiService.getInterestedEventsListById(token, $scope.user.user_id).then((response) => {
                        if (response.status == 200) {
                            let data = response.data;
                            let res1 = [];
                            if (data.success) {
                                $scope.filterDateFrom = moment.utc();
                                $scope.filterDateTo = null;
                                let user = data.data;
                                res1.push(...filterByDate(user));
                                if (user) {
                                    $scope.interestedeventsList = res1.filter(e => e.status == 'active');
                                    $scope.otherUserEventList = res1.filter(e => e.status == 'active');
                                } else {
                                    $scope.interestedeventsList = [];
                                    $scope.otherUserEventList = [];
                                }
                                $scope.allInterestedInEvents = res1; //need to remove
                                $scope.loading = false;
                                Utils.applyChanges($scope);
                            }
                        }
                    });
                }
            };

            $scope.getGoingEvents = function(cond) {
                let token = authService.get("token");
                apiService.getGoingEventsListById(token, $scope.user.user_id).then((response) => {
                    if (response.status == 200) {
                        let data = response.data;
                        let res1 = [];
                        let res2 = [];
                        if (data.success) {
                            $scope.filterDateFrom = moment.utc();
                            $scope.filterDateTo = null;
                            let user = data.data;
                            res1.push(...filterByDate(user.upcomingEvents));
                            res2.push(...filterByDate(user.pastEvents));
                            if (user.upcomingEvents.length > 0 || user.pastEvents.length > 0) {
                                if (cond) {
                                    $scope.otherUserEventList = res1;
                                } else {
                                    $scope.otherUserEventList = res2;
                                }
                            } else {
                                $scope.otherUserEventList = [];
                            }
                            $scope.allGoingEventsUpComing = res1;
                            $scope.allGoingEventsPast = res2;
                            $scope.loading = false;
                            Utils.applyChanges($scope);
                        }
                    }
                });
            };

            $scope.getSharedEvents = function() {
                let token = authService.get("token");
                apiService.getSharedEventsById(token, $scope.user.user_id).then((response) => {
                    if (response.success && response.data != undefined) {
                        let resData = response.data;
                        $scope.SharedEvents = resData;
                        $scope.otherUserEventList = resData.filter(e => e.status == 'active');
                    } else {
                        $scope.SharedEvents = [];
                        $scope.otherUserEventList = [];
                    }
                    $scope.loading = false;
                    Utils.applyChanges($scope);
                });
            };

            $scope.getEventsData = (info) => {
                if (info == 1) {
                    $scope.getInterestedInEvents();
                } else if (info == 2) {
                    $scope.getSharedEvents();
                } else if (info == 3) {
                    $scope.getGoingEvents(true);
                } else if (info == 4) {
                    $scope.getGoingEvents(false);
                }
            };

            const filterByDate = function(array) {
                return array; //need to remove 
            };

            $scope.goToFollower = function(tab) {
                let url = `/userprofile/${$scope.user.user_id}/follower`;
                if (tab) {
                    url += `?tab=${tab}`;
                }
                location.href = url;
            };

            $scope.rebuildSlide = function() {
                var width = $(window).width();
                if (width >= 768 && width <= 992) {
                    // desktop
                    $scope.limitTitle = 50;
                    $scope.limitDesc = 100;
                } else if (width > 992) {
                    $scope.limitTitle = 80;
                    $scope.limitDesc = 200;
                } else if (width >= 480 && width < 768) {
                    // phone
                    $scope.limitTitle = 80;
                    $scope.limitDesc = 130;
                } else if (width < 480) {
                    $scope.limitTitle = 60;
                    $scope.limitDesc = 90;
                } else if (width < 400) {
                    $scope.limitTitle = 80;
                    $scope.limitDesc = 120;
                } else {
                    $scope.limitTitle = 100;
                    $scope.limitDesc = 200;
                }
            };

            angular.element($window).bind('resize', function() {
                // don't forget manually trigger $digest()
                $scope.rebuildSlide();
            });
            $scope.rebuildSlide();

            $scope.logout = () => {
                authService.clearSession();
                qbService.initQBApp().then((res) => {});
                location.href = "/login";
            };

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
                        $scope.loading = false;
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

            $scope.notificationscloseFn = function() {
                $scope.notificationsclose = true;
                $scope.$emit("notificationscloseFn");
            };

            $scope.closeWebBanner = function() {
                $scope.closeBanner = false;
                $scope.$emit("rePosMapSec", $scope.closeBanner);
            };

            $scope.cancel = function() {
                this.$dismiss('close');
            };

            /*
             ** Member Zone Listing
             */

            $scope.memberZoneListing = () => {
                $scope.loading = true;
                let token = authService.get("token");
                apiService.memberZoneList(token).then((response) => {
                    if (response.status == 200) {
                        let data = response.data;
                        if (data.success) {
                            $scope.zoneListData = data.data;
                        }
                    }
                    $scope.loading = false;
                });
            };

            /*
             ** Remove Zone Member Confirmation Modal
             */
            $scope.removeZoneConfirmation = (zoneId, status) => {
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.zone_id = zoneId;
                eventModelScope.status = status;
                $scope.confirmPublishTicketModel = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/zone/leaveZoneConfirmationModal.html',
                    openedClass: 'pa-create-event-modal add-link-modal ticket-popup-new-ui delete-zone scroll_popup',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            /*
             ** Remove Zone Member
             */
            $scope.deleteZoneMember = (zoneId) => {
                $scope.loading = true;
                let token = authService.get('token');
                apiService.leaveZoneMember(token, zoneId).then((response) => {
                    if (response.data.success) {
                        let notify = {
                            type: 'success',
                            title: 'Success',
                            content: 'Member leaved from zone successfully.',
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        setTimeout(function() {
                            $window.location.reload();
                        }, 500);
                    }
                }).catch((err) => {
                    console.log("Remove Zone Member", err);
                }).finally(() => {
                    $scope.loading = false;
                });
            };

            const init = () => {
                if (!authService.getUser()) {
                    location.href = "/login";
                }

                if (deviceDetector.device == "iphone") {
                    $scope.deviceiPhone = true;
                }

                if ($location.path() === "/myprofile") {
                    $scope.isShow = true;
                }

                if ($routeParams && 'zId' in $routeParams && $routeParams.zId) {
                    $scope.dashboardRoute = true;
                    $scope.dashboardRouteUrl = '/zoneDashboard/' + $routeParams.zId;
                } else if ($routeParams && 'zpId' in $routeParams && $routeParams.zpId) {
                    $scope.zoneProfileRoute = true;
                    $scope.zoneProfileRouteUrl = '/zoneProfile/' + $routeParams.zpId;
                }

                $scope.loggedInUser = authService.getUser();

                if ($routeParams && 'userID' in $routeParams && $routeParams.userID) {
                    $scope.userProfileView = true;
                    $scope.tabs.mytickets.hide = true;
                    $scope.loading = true;
                    userService.getUserProfile($routeParams.userID)
                        .then((response) => {
                            if (response.status == 200) {
                                let data = response.data;
                                if (data.success) {
                                    $scope.user = data.data;
                                    $scope.checkFollow = !$scope.checkFollow;
                                    if (window.location.pathname != '/myprofile') {
                                        $scope.selectTab($scope.tabs.interestedevents);
                                    }
                                    $scope.getEventsData(1);
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
                                    location.href = "/searchuser";
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
                                location.href = "/searchuser";
                            }
                        }).catch(err => {
                            let notify = {
                                type: 'error',
                                title: 'OOPS!!',
                                content: "Sorry something went wrong. Please try later.",
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            Utils.applyChanges($scope);
                            location.href = "/searchuser";
                        }).finally(() => {
                            $scope.loading = false;
                        });
                } else {
                    $scope.user = authService.getUser();
                    // If it is coming from menu do not load tab
                    if (window.location.pathname !== '/myprofile') {
                        $scope.selectTab($scope.tabs.interestedevents);
                    }
                    $scope.loading = false;
                }
                if (window.location.pathname === '/myprofile') {
                    $scope.selectTab($scope.tabs.interestedevents);
                    $scope.memberZoneListing();
                    $scope.getMyTicketsEvents();
                } else if (window.location.pathname === '/zoneList') {
                    $scope.memberZoneListing();
                }
                if ($scope.user && 'is_email_verified' in $scope.user && $scope.user.is_email_verified == 1) {
                    $scope.modalEmailVerify = true;
                }
                metaTagsService.setDefaultTags({
                    'title': "The Promo App | Social Event Management Network",
                    'description': "The Promo App makes social event networking and event management easier than ever before. Find events, buy and sell tickets, promote events, and more.",
                    'keywords': 'The Promo App, event management',
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

            init();
        }
    ])
    .directive('backImg', function() {
        return function(scope, element, attrs) {
            var url = attrs.backImg;
            element.css({
                'background-image': 'url(' + url + ')',
                'background-size': 'cover'
            });
        };
    })
    .filter('start', function() {
        return function(input, start) {
            if (!input || !input.length) {
                return;
            }
            start = +start;
            return input.slice(start);
        };
    });