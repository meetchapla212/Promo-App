const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("../common/mysqlmanager");
const utils = require('../common/utils');
const MDBObject = new MDB();

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: "Server error! Please try again later" };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        return MDBObject.getData("event_checkout_form_question", "*", { status: "custom", _user_id: user.id }).then(async (questionData) => {
            if (questionData && questionData.length > 0) {
                await Promise.all(questionData.map(async data => {
                    data.include = data.include == "1" ? true : false
                    data.required = data.required == "1" ? true : false
                    if (data.value) {
                        data.value = data.value.split(";")
                        data.value.pop();
                    }
                }))
            }
            response = { success: true, message: 'Event Question list successfully', data: questionData }
            return awsRequestHelper.respondWithJsonBody(200, response);
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