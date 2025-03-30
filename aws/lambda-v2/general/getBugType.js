"use strict";
const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        return await DBManager.getData('report_bug_type').then(data =>{
            response = { success: true, message: successMessages.GET_BUG_TYPE, data: data }
            console.log(response)
            return awsRequestHelper.respondWithJsonBody(200, response);
        }).catch(error=>{
            console.error("error : ", error);
            return awsRequestHelper.respondWithJsonBody(500, response);
        })       
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}