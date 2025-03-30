'use strict';

const rp = require('request-promise');
const MAX_NO_OF_PAGES_FROM_PHQ = 10;
const moment = require('moment');
const dateFormat = "YYYY-MM-D";
const AWS = require('aws-sdk');
const MDB = require("./../common/mysqlmanager");
const { errorMessages } = require('../common/constants');
const MDBObject = new MDB();
AWS.config.setPromisesDependency(require('bluebird'));

const lambda = new AWS.Lambda({
    region: process.env.REGION
});

const getEventsFromPhQByPage = (url, pageno, finalEvents) => {

    // console.log('getEventsFromPhQByPage', url, pageno, finalEvents);

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
            response = JSON.parse(response);
            finalEvents = finalEvents.concat(response.results);
            // console.log('next page url:', response.next, pageno, MAX_NO_OF_PAGES_FROM_PHQ);
            if (response.next && pageno < MAX_NO_OF_PAGES_FROM_PHQ) {
                pageno = pageno + 1;
                return getEventsFromPhQByPage(response.next, pageno, finalEvents);
            } else {
                console.log('Resolving final events::::::::::', finalEvents);
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

// const invokeLambda =async(events) => {
//     await Promise.all(
//         events.map(async eventDetails=>{
//             if (eventDetails.title && eventDetails.title != "" ){
//                 var eventDBObject = {
//                     event_name: eventDetails.title.replace(/'/g, ''),
//                     description: eventDetails.description.replace(/'/g, ''),
//                     category: eventDetails.category,
//                     address: eventDetails.entities[0] ? eventDetails.entities[0].formatted_address : '' ,
//                     start_date_time: eventDetails.start,
//                     end_date_time: eventDetails.end,
//                     start_date_time_ms: moment(eventDetails.start).valueOf(),
//                     end_date_time_ms: moment(eventDetails.end).valueOf(),
//                     timezone: eventDetails.timezone,
//                     country: eventDetails.country,
//                     event_location: JSON.stringify(eventDetails.location),
//                     // [23.0267556,72.6008286]
//                     latitude: eventDetails.location[0],
//                     longitude: eventDetails.location[1],
//                     isPHQ:1,
//                     PHQEventID: eventDetails.id,
//                     event_type: 'private',
//                 };
//                 return await MDBObject.dataInsert('event_master', eventDBObject).then(data=>{
//                     console.log(data)
//                 }).catch(error=>{
//                     console.log('====+++++++', eventDBObject.description)
//                     console.log("============",error);
//                     return;
//                 });
//             }

//         })
//     ).then(data=>{
//         console.log("---===--===--==");
//         // await MDBObject.dataInsert('event_master', eventDBObject);
//         // return data;
//     })
// };
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

module.exports.handler = async (event, context, callback) => {
    if (event && event.lat && event.long) {

        let andFilter = '&';
        let parameters = [];

        /*            startDate = moment.utc().format(dateFormat);
                    endDate = moment.utc().format(dateFormat);*/

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

        await getEventsFromPhQByPage(url, 0, [])
            .then((finalEvents) => {
                console.log('finalEvents=====>', JOSN.stringify(finalEvents))
                return invokeLambda(finalEvents);
            })
            .then(() => {
                callback(null, "Done");
            });
    } else {
        callback(null, errorMessages.NO_LAT_LONG_RECEIVED);
    }
};