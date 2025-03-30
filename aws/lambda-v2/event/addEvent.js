const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require("joi");
const request = require("request");
const MDB = require("./../common/mysqlmanager");
const utils = require("../common/utils");
const MDBObject = new MDB();
const AWSManager = require("../common/awsmanager");
const dateFormat = "ddd, MMMM D, YYYY [at] hh:mm A";
const moment = require("moment");
const momentTz = require("moment-timezone");
const dateFormatDB = "YYYY-MM-DD HH:mm:ss";
const fs = require("fs");
const _ = require("lodash");
const { updateUserInvitations } = require("./updateUserInvitations");
// const md5 = require("md5");
const categoryDisplayName = {
    concerts: "Concerts",
    festivals: "Festivals",
    "programing-arts": "Performing arts",
    "performing-arts": "Performing arts",
    community: "Community",
    sports: "Sports",
    politics: "Rally"
};
const { errorMessages, successMessages, stringMessages, emailAndPushNotiTitles } = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        is_draft: Joi,
        description: Joi.string().allow(""),
        event_type: Joi.string().allow(""),
        event_image: Joi.string().allow(""),
        address: Joi.string().allow(""),
        sponsored_event: Joi,
        isPHQ: Joi,
        guest: Joi.string().allow(""),
        start_date_time: Joi.string().allow(""),
        end_date_time: Joi.string().allow(""),
        longitude: Joi.allow(""),
        latitude: Joi.allow(""),
        category: Joi.string().allow(""),
        event_name: Joi.string().allow(""),
        phone: Joi.allow(""),
        email: Joi.string().allow(""),
        ticket_type: Joi.string().allow(""),
        admission_ticket_type: Joi.allow(""),
        timezone: Joi.string().allow(""),
        venue_is: Joi.string().allow(""),
        street_address: Joi.string().allow(""),
        address_state: Joi.string().allow(""),
        city: Joi.string().allow(""),
        country_code: Joi.string().allow(""),
        country: Joi.string().allow(""),
        zipcode: Joi.string().allow(""),
        privacy_type: Joi.number().optional(),
        event_access_type: Joi.number().when("privacy_type", {
            is: Joi.equal(2),
            then: Joi.required(),
            otherwise: Joi.optional(),
        }),
        password: Joi.string().when("event_access_type", {
            is: Joi.equal(3),
            then: Joi.required(),
            otherwise: Joi.optional(),
        }),
        private_invitation_list: Joi.array().items(Joi.string()).optional(),
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false,
            allowUnknown: true
        }, function (error, value) {
            if (error) {
                reject({ status_code: 400, message: error.details[0].message });
            } else {
                resolve(value);
            }
        });
    });
}

