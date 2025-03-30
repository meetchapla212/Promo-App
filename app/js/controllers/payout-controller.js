angular.module('PromoApp')
    .controller('PayoutController', ['$scope', 'config', '$uibModal', 'Utils', 'stripeService', 'userService', '$window', 'authService', 'apiService', '$timeout', 'metaTagsService', function($scope, config, $uibModal, Utils, stripeService, userService, $window, authService, apiService, $timeout, metaTagsService) {
        $scope.data = {
            group1: 'individual',
            group2: 'Savings'
        };

        $scope.pagination = {
            currentPage: 1,
            numPerPage: 10,
            maxSize: 5
        };

        $scope.removeItem = function() {
            $scope.radioData.pop();
        };

        $scope.goToPage = (location) => {
            $window.location.href = location;
        };

        $scope.reloadPage = () => {
            $window.location.reload();
        };

        const applyChanges = function() {
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        };

        $scope.userBankList = [];
        $scope.activePays = [];
        $scope.pendingPays = [];
        $scope.completePays = [];
        $scope.user = {};
        $scope.loading = false;
        $scope.stripe_client_id = config.STRIPE_CLIENT_ID;
        $scope.filterDateFrom = moment();
        $scope.filterDateStart = moment();
        $scope.filterDateTo = moment().add('7', 'days');
        $scope.showhide = {
            results: true,
            selectdates: false
        };

        $scope.stripe_selected_country = 'US';
        $scope.dropdowns = {
            stripe_country: {
                options: [{
                        key: 'US',
                        value: 'US'
                    },
                    {
                        key: 'GB',
                        value: 'UK'
                    }
                ]
            },
            payout_country: {
                options: [{
                        key: 'US',
                        value: 'United States'
                    },
                    {
                        key: 'GB',
                        value: 'United Kingdom'
                    }
                ]
            },
            payout_currency: {
                options: [{
                        key: 'USD',
                        value: 'U.S. Dollar $'
                    },
                    {
                        key: 'GBP',
                        value: 'Pound £'
                    }
                ]
            }
        };

        $scope.stripe_verification_status = '';
        $scope.stripe_message = '';
        $scope.stripe_link = '';

        $scope.openBankInfo = function() {
            let eventModelScope = $scope.$new(false, $scope);
            eventModelScope.bankAccountParams = {
                "country": "US",
                "currency": "USD",
                "account_number": '',
                "account_holder_first_name": '',
                "account_holder_last_name": '',
                "account_holder_type": 'individual',
                "routing_number": '',
                "sort_code": ''
            };

            $uibModal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: '../../partials/addBankInfo.html',
                openedClass: 'update_bank_info pa-create-event-modal add-link-modal popup_wtd_700',
                scope: eventModelScope,
                size: 'md'
            });
        };

        $scope.createBankToken = function(bankAccountParams, form) {
            if (!bankAccountParams.account_holder_first_name && !bankAccountParams.account_holder_last_name && (!bankAccountParams.routing_number || !bankAccountParams.sort_code) && !bankAccountParams.re_account_number && !bankAccountParams.account_number) {
                form.accountHolderFirstName.$invalid = true;
                form.accountHolderLastName.$invalid = true;
                form.accountNumber.$invalid = true;
                form.reAccountNumber.$invalid = true;
                form.routingNumber.$invalid = true;
                form.sort_code.$invalid = true;
                return false;
            } else if (!bankAccountParams.account_holder_last_name && (!bankAccountParams.routing_number || !bankAccountParams.sort_code) && !bankAccountParams.re_account_number && !bankAccountParams.account_number) {
                form.accountHolderLastName.$invalid = true;
                form.accountNumber.$invalid = true;
                form.reAccountNumber.$invalid = true;
                form.routingNumber.$invalid = true;
                form.sort_code.$invalid = true;
                return false;
            } else if ((!bankAccountParams.routing_number || !bankAccountParams.sort_code) && !bankAccountParams.re_account_number && !bankAccountParams.account_number) {
                form.accountNumber.$invalid = true;
                form.reAccountNumber.$invalid = true;
                form.routingNumber.$invalid = true;
                form.sort_code.$invalid = true;
                return false;
            } else if (!bankAccountParams.re_account_number && !bankAccountParams.account_number) {
                form.accountNumber.$invalid = true;
                form.reAccountNumber.$invalid = true;
                return false;
            } else {
                if (!bankAccountParams.account_holder_first_name) {
                    form.accountHolderFirstName.$invalid = true;
                    return false;
                } else if (!bankAccountParams.account_holder_last_name) {
                    form.accountHolderLastName.$invalid = true;
                    return false;
                } else if (!bankAccountParams.routing_number && bankAccountParams.country != 'GB') {
                    form.routingNumber.$invalid = true;
                    return false;
                } else if (!bankAccountParams.sort_code && bankAccountParams.country === 'GB') {
                    form.sort_code.$invalid = true;
                    return false;
                } else if (!bankAccountParams.re_account_number) {
                    form.reAccountNumber.$invalid = true;
                    return false;
                } else if (!bankAccountParams.account_number) {
                    form.accountNumber.$invalid = true;
                    return false;
                }
            }
            if (bankAccountParams.account_number !== bankAccountParams.re_account_number) {
                let notify = {
                    type: 'error',
                    title: 'OOPS!!',
                    content: 'Account number and Re-enter Account Number not matched.',
                    timeout: 5000 //time in ms
                };
                $scope.$emit('notify', notify);
            } else {
                let stripe = Stripe(config.STRIPE_PUBLISH_KEY);
                let bankInfo = {};
                if (bankAccountParams.country === 'US') {
                    bankInfo = {
                        "country": bankAccountParams.country,
                        "currency": "USD",
                        "account_number": bankAccountParams.account_number,
                        "account_holder_name": bankAccountParams.account_holder_first_name + ' ' + bankAccountParams.account_holder_last_name,
                        "account_holder_type": bankAccountParams.account_holder_type,
                        "routing_number": bankAccountParams.routing_number,
                    };
                } else {
                    bankInfo = {
                        "country": bankAccountParams.country,
                        "currency": "GBP",
                        "account_number": bankAccountParams.account_number,
                        "account_holder_name": bankAccountParams.account_holder_first_name + ' ' + bankAccountParams.account_holder_last_name,
                        "account_holder_type": bankAccountParams.account_holder_type,
                        "sort_code": bankAccountParams.sort_code,
                    };
                }


                stripe.createToken('bank_account', bankInfo).then((response) => {
                    if (response && 'token' in response) {
                        return response.token.id;
                    } else {
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: response.error.message,
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        return false;
                    }
                }).then((bank_token) => {
                    if (bank_token) {
                        stripeService.linkBankAccount(bank_token).then((response) => {
                            if (response.success) {
                                $scope.reloadPage();
                            } else {
                                let notify = {
                                    type: 'error',
                                    title: 'OOPS!!',
                                    content: response.message,
                                    timeout: 5000 //time in ms
                                };
                                $scope.$emit('notify', notify);
                            }
                        }).catch(err => {
                            let content = "Sorry something went wrong. Please try later.";
                            if (err.data && 'message' in err.data) {
                                content = err.data.message;
                            }
                            let notify = {
                                type: 'error',
                                title: 'OOPS!!',
                                content: content,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                        });
                    }
                }).catch(err => {
                    console.log(err);
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: "Sorry something went wrong. Please try later.",
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                }).finally(() => {});
            }
        };

        $scope.cancel = function() {
            this.$dismiss({});
        };

        $scope.confirmMakeDefault = function(stripe_bank_id) {
            let eventModelScope = $scope.$new(false, $scope);
            eventModelScope.stripe_bank_id = stripe_bank_id;
            $uibModal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: '../../partials/confirmMakeDefault.html',
                openedClass: 'pa-create-event-modal add-link-modal popup_wtd_700',
                scope: eventModelScope,
                size: 'md'
            });
        };

        $scope.makeBankDefault = function(stripe_bank_id) {
            stripeService.makeBankDefault(stripe_bank_id)
                .then((response) => {
                    if (response.success) {

                        $window.location.reload();
                    } else {
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: response.message,
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                    }
                }).catch(err => {
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: "Sorry something went wrong. Please try later.",
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                });
        };

        $scope.confirmMakeDelete = function(stripe_bank_id) {
            let eventModelScope = $scope.$new(false, $scope);
            eventModelScope.stripe_bank_id = stripe_bank_id;
            $uibModal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: '../../partials/confirmMakeDelete.html',
                openedClass: 'pa-create-event-modal add-link-modal popup_wtd_700',
                scope: eventModelScope,
                size: 'md'
            });
        };

        $scope.deleteBankInfo = function(stripe_bank_id) {
            stripeService.deleteBankInfo(stripe_bank_id)
                .then((response) => {
                    if (response.success) {

                        $window.location.reload();
                    } else {
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: response.message,
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                    }
                }).catch(err => {
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: "Sorry something went wrong. Please try later.",
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                });
        };

        $scope.openEditBankInfo = function(selected_bank_index) {
            let eventModelScope = $scope.$new(false, $scope);
            let selectedBank = $scope.userBankList[selected_bank_index];
            let account_holder_info = (selectedBank.account_holder_name).split(" ");

            eventModelScope.bankAccountParams = {
                "country": "US",
                "currency": "USD",
                "account_number": 'XXXXX ' + selectedBank.last4,
                "account_holder_first_name": account_holder_info[0],
                "account_holder_last_name": account_holder_info[1],
                "account_holder_type": selectedBank.account_holder_type,
                "routing_number": selectedBank.routing_number,
            };
            eventModelScope.stripe_bank_id = selectedBank.stripe_bank_id;
            $uibModal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: '../../partials/viewBankInfo.html',
                openedClass: 'update_bank_info pa-create-event-modal add-link-modal popup_wtd_700',
                scope: eventModelScope,
                size: 'md'
            });
        };

        $scope.updateBankInfo = function(selected_bank_index, bankAccountParams) {

            let data = {
                "account_holder_name": bankAccountParams.account_holder_first_name + ' ' + bankAccountParams.account_holder_last_name,
                "account_holder_type": bankAccountParams.account_holder_type,
                "bank_token": selected_bank_index
            };

            stripeService.updateBankDetails(data)
                .then((response) => {
                    if (response.success) {
                        $window.location.reload();
                    } else {
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: response.message,
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                    }
                }).catch(err => {
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: "Sorry something went wrong. Please try later.",
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                });

        };

        $scope.webDateRangePicker = {
            selectedDate: {
                startDate: $scope.filterDateFrom,
                endDate: $scope.filterDateTo
            },
            picker: null,
            mobilePicker: null,
            toggle() {
                // need to use $timeout here to avoid $apply errors for digest cycle
                $timeout(() => {
                    if ($scope.webDateRangePicker.mobilePicker && $scope.isMobile && $scope.isMobile.matches) {
                        $scope.webDateRangePicker.mobilePicker.toggle();
                    } else {
                        $scope.webDateRangePicker.picker.toggle();
                    }
                });
            },
            options: {
                pickerClasses: 'pa-datepicker payout-picker',
                applyButtonClasses: 'md-button pa-pink-button pa-font-bold pa-modal-font pa-height-34',
                cancelButtonClasses: 'pa-color-pink pa-modal-font',
                showCustomRangeLabel: false,
                timePicker: false,
                clearable: true,
                autoUpdateInput: true,
                opens: 'left',
                locale: {
                    applyLabel: "Done",
                    clearLabel: 'Reset',
                    separator: ' - ',
                    format: "ddd, D MMMM, YYYY",
                    "monthNames": [
                        "January",
                        "February",
                        "March",
                        "April",
                        "May",
                        "June",
                        "July",
                        "August",
                        "September",
                        "October",
                        "November",
                        "December"
                    ],
                },
                eventHandlers: {
                    'hide.daterangepicker': function(event, picker) {
                        $scope.showhide.selectdates = false;
                    },
                    'show.daterangepicker': function(event, picker) {
                        $scope.showhide.selectdates = true;
                    },
                    'apply.daterangepicker': function(event, picker) {
                        $scope.filterDateFrom = $scope.webDateRangePicker.selectedDate;
                        $scope.filterDateStart = $scope.webDateRangePicker.selectedDate.startDate;
                        $scope.filterDateTo = $scope.webDateRangePicker.selectedDate.endDate;
                        $scope.activePayoutList();
                        $scope.pendingPayoutList();
                        $scope.completePayoutList();
                    }
                }
            }
        };

        $scope.activePayoutList = function() {
            $scope.loading = true;
            let activeData = {
                start_date: moment($scope.filterDateStart).format('YYYY-MM-DD 00:00:00'),
                end_date: moment($scope.filterDateTo).format('YYYY-MM-DD 23:00:00')
            };
            userService.activeEventPayoutList(activeData).then((response) => {
                if (response.message.success) {
                    $scope.activePays = response.message.data;
                }
            }).catch((err) => {
                console.log("Active Payout", err);
            });
            applyChanges();
        };

        $scope.pendingPayoutList = function() {
            let pendingData = {
                start_date: moment($scope.filterDateStart).format('YYYY-MM-DD 00:00:00'),
                end_date: moment($scope.filterDateTo).format('YYYY-MM-DD 23:00:00')
            };
            userService.pendingEventPayoutList(pendingData).then((response) => {
                if (response.message.success) {
                    $scope.pendingPays = response.message.data;
                }
            }).catch((err) => {
                console.log("Pending Payout", err);
            });
            applyChanges();
        };

        $scope.completePayoutList = function() {
            let completeData = {
                start_date: moment($scope.filterDateStart).format('YYYY-MM-DD 00:00:00'),
                end_date: moment($scope.filterDateTo).format('YYYY-MM-DD 23:00:00')
            };
            userService.completedEventPayoutList(completeData).then((response) => {
                if (response.message.success) {
                    $scope.completePays = response.message.data;
                }
            }).catch((err) => {
                console.log("Complete Payout", err);
            }).finally(() => {
                $scope.loading = false;
            });
            applyChanges();
        };

        $scope.changeCountry = function(value) {
            angular.forEach($scope.dropdowns.payout_currency.options, function(dataValue) {
                if (value === 'US') {
                    angular.element("#selectCurrency option").removeAttr("selected");
                    angular.element("#selectCurrency option[value='string:USD']").attr("selected", "selected");
                } else {
                    angular.element("#selectCurrency option").removeAttr("selected");
                    angular.element("#selectCurrency option[value='string:GBP']").attr("selected", "selected");
                }
            });
        };

        $scope.init = function() {
            $scope.user = authService.getUser();
            $scope.getStripeAccountInfo();
            //cdoe to check payout active or not when user  edit event
            userService.getUserProfile($scope.user.user_id).then((response) => {
                if (response && 'data' in response) {
                    let user = response.data.data;
                    localStorage.setItem('user', JSON.stringify(user));
                    $scope.user.stripe_account_id = user.stripe_account_id;
                    $scope.user.stripe_country = user.stripe_country;
                    $scope.user.is_verified = user.is_verified;
                    $scope.user.charges_enabled = user.charges_enabled;
                    $scope.user.payouts_enabled = user.payouts_enabled;
                    authService.setUser($scope.user);
                }
            }).then(() => {
                //$scope.loading = true;
                userService.listingBankAccounts()
                    .then((res) => {
                        if (res && 'data' in res) {
                            $scope.userBankList = res.data;
                        }
                    }).catch((err) => {
                        console.log(err);
                    });

                $scope.activePayoutList();
                $scope.pendingPayoutList();
                $scope.completePayoutList();
                metaTagsService.setDefaultTags({
                    'title': "The Promo App | Social Event Management Network",
                    'description': "The Promo App makes social event networking and event management easier than ever before. Find events, buy and sell tickets, promote events, and more.",
                    'keywords': 'The Promo App, event management',
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

            });
        };

        $scope.close = function() {
            this.$close('close');
        };

        $scope.getStripeAccountInfo = function() {
            let base_url = window.location.origin;
            let success_url = base_url + "/stripeconnect?success=true";
            let failure_url = base_url + "/stripeconnect?success=false";

            stripeService.getStripeAccountInfo(success_url, failure_url).then((response) => {
                if (response.success) {
                    $scope.stripe_verification_status = response.stripe_verification_status;
                    $scope.stripe_message = response.message;
                    if ('link' in response) {
                        $scope.stripe_link = response.link;
                    }
                }
            }).catch(err => {
                let content = "Sorry something went wrong. Please try later.";
                if (err.data && 'message' in err.data) {
                    content = err.data.message;
                }
                let notify = {
                    type: 'error',
                    title: 'OOPS!!',
                    content: content,
                    timeout: 5000 //time in ms
                };
                $scope.$emit('notify', notify);
            });
        };

        $scope.checkStripeStatus = function() {
            let eventModelScope = $scope.$new(false, $scope);
            eventModelScope.status = $scope.stripe_verification_status;
            eventModelScope.message = $scope.stripe_message;
            eventModelScope.stripe_link = $scope.stripe_link;
            $uibModal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: '../../partials/stripeAccountStatusModel.html',
                openedClass: 'update_bank_info pa-create-event-modal add-link-modal popup_wtd_700',
                scope: eventModelScope,
                size: 'md'
            });
        };


        $scope.stripeAccountCreate = function(stripe_selected_country) {
            //$scope.saveEvent(draft);
            $scope.loading = true;
            let base_url = window.location.origin;
            let success_url = base_url + "/stripeconnect?success=true";
            let failure_url = base_url + "/stripeconnect?success=false";
            let stripe_country = '';
            if (stripe_selected_country != '') {
                stripe_country = stripe_selected_country;
            }

            stripeService.stripeAccountCreate(success_url, failure_url, stripe_country).then((response) => {
                if (response.success) {
                    if ('data' in response && 'url' in response.data) {
                        window.location.href = response.data.url;
                    }
                } else {
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: response.message,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                }
            }).catch(err => {
                let content = "Sorry something went wrong. Please try later.";
                if (err.data && 'message' in err.data) {
                    content = err.data.message;
                }
                let notify = {
                    type: 'error',
                    title: 'OOPS!!',
                    content: content,
                    timeout: 5000 //time in ms
                };
                $scope.$emit('notify', notify);
            });
        };

        $scope.init();

    }]);