angular.module('PromoApp')
    .service('followUser', ['qbService', 'apiService', 'authService', function(qbService, apiService, authService) {
        let className = 'FollowUsers';
        this.following = (userId, session) => {
            let token = authService.get('token');
            return apiService.getFollowingList(token).then((response) => {
                return response;
            });
        };

        this.followers = () => {
            let token = authService.get('token');
            return apiService.getFollowerList(token).then((response) => {
                return response;
            });
        };

        this.followersById = (userId, zoneId) => {
            let token = authService.get('token');
            return apiService.getFollowerListById(userId, token, zoneId).then((response) => {
                return response.data;
            });
        };

        this.followingById = (userId, zoneId) => {
            let token = authService.get('token');
            return apiService.getFollowingListById(userId, token, zoneId).then((response) => {
                return response.data;
            });
        };

        //adding following user in to the table
        this.addFollowUsers = (params, session) => {
            let token = authService.get('token');
            return apiService.followUser(token, params).then((response) => {
                return response;
            });
        };
        this.unFollowUsers = (params, session) => {
            let token = authService.get('token');
            return apiService.unFollowUsers(token, params).then((response) => {
                return response;
            });
        };
        this.getCurrentUserFollowingUser = (session, followDetails) => {

            let token = authService.get('token');
            return apiService.getFollowingList(token).then((response) => {
                let followingUserList = [];
                if (response && 'data' in response && 'data' in response.data) {
                    for (let i in response.data.data) {
                        if (response.data.data[i].user_id == followDetails.toFollowUser) {
                            followingUserList.push(response.data.data[i]);
                        }
                    }

                }
                return followingUserList;
            });
        };
    }]);