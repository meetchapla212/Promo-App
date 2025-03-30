angular.module('PromoApp')
    .service('authService', ['$timeout', '$cookies', '$http', 'config', function($timeout, $cookies, $http, config) {

        this.getUser = function() {
            let user = $cookies.getObject('user');
            if (user) {
                return user;
            } else {
                return null;
            }
        };

        this.getSession = function() {
            let user = $cookies.getObject('session');
            if (user) {
                return user;
            } else {
                return null;
            }
        };

        this.setUser = function(user) {
            if ('custom_data' in user && user.custom_data) {
                if (typeof user.custom_data === 'string' || user.custom_data instanceof String) {
                    try {
                        user.custom_data = JSON.parse(user.custom_data);
                    } catch (err) {
                        user.custom_data = {};
                        console.log(err);
                    }
                }
            } else {
                user.custom_data = {};
            }
            this.putWithExpiry('user', JSON.stringify(user));
        };

        this.clearSession = function() {
            if ($cookies.get('session')) {
                $cookies.remove('session');
            }
            if ($cookies.get('user')) {
                $cookies.remove('user');
                localStorage.removeItem("user");
                localStorage.removeItem("localDataSet");
                localStorage.removeItem("currentPath");
                localStorage.removeItem("events_start_date");
                localStorage.removeItem("events_end_date");
                localStorage.removeItem("snap-connect-sdk-share-url");
                localStorage.removeItem("needHardRefresh");
                localStorage.removeItem("user_selected_seat");
                localStorage.removeItem("countryCode");
                localStorage.removeItem("setConfirmation");
            }
            if ($cookies.get('otp_verification_data')) {
                $cookies.remove('otp_verification_data');
            }
            if ($cookies.get('token')) {
                $cookies.remove('token');
            }
            if ($cookies.get('userUnreadMessageCount')) {
                $cookies.remove('userUnreadMessageCount');
            }
            if ($cookies.get('qbAppSession')) {
                $cookies.remove('qbAppSession');
            }
            if ($cookies.get('gatewayID')) {
                $cookies.remove('gatewayID');
            }
            if ($cookies.get('passwordInfo')) {
                $cookies.remove('passwordInfo');
            }
        };

        this.getObject = function(name) {
            return $cookies.getObject(name);
        };
        this.get = function(name) {
            return $cookies.get(name);
        };

        this.putWithExpiry = function(name, value) {
            let now = new Date();
            now.setMinutes(now.getMinutes() + 43200);
            $cookies.put(name, value, { expires: now });
        };
        this.putWithExpiryWith4Hours = function(name, value) {
            let now = new Date();
            now.setMinutes(now.getMinutes() + 8760); //2
            $cookies.put(name, value, { expires: now });
        };
        this.put = function(name, value, expiry) {
            if (expiry) {
                $cookies.put(name, value, expiry);
            } else {
                $cookies.put(name, value);
            }
        };
        this.remove = function(name) {
            $cookies.remove(name);
        };
    }]);