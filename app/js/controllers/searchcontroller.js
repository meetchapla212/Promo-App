var app = angular.module('PromoApp');
app.controller('SearchController', ['$scope', 'qbService', 'apiService', 'eventsService', 'locationService', 'config', 'Utils', 'persistObject', '$location', '$anchorScroll', '$timeout', 'authService', '$uibModal', 'metaTagsService', 'deviceDetector', '$document', '$rootScope', function($scope, qbService, apiService, eventsService, locationService, config, Utils, persistObject, $location, $anchorScroll, $timeout, authService, $uibModal, metaTagsService, deviceDetector, $document, $rootScope) {
    $scope.session = authService.getSession();
    $scope.loading = false;
    $scope.loaderMessage = 'Loading...';
    $scope.categorySelectionButton = 'Unselect All';

    //new added param
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
    let now = moment.utc();
    let now_in_msec = (now).format("YYYY-MM-DD"); // (now).valueOf();
    $scope.loadMorePHQEvents = true;
    $scope.loadMorePromoEvents = true;
    $scope.skip = 0;
    let noOfEventsToLoad = $scope.eventPerPage;

    $scope.categoriesMap = [];
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

                    $scope.categoriesMap.push(category);
                });
            }
        }
    });
    $scope.searchField = true;
    $scope.forMacOnly = false;
    $scope.locationPlaceholder = 'Locations, historic places and more';
    $scope.search = {
        searchEvents: ''
    };
    $scope.showTotalResult = true;
    $scope.searchDiv = true;
    $scope.location = null;
    $scope.preventUnselect = false;
    $scope.endDate = moment.utc().add(7, 'days').format("ddd, DD MMM");
    $scope.startDate = moment.utc().format("ddd, DD MMM");
    $scope.searchCities = config.SEARCH_CITIES;
    $scope.headerTemplate = 'partials/phase2/pre-login-header.html';
    $scope.isMobile = window.matchMedia("only screen and (max-width: 1024px)");
    $scope.webDateRangePicker = {
        minDate: moment().add(0, 'day'),
        selectedDate: {
            startDate: moment.utc(),
            endDate: moment.utc().add(7, 'days')
        },
        picker: null, // daterangepicker initialized on this prop
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
        hide() {
            // need to use $timeout here to avoid $apply errors for digest cycle
            $timeout(() => {
                var elem = document.getElementsByClassName("daterangepicker");
                angular.element(elem).css('display', 'none');
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
            locale: {
                applyLabel: "Done",
                clearLabel: 'Reset',
                cancelLabel: 'Reset',
                separator: ' - ',
                format: "ddd, DD MMM"
            },
            eventHandlers: {
                'show.daterangepicker': function(event, picker) {
                    $scope.showhide.selectdates = true;
                    if (event && event.picker) {
                        event.picker.element.val($scope.startDate);
                    }
                },
                'hide.daterangepicker': function(event, picker) {
                    $scope.showhide.selectdates = false;
                },
                'apply.daterangepicker': function(event, picker) {
                    $scope.endDate = $scope.webDateRangePicker.selectedDate.endDate.format("ddd, DD MMM");
                    $scope.startDate = $scope.webDateRangePicker.selectedDate.startDate.format("ddd, DD MMM");
                    if (event && event.picker) {
                        event.picker.element.val($scope.startDate);
                    }
                    if (event && event.mobilePicker) {
                        event.mobilePicker.element.val($scope.startDate);
                    }
                    if (!$scope.showhide.filters) {
                        $scope.ev = [];
                        $scope.skip = 0;
                        $scope.page = 1;
                        getAllEvents();
                    }
                }
            }
        }
    };

    $scope.checkIfUserLoggedIn = () => {
        // alert(username);
        $scope.user = authService.getObject('user');
        //alert("fv"+$scope.user);
        $scope.session = authService.getObject('session');
        if ($scope.user && $scope.session) {
            $scope.headerTemplate = 'partials/header.html';
        }
        setTimeout(() => {
            $scope.webDateRangePicker.selectedDate = {
                startDate: moment.utc(),
                endDate: moment.utc().add(7, 'days')
            };
            $scope.endDate = $scope.webDateRangePicker.selectedDate.endDate.format("ddd, DD MMM");
            $scope.startDate = $scope.webDateRangePicker.selectedDate.startDate.format("ddd, DD MMM");
            $scope.webDateRangePicker.hide();
        }, 500);
        setTimeout(function() {
            if (typeof $scope.dateStartFrom === 'string') {
                angular.element("#startWebDateRangePicker").val($scope.dateStartFrom);
            } else {
                angular.element("#startWebDateRangePicker").val(moment($scope.dateStartFrom).format("ddd, DD MMM"));
            }

            angular.element('#startWebDateRangePicker').triggerHandler('focus');
            angular.element('#startWebDateRangePicker').triggerHandler('blur');
            angular.element('.daterangepicker').attr("style", "display:none");
            $scope.showhide.selectdates = false;
        }, 100);
        $scope.loadDefaultSearchEvents();
        angular.forEach($scope.categoriesMap, function(value, key) {
            value.selected = true;
        });
    };

    $scope.openNav = function(event) {
        event.preventDefault();
        event.stopPropagation();
        $scope.toggleFilters = !$scope.toggleFilters;
    };

    $scope.loadEvents = function(firstLoad) {
        // Check if cookie present
        if ($scope.loadMoreEvents && !$scope.loading) {
            // $scope.loading = true;
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
        $scope.showhide.selectdates = false;
        $scope.chosenPlace = '';
        // setTimeout(() => {
        $scope.webDateRangePicker.selectedDate = {
            startDate: moment.utc(),
            endDate: moment.utc().add(7, 'days')
        };
        $scope.startDate = $scope.webDateRangePicker.selectedDate.startDate.format("ddd, DD MMM");
        $scope.endDate = $scope.webDateRangePicker.selectedDate.endDate.format("ddd, DD MMM");
        // }, 100);
        setTimeout(function() {
            if (typeof $scope.dateStartFrom === 'string') {
                angular.element("#startDateRangePicker").val($scope.dateStartFrom);
            } else {
                angular.element("#startDateRangePicker").val(moment($scope.dateStartFrom).format("ddd, DD MMM"));
            }
        }, 100);
    };

    $scope.goToPage = function(page) {
        location.href = page;
    };

    $scope.showResults = () => {
        $scope.showhide.results = true;
        $scope.showhide.filters = false;
        $rootScope.footerHide = false;
    };
    $scope.openDatePicker = () => {
        angular.element('#startDateRangePicker').trigger("click");
    };

    $scope.toggleCategorySelection = function() {
        $scope.categorySelectionButton = ($scope.categorySelectionButton == 'Unselect All' ? 'Select All' : 'Unselect All');
        for (let k in $scope.categoriesMap) {
            $scope.categoriesMap[k].selected = ($scope.categorySelectionButton != 'Select All');
        }
        $scope.changeCategorySelection();
        $scope.makeDisable();
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

    $scope.changeCategorySelection = function() {
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
        if ($scope.categoryFilterArray.length === Object.keys($scope.categoriesMap).length) {
            $scope.preventUnselect = true;
        } else {
            $scope.preventUnselect = false;
        }
        if (!$scope.showhide.filters) {
            $scope.ev = [];
            $scope.skip = 0;
            $scope.page = 1;
            // Check if atleast one category is selected
            if ($scope.categoryFilterArray.length !== Object.keys($scope.categoriesMap).length) {
                getAllEvents();
            }
        }
        $scope.IsValid = false;
    };

    $scope.selectCategory = function() {
        if ($scope.selectedCategory) {
            for (let k in $scope.categoriesMap) {
                $scope.categoriesMap[k].selected = false;
                if (k === $scope.selectedCategory) {
                    $scope.categoriesMap[k].selected = true;
                }
            }
        }
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

    // Watch on loct
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

    $scope.initSearchPage = function() {


    };

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

    $scope.loadDefaultSearchEvents = function() {

        let filter = {
            page: $scope.page,
            search_params: {},
        };


        $scope.location = { "lat": $scope.user.city_lat, "lng": $scope.user.city_long };
        $scope.chosenPlace = $scope.user.city;
        filter.search_params.event_name = "";
        filter.search_params.startDate = now_in_msec;
        filter.search_params.endDate = (now.add(7, 'days')).format("YYYY-MM-DD");
        filter.search_params.location = [$scope.location.lat, $scope.location.lng];
        filter.search_params.categories = ["concerts", "festivals", "performing-arts", "community", "sports", "politics", "university-college", "eats-drinks"];

        $scope.ev = [];
        $scope.page = 1;
        getAllEvents(filter);
    };

    $scope.applyFilters = function() {
        $scope.showResults();
        $scope.ev = [];
        $scope.skip = 0;
        $scope.page = 1;
        getAllEvents();
    };

    $scope.clearFilters = function() {
        $scope.startDate = moment.utc().format("ddd, DD MMM");
        $scope.endDate = moment.utc().add(7, 'days').format("ddd, DD MMM");
        $scope.location = { "lat": $scope.user.city_lat, "lng": $scope.user.city_long };
        $scope.selectedCategory = '';
        for (let category of Object.keys($scope.categoriesMap)) {
            $scope.categoriesMap[category].selected = true;
        }
        $scope.chosenPlace = '';
        $scope.ev = [];
        $scope.skip = 0;
        $scope.page = 1;
        getAllEvents();
    };

    // This function is used to create filter
    const createFilter = function() {
        let filter = {
            page: $scope.page,
            search_params: {},
        };
        filter.search_params.event_name = "";

        if ($scope.startDate) {
            filter.search_params.startDate = $scope.webDateRangePicker.selectedDate.startDate.format("YYYY-MM-DD");
        }

        if ($scope.endDate) {
            filter.search_params.endDate = $scope.webDateRangePicker.selectedDate.endDate.format("YYYY-MM-DD");
        }

        if ($scope.location) {
            filter.search_params.location = [$scope.location.lat, $scope.location.lng];
        }

        let categorySelected = [];

        for (let k in $scope.categoriesMap) {
            if ($scope.categoriesMap[k].selected) {
                categorySelected.push($scope.categoriesMap[k].id);
            }
        }

        if (categorySelected.length != Object.keys($scope.categoriesMap).length) {
            filter.search_params.categories = categorySelected;
        }


        return filter;
    };
    const getAllEvents = function(filter) {
        $scope.loading = true;
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
                                    event.imageUrl = '../img/unnamed.png'; // set default image
                                }
                                $scope.ev.push(event);
                            });
                        }
                    } else {
                        $scope.searchingText = data.message;
                    }
                } else {
                    $scope.searchingText = "Sorry something went wrong. Please try later.";
                }
                Utils.applyChanges($scope);
            }).catch(err => {
                $scope.loading = false;
                $scope.searchingText = 'No Results Found.';
            });
    };

    $scope.overlay = function() {
        $scope.showHr = false;
        $scope.showOverlay = true;
        $scope.searchField = false;
        $scope.showTotalResult = false;
        $scope.hideBackForMob = true;
    };
    $scope.styleForMacOnly = () => {
        $scope.checkIfUserLoggedIn();
        if (navigator.userAgent.indexOf('Mac OS X') != -1) {
            $("body").addClass("mac");
            $scope.forMacOnly = true;
        }
        $document.on('click', function(event) {
            var $target = $(event.target);
            if (!$scope.preventUnselect) {
                if (!$target.closest('#categoriesList').length && $document.find('#categoriesList').length && !angular.element('#categoriesList').hasClass("ng-hide") && $scope.toggleFilters) {
                    $scope.toggleFilters = false;
                    Utils.applyChanges($scope);
                }
            }
        });
        $("body").removeClass("modal-open");
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
    $scope.styleForMacOnly();

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