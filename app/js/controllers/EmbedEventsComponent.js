angular.module('PromoApp')
    .controller('embedEventsComponentController', ['$scope', '$route', 'eventsService', 'metaTagsService', 'authService', 'apiService', 'Socialshare', 'config', 'deviceDetector', 'Utils', function($scope, $route, eventsService, metaTagsService, authService, apiService, Socialshare, config, deviceDetector, Utils) {
        /*
         ** Variable List
         */
        $scope.buttonViewFlag = false;
        $scope.detailViewFlag = false;
        $scope.listViewFlag = false;
        $scope.loading = false;
        $scope.loadingMessage = 'Loading...';
        $scope.functionality = {
            showMore: false
        };
        $scope.ip = "0.0.0.0";
        $scope.reward_id = null;
        $scope.categoriesMap = [];
        $scope.yellowBanner = false;
        $scope.browserName = deviceDetector.browser;
        $scope.isTicketSaleStart = false;
        $scope.isTicketSaleEnd = false;
        let token = authService.get('token');
        $scope.soonTicketStartDate = '';
        $scope.dynamic_link = "";
        $scope.allRemaingTicket = 0;
        $scope.eventView = '';
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

        /*
         ** Category Function
         */
        $scope.getCatName = function(nameKey, myArray) {
            for (var i = 0; i < myArray.length; i++) {
                if (myArray[i].id === nameKey) {
                    return myArray[i];
                }
            }
        };

        /*
         **
         */
        $scope.socialShare = (social_type, analytic) => {
            if (social_type == "facebook") {
                Socialshare.share({
                    'provider': social_type,
                    'attrs': {
                        'appId': config.FACEBOOK_APP_ID,
                        'socialshareUrl': $scope.facebookUrl,
                        'socialshareDisplay': $scope.eventList[0].event_name
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
                        'socialshareBody': $scope.dynamic_link,
                        'socialshareSubject': $scope.eventList[0].event_name
                    }
                });
            }

            let socialData = {
                social_type: social_type,
                reward_id: $scope.eventList[0].reward_details.reward_id,
                device_type: 'web',
                browser_name: $scope.browserName,
                ip_address: $scope.ip
            };

            if (analytic) {
                eventsService.socialRewardShare(socialData)
                    .then((response) => {});
            } else {
                eventsService.shareEvent($scope.eventList[0].event_id)
                    .then((response) => {});
            }
        };

        $scope.emailShare = (social_type, analytic) => {
            let googleMail = 'https://mail.google.com/mail/?view=cm&fs=1&to=&su=' + $scope.eventList[0].event_name + '&body=' + $scope.dynamic_link;
            let ooutlookMail = 'https://outlook.office.com/owa/?path=/mail/action/compose&to=&subject' + $scope.eventList[0].event_name + '&body=' + $scope.dynamic_link;
            let yahooMail = 'https://compose.mail.yahoo.com/?to=&subject=' + $scope.eventList[0].event_name + '&body=' + $scope.dynamic_link;
            let email = 'mailto:?subject=' + $scope.eventList[0].event_name + '&body=' + $scope.dynamic_link;
            angular.element("#mailtoui-button-1").attr("href", googleMail);
            angular.element("#mailtoui-button-2").attr("href", ooutlookMail);
            angular.element("#mailtoui-button-3").attr("href", yahooMail);
            angular.element("#mailtoui-button-4").attr("href", email);
            angular.element("#mailtoui-email-address").append($scope.dynamic_link);
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

        $scope.getSocialShareURL = () => {
            var rewardUrl = $scope.dynamic_link;
            return rewardUrl;
        };

        /*
         ** Init Method
         */

        $scope.init = () => {
            $.get("https://api.ipify.org/?format=json").then(function(response) {
                $scope.ip = response.ip;
            });
            angular.element(document).ready(function() {
                angular.element('body').css({ 'background': '#fff' });
            });
            $scope.loading = true;
            $scope.eventList = [];
            $scope.layoutViewJson = KJUR.jws.JWS.readSafeJSONString(b64utoutf8(($route.current.params.embed).split(".")[1]));
            apiService.widgetUserEventList($scope.layoutViewJson.user_id).then((response) => {
                $scope.eventsLists = response.data.data;
                if ($scope.layoutViewJson.embedOption != "listView") {
                    angular.forEach($scope.eventsLists, function(listItem) {
                        if ($scope.layoutViewJson.eventIds === listItem.event_id) {
                            $scope.eventList.push(listItem);
                            $scope.eventView = $scope.eventList[0];
                            $scope.dynamic_link = $scope.eventView.dynamic_link;
                            let tickets = $scope.eventView.tickets_list;
                            tickets = tickets.filter((t) => ((!t.status) || (t.status == 'active')));
                            for (let t of tickets) {
                                $scope.allRemaingTicket += t.remaining_qty;
                            }
                            angular.forEach($scope.eventView.tickets_list, function(ticket, index) {
                                let salesStartDate = Utils.getStartAndDate(ticket.sale_start_date, ticket.sale_start_time);
                                let salesStartEnd = Utils.getStartAndDate(ticket.sale_end_date, ticket.sale_end_time);
                                let endDate = moment(salesStartDate);
                                let saleEnd = moment(salesStartEnd);
                                let now = moment();
                                if ($scope.eventView.timezone) {
                                    endDate = endDate.tz($scope.eventView.timezone);
                                    saleEnd = saleEnd.tz($scope.eventView.timezone);
                                    now = now.tz($scope.eventView.timezone);
                                }
                                if (endDate.diff(now, 'days') <= 0) {
                                    $scope.soonTicketStartDate = ticket.sale_start_date + " " + ticket.sale_start_time;
                                    if (endDate.diff(now, 'hours') > 0) {
                                        $scope.soonTicketStartDate = ticket.sale_start_date + " " + ticket.sale_start_time;
                                    } else {
                                        $scope.isTicketSaleStart = true;
                                    }
                                    $scope.soonTicketStartDate = moment.tz($scope.soonTicketStartDate, $scope.eventsLists.timezone).format('hhA z, Do MMM YYYY');
                                }
                                if (saleEnd.diff(now, 'days') <= 0) {
                                    $scope.isTicketSaleEnd = true;
                                }
                            });
                        }
                    });
                } else {
                    angular.forEach($scope.eventsLists, function(list) {
                        if (Object.keys($scope.layoutViewJson.eventIds).length > 0) {
                            angular.forEach($scope.layoutViewJson.eventIds, function(listItems) {
                                if (listItems === list.event_id) {
                                    $scope.eventList.push(list);
                                }
                            });
                        } else {
                            if ($scope.layoutViewJson.eventIds === list.event_id) {
                                $scope.eventList.push(list);
                            }
                        }
                    });
                }
                setTimeout(function() {
                    snap.creativekit.initalizeShareButtons(
                        document.getElementsByClassName('snapchat-share-button')
                    );
                }, 1000);
                $scope.whatsAppUrl = `https://wa.me/?text=${$scope.dynamic_link}`;
                $scope.otherUrl = $scope.dynamic_link;
            }).finally(() => {
                $scope.loading = false;
            });
            if ($scope.layoutViewJson.embedOption === 'buttonView') {
                $scope.buttonViewFlag = true;
            } else if ($scope.layoutViewJson.embedOption === 'detailView') {
                $scope.detailViewFlag = true;
            } else if ($scope.layoutViewJson.embedOption === 'listView') {
                $scope.listViewFlag = true;
            }
            angular.element("#mailtoui-modal-close").on('click', function() {
                angular.element("#mailtoui-button-1").attr("href", "");
                angular.element("#mailtoui-button-2").attr("href", "");
                angular.element("#mailtoui-button-3").attr("href", "");
                angular.element("#mailtoui-button-4").attr("href", "");
                angular.element("#mailtoui-email-address").empty();
                angular.element("#mailtoui-modal").hide();
            });

            metaTagsService.setDefaultTags({
                'Title': 'The Promo App | Social Event Management Network',
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
        };

        $scope.init();
    }]);