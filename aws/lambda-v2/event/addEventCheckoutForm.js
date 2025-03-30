const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require('joi');
const MDB = require("../../lambda-v2/common/mysqlmanager");
const utils = require('../../lambda-v2/common/utils');
const MDBObject = new MDB();

const validate = function (body) {
    const schema = Joi.object().keys({
        form_id: Joi.optional(),
        attendee: Joi.required(),
        form_type: Joi.required(),
        questions: Joi.required(),
        registration: Joi.required()
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

const getQuestionValue = function (data) {
    return new Promise((resolve, reject) => {
        let formInfo = ""
        for (const keys in data) {
            formInfo = formInfo + data[`${keys}`] + ";"
        }

        resolve(formInfo)

    }).catch(err => {
        console.log(err)
    });;
}

const deleteQuestion = function (data, formId) {
    return new Promise(async (resolve, reject) => {
        let deleteInfo = {}
        for (const keys in data) {
            deleteInfo = await MDBObject.dataDelete("event_checkout_form_question", { question_id: data[`${keys}`], _form_id: formId })
        }
        resolve(deleteInfo)
    }).catch(err => {
        console.log(err)
    });;
}

module.exports.handler = async function (event, context, callback) {

    var response = { success: false, message: "Server error! Please try again later" };

    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let eventId = event.pathParameters.event_id;
        let formDetails = JSON.parse(event.body);
        let formId = formDetails.form_id ? formDetails.form_id : ""
        await validate(formDetails);

        let formInfo = {
            _event_id: eventId,
            _user_id: user.id,
            attendee: formDetails.attendee,
            form_type: formDetails.form_type,
            registration_name: formDetails.registration.name,
            registration_time: formDetails.registration.time,
            registration_message: formDetails.registration.message
        }
        let newForm = {}
        if (formId) {
            delete formInfo._event_id;
            delete formInfo._user_id;
            await MDBObject.dataUpdate("event_checkout_form", formInfo, { form_id: formId, _event_id: eventId, _user_id: user.id });
        } else {
            newForm = await MDBObject.dataInsert("event_checkout_form", formInfo);
            formId = newForm.insertId
        }

        let questionDetails = []
        if (formDetails.questions) {
            questionDetails = formDetails.questions;
            await Promise.all(questionDetails.map(async (questionData) => {
                let questionForm = {
                    _form_id: formId,
                    _event_id: eventId,
                    _user_id: user.id,
                    question: questionData.question,
                    include: questionData.include,
                    required: questionData.required,
                    status: questionData.status,
                    field: questionData.field,
                    field_type: questionData.field_type
                }
                if (questionData.value) {
                    questionForm.value = await getQuestionValue(questionData.value);
                }
                if (questionData.question_id) {
                    await MDBObject.dataUpdate("event_checkout_form_question", questionForm, { question_id: questionData.question_id, _form_id: formId, _event_id: eventId, _user_id: user.id });
                } else {
                    await MDBObject.dataInsert("event_checkout_form_question", questionForm);
                }
            }))
        }

        if (formDetails.question_delete) {
            await deleteQuestion(formDetails.question_delete, formId);
        }

        response = { success: true, message: "Congratulations! Checkout form saved successfully" };
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