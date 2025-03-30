(function() {
    'use strict';
    // this function is strict...
}());

function User() {
    this._cache = {};

    this.userListConteiner = null;
    this.content = null;
}

User.prototype.initGettingUsers = function() {
    var self = this;
    self.content = document.querySelector('.j-content');
    self.userListConteiner = document.querySelector('.j-group_chat__user_list');

    self.userListConteiner.classList.add('loading');

    self.getUsers().then(function(userList) {
        _.each(userList, function(user) {
            self.buildUserItem(self._cache[user.id]);
        });
        self.userListConteiner.classList.remove('loading');
    }).catch(function(error) {
        self.userListConteiner.classList.remove('loading');
    });
};

User.prototype.getImage = function(user) {
    return new Promise((resolve, rejected) => {
        if (user && 'profile_pic' in user && user.profile_pic != '') {
            user.profile_url = user.profile_pic;
            /*QB.content.getInfo(user.blob_id, function (err, file_info) {
                if (file_info) {
                    let url = QB.content.privateUrl(file_info.blob.uid);
                    user.profile_url = url;
                    resolve(user);
                } else {
                    resolve(user);
                }
            });*/
            resolve(user);
        } else {
            resolve(user);
        }
    });
};

User.prototype.addToCache = function(user) {
    // console.log(user);
    var self = this,
        id = user.id;
    if ('quickblox_id' in user) {
        id = user.quickblox_id;
    }

    if (!self._cache[id]) {
        self._cache[id] = {
            name: user.full_name || user.login || 'Unknown user (' + id + ')',
            first_name: user.first_name,
            last_name: user.last_name,
            id: id,
            color: _.random(1, 10),
            last_request_at: user.last_request_at,
            profile_url: user.profile_url
        };
    } else {
        self._cache[id].last_request_at = user.last_request_at;
        if (user.profile_url) {
            self._cache[id].profile_url = user.profile_url;
        }
        /*if(user.blob_id) {
            self._cache[id].blob_id = user.blob_id;
        }*/
    }

    return self._cache[id];
};

User.prototype.getUsersByIds = function(userList) {
    var self = this,
        params = {
            filter: {
                field: 'id',
                param: 'in',
                value: userList
            },
            per_page: 100
        };

    return new Promise(function(resolve, reject) {
        QB.users.listUsers(params, function(err, responce) {
            if (err) {
                reject(err);
            } else {
                var users = responce.items;

                let promises = [];
                _.each(userList, function(id) {
                    var user = users.find(function(item) {
                        return item.user.id === id;
                    });

                    promises.push(self.getImage(user.user));

                });

                return Promise.all(promises)
                    .then((users) => {
                        users.forEach((user) => {
                            if (user !== undefined) {
                                self.addToCache(user);

                            }
                        });
                    })
                    .finally(() => {
                        resolve();
                    });

            }
        });
    });
};

User.prototype.getUserImageById = function(userId, showElement, hideElement) {
    let that = this;
    if (userId) {
        // Get the user from cache
        let user = this._cache[userId];
        if (user && !user.blob_id) {
            return new Promise(function(resolve, reject) {
                QB.users.get(userId, function(err, responce) {
                    if (responce && responce.blob_id) {
                        QB.content.getInfo(responce.blob_id, function(err, file_info) {
                            if (file_info) {
                                let url = QB.content.privateUrl(file_info.blob.uid);
                                user.profile_url = url;
                                user.blob_id = responce.blob_id;
                                that.addToCache(user);
                                if (showElement) {
                                    document.getElementById(showElement).style.display = "block";
                                    document.getElementById(showElement).src = url;
                                }
                                if (hideElement) {
                                    document.getElementById(hideElement).style.display = "none";
                                }
                                resolve({ profile_url: url, id: userId });
                            } else {
                                resolve(null);
                            }
                        });
                    } else {
                        resolve(null);
                    }
                });
            });
        } else {
            if (showElement && document.getElementById(showElement)) {
                document.getElementById(showElement).style.display = "block";
                document.getElementById(showElement).src = user.profile_url;
            }
            if (hideElement && document.getElementById(hideElement)) {
                document.getElementById(hideElement).style.display = "none";
            }
            return Promise.resolve({ profile_url: user.profile_url, id: userId });
        }
    }
};

User.prototype.getUsers = function() {
    var self = this,
        params = {
            tags: app.user.user_tags,
            per_page: 1000
        };

    return new Promise(function(resolve, reject) {
        QB.users.get(params, function(err, responce) {
            if (err) {
                reject(err);
            }

            var userList = responce.items.map(function(data) {
                return self.addToCache(data.user);
            });

            resolve(userList);
        });
    });
};

User.prototype.buildUserItem = function(user) {
    var self = this,
        userItem = JSON.parse(JSON.stringify(user));

    if (userItem.id === app.user.id) {
        userItem.selected = true;
    }

    var userTpl = helpers.fillTemplate('tpl_newGroupChatUser', { user: userItem }),
        elem = helpers.toHtml(userTpl)[0];

    elem.addEventListener('click', function() {
        if (elem.classList.contains('disabled')) return;

        elem.classList.toggle('selected');

        if (self.userListConteiner.querySelectorAll('.selected').length >= 2) {
            document.forms.create_dialog.dialog_name.disabled = false;
        } else {
            document.forms.create_dialog.dialog_name.disabled = true;
        }
    });

    self.userListConteiner.appendChild(elem);
};

var userModule = new User();