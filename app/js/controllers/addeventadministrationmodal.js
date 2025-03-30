angular.module('PromoApp')
    .controller('addEventAdministrationModalController', ['$scope', 'authService', 'awsService', 'eventsService', '$uibModal', 'Utils', 'config', 'userService', '$window', function($scope, authService, awsService, eventsService, $uibModal, Utils, config, userService, $window) {
        const states = {
            "view": {
                id: 'view',
                title: 'View Event Administrator',
                buttonText: ''
            },
            "add": {
                id: 'add',
                title: 'Add Event Administrator',
                buttonText: 'Add Admin'
            },
            "change": {
                id: 'change',
                title: 'Change Event Administrator',
                buttonText: 'Change Admin'
            }
        };
        $scope.user = null;
        $scope.userSession = null;
        $scope.displayAdmins = [];
        $scope.selectedAdmins = [];
        let adminId = [];
        $scope.adminList = "";
        $scope.loading = false;
        $scope.ticked = true;
        $scope.isCurrentUserEventAdmin = false;
        $scope.addAdminLang = {
            selectAll: "Tick all",
            selectNone: "Select none",
            reset: "Undo all",
            search: "Type here to search...",
            nothingSelected: "Select Admin" //default-label is deprecated and replaced with this.
        };

        $scope.close = function() {
            this.$close($scope.event.event_admin);
        };

        /*
         **
         ** Fetch user's friends
         **        
         */
        $scope.tickAdminFriends = function(response) {
            let adminEmails = (JSON.parse($scope.event.event_admin)).map((admin) => { return admin.email; });
            if (adminEmails.length > 0) {
                angular.forEach(response, function(elem) {
                    if (adminEmails.includes(elem.email)) {
                        adminEmails.splice(adminEmails.indexOf(elem.email), 1);
                    }
                });
            }
            //after splice
            if (adminEmails.length > 0) {
                //if you have lost a following, but the person is still event_admin
                return Promise.resolve(response);
            } else {
                return Promise.resolve(response);
            }
        };

        $scope.setAdminFriends = function() {
            $scope.displayAdmins = [];
            let eventAdmin = '';
            if ($scope.event.event_admin != '[]') {
                adminId = (JSON.parse($scope.event.event_admin)).map((admin) => { return admin; });
                eventAdmin = $scope.event._user_id;
            }

            if ($scope.user && $scope.userSession) {
                $scope.loading = true;
                userService.getAllUsers()
                    .then(response => {
                        return $scope.tickAdminFriends(response.data);
                    })
                    .then(res => {
                        angular.forEach(res.data, function(element) {

                            if (element.first_name) {
                                element.username = element.first_name + ' ' + element.last_name;
                            }

                            if (element.profile_pic) {
                                element.iconImage = `<img src=${element.profile_pic || '../img/defaultProfilePic.png'} alt='image' />`;
                            } else {
                                element.iconImage = `<img src=${'../img/defaultProfilePic.png'} alt='image' />`;
                            }
                            angular.forEach(adminId, function(valueEle) {
                                if (element.user_id === valueEle.user_id) {
                                    element.ticked = true;
                                }
                            });
                            if (element.user_id === $scope.user.id || (element.user_id === eventAdmin)) {
                                element.disabled = true;
                                element.ticked = false;
                            }
                            $scope.displayAdmins.push(JSON.parse(JSON.stringify(element)));
                        });
                        $scope.getEventAdminsList();
                        $scope.loading = false;
                        Utils.applyChanges($scope);
                    })
                    .catch(err => {
                        $scope.loading = false;
                        console.log('friends list error :: ', err);
                    });
            }
        };

        $scope.getEventAdminsList = () => {
            $scope.adminList = '';
            $scope.state = false;
            let event_admin_names = [];
            $scope.event_admin = JSON.parse($scope.event.event_admin);
            if ($scope.event_admin && ($scope.event_admin.length > 0)) {
                for (let admin of $scope.event_admin) {
                    //because using filter gives an error while referencing outer var
                    for (let dispAdmin of $scope.displayAdmins) {
                        if (dispAdmin.email === admin.email) {
                            event_admin_names.push(dispAdmin.email);
                            $scope.state = true;
                        }
                    }
                }
                if ($scope.state === true) {
                    $scope.adminList = event_admin_names.join(" , ");
                } else {
                    $scope.adminList = $scope.event_admin[0].email;
                }
            }
        };

        $scope.constructPermissionsForEvent = function() {
            let set = new Set();
            set.add(parseInt(config.PROMO_ADMIN_ID));
            set.add($scope.user.user_id);
            if ("user_id" in $scope.event) {
                set.add($scope.event.user_id);
            }
            if ("claimed_by" in $scope.event) {
                set.add(parseInt($scope.event.claimed_by));
            }

            let adminIds = (JSON.parse(JSON.stringify($scope.selectedAdmins))).map((admin) => { return admin.id; });
            if (adminIds.length > 0) {
                for (let admin of adminIds) {
                    set.add(admin);
                }
            }
            return Array.from(set);
        };

        $scope.checkUserID = function(userId, searchArray) {
            for (let sa of searchArray) {
                if (sa.user_id == userId) {
                    return true;
                }
            }
            return false;
        };

        $scope.addAndMoveToChangeState = function() {

            let adminIds = (JSON.parse(JSON.stringify($scope.selectedAdmins))).map((admin) => { return admin.user_id; });
            console.log(adminIds);
            let token = authService.get('token');
            if ($scope.isCurrentUserEventAdmin == true && !adminIds.includes($scope.user.user_id)) {
                Utils.showError($scope, "You cannot remove yourself, from admin list");
            } else {
                $scope.loading = true;
                let eventId = $scope.event.event_id;
                $scope.newAddedAdmin = [];
                for (let newAdmin of $scope.selectedAdmins) {
                    if (!$scope.checkUserID(newAdmin.user_id, $scope.event.event_admin)) {
                        $scope.newAddedAdmin.push(newAdmin.user_id);
                    }
                }

                let data = {
                    "existingUsers": $scope.newAddedAdmin,
                    "newUsers": []
                };

                eventsService.inviteAdministrator(data, eventId).then((response) => {
                    if (response.success) {
                        $scope.loading = false;
                        let notify = {
                            type: 'success',
                            title: 'Success',
                            content: "Event administrator updated successully.",
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        setTimeout(function() {
                            $window.location.reload();
                        }, 1000);
                    } else {
                        $scope.loading = false;
                        $scope.close();
                    }
                }).catch(err => {
                    let content = err.message;
                    let notify = {
                        type: 'error',
                        title: 'Oops!!',
                        content: content,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                });
            }
        };

        $scope.moveToChangeState = function() {
            $scope.selectedState = states.change;
            $scope.setAdminFriends();
        };

        $scope.checkIfCurrentIsUserEventAdmin = function() {
            $scope.isCurrentUserEventAdmin = false;
            if ('event_admin' in $scope.event && $scope.event.event_admin != '') {
                let adminEmails = (JSON.parse($scope.event.event_admin)).map((admin) => { return admin.email; });
                if (adminEmails.includes($scope.user.email)) {
                    $scope.isCurrentUserEventAdmin = true;
                }
            }

        };

        $scope.init = function() {
            $scope.user = authService.getUser();
            $scope.userSession = authService.getSession();
            $scope.checkIfCurrentIsUserEventAdmin();
            $scope.selectedState = states[$scope.incomingState];
            $scope.setAdminFriends();
        };

        $scope.init();
    }]);