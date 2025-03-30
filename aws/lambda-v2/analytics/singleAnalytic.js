const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const utils = require('./../common/utils');
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let api_data = JSON.parse(event.body);
        if (api_data && api_data.event_id && api_data.event_id != '') {

            let eventMasterCond = `event_master.event_id = ${api_data.event_id} AND event_master.is_deleted = 0`;

            let eventDetailQuery = `SELECT
                event_master.event_id, event_master.event_image, event_master.event_name, event_master.start_date_time, event_master.end_date_time, event_master.ticket_type, event_master.status, event_master.date_created,
                event_master._user_id as event_master_user_id, event_administrator._user_id as event_administrator_user_id
                From event_master
                LEFT JOIN event_administrator
                ON (event_master.event_id = event_administrator._event_id)
                WHERE ${eventMasterCond}`;

            await MDBObject.runQuery(eventDetailQuery).then(async (eventsData) => {
                if (eventsData && eventsData.length) {
                    let eventDetail = eventsData[0];

                    if (eventDetail && ((eventDetail.event_master_user_id && eventDetail.event_master_user_id == user.id) || (eventDetail.event_administrator_user_id && eventDetail.event_administrator_user_id == user.id))) {

                        const dateFormatDB = "YYYY-MM-DD";
                        const moment = require('moment');

                        let ticketDetailsQuery = `SELECT
                            ticket_name, ticket_id, sale_start_date, sale_end_date
                            FROM event_tickets
                            WHERE _event_id = ${eventDetail.event_id} AND is_deleted = 0
                            group by ticket_id`;

                        let ticketDetails = await MDBObject.runQuery(ticketDetailsQuery);
                        let discount_details = [];
                        let discountQuery = `SELECT * FROM promo_codes where FIND_IN_SET(${api_data.event_id},promo_codes.event_id) > 0 
                        union
                        select * from promo_codes where multi_event_code = 1 and all_events_tickets_access = 1`
                        await MDBObject.runQuery(discountQuery).then(async (codeData) => {
                            if (codeData && codeData.length > 0) {
                                let responseData = []
                                await Promise.all(codeData.map(async (codeDetails) => {
                                    codeDetails.multi_event_code = codeDetails.multi_event_code ? codeDetails.multi_event_code == 1 ? true : false : ''
                                    codeDetails.all_events_tickets_access = codeDetails.all_events_tickets_access ? codeDetails.all_events_tickets_access == 1 ? true : false : ''

                                    codeDetails.event_id = codeDetails.event_id ? codeDetails.event_id.split(',').map(Number) : [];
                                    let data = {
                                        id: codeDetails.id,
                                        code_name: codeDetails.code_name,
                                        discount_type: codeDetails.discount_type,
                                        discount_value: codeDetails.discount_value,
                                        code_limit: codeDetails.code_limit,
                                        remaining_qty: codeDetails.remaining_qty,
                                        multi_event_code: codeDetails.multi_event_code,
                                        all_events_tickets_access: codeDetails.all_events_tickets_access,
                                        code_start_date: codeDetails.code_start_date,
                                        code_end_date: codeDetails.code_end_date,
                                        status: codeDetails.status
                                    } 
                                    responseData.push(data)
                                }))
                                discount_details = responseData;  
                            }
                        });
        
                        let ticket_details = [];
                        await Promise.all(
                            ticketDetails.map(async ticketDetail => {

                                let soldTicketQuery = `SELECT
                                    SUM(user_ticket_details.price) as net_sales,
                                    SUM(user_ticket_details.qty) as total_sold_qty,
                                    DATE_FORMAT(user_ticket_details.date_created, '%Y-%m-%d') as date
                                    FROM user_ticket_details
                                    JOIN event_tickets
                                    ON event_tickets.ticket_id = user_ticket_details._ticket_id
                                    WHERE event_tickets._event_id = ${eventDetail.event_id}
                                    AND event_tickets.ticket_id = ${ticketDetail.ticket_id}
                                    AND event_tickets.is_deleted = 0 
                                    AND user_ticket_details.is_deleted = 0
                                    AND user_ticket_details.ticket_details_status != 'cancel'
                                    AND user_ticket_details.ticket_details_status != 'refunded'
                                    group by date, event_tickets.ticket_id`;

                                let soldTickets = await MDBObject.runQuery(soldTicketQuery);
                                let startDate = moment(new Date(ticketDetail.sale_start_date)).format(dateFormatDB)
                                let endDate = moment(new Date(ticketDetail.sale_end_date)).format(dateFormatDB);
                                let ticket_details_length = ticket_details.length

                                ticket_details.push({
                                    ticket_name: ticketDetail.ticket_name,
                                    sold_tickets: {
                                        data: [],
                                        date: []
                                    },
                                    net_ticket_sales: {
                                        data: [],
                                        date: []
                                    }
                                })

                                if (startDate && endDate) {
                                    while (startDate <= endDate) {
                                        let currentDate = moment(startDate).format("MMM-DD")

                                        ticket_details[ticket_details_length].sold_tickets.date.push(currentDate);
                                        ticket_details[ticket_details_length].net_ticket_sales.date.push(currentDate);

                                        let index = soldTickets.findIndex((x) => x.date == startDate);
                                        if (index > -1) {
                                            ticket_details[ticket_details_length].sold_tickets.data.push(Number(soldTickets[index].total_sold_qty));
                                            ticket_details[ticket_details_length].net_ticket_sales.data.push(Number(soldTickets[index].net_sales));
                                        } else {
                                            ticket_details[ticket_details_length].sold_tickets.data.push(0);
                                            ticket_details[ticket_details_length].net_ticket_sales.data.push(0);
                                        }

                                        startDate = new Date(startDate);
                                        startDate.setDate(startDate.getDate() + 1);
                                        startDate = moment(startDate).format(dateFormatDB)
                                    }
                                }

                            })
                        )
                        
                        // let totalTicketQuery = `SELECT 
                        //     event_tickets.currency_code,
                        //     SUM(event_tickets.quantity) as total_tickets,
                        //     SUM(event_tickets.remaining_qty) as total_available_tickets,
                        //     SUM(event_tickets.quantity - event_tickets.remaining_qty) as total_sold_tickets,
                        //     AVG(CASE 
                        //         WHEN CURDATE() <= event_tickets.sale_end_date AND DATEDIFF(event_tickets.sale_end_date, event_tickets.sale_start_date) > 0 AND DATEDIFF(event_tickets.sale_start_date, CURDATE()) > 0
                        //         THEN (DATEDIFF(sale_end_date,sale_start_date)*(quantity-remaining_qty)*100)/(DATEDIFF(CURDATE(),sale_start_date)*quantity)-100
                        //         ELSE (((event_tickets.quantity-event_tickets.remaining_qty)* 100/ event_tickets.quantity) * 100 ) / 100 - 100
                        //     END) AS avgSaleRatio,
                        //     SUM((event_tickets.quantity - event_tickets.remaining_qty)* event_tickets.price) as net_sales
                        //     FROM event_tickets
                        //     WHERE _event_id = ${eventDetail.event_id} AND event_tickets.is_deleted = 0`;

                        let totalTicketQuery = `SELECT 
                            event_tickets.currency_code,
                            SUM(event_tickets.quantity) as total_tickets,
                            SUM(event_tickets.remaining_qty) as total_available_tickets,
                            SUM(event_tickets.quantity - event_tickets.remaining_qty) as total_sold_tickets,
                            AVG(CASE 
                                WHEN CURDATE() <= event_tickets.sale_end_date AND DATEDIFF(event_tickets.sale_end_date, event_tickets.sale_start_date) > 0 AND DATEDIFF(event_tickets.sale_start_date, CURDATE()) > 0
                                THEN (DATEDIFF(sale_end_date,sale_start_date)*(quantity-remaining_qty)*100)/(DATEDIFF(CURDATE(),sale_start_date)*quantity)-100
                                ELSE (((event_tickets.quantity-event_tickets.remaining_qty)* 100/ event_tickets.quantity) * 100 ) / 100 - 100
                            END) AS avgSaleRatio
                            FROM event_tickets
                            WHERE _event_id = ${eventDetail.event_id} AND event_tickets.is_deleted = 0`;

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
                            WHERE _event_id = ${eventDetail.event_id} AND event_tickets.is_deleted = 0
                            ORDER BY ticket_id`

                        // let ticketBreakDownQuery = `SELECT 
                        //     ticket_id, ticket_name, ticket_type, quantity as total_ticket,
                        //     (quantity - SUM(qty)) as total_available_tickets,
                        //     SUM(qty) as total_sold_tickets, 
                        //     (CASE 
                        //         WHEN CURDATE() <= sale_end_date AND DATEDIFF(sale_end_date, sale_start_date) > 0 AND DATEDIFF(sale_start_date, CURDATE()) > 0
                        //         THEN (DATEDIFF(sale_end_date,sale_start_date)*(quantity-(quantity - SUM(qty)))*100)/(DATEDIFF(CURDATE(),sale_start_date)*quantity)-100
                        //         ELSE (((quantity-(quantity - SUM(qty)))* 100/ quantity) * 100 ) / 100 - 100
                        //     END) AS SaleRatio,  
                        //     SUM(user_ticket_details.price) as net_sales
                        //     FROM event_tickets
                        //     LEFT JOIN user_ticket_details
                        //     ON ( event_tickets.ticket_id = user_ticket_details._ticket_id)
                        //     WHERE _event_id = ${eventDetail.event_id} AND event_tickets.is_deleted = 0 AND
                        //     user_ticket_details.is_deleted = 0
                        //     ORDER BY event_tickets.ticket_id`

                        let timeLineQuery = `SELECT
                            SUM(ticket_price) as y,
                            SUBSTRING(user_tickets.date_created, 1, 10) as t
                            FROM user_tickets
                            WHERE status = 'active' AND event_id = ${eventDetail.event_id}
                            group by t`

                        let timeLines = await MDBObject.runQuery(timeLineQuery);
                        timeLines = JSON.parse(JSON.stringify(timeLines))

                        let total_orderQuery = `SELECT
                            count(*) as total_order, sum(user_tickets.stripe_fee) as total_fee
                            FROM user_tickets
                            WHERE status = 'active' AND event_id = ${eventDetail.event_id}`

                        // let attendeeQuery = `SELECT
                        //     SUM(CASE 
                        //         WHEN user_ticket_details.checkedin_at > 0 
                        //         THEN user_ticket_details.qty
                        //         ELSE 0 
                        //     END) AS attendee
                        //     FROM user_ticket_details
                        //     JOIN user_tickets 
                        //     ON (user_ticket_details._purchased_ticket_id = user_tickets.id)
                        //     WHERE event_id = ${eventDetail.event_id} AND user_tickets.is_deleted = 0
                        //     AND user_ticket_details.is_deleted = 0`;

                        let attendeeQuery = `SELECT
                            SUM(CASE 
                                WHEN user_ticket_details.checkedin_at > 0 
                                THEN user_ticket_details.qty
                                ELSE 0 
                            END) AS attendee,
                            sum(user_ticket_details.price) as total_earn
                            FROM user_ticket_details
                            JOIN user_tickets 
                            ON (user_ticket_details._purchased_ticket_id = user_tickets.id)
                            WHERE event_id = ${eventDetail.event_id} AND user_tickets.is_deleted = 0
                            AND user_tickets.ticket_details_status != 'cancel' AND user_tickets.ticket_details_status != 'refunded'
                            AND user_tickets.status = 'active' AND user_ticket_details.is_deleted = 0`;

                        let tickets_checked_in = 0;
                        let total_earn = 0;
                        let total_fee = 0;
                        await MDBObject.runQuery(attendeeQuery).then(async (data) => {
                            if (data && data[0]) {
                                if (data[0].attendee) {
                                    tickets_checked_in = data[0].attendee;
                                }
                                if (data[0].total_earn) {
                                    total_earn = Number((data[0].total_earn).toFixed(2));
                                }
                            }
                        })

                        let total_order = 0;
                        await MDBObject.runQuery(total_orderQuery).then(async (data) => {
                            if (data && data[0]) {
                                if (data[0].total_order) {
                                    total_order = data[0].total_order;
                                }
                                if (data[0].total_fee) {
                                    total_fee = Number((data[0].total_fee).toFixed(2));
                                }
                            }
                        })

                        let totalTicket = {
                            // net_sales: 0,
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
                            // if(data && data[0] && data[0].net_sales){
                            //     totalTicket.net_sales = Number(data[0].net_sales).toFixed(2)
                            // }
                            if (data && data[0] && data[0].currency_code) {
                                totalTicket.currency_code = data[0].currency_code
                            }
                        })

                        let ticketBreakDown = await MDBObject.runQuery(ticketBreakDownQuery);
                        let randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16);


                        let promotionByUsersQuery = `SELECT
                            count(*) as total_count
                            FROM social_shared_master
                            JOIN reward_master
                            ON social_shared_master._reward_id = reward_master.reward_id
                            JOIN event_master 
                            ON (event_master.event_id = reward_master._event_id)
                            WHERE ${eventMasterCond}`;

                        let promotionByUsers = 0;
                        await MDBObject.runQuery(promotionByUsersQuery).then(async data => {
                            if (data && data[0] && data[0].total_count) {
                                promotionByUsers = Number(data[0].total_count);
                            }
                        })

                        let event_details = {
                            event_id: eventDetail.event_id,
                            event_name: eventDetail.event_name,
                            event_image: eventDetail.event_image,
                            status: eventDetail.status,
                            color: randomColor,
                            start_date_time: eventDetail.start_date_time,
                            end_date_time: eventDetail.end_date_time,
                            ticket_net_sales: (total_earn - total_fee),
                            total_fees: total_fee,
                            ticket_sales: total_earn,
                            total_order,
                            promotionByUsers,
                            tickets_checked_in,
                            currency_code: totalTicket.currency_code,
                            total_tickets: totalTicket.total_tickets,
                            total_sold_tickets: totalTicket.total_sold_tickets,
                            total_available_tickets: totalTicket.total_available_tickets,
                            avgSaleRatio: totalTicket.avgSaleRatio,
                            ticket_type: eventDetail.ticket_type,
                            ticketBreakDown: ticketBreakDown,
                            ticket_details: ticket_details,
                            discount_details: discount_details
                        }

                        response = {
                            success: true,
                            message: successMessages.GET_EVENT_TICKETS,
                            data: {
                                event_details
                            }
                        }
                    } else {
                        response = { success: false, message: errorMessages.EVENT_NOT_FOUND }
                    }
                } else {
                    response = { success: false, message: errorMessages.EVENT_NOT_FOUND }
                }
            })
        } else {
            response = { success: false, message: errorMessages.EVENT_NOT_FOUND }
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