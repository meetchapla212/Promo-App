angular.module('PromoApp')
    .controller('viewAnalyticsAttendeeRegularUserController', ['Socialshare', '$route', '$scope', 'config', 'eventsService', 'authService', 'apiService', 'deviceDetector', 'metaTagsService', function(Socialshare, $route, $scope, config, eventsService, authService, apiService, deviceDetector, metaTagsService) {
        $scope.userDetails = authService.getUser();
        $scope.loading = true;
        $scope.loaderMessage = "Loading...";
        $scope.browserName = "unknown";
        $scope.ip = "127.0.0.1";
        $scope.showMe = false;
        $scope.rewardId = null;
        $scope.rewardUrl = "";
        $scope.urlEventName = "";
        $scope.analytics = [];
        $scope.rewardDetail = [];
        $scope.showCalendar = function() {
            $scope.showEDetials = !$scope.showEDetials;
        };

        $scope.page_type = '';
        $scope.event = {};
        $scope.categoriesMap = [];
        $scope.socialInfo = [];
        $scope.labels = ["Clicks", "Total Clicks"];
        $scope.data = [8, 15];
        $scope.clicks = 0;

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

        $scope.changeTab = function(page, clicks) {
            $scope.page_type = page;
            $scope.clicks = clicks;
        };
        $scope.getCatName = function(nameKey, myArray) {
            for (var i = 0; i < myArray.length; i++) {
                if (myArray[i].id === nameKey) {
                    return myArray[i];
                }
            }
        };

        let categorySelected = [];

        for (let k in $scope.categoriesMap) {
            if ($scope.categoriesMap[k].selected) {
                categorySelected.push($scope.categoriesMap[k].id);
            }
        }

        if (categorySelected.length != Object.keys($scope.categoriesMap).length) {
            filter.search_params.category = categorySelected;
        }

        $scope.init = () => {
            $.get("https://api.ipify.org/?format=json").then(function(response) {
                $scope.ip = response.ip;
            });
            $scope.browserName = deviceDetector.browser;

            $scope.userMyEmail = 0;
            $scope.rewardId = $route.current.params.rewardId;
            $scope.totalClick = 0;
            eventsService.getRewardById($scope.rewardId)
                .then((result) => {
                    $scope.rewardDetail = result;
                    $scope.no_of_click = result.no_of_click;

                    $scope.event = $scope.rewardDetail.event_details;
                    let base_url = window.location.origin;
                    let eventId = $scope.rewardDetail.event_details.event_id;
                    let event_name = $scope.rewardDetail.event_details.event_name.replace(/\s+/g, '-').toLowerCase();
                    $scope.urlEventName = $scope.rewardDetail.event_details.event_name.replace(/\s+/g, '-').toLowerCase();
                    $scope.rewardUrl = base_url + "/eventdetails/" + event_name + '/' + $scope.rewardDetail.event_details.event_id + "?ref=" + $scope.userDetails.user_id;
                    $scope.event.event_url = $scope.rewardUrl + "&social=other";

                    setTimeout(function() {
                        snap.creativekit.initalizeShareButtons(
                            document.getElementsByClassName('snapchat-share-button')
                        );
                    }, 1000);

                    eventsService.getRewardUserAnalytics($scope.rewardId)
                        .then((response) => {

                            $scope.loading = false;
                            $scope.analytics = response;
                            $scope.socialInfo = response.social_info;

                            if ($scope.page_type == "") {
                                $scope.page_type = $scope.socialInfo[0].type;
                                $scope.clicks = $scope.socialInfo[0].clicks;
                            }
                            $scope.socialInfo.forEach((item) => {
                                $scope.totalClick += item.clicks;
                            });

                            if ($scope.totalClick >= result.no_of_click) {
                                $scope.no_of_click = 0;
                            }
                        });
                    apiService.getUserProfile($scope.rewardDetail._user_id).then((response) => {
                        if (response.data.success) {
                            $scope.organizer = response.data.data;
                        }
                    });

                    eventsService.getReferalLinkByEventId(eventId).then((response) => {
                        let WhatsAppLink = encodeURIComponent(response.data[1].whatsapp);
                        $scope.whatsAppUrl = `https://wa.me/?text=${WhatsAppLink}`;
                        $scope.snapchatUrl = response.data[0].snapchat;
                        $scope.facebookUrl = response.data[2].facebook;
                        $scope.emailUrl = response.data[3].email;
                        $scope.otherUrl = response.data[4].other;
                    });

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
                        'title': $scope.rewardDetail.event_details.event_name + ', ' + moment($scope.rewardDetail.event_details.start_date_time).format("ddd, MMM D, YYYY hh:00 A") + ' | The Promo App',
                        'description': scope.rewardDetail.event_details.description,
                        'keywords': 'The Promo App, event promotion',
                        // OpenGraph
                        'og:title': $scope.rewardDetail.event_details.event_name,
                        'og:description': strip_html_tags($scope.rewardDetail.event_details.description),
                        'og:image': fileExtension($scope.rewardDetail.event_details.event_image),
                        'og:url': $scope.facebookUrl,
                        // Twitter
                        'twitter:title': $scope.rewardDetail.event_details.event_name,
                        'twitter:description': strip_html_tags($scope.rewardDetail.event_details.description),
                        'twitter:image': fileExtension($scope.rewardDetail.event_details.event_image),
                        'twitter:card': fileExtension($scope.rewardDetail.event_details.event_image),
                    });
                });

            angular.element("#mailtoui-modal-close").on('click', function() {
                angular.element("#mailtoui-button-1").attr("href", "");
                angular.element("#mailtoui-button-2").attr("href", "");
                angular.element("#mailtoui-button-3").attr("href", "");
                angular.element("#mailtoui-button-4").attr("href", "");
                angular.element("#mailtoui-email-address").empty();
                angular.element("#mailtoui-modal").hide();
            });

        };
        $scope.init();

        $scope.getSocialShareURL = () => {
            var rewardUrl = $scope.snapchatUrl;
            return rewardUrl;
        };

        $scope.checkEmail = () => {
            if ($scope.userMyEmail) {
                $scope.userEmail = $scope.userDetails.email;
            } else {
                $scope.userEmail = "";
            }
        };

        $scope.addWinnerInfo = () => {
            let token = authService.get('token');
            var data = {
                "reward_id": $scope.rewardDetail.reward_id,
                "reward_type": $scope.rewardDetail.reward_type
            };
            if ($scope.rewardDetail.reward_type == "by_email") {
                data.email = $scope.userEmail;
            }
            if ($scope.rewardDetail.reward_type == "deliver") {
                data.address = $scope.userAddress;
                data.city = $scope.userCity;
                data.state = $scope.userState;
                data.zipcode = $scope.userZipcode;
                data.country = $scope.userCountry;
            }

            apiService.addWinnerInfo(data, token)
                .then((response) => {
                    if (response.status === 200) {
                        var data = response.data;
                        if (data.success) {
                            let notify = {
                                type: 'success',
                                title: 'Done!!',
                                content: data.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                        } else {
                            let notify = {
                                type: 'error',
                                title: 'Oops!!',
                                content: data.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                        }

                        window.setTimeout(window.location.reload(), 4000);

                    }
                });
        };

        $scope.emailShare = (social_type) => {
            let googleMail = 'https://mail.google.com/mail/?view=cm&fs=1&to=&su=' + $scope.rewardDetail.event_details.event_name + '&body=' + $scope.emailUrl;
            let ooutlookMail = 'https://outlook.office.com/owa/?path=/mail/action/compose&to=&subject' + $scope.rewardDetail.event_details.event_name + '&body=' + $scope.emailUrl;
            let yahooMail = 'https://compose.mail.yahoo.com/?to=&subject=' + $scope.rewardDetail.event_details.event_name + '&body=' + $scope.emailUrl;
            let email = 'mailto:?subject=' + $scope.rewardDetail.event_details.event_name + '&body=' + $scope.emailUrl;

            angular.element("#mailtoui-button-1").attr("href", googleMail);
            angular.element("#mailtoui-button-2").attr("href", ooutlookMail);
            angular.element("#mailtoui-button-3").attr("href", yahooMail);
            angular.element("#mailtoui-button-4").attr("href", email);
            angular.element("#mailtoui-email-address").append($scope.emailUrl);
            angular.element("#mailtoui-modal").show();
            angular.element(".mailtoui-brand").remove();

            let socialData = {
                social_type: social_type,
                reward_id: $scope.rewardId,
                device_type: 'web',
                browser_name: $scope.browserName,
                ip_address: $scope.ip
            };

            if ($scope.ip != "127.0.0.1") {
                eventsService.socialRewardShare(socialData)
                    .then((response) => {});
            }
        };

        $scope.socialShare = (social_type) => {
            if (social_type == "facebook") {
                Socialshare.share({
                    'provider': social_type,
                    'attrs': {
                        'appId': config.FACEBOOK_APP_ID,
                        'socialshareUrl': $scope.facebookUrl,
                        'socialshareDisplay': $scope.rewardDetail.event_details.event_name
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
                        'socialshareSubject': $scope.rewardDetail.event_details.event_name
                    }
                });
            }

            let socialData = {
                social_type: social_type,
                reward_id: $scope.rewardId,
                device_type: 'web',
                browser_name: $scope.browserName,
                ip_address: $scope.ip
            };

            if ($scope.ip != "127.0.0.1") {
                eventsService.socialRewardShare(socialData)
                    .then((response) => {});
            }
        };

    }]);