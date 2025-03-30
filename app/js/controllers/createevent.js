angular.module('PromoApp')
    .controller('CreateEventController', ['Socialshare', '$rootScope', '$cookies', '$filter', '$scope', 'qbService', 'apiService', 'eventsService', '$timeout', 'userService', '$route', '$location', 'config', '$window', '$uibModal', 'authService', 'Utils', 'awsService', 'phqservice', '$mdDialog', 'locationService', 'followUser', 'stripeService', 'metaTagsService', 'dataTransfer',
        function(Socialshare, $rootScope, $cookies, $filter, $scope, qbService, apiService, eventsService, $timeout, userService, $route, $location, config, $window, $uibModal, authService, Utils, awsService, phqservice, $mdDialog, locationService, followUser, stripeService, metaTagsService, dataTransfer) {

            let confirmCancelTicketModel = '';
            $scope.today_date = moment.utc().format("DD");
            $scope.current_time = moment().add(1, 'hours').format('HH:00');
            let current_time_value = moment().add(1, 'hours').format('H');
            let current_time_value_plus_two = moment().add(2, 'hours').format('H');
            $scope.redirectFormStripe = false;
            $scope.buyer_total = 0;
            $scope.is_absorb = false;
            $scope.showCancel = true;
            $scope.sidebarBlock = false;
            $scope.categoryFlag = false;
            $scope.saveAfterStep1 = false;
            $scope.is_layoutView = true;
            $scope.pickSeatsDisabled = false;
            $scope.is_admissionType = false;
            $scope.reloadOnPage = true;
            $scope.designVenueRedirect = false;
            let tempRouteChange = false;
            $scope.service_fee = 0;
            $scope.processing_fee = 0;
            $scope.ticket_base_price = 0;
            $scope.countryCode = "+1";
            $scope.zoneId = $route.current.params.eventZone;
            $scope.fees = { "USD": { "Percent": 2.9, "Fixed": 0.49 } };
            $scope.stripe_client_id = config.STRIPE_CLIENT_ID;
            $scope.userBankList = [];
            $scope.defalutBank = {};
            $scope.oldTicketArr = [];
            $scope.oldUserArr = [];
            $scope.oldTicketIndex = 1;
            $scope.yellowBanner = false;
            $scope.oldUserIndex = 1;
            $scope.TicketCreateFlag = false;
            $scope.UserCreateFlag = false;
            $scope.categoriesMap = []; // JSON.parse(JSON.stringify(config.CATEGORIES));
            $scope.categories = {}; //Object.values($scope.categoriesMap);
            $scope.edit_image_url = '';
            $scope.progress = 0;
            $scope.loct = null;
            const stripe = Stripe(config.STRIPE_KEY);
            const elements = stripe.elements(Utils.stripeInitElements());
            $scope.createEventForms = {};
            $scope.user = null;
            $scope.userSession = authService.getSession();
            $scope.displayAdmins = [];
            $scope.selectedAdmins = [];
            $scope.existingSeatPlan = [];
            $scope.invitedList = [];
            $scope.existingSeatPlanFound = false;
            $scope.isCurrentUserEventAdmin = false;
            $scope.publishActionDisable = true;
            $scope.loading = false;
            $scope.guestCsvAvailable = false;
            $scope.loadingMessage = 'Saving event ..';
            $scope.draft_value = true;
            $scope.flashMessage = false;
            $scope.characters_count = 0;
            $scope.showHide = {
                imageSelected: false,
                searchVenueOptions: true,
                showChangePayPalSec: false,
                template: 'partials/basic-info.html', //basic-info.html
                ticketsfrm: true,
                selectedAddressDiv: false,
                editTicketIndex: -1,
                savingDraft: false,
                feedbackSection: false,
                isMobile: window.matchMedia("only screen and (max-width: 1024px)"),
                mobile: {
                    addlocation: false,
                    createnewevent: true,
                    addaddress: false,
                    inviteguests: false,
                    selectdates: false,
                    invitebyemail: false,
                    invitebyfollowers: false,
                    eventsuccess: false
                }
            };
            $scope.selectedFollowers = 0;
            $scope.popularCities = config.SEARCH_CITIES;
            $scope.feedback = {
                rating: '',
                comment: ''
            };
            $scope.minDate = moment.utc();
            $scope.minDateAddOne = moment.utc().add(1, "days");
            $scope.newtoday_date = moment.utc().add(2, "days");
            $scope.payPalUrl = config.PAYPAL_BASE_URL;
            const totalForms = 13;
            $scope.currentInfoSection = ['create_event_form_1']; // TODO remove  create_event_detail_1
            $scope.saveButtonText = 'Save & Continue';
            $scope.action = 'Create';
            $scope.backAction = "Create";
            $scope.designVenueAction = "";
            $scope.createEventSuccess = false;
            $scope.validationErrors = false;
            $scope.validateIsStepCompleted = false;
            $scope.userGuestList = null;
            $scope.userFollowers = null;
            $scope.adminList = "";
            $scope.ticked = true;
            $scope.selectedAdminData = "";
            $scope.addAdminLang = {
                selectAll: "Tick all",
                selectNone: "Select none",
                reset: "Undo all",
                search: "Type here to search...",
                nothingSelected: "Select Admin" //default-label is deprecated and replaced with this.
            };
            $scope.venueMapModal = '';
            $scope.clicked = false;
            $scope.freeEventTicketsModel = '';
            $scope.paidEventTicketsModel = '';
            $scope.seatMapCreated = false;
            $scope.totalTireCapcity = 0;
            $scope.ticketIndex = -1;
            $scope.layoutId = '';
            $scope.showTireTickeArr = [];
            $scope.buyer_total = [];
            $scope.guestUserFromList = [];
            $scope.guestUserList = [];
            $scope.isEventTicketSold = false;
            $scope.stripe_selected_country = 'US';
            $scope.forms = {};
            $scope.wantToSaveCard = true;
            $scope.currentSavedChecked = true;
            $scope.sponsoredPaymentDone = false;
            $scope.gatewayID = false;
            $scope.gateway = {};
            $scope.imageCropModalFlag = false;
            $scope.guestList = '';
            $scope.defaultTitle = 'Create New Event';
            $scope.addPromotionDisabled = true;
            $scope.accountDisablePay = true;
            $scope.cardDetails = {
                card: false,
                cvv: false,
                expiry: false
            };
            $scope.adminDisplayView = false;
            let cardBrandToPfClass = {
                'visa': 'fa-cc-visa',
                'mastercard': 'fa-cc-mastercard',
                'amex': 'fa-cc-amex',
                'discover': 'fa-cc-discover',
                'diners': 'fa-cc-diners-club',
                'jcb': 'fa-cc-jcb',
                'unknown': 'fa-credit-card',
            };
            $scope.sort_type = 'tire';
            $scope.ticketArrayWithTire = [];
            $scope.stripe_verification_status = '';
            $scope.stripe_message = '';
            $scope.stripe_link = '';
            $scope.deletedAdmin = [];
            $scope.newAddedAdmin = [];
            $scope.editorblur = false;
            $scope.currentStep = 1;
            $scope.zoneList = [];
            $scope.completedStep = [];
            $scope.publisClickCounter = 1;

            $scope.getTireById = function(tire_id) {
                let tire_info = {};
                angular.forEach($scope.displayEvent.layout_details.tiers, function (tire, tire_index) {
                    if (tire_id == tire.tier_id) {
                        tire_info = tire;
                    }
                });
                return tire_info;
            };

            $scope.createTicketArr = function () {
                $scope.ticketArrayWithTire = [];
                let ticket_group_id = '';
                let ticket_group_arr = [];
                let temp_ticket_group_arr = [];
                angular.forEach($scope.displayEvent.ticketsArr, function (ticket, index) {
                    if (ticket_group_id != ticket.local_tire_ticket_id) {
                        if (temp_ticket_group_arr.length > 0) {
                            ticket_group_arr.push(temp_ticket_group_arr);
                        }
                        temp_ticket_group_arr = [];
                        ticket_group_id = ticket.local_tire_ticket_id;
                        temp_ticket_group_arr.push(ticket);
                    } else {
                        temp_ticket_group_arr.push(ticket);
                    }

                    if ($scope.displayEvent.ticketsArr.length == (index + 1)) {
                        ticket_group_arr.push(temp_ticket_group_arr);
                    }

                });

                angular.forEach(ticket_group_arr, function (ticket_group, tg_index) {
                    let ticket_info = { tire: '' };
                    let tire_info = [];
                    let remQuantity_info = [];
                    let left = 0;
                    let temp_tire_info = {};
                    angular.forEach(ticket_group, function (ticket, t_index) {
                        ticket.tire_info = $scope.getTireById(ticket._tier_id);
                        remQuantity_info.push(ticket.remaining_qty);
                        ticket_info.name = ticket.ticket_name;
                        ticket_info.status = ticket.status;
                        ticket_info.quantity = ticket.quantity;
                    });


                    ticket_info.ticket = ticket_group;

                    ticket_info.ticket_select = false;
                    ticket_info.remaining_qty = Math.max.apply(null, remQuantity_info);
                    $scope.ticketArrayWithTire.push(ticket_info);
                });
            };

            $scope.checkTimeSlot = function (time) {
                let timeKey = 0;
                $scope.dropdowns.times.options.some(function (obj, key) {
                    if (obj.key == time) {
                        timeKey = key;
                    }
                });
                return timeKey;
            };

            $scope.upateTicketDefaultTime = function (displayEvent_start_date, displayEvent_start_time) {
                $scope.displayEvent.tickets.saleEndDate.date = displayEvent_start_date;
                let curr_time_key = $scope.checkTimeSlot(displayEvent_start_time);
                let next_time_key = 23;
                if (curr_time_key != 0) {
                    next_time_key = curr_time_key - 1;
                }
                $scope.displayEvent.tickets.saleEndDate.time = $scope.dropdowns.times.options[next_time_key].key;
                let startDate = moment($scope.displayEvent.tickets.saleStartDate.date).format('YYYY-MM-DD');
                let endDate = moment($scope.displayEvent.tickets.saleEndDate.date).format('YYYY-MM-DD');

                if (moment(startDate).isSameOrAfter(endDate)) {
                    $scope.displayEvent.tickets.saleStartDate.date = $scope.displayEvent.tickets.saleEndDate.date;
                    $scope.displayEvent.tickets.saleStartDate.time = $scope.displayEvent.tickets.saleEndDate.time;
                }

            };

            $(document).on('focus', '#ticketSaleEndDate', function() {
                angular.element('.drp-calendar.left').attr("style", "display:block");
            });

            $(document).on('focus', '#ticketSaleStartDate', function() {
                angular.element('.drp-calendar.left').attr("style", "display:block");
            });

            $(document).on('focus', '#eventEndDate', function() {
                angular.element('.drp-calendar.left').attr("style", "display:block");
            });

            $(document).on('focus', '#eventStartDate', function() {
                angular.element('.drp-calendar.left').attr("style", "display:block");
            });
            $scope.dropdowns = {
                totalGuests: 2,
                guestsEmails: [],
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
                        drops: "up",
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
                        'show.daterangepicker': function (event, picker) {
                            $scope.showHide.mobile.selectdates = true;
                        },
                        'hide.daterangepicker': function (event, picker) {
                            $scope.showHide.mobile.selectdates = false;
                        },
                        eventHandlers: {
                            'apply.daterangepicker': function (event, picker) {
                                //check event source
                                let sourceId = event.picker.element[0].id;
                                if (sourceId == "ticketSaleStartDate") { //ticket
                                    $scope.displayEvent.tickets.saleEndDate.date = $scope.displayEvent.tickets.saleStartDate.date;
                                    angular.element('#ticketSaleEndDate').val(($scope.displayEvent.tickets.saleEndDate.date).format("MMM, DD YYYY"));
                                    setTimeout(function () {
                                        angular.element('#ticketSaleEndDate').triggerHandler('focus');
                                        angular.element('#ticketSaleEndDate').triggerHandler('blur');
                                        angular.element('.drp-calendar').attr("style", "display:none");
                                        $scope.validateTime($scope.displayEvent.tickets.saleStartDate.date, $scope.displayEvent.tickets.saleStartDate.time, $scope.displayEvent.tickets.saleEndDate.date, $scope.displayEvent.tickets.saleEndDate.time, 'createEventForms.create_event_form_admissions_3', 'saleendDate');
                                    }, 500);

                                } else { //event
                                    $scope.displayEvent.end.date = $scope.displayEvent.start.date;
                                    angular.element('#eventEndDate').val(($scope.displayEvent.end.date).format("MMM DD, YYYY"));
                                    if (typeof event.max == 'undefined') {
                                        $scope.displayEvent.end.date = $scope.displayEvent.start.date;
                                        $scope.validateTime($scope.displayEvent.start.date, $scope.displayEvent.start.time, $scope.displayEvent.end.date, $scope.displayEvent.end.time, 'create_event_form_3', 'endDate');
                                        $scope.upateTicketDefaultTime($scope.displayEvent.start.date, $scope.displayEvent.start.time);
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
                        'hide.daterangepicker': function (event, picker) {
                            $scope.navigate('createnewevent');
                        },
                        eventHandlers: {
                            'cancel.daterangepicker': function (event, picker) {
                                $scope.navigate('createnewevent');
                            },
                            'apply.daterangepicker': function (event, picker) {
                                $scope.displayEvent.start.date = $scope.dropdowns.startDateRangePicker.selectedDate.startDate;
                                $scope.displayEvent.end.date = $scope.dropdowns.startDateRangePicker.selectedDate.endDate;
                                $scope.displayEvent.startDateInString = $scope.displayEvent.start.date.format('ddd, MMM DD, YYYY');
                                $scope.navigate('createnewevent');
                                $scope.validateTime($scope.displayEvent.start.date, $scope.displayEvent.start.time, $scope.displayEvent.end.date, $scope.displayEvent.end.time, 'create_event_mobile_form', 'startDate');

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
                            'apply.daterangepicker': function (event, picker) {
                                //check event source
                                let sourceId = event.picker.element[0].id;

                                if (sourceId == "ticketSaleEndDate") { //ticket
                                    angular.element('#ticketSaleEndDate').val(($scope.displayEvent.tickets.saleEndDate.date).format("MMM, DD YYYY"));
                                    $scope.validateTime($scope.displayEvent.tickets.saleStartDate.date, $scope.displayEvent.tickets.saleStartDate.time, $scope.displayEvent.tickets.saleEndDate.date, $scope.displayEvent.tickets.saleEndDate.time, 'createEventForms.create_event_form_admissions_3', 'saleendDate');
                                } else { //event
                                    angular.element('#eventEndDate').val(($scope.displayEvent.end.date).format("MMM DD, YYYY"));
                                    $scope.displayEvent.startDateInString = $scope.displayEvent.start.date.format('ddd, MMM DD, YYYY');
                                    $scope.validateTime($scope.displayEvent.start.date, $scope.displayEvent.start.time, $scope.displayEvent.end.date, $scope.displayEvent.end.time, 'create_event_form_3', 'endDate');
                                    $scope.saveDataLocal();
                                }
                            }
                        }
                    }
                },
                categoryLang: {
                    selectAll: "Tick all",
                    selectNone: "Select none",
                    reset: "Undo all",
                    search: "Type here to search...",
                    nothingSelected: "Select Category" //default-label is deprecated and replaced with this.
                },
                zoneLang: {
                    selectAll: "Tick all",
                    selectNone: "Select none",
                    reset: "Undo all",
                    search: "Type here to search...",
                    nothingSelected: "Select Zone" //default-label is deprecated and replaced with this.
                },
                venueLang: {
                    selectAll: "Tick all",
                    selectNone: "Select none",
                    reset: "Undo all",
                    search: "Type here to search...",
                    nothingSelected: "Select Venue" //default-label is deprecated and replaced with this.
                },
                privacyLang: {
                    selectAll: "Tick all",
                    selectNone: "Select none",
                    reset: "Undo all",
                    search: "Type here to search...",
                    nothingSelected: "Select Privacy" //default-label is deprecated and replaced with this.
                },
                stripe_country: {
                    options: [{
                        key: 'US',
                        value: 'US'
                    },
                    {
                        key: 'GB',
                        value: 'UK'
                    }
                    ]
                },
                payout_country: {
                    options: [{
                        key: 'US',
                        value: 'United States'
                    },
                    {
                        key: 'GB',
                        value: 'United Kingdom'
                    }
                    ]
                },
                payout_currency: {
                    options: [{
                        key: 'USD',
                        value: 'U.S. Dollar $'
                    },
                    {
                        key: 'GBP',
                        value: 'Pound £'
                    }
                    ]
                },
                venues_is: {
                    options: [{
                            key: 'finalised',
                            value: 'Finalised',
                            selected: 'selected'
                        },
                        {
                            key: 'tobeannoun',
                            value: 'To be announced'

                        }
                    ]
                },
                event_privacy: {
                    options: [{
                            key: 'public',
                            value: "Public",
                            selected: true
                        },
                        {
                            key: 'private',
                            value: "Private",
                        }
                    ]
                },
                event_access_type: [{ value: 1, key: 'anyone_link', params: 'Anyone with the link.', checked: true }, { value: 2, key: 'only_invitation', params: "Only person with an invitation.", checked: false }, { value: 3, key: 'only_password', params: "Only person with the password.", checked: false }],
                timezones: {
                    options: []
                },
                states: {
                    options: []
                },
                times: {
                    options: config.GLOBAL_TIMES
                },
                countries: {
                    options: [{ "key": "Afghanistan", "value": "Afghanistan" }, { "key": "Albania", "value": "Albania" }, { "key": "Algeria", "value": "Algeria" }, { "key": "American Samoa", "value": "American Samoa" }, { "key": "Andorra", "value": "Andorra" }, { "key": "Angola", "value": "Angola" }, { "key": "Anguilla", "value": "Anguilla" }, { "key": "Antarctica", "value": "Antarctica" }, { "key": "Antigua and Barbuda", "value": "Antigua and Barbuda" }, { "key": "Argentina", "value": "Argentina" }, { "key": "Armenia", "value": "Armenia" }, { "key": "Aruba", "value": "Aruba" }, { "key": "Asia & Pacific", "value": "Asia & Pacific" }, { "key": "Australia", "value": "Australia" }, { "key": "Austria", "value": "Austria" }, { "key": "Azerbaijan", "value": "Azerbaijan" }, { "key": "Bahamas", "value": "Bahamas" }, { "key": "Bahrain", "value": "Bahrain" }, { "key": "Bangladesh", "value": "Bangladesh" }, { "key": "Barbados", "value": "Barbados" }, { "key": "Belarus", "value": "Belarus" }, { "key": "Belgium", "value": "Belgium" }, { "key": "Belize", "value": "Belize" }, { "key": "Benin", "value": "Benin" }, { "key": "Bermuda", "value": "Bermuda" }, { "key": "Bhutan", "value": "Bhutan" }, { "key": "Bolivia", "value": "Bolivia" }, { "key": "Bosnia and Herzegovina", "value": "Bosnia and Herzegovina" }, { "key": "Botswana", "value": "Botswana" }, { "key": "Bouvet Island", "value": "Bouvet Island" }, { "key": "Brazil", "value": "Brazil" }, { "key": "British Indian Ocean Territory", "value": "British Indian Ocean Territory" }, { "key": "British Virgin Islands", "value": "British Virgin Islands" }, { "key": "Brunei", "value": "Brunei" }, { "key": "Bulgaria", "value": "Bulgaria" }, { "key": "Burkina Faso", "value": "Burkina Faso" }, { "key": "Burundi", "value": "Burundi" }, { "key": "Cambodia", "value": "Cambodia" }, { "key": "Cameroon", "value": "Cameroon" }, { "key": "Canada", "value": "Canada" }, { "key": "Cape Verde", "value": "Cape Verde" }, { "key": "Cayman Islands", "value": "Cayman Islands" }, { "key": "Central African Republic", "value": "Central African Republic" }, { "key": "Chad", "value": "Chad" }, { "key": "Chile", "value": "Chile" }, { "key": "China", "value": "China" }, { "key": "Christmas Island", "value": "Christmas Island" }, { "key": "Cocos Islands", "value": "Cocos Islands" }, { "key": "Colombia", "value": "Colombia" }, { "key": "Comoros", "value": "Comoros" }, { "key": "Congo Democratic Republic", "value": "Congo Democratic Republic" }, { "key": "Congo Republic", "value": "Congo Republic" }, { "key": "Cook Islands", "value": "Cook Islands" }, { "key": "Costa Rica", "value": "Costa Rica" }, { "key": "Croatia", "value": "Croatia" }, { "key": "Cuba", "value": "Cuba" }, { "key": "Cyprus", "value": "Cyprus" }, { "key": "Czech Republic", "value": "Czech Republic" }, { "key": "Denmark", "value": "Denmark" }, { "key": "Djibouti", "value": "Djibouti" }, { "key": "Dominica", "value": "Dominica" }, { "key": "Dominican Republic", "value": "Dominican Republic" }, { "key": "Ecuador", "value": "Ecuador" }, { "key": "Egypt", "value": "Egypt" }, { "key": "El Salvador", "value": "El Salvador" }, { "key": "Equatorial Guinea", "value": "Equatorial Guinea" }, { "key": "Eritrea", "value": "Eritrea" }, { "key": "Estonia", "value": "Estonia" }, { "key": "Ethiopia", "value": "Ethiopia" }, { "key": "European Union", "value": "European Union" }, { "key": "Falkland Islands", "value": "Falkland Islands" }, { "key": "Faroe Islands", "value": "Faroe Islands" }, { "key": "Fiji", "value": "Fiji" }, { "key": "Finland", "value": "Finland" }, { "key": "France", "value": "France" }, { "key": "French Polynesia", "value": "French Polynesia" }, { "key": "French Southern Territories", "value": "French Southern Territories" }, { "key": "Gabon", "value": "Gabon" }, { "key": "Gambia", "value": "Gambia" }, { "key": "Georgia", "value": "Georgia" }, { "key": "Germany", "value": "Germany" }, { "key": "Ghana", "value": "Ghana" }, { "key": "Gibraltar", "value": "Gibraltar" }, { "key": "Greece", "value": "Greece" }, { "key": "Greenland", "value": "Greenland" }, { "key": "Grenada", "value": "Grenada" }, { "key": "Guam", "value": "Guam" }, { "key": "Guatemala", "value": "Guatemala" }, { "key": "Guernsey", "value": "Guernsey" }, { "key": "Guinea", "value": "Guinea" }, { "key": "Guinea-Bissau", "value": "Guinea-Bissau" }, { "key": "Guyana", "value": "Guyana" }, { "key": "Haiti", "value": "Haiti" }, { "key": "Heard Island and McDonald Islands", "value": "Heard Island and McDonald Islands" }, { "key": "Holy See", "value": "Holy See" }, { "key": "Honduras", "value": "Honduras" }, { "key": "Hong Kong", "value": "Hong Kong" }, { "key": "Hungary", "value": "Hungary" }, { "key": "Iceland", "value": "Iceland" }, { "key": "India", "value": "India" }, { "key": "Indonesia", "value": "Indonesia" }, { "key": "Iran", "value": "Iran" }, { "key": "Iraq", "value": "Iraq" }, { "key": "Ireland", "value": "Ireland" }, { "key": "Isle of Man", "value": "Isle of Man" }, { "key": "Israel", "value": "Israel" }, { "key": "Italy", "value": "Italy" }, { "key": "Ivory Coast", "value": "Ivory Coast" }, { "key": "Jamaica", "value": "Jamaica" }, { "key": "Japan", "value": "Japan" }, { "key": "Jersey", "value": "Jersey" }, { "key": "Jordan", "value": "Jordan" }, { "key": "Kazakhstan", "value": "Kazakhstan" }, { "key": "Kenya", "value": "Kenya" }, { "key": "Kiribati", "value": "Kiribati" }, { "key": "Korea North", "value": "Korea North" }, { "key": "Korea South", "value": "Korea South" }, { "key": "Kuwait", "value": "Kuwait" }, { "key": "Kyrgyzstan", "value": "Kyrgyzstan" }, { "key": "Laos", "value": "Laos" }, { "key": "Latvia", "value": "Latvia" }, { "key": "Lebanon", "value": "Lebanon" }, { "key": "Lesotho", "value": "Lesotho" }, { "key": "Liberia", "value": "Liberia" }, { "key": "Libya", "value": "Libya" }, { "key": "Liechtenstein", "value": "Liechtenstein" }, { "key": "Lithuania", "value": "Lithuania" }, { "key": "Luxembourg", "value": "Luxembourg" }, { "key": "Macao", "value": "Macao" }, { "key": "Macedonia", "value": "Macedonia" }, { "key": "Madagascar", "value": "Madagascar" }, { "key": "Malawi", "value": "Malawi" }, { "key": "Malaysia", "value": "Malaysia" }, { "key": "Maldives", "value": "Maldives" }, { "key": "Mali", "value": "Mali" }, { "key": "Malta", "value": "Malta" }, { "key": "Marshall Islands", "value": "Marshall Islands" }, { "key": "Mauritania", "value": "Mauritania" }, { "key": "Mauritius", "value": "Mauritius" }, { "key": "Mayotte", "value": "Mayotte" }, { "key": "Mexico", "value": "Mexico" }, { "key": "Micronesia", "value": "Micronesia" }, { "key": "Moldova", "value": "Moldova" }, { "key": "Monaco", "value": "Monaco" }, { "key": "Mongolia", "value": "Mongolia" }, { "key": "Montenegro", "value": "Montenegro" }, { "key": "Montserrat", "value": "Montserrat" }, { "key": "Morocco", "value": "Morocco" }, { "key": "Mozambique", "value": "Mozambique" }, { "key": "Myanmar", "value": "Myanmar" }, { "key": "Namibia", "value": "Namibia" }, { "key": "Nauru", "value": "Nauru" }, { "key": "Nepal", "value": "Nepal" }, { "key": "Netherlands Antilles", "value": "Netherlands Antilles" }, { "key": "Netherlands", "value": "Netherlands" }, { "key": "New Caledonia", "value": "New Caledonia" }, { "key": "New Zealand", "value": "New Zealand" }, { "key": "Nicaragua", "value": "Nicaragua" }, { "key": "Niger", "value": "Niger" }, { "key": "Nigeria", "value": "Nigeria" }, { "key": "Niue", "value": "Niue" }, { "key": "Norfolk Island", "value": "Norfolk Island" }, { "key": "Northern Mariana Islands", "value": "Northern Mariana Islands" }, { "key": "Norway", "value": "Norway" }, { "key": "Oman", "value": "Oman" }, { "key": "Pakistan", "value": "Pakistan" }, { "key": "Palau", "value": "Palau" }, { "key": "Palestinian Territory", "value": "Palestinian Territory" }, { "key": "Panama", "value": "Panama" }, { "key": "Papua New Guinea", "value": "Papua New Guinea" }, { "key": "Paraguay", "value": "Paraguay" }, { "key": "Peru", "value": "Peru" }, { "key": "Philippines", "value": "Philippines" }, { "key": "Pitcairn", "value": "Pitcairn" }, { "key": "Poland", "value": "Poland" }, { "key": "Portugal", "value": "Portugal" }, { "key": "Puerto Rico", "value": "Puerto Rico" }, { "key": "Qatar", "value": "Qatar" }, { "key": "Romania", "value": "Romania" }, { "key": "Russia", "value": "Russia" }, { "key": "Rwanda", "value": "Rwanda" }, { "key": "Saint Barthelemy", "value": "Saint Barthelemy" }, { "key": "Saint Helena Ascension and Tristan da Cunha", "value": "Saint Helena Ascension and Tristan da Cunha" }, { "key": "Saint Kitts and Nevis", "value": "Saint Kitts and Nevis" }, { "key": "Saint Lucia", "value": "Saint Lucia" }, { "key": "Saint Martin", "value": "Saint Martin" }, { "key": "Saint Pierre and Miquelon", "value": "Saint Pierre and Miquelon" }, { "key": "Saint Vincent and the Grenadines", "value": "Saint Vincent and the Grenadines" }, { "key": "Samoa", "value": "Samoa" }, { "key": "San Marino", "value": "San Marino" }, { "key": "Sao Tome and Principe", "value": "Sao Tome and Principe" }, { "key": "Saudi Arabia", "value": "Saudi Arabia" }, { "key": "Senegal", "value": "Senegal" }, { "key": "Serbia", "value": "Serbia" }, { "key": "Seychelles", "value": "Seychelles" }, { "key": "Sierra Leone", "value": "Sierra Leone" }, { "key": "Singapore", "value": "Singapore" }, { "key": "Slovakia", "value": "Slovakia" }, { "key": "Slovenia", "value": "Slovenia" }, { "key": "Solomon Islands", "value": "Solomon Islands" }, { "key": "Somalia", "value": "Somalia" }, { "key": "South Africa", "value": "South Africa" }, { "key": "Spain", "value": "Spain" }, { "key": "Sri Lanka", "value": "Sri Lanka" }, { "key": "Sudan", "value": "Sudan" }, { "key": "Suriname", "value": "Suriname" }, { "key": "Svalbard", "value": "Svalbard" }, { "key": "Swaziland", "value": "Swaziland" }, { "key": "Sweden", "value": "Sweden" }, { "key": "Switzerland", "value": "Switzerland" }, { "key": "Syria", "value": "Syria" }, { "key": "Taiwan", "value": "Taiwan" }, { "key": "Tajikistan", "value": "Tajikistan" }, { "key": "Tanzania", "value": "Tanzania" }, { "key": "Thailand", "value": "Thailand" }, { "key": "Timor-Leste", "value": "Timor-Leste" }, { "key": "Togo", "value": "Togo" }, { "key": "Tokelau", "value": "Tokelau" }, { "key": "Tonga", "value": "Tonga" }, { "key": "Trinidad and Tobago", "value": "Trinidad and Tobago" }, { "key": "Tunisia", "value": "Tunisia" }, { "key": "Turkey", "value": "Turkey" }, { "key": "Turkmenistan", "value": "Turkmenistan" }, { "key": "Turks and Caicos Islands", "value": "Turks and Caicos Islands" }, { "key": "Tuvalu", "value": "Tuvalu" }, { "key": "Uganda", "value": "Uganda" }, { "key": "Ukraine", "value": "Ukraine" }, { "key": "United Arab Emirates", "value": "United Arab Emirates" }, { "key": "United Kingdom", "value": "United Kingdom" }, { "key": "United States", "value": "United States" }, { "key": "Uruguay", "value": "Uruguay" }, { "key": "Uzbekistan", "value": "Uzbekistan" }, { "key": "Vanuatu", "value": "Vanuatu" }, { "key": "Venezuela", "value": "Venezuela" }, { "key": "Vietnam", "value": "Vietnam" }, { "key": "Virgin Islands", "value": "Virgin Islands" }, { "key": "Wallis and Futuna", "value": "Wallis and Futuna" }, { "key": "Western Sahara", "value": "Western Sahara" }, { "key": "Yemen", "value": "Yemen" }, { "key": "Zambia", "value": "Zambia" }, { "key": "Zimbabwe", "value": "Zimbabwe" }]
                }
            };

            $scope.editEventDraftFlag = false;
            $scope.editEventDraftStatus = false;
            $scope.ImageUploadDone = true;

            $scope.newVenues = [{
                    key: 'finalised',
                    value: 'Finalised',
                    selected: true
                },
                {
                    key: 'tobeannoun',
                    value: 'To be announced'
                }
            ];

            $scope.editVenues = [{
                    key: 'finalised',
                    value: 'Finalised'
                },
                {
                    key: 'tobeannoun',
                    value: 'To be announced'
                }
            ];


            $scope.changeCountry = function (value) {
                angular.forEach($scope.dropdowns.payout_currency.options, function (dataValue) {
                    if (value === 'US') {
                        angular.element("#selectCurrency option").removeAttr("selected");
                        angular.element("#selectCurrency option[value='string:USD']").attr("selected", "selected");
                    } else {
                        angular.element("#selectCurrency option").removeAttr("selected");
                        angular.element("#selectCurrency option[value='string:GBP']").attr("selected", "selected");
                    }
                });
            };

            $scope.navigate = function (action) {
                for (let key of Object.keys($scope.showHide.mobile)) {
                    $scope.showHide.mobile[key] = false;
                }

                if (action === 'addlocation') {
                    $scope.displayEvent.chosenPlace = '';
                }

                if (action === 'selectdates') {
                    $scope.dropdowns.startDateRangePicker.toggle();
                }
                if (action === 'invitebyemail') {
                    $scope.emailFrom = '';
                }

                if (action === 'invitebyfollowers') {
                    $scope.loadUserFollowers();
                }
                $scope.showHide.mobile[action] = true;
            };

            $scope.selectPopularLocation = function (location) {
                if (location) {
                    $scope.displayEvent.chosenPlace = location.name;
                    $scope.selectLocation({
                        lat: location.lat,
                        long: location.long,
                        address: {
                            city: location.name,
                            country: location.country,
                            state: location.state
                        },
                        country_short_code: location.country_short_code
                    });
                    $scope.showHide.mobile.addlocation = false;
                    $scope.showHide.mobile.addaddress = true;
                }
            };

            $scope.isString = function (value) {
                return typeof value === 'string' || value instanceof String;
            };

            $scope.selectLocation = function (location) {
                if (location) {
                    if ($scope.isString(location)) {
                        location = JSON.parse(location);
                    }

                    $scope.displayEvent.address = {};
                    if ('address' in location && location.address) {
                        $scope.displayEvent.address = location.address;
                    }
                    if ('country_short_code' in location && location.country_short_code) {
                        // Get state
                        $scope.displayEvent.country_code = location.country_short_code;
                        let token = authService.get('token');
                        awsService.get(`states/${ location.country_short_code }`, token)
                            .then((response) => {
                                $scope.dropdowns.states.options = [];
                                if (response && response.length > 0) {
                                    for (let state of response) {
                                        if (state === 'City of London') {
                                            state = 'London';
                                        }
                                        $scope.dropdowns.states.options.push({ key: state, value: state });
                                    }
                                }
                            });
                    }

                    $scope.displayEvent.latitude = location.lat;
                    $scope.displayEvent.longitude = location.long;
                    $scope.displayEvent.location[0] = location.lat;
                    $scope.displayEvent.location[1] = location.long;
                    // Get timezone
                    locationService.getTimeZone(location.lat, location.long)
                        .then((response) => {
                            if (response && response.data && 'timeZoneId' in response.data && response.data.timeZoneId) {
                                $scope.displayEvent.timezone = response.data.timeZoneId;
                                if ($scope.action == 'create' || $scope.action == "Create") {
                                    $scope.displayEvent.start.date = moment.tz($scope.displayEvent.timezone);
                                    $scope.displayEvent.end.date = moment.tz($scope.displayEvent.timezone);
                                    $scope.dropdowns.startDateRangePicker.minDate = moment.tz($scope.displayEvent.timezone);
                                    $scope.dropdowns.endDateRangePicker.minDate = moment.tz($scope.displayEvent.timezone);
                                }
                            }
                        });

                    if ($scope.showHide.searchVenueOptions) {
                        // $scope.navigate('addaddress');
                    }
                    $scope.saveDataLocal();
                }
            };

            const getDefaultTicket = function () {

                return {
                    'name': null,
                    'description': '',
                    'quantity': null,
                    'price': 0,
                    'saleStartDate': {
                        //date: moment.utc().add(2,'days'), // As per the document we want to take start date as current date + 2 days
                        date: moment.utc(),
                        time: $scope.dropdowns.times.options[current_time_value].key
                    },
                    'saleEndDate': {
                        //date: moment.utc().add(2,'days'), // As per the document we want to take start date as current date + 3 days
                        date: moment.utc(),
                        time: $scope.dropdowns.times.options[current_time_value_plus_two].key
                    },
                    'ticketPerOrderMinQuant': 1,
                    'ticketPerOrderMaxQuant': 5,
                };
            };

            $scope.goToStep = function (step) {

                // Go to step only if step is complete
                if ($scope.isStepComplete(step)) {
                    // Check the length of the current steps to calculate number of times back needs to be called
                    let remaningFormsLength = 1;

                    switch (step) {
                        case 1:
                            $scope.showHide.template = 'partials/basic-info.html';
                            remaningFormsLength = 4;
                            break;
                        case 2:
                            $scope.showHide.template = 'partials/create-event-details.html';
                            remaningFormsLength = 8;
                            break;
                        case 3:
                            $scope.showHide.template = 'partials/create-event-admission.html';
                            remaningFormsLength = 10;
                            break;

                    }

                    while ($scope.currentInfoSection.length > remaningFormsLength) {
                        $scope.back();
                    }
                }
            };

            // This function is called to check if a step is complete
            $scope.isStepComplete = function (step) {
                let forms = ['create_event_form_1', 'create_event_form_2', 'create_event_form_3', 'create_event_detail_1'];
                switch (step) {
                    case 1:
                        break;
                    case 2:
                        forms.push('create_event_detail_2');
                        forms.push('create_event_seat_layout');
                        break;
                    case 3:
                        forms.push('create_event_form_admissions_1');
                        forms.push('create_event_form_admissions_2');
                        forms.push('create_event_form_admissions_3');
                        break;
                }

                if ($scope.currentInfoSection && forms.every(val => $scope.currentInfoSection.includes(val))) {
                    return true;
                }
                return false;
            };

            // Remove guest
            $scope.deleteGuest = function (index, guestId) {
                $scope.guestUserList.splice(index, 1);
                $scope.displayEvent.guest_user.splice(index, 1);
                if (guestId >= 0) {
                    $scope.guestUserFromList.push(guestId);
                }
            };
            $scope.displayEvent = {
                event_id: 0,
                venue_is: $scope.dropdowns.venues_is.options[0].key,
                startDateInString: moment.utc().format('ddd, MMM DD, YYYY'),
                start: {
                    date: moment.utc(), // As per the document we want to take start date as current date + 2 days
                    time: $scope.dropdowns.times.options[40].key
                },
                end: {
                    date: moment.utc(), // As per the document we want to take start date as current date + 3 days
                    time: $scope.dropdowns.times.options[88].key
                },
                event_name: null,
                event_image: null,
                chosenPlace: null,
                description: '',
                files: null,
                websiteurl: null,
                email: null,
                phone: null,
                sponsored_event: false,
                plan: null,
                highlighted: false,
                event_type: "free",
                friends: [],
                event_admin: [],
                selectedFriends: [],
                selectedCategory: [],
                coupon: null,
                stripeToken: null,
                is_draft: 1,
                isPHQ: false,
                location: [],
                latitude: 0,
                longitude: 0,
                bank_id: '',
                zone_id: [],
                street_address: null,
                address: {
                    streetAddress: null,
                    city: null,
                    state: null,
                    country: null,
                    address: null,
                    zipcode: null
                },
                croppedImage: null,
                ticket_type: null,
                admission_event_type: null,
                ticketsArr: [],
                tickets: getDefaultTicket(),
                selectedPlan: null,
                guest_user: [],
                private_invitation_list: [],
                ticketsArrForEdit: [],
                eventAdmminName: null,
                administrator_email: null,
                country_code: null,
                deleted_tickets: '',
                seat_layout: 'tickets',
                pickSeats: 0,
                pickSeatsValue: true,
                layout_details: {},
                status: '',
                privacy_type: 1,
                event_access_type: '1',
                password: ''
            };

            // This method will be called when user clicks on search location again
            $scope.resetLocation = function () {
                // Clear the location
                $scope.displayEvent.chosenPlace = null;
                $scope.loct = null;
                $scope.showHide.selectedAddressDiv = false;
                $scope.displayEvent.address = {};
                if ($scope.displayEvent.address.zipcode) {
                    $scope.displayEvent.address.zipcode = null;
                }
                $scope.displayEvent.location = [];
                Utils.applyChanges($scope);
            };

            // this function is create to get guest users
            $scope.loadUserGuest = function () {
                return [];
            };

            const checkIfDuplicateGuest = function (f) {
                return $scope.displayEvent.guest_user.findIndex(g => g.id = f.id);
            };

            $scope.saveFollowersSelection = function () {
                for (let f of $scope.userFollowers) {
                    let checkIfAlreadyExists = checkIfDuplicateGuest(f);
                    if (f.selected && checkIfAlreadyExists == -1) {
                        f.type = 'Follower';
                        f.name = f.full_name;
                        $scope.displayEvent.guest_user.push(f);
                    }
                }
                $scope.navigate('createnewevent');
            };

            $scope.clearAll = function (select) {
                if ($scope.userFollowers) {
                    for (let f of $scope.userFollowers) {
                        f.selected = select;
                    }
                    $scope.calculateFollowers();
                }
            };

            $scope.calculateFollowers = function () {
                $scope.selectedFollowers = $scope.userFollowers.filter(f => f.selected).length;
            };

            $scope.loadUserFollowers = function () {
                if (!$scope.userFollowers) {
                    followUser.followers().then(res => {
                        $scope.userFollowers = [];
                        if (res && 'data' in res && 'data' in res.data) {

                            for (let element of res.data.data) {
                                let follower = {
                                    "user_id": element.user_id,
                                    "email": element.email,
                                    'first_name': element.first_name,
                                    'last_name': element.last_name,
                                    "profile_pic": element.profile_pic,
                                    "type": 'follower'
                                };
                                $scope.userFollowers.push(follower);

                            }
                            Utils.applyChanges($scope);
                        }
                    })
                        .catch(err => { });
                }
            };

            // This is generated by directives
            $scope.$on('locationResponse', function (event, data) {

                $scope.displayEvent.chosenPlace = data.address;
                $scope.selectLocation({
                    lat: data.lat,
                    long: data.lng,
                    address: {
                        city: data.address
                    }
                });
                Utils.applyChanges($scope);
            });



            $scope.$watch('loct', function () {

                if ($scope.loct) {
                    let selectedLocation = {
                        lat: $scope.loct.lat,
                        long: $scope.loct.long,
                        address: {}
                    };
                    let streetAddress = $scope.loct.address_components.filter(a => a.types && (a.types.includes('street_number') || a.types.includes('route') || a.types.includes("neighborhood")));
                    if (streetAddress && streetAddress.length > 0) {
                        selectedLocation.address.streetAddress = streetAddress.map(s => s.long_name).join(',');
                    }

                    let countryComponent = $scope.loct.address_components.filter(a => a.types && a.types.includes('country'));
                    if (countryComponent && countryComponent.length > 0) {
                        selectedLocation.address.country = countryComponent[0].long_name;
                        selectedLocation.country_short_code = countryComponent[0].short_name;
                    }

                    // Get locality 
                    let cityComponent = $scope.loct.address_components.filter(a => a.types && (a.types.includes('locality', 'administrative_area_level_3') || a.types.includes('postal_town')));
                    if (cityComponent && cityComponent.length > 0) {
                        selectedLocation.address.city = cityComponent[0].long_name;
                    }

                    let stateComponent = $scope.loct.address_components.filter(a => a.types && a.types.includes('administrative_area_level_1'));
                    if (stateComponent && stateComponent.length > 0) {
                        if (selectedLocation.address.city === 'London') {
                            selectedLocation.address.state = 'London';
                        } else {
                            selectedLocation.address.state = stateComponent[0].long_name;
                        }
                    }

                    let zipCodeComponent = $scope.loct.address_components.filter(a => a.types && a.types.includes('postal_code'));
                    if (zipCodeComponent && zipCodeComponent.length > 0) {
                        selectedLocation.address.zipcode = zipCodeComponent[0].long_name;
                    }

                    $scope.selectLocation(selectedLocation);

                } else {
                    $scope.displayEvent.latitude = 0;
                    $scope.displayEvent.longitude = 0;
                    $scope.displayEvent.location = [];
                }
            });

            // This function is called on selection of time
            $scope.validateTime = function (eventStartDate, eventStartTime, eventEndDate, eventEndTime, formName, formField) {

                let startDate = eventStartDate.format("MM/DD/YYYY");
                let endDate = eventEndDate.format("MM/DD/YYYY");

                let startTime = moment(eventStartTime, 'hh:mma').format("HH:mm:ss");
                let endTime = moment(eventEndTime, 'hh:mma').format("HH:mm:ss");

                let date1 = new Date(startDate + ' ' + startTime);
                let date2 = new Date(endDate + ' ' + endTime);

                // To calculate the time difference of two dates 

                let Difference_In_Time = date2.getTime() - date1.getTime();

                if (Difference_In_Time <= 0) {
                    setTimeout(function() {
                        angular.element('#ticketSaleEndDate').triggerHandler('focus');
                        angular.element('#ticketSaleEndDate').triggerHandler('blur');
                        angular.element('.drp-calendar').attr("style", "display:none");
                    }, 500);
                    if (typeof $scope.createEventForms[formName] === 'undefined') {

                        if (typeof $scope.createEventForms.create_event_form_admissions_3 !== 'undefined') {
                            $scope.createEventForms.create_event_form_admissions_3.saleendDate.$setValidity('minDate', false);
                        }
                    } else {
                        $scope.createEventForms[formName][formField].$setValidity('minDate', false);
                        if (typeof $scope.createEventForms[formName].endDate !== 'undefined') {
                            $scope.createEventForms[formName].endDate.$setValidity('minDate', false);
                        }
                    }

                } else {
                    if (typeof $scope.createEventForms[formName] === 'undefined') {
                        if (typeof $scope.createEventForms.create_event_form_admissions_3 !== 'undefined') {
                            $scope.createEventForms.create_event_form_admissions_3.saleendDate.$setValidity('minDate', true);
                        }
                    } else {
                        $scope.createEventForms[formName][formField].$setValidity('minDate', true);
                        if (typeof $scope.createEventForms[formName].endDate !== 'undefined') {
                            $scope.createEventForms[formName].endDate.$setValidity('minDate', true);
                        }
                    }
                }
            };

            // This method is called on selection of options 

            $scope.venueIsFinialised = function() {
                if (typeof $scope.displayEvent.venue_is === 'string') {
                    if ($scope.displayEvent.venue_is === 'finalised') {
                        $scope.showHide.searchVenueOptions = true;
                    } else {
                        $scope.showHide.searchVenueOptions = false;
                        $scope.displayEvent.location = [];
                    }
                } else {
                    if ($scope.displayEvent.venue_is[0].key === 'finalised') {
                        $scope.showHide.searchVenueOptions = true;
                    } else {
                        $scope.showHide.searchVenueOptions = false;
                        $scope.displayEvent.location = [];
                    }
                }
            };

            $scope.resetCoupon = function () {
                $scope.createEventForms.promote_event.coupon.$setValidity('invalid', true);
                $scope.displayEvent.coupon = null;
            };
            $scope.couponValid = false;
            //for coupon
            $scope.validateCoupon = function () {
                if ($scope.displayEvent.coupon_name && $scope.displayEvent.coupon_name.trim() != '') {
                    // Make call to API
                    return awsService.getCoupon($scope.displayEvent.coupon_name)
                        .then((coupon) => {
                            $scope.displayEvent.coupon = coupon.data;
                            $scope.createEventForms.promote_event.coupon.$setValidity('invalid', true);
                            $scope.couponValid = true;
                            return Promise.resolve(coupon.data);
                        })
                        .catch((err) => {
                            console.log(err);
                            let message = MESSAGES.SOMETHING_WENT_WRONG;
                            if (err && err.data && err.data.message) {
                                $scope.createEventForms.promote_event.coupon.$setValidity('invalid', false);
                            }
                            return Promise.reject(message);
                        });
                } else {
                    return Promise.resolve(null);
                }
            };

            // This function is used show progress
            $scope.updateProgress = function () {
                if ($scope.currentInfoSection.length == 6) {
                    $scope.progress = 50;
                } else if ($scope.currentInfoSection.length == 10) {
                    $scope.progress = 75;
                } else if ($scope.currentInfoSection.length == 7) {
                    $scope.progress = 65;
                } else {
                    $scope.progress = Math.ceil((($scope.currentInfoSection.length - 1) / totalForms) * 100);
                }
            };

            // This function is called on change of handleAdmission ticket
            $scope.handleAdmissionTicket = function () {
                if (!$scope.currentInfoSection.includes('create_event_form_admissions_3') && $scope.user.selectedPlan && $scope.user.selectedPlan.id === 'unlimited') {
                    $scope.continue();
                } else if (!$scope.currentInfoSection.includes('create_event_form_admissions_3') && $scope.displayEvent.event_type === 'free' && !$scope.displayEvent.admission_event_type) {
                    $scope.continue();
                } else {
                    $scope.continue();
                }
                // Check if selection is 'false'
            };

            $scope.getEventTicketMininumPrice = function (event) {
                if ("ticketsArr" in event && event.event_type && event.event_type == "paid" &&
                    "ticketsArr" in event && event.ticketsArr && event.ticketsArr.length > 0) {

                    let tickets = event.ticketsArr;
                    tickets = tickets.sort((a, b) => {
                        if ("price" in a && "price" in b) {
                            return (a.price - b.price);
                        } else if ("price" in a) {
                            return -1;
                        } else if ("price" in b) {
                            return 1;
                        } else {
                            return -1;
                        }
                    });
                    if (tickets[0] && tickets[0].price && tickets[0].currency) {
                        return tickets[0].currency + tickets[0].price;
                    } else if (tickets[0] && tickets[0].price) {
                        return "$" + tickets[0].price;
                    }
                }
            };

            /* Attendees pick their seats function */
            $scope.attendeesAllow = function (value) {
                if (value) {
                    $cookies.put('designMap', true);
                    $scope.pickSeatsDisabled = true;
                    $scope.displayEvent.admission_event_type = true;
                    $scope.getExistingSeat($scope.displayEvent.event_id);
                } else {
                    $cookies.put('designMap', false);
                    $scope.displayEvent.pickSeats = false;
                    $scope.pickSeatsDisabled = false;
                }
            };


            /*
             **
             ** Create Ticket Error Modal / Message
             **
             */
            $scope.createTicketModal = function () {
                if ($scope.editEvent.sold_count > 0 && $scope.action != 'Create') {
                    let content = "You can not change this option. To change this option need to 'Unpublish' event.";
                    let notify = {
                        type: 'error',
                        title: 'Oops!!',
                        content: content,
                        timeout: 7000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    $scope.changeSeatLayoutToTicket(false);
                    angular.element("#seatDesign").attr("checked", true);
                } else {
                    if ($scope.action != 'Create' && Object.keys($scope.displayEvent.layout_details).length > 0) {
                        let eventModelScope = $scope.$new(false, $scope);
                        $uibModal.open({
                            ariaLabelledBy: 'modal-title',
                            ariaDescribedBy: 'modal-body',
                            templateUrl: '../../partials/seatlayoutChangeModal.html',
                            openedClass: 'pa-create-event-modal freeEventTickets unSaved scroll_popup popup_wtd_700',
                            scope: eventModelScope,
                            backdrop: 'static',
                            keyboard: false,
                            size: 'md'
                        });
                    }
                }
            };


            /*
             **
             ** Change Seat Layout to Create Ticket
             **
             */
            $scope.changeSeatLayoutToTicket = function (value) {
                if (value) {
                    $scope.displayEvent.seat_layout = "tickets";
                    $scope.attendeesAllow(false);
                    $scope.deleteSeatPlan($scope.displayEvent.layout_details.layout_id);
                } else {
                    $scope.displayEvent.seat_layout = "design";
                    if ($scope.displayEvent.pickSeatsValue) {
                        $scope.displayEvent.pickSeats = true;
                    }
                    $scope.attendeesAllow(true);
                }
            };

            // This function is called on continue button
            $scope.continue = function() {
                let currentInfoSection = $scope.currentInfoSection;
                $scope.currentInfoSection = [...new Set(currentInfoSection)];
                $scope.saveButtonText = 'Save & Continue';

                if ($scope.completedStep.length > 0 && $scope.currentStep < 4 && $scope.completedStep.includes($scope.currentStep)) {
                    $scope.goToStepWithHeaderNew($scope.currentStep + 1);
                } else {
                    switch ($scope.currentInfoSection.length) {
                        case 1:
                            $scope.showCancel = false;
                            $scope.currentInfoSection.push('create_event_form_2');
                            $scope.categoryFlag = true;
                            $scope.navElement();
                            break;
                        case 2:
                            $scope.showCancel = false;
                            $scope.showHide.selectedAddressDiv = true;
                            angular.element('#eventEndDate').focus();
                            angular.element('#eventEndDate').blur();
                            angular.element('#eventStartDate').focus();
                            $scope.currentInfoSection.push('create_event_form_3');
                            $scope.navElement();
                            break;
                        case 3:
                            $scope.currentStep = 2;
                            $scope.completedStep.push(1);
                            $scope.showCancel = false;
                            // $scope.showHide.selectedAddressDiv = true;
                            $scope.saveAfterStep1 = true;
                            /** For Future Update **/
                            // $scope.showHide.template = 'partials/create-event-details.html';
                            // $scope.currentInfoSection.push('create_event_detail_1');
                            var requireDate = $scope.newtoday_date.format("DD-MM-YYYY");
                            var selectedDate = $scope.displayEvent.start.date.format("DD-MM-YYYY");
                            if (selectedDate < requireDate) {
                                $scope.addPromotionDisabled = false;
                            } else {
                                $scope.addPromotionDisabled = true;
                            }
                            /** For Future Update **/
                            // $scope.upateTicketDefaultTime($scope.displayEvent.start.date, $scope.displayEvent.start.time);
                            // if ($scope.action == 'edit' || $scope.action == 'create') {
                            //     $scope.currentInfoSection.push('create_event_detail_2');
                            // }
                            // $scope.navElement();
                            break;
                        case 4:
                            $scope.showCancel = false;
                            $scope.currentInfoSection.push('create_event_detail_2');
                            setTimeout(function () { window.scrollTo(0, document.querySelector(".create_event_detail_2").scrollHeight); }, 500);
                            break;
                        case 5:
                            $scope.currentStep = 3;
                            $scope.completedStep.push(2);
                            $scope.showCancel = false;
                            $scope.showHide.template = 'partials/create-event-admission.html';
                            $scope.currentInfoSection.push('create_event_seat_layout');
                            $scope.navElement();
                            break;
                        case 6:
                            $scope.showCancel = false;
                            $scope.currentInfoSection.push('create_event_form_admissions_1', 'create_event_form_admissions_2');
                            if ($scope.displayEvent.ticketsArr && $scope.displayEvent.ticketsArr.length > 0) {
                                $scope.showHide.ticketsfrm = false;
                            }
                            $scope.navElement();
                            break;
                        case 7:
                            $scope.showCancel = false;
                            $scope.currentInfoSection.push('create_event_form_admissions_3');
                            $scope.handleAdmissionTicket();
                            $scope.navElement();
                            break;
                        case 8:
                            $scope.showCancel = false;
                            $scope.currentInfoSection.push('create_event_form_admissions_3');
                            $scope.handleAdmissionTicket();
                            $scope.navElement();
                            break;
                        case 9:
                            $scope.currentStep = 4;
                            $scope.completedStep.push(3);
                            $scope.showCancel = false;
                            $scope.showHide.template = 'partials/add-guest-page.html';
                            $scope.loadUserGuest();
                            $scope.currentInfoSection.push('create_event_guest_1');
                            if ($scope.action !== 'Create') {
                                $scope.continue();
                            }
                            $scope.navElement();
                            break;
                        case 10:
                            $scope.currentStep = 4;
                            $scope.completedStep.push(3);
                            $scope.showCancel = false;
                            $scope.showHide.template = 'partials/invite_guest.html';
                            $scope.currentInfoSection.push('invite_guest_list');
                            if ($scope.action == 'edit') {
                                $scope.currentInfoSection.push('add_administrator', 'promote_event');
                            }
                            if ($scope.displayEvent.guest_user.length === 0 && $scope.action != 'edit') {
                                $scope.continue();
                            }
                            $scope.navElement();
                            break;
                        case 11:
                            $scope.currentStep = 4;
                            $scope.showCancel = false;
                            $scope.currentInfoSection.push('add_administrator');
                            $scope.navElement();
                            break;
                        case 12:
                            $scope.showCancel = false;
                            $scope.completedStep.push(4);
                            $scope.currentInfoSection.push('promote_event');
                            if ($scope.action === 'claim' && $scope.plans && $scope.plans.length > 0) {
                                // By default select first plan
                                $scope.plans[0].checked = true;
                                $scope.selectPlan($scope.plans[0]);
                            }
                            $scope.navElement();
                            break;
                        case 13:
                            $scope.showCancel = false;
                            $scope.getReferalLink = true;
                            $scope.completedStep.push(5);
                            $scope.showHide.template = 'partials/final_event.html';
                            $scope.saveButtonText = 'Publish';
                            if (($scope.plans[0].checked && !$scope.sponsoredPaymentDone) || ($scope.sponsoredPaymentDone && $scope.plans[0].checked && $scope.displayEvent.is_draft && $scope.action == "edit")) {
                                $scope.displayEvent.highlighted = true;
                                $scope.displayEvent.sponsored_event = true;
                                $scope.saveButtonText = 'Pay & Publish';
                            } else {
                                $scope.displayEvent.highlighted = false;
                            }
                            $scope.eventPrice = $scope.getEventTicketMininumPrice($scope.displayEvent);
                            $scope.eventPlanType = $scope.displayEvent.event_type;
                            $scope.currentInfoSection.push('final_event');
                            $scope.navElement();
                            break;
                        case 14:
                            if ($scope.action == 'edit') {
                                $scope.showHide.template = 'partials/final_event.html';
                            }
                            if ($scope.action != 'edit') {
                                $scope.publisClickCounter = 2;
                            }
                            $scope.showCancel = false;
                            $scope.getReferalLink = true;
                            $scope.completedStep.push(5);
                            $scope.saveButtonText = 'Publish';
                            if (($scope.plans[0].checked && !$scope.sponsoredPaymentDone) || ($scope.sponsoredPaymentDone && $scope.plans[0].checked && $scope.displayEvent.is_draft && $scope.action == "edit")) {
                                $scope.saveButtonText = 'Pay & Publish';
                                $scope.displayEvent.highlighted = true;
                                $scope.displayEvent.sponsored_event = true;
                            }
                            if (($scope.plans[0].checked && !$scope.sponsoredPaymentDone) || ($scope.sponsoredPaymentDone && $scope.plans[0].checked && $scope.displayEvent.is_draft && $scope.action == "edit")) {
                                // Check if create event
                                if ($scope.action != 'edit' && !$scope.sponsoredPaymentDone) {
                                    $scope.sponsoredPayment();
                                } else if ($scope.action === 'edit' && $scope.publisClickCounter == 2) {
                                    // Check if already claimed
                                    if ((!$scope.sponsoredPaymentDone) || ($scope.sponsoredPaymentDone && $scope.displayEvent.is_draft)) {
                                        $scope.sponsoredPayment();
                                    } else {
                                        $scope.draft_value = false;
                                        $scope.saveEvent(false);
                                        $scope.publisClickCounter = 1;
                                    }
                                }
                            } else {

                                if ($scope.publisClickCounter == 2) {
                                    $scope.draft_value = false;
                                    $scope.saveEvent(false);
                                    $scope.publisClickCounter = 1;
                                }
                            }
                            $scope.navElement();
                            $scope.publisClickCounter = 2;
                            break;
                    }
                    $scope.updateProgress();

                    //please donot comment this
                    if ($scope.saveButtonText === 'Save & Continue' && $scope.action === 'Create' && $scope.saveAfterStep1) {
                        $scope.saveEvent(true);
                    }
                }
            };

            $scope.goToStepWithHeaderNew = function (step) {
                $scope.publisClickCounter = 1;
                switch (step) {
                    case 1:
                        $scope.progress = 0;
                        $scope.saveButtonText = 'Save & Continue';
                        $scope.showHide.template = 'partials/basic-info.html';
                        $scope.currentStep = 1;
                        break;
                    case 2:
                        $scope.progress = 25;
                        $scope.saveButtonText = 'Save & Continue';
                        $scope.showCancel = false;
                        $scope.completedStep.push(1);
                        $scope.showHide.template = 'partials/create-event-details.html';
                        $scope.currentInfoSection.push('create_event_detail_1', 'create_event_detail_2');
                        $scope.currentStep = 2;
                        break;
                    case 3:
                        $scope.progress = 50;
                        $scope.saveButtonText = 'Save & Continue';
                        $scope.showCancel = false;
                        $scope.completedStep.push(2);
                        $scope.showHide.template = 'partials/create-event-admission.html';
                        $scope.currentInfoSection.push('create_event_seat_layout', 'create_event_form_admissions_1', 'create_event_form_admissions_2', 'create_event_form_admissions_3');
                        $scope.currentStep = 3;
                        break;
                    case 4:
                        $scope.progress = 75;
                        $scope.saveButtonText = 'Save & Continue';
                        $scope.showCancel = false;
                        $scope.completedStep.push(3);
                        $scope.showHide.template = 'partials/invite_guest.html';
                        $scope.currentInfoSection.push('invite_guest_list');
                        $scope.currentStep = 4;
                        break;
                }

            };


            $scope.goToStepWithHeader = function (step) {
                switch (step) {
                    case 1:
                        $scope.progress = 0;
                        $scope.saveButtonText = 'Save & Continue';
                        if ($scope.currentInfoSection.indexOf('final_event') > -1) {
                            $scope.currentInfoSection.pop('final_event');
                        }

                        if ($scope.currentInfoSection.indexOf('promote_event') > -1) {
                            $scope.currentInfoSection.pop('promote_event');
                        }

                        if ($scope.currentInfoSection.indexOf('invite_guest_list') > -1) {
                            $scope.currentInfoSection.pop('invite_guest_list');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_guest_1') > -1) {
                            $scope.currentInfoSection.pop('create_event_guest_1');
                        }

                        if ($scope.currentInfoSection.indexOf('add_administrator') > -1) {
                            $scope.currentInfoSection.pop('add_administrator');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_form_admissions_1') > -1) {
                            $scope.currentInfoSection.pop('create_event_form_admissions_1');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_form_admissions_2') > -1) {
                            $scope.currentInfoSection.pop('create_event_form_admissions_2');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_form_admissions_3') > -1) {
                            $scope.currentInfoSection.pop('create_event_form_admissions_3');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_detail_1') > -1) {
                            $scope.currentInfoSection.pop('create_event_detail_1');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_detail_2') > -1) {
                            $scope.currentInfoSection.pop('create_event_detail_2');
                        }

                        $scope.showHide.template = 'partials/basic-info.html';

                        break;
                    case 2:
                        $scope.progress = 25;
                        $scope.saveButtonText = 'Save & Continue';

                        if ($scope.currentInfoSection.indexOf('create_event_form_1') === -1) {
                            $scope.currentInfoSection.push('create_event_form_1');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_form_2') === -1) {
                            $scope.currentInfoSection.push('create_event_form_2');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_seat_layout') === -1) {
                            $scope.currentInfoSection.push('create_event_seat_layout');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_form_3') === -1) {
                            $scope.currentInfoSection.push('create_event_form_3');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_detail_1') === -1) {
                            $scope.currentInfoSection.push('create_event_detail_1');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_detail_2') === -1) {
                            $scope.currentInfoSection.push('create_event_detail_2');
                        }

                        if ($scope.currentInfoSection.indexOf('final_event') > -1) {
                            $scope.currentInfoSection.pop('final_event');
                        }

                        if ($scope.currentInfoSection.indexOf('promote_event') > -1) {
                            $scope.currentInfoSection.pop('promote_event');
                        }

                        if ($scope.currentInfoSection.indexOf('invite_guest_list') > -1) {
                            $scope.currentInfoSection.pop('invite_guest_list');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_guest_1') > -1) {
                            $scope.currentInfoSection.pop('create_event_guest_1');
                        }

                        if ($scope.currentInfoSection.indexOf('add_administrator') > -1) {
                            $scope.currentInfoSection.pop('add_administrator');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_form_admissions_1') > -1) {
                            $scope.currentInfoSection.pop('create_event_form_admissions_1');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_form_admissions_2') > -1) {
                            $scope.currentInfoSection.pop('create_event_form_admissions_2');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_form_admissions_3') > -1) {
                            $scope.currentInfoSection.pop('create_event_form_admissions_3');
                        }

                        $scope.showHide.template = 'partials/create-event-details.html';
                        break;
                    case 3:
                        $scope.progress = 50;
                        $scope.saveButtonText = 'Save & Continue';

                        if ($scope.currentInfoSection.indexOf('create_event_form_1') === -1) {
                            $scope.currentInfoSection.push('create_event_form_1');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_form_2') === -1) {
                            $scope.currentInfoSection.push('create_event_form_2');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_seat_layout') === -1) {
                            $scope.currentInfoSection.push('create_event_seat_layout');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_form_3') === -1) {
                            $scope.currentInfoSection.push('create_event_form_3');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_detail_1') === -1) {
                            $scope.currentInfoSection.push('create_event_detail_1');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_detail_2') === -1) {
                            $scope.currentInfoSection.push('create_event_detail_2');
                        }

                        if ($scope.currentInfoSection.indexOf('add_administrator') === -1) {
                            $scope.currentInfoSection.push('add_administrator');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_form_admissions_1') === -1) {
                            $scope.currentInfoSection.push('create_event_form_admissions_1');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_form_admissions_2') === -1) {
                            $scope.currentInfoSection.push('create_event_form_admissions_2');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_form_admissions_3') === -1) {
                            $scope.currentInfoSection.push('create_event_form_admissions_3');
                        }

                        if ($scope.currentInfoSection.indexOf('final_event') > -1) {
                            $scope.currentInfoSection.pop('final_event');
                        }

                        if ($scope.currentInfoSection.indexOf('promote_event') > -1) {
                            $scope.currentInfoSection.pop('promote_event');
                        }

                        if ($scope.currentInfoSection.indexOf('invite_guest_list') > -1) {
                            $scope.currentInfoSection.pop('invite_guest_list');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_guest_1') > -1) {
                            $scope.currentInfoSection.pop('create_event_guest_1');
                        }

                        $scope.showHide.template = 'partials/create-event-admission.html';
                        break;
                    case 4:
                        $scope.progress = 75;
                        $scope.saveButtonText = 'Save & Continue';

                        if ($scope.currentInfoSection.indexOf('create_event_form_1') === -1) {
                            $scope.currentInfoSection.push('create_event_form_1');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_form_2') === -1) {
                            $scope.currentInfoSection.push('create_event_form_2');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_seat_layout') === -1) {
                            $scope.currentInfoSection.push('create_event_seat_layout');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_form_3') === -1) {
                            $scope.currentInfoSection.push('create_event_form_3');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_detail_1') === -1) {
                            $scope.currentInfoSection.push('create_event_detail_1');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_detail_2') === -1) {
                            $scope.currentInfoSection.push('create_event_detail_2');
                        }

                        if ($scope.currentInfoSection.indexOf('add_administrator') === -1) {
                            $scope.currentInfoSection.push('add_administrator');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_form_admissions_1') === -1) {
                            $scope.currentInfoSection.push('create_event_form_admissions_1');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_form_admissions_2') === -1) {
                            $scope.currentInfoSection.push('create_event_form_admissions_2');
                        }

                        if ($scope.currentInfoSection.indexOf('create_event_form_admissions_3') === -1) {
                            $scope.currentInfoSection.push('create_event_form_admissions_3');
                        }

                        if ($scope.currentInfoSection.indexOf('invite_guest_list') === -1) {
                            $scope.currentInfoSection.push('invite_guest_list');
                        }

                        if ($scope.currentInfoSection.indexOf('final_event') === -1) {
                            $scope.currentInfoSection.push('final_event');
                        }

                        if ($scope.currentInfoSection.indexOf('promote_event') === -1) {
                            $scope.currentInfoSection.push('promote_event');
                        }

                        $scope.showHide.template = 'partials/invite_guest.html';
                        break;
                }

            };

            $scope.back = function () {
                switch ($scope.currentInfoSection.length) {
                    case 2:
                        $scope.currentInfoSection.pop('create_event_form_2');
                        break;
                    case 3:
                        $scope.currentInfoSection.pop('create_event_form_3');
                        break;
                    case 4:
                        $scope.showHide.template = 'partials/basic-info.html';
                        $scope.currentInfoSection.pop('create_event_detail_1');
                        break;
                    case 5:
                        $scope.currentInfoSection.pop('create_event_detail_2');
                        if ($scope.action == 'edit' || $scope.action == 'create') {
                            $scope.currentInfoSection.pop('create_event_detail_1');
                            $scope.showHide.template = 'partials/basic-info.html';
                        }
                        break;
                    case 6:
                        $scope.showHide.template = 'partials/create-event-details.html';
                        $scope.currentInfoSection.pop('create_event_form_admissions_1');
                        $scope.continuecounter = false;
                        break;
                    case 7:
                        $scope.currentInfoSection.pop('create_event_seat_layout');
                        break;
                    case 8:
                        $scope.currentInfoSection.pop('create_event_seat_layout');
                        break;
                    case 9:
                        $scope.currentInfoSection.pop('create_event_form_admissions_3');
                        $scope.currentInfoSection.pop('create_event_form_admissions_2');
                        $scope.currentInfoSection.pop('create_event_form_admissions_1');
                        $scope.showHide.template = 'partials/create-event-details.html';
                        break;
                    case 10:
                        $scope.showHide.template = 'partials/create-event-admission.html';
                        $scope.currentInfoSection.pop('create_event_guest_1');
                        if ($scope.displayEvent.event_type === 'free' && !$scope.displayEvent.admission_event_type) {
                            $scope.currentInfoSection.pop('create_event_form_admissions_3');
                            $scope.currentInfoSection.pop('create_event_form_admissions_2');
                        }
                        break;
                    case 11:
                        $scope.showHide.template = 'partials/add-guest-page.html';
                        $scope.currentInfoSection.pop('invite_guest_list');
                        break;
                    case 12:
                        $scope.currentInfoSection.pop('add_administrator');
                        break;
                    case 13:
                        $scope.currentInfoSection.pop('promote_event');
                        if ($scope.action == 'edit' || $scope.action == 'create') {
                            $scope.currentInfoSection.pop('add_administrator');
                            $scope.currentInfoSection.pop('invite_guest_list');
                            $scope.currentInfoSection.pop('create_event_guest_1');
                            $scope.showHide.template = 'partials/add-guest-page.html';
                            $scope.showHide.template = 'partials/create-event-admission.html';
                        }
                        break;
                    case 14:
                        $scope.showHide.template = 'partials/invite_guest.html';
                        $scope.currentInfoSection.pop('final_event');
                        $scope.saveButtonText = 'Continue';
                        break;
                }
                $scope.updateProgress();
            };

            $scope.selectCategory = function () {
                if ($scope.selectedCategory === 'performing-arts') {
                    $scope.selectedCategory = "programing-arts";
                }
                $scope.displayEvent.selectedCategory = $scope.categories.filter(c => c.id === $scope.selectedCategory);
            };
            $scope.continuecounter = false;
            $scope.disableContinue = function () {
                // Integrate through all shown forms
                let disableContinue = true;

                if ($scope.currentInfoSection && $scope.currentInfoSection.length > 0) {
                    let formsValid = true;
                    for (let form of $scope.currentInfoSection) {
                        if (form in $scope.createEventForms && $scope.createEventForms[form]) {
                            formsValid = formsValid && $scope.createEventForms[form].$valid;
                            if ($scope.createEventForms[form].$error && Object.keys($scope.createEventForms[form].$error).length > 0) {
                                formsValid = false;
                            }
                            if (form === 'create_event_form_1' && (!$scope.displayEvent.selectedCategory || $scope.displayEvent.selectedCategory.length === 0)) {
                                // Check if category is set
                                formsValid = false;
                            }
                            if (form === 'create_event_form_2' && (!$scope.displayEvent.venue_is || $scope.displayEvent.venue_is === 0) || form === 'create_event_form_2' && (!$scope.displayEvent.chosenPlace)) {
                                // Check if venue is set
                                formsValid = false;
                            } else if (form === 'create_event_detail_1' && (!$scope.displayEvent.files || $scope.displayEvent.files.length === 0)) {
                                // Check if image is set
                                formsValid = false;
                            } else if (form === 'create_event_detail_2' && (!$scope.displayEvent.description || $scope.displayEvent.description.trim().length === 0 || $scope.descriptionLength < 50)) {
                                // Check if description is set
                                // formsValid = false;
                            } else if (form === 'create_event_form_admissions_1') {
                                if ($scope.user.stripe_account_id === '' || $scope.userBankList.length === 0) {
                                    if ($scope.displayEvent.event_type === 'paid') {
                                        formsValid = false;
                                    }
                                }
                                if (($scope.action === 'Create') && $scope.continuecounter && $scope.displayEvent.event_type === 'free' && $scope.displayEvent.admission_event_type && $scope.displayEvent.ticketsArr.length === 0) {
                                    formsValid = false;
                                }
                                if ($scope.displayEvent.admission_event_type) {
                                    $scope.continuecounter = true;
                                }
                                // Check if ticket type is free and free admission ticket is required
                                if (($scope.displayEvent.event_type == 'free' && $scope.displayEvent.seat_layout == 'design' && $scope.displayEvent.ticketsArr.length === 0) || ($scope.displayEvent.event_type === 'free' && $scope.displayEvent.admission_event_type && $scope.displayEvent.ticketsArr.length === 0)) {
                                    formsValid = false;
                                }
                                // Check if ticket type is free and free admission ticket is required
                                if ($scope.displayEvent.event_type == 'paid' && $scope.displayEvent.ticketsArr.length === 0) {
                                    formsValid = false;
                                }
                            } else if (form === 'create_event_form_admissions_2' && $scope.user.stripe_account_id === '') {
                                formsValid = false;
                            } else if (form === 'create_event_form_admissions_3') {
                                // Check if ticket type is free and free admission ticket is required
                                if (($scope.displayEvent.event_type == 'free' && $scope.displayEvent.seat_layout == 'design') || ($scope.displayEvent.event_type === 'free' && $scope.displayEvent.admission_event_type && $scope.displayEvent.ticketsArr.length === 0)) {
                                    formsValid = false;
                                }
                                // Check if ticket type is free and free admission ticket is required
                                if ($scope.displayEvent.event_type == 'paid' && $scope.displayEvent.ticketsArr.length === 0) {
                                    formsValid = false;
                                }
                            } else if (form === 'promote_event' && (!$scope.selectedPlan && $scope.action === 'claim')) {
                                formsValid = false;
                            } else if (form === 'promote_event' && ($scope.selectedPlan && $scope.validationErrors)) {
                                formsValid = false;
                            }
                        }
                    }
                    disableContinue = !formsValid;
                }

                if ($scope.completedStep.includes($scope.currentStep)) {
                    disableContinue = false;
                }

                return disableContinue;
            };

            $scope.disabledSavePaypal = function () {
                if ($scope.createEventForms.create_event_form_admissions_2.$valid) return false;
                else return true;
            };

            $scope.showBackBtn = function () {
                let showBackBtn = false;
                if ($scope.currentStep > 1) {
                    if ($scope.currentInfoSection && $scope.currentInfoSection.length > 1) {
                        showBackBtn = true;
                    }
                    if (($scope.action == 'edit' || $scope.action == 'create') && $scope.currentInfoSection && $scope.currentInfoSection.length <= 4) {
                        showBackBtn = false;
                    }
                }
                return showBackBtn;
            };

            $scope.saveExit = function() {
                $scope.loading = true;
                $scope.loadingMessage = "Saving Event...";
                $scope.saveEvent($scope.displayEvent.is_draft, true);
                authService.remove('event_action_id');
                if (angular.element('#close-icon')) {
                    angular.element('#close-icon').click();
                }
            };

            $scope.exit = function () {
                if (angular.element('#close-icon')) {
                    angular.element('#close-icon').click();
                }
                setTimeout(function() {
                    $window.location.href = '/manageevent';
                }, 1000);
            };

            $scope.createFreeTicket = function (addMore, ticketindex) {
                $scope.validateTime($scope.displayEvent.tickets.saleStartDate.date, $scope.displayEvent.tickets.saleStartDate.time, $scope.displayEvent.tickets.saleEndDate.date, $scope.displayEvent.tickets.saleEndDate.time, 'create_event_form_admissions_3', 'saleStartDate');
                // Check edit Index // Clone the ticket
                let newTicket = JSON.parse(JSON.stringify($scope.displayEvent.tickets));
                newTicket.saleStartDate.date = ($scope.displayEvent.tickets.saleStartDate.date).format("YYYY-MM-DD");
                newTicket.saleStartDate.time = moment($scope.displayEvent.tickets.saleStartDate.time, 'hh:mma').format("HH:mm");
                newTicket.saleEndDate.date = ($scope.displayEvent.tickets.saleEndDate.date).format("YYYY-MM-DD");
                newTicket.saleEndDate.time = moment($scope.displayEvent.tickets.saleEndDate.time, 'hh:mma').format("HH:mm");
                newTicket.is_absorb = $scope.is_absorb;
                newTicket.service_fee = parseFloat($scope.service_fee);
                newTicket.stripe_fee = parseFloat($scope.processing_fee);
                newTicket.total_price = parseFloat($scope.buyer_total);
                newTicket.price = parseFloat($scope.displayEvent.tickets.price);
                newTicket.remaining_qty = $scope.displayEvent.tickets.quantity;
                newTicket.ticket_type = $scope.displayEvent.tickets.ticket_type;
                newTicket.allow_to_action = true;

                if (ticketindex > -1) {
                    $scope.displayEvent.ticketsArr.splice(ticketindex, 1, newTicket);
                } else {
                    if (newTicket.ticket_id <= 0) {
                        delete newTicket.ticket_id;
                    }
                    $scope.displayEvent.ticketsArr.push(newTicket);
                }
                // Remove edit mode
                $scope.showHide.editTicketIndex = -1;

                if (addMore) {
                    $scope.ticketIndex = -1;
                    $scope.displayEvent.tickets.ticket_name = '';
                    $scope.displayEvent.tickets.quantity = '';
                    $scope.displayEvent.tickets.description = '';
                    $scope.createEventForms.create_event_form_admissions_3.$setPristine();
                    $scope.createEventForms.create_event_form_admissions_3.$setUntouched();
                    $scope.createEventForms.create_event_form_admissions_3.$submitted = false;
                    $scope.createEventForms.create_event_form_admissions_3.$valid = false;
                } else {
                    $scope.freeEventTicketsModel.close();
                }
                $scope.saveDataLocal();
                $scope.flashMessage = true;
                return true;
            };

            $scope.createPaidTicket = function (addMore, ticketindex) {
                if ($scope.displayEvent.tickets.ticket_type == 'paid') {
                    if ($scope.displayEvent.tickets.price == 0) {
                        let notify = {
                            type: 'error',
                            title: 'Oops!!',
                            content: "Price should be Greater than 0.",
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        return false;
                    }
                }
                // Set sales time and end time
                $scope.validateTime($scope.displayEvent.tickets.saleStartDate.date, $scope.displayEvent.tickets.saleStartDate.time, $scope.displayEvent.tickets.saleEndDate.date, $scope.displayEvent.tickets.saleEndDate.time, 'create_event_form_admissions_3', 'saleStartDate');
                if ($scope.createEventForms.create_event_form_admissions_3.$valid) {
                    // Check edit Index // Clone the ticket
                    let newTicket = JSON.parse(JSON.stringify($scope.displayEvent.tickets));
                    newTicket.saleStartDate.date = ($scope.displayEvent.tickets.saleStartDate.date).format("YYYY-MM-DD");
                    newTicket.saleStartDate.time = moment($scope.displayEvent.tickets.saleStartDate.time, 'hh:mma').format("HH:mm");
                    newTicket.saleEndDate.date = ($scope.displayEvent.tickets.saleEndDate.date).format("YYYY-MM-DD");
                    newTicket.saleEndDate.time = moment($scope.displayEvent.tickets.saleEndDate.time, 'hh:mma').format("HH:mm");
                    newTicket.is_absorb = $scope.is_absorb;
                    newTicket.service_fee = parseFloat($scope.service_fee);
                    newTicket.stripe_fee = parseFloat($scope.processing_fee);
                    newTicket.total_price = parseFloat($scope.buyer_total);
                    newTicket.price = parseFloat($scope.displayEvent.tickets.price);
                    newTicket.remaining_qty = $scope.displayEvent.tickets.quantity;
                    newTicket.ticket_type = $scope.displayEvent.tickets.ticket_type;
                    newTicket.allow_to_action = true;
                    if (ticketindex > -1) {
                        $scope.displayEvent.ticketsArr.splice(ticketindex, 1, newTicket);
                    } else {
                        if (newTicket.ticket_id <= 0) {
                            delete newTicket.ticket_id;
                        }
                        $scope.displayEvent.ticketsArr.push(newTicket);
                    }
                    $scope.showHide.editTicketIndex = -1;
                    if (addMore) {
                        $scope.ticketIndex = -1;
                        $scope.displayEvent.tickets.ticket_name = '';
                        $scope.displayEvent.tickets.quantity = '';
                        $scope.displayEvent.tickets.description = '';
                        $scope.displayEvent.tickets.price = '';
                        $scope.displayEvent.tickets.ticket_type = 'paid';
                        $scope.is_absorb = false;
                        $scope.createEventForms.create_event_form_admissions_3.$setPristine();
                        $scope.createEventForms.create_event_form_admissions_3.$setUntouched();
                        $scope.createEventForms.create_event_form_admissions_3.$submitted = false;
                        $scope.createEventForms.create_event_form_admissions_3.$valid = false;
                    } else {
                        $scope.paidEventTicketsModel.close();
                    }
                    return true;
                }
                if (addMore) {
                    $scope.ticketIndex = -1;
                    $scope.displayEvent.tickets.ticket_name = '';
                    $scope.displayEvent.tickets.quantity = '';
                    $scope.displayEvent.tickets.description = '';
                    $scope.displayEvent.tickets.price = '';
                    $scope.displayEvent.tickets.ticket_type = 'paid';
                    $scope.is_absorb = false;
                    $scope.createEventForms.create_event_form_admissions_3.$setPristine();
                    $scope.createEventForms.create_event_form_admissions_3.$setUntouched();
                    $scope.createEventForms.create_event_form_admissions_3.$submitted = false;
                    $scope.createEventForms.create_event_form_admissions_3.$valid = false;
                } else {
                    $scope.paidEventTicketsModel.close();
                }
                return false;
            };

            $scope.addAnotherTicket = function() {
                // Reset the ticket form
                $scope.displayEvent.tickets = getDefaultTicket();
                $scope.displayEvent.tickets.saleEndDate = {
                    date: $scope.displayEvent.end.date,
                    time: $scope.displayEvent.end.time
                };
                $scope.ticketIndex = -1;
                // Remove edit mode
                $scope.showHide.editTicketIndex = -1;
                $scope.buyer_total = 0;
                $scope.is_absorb = false;
                $scope.service_fee = 0;
                $scope.processing_fee = 0;
                $scope.ticket_base_price = 0;
            };

            $scope.resetTicketForm = function () {
                $scope.displayEvent.tickets = getDefaultTicket();
                $scope.displayEvent.tickets.saleEndDate = {
                    date: $scope.displayEvent.end.date,
                    time: $scope.displayEvent.end.time
                };
                // Remove edit mode
                $scope.showHide.editTicketIndex = -1;
            };

            $scope.deleteTicket = function (ticketIndex) {
                if ($scope.displayEvent.ticketsArr[ticketIndex] && 'local_tire_ticket_id' in $scope.displayEvent.ticketsArr[ticketIndex]) {
                    let local_tire_ticket_id = $scope.displayEvent.ticketsArr[ticketIndex].local_tire_ticket_id;
                    let ticket_delete_index = [];
                    let newTicketHolder = [];
                    angular.forEach($scope.displayEvent.ticketsArr, function (ticket, index) {
                        if (local_tire_ticket_id == ticket.local_tire_ticket_id) {
                            if ($scope.displayEvent.deleted_tickets == '') {
                                if ('ticket_id' in ticket) {
                                    $scope.displayEvent.deleted_tickets = (ticket.ticket_id).toString();
                                }
                            } else {
                                if ('ticket_id' in ticket) {
                                    let deleted_ticket_id = (ticket.ticket_id).toString();
                                    $scope.displayEvent.deleted_tickets = $scope.displayEvent.deleted_tickets + "," + deleted_ticket_id;
                                }
                            }
                            ticket_delete_index.push(index);
                        } else {
                            newTicketHolder.push(ticket);
                        }
                    });

                    $scope.displayEvent.ticketsArr = newTicketHolder;
                    $scope.saveDataLocal();
                    $scope.flashMessage = true;
                } else {
                    if ('ticket_id' in $scope.displayEvent.ticketsArr[ticketIndex]) {
                        if ($scope.displayEvent.deleted_tickets == '') {
                            $scope.displayEvent.deleted_tickets = ($scope.displayEvent.ticketsArr[ticketIndex].ticket_id).toString();
                        } else {
                            let deleted_ticket_id = ($scope.displayEvent.ticketsArr[ticketIndex].ticket_id).toString();
                            $scope.displayEvent.deleted_tickets = $scope.displayEvent.deleted_tickets + "," + deleted_ticket_id;
                        }
                    }
                    $scope.displayEvent.ticketsArr.splice(ticketIndex, 1);
                    $scope.saveDataLocal();
                    $scope.flashMessage = true;
                }

                if ($scope.displayEvent.ticketsArr.length === 0) {
                    $scope.displayEvent.tickets = getDefaultTicket();
                    $scope.displayEvent.tickets.saleEndDate = {
                        date: $scope.displayEvent.end.date,
                        time: $scope.displayEvent.end.time
                    };
                }
                confirmCancelTicketModel.close();
            };

            $scope.confirmPaypal = function () {
                $scope.user.paypal_email = $scope.displayEvent.paypal_email;
                $scope.showHide.showChangePayPalSec = false;
            };

            $scope.editFreeTicket = function (index) {

                angular.element('#ticketSaleEndDate').focus();
                angular.element('#ticketSaleEndDate').blur();
                angular.element('#ticketSaleStartDate').focus();
                angular.element('#ticketSaleStartDate').blur();

                $scope.ticketIndex = index;
                $scope.displayEvent.tickets = angular.copy($scope.displayEvent.ticketsArr[index]);
                if (typeof $scope.displayEvent.ticketsArrForEdit === 'undefined') {
                    $scope.displayEvent.tickets.saleStartDate.date = moment($scope.displayEvent.tickets.saleStartDate.date, 'YYYY-MM-DD');
                    $scope.displayEvent.tickets.saleEndDate.date = moment($scope.displayEvent.tickets.saleEndDate.date, 'YYYY-MM-DD');
                } else {
                    if (typeof $scope.displayEvent.ticketsArrForEdit[index] === 'undefined') {
                        $scope.displayEvent.tickets.saleStartDate.date = moment($scope.displayEvent.tickets.saleStartDate.date, 'YYYY-MM-DD');
                        $scope.displayEvent.tickets.saleEndDate.date = moment($scope.displayEvent.tickets.saleEndDate.date, 'YYYY-MM-DD');
                    } else {
                        let original_tickets = $scope.displayEvent.ticketsArrForEdit[index];
                        $scope.displayEvent.tickets.saleStartDate.date = moment(original_tickets.sale_start_date, 'YYYY-MM-DD');
                        $scope.displayEvent.tickets.saleEndDate.date = moment(original_tickets.sale_end_date, 'YYYY-MM-DD');
                    }
                }

                $scope.displayEvent.tickets.saleStartDate.time = moment($scope.displayEvent.tickets.saleStartDate.time, 'hh:mma').format('h:mma');
                $scope.displayEvent.tickets.saleEndDate.time = moment($scope.displayEvent.tickets.saleEndDate.time, 'hh:mma').format('h:mma');
                $scope.displayEvent.tickets.price = ($scope.displayEvent.tickets.price);
                $scope.displayEvent.tickets.ticket_id = ($scope.displayEvent.tickets.ticket_id) ? $scope.displayEvent.tickets.ticket_id : index;
                $scope.price = $scope.displayEvent.tickets.price;
                $scope.buyer_total = $scope.displayEvent.tickets.total_price;
                $scope.is_absorb = ($scope.displayEvent.tickets.is_absorb == 1) ? true : false;
                $scope.service_fee = $scope.displayEvent.tickets.service_fee;
                $scope.processing_fee = $scope.displayEvent.tickets.stripe_fee;
                $scope.ticket_base_price = $scope.displayEvent.tickets.price;
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.modelAction = 'Edit';
                $scope.freeEventTicketsModel = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/freeEventTickets.html',
                    openedClass: 'pa-create-event-modal freeEventTickets scroll_popup popup_wtd_700',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            $scope.editPaidTicket = function (index) {

                angular.element('#ticketSaleEndDate').focus();
                angular.element('#ticketSaleEndDate').blur();
                angular.element('#ticketSaleStartDate').focus();
                angular.element('#ticketSaleStartDate').blur();

                $scope.ticketIndex = index;
                $scope.displayEvent.tickets = angular.copy($scope.displayEvent.ticketsArr[index]);

                if (typeof $scope.displayEvent.ticketsArrForEdit === 'undefined') {
                    $scope.displayEvent.tickets.saleStartDate.date = moment($scope.displayEvent.tickets.saleStartDate.date, 'YYYY-MM-DD');
                    $scope.displayEvent.tickets.saleEndDate.date = moment($scope.displayEvent.tickets.saleEndDate.date, 'YYYY-MM-DD');
                } else {
                    if (typeof $scope.displayEvent.ticketsArrForEdit[index] === 'undefined') {
                        $scope.displayEvent.tickets.saleStartDate.date = moment($scope.displayEvent.tickets.saleStartDate.date, 'YYYY-MM-DD');
                        $scope.displayEvent.tickets.saleEndDate.date = moment($scope.displayEvent.tickets.saleEndDate.date, 'YYYY-MM-DD');
                    } else {
                        let original_tickets = $scope.displayEvent.ticketsArrForEdit[index];
                        $scope.displayEvent.tickets.saleStartDate.date = moment(original_tickets.sale_start_date, 'YYYY-MM-DD');
                        $scope.displayEvent.tickets.saleEndDate.date = moment(original_tickets.sale_end_date, 'YYYY-MM-DD');
                    }
                }

                $scope.displayEvent.tickets.saleStartDate.time = moment($scope.displayEvent.tickets.saleStartDate.time, 'hh:mma').format('h:mma');
                $scope.displayEvent.tickets.saleEndDate.time = moment($scope.displayEvent.tickets.saleEndDate.time, 'hh:mma').format('h:mma');
                $scope.displayEvent.tickets.price = ($scope.displayEvent.tickets.price);
                $scope.price = $scope.displayEvent.tickets.price;
                $scope.buyer_total = $scope.displayEvent.tickets.total_price;
                $scope.is_absorb = ($scope.displayEvent.tickets.is_absorb == 1) ? true : false;
                $scope.service_fee = $scope.displayEvent.tickets.service_fee;
                $scope.processing_fee = $scope.displayEvent.tickets.stripe_fee;
                $scope.ticket_base_price = $scope.displayEvent.tickets.price;
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.modelAction = 'Edit';
                $scope.paidEventTicketsModel = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/paidEventTickets.html',
                    openedClass: 'pa-create-event-modal freeEventTickets scroll_popup popup_wtd_700',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            $scope.changePayPalAccount = function (e) {
                let user = authService.getUser();
                if (user) {
                    let paypal_email = $scope.displayEvent.paypal_email;
                    $scope.buttonText = 'Updating...';
                    userService.updateUserPaypalEmail(paypal_email)
                        .then(() => {
                            $scope.buttonText = 'Change';
                            $scope.user.paypal_email = paypal_email;
                            Utils.applyChanges($scope);
                        })
                        .catch(err => {
                            $scope.buttonText = 'Change';
                            Utils.showError($scope, 'Unable to update email. Please contact administrator');
                            Utils.applyChanges($scope);
                        });
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

            let upsertEvent = (data, event_id) => {
                let finalResponse = null;
                let promise = null;
                let token = authService.get('token');
                if ('tickets' in data && $scope.action === 'Create') {
                    delete data.start_date_time;
                    delete data.end_date_time;
                }

                if ($scope.selectedPlan) {
                    let plan = {
                        "plan_id": $scope.selectedPlan.id,
                        "plan_amount": $scope.selectedPlan.amount
                    };
                    data.planInformation = plan;
                    data.event_id = event_id;
                }
                if ($scope.action === 'Create' && event_id == 0) {
                    promise = awsService.post('/event/add', data, token);
                } else {
                    promise = awsService.put(`/event/update/${ event_id }`, data, token);
                }

                return promise.then(res => {
                        if (res && 'event_id' in res) {
                            finalResponse = res;
                            $scope.displayEvent.event_id = res.event_id;
                            $scope.saveDataLocal();
                            if (res.event_id && !$scope.showHide.isMobile.matches) {
                                $window.location.href = "/eventDetails?ev=" + res.event_id;
                            }
                        }
                        // If event image is present then upload else do not upload the file
                        if ($scope.displayEvent.files && (($scope.action === 'Create' && $scope.ImageUploadDone) || ($scope.action !== 'Create' && $scope.displayEvent.files != $scope.edit_image_url))) {
                            let fileName = $scope.user.user_id + '-' + Date.now() + '.png';
                            let blob = dataURItoBlob($scope.displayEvent.files);
                            let file = new File([blob], fileName);

                            let aws_config = {
                                'bucket': config.AWS_BUCKET,
                                'access_key': config.AWS_ACCESS_KEY,
                                'secret_key': config.AWS_SECRET_KEY,
                                'region': config.AWS_REGION,
                                'path': config.EVENT_IMG_UPLOAD_FOLDER,
                                'img_show_url': config.AWS_IMG_SHOW_URL
                            };
                            return eventsService.uploadImg(file, aws_config);
                        } else {
                            return Promise.resolve(res);
                        }
                    })
                    .then((response) => {
                        if (response && response.file_url) {
                            $scope.displayEvent.event_image = response.file_url;
                            let img_data = {};
                            img_data.event_image = response.file_url;
                            img_data.event_access_type = $scope.displayEvent.event_access_type;
                            awsService.put(`/event/update/${$scope.displayEvent.event_id}`, img_data, token).then(() => {
                                $scope.ImageUploadDone = false;
                                Utils.applyChanges($scope);
                            });
                        }
                        return Promise.resolve(finalResponse);
                    });

            };

            $scope.makePayment = function () {

                // Send the token to your server.
                $scope.loading = true;
                stripe.createToken(card)
                    .then((result) => {
                        if (result && result.error) {
                            // Inform the customer that there was an error.
                            Utils.showError($scope, result.error.message);
                            $scope.validationErrors = true;
                            return Promise.reject();
                        } else if (result) {
                            $scope.displayEvent.stripeToken = result;
                            $scope.displayEvent.highlighted = true;
                            $scope.displayEvent.sponsored_event = true;
                        }
                        $scope.saveEvent($scope.displayEvent.is_draft);
                    })
                    .catch(err => {
                        console.log('error in making payment is::', err);
                        $scope.loading = false;
                    });
            };

            $scope.goBackMobile = function () {
                if ($scope.showHide.isMobile.matches) {
                    $scope.showHide.mobile.eventsuccess = false;
                    $scope.showHide.mobile.createnewevent = true;
                } else {
                    $window.location.href = '/manageevent';
                }
            };

            $scope.saveEvent = function (draft, exit) {
                $scope.displayEvent.is_draft = draft;
                // code to make event in live during edit.
                if ($scope.editEventDraftFlag) {
                    draft = $scope.editEventDraftStatus;
                }

                if (!$scope.displayEvent.is_draft) {
                    draft = false;
                }

                let temp_start_date = moment(moment($scope.displayEvent.start.date).format('YYYY-MM-DD') + ' ' + $scope.displayEvent.start.time, 'YYYY-MM-DD h:mma').format('YYYY-MM-DD HH:mm:ss');
                let temp_end_date = moment(moment($scope.displayEvent.end.date).format('YYYY-MM-DD') + ' ' + $scope.displayEvent.end.time, 'YYYY-MM-DD h:mma').format('YYYY-MM-DD HH:mm:ss');
                let data = {
                    event_name: ($scope.displayEvent.event_name) ? $scope.displayEvent.event_name : '',
                    description: $scope.displayEvent.description,
                    start_date_time: temp_start_date,
                    end_date_time: temp_end_date,
                    longitude: $scope.displayEvent.longitude,
                    latitude: $scope.displayEvent.latitude,
                    timezone: $scope.displayEvent.timezone,
                    sponsored_event: $scope.displayEvent.sponsored_event,
                    start_date_time_ms: $scope.displayEvent.start.date.valueOf(),
                    end_date_time_ms: $scope.displayEvent.end.date.valueOf(),
                    share_counter: 0,
                    is_draft: draft,
                    is_seating_layout: $scope.displayEvent.seat_layout === 'design' ? 1 : 0,
                    is_attendee_pick: ($scope.displayEvent.pickSeats) ? 1 : 0,
                    isPHQ: $scope.displayEvent.isPHQ,
                };

                if ($scope.displayEvent.venue_is[0]) {
                    if ($scope.displayEvent.venue_is[0].key) {
                        data.venue_is = $scope.displayEvent.venue_is[0].key;
                    } else {
                        data.venue_is = $scope.displayEvent.venue_is;
                    }
                }

                if ($scope.displayEvent.selectedCategory[0]) {
                    if ($scope.displayEvent.selectedCategory[0].id) {
                        data.category = $scope.displayEvent.selectedCategory[0].id;
                    } else {
                        data.category = $scope.displayEvent.selectedCategory;
                    }
                } else {
                    data.category = $scope.displayEvent.selectedCategory.id;
                }

                if ($scope.displayEvent.zone_id[0]) {
                    if ($scope.displayEvent.zone_id[0].zone_id) {
                        data._zone_id = $scope.displayEvent.zone_id[0].zone_id;
                    } else {
                        data._zone_id = $scope.displayEvent.zone_id;
                    }
                }

                if ($scope.displayEvent.email) {
                    data.email = $scope.displayEvent.email;
                }

                if ($scope.displayEvent.phone) {
                    data.phone = $scope.countryCode + ' ' + $scope.displayEvent.phone;
                }

                if ($scope.displayEvent.website) {
                    data.websiteurl = $scope.displayEvent.website;
                }

                if ($scope.displayEvent.admission_event_type) {
                    data.admission_ticket_type = $scope.displayEvent.admission_event_type;
                } else {
                    data.admission_ticket_type = $scope.displayEvent.admission_event_type;
                }

                if ($scope.displayEvent.event_type) {
                    $scope.displayEvent.ticket_type = $scope.displayEvent.event_type;
                    data.event_type = $scope.displayEvent.event_type;
                }

                if ($scope.displayEvent.address && 'streetAddress' in $scope.displayEvent.address && $scope.displayEvent.address.streetAddress !== null) {
                    data.street_address = $scope.displayEvent.address.streetAddress;
                }

                if ($scope.displayEvent.address && $scope.displayEvent.address !== null) {
                    data.address = $scope.displayEvent.address.streetAddress + ", " + $scope.displayEvent.address.city + ", " + $scope.displayEvent.address.state + ", " + $scope.displayEvent.address.country + ", " + $scope.displayEvent.address.zipcode;
                }

                if ($scope.displayEvent.address && 'city' in $scope.displayEvent.address && $scope.displayEvent.address.city !== null) {
                    data.city = $scope.displayEvent.address.city;
                }

                if ($scope.displayEvent.address && 'state' in $scope.displayEvent.address && $scope.displayEvent.address.state !== null) {
                    data.state = $scope.displayEvent.address.state;
                    data.address_state = $scope.displayEvent.address.state;
                }

                if ($scope.displayEvent.address && 'country' in $scope.displayEvent.address && $scope.displayEvent.address.country !== null) {
                    data.country = $scope.displayEvent.address.country;
                }

                if ($scope.displayEvent.address && 'zipcode' in $scope.displayEvent.address && $scope.displayEvent.address.zipcode !== null) {
                    data.zipcode = $scope.displayEvent.address.zipcode;
                }

                if ($scope.displayEvent.country_code) {
                    data.country_code = $scope.displayEvent.country_code;
                }

                if ($scope.displayEvent.venue_is.key == 'tobeannoun') {

                    data.address = $scope.displayEvent.chosenPlace;
                    let splitedArr = $scope.displayEvent.chosenPlace.split(",");

                    switch (splitedArr.length) {
                        case 4:
                            data.street_address = splitedArr[0];
                            data.city = splitedArr[1];
                            data.state = splitedArr[2];
                            data.country = splitedArr[3];
                            break;
                        case 3:
                            data.city = splitedArr[0];
                            data.state = splitedArr[1];
                            data.country = splitedArr[2];
                            break;
                        case 2:
                            data.state = splitedArr[0];
                            data.country = splitedArr[1];
                            break;
                        case 1:
                            data.country = splitedArr[0];
                            break;
                        default:
                            data.country = '';
                    }

                }

                if ($scope.displayEvent.event_image) {
                    data.event_image = $scope.displayEvent.event_image;
                } else if (!$scope.displayEvent.event_image) {
                    data.event_image = '';
                }

                if ($scope.displayEvent.event_access_type) {
                    data.event_access_type = $scope.displayEvent.event_access_type;
                }

                if ($scope.action === 'Create' && !$scope.TicketCreateFlag && $scope.displayEvent.ticketsArr && $scope.displayEvent.ticketsArr.length > 0) {

                    data.tickets = [];
                    data.bank_id = $scope.displayEvent.bank_id;

                    for (let ticket of $scope.displayEvent.ticketsArr) {
                        let ticket_price = 0;
                        if (ticket.ticket_type == 'paid') {
                            ticket_price = (ticket.is_absorb) ? ticket.total_price : (ticket.total_price - ticket.service_fee);
                        } else {
                            ticket.service_fee = 0;
                            ticket.stripe_fee = 0;
                            ticket.total_price = 0;
                        }
                        let t = {
                            ticket_name: ticket.ticket_name,
                            ticket_type: ticket.ticket_type,
                            quantity: ticket.quantity,
                            price: ticket_price,
                            is_absorb: ticket.is_absorb,
                            service_fee: ticket.service_fee,
                            stripe_fee: ticket.stripe_fee,
                            total_price: ticket.total_price,
                            min_quant_per_order: ticket.ticketPerOrderMinQuant,
                            max_quant_per_order: ticket.ticketPerOrderMaxQuant,
                            description: ticket.description
                        };

                        if ('ticket_id' in ticket && ticket.ticket_id > -1) {
                            t.ticket_id = ticket.ticket_id;
                            t.sale_start_date = moment(ticket.saleStartDate.date, 'dddd, MMMM D, YYYY').format('YYYY-MM-DD');
                            t.sale_start_time = moment(ticket.saleStartDate.time, 'hh:mma').format('HH:mm');
                            t.sale_end_date = moment(ticket.saleEndDate.date, 'dddd, MMMM D, YYYY').format('YYYY-MM-DD');
                            t.sale_end_time = moment(ticket.saleEndDate.time, 'hh:mma').format('HH:mm');
                        } else {
                            t.sale_start_date = ticket.saleStartDate.date;
                            t.sale_start_time = ticket.saleStartDate.time;
                            t.sale_end_date = ticket.saleEndDate.date;
                            t.sale_end_time = ticket.saleEndDate.time;
                        }
                        data.tickets.push(t);

                    }
                    $scope.TicketCreateFlag = true;
                }

                if (($scope.action === 'create' || $scope.action === 'edit' || $scope.action === 'claim') && $scope.displayEvent.ticketsArr && $scope.displayEvent.ticketsArr.length > 0) {
                    data.tickets = [];
                    data.bank_id = $scope.displayEvent.bank_id;

                    if ($scope.seatMapCreated) {
                        let temp_ticket_Arr = $scope.displayEvent.ticketsArr;
                        let local_tire_ticket_id = '';
                        let new_temp_arr = [];
                        for (let ticket of temp_ticket_Arr) {
                            if ('tier_details' in ticket) {
                                if (local_tire_ticket_id != ticket.local_tire_ticket_id) {
                                    ticket.total_price = ticket.price;
                                    delete ticket._tier_id;
                                    delete ticket.price;
                                    delete ticket.ticket_id;
                                    new_temp_arr.push(ticket);
                                    local_tire_ticket_id = ticket.local_tire_ticket_id;
                                }
                            }
                        }
                        $scope.displayEvent.ticketsArr = new_temp_arr;
                    }

                    for (let ticket of $scope.displayEvent.ticketsArr) {
                        let ticket_price = 0;
                        if (ticket.ticket_type == 'paid') {
                            ticket_price = (ticket.is_absorb) ? ticket.total_price : (ticket.total_price - ticket.service_fee);
                        } else {
                            ticket.service_fee = 0;
                            ticket.stripe_fee = 0;
                            ticket.total_price = 0;
                        }
                        let t = {
                            ticket_name: ticket.ticket_name,
                            ticket_type: ticket.ticket_type,
                            quantity: ticket.quantity,
                            price: ticket_price,
                            is_absorb: ticket.is_absorb,
                            service_fee: ticket.service_fee,
                            stripe_fee: ticket.stripe_fee,
                            total_price: ticket.total_price,
                            min_quant_per_order: ticket.ticketPerOrderMinQuant,
                            max_quant_per_order: ticket.ticketPerOrderMaxQuant,
                            description: ticket.description
                        };

                        if ('ticket_id' in ticket && ticket.ticket_id > -1) {
                            if ((ticket.saleStartDate.date).length > 10) {
                                t.sale_start_date = moment(ticket.saleStartDate.date, 'dddd, MMMM D, YYYY').format('YYYY-MM-DD');
                                t.sale_end_date = moment(ticket.saleEndDate.date, 'dddd, MMMM D, YYYY').format('YYYY-MM-DD');
                            } else {
                                t.sale_start_date = ticket.saleStartDate.date;
                                t.sale_end_date = ticket.saleEndDate.date;
                            }

                            t.sale_start_time = moment(ticket.saleStartDate.time, 'hh:mma').format('HH:mm');
                            t.sale_end_time = moment(ticket.saleEndDate.time, 'hh:mma').format('HH:mm');
                        } else {
                            t.sale_start_date = ticket.saleStartDate.date;
                            t.sale_start_time = ticket.saleStartDate.time;
                            t.sale_end_date = ticket.saleEndDate.date;
                            t.sale_end_time = ticket.saleEndDate.time;
                        }

                        if ('ticket_group_id' in ticket) {
                            t.ticket_group_id = ticket.ticket_group_id;
                        }

                        if (ticket.ticket_group_id != '') {
                            t.ticket_id = ticket.ticket_id;
                        }

                        if ('tier_details' in ticket) {
                            t.tier_details = ticket.tier_details;
                        }
                        data.tickets.push(t);
                    }
                }

                if ($scope.action === 'Create' && !$scope.UserCreateFlag && $scope.displayEvent.guest_user && $scope.displayEvent.guest_user.length > 0) {
                    data.guest_user = $scope.displayEvent.guest_user;
                    $scope.UserCreateFlag = true;
                }

                if ($scope.action === 'edit' && $scope.displayEvent.guest_user && $scope.displayEvent.guest_user.length > 0) {
                    data.guest_user = $scope.displayEvent.guest_user;
                }

                if ($scope.action === 'Create' && $scope.selectedAdminData.length > 0) {
                    let adminIds = (JSON.parse(JSON.stringify($scope.selectedAdminData))).map((admin) => { return admin.id; });
                    if ($scope.isCurrentUserEventAdmin == true && !adminIds.includes($scope.user.user_id)) {
                        Utils.showError($scope, "You cannot remove yourself, from admin list");
                    } else {
                        let arrayUser = [];
                        for (let admin of $scope.selectedAdminData) {
                            let data = {
                                user_id: admin.user_id
                            };
                            arrayUser.push(data);
                        }
                        data.event_admin = arrayUser;
                    }
                } else if ($scope.action === 'edit') {
                    let adminUserId = [];
                    if ($scope.selectedAdminData.length > 0) {
                        if ($scope.isCurrentUserEventAdmin == true && !adminIds.includes($scope.user.user_id)) {
                            Utils.showError($scope, "You cannot remove yourself, from admin list");
                        } else {
                            let adminUsers = [];
                            for (let admin of $scope.selectedAdminData) {
                                let data = {
                                    user_id: admin.user_id
                                };
                                adminUsers.push(data);
                            }
                            data.event_admin = adminUsers;
                        }
                    }

                    if ($scope.selectedAdminData.length > 0) {
                        for (let userdata of $scope.selectedAdminData) {
                            for (let currentData of $scope.displayEvent.event_admin) {
                                if (userdata.user_id !== currentData.user_id) {
                                    adminUserId.push(currentData.administrator_id);
                                }
                            }
                        }
                        adminUserId = adminUserId.join(',').toString();

                    } else {
                        if ($scope.displayEvent.event_admin.length > 0) {
                            for (let currentData of $scope.displayEvent.event_admin) {
                                adminUserId.push(currentData.administrator_id);
                            }
                            adminUserId = adminUserId.join(',').toString();
                        } else {
                            adminUserId = $scope.displayEvent.event_admin.map((adminUser) => { return adminUser.administrator_id; }).toString();
                        }
                    }
                }

                if ($scope.deletedAdmin.length > 0) {
                    data.deleted_admin = $scope.deletedAdmin.join(',').toString();
                }

                $scope.loading = true;
                $scope.loadingMessage = "Saving Event...";

                if ($scope.action === "edit") {
                    data.deleted_user = $scope.guestUserFromList.join(',').toString();
                }

                if ($scope.selectedPlan && (!$scope.user.selectedPlan || $scope.user.selectedPlan.id != 'unlimited') && $scope.displayEvent.stripeToken) {
                    data.payment = {
                        "token": $scope.displayEvent.stripeToken.token.id,
                        "amount": $scope.selectedPlan.amount,
                        "description": `${ $scope.selectedPlan.subtitle } for ${ $scope.user.email }`,
                        "user_id": $scope.user.id,
                        "plan_id": $scope.selectedPlan.id
                    };
                }

                if ($scope.displayEvent.deleted_tickets != '') {
                    data.deleted_tickets = $scope.displayEvent.deleted_tickets;
                }

                if ($scope.displayEvent.privacy_type.length > 0) {
                    if ($scope.displayEvent.privacy_type[0].key == 'private') {
                        data.privacy_type = 2;
                        data.event_access_type = $scope.displayEvent.event_access_type;
                        if ($scope.displayEvent.event_access_type == '3') {
                            data.password = $scope.displayEvent.password;
                        }
                        if ($scope.displayEvent.event_access_type == '2') {
                            let emaillArray = [];
                            if ($scope.guestUserList.length > 0) {
                                for (let e of $scope.guestUserList) {
                                    emaillArray.push(e.email);
                                }
                                data.private_invitation_list = emaillArray;
                            } else {
                                for (let e of $scope.displayEvent.guest_user) {
                                    emaillArray.push(e.email);
                                }
                                data.private_invitation_list = emaillArray;
                            }
                        }
                    } else {
                        data.privacy_type = 1;
                    }
                }

                delete data.event_admin;
                if (data.event_name != '' && ($scope.displayEvent.files != null || $scope.displayEvent.event_image != null) && data.start_date_time != '' && data.end_date_time != '' && data.venue_is != '' && data.timezone != '' && data.category != '' && ((data.event_type == "free" || data.event_type == "paid") && (data.admission_ticket_type !== null || data.admission_ticket_type == false))) {
                                data.is_publish_ready = true;  
                            } else {
                                data.is_publish_ready = false;
                }
                
                upsertEvent(data, $scope.displayEvent.event_id)
                    .then((res) => {
                        let event_name = $scope.displayEvent.event_name.replace(/\s+/g, '-').toLowerCase();
                        $scope.eventSharelink = encodeURIComponent($window.location.origin + `/eventdetails/${event_name}/${$scope.displayEvent.event_id}`);
                        $scope.loading = false;
                        $scope.showHide.savingDraft = false;
                        if ($scope.stripe_verification_status == '') {
                            $scope.getStripeAccountInfo($scope.displayEvent.event_id);
                        }

                        if ($scope.action === 'Create') {
                            $window.localStorage.removeItem("events");
                        }

                        if ($scope.displayEvent.event_id > 0 && $scope.getReferalLink === true) {
                            eventsService.getReferalLinkByEventId($scope.displayEvent.event_id).then((response) => {
                                let WhatsAppLink = encodeURIComponent(response.data[1].whatsapp);
                                $scope.whatsAppUrl = `https://wa.me/?text=${ WhatsAppLink }`;
                                $scope.snapchatUrl = response.data[0].snapchat;
                                $scope.facebookUrl = response.data[2].facebook;
                                $scope.emailUrl = response.data[3].email;
                                $scope.otherUrl = response.data[4].other;
                            });
                        }

                        let message = "";
                        let showMessage = authService.get('showMessage');
                        setTimeout(function () {
                            snap.creativekit.initalizeShareButtons(
                                document.getElementsByClassName("snapchat-share-button")
                            );
                        }, 1500);
                        if ((showMessage == 1) && ($scope.action === 'edit' || $scope.action === 'claim')) {
                            if ($scope.action === 'edit' && $scope.displayEvent.is_draft == false) {
                                $scope.action = 'publish';
                            } else {
                                $scope.action = 'sav';
                            }
                            message = 'Congratulations, Event has been ' + $scope.action + "ed";
                        }

                        if ($scope.action === 'Create' && !draft) {
                            $scope.createEventSuccess = true;
                        } else if ($scope.action != 'Create' && $scope.displayEvent.is_draft == false && $scope.editEvent.is_draft == 1) {
                            $scope.createEventSuccess = true;
                        } else if ($scope.action != 'Create' && $scope.displayEvent.is_draft == false && $scope.editEvent.is_draft == 0) {
                            // This means it is coming from live event
                            exit = true;
                        } else if ($scope.action === 'claim') {
                            $scope.createEventSuccess = true;
                        }
                        if (message && $route.current.params.eventId) {
                            Utils.showSuccess($scope, message);
                        }
                        if (exit) {
                            // Go to event detail page
                            // Check if mobile view
                            if ($scope.showHide.isMobile.matches) {
                                $scope.showHide.mobile.eventsuccess = true;
                                $scope.showHide.mobile.createnewevent = false;
                            } else {
                                if ($route.current.params.ev) {
                                    let message = "";
                                    if ($scope.displayEvent.is_draft) {
                                        message = 'Congratulations, Event changes has been saved in draft.';
                                    } else {
                                        message = 'Congratulations, Event changes has been saved in live.';
                                    }
                                    if (!$scope.designVenueRedirect) {
                                        Utils.showSuccess($scope, message);
                                    }
                                    if ($scope.reloadOnPage) {
                                        $window.localStorage.removeItem("localDataSet");
                                        if (!$scope.ImageUploadDone) {
                                            setTimeout(function() {
                                                $scope.reloadPage();
                                            }, 800);
                                        }
                                    }
                                } else {
                                    $window.location.href = '/manageevent';
                                }
                            }
                        } else {
                            if ($route.current.params.ev) {
                                let message = 'Congratulations, Event changes has been published.';
                                Utils.showSuccess($scope, message);
                                if ($scope.reloadOnPage) {
                                    $window.localStorage.removeItem("localDataSet");
                                    setTimeout(function() {
                                        $scope.reloadPage();
                                    }, 800);
                                }
                            }
                        }
                        if ($scope.ImageUploadDone && !exit && !$scope.designVenueRedirect) {
                            setTimeout(function() {
                                $scope.reloadPage();
                            }, 800);
                        }

                        if ($scope.designVenueRedirect) {
                            if ($scope.designVenueAction == 'create') {
                                $window.location.href = `/venueMap/${$scope.displayEvent.event_id}/create?return=create`;
                            } else {
                                $window.location.href = `/venueMap/${$scope.displayEvent.event_id}/edit?return=edit`;
                            }
                        }
                        metaTagsService.setDefaultTags({
                            'title': $scope.displayEvent.event_name + ', ' + moment($scope.displayEvent.start_date_time).format("ddd, MMM D, YYYY hh:00 A") + ' | The Promo App',
                            'description': "The Promo App makes social event networking and event management easier than ever before. Find events, buy and sell tickets, promote events, and more.",
                            'keywords': 'The Promo App, event management, event promotion, manage events'
                        });
                    });
            };

            const getEvent = function (eventId) {
                let finalResponse = null;
                return eventsService.getEventDetails(eventId)
                    .then(res => {
                        if (res.status == 200) {
                            let data = res.data;
                            dataTransfer.setUserDetails(data);
                            $scope.sidebarBlock = true;
                            if (data.success) {
                                finalResponse = data.data;
                                if (finalResponse) {
                                    if ($scope.action == 'claim') {
                                        return locationService.getAddressByLatLong(finalResponse.latitude, finalResponse.longitude);
                                    } else if (!('country_code' in finalResponse && finalResponse.country_code) && finalResponse.address) {
                                        return locationService.getAddressByLatLong(finalResponse.latitude, finalResponse.longitude);
                                    }
                                }
                            }
                        }
                    })
                    .then((address) => {
                        if (finalResponse && address) {
                            if ($scope.action == 'claim') {

                                if ('country_code' in address && address.country_code) {
                                    finalResponse.country_code = address.country_code;
                                }

                                if ('zipcode' in address && address.zipcode) {
                                    finalResponse.zipcode = address.zipcode;
                                }

                                if ('city' in address && address.city) {
                                    finalResponse.zipcode = address.city;
                                }

                                if ('country' in address && address.country) {
                                    finalResponse.country = address.country;
                                }

                                if ('state' in address && address.state) {
                                    finalResponse.state = address.state;
                                    finalResponse.address_state = address.state;
                                }

                                if ('text' in address && address.text) {
                                    finalResponse.streetAddress = address.text;
                                }

                            } else {
                                if ('country_code' in address && address.country_code) {
                                    finalResponse.country_code = address.country_code;
                                }

                                if (address.address && 'country' in address.address && address.address.country && !finalResponse.country) {
                                    finalResponse.country = address.address.country;
                                }
                            }
                        }
                        return Promise.resolve(finalResponse);
                    }).catch(err => {
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
                    }).finally(() => {
                        $scope.loading = false;
                    });
            };

            // JavaScript Version
            function validate(form) {
                angular.forEach(form, function (control, name) {
                    // Excludes internal angular properties
                    if (typeof name === 'string' && name.charAt(0) !== '$') {
                        // To display ngMessages
                        control.$setTouched();
                        // Runs each of the registered validators
                        control.$validate();
                    }
                });
            }

            $scope.getDefaultBank = function (userBankList) {
                angular.forEach(userBankList, function (value, key) {
                    if (value.is_default == 1) {
                        $scope.defalutBank = value;
                    }
                });

                if ($scope.action == "Create") {
                    $scope.displayEvent.bank_id = $scope.defalutBank.bank_id;
                } else if ($scope.action == "edit" && $scope.displayEvent.bank_id == "") {
                    $scope.displayEvent.bank_id = $scope.defalutBank.bank_id;
                }
            };

            $scope.getuserBankList = function () {
                userService.listingBankAccounts()
                    .then((res) => {
                        if (res && 'data' in res) {
                            $scope.userBankList = res.data;
                            $scope.getDefaultBank($scope.userBankList);
                        }
                    }).catch((err) => {
                        console.log(err);
                    });
            };

            $scope.initTimeZone = function () {
                locationService.getUserLocation()
                    .then((res) => {
                        if (res) {
                            // Get timezone 
                            locationService.getTimeZone(res.lat, res.lng)
                                .then((response) => {
                                    if (response && response.data && 'timeZoneId' in response.data && response.data.timeZoneId) {
                                        $scope.displayEvent.timezone = response.data.timeZoneId;
                                        if ($scope.action == 'create' || $scope.action == "Create") {
                                            $scope.displayEvent.start.date = moment.tz($scope.displayEvent.timezone);
                                            $scope.displayEvent.end.date = moment.tz($scope.displayEvent.timezone);
                                            $scope.dropdowns.startDateRangePicker.minDate = moment.tz($scope.displayEvent.timezone);
                                            $scope.dropdowns.endDateRangePicker.minDate = moment.tz($scope.displayEvent.timezone);
                                        }
                                    }
                                });
                        } else {
                            $scope.displayEvent.timezone = "US/Pacific";
                        }
                    }).catch((err) => {
                        console.log(err);
                    });
            };

            let getSubscriptionBasedPlans = function () {
                let subscriptionBasedPlans = config.PLANS.filter(p => p.frequency);
                let subscriptionPlans = {};
                for (let plan of subscriptionBasedPlans) {
                    subscriptionPlans[plan.id] = plan;
                }
                return subscriptionPlans;
            };

            $scope.initStripe = function () {
                // Custom styling can be passed to options when creating an Element.
                if (!$scope.isStripeInitialize) {
                    let style = Utils.stripeStyle();
                    // Create an instance of the card Element.
                    card = elements.create('cardNumber', { style: style });

                    // Add an instance of the card Element into the `card-element` <div>.
                    card.mount('#card-element');

                    let cardExpiry = elements.create('cardExpiry', { style: style });
                    cardExpiry.mount('#card-expiry');

                    let cardCvc = elements.create('cardCvc', {
                        style: style,
                        placeholder: '012',
                        classes: { base: 'cvc-code-img' }
                    });
                    cardCvc.mount('#card-cvc');

                    card.addEventListener('change', function (event) {
                        if (event.error) {
                            Utils.showError($scope, event.error.message);
                            $scope.validationErrors = true;
                        } else {
                            $scope.validationErrors = false;
                        }
                        $scope.disableContinue();
                    });
                    $scope.isStripeInitialize = true;
                }
            };

            $scope.checkTicketCreate = function () {
                if ($scope.displayEvent.ticketsArr.length > 0) {
                    Utils.showError($scope, 'First need to delete all the tickets to change the event type');
                }
            };

            $scope.selectPlan = function (plan) {
                if (plan.checked) {
                    $scope.selectedPlan = plan;
                    // Unselect other plans
                    for (let p of $scope.plans) {
                        if (p.id != plan.id) {
                            p.checked = false;
                        }

                        if (plan.id == 'unlimited') {
                            $scope.displayEvent.highlighted = true;
                            $scope.displayEvent.sponsored_event = true;
                        } else {
                            $scope.displayEvent.highlighted = false;
                        }
                    }
                    // Check if user is on unlimited plan. No need to render stripe elements instead tell user about his current plan
                    if (!$scope.user.selectedPlan) {
                        $scope.initStripe();
                        $scope.validationErrors = true;

                        if ($scope.action === 'Create') {
                            $scope.showHide.showCardDetails = true;
                        }

                        if ($scope.action != 'Create' && !$scope.editEvent.claimed_by) {
                            $scope.showHide.showCardDetails = true;
                        }
                    }

                } else {
                    $scope.selectedPlan = null;
                    $scope.showHide.showCardDetails = false;
                }
            };

            //for checking the gateway id exists or not
            $scope.loadUserCurrentPlan = function () {
                return userService.getGatewayId($scope.user)
                    .then(res => {
                        for (let p of $scope.plans) {
                            // Check if selected plan is present by default
                            if ($scope.selectedPlan && $scope.selectedPlan.id === p.id) {
                                p.checked = true;
                            } else {
                                p.checked = false;
                            }
                        }

                        if (res && 'gateway_id' in res) {
                            $scope.user.gateway = res;
                        }
                        if (res && 'current_plan_id' in res && res.current_plan_id) {
                            $scope.user.selectedPlan = config.PLANS.filter(p => p.id === res.current_plan_id)[0];
                            $scope.getActiveTickets();
                            // Check if user is on any frequency based plan
                            let subscriptionPlan = getSubscriptionBasedPlans();
                            if (res.current_plan_id in subscriptionPlan) {
                                $scope.displayEvent.plan = $scope.user.selectedPlan;
                                if ($scope.action === 'claim') {
                                    $scope.selectedPlan = $scope.user.selectedPlan;
                                }
                                $scope.displayEvent.sponsored_event = true;
                            }
                        }
                        if ($scope.action !== 'Create' && $scope.editableEvent && !$scope.displayEvent.plan) {
                            return userService.getClaimHistory();
                        } else {
                            return Promise.reject("No need to get claim history");
                        }
                    }).then(res => {
                        if (res && res.length > 0) {
                            // Check if current event is one which was already claimed by the user
                            let currentEvent = res.filter(r => r.event_id === $scope.editableEvent.id);
                            if (currentEvent && currentEvent.length > 0) {
                                $scope.displayEvent.plan = config.PLANS.filter(p => p.id == currentEvent[0].plan_id)[0];
                                $scope.displayEvent.sponsored_event = true;
                            }
                        }
                        return Promise.resolve();
                    })
                    .catch(err => {
                        console.log('error in getting gateway id on load is::', err);
                        return Promise.resolve();
                    });
            };

            $scope.goToAccount = function () {
                let eventId = $scope.displayEvent.event_id;
                location.href = `/account_history?redirect=${eventId}`;
            };

            $scope.getActiveTickets = function () {
                eventsService.getActiveTicketingEvents().then(res => {
                    $scope.getTotalActiveTickets = res;
                    $scope.totalTicketLeft = $scope.user.selectedPlan.ticketedevents - res;
                    Utils.applyChanges($scope);
                });
            };

            $scope.openAddLinkModal = function () {
                let eventModelScope = $scope.$new(false, $scope);

                let modalInstance = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/addLinkModal.html',
                    openedClass: 'pa-create-event-modal add-link-modal',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            $scope.openVenueWelcomeModal = function() {
                let eventModelScope = $scope.$new(false, $scope);
                let modalInstance = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/seatPlan/welcomeMessageDesignVenueMap.html',
                    openedClass: 'pa-create-event-modal add-link-modal scroll_popup',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            $scope.inviteEmailModal = function() {
                let eventModelScope = $scope.$new(false, $scope);
                let modalInstance = $scope.openModal('inviteThroughEmailModal.html', eventModelScope);
                modalInstance.result.then(function (result) {
                    if ($scope.AddGuestModelGlobalInstance != '') {
                        $scope.AddGuestModelGlobalInstance.close();
                    }
                    if (result && result.length > 0) {
                        let arrayFollowerList = [],
                            arrayEmailList = [];
                        for (let listFollower of result) {
                            let data = {
                                email: listFollower.email,
                                type: listFollower.type
                            };
                            arrayFollowerList.push(data);
                        }

                        for (let listFollower of result) {
                            let data = {
                                email: listFollower.email,
                                type: listFollower.type,
                                profile_pic: null,
                                selected: true
                            };
                            arrayEmailList.push(data);
                        }
                        $scope.guestUserList.push(...arrayEmailList);
                        $scope.displayEvent.guest_user.push(...arrayFollowerList);
                        if (!$scope.currentInfoSection.includes('invite_guest_list')) {
                            $scope.continue();
                        }
                    }
                });
            };

            $scope.csvModal = function () {
                $scope.guestCsvAvailable = true;
                let eventModelScope = $scope.$new(false, $scope);
                let modalInstance = $scope.openModal('csvFile.html', eventModelScope);
                modalInstance.result.then(function (result) {
                    if ($scope.AddGuestModelGlobalInstance != '') {
                        $scope.AddGuestModelGlobalInstance.close();
                    }
                    if (result) {
                        let arrayMemberList = [];
                        for (let csvDetail of result.group.members) {
                            let dataMember = {
                                email: csvDetail.email,
                                type: csvDetail.type,
                                name: csvDetail.name
                            };
                            arrayMemberList.push(dataMember);
                        }
                        let data = {
                            group: {
                                group_name: result.group.group_name,
                                members: arrayMemberList,
                            }
                        };
                        $scope.displayEvent.guest_user.push(data);
                        for (let listCSV of result.group.members) {
                            listCSV.username = listCSV.name;
                            listCSV.profile_pic = null;
                            listCSV.selected = true;
                            $scope.guestUserList.push(listCSV);
                        }
                        if (!$scope.currentInfoSection.includes('invite_guest_list')) {
                            $scope.continue();
                        }
                    }
                });
            };

            $scope.AddGuestModelGlobalInstance = '';
            $scope.addGuestlModal = function () {
                let eventModelScope = $scope.$new(false, $scope);
                $scope.AddGuestModelGlobalInstance = $scope.openModal('addMoreGuest.html', eventModelScope, 'lg', 'pa-create-event-modal add-link-modal more-guest-modal');
                $scope.loadUserGuest();
            };

            // This function is used to open a modal
            $scope.openModal = function (html, eventModelScope, size, addClass) {
                eventModelScope.user = $scope.user;
                let modalInstance = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: `../../partials/${ html }`,
                    openedClass: (addClass || 'pa-create-event-modal add-link-modal'),
                    scope: eventModelScope,
                    size: (size || 'md')
                });
                return modalInstance;
            };

            $scope.inviteMyFollower = function () {
                let eventModelScope = $scope.$new(false, $scope);
                let modalInstance = $scope.openModal('inviteMyFollower.html', eventModelScope);
                modalInstance.result.then(function (result) {
                    if ($scope.AddGuestModelGlobalInstance != '') {
                        $scope.AddGuestModelGlobalInstance.close();
                    }
                    if (result && result.length > 0) {
                        let arrayFollowerList = [];
                        for (let listFollower of result) {
                            let data = {
                                email: listFollower.email,
                                type: listFollower.type,
                                user_id: listFollower.user_id
                            };
                            arrayFollowerList.push(data);
                        }
                        for (let listFollowerList of result) {
                            listFollowerList.selected = true;
                            $scope.guestUserList.push(listFollowerList);
                        }
                        $scope.displayEvent.guest_user.push(...arrayFollowerList);
                        if (!$scope.currentInfoSection.includes('invite_guest_list')) {
                            $scope.continue();
                        }
                    }
                });
            };

            $scope.savedGuestModal = function () {
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.guests = $scope.guestList;
                let modalInstance = $scope.openModal('savedGuestModal.html', eventModelScope, 'lg');
                modalInstance.result.then(function (result) {
                    if ($scope.AddGuestModelGlobalInstance != '') {
                        $scope.AddGuestModelGlobalInstance.close();
                    }
                    if (result && result.length > 0) {
                        $scope.displayEvent.guest_user.push(...result);
                        $scope.guestUserList.push(...result);
                        if (!$scope.currentInfoSection.includes('invite_guest_list')) {
                            $scope.continue();
                        }
                    }
                });
            };

            $scope.cancel = function () {
                this.$dismiss('close');
            };

            // This function is called when user selects a image
            $scope.handleFileSelect = function (files, evt, invalidFiles) {
                let file = files;
                $rootScope.footerHide = true;
                if (file) {
                    let reader = new FileReader();
                    $scope.showHide.imageSelected = true;
                    reader.onload = function (evt) {
                        $scope.$apply(function ($scope) {
                            $scope.imageForCropping = evt.target.result;

                            if (!$scope.showHide.isMobile.matches) {
                                $mdDialog.show({
                                        controller: ['$scope', '$mdDialog', 'imageForCropping', function($scope, $mdDialog, imageForCropping) {
                                            $scope.imageForCropping = imageForCropping;
                                            $scope.croppedImage = null;
                                            $scope.imageCropModalFlag = true;
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
                                            $scope.displayEvent.croppedImage = state.image;
                                            $scope.setCroppedImageAsFinalImage();
                                        } else {
                                            $scope.discardCroppedImage();
                                        }
                                    }, function () {
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
                } else if ($scope.displayEvent.croppedImage) {
                    // this block is done to handle clicking on cancel in case of edit image
                    $scope.displayEvent.files = $scope.displayEvent.croppedImage;
                    if (!$scope.currentInfoSection.includes('create_event_detail_2') && !$scope.showHide.isMobile.matches) {
                        $scope.continue();
                    }
                }
            };

            $scope.setCroppedImageAsFinalImage = function ($event) {
                if ($scope.showHide.imageSelected) {
                    $scope.flashMessage = true;
                    $scope.imageForCropping = null;
                    $scope.displayEvent.files = $scope.displayEvent.croppedImage;
                    $scope.saveDataLocal();
                    $scope.showHide.imageSelected = false;
                    if ('create_event_detail_1' in $scope.createEventForms) {
                        $scope.createEventForms.create_event_detail_1.eventImage.$setValidity('maxSize', true);
                        $scope.createEventForms.create_event_detail_1.eventImage.$setValidity('required', true);
                    }
                }
                if (!$scope.currentInfoSection.includes('create_event_detail_2') && !$scope.showHide.isMobile.matches) {
                    $scope.continue();
                }
                if ($event) {
                    $event.preventDefault();
                }
            };

            $scope.discardCroppedImage = function ($event) {
                $scope.showHide.imageSelected = false;
                $scope.displayEvent.files = null;
                $scope.croppedImage = null;
                $scope.imageForCropping = null;
                $event.preventDefault();
            };

            // This function is called on click on edit image
            $scope.editImage = function (id) {
                angular.element('#' + id).click();
            };

            // This function is called on click on delete image
            $scope.deleteImage = function () {
                $scope.createEventForms.create_event_detail_1.eventImage.$setValidity('required', false);
                $scope.displayEvent.files = null;
                $scope.displayEvent.event_image = null;
                $scope.displayEvent.croppedImage = null;
                $scope.saveDataLocal();
            };

            $scope.goToPage = function (page) {
                location.href = page;
            };

            $scope.closeBSModal = function (page) {
                $window.localStorage.removeItem("localDataSet");
                setTimeout(function() {
                    location.href = page;
                }, 500);
            };

            $scope.feedback = function(feedback) {
                if (feedback) {
                    $scope.feedback.rating = feedback;
                }
            };

            $scope.saveFeedback = function () {
                eventsService.saveFeedback({ rating: $scope.feedback.rating, comment: ($scope.feedback.comment) ? $scope.feedback.comment : '' })
                    .then(res => {
                        $scope.goToPage('/manageevent');
                    });
            };

            $scope.gotoUserExperienceRate = function () {
                if (!$scope.user.is_feedback) {
                    $scope.showHide.feedbackSection = true;
                } else {
                    $scope.goToPage('/manageevent');
                }
            };

            const checkIfDuplicateEmail = function (email) {
                if ($scope.dropdowns.guestsEmails.length == 0 || ($scope.dropdowns.guestsEmails.length > 0 && $scope.dropdowns.guestsEmails.findIndex(c => c.email.toLowerCase() == email.toLowerCase()) == -1)) {
                    return false;
                }
                return true;
            };

            $scope.saveEmailGuest = function () {
                $scope.displayEvent.guest_user.push(...($scope.dropdowns.guestsEmails));
                $scope.dropdowns.guestsEmails = [];
                $scope.navigate('createnewevent');
            };

            $scope.removeEmailGuest = function (index) {
                if (index >= 0) {
                    $scope.dropdowns.guestsEmails.splice(index, 1);
                }
            };

            $scope.addEmailToGuest = function ($event) {
                if ($event && $event.keyCode == 13) {
                    if ($scope.emailFrom) {
                        let emailsToAdd = $scope.emailFrom.split(',');
                        let invalidEmails = [];
                        for (let email of emailsToAdd) {
                            email = email.trim();
                            // Check if valid email
                            let pattern = new RegExp(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/);
                            if (pattern.test(email)) {
                                if (!checkIfDuplicateEmail(email)) {
                                    $scope.dropdowns.guestsEmails.push({ email: email, type: 'email' });
                                }
                                $scope.emailFrom = $scope.emailFrom.replace(email, '');
                            } else {
                                invalidEmails.push(email);
                                $scope.createEventForms.inviteThroughEmail.email.$setValidity('pattern', false);
                            }
                        }
                        $scope.emailFrom = '';
                        if (invalidEmails && invalidEmails.length > 0) {
                            $scope.emailFrom = invalidEmails.join(',');
                        }
                    }
                } else {
                    $scope.createEventForms.inviteThroughEmail.email.$setValidity('pattern', true);
                    if ($scope.emailFrom) {
                        let emailsToAdd = $scope.emailFrom.split(',');
                        for (let email of emailsToAdd) {
                            email = email.trim();
                            // Check if valid email
                            let pattern = new RegExp(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/);
                            if (!pattern.test(email)) {
                                $scope.createEventForms.inviteThroughEmail.email.$setValidity('pattern', false);
                            }
                        }
                    }

                }
            };

            $scope.getSocialShareURL = () => {
                var rewardUrl = $scope.snapchatUrl;
                return rewardUrl;
            };

            $scope.socialShare = (social_type) => {
                if (social_type == "facebook") {
                    Socialshare.share({
                        'provider': social_type,
                        'attrs': {
                            'appId': config.FACEBOOK_APP_ID,
                            'socialshareUrl': $scope.facebookUrl,
                            'socialshareDisplay': $scope.displayEvent.event_name
                        }
                    });
                }

                if (social_type == "whatsapp") {
                    var whatsAppUrl = $scope.whatsAppUrl;
                    window.open(whatsAppUrl, '_blank');
                }

                if (social_type == "email") {
                    Socialshare.share({
                        'provider': social_type,
                        'attrs': {
                            'socialshareBody': $scope.emailUrl,
                            'socialshareSubject': $scope.displayEvent.event_name
                        }
                    });
                }
            };

            $scope.emailShare = (social_type) => {
                let googleMail = 'https://mail.google.com/mail/?view=cm&fs=1&to=&su=' + $scope.displayEvent.event_name + '&body=' + $scope.emailUrl;
                let ooutlookMail = 'https://outlook.office.com/owa/?path=/mail/action/compose&to=&subject' + $scope.displayEvent.event_name + '&body=' + $scope.emailUrl;
                let yahooMail = 'https://compose.mail.yahoo.com/?to=&subject=' + $scope.displayEvent.event_name + '&body=' + $scope.emailUrl;
                let email = 'mailto:?subject=' + $scope.displayEvent.event_name + '&body=' + $scope.emailUrl;
                angular.element("#mailtoui-button-1").attr("href", googleMail);
                angular.element("#mailtoui-button-2").attr("href", ooutlookMail);
                angular.element("#mailtoui-button-3").attr("href", yahooMail);
                angular.element("#mailtoui-button-4").attr("href", email);
                angular.element("#mailtoui-email-address").append($scope.emailUrl);
                angular.element("#mailtoui-modal").show();
                angular.element(".mailtoui-brand").remove();
            };

            $scope.openBankInfoModel = '';
            $scope.openBankInfo = function () {
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.bankAccountParams = {
                    "country": "US",
                    "currency": "USD",
                    "account_number": '',
                    "re_account_number": '',
                    "account_holder_first_name": '',
                    "account_holder_last_name": '',
                    "account_holder_type": 'individual',
                    "routing_number": '',
                    "sort_code": ''
                };

                $scope.openBankInfoModel = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/addBankInfo.html',
                    openedClass: 'update_bank_info pa-create-event-modal add-link-modal',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            $scope.createBankToken = function(bankAccountParams, form) {
                if (!bankAccountParams.account_holder_first_name && !bankAccountParams.account_holder_last_name && (!bankAccountParams.routing_number || !bankAccountParams.sort_code) && !bankAccountParams.re_account_number && !bankAccountParams.account_number) {
                    form.accountHolderFirstName.$invalid = true;
                    form.accountHolderLastName.$invalid = true;
                    form.accountNumber.$invalid = true;
                    form.reAccountNumber.$invalid = true;
                    form.routingNumber.$invalid = true;
                    form.sort_code.$invalid = true;
                    return false;
                } else if (!bankAccountParams.account_holder_last_name && (!bankAccountParams.routing_number || !bankAccountParams.sort_code) && !bankAccountParams.re_account_number && !bankAccountParams.account_number) {
                    form.accountHolderLastName.$invalid = true;
                    form.accountNumber.$invalid = true;
                    form.reAccountNumber.$invalid = true;
                    form.routingNumber.$invalid = true;
                    form.sort_code.$invalid = true;
                    return false;
                } else if ((!bankAccountParams.routing_number || !bankAccountParams.sort_code) && !bankAccountParams.re_account_number && !bankAccountParams.account_number) {
                    form.accountNumber.$invalid = true;
                    form.reAccountNumber.$invalid = true;
                    form.routingNumber.$invalid = true;
                    form.sort_code.$invalid = true;
                    return false;
                } else if (!bankAccountParams.re_account_number && !bankAccountParams.account_number) {
                    form.accountNumber.$invalid = true;
                    form.reAccountNumber.$invalid = true;
                    return false;
                } else {
                    if (!bankAccountParams.account_holder_first_name) {
                        form.accountHolderFirstName.$invalid = true;
                        return false;
                    } else if (!bankAccountParams.account_holder_last_name) {
                        form.accountHolderLastName.$invalid = true;
                        return false;
                    } else if (!bankAccountParams.routing_number && bankAccountParams.country != 'GB') {
                        form.routingNumber.$invalid = true;
                        return false;
                    } else if (!bankAccountParams.sort_code && bankAccountParams.country === 'GB') {
                        form.sort_code.$invalid = true;
                        return false;
                    } else if (!bankAccountParams.re_account_number) {
                        form.reAccountNumber.$invalid = true;
                        return false;
                    } else if (!bankAccountParams.account_number) {
                        form.accountNumber.$invalid = true;
                        return false;
                    }
                }
                if (bankAccountParams.account_number !== bankAccountParams.re_account_number) {
                    let notify = {
                        type: 'error',
                        title: 'Oops!!',
                        content: 'Account number and Re-enter Account Number not matched.',
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                } else {
                    let stripe = Stripe(config.STRIPE_PUBLISH_KEY);
                    let bankInfo = {};

                    if (bankAccountParams.country === 'US') {
                        bankInfo = {
                            "country": bankAccountParams.country,
                            "currency": bankAccountParams.currency,
                            "account_number": bankAccountParams.account_number,
                            "account_holder_name": bankAccountParams.account_holder_first_name + ' ' + bankAccountParams.account_holder_last_name,
                            "account_holder_type": bankAccountParams.account_holder_type,
                            "routing_number": bankAccountParams.routing_number,
                        };
                    } else {
                        bankInfo = {
                            "country": bankAccountParams.country,
                            "currency": "GBP",
                            "account_number": bankAccountParams.account_number,
                            "account_holder_name": bankAccountParams.account_holder_first_name + ' ' + bankAccountParams.account_holder_last_name,
                            "account_holder_type": bankAccountParams.account_holder_type,
                            "sort_code": bankAccountParams.sort_code,
                        };
                    }

                    stripe.createToken('bank_account', bankInfo).then((response) => {
                        if (response && 'token' in response) {
                            return response.token.id;
                        } else {
                            let notify = {
                                type: 'error',
                                title: 'Oops!!',
                                content: response.error.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            return false;
                        }
                    }).then((bank_token) => {
                        if (bank_token) {
                            stripeService.linkBankAccount(bank_token).then((response) => {
                                if (response.success) {
                                    let notify = {
                                        type: 'success',
                                        title: 'Success',
                                        content: response.message,
                                        timeout: 3000 //time in ms
                                    };
                                    $scope.$emit('notify', notify);
                                    location.href = '/adminssionsEvent?ev=' + $scope.displayEvent.event_id;
                                    $scope.reloadPage();
                                } else {
                                    let notify = {
                                        type: 'error',
                                        title: 'Oops!!',
                                        content: response.message,
                                        timeout: 5000 //time in ms
                                    };
                                    $scope.$emit('notify', notify);
                                }
                            }).catch(err => {

                                let content = "Sorry something went wrong. Please try later.";
                                if (err.data && 'message' in err.data) {
                                    content = err.data.message;
                                }
                                let notify = {
                                    type: 'error',
                                    title: 'Oops!!',
                                    content: content,
                                    timeout: 5000 //time in ms
                                };
                                $scope.$emit('notify', notify);
                            });
                        }

                    }).catch(err => {
                        let notify = {
                            type: 'error',
                            title: 'Oops!!',
                            content: "Sorry something went wrong. Please try later.",
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                    }).finally(() => { });
                }
            };

            $scope.openChangePayoutModel = function () {
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.stripe_bank_id = $scope.defalutBank.stripe_bank_id;
                $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/changePayoutModel.html',
                    openedClass: 'update_bank_info pa-create-event-modal add-link-modal',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            $scope.deleteTicketConfirmation = function (index) {
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.ticket_index = index;
                confirmCancelTicketModel = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/confirmDeleteTicket.html',
                    openedClass: 'pa-create-event-modal add-link-modal ticket-popup-new-ui scroll_popup',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            $scope.reloadPage = () => {
                $window.location.reload();
            };

            $scope.makeBankDefault = function (stripe_bank_id) {
                stripeService.makeBankDefault(stripe_bank_id)
                    .then((response) => {
                        if (response.success) {
                            $window.location.reload();
                        } else {
                            let notify = {
                                type: 'error',
                                title: 'Oops!!',
                                content: response.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                        }
                    }).catch(err => {
                        let notify = {
                            type: 'error',
                            title: 'Oops!!',
                            content: "Sorry something went wrong. Please try later.",
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                    });
            };

            $scope.calculate_price = function (amt, currency) {
                if (amt == 0) {
                    return {
                        amount: 0,
                        fee: 0,
                        total: 0,
                        processing_fee: 0
                    };
                } else {
                    let _fee = $scope.fees[currency];
                    let amount = parseFloat(amt);
                    let total = (amount + parseFloat(_fee.Fixed)) / (1 - parseFloat(_fee.Percent) / 100);
                    let fee = total - amount;
                    let processing_fee = config.TICKET_PROCESSING_FEE;
                    return {
                        amount: amount,
                        fee: fee.toFixed(2),
                        total: total.toFixed(2),
                        processing_fee: processing_fee
                    };
                }

            };

            $scope.get_tire_calculate_price = function (is_absorb, tires) {
                angular.forEach(tires, function (tire, index) {
                    let price_details = $scope.calculate_price(tire.price, 'USD');
                    $scope.is_absorb = is_absorb;
                    if (!is_absorb) {
                        $scope.buyer_total[index] = price_details.total;
                        $scope.service_fee = price_details.fee;
                        $scope.processing_fee = price_details.processing_fee;
                        $scope.ticket_base_price = price_details.amount;
                        $scope.your_payout = price_details.amount;

                    } else {
                        let price = tire.price;
                        $scope.buyer_total[index] = price;
                        $scope.service_fee = price_details.fee;
                        $scope.processing_fee = price_details.processing_fee;
                        $scope.ticket_base_price = price_details.amount;
                        $scope.your_payout = (price - (price_details.fee + price_details.processing_fee)).toFixed(2);
                    }
                });
            };

            $scope.get_calculate_price = function (is_absorb, price) {
                let price_details = $scope.calculate_price(price, 'USD');
                $scope.is_absorb = is_absorb;
                if (!is_absorb) {
                    $scope.buyer_total = price_details.total;
                    $scope.service_fee = price_details.fee;
                    $scope.processing_fee = price_details.processing_fee;
                    $scope.ticket_base_price = price_details.amount;
                    $scope.your_payout = price_details.amount;

                } else {
                    $scope.buyer_total = price;
                    $scope.service_fee = price_details.fee;
                    $scope.processing_fee = price_details.processing_fee;
                    $scope.ticket_base_price = price_details.amount;
                    $scope.your_payout = (price - (price_details.fee + price_details.processing_fee)).toFixed(2);
                }
                return $scope.buyer_total;

            };


            $scope.getStripeAccountInfo = function (evenId) {
                let base_url = window.location.origin;
                let success_url = base_url + "/stripeconnect?success=true&eventId=" + evenId;
                let failure_url = base_url + "/stripeconnect?success=false&eventId=" + evenId;

                stripeService.getStripeAccountInfo(success_url, failure_url).then((response) => {
                    if (response.success) {
                        $scope.stripe_verification_status = response.stripe_verification_status;
                        $scope.stripe_message = response.message;
                        if ('link' in response) {
                            $scope.stripe_link = response.link;
                        }
                    }
                }).catch(err => {
                    let content = "Sorry something went wrong. Please try later.";
                    if (err.data && 'message' in err.data) {
                        content = err.data.message;
                    }
                    let notify = {
                        type: 'error',
                        title: 'Oops!!',
                        content: content,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                });
            };


            $scope.checkStripeStatus = function () {
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.status = $scope.stripe_verification_status;
                eventModelScope.message = $scope.stripe_message;
                eventModelScope.stripe_link = $scope.stripe_link;
                $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/stripeAccountStatusModel.html',
                    openedClass: 'update_bank_info pa-create-event-modal add-link-modal popup_wtd_700',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            $scope.openTicketDetailsModel = function (tickets) {
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.tickets = tickets;
                if (typeof eventModelScope.tickets.total_price !== 'undefined') {
                    eventModelScope.your_payout = (eventModelScope.tickets.total_price - eventModelScope.tickets.service_fee);
                }
            };

            $scope.stripeAccountCreate = function (draft, evenId, stripe_selected_country) {
                $scope.loading = true;
                $scope.saveEvent(evenId);
                let stripe_country = '';
                let base_url = window.location.origin;
                let success_url = base_url + "/stripeconnect?success=true&eventId=" + evenId;
                let failure_url = base_url + "/stripeconnect?success=false&eventId=" + evenId;
                if (stripe_selected_country != '') {
                    stripe_country = stripe_selected_country;
                }

                stripeService.stripeAccountCreate(success_url, failure_url, stripe_country).then((response) => {
                    if (response.success) {
                        if ('data' in response && 'url' in response.data) {
                            $scope.saveEvent(draft);
                            $window.location.href = response.data.url;
                        }
                    } else {
                        let notify = {
                            type: 'error',
                            title: 'Oops!!',
                            content: response.message,
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                    }
                }).catch(err => {
                    let content = "Sorry something went wrong. Please try later.";
                    if (err.data && 'message' in err.data) {
                        content = err.data.message;
                    }
                    let notify = {
                        type: 'error',
                        title: 'Oops!!',
                        content: content,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                });
            };

            $scope.goToVenue = function (action) {
                $scope.loading = true;
                $scope.reloadOnPage = false;
                $scope.designVenueRedirect = true;
                $scope.designVenueAction = action;
                $scope.saveEvent($scope.displayEvent.is_draft, true);
                authService.put('showMessage', 1);
                let getNewUser = "";
                getNewUser = $cookies.get("designGuidance");
                if (getNewUser === undefined || getNewUser == true) {
                    $cookies.put("designGuidance", true);
                    $cookies.put("designChairGuidance", true);
                    $cookies.put("designObjectGuidance", true);
                    $cookies.put("designTextGuidance", true);
                    $cookies.put("tierUIGuidance", true);
                    $cookies.put("generalGuidance", true);
                } else {
                    $cookies.put("designGuidance", false);
                    $cookies.put("designChairGuidance", false);
                    $cookies.put("designObjectGuidance", false);
                    $cookies.put("designTextGuidance", false);
                    $cookies.put("tierUIGuidance", false);
                    $cookies.put("generalGuidance", false);
                }
            };

            /*
             **
             ** Open Get Venue Modal
             **
             */
            $scope.venueMaps = function(venueTier) {
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.tier = venueTier;
                eventModelScope.event_id = $scope.displayEvent.event_id;
                $scope.venueMapModal = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/locationVenueMapModal.html',
                    openedClass: 'pa-create-event-modal freeEventTickets venueMaps scroll_popup popup_wtd_700',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            /*
             **
             ** Use Existing Venue Map
             **
             */

            function toDataURL(url) {
                let urldata = url + '?x-request=html';
                return new Promise((resolve, reject) => {
                    var img = new Image();
                    img.crossOrigin = "Anonymous";
                    img.onload = function() {
                        var canvas = document.createElement('canvas');
                        var ctx = canvas.getContext('2d');
                        var dataURL;
                        canvas.height = this.naturalHeight;
                        canvas.width = this.naturalWidth;
                        ctx.drawImage(this, 0, 0);
                        dataURL = canvas.toDataURL();
                        resolve(dataURL);
                    };
                    img.onerror = function() {
                        reject(new Error('Could not load image at:::' + url));
                    };
                    img.src = urldata;
                });
            }

            $scope.useExistingVenue = function (venueData, eventId) {
                $scope.loading = true;
                $scope.loadingMessage = 'Saving Seat Map Data...';
                let promise = null;
                let data = {};
                var file = '',
                    backEndLayout = '',
                    frontEndLayout = '';
                let token = authService.get('token');
                var list = venueData.tiers.map(function (item) {
                    delete item.tier_id;
                    delete item._layout_id;
                    return item;
                });
                data = {
                    "event_id": eventId,
                    "front_layout_file": "https://via.placeholder.com/150",
                    "back_layout_file": "https://via.placeholder.com/150",
                    "layout_thumbnail_url": "https://via.placeholder.com/150",
                    "venue_map_name": venueData.venue_map_name,
                    "total_seating_capacity": venueData.total_seating_capacity,
                    "tiers_assigned_seats": venueData.tiers_assigned_seats,
                    "tiers": list
                };
                promise = awsService.post('/seating-plan-maps/add', data, token);
                return promise.then(res => {
                    if (res && 'layout_id' in res) {
                        $scope.layoutId = res.layout_id;
                    }
                    $.get(venueData.back_layout_file, function(data) {
                        backEndLayout = data;
                    });
                    $.get(venueData.front_layout_file, function(data) {
                        frontEndLayout = data;
                    });
                    let notify = {
                        type: 'success',
                        title: 'Success',
                        content: res.message,
                        timeout: 3000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    return toDataURL(venueData.layout_thumbnail_url).then(function(response) {
                        let mapThumbnailImage = 'thumbnail-' + eventId + '-seatmap.png';
                        let blob = dataURItoBlob(response);
                        let file = new File([blob], mapThumbnailImage);
                        let aws_config = {
                            'bucket': config.AWS_BUCKET,
                            'access_key': config.AWS_ACCESS_KEY,
                            'secret_key': config.AWS_SECRET_KEY,
                            'region': config.AWS_REGION,
                            'path': config.SEAT_MAP_UPLOAD_FOLDER,
                            'img_show_url': config.AWS_IMG_SHOW_URL
                        };
                        return eventsService.uploadImg(file, aws_config);
                    }).catch((err) => {
                        console.log(err);
                    });
                }).then((response) => {
                    if (response && response.file_url) {
                        let data = {
                            layout_thumbnail_url: response.file_url,
                        };
                        awsService.put(`/seating-plan-maps/update/${$scope.layoutId}`, data, token).then((response) => {});
                    }
                    let backendFile = 'backend-' + eventId + '-seatmap.psmc';
                    file = new File([backEndLayout], backendFile);
                    let aws_config = {
                        'bucket': config.AWS_BUCKET,
                        'access_key': config.AWS_ACCESS_KEY,
                        'secret_key': config.AWS_SECRET_KEY,
                        'region': config.AWS_REGION,
                        'path': config.SEAT_MAP_UPLOAD_FOLDER,
                        'img_show_url': config.AWS_IMG_SHOW_URL
                    };
                    return eventsService.uploadImg(file, aws_config);
                }).then((response) => {
                    if (response && response.file_url) {
                        let data = {
                            back_layout_file: response.file_url,
                        };
                        awsService.put(`/seating-plan-maps/update/${$scope.layoutId}`, data, token).then((response) => {});
                    }
                    let frontendFile = 'front-' + eventId + '-seatmap.psmc';
                    file = new File([frontEndLayout], frontendFile);
                    let aws_config = {
                        'bucket': config.AWS_BUCKET,
                        'access_key': config.AWS_ACCESS_KEY,
                        'secret_key': config.AWS_SECRET_KEY,
                        'region': config.AWS_REGION,
                        'path': config.SEAT_MAP_UPLOAD_FOLDER,
                        'img_show_url': config.AWS_IMG_SHOW_URL
                    };
                    return eventsService.uploadImg(file, aws_config);
                }).then((response) => {
                    if (response && response.file_url) {
                        let data = {
                            front_layout_file: response.file_url,
                        };
                        awsService.put(`/seating-plan-maps/update/${$scope.layoutId}`, data, token).then((response) => {});
                    }
                    let data = {
                        is_seating_layout: 1
                    };
                    awsService.put(`/event/update/${eventId}`, data, token).then((response) => {
                        if (response.success) {
                            let notify = {
                                type: 'success',
                                title: 'Success',
                                content: response.message,
                                timeout: 3000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            $scope.venueMapModal.close();
                            setTimeout(function() {
                                $scope.loading = false;
                                $window.location.href = `/adminssionsEvent?ev=${eventId}`;
                                $window.location.reload();
                            }, 1500);
                        }
                    });
                }).catch(err => {
                    $scope.loading = false;
                    let content = err.message;
                    let notify = {
                        type: 'error',
                        title: 'Oops!!',
                        content: content,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                });
            };

            /*
             **
             ** Get Existing Seat Plan
             **
             */

            $scope.getExistingSeat = function (id) {
                eventsService.getExistingSeatPlan(id).then((response) => {
                    if (response.success) {
                        $scope.existingSeatPlan = response.data;
                        $scope.existingSeatPlanFound = true;
                    }
                }).catch(err => {
                    let content = err.message;
                    let notify = {
                        type: 'error',
                        title: 'Oops!!',
                        content: content,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                });
            };

            /*
             **
             ** Delete Seat Plan
             **
             */

            $scope.deleteSeatPlan = function (id) {
                eventsService.deleteSeatPlan(id).then((response) => {
                    if (response.success) {
                        let notify = {
                            type: 'success',
                            title: 'Success',
                            content: response.message,
                            timeout: 3000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                    }
                    let data = {
                        is_seating_layout: 0,
                        is_attendee_pick: 0
                    };
                    let token = authService.get('token');
                    awsService.put(`/event/update/${ $scope.displayEvent.event_id }`, data, token).then((response) => {
                        if (response.success) {
                            let notify = {
                                type: 'success',
                                title: 'Success',
                                content: response.message,
                                timeout: 3000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            setTimeout(function() {
                                $window.location.href = `/adminssionsEvent?ev=${$scope.displayEvent.event_id}`;
                                $window.location.reload();
                            }, 2000);
                        }
                    });
                }).catch(err => {
                    let content = err.message;
                    let notify = {
                        type: 'error',
                        title: 'Oops!!',
                        content: content,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                });
            };

            /*
             **
             ** Fetch user's friends
             **        
             */
            $scope.tickAdminFriends = function (response) {
                let adminEmails = "";
                adminEmails = $scope.displayEvent.event_admin.map((admin) => { return admin.email; });
                if (adminEmails.length > 0) {
                    angular.forEach(response, function (elem) {
                        if (adminEmails.includes(elem.email)) {
                            adminEmails.splice(adminEmails.indexOf(elem.email), 1);
                        }
                    });
                }
                //after splice
                if (adminEmails.length > 0) {
                    //if you have lost a following, but the person is still event_admin
                    return Promise.resolve(response);
                } else {
                    return Promise.resolve(response);
                }
            };

            $scope.setAdminFriends = function () {
                $scope.displayAdmins = [];
                let adminId = [];
                let event_admin = '';
                if ($scope.displayEvent.event_admin.length > 0) {
                    angular.forEach($scope.displayEvent.event_admin, function(element) {
                        let temp = {
                            id: element.user_id,
                            administrator_id: element.administrator_id,
                            name: element.username,
                            email: element.email,
                            iconImage: element.profile_pic || '../img/defaultProfilePic.png'
                        };

                        $scope.multipleDemo.selectedAdmins.push(temp);
                    });
                }
                if ($scope.displayEvent.event_admin.length > 0) {
                    adminId = $scope.displayEvent.event_admin.map((admin) => { return admin; });
                    event_admin = $scope.editEvent._user_id;
                }

                if ($scope.user && $scope.userSession) {
                    userService.getUsersFollowList().then(response => {
                            let responseList = [];
                            responseList.push(...response.data.data.followerList);
                            responseList.push(...response.data.data.followingList);
                            return $scope.tickAdminFriends(responseList);
                        })
                        .then(res => {
                            angular.forEach(res, function (element) {
                                let rightVal = true;
                                if (element.first_name) {
                                    element.username = element.first_name + ' ' + element.last_name;
                                }

                                if (element.profile_pic) {
                                    element.iconImage = element.profile_pic || '../img/defaultProfilePic.png';
                                } else {
                                    element.iconImage = '../img/defaultProfilePic.png';
                                }
                                angular.forEach(adminId, function (valueEle) {
                                    if (element.user_id === valueEle.user_id) {
                                        rightVal = false;
                                    }
                                });
                                if (element.user_id === $scope.user.user_id || (element.user_id === event_admin)) {
                                    rightVal = false;
                                }

                                let newElement = {
                                    "id": element.user_id,
                                    "administrator_id": '',
                                    "name": element.username,
                                    "email": element.email,
                                    "iconImage": element.iconImage
                                };
                                if (rightVal && element.email != '') {
                                    $scope.displayAdmins.push(newElement);
                                }
                            });
                            $scope.loading = false;
                            Utils.applyChanges($scope);
                        })
                        .catch(err => {
                            console.log('Friend List Error::', err);
                        });
                }
            };

            $scope.moveToChangeState = function () {
                $scope.setAdminFriends();
            };

            $scope.checkIfCurrentIsUserEventAdmin = function () {
                $scope.isCurrentUserEventAdmin = false;
                if ('event_admin' in $scope.displayEvent && $scope.displayEvent.event_admin != '[]') {
                    let adminEmails = $scope.displayEvent.event_admin.map((admin) => { return admin.email; });
                    if (adminEmails.includes($scope.user.email)) {
                        $scope.isCurrentUserEventAdmin = true;
                    }
                }
            };

            $scope.addAndMoveToChangeState = function (selectedAdmins) {
                $scope.selectedAdminData = selectedAdmins;
                if ($scope.selectedAdminData.length > 0) {
                    $scope.adminDisplayView = true;
                } else {
                    $scope.adminDisplayView = false;
                }
            };

            /*
             **
             ** Ticket Add/Edit Normal and with Tier
             **
             */

            $scope.freeEventTickets = function () {
                angular.element('#ticketSaleEndDate').focus();
                angular.element('#ticketSaleEndDate').blur();
                angular.element('#ticketSaleStartDate').focus();
                angular.element('#ticketSaleStartDate').blur();

                $scope.displayEvent.tickets = getDefaultTicket();
                $scope.displayEvent.tickets.saleEndDate = {
                    date: $scope.displayEvent.end.date,
                    time: $scope.displayEvent.end.time
                };
                $scope.displayEvent.tickets.ticket_id = -1;
                $scope.ticketIndex = $scope.displayEvent.tickets.ticket_id;
                $scope.displayEvent.tickets.ticket_name = '';
                $scope.displayEvent.tickets.quantity = '';
                $scope.displayEvent.tickets.description = '';
                $scope.displayEvent.tickets.disaply_price = 'Free';
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.saveAnother = true;
                $scope.freeEventTicketsModel = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/freeEventTickets.html',
                    openedClass: 'pa-create-event-modal freeEventTickets scroll_popup popup_wtd_700',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            $scope.paidEventTickets = function () {
                angular.element('#ticketSaleEndDate').focus();
                angular.element('#ticketSaleEndDate').blur();
                angular.element('#ticketSaleStartDate').focus();
                angular.element('#ticketSaleStartDate').blur();
                let eventModelScope = $scope.$new(false, $scope);
                $scope.displayEvent.tickets = getDefaultTicket();
                $scope.displayEvent.tickets.saleEndDate = {
                    date: $scope.displayEvent.end.date,
                    time: $scope.displayEvent.end.time
                };
                $scope.displayEvent.tickets.ticket_id = -1;
                $scope.ticketIndex = $scope.displayEvent.tickets.ticket_id;
                $scope.displayEvent.tickets.ticket_name = '';
                $scope.displayEvent.tickets.quantity = '';
                $scope.displayEvent.tickets.description = '';
                $scope.displayEvent.tickets.price = '';
                $scope.displayEvent.tickets.ticket_type = 'paid';
                $scope.is_absorb = false;
                eventModelScope.modelAction = 'Create';
                eventModelScope.saveAnother = true;
                $scope.paidEventTicketsModel = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/paidEventTickets.html',
                    openedClass: 'pa-create-event-modal freeEventTickets scroll_popup popup_wtd_700',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            $scope.eventTireTicket = function () {
                angular.element('#ticketSaleEndDate').focus();
                angular.element('#ticketSaleEndDate').blur();
                angular.element('#ticketSaleStartDate').focus();
                angular.element('#ticketSaleStartDate').blur();
                let eventModelScope = $scope.$new(false, $scope);
                let tier_details = $scope.displayEvent.layout_details.tiers;
                $scope.displayEvent.tickets = getDefaultTicket();
                $scope.displayEvent.tickets.saleEndDate = {
                    date: $scope.displayEvent.end.date,
                    time: $scope.displayEvent.end.time
                };
                $scope.displayEvent.tickets.ticket_name = '';
                $scope.displayEvent.tickets.ticket_id = -1;
                $scope.displayEvent.tickets.quantity = $scope.displayEvent.layout_details.tiers[0].seating_capacity;
                $scope.displayEvent.tickets.description = '';
                $scope.displayEvent.tickets.price = '';
                $scope.displayEvent.tickets.ticket_type = ($scope.displayEvent.event_type == 'free') ? 'free' : 'paid';
                $scope.is_absorb = false;
                eventModelScope.modelAction = 'Create';
                $scope.displayEvent.tickets.tier_details = [];
                $scope.displayEvent.layout_details.tiers.forEach(function (tireDetails) {
                    let tire = {
                        "_tier_id": tireDetails.tier_id,
                        "price": "",
                        "quantity": tireDetails.seating_capacity,
                    };
                    $scope.displayEvent.tickets.tier_details.push(tire);
                });
                $scope.paidEventTicketsModel = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/createEventTireTicket.html',
                    openedClass: 'pa-create-event-modal freeEventTickets scroll_popup popup_wtd_700',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            $scope.get_local_tire_ticket_id = function () {
                return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            };

            $scope.getTicketIndex = function (local_tire_ticket_id) {
                let ticketIndexes = [];
                $scope.displayEvent.ticketsArr.forEach(function (ticket, index) {
                    if (local_tire_ticket_id == ticket.local_tire_ticket_id) {
                        ticketIndexes.push(index);
                    }
                });
                return ticketIndexes;
            };

            $scope.createEventTireTicket = function(addMore, ticketindex) {
                // Set sales time and end time
                $scope.validateTime($scope.displayEvent.tickets.saleStartDate.date, $scope.displayEvent.tickets.saleStartDate.time, $scope.displayEvent.tickets.saleEndDate.date, $scope.displayEvent.tickets.saleEndDate.time, 'create_event_form_admissions_3', 'saleStartDate');
                let local_tire_ticket_id = '';
                local_tire_ticket_id = $scope.get_local_tire_ticket_id();
                if (ticketindex == -1) {
                    $scope.displayEvent.tickets.tier_details.forEach(function (tireDetails, index) {
                        let newTicket = JSON.parse(JSON.stringify($scope.displayEvent.tickets));

                        newTicket.tier_details = $scope.displayEvent.tickets.tier_details;
                        if (tireDetails.price == "") {
                            newTicket.tier_details[index].price = 0;
                        }
                        newTicket.saleStartDate.date = ($scope.displayEvent.tickets.saleStartDate.date).format("YYYY-MM-DD");
                        newTicket.saleStartDate.time = moment($scope.displayEvent.tickets.saleStartDate.time, 'hh:mma').format("HH:mm");
                        newTicket.saleEndDate.date = ($scope.displayEvent.tickets.saleEndDate.date).format("YYYY-MM-DD");
                        newTicket.saleEndDate.time = moment($scope.displayEvent.tickets.saleEndDate.time, 'hh:mma').format("HH:mm");
                        newTicket.is_absorb = $scope.is_absorb;
                        newTicket.service_fee = parseFloat($scope.service_fee);
                        newTicket.stripe_fee = parseFloat($scope.processing_fee);
                        newTicket.total_price = parseFloat($scope.buyer_total);
                        newTicket.remaining_qty = $scope.displayEvent.tickets.quantity;
                        newTicket.ticket_type = $scope.displayEvent.tickets.ticket_type;
                        newTicket._tier_id = newTicket.tier_details[index]._tier_id;
                        newTicket.price = newTicket.tier_details[index].price;
                        newTicket.allow_to_action = true;
                        newTicket.ticket_id = $scope.get_local_tire_ticket_id();
                        newTicket.local_tire_ticket_id = local_tire_ticket_id;
                        $scope.displayEvent.ticketsArr.push(newTicket);
                    });
                } else {
                    let newTicket = JSON.parse(JSON.stringify($scope.displayEvent.tickets));
                    local_tire_ticket_id = newTicket.local_tire_ticket_id;

                    newTicket.saleStartDate.date = ($scope.displayEvent.tickets.saleStartDate.date).format("YYYY-MM-DD");
                    newTicket.saleStartDate.time = moment($scope.displayEvent.tickets.saleStartDate.time, 'hh:mma').format("HH:mm");
                    newTicket.saleEndDate.date = ($scope.displayEvent.tickets.saleEndDate.date).format("YYYY-MM-DD");
                    newTicket.saleEndDate.time = moment($scope.displayEvent.tickets.saleEndDate.time, 'hh:mma').format("HH:mm");
                    newTicket.is_absorb = newTicket.is_absorb;
                    newTicket.service_fee = parseFloat(newTicket.service_fee);
                    newTicket.stripe_fee = parseFloat(newTicket.processing_fee);
                    newTicket.total_price = parseFloat(newTicket.total_price);
                    newTicket.remaining_qty = newTicket.remaining_qty;
                    newTicket.ticket_type = newTicket.ticket_type;
                    newTicket._tier_id = newTicket._tier_id;
                    newTicket.allow_to_action = newTicket.allow_to_action;

                    if ('tier_details' in newTicket) {
                        newTicket.tier_details.forEach(function (tire, index) {
                            if (tire._tier_id == newTicket._tier_id) {
                                newTicket.price = tire.price;
                            }
                        });
                    } else {
                        newTicket.price = 0;
                    }

                    $scope.displayEvent.layout_details.tiers.forEach(function(tire, index) {
                        newTicket.tier_details.forEach(function(v, i) {
                            if ('price' in v && (typeof v._tier_id == 'undefined')) {
                                newTicket.tier_details[i]._tier_id = tire.tier_id;
                                newTicket.tier_details[i].price = v.price;
                                newTicket.tier_details[i].quantity = tire.seating_capacity;
                                newTicket.tier_details[i].ticket_id = newTicket.ticket_id;
                            }
                        });
                    });

                    let ticketIndexes = $scope.getTicketIndex(newTicket.local_tire_ticket_id);
                    ticketIndexes.forEach(function (val, index) {
                        if ($scope.displayEvent.ticketsArr[val].ticket_id == ticketindex) {
                            $scope.displayEvent.ticketsArr.splice(val, 1, newTicket);
                        }
                    });

                    let tempticketsArr = $scope.displayEvent.ticketsArr;
                    $scope.displayEvent.ticketsArr.forEach(function(ticket, index) {
                        if (ticket.local_tire_ticket_id == newTicket.local_tire_ticket_id) {
                            newTicket.tier_details.forEach(function(v, i) {
                                if (v._tier_id == ticket._tier_id) {
                                    tempticketsArr.price = v.price;
                                }
                            });
                        }
                    });

                    $scope.displayEvent.ticketsArr.forEach(function(ticket, index) {
                        ticket.ticket_name = newTicket.ticket_name;
                    });
                    $scope.displayEvent.ticketsArr = tempticketsArr;
                    Utils.applyChanges($scope);
                }

                $scope.showHide.editTicketIndex = -1;
                if (addMore) {
                    $scope.ticketIndex = -1;
                    $scope.displayEvent.tickets.ticket_name = '';
                    $scope.displayEvent.tickets.quantity = '';
                    $scope.displayEvent.tickets.description = '';
                    $scope.displayEvent.tickets.price = '';
                    $scope.displayEvent.tickets.ticket_type = $scope.displayEvent.event_type;
                    $scope.is_absorb = false;
                    $scope.displayEvent.tickets.tier_details = [];
                    $scope.displayEvent.layout_details.tiers.forEach(function (tireDetails, index) {
                        let tire = {
                            "_tier_id": tireDetails.tier_id,
                            "price": 0.00,
                            "quantity": tireDetails.seating_capacity,
                        };
                        $scope.displayEvent.free[index] = false;
                        $scope.displayEvent.tickets.tier_details.push(tire);
                    });
                    $scope.createEventForms.create_event_form_admissions_3.$setPristine();
                    $scope.createEventForms.create_event_form_admissions_3.$setUntouched();
                    $scope.createEventForms.create_event_form_admissions_3.$submitted = false;
                    $scope.createEventForms.create_event_form_admissions_3.$valid = false;
                } else {
                    $scope.paidEventTicketsModel.close();
                }
                $scope.saveDataLocal();
                $scope.flashMessage = true;
                return false;
            };

            $scope.editEventTireTicket = function(local_tire_ticket_id, ticket_id) {
                $scope.displayEvent.ticketsArr.forEach(function(ticket, index) {
                    if (local_tire_ticket_id == ticket.local_tire_ticket_id && ticket_id == ticket.ticket_id) {
                        $scope.ticketIndex = index;
                        $scope.displayEvent.tickets = angular.copy($scope.displayEvent.ticketsArr[index]);
                    }
                });

                if (typeof $scope.displayEvent.tickets.tier_details == 'undefined') {
                    let selected_local_tire_ticket_id = $scope.displayEvent.tickets.local_tire_ticket_id;
                    $scope.displayEvent.tickets.tier_details = [];
                    let temp = {};
                    $scope.displayEvent.ticketsArr.forEach(function(ticket) {
                        if (ticket.local_tire_ticket_id == selected_local_tire_ticket_id) {
                            temp = {
                                'price': ticket.price,
                                '_tier_id': ticket._tier_id,
                                'quantity': ticket.quantity,
                                'ticket_id': ticket.ticket_id
                            };
                            $scope.displayEvent.tickets.tier_details.push(temp);
                        }
                    });
                }
                if (typeof $scope.displayEvent.ticketsArrForEdit === 'undefined') {
                    $scope.displayEvent.tickets.saleStartDate.date = moment($scope.displayEvent.tickets.saleStartDate.date, 'YYYY-MM-DD');
                    $scope.displayEvent.tickets.saleEndDate.date = moment($scope.displayEvent.tickets.saleEndDate.date, 'YYYY-MM-DD');
                } else {
                    if (typeof $scope.displayEvent.ticketsArrForEdit[$scope.ticketIndex] === 'undefined') {
                        $scope.displayEvent.tickets.saleStartDate.date = moment($scope.displayEvent.tickets.saleStartDate.date, 'YYYY-MM-DD');
                        $scope.displayEvent.tickets.saleEndDate.date = moment($scope.displayEvent.tickets.saleEndDate.date, 'YYYY-MM-DD');
                    } else {
                        let original_tickets = $scope.displayEvent.ticketsArrForEdit[$scope.ticketIndex];
                        $scope.displayEvent.tickets.saleStartDate.date = moment(original_tickets.sale_start_date, 'YYYY-MM-DD');
                        $scope.displayEvent.tickets.saleEndDate.date = moment(original_tickets.sale_end_date, 'YYYY-MM-DD');
                    }
                }

                $scope.displayEvent.tickets.saleStartDate.time = moment($scope.displayEvent.tickets.saleStartDate.time, 'hh:mma').format('h:mma');
                $scope.displayEvent.tickets.saleEndDate.time = moment($scope.displayEvent.tickets.saleEndDate.time, 'hh:mma').format('h:mma');
                $scope.is_absorb = ($scope.displayEvent.tickets.is_absorb == 1) ? true : false;
                $scope.service_fee = $scope.displayEvent.tickets.service_fee;
                $scope.processing_fee = $scope.displayEvent.tickets.stripe_fee;
                $scope.ticket_base_price = $scope.displayEvent.tickets.price;
                $scope.displayEvent.tickets.ticket_id = ticket_id;
                $scope.get_tire_calculate_price($scope.is_absorb, $scope.displayEvent.tickets.tier_details);
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.modelAction = 'Edit';
                $scope.paidEventTicketsModel = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/createEventTireTicket.html',
                    openedClass: 'pa-create-event-modal freeEventTickets scroll_popup popup_wtd_700',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            $scope.editEventTireTicketSubmit = function (addMore, ticketindex) {
                let newTicket = JSON.parse(JSON.stringify($scope.displayEvent.tickets));
                $scope.validateTime($scope.displayEvent.tickets.saleStartDate.date, $scope.displayEvent.tickets.saleStartDate.time, $scope.displayEvent.tickets.saleEndDate.date, $scope.displayEvent.tickets.saleEndDate.time, 'create_event_form_admissions_3', 'saleStartDate');
                let update_ticket_holder = [];
                angular.forEach($scope.showTireTickeArr, function (ticket, ticket_index) {
                    if (newTicket.ticket_group_id == ticket.ticket_group_id) {
                        angular.forEach(newTicket.edit_tier_details, function (tire, tire_index) {
                            if (ticket._tier_id == tire._tier_id) {
                                let update_ticket = ticket;
                                update_ticket.price = tire.price;
                                update_ticket.ticket_name = newTicket.ticket_name;
                                update_ticket.is_absorb = $scope.is_absorb;
                                update_ticket.service_fee = parseFloat($scope.service_fee);
                                update_ticket.stripe_fee = parseFloat($scope.processing_fee);
                                update_ticket.total_price = parseFloat($scope.buyer_total);
                                update_ticket.ticket_type = newTicket.ticket_type;
                                update_ticket_holder.push(update_ticket);
                            }
                        });
                    } else {
                        update_ticket_holder.push(ticket);
                    }
                });
                $scope.showTireTickeArr = update_ticket_holder;
                newTicket.saleStartDate.date = ($scope.displayEvent.tickets.saleStartDate.date).format("YYYY-MM-DD");
                newTicket.saleStartDate.time = moment($scope.displayEvent.tickets.saleStartDate.time, 'hh:mma').format("HH:mm");
                newTicket.saleEndDate.date = ($scope.displayEvent.tickets.saleEndDate.date).format("YYYY-MM-DD");
                newTicket.saleEndDate.time = moment($scope.displayEvent.tickets.saleEndDate.time, 'hh:mma').format("HH:mm");
                newTicket.is_absorb = $scope.is_absorb;
                newTicket.service_fee = parseFloat($scope.service_fee);
                newTicket.stripe_fee = parseFloat($scope.processing_fee);
                newTicket.total_price = parseFloat($scope.buyer_total);
                newTicket.remaining_qty = $scope.displayEvent.tickets.quantity;
                newTicket.ticket_type = $scope.displayEvent.tickets.ticket_type;
                newTicket.ticket_id = $scope.displayEvent.tickets.ticket_id;
                $scope.displayEvent.ticketsArr.push(newTicket);
                $scope.paidEventTicketsModel.close();

            };

            /*
             **
             ** Sponsored Payment Modal
             **
             */
            let card1, cardExpiry1, cardCvc1, card, cardExpiry, cardCvc;
            $scope.close = function () {
                this.$close('close');
                if (!$scope.gatewayID) {
                    cardExpiry.destroy('#bi-card-expiry');
                    card.destroy('#bi-card-element');
                    cardCvc.destroy('#bi-card-cvc');
                } else {
                    cardExpiry1.destroy('#bi-card-expiry1');
                    card1.destroy('#bi-card-element1');
                    cardCvc1.destroy('#bi-card-cvc1');
                }
            };

            let SaveChecked = true;
            $scope.currentSavedUncheced = () => {
                if (SaveChecked) {
                    $scope.currentSavedChecked = false;
                    $scope.accountDisablePay = true;
                    SaveChecked = false;
                    setTimeout(function () {
                        // Custom styling can be passed to options when creating an Element.
                        let style = Utils.stripeStyle();

                        // Create an instance of the card Element.
                        card1 = elements.create('cardNumber', { style: style });

                        // Add an instance of the card Element into the `account-card-element` <div>.
                        card1.mount('#bi-card-element1');

                        cardExpiry1 = elements.create('cardExpiry', { style: style });
                        cardExpiry1.mount('#bi-card-expiry1');

                        cardExpiry1.addEventListener('change', function (event) {
                            if (event.complete) {
                                $scope.cardDetails.expiry = true;
                            } else {
                                $scope.cardDetails.expiry = false;
                            }
                            updateButtonState();
                            Utils.applyChanges($scope);
                        });

                        cardCvc1 = elements.create('cardCvc', {
                            style: style,
                            placeholder: 'e.g. 012',
                            classes: { base: 'cvc-code-img' }
                        });
                        cardCvc1.mount('#bi-card-cvc1');

                        cardCvc1.addEventListener('change', function (event) {
                            if (event.complete) {
                                $scope.cardDetails.cvv = true;
                            } else {
                                $scope.cardDetails.cvv = false;
                            }
                            updateButtonState();
                            Utils.applyChanges($scope);
                        });

                        card1.addEventListener('change', function (event) {
                            // Switch brand logo
                            if (event.brand) {
                                setBrandIcon(event.brand);
                            }

                            if (event.error) {
                                Utils.showError($scope, event.error.message);
                                $scope.cardDetails.card = false;
                            }

                            if (event.complete) {
                                $scope.cardDetails.card = true;
                            } else {
                                $scope.cardDetails.card = false;
                            }
                            updateButtonState();
                            Utils.applyChanges($scope);
                        });
                        createElementFlag = false;
                    }, 1000);
                } else {
                    $scope.currentSavedChecked = true;
                    $scope.accountDisablePay = false;
                    SaveChecked = true;
                }
            };

            $scope.sponsoredPayment = function () {
                let eventModelScope = $scope.$new(false, $scope);
                $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/sponsoredPaymentModal.html',
                    openedClass: 'pa-create-event-modal add-link-modal',
                    scope: eventModelScope,
                    size: 'md'
                });
                if ($scope.gatewayID) {
                    $scope.currentSavedChecked = true;
                    $scope.accountDisablePay = false;
                    SaveChecked = true;
                }
                setTimeout(function () {
                    if (!$scope.gatewayID) {
                        // Custom styling can be passed to options when creating an Element.
                        let style = Utils.stripeStyle();

                        // Create an instance of the card Element.
                        card = elements.create('cardNumber', { style: style });

                        // Add an instance of the card Element into the `account-card-element` <div>.
                        card.mount('#bi-card-element');

                        cardExpiry = elements.create('cardExpiry', { style: style });
                        cardExpiry.mount('#bi-card-expiry');

                        cardExpiry.addEventListener('change', function (event) {
                            if (event.complete) {
                                $scope.cardDetails.expiry = true;
                            } else {
                                $scope.cardDetails.expiry = false;
                            }
                            updateButtonState();
                            Utils.applyChanges($scope);
                        });

                        cardCvc = elements.create('cardCvc', {
                            style: style,
                            placeholder: 'e.g. 012',
                            classes: { base: 'cvc-code-img' }
                        });
                        cardCvc.mount('#bi-card-cvc');

                        cardCvc.addEventListener('change', function (event) {
                            if (event.complete) {
                                $scope.cardDetails.cvv = true;
                            } else {
                                $scope.cardDetails.cvv = false;
                            }
                            updateButtonState();
                            Utils.applyChanges($scope);
                        });

                        card.addEventListener('change', function (event) {
                            // Switch brand logo
                            if (event.brand) {
                                setBrandIcon(event.brand);
                            }

                            if (event.error) {
                                Utils.showError($scope, event.error.message);
                                $scope.cardDetails.card = false;
                            }

                            if (event.complete) {
                                $scope.cardDetails.card = true;
                            } else {
                                $scope.cardDetails.card = false;
                            }
                            updateButtonState();
                            Utils.applyChanges($scope);
                        });
                    }
                    var forms = document.getElementById('bi-payment-form');
                    forms.addEventListener('submit', function (event) {
                        $scope.loading = true;
                        if (!$scope.gatewayID) {
                            stripe.createToken(card)
                                .then(function (result) {
                                    if (result.error) {
                                        Utils.showError($scope, result.error.message);
                                        $scope.accountDisablePay = false;
                                        $scope.loading = false;
                                        return Promise.reject();
                                    } else {
                                        let token = authService.get('token');
                                        let data = {
                                            token: result.token.id
                                        };

                                        if ($scope.wantToSaveCard) {
                                            data.card_id = result.token.card.id;
                                            data.is_saveChecked = $scope.wantToSaveCard;
                                        }
                                        return awsService.put(`/event/highlight/${ $scope.displayEvent.event_id }`, data, token);
                                    }
                                })
                                .then((res) => {
                                    if ($scope.wantToSaveCard) {
                                        Utils.showSuccess($scope, "Card Saved Successfully.");
                                        userService.getUserProfile($scope.user.user_id).then((response) => {
                                            if (response && 'data' in response) {
                                                let user = response.data.data;
                                                $scope.user.stripe_defualt_card = user.stripe_defualt_card;
                                                authService.setUser($scope.user);
                                            }
                                        });
                                    } else if (!$scope.currentSavedChecked) {
                                        Utils.showSuccess($scope, "Card Updated Successfully.");
                                    } else {
                                        Utils.showSuccess($scope, "Payment Successfully Done.");
                                    }
                                    $scope.loading = false;
                                    $scope.draft_value = false;
                                    $scope.saveEvent(false);
                                    $scope.displayEvent.highlighted = true;
                                    $scope.displayEvent.sponsored_event = true;
                                    Utils.applyChanges($scope);
                                })
                                .catch((err) => {
                                    console.log(err);
                                    if (err && err.message) {
                                        Utils.showError($scope, err.message);
                                    }
                                });
                        } else if ($scope.currentSavedChecked === false) {

                            stripe.createToken(card1)
                                .then(function (result) {
                                    if (result.error) {
                                        Utils.showError($scope, result.error.message);
                                        $scope.accountDisablePay = false;
                                        $scope.loading = false;
                                        return Promise.reject();
                                    } else {
                                        let token = authService.get('token');
                                        let data = {
                                            token: result.token.id
                                        };

                                        if ($scope.wantToSaveCard) {
                                            data.card_id = result.token.card.id;
                                            data.is_saveChecked = $scope.wantToSaveCard;
                                        }
                                        return awsService.put(`/event/highlight/${ $scope.displayEvent.event_id }`, data, token);
                                    }
                                })
                                .then(res => {
                                    if ($scope.wantToSaveCard && !$scope.currentSavedChecked) {
                                        Utils.showSuccess($scope, "Card Updated Successfully.");
                                        userService.getUserProfile($scope.user.user_id).then((response) => {
                                            if (response && 'data' in response) {
                                                let user = response.data.data;
                                                $scope.user.stripe_defualt_card = user.stripe_defualt_card;
                                                authService.setUser($scope.user);
                                            }
                                        });
                                    }
                                    Utils.showSuccess($scope, "Payment Successfully Done.");
                                    $scope.loading = false;
                                    $scope.displayEvent.highlighted = true;
                                    $scope.displayEvent.sponsored_event = true;
                                    $scope.draft_value = false;
                                    $scope.saveEvent(false);
                                    Utils.applyChanges($scope);
                                })
                                .catch((err) => {
                                    console.log(err);
                                    if (err && err.message) {
                                        Utils.showError($scope, err.message);
                                    }
                                });
                        } else {
                            let token = authService.get('token');
                            let data = {
                                card_id: $scope.user.stripe_defualt_card
                            };
                            awsService.put(`/event/highlight/${ $scope.displayEvent.event_id }`, data, token).then(res => {
                                Utils.showSuccess($scope, "Payment Successfully Done.");
                                $scope.loading = false;
                                $scope.displayEvent.highlighted = true;
                                $scope.displayEvent.sponsored_event = true;
                                $scope.draft_value = false;
                                $scope.saveEvent(false);
                                Utils.applyChanges($scope);
                            }).catch((err) => {
                                console.log(err);
                                $scope.loading = false;
                                if (err && err.message) {
                                    Utils.showError($scope, err.message);
                                }
                            });
                        }
                    });
                }, 1000);
            };

            /*
             **
             ** Stripe payment function
             **
             */
            function setBrandIcon(brand) {
                let brandIconElement = document.getElementById('brand-icon');
                let pfClass = 'pf-credit-card';
                if (brand in cardBrandToPfClass) {
                    pfClass = cardBrandToPfClass[brand];
                }
                for (let i = brandIconElement.classList.length - 1; i >= 0; i--) {
                    brandIconElement.classList.remove(brandIconElement.classList[i]);
                }
                brandIconElement.classList.add('fa');
                brandIconElement.classList.add(pfClass);
            }

            function updateButtonState() {
                $scope.accountDisablePay = !($scope.cardDetails.card && $scope.cardDetails.cvv && $scope.cardDetails.expiry);
            }

            /******************** Code start for add administartor **********************************************************/

            /*
             **
             ** function to open add existing user as admin model
             **
             */

            $scope.OpenAddExistingUserAsAdminModel = function(state) {
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.model_title = state;
                let selectedAdminModel = [];
                let emailsArr = [];
                $scope.displayEvent.event_admin.forEach(function(admin) {
                    var item = {
                        id: admin.user_id,
                        administrator_id: admin.administrator_id,
                        name: (admin.first_name) ? admin.first_name + " " + admin.last_name : admin.username,
                        email: admin.email,
                        iconImage: (admin.profile_pic === null) ? '../img/defaultProfilePic.png' : admin.profile_pic
                    };
                    if (emailsArr.indexOf(admin.email) === -1) {
                        selectedAdminModel.push(item);
                    }
                    emailsArr.push(admin.email);
                });
                $scope.multipleDemo.selectedAdmins = selectedAdminModel;
                $scope.existingUserAsAdminModel = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/addExistingUserAsAdminManageModel.html',
                    openedClass: 'pa-common-modal-style tt-scan-qr-modal',
                    scope: eventModelScope,
                    backdrop: 'static',
                    keyboard: false,
                    size: 'md'
                });
            };


            /*
             **
             ** function to open add ne user as admin model
             **
             */

            $scope.OpenAddNewAdminUserModel = function () {
                let eventModelScope = $scope.$new(false, $scope);
                $scope.newAdminUserModel = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/addNewAdminUserModel.html',
                    openedClass: 'pa-create-event-modal freeEventTickets unSaved scroll_popup popup_wtd_700',
                    scope: eventModelScope,
                    backdrop: 'static',
                    keyboard: false,
                    size: 'md'
                });
            };

            $scope.addNewAdmin = function (admin_name, admin_email) {

                let existingUsers = ($scope.newAddedAdmin.length > 0) ? $scope.newAddedAdmin : [];

                let data = {
                    "existingUsers": existingUsers,
                    "newUsers": [{
                        "name": admin_name,
                        "email": admin_email
                    }]
                };

                eventsService.inviteAdministrator(data, $scope.displayEvent.event_id).then((response) => {
                    if (response.success) {
                        let notify = {
                            type: 'success',
                            title: 'Success',
                            content: "Invitation send succcessfully.",
                            timeout: 3000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        $scope.newAdminUserModel.close();
                    }
                }).catch(err => {
                    let content = err.message;
                    let notify = {
                        type: 'error',
                        title: 'Oops!!',
                        content: content,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                });
            };

            $scope.addAdminToEvent = function (selectedAdmins) {
                //code to get new added admin 
                $scope.selectedAdmins = selectedAdmins;
                $scope.newAddedAdminId = [];
                $scope.newAddedAdminEmail = [];
                let tagEmail = '';
                let adminEmail = '';
                for (let newAdmin of $scope.selectedAdmins) {
                    if (newAdmin.id == '' && newAdmin.administrator_id == '') {
                        let temp = {
                            "name": "",
                            "email": newAdmin.email
                        };
                        $scope.newAddedAdminEmail.push(temp);

                        let user_id = newAdmin.user_id;
                        let name = '';

                        for (let admin of $scope.displayAdmins) {
                            tagEmail = newAdmin.email;
                            adminEmail = admin.email;
                            if (tagEmail == adminEmail) {
                                user_id = admin.id;
                                name = admin.name;
                            }
                        }

                        //for list
                        let tempAdminInfo = {
                            "administrator_id": 0,
                            "email": newAdmin.email,
                            "user_id": user_id,
                            "username": name,
                            "profile_pic": newAdmin.iconImage,
                        };
                        $scope.displayEvent.event_admin.push(tempAdminInfo);
                    } else if (newAdmin.administrator_id == '' || newAdmin.administrator_id == 0) {
                        $scope.newAddedAdminId.push(newAdmin.id);
                        //for list
                        let tempAdminInfo = {
                            "administrator_id": 0,
                            "email": newAdmin.email,
                            "user_id": newAdmin.user_id,
                            "username": newAdmin.name,
                            "profile_pic": newAdmin.iconImage,
                        };
                        $scope.displayEvent.event_admin.push(tempAdminInfo);
                    }
                }

                if ($scope.newAddedAdminId.length == 0 && $scope.newAddedAdminEmail.length == 0) {
                    $scope.existingUserAsAdminModel.close();
                    return false;
                }

                let data = {
                    "existingUsers": $scope.newAddedAdminId,
                    "newUsers": $scope.newAddedAdminEmail
                };

                eventsService.inviteAdministrator(data, $scope.displayEvent.event_id).then((response) => {
                    if (response.success) {
                        let notify = {
                            type: 'success',
                            title: 'Success',
                            content: "Invitation send succcessfully.",
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                    }
                }).catch(err => {
                    let content = err.message;
                    let notify = {
                        type: 'error',
                        title: 'Oops!!',
                        content: content,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                });


                $scope.existingUserAsAdminModel.close();
            };

            $scope.checkUserID = function (userId, searchArray) {
                for (let sa of searchArray) {
                    if (sa.user_id == userId) {
                        return true;
                    }
                }
                return false;
            };

            // Remove guest
            $scope.deleteAdmin = function (index, adminID) {
                $scope.displayEvent.event_admin.splice(index, 1);
                if (adminID >= 0) {
                    $scope.deletedAdmin.push(adminID);
                }
            };

            $scope.afterRemoving = function($item) {};
            $scope.multipleDemo = {
                selectedAdmins: []
            };
            $scope.errorMail = false;
            $scope.duplicateMail = false;

            $scope.checkAllValidMail = function() {
                var exp = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
                let valuesSoFar = [];
                for (var i of $scope.multipleDemo.selectedAdmins) {
                    if (exp.test(i.email)) {
                        $scope.errorMail = false;
                    } else {
                        $scope.errorMail = true;
                        $scope.multipleDemo.selectedAdmins.slice(i, 1);
                        break;
                    }
                    //code to check duplicate value
                    let selectedEmail = i.email;
                    if (valuesSoFar.indexOf(selectedEmail) === -1) {
                        $scope.duplicateMail = false;
                    } else {
                        $scope.duplicateMail = true;
                        break;
                    }
                    valuesSoFar.push(selectedEmail);
                }
            };

            $scope.afterSelection = function ($item) { };

            $scope.tagTransform = function (newTag) {
                var item = {
                    id: '',
                    administrator_id: '',
                    name: '',
                    email: newTag.toLowerCase(),
                    iconImage: '../img/defaultProfilePic.png'
                };
                return item;

            };

            /******************** Code End for add administartor **********************************************************/

            // This function is called on click Add Promotion
            $scope.addPromotionRoute = (value) => {
                if ($scope.promotionGuidance == undefined) {
                    $cookies.put('promotionGuidance', true);
                }
                $window.location.href = `/createreward/add/${value}`;
            };

            // This function is called when event has Administrator send email history
            $scope.getInvitedHistory = function(id) {
                let token = authService.get('token');
                apiService.inviteAdminHistory(id, token).then((response) => {
                    if (response.status == 200) {
                        let data = response.data;
                        if (data.success) {
                            let catData = data.data;
                            if (catData.accepted_users.length > 0 || catData.pending_users.length > 0 || catData.rejected_users.length > 0) {
                                $scope.visibleinvitedHistory = true;
                                if (catData.accepted_users.length > 0) {
                                    catData.accepted_users.forEach(function(acceptedData) {
                                        let acceptedUsers = {
                                            email: acceptedData.email,
                                            status: 'Accepted'
                                        };
                                        $scope.invitedList.push(acceptedUsers);
                                    });
                                }
                                if (catData.pending_users.length > 0) {
                                    catData.pending_users.forEach(function(pendingData) {
                                        let pendingUsers = {
                                            email: pendingData.email,
                                            status: 'Pending'
                                        };
                                        $scope.invitedList.push(pendingUsers);
                                    });
                                }
                                if (catData.rejected_users.length > 0) {
                                    catData.rejected_users.forEach(function(rejectedData) {
                                        let rejectedUsers = {
                                            email: rejectedData.email,
                                            status: 'Rejected'
                                        };
                                        $scope.invitedList.push(rejectedUsers);
                                    });
                                }
                            } else {
                                $scope.visibleinvitedHistory = false;
                            }
                        }
                    }
                });
            };

            $scope.viewInvitedAdminModal = function() {
                let modalScope = $scope.$new(false, $scope);
                viewInvitedAdminModal = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    backdrop: 'static',
                    templateUrl: './partials/viewInvitedHistory.html',
                    windowClass: 'pa-common-modal-style tt-scan-qr-modal',
                    openedClass: 'attendee_main_parent scroll_popup',
                    scope: modalScope,
                });
            };

            /*
             ** Get Zone List
             */
            $scope.getZoneList = () => {
                $scope.loading = true;
                let token = authService.get('token');
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
                                    if ($scope.zoneId != null) {
                                        if (data.zone_id === $scope.zoneId) {
                                            $scope.displayEvent.zone_id = data;
                                        }
                                    }
                                }
                            });
                        } else if (zoneOrganizer.length > 0 && zoneOwner.length == 0) {
                            zoneOrganizer.forEach((data) => {
                                if (zoneListOrg.indexOf(data.zone_id) == -1) {
                                    $scope.zoneList.push(data);
                                    if ($scope.zoneId != null) {
                                        if (data.zone_id === $scope.zoneId) {
                                            $scope.displayEvent.zone_id = data;
                                        }
                                    }
                                }
                            });
                        } else {
                            zoneOrganizer.forEach((data) => {
                                $scope.zoneList.push(data);
                                if ($scope.zoneId != null) {
                                    if (data.zone_id === $scope.zoneId) {
                                        $scope.displayEvent.zone_id = data;
                                    }
                                }
                            });
                        }
                        if ($scope.zoneList) {
                            for (let zone of $scope.zoneList) {
                                if (zone.zone_id == $scope.zoneId) {
                                    zone.selected = true;
                                }
                                $scope.displayEvent.zone_id = zone;
                            }
                        }
                        Utils.applyChanges($scope);
                    }
                }).catch((err) => {
                    console.log("Get Zone List", err);
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
                                $window.localStorage.removeItem("localDataSet");
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

            $scope.descriptionLengthLess = false;
            $scope.descriptionLength = 0;
            $scope.callCounter = 1;
            $scope.$watch('displayEvent.description', function() {
                if ($scope.displayEvent.description.length == 0) {
                    $scope.characters_count = 0;
                }
                if ($scope.callCounter == 1) {
                    $scope.callCounter = 2;
                    return;
                } else {
                    $scope.characters_count = $scope.get_characters_count($scope.displayEvent.description);
                    $scope.descriptionLength = $scope.characters_count;
                    if ($scope.characters_count < 50) {
                        $scope.descriptionLengthLess = true;
                        $scope.editorblur = true;
                    } else {
                        $scope.descriptionLengthLess = false;
                    }
                    $scope.saveDataLocal();
                    $scope.callCounter = 1;
                }
                Utils.applyChanges($scope);
            });

            /**
             * Code to save data in local storage
             **/

            $scope.saveDataLocal = function() {
                let localDataSet = {
                    'event_id': $scope.displayEvent.event_id ? $scope.displayEvent.event_id : '',
                    'event_name': $scope.displayEvent.event_name,
                    'selectedCategory': $scope.displayEvent.selectedCategory.length > 0 ? $scope.displayEvent.selectedCategory[0].id : "",
                    'zone_id': $scope.displayEvent.zone_id.length > 0 ? $scope.displayEvent.zone_id[0].zone_id : "",
                    'venue_is': $scope.displayEvent.venue_is ? $scope.displayEvent.venue_is : "finalised",
                    'chosenPlace': $scope.displayEvent.chosenPlace,
                    'address': $scope.displayEvent.address,
                    'location': $scope.displayEvent.location,
                    'country_code': $scope.displayEvent.country_code,
                    'seat_layout': $scope.displayEvent.seat_layout,
                    'pickSeats': $scope.displayEvent.pickSeats,
                    'timezone': $scope.displayEvent.timezone,
                    'files': $scope.displayEvent.files,
                    'description': $scope.displayEvent.description,
                    'website': $scope.displayEvent.website,
                    'email': $scope.displayEvent.email,
                    'phone': $scope.displayEvent.phone,
                    'countryCode': $scope.countryCode,
                    'event_type': $scope.displayEvent.event_type,
                    "privacy_type": $scope.displayEvent.privacy_type,
                    "event_access_type": $scope.displayEvent.event_access_type,
                    "password": $scope.displayEvent.password,
                    'admission_event_type': $scope.displayEvent.admission_event_type,
                    'tickets': $scope.displayEvent.ticketsArr,
                    'layout_details': $scope.displayEvent.layout_details
                };
                localDataSet.address.streetAddress = $scope.displayEvent.address.streetAddress;
                $window.localStorage.setItem("localDataSet", JSON.stringify(localDataSet));
            };

            /**
             * Code to save event details into database on page leave.
             **/

            $rootScope.$on('$routeChangeStart', function(event, next, current) {
                if ($scope.flashMessage && !tempRouteChange) {
                    tempRouteChange = $scope.flashMessage;
                    event.preventDefault();
                }
                if (tempRouteChange && !$scope.showHide.isMobile.matches && !$scope.designVenueRedirect) {
                    let ConfirmationFlag = confirm("Your event has not been saved yet, are you sure you want to discard your changes?");
                    if (ConfirmationFlag) {
                        ConfirmationFlag = false;
                        tempRouteChange = false;
                        $scope.flashMessage = false;
                        if (next.params.ev) {
                            $window.location.href = '' + next.originalPath + '?ev=' + next.params.ev;
                        } else {
                            $window.location.href = '' + next.originalPath;
                        }
                    } else if (!ConfirmationFlag) {
                        let notify = {
                            type: 'info',
                            title: 'Info',
                            content: 'Please click on Save Changes button and save your changes.',
                            timeout: 3000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        tempRouteChange = false;
                        $scope.flashMessage = true;
                       
                    }
                }
                $mdDialog.hide({ state: "close", image: $scope.croppedImage });
                let localDataSet = $window.localStorage.getItem("localDataSet");
                if ($scope.displayEvent.is_draft && !$scope.flashMessage && !$scope.showHide.isMobile.matches && $scope.action != 'Create') {
                    let notify = {
                        type: 'info',
                        title: 'Info',
                        content: 'Event was saved to draft.',
                        timeout: 3000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                } else if (!$scope.displayEvent.is_draft) {
                    let notify = {
                        type: 'info',
                        title: 'Info',
                        content: 'Event was saved to live.',
                        timeout: 3000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                }
                if (localDataSet && $scope.categoryFlag) {
                    if ($scope.draft_value) {
                        $scope.saveEvent($scope.draft_value);
                    }
                    $window.localStorage.removeItem("localDataSet");
                }
                $window.localStorage.removeItem("localDataSet");
            });


            $scope.get_characters_count = function(myString) {
                let filterString = myString.replace('&#65279;', '');
                var tmp = document.createElement("DIV");
                tmp.innerHTML = filterString;
                var res = tmp.textContent || tmp.innerText || '';
                res.replace('\u200B', ''); // zero width space
                res = res.trim();
                return res.length;
            };

            $scope.checkPassword = (value) => {
                let valuePassword = new RegExp(/^(?=.*[A-Z])(?=.*\d)(?=.*[$@$!%*#?&])[A-Za-z\d$@$!%*#?&]{8,50}$/);
                if (valuePassword.test(value)) {
                    $scope.createEventForms.privacy_Event.password.$setValidity('pattern', true);
                } else {
                    $scope.createEventForms.privacy_Event.password.$setValidity('pattern', false);
                }
            };

            $scope.navElement = function() {
                setTimeout(function() { window.scrollTo(0, document.querySelector(".hideScrollbar").scrollHeight); }, 500);
            };

            $scope.changePrivacyData = () => {
                if ($scope.displayEvent.privacy_type[0].key == 'public') {
                    $scope.displayEvent.event_access_type = '';
                    $scope.displayEvent.password = '';
                } else {
                    $scope.dropdowns.event_access_type.value = 1;
                    $scope.displayEvent.event_access_type = 1;
                }
                $scope.saveDataLocal();
            };

            /*
             **
             ** Init call
             **
             */
            $scope.init = function () {
                $scope.loading = true;
                $scope.loadingMessage = 'Loading...';
                $.get("https://ipapi.co/json/").then(function(response) {
                    $scope.countryCodeValue = response.country_calling_code;
                    $scope.countryCode = response.country_calling_code;
                });
                // Load gateway id of user
                $scope.user = authService.getUser();
                apiService.getEventCategories().then((response) => {
                    if (response.status == 200) {
                        let data = response.data;
                        if (data.success) {
                            let catData = data.data;
                            catData.forEach(function (cat) {
                                let category = {};
                                category.id = cat.slug;
                                category.name = cat.category_name;
                                category.icon = cat.category_image;
                                category.iconImg = "<img src=" + cat.category_image + " alt='image' />";
                                category.marker = cat.category_image;
                                category.unselectedIcon = cat.category_image;
                                category.selected = false;

                                $scope.categoriesMap.push(category);
                            });
                        }
                    }
                    $scope.categories = Object.values($scope.categoriesMap);
                    $scope.getZoneList();
                    $scope.loadUserCurrentPlan();
                    $scope.showHide.isMobile = window.matchMedia("only screen and (max-width: 1024px)");
                    //cdoe to check payout active or not when user  edit event
                    userService.getUserProfile($scope.user.user_id).then((response) => {
                        if (response && 'data' in response) {
                            let user = response.data.data;
                            $scope.user.stripe_account_id = user.stripe_account_id;
                            $scope.user.stripe_defualt_card = user.stripe_defualt_card;
                            $scope.user.is_verified = user.is_verified;
                            $scope.user.charges_enabled = user.charges_enabled;
                            $scope.user.payouts_enabled = user.payouts_enabled;
                            $scope.user.is_feedback = user.is_feedback;
                            authService.setUser($scope.user);
                        }
                        if ($scope.user.stripe_defualt_card != '') {
                            let token = authService.get('token');
                            awsService.get('user/getDefultCardDetails', token).then((getDefultCardDetails) => {
                                $scope.gateway = getDefultCardDetails.data;
                                $scope.accountDisablePay = false;
                                $scope.gatewayID = true;
                            });
                        }
                    });

                    $scope.unlimitedPlanAmount = config.PLANS.filter(p => p.id === 'unlimited')[0].amount;
                    let timeZones = moment.tz.names();
                    $scope.plans = config.PLANS.filter(p => p.isPromo);

                    for (let i in timeZones) {
                        let tz = " (GMT" + moment.tz(timeZones[i]).format('Z') + ")" + timeZones[i];
                        $scope.dropdowns.timezones.options.push({ key: timeZones[i], value: tz });
                    }

                    /**
                     * Code to get data for local storage
                     **/

                    let localDataSet = $window.localStorage.getItem("localDataSet");
                    if (localDataSet) {
                        localDataSet = JSON.parse(localDataSet);
                        if (localDataSet.event_id != '') {
                            $scope.displayEvent.event_id = localDataSet.event_id;
                        }

                        $scope.displayEvent.event_name = localDataSet.event_name;
                        let selectedCategory = '';
                        let selectedZone = '';
                        for (let category of $scope.categories) {
                            if (category.id === localDataSet.selectedCategory) {
                                category.selected = true;
                                selectedCategory = category;
                            }
                        }
                        let zoneData = [];
                        if ($scope.displayEvent.zone_id.length == 0) {
                            setTimeout(function() {
                                for (let zone of $scope.zoneList) {
                                    if (zone.zone_id == localDataSet.zone_id) {
                                        zone.selected = true;
                                        selectedZone = zone;
                                    }
                                    zoneData.push(selectedZone);
                                }
                                $scope.displayEvent.zone_id = zoneData;
                            }, 2000);
                        }
                        $scope.displayEvent.selectedCategory.push(selectedCategory);
                        $scope.displayEvent.venue_is = localDataSet.venue_is;
                        $scope.displayEvent.chosenPlace = localDataSet.chosenPlace;
                        $scope.displayEvent.address = localDataSet.address;
                        $scope.displayEvent.location = localDataSet.location;
                        $scope.displayEvent.latitude = $scope.displayEvent.location[0];
                        $scope.displayEvent.longitude = $scope.displayEvent.location[1];
                        $scope.displayEvent.country_code = localDataSet.country_code;

                        if ($scope.displayEvent.latitude && $scope.displayEvent.latitude != 0 && $scope.displayEvent.longitude && $scope.displayEvent.longitude != 0) {

                            $scope.selectLocation({
                                lat: $scope.displayEvent.latitude,
                                long: $scope.displayEvent.longitude,
                                address: {
                                    city: $scope.displayEvent.address.city,
                                    country: $scope.displayEvent.address.country,
                                    state: $scope.displayEvent.address.state,
                                    streetAddress: localDataSet.address.streetAddress,
                                    zipcode: localDataSet.address.zipcode,
                                },
                                country_short_code: $scope.displayEvent.country_code
                            });

                            if (typeof $scope.displayEvent.address.zipcode != 'undefined') {
                                $scope.displayEvent.address.zipcode = ($scope.displayEvent.address.zipcode).toString();
                            }

                        } else {
                            $scope.displayEvent.location = [];
                        }

                        $scope.displayEvent.seat_layout = localDataSet.seat_layout;
                        $scope.displayEvent.pickSeats = localDataSet.pickSeats;
                        $scope.displayEvent.timezone = localDataSet.timezone;

                        if ('files' in localDataSet && localDataSet.files != '') {
                            $scope.displayEvent.files = localDataSet.files;
                        }

                        if ('description' in localDataSet && localDataSet.description != '') {
                            $scope.displayEvent.description = localDataSet.description;
                        }

                        if ('privacy_type' in localDataSet && localDataSet.privacy_type.length > 0) {
                            if (localDataSet.privacy_type[0].key == 'private') {
                                $scope.dropdowns.event_privacy.options[0].selected = false;
                                $scope.dropdowns.event_privacy.options[1].selected = true;
                            } else {
                                $scope.dropdowns.event_privacy.options[0].selected = true;
                            }
                        }
                        $scope.displayEvent.privacy_type = localDataSet.privacy_type;

                        if ('layout_details' in localDataSet && Object.keys(localDataSet.layout_details).length > 0) {
                            $scope.displayEvent.layout_details = localDataSet.layout_details;
                        }

                        if ('password' in localDataSet && localDataSet.password != '') {
                            $scope.displayEvent.password = localDataSet.password;
                        }

                        if ('event_access_type' in localDataSet && localDataSet.event_access_type != '') {
                            $scope.displayEvent.event_access_type = localDataSet.event_access_type;
                        }

                        if ('website' in localDataSet && localDataSet.website != '') {
                            $scope.displayEvent.website = localDataSet.website;
                        }

                        if ('email' in localDataSet && localDataSet.email != '') {
                            $scope.displayEvent.email = localDataSet.email;
                        }

                        if ('phone' in localDataSet && localDataSet.phone != '') {
                            $scope.displayEvent.phone = localDataSet.phone;
                        }

                        if ('countryCode' in localDataSet && localDataSet.countryCode != '') {
                            $scope.countryCode = localDataSet.countryCode;
                        }

                        if ('event_type' in localDataSet && localDataSet.event_type != '') {
                            $scope.displayEvent.event_type = localDataSet.event_type;
                            $scope.displayEvent.ticket_type = localDataSet.event_type;
                        }

                        if ('admission_event_type' in localDataSet && localDataSet.admission_event_type != '') {
                            $scope.displayEvent.admission_event_type = localDataSet.admission_event_type;
                        }

                        if ('tickets' in localDataSet && localDataSet.tickets.length > 0) {
                            $scope.displayEvent.ticketsArr = localDataSet.tickets;
                        }

                        if (Object.keys(localDataSet.privacy_type).length > 0) {
                            if (localDataSet.privacy_type.key == 'private') {
                                $scope.dropdowns.event_privacy.options[0].selected = false;
                                $scope.dropdowns.event_privacy.options[1].selected = true;
                            } else {
                                $scope.dropdowns.event_privacy.options[0].selected = true;
                            }
                        }
                        $scope.displayEvent.privacy_type = localDataSet.privacy_type;
                    }

                    let promise = null;
                    if (($route.current.params && 'eventId' in $route.current.params) || ($route.current.params && 'ev' in $route.current.params && $route.current.params.ev)) {
                        let eventId = $route.current.params.ev ? $route.current.params.ev : $route.current.params.eventId;
                        promise = getEvent(eventId);
                        if ($route.current.params.ev) {
                            $scope.action = 'edit';
                        } else {
                            $scope.action = $route.current.params.action;
                        }

                        $scope.ImageUploadDone = false;
                        if ($scope.action == 'claim') {
                            $scope.plans = config.PLANS.filter(p => p.isPhq && !p.frequency);
                        }
                        let event_action = authService.get('event_action_id');
                        if (typeof event_action !== 'undefined') {
                            if (event_action !== $route.current.params.eventId) {
                                authService.remove('event_action_id');
                            }
                        }
                        $scope.getStripeAccountInfo($route.current.params.eventId);
                    } else {
                        authService.remove('event_action_id');
                        authService.put('showMessage', 1);
                        promise = Promise.resolve(null);
                    }
                    if ($scope.plans[0].checked) {
                        $scope.plans[0].checked = false;
                    }
                    let event_action = authService.get('event_action_id');
                    if (typeof event_action !== 'undefined') {
                        $scope.redirectFormStripe = true;
                        authService.remove('event_action_id');
                    }

                    promise.then((res) => {
                        if (res) { // This means it is edit event
                            // Populate displayEvent using res
                            if ($scope.action !== 'claim' && !eventsService.allowToEdit(res, $scope.user.user_id)) {
                                Utils.showError($scope, 'You are not authorised to edit this event');
                                return;
                            }

                            let obj = res;
                            $scope.editEvent = obj;
                            $scope.displayEvent.event_id = obj.event_id;
                            $scope.displayEvent.event_name = obj.event_name;
                            if ($scope.showHide.isMobile.matches) {
                                $scope.displayEvent.selectedCategory = obj.category;
                                $scope.displayEvent.zone_id = obj._zone_id;
                            } else {
                                for (let category of $scope.categories) {
                                    if (category.id === obj.category) {
                                        category.selected = true;
                                        $scope.displayEvent.selectedCategory = category;
                                    }
                                }

                                for (let zone of $scope.zoneList) {
                                    if (zone.zone_id === obj._zone_id) {
                                        zone.selected = true;
                                    }
                                    $scope.displayEvent.zone_id = zone;
                                }
                            }

                            $scope.displayEvent.venue_is = obj.venue_is;
                            let editVenueOption = [];
                            for (let venue of $scope.newVenues) {
                                if (venue.key == obj.venue_is) {
                                    venue.selected = true;
                                } else {
                                    venue.selected = false;
                                }
                                editVenueOption.push(venue);
                            }
                            $scope.newVenues = editVenueOption;

                            if (obj.privacy_type != '') {
                                let privacyData = [];
                                let privacyInfo = '';
                                if (obj.privacy_type == 1) {
                                    privacyInfo = "public";
                                } else {
                                    privacyInfo = "private";
                                }
                                $scope.displayEvent.privacy_type = [];
                                for (let privacy of $scope.dropdowns.event_privacy.options) {
                                    if (privacyInfo == privacy.key) {
                                        privacy.selected = true;
                                        $scope.displayEvent.privacy_type.push(privacy);
                                    } else {
                                        privacy.selected = false;
                                    }
                                    privacyData.push(privacy);
                                }
                                $scope.dropdowns.event_privacy.options = privacyData;
                                $scope.displayEvent.event_access_type = obj.event_access_type;
                                $scope.displayEvent.password = obj.password;
                            }

                            if ($scope.displayEvent.venue_is.key == 'finalised') {
                                $scope.showHide.searchVenueOptions = true;
                            } else {
                                $scope.showHide.searchVenueOptions = false;
                                $scope.displayEvent.location = [];
                            }

                            $scope.displayEvent.chosenPlace = obj.address;

                            $scope.displayEvent.location = [];
                            if ('latitude' in $scope.displayEvent && 'longitude' in $scope.displayEvent) {
                                $scope.displayEvent.location[0] = $scope.displayEvent.latitude;
                                $scope.displayEvent.location[1] = $scope.displayEvent.longitude;
                            }

                            if (obj.latitude) {
                                $scope.displayEvent.latitude = obj.latitude;
                                if (typeof ($scope.displayEvent.latitude) === 'string') {
                                    $scope.displayEvent.latitude = parseFloat($scope.displayEvent.latitude);
                                }
                            }
                            if (obj.longitude) {
                                $scope.displayEvent.longitude = obj.longitude;
                                if (typeof ($scope.displayEvent.longitude) === 'string') {
                                    $scope.displayEvent.longitude = parseFloat($scope.displayEvent.longitude);
                                }
                            }
                            if ('bank_id' in obj && obj.bank_id) {
                                $scope.displayEvent.bank_id = obj.bank_id;
                            }
                            if (obj.phqEvent) {
                                $scope.displayEvent.chosenPlace = obj.address;
                            }
                            $scope.currentInfoSection.push('create_event_form_2');
                            if (obj.is_seating_layout === 1) {
                                $scope.displayEvent.seat_layout = 'design';
                                if ($route.current.params.ev) {
                                    $scope.currentInfoSection.push('create_event_form_admissions_1');
                                }
                            } else {
                                $scope.displayEvent.seat_layout = 'tickets';
                                if ($route.current.params.ev) {
                                    $scope.currentInfoSection.push('create_event_form_admissions_1');
                                }
                            }
                            if (obj.is_attendee_pick === 1) {
                                $scope.displayEvent.pickSeats = true;
                                $scope.displayEvent.pickSeatsValue = true;
                            } else {
                                $scope.displayEvent.pickSeats = false;
                            }
                            if ($scope.displayEvent.latitude && $scope.displayEvent.latitude != 0 && $scope.displayEvent.longitude && $scope.displayEvent.longitude != 0) {
                                $scope.selectLocation({
                                    lat: obj.latitude,
                                    long: obj.longitude,
                                    address: {
                                        city: obj.city,
                                        country: obj.country,
                                        state: obj.address_state
                                    },
                                    country_short_code: obj.country_code
                                });
                                $scope.currentInfoSection.push('create_event_form_3');
                            } else {
                                $scope.displayEvent.location = [];
                            }

                            $scope.displayEvent.address.streetAddress = obj.street_address;
                            $scope.displayEvent.address.state = obj.address_state;
                            $scope.displayEvent.address.city = obj.city;
                            $scope.displayEvent.address.country = obj.country;
                            $scope.displayEvent.address.zipcode = (obj.zipcode).toString();
                            $scope.displayEvent.country_code = obj.country_code;

                            $scope.displayEvent.start.date = moment(obj.start_date_time);
                            $scope.displayEvent.start.time = moment(obj.start_date_time).format('h:mma');
                            $scope.displayEvent.end.date = moment(obj.end_date_time);
                            $scope.displayEvent.end.time = moment(obj.end_date_time).format('h:mma');

                            let start_time_match = false;

                            angular.forEach($scope.dropdowns.times.options, function (time_loop) {
                                if (time_loop.key == $scope.displayEvent.start.time) {
                                    start_time_match = true;
                                }
                            });

                            let end_time_match = false;

                            angular.forEach($scope.dropdowns.times.options, function (time_loop) {
                                if (time_loop.key == $scope.displayEvent.end.time) {
                                    end_time_match = true;
                                }
                            });


                            if (!start_time_match) {
                                $scope.displayEvent.start.time = "6:00pm";
                            }

                            if (!end_time_match) {
                                $scope.displayEvent.end.time = "10:00pm";
                            }

                            $scope.displayEvent.timezone = obj.timezone;
                            $scope.displayEvent.status = obj.status;
                            $scope.userGuestList = obj.guests;

                            if ('admission_ticket_type' in obj && obj.admission_ticket_type != '') {
                                if (obj.admission_ticket_type == "1") {
                                    $scope.displayEvent.admission_event_type = true;
                                } else {
                                    $scope.displayEvent.admission_event_type = false;
                                }

                            }

                            $scope.displayEvent.description = obj.description;
                            $scope.displayEvent.mdescription = obj.description.replace(/<[^>]+>/gm, '');
                            if (obj.event_image) {
                                $scope.displayEvent.files = obj.event_image;
                                $scope.edit_image_url = obj.event_image;
                            }

                            $scope.displayEvent.website = obj.websiteurl;
                            $scope.displayEvent.email = obj.email;
                            if (obj.phone !== 0) {
                                $scope.displayEvent.phone = obj.phone.replace(/\D/g, '').slice(-10);
                                $scope.country_code = obj.phone.substring(0, 3);
                                $scope.countryCodeValue = "+" + obj.phone.substring(0, 3);
                            } else {
                                $scope.displayEvent.phone = '';
                                $scope.country_code = "";
                            }

                            if (obj.claimed_by > 0 && obj.event_type == "public") {
                                $scope.displayEvent.event_type = 'free';
                                $scope.displayEvent.ticket_type = 'free';
                            } else {
                                $scope.displayEvent.event_type = obj.event_type;
                                $scope.displayEvent.ticket_type = obj.event_type;
                            }

                            if (obj.tickets_list.length > 0) {
                                for (let ticket of obj.tickets_list) {
                                    let t = {};
                                    if ('_tier_id' in ticket) {
                                        t = {
                                            ticket_name: ticket.ticket_name,
                                            ticket_type: ticket.ticket_type,
                                            description: ticket.description,
                                            remaining_qty: ticket.remaining_qty,
                                            is_absorb: ticket.is_absorb,
                                            service_fee: ticket.service_fee,
                                            stripe_fee: ticket.stripe_fee,
                                            total_price: ticket.total_price,
                                            saleStartDate: {
                                                date: moment(ticket.sale_start_date, 'YYYY-MM-DD').format("dddd, MMMM D, YYYY"),
                                                time: moment(ticket.sale_start_time, 'HH:mm').format("hh:mma"),
                                            },
                                            saleEndDate: {
                                                date: moment(ticket.sale_end_date, 'YYYY-MM-DD').format("dddd, MMMM D, YYYY"),
                                                time: moment(ticket.sale_end_time, 'HH:mm').format("hh:mma")
                                            },
                                            ticketPerOrderMinQuant: ticket.min_quant_per_order,
                                            ticketPerOrderMaxQuant: ticket.max_quant_per_order,
                                            _tier_id: ticket._tier_id,
                                            price: parseInt(ticket.price),
                                            quantity: ticket.quantity,

                                            ticket_group_id: ticket.ticket_group_id,
                                            local_tire_ticket_id: ticket.ticket_group_id,
                                            allow_to_action: (ticket.remaining_qty == ticket.quantity) ? true : false,

                                        };
                                    } else {
                                        t = {
                                            ticket_name: ticket.ticket_name,
                                            ticket_type: ticket.ticket_type,
                                            description: ticket.description,
                                            quantity: ticket.quantity,
                                            remaining_qty: ticket.remaining_qty,
                                            price: parseInt(ticket.price),
                                            is_absorb: ticket.is_absorb,
                                            service_fee: ticket.service_fee,
                                            stripe_fee: ticket.stripe_fee,
                                            total_price: ticket.total_price,
                                            saleStartDate: {
                                                date: moment(ticket.sale_start_date, 'YYYY-MM-DD').format("dddd, MMMM D, YYYY"),
                                                time: moment(ticket.sale_start_time, 'HH:mm').format("hh:mma"),
                                            },
                                            saleEndDate: {
                                                date: moment(ticket.sale_end_date, 'YYYY-MM-DD').format("dddd, MMMM D, YYYY"),
                                                time: moment(ticket.sale_end_time, 'HH:mm').format("hh:mma")
                                            },
                                            ticketPerOrderMinQuant: ticket.min_quant_per_order,
                                            ticketPerOrderMaxQuant: ticket.max_quant_per_order,

                                            allow_to_action: (ticket.remaining_qty == ticket.quantity) ? true : false,

                                        };
                                    }

                                    if ('ticket_id' in ticket) {
                                        t.ticket_id = ticket.ticket_id;
                                    }
                                    if (ticket.remaining_qty < ticket.quantity) {
                                        $scope.isEventTicketSold = true;
                                    }

                                    $scope.showTireTickeArr.push(t);
                                    if (localDataSet == null) {
                                        $scope.displayEvent.ticketsArr.push(t);
                                    }
                                }
                                $scope.displayEvent.ticketsArrForEdit = obj.tickets_list;
                            }

                            if (obj.guests.length > 0) {
                                for (let user of obj.guests) {
                                    user.selected = true;
                                    $scope.guestUserList.push(user);
                                }
                            }

                            if (obj.event_admin && obj.event_admin.length > 0) {
                                obj.event_admin = JSON.parse(obj.event_admin);
                                $scope.displayEvent.event_admin = obj.event_admin;
                                $scope.adminDisplayView = true;
                                $scope.getInvitedHistory($scope.displayEvent.event_id);
                            }

                            if (obj.highlighted) {
                                $scope.plans[0].checked = true;
                                if (!obj.is_draft) {
                                    $scope.sponsoredPaymentDone = true;
                                } else {
                                    $scope.sponsoredPaymentDone = false;
                                }
                                $scope.displayEvent.highlighted = true;
                                $scope.displayEvent.sponsored_event = true;
                                $scope.selectedPlan = $scope.plans[0];
                            }
                            if (!obj.is_draft) {
                                $scope.validateIsStepCompleted = true;
                            } else {
                                $scope.validateIsStepCompleted = false;
                            }
                            let todayMomentDate = moment().format("DD-MM-YYYY");
                            let eventStartDate = moment(obj.start_date_time).format("DD-MM-YYYY");
                            if (moment(eventStartDate).valueOf() < moment(todayMomentDate).valueOf() && obj.is_draft) {
                                $scope.publishActionDisable = true;
                            } else {
                                $scope.publishActionDisable = false;
                            }
                            $scope.displayEvent.is_draft = obj.is_draft;
                            $scope.displayEvent.is_publish_ready = obj.is_publish_ready;
                            $scope.displayEvent.layout_details = obj.layout_details;

                            if ('layout_id' in $scope.displayEvent.layout_details) {
                                $scope.seatMapCreated = true;
                                $scope.displayEvent.layout_details.tiers.forEach(function (tireDetails) {
                                    $scope.totalTireCapcity = $scope.totalTireCapcity + parseInt(tireDetails.seating_capacity);
                                });
                            }

                            $scope.editEventDraftFlag = true;
                            $scope.editEventDraftStatus = obj.is_draft;
                            setTimeout(function () {
                                for (let form of $scope.currentInfoSection) {
                                    validate($scope.createEventForms[form]);
                                }
                            }, 500);

                        } else {
                            $scope.displayEvent.timezone = $scope.dropdowns.timezones.options[0].key;
                        }
                        if ($scope.displayEvent.seat_layout === 'design' && $scope.action === 'edit') {
                            $scope.attendeesAllow(true);
                        }
                        $scope.checkIfCurrentIsUserEventAdmin();
                        $scope.setAdminFriends();
                        let stepNo = $location.pathname();
                        if (stepNo && typeof(stepNo) === 'string') {
                            stepNo = parseInt(stepNo);
                        }
                        if (stepNo && stepNo > 0 && stepNo < 4) {
                            $scope.continue();
                            for (let i = 2; i < stepNo; i++) {
                                if (!$scope.isStepComplete(i)) {
                                    $scope.continue();
                                }
                            }
                        }
                    });

                    if ($scope.action !== 'edit' || $scope.action !== 'claim') {
                        $scope.initTimeZone();
                    }

                    $scope.getuserBankList();
                    if ($scope.showHide.isMobile.matches) {
                        setTimeout(function () {
                            $scope.showHide.mobile.addaddress = false;
                            $scope.showHide.mobile.createnewevent = true;
                        }, 3000);
                    }
                });
                let token = authService.get('token');
                awsService.get('user/groupDetails', token).then((guestList) => {
                    $scope.guestList = guestList.data;
                });
                $scope.promotionGuidance = $cookies.get('promotionGuidance');
                angular.element("#mailtoui-modal-close").on('click', function() {
                    angular.element("#mailtoui-button-1").attr("href", "");
                    angular.element("#mailtoui-button-2").attr("href", "");
                    angular.element("#mailtoui-button-3").attr("href", "");
                    angular.element("#mailtoui-button-4").attr("href", "");
                    angular.element("#mailtoui-email-address").empty();
                    angular.element("#mailtoui-modal").hide();
                });

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
        }
    ]);