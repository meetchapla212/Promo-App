angular.module('PromoApp')
    .controller('eventdetailswidgetController', ['Socialshare', 'phqservice', '$route', '$scope', '$uibModal', '$location', 'eventsService', 'authService', 'apiService', 'commentService', 'deviceDetector', 'qbService', 'userService', 'followUser', '$rootScope', 'Utils', '$window', 'config', 'locationService', 'metaTagsService',
        function(Socialshare, phqservice, $route, $scope, $uibModal, $location, eventsService, authService, apiService, commentService, deviceDetector, qbService, userService, followUser, $rootScope, Utils, $window, config, locationService, metaTagsService) {
            $scope.message = "";
            $scope.viewEnvtID = $route.current.params.evntID;
            $scope.viewEnvtNAME = $route.current.params.evntName;
            $scope.isMobile = false;
            let base_url = $window.location.origin;
            let base_host = $window.location.host;
            let session = authService.getSession();
            $scope.event = null;
            $scope.active = 0;
            $scope.ip = "0.0.0.0";
            $scope.browserName = "unknown";
            $scope.reward_id = null;
            $scope.loading = true;
            $scope.loaderMessage = 'Loading...';
            $scope.ev = [];
            $scope.comments = [];
            $scope.userImageUrl = {};
            $scope.backTo = {
                title: '',
                url: '/manageevent'
            };
            $scope.yellowBanner = false;
            $scope.loggedInUser = authService.getUser();
            $scope.eventDetailSec = true;
            $scope.eventDetailMapSec = false;
            $scope.autoWidthImg = false;
            $scope.viewComment = false;
            $scope.totalComments = 3;
            $scope.newComment = {
                comment: null
            };
            $scope.checkFollow = false;
            $scope.cmtName = null;
            $scope.rewardExit = false;
            $scope.categoriesMap = [];
            $scope.allRemaingTicket = 0;
            let token = authService.get('token');
            apiService.getEventCategories(token).then((response) => {
                if (response.status == 200) {
                    let data = response.data;
                    if (data.success) {
                        let catData = data.data;
                        catData.forEach(function(cat) {
                            let category = {};

                            category.id = cat.slug;
                            category.name = cat.category_name;
                            category.icon = cat.category_image;
                            category.iconImg = "<img src=" + cat.category_image + " alt='image' />";
                            category.marker = cat.category_image;
                            category.unselectedIcon = cat.category_image;
                            category.selected = true;

                            $scope.categoriesMap.push(category);

                        });
                    }
                }
            });

            if ($scope.loggedInUser) {
                eventsService.getReferalLinkByEventId($scope.viewEnvtID).then((response) => {
                    let WhatsAppLink = encodeURIComponent(response.data[1].whatsapp);
                    $scope.whatsAppUrl = `https://wa.me/?text=${WhatsAppLink}`;
                    $scope.snapchatUrl = response.data[0].snapchat;
                    $scope.facebookUrl = response.data[2].facebook;
                    $scope.emailUrl = response.data[3].email;
                    $scope.otherUrl = response.data[4].other;
                });
            }

            $scope.getCatName = function(nameKey, myArray) {
                for (var i = 0; i < myArray.length; i++) {
                    if (myArray[i].id === nameKey) {
                        return myArray[i];
                    }
                }
            };

            $scope.eventAttending = '-1';
            $scope.hasMultipleTickets = false;
            $scope.functionality = {
                manageEvents: false,
                showMore: false,
                hideRelatedEvents: false,
                ordersuccess: false,
                viewAllComments: false,
                limitTo: 3
            };

            $scope.commentButtonText = "Post Comment";
            $scope.promoAdminId = config.PROMO_ADMIN_ID;
            $scope.headerTemplate = 'partials/phase2/pre-login-header.html';
            $scope.isTicketSaleStart = false;
            $scope.isTicketSaleEnd = false;
            $scope.soonTicketStartDate = '';

            $scope.delete_cmt = function(comment_id) {
                // Send call to qb
                commentService.deleteComment(comment_id).then((res) => {
                    $scope.comments.splice(res, 1);
                    $scope.totalComments = 3;
                    Utils.applyChanges($scope);
                });
            };

            let eventsfromPhqPromo = (event_id, location) => {

                let filter = {};
                let now = moment.utc();

                filter.page = 1;
                filter.limit = config.NO_OF_EVENTS_PER_PAGE;
                filter.sort = "ASC";
                filter.sortby = "start_date_time_ms";


                filter.search_params = {};
                filter.search_params.startDate = (now).format("YYYY-MM-DD");
                filter.search_params.endDate = (now.add(7, 'days')).format("YYYY-MM-DD");
                filter.search_params.not_in_event = event_id;
                filter.search_params.location = location;
                filter.search_params.event_name = "";

                let categorySelected = [];

                for (let k in $scope.categoriesMap) {
                    if ($scope.categoriesMap[k].selected) {
                        categorySelected.push($scope.categoriesMap[k].id);
                    }
                }

                if (categorySelected.length != Object.keys($scope.categoriesMap).length) {
                    filter.search_params.category = categorySelected;
                }


                return eventsService.getEvents(filter)
                    .then((response) => {
                        if (response.status == 200) {
                            let data = response.data;
                            if (data.success) {
                                return data.data;
                            }
                        }
                        return [];
                    });
            };

            let getEvents = (event) => {
                return new Promise((resolve, reject) => {
                        let location = [event.latitude, event.longitude];
                        eventsfromPhqPromo(event.event_id, location)
                            .then(res => {
                                $scope.ev = res.sort((a, b) => {
                                    return a.timeDiff - b.timeDiff;
                                });
                            })
                            .then((res => {
                                let eventsList = [];
                                let now = moment.utc(event.start_date_time_ms);
                                res.forEach((r) => {
                                    if (r.id != event.event_id) {
                                        if (r.event_image) {
                                            r.imageUrl = r.event_image;
                                        } else if (r.event_image) {
                                            r.imageUrl = r.event_image;
                                        } else {
                                            r.imageUrl = '../img/unnamed.png'; // set default image
                                        }
                                        let dateOb = r.start_date_time_ms;
                                        if (dateOb && now) {
                                            r.timeDiff = Math.abs(now - dateOb);
                                            eventsList.push(r);

                                        }
                                    }
                                });
                                resolve(eventsList);
                            }))
                            .catch(err => { reject([]); });
                    })
                    .catch(err => {});
            };

            $scope.numberOfItems = function() {
                if ($scope.ev && $scope.ev.length > 0) {
                    let l = $scope.ev.length;
                    let n = Math.ceil(l / 4);
                    return new Array(n);
                } else {
                    return [];
                }
            };

            $scope.numberOfMobileItems = function() {
                if ($scope.ev && $scope.ev.length > 0) {
                    let l = $scope.ev.length;
                    let n = Math.ceil(l / 2);
                    return new Array(n);
                } else {
                    return [];
                }
            };

            // This method gets tickets for current user
            $scope.getEventTickets = () => {
                $scope.hasMultipleTickets = false;
                eventsService.getUserTickets($scope.loggedInUser.event_id, false, $scope.event.event_id)
                    .then((userticket) => {
                        if (userticket && userticket.length > 0) {
                            $scope.event.ticket = userticket[0];
                            if (userticket.length > 1) {
                                $scope.hasMultipleTickets = true;
                            }
                        }
                    }).catch(err => {
                        console.log(err);
                    });
            };

            $scope.goToProfilePage = () => {
                $window.location.href = '/myprofile';
            };

            $scope.goToPage = (location) => {
                $window.location.href = location;
            };

            $scope.reloadPage = () => {
                $window.location.reload();
            };

            $scope.goToBack = () => {
                $window.location.href = '/';
            };

            $scope.timeCalculationForAgo = (dateInMsec) => {
                if (dateInMsec) {
                    dateInMsec = dateInMsec * 1000;
                    let now = new Date().getTime();
                    let difference = Math.floor((now - dateInMsec) / 1000);
                    if (difference < 2) {
                        return 'Just now';
                    }
                    if (difference < 60) { // Seconds
                        return difference + 's ago';
                    }
                    difference = Math.floor(difference / 60);
                    if (difference < 60) { // minutes
                        return difference + 'm ago';
                    }
                    difference = Math.floor(difference / 60);
                    if (difference < 60) { // hours
                        return difference + 'h ago';
                    }

                    difference = Math.floor(difference / 24);
                    return difference + 'd ago';

                } else {
                    return dateInMsec;
                }
            };

            $scope.cmtUsers = {};
            let getComments = () => {
                let page = 1;
                let limit = 100;
                let event_id = $scope.event.event_id;
                return commentService.getComments(event_id, page, limit)
                    .then(res => {
                        if ('data' in res.data) {
                            $scope.comments = res.data.data;
                        }

                    });
            };

            $scope.socialShare = (social_type, analytic) => {

                if (social_type == "facebook") {
                    Socialshare.share({
                        'provider': social_type,
                        'attrs': {
                            'appId': config.FACEBOOK_APP_ID,
                            'socialshareUrl': $scope.facebookUrl,
                            'socialshareDisplay': $scope.event.event_name
                        }
                    });
                }

                if (social_type == "whatsapp") {
                    var whatsAppUrl = $scope.whatsAppUrl;
                    window.open(whatsAppUrl, '_blank');
                }

                if (social_type == "email") {
                    Socialshare.share({
                        'provider': social_type,
                        'attrs': {
                            'socialshareBody': $scope.emailUrl,
                            'socialshareSubject': $scope.event.event_name
                        }
                    });
                }

                let socialData = {
                    social_type: social_type,
                    reward_id: $scope.reward_id,
                    device_type: 'web',
                    browser_name: $scope.browserName,
                    ip_address: $scope.ip
                };

                if (analytic) {
                    eventsService.socialRewardShare(socialData)
                        .then((response) => {});
                } else {
                    eventsService.shareEvent($scope.event.event_id)
                        .then((response) => {});
                }

            };

            $scope.emailShare = (social_type, analytic) => {

                let googleMail = 'https://mail.google.com/mail/?view=cm&fs=1&to=&su=' + $scope.event.event_name + '&body=' + $scope.emailUrl;
                let ooutlookMail = 'https://outlook.office.com/owa/?path=/mail/action/compose&to=&subject' + $scope.event.event_name + '&body=' + $scope.emailUrl;
                let yahooMail = 'https://compose.mail.yahoo.com/?to=&subject=' + $scope.event.event_name + '&body=' + $scope.emailUrl;
                let email = 'mailto:?subject=' + $scope.event.event_name + '&body=' + $scope.emailUrl;

                angular.element("#mailtoui-button-1").attr("href", googleMail);
                angular.element("#mailtoui-button-2").attr("href", ooutlookMail);
                angular.element("#mailtoui-button-3").attr("href", yahooMail);
                angular.element("#mailtoui-button-4").attr("href", email);
                angular.element("#mailtoui-email-address").append($scope.emailUrl);
                angular.element("#mailtoui-modal").show();
                angular.element(".mailtoui-brand").remove();
                let socialData = {
                    social_type: social_type,
                    reward_id: $scope.reward_id,
                    device_type: 'web',
                    browser_name: $scope.browserName,
                    ip_address: $scope.ip
                };

                if (analytic) {
                    eventsService.socialRewardShare(socialData)
                        .then((response) => {});
                }
            };

            $scope.doComments = () => {
                let user = $scope.loggedInUser;
                let commentData = {
                    event_id: $scope.event.event_id,
                    comment: $scope.newComment.comment
                };

                $scope.commentButtonText = 'Posting ...';
                commentService.createComment(commentData).then(response => {

                    if (response.status == 200) {
                        let data = response.data;
                        if (data.success) {
                            let res = data.data;
                            if ($scope.comments.length == 0) {
                                $scope.comments[0] = res;
                            } else {
                                $scope.comments.unshift(res);
                            }
                            $scope.newComment.comment = '';
                            $scope.commentButtonText = 'Post Comment';
                        } else {
                            let notify = {
                                type: 'error',
                                title: 'OOPS!!',
                                content: data.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            Utils.applyChanges($scope);
                        }
                    } else {
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: "Sorry something went wrong. Please try later.",
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        Utils.applyChanges($scope);
                    }
                });
            };

            // this method is used to get event address
            const getEventAddress = () => {
                if (!('address' in $scope.event && $scope.event.address)) {
                    eventsService.updateLocationOfEvent($scope.event)
                        .then(() => {
                            Utils.applyChanges($scope);
                        });
                }
            };

            $scope.getSocialShareURL = () => {
                var rewardUrl = $scope.snapchatUrl;
                return rewardUrl;
            };

            let getEvent = (eventID) => {
                return new Promise((resolve, reject) => {
                    eventsService.getEventDetails(eventID)
                        .then((response => {

                            if (response.status == 200) {
                                let data = response.data;
                                if (data.success) {
                                    $scope.reward_id = data.data.reward_details.reward_id;

                                    $.get("https://api.ipify.org/?format=json").then(function(response) {
                                        var userIp = response.ip;
                                        if ($route.current.params.ref && $route.current.params.social) {
                                            var userId = $route.current.params.ref * 1;
                                            var social_type = $route.current.params.social;

                                            let socialData = {
                                                ref_user_id: userId,
                                                social_media_type: social_type,
                                                reward_id: $scope.reward_id,
                                                device_type: 'web',
                                                browser_name: $scope.browserName,
                                                ip_address: userIp
                                            };

                                            eventsService.socialRewardVisit(socialData)
                                                .then((response) => {});
                                        }
                                    });

                                    let res = data.data;
                                    let ev = res;
                                    let tickets = ev.tickets_list;
                                    tickets = tickets.filter((t) => ((!t.status) || (t.status == 'active')));
                                    for (let t of tickets) {
                                        $scope.allRemaingTicket += t.remaining_qty;
                                    }
                                    if (ev && 'reward_details' in ev && 'reward_id' in ev.reward_details) {
                                        $scope.rewardExit = true;
                                        $scope.rewardUrl = ev.event_url;

                                    }
                                    setTimeout(function() {
                                        snap.creativekit.initalizeShareButtons(
                                            document.getElementsByClassName('snapchat-share-button')
                                        );
                                    }, 1000);

                                    //ev._user_id = 0;
                                    userService.getUserProfile(ev._user_id)
                                        .then((user_response) => {
                                            if (user_response.status == 200) {
                                                let user_data = user_response.data;
                                                if (user_data.success) {
                                                    let usr = user_data.data;
                                                    if (usr.profile_pic) {
                                                        usr.imgUrl = usr.profile_pic;
                                                        ev.creator = usr;
                                                        resolve(ev);
                                                    } else {
                                                        usr.imgUrl = '';
                                                        ev.creator = usr;
                                                        resolve(ev);
                                                    }
                                                } else {
                                                    resolve(ev);
                                                }
                                            } else {
                                                resolve(ev);
                                            }
                                        });
                                } else {

                                    let notify = {
                                        type: 'error',
                                        title: 'Error',
                                        content: "No such event exists",
                                        timeout: 5000 //time in ms
                                    };
                                    $scope.$emit('notify', notify);
                                }
                            } else {
                                let notify = {
                                    type: 'error',
                                    title: 'OOPS!!',
                                    content: "Sorry something went wrong. Please try later.",
                                    timeout: 5000 //time in ms
                                };
                                $scope.$emit('notify', notify);
                                Utils.applyChanges($scope);
                            }

                        })).catch(err => {
                            reject([]);
                        });

                }).then(evnt => {
                    getEvents(evnt);
                    $scope.event = evnt;
                    $scope.event.event_url = $scope.rewardUrl + "&social=other";

                    if ("ticket_type" in $scope.event && $scope.event.ticket_type == "") {
                        $scope.event.ticket_type = $scope.event.event_type;
                    }

                    $scope.event.canBuyTicket = false;
                    let saleDateCount = 0;
                    angular.forEach($scope.event.tickets_list, function(ticket, index) {
                        let salesStartDate = Utils.getStartAndDate(ticket.sale_start_date, ticket.sale_start_time);
                        let salesEndDate = Utils.getStartAndDate(ticket.sale_end_date, ticket.sale_end_time);
                        let now = moment().tz($scope.event.timezone);

                        if (salesStartDate.diff(now, 'days') <= 0) {
                            $scope.soonTicketStartDate = ticket.sale_start_date + " " + ticket.sale_start_time;
                            if (salesStartDate.diff(now, 'hours') > 0) {
                                $scope.soonTicketStartDate = ticket.sale_start_date + " " + ticket.sale_start_time;
                            } else {
                                $scope.isTicketSaleStart = true;
                            }
                            $scope.soonTicketStartDate = moment.tz($scope.soonTicketStartDate, $scope.event.timezone).format('hhA z, Do MMM YYYY');
                        } else {
                            $scope.soonTicketStartDate = ticket.sale_start_date + " " + ticket.sale_start_time;
                            $scope.isTicketSaleStart = false;
                            $scope.soonTicketStartDate = moment.tz($scope.soonTicketStartDate, $scope.event.timezone).format('hhA z, Do MMM YYYY');
                        }
                        if (salesEndDate.diff(now, 'days') >= 0) {
                            if (salesEndDate.diff(now, 'hours') > 0) {
                                saleDateCount = 1;
                            }
                        } else {
                            saleDateCount = 0;
                        }
                    });
                    if (saleDateCount == 0) {
                        $scope.isTicketSaleEnd = true;
                    } else {
                        $scope.isTicketSaleEnd = false;
                    }
                    if ($scope.event && $scope.event.ticket_type && ($scope.event.ticket_type === 'paid' || ($scope.event.ticket_type === 'free' && $scope.event.admission_ticket_type))) {
                        $scope.event.canBuyTicket = true;
                    }
                    if ($scope.event.claimed_by) {
                        $scope.event.claimed_by = parseInt($scope.event.claimed_by);
                    }

                    if (!$scope.loggedInUser) {
                        $scope.whatsAppUrl = `https://wa.me/?text=${evnt.dynamic_link}`;
                        $scope.snapchatUrl = evnt.dynamic_link;
                        $scope.facebookUrl = evnt.dynamic_link;
                        $scope.emailUrl = evnt.dynamic_link;
                        $scope.otherUrl = evnt.dynamic_link;
                    }

                    // Check if it is user event or user is admin of the event then show manage event
                    $scope.showHideFunctionality();

                    $scope.event.attending = null;
                    let allPromises = [];

                    let fileExtension = (url) => {
                        return url.split(/\#|\?/)[0];
                    };

                    let strip_html_tags = (str) => {
                        if ((str === null) || (str === '')) {
                            return false;
                        } else {
                            var string = str.toString();
                            return string.replace(/<[^>]*>/g, '');
                        }
                    };

                    metaTagsService.setDefaultTags({
                        'title': $scope.event.event_name + ', ' + moment($scope.event.start_date_time).format("ddd, MMM D, YYYY hh:00 A") + ' | The Promo App',
                        'description': $scope.event.description,
                        'keywords': 'The Promo App, event management, event promotion, manage events',
                        // OpenGraph
                        'og:title': $scope.event.event_name,
                        'og:description': strip_html_tags($scope.event.description),
                        'og:image': fileExtension($scope.event.event_image),
                        'og:url': $scope.facebookUrl,
                        // Twitter
                        'twitter:title': $scope.event.event_name,
                        'twitter:description': strip_html_tags($scope.event.description),
                        'twitter:image': fileExtension($scope.event.event_image),
                        'twitter:card': fileExtension($scope.event.event_image),
                    });

                    allPromises.push(getEvents(evnt));
                    allPromises.push(getEventAddress());
                    allPromises.push(getComments(evnt.event_id));
                    // Check whether user is attending or now
                    allPromises.push($scope.getUserAttending(evnt._user_id));
                    allPromises.push($scope.getEventTickets());

                    return Promise.all(allPromises);
                });
            };

            // This function is used to get the event
            $scope.getEventContactDetails = () => {
                if ($scope.event && $scope.event._user_id === $scope.user.user_id) {
                    $scope.event.organizer = $scope.user;
                    $scope.checkFollow = !$scope.checkFollow;
                } else if ($scope.event && $scope.event.claimed_by === $scope.user.user_id) {
                    $scope.event.organizer = $scope.user;
                    $scope.checkFollow = !$scope.checkFollow;
                } else {
                    // Get the user from database
                    userService.getusers([$scope.event.user_id])
                        .then((user) => {
                            if (user && user.length > 0) {
                                $scope.event.organizer = user[0].user;
                                $scope.checkFollow = !$scope.checkFollow;
                                Utils.applyChanges($scope);
                            }
                        });
                }
            };

            // This method is used to decide whether to show/hide different functionality
            $scope.showHideFunctionality = () => {
                if ('event_admin' in $scope.event && $scope.event.event_admin != '') {
                    let local_event_admin = JSON.parse($scope.event.event_admin);
                    $scope.functionality.manageEvents = false;
                    if ($scope.event && $scope.event._user_id === $scope.user.user_id) {
                        $scope.functionality.manageEvents = true;
                    } else if ($scope.event && $scope.event.claimed_by === $scope.user.user_id) { // this is if user has claimed the event
                        $scope.functionality.manageEvents = true;
                    } else if ($scope.event && local_event_admin && local_event_admin.length > 0 && local_event_admin.filter(a => a.email === $scope.user.email).length > 0) { // this is if user has claimed the event
                        $scope.functionality.manageEvents = true;
                    }
                }
            };

            $scope.getUserAttending = (event_id) => {
                return eventsService.getUserEventAttendingStatus($scope.loggedInUser.id)
                    .then((res) => {
                        if (res && res.length > 0) {
                            res.filter(p => {
                                if (p.event_id == event_id) {
                                    $scope.event.attending = p;
                                    $scope.eventAttending = p.type_going;
                                } else if ($scope.loggedInUser.id === $scope.event._user_id) {
                                    // i.e user is creator of the event then show Going
                                    $scope.eventAttending = 'Going';
                                }
                            });
                        }
                    });
            };

            $scope.userEventAttending = (key) => {
                $scope.eventAttending = key;
                let user = $scope.loggedInUser;
                if ($scope.event.attending != null) {
                    let data = {
                        type_going: $scope.eventAttending
                    };
                    eventsService.updateUserEventAttendingStatus(data, session).then(res => {
                        Utils.applyChanges($scope);
                    });
                } else {
                    let data = {
                        event_id: ($scope.event.event_id).toString(),
                        type_going: ($scope.eventAttending).toString(),

                    };

                    eventsService.createUserEventAttendingStatus(data, session).then(response => {
                        if (response.status == 200) {
                            let user_data = response.data;
                            if (user_data.success) {
                                $scope.event.attending = response;
                                Utils.applyChanges($scope);
                                let notify = {
                                    type: 'success',
                                    title: 'Success',
                                    content: user_data.message,
                                    timeout: 5000 //time in ms
                                };
                                $scope.$emit('notify', notify);
                                Utils.applyChanges($scope);
                            } else {
                                let notify = {
                                    type: 'error',
                                    title: 'OOPS!!',
                                    content: user_data,
                                    timeout: 5000 //time in ms
                                };
                                $scope.$emit('notify', notify);
                                Utils.applyChanges($scope);
                            }
                        } else {
                            let notify = {
                                type: 'error',
                                title: 'OOPS!!',
                                content: "Sorry something went wrong. Please try later.",
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            Utils.applyChanges($scope);
                        }
                    }).catch(err => {
                        console.log(err);
                    });
                }

                let send_to_friends = false;
                let notified_user = [];
                let notify_text = '';
                // Check if user has set new status as going send notification
                if ($scope.eventAttending == 'Going') {
                    notify_text = user.full_name + " " + " is going to" + " " + $scope.event.event_name;
                    send_to_friends = true;
                } else if ($scope.eventAttending == 'May be') {
                    notify_text = user.full_name + " " + " may be going to" + " " + $scope.event.event_name;
                    send_to_friends = true;
                } else {
                    notify_text = user.full_name + " " + " is not going to" + " " + $scope.event.event_name;
                }

                let notificationDataList = [];
                // Send notification to event creator
                let notificationData = {
                    notify_text: notify_text,
                    _parent_id: $scope.event.id,
                    notify_userId: $scope.event.user_id,
                    notif_type: 'EventUserAttendance'
                };
                notified_user.push($scope.event.user_id);
                notificationDataList.push(notificationData);

                // Send notification to event admins
                // Check if event admins
                if ($scope.event.event_admin) {
                    let event_admins = $scope.event.event_admin;
                    if (event_admins && event_admins.length > 0) {
                        event_admins.forEach((admin) => {
                            // Send notification to event creator
                            let notificationData = {
                                notify_text: notify_text,
                                _parent_id: $scope.event.id,
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
                if (send_to_friends && $scope.event.invite_friends) {
                    let invite_friends = JSON.parse($scope.event.invite_friends);
                    if (invite_friends && invite_friends.length > 0) {
                        invite_friends.forEach((friend) => {
                            // Send notification to event creator
                            let notificationData = {
                                notify_text: notify_text,
                                _parent_id: $scope.event.id,
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
                    followUser.followers(user.user_id, session).then(res => {
                        res.forEach((uid) => {
                            // Send notification to event creator
                            let notificationData = {
                                notify_text: notify_text,
                                _parent_id: $scope.event.event_id,
                                notify_userId: uid.user_id,
                                notif_type: 'EventUserAttendance'
                            };
                            if (notified_user.indexOf(uid.user_id) == -1) {
                                notificationDataList.push(notificationData);
                                notified_user.push(uid.user_id);
                            }
                        });
                    }).catch(err => {
                        element.text(0);
                    });
                }

                if (notificationDataList && notificationDataList.length > 0) {
                    qbService.batchUpload('Notification', notificationDataList)
                        .then(() => {});
                }
            };

            $scope.handleSlider = (step, id) => {
                angular.element(`#${id}`).carousel(step);
            };

            $scope.openOrderSuccess = () => {
                let eventModelScope = $scope.$new(false, $scope);

                $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/ticketConfirmationModal.html',
                    openedClass: 'pa-create-event-modal add-link-modal',
                    scope: eventModelScope,
                    size: 'md'
                });

            };

            $scope.changeImagesOnLoad = function() {
                let imageUrl = $scope.event.image_url;
                if (imageUrl && imageUrl.includes('quickblox')) {
                    $scope.autoWidthImg = true;
                }
                if ($scope.event.image_url) {
                    $scope.event.image_url = imageUrl.replace("w=1700", "w=2100");
                    $scope.event.image_url = imageUrl.replace("h=627", "h=800");
                }
            };

            $scope.setBackTo = () => {
                $scope.backTo = {
                    title: 'Home',
                    url: '/'
                };
                if ($rootScope.previousPage) {
                    if ($rootScope.previousPage.includes('/manageevent')) {
                        $scope.functionality.hideRelatedEvents = true;
                        $scope.backTo = { title: 'Live Events', url: $rootScope.previousPage };
                        if ($rootScope.previousPage.includes('#draft')) {
                            $scope.backTo.title = 'Draft Events';
                        } else if ($rootScope.previousPage.includes('#closedevents')) {
                            $scope.backTo.title = 'Closed Events';
                        } else if ($rootScope.previousPage.includes('#claimedevents')) {
                            $scope.backTo.title = 'Claimed Events';
                        }
                    } else if ($scope.isMobile && !$rootScope.previousPage.includes('/eventdetails')) {
                        $scope.backTo.url = $rootScope.previousPage;
                    }
                }
            };

            $scope.init = () => {
                $.get("https://api.ipify.org/?format=json").then(function(response) {
                    $scope.ip = response.ip;
                });
                let getConfirmation = null;
                let confirmation = null;
                let getPastSetItem = localStorage.getItem("setConfirmation");
                if (getPastSetItem === null) {
                    localStorage.setItem("setConfirmation", '');
                }
                $scope.user = authService.getObject('user');

                $scope.session = authService.getObject('session');
                if ($scope.user && $scope.session) {
                    $scope.headerTemplate = 'partials/header.html';
                }

                if ($scope.viewEnvtID == ":evntID") {
                    Utils.removeEventsFromLocal($window);
                    Utils.applyChanges($scope);
                    $window.location.href = '/';
                }

                $scope.browserName = deviceDetector.browser;
                if (deviceDetector && !deviceDetector.isDesktop()) {
                    $scope.isMobile = true;
                } else {
                    $scope.isMobile = false;
                }

                $scope.setBackTo();
                let eventDetilUrl = '';
                let queryStringObject = $location.search();
                $scope.loading = true;
                $scope.user = authService.getUser();
                if ($scope.viewEnvtID === 'undefined') {
                    $scope.viewEnvtID = authService.get('event_id');
                    location.href = base_url + '/eventdetails/' + $scope.viewEnvtNAME + '/' + $scope.viewEnvtID;
                }
                angular.element($('#myCarousel').carousel());
                angular.element($('#myCarousel-web').carousel());

                angular.element("#mailtoui-modal-close").on('click', function() {
                    angular.element("#mailtoui-button-1").attr("href", "");
                    angular.element("#mailtoui-button-2").attr("href", "");
                    angular.element("#mailtoui-button-3").attr("href", "");
                    angular.element("#mailtoui-button-4").attr("href", "");
                    angular.element("#mailtoui-email-address").empty();
                    angular.element("#mailtoui-modal").hide();
                });

                getEvent($scope.viewEnvtID)
                    .then(r => {
                        $scope.changeImagesOnLoad();
                        if (window.outerWidth && window.outerWidth > 768 && window.outerWidth < 1000) {
                            $scope.functionality.limitTo = 2;

                        } else if (window.outerWidth && window.outerWidth < 768) {
                            $scope.functionality.limitTo = 1;
                        }
                        $scope.loading = false;
                        if ('order_success' in queryStringObject && queryStringObject.order_success) {
                            // Check if mobile
                            $scope.isMobile = window.matchMedia("only screen and (max-width: 1024px)");
                            if ($scope.isMobile.matches) {
                                $scope.functionality.ordersuccess = true;
                            } else {
                                $scope.openOrderSuccess();
                            }
                        }
                        Utils.applyChanges($scope);
                    })
                    .catch((err) => {
                        $scope.loading = false;
                        $scope.loaderMessage = "Unable to load event details please try after sometime.";
                        Utils.applyChanges($scope);
                    });
                /* Mobile Application Open Snippest Code */
                let isApple = /iPhone|iPad|iPod/i.test(navigator.userAgent);
                let isAndroid = /Android/i.test(navigator.userAgent);
                let url = $location.url();
                let eventDetailUrl = 'promoapp://https:' + base_host + '' + url;
                if (isApple || isAndroid) {
                    getConfirmation = localStorage.getItem("setConfirmation");
                    if (getConfirmation === '') {
                        confirmation = confirm("Are you want to see event detail on Thepromoapp application?");
                        localStorage.setItem("setConfirmation", confirmation);
                    }
                    getConfirmation = localStorage.getItem("setConfirmation");
                }
                if (isApple) {
                    if (getConfirmation === "true") {
                        $window.location = eventDetailUrl;
                        let fallbackLink = 'https://apps.apple.com/in/app/the-promo-app/id1075964954';
                        setTimeout(function() {
                            $window.location.replace(fallbackLink);
                        }, 25);
                    }
                }
                if (isAndroid) {
                    if (getConfirmation === "true") {
                        $window.location = eventDetailUrl;
                        let fallbackLink = 'https://play.google.com/store/apps/details?id=com.thepromoapp.promo';
                        setTimeout(function() {
                            $window.location.replace(fallbackLink);
                        }, 25);
                    }
                }
                /* Mobile Application Open Snippest Code */
            };

            $scope.getCurrentURL = function(event_details) {
                let base_url = window.location.origin;
                let id = event_details.id;
                let share_url = base_url + "/eventdetails/" + $scope.viewEnvtNAME + '/' + id;
                $scope.scopeURL = share_url;
                return share_url;
            };

            $scope.cancel = function() {
                this.$dismiss({});
            };

            $scope.openClaimSuccess = () => {
                let eventModelScope = $scope.$new(false, $scope);

                $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/claimConfirmationModal.html',
                    openedClass: 'pa-create-event-modal add-link-modal',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            $scope.openClaimFailure = () => {
                let eventModelScope = $scope.$new(false, $scope);

                $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/claimFailure.html',
                    openedClass: 'pa-create-event-modal add-link-modal',
                    scope: eventModelScope,
                    size: 'md'
                });
            };

            $scope.claimEvent = function(event) {
                let token = authService.get('token');

                eventsService.freeClaimedEvent(event.event_id, token).then((response) => {
                    if (response.success) {
                        $scope.openClaimSuccess();
                    } else {
                        $scope.openClaimFailure();
                    }
                });
            };

            $scope.openSeeLocation = function() {
                $scope.eventDetailSec = false;
                $scope.eventDetailMapSec = true;
            };

            $scope.openEventDeatilsSec = function() {
                $scope.eventDetailSec = true;
                $scope.eventDetailMapSec = false;
            };

            $scope.eventMarkerPositionModal = (event) => {
                $scope.eventMarkerForModal = event;
                $scope.openEventMarkerModal(event);
            };

            var wage = document.getElementById("commentId");
            if (wage != null) {
                wage.addEventListener("keydown", function(e) {
                    if (e.keyCode === 13) { //checks whether the pressed key is "Enter"
                        if ($scope.newComment.comment) {
                            $scope.doComments();
                        }

                    }
                });
            }


            $scope.openEventMarkerModal = function(event) {
                let mapShareScope = $scope.$new(true);
                mapShareScope.eventMarkerForModal = event;
                let modalInstance = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../partials/mapModal.html',
                    controller: 'mapModalController',
                    controllerAs: 'edmc',
                    scope: mapShareScope

                });

                modalInstance.result.then(function(selectedItem) {}, function() {});

            };

            $scope.viewAllComment = function() {
                $scope.totalComments = $scope.comments.length;
                $scope.eventDetailSec = false;
                $scope.functionality.viewAllComments = true;
            };

            $scope.viewLessComment = function() {
                $scope.eventDetailSec = !$scope.eventDetailSec;
                $scope.totalComments = 3;
                $scope.functionality.viewAllComments = false;
            };

            $scope.init();

            autosize();

            function autosize() {
                var text = angular.element(document.querySelector('.autosize'));
                text.each(function() {
                    $(this).attr('rows', 1);
                    resize($(this));
                });

                text.on('input', function() {
                    resize($(this));
                });

                function resize($text) {
                    $text.css('height', 'auto');
                    $text.css('height', $text[0].scrollHeight + 'px');
                }
            }
        }
    ]);