const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const utils = require('./../common/utils');
const MDBObject = new MDB();

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: "Server error! Please try again later" };
    try {

        await utils.verifyUser(event.headers.Authorization);

        let eventId = event.pathParameters.event_id;
        let whereQry = { _event_id: eventId }

        return MDBObject.getData('event_checkout_form', "*", whereQry).then(async (formData) => {
            if (formData && formData.length > 0) {
                await Promise.all(formData.map(async (formDetails) => {
                    formDetails.questions = await MDBObject.getData("event_checkout_form_question", "question_id, question, include, required, status, field, field_type, date_created, date_modified, value", { _event_id: eventId, _form_id: formDetails.form_id })
                    await Promise.all(formDetails.questions.map(async (data) => {
                        data.include = data.include == "1" ? true : false;
                        data.required = data.required == "1" ? true : false;
                        if (data.value) {
                            data.value = data.value.split(";")
                            data.value.pop();
                        }
                    }))
                }))

                response = { success: true, message: "Checkout form data get succesfully", data: formData[0] };
                return awsRequestHelper.respondWithJsonBody(200, response);
            } else {
                response = { success: true, message: "No Checkout form Found!" };
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
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