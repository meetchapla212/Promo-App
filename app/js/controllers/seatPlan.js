angular.module('PromoApp')
    .controller('SeatPlanController', ['$scope', '$cookies', '$route', '$ocLazyLoad', '$uibModal', 'eventsService', 'config', 'authService', 'awsService', '$window', 'Utils', function($scope, $cookies, $route, $ocLazyLoad, $uibModal, eventsService, config, authService, awsService, $window, Utils) {
        /*
         **
         ** Global Variable
         **
         */
        $scope.loading = false;
        $scope.loadingMessage = "Seating Chart Loading....";
        $scope.eventId = $route.current.params.eventId;
        $scope.eventAction = $route.current.params.action;
        $scope.returnAction = $route.current.params.return;
        $scope.showColor = false;
        $scope.tierDisabled = true;
        $scope.enableSaveData = true;
        $scope.assignSaveData = true;
        $scope.changeLableFlag = false;
        $scope.tierGuidanceFlag = false;
        $scope.MapGuidanceFlag = true;
        $scope.tierName = "";
        $scope.venueMapName = '';
        $scope.elementCount = 0;
        $scope.elementNewCount = 0;
        $scope.onLoadSeatElement = 0;
        $scope.onLoadSeatLabel = 0;
        $scope.deleteTier = [];
        var listArray = [],
            colors = ['#FAC114', '#89B9EB', '#EE7979', '#6b6296', '#7AC56D',
                '#F5C7C4', '#00808D', '#0F5D46', '#0522D6', '#F9C28E',
                '#DD8233', '#CA2327', '#67128D', '#D600BE'
            ],
            listTierNumber = 0;
        $scope.colorTierValue = null;
        $scope.list = listArray;
        $scope.layoutId = '';
        $scope.layoutDetails = null;
        $scope.seatmap = {
            layout_thumbnail_url: '',
            front_layout_file: '',
            back_layout_file: ''
        };
        $scope.sectionRow = 5;
        $scope.rowPerSection = 10;
        $scope.columnPerSection = 10;
        $scope.perTable = 5;
        $scope.perTableSeats = 10;
        $scope.perFrom = 1;
        $scope.perTo = 10;
        $scope.perCapacity = 50;
        $scope.textSize = 25;
        $scope.titleText = "";
        $scope.listTierLength = 0;
        $scope.objectTitle = 'Exit';
        $scope.designGuidance = "";
        $scope.designChairGuidance = "";
        $scope.designObjectGuidance = "";
        $scope.designTextGuidance = "";
        $scope.tierUIGuidance = "";
        $scope.regex = /^[^`~!@#$%\^&*()_+={}|[\]\\:';"<>?,./1-9]*$/;
        const applyChanges = function() {
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        };

        /*
         **
         ** Close Modal
         **
         */
        $scope.cancel = function() {
            this.$dismiss('close');
        };

        /*
         **
         ** Add Tier
         **
         */

        $scope.addTier = function(length) {
            listTierNumber = listTierNumber + 1;
            var tierObject = {
                name: 'Tier ' + (length + 1),
                color: colors[Math.floor(Math.random() * colors.length)],
                seating_capacity: 0,
                tier_array_no: listTierNumber
            };
            $scope.list.push(tierObject);
        };

        /*
         **
         ** Remove Tier
         **
         */
        $scope.removeTier = function(index, dataTarget, id = null) {
            dataTarget = 'tier-' + dataTarget;
            angular.element('.tc_tier_seat[data-tier-target="' + dataTarget + '"]').css('background-color', '');
            angular.element('.tc_tier_seat[data-tier-target="' + dataTarget + '"]').removeAttr('data-tier-target');
            $scope.list.splice(index, 1);
            if (id != null) {
                $scope.deleteTier.push(id);
            }
            $scope.existingTierValue();
        };

        /*
         **
         ** Add Seats To Tiers
         **
         */
        $scope.existingTierValue = function() {
            var totalCountSeat = 0;
            angular.forEach($scope.list, function(listTierValue) {
                var countObject = 0,
                    countSelected = 0,
                    dataTarget = '';
                dataTarget = 'tier-' + listTierValue.tier_array_no;
                if (angular.element('.tc-object-selectable[data-tier-target="' + dataTarget + '"]').attr('data-tt-id')) {
                    countObject = angular.element('.tc-object-selectable[data-tier-target="' + dataTarget + '"]').attr('data-tt-id');
                    countObject = countObject - 1;
                }
                countSelected = angular.element('.tc_tier_seat[data-tier-target="' + dataTarget + '"]').length;
                countSelected = parseInt(countSelected) + parseInt(countObject);
                $scope.list.filter(function(pCapacity) {
                    if (pCapacity.tier_array_no == listTierValue.tier_array_no) {
                        pCapacity.seating_capacity = countSelected;
                    }
                });
                totalCountSeat = parseInt(totalCountSeat) + parseInt(countSelected);
            });
            applyChanges();
            angular.element('#pa_assigned_tier').attr('data-total-assigned', totalCountSeat);
            angular.element('#pa_assigned_tier').html(totalCountSeat);
        };

        $scope.addToTiers = function($event) {
            var color = angular.element($event.currentTarget).parent().attr('data-tt-color');
            var tierTarget = angular.element($event.currentTarget).parent().parent().parent().attr('data-tier');
            angular.element('.tc_tier_seat.ui-selected').css('background-color', color);
            angular.element('.tc_tier_seat.ui-selected').attr('data-tier-target', tierTarget);
            angular.element('.tc_tier_seat').removeClass('ui-selected');
            angular.element('.add_more_tiers .icon-add').hide();
            angular.element('.add_more_tiers .icon-remove').hide();
            angular.element('.add_more_tiers .icon-edit').removeAttr('style');
            $scope.existingTierValue();
        };

        /*
         **
         ** Tiers Sheats Color Update
         **
         */
        $scope.colorUpdate = function(color, value) {
            var tierValue = 'tier-' + value;
            angular.element('[data-tier-target="' + tierValue + '"]').css('background-color', color);
            $scope.list.filter(p => p.tier_array_no == value, function() {
                p.color = color;
            });
        };

        /*
         **
         ** Tier Title Update
         **
         */
        $scope.updateTitle = function(tierName, value) {
            $scope.list.filter(function(pName) {
                if (pName.tier_array_no == value) {
                    pName.name = tierName;
                }
            });
        };

        /*
         **
         ** Remove Seats To Tiers
         **
         */
        $scope.removeToTier = function($event) {
            if (angular.element('.tc_tier_seat.ui-selected').attr('data-tier-target')) {
                if (angular.element('.tc-object-selectable[data-tier-target]').attr('data-tt-id')) {
                    var objectValue = angular.element('.tc-object-selectable[data-tier-target]').attr('data-tt-id');
                    objectValue = objectValue - 1;
                }
                angular.element('.tc_tier_seat.ui-selected').css('background-color', '');
                angular.element('.tc_tier_seat.ui-selected').removeAttr('data-tier-target');
                angular.element('.tc_tier_seat.ui-selected').removeClass("ui-selected");
                $scope.existingTierValue();
            }
            angular.element('.add_more_tiers .icon-remove').hide();
            angular.element('.add_more_tiers .icon-add').hide();
            angular.element('.add_more_tiers .icon-edit').removeAttr('style');
        };

        /*
         **
         ** Left sidebar Accordion
         **
         */
        $scope.collapseAccordion = function(value) {
            $scope.expanded_1 = false;
            $scope.expanded_2 = false;
            $scope.expanded_3 = false;
            $scope.expanded_4 = false;
            if (value === "section") {
                $scope.expanded_1 = true;
            } else if (value === "chairs") {
                $scope.expanded_2 = true;
                $scope.chairsGuidance();
            } else if (value === "objects") {
                $scope.expanded_3 = true;
                $scope.objectGuidance();
            } else if (value === "text") {
                $scope.expanded_4 = true;
                $scope.textGuidance();
            }
        };

        /*
         **
         ** Get Event Detail
         **
         */
        let getEventDetails = function(eventID) {
            $scope.loading = true;
            eventsService.getEventDetails(eventID).then((response => {
                if (response.status == 200) {
                    $scope.loading = false;
                    let data = response.data;
                    if (data.success) {
                        $scope.eventname = data.data.event_name;
                        if (Object.keys(data.data.layout_details).length > 0) {
                            $scope.layoutDetails = data.data.layout_details;
                            $scope.venueMapName = $scope.layoutDetails.venue_map_name;
                            $scope.list = $scope.layoutDetails.tiers.map(function(item) {
                                delete item.hold_seats;
                                delete item.reserved_seats;
                                delete item.tickets;
                                delete item._layout_id;
                                return item;
                            });
                            $scope.listTierLength = $scope.list.length;
                            var arrayLastKey = $scope.list[$scope.list.length - 1];
                            if ($scope.listTierLength > 0) {
                                listTierNumber = arrayLastKey.tier_array_no * 1;
                            }
                            $("#pa_total_seat, #pa_total_seats").attr('data-total-seat', $scope.layoutDetails.total_seating_capacity);
                            $("#pa_total_seat, #pa_total_seats").html($scope.layoutDetails.total_seating_capacity);
                            $("#pa_assigned_tier").attr('data-total-assigned', $scope.layoutDetails.tiers_assigned_seats);
                            $("#pa_assigned_tier").html($scope.layoutDetails.tiers_assigned_seats);
                            $.get($scope.layoutDetails.back_layout_file, function(data) {
                                $('.tc-pan-wrapper').html(data);
                            });
                        }
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
                $scope.loading = false;
                // This console is for error identify
                console.log(err);
            }).finally(() => {
                $scope.loading = false;
            });
        };

        /*
         **
         ** Save Venue Map Modal
         **
         */
        $scope.savingMap = function() {
            let eventModelScope = $scope.$new(false, $scope);
            var total_seat = angular.element("#pa_total_seat").attr('data-total-seat'),
                totalCountSeat = angular.element("#pa_assigned_tier").attr('data-total-assigned'),
                tc_set_seat = angular.element(".tc_set_seat").length,
                tc_object_selectable = angular.element(".tc-object-selectable").attr('data-tt-id'),
                tc_set_seats = parseInt(tc_set_seat) + parseInt(tc_object_selectable),
                totalCountOfSeat = parseInt(totalCountSeat),
                saveAsDraft = true;
            if (total_seat === totalCountSeat && total_seat > 0 && totalCountSeat > 0) {
                $scope.enableSaveData = false;
            } else {
                $scope.enableSaveData = true;
            }

            if (tc_set_seat === totalCountOfSeat || tc_set_seats === totalCountOfSeat) {
                $scope.assignSaveData = false;
            } else {
                $scope.assignSaveData = true;
            }

            if (!$scope.enableSaveData && !$scope.assignSaveData) {
                saveAsDraft = false;
            } else {
                saveAsDraft = true;
            }

            let data = {
                total_seat: total_seat,
                totalCountSeat: totalCountSeat,
                enableSaveData: $scope.enableSaveData,
                assignSaveData: $scope.assignSaveData,
                saveAsADraft: saveAsDraft
            };
            eventModelScope.seatmap = data;
            $uibModal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: '../../partials/saving_map_modal.html',
                openedClass: 'pa-create-event-modal freeEventTickets savingMap scroll_popup',
                scope: eventModelScope,
                backdrop: 'static',
                keyboard: false,
                size: 'md'
            });
        };

        /*
         **
         ** Save Seat Chart Object
         **
         */

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

        function trimCanvas(c) {
            var ctx = c.getContext('2d'),
                copy = document.createElement('canvas').getContext('2d'),
                pixels = ctx.getImageData(0, 0, c.width, c.height),
                l = pixels.data.length,
                i,
                bound = {
                    top: null,
                    left: null,
                    right: null,
                    bottom: null
                },
                x, y;

            // Iterate over every pixel to find the highest
            // and where it ends on every axis ()
            for (i = 0; i < l; i += 4) {
                if (pixels.data[i + 3] !== 0) {
                    x = (i / 4) % c.width;
                    y = ~~((i / 4) / c.width);

                    if (bound.top === null) {
                        bound.top = y;
                    }

                    if (bound.left === null) {
                        bound.left = x;
                    } else if (x < bound.left) {
                        bound.left = x;
                    }

                    if (bound.right === null) {
                        bound.right = x;
                    } else if (bound.right < x) {
                        bound.right = x;
                    }

                    if (bound.bottom === null) {
                        bound.bottom = y;
                    } else if (bound.bottom < y) {
                        bound.bottom = y;
                    }
                }
            }

            // Calculate the height and width of the content
            var trimHeight = bound.bottom - bound.top,
                trimWidth = bound.right - bound.left,
                trimmed = ctx.getImageData(bound.left, bound.top, trimWidth, trimHeight);

            copy.canvas.width = trimWidth;
            copy.canvas.height = trimHeight;
            copy.putImageData(trimmed, 0, 0);

            // Return trimmed canvas
            return copy.canvas;
        }

        function removeBlanks(imageUrl) {
            return new Promise((resolve, reject) => {
                var img = new Image();
                img.crossOrigin = 'Anonymous';
                img.src = imageUrl;
                img.onload = function() {
                    var canvas = document.createElement('CANVAS');
                    var ctx = canvas.getContext('2d');
                    canvas.height = this.naturalHeight;
                    canvas.width = this.naturalWidth;
                    ctx.drawImage(this, 0, 0);
                    var trimmedCanvas = trimCanvas(canvas),
                        dataURL = trimmedCanvas.toDataURL();
                    resolve(dataURL);
                };
            });
        }

        $scope.saveSeatChartObject = function(name, isDraft) {
            $scope.loading = true;
            $scope.loadingMessage = 'Saving Seat Map Data...';
            $('.tc-wrapper').css('background-image', 'none');
            let node = document.getElementById('tc_tcwrapper');
            let promise = null;
            let data = {};
            let file = '';
            let token = authService.get('token');
            let total_seat = angular.element("#pa_total_seat").attr('data-total-seat'),
                totalCountSeat = angular.element("#pa_assigned_tier").attr('data-total-assigned'),
                backEndLayout = angular.element(".tc-pan-wrapper").html(),
                frontEndLayout = '<div class="tc-pan-wrapper" style="' + angular.element('.tc-pan-wrapper').attr('style') + '">' + backEndLayout + '</div>';

            if ($scope.eventAction === 'create') {
                data = {
                    "event_id": $scope.eventId,
                    "front_layout_file": "https://via.placeholder.com/150",
                    "back_layout_file": "https://via.placeholder.com/150",
                    "layout_thumbnail_url": "https://via.placeholder.com/150",
                    "venue_map_name": name,
                    "total_seating_capacity": parseInt(total_seat),
                    "tiers_assigned_seats": parseInt(totalCountSeat),
                    "tiers": $scope.list,
                    "is_draft": isDraft
                };
                promise = awsService.post('/seating-plan-maps/add', data, token);
            } else {
                data = {
                    "venue_map_name": name,
                    "total_seating_capacity": parseInt(total_seat),
                    "tiers_assigned_seats": parseInt(totalCountSeat),
                    "tiers": $scope.list,
                    "deleted_tier": $scope.deleteTier,
                    "is_draft": isDraft
                };
                promise = awsService.put(`/seating-plan-maps/update/${$scope.layoutDetails.layout_id}`, data, token).then((response) => {});
            }
            return promise
                .then(res => {
                    if (res && 'layout_id' in res && $scope.eventAction === 'create') {
                        $scope.layoutId = res.layout_id;
                    } else {
                        $scope.layoutId = $scope.layoutDetails.layout_id;
                    }
                    return domtoimage.toPng(node, {
                            quality: 1.0,
                        })
                        .then(function(dataUrl) {
                            return removeBlanks(dataUrl).then((imageResponse) => {
                                let blob = dataURItoBlob(imageResponse);
                                let mapThumbnailImage = 'thumbnail-' + $scope.eventId + '-seatmap.png';
                                file = new File([blob], mapThumbnailImage);
                                let aws_config = {
                                    'bucket': config.AWS_BUCKET,
                                    'access_key': config.AWS_ACCESS_KEY,
                                    'secret_key': config.AWS_SECRET_KEY,
                                    'region': config.AWS_REGION,
                                    'path': config.SEAT_MAP_UPLOAD_FOLDER,
                                    'img_show_url': config.AWS_IMG_SHOW_URL
                                };
                                return eventsService.uploadImg(file, aws_config);
                            });
                        })
                        .catch(function(error) {
                            console.error('oops, something went wrong!', error);
                        });
                }).then((response) => {
                    if (response && response.file_url) {
                        let data = {
                            layout_thumbnail_url: response.file_url,
                        };
                        awsService.put(`/seating-plan-maps/update/${$scope.layoutId}`, data, token).then((response) => {});
                    }
                    let backendFile = 'backend-' + $scope.eventId + '-seatmap.psmc';
                    file = new File([backEndLayout], backendFile);
                    let aws_config = {
                        'bucket': config.AWS_BUCKET,
                        'access_key': config.AWS_ACCESS_KEY,
                        'secret_key': config.AWS_SECRET_KEY,
                        'region': config.AWS_REGION,
                        'path': config.SEAT_MAP_UPLOAD_FOLDER,
                        'img_show_url': config.AWS_IMG_SHOW_URL
                    };
                    return eventsService.uploadImg(file, aws_config);
                }).then((response) => {
                    if (response && response.file_url) {
                        let data = {
                            back_layout_file: response.file_url,
                        };
                        awsService.put(`/seating-plan-maps/update/${$scope.layoutId}`, data, token).then((response) => {});
                    }
                    let frontendFile = 'front-' + $scope.eventId + '-seatmap.psmc';
                    file = new File([frontEndLayout], frontendFile);
                    let aws_config = {
                        'bucket': config.AWS_BUCKET,
                        'access_key': config.AWS_ACCESS_KEY,
                        'secret_key': config.AWS_SECRET_KEY,
                        'region': config.AWS_REGION,
                        'path': config.SEAT_MAP_UPLOAD_FOLDER,
                        'img_show_url': config.AWS_IMG_SHOW_URL
                    };
                    return eventsService.uploadImg(file, aws_config);
                }).then((response) => {
                    if (response && response.file_url) {
                        let data = {
                            front_layout_file: response.file_url,
                        };
                        awsService.put(`/seating-plan-maps/update/${$scope.layoutId}`, data, token).then((response) => {});
                    }
                    let notify = {
                        type: 'success',
                        title: 'Success',
                        content: "Seat Map Saved Successfully!!",
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    angular.element('.tc-wrapper').css('background-image', '');
                    $scope.elementCount = angular.element('.tc-pan-wrapper').children().length;
                    $scope.onLoadSeatElement = angular.element('.ui-selectee.tc_tier_seat').length;
                    $scope.onLoadSeatLabel = angular.element('.ui-selectee.tc_set_seat').length;
                    $scope.changeLableFlag = false;
                    Utils.applyChanges($scope);
                    $scope.loading = false;
                    if ($scope.eventAction === 'create') {
                        window.location.href = `/venueMap/${$scope.eventId}/edit`;
                        setTimeout(function() {
                            $window.location.reload();
                        }, 2000);
                    }
                }).catch((err) => {
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: err.message,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                    $scope.loading = false;
                }).finally(() => {
                    $scope.loading = false;
                    $scope.goToEdit();
                });
        };

        /*
         **
         ** Unsaved Changes Modal
         **
         */
        $scope.changeAssignFlag = function() {
            $scope.changeLableFlag = true;
        };

        $scope.unSaved = function() {
            let eventModelScope = $scope.$new(false, $scope);
            var total_seat = angular.element("#pa_total_seat").attr('data-total-seat'),
                totalCountSeat = angular.element("#pa_assigned_tier").attr('data-total-assigned'),
                totalObjectStanding = angular.element(".tc-object-selectable").attr('data-tt-id'),
                totalCountSeatAssign = parseInt(totalCountSeat);
            $scope.currentTierList = $scope.list.length;
            $scope.elementNewCount = angular.element('.tc-pan-wrapper').children().length;
            $scope.onLoadNewSeatElement = angular.element('.ui-selectee.tc_tier_seat').length;
            $scope.onLoadNewSeatLabel = angular.element('.ui-selectee.tc_set_seat').length;
            $scope.onLoadNewSeatLabel = parseInt($scope.onLoadSeatLabel) + parseInt(totalObjectStanding);
            if ((total_seat === totalCountSeat && $scope.eventAction === 'create' && $scope.elementCount === $scope.elementNewCount && $scope.listTierLength === $scope.currentTierList && $scope.onLoadSeatElement === $scope.onLoadNewSeatElement && $scope.onLoadNewSeatLabel === totalCountSeatAssign && !$scope.changeLableFlag) ||
                (total_seat === totalCountSeat && $scope.eventAction === 'edit' && $scope.elementCount === $scope.elementNewCount && $scope.listTierLength === $scope.currentTierList && $scope.onLoadSeatElement === $scope.onLoadNewSeatElement && $scope.onLoadNewSeatLabel === totalCountSeatAssign && !$scope.changeLableFlag)) {
                $scope.goToEdit();
            }

            if (((total_seat != totalCountSeat) && $scope.eventAction === 'create' || ($scope.elementCount != $scope.elementNewCount) ||
                    ($scope.listTierLength != $scope.currentTierList) || ($scope.onLoadSeatElement != $scope.onLoadNewSeatElement) ||
                    ($scope.onLoadNewSeatLabel != totalCountSeatAssign) || $scope.changeLableFlag) ||
                ((total_seat != totalCountSeat) && $scope.eventAction === 'edit' || ($scope.elementCount != $scope.elementNewCount) ||
                    ($scope.listTierLength != $scope.currentTierList) || ($scope.onLoadSeatElement != $scope.onLoadNewSeatElement) ||
                    ($scope.onLoadNewSeatLabel != totalCountSeatAssign) || $scope.changeLableFlag)) {
                $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/unsaved_map_modal.html',
                    openedClass: 'pa-create-event-modal freeEventTickets unSaved scroll_popup popup_wtd_700',
                    scope: eventModelScope,
                    size: 'md'
                });
            }
        };

        /*
         **
         ** Go To Edit Event
         **
         */
        $scope.goToEdit = function() {
            window.location.href = '/adminssionsEvent?ev=' + $scope.eventId;
            if ($scope.eventAction === 'create') {
                $cookies.put('designMap', true);
            }
        };

        /*
         **
         ** Choose seat layout Modal
         ** 
         */
        $scope.chooseSeatingLayout = function() {
            let eventModelScope = $scope.$new(false, $scope);
            $uibModal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: '../../partials/chooseSeatingLayout.html',
                openedClass: 'pa-create-event-modal chooseSeatingLayout freeEventTickets mixedSeating scroll_popup popup_wtd_700',
                scope: eventModelScope,
                backdrop: 'static',
                keyboard: false,
                size: 'md'
            });
        };

        /*
         **
         ** Temp Modal Function
         **
         */
        $scope.cartDetailModal = function() {
            let eventModelScope = $scope.$new(false, $scope);

            $uibModal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: '../../partials/cartDetailModal.html',
                openedClass: 'pa-create-event-modal freeEventTickets desktop-hide cartDetailModal scroll_popup',
                scope: eventModelScope,
                size: 'md'
            });
        };

        $scope.ticketoptionpreviewModal = function() {
            let eventModelScope = $scope.$new(false, $scope);

            $uibModal.open({
                ariaLabelledBy: 'modal-title',
                ariaDescribedBy: 'modal-body',
                templateUrl: '../../partials/ticketoptionpreviewModal.html',
                openedClass: 'pa-create-event-modal freeEventTickets popup_wtd_700 ticketoptionpreviewModal scroll_popup',
                scope: eventModelScope,
                size: 'md'
            });
        };

        /*
         **
         **  Guidance Function for All section
         **
         */

        $scope.initialGuidance = () => {
            if ($scope.designGuidance === "true") {
                //initialize instance
                var initialGuidance = new EnjoyHint({});

                //simple config.
                //Only one step - highlighting(with description) "New" button
                //hide EnjoyHint after a click on the button.
                var initialGuidance_script_steps = [{
                    "next #mapArea": 'Hello, let’s get started on designing your venue layout. <br> We’ll walk you through the process step-by-step. <br> Click “Next” to proceed.',
                    showSkip: false
                }, {
                    "next #seatType": 'First, you’ll need to choose your seating type from this dropdown menu. <br> Select “Assigned Seating” if your guests will be given a specific seat when they purchase their tickets. <br> Select “General Admission” if guests can choose any available seats when they arrive. <br> Click “Next” to proceed.',
                    showSkip: false
                }, {
                    "next #seatTypeTitle": 'Choose a name for your specific seating area. <br> It should match with the seat names displayed on your guests’ tickets. <br> Click “Next” to proceed.',
                    showSkip: false
                }, {
                    "next .tc-seat-rows-slider": 'Insert the number of rows you want to include in this seating area. <br> Click “Next” to proceed.',
                    showSkip: false
                }, {
                    "next .tc-seat-cols-slider": 'Insert the number of columns you want to include in this seating area. <br> Click “Next” to proceed.',
                    showSkip: false
                }, {
                    "click #tc_add_seats_button": 'Click “Create” to add your seating area to the venue map.',
                    showSkip: false
                }];

                //set script config
                initialGuidance.set(initialGuidance_script_steps);

                //run Enjoyhint script
                initialGuidance.run();

                $cookies.put('designGuidance', false);
                $scope.designGuidance = false;
            }
        };

        $scope.generalGuidance = () => {
            if ($scope.generalGuidanceFlag === "true") {
                //initialize instance
                var generalGuidance = new EnjoyHint({});

                //simple config.
                //Only one step - highlighting(with description) "New" button
                //hide EnjoyHint after a click on the button.
                var generalGuidance_script_steps = [{
                    "next #seatTypeTitle1": 'Choose a name for your specific seating area. <br> It should match with the seat names displayed on your guests’ tickets. <br> Click “Next” to proceed.',
                    showSkip: false
                }, {
                    "next #seatCapacity": 'Insert the number of capacity you want to include in this seating area. <br> Click “Next” to proceed.',
                    showSkip: false
                }, {
                    "next #seatColor": 'Choose your seating color to give your guests more clarity when viewing the venue map. <br> Click “Next” to proceed.',
                    showSkip: false
                }, {
                    "click #tc_add_standing_button": 'Click “Create” to add your seating area to the venue map.',
                    showSkip: false
                }];

                //set script config
                generalGuidance.set(generalGuidance_script_steps);

                //run Enjoyhint script
                generalGuidance.run();

                $cookies.put('generalGuidance', false);
                $scope.generalGuidanceFlag = false;
            }
        };

        $scope.chairsGuidance = () => {
            if ($scope.designChairGuidance === "true") {
                //initialize instance
                var chairGuidance = new EnjoyHint({});

                //simple config.
                //Only one step - highlighting(with description) "New" button
                //hide EnjoyHint after a click on the button.
                var chairGuidance_script_steps = [{
                    "next #chairTypeTitle": 'Choose a name for this seating area. Remember to make sure that it makes sense to your guests, <br> so they can find their seats easily. Click “Next” to proceed.',
                    showSkip: false
                }, {
                    "next #chairNUmberOfSeat": 'Input the number of seats you want to show in your venue map. <br> Click “Next” to proceed.',
                    showSkip: false
                }, {
                    "next #chairShapeSeat": 'Choose your table shape to give your guests a better idea of the venue layout. <br> Choosing a square table will allow you to add a specific number of ‘end seats’ to the head or foot of the table. <br> Click “Next” to proceed.',
                    showSkip: false
                }, {
                    "next #chairShapeColor": 'Choose your table color to give your guests more clarity when viewing the venue map. <br> Click “Next” to proceed.',
                    showSkip: false
                }, {
                    "click #tc_add_table_button": 'Click “Create” to add your new table.',
                    showSkip: false
                }];

                //set script config
                chairGuidance.set(chairGuidance_script_steps);

                //run Enjoyhint script
                chairGuidance.run();

                $cookies.put("designChairGuidance", false);
                $scope.designChairGuidance = false;
            }
        };

        $scope.objectGuidance = () => {
            if ($scope.designObjectGuidance === "true") {
                //initialize instance
                var objectGuidance = new EnjoyHint({});

                //simple config.
                //Only one step - highlighting(with description) "New" button
                //hide EnjoyHint after a click on the button.
                var objectGuidance_script_steps = [{
                    "next #selectIcon": 'Add objects/areas to your venue map to show guests the location of important places/features. <br> Select the most suitable icon and adjust the title of the area according to your need. <br> Click “Next” to proceed.',
                    showSkip: false
                }, {
                    "next #selectIconColor": 'You can change the icon color to fit with the design of your venue map. <br> Click “Next” to proceed.',
                    showSkip: false
                }, {
                    "next #selectIconBGColor": 'Change the background color of your icon to fit with your design needs. <br> Click “Next” to proceed.',
                    showSkip: false
                }, {
                    "click #tc_add_element_button": 'Click “Create” to add your object/area icon to your venue map.',
                    showSkip: false
                }];

                //set script config
                objectGuidance.set(objectGuidance_script_steps);

                //run Enjoyhint script
                objectGuidance.run();

                $cookies.put("designObjectGuidance", false);
                $scope.designObjectGuidance = false;
            }
        };

        $scope.textGuidance = () => {
            if ($scope.designTextGuidance === "true") {
                //initialize instance
                var textGuidance = new EnjoyHint({});

                //simple config.
                //Only one step - highlighting(with description) "New" button
                //hide EnjoyHint after a click on the button.
                var textGuidance_script_steps = [{
                    "next #textTypeTitle": 'Add helpful text prompts and descriptions to your venue map to give your guests more information. <br> Click “Next” to proceed.',
                    showSkip: false
                }, {
                    "next #textColor": 'Choose the text color you would prefer to display in your venue map. <br> Click “Next” to proceed.',
                    showSkip: false
                }, {
                    "next #textFontSize": 'Choose the font size for your information text. <br> Click “Next” to proceed.',
                    showSkip: false
                }, {
                    "click #tc_add_text_button": 'Click “Create” to add your information text to your venue map.',
                    showSkip: false
                }];

                //set script config
                textGuidance.set(textGuidance_script_steps);

                //run Enjoyhint script
                textGuidance.run();

                $cookies.put("designTextGuidance", false);
                $scope.designTextGuidance = false;
            }
        };

        $scope.tierGuidance = () => {
            if ($scope.tierUIGuidance === "true") {
                //initialize instance
                var tierGuidance = new EnjoyHint({});

                //simple config.
                //Only one step - highlighting(with description) "New" button
                //hide EnjoyHint after a click on the button.
                var tierGuidance_script_steps = [{
                    "next #addTierGuidance": 'To add a seating tier/type, click “Add Tier”. <br/> You can add multiple tiers to match your guests’ ticket types. <br/> You’ll need to add seating tiers one by one. <br/> Click “Next” to proceed.',
                    showSkip: false
                }, {
                    "next #tierManualAction": 'Hover over the tier color to view the color picker tool. Change the color of the seating tier according to your preference. <br/> To apply this color to the seats on your map, select the seat and then click the plus (+) icon which will appear in the center of the color selector. <br/> If you want to remove the color from the seats on your map, simply select them and hit the minus (-) icon which will appear in the center of the color selector. <br/> Click “Next” to proceed.',
                    showSkip: false
                }, {
                    "next #tierDelete": 'Click this to delete the tier from your list. <br/> Click “Next” to proceed.',
                    showSkip: false
                }, {
                    "next #tierSequence": 'Use this to drag and drop tiers and rearrange them in your list. <br/> Click “Next” to proceed.',
                    showSkip: false
                }, {
                    "click #tierNameCapacity": 'Change the name of your seating tier to make things clearer for your guests.',
                    showSkip: false
                }];

                //set script config
                tierGuidance.set(tierGuidance_script_steps);

                //run Enjoyhint script
                tierGuidance.run();

                $cookies.put("tierUIGuidance", false);
                $scope.tierUIGuidance = false;
            }
        };

        $scope.guidenceStartAgain = () => {
            $scope.designGuidance = 'true';
            $scope.designChairGuidance = 'true';
            $scope.designObjectGuidance = 'true';
            $scope.designTextGuidance = 'true';
            $scope.generalGuidanceFlag = 'true';
            $cookies.remove("designGuidance");
            $cookies.remove("designChairGuidance");
            $cookies.remove("designObjectGuidance");
            $cookies.remove("designTextGuidance");
            $cookies.remove('generalGuidance');
            $("#tc_seat_assign").val('assigned');
            $("#tc-seats").removeAttr("style");
            $("#tc-standing").hide();
            $scope.initialGuidance();
            $scope.collapseAccordion('section');
        };

        $scope.guidenceTierStartAgain = () => {
            $scope.tierUIGuidance = 'true';
            $cookies.remove("tierUIGuidance");
            $scope.tierGuidance();
        };

        /*
         **
         ** Init Function
         **
         */

        const init = function() {
            /*
             **
             ** Lazyload CSS / JS
             **
             */
            $ocLazyLoad.load({
                insertBefore: '#load_js_before',
                files: ["js/thirdparty/seating-chart/assets/js/pa.jquery.ui.rotatable.js",
                    "//cdnjs.cloudflare.com/ajax/libs/jquery.touch/1.1.0/jquery.touch.min.js",
                    "js/thirdparty/seating-chart/js/jquery.pan.js",
                    "js/thirdparty/seating-chart/assets/js/admin/controls.js",
                    "js/thirdparty/seating-chart/assets/js/admin/seats.js",
                    "js/thirdparty/seating-chart/assets/js/admin/text.js",
                    "js/thirdparty/seating-chart/assets/js/admin/elements.js",
                    "js/thirdparty/seating-chart/assets/js/admin/standing.js",
                    "js/thirdparty/seating-chart/assets/js/admin/tables.js",
                    "js/thirdparty/seating-chart/assets/js/unslider/src/js/unslider.js",
                    "js/thirdparty/seating-chart/assets/js/admin/keypress-2.1.3.min.js",
                    "js/thirdparty/seating-chart/assets/js/admin/settings.js",
                    "js/thirdparty/seating-chart/assets/js/admin/labels.js",
                    "js/thirdparty/seating-chart/assets/js/admin/common.js",
                    "js/thirdparty/seating-chart/assets/js/admin/tooltips.js"
                ],
                cache: true
            });

            $ocLazyLoad.load({
                insertBefore: "#load_css_before",
                files: [
                    "js/thirdparty/seating-chart/assets/style-admin.css",
                    "js/thirdparty/seating-chart/css/jquery-ui.css",
                    "js/thirdparty/seating-chart/assets/jquery.ui.rotatable.css",
                    "js/thirdparty/seating-chart/assets/js/unslider/src/scss/unslider.css",
                    "js/thirdparty/enjoyhint/enjoyhint.css"
                ]
            });

            $scope.sortableOptions = {
                update: function(e, ui) {
                    if (ui.item.sortable.model == "can't be moved") {
                        ui.item.sortable.cancel();
                    }
                },
                handle: ".draggable-item"
            };

            angular.element('body').addClass("post-type-tc_seat_charts tc-seat-chart-single");
            angular.element('html').attr('id', 'pm_tc_seat_charts');
            $scope.collapseAccordion('section');

            getEventDetails($scope.eventId);
            $scope.designGuidance = $cookies.get('designGuidance');
            $scope.designChairGuidance = $cookies.get('designChairGuidance');
            $scope.designObjectGuidance = $cookies.get('designObjectGuidance');
            $scope.designTextGuidance = $cookies.get('designTextGuidance');
            $scope.tierUIGuidance = $cookies.get("tierUIGuidance");
            $scope.generalGuidanceFlag = $cookies.get("generalGuidance");
            let getPopup = $cookies.get('designMap');
            $('body').on('click', '.pa-tabs #tab-item-1', function() {
                $scope.MapGuidanceFlag = false;
                $scope.tierGuidanceFlag = true;
                setTimeout(function() {
                    $scope.tierGuidance();
                }, 1500);
            });
            $('body').on('click', '.pa-tabs #tab-item-0', function() {
                $scope.MapGuidanceFlag = true;
                $scope.tierGuidanceFlag = false;
            });

            setTimeout(function() {
                if (getPopup === 'true' && $scope.eventAction === 'create') {
                    $scope.chooseSeatingLayout();
                }
                if ($scope.eventAction === 'edit') {
                    $('.tc-group-controls').removeAttr('style');
                }
                $("#tc_seat_assign").on('change', function() {
                    $(this).find("option:selected").each(function() {
                        var optionValue = $(this).attr("value");
                        if (optionValue == 'general') {
                            $scope.generalGuidance();
                        }
                    });
                });
            }, 3000);
            setTimeout(function() {
                $scope.elementCount = angular.element('.tc-pan-wrapper').children().length;
                $scope.onLoadSeatElement = angular.element('.ui-selectee.tc_tier_seat').length;
                $scope.onLoadSeatLabel = angular.element('.ui-selectee.tc_set_seat').length;
            }, 6000);
            setInterval(function() {
                let seatCount = angular.element('#pa_total_seat').attr('data-total-seat');
                if (seatCount > 0) {
                    $scope.tierDisabled = false;
                }
            }, 1000);
        };
        init();
    }]);