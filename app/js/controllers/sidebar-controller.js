angular.module('PromoApp')
    .controller('sidebarController', ['$scope', 'metaTagsService', 'authService', 'eventsService', 'apiService', '$route', '$uibModal', '$window', 'config', 'dataTransfer', 'Utils', function($scope, metaTagsService, authService, eventsService, apiService, $route, $uibModal, $window, config, dataTransfer, Utils) {
        /*
         **
         ** Global Variable / functions 
         **
         */
        $scope.loading = false;
        $scope.forMacOnly = false;
        $scope.user = authService.getUser();
        $scope.eventID = '';
        $scope.currentHour24 = moment().add(1, 'hours').format('H');
        $scope.currentDateDuplicate = true;
        $scope.currentDateEndDuplicate = true;
        let currentDateDuplicate = moment().format("DD:MM:YYYY");
        let current_time_value = moment().add(1, 'hours').format('H');
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
        $scope.dropdowns = {
            startDateRangePicker: {
                minDate: moment(),
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
                            $scope.saveDataLocal();
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
                            let currentSelectedDate = moment($scope.duplicateEvent.eventStartDate).format("DD:MM:YYYY");
                            if (currentSelectedDate > currentDateDuplicate) {
                                $scope.currentDateDuplicate = false;
                                $scope.currentDateEndDuplicate = false;
                            } else {
                                $scope.currentDateDuplicate = true;
                                $scope.currentDateEndDuplicate = true;
                            }
                            $scope.duplicateEvent.eventStartDate = $scope.dropdowns.startDateRangePicker.selectedDate.startDate;
                            $scope.duplicateEvent.eventEndDate = $scope.dropdowns.startDateRangePicker.selectedDate.endDate;
                            $scope.duplicateEvent.startDateInString = $scope.duplicateEvent.eventStartDate.format('ddd, MMM DD, YYYY');
                            $scope.navigate('createnewevent');
                            $scope.validateTime($scope.duplicateEvent.eventStartDate, $scope.duplicateEvent.eventStartTime, $scope.duplicateEvent.eventEndDate, $scope.duplicateEvent.eventEndTime, 'duplicateEventForm', 'startDate');
                        }
                    }
                }
            },
            endDateRangePicker: {
                minDate: moment(),
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

        /*
         **
         ** Page Active Selection
         **
         */
        $scope.isSelectedPage = (page, exact) => {
            if (location.href) {
                if (exact) {
                    return location.pathname == page;
                }
                
                return location.pathname.includes(page);
            }
            return false;
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
                        $scope.eventInfo = data.data;
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
                let notify = {
                    type: 'error',
                    title: 'OOPS!!',
                    content: err.data.message,
                    timeout: 5000 //time in ms
                };
                $scope.$emit('notify', notify);
                // This console is for error identify
                console.log(err);
            });
        };

        /*
         **
         ** Publish / Unpublish Event
         **
         */
        $scope.startStopEvent = function(status, event_id, ticket_type) {
            if (status == 'stop' && ticket_type == 'paid') {
                $scope.unpublishEventModel(event_id);
            } else {
                $scope.publisUnpublishEvent(status, event_id, 'Free Events');
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
            eventModelScope.duplicateEvent.eventStartTime = $scope.dropdowns.times.options[40].key;
            eventModelScope.duplicateEvent.eventEndDate = moment();
            eventModelScope.duplicateEvent.eventEndTime = $scope.dropdowns.times.options[88].key;
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

        $scope.cancel = function() {
            this.$dismiss('close');
        };

        /*
         **
         ** Duplicate Event from list
         **
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
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    $scope.loading = false;
                    $scope.duplicateEventModal.close();
                    $scope.rePublishEventConfirmationModel.close();
                    setTimeout(function() {
                        window.location.href = `/manageevent#draft`;
                        $window.location.reload();
                    }, 2000);
                } else {
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: "Sorry something went wrong. Please try later.",
                        timeout: 5000 //time in ms
                    };
                    $scope.loading = false;
                    $scope.duplicateEventModal.close();
                    $scope.rePublishEventConfirmationModel.close();
                    $scope.$emit('notify', notify);
                    Utils.applyChanges($scope);
                }
            });
        };

        /*
         **
         ** init function
         **
         */
        $scope.init = function() {

            /* Single Event Report */
            $scope.eventID = $route.current.params.ev;
            let eventScope = dataTransfer.getUserDetails();
            if (Object.keys(eventScope).length > 0) {
                $scope.eventInfo = eventScope.data;
                Utils.applyChanges($scope);
            } else {
                $scope.getEventDetails($scope.eventID);
            }

            let dataIds = {
                eventId: $scope.eventID
            };
            let sEventValueIds = JSON.stringify(dataIds);
            let oHeader = {
                alg: 'HS256',
                typ: 'JWT'
            };
            let sHeader = JSON.stringify(oHeader);
            $scope.events = KJUR.jws.JWS.sign("HS256", sHeader, sEventValueIds, config.JWT_SECRET);
            $scope.eventSelection = 'single';
            $scope.selectedOption = "buttonView";
            $scope.eventUrl = `event=${$scope.events}&eventType=${$scope.eventSelection}&option=${$scope.selectedOption}`;

            if ($scope.isSelectedPage('/basicDetails') || $scope.isSelectedPage('/eventDetails') || $scope.isSelectedPage('/adminssionsEvent') || $scope.isSelectedPage('/publishEvent')) {
                angular.element('.sidebar_panel').scrollTop(410);
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