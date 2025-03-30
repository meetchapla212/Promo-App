const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require('joi');
const MDB = require("../common/mysqlmanager");
const utils = require('../common/utils');
const MDBObject = new MDB();

const validate = function (body, schema) {
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
        await utils.verifyUser(event.headers.Authorization);
        // validation schema for question data
        const questionSchema = Joi.object().keys({
            question_prompt: Joi.string().required(),
            question_type: Joi.string().required(),
            question_description: Joi.required(),
            sub_questions: Joi.optional(),

        });
        // validation schema for subquestion data
        const subQuestionSchema = Joi.object().keys({
            _question_id: Joi.number().required(),
            _event_id: Joi.number().required(),
            question_description: Joi.required(),
            subquestion_prompt: Joi.string().required(),
            subquestion_type: Joi.string().required(),
            subquestion_description: Joi.required(),
        });

        let eventId = event.pathParameters.event_id;
        let questionDetails = JSON.parse(event.body);

        await Promise.all(questionDetails.map(async (questionData) => {
            // validate question data
            await validate(questionData, questionSchema);
            let questionInfo = {
                _event_id: eventId,
                question_prompt: questionData.question_prompt,
                question_type: questionData.question_type,
                question_description: typeof (questionData.question_description) == "string" ? questionData.question_description : questionData.question_description.join(';'),

            };
            // question data insertion
            const newQuestion = await MDBObject.dataInsert("event_questions", questionInfo);
            if (questionData.sub_questions) {
                await Promise.all(questionData.sub_questions.map(async subQuestionsDetails => {
                    let subQuestionInfo = {
                        _question_id: newQuestion.insertId,
                        _event_id: eventId,
                        question_description: subQuestionsDetails.question_description,
                        subquestion_prompt: subQuestionsDetails.subquestion_prompt,
                        subquestion_type: subQuestionsDetails.subquestion_type,
                        subquestion_description: typeof (subQuestionsDetails.subquestion_description) == "string" ? subQuestionsDetails.subquestion_description : subQuestionsDetails.subquestion_description.join(';')
                    };
                    // validate subquestion data
                    await validate(subQuestionInfo, subQuestionSchema);
                    // subquestion data insertion
                    return await MDBObject.dataInsert("event_subquestions", subQuestionInfo);
                }))
            }
        }))

        response = { success: true, message: 'Questions added successfully' }
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