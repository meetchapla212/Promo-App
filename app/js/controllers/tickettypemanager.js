angular.module('PromoApp')
    .controller('TicketTypeManageController', ['$scope', '$route', 'Utils', 'eventsService', 'config', '$uibModal', '$window', 'metaTagsService', function($scope, $route, Utils, eventsService, config, $uibModal, $window, metaTagsService) {

        const states = {
            "add": {
                id: 'add',
                title: 'Add New Ticket Type'
            },
            "edit": {
                id: 'edit',
                title: 'Edit Ticket Type'
            },
            "view": {
                id: 'view',
                title: 'View Event Tickets Type'
            }
        };
        $scope.eventID = '';
        $scope.selectedState = states[$scope.state];
        $scope.buttonText = "Save";
        $scope.createEventForms = {};
        $scope.buyer_total = 0;
        $scope.is_absorb = 0;
        $scope.service_fee = 0;
        $scope.processing_fee = 0;
        $scope.ticket_base_price = 0;
        $scope.tiersDetailsArray = [];
        $scope.fees = { "USD": { "Percent": 2.9, "Fixed": 0.49 } };
        $scope.ticketToDelete = {};
        $scope.minDate = moment.utc();
        $scope.seatMapCreated = false;

        $(document).on('focus', '#ticketSaleEndDate', function() {
            angular.element('.drp-calendar.left').attr("style", "display:block");
        });

        $(document).on('focus', '#ticketSaleStartDate', function() {
            angular.element('.drp-calendar.left').attr("style", "display:block");
        });

        $scope.dropdowns = {
            startDateRangePicker: {
                minDate: moment().subtract(1, 'day'),
                options: {
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
                    eventHandlers: {
                        'apply.daterangepicker': function(event, picker) {
                            let sourceId = event.picker.element[0].id;
                            if (sourceId == "ticketSaleStartDate") { //ticket
                                $scope.displayEvent.tickets.saleEndDate.date = $scope.displayEvent.tickets.saleStartDate.date;
                                angular.element('#ticketSaleEndDate').val(($scope.displayEvent.tickets.saleEndDate.date).format("MMM, DD YYYY"));
                                setTimeout(function() {
                                    angular.element('#ticketSaleEndDate').triggerHandler('focus');
                                    angular.element('#ticketSaleEndDate').triggerHandler('blur');
                                    angular.element('.drp-calendar').attr("style", "display:none");
                                    $scope.validateTime($scope.displayEvent.tickets.saleStartDate.date, $scope.displayEvent.tickets.saleStartDate.time, $scope.displayEvent.tickets.saleEndDate.date, $scope.displayEvent.tickets.saleEndDate.time, 'createEventForms.create_event_form_admissions_3', 'saleendDate');
                                }, 500);
                            }
                        }
                    }
                }
            },
            endDateRangePicker: {
                minDate: moment().add(1, 'day'),
                options: {
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
                    eventHandlers: {
                        'apply.daterangepicker': function(event, picker) {
                            let sourceId = event.picker.element[0].id;
                            if (sourceId == "ticketSaleEndDate") { //ticket
                                angular.element('#ticketSaleEndDate').val(($scope.displayEvent.tickets.saleEndDate.date).format("MMM, DD YYYY"));
                                $scope.validateTime($scope.displayEvent.tickets.saleStartDate.date, $scope.displayEvent.tickets.saleStartDate.time, $scope.displayEvent.tickets.saleEndDate.date, $scope.displayEvent.tickets.saleEndDate.time, 'createEventForms.create_event_form_admissions_3', 'saleendDate');
                            }
                        }
                    }
                }
            },
            times: {
                options: config.GLOBAL_TIMES
            }
        };

        $scope.openTicketDetailsModel = function(tickets) {
            let eventModelScope = $scope.$new(false, $scope);
            eventModelScope.tickets = tickets;
            if (typeof eventModelScope.tickets.total_price !== 'undefined') {
                eventModelScope.your_payout = (eventModelScope.tickets.total_price - eventModelScope.tickets.service_fee);
            }
            $uibModal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: '../../partials/ticketDetailsModel.html',
                openedClass: 'update_bank_info pa-create-event-modal add-link-modal view-details-tc',
                scope: eventModelScope,
                size: 'md'
            });
        };

        $scope.calculate_price = function(amt, currency) {
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

        $scope.get_calculate_price = function(is_absorb, price) {
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

        $scope.get_tire_calculate_price = function(is_absorb, tires) {
            $scope.buyer_total = [];
            angular.forEach(tires, function(tire, index) {
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

        $scope.cancel = function() {
            this.$dismiss('close');
        };

        const getDefaultTicket = function() {
            return {
                'ticket_name': '',
                'description': '',
                'quantity': 0,
                'price': '',
                'disaply_price': 'Free',
                'saleStartDate': {
                    //date: moment.utc().add(2,'days'), // As per the document we want to take start date as current date + 2 days
                    date: moment.utc(),
                    time: $scope.dropdowns.times.options[19].key
                },
                'saleEndDate': {
                    //date: moment.utc().add(2,'days'), // As per the document we want to take start date as current date + 3 days
                    date: moment.utc(),
                    time: $scope.dropdowns.times.options[23].key
                },
                "ticket_id": -1,
                "ticket_type": $scope.price === 'free' ? 'free' : 'paid',
                'ticketPerOrderMinQuant': 1,
                'ticketPerOrderMaxQuant': 5,
                "tier_details": $scope.tier_details.length > 0 ? $scope.tier_details : []
            };
        };

        $scope.displayEvent = {
            event_type: $scope.event_type,
            tickets: getDefaultTicket(),
            layout_details: $scope.layout_details,
            ticketsArr: $scope.ticketsArr,
            end: {
                date: moment($scope.event.end_date_time)
            }
        };

        const init = () => {
            $scope.eventID = $route.current.params.ev;
            if (Object.keys($scope.displayEvent.layout_details).length > 0) {
                $scope.seatMapCreated = true;
            }
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

        init();

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

        // This function validates ticket
        $scope.validateTicketAttributes = function() {
            if (!($scope.displayEvent.tickets.ticket_name)) {
                Utils.showError($scope, "Please enter ticket name");
                return false;
            }
            if (($scope.displayEvent.tickets.ticket_name.length >= 60)) {
                Utils.showError($scope, "Ticket name should be within 60 characters");
                return false;
            }
            if ($scope.displayEvent.tickets.description && $scope.displayEvent.tickets.description.length >= 200) {
                Utils.showError($scope, "Ticket description must be less than 200 characters");
                return false;
            }
            if (!($scope.displayEvent.tickets.quantity)) {
                Utils.showError($scope, "Please enter ticket quantity");
                return false;
            }
            if ($scope.displayEvent.tickets.quantity < 1 || $scope.displayEvent.tickets.quantity > 100000) {
                Utils.showError($scope, "Please enter ticket quantity between 1-100000");
                return false;
            }
            if (!($scope.displayEvent.tickets.price) && ($scope.displayEvent.tickets.ticket_type !== 'free') && ($scope.displayEvent.tickets.ticket_type !== 'donation')) {
                Utils.showError($scope, "Please enter ticket price");
                return false;
            }
            if (($scope.displayEvent.tickets.price <= 0 || $scope.displayEvent.tickets.price > 10000) && $scope.displayEvent.tickets.ticket_type !== 'free' && ($scope.displayEvent.tickets.ticket_type !== 'donation')) {
                Utils.showError($scope, "Please enter ticket price between 1-10000");
                return false;
            }
            if ($scope.selectedState.id === 'edit') {
                // Make sure new quantity is not less than what is sold
                // Get original ticket 
                let filteredTicket = $scope.event.tickets.filter(t => t.name === $scope.displayEvent.tickets.name);
                if (filteredTicket && filteredTicket.length > 0) {
                    let numberOfTicketsSold = filteredTicket[0].quantity - filteredTicket[0].remQuantity;
                    if ($scope.displayEvent.tickets.quantity < numberOfTicketsSold) {
                        Utils.showError($scope, "Tickets quantity cannot be less than " + numberOfTicketsSold);
                        return false;
                    }
                }
            } else if ($scope.event.tickets) {
                // For add check if not duplicate
                let duplicateTicket = $scope.event.tickets.filter(ticket => (ticket.name == $scope.displayEvent.tickets.name || ticket.price == $scope.displayEvent.tickets.price));
                if (duplicateTicket && duplicateTicket.length > 0) {
                    Utils.showError($scope, "Either the ticket name or ticket price is not unique.");
                    return false;
                }

            }
            return true;
        };

        $scope.close = function() {
            this.$close($scope.event.tickets);
        };

        // Create Paid Ticket
        $scope.createPaidTicket = function(addMore, ticketindex) {
            if ($scope.validateTicketAttributes()) {
                $scope.loading = true;
                let ticket_data = {};
                let description = "";
                if ($scope.displayEvent.tickets.description !== '') {
                    description = $scope.displayEvent.tickets.description;
                }
                // Add new ticket
                // Check if it is add or edit
                if ($scope.selectedState.id === 'add') {
                    ticket_data = {
                        ticket_name: $scope.displayEvent.tickets.ticket_name,
                        ticket_type: $scope.displayEvent.tickets.ticket_type,
                        is_absorb: $scope.is_absorb,
                        description: description ? description : '',
                        quantity: $scope.displayEvent.tickets.quantity,
                        price: $scope.displayEvent.tickets.ticket_type === "free" ? 0 : $scope.displayEvent.tickets.price,
                        sale_start_date: $scope.displayEvent.tickets.saleStartDate.date.format('YYYY-MM-DD'),
                        sale_start_time: moment($scope.displayEvent.tickets.saleStartDate.time, 'hh:mma').format('HH:mm'),
                        sale_end_date: $scope.displayEvent.tickets.saleEndDate.date.format('YYYY-MM-DD'),
                        sale_end_time: moment($scope.displayEvent.tickets.saleEndDate.time, 'hh:mma').format('HH:mm'),
                        min_quant_per_order: $scope.displayEvent.tickets.ticketPerOrderMinQuant,
                        max_quant_per_order: $scope.displayEvent.tickets.ticketPerOrderMaxQuant,
                    };
                }

                // Add ticket
                let event_id = $scope.eventID;
                eventsService.addTicket(event_id, ticket_data)
                    .then((response) => {
                        if (response.status == 200) {
                            $scope.buttonText = 'Save';
                            Utils.showSuccess($scope, 'New Ticket Added Successfully.');
                            $scope.loading = false;
                            setTimeout(function() {
                                $window.location.reload();
                            }, 1000);
                        } else {
                            Utils.showSuccess($scope, 'New Ticket Not Added Successfully.');
                        }
                    });
            }
        };

        // Create Free Ticket
        $scope.createFreeTicket = function(addMore, ticketindex) {
            if ($scope.validateTicketAttributes()) {
                $scope.loading = true;
                let ticket_data = {};
                let description = "";
                if ($scope.displayEvent.tickets.description !== '') {
                    description = $scope.displayEvent.tickets.description;
                }
                // Add new ticket
                // Check if it is add or edit
                if ($scope.selectedState.id === 'add') {
                    ticket_data = {
                        ticket_name: $scope.displayEvent.tickets.ticket_name,
                        ticket_type: 'free',
                        is_absorb: $scope.is_absorb,
                        description: description ? description : '',
                        quantity: $scope.displayEvent.tickets.quantity,
                        price: 0,
                        sale_start_date: $scope.displayEvent.tickets.saleStartDate.date.format('YYYY-MM-DD'),
                        sale_start_time: moment($scope.displayEvent.tickets.saleStartDate.time, 'hh:mma').format('HH:mm'),
                        sale_end_date: $scope.displayEvent.tickets.saleEndDate.date.format('YYYY-MM-DD'),
                        sale_end_time: moment($scope.displayEvent.tickets.saleEndDate.time, 'hh:mma').format('HH:mm'),
                        min_quant_per_order: $scope.displayEvent.tickets.ticketPerOrderMinQuant,
                        max_quant_per_order: $scope.displayEvent.tickets.ticketPerOrderMaxQuant,
                    };
                }

                // Add ticket
                let event_id = $scope.eventID;
                eventsService.addTicket(event_id, ticket_data)
                    .then((response) => {
                        if (response.status == 200) {
                            $scope.buttonText = 'Save';
                            Utils.showSuccess($scope, 'New Ticket Added Successfully.');
                            $scope.loading = false;
                            setTimeout(function() {
                                $window.location.reload();
                            }, 1000);
                        } else {
                            Utils.showSuccess($scope, 'New Ticket Not Added Successfully.');
                        }
                    });
            }
        };

        // Create Tier Ticket
        $scope.createEventTireTicket = function(addMore, ticketindex) {
            $scope.loading = true;
            let ticket_data = {};
            let description = "";
            if ($scope.displayEvent.tickets.description !== '') {
                description = $scope.displayEvent.tickets.description;
            }
            angular.forEach($scope.displayEvent.tickets.tier_details, function(tierDetails, index) {
                let tiersDetails = {
                    "_tier_id": tierDetails._tier_id,
                    "price": tierDetails.price === '' ? 0 : tierDetails.price,
                    "quantity": tierDetails.quantity
                };
                $scope.tiersDetailsArray.push(tiersDetails);
            });
            // Add new ticket
            // Check if it is add or edit
            if ($scope.selectedState.id === 'add') {
                ticket_data = {
                    ticket_name: $scope.displayEvent.tickets.ticket_name,
                    ticket_type: $scope.displayEvent.free ? 'free' : 'paid',
                    is_absorb: $scope.is_absorb,
                    description: description ? description : '',
                    quantity: 0,
                    price: 0,
                    sale_start_date: $scope.displayEvent.tickets.saleStartDate.date.format('YYYY-MM-DD'),
                    sale_start_time: $scope.displayEvent.tickets.saleStartDate.time,
                    sale_end_date: $scope.displayEvent.tickets.saleEndDate.date.format('YYYY-MM-DD'),
                    sale_end_time: $scope.displayEvent.tickets.saleEndDate.time,
                    min_quant_per_order: $scope.displayEvent.tickets.ticketPerOrderMinQuant,
                    max_quant_per_order: $scope.displayEvent.tickets.ticketPerOrderMaxQuant,
                    tier_details: $scope.tiersDetailsArray
                };
            }

            // Add ticket
            let event_id = $scope.eventID;
            eventsService.addTicket(event_id, ticket_data)
                .then((response) => {
                    if (response.status == 200) {
                        $scope.buttonText = 'Save';
                        Utils.showSuccess($scope, 'New Ticket Added Successfully.');
                        $scope.loading = false;
                        setTimeout(function() {
                            $window.location.reload();
                        }, 1000);
                    } else {
                        Utils.showSuccess($scope, 'New Ticket Not Added Successfully.');
                    }
                });
        };

        // This is to show edit
        $scope.edit = function(ticket) {
            // Make the state of the modal as edit
            $scope.selectedState = states.edit;
            $scope.ticketType = Utils.clone(ticket);
            // This is done since moment object does not gets cloned properly
            $scope.displayEvent.tickets.saleStartDate.date = moment(ticket.saleStartDate.date);
            $scope.displayEvent.tickets.saleEndDate.date = moment(ticket.saleEndDate.date);
        };

        $scope.deleteTicketConfirmation = function(ticket) {
            $scope.ticketToDelete = ticket;
            let eventModelScope = $scope.$new(false, $scope);
            confirmCancelTicketModel = $uibModal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: '../../partials/confirmDeleteTicket2.html',
                openedClass: 'pa-create-event-modal add-link-modal ticket-popup-new-ui scroll_popup',
                scope: eventModelScope,
                size: 'md'
            });
        };

        $scope.deleteTicket = function(ticket) {
            $scope.loading = true;
            let getId = ticket.ticket_id;
            eventsService.deleteTicket(getId).then((response) => {
                if (response.data.success == true) {
                    Utils.showSuccess($scope, 'Tickets deleted successfully.');
                    $scope.loading = false;
                    setTimeout(function() {
                        $window.location.reload();
                    }, 1000);
                } else {
                    this.$dismiss('close');
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: response.data.message,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                }
            }).catch(err => {
                if (err && 'message' in err) {
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: "Sorry something went wrong. Please try later.",
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                }
            });
        };

        $scope.updateTickets = function(tickets) {
            eventsService.editEvent($scope.event.id, {
                    tickets: JSON.stringify(tickets)
                })
                .then((response) => {
                    //console.log('Response',response);
                    Utils.showSuccess($scope, 'Tickets updated successfully');
                    Utils.applyChanges($scope);
                });
        };

        $scope.toggleStatusOfTicket = function(ticket) {

            // Get all ticket new ticket
            let tickets = Utils.clone($scope.event.tickets);

            for (let t of tickets) {
                if (t.name === ticket.name) {
                    if (ticket.status === 'inactive') {
                        t.status = 'active';
                        ticket.status = 'active';
                    } else {
                        t.status = 'inactive';
                        ticket.status = 'inactive';
                    }
                }
            }
            $scope.updateTickets(tickets);

        };

    }]);