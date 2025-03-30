angular.module('PromoApp')
    .controller('eventdetailswidgetController', ['Socialshare', '$route', '$scope', '$location', 'eventsService', 'apiService', 'deviceDetector', '$rootScope', 'Utils', '$window', 'config', 'locationService', 'metaTagsService',
        function(Socialshare, $route, $scope, $location, eventsService, apiService, deviceDetector, $rootScope, Utils, $window, config, locationService, metaTagsService) {
            $scope.message = "";
            $scope.viewEnvtID = $route.current.params.evntID;
            $scope.viewEnvtNAME = $route.current.params.evntName;
            $scope.isMobile = false;
            let base_url = $window.location.origin;
            let base_host = $window.location.host;
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
            $scope.loggedInUser = false;
            $scope.eventDetailSec = true;
            $scope.eventDetailMapSec = false;
            $scope.autoWidthImg = false;

            $scope.checkFollow = false;
            $scope.rewardExit = false;
            $scope.categoriesMap = [];
            $scope.allRemaingTicket = 0;

            apiService.getEventCategories().then((response) => {
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


            $scope.isTicketSaleStart = false;
            $scope.isTicketSaleEnd = false;
            $scope.soonTicketStartDate = '';


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
                                    resolve(ev);
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


                    return Promise.all(allPromises);
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
                $scope.loading = true;

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

            $scope.init();
        }
    ]);