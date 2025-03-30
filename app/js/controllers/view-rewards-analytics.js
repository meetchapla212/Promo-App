angular.module('PromoApp')
    .controller('viewRewardsAnalyticsController', ['Socialshare', '$route', '$location', '$scope', 'config', 'eventsService', 'authService', 'apiService', 'deviceDetector', 'metaTagsService', '$window', function(Socialshare, $route, $location, $scope, config, eventsService, authService, apiService, deviceDetector, metaTagsService, $window) {
        $scope.morevertany = false;
        $scope.loading = true;
        $scope.loaderMessage = "Loading...";
        $scope.userDetails = authService.getUser();
        $scope.toggle = function() {
            $scope.morevertany = !$scope.morevertany;
        };
        $scope.rewardId = null;
        $scope.eligible_users = null;
        $scope.event_share_users = null;
        $scope.event_visited_users = null;
        $scope.most_share_on = null;
        $scope.people_eligible = null;
        $scope.reward_details = null;
        $scope.share_visit_country = null;
        $scope.share_visit_social = null;
        $scope.total_shares = null;
        $scope.total_visiters = null;
        $scope.winner_users = null;
        $scope.popupDetails = null;
        $scope.winnerInfo = null;
        $scope.eligibleUserId = null;
        $scope.eligible = 0;
        $scope.rewardUrl = "";
        $scope.browserName = "unknown";
        $scope.ip = "127.0.0.1";
        $scope.currentTab = 'visited';
        $scope.event_details = "";
        $scope.event = {};
        $scope.Previouspath = false;
        $scope.urlEventName = "";


        $scope.init = () => {

            $.get("https://api.ipify.org/?format=json").then(function(response) {
                $scope.ip = response.ip;
            });

            $scope.browserName = deviceDetector.browser;
            let currentPath = $window.localStorage.getItem('currentPath');
            if (currentPath === '/manageevent') {
                $scope.Previouspath = true;
            } else {
                $scope.Previouspath = false;
            }
            $scope.rewardId = $route.current.params.rewardId;
            eventsService.organiserAnalytics($scope.rewardId)
                .then((result) => {
                    $scope.loading = false;
                    if (result.success) {
                        result = result.data;
                        $scope.eligible_users = result.eligible_users;
                        $scope.event_share_users = result.event_share_users;
                        $scope.event_visited_users = result.event_visited_users;
                        $scope.most_share_on = result.most_share_on;
                        $scope.people_eligible = result.people_eligible;
                        $scope.reward_details = result.reward_details;
                        $scope.event_details = result.reward_details.event_details[0];
                        $scope.share_visit_country = result.share_visit_country;
                        $scope.share_visit_social = result.share_visit_social;
                        $scope.total_shares = result.total_shares;
                        $scope.total_visiters = result.total_visiters;
                        $scope.winner_users = result.winner_users;

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
                        $scope.event = $scope.event_details;
                        $scope.urlEventName = $scope.event_details.event_name.replace(/\s+/g, '-').toLowerCase();

                        eventsService.getReferalLinkByEventId($scope.event_details.event_id).then((response) => {
                            let WhatsAppLink = encodeURIComponent(response.data[1].whatsapp);
                            $scope.whatsAppUrl = `https://wa.me/?text=${WhatsAppLink}`;
                            $scope.snapchatUrl = response.data[0].snapchat;
                            $scope.facebookUrl = response.data[2].facebook;
                            $scope.emailUrl = response.data[3].email;
                            $scope.otherUrl = response.data[4].other;
                        });

                        setTimeout(function() {
                            snap.creativekit.initalizeShareButtons(
                                document.getElementsByClassName('snapchat-share-button')
                            );
                        }, 1000);

                        metaTagsService.setDefaultTags({
                            'title': $scope.reward_details.title + ' | Promo App',
                            'description': scope.reward_details.description,
                            'keywords': 'The Promo App, event promotion',
                            // OpenGraph
                            'og:title': $scope.event_details.event_name,
                            'og:description': strip_html_tags($scope.event_details.description),
                            'og:image': fileExtension($scope.event_details.event_image),
                            'og:url': $scope.facebookUrl,
                            // Twitter
                            'twitter:title': $scope.event_details.event_name,
                            'twitter:description': strip_html_tags($scope.event_details.description),
                            'twitter:image': fileExtension($scope.event_details.event_image),
                            'twitter:card': fileExtension($scope.event_details.event_image),
                        });
                    } else {
                        window.location.href = '/';
                    }
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

        $scope.popup = (data) => {
            $scope.popupDetails = data;
            $scope.winnerInfo = data.winner_info;
            var popup = angular.element("#cancelevent");
            if ($scope.popupDetails) {
                popup.modal('show');
            }
        };
        $scope.eligibleEvent = (data) => {
            $scope.eligibleDetails = data;
            $scope.eligibleUserId = $scope.eligibleDetails.user_id;
            $scope.eligible = $scope.eligible ? $scope.eligible : $scope.eligibleDetails.is_disqualify;
            $scope.eligibleInfo = data.eligible_users_details;
            var popup = angular.element("#eligibleEvent");
            if ($scope.eligibleDetails) {
                popup.modal('show');
            }
        };

        $scope.eligibleButton = (value) => {
            $scope.eligible = $scope.eligible === 1 ? 0 : 1;
            if (!value) {
                //Disqualify
                apiService.isDisqualifyUser($scope.eligibleUserId, 1, $scope.rewardId)
                    .then((response) => {
                        $scope.eligible = 1;
                    });
            } else {
                //Make Eligiable
                apiService.isDisqualifyUser($scope.eligibleUserId, 0, $scope.rewardId)
                    .then((response) => {
                        $scope.eligible = 0;
                    });
            }
        };

        $scope.isObjectEmpty = function(card) {
            if (card) {
                return Object.keys(card).length === 0;
            }
        };

        $scope.getSocialShareURL = (social_type) => {
            var rewardUrl = $scope.snapchatUrl;
            return rewardUrl;
        };

        $scope.tabEvent = (item) => {
            $scope.currentTab = item;
        };

        $scope.covertToCSV = (data, ReportTitle, ShowLabel) => {

            var arrData = typeof data != 'object' ? JSON.parse(data) : data;
            var CSV = '';
            CSV += ReportTitle + '\r\n\n';

            if (ShowLabel) {
                var row = "";
                for (var index in arrData[0]) {
                    row += index + ',';
                }
                row = row.slice(0, -1);
                CSV += row + '\r\n';
            }

            for (var i = 0; i < arrData.length; i++) {
                var rows = "";
                for (var item in arrData[i]) {
                    rows += '"' + arrData[i][item] + '",';
                }
                rows.slice(0, rows.length - 1);
                CSV += rows + '\r\n';
            }

            if (CSV == '') {
                alert("Invalid data");
                return;
            }

            var fileName = "";
            fileName += ReportTitle.replace(/ /g, "_");

            var uri = 'data:text/csv;charset=utf-8,' + escape(CSV);
            var link = document.createElement("a");
            link.href = uri;

            link.style = "visibility:hidden";
            link.download = fileName + ".csv";

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        $scope.emailShare = (social_type) => {
            let googleMail = 'https://mail.google.com/mail/?view=cm&fs=1&to=&su=' + $scope.event_details.event_name + '&body=' + $scope.emailUrl;
            let ooutlookMail = 'https://outlook.office.com/owa/?path=/mail/action/compose&to=&subject' + $scope.event_details.event_name + '&body=' + $scope.emailUrl;
            let yahooMail = 'https://compose.mail.yahoo.com/?to=&subject=' + $scope.event_details.event_name + '&body=' + $scope.emailUrl;
            let email = 'mailto:?subject=' + $scope.event_details.event_name + '&body=' + $scope.emailUrl;
            let urlCopy = $scope.emailUrl;
            angular.element("#mailtoui-button-1").attr("href", googleMail);
            angular.element("#mailtoui-button-2").attr("href", ooutlookMail);
            angular.element("#mailtoui-button-3").attr("href", yahooMail);
            angular.element("#mailtoui-button-4").attr("href", email);
            angular.element("#mailtoui-email-address").append(urlCopy);
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
                        'socialshareDisplay': $scope.event_details.event_name
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
                        'socialshareSubject': $scope.event_details.event_name
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