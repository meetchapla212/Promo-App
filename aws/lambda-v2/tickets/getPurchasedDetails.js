"use strict";
const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const {
    errorMessages,
    successMessages
} = require("../common/constants");

const getFormatedInfo = function (data) {
    return new Promise((resolve, reject) => {
        let formArray = data.split(";")
        let addressDetails = {}
        Promise.all(formArray.map(async details => {
            if (details) {
                let value = details.split(":");
                addressDetails[`${value[0]}`] = value[1];
            }
        }))
        console.log("addressDetails", addressDetails)
        resolve(addressDetails)
    }).catch(err => {
        return (err)
    });;
}

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        await utils.verifyUser(event.headers.Authorization);
        var purchase_id = event.pathParameters.purchase_ticketId;
        let detail_id = (event.queryStringParameters && event.queryStringParameters.detail_id) ? event.queryStringParameters.detail_id : false;
        let ticketData = {};

        // let ticketInfoDetails = await DBManager.getData('user_ticket_details', '_ticket_id,qty,price,payment_status,qrcode,checkedin_at,ticket_details_status, checked_by_user_id', { _purchased_ticket_id: purchase_id });
        // await Promise.all(
        //     await ticketInfoDetails.map(async ticketInfoDetailsData => {
        //         let ticketsInfo = await DBManager.getData('event_tickets', 'ticket_name,_event_id,ticket_type', { ticket_id: ticketInfoDetailsData._ticket_id });
        //         ticketInfoDetailsData.ticket_title = ticketsInfo[0].ticket_name;
        //         ticketData.ticket_type = ticketsInfo[0].ticket_type;
        //         ticketData.event_id = ticketsInfo[0]._event_id;

        //         let checkedin_by_details = await DBManager.getJoinedData('user_tickets', 'user_master', 'user_id', 'user_id', 'username,first_name,last_name,email', { 'user_tickets.id': purchase_id });
        //         ticketData.checkedin_by_details = checkedin_by_details;

        //         return ticketInfoDetailsData;
        //     })
        // ).then(dataTicekts => {
        //     ticketData.tickets_details = dataTicekts;
        // })

        let ticketInfoQuery = `SELECT
            _ticket_id, qty, details_id, _purchased_ticket_id, _detail_form_id, user_ticket_details.price, payment_status,qrcode,checkedin_at,ticket_details_status, checked_by_user_id, event_tickets._event_id, event_tickets.ticket_type, event_tickets.ticket_name, user_master.username as checked_by_username, user_master.first_name as checked_by_first_name, user_master.last_name as checked_by_last_name, user_master.email as checked_by_email
            (SELECT
            (CASE
                WHEN is_absorb = 0
                THEN service_fee
                ELSE 0
            END)
            FROM event_tickets
            WHERE ticket_id = _ticket_id AND is_deleted = 0
        ) as absorb_fee
            FROM user_ticket_details
            LEFT JOIN event_tickets
            ON (user_ticket_details._ticket_id = event_tickets.ticket_id)
            LEFT JOIN user_master
            ON (user_ticket_details.checked_by_user_id = user_master.user_id)`;

        console.log("detail_id : ", detail_id);
        console.log("purchase_id : ", purchase_id);
        if (detail_id || detail_id == 'true') {
            ticketInfoQuery += ` WHERE details_id = ${purchase_id}`
        } else {
            ticketInfoQuery += ` WHERE  _purchased_ticket_id = ${purchase_id}`
        }

        console.log("ticketInfoQuery : ", ticketInfoQuery);
        ticketData.tickets_details = await DBManager.runQuery(ticketInfoQuery);
        if (ticketData.tickets_details && ticketData.tickets_details.length && ticketData.tickets_details[0]._event_id) {
            ticketData.event_id = ticketData.tickets_details[0]._event_id;
        }

        if (detail_id || detail_id == 'true') {
            purchase_id = ticketData.tickets_details[0]._purchased_ticket_id;
        }
        ticketData.id = purchase_id;
        await Promise.all(ticketData.tickets_details.map(async (tickets_details) => {
            tickets_details.user_form_details = await DBManager.getData("tickets_attendee_details", "*", { details_id: tickets_details._detail_form_id })
            tickets_details.user_form_details = tickets_details.user_form_details[0]
            if (tickets_details.user_form_details) {
                tickets_details.user_form_details.home_address = tickets_details.user_form_details.home_address ? await getFormatedInfo(tickets_details.user_form_details.home_address) : "";
                tickets_details.user_form_details.shipping_address = tickets_details.user_form_details.shipping_address ? await getFormatedInfo(tickets_details.user_form_details.shipping_address) : "";
                tickets_details.user_form_details.work_address = tickets_details.user_form_details.work_address ? await getFormatedInfo(tickets_details.user_form_details.work_address) : "";
                tickets_details.user_form_details.custom_question = tickets_details.user_form_details.custom_question ? await getFormatedInfo(tickets_details.user_form_details.custom_question) : "";
            }
        }))
        let attendee_details = await DBManager.getJoinedData('user_tickets', 'user_master', 'user_id', 'user_id', 'username,first_name,last_name,email', { 'user_tickets.id': purchase_id });
        ticketData.attendee_details = attendee_details[0];

        let orgInfo = await DBManager.getJoinedData('event_master', 'user_master', '_user_id', 'user_id', 'event_name,quickblox_id,username,first_name,last_name', { 'event_master.event_id': ticketData.event_id });
        if(orgInfo && orgInfo.length){
            ticketData.event_name = orgInfo[0].event_name;
            ticketData.organiser_qb_id = orgInfo[0].quickblox_id;
            ticketData.organiser_name = orgInfo[0].username;
            ticketData.organiser_first_name = orgInfo[0].first_name;
            ticketData.organiser_last_name = orgInfo[0].last_name;
        }
        let dicountInfo = await DBManager.getJoinedData('user_tickets', 'promo_codes', '_discount_code_id', 'id', 'code_name,discount_type,discount_value', { 'user_tickets.id': purchase_id });
        console.log('dicountInfo',dicountInfo)
        if(dicountInfo && dicountInfo.length){
            ticketData.discount_details = dicountInfo[0]
        }
        response = { success: true, message: successMessages.GET_TICKET_PURCHASED, data: ticketData };
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