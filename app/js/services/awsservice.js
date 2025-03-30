angular.module('PromoApp')
    .service('awsService', ['config', '$http', function(config, $http) {

        this.subscribeToThirdParty = function(email, username) {
            let data = {
                "email": email
            };
            if (username) {
                data.username = username;
            }
            let url = config.AWS_BASE_URL + "/subscribe";
            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: {
                    'Content-Type': 'application/json'
                },
                json: true
            });
        };

        this.updateShareCounter = function(email, event_id) {
            let url = config.AWS_BASE_URL + "/share";
            let data = {};
            if (event_id) {
                data.event_id = event_id;
            }
            if (email) {
                data.email = email;
            }
            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: {
                    'Content-Type': 'application/json'
                },
                json: true
            }).then(function(result) {
                return Promise.resolve((result.data.count));
            });
        };

        this.saveCitiesOnLocationChange = function(data) {
            let url = config.AWS_BASE_URL + "location/access";
            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: {
                    'Content-Type': 'application/json'
                },
                json: true
            });
        };

        this.completeTransaction = function(data, token) {
            let url = config.AWS_BASE_URL + "/billing/completetransaction";
            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                json: true
            });
        };

        this.sendEmail = function(data, type) {
            let url = config.AWS_BASE_URL + `/emails/${type}`;
            return $http({
                method: 'POST',
                url: url,
                data: data,
                headers: {
                    'Content-Type': 'application/json'
                },
                json: true
            });
        };

        this.delete = function(api_url, token) {
            let url = config.BACKEND_API_ENDPOINT + api_url;
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'DELETE',
                url: url,
                headers: headers,
                json: true
            }).then((response) => {
                if (response && 'data' in response && response.data) {
                    return response.data;
                }
            });
        };

        this.post = function(api_url, data, token) {
            let url = config.BACKEND_API_ENDPOINT + api_url;
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

        this.get = function(url, token) {
            let headers = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers.Authorization = token;
            }
            return $http({
                method: 'GET',
                url: config.AWS_BASE_URL + url,
                headers: headers,
                json: true
            }).then((response) => {
                if (response && 'data' in response && response.data) {
                    return response.data;
                }
            });
        };

        this.put = function(api_url, data, token) {
            let url = config.BACKEND_API_ENDPOINT + api_url;
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            if (data && 'planInformation' in data && data.planInformation.plan_id != 'highlight') {
                console.log(1);
                console.log(data.event_id);
                return $http({
                    method: 'POST',
                    url: config.BACKEND_API_ENDPOINT + '/event/claimed/' + data.event_id,
                    data: data.planInformation,
                    headers: headers,
                    json: true
                }).then((response) => {
                    if (response && 'data' in response && response.data) {

                        if (data.planInformation.plan_id == "highlight_and_edit") {
                            data.plan_id = data.planInformation.plan_id;
                            data.plan_amount = data.planInformation.plan_amount;
                            data.highlighted = 1;
                        }
                        delete data.planInformation;
                        delete data.event_id;

                        return $http({
                            method: 'PUT',
                            url: url,
                            data: data,
                            headers: headers,
                            json: true
                        }).then((response) => {
                            if (response && 'data' in response && response.data) {
                                return response.data;
                            }
                        });
                    }
                });
            } else {
                if (data && 'planInformation' in data && data.planInformation.plan_id == 'highlight') {
                    data.plan_id = data.planInformation.plan_id;
                    data.plan_amount = data.planInformation.plan_amount;
                    data.highlighted = 1;
                    delete data.planInformation;
                    delete data.event_id;
                }
                return $http({
                    method: 'PUT',
                    url: url,
                    data: data,
                    headers: headers,
                    json: true
                }).then((response) => {
                    if (response && 'data' in response && response.data) {
                        return response.data;
                    }
                });
            }
        };

        //for unsubscribe from the stripe
        this.unsubscribeStripePlan = function(token) {
            let url = config.BACKEND_API_ENDPOINT + "/plan/unsubscribe";
            return $http({
                method: 'PUT',
                url: url,
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                json: true
            });
        };

        this.getCoupon = function(coupon) {
            let url = config.AWS_BASE_URL + "/coupon/" + coupon;
            return $http({
                method: 'GET',
                url: url,
                headers: {
                    'Content-Type': 'application/json'
                },
                json: true
            });
        };

        this.approveTicket = (ticket_id, token) => {
            let url = config.AWS_BASE_URL + "/approveTicket/" + ticket_id;
            let headers = {
                'Authorization': token,
                'Content-Type': 'application/json'
            };
            return $http({
                method: 'PUT',
                url: url,
                headers: headers,
                json: true
            }).then(function(result) {
                return Promise.resolve((result));
            });
        };

        this.confirmTicket = (token, qrcode, eventId) => {
            let url = config.AWS_BASE_URL + "/scanTicket";

            let data = {
                "token": qrcode,
                'event_id': eventId
            };

            return $http({
                    method: 'POST',
                    url: url,
                    data: data,
                    headers: {
                        'Authorization': token,
                        'Content-Type': 'application/json'
                    },
                    json: true
                })
                .then((response) => {
                    if (response && 'data' in response && response.data) {
                        return response.data;
                    }
                });
        };

    }]);