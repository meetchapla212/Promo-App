angular.module('PromoApp')
    .controller('ZoneProfileController', ['$scope', '$route', 'metaTagsService', 'Utils', 'authService', 'apiService', 'locationService', '$window', '$uibModal', function($scope, $route, metaTagsService, Utils, authService, apiService, locationService, $window, $uibModal) {
        $scope.forMacOnly = false;
        $scope.loading = false;
        $scope.zoneID = $route.current.params.zoneId;
        $scope.zoneList = 0;
        $scope.zoneEvents = '';
        $scope.zoneMembers = [];
        $scope.zoneOwners = '';
        $scope.zoneEventOrganizer = [];
        $scope.limitDesc = 240;
        $scope.zoneDetails = '';
        $scope.currentZoneData = '';
        $scope.styleForMacOnly = () => {
            if (navigator.userAgent.indexOf('Mac OS X') != -1) {
                $("body").addClass("mac");
                $scope.forMacOnly = true;
            }
        };

        /*
         ** Get Zone Events
         */
        $scope.getZoneEvents = (id) => {
            $scope.loading = true;
            let token = authService.get('token');
            apiService.getGeneralZoneEvents(token, id).then((response) => {
                if (response.data.success) {
                    $scope.zoneEvents = response.data.data.data;
                }
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
            apiService.getGeneralZoneMembers(token, id).then((response) => {
                if (response.data.success) {
                    let zoneMembers = response.data.data.data;
                    zoneMembers.forEach((data) => {
                        if (data.is_block == 0) {
                            data.is_block = 1;
                        } else {
                            data.is_block = 0;
                        }
                        $scope.zoneMembers.push(data);
                    });
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
            apiService.getGeneralZoneOwners(token, id).then((response) => {
                if (response.data.success) {
                    $scope.zoneOwners = response.data.data.data;
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
                    zoneEventOrganizer.forEach((data) => {
                        if (data.is_block == 0) {
                            data.is_block = 1;
                        } else {
                            data.is_block = 0;
                        }
                        $scope.zoneEventOrganizer.push(data);
                    });
                }
            }).catch((err) => {
                console.log("Get Zone Event Organizer", err);
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
         ** Init Function
         */
        $scope.init = () => {
            $scope.user = authService.getUser();
            $scope.styleForMacOnly();
            $scope.zoneDetails = JSON.parse(localStorage.getItem($scope.zoneID));
            $scope.getZoneEvents($scope.zoneID);
            $scope.getZoneMembers($scope.zoneID);
            $scope.getZoneOwners($scope.zoneID);
            $scope.getEventOrganizer($scope.zoneID);
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

        $scope.init();
    }]);