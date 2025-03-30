angular.module('PromoApp')
    .controller('manageEventOverviewController', ['$scope', 'authService', 'eventsService', 'apiService', 'orderByFilter', 'Utils', '$route', '$window', function($scope, authService, eventsService, apiService, orderBy, Utils, $route, $window) {
        $scope.user = authService.getUser();
        $scope.forMacOnly = false;
        $scope.loading = false;
        $scope.eventID = null;
        $scope.getEventInfo = '';
        $scope.eventDataInfo = "";
        $scope.selectedItemvalue = "";
        $scope.eventList = [];
        let token = authService.get('token');
        let styleForMacOnly = () => {
            if (navigator.userAgent.indexOf('Mac OS X') != -1) {
                $("body").addClass("mac");
                $scope.forMacOnly = true;
            }
        };

        /*
         **
         ** Get Analytics Data
         **
         */
        $scope.getAnalyticsData = (dataId) => {
            $scope.loading = true;
            let data = {
                "event_id": dataId
            };
            let netsaleArray = {
                name: [],
                data: []
            };
            $scope.netsaleData = [];
            let netdateInfo = [];
            let ticketSoldArray = {
                name: [],
                data: []
            };
            $scope.ticketSoldData = [];
            let ticketSoldDateInfo = '';
            eventsService.getEventsByStatus({ "status": "live", "page": 1, "limit": 20000, 'zone_id': '' }).then((responseLive) => {
                let liveEvent = orderBy(responseLive.data, 'start_date_time_ms', true);
                $scope.eventList.push(...liveEvent);
                eventsService.getEventsByStatus({ "status": "closed", "page": 1, "limit": 20000, 'zone_id': '' }).then((responseClose) => {
                    let closeEvent = orderBy(responseClose.data, 'start_date_time_ms', true);
                    $scope.eventList.push(...closeEvent);
                    eventsService.getEventsByStatus({ "status": "draft", "page": 1, "limit": 20000, 'zone_id': '' }).then((responseDraft) => {
                        let draftEvent = orderBy(responseDraft.data, 'start_date_time_ms', true);
                        $scope.eventList.push(...draftEvent);
                    }).catch((err) => { console.log("Event List Draft:::", err); });
                }).catch((err) => { console.log("Event List Close:::", err); });
            }).catch((err) => { console.log("Event List Live:::", err); });
            apiService.getSingleAnalyticstInfo(token, data).then((response) => {
                if (response.status == 200) {
                    $scope.getEventInfo = response.data.data.event_details;
                    for (let data of $scope.getEventInfo.ticket_details) {
                        ticketSoldArray = {
                            name: data.ticket_name,
                            data: data.sold_tickets.data
                        };
                        netsaleArray = {
                            name: data.ticket_name,
                            data: data.net_ticket_sales.data
                        };
                        ticketSoldDateInfo = data.sold_tickets.date;
                        netdateInfo = data.net_ticket_sales.date;
                        $scope.ticketSoldData.push(ticketSoldArray);
                        $scope.netsaleData.push(netsaleArray);
                    }
                    setTimeout(function() {
                        if ($scope.netsaleData.length > 0) {
                            Highcharts.chart('netTicketSale', {
                                chart: {
                                    type: 'column'
                                },

                                title: {
                                    text: ''
                                },

                                xAxis: {
                                    categories: netdateInfo
                                },

                                yAxis: {
                                    allowDecimals: false,
                                    min: 0,
                                    labels: {
                                        format: '${value}'
                                    },
                                    title: {
                                        enabled: false
                                    }
                                },

                                tooltip: {
                                    formatter: function() {
                                        return '<b>' + this.x + '</b><br/>' +
                                            this.series.name + ': ' + this.y + '<br/>' +
                                            'Total: ' + this.point.stackTotal;
                                    }
                                },

                                plotOptions: {
                                    column: {
                                        stacking: 'normal'
                                    }
                                },

                                series: $scope.netsaleData
                            });
                        }

                        if ($scope.ticketSoldData.length > 0) {
                            Highcharts.chart('ticketSold', {
                                chart: {
                                    type: 'column'
                                },

                                title: {
                                    text: ''
                                },

                                xAxis: {
                                    categories: ticketSoldDateInfo
                                },

                                yAxis: {
                                    allowDecimals: false,
                                    min: 0,
                                    labels: {
                                        format: '{value}'
                                    },
                                    title: {
                                        enabled: false
                                    }
                                },

                                tooltip: {
                                    formatter: function() {
                                        return '<b>' + this.x + '</b><br/>' +
                                            this.series.name + ': ' + this.y + '<br/>' +
                                            'Total: ' + this.point.stackTotal;
                                    }
                                },

                                plotOptions: {
                                    column: {
                                        stacking: 'normal'
                                    }
                                },

                                series: $scope.ticketSoldData
                            });
                        }

                    }, 1000);
                    Utils.applyChanges($scope);
                    $scope.loading = false;
                }
            }).catch((err) => {
                console.log("Get Analytics Data:::", err);
                let content = "Data not found. Try again...";
                let notify = {
                    type: 'error',
                    title: 'Oops!!',
                    content: content,
                    timeout: 5000 //time in ms
                };
                $scope.$emit('notify', notify);
                $scope.loading = false;
            });
        };

        /*
         **
         ** Change Event Info
         **
         */
        $scope.changeEventData = (eventID, eventName) => {
            $scope.selectedItemvalue = eventName;
            $window.location.href = `/eventOverview?ev=${eventID}`;
            $window.location.reload();
        };

        /*
         **
         ** Get Event Detail
         **
         */
        $scope.getEventDetails = function(eventID) {
            $scope.loading = true;
            eventsService.getEventDetails(eventID).then((response => {
                if (response.status == 200) {
                    $scope.loading = false;
                    let data = response.data;
                    if (data.success) {
                        $scope.eventDataInfo = data.data;
                        $scope.selectedItemvalue = $scope.eventDataInfo.event_name;
                    } else {
                        let notify = {
                            type: 'error',
                            title: 'Error',
                            content: "No such event exists",
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                    }
                } else {
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: "Sorry something went wrong. Please try later.",
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    Utils.applyChanges($scope);
                }
            })).catch(err => {
                $scope.loading = false;
                // This console is for error identify
                console.log(err);
            }).finally(() => {
                $scope.loading = false;
            });
        };

        /*
         **
         ** Init function
         **
         */
        $scope.init = () => {
            styleForMacOnly();
            if ($route.current.params && 'ev' in $route.current.params && $route.current.params.ev) {
                $scope.eventID = $route.current.params.ev;
                $scope.getEventDetails($scope.eventID);
                $scope.getAnalyticsData($scope.eventID);
            } else {
                let content = 'Event data not found. Please try again...';
                let notify = {
                    type: 'error',
                    title: 'Oops!!',
                    content: content,
                    timeout: 5000 //time in ms
                };
                $scope.$emit('notify', notify);
                setTimeout(function() {
                    $window.location.href = `/manageevent`;
                }, 5000);
            }
        };

        $scope.init();
    }]);