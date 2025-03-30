const moment = require('moment');
const AWS = require('aws-sdk');
const lambda = new AWS.Lambda();
const rp = require('request-promise');
const ITEMS_PER_PAGE = 50;
const EVENTFULL_EVENTS_BASE_URL = "http://api.eventful.com/json/events/search?";
const EVENTFULL_KEY = process.env.EVENTFULL_KEY;
const ES_DATE_FORMAT = "YYYY-MM-DD HH:mm:ss";
const EVENTFULL_DATE_FORMAT = "YYYYMMDD";
const dynamodb = new AWS.DynamoDB.DocumentClient({
    region: process.env.REGION
});
const BATCH_SIZE = 25;
let pexelImagesMapping = {};
// This function is used to invoke add events lambda
const invokeLambda = (events) => {
    let event = {
        body: JSON.stringify(events)
    }
    console.log('-------', event)
    let params = {
        FunctionName: process.env.LAMBDA_POST_EVENTS_TO_QB,
        InvocationType: 'Event',
        LogType: 'Tail',
        Payload: JSON.stringify(event)
    };
    return lambda.invoke(params).promise();
};
const findCategory = (cateName) => {
    mainCat = '';
    switch (cateName) {
        case 'music': case 'singles_social':
            mainCat = 'concerts';
            break;

        case 'comedy': case 'movies_film': case 'performing_arts':
            mainCat = 'performing-arts';
            break;

        case 'festivals_parades': case 'art':
            mainCat = 'festivals';
            break;

        case 'support': case 'outdoors_recreation': case 'sports':
            mainCat = 'sports';
            break;

        case 'family_fun_kids': case 'fundraisers':
        case 'attractions': case 'community': case 'business':
        case 'clubs_associations': case 'animals': case 'religion_spirituality':
            mainCat = 'community';
            break;

        case 'conference':
            mainCat = 'conferences';
            break;

        case 'learning_education': case 'schools_alumni': case 'books':
            mainCat = 'university-college';
            break;
        case 'food':
            mainCat = 'eats-drinks';
            break;
        default:
            mainCat = 'concerts';
            break;

    }
    return mainCat;
}
const getImageFromPexel = async function (category) {

    let categoryToSend = category;
    if (category && category == 'concerts') {
        categoryToSend = 'concert';
    } else if (category && category == 'festivals') {
        categoryToSend = 'festival';
    }
    console.log('Inside getImageFromPexel:', category);
    let imageParams = {
        TableName: process.env.IMAGES_TABLE,
        KeyConditionExpression: "category = :ct",
        ExpressionAttributeValues: {
            ":ct": categoryToSend
        }
    };

    try {
        let imageRows = await dynamodb.query(imageParams).promise();
        // console.log('imageRows----------------------', imageRows)
        if ("Items" in imageRows && imageRows.Items.length > 0) {
            let resultImagesURL = imageRows.Items;
            resultImagesURL.map((item) => {
                item.src = {
                    "landscape": item.image
                };
                return item;
            });
            pexelImagesMapping[category] = resultImagesURL;
            return resultImagesURL[Math.floor(Math.random() * resultImagesURL.length)].image;
        }
        else {
            let options = {
                method: 'GET',
                uri: `https://api.pexels.com/v1/search?query=${categoryToSend}&per_page=80&page=1`,
                headers: {
                    'Authorization': process.env.PEXELS_AUTHORIZATION_KEY
                }
            };
            let res = await rp(options).then(res => {
                console.log('rs===>', res)
                return res;
            }).catch(error => {
                console.error("error : ", error)
                return '';
            });

            // console.log(res);
            if (res) {
                res = JSON.parse(res);
                if (res && res.photos && res.photos.length > 0) {
                    let resultImagesURL = res.photos;
                    pexelImagesMapping[category] = resultImagesURL;

                    let timeToLive = Math.floor(moment.utc().add(10, 'days').valueOf() / 1000);
                    let allImages = [];
                    resultImagesURL.forEach((element, index) => {
                        let imageURL = element.src.landscape;
                        if (imageURL) {
                            // This is done for the UI adjustment
                            imageURL = imageURL.replace("w=1200", "w=1700");
                            let obj = {
                                "category": categoryToSend,
                                "image": imageURL,
                                "id": element.id + "",
                                "delete_in": timeToLive
                            };
                            allImages.push(obj);
                        }
                    });
                    await addImagesToDb(allImages);

                    let randomIndexOfImages = Math.floor(Math.random() * resultImagesURL.length);
                    // console.log(randomIndexOfImages);
                    // console.log(resultImagesURL[randomIndexOfImages]);
                    let imageIndex = resultImagesURL[randomIndexOfImages];
                    await Promise.resolve(imageIndex);
                    return imageIndex.src.original;
                } else {
                    return null;
                }
            } else {
                return null;
            }
        }
    } catch (error) {
        console.error("error : ", error);
        return null;
    }
};
// This function gets event from GPL
const getEvents = async (url, page, total) => {

    console.log('getEvents', url, page, total);
    url += '&page_size=150';
    let options = {
        method: 'GET',
        uri: url
    };
    let response = await rp(options);
    // console.log('Got response', response);
    if (response) {
        response = JSON.parse(response);

        // finalEvents = finalEvents.concat(response.results);
        // console.log('next page url:', response.next, pageno, MAX_NO_OF_PAGES_FROM_PHQ);
        // if (response.next && pageno < MAX_NO_OF_PAGES_FROM_PHQ) {
        //     pageno = pageno + 1;
        //     return getEventsFromPhQByPage(response.next, pageno, finalEvents);
        // } else {
        //     console.log('Resolving final events:', finalEvents);
        //     return Promise.resolve(finalEvents);
        // }
        console.log('response.statusCode', response.events.event.length)
        if (response) {
            let resp = response.events;
            console.log('resp.events.event.length', resp.event.length)
            if ("total_items" in response && response.total_items > 0 && response.events && resp.event.length > 0) {
                // console.log('==============return Count added=============', (resp.total_items * 1));
                // returnTotoalCount = (resp.total_items * 1);
                // let categoryOfEvents = resp.events.event.map(value => ('category' in value.categories) ? value.categories.category[0].id : '');
                // console.log('categoryOfEvents=======', categoryOfEvents)
                let finalEvents = [];
                for (let eachResp of resp.event) {
                    let category = ('category' in eachResp.categories) ? eachResp.categories.category[0].id : '';
                    category = await findCategory(category);
                    let eventImage = await getImageFromPexel(category)

                    console.log('category=====', category)
                    console.log('eventImage=====', eventImage)
                    let address = [];

                    if (eachResp.venue_address) {
                        address.push(eachResp.venue_address);
                    }
                    if (eachResp.region_name) {
                        address.push(eachResp.region_name);
                    }
                    if (eachResp.city_name) {
                        address.push(eachResp.city_name);
                    }
                    if (eachResp.country_name) {
                        address.push(eachResp.country_name);
                    }
                    if (eachResp.postal_code) {
                        address.push(eachResp.postal_code);
                    }
                    let venueAddress = `${address.join(', ')}`;
                    let eachEvent = {
                        // "event_name": eachResp.title,
                        // "event_image": eventImage && eventImage != '' ? eventImage : '',
                        // "description": (eachResp.description) ? eachResp.description : '',
                        // "PHQEventID": eachResp.id,
                        // "isPHQ": 1,
                        // "category": category,
                        // "start_date_time": moment(eachResp.start_time).format(ES_DATE_FORMAT),
                        // "start_date_time_ms": moment(eachResp.start_time).valueOf(),
                        // "end_date_time": eachResp.stop_time ? moment(eachResp.stop_time).add(1, "day").format(ES_DATE_FORMAT) : moment(eachResp.start_time).add(1, "day").format(ES_DATE_FORMAT),
                        // "end_date_time_ms": eachResp.stop_time ? moment(eachResp.stop_time).add(1, "day").valueOf() : moment(eachResp.start_time).add(1, "day").valueOf(),
                        // "start_date_utc": moment(eachResp.start_time).format(ES_DATE_FORMAT),
                        // "end_date_utc": eachResp.stop_time ? moment(eachResp.stop_time).add(1, "day").format(ES_DATE_FORMAT) : moment(eachResp.start_time).add(1, "day").format(ES_DATE_FORMAT),
                        // "event_location": JSON.stringify([(eachResp.longitude * 1), (eachResp.latitude * 1)]),
                        // "latitude": (eachResp.latitude * 1),
                        // "longitude": (eachResp.longitude * 1),
                        // "event_type": 'public',
                        // "address": venueAddress,
                        // 'state': eachResp.region_name ? eachResp.region_name : '',
                        // 'city': eachResp.city_name ? eachResp.city_name : '',
                        // 'country': eachResp.country_name ? eachResp.country_name : '',
                        // 'zipcode': eachResp.postal_code ? eachResp.postal_code : ''

                        id: eachResp.id,
                        category: category,
                        description: (eachResp.description) ? eachResp.description : '',
                        title: eachResp.title,
                        location: [(eachResp.latitude * 1), (eachResp.longitude * 1)],
                        start: moment(eachResp.start_time).format(ES_DATE_FORMAT),
                        end: eachResp.stop_time ? moment(eachResp.stop_time).add(1, "day").format(ES_DATE_FORMAT) : moment(eachResp.start_time).add(1, "day").format(ES_DATE_FORMAT),
                        entities: {
                            venues: [{ name: venueAddress }]
                        },
                        image: eventImage && eventImage != '' ? eventImage : '',


                    };

                    // responses.push(eachEvent);
                    finalEvents.push(eachEvent)
                }
                await invokeLambda(finalEvents);
            }
            // console.log("phqEvents", responses);
            // if (responses && responses.length > 0) {
            //     let saveResp = await saveEvents(responses);
            // }
            // return resolve({ total_counts: returnTotoalCount })
            return true;

        }

    }
};
const eventfulCatFind = (maincat) => {
    console.log('maincat========================', maincat)
    subcat = '';
    switch (maincat) {
        case 'concerts':
            subcat = 'music,singles_social';
            break;

        case 'performing-arts':
            subcat = 'comedy,movies_film,performing_arts';
            break;

        case 'festivals':
            subcat = 'festivals_parades,art,food';
            break;

        case 'sports':
            subcat = 'support,outdoors_recreation,sports';
            break;

        case 'community':
            subcat = 'family_fun_kids,fundraisers,books,business,religion_spirituality,animals,clubs_associations,community,attractions';
            break;

        case 'conferences':
            subcat = 'conference';
            break;
        case 'university-college':
            subcat = 'learning_education,schools_alumni,books';
            break;

        case 'eats-drinks':
            subcat = 'food';
            break;

        default:
            break;
    }
    console.log('maincat========================', subcat)
    return subcat;

}
// This is the main function to get events from GPL
module.exports.handler = async (event, context, callback) => {
    console.log('Got event', JSON.stringify(event));
    try {
        // event = JSON.parse(event);
        // event = JSON.parse(event.body);
        // console.log('=====', typeof event.body);
        if (event && event.lat && event.long) {
            // let url = `${ process.env.GPL_BASE_URL }/events?items_per_page=${ ITEMS_PER_PAGE }&start=${ moment.utc().add('7', 'days').valueOf() }&end=${ moment.utc().add('14', 'days').valueOf() }&within=5&lat=${ event.lat }&long=${ event.long }&api_key=${ process.env.GPL_API_KEY }`;
            // let categories = process.env.categories;
            // if (categories) {
            //     url += '&category=' + categories;
            // }
            let searchCat = [];
            let url = EVENTFULL_EVENTS_BASE_URL;
            let categories = process.env.categories;
            categories = categories.split(",");
            for (let category of categories) {
                category = await eventfulCatFind(category.toLowerCase())
                searchCat.push(category)
            }
            console.log('------------------------------', searchCat)
            url += "&";
            let categoriesForPHQ = searchCat.join(",");
            url += ("category=" + categoriesForPHQ);
            let radius = 30;//30mi
            url += "&within=" + radius + "&units=km&location=" + event.lat + "," + event.long + "&sort=start";
            url += '&include=categories';
            // if ("startDate" in qp && "endDate" in qp) {
            let start = moment.utc().add('7', 'days').format('YYYYMMDD');
            let end = moment.utc().add('14', 'days').format('YYYYMMDD');
            url += ("&date=" + start + "00-" + end + "00");
            url += '&app_key=' + EVENTFULL_KEY;
            // }
            console.log(url);
            // return;
            await getEvents(url, 0, null);
        }
    } catch (e) {
        console.log(e);
    }
    return "Finished";
}