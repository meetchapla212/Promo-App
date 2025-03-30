angular.module('PromoApp').controller('UserFollowController', ['$scope', 'userService', 'Utils', '$routeParams', 'followUser', 'authService', '$cookies', '$location', 'apiService', function($scope, userService, Utils, $routeParams, followUser, authService, $cookies, $location, apiService) {
    $scope.checkFollow = false;
    $scope.user = null;
    $scope.following = [];
    $scope.followers = [];
    $scope.selectedTab = 0;
    $scope.followerId = '';
    $scope.memberZoneList = '';
    $scope.currentTab = true;
    $scope.zoneId = 0;
    let userSession = authService.get('session');

    $scope.$watch('checkFollow', function(oldValue, newValue) {
        if (oldValue != null && newValue != null && oldValue != newValue) {
            let promises = [];
            promises.push($scope.loadFollowers());
            promises.push($scope.loadFollowing());
            Promise.all(promises)
                .then(() => {
                    Utils.applyChanges($scope);
                });
        }
    });
    $scope.goToPage = function(page, userid) {
        if (userid) {
            page += userid;
        }
        location.href = page;
    };

    $scope.loadFollowers = function() {
        return followUser.followersById($scope.followerId, $scope.zoneId).then(res => {
            $scope.followers = [];
            if (typeof res !== 'undefined') {
                $scope.followers = res;
            }
            return Promise.resolve(res);
        }).catch(err => {
            console.log('follow errro ::', err);
        });
    };

    $scope.loadFollowing = function() {
        return followUser.followingById($scope.followerId, $scope.zoneId).then(res => {
            $scope.following = [];
            if (typeof res !== 'undefined') {
                $scope.following = res;
            }
            return Promise.resolve(res);
        }).catch(err => {
            console.log('follow errro ::', err);
        });
    };

    $scope.clearSearch = function () {
        $scope.searchText = '';
        $scope.resetLocation = true;
        Utils.applyChanges($scope);
    };

    const selectTab = function() {
        let queryStringObject = $location.search();
        if ('tab' in queryStringObject && queryStringObject.tab && queryStringObject.tab === '1') {
            $scope.selectedTab = 1;
            $scope.currentTab = false;
        }
    };

    $scope.memberZoneListData = () => {
        $scope.loading = true;
        let token = authService.get('token');
        apiService.getMemberZoneList(token).then((response) => {
            if (response.data.success) {
                $scope.memberZoneList = response.data.data;
            }
        }).catch((err) => {
            console.log("Get Member Zone List", err);
        }).finally(() => {
            $scope.loading = false;
        });
    };

    $scope.searchUsersByZone = (zoneId) => {
        $scope.zoneId = zoneId;
        $scope.init();
    };

    $scope.init = function() {
        $scope.loggedInUser = authService.getUser();
        if ($routeParams && 'userID' in $routeParams && $routeParams.userID) {
            $scope.loading = true;
            $scope.followerId = $routeParams.userID;
            try {
                $scope.user = JSON.parse(authService.get('user'));
                $scope.checkFollow = !$scope.checkFollow;
                let promises = [];
                promises.push($scope.loadFollowers());
                promises.push($scope.loadFollowing());
                return Promise.all(promises);
            } catch (err) {
                console.log(err);
            } finally {
                $scope.loading = false;
                selectTab();
                $scope.memberZoneListData();
                Utils.applyChanges($scope);
            }
        }
    };

    $scope.init();

}]);