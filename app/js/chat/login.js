(function() {
    'use strict';
    // this function is strict...
}());

function Login() {
    this.isLoginPageRendered = false;
    this.isLogin = false;
}

Login.prototype.init = function() {
    var self = this;
    return new Promise(function(resolve, reject) {
        var user = localStorage.getItem('user');

        if (user && !app.user) {
            var savedUser = JSON.parse(user);
            app.room = savedUser.tag_list;
            self.login(savedUser)
                .then(function() {
                    resolve(true);
                }).catch(function(error) {
                    reject(error);
                });
        } else {
            resolve(false);
        }
    });
};

Login.prototype.login = function(user) {
    var self = this;
    return new Promise(function(resolve, reject) {
        self.renderLoadingPage();
        self.isLogin = true;
        let userData = Cookie.find("user");
        userData = JSON.parse(decodeURIComponent(userData));
        document.getElementById("user-name").innerHTML = (userData.first_name != "null") ? userData.first_name + ' ' + userData.last_name : userData.full_name;
        document.getElementById("user-name-menu").innerHTML = (userData.first_name) ? userData.first_name + ' ' + userData.last_name : userData.full_name;
        if (userData && 'city' in userData) {
            document.getElementById("user-city-menu").innerHTML = userData.city;
        }
        userModule.getImage(userData)
            .then((userData) => {
                if ('imgUrl' in userData && userData.imgUrl != null) {
                    document.getElementById("profile_img").src = userData.imgUrl;
                    document.getElementById("profile_img_menu").src = userData.imgUrl;
                } else {
                    document.getElementById("profile_img").src = "../img/defaultProfilePic.png";
                    document.getElementById("profile_img_menu").src = "../img/defaultProfilePic.png";
                }
                app.user = userModule.addToCache(userData);
                app.user.user_tags = userData.user_tags;
                QB.chat.connect({ userId: app.user.id, password: user.quickblox_pwd }, function(err, roster) {

                    if (err) {
                        document.querySelector('.j-login__button').innerText = 'Login';
                        console.error(err);
                        reject(err);
                    } else {
                        self.isLogin = true;
                        resolve();
                    }
                });
            });

    });

};

Login.prototype.renderLoginPage = function() {
    helpers.clearView(app.page);

    app.page.innerHTML = helpers.fillTemplate('tpl_login', {
        version: QB.version + ':' + QB.buildNumber
    });
    this.isLoginPageRendered = true;
    this.setListeners();
};

Login.prototype.renderLoadingPage = function() {
    helpers.clearView(app.page);
    app.page.innerHTML = helpers.fillTemplate('tpl_loading');
};

Login.prototype.setListeners = function() {
    var self = this,
        loginForm = document.forms.loginForm,
        formInputs = [loginForm.userName, loginForm.userGroup],
        loginBtn = loginForm.login_submit;

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        if (loginForm.hasAttribute('disabled')) {
            return false;
        } else {
            loginForm.setAttribute('disabled', true);
        }

        var userName = loginForm.userName.value.trim(),
            userGroup = loginForm.userGroup.value.trim();

        var user = {
            login: helpers.getUui(),
            password: 'webAppPass',
            full_name: userName,
            tag_list: userGroup
        };

        localStorage.setItem('user', JSON.stringify(user));

        self.login(user).then(function() {
            router.navigate('#/dashboard');
        }).catch(function(error) {
            alert('lOGIN ERROR\n open console to get more info');
            loginBtn.removeAttribute('disabled');
            console.error(error);
            loginForm.login_submit.innerText = 'LOGIN';
        });
    });

    // add event listeners for each input;
    _.each(formInputs, function(i) {
        i.addEventListener('focus', function(e) {
            var elem = e.currentTarget,
                container = elem.parentElement;

            if (!container.classList.contains('filled')) {
                container.classList.add('filled');
            }
        });

        i.addEventListener('focusout', function(e) {
            var elem = e.currentTarget,
                container = elem.parentElement;

            if (!elem.value.length && container.classList.contains('filled')) {
                container.classList.remove('filled');
            }
        });

        i.addEventListener('input', function() {
            var userName = loginForm.userName.value.trim(),
                userGroup = loginForm.userGroup.value.trim();
            if (userName.length >= 3 && userGroup.length >= 3) {
                loginBtn.removeAttribute('disabled');
            } else {
                loginBtn.setAttribute('disabled', true);
            }
        });
    });
};

var loginModule = new Login();