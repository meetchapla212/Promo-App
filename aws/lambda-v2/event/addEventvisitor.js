const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const Joi = require('joi');
const { errorMessages, successMessages } = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        event_id: Joi.number().required(),
        user_id: Joi.number(),
        ip_address: Joi.string(),
        device_type: Joi.number().required().min(1).max(2)
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false,
            allowUnknown: true
        }, function (error, value) {
            if (error) {
                console.error("error : ", error);
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

        let apiData = JSON.parse(event.body);
        await validate(apiData);
        let whereQry = { event_id: apiData.event_id };

        return MDBObject.getData("event_master", "count(*) as totalCount", whereQry).then(async (data) => {
            if (data[0].totalCount) {
                if (apiData.user_id && apiData.user_id != '') {
                    whereQry = {
                        user_id: apiData.user_id,
                        event_id: apiData.event_id,
                        device_type: apiData.device_type
                    }
                } else {
                    whereQry = {
                        ip_address: apiData.ip_address,
                        event_id: apiData.event_id,
                        device_type: apiData.device_type
                    }
                }
                return MDBObject.getData("event_visitor", "count", whereQry).then(async (data) => {
                    if (data && data.length && data[0].count) {
                        let count = JSON.parse(JSON.stringify(data[0].count));
                        if (count) {
                            count = count + 1;
                        } else {
                            count = 1;
                        }
                        return MDBObject.dataUpdate("event_visitor", { count: count }, whereQry).then(async (updatedData) => {
                            response = {
                                success: true,
                                message: successMessages.VISITED,
                                visitor_id: data[0].visitor_id
                            };
                            return awsRequestHelper.respondWithJsonBody(200, response);
                        }).catch((error) => {
                            console.error("error : ", error);
                            return awsRequestHelper.respondWithJsonBody(500, response);
                        });
                    } else {
                        return MDBObject.dataInsert("event_visitor", apiData).then(async (data) => {
                            response = {
                                success: true,
                                message: successMessages.VISITED,
                                visitor_id: data.insertId
                            };
                            return awsRequestHelper.respondWithJsonBody(200, response);
                        }).catch((error) => {
                            console.error("error : ", error);
                            return awsRequestHelper.respondWithJsonBody(500, response);
                        });
                    }
                }).catch((error) => {
                    console.error("error : ", error);
                    return awsRequestHelper.respondWithJsonBody(500, response);
                });
            } else {
                response = { success: false, message: errorMessages.NO_EVENTS_FOUND }
            }
            return awsRequestHelper.respondWithJsonBody(200, response);
        }).catch((error) => {
            console.error("error : ", error);
            return awsRequestHelper.respondWithJsonBody(500, response);
        });
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};