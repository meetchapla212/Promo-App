const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("../common/mysqlmanager");
const MDBObject = new MDB();
const utils = require("../common/utils");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: "Server error! Please try again later" };

    try {
        await utils.verifyUser(event.headers.Authorization);
        let questionId = event.pathParameters.question_id;
        var whereQry = { question_id: questionId };
        return await MDBObject.getData("event_checkout_form_question", "count(*) as totalCount", whereQry).then(async (questionDetails) => {
            if (questionDetails && questionDetails.length && questionDetails[0].totalCount) {
                await MDBObject.dataDelete("event_checkout_form_question", whereQry);
                response = { success: true, message: "Question deleted successfully!" };
            } else {
                response = { success: false, message: "Question not found!" };
            }
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