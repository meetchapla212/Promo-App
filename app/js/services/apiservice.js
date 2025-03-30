angular.module('PromoApp')
    .service('apiService', ['config', '$http', 'authService', function(config, $http, authService) {

        this.userLogin = function(params) {
            let url = config.BACKEND_API_ENDPOINT + "/auth/login";
            return $http({
                method: 'POST',
                url: url,
                data: params,
                headers: {
                    'Content-Type': 'application/json'
                },
                json: true
            });
        };

        this.adminUserLogin = function(params) {
            let url = config.BACKEND_API_ENDPOINT + "/auth/admin-login";
            return $http({
                method: 'POST',
                url: url,
                data: params,
                headers: {
                    'Content-Type': 'application/json'
                },
                json: true
            });
        };

        this.verifyEmail = function(token) {
            let url = config.BACKEND_API_ENDPOINT + "/auth/sendVerificationEmail";
            return $http({
                method: 'POST',
                url: url,
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                json: true
            });
        };

        this.validateEmail = function(params) {
            let url = config.BACKEND_API_ENDPOINT + "/auth/verify-email";
            return $http({
                method: 'POST',
                url: url,
                data: params,
                headers: {
                    'Content-Type': 'application/json'
                },
                json: true
            });
        };

        /*
         * 
         * for sign up on Promo App
         * 
         */
        this.signUpUserType = (params) => {
            let url = config.BACKEND_API_ENDPOINT + "/auth/registerv2";
            return $http({
                method: 'POST',
                url: url,
                data: params,
                headers: {
                    'Content-Type': 'application/json'
                },
                json: true
            });
        };

        this.signUpUserVerify = (params) => {
            let url = config.BACKEND_API_ENDPOINT + "/auth/verifyOTPv2";
            return $http({
                method: 'POST',
                url: url,
                data: params,
                headers: {
                    'Content-Type': 'application/json'
                },
                json: true
            });
        };

        this.signUpUserConfirm = (params, token) => {
            let url = config.BACKEND_API_ENDPOINT + "/auth/finishRegistration";
            let headers = {};
            if (token) {
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': token
                };
            }
            return $http({
                method: 'POST',
                url: url,
                data: params,
                headers: headers,
                json: true
            });
        };

        this.signUpUser = (params) => {
            let url = config.BACKEND_API_ENDPOINT + "/auth/register";
            return $http({
                method: 'POST',
                url: url,
                data: params,
                headers: {
                    'Content-Type': 'application/json'
                },
                json: true
            });
        };

        /*
         * 
         * Verify OTP
         * 
         */
        this.verifyOTP = (params, token) => {
            let url = config.BACKEND_API_ENDPOINT + "/auth/verifyOTP";
            let headers = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers.Authorization = token;
            }
            return $http({
                method: 'POST',
                url: url,
                data: params,
                headers: headers,
                json: true
            });
        };

        /*
         * 
         * for Resend OTP
         * 
         */
        this.resendOTP = (params, token) => {
            let url = config.BACKEND_API_ENDPOINT + "/auth/sendOTP";

            let headers = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers.Authorization = token;
            }

            return $http({
                method: 'POST',
                url: url,
                data: params,
                headers: headers,
                json: true
            });
        };

        this.forgotpassword = (params) => {

            let url = config.BACKEND_API_ENDPOINT + "/auth/forgotpassword";

            let headers = {
                'Content-Type': 'application/json'
            };

            return $http({
                method: 'POST',
                url: url,
                data: params,
                headers: headers,
                json: true
            });
        };

        this.resetPassword = (params, token) => {
            let url = config.BACKEND_API_ENDPOINT + "/auth/resetpassword";
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };

            return $http({
                method: 'POST',
                url: url,
                data: params,
                headers: headers,
                json: true
            });
        };

        this.resetPasswordPhone = (params) => {
            let url = config.BACKEND_API_ENDPOINT + "/auth/resetPasswordPhoneUpdated";
            return $http({
                method: 'POST',
                url: url,
                data: params,
                headers: {
                    'Content-Type': 'application/json'
                },
                json: true
            });
        };

        this.logout = (token) => {
            let url = config.BACKEND_API_ENDPOINT + "/auth/logout";
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'POST',
                url: url,
                headers: headers,
                json: true
            });
        };

        /****************API for Update Profile 07/02/2020*******************/
        this.updateUserProfile = (token, params) => {

            let url = config.BACKEND_API_ENDPOINT + "/profile/update";

            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };

            return $http({
                method: 'POST',
                url: url,
                data: params,
                headers: headers,
                json: true
            });
        };

        /****************API for Get Follower List 07/02/2020*******************/
        this.getFollowerList = (token) => {

            let url = config.BACKEND_API_ENDPOINT + "/profile/getFollowerList";
            let headers = {
                'Authorization': token
            };
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        /****************API for Get Following List 07/02/2020*******************/
        this.getFollowingList = (token) => {
            let url = config.BACKEND_API_ENDPOINT + "/profile/getFollowingList";
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getFollowerListById = (userId, token, zone_id) => {
            let url = '';
            if (zone_id > 0) {
                url = config.BACKEND_API_ENDPOINT + "/profile/getFollowerList?userId=" + userId + '&zone_id=' + zone_id;
            } else {
                url = config.BACKEND_API_ENDPOINT + "/profile/getFollowerList?userId=" + userId;
            }
            let headers = {
                'Authorization': token
            };
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            }).then((response) => {
                if (response && 'data' in response && response.data) {
                    return response.data;
                }
            });
        };

        this.getFollowingListById = (userId, token, zone_id) => {
            let url = '';
            if (zone_id > 0) {
                url = config.BACKEND_API_ENDPOINT + "/profile/getFollowingList?userId=" + userId + '&zone_id=' + zone_id;
            } else {
                url = config.BACKEND_API_ENDPOINT + "/profile/getFollowingList?userId=" + userId;
            }
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            }).then((response) => {
                if (response && 'data' in response && response.data) {
                    return response.data;
                }
            });
        };

        /****************API for Create Event 07/02/2020*******************/
        this.goingUsersInEvent = (token, params) => {
            let url = config.BACKEND_API_ENDPOINT + "/event/goingUsersInEvent";
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'POST',
                url: url,
                data: params,
                headers: headers,
                json: true
            });
        };

        /****************API for Get Intersted Event List 07/02/2020*******************/
        this.getInterestedEventsList = (token) => {
            let url = config.BACKEND_API_ENDPOINT + "/profile/getInterestedEventsList";
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/x-www-form-urlencoded'
            };
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getGoingEventsListById = (token, userId) => {
            let url = '';
            if (userId === undefined || userId == null || userId.length <= 0) {
                url = config.BACKEND_API_ENDPOINT + "/profile/getGoingEventsList";
            } else {
                url = config.BACKEND_API_ENDPOINT + "/profile/getGoingEventsList?userId=" + userId;
            }
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/x-www-form-urlencoded'
            };
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        /****************API for Follow User 08/02/2020*******************/
        this.followUser = (token, params) => {
            let url = config.BACKEND_API_ENDPOINT + "/user/followUser";
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'POST',
                url: url,
                data: params,
                headers: headers,
                json: true
            });
        };

        /****************API for Get Notification 08/02/2020*******************/
        this.getNotification = (token) => {
            let url = config.BACKEND_API_ENDPOINT + "/general/getNotification";
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        /****************API for Update Event Address 07/02/2020*******************/
        this.updateAddressEvent = (token) => {
            let url = config.BACKEND_API_ENDPOINT + "/event/updateAddress";
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'POST',
                url: url,
                headers: headers,
                json: true
            });
        };

        /****************API for Update Event Address 10/02/2020*******************/
        this.searchUser = (searchText, zoneId, token) => {
            let url = '';
            if (zoneId != undefined) {
                url = config.BACKEND_API_ENDPOINT + "/general/searchUser?key=" + searchText + '&zone_id=' + zoneId;
            } else {
                url = config.BACKEND_API_ENDPOINT + "/general/searchUser?key=" + searchText;
            }

            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        /****************API for Get Follower List 10/02/2020*******************/
        this.getEventCategories = () => {

            let url = config.BACKEND_API_ENDPOINT + "/general/getEventCategories";
            return $http({
                method: 'GET',
                url: url,
                json: true
            });
        };

        /*****************Call Change Passaword Api 11-02-2020***************/
        this.changePassword = (token, params) => {
            let url = config.BACKEND_API_ENDPOINT + "/auth/changepassword";
            let headers = {
                'Authorization': token
            };
            return $http({
                method: 'POST',
                url: url,
                data: params,
                headers: headers,
                json: true
            });
        };

        /*****************Call Event Search Api 11-02-2020***************/
        this.getEventDetails = (eventId, token, params) => {
            let url = config.BACKEND_API_ENDPOINT + "/event/detail/" + eventId;
            if (params) {
                if (params.passwordToken) {
                    url = url + '?passwordToken=' + params.passwordToken;
                } else if (params.password) {
                    url = url + '?password=' + params.password;
                } else if (params.invite_id) {
                    url = url + '?invite_id=' + params.invite_id;
                }
            }
            let headers = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers.Authorization = token;
            }
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        /*****************Call Event Search Api 11-02-2020***************/
        this.getEvents = (params, token) => {

            let url = '';

            if (params.page > 1) {
                let index = params.page - 1;
                url = config.BACKEND_API_ENDPOINT + "/event/getSearchEvent?background=1&index=" + index;

                if (params && 'limit' in params) {
                    url = url + "&limit=" + params.limit;
                }
                if (params && 'sort' in params) {
                    url = url + "&sort=" + params.sort;
                }
                if (params && 'sortby' in params) {
                    url = url + "&sortby=" + params.sortby;
                }
                if (params && 'zone_id' in params) {
                    url = url + "&zone_id=" + params.zone_id;
                }
            } else {
                url = config.BACKEND_API_ENDPOINT + "/event/getSearchEvent";

                if (params && 'limit' in params) {
                    url = url + "?limit=" + params.limit;
                }
                if (params && 'sort' in params) {
                    url = url + "&sort=" + params.sort;
                }
                if (params && 'sortby' in params) {
                    url = url + "&sortby=" + params.sortby;
                }
                if (params && 'zone_id' in params) {
                    url = url + "&zone_id=" + params.zone_id;
                }
            }

            let headers = {
                'Content-Type': 'application/json'
            };

            if (token) {
                headers.Authorization = token;
            }
            return $http({
                method: 'POST',
                url: url,
                data: { search_params: params.search_params },
                headers: headers,
            });
        };

        this.getUserEvents = (user_id, token) => {
            let url = config.BACKEND_API_ENDPOINT + "/user/event/" + user_id + "?page=1&limit=100";
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
            });
        };

        this.getUserProfile = (user_id) => {
            let url = config.BACKEND_API_ENDPOINT + "/profile/" + user_id;
            return $http({
                method: 'GET',
                url: url,
                json: true
            });
        };

        /************ Add Comment form Event Detail View ********************/
        this.addComments = (token, params) => {

            let url = config.BACKEND_API_ENDPOINT + "/comment/add";
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'POST',
                url: url,
                data: params,
                headers: headers,
                json: true
            });
        };

        /********************Get comment Api 13-02-2020****************************/
        this.commentGet = (token, event_id, page, limit) => {
            let url = config.BACKEND_API_ENDPOINT + "/comment?event_id=" + event_id + "&page=" + page + "&limit=" + limit;
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        /************************Delete comment Api 13-02-2020**************************/
        this.dltComment = (token, comment_id) => {
            let url = config.BACKEND_API_ENDPOINT + "/comment/" + comment_id;
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'DELETE',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getUserTickets = (token) => {
            let url = config.BACKEND_API_ENDPOINT + "/ticket/getAllTickets";
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getUserCancelRefundTickets = () => {
            let token = authService.get('token');
            let url = config.BACKEND_API_ENDPOINT + "/ticket/refundedAndCancelledTickets";
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getEventTickets = (token, params) => {
            let url = config.BACKEND_API_ENDPOINT + "/event/tickets/" + params.id + "?order_status=" + params.status + "&ticket_status=" + params.type + "&checkin_status=" + params.check;
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        /****************API for Get Upcoming Event 07/02/2020*******************/
        this.getUpcomingEvent = (token) => {
            let url = config.BACKEND_API_ENDPOINT + "/event/getUpcoming";
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        /****************API for Get Pst Event 07/02/2020*******************/
        this.getPastEvent = (token) => {
            let url = config.BACKEND_API_ENDPOINT + "/event/getPast";
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getPlans = (token) => {
            let url = config.BACKEND_API_ENDPOINT + "/users/getPlans";
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        /****************API for Get Pst Event 07/02/2020*******************/
        this.getTickets = (token, ticket_id) => {
            let url = config.BACKEND_API_ENDPOINT + "/ticket/" + ticket_id;

            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };

            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };
        /****************API for Get Pst Event 14/02/2020*******************/


        /*****************Call Event Search Api 11-02-2020***************/
        this.getEventsByStatus = (params, token) => {
            let url = '';
            if (params.zone_id == null) {
                url = config.BACKEND_API_ENDPOINT + "/event/status?page=" + params.page + "&limit=" + params.limit + "&status=" + params.status;
            } else {
                url = config.BACKEND_API_ENDPOINT + "/event/status?page=" + params.page + "&limit=" + params.limit + "&status=" + params.status + '&zone_id=' + params.zone_id;
            }
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getRewardByStatus = (params, token) => {
            let url = config.BACKEND_API_ENDPOINT + "/rewards?page=" + params.page + "&limit=" + params.limit + "&status=" + params.status;
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };


        this.getRewardById = (rewardId, token) => {
            let url = config.BACKEND_API_ENDPOINT + "/reward/" + rewardId;
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.organiserAnalytics = (rewardId, token) => {
            let url = config.BACKEND_API_ENDPOINT + "/organiser-analytics/" + rewardId;
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };


        this.getRewardUserAnalytics = (rewardId, token) => {
            let url = config.BACKEND_API_ENDPOINT + "/user-analytics/" + rewardId;
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        /****************API for Get Pst Event 07/02/2020*******************/
        this.getInterestedEventsListById = (token, userId) => {

            let url = '';
            if (userId === undefined || userId == null || userId.length <= 0) {
                url = config.BACKEND_API_ENDPOINT + "/profile/getInterestedEventsList";
            } else {
                url = config.BACKEND_API_ENDPOINT + "/profile/getInterestedEventsList?userId=" + userId;
            }
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        /************************Unfollow user api 24-02-2020*****************************/
        this.unFollowUsers = (token, params) => {
            let url = config.BACKEND_API_ENDPOINT + "/user/unfollowUser";
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'POST',
                url: url,
                data: params,
                headers: headers,
                json: true
            });
        };

        this.getUserEventDD = function(token, user_id) {

            let url = config.BACKEND_API_ENDPOINT + "/activeEvent";
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };

            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            }).then((response) => {
                if (response && 'data' in response && response.data) {
                    return response.data;
                }
            });
        };

        this.updateUserPaypalEmail = (token, paypal_email) => {
            let url = config.BACKEND_API_ENDPOINT + "/profile/updatePaypalEmail";
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let params = {
                "paypal_email": paypal_email
            };
            return $http({
                method: 'POST',
                url: url,
                data: params,
                headers: headers,
                json: true
            });
        };

        this.getActiveTicketingEvents = function(token) {

            let url = config.BACKEND_API_ENDPOINT + "/userMonthyEventDetails";
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };

            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            }).then((response) => {
                if (response && 'data' in response && response.data) {
                    return response.data;
                }
            });
        };

        this.saveFeedback = function(token, data) {

            let url = config.BACKEND_API_ENDPOINT + "/general/postFeedback";
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };

            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            }).then((response) => {
                if (response && 'data' in response && response.data) {
                    return response.data;
                }
            });
        };

        this.socialRewardShare = function(token, data) {
            let url = config.BACKEND_API_ENDPOINT + "/analytics/addSocialShare";
            // console.log('UURRRLLL', url, token)
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };

            return $http({
                method: 'POST',
                url: url,

                data: data,
                headers: headers,
                json: true
            }).then((response) => {
                return response;

            });
        };

        this.addTicket = function(id, data, token) {
            let url = config.BACKEND_API_ENDPOINT + "/event/addTicket/" + id;
            let header = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: header,
                json: true
            }).then((response) => {
                return response;
            });
        };

        this.shareEvent = function(token, event_id) {
            let url = config.BACKEND_API_ENDPOINT + "/shareEvent/" + event_id;
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };

            return $http({
                method: 'POST',
                url: url,
                headers: headers,
                json: true
            }).then((response) => {
                return response;

            });
        };

        this.socialRewardVisit = function(data, token = null) {
            let url = config.BACKEND_API_ENDPOINT + "/analytics/visited";
            let headers = {
                'Content-Type': 'application/json'
            };
            if (token != null) {

                headers.Authorization = token;
            }

            return $http({
                method: 'POST',
                url: url,

                data: data,
                headers: headers,
                json: true
            }).then((response) => {
                return response;
            });
        };

        this.updateEventStatus = (token, event_id, status) => {
            let url = config.BACKEND_API_ENDPOINT + "/event/update/" + event_id;
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'PUT',
                url: url,
                data: { "status": status },
                headers: headers,
                json: true
            });
        };

        this.publishEventStatus = (token, event_id) => {
            let url = config.BACKEND_API_ENDPOINT + "/event/update/" + event_id;
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'PUT',
                url: url,
                data: {
                    "status": "active",
                    "is_draft": 0
                },
                headers: headers,
                json: true
            });
        };


        this.getSharedEventsById = function(token, userId) {
            let url = '';
            if (userId === undefined || userId == null || userId.length <= 0) {
                url = config.BACKEND_API_ENDPOINT + "/shared-event";
            } else {
                url = config.BACKEND_API_ENDPOINT + "/shared-event?userId=" + userId;
            }
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };

            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            }).then((response) => {
                if (response && 'data' in response && response.data) {
                    return response.data;
                }
            });
        };

        this.addWinnerInfo = function(data, token) {
            let url = config.BACKEND_API_ENDPOINT + "/add-winner-info";
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };

            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            }).then((response) => {
                return response;
            });
        };


        this.isDisqualifyUser = function(userId, isDisqualify, rewardId) {
            let token = authService.get('token');
            let data = {
                "user_id": userId,
                "is_disqualify": isDisqualify
            };
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/disqualify-user/" + rewardId;
            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.claimedEvent = function(event_id, plan, token) {

            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/event/claimed/" + event_id;
            return $http({
                method: 'POST',
                url: url,
                data: plan,
                headers: headers,
                json: true
            });
        };

        this.freeClaimedEvent = function(event_id, token) {

            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/event/claimed/" + event_id;
            return $http({
                method: 'POST',
                url: url,
                headers: headers,
                json: true
            });
        };


        this.connectStripeAccount = function(code, token) {

            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let data = { 'code': code };
            let url = config.BACKEND_API_ENDPOINT + "/user/connectStripeAccount";
            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.listingBankAccounts = function(token) {

            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/user/listingBankAccounts";
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.linkBankAccount = function(bank_token, token) {

            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/user/linkBankAccount/" + bank_token;
            return $http({
                method: 'PUT',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.makeBankDefault = function(stripe_bank_id, token) {

            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/user/changeDefaultBank/" + stripe_bank_id;
            return $http({
                method: 'PUT',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.refundTicket = function(id, token) {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/organiser/ticket_cancel/" + id;
            return $http({
                method: 'PUT',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.deleteBankInfo = function(stripe_bank_id, token) {

            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/user/removeBankAccount/" + stripe_bank_id;
            return $http({
                method: 'DELETE',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.updateBankDetails = function(data, token) {

            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/user/updateBankDetails";
            return $http({
                method: 'PUT',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.buyTicket = function(data, token) {

            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };

            let url = config.BACKEND_API_ENDPOINT + "/user/tickets";

            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.getPurchasedTicket = function(id, token) {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };

            let url = config.BACKEND_API_ENDPOINT + "/ticket/purchased_details/" + id;

            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        /* Payout List API CALL */
        this.activeEventPayoutList = function(data, token) {

            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };

            let url = config.BACKEND_API_ENDPOINT + "/payout/activeEvents";
            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.pendingEventPayoutList = function(data, token) {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/payout/pending-payment";
            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.completedEventPayoutList = function(data, token) {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/payout/completed";
            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.cancelEvent = (token, event_id, unpublishReason) => {
            let url = config.BACKEND_API_ENDPOINT + "/event/cancel";
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let data = {
                "eventId": event_id,
                "event_cancel_reason": unpublishReason
            };
            return $http({
                method: 'PUT',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.cancelTicket = (token, ticketId, cancelReason) => {
            let url = config.BACKEND_API_ENDPOINT + "/ticket/cancel/" + ticketId;
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let data = {
                "ticket_cancel_reason": cancelReason
            };

            return $http({
                method: 'PUT',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };


        this.eventPayoutChange = (token, bank_id, event_id) => {
            let url = config.BACKEND_API_ENDPOINT + "/event/payoutChange/" + event_id;
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let data = {
                "bank_id": bank_id
            };
            return $http({
                method: 'PUT',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.stripeAccountCreate = (token, success_url, failure_url, country) => {
            let url = config.BACKEND_API_ENDPOINT + "/stripeAccountCreate";
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let data = {
                "failure_url": failure_url,
                "success_url": success_url
            };

            if (country != '') {
                data.country = country;
            }

            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.getStripeAccountInfo = (token, success_url, failure_url, country) => {
            let url = config.BACKEND_API_ENDPOINT + "/account/checkStatus";
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let data = {
                "failure_url": failure_url,
                "success_url": success_url
            };

            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.deleteTicket = (token, ticket_id) => {
            let url = config.BACKEND_API_ENDPOINT + "/deleteTicket/" + ticket_id;
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'DELETE',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getReferalLinkByEventId = (id, token) => {
            let url = config.BACKEND_API_ENDPOINT + "/event/getReferalLink";
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let data = {
                "event_id": id,
                "social_type": "snapchat, whatsapp, facebook, email, other"
            };
            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.getAllUsers = (token) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };

            let url = config.BACKEND_API_ENDPOINT + "/general/getAllUser?limit=10000000&offset=1";

            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.updateImageOfEvent = (event_id) => {
            let headers = {
                'Content-Type': 'application/json'
            };

            let url = config.BACKEND_API_ENDPOINT + "/event/update/image/" + event_id;

            return $http({
                method: 'PUT',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getExistingSeatPlan = (id, token) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };

            let url = config.BACKEND_API_ENDPOINT + "/seating-plan-maps/existing-plan/detail/" + id;

            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.deleteSeatPlan = (id, token) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };

            let url = config.BACKEND_API_ENDPOINT + "/seating-plan-maps/delete/" + id;

            return $http({
                method: 'DELETE',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.holdSeats = (token, data) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };

            let url = config.BACKEND_API_ENDPOINT + "/seating-plan-maps/hold-seats";

            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.holdSeatsWidget = (data) => {
            let headers = {
                'Content-Type': 'application/json'
            };

            let url = config.BACKEND_API_ENDPOINT + "/seating-plan-maps/widget/hold-seats";

            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.deleteUserHoldTickets = (token) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };

            let url = config.BACKEND_API_ENDPOINT + "/seating-plan-maps/deleteUserHoldTickets";

            return $http({
                method: 'DELETE',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.widgetUserRegister = function(params) {
            let url = config.BACKEND_API_ENDPOINT + "/auth/register/widgetUser";
            return $http({
                method: 'POST',
                url: url,
                data: params,
                headers: {
                    'Content-Type': 'application/json'
                },
                json: true
            });
        };

        this.widgetUserVerify = function(params) {
            let url = config.BACKEND_API_ENDPOINT + "/auth/verify/widgetUser";
            return $http({
                method: 'POST',
                url: url,
                data: params,
                headers: {
                    'Content-Type': 'application/json'
                },
                json: true
            });
        };

        this.widgetUserEventList = function(id) {
            let url = config.BACKEND_API_ENDPOINT + "/user/event_list/" + id;
            return $http({
                method: 'GET',
                url: url,
                headers: {
                    'Content-Type': 'application/json'
                },
                json: true
            });
        };

        this.inviteAdministrator = (token, data, event_id) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };

            let url = config.BACKEND_API_ENDPOINT + "/event/inviteAdministrator/" + event_id;

            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.eventAdministratorRequest = (data) => {
            let headers = {
                'Content-Type': 'application/json'
            };

            let url = config.BACKEND_API_ENDPOINT + "/event/verify/eventAdministratorRequest";

            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.createEventAdministrator = (data) => {
            let headers = {
                'Content-Type': 'application/json'
            };

            let url = config.BACKEND_API_ENDPOINT + "/event/createEventAdministrator";

            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.inviteAdminHistory = (id, token) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/event/administrator-invitation/history/" + id;
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getZoneList = (token) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/owner/zones/list";
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getZoneDetail = (token, id) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/zone/view/" + id;
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getZoneEvents = (token, id) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/zone/events/list/" + id;
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getZoneMembers = (token, id) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/zone/members/list/" + id;
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getZoneOwners = (token, id) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/zone/owners/list/" + id;
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getZoneEventOrganizer = (token, id) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/zone/organizers/listing/" + id;
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getGeneralZoneEvents = (token, id) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/general/zone/events/listing/" + id;
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getGeneralZoneMembers = (token, id) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/general/zone/members/listing/" + id;
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getGeneralZoneOwners = (token, id) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/general/zone/owners/list/" + id;
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getGeneralZoneEventOrganizer = (token, id) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/general/zone/organizers/listing/" + id;
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.deleteZoneMember = (token, id, zoneId) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };
            let data = {
                zone_id: zoneId
            };
            let url = config.BACKEND_API_ENDPOINT + "/zone/member/delete/" + id;
            return $http({
                method: 'PUT',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.addZoneMember = (token, id) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/zone/add-member/" + id;
            return $http({
                method: 'POST',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.blockZoneMember = (token, id, data) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/zone/member/block/" + id;
            return $http({
                method: 'PUT',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.leaveZone = (token, data) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/owner/zone/delete";
            return $http({
                method: 'PUT',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.leaveZoneMember = (token, id) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/member/leave-zone/" + id;
            return $http({
                method: 'DELETE',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.inviteOwnerZone = (token, data) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/zone/owner/invitation";
            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.inviteMemberZone = (token, data) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/zone/member/invitation";
            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.inviteOrganizerZone = (token, data) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/zone/organizer/invitation";
            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.inviteOwnerZoneProcess = (data) => {
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/zone/owner/process-invitation";
            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.inviteMemberZoneProcess = (data) => {
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/zone/member/process-invitation";
            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.inviteOrganizerZoneProcess = (data) => {
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/zone/organizer/process-invitation";
            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.getMemberZoneList = (token) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/member/zoneListing";
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.blockZoneOrganizer = (token, id, data) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/zone/organizer/block/" + id;
            return $http({
                method: 'PUT',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.removeZoneOrganiser = (token, zoneId, id) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let data = {
                zone_id: zoneId
            };
            let url = config.BACKEND_API_ENDPOINT + "/zone/organizer/delete/" + id;
            return $http({
                method: 'PUT',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.userZoneList = (token) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/users/zone/listing";
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.memberZoneList = (token) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/member/zoneListing";
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getUserFollowList = (token) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/profile/getFollowList";
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.rePublishEvent = (token, data) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/event/republish";
            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.getAnalyticsDashInfo = (token, data) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/analytics/event";
            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.getAnalyticsReportInfo = (token, data) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/report/event";
            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.addEventVisitor = (data) => {
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/event/addEventvisitor";
            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.getSingleAnalyticstInfo = (token, data) => {
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            let url = config.BACKEND_API_ENDPOINT + "/event/singleAnalytic";
            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.getBlogCategory = () => {
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = "https://blog.thepromoapp.com/wp-json/wp/v2/categories";
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getCatPostList = (id) => {
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = "https://blog.thepromoapp.com/wp-json/wp/v2/categories/" + id;
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getBlogPost = () => {
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = "https://blog.thepromoapp.com/wp-json/wp/v2/posts";
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getBlogPostAll = () => {
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = "https://blog.thepromoapp.com/wp-json/wp/v2/posts?per_page=100";
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getBlogMedia = () => {
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = "https://blog.thepromoapp.com/wp-json/wp/v2/media";
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getBlogMediaPost = (id) => {
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = "https://blog.thepromoapp.com/wp-json/wp/v2/media/" + id;
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getPostUserInfo = (id) => {
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = "https://blog.thepromoapp.com/wp-json/wp/v2/users/" + id;
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getPostCategory = (id) => {
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = "https://blog.thepromoapp.com/wp-json/wp/v2/categories?post=" + id;
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getBlogMediaAll = () => {
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = "https://blog.thepromoapp.com/wp-json/wp/v2/media?per_page=100";
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getBlogDetail = (id) => {
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = "https://blog.thepromoapp.com/wp-json/wp/v2/posts/" + id;
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getTagBlogList = (id) => {
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = "https://blog.thepromoapp.com/wp-json/wp/v2/posts?tags=" + id + '&per_page=100';
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getTagBlogMedia = (id) => {
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = "https://blog.thepromoapp.com/wp-json/wp/v2/media?tags=" + id + '&per_page=100';
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getPostTag = (id) => {
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = "https://blog.thepromoapp.com/wp-json/wp/v2/tags?post=" + id;
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

        this.getPostComment = (data) => {
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = "https://blog.thepromoapp.com/wp-json/wp/v2/comments";
            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: headers,
                json: true
            });
        };

        this.getSearchPost = (text) => {
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = "https://blog.thepromoapp.com/wp-json/wp/v2/posts?per_page=100&search=" + text;
            return $http({
                method: 'GET',
                url: url,
                headers: headers,
                json: true
            });
        };

    }]);