'use strict';
const QB = require('quickblox');
const moment = require('moment');
const rp = require('request-promise');
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

};
const className = 'Events';

// This function is called every day to delete old events
module.exports.handler = (event, context, callback) => {
    console.log('Got events:', JSON.stringify(event));
    var formData = {};
    const params = {login: process.env.QB_LOGIN, password: process.env.QB_PASSWORD};
    console.log(params)
    let user_id = null;
    let session_token = null;
    let expire_date = moment.utc().valueOf();
    session(params).then(result => {
        console.log('from get session:', result);
        user_id = result.user_id;
        session_token = result.token;

        formData['end_date_time_ms[lt]'] = expire_date;
        formData['isPHQ'] = true;
        formData['childReferences'] = '';

        let options = {
            method: 'DELETE',
            uri: 'https://api.quickblox.com/data/' + className + '/by_criteria.json',
            form: formData,
            headers: {
                'QB-Token': session_token
            },
            //json: true // Automatically stringifies the body to JSON
        };
        return rp(options);
    }).then((res) => {
        console.log(res);
        callback(null, res);
    }).catch(error => {
        console.error("error : ", error);
        callback(null, error);
    });
};