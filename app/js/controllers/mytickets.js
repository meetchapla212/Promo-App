angular.module('PromoApp')
    .controller('MyTicketsController', ['$scope', 'Utils', 'eventsService', 'authService', 'userService', 'config', 'apiService', '$uibModal', '$window', 'metaTagsService', 'orderByFilter', '$rootScope', function($scope, Utils, eventsService, authService, userService, config, apiService, $uibModal, $window, metaTagsService, orderBy, $rootScope) {
        $scope.userTicketsEventsUpcoming = [];
        $scope.userTicketsEventsPast = [];
        $scope.userTicketRefundCancel = [];
        $scope.categoriesMap = [];
        $scope.globalPastData = [];
        $scope.globalUpcomingData = [];
        $scope.MobileTicketDetails = false;
        $scope.selectedMobileTicket = {};
        $scope.showDetails = false;
        $scope.sliderIndex = 0;
        $scope.loading = false;
        $scope.currentTab = true;
        $scope.currentPageGoing = 1;
        apiService.getEventCategories().then((response) => {
            if (response.status == 200) {
                let data = response.data;
                if (data.success) {
                    $scope.categoriesMap = data.data;
                }
            }
        });
        $scope.cancelView = false;
        $scope.currentPage = 1;
        $scope.currentPageUpcoming = 1;
        $scope.currentPagePast = 1;
        $scope.numPerPage = 10;
        $scope.maxSize = 5;
        $scope.maxMobileSize = 3;
        $scope.showhide = {
            mytickets: true,
            viewticket: false
        };
        $scope.selectedTicket = null;
        $scope.organiserCache = {};
        $scope.isMobile = window.matchMedia("only screen and (max-width: 1024px)");

        $scope.showMyTickets = () => {
            $scope.showhide.mytickets = true;
            $scope.showhide.viewticket = false;
            $scope.selectedTicket = null;
        };

        $scope.cancelViewAction = () => {
            $scope.cancelView = !$scope.cancelView;
        };

        $scope.getCatName = function(nameKey, myArray) {
            for (var i = 0; i < myArray.length; i++) {
                if (myArray[i].id === nameKey) {
                    return myArray[i].name;
                }
            }
        };

        $scope.getMyTicketsEvents = () => {
            if ($scope.userTicketsEventsUpcoming.length === 0) {
                $scope.loading = true;
                $scope.userTicketsEventsUpcoming = [];
                $scope.userTicketsEventsPast = [];
                eventsService.getUserTickets()
                    .then((response) => {
                        if (response.status == 200) {
                            let data = response.data;
                            if (data.success) {
                                let userTickets = data.data;
                                let pastData = [];
                                let year = '';
                                let eventIndex = 0;
                                let dataFilterFunction = function(info) {
                                    return info.filter((item, $index) => {
                                        if (item.year == year) {
                                            eventIndex = $index;
                                        }
                                        return item.year == year;
                                    });
                                };
                                let upcomingData = [];
                                if (userTickets && userTickets.length > 0) {
                                    for (let event of userTickets) {
                                        if (Utils.isPastDateEvent(event.end_date_time)) {
                                            event.expired = true;
                                            let yearData = dataFilterFunction(pastData);
                                            year = moment(event.ticket_created_date).format("YYYY");
                                            if (yearData.length > 0) {
                                                let data = pastData[eventIndex];
                                                data.eventData.push(event);
                                                pastData[eventIndex] = data;
                                            } else {
                                                let yearObject = {
                                                    year: year,
                                                    eventData: [event]
                                                };
                                                pastData.push(yearObject);
                                            }
                                        } else {
                                            event.expired = false;
                                            let yearData = dataFilterFunction(upcomingData);
                                            year = moment(event.ticket_created_date).format("YYYY");
                                            if (yearData.length > 0) {
                                                let data = upcomingData[eventIndex];
                                                data.eventData.push(event);
                                                upcomingData[eventIndex] = data;
                                            } else {
                                                let yearObject = {
                                                    year: year,
                                                    eventData: [event]
                                                };
                                                upcomingData.push(yearObject);
                                            }
                                        }

                                    }
                                    for (let event of pastData) {
                                        $scope.globalPastData.push(...event.eventData);
                                    }
                                    for (let event of upcomingData) {
                                        $scope.globalUpcomingData.push(...event.eventData);
                                    }
                                    $scope.userTicketsEventsPast = pastData;
                                    $scope.userTicketsEventsUpcoming = upcomingData;
                                }
                                $scope.loading = false;
                                Utils.applyChanges($scope);
                            }
                        }
                    }).catch(err => {
                        if (err.status == -1) {
                            $scope.getMyTicketsEvents();
                        } else {
                            console.log(err);
                            $scope.loading = false;
                            let notify = {
                                type: 'error',
                                title: 'OOPS!!',
                                content: "Sorry something went wrong. Please try later.",
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                        }
                        Utils.applyChanges($scope);
                    });
            }
        };

        $scope.getMyRefundCancelTickets = () => {
            $scope.loading = true;
            $scope.userTicketRefundCancel = [];
            apiService.getUserCancelRefundTickets().then((response) => {
                if (response.status == 200) {
                    let data = response.data;
                    if (data.success) {
                        if (data.data) {
                            $scope.userTicketRefundCancel = data.data;
                        }
                        $scope.loading = false;
                        Utils.applyChanges($scope);
                    }
                }
            }).catch(err => {
                if (err.status == -1) {
                    $scope.loading = false;
                    // $scope.getMyRefundCancelTickets();
                } else {
                    console.log(err);
                    $scope.loading = false;
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: "Sorry something went wrong. Please try later.",
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                }
                Utils.applyChanges($scope);
            });
        };

        $scope.cancel = function() {
            this.$dismiss('close');
        };

        $scope.goToPage = function(page) {
            location.href = page;
        };

        $scope.openTicketDetailModal = function(ticketDetails) {
            $scope.loading = true;
            $scope.loadingMessage = "Getting Ticket Details...";
            let orderId = ticketDetails.order_id;
            $scope.organiser_name = null;
            $scope.organiser_qb_id = null;
            $scope.ticket_data = null;
            let ticket_details = null;
            let eventModelScope = $scope.$new(false, $scope);
            userService.getPurchased_ticket(orderId).then((response) => {
                if (response.status == 200) {
                    $scope.organiser_name = response.data.data.organiser_name;
                    $scope.organiser_first_name = response.data.data.organiser_first_name;
                    $scope.organiser_last_name = response.data.data.organiser_last_name;
                    $scope.organiser_qb_id = response.data.data.organiser_qb_id;
                    $scope.ticket_data = response.data.data.tickets_details;

                    ticket_details = {
                        address: ticketDetails.address,
                        attendee: ticketDetails.attendee,
                        category: ticketDetails.category,
                        description: ticketDetails.description,
                        end_date_time: ticketDetails.end_date_time,
                        event_id: ticketDetails.event_id,
                        event_image: ticketDetails.event_image,
                        event_name: ticketDetails.event_name,
                        event_status: ticketDetails.event_status,
                        expired: ticketDetails.expired,
                        id: ticketDetails.id,
                        latitude: ticketDetails.latitude,
                        longitude: ticketDetails.longitude,
                        order_id: ticketDetails.order_id,
                        organiser_name: $scope.organiser_name,
                        organiser_first_name: $scope.organiser_first_name,
                        organiser_last_name: $scope.organiser_last_name,
                        organiser_qb_id: $scope.organiser_qb_id,
                        start_date_time: ticketDetails.start_date_time,
                        ticket_created_date: ticketDetails.ticket_created_date,
                        ticket_details_status: ticketDetails.ticket_details_status,
                        ticket_qty: ticketDetails.ticket_qty,
                        ticket_status: ticketDetails.ticket_status,
                        ticket_price: ticketDetails.ticket_price,
                        tickets_details: $scope.ticket_data,
                        totalTickets: ticketDetails.totalTickets,
                        total_amount: ticketDetails.total_amount,
                        txn_id: ticketDetails.txn_id,
                        user_id: ticketDetails.user_id,
                        _ticket_id: ticketDetails._ticket_id
                    };
                    $scope.loading = false;
                    eventModelScope.ticketDetails = ticket_details;
                }
                return true;
            }).catch(err => {
                let notify = {
                    type: 'error',
                    title: 'OOPS!!',
                    content: "Sorry something went wrong. Please try later.",
                    timeout: 5000 //time in ms
                };
                $scope.$emit('notify', notify);
            }).finally(() => {
                $scope.loading = false;
            });

            eventModelScope.showDetails = false;
            eventModelScope.sliderIndex = 0;
            eventModelScope.cancelReason = '';
            eventModelScope.ticketDetailsData = ticketDetails;

            function groupBy(list, keyGetter) {
                const map = new Map();
                list.forEach((item) => {
                    const key = keyGetter(item);
                    const collection = map.get(key);
                    if (!collection) {
                        map.set(key, [item]);
                    } else {
                        collection.push(item);
                    }
                });
                return map;
            }
            let newTicketDetails = ticketDetails.tickets_details;
            let ticketGroupById = groupBy(newTicketDetails, pet => pet._ticket_id);
            let ticketInfo = [];
            angular.forEach(ticketGroupById, function(ticketGroup, key) {
                let ticketItemDetails = {
                    "ticket_title": ticketGroup[0].ticket_title,
                    "qty": 0,
                    "price": ticketGroup[0].price,
                    "total": 0,
                };
                angular.forEach(ticketGroup, function(ticket, key) {
                    ticketItemDetails.total = ticketItemDetails.total + parseFloat(ticket.price);
                    ticketItemDetails.qty = ticketItemDetails.qty + parseInt(ticket.qty);
                });
                ticketItemDetails.total = (ticketItemDetails.total).toFixed(2);
                ticketInfo.push(ticketItemDetails);
            });

            eventModelScope.ticketInfo = ticketInfo;
            eventModelScope.preSlide = function() {
                if (eventModelScope.sliderIndex >= 1) {
                    eventModelScope.sliderIndex--;
                }
            };

            eventModelScope.nextSlide = function() {
                if (eventModelScope.sliderIndex < (eventModelScope.ticketDetails.tickets_details.length - 1)) {
                    eventModelScope.sliderIndex++;
                }
            };

            let modalInstance = $uibModal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: '../../partials/ticketDetailsModal.html',
                openedClass: 'pa-create-event-modal add-link-modal ticket-popup-new-ui scroll_popup',
                scope: eventModelScope,
                size: 'md'
            });

            let confirmCancelTicketModel = '';
            let getTicketCancelReasonModel = '';
            eventModelScope.ticketId = '';
            eventModelScope.cancelTicketConfirmation = function() {
                modalInstance.close();
                confirmCancelTicketModel = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/confirmCancelTicket.html',
                    openedClass: 'pa-create-event-modal add-link-modal ticket-popup-new-ui scroll_popup',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            eventModelScope.getTicketCancelReason = function() {
                confirmCancelTicketModel.close();
                getTicketCancelReasonModel = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/ticketCancelReason.html',
                    openedClass: 'pa-create-event-modal add-link-modal ticket-popup-new-ui scroll_popup',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            eventModelScope.cancelTicket = function(cancelReason) {
                eventsService.cancelTicket(eventModelScope.ticketDetails.order_id, cancelReason)
                    .then((response) => {
                        if (response.success) {
                            let notify = {
                                type: 'success',
                                title: 'Success',
                                content: response.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            $window.location.reload();
                        } else {
                            let notify = {
                                type: 'error',
                                title: 'OOPS!!',
                                content: response.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                        }
                    }).catch(err => {
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: "Sorry something went wrong. Please try later.",
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        //Utils.applyChanges($scope);
                    }).finally(() => {
                        //$scope.loading = false;
                    });
            };
        };

        $scope.groupBy = function groupBy(list, keyGetter) {
            const map = new Map();
            list.forEach((item) => {
                const key = keyGetter(item);
                const collection = map.get(key);
                if (!collection) {
                    map.set(key, [item]);
                } else {
                    collection.push(item);
                }
            });
            return map;
        };

        $scope.showMobileTicketDetails = function(eventsDetail) {
            $scope.MobileTicketDetails = true;
            $scope.selectedMobileTicket = eventsDetail;
            $rootScope.footerHide = true;
            $scope.loading = true;
            $scope.loadingMessage = "Getting Ticket Details...";
            let orderId = eventsDetail.order_id;
            $scope.organiser_name = null;
            $scope.organiser_qb_id = null;
            $scope.ticket_data = null;
            let ticket_details = null;
            $scope.sliderIndex = 0;
            userService.getPurchased_ticket(orderId).then((response) => {
                if (response.status == 200) {
                    $scope.organiser_name = response.data.data.organiser_name;
                    $scope.organiser_first_name = response.data.data.organiser_first_name;
                    $scope.organiser_last_name = response.data.data.organiser_last_name;
                    $scope.organiser_qb_id = response.data.data.organiser_qb_id;
                    $scope.ticket_data = response.data.data.tickets_details;

                    ticket_details = {
                        address: eventsDetail.address,
                        attendee: eventsDetail.attendee,
                        category: eventsDetail.category,
                        description: eventsDetail.description,
                        end_date_time: eventsDetail.end_date_time,
                        event_id: eventsDetail.event_id,
                        event_image: eventsDetail.event_image,
                        event_name: eventsDetail.event_name,
                        event_status: eventsDetail.event_status,
                        expired: eventsDetail.expired,
                        id: eventsDetail.id,
                        latitude: eventsDetail.latitude,
                        longitude: eventsDetail.longitude,
                        order_id: eventsDetail.order_id,
                        organiser_name: $scope.organiser_name,
                        organiser_first_name: $scope.organiser_first_name,
                        organiser_last_name: $scope.organiser_last_name,
                        organiser_qb_id: $scope.organiser_qb_id,
                        start_date_time: eventsDetail.start_date_time,
                        ticket_created_date: eventsDetail.ticket_created_date,
                        ticket_details_status: eventsDetail.ticket_details_status,
                        ticket_qty: eventsDetail.ticket_qty,
                        ticket_status: eventsDetail.ticket_status,
                        ticket_price: eventsDetail.ticket_price,
                        tickets_details: $scope.ticket_data,
                        totalTickets: eventsDetail.totalTickets,
                        total_amount: eventsDetail.total_amount,
                        txn_id: eventsDetail.txn_id,
                        user_id: eventsDetail.user_id,
                        _ticket_id: eventsDetail._ticket_id
                    };
                    $scope.loading = false;
                    $scope.selectedMobileTicket = ticket_details;
                }
                return true;
            }).catch(err => {
                let notify = {
                    type: 'error',
                    title: 'OOPS!!',
                    content: "Sorry something went wrong. Please try later.",
                    timeout: 5000 //time in ms
                };
                $scope.$emit('notify', notify);
            }).finally(() => {
                let newTicketDetails = $scope.selectedMobileTicket.tickets_details;
                let ticketGroupById = $scope.groupBy(newTicketDetails, pet => pet._ticket_id);
                let ticketInfo = [];
                angular.forEach(ticketGroupById, function(ticketGroup, key) {
                    let ticketItemDetails = {
                        "ticket_title": ticketGroup[0].ticket_title,
                        "qty": 0,
                        "price": ticketGroup[0].price,
                        "total": 0,
                    };
                    angular.forEach(ticketGroup, function(ticket, key) {
                        ticketItemDetails.total = ticketItemDetails.total + parseFloat(ticket.price);
                        ticketItemDetails.qty = ticketItemDetails.qty + parseInt(ticket.qty);
                    });
                    ticketItemDetails.total = (ticketItemDetails.total).toFixed(2);
                    ticketInfo.push(ticketItemDetails);
                });
                $scope.selectedMobileTicket.ticketInfo = ticketInfo;
                $scope.loading = false;
            });
        };

        $scope.hideMobileDetailsPage = function() {
            $scope.MobileTicketDetails = false;
            $rootScope.footerHide = false;
        };

        $scope.preSlide = function() {
            if ($scope.sliderIndex >= 1) {
                $scope.sliderIndex--;
            }
        };

        $scope.nextSlide = function() {
            if ($scope.sliderIndex < ($scope.selectedMobileTicket.tickets_details.length - 1)) {
                $scope.sliderIndex++;
            }
        };

        $scope.cancelTicketConfirmation = function() {
            let eventModelScope = $scope.$new(false, $scope);
            $scope.confirmCancelTicketModel = $uibModal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: '../../partials/confirmCancelTicket.html',
                openedClass: 'pa-create-event-modal add-link-modal scroll_popup',
                scope: eventModelScope,
                size: 'md'
            });
        };

        $scope.getTicketCancelReason = function() {
            $scope.confirmCancelTicketModel.close();
            let eventModelScope = $scope.$new(false, $scope);
            eventModelScope.cancelReason = '';
            $scope.getTicketCancelReasonModel = $uibModal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: '../../partials/ticketCancelReason.html',
                openedClass: 'pa-create-event-modal add-link-modal scroll_popup',
                scope: eventModelScope,
                size: 'md'
            });
        };

        $scope.cancelTicket = function(cancelReason) {
            eventsService.cancelTicket($scope.selectedMobileTicket.order_id, cancelReason)
                .then((response) => {
                    if (response.success) {
                        let notify = {
                            type: 'success',
                            title: 'Success',
                            content: response.message,
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        $window.location.reload();
                    } else {
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: response.message,
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                    }
                }).catch(err => {
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: "Sorry something went wrong. Please try later.",
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    //Utils.applyChanges($scope);
                }).finally(() => {
                    //$scope.loading = false;
                });
        };


        $scope.viewTicketReceipt = function(ticketDetails) {

            $scope.loading = true;
            $scope.loadingMessage = "Getting Ticket Details...";

            let orderId = ticketDetails.order_id;
            $scope.organiser_name = null;
            $scope.organiser_qb_id = null;
            $scope.ticket_data = null;
            let ticket_details = null;
            let eventModelScope = $scope.$new(false, $scope);
            userService.getPurchased_ticket(orderId).then((response) => {
                if (response.status == 200) {
                    $scope.organiser_name = response.data.data.organiser_name;
                    $scope.organiser_qb_id = response.data.data.organiser_qb_id;
                    $scope.ticket_data = response.data.data.tickets_details;

                    ticket_details = {
                        address: ticketDetails.address,
                        attendee: ticketDetails.attendee,
                        category: ticketDetails.category,
                        description: ticketDetails.description,
                        end_date_time: ticketDetails.end_date_time,
                        event_id: ticketDetails.event_id,
                        event_image: ticketDetails.event_image,
                        event_name: ticketDetails.event_name,
                        event_status: ticketDetails.event_status,
                        expired: ticketDetails.expired,
                        id: ticketDetails.id,
                        latitude: ticketDetails.latitude,
                        longitude: ticketDetails.longitude,
                        order_id: ticketDetails.order_id,
                        organiser_name: $scope.organiser_name,
                        organiser_qb_id: $scope.organiser_qb_id,
                        start_date_time: ticketDetails.start_date_time,
                        ticket_created_date: ticketDetails.ticket_created_date,
                        ticket_details_status: ticketDetails.ticket_details_status,
                        ticket_qty: ticketDetails.ticket_qty,
                        ticket_status: ticketDetails.ticket_status,
                        ticket_price: ticketDetails.ticket_price,
                        tickets_details: $scope.ticket_data,
                        totalTickets: ticketDetails.totalTickets,
                        total_amount: ticketDetails.total_amount,
                        txn_id: ticketDetails.txn_id,
                        user_id: ticketDetails.user_id,
                        _ticket_id: ticketDetails._ticket_id
                    };
                    $scope.loading = false;
                    eventModelScope.ticketDetails = ticket_details;
                }
                return true;
            }).catch(err => {
                let notify = {
                    type: 'error',
                    title: 'OOPS!!',
                    content: "Sorry something went wrong. Please try later.",
                    timeout: 5000 //time in ms
                };
                $scope.$emit('notify', notify);
            }).finally(() => {
                $scope.loading = false;
            });
            $scope.getTicketCancelReasonModel = $uibModal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: '../../partials/ticketReceipt.html',
                openedClass: 'pa-create-event-modal add-link-modal ticket-popup-new-ui scroll_popup',
                scope: eventModelScope,
                size: 'md'
            });
        };

        const init = () => {
            if (!authService.getUser()) {
                location.href = "/login";
            }
            $scope.user = authService.getUser();
            $scope.getMyTicketsEvents();
            $scope.getMyRefundCancelTickets();
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
    }]);