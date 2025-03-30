angular.module('PromoApp')
    .controller('analyticsDashbaordController', ['$scope', 'metaTagsService', '$timeout', 'Utils', 'authService', 'apiService', 'eventsService', 'orderByFilter', '$uibModal', function($scope, metaTagsService, $timeout, Utils, authService, apiService, eventsService, orderBy, $uibModal) {
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
        $scope.eventId = [];
        $scope.eventList = [];
        $scope.zoneId = null;
        $scope.totalRevenue = {
            total: 0.00,
            mobile: 0.00,
            web: 0.00
        };
        $scope.totalSoldTickets = {
            total: 0.00,
            mobile: 0.00,
            web: 0.00
        };
        $scope.totalPageViews = {
            total: 0.00,
            mobile: 0.00,
            web: 0.00
        };
        $scope.promotionByUsers = {
            total: 0.00,
            mobile: 0.00,
            web: 0.00
        };
        $scope.totalPayout = 0;
        $scope.totalRefund = 0;
        $scope.guestsInvited = 0;
        $scope.attendee = 0;
        $scope.mostPopularCity = [];
        $scope.insight = {
            averageOrderPrice: 0,
            averageTicketPrice: 0,
            currency: "USD",
            popularTimeOfPurchase: "0 am",
            ticketPerorder: 0,
        };
        $scope.mostPopularCity = [];
        $scope.totalCancellation = 0;
        $scope.totalEventPages = 0;
        $scope.eventstBreakDown = [];
        $scope.styleForMacOnly = () => {
            if (navigator.userAgent.indexOf('Mac OS X') != -1) {
                $("body").addClass("mac");
                $scope.forMacOnly = true;
            }
        };

        /*
         **
         ** Pie Chart 
         **
         */
        $scope.not_attendee = 1;
        $scope.pieOptions = {
            readOnly: true,
            max: 1000,
            subText: {
                enabled: true,
                text: 'Not attended',
                color: 'rgba(51,51,51,0.6)',
                font: 'Lato',
                fontSize: 12,
            },
            trackWidth: 35,
            barWidth: 40,
            spaceWidth: 10,
            textColor: '#000000',
            trackColor: '#1f6d89',
            barColor: '#FF8346',
        };

        /* 
         **
         ** Line Chart 
         **
         */
        $scope.eventData = ['Series A', 'Series B'];
        $scope.lineData = [
            [{
                t: moment().subtract(6, 'd').format('YYYY-MM-DD'),
                y: 0
            }, {
                t: moment().subtract(5, 'd').format('YYYY-MM-DD'),
                y: 0
            }, {
                t: moment().subtract(4, 'd').format('YYYY-MM-DD'),
                y: 0
            }, {
                t: moment().subtract(3, 'd').format('YYYY-MM-DD'),
                y: 0
            }, {
                t: moment().subtract(2, 'd').format('YYYY-MM-DD'),
                y: 0
            }, {
                t: moment().subtract(1, 'd').format('YYYY-MM-DD'),
                y: 0
            }, {
                t: moment().subtract(0, 'd').format('YYYY-MM-DD'),
                y: 0
            }],
            [{
                t: moment().subtract(6, 'd').format('YYYY-MM-DD'),
                y: 0
            }, {
                t: moment().subtract(5, 'd').format('YYYY-MM-DD'),
                y: 0
            }, {
                t: moment().subtract(4, 'd').format('YYYY-MM-DD'),
                y: 0
            }, {
                t: moment().subtract(3, 'd').format('YYYY-MM-DD'),
                y: 0
            }, {
                t: moment().subtract(2, 'd').format('YYYY-MM-DD'),
                y: 0
            }, {
                t: moment().subtract(1, 'd').format('YYYY-MM-DD'),
                y: 0
            }, {
                t: moment().subtract(0, 'd').format('YYYY-MM-DD'),
                y: 0
            }]
        ];
        $scope.datasetOverride = [{ yAxisID: 'y-axis-1' }];
        $scope.chartOptions = {
            scales: {
                yAxes: [{
                    id: 'y-axis-1',
                    type: 'linear',
                    display: true,
                    position: 'left'
                }],
                xAxes: [{
                    type: 'time',
                    time: {
                        unit: 'day'
                    }
                }]
            },
            showLines: true,
            tooltips: {
                // Disable the on-canvas tooltip
                enabled: false,

                custom: function(tooltipModel) {
                    // Tooltip Element
                    var tooltipEl = document.getElementById('chartjs-tooltip');

                    // Create element on first render
                    if (!tooltipEl) {
                        tooltipEl = document.createElement('div');
                        tooltipEl.id = 'chartjs-tooltip';
                        tooltipEl.innerHTML = '<table></table>';
                        tooltipEl.style.backgroundColor = "#FFFFFF";
                        tooltipEl.style.borderColor = "#999999";
                        tooltipEl.style.borderWidth = "thin";
                        tooltipEl.style.borderStyle = "solid";
                        document.getElementById('timelineSection').appendChild(tooltipEl);
                    }

                    // Hide if no tooltip
                    if (tooltipModel.opacity === 0) {
                        tooltipEl.style.opacity = 0;
                        return;
                    }

                    // Set caret Position
                    tooltipEl.classList.remove('above', 'below', 'no-transform');
                    if (tooltipModel.yAlign) {
                        tooltipEl.classList.add(tooltipModel.yAlign);
                    } else {
                        tooltipEl.classList.add('no-transform');
                    }

                    function getBody(bodyItem) {
                        return bodyItem.lines;
                    }

                    // Set Text
                    if (tooltipModel.body) {
                        var titleLines = tooltipModel.title || [];
                        var bodyLines = tooltipModel.body.map(getBody);

                        var innerHtml = '<thead>';

                        titleLines.forEach(function(title) {
                            innerHtml += '<tr><th style="padding-bottom: 3px;font-weight: 900;">' + title + '</th></tr>';
                        });
                        innerHtml += '</thead><tbody>';

                        bodyLines.forEach(function(body, i) {
                            var colors = tooltipModel.labelColors[i];
                            var style = 'background:' + colors.backgroundColor;
                            style += '; border-color:' + colors.borderColor;
                            style += '; border-width: 0;';
                            var span = '<span style="' + style + '"></span>';
                            innerHtml += '<tr><td style="padding: 2px 0;color:'+ colors.backgroundColor +'">' + span + body + '</td></tr>';
                        });
                        innerHtml += '</tbody>';

                        var tableRoot = tooltipEl.querySelector('table');
                        tableRoot.innerHTML = innerHtml;
                    }

                    // `this` will be the overall tooltip
                    var position = this._chart.canvas.getBoundingClientRect();

                    // Display, position, and set styles for font
                    tooltipEl.style.opacity = 1;
                    tooltipEl.style.position = 'absolute';
                    tooltipEl.style.left = tooltipModel.caretX + 40 + 'px';
                    tooltipEl.style.top = tooltipModel.caretY + (-150) +'px';
                    tooltipEl.style.fontFamily = 'Lato';
                    tooltipEl.style.fontSize = tooltipModel.bodyFontSize + 'px';
                    tooltipEl.style.fontStyle = tooltipModel._bodyFontStyle;
                    tooltipEl.style.padding = tooltipModel.yPadding + 'px ' + tooltipModel.xPadding + 'px';
                    tooltipEl.style.borderRadius = '4px';
                    tooltipEl.style.pointerEvents = 'none';
                    tooltipEl.style.zIndex = '1';
                }
            }
        };
        $scope.chartColors = {
            colors: ['#5B4DDD', '#F5AF00', '#FF8346', '#D0021B', '#1A7898', '#9013FE', '#EDAB04', '#00C992', '#1F6D89', '#B03D58', '#38B968']
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
                        $scope.getAnalyticsData($scope.eventId, $scope.zoneId, $scope.eventType, $scope.endDate, $scope.todayDate);
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
         ** Get Analytics Data
         **
         */
        $scope.getAnalyticsData = (eventId, zoneId, eventType, startDate, endDate) => {
            $scope.loading = true;
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
                    $scope.eventData = [];
                    $scope.lineData = [];
                    $scope.chartColors = { colors: [] };
                    let maxTicket = 0;
                    let responseData = response.data.data;
                    $scope.not_attendee = responseData.not_attendee;
                    $scope.totalRevenue = responseData.totalRevenue;
                    $scope.totalSoldTickets = responseData.totalSoldTickets;
                    $scope.totalPageViews = responseData.totalPageViews;
                    $scope.promotionByUsers = responseData.promotionByUsers;
                    $scope.totalPayout = responseData.totalPayout;
                    $scope.totalRefund = responseData.totalRefund;
                    $scope.guestsInvited = responseData.guestsInvited;
                    $scope.attendee = responseData.attendee;
                    $scope.mostPopularCity = responseData.mostPopularCity;
                    $scope.insight = responseData.insight;
                    $scope.mostPopularCity = responseData.mostPopularCity;
                    $scope.totalCancellation = responseData.totalCancellation;
                    $scope.totalEventPages = responseData.totalEventPages;
                    $scope.eventstBreakDown = responseData.eventstBreakDown;
                    if ($scope.eventstBreakDown.length > 0) {
                        if ($scope.valuesData.length > 0) {
                            angular.forEach($scope.eventstBreakDown, function(list) {
                                angular.forEach($scope.valuesData, function(listItems) {
                                    if (listItems == list.event_id) {
                                        list.selected = true;
                                    }
                                });
                                $scope.eventList.push(list);
                            });
                        } else {
                            $scope.eventList = $scope.eventstBreakDown;
                        }
                        $scope.eventstBreakDown.forEach((elem) => {
                            $scope.eventData.push(elem.event_name);
                            $scope.chartColors.colors.push(elem.color);
                            $scope.lineData.push(elem.timeLine);
                            maxTicket += parseInt(elem.total_tickets);
                        });
                        $scope.pieOptions.max = maxTicket;
                    } else {
                        $scope.eventData = ["No Data Found"];
                        $scope.lineData = [
                            [{
                                t: new Date(),
                                y: 0
                            }]
                        ];
                    }
                    Utils.applyChanges($scope);
                    $scope.loading = false;
                }
            }).catch((err) => {
                console.log("Get Analytics Data:::", err);
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
                $scope.not_attendee = 0;
                $scope.todayDate = moment().format("YYYY-MM-DD");
                $scope.endDate = moment().subtract(6, 'd').format('YYYY-MM-DD');
                $scope.webDateRangePicker.selectedDate.startDate = moment();
                $scope.webDateRangePicker.selectedDate.endDate = moment().add('6', 'days');
                $scope.webDateRangePicker.customText = "Custom Date";
                $scope.getAnalyticsData($scope.eventId, $scope.zoneId, $scope.eventType, $scope.endDate, $scope.todayDate);
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
                $scope.not_attendee = 0;
                $scope.endDate = moment().subtract(30, 'd').format('YYYY-MM-DD');
                $scope.webDateRangePicker.selectedDate.startDate = moment();
                $scope.webDateRangePicker.selectedDate.endDate = moment().add('6', 'days');
                $scope.webDateRangePicker.customText = "Custom Date";
                $scope.getAnalyticsData($scope.eventId, $scope.zoneId, $scope.eventType, $scope.endDate, $scope.todayDate);
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
                $scope.not_attendee = 0;
                if ($scope.eventList.length > 0) {
                    for (let s of $scope.eventList) {
                        s.selected = false;
                    }
                }
                $scope.valuesData = [];
                $scope.eventId = [];
                $scope.getAnalyticsData($scope.eventId, $scope.zoneId, $scope.eventType, $scope.endDate, $scope.todayDate);
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
                $scope.not_attendee = 0;
                if ($scope.eventList.length > 0) {
                    for (let s of $scope.eventList) {
                        s.selected = false;
                    }
                }
                $scope.valuesData = [];
                $scope.eventId = [];
                $scope.getAnalyticsData($scope.eventId, $scope.zoneId, $scope.eventType, $scope.endDate, $scope.todayDate);
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
                $scope.not_attendee = 0;
                if ($scope.eventList.length > 0) {
                    for (let s of $scope.eventList) {
                        s.selected = false;
                    }
                }
                $scope.valuesData = [];
                $scope.eventId = [];
                $scope.getAnalyticsData($scope.eventId, $scope.zoneId, $scope.eventType, $scope.endDate, $scope.todayDate);
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
            $scope.not_attendee = 0;
            $scope.getAnalyticsData($scope.eventId, $scope.zoneId, $scope.eventType, $scope.endDate, $scope.todayDate);
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
            $scope.not_attendee = 0;
            $scope.getAnalyticsData($scope.eventId, $scope.zoneId, $scope.eventType, $scope.endDate, $scope.todayDate);
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
         ** init function
         **
         */
        $scope.init = function() {

            /* Global Function Run */
            $scope.getZoneList();
            $scope.styleForMacOnly();
            $scope.getAnalyticsData($scope.eventId, $scope.zoneId, $scope.eventType, $scope.endDate, $scope.todayDate);
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