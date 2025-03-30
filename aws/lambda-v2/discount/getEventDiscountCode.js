const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require('joi');
const MDB = require("./../common/mysqlmanager");
const utils = require('./../common/utils');
const MDBObject = new MDB();
const { successMessages, errorMessages } = require('../common/constants');

module.exports.handler = async function (event, context, callback) {

    var response = { success: false, message: "Server error! Please try again later" };

    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let eventId = event.pathParameters.event_id;
        let discountQuery = `SELECT * FROM promo_codes where FIND_IN_SET(${eventId},promo_codes.event_id) > 0 
        union
        select * from promo_codes where multi_event_code = 1 and all_events_tickets_access = 1`
        return MDBObject.runQuery(discountQuery).then(async (codeData) => {
            if (codeData && codeData.length > 0) {
                await Promise.all(codeData.map(async (codeDetails) => {
                    codeDetails.multi_event_code = codeDetails.multi_event_code ? codeDetails.multi_event_code == 1 ? true : false : ''
                    codeDetails.all_events_tickets_access = codeDetails.all_events_tickets_access ? codeDetails.all_events_tickets_access == 1 ? true : false : ''

                    codeDetails.event_id = codeDetails.event_id ? codeDetails.event_id.split(',').map(Number) : [];
                   
                }))
                response = { success: true, message: successMessages.DISCOUNT_CODE_GET_DATA, data: codeData };
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
            else {
                response = { success: false, message: errorMessages.DISCOUNT_CODE_NOT_FOUND };
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
        });

    } catch (error) {
        console.log("catchError", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};