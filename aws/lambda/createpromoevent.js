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
                user_name: api_data.user.full_name,
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
const addGuestsInQB = async function (guests, session) {
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
    console.log('Inside addGuests', guests);
    if (guests && guests.length > 0) {
        let promises = [];
        let startDate = moment.utc(event.start_date_time_ms).format(dateFormat);
        let endDate = moment.utc(event.end_date_time_ms).format(dateFormat);
        let googleUrl = "https://maps.google.com/?ll=" + event.latitude + "," + event.longitude;

        // Check if event_image then get image from QB
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

            let tmpl = fs.readFileSync('./lambda/emailtemplates/invite-attendee.html', 'utf8');
            let mailSubject = emailAndPushNotiTitles.YOU_ARE_NOT_INVITED_TO + event.event_name;
            let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event._id}`;

            let templateVars = {
                base_url: process.env.UI_BASE_URL,
                eventUrl: event_url,
                encodedEventUrl: encodeURIComponent(event_url),
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
                ticketType: event.ticketType,
                ticketPrice: ticketPrice,
                mailtosubject: encodeURIComponent(mailSubject)
            };
            let body = _.template(tmpl)(templateVars);
            if (guest.email && guest.email !== '') {
                promises.push(AWSManager.sendEmail([guest.email], body, mailSubject));
            }
        }
        await Promise.all(promises);
    }
};

// This function is used to send create event email
const sendEventCreatedEmail = async function (event, api_data) {
    if (api_data.user.email && api_data.user.email !== '') {
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
        await AWSManager.sendEmail([api_data.user.email], body, emailAndPushNotiTitles.EVANT_IS_LIVE);
    }
};

// this method is used to create event
const createEvent = async function (element, session) {
    let address = [];
    if (element.address.streetAddress) {
        address.push(element.address.streetAddress);
    }
    if (element.address.state) {
        address.push(element.address.state);
    }
    if (element.address.city) {
        address.push(element.address.city);
    }
    if (element.address.country) {
        address.push(element.address.country);
    }
    if (element.address.zipcode) {
        address.push(element.address.zipcode);
    }
    if (typeof (element.longitude) == 'string') {
        element.longitude = parseFloat(element.longitude);
    }
    if (typeof (element.latitude) == 'string') {
        element.latitude = parseFloat(element.latitude);
    }
    let data = {
        event_name: element.event_name,
        description: element.description,
        event_type: element.event_type,
        address: `${address.join(', ')}`,
        start_date_time: element.start_date_time,
        streetAddress: element.address.streetAddress,
        address_state: element.address.state,
        city: element.address.city,
        country: element.address.country,
        country_code: element.country_code,
        zipcode: element.address.zipcode,
        end_date_time: element.end_date_time,
        eventLocation: [element.longitude, element.latitude], //$scope.eventLocation,
        longitude: element.longitude,
        latitude: element.latitude,
        timezone: element.timezone,
        sponsored_event: element.sponsored_event,
        start_date_time_ms: element.start_date_time_ms,
        end_date_time_ms: element.end_date_time_ms,
        share_counter: 0,
        venue_is: element.venue_is,
        event_admin: [],
        highlighted: element.highlighted,
        invite_friends: JSON.stringify([]),
        email: element.email,
        phone: element.phone,
        websiteurl: element.website,
        isdraft: element.isdraft,
        isPHQ: element.isPHQ,
        ticketType: element.ticketType,
        admissionTicketType: element.admissionTicketType,
        ticketsCheckedIn: 0,
        permissions: {
            read: {
                access: 'open'
            },
            update: {
                access: 'open'
            },
            delete: {
                access: 'open'
            }
        },
        paypalEmail: element.paypalEmail,
        category: element.category
    };

    if ('admins' in element && element.admins) {
        data.event_admin = JSON.stringify(element.admins);
    };

    if ('guests' in element && element.guests && element.guests.length > 0) {
        data.guests = element.guests.map(g => g.id);
    }

    data.tickets = [];
    if (element.tickets && element.tickets.length > 0) {
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
            data.tickets.push(t);
        }
        data.tickets = JSON.stringify(data.tickets);
    }
    let response = null;
    if ('id' in element && element.id) {
        response = await QBManager.updateById('Events', element.id, data, session.token);
    } else {
        response = await QBManager.createObject('Events', data, session.token);
    }
    return response;
};


module.exports.handler = async function (event, context, callback) {

    console.log("got event", JSON.stringify(event));
    try {
        let finalResponse = {};
        const api_data = JSON.parse(event.body);
        console.log(api_data);
        let result = null;
        if ('session' in api_data && api_data.session) {
            console.log('Using session');
            result = api_data.session;
        } else {
            result = await QBManager.session({ login: process.env.QB_LOGIN, password: process.env.QB_PASSWORD });
        }

        // Check if any payment needs to be made
        if ('payment' in api_data && api_data.payment) {
            let response = await completpayment.handler({ headers: { Authorization: result.token }, body: JSON.stringify(api_data.payment) });
            if (!response || response.statusCode != 200) {
                return response;
            }
        }

        if ('guests' in api_data && api_data.guests && api_data.guests.length > 0) {
            api_data.guests = await addGuestsInQB(api_data.guests, result);
        }

        // Create event
        let eventObject = await createEvent(api_data, result);

        // Check if plan was selected to claim event
        if ('plan' in api_data && api_data.plan) {
            await EM.claimEvent({ id: eventObject._id, title: eventObject.event_name }, api_data.plan.id, null, null, result.token);
        }

        if (eventObject && 'isdraft' in api_data && !api_data.isdraft) {
            if ('guests' in api_data && api_data.guests && api_data.guests.length > 0) {
                await addGuests(api_data.guests, eventObject, result);
            }
            if ('admins' in api_data && api_data.admins && api_data.admins.length > 0) {
                let api_base_url = `https://${event.requestContext.domainName}/${process.env.STAGE}`;
                await addAdmins(api_data, eventObject, api_base_url);
            }

            await sendEventCreatedEmail(eventObject, api_data);
        }
        return awsRequestHelper.respondWithJsonBody(200, Object.assign(eventObject, finalResponse));
    } catch (error) {
        console.error("error : ", error);
    }
    return awsRequestHelper.respondWithJsonBody(500, 'Unable to create event');

}
