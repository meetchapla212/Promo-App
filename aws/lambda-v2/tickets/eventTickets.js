"use strict";
const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        await utils.verifyUser(event.headers.Authorization);
        let eventId = event.pathParameters.event_id;
        let ticketsStatus = (event.queryStringParameters && event.queryStringParameters.ticket_status) ? event.queryStringParameters.ticket_status.toLowerCase() : "all";
        let orderStatus = (event.queryStringParameters && event.queryStringParameters.order_status) ? event.queryStringParameters.order_status.toLowerCase() : "all";
        let checkStatus = (event.queryStringParameters && event.queryStringParameters.checkin_status) ? event.queryStringParameters.checkin_status.toLowerCase() : "all";

        let responseEventDetails = {}

        // await DBManager.getData('event_master', '*', { event_id: eventId, status: 'active' }).then(async responseEvent => {
        await DBManager.runQuery(`SELECT * FROM event_master where event_id = ${eventId} AND (status = 'active' OR status = 'inactive' OR status = 'cancel' )`).then(async (responseEvent) => {
            if (responseEvent.length > 0) {
                responseEventDetails.event_details = responseEvent[0];
                let administrator = await DBManager.runQuery('SELECT event_administrator.administrator_id,event_administrator._user_id as user_id,user_master.username,user_master.email FROM event_administrator JOIN user_master ON user_master.user_id = event_administrator._user_id  WHERE event_administrator._event_id = ' + eventId);
                responseEventDetails.event_details.event_admin = JSON.stringify(administrator);

                if (responseEvent[0].bank_id != '') {
                    await DBManager.getData('user_bank_info', '*', { bank_id: responseEvent[0].bank_id }).then(async bnkRes => {
                        responseEventDetails.event_details.bank_info = bnkRes[0];

                        // SELECT * FROM event_master WHERE bank_id = ${responseEvent[0].bank_id} and event_id = ${eventId}
                        await DBManager.runQuery(`SELECT * FROM event_master WHERE bank_id = ${responseEvent[0].bank_id} and event_id != ${eventId}`).then(eventCount => {
                            responseEventDetails.event_details.bank_info.event_total = eventCount.length;
                        })
                    })
                } else {
                    responseEventDetails.event_details.bank_info = {}
                }

                responseEventDetails.event_details.layout_details = {};
                var fieldsObj = "layout_id, _event_id, _user_id, front_layout_file, back_layout_file, layout_thumbnail_url, is_draft, venue_map_name, total_seating_capacity, tiers_assigned_seats";
                var whereQry = { _event_id: eventId };
                await DBManager.getData("seat_layout_master", fieldsObj, whereQry).then(async (seatingPlanDetails) => {
                    if (seatingPlanDetails.length > 0) {
                        responseEventDetails.event_details.layout_details = seatingPlanDetails[0];
                        responseEventDetails.event_details.layout_details.total_sold_tier_seats = 0;
                        responseEventDetails.event_details.layout_details.tiers = [];
                        //get seating layout tier details
                        let fieldsObj = "seat_tier_master.tier_id, seat_tier_master._layout_id, seat_tier_master.name, seat_tier_master.color, seat_tier_master.seating_capacity, seat_tier_master.tier_array_no";
                        let sitePlanTires = await DBManager.getJoinedData("seat_layout_master", "seat_tier_master", "layout_id", "_layout_id", fieldsObj, { layout_id: responseEventDetails.event_details.layout_details.layout_id });

                        if (sitePlanTires.length > 0) {
                            var getTierTicketsQuery = { _event_id: eventId }
                            var layoutAllTickets = await DBManager.getData("event_tickets", "*", getTierTicketsQuery);

                            // var getTireReservedSeatsQuery = { _layout_id: responseEventDetails.event_details.layout_details.layout_id, is_deleted: 0, status: 'active' };
                            // var layoutAllReservedSeats = await DBManager.getData("user_ticket_details", "_tier_id, _ticket_id, _seat_id", getTireReservedSeatsQuery, "AND");
                            var layoutAllReservedSeats = await DBManager.runQuery(`SELECT user_ticket_details._tier_id, user_ticket_details._ticket_id, user_ticket_details._seat_id FROM user_ticket_details JOIN user_tickets ON user_ticket_details._purchased_ticket_id = user_tickets.id AND user_tickets.event_status = 'approved' WHERE user_ticket_details._layout_id = ${responseEventDetails.event_details.layout_details.layout_id} AND user_ticket_details.is_deleted = 0 AND user_ticket_details.status = 'active'`);

                            var getTierHoldSeatsQuery = { _layout_id: responseEventDetails.event_details.layout_details.layout_id, is_deleted: 0 }
                            var layoutAllHoldSeats = await DBManager.getData("seat_holding_master", "_tier_id, _ticket_id, _seat_id", getTierHoldSeatsQuery, "AND");

                            await Promise.all(sitePlanTires.map((tire) => {
                                var tierTickets = layoutAllTickets.filter((ticket) => ticket._tier_id === tire.tier_id);
                                tire['tickets'] = tierTickets;

                                var tierReservedSeats = layoutAllReservedSeats.filter((seat) => seat._tier_id === tire.tier_id);
                                tire['reserved_seats'] = tierReservedSeats;
                                responseEventDetails.event_details.layout_details.total_sold_tier_seats = (responseEventDetails.event_details.layout_details.total_sold_tier_seats * 1) + (tierReservedSeats.length);

                                var tierHoldSeats = layoutAllHoldSeats.filter((seat) => seat._tier_id === tire.tier_id);
                                tire['hold_seats'] = tierHoldSeats;

                                return tire;
                            })).then((tireDetails) => {
                                responseEventDetails.event_details.layout_details.tiers = tireDetails;
                            })
                        }
                    }
                })

            } else {
                throw new Error(errorMessages.EVENT_NOT_FOUND)
            }
        })
        let discountQuery = `SELECT * FROM promo_codes where FIND_IN_SET(${eventId},promo_codes.event_id) > 0 
        union
        select * from promo_codes where multi_event_code = 1 and all_events_tickets_access = 1`
        await DBManager.runQuery(discountQuery).then(async (codeData) => {
            if (codeData && codeData.length > 0) {
                await Promise.all(codeData.map(async (codeDetails) => {
                    codeDetails.multi_event_code = codeDetails.multi_event_code ? codeDetails.multi_event_code == 1 ? true : false : ''
                    codeDetails.all_events_tickets_access = codeDetails.all_events_tickets_access ? codeDetails.all_events_tickets_access == 1 ? true : false : ''

                    codeDetails.event_id = codeDetails.event_id ? codeDetails.event_id.split(',').map(Number) : [];
                   
                }))
                responseEventDetails.discount_details = codeData;
            }
        });
        
        await DBManager.getData('event_tickets', '*', { _event_id: eventId }).then(resTicket => {
            responseEventDetails.ticket_details = resTicket;
        })
        if (responseEventDetails.ticket_details.length > 0) {

            let ticketCountQuery = `SELECT SUM(quantity) as total_tickets , SUM(remaining_qty) as remaining_tickets ,(SUM(quantity) - SUM(remaining_qty)) as sold_tickets FROM  event_tickets WHERE _event_id = ${eventId} AND is_deleted = 0 `;
            await DBManager.runQuery(ticketCountQuery).then(tcktCntRes => {
                responseEventDetails.ticket_counts = tcktCntRes[0]
            });

            let ScanTicketQuery = `SELECT count(*) as checked_in_count FROM user_tickets JOIN user_ticket_details ON user_tickets.id = user_ticket_details._purchased_ticket_id where user_tickets.event_id = ${eventId} and user_ticket_details.checkedin_at != ''`;
            console.log('ScanTicketQuery', ScanTicketQuery)

            await DBManager.runQuery(ScanTicketQuery).then(scnTckCnt => {
                responseEventDetails.ticket_counts.scan_tickets = scnTckCnt[0].checked_in_count
            })

            // let orderStatusWhere = { event_id: eventId };
            let orderStatusWhere = '';
            let TicketStatusWhere = '';
            let checkInWhere = '';

            if (orderStatus != 'all') {
                // orderStatusWhere.ticket_details_status = orderStatus;
                orderStatusWhere = ' AND user_tickets.ticket_details_status = "' + orderStatus + '"';
            }
            if (ticketsStatus != 'all') {
                // orderStatusWhere._ticket_id = ticketsStatus;
                TicketStatusWhere = ' AND user_ticket_details._ticket_id = +' + ticketsStatus;
            }
            if (checkStatus != 'all') {
                // orderStatusWhere._ticket_id = ticketsStatus;
                let checkInValue = checkStatus == 'pending' ? ' = "" ' : ' != ""';
                checkInWhere = ' AND user_ticket_details.checkedin_at ' + checkInValue;
            }
            // SELECT user_tickets.* FROM user_tickets INNER JOIN user_ticket_details ON user_tickets.id = user_ticket_details._purchased_ticket_id where user_tickets.event_id = 23306 AND user_ticket_details._ticket_id = 243 GROUP BY _ticket_id
            let eventQuery = `SELECT user_tickets.* FROM user_tickets INNER JOIN user_ticket_details ON user_tickets.id = user_ticket_details._purchased_ticket_id where user_tickets.event_id = ${eventId}${orderStatusWhere}${TicketStatusWhere}${checkInWhere} GROUP BY _purchased_ticket_id`;
            // responseEventDetails.ticket_list = {};
            // await DBManager.getData('user_tickets', '*', orderStatusWhere).then(async userResTck => {
            console.log('run queyr event=========================', eventQuery)
            await DBManager.runQuery(eventQuery).then(async userResTck => {
                responseEventDetails.ticket_list = userResTck;
                await Promise.all(
                    responseEventDetails.ticket_list.map(async ticketsArray => {
                        await DBManager.getData('user_master', 'username,email, first_name, last_name, quickblox_id', { user_id: ticketsArray.user_id }).then(userRes => {
                            ticketsArray.user_info = userRes[0]
                        });

                        let ticketDetails = 'SELECT count(*) as qty , sum(user_ticket_details.price) as total_price,_ticket_id,event_tickets.ticket_name,user_ticket_details.date_created as purchased_on FROM `user_ticket_details` JOIN event_tickets ON event_tickets.ticket_id = user_ticket_details._ticket_id WHERE _purchased_ticket_id = ' + ticketsArray.id + ' AND event_tickets.is_deleted = 0 ' +
                            TicketStatusWhere + ' ' + checkInWhere + ' GROUP BY _ticket_id';

                        await DBManager.runQuery(ticketDetails).then(tcktDetails => {
                            ticketsArray.ticket_details = tcktDetails;
                        })

                        let checkInQuery = `SELECT
                            details_id, checkedin_at, user_master.username, user_master.first_name, user_master.last_name, user_master.email
                            FROM user_ticket_details
                            LEFT JOIN user_master
                            ON (user_ticket_details.checked_by_user_id = user_master.user_id)
                            WHERE _purchased_ticket_id = ${ticketsArray.id} AND checkedin_at != ""`;
                        await DBManager.runQuery(checkInQuery).then(checkinDetails => {
                            ticketsArray.checkIn_details = checkinDetails
                        })

                        let checkInQry = 'SELECT count(*) as checked_in FROM `user_ticket_details` WHERE _purchased_ticket_id = ' + ticketsArray.id + ' AND checkedin_at != "" GROUP BY _ticket_id';
                        await DBManager.runQuery(checkInQry).then(tcktChckIn => {
                            ticketsArray.checkedIn_count = tcktChckIn.length > 0 ? tcktChckIn[0].checked_in : 0;
                        })
                    })
                )
            })
        }

        response = { success: true, message: successMessages.GET_INSIDE_EVENT, data: responseEventDetails }
        return awsRequestHelper.respondWithJsonBody(200, response);
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}