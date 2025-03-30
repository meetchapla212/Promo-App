angular.module('PromoApp')
    .controller('LocationFeatureController', ['$scope', 'authService', 'Utils', '$uibModal', 'locationService', '$window', 'metaTagsService', 'deviceDetector', function ($scope, authService, Utils, $uibModal, locationService, $window, metaTagsService, deviceDetector) {
        $scope.headerTemplate = 'partials/phase2/pre-login-header.html';
        $scope.user = null;
        $scope.locationPlaceholder = "Search Location";
        $scope.city = null;
        $scope.disableLocation = false;
        $scope.loct = null;
        $scope.showhide = {
            welcome: true,
            pickcity: false
        };

        $scope.selectCity = function () {
            $scope.showhide.welcome = false;
            $scope.showhide.pickcity = true;
        };
        $scope.selectWelcome = function () {
            $scope.showhide.welcome = true;
            $scope.showhide.pickcity = false;
        };

        $scope.popularCities = [{
            city: 'Miami',
            lat: 25.7616798,
            lng: -80.1917902,
            address: 'Miami, FLA, USA'
        },
        {
            city: 'Tampa',
            lat: 27.950575,
            lng: -82.4571776,
            address: 'Tampa, FL, USA'
        }, 
        {
            city: 'Orlando',
            lat: 28.5383355,
            lng: -81.3792365,
            address: 'Orlando, FL, USA'
        },
        {
            city: 'Lake Wales',
            lat: 27.9014133,
            lng: -81.58590989999999,
            address: 'Lake Wales, FL, USA'
        },
        {
            city: 'Los Angeles',
            lat: 34.0522342,
            lng: -118.2436849,
            address: 'Los Angeles, CA, USA'
        },
        {
            city: 'San Francisco',
            lat: 37.7749295,
            lng: -122.4194155,
            address: 'San Francisco, CA, USA'
        },
        {
            city: 'New York',
            lat: 40.7127753,
            lng: -74.0059728,
            address: 'New York, NY, USA'
        },
        {
            city: 'Washington',
            lat: 38.9071923,
            lng: -77.0368707,
            address: 'Washington, DC, USA'
        }
        ];

        $scope.locationAccessedModal = function () {
            let eventModelScope = $scope.$new(false, $scope);

            let modalInstance = $uibModal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: '../../partials/locationAccessedModal.html',
                openedClass: 'pa-create-event-modal add-link-modal location-access',
                scope: eventModelScope,
                size: 'md'
            });
        };

        $scope.$watch('loct', function () {
            if ($scope.loct) {
                $scope.location = {};
                let cityComponent = $scope.loct.address_components.filter(a => a.types && a.types.includes('locality', 'administrative_area_level_3'));
                if (cityComponent && cityComponent.length > 0) {
                    $scope.location.city = cityComponent[0].long_name;

                } else {
                    $scope.location.city = $scope.loct.text;
                }
                $scope.location.address = $scope.location.city;
                $scope.location.lat = $scope.loct.lat;
                $scope.location.lng = $scope.loct.long;
                $scope.select();
            }
        });

        $scope.cancel = function (reason) {
            if (reason) {
                this.$dismiss(reason);
            } else {
                this.$dismiss('close');
                sendLocationPermission('true');
            }
        };

        $scope.getCurrentPos = () => {
            if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1) {
                try {
                    navigator.permissions.query({
                        name: 'geolocation'
                    }).then(function (result) {
                        if (result.state == 'granted') {
                            $scope.locationPlaceholder = 'Getting Location..';
                            $scope.disableLocation = true;
                            $scope.location = {};
                            authService.remove('lastSearchedLocation');
                            locationService.getUserLocation(true)
                                .then((locationResponse) => {
                                    $scope.disableLocation = false;
                                    if (locationResponse) {
                                        $scope.locationPlaceholder = 'Search Location';
                                        $scope.location = {};
                                        if ('address' in locationResponse) {
                                            $scope.city = locationResponse.address;
                                            $scope.location.address = locationResponse.address;
                                        }
                                        if ('city' in locationResponse) {
                                            $scope.city = locationResponse.city;
                                            $scope.location.city = $scope.city;
                                        }

                                        $scope.location.lat = locationResponse.lat;
                                        $scope.location.lng = locationResponse.lng;
                                        $scope.select($scope.location);
                                        Utils.applyChanges($scope);
                                    } else {
                                        $scope.locationPlaceholder = 'Search Location';
                                        $scope.locationAccessedModal();
                                    }
                                })
                                .catch((err) => {
                                    $scope.locationPlaceholder = 'Search Location';
                                    $scope.disableLocation = false;
                                    Utils.applyChanges($scope);
                                });
                        } else if (result.state == 'prompt') {
                            navigator.geolocation.getCurrentPosition(function (position) {
                                lat0 = position.coords.latitude;
                                long0 = position.coords.longitude;
                                $window.location.reload();
                            });
                        } else if (result.state == 'denied') {
                            let notify = {
                                type: 'error',
                                title: 'OOPS!!',
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
                    authService.remove('lastSearchedLocation');
                    locationService.getUserLocation(true)
                        .then((locationResponse) => {
                            $scope.disableLocation = false;
                            if (locationResponse) {
                                $scope.locationPlaceholder = 'Search Location';
                                $scope.location = {};
                                if ('address' in locationResponse) {
                                    $scope.city = locationResponse.address;
                                    $scope.location.address = locationResponse.address;
                                }
                                if ('city' in locationResponse) {
                                    $scope.city = locationResponse.city;
                                    $scope.location.city = $scope.city;
                                }

                                $scope.location.lat = locationResponse.lat;
                                $scope.location.lng = locationResponse.lng;
                                $scope.select();
                                Utils.applyChanges($scope);
                            } else {
                                $scope.locationPlaceholder = 'Search Location';
                                $scope.locationAccessedModal();
                            }
                        })
                        .catch((err) => {
                            $scope.locationPlaceholder = 'Search Location';
                            $scope.disableLocation = false;
                            Utils.applyChanges($scope);
                        });
                }
            } else if (deviceDetector.device == 'iphone' || deviceDetector.device == 'ipad') {
                $scope.locationPlaceholder = 'Getting Location..';
                $scope.disableLocation = true;
                $scope.location = {};
                authService.remove('lastSearchedLocation');
                locationService.getUserLocation(true)
                    .then((locationResponse) => {
                        $scope.disableLocation = false;
                        if (locationResponse) {
                            $scope.locationPlaceholder = 'Search Location';
                            $scope.location = {};
                            if ('address' in locationResponse) {
                                $scope.city = locationResponse.address;
                                $scope.location.address = locationResponse.address;
                            }
                            if ('city' in locationResponse) {
                                $scope.city = locationResponse.city;
                                $scope.location.city = $scope.city;
                            }

                            $scope.location.lat = locationResponse.lat;
                            $scope.location.lng = locationResponse.lng;
                            $scope.select();
                            Utils.applyChanges($scope);
                        } else {
                            $scope.locationPlaceholder = 'Search Location';
                            $scope.locationAccessedModal();
                        }
                    })
                    .catch((err) => {
                        $scope.locationPlaceholder = 'Search Location';
                        $scope.disableLocation = false;
                        Utils.applyChanges($scope);
                    });
            } else if (navigator.userAgent.toLowerCase().indexOf('safari') > -1) {
                Notification.requestPermission(function (result) {
                    if (result == 'granted') {
                        $scope.locationPlaceholder = 'Getting Location..';
                        $scope.disableLocation = true;
                        $scope.location = {};
                        authService.remove('lastSearchedLocation');
                        locationService.getUserLocation(true)
                            .then((locationResponse) => {
                                $scope.disableLocation = false;
                                if (locationResponse) {
                                    $scope.locationPlaceholder = 'Search Location';
                                    $scope.location = {};
                                    if ('address' in locationResponse) {
                                        $scope.city = locationResponse.address;
                                        $scope.location.address = locationResponse.address;
                                    }
                                    if ('city' in locationResponse) {
                                        $scope.city = locationResponse.city;
                                        $scope.location.city = $scope.city;
                                    }

                                    $scope.location.lat = locationResponse.lat;
                                    $scope.location.lng = locationResponse.lng;
                                    $scope.select();
                                    Utils.applyChanges($scope);
                                } else {
                                    $scope.locationPlaceholder = 'Search Location';
                                    $scope.locationAccessedModal();
                                }
                            })
                            .catch((err) => {
                                $scope.locationPlaceholder = 'Search Location';
                                $scope.disableLocation = false;
                                Utils.applyChanges($scope);
                            });
                    } else if (result == 'prompt') {
                        navigator.geolocation.getCurrentPosition(function (position) {
                            lat0 = position.coords.latitude;
                            long0 = position.coords.longitude;
                            $window.location.reload();
                        });
                    } else if (result == 'denied') {
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
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
                authService.remove('lastSearchedLocation');
                locationService.getUserLocation(true)
                    .then((locationResponse) => {
                        $scope.disableLocation = false;
                        if (locationResponse) {
                            $scope.locationPlaceholder = 'Search Location';
                            $scope.location = {};
                            if ('address' in locationResponse) {
                                $scope.city = locationResponse.address;
                                $scope.location.address = locationResponse.address;
                            }
                            if ('city' in locationResponse) {
                                $scope.city = locationResponse.city;
                                $scope.location.city = $scope.city;
                            }

                            $scope.location.lat = locationResponse.lat;
                            $scope.location.lng = locationResponse.lng;
                            $scope.select();
                            Utils.applyChanges($scope);
                        } else {
                            $scope.locationPlaceholder = 'Search Location';
                            $scope.locationAccessedModal();
                        }
                    })
                    .catch((err) => {
                        $scope.locationPlaceholder = 'Search Location';
                        $scope.disableLocation = false;
                        Utils.applyChanges($scope);
                    });
            }
        };

        $scope.select = (location) => {
            if (location) {
                console.log($scope.location);
                $scope.location = location;
            }
            authService.putWithExpiry('lastSearchedLocation', JSON.stringify($scope.location));
            window.location.href = "/";
        };

        $scope.init = () => {
            $scope.user = authService.getObject('user');
            $scope.session = authService.getObject('session');
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