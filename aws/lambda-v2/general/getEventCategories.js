"use strict";
const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let fieldsObj = "category_id, category_name, slug,category_image,category_highlight_image, category_slider_image";
        let existingRecords = await DBManager.getData('event_categories_master', fieldsObj);
        if (existingRecords && existingRecords.length) {
            response = { success: true, message: successMessages.GET_CATEGORY_LIST, data: existingRecords };
        } else {
            response = { success: true, message: 'No Category Found.' }
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
}