angular.module('PromoApp')
    .controller('eventdetailController', ['Socialshare', 'phqservice', '$route', '$scope', '$uibModal', '$location', 'eventsService', 'authService', 'apiService', 'commentService', 'deviceDetector', 'qbService', 'userService', 'followUser', '$rootScope', 'Utils', '$window', 'config', 'locationService', 'metaTagsService', '$cookies', 'dataTransfer', '$http',
        function(Socialshare, phqservice, $route, $scope, $uibModal, $location, eventsService, authService, apiService, commentService, deviceDetector, qbService, userService, followUser, $rootScope, Utils, $window, config, locationService, metaTagsService, $cookies, dataTransfer, $http) {
            $scope.message = "";
            if ($route.current.params.ev) {
                $scope.viewEnvtID = $route.current.params.ev;
            } else {
                $scope.viewEnvtID = $route.current.params.evntID;
            }
            $scope.viewEnvtNAME = $route.current.params.evntName;
            $scope.invitedId = $route.current.params.invite_id;
            if ($scope.invitedId) {
                authService.put('invitedId', $scope.invitedId);
            }
            $scope.sidebarBlock = false;
            $scope.isMobile = false;
            let base_url = $window.location.origin;
            let base_host = $window.location.host;
            let session = authService.getSession();
            $scope.eventLogin = {};
            $scope.event = null;
            $scope.active = 0;
            $scope.ip = "0.0.0.0";
            $scope.browserName = "unknown";
            $scope.reward_id = null;
            $scope.loading = true;
            $scope.userPassword = '';
            $scope.eventViewVisible = false;
            $scope.eventViewAuth = false;
            $scope.loaderMessage = 'Loading...';
            $scope.ev = [];
            $scope.comments = [];
            $scope.userImageUrl = {};
            $scope.backTo = {
                title: '',
                url: '/manageevent'
            };
            $scope.passwordToken = authService.get('passwordToken');
            $scope.passwordInfo = authService.get('passwordInfo');
            $scope.authError = false;
            $scope.yellowBanner = false;
            $scope.detailTabNew = false;
            $scope.loggedInUser = authService.getUser();
            $scope.eventDetailSec = true;
            $scope.eventDetailMapSec = false;
            $scope.autoWidthImg = false;
            $scope.viewComment = false;
            $scope.passwordWrong = false;
            $scope.passwordWrongText = "";
            $scope.totalComments = 3;
            $scope.newComment = {
                comment: null
            };
            $scope.checkFollow = false;
            $scope.eventApplicationData = {};
            $scope.cmtName = null;
            $scope.newtoday_date = moment.utc().add(2, "days").format("DD-MM-YYYY");
            $scope.addPromotionDisabled = true;
            $scope.rewardExit = false;
            $scope.categoriesMap = [];
            $scope.allRemaingTicket = 0;
            $scope.zoneDashboardURL = '';
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

            /*
             ** shortner Link 
             */
            $scope.shortnerUrl = (value) => {
                return $http({
                    url: 'https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=AIzaSyC5Bis-UR8qn16xDukoGHJkIMa8Q8nv7XI',
                    method: 'POST',
                    data: {
                        "dynamicLinkInfo": {
                            "domainUriPrefix": 'https://thepromoapp.page.link',
                            "link": value,
                        }
                    },
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    json: true,
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
                        if (err.status == -1) {
                            $scope.getEventTickets();
                        } else {
                            console.log(err);
                            let notify = {
                                type: 'error',
                                title: 'OOPS!!',
                                content: "Sorry something went wrong. Please try later.",
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                        }
                        Utils.applyChanges($scope);
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
                } else {
                    eventsService.shareEvent($scope.event.event_id)
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

            $scope.getEventDataPrivate = (id, password) => {
                let data = {};
                if ($scope.event) {
                    if ($scope.event.privateEventMessage == 'PASSWORD_REQUIRED') {
                        data = {
                            password: password
                        };
                    }
                }
                $scope.passwordWrong = true;
                getEvent(id, data);
            };

            $scope.hidePasswordMessage = (value) => {
                if (!value) {
                    $scope.passwordWrongText = "";
                    Utils.applyChanges($scope);
                }
            };

            let getEvent = (eventID, data) => {
                return new Promise((resolve, reject) => {
                    if ($scope.invitedId) {
                        let info = {
                            invite_id: $scope.invitedId
                        };
                        data = info;
                    }
                    if ($scope.passwordToken) {
                        let info = {
                            passwordToken: $scope.passwordToken
                        };
                        data = info;
                    }
                    eventsService.getEventDetails(eventID, data)
                        .then((response => {
                            if (response.status == 200) {
                                let data = response.data;
                                dataTransfer.setUserDetails(data);
                                $scope.sidebarBlock = true;
                                if (data.success) {
                                    if (!data.data.privateEventMessage) {
                                        $scope.reward_id = data.data.reward_details.reward_id;
                                        $scope.eventViewVisible = true;
                                        $scope.eventViewAuth = false;
                                        $scope.passwordWrong = false;
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
                                        let ticketsData = "";
                                        let ticketDataArray = [];
                                        let eventName = ev.event_name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().replace(/\W+(?!$)/g, '-');
                                        tickets = tickets.filter((t) => ((!t.status) || (t.status == 'active')));
                                        for (let t of tickets) {
                                            $scope.allRemaingTicket += t.remaining_qty;
                                            let saleEndDate = t.sale_end_date + " " + t.sale_end_time;
                                            let saleStartDate = t.sale_start_date + " " + t.sale_start_time;
                                            ticketsData = {
                                                "availabilityEnds": moment(saleEndDate).format(),
                                                "priceCurrency": t.currency_code,
                                                "url": `${base_url}/ticket_type?ev=${ev.event_id}`,
                                                "price": t.price,
                                                "@type": ev.event_type,
                                                "availabilityStarts": moment(saleStartDate).format(),
                                                "validFrom": moment(t.date_created).format(),
                                                "availability": t.status
                                            };
                                            ticketDataArray.push(ticketsData);
                                        }
                                        if (ev && 'reward_details' in ev && 'reward_id' in ev.reward_details) {
                                            $scope.rewardExit = true;
                                            $scope.rewardUrl = ev.event_url;
                                        }

                                        if ($scope.loggedInUser) {
                                            console.log("base_url", base_url);
                                            let shareURL = base_url + '/eventdetails/' + $route.current.params.evntName + "/" + $route.current.params.evntID + "?ref=" + $scope.loggedInUser.user_id + "&social=";
                                            let WhatsAppLink = shareURL + "whatsapp";
                                            WhatsAppLink = encodeURIComponent(WhatsAppLink);
                                            $scope.whatsAppUrl = `https://wa.me/?text=${WhatsAppLink}`;
                                            $scope.snapchatUrl = shareURL + "snapchat";
                                            $scope.facebookUrl = shareURL + "facebook";
                                            $scope.emailUrl = shareURL + "email";
                                            $scope.otherUrl = shareURL + "other";
                                            $scope.shortnerUrl($scope.whatsAppUrl).then((data) => {
                                                if (data.data != null) {
                                                    newLink = data.data.shortLink;
                                                    $scope.whatsAppUrl = newLink;
                                                }
                                            });
                                            $scope.shortnerUrl($scope.snapchatUrl).then((data) => {
                                                if (data.data != null) {
                                                    newLink = data.data.shortLink;
                                                    $scope.snapchatUrl = newLink;
                                                }
                                            });
                                            $scope.shortnerUrl($scope.facebookUrl).then((data) => {
                                                if (data.data != null) {
                                                    newLink = data.data.shortLink;
                                                    $scope.facebookUrl = newLink;
                                                }
                                            });
                                            $scope.shortnerUrl($scope.emailUrl).then((data) => {
                                                if (data.data != null) {
                                                    newLink = data.data.shortLink;
                                                    $scope.emailUrl = newLink;
                                                }
                                            });
                                            $scope.shortnerUrl($scope.otherUrl).then((data) => {
                                                if (data.data != null) {
                                                    newLink = data.data.shortLink;
                                                    $scope.otherUrl = newLink;
                                                }
                                            });
                                            Utils.applyChanges($scope);
                                        }

                                        $scope.eData = {
                                            "startDate": moment(ev.start_date_time).format(),
                                            "endDate": moment(ev.end_date_time).format(),
                                            "name": ev.event_name,
                                            "url": `${base_url}/eventdetails/${eventName}/${ev.event_id}`,
                                            "image": ev.event_image,
                                            "tickets": ticketDataArray,
                                            "location": {
                                                "url": `${base_url}/ticket_type?ev=${ev.event_id}`,
                                                "@type": "VirtualLocation"
                                            },
                                            "@context": "http://schema.org",
                                            "organizer": {
                                                "url": `${base_url}/userprofile/${ev.organizer_details.user_id}`,
                                                "description": ev.organizer_details.about_you,
                                                "@type": "Organization",
                                                "name": ev.organizer_details.first_name + " " + ev.organizer_details.last_name
                                            },
                                            "@type": ev.category,
                                            "description": ev.description.replace(/(<([^>]+)>)/ig, '')
                                        };

                                        if (ev.zone_details != '') {
                                            $scope.zoneDashboardURL = '/zoneProfile/' + ev._zone_id;
                                            localStorage.setItem(ev.zone_details.zone_id, JSON.stringify(ev.zone_details));
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
                                        $scope.eventViewAuth = true;
                                        $scope.loading = false;
                                        $scope.event = data.data;
                                        let requiredInfo = $scope.event.privateEventMessage;
                                        if (requiredInfo == "LOGIN_REQUIRED" || requiredInfo == 'NOT_INVITED' || requiredInfo == 'INVITE_INVALID_OR_EXPIRED') {
                                            $scope.authError = true;
                                        }
                                        if ($scope.passwordWrong) {
                                            $scope.passwordWrongText = "Password is wrong. Please enter correct password.";
                                        } else {
                                            $scope.passwordWrongText = "";
                                        }
                                        Utils.applyChanges($scope);
                                    }
                                }
                            } else {
                                let notify = {
                                    type: 'error',
                                    title: 'OOPS!!',
                                    content: "Sorry something went wrong. Please try later.",
                                    timeout: 5000 //time in ms
                                };
                                $scope.$emit('notify', notify);
                            }

                        })).catch(err => {
                            if (err.status == 422) {
                                if (err.data.message == "Incorrect Password!") {
                                    $scope.passwordWrongText = "Password is wrong. Please enter correct password.";
                                }
                            } else {
                                let notify = {
                                    type: 'error',
                                    title: 'OOPS!!',
                                    content: err.data.message,
                                    timeout: 5000 //time in ms
                                };
                                $scope.$emit('notify', notify);
                            }
                            reject([]);
                        });
                }).then(evnt => {
                    getEvents(evnt);
                    $scope.event = evnt;
                    $scope.event.event_url = $scope.rewardUrl + "&social=other";
                    if ($scope.event) {
                        let requireDate = $scope.newtoday_date;
                        let selectedDate = moment($scope.event.start_date_time).format("DD-MM-YYYY");
                        if (selectedDate < requireDate) {
                            $scope.addPromotionDisabled = false;
                        } else {
                            $scope.addPromotionDisabled = true;
                        }
                    }
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

                    if ($scope.event.passwordToken) {
                        authService.put('passwordToken', $scope.event.passwordToken);
                    }

                    if ($scope.event.password) {
                        authService.put('passwordInfo', $scope.event.password);
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
                            return '';
                        } else {
                            var string = str.toString();
                            return string.replace(/<[^>]*>/g, '');
                        }
                    };

                    let metaDescription = strip_html_tags($scope.event.description);

                    metaTagsService.setDefaultTags({
                        'title': $scope.event.event_name + ', ' + moment($scope.event.start_date_time).format("ddd, MMM D, YYYY hh:00 A") + ' | The Promo App',
                        'description': metaDescription,
                        'keywords': 'Social Event Management Network, Online events, Event Management Network',
                        // OpenGraph
                        'og:title': $scope.event.event_name,
                        'og:description': metaDescription,
                        'og:image': fileExtension($scope.event.event_image),
                        'og:url': $scope.facebookUrl,
                        // Twitter
                        'twitter:title': $scope.event.event_name,
                        'twitter:description': metaDescription,
                        'twitter:image': fileExtension($scope.event.event_image),
                        'twitter:card': fileExtension($scope.event.event_image),
                    });

                    allPromises.push(getEvents(evnt));
                    allPromises.push(getEventAddress());
                    allPromises.push(getComments(evnt.event_id));
                    // Check whether user is attending or now
                    allPromises.push($scope.getUserAttending(evnt.event_id));
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
                let token = authService.get('token');
                return eventsService.getUserEventAttendingStatus(token, $scope.user.id)
                    .then((res) => {
                        if (res && res.length > 0) {
                            res.filter(p => {
                                if (p.event_id == event_id) {
                                    $scope.event.attending = p;
                                    $scope.eventAttending = p.type_going;
                                } else if ($scope.user.id === $scope.event._user_id) {
                                    // i.e user is creator of the event then show Going
                                    $scope.eventAttending = 'Going';
                                }
                                Utils.applyChanges($scope);
                            });
                        }
                    });
            };

            $scope.loginModalMethod = () => {
                let modalScope = $scope.$new(true);
                modalScope.toSignup = `/signup?redirectSignup=${modalScope.redirectUrl}`;
                $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    backdrop: 'static',
                    templateUrl: '../partials/loginModal.html',
                    controller: 'LoginModalController',
                    controllerAs: 'plm',
                    windowClass: 'login-modal login-modal-fix',
                    scope: modalScope
                });
            };

            $scope.userEventAttending = (key) => {
                let eventAttendings = key;
                let userSession = authService.getSession();
                let user = authService.getUser();
                if (userSession && user) {
                    $scope.loading = true;
                    if ($scope.eventAttending == key) {
                        let data = {
                            event_id: ($scope.event.event_id).toString(),
                            type_going: 'Not Going',
                        };
                        eventsService.updateUserEventAttendingStatus(data, session).then(res => {
                            $scope.loading = false;
                            if (res.status == 200) {
                                let user_data = res.data;
                                if (user_data.success) {
                                    $scope.event.attending = res;
                                    $scope.eventAttending = 'Not Going';
                                    Utils.applyChanges($scope);
                                    let notify = {
                                        type: 'success',
                                        title: 'Success',
                                        content: "Your interest in the event is removed.",
                                        timeout: 5000 //time in ms
                                    };
                                    $scope.$emit('notify', notify);
                                    $scope.loading = false;
                                    Utils.applyChanges($scope);
                                } else {
                                    let notify = {
                                        type: 'error',
                                        title: 'OOPS!!',
                                        content: user_data.message,
                                        timeout: 5000 //time in ms
                                    };
                                    $scope.loading = false;
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
                                $scope.loading = false;
                                $scope.$emit('notify', notify);
                                Utils.applyChanges($scope);
                            }
                        }).catch(err => {
                            console.log(err);
                            $scope.loading = false;
                        });

                    } else {
                        let data = {
                            event_id: ($scope.event.event_id).toString(),
                            type_going: (eventAttendings).toString(),
                        };

                        eventsService.createUserEventAttendingStatus(data, session).then(response => {
                            if (response.status == 200) {
                                let user_data = response.data;
                                if (user_data.success) {
                                    $scope.event.attending = response;
                                    $scope.eventAttending = key;
                                    Utils.applyChanges($scope);
                                    let notify = {
                                        type: 'success',
                                        title: 'Success',
                                        content: "Your interest in the event is saved.",
                                        timeout: 5000 //time in ms
                                    };
                                    $scope.$emit('notify', notify);
                                    $scope.loading = false;
                                    Utils.applyChanges($scope);
                                } else {
                                    let notify = {
                                        type: 'error',
                                        title: 'OOPS!!',
                                        content: user_data.message,
                                        timeout: 5000 //time in ms
                                    };
                                    $scope.loading = false;
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
                                $scope.loading = false;
                                $scope.$emit('notify', notify);
                                Utils.applyChanges($scope);
                            }
                        }).catch(err => {
                            console.log(err);
                            $scope.loading = false;
                        });
                    }
                } else {
                    $scope.loginModalMethod();
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

            $scope.closeDetailTab = () => {
                window.top.close();
                window.location.href = "/";
            };

            $scope.setBackTo = () => {
                $scope.backTo = {
                    title: 'Home',
                    url: '/'
                };
                if ($rootScope.previousPage && $rootScope.previousPage != '#undefined') {
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
                    } else if ($scope.isMobile && $rootScope.previousPage.includes('/ticket_type')) {
                        $scope.backTo.url = '/';
                    } else if (!$scope.isMobile && $rootScope.previousPage.includes('/eventdetails')) {
                        $scope.detailTabNew = true;
                    } else if ($scope.isMobile && ($rootScope.previousPage.includes('#liveevents') || $rootScope.previousPage.includes('#draft') || $rootScope.previousPage.includes('#closedevents'))) {
                        $scope.backTo.url = '/manageevent#liveevents';
                    } else if ($scope.isMobile && !$rootScope.previousPage.includes('/eventdetails')) {
                        $scope.backTo.url = $rootScope.previousPage;
                    }
                } else {
                    $scope.backTo = { title: 'Home', url: '/' };
                }
            };

            /*
             **
             ** Add Event Visitor
             **
             */
            $scope.addEventVisitor = (userId, ipAddress, deviceType) => {
                let data = {};
                if (userId == '') {
                    data = {
                        event_id: $scope.viewEnvtID,
                        ip_address: ipAddress,
                        device_type: deviceType
                    };
                } else {
                    data = {
                        event_id: $scope.viewEnvtID,
                        user_id: userId,
                        ip_address: ipAddress,
                        device_type: deviceType
                    };
                }
                apiService.addEventVisitor(data).then((response) => {});
            };

            /*
             **
             ** Event Detail init function
             **
             */
            $scope.init = () => {
                let getConfirmation = null;
                let confirmation = null;
                let getPastSetItem = localStorage.getItem("setConfirmation");
                if (getPastSetItem === null) {
                    localStorage.setItem("setConfirmation", '');
                }
                $scope.user = authService.getObject('user');
                $scope.promotionGuidance = $cookies.get('promotionGuidance');
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
                $scope.isMobile = window.matchMedia("only screen and (max-width: 1024px)");
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
                let eventDetailUrl = 'promoapp://https:' + base_host + '/' + url;
                $.get("https://api.ipify.org/?format=json").then(function(response) {
                    $scope.ip = response.ip;
                    let deviceType = 1;
                    if ($scope.isMobile.matches) {
                        deviceType = 2;
                    }
                    if ($scope.ip && location.pathname != '/promotionEvent') {
                        if ($scope.user) {
                            $scope.addEventVisitor($scope.user.id, $scope.ip, deviceType);
                        } else {
                            let user = '';
                            $scope.addEventVisitor(user, $scope.ip, deviceType);
                        }
                    }
                });
                if (isApple || isAndroid) {
                    getConfirmation = localStorage.getItem("setConfirmation");
                    if (getConfirmation === '') {
                        confirmation = confirm("Are you want to see event detail on Thepromoapp application?");
                        localStorage.setItem("setConfirmation", confirmation);
                    }
                    getConfirmation = localStorage.getItem("setConfirmation");
                }
                if (isApple && confirmation) {
                    if (getConfirmation === "true") {
                        $window.location = eventDetailUrl;
                        let fallbackLink = 'https://apps.apple.com/in/app/the-promo-app/id1075964954';
                        setTimeout(function() {
                            $window.location.replace(fallbackLink);
                        }, 25);
                    }
                }
                if (isAndroid && confirmation) {
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

            // This function is called on click Add Promotion
            $scope.addPromotionRoute = (value) => {
                if ($scope.promotionGuidance == undefined) {
                    $cookies.put('promotionGuidance', true);
                }
                window.open(`/createreward/add/${value}`, '_blank');
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