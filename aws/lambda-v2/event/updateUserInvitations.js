// @ts-check
"use strict";
const fs = require("fs");
const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const DBM = require("../common/mysqlmanager");
const AWSManager = require("../common/awsmanager");
const DBManager = new DBM();
const { v4: uuidv4 } = require("uuid");
const utils = require("./../common/utils");
const { eventsTable, privateEventInvitationsTable } = require("./constants");

// const sendMailToGuests = async function (event, guest, event_id, eventTickets, user, address) {
//     if (guest.email && guest.email !== "") {
//         event = await DBManager.getData("event_master", "*", { event_id: event_id }).then((dataEvent) => {
//             return dataEvent[0];
//         });
//         console.log("--address", event);
//         console.log("--called mail function-----------");
//         let event_name = event.event_name.replace(/\s+/g, "-").toLowerCase();
//         // $scope.rewardUrl = base_url + "/eventdetails/" + event_name + '/' + $scope.event_details.event_id + "?ref=" + $scope.userDetails.user_id;
//         let tmpl = fs.readFileSync("./lambda/emailtemplates/invite-users-to-private-event.html", "utf8");
//         let mailSubject = `You are invited to ${event.event_name}`;
//         let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event_id}`;

//         let googleUrl = "https://maps.google.com/?ll=" + event.latitude + "," + event.longitude;
//         let image_url = event.event_image;
//         let ticketPrice = "FREE";
//         if (event.ticket_type && event.ticket_type === "paid") {
//             if (eventTickets) {
//                 let tickets = eventTickets;
//                 tickets = tickets.filter((t) => !t.status || t.status == "active");
//                 tickets = tickets.sort((a, b) => {
//                     if ("price" in a && "price" in b) {
//                         return a.price - b.price;
//                     } else if ("price" in a) {
//                         return -1;
//                     } else if ("price" in b) {
//                         return 1;
//                     } else {
//                         return -1;
//                     }
//                 });
//                 ticketPrice = "$" + tickets[0].price;
//             }
//         }

//         let showBtn = 0;
//         if (event.ticket_type == "free") {
//             if (eventTickets && eventTickets.length > 0) {
//                 showBtn = 1;
//             } else {
//                 showBtn = 0;
//             }
//         } else {
//             showBtn = 1;
//         }

//         let guestEmailerName = guest.email.split("@");
//         console.log("guestEmailerName_______________________-", guestEmailerName);
//         let templateVars = {
//             base_url: process.env.UI_BASE_URL,
//             eventUrl: event_url,
//             encodedEventUrl: encodeURIComponent(event_url),
//             name: utils.toTitleCase(guest.name ? guest.name : guestEmailerName[0]),
//             buyTicketUrl: `${process.env.UI_BASE_URL}/ticket_type?ev=${event_id}`,
//             longitude: event.longitude,
//             latitude: event.latitude,
//             title: event.event_name,
//             category: categoryDisplayName[event.category],
//             categoryImg: `${process.env.UI_BASE_URL}/img/${event.category}.png`,
//             startDate: moment(event.start_date_time).format(dateFormat),
//             endDate: moment(event.end_date_time).format(dateFormat),
//             googleUrl: googleUrl,
//             image_url: image_url,
//             ticketType: event.ticket_type,
//             ticketPrice: ticketPrice,
//             org_name: utils.toTitleCase(
//                 user.first_name && user.last_name ? user.first_name + " " + user.last_name : user.username
//             ),
//             address: address,
//             showBtn: showBtn,
//             mailtosubject: encodeURIComponent(mailSubject),
//         };
//         console.log("templateVars=====", templateVars);
//         let body = _.template(tmpl)(templateVars);
//         return await AWSManager.sendEmail([guest.email], body, mailSubject);
//     }
// };

/**
 * Invite users to private events
 *
 * @param {object} data - event id and email list
 * @param {number} data.event_id - event_id of the event for invitation
 * param {object} data.event - event details
 * @param {Array<String>} data.email_list - The list of emails to invite
 * @param {Boolean} [createEvent=false] - Indicates if event is being created or updated
 *
 */
module.exports.updateUserInvitations = async (data, createEvent = false) => {
    const { event_id, email_list } = data;
    if (!event_id || !email_list || !email_list.length) return [];

    // delete all old invitations
    if (!createEvent) await DBManager.dataUpdate(privateEventInvitationsTable, { is_deleted: 1 }, { event_id });
    // bulk insert new invitations
    const bulkArray = [];
    email_list.forEach((email) => {
        bulkArray.push({
            event_id,
            email,
            invite_id: uuidv4(),
        });
    });

    // send email to each user

    await DBManager.bulkInsert(privateEventInvitationsTable, bulkArray);

    return bulkArray;
};
