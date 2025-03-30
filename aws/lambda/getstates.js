'use strict';
// const rp = require('request-promise');
const awsRequestHelper = require('./common/awsRequestHelper');
const country = require('countryjs');

module.exports.handler = async (event, context, callback) => {
    console.log('Got event', event);
    // let options = {
    //     method: 'GET',
    //     uri: `http://battuta.medunes.net/api/region/${event.pathParameters.country}/all/?key=24c8b4ae208be8eec22161e1deabf9a5`,
    //     json: true // Automatically stringifies the body to JSON
    // };

    let response = country.provinces(event.pathParameters.country);
    return awsRequestHelper.respondWithJsonBody(200, response);
};