// a very unoptimised function
const sendMailToPrivateEventGuest = async function (event, guest, event_id, eventTickets, user, address) {
    if (guest.email && guest.email !== "") {
        event = await MDBObject.getData("event_master", "*", { event_id: event_id }).then((dataEvent) => {
            return dataEvent[0];
        });
        console.log("--address", event);
        console.log("--called mail function-----------");
        let event_name = event.event_name.replace(/\s+/g, "-").toLowerCase();
        // $scope.rewardUrl = base_url + "/eventdetails/" + event_name + '/' + $scope.event_details.event_id + "?ref=" + $scope.userDetails.user_id;
        let tmpl = fs.readFileSync("./lambda/emailtemplates/invite-attendee-to-private-event.html", "utf8");
        let mailSubject = emailAndPushNotiTitles.YOU_ARE_NOT_INVITED_TO + event.event_name;
        let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event_id}?invite_id=${guest.invite_id}`;

        let googleUrl = "https://maps.google.com/?ll=" + event.latitude + "," + event.longitude;
        let image_url = event.event_image;
        let ticketPrice = "FREE";
        if (event.ticket_type && event.ticket_type === "paid") {
            if (eventTickets) {
                let tickets = eventTickets;
                tickets = tickets.filter((t) => !t.status || t.status == "active");
                tickets = tickets.sort((a, b) => {
                    if ("price" in a && "price" in b) {
                        return a.price - b.price;
                    } else if ("price" in a) {
                        return -1;
                    } else if ("price" in b) {
                        return 1;
                    } else {
                        return -1;
                    }
                });
                ticketPrice = "$" + tickets[0].price;
            }
        }

        let showBtn = 0;
        if (event.ticket_type == "free") {
            if (eventTickets && eventTickets.length > 0) {
                showBtn = 1;
            } else {
                showBtn = 0;
            }
        } else {
            showBtn = 1;
        }

        let guestEmailerName = guest.email.split("@");
        console.log("guestEmailerName_______________________-", guestEmailerName);
        let templateVars = {
            base_url: process.env.UI_BASE_URL,
            eventUrl: event_url,
            encodedEventUrl: encodeURIComponent(event_url),
            name: utils.toTitleCase(guest.name ? guest.name : guestEmailerName[0]),
            buyTicketUrl: `${process.env.UI_BASE_URL}/ticket_type?ev=${event_id}`,
            longitude: event.longitude,
            latitude: event.latitude,
            title: event.event_name,
            category: categoryDisplayName[event.category],
            categoryImg: `${process.env.UI_BASE_URL}/img/${event.category}.png`,
            startDate: moment(event.start_date_time).format(dateFormat),
            endDate: moment(event.end_date_time).format(dateFormat),
            googleUrl: googleUrl,
            image_url: image_url,
            ticketType: event.ticket_type,
            ticketPrice: ticketPrice,
            org_name: utils.toTitleCase(
                user.first_name && user.last_name ? user.first_name + " " + user.last_name : user.username
            ),
            address: address,
            showBtn: showBtn,
            mailtosubject: encodeURIComponent(mailSubject),
        };
        console.log("templateVars=====", templateVars);
        let body = _.template(tmpl)(templateVars);
        return await AWSManager.sendEmail([guest.email], body, mailSubject);
    }
};

const sendMailToGuest = async function (event, guest, event_id, eventTickets, user, address) {
    if (guest.email && guest.email !== "") {
        event = await MDBObject.getData("event_master", "event_name, latitude, longitude, event_image, ticket_type, start_date_time, end_date_time, category", {
            event_id: event_id
        }).then(dataEvent => {
            return dataEvent[0];
        })
        let event_name = event.event_name.replace(/\s+/g, "-").toLowerCase();
        let tmpl = fs.readFileSync("./lambda/emailtemplates/invite-attendee-free-without-tickets.html", "utf8");
        let mailSubject = emailAndPushNotiTitles.YOU_ARE_NOT_INVITED_TO + event.event_name;
        let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event_id}`;

        let googleUrl = "https://maps.google.com/?ll=" + event.latitude + "," + event.longitude;
        let image_url = event.event_image;
        let ticketPrice = "FREE";
        if (event.ticket_type && event.ticket_type === "paid") {
            if (eventTickets) {
                let tickets = eventTickets;
                tickets = tickets.filter((t) => !t.status || t.status == "active");
                tickets = tickets.sort((a, b) => {
                    if ("price" in a && "price" in b) {
                        return a.price - b.price;
                    } else if ("price" in a) {
                        return -1;
                    } else if ("price" in b) {
                        return 1;
                    } else {
                        return -1;
                    }
                });
                ticketPrice = "$" + tickets[0].price;
            }
        }

        let showBtn = 0;
        if (event.ticket_type == "free") {
            if (eventTickets && eventTickets.length > 0) {
                showBtn = 1;
            } else {
                showBtn = 0;
            }
        } else {
            showBtn = 1;
        }

        let guestEmailerName = guest.email.split("@");
        let templateVars = {
            base_url: process.env.UI_BASE_URL,
            eventUrl: event_url,
            encodedEventUrl: encodeURIComponent(event_url),
            name: utils.toTitleCase(guest.name ? guest.name : guestEmailerName[0]),
            buyTicketUrl: `${process.env.UI_BASE_URL}/ticket_type?ev=${event_id}`,
            longitude: event.longitude,
            latitude: event.latitude,
            title: event.event_name,
            category: categoryDisplayName[event.category],
            categoryImg: `${process.env.UI_BASE_URL}/img/${event.category}.png`,
            startDate: moment(event.start_date_time).format(dateFormat),
            endDate: moment(event.end_date_time).format(dateFormat),
            googleUrl: googleUrl,
            image_url: image_url,
            ticketType: event.ticket_type,
            ticketPrice: ticketPrice,
            org_name: utils.toTitleCase(user.first_name && user.last_name ? user.first_name + " " + user.last_name : user.username),
            address: address,
            showBtn: showBtn,
            mailtosubject: encodeURIComponent(mailSubject)
        };
        let body = _.template(tmpl)(templateVars);
        return await AWSManager.sendEmail([guest.email], body, mailSubject);
    }
}

