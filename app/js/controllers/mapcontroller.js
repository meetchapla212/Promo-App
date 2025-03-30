angular.module('PromoApp')
    .controller('EventMapController', ['$scope', '$http', 'eventsService', '$filter', 'NgMap', 'config', '$uibModal', '$location', 'qbService', 'awsService', '$window', 'authService', 'Utils', 'deviceDetector', function($scope, $http, eventsService, $filter, NgMap, config, $uibModal, $location, qbService, awsService, $window, authService, Utils, deviceDetector) {
        $scope.eventMarkers = [];
        $scope.location = [];
        $scope.prevMarkerId = '';
        $scope.isUSer = false;
        $scope.promotors = {};
        $scope.loadingMap = false;
        $scope.formFields = {
            localSearch: ""
        };
        $scope.buttonLabelForPromoter = "Become a Promo-ter";
        var emc = this;
        $scope.event_facebook_image = '';
        $scope.defaultEmail = 'Donotreply@thepromoapp.com';
        $scope.currentLocation = null;
        $scope.mobScreen = false;
        $scope.webScreen = false;
        $scope.mapDetails = {
            style: [{
                "elementType": "geometry",
                "stylers": [{
                    "color": "#f5f5f5"
                }]
            },
            {
                "elementType": "labels.icon",
                "stylers": [{
                    "visibility": "off"
                }]
            },
            {
                "elementType": "labels.text.fill",
                "stylers": [{
                    "color": "#616161"
                }]
            },
            {
                "elementType": "labels.text.stroke",
                "stylers": [{
                    "color": "#f5f5f5"
                }]
            },
            {
                "featureType": "administrative.land_parcel",
                "elementType": "labels",
                "stylers": [{
                    "visibility": "off"
                }]
            },
            {
                "featureType": "administrative.land_parcel",
                "elementType": "labels.text.fill",
                "stylers": [{
                    "color": "#bdbdbd"
                }]
            },
            {
                "featureType": "poi",
                "elementType": "geometry",
                "stylers": [{
                    "color": "#eeeeee"
                }]
            },
            {
                "featureType": "poi",
                "elementType": "labels.text",
                "stylers": [{
                    "visibility": "off"
                }]
            },
            {
                "featureType": "poi",
                "elementType": "labels.text.fill",
                "stylers": [{
                    "color": "#757575"
                }]
            },
            {
                "featureType": "poi.business",
                "stylers": [{
                    "visibility": "off"
                }]
            },
            {
                "featureType": "poi.park",
                "elementType": "geometry",
                "stylers": [{
                    "color": "#e5e5e5"
                }]
            },
            {
                "featureType": "poi.park",
                "elementType": "geometry.fill",
                "stylers": [{
                    "color": "#cde9b5"
                }]
            },
            {
                "featureType": "poi.park",
                "elementType": "labels.text",
                "stylers": [{
                    "visibility": "off"
                }]
            },
            {
                "featureType": "poi.park",
                "elementType": "labels.text.fill",
                "stylers": [{
                    "color": "#9e9e9e"
                }]
            },
            {
                "featureType": "road",
                "elementType": "geometry",
                "stylers": [{
                    "visibility": "off"
                }]
            },
            {
                "featureType": "road.arterial",
                "elementType": "labels",
                "stylers": [{
                    "visibility": "off"
                }]
            },
            {
                "featureType": "road.arterial",
                "elementType": "labels.text.fill",
                "stylers": [{
                    "color": "#757575"
                }]
            },
            {
                "featureType": "road.highway",
                "elementType": "geometry",
                "stylers": [{
                    "color": "#dadada"
                }]
            },
            {
                "featureType": "road.highway",
                "elementType": "geometry.stroke",
                "stylers": [{
                    "visibility": "simplified"
                }]
            },
            {
                "featureType": "road.highway",
                "elementType": "labels",
                "stylers": [{
                    "visibility": "off"
                }]
            },
            {
                "featureType": "road.highway",
                "elementType": "labels.text.fill",
                "stylers": [{
                    "color": "#616161"
                }]
            },
            {
                "featureType": "road.local",
                "stylers": [{
                    "visibility": "off"
                }]
            },
            {
                "featureType": "road.local",
                "elementType": "labels",
                "stylers": [{
                    "visibility": "off"
                }]
            },
            {
                "featureType": "road.local",
                "elementType": "labels.text.fill",
                "stylers": [{
                    "color": "#9e9e9e"
                }]
            },
            {
                "featureType": "transit.line",
                "elementType": "geometry",
                "stylers": [{
                    "color": "#e5e5e5"
                }]
            },
            {
                "featureType": "transit.station",
                "elementType": "geometry",
                "stylers": [{
                    "color": "#eeeeee"
                }]
            },
            {
                "featureType": "water",
                "stylers": [{
                    "color": "#ffeb3b"
                }]
            },
            {
                "featureType": "water",
                "elementType": "geometry",
                "stylers": [{
                    "color": "#c9c9c9"
                }]
            },
            {
                "featureType": "water",
                "elementType": "geometry.fill",
                "stylers": [{
                    "color": "#cbf1ff"
                }]
            },
            {
                "featureType": "water",
                "elementType": "labels.text.fill",
                "stylers": [{
                    "color": "#9e9e9e"
                }]
            }
            ]
        };


        $scope.goToPage = function (page) {
            if ($location.path() === "/") {
                let urlEvent = page.replace(/\s+/g, '-').toLowerCase();
                window.open(urlEvent, '_blank');
            } else {
                window.open(page, '_blank');
            }
        };

        $scope.saveEventId = function (event_id) {
            authService.put('event_id', event_id);
        };

        $scope.getCurrentURL = function (event_details) {
            let base_url = window.location.origin;
            let id = event_details.event_id;
            let share_url = base_url + "/?share=" + id;
            $scope.scopeURL = share_url;
            return share_url;
        };

        $scope.$watch('formFields.localSearch', function () {
            if (emc.markerCluster) {
                emc.updateMarkerCluster();
            }
        });

        // listen for the event in the relevant $scope
        $scope.$on('hideMarkerOnCategoryUnSelection', function (event, category) {
            if (category) {
                if (category != 'all') {
                    // This is old selection was selected and hence new selection will make it un-selected
                    // Hence we should just hide the events meaning just remove them from eventMarkers array
                    $scope.eventMarkers = $scope.eventMarkers.filter(e => e.category != category);
                } else {
                    // Hide all events
                    $scope.eventMarkers = [];
                }
            }
        });
        let count = 0;
        // listen for the event in the relevant $scope
        $scope.setCurrentLocation = function () {
            let userCurrentLocation = authService.get('userCurrentLocation');
            if (userCurrentLocation) {
                $scope.currentLocation = JSON.parse(userCurrentLocation);
            }
        };

        $scope.markerClickedInside = true;

        emc.mapClicked = function () { };

        emc.markerClicked = function () {
            $scope.markerClickedInside = true;
        };

        function deg2rad(deg) {
            return deg * (Math.PI / 180);
        }

        function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
            var R = 6371; // Radius of the earth in km
            var dLat = deg2rad(lat2 - lat1); // deg2rad below
            var dLon = deg2rad(lon2 - lon1);
            var a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            var d = R * c; // Distance in km
            return d;
        }

        emc.dragEnd = function (event) {
            let newLat = emc.map.getCenter().lat();
            let newLong = emc.map.getCenter().lng();

            let distance = getDistanceFromLatLonInKm($scope.location[0], $scope.location[1], newLat, newLong);

            if (emc.map.zoom >= 13 && distance < 6) {
                console.log('Drag is very small hence not loading events');
            } else {
                $scope.loadEventsOnMap(false);
            }
        };

        $scope.$on("loadMap", function(events, data) {
            if (data && 'resetLocation ' in data) {
                data.resetLocation = true;
            }
            // Check we have open info window by default for any event
            let openMarker = null;
            if ('openMarker' in data && data.openMarker) {
                openMarker = data.openMarker;
            }
            if ('events' in data && data.events) {
                $scope.eventMarkers = data.events;
            } else if (data.resetLocation) {
                $scope.eventMarkers = [];
            }
            $scope.setCurrentLocation();
            if (navigator.userAgent.toLowerCase().indexOf('Mac OS X') != -1 && navigator.userAgent.toLowerCase().indexOf('chrome') > -1) {
                setTimeout(function() {
                    $scope.loadMap(data);
                }, 800);
            } else if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1) {
                $scope.loadMap(data);
            } else if (deviceDetector.device == 'iphone' || deviceDetector.device == 'ipad') {
                $scope.loadMap(data);
            } else if (navigator.userAgent.toLowerCase().indexOf('safari') > -1) {
                setTimeout(function() {
                    $scope.loadMap(data);
                }, 800);
            } else {
                $scope.loadMap(data);
            }
        });

        if (!$scope.loadMarkersOnMap) {
            $scope.loadMarkersOnMap = $scope.$on("loadMarkersOnMap", function (events, data) {

                if (data) {
                    $scope.eventMarkers = data.events;
                    $scope.location = data.location;
                    if (!data.progressiveRefresh) {
                        $scope.prevMarkerId = '';
                    }
                    if ('openMarker' in data && data.openMarker) {
                        // NOTE: Timeout is added since marker takes some time to load
                        setTimeout(function () {
                            if ('openEventDetailModal' in data && data.openEventDetailModal) {
                                data.openMarker.openEventDetailModal = true;
                            }
                            emc.showCustomMarker(null, data.openMarker);
                        }, 1000);
                    }

                    //your logic here
                    $scope.resizeMap();
                    setTimeout(function () {
                        emc.updateMarkerCluster();
                    }, 1000);
                    Utils.applyChanges($scope);
                }
            });
        }

        angular.element($window).bind('resize', function () {
            $scope.resizeMap();
            Utils.applyChanges($scope);

        });

        $scope.resizeMap = function () {
            let totalHeight = 0;
            let element = angular.element('.js-header-dynamic');
            if (element && element.length > 0) {
                totalHeight += element[0].offsetHeight;
            }

            // #pa-subheader
            element = angular.element('.pa-subheader');
            if (element && element.length > 0) {
                totalHeight += element[0].offsetHeight;
            }
            if (angular.element('.js-mobile-footer')) {
                element = angular.element('.js-mobile-footer');
                if (element && element.length > 0 && element[0].offsetHeight > 0) {
                    totalHeight += (element[0].offsetHeight - 20);
                }

            }

            if (angular.element('.pa-footer')) {
                element = angular.element('.pa-footer');
                if (element && element.length > 0) {
                    totalHeight += element[0].offsetHeight;
                }
            }

            let mapHeight = window.innerHeight - totalHeight;
            mapHeight = mapHeight - 60;
            $scope.mapStyle = {
                "height": mapHeight + "px"
            };
        };


        $scope.checkIfUserLoggedIn = function () {

            $scope.user = authService.getUser();
            $scope.session = authService.getSession();
            if ($scope.user && $scope.session) {
                $scope.isUSer = true;
                $scope.headerTemplate = 'partials/header.html';
            }
        };


        $scope.searchIconUrl = function (nameKey, myArray) {
            for (var i = 0; i < myArray.length; i++) {
                if (myArray[i].id === nameKey) {
                    return myArray[i].icon;
                }
            }
        };

        $scope.createMarkerForEvent = function(event) {

            $scope.categoriesMaps = [];
            angular.forEach($scope.categoriesMap, function (value, key) {
                if (value.id === "programing-arts") {
                    value.id = "performing-arts";
                }
                $scope.categoriesMaps.push(value);
            });


            let icon = {
                url: $scope.searchIconUrl(event.category, $scope.categoriesMaps),
                size: new google.maps.Size(28, 34),
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(16, 40),
                scaledSize: new google.maps.Size(28, 34),
            };


            if (event.highlighted) {
                icon.url = `img/${ event.category }_highlight.svg`;
                icon.size = new google.maps.Size(26, 42);
                icon.scaledSize = new google.maps.Size(26, 42);
            }
            let marker = new google.maps.Marker({
                position: new google.maps.LatLng(event.latitude, event.longitude),
                icon: icon,
                id: event.event_id
            });

            google.maps.event.addListener(marker, 'click', function () {
                emc.showCustomMarker(this, event);
            });

            return marker;
        };


        const saveMarkerIdInLocalStorage = (marker_ids) => {
            marker_ids = { marker_ids: marker_ids };
            $window.localStorage.setItem("marker_ids", JSON.stringify(marker_ids));
        };

        const readMarkerIdFromLocalStorage = () => {
            let events = $window.localStorage.getItem("marker_ids");
            if (events) {
                events = JSON.parse(events);
                return events.marker_ids;
            }
            return [];
        };

        $scope.$on("removeMarker", function() {
            if ($scope.mobScreen) {
                $scope.mobScreen = false;
            }
            $window.localStorage.removeItem("marker_ids");
            if (emc.markerCluster) {
                emc.markerCluster.clearMarkers();
            }
        });

        let global_marker = [];

        $scope.loadMap = function (data) {
            // Setting default location on load
            $scope.location = data.location;
            if ('events' in data && data.events) {
                $scope.eventMarkers = data.events;
            }
            NgMap.getMap('eventsmap')
                .then(function (map) {
                    emc.map = map;
                    emc.updateMarkerCluster = function() {
                        let filteredMarkers = $scope.eventMarkers;
                        let markers = [];
                        emc.map.markers = {};
                        let marker_ids = readMarkerIdFromLocalStorage();
                        let new_marker_id = [];
                        if (marker_ids.length == 0) {
                            for (let event of filteredMarkers) {
                                new_marker_id.push(event.event_id);
                                let marker = $scope.createMarkerForEvent(event);
                                markers.push(marker);
                                emc.map.markers[event.event_id] = marker;
                                global_marker[event.event_id] = marker;
                            }
                            saveMarkerIdInLocalStorage(new_marker_id);
                            emc.markerCluster = new MarkerClusterer(emc.map, markers, {
                                maxZoom: 13,
                                styles: [{
                                    url: '../img/group_events.png',
                                    height: 42,
                                    width: 42,
                                    textColor: '#ffffff',
                                    textSize: 14
                                }]
                            });
                        } else {
                            for (let event of filteredMarkers) {
                                if (marker_ids.indexOf(event.event_id) == -1) {
                                    new_marker_id.push(event.event_id);
                                    let marker = $scope.createMarkerForEvent(event);
                                    markers.push(marker);
                                    emc.map.markers[event.event_id] = marker;
                                    global_marker[event.event_id] = marker;
                                }
                            }
                            let concat_of_marker = marker_ids.concat(new_marker_id);
                            saveMarkerIdInLocalStorage(concat_of_marker);
                            setTimeout(function() {
                                emc.markerCluster.addMarkers(markers);
                            }, 1000);
                        }
                    };

                    emc.showCustomMarker = function(evt, selectedEvent) {

                        emc.em = selectedEvent;

                        if (!('address' in selectedEvent && selectedEvent.address)) {
                            eventsService.updateLocationOfEvent(selectedEvent)
                                .then(() => {
                                    Utils.applyChanges($scope);
                                });
                        }
                        if (emc.map && emc.map.markers) {

                            let selectedMarker = null;
                            // For all markers set icon size to default

                            for (let marker of Object.keys(global_marker)) {
                                let currentIcon = global_marker[marker].getIcon();
                                let height = 32,
                                    width = 26;
                                if (selectedEvent && selectedEvent.event_id == marker) {

                                    selectedMarker = global_marker[marker];
                                    // Get current marker
                                    height = 52;
                                    width = 42;
                                    if (selectedEvent.isHighlighted) {
                                        height = 64;
                                    }
                                    global_marker[marker].setZIndex(1);
                                } else {

                                    // Check if highlighed
                                    if (currentIcon.scaledSize.height === 64 || currentIcon.scaledSize.height === 42) {
                                        height = 42;
                                    }
                                    global_marker[marker].setZIndex(0);
                                }
                                currentIcon = {
                                    url: currentIcon.url,
                                    scaledSize: new google.maps.Size(width, height),
                                    origin: currentIcon.origin,
                                    anchor: currentIcon.anchor
                                };
                                global_marker[marker].setIcon(currentIcon);
                            }
                            $scope.rebuildSlide();
                            if ($scope.webScreen) {
                                $scope.mobScreen = false;
                                emc.map.showInfoWindow('event-iw', selectedMarker);
                            } else {
                                $scope.mobScreen = true;
                                $scope.broadCastMessage("setBottomWhenCustomMarker", $scope.mobScreen);
                                Utils.applyChanges($scope);
                            }
                        }
                    };

                    $scope.rebuildSlide = function () {
                        var width = $(window).width();
                        if (width > 1024) {
                            $scope.webScreen = true;
                            $scope.mobScreen = false;
                        } else {
                            $scope.mobScreen = true;
                            $scope.webScreen = false;
                        }
                    };

                    emc.getClosedIconSize = (currentIcon) => {
                        // Check if highlighed
                        let height = 32,
                            width = 26;
                        // Check if highlighed
                        if (currentIcon.scaledSize.height === 64 || currentIcon.scaledSize.height === 42) {
                            width = 26;
                            height = 42;
                        }
                        currentIcon = {
                            url: currentIcon.url,
                            scaledSize: new google.maps.Size(width, height),
                            origin: currentIcon.origin,
                            anchor: currentIcon.anchor
                        };
                        return currentIcon;
                    };

                    emc.hideMarkers = (evt) => {
                        if (evt) {
                            let currentIcon = global_marker[evt.event_id].getIcon();
                            global_marker[evt.event_id].setIcon(emc.getClosedIconSize(currentIcon));
                            $scope.mobScreen = false;
                            $scope.broadCastMessage("setBottomWhenCustomMarker", $scope.mobScreen);

                        } else {
                            // Go through all markers and re-size
                            if (emc.map && emc.map.markers) {
                                let selectedMarker = null;
                                // For all markers set icon size to default
                                for (let evt of Object.keys(global_marker)) {
                                    let currentIcon = global_marker[evt].getIcon();
                                    global_marker[evt].setIcon(emc.getClosedIconSize(currentIcon));
                                }
                            }
                        }
                        emc.map.hideInfoWindow('event-iw');
                        $scope.infoWindowFlas = true;
                    };

                    emc.initInfoWindow = function() {
                        emc.updateMarkerCluster();
                        if ('openEventDetailModal' in emc.em && emc.em.openEventDetailModal) {
                            angular.element('.js-event-detail-modal').click();
                            delete emc.em.openEventDetailModal;
                        }
                    };

                    emc.closeCustomMarker = function (evt) {
                        if (this.map.customMarkers[evt]) {
                            this.map.customMarkers[evt].setVisible(false);
                            $scope.prevMarkerId = '';
                        }
                    };

                    emc.clearMarkers = function() {};
                    if ('openMarker' in data && data.openMarker) {
                        // NOTE: Timeout is added since marker takes some time to load
                        setTimeout(function () {
                            emc.showCustomMarker(null, data.openMarker);
                        }, 2000);

                    }
                    emc.updateMarkerCluster();

                }).catch(err => {
                    console.log('error from map is::', err);
                });
        };

        $scope.infoWindowFlas = true;

        this.zoomChanged = function(event) {
            if ($scope.eventMarkers && $scope.eventMarkers.length > 0) {
                $scope.eventMarkers.forEach((e) => {
                    e.showMarkerVisible = false;
                });
                $scope.$apply();
            }

            $scope.infoWindowFlas = false;
            if ($scope.infoWindowFlas) {
                emc.map.showInfoWindow('event-iw', $scope.eventMarkers);
            }
        };

        //close modals
        $scope.cancel = function () {
            this.$dismiss('close');
        };

        $scope.checkIfUserLoggedIn();
    }]);