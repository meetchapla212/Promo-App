angular.module('PromoApp')
    .service('notificationService', ['apiService', 'authService', '$interval', function(apiService, authService, $interval) {
        const className = 'Notification';
        let token = authService.get('token');
        let notification = this;

        this.start = () => {
            notification.getNotifications({}, authService.getSession())
                .then(r => {
                    return r;
                });
        };

        //adding notifications in to the table
        this.createNotification = () => {
            return apiService.getSession().then((res) => {
                return res;
            });

        };

        this.getNotifications = () => {
            return apiService.getNotification(token).then((res) => {
                return res;
            });
        };

    }]);