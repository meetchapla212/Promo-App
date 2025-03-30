const awsRequestHelper = require('./../../lambda/common/awsRequestHelper');
const DBM = require('../common/mysqlmanager');
const DBManager = new DBM();
const moment = require('moment');
var builder = require('xmlbuilder');
const AWS = require('aws-sdk');
const S3 = new AWS.S3();
// var fs = require('fs');
const { errorMessages, successMessages } = require("../common/constants");

const pushDataToS3Bucket = async (xmlData, fileName, fileUrlArray) => {
    return new Promise(async (resolve, reject) => {
        let BUCKET_NAME = process.env.BUCKET_NAME;
        let BUCKET_IMAGE = 'sitemap';

        if (fileUrlArray) {
            let fileUrl = `${process.env.UI_BASE_URL}/${BUCKET_IMAGE}/${fileName}`;
            // let fileUrl = `https://${ BUCKET_NAME }.s3-${ process.env.REGION }.amazonaws.com/${ BUCKET_IMAGE }/${ fileName }`;
            fileUrlArray.push(fileUrl);
        } else {
            let fileUrl = `${process.env.UI_BASE_URL}/${fileName}`;
        }

        let params = {
            Body: xmlData,
            Bucket: BUCKET_NAME,
            ACL: 'public-read',
            ContentEncoding: 'utf-8',
            ContentType: 'application/xml',
            Key: fileUrlArray ? `${BUCKET_IMAGE}/${fileName}` :`${fileName}` 
        };
        
        return await S3.putObject(params).promise().then((res) => {
            resolve(res)
        }).catch(error => {
            resolve(true)
        });
    })
}

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let getActiveEventWithOutReqardQuery = 'SELECT event_id,event_name, category  FROM event_master WHERE status="active"';
        return await DBManager.runQuery(getActiveEventWithOutReqardQuery).then(async (events) => {
            if (events.length > 0) {
                let subXmlFilesUrls = [];
                let eventsCategoryWiseFilter = {};
                return await Promise.all(events.map((event) => {
                    event.event_name = event.event_name.replace(/[^a-zA-Z0-9 ]/g, "");
                    let event_name = event.event_name.replace(/\s+/g, '-').toLowerCase();
                    // event_name = event_name.replace(/['"&)(]+/g, '');
                    let event_url = `${process.env.UI_BASE_URL}/eventdetails/${event_name}/${event.event_id}`;

                    var categories = ["concerts", "festivals", "performing-arts", "community", "sports", "politics", "university-college", "eats-drinks"];
                    if (categories.includes(event.category)) {
                        if (eventsCategoryWiseFilter.hasOwnProperty(event.category) && Array.isArray(eventsCategoryWiseFilter[event.category])) {
                            eventsCategoryWiseFilter[event.category].push(event_url);
                        } else {
                            eventsCategoryWiseFilter[event.category] = [];
                            eventsCategoryWiseFilter[event.category].push(event_url);
                        }
                    }
                    return true;
                })).then(async () => {
                    return await Promise.all(Object.keys(eventsCategoryWiseFilter).map(async (category) => {
                        let eventCategoryUrls = eventsCategoryWiseFilter[category];
                        var root = builder.create('urlset', { encoding: 'utf-8' });
                        var subroot = root.att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')
                        eventCategoryUrls.map(eventUrl => {
                            var url = subroot.ele('url');
                            url.ele('loc', eventUrl);
                            url.ele('lastmod', moment.utc().format('YYYY-MM-DD HH:mm'));
                        })
                        var xml = root.end({ pretty: true });
                        let fileEnvName = process.env.SITEMAP_FILENAME;
                        let fileInitialName = fileEnvName.split(".")[0];
                        let fileName = `${fileInitialName}-${category}.xml`;

                        return await pushDataToS3Bucket(xml, fileName, subXmlFilesUrls);
                    })).then(async () => {
                        
                        let publicUrls = [
                            process.env.UI_BASE_URL + '/event_organiser',
                            process.env.UI_BASE_URL + '/pricing',
                            process.env.UI_BASE_URL + '/about_us',
                            process.env.UI_BASE_URL + '/terms_of_use',
                            process.env.UI_BASE_URL + '/cookies_policy',
                            process.env.UI_BASE_URL + '/signup',
                            process.env.UI_BASE_URL + '/login',
                        ];

                        var root = builder.create('urlset', { encoding: 'utf-8' });
                        var subroot = root.att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')
                        publicUrls.map(publicUrl => {
                            var url = subroot.ele('url');
                            url.ele('loc', publicUrl);
                            url.ele('lastmod', moment.utc().format('YYYY-MM-DD'));
                        })
                        var xml = root.end({ pretty: true });
                        let fileEnvName = process.env.SITEMAP_FILENAME;
                        let fileInitialName = fileEnvName.split(".")[0];
                        let fileName = `${fileInitialName}-public.xml`;

                        return await pushDataToS3Bucket(xml, fileName, subXmlFilesUrls);
                    }).then(async () => {
                        var root = builder.create('urlset', { encoding: 'utf-8' });
                        var subroot = root.att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')
                        subXmlFilesUrls.map(fileUrl => {
                            var url = subroot.ele('url');
                            url.ele('loc', fileUrl);
                            url.ele('lastmod', moment.utc().format('YYYY-MM-DD'));
                        })
                        var xml = root.end({ pretty: true });
                        let fileName = process.env.SITEMAP_FILENAME;

                        return await pushDataToS3Bucket(xml, fileName);
                    }).then(() => {
                        response = { success: true, message: successMessages.SUCCESS }
                        return awsRequestHelper.respondWithJsonBody(200, response);
                    }).catch((error) => {
                        console.error("error : ", error);
                        response = { success: false, message: error.message }
                        return awsRequestHelper.respondWithJsonBody(200, response);
                    })
                }).catch(error => {
                    console.error("error : ", error);
                    response = { success: true, message: error.message }
                    return awsRequestHelper.respondWithJsonBody(200, response);
                });
            } else {
                response = { success: true, message: successMessages.ACTIVE_EVENTS_NOT_FOUND }
                return awsRequestHelper.respondWithJsonBody(200, response);
            }
        });
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
}