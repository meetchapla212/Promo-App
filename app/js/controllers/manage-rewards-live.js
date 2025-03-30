angular.module('PromoApp')
    .controller('ManageRewardsLiveController', ['$scope', 'config', 'awsService', 'authService', 'eventsService', 'Utils', 'metaTagsService', '$window', '$cookies', function($scope, config, awsService, authService, eventsService, Utils, metaTagsService, $window, $cookies) {

        $scope.morevertopt = [];
        $scope.toggle = function(id) {
            $scope.morevertopt[id] = !$scope.morevertopt[id];
        };

        $scope.numPerPage = 10;
        $scope.maxSize = 5;
        $scope.liveReward = {};
        $scope.completedReward = {};
        $scope.archivedReward = {};
        $scope.draftReaward = {};
        $scope.newtoday_date = moment.utc();
        $scope.myRewards = [];
        $scope.getMyRewards = function() {
            $scope.loading = true;
            $scope.morevertopt = [];
            let liveRewardApi = eventsService.getRewardByStatus({ "status": "live", "limit": 100, "page": 1, }).then((response) => {
                $scope.liveReward = response;
                $scope.myRewards = response;
            }).catch(err => {
                $scope.loading = false;
                console.log(err);
            }).finally(() => {
                $scope.loading = false;
            });

            let completedRewardApi = eventsService.getRewardByStatus({ "status": "completed", "limit": 100, "page": 1, }).then((response) => {
                $scope.completedReward = response;
                $scope.myRewards = response;
            }).catch(err => {
                $scope.loading = false;
                console.log(err);
            }).finally(() => {
                $scope.loading = false;
            });

            let draftReawardApi = eventsService.getRewardByStatus({ "status": "draft", "limit": 100, "page": 1, }).then((response) => {
                for (let res of response) {
                    let requireDate = moment($scope.newtoday_date).utc().format("DD-MM-YYYY hh:mm");
                    let selectedDate = moment(res.event_details.start_date_time).utc().format("DD-MM-YYYY hh:mm");
                    if (requireDate < selectedDate) {
                        res.addPromotionDisabled = true;
                    } else {
                        res.addPromotionDisabled = false;
                    }
                }
                $scope.draftReaward = response;
                $scope.myRewards = response;
            }).catch(err => {
                $scope.loading = false;
                Utils.showError($scope, err.data.message, 'Oops!!');
            }).finally(() => {
                $scope.loading = false;
            });

            let archivedRewardApi = eventsService.getRewardByStatus({ "status": "archived", "limit": 100, "page": 1, }).then((response) => {
                $scope.archivedReward = response;
                $scope.myRewards = response;
            }).catch(err => {
                $scope.loading = false;
                Utils.showError($scope, err.data.message, 'Oops!!');
            }).finally(() => {
                $scope.loading = false;
            });

            liveRewardApi.then(completedRewardApi).then(archivedRewardApi).then(draftReawardApi).catch(err => {
                let notify = {
                    type: 'error',
                    title: 'OOPS!!',
                    content: "Please check to make sure your username/email and password both are correct.",
                    timeout: 5000 //time in ms
                };
                $scope.$emit('notify', notify);
                Utils.applyChanges($scope);
            }).finally(() => {
                $scope.loading = false;
            });
        };

        $scope.publishReward = function(draftReaward) {
            //console.log("Loading True");
            $scope.loading = true;
            let token = authService.get('token');
            let promise = null;
            $scope.draftReaward.forEach(function(element) {
                if (element.reward_id === draftReaward) {
                    element.is_draft = false;
                    element.event_id = element._event_id;
                    delete element.event_details;
                    delete element.reward_id;
                    delete element._user_id;
                    delete element._event_id;
                    delete element.date_created;
                    delete element.date_modified;
                    delete element.is_deleted;
                    delete element.status;
                    delete element.active_people;
                    delete element.people_eligible;
                    delete element.people_won;
                    delete element.is_share;
                    let data = element;
                    promise = awsService.put(`/reward-update/${draftReaward}`, data, token).then(() => {
                        $scope.loading = false;
                    }).catch(err => {
                        Utils.showError($scope, err.data.message, 'Oops!!');
                        $scope.loading = false;
                        Utils.applyChanges($scope);
                    }).finally(() => {
                        $scope.loading = false;
                    });
                }
            });
            setTimeout(() => {
                $scope.getMyRewards();
            }, 500);
        };
        $scope.b_reward_id = '';
        $scope.stopReward = function(draftReaward) {

            if ($scope.b_reward_id == draftReaward) {
                return;
            }
            $scope.b_reward_id = draftReaward;
            let token = authService.get('token');
            let promise = null;
            $scope.liveReward.forEach(function(element) {
                if (element.reward_id === draftReaward) {
                    element.is_draft = false;
                    element.status = "inactive";
                    element.event_id = element._event_id;
                    delete element.event_details;
                    delete element.reward_id;
                    delete element._user_id;
                    delete element._event_id;
                    delete element.date_created;
                    delete element.date_modified;
                    delete element.is_deleted;
                    delete element.active_people;
                    delete element.people_eligible;
                    delete element.is_share;
                    delete element.people_won;
                    let data = element;
                    promise = awsService.put(`/reward-update/${draftReaward}`, data, token).then(() => {
                        $scope.loading = false;
                        setTimeout(() => {
                            $scope.getMyRewards();
                        }, 500);
                    }).catch(err => {
                        Utils.showError($scope, err.data.message, 'Oops!!');
                        $scope.loading = false;
                        Utils.applyChanges($scope);
                    }).finally(() => {
                        $scope.loading = false;
                    });
                }
            });

        };

        $scope.restartReward = function(draftReaward) {

            let token = authService.get('token');
            let promise = null;
            $scope.archivedReward.forEach(function(element) {
                if (element.reward_id === draftReaward) {
                    element.is_draft = false;
                    element.status = "active";
                    element.event_id = element._event_id;
                    delete element.event_details;
                    delete element.reward_id;
                    delete element._user_id;
                    delete element._event_id;
                    delete element.date_created;
                    delete element.date_modified;
                    delete element.is_deleted;
                    delete element.active_people;
                    delete element.people_eligible;
                    delete element.is_share;
                    delete element.people_won;
                    let data = element;
                    promise = awsService.put(`/reward-update/${draftReaward}`, data, token).then(() => {
                        $scope.loading = true;
                    }).catch(err => {
                        Utils.showError($scope, err.data.message, 'Oops!!');
                        $scope.loading = false;
                        Utils.applyChanges($scope);
                    }).finally(() => {
                        $window.location.reload();
                        $scope.loading = false;
                    });
                }
            });
            setTimeout(() => {
                $scope.getMyRewards();
            }, 500);
        };

        $scope.setGuidance = () => {
            if ($scope.promotionGuidance == undefined) {
                $cookies.put('promotionGuidance', true);
            }
            window.location.href = '/createreward/add';
        };

        const init = () => {
            $scope.isMobile = window.matchMedia("only screen and (max-width: 1024px)");
            $scope.getMyRewards();
            localStorage.removeItem('currentPath');
            if ($scope.isMobile.matches) {
                $scope.maxSize = 3;
            }
            $scope.promotionGuidance = $cookies.get('promotionGuidance');
            metaTagsService.setDefaultTags({
                'title': "The Promo App | Event Promotion",
                'description': "The Promo App makes event promotion affordable for everyone. With no ticket processing costs and low sponsorship fees, you can get more attendees easily.",
                'keywords': 'The Promo App, event promotion',
                // OpenGraph
                'og:site_name': 'thepromoapp',
                'og:title': 'The Best Events',
                'og:description': 'Bringing you and your friends together in real life at incredible events',
                'og:image': '/img/event-promo-app.jpeg',
                'og:url': 'https://thepromoapp.com',
                // Twitter
                'twitter:title': 'Thousands of Events',
                'twitter:description': "Have a social life again - bring your friends",
                'twitter:image': '/img/event-promo-app.jpeg',
                'twitter:card': '/img/event-promo-app.jpeg',
            });
        };

        init();
    }]);