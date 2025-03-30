'use strict';
const Joi = require('joi');
const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const moment = require("moment");
const { errorMessages, successMessages } = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        start_date: Joi.string().required(),
        end_date: Joi.string().required()
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false
        }, function (error, value) {
            if (error) {
                reject({ status_code: 400, message: error.details[0].message });
            } else {
                resolve(value);
            }
        });
    });
}

module.exports.handler = async (event, context, callback) => {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let apiData = JSON.parse(event.body);
        await validate(apiData);
        let start_date_ms = moment(apiData.start_date).format('YYYY-MM-DD');
        let end_date_ms = moment(apiData.end_date).format('YYYY-MM-DD');

        let getEventQuery = `SELECT event_name,start_date_time,end_date_time,event_id FROM event_master where _user_id = ${user.id} AND status="active" AND DATE(end_date_time) >= '${start_date_ms}' AND DATE(end_date_time) <= '${end_date_ms}' AND (ticket_type = 'paid' OR event_type = 'paid') ORDER BY end_date_time_ms ASC `;
        let getEvents = await DBManager.runQuery(getEventQuery);
        if (getEvents.length > 0) {
            return Promise.all(
                getEvents.map(async eventData => {
                    let returnResponse = {
                        event_id: eventData.event_id,
                        event_name: eventData.event_name,
                        event_Start_date: eventData.start_date_time,
                        event_end_date: eventData.end_date_time
                    };

                    let ticketDetails = "SELECT sum(quantity) as total_tickets , sum(remaining_qty) as remaining_tickets , (sum(quantity)-sum(remaining_qty)) as total_sale , sum(total_price) as total_price , sum(price) as price , (sum(service_fee)+sum(stripe_fee)) as total_fee FROM event_tickets where _event_id = " + eventData.event_id;
                    let getTicketData = await DBManager.runQuery(ticketDetails);
                    if (getTicketData.length > 0) {
                        returnResponse.total_sale = (getTicketData[0].total_sale * 1);
                        returnResponse.total_tickets = (getTicketData[0].total_tickets * 1) || 0;
                        returnResponse.remaining_tickets = (getTicketData[0].remaining_tickets * 1) || 0;
                        // payout changes
                        let ticketPayment = 'SELECT sum(total_amount) as total_earn , sum(stripe_fee) as total_fee , sum(payout_amount) as total_payout FROM user_tickets WHERE event_id = ' + eventData.event_id + ' AND status = "active" ';
                        let getTicketDataPrice = await DBManager.runQuery(ticketPayment);
                        returnResponse.total_earn = (getTicketDataPrice[0].total_earn * 1);
                        returnResponse.total_fee = (getTicketDataPrice[0].total_fee * 1);
                        returnResponse.total_payout = (getTicketDataPrice[0].total_payout * 1);

                        return returnResponse;
                    }
                })
            ).then(proRes => {
                response = { success: true, message: successMessages.USER_ACTIVE_PAYOUT_EVENTS, totalPayouts: proRes.length, data: proRes }
                return awsRequestHelper.respondWithSimpleMessage(200, response);
            }).catch(error => {
                response.message = error.message;
                return awsRequestHelper.respondWithSimpleMessage(200, response);
            })
        } else {
            response = { success: true, message: successMessages.USER_HAVE_NO_ACTIVE_PAYOUT_EVENTS, totalPayouts: 0, data: [] }
            return awsRequestHelper.respondWithSimpleMessage(200, response);
        }
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};