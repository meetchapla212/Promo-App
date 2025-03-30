angular.module('PromoApp')
    .directive('paUserImg', ['qbService', 'authService', function(qbService, authService) {

        function link(scope, element, attrs) {
            var userId;
            var default_url = '../img/defaultProfilePic.png';

            scope.$watch(attrs.paUserImg, function(value) {

                let user = authService.getUser();
                if (user && "imgUrl" in user) {
                    attrs.$set('src', user.imgUrl);
                } else {
                    attrs.$set('src', default_url);
                }
            });

        }

        return {
            link: link
        };
    }])
    .directive('paEventImg', ['qbService', function(qbService) {

        function link(scope, element, attrs) {
            let default_url = '../img/unnamed.png';

            if (attrs.url) {
                // If it is pexel image we can auto adjust
                let imageURL = attrs.url;
                if (imageURL.includes('w=1700')) {
                    imageURL = imageURL.replace("w=1700", `w=${element.width()}`);
                    imageURL = imageURL.replace("h=627", `h=${element.height()}`);
                }
                attrs.$set('src', imageURL);
            } else {
                attrs.$set('src', default_url);
            }

        }

        return {
            scope: {
                paEventImg: '@'
            },
            link: link
        };
    }])
    .directive('paEventCategoryImg', ['config', function(config) {

        function link(scope, element, attrs) {
            /*let categoriesMap = config.CATEGORIES;
            if(scope.event){
                
                if(scope.event.isHighlighted){
                    let src =`img/${categoriesMap[scope.event.category].id}_highlight.svg`;
                    attrs.$set('src', src);
                }else{
                    let src =`img/${categoriesMap[scope.event.category].id}.svg`;
                    attrs.$set('src', src);
                }
            }*/
            if (scope.event) {

                if (scope.event.isHighlighted) {
                    let src = `img/${scope.event.category}_highlight.svg`;
                    attrs.$set('src', src);
                } else {
                    let src = `img/${scope.event.category}.svg`;
                    attrs.$set('src', src);
                }
            }
        }
        return {
            restrict: 'A',
            scope: {
                event: '=event',
            },
            link: link
        };
    }])
    .directive('paUserImgBlobId', ['qbService', function(qbService) {

        function link(scope, element, attrs) {
            var default_url = '../img/defaultProfilePic.png';

            scope.$watch(attrs.paUserImgBlobId, function(value) {
                blob_id = value;
                if (blob_id) {
                    qbService.getContentFileUrl(blob_id)
                        .then((url) => {
                            if (url) {
                                attrs.$set('src', url);
                            }
                        });
                } else {
                    attrs.$set('src', default_url);
                }
            });

        }

        return {
            link: link
        };
    }])
    .directive('paFollower', ['authService', 'followUser', function(authService, followUser) {

        function load(userId, element) {
            if (userId) {
                let session = authService.getSession();
                if (typeof userId === 'string') {
                    userId = parseInt(userId);
                }
                followUser.followers(userId, session).then(response => {
                    //console.log('followers result::', response);
                    let followers = 0;
                    if (response.status == 200) {
                        let data = response.data;
                        if (data.success) {
                            if ('data' in data) {
                                followers = data.data.length;
                            }
                        }
                    }

                    element.text(followers);

                }).catch(err => {
                    //console.log('follow errro ::', err);
                    element.text(0);
                });
            }
        }

        function link(scope, element, attrs) {
            //console.log('scope.checkFollow:',scope.checkFollow);
            scope.$watch(attrs.paFollower, function(userId) {
                load(userId, element);
            }, true);

            scope.$watch('checkFollow', function(newVal, oldVal) {
                //  all directive code here
                //console.log("Reloaded successfully......" + attrs.paFollower,newVal, oldVal);
                if (newVal != oldVal) {
                    load(attrs.paFollower, element);
                }
            }, true);
        }

        return {
            link: link
        };
    }])
    .directive('paFollowerById', ['authService', 'followUser', function(authService, followUser) {

        function load(userId, element) {
            if (userId) {
                let session = authService.getSession();
                if (typeof userId === 'string') {
                    userId = parseInt(userId);
                }
                followUser.followersById(userId).then(response => {
                    //console.log('followers result::', response);
                    let followers = 0;
                    followers = response.length;

                    element.text(followers);

                }).catch(err => {
                    //console.log('follow errro ::', err);
                    element.text(0);
                });
            }
        }

        function link(scope, element, attrs) {
            //console.log('scope.checkFollow:',scope.checkFollow);
            scope.$watch(attrs.paFollowerById, function(userId) {
                load(userId, element);
            }, true);

            scope.$watch('checkFollow', function(newVal, oldVal) {
                //  all directive code here
                //console.log("Reloaded successfully......" + attrs.paFollowerById,newVal, oldVal);
                if (newVal != oldVal) {
                    load(attrs.paFollowerById, element);
                }
            }, true);
        }

        return {
            link: link
        };
    }])
    .directive('paFollowing', ['authService', 'followUser', function(authService, followUser) {

        function load(userId, element) {

            if (userId) {
                let session = authService.getSession();
                let token = authService.get('token');
                if (typeof userId === 'string') {
                    userId = parseInt(userId);
                }
                followUser.following(userId, session).then(response => {
                    //console.log('following result::', response);
                    let following = 0;

                    if (response.status == 200) {
                        let data = response.data;
                        if (data.success) {
                            if ('data' in data) {
                                following = data.data.length;
                            }
                        }
                    }
                    element.text(following);
                }).catch(err => {
                    //console.log('follow errro ::', err);
                    element.text(0);
                });
            }
        }

        function link(scope, element, attrs) {
            //console.log('scope.checkFollow:',scope.checkFollow);
            scope.$watch(attrs.paFollowing, function(userId) {
                load(userId, element);

            }, true);

            scope.$watch('checkFollow', function(newVal, oldVal) {
                //  all directive code here
                //console.log("Reloaded successfully......" + attrs.paFollowing,newVal, oldVal);
                if (newVal != oldVal) {
                    load(attrs.paFollowing, element);
                }
            }, true);
        }

        return {
            link: link
        };
    }])
    .directive('paFollowingById', ['authService', 'followUser', function(authService, followUser) {

        function load(userId, element) {

            if (userId) {
                let session = authService.getSession();
                let token = authService.get('token');
                if (typeof userId === 'string') {
                    userId = parseInt(userId);
                }
                followUser.followingById(userId).then(response => {
                    //console.log('following result::', response);
                    let following = 0;

                    following = response.length;
                    element.text(following);
                }).catch(err => {
                    //console.log('follow errro ::', err);
                    element.text(0);
                });
            }
        }

        function link(scope, element, attrs) {
            //console.log('scope.checkFollow:',scope.checkFollow);
            scope.$watch(attrs.paFollowingById, function(userId) {
                load(userId, element);

            }, true);

            scope.$watch('checkFollow', function(newVal, oldVal) {
                //  all directive code here
                //console.log("Reloaded successfully......" + attrs.paFollowingById,newVal, oldVal);
                if (newVal != oldVal) {
                    load(attrs.paFollowingById, element);
                }
            }, true);
        }

        return {
            link: link
        };
    }])
    .directive('paFollowButton', ['authService', 'followUser', function(authService, followUser) {

        function link(scope, element, attrs) {
            scope.doFollowUserInDirective = function(friend, user) {

                //console.log('scope.checkFollow:',scope.checkFollow);
                let session = authService.getSession();
                element.removeClass('follow');
                element.removeClass('following');
                scope.followViewButton = true;
                // check whether to follow user or un-follow
                let attributeToChange = element.find("#followText");
                element.addClass('pa-pointer-events-none');
                if ('followId' in attrs) {
                    let followUsers = {
                        follow_user_id: (friend.user_id).toString(),
                    };
                    // Unfollow
                    //console.log(followUsers);
                    followUser.unFollowUsers(followUsers, session)
                        .then(ufusr => {
                            //console.log('User unfollowed successfully', ufusr);
                            delete attrs.followId;
                            if (attributeToChange && attributeToChange.length > 0) {
                                attributeToChange[0].innerHTML = "Follow";
                                if (element.find("#followTextIcon") && element.find("#followTextIcon").length > 0) {
                                    element.find("#followTextIcon")[0].innerHTML = 'add';
                                }
                            } else {
                                element.val("Follow");
                            }
                            element.addClass('follow');
                            scope.followViewButton = true;
                            angular.element("#unfollowUsers").css("display", "block");
                            angular.element("#followUsers").css("display", "none");
                            scope.checkFollow = !scope.checkFollow;
                            if ('$parent' in scope && scope.$parent) {
                                scope.$parent.checkFollow = !scope.$parent.checkFollow;
                            }
                            element.removeClass('pa-pointer-events-none');
                            // scope.$apply();
                        });

                } else {
                    let followUsers = {
                        follow_user_id: (friend.user_id).toString(),
                    };
                    //console.log(followUsers);
                    followUser.addFollowUsers(followUsers, session).then(fusr => {
                        //console.log('User followed successfully', fusr);
                        if (attributeToChange && attributeToChange.length > 0) {

                            attributeToChange[0].innerHTML = "Following";
                            if (element.find("#followTextIcon") && element.find("#followTextIcon").length > 0) {
                                element.find("#followTextIcon")[0].innerHTML = 'check';
                            }
                        } else {
                            element.val("Following");
                        }
                        element.addClass('following');
                        scope.followViewButton = false;
                        scope.checkFollow = !scope.checkFollow;
                        if ('$parent' in scope && scope.$parent) {
                            scope.$parent.checkFollow = !scope.$parent.checkFollow;
                            scope.$parent.followViewButton = true;
                        }
                        attrs.followId = followUsers;
                        angular.element("#unfollowUsers").css("display", "none");
                        angular.element("#followUsers").css("display", "block");
                        element.removeClass('pa-pointer-events-none');
                        // scope.$apply();
                    }).catch(err => {
                        element.val("Follow");
                        scope.followViewButton = true;
                        angular.element("#unfollowUsers").css("display", "block");
                        angular.element("#followUsers").css("display", "none");
                        element.removeClass('pa-pointer-events-none');
                        //console.log('got fallow usr ::', err);
                    });
                }
            };

            scope.$watch(attrs.paFollowButton, function (followDetails) {
                let session = authService.getSession();
                element.removeClass('follow');
                element.removeClass('following');
                scope.followViewButton = true;
                element.find("#followText").text("Loading...");
                if (followDetails.toFollowUser === followDetails.followByUser) {
                    attrs.$set('style', 'display:none');
                } else {
                    followUser.getCurrentUserFollowingUser(session, followDetails).then(res => {
                        //console.log('following result::', res);
                        let follores = res;
                        let attributeToChange = element.find("#followText");

                        if (res && res.length > 0) {
                            // Check if there is id

                            if (attributeToChange && attributeToChange.length > 0) {
                                attributeToChange[0].innerHTML = "Following";
                                if (element.find("#followTextIcon") && element.find("#followTextIcon").length > 0) {
                                    element.find("#followTextIcon")[0].innerHTML = 'check';
                                }
                            } else {
                                element.val("Following");
                                element.find("#followText").text("Following");
                            }
                            element.addClass('following');
                            scope.followViewButton = false;
                            scope.$parent.followViewButton = true;
                            angular.element("#unfollowUsers").css("display", "none");
                            angular.element("#followUsers").css("display", "block");
                            attrs.$set('followId', follores[0].user_id);
                        } else {
                            element.find("#followText").text("Follow");
                            if (attributeToChange && attributeToChange.length > 0) {
                                let follores = res;
                                attributeToChange[0].innerHTML = "Follow";
                                if (element.find("#followTextIcon") && element.find("#followTextIcon").length > 0) {
                                    element.find("#followTextIcon")[0].innerHTML = 'add';
                                }
                            } else {
                                element.val("Follow");
                                element.find("#followText").text("Follow");
                            }
                            element.addClass('follow');
                            scope.followViewButton = true;
                            angular.element("#unfollowUsers").css("display", "block");
                            angular.element("#followUsers").css("display", "none");
                            attrs.$set('disabled', false);
                        }
                    }).catch(err => {
                        //console.log('follow errro ::', err);
                        element.find("#followText").text("Follow");
                        scope.followViewButton = true;
                        angular.element("#unfollowUsers").css("display", "block");
                        angular.element("#followUsers").css("display", "none");
                        attrs.$set('disabled', true);
                    });
                }
            }, true);

        }

        return {
            link: link
        };
    }])
    .directive('paEventGoing', ['authService', 'followUser', 'goingEvent', 'qbService', function(authService, followUser, goingEvent, qbService) {

        function link(scope, element, attrs) {

            function getUserGoingToEvent(eventId) {
                //console.log('Inside getUserGoingToEvent directives',eventId);
                let followers = 0;
                let session = authService.getSession();
                let filter = { _parent_id: eventId, type_going: { in: 'Going,May be' } };
                element.text(0);
                if (session) {
                    goingEvent.getGoingEvent(filter, session)
                        .then((allGoingResult) => {
                            followers = allGoingResult.length;
                            element.text(followers);
                        })
                        .catch(err => {
                            //console.log('Inside getUserGoingToEvent directives error ::', err);
                            element.text(0);
                        });
                }
            }

            scope.$watch(attrs.paEventGoing, function(eventGoingInput) {
                //console.log('Inside paEventGoing watch:', eventGoingInput);
                getUserGoingToEvent(eventGoingInput.eventId);
            });

            scope.$watch('refreshGoingCount', function(newVal, oldVal) {
                //  all directive code here
                //console.log("Reloaded successfully......" + newVal);
                if (newVal) {
                    let eventGoing = JSON.parse(attrs.paEventGoing);
                    getUserGoingToEvent(eventGoing.eventId);
                }
            });
        }
        return {
            link: link
        };
    }])
    .directive('paFriendGoing', ['authService', 'followUser', 'goingEvent', function(authService, followUser, goingEvent) {

        function link(scope, element, attrs) {

            function getUserFollowers(loggedInUserID, eventId) {
                let fids = [];
                let followers = 0;
                let session = authService.getSession();
                let user = authService.getUser();
                element.text(0);
                if (user && session) {
                    followUser.followers(user.id, session).then(res => {
                        let followers = 0;
                        if (res && res.length > 0) {
                            res.forEach((element => {
                                fids.push(element.user_id);
                            }));
                            let filter = { _parent_id: eventId, user_id: { in: fids }, type_going: { in: 'Going,May be' } };
                            return goingEvent.getGoingEvent(filter, session);
                        } else {
                            return Promise.reject([]);
                        }
                    }).then(result => {
                        followers = result.length;
                        element.text(followers);
                    }).catch(err => {
                        //console.log('follow error ::', err);
                        element.text(0);
                    });
                }

            }

            scope.$watch(attrs.paFriendGoing, function(followDetails) {
                //console.log('Inside paFriendGoing', followDetails);
                getUserFollowers(followDetails.userId, followDetails.eventId);
            });

            scope.$watch('refreshGoingCount', function(newVal, oldVal) {
                //  all directive code here
                //console.log("Reloaded successfully......" + newVal);
                if (newVal) {
                    let parsed = JSON.parse(attrs.paFriendGoing);
                    getUserFollowers(parsed.userId, parsed.eventId);
                }
            });
        }

        return {
            link: link
        };
    }])
    .directive('useCurrentLocation', ['locationService', '$uibModal', function(locationService, $uibModal) {
        return {
            restrict: 'A',
            link: function(scope, instanceElement, attributes) {
                let inputBox = attributes.inputBox;

                instanceElement.on('click', function() {
                    let element = angular.element('#' + inputBox);
                    let oldPlaceHolder = element.attr('placeholder');
                    element.attr('placeholder', 'Getting Location..');
                    locationService.getUserLocation(true)
                        .then((locationResponse) => {
                            //console.log("get current location success");
                            element.attr('placeholder', oldPlaceHolder);
                            element.val(locationResponse.address);
                            scope.$emit('locationResponse', locationResponse);
                        })
                        .catch((err) => {
                            //console.log("get current location err");
                            element.attr('placeholder', oldPlaceHolder);

                            // Show Location Access Modal
                            let modalInstance = $uibModal.open({
                                ariaLabelledBy: 'modal-title',
                                ariaDescribedBy: 'modal-body',
                                templateUrl: '../../partials/locationAccessedModal.html',
                                openedClass: 'pa-create-event-modal add-link-modal',
                                controller: ['$scope', function($scope) {
                                    $scope.cancel = function() {
                                        sendLocationPermission(true);
                                        this.$dismiss({});
                                    };
                                }],
                                size: 'md'
                            });
                            modalInstance.result.then(function(selectedItem) {

                            }, function() {
                                //console.log('Modal dismissed at: ' + new Date());
                            });
                        });
                });
            }
        };
    }])
    .directive('googleplacelatlong', function() {
        return {
            require: 'ngModel',
            scope: {
                "locationLatLongFn": "="
            },
            link: function($scope, element, attrs, model) {
                var options = {
                    types: []
                };
                if (attrs && 'gpTypes' in attrs && attrs.gpTypes) {
                    options.types = [attrs.gpTypes];
                }
                let gPlace = new google.maps.places.Autocomplete(element[0], options);
                $scope.autocomplete = gPlace;
                google.maps.event.addListener(gPlace, 'place_changed', function() {
                    $scope.$apply(function() {
                        model.$setViewValue(element.val());
                        let geoComponents = gPlace.getPlace();
                        let address = {
                            text: element.val()
                        };
                        if (geoComponents && geoComponents.geometry) {
                            $scope.latitude = geoComponents.geometry.location.lat();
                            $scope.longitude = geoComponents.geometry.location.lng();
                            address = {
                                lat: $scope.latitude,
                                long: $scope.longitude
                            };

                            // NOTE: Check if parent exists. This is used for search controller. if you are removing this code make sure Top Cities work on search page
                            if ($scope.$parent) {
                                $scope.$parent.loct = {
                                    lat: $scope.latitude,
                                    long: $scope.longitude
                                };
                            }
                        }

                        if ('address_components' in geoComponents && geoComponents.address_components) {
                            // Get locality 
                            let cityComponent = geoComponents.address_components.filter(a => a.types && a.types.includes('locality', 'administrative_area_level_3'));
                            address.address_components = geoComponents.address_components;
                            if (cityComponent && cityComponent.length > 0) {
                                address.city = cityComponent[0].short_name;
                            }
                        }

                        address.text = element.val();
                        $scope.loct = address;
                        if ($scope.$parent) {
                            $scope.$parent.loct = address;
                        }
                        let locationLatLong = [$scope.latitude, $scope.longitude];
                        $scope.locationLatLongFn(locationLatLong);
                        // let addressComponents = geoComponents.address_components;
                        // //console.log('model :: ',[geoComponents,latitude,addressComponents]);
                    });
                });
            }
        };
    })
    .directive('googleplace', function() {
        return {
            require: 'ngModel',

            link: function($scope, element, attrs, model) {
                var options = {
                    types: []
                };
                if (attrs && 'gpTypes' in attrs && attrs.gpTypes) {
                    options.types = [attrs.gpTypes];
                }
                let gPlace = new google.maps.places.Autocomplete(element[0], options);
                $scope.autocomplete = gPlace;
                google.maps.event.addListener(gPlace, 'place_changed', function() {
                    $scope.$apply(function() {
                        model.$setViewValue(element.val());
                        let geoComponents = gPlace.getPlace();
                        let address = {
                            text: element.val()
                        };
                        if (geoComponents && geoComponents.geometry) {
                            $scope.latitude = geoComponents.geometry.location.lat();
                            $scope.longitude = geoComponents.geometry.location.lng();
                            address = {
                                lat: $scope.latitude,
                                long: $scope.longitude
                            };

                            // NOTE: Check if parent exists. This is used for search controller. if you are removing this code make sure Top Cities work on search page
                            if ($scope.$parent) {
                                $scope.$parent.loct = {
                                    lat: $scope.latitude,
                                    long: $scope.longitude
                                };
                            }
                        }

                        if ('address_components' in geoComponents && geoComponents.address_components) {
                            // Get locality 
                            let cityComponent = geoComponents.address_components.filter(a => a.types && a.types.includes('locality', 'administrative_area_level_3'));
                            address.address_components = geoComponents.address_components;
                            if (cityComponent && cityComponent.length > 0) {
                                address.city = cityComponent[0].short_name;
                            }
                        }

                        address.text = element.val();
                        $scope.loct = address;
                        if ($scope.$parent) {
                            $scope.$parent.loct = address;
                        }

                    });
                });
            }
        };
    })
    .directive('compareToNew', function() {
        return {
            require: "ngModel",
            scope: {
                otherModelValue: "=compareToNew"
            },
            link: function(scope, element, attributes, ngModel) {

                ngModel.$validators.compareToNew = function(modelValue) {
                    return modelValue == scope.otherModelValue;
                };

                scope.$watch("otherModelValue", function() {
                    ngModel.$validate();
                });
            }
        };
    })
    .directive('compareToOld', function() {
        return {
            require: "ngModel",
            scope: {
                otherModelValues: "=compareToOld"
            },
            link: function(scope, element, attributes, ngModel) {

                ngModel.$validators.compareToOld = function (modelValue) {
                    return modelValue != scope.otherModelValues;
                };

                scope.$watch("otherModelValues", function() {
                    ngModel.$validate();
                });
            }
        };
    })
    .directive('compareToTime', function() {
        return {
            require: "ngModel",
            scope: {
                otherModelValue: "=compareToTime"
            },
            link: function(scope, element, attributes, ngModel) {

                ngModel.$validators.compareToTime = function(modelValue) {
                    //return modelValue == scope.otherModelValue;
                    let startTime = moment(scope.otherModelValue, 'hh:mma');
                    let endTime = moment(modelValue, 'hh:mma');
                    if (startTime.isAfter(endTime)) {
                        return false;
                    } else {
                        return true;
                    }
                };

                scope.$watch("otherModelValue", function() {
                    ngModel.$validate();
                });
            }
        };
    })
    .directive('eventOverview', function() {
        return {
            restrict: 'E',
            scope: {
                event: '=event',
                readOnly: '=readOnly',
                skip: '=skip',
                hideDescription: '=hideDescription'
            },
            templateUrl: 'partials/eventOverview.html'
        };
    })
    .directive('shareGoogleCalendar', ['$http', 'awsService', 'config', function($http, awsService, config) {
        return {
            restrict: 'A',
            scope: {
                event: '=event',
                notifySuccess: '=notifySuccess',
                notifyError: '=notifyError',
                updateShareCounter: '=updateShareCounter'
            },
            link: function(scope, instanceElement, attributes) {
                instanceElement.on('click', function() {
                    const clientId = config.GOOGLE_CLIENT_ID;
                    const scopes = ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'];

                    gapi.auth.authorize({ client_id: clientId, scope: scopes, immediate: false }, handleAuthResult);
                    return false;

                    function handleAuthResult(authResult) {
                        var authorizeButton = document.getElementById('authorize-button');
                        if (authResult && !authResult.error) {
                            let accessToken = authResult.access_token;
                            return $http({
                                method: 'GET',
                                url: 'https://www.googleapis.com/oauth2/v1/userinfo?access_token=' + accessToken,
                                data: null,
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                json: true
                            }).then(function(result) {
                                let email = result.data.email;
                                //console.log('Got email', email);
                                makeApiCall(email, result.data.name);
                            });
                        } else {
                            authorizeButton.style.visibility = '';
                        }
                    }

                    function makeApiCall(email, name) {

                        let event_details = scope.event;

                        gapi.client.load('calendar', 'v3', function() {
                            let location = null;
                            if ('location' in event_details && event_details.location) {
                                location = "https://maps.googleapis.com/maps/api/geocode/json?latlng=" + event_details.location[0] + "," + event_details.location[1];
                            } else {
                                location = "https://maps.googleapis.com/maps/api/geocode/json?latlng=" + event_details.eventLocation[0] + "," + event_details.eventLocation[1];
                            }
                            $.get(location, function(data, status) {

                                let address = event_details.address;
                                if ('results' in data && data.results && data.results.length > 0) {
                                    address = data.results[0].formatted_address;
                                }
                                // console.log("Google Event Details----", event_details);
                                let description = event_details.title;
                                if (event_details.description && event_details.description.length > 0) {
                                    description = event_details.description;
                                }
                                let event = {
                                    'summary': event_details.title || event_details.event_name,
                                    'description': description,
                                    'location': address,
                                    'start': {
                                        'dateTime': moment.utc(event_details.start || event_details.start_date_time),
                                        'timeZone': 'GMT'
                                    },
                                    'originalStartTime': {
                                        'dateTime': moment.utc(event_details.start || event_details.start_date_time),
                                        'timeZone': 'GMT'
                                    },
                                    'end': {
                                        'dateTime': moment.utc(event_details.end || event_details.end_date_time),
                                        'timeZone': 'GMT'
                                    }

                                };
                                //console.log("Google Calender Data",event);
                                let request = gapi.client.calendar.events.insert({
                                    'calendarId': 'primary',
                                    'resource': event
                                });
                                request.execute(function(resp) {
                                    if (resp.status == "confirmed") {
                                        if (scope.notifySuccess) {
                                            let notify = {
                                                type: 'success',
                                                title: 'Success',
                                                content: 'Event has been added to your calender successfully!',
                                                timeout: 5000 //time in ms
                                            };
                                            scope.$emit('notify', notify);
                                        }
                                        if (scope.updateShareCounter) {
                                            awsService.updateShareCounter(email, event_details.id)
                                                .then((counter) => {
                                                    scope.event.shareCounter = counter;
                                                    return awsService.subscribeToThirdParty(email, name);
                                                })
                                                .then(() => {
                                                    //console.log('Eaddressmail subscribe to list done');
                                                })
                                                .catch((err) => {
                                                    console.log(err);
                                                });
                                        }
                                    } else {
                                        if (scope.notifyError) {
                                            let notify = {
                                                type: 'error',
                                                title: 'OOPS!!',
                                                content: 'Something went wrong! Unable to add to calendar',
                                                timeout: 5000 //time in ms
                                            };
                                            scope.$emit('notify', notify);
                                        }
                                    }
                                    //console.log("Event Added To Google Calender Successfully");
                                });
                            });


                        });
                    }


                });
            }
        };
    }])
    .directive('eventDetailModal', ['$uibModal', 'authService', '$uibModalStack', '$window', function($uibModal, authService, $uibModalStack, $window) {
        return {
            restrict: 'A',
            scope: {
                event: '=event',
            },
            link: function(scope, instanceElement, attributes) {
                /** backdrop static to prevent outside close of modal **/
                function openModal(event) {
                    let event_name = event.event_name.replace(/\W+(?!$)/g, '-').toLowerCase();
                    // Go to detail page
                    $window.location.href = `/eventdetails/${event_name}/${event.event_id}`;
                }
                instanceElement.on('click', function() {
                    // Check if user is logged in
                    let user = authService.getUser();
                    let session = authService.getSession();
                    if (user && session) {
                        let openedModal = $uibModalStack.getTop();
                        if (openedModal) {
                            openedModal.key.dismiss({ event_id: scope.event });
                        } else {
                            openModal(scope.event);
                            let body = angular.element('body');
                            // if(openedModal)
                            {
                                // body.addClass('hideBodyScroll');
                            }
                        }
                    } else {
                        // Open login Modal${scope.event}
                        let modalScope = scope.$new(true);
                        // NOTE: %26 is added because on login page it consider & as query param rather than actual redirect query param
                        let event_name = scope.event.event_name.replace(/\W+(?!$)/g, '-').toLowerCase();
                        modalScope.redirectUrl = `/eventdetails/${event_name}/${scope.event}`;
                        modalScope.toSignup = `/signup?redirectSignup=${modalScope.redirectUrl}`;

                        $uibModal.open({
                            ariaLabelledBy: 'modal-title',
                            ariaDescribedBy: 'modal-body',
                            templateUrl: '../partials/loginModal.html',
                            controller: 'LoginModalController',
                            controllerAs: 'plm',
                            windowClass: 'login-modal login-modal-fix',
                            scope: modalScope
                        });
                    }

                });
            }
        };
    }])
    .directive('eventDetailNewTab', ['$uibModal', 'authService', '$uibModalStack', '$window', function($uibModal, authService, $uibModalStack, $window) {
        return {
            restrict: 'A',
            scope: {
                event: '=event',
            },
            link: function(scope, instanceElement, attributes) {
                /** backdrop static to prevent outside close of modal **/
                function openModal(event) {
                    let event_name = event.event_name.replace(/\W+(?!$)/g, '-').toLowerCase();
                    // Go to detail page
                    $window.open(`/eventdetails/${event_name}/${event.event_id}`, '_blank');
                }
                instanceElement.on('click', function() {
                    openModal(scope.event);
                });
            }
        };
    }])
    .directive('editEventModal', ['$uibModal', 'authService', '$uibModalStack', function($uibModal, authService, $uibModalStack) {
        return {
            restrict: 'A',
            scope: {
                event: '=event',
                action: '=action'
            },
            link: function(scope, instanceElement, attributes) {
                instanceElement.on('click', function() {
                    // Go to edit 
                    window.location.href = `/events/${scope.event.event_id}/${scope.action.toLowerCase()}`;

                });
            }
        };
    }])
    .directive('backToHistory', ['$window', function($window) {
        return {
            restrict: 'A',
            link: function(scope, elem, attrs) {
                elem.bind('click', function() {
                    $window.history.back();
                });
            }
        };
    }])
    .directive('viewEventLocation', ['$uibModal', function($uibModal) {
        return {
            restrict: 'A',
            scope: {
                event: '=event'
            },
            link: function(scope, instanceElement, attributes) {


                instanceElement.on('click', function() {
                    let eventModelScope = scope.$new(false, scope);
                    eventModelScope.eventMarkerForModal = scope.event;

                    let modalParams = {
                        ariaLabelledBy: 'modal-title',
                        ariaDescribedBy: 'modal-body',
                        templateUrl: '../partials/mapModal.html',
                        scope: eventModelScope,
                        controller: function() {
                            eventModelScope.cancel = function() {
                                this.$dismiss({});
                            };
                        },
                        openedClass: 'pa-create-event-modal pa-common-modal-style',
                        size: 'lg'
                    };
                    let body = angular.element('body');
                    body.addClass('hideBodyScroll');
                    let modalInstance = $uibModal.open(modalParams);
                    modalInstance.result.then(function() {
                        //console.log('Old modal closed');
                        body.removeClass('hideBodyScroll');

                    }).catch(err => {
                        body.removeClass('hideBodyScroll');
                        //console.log('Inside event modal error', err);

                    });

                });
            }
        };
    }])
    .directive('shareFacebook', ['awsService', function(awsService) {
        return {
            restrict: 'A',
            scope: {
                event: '=event',
                notifySuccess: '=notifySuccess',
                notifyError: '=notifyError',
                updateShareCounter: '=updateShareCounter'
            },
            link: function(scope, instanceElement, attributes) {
                instanceElement.on('click', function() {
                    let event_details = scope.event;
                    //console.log(event_details);
                    let event_facebook_image = '';
                    if (event_details.event_image && event_details.event_image != '') {
                        event_facebook_image = event_details.image_url.replace("w=1700", "w=2100");
                    }
                    if (event_details.imageUrl) {
                        event_facebook_image = event_details.imageUrl.replace("w=1700", "w=2100");
                    }

                    let base_url = window.location.origin;
                    let id = event_details.event_id;
                    let share_url = base_url + "/?share=" + id;

                    FB.ui({
                        method: 'share_open_graph',
                        action_type: 'og.shares',
                        action_properties: JSON.stringify({
                            object: {
                                'og:url': share_url,
                                'og:title': event_details.event_name || event_details.title,
                                'og:description': event_details.description,
                                'og:image': event_facebook_image
                            }
                        })
                    }, function(response) {
                        if (response) {
                            //console.log(response);
                            FB.api('/me?fields=id,email,name', function(data) {
                                //console.log('Reply from /me facebook', data);

                                if (scope.notifySuccess) {
                                    let notify = {
                                        type: 'success',
                                        title: 'Success',
                                        content: 'Event has been posted to your timeline successfully!',
                                        timeout: 5000 //time in ms
                                    };
                                    scope.$emit('notify', notify);
                                }
                                if (data && data.email) {
                                    //console.log(data);
                                    let email = data.email;
                                    if (scope.updateShareCounter) {
                                        awsService.updateShareCounter(email, event_details.id)
                                            .then((counter) => {
                                                scope.event.shareCounter = counter;
                                                return awsService.subscribeToThirdParty(email, name);
                                            })
                                            .then(() => {
                                                //console.log('Email subscribe to list done');
                                            })
                                            .catch((err) => {
                                                //console.log(err);
                                            });
                                    }
                                } else {
                                    if (scope.updateShareCounter) {
                                        awsService.updateShareCounter(null, event_details.event_id)
                                            .then((counter) => {
                                                scope.event.shareCounter = counter;
                                                return Promise.resolve();
                                            })
                                            .then(() => {
                                                //console.log('Email subscribe to list done');
                                            })
                                            .catch((err) => {
                                                //console.log(err);
                                            });
                                    }
                                }
                            });
                        }
                    });
                });
            }
        };
    }])
    .directive('shareEmail', ['awsService', '$uibModal', function(awsService, $uibModal) {
        return {
            restrict: 'A',
            scope: {
                event: '=event',
                notifySuccess: '=notifySuccess',
                notifyError: '=notifyError',
                updateShareCounter: '=updateShareCounter'
            },
            link: function(scope, instanceElement, attributes) {
                instanceElement.on('click', function() {
                    let event_details = scope.event;

                    let emailShareScope = scope.$new(true);
                    emailShareScope.selectedEvent = event_details;
                    emailShareScope.emailModalTitle = event_details.event_name;
                    emailShareScope.emailModalSelectedEventDescription = event_details.description ? event_details.description + "\n \n" : "";
                    let base_url = window.location.origin;
                    let id = event_details.event_id;
                    let share_url = base_url + "/?share=" + id;

                    emailShareScope.shareURL = share_url;

                    let modalInstance = $uibModal.open({
                        ariaLabelledBy: 'modal-title',
                        ariaDescribedBy: 'modal-body',
                        templateUrl: '../partials/emailShareModal.html',
                        controller: 'emailShareModalController',
                        controllerAs: 'emc',
                        scope: emailShareScope

                    });

                    modalInstance.result
                        .then(function(reason) {
                            console.log("Inside dismissed");
                        })
                        .catch(err => {
                            console.log(err);
                            if (err && err === 'shared' && scope.updateShareCounter) {
                                awsService.updateShareCounter(null, event_details.event_id)
                                    .then((counter) => {
                                        scope.event.shareCounter = counter;
                                    })
                                    .then(() => {
                                        //console.log('Email subscribe to list done');
                                    })
                                    .catch((err) => {
                                        //console.log(err);
                                    });

                            }
                        });
                });
            }
        };
    }])
    .directive('shareLink', ['awsService', '$uibModal', function(awsService, $uibModal) {
        return {
            restrict: 'A',
            scope: {
                event: '=event',
                notifySuccess: '=notifySuccess',
                notifyError: '=notifyError',
                updateShareCounter: '=updateShareCounter'
            },
            link: function(scope, instanceElement, attributes) {
                instanceElement.on('click', function() {
                    let event_details = scope.event;

                    let base_url = window.location.origin;
                    let id = event_details.event_id;
                    let name = event_details.event_name;
                    let event_name = name.replace(/\W+(?!$)/g, '-').toLowerCase();
                    let share_url = base_url + "/eventdetails/" + event_name + '/' + id;

                    let linkShareScope = scope.$new(true);
                    linkShareScope.scopeURL = share_url;
                    linkShareScope.eventDataForShare = event_details;

                    let modalInstance = $uibModal.open({
                        ariaLabelledBy: 'modal-title',
                        ariaDescribedBy: 'modal-body',
                        templateUrl: '../partials/linkShareModal.html',
                        controller: 'linkShareModalController',
                        controllerAs: 'edmc',
                        scope: linkShareScope
                    });

                    modalInstance.result
                        .then(function(reason) {
                            //console.log("Inside dismissed");
                        })
                        .catch(err => {
                            //console.log(err);
                            if (err && err === 'shared' && scope.updateShareCounter) {
                                awsService.updateShareCounter(null, event_details.id)
                                    .then((counter) => {
                                        scope.event.shareCounter = counter;
                                    })
                                    .then(() => {
                                        //console.log('Email subscribe to list done');
                                    })
                                    .catch((err) => {
                                        //console.log(err);
                                    });

                            }
                        });
                });
            }
        };
    }])
    .directive('socialShareLink', ['$uibModal', function($uibModal) {
        return {
            restrict: 'A',
            scope: {},
            link: function(scope, instanceElement, attributes) {
                instanceElement.on('click', function() {
                    let event_details = attributes.socialShareLink;
                    let linkShareScope = scope.$new(true);
                    linkShareScope.scopeURL = event_details;
                    linkShareScope.eventDataForShare = event_details;

                    $uibModal.open({
                        ariaLabelledBy: 'modal-title',
                        ariaDescribedBy: 'modal-body',
                        templateUrl: '../partials/linkShareModal.html',
                        controller: 'linkShareModalController',
                        controllerAs: 'edmc',
                        scope: linkShareScope
                    });
                });
            }
        };
    }])
    .directive('onError', function() {
        return {
            restrict: 'A',
            link: function(scope, element, attr) {
                element.on('error', function() {
                    element.attr('src', attr.onError);
                });
            }
        };
    })
    .directive('taMinlength', ['$timeout', 'textAngularManager', function($timeout, textAngularManager) {
        return {
            require: 'ngModel',
            restrict: 'A',
            link: function($scope, element, attrs, ngModelCtrl) {
                var editor, minLength = parseInt(attrs.taMinlength);

                var getEditor = function() {
                    return editor.scope.displayElements.text[0];
                };

                var getContentLength = function() {
                    let content = angular.element(getEditor()).text();
                    // get number of words in it
                    let words = 0;
                    if (content) {
                        words = content.trim().split(/(\s+)/).length;

                    }
                    return words;
                };

                var isNavigationKey = function(keyCode) {
                    return ((keyCode >= 33) && (keyCode <= 40)) || ([8, 46].indexOf(keyCode) !== -1);
                };

                var isCopying = function(event) {
                    return event.ctrlKey && ([65, 67, 88].indexOf(event.keyCode) !== -1);
                };

                $scope.$watch(function() {
                    var editorInstance = textAngularManager.retrieveEditor(attrs.name);

                    if ((editorInstance !== undefined) && (editor === undefined)) {
                        editor = editorInstance;

                        getEditor().addEventListener('keydown', function(e) {
                            ngModelCtrl.$setValidity('taMinLength', true);
                            if ((getContentLength() < minLength)) {
                                ngModelCtrl.$setValidity('taMinLength', false);
                            }

                        });
                    }

                    return editorInstance === undefined ? '' : editor.scope.html;
                }, function(modifiedContent) {

                });
            }
        };
    }])
    .directive('eventRemainQty', function() {

        function link(scope, element, attrs) {
            if (scope.event) {

                if ("tickets_list" in scope.event) {
                    scope.event.ticketsArr = scope.event.tickets_list;
                }

                if ("ticket_type" in scope.event && scope.event.ticket_type && scope.event.ticket_type == "free" &&
                    "ticketsArr" in scope.event && scope.event.ticketsArr && scope.event.ticketsArr.length > 0) {
                    let tickets = scope.event.ticketsArr;
                    tickets = tickets.filter((t) => ((!t.status) || (t.status == 'active')));
                    let all_remaing_ticket = 0;
                    let all_ticket = 0;
                    for (let t of tickets) {
                        all_remaing_ticket += t.remaining_qty;
                        all_ticket += t.quantity;
                    }
                    let all_sold_ticket = all_ticket - all_remaing_ticket;
                    element.text("Free (" + all_sold_ticket + "/" + all_ticket + ")");
                } else if ("ticket_type" in scope.event && scope.event.ticket_type && scope.event.ticket_type == "free" &&
                    "ticketsArr" in scope.event && scope.event.ticketsArr && scope.event.ticketsArr.length == 0) {
                    element.text("Free");
                } else if ("ticket_type" in scope.event && scope.event.ticket_type && scope.event.ticket_type == "paid" &&
                    "ticketsArr" in scope.event && scope.event.ticketsArr && scope.event.ticketsArr.length > 0) {

                    let tickets = scope.event.ticketsArr;
                    tickets = tickets.filter((t) => ((!t.status) || (t.status == 'active')));
                    let all_remaing_ticket = 0;
                    let all_ticket = 0;
                    for (let t of tickets) {
                        all_remaing_ticket += t.remaining_qty;
                        all_ticket += t.quantity;
                    }
                    let all_sold_ticket = all_ticket - all_remaing_ticket;
                    element.text("Paid (" + all_sold_ticket + "/" + all_ticket + ")");
                } else {
                    element.text("Paid");
                }
            }
        }
        return {
            restrict: 'A',
            scope: {
                event: '=event',
            },
            link: link
        };
    })
    .directive('eventTicketPrice', function() {
        function link(scope, element) {
            if (scope.event) {
                element.text("FREE");
                if ("tickets_list" in scope.event) {
                    scope.event.ticketsArr = scope.event.tickets_list;
                }
                if ("ticket_type" in scope.event && scope.event.ticket_type == "") {
                    scope.event.ticket_type = scope.event.event_type;
                }
                if ("ticket_type" in scope.event && scope.event.ticket_type && scope.event.ticket_type == "paid" &&
                    "ticketsArr" in scope.event && scope.event.ticketsArr && scope.event.ticketsArr.length > 0) {
                    let tickets = scope.event.ticketsArr;
                    if (tickets.length > 0) {
                        if (((tickets.filter(key => key.price >= 0 && key.ticket_type == "paid").length == tickets.length) && tickets.length > 1) ||
                            (tickets.filter(key => key.price >= 0 && key.ticket_type == "paid").length > 0) && (tickets.filter(key => key.ticket_type == "donation").length == 0) && (tickets.filter(key => key.ticket_type == "free").length > 0) ||
                            (tickets.filter(key => key.price >= 0 && key.ticket_type == "paid").length > 0) && (tickets.filter(key => key.ticket_type == "donation").length > 0) && (tickets.filter(key => key.ticket_type == "free").length > 0)) {
                            var min = Math.min.apply(null, tickets.map(function(item) { return item.price; }));
                            var max = Math.max.apply(null, tickets.map(function(item) { return item.price; }));
                            element.text("$" + min + ' - $' + max);
                        } else if ((tickets.filter(key => key.ticket_type == "donation").length == tickets.length) || (tickets.filter(key => key.ticket_type == "donation").length > 1)) {
                            scope.$root.$$childHead.yellowBanner = true;
                            element.text("");
                            element.append("<div class='pa-color-333333 pa-display-inline-flex'>Donation</div>");
                        } else if ((tickets.filter(key => key.price > 0 && key.ticket_type == "paid").length == 1) && (tickets.filter(key => key.ticket_type == "donation").length == 0) && (tickets.filter(key => key.ticket_type == "free").length == 0)) {
                            var price = (tickets[0].price) * 1;
                            element.text("$" + (price.toFixed(2)));
                        } else if ((tickets.filter(key => key.price >= 0 && key.ticket_type == "paid").length == 0) && (tickets.filter(key => key.ticket_type == "donation").length > 0) && (tickets.filter(key => key.ticket_type == "free").length > 0)) {
                            element.text("");
                            element.append("<div class='green-colr-imp pa-display-inline-flex'>$0 - Donation</div>");
                        } else if ((tickets.filter(key => key.price >= 0 && key.ticket_type == "paid").length > 0) && (tickets.filter(key => key.ticket_type == "donation").length > 0) && (tickets.filter(key => key.ticket_type == "free").length == 0)) {
                            var maxs = Math.max.apply(null, tickets.map(function(item) { return item.price; }));
                            element.text("Donation" + ' - $' + maxs);
                        }
                    }
                } else if ("ticket_type" in scope.event && scope.event.ticket_type && scope.event.ticket_type == "paid" &&
                    "ticketsArr" in scope.event && scope.event.ticketsArr && scope.event.ticketsArr.length == 0) {
                    element.text("");
                    element.append("<div class='pa-display-inline-flex'>PAID</div>");
                }
            }
        }
        return {
            restrict: 'A',
            replace: true,
            transclude: true,
            scope: {
                event: '=event'
            },
            link: link
        };
    })
    .directive('buyTicket', ['$window', '$uibModal', 'authService', function($window, $uibModal, authService) {
        function link(scope, element, attrs) {
            //   console.log('Inside buy tickets');
            element.on('click', function() {
                // Check if user is logged in
                let user = authService.getUser();
                let session = authService.getSession();
                if (user && session) {
                    $window.location.href = '/ticket_type?ev=' + scope.event;
                } else {
                    // Open login Modal
                    let modalScope = scope.$new(true);
                    // NOTE: %26 is added because on login page it consider & as query param rather than actual redirect query param
                    modalScope.redirectUrl = `/ticket_type?ev=${scope.event}`;
                    modalScope.toSignup = `/signup?redirectSignup=${modalScope.redirectUrl}`;

                    $uibModal.open({
                        ariaLabelledBy: 'modal-title',
                        ariaDescribedBy: 'modal-body',
                        templateUrl: '../partials/loginModal.html',
                        controller: 'LoginModalController',
                        controllerAs: 'plm',
                        windowClass: 'login-modal login-modal-fix',
                        scope: modalScope
                    });
                }
            });
        }
        return {
            restrict: 'A',
            scope: {
                event: '=event',
            },
            link: link
        };
    }])
    .directive('buyTicketWidget', ['$window', '$uibModal', 'authService', function($window, $uibModal, authService) {
        function link(scope, element, attrs) {
            //   console.log('Inside buy tickets');
            element.on('click', function() {
                $window.location.href = '/widget/ticket_list?ev=' + scope.event;
            });
        }
        return {
            restrict: 'A',
            scope: {
                event: '=event',
            },
            link: link
        };
    }])
    .directive('buyTicketDirect', ['$window', function($window) {
        function link(scope, element, attrs) {
            element.on('click', function() {
                $window.location.href = '/widget/ticket_list?ev=' + scope.event;
            });
        }
        return {
            restrict: 'A',
            scope: {
                event: '=event',
            },
            link: link
        };
    }])
    .directive('linkPaypalAccount', ['$uibModal', 'authService', function($uibModal, authService) {
        function link(scope, element, attrs) {
            //   console.log('Inside buy tickets');
            element.on('click', function() {
                // Check if user is logged in
                let user = authService.getUser();

                let eventModelScope = scope.$new(false, scope);
                eventModelScope.paypal_email = user.paypal_email;

                let modalInstance = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/paypalLinkModal.html',
                    openedClass: 'pa-create-event-modal pa-common-modal-style',
                    controller: 'PaypalModalController',
                    scope: eventModelScope,
                    windowClass: 'app-modal-window',
                });

                modalInstance.result.then(function() {
                    //console.log('Closed');
                    // refresh the user on close
                    scope.user = authService.getUser();
                    scope.$emit('paypalUpdated', scope.user);
                }, function() {
                    //console.log('Modal dismissed at: ' + new Date());
                });
            });
        }
        return {
            restrict: 'A',
            scope: {
                user: '=user',
            },
            link: link
        };
    }])
    .directive('buyTicketOrViewEvent', ['$compile', '$location', 'authService', function($compile, $location, authService) {
        function link(scope, element, attrs) {
            if (scope.event) {
                if ("event_type" in scope.event && scope.event.event_type != '') {
                    if (scope.event.event_type == "free" && scope.event.admission_ticket_type == "1") {
                        element.text("Register");
                        element.removeAttr('buy-ticket-or-view-event');
                        element.attr('event', `'${scope.event.event_id}'`);
                        element.attr('buy-ticket', '');
                        $compile(element)(scope);
                    } else if (scope.event.event_type == "paid") {
                        element.text("Buy Ticket ");
                        element.removeAttr('buy-ticket-or-view-event');
                        element.attr('event', `'${scope.event.event_id}'`);
                        element.attr('buy-ticket', '');
                        $compile(element)(scope);
                    } else {
                        element.removeAttr('buy-ticket-or-view-event');
                        element.attr('style', 'display:none');
                        element.parent().attr('style', 'display:none');
                        $compile(element)(scope);
                    }
                } else {
                    element.removeAttr('buy-ticket-or-view-event');
                    element.attr('style', 'display:none');
                    element.parent().attr('style', 'display:none');
                }
            }
        }
        return {
            restrict: 'A',
            scope: {
                event: '=event',
            },
            link: link
        };
    }])
    .directive('buyTicketOrViewEventWidget', ['$compile', '$location', 'authService', function($compile, $location, authService) {
        function link(scope, element, attrs) {
            if (scope.event) {
                if ("ticket_type" in scope.event && scope.event.ticket_type != '') {
                    if (scope.event.ticket_type == "free" && scope.event.admission_ticket_type == "1") {
                        element.text("Register");
                        element.removeAttr('buy-ticket-or-view-event-widget');
                        element.attr('event', `'${scope.event.event_id}'`);
                        element.attr('buy-ticket-widget', '');
                        $compile(element)(scope);
                    } else if (scope.event.ticket_type == "paid") {
                        element.text("Get Ticket Now");
                        element.removeAttr('buy-ticket-or-view-event-widget');
                        element.attr('event', `'${scope.event.event_id}'`);
                        element.attr('buy-ticket-widget', '');
                        $compile(element)(scope);
                    } else {
                        element.removeAttr('buy-ticket-or-view-event-widget');
                        element.attr('style', 'display:none');
                        element.parent().attr('style', 'display:none');
                        $compile(element)(scope);
                    }
                } else {
                    element.removeAttr('buy-ticket-or-view-event-widget');
                    element.attr('style', 'display:none');
                    element.parent().attr('style', 'display:none');
                }
            }
        }
        return {
            restrict: 'A',
            scope: {
                event: '=event',
            },
            link: link
        };
    }])
    .directive('file', function() {
        return {
            restrict: 'AE',
            scope: {
                file: '@'
            },
            link: function(scope, el, attrs) {
                el.bind('change', function(event) {
                    var files = event.target.files;
                    var file = files[0];
                    scope.file = file;
                    scope.$parent.file = file;
                    scope.$apply();
                });
            }
        };
    }).directive('stopccp', function() {
        return {
            scope: {},
            link: function(scope, element) {
                element.on('cut copy paste', function(event) {
                    event.preventDefault();
                });
            }
        };
    }).directive('checkLogin', ['$window', '$uibModal', 'authService', function($window, $uibModal, authService) {
        function link(scope, element, attrs) {
            //   console.log('Inside buy tickets');
            element.on('click', function() {
                // Check if user is logged in
                let user = authService.getUser();
                let session = authService.getSession();
                if (user && session) {
                    return true;
                } else {
                    // Open login Modal
                    let modalScope = scope.$new(true);

                    // NOTE: %26 is added because on login page it consider & as query param rather than actual redirect query param
                    let event_name = scope.event.event_name.replace(/\W+(?!$)/g, '-').toLowerCase();
                    modalScope.redirectUrl = `/eventdetails/${event_name}/${scope.event.event_id}`;
                    modalScope.toSignup = `/signup?redirectSignup=${modalScope.redirectUrl}`;

                    $uibModal.open({
                        ariaLabelledBy: 'modal-title',
                        ariaDescribedBy: 'modal-body',
                        templateUrl: '../partials/loginModal.html',
                        controller: 'LoginModalController',
                        controllerAs: 'plm',
                        windowClass: 'login-modal login-modal-fix',
                        scope: modalScope
                    });
                }
            });
        }
        return {
            restrict: 'A',
            scope: {
                event: '=event',
            },
            link: link
        };
    }])
    .directive('onlyTextNumber', function() {
        function link(scope, elem, attrs, ngModel) {
            ngModel.$parsers.push(function(viewValue) {
                var reg = /^[^`~!@#$%\^&*()_+={}|[\]\\:';"<>?,./]*$/;
                // if view values matches regexp, update model value
                if (viewValue.match(reg)) {
                    return viewValue;
                }
                // keep the model value as it is
                var transformedValue = ngModel.$modelValue;
                ngModel.$setViewValue(transformedValue);
                ngModel.$render();
                return transformedValue;
            });
        }

        return {
            restrict: 'A',
            require: 'ngModel',
            link: link
        };
    }).directive('backImg', function() {
        return function(scope, element, attrs) {
            var url = attrs.backImg;
            element.css({
                'background-image': 'url(' + url + ')'
            });
        };
    }).directive("onlyNumber", function() {
        return {
            require: 'ngModel',
            link: function(scope, element, attr, ngModelCtrl) {
                function fromUser(text) {
                    if (text) {
                        var transformedInput = text.toString().replace(/[^0-9]/g, '');
                        transformedInput = transformedInput.replace(/^0+/, '');
                        if (transformedInput !== text) {
                            ngModelCtrl.$setViewValue(transformedInput);
                            ngModelCtrl.$render();
                        }
                        return transformedInput;
                    }
                    return undefined;
                }
                ngModelCtrl.$parsers.push(fromUser);
            }
        };
    }).directive("maxInputFive", function() {
        return {
            require: 'ngModel',
            link: function(scope, element, attr, ngModelCtrl) {
                function fromUser(text) {
                    if (text) {

                        if (text.length == 2) {
                            text = text.slice(1, 2);
                        }


                        var transformedInput = text.toString().replace(/[^0-9]/g, '');
                        transformedInput = transformedInput.replace(/^0+/, '');
                        transformedInput = parseInt(transformedInput);
                        if (transformedInput > 5) {
                            transformedInput = 5;
                        }

                        if (transformedInput < 1) {
                            transformedInput = 1;
                        }

                        if (transformedInput !== text) {
                            ngModelCtrl.$setViewValue(transformedInput);
                            ngModelCtrl.$render();
                        }
                        return transformedInput;
                    }
                    return undefined;
                }
                ngModelCtrl.$parsers.push(fromUser);
            }
        };
    }).directive("onlyNumberWithLimit", function() {
        return {
            require: 'ngModel',
            link: function(scope, element, attr, ngModelCtrl) {
                function fromUser(input_value) {
                    if (input_value) {
                        if (input_value > attr.maxValue) {
                            let str_a = input_value.toString();
                            input_value = Number(str_a.slice(0, 6));
                            ngModelCtrl.$setViewValue(input_value);
                            ngModelCtrl.$render();
                        }
                        return input_value;
                    }
                    return undefined;
                }
                ngModelCtrl.$parsers.push(fromUser);
            }
        };
    }).directive("bnLazySrc", ['$window', '$document', function($window, $document) {
        // I manage all the images that are currently being
        // monitored on the page for lazy loading.
        var lazyLoader = (function() {

            // I maintain a list of images that lazy-loading
            // and have yet to be rendered.
            var images = [];

            // I define the render timer for the lazy loading
            // images to that the DOM-querying (for offsets)
            // is chunked in groups.
            var renderTimer = null;
            var renderDelay = 100;

            // I cache the window element as a jQuery reference.
            var win = $($window);

            // I cache the document document height so that
            // we can respond to changes in the height due to
            // dynamic content.
            var doc = $document;
            var documentHeight = doc.height();
            var documentTimer = null;
            var documentDelay = 2000;

            // I determine if the window dimension events
            // (ie. resize, scroll) are currenlty being
            // monitored for changes.
            var isWatchingWindow = false;


            // ---
            // PUBLIC METHODS.
            // ---


            // I start monitoring the given image for visibility
            // and then render it when necessary.
            function addImage(image) {
                images.push(image);
                if (!renderTimer) {
                    startRenderTimer();
                }

                if (!isWatchingWindow) {
                    startWatchingWindow();
                }
            }


            // I remove the given image from the render queue.
            function removeImage(image) {
                // Remove the given image from the render queue.
                for (var i = 0; i < images.length; i++) {
                    if (images[i] === image) {
                        images.splice(i, 1);
                        break;
                    }
                }

                // If removing the given image has cleared the
                // render queue, then we can stop monitoring
                // the window and the image queue.
                if (!images.length) {
                    clearRenderTimer();
                    stopWatchingWindow();
                }
            }

            // ---
            // PRIVATE METHODS.
            // ---

            // I check the document height to see if it's changed.
            function checkDocumentHeight() {
                // If the render time is currently active, then
                // don't bother getting the document height -
                // it won't actually do anything.
                if (renderTimer) {
                    return;
                }
                var currentDocumentHeight = doc.height();
                // If the height has not changed, then ignore -
                // no more images could have come into view.
                if (currentDocumentHeight === documentHeight) {
                    return;
                }

                // Cache the new document height.
                documentHeight = currentDocumentHeight;
                startRenderTimer();
            }

            // I check the lazy-load images that have yet to
            // be rendered.
            function checkImages() {
                var visible = [];
                var hidden = [];

                // Determine the window dimensions.
                var windowHeight = win.height();
                var scrollTop = win.scrollTop();

                // Calculate the viewport offsets.
                var topFoldOffset = scrollTop;
                var bottomFoldOffset = (topFoldOffset + windowHeight);

                // Query the DOM for layout and seperate the
                // images into two different categories: those
                // that are now in the viewport and those that
                // still remain hidden.
                for (var i = 0; i < images.length; i++) {
                    var image = images[i];
                    if (image.isVisible(topFoldOffset, bottomFoldOffset)) {
                        visible.push(image);
                    } else {
                        hidden.push(image);
                    }
                }

                // Update the DOM with new image source values.
                for (var j = 0; j < visible.length; j++) {
                    visible[j].render();
                }

                // Keep the still-hidden images as the new
                // image queue to be monitored.
                images = hidden;

                // Clear the render timer so that it can be set
                // again in response to window changes.
                clearRenderTimer();

                // If we've rendered all the images, then stop
                // monitoring the window for changes.
                if (!images.length) {
                    stopWatchingWindow();
                }
            }


            // I clear the render timer so that we can easily
            // check to see if the timer is running.
            function clearRenderTimer() {
                clearTimeout(renderTimer);
                renderTimer = null;
            }

            // I start the render time, allowing more images to
            // be added to the images queue before the render
            // action is executed.
            function startRenderTimer() {
                renderTimer = setTimeout(checkImages, renderDelay);
            }

            // I start watching the window for changes in dimension.
            function startWatchingWindow() {
                isWatchingWindow = true;
                // Listen for window changes.
                win.on("resize.bnLazySrc", windowChanged);
                win.on("scroll.bnLazySrc", windowChanged);
                // Set up a timer to watch for document-height changes.
                documentTimer = setInterval(checkDocumentHeight, documentDelay);
            }

            // I stop watching the window for changes in dimension.
            function stopWatchingWindow() {
                isWatchingWindow = false;
                // Stop watching for window changes.
                win.off("resize.bnLazySrc");
                win.off("scroll.bnLazySrc");
                // Stop watching for document changes.
                clearInterval(documentTimer);
            }

            // I start the render time if the window changes.
            function windowChanged() {
                if (!renderTimer) {
                    startRenderTimer();
                }
            }
            // Return the public API.
            return ({
                addImage: addImage,
                removeImage: removeImage
            });
        })();

        // I represent a single lazy-load image.
        function LazyImage(element) {
            // I am the interpolated LAZY SRC attribute of
            // the image as reported by AngularJS.
            var source = null;

            // I determine if the image has already been
            // rendered (ie, that it has been exposed to the
            // viewport and the source had been loaded).
            var isRendered = false;

            // I am the cached height of the element. We are
            // going to assume that the image doesn't change
            // height over time.
            var height = null;

            // I determine if the element is above the given
            // fold of the page.
            function isVisible(topFoldOffset, bottomFoldOffset) {
                // If the element is not visible because it
                // is hidden, don't bother testing it.
                if (!element.is(":visible")) {
                    return (false);
                }

                // If the height has not yet been calculated,
                // the cache it for the duration of the page.
                if (height === null) {
                    height = element.height();
                }

                // Update the dimensions of the element.
                var top = element.offset().top;
                var bottom = (top + height);

                // Return true if the element is:
                // 1. The top offset is in view.
                // 2. The bottom offset is in view.
                // 3. The element is overlapping the viewport.
                return (
                    (
                        (top <= bottomFoldOffset) &&
                        (top >= topFoldOffset)
                    ) ||
                    (
                        (bottom <= bottomFoldOffset) &&
                        (bottom >= topFoldOffset)
                    ) ||
                    (
                        (top <= topFoldOffset) &&
                        (bottom >= bottomFoldOffset)
                    )
                );
            }
            // I move the cached source into the live source.
            function render() {
                isRendered = true;
                renderSource();
            }
            // I set the interpolated source value reported
            // by the directive / AngularJS.
            function setSource(newSource) {
                source = newSource;
                if (isRendered) {
                    renderSource();
                }
            }
            // I load the lazy source value into the actual
            // source value of the image element.
            function renderSource() {
                element[0].src = source;
            }
            // Return the public API.
            return ({
                isVisible: isVisible,
                render: render,
                setSource: setSource
            });
        }
        // I bind the UI events to the scope.
        function link($scope, element, attributes) {
            var lazyImage = new LazyImage(element);
            // Start watching the image for changes in its
            // visibility.
            lazyLoader.addImage(lazyImage);
            // Since the lazy-src will likely need some sort
            // of string interpolation, we don't want to
            attributes.$observe(
                "bnLazySrc",
                function(newSource) {
                    lazyImage.setSource(newSource);
                }
            );
            // When the scope is destroyed, we need to remove
            // the image from the render queue.
            $scope.$on(
                "$destroy",
                function() {
                    lazyLoader.removeImage(lazyImage);
                }
            );
        }
        // Return the directive configuration.
        return ({
            link: link,
            restrict: "A"
        });
    }])
    .directive("markable", function() {
        return {
            link: function(scope, elem, attrs) {
                elem.on("click", function() {
                    elem.toggleClass("done");
                });
            }
        };
    })
    .directive('countryCodeSelect', ['$parse', function($parse) {
        return {
            restrict: 'E',
            template: '<md-select ng-multiple="false" md-on-close="clearSearchTerm()" md-container-class="event-form-select md-icon-float md-icon-right ht-48" class="countryDropdown"><md-select-header class="demo-select-header" ng-hide="true"><input ng-model="searchTerm" onkeydown="event.stopPropagation()" type="text" placeholder="Search Country" class="demo-header-searchbox"></md-select-header><md-option ng-value="{{items.value}}" ng-selected="{{items.value === countryCodeValue}}" ng-repeat="items in countries | filter:{ key: searchTerm}"><span class="country-iso2">{{items.key}}</span> <span id="countryCodeValue">{{items.value}}</span></md-option></md-select>',
            replace: true,
            link: function(scope, elem, attrs) {
                var assignCountry;
                scope.countries = [
                    { key: "AF", value: "+93" },
                    { key: "AX", value: "+358" },
                    { key: "AL", value: "+355" },
                    { key: "DZ", value: "+213" },
                    { key: "AS", value: "+1684" },
                    { key: "AD", value: "+376" },
                    { key: "AO", value: "+244" },
                    { key: "AI", value: "+1264" },
                    { key: "AQ", value: "+672" },
                    { key: "AG", value: "+1268" },
                    { key: "AR", value: "+54" },
                    { key: "AM", value: "+374" },
                    { key: "AW", value: "+297" },
                    { key: "AU", value: "+61" },
                    { key: "AT", value: "+43" },
                    { key: "AZ", value: "+994" },
                    { key: "BS", value: "+1242" },
                    { key: "BH", value: "+973" },
                    { key: "BD", value: "+880" },
                    { key: "BB", value: "+1246" },
                    { key: "BY", value: "+375" },
                    { key: "BE", value: "+32" },
                    { key: "BZ", value: "+501" },
                    { key: "BJ", value: "+229" },
                    { key: "BM", value: "+1441" },
                    { key: "BT", value: "+975" },
                    { key: "BO", value: "+591" },
                    { key: "BA", value: "+387" },
                    { key: "BW", value: "+267" },
                    { key: "BV", value: "+47" },
                    { key: "BR", value: "+55" },
                    { key: "IO", value: "+246" },
                    { key: "BN", value: "+673" },
                    { key: "BG", value: "+359" },
                    { key: "BF", value: "+226" },
                    { key: "BI", value: "+257" },
                    { key: "KH", value: "+855" },
                    { key: "CM", value: "+237" },
                    { key: "CV", value: "+238" },
                    { key: "KY", value: "+345" },
                    { key: "CF", value: "+236" },
                    { key: "TD", value: "+235" },
                    { key: "CL", value: "+56" },
                    { key: "CN", value: "+86" },
                    { key: "CX", value: "+61" },
                    { key: "CC", value: "+61" },
                    { key: "CO", value: "+57" },
                    { key: "KM", value: "+269" },
                    { key: "CG", value: "+242" },
                    { key: "CD", value: "+243" },
                    { key: "CK", value: "+682" },
                    { key: "CR", value: "+506" },
                    { key: "CI", value: "+225" },
                    { key: "HR", value: "+385" },
                    { key: "CU", value: "+53" },
                    { key: "CY", value: "+357" },
                    { key: "CZ", value: "+420" },
                    { key: "DK", value: "+45" },
                    { key: "DJ", value: "+253" },
                    { key: "DM", value: "+1767" },
                    { key: "DO", value: "+1849" },
                    { key: "EC", value: "+593" },
                    { key: "EG", value: "+20" },
                    { key: "SV", value: "+503" },
                    { key: "GQ", value: "+240" },
                    { key: "ER", value: "+291" },
                    { key: "EE", value: "+372" },
                    { key: "ET", value: "+251" },
                    { key: "FK", value: "+500" },
                    { key: "FO", value: "+298" },
                    { key: "FJ", value: "+679" },
                    { key: "FI", value: "+358" },
                    { key: "FR", value: "+33" },
                    { key: "GF", value: "+594" },
                    { key: "PF", value: "+689" },
                    { key: "TF", value: "+262" },
                    { key: "GA", value: "+241" },
                    { key: "GM", value: "+220" },
                    { key: "GE", value: "+995" },
                    { key: "DE", value: "+49" },
                    { key: "GH", value: "+233" },
                    { key: "GI", value: "+350" },
                    { key: "GR", value: "+30" },
                    { key: "GL", value: "+299" },
                    { key: "GD", value: "+1473" },
                    { key: "GP", value: "+590" },
                    { key: "GU", value: "+1671" },
                    { key: "GT", value: "+502" },
                    { key: "GG", value: "+44" },
                    { key: "GN", value: "+224" },
                    { key: "GW", value: "+245" },
                    { key: "GY", value: "+592" },
                    { key: "HT", value: "+509" },
                    { key: "HM", value: "+672" },
                    { key: "VA", value: "+379" },
                    { key: "HN", value: "+504" },
                    { key: "HK", value: "+852" },
                    { key: "HU", value: "+36" },
                    { key: "IS", value: "+354" },
                    { key: "IN", value: "+91" },
                    { key: "ID", value: "+62" },
                    { key: "IR", value: "+98" },
                    { key: "IQ", value: "+964" },
                    { key: "IE", value: "+353" },
                    { key: "IM", value: "+44" },
                    { key: "IL", value: "+972" },
                    { key: "IT", value: "+39" },
                    { key: "JM", value: "+1876" },
                    { key: "JP", value: "+81" },
                    { key: "JE", value: "+44" },
                    { key: "JO", value: "+962" },
                    { key: "KZ", value: "+7" },
                    { key: "KE", value: "+254" },
                    { key: "KI", value: "+686" },
                    { key: "KP", value: "+850" },
                    { key: "KR", value: "+82" },
                    { key: "XK", value: "+383" },
                    { key: "KW", value: "+965" },
                    { key: "KG", value: "+996" },
                    { key: "LA", value: "+856" },
                    { key: "LV", value: "+371" },
                    { key: "LB", value: "+961" },
                    { key: "LS", value: "+266" },
                    { key: "LR", value: "+231" },
                    { key: "LY", value: "+218" },
                    { key: "LI", value: "+423" },
                    { key: "LT", value: "+370" },
                    { key: "LU", value: "+352" },
                    { key: "MO", value: "+853" },
                    { key: "MK", value: "+389" },
                    { key: "MG", value: "+261" },
                    { key: "MW", value: "+265" },
                    { key: "MY", value: "+60" },
                    { key: "MV", value: "+960" },
                    { key: "ML", value: "+223" },
                    { key: "MT", value: "+356" },
                    { key: "MH", value: "+692" },
                    { key: "MQ", value: "+596" },
                    { key: "MR", value: "+222" },
                    { key: "MU", value: "+230" },
                    { key: "YT", value: "+262" },
                    { key: "MX", value: "+52" },
                    { key: "FM", value: "+691" },
                    { key: "MD", value: "+373" },
                    { key: "MC", value: "+377" },
                    { key: "MN", value: "+976" },
                    { key: "ME", value: "+382" },
                    { key: "MS", value: "+1664" },
                    { key: "MA", value: "+212" },
                    { key: "MZ", value: "+258" },
                    { key: "MM", value: "+95" },
                    { key: "NA", value: "+264" },
                    { key: "NR", value: "+674" },
                    { key: "NP", value: "+977" },
                    { key: "NL", value: "+31" },
                    { key: "AN", value: "+599" },
                    { key: "NC", value: "+687" },
                    { key: "NZ", value: "+64" },
                    { key: "NI", value: "+505" },
                    { key: "NE", value: "+227" },
                    { key: "NG", value: "+234" },
                    { key: "NU", value: "+683" },
                    { key: "NF", value: "+672" },
                    { key: "MP", value: "+1670" },
                    { key: "NO", value: "+47" },
                    { key: "OM", value: "+968" },
                    { key: "PK", value: "+92" },
                    { key: "PW", value: "+680" },
                    { key: "PS", value: "+970" },
                    { key: "PA", value: "+507" },
                    { key: "PG", value: "+675" },
                    { key: "PY", value: "+595" },
                    { key: "PE", value: "+51" },
                    { key: "PH", value: "+63" },
                    { key: "PN", value: "+64" },
                    { key: "PL", value: "+48" },
                    { key: "PT", value: "+351" },
                    { key: "PR", value: "+1939" },
                    { key: "QA", value: "+974" },
                    { key: "RO", value: "+40" },
                    { key: "RU", value: "+7" },
                    { key: "RW", value: "+250" },
                    { key: "RE", value: "+262" },
                    { key: "BL", value: "+590" },
                    { key: "SH", value: "+290" },
                    { key: "KN", value: "+1869" },
                    { key: "LC", value: "+1758" },
                    { key: "MF", value: "+590" },
                    { key: "PM", value: "+508" },
                    { key: "VC", value: "+1784" },
                    { key: "WS", value: "+685" },
                    { key: "SM", value: "+378" },
                    { key: "ST", value: "+239" },
                    { key: "SA", value: "+966" },
                    { key: "SN", value: "+221" },
                    { key: "RS", value: "+381" },
                    { key: "SC", value: "+248" },
                    { key: "SL", value: "+232" },
                    { key: "SG", value: "+65" },
                    { key: "SK", value: "+421" },
                    { key: "SI", value: "+386" },
                    { key: "SB", value: "+677" },
                    { key: "SO", value: "+252" },
                    { key: "ZA", value: "+27" },
                    { key: "SS", value: "+211" },
                    { key: "GS", value: "+500" },
                    { key: "ES", value: "+34" },
                    { key: "LK", value: "+94" },
                    { key: "SD", value: "+249" },
                    { key: "SR", value: "+597" },
                    { key: "SJ", value: "+47" },
                    { key: "SZ", value: "+268" },
                    { key: "SE", value: "+46" },
                    { key: "CH", value: "+41" },
                    { key: "SY", value: "+963" },
                    { key: "TW", value: "+886" },
                    { key: "TJ", value: "+992" },
                    { key: "TZ", value: "+255" },
                    { key: "TH", value: "+66" },
                    { key: "TL", value: "+670" },
                    { key: "TG", value: "+228" },
                    { key: "TK", value: "+690" },
                    { key: "TO", value: "+676" },
                    { key: "TT", value: "+1868" },
                    { key: "TN", value: "+216" },
                    { key: "TR", value: "+90" },
                    { key: "TM", value: "+993" },
                    { key: "TC", value: "+1649" },
                    { key: "TV", value: "+688" },
                    { key: "UG", value: "+256" },
                    { key: "UA", value: "+380" },
                    { key: "AE", value: "+971" },
                    { key: "GB", value: "+44" },
                    { key: "US", value: "+1" },
                    { key: "UY", value: "+598" },
                    { key: "UZ", value: "+998" },
                    { key: "VU", value: "+678" },
                    { key: "VE", value: "+58" },
                    { key: "VN", value: "+84" },
                    { key: "VG", value: "+1284" },
                    { key: "VI", value: "+1340" },
                    { key: "WF", value: "+681" },
                    { key: "YE", value: "+967" },
                    { key: "ZM", value: "+260" },
                    { key: "ZW", value: "+263" }
                ];
                if (!!attrs.ngModel) {
                    assignCountry = $parse(attrs.ngModel).assign;
                    elem.bind('change', function(e) {
                        return assignCountry(e.val());
                    });
                    return scope.$watch(attrs.ngModel, function(country) {
                        return elem.val(country);
                    });
                }
            }
        };
    }])
    .directive('ldjson', ['$sce', '$filter', function($sce, $filter) {
        return {
            restrict: 'EA',
            scope: {
                info: "=info"
            },
            link: function(scope, element) {
                setTimeout(function() {
                    var vals = $sce.trustAsHtml($filter('json')(scope.info));
                    element[0].outerHTML = '<script type="application/ld+json">' + vals + '</script>';
                }, 1700);
            }
        };
    }])
    .directive('flashMessageTemplate', function() {
        return {
            restrict: 'E',
            templateUrl: 'partials/manageEvent/flashMessage.html'
        };
    })
    .directive('setClassWhenAtTop', function($window) {
        var $win = angular.element($window); // wrap window object as jQuery object
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                var topClass = attrs.setClassWhenAtTop, // get CSS class from directive's attribute value
                    offsetTop = element.offset().top + 100; // get element's offset top relative to document

                $win.on('scroll', function(e) {
                    if ($win.scrollTop() >= offsetTop) {
                        element.addClass(topClass);
                    } else {
                        element.removeClass(topClass);
                    }
                });
            }
        };
    })
    .directive('loader', ['$timeout', function($timeout) {
        return {
            scope: {
                working: '=',
                progressPercentage: '=?',
                message: '=?',
                disableBackground: '@?'
            },
            restrict: 'AE',
            replace: true,
            templateUrl: function(tElem, tAttrs) {
                return '../../partials/loader/template1.html';
            },
            link: function(scope, elem, attrs) {
                scope.disableBackground = scope.$eval(scope.disableBackground);

                if (scope.disableBackground === true) {
                    elem.css({
                        'background': 'rgba(0,0,0,0.1)',
                        'z-index': '9999'
                    });
                } else if (scope.disableBackground === undefined) {} else {
                    console.error('Directive Error! Attribute \'disable-background\' must be \'true\' for \'false\'. Found \'' + scope.disableBackground + '\'');
                }

                var content = elem.find('div')[0];

                function positionLoader(watchFunction) {
                    $timeout(function() {
                        content.style.marginTop = -(content.offsetHeight / 2) + 'px';
                        content.style.marginLeft = -(content.offsetWidth / 2) + 'px';
                    });
                }

                var positionWatch = scope.$watch('working', function(newValue, oldValue) {
                    if (newValue === true) {
                        positionLoader(positionWatch);
                    }
                });

                var messageWatch = scope.$watch('message', function(newValue, oldValue) {
                    if (newValue != oldValue) {
                        positionLoader(messageWatch);
                    }
                });
            }
        };
    }]).directive('numbersOnly', function() {
        return {
            restrict: 'EA',
            scope: {
                info: "=info"
            },
            require: 'ngModel',
            link: function(scope, element, attr, ngModelCtrl) {
                function fromUser(text) {
                    if (text) {
                        text = text.toString();
                        var transformedInput = text.replace(/[^0-9]/g, '');
                        if (transformedInput !== text) {
                            ngModelCtrl.$setViewValue(transformedInput);
                            ngModelCtrl.$render();
                        }
                        return transformedInput;
                    }
                    return undefined;
                }
                ngModelCtrl.$parsers.push(fromUser);
            }
        };
    })
    .directive('disableIt', disableIt);
disableIt.$inject = [];

function disableIt() {
    var DDO = {
        restrict: 'A',
        link: function(scope, element, attrs) {
            // Firefox: DOMMouseScroll
            // IE9, Chrome, Safari, Opera: mousewheel
            if (attrs.mousewheel) {
                handleEvent('DOMMouseScroll mousewheel keydown');
            } else if (attrs.mousewheel) {
                handleEvent('DOMMouseScroll mousewheel');
                handleEvent('keydown');
            } else {
                throw new Error("Please give the boolean values to  mousewheel properties");
            }

            function handleEvent(ev) {
                var code = null;
                element.on('focus', function(event) {
                    element.on(ev, function(e) {
                        if (e.type === 'keydown') {
                            code = (e.keyCode ? e.keyCode : e.which);
                            if (code === 38 || code === 40) {
                                e.preventDefault();
                            }
                        } else {
                            e.preventDefault();
                        }

                    });
                }).on('blur', function(e) {
                    element.off(ev);
                });
            }

        }
    };

    return DDO;
}