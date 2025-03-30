angular.module('PromoApp')
    .controller('EventOverviewController', ['$scope', 'authService', 'eventsService', 'apiService', 'phqservice', '$filter', 'config', '$uibModal', 'qbService', '$location', 'persistObject', 'awsService', 'followUser', '$rootScope', '$window', '$route', 'Utils', 'locationService', function($scope, authService, eventsService, apiService, phqservice, $filter, config, $uibModal, qbService, $location, persistObject, awsService, followUser, $rootScope, $window, $route, Utils, locationService) {

        $scope.user = authService.getUser();
        $scope.active = 0;
        $scope.forMacOnly = false;
        $scope.startDateTime = "";
        $scope.endDateTime = '';
        $scope.categoriesMap = config.CATEGORIES;
        let current_time_value = moment().add(1, 'hours').format('H');
        $scope.currentHour24 = moment().add(1, 'hours').format('H');
        $scope.currentDateDuplicate = true;
        $scope.currentDateEndDuplicate = true;
        let currentDateDuplicate = moment().format("DD:MM:YYYY");
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
        $scope.rebuildSlide = function() {
            var width = $(window).width();
            if (width >= 768 && width <= 992) {
                // desktop
                $scope.limitTitle = 38;
                $scope.limitDesc = 50;
            } else if (width > 992) {
                $scope.limitTitle = 60;
                $scope.limitDesc = 70;
            } else if (width >= 480 && width < 768) {
                // phone
                $scope.limitTitle = 80;
                $scope.limitDesc = 130;
            } else if (width < 480) {
                $scope.limitTitle = 60;
                $scope.limitDesc = 90;
            } else if (width < 400) {
                $scope.limitTitle = 80;
                $scope.limitDesc = 120;
            } else {
                $scope.limitTitle = 65;
                $scope.limitDesc = 85;
            }
        };

        angular.element($window).bind('resize', function() {
            // don't forget manually trigger $digest()
            $scope.rebuildSlide();
        });

        $scope.rebuildSlide();

        $scope.goToPage = function(page) {
            let urlEvent = page.replace(/\s+/g, '-').toLowerCase();
            $window.location.href = urlEvent;
        };

        $scope.sliderClick = function(direction) {
            if (direction == 'prev') {
                $('#myCarousel' + $scope.event.id).carousel('prev');
            } else {
                $('#myCarousel' + $scope.event.id).carousel('next');
            }
        };
        $scope.editEvent = function($event) {
            $event.stopPropagation();
            // Check if mobile then show can't edit
            if (Utils.isMobile()) {
                let actionOnlyScope = $scope.$new(true);
                actionOnlyScope.title = 'Edit Event';
                actionOnlyScope.description = 'You can only edit the event on your desktop';
                let modalInstance = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../partials/actionOnlyWebModal.html',
                    scope: actionOnlyScope,
                    controller: ['$scope', function($scope) {
                        $scope.cancel = function() {
                            this.$dismiss({});
                        };
                    }]
                });

                modalInstance.result.then(function(selectedItem) {
                    console.log('Map modal closed');
                }, function() {
                    console.log('Modal dismissed at: ' + new Date());
                });
            } else {
                window.location.href = `/events/${$scope.event.id}/edit`;
            }
        };
        /******To change the image resolution according to static pexels *******/
        $scope.changeImagesOnLoad = function() {
            //alert($scope.event.imageUrl);
            let imageUrl = $scope.event.image_url;
            if (imageUrl) {
                $scope.event.image_url = imageUrl.replace("w=1700", "w=1200");
            } else if ($scope.event.imageUrl) {
                $scope.event.image_url = $scope.event.imageUrl;
            } else {
                $scope.event.image_url = '../img/unnamed.png';
            }
        };

        $scope.openEventMarkerModal = function(event) {

            // let openedModal = $uibModalStack.getTop();

            let mapShareScope = $scope.$new(true);
            mapShareScope.eventMarkerForModal = event;
            let modalInstance = $uibModal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: '../partials/mapModal.html',
                controller: 'mapModalController',
                controllerAs: 'edmc',
                scope: mapShareScope

            });

            modalInstance.result.then(function(selectedItem) {
                console.log('Map modal closed');
            }, function() {
                console.log('Modal dismissed at: ' + new Date());
            });

        };

        //close modals
        $scope.cancel = function() {
            this.$dismiss('close');
        };

        let styleForMacOnly = () => {
            if (navigator.userAgent.indexOf('Mac OS X') != -1) {
                $("body").addClass("mac");
                $scope.forMacOnly = true;
            }

        };

        const applyChanges = function() {
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        };

        $scope.eventInView = function(index, inview, inviewInfo) {
            // Check if location is not present then get location
            if (!('address' in $scope.event && $scope.event.address)) {
                eventsService.updateLocationOfEvent($scope.event)
                    .then((address) => {
                        if (address) {
                            eventsService.updateEventInCache($scope.event);
                        }
                        applyChanges();
                    });
            }

            if ($scope.event.image_url == "" && $scope.event.event_image == "") {
                eventsService.updateImageOfEvent($scope.event)
                    .then((event_image) => {
                        if (event_image) {
                            eventsService.updateEventInCache($scope.event);
                        }
                        applyChanges();
                    });
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
                        window.location.href = `/manageevent`;
                        $window.location.reload();
                    }, 2000);
                } else {
                    $scope.loading = false;
                    $scope.duplicateEventModal.close();
                    $scope.rePublishEventConfirmationModel.close();
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: "Sorry something went wrong. Please try later.",
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    Utils.applyChanges($scope);
                }
            });
        };

        let init = () => {
            styleForMacOnly();
            $scope.changeImagesOnLoad();
            let eventAdmins = [];

            if ($scope.event.claimed_by) {
                $scope.event.claimed_by = parseInt($scope.event.claimed_by);
            }
            // Check if user has rights to edit/delete
            if ($scope.user && ($scope.event.user_id == $scope.user.user_id || ($scope.event.claimed_by && ($scope.event.claimed_by == $scope.user.user_id)) || (eventAdmins.includes($scope.user.user_id)))) {
                $scope.event.allowEditing = true;
            }
        };

        init();
    }]);