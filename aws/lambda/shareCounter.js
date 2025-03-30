"use strict";
const QB = require('quickblox');
const AWS = require('aws-sdk');
const awsRequestHelper = require('./common/awsRequestHelper');

const CREDENTIALS = {
    appId: process.env.QB_APP_ID,
    authKey: process.env.QB_AUTH_KEY,
    authSecret: process.env.QB_AUTH_SECRET
};

QB.init(CREDENTIALS.appId, CREDENTIALS.authKey, CREDENTIALS.authSecret);

const session = function (params) {
    return new Promise((resolve, reject) => {
        QB.createSession(params, function (error, result) {
            if (error) {
                console.error("error : ", error);
                reject(error);
            }

            if (result) {
                resolve(result);
            }
        });
    });

}

const update = function (data, tableName) {
    return new Promise((resolve, reject) => {
        QB.data.update(tableName, data, function (error, result) {
            if (error) {
                console.error("error : ", error);
                reject(error);
            } else {
                resolve(result.share_counter);
            }
        });
    });
}

const checkEmail = function (data) {
    return new Promise((resolve, reject) => {
        QB.data.list('EventShareUsers', data, function (error, result) {
            if (error) {
                console.error("error : ", error);
                reject(error);
            } else {
                resolve(result);
            }
        });
    });

}




const insertEmail = function (data) {
    return new Promise((resolve, reject) => {
        QB.data.create('EventShareUsers', data, function (error, result) {
            if (error) {
                console.error("error : ", error);
                reject(error);
            } else {
                resolve(result);
            }
        });

    });
}


const shareEmail = function (data) {
    if (data) {
        let filter = { email: { ctn: data } };
        return checkEmail(filter).then(result => {
            console.log('checkEmail', result);
            if (result.items.length > 0) {
                return Promise.resolve({});
            }
            else {
                let params = { email: data };
                return insertEmail(params);
            }
        });
    } else {
        return Promise.resolve(null);
    }
}




module.exports.handler = function (event, context, callback) {

    console.log("got event", event);
    const api_data = JSON.parse(event.body);
    let eventID = api_data.event_id;
    let share_counter = 0;

    const params = { login: process.env.QB_LOGIN, password: process.env.QB_PASSWORD };

    let email = null;

    if ('email' in api_data && api_data.email) {
        email = api_data.email;
    }
    let userID = null;
    session(params).then(response => {
        userID = response.user_id;
        return shareEmail(email);
    }).then(result => {
        console.log(result);
        if (eventID && userID) {
            let param = { _id: eventID, inc: { share_counter: 1 } };

            if (result) {
                param['add_to_set'] = {
                    childReferences: result._id
                }
            }
            let tableName = 'Events';
            if ('tableName' in api_data) {
                tableName = api_data.tableName;
            }
            return update(param, tableName);
        }
        else {
            return Promise.resolve(0);
        }
    }).then(result => {
        if (result) {
            share_counter = result;
        }
        awsRequestHelper.callbackRespondWithJsonBody(callback, 200, { "count": share_counter });
    }).catch((error) => {
        console.error("error : ", error);
        awsRequestHelper.callbackRespondWithCodeOnly(callback, 400);
    });
}