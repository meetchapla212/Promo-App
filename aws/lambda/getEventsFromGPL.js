const moment = require('moment');
const AWS = require('aws-sdk');
const lambda = new AWS.Lambda();
const rp = require('request-promise');
const ITEMS_PER_PAGE = 50;

// This function is used to invoke add events lambda
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

// This function gets event from GPL
const getEvents = async (url,page,total) => {

    console.log('getEvents', url,page,total);
    url+='&page_no='+page;
    let options = {
        method: 'GET',
        uri: url
    };
    let response = await rp(options);
    console.log('Got response',response);
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
        if(total === null){
            total = response.total;
        }
        if('results' in response && response.results && response.results.length>0){
            // Map each event as per Add event lambda
            total = total - ITEMS_PER_PAGE;
            let finalEvents = [];
            for(let event of response.results){
                let qbEvent = {
                    id: event.id,
                    category: (event.category?event.category.toLowerCase():''),
                    description: event.description,
                    title: event.title,
                    location: [event.location[0],event.location[1]],
                    start: event.startDate,
                    end: event.endDate,
                    entities:{
                        venues:[{name: (event.address || '')}]
                    },
                    image: event.image
                }

                finalEvents.push(qbEvent);
            }
            await invokeLambda(finalEvents);
        }

        if(total > 0){
            page++;
            return getEvents(url,page,total);
        }
        
    } 
};
// This is the main function to get events from GPL
module.exports.handler = async (event, context, callback) => {
    console.log('Got event',JSON.stringify(event));
    try{
        if (event && event.lat && event.long) {
            let url = `${process.env.GPL_BASE_URL}/events?items_per_page=${ITEMS_PER_PAGE}&start=${moment.utc().add('7', 'days').valueOf()}&end=${moment.utc().add('14', 'days').valueOf()}&within=30&lat=${event.lat}&long=${event.long}&api_key=${process.env.GPL_API_KEY}`;
            let categories = process.env.categories;
            if (categories) {
                url+='&category=' + categories;
            }
            await getEvents(url,0,null);
        }
    }catch(e){
        console.log(e);
    }
    return "Finished";
}