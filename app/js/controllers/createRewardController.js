angular.module('PromoApp')
    .controller('CreateRewardController', ['$scope', 'Socialshare', 'eventsService', 'metaTagsService', '$timeout', '$route', 'config', '$window', '$uibModal', 'authService', 'apiService', 'Utils', 'awsService', '$mdDialog', 'locationService', '$anchorScroll', '$location', '$cookies', '$ocLazyLoad',
        function ($scope, Socialshare, eventsService, metaTagsService, $timeout, $route, config, $window, $uibModal, authService, apiService, Utils, awsService, $mdDialog, locationService, $anchorScroll, $location, $cookies, $ocLazyLoad) {

            //variables
            $scope.userEventDD = [];
            $scope.event = {};
            $scope.eventRDetails = {};
            let now = moment.utc();
            let now_in_msec = (now).format("YYYY-MM-DD");
            $scope.base_url = $window.location.origin;
            let user = localStorage.getItem('user');
            $scope.edit_image_url = '';
            $scope.rewardDetailsres = "";
            $scope.showMore = false;
            $scope.displayTooltip = false;
            $scope.promotion_end_date = [];
            $scope.selected = [];
            $scope.stepOneStart = true;
            $scope.yellowBanner = false;
            $scope.stepOneEnd = false;
            $scope.stepTwoStart = false;
            $scope.stepTwoEnd = false;
            $scope.IsVisible = false;
            $scope.ImageUploadDone = true;
            $scope.urlEventName = "";
            $scope.promotionGuidance2 = false;

            $scope.dropdowns = {
                startDateRangePicker: {
                    minDate: moment().utc(),
                    mobilePicker: null,
                    toggle() {
                        // need to use $timeout here to avoid $apply errors for digest cycle
                        $timeout(() => {
                            $scope.dropdowns.startDateRangePicker.mobilePicker.toggle();
                        });
                    },
                    selectedDate: {
                        startDate: moment.utc().add(2, 'days'),
                        endDate: moment.utc().add(2, 'days')
                    },
                    options: {
                        pickerClasses: 'custom-display', //angular-daterangepicker extra
                        applyButtonClasses: 'md-button pa-pink-button pa-font-bold pa-modal-font pa-height-34',
                        cancelButtonClasses: 'pa-color-pink pa-modal-font',
                        clearable: true,
                        singleDatePicker: true,
                        showCustomRangeLabel: false,
                        timePicker: false,
                        locale: {
                            applyLabel: "Done",
                            clearLabel: 'Reset',
                            cancelLabel: 'Reset',
                            separator: ' - ',
                            format: "MMM DD, YYYY"
                        },
                        'show.daterangepicker': function (event, picker) {
                            $scope.showHide.mobile.selectdates = true;
                        },
                        'hide.daterangepicker': function (event, picker) {
                            $scope.showHide.mobile.selectdates = false;
                        },
                        eventHandlers: {
                            'apply.daterangepicker': function (event, picker) {
                                $scope.validateTime($scope.addReward.start.date, $scope.addReward.start.time, $scope.addReward.end.date, $scope.addReward.end.time, 'create_reward_form_1', 'startDate');
                            }
                        }
                    },
                    mobileOptions: {
                        pickerClasses: 'pa-datepicker', //angular-daterangepicker extra
                        applyButtonClasses: 'md-button pa-pink-button pa-font-bold pa-modal-font pa-height-34',
                        cancelButtonClasses: 'pa-color-pink pa-modal-font',
                        clearable: true,
                        showCustomRangeLabel: false,
                        timePicker: false,
                        locale: {
                            applyLabel: "Done",
                            clearLabel: 'Reset',
                            cancelLabel: 'Reset',
                            separator: ' - ',
                            format: "MMM DD, YYYY"
                        },
                        'hide.daterangepicker': function (event, picker) {
                            $scope.navigate('createnewevent');
                        },
                        eventHandlers: {
                            'cancel.daterangepicker': function (event, picker) {
                                $scope.navigate('createnewevent');
                            },
                            'apply.daterangepicker': function (event, picker) {
                                $scope.addReward.start.date = $scope.dropdowns.startDateRangePicker.selectedDate.startDate;
                                $scope.addReward.end.date = $scope.dropdowns.startDateRangePicker.selectedDate.endDate;
                                $scope.addReward.startDateInString = $scope.addReward.start.date.format('ddd, MMM DD, YYYY');
                                $scope.navigate('createnewevent');
                                $scope.validateTime($scope.addReward.start.date, $scope.addReward.start.time, $scope.addReward.end.date, $scope.addReward.end.time, 'create_reward_form_1', 'startDate');

                            }
                        }
                    }
                },
                endDateRangePicker: {
                    minDate: moment().add(1, 'day'),
                    options: {
                        pickerClasses: 'custom-display', //angular-daterangepicker extra
                        buttonClasses: 'btn',
                        applyButtonClasses: 'btn-primary',
                        cancelButtonClasses: 'btn-danger',
                        singleDatePicker: true,
                        showCustomRangeLabel: false,
                        timePicker: false,
                        locale: {
                            applyLabel: "Apply",
                            cancelLabel: 'Cancel',
                            separator: ' - ',
                            format: "MMM DD, YYYY"
                        },
                        eventHandlers: {
                            'apply.daterangepicker': function (event, picker) {
                                $scope.eventDateTimeChange();
                            }
                        }
                    }
                },
                eventsLang: {
                    selectAll: "Tick all",
                    selectNone: "Select none",
                    reset: "Undo all",
                    search: "Type here to search...",
                    nothingSelected: "Select Event" //default-label is deprecated and replaced with this.
                },

                timezones: {
                    options: []
                },
                times: {
                    options: config.GLOBAL_TIMES
                }
            };

            $scope.addReward = {
                "reward_id": 0,
                "event_id": 0,
                "title": "",
                "description": "",
                "reward_item": "",
                "image": "",
                "start_date": now_in_msec,
                "end_date": (now.add(7, 'days')).format("YYYY-MM-DD"),
                "winner_type": "random",
                "no_of_people": 0,
                "no_of_click": 0,
                "reward_type": "by_email",
                "terms_condition": "",
                "time_zone": "",
                "is_draft": 1,
                "reward_term": false,
                "reward_time": "auto",
                "start": {
                    date: moment.utc(), // As per the document we want to take start date as current date
                    time: $scope.dropdowns.times.options[40].key
                },
                "end": {
                    date: moment.utc(), // As per the document we want to take end date as current date
                    time: $scope.dropdowns.times.options[88].key
                }
            };

            $scope.action = 'Create';
            if ($scope.action !== 'Create') {
                $scope.saveButtonText = 'Update Promotion';
            } else {
                $scope.saveButtonText = 'Continue';
            }
            $scope.saveAndExitBtn = 'Save & Exit';
            $scope.createRewardForms = {};
            $scope.currentInfoSection = ['create_reward_form_1'];
            $scope.hideShowPublicBtn = true;
            $scope.number = 30;
            $scope.getNumber = function (num) {
                return new Array(num);
            };
            $scope.categoriesMap = [];
            $scope.progress = 0;
            let userSession = authService.getSession();
            $scope.userDetails = authService.getUser();
            let token = authService.get('token');
            $scope.loading = false;
            $scope.loadingMessage = 'Loading...';
            $scope.showHide = {
                imageSelected: false,
                template: 'partials/reward-info.html',
                savingDraft: false,
                mobile: {
                    addlocation: false,
                    createnewevent: true,
                    addaddress: false,
                    inviteguests: false,
                    selectdates: false,
                    invitebyemail: false,
                    invitebyfollowers: false,
                    eventsuccess: false
                }
            };

            $scope.minDate = moment.utc();
            const totalForms = 3;
            // TODO remove create_reward_detail_1
            $scope.cancelBtn = true;
            $scope.createRewardsSuccess = false;
            $scope.validationErrors = false;
            let userData = JSON.parse(localStorage.getItem('user'));
            $scope.userId = userData.user_id;

            $scope.goToStep = function (step) {
                // Go to step only if step is complete
                if ($scope.isStepComplete(step)) {
                    // Check the length of the current steps to calculate number of times back needs to be called
                    let remaningFormsLength = 1;
                    switch (step) {
                        case 1:
                            $scope.showHide.template = 'partials/reward-info.html';
                            remaningFormsLength = 2;
                            break;
                        case 2:
                            $scope.showHide.template = 'partials/reward-event-details.html';
                            remaningFormsLength = 3;
                            break;
                        case 3:
                            $scope.showHide.template = 'partials/reward-guest-page.html';
                            remaningFormsLength = 4;
                            break;
                        case 4:
                            $scope.showHide.template = "partials/reward-success.html";
                            break;
                    }

                    while ($scope.currentInfoSection.length > remaningFormsLength) {
                        $scope.back();
                    }
                }
            };

            // This function is called to check if a step is complete
            $scope.isStepComplete = function (step) {
                let forms = ['create_reward_form_1'];
                switch (step) {
                    case 1:
                        break;
                    case 2:
                        forms.push('create_reward_detail_1');
                        break;
                    case 3:
                        forms.push('create_reward_guest_1');
                        break;
                }
                if ($scope.currentInfoSection && forms.every(val => $scope.currentInfoSection.includes(val))) {
                    return true;
                }
                return false;
            };

            // This function is called on selection of time
            $scope.validateTime = function (eventStartDate, eventStartTime, eventEndDate, eventEndTime, formName, formField) {
                let startTime = moment(eventStartTime, 'hh:mma');
                let endTime = moment(eventEndTime, 'h:mma');
                eventStartDate.set({
                    hour: startTime.hour(),
                    minute: startTime.minutes(),
                    second: startTime.seconds(),
                    millisecond: startTime.milliseconds()
                });
                eventEndDate.set({
                    hour: endTime.hour(),
                    minute: endTime.minutes(),
                    second: endTime.seconds(),
                    millisecond: endTime.milliseconds()
                });
                if (eventStartDate.isAfter(eventEndDate)) {
                    $scope.createRewardForms[formName][formField].$setValidity('minDate', false);
                } else {
                    $scope.createRewardForms[formName][formField].$setValidity('minDate', true);
                }
            };

            // This function is used show progress
            $scope.updateProgress = function () {
                $scope.progress = Math.ceil((($scope.currentInfoSection.length - 1) / totalForms) * 100);
            };

            $scope.hideShowPublic = function () {
                $scope.hideShowPublicBtn = !$scope.hideShowPublicBtn;
            };

            $scope.isString = function (value) {
                return typeof value === 'string' || value instanceof String;
            };

            // This function is called on continue button
            $scope.continue = function () {
                if ($scope.action == "edit") {
                    $scope.saveButtonText = 'Update Promotion';
                } else {
                    $scope.saveButtonText = 'Continue';
                }
                switch ($scope.currentInfoSection.length) {
                    case 1:
                        if (!$scope.addReward.is_draft) {
                            $scope.saveRewards(0, false);
                        } else {
                            $scope.saveRewards(1, false);
                        }
                        $scope.showHide.template = 'partials/reward-event-details.html';
                        $scope.currentInfoSection.push('create_reward_detail_1');
                        $scope.cancelBtn = true;
                        $scope.stepOneStart = false;
                        $scope.stepOneEnd = true;
                        $scope.stepTwoStart = true;
                        $scope.promotionStep2();
                        break;
                    case 2:
                        let date_str = moment().format('YYYY-MM-DD');
                        if ($scope.isString($scope.addReward.end.date)) {
                            let d = Date.parse($scope.addReward.end.date);
                            date_str = moment.unix(d / 1000).format("YYYY-MM-DD");
                        } else {
                            date_str = moment($scope.addReward.end.date, 'YYYY-MM-DD h:mm a').format('YYYY-MM-DD');
                        }
                        let time_str = moment($scope.addReward.end.time, 'h:mm a').format('h:mm a');
                        let end_date_str = date_str + ' ' + time_str;
                        $scope.promotion_end_date = moment(end_date_str, 'YYYY-MM-DD h:mm a').format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
                        if (!$scope.addReward.is_draft) {
                            $scope.saveRewards(0, false);
                        } else {
                            $scope.saveRewards(1, false);
                        }
                        $scope.showHide.template = 'partials/reward-guest-page.html';
                        $scope.currentInfoSection.push('create_reward_guest_1');
                        $scope.saveButtonText = 'Publish Reward & Generate Link';
                        $scope.saveAndExitBtn = 'Save for Later';
                        $scope.cancelBtn = false;
                        $scope.hideShowPublicBtn = false;
                        $scope.stepTwoStart = false;
                        $scope.stepTwoEnd = true;
                        $scope.promotionStep3();
                        break;
                    case 3:
                        if (!$scope.addReward.is_draft) {
                            $scope.saveRewards(0, true);
                        } else {
                            $scope.saveRewards(0, false);
                        }
                        $scope.showHide.template = 'partials/reward-success.html';
                        setTimeout(function () {
                            snap.creativekit.initalizeShareButtons(
                                document.getElementsByClassName('snapchat-share-button')
                            );
                        }, 4000);
                        break;
                }

                let eventRewardId = localStorage.getItem('eventRewardId');
                if (eventRewardId) {
                    $scope.getEvent(localStorage.getItem('eventRewardId'));
                }
                $scope.updateProgress();
            };

            $scope.back = function () {
                switch ($scope.currentInfoSection.length) {
                    case 2:
                        $scope.showHide.template = 'partials/reward-info.html';
                        $scope.currentInfoSection.pop('create_reward_detail_1');
                        $scope.addReward.reward_term = false;

                        $scope.stepOneStart = true;
                        $scope.stepOneEnd = false;
                        $scope.stepTwoStart = false;
                        $scope.stepTwoEnd = false;
                        break;
                    case 3:
                        $scope.stepTwoStart = true;
                        $scope.stepTwoEnd = false;
                        $scope.showHide.template = 'partials/reward-event-details.html';
                        $scope.currentInfoSection.pop('create_reward_guest_1');
                        if ($scope.action !== "Create") {
                            $scope.saveButtonText = 'Update Promotion';
                        } else {
                            $scope.saveButtonText = 'Continue';
                        }
                        $scope.addReward.reward_term = false;
                        $scope.saveAndExitBtn = 'Save & Exit';
                        $scope.cancelBtn = true;
                        $scope.hideShowPublicBtn = true;
                        break;
                }
                $scope.updateProgress();
            };

            $scope.disableContinue = function () {
                // Integrate through all shown forms
                let disableContinue = true;
                if ($scope.currentInfoSection && $scope.currentInfoSection.length > 0) {
                    $scope.formsValid = true;
                    for (let form of $scope.currentInfoSection) {
                        if (form in $scope.createRewardForms && $scope.createRewardForms[form]) {
                            $scope.formsValid = $scope.formsValid && $scope.createRewardForms[form].$valid;
                            if ($scope.createRewardForms[form].$error && Object.keys($scope.createRewardForms[form].$error).length > 0) {
                                $scope.formsValid = false;
                            }
                            if (form === 'create_reward_form_1' && (!$scope.addReward.event_id || $scope.addReward.event_id.length === 0)) {
                                // Check if category is set
                                $scope.formsValid = false;
                            } else if (form === 'create_reward_form_1' && (!$scope.addReward.image || $scope.addReward.image.length === 0)) {
                                // Check if image is set
                                $scope.formsValid = false;
                            }
                            if (!$scope.hideShowPublicBtn) {
                                $scope.formsValid = false;
                            }
                        }
                    }
                    disableContinue = !$scope.formsValid;
                }
                return disableContinue;
            };

            $scope.showBackBtn = function () {
                let showBackBtn = false;
                if ($scope.currentInfoSection && $scope.currentInfoSection.length > 1) {
                    showBackBtn = true;
                }
                if ($scope.action !== 'Create' && $scope.currentInfoSection && $scope.currentInfoSection.length < 1) {
                    showBackBtn = true;
                }
                return showBackBtn;
            };

            $scope.saveExit = function () {
                if (!$scope.addReward.is_draft) {
                    $scope.saveRewards(0, 1);
                } else {
                    $scope.saveRewards(1, 1);
                }
                if (angular.element('#close-icon')) {
                    angular.element('#close-icon').click();
                }
                window.location.href = '/manage_rewards_live';
            };

            $scope.exit = function () {
                if (angular.element('#close-icon')) {
                    angular.element('#close-icon').click();
                }
                setTimeout(function () {
                    window.location.href = '/';
                }, 200);
            };

            $scope.cancle = function () {
                window.location.href = '/manage_rewards_live';
            };

            $scope.getSocialShareURL = () => {
                let base_url = window.location.origin;
                let event_name = $scope.eventRDetails.event_name.replace(/\s+/g, '-').toLowerCase();
                var rewardUrl = base_url + "/eventdetails/" + event_name + '/' + $scope.eventRDetails.event_id;
                return rewardUrl;
            };

            $scope.gotoManageEvent = function () {
                window.location.href = '/manageevent';
            };

            // This function is create for get end date from event id.
            $scope.funcClick = function (data) {
                $scope.eventSelectedData = moment(data[0].start_date_time);
                $scope.addReward.end.date = $scope.eventSelectedData;
            };

            let upsertReward = (data, reward_id) => {
                let finalResponse = null;
                let promise = null;
                let token = authService.get('token');

                if (data.terms_condition == "") {
                    data.terms_condition = " ";
                }

                if (reward_id) {
                    promise = awsService.put(`/reward-update/${reward_id}`, data, token);
                } else {
                    promise = awsService.post('/reward-add', data, token);
                }
                return promise
                    .then(res => {
                        if (res.success && $scope.currentInfoSection.length <= 3) {
                            $scope.loading = true;
                            finalResponse = res;
                            if (res.reward_id) {
                                $scope.addReward.reward_id = res.reward_id;
                            }
                            // If Reward image is present then upload else do not upload the file
                            if ($scope.addReward.image && (($scope.action === 'Create' && $scope.ImageUploadDone) || ($scope.action !== 'Create' && ($scope.rewardDetailsres.image === null || $scope.rewardDetailsres.image === '')))) {
                                let fileName = userData.user_id + '-' + Date.now() + '.png';
                                let blob = dataURItoBlob($scope.addReward.image);
                                let file = new File([blob], fileName);

                                let aws_config = {
                                    'bucket': config.AWS_BUCKET,
                                    'access_key': config.AWS_ACCESS_KEY,
                                    'secret_key': config.AWS_SECRET_KEY,
                                    'region': config.AWS_REGION,
                                    'path': config.REWARD_IMG_UPLOAD_FOLDER,
                                    'img_show_url': config.AWS_IMG_SHOW_URL,
                                };
                                return eventsService.uploadImg(file, aws_config);
                            } else {
                                return Promise.resolve(res);
                            }
                        } else {
                            Utils.showError($scope, res.message);
                            $scope.showHide.template = 'partials/reward-info.html';
                            $scope.currentInfoSection.pop('create_reward_detail_1');
                            $scope.updateProgress();
                        }
                    })
                    .then((response) => {
                        if (response && response.file_url && finalResponse) {
                            finalResponse.image = response.file_url;
                            $scope.addReward.image_url = response.file_url;
                            $scope.newImage = response.file_url;
                        }
                        return Promise.resolve(finalResponse);
                    });
            };

            $scope.saveRewards = function (draft, exit) {
                var startTime = "0:00am";
                var endTime = "0:00am";
                var startDate = "";
                var endDate = "";
                if ($scope.addReward.reward_time === "auto" && $scope.action == "Create") {
                    startTime = moment.utc().format("h:00 a");
                    endTime = moment($scope.eventRDetails.start_date_time).subtract(120, "minutes").format("h:00 a");
                    startDate = moment.utc().format("YYYY-MM-DD");
                    endDate = moment($scope.eventRDetails.start_date_time).format("YYYY-MM-DD");
                    $scope.addReward.endDate = endDate + endTime;
                } else if ($scope.addReward.reward_time === "auto" && $scope.action !== "Create") {
                    startTime = moment.utc().format("h:00 a");
                    endTime = moment($scope.eventRDetails.start_date_time).subtract(120, "minutes").format("h:00 a");
                    startDate = moment.utc().format("YYYY-MM-DD");
                    endDate = moment($scope.eventRDetails.start_date_time).format("YYYY-MM-DD");
                } else {
                    startTime = $scope.addReward.start.time;
                    endTime = $scope.addReward.end.time;
                    startDate = moment($scope.addReward.start.date).format("YYYY-MM-DD");
                    endDate = moment($scope.addReward.end.date).format("YYYY-MM-DD");
                }

                let data = {
                    reward_id: $scope.addReward.reward_id,
                    event_id: "",
                    title: $scope.addReward.title,
                    description: $scope.addReward.description,
                    reward_item: $scope.addReward.reward_item,
                    image: $scope.newImage,
                    start_date: startDate + " " + startTime,
                    end_date: endDate + " " + endTime,
                    winner_type: $scope.addReward.winner_type,
                    reward_type: $scope.addReward.reward_type,
                    no_of_people: $scope.addReward.no_of_people,
                    no_of_click: $scope.addReward.no_of_click,
                    terms_condition: $scope.addReward.terms_condition,
                    time_zone: $scope.addReward.time_zone,
                    reward_time: $scope.addReward.reward_time,
                    is_draft: draft,
                    terms_condition_accept: $scope.addReward.reward_term
                };

                if ($scope.action == "Create") {
                    data.event_id = $scope.addReward.event_id[0].id;
                } else {
                    data.event_id = $scope.eventRDetails.event_id;
                }

                if ($scope.newImage) {
                    data.image = $scope.newImage;
                } else if ($scope.rewardDetailsres.image) {
                    data.image = $scope.rewardDetailsres.image;
                }

                upsertReward(data, $scope.addReward.reward_id)
                    .then((res) => {
                        $scope.loading = false;
                        $scope.showHide.savingDraft = false;
                        let message = "";

                        if ($scope.action !== 'Create') {
                            localStorage.setItem('eventRewardId', $scope.addReward.event_id);
                            if (exit) {
                                message = 'Congratulations, Rewards has been edited.';
                            }
                        } else {
                            localStorage.setItem('eventRewardId', $scope.addReward.event_id[0].id);
                        }

                        if ($scope.action === 'Create' && !draft) {
                            $scope.createRewardsSuccess = true;
                        } else if ($scope.action !== 'Create' && !draft && $scope.rewardDetailsres.is_draft) {
                            $scope.createRewardsSuccess = true;
                        } else if ($scope.action !== 'Create' && !draft && !$scope.rewardDetailsres.is_draft) {
                            $scope.createRewardsSuccess = false;
                        }

                        if (message) {
                            Utils.showSuccess($scope, message);
                        }
                        if (exit) {
                            if ($scope.showHide.isMobile.matches) {
                                $scope.showHide.mobile.eventsuccess = true;
                                $scope.showHide.mobile.createnewevent = false;
                            } else {
                                $window.location.href = '/manage_rewards_live';
                            }
                        }
                        Utils.applyChanges($scope);
                    }).catch(err => {
                        console.log("ERROR ::", err);
                        Utils.showError($scope, 'Oops, Cannot ' + $scope.action + ' reward.');
                        $scope.loading = false;
                        Utils.applyChanges($scope);
                    }).finally(() => {
                        $scope.loading = false;
                    });
            };

            $scope.getEvent = function (eventId) {
                let eventRewardsDetails = null;
                return eventsService.getEventDetails(eventId)
                    .then(res => {
                        if (res.status == 200) {
                            let data = res.data;
                            if (data.success) {
                                $scope.event = data.data;
                                eventRewardsDetails = data.data;
                                $scope.eventRDetails = eventRewardsDetails;
                                if ("ticket_type" in $scope.eventRDetails && $scope.eventRDetails.ticket_type == "") {
                                    $scope.eventRDetails.ticket_type = $scope.eventRDetails.event_type;
                                }
                                let eventURL = $scope.eventRDetails.event_url;
                                $scope.whatsAppUrl = `https://wa.me/?text=${encodeURIComponent(eventURL)}`;

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
                                if (eventRewardsDetails && eventRewardsDetails.length > 0) {
                                    if (!('country_code' in eventRewardsDetails && eventRewardsDetails.country_code) && eventRewardsDetails.address) {
                                        return locationService.getAddressByLatLong(eventRewardsDetails.latitude, eventRewardsDetails.longitude);
                                    }
                                }
                                metaTagsService.setDefaultTags({
                                    'Title': 'The Promo App | Social Event Management Network',
                                    'Description': 'The Promo App makes social event networking and event management easier than ever before. Find events, buy and sell tickets, promote events, and more.',
                                    'Keywords': 'The Promo App, event management',
                                    // OpenGraph
                                    'og:title': $scope.eventRDetails.event_name,
                                    'og:description': strip_html_tags($scope.eventRDetails.description),
                                    'og:image': fileExtension($scope.eventRDetails.event_image),
                                    'og:url': eventURL,
                                    // Twitter
                                    'twitter:title': $scope.eventRDetails.event_name,
                                    'twitter:description': strip_html_tags($scope.eventRDetails.description),
                                    'twitter:image': fileExtension($scope.eventRDetails.event_image),
                                    'twitter:card': fileExtension($scope.eventRDetails.event_image),
                                });
                                $scope.urlEventName = $scope.eventRDetails.event_name.replace(/\s+/g, '-').toLowerCase();
                            }
                        }
                    })
                    .then((address) => {
                        if (eventRewardsDetails && address) {
                            if ('country_code' in address && address.country_code) {
                                eventRewardsDetails[0].country_code = address.country_code;
                            }

                            if (address.address && 'country' in address.address && address.address.country && !eventRewardsDetails[0].country) {
                                eventRewardsDetails[0].country = address.address.country;
                            }

                        }
                        return Promise.resolve(eventRewardsDetails);
                    });
            };

            apiService.getEventCategories(token).then((response) => {
                if (response.status == 200) {
                    let data = response.data;
                    if (data.success) {
                        let catData = data.data;
                        catData.forEach(function (cat) {
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

            $scope.getCatName = function (nameKey, myArray) {
                for (var i = 0; i < myArray.length; i++) {
                    if (myArray[i].id === nameKey) {
                        return myArray[i];
                    }
                }
            };

            $scope.initTimeZone = function () {
                locationService.getUserLocation()
                    .then((res) => {
                        if (res) {
                            // Get timezone 
                            locationService.getTimeZone(res.lat, res.lng)
                                .then((response) => {
                                    if (response && response.data && 'timeZoneId' in response.data && response.data.timeZoneId) {
                                        $scope.addReward.time_zone = response.data.timeZoneId;
                                    }
                                });
                        } else {
                            $scope.addReward.time_zone = "US/Pacific";
                        }
                    }).catch((err) => {
                        console.log(err);
                    });
            };

            // This function is used to open a modal
            $scope.openModal = function (html, eventModelScope, size) {
                eventModelScope.user = $scope.user;
                let modalInstance = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: `../../partials/${html}`,
                    openedClass: 'pa-create-event-modal add-link-modal',
                    scope: eventModelScope,
                    size: (size || 'md')
                });
                return modalInstance;
            };

            $scope.cancel = function () {
                this.$dismiss('close');
            };

            // This function is called when user selects a image
            $scope.handleFileSelect = function (files, evt, invalidFiles) {
                let file = files;
                if (file) {
                    let reader = new FileReader();
                    $scope.showHide.imageSelected = true;
                    reader.onload = function (evt) {
                        $scope.$apply(function ($scope) {
                            $scope.imageForCropping = evt.target.result;
                            if (!$scope.showHide.isMobile.matches) {
                                $mdDialog.show({
                                    controller: ['$scope', '$mdDialog', 'imageForCropping', function ($scope, $mdDialog, imageForCropping) {
                                        $scope.imageForCropping = imageForCropping;
                                        $scope.croppedImage = null;
                                        $scope.closeDialog = function (state) {
                                            $mdDialog.hide({ state: state, image: $scope.croppedImage });
                                        };
                                    }],
                                    templateUrl: 'cropImage.html',
                                    parent: angular.element(document.body),
                                    clickOutsideToClose: false,
                                    fullscreen: true,
                                    locals: {
                                        imageForCropping: $scope.imageForCropping
                                    },
                                    onShowing: function (scope, element) {
                                        element.addClass('pa-background-white');
                                    }
                                })
                                    .then(function (state) {
                                        if (state.state === 'save') {
                                            $scope.addReward.croppedImage = state.image;
                                            $scope.setCroppedImageAsFinalImage();
                                            $scope.promotionSteps1();
                                        } else {
                                            $scope.discardCroppedImage();
                                        }
                                    }, function () {
                                        $scope.status = 'You cancelled the dialog.';
                                    });
                            }
                        });
                    };
                    reader.readAsDataURL(file);
                } else if (invalidFiles.length > 0) {
                    let err = invalidFiles.some(er => er.$error == "maxSize");
                    if (err) {
                        Utils.showError($scope, "Your file size should not be larger than 10MB.");
                    }
                    $scope.showHide.imageSelected = false;
                } else if ($scope.addReward.croppedImage) {
                    // this block is done to handle clicking on cancel in case of edit image
                    $scope.addReward.image = $scope.addReward.croppedImage;
                    if (!$scope.currentInfoSection.includes('create_reward_form_1') && !$scope.showHide.isMobile.matches) {
                        $scope.continue();
                    }
                }

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

            $scope.setCroppedImageAsFinalImage = function ($event) {
                if ($scope.showHide.imageSelected) {
                    $scope.imageForCropping = null;
                    $scope.addReward.image = $scope.addReward.croppedImage;
                    $scope.showHide.imageSelected = false;
                    if ('create_reward_form_1' in $scope.createRewardForms) {
                        $scope.createRewardForms.create_reward_form_1.eventImage.$setValidity('maxSize', true);
                        $scope.createRewardForms.create_reward_form_1.eventImage.$setValidity('required', true);
                    }
                }
                if (!$scope.currentInfoSection.includes('create_reward_form_1') && !$scope.showHide.isMobile.matches) {
                    $scope.continue();
                }
                if ($event) {
                    $event.preventDefault();
                }
            };

            $scope.discardCroppedImage = function ($event) {
                $scope.showHide.imageSelected = false;
                $scope.addReward.image = null;
                $scope.croppedImage = null;
                $scope.imageForCropping = null;
                $event.preventDefault();
            };

            // This function is called on click on edit image
            $scope.editImage = function (id) {
                angular.element('#' + id).click();
                $scope.rewardDetailsres.image = null;
            };

            // This function is called on click on delete image
            $scope.deleteImage = function () {
                $scope.createRewardForms.create_reward_form_1.eventImage.$setValidity('required', false);
                $scope.addReward.image = null;
                $scope.addReward.croppedImage = null;
                $scope.rewardDetailsres.image = null;
            };

            $scope.goToPage = function (page) {
                location.href = page;
            };

            $scope.showCraeteReward = function (value) {
                //If DIV is visible it will be hidden and vice versa.
                $scope.IsVisible = true;
                if ($scope.addReward.event_id.length <= 0 && value == "N") {
                    let notify = {
                        type: 'warning',
                        title: 'Opps..!!',
                        content: "Please select event from General Information.",
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    return false;
                }
                if (value == "N") {
                    if ($scope.action === 'Create') {
                        $scope.eventSelectedData = $scope.addReward.event_id[0].start_date_time;
                        $scope.startTime = moment().format('h:00a');
                        $scope.endTime = moment($scope.addReward.event_id[0].start_date_time).format('h:00a');
                        $scope.eventSelectedData = moment($scope.eventSelectedData).format('MMM DD YYYY hh:mm a');
                        $scope.addReward.end.date = $scope.eventSelectedData;
                    } else {
                        $scope.startTime = moment($scope.addReward.start_date).format('h:00a');
                        $scope.endTime = moment($scope.eventRDetails.start_date_time).format('h:00a');
                    }
                    
                    $scope.dropdowns.times.options.forEach(function (indexNumber, index) {
                        if (indexNumber.key == $scope.endTime) {
                            $scope.timeEndIndex = index - 2;
                            $scope.timeEndKey = $scope.dropdowns.times.options[$scope.timeEndIndex].value;
                        }

                        if (indexNumber.key == $scope.startTime) {
                            $scope.timeStartKey = $scope.dropdowns.times.options[index].value;
                        }
                    });

                    $scope.addReward.start.time = $scope.timeStartKey;
                    $scope.addReward.end.time = $scope.timeEndKey;
                }
            };

            $scope.eventDateTimeChange = function () {
                let rewardEndDateValue = moment($scope.addReward.end.date).format('YYYY-MM-DD');
                let eventStartDateValue = "";
                if ($scope.action === 'Create') {
                    eventStartDateValue = moment($scope.addReward.event_id[0].start_date_time).format('YYYY-MM-DD');
                } else {
                    eventStartDateValue = moment($scope.eventRDetails.start_date_time).format('YYYY-MM-DD');
                }
                if (eventStartDateValue > rewardEndDateValue) {
                    $scope.timeEndIndex = $scope.dropdowns.times.options.length - 1;
                } else if (eventStartDateValue == rewardEndDateValue) {
                    $scope.dropdowns.times.options.forEach(function (indexNumber, index) {
                        if (indexNumber.key == $scope.endTime) {
                            $scope.timeEndIndex = index - 2;
                            $scope.timeEndKey = $scope.dropdowns.times.options[$scope.timeEndIndex].value;
                        }

                        if (indexNumber.key == $scope.startTime) {
                            $scope.timeStartKey = $scope.dropdowns.times.options[index].value;
                        }
                    });
                }

                $scope.addReward.start.time = $scope.timeStartKey;
                $scope.addReward.end.time = $scope.timeEndKey;
            };

            $scope.viewMore = function () {
                $scope.showMore = !$scope.showMore;
            };

            $scope.popup = function () {
                var popup = angular.element("#RewardConditions");
                if (!$scope.addReward.reward_term) {
                    popup.modal('show');
                } else {
                    $scope.hideShowPublicBtn = false;
                }
            };

            $scope.scrollTo = function (id) {
                console.log(id);
                window.history.pushState("", "", '/createreward/edit/220#' + id);
                $location.pathname(id);
                $anchorScroll();
            };

            $scope.toggle = function () {
                $scope.addReward.reward_term = true;
                $scope.hideShowPublicBtn = true;
            };

            $scope.toggleCancel = function () {
                $scope.addReward.reward_term = false;
                $scope.hideShowPublicBtn = false;
            };

            $scope.socialShare = (social_type) => {
                let base_url = window.location.origin;
                let event_name = $scope.eventRDetails.event_name.replace(/\s+/g, '-').toLowerCase();
                var rewardUrl = base_url + "/eventdetails/" + event_name + '/' + $scope.eventRDetails.event_id;
                if (social_type == "facebook") {
                    Socialshare.share({
                        'provider': social_type,
                        'attrs': {
                            'appId': config.FACEBOOK_APP_ID,
                            'socialshareUrl': rewardUrl,
                            'socialshareDisplay': $scope.eventRDetails.event_name
                        }
                    });
                }

                if (social_type == "whatsapp") {
                    var whatsAppUrl = `https://wa.me/?text=${encodeURIComponent(rewardUrl)}`;
                    window.open(whatsAppUrl, '_blank');
                }

                if (social_type == "email") {
                    Socialshare.share({
                        'provider': social_type,
                        'attrs': {
                            'socialshareBody': rewardUrl,
                            'socialshareSubject': $scope.eventRDetails.event_name
                        }
                    });
                }
            };

            $scope.emailShare = (social_type) => {
                let base_url = window.location.origin;
                let event_name = $scope.eventRDetails.event_name.replace(/\s+/g, '-').toLowerCase();
                $scope.rewardUrl = base_url + "/eventdetails/" + event_name + '/' + $scope.eventRDetails.event_id;
                let url = escape($scope.rewardUrl);
                let googleMail = 'https://mail.google.com/mail/?view=cm&fs=1&to=&su=' + $scope.eventRDetails.event_name + '&body=' + url;
                let ooutlookMail = 'https://outlook.office.com/owa/?path=/mail/action/compose&to=&subject' + $scope.eventRDetails.event_name + '&body=' + url;
                let yahooMail = 'https://compose.mail.yahoo.com/?to=&subject=' + $scope.eventRDetails.event_name + '&body=' + url;
                let email = 'mailto:?subject=' + $scope.eventRDetails.event_name + '&body=' + url;
                let urlCopy = $scope.rewardUrl;
                angular.element("#mailtoui-button-1").attr("href", googleMail);
                angular.element("#mailtoui-button-2").attr("href", ooutlookMail);
                angular.element("#mailtoui-button-3").attr("href", yahooMail);
                angular.element("#mailtoui-button-4").attr("href", email);
                angular.element("#mailtoui-email-address").append(urlCopy);
                angular.element("#mailtoui-modal").show();
                angular.element(".mailtoui-brand").remove();
            };

            $scope.linkCopied = () => {
                $scope.displayTooltip = true;
            };

            /** Promotion Guidance **/

            $scope.initialGuidance = () => {
                if ($scope.promotionGuidance === "true") {

                    //initialize instance
                    var initialGuidance = new EnjoyHint({});

                    //simple config.
                    var initialGuidance_script_steps = [{
                        "next #top-header": 'Hello, let’s start setting up your social event promotion. <br> We’ll walk you through the process step by step. <br> Click “Next” to proceed.',
                        showSkip: false
                    }, {
                        "next #selectEvent": 'Select the event you want to promote. <br> Click “Next” to proceed.',
                        showSkip: false
                    }, {
                        "next #promotionTitle": 'Add a title for your promotion. <br> Click “Next” to proceed.',
                        showSkip: false
                    }, {
                        "next #promotionDesc": 'Add a description for your promotion. Tell people what they need to know. <br> Click “Next” to proceed.',
                        showSkip: false
                    }, {
                        "next #rewardDetails": 'Add your reward details. What will people receive as their "prize"? <br> Click “Next” to proceed.',
                        showSkip: false
                    }, {
                        "click .image-upload-view": 'Click the image upload area to upload a promotional image.',
                        showSkip: false
                    }];

                    //set script config
                    initialGuidance.set(initialGuidance_script_steps);

                    //run Enjoyhint script
                    initialGuidance.run();

                    $cookies.put('promotionGuidance', false);
                    $scope.promotionGuidance = false;
                    $scope.promotionGuidance2 = true;
                    $scope.promotionStep1 = true;
                }
            };

            $scope.promotionSteps1 = () => {
                if ($scope.promotionStep1) {
                    //initialize instance
                    var promotionSteps1 = new EnjoyHint({});

                    //simple config.
                    var promotionSteps1_script_steps = [{
                        "next #selectDateOption": 'Check the start and end dates for your promotion. Choose the "Auto Select" option <br/> if you want to run the promotion from now until 2 hours before your event starts. <br/> Select the custom option to specify your own start and end dates. <br/> Click “Next” to proceed.',
                        showSkip: false
                    }, {
                        "click #continueButton": 'Click "Continue" to proceed to the next step.',
                        showSkip: false
                    }];
                    //set script config
                    promotionSteps1.set(promotionSteps1_script_steps);

                    //run Enjoyhint script
                    promotionSteps1.run();
                    $scope.promotionGuidance2 = true;
                    $scope.promotionStep1 = false;
                }
            };

            $scope.promotionStep2 = () => {
                if ($scope.promotionGuidance2) {

                    //initialize instance
                    var promotionStep2 = new EnjoyHint({});

                    //simple config.
                    var promotionStep2_script_steps = [{
                        "next #winnerSection": 'Who will receive the reward? <br/> Choose "First Responders" if you want the first few respondents to win. <br/> Choose "Random Winners" for a completely randomized selection of winners. <br/> Click "Next" to proceed.',
                        showSkip: false
                    }, {
                        "next #winPromotion": 'Select how many people should receive the reward. <br/> Click "Next" to proceed.',
                        showSkip: false
                    }, {
                        "next #shareLinkPromotion": 'Select how many clicks should be generated from a user’s shared link? <br> Click “Next” to proceed.',
                        showSkip: false
                    }, {
                        "next #receivePromotion": 'Choose how and when the user will receive their reward. <br> Click "Next" to proceed.',
                        showSkip: false
                    }, {
                        "next #termsSection": 'Add the all-important terms and conditions for this social promotion. <br> Tell users everything they need to know. <br> Click "Next" to proceed.',
                        showSkip: false
                    }, {
                        "click #continueButton": 'Click "Continue" to proceed to the next step.',
                        showSkip: false
                    }];

                    //set script config
                    promotionStep2.set(promotionStep2_script_steps);

                    //run Enjoyhint script
                    promotionStep2.run();

                    $scope.promotionGuidance2 = false;
                    $scope.promotionGuidance3 = true;
                }
            };

            $scope.promotionStep3 = () => {
                if ($scope.promotionGuidance3) {

                    //initialize instance
                    var promotionStep3 = new EnjoyHint({});

                    //simple config.
                    var promotionStep3_script_steps = [{
                        "next #finalPreview": 'This is the final preview of your event detail page. You’ll see your event promotion details here. <br/> Click "Next" to proceed.',
                        showSkip: false
                    }, {
                        "next #eventTitle": 'Here you can see the event name you selected along with the category for your promotion. <br/> Click "Next" to proceed.',
                        showSkip: false
                    }, {
                        "next #eventBasicInfo": 'Here you can see your basic event details including the event image, <br/> event date, start and end times, and location. <br/> Click "Next" to proceed.',
                        showSkip: false
                    }, {
                        "next #promotionView": 'This is the preview of the event promotion data you have generated. <br/> Click "Next" to proceed.',
                        showSkip: false
                    }, {
                        "next #rewardlistingWin": 'These are the conditions of your promotion and the eligibility details. <br/> Click "Next" to proceed.',
                        showSkip: false
                    }, {
                        "next .agreePromoreward": 'Please agree to The Promo App’s Terms and Conditions. <br/> A pop-up will allow you to read through the information before you agree. <br/> Once these terms are accepted, we will publish your promotion. <br/> Click "Next" to proceed.',
                        showSkip: false
                    }, {
                        "click #continueButton": 'Click the publish button and we will publish your <br/> promotion and generate your sharing link. <br/> Once this step is complete you can share your promotion <br/> and the reward on social media.',
                        showSkip: false
                    }];

                    //set script config
                    promotionStep3.set(promotionStep3_script_steps);

                    //run Enjoyhint script
                    promotionStep3.run();

                    $scope.promotionGuidance3 = false;
                }
            };

            $scope.init = function () {
                localStorage.setItem('eventRewardId', null);
                if ($route.current.params && 'rewardId' in $route.current.params) {
                    $scope.action = 'edit';
                    if ($scope.action === 'edit') {
                        $scope.addReward.reward_term = false;
                        $scope.saveButtonText = 'Update Promotion';
                        $scope.timeEndIndex = 25;
                    } else {
                        $scope.addReward.reward_term = false;
                        $scope.saveButtonText = 'Continue';
                    }
                    let rewardId = $route.current.params.rewardId;
                    let token = authService.get('token');
                    awsService.get(`/reward/${rewardId}`, token).then((rewardResponse) => {
                        $scope.loading = true;
                        let rewardDetails = rewardResponse.data[0];
                        $scope.rewardDetailsres = rewardResponse.data[0];
                        if ($scope.userDetails.user_id !== rewardDetails._user_id) {
                            $scope.cancle();
                        }
                        $scope.startTime = moment().format('h:mm a');
                        if ($scope.action === 'edit') {
                            localStorage.setItem('eventRewardId', rewardDetails._event_id);
                            $scope.getEvent(localStorage.getItem('eventRewardId'));
                            $scope.eventSelectedData = moment(rewardDetails.event_details.start_date_time);
                        }
                        eventsService.getUserEventDD().then((response) => {
                            for (let userEvent of response) {
                                if (userEvent.id == rewardDetails._event_id) {
                                    userEvent.selected = true;
                                }
                                $scope.userEventDD.push(userEvent);
                            }
                            $scope.userEventDD = Object.values(response);
                        });
                        $scope.addReward = {
                            "reward_id": rewardDetails.reward_id,
                            "event_id": rewardDetails._event_id,
                            "title": rewardDetails.title,
                            "description": rewardDetails.description,
                            "image": rewardDetails.image,
                            "reward_item": rewardDetails.reward_item,
                            "start_date": rewardDetails.start_date,
                            "end_date": rewardDetails.end_date,
                            "winner_type": rewardDetails.winner_type,
                            "no_of_people": rewardDetails.no_of_people,
                            "no_of_click": rewardDetails.no_of_click,
                            "reward_type": rewardDetails.reward_type,
                            "terms_condition": rewardDetails.terms_condition,
                            "time_zone": rewardDetails.time_zone,
                            "is_draft": rewardDetails.is_draft,
                            "reward_time": rewardDetails.reward_time,
                            "reward_term": false,
                            "start": { "date": rewardDetails.start_date, "time": moment(rewardDetails.start_date).format("h:mm a") },
                            "end": { "date": rewardDetails.end_date, "time": moment(rewardDetails.end_date).format("h:mm a") }
                        };
                        if ($scope.addReward.reward_time === "auto" && $scope.action === 'edit') {
                            $scope.showCraeteReward('Y');
                        } else {
                            $scope.showCraeteReward('N');
                        }
                    }).catch(err => {
                        let notify = {
                            type: 'error',
                            title: 'Oops!!',
                            content: "Sorry something went wrong. Please try later.",
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        Utils.applyChanges($scope);
                    }).finally(() => {
                        $scope.loading = false;
                    });
                } else {
                    eventsService.getUserEventDD().then((response) => {
                        if ($route.current.params && 'eventId' in $route.current.params) {
                            for (let userEvent of response) {
                                if (userEvent.id == $route.current.params.eventId) {
                                    userEvent.selected = true;
                                    $scope.addReward.time_zone = userEvent.timezone;
                                }
                                $scope.userEventDD.push(userEvent);
                            }
                        }
                        $scope.userEventDD = Object.values(response);
                    }).then(() => {
                        eventsService.getEventDetails($route.current.params.eventId)
                            .then(res => {
                                if (res.status == 200) {
                                    let data = res.data;
                                    if (data.success) {
                                        $scope.event = data.data;
                                        if ("ticket_type" in $scope.event && $scope.event.ticket_type == "") {
                                            $scope.event.ticket_type = $scope.event.event_type;
                                        }
                                    }
                                    if ($scope.action === 'Create') {
                                        $scope.showCraeteReward('Y');
                                    }
                                }
                            });
                        Promise.resolve($scope.event);
                    });

                }

                $scope.showHide.isMobile = window.matchMedia("only screen and (max-width: 1024px)");
                let timeZones = moment.tz.names();
                for (let i in timeZones) {
                    let tz = "(GMT" + moment.tz(timeZones[i]).format('Z') + ")" + timeZones[i];
                    $scope.dropdowns.timezones.options.push({ key: timeZones[i], value: tz });
                }

                angular.element("#mailtoui-modal-close").on('click', function () {
                    angular.element("#mailtoui-button-1").attr("href", "");
                    angular.element("#mailtoui-button-2").attr("href", "");
                    angular.element("#mailtoui-button-3").attr("href", "");
                    angular.element("#mailtoui-button-4").attr("href", "");
                    angular.element("#mailtoui-email-address").empty();
                    angular.element("#mailtoui-modal").hide();
                });

                /* Guidance Functionality Hide for Future */
                // $scope.promotionGuidance = $cookies.get('promotionGuidance');
                // setTimeout(function() {
                //     $scope.initialGuidance();
                // }, 2000);
                $ocLazyLoad.load({
                    insertBefore: "#load_css_before",
                    files: ["js/thirdparty/enjoyhint/enjoyhint.css"]
                });
                $scope.initTimeZone();
            };

            $scope.init();
        }
    ]);