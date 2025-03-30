angular.module('PromoApp')
    .controller('ScanQrController', ['$scope', '$route', '$ocLazyLoad', 'config', '$uibModal', 'authService', 'Utils', 'eventsService', 'awsService',
        function($scope, $route, $ocLazyLoad, config, $uibModal, authService, Utils, eventsService, awsService) {

            $scope.event = {};
            $scope.eventID = null;
            $scope.user = null;
            $scope.isAuthorized = false;
            $scope.scanner = null;
            $scope.showScanner = false;
            $scope.ticketsSold = 0;
            $scope.totalTickets = 0;
            $scope.ticketsCheckedIn = 0;
            $scope.ticketLastCheckedIn = {};
            $scope.userOfTicketLastCheckedIn = {};
            $scope.loading = false;
            $scope.camera = null;
            $scope.allowDeviceCopyURL = false;
            $scope.scanPageURL = window.location.href;
            $scope.URLCopied = false;

            $scope.openQrModal = function(confirmSuccessful, error) {
                let modalScope = $scope.$new(false, $scope);
                modalScope.confirmSuccessful = confirmSuccessful;
                modalScope.error = error;
                let modalInstance = $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    backdrop: 'static',
                    templateUrl: './partials/qrScanModal.html',
                    controller: 'QrScanModalController',
                    windowClass: 'pa-common-modal-style tt-scan-qr-modal',
                    scope: modalScope,
                });

                modalInstance.result.then(function(data) {
                    $scope.scanner.start($scope.camera);
                }, function() {});
            };

            $scope.$on('$locationChangeStart', function(event, next, current) {
                if ($scope.scanner) {
                    $scope.scanner.stop();
                }
            });

            let calculateMetrics = function() {
                let ticketsSold = 0,
                    totalTickets = 0;
                if ($scope.event && $scope.event.tickets_list && $scope.event.tickets_list.length > 0) {
                    for (let ticket of $scope.event.tickets_list) {
                        ticketsSold += (ticket.quantity - ticket.remaining_qty);
                        totalTickets += ticket.quantity;
                    }
                }
                $scope.ticketsSold = ticketsSold;
                $scope.totalTickets = totalTickets;
            };

            $scope.callConfirmApiAndGetDetails = function(qrcode, eventId) {
                $scope.loading = true;
                let token = authService.get('token');
                awsService.confirmTicket(token, qrcode, eventId)
                    .then((resp) => {
                        $scope.loading = false;
                        if (resp) {
                            if ("data" in resp) {
                                $scope.userOfTicketLastCheckedIn = resp.data;
                            }
                            $scope.openQrModal(resp.success, resp);
                            $scope.scanner.stop();
                        }
                    })
                    .catch((err) => {
                        $scope.loading = false;
                        let errorMessage = 'Unable to scan the ticket';
                        if ('status' in err && 'data' in err && err.data && 'message' in err.data) {
                            errorMessage = err.data;
                        }
                        $scope.openQrModal(false, errorMessage);
                        $scope.scanner.stop();
                    });
            };

            // function to encrypt data
            function encrypt(data) {
                let oHeader = {
                    alg: 'HS256',
                    typ: 'JWT'
                };
                let oPayload = data;
                let sHeader = JSON.stringify(oHeader);
                let sPayload = JSON.stringify(oPayload);
                let sJWT = KJUR.jws.JWS.sign("HS256", sHeader, sPayload, config.JWT_SECRET);
                return sJWT;
            }

            $scope.copyScanPageURL = function() {
                let copyText = document.getElementById("scanPageURL");
                copyText.select();
                document.execCommand("copy");
                $scope.URLCopied = true;
            };

            $scope.doTheScan = function() {
                setTimeout(function() {
                    $scope.scanner = new Instascan.Scanner({
                        video: document.getElementById('preview'),
                        captureImage: true,
                        backgroundScan: false,
                    });
                    $scope.scanner.addListener('scan', function(content) {
                        if (!$scope.loading) {
                            $scope.loading = true;
                            $scope.callConfirmApiAndGetDetails(content, $scope.eventID);
                        }
                    });

                    Instascan.Camera.getCameras().then(function(cameras) {
                        if (cameras.length > 0) {
                            if ((navigator.userAgent.match(/Android/i)) && (cameras.length > 1)) {
                                $scope.camera = cameras[1];
                                $scope.scanner.start(cameras[1]);
                            } else if(cameras[0].id != "") {
                                $scope.camera = cameras[0];
                                $scope.scanner.start(cameras[0]);
                            } else {
                                Utils.showError($scope, "Please, enable camera/grant camera permissions from setting of the site, and then, refresh browser.");
                            }
                            Utils.applyChanges($scope);
                        } else {
                            if (!navigator.userAgent.match(/Build/i)) {
                                Utils.showError($scope, "No cameras were found. Please, enable camera/grant camera permissions, and then, refresh browser.");
                            }
                        }
                    }).catch(function(e) {
                        console.error(e);
                        if (!navigator.userAgent.match(/Build/i)) {
                            Utils.showError($scope, "Please, enable camera/grant camera permissions, and then, refresh browser.");
                        }
                        // Show scan error modal
                    });
                }, 500);
            };

            $scope.checkUserAuthorization = () => {
                $scope.isAuthorized = false;
                $scope.showScanner = false;
                if (("_user_id" in $scope.event) && ($scope.event._user_id) && ($scope.event._user_id == $scope.user.user_id)) {
                    $scope.isAuthorized = true;
                } else if (("claimed_by" in $scope.event) && ($scope.event.claimed_by) && ($scope.event.claimed_by == $scope.user.user_id)) {
                    $scope.isAuthorized = true;
                } else if (("event_admin" in $scope.event) && ($scope.event.event_admin)) {
                    let eventAdmins = [];
                    $scope.event.event_admin = JSON.parse($scope.event.event_admin);
                    eventAdmins = ($scope.event.event_admin).map(a => a.user_id);
                    if (eventAdmins.includes($scope.user.user_id)) {
                        $scope.isAuthorized = true;
                    } else {
                        Utils.showError($scope, "You are not Authorized to perform this operation.");
                    }
                } else {
                    Utils.showError($scope, "You are not Authorized to perform this operation.");
                }
                if ($scope.isAuthorized) {
                    calculateMetrics();
                    $scope.showScanner = true;
                    Utils.applyChanges($scope);
                }
            };

            $scope.init = () => {
                /*
                 **
                 ** Lazyload JS
                 **
                 */
                $ocLazyLoad.load({
                    insertBefore: '#load_js_before',
                    files: ["js/thirdparty/instascan.min.js"]
                });
                if (navigator.userAgent.match(/Android/i) && navigator.userAgent.match(/Build/i)) {
                    $scope.allowDeviceCopyURL = true;
                    let user = JSON.parse(localStorage.getItem('user'));
                    let encryptedToken = encrypt(user);
                    $scope.scanPageURL = $scope.scanPageURL + "&token=" + encodeURIComponent(encryptedToken);
                }
                $scope.user = authService.getUser();
                if ($route.current.params && 'ev' in $route.current.params && $route.current.params.ev) {
                    $scope.eventID = $route.current.params.ev;
                    eventsService.getEventDetails($scope.eventID)
                        .then((res => {
                            if (res && 'data' in res) {
                                let data = res.data;
                                if (data.success) {
                                    $scope.event = data.data;
                                    $scope.checkUserAuthorization();
                                } else {
                                    $scope.eventID = null;
                                    Utils.showError($scope, "No such event exists");
                                }
                            } else {
                                $scope.eventID = null;
                                Utils.showError($scope, "No such event exists");
                            }
                            Utils.applyChanges($scope);
                        })).catch(err => {});
                } else {
                    Utils.showError($scope, "No such event exists");
                }
            };

            $scope.init();
        }
    ]);