const QBM = require('./common/qbmanager');
const QBManager = new QBM();
const moment = require('moment');
module.exports.handler = async function (event, context, callback) {
    // Read all users from QB
    console.log(moment.utc().format('YYYY-MM-DD'));
    let response = await QBManager.getUsers({per_page: 100,filter: { field: 'created_at', param: 'gt', value: moment.utc().format('YYYY-MM-DD') }});
    console.log(response);
    if(response && response.length > 0){
        console.log(response[0]);

        let formData = {};
        response.forEach((element, index) => {
            let i = index + 1;
            formData['record[' + i + '][' + '_parent_id' + ']'] = element.id;
            formData['record[' + i + '][' + 'email' + ']'] = element.email;
            formData['record[' + i + '][' + 'full_name' + ']'] = element.full_name;
            if('blob_id' in element && element.blob_id){
                formData['record[' + i + '][' + 'blob_id' + ']'] = element.blob_id;
            }
            if('custom_data' in element && element.custom_data){
                let custom_data = element.custom_data;
                if('city' in custom_data && custom_data.city){
                    formData['record[' + i + '][' + 'city' + ']'] = custom_data.city;
                }
                if('about_you' in custom_data && custom_data.about_you){
                    formData['record[' + i + '][' + 'description' + ']'] = custom_data.about_you;
                }
            }
        });
        let session = await QBManager.getCurrentSession();
        await QBManager.postMultiRecords('User',formData,session.token);
    }
    return "done";
}