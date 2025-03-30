"use strict";

const awsRequestHelper = require('./common/awsRequestHelper');
const QBM = require('./common/qbmanager');
const QBManager = new QBM();

const fs = require('fs');
const _ = require('lodash');
const moment = require('moment');
const AWSManager = require('./common/awsmanager');
const completpayment = require('./completePayment');
const EM = require('./common/eventsmanager');
const { emailAndPushNotiTitles } = require('../lambda-v2/common/constants');

const updateEvent = async function (eventObject, element, token) {
    let update_params = {};

    let eventRowKeys = Object.keys(eventObject);

    for (let key of Object.keys(element)) {
        if (eventRowKeys.includes(key)) {
            update_params[key] = element[key];
        }
    }

    if ('guests' in element && element.guests && element.guests.length > 0) {
        update_params.guests = element.guests.map(g => g.id);
    }


    if ('address' in element && typeof (element.address) !== 'string') {
        update_params.address = `${element.address.streetAddress}, ${element.address.state}, ${element.address.city}, ${element.address.country} ${element.address.zipcode}`;
        update_params.streetAddress = element.address.streetAddress;
        update_params.address_state = element.address.state;
        update_params.city = element.address.city;
        update_params.country = element.address.country;
        update_params.zipcode = element.address.zipcode;
    }
    if ('longitude' in element && element.longitude && 'latitude' in element && element.latitude) {
        update_params.eventLocation = [element.longitude, element.latitude];
    }

    if ('website' in element && element.website) {
        update_params.websiteurl = element.website;
    }

    if ('admins' in element && element.admins) {
        update_params.event_admin = JSON.stringify(element.admins);
    };
    if (element.tickets && element.tickets.length > 0) {
        update_params.tickets = [];
        for (let ticket of element.tickets) {
            let t = {
                name: ticket.name,
                remQuantity: ticket.quantity,
                quantity: ticket.quantity,
                currency: '$',
                status: 'active',
                price: ticket.price,
                saleStartDate: ticket.saleStartDate,
                saleEndDate: ticket.saleEndDate,
                ticketPerOrderMinQuant: ticket.ticketPerOrderMinQuant,
                ticketPerOrderMaxQuant: ticket.ticketPerOrderMaxQuant
            };
            update_params.tickets.push(t);
        }
        update_params.tickets = JSON.stringify(update_params.tickets);
    }

    if ('longitude' in update_params && update_params.longitude && typeof (update_params.longitude) == 'string') {
        update_params.longitude = parseFloat(update_params.longitude);
    }
    if ('latitude' in update_params && update_params.latitude && typeof (update_params.latitude) == 'string') {
        update_params.latitude = parseFloat(update_params.latitude);
    }

    console.log('update_params', update_params);
    return await QBManager.updateById('Events', eventObject._id, update_params, token);
};

// This function is used to get event by id
const getEventById = async function (event_id, token) {
    console.log("Inside getEventById", event_id, token);
    let response = await QBManager.getById('Events', event_id, token);
    console.log(response);
    if (response) {
        return response;
    }
    return null;
}

// This function is used to add admins
const addAdmins = async function (api_data, event, api_base_url) {
    console.log('Inside addAdmins');
    let admins = api_data.admins;
    if (admins && admins.length > 0) {
        let promises = [];
        for (let admin of admins) {
            let tmpl = fs.readFileSync('./lambda/emailtemplates/add-administrator.html', 'utf8');
            let templateVars = {
                base_url: process.env.UI_BASE_URL,
                eventUrl: `${process.env.UI_BASE_URL}/eventdetails/${event._id}`,
                name: admin.name,
                title: event.event_name,
                user_name: api_data.user_name,
                rejectUrl: `${api_base_url}/admin/reject/${event._id}?email=${encodeURIComponent(admin.email)}`
            };
            let body = _.template(tmpl)(templateVars);
            if (admin.email && admin.email !== '') {
                promises.push(AWSManager.sendEmail([admin.email], body, emailAndPushNotiTitles.YOU_ARE_NOW_ADMIN_FOR_EVENT));
            }
        }
        await Promise.all(promises);
    }
};

