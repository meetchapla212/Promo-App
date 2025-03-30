const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require('joi');
const MDB = require("./../common/mysqlmanager");
const utils = require('../common/utils');
const MDBObject = new MDB();
const { v4: uuidv4 } = require('uuid');
const { errorMessages, successMessages, stringMessages } = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        description: Joi.string().allow(""),
        ticket_name: Joi.string().required(),
        quantity: Joi.number().optional(),
        price: Joi.optional(),
        sale_start_date: Joi.required(),
        sale_start_time: Joi.required(),
        sale_end_date: Joi.required(),
        sale_end_time: Joi.required(),
        min_quant_per_order: Joi.required(),
        max_quant_per_order: Joi.required(),
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false,
            allowUnknown: true
        }, function (error, value) {
            if (error) {
                reject({ status_code: 400, message: error.details[0].message });
            } else {
                resolve(value);
            }
        });
    });
}

module.exports.handler = async function (event, context, callback) {

    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {
        let eventId = event.pathParameters.event_id;
        let user = await utils.verifyUser(event.headers.Authorization);
        let ticketDetails = JSON.parse(event.body);
        await validate(ticketDetails);

        let QueryEvent = `(SELECT start_date_time_ms FROM event_master WHERE event_id = ${eventId} AND _user_id = ${user.id} AND is_deleted = 0 AND status = 'active' ) UNION ALL (SELECT event_master.start_date_time_ms FROM event_administrator JOIN event_master ON event_administrator._event_id = event_master.event_id WHERE event_administrator._event_id = ${eventId} AND event_administrator._user_id = ${user.id} AND event_master.is_deleted = 0 AND event_master.status = 'active') `;
        let eventDetails = await MDBObject.runQuery(QueryEvent);
        if (eventDetails.length <= 0) {
            response = { success: false, message: errorMessages.EVENT_NOT_FOUND }
            return awsRequestHelper.respondWithJsonBody(200, response);
        }
        
        let currentTimestemp = Math.round(Date.now() / 1000);
        if (currentTimestemp > eventDetails[0].start_date_time_ms) {
            response = { success: false, message: errorMessages.EVENT_ALREADY_STARTED }
            return awsRequestHelper.respondWithJsonBody(200, response);
        }

        ticketDetails._event_id = eventId;
        ticketDetails.currency_code = stringMessages.USD;
        let uuidGenerate = uuidv4();
        ticketDetails.ticket_group_id = uuidGenerate;
        if (ticketDetails.tier_details && ticketDetails.tier_details.length > 0) {
            let tier_details = ticketDetails.tier_details;
            delete ticketDetails.tier_details;
            let ticketInfo = ticketDetails;
            await Promise.all(tier_details.map(async tierDetails => {
                ticketInfo.price = tierDetails.price;
                ticketInfo._tier_id = tierDetails._tier_id;
                ticketInfo.quantity = tierDetails.quantity;
                ticketInfo.remaining_qty = tierDetails.quantity;
                return await MDBObject.dataInsert("event_tickets", ticketInfo);
            }))
        } else {
            ticketDetails.remaining_qty = ticketDetails.quantity;
            await MDBObject.dataInsert("event_tickets", ticketDetails);
        }

        response = { success: true, message: successMessages.TICKET_ADDED }
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