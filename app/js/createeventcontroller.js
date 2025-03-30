angular.module('PromoApp')
    .controller('CreateEventController', ['$rootScope', '$filter', '$scope', 'qbService', 'eventsService', 'notificationService', 'userService', '$route', '$location', 'config', '$window', '$uibModal', 'authService', 'Utils', 'awsService', 'phqservice', '$uibModalStack',
        function($rootScope, $filter, $scope, qbService, eventsService, notificationService, userService, $route, $location, config, $window, $uibModal, authService, Utils, awsService, phqservice, $uibModalStack, $uibModalInstance) {
            $scope.locationPlaceholder = "i.e. The Broadway theatre,1681 Broadway,New York,NY";
            $scope.defaultEventImage = '../img/unnamed.png';
            const DATE_FORMAT = "dddd, MMMM DD, hh:mm a";
            $scope.categories = Object.values(JSON.parse(JSON.stringify(config.CATEGORIES)));
            $scope.categoryLang = {
                selectAll: "Tick all",
                selectNone: "Select none",
                reset: "Undo all",
                search: "Type here to search...",
                nothingSelected: "Select Category" //default-label is deprecated and replaced with this.
            };

            $scope.invitePeopleLang = {
                selectAll: "Tick all",
                selectNone: "Select none",
                reset: "Undo all",
                search: "Type here to search...",
                nothingSelected: "Invite People" //default-label is deprecated and replaced with this.
            };
            $scope.addAdminLang = {
                selectAll: "Tick all",
                selectNone: "Select none",
                reset: "Undo all",
                search: "Type here to search...",
                nothingSelected: "Add Admin" //default-label is deprecated and replaced with this.
            };

            $scope.pattern = {
                'website': '^(http[s]?:\\\\/\\\\/){0,1}(www\\\\.){0,1}[a-zA-Z0-9\\\\.\\\\-]+\\\\.[a-zA-Z]{2,5}[\\\\.]{0,1}$',
                'phone': '[\\+]?\\d{10}|\\(\\d{3}\\)\\s?-\\d{8}'
            };
            $scope.timeList = ['12:00am', '12:30am', '01:00am', '01:30am', '02:00am', '02:30am', '03:00am', '03:30am', '04:00am', '04:30am', '05:00am', '05:30am',
                '06:00am', '06:30am', '07:00am', '07:30am', '08:00am', '08:30am', '09:00am', '09:30am', '10:00am', '10:30am', '11:00am', '11:30am',
                '12:00pm', '12:30pm', '01:00pm', '01:30pm', '02:00pm', '02:30pm', '03:00pm', '03:30pm', '04:00pm', '04:30pm', '05:00pm', '05:30pm',
                '06:00pm', '06:30pm', '07:00pm', '07:30pm', '08:00pm', '08:30pm', '09:00pm', '09:30pm', '10:00pm', '10:30pm', '11:00pm', '11:30pm'
            ];

            $scope.payPalUrl = config.PAYPAL_BASE_URL;

            $scope.displayEvent = {
                event_id: 0,
                start: {
                    date: null,
                    time: moment.utc().startOf('day')
                        /*isOpenStartDate: false,
                        isOpenStartTime: false*/
                },
                end: {
                    date: null,
                    time: moment.utc().startOf('day')
                        /* isOpenEndDate: false,
                         isOpenEndTime: false,*/
                },
                event_name: null,
                chosenPlace: null,
                description: null,
                files: null,
                website: null,
                email: null,
                phone: null,
                sponsored_event: false,
                plan: null,
                event_type: "private",
                friends: [],
                admins: [],
                selectedAdmins: [],
                selectedFriends: [],
                selectedCategory: [],
                draft: false,
                coupon: null,
                stripeToken: null,
                isdraft: false,
                isPHQ: false,
                ticketType: null

            };
            $scope.tickets = {
                name: null,
                description: null,
                quantity: null,
                remQuantity: null,
                price: null
            };
            $scope.user = null;
            $scope.plans = [];
            $scope.showSection = 'createAndClaim';
            const stripe = Stripe(config.STRIPE_KEY);
            const elements = stripe.elements(Utils.stripeInitElements());
            $scope.validationErrors = false;
            $scope.selectedPlan = null;
            $scope.isStripeInitialize = false;
            $scope.isSubmit = false;

            // $scope.show=false;
            $scope.minDate = moment.utc();
            $scope.disableLocation = false;
            $scope.imageSelected = false;
            $scope.croppedImage = null;
            $scope.imageForCropping = null;
            $scope.isPlanSelected = false;
            $scope.disablePay = false;
            let userSession = authService.getSession();
            $scope.showCreateButton = false;
            $scope.showPayPlans = true;
            $scope.showCurrentPlanDiv = false;
            $scope.coupon = null;
            $scope.disableSponsered = false;
            let pos = null;
            $scope.files = null;
            let card = null;
            $scope.stripeInitializeCount = 0;
            $scope.ticketsArr = [];
            $scope.model = {
                email: null,
                showChangePayPalSec: false
            };
            $scope.buttonText = 'Change';
            //for coupon
            $scope.validateCoupon = function() {
                console.log('Inside validateCoupon', $scope.coupon);
                if ($scope.coupon && $scope.coupon.trim() != '') {
                    // Make call to API
                    return awsService.getCoupon($scope.coupon)
                        .then((coupon) => {
                            return Promise.resolve(coupon.data);
                        })
                        .catch((err) => {
                            console.log(err);
                            let message = MESSAGES.SOMETHING_WENT_WRONG;
                            if (err && err.data && err.data.message) {
                                message = err.data.message;
                            }
                            Utils.showError($scope, message);
                            return Promise.reject(message);
                        });
                } else {
                    return Promise.resolve(null);
                }
            };

            //for checking the gateway id exists or not
            let loadUserCurrentPlan = function() {
                return userService.getGatewayId($scope.user)
                    .then(res => {
                        console.log('Response of getting gateway id on load is::', res);
                        if (res && 'gateway_id' in res) {
                            $scope.user.gateway_id = res.gateway_id;
                        }
                        if (res && 'current_plan_id' in res && res.current_plan_id) {
                            $scope.user.selectedPlan = config.PLANS.filter(p => p.id === res.current_plan_id)[0];

                            //check if user is on paid plan then call getActiveTickets

                            if ($scope.user.selectedPlan && $scope.user.selectedPlan.id == 'basic') {

                                $scope.getActiveTickets();
                            }

                            // Check if user is on any frequency based plan
                            let subscriptionPlan = getSubscriptionBasedPlans();
                            if (res.current_plan_id in subscriptionPlan) {
                                $scope.displayEvent.plan = $scope.user.selectedPlan;
                                if ($scope.action === 'Claim') {
                                    $scope.selectedPlan = $scope.user.selectedPlan;
                                }
                                $scope.displayEvent.sponsored_event = true;
                            }
                        }
                        if ($scope.action !== 'Create' && $scope.editableEvent && !$scope.displayEvent.plan) {
                            return userService.getClaimHistory($scope.user.id);
                        } else {
                            return Promise.reject("No need to get claim history");
                        }
                    }).then(res => {
                        console.log('claimed history of user is', res);
                        if (res && res.length > 0) {
                            // Check if current event is one which was already claimed by the user
                            let currentEvent = res.filter(r => r.event_id === $scope.editableEvent.id);
                            console.log('current event', currentEvent);
                            if (currentEvent && currentEvent.length > 0) {
                                $scope.displayEvent.plan = config.PLANS.filter(p => p.id == currentEvent[0].plan_id)[0];
                                $scope.displayEvent.sponsored_event = true;
                            }
                        }
                        return Promise.resolve();
                    })
                    .catch(err => {
                        console.log('error in getting gateway id on load is::', err);
                        return Promise.resolve();
                    });
            };

            $scope.selectPlan = function(plan) {
                if (plan.checked) {
                    $scope.selectedPlan = plan;
                    // Check if user is on unlimited plan. No need to render stripe elements instead tell user about his current plan
                    if (!$scope.user.selectedPlan) {
                        $scope.initStripe();
                    }
                } else {
                    $scope.selectedPlan = null;
                }
            };

            $scope.initStripe = function() {
                // Custom styling can be passed to options when creating an Element.
                if (!$scope.isStripeInitialize) {
                    let style = Utils.stripeStyle();

                    // Create an instance of the card Element.
                    card = elements.create('cardNumber', { style: style });

                    // Add an instance of the card Element into the `card-element` <div>.
                    card.mount('#card-element');

                    let cardExpiry = elements.create('cardExpiry', { style: style });
                    cardExpiry.mount('#card-expiry');

                    let cardCvc = elements.create('cardCvc', {
                        style: style,
                        placeholder: '012',
                        classes: { base: 'cvc-code-img' }
                    });
                    cardCvc.mount('#card-cvc');

                    card.addEventListener('change', function(event) {
                        //  var displayError = document.getElementById('card-errors');
                        if (event.error) {
                            Utils.showError($scope, event.error.message);
                            $scope.validationErrors = true;
                        } else {
                            $scope.validationErrors = false;
                        }
                    });
                    $scope.isStripeInitialize = true;
                }

                /*  var form = document.getElementById('pay-btn');
                  form.addEventListener('click', function (event) {
                      event.preventDefault();
                      $scope.disablePay = false;
  
                      $scope.validateCoupon()
                          .then((coupon) => {
                              $scope.disablePay = true;
                              $scope.loading = true;
                              stripe.createToken(card).then(function (result) {
                                  if (result.error) {
                                      // Inform the customer that there was an error.
                                      // var errorElement = document.getElementById('card-errors');
                                      // errorElement.textContent = result.error.message;
                                      Utils.showError($scope, result.error.message);
                                      $scope.disablePay = false;
                                  } else {
                                      if (coupon) {
                                          Utils.showSuccess($scope, 'Successfully applied coupon', 'Congratulations');
                                      }
                                      if (!$scope.selectedPlan.frequency) {
                                          let currrentTime = moment.utc().valueOf();
                                          if (coupon && coupon.amount_off && coupon.valid) {
                                              $scope.selectedPlan.amount = (($scope.selectedPlan.amount * 100) - coupon.amount_off) / 100;
                                          }
                                          if (coupon && coupon.percent_off && coupon.valid) {
                                              $scope.selectedPlan.amount = ($scope.selectedPlan.amount - (($scope.selectedPlan.amount * coupon.percent_off) / 100)) / 100;
                                          }
                                      }
                                  }
                              });
                          })
                          .catch((err) => {
                              console.log(err);
                          });
                  });*/
            };
            $scope.sendCouponDataToServer = function() {
                // Send the token to your server.
                $scope.isSubmit = true;
                console.log($scope.displayEvent.stripeToken.token);
                let data = {
                    "token": $scope.displayEvent.stripeToken.token.id,
                    "amount": $scope.selectedPlan.amount,
                    "description": $scope.selectedPlan.subtitle,
                    "user_id": $scope.user.id,
                    "plan_id": $scope.selectedPlan.id
                };
                if ($scope.user.gateway_id) {
                    data.gateway_id = $scope.user.gateway_id;
                }
                if ($scope.displayEvent.coupon) {
                    data.coupon = $scope.displayEvent.coupon.id;
                    data.times_redeemed = (parseInt($scope.displayEvent.coupon.metadata.times_redeemed) + 1) || 1;
                }
                if ($scope.selectedPlan.frequency) {
                    data.subscription = true;
                }
                awsService.completeTransaction(data, $scope.user.id)
                    .then(res => {
                        console.log('payment success', res);
                        let update = false;
                        if (res.data.customerID) {
                            if ($scope.user.gateway_id === res.data.customerID) {
                                update = true;
                            }
                        }
                        return Promise.resolve();

                    })
                    .then((res) => {
                        Utils.showSuccess($scope, 'Payment is successful', 'Congratulations');
                        $scope.isSubmit = false;
                        $scope.loading = false;
                        authService.remove('gatewayID');
                        $scope.createEvent(false);
                    })
                    .catch(err => {
                        console.log('error in making payment is::', err);
                        Utils.showError($scope, MESSAGES.CLAIM_ERROR);
                        $scope.disablePay = false;
                        $scope.loading = false;
                    });
            };

            let createNewEvent = (data) => {
                let finalResponse = null;
                return eventsService.createEvent(data, userSession).then(response => {
                        finalResponse = response;
                        console.log(response);
                        if (response.status == 200) {
                            let data = response.data;
                            if (data.success) {
                                if ('data' in data) {
                                    let user = data.data;
                                }
                            }
                        }

                        /* let newEvent = Utils.mapQBEventToControllerEvent(response);
                         if ($scope.selectedPlan) {
                             claimEvent(newEvent, $scope.selectedPlan);
                         }
                         // If event image is present then upload else do not upload the file
                         if ($scope.displayEvent.files) {
                             let blob = dataURItoBlob($scope.croppedImage);
                             let file = new File([blob], 'eventImage.png');
                             let fileParam = {
                                 id: res._id,
                                 field_name: "event_image",
                                 file: file
                             };
                             return eventsService.uploadEvntImg(fileParam, (userSession));
                         } else {
                             return Promise.resolve(res);
                         }*/
                    })
                    .then((response) => {
                        /*if (response && response.file_id) {
                            finalResponse.image_url = eventsService.getFileUrl({
                                id: finalResponse._id,
                                field_name: 'event_image' //r.event_name
                            });
                        }*/
                        return Promise.resolve(finalResponse);
                    });
            };

            let editOldEvent = (data) => {
                if ($scope.displayEvent.event_id) {
                    return eventsService.editEvent($scope.displayEvent.event_id, data, userSession).then(res => {
                        console.log(res);
                        // If event image is present then upload else do not upload the file
                        if ($scope.displayEvent.files && !$scope.displayEvent.files.startsWith('http')) {
                            let blob = dataURItoBlob($scope.croppedImage);
                            let file = new File([blob], 'eventImage.png');
                            let fileParam = {
                                id: res._id,
                                field_name: "event_image",
                                file: file
                            };
                            return eventsService.uploadEvntImg(fileParam, (userSession))
                                .then((response) => {
                                    if (response && response.file_id) {
                                        res.image_url = eventsService.getFileUrl({
                                            id: res._id,
                                            field_name: 'event_image' //r.event_name
                                        });
                                    }
                                    return Promise.resolve(res);
                                });
                        } else {
                            return Promise.resolve(res);
                        }
                    });
                } else {
                    return Promise.reject('edit event failed!');
                }

            };

            let upsertEvent = (data) => {
                if ($scope.action === 'Claim') {
                    if (!data.id) {
                        data.id = $scope.displayEvent.event_id;
                    }
                    if (!('image_url' in data) && 'image_url' in $scope.displayEvent) {
                        data.image_url = $scope.displayEvent.image_url;
                    }
                    return claimEvent((data || $scope.editableEvent), $scope.selectedPlan)
                        .then(res => {
                            return editOldEvent(data || $scope.editableEvent);
                        });
                } else if ($scope.action === 'Create') {
                    return createNewEvent(data);
                } else if ($scope.action === 'Edit') {
                    return editOldEvent(data);
                }
            };

            let getSubscriptionBasedPlans = function() {
                let subscriptionBasedPlans = config.PLANS.filter(p => p.frequency);
                let subscriptionPlans = {};
                for (let plan of subscriptionBasedPlans) {
                    subscriptionPlans[plan.id] = plan;
                }
                return subscriptionPlans;
            };

            //convert event into controller event and save to local storage
            const convertAndSaveNewEvent = function(event) {
                let newEvent = Utils.mapQBEventToControllerEvent(event);
                let events = $window.localStorage.getItem("events");
                if (events) {
                    events = JSON.parse(events);
                    events = events.filter(e => e.id != newEvent.id);
                    let lastLoc = authService.getObject('lastSearchedLocation');
                    events.push(newEvent);
                    saveEventsInLocalStorage(events);
                }
            };

            //for claiming the event and saving its detail in QB
            let claimEvent = function(event, plan) {
                let user = authService.getUser();
                if (!event.phqEvent) {
                    event.title = event.event_name;
                }
                if (user) {
                    return eventsService.claimEvent(event, user, plan)
                        .then(res => {
                            Utils.showSuccess($scope, MESSAGES.CLAIM_SUCCESS);
                            //for converting QB event to controller based event
                            convertAndSaveNewEvent(res);
                            return Promise.resolve(res);
                        }).catch(err => {
                            console.log('error in claiming event is:', err);
                            Utils.showError($scope, MESSAGES.CLAIM_ERROR);
                        });
                } else {
                    $location.path('/');
                    Utils.showError($scope, MESSAGES.CLAIM_EVENT_NOT_LOGGED_IN);
                }
            };

            //fetch user's freinds
            $scope.setAdminFriends = function() {
                if ($scope.user && userSession) {
                    $scope.displayEvent.friends = [];
                    $scope.displayEvent.admins = [];
                    $scope.selectedAdmins = [];
                    $scope.selectedFriends = [];
                    userService.getFollowUsersDeatil($scope.user.id).then(res => {
                            res.forEach(function(element) {
                                if ('imgUrl' in element.user && element.user.imgUrl) {
                                    element.user.iconImage = `<img src=${element.user.imgUrl || '../img/defaultProfilePic.png'} alt='image' />`;

                                } else {
                                    element.user.iconImage = `<img src=${'../img/defaultProfilePic.png'} alt='image' />`;
                                }
                                $scope.displayEvent.friends.push(element.user);

                                $scope.displayEvent.admins.push(JSON.parse(JSON.stringify(element.user)));
                            }, this);

                            console.log('friends list :: ', $scope.displayEvent.friends);
                            console.log('admins list :: ', $scope.displayEvent.admins);
                            applyChanges();
                        })
                        .catch(err => {
                            console.log('friends list error :: ', err);
                        });
                }
            };

            $scope.getCurrentPos = () => {
                // Try HTML5 geolocation.
                if (navigator.geolocation) {
                    $scope.locationPlaceholder = 'Getting Location..';
                    $scope.disableLocation = true;
                    navigator.geolocation.getCurrentPosition(function(position) {
                        let geocoder = new google.maps.Geocoder();
                        geocoder.geocode({
                            'location': {
                                lat: position.coords.latitude,
                                lng: position.coords.longitude
                            }
                        }, function(results, status) {
                            $scope.locationPlaceholder = 'i.e. The Broadway theatre,1681 Broadway,New York,NY';
                            $scope.disableLocation = false;
                            let addr = null;
                            if (results[0]) {
                                addr = results[0].formatted_address;
                                $scope.displayEvent.chosenPlace = addr;
                            }
                            pos = {
                                address: addr,
                                lat: position.coords.latitude,
                                lng: position.coords.longitude
                            };
                            $scope.latitude = pos.lat;
                            $scope.longitude = pos.lng;
                            $scope.displayEvent.address = pos.addr;

                            $scope.$apply();
                        });
                    }, function() {
                        pos = {
                            address: null,
                            lat: null,
                            lng: null
                        };
                        $scope.locationPlaceholder = 'i.e. The Broadway theatre,1681 Broadway,New York,NY';
                        $scope.disableLocation = false;
                    });
                }

            };

            $scope.reset = function(form) {
                if (form) {
                    form.$setPristine();
                    form.$setUntouched();
                }
            };

            $scope.$on('mapWindowTabClicked', function(event, data) {
                console.log('Inside mapWindowTabClicked', data);
                if (authService.getSession()) {
                    $scope.showCreateButton = !data;
                } else {
                    $scope.showCreateButton = false;
                }
                console.log('showCreateButton', $scope.showCreateButton);
                applyChanges();
            });

            const applyChanges = function() {
                if (!$scope.$$phase) {
                    $scope.$apply();
                }
            };

            $scope.$watch('files', function() {
                $scope.imageRequiredMessage = false;
            });

            let addNotifications = function(res) {
                let notificationPromises = [];
                let notifiedForCreateEvents = [];
                // Get all the invites
                if ($scope.displayEvent.selectedFriends && $scope.displayEvent.selectedFriends.length > 0) {
                    $scope.displayEvent.selectedFriends.forEach((friend) => {
                        if (notifiedForCreateEvents.includes(friend.id) == -1) {
                            // Create event notification
                            let notificationData = {
                                notify_text: $scope.user.full_name + " " + "has " + $scope.action + " a new event" + " " + $scope.displayEvent.event_name,
                                notify_userId: friend.id,
                                _parent_id: res._id,
                                notif_type: 'CreateEvent'
                            };

                            notificationPromises.push(notificationService.createNotification(notificationData, JSON.parse(userSession)));
                            notifiedForCreateEvents.push(friend.id);
                        }

                        // Create event notification
                        let notificationInviteData = {
                            notify_text: $scope.user.full_name + " " + "has invited you to " + " " + $scope.displayEvent.event_name,
                            notify_userId: friend.id,
                            _parent_id: res._id,
                            notif_type: 'Invite'
                        };

                        notificationPromises.push(notificationService.createNotification(notificationInviteData, userSession));
                    });

                }

                // Get all the admins
                if ($scope.selectedAdmins && $scope.selectedAdmins.length > 0) {
                    $scope.selectedAdmins.forEach((admin) => {
                        if (notifiedForCreateEvents.includes(admin.id) == -1) {
                            // Create event notification
                            let notificationData = {
                                notify_text: $scope.user.full_name + " " + "has " + $scope.action + " a new event" + " " + $scope.displayEvent.event_name,
                                notify_userId: admin.id,
                                _parent_id: res._id,
                                notif_type: 'CreateEvent'
                            };
                            notificationPromises.push(notificationService.createNotification(notificationData, JSON.parse(userSession)));
                            notifiedForCreateEvents.push(admin.id);
                        }

                        // Create event notification
                        let notificationAdminData = {
                            notify_text: $scope.user.full_name + " " + "has selected you to become admin of the " + " " + $scope.displayEvent.event_name,
                            notify_userId: admin.id,
                            _parent_id: res._id,
                            notif_type: 'EventAdmin'
                        };
                        notificationPromises.push(notificationService.createNotification(notificationAdminData, JSON.parse(userSession)));
                    });

                }
                return Promise.all(notificationPromises);
            };

            $scope.createEvent = function(draft) {
                // Check if cookie present
                if ($scope.displayEvent.chosenPlace) {
                    pos = {
                        address: $scope.displayEvent.chosenPlace || pos.address,
                        lat: $scope.latitude || pos.lat,
                        lng: $scope.longitude || pos.lng
                    };
                }
                let adminIds = [];
                adminIds.push(parseInt(config.PROMO_ADMIN_ID));
                $scope.displayEvent.selectedAdmins.forEach(function(element) {
                    adminIds.push(element.id);
                }, this);
                adminIds.push($scope.user.id);

                let permissions = {
                    read: {
                        access: 'open'
                    },
                    update: {
                        access: 'open_for_users_ids',
                        ids: adminIds
                    },
                    delete: {
                        access: 'open_for_users_ids',
                        ids: adminIds
                    }
                };
                console.log($scope.start);
                $scope.displayEvent.start.date.set({
                    hour: $scope.displayEvent.start.time.hour(),
                    minute: $scope.displayEvent.start.time.minutes(),
                    second: $scope.displayEvent.start.time.seconds(),
                    millisecond: $scope.displayEvent.start.time.milliseconds()
                });
                $scope.displayEvent.end.date.set({
                    hour: $scope.displayEvent.end.time.hour(),
                    minute: $scope.displayEvent.end.time.minutes(),
                    second: $scope.displayEvent.end.time.seconds(),
                    millisecond: $scope.displayEvent.end.time.milliseconds()
                });

                let data = {
                    event_name: $scope.displayEvent.event_name,
                    description: $scope.displayEvent.description,
                    event_type: $scope.displayEvent.event_type,
                    address: pos.address, // $scope.address,
                    start_date_time: $scope.displayEvent.start.date.toISOString(),
                    end_date_time: $scope.displayEvent.end.date.toISOString(),
                    eventLocation: [pos.lng, pos.lat], //$scope.eventLocation,
                    longitude: pos.lng,
                    latitude: pos.lat,
                    sponsored_event: $scope.displayEvent.sponsored_event,
                    permissions: permissions,
                    start_date_time_ms: $scope.displayEvent.start.date.valueOf(),
                    end_date_time_ms: $scope.displayEvent.end.date.valueOf(),
                    share_counter: 0,
                    event_admin: JSON.stringify($scope.displayEvent.selectedAdmins),
                    invite_friends: JSON.stringify($scope.displayEvent.selectedFriends),
                    email: $scope.displayEvent.email,
                    phone: $scope.displayEvent.phone,
                    websiteurl: $scope.displayEvent.website,
                    isdraft: draft,
                    isPHQ: $scope.displayEvent.isPHQ,
                    ticketType: $scope.displayEvent.ticketType
                };
                data.tickets = [];
                if ($scope.displayEvent.ticketType === 'paid') {
                    if (!$scope.showTicketTypeSec) {
                        let clonedTickets = Utils.clone($scope.tickets);
                        clonedTickets.remQuantity = clonedTickets.quantity;
                        clonedTickets.currency = '$';
                        clonedTickets.status = 'active';
                        data.tickets = [clonedTickets];
                    } else {
                        if ($scope.ticketsArr && $scope.ticketsArr.length > 0) {
                            for (let ticket of $scope.ticketsArr) {
                                ticket.remQuantity = ticket.quantity;
                                ticket.currency = '$';
                                ticket.status = 'active';
                                //data.tickets = Utils.clone(ticket);
                                data.tickets.push(Utils.clone(ticket));
                            }
                        }
                    }

                    data.paypalEmail = $scope.user.custom_data.paypalEmail;
                    if (!$scope.user.custom_data.paypalEmail) {
                        $scope.changePayPalAccount();
                        data.paypalEmail = $scope.model.email;
                    }
                    data.tickets = JSON.stringify(data.tickets);
                    data.ticketsCheckedIn = 0;
                }

                if ($scope.displayEvent.selectedCategory.length > 0) {
                    if ($scope.displayEvent.selectedCategory[0].id === 'programing-arts') {
                        data.category = 'performing-arts';
                    } else {
                        data.category = ($scope.displayEvent.selectedCategory[0].id);
                    }
                }

                $scope.isSubmit = true;
                let eventResponse = null;
                upsertEvent(data)
                    .then((res) => {
                        eventResponse = res;
                        if ($scope.action === 'Create') {
                            $window.localStorage.removeItem("events");
                        } else {
                            convertAndSaveNewEvent(res);
                        }

                        if (draft || $scope.action === 'Claim') {
                            return Promise.resolve();
                        } else {
                            return addNotifications(res);
                        }

                    })
                    .then(() => {
                        console.log('Notification created');
                        $scope.isSubmit = false;
                        let message = "";
                        let event_id = null;

                        if ($scope.action === 'Edit') {
                            message = 'Congratulations, Event has been ' + $scope.action + "ed";
                            $scope.publishStatus = false;
                            // Close the modal
                            // Refresh the page
                            $window.location.reload();
                        }
                        if (draft) {
                            message = 'Draft has been saved ';
                            this.$close();
                            $location.path('/manageevent').search({ 'myevent': true });
                            $scope.publishStatus = false;
                        }
                        if ($scope.action === 'Create' && !draft) {
                            message = 'Congratulations, Event has been ' + $scope.action + "d";
                            $scope.publishStatus = false;
                            event_id = eventResponse._id;

                        }
                        if (message) {
                            Utils.showSuccess($scope, message);
                        }
                        // Go to event detail page
                        if (event_id) {
                            this.$close();
                            $window.location.href = `/eventdetails/${event_id}`;
                        } else {
                            $window.location.reload();
                        }
                    })
                    .catch(err => {
                        console.log("image  uploadede ERROR :: ", err);
                        Utils.showError($scope, 'Oops, Cannot ' + $scope.action + ' event.', 'Oops!!');
                        $scope.resetForm();
                        $scope.$apply();
                    });
            };

            $scope.handleEventButton = (draft) => {
                $scope.draftStatus = true;
                console.log('Inside handleEventButton');
                /*if($scope.displayEvent.files)
                {
                   $scope.createEvent(draft);
                }
                else
                {
                     Utils.showError($scope, "Please upload an image");
                     return;
                }*/
                if (!($scope.displayEvent.selectedCategory && $scope.displayEvent.selectedCategory.length > 0)) {
                    Utils.showError($scope, "Select atleast one category");
                    return;
                } else if (!($scope.displayEvent.files)) {
                    Utils.showError($scope, "Please upload image");
                    return;
                } else if (!$scope.displayEvent.description || $scope.displayEvent.description.length < 50) {
                    // Utils.showError($scope, "Please enter description of minimum 50 words");
                    return;
                } else if ($scope.displayEvent.ticketType == 'paid' && !$scope.showTicketTypeSec && !$scope.validateTicketAttributes()) {
                    return;
                } else if (($scope.displayEvent.ticketType == 'paid') && !$scope.user.custom_data.paypalEmail && !$scope.model.email) {
                    Utils.showError($scope, "Please Add Paypal Email");
                    return;
                } else {
                    $scope.createEvent(draft);
                }

            };
            const saveEventsInLocalStorage = (events) => {
                let oldEvents = $window.localStorage.getItem("events");
                if (oldEvents) {
                    $window.localStorage.removeItem("events");
                }
                console.log('saveEventsInLocalStorage in createevent controller');
                $window.localStorage.setItem("events", JSON.stringify(events));
            };

            $scope.resetForm = () => {
                $scope.displayEvent.event_name = '';
                $scope.displayEvent.description = '';
                $scope.displayEvent.event_type = '';
                pos = null;
                $scope.displayEvent.start = {
                    date: null,
                    time: null
                };
                $scope.displayEvent.end = {
                    date: null,
                    time: null
                };
                $scope.displayEvent.selectedAdmins = [];
                $scope.displayEvent.selectedFriends = [];
                $scope.displayEvent.sponsored_event = true;
            };

            $scope.handleFileSelect = function(files, evt, invalidFiles) {
                let file = files;
                console.log('file' + JSON.stringify(file, null, 4));
                console.log('invalidFiles' + JSON.stringify(invalidFiles, null, 4));
                if (file) {
                    let reader = new FileReader();
                    $scope.imageSelected = true;
                    reader.onload = function(evt) {
                        $scope.$apply(function($scope) {
                            $scope.imageForCropping = evt.target.result;
                        });
                    };
                    reader.readAsDataURL(file);
                } else {
                    if (invalidFiles.length > 0) {
                        Utils.showError($scope, "Your file size is smaller than 350*200 px.");
                        $scope.imageSelected = false;
                    }

                }

            };

            $scope.setCroppedImageAsFinalImage = function($event) {
                if ($scope.imageSelected) {
                    console.log($scope.croppedImage);
                    // let blob = dataURItoBlob($scope.croppedImage);
                    // let file = new File([blob], 'eventImage.png');
                    $scope.displayEvent.files = $scope.croppedImage;
                    $scope.imageSelected = false;
                }
                $event.preventDefault();
            };

            $scope.discardCroppedImage = function($event) {
                $scope.imageSelected = false;
                $scope.displayEvent.files = null;
                $scope.croppedImage = null;
                $scope.imageForCropping = null;
                $event.preventDefault();
            };

            function dataURItoBlob(dataURI) {

                // convert base64/URLEncoded data component to raw binary data held in a string
                var byteString;
                if (dataURI.split(',')[0].indexOf('base64') >= 0)
                    byteString = atob(dataURI.split(',')[1]);
                else
                    byteString = unescape(dataURI.split(',')[1]);

                // separate out the mime component
                var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

                // write the bytes of the string to a typed array
                var ia = new Uint8Array(byteString.length);
                for (var i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }

                return new Blob([ia], {
                    type: mimeString
                });
            }

            $scope.init = function() {
                // Load gateway id of user
                $scope.user = authService.getUser();
                // By default no category is selected
                $scope.categories.forEach(cat => {
                    cat.selected = false;
                });
                $scope.unlimitedPlanAmount = config.PLANS.filter(p => p.id === 'unlimited')[0].amount;
                if (!$scope.user) {
                    return;
                }
                loadUserCurrentPlan()
                    .then(() => {
                        //   $scope.initStripe();
                        // Check if user is creating the event
                        if ($scope.action !== 'Create') {

                            // Check if draft is getting edited
                            if ($scope.action === 'Edit' && !$scope.editableEvent.isPHQ) {
                                $scope.plans = config.PLANS.filter(p => p.isPromo);
                            } else {
                                $scope.plans = config.PLANS.filter(p => !p.isPromo);
                                for (let p of $scope.plans) {
                                    // Check if selected plan is present by default
                                    if ($scope.selectedPlan && $scope.selectedPlan.id === p.id) {
                                        p.checked = true;
                                    } else {
                                        p.checked = false;
                                    }
                                }
                            }

                            if ($scope.action !== 'Claim' && !eventsService.allowToEdit($scope.editableEvent, $scope.user.id)) {
                                //alert('you are not allowed to edit event');
                                $scope.displayEvent.selectedAdmins = [];
                                $scope.displayEvent.selectedFriends = [];
                                // TODO Dismiss the modal
                                return;
                            }

                            // Populate event data
                            $scope.displayEvent = Object.assign($scope.displayEvent, {
                                event_id: $scope.editableEvent.id || $scope.editableEvent._id,
                                event_name: $scope.editableEvent.title || $scope.editableEvent.event_name,
                                description: $scope.editableEvent.description,
                                event_type: $scope.editableEvent.event_type,
                                chosenPlace: $scope.editableEvent.address,
                                start: {
                                    date: moment($scope.editableEvent.start_date_time_ms),
                                    time: moment($scope.editableEvent.start_date_time_ms)
                                },
                                end: {
                                    date: moment($scope.editableEvent.end_date_time_ms),
                                    time: moment($scope.editableEvent.end_date_time_ms)
                                },
                                sponsored_event: ($scope.editableEvent.sponsored_event === 'true'),
                                email: $scope.editableEvent.email,
                                website: $scope.editableEvent.websiteurl,
                                phone: $scope.editableEvent.phone,
                                selectedCategory: [$scope.editableEvent.category],
                                isPHQ: $scope.editableEvent.isPHQ,
                                claimed_by: $scope.editableEvent.claimed_by,
                                ticketType: $scope.editableEvent.ticketType


                            });
                            if ($scope.editableEvent.tickets) {
                                $scope.ticketsArr = $scope.editableEvent.tickets;
                                console.log('ticket arr:' + JSON.stringify($scope.ticketsArr, null, 4));
                                $scope.hideEditDeleteBtn = true;
                                $scope.showTicketTypeSec = true;

                            }


                            // $scope.ticketsArr.push(Utils.clone($scope.editableEvent.tickets));



                            if ($scope.editableEvent.isdraft) {
                                $scope.displayEvent.isdraft = $scope.editableEvent.isdraft;
                            }

                            if ($scope.editableEvent.eventLocation) {
                                pos = {
                                    address: $scope.editableEvent.address,
                                    lat: $scope.editableEvent.eventLocation[0],
                                    lng: $scope.editableEvent.eventLocation[1]
                                };
                                $scope.latitude = $scope.editableEvent.eventLocation[0];
                                $scope.longitude = $scope.editableEvent.eventLocation[1];
                            } else {
                                pos = {
                                    address: $scope.editableEvent.address,
                                    lat: $scope.editableEvent.location[0],
                                    lng: $scope.editableEvent.location[1]
                                };
                                $scope.latitude = $scope.editableEvent.location[0];
                                $scope.longitude = $scope.editableEvent.location[1];
                            }
                            if ($scope.editableEvent.imageUrl && $scope.editableEvent.imageUrl !== $scope.defaultEventImage) {
                                $scope.displayEvent.files = $scope.editableEvent.imageUrl;
                            } else if ($scope.editableEvent.image_url && $scope.editableEvent.image_url !== $scope.defaultEventImage) {
                                $scope.displayEvent.files = $scope.editableEvent.image_url;
                            }

                            $scope.categories.forEach(cat => {
                                if (cat.name === $scope.editableEvent.category) {
                                    cat.selected = true;
                                } else {
                                    cat.selected = false;
                                }
                            });
                            $scope.setAdminFriends();

                            let selectedAdmins = [];
                            if (typeof $scope.editableEvent.event_admin === 'string') {
                                selectedAdmins = JSON.parse($scope.editableEvent.event_admin || '[]');
                            } else {
                                selectedAdmins = $scope.editableEvent.event_admin || [];
                            }
                            let selectedFriends = [];
                            if (typeof $scope.editableEvent.event_admin === 'string') {
                                selectedFriends = JSON.parse($scope.editableEvent.invite_friends || '[]');
                            } else {
                                selectedFriends = $scope.editableEvent.invite_friends || [];
                            }
                            selectedAdmins.forEach(sltAdmin => {
                                sltAdmin.ticked = true;
                                $scope.displayEvent.selectedAdmins.push(sltAdmin);
                                $scope.displayEvent.admins.push(sltAdmin);
                            });
                            selectedFriends.forEach(sltFrnd => {
                                sltFrnd.ticked = true;
                                $scope.displayEvent.selectedFriends.push(sltFrnd);
                                $scope.displayEvent.friends.push(sltFrnd);
                            });

                            if ($scope.action !== 'Claim') {

                                userService.getFollowUsersDeatil($scope.editableEvent.user_id).then(res => {
                                        console.log('Got follow users');
                                        res.forEach(function(element) {
                                            let user = element.user;
                                            let adminUsr = JSON.parse(JSON.stringify(user));
                                            let isAdmin = false;
                                            let isFrnd = false;
                                            selectedAdmins.forEach(sltAdmin => {
                                                if (sltAdmin.id === adminUsr.id) {
                                                    isAdmin = true;
                                                    return;
                                                }
                                            });
                                            //not push admin user
                                            if (!isAdmin) $scope.displayEvent.admins.push(adminUsr);
                                            selectedFriends.forEach(sltFrnd => {
                                                if (sltFrnd.id === $scope.user.id) {
                                                    isFrnd = true;
                                                    return;
                                                }
                                            });
                                            //not push already invited user
                                            if (!isFrnd) $scope.displayEvent.friends.push(user);

                                        });

                                    })
                                    .catch(err => {
                                        console.log('friends list error :: ', err);
                                    });
                            } else {
                                $scope.setAdminFriends();
                            }
                            applyChanges();
                        } else {

                            $scope.setAdminFriends();
                            //for adding the plans applicable to promo events at the time of create
                            $scope.plans = config.PLANS.filter(p => p.isPromo);
                            // By default no category is selected
                            $scope.categories.forEach(cat => {
                                cat.selected = false;
                            });
                            applyChanges();
                        }
                    });
            };

            $scope.changeSection = function(section) {
                $scope.showSection = section;
            };
            $scope.cancelModal = function() {
                this.$dismiss({});
            };
            $scope.validatePublish = function() {

                $scope.validationErrors = false;
                // check if category is selected
                if (!($scope.displayEvent.selectedCategory && $scope.displayEvent.selectedCategory.length > 0)) {
                    Utils.showError($scope, "Select atleast one category");
                    return;
                }
                if (!($scope.displayEvent.files)) {
                    Utils.showError($scope, "Please upload image");
                    return;
                }
                if ($scope.displayEvent.ticketType == 'paid' && !$scope.showTicketTypeSec && !$scope.validateTicketAttributes()) {
                    return;
                }
                if (($scope.displayEvent.ticketType == 'paid') && !$scope.user.custom_data.paypalEmail && !$scope.model.email) {
                    Utils.showError($scope, "Please Add Paypal Email");
                    return;
                }
                if (!($scope.displayEvent.description) || $scope.displayEvent.description.length < 50) {
                    // Utils.showError($scope, "Please enter description of minimum 50 words");
                    return;
                }
                //if ($scope.action === 'Create' || ($scope.action === 'Edit' && !$scope.displayEvent.isPHQ))
                //{
                // Check if any plan is selected
                if ($scope.selectedPlan) {
                    if ($scope.user.selectedPlan) {
                        $scope.changeSection('eventPreviewSec');
                        //applyChanges();
                    } else {
                        $scope.validateCoupon()
                            .then((coupon) => {
                                if (coupon) {
                                    $scope.displayEvent.coupon = coupon;
                                }
                                // Try to charge the card as well
                                return stripe.createToken(card);
                            })
                            .then(function(result) {
                                if (result.error) {
                                    // Inform the customer that there was an error.
                                    Utils.showError($scope, result.error.message);
                                    $scope.validationErrors = true;
                                } else {
                                    $scope.displayEvent.stripeToken = result;
                                    $scope.changeSection('eventPreviewSec');
                                    applyChanges();
                                }
                            })
                            .catch(err => {
                                //This means coupon is invalid
                                $scope.validationErrors = true;
                            });
                    }

                } else {
                    $scope.changeSection('eventPreviewSec');
                }
                ///}


            };

            $scope.confirmAndPublish = function() {
                $scope.publishStatus = true;
                // Check if plan is selected then make the payment and create the event

                if ($scope.selectedPlan && !$scope.user.selectedPlan) {
                    $scope.sendCouponDataToServer();
                } else {
                    $scope.createEvent(false);
                }
            };
            $scope.openEventDetail = function(eventId) {
                this.$close({ action: 'EventDetail', event: eventId });
            };
            $scope.setTime = function(time, type) {
                if (type === 'start') {
                    $scope.displayEvent.start.time = moment(time, 'hh:mma');
                } else {
                    $scope.displayEvent.end.time = moment(time, 'hh:mma');
                }
            };
            /*$scope.openCreateEventModal = function () {
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.claimEvent = false;
                eventModelScope.action = "Create";

                let modalInstance = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/addLinkModal.html',
                    openedClass: 'pa-create-event-modal pa-common-modal-style ',add-link-modal
                    scope: eventModelScope,
                    size: 'lg'

                });
            };*/

            $scope.openAddLinkModal = function() {
                console.log("check data");
                let eventModelScope = $scope.$new(false, $scope);

                let modalInstance = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/addLinkModal.html',
                    openedClass: 'pa-create-event-modal add-link-modal',
                    scope: eventModelScope,
                    size: 'lg'
                });
            };

            $scope.inviteEmailModal = function() {
                let eventModelScope = $scope.$new(false, $scope);
                eventModelScope.claimEvent = false;
                eventModelScope.action = "Create";

                let modalInstance = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/inviteThroughEmailModal.html',
                    openedClass: 'pa-create-event-modal add-link-modal',
                    scope: eventModelScope,
                    size: 'lg'
                });
            };
            /* angular.element('.modal').bind("scroll", function () {
                   //if($scope.displayEvent.start.isOpenStartDate || $scope.displayEvent.start.isOpenStartTime || $scope.displayEvent.end.isOpenEndDate || $scope.displayEvent.end.isOpenEndTime)
                   {
                      //  alert($scope.displayEvent.start.isOpenStartDate);
                      $scope.displayEvent.start.isOpenStartDate =false;
                      $scope.displayEvent.start.isOpenStartTime  =false;
                      $scope.displayEvent.end.isOpenEndDate =false;
                      $scope.displayEvent.end.isOpenEndTime =false;
                   }
                    console.log("check :: "+$scope.displayEvent.start.isOpenStartDate);
             });
*/

            $scope.init();

            $scope.$on('modal.closing', function(event, reason, closed) {
                if (!closed) {

                    if (!confirm("Exiting event creation means you'll lose all the information you've provided. Are you sure you want to navigate away from this screen?")) {
                        event.preventDefault();
                    }
                }
            });
            /*** calendar drift on scroll is removed by applying this ***/
            angular.element('.modal').bind("scroll", function() {
                //  angular.element('.moment-picker-container').toggle();
                if ($('.moment-picker') && $('.moment-picker').length > 0 && $('.moment-picker')[0]) {
                    angular.element('.header-view').scope().$parent.view.position();
                }
            });

            $scope.goToAccount = function() {
                // close the modal
                $scope.cancelModal();
                location.href = "/account_history";
            };
            $scope.getActiveTickets = function() {
                eventsService.getActiveTicketingEvents().then(res => {
                    console.log('res::' + JSON.stringify(res));
                    $scope.getTotalActiveTickets = res.length;
                    // alert($scope.getTotalActiveTickets);
                    $scope.totalTicketLeft = $scope.user.selectedPlan.ticketedevents - res.length;
                    Utils.applyChanges($scope);

                });
                // $scope.totalTicketLeft = $scope.user.selectedPlan.ticketedevents - $scope.getTotalActiveTickets;
            };
            $scope.addAnotherTickets = function() {
                if (!$scope.validateTicketAttributes()) {
                    return;
                }
                $scope.showTicketTypeSec = true;
                if (!$scope.ticketsArr) {
                    $scope.ticketsArr = [];
                }
                $scope.ticketsArr.push(Utils.clone($scope.tickets));
                $scope.tickets = {};
            };

            $scope.deleteTicket = function(ticket) {
                let index = $scope.ticketsArr.indexOf(ticket);
                $scope.ticketsArr.splice(index, 1);
                if ($scope.ticketsArr.length <= 0) {
                    $scope.showTicketTypeSec = false;
                    $scope.tickets = {};
                    $scope.editSaveBtn = false;

                }

            };

            // This function validates ticket
            $scope.validateTicketAttributes = function() {
                if (!($scope.tickets.name)) {
                    Utils.showError($scope, "Please enter ticket name");
                    return false;
                }
                if (($scope.tickets.name.length >= 50)) {
                    Utils.showError($scope, "Ticket name should be within 50 characters");
                    return false;
                }
                if (!($scope.tickets.description)) {
                    Utils.showError($scope, "Please enter ticket description");
                    return false;
                }
                if (($scope.tickets.description.length >= 100)) {
                    Utils.showError($scope, "Ticket description should be within 50 characters");
                    return false;
                }
                if (!($scope.tickets.quantity)) {
                    Utils.showError($scope, "Please enter ticket quantity");
                    return false;
                }
                if ($scope.tickets.quantity < 1 || $scope.tickets.quantity > 100000) {
                    Utils.showError($scope, "Please enter ticket quantity between 1-100000");
                    return false;
                }
                if (!($scope.tickets.price)) {
                    Utils.showError($scope, "Please enter ticket price");
                    return false;
                }
                if ($scope.tickets.price <= 0 || $scope.tickets.price > 10000) {
                    Utils.showError($scope, "Please enter ticket price between 1-10000");
                    return false;
                }


                let duplicateTicket = $scope.ticketsArr.filter(ticket => (ticket.name == $scope.tickets.name || ticket.price == $scope.tickets.price));
                if (duplicateTicket && duplicateTicket.length > 0) {
                    Utils.showError($scope, "Either the ticket name or ticket price is not unique.");
                    return false;
                }

                return true;
            };
            $scope.changePayPalAccount = function(e) {

                let user = authService.getUser();
                if (user) {
                    let custom_data = user.custom_data;
                    if (!custom_data) {
                        custom_data = {};
                    }

                    custom_data.paypalEmail = $scope.model.email;
                    $scope.buttonText = 'Updating...';
                    userService.updateUserCustomData(user.id, custom_data)
                        .then(() => {
                            Utils.showSuccess($scope, 'Paypal Email updated succesfully');
                            $scope.buttonText = 'Change';
                            $scope.model.showChangePayPalSec = false;
                            $scope.user.custom_data.paypalEmail = custom_data.paypalEmail;
                            Utils.applyChanges($scope);
                        })
                        .catch(err => {
                            $scope.buttonText = 'Change';
                            Utils.showError($scope, 'Unable to update email. Please contact administrator');
                            Utils.applyChanges($scope);
                        });
                }
            };
            $scope.editTicket = function(index) {
                $scope.editSaveBtn = true;
                $scope.ticketsArr.forEach(function(ticket, i) {
                    if (i == index) {
                        $scope.tickets.name = ticket.name;
                        $scope.tickets.description = ticket.description;
                        $scope.tickets.quantity = ticket.quantity;
                        $scope.tickets.price = ticket.price;
                        /*$scope.tickets =ticket;*/
                        $scope.index = index;
                        return;
                    }

                });
            };
            $scope.saveTicket = function() {

                if ($scope.tickets) {
                    //   $scope.ticketsArr = new ticketsArr();
                    $scope.ticketsArr[$scope.index] = $scope.tickets;
                    //$scope.ticketsArr.push(Utils.clone($scope.tickets));
                    Utils.showSuccess($scope, 'Ticket updated succesfully');
                    $scope.tickets = {};
                    $scope.editSaveBtn = false;
                }
                console.log('save arr::' + JSON.stringify($scope.ticketsArr, null, 4));


            };

        }
    ]);