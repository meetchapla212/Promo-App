"use strict";
const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const DBM = require("../common/mysqlmanager");
const DBManager = new DBM();
const Joi = require("joi");
const { errorMessages, successMessages } = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        event_id: Joi,
        address: Joi.string().allow(""),
        street_address: Joi.string().allow(""),
        state: Joi.string().allow(""),
        city: Joi.string().allow(""),
        address_state: Joi.string().allow(""),
        zipcode: Joi.string().allow(""),
        country: Joi.string().allow(""),
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body,schema,{
            abortEarly: false,
            allowUnknown: true,
        },function (error, value) {
            if (error) {
                reject({ status_code: 400, message: error.details[0].message });
            } else {
                resolve(value);
            }
        });
    });
};

module.exports.handler = async function (event, context, callback) {
    var response = {
        success: false,
        message: errorMessages.SERVER_ERROR_TRY_AGAIN,
    };
    try {
        let apiData = JSON.parse(event.body);
        await validate(apiData);
        console.log("apiData", apiData);
        let whereQry = { event_id: apiData["event_id"] };
        delete apiData.event_id;

        let address = [];
        if (apiData.street_address) {
            address.push(apiData.street_address);
        }
        if (apiData.state) {
            address.push(apiData.state);
        }
        if (apiData.city) {
            address.push(apiData.city);
        }
        if (apiData.country) {
            address.push(apiData.country);
        }
        if (apiData.zipcode) {
            address.push(apiData.zipcode);
        }

        apiData.address = apiData.address == "" ? `${address.join(", ")}` : apiData.address;
        let existingRecords = await DBManager.getData("event_master", "count(*) as totalCount", whereQry);
        if (existingRecords[0].totalCount) {
            await DBManager.dataUpdate("event_master", apiData, whereQry);
            response = { success: true, message: successMessages.ADDRESS_UPDATED };
        } else {
            response = { success: true, message: "No matching Event found." };
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