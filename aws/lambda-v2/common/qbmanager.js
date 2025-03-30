const QB = require('quickblox');
const CREDENTIALS = {
    appId: process.env.QB_APP_ID,
    authKey: process.env.QB_AUTH_KEY,
    authSecret: process.env.QB_AUTH_SECRET
};
console.log(CREDENTIALS);
QB.init(CREDENTIALS.appId, CREDENTIALS.authKey, CREDENTIALS.authSecret);
const rp = require('request-promise');

module.exports = class QBManager {
    constructor() {
        this._qbSession = null;
    }

    async session() {
        const params = { login: process.env.QB_LOGIN, password: process.env.QB_PASSWORD };
        return new Promise((resolve, reject) => {
            QB.createSession(params, function (error, result) {
                if (error) {
                    console.error("error : ", error);
                    reject(error);
                }

                if (result) {
                    resolve(result);
                }
            });
        });
    };

    async getFileUrl(className, paramsFor) {
        return this.getCurrentSession().then(res => {
            return QB.data.fileUrl(className, paramsFor);
        });
    };

    async getCurrentSession() {
        if (this._qbSession) {
            return this._qbSession;
        }
        this._qbSession = await this.session();
    };

    async listTable(className, filter) {
        return new Promise((resolve, reject) => {
            this.getCurrentSession().then(res => {
                QB.data.list(className, filter, function (error, result) {
                    if (error) {
                        console.error("error : ", error);
                        reject(error);
                    } else {
                        console.log('list Table result::', result);
                        resolve(result.items);
                    }
                });
            });
        });
    };

    async getExistingRecords(className, array, uniqueColumn, user_id, token) {
        let ids = array.map(e => e[uniqueColumn]);
        let idsset = new Set(ids);
        console.log('set length:', idsset.size, ids.length);

        let filter = {
            [uniqueColumn]: { in: Array.from(idsset).join(',') }
        };
        if (user_id) {
            filter.user_id = user_id;
        }

        let options = {
            method: 'GET',
            uri: 'https://api.quickblox.com/data/' + className + '.json',
            form: filter,
            headers: {
                'QB-Token': token
            }                //json: true // Automatically stringifies the body to JSON
        };

        let response = await rp(options);
        if (response) {
            response = JSON.parse(response);
        }
        if (response && 'items' in response) {
            return response.items;
        }

        return [];
    };

    async postMultiRecords(className, formData, token) {
        let options = {
            method: 'POST',
            uri: 'https://api.quickblox.com/data/' + className + '/multi.json',
            form: formData,
            headers: {
                'QB-Token': token
            }                //json: true // Automatically stringifies the body to JSON
        };

        let response = await rp(options);
        if (response) {
            response = JSON.parse(response);
        }
        return response;
    }

    async getUsers(params) {
        return new Promise((resolve, reject) => {
            this.getCurrentSession().then(res => {
                QB.users.listUsers(params, function (error, users) {
                    if (users) {
                        let finalresponse = [];
                        for (let item of users.items) {
                            if ('custom_data' in item.user && item.user.custom_data) {
                                try {
                                    item.user.custom_data = JSON.parse(item.user.custom_data);
                                } catch (error) {
                                    item.user.custom_data = {};
                                }
                            } else {
                                item.user.custom_data = {};
                            }
                            finalresponse.push(item.user);
                        }
                        resolve(finalresponse);
                    } else {
                        console.error("error : ", error);
                        reject(error);
                    }
                });
            });
        });
    }

    async update(data, tableName) {
        return new Promise((resolve, reject) => {
            this.getCurrentSession().then(res => {
                QB.data.update(tableName, data, function (error, result) {
                    if (error) {
                        console.error("error : ", error);
                        reject(error);
                    } else {
                        resolve(result);
                    }

                });
            });
        });
    }

    async updateById(className, id, body, token) {
        let options = {
            method: 'PUT',
            uri: `https://api.quickblox.com/data/${className}/${id}.json`,
            body: body,
            json: true,
            headers: {
                'QB-Token': token
            }                //json: true // Automatically stringifies the body to JSON
        };

        return await rp(options);
    }

    async getById(className, id, token) {
        let options = {
            method: 'GET',
            uri: `https://api.quickblox.com/data/${className}/${id}.json`,
            json: true,
            headers: {
                'QB-Token': token
            }                //json: true // Automatically stringifies the body to JSON
        };

        return await rp(options);
    }

    async createObject(className, body, token) {
        let options = {
            method: 'POST',
            uri: 'https://api.quickblox.com/data/' + className + '.json',
            body: body,
            json: true,
            headers: {
                'QB-Token': token
            }                //json: true // Automatically stringifies the body to JSON
        };

        return await rp(options);
    }
    async createUser(className, body, token) {
        let options = {
            method: 'POST',
            uri: 'https://api.quickblox.com/' + className + '.json',
            body: body,
            json: true,
            headers: {
                'QB-Token': token
            }                //json: true // Automatically stringifies the body to JSON
        };

        return await rp(options);
    }
}