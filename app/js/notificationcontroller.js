angular.module('PromoApp')
    .controller('NotificationController', ['$scope', 'notificationService', 'authService', 'userService', '$filter', 'config', 'metaTagsService',
        function($scope, notificationService, authService, userService, $filter, config, metaTagsService) {
            let user = authService.getUser();
            let session = authService.getSession();
            $scope.notifications = [];
            $scope.notifiedBy = {};
            $scope.errorMessage = '';
            $scope.loading = true;
            $scope.skip = 0;
            $scope.loadMoreNotifications = true;
            $scope.notfPerPage = 10;
            $scope.n = [];
            $scope.pagination = {
                currentPage: 1,
                numPerPage: 30,
                maxSize: 5
            };
            $scope.paginationMobile = {
                currentPage: 1,
                numPerPage: 15,
                maxSize: 2
            };
            metaTagsService.setDefaultTags({
                'title': "The Promo App | Notification | Social Event Management Network",
                'Description': 'The Promo App makes social event networking and event management easier than ever before. Find events, buy and sell tickets, promote events, and more.',
                'Keywords': 'The Promo App, event management',
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
            $scope.getnotification = () => {
                if ($scope.loadMoreNotifications) {
                    //need to remove above line when make dynmic.
                    notificationService.getNotifications()
                        .then(notf => {
                            if (notf && notf.length == $scope.notfPerPage) {
                                $scope.skip = $scope.skip + $scope.notfPerPage;
                            } else {
                                $scope.loadMoreNotifications = false;
                            }
                            if (notf.data.success == false) {
                                $scope.errorMessage = "No notifications found";
                                $scope.loading = false;
                                return Promise.resolve(null);
                            } else {
                                $scope.errorMessage = '';
                                $scope.notifications = notf.data.data;

                                // $scope.notifications.forEach((notification) => {
                                //     notification.url = '/userprofile/' + notification._user_id;
                                //     $scope.n.push(notification);
                                // });
                                // let createdby = [];
                                // $scope.notifications.forEach(function(element) {
                                //     if (!(element.notify_user_id in createdby)) {
                                //         createdby.push(element.notify_user_id);
                                //     }
                                // }, this);
                                $scope.loading = false;
                                // return createdby;
                            }
                        }).catch(err => {
                            console.log("err", err);
                        });
                }
            };
            $scope.getnotification();
        }
    ]);