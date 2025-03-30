(function() {

    'use strict';

    angular.module('PromoApp', ['ngCacheBuster', 'ngRoute', 'ngAnimate', 'ngCookies', 'ngFileUpload', 'moment-picker', 'isteven-multi-select', 'ui.bootstrap', 'infinite-scroll', 'ngMap', 'ngclipboard', 'angularNotify', 'ui-notification', 'ngImgCrop', 'ngSanitize', 'angular-cache', 'ngStorage', 'ngMaterial', 'ngMaterialDateRangePicker', 'angular-inview', 'ngMessages', 'textAngular', 'daterangepicker', "reTree", "ng.deviceDetector", 'uaDeviceDetector', 'ui.carousel', '720kb.socialshare', 'chart.js', 'uiCropper', "oc.lazyLoad", 'ui.sortable', 'angularSpectrumColorpicker', 'colorpicker.module', 'ui.select', 'toggle-switch', 'ui.knob'])
        .config([
            '$routeProvider',
            '$locationProvider',
            'NotificationProvider',
            'CacheFactoryProvider',
            '$mdThemingProvider',
            '$compileProvider',
            '$provide',
            '$qProvider',
            'ChartJsProvider',
            'httpRequestInterceptorCacheBusterProvider',
            function($routeProvider, $locationProvider, NotificationProvider, CacheFactoryProvider, $mdThemingProvider, $compileProvider, $provide, $qProvider, ChartJsProvider, httpRequestInterceptorCacheBusterProvider) {
                httpRequestInterceptorCacheBusterProvider.setMatchlist([/.*partials.*/, /.*js.*/, /.*img.*/, /.*fonts.*/, /.*css.*/, /.*bower_components.*/, /.*test.*/, /.*promotest*./, /.*promoappuserdata*./], true);
                ChartJsProvider.setOptions({
                    chartColors: ['#f5a623', '#e4e4e4'],
                    responsive: false
                });
                // Configure all line charts
                ChartJsProvider.setOptions('line', {
                    showLines: false
                });
                angular.extend(CacheFactoryProvider.defaults, { maxAge: 60 * 60 * 1000 });
                angular.lowercase = angular.$$lowercase;
                $qProvider.errorOnUnhandledRejections(false);

                $provide.decorator('taOptions', ['taRegisterTool', '$delegate', '$uibModal',
                    function(taRegisterTool, taOptions, $uibModal) {
                        // $delegate is the taOptions we are decorating
                        // here we override the default toolbars specified in taOptions.
                        taOptions.toolbar = [
                            ['bold', 'italics'],
                            ['ol', 'ul']
                        ];
                        taOptions.classes = {
                            focussed: '',
                            toolbar: 'ta-toolbar',
                            toolbarGroup: 'ta-button-group',
                            toolbarButton: '',
                            toolbarButtonActive: 'active',
                            disabled: 'disabled',
                            textEditor: 'ta-text-editor',
                            htmlEditor: 'md-input'
                        };

                        // Create our own insertImage button
                        taRegisterTool('customInsertLink', {
                            iconclass: "material-icons",
                            action: function($deferred) {
                                var textAngular = this;
                                var savedSelection = rangy.saveSelection();
                                let modalInstance = $uibModal.open({
                                    ariaLabelledBy: 'modal-title',
                                    ariaDescribedBy: 'modal-body',
                                    templateUrl: '../../partials/addLinkModal.html',
                                    openedClass: 'pa-create-event-modal add-link-modal',
                                    size: 'md'
                                });

                                modalInstance.result.then(function(linkUrl) {
                                    console.log('linkUrl', linkUrl);
                                    rangy.restoreSelection(savedSelection);
                                    if (linkUrl) {
                                        textAngular.$editor().wrapSelection('insertHTML', "<a href='//" + linkUrl.link + "' target='_blank'>" + linkUrl.text + "</a>");
                                    }
                                    $deferred.resolve();
                                });
                                return false;
                            },
                        });

                        // Now add the button to the default toolbar definition
                        // Note: It'll be the last button
                        taOptions.toolbar[0].push('customInsertLink');
                        return taOptions;
                    }
                ]);

                $provide.decorator('taTools', ['$delegate', function(taTools) {
                    taTools.bold.display = '<md-button class="md-icon-button" aria-label="Bold"><md-icon md-font-set="material-icons">format_bold</md-icon></md-button>';
                    taTools.italics.display = '<md-button class="md-icon-button" aria-label="Italic"><md-icon md-font-set="material-icons">format_italic</md-icon></md-button>';
                    taTools.ul.display = '<md-button class="md-icon-button" aria-label="Italic"><md-icon md-font-set="material-icons">format_list_bulleted</md-icon></md-button>';
                    taTools.ol.display = '<md-button class="md-icon-button" aria-label="Italic"><md-icon md-font-set="material-icons">format_list_numbered</md-icon></md-button>';
                    taTools.customInsertLink.display = '<md-button class="md-icon-button" aria-label="Insert link"><md-icon md-font-set="material-icons">link</md-icon></md-button>';
                    return taTools;
                }]);

                NotificationProvider.setOptions({
                    delay: 10000,
                    startTop: 20,
                    startRight: 10,
                    verticalSpacing: 20,
                    horizontalSpacing: 20,
                    positionX: 'left',
                    positionY: 'bottom',
                    maxCount: 1,
                    replaceMessage: true
                });

                $mdThemingProvider.disableTheming();

                // routes
                $routeProvider
                    .when("/", {
                        templateUrl: "./partials/./phase2/pre-login-event.html",
                        reloadOnSearch: false
                    })
                    .when("/zoneList", {
                        templateUrl: "./partials/zone/mobileZoneMemberList.html",
                        controller: "ProfileController",
                        reloadOnSearch: false
                    })
                    .when("/changeadmin", {
                        templateUrl: "./partials/event_admin.html",
                        reloadOnSearch: false
                    })
                    .when("/createevent", {
                        templateUrl: "./partials/createEventSection.html",
                        controller: "CreateEventController",
                        reloadOnSearch: false
                    })
                    .when("/createreward/add", {
                        templateUrl: "./partials/createRewardSection.html",
                        controller: "CreateRewardController",
                        reloadOnSearch: false
                    })
                    .when("/createreward/add/:eventId", {
                        templateUrl: "./partials/createRewardSection.html",
                        controller: "CreateRewardController",
                        reloadOnSearch: false
                    })
                    .when("/createreward/edit/:rewardId", {
                        templateUrl: "./partials/createRewardSection.html",
                        controller: "CreateRewardController",
                        reloadOnSearch: false
                    })
                    .when("/events/:eventId/:action", {
                        templateUrl: "./partials/createEventSection.html",
                        controller: "CreateEventController",
                        reloadOnSearch: false
                    })
                    .when("/signup", {
                        templateUrl: "./partials/auth/signup-type.html",
                        controller: "LoginController",
                        reloadOnSearch: false
                    })
                    .when("/signup-verify", {
                        templateUrl: "./partials/auth/signup-verify.html",
                        controller: "LoginController",
                        reloadOnSearch: false
                    })
                    .when("/signup-confirm", {
                        templateUrl: "./partials/auth/signup.html",
                        controller: "LoginController",
                        reloadOnSearch: false
                    })
                    .when("/login", {
                        templateUrl: "./partials/auth/login.html",
                        controller: "LoginController",
                        reloadOnSearch: false
                    })
                    .when("/login/user/:token", {
                        templateUrl: "./partials/auth/login.html",
                        controller: "LoginController",
                        reloadOnSearch: false
                    })
                    .when("/otp-verify", {
                        templateUrl: "./partials/auth/otp_verify.html",
                        reloadOnSearch: false
                    })
                    .when("/verify-email", {
                        templateUrl: "./partials/auth/verify-email.html",
                        reloadOnSearch: false
                    })
                    .when("/profile-otp-verify", {
                        templateUrl: "./partials/auth/profile_otp_verify.html",
                        reloadOnSearch: false
                    })
                    .when("/forgotpassword", {
                        templateUrl: "./partials/auth/forgotpassword.html",
                        controller: "ResetPswdController",
                        reloadOnSearch: false
                    })
                    .when("/reset-password", {
                        templateUrl: "./partials/auth/resetpassword.html",
                        controller: "ResetPswdController",
                        reloadOnSearch: false
                    })
                    .when("/otp-reset-password", {
                        templateUrl: "./partials/auth/mobile-password-reset.html",
                        reloadOnSearch: false
                    })
                    .when("/changepassword", {
                        templateUrl: "./partials/auth/changepassword.html",
                        controller: "UserController",
                        reloadOnSearch: false
                    })
                    .when("/change-mobile-number", {
                        templateUrl: "./partials/auth/change-mobile-number.html",
                        controller: "UserController",
                        reloadOnSearch: false
                    })
                    .when("/change-email-address", {
                        templateUrl: "./partials/auth/change-email-address.html",
                        controller: "UserController",
                        reloadOnSearch: false
                    })
                    .when("/events", {
                        templateUrl: "./partials/./phase2/pre-login-event.html",
                        reloadOnSearch: false
                    })
                    .when("/settings", {
                        templateUrl: "./partials/settings.html",
                        controller: "UserController",
                        reloadOnSearch: false
                    })
                    .when("/notifications", {
                        templateUrl: "./partials/notifications.html",
                        controller: "NotificationController",
                        reloadOnSearch: false
                    })
                    .when("/checkout", {
                        templateUrl: "./partials/checkout.html",
                        reloadOnSearch: false
                    })
                    .when("/ticket_type", {
                        templateUrl: "./partials/ticketType.html",
                        reloadOnSearch: false
                    })
                    .when("/purchased_ticket", {
                        templateUrl: "./partials/ticketType.html",
                        reloadOnSearch: false
                    })
                    .when("/user_experience_rate", {
                        templateUrl: "./partials/userExperienceRate.html",
                        reloadOnSearch: false
                    })
                    .when("/recommend_events", {
                        templateUrl: "./partials/search.html",
                        reloadOnSearch: false
                    })
                    .when("/searchuser", {
                        templateUrl: "./partials/searchuser.html",
                        reloadOnSearch: false
                    })
                    .when("/userprofile/:userID", {
                        templateUrl: "./partials/users/anotherUserProfile.html",
                        controller: "ProfileController",
                        reloadOnSearch: false
                    })
                    .when("/events/interested", {
                        templateUrl: "./partials/mobile-events-interested.html",
                        controller: "ProfileController",
                        reloadOnSearch: false
                    })
                    .when("/feedback", {
                        templateUrl: "./partials/mobile-give-feedback.html",
                        controller: "ProfileController",
                        reloadOnSearch: false
                    })
                    .when("/getfeedback", {
                        templateUrl: "/partials/mobile-give-product-feedback.html",
                        controller: "ProfileController",
                        reloadOnSearch: false
                    })
                    .when("/events/shared", {
                        templateUrl: "./partials/mobile-events-shared.html",
                        controller: "ProfileController",
                        reloadOnSearch: false
                    })
                    .when("/eventorganiser/:eventId/:userId", {
                        templateUrl: "./partials/eventorganiserprofile.html",
                        controller: "EventOrganiserProfileController",
                        reloadOnSearch: false
                    })
                    .when("/userprofile/:userID/follower", {
                        templateUrl: "./partials/userfollower.html",
                        controller: "UserFollowController",
                        reloadOnSearch: false
                    })
                    .when("/terms_of_use", {
                        templateUrl: "./partials/termsfeed-terms-service-html-english.html",
                        controller: "termsPolicyController",
                        reloadOnSearch: false
                    })
                    .when("/cookies_policy", {
                        templateUrl: "./partials/termsfeed-cookies-policy-html-english.html",
                        controller: "termsPolicyController",
                        reloadOnSearch: false
                    })
                    .when("/site_map", {
                        templateUrl: "./partials/sitemap.html",
                        reloadOnSearch: false
                    })
                    .when("/view_rewards_analytics/:rewardId", {
                        templateUrl: "./partials/ViewRewardsanalytics.html",
                        reloadOnSearch: false
                    })
                    .when("/view_analytics_attendee/:rewardId", {
                        templateUrl: "./partials/view-analytics-attendee-regular-user.html",
                        controller: "viewAnalyticsAttendeeRegularUserController",
                        reloadOnSearch: false
                    })
                    .when("/manage_rewards_live", {
                        templateUrl: "./partials/manageRewardsLive.html",
                        controller: "ManageRewardsLiveController",
                        reloadOnSearch: false
                    })
                    .when("/event_organiser", {
                        templateUrl: "./partials/event-organiser.html",
                        controller: "EventOrganiserController",
                        reloadOnSearch: false
                    })
                    .when("/about_us", {
                        templateUrl: "./partials/about-us.html",
                        controller: "AboutUsController",
                        reloadOnSearch: false
                    })
                    .when("/myprofile", {
                        templateUrl: "./partials/myprofile.html",
                        controller: "ProfileController",
                        reloadOnSearch: false
                    })
                    .when("/chat", {
                        templateUrl: "./chat.html",
                        reloadOnSearch: false
                    })
                    .when("/manageevent", {
                        templateUrl: "./partials/manageEvent.html",
                        reloadOnSearch: false
                    })
                    .when("/welcome", {
                        templateUrl: "./partials/./phase2/pre-login-event.html",
                        reloadOnSearch: false
                    })
                    .when("/scanqrcode", {
                        templateUrl: "./partials/scanqrcode.html",
                        controller: 'ScanQrController',
                        reloadOnSearch: false
                    })
                    .when("/embedevents/:user_id", {
                        templateUrl: "./partials/embedevents.html",
                        reloadOnSearch: false
                    })
                    .when("/embedevents", {
                        templateUrl: "./partials/embedeventsComponent.html",
                        reloadOnSearch: false
                    })
                    .when("/eventdetails/:evntName/:evntID", {
                        templateUrl: "./partials/eventDetails.html",
                        controller: "eventdetailController",
                        reloadOnSearch: false
                    })
                    .when("/image_upload", {
                        templateUrl: "./partials/image_upload.html",
                        reloadOnSearch: false
                    })
                    .when("/adminreject", {
                        templateUrl: "./partials/adminreject.html",
                        reloadOnSearch: false
                    })
                    .when("/invite_guest", {
                        templateUrl: "./partials/invite_guest.html",
                        reloadOnSearch: false
                    })
                    .when("/add-guest-page", {
                        templateUrl: "./partials/add-guest-page.html",
                        reloadOnSearch: false
                    })
                    .when("/tickets", {
                        templateUrl: "./partials/mytickets.html",
                        controller: "MyTicketsController",
                        reloadOnSearch: false
                    })
                    .when("/my_payout", {
                        templateUrl: "./partials/mypayout.html",
                        reloadOnSearch: false
                    })
                    .when("/payout_methods", {
                        templateUrl: "./partials/payoutMethods.html",
                        reloadOnSearch: false
                    })
                    .when("/payoutmethodsnodata", {
                        templateUrl: "./partials/Payout-Methods-No-Data.html",
                        controller: "PayoutController",
                        reloadOnSearch: false
                    })
                    .when("/pricing", {
                        templateUrl: "./partials/pricing.html",
                        reloadOnSearch: false
                    })
                    .when("/venueMap/:eventId/:action", {
                        templateUrl: "./partials/seatPlan/seat-plan.html",
                        reloadOnSearch: false
                    })
                    .when("/widget/eventdetails/:evntID", {
                        templateUrl: "./partials/widget/eventDetails.html",
                        reloadOnSearch: false
                    })
                    .when("/widget/ticket_list", {
                        templateUrl: "./partials/widget/ticket_list.html",
                        reloadOnSearch: false
                    })
                    .when("/widget/signup", {
                        templateUrl: "./partials/widget/signup.html",
                        reloadOnSearch: false
                    })
                    .when("/widget/checkout", {
                        templateUrl: "./partials/widget/checkout.html",
                        reloadOnSearch: false
                    })
                    .when("/widget/payment_success", {
                        templateUrl: "./partials/widget/payment_success.html",
                        reloadOnSearch: false
                    })
                    .when("/embedWidget", {
                        templateUrl: "./partials/embedWidget.html",
                        controller: "embedWidgetController",
                        reloadOnSearch: false
                    })
                    .when("/event/administrator/invitation-process", {
                        templateUrl: "./partials/invitation_process.html",
                        controller: "invitationProcessController",
                        reloadOnSearch: false
                    })
                    .when("/admin_request_reject", {
                        templateUrl: "./partials/admin_request_reject.html",
                        reloadOnSearch: false
                    })
                    .when("/zoneDashboard/:zoneId", {
                        templateUrl: "./partials/zone/dashboard.html",
                        controller: "DashboardController",
                        reloadOnSearch: false
                    })
                    .when("/myzone", {
                        templateUrl: "./partials/zone/myzone.html",
                        controller: "DashboardController",
                        reloadOnSearch: false
                    })
                    .when("/zoneProfile/:zoneId", {
                        templateUrl: "./partials/zone/zoneProfile.html",
                        controller: "ZoneProfileController",
                        reloadOnSearch: false
                    })
                    .when("/signup/:zoneName/:zoneId", {
                        templateUrl: "./partials/zone/signup.html",
                        controller: "DashboardController",
                        reloadOnSearch: false
                    })
                    .when("/zone-owner/invitation/process", {
                        templateUrl: "./partials/invitation_process.html",
                        controller: "zoneOwnerInvitationController",
                        reloadOnSearch: false
                    })
                    .when("/zone-member/invitation/process", {
                        templateUrl: "./partials/invitation_process.html",
                        controller: "zoneMemberInvitationController",
                        reloadOnSearch: false
                    })
                    .when("/zone-organizer/invitation/process", {
                        templateUrl: "./partials/invitation_process.html",
                        controller: "zoneOrganiserInvitationController",
                        reloadOnSearch: false
                    })
                    .when("/analytics_dashboard", {
                        templateUrl: "./partials/eventAnalytics/analytics-dashboard.html",
                        controller: 'analyticsDashbaordController',
                        reloadOnSearch: false
                    })
                    .when("/analytics_report", {
                        templateUrl: "./partials/eventAnalytics/report-analytics.html",
                        controller: 'analyticsReportController',
                        reloadOnSearch: false
                    })
                    .when("/eventOverview", {
                        templateUrl: "./partials/manageEvent/event-overview.html",
                        controller: 'manageEventOverviewController',
                        reloadOnSearch: false
                    })
                    .when("/eventOrder", {
                        templateUrl: "./partials/manageEvent/event-orders.html",
                        controller: 'ManageEventListController',
                        reloadOnSearch: false
                    })
                    .when("/eventCheckins", {
                        templateUrl: "./partials/manageEvent/manage-checkIns.html",
                        controller: 'ManageEventListController',
                        reloadOnSearch: false
                    })
                    .when("/eventPayout", {
                        templateUrl: "./partials/manageEvent/manage-payout.html",
                        controller: 'ManageEventListController',
                        reloadOnSearch: false
                    })
                    .when("/eventReport", {
                        templateUrl: "./partials/manageEvent/report-analytics.html",
                        controller: 'analyticsReportController',
                        reloadOnSearch: false
                    })
                    .when("/basicDetails", {
                        templateUrl: "./partials/manageEvent/basic-details.html",
                        controller: "CreateEventController",
                        reloadOnSearch: false
                    })
                    .when("/eventDetails", {
                        templateUrl: "./partials/manageEvent/event-details.html",
                        controller: "CreateEventController",
                        reloadOnSearch: false
                    })
                    .when("/adminssionsEvent", {
                        templateUrl: "./partials/manageEvent/event-ticket-admision.html",
                        controller: "CreateEventController",
                        reloadOnSearch: false
                    })
                    .when("/publishEvent", {
                        templateUrl: "./partials/manageEvent/publish-event.html",
                        controller: "CreateEventController",
                        reloadOnSearch: false
                    })
                    .when("/inviteGuestEvent", {
                        templateUrl: "./partials/manageEvent/event-invite-guest.html",
                        controller: "CreateEventController",
                        reloadOnSearch: false
                    })
                    .when("/administratorEvent", {
                        templateUrl: "./partials/manageEvent/event-administrator.html",
                        controller: "CreateEventController",
                        reloadOnSearch: false
                    })
                    .when("/eventPrivacy", {
                        templateUrl: "./partials/manageEvent/event-privacy.html",
                        controller: "CreateEventController",
                        reloadOnSearch: false
                    })
                    .when("/highlightEvent", {
                        templateUrl: "./partials/manageEvent/event-highlight.html",
                        controller: "CreateEventController",
                        reloadOnSearch: false
                    })
                    .when("/promotionEvent", {
                        templateUrl: "./partials/manageEvent/event-promotion.html",
                        controller: "eventdetailController",
                        reloadOnSearch: false
                    })
                    .when("/widgetEvent", {
                        templateUrl: "./partials/manageEvent/event-embed-widget.html",
                        controller: "embedWidgetController",
                        reloadOnSearch: false
                    })
                    .when("/category", {
                        templateUrl: "./partials/category/search-category-event.html",
                        controller: "SearchCategoryEventController",
                        reloadOnSearch: false
                    })
                    .when("/category/:categoryName", {
                        templateUrl: "./partials/category/category-based-event.html",
                        controller: "SearchCategoryEventController",
                        reloadOnSearch: false
                    })
                    .when("/menu", {
                        templateUrl: "./partials/mobileMenu.html",
                        controller: "ProfileController",
                        reloadOnSearch: false
                    })
                    .when("/contact_us", {
                        templateUrl: "./partials/contact-us.html",
                        reloadOnSearch: false
                    })
                    .when("/blog", {
                        templateUrl: "./partials/blog/blog.html",
                        controller: "blogController",
                        reloadOnSearch: false
                    })
                    .when("/blog/:categoryName", {
                        templateUrl: "./partials/blog/blogCategoryList.html",
                        controller: "blogController",
                        reloadOnSearch: false
                    })
                    .when("/blog/tag/:tagName/:tagId", {
                        templateUrl: "./partials/blog/blogTagList.html",
                        controller: "blogController",
                        reloadOnSearch: false
                    })
                    .when("/blog/:bId/:blogName", {
                        templateUrl: "./partials/blog/blogDetail.html",
                        controller: "blogController",
                        reloadOnSearch: false
                    })
                    .otherwise({
                        redirectTo: '/'
                    });
                $locationProvider.html5Mode(true).hashPrefix('');
                $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|mailto|tel|whatsapp):/);
            }
        ]);

}());

