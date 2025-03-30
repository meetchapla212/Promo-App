const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const utils = require('./../common/utils');
const MDBObject = new MDB();

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: "Server error! Please try again later" };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
 
        return MDBObject.runQuery(`SELECT
            event_id, event_name
            FROM event_master
            JOIN event_checkout_form ON event_master.event_id = event_checkout_form._event_id
            WHERE event_master._user_id = ${user.id} AND event_master.is_deleted = 0 AND event_checkout_form.is_deleted = 0`
        ).then(async (eventData) => {
            if (eventData && eventData.length > 0) {
                await Promise.all(eventData.map(async (eventDetails) => {
                    return MDBObject.getData('event_checkout_form', "*", { _user_id: user.id, _event_id: eventDetails.event_id }).then(async (formData) => {
                        if (formData && formData.length > 0) {
                            let formDetails = formData[0]
                            let questionData = await MDBObject.getData("event_checkout_form_question", "question_id, question, include, required, status, field, field_type, date_created, date_modified, value", {
                                _event_id: formDetails._event_id, _form_id: formDetails.form_id, _user_id: user.id
                            })
                            formDetails.questions = questionData;
                            await Promise.all(formDetails['questions'].map(async (data) => {
                                data.include = data.include == "1" ? true : false;
                                data.required = data.required == "1" ? true : false;
                                if (data.value) {
                                    data.value = data.value.split(";")
                                    data.value.pop();
                                }
                            }))
                            eventDetails.formDetails = formDetails
                        } else {
                            eventDetails.formDetails = formData
                        }
                    });
                }))
            }
            response = { success: true, message: "Checkout form data get succesfully", data: eventData };
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