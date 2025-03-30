'use strict';
const rp = require('request-promise');
const MAX_NO_OF_PAGES_FROM_PHQ = 10;
const moment = require('moment');
const dateFormat = "YYYY-MM-D";
const AWS = require('aws-sdk');
const { errorMessages } = require('../lambda-v2/common/constants');
AWS.config.setPromisesDependency(require('bluebird'));
const lambda = new AWS.Lambda({
    region: process.env.REGION
});

const getEventsFromPhQByPage = (url, pageno, finalEvents) => {

    console.log('getEventsFromPhQByPage', url, pageno, finalEvents);

    let options = {
        method: 'GET',
        uri: url,
        headers: {
            "Authorization": 'Bearer ' + process.env.PHQ_KEY
        }
    };

    return rp(options).then((response) => {
        // console.log("phq data ----", response);
        if (response) {
            // response = JSON.parse(response);
            finalEvents = finalEvents.concat(response.results);
            // console.log('next page url:', response.next, pageno, MAX_NO_OF_PAGES_FROM_PHQ);
            if (response.next && pageno < MAX_NO_OF_PAGES_FROM_PHQ) {
                pageno = pageno + 1;
                return getEventsFromPhQByPage(response.next, pageno, finalEvents);
            } else {
                // console.log('Resolving final events:', finalEvents);
                return Promise.resolve(finalEvents);
            }
        } else {
            console.log('Resolving final events:', finalEvents);
            return Promise.resolve(finalEvents);
        }
    }).catch((error) => {
        console.error("error : ", error);
        return Promise.resolve(finalEvents);
    });
};

const invokeLambda = (events) => {
    let event = {
        body: JSON.stringify(events)
    }
    let params = {
        FunctionName: process.env.LAMBDA_POST_EVENTS_TO_QB,
        InvocationType: 'Event',
        LogType: 'Tail',
        Payload: JSON.stringify(event)
    };
    return lambda.invoke(params).promise();
};

// This function is called to get events from PHQ
// Sample event
// { "lat":-11,"long":89}

module.exports.handler = (event, context, callback) => {
    console.log('Got events:', JSON.stringify(event));

    if (event && event.lat && event.long) {

        let andFilter = '&';
        let parameters = [];

        /* startDate = moment.utc().format(dateFormat);
        endDate = moment.utc().format(dateFormat); */

        let url = process.env.PHQ_BASE_URL + "/events/?";
        let categories = process.env.categories;
        if (categories) {
            parameters.push('category=' + categories);
        }
        let locations = [event.lat, event.long];
        if (locations && locations.length > 0) {
            let c = locations.join();
            parameters.push('within=30km@' + c);
        }

        parameters.push('end.gte=' + moment.utc().add('7', 'days').format(dateFormat));
        parameters.push('end.lte=' + moment.utc().add('14', 'days').format(dateFormat));

        url = url + parameters.join(andFilter);

        getEventsFromPhQByPage(url, 0, []).then((finalEvents) => {
            console.log('finalEvents===>', finalEvents)
            // return invokeLambda(finalEvents);
        }).then(() => {
            callback(null, "Done");
        });
    } else {
        callback(null, errorMessages.NO_LAT_LONG_RECEIVED);
    }
};