const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const utils = require("../common/utils");
const MDBObject = new MDB();
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let resource = event.requestContext.resourcePath;
        let user = await utils.verifyUser(event.headers.Authorization);
        let userId = user.id;
        var whereQry = { _user_id: userId };
        if (resource == "/reward/{reward_id}") {
            let rewardId = event.pathParameters.reward_id;
            whereQry = { reward_id: rewardId };
        } else {
            let status = (event.queryStringParameters && event.queryStringParameters.status) ? event.queryStringParameters.status.toLowerCase() : "live";
            if (status == 'draft') {
                whereQry.is_draft = 1;
            } else if (status == 'archived') {
                whereQry.status = "inactive";
                whereQry.is_draft = 0;
            } else if (status == 'completed') {
                whereQry.status = "completed";
                whereQry.is_draft = 0;
            } else {
                whereQry.status = "active";
                whereQry.is_draft = 0;
            }
        }

        let pageNumber = (event.queryStringParameters && event.queryStringParameters.page && event.queryStringParameters.page > 0) ? event.queryStringParameters.page : 1;
        let pageLimit = (event.queryStringParameters && event.queryStringParameters.limit) ? event.queryStringParameters.limit : 10;
        let pageoffset = (pageNumber * pageLimit) - pageLimit;
        
        let totalRecords = 0;
        return await MDBObject.getData("reward_master", "count(*) as totalCount", whereQry).then(data => {
            if (data[0].totalCount) {
                totalRecords = data[0].totalCount;

                return MDBObject.getData("reward_master", '*', whereQry, 'AND', pageoffset, pageLimit).then(async (data) => {
                    if (data.length > 0) {
                        await Promise.all(data.map(async dataValue => {
                            if (resource != "/reward/{reward_id}") {
                                
                                await MDBObject.runQuery(`SELECT
                                    (SELECT count(*) FROM reward_winner_master WHERE _reward_id = ${dataValue.reward_id}) as winnerCount,
                                    count(*) as activePeople,
                                    COUNT(CASE WHEN click_count >= ${dataValue.no_of_click} then 1 ELSE 0 END) as people_eligible
                                    FROM reward_applied_master WHERE _reward_id = ${dataValue.reward_id}
                                `).then(async (data) => {
                                    if(data && data.length){
                                        if(data[0].active_people){
                                            dataValue.active_people = data[0].active_people;
                                        }
                                        if(data[0].people_eligible){
                                            dataValue.people_eligible = data[0].people_eligible;
                                        }
                                        if(data[0].winnerCount){
                                            dataValue.winnerCount = data[0].winnerCount;
                                        }
                                    }
                                })

                                dataValue.is_share = dataValue.active_people > 0 ? true : false;
                            }

                            return await MDBObject.getData("event_master", "*", { event_id: dataValue._event_id }).then(eventDetails => {
                                dataValue.event_details = eventDetails[0];
                                return eventDetails;
                            });
        
                        }))
                        response = { success: true, message: successMessages.GET_REWARD_LIST, data: data, total: parseInt(totalRecords), page: parseInt(pageNumber), limit: parseInt(pageLimit) }
                    } else {
                        response = { success: false, message: "No rewards found!" }
                    }
                    return awsRequestHelper.respondWithJsonBody(200, response);
                }).catch((error) => {
                    console.error("error : ", error);
                    return awsRequestHelper.respondWithJsonBody(500, response);
                });

            } else {
                response = { success: false, message: "No rewards found!" }
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