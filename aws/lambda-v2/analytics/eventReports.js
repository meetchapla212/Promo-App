const awsRequestHelper = require("./../../lambda/common/awsRequestHelper");
const MDB = require("./../common/mysqlmanager");
const MDBObject = new MDB();
const utils = require('./../common/utils');
const {
    errorMessages,
    successMessages
} = require("../common/constants");

const getFormatedInfo = function (data) {
    return new Promise((resolve, reject) => {
        let formArray = data.split(";")
        let addressDetails = {}
        Promise.all(formArray.map(async details => {
            if (details) {
                let value = details.split(":");
                addressDetails[`${value[0]}`] = value[1];
            }
        }))
        console.log("addressDetails", addressDetails)
        resolve(addressDetails)
    }).catch(err => {
        return (err)
    });;
}

module.exports.handler = async function (event, context, callback) {
    var response = { success: false, message: errorMessages.SERVER_ERROR_TRY_AGAIN };
    try {
        let api_data = JSON.parse(event.body);
        let user = await utils.verifyUser(event.headers.Authorization);

        let start_date = (api_data && api_data.start_date) ? api_data.start_date : '';
        let end_date = (api_data && api_data.end_date) ? api_data.end_date : '';
        let event_type = (api_data && api_data.event_type) ? api_data.event_type : ''; // all, upcoming, past or ''
        let report_type = (api_data && api_data.report_type) ? api_data.report_type : ''; // guest, attendees, cancellation, orders, checkIns, costItems,checkoutForm

        let DateCond = '';
        let zone_id_condition = '';
        let event_id_condition = '';
        let eventStatusCond = '';

        if (api_data.zone_id !== undefined && api_data.zone_id !== null && api_data.zone_id !== '' && api_data.zone_id > 0) {
            zone_id_condition = `AND _zone_id = ${api_data.zone_id}`
        }

        if (api_data.event_ids && api_data.event_ids.length > 0) {
            let event_ids = api_data.event_ids.join(",")
            if (event_ids != '') {
                event_id_condition = `AND event_master.event_id in (${event_ids})`;
            }
        }

        if (event_type == 'past') {
            eventStatusCond = `AND event_master.status = 'inactive'`
        } else if (event_type == 'upcoming') {
            eventStatusCond = `AND event_master.status = 'active'`
        } else {
            eventStatusCond = `AND (event_master.status = 'active' OR event_master.status = 'inactive' )`
        }

        if (start_date && end_date) {
            DateCond = `AND ( (DATE_FORMAT(start_date_time, '%Y-%m-%d') >= '${start_date}' AND DATE_FORMAT(start_date_time, '%Y-%m-%d') <= '${end_date}' )
                OR (DATE_FORMAT(end_date_time, '%Y-%m-%d') >= '${start_date}' AND DATE_FORMAT(end_date_time, '%Y-%m-%d') <= '${end_date}' ))`
        }

        let eventMasterCond = `event_master.is_deleted = 0 AND event_master.is_draft = 0 AND
            event_master._user_id = ${user.id} ${eventStatusCond} ${event_id_condition} ${zone_id_condition} ${DateCond}`;

        if (report_type == 'guest') {
            // let guestListQuery = `SELECT
            //     (CASE 
            //         WHEN user_ticket_details.checkedin_at > 0 
            //         THEN DATE_FORMAT(FROM_UNIXTIME(user_ticket_details.checkedin_at/1000), '%M %d, %Y %h:%i %p')
            //         ELSE ''
            //     END) AS date_attending,
            //     event_tickets.ticket_id as ticket_id,
            //     guest_users.name, guest_users.email,
            //     event_tickets.ticket_type,
            //     user_ticket_details.ticket_details_status,
            //     user_ticket_details.payment_status,
            //     user_ticket_details.qty as scanIns,
            //     user_ticket_details.qty as manualCheckIns,
            //     user_ticket_details.qty as totalCheckIns,
            //     user_ticket_details.qty as checkOuts,
            //     user_tickets.attendee as purchased_by,
            //     user_ticket_details.qrcode
            //     FROM guest_users 
            //     JOIN event_master ON (event_master.event_id = guest_users._event_id)
            //     JOIN event_tickets On (event_tickets._event_id = guest_users._event_id)
            //     LEFT JOIN user_tickets ON (user_tickets.event_id = guest_users._event_id)
            //     LEFT JOIN user_ticket_details ON (user_ticket_details._purchased_ticket_id = user_tickets.id)
            //     WHERE ${eventMasterCond}
            //     GROUP BY user_tickets.id, event_tickets.ticket_id, event_master.event_id`;

            // let guestListQuery = `SELECT
            //     (CASE
            //         WHEN user_ticket_details.checkedin_at > 0 
            //         THEN DATE_FORMAT(FROM_UNIXTIME(user_ticket_details.checkedin_at/1000), '%M %d, %Y %h:%i %p')
            //         ELSE ''
            //     END) AS date_attending,
            //     event_tickets.ticket_id as ticket_id,
            //     guest_users.name, guest_users.email,
            //     event_tickets.ticket_type,
            //     user_ticket_details.ticket_details_status,
            //     user_ticket_details.payment_status,
            //     (CASE 
            //         WHEN user_ticket_details.checkedin_at > 0 
            //         THEN user_ticket_details.qty
            //         ELSE 0
            //     END) AS scanIns,
            //     user_tickets.attendee as purchased_by,
            //     user_ticket_details.qrcode
            //     FROM guest_users 
            //     JOIN event_master ON (event_master.event_id = guest_users._event_id)
            //     JOIN event_tickets On (event_tickets._event_id = guest_users._event_id)
            //     LEFT JOIN user_tickets ON (user_tickets.event_id = guest_users._event_id)
            //     LEFT JOIN user_ticket_details ON (user_ticket_details._purchased_ticket_id = user_tickets.id)
            //     WHERE ${eventMasterCond}
            //     GROUP BY user_ticket_details.details_id, user_tickets.id, event_tickets.ticket_id, event_master.event_id`;

            let guestListQuery = `SELECT
                event_master.event_id, guest_users.name, guest_users.email, guest_users.type
                FROM guest_users 
                JOIN event_master
                ON (event_master.event_id = guest_users._event_id)
                WHERE ${eventMasterCond}`;

            let guestList = await MDBObject.runQuery(guestListQuery);
            response = {
                success: true,
                message: successMessages.GET_REPORT,
                data: {
                    guestList
                }
            }
            return awsRequestHelper.respondWithJsonBody(200, response);
        } else if (report_type == 'attendees') {
            // let attendeesQuery = `SELECT
            //     (CASE 
            //         WHEN user_ticket_details.checkedin_at > 0 
            //         THEN DATE_FORMAT(FROM_UNIXTIME(user_ticket_details.checkedin_at/1000), '%M %d, %Y %h:%i %p')
            //         ELSE ''
            //     END) AS date_attending,
            //     DATE_FORMAT(event_tickets.sale_start_date, '%M %d, %Y') as start_stamp_date,
            //     DATE_FORMAT(event_master.start_date_time, '%M %d, %Y %h:%i %p') as event_start_time,
            //     DATE_FORMAT(event_master.start_date_time, '%M %d, %Y') as event_start_time_date,
            //     user_ticket_details._ticket_id as ticket_id, event_tickets.ticket_type as ticket_type,
            //     user_master.first_name, user_master.last_name, user_master.email,
            //     user_ticket_details.payment_status, user_ticket_details.ticket_details_status,
            //     null as payment_provider,
            //     null as provider_source_type,
            //     null as provider_source_client,
            //     null as last_4_digits,
            //     null as card_brand,
            //     null as partially_refunded,
            //     null as fully_refunded,
            //     null as do_not_sell_information,
            //     user_ticket_details.qty as scanIns,
            //     user_ticket_details.qty as manualCheckIns,
            //     user_ticket_details.qty as totalCheckIns,
            //     user_ticket_details.qty as checkOuts,
            //     user_tickets.attendee as purchased_by,
            //     user_tickets.id as orderID,
            //     null as referral_code,
            //     null as discount_code,
            //     null as access_Key,
            //     user_ticket_details.qrcode,
            //     DATE_FORMAT(user_tickets.date_created, '%M %d, %Y %h:%i %p') as date_of_order,
            //     DATE_FORMAT(user_tickets.date_created, '%M %d, %Y') as created_at_date
            //     FROM user_tickets
            //     JOIN event_master ON (event_master.event_id = user_tickets.event_id)
            //     JOIN user_ticket_details ON (user_tickets.id = user_ticket_details._purchased_ticket_id)
            //     JOIN event_tickets On (user_ticket_details._ticket_id = event_tickets.ticket_id)
            //     JOIN user_master ON (user_master.user_id = user_tickets.user_id)
            //     WHERE ${eventMasterCond} AND event_tickets.is_deleted = 0
            //     group by user_tickets.id`;

            let attendeesQuery = `SELECT
                (CASE 
                    WHEN user_ticket_details.checkedin_at > 0 
                    THEN DATE_FORMAT(FROM_UNIXTIME(user_ticket_details.checkedin_at/1000), '%M %d, %Y %h:%i %p')
                    ELSE ''
                END) AS date_attending,
                DATE_FORMAT(event_tickets.sale_start_date, '%M %d, %Y') as start_stamp_date,
                DATE_FORMAT(event_master.start_date_time, '%M %d, %Y %h:%i %p') as event_start_time,
                DATE_FORMAT(event_master.start_date_time, '%M %d, %Y') as event_start_time_date,
                user_ticket_details._ticket_id as ticket_id, event_tickets.ticket_type as ticket_type,
                user_master.first_name, user_master.last_name, user_master.email,
                user_ticket_details.payment_status, user_ticket_details.ticket_details_status,
                (CASE 
                    WHEN user_ticket_details.checkedin_at > 0 
                    THEN user_ticket_details.qty
                    ELSE 0
                END) AS scanIns,
                user_tickets.attendee as purchased_by,
                user_tickets.id as orderID,
                user_ticket_details.qrcode,
                DATE_FORMAT(user_tickets.date_created, '%M %d, %Y %h:%i %p') as date_of_order,
                DATE_FORMAT(user_tickets.date_created, '%M %d, %Y') as created_at_date
                FROM user_tickets
                JOIN event_master ON (event_master.event_id = user_tickets.event_id)
                JOIN user_ticket_details ON (user_tickets.id = user_ticket_details._purchased_ticket_id)
                JOIN event_tickets On (user_ticket_details._ticket_id = event_tickets.ticket_id)
                JOIN user_master ON (user_master.user_id = user_tickets.user_id)
                WHERE ${eventMasterCond} AND event_tickets.is_deleted = 0
                group by user_tickets.id`;
            let attendees = await MDBObject.runQuery(attendeesQuery);
            response = {
                success: true,
                message: successMessages.GET_REPORT,
                data: {
                    attendees
                }
            }
            return awsRequestHelper.respondWithJsonBody(200, response);
        } else if (report_type == 'cancellation') {
            // let cancellationQuery = `SELECT
            //     DATE_FORMAT(event_master.start_date_time, '%M %d, %Y %h:%i %p') as event_start_time,
            //     DATE_FORMAT(event_master.start_date_time, '%M %d, %Y') as event_start_time_date,
            //     event_master.event_id,
            //     DATE_FORMAT(event_master.date_created, '%M %d, %Y %h:%i %p') as created_at,
            //     DATE_FORMAT(event_master.date_created, '%M %d, %Y') as created_at_date,
            //     user_master.first_name as buyer_first_name,
            //     user_master.last_name as buyer_last_name,
            //     user_master.email as buyer_email,
            //     null as host_purchased_by_email,
            //     user_tickets.ticket_qty as ticket_quantity,
            //     null as num_add_ons,
            //     event_tickets.ticket_type,
            //     null as add_on_types,
            //     null as option_types,
            //     event_master.state as state,
            //     null as provider_name,
            //     null as provider_source_type,
            //     null as provider_source_client,
            //     null as last_4_digits,
            //     null as card_brand,
            //     null as partially_refunded,
            //     null as do_not_sell_information,
            //     event_tickets.price as base_price,
            //     null as base_discount,
            //     null as base_commission,
            //     null as base_commission_included,
            //     null as vat_name,
            //     null as base_vat,
            //     null as base_vat_included,
            //     null as base_host_vat,
            //     null as base_host_vat_included,
            //     null as base_voided_price,
            //     null as base_voided_discount,
            //     null as base_voided_commission,
            //     null as base_voided_commission_included,
            //     null as base_voided_vat,
            //     null as base_voided_vat_included,
            //     null as base_voided_host_vat,
            //     null as base_voided_host_vat_included,
            //     user_tickets.ticket_price as net_earnings,
            //     event_tickets.currency_code as base_currency,
            //     null as discount_code,
            //     null as access_keys_used,
            //     null as referral,
            //     null as origin_client,
            //     null as origin_host_title,
            //     event_master.websiteurl as listing_url,
            //     (CASE 
            //         WHEN user_tickets.device_type = 1 THEN 'web'
            //         WHEN user_tickets.device_type = 2 THEN 'mobile'
            //         ELSE ''
            //     END) AS purchase_device
            //     FROM user_tickets
            //     JOIN user_ticket_details ON (user_ticket_details._purchased_ticket_id  = user_tickets.id)
            //     JOIN event_master ON (event_master.event_id = user_tickets.event_id)
            //     JOIN event_tickets On (user_ticket_details._ticket_id = event_tickets.ticket_id)
            //     JOIN user_master ON (user_tickets.user_id = user_master.user_id)
            //     WHERE ${eventMasterCond} AND event_tickets.is_deleted = 0 AND
            //     (user_tickets.ticket_details_status = 'refunded' OR user_tickets.ticket_details_status = 'cancel')
            //     GROUP BY user_tickets.id`;

            let cancellationQuery = `SELECT
                DATE_FORMAT(event_master.start_date_time, '%M %d, %Y %h:%i %p') as event_start_time,
                DATE_FORMAT(event_master.start_date_time, '%M %d, %Y') as event_start_time_date,
                event_master.event_id,
                DATE_FORMAT(event_master.date_created, '%M %d, %Y %h:%i %p') as created_at,
                DATE_FORMAT(event_master.date_created, '%M %d, %Y') as created_at_date,
                user_master.first_name as buyer_first_name,
                user_master.last_name as buyer_last_name,
                user_master.email as buyer_email,
                user_tickets.ticket_qty as ticket_quantity,
                event_tickets.ticket_type,
                event_master.state as state,
                event_tickets.price as base_price,
                user_tickets.ticket_price as net_earnings,
                event_tickets.currency_code as base_currency,
                (CASE 
                    WHEN user_tickets.device_type = 1 THEN 'web'
                    WHEN user_tickets.device_type = 2 THEN 'mobile'
                    ELSE ''
                END) AS purchase_device
                FROM user_tickets
                JOIN user_ticket_details ON (user_ticket_details._purchased_ticket_id  = user_tickets.id)
                JOIN event_master ON (event_master.event_id = user_tickets.event_id)
                JOIN event_tickets On (user_ticket_details._ticket_id = event_tickets.ticket_id)
                JOIN user_master ON (user_tickets.user_id = user_master.user_id)
                WHERE ${eventMasterCond} AND event_tickets.is_deleted = 0 AND
                (user_tickets.ticket_details_status = 'refunded' OR user_tickets.ticket_details_status = 'cancel')
                GROUP BY user_tickets.id`;
            let cancellation = await MDBObject.runQuery(cancellationQuery);
            response = {
                success: true,
                message: successMessages.GET_REPORT,
                data: {
                    cancellation
                }
            }
        } else if (report_type == 'orders') {
            // let ordersQuery = `SELECT
            //     (CASE 
            //         WHEN user_ticket_details.checkedin_at > 0 
            //         THEN DATE_FORMAT(FROM_UNIXTIME(user_ticket_details.checkedin_at/1000), '%M %d, %Y')
            //         ELSE ''
            //     END) AS date_attending,
            //     DATE_FORMAT(event_master.start_date_time, '%M %d, %Y') as event_start_time_date,
            //     user_tickets.id as orderID,
            //     DATE_FORMAT(user_tickets.date_created, '%M %d, %Y %h:%i %p') as date_of_order,
            //     DATE_FORMAT(user_tickets.date_created, '%M %d, %Y') as created_at_date,
            //     user_master.first_name as buyer_first_name,
            //     user_master.last_name as buyer_last_name,
            //     user_master.email as buyer_email,
            //     user_tickets.attendee as processed_by,
            //     user_tickets.ticket_qty as ticket_quantity,
            //     null as add_on_quantity,
            //     event_tickets.ticket_type,
            //     null as add_on_types,
            //     null as option_types,
            //     user_ticket_details.payment_status,
            //     null as payment_provider,
            //     null as provider_source_type,
            //     null as provider_source_client,
            //     null as last_4_digits,
            //     null as card_brand,
            //     null as partially_refunded,
            //     null as do_not_sell_information,
            //     user_tickets.total_amount as gross_sales,
            //     null as discounts,
            //     null as universe_service_charge_passed_to_buyer,
            //     null as universe_service_charge_included_in_price,
            //     'VAT -' name_of_tax_on_universe_service_charge,
            //     null as tax_on_universe_service_charge_passed_to_buyer,
            //     null as tax_on_universe_service_charge_included_in_price,
            //     null as tax_on_universe_service_charge_passed_to_buyer_host_remitted,
            //     null as tax_on_universe_service_charge_included_in_price_host_remitte,
            //     (CASE 
            //         WHEN (user_tickets.ticket_details_status = 'refunded' OR user_tickets.ticket_details_status = 'cancel')
            //         THEN user_tickets.ticket_qty 
            //         ELSE 0
            //     END) as ticket_sales_refunded,
            //     null as discounts_refunded,
            //     null as universe_service_charge_passed_to_buyer_refunded,
            //     null as universe_service_charge_included_in_price_refunded,
            //     null as tax_on_universe_service_charge_passed_to_buyer_refunded,
            //     null as tax_on_universe_service_charge_included_in_price_refunded,
            //     null as tax_on_universe_service_charge_passed_to_buyer_host_remitted,
            //     null as tax_on_universe_service_charge_included_in_price_host_remitte,
            //     user_tickets.ticket_price as net_earnings,
            //     user_tickets.payout_amount as settlement,
            //     null as coupons_applied,
            //     null as access_Key_applied,
            //     null as referral_code,
            //     null as purchase_source,
            //     null as origin,
            //     null as listing_name,
            //     event_master.websiteurl as listing_url,
            //     (CASE 
            //         WHEN user_tickets.device_type = 1 THEN 'web'
            //         WHEN user_tickets.device_type = 2 THEN 'mobile'
            //         ELSE ''
            //     END) AS purchase_device
            //     FROM user_tickets 
            //     JOIN user_ticket_details ON (user_tickets.id = user_ticket_details._purchased_ticket_id)
            //     JOIN event_tickets On (user_ticket_details._ticket_id = event_tickets.ticket_id)
            //     JOIN user_master ON (user_tickets.user_id = user_master.user_id)
            //     JOIN event_master ON (event_master.event_id = user_tickets.event_id)
            //     WHERE ${eventMasterCond} AND event_tickets.is_deleted = 0
            //     group by user_tickets.id`;

            let ordersQuery = `SELECT
                (CASE 
                    WHEN user_ticket_details.checkedin_at > 0 
                    THEN DATE_FORMAT(FROM_UNIXTIME(user_ticket_details.checkedin_at/1000), '%M %d, %Y')
                    ELSE ''
                END) AS date_attending,
                DATE_FORMAT(event_master.start_date_time, '%M %d, %Y') as event_start_time_date,
                user_tickets.id as orderID,
                DATE_FORMAT(user_tickets.date_created, '%M %d, %Y %h:%i %p') as date_of_order,
                DATE_FORMAT(user_tickets.date_created, '%M %d, %Y') as created_at_date,
                user_master.first_name as buyer_first_name,
                user_master.last_name as buyer_last_name,
                user_master.email as buyer_email,
                user_tickets.attendee as processed_by,
                user_tickets.ticket_qty as ticket_quantity,
                event_tickets.ticket_type,
                user_ticket_details.payment_status,
                user_tickets.total_amount as gross_sales,
                (CASE 
                    WHEN (user_tickets.ticket_details_status = 'refunded' OR user_tickets.ticket_details_status = 'cancel')
                    THEN user_tickets.ticket_qty 
                    ELSE 0
                END) as ticket_sales_refunded,
                user_tickets.ticket_price as net_earnings,
                user_tickets.payout_amount as settlement,
                (CASE 
                    WHEN user_tickets.device_type = 1 THEN 'web'
                    WHEN user_tickets.device_type = 2 THEN 'mobile'
                    ELSE ''
                END) AS purchase_device
                FROM user_tickets 
                JOIN user_ticket_details ON (user_tickets.id = user_ticket_details._purchased_ticket_id)
                JOIN event_tickets On (user_ticket_details._ticket_id = event_tickets.ticket_id)
                JOIN user_master ON (user_tickets.user_id = user_master.user_id)
                JOIN event_master ON (event_master.event_id = user_tickets.event_id)
                WHERE ${eventMasterCond} AND event_tickets.is_deleted = 0
                group by user_tickets.id`;
            let orders = await MDBObject.runQuery(ordersQuery);
            response = {
                success: true,
                message: successMessages.GET_REPORT,
                data: {
                    orders
                }
            }
        } else if (report_type == 'checkIns') {
            // let checkInsQuery = `SELECT
            //     user_tickets.id as orderID,
            //     user_ticket_details._ticket_id as ticket_id,
            //     user_master.first_name, user_master.last_name, user_master.email,
            //     (CASE 
            //         WHEN user_ticket_details.checkedin_at > 0 
            //         THEN DATE_FORMAT(FROM_UNIXTIME(user_ticket_details.checkedin_at/1000), '%M %d, %Y %h:%i %p')
            //         ELSE ''
            //     END) AS date,
            //     null as action,
            //     (CASE 
            //         WHEN user_tickets.device_type = 1 THEN 'web'
            //         WHEN user_tickets.device_type = 2 THEN 'mobile'
            //         ELSE ''
            //     END) AS scanning_device,
            //     null as external,
            //     null as rate_name,
            //     null as rate_type
            //     FROM user_tickets 
            //     JOIN event_master ON (event_master.event_id = user_tickets.event_id)
            //     LEFT JOIN user_ticket_details ON (user_ticket_details._purchased_ticket_id  = user_tickets.id)
            //     LEFT JOIN user_master ON (user_tickets.user_id = user_master.user_id)
            //     WHERE ${eventMasterCond}`;

            let checkInsQuery = `SELECT
                user_tickets.id as orderID,
                user_ticket_details._ticket_id as ticket_id,
                user_master.first_name, user_master.last_name, user_master.email,
                (CASE 
                    WHEN user_ticket_details.checkedin_at > 0 
                    THEN DATE_FORMAT(FROM_UNIXTIME(user_ticket_details.checkedin_at/1000), '%M %d, %Y %h:%i %p')
                    ELSE ''
                END) AS date,
                (CASE 
                    WHEN user_tickets.device_type = 1 THEN 'web'
                    WHEN user_tickets.device_type = 2 THEN 'mobile'
                    ELSE ''
                END) AS scanning_device
                FROM user_tickets 
                JOIN event_master ON (event_master.event_id = user_tickets.event_id)
                LEFT JOIN user_ticket_details ON (user_ticket_details._purchased_ticket_id  = user_tickets.id)
                LEFT JOIN user_master ON (user_tickets.user_id = user_master.user_id)
                WHERE ${eventMasterCond} AND user_ticket_details.checkedin_at > 0`;
            let checkIns = await MDBObject.runQuery(checkInsQuery);
            response = {
                success: true,
                message: successMessages.GET_REPORT,
                data: {
                    checkIns
                }
            }
        } else if (report_type == 'costItems') {
            // let costItemsQuery = `SELECT
            //     event_tickets.ticket_id,
            //     user_tickets.id as orderID,
            //     DATE_FORMAT(user_tickets.date_created, '%M %d, %Y %h:%i %p') as date_of_order,
            //     (CASE 
            //         WHEN user_ticket_details.checkedin_at > 0 
            //         THEN DATE_FORMAT(FROM_UNIXTIME(user_ticket_details.checkedin_at/1000), '%M %d, %Y %h:%i %p')
            //         ELSE ''
            //     END) AS date_attending,
            //     user_master.first_name, user_master.last_name, user_master.email,
            //     event_tickets.description as description,
            //     null as option_name,
            //     null as listing_name,
            //     user_ticket_details.payment_status,
            //     user_ticket_details.ticket_details_status,            
            //     null as payment_provider,
            //     null as provider_source_type,
            //     null as provider_source_client,
            //     null as last_4_digits,
            //     null as card_brand,
            //     null as partially_refunded,
            //     null as fully_refunded,
            //     null as do_not_sell_information,
            //     event_master.websiteurl as listing_url,
            //     user_tickets.ticket_qty as ticket_sales,
            //     null as discounts,
            //     null as universe_service_charge_passed_to_buyer,
            //     null as universe_service_charge_included_in_price,
            //     null as name_of_tax_on_universe_service_charge,
            //     null as tax_on_universe_service_charge_passed_to_buyer,
            //     null as tax_on_universe_service_charge_included_in_price,
            //     null as tax_on_universe_service_charge_passed_to_buyer_host_remitted,
            //     null as tax_on_universe_service_charge_included_in_price_host_remitte,
            //     (CASE 
            //         WHEN (user_tickets.ticket_details_status = 'refunded' OR user_tickets.ticket_details_status = 'cancel')
            //         THEN user_tickets.ticket_qty 
            //         ELSE 0
            //     END) AS ticket_sales_refunded,
            //     null as discounts_refunded,
            //     null as universe_service_charge_passed_to_buyer_refunded,
            //     null as universe_service_charge_included_in_price_refunded,
            //     null as tax_on_universe_service_charge_passed_to_buyer_refunded,
            //     null as tax_on_universe_service_charge_included_in_price_refunded,
            //     null as tax_on_universe_service_charge_passed_to_buyer_host_remitted_refunded,
            //     null as tax_on_universe_service_charge_included_in_price_host_remitte_refunded,
            //     user_tickets.ticket_price as net_earnings,
            //     event_tickets.currency_code,
            //     null as access_keys_applied,
            //     null as coupons_applied,
            //     user_ticket_details.qrcode,
            //     null as upgraded_to
            //     FROM user_ticket_details
            //     JOIN event_tickets On (user_ticket_details._ticket_id = event_tickets.ticket_id)
            //     JOIN user_tickets ON (user_tickets.id = user_ticket_details._purchased_ticket_id)
            //     JOIN event_master ON (event_master.event_id = user_tickets.event_id)
            //     JOIN user_master ON (user_master.user_id = event_master._user_id)
            //     WHERE ${eventMasterCond} AND event_tickets.is_deleted = 0`;

            let costItemsQuery = `SELECT
                event_tickets.ticket_id,
                user_tickets.id as orderID,
                DATE_FORMAT(user_tickets.date_created, '%M %d, %Y %h:%i %p') as date_of_order,
                (CASE 
                    WHEN user_ticket_details.checkedin_at > 0 
                    THEN DATE_FORMAT(FROM_UNIXTIME(user_ticket_details.checkedin_at/1000), '%M %d, %Y %h:%i %p')
                    ELSE ''
                END) AS date_attending,
                user_master.first_name, user_master.last_name, user_master.email,
                event_tickets.description as description,
                user_ticket_details.payment_status,
                user_ticket_details.ticket_details_status,            
                user_tickets.ticket_qty as ticket_sales,
                (CASE 
                    WHEN (user_tickets.ticket_details_status = 'refunded' OR user_tickets.ticket_details_status = 'cancel')
                    THEN user_tickets.ticket_qty
                    ELSE 0
                END) AS ticket_sales_refunded,
                user_tickets.ticket_price as net_earnings,
                event_tickets.currency_code,
                user_ticket_details.qrcode
                FROM user_ticket_details
                JOIN event_tickets On (user_ticket_details._ticket_id = event_tickets.ticket_id)
                JOIN user_tickets ON (user_tickets.id = user_ticket_details._purchased_ticket_id)
                JOIN event_master ON (event_master.event_id = user_tickets.event_id)
                JOIN user_master ON (user_master.user_id = event_master._user_id)
                WHERE ${eventMasterCond} AND event_tickets.is_deleted = 0`;
            let costItems = await MDBObject.runQuery(costItemsQuery);
            response = {
                success: true,
                message: successMessages.GET_REPORT,
                data: {
                    costItems
                }
            }
        }
        else if (report_type == 'checkoutForm') {
            let checkFormQuery = `SELECT
            tickets_attendee_details.details_id, tickets_attendee_details._purchased_ticket_id as order_id, 
            tickets_attendee_details.prefix, tickets_attendee_details.first_name,tickets_attendee_details.last_name,
            tickets_attendee_details.suffix, tickets_attendee_details.email_address, tickets_attendee_details.home_phone,
            tickets_attendee_details.cell_phone, tickets_attendee_details.tax_and_business_info, tickets_attendee_details.home_address,
            tickets_attendee_details.shipping_address, tickets_attendee_details.job_title, tickets_attendee_details.company_organization,
            tickets_attendee_details.work_address, tickets_attendee_details.work_phone, tickets_attendee_details.website,
            tickets_attendee_details.blog, tickets_attendee_details.gender, tickets_attendee_details.birth_date, tickets_attendee_details.age,
            tickets_attendee_details.custom_question, tickets_attendee_details.date_created, tickets_attendee_details.date_modified, tickets_attendee_details.is_deleted 
            FROM tickets_attendee_details 
            JOIN event_master ON (event_master.event_id = tickets_attendee_details._event_id)
            WHERE ${eventMasterCond}`;
            let checkForm = await MDBObject.runQuery(checkFormQuery);
            await Promise.all(checkForm.map(async details => {
                details.home_address = details.home_address ? await getFormatedInfo(details.home_address) : "";
                details.shipping_address = details.shipping_address ? await getFormatedInfo(details.shipping_address) : "";
                details.work_address = details.work_address ? await getFormatedInfo(details.work_address) : "";
                details.custom_question = details.custom_question ? await getFormatedInfo(details.custom_question) : "";
            }))
            response = {
                success: true,
                message: "Get Report successfully!",
                data: {
                    checkForm
                }
            }

        }
        else if (report_type == 'discountCodes') {
            let discountData = []
            let discountQuery = `select
            promo_codes.id,promo_codes.code_name,
            SUBSTRING_INDEX(SUBSTRING_INDEX(promo_codes.event_id, ',', numbers.n), ',', -1) eventid,
            promo_codes.discount_type, promo_codes.discount_value, promo_codes.code_limit, promo_codes.remaining_qty, promo_codes.multi_event_code, promo_codes.all_events_tickets_access, promo_codes.code_start_date, promo_codes.code_end_date
          from
            (select 1 n union all
             select 2 union all select 3 union all select 4 union all select 5 union all select 6 union all select 7 union all select 8 union all select 9 union all select 10 union all
             select 11 n union all
             select 12 union all select 13 union all select 14 union all select 15 union all select 16 union all select 17 union all select 18 union all select 19 union all select 20 union all
             select 21 n union all
             select 22 union all select 23 union all select 24 union all select 25 union all select 26 union all select 27 union all select 28 union all select 29 union all select 30 union all
             select 31 n union all
             select 32 union all select 33 union all select 34 union all select 35 union all select 36 union all select 37 union all select 38 union all select 39 union all select 40 union all
             select 41 n union all
             select 42 union all select 43 union all select 44 union all select 45 union all select 46 union all select 47 union all select 48 union all select 49 union all select 50) numbers INNER JOIN promo_codes
            on CHAR_LENGTH(promo_codes.event_id)
               -CHAR_LENGTH(REPLACE(promo_codes.event_id, ',', ''))>=numbers.n-1
               join event_master
               where SUBSTRING_INDEX(SUBSTRING_INDEX(promo_codes.event_id, ',', numbers.n), ',', -1) = event_master.event_id AND ${eventMasterCond}
                union select promo_codes.id,promo_codes.code_name, event_id, promo_codes.discount_type, promo_codes.discount_value, promo_codes.code_limit, promo_codes.remaining_qty,promo_codes.multi_event_code, promo_codes.all_events_tickets_access, promo_codes.code_start_date, promo_codes.code_end_date from promo_codes where multi_event_code = 1 and all_events_tickets_access = 1`
            await MDBObject.runQuery(discountQuery).then(data => {
                discountData.push(data)
            });
            await Promise.all(discountData[0].map(async discountDetails => {
                discountDetails.multi_event_code = discountDetails.multi_event_code ? discountDetails.multi_event_code == "1" ? true : false : ''
                discountDetails.all_events_tickets_access = discountDetails.all_events_tickets_access ? discountDetails.all_events_tickets_access == "1" ? true : false : ''
            }))
            discountData = discountData[0]
            response = {
                success: true,
                message: "Get Report successfully!",
                data: {
                    discountData
                }
            }

        }
        else {
            response = {
                success: false,
                message: INVALID_REPORT_TYPE
            }
        }
        return awsRequestHelper.respondWithJsonBody(200, response);
    } catch (error) {
        console.error("error : ", error);
        response.message = error.message;
        if (error && error.status_code == 400) {
            return awsRequestHelper.respondWithJsonBody(400, response);
        }
        return awsRequestHelper.respondWithJsonBody(500, response);
    }
};