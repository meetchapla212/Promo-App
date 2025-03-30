angular.module('PromoApp')
    .controller('descriptionModalController', ['$scope', '$uibModal', 'locationService', 'eventsService', '$http', 'authService', 'phqservice', 'awsService', '$window', 'config', '$route', '$rootScope', 'Utils', 'qbService', 'followUser', function ($scope, $uibModal, locationService, eventsService, $http, authService, phqservice, awsService, $window, config, $route, $rootScope, Utils, qbService, followUser) {
       var edc = this;
       $scope.event_details_data=[];
        $scope.user = authService.getUser();
        $scope.message = "";
        $scope.forMacOnly = false;
        $scope.closeDescriptionModal = function () {
            this.$dismiss('close');
        };
         $scope.eventOptions = [
            {
                key: '-1',
                value: 'Select',
                url: '../img/checkmark.png'
            },
            {
                key: 'Going',
                value: 'Going',
                url: '../img/checkmark.png'
            },
            {
                key: 'Not Going',
                value: 'Not Going',
                url: '../img/checkmark.png'
            },
            {
                key: 'May be',
                value: 'May Be',
                url: '../img/checkmark.png'
            }
        ];
        $scope.eventDetailsData.eventAttending = '-1';


        $scope.openClaimEvent = function (event) {
            //console.log('Inside openClaimEvent'+JSON.stringify(event, null,4));
            if (authService.getSession()) {
                $scope.closeDescriptionModal();
                window.scrollTo(0, 0);
                $rootScope.$broadcast("claimEventClicked", event);
            } else {
               $scope.closeDescriptionModal();
               $window.location.href = Utils.getClaimUrl(event.id);
               $scope.$emit('openLoginModalForNonLoggedInUser');

            }
        };

       const getCurrentURL = function (event_details) {
            let base_url = window.location.origin;
            let id = event_details.id;
            let share_url = base_url + "/?share=" + id;
            $scope.scopeURL = share_url;
            return share_url;
        };

        edc.openDescEmail = function (size, parentSelector) {
            let user = authService.getUser();
            let session = authService.getSession();
            var openDescEmailScope = $scope.$new(true);
            if (user && session)
            {
                openDescEmailScope.name=user.full_name;
                openDescEmailScope.emailFrom =user.email;
            }
            openDescEmailScope.eventDetailsData = $scope.eventDetailsData;
            openDescEmailScope.scopeURL = $scope.scopeURL;
            //console.log(JSON.stringify(openDescEmailScope.eventDetailsData, null, 4));
            let parentElem = parentSelector ?
                angular.element($document[0].querySelector('.modal-demo ' + parentSelector)) : undefined;
            let modalInstance = $uibModal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: '../../partials/emailModal.html',
                controller: 'emailModalController',
                controllerAs: 'edc',
                scope: openDescEmailScope

            });

            modalInstance.result.then(function (selectedItem) {
                edc.selected = selectedItem;
            }, function () {
                //console.log('Modal dismissed at: ' + new Date());
            });
        };


        $scope.emailDescModalData = function (event_details) {
            $scope.selectedEvent = event_details;
            getCurrentURL(event_details);
            edc.openDescEmail();
        };
         $scope.userEventAttending = () => {
            console.log('_________----', $scope.eventDetailsData.eventAttending);
            let user = authService.getUser();
            let session = authService.getSession();
            if (user && session) {
            //console.log("2"+JSON.stringify($scope.eventDetailsData.attending, null, 4));
                if ($scope.eventDetailsData.attending != null) {
                    console.log('Existing user attendencess');
                    let data = {
                        type_going: $scope.eventDetailsData.eventAttending
                    };
                    $scope.refreshGoingCount = false;
                    eventsService.updateUserEventAttendingStatus($scope.eventDetailsData.attending._id, data, session).then(res => {
                        $scope.refreshGoingCount = true;
                        console.log('updted going::', res);
                        $scope.$digest();
                    });
                } else {
                    let data = {
                        blobID: user.blob_id,
                        type_going: $scope.eventDetailsData.eventAttending,
                        completeUser: JSON.stringify(user),
                        user_id: user.id,
                        name: user.login,
                        _parent_id: $scope.eventDetailsData.id,
                        eventDetails: JSON.stringify($scope.eventDetailsData)
                    };
                    $scope.refreshGoingCount = false;
                    eventsService.createUserEventAttendingStatus(data, session).then(res => {
                        //console.log('added going::', res);
                        $scope.eventDetailsData.attending = res;
                        $scope.refreshGoingCount = true;
                        $scope.$digest();
                    });
                }
                let notify_text = '';
                let send_to_friends = false;
                let notified_user = [];
                // Check if user has set new status as going send notification
                if ($scope.eventDetailsData.eventAttending == 'Going') {
                    notify_text = user.full_name + " " + " is going to" + " " + $scope.eventDetailsData.event_name;
                    send_to_friends = true;
                } else if ($scope.eventDetailsData.eventAttending == 'May be') {
                    notify_text = user.full_name + " " + " may be going to" + " " + $scope.eventDetailsData.event_name;
                    send_to_friends = true;
                } else {
                    notify_text = user.full_name + " " + " is not going to" + " " + $scope.eventDetailsData.event_name;
                }
                let contentForNotify = '';
                if ($scope.eventDetailsDataeventAttending == 'May be') {
                    contentForNotify = 'You may be going to ' + $scope.eventDetailsData.title;
                } else {
                    contentForNotify = "You are " + $scope.eventDetailsData.eventAttending + " to " + $scope.eventDetailsData.title;
                }
                let notify = {
                    type: 'success',
                    title: 'Success',
                    content: contentForNotify,
                    timeout: 5000 //time in ms
                };
                $scope.$emit('notify', notify);

                let notificationDataList = [];
                // Send notification to event creator
                let notificationData = {
                    notify_text: notify_text,
                    _parent_id: $scope.eventDetailsData._id,
                    notify_userId: $scope.eventDetailsData.user_id,
                    notif_type: 'EventUserAttendance'
                };
                notified_user.push($scope.eventDetailsData.user_id);
                notificationDataList.push(notificationData);

                // Send notification to event admins
                // Check if event admins
                if ($scope.eventDetailsData.event_admin) {
                    let event_admins = JSON.parse($scope.eventDetailsData.event_admin);
                    if (event_admins && event_admins.length > 0) {
                        event_admins.forEach((admin) => {
                            // Send notification to event creator
                            let notificationData = {
                                notify_text: notify_text,
                                _parent_id: $scope.eventDetailsData._id,
                                notify_userId: admin.id,
                                notif_type: 'EventUserAttendance'
                            };
                            if (notified_user.indexOf(admin.followUser_id) == -1) {
                                notificationDataList.push(notificationData);
                                notified_user.push(admin.followUser_id);
                            }
                        });
                    }
                }

                // Send notification to event friends
                // Check if event friends
                if (send_to_friends && $scope.eventDetailsData.invite_friends) {
                    let invite_friends = JSON.parse($scope.eventDetailsData.invite_friends);
                    if (invite_friends && invite_friends.length > 0) {
                        invite_friends.forEach((friend) => {
                            // Send notification to event creator
                            let notificationData = {
                                notify_text: notify_text,
                                _parent_id: $scope.eventDetailsData._id,
                                notify_userId: friend.followUser_id,
                                notif_type: 'EventUserAttendance'
                            };
                            if (notified_user.indexOf(friend.followUser_id) == -1) {
                                notificationDataList.push(notificationData);
                                notified_user.push(friend.followUser_id);
                            }
                        });
                    }
                }
                // Send notification to user's followers
                // Check if event friends
                if (send_to_friends) {
                    let session = authService.getSession();
                    followUser.followers(user.id, session).then(res => {
                        //console.log('followers result22::', res);
                        res.forEach((uid) => {
                            // Send notification to event creator
                            let notificationData = {
                                notify_text: notify_text,
                                _parent_id: $scope.eventDetailsData._id,
                                notify_userId: uid.user_id,
                                notif_type: 'EventUserAttendance'
                            };
                            if (notified_user.indexOf(uid.user_id) == -1) {
                                notificationDataList.push(notificationData);
                                notified_user.push(uid.user_id);
                            }
                        });
                    }).catch(err => {
                        console.log('follow errro ::', err);
                        element.text(0);
                    });
                }

                if (notificationDataList && notificationDataList.length > 0) {
                    qbService.batchUpload('Notification', notificationDataList)
                        .then(() => {
                            console.log('notification done');
                        });
                }
            } else {
                // Redirect to login page modal
                $scope.$emit('openLoginModalForNonLoggedInUser');
                applyChanges();
            }
         };

         // Check if user is going to the event
        $scope.getUserAttending = () => {
            let user = authService.getUser();
            let session = authService.getSession();
            if (user && session) {
                return eventsService.getEventAttendingByUserAndEvent(user.user_id, $scope.eventDetailsData.id, session)
                    .then((res) => {
                        if (res) {
                            $scope.eventDetailsData.attending = res;
                            $scope.eventDetailsData.eventAttending = res.type_going;
                            // remove select option
                            $scope.eventOptions.splice(0, 1);
                        } else if (user.id == $scope.eventDetailsData.user_id) {
                            // i.e user is creator of the event then show Going
                            $scope.eventDetailsData.eventAttending = 'Going';
                        }
                        //  applyChanges();
                    });
            }
        };
         const applyChanges = () => {
            //console.log("Inside applyChanges eventoverviewcontroller");
            if (!$scope.$$phase) {
                $scope.$digest();
            }
          };

        let styleForMacOnly = () =>{
            if(navigator.userAgent.indexOf('Mac OS X')!=-1){
                $("body").addClass("mac");
                $scope.forMacOnly = true;
            }

        };
        styleForMacOnly();
        $scope.getUserAttending();

    }]);