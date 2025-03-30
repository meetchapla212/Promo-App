const QBM = require('./common/qbmanager');
const QBManager = new QBM();
const awsRequestHelper = require('./common/awsRequestHelper');
const AWSManager = require('./common/awsmanager');
const fs = require('fs');
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const { emailAndPushNotiTitles, errorMessages } = require('../lambda-v2/common/constants');

// This function is used to get event by id
const getEventById = async function (event_id) {
    let response = await QBManager.listTable('Events', { _id: event_id });
    if (response && response.length > 0) {
        return response[0];
    }
    return null;
}

// This function is used to get user by id
const getUserById = async function (id) {
    let response = await QBManager.getUsers({ filter: { field: 'id', param: 'in', value: [id] } });
    console.log(response);
    if (response && response.length > 0) {
        return response[0];
    }
    return null;
}

//Create JWT
const createJWT = (parsedBody) => {
    console.log('Inside createJWT', parsedBody);
    // Create a JWT 
    return jwt.sign(JSON.stringify(parsedBody), process.env.SHARED_SECRET);
};

// This function is used to add admins
const sendEmail = async function (event, email) {
    console.log('Inside sendEmail');

    // Get the admin from event
    let name = email;
    let old_admin = null;
    if ('event_admin' in event && event.event_admin) {
        let admins = JSON.parse(event.event_admin);
        let userIndex = admins.findIndex(a => a.email == email);
        if (userIndex > -1) {
            old_admin = admins[userIndex];
            name = admins[userIndex].name;
            admins.splice(userIndex, 1);
        }

        console.log('old_admin', old_admin);
        // Update event with new admins list
        let param = { _id: event._id, event_admin: JSON.stringify(admins) };
        console.log(param);
        await QBManager.update(param, 'Events');
    }

    let user = await getUserById(event.user_id);
    console.log(user.email);

    let jwt = createJWT({
        event_id: event._id,
        event_name: event.event_name,
        admin: {
            name: old_admin.name,
            email: old_admin.email
        }
    });
    let tmpl = fs.readFileSync('./lambda/emailtemplates/administrator-rejection.html', 'utf8');
    let templateVars = {
        base_url: process.env.UI_BASE_URL,
        eventUrl: `${process.env.UI_BASE_URL}/changeadmin?selection=${jwt}`,
        name: name,
        title: event.event_name
    };
    let body = _.template(tmpl)(templateVars);
    if (user.email && user.email !== '') {
        await AWSManager.sendEmail([user.email], body, emailAndPushNotiTitles.EVENT_ADMINISTATOR_REQUEST_REJECTED);
    }
};

module.exports.handler = async function (event, context, callback) {
    let event_id = event.pathParameters.id;

    // Get the event
    let eventObject = await getEventById(event_id);
    if (!eventObject) {
        return awsRequestHelper.respondWithSimpleMessage(400, errorMessages.EVENT_NOT_FOUND);
    }

    // Send email
    await sendEmail(eventObject, event.queryStringParameters.email);
    return {
        statusCode: 301,
        headers: {
            Location: `${process.env.UI_BASE_URL}/adminreject`,
        }
    }
};