let categoryDisplayName = {
    "concerts": "Concerts",
    "festivals": "Festivals",
    "programing-arts": "Performing arts",
    "performing-arts": "Performing arts",
    "community": "Community",
    "sports": "Sports",
    "politics": "Rally"
};

const dateFormat = "ddd, MMMM D, YYYY [at] hh:mm A";

// This function is used to add guests in QB
const addGuestsInQB = async function (guests, event, session) {
    console.log('Inside addGuestsInQB', guests);
    let existingRecords = await QBManager.getExistingRecords('GuestUsers', guests, 'email', session.user_id, session.token);
    console.log('existingRecords', existingRecords);
    if (existingRecords && existingRecords.length > 0) {
        for (let guest of guests) {
            let existingEmails = existingRecords.find(e => e.email == guest.email);
            if (existingEmails) {
                guests[0].id = existingEmails._id;
            }
        }
    }
    if (guests && guests.length > 0) {
        let formData = {};
        guests.forEach((element, index) => {
            if (!element.id) {
                let i = index + 1;
                formData['record[' + i + '][' + 'UserID' + ']'] = session.user_id;
                formData['record[' + i + '][' + 'email' + ']'] = element.email;
                formData['record[' + i + '][' + 'type' + ']'] = element.type;
                formData['record[' + i + '][' + 'name' + ']'] = element.name;
                if ('user_id' in element && element.user_id) {
                    formData['record[' + i + '][' + 'guestUserId' + ']'] = element.name;
                }
                if ('groupName' in element && element.groupName) {
                    formData['record[' + i + '][' + 'groupName' + ']'] = element.groupName;
                }
            }
        });

        if (Object.keys(formData).length > 0) {
            console.log('Saving guest', formData);
            let response = await QBManager.postMultiRecords('GuestUsers', formData, session.token);
            console.log(response);

            if (response && response.items) {
                console.log('Inside updating ids');
                for (let guest of guests) {
                    let existingEmails = response.items.find(e => e.email == guest.email);
                    console.log('existingEmails', existingEmails);
                    if (existingEmails) {
                        guests[0].id = existingEmails._id;
                    }
                }
            }
        }
    }

    return guests;
};