//Remove html tag from description
let strip_html_tags = (str) => {
    if (str === null || str === "") {
        return false;
    } else {
        var string = str.toString();
        return string.replace(/<[^>]*>/g, "");
    }
};

//generate dynamic link for event
const generateEventDynamicLink = (event) => {
    if (event.event_description) {
        event.event_description = strip_html_tags(event.event_description);
    }

    return new Promise((resolve, reject) => {
        let event_name = event.event_name.replace(/\s+/g, "-").toLowerCase();
        request({
            url: `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=AIzaSyC5Bis-UR8qn16xDukoGHJkIMa8Q8nv7XI`,
            method: "POST",
            json: true,
            body: {
                dynamicLinkInfo: {
                    domainUriPrefix: "https://thepromoapp.page.link",
                    link: `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event.event_id}`,
                    androidInfo: {
                        androidPackageName: "com.thepromoapp.promo",
                        androidFallbackLink: "https://play.google.com/store/apps/details?id=com.thepromoapp.promo"
                    },
                    iosInfo: {
                        iosBundleId: "com.thepromoapp.promo",
                        iosCustomScheme: "promoapp",
                        iosFallbackLink: "https://apps.apple.com/in/app/the-promo-app/id1075964954",
                        iosIpadFallbackLink: "https://apps.apple.com/in/app/the-promo-app/id1075964954",
                        iosIpadBundleId: "com.thepromoapp.promo"
                    },
                    socialMetaTagInfo: {
                        socialTitle: event.event_name,
                        socialDescription: event.event_description,
                        socialImageLink: event.event_image
                    }
                }
            }
        }, function (error, response) {
            if (error) {
                console.error("error : ", error);
                return reject(error);
            } else {
                if (response && response.statusCode == 200) {
                    console.log("Dynamic Link :", response.body);
                    return resolve(response.body)
                } else {
                    console.log("Error on Request :", response.body.error.message)
                    return reject(response.body.error.message);
                }
            }
        });
    })
}

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let apiData = JSON.parse(event.body);
        await validate(apiData);
        console.log(apiData)

        var loggedUserDetails = {};
        await MDBObject.getData("user_master", "first_name, last_name, username", { user_id: user.id }).then(result => {
            loggedUserDetails = result[0];
            return loggedUserDetails;
        })

        apiData._user_id = user["id"];
        if (apiData.event_admin && apiData.event_admin.length > 0) {
            apiData.event_admin = JSON.stringify(apiData.event_admin);
        }
        let address = [];
        let eventTickets = [];
        let guestUsers = [];
        var eventId;
        if (apiData.street_address) {
            address.push(apiData.street_address);
        }
        if (apiData.address_state) {
            address.push(apiData.address_state);
        }
        if (apiData.city) {
            address.push(apiData.city);
        }
        if (apiData.country) {
            address.push(apiData.country);
        }
        if (apiData.zipcode) {
            address.push(apiData.zipcode);
        }
        if (typeof apiData.longitude == "string") {
            apiData.longitude = parseFloat(apiData.longitude);
        }
        if (typeof apiData.latitude == "string") {
            apiData.latitude = parseFloat(apiData.latitude);
        }

        apiData.address = `${address.join(", ")}`;
        apiData.event_location = JSON.stringify([apiData.latitude, apiData.longitude]);

        const { private_invitation_list } = apiData;
        delete apiData.private_invitation_list;

        // hash password before storing
        // if (apiData.password) apiData.password = md5(apiData.password);
        if (apiData.password) apiData.password = apiData.password;

        if (apiData.tickets) {
            eventTickets = apiData.tickets;
            eventTickets.ticket_type = apiData.ticket_type ? apiData.ticket_type : "free";
            delete apiData.tickets;
        }
        if (apiData.guest_user && apiData.guest_user.length > 0) {
            guestUsers = apiData.guest_user;
            delete apiData.guest_user;
        }
        if (apiData.event_admin && apiData.event_admin.length > 0) {
            apiData.event_admin = JSON.stringify(apiData.event_admin);
        }
        if (apiData.timezone && apiData.timezone != "") {
            apiData.end_date_utc = momentTz.tz(apiData.end_date_time, dateFormatDB, apiData.timezone).utc().format(dateFormatDB);
            apiData.start_date_utc = momentTz.tz(apiData.start_date_time, dateFormatDB, apiData.timezone).utc().format(dateFormatDB);
        }

        return MDBObject.dataInsert("event_master", apiData).then(async (data) => {
            eventId = data.insertId;
            let dataObj = {
                event_id: data.insertId,
                event_name: apiData.event_name,
                event_image: apiData.event_image,
                event_description: apiData.description
            }

            let eventDynamicLinkResult = await generateEventDynamicLink(dataObj);
            if (eventDynamicLinkResult && "shortLink" in eventDynamicLinkResult) {
                await MDBObject.dataUpdate("event_master", { dynamic_link: eventDynamicLinkResult.shortLink }, { event_id: data.insertId });
            }

            if (eventTickets.length > 0) {
                await Promise.all(
                    eventTickets.map(async ticketDetails => {
                        ticketDetails._event_id = data.insertId;
                        ticketDetails.remaining_qty = ticketDetails.quantity;
                        ticketDetails.currency_code = stringMessages.USD;
                        await MDBObject.dataInsert("event_tickets", ticketDetails);
                        return ticketDetails;
                    })
                )
            }
            if (guestUsers.length > 0) {
                await Promise.all(
                    guestUsers.map(async guestUserDetails => {
                        if ("group" in guestUserDetails) {
                            var groupData = guestUserDetails.group;
                            var groupObj = {
                                group_name: groupData.group_name,
                                _user_id: user.id
                            }

                            var groupSaveResponse = await MDBObject.dataInsert("user_group", groupObj);
                            var groupId = groupSaveResponse.insertId;

                            if (groupData.members && groupData.members.length > 0) {
                                await Promise.all(
                                    groupData.members.map(async (member) => {
                                        var memberObj = {
                                            _group_id: groupId,
                                            email: member.email,
                                            type: member.type,
                                            name: member.name,
                                            _event_id: eventId
                                        }

                                        if ("user_id" in member) {
                                            memberObj["user_id"] = member.user_id;
                                        }
                                        return memberObj;
                                    })
                                ).then(async (allMemberDetails) => {
                                    await MDBObject.bulkInsert("guest_users", allMemberDetails);
                                    return allMemberDetails;
                                }).then(async (allMemberDetails) => {
                                    return await Promise.all(
                                        allMemberDetails.map(async (member) => {
                                            return await sendMailToGuest(apiData, member, data.insertId, eventTickets, loggedUserDetails, apiData.address);
                                        })
                                    )
                                })
                            }
                        } else {
                            var guestDetails = {}
                            if (guestUserDetails.user_id) {
                                guestDetails._user_id = guestUserDetails.user_id;
                                delete guestUserDetails.user_id;
                            }
                            if ("group_id" in guestUserDetails) {
                                guestDetails._group_id = guestUserDetails.group_id;
                                delete guestUserDetails.group_id;
                            }
                            guestDetails.email = guestUserDetails.email;
                            guestDetails.type = guestUserDetails.type.toLowerCase();
                            guestDetails._event_id = data.insertId;
                            await sendMailToGuest(apiData, guestUserDetails, data.insertId, eventTickets, loggedUserDetails, apiData.address)
                            return await MDBObject.dataInsert("guest_users", guestDetails)
                        }
                    })
                )
            }

            if (private_invitation_list) {
                const userList = await updateUserInvitations({
                    event_id: eventId,
                    email_list: private_invitation_list,
                });
                userList.forEach((user) => {
                    sendMailToPrivateEventGuest(
                        apiData,
                        user,
                        data.insertId,
                        eventTickets,
                        loggedUserDetails,
                        apiData.address
                    );
                });
            }

            response = { success: true, message: successMessages.EVENT_CREATED, event_id: data.insertId }
            return awsRequestHelper.respondWithJsonBody(200, response);
        }).catch((error) => {
            console.error("error : ", error);
            return awsRequestHelper.respondWithJsonBody(500, response);
        });
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};