const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const utils = require('../common/utils');
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    try {
        let response = {};
        let reportResponse = {};
        let rewardId = event.pathParameters.reward_id;
        let user = await utils.verifyUser(event.headers.Authorization);

        let rewardDetails = await MDBObject.getData('reward_master', '*', { reward_id: rewardId, _user_id: user.id });
        if (rewardDetails.length <= 0) {
            console.log(rewardDetails.length)
            response = { success: false, message: errorMessages.USER_HAVE_NOT_CREATED_THIS_REWARD }
            return awsRequestHelper.respondWithJsonBody(200, response);
        }
        rewardDetails = rewardDetails[0];
        rewardDetails.event_details = await MDBObject.getData('event_master', '*', { event_id: rewardDetails._event_id });
        reportResponse.reward_details = rewardDetails;
        
        let sqlQuery = `SELECT
            (SELECT count(*) FROM visited_master WHERE _reward_id= ${rewardId}) as total_visiters,
            (SELECT count(*) FROM social_shared_master WHERE _reward_id= ${rewardId}) as total_shares,
            (SELECT count(*) FROM reward_applied_master WHERE _reward_id = ${rewardId} AND click_count >= ${reportResponse.reward_details.no_of_click}) as people_eligible`;

        reportResponse.total_visiters = 0;
        reportResponse.total_shares = 0;
        reportResponse.people_eligible = 0;

        await MDBObject.runQuery(sqlQuery).then(async (data) => {
            if(data && data.length){
                if(data[0].total_visiters){
                    reportResponse.total_visiters = data[0].total_visiters;
                }
                if(data[0].total_shares){
                    reportResponse.total_shares = data[0].total_shares;
                }
                if(data[0].people_eligible){
                    reportResponse.people_eligible = data[0].people_eligible;
                }
            }
        })

        await MDBObject.runQuery('SELECT count(*) as shares,social_type,date_created FROM social_shared_master WHERE _reward_id=' + rewardId + ' GROUP BY social_type ORDER BY shares DESC, date_created DESC').then(async (mostSharedData) => {
            reportResponse.most_share_on = mostSharedData[0];
        })

        await MDBObject.runQuery('SELECT user_master.* from reward_winner_master JOIN user_master ON reward_winner_master._user_id = user_master.user_id WHERE reward_winner_master._reward_id=' + rewardId).then(async (winnerUserDetails) => {
            reportResponse.winner_users = winnerUserDetails;
            await Promise.all(
                winnerUserDetails.map(async userInfo => {
                    let winner_info = await MDBObject.getData('winner_information', '*', { '_winner_user_id': userInfo.user_id, '_reward_id': rewardId });
                    userInfo.winner_info = winner_info.length > 0 ? winner_info[0] : {};

                    let social_shared_type = await MDBObject.runQuery('SELECT GROUP_CONCAT(DISTINCT social_type) as social_type  FROM social_shared_master where _reward_id=' + rewardId + ' AND _user_id=' + userInfo.user_id);
                    userInfo.event_shared_on = (social_shared_type.length > 0 && social_shared_type[0].social_type) ? social_shared_type[0].social_type : '';

                    let totalCount = await MDBObject.getData('reward_applied_master', "click_count", { _reward_id: rewardId, _user_id: userInfo.user_id });
                    userInfo.total_clicks = totalCount.length > 0 ? totalCount[0].click_count : 0

                    let firstShareDetails = await MDBObject.runQuery('SELECT date_created FROM social_shared_master where _reward_id=' + rewardId + ' AND _user_id=' + userInfo.user_id + ' LIMIT 1');
                    userInfo.first_share_date = firstShareDetails.length > 0 ? firstShareDetails[0].date_created : '';

                    let winnerDate = await MDBObject.runQuery('SELECT date_created FROM reward_winner_master where _reward_id=' + rewardId + ' AND _user_id=' + userInfo.user_id + ' LIMIT 1');
                    userInfo.winning_date = userInfo.winner_info.date_created;

                    let deviceType = await MDBObject.runQuery('SELECT GROUP_CONCAT(DISTINCT device_type) as device_type  FROM social_shared_master where _reward_id=' + rewardId + ' AND _user_id=' + userInfo.user_id);
                    userInfo.device_type = (deviceType.length > 0 && deviceType[0].device_type) ? deviceType[0].device_type : '';

                    let browserType = await MDBObject.runQuery('SELECT GROUP_CONCAT(DISTINCT browser_name) as browser_name  FROM social_shared_master where _reward_id=' + rewardId + ' AND _user_id=' + userInfo.user_id);
                    userInfo.browser_name = (browserType.length > 0 && browserType[0].browser_name) ? browserType[0].browser_name : '';

                    return userInfo;
                })
            ).then(dateUserWithInfo => {
                reportResponse.winner_users = dateUserWithInfo;
            })
        })

        await MDBObject.runQuery('SELECT user_master.*,reward_applied_master.is_disqualify from reward_applied_master JOIN user_master ON reward_applied_master._user_id = user_master.user_id JOIN reward_master ON reward_applied_master._reward_id = reward_master.reward_id WHERE reward_applied_master._reward_id=' + rewardId + ' AND reward_applied_master.click_count >= reward_master.no_of_click').then(async (eligibleUserDetails) => {
            reportResponse.eligible_users = eligibleUserDetails;

            await Promise.all(
                eligibleUserDetails.map(async userEligibleInfo => {
                    userEligibleInfo.eligible_users_details = {};

                    let eligible_social_shared_type = await MDBObject.runQuery('SELECT GROUP_CONCAT(DISTINCT social_type) as social_type  FROM social_shared_master where _reward_id=' + rewardId + ' AND _user_id=' + userEligibleInfo.user_id);
                    userEligibleInfo.eligible_users_details.event_shared_on = (eligible_social_shared_type.length > 0 && eligible_social_shared_type[0].social_type) ? eligible_social_shared_type[0].social_type : '';

                    let eligible_totalCount = await MDBObject.getData('reward_applied_master', "click_count", { _reward_id: rewardId, _user_id: userEligibleInfo.user_id });
                    userEligibleInfo.eligible_users_details.total_clicks = eligible_totalCount.length > 0 ? eligible_totalCount[0].click_count : 0

                    let eligible_firstShareDetails = await MDBObject.runQuery('SELECT date_created FROM social_shared_master where _reward_id=' + rewardId + ' AND _user_id=' + userEligibleInfo.user_id + ' LIMIT 1');

                    userEligibleInfo.eligible_users_details.first_share_date = eligible_firstShareDetails.length > 0 ? eligible_firstShareDetails[0].date_created : '';

                    let eligible_deviceType = await MDBObject.runQuery('SELECT GROUP_CONCAT(DISTINCT device_type) as device_type  FROM social_shared_master where _reward_id=' + rewardId + ' AND _user_id=' + userEligibleInfo.user_id);
                    userEligibleInfo.eligible_users_details.device_type = (eligible_deviceType.length > 0 && eligible_deviceType[0].device_type) ? eligible_deviceType[0].device_type : '';

                    let eligible_browserType = await MDBObject.runQuery('SELECT GROUP_CONCAT(DISTINCT browser_name) as browser_name  FROM social_shared_master where _reward_id=' + rewardId + ' AND _user_id=' + userEligibleInfo.user_id);
                    userEligibleInfo.eligible_users_details.browser_name = (eligible_browserType.length > 0 && eligible_browserType[0].browser_name) ? eligible_browserType[0].browser_name : '';
                    return userEligibleInfo;
                })
            ).then(dateUserWithInfo => {
                reportResponse.eligible_users = dateUserWithInfo;
            })

        })
        
        await MDBObject.runQuery('SELECT user_master.*,visited_master.social_media_type as visited_from ,visited_master.device_type as device_type,visited_master.browser_name as browser ,visited_master.date_created as date_time,visited_master.city as city,visited_master.country as country FROM visited_master JOIN user_master ON visited_master._visited_user_id = user_master.user_id  WHERE _reward_id=' + rewardId).then(async (eventVisitedUsers) => {
            reportResponse.event_visited_users = eventVisitedUsers;
        }).catch(error => {
            console.error("error : ", error);
        })
        
        await MDBObject.runQuery('SELECT user_master.*,social_shared_master.social_type as shared_from ,social_shared_master.device_type as device_type,social_shared_master.browser_name as browser ,social_shared_master.date_created as date_time,social_shared_master.city as city,social_shared_master.country as country FROM social_shared_master JOIN user_master ON social_shared_master._user_id = user_master.user_id  WHERE _reward_id=' + rewardId + ' GROUP BY _user_id').then(async (eventSharedUser) => {
            reportResponse.event_share_users = eventSharedUser;
        })
        
        await MDBObject.runQuery('select country, sum(social) as share, sum(visit) as visit from((select country, 1 as social, 0 as visit from social_shared_master where _reward_id=' + rewardId + ' ) union all (select country, 0 as social, 1 as visit from visited_master where _reward_id=' + rewardId + ')) sv group by country').then(async (eventShareCountCountry) => {
            reportResponse.share_visit_country = eventShareCountCountry;
        })
        
        await MDBObject.runQuery('select social_type, sum(social) as share, sum(visit) as visit from ((select social_type, 1 as social, 0 as visit from social_shared_master where _reward_id=' + rewardId + ' ) union all (select social_media_type as social_type, 0 as social, 1 as visit from visited_master where _reward_id=' + rewardId + ' ) ) sv group by social_type').then(async (eventShareCountSocial) => {
            reportResponse.share_visit_social = eventShareCountSocial;
        })

        response = {
            success: true,
            message: successMessages.GET_ORGANISER_REPORT,
            data: reportResponse
        };

        return awsRequestHelper.respondWithJsonBody(200, response);
    } catch (error) {
        console.error("error : ", error);
        return awsRequestHelper.respondWithJsonBody(500, error);
    }
};