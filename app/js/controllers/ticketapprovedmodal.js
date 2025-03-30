angular.module('PromoApp')
    .controller('TicketApproveModalController', ['$scope', 'authService', 'eventsService', '$uibModal', 'Utils', 'config', 'userService', '$location', 'awsService', function($scope, authService, eventsService, $uibModal, Utils, config, userService, $location, awsService) {
        const states = {
            "pending": {
                id: 'pending',
                title: 'Approve Pending Ticket',
                status: 'Pending',
                showApproveButton: true,
                approvedOn: null
            },
            "approved": {
                id: 'approved',
                title: 'Tickets Approved on',
                status: 'Approved',
                showApproveButton: false,
                approvedOn: null
            }
        };

        $scope.selectedState = states.pending;
        $scope.user = authService.getUser();
        let token = authService.get('token');
        $scope.loading = false;

        $scope.close = function() {
            this.$close();
        };

        $scope.approve = function(id) {
            $scope.loading = true;
            awsService.approveTicket(id, token)
                .then((resp) => {
                    console.log("resp", resp);
                    $scope.loading = true;
                    this.$close(id);
                })
                .catch((err) => {
                    //console.log(err);
                    $scope.loading = false;
                    Utils.showError($scope, "Unable to proceed. Please contact administrator.");
                });
        };

        $scope.init = function() {
            if ($scope.ticket.event_status == 'pending') {
                $scope.selectedState = states.pending;
                $scope.selectedState.approvedOn = null;
            } else {
                $scope.selectedState = states.approved;
                $scope.selectedState.approvedOn = $scope.ticket.approved_on;
            }
        };

        $scope.init();
    }]);