angular.module('PromoApp').run(['$http', '$rootScope', '$location', '$interval', '$window', 'Notification', 'authService', 'Carousel', '$ocLazyLoad', '$route',
    function($http, $rootScope, $location, $interval, $window, Notification, authService, Carousel, $ocLazyLoad, $route) {
        $rootScope.$on('$locationChangeStart', function(event, newUrl, oldUrl, $location) {
            Notification.clearAll();
            let urlHashes = oldUrl.split('#');
            $rootScope.previousPage = '#' + urlHashes[1];

            if (urlHashes.length > 2) {
                urlHashes.splice(0, 2);
                $rootScope.previousPage += '#' + (urlHashes.join('#'));
            }

            // If we have queryString on currentURL , then we will add it to the next url
            if (oldUrl.indexOf('?') >= 0) {

                // this can be optimized if we want to check first for queryString in the new url,
                // then append only new params, but that's additional feature.
                newUrl += '?' + oldUrl.split('?')[1];
            }

            Carousel.setOptions({
                arrows: true,
                autoplay: false,
                autoplaySpeed: 3000,
                cssEase: 'ease',
                dots: false,

                easing: 'linear',
                fade: false,
                infinite: true,
                initialSlide: 0,

                slidesToShow: 1,
                slidesToScroll: 1,
                speed: 500,
            });
        });

        $rootScope.$on("$routeChangeStart", function(event, next, current) {
            let allowedNonLoggedInPages = ['/', '/blog', '/blog/:categoryName', '/blog/:bId/:blogName', '/blog/tag/:tagName/:tagId', '/admin_request_reject', '/event/administrator/invitation-process', '/zone-owner/invitation/process', '/zone-member/invitation/process', '/widget/payment_success', '/widget/eventdetails/:evntID', '/widget/ticket_list', '/widget/signup', '/widget/checkout', '/embedevents/:user_id', '/embedevents', '/login', '/login/user/:token', '/welcome', '/signup', '/signup-verify', '/signup-confirm', '/otp-verify', '/verify-email', '/reset-password', '/otp-reset-password', '/forgotpassword', '/terms_of_use', '/cookies_policy', '/about_us', '/site_map', '/adminreject', '/eventdetails/:evntName/:evntID', '/searchuser', '/event_organiser', '/purchased_ticket', '/pricing', '/signup/:zoneName/:zoneId', '/category', '/category/:categoryName', '/contact_us'];
            $rootScope.footerHide = false;
            $rootScope.footerDeskHide = false;
            //ask the service to check if the user is in fact logged in
            if (!authService.getUser() || !authService.getSession()) {
                // no logged user, we should be going to the login route
                if (next.originalPath && !allowedNonLoggedInPages.includes(next.originalPath)) {
                    // not going to the login route, we should redirect now
                    // Before redirect check if there are any path params
                    let redirect = next.originalPath;
                    if ('pathParams' in next && next.pathParams) {
                        for (let param of Object.keys(next.pathParams)) {
                            if (redirect.includes(":" + param)) {
                                redirect = redirect.replace(':' + param, next.pathParams[param]);
                            }
                        }
                    }
                    if ('params' in next && next.params) {
                        let queryParams = [];
                        for (let param of Object.keys(next.params)) {
                            queryParams.push(`${param}=${next.params[param]}`);
                            $location.search(param, null);
                        }
                        redirect = redirect + '?' + queryParams.join('&');
                    }
                    $location.path("/login").search('redirect', redirect);
                }
            }

            if (authService.getSession()) {
                $ocLazyLoad.load({
                    insertBefore: '#load_js_before',
                    files: ["bower_components/aws-sdk/dist/aws-sdk.min.js",
                        "bower_components/quickblox/quickblox.min.js"
                    ],
                    cache: true
                });
            }

            $http.pendingRequests.forEach(function(request) {
                if (request.cancel) {
                    request.cancel.resolve();
                }
                $http.pendingRequests.forEach(function(request) {
                    if (request.cancel) {
                        request.cancel.resolve();
                    }
                });
            });
            let route = $route;
            setTimeout(function() {
                route = route.current.$$route.originalPath;
                if (route == '/ticket_type' || route == '/login' ||
                    route == '/forgotpassword' || route == '/forgotpassword' ||
                    route == '/signup' || route == '/widget/signup' ||
                    route == '/signup-verify' || route == '/signup-confirm' ||
                    route == '/otp-verify' || route == '/verify-email' ||
                    route == '/reset-password' || route == '/otp-reset-password' ||
                    route == '/settings' || route == '/change-mobile-number' ||
                    route == '/userprofile/:userID/follower' || route == '/menu' ||
                    route == '/events/:eventId/:action' || route == '/notifications' ||
                    route == '/terms_of_use' || route == '/cookies_policy' ||
                    route == '/userprofile/:userID' || route == '/eventorganiser/:eventId/:userId' ||
                    route == '/change-email-address' || route == '/checkout') {
                    $rootScope.footerHide = true;
                } else if (route == '/createevent' || route == '/createreward/add' ||
                    route == '/createreward/add/:eventId' || route == '/createreward/edit/:rewardId') {
                    $rootScope.footerDeskHide = true;
                }
            }, 500);

            $interval(function() {
                $window.localStorage.removeItem("events");
                // delete all the required localStorage variables by specifying their keys
            }, 1000 * 60 * 60);
        });
    }
]);

angular.module('PromoApp').factory('dataTransfer', function() {
    var data = {};
    return {
        getUserDetails: function() {
            return data;
        },
        setUserDetails: function(info) {
            data = info;
        }
    };
});