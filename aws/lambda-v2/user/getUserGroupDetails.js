const awsRequestHelper = require('../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const utils = require('../common/utils');
const { errorMessages, successMessages } = require("../common/constants");

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let userId = user.id;

        let dataResponse = {
            group_list: [],
            guest_list: []
        }

        let userGroups = await DBManager.getData('user_group', '*', { _user_id: userId });
        if (userGroups.length > 0) {
            await Promise.all(userGroups.map(async (group) => {
                let groupResponse = {
                    group_id: group.group_id,
                    group_name: group.group_name,
                    date_created: group.date_created,
                    members_count: 0,
                    group_members: []
                };

                await DBManager.runQuery('SELECT count(*) as members_count FROM guest_users WHERE _group_id=' + group.group_id).then(async (group_members_counts) => {
                    groupResponse.members_count = group_members_counts[0].members_count;
                });

                let gruoMemberQuery = `select guest_users.guest_id,guest_users._group_id,guest_users.name,guest_users._user_id, guest_users._event_id, guest_users.email,guest_users.type, 
                    user_master.profile_pic, user_master.username, user_master.first_name, user_master.last_name, user_master.mobile_number
                    from user_group join guest_users on user_group.group_id = guest_users._group_id
                    left join user_master on(guest_users._user_id = user_master.user_id or guest_users._user_id = 0)
                    where user_group.group_id = ${group.group_id} AND guest_users.is_deleted = 0 group by guest_id`;

                await DBManager.runQuery(gruoMemberQuery).then((groupMembers) => {
                    groupResponse["group_members"] = groupMembers;
                })

                // let fieldsObj = "guest_users.guest_id,guest_users._group_id,guest_users.name, guest_users._user_id, guest_users._event_id, guest_users.email,guest_users.type";
                // var groupMembers = await DBManager.getJoinedData("user_group", "guest_users", "group_id", "_group_id", fieldsObj, { group_id: group.group_id });
                // if (groupMembers.length > 0) {
                //     groupResponse["group_members"] = groupMembers;
                // }

                return groupResponse;
            })).then((userGroupResponse) => {
                dataResponse.group_list = userGroupResponse
            })
        }

        let getUsersAllGuestQry = "select guest_users.*, user_master.profile_pic, user_master.username, user_master.first_name, user_master.last_name, user_master.mobile_number from event_master join guest_users on event_master.event_id  = guest_users._event_id left join user_master on(guest_users._user_id = user_master.user_id or guest_users._user_id = 0) where event_master._user_id = " + userId + " AND guest_users.is_deleted = 0 group by guest_users.email";
        let usersAllGuestList = await DBManager.runQuery(getUsersAllGuestQry);
        if (usersAllGuestList.length > 0) {
            dataResponse.guest_list = usersAllGuestList
        }

        response = {
            success: true,
            message: successMessages.GET_USER_GROUP,
            data: dataResponse
        };

        return awsRequestHelper.respondWithJsonBody(200, response);
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}