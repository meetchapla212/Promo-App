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

const getEventDetail = (eventId) => {
    return new Promise(async (resolve, reject) => {
        var sqlQry = "SELECT event_name,start_date_time,end_date_time,event_id FROM event_master WHERE event_id = " + eventId + "";
        let eventResult = await DBManager.runQuery(sqlQry);
        if (eventResult && eventResult.length > 0) {
            return resolve(eventResult[0]);
        } else {
            return reject({ status: false, message: "Event status in not active, which you want to cancel!" })
        }
    })
}

module.exports.handler = async (event, context, callback) => {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let apiData = JSON.parse(event.body);
        await validate(apiData);

        let start_date_ms = Math.round(moment(apiData.start_date).valueOf() / 1000);//Math.round(Date.now(apiData.start_date) / 1000); 
        let end_date_ms = Math.round(moment(apiData.end_date).valueOf() / 1000);//Math.round(Date.now(apiData.end_date) / 1000);
        let getPendingPayoutsOfEvents = `SELECT _event_id FROM event_payout_master where _user_id = ${ user.id } AND payout_created >= ${ start_date_ms } AND payout_created <= ${ end_date_ms } AND payout_status = 'pending' ORDER BY payout_created ASC `
        let pendingPayoutsOfEvents = await DBManager.runQuery(getPendingPayoutsOfEvents);
        if (pendingPayoutsOfEvents && pendingPayoutsOfEvents.length > 0) {
            return Promise.all(pendingPayoutsOfEvents.map(async pendingPayout => {
                var eventId = pendingPayout._event_id;
                return await getEventDetail(eventId).then(async (eventResult) => {
                    let returnResponse = {
                        event_id: eventResult.event_id,
                        event_name: eventResult.event_name,
                        event_Start_date: eventResult.start_date_time,
                        event_end_date: eventResult.end_date_time
                    };

                    let ticketDetails = "SELECT sum(quantity) as total_tickets , sum(remaining_qty) as remaining_tickets , (sum(quantity)-sum(remaining_qty)) as total_sale , sum(total_price) as total_price , sum(price) as price , (sum(service_fee)+sum(stripe_fee)) as total_fee FROM event_tickets where _event_id = " + eventResult.event_id;
                    let getTicketData = await DBManager.runQuery(ticketDetails);
                    if (getTicketData.length > 0) {
                        returnResponse.total_sale = (getTicketData[0].total_sale * 1);
                        returnResponse.total_tickets = (getTicketData[0].total_tickets * 1) || 0;
                        returnResponse.remaining_tickets = (getTicketData[0].remaining_tickets * 1) || 0;
                        // payout changes
                        let ticketPayment = 'SELECT sum(total_amount) as total_earn , sum(stripe_fee) as total_fee , sum(payout_amount) as total_payout FROM user_tickets WHERE event_id = ' + eventId + ' AND status = "active" ';
                        let getTicketDataPrice = await DBManager.runQuery(ticketPayment);
                        returnResponse.total_earn = (getTicketDataPrice[0].total_earn * 1);
                        returnResponse.total_fee = (getTicketDataPrice[0].total_fee * 1);
                        returnResponse.total_payout = (getTicketDataPrice[0].total_payout * 1);

                        return Promise.resolve(returnResponse);
                    }
                }).catch(error => {
                    return Promise.reject({ status: false, message: error.message });
                })
            })).then((userPendingPayoutResult) => {
                response = { success: true, message: successMessages.USER_PENDING_PAYOUT_EVENTS, totalPayouts: userPendingPayoutResult.length, data: userPendingPayoutResult };
                return awsRequestHelper.respondWithSimpleMessage(200, response);
            }).catch(error => {
                response.message = error.message;
                return awsRequestHelper.respondWithSimpleMessage(200, response);
            })
        } else {
            response = { success: true, message: 'User have not any pending payout event', totalPayouts: 0, data: [] };
            return awsRequestHelper.respondWithSimpleMessage(200, response);
        }
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}