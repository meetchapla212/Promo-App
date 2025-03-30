angular.module('PromoApp')
    .controller('EmbedEventsController', ['$scope', '$window', '$routeParams', '$location', 'eventsService', 'config', function($scope, $window, $routeParams, $location, eventsService, config) {

        $scope.categoriesMap = config.CATEGORIES;
        $scope.broadCastMessage = (message, data) => {
            setTimeout(function() {
                $scope.$broadcast(message, data);
            }, 50);
        };

        // This method is called on page load
        $scope.onPageLoad = function() {
            // Get user id from route params
            let user_id = null;
            if (!($routeParams && 'user_id' in $routeParams && $routeParams.user_id)) {
                return;
            }
            user_id = $routeParams.user_id;
            // Get location from query params
            let queryStringObject = $location.search();
            if (!(queryStringObject && 'lat' in queryStringObject && 'long' in queryStringObject && queryStringObject.lat && queryStringObject.long)) {
                return;
            }
            let lat = queryStringObject.lat;
            let long = queryStringObject.long;
            let layoutViewJson = KJUR.jws.JWS.readSafeJSONString(b64utoutf8((queryStringObject.event).split(".")[1]));
            let eventsData = layoutViewJson.eventIds;

            // Get events for this user
            let filter = {
                sort_asc: 'start_date_time_ms',
                eventLocation: {
                    near: long + "," + lat + ";30000"
                },
                end_date_time_ms: {
                    gte: moment.utc().valueOf()
                },
                isdraft: { ne: true },
                state: { ne: 'inactive' },
                user_id: user_id
            };
            $window.localStorage.removeItem("marker_ids");
            let eventListFromSelected = [];
            // eventsService.getEvents(filter, true)
            eventsService.getEmbededEvents(filter, true)
                .then((events) => {
                    angular.forEach(events.data.data, function(eventList) {
                        angular.forEach(eventsData, function(ids) {
                            if (eventList.event_id === ids) {
                                eventListFromSelected.push(eventList);
                            }
                        });
                    });
                    let loadMapEventData = {
                        location: [lat, long],
                        events: eventListFromSelected
                    };

                    $scope.broadCastMessage("loadMap", loadMapEventData);
                }).catch((err) => {
                    let loadMapEventData = {
                        location: [lat, long],
                        events: []
                    };

                    $scope.broadCastMessage("loadMap", loadMapEventData);
                });
        };

        $scope.onPageLoad();
    }]);