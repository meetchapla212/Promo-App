const fs = require('fs');
const AWSManager = require('../common/awsmanager');
const _ = require('lodash');
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const moment = require('moment');
const { errorMessages, stringMessages, emailAndPushNotiTitles } = require("../common/constants");

const fetchNecessaryData = (dataContainer, userId, rewardId) => {
    return new Promise(async (resolve, reject) => {
        const fetchReward = () => {
            return new Promise(async (resolve, reject) => {
                var sqlQry = "SELECT _event_id, reward_id, title FROM reward_master WHERE reward_id = " + rewardId + " ";
                let rewardDetail = await MDBObject.runQuery(sqlQry);
                if (rewardDetail && rewardDetail.length > 0) {
                    dataContainer['reward_detais'] = rewardDetail[0];
                    return resolve(rewardDetail);
                } else {
                    return resolve(errorMessages.EVENT_NOT_FOUND);
                }
            })
        }

        const fetchEvent = () => {
            var eventId = dataContainer.reward_detais._event_id;
            return new Promise(async (resolve, reject) => {
                var sqlQry = "SELECT _user_id, event_id, event_name FROM event_master WHERE event_id = " + eventId + " ";
                let eventResult = await MDBObject.runQuery(sqlQry);
                if (eventResult && eventResult.length > 0) {
                    dataContainer['event_details'] = eventResult[0];
                    return resolve(eventResult);
                } else {
                    return resolve(errorMessages.EVENT_NOT_FOUND);
                }
            })
        }

        const fetchAssociatedUser = () => {
            return new Promise(async (resolve, reject) => {
                let sqlQry = "SELECT user_id, first_name, last_name, username, email, is_email_verified FROM user_master WHERE user_id = " + userId + " ";
                let userDetails = await MDBObject.runQuery(sqlQry);
                if (userDetails.length > 0) {
                    dataContainer['associated_user_details'] = userDetails[0];
                    return resolve(userDetails);
                } else {
                    return resolve(errorMessages.REFRENCE_USER_NOT_FOUND);
                }
            })
        }

        const fetchOrganiser = () => {
            var organiserId = dataContainer.event_details._user_id;
            return new Promise(async (resolve, reject) => {
                let sqlQry = "SELECT user_id FROM user_master WHERE user_id = " + organiserId + " ";
                let organiserDetails = await MDBObject.runQuery(sqlQry);
                if (organiserDetails.length > 0) {
                    dataContainer['organiser_details'] = organiserDetails[0];
                    return resolve(organiserDetails);
                } else {
                    return resolve(errorMessages.ORGANISER_NOT_FOUND);
                }
            })
        }

        fetchReward()
            .then(fetchEvent)
            .then(fetchAssociatedUser)
            .then(fetchOrganiser).then(() => {
                return resolve({ status: true })
            }).catch(error => {
                return reject({ success: false, message: error });
            })
    })
}

