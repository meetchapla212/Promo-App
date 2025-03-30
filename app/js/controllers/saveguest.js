angular.module('PromoApp')
    .controller('savedGuestModalController', ['$scope', function($scope) {

        $scope.forms = {};
        $scope.csvGuestList = [];
        $scope.csvGroupNameList = [];
        $scope.cancel = function() {
            this.$close();
        };

        $scope.selectAll = function(filter, groupList, type = null) {
            let guests = [];
            if (filter) {
                guests = $scope.allGuest.filter(g => g.type === filter);
            } else {
                guests = $scope.allGuest;
            }
            for (let guest of guests) {
                if (groupList && !type) {
                    if (guest._group_id === groupList.group_id) {
                        guest.selected = groupList.selected;
                    }
                } else {
                    guest.selected = true;
                }
            }
            if (type == 'array') {
                for (let group of $scope.groupList) {
                    group.selected = !group.selected;
                    for (let guest of guests) {
                        if (group) {
                            if (guest._group_id === group.group_id) {
                                guest.selected = group.selected;
                            }
                        } else {
                            guest.selected = true;
                        }
                    }
                }
            }
        };

        $scope.getSelectedGuestCount = function() {
            return $scope.allGuest.filter(g => g.selected).length;
        };

        $scope.getGuestCount = function(filter) {
            return $scope.allGuest.filter(g => g.type === filter).length;
        };

        $scope.save = function() {
            let selectedFollowers = $scope.allGuest.filter(f => f.selected);
            this.$close(selectedFollowers);
        };

        $scope.initModal = function() {
            $scope.groupList = $scope.guests.group_list;
            $scope.allGuest = $scope.guests.guest_list;
            $scope.followerList = $scope.allGuest.filter(g => g.type === 'follower');
            $scope.csvList = $scope.allGuest.filter(g => g.type === 'csv');
            $scope.mailList = $scope.allGuest.filter(g => g.type === 'mail');
        };

        $scope.initModal();
    }]);