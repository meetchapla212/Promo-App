angular.module('PromoApp')
    .controller('ticketTypeController', ['$route', '$scope', 'eventsService', 'Utils', '$window', 'config', 'metaTagsService', 'authService', 'apiService', '$ocLazyLoad', '$location',
        function($route, $scope, eventsService, Utils, $window, config, metaTagsService, authService, apiService, $ocLazyLoad, $location) {
            $scope.urlEventName = "";
            $scope.event = {};
            $scope.eventID = null;
            $scope.currency = "$";
            $scope.checkoutDetails = {
                price: 0,
                quantity: 0
            };
            $scope.routeToken = $route.current.params.token === undefined ? '' : $route.current.params.token;
            $scope.holdTicketList = [];
            $scope.ticketMapAvailable = [];
            $scope.activeTicketId = 0;
            $scope.selectedTicketId = 0;
            $scope.makeProceedDisabled = true;
            $scope.show_stage = false;
            $scope.layoutDetails = null;
            $scope.price_calculation = [];
            $scope.sub_total = 0.00;
            $scope.loadingMessage = "Initiating payment. Please do not refresh or reload.";
            $scope.loadingFreeMessage = "Please do not refresh or reload.";
            $scope.passwordToken = authService.get('passwordToken');
            $scope.invitedId = authService.get('invitedId');
            $scope.total_fee = 0.00;
            $scope.total_amt = 0.00;
            $scope.tiers = [];
            $scope.isDonation = false;
            $scope.ticket_details = '';
            $scope.multiTicketArr = [];
            $scope.multiTicketShow = false;
            $scope.select_ticket = '';
            /** Stripe Charges Variable scope **/
            $scope.stripeFee = 0.49;
            $scope.stripeCharge = 2.9;

            $scope.select_ticket_fn = (select_ticket) => {
                $scope.select_ticket = select_ticket;
            };
            /*
             **
             ** Save Seat Chart Object
             **
             */

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

            const saveSelectedSeatFileInLocalStorage = (file) => {
                $window.localStorage.setItem("user_selected_seat", file);
            };

            $scope.proceed = (widget) => {
                $scope.loadingMessage = $scope.event.event_type === 'free' ? $scope.loadingFreeMessage : $scope.loadingMessage;
                $scope.loading = true;
                $scope.checkoutURL = '';
                if (Object.keys($scope.layoutDetails).length > 0) {
                    $scope.show_stage = true;
                    let token = "";
                    angular.element(".tc-wrapper").css("background-image", "none");
                    if (authService.get('token')) {
                        token = authService.get('token');
                    } else {
                        token = $route.current.params.token;
                    }
                    let layout_id = $scope.layoutDetails.layout_id;
                    let data = {
                        "layout_id": layout_id,
                        "seats": $scope.holdTicketList
                    };

                    let promise = null;

                    if (widget) {
                        promise = apiService.holdSeatsWidget(data);
                    } else {
                        promise = apiService.holdSeats(token, data);
                    }

                    promise.then(response => {
                        let responsedata = response.data;
                        if (responsedata.success) {
                            let error = false;
                            for (let ticket of $scope.event.tickets) {
                                if (ticket.reserved > 0 && ticket.ticketPerOrderMinQuant && ticket.reserved < ticket.ticketPerOrderMinQuant) {
                                    Utils.showError($scope, `You need to reserve minimum ${ticket.ticketPerOrderMinQuant} tickets for ${ticket.name} to proceed.`);
                                    error = true;
                                }
                            }
                            if (error) {
                                return;
                            }
                            let totalSaleAmountVar = $scope.setTotalSaleAmount();
                            let oHeader = {
                                alg: 'HS256',
                                typ: 'JWT'
                            };
                            let oPayload = {
                                tickets: $scope.event.tickets,
                                totalSaleAmount: totalSaleAmountVar,
                                currency: $scope.currency,
                                calcuation: $scope.price_calculation,
                                sub_total: $scope.sub_total,
                                total_fee: $scope.total_fee,
                                total_amt: $scope.total_amt,
                            };

                            // Below json code for iOS App
                            $scope.ticket_details = {
                                tickets: $scope.event.tickets,
                                totalSaleAmount: totalSaleAmountVar,
                                currency: $scope.currency,
                                calcuation: $scope.price_calculation,
                                sub_total: $scope.sub_total,
                                total_fee: $scope.total_fee,
                                total_amt: $scope.total_amt,
                                image_preview: ''
                            };

                            let sHeader = JSON.stringify(oHeader);
                            let sPayload = JSON.stringify(oPayload);
                            let sJWT = KJUR.jws.JWS.sign("HS256", sHeader, sPayload, config.JWT_SECRET);
                            if (widget) {
                                $scope.checkoutURL = '/widget/signup?ev=' + $scope.eventID + '&selection=' + sJWT;
                            } else {
                                $scope.checkoutURL = '/checkout?ev=' + $scope.eventID + '&selection=' + sJWT;
                            }

                        } else {
                            if (responsedata.data.user_selected_available_seats.length > 0) {
                                let user_selected_available_seats = responsedata.data.user_selected_available_seats;
                                angular.forEach(user_selected_available_seats, function(data, index) {
                                    let seatId = data.seat_id;
                                    seatId = '#' + seatId;
                                    setTimeout(function() {
                                        $(seatId).css("background-color", '#009638');
                                    }, 1000);
                                });
                            } else if (responsedata.data.user_selected_hold_seats > 0) {
                                let user_selected_hold_seats = responsedata.data.user_selected_hold_seats;
                                angular.forEach(user_selected_hold_seats, function(data, index) {
                                    let seatId = data.seat_id;
                                    seatId = '#' + seatId;
                                    setTimeout(function() {
                                        $(seatId).css({ "background-color": '#EEEEEE', "cursor": "not-allowed", 'pointer-event': "none" });
                                    }, 1000);
                                });
                            }
                            let notify = {
                                type: 'error',
                                title: 'OOPS!!',
                                content: responsedata.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            $scope.loading = false;
                        }

                        return;
                    }).then(response => {
                        let node = document.getElementById('tc_tcwrapper_selected_seat');
                        return domtoimage.toPng(node, { quality: 1.0, });
                    }).then(function(dataUrl) {
                        return removeBlanks(dataUrl);
                    }).then((imageResponse) => {
                        saveSelectedSeatFileInLocalStorage(imageResponse);

                        // Below if condition code for iOS App
                        if ($scope.routeToken != '') {
                            let imageHTMLDOM = document.getElementById('tc_tcwrapper_selected_seat');
                            let locationOrigin = window.location.origin;
                            imageHTMLDOM = "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1,user-scalable=0'><link rel='stylesheet' type='text/css' href='" + locationOrigin + "/js/thirdparty/seating-chart/assets/style-front.css'/></head><body>" + imageHTMLDOM.innerHTML + "</body></html>";
                            $scope.ticket_details.image_preview = imageHTMLDOM;
                            $scope.ticket_details = JSON.stringify($scope.ticket_details);
                            sendToNative($scope.ticket_details);
                        }
                        if ($scope.checkoutURL != '' && $scope.routeToken === '') {
                            $window.location.href = $scope.checkoutURL;
                        }
                    }).catch((err) => {
                        let notify = {
                            type: 'error',
                            title: 'OOPS!!',
                            content: 'Sorry something went wrong. Plese try later.',
                            timeout: 5000 //time in ms
                        };
                        $scope.$emit('notify', notify);
                        $scope.loading = false;
                    }).finally(() => {
                        $scope.show_stage = false;
                        angular.element(".tc-wrapper").removeAttr("style");
                        $scope.loading = false;
                    });
                } else {

                    let error = false;
                    for (let ticket of $scope.event.tickets) {
                        if (ticket.reserved > 0 && ticket.ticketPerOrderMinQuant && ticket.reserved < ticket.ticketPerOrderMinQuant) {
                            Utils.showError($scope, `You need to reserve minimum ${ticket.ticketPerOrderMinQuant} tickets for ${ticket.name} to proceed.`);
                            error = true;
                        }
                    }
                    if (error) {
                        return;
                    }
                    let totalSaleAmountVar = $scope.setTotalSaleAmount();
                    let oHeader = {
                        alg: 'HS256',
                        typ: 'JWT'
                    };
                    let oPayload = {
                        tickets: $scope.event.tickets,
                        totalSaleAmount: totalSaleAmountVar,
                        currency: $scope.currency,
                        calcuation: $scope.price_calculation,
                        sub_total: $scope.sub_total,
                        total_fee: $scope.total_fee,
                        total_amt: $scope.total_amt
                    };
                    let sHeader = JSON.stringify(oHeader);
                    let sPayload = JSON.stringify(oPayload);
                    let sJWT = KJUR.jws.JWS.sign("HS256", sHeader, sPayload, config.JWT_SECRET);
                    if (widget) {
                        $scope.checkoutURL = '/widget/signup?ev=' + $scope.eventID + '&selection=' + sJWT;
                    } else {
                        $scope.checkoutURL = '/checkout?ev=' + $scope.eventID + '&selection=' + sJWT;
                    }

                    if ($scope.checkoutURL != '') {
                        $window.location.href = $scope.checkoutURL;
                    }
                }
            };


            $scope.setCurrency = () => {
                for (let ticket of $scope.event.tickets) {
                    ticket.more = false;
                    ticket.options = [];
                    let min = 0,
                        max = ticket.remQuantity;
                    if (ticket.ticketPerOrderMinQuant) {
                        min = ticket.ticketPerOrderMinQuant;
                    }
                    if (ticket.ticketPerOrderMaxQuant) {
                        max = ticket.ticketPerOrderMaxQuant;
                        if (ticket.ticketPerOrderMaxQuant > ticket.remQuantity) {
                            max = ticket.remQuantity;
                        }
                    }
                    for (let i = min; i <= max; i++) {
                        ticket.options.push(i);
                    }
                    if ("currency" in ticket) {
                        $scope.currency = ticket.currency;
                    }
                    ticket.showSalesStart = false;
                    ticket.showSalesEnd = false;
                    if ('saleStartDate' in ticket && ticket.saleStartDate) {
                        let salesStartDate = Utils.getStartAndDate(ticket.saleStartDate.date, ticket.saleStartDate.time);
                        if (Utils.isFutureDateEvent(salesStartDate, $scope.event.timezone)) {
                            // Check if timezone is present
                            ticket.showSalesStart = true;
                        }
                    }
                    if ('saleStartEnd' in ticket && ticket.saleStartEnd) {
                        let saleStartEnd = Utils.getStartAndDate(ticket.saleStartEnd.date, ticket.saleStartEnd.time);
                        if (Utils.isPastDateEvent(saleStartEnd, $scope.event.timezone)) {
                            // Check if timezone is present
                            ticket.showSalesEnd = true;
                            $scope.ticketMapAvailable.push(Utils.isPastDateEvent(saleStartEnd, $scope.event.timezone));
                        } else {
                            $scope.ticketMapAvailable = [false];
                        }
                    }
                }
                angular.forEach($scope.ticketMapAvailable, function(dataValue) {
                    if (dataValue) {
                        $scope.ticketMapAvailableView = true;
                    } else {
                        $scope.ticketMapAvailableView = false;
                        return false;
                    }
                });
                if ($scope.ticketMapAvailableView) {
                    angular.forEach($scope.layoutDetails.tiers, function(dataTier) {
                        angular.forEach($scope.event.tickets, function(tierId) {
                            if (dataTier.tier_id === tierId._tier_id) {
                                let tierArrayNumber = dataTier.tier_array_no;
                                tierArrayNumber = "[data-tier-target='tier-" + tierArrayNumber + "']";
                                setTimeout(function() {
                                    $(tierArrayNumber).css({ "background-color": '#EEEEEE', "cursor": "not-allowed", 'pointer-events': 'none' });
                                    $(tierArrayNumber).addClass('disabled-seat sale_end');
                                }, 1000);
                            }
                        });
                    });
                }
                $scope.setTotalSaleAmount();
            };

            $scope.setTotalSaleAmount = () => {
                let totalSaleAmount = 0.00;
                let fixedFeeCharge = false;
                let price_without_fee = 0.00;
                if ($scope.event.tickets) {
                    $scope.checkoutDetails.price = 0;
                    $scope.checkoutDetails.quantity = 0;

                    for (let ticket of $scope.event.tickets) {
                        if ("reserved" in ticket && (ticket.reserved >= 1) && "price" in ticket && !isNaN(ticket.price)) {
                            ticket.price = parseFloat(ticket.price);
                            if (ticket.price == '' || isNaN(ticket.price)) {
                                ticket.price = 0;
                            }
                            if (ticket.is_absorb == 0 && $scope.event.event_type != 'free') {
                                fixedFeeCharge = true;
                                $scope.checkoutDetails.price += ((ticket.price + (ticket.price * $scope.stripeCharge) / 100) * ticket.reserved);
                            } else {
                                $scope.checkoutDetails.price += (ticket.reserved * ticket.price);
                            }
                            $scope.checkoutDetails.quantity += ticket.reserved;
                            price_without_fee += ticket.reserved * ticket.price;
                        }
                    }

                    if (fixedFeeCharge) {
                        $scope.checkoutDetails.price = $scope.checkoutDetails.price + $scope.stripeFee;
                    }
                    $scope.checkoutDetails.price = ($scope.checkoutDetails.price).toFixed(2);
                }
                $scope.sub_total = (price_without_fee).toFixed(2);
                $scope.total_amt = $scope.checkoutDetails.price;
                $scope.total_fee = ($scope.checkoutDetails.price - price_without_fee).toFixed(2);
                return totalSaleAmount;
            };

            $scope.changeDonationValue = (ticket) => {
                ticket.reserved = 1;
                ticket.service_fee = $scope.getDonationFee(ticket.price);
                if (ticket.service_fee) {
                    $scope.handleTicketId(ticket);
                    $scope.setTotalSaleAmount();
                    applyChanges();
                }
            };

            const applyChanges = () => {
                if (!$scope.$$phase) {
                    $scope.$digest();
                }
            };

            let showModelFlag = true;
            $scope.sendToNativeToggle = () => {
                if ($scope.routeToken != '' && showModelFlag) {
                    sendToNativeToggle('true');
                    showModelFlag = false;
                } else {
                    sendToNativeToggle('false');
                    showModelFlag = true;
                }
            };

            $scope.handleTicketId = (ticket) => {
                $scope.selectedTicketId = ticket.ticket_id;
                let ticketPrice = '';
                let totalTicketPrice = '';
                let seats = [];
                if (ticket.price === undefined) {
                    ticketPrice = 0;
                    totalTicketPrice = 0;
                    ticket.price = 0;
                } else {
                    ticketPrice = ticket.price;
                    totalTicketPrice = (ticket.price * ticket.reserved);
                }
                ticket.seats = $scope.autoSeatSelectionHundler(ticket);
                let temp = {
                    ticket_id: ticket.ticket_id,
                    name: ticket.name,
                    unit_price: ticketPrice,
                    qty: ticket.reserved,
                    total_price: (totalTicketPrice).toFixed(2),
                };

                if ('seats' in ticket && (ticket.seats.length > 0)) {
                    temp.seats = ticket.seats;
                }

                if (ticket.ticket_type == "donation") {
                    temp.ticket_type = ticket.ticket_type;
                }

                if ($scope.price_calculation.length !== 0) {
                    angular.forEach($scope.price_calculation, function(p_ticket, index) {
                        if (p_ticket.ticket_id == ticket.ticket_id) {
                            $scope.price_calculation.splice(index, 1);
                        }
                    });
                }
                if ('_tier_id' in ticket) {
                    temp._tier_id = ticket._tier_id;
                    temp.tire_color = ticket.tire_color;
                }
                if (ticket.reserved > 0) {
                    $scope.price_calculation.push(temp);
                }
            };

            $scope.autoSeatSelectionHundler = (ticket) => {
                let tireInfo = $scope.getTireInfo(ticket._tier_id);
                let data_tier_target = "tier-" + tireInfo.tier_array_no;
                let mapSeat = angular.element('.tc_tier_seat');
                let startTicket = 1;
                let maxTicket = ticket.reserved;
                let seats = [];
                angular.forEach(mapSeat, function(node) {
                    let node_tire = $(node).attr('data-tier-target');
                    if (!$(node).hasClass('disabled-seat') && !$(node).hasClass('selection')) {
                        if (data_tier_target == node_tire) {
                            if (startTicket <= maxTicket) {
                                $(node).addClass('selection');
                                $(node).css({ "box-shadow": "0 0 0 3px #000000" });
                                $(node).attr("data-ticket_id", ticket.ticket_id);
                                startTicket = startTicket + 1;

                                let ticket__seat_id = $(node).attr('id');

                                let holdTicketArray = {
                                    "tier_id": ticket._tier_id,
                                    "seat_id": ticket__seat_id,
                                    "ticket_id": ticket.ticket_id
                                };
                                seats.push(ticket__seat_id);
                                $scope.holdTicketList.push(holdTicketArray);
                            } else {
                                $(node).removeClass('selection');
                                $(node).css({ "box-shadow": "none" });
                            }
                        }
                    }

                });
                return seats;
            };

            $scope.handleTicketQtyChange = (ticket, increment) => {
                ticket.reserved = ticket.reserved + increment;
                $scope.setTotalSaleAmount();
                $scope.selectedTicketId = ticket.ticket_id;
                if (ticket.reserved > 0) {
                    $scope.makeProceedDisabled = false;
                } else {
                    $scope.makeProceedDisabled = true;
                }
            };

            $scope.getDonationFee = (price) => {
                let donationFee = parseFloat(price);
                donationFee = (((donationFee * $scope.stripeCharge) / 100) * 1) + $scope.stripeFee;
                return (donationFee).toFixed(2);
            };

            $scope.getTireColor = (tire_id) => {
                let tire_color = '';
                angular.forEach($scope.tiers, function(tire) {
                    if (tire.tier_id == tire_id) {
                        tire_color = tire.color;
                    }
                });
                return tire_color;
            };

            $scope.getTireInfo = (tire_id) => {
                let tireInfo = {};
                angular.forEach($scope.tiers, function(tire) {
                    if (tire.tier_id == tire_id) {
                        tireInfo = tire;
                    }
                });
                return tireInfo;
            };

            /**
             **
             ** Open Map Function
             **
             */
            let mapHideFlag = true;
            $scope.openMap = function() {
                if (mapHideFlag) {
                    $scope.show_stage = true;
                    mapHideFlag = false;
                } else {
                    $scope.show_stage = false;
                    mapHideFlag = true;
                }
                $scope.bindClickOnSeat();
            };

            /**
             **
             ** claculate price on click seat function
             **

            */

            $scope.handleTicketSeatMap = (ticket_id, action, ticket__seat_id) => {
                let selectedTicketId = '';
                let selected_ticket = '';
                angular.forEach($scope.event.tickets, function(ticket, index) {
                    if (ticket_id == ticket.ticket_id) {
                        selectedTicketId = selectedTicketId.ticket_id;
                        selected_ticket = ticket;
                    }
                });

                let ticket = selected_ticket;
                if (action == 'add') {
                    ticket.reserved = ticket.reserved + 1;
                    ticket.seats.push(ticket__seat_id);
                } else {
                    ticket.reserved = ticket.reserved - 1;
                    let oldSeat = ticket.seats;
                    let findIndex = 0;
                    angular.forEach(oldSeat, function(seat, index) {
                        if (ticket__seat_id == seat) {
                            findIndex = index;
                        }
                    });
                    ticket.seats.splice(findIndex, 1);
                }
                $scope.selectedTicketId = selectedTicketId;
                let ticketPrice = '';
                let totalTicketPrice = '';
                if (ticket.price === undefined) {
                    ticketPrice = 0;
                    totalTicketPrice = 0;
                    ticket.price = 0;
                } else {
                    ticketPrice = ticket.price;
                    totalTicketPrice = (ticket.price * ticket.reserved);
                }
                let temp = {
                    ticket_id: ticket.ticket_id,
                    seats: ticket.seats,
                    name: ticket.name,
                    qty: ticket.reserved,
                    unit_price: ticketPrice,
                    total_price: totalTicketPrice.toFixed(2),
                };
                if ($scope.price_calculation.length !== 0) {
                    angular.forEach($scope.price_calculation, function(p_ticket, index) {
                        if (p_ticket.ticket_id == ticket.ticket_id) {
                            $scope.price_calculation.splice(index, 1);
                        }
                    });
                }
                if ('_tier_id' in ticket) {
                    temp._tier_id = ticket._tier_id;
                    temp.tire_color = ticket.tire_color;
                }
                if (ticket.reserved > 0) {
                    $scope.price_calculation.push(temp);
                }

                $scope.setTotalSaleAmount();
                $scope.$apply();
            };

            $scope.bindClickOnTicketInfoPop = function() {
                angular.element('.ticke_info_container').on('click', function(event) {
                    $(".ticke_info_container").remove();
                });
            };

            $scope.bindClickOnSeatSelectionBtn = function() {
                angular.element('.ticket-select-button').on('click', function(event) {
                    let node = $(event.target);
                    let tier_id = $(node).attr('data-tier_id');
                    let seat_id = $(node).attr('data-seat_id');
                    let ticket_id = $(node).attr('data-ticket_id');

                    let holdTicketArray = {
                        "tier_id": tier_id,
                        "seat_id": seat_id,
                        "ticket_id": ticket_id
                    };

                    $scope.holdTicketList.push(holdTicketArray);
                    $('#' + seat_id).addClass('selection');
                    $('#' + seat_id).css({ "box-shadow": "0 0 0 3px #000000" });
                    $('#' + seat_id).attr("data-ticket_id", ticket_id);
                    let action = 'add';
                    $scope.handleTicketSeatMap(ticket_id, action, seat_id);
                    $(".ticke_info_container").remove();
                });
            };

            $scope.bindClickOnSeat = function() {
                angular.element('.tc_tier_seat').on('click', function(event) {


                    let node = $(event.target);
                    let tire_id = $(node).attr('data-tier-target');
                    let ticket__seat_id = $(event.target).attr('id');
                    let res = tire_id.split("-");
                    let tier_array_no = res[1];
                    let ticketList = [];
                    angular.forEach($scope.tiers, function(tier, index) {
                        if (tier_array_no == tier.tier_array_no) {
                            ticketList = tier.tickets;
                        }
                    });

                    if (ticketList.length == 1) {
                        let action = '';
                        if ($(event.target).hasClass('selection') || $(event.target).hasClass('disabled-seat')) {
                            $(event.target).removeClass('selection');
                            $(event.target).css({ "box-shadow": "none" });
                            action = 'remove';
                        } else {
                            $(event.target).addClass('selection');
                            $(event.target).css({ "box-shadow": "0 0 0 3px #000000" });
                            action = 'add';
                        }

                        if (!$(event.target).hasClass('disabled-seat')) {
                            let tire_id = $(event.target).attr('data-tier-target');
                            let ticket__seat_id = $(event.target).attr('id');
                            let res = tire_id.split("-");
                            let tier_array_no = res[1];
                            let ticket_id = '';
                            let seat_tier_id = '';
                            angular.forEach($scope.tiers, function(tier, index) {
                                if (tier_array_no == tier.tier_array_no) {
                                    ticket_id = tier.tickets[0].ticket_id;
                                    seat_tier_id = tier.tier_id;
                                }
                            });
                            let holdTicketArray = {
                                "tier_id": seat_tier_id,
                                "seat_id": ticket__seat_id,
                                "ticket_id": ticket_id
                            };
                            $scope.holdTicketList.push(holdTicketArray);
                            $scope.handleTicketSeatMap(ticket_id, action, ticket__seat_id);
                        }
                    } else {

                        let action = '';

                        if ($(event.target).hasClass('selection') || $(event.target).hasClass('disabled-seat')) {
                            $(event.target).removeClass('selection');
                            $(event.target).css({ "box-shadow": "none" });
                            action = 'remove';
                            if (!$(event.target).hasClass('disabled-seat')) {
                                let tire_id = $(event.target).attr('data-tier-target');
                                let ticket__seat_id = $(event.target).attr('id');
                                let ticket_id = $(event.target).attr('data-ticket_id');
                                let holdTicketArray = {
                                    "tier_id": tire_id,
                                    "seat_id": ticket__seat_id,
                                    "ticket_id": ticket_id
                                };
                                $scope.holdTicketList.push(holdTicketArray);
                                $scope.handleTicketSeatMap(ticket_id, action, ticket__seat_id);
                            }
                        } else {
                            if (!$(node).hasClass('disabled-seat')) {
                                $(".ticke_info_container").remove();
                                let ticket_info_popup = '<div class="ticke_info_container">';
                                let ticket_infor_popup_body = '';
                                angular.forEach(ticketList, function(ticket, index) {
                                    ticket_infor_popup_body += '<div class="ticket-row">';
                                    ticket_infor_popup_body += '<div class="ticket-left">';
                                    ticket_infor_popup_body += '<p class="ticket-name">' + ticket.ticket_name + '</p>';
                                    ticket_infor_popup_body += '<p class="ticket-price">$' + ticket.price + '</p>';
                                    ticket_infor_popup_body += '</div>';
                                    ticket_infor_popup_body += '<div class="ticket-right">';
                                    ticket_infor_popup_body += '<button class="ticket-select-button" data-tier_id="' + tire_id + '" data-seat_id="' + ticket__seat_id + '" data-ticket_id="' + ticket.ticket_id + '" >Select</button>';
                                    ticket_infor_popup_body += '</div>';
                                    ticket_infor_popup_body += '</div>';
                                });

                                ticket_info_popup += ticket_infor_popup_body;
                                ticket_info_popup += '</div>';

                                $(node).after(ticket_info_popup);
                                $scope.bindClickOnSeatSelectionBtn();
                                $scope.bindClickOnTicketInfoPop();
                            }
                        }
                    }
                });
            };



            $scope.getRemainingQty = (tire_id) => {
                let remSeat = 0;
                angular.forEach($scope.layoutDetails.tiers, function(tire) {
                    if (tire.tier_id == tire_id) {
                        let hold_seats_count = tire.hold_seats.length;
                        let reserved_seats_count = tire.reserved_seats.length;
                        let total_book_seat = hold_seats_count + reserved_seats_count;
                        remSeat = tire.seating_capacity - total_book_seat;
                    }
                });
                return remSeat;
            };

            /**
             **
             ** Hold Ticket Array
             **
             */

            let init = function() {
                $scope.widget = false;
                let current_route = $location.path();

                if (current_route == '/widget/ticket_list') {
                    $scope.widget = true;
                }
                /*
                 **
                 ** Lazyload CSS / JS
                 **
                 */
                $ocLazyLoad.load({
                    insertBefore: '#load_js_before',
                    files: ["js/thirdparty/seating-chart/assets/js/front/jquery.documentsize.min.js",
                        "//cdnjs.cloudflare.com/ajax/libs/jquery.touch/1.1.0/jquery.touch.min.js",
                        "js/thirdparty/seating-chart/js/jquery.pan.js",
                        "js/thirdparty/seating-chart/assets/js/front/controls.js",
                        "js/thirdparty/seating-chart/assets/js/front/front.js",
                        "js/thirdparty/seating-chart/assets/js/unslider/src/js/unslider.js",
                        "js/thirdparty/seating-chart/assets/js/front/keypress-2.1.3.min.js",
                        "js/thirdparty/seating-chart/assets/js/front/tooltips.js",
                        "js/thirdparty/seating-chart/assets/js/front/common.js",
                    ],
                    cache: true
                });

                $ocLazyLoad.load({
                    insertBefore: "#load_css_before",
                    files: [
                        "js/thirdparty/seating-chart/assets/style-front.css",
                        "js/thirdparty/seating-chart/css/jquery-ui.css",
                        "js/thirdparty/seating-chart/assets/jquery.ui.rotatable.css",
                        "js/thirdparty/seating-chart/assets/js/unslider/src/scss/unslider.css"
                    ]
                });

                if ($route.current.params && 'reload' in $route.current.params) {
                    $window.location.href = '/ticket_type?ev=' + $route.current.params.ev + '&selection=' + ($route.current.params.selection);
                }

                if ($route.current.params && 'ev' in $route.current.params && $route.current.params.ev) {
                    $scope.eventID = $route.current.params.ev;
                    let data = {};
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
                    eventsService.getEventDetails($route.current.params.ev, data)
                        .then((response) => {
                            if (response.status == 200) {
                                let data = response.data;
                                if (data.success) {
                                    $scope.event = data.data;

                                    if ($scope.widget) {

                                        if ($scope.event.status == 'inactive' || $scope.event.tickets_list.length == 0) {
                                            $window.location.href = '/widget/eventdetails/' + $scope.eventID;
                                        }
                                    }

                                    $scope.layoutDetails = data.data.layout_details;

                                    if (Object.keys(data.data.layout_details).length > 0) {
                                        $scope.tiers = $scope.event.layout_details.tiers;
                                        $.get($scope.layoutDetails.front_layout_file, function(data) {
                                            $('.tc-wrapper').html(data);
                                        });
                                        angular.forEach($scope.layoutDetails.tiers, function(data, index) {
                                            angular.forEach(data.hold_seats, function(newData, index) {
                                                let seatId = newData._seat_id;
                                                seatId = '#' + seatId;
                                                setTimeout(function() {
                                                    $(seatId).css({ "background-color": '#EEEEEE', "cursor": "not-allowed", 'pointer-events': 'none' });
                                                    $(seatId).addClass('disabled-seat');
                                                }, 1000);
                                            });
                                        });
                                        angular.forEach($scope.layoutDetails.tiers, function(data, index) {
                                            angular.forEach(data.reserved_seats, function(newData, index) {
                                                let seatId = newData._seat_id;
                                                seatId = '#' + seatId;
                                                setTimeout(function() {
                                                    $(seatId).css({ "background-color": '#EEEEEE', "cursor": "not-allowed", 'pointer-events': 'none' });
                                                    $(seatId).addClass('disabled-seat');
                                                }, 2000);
                                            });
                                        });
                                    }
                                    $scope.event.tickets = [];
                                    let event_name = $scope.event.event_name.replace(/\s+/g, '-').toLowerCase();
                                    $scope.urlEventName = event_name;
                                    for (let t of $scope.event.tickets_list) {
                                        let ticket = {};
                                        let serviceFee = 0.00;
                                        ticket.ticket_id = t.ticket_id;
                                        ticket.name = t.ticket_name;
                                        ticket.currency = t.currency_code;
                                        ticket.remQuantity = t.remaining_qty;
                                        ticket.reserved = 0;
                                        ticket.is_absorb = t.is_absorb;
                                        if (!t.is_absorb && $scope.event.event_type != "free") {
                                            serviceFee = ((parseFloat(t.price) * $scope.stripeCharge) / 100) + $scope.stripeFee;
                                        }
                                        ticket.service_fee = (serviceFee).toFixed(2);
                                        ticket.ticket_type = t.ticket_type;
                                        ticket.ticket_group_id = t.ticket_group_id;

                                        ticket.ticketPerOrderMaxQuant = t.max_quant_per_order;
                                        ticket.ticketPerOrderMinQuant = t.min_quant_per_order;

                                        ticket.price = (t.price) ? parseFloat(t.price) : 0;
                                        ticket.total_price = parseFloat(t.total_price);
                                        ticket.quantity = parseFloat(t.quantity);

                                        ticket.saleStartDate = {
                                            "date": t.sale_start_date,
                                            "time": t.sale_start_time,
                                        };

                                        ticket.saleStartEnd = {
                                            "date": t.sale_end_date,
                                            "time": t.sale_end_time,
                                        };

                                        ticket.showSalesEnd = t.showSalesEnd;
                                        ticket.showSalesStart = t.showSalesStart;
                                        ticket.status = t.status;
                                        ticket._tier_id = 0;
                                        ticket.tire_color = '';
                                        ticket.seats = [];
                                        if ('_tier_id' in t) {
                                            ticket._tier_id = t._tier_id;
                                            ticket.tire_color = $scope.getTireColor(t._tier_id);
                                        }
                                        $scope.event.tickets.push(ticket);
                                    }

                                    if (Object.keys(data.data.layout_details).length > 0 && typeof $scope.tiers !== 'undefined' && $scope.event.tickets.length > $scope.tiers.length) {
                                        $scope.multiTicketShow = true;
                                        let ticket_group_id = '';
                                        let ticket_group_arr = [];
                                        let temp_ticket_group_arr = [];
                                        angular.forEach($scope.event.tickets, function(ticket, index) {
                                            if (ticket_group_id != ticket.ticket_group_id) {
                                                if (temp_ticket_group_arr.length > 0) {
                                                    ticket_group_arr.push(temp_ticket_group_arr);
                                                }
                                                temp_ticket_group_arr = [];
                                                ticket_group_id = ticket.ticket_group_id;
                                                temp_ticket_group_arr.push(ticket);
                                            } else {
                                                temp_ticket_group_arr.push(ticket);
                                            }

                                            if ($scope.event.tickets.length == (index + 1)) {
                                                ticket_group_arr.push(temp_ticket_group_arr);
                                            }

                                        });
                                        $scope.multiTicketArr = [];
                                        angular.forEach(ticket_group_arr, function(ticket_group, tg_index) {
                                            let ticket_info = {};
                                            let tire_info = [];
                                            let price_info = [];
                                            let remQuantity_info = [];
                                            let left = 0;
                                            angular.forEach(ticket_group, function(ticket, t_index) {
                                                let temp_tire_info = {
                                                    tire_color: ticket.tire_color,
                                                    tier_id: ticket._tier_id,
                                                    left: left,
                                                };
                                                left = left + 8;
                                                tire_info.push(temp_tire_info);
                                                price_info.push(ticket.price);
                                                let remQuantity = $scope.getRemainingQty(ticket._tier_id);
                                                remQuantity_info.push(remQuantity);
                                                ticket_info.name = ticket.name;
                                                ticket_info.status = ticket.status;
                                            });
                                            ticket_info.price = price_info.sort(function(a, b) { return a - b; });
                                            ticket_info.tire = tire_info;
                                            ticket_info.ticket = ticket_group;
                                            ticket_info.ticket_select = false;
                                            ticket_info.remQuantity = remQuantity_info[0];
                                            $scope.multiTicketArr.push(ticket_info);
                                        });
                                    }

                                    angular.forEach($scope.event.tickets, function(ticketType) {
                                        if (ticketType.ticket_type === "donation") {
                                            $scope.isDonation = true;
                                        }
                                    });
                                    if ("ticket_type" in $scope.event && $scope.event.ticket_type == "") {
                                        $scope.event.ticket_type = $scope.event.event_type;
                                    }

                                    if (((!$scope.event.status) || ($scope.event.status && $scope.event.status !== 'inactive')) && $scope.event.ticket_type && ($scope.event.ticket_type === 'paid' || ($scope.event.ticket_type === 'free' && $scope.event.admission_ticket_type))) {
                                        if ($route.current.params && 'selection' in $route.current.params && $route.current.params.selection) {
                                            $scope.event.tickets = (KJUR.jws.JWS.readSafeJSONString(b64utoutf8(($route.current.params.selection).split(".")[1]))).tickets;
                                            $scope.makeProceedDisabled = false;
                                        }
                                        $scope.setCurrency();
                                    } else {
                                        Utils.showError($scope, "You cannot purchase tickets for this event.");
                                        if ($scope.widget) {
                                            $window.location.href = '/widget/eventdetails/' + $scope.eventID;
                                        } else {
                                            $window.location.href = '/eventdetails/' + event_name + '/' + $scope.eventID;
                                        }

                                    }
                                }
                            } else {
                                $scope.eventID = null;
                                Utils.showError($scope, "No such event exists");
                            }
                            applyChanges();
                        }).catch((err) => {
                            console.log(err);
                        });
                } else {
                    Utils.showError($scope, "No such event exists");
                }

                $scope.windowWidth = $window.innerWidth;
                angular.element($window).bind('resize', function() {
                    $scope.windowWidth = $window.innerWidth;
                    applyChanges();
                });
                if ($scope.windowWidth < 768) {
                    setTimeout(function() {
                        angular.element(".tc-pan-wrapper").css({ 'transform': 'scale(0.5)', 'top': '0.138417px', 'left': '14.5336px' });
                    }, 4000);
                }
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
            };
            init();
        }
    ]);