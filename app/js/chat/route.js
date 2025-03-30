(function() {
    'use strict';
    // this function is strict...
}());

var router = new Navigo(null, true, '#');
let userIdForDialog;

router.on({
    '': function() {
        if (!loginModule.isLogin) {
            router.navigate('/login');
        } else {
            router.navigate('#/dashboard');
        }
    },
    '/login': function() {
        if (!loginModule.isLogin) {
            loginModule.init().then(function(isLogedIn) {
                if (isLogedIn) {
                    router.navigate('#/dashboard');
                } else {
                    loginModule.renderLoginPage();
                }
            }).catch(function(error) {
                loginModule.renderLoginPage();
                console.error(error);
            });
        } else {
            router.navigate('#/dashboard');
        }
    },
    '/dashboard': function() {
        if (!loginModule.isLogin) {
            loginModule.init().then(function(isLogedIn) {
                if (!isLogedIn) {
                    router.navigate('/login');
                    return;
                }
                app.renderDashboard('chat');
                userIdForDialog = window.location.search;
                try {
                    userIdForDialog = parseInt(userIdForDialog.substring(userIdForDialog.indexOf("=") + 1));
                } catch (err) {}
                dialogModule.loadDialogs('chat')
                    .then((dialogs) => {
                        if (dialogs && dialogs.length > 0 && userIdForDialog) {
                            var foundDialog = false;
                            _.each(dialogs, function(dialog) {
                                if (dialog.type == 3 && dialog.occupants_ids && dialog.occupants_ids.includes(userIdForDialog)) {
                                    dialogModule.dialogId = dialog._id;
                                    dialogModule.renderMessages(dialog._id);
                                    dialogModule.selectCurrentDialog(dialog._id);
                                    foundDialog = true;
                                }
                            });

                            if (!foundDialog) {
                                console.log('User has not chatted with this user before');
                                // Create a new dialog
                                userModule.getUsersByIds([userIdForDialog]).then(function() {
                                    var params = {
                                        type: 3,
                                        occupants_ids: [userIdForDialog]
                                    };
                                    dialogModule.createDialog(params);
                                });
                            }
                        } else {
                            // Create a new dialog
                            userModule.getUsersByIds([userIdForDialog]).then(function() {
                                var params = {
                                    type: 3,
                                    occupants_ids: [userIdForDialog]
                                };
                                dialogModule.createDialog(params);
                            });
                        }
                    });
            }).catch(function() {
                router.navigate('/login');
            });
        } else if (app.isDashboardLoaded) {
            app.loadWelcomeTpl();
            app.sidebar.classList.add('active');
        } else {
            userIdForDialog = window.location.search;
            try {
                userIdForDialog = parseInt(userIdForDialog.substring(userIdForDialog.indexOf("=") + 1));
            } catch (err) {}
            app.renderDashboard('chat');
            dialogModule.loadDialogs('chat')
                .then((dialogs) => {
                    if (dialogs && dialogs.length > 0 && userIdForDialog) {
                        var foundDialog = false;
                        _.each(dialogs, function(dialog) {
                            if (dialog.type == 3 && dialog.occupants_ids && dialog.occupants_ids.includes(userIdForDialog)) {
                                dialogModule.dialogId = dialog._id;
                                dialogModule.renderMessages(dialog._id);
                                dialogModule.selectCurrentDialog(dialog._id);
                            }
                        });

                        if (!foundDialog) {
                            console.log('User has not chatted with this user before');
                            // Create a new dialog
                            userModule.getUsersByIds([userIdForDialog]).then(function() {
                                var params = {
                                    type: 3,
                                    occupants_ids: [userIdForDialog]
                                };
                                dialogModule.createDialog(params);
                            });
                        }
                    } else {
                        // Create a new dialog
                        userModule.getUsersByIds([userIdForDialog]).then(function() {
                            var params = {
                                type: 3,
                                occupants_ids: [userIdForDialog]
                            };
                            dialogModule.createDialog(params);
                        });
                    }
                });
        }
    },
    '/dialog/create': function() {
        if (!loginModule.isLogin) {
            loginModule.init().then(function(isLogedIn) {
                if (!isLogedIn) {
                    router.navigate('/login');
                    return;
                }
                if (!app.isDashboardLoaded) {
                    app.renderDashboard('chat');
                    dialogModule.loadDialogs('chat');
                }
                _renderNewDialogTmp();
            }).catch(function(error) {
                console.error(error);
                router.navigate('/login');
            });
        } else {
            _renderNewDialogTmp();
        }

        function _renderNewDialogTmp() {
            var createDialogTab = document.querySelector('.j-sidebar__create_dialog');

            createDialogTab.classList.add('active');
            app.sidebar.classList.remove('active');

            app.buildCreateDialogTpl();
        }
    },
    '/dialog/:dialogId': function(params) {
        var dialogId = params.dialogId;

        dialogModule.prevDialogId = dialogModule.dialogId;
        dialogModule.dialogId = dialogId;

        if (!loginModule.isLogin) {
            loginModule.init().then(function(isLogedIn) {
                if (!isLogedIn) {
                    router.navigate('/login');
                    return;
                }
                if (!app.isDashboardLoaded) {
                    app.renderDashboard();
                }
                _renderSelectedDialog();
            }).catch(function(error) {
                console.error(error);
                router.navigate('/login');
            });
        } else {
            _renderSelectedDialog();
        }

        function _renderSelectedDialog() {
            var currentDialog = dialogModule._cache[dialogId];
            if (!currentDialog) {
                dialogModule.getDialogById(dialogId).then(function(dialog) {
                    var tabDataType = dialog.type === CONSTANTS.DIALOG_TYPES.PUBLICCHAT ? 'public' : 'chat',
                        tab = document.querySelector('.j-sidebar__tab_link[data-type="' + tabDataType + '"]');

                    app.loadChatList(tab).then(function() {
                        dialogModule.renderMessages(dialogId);
                        app.sidebar.classList.remove('active');
                    }).catch(function(error) {
                        console.error(error);
                    });

                }).catch(function(error) {
                    console.error(error);
                    var tab = document.querySelector('.j-sidebar__tab_link[data-type="chat"]');
                    app.loadChatList(tab);
                    router.navigate('#/dashboard');
                });
            } else {
                dialogModule.renderMessages(dialogId);
                dialogModule.selectCurrentDialog(dialogId);
            }
        }
    },
    '/dialog/:dialogId/edit': function(params) {
        var dialogId = params.dialogId;
        var currentDialog = null;

        if (!loginModule.isLogin) {
            loginModule.init().then(function(isLogedIn) {
                if (!isLogedIn) {
                    router.navigate('/login');
                    return;
                }
                _renderEditDialogPage();
            }).catch(function(error) {
                console.error(error);
                router.navigate('/login');
            });
        } else {
            _renderEditDialogPage();
        }

        function _renderEditDialogPage() {
            if (!app.isDashboardLoaded) {
                app.renderDashboard();
            }
            currentDialog = dialogModule._cache[dialogId];

            if (!currentDialog) {
                dialogModule.dialogId = dialogId;
                dialogModule.getDialogById(dialogId).then(function(dialog) {
                    var tabDataType = dialog.type === CONSTANTS.DIALOG_TYPES.PUBLICCHAT ? 'public' : 'chat',
                        tab = document.querySelector('.j-sidebar__tab_link[data-type="' + tabDataType + '"]');
                    // add to dialog template
                    app.content.innerHTML = helpers.fillTemplate('tpl_UpdateDialogContainer', {
                        title: dialog.name,
                        _id: dialog._id
                    });
                    _setEditDiaogListeners();
                    _renderUsers(dialog.occupants_ids);
                    app.loadChatList(tab).then(function() {})
                        .catch(function(error) {
                            console.error(error);
                        });
                }).catch(function(error) {
                    router.navigate('#/dashboard');
                });
            } else {
                app.content.innerHTML = helpers.fillTemplate('tpl_UpdateDialogContainer', {
                    title: currentDialog.name,
                    _id: currentDialog._id
                });
                _setEditDiaogListeners();
                _renderUsers(currentDialog.users);
            }
        }

        function _renderUsers(dialogOccupants) {
            var userList = document.querySelector('.j-update_chat__user_list'),
                counterElem = document.querySelector('.j-update__chat_counter'),
                addUsersBtn = document.querySelector('.j-update_dialog_btn'),

                newUsersCount = +counterElem.innerText.trim();

            userModule.getUsers().then(function(usersArray) {
                var users = usersArray.map(function(user) {
                    var userItem = JSON.parse(JSON.stringify(user));

                    userItem.selected = dialogOccupants.indexOf(userItem.id) !== -1;

                    return userItem;
                });

                _.each(users, function(user) {
                    var userTpl = helpers.fillTemplate('tpl_editChatUser', user),
                        userElem = helpers.toHtml(userTpl)[0];

                    userElem.addEventListener('click', function(e) {
                        var elem = e.currentTarget;
                        if (elem.classList.contains('disabled')) return;
                        if (elem.classList.contains('selected')) {
                            elem.classList.remove('selected');
                            elem.classList.add('removed');
                            newUsersCount--;
                        } else {
                            elem.classList.add('selected');
                            newUsersCount++;
                        }

                        counterElem.innerText = newUsersCount;

                        addUsersBtn.disabled = !newUsersCount;
                    });

                    userList.appendChild(userElem);
                });

            }).catch(function(error) {
                console.error(error);
            });
        }

        function _setEditDiaogListeners() {
            var editTitleBtn = document.querySelector('.j-update_chat__title_button'),
                editTitleForm = document.forms.update_chat_name,
                editTitleInput = editTitleForm.update_chat__title,
                editUsersCountForm = document.forms.update_dialog,
                canselBtn = editUsersCountForm.update_dialog_cancel;

            // change Title listener
            editTitleBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();


                editTitleForm.classList.toggle('active');

                if (editTitleForm.classList.contains('active')) {
                    editTitleInput.removeAttribute('disabled');
                    editTitleInput.focus();
                } else {
                    editTitleInput.setAttribute('disabled', true);
                    _updateDialogTitleRequest();
                }
            });

            editTitleInput.addEventListener('input', function(e) {
                var titleText = editTitleInput.value,
                    sylmbolsCount = titleText.length;
                if (sylmbolsCount > 40) {
                    editTitleInput.value = titleText.slice(0, 40);
                }
            });

            editTitleForm.addEventListener('submit', function(e) {
                e.preventDefault();

                _updateDialogTitleRequest();
            });

            editUsersCountForm.addEventListener('submit', function(e) {
                e.preventDefault();

                var userItemsList = document.querySelectorAll('.user__item.selected:not(.disabled)'),
                    userItemsRemoved = document.querySelectorAll('.user__item.removed:not(.selected)'),
                    userList = [],
                    userRemove = [];

                _.each(userItemsList, function(userItem) {
                    userList.push(+userItem.id);
                });

                _.each(userItemsRemoved, function(userItem) {
                    userRemove.push(+userItem.id);
                });
                var params;
                if (userRemove.length > 0) {
                    params = {
                        id: dialogId,
                        userList: userRemove,
                        remove: true
                    };
                } else {
                    params = {
                        id: dialogId,
                        userList: userList,
                        remove: false
                    };
                }

                dialogModule.updateDialog(params);
            });

            canselBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                router.navigate('#/dialog/' + dialogId);
            });

            function _updateDialogTitleRequest() {
                var params = {
                    id: dialogId,
                    title: editTitleInput.value.trim()
                };

                if (dialogModule._cache[dialogId].name !== params.title) {
                    dialogModule.updateDialog(params);
                    editTitleForm.classList.remove('active');
                    editTitleInput.setAttribute('disabled', true);
                }
            }
        }
    }
}).resolve();

router.notFound(function() {
    alert('can\'t find this page');
});