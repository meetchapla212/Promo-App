const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require('joi');
const MDB = require("../../lambda-v2/common/mysqlmanager");
const utils = require('../../lambda-v2/common/utils');
const MDBObject = new MDB();
const dateFormatDB = "YYYY-MM-DD HH:mm:ss";
const momentTz = require("moment-timezone");
const { successMessages, errorMessages } = require('../common/constants');
// const sentryManager = require("../common/sentrymanager");

const validate = function (body) {
    const schema = Joi.object().keys({
        code_name: Joi.required(),
        code_type: Joi.required(),
        discount_type: Joi.required(),
        discount_value: Joi.required(),
        code_limit: Joi.required(),
        status: Joi.required(),
        event_id: Joi.optional(),
        ticket_id: Joi.optional(),
        all_events_tickets_access: Joi.required(),
        multi_event_code: Joi.required()
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
        let codeDetails = JSON.parse(event.body);
        await Promise.all(codeDetails.map(async (codeData) => {
            await validate(codeData);
            let codeId = codeData.code_id ? codeData.code_id : ""
            let codeInfo = {
                _user_id: user.id,
                code_name: codeData.code_name,
                code_type: codeData.code_type,
                discount_type: codeData.discount_type,
                discount_value: codeData.discount_value,
                status: codeData.status,
                code_limit: codeData.code_limit,
                remaining_qty: codeId ? codeData.remaining_qty : codeData.code_limit,
                time_zone: !codeData.ticket_schedule_time ? (codeData.time_zone ? codeData.time_zone : '') : '',
                all_events_tickets_access: codeData.all_events_tickets_access,
                multi_event_code: codeData.multi_event_code,
                code_start_date: !codeData.ticket_schedule_time ? (codeData.code_start_date ? codeData.code_start_date : '') : '',
                code_end_date: !codeData.ticket_schedule_time ? (codeData.code_end_date ? codeData.code_end_date : '') : '',
                ticket_id: codeData.multi_event_code ? (!codeData.all_events_tickets_access ? (codeData.ticket_id ? codeData.ticket_id.toString() : '') : '') : '',
                event_id: codeData.multi_event_code ? (!codeData.all_events_tickets_access ? (codeData.event_id ? codeData.event_id.toString() : '') : '') : (codeData.event_id ? codeData.event_id.toString() : '')
            }
            // Convert time to utc format
            if (codeData.time_zone && codeData.time_zone != "") {
                codeInfo.end_date_utc = !codeData.ticket_schedule_time ? momentTz.tz(codeData.code_end_date, dateFormatDB, codeInfo.timezone).utc().format(dateFormatDB) : '';
                codeInfo.start_date_utc = !codeData.ticket_schedule_time ? momentTz.tz(codeData.code_start_date, dateFormatDB, codeInfo.timezone).utc().format(dateFormatDB) : '';
            }
            // Condition for update and insert data
            if (codeId) {
                delete codeInfo._user_id;
                await MDBObject.dataUpdate("promo_codes", codeInfo, { id: codeId });
                response = { success: true, message: successMessages.DISCOUNT_CODE_UPDATED };
            }
            else {
                let checkCodeExist = await MDBObject.getData("promo_codes", "*", { code_name: codeInfo.code_name });
                if (checkCodeExist && checkCodeExist.length > 0) {
                    response = { success: false, message: errorMessages.DISCOUNT_CODE_EXIST };
                } else {
                    await MDBObject.dataInsert("promo_codes", codeInfo);
                    response = { success: true, message: successMessages.DISCOUNT_CODE_ADDED };
                }
            }
        }))

        return awsRequestHelper.respondWithJsonBody(200, response);

    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        // // Sentry Error Reporting
        // sentryManager.handler(error, response, event.path)
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};