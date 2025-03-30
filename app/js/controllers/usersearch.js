angular.module('PromoApp')
    .controller('UserSearchController', ['$scope', '$location', 'userService', 'Utils', '$cookies', 'locationService', 'authService', 'config', 'eventsService', '$timeout', 'apiService', 'metaTagsService', '$uibModal', 'deviceDetector', '$rootScope', function($scope, $location, userService, Utils, $cookies, locationService, authService, config, eventsService, $timeout, apiService, metaTagsService, $uibModal, deviceDetector, $rootScope) {
        $scope.defaultSelectedTab = 0;
        $scope.searchText = '';
        $scope.searchUsersResult = null;
        $scope.loading = false;
        $scope.loadingMessage = 'Searching..';
        $scope.suggestedUsers = [];
        $scope.checkFollow = false;
        $scope.user = null;
        $scope.skip = 0;
        $scope.page = 1;
        $scope.eventPerPage = config.NO_OF_EVENTS_PER_PAGE;
        $scope.sort = "ASC";
        $scope.sortby = "start_date_time_ms";
        $scope.loadMoreEvents = true;
        let noOfEventsToLoad = $scope.eventPerPage;
        $scope.categoriesMap = [];
        $scope.localFilterSearch = '';
        $scope.categories = {};
        $scope.selectedCategory = "";
        $scope.categoriesMapNew = [];
        $scope.userInfo = "";
        $scope.searchURL = '';
        $scope.memberZoneList = '';
        $scope.searchCategoryList = false;
        let token = authService.get('token');
        $scope.dateEndTo = moment.utc().add(7, 'days').format("ddd, DD MMM");
        $scope.dateStartFrom = moment.utc().format("ddd, DD MMM");
        $scope.selectedItem = '';
        $scope.zoneDataInfo = null;
        $scope.userLoginMessage = false;
        $scope.cityZone = '';
        $scope.detect = false;
        apiService.getEventCategories(token).then((response) => {
            if (response.status == 200) {
                let data = response.data;
                if (data.success) {
                    let user1 = data.data;
                    $scope.categoriesMap = user1;
                    user1.forEach(function(cat) {
                        let category = {};

                        category.id = cat.slug;
                        category.name = cat.category_name;
                        category.icon = cat.category_image;
                        category.iconImg = "<img src=" + cat.category_image + " alt='image' />";
                        category.marker = cat.category_image;
                        category.unselectedIcon = cat.category_image;
                        category.selected = true;

                        $scope.categoriesMapNew.push(category);
                    });
                    $scope.categories = Object.values($scope.categoriesMapNew);
                }
            }
        });

        $scope.locationPlaceholder = 'Detect or Type City Name';
        $scope.isMobile = window.matchMedia("only screen and (max-width: 1024px)");
        $scope.webDateRangePicker = {
            minDate: moment().add(0, 'day'),
            selectedDate: {
                startDate: moment.utc(),
                endDate: moment.utc().add(7, 'days')
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
            hide() {
                // need to use $timeout here to avoid $apply errors for digest cycle
                $timeout(() => {
                    var elem = document.getElementsByClassName("daterangepicker");
                    angular.element(elem).css('display', 'none');
                });
            },
            options: {
                pickerClasses: 'pa-datepicker drop_search_pic',
                drops: "up",
                applyButtonClasses: 'md-button pa-pink-button pa-font-bold pa-modal-font pa-height-34',
                cancelButtonClasses: 'pa-color-pink pa-modal-font',
                showCustomRangeLabel: false,
                timePicker: false,
                clearable: true,
                autoUpdateInput: true,
                locale: {
                    applyLabel: "Done",
                    clearLabel: 'Reset',
                    //cancelLabel: 'Reset',
                    separator: ' - ',
                    format: "ddd, DD MMM"
                },
                eventHandlers: {
                    'show.daterangepicker': function(event, picker) {
                        $scope.showhide.selectdates = true;
                        if (event && event.picker) {
                            if (typeof $scope.dateStartFrom === 'string') {
                                event.picker.element.val($scope.dateStartFrom);
                            } else {
                                event.picker.element.val($scope.dateStartFrom.format("ddd, DD MMM"));
                            }
                        }
                    },
                    'hide.daterangepicker': function(event, picker) {
                        $scope.showhide.selectdates = false;
                    },
                    'apply.daterangepicker': function(event, picker) {
                        $scope.dateEndTo = $scope.webDateRangePicker.selectedDate.endDate.format("ddd, DD MMM");
                        $scope.endDate = $scope.webDateRangePicker.selectedDate.endDate.format("ddd, DD MMM");
                        $scope.startDate = $scope.webDateRangePicker.selectedDate.startDate.format("ddd, DD MMM");
                        $scope.dateStartFrom = $scope.webDateRangePicker.selectedDate.startDate;
                        if (event && event.picker) {
                            event.picker.element.val($scope.startDate);
                            angular.element("#startDateRangePicker").val($scope.dateStartFrom.format("ddd, DD MMM"));
                        }
                        if (event && event.mobilePicker) {
                            event.mobilePicker.element.val($scope.startDate);
                        }
                        if (!$scope.showhide.filters) {
                            $scope.ev = [];
                            $scope.skip = 0;
                            getAllEvents();
                        }
                    }
                }
            }
        };

        $scope.showhide = {
            search: true,
            filters: true,
            results: false,
            selectdates: false
        };

        $scope.clearSearch = function() {
            $scope.searchText = '';
            Utils.applyChanges($scope);
        };

        $scope.checkIfUserLoggedIn = () => {
            $scope.user = authService.getObject('user');
            setTimeout(() => {
                $scope.webDateRangePicker.selectedDate = {
                    startDate: moment.utc(),
                    endDate: moment.utc().add(7, 'days')
                };
                $scope.endDate = $scope.webDateRangePicker.selectedDate.endDate.format("ddd, DD MMM");
                $scope.startDate = $scope.webDateRangePicker.selectedDate.startDate.format("ddd, DD MMM");
                $scope.webDateRangePicker.hide();
            }, 500);
        };
        $scope.removePlace = function() {
            if (!$scope.detect) {
                angular.element('#chosenPlace').val('');
                $scope.chosenPlace = '';
                Utils.applyChanges($scope);
            }
        };
        $scope.onSearchChange = function() {
            $scope.detect = false;
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

        $scope.getCurrentPos = function() {
            if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1) {
                try {
                    navigator.permissions.query({
                        name: 'geolocation'
                    }).then(function(result) {
                        if (result.state == 'granted') {
                            $scope.detect = false;
                            angular.element('#chosenPlace').val('');
                            $scope.locationPlaceholder = 'Getting Location..';
                            $scope.disableLocation = true;
                            locationService.getUserLocation(true)
                                .then((locationResponse) => {
                                    if (locationResponse) {
                                        $scope.locationPlaceholder = 'Detect or Type City Name';
                                        $scope.disableLocation = false;

                                        if ('address' in locationResponse) {
                                            $scope.chosenPlace = locationResponse.address;
                                        } else if ('city' in locationResponse) {
                                            $scope.chosenPlace = locationResponse.city;
                                        } else if ('state' in locationResponse && locationResponse.state != '') {
                                            $scope.chosenPlace = locationResponse.state;
                                        } else if ('country' in locationResponse && locationResponse.country != '') {
                                            $scope.chosenPlace = locationResponse.country;
                                        }

                                        let pos = {
                                            address: locationResponse.address,
                                            lat: locationResponse.lat,
                                            lng: locationResponse.lng
                                        };
                                        $scope.location = pos;
                                        $scope.locationAutoSelect = false;
                                        if (!$scope.showhide.filters) {
                                            $scope.ev = [];
                                            $scope.skip = 0;
                                        }
                                        $scope.detect = true;
                                        angular.element('#chosenPlace').val($scope.chosenPlace);
                                        Utils.applyChanges($scope);
                                    } else {
                                        $scope.locationPlaceholder = 'Search Location';
                                        $scope.locationAccessedModal();
                                    }
                                })
                                .catch((err) => {
                                    $scope.locationPlaceholder = 'Detect or Type City Name';
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
                                title: 'OOPS!!',
                                content: "Please allow location access.",
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            return false;
                        }
                    });
                } catch (err) {
                    $scope.detect = false;
                    angular.element('#chosenPlace').val('');
                    $scope.locationPlaceholder = 'Getting Location..';
                    $scope.disableLocation = true;
                    locationService.getUserLocation(true)
                        .then((locationResponse) => {
                            if (locationResponse) {
                                $scope.locationPlaceholder = 'Detect or Type City Name';
                                $scope.disableLocation = false;

                                if ('city' in locationResponse && locationResponse.city != '') {
                                    $scope.chosenPlace = locationResponse.city;
                                } else if ('address' in locationResponse && locationResponse.address != '') {
                                    $scope.chosenPlace = locationResponse.address;
                                } else if ('state' in locationResponse && locationResponse.state != '') {
                                    $scope.chosenPlace = locationResponse.state;
                                } else if ('country' in locationResponse && locationResponse.country != '') {
                                    $scope.chosenPlace = locationResponse.country;
                                }

                                let pos = {
                                    address: locationResponse.address,
                                    lat: locationResponse.lat,
                                    lng: locationResponse.lng
                                };
                                $scope.location = pos;
                                $scope.locationAutoSelect = false;
                                if (!$scope.showhide.filters) {
                                    $scope.ev = [];
                                    $scope.skip = 0;
                                }
                                $scope.detect = true;
                                angular.element('#chosenPlace').val($scope.chosenPlace);
                                Utils.applyChanges($scope);
                            } else {
                                $scope.locationPlaceholder = 'Search Location';
                                $scope.locationAccessedModal();
                            }
                        })
                        .catch((err) => {
                            $scope.locationPlaceholder = 'Detect or Type City Name';
                            $scope.disableLocation = false;
                            Utils.applyChanges($scope);
                        });
                }
            } else if (deviceDetector.device == 'iphone' || deviceDetector.device == 'ipad') {
                $scope.detect = false;
                angular.element('#chosenPlace').val('');
                $scope.locationPlaceholder = 'Getting Location..';
                $scope.disableLocation = true;
                locationService.getUserLocation(true)
                    .then((locationResponse) => {
                        if (locationResponse) {
                            $scope.locationPlaceholder = 'Detect or Type City Name';
                            $scope.disableLocation = false;

                            if ('city' in locationResponse && locationResponse.city != '') {
                                $scope.chosenPlace = locationResponse.city;
                            } else if ('address' in locationResponse && locationResponse.address != '') {
                                $scope.chosenPlace = locationResponse.address;
                            } else if ('state' in locationResponse && locationResponse.state != '') {
                                $scope.chosenPlace = locationResponse.state;
                            } else if ('country' in locationResponse && locationResponse.country != '') {
                                $scope.chosenPlace = locationResponse.country;
                            }

                            let pos = {
                                address: locationResponse.address,
                                lat: locationResponse.lat,
                                lng: locationResponse.lng
                            };
                            $scope.location = pos;
                            $scope.locationAutoSelect = false;
                            if (!$scope.showhide.filters) {
                                $scope.ev = [];
                                $scope.skip = 0;
                            }
                            $scope.detect = true;
                            angular.element('#chosenPlace').val($scope.chosenPlace);
                            Utils.applyChanges($scope);
                        } else {
                            $scope.locationPlaceholder = 'Search Location';
                            $scope.locationAccessedModal();
                        }
                    })
                    .catch((err) => {
                        $scope.locationPlaceholder = 'Detect or Type City Name';
                        $scope.disableLocation = false;
                        Utils.applyChanges($scope);
                    });
            } else if (navigator.userAgent.toLowerCase().indexOf('safari') > -1) {
                Notification.requestPermission(function(result) {
                    if (result == 'granted') {
                        $scope.detect = false;
                        angular.element('#chosenPlace').val('');
                        $scope.locationPlaceholder = 'Getting Location..';
                        $scope.disableLocation = true;
                        locationService.getUserLocation(true)
                            .then((locationResponse) => {
                                if (locationResponse) {
                                    $scope.locationPlaceholder = 'Detect or Type City Name';
                                    $scope.disableLocation = false;

                                    if ('city' in locationResponse && locationResponse.city != '') {
                                        $scope.chosenPlace = locationResponse.city;
                                    } else if ('address' in locationResponse && locationResponse.address != '') {
                                        $scope.chosenPlace = locationResponse.address;
                                    } else if ('state' in locationResponse && locationResponse.state != '') {
                                        $scope.chosenPlace = locationResponse.state;
                                    } else if ('country' in locationResponse && locationResponse.country != '') {
                                        $scope.chosenPlace = locationResponse.country;
                                    }

                                    let pos = {
                                        address: locationResponse.address,
                                        lat: locationResponse.lat,
                                        lng: locationResponse.lng
                                    };
                                    $scope.location = pos;
                                    $scope.locationAutoSelect = false;
                                    if (!$scope.showhide.filters) {
                                        $scope.ev = [];
                                        $scope.skip = 0;
                                    }
                                    $scope.detect = true;
                                    angular.element('#chosenPlace').val($scope.chosenPlace);
                                    Utils.applyChanges($scope);
                                } else {
                                    $scope.locationPlaceholder = 'Search Location';
                                    $scope.locationAccessedModal();
                                }
                            })
                            .catch((err) => {
                                $scope.locationPlaceholder = 'Detect or Type City Name';
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
                            title: 'OOPS!!',
                            content: "Please allow location access.",
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        return false;
                    }
                });
            } else {
                $scope.detect = false;
                angular.element('#chosenPlace').val('');
                $scope.locationPlaceholder = 'Getting Location..';
                $scope.disableLocation = true;
                locationService.getUserLocation(true)
                    .then((locationResponse) => {
                        if (locationResponse) {
                            $scope.locationPlaceholder = 'Detect or Type City Name';
                            $scope.disableLocation = false;

                            if ('city' in locationResponse && locationResponse.city != '') {
                                $scope.chosenPlace = locationResponse.city;
                            } else if ('address' in locationResponse && locationResponse.address != '') {
                                $scope.chosenPlace = locationResponse.address;
                            } else if ('state' in locationResponse && locationResponse.state != '') {
                                $scope.chosenPlace = locationResponse.state;
                            } else if ('country' in locationResponse && locationResponse.country != '') {
                                $scope.chosenPlace = locationResponse.country;
                            }

                            let pos = {
                                address: locationResponse.address,
                                lat: locationResponse.lat,
                                lng: locationResponse.lng
                            };
                            $scope.location = pos;
                            $scope.locationAutoSelect = false;
                            if (!$scope.showhide.filters) {
                                $scope.ev = [];
                                $scope.skip = 0;
                            }
                            $scope.detect = true;
                            angular.element('#chosenPlace').val($scope.chosenPlace);
                            Utils.applyChanges($scope);
                        } else {
                            $scope.locationPlaceholder = 'Search Location';
                            $scope.locationAccessedModal();
                        }
                    })
                    .catch((err) => {
                        $scope.locationPlaceholder = 'Detect or Type City Name';
                        $scope.disableLocation = false;
                        Utils.applyChanges($scope);
                    });
            }
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

        $scope.loadEvents = function(firstLoad) {
            // Check if cookie present
            if ($scope.loadMoreEvents && !$scope.loading) {
                $scope.loading = true;
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

        $scope.locationAutoSelectFn = function(locationAutoSelect) {
            $scope.locationAutoSelect = locationAutoSelect;
            $scope.detect = true;
        };

        $scope.getSelectedZone = function(selectedItems) {
            $scope.selectedItem = selectedItems;
        };

        // This function is used to create filter
        const createFilter = function() {
            let filter = {
                page: $scope.page,
                search_params: {},
            };
            filter.search_params.event_name = "";
            if ($scope.localFilterSearch) {
                filter.search_params.event_name = $scope.localFilterSearch;
            }

            if ($scope.startDate) {
                filter.search_params.startDate = $scope.webDateRangePicker.selectedDate.startDate.format("YYYY-MM-DD");
            }

            if ($scope.endDate) {
                filter.search_params.endDate = $scope.webDateRangePicker.selectedDate.endDate.format("YYYY-MM-DD");
            }

            if ($scope.location) {
                filter.search_params.location = [$scope.location.lat, $scope.location.lng];
            }

            if ($scope.locationAutoSelect) {
                filter.search_params.location = $scope.locationAutoSelect;
            }

            if ($scope.selectedItem != '') {
                filter.search_params.zone_id = $scope.selectedItem;
            }

            let categorySelected = [];
            filter.search_params.categories = ["concerts", "festivals", "performing-arts", "community", "sports", "politics", "university-college", "eats-drinks"];
            if ($scope.selectedCategory && $scope.selectedCategory.length > 0) {
                filter.search_params.categories = [];
                angular.forEach($scope.selectedCategory, function(value, key) {
                    filter.search_params.categories.push(value.id);
                });
            }
            let cat = filter.search_params.categories.toString();

            if (typeof $scope.chosenPlace == 'undefined' || $scope.chosenPlace == '') {
                let cityname = angular.element('#chosenPlace').val();
                $scope.chosenPlace = cityname;
            }

            if (typeof filter.search_params.event_name === 'undefined') {
                filter.search_params.event_name = '';
            }

            if ($scope.selectedItem == '') {
                $scope.searchURL = 'event_name=' + filter.search_params.event_name + '&startDate=' + filter.search_params.startDate + '&endDate=' + filter.search_params.endDate + '&city=' + $scope.chosenPlace + '&cat=' + cat;
            } else {
                $scope.searchURL = 'event_name=' + filter.search_params.event_name + '&startDate=' + filter.search_params.startDate + '&endDate=' + filter.search_params.endDate + '&city=' + $scope.chosenPlace + '&cat=' + cat + '&zone_id=' + $scope.selectedItem;
            }
            $scope.searchURL = $scope.searchURL.split(" ").join("");
            $scope.searchURL = decodeURIComponent($scope.searchURL);
            return filter;
        };

        const constructSearchResultHeading = function(filter) {
            var words = [];
            if (filter) {
                if (filter.category) {
                    words.push(filter.category.in);
                } else {
                    words.push('All Events');
                }
                if (filter.eventLocation) {
                    words.push('in');
                    words.push($scope.location.address);
                }
                if ($scope.startDate) {
                    words.push('from');
                    words.push($scope.startDate);
                    if ($scope.endDate) {
                        words.push('-');
                        words.push($scope.endDate);
                    }
                }
            }
            return words.join(' ');
        };

        const getAllEvents = function(filter) {
            $scope.loading = true;
            $scope.searchingText = 'Getting events ...';
            if (!filter) {
                filter = createFilter();
            }
            return eventsService.getEvents(filter)
                .then((response) => {
                    $scope.searchingText = 'No Results Found.';
                    if (response.status == 200) {
                        let data = response.data;
                        if (data.success) {
                            let res = data.data;
                            // Map to common JSON
                            if (res && res.length == noOfEventsToLoad) {
                                $scope.loadMorePromoEvents = true;
                                $scope.page = $scope.page + 1;
                            } else {
                                $scope.loadMorePromoEvents = false;
                                $scope.eventPerPagePHQEvents = $scope.eventPerPage;
                            }
                            if (res && res.length > 0) {
                                $scope.searchingText = constructSearchResultHeading(filter);
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
                        setTimeout(() => {
                            $scope.loading = false;
                        }, 1500);
                    } else {
                        $scope.searchingText = "Sorry something went wrong. Please try later.";
                    }

                    Utils.applyChanges($scope);
                }).catch(err => {
                    $scope.loading = false;
                    $scope.searchingText = 'No Results Found.';
                }).finally(() => {
                    $scope.loading = false;
                });
        };

        $scope.showFilters = function() {
            $scope.showhide.results = false;
            $scope.showhide.filters = true;
            $rootScope.footerHide = true;
            $scope.showhide.selectdates = false;
            $scope.loading = false;
            $scope.detect = false;
            $scope.chosenPlace = '';
            $scope.selectedItem = '';
            setTimeout(() => {
                $scope.webDateRangePicker.selectedDate = {
                    startDate: moment.utc(),
                    endDate: moment.utc().add(7, 'days')
                };
            }, 100);
            setTimeout(function() {
                if (typeof $scope.dateStartFrom === 'string') {
                    angular.element("#startDateRangePicker").val($scope.dateStartFrom);
                } else {
                    angular.element("#startDateRangePicker").val($scope.dateStartFrom.format("ddd, DD MMM"));
                }

                angular.element('#startDateRangePicker').triggerHandler('focus');
                angular.element('#startDateRangePicker').triggerHandler('blur');
                angular.element('.daterangepicker').attr("style", "display:none");
                $scope.showhide.selectdates = false;
            }, 100);
            Utils.applyChanges($scope);
        };

        $scope.showResults = function() {
            $scope.showhide.results = true;
            $scope.showhide.filters = false;
            $rootScope.footerHide = false;
        };

        $scope.applyFilters = function(localFilterSearch, selectedCategory, chosenPlace, form) {
            $scope.selectedCategory = selectedCategory;
            $scope.chosenPlace = chosenPlace;
            if (!$scope.chosenPlace) {
                form.chosenPlace.$invalid = true;
                return false;
            } else if ($scope.selectedCategory.length == 0) {
                $scope.searchCategoryList = true;
                return false;
            }
            $scope.localFilterSearch = localFilterSearch;
            $scope.showResults();
            $scope.ev = [];
            $scope.skip = 0;
            $scope.page = 1;
            getAllEvents();
            $location.search($scope.searchURL);
        };

        $scope.goToPage = function(page, userid) {
            if (userid) {
                page += userid;
            }
            location.href = page;
        };

        $scope.searchOnEnter = function($event, searchText) {
            let zoneId = '';
            if ($event.keyCode == 13) {
                $scope.searchUsersByTerm(searchText, zoneId);
            }
            if (!searchText) {
                $scope.searchUsersResult = null;
            }
        };

        $scope.loadSuggestedUsers = function() {
            if ($scope.user != null) {
                if (!$scope.suggestedUsers || $scope.suggestedUsers.length == 0) {
                    let promise = null;
                    if ($scope.user.city && 'city' in $scope.user) {
                        promise = Promise.resolve({
                            'city': $scope.user.city
                        });
                    } else {
                        promise = locationService.getUserLocation();
                    }

                    promise.then(cityResponse => {
                        let city = 'miami';
                        if ('city' in cityResponse && cityResponse.city) {
                            city = cityResponse.city;
                            $scope.cityZone = cityResponse.city;
                        }
                        let promises = [];
                        promises.push(userService.searchUserByFilter(city, '', 10));
                        $scope.loading = true;
                        Promise.all(promises).then((promisesResponse) => {
                            let response = promisesResponse[0];
                            if (response.status == 200) {
                                let data = response.data;
                                if (data.success) {
                                    $scope.suggestedUsers = data.data;
                                }
                            }

                            $scope.loading = false;
                            Utils.applyChanges($scope);
                        });
                    });
                }
            } else {
                $scope.userLoginMessage = true;
            }
        };

        $scope.searchUsersByTerm = function(searchText, zoneId, form) {
            if (!searchText) {
                form.search_text.$invalid = true;
                return false;
            }
            if (!searchText) {
                $scope.userInfo = $scope.cityZone;
            } else {
                $scope.userInfo = searchText;
            }
            $scope.zoneIdData = zoneId;
            if ($scope.memberZoneList.length > 0) {
                $scope.memberZoneList.forEach((zoneData) => {
                    if (zoneData.zone_id == zoneId) {
                        $scope.zoneDataInfo = zoneData;
                    }
                });
            }
            if ($scope.userInfo.length > 2 || $scope.zoneIdData) {
                userService.searchUserByFilter($scope.userInfo, $scope.zoneIdData).then((response) => {
                    let processedIds = [];
                    $scope.searchUsersResult = [];
                    $scope.loading = true;
                    if (response.status == 200) {
                        let data = response.data;
                        if (data.success) {
                            let userResults = response.data.data;
                            if (userResults.length > 0) {
                                let userInfo = [];
                                userResults.forEach((user) => {
                                    if ($scope.user.user_id != user.user_id) {
                                        userInfo.push(user);
                                    }
                                    processedIds.push(user.user_id);
                                });
                                $scope.searchUsersResult = userInfo;
                                $scope.loading = false;
                                Utils.applyChanges($scope);
                            } else {
                                if (userResults.length == 0) {
                                    $scope.searchPlaceholderText = 'No user found with above search term. Please use another term';
                                } else {
                                    $scope.searchPlaceholderText = '';
                                }
                                $scope.loading = false;
                                Utils.applyChanges($scope);
                            }
                        }
                    }
                }).catch(err => {
                    if (err.status === -1) {
                        setTimeout(function() {
                            $scope.searchUsersByTerm($scope.userInfo, zoneId);
                        }, 1000);
                    } else {
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: "Something went wrong.Please try later.",
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        Utils.applyChanges($scope);
                        $scope.loading = false;
                    }
                });
            }
        };

        $scope.getCategoryValue = (value) => {
            if (value.length == 0) {
                $scope.searchCategoryList = true;
            } else {
                $scope.searchCategoryList = false;
            }
        };

        $scope.allSelectNone = () => {
            $scope.searchCategoryList = true;
        };

        $scope.memberZoneListData = () => {
            $scope.loading = true;
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

        // Login modal
        $scope.openLoginModal = function(eventId, redirect) {
            // create new scope for modal
            let modalScope = $scope.$new(true);

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

        $scope.init = function() {
            $scope.checkIfUserLoggedIn();
            let title = 'Search Events & People – The Promo App';
            let description = 'Browse the latest events around you. Search Event by name or address & find various events. Buy tickets, and join events. Signup today!';
            let keywords = 'Event Management, Event-Based Social Network';
            metaTagsService.setDefaultTags({
                'title': title,
                'description': description,
                'keywords': keywords,
                // OpenGraph
                'og:site_name': 'thepromoapp',
                'og:title': title,
                'og:description': description,
                'og:image': '/img/event-promo-app.jpeg',
                'og:url': 'https://thepromoapp.com',
                // Twitter
                'twitter:title': title,
                'twitter:description': description,
                'twitter:image': '/img/event-promo-app.jpeg',
                'twitter:card': '/img/event-promo-app.jpeg',
            });

            setTimeout(() => {
                $scope.webDateRangePicker.selectedDate = {
                    startDate: moment.utc(),
                    endDate: moment.utc().add(7, 'days')
                };
                angular.element("#startDateRangePicker").val($scope.dateStartFrom);
            }, 500);

            let queryStringObject = $location.search();
            if ($scope.user != null) {
                $scope.memberZoneListData();
                if (queryStringObject && 'people' in queryStringObject) {
                    $scope.loadSuggestedUsers();
                    $scope.defaultSelectedTab = 1;
                    Utils.applyChanges($scope);
                }
            }
        };

        $scope.init();

    }]);