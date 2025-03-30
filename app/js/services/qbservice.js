angular.module('PromoApp')
    .service('qbService', ['config', 'authService', '$http', function(config, authService, $http) {
        var QBApp = {
            appId: config.QB_APP_ID,
            authKey: config.QB_AUTH_KEY,
            authSecret: config.QB_AUTH_SECRET,
            apiEndpoint: config.QB_API_ENDPOINT,
            chatEndpoint: config.QB_CHAT_ENDPOINT,
            TURN_Server: config.QB_TURN_SERVER,
            s3Bucket: config.QB_S3Bucket
        };
        let qbServe = this;
        /**
         * for initialising QB APIs
         */
        this.initQBApp = function() {
            let CONFIG = {
                chatProtocol: {
                    active: 2
                },
                streamManagement: {
                    enable: true
                },
                debug: {
                    mode: 1,
                    file: null
                },
                on: {
                    sessionExpired: function(handleResponse, retry) {
                        // call handleResponse() if you do not want to process a session expiration,
                        // so an error will be returned to origin request
                        // handleResponse();
                        QB.createSession(function(error, result) {
                            retry(result);
                        });
                    }
                }
            };

            QB.init(QBApp.appId, QBApp.authKey, QBApp.authSecret, CONFIG);
            return new Promise((resolve, rejected) => {
                //for creating QB Session
                QB.createSession(function(err, result) {
                    if (err) {
                        console.log('Session create callback', err);
                        rejected(err);
                    }
                    resolve(result);
                });
            });
        };

        this.getCurrentSession = function() {
            let session = authService.getSession();
            if (session) {
                return this.getSession(session);
            } else if (authService.getObject('qbAppSession')) {
                let session = authService.getObject('qbAppSession');
                this.getSession(session);
                return Promise.resolve(session);
            } else {
                return this.initQBApp()
                    .then((result) => {
                        authService.putWithExpiry('qbAppSession', JSON.stringify(result));
                        return Promise.resolve(result);
                    });
            }
        };

        this.getSession = function(session) {
            QB.init(session.token, session.application_id);
            return Promise.resolve(session);
        };

        this.createUserSession = function(params) {
            return new Promise((resolve, rejected) => {
                QB.createSession(params, function(err, session) {
                    if (session) {
                        resolve(session);
                    }
                    rejected(err);
                });
            });
        };

        this.userLogin = function(params) {
            return new Promise((resolve, rejected) => {
                QB.login(params, function(err, user) {
                    if (user) {
                        if (!user.custom_data) {
                            user.custom_data = '{}';
                        }
                        if (user.blob_id) {
                            qbServe.getContentFileUrl(user.blob_id).then(url => {
                                if (url) {
                                    user.imgUrl = url;
                                    resolve(user);
                                }
                            }).catch(err => {
                                console.log('fetching profile pic err ::', err);
                            });
                        } else {
                            user.imgUrl = '';
                            resolve(user);
                        }
                        //qbServe.signInChat(user,params);
                    } else {
                        rejected(err);
                    }

                });
            });
        };


        /*this.listTable = (className, filter) => {
            return new Promise((resolve, reject) => {
                this.getCurrentSession().then(res => {
                    QB.data.list(className, filter, function (err, result) {
                        if (err) {
                            console.log('list Table error::', err);
                            reject(err);
                        } else {
                            console.log('list Table result::', result);
                            resolve(result.items);
                        }
                    });
                });
            });
        };
*/
        this.getUser = (params) => {
            return new Promise((resolve, reject) => {
                this.getCurrentSession().then(res => {
                    QB.users.listUsers(params, function(err, users) {
                        if (users) {
                            for (let user of users.items) {
                                if ('custom_data' in user && user.custom_data) {
                                    try {
                                        user.custom_data = JSON.parse(user.custom_data);
                                    } catch (error) {
                                        user.custom_data = {};
                                    }
                                } else {
                                    user.custom_data = {};
                                }
                            }
                            resolve(users);
                        } else {
                            reject(err);
                        }
                    });
                });
            });
        };

        this.createData = (className, data) => {
            return new Promise((resolve, reject) => {
                QB.data.create(className, data, function(err, res) {
                    if (err) {
                        reject(err);
                        console.log(err);
                    } else {
                        console.log(res);
                        resolve(res);
                    }
                });
            });
        };

        this.updateData = (className, data) => {
            return new Promise((resolve, reject) => {
                QB.data.update(className, data, function(err, res) {
                    if (err) {
                        reject(err);
                        console.log(err);
                    } else {
                        console.log(res);
                        resolve(res);
                    }
                });
            });
        };

        this.deleteById = (className, id) => {
            return new Promise((resolve, reject) => {
                QB.data.delete(className, id, function(err, res) {
                    if (err) {
                        reject(err);
                        console.log(err);
                    } else {
                        console.log(res);
                        resolve(res);
                    }
                });
            });
        };


        this.uploadDataFile = (className, params) => {
            return new Promise((resolve, rejected) => {
                QB.data.uploadFile(className, params, function(err, res) {
                    if (err) {
                        resolve(err);
                    } else {
                        resolve(res);
                    }
                });
            });
        };

        this.uploadFile = (file, isPublic) => {
            // var inputFile = $("input[type=file]")[0].files[0];

            return new Promise((resolve, rejected) => {
                var params = { name: file.name, file: file, type: file.type, size: file.size, 'public': isPublic };
                QB.content.createAndUpload(params, function(err, response) {
                    if (err) {
                        rejected(err);
                    } else {
                        console.log(response);
                        resolve(response);
                    }
                });
            });
        };

        this.getFileUrl = (className, paramsFor) => {
            return this.getCurrentSession().then(res => {
                return QB.data.fileUrl(className, paramsFor);
            });
        };

        let getContentFileInfo = (file_id) => {
            return new Promise((resolve, rejected) => {
                QB.content.getInfo(file_id, function(err, file_info) {
                    if (file_info) {
                        resolve(file_info);
                    } else {
                        console.log("Error in getting file info", err);
                        rejected(null);
                    }
                });
            });
        };

        this.getContentFileUrl = (file_id) => {
            return getContentFileInfo(file_id).then(file => {
                return new Promise((resolve, rejected) => {
                    let url = QB.content.privateUrl(file.blob.uid);
                    if (url) {
                        resolve(url);
                    }
                    rejected('');
                });
            });

        };

        this.updateUserProfile = (user_id, userUp) => {
            return new Promise((resolve, reject) => {
                this.getCurrentSession().then(res => {
                    QB.users.update(user_id, userUp, function(err, user) {
                        if (user) {
                            resolve(user);
                        } else {
                            reject(err);
                        }
                    });
                });
            });
        };

        /**
         * for sign up on Promo App
         * use sintax { 'login': login, 'password': password}
         */
        this.signUpUser = (params, callback) => {

            QB.users.create(params, function(err, user) {
                if (user) {
                    console.log('user: ', user);
                    callback(true);
                } else {
                    console.log('sign up error ::', err);
                    callback(err);
                }
            });
        };

        this.batchUpload = (tableName, listOfRows) => {
            console.log('Inside batch upload');
            return this.getCurrentSession()
                .then((result) => {
                    let session_token = result.token;

                    let formData = {};

                    listOfRows.forEach((row, index) => {
                        let i = index + 1;
                        formData['record[' + i + '][' + 'UserID' + ']'] = result.user_id;

                        // Get all the keys from row
                        let keys = Object.keys(row);
                        keys.forEach((key) => {
                            formData['record[' + i + '][' + key + ']'] = row[key];
                        });
                    });
                    console.log(formData);

                    let options = {
                        method: 'POST',
                        url: 'https://api.quickblox.com/data/' + tableName + '/multi.json',
                        data: formData,
                        transformRequest: function(obj) {
                            var str = [];
                            for (var p in obj)
                                str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                            return str.join("&");
                        },
                        headers: {
                            'QB-Token': session_token,
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    };

                    return $http(options);
                });

        };

        this.getUnreadMesageCount = function() {
            return new Promise((resolve, reject) => {
                QB.chat.message.unreadCount({}, function(err, res) {
                    if (err) {
                        console.log(err);
                        reject(false);
                    } else {
                        console.log("message count:" + JSON.stringify(res, null, 4));
                        resolve(res);
                    }
                });
            });
        };


        //sign in to qb chat
        this.signInChat = function(userId, password) {

            return this.getCurrentSession()
                .then(session => {
                    let session_token = session.token;
                    return new Promise((resolve, reject) => {
                        QB.chat.connect({ userId: userId, password: password }, function(err, roster) {
                            if (err) {
                                console.log(err);
                                reject(false);
                            } else {
                                console.log('roster is::', roster);
                                //  this.postMessageOneToOne("test",44811943);
                                QB.chat.onDisconnectedListener = onDisconnectedListener;
                                resolve(true);
                            }
                        });
                    });
                }).catch(err => {
                    console.log('error in signing into chat', err);
                });
        };

        function onDisconnectedListener() {
            console.log("onDisconnected");
        }

        this.createDialog = function(chatUserId) {
            var params = {
                type: 3,
                occupants_ids: [chatUserId],
                name: "The A team"
            };
            return new Promise((resolve, reject) => {
                QB.chat.dialog.create(params, function(err, createdDialog) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(createdDialog);
                    }
                });
            });
        };

        //post a message in 1-1
        this.postMessageOneToOne = function(message, chatUserId, dialogId) {
            // var msg = {
            //   type: 'chat',
            //   body: message,
            //   extension: {
            //     save_to_history: 1,
            //   }
            // };
            //
            // var opponentId = chatUserId;
            // //QB.chat.roster.add(chatUserId);
            // //QB.chat.roster.confirm(chatUserId)
            // let msgId = QB.chat.send(opponentId, msg);
            // QB.chat.onMessageListener = onMessage;
            // return Promise.resolve(msgId);


            console.log('Inside send message using API');
            return this.getCurrentSession()
                .then((result) => {
                    let session_token = result.token;

                    let formData = {
                        chat_dialog_id: dialogId,
                        message: message,
                        recipient_id: chatUserId,
                        send_to_chat: 1
                    };
                    let options = {
                        method: 'POST',
                        url: 'https://api.quickblox.com/chat/Message.json',
                        data: formData,
                        transformRequest: function(obj) {
                            var str = [];
                            for (var p in obj)
                                str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                            return str.join("&");
                        },
                        headers: {
                            'QB-Token': session_token,
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    };

                    return $http(options);
                });

        };

        function onMessage(userId, msg) {
            console.log('on Message response--->userid', userId, 'msg', msg);
        }
    }]);