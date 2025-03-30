const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const moment = require('moment');
const utils = require('../common/utils');
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {

    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {

        let user = await utils.verifyUser(event.headers.Authorization);
        let rewardId = event.pathParameters.reward_id;

        var analyticsResponse = {
            "is_reward_active": true,
            "is_eligible": false,
            "is_winner": false,
            "filled_info": false
        };
        let rewardDetails = await MDBObject.getData('reward_master', 'end_date, no_of_click', { reward_id: rewardId });
        let rewardEndDate = moment(rewardDetails[0].end_date).valueOf();
        let currentTimeStamp = moment().valueOf();

        if (currentTimeStamp > rewardEndDate) {
            analyticsResponse.is_reward_active = false;
        }

        // await MDBObject.getData('reward_applied_master', "click_count", { _reward_id: rewardId, _user_id: user.id }).then(clickCount => {
        //     if (clickCount.length > 0) {
        //         if (clickCount[0].click_count >= rewardDetails[0].no_of_click) {
        //             analyticsResponse.is_eligible = true;
        //         }
        //     }
        // })
        
        await MDBObject.runQuery(`SELECT
            (SELECT count(*) FROM reward_applied_master WHERE _reward_id= ${rewardId} AND _user_id = ${user.id}) as clickCountCount,
            (SELECT count(*) FROM reward_winner_master WHERE _reward_id= ${rewardId} AND _user_id = ${user.id}) as rewardWinnerCount,
            (SELECT count(*) FROM winner_information WHERE _reward_id= ${rewardId} AND _winner_user_id = ${user.id}) as winnerinfoCount
        `).then(async (data) => {
            if(data && data.length){
                if(data[0].clickCountCount){
                    analyticsResponse.is_eligible = true;
                }
                if(data[0].rewardWinnerCount){
                    analyticsResponse.is_winner = true;
                }
                if(data[0].winnerinfoCount){
                    analyticsResponse.filled_info = true;
                }
            }
        })

        // await MDBObject.getData('reward_winner_master', "count(*) as totalCount", { _reward_id: rewardId, _user_id: user.id }).then(winnerResponse => {
        //     if (winnerResponse && winnerResponse.length && winnerResponse[0].totalCount) {
        //         analyticsResponse.is_winner = true;
        //     }
        // })
        
        // await MDBObject.getData('winner_information', 'count(*) as totalCount', { _reward_id: rewardId, _winner_user_id: user.id }).then(winnerinfo => {
        //     if (winnerinfo && winnerinfo.length && winnerinfo[0].totalCount) {
        //         analyticsResponse.filled_info = true;
        //     }
        // })

        await MDBObject.runQuery('SELECT count(*) as clicks , social_media_type FROM visited_master WHERE _reward_id=' + rewardId + ' AND _ref_user_id=' + user.id + ' GROUP BY social_media_type').then(async (analyticsData) => {
            await Promise.all(analyticsData.map(async (analyticsValue) => {
                var analyticsSocialObject = {};
                analyticsSocialObject.type = analyticsValue.social_media_type;
                analyticsSocialObject.clicks = analyticsValue.clicks;
                return await MDBObject.runQuery('SELECT user_master.username as name ,user_master.profile_pic as image, user_master.first_name as first_name, user_master.last_name as last_name  ,visited_master.date_created as date FROM visited_master JOIN user_master ON user_master.user_id = visited_master._visited_user_id WHERE _reward_id=' + rewardId + ' AND _ref_user_id=' + user.id + ' AND social_media_type ="' + analyticsValue.social_media_type + '"').then(async (userResponse) => {

                    Promise.all(userResponse.map((userResponseElement) => {
                        userResponseElement.date = moment(userResponseElement.date).valueOf();
                        return userResponseElement;
                    })).then(userPromiseData => { console.log('userPromiseData') });

                    analyticsSocialObject.users = userResponse;
                    return analyticsSocialObject;
                })
            })).then(analyticsDataResponse => {
                analyticsResponse.social_info = analyticsDataResponse;
            })
        })

        response = { success: true, message: successMessages.GET_REWARD_ANALYTICS, data: analyticsResponse }
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