angular.module('PromoApp')
    .controller('ViewTicketController', ['$scope', function($scope) {
        let ctrl = this;

        this.$onInit = function() {
            if (ctrl.event) {
                ctrl.event.closed = false;
            }
            if (ctrl.event && ctrl.event.end_date_time_ms && ctrl.event.end_date_time_ms < moment.utc().valueOf()) {
                ctrl.event.closed = true;
            }
        };

    }]);