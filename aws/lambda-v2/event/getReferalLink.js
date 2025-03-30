const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const Joi = require('joi');
const request = require('request');
const MDB = require("./../common/mysqlmanager");
const utils = require('../common/utils');
const MDBObject = new MDB();
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.REGION
});
const { errorMessages, successMessages } = require("../common/constants");

const validate = function (body) {
    const schema = Joi.object().keys({
        event_id: Joi.required(),
        social_type: Joi.string().required()
    });
    return new Promise((resolve, reject) => {
        Joi.validate(body, schema, {
            abortEarly: false
        }, function (error, value) {
            if (error) {
                reject({ status_code: 400, message: error.details[0].message });
            } else {
                resolve(value);
            }
        });
    });
}

//Remove html tag from description
let strip_html_tags = (str) => {
    if ((str === null) || (str === '')) {
        return false;
    } else {
        var string = str.toString();
        return string.replace(/<[^>]*>/g, '');
    }
};

//generate dynamic link for event
const generateEventDynamicLink = (event, userId, socialType) => {
    if (event.event_description) {
        event.event_description = strip_html_tags(event.event_description);
    }

    return new Promise((resolve, reject) => {
        let event_name = event.event_name.replace(/\s+/g, '-').toLowerCase();
        request({
            url: `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=AIzaSyC5Bis-UR8qn16xDukoGHJkIMa8Q8nv7XI`,
            method: 'POST',
            json: true,
            body: {
                "dynamicLinkInfo": {
                    "domainUriPrefix": "https://thepromoapp.page.link",
                    "link": `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event.event_id}?ref=${userId}&social=${socialType}`,
                    "androidInfo": {
                        "androidPackageName": "com.thepromoapp.promo",
                        "androidFallbackLink": "https://play.google.com/store/apps/details?id=com.thepromoapp.promo"
                    },
                    "iosInfo": {
                        "iosBundleId": "com.thepromoapp.promo",
                        "iosCustomScheme": "promoapp",
                        "iosFallbackLink": "https://apps.apple.com/in/app/the-promo-app/id1075964954",
                        "iosIpadFallbackLink": "https://apps.apple.com/in/app/the-promo-app/id1075964954",
                        "iosIpadBundleId": "com.thepromoapp.promo"
                    },
                    "socialMetaTagInfo": {
                        "socialTitle": event.event_name,
                        "socialDescription": event.event_description,
                        "socialImageLink": event.event_image
                    }
                }
            }
        }, function (error, response) {
            if (error) {
                return reject(error);
            } else {
                if (response && response.statusCode == 200) {
                    console.log('Dynamic Link :', response.body);
                    return resolve(response.body)
                } else {
                    console.log('Error on Request :', response.body.error.message)
                    return reject(response.body.error.message);
                }
            }
        });
    })
}

//save dynamic link
const saveUserSocialDynamicLink = async (data, dynamic_link) => {
    var socialType = data.social_type.toLowerCase();
    let userLinkId = `${data.user_id}_${data.event_id}_${socialType}`;

    var params = {
        TableName: 'promo_event_links_test',
        Item: {
            user_link_id: userLinkId,
            dynamicLink: dynamic_link,
            createdAt: new Date().toISOString()
        }
    }

    return await dynamodb.put(params).promise();
}

//check dynamic link exists for user social type
const checkUserSocialDynalicLinkExists = async (data) => {
    var socialType = data.social_type.toLowerCase();
    let userLinkId = `${data.user_id}_${data.event_id}_${socialType}`;
    console.log("---userLinkId", userLinkId)

    let params = {
        TableName: 'promo_event_links_test',
        KeyConditionExpression: "user_link_id=:id",
        ExpressionAttributeValues: {
            ":id": userLinkId
        },
        ProjectionExpression: "dynamicLink"
    };

    return await dynamodb.query(params).promise();
}

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };

    try {
        let user = await utils.verifyUser(event.headers.Authorization);
        let apiData = JSON.parse(event.body);
        await validate(apiData);

        let userId = user.id;
        let socialTypes = apiData.social_type;
        let eventId = apiData.event_id;
        let eventDetails = {};

        await MDBObject.getData("event_master", "event_id, event_name, event_image, description", { event_id: eventId }).then(eventData => {
            eventDetails = eventData[0];
            return eventDetails;
        })

        var userSocialTypesArray = socialTypes.split(",");
        return await Promise.all(userSocialTypesArray.map(async (socialType) => {
            socialType = socialType.trim();

            var data = {
                user_id: userId,
                event_id: eventId,
                social_type: socialType
            }

            var userSocialDynamicLinkResponse = await checkUserSocialDynalicLinkExists(data);
            if (userSocialDynamicLinkResponse && userSocialDynamicLinkResponse.Count > 0) {
                return { [socialType]: userSocialDynamicLinkResponse.Items[0].dynamicLink };
            } else {
                //generate link
                if (eventDetails) {
                    let dataObj = {
                        event_id: eventDetails.event_id,
                        event_name: eventDetails.event_name,
                        event_image: eventDetails.event_image,
                        event_description: eventDetails.description.substring(0, 100),
                    }
                    let eventDynamicLinkResult = await generateEventDynamicLink(dataObj, userId, socialType);
                    if (eventDynamicLinkResult && ('shortLink' in eventDynamicLinkResult)) {
                        await saveUserSocialDynamicLink(data, eventDynamicLinkResult.shortLink)
                        return { [socialType]: eventDynamicLinkResult.shortLink }
                    } else {
                        return { [socialType]: null }
                    }
                } else {
                    return { [socialType]: null }
                }
            }
        })).then((userSocialDynamicLinkRespose) => {
            response = { success: true, message: successMessages.USER_SOCIAL_DYNAMIC_LINK_FOUND, data: userSocialDynamicLinkRespose }
            return awsRequestHelper.respondWithJsonBody(200, response);
        }).catch(error => {
            console.error("error : ", error);
            return awsRequestHelper.respondWithJsonBody(500, response);
        })
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};