// This function is used to add guests
const addGuests = async function (guests, event, session) {
    console.log('Inside addGuests');

    if (guests && guests.length > 0) {
        let promises = [];
        let startDate = moment.utc(event.start_date_time_ms).format(dateFormat);
        let endDate = moment.utc(event.end_date_time_ms).format(dateFormat);
        let googleUrl = "https://maps.google.com/?ll=" + event.latitude + "," + event.longitude;

        // Check if event_image then get image from QB
        let image_url = event.image_url;
        if ('event_image' in event && event.event_image) {
            image_url = `https://api.quickblox.com/data/Events/${event._id}/file?field_name=event_image&token=${session.token}`;
        }

        let ticketPrice = 'FREE';

        if (event.ticketType && event.ticketType === 'paid') {
            if (event.tickets) {
                let tickets = JSON.parse(event.tickets);
                tickets = tickets.filter((t) => ((!t.status) || (t.status == 'active')));
                tickets = tickets.sort((a, b) => {
                    if ("price" in a && "price" in b) {
                        return (a.price - b.price);
                    } else if ("price" in a) {
                        return -1;
                    } else if ("price" in b) {
                        return 1;
                    } else {
                        return -1;
                    }
                });
                ticketPrice = '$' + tickets[0].price;
            }
        }

        console.log('Image url', image_url);
        for (let guest of guests) {
            let newGuest = true;
            if (event.guests && event.guests.length > 0 && event.guests.find(g => g === guest._id)) {
                newGuest = false;
            }
            if (newGuest) {
                let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event._id}`;
                let mailSubject = emailAndPushNotiTitles.YOU_ARE_NOT_INVITED_TO + event.event_name;
                let tmpl = fs.readFileSync('./lambda/emailtemplates/invite-attendee.html', 'utf8');
                let templateVars = {
                    base_url: process.env.UI_BASE_URL,
                    eventUrl: event_url,
                    name: guest.name,
                    buyTicketUrl: `${process.env.UI_BASE_URL}/ticket_type?ev=${event._id}`,
                    longitude: event.longitude,
                    latitude: event.latitude,
                    title: event.event_name,
                    category: categoryDisplayName[event.category],
                    categoryImg: `${process.env.UI_BASE_URL}/img/${event.category}.png`,
                    startDate: startDate,
                    endDate: endDate,
                    googleUrl: googleUrl,
                    image_url: image_url,
                    encodedEventUrl: encodeURIComponent(event_url),
                    ticketType: event.ticketType,
                    ticketPrice: ticketPrice,
                    mailtosubject: encodeURIComponent(mailSubject)
                };
                let body = _.template(tmpl)(templateVars);
                if (guest.email && guest.email !== '') {
                    promises.push(AWSManager.sendEmail([guest.email], body, mailSubject));
                }
            }
        }
        await Promise.all(promises);
    }
};

// This function is used to send create event email
const sendEventCreatedEmail = async function (event, api_data) {
    if (api_data.user_email && api_data.user_email !== '') {
        console.log('Inside sendEventCreatedEmail');
        let tmpl = fs.readFileSync('./lambda/emailtemplates/event-created-successfully.html', 'utf8');
        let mailSubject = emailAndPushNotiTitles.YOU_ARE_NOT_INVITED_TO + event.event_name;
        let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event._id}`;
        let templateVars = {
            base_url: process.env.UI_BASE_URL,
            eventUrl: event_url,
            encodedEventUrl: encodeURIComponent(event_url),
            mailtosubject: encodeURIComponent(mailSubject)
        };
        let body = _.template(tmpl)(templateVars);
        await AWSManager.sendEmail([api_data.user_email], body, emailAndPushNotiTitles.EVANT_IS_LIVE);
    }
};

module.exports.handler = async function (event, context, callback) {

    console.log("got event", JSON.stringify(event));
    try {
        const api_data = JSON.parse(event.body);
        console.log(api_data);
        let result = null;
        if ('session' in api_data && api_data.session) {
            result = api_data.session;
        } else {
            result = await QBManager.session({ login: process.env.QB_LOGIN, password: process.env.QB_PASSWORD });
        }

        let eventObject = await getEventById(event.pathParameters.event_id, result.token);
        console.log(eventObject);

        if (eventObject && Object.keys(api_data).length > 0) {

            // Check if any payment needs to be made
            if ('payment' in api_data && api_data.payment) {
                let response = await completpayment.handler({ headers: { Authorization: result.token }, body: JSON.stringify(api_data.payment) });
                if (!response || response.statusCode != 200) {
                    return response;
                }
            }
            if ('guests' in api_data && api_data.guests && api_data.guests.length > 0) {
                api_data.guests = await addGuestsInQB(api_data.guests, eventObject, result);
            }

            await updateEvent(eventObject, api_data, result.token);

            // Check if plan was selected to claim event
            if ('plan' in api_data && api_data.plan && !eventObject.claimed_by) {
                await EM.claimEvent({ id: eventObject._id, title: eventObject.event_name }, api_data.plan.id, null, null, result.token);
            }

            if ('guests' in api_data && api_data.guests && api_data.guests.length > 0) {
                await addGuests(api_data.guests, eventObject, result);
            }

            if ('admins' in api_data && api_data.admins && api_data.admins.length > 0) {
                let api_base_url = `https://${event.requestContext.domainName}/${process.env.STAGE}`;
                await addAdmins(api_data, eventObject, api_base_url);
            }

            if ('createEvent' in api_data && api_data.createEvent) {
                await sendEventCreatedEmail(eventObject, api_data);
            }
        }
    } catch (error) {
        console.error("error : ", error);
    }
    return awsRequestHelper.respondWithCodeOnly(204);

}
