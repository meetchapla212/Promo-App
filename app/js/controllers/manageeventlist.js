angular.module('PromoApp')
    .controller('ManageEventListController', ['$route', '$scope', '$uibModal', '$uibModalStack', 'eventsService', 'authService', 'apiService', 'Utils', '$window', 'config', 'userService',
        function($route, $scope, $uibModal, $uibModalStack, eventsService, authService, apiService, Utils, $window, config, userService) {
            $scope.user = null;
            $scope.event = {};
            $scope.eventID = null;
            $scope.tickets = {};
            $scope.ticketCounts = {
                scan_tickets: 0,
                total_tickets: 0
            };
            $scope.manageEvent = {};
            $scope.purchasedTicketsQuantity = 0;
            $scope.checkedinQuantity = 0;
            $scope.ticketTypes = [];
            $scope.categoriesMap = [];
            $scope.adminEmails = null;
            $scope.adminList = '';
            $scope.userBankList = [];
            $scope.userList = '';
            $scope.accpettedInviteuser = [];
            $scope.defalutBank = {};
            let token = authService.get('token');
            let attendeeDetailModal = "";
            $scope.openAttende = false;
            $scope.pagination = {
                currentPage: 1,
                numPerPage: 10,
                maxSize: 5
            };
            $scope.loading = false;
            $scope.statusFilter = null;
            let status = 'all';
            let type = 'all';
            let check = 'all';
            $scope.statusText = "Order Status";
            $scope.checkInText = "Check In";
            $scope.typeText = "Ticket Types";
            $scope.statusFilterText = status;
            $scope.checkInFilterText = check;
            $scope.typeFilterText = type;
            $scope.typeFilter = null;
            $scope.showPage = false;
            $scope.seatMapCreated = false;
            $scope.newtoday_date = moment.utc();
            $scope.addPromotionDisabled = true;
            $scope.isAuthorisedUser = false;
            $scope.invitedList = [];
            $scope.createEventForms = {};

            $scope.goToScanQrPage = function() {
                if ($scope.eventID) {
                    $window.location.href = '/scanqrcode?ev=' + $scope.eventID;
                }
            };

            $scope.goToPage = (location) => {
                $window.location.href = location;
            };

            // Get Current Event Categories
            apiService.getEventCategories(token).then((response) => {
                if (response.status == 200) {
                    let data = response.data;
                    if (data.success) {
                        let catData = data.data;
                        catData.forEach(function(cat) {
                            let category = {};
                            category.id = cat.slug;
                            category.name = cat.category_name;
                            category.icon = cat.category_image;
                            category.iconImg = "<img src=" + cat.category_image + " alt='image' />";
                            category.marker = cat.category_image;
                            category.unselectedIcon = cat.category_image;
                            category.selected = true;
                            $scope.categoriesMap.push(category);
                        });
                    }
                }
            });

            $scope.getCatName = function(nameKey, myArray) {
                for (var i = 0; i < myArray.length; i++) {
                    if (myArray[i].id === nameKey) {
                        return myArray[i];
                    }
                }
            };

            // Get All Event and Ticket data
            $scope.getTicketsOfEvent = function(status, type, check) {
                let statusName = status;
                let typeName = type;
                let checkStatus = check;
                $scope.loading = true;
                let event_admin_names = [];
                eventsService.getEventPurchasedTickets({ "id": $scope.eventID, "status": statusName, 'type': typeName, 'check': checkStatus })
                    .then((userTicketsResponse) => {
                        $scope.loading = true;
                        if (userTicketsResponse.success) {
                            $scope.manageEvent = userTicketsResponse.data;
                            $scope.event = userTicketsResponse.data.event_details;
                            $scope.tickets = userTicketsResponse.data.ticket_details;
                            $scope.ticketTypes = [{ ticket_name: 'All', ticket_id: 'all' }];
                            if ($scope.tickets.length > 0) {
                                $scope.ticketTypes.push(...($scope.tickets.map(t => t)));
                            }
                            if (userTicketsResponse.data.ticket_counts != undefined) {
                                $scope.ticketCounts = userTicketsResponse.data.ticket_counts;
                            } else {
                                $scope.ticket_counts = {
                                    remaining_tickets: "0",
                                    scan_tickets: 0,
                                    sold_tickets: "0",
                                    total_tickets: "0"
                                };
                            }
                            if (userTicketsResponse.data.ticket_list != undefined) {
                                $scope.ticketLists = userTicketsResponse.data.ticket_list;
                            } else {
                                $scope.ticketLists = [];
                            }
                            if ($scope.event.event_admin !== '') {
                                $scope.adminEmails = (JSON.parse($scope.event.event_admin)).map((admin) => { return admin.email; });
                                event_admin_names = $scope.adminEmails;
                                if ($scope.adminEmails.length > 1) {
                                    $scope.adminList = event_admin_names.join(", ");
                                } else {
                                    $scope.adminList = event_admin_names[0];
                                }
                            }
                            if (Object.keys($scope.event.layout_details).length > 0) {
                                $scope.seatMapCreated = true;
                                $scope.event.layout_details.tiers.forEach(function(tireDetails) {
                                    $scope.totalTireCapcity = $scope.totalTireCapcity + parseInt(tireDetails.seating_capacity);
                                });
                            }
                            let requireDate = moment($scope.newtoday_date).format("DD-MM-YYYY");
                            let selectedDate = moment($scope.event.start_date_time).format("DD-MM-YYYY");
                            if (selectedDate < requireDate) {
                                $scope.addPromotionDisabled = false;
                            } else {
                                $scope.addPromotionDisabled = true;
                            }
                            if ($scope.event._user_id === $scope.user.user_id) {
                                $scope.isAuthorisedUser = true;
                            }
                            Utils.applyChanges($scope);
                            $scope.setAdminFriends();
                        } else {
                            $scope.manageEvent = {
                                event_details: {},
                                ticket_counts: {
                                    remaining_tickets: "0",
                                    scan_tickets: 0,
                                    sold_tickets: "0",
                                    total_tickets: "0"
                                },
                                ticket_details: [],
                                ticket_list: []
                            };
                            $scope.ticketCounts = $scope.manageEvent.ticket_counts;
                            $scope.ticketLists = $scope.manageEvent.ticket_list;
                        }
                    })
                    .catch((err) => {
                        console.log(err);
                        $scope.loading = false;
                    }).finally(() => {
                        $scope.loading = false;
                    });
            };

            // This function is used to set ticket type filter
            $scope.selectTicketTypeFilter = (type) => {
                $scope.typeFilter = null;
                type = type;
                $scope.typeFilterText = type;
                let status = $scope.statusFilterText;
                let check = $scope.checkInFilterText;
                if (type) {
                    $scope.typeFilter = { 'typeId': type.ticket_id };
                    if (type.ticket_name === "all") {
                        $scope.typeText = "All";
                    } else {
                        $scope.typeText = type.ticket_name;
                    }
                    $scope.getTicketsOfEvent(status, type.ticket_id, check);
                }
            };

            $scope.selectTicketStatusFilter = (status) => {
                $scope.statusFilter = null;
                $scope.statusFilterText = status;
                let type = $scope.typeFilterText;
                let check = $scope.checkInFilterText;
                if (status) {
                    $scope.statusFilter = { 'event_status': status };
                    if (status === "all") {
                        $scope.statusText = "Order Status";
                    } else if (status === "paid") {
                        $scope.statusText = "Paid Order";
                    } else if (status === "free") {
                        $scope.statusText = "Free Order";
                    } else if (status === "cancel") {
                        $scope.statusText = "Cancelled Order";
                    } else if (status === "refunded") {
                        $scope.statusText = "Refunded Order";
                    }
                    $scope.getTicketsOfEvent(status, type, check);
                }
            };

            $scope.selectTicketCheckInFilter = (check) => {
                $scope.checkInFilter = null;
                $scope.checkInFilterText = check;
                let type = $scope.typeFilterText;
                let status = $scope.statusFilterText;
                if (status) {
                    $scope.checkInFilter = { 'checkin_status': check };
                    if (check === "all") {
                        $scope.checkInText = "Check In All";
                    } else if (check === "check_in") {
                        $scope.checkInText = "Check In Completed";
                    } else if (check === "pending") {
                        $scope.checkInText = "Check In Pending";
                    }
                    $scope.getTicketsOfEvent(status, type, check);
                }
            };

            $scope.getDefaultBank = function(userBankList) {
                angular.forEach(userBankList, function(value, key) {
                    if (value.is_default == 1) {
                        $scope.defalutBank = value;
                    }
                });
            };

            $scope.getuserBankList = function() {
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

            $scope.makeBankDefault = function(bank_id) {
                let event_id = $scope.eventID;
                eventsService.eventPayoutChange(bank_id, event_id).then((response) => {
                    if (response.success) {
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
                });
            };

            $scope.getInvitedHistory = function(id) {
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
                                        $scope.accpettedInviteuser.push(acceptedUsers);
                                        $scope.invitedList.push(acceptedUsers);
                                    });
                                    //check user is owner of event or not
                                    if ($scope.accpettedInviteuser.length > 0) {
                                        $scope.accpettedInviteuser.forEach(function(inviteData) {
                                            if (inviteData.email == $scope.user.email) {
                                                $scope.isAuthorisedUser = true;
                                            }
                                        });
                                    }
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

            $scope.init = () => {
                $scope.user = authService.getUser();

                $scope.showPage = false;
                if ($route.current.params && 'ev' in $route.current.params && $route.current.params.ev) {
                    $scope.eventID = $route.current.params.ev;
                    $scope.loading = true;
                    if ($scope.user) {
                        $scope.loading = true;
                        $scope.getTicketsOfEvent(status, type, check);
                        $scope.showPage = true;
                        $scope.getInvitedHistory($scope.eventID);
                    } else {
                        Utils.showError($scope, "You are not authorized to access this resource.");
                    }
                } else {
                    Utils.showError($scope, "No such event exists");
                }
                $scope.getuserBankList();
            };

            $scope.openTicketManagerModal = function(state) {
                let eventModelScope = $scope.$new(true);
                eventModelScope.event = $scope.manageEvent;
                eventModelScope.state = state;
                eventModelScope.tier_details = [];
                eventModelScope.layout_details = $scope.event.layout_details;
                let newTicketModalInstance = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/viewEventTicketTypeModal.html',
                    controller: 'TicketTypeManageController',
                    openedClass: 'pa-create-event-modal pa-common-modal-style popup_wtd_700 view_tc_event_type',
                    scope: eventModelScope,
                    size: 'lg',
                    windowClass: 'app-modal-window',
                });

                newTicketModalInstance.result.then(function(tickets) {
                    if (tickets) {
                        // Add it to event object
                        if (!$scope.event.tickets) {
                            $scope.event.tickets = [];
                        }
                        $scope.event.tickets = tickets;
                    }
                }, function() {
                    console.log('Modal dismissed at: ' + new Date());
                });
            };

            $scope.addEventAdminModal = function(state) {
                let modalScope = $scope.$new(false, $scope);
                modalScope.incomingState = state;
                let modalInstance = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    backdrop: 'static',
                    templateUrl: './partials/addEventAdministrationModal.html',
                    controller: 'addEventAdministrationModalController',
                    windowClass: 'pa-common-modal-style tt-scan-qr-modal',
                    scope: modalScope,
                });

                modalInstance.result.then(function(data) {
                    $scope.event.event_admin = data;
                }, function() {
                    console.log('Modal dismissed at: ' + new Date());
                });
            };

            $scope.attendeeDetailModal = function(ticketsData) {
                let modalScope = $scope.$new(false, $scope);
                modalScope.claimEvent = false;
                modalScope.ticket = ticketsData;
                $scope.openAttende = true;
                attendeeDetailModal = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    backdrop: 'static',
                    templateUrl: './partials/attendeeDetail.html',
                    windowClass: 'pa-common-modal-style tt-scan-qr-modal',
                    openedClass: 'attendee_main_parent scroll_popup',
                    scope: modalScope,
                });
            };

            $scope.refundTicket = function(ticketData) {
                $scope.loading = true;
                let ticketId = ticketData.id;
                eventsService.refundTicketById(ticketId).then((response) => {
                    let data = response.data;
                    if ($scope.openAttende) {
                        $scope.openAttende = false;
                        attendeeDetailModal.close();
                    }
                    let notify = {
                        type: 'success',
                        title: 'Success',
                        content: data.message,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    $scope.loading = false;
                    setTimeout(function() {
                        $window.location.reload();
                    }, 1000);
                }).catch(err => {
                    let content = "Sorry something went wrong. Please try later.";
                    if (err && 'message' in err) {
                        content = err.message;
                    }
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: content,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                });
            };

            $scope.openChangePayoutModel = function() {
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.bank_id = $scope.defalutBank.bank_id;
                $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/changeEventPayout.html',
                    openedClass: 'update_bank_info pa-create-event-modal add-link-modal',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            $scope.cancel = function() {
                this.$dismiss('close');
            };

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

            /*
             **
             ** Add Ticket New Modal For free/paid/tier
             **
             */
            $scope.freeEventTickets = function(state) {
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.modelAction = 'Add New';
                eventModelScope.saveAnother = false;
                eventModelScope.state = state;
                eventModelScope.layout_details = $scope.event.layout_details;
                eventModelScope.event_type = $scope.event.event_type;
                eventModelScope.price = "free";
                eventModelScope.tier_details = [];
                $scope.freeEventTicketsModel = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/freeEventTickets.html',
                    openedClass: 'pa-create-event-modal freeEventTickets scroll_popup popup_wtd_700',
                    controller: 'TicketTypeManageController',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            $scope.paidEventTickets = function(state) {
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.saveAnother = false;
                eventModelScope.state = state;
                eventModelScope.event_type = $scope.event.event_type;
                eventModelScope.modelAction = 'Add New';
                eventModelScope.layout_details = $scope.event.layout_details;
                eventModelScope.tier_details = [];
                $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/paidEventTickets.html',
                    controller: 'TicketTypeManageController',
                    openedClass: 'pa-create-event-modal freeEventTickets scroll_popup popup_wtd_700',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            $scope.eventTireTicket = function(state) {
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.layout_details = $scope.event.layout_details;
                eventModelScope.event_type = $scope.event.event_type;
                eventModelScope.event = $scope.event;
                eventModelScope.price = ($scope.event.event_type == 'free') ? 'free' : 'paid';
                eventModelScope.modelAction = 'Add New';
                eventModelScope.saveAnother = false;
                eventModelScope.state = state;
                $scope.tier_details = [];
                $scope.event.layout_details.tiers.forEach(function(tireDetails) {
                    let tire = {
                        "_tier_id": tireDetails.tier_id,
                        "price": '',
                        "quantity": tireDetails.seating_capacity,
                    };
                    $scope.tier_details.push(tire);
                });
                eventModelScope.ticketsArr = $scope.tickets;
                eventModelScope.tier_details = $scope.tier_details;
                $scope.paidEventTicketsModel = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/createEventTireTicket.html',
                    openedClass: 'pa-create-event-modal freeEventTickets scroll_popup popup_wtd_700',
                    controller: 'TicketTypeManageController',
                    scope: eventModelScope,
                    size: 'md'
                });
            };
            /******************** Code start for add administartor **********************************************************/

            /*
             **
             ** function to open add existing user as admin model
             **
             */

            $scope.deletedAdmin = [];
            $scope.newAddedAdmin = [];

            $scope.OpenAddExistingUserAsAdminModel = function(state) {
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.model_title = state;
                $scope.existingUserAsAdminModel = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/addExistingUserAsAdminManageModel.html',
                    windowClass: 'pa-common-modal-style tt-scan-qr-modal',
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

            $scope.OpenAddNewAdminUserModel = function() {
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

            $scope.addNewAdmin = function(admin_name, admin_email) {

                let existingUsers = ($scope.newAddedAdmin.length > 0) ? $scope.newAddedAdmin : [];

                let data = {
                    "existingUsers": existingUsers,
                    "newUsers": [{
                        "name": admin_name,
                        "email": admin_email
                    }]
                };

                eventsService.inviteAdministrator(data, $scope.eventID).then((response) => {
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

            $scope.addAdminToEvent = function(selectedAdmins) {

                //code to get new added admin 
                $scope.selectedAdmins = selectedAdmins;
                $scope.newAddedAdminId = [];
                $scope.newAddedAdminEmail = [];
                for (let newAdmin of $scope.selectedAdmins) {
                    if (newAdmin.id == '' && newAdmin.administrator_id == '') {
                        let temp = {
                            "name": "",
                            "email": newAdmin.email
                        };
                        $scope.newAddedAdminEmail.push(temp);
                    } else if (newAdmin.administrator_id == '' || newAdmin.administrator_id == 0) {
                        $scope.newAddedAdminId.push(newAdmin.id);
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

                eventsService.inviteAdministrator(data, $scope.eventID).then((response) => {
                    if (response.success) {
                        $scope.loading = false;
                        let notify = {
                            type: 'success',
                            title: 'Success',
                            content: "Invitation send succcessfully.",
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        setTimeout(function() {
                            $window.location.reload();
                        }, 1000);
                    } else {
                        $scope.loading = false;
                        $scope.close();
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

            $scope.checkUserID = function(userId, searchArray) {
                for (let sa of searchArray) {
                    if (sa.user_id == userId) {
                        return true;
                    }
                }
                return false;
            };

            // Remove guest
            $scope.deleteAdmin = function(index, adminID) {
                $scope.event.event_admin.splice(index, 1);
                if (adminID >= 0) {
                    $scope.deletedAdmin.push(adminID);
                }
            };

            /*
             **
             ** Fetch user's friends
             **        
             */
            $scope.tickAdminFriends = function(response) {
                let adminEmails = "";
                adminEmails = $scope.event.event_admin.map((admin) => { return admin.email; });
                if (adminEmails.length > 0) {
                    angular.forEach(response, function(elem) {
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

            $scope.setAdminFriends = function() {
                $scope.displayAdmins = [];
                let adminId = [];
                let event_admin = '';
                $scope.event.event_admin = JSON.parse($scope.event.event_admin);

                angular.forEach($scope.event.event_admin, function(element) {
                    let temp = {
                        id: element.user_id,
                        administrator_id: element.administrator_id,
                        name: element.username,
                        email: element.email,
                        iconImage: element.profile_pic || '../img/defaultProfilePic.png'
                    };
                    $scope.multipleDemo.selectedAdmins.push(temp);
                });
                if ($scope.event.event_admin.length > 0) {
                    adminId = $scope.event.event_admin.map((admin) => { return admin; });
                    event_admin = $scope.event._user_id;
                }

                if ($scope.user) {
                    $scope.loading = true;
                    userService.getAllUsers()
                        .then(response => {
                            $scope.userList = response.data.data;
                            let userLists = '';
                            $scope.ticketLists.forEach(function(data, index) {
                                $scope.userList.forEach(function(dataValue) {
                                    if (data.user_id == dataValue.user_id) {
                                        userLists = {
                                            email: data.user_info.email,
                                            first_name: data.user_info.first_name,
                                            last_name: data.user_info.last_name,
                                            username: data.user_info.username,
                                            quickblox_id: data.user_info.quickblox_id,
                                            mobile_number: dataValue.mobile_number
                                        };
                                        $scope.ticketLists[index].user_info = userLists;
                                    }
                                });
                            });
                            return $scope.tickAdminFriends(response.data);
                        })
                        .then(res => {
                            angular.forEach(res.data, function(element) {

                                let rightVal = true;

                                if (element.first_name) {
                                    element.username = element.first_name + ' ' + element.last_name;
                                }

                                if (element.profile_pic) {
                                    element.iconImage = element.profile_pic || '../img/defaultProfilePic.png';
                                } else {
                                    element.iconImage = '../img/defaultProfilePic.png';
                                }
                                angular.forEach(adminId, function(valueEle) {
                                    if (element.user_id === valueEle.user_id) {
                                        rightVal = false;
                                    }
                                });

                                angular.forEach($scope.multipleDemo.selectedAdmins, function(adVal, index) {
                                    if (element.user_id === adVal.id) {
                                        $scope.multipleDemo.selectedAdmins[index].iconImage = element.profile_pic || '../img/defaultProfilePic.png';
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
                                if (rightVal) {
                                    $scope.displayAdmins.push(newElement);
                                }
                            });

                            $scope.loading = false;
                            Utils.applyChanges($scope);
                        })
                        .catch(err => {
                            $scope.loading = false;
                            console.log('Friend List Error::', err);
                        });
                }
            };

            $scope.multipleDemo = {};
            $scope.multipleDemo.selectedAdmins = [];
            $scope.errorMail = false;

            $scope.checkAllValidMail = function() {
                var exp = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
                for (var i of $scope.multipleDemo.selectedAdmins) {
                    if (exp.test(i.email)) {
                        $scope.errorMail = false;
                    } else {
                        $scope.errorMail = true;
                        $scope.multipleDemo.selectedAdmins.slice(i, 1);
                        break;
                    }
                }
            };

            $scope.afterSelection = function($item) {};

            $scope.afterRemoving = function($item) {};

            $scope.tagTransform = function(newTag) {
                var item = {
                    id: '',
                    administrator_id: '',
                    name: newTag,
                    email: newTag.toLowerCase(),
                    iconImage: '../img/defaultProfilePic.png'
                };
                return item;

            };

            /******************** Code End for add administartor **********************************************************/

            $scope.init();
        }
    ]);