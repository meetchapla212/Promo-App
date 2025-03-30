angular.module('PromoApp')
    .service('userService', ['qbService', 'authService', 'followUser', 'apiService', function(qbService, authService, followUser, apiService) {
        let usersession = authService.getUser();
        let session = authService.getSession();
        let user_service = this;


        user_service.getFollowUsersDeatil = (id) => {
            return followUser.following(id).then(response => {
                let userIds = [];
                if (response.status == 200) {
                    let data = response.data;
                    if (data.success && 'data' in data) {
                        let rows = data.data;
                        rows.forEach(function(element) {
                            if (element.followUser_id) {
                                userIds.push(element.followUser_id);
                            }
                        }, this);
                    }
                }
                return user_service.getusers(userIds);
            });
        };

        this.getFollowUsersDeatils = (id) => {
            let token = authService.get('token');
            return apiService.getFollowingListById(id, token).then(response => {
                return response;
            });
        };

        this.searchUserByFilter = (searchText, zoneId) => {
            let token = authService.get('token');
            return apiService.searchUser(searchText, zoneId, token).then((response) => {
                return response;
            });
        };

        this.getAllUsers = () => {
            let token = authService.get('token');
            return apiService.getAllUsers(token).then((response) => {
                return response;
            });
        };

        this.getUsersFollowList = () => {
            let token = authService.get('token');
            return apiService.getUserFollowList(token).then((response) => {
                return response;
            });
        };


        this.getUserProfile = (user_id) => {
            return apiService.getUserProfile(user_id).then((response) => {
                return response;
            });
        };


        user_service.getTickets = (ticket_id) => {
            let token = authService.get('token');
            return apiService.getTickets(token, ticket_id).then((response) => {
                return response;
            });
        };

        this.getPurchased_ticket = (id) => {
            let token = authService.get('token');
            return apiService.getPurchasedTicket(id, token).then((response) => {
                return response;
            });
        };

        this.getGatewayId = function(user) {
            let response = {};
            return new Promise((resolve, rejected) => {
                if (user) {

                    response = {
                        "current_plan_id": user.selectedPlan.id
                    };
                    return Promise.resolve(response);
                } else {
                    return Promise.resolve(response);
                }
            });
        };

        // This method is used to update custom data
        this.updateUserPaypalEmail = (paypal_email) => {
            let token = authService.get('token');
            return apiService.updateUserPaypalEmail(token, paypal_email)
                .then(() => {
                    let user = authService.getUser();
                    // Update it in auth service
                    user.paypal_email = paypal_email;
                    authService.setUser(user);
                    return Promise.resolve();
                });
        };

        // This method is used to get users guests list
        this.getGuests = (user_id) => {
            return qbService.getCurrentSession()
                .then((res) => {
                    let filter = { "user_id": user_id };
                    return qbService.listTable('GuestUsers', filter);
                }).then(res => {
                    if (res && res.length > 0) {
                        return Promise.resolve(res);
                    } else {
                        return Promise.resolve([]);
                    }

                }).catch(err => {
                    console.log('error in getting guest', err);
                    return Promise.resolve([]);
                });
        };

        this.getClaimHistory = () => {
            let token = authService.get('token');
            let params = {

            };
            let events = [];
            return eventsService.getEventsByStatus({ "status": "claimed" })
                .then((res) => {
                    return events;
                }).catch(err => {
                    console.log('error in getting guest', err);
                    return Promise.resolve([]);
                });
        };

        this.listingBankAccounts = () => {
            let token = authService.get('token');
            return apiService.listingBankAccounts(token).then((response) => {
                if (response && 'data' in response) {
                    return response.data;
                }
            });
        };

        this.activeEventPayoutList = (data) => {
            let token = authService.get('token');
            return apiService.activeEventPayoutList(data, token).then(response => {
                if (response && 'data' in response) {
                    return response.data;
                }
            });
        };

        this.pendingEventPayoutList = (data) => {
            let token = authService.get('token');
            return apiService.pendingEventPayoutList(data, token).then(response => {
                if (response && 'data' in response) {
                    return response.data;
                }
            });
        };

        this.completedEventPayoutList = (data) => {
            let token = authService.get('token');
            return apiService.completedEventPayoutList(data, token).then(response => {
                if (response && 'data' in response) {
                    return response.data;
                }
            });
        };

    }]);