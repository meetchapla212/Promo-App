angular.module('PromoApp')
    .controller('EventOrganiserProfileController', ['$scope', 'userService', 'Utils', '$routeParams', 'authService', 'eventsService', function($scope, userService, Utils, $routeParams, authService, eventsService) {
        $scope.checkFollow = false;
        $scope.user = null;
        $scope.eventId = null;
        $scope.limitDesc = 200;
        $scope.upcomingEvents = [];
        $scope.pastEvents = [];
        $scope.loading = false;
        $scope.currentPage = 1;
        $scope.currentPageUpcoming = 1;
        $scope.currentPagePast = 1;
        $scope.currentTab = true;
        $scope.numPerPage = 10;
        $scope.maxSize = 5;
        $scope.event = '';
        $scope.showMore = false;

        $scope.getMyEvents = function() {
            $scope.loading = true;
            eventsService.getUserEvents($scope.user.user_id)
                .then((responses) => {
                    if (responses.success) {
                        // Sort them into upcoming and past events
                        for (let event of responses.data) {
                            let endDate = moment(event.end_date_time_ms);
                            let currentDate = moment();
                            if ('timezone' in event && event.timezone) {
                                endDate = endDate.tz(event.timezone);
                                currentDate = currentDate.tz(event.timezone);
                            }
                            if (endDate.isBefore(currentDate)) {
                                $scope.pastEvents.push(event);
                            } else {
                                $scope.upcomingEvents.push(event);
                            }
                            if (event.event_id == $scope.eventId) {
                                $scope.event = event;
                            }
                        }
                        $scope.pastEvents.sort(function(a, b) {
                            return b.start_date_time_ms - a.start_date_time_ms;
                        });
                        $scope.upcomingEvents.sort(function(a, b) {
                            return b.start_date_time_ms - a.start_date_time_ms;
                        });
                        $scope.loading = false;
                        Utils.applyChanges($scope);
                    }
                })
                .catch(err => {
                    $scope.loading = false;
                    Utils.applyChanges($scope);
                });
        };

        $scope.goToPage = function(page) {
            location.href = page;
        };

        const init = function() {
            $scope.loggedInUser = authService.getUser();
            $scope.eventId = $routeParams.eventId;
            if ($routeParams && 'userId' in $routeParams && $routeParams.userId) {
                $scope.loading = true;
                userService.getUserProfile($routeParams.userId)
                    .then((response) => {
                        if (response && 'data' in response) {
                            let data = response.data;
                            $scope.user = data.data;
                            $scope.getMyEvents();
                            $scope.loading = false;
                            Utils.applyChanges($scope);
                        } else {
                            $scope.loading = false;
                            Utils.applyChanges($scope);
                        }
                    });
            }
        };

        init();

    }]);