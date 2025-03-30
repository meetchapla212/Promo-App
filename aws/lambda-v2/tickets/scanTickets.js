const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const DBM = require("../common/mysqlmanager");
const DBManager = new DBM();
const utils = require("../common/utils");
const moment = require("moment");
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callbacdfghk) {
    var response = {
        success: false,
        message: errorMessages.SERVER_ERROR_TRY_AGAIN,
    };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let apiData = JSON.parse(event.body);
        // let ticketToken = apiData.token;
        let eventId = apiData.event_id;

        let scanTicketDetails = utils.verifyJWT(apiData.token);
        let ticket_id = scanTicketDetails.event_ticket;
        let ticket_details_id = scanTicketDetails.details;
        if (eventId) {
            let eventDetails = await DBManager.getJoinedData("event_tickets", "event_master", "_event_id", "event_id", "_event_id", {
                ticket_id: ticket_id, "event_master.status": "active"
            });
            if (eventDetails.length <= 0) {
                response = { success: false, message: errorMessages.INVALID_TICKET };
                return awsRequestHelper.respondWithJsonBody(200, response);
            } else if (eventId != eventDetails[0]._event_id) {
                response = { success: false, message: errorMessages.QR_DOES_NOT_BELONG_TO_THIS_EVENT };
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
        } else {
            response = { success: false, message: errorMessages.EVENT_NOT_FOUND };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        let ticketName = await DBManager.getData("event_tickets", "ticket_name,price", { ticket_id: scanTicketDetails.event_ticket }).then((tckNameRes) => {
            return tckNameRes[0];
        });

        let deteailsQuery = `SELECT
            qrcode, checkedin_at, DATE_FORMAT(FROM_UNIXTIME(checkedin_at/1000), '%M %d, %Y %h:%i %p') as checkedinAt 
            FROM user_ticket_details
            WHERE details_id = ${ticket_details_id} AND checkedin_at != ""`;
        let ticketDetails = await DBManager.runQuery(deteailsQuery);
        if (ticketDetails.length && ticketDetails[0].checkedinAt) {
            let ALREADY_CHECKED_IN_TICKET = errorMessages.ALREADY_CHECKED_IN_TICKET;
            ALREADY_CHECKED_IN_TICKET = ALREADY_CHECKED_IN_TICKET.replace('<checkedinAt>', ticketDetails[0].checkedinAt);

            response = {
                success: false,
                message: ALREADY_CHECKED_IN_TICKET,
                data: {
                    attendeeName: scanTicketDetails.attendeeName,
                    checkedin_at: ticketDetails[0].checkedin_at,
                    checkedinAt: ticketDetails[0].checkedinAt,
                    ticket_title: ticketName.ticket_name,
                }
            };
            return awsRequestHelper.respondWithJsonBody(200, response);
        }
        let currentTimestemp = moment().valueOf();
        let updateData = { checkedin_at: currentTimestemp };
        if (user && user.id) {
            updateData['checked_by_user_id'] = user.id;
        }
        if (apiData.checkedin_device_id) {
            updateData['checkedin_device_id'] = apiData.checkedin_device_id;
        }
        await DBManager.dataUpdate("user_ticket_details", updateData, { details_id: ticket_details_id });

        // let userDetailsEmail = await DBManager.getData("user_master", "email", { username: scanTicketDetails.attendee }).then((res) => {
        //     return res[0].email;
        // });
        // let ticketPurchaseDate = await DBManager.getData("user_tickets", "date_created", { id: scanTicketDetails.ticket }).then((tckres) => {
        //     return tckres[0].date_created;
        // });
        // let ticketName = await DBManager.getData("event_tickets", "ticket_name,price", {
        //     ticket_id: scanTicketDetails.event_ticket
        // }).then((tckNameRes) => {
        //     return tckNameRes[0];
        // });
        // let responseArray = {
        //     username: scanTicketDetails.attendee,
        //     attendeeName: scanTicketDetails.attendeeName,
        //     email: userDetailsEmail,
        //     purchased_on: ticketPurchaseDate,
        //     ticket_title: ticketName.ticket_name,
        //     ticket_price: ticketName.price
        // };

        let ticketData = {};
        ticketData.id = scanTicketDetails.ticket;

        let ticketInfoQuery = `SELECT
            _ticket_id, qty, user_ticket_details.price, payment_status,qrcode,checkedin_at,ticket_details_status, checked_by_user_id, event_tickets._event_id, event_tickets.ticket_type, event_tickets.ticket_name, user_master.username as checked_by_username, user_master.first_name as checked_by_first_name, user_master.last_name as checked_by_last_name, user_master.email as checked_by_email
            FROM user_ticket_details
            LEFT JOIN event_tickets
            ON (user_ticket_details._ticket_id = event_tickets.ticket_id)
            LEFT JOIN user_master
            ON (user_ticket_details.checked_by_user_id = user_master.user_id)
            WHERE _purchased_ticket_id = ${scanTicketDetails.ticket}`;
        ticketData.tickets_details = await DBManager.runQuery(ticketInfoQuery);
        ticketData.event_id = ticketData.tickets_details[0]._event_id;

        let attendee_details = await DBManager.getJoinedData('user_tickets', 'user_master', 'user_id', 'user_id', 'username,first_name,last_name,email', { 'user_tickets.id': scanTicketDetails.ticket });
        if (attendee_details && attendee_details.length) {
            ticketData.attendee_details = attendee_details[0];
        }

        let orgInfo = await DBManager.getJoinedData('event_master', 'user_master', '_user_id', 'user_id', 'event_name,quickblox_id,username,first_name,last_name', { 'event_master.event_id': ticketData.event_id });
        ticketData.event_name = orgInfo[0].event_name;
        ticketData.organiser_qb_id = orgInfo[0].quickblox_id;
        ticketData.organiser_name = orgInfo[0].username;
        ticketData.organiser_first_name = orgInfo[0].first_name;
        ticketData.organiser_last_name = orgInfo[0].last_name;

        response = {
            success: true,
            message: successMessages.USER_CHECKED_IN,
            data: ticketData,
        };
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