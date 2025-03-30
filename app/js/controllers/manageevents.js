angular.module('PromoApp')
    .controller('ManageEventsController', ['$scope', 'authService', 'awsService', 'apiService', 'eventsService', 'orderByFilter', '$uibModal', 'Utils', 'config', 'userService', '$location', '$window', 'metaTagsService', '$mdDialog', '$cookies',
        function($scope, authService, awsService, apiService, eventsService, orderBy, $uibModal, Utils, config, userService, $location, $window, metaTagsService, $mdDialog, $cookies) {
            $scope.tabs = {
                "liveevents": {
                    id: 'liveevents',
                    displayName: 'Live',
                    selected: true,
                    hide: false,
                    events: [],
                    currentPage: 1,
                    pageLength: 0,
                    actions: ["settings", "edit", "status"]
                },
                "draft": {
                    id: 'draft',
                    displayName: "Draft",
                    selected: false,
                    hide: false,
                    events: [],
                    currentPage: 1,
                    pageLength: 0,
                    actions: ["edit"]
                },
                "closedevents": {
                    id: 'closedevents',
                    displayName: "Expired",
                    selected: false,
                    hide: false,
                    events: [],
                    currentPage: 1,
                    pageLength: 0,
                    actions: []
                }
            };

            $scope.reloadWithTabSelect = false;
            $scope.plans = config.PLANS;
            $scope.clos = true;
            $scope.categoriesMap = [];
            $scope.selectedTab = $scope.tabs.liveevents.id;
            $scope.filterDateFrom = moment.utc();
            $scope.currentHour24 = moment().add(1, 'hours').format('H');
            $scope.currentDateDuplicate = true;
            $scope.currentDateEndDuplicate = true;
            let currentDateDuplicate = moment().format("DD:MM:YYYY");
            let current_time_value = moment().add(1, 'hours').format('H');
            $scope.filterDateTo = null;
            $scope.currentPlanId = null;
            $scope.pagination = {
                currentPage: 1,
                numPerPage: 10,
                maxSize: 5
            };
            $scope.zoneListOrg = [];
            $scope.zoneSelectedId = null;
            $scope.eventRunning = false;
            $scope.numPerPage = 10;
            $scope.maxSize = 5;
            $scope.loading = false;
            $scope.loadingMessage = 'Loading...';
            $scope.numberOfTotalAvailableEvents = null;
            $scope.numberOfCreatedEvents = null;
            $scope.noEventUIShow = false;
            $scope.chooseOptionFlag = true;
            $scope.optionDisableFlag = true;
            $scope.eventListFlag = false;
            $scope.organiserInfoFlag = false;
            $scope.eventMultiListFlag = false;
            $scope.backFromListFlag = false;
            $scope.selectedOption = '';
            $scope.selectedEventlist = '';
            $scope.liveEventsList = '';
            $scope.modalHeaderTextFlag = {
                step1: true,
                complete1: false,
                step2: false,
                complete2: false,
                step3: false,
                complete3: false,
                final: false,
                complete4: false,
            };
            $scope.modalSteps = 'steps1';
            $scope.eventSelection = 'single';
            $scope.organiserProfile = {};
            $scope.organiserInfosFlag = false;
            $scope.selectedEventId = "";
            $scope.organiser = {
                image: '',
                websiteName: '',
                websiteURL: '',
                croppedImage: ''
            };
            $scope.startDateTime = "";
            $scope.endDateTime = '';
            $scope.duplicateEvent = {
                event_name: '',
                eventStartDate: '',
                eventStartTime: '',
                eventEndDate: '',
                eventEndTime: ''
            };
            $scope.createEventForms = {};
            $scope.showHide = {
                imageSelected: false
            };
            $scope.dropdowns = {
                startDateRangePicker: {
                    minDate: moment().utc(),
                    mobilePicker: null,
                    toggle() {
                        // need to use $timeout here to avoid $apply errors for digest cycle
                        $timeout(() => {
                            $scope.dropdowns.startDateRangePicker.mobilePicker.toggle();
                        });
                    },
                    place() {
                        $timeout(() => {
                            $scope.dropdowns.startDateRangePicker.place();
                        });
                    },
                    selectedDate: {
                        startDate: moment.utc(),
                        endDate: moment.utc()
                    },
                    options: {
                        parentEl: '.date-picker-start',
                        pickerClasses: 'custom-display', //angular-daterangepicker extra
                        applyButtonClasses: 'md-button pa-pink-button pa-font-bold pa-modal-font pa-height-34',
                        cancelButtonClasses: 'pa-color-pink pa-modal-font',
                        clearable: true,
                        singleDatePicker: true,
                        showCustomRangeLabel: false,
                        timePicker: false,
                        locale: {
                            applyLabel: "Done",
                            clearLabel: 'Reset',
                            cancelLabel: 'Reset',
                            separator: ' - ',
                            format: "MMM DD, YYYY"
                        },
                        'show.daterangepicker': function(event, picker) {
                            $scope.showHide.mobile.selectdates = true;
                        },
                        'hide.daterangepicker': function(event, picker) {
                            $scope.showHide.mobile.selectdates = false;
                        },
                        eventHandlers: {
                            'apply.daterangepicker': function(event, picker) {
                                //check event source
                                let sourceId = event.picker.element[0].id;
                                if (sourceId == "ticketSaleStartDate") { //ticket
                                    $scope.duplicateEvent.tickets.saleEndDate.date = $scope.duplicateEvent.tickets.saleStartDate.date;
                                    angular.element('#ticketSaleEndDate').val(($scope.duplicateEvent.tickets.saleEndDate.date).format("MMM, DD YYYY"));
                                    setTimeout(function() {
                                        angular.element('#ticketSaleEndDate').triggerHandler('focus');
                                        angular.element('#ticketSaleEndDate').triggerHandler('blur');
                                        angular.element('.drp-calendar').attr("style", "display:none");
                                        $scope.validateTime($scope.duplicateEvent.tickets.saleStartDate.date, $scope.duplicateEvent.tickets.saleStartDate.time, $scope.duplicateEvent.tickets.saleEndDate.date, $scope.duplicateEvent.tickets.saleEndDate.time, 'createEventForms.create_event_form_admissions_3', 'saleendDate');
                                    }, 500);

                                } else { //event
                                    let currentSelectedDate = moment($scope.duplicateEvent.eventStartDate).format("DD:MM:YYYY");
                                    if (currentSelectedDate > currentDateDuplicate) {
                                        $scope.currentDateDuplicate = false;
                                        $scope.currentDateEndDuplicate = false;
                                    } else {
                                        $scope.currentDateDuplicate = true;
                                        $scope.currentDateEndDuplicate = true;
                                    }
                                    $scope.duplicateEvent.eventEndDate = $scope.duplicateEvent.eventStartDate;
                                    angular.element('#eventEndDate').val(($scope.duplicateEvent.eventEndDate).format("MMM DD, YYYY"));
                                    if (typeof event.max == 'undefined') {
                                        $scope.duplicateEvent.eventEndDate = $scope.duplicateEvent.eventStartDate;
                                        $scope.validateTime($scope.duplicateEvent.eventStartDate, $scope.duplicateEvent.eventStartTime, $scope.duplicateEvent.eventEndDate, $scope.duplicateEvent.eventEndTime, 'duplicateEventForm', 'endDate');
                                    }
                                }
                            }
                        }
                    },
                    mobileOptions: {
                        pickerClasses: 'pa-datepicker', //angular-daterangepicker extra
                        applyButtonClasses: 'md-button pa-pink-button pa-font-bold pa-modal-font pa-height-34',
                        cancelButtonClasses: 'pa-color-pink pa-modal-font',
                        clearable: true,
                        showCustomRangeLabel: false,
                        timePicker: false,
                        locale: {
                            applyLabel: "Done",
                            clearLabel: 'Reset',
                            cancelLabel: 'Reset',
                            separator: ' - ',
                            format: "MMM DD, YYYY"
                        },
                        'hide.daterangepicker': function(event, picker) {
                            $scope.navigate('createnewevent');
                        },
                        eventHandlers: {
                            'cancel.daterangepicker': function(event, picker) {
                                $scope.navigate('createnewevent');
                            },
                            'apply.daterangepicker': function(event, picker) {
                                $scope.duplicateEvent.eventStartDate = $scope.dropdowns.startDateRangePicker.selectedDate.startDate;
                                let currentSelectedDate = moment($scope.duplicateEvent.eventStartDate).format("DD:MM:YYYY");
                                if (currentSelectedDate > currentDateDuplicate) {
                                    $scope.currentDateDuplicate = false;
                                    $scope.currentDateEndDuplicate = false;
                                } else {
                                    $scope.currentDateDuplicate = true;
                                    $scope.currentDateEndDuplicate = true;
                                }
                                $scope.duplicateEvent.eventEndDate = $scope.dropdowns.startDateRangePicker.selectedDate.endDate;
                                $scope.duplicateEvent.startDateInString = $scope.duplicateEvent.eventStartDate.format('ddd, MMM DD, YYYY');
                                $scope.navigate('createnewevent');
                                $scope.validateTime($scope.duplicateEvent.eventStartDate, $scope.duplicateEvent.eventStartTime, $scope.duplicateEvent.eventEndDate, $scope.duplicateEvent.eventEndTime, 'duplicateEventForm', 'startDate');
                            }
                        }
                    }
                },
                endDateRangePicker: {
                    minDate: moment().utc(),
                    options: {
                        parentEl: '.date-picker-end',
                        drops: "up",
                        pickerClasses: 'custom-display', //angular-daterangepicker extra
                        buttonClasses: 'btn',
                        applyButtonClasses: 'btn-primary',
                        cancelButtonClasses: 'btn-danger',
                        singleDatePicker: true,
                        showCustomRangeLabel: false,
                        timePicker: false,
                        locale: {
                            applyLabel: "Apply",
                            cancelLabel: 'Cancel',
                            separator: ' - ',
                            format: "MMM DD, YYYY"
                        },
                        selectedDate: {
                            startDate: moment.utc(),
                            endDate: moment.utc()
                        },
                        eventHandlers: {
                            'apply.daterangepicker': function(event, picker) {
                                //check event source
                                let sourceId = event.picker.element[0].id;

                                if (sourceId == "ticketSaleEndDate") { //ticket
                                    angular.element('#ticketSaleEndDate').val(($scope.duplicateEvent.tickets.saleEndDate.date).format("MMM, DD YYYY"));
                                    $scope.validateTime($scope.duplicateEvent.tickets.saleStartDate.date, $scope.duplicateEvent.tickets.saleStartDate.time, $scope.duplicateEvent.tickets.saleEndDate.date, $scope.duplicateEvent.tickets.saleEndDate.time, 'createEventForms.create_event_form_admissions_3', 'saleendDate');
                                } else { //event
                                    let currentSelectedDate = moment($scope.duplicateEvent.eventEndDate).format("DD:MM:YYYY");
                                    if (currentSelectedDate > currentDateDuplicate) {
                                        $scope.currentDateEndDuplicate = false;
                                    } else {
                                        $scope.currentDateEndDuplicate = true;
                                    }
                                    angular.element('#eventEndDate').val(($scope.duplicateEvent.eventEndDate).format("MMM DD, YYYY"));
                                    $scope.duplicateEvent.startDateInString = $scope.duplicateEvent.eventStartDate.format('ddd, MMM DD, YYYY');
                                    $scope.validateTime($scope.duplicateEvent.eventStartDate, $scope.duplicateEvent.eventStartTime, $scope.duplicateEvent.eventEndDate, $scope.duplicateEvent.eventEndTime, 'duplicateEventForm', 'endDate');
                                }
                            }
                        }
                    }
                },
                times: {
                    options: config.GLOBAL_TIMES
                }
            };

            apiService.getEventCategories().then((response) => {
                if (response.status == 200) {
                    let data = response.data;
                    if (data.success) {
                        angular.forEach(data.data, function(value) {
                            $scope.categoriesMap[value.slug] = value;
                        });
                    }
                }
            });

            const selectTabFromQuery = function() {
                let queryStringObject = $location.hash();
                if (queryStringObject && Object.keys($scope.tabs).includes(queryStringObject)) {
                    $scope.reloadWithTabSelect = true;
                    $scope.selectTab($scope.tabs[queryStringObject]);
                }
            };

            $scope.getCatName = function(nameKey, myArray) {
                for (var i = 0; i < myArray.length; i++) {
                    if (myArray[i].slug === nameKey) {
                        return myArray[i];
                    }
                }
            };

            $scope.updateEventList = (value, tab) => {
                $scope.tabs[tab.id].currentPage = value;
                $scope.selectTab(tab, true);
            };

            $scope.selectTab = function(tab, refresh) {
                $scope.selectedTab = tab.id;
                $location.hash($scope.selectedTab);
                if (tab.id == 'liveevents') {
                    if (refresh) {
                        $scope.loading = true;
                    }
                    eventsService.getEventsByStatus({ "status": "live", "page": $scope.tabs.liveevents.currentPage, "limit": 10, 'zone_id': $scope.zoneSelectedId }).then((response) => {
                        if (response.data) {
                            $scope.tabs.liveevents.events = orderBy(response.data, 'start_date_time_ms', true);
                        }
                        $scope.tabs.liveevents.pageLength = response.total;
                        $scope.liveEventsList = $scope.tabs.liveevents.events;
                        let currentDate = moment.utc().format("YYYY-MM-DD HH:mm:ss");
                        let startDate = [];
                        $scope.eventObj = [];
                        $scope.eventPromotion = [];
                        let requireDate = moment.utc().add(2, "days").format("YYYY-MM-DD HH:mm:ss");
                        $scope.tabs.liveevents.events.forEach(p => {
                            startDate = p.start_date_utc;
                            if (currentDate < startDate) {
                                $scope.eventObj[p.event_id] = true;
                            } else {
                                $scope.eventObj[p.event_id] = false;
                            }

                            if (requireDate < startDate) {
                                $scope.eventPromotion[p.event_id] = true;
                            } else {
                                $scope.eventPromotion[p.event_id] = false;
                            }
                        });
                        if ($scope.tabs.liveevents.events.length === 0) {
                            $scope.noEventUIShow = true;
                        }
                    }).finally(() => {
                        $scope.loading = false;
                    });
                }

                if (tab.id == 'draft') {
                    if (refresh) {
                        $scope.loading = true;
                    }
                    eventsService.getEventsByStatus({ "status": "draft", "page": $scope.tabs.draft.currentPage, "limit": 10, 'zone_id': $scope.zoneSelectedId }).then((response) => {
                        if (response.data) {
                            $scope.tabs.draft.events = orderBy(response.data, 'start_date_time_ms', true);
                        }
                        $scope.tabs.draft.pageLength = response.total;
                        if ($scope.tabs.draft.events.length === 0) {
                            $scope.noEventUIShow = true;
                        }
                    }).finally(() => {
                        $scope.loading = false;
                    });
                }

                if (tab.id == 'closedevents') {
                    if (refresh) {
                        $scope.loading = true;
                    }
                    eventsService.getEventsByStatus({ "status": "closed", "page": $scope.tabs.closedevents.currentPage, "limit": 10, 'zone_id': $scope.zoneSelectedId }).then((response) => {
                        if (response.data) {
                            $scope.tabs.closedevents.events = orderBy(response.data, 'start_date_time_ms', true);
                        }
                        $scope.tabs.closedevents.pageLength = response.total;
                        if ($scope.tabs.closedevents.events.length === 0) {
                            $scope.noEventUIShow = true;
                        }
                    }).finally(() => {
                        $scope.loading = false;
                    });
                }
            };

            $scope.selectTabById = function(id) {
                $scope.tabs.liveevents.events = [];
                $scope.tabs.draft.events = [];
                $scope.tabs.closedevents.events = [];
                $scope.loading = true;
                for (let tabid of Object.keys($scope.tabs)) {
                    if (tabid === id) {
                        $scope.selectTab($scope.tabs[tabid], false);
                    }
                }
                Utils.applyChanges($scope);
            };

            // This method is used to update event status as active/inactive
            $scope.updateEventStatus = function(event) {
                let state = 'inactive';
                if ('state' in event && event.state === 'inactive') {
                    state = 'active';
                }
                eventsService.editEvent(event.id, {
                        state: state
                    })
                    .then((response) => {
                        event.state = state;
                        Utils.removeEventsFromLocal($window);
                        Utils.applyChanges($scope);
                    });
            };

            $scope.calculatePendingTickets = function(userTicketsResponse, tabType) {
                for (let event of $scope.tabs[tabType].events) {
                    let filteredArray = [];
                    for (let u of userTicketsResponse) {
                        if ((u.event_id == event.id) && (u.event_status == 'pending')) {
                            filteredArray.push(u);
                        }
                    }

                    event.pendingTickets = 0;
                    if (filteredArray.length > 0) {
                        for (let p of filteredArray) {
                            p.tickets = JSON.parse(p.tickets);
                            for (let t of p.tickets) {
                                if ("quantity" in t) {
                                    event.pendingTickets += t.quantity;
                                }
                            }
                        }
                    }
                }
            };

            $scope.setPendingTickets = function(tabType) {
                if ($scope.tabs[tabType].events.length != 0) {
                    let event_ids = [];
                    for (let event of $scope.tabs[tabType].events) {
                        event_ids.push(event.id);
                    }
                    $scope.loading = true;
                    eventsService.getEventsTickets(event_ids)
                        .then((userTicketsResponse) => {
                            if (userTicketsResponse && userTicketsResponse.length > 0) {
                                $scope.calculatePendingTickets(userTicketsResponse, tabType);
                            }
                            $scope.loading = false;
                            Utils.applyChanges($scope);
                        });
                }
            };

            $scope.openEmbedModal = function(event) {
                let modalScope = $scope.$new(true);
                modalScope.event = event;
                modalScope.user_id = $scope.user.user_id;
                let modalInstance = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../partials/embedMapModal.html',
                    controller: 'EmbedModalController',
                    controllerAs: 'plm',
                    scope: modalScope
                });

                modalInstance.result.then(function(selectedItem) {}, function() {});
            };

            $scope.getEventsTicketsQuantities = function(tabType) {
                $scope.tabs[tabType].events.map((ev) => {
                    ev.totalQuantity = 0;
                    ev.soldQuantity = 0;
                    ev.remaining_qty = 0;
                    if (ev.ticket_type && ev.ticket_type == 'paid' && ev.tickets && ev.tickets_list.length > 0) {
                        for (let t of ev.tickets_list) {
                            if (t.quantity && t.remaining_qty) {
                                ev.totalQuantity += t.quantity;
                                ev.remaining_qty += t.remaining_qty;
                            } else if (t.quantity) {
                                ev.totalQuantity += t.quantity;
                            }
                        }
                        ev.soldQuantity = (ev.totalQuantity - ev.remaining_qty);
                    }
                    return ev;
                });
            };

            const filterByDate = function(array) {
                return array.filter((ev) => {
                    return Utils.dateRange(ev, $scope.filterDateFrom, $scope.filterDateTo, 'ms', 'end_date_time_ms');
                });
            };

            let removeEventDuplicates = (tabType) => {
                $scope.tabs[tabType].events = Array.from(new Set($scope.tabs[tabType].events.map(a => a.id))).map(id => {
                    return $scope.tabs[tabType].events.find(a => a.id === id);
                });
            };

            $scope.$on('paypalUpdated', function(event, value) {
                if (value && 'paypal_email' in value) {
                    $scope.user.paypal_email = value.paypal_email;
                }
            });

            $scope.close = function() {
                this.$close('close');
            };

            $scope.ticketApprovedModal = function() {
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.claimEvent = false;

                let modalInstance = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/ticketApprovedModal.html',
                    openedClass: 'pa-create-event-modal pa-common-modal-style',
                    scope: eventModelScope,
                    size: ''

                });
            };

            $scope.setEventsStatistics = function() {
                $scope.numberOfTotalAvailableEvents = $scope.plans.filter((plan) => (plan.id == 'basic'))[0].ticketedevents;
                eventsService.getAllPaidEventsCount()
                    .then((response) => {
                        if (response && response > 0) {
                            $scope.numberOfCreatedEvents = response;
                        } else {
                            $scope.numberOfCreatedEvents = 0;
                        }
                        Utils.applyChanges($scope);
                    });
            };

            $scope.getPlan = function() {
                if (authService.getSession() && $scope.user) {
                    $scope.currentPlanId = $scope.user.selectedPlan.id;
                    if ($scope.currentPlanId == 'basic') {
                        $scope.setEventsStatistics();
                    }
                } else {
                    $location.path('/login');
                }
            };

            $scope.cancel = function() {
                this.$dismiss('close');
            };

            $scope.publisUnpublishEvent = function(status, event_id, unpublishReason) {
                let token = authService.get('token');
                if (status === 'active') {
                    apiService.publishEventStatus(token, event_id).then((response) => {
                        if (response.status == 200) {
                            let data = response.data;
                            if (data.success) {
                                let notify = {
                                    type: 'success',
                                    title: 'Success!',
                                    content: "Event published successfully!",
                                    timeout: 5000 //time in ms
                                };
                                $scope.$emit('notify', notify);
                                window.location.href = `/manageevent#draft`;
                                $window.location.reload();
                            } else {
                                let notify = {
                                    type: 'error',
                                    title: 'OOPS!!',
                                    content: data.message,
                                    timeout: 5000 //time in ms
                                };
                                $scope.$emit('notify', notify);
                            }
                        }
                    }).catch(err => {
                        let content = "Sorry something went wrong. Please try later.";
                        if (err.data && 'message' in err.data) {
                            content = err.data.message;
                        }
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: content,
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                    }).finally(() => {});
                } else {
                    apiService.cancelEvent(token, event_id, unpublishReason).then((response) => {
                        if (response.status == 200) {
                            let data = response.data;
                            if (data.success) {
                                let notify = {
                                    type: 'success',
                                    title: 'Success!',
                                    content: data.message,
                                    timeout: 5000 //time in ms
                                };
                                $scope.$emit('notify', notify);
                                $window.location.reload();
                            } else {
                                let notify = {
                                    type: 'error',
                                    title: 'OOPS!!',
                                    content: data.message,
                                    timeout: 5000 //time in ms
                                };
                                $scope.$emit('notify', notify);
                            }
                        }
                    }).catch(err => {
                        let content = "Sorry something went wrong. Please try later.";
                        if (err.data && 'message' in err.data) {
                            content = err.data.message;
                        }
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: content,
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                    }).finally(() => {});
                }
            };

            $scope.unpublishEventModel = function(event_id) {
                $scope.event_id = event_id;
                $scope.unpublishReason = "";
                let eventModelScope = $scope.$new(false, $scope);

                let modalInstance = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/eventUnpublisModal.html',
                    openedClass: 'pa-create-event-modal pa-common-modal-style',
                    scope: eventModelScope,
                    size: ''
                });
            };

            $scope.startStopEvent = function(status, event_id, ticket_type) {
                if (status == 'stop' && ticket_type == 'paid') {
                    $scope.unpublishEventModel(event_id);
                } else {
                    $scope.publisUnpublishEvent(status, event_id, 'Free Events');
                }
            };

            $scope.goToAccountsPage = function() {
                $location.path('/account_history');
            };

            /*
             ** Choose Widget Modal
             */

            $scope.chooseWidgetType = function(event_id) {
                let eventModelScope = $scope.$new(false, $scope);
                $scope.selectedEventId = event_id;
                $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/chooseWidgetType.html',
                    openedClass: 'pa-create-event-modal freeEventTickets popup_wtd_700 chooseWidgetType selectSingleEvent scroll_popup',
                    scope: eventModelScope,
                    backdrop: 'static',
                    size: 'md'
                });
            };

            /*
             ** Reset Modal Function
             */
            $scope.resetModal = () => {
                $scope.chooseOptionFlag = true;
                $scope.optionDisableFlag = true;
                $scope.eventListFlag = false;
                $scope.organiserInfoFlag = false;
                $scope.eventMultiListFlag = false;
                $scope.backFromListFlag = false;
                $scope.selectedOption = '';
                $scope.selectedEventlist = '';
                $scope.modalHeaderTextFlag = {
                    step1: true,
                    complete1: false,
                    step2: false,
                    complete2: false,
                    step3: false,
                    complete3: false,
                    final: false,
                    complete4: false,
                };
                $scope.modalSteps = 'steps1';
                $scope.eventSelection = 'single';
                $scope.organiser = {
                    image: '',
                    websiteName: '',
                    websiteURL: '',
                    croppedImage: ''
                };
            };

            /*
             ** ChooseSelected Function
             */
            $scope.optionSelected = (optionVale) => {
                $scope.optionDisableFlag = false;

                if (optionVale === 'button') {
                    $scope.selectedOption = "buttonView";
                } else if (optionVale === 'details') {
                    $scope.selectedOption = "detailView";
                } else if (optionVale === 'lists') {
                    $scope.selectedOption = "listView";
                } else if (optionVale === 'map') {
                    $scope.selectedOption = "mapView";
                }
            };

            /*
             ** Choosed Option Function
             */
            $scope.chooseOption = (stepsValue, selectedlist) => {
                if (stepsValue === 'steps1') {
                    if (selectedlist === 'listView' || selectedlist === 'mapView') {
                        $scope.eventSelection = 'multi';
                    } else {
                        $scope.eventSelection = 'single';
                    }
                    $scope.modalHeaderTextFlag.complete1 = true;
                    $scope.modalHeaderTextFlag.step2 = true;
                    $scope.eventListFlag = true;
                    $scope.backFromListFlag = true;
                    $scope.optionDisableFlag = true;
                    $scope.chooseOptionFlag = false;
                    $scope.selectedOption = selectedlist;
                    if ($scope.organiserInfosFlag) {
                        $scope.modalSteps = "step2";
                    } else {
                        $scope.modalSteps = "final";
                    }

                    if ($scope.eventSelection == 'multi') {
                        $scope.selectedEventlist = "";
                        for (let s of $scope.liveEventsList) {
                            if (s.selected) {
                                $scope.optionDisableFlag = false;
                            } else {
                                $scope.optionDisableFlag = true;
                            }
                        }
                        if ($scope.selectedEventId != "") {
                            $scope.selecteEventFromList($scope.eventSelection, $scope.selectedEventId);
                        }
                    } else {
                        if ($scope.selectedEventId != "") {
                            $scope.selecteEventFromList($scope.eventSelection, $scope.selectedEventId);
                        }
                        for (let s of $scope.liveEventsList) {
                            if (s.selected) {
                                s.selected = false;
                            } else {
                                s.selected = false;
                            }
                        }
                        if ($scope.selectedEventlist) {
                            $scope.optionDisableFlag = false;
                        } else {
                            $scope.optionDisableFlag = true;
                        }
                    }
                } else if (stepsValue === 'step2') {
                    $scope.modalHeaderTextFlag.complete2 = true;
                    $scope.modalHeaderTextFlag.step3 = true;
                    $scope.chooseOptionFlag = false;
                    $scope.eventListFlag = false;
                    $scope.backFromListFlag = true;
                    $scope.optionDisableFlag = true;
                    $scope.organiserInfoFlag = true;
                    $scope.selectedOption = selectedlist;
                    $scope.modalSteps = "final";
                } else if (stepsValue === 'back') {
                    if (!$scope.organiserInfosFlag) {
                        $scope.modalSteps = "step1";
                    }
                    if ($scope.modalSteps === 'final') {
                        $scope.eventSelection = 'single';
                        $scope.eventListFlag = true;
                        $scope.backFromListFlag = true;
                        $scope.optionDisableFlag = false;
                        $scope.organiserInfoFlag = false;
                        $scope.chooseOptionFlag = false;
                        $scope.modalSteps = "steps1";
                        $scope.selectedOption = selectedlist;
                        if ($scope.organiserInfosFlag) {
                            $scope.modalHeaderTextFlag.complete2 = false;
                            $scope.modalHeaderTextFlag.step3 = false;
                        }
                    } else {
                        $scope.eventSelection = 'single';
                        $scope.eventListFlag = false;
                        $scope.backFromListFlag = false;
                        $scope.optionDisableFlag = false;
                        $scope.organiserInfoFlag = false;
                        $scope.chooseOptionFlag = true;
                        $scope.selectedOption = selectedlist;
                        $scope.modalSteps = "steps1";
                        $scope.modalHeaderTextFlag.complete1 = false;
                        $scope.modalHeaderTextFlag.step2 = false;
                    }
                } else if (stepsValue === 'final') {
                    $scope.modalHeaderTextFlag.final = true;
                    let promise = null;
                    if ($scope.organiserInfosFlag) {
                        $scope.loading = true;
                        $scope.loadingMessage = "Saving Organiser Details...";
                        let token = authService.get('token');
                        let data = {
                            "website_name": $scope.organiser.websiteName,
                            "url": $scope.organiser.websiteURL
                        };
                        promise = awsService.post('/profile/update', data, token);
                        return promise.then((res) => {
                            let fileName = $scope.user.user_id + '-org-' + Date.now() + '.png';
                            let blob = dataURItoBlob($scope.organiser.image);
                            let file = new File([blob], fileName);
                            let aws_config = {
                                'bucket': config.AWS_BUCKET,
                                'access_key': config.AWS_ACCESS_KEY,
                                'secret_key': config.AWS_SECRET_KEY,
                                'region': config.AWS_REGION,
                                'path': config.ORG_LOGO_UPLOAD_FOLDER,
                                'img_show_url': config.AWS_IMG_SHOW_URL,
                            };
                            return eventsService.uploadImg(file, aws_config);
                        }).then((response) => {
                            let data = {
                                "logo": response.file_url,
                            };
                            awsService.post('/profile/update', data, token).then((response) => {
                                let data = response;
                                $window.localStorage.setItem('user', JSON.stringify(data.data));
                                if (data.success) {
                                    let notify = {
                                        type: 'success',
                                        title: 'Success!',
                                        content: data.message,
                                        timeout: 5000 //time in ms
                                    };
                                    $scope.$emit('notify', notify);
                                } else {
                                    let notify = {
                                        type: 'error',
                                        title: 'OOPS!!',
                                        content: data.message,
                                        timeout: 5000 //time in ms
                                    };
                                    $scope.$emit('notify', notify);
                                }
                            });
                        }).catch((error) => {
                            $scope.loading = false;
                            let content = "Sorry something went wrong. Please try later.";
                            if (error.data && 'message' in error.data) {
                                content = error.data.message;
                            }
                            let notify = {
                                type: 'error',
                                title: 'OOPS!!',
                                content: content,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                        }).finally(() => {
                            $scope.loading = false;
                            $scope.modalHeaderTextFlag.complete3 = true;
                            $scope.modalHeaderTextFlag.complete4 = true;
                            $scope.modalHeaderTextFlag.step4 = true;
                            window.location.href = `/embedWidget?event=${$scope.events}&eventType=${$scope.eventSelection}&option=${selectedlist}`;
                        });
                    } else {
                        $scope.loading = true;
                        $scope.loadingMessage = "Saving Details...";
                        $scope.modalHeaderTextFlag.complete2 = true;
                        $scope.modalHeaderTextFlag.complete4 = true;
                        $scope.modalHeaderTextFlag.step4 = true;
                        setTimeout(function() {
                            window.location.href = `/embedWidget?event=${$scope.events}&eventType=${$scope.eventSelection}&option=${selectedlist}`;
                        }, 3000);
                    }
                }
            };

            /*
             ** Select Event Single / Multiple Function
             */
            let valuesData = [];
            $scope.selecteEventFromList = (type, valueId) => {
                let oHeader = {
                    alg: 'HS256',
                    typ: 'JWT'
                };
                let valueFlag = true;
                let sHeader = JSON.stringify(oHeader);
                if (type === 'single') {
                    $scope.selectedEventlist = valueId;
                    $scope.optionDisableFlag = false;
                    let dataId = {
                        eventId: valueId
                    };
                    let sEventIds = JSON.stringify(dataId);
                    $scope.events = KJUR.jws.JWS.sign("HS256", sHeader, sEventIds, config.JWT_SECRET);
                } else {
                    valuesData.forEach((data, index) => {
                        if (data === valueId) {
                            valueFlag = false;
                            valuesData.splice(index, 1);
                        } else {
                            valueFlag = true;
                        }
                    });
                    if (valueFlag) {
                        for (let s of $scope.liveEventsList) {
                            if (s.event_id === valueId) {
                                s.selected = true;
                                valuesData.push(s.event_id);
                            }
                        }
                    } else {
                        for (let s of $scope.liveEventsList) {
                            if (s.event_id === valueId) {
                                s.selected = false;
                            }
                        }
                    }
                    if (valuesData.length > 0) {
                        $scope.optionDisableFlag = false;
                    } else {
                        $scope.optionDisableFlag = true;
                    }
                    let dataIds = {
                        eventId: valuesData
                    };
                    let sEventValueIds = JSON.stringify(dataIds);
                    $scope.events = KJUR.jws.JWS.sign("HS256", sHeader, sEventValueIds, config.JWT_SECRET);
                    Utils.applyChanges($scope);
                }
            };

            /*
             **  Image Crop Area
             */
            $scope.handleFileSelect = function(files, evt, invalidFiles) {
                let file = files;
                if (file) {
                    let reader = new FileReader();
                    $scope.showHide.imageSelected = true;
                    reader.onload = function(evt) {
                        $scope.$apply(function($scope) {
                            $scope.imageForCropping = evt.target.result;
                            if (!$scope.showHide.isMobile.matches) {
                                $mdDialog.show({
                                        controller: ['$scope', '$mdDialog', 'imageForCropping', function($scope, $mdDialog, imageForCropping) {
                                            $scope.imageForCropping = imageForCropping;
                                            $scope.croppedImage = null;
                                            $scope.closeDialog = function(state) {
                                                $mdDialog.hide({ state: state, image: $scope.croppedImage });
                                            };
                                        }],
                                        templateUrl: 'cropImage.html',
                                        parent: angular.element(document.body),
                                        clickOutsideToClose: false,
                                        fullscreen: true,
                                        locals: {
                                            imageForCropping: $scope.imageForCropping
                                        },
                                        onShowing: function(scope, element) {
                                            element.addClass('pa-background-white');
                                        }
                                    })
                                    .then(function(state) {
                                        if (state.state === 'save') {
                                            $scope.organiser.croppedImage = state.image;
                                            $scope.setCroppedImageAsFinalImage();
                                        } else {
                                            $scope.discardCroppedImage();
                                        }
                                    }, function() {
                                        $scope.status = 'You cancelled the dialog.';
                                    });
                            }
                        });
                    };
                    reader.readAsDataURL(file);
                } else if (invalidFiles.length > 0) {
                    let err = invalidFiles.some(er => er.$error == "maxSize");
                    if (err) {
                        Utils.showError($scope, "Your file size should not be larger than 10MB.");
                    }
                    $scope.showHide.imageSelected = false;
                } else if ($scope.organiser.croppedImage) {
                    // this block is done to handle clicking on cancel in case of edit image
                    $scope.organiser.image = $scope.organiser.croppedImage;
                }
            };

            function dataURItoBlob(dataURI) {
                // convert base64/URLEncoded data component to raw binary data held in a string
                var byteString;
                if (dataURI.split(',')[0].indexOf('base64') >= 0)
                    byteString = atob(dataURI.split(',')[1]);
                else
                    byteString = unescape(dataURI.split(',')[1]);

                // separate out the mime component
                var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
                // write the bytes of the string to a typed array
                var ia = new Uint8Array(byteString.length);
                for (var i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }
                return new Blob([ia], {
                    type: mimeString
                });
            }

            $scope.setCroppedImageAsFinalImage = function($event) {
                if ($scope.showHide.imageSelected) {
                    $scope.imageForCropping = null;
                    $scope.organiser.image = $scope.organiser.croppedImage;
                    $scope.showHide.imageSelected = false;
                }
                if ($event) {
                    $event.preventDefault();
                }
            };

            $scope.discardCroppedImage = function($event) {
                $scope.showHide.imageSelected = false;
                $scope.organiser.image = "";
                $scope.organiser.croppedImage = null;
                $scope.imageForCropping = null;
                $event.preventDefault();
            };

            $scope.$watch('organiser.image', function() {
                $scope.buttonEnable();
            });
            $scope.$watch('organiser.websiteName', function() {
                $scope.buttonEnable();
            });
            $scope.$watch('organiser.websiteURL', function() {
                $scope.buttonEnable();
            });

            // This function called while user enter organiser info
            $scope.buttonEnable = () => {
                if (($scope.organiser.image != null && $scope.organiser.image != '') && ($scope.organiser.websiteURL != null && $scope.organiser.websiteURL != '') && ($scope.organiser.websiteName != null && $scope.organiser.websiteName != '')) {
                    $scope.optionDisableFlag = false;
                } else {
                    $scope.optionDisableFlag = true;
                }
            };

            // This function is called on click on edit image
            $scope.editImage = function(id) {
                angular.element('#' + id).click();
            };

            // This function is called on click on delete image
            $scope.deleteImage = function() {
                $scope.organiser.image = '';
                $scope.organiser.croppedImage = null;
            };

            // This function is called on click Add Promotion
            $scope.addPromotionRoute = (value) => {
                if ($scope.promotionGuidance == undefined) {
                    $cookies.put('promotionGuidance', true);
                }
                window.location.href = `/createreward/add/${value}`;
            };

            /*
             ** Delete Confirmation Modal
             */

            $scope.deleteEventConfirmation = function(event_id) {
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.eventId = event_id;
                $scope.confirmCancelTicketModel = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/deleteEventConfirmation.html',
                    openedClass: 'pa-create-event-modal add-link-modal ticket-popup-new-ui scroll_popup',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            /*
             ** Delete Event from list
             */
            $scope.deleteEvent = (event_id) => {
                $scope.loading = true;
                $scope.loadingMessage = "Deleting event please wait...!!";
                let token = authService.get('token');
                awsService.delete(`/event/delete/${event_id}`, token).then(res => {
                    if (res.success) {
                        let notify = {
                            type: 'success',
                            title: 'Success!',
                            content: res.message,
                            timeout: 1000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        $scope.loading = false;
                        setTimeout(function() {
                            $window.location.reload();
                            $window.location.href = `/manageevent#draft`;
                        }, 1100);
                    } else {
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: "Sorry something went wrong. Please try later.",
                            timeout: 5000 //time in ms
                        };
                        $scope.loading = false;
                        $scope.$emit('notify', notify);
                        Utils.applyChanges($scope);
                    }
                });
            };

            /*
             ** Publish Confirmation Modal
             */

            $scope.publishEventConfirmation = function(event_id) {
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.eventId = event_id;
                $scope.confirmPublishTicketModel = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/publishEventConfirmation.html',
                    openedClass: 'pa-create-event-modal add-link-modal ticket-popup-new-ui scroll_popup',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            $scope.publishTicketEventConfirmation = function(status, event_id, ticket_type) {
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.eventId = event_id;
                eventModelScope.status = status;
                eventModelScope.ticket_type = ticket_type;
                $scope.confirmPublishTicketModel = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/publishTicketEventConfirmation.html',
                    openedClass: 'pa-create-event-modal add-link-modal ticket-popup-new-ui scroll_popup',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            /*
             ** Publish Event from list
             */

            $scope.publishEvent = (event) => {
                $scope.loading = true;
                $scope.loadingMessage = "Publishing event please wait...!!";
                let event_id = event.event_id;
                let data = {
                    "is_draft": false,
                    "address": event.address,
                    "address_state": event.address_state,
                    "admission_ticket_type": event.admission_ticket_type,
                    "bank_id": event.bank_id,
                    "category": event.category,
                    "city": event.city,
                    "country": event.country,
                    "country_code": event.country_code,
                    "description": event.description,
                    "end_date_time": event.end_date_time,
                    "end_date_time_ms": event.end_date_time_ms,
                    "event_name": event.event_name,
                    "event_type": event.event_type,
                    "isPHQ": false,
                    "is_attendee_pick": event.is_attendee_pick,
                    "is_seating_layout": event.is_seating_layout,
                    "latitude": event.latitude,
                    "longitude": event.longitude,
                    "share_counter": event.share_counter,
                    "sponsored_event": event.sponsored_event,
                    "start_date_time": event.start_date_time,
                    "start_date_time_ms": event.start_date_time_ms,
                    "state": event.state,
                    "street_address": event.street_address,
                    "tickets": event.tickets_list,
                    "timezone": event.timezone,
                    "venue_is": event.venue_is,
                    "zipcode": event.zipcode,
                    "status": "active"
                };

                let token = authService.get('token');
                awsService.put(`/event/update/${event_id}`, data, token).then(res => {
                    if (res.success) {
                        let notify = {
                            type: 'success',
                            title: 'Success!',
                            content: "Events published successfully.",
                            timeout: 1000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        $scope.loading = false;
                        setTimeout(function() {
                            window.location.href = `/manageevent#draft`;
                            $window.location.reload();
                        }, 1100);
                    } else {
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: "Sorry something went wrong. Please try later.",
                            timeout: 5000 //time in ms
                        };
                        $scope.loading = false;
                        $scope.$emit('notify', notify);
                        Utils.applyChanges($scope);
                    }
                });
            };

            /*
             ** Event Organizer Zone List
             */
            $scope.organizerZoneLit = () => {
                let token = authService.get('token');
                apiService.userZoneList(token).then((response) => {
                    let zoneListOrg = [];
                    zoneListOrg.push(...response.data.data.data.organizer_zones);
                    zoneListOrg.push(...response.data.data.data.owner_zones);
                    let zoneOwner = response.data.data.data.owner_zones;
                    if (zoneOwner.length > 0) {
                        zoneOwner.forEach((data) => {
                            if (zoneListOrg.indexOf(data.zone_id) == -1) {
                                $scope.zoneListOrg.push(data);
                            }
                        });
                    } else {
                        $scope.zoneListOrg = zoneListOrg;
                    }
                }).catch((error) => {
                    $scope.loading = false;
                    let content = "Sorry something went wrong. Please try later.";
                    if (error.data && 'message' in error.data) {
                        content = error.data.message;
                    }
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: content,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                }).finally(() => {
                    $scope.loading = false;
                });
            };

            /*
             ** Get Zone Details
             */
            $scope.getZoneFilterData = (zoneId) => {
                $scope.zoneSelectedId = zoneId;
                $scope.tabs.liveevents.events = [];
                $scope.tabs.draft.events = [];
                $scope.tabs.closedevents.events = [];
                let tabId = 'liveevents';
                $scope.selectTab($scope.tabs[tabId], false);
            };

            /*
             **
             ** Duplicate Event Modal
             **
             */

            $scope.duplicateEventAction = function(event) {
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.event = event;
                eventModelScope.duplicateEvent.event_name = 'Copy of ' + event.event_name;
                eventModelScope.duplicateEvent.eventStartDate = moment();
                eventModelScope.duplicateEvent.eventStartTime = $scope.dropdowns.times.options[current_time_value].key;
                eventModelScope.duplicateEvent.eventEndDate = moment();
                eventModelScope.duplicateEvent.eventEndTime = $scope.dropdowns.times.options[22].key;
                $scope.duplicateEventModal = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/duplicateEventModal.html',
                    openedClass: 'pa-create-event-modal add-link-modal ticket-popup-new-ui duplicate-event scroll_popup',
                    scope: eventModelScope,
                    keyboard: false,
                    size: 'md'
                });
            };

            $scope.rePublishEventConfirmation = function(eventId, form) {
                $scope.duplicateEventModal.close();
                setTimeout(function() {
                    let eventModelScope = $scope.$new(false, $scope);
                    eventModelScope.eventId = eventId;
                    eventModelScope.formName = form;
                    $scope.rePublishEventConfirmationModel = $uibModal.open({
                        ariaLabelledBy: 'modal-title',
                        ariaDescribedBy: 'modal-body',
                        templateUrl: '../../partials/rePublishEventConfirmation.html',
                        openedClass: 'pa-create-event-modal add-link-modal ticket-popup-new-ui duplicate-event scroll_popup confirm-duplicate',
                        scope: eventModelScope,
                        keyboard: false,
                        size: 'md'
                    });
                }, 1000);
            };

            // This function is called on selection of time
            $scope.validateTime = function(eventStartDate, eventStartTime, eventEndDate, eventEndTime, formName, formField) {
                let startDate = eventStartDate.format("MM/DD/YYYY");
                let endDate = eventEndDate.format("MM/DD/YYYY");

                let startTime = moment(eventStartTime, 'hh:mma').format("HH:mm:ss");
                let endTime = moment(eventEndTime, 'hh:mma').format("HH:mm:ss");

                let date1 = new Date(startDate + ' ' + startTime);
                let date2 = new Date(endDate + ' ' + endTime);
                // To calculate the time difference of two dates 

                let Difference_In_Time = date2.getTime() - date1.getTime();
                if (Difference_In_Time <= 0) {
                    if (typeof $scope.createEventForms[formName] === 'undefined') {
                        if (typeof $scope.createEventForms[formName] !== 'undefined') {
                            $scope.createEventForms[formName].saleendDate.$setValidity('minDate', false);
                        }
                    } else {
                        $scope.createEventForms[formName][formField].$setValidity('minDate', false);
                        if (typeof $scope.createEventForms[formName].endDate !== 'undefined') {
                            $scope.createEventForms[formName].endDate.$setValidity('minDate', false);
                        }
                    }
                } else {
                    if (typeof $scope.createEventForms[formName] === 'undefined') {
                        if (typeof $scope.createEventForms[formName] !== 'undefined') {
                            $scope.createEventForms[formName].saleendDate.$setValidity('minDate', true);
                        }
                    } else {
                        $scope.createEventForms[formName][formField].$setValidity('minDate', true);
                        if (typeof $scope.createEventForms[formName].endDate !== 'undefined') {
                            $scope.createEventForms[formName].endDate.$setValidity('minDate', true);
                        }
                    }
                }
            };

            /*
             ** Duplicate Event from list
             */

            $scope.rePublishEvent = (eventId, form) => {
                $scope.loading = true;
                $scope.loadingMessage = "Duplicating event please wait...!!";
                if (!$scope.duplicateEvent.event_name) {
                    form.eventName.$invalid = true;
                    $scope.loading = false;
                    return false;
                }
                $scope.startDateTime = moment(moment($scope.duplicateEvent.eventStartDate).format('YYYY-MM-DD') + ' ' + $scope.duplicateEvent.eventStartTime, 'YYYY-MM-DD h:mma').format('YYYY-MM-DD HH:mm:ss');
                $scope.endDateTime = moment(moment($scope.duplicateEvent.eventEndDate).format('YYYY-MM-DD') + ' ' + $scope.duplicateEvent.eventEndTime, 'YYYY-MM-DD h:mma').format('YYYY-MM-DD HH:mm:ss');
                let data = {
                    "event_id": eventId,
                    "event_name": $scope.duplicateEvent.event_name,
                    "start_date_time": $scope.startDateTime,
                    "end_date_time": $scope.endDateTime
                };
                let token = authService.get('token');
                apiService.rePublishEvent(token, data).then(res => {
                    let response = res.data;
                    if (response.success) {
                        let notify = {
                            type: 'success',
                            title: 'Success!',
                            content: "Duplicate Event created successfully!",
                            timeout: 1000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        $scope.loading = false;
                        $scope.duplicateEventModal.close();
                        $scope.rePublishEventConfirmationModel.close();
                        setTimeout(function() {
                            window.location.href = `/manageevent`;
                            $window.location.reload();
                        }, 2000);
                    } else {
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: "Sorry something went wrong. Please try later.",
                            timeout: 5000 //time in ms
                        };
                        $scope.duplicateEventModal.close();
                        $scope.rePublishEventConfirmationModel.close();
                        $scope.loading = false;
                        $scope.$emit('notify', notify);
                        Utils.applyChanges($scope);
                    }
                });
            };

            /*
             ** Init Method
             */
            $scope.init = () => {

                $scope.loading = true;
                $scope.showHide.isMobile = window.matchMedia("only screen and (max-width: 1024px)");
                $scope.user = authService.getUser();
                let currentPath = $location.path();
                angular.element("body").removeClass("showFreeBanner");
                $scope.promotionGuidance = $cookies.get('promotionGuidance');
                $window.localStorage.setItem('currentPath', currentPath);
                if ($scope.showHide.isMobile) {
                    $scope.maxSize = 3;
                }

                /** Get User Info **/
                userService.getUserProfile($scope.user.user_id).then((response) => {
                    let userInfo = response.data.data;
                    if (userInfo.logo === ' ' || userInfo.url === ' ' || userInfo.website_name === ' ') {
                        $scope.organiserInfosFlag = true;
                        $scope.organiser.image = $scope.user.logo === ' ' ? '' : $scope.user.logo;
                        $scope.organiser.websiteURL = $scope.user.url === ' ' ? '' : $scope.user.url;
                        $scope.organiser.websiteName = $scope.user.website_name === ' ' ? '' : $scope.user.website_name;
                    } else if (userInfo.logo === '' || userInfo.url === '' || userInfo.website_name === '') {
                        $scope.organiserInfosFlag = true;
                        $scope.organiser.image = $scope.user.logo === ' ' ? '' : $scope.user.logo;
                        $scope.organiser.websiteURL = $scope.user.url === ' ' ? '' : $scope.user.url;
                        $scope.organiser.websiteName = $scope.user.website_name === ' ' ? '' : $scope.user.website_name;
                    } else {
                        $scope.organiserInfosFlag = false;
                    }
                    $scope.organizerZoneLit();
                    $scope.getPlan();
                });
                $scope.selectTabById('liveevents');
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

            $scope.init();
        }
    ]);