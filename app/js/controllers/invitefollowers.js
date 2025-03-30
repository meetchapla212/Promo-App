angular.module('PromoApp')
    .controller('inviteFollowersController', ['$scope', 'followUser', 'awsService', 'Utils', function($scope, followUser, awsService, Utils) {
        $scope.forms = {};
        $scope.followers = [];
        $scope.selectedFollowers = 0;

        $scope.cancel = function() {
            this.$close();
        };

        $scope.calculateFollowers = function() {
            $scope.selectedFollowers = $scope.followers.filter(f => f.selected).length;
        };

        $scope.clearAll = function() {
            if ($scope.followers) {
                for (let f of $scope.followers) {
                    f.selected = false;
                }
                $scope.calculateFollowers();
            }
        };
        // This function is called on init
        $scope.init = function() {
            followUser.followers().then(res => {
                    if (res && 'data' in res && 'data' in res.data) {
                        for (let element of res.data.data) {
                            let follower = {
                                "user_id": element.user_id,
                                "email": element.email,
                                'first_name': element.first_name,
                                'last_name': element.last_name,
                                "profile_pic": element.profile_pic,
                                "type": element.type,
                            };
                            $scope.followers.push(follower);
                        }
                    }
                    Utils.applyChanges($scope);
                })
                .catch(err => { console.log(err); });
        };

        $scope.save = function() {
            let selectedFollowers = $scope.followers.filter(f => f.selected);
            for (let s of selectedFollowers) {
                s.type = 'follower';
                delete s.selected;
            }
            this.$close(selectedFollowers);
        };

        $scope.init();
    }]);