const notifyUser = async (reward, event, associatedUser) => {
    if (associatedUser.email && associatedUser.email !== '' && associatedUser.is_email_verified && associatedUser.is_email_verified == 1) {
        let tmpl = fs.readFileSync('./lambda/emailtemplates/notify_user_on_wins_reward_associated_with_event.html', 'utf8');
        let reward_claim_url = `${process.env.UI_BASE_URL}/view_analytics_attendee/${reward.reward_id}`
        let event_name = event.event_name.replace(/\s+/g, '-').toLowerCase();
        let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event.event_id}`;
        console.log(AWSManager.MAIL_PARAMS);
        let templateVars = Object.assign({
            base_url: process.env.UI_BASE_URL,
            eventUrl: event_url,
            rewardClaimUrl: reward_claim_url,
            encodedEventUrl: encodeURIComponent(event_url),
            reward_name: reward.title,
            user_name: utils.toTitleCase((associatedUser.first_name && associatedUser.last_name) ? associatedUser.first_name + ' ' + associatedUser.last_name : associatedUser.username)
        }, AWSManager.MAIL_PARAMS);

        let mailBody = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([associatedUser.email], mailBody, emailAndPushNotiTitles.WON_REWARD_ON_EVENT_SHARING_ON_SOCIAL_PLATFORM);
    }
}

const getUserDeviceToken = async (userId) => {
    let userDeviceTokenData = await MDBObject.getData("app_token_master", "token", { _user_id: userId });
    return userDeviceTokenData;
}

const notifyUserByPushNotification = async (associatedUser, reward, event) => {
    var userDeviceTokenData = await getUserDeviceToken(associatedUser.user_id);
    if (userDeviceTokenData.length > 0) {
        var { token } = userDeviceTokenData[0];
        var userName = utils.toTitleCase((associatedUser.first_name && associatedUser.last_name) ? associatedUser.first_name + ' ' + associatedUser.last_name : associatedUser.username)
        
        let USER_WON_REWARD_ASSOCIATED_WITH_EVENT = emailAndPushNotiTitles.USER_WON_REWARD_ASSOCIATED_WITH_EVENT;
        USER_WON_REWARD_ASSOCIATED_WITH_EVENT = USER_WON_REWARD_ASSOCIATED_WITH_EVENT
            .replace('<userName>',userName)
            .replace('<rewardTitle>',reward.title)
            .replace('<eventName>',event.event_name);

        var message = {
            title: emailAndPushNotiTitles.WON_REWARD,
            body: USER_WON_REWARD_ASSOCIATED_WITH_EVENT,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM
            }
        };
        return await AWSManager.sendPushNotification(message, token);
    } else {
        return Promise.resolve({ status: false, message: errorMessages.USER_DEVICE_ID_NOT_FOUND })
    }
}

const notifyOrganiserByPushNotification = async (associatedUser, eventOrganiser, reward, event) => {
    var organiserDeviceTokenData = await getUserDeviceToken(eventOrganiser.user_id);
    if (organiserDeviceTokenData.length > 0) {
        var { token } = organiserDeviceTokenData[0];
        var userName = utils.toTitleCase((associatedUser.first_name && associatedUser.last_name) ? associatedUser.first_name + ' ' + associatedUser.last_name : associatedUser.username)
        
        let USER_WON_REWARD_ASSOCIATED_WITH_EVENT = emailAndPushNotiTitles.USER_WON_REWARD_ASSOCIATED_WITH_EVENT;
        USER_WON_REWARD_ASSOCIATED_WITH_EVENT = USER_WON_REWARD_ASSOCIATED_WITH_EVENT
            .replace('<userName>',userName)
            .replace('<rewardTitle>',reward.title)
            .replace('<eventName>',event.event_name);

        var message = {
            title: emailAndPushNotiTitles.USER_WON_REWARD,
            body: USER_WON_REWARD_ASSOCIATED_WITH_EVENT,
            payload: {
                messageFrom: stringMessages.PROMO_TEAM
            }
        };
        return await AWSManager.sendPushNotification(message, token);
    } else {
        return Promise.resolve({ status: false, message: errorMessages.ORGANISER_DEVICE_ID_NOT_FOUND })
    }
}

const savePushNotification = async (data) => {
    var dataObj = {
        _user_id: data._user_id,
        _event_id: data._event_id,
        notify_type: stringMessages.DATA,
        payload_data: JSON.stringify(data.payload_data),
        notify_user_id: data.notify_user_id,
        notify_text: data.notify_text,
    }

    return await MDBObject.dataInsert("user_notification", dataObj).then(async (notificationSaveResponse) => {
        return Promise.resolve(notificationSaveResponse)
    }).catch(error => {
        return Promise.reject(error)
    })
}

const shuffle = array => {
    var currentIndex = array.length, temporaryValue, randomIndex;
    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    return array;
};

module.exports.handler = async function (event, context, callback) {
    try {
        var currentDate = moment().format("YYYY-MM-DD HH:mm:ss");
        let selectQuery = "SELECT reward_id, no_of_people, winner_type, no_of_click FROM `reward_master` where DATE_FORMAT(end_date_utc, '%Y-%m-%d %H:%i:%s') < '" + currentDate + "' AND status = 'active'";
        await MDBObject.runQuery(selectQuery).then(async rewardArray => {
            await Promise.all(rewardArray.map(async rewardArrayValue => {
                
                await MDBObject.dataUpdate('reward_master', { status: 'completed' }, {
                    reward_id: rewardArrayValue.reward_id
                }).catch(error => {
                    console.error("error : ", error);
                });
                
                let no_of_people = rewardArrayValue.no_of_people;
                let winnerType = rewardArrayValue.winner_type;
                let winnerCount = rewardArrayValue.no_of_click;
                
                if (winnerType == "first_few") {
                    return await MDBObject.runQuery(`SELECT _reward_id, _user_id FROM reward_applied_master
                        WHERE _reward_id = ${rewardArrayValue.reward_id} AND click_count >= ${winnerCount }
                        LIMIT ${rewardArrayValue.no_of_people}
                    `).then(async (appliedResult) => {
                        return await Promise.all(appliedResult.map(async (appliedResultValue, index) => {
                            let InsertData = {
                                _reward_id: appliedResultValue._reward_id,
                                _user_id: appliedResultValue._user_id
                            };

                            let dataContainer = {};
                            //fetch necessary data
                            await fetchNecessaryData(dataContainer, appliedResultValue._user_id, appliedResultValue._reward_id);

                            if (dataContainer.reward_detais && dataContainer.event_details && dataContainer.associated_user_details && dataContainer.organiser_details) {
                                //send mail to user
                                await notifyUser(dataContainer.reward_detais, dataContainer.event_details, dataContainer.associated_user_details);
                                //send push notification to user
                                await notifyUserByPushNotification(dataContainer.associated_user_details, dataContainer.reward_detais, dataContainer.event_details)
                                
                                let USER_WON_REWARD_ASSOCIATED_WITH_EVENT = emailAndPushNotiTitles.USER_WON_REWARD_ASSOCIATED_WITH_EVENT;
                                USER_WON_REWARD_ASSOCIATED_WITH_EVENT = USER_WON_REWARD_ASSOCIATED_WITH_EVENT
                                    .replace('<userName>',userName)
                                    .replace('<rewardTitle>',dataContainer.reward_detais.title)
                                    .replace('<eventName>',dataContainer.event_details.event_name);

                                //save user push notification
                                var userName = utils.toTitleCase((dataContainer.associated_user_details.first_name && dataContainer.associated_user_details.last_name) ? dataContainer.associated_user_details.first_name + ' ' + dataContainer.associated_user_details.last_name : dataContainer.associated_user_details.username)
                                let userPushNotificationObj = {
                                    _user_id: -1,
                                    _event_id: dataContainer.event_details.event_id,
                                    notify_type: stringMessages.DATA,
                                    payload_data: {
                                        messageFrom: stringMessages.PROMO_TEAM
                                    },
                                    notify_user_id: dataContainer.associated_user_details.user_id,
                                    notify_text: USER_WON_REWARD_ASSOCIATED_WITH_EVENT,
                                }
                                await savePushNotification(userPushNotificationObj);
                                //send push notification to organiser
                                await notifyOrganiserByPushNotification(dataContainer.associated_user_details, dataContainer.organiser_details, dataContainer.reward_detais, dataContainer.event_details)
                                //save organiser push notification 
                                let organiserPushNotificationObj = {
                                    _user_id: -1,
                                    _event_id: dataContainer.event_details.event_id,
                                    notify_type: stringMessages.DATA,
                                    payload_data: {
                                        messageFrom: stringMessages.PROMO_TEAM
                                    },
                                    notify_user_id: dataContainer.organiser_details.user_id,
                                    notify_text: USER_WON_REWARD_ASSOCIATED_WITH_EVENT,
                                }
                                await savePushNotification(organiserPushNotificationObj);
                            }

                            await MDBObject.dataInsert("reward_winner_master", InsertData).then(data => {
                                console.log("inserted");
                            }).catch(error => {
                                console.error("error : ", error);
                            });
                        })).then(result => {
                            return true;
                        });
                    }).catch(error => {
                        console.error("error : ", error);
                    });
                } else if (winnerType == "random") {
                    console.log("ELSEEEE+++++++++++++++")

                    return await MDBObject.runQuery(`SELECT _reward_id, _user_id FROM reward_applied_master WHERE _reward_id = ${rewardArrayValue.reward_id} AND click_count >= ${winnerCount}`).then(async appliedResult => {
                        let shuffleAppliedResult = await shuffle(appliedResult);
                        shuffleAppliedResult = shuffleAppliedResult.slice(0, no_of_people);
                        for (let i = 0; i < shuffleAppliedResult.length; i++) {
                            //   if (i > no_of_people - 1) {
                            //     break;
                            //   }
                            let rewardWinnerData = {
                                _reward_id: shuffleAppliedResult[i]._reward_id,
                                _user_id: shuffleAppliedResult[i]._user_id
                            };

                            let dataContainer = {};
                            //fetch necessary data
                            await fetchNecessaryData(dataContainer, shuffleAppliedResult[i]._user_id, shuffleAppliedResult[i]._reward_id);

                            if (dataContainer.reward_detais && dataContainer.event_details && dataContainer.associated_user_details && dataContainer.organiser_details) {
                                //send mail to user
                                await notifyUser(dataContainer.reward_detais, dataContainer.event_details, dataContainer.associated_user_details);
                                //send push notification to user
                                await notifyUserByPushNotification(dataContainer.associated_user_details, dataContainer.reward_detais, dataContainer.event_details)

                                let USER_WON_REWARD_ASSOCIATED_WITH_EVENT = emailAndPushNotiTitles.USER_WON_REWARD_ASSOCIATED_WITH_EVENT;
                                USER_WON_REWARD_ASSOCIATED_WITH_EVENT = USER_WON_REWARD_ASSOCIATED_WITH_EVENT
                                    .replace('<userName>',userName)
                                    .replace('<rewardTitle>',dataContainer.reward_detais.title)
                                    .replace('<eventName>',dataContainer.event_details.event_name);

                                //save user push notification
                                var userName = utils.toTitleCase((dataContainer.associated_user_details.first_name && dataContainer.associated_user_details.last_name) ? dataContainer.associated_user_details.first_name + ' ' + dataContainer.associated_user_details.last_name : dataContainer.associated_user_details.username)
                                let userPushNotificationObj = {
                                    _user_id: -1,
                                    _event_id: dataContainer.event_details.event_id,
                                    notify_type: stringMessages.DATA,
                                    payload_data: {
                                        messageFrom: stringMessages.PROMO_TEAM
                                    },
                                    notify_user_id: dataContainer.associated_user_details.user_id,
                                    notify_text: USER_WON_REWARD_ASSOCIATED_WITH_EVENT,
                                }
                                await savePushNotification(userPushNotificationObj);
                                //send push notification to organiser
                                await notifyOrganiserByPushNotification(dataContainer.associated_user_details, dataContainer.organiser_details, dataContainer.reward_detais, dataContainer.event_details)
                                //save organiser push notification 
                                let organiserPushNotificationObj = {
                                    _user_id: -1,
                                    _event_id: dataContainer.event_details.event_id,
                                    notify_type: stringMessages.DATA,
                                    payload_data: {
                                        messageFrom: stringMessages.PROMO_TEAM
                                    },
                                    notify_user_id: dataContainer.organiser_details.user_id,
                                    notify_text: USER_WON_REWARD_ASSOCIATED_WITH_EVENT,
                                }
                                await savePushNotification(organiserPushNotificationObj);
                            }

                            await MDBObject.dataInsert("reward_winner_master", rewardWinnerData).then(data => {
                                console.log("inserted");
                            }).catch(error => {
                                console.error("error : ", error);
                            });
                        }
                    }).catch(error => {
                        console.error("error : ", error);
                    });
                }
            }))
        }).catch(error => {
            console.error("error : ", error);
        });
    } catch (error) {
        console.error("error : ", error);
    }
};