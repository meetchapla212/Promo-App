const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const utils = require('./../common/utils');
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let api_data = JSON.parse(event.body);
        let user = await utils.verifyUser(event.headers.Authorization);
        let start_date = (api_data && api_data.start_date) ? api_data.start_date : '';
        let end_date = (api_data && api_data.end_date) ? api_data.end_date : '';
        let event_type = (api_data && api_data.event_type) ? api_data.event_type : ''; // all, upcoming, past or '' / null

        // let pageNumber = (event.body && event.body.page && event.body.page > 0) ? event.body.page : 1;
        // let pageLimit = (event.body && event.body.limit && event.body.page > 0) ? event.body.limit : 10;
        // let pageoffset = (pageNumber * pageLimit) - pageLimit;

        let totalRevenue = {
            total: 0,
            web: 0,
            mobile: 0
        };
        let totalSoldTickets = {
            total: 0,
            web: 0,
            mobile: 0
        };
        let totalPageViews = {
            total: 0,
            web: 0,
            mobile: 0
        };
        let promotionByUsers = {
            total: 0,
            web: 0,
            mobile: 0
        };

        let insight = {
            averageTicketPrice: 0,
            averageOrderPrice: 0,
            ticketPerorder: 0,
            popularTimeOfPurchase: '0 am',
            currency: 'USD'
        };

        let mostPopularCity = [];
        let eventstBreakDown = [];
        // let totalEventPages = 0;
        let totalPayout = 0;
        let guestsInvited = 0;
        let totalRefund = 0;
        let totalCancellation = 0;
        let attendee = 0;
        let not_attendee = 0;
        let DateCond = '';
        let saleDateCond = '';
        let createdDateCond = '';
        let zone_id_condition = '';
        let event_id_condition = '';
        let eventStatusCond = '';

        let userTicketCond = `AND user_tickets.status = 'active'`;

        if (api_data.zone_id !== undefined && api_data.zone_id !== null && api_data.zone_id !== '' && api_data.zone_id > 0) {
            zone_id_condition = `AND _zone_id = ${api_data.zone_id}`
        }

        if (api_data.event_ids && api_data.event_ids.length > 0) {
            let event_ids = api_data.event_ids.join(",")
            if (event_ids != '') {
                event_id_condition = `AND event_master.event_id in (${event_ids})`;
            }
        }

        if (event_type == 'past') {
            eventStatusCond = `AND event_master.status = 'inactive'`
        } else if (event_type == 'upcoming') {
            eventStatusCond = `AND event_master.status = 'active'`
        } else {
            eventStatusCond = `AND (event_master.status = 'active' OR event_master.status = 'inactive' )`
        }

        let eventMasterCond = `event_master.is_deleted = 0 AND event_master.is_draft = 0
            AND event_master._user_id = ${user.id} ${eventStatusCond}`;

        if (start_date && end_date) {
            DateCond = `AND ((DATE_FORMAT(start_date_time, '%Y-%m-%d') >= '${start_date}' AND DATE_FORMAT(start_date_time, '%Y-%m-%d') <= '${end_date}' )
                OR (DATE_FORMAT(end_date_time, '%Y-%m-%d') >= '${start_date}' AND DATE_FORMAT(end_date_time, '%Y-%m-%d') <= '${end_date}' ))`
            saleDateCond = `AND ((sale_start_date >= '${start_date}' AND sale_start_date <= '${end_date}' )
                OR (sale_end_date >= '${start_date}' AND sale_end_date <= '${end_date}' ))`
            createdDateCond = `AND DATE_FORMAT(date_created, '%Y-%m-%d') >= '${start_date}' AND DATE_FORMAT(date_created, '%Y-%m-%d') <= '${end_date}'`
        }

        let totalPageViewsQuery = `SELECT
            SUM(count) as total_count,    
            SUM(CASE
                WHEN device_type = 1
                THEN count
                ELSE 0
            END) AS web_count,
            SUM(CASE
                WHEN device_type = 1
                THEN 0
                ELSE count
            END) AS mobile_count
            FROM event_visitor
            LEFT JOIN event_master
            ON (event_master.event_id = event_visitor.event_id)
            WHERE ${eventMasterCond} ${zone_id_condition} ${event_id_condition} ${DateCond} `;

        // let totalEventsQuery = `SELECT
        //     count(*) as totalEvents
        //     From event_master
        //     WHERE ${eventMasterCond} ${zone_id_condition} ${event_id_condition} ${DateCond}
        //     ORDER BY start_date_time DESC`;

        let zoneWiseEventsQuery = `SELECT
            event_id, event_image, event_name, start_date_time, end_date_time, ticket_type, status, state, country
            From event_master
            WHERE ${eventMasterCond} ${zone_id_condition} ${event_id_condition} ${DateCond}
            ORDER BY start_date_time DESC`;
        // LIMIT ${ pageoffset },${ pageLimit }`;

        let cityLimit = 5;
        let mostPopularCityQuery = `SELECT
            city, COUNT(DISTINCT(user_tickets.user_id)) as buyers
            FROM event_master
            JOIN user_tickets
            ON (event_master.event_id = user_tickets.event_id)
            WHERE ${eventMasterCond} ${zone_id_condition} ${event_id_condition}
            ${DateCond} ${userTicketCond}
            GROUP BY event_master.city
            ORDER BY buyers DESC
            LIMIT ${cityLimit}`;

        let SoldTicketsQuery = `SELECT
            SUM(ticket_qty) as total_count,
            SUM(CASE 
                WHEN device_type = 1
                THEN ticket_qty
                ELSE 0
            END) AS web_count,
            SUM(CASE 
                WHEN device_type = 2
                THEN ticket_qty
                ELSE 0
            END) AS mobile_count
            FROM user_tickets
            LEFT JOIN event_master
            ON (event_master.event_id = user_tickets.event_id)
            WHERE ${eventMasterCond} ${zone_id_condition} ${event_id_condition} ${DateCond} 
            ${userTicketCond}`;

        let ticket_details_statusQuery = `SELECT 
            SUM(CASE 
                WHEN ticket_details_status != 'cancel' AND ticket_details_status != 'refunded'
                THEN ticket_price
                ELSE 0
            END) AS totalRevenue,
            SUM(CASE 
                WHEN ticket_details_status != 'cancel' AND ticket_details_status != 'refunded' AND device_type = 1
                THEN ticket_price
                ELSE 0
            END) AS totalWebRevenue,
            SUM(CASE 
                WHEN ticket_details_status != 'cancel' AND ticket_details_status != 'refunded' AND device_type = 2
                THEN ticket_price
                ELSE 0
            END) AS totalMobileRevenue,
            SUM(CASE 
                WHEN ticket_details_status = 'cancel'
                THEN ticket_price
                ELSE 0
            END) AS totalCancellation,
            SUM(CASE 
                WHEN ticket_details_status = 'refunded'
                THEN ticket_price
                ELSE 0
            END) AS totalRefund
            FROM user_tickets
            JOIN event_master 
            ON (event_master.event_id = user_tickets.event_id)
            WHERE ${eventMasterCond} ${zone_id_condition} ${event_id_condition} ${DateCond}
            AND user_tickets.is_deleted = 0`;

        let promotionByUsersQuery = `SELECT
            count(*) as total_count,
            SUM(CASE
                WHEN device_type = 'web'
                THEN 1
                ELSE 0
            END) AS web_count,
            SUM(CASE
                WHEN device_type = 'web'
                THEN 0
                ELSE 1
            END) AS mobile_count
            FROM social_shared_master
            JOIN reward_master
            ON social_shared_master._reward_id = reward_master.reward_id
            JOIN event_master 
            ON (event_master.event_id = reward_master._event_id)
            WHERE ${eventMasterCond} ${zone_id_condition} ${event_id_condition} ${DateCond}`;

        let guestsInvitedQuery = `SELECT
            count(*) as guestsInvited
            FROM guest_users
            JOIN event_master 
            ON (event_master.event_id = guest_users._event_id)
            WHERE ${eventMasterCond} ${zone_id_condition} ${event_id_condition} ${DateCond} `;

        let attendeeQuery = `SELECT
            SUM(CASE 
                WHEN user_ticket_details.checkedin_at > 0 
                THEN user_ticket_details.qty
                ELSE 0 
            END) AS attendee,
            SUM(CASE 
                WHEN user_ticket_details.checkedin_at > 0
                THEN 0
                ELSE user_ticket_details.qty 
            END) AS not_attendee
            FROM user_ticket_details
            JOIN user_tickets 
            ON (user_ticket_details._purchased_ticket_id = user_tickets.id)
            JOIN event_master 
            ON (event_master.event_id = user_tickets.event_id)
            WHERE ${eventMasterCond} ${zone_id_condition} ${event_id_condition} ${DateCond}
            ${userTicketCond} AND user_ticket_details.ticket_details_status != 'cancel'
            AND user_ticket_details.ticket_details_status != 'refunded'`;

        let insightQuery = `SELECT
            SUM(price*quantity) / SUM(quantity) as averageTicketPrice
            FROM event_tickets
            JOIN event_master 
            ON (event_master.event_id = event_tickets._event_id)
            WHERE ${eventMasterCond} ${zone_id_condition} ${event_id_condition} ${saleDateCond}
            AND event_tickets.is_deleted = 0`

        let insightQuery2 = `SELECT 
            AVG(SUBSTRING(user_tickets.date_created, 12, 2)) as popularTimeOfPurchase,
            AVG(ticket_qty) as ticketPerorder,
            sum(payout_amount) as totalPayout,
            AVG(total_amount) as averageOrderPrice
            FROM user_tickets
            JOIN event_master ON (event_master.event_id = user_tickets.event_id)
            WHERE ${eventMasterCond} ${zone_id_condition} ${event_id_condition} ${DateCond} ${userTicketCond}`

        mostPopularCity = await MDBObject.runQuery(mostPopularCityQuery);
        
        await MDBObject.runQuery(totalPageViewsQuery).then(async data => {
            if (data && data[0] && data[0].web_count) {
                totalPageViews.web = Number(data[0].web_count).toFixed(2);
            }
            if (data && data[0] && data[0].mobile_count) {
                totalPageViews.mobile = Number(data[0].mobile_count).toFixed(2);
            }
            if (data && data[0] && data[0].total_count) {
                totalPageViews.total = Number(data[0].total_count).toFixed(2)
            }
        })

        await MDBObject.runQuery(insightQuery).then(async (data) => {
            if (data && data[0] && data[0].averageTicketPrice) {
                insight.averageTicketPrice = Number(data[0].averageTicketPrice).toFixed(2);
            }
        })

        await MDBObject.runQuery(insightQuery2).then(async (data) => {
            if (data && data[0]) {
                if (data[0].averageOrderPrice) {
                    insight.averageOrderPrice = Number(data[0].averageOrderPrice).toFixed(2)
                }
                if (data[0].ticketPerorder) {
                    insight.ticketPerorder = Number(data[0].ticketPerorder).toFixed(2);
                }
                if (data[0].popularTimeOfPurchase && Number(data[0].popularTimeOfPurchase) == 12) {
                    insight.popularTimeOfPurchase = Math.ceil(Number(data[0].popularTimeOfPurchase)).toFixed() + ' pm';
                } else if (data[0].popularTimeOfPurchase && Number(data[0].popularTimeOfPurchase) >= 12) {
                    insight.popularTimeOfPurchase = Math.ceil(Number(data[0].popularTimeOfPurchase)).toFixed() + ' pm';
                } else {
                    insight.popularTimeOfPurchase = Math.ceil(Number(data[0].popularTimeOfPurchase)).toFixed() + ' am';
                }
                if (data[0].totalPayout) {
                    totalPayout = Number(data[0].totalPayout).toFixed(2)
                }
            }
        })

        await MDBObject.runQuery(ticket_details_statusQuery).then(async (data) => {
            if (data && data[0] && data[0].totalRevenue) {
                totalRevenue.total = Number(data[0].totalRevenue).toFixed(2);
            }
            if (data && data[0] && data[0].totalWebRevenue) {
                totalRevenue.web = Number(data[0].totalWebRevenue).toFixed(2);
            }
            if (data && data[0] && data[0].totalMobileRevenue) {
                totalRevenue.mobile = Number(data[0].totalMobileRevenue).toFixed(2);
            }
            if (data && data[0] && data[0].totalRefund) {
                totalRefund = Number(data[0].totalRefund).toFixed(2);
            }
            if (data && data[0] && data[0].totalCancellation) {
                totalCancellation = Number(data[0].totalCancellation).toFixed(2);
            }
        })

        await MDBObject.runQuery(SoldTicketsQuery).then(async (data) => {
            if (data && data[0] && data[0].web_count) {
                totalSoldTickets.web = Number(data[0].web_count);
            }
            if (data && data[0] && data[0].mobile_count) {
                totalSoldTickets.mobile = Number(data[0].mobile_count);
            }
            if (data && data[0] && data[0].total_count) {
                totalSoldTickets.total = Number(data[0].total_count);
            }

        });

        await MDBObject.runQuery(promotionByUsersQuery).then(async data => {
            if (data && data[0] && data[0].web_count) {
                promotionByUsers.web = Number(data[0].web_count);
            }
            if (data && data[0] && data[0].mobile_count) {
                promotionByUsers.mobile = Number(data[0].mobile_count);
            }
            if (data && data[0] && data[0].total_count) {
                promotionByUsers.total = Number(data[0].total_count).toFixed(2);
            }
        })

        await MDBObject.runQuery(guestsInvitedQuery).then(async (data) => {
            if (data && data[0] && data[0].guestsInvited) {
                guestsInvited = Number(data[0].guestsInvited).toFixed(2)
            }
        })

        await MDBObject.runQuery(attendeeQuery).then(async (data) => {
            if (data && data[0] && data[0].attendee) {
                attendee = Number(data[0].attendee).toFixed(2)
            }
            if (data && data[0] && data[0].not_attendee) {
                not_attendee = Number(data[0].not_attendee).toFixed(2)
            }
        })

        // await MDBObject.runQuery(totalEventsQuery).then(async (data) => {
        //     if(data && data[0] && data[0].totalEvents){
        //         totalEventPages = Math.ceil(Number(data[0].totalEvents)/pageLimit);
        //     }
        // })

        await MDBObject.runQuery(zoneWiseEventsQuery).then(async (eventsData) => {
            await Promise.all(
                eventsData.map(async eventDetail => {
                    let totalTicketQuery = `SELECT 
                        event_tickets.currency_code,
                        SUM(event_tickets.quantity) as total_tickets,
                        SUM(event_tickets.remaining_qty) as total_available_tickets,
                        SUM(event_tickets.quantity - event_tickets.remaining_qty) as total_sold_tickets,
                        AVG(CASE 
                            WHEN CURDATE() <= event_tickets.sale_end_date AND DATEDIFF(event_tickets.sale_end_date, event_tickets.sale_start_date) > 0 AND DATEDIFF(event_tickets.sale_start_date, CURDATE()) > 0
                            THEN (DATEDIFF(sale_end_date,sale_start_date)*(quantity-remaining_qty)*100)/(DATEDIFF(CURDATE(),sale_start_date)*quantity)-100
                            ELSE (((event_tickets.quantity-event_tickets.remaining_qty)* 100/ event_tickets.quantity) * 100 ) / 100 - 100
                        END) AS avgSaleRatio,
                        SUM((event_tickets.quantity - event_tickets.remaining_qty)* event_tickets.price) as net_sales
                        FROM event_tickets
                        WHERE _event_id = ${eventDetail.event_id} ${saleDateCond} AND event_tickets.is_deleted = 0`;

                    let ticketBreakDownQuery = `SELECT 
                        ticket_id, ticket_name, ticket_type, quantity as total_ticket,
                        remaining_qty as total_available_tickets, (quantity - remaining_qty) as total_sold_tickets, 
                        (CASE 
                            WHEN CURDATE() <= sale_end_date AND DATEDIFF(sale_end_date, sale_start_date) > 0 AND DATEDIFF(sale_start_date, CURDATE()) > 0
                            THEN (DATEDIFF(sale_end_date,sale_start_date)*(quantity-remaining_qty)*100)/(DATEDIFF(CURDATE(),sale_start_date)*quantity)-100
                            ELSE (((quantity-remaining_qty)* 100/ quantity) * 100 ) / 100 - 100
                        END) AS SaleRatio,
                        (quantity - remaining_qty)* price  as net_sales
                        FROM event_tickets
                        WHERE _event_id = ${eventDetail.event_id} ${saleDateCond} AND event_tickets.is_deleted = 0
                        ORDER BY ticket_id`

                    let timeLineQuery = `SELECT
                        SUM(ticket_price) as y,
                        SUBSTRING(user_tickets.date_created, 1, 10) as t
                        FROM user_tickets
                        WHERE status = 'active' AND event_id = ${eventDetail.event_id} ${createdDateCond}
                        group by t`

                    let timeLines = await MDBObject.runQuery(timeLineQuery);
                    timeLines = JSON.parse(JSON.stringify(timeLines))

                    const dateFormatDB = "YYYY-MM-DD";
                    const moment = require('moment');
                    let startDate = moment(new Date(start_date)).format(dateFormatDB)
                    let endDate = moment(new Date(end_date)).format(dateFormatDB);

                    let timeLine = [];
                    if (startDate && endDate) {
                        while (startDate <= endDate) {
                            let index = timeLines.findIndex((x) => x.t == startDate);
                            if (index > -1) {
                                timeLine.push(timeLines[index]);
                            } else {
                                timeLine.push({
                                    y: 0,
                                    t: startDate
                                });
                            }

                            startDate = new Date(startDate);
                            startDate.setDate(startDate.getDate() + 1);
                            startDate = moment(startDate).format(dateFormatDB)
                        }
                    }

                    let totalTicket = {
                        net_sales: 0,
                        total_tickets: 0,
                        currency_code: 'USD',
                        total_tickets: 0,
                        total_sold_tickets: 0,
                        total_available_tickets: 0,
                        avgSaleRatio: 0
                    };

                    await MDBObject.runQuery(totalTicketQuery).then(async (data) => {
                        if (data && data[0] && data[0].total_tickets) {
                            totalTicket.total_tickets = Number(data[0].total_tickets).toFixed()
                        }
                        if (data && data[0] && data[0].total_available_tickets) {
                            totalTicket.total_available_tickets = Number(data[0].total_available_tickets).toFixed()
                        }
                        if (data && data[0] && data[0].total_sold_tickets) {
                            totalTicket.total_sold_tickets = Number(data[0].total_sold_tickets).toFixed()
                        }
                        if (data && data[0] && data[0].avgSaleRatio) {
                            totalTicket.avgSaleRatio = Number(data[0].avgSaleRatio).toFixed(2)
                        }
                        if (data && data[0] && data[0].net_sales) {
                            totalTicket.net_sales = Number(data[0].net_sales).toFixed(2)
                        }
                        if (data && data[0] && data[0].currency_code) {
                            totalTicket.currency_code = data[0].currency_code
                        }
                    })

                    let ticketBreakDown = await MDBObject.runQuery(ticketBreakDownQuery);
                    let randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16);

                    eventstBreakDown.push({
                        event_id: eventDetail.event_id,
                        event_name: eventDetail.event_name,
                        event_image: eventDetail.event_image,
                        status: eventDetail.status,
                        color: randomColor,
                        start_date_time: eventDetail.start_date_time,
                        end_date_time: eventDetail.end_date_time,
                        ticket_type: eventDetail.ticket_type,
                        state: eventDetail.state,
                        country: eventDetail.country,
                        net_sales: totalTicket.net_sales,
                        currency_code: totalTicket.currency_code,
                        total_tickets: totalTicket.total_tickets,
                        total_sold_tickets: totalTicket.total_sold_tickets,
                        total_available_tickets: totalTicket.total_available_tickets,
                        avgSaleRatio: totalTicket.avgSaleRatio,
                        ticketBreakDown: ticketBreakDown,
                        timeLine: timeLine,
                    })
                })
            )
        })

        response = {
            success: true,
            message: successMessages.GET_EVENT_ANALYTICS,
            data: {
                // totalEventPages,
                totalRevenue,
                totalSoldTickets,
                totalPageViews,
                attendee,
                not_attendee,
                eventstBreakDown,
                totalPayout,
                guestsInvited,
                totalRefund,
                totalCancellation,
                mostPopularCity,
                promotionByUsers,
                insight
            }
        }
        return awsRequestHelper.respondWithJsonBody(200, response);
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};