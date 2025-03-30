angular.module('PromoApp')
    .controller('SearchCategoryEventController', ['$scope', '$filter', 'authService', 'config', 'apiService', 'eventsService', 'metaTagsService', 'locationService', '$window', 'Utils', '$rootScope', function($scope, $filter, authService, config, apiService, eventsService, metaTagsService, locationService, $window, Utils, $rootScope) {
        $scope.session = authService.getSession();
        $scope.loading = false;
        $scope.loaderMessage = 'Loading...';
        $scope.categorySelectionButton = 'Unselect All';

        $scope.page = 1;
        $scope.eventPerPage = config.NO_OF_EVENTS_PER_PAGE;
        $scope.sort = "ASC";
        $scope.sortby = "start_date_time_ms";
        $scope.loadMoreEvents = true;

        $scope.ev = [];
        $scope.loadMoreEvents = true;
        $scope.showhide = {
            filters: false,
            results: true,
            selectdates: false
        };
        $scope.loadMorePHQEvents = true;
        $scope.loadMorePromoEvents = true;
        $scope.skip = 0;
        let noOfEventsToLoad = $scope.eventPerPage;
        $scope.allCategory = [
            { id: 'concerts', name: 'Concerts Events' },
            { id: 'festivals', name: 'Festivals Events' },
            { id: 'performing-arts', name: 'Performing Arts Events' },
            { id: 'politics', name: 'Politics Events' },
            { id: 'university-college', name: 'University College Events' },
            { id: 'sports', name: 'Sports Events' },
            { id: 'eats-drinks', name: 'Eats & Drinks Events' },
            { id: 'community', name: 'Community Events' },
            { id: 'tech-events', name: 'Tech Events' },
            { id: 'online-events-calendar', name: 'Online Events Calendar' },
            { id: 'live-streaming-music', name: 'Live-Streaming Music Events' },
            { id: 'educational-conferences-workshops', name: 'Educational Conferences and Workshops Events' },
            { id: 'art-and-craft', name: 'Art and Craft Events' },
            { id: 'karaoke', name: 'Karaoke Events' },
            { id: 'food-truck', name: 'Food Truck Events' },
            { id: 'happy-hour', name: 'Happy Hour Events' },
            { id: 'open-mic-night', name: 'Open Mic Night Events' },
            { id: 'live-music', name: 'Live Music Events' }
        ];
        $scope.categoriesMap = [];
        $scope.recentSearchDataInfo = [];
        $scope.IsValid = false;
        let token = authService.get('token');
        apiService.getEventCategories(token).then((response) => {
            if (response.status == 200) {
                let data = response.data;
                if (data.success) {
                    let catData = data.data;

                    catData.forEach(function(cat) {
                        let category = {};

                        category.id = cat.slug;
                        category.name = cat.category_name;
                        category.icon = cat.category_image;
                        category.iconImg = "<img src=" + cat.category_image + " alt='image' />";
                        category.marker = cat.category_image;
                        category.unselectedIcon = cat.category_image;
                        category.selected = true;
                        category.image = cat.category_slider_image;

                        $scope.categoriesMap.push(category);
                    });
                }
            }
        }).finally((e) => {
            var loc = window.location.href;
            var categoryName = loc.substring(loc.lastIndexOf('/') + 1);
            $scope.allCategory.forEach((value) => {
                if (value.id == categoryName) {
                    $scope.currentCategoryObj = value.name;
                }
            });
        });
        $scope.searchField = true;
        $scope.forMacOnly = false;
        $scope.locationPlaceholder = 'Locations, historic places and more';
        $scope.searchingText = 'Getting events from across the globe...';
        $scope.search = {
            searchEvents: ''
        };
        $scope.showTotalResult = true;
        $scope.searchDiv = true;
        $scope.location = null;
        $scope.searchCities = config.SEARCH_CITIES;
        $scope.headerTemplate = 'partials/phase2/pre-login-header.html';
        $scope.isMobile = window.matchMedia("only screen and (max-width: 1024px)");

        var loc = window.location.href;
        var winPath = loc.substring(0, loc.indexOf("chat"));
        $scope.searchByCategory = (categoryName) => {
            $scope.currentRouteCategory = categoryName;
            window.location = winPath + "/category/" + categoryName;
        };

        $scope.checkIfUserLoggedIn = () => {
            $scope.user = authService.getObject('user');
            $scope.session = authService.getObject('session');
            if ($scope.user && $scope.session) {
                $scope.headerTemplate = 'partials/header.html';
            }
            $scope.loadDefaultSearchEvents();
        };

        $scope.numberOfItems = function() {
            if ($scope.categoriesMap && $scope.categoriesMap.length > 0) {
                let l = $scope.categoriesMap.length;
                let n = Math.ceil(l / 4);
                return new Array(n);
            } else {
                return [];
            }
        };


        $scope.loadEvents = function(firstLoad) {
            if ($scope.loadMoreEvents && !$scope.loading) {
                let eventPromise = [];
                if ($scope.loadMorePromoEvents) {
                    eventPromise.push(firstLoad);
                    if (firstLoad && persistObject.get('skip')) {
                        noOfEventsToLoad = persistObject.get('skip');
                    }
                    return getAllEvents();
                }
            }

        };

        $scope.showFilters = () => {
            $scope.showhide.results = false;
            $scope.showhide.filters = true;
            $rootScope.footerHide = true;
            $scope.chosenPlace = '';
        };

        $scope.goToPage = function(page) {
            location.href = page;
        };

        $scope.showResults = () => {
            $scope.showhide.results = true;
            $scope.showhide.filters = false;
            $rootScope.footerHide = false;
        };

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
                                    $scope.locationPlaceholder = 'Locations, historic places and more';
                                    $scope.disableLocation = false;
                                    $scope.chosenPlace = locationResponse.address;
                                    let pos = {
                                        address: locationResponse.address,
                                        lat: locationResponse.lat,
                                        lng: locationResponse.lng
                                    };
                                    $scope.location = pos;
                                    if (!$scope.showhide.filters) {
                                        $scope.ev = [];
                                        $scope.skip = 0;
                                        $scope.page = 1;
                                        getAllEvents();
                                    }
                                    Utils.applyChanges($scope);
                                } else {
                                    $scope.locationPlaceholder = 'Search Location';
                                    $scope.locationAccessedModal();
                                }
                            }).catch((err) => {
                                $scope.locationPlaceholder = 'Locations, historic places and more';
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
                            $scope.locationPlaceholder = 'Locations, historic places and more';
                            $scope.disableLocation = false;
                            $scope.chosenPlace = locationResponse.address;
                            let pos = {
                                address: locationResponse.address,
                                lat: locationResponse.lat,
                                lng: locationResponse.lng
                            };
                            $scope.location = pos;
                            if (!$scope.showhide.filters) {
                                $scope.ev = [];
                                $scope.skip = 0;
                                $scope.page = 1;
                                getAllEvents();
                            }
                            Utils.applyChanges($scope);
                        } else {
                            $scope.locationPlaceholder = 'Search Location';
                            $scope.locationAccessedModal();
                        }
                    }).catch((err) => {
                        $scope.locationPlaceholder = 'Locations, historic places and more';
                        $scope.disableLocation = false;
                        Utils.applyChanges($scope);
                    });
                }
            } else if (deviceDetector.device == 'iphone' || deviceDetector.device == 'ipad') {
                $scope.locationPlaceholder = 'Getting Location..';
                $scope.disableLocation = true;
                locationService.getUserLocation(true).then((locationResponse) => {
                    if (locationResponse) {
                        $scope.locationPlaceholder = 'Locations, historic places and more';
                        $scope.disableLocation = false;
                        $scope.chosenPlace = locationResponse.address;
                        let pos = {
                            address: locationResponse.address,
                            lat: locationResponse.lat,
                            lng: locationResponse.lng
                        };
                        $scope.location = pos;
                        if (!$scope.showhide.filters) {
                            $scope.ev = [];
                            $scope.skip = 0;
                            $scope.page = 1;
                            getAllEvents();
                        }
                        Utils.applyChanges($scope);
                    } else {
                        $scope.locationPlaceholder = 'Search Location';
                        $scope.locationAccessedModal();
                    }
                }).catch((err) => {
                    $scope.locationPlaceholder = 'Locations, historic places and more';
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
                                $scope.locationPlaceholder = 'Locations, historic places and more';
                                $scope.disableLocation = false;
                                $scope.chosenPlace = locationResponse.address;
                                let pos = {
                                    address: locationResponse.address,
                                    lat: locationResponse.lat,
                                    lng: locationResponse.lng
                                };
                                $scope.location = pos;
                                if (!$scope.showhide.filters) {
                                    $scope.ev = [];
                                    $scope.skip = 0;
                                    $scope.page = 1;
                                    getAllEvents();
                                }
                                Utils.applyChanges($scope);
                            } else {
                                $scope.locationPlaceholder = 'Search Location';
                                $scope.locationAccessedModal();
                            }
                        }).catch((err) => {
                            $scope.locationPlaceholder = 'Locations, historic places and more';
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
                        $scope.locationPlaceholder = 'Locations, historic places and more';
                        $scope.disableLocation = false;
                        $scope.chosenPlace = locationResponse.address;
                        let pos = {
                            address: locationResponse.address,
                            lat: locationResponse.lat,
                            lng: locationResponse.lng
                        };
                        $scope.location = pos;
                        if (!$scope.showhide.filters) {
                            $scope.ev = [];
                            $scope.skip = 0;
                            $scope.page = 1;
                            getAllEvents();
                        }
                        Utils.applyChanges($scope);
                    } else {
                        $scope.locationPlaceholder = 'Search Location';
                        $scope.locationAccessedModal();
                    }
                }).catch((err) => {
                    $scope.locationPlaceholder = 'Locations, historic places and more';
                    $scope.disableLocation = false;
                    Utils.applyChanges($scope);
                });
            }
        };

        $scope.$watch('location', function() {
            if ($scope.location) {
                let lastSearchedLocation = '';
                let lastSearchedLocationCookie = authService.get('lastSearchedLocation');
                if (lastSearchedLocationCookie) {
                    lastSearchedLocation = JSON.parse(lastSearchedLocationCookie);
                    if ('address' in lastSearchedLocation && lastSearchedLocation.address != $scope.chosenPlace && 'lat' in lastSearchedLocation && lastSearchedLocation.lat != $scope.location.lat && 'lng' in lastSearchedLocation && lastSearchedLocation.lng != $scope.location.lng) {
                        let dataForPostingCity = {
                            address: $scope.chosenPlace,
                            lat: $scope.location.lat,
                            lng: $scope.location.lng
                        };
                        setLastSearchedLocation(dataForPostingCity);
                    } else {
                        lastSearchedLocation = {
                            address: $scope.chosenPlace,
                            lat: $scope.location.lat,
                            lng: $scope.location.lng
                        };
                        setLastSearchedLocation(lastSearchedLocation);
                    }
                } else {
                    lastSearchedLocation = {
                        address: $scope.chosenPlace,
                        lat: $scope.location.lat,
                        lng: $scope.location.lng
                    };
                    setLastSearchedLocation(lastSearchedLocation);
                }
            }
        });

        $scope.$watch('loct', function() {
            if ($scope.loct) {
                let pos = {
                    address: $scope.chosenPlace,
                    lat: $scope.loct.lat,
                    lng: $scope.loct.long
                };
                $scope.location = pos;
                if (!$scope.showhide.filters) {
                    $scope.ev = [];
                    $scope.skip = 0;
                    $scope.page = 1;
                    getAllEvents();
                }
            }
        });

        $scope.increaseLimit = (maxLimit) => {
            if ($scope.eventPerPage < maxLimit) {
                $scope.eventPerPage = $scope.eventPerPage + 12;
            }

        };

        $scope.updateShowEventListLoader = (totalEvent, currentEvent) => {
            currentEvent = currentEvent + 1;
            if (totalEvent == currentEvent) {
                $scope.loading = false;
            }
        };
        const applyChanges = () => {
            if (!$scope.$$phase) {
                $scope.$digest();
            }
        };
        const setLastSearchedLocation = function(lastSearchedLocation) {
            let locationGotArray = [];
            locationGotArray.push(lastSearchedLocation);
            locationSearchHistory = authService.get('locationSearchHistory');
            authService.putWithExpiryWith4Hours('lastSearchedLocation', JSON.stringify(lastSearchedLocation));
            if (locationSearchHistory == undefined) {
                locationSearchHistory = [];
                locationSearchHistory.push(lastSearchedLocation);
                $scope.recentSearchDataInfo = locationSearchHistory;
                authService.putWithExpiryWith4Hours('locationSearchHistory', JSON.stringify(locationSearchHistory));
                applyChanges();
            } else if (locationSearchHistory.length > 0 && locationSearchHistory != undefined) {
                $scope.suggestedSection = false;
                angular.forEach(locationGotArray, function(value) {
                    if (locationSearchHistory.indexOf(value.lat) === -1) {
                        locationSearchHistory = JSON.parse(locationSearchHistory);
                        locationSearchHistory.push(value);
                        let updateLocationHistory = locationSearchHistory;
                        $scope.recentSearchDataInfo = updateLocationHistory;
                        authService.putWithExpiryWith4Hours('locationSearchHistory', JSON.stringify(updateLocationHistory));
                        applyChanges();
                    }
                });
            }
        };

        $scope.loadDefaultSearchEvents = function() {
            var loc = window.location.href;
            var categoryName = loc.substring(loc.lastIndexOf('/') + 1);
            let filter = {
                page: $scope.page,
                search_params: {},
            };
            var categoryArr = ["concerts", "festivals", "performing-arts", "community", "sports", "politics", "university-college", "eats-drinks", "live-music", "open-mic-night", "happy-hour", "food-truck", "karaoke", "art-and-craft", "educational-conferences-workshops", "live-streaming-music", "online-events-calendar", "tech-events"];
            filter.search_params.event_name = "";

            var locationSearchHistory = authService.get('lastSearchedLocation');
            locationSearchHistory = locationSearchHistory ? JSON.parse(locationSearchHistory) : null;
            if (locationSearchHistory && locationSearchHistory.address) {
                $scope.location = { "lat": locationSearchHistory.lat, "lng": locationSearchHistory.lng };
                $scope.chosenPlace = locationSearchHistory.address;
                filter.search_params.location = [$scope.location.lat, $scope.location.lng];
            }
            filter.search_params.categories = categoryName && categoryArr.includes(categoryName) ? [categoryName] : categoryArr;
            $scope.ev = [];
            $scope.page = 1;
            getAllEvents(filter);
        };

        $scope.clearLocation = () => {
            $scope.chosenPlace = "";
            Utils.applyChanges($scope);
        };

        $scope.applyFilters = function() {
            $scope.showResults();
            $scope.ev = [];
            $scope.skip = 0;
            $scope.page = 1;
            getAllEvents();
        };
        $scope.handleSlider = (step, id) => {
            angular.element(`#${id}`).carousel(step);
        };

        const createFilter = function() {
            let filter = {
                page: $scope.page,
                search_params: {},
            };
            filter.search_params.event_name = "";
            var loc = window.location.href;
            var categoryName = loc.substring(loc.lastIndexOf('/') + 1);
            var categoryArr = ["concerts", "festivals", "performing-arts", "community", "sports", "politics", "university-college", "eats-drinks", "live-music", "open-mic-night", "happy-hour", "food-truck", "karaoke", "art-and-craft", "educational-conferences-workshops", "live-streaming-music", "online-events-calendar", "tech-events"];

            if ($scope.location) {
                filter.search_params.location = [$scope.location.lat, $scope.location.lng];
            }
            filter.search_params.categories = categoryName && categoryArr.includes(categoryName) ? [categoryName] : categoryArr;

            return filter;
        };

        const getAllEvents = function(filter) {
            $scope.loading = true;
            $scope.searchingText = 'Getting events from across the globe...';
            if (!filter) {
                filter = createFilter();
            }

            return eventsService.getEvents(filter)
                .then((response) => {
                    $scope.searchingText = 'No Results Found.';
                    if (response.status == 200) {
                        $scope.loading = false;
                        let data = response.data;
                        if (data.success) {
                            let res = data.data;
                            if (res && res.length == noOfEventsToLoad) {
                                $scope.loadMorePromoEvents = true;
                                $scope.page = $scope.page + 1;
                            } else {
                                $scope.loadMorePromoEvents = false;
                                $scope.eventPerPagePHQEvents = $scope.eventPerPage;
                            }
                            if (res && res.length > 0) {
                                $scope.searchPlaceholderText = '';
                                res.forEach((r) => {
                                    let event = r;
                                    if (event.event_image) {
                                        event.imageUrl = event.event_image;
                                    } else {
                                        event.imageUrl = '../img/unnamed.png';
                                    }
                                    $scope.ev.push(event);
                                });
                            }
                        } else {
                            $scope.searchingText = data.message;
                        }
                    } else {
                        $scope.searchingText = "Sorry something went worng. Please try later.";
                    }
                    Utils.applyChanges($scope);
                }).catch(err => {
                    $scope.loading = false;
                    $scope.searchingText = 'No Results Found.';
                });
        };

        $scope.init = () => {
            $scope.checkIfUserLoggedIn();
            if (navigator.userAgent.indexOf('Mac OS X') != -1) {
                $("body").addClass("mac");
                $scope.forMacOnly = true;
            }
            angular.element($('#myCarousel').carousel());
            angular.element($('#myCarousel-web').carousel());
            metaTagsService.setDefaultTags({
                'title': "The Promo App | Social Event Management Network",
                'description': "The Promo App makes social event networking and event management easier than ever before. Find events, buy and sell tickets, promote events, and more.",
                'keywords': 'The Promo App, event management',
                'og:site_name': 'thepromoapp',
                'og:title': 'The Best Events',
                'og:description': 'Bringing you and your friends together in real life at incredible events',
                'og:image': '/img/event-promo-app.jpeg',
                'og:url': 'https://thepromoapp.com',
                'twitter:title': 'Thousands of Events',
                'twitter:description': "Have a social life again - bring your friends",
                'twitter:image': '/img/event-promo-app.jpeg',
                'twitter:card': '/img/event-promo-app.jpeg',
            });
        };
        $scope.init();

    }]);

app.directive('headerQ', function() {
    return {
        templateUrl: './partials/header.html'
    };
});
app.directive('footerQ', function() {
    return {
        templateUrl: './partials/footer.html'
    };
});