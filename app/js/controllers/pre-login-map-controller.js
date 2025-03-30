angular.module('PromoApp')
    .controller('PreLoginMapController', ['$http', '$scope', '$cookies', 'authService', '$timeout', 'phqservice', '$filter', 'NgMap', 'config', '$uibModal', '$location', '$rootScope', 'locationService', '$window', 'eventsService', 'awsService', '$route', '$mdDateRangePicker', '$interval', 'Utils', 'apiService', 'metaTagsService', 'deviceDetector', '$document', function($http, $scope, $cookies, authService, $timeout, phqservice, $filter, NgMap, config, $uibModal, $location, $rootScope, locationService, $window, eventsService, awsService, $route, $mdDateRangePicker, $interval, Utils, apiService, metaTagsService, deviceDetector, $document) {

        $scope.filterDateFrom = moment();
        $scope.filterDateTo = moment().add('7', 'days');
        $scope.location = [];
        $scope.oldLocation = $scope.location;
        const locationPlaceholderText = 'Locations, historic places and more';
        $scope.locationPlaceholder = locationPlaceholderText;
        $scope.defaultLocation = [25.7616798, -80.19179020000001];
        $scope.selectedAll = true;
        $scope.selectedModifiedOption = 'Next 7 Days';
        $scope.selectedEvent = null;
        $scope.isCopied = false;
        $scope.template = 'partials/map.html';
        $scope.headerTemplate = 'partials/phase2/pre-login-header.html';
        $scope.isMobile = window.matchMedia("only screen and (max-width: 1024px)");
        $scope.loaderMessage = "Getting Events...";
        $scope.imageCollection = [];
        $scope.isUserLoggedIn = false;
        $scope.isUserLogOut = false;
        $scope.categoryFilterArray = [];
        $scope.toggleEdit = false;
        $scope.forMacOnly = false;
        $scope.resetLocation = false;
        $scope.recentSearch = false;
        $scope.recentSearchDataInfo = [];
        $scope.recentsectionEnables = true;
        $scope.suggestedSection = false;
        let locationSearchHistory = [];
        $scope.removeMarkerFromMap = false;
        $scope.applyMinWidthStyle = false;
        $scope.legendPosition = "TOP_LEFT";
        $scope.isToggleIcon = false;
        $scope.toggleFiltersState = false;
        $scope.toggleDateFiltersState = false;
        $scope.fullScreenLoader = false;
        $scope.toggleFilters = false;
        $scope.toggleDatesFilter = false;
        $scope.show = true;
        $scope.preventUnselect = false;
        $scope.chosenPlaceValue = "";
        $scope.eventName = "";
        $scope.formFields = {
            localSearch: '',
            localFilterSearch: '',
            chosenPlace: null,
            selectedCategories: []
        };
        $scope.showhide = {
            filters: false,
            results: true,
            selectdates: false
        };
        $scope.popularCities = [{
            lat: 25.7616798,
            lng: -80.1917902,
            address: 'Miami, FLA, USA'
        }, {
            lat: 27.950575,
            lng: -82.4571776,
            address: 'Tampa, FL, USA'
        }, {
            lat: 28.5383355,
            lng: -81.3792365,
            address: 'Orlando, FL, USA'
        }, {
            lat: 27.9014133,
            lng: -81.58590989999999,
            address: 'Lake Wales, FL, USA'
        }, {
            lat: 34.0522342,
            lng: -118.2436849,
            address: 'Los Angeles, CA, USA'
        }, {
            lat: 37.7749295,
            lng: -122.4194155,
            address: 'San Francisco, CA, USA'
        }, {
            lat: 40.7127753,
            lng: -74.0059728,
            address: 'New York, NY, USA'
        }, {
            lat: 38.9071923,
            lng: -77.0368707,
            address: 'Washington, DC, USA'
        }];
        $scope.categories = {};
        $scope.eventView = 'map';
        $scope.listViewLimit = 30;
        $scope.showEventListLoader = false;
        $scope.IsValid = false;
        $scope.notificationsclose = false;
        $scope.locationView = false;
        $scope.getclose = false;
        $scope.selectedItem = '';
        $scope.memberZoneList = '';
        $scope.zoneIdData = '';
        let user = authService.getObject('user');
        $scope.increaseLimit = (maxLimit) => {
            if ($scope.listViewLimit < maxLimit) {
                $scope.listViewLimit = $scope.listViewLimit + 30;
            }
        };
        $scope.updateShowEventListLoader = (totalEvent, currentEvent) => {
            currentEvent = currentEvent + 1;
            if (totalEvent == currentEvent) {
                $scope.showEventListLoader = false;
            }
        };

        const getDate = function() {
            // Also get start end and end date
            if ($window.localStorage.getItem("events_start_date")) {
                $scope.filterDateFrom = moment(parseInt($window.localStorage.getItem("events_start_date")));
            }
            if ($window.localStorage.getItem("events_end_date")) {
                $scope.filterDateTo = moment(parseInt($window.localStorage.getItem("events_end_date")));
            }

            // Check if any of the date is past date consider next 7 days
            if (($scope.filterDateFrom && $scope.filterDateFrom.isBefore(moment().startOf('day'))) || ($scope.filterDateTo && $scope.filterDateTo.isBefore(moment().startOf('day')))) {
                $scope.filterDateFrom = moment().startOf('day');
                $scope.filterDateTo = moment().add('7', 'days').endOf('day');
            }
        };

        getDate();

        $scope.showFilters = () => {
            $scope.showhide.results = false;
            $scope.showhide.filters = true;
            $rootScope.footerHide = true;
            $scope.showhide.selectdates = false;
            // Toggle date picker
            setTimeout(() => {
                $scope.webDateRangePicker.mobilePicker.toggle();
                $scope.webDateRangePicker.mobilePicker.toggle();
            }, 500);
        };

        $scope.showResults = () => {
            $scope.showhide.results = true;
            $scope.showhide.filters = false;
            $rootScope.footerHide = false;
        };

        $scope.selectCategory = function() {
            if ($scope.formFields.selectedCategories) {
                for (let k in $scope.categoriesMap) {
                    $scope.categoriesMap[k].selected = false;
                    if (k === $scope.formFields.selectedCategories) {
                        $scope.categoriesMap[k].selected = true;
                    }
                }
            }
        };

        $scope.getZoneId = (zoneId) => {
            $scope.zoneIdData = zoneId;
        };

        $scope.applyFilters = function() {
            $scope.formFields.localSearch = $scope.formFields.localFilterSearch;
            $scope.categoriesMap = $scope.formFields.selectedCategories;
            $scope.removeMarkerFromMap = true;
            $scope.showResults();
            $scope.loadEventsOnMap(false, true);
            $scope.manualLocation();
        };

        $scope.canApplyFilter = () => {
            if (!$scope.formFields.chosenPlace || !$scope.filterDateTo || $scope.formFields.selectedCategories.length == 0) {
                return true;
            } else {
                return false;
            }
        };

        $scope.clearFilterMobile = function() {
            $scope.formFields.localFilterSearch = '';
            $scope.selectedItem = '';
            $scope.formFields.chosenPlace = '';
            $scope.canApplyFilter();
            Utils.applyChanges($scope);
            for (let category of Object.keys($scope.categoriesMap)) {
                $scope.categoriesMap[category].selected = true;
            }
        };

        $scope.clearFilters = function() {
            getDate();
            $scope.formFields.localFilterSearch = '';
            // Check if we have last known location of the user
            let lastSearchedLocationCookie = authService.get('lastSearchedLocation');
            if (lastSearchedLocationCookie) {
                let lastSearchedLocation = JSON.parse(lastSearchedLocationCookie);
                $scope.location = [lastSearchedLocation.lat, lastSearchedLocation.lng];
                $scope.formFields.chosenPlace = lastSearchedLocation.address;
                $scope.chosenPlaceValue = $scope.formFields.chosenPlace;
            }
            $scope.formFields.selectedCategories = '';
            for (let category of Object.keys($scope.categoriesMap)) {
                $scope.categoriesMap[category].selected = true;
            }
            $scope.applyFilters();
        };

        $scope.webDateRangePicker = {
            minDate: moment().add(0, 'day'),
            selectedDate: {
                startDate: $scope.filterDateFrom,
                endDate: $scope.filterDateTo
            },
            picker: null,
            mobilePicker: null,
            toggle() {
                // need to use $timeout here to avoid $apply errors for digest cycle
                $timeout(() => {
                    if ($scope.webDateRangePicker.mobilePicker && $scope.isMobile && $scope.isMobile.matches) {
                        $scope.webDateRangePicker.mobilePicker.toggle();
                    } else {
                        $scope.webDateRangePicker.picker.toggle();
                    }
                });
            },
            options: {
                pickerClasses: 'pa-datepicker',
                applyButtonClasses: 'md-button pa-pink-button pa-font-bold pa-modal-font pa-height-34',
                cancelButtonClasses: 'pa-color-pink pa-modal-font',
                showCustomRangeLabel: false,
                timePicker: false,
                clearable: true,
                autoUpdateInput: true,
                opens: 'left',
                locale: {
                    applyLabel: "Done",
                    clearLabel: 'Reset',
                    separator: ' - ',
                    format: "ddd, DD MMM",
                    "monthNames": [
                        "January",
                        "February",
                        "March",
                        "April",
                        "May",
                        "June",
                        "July",
                        "August",
                        "September",
                        "October",
                        "November",
                        "December"
                    ],
                },
                eventHandlers: {
                    'hide.daterangepicker': function(event, picker) {
                        $scope.showhide.selectdates = false;
                    },
                    'show.daterangepicker': function(event, picker) {
                        $scope.showhide.selectdates = true;
                        if (event && event.picker) {
                            event.picker.element.val($scope.filterDateFrom.format('ddd, DD MMM'));
                        }
                    },
                    'apply.daterangepicker': function(event, picker) {
                        $scope.filterDateFrom = $scope.webDateRangePicker.selectedDate.startDate;
                        $scope.filterDateTo = $scope.webDateRangePicker.selectedDate.endDate;
                        $scope.eventMarkers = [];
                        if (event && event.picker) {
                            event.picker.element.val($scope.filterDateFrom.format('ddd, DD MMM'));
                        }
                        if (event && event.mobilePicker) {
                            event.mobilePicker.element.val($scope.startDate);
                        }
                        if (!$scope.showhide.filters) {
                            $scope.loadEventsOnMap(false, true);
                            $scope.broadCastMessage("removeMarker");
                        }
                    }
                }
            }
        };

        $scope.dateRangePicker = {
            model: {
                dateStart: $scope.filterDateFrom.toDate(),
                dateEnd: $scope.filterDateTo.toDate()
            },
            autoConfirm: true,
            onePanel: true,
            showTemplate: true,
            selectedDate: {
                dateStart: $scope.filterDateFrom.toDate(),
                dateEnd: $scope.filterDateTo.toDate()
            },
            isDisabledDate: function(d) {
                return (moment(d).isBefore(moment().add('-1', 'day')));
            },
            format: function(dateStart, dateEnd, template, templateName) {
                return moment(dateStart).format('MMM DD') + ' to ' + moment(dateEnd).format('MMM DD');
            }


        };

        $scope.checkIfUserLoggedIn = () => {
            $scope.user = authService.getObject('user');
            $scope.session = authService.getObject('session');
            if ($scope.user && $scope.session) {
                $scope.headerTemplate = 'partials/header.html';
            }
        };

        // This method is called when first location dialog box is closed
        $scope.closeLocationDialog = (reset) => {

            if (reset) {
                authService.remove('userCurrentLocation');
            }
            locationService.getUserLocation()
                .then((locationResponse) => {
                    $scope.location = [];
                    $scope.location.push(locationResponse.lat);
                    $scope.location.push(locationResponse.lng);
                    $scope.formFields.chosenPlace = locationResponse.address;
                    $scope.chosenPlaceValue = $scope.formFields.chosenPlace;
                    $scope.chosenPlaceValue = locationResponse.address;
                    $scope.openMap();
                });
        };

        $scope.loading = false;
        var vm = this;
        $scope.categoriesMap = [];

        $scope.images = ['../img/anu.png', '../img/universityofstandrews.png', '../img/stanford.png',
            '../img/hku-logo.png', '../img/illusion.png', '../img/oxford.png',
            '../img/toranto.png'
        ];

        $scope.timeFilterList = ['Now', 'Tonight', 'Tomorrow', 'This Weekend', 'This Week', 'Next 7 Days', 'Next Month'];

        $scope.applyCategorySelection = function(progressiveRefresh) {
            let selectedCategories = [];
            angular.forEach($scope.categoriesMap, function(value, key) {
                if (value.selected) {
                    selectedCategories.push(value.id);
                }
            });

            // Get markers from storage
            let events = readEventsFromLocalStorage();
            if (events) {
                $scope.eventMarkers = events;
            }

            $scope.eventMarkers = $scope.eventMarkers.filter(e => selectedCategories.includes(e.category));
            $scope.broadCastMessage("loadMarkersOnMap", {
                location: $scope.location,
                events: $scope.eventMarkers,
                progressiveRefresh: progressiveRefresh
            });
            applyChanges();
        };

        $scope.toggleCategorySelection = function() {
            $scope.categorySelectionButton = ($scope.categorySelectionButton == 'Unselect All' ? 'Select All' : 'Unselect All');
            for (let k in $scope.categoriesMap) {
                $scope.categoriesMap[k].selected = ($scope.categorySelectionButton != 'Select All');
            }
            $scope.changeCategorySelection();
            $scope.makeDisable();
        };

        $scope.changeCategorySelection = function(key) {
            // See if current call is making selection or un-selection
            $scope.categoryFilterArray = [];
            for (let k in $scope.categoriesMap) {
                if (!$scope.categoriesMap[k].selected) {
                    $scope.categoryFilterArray.push(k);
                }
            }
            if ($scope.categoryFilterArray.length === Object.keys($scope.categoriesMap).length) {
                $scope.categorySelectionButton = 'Select All';
            } else if ($scope.categoryFilterArray.length === 0) {
                $scope.categorySelectionButton = 'Unselect All';
            }
            if ($scope.categoryFilterArray.length == $scope.categoriesMap.length) {
                $scope.preventUnselect = true;
            } else {
                $scope.preventUnselect = false;
            }
            $scope.broadCastMessage("removeMarker");
            $scope.applyCategorySelection();
            if ($cookies.get('eventView') && $cookies.get('eventView') == 'map') {}

            $scope.IsValid = false;
        };

        $scope.loadEventsFromStorage = function(openEvent) {
            let events = readEventsFromLocalStorage();
            if (events) {
                // Remove events which are older than today
                $scope.eventMarkers = [];
                for (let event of events) {
                    if ('end_date_time_ms' in event && event.end_date_time_ms >= moment.utc().add(-1, 'days').valueOf()) {
                        $scope.eventMarkers.push(event);
                    }
                }

                // Get events from storage
                let loadMarkersOnMapData = {
                    location: $scope.location,
                    events: $scope.eventMarkers,
                    progressiveRefresh: null
                };

                if (openEvent) {
                    let eventToOpen = $scope.eventMarkers.filter(e => e.event_id === openEvent);
                    if (eventToOpen && eventToOpen.length > 0) {
                        loadMarkersOnMapData.openMarker = eventToOpen[0];
                    }
                }

                $scope.broadCastMessage("loadMarkersOnMap", loadMarkersOnMapData);
                Utils.applyChanges($scope);
            }
        };

        const applyChanges = () => {
            if (!$scope.$$phase) {
                $scope.$digest();
            }
        };

        const saveEventsInLocalStorage = () => {
            $window.localStorage.setItem("events", JSON.stringify($scope.eventMarkers));
            // Also store start and end date
            $window.localStorage.setItem("events_start_date", $scope.filterDateFrom.valueOf());
            $window.localStorage.setItem("events_end_date", $scope.filterDateTo.valueOf());
        };

        const readEventsFromLocalStorage = () => {
            let events = $window.localStorage.getItem("events");
            if (events) {
                return JSON.parse(events);
            }
            return [];
        };

        $scope.$on('loadEventsOnMapFunction', function(event, category) {
            $scope.loadEventsOnMap(false);
        });

        $scope.clearLocation = () => {
            $scope.formFields.chosenPlace = "";
            authService.remove('lastSearchedLocation');
            Utils.applyChanges($scope);
        };

        $scope.getEventInbackground = function(selectedCategories, filterDateFrom, filterDateTo, name, location, oldEventCallLength, background, index, zoneId) {
            $scope.zoneIdData = zoneId;
            let zoneIdData = '';
            if (zoneId == '') {
                zoneIdData = $scope.zoneIdData;
            } else {
                zoneIdData = zoneId;
            }
            phqservice.getAllEvents(selectedCategories, filterDateFrom, filterDateTo, name, location, background, index, zoneIdData).then((res) => {
                let search_location = authService.get('search_query_location', location[0]);
                if (search_location == location[0]) {
                    let element = res.events;
                    let newEventLenght = element.length;
                    let oldIdsOfEventMarkers = $scope.eventMarkers.map(e => e.event_id);
                    let newEventMarkers = element.filter(e => !oldIdsOfEventMarkers.includes(e.event_id));
                    $scope.postProcessEvents(false, newEventMarkers);
                    $scope.eventMarkers = $scope.eventMarkers.concat(newEventMarkers);
                    saveEventsInLocalStorage();
                    applyChanges();
                    let newindex = index + 1;
                    if ((res.scraping_event_count != 0) && (res.scraped_event_count <= res.scraping_event_count) && (index < newindex) && element.length <= 10) {
                        $scope.getEventInbackground(selectedCategories, filterDateFrom, filterDateTo, name, location, newEventLenght, background, newindex, zoneIdData);
                    } else {
                        $scope.loadingMap = false;
                    }
                    $scope.applyCategorySelection(true);
                    $scope.broadCastMessage("loadMap", { location: location, resetLocation: false });
                } else {
                    clearEventsFromCache();
                    $http.pendingRequests.forEach(function(request) {
                        if (request.cancel) {
                            request.cancel.resolve();
                        }
                    });
                }
            });
        };

        $scope.loadEventsOnMap = function(hardRefresh, progressiveRefresh) {
            $http.pendingRequests.forEach(function(request) {
                if (request.cancel) {
                    request.cancel.resolve();
                }
            });
            $scope.prevMarkerId = '';
            // Get all selected categories
            $scope.loading = false;
            $scope.eventName = $scope.formFields.localSearch;
            if (!$scope.eventName || progressiveRefresh) {
                $scope.fullScreenLoader = true;
            }
            let selectedCategories = [];

            let location = [];
            location = $scope.defaultLocation;
            if ($scope.location.length > 0) {
                location = $scope.location;
            }
            // This is done so that by default we always get for all categories
            angular.forEach($scope.formFields.selectedCategories, function(value, key) {
                selectedCategories.push(value.id);
            });
            if (!progressiveRefresh) {
                $scope.eventMarkers = [];
            }
            $scope.loaderMessage = "Getting Events...";
            if (!progressiveRefresh) {
                $scope.loading = true;
            } else {
                $scope.loadingMap = false;
            }
            if (hardRefresh) {
                phqservice.refreshEvents(selectedCategories, $scope.filterDateFrom, $scope.filterDateTo, $scope.formFields.localSearch, location).then((element) => {
                    if (element) {
                        // Add only events which are new
                        $scope.eventMarkers = [];
                        if (progressiveRefresh) {
                            // get old ids
                            let oldIdsOfEventMarkers = $scope.eventMarkers.map(e => e.event_id);
                            let newEventMarkers = element.filter(e => !oldIdsOfEventMarkers.includes(e.event_id));
                            $scope.postProcessEvents(false, newEventMarkers);
                            $scope.eventMarkers = $scope.eventMarkers.concat(newEventMarkers);
                        } else {
                            $scope.eventMarkers = element;
                            $scope.postProcessEvents(false);
                        }
                        saveEventsInLocalStorage();
                        $scope.applyCategorySelection(progressiveRefresh);

                    }
                });
            } else {
                if (selectedCategories.length < 1) {
                    selectedCategories = ["concerts", "festivals", "performing-arts", "community", "sports", "politics", "university-college", "eats-drinks"];
                }
                let localSearchName = $scope.formFields.localSearch;
                phqservice.getAllEvents(selectedCategories, $scope.filterDateFrom, $scope.filterDateTo, $scope.formFields.localSearch, location, false, false, $scope.zoneIdData).then((element) => {
                    if (element) {
                        // Add only events which are new
                        $scope.eventMarkers = [];
                        if (progressiveRefresh) {
                            // get old ids
                            let oldIdsOfEventMarkers = $scope.eventMarkers.map(e => e.event_id);
                            let newEventMarkers = element.filter(e => !oldIdsOfEventMarkers.includes(e.event_id));
                            $scope.postProcessEvents(false, element);
                            $scope.eventMarkers = element;
                        } else {
                            $scope.eventMarkers = element;
                            $scope.postProcessEvents(false);
                        }
                        authService.put('search_query_location', location[0]);
                        if (element.length <= 10) {
                            $scope.getEventInbackground(selectedCategories, $scope.filterDateFrom, $scope.filterDateTo, localSearchName, location, element.length, true, 1, $scope.zoneIdData);
                        }

                        if ($scope.selectedModifiedOption != "Next Month") {
                            saveEventsInLocalStorage();
                        }
                        if ($scope.isMobile && $scope.isMobile.matches && $scope.removeMarkerFromMap) {
                            $scope.removeMarkerFromMap = false;
                            $scope.broadCastMessage("removeMarker");
                        }
                        $scope.applyCategorySelection(progressiveRefresh);
                    }
                    applyChanges();
                });
            }
        };

        $scope.resetAll = () => {
            $scope.selectedAll = false;
            $scope.toggleFilters = false;
            $scope.loadEventsOnMap(true);
        };

        $scope.postProcessEvents = (showMarkerVisible, events) => {
            if (!events) {
                events = $scope.eventMarkers;
            }
            events.forEach((e) => {
                if (e.description) {
                    e.shortDescription = e.description.length > 70 ? e.description.substring(0, 70) + '...' : e.description;
                }
                e.expandBubble = false;
                if (e.title) {
                    e.shortTitle = e.event_name.length > 20 ? e.event_name.substring(0, 20) + '...' : e.event_name;
                }
                e.showMarkerVisible = false;
                if (showMarkerVisible) {
                    e.showMarkerVisible = showMarkerVisible;
                }
                if (!e.image_url && e.event_image) {
                    e.image_url = e.event_image;
                }
            });
            $scope.loading = false;
            $scope.fullScreenLoader = false;
        };

        $scope.setView = (view) => {
            if ($scope.toggleFilters && !$scope.preventUnselect) {
                $scope.toggleFilters = false;
            }
            $scope.isMaps = view;
            let body = angular.element('body');
            if (view) {
                $cookies.put('eventView', 'map');
                $window.scrollTo(0, 0);
                body.addClass('noSrcollBody');
                if ($scope.mobileInfoWindow) {
                    angular.element('.list-dark-map-span').css('bottom', '33%');
                } else {
                    angular.element('.list-dark-map-span').css('bottom', '11%');
                }
            } else {
                $scope.showEventListLoader = true;
                $scope.listViewLimit = 30;
                $cookies.put('eventView', 'list');
                angular.element('.list-dark-map-span').css('bottom', '11%');
            }
            $scope.broadCastMessage('setView', { view: view });
            $scope.showResults();
        };

        $scope.setLoadView = () => {
            let queryStringObject = $location.search();
            if (queryStringObject && ('claim' in queryStringObject || 'claimafterlogin' in queryStringObject || 'edit' in queryStringObject) || $scope.setEvent) {
                $scope.isMaps = false;
            } else {
                $scope.isMaps = true;
            }
        };

        // This method open a event by id
        $scope.openEventById = (eventId, openEvent) => {

            phqservice.getEventById(eventId)
                .then((event) => {
                    if (event) {
                        // Recenter map to above location

                        $scope.location = event.location;
                        $scope.formFields.chosenPlace = event.address;
                        $scope.chosenPlaceValue = $scope.formFields.chosenPlace;
                        $scope.chosenPlaceValue = event.address;
                        $scope.eventMarkers = [event];
                        $scope.postProcessEvents(true);

                        let loadMapEventData = {
                            location: $scope.location,
                            events: $scope.eventMarkers,
                            openMarker: event,
                            resetLocation: false
                        };

                        $scope.broadCastMessage("loadMap", loadMapEventData);

                        if (openEvent) {
                            $scope.broadCastMessage("loadMarkersOnMap", {
                                location: $scope.location,
                                events: $scope.eventMarkers,
                                progressiveRefresh: null,
                                openMarker: event
                            });
                        }
                    } else {
                        $scope.prevMarkerId = '';
                        $scope.loadEventsOnMap(false);
                        $scope.broadCastMessage("loadMap", { location: $scope.location, resetLocation: false });
                    }
                })
                .finally(() => {
                    $scope.loading = false;
                    applyChanges();
                });
        };

        $scope.openMap = () => {
            // Check if you have any query string

            $scope.setLoadView();
            $scope.loading = true;
            $scope.fullScreenLoader = true;
            $scope.loaderMessage = "Getting Events...";
            $scope.checkIfUserLoggedIn();
            $scope.loadUserEventGoing()
                .then(() => {

                    let queryStringObject = $location.search();
                    let eventToOpen = null,
                        openEvent = false;
                    if (queryStringObject && 'share' in queryStringObject) {
                        eventToOpen = queryStringObject.share;
                    } else if (queryStringObject && 'edit' in queryStringObject) {

                        eventToOpen = queryStringObject.edit;
                    } else if (queryStringObject && 'claim' in queryStringObject) {
                        eventToOpen = queryStringObject.claim;

                    } else if ('openevent' in queryStringObject && queryStringObject.openevent) {
                        eventToOpen = queryStringObject.openevent;
                        openEvent = true;
                    }

                    // Check if we have events in localstorage
                    $scope.prevMarkerId = '';
                    let events = readEventsFromLocalStorage();
                    if (eventToOpen) {
                        // check if localstorage have it
                        if (events && events.length > 0) {
                            // Check if event to open is in local storage
                            let eventFromCache = events.filter(e => (e.event_id || e.id) === eventToOpen);
                            if (eventFromCache && eventFromCache.length > 0) {
                                $scope.loadEventsFromStorage(openEvent);
                                $scope.location = eventFromCache[0].location;
                                $scope.formFields.chosenPlace = eventFromCache[0].address;
                                $scope.chosenPlaceValue = $scope.formFields.chosenPlace;
                                $scope.chosenPlaceValue = eventFromCache[0].address;
                                $scope.formFields.localSearch = eventFromCache[0].title;
                                $scope.broadCastMessage("loadMap", { location: $scope.location, resetLocation: false });
                                $scope.broadCastMessage("loadMarkersOnMap", {
                                    location: $scope.location,
                                    events: $scope.eventMarkers,
                                    progressiveRefresh: null,
                                    openMarker: eventFromCache[0]
                                });
                            } else {
                                $scope.openEventById(eventToOpen, openEvent);
                            }
                        } else {
                            $scope.openEventById(eventToOpen, openEvent);
                        }
                    } else {
                        $scope.broadCastMessage("loadMap", { location: $scope.location, resetLocation: false });
                        if (events && events.length > 0) {
                            // Check if event to open is in local storage
                            $scope.loadEventsFromStorage();
                        } else {
                            $scope.loadEventsOnMap(false, true);
                        }
                    }
                });

        };

        $scope.broadCastMessage = (message, data) => {
            setTimeout(function() {
                $scope.$broadcast(message, data);
            }, 50);
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
                                    $scope.locationPlaceholder = 'Search Location';
                                    $scope.disableLocation = false;
                                    if ('address' in locationResponse) {
                                        $scope.formFields.chosenPlace = locationResponse.address;
                                    } else if ('city' in locationResponse) {
                                        $scope.formFields.chosenPlace = locationResponse.city;
                                    } 
                                    $scope.loct = {
                                        lat: locationResponse.lat,
                                        long: locationResponse.lng,
                                        text: $scope.formFields.chosenPlace
                                    };
                                    $scope.formFields.chosenPlace_lat = locationResponse.lat;
                                    $scope.formFields.chosenPlace_long = locationResponse.lng;
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
                    locationService.getUserLocation(true).then((locationResponse) => {
                        if (locationResponse) {
                            $scope.locationPlaceholder = 'Search Location';
                            $scope.disableLocation = false;
                            if ('address' in locationResponse) {
                                $scope.formFields.chosenPlace = locationResponse.address;
                            } else if ('city' in locationResponse) {
                                $scope.formFields.chosenPlace = locationResponse.city;
                            }
                            $scope.loct = {
                                lat: locationResponse.lat,
                                long: locationResponse.lng,
                                text: $scope.formFields.chosenPlace
                            };
                            $scope.formFields.chosenPlace_lat = locationResponse.lat;
                            $scope.formFields.chosenPlace_long = locationResponse.lng;
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
                locationService.getUserLocation(true).then((locationResponse) => {
                    if (locationResponse) {
                        $scope.locationPlaceholder = 'Search Location';
                        $scope.disableLocation = false;
                        if ('address' in locationResponse) {
                            $scope.formFields.chosenPlace = locationResponse.address;
                        } else if ('city' in locationResponse) {
                            $scope.formFields.chosenPlace = locationResponse.city;
                        }
                        $scope.loct = {
                            lat: locationResponse.lat,
                            long: locationResponse.lng,
                            text: $scope.formFields.chosenPlace
                        };
                        $scope.formFields.chosenPlace_lat = locationResponse.lat;
                        $scope.formFields.chosenPlace_long = locationResponse.lng;
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
                        locationService.getUserLocation(true).then((locationResponse) => {
                            if (locationResponse) {
                                $scope.locationPlaceholder = 'Search Location';
                                $scope.disableLocation = false;
                                if ('address' in locationResponse) {
                                    $scope.formFields.chosenPlace = locationResponse.address;
                                } else if ('city' in locationResponse) {
                                    $scope.formFields.chosenPlace = locationResponse.city;
                                }
                                $scope.loct = {
                                    lat: locationResponse.lat,
                                    long: locationResponse.lng,
                                    text: $scope.formFields.chosenPlace
                                };
                                $scope.formFields.chosenPlace_lat = locationResponse.lat;
                                $scope.formFields.chosenPlace_long = locationResponse.lng;
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
                locationService.getUserLocation(true).then((locationResponse) => {
                    if (locationResponse) {
                        $scope.locationPlaceholder = 'Search Location';
                        $scope.disableLocation = false;
                        if ('address' in locationResponse) {
                            $scope.formFields.chosenPlace = locationResponse.address;
                        } else if ('city' in locationResponse) {
                            $scope.formFields.chosenPlace = locationResponse.city;
                        }
                        $scope.loct = {
                            lat: locationResponse.lat,
                            long: locationResponse.lng,
                            text: $scope.formFields.chosenPlace
                        };
                        $scope.formFields.chosenPlace_lat = locationResponse.lat;
                        $scope.formFields.chosenPlace_long = locationResponse.lng;
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
            $scope.selectedItem = $scope.zoneIdData;
            // This is done since on mobile view user has to apply filters
            if (!$scope.showhide.filters) {
                $scope.manualLocation();
            }
        });

        $scope.$watch('formFields.localSearch', function(data) {
            if (data) {
                $scope.broadCastMessage("removeMarker");
                $scope.loadEventsOnMap();
            }
        });

        $scope.$watch('fullScreenLoader', function(oldValue, newValue) {
            if (oldValue != null && newValue != null && oldValue != newValue) {
                // Toggle date picker
                setTimeout(() => {
                    $scope.webDateRangePicker.picker.toggle();
                    $scope.webDateRangePicker.picker.toggle();
                }, 1000);
            }
        });

        $scope.$watch('isMaps', function(newVal) {
            if (newVal) {
                $rootScope.showUpdateEventTemplet = false;
            }
            $scope.broadCastMessage("mapWindowTabClicked", newVal);
        });

        const clearEventsFromCache = function() {
            $window.localStorage.removeItem("events");
        };

        const setLastSearchedLocation = function(lastSearchedLocation, clearEventsCache) {
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
            if (clearEventsCache) {
                clearEventsFromCache();
            }
        };

        $scope.$watch('location', function() {
            $window.localStorage.removeItem("marker_ids");
            if ($scope.location && $scope.location.length == 2) {
                let lastSearchedLocation = '';
                let lastSearchedLocationCookie = authService.get('lastSearchedLocation');
                if (lastSearchedLocationCookie) {
                    lastSearchedLocation = JSON.parse(lastSearchedLocationCookie);
                    if ('address' in lastSearchedLocation && lastSearchedLocation.address != $scope.formFields.chosenPlace && 'lat' in lastSearchedLocation && lastSearchedLocation.lat != $scope.location[0] && 'lng' in lastSearchedLocation && lastSearchedLocation.lng != $scope.location[1]) {
                        let dataForPostingCity = {
                            address: $scope.formFields.chosenPlace,
                            lat: $scope.location[0],
                            long: $scope.location[1]
                        };
                        postCitiesData(dataForPostingCity);
                    }
                } else {
                    lastSearchedLocation = {
                        lat: $scope.location[0],
                        lng: $scope.location[1],
                        address: $scope.formFields.chosenPlace
                    };
                    setLastSearchedLocation(lastSearchedLocation);
                }
                $scope.broadCastMessage("loadMap", { location: $scope.location, resetLocation: $scope.resetLocation });
            }
        });

        $scope.manualLocation = function() {
            $scope.fullScreenLoader = true;
            clearEventsFromCache();
            $scope.eventMarkers = [];
            authService.put('loadEventsOnMap_call', 1);
            if ($scope.loct && $scope.loct.lat && $scope.loct.long) {
                $scope.prevMarkerId = '';
                let pos = {
                    address: $scope.formFields.chosenPlace,
                    lat: $scope.loct.lat,
                    lng: $scope.loct.long
                };
                $scope.location = [];
                $scope.location.push(pos.lat);
                $scope.location.push(pos.lng);
                $scope.formFields.chosenPlace = $scope.loct.text;
                $scope.chosenPlaceValue = $scope.formFields.chosenPlace;
                let lastSearchedLocation = {
                    lat: $scope.location[0],
                    lng: $scope.location[1],
                    address: $scope.formFields.chosenPlace
                };
                setLastSearchedLocation(lastSearchedLocation, true);
                $scope.categorySelectionButton = 'Unselect All';
                $scope.broadCastMessage("removeMarker");
                // $scope.toggleCategorySelection();
                $scope.loadEventsOnMap(false, true);
                $scope.resetLocation = true;
            } else {
                $scope.fullScreenLoader = false;
            }
            $scope.formFields.localSearch = '';
        };

        $scope.recentSearchCall = (data) => {
            $scope.eventMarkers = [];
            $scope.defaultLocation = [data.lat, data.lng];
            $scope.loct = {
                lat: data.lat,
                long: data.lng,
                text: data.address
            };
            setLastSearchedLocation(data);
            $scope.recentSearch = false;
            $scope.fullScreenLoader = true;
            // $scope.loadEventsOnMap(false, true);
        };

        $scope.updateMapZoneList = (id) => {
            $scope.zoneIdData = id;
            $scope.broadCastMessage("removeMarker");
            $scope.loadEventsOnMap(false);
        };

        $scope.checkAll = () => {
            $scope.selectedAll = !$scope.selectedAll;
            angular.forEach($scope.categoriesMap, function(value, key) {
                value.selected = $scope.selectedAll;
            });
            $scope.prevMarkerId = '';
            if ($scope.selectedAll) {
                $scope.loadEventsOnMap(false);
            } else {
                $scope.$broadcast("hideMarkerOnCategoryUnSelection", "all");
            }
        };

        $scope.$on('viewChange', function($event, data) {
            if (data && data.view) {
                $scope.setView((data.view === 'map'));
            }
        });

        $scope.$on('toggleFilters', function($event, data) {
            if (data) {
                $scope.showFilters();
            }
        });

        $scope.$on('createModalClosed', function($event, val) {
            if (val == false) {
                $scope.applyMinWidthStyle = false;
            } else {
                $scope.applyMinWidthStyle = true;
            }
        });

        $scope.close = function() {
            $scope.localSearch = "";
            $scope.show = false;
        };

        $scope.filterEventsWithoutCall = function() {
            $scope.loadEventsOnMap(false, true);
        };

        $scope.eventByName = function() {
            $scope.eventName = $scope.formFields.localSearch;
            if ($scope.eventName !== "") {
                $scope.loadEventsOnMap(false, true);
            }
        };

        $scope.memberZoneListData = () => {
            $scope.loading = true;
            let token = authService.get('token');
            apiService.getMemberZoneList(token).then((response) => {
                if (response.data.success) {
                    $scope.memberZoneList = response.data.data;
                }
            }).catch((err) => {
                console.log("Get Member Zone List", err);
            }).finally(() => {
                $scope.loading = false;
            });
        };

        $scope.$on('openLoginModalForNonLoggedInUser', function($event, eventId) {
            if (eventId) {
                $scope.openLoginModal(eventId);
            } else {
                $scope.openLoginModal();
            }
        });

        // Login modal
        $scope.openLoginModal = function(eventId, redirect) {
            // create new scope for modal
            let modalScope = $scope.$new(true);
            let queryStringObject = $location.search();
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

        $scope.$on('locationModalClose', function($event, eventData) {

            if (eventData.fetchLocation) {
                $scope.locationPlaceholder = 'Getting Location..';
                $scope.disableLocation = true;
                $scope.loading = true;
                $scope.loaderMessage = "Getting Location...";
                applyChanges();

                locationService.getUserLocation()
                    .then((locationResponse) => {
                        $scope.location = [locationResponse.lat, locationResponse.lng];
                        $scope.formFields.chosenPlace = locationResponse.address;
                        $scope.chosenPlaceValue = $scope.formFields.chosenPlace;
                        let lastSearchedLocation = {
                            lat: $scope.location[0],
                            lng: $scope.location[1],
                            address: $scope.formFields.chosenPlace
                        };
                        setLastSearchedLocation(lastSearchedLocation, true);
                        $scope.loading = false;
                        let dataForPostingCity = {
                            address: $scope.formFields.chosenPlace,
                            lat: $scope.location[0],
                            long: $scope.location[1]
                        };
                        postCitiesData(dataForPostingCity);
                        $scope.openMap();
                    })
                    .finally(() => {
                        $scope.locationPlaceholder = locationPlaceholderText;
                        $scope.disableLocation = false;
                        applyChanges();
                    });
            } else {
                $scope.location = [eventData.lat, eventData.lng];
                $scope.formFields.chosenPlace = eventData.address;
                $scope.chosenPlaceValue = $scope.formFields.chosenPlace;
                let lastSearchedLocation = {
                    lat: $scope.location[0],
                    lng: $scope.location[1],
                    address: $scope.formFields.chosenPlace
                };
                setLastSearchedLocation(lastSearchedLocation, true);

                $scope.loading = false;
                let dataForPostingCity = {
                    address: $scope.formFields.chosenPlace,
                    lat: $scope.location[0],
                    long: $scope.location[1]
                };
                postCitiesData(dataForPostingCity);
            }

        });

        $scope.loadUserEventGoing = () => {
            let session = authService.getObject('session');
            if (user && session) {
                return eventsService.getEventAttendingByUser(user.user_id);
            } else {
                return Promise.resolve(true);
            }
        };

        $scope.enableHistoryDropdown = (event) => {
            event.preventDefault();
            event.stopPropagation();
            $scope.recentSearch = true;
            Utils.applyChanges($scope);
        };

        $scope.toggleSuggestedCities = () => {
            $scope.suggestedSection = !$scope.suggestedSection;
        };

        $scope.toggleRecentVisited = () => {
            $scope.recentsectionEnables = !$scope.recentsectionEnables;
        };

        $scope.initOnPageLoad = () => {
            let queryStringObject = $location.search();
            setTimeout(function() {
                angular.element("#dateRangePicker").val($scope.filterDateFrom.format('ddd, DD MMM'));
            }, 50);
            $scope.checkIfUserLoggedIn();
            // First check if coming from shared link
            if (queryStringObject && 'share' in queryStringObject) {
                $scope.broadCastMessage("loadMap", { location: $scope.location, resetLocation: false });
                $scope.openMap();
            } else {
                let lastSearchedLocationCookie = authService.get('lastSearchedLocation');
                $scope.user = authService.getObject('user');
                if (lastSearchedLocationCookie) {
                    clearEventsFromCache();
                    let lastSearchedLocation = JSON.parse(lastSearchedLocationCookie);
                    if (lastSearchedLocation && $scope.user) {
                        if (lastSearchedLocation.lat && lastSearchedLocation.lng) {
                            $scope.location = [lastSearchedLocation.lat, lastSearchedLocation.lng];
                            $scope.formFields.chosenPlace = lastSearchedLocation.address;
                            $scope.chosenPlaceValue = $scope.formFields.chosenPlace;
                            $scope.loct = {
                                lat: lastSearchedLocation.lat,
                                long: lastSearchedLocation.lng,
                                text: lastSearchedLocation.address
                            };
                        } else {
                            $scope.location = [$scope.user.city_lat, $scope.user.city_long];
                            $scope.formFields.chosenPlace = $scope.user.city;
                            $scope.chosenPlaceValue = $scope.formFields.chosenPlace;
                            $scope.loct = {
                                lat: $scope.user.city_lat,
                                long: $scope.user.city_long,
                                text: $scope.user.city
                            };
                        }
                    } else {
                        if ($scope.user) {
                            $scope.location = [$scope.user.city_lat, $scope.user.city_long];
                            $scope.formFields.chosenPlace = $scope.user.city;
                            $scope.chosenPlaceValue = $scope.formFields.chosenPlace;
                            $scope.loct = {
                                lat: $scope.user.city_lat,
                                long: $scope.user.city_long,
                                text: $scope.user.city
                            };
                        } else {
                            $scope.location = [lastSearchedLocation.lat, lastSearchedLocation.lng];
                            $scope.formFields.chosenPlace = lastSearchedLocation.address;
                            $scope.chosenPlaceValue = $scope.formFields.chosenPlace;
                            $scope.loct = {
                                lat: lastSearchedLocation.lat,
                                long: lastSearchedLocation.lng,
                                text: lastSearchedLocation.address
                            };
                        }
                    }
                    $scope.loading = false;
                    $scope.broadCastMessage("loadMap", { location: $scope.location, resetLocation: false });
                    $scope.openMap();
                    if ($cookies.get('eventView') && $cookies.get('eventView') == 'list') {
                        $scope.setView(false);
                    }
                } else {
                    // This is done so that old events from cache is not picked
                    clearEventsFromCache();
                    $scope.locationView = true;
                }
            }

            let needHardRefresh = $window.localStorage.getItem("needHardRefresh");
            if (needHardRefresh) {
                $window.localStorage.removeItem("needHardRefresh");
            } else {
                $window.localStorage.setItem("needHardRefresh", true);
            }
            let recentSearchInfo = authService.get('locationSearchHistory');
            if (recentSearchInfo != undefined) {
                $scope.recentSearchDataInfo = JSON.parse(recentSearchInfo);
            } else {
                $scope.recentSearchDataInfo = [];
                $scope.suggestedSection = true;
            }
            $window.localStorage.removeItem("marker_ids");
            authService.put('loadEventsOnMap_call', 1);
            if (user) {
                $scope.memberZoneListData();
            }
            styleForMacOnly();

            $document.on('click', function(event) {
                var $target = $(event.target);
                if (!$target.closest('#menucontainer').length && $document.find('#menucontainer').length && !angular.element('#menucontainer').hasClass("ng-hide") && $scope.recentSearch) {
                    $scope.recentSearch = false;
                    $scope.recentsectionEnables = true;
                    if ($scope.recentSearchDataInfo.length > 0) {
                        $scope.suggestedSection = false;
                    }
                    Utils.applyChanges($scope);
                }
                if (!$scope.preventUnselect) {
                    if (!$target.closest('#categoriesList').length && $document.find('#categoriesList').length && !angular.element('#categoriesList').hasClass("ng-hide") && $scope.toggleFilters) {
                        $scope.toggleFilters = false;
                        Utils.applyChanges($scope);
                    }
                }
            });

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
            //get event category 
            apiService.getEventCategories().then((response) => {
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
                            $scope.categoriesMap.push(category);
                        });
                        $scope.categories = Object.values($scope.categoriesMap);
                    }
                }
            });
        };

        //for toggling the filter
        $scope.openNav = function(event) {
            event.preventDefault();
            event.stopPropagation();
            $scope.toggleFilters = !$scope.toggleFilters;
            if ($scope.toggleFilters) {
                $scope.toggleFiltersState = true;
                $scope.toggleDateFiltersState = false;
            } else {
                $scope.toggleFiltersState = false;
                $scope.toggleDateFiltersState = false;
            }
        };

        $scope.openDatesNav = function() {
            $scope.toggleDatesFilter = !$scope.toggleDatesFilter;
            $scope.toggleDateFiltersState = $scope.toggleDatesFilter;
        };

        //clear search text on cross
        $scope.clearSearch = function() {
            $scope.formFields.localSearch = '';
            $scope.manualLocation();
        };

        let styleForMacOnly = () => {
            if (navigator.userAgent.indexOf('Mac OS X') != -1) {
                $("body").addClass("mac");
                $scope.forMacOnly = true;
            }

        };

        $scope.handleDateRangeSelection = (dates) => {
            $scope.filterDateFrom = moment(dates[0]);
            $scope.filterDateTo = moment(dates[dates.length - 1]);
            $scope.eventMarkers = [];
            $scope.loadEventsOnMap(false, true);
        };

        $scope.openDateRange = () => {
            $scope.dateRangePicker.model.dateStart = $scope.dateRangePicker.selectedDate.dateStart;
            $scope.dateRangePicker.model.dateEnd = $scope.dateRangePicker.selectedDate.dateEnd;
            $mdDateRangePicker.show($scope.dateRangePicker)
                .then(function(result) {
                    $scope.filterDateFrom = moment(result.dateStart);
                    $scope.dateRangePicker.selectedDate.dateStart = result.dateStart;
                    $scope.dateRangePicker.selectedDate.dateEnd = result.dateEnd;
                    $scope.webDateRangePicker.selectedDate.startDate = $scope.filterDateFrom;
                    $scope.filterDateTo = moment(result.dateEnd);
                    $scope.webDateRangePicker.selectedDate.endDate = $scope.filterDateTo;
                    $scope.eventMarkers = [];
                    $scope.loadEventsOnMap(false, true);
                }).catch(function() {

                });
        };

        $scope.initOnPageLoad();

        $("#search-event-filter-res-id").keypress(function(e) {
            if (e.keyCode === 13) {
                $scope.toggleFilters = false;
                $scope.toggleDateFiltersState = false;
                $scope.toggleFiltersState = false;
            }
        });
        $("#pa-search-event-filter-res-id").keypress(function(e) {
            if (e.keyCode === 13) {
                $scope.toggleFilters = false;
                $scope.toggleFiltersState = false;
            }
        });

        let postCitiesData = function(data) {
            awsService.saveCitiesOnLocationChange(data).then(res => {

            }).catch(err => {

            });
        };

        $scope.icontoggleMethod = () => {
            $scope.isToggleIcon = !$scope.isToggleIcon;
        };

        angular.element(function() {
            let body = angular.element('body');
            let webBanner = angular.element('.js-web-banner');
            if ($scope.isMaps) {
                body.addClass('noSrcollBody');
            }
            if (webBanner) {
                $scope.isWebBanner = true;

            }
        });
        $scope.$on('setBottomWhenCustomMarker', function(events, data) {
            if (data != null) {
                if ($scope.isMaps) {
                    if (data) {
                        $scope.mobileInfoWindow = true;
                        angular.element('.list-dark-map-span').css('bottom', '33%');
                    } else {
                        $scope.mobileInfoWindow = false;
                        angular.element('.list-dark-map-span').css('bottom', '11%');
                    }
                }

            }
        });

        angular.element('.js-md-date-range > .md-menu > span')
            .click(() => {
                setTimeout(function() {
                    let cityBanner = angular.element('.js-web-banner');
                    let top = '129px';
                    if (cityBanner && cityBanner.is(':visible')) {
                        top = '169px';
                    }
                    angular.element('.md-menu-backdrop').css('top', top);
                    angular.element('.md-scroll-mask').css('top', top);
                }, 320);
            });
        $scope.$on('rePosMapSec', function(events, data) {
            if (!data) {
                angular.element('.md-custom-menu-content').css('position', 'fixed');
                angular.element('.md-menu-backdrop').css('position', 'fixed');
                angular.element('.md-custom-menu-content').css('top', '127px');
                let top = '129px';
                angular.element('.md-menu-backdrop').css('top', top);
                angular.element('.md-scroll-mask').css('top', top);
            }
        });
        $scope.$on('isWebCityBanner', function(events, data) {
            if (data && !$scope.user) {
                $scope.setCalendarPos = true;
                angular.element('.md-custom-menu-content').css('position', 'fixed');
                angular.element('.md-custom-menu-content').css('top', '127px');
                angular.element('.md-menu-backdrop').css('position', 'fixed');
                let top = '195px';
                angular.element('.md-menu-backdrop').css('top', top);
                angular.element('.md-scroll-mask').css('top', top);
            } else {
                angular.element('.md-custom-menu-content').css('position', 'fixed');
                angular.element('.md-custom-menu-content').css('top', '167px');
                angular.element('.md-menu-backdrop').css('position', 'fixed');
                let top = '169px';
                angular.element('.md-menu-backdrop').css('top', top);
                angular.element('.md-scroll-mask').css('top', top);
            }
        });
        $scope.$on('rePosMap', function(events, data) {
            let bannerAppSec = angular.element('.js-no-top-banner');
            if (!data) {
                bannerAppSec.removeClass('no-top-banner');
            }
        });
        $scope.$on('storeAppLinkSec', function(events, data) {
            let bannerSec = angular.element('.js-no-top-banner');
            if (!data) {
                bannerSec.removeClass('no-top-banner');
                $("body").removeClass("showFreeBanner");

            } else {
                bannerSec.removeClass('top-31');
                bannerSec.addClass('no-top-banner');
                $("body").addClass("showFreeBanner");
            }
        });
        $scope.$on('$routeChangeStart', function($event, next, current) {
            let body = angular.element('body');
            $http.pendingRequests.forEach(function(request) {
                if (request.cancel) {
                    request.cancel.resolve();
                }
            });
        });
        $scope.$on("reloadEvents", function(events, data) {
            if (data) {
                $route.reload();
                $scope.setEvent = true;
            }
        });
        $scope.goToAppStore = function() {
            if (navigator.userAgent.indexOf('Mac OS X') != -1) {
                window.open(config.IOS_APP_URL, '_blank');
            } else {
                window.open(config.ANDROID_APP_URL, '_blank');
            }
        };

        $scope.makeDisable = function() {
            $scope.IsValid = false;
            for (var i = 0; i < $scope.categoriesMap.length; i++) {
                if ($scope.categoriesMap[i].selected) {
                    $scope.IsValid = true;
                    break;
                }
            }
        };

        $scope.$on('getcloseFn', function(events, data) {
            $scope.getclose = true;
        });

        $scope.$on('notificationscloseFn', function(events, data) {
            $scope.notificationsclose = true;
        });
    }]);