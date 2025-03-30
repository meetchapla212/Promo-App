const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require('joi');
const MDB = require("./../common/mysqlmanager");
const utils = require('./../common/utils');
const moment = require("moment");
const MDBObject = new MDB();
const { successMessages, errorMessages } = require('../common/constants');

const validate = function (body) {
    const schema = Joi.object().keys({
        code_name: Joi.required(),
        event_id: Joi.required(),
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false,
            allowUnknown: true
        }, function (err, value) {
            if (err) {
                reject({ status_code: 400, message: err.details[0].message });
            } else {
                resolve(value);
            }
        });
    });
}


module.exports.handler = async function (event, context, callback) {

    var response = { success: false, message: "Server error! Please try again later" };

    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let eventId = event.queryStringParameters.event_id;
        let code_name = event.queryStringParameters.code_name;
        let currentDate = moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
        await validate({ code_name: code_name, event_id: eventId })
        
        return MDBObject.runQuery(`SELECT * FROM promo_codes WHERE code_name = "${code_name}" AND (((code_limit - remaining_qty) != code_limit) OR code_limit = 'unlimited') AND "${currentDate}" > DATE_FORMAT(start_date_utc, "%Y-%m-%d %H:%i:%s") AND "${currentDate}" < DATE_FORMAT(end_date_utc, "%Y-%m-%d %H:%i:%s") AND status = "active" AND is_deleted = 0`).then(async (codeData) => {
            if (codeData && codeData.length > 0) {
                let responseData = []
                await Promise.all(codeData.map(async (codeDetails) => {
                    let codeStartDate = moment(codeDetails.start_date_utc).format("YYYY-MM-DD HH:mm:ss");
                    let codeEndDate = moment(codeDetails.end_date_utc).format("YYYY-MM-DD HH:mm:ss");
                    codeDetails.multi_event_code = codeDetails.multi_event_code ? codeDetails.multi_event_code == 1 ? true : false : ''
                    codeDetails.all_events_tickets_access = codeDetails.all_events_tickets_access ? codeDetails.all_events_tickets_access == 1 ? true : false : ''

                    codeDetails.event_id = codeDetails.event_id ? codeDetails.event_id.split(',').map(Number) : [];

                    // Condition for code availability based on ticket scheduled time and code scheduled time
                    if (codeDetails.multi_event_code && codeDetails.all_events_tickets_access) {
                        responseData.push(codeDetails)
                    }else{
                        if(codeDetails.event_id){
                            for (let data of codeDetails.event_id) {
                                if (eventId == data.toString()) {
                                    responseData.push(codeDetails)
                                }
                            }
                        }
                    }
                }))
                if (responseData.length) {
                    response = { success: true, message: successMessages.DISCOUNT_CODE_VALID, data: responseData[0] };
                    return awsRequestHelper.respondWithJsonBody(200, response);
                } else {
                    response = { success: true, message: errorMessages.DISCOUNT_CODE_INVALID };
                    return awsRequestHelper.respondWithJsonBody(200, response);
                }
            }
            else {
                response = { success: true, message: errorMessages.DISCOUNT_CODE_INVALID };
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