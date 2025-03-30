angular.module('PromoApp')
    .controller('analyticsReportController', ['$scope', 'metaTagsService', '$timeout', 'Utils', 'authService', 'apiService', 'eventsService', 'orderByFilter', '$uibModal', '$filter', '$route', function($scope, metaTagsService, $timeout, Utils, authService, apiService, eventsService, orderBy, $uibModal, $filter, $route) {
        /*
         **
         ** Global Variable / functions 
         **
         */
        $scope.loading = false;
        $scope.forMacOnly = false;
        let token = authService.get('token');
        $scope.user = authService.getUser();
        $scope.zoneList = [];
        $scope.eventID = '';
        $scope.past7Selected = true;
        $scope.past30Selected = false;
        $scope.dateSelected = false;
        $scope.eventAllData = true;
        $scope.eventUpcomingData = false;
        $scope.eventPastData = false;
        $scope.eventSelectedData = false;
        $scope.todayDate = moment().format("YYYY-MM-DD");
        $scope.endDate = moment().subtract(6, 'd').format('YYYY-MM-DD');
        $scope.eventType = "all";
        $scope.reportType = "guest";
        $scope.eventId = [];
        $scope.eventList = [];
        $scope.zoneId = null;
        $scope.styleForMacOnly = () => {
            if (navigator.userAgent.indexOf('Mac OS X') != -1) {
                $("body").addClass("mac");
                $scope.forMacOnly = true;
            }
        };

        /*
         **
         ** Date Range Picker
         **
         */
        $scope.filterDateFrom = moment();
        $scope.filterDateTo = moment().add('6', 'days');
        $scope.showhide = {
            results: true,
            selectdates: false
        };
        $scope.webDateRangePicker = {
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
            customText: "Custom Date",
            options: {
                pickerClasses: 'pa-datepicker payout-picker',
                applyButtonClasses: 'md-button pa-pink-button pa-font-bold pa-modal-font pa-height-34',
                cancelButtonClasses: 'pa-color-pink pa-modal-font',
                showCustomRangeLabel: false,
                timePicker: false,
                clearable: true,
                autoUpdateInput: false,
                opens: 'right',
                locale: {
                    applyLabel: "Done",
                    clearLabel: 'Reset',
                    separator: ' - ',
                    format: "ddd, D MMMM, YYYY",
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
                    },
                    'apply.daterangepicker': function(event, picker) {
                        $scope.filterDateFrom = $scope.webDateRangePicker.selectedDate.startDate;
                        $scope.filterDateTo = $scope.webDateRangePicker.selectedDate.endDate;
                        $scope.webDateRangePicker.customText = moment($scope.filterDateFrom).format("ddd, D MMM, YYYY") + ' - ' + moment($scope.filterDateTo).format("ddd, D MMM, YYYY");
                        $scope.dateSelected = true;
                        $scope.past7Selected = false;
                        $scope.past30Selected = false;
                        $scope.todayDate = moment($scope.filterDateTo).format('YYYY-MM-DD');
                        $scope.endDate = moment($scope.filterDateFrom).format('YYYY-MM-DD');
                        $scope.getEventList($scope.eventId, $scope.zoneId, $scope.eventType, $scope.endDate, $scope.todayDate);
                    }
                }
            }
        };

        /*
         **
         ** Get Zone List
         **
         */
        $scope.getZoneList = () => {
            apiService.userZoneList(token).then((response) => {
                if (response.data.success) {
                    let zoneListOrg = [];
                    let zoneListData = [];
                    zoneListOrg.push(...response.data.data.data.organizer_zones);
                    zoneListOrg.push(...response.data.data.data.owner_zones);
                    let zoneOwner = response.data.data.data.owner_zones;
                    let zoneOrganizer = response.data.data.data.organizer_zones;
                    if (zoneOwner.length > 0) {
                        zoneOwner.forEach((data) => {
                            if (zoneListOrg.indexOf(data.zone_id) == -1) {
                                $scope.zoneList.push(data);
                                zoneListData.push(data);
                            }
                        });
                    } else if (zoneOrganizer.length > 0 && zoneOwner.length == 0) {
                        zoneOrganizer.forEach((data) => {
                            if (zoneListOrg.indexOf(data.zone_id) == -1) {
                                $scope.zoneList.push(data);
                            }
                        });
                    } else {
                        zoneOrganizer.forEach((data) => {
                            $scope.zoneList.push(data);
                        });
                    }
                }
            }).catch((err) => {
                console.log("Get Zone List", err);
            });
        };

        /*
         **
         ** Get Event List
         **
         */
        $scope.getEventList = (eventId, zoneId, eventType, startDate, endDate) => {
            $scope.eventList = [];
            let data = {
                "event_ids": eventId,
                "zone_id": zoneId,
                "event_type": eventType,
                "start_date": startDate,
                "end_date": endDate
            };
            apiService.getAnalyticsDashInfo(token, data).then((response) => {
                if (response.status == 200) {
                    let responseData = response.data.data;
                    $scope.eventList = responseData.eventstBreakDown;
                    Utils.applyChanges($scope);
                }
            });
        };

        /*
         **
         ** Get Analytics Report
         **
         */
        $scope.getAnalyticsReport = (eventId, zoneId, eventType, startDate, endDate, reportType, format) => {
            $scope.loading = true;
            $scope.loadingMessage = 'Report Generating. Please wait.';
            let data = {
                "event_ids": eventId,
                "zone_id": zoneId,
                "event_type": eventType,
                "start_date": startDate,
                "end_date": endDate,
                "report_type": reportType
            };
            apiService.getAnalyticsReportInfo(token, data).then((response) => {
                if (response.status == 200) {
                    let responseData = response.data.data;
                    if (reportType == "guest") {
                        $scope.searchCaseResult = responseData.guestList;
                    } else if (reportType == "attendees") {
                        $scope.searchCaseResult = responseData.attendees;
                    } else if (reportType == "cancellation") {
                        $scope.searchCaseResult = responseData.cancellation;
                    } else if (reportType == "orders") {
                        $scope.searchCaseResult = responseData.orders;
                    } else if (reportType == "checkIns") {
                        $scope.searchCaseResult = responseData.checkIns;
                    } else if (reportType == "costItems") {
                        $scope.searchCaseResult = responseData.costItems;
                    }
                    //get current system date.
                    $scope.CurrentDateTime = moment().format("MM-DD-YYYY_hh:mma");
                    let notify = {
                        type: 'success',
                        title: 'Success',
                        content: "Report download successfully.",
                        timeout: 3000 //time in ms
                    };
                    //Create XLS & CSV format.
                    if ($scope.searchCaseResult.length > 0) {
                        if (format == 'xls') {
                            alasql('SELECT * INTO XLS("reports_' + reportType + '_' + $scope.CurrentDateTime + '.xls",{headers:true}) FROM ?', [$scope.searchCaseResult]);
                            $scope.$emit('notify', notify);
                        } else if (format == 'csv') {
                            alasql('SELECT * INTO CSV("reports_' + reportType + '_' + $scope.CurrentDateTime + '.csv",{headers:true}) FROM ?', [$scope.searchCaseResult]);
                            $scope.$emit('notify', notify);
                        }
                    } else {
                        let notify = {
                            type: 'error',
                            title: 'Error',
                            content: "Report data not found.",
                            timeout: 3000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                    }
                    $scope.loading = false;
                }
            }).catch((err) => {
                console.log("Get Analytics Report:::", err);
                $scope.loading = false;
            });
        };

        /*
         **
         ** Get 7 Days Data
         **
         */
        $scope.get7DaysData = () => {
            if (!$scope.past7Selected) {
                $scope.past7Selected = true;
                $scope.past30Selected = false;
                $scope.dateSelected = false;
                $scope.todayDate = moment().format("YYYY-MM-DD");
                $scope.endDate = moment().subtract(6, 'd').format('YYYY-MM-DD');
                $scope.webDateRangePicker.selectedDate.startDate = moment();
                $scope.webDateRangePicker.selectedDate.endDate = moment().add('6', 'days');
                $scope.webDateRangePicker.customText = "Custom Date";
                $scope.getEventList($scope.eventId, $scope.zoneId, $scope.eventType, $scope.endDate, $scope.todayDate);
                Utils.applyChanges($scope);
            }
        };

        /*
         **
         ** Get 30 Days Data
         **
         */
        $scope.get30DaysData = () => {
            if (!$scope.past30Selected) {
                $scope.past7Selected = false;
                $scope.past30Selected = true;
                $scope.dateSelected = false;
                $scope.todayDate = moment().format("YYYY-MM-DD");
                $scope.endDate = moment().subtract(30, 'd').format('YYYY-MM-DD');
                $scope.webDateRangePicker.selectedDate.startDate = moment();
                $scope.webDateRangePicker.selectedDate.endDate = moment().add('6', 'days');
                $scope.webDateRangePicker.customText = "Custom Date";
                $scope.getEventList($scope.eventId, $scope.zoneId, $scope.eventType, $scope.endDate, $scope.todayDate);
                Utils.applyChanges($scope);
            }
        };

        /*
         **
         ** Get All Event Data
         **
         */
        $scope.getAllEventData = () => {
            if (!$scope.eventAllData) {
                $scope.eventAllData = true;
                $scope.eventUpcomingData = false;
                $scope.eventPastData = false;
                $scope.eventSelectedData = false;
                $scope.eventType = "all";
                if ($scope.eventList.length > 0) {
                    for (let s of $scope.eventList) {
                        s.selected = false;
                    }
                }
                $scope.valuesData = [];
                $scope.eventId = [];
                $scope.getEventList($scope.eventId, $scope.zoneId, $scope.eventType, $scope.endDate, $scope.todayDate);
                Utils.applyChanges($scope);
            }
        };

        /*
         **
         ** Get Upcoming Event Data
         **
         */
        $scope.getUpcomingEventData = () => {
            if (!$scope.eventUpcomingData) {
                $scope.eventType = 'upcoming';
                $scope.eventAllData = false;
                $scope.eventUpcomingData = true;
                $scope.eventPastData = false;
                $scope.eventSelectedData = false;
                if ($scope.eventList.length > 0) {
                    for (let s of $scope.eventList) {
                        s.selected = false;
                    }
                }
                $scope.valuesData = [];
                $scope.eventId = [];
                $scope.getEventList($scope.eventId, $scope.zoneId, $scope.eventType, $scope.endDate, $scope.todayDate);
                Utils.applyChanges($scope);
            }
        };

        /*
         **
         ** Get Past Event Data
         **
         */
        $scope.getPastEventData = () => {
            if (!$scope.eventPastData) {
                $scope.eventType = 'past';
                $scope.eventAllData = false;
                $scope.eventUpcomingData = false;
                $scope.eventPastData = true;
                $scope.eventSelectedData = false;
                if ($scope.eventList.length > 0) {
                    for (let s of $scope.eventList) {
                        s.selected = false;
                    }
                }
                $scope.valuesData = [];
                $scope.eventId = [];
                $scope.getEventList($scope.eventId, $scope.zoneId, $scope.eventType, $scope.endDate, $scope.todayDate);
                Utils.applyChanges($scope);
            }
        };

        /*
         **
         ** Get Event List Modal
         **
         */
        $scope.getEventListModal = () => {
            let eventModelScope = $scope.$new(false, $scope);
            $scope.getEventListView = $uibModal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: '../../partials/eventListAnalytics.html',
                openedClass: 'pa-create-event-modal freeEventTickets popup_wtd_700 chooseWidgetType selectSingleEvent scroll_popup',
                scope: eventModelScope,
                backdrop: 'static',
                keyboard: false,
                size: 'md'
            });
        };


        /*
         **
         ** Get Data Zone Selected
         **
         */
        $scope.getEventZoneWise = (id) => {
            $scope.zoneId = id;
            $scope.getEventList($scope.eventId, $scope.zoneId, $scope.eventType, $scope.endDate, $scope.todayDate);
            Utils.applyChanges($scope);
        };

        /*
         **
         ** Close Function
         **
         */
        $scope.close = function() {
            this.$close('close');
        };

        /*
         **
         ** Select Event Function
         **
         */
        $scope.valuesData = [];
        $scope.selecteEventFromList = (valueId) => {
            let valueFlag = true;
            $scope.valuesData.forEach((data, index) => {
                if (data === valueId) {
                    valueFlag = false;
                    $scope.valuesData.splice(index, 1);
                } else {
                    valueFlag = true;
                }
            });
            if (valueFlag) {
                for (let s of $scope.eventList) {
                    if (s.event_id === valueId) {
                        s.selected = true;
                        $scope.valuesData.push(s.event_id);
                    }
                }
            } else {
                for (let s of $scope.eventList) {
                    if (s.event_id === valueId) {
                        s.selected = false;
                    }
                }
            }
            Utils.applyChanges($scope);
        };

        /*
         **
         ** Get Selected Event
         **
         */
        $scope.getEventSelected = () => {
            $scope.eventId = $scope.valuesData;
            $scope.eventAllData = false;
            $scope.eventUpcomingData = false;
            $scope.eventPastData = false;
            $scope.eventSelectedData = true;
            Utils.applyChanges($scope);
            $scope.getEventListView.close();
        };

        /*
         **
         ** Reset Modal Function
         **
         */
        $scope.resetModal = () => {
            if ($scope.eventList.length > 0) {
                for (let s of $scope.eventList) {
                    s.selected = false;
                }
            }
            $scope.valuesData = [];
            Utils.applyChanges($scope);
            $scope.getEventListView.close();
        };


        /*
         **
         ** Guests Report
         **
         */
        $scope.guestsReport = function(format) {
            $scope.reportType = "guest";
            $scope.getAnalyticsReport($scope.eventId, $scope.zoneId, $scope.eventType, $scope.endDate, $scope.todayDate, $scope.reportType, format);
        };

        /*
         **
         ** Orders Report
         **
         */
        $scope.ordersReport = function(format) {
            $scope.reportType = "orders";
            $scope.getAnalyticsReport($scope.eventId, $scope.zoneId, $scope.eventType, $scope.endDate, $scope.todayDate, $scope.reportType, format);
        };

        /*
         **
         ** Tickets Report
         **
         */
        $scope.ticketsReport = function(format) {
            $scope.reportType = "costItems";
            $scope.getAnalyticsReport($scope.eventId, $scope.zoneId, $scope.eventType, $scope.endDate, $scope.todayDate, $scope.reportType, format);
        };

        /*
         **
         ** Check-Ins Report
         **
         */
        $scope.checkInsReport = function(format) {
            $scope.reportType = "checkIns";
            $scope.getAnalyticsReport($scope.eventId, $scope.zoneId, $scope.eventType, $scope.endDate, $scope.todayDate, $scope.reportType, format);
        };

        /*
         **
         ** Cancellation Report
         **
         */
        $scope.cancellationReport = function(format) {
            $scope.reportType = "cancellation";
            $scope.getAnalyticsReport($scope.eventId, $scope.zoneId, $scope.eventType, $scope.endDate, $scope.todayDate, $scope.reportType, format);
        };

        /*
         **
         ** init function
         **
         */
        $scope.init = function() {

            /* Global Function Run */
            $scope.getZoneList();
            $scope.getEventList($scope.eventId, $scope.zoneId, $scope.eventType, $scope.endDate, $scope.todayDate);
            $scope.styleForMacOnly();

            /* Single Event Report */
            $scope.eventID = $route.current.params.ev;
            if ($scope.eventID != '') {
                $scope.eventId.push($scope.eventID);
                $scope.endDate = '';
                $scope.todayDate = '';
            }
            /* Meta Tags */
            metaTagsService.setDefaultTags({
                'title': "The Promo App | Social Event Management Network",
                'Description': 'The Promo App makes social event networking and event management easier than ever before. Find events, buy and sell tickets, promote events, and more.',
                'Keywords': 'The Promo App, event management',
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