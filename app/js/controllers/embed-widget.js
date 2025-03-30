angular.module('PromoApp')
    .controller('embedWidgetController', ['$rootScope', '$route', '$scope', 'Utils', 'metaTagsService', 'authService', 'eventsService', 'config', '$window', 'apiService', '$uibModal', 'orderByFilter', '$mdDialog', 'awsService', 'userService', '$http',
        function($rootScope, $route, $scope, Utils, metaTagsService, authService, eventsService, config, $window, apiService, $uibModal, orderBy, $mdDialog, awsService, userService, $http) {
            /*
             ** $scope variable defines
             */
            $scope.loading = false;
            $scope.loadingMessage = 'Loading...';
            $scope.buttonDisplayTooltip = 'Copy';
            $scope.buttonViewFlag = true;
            $scope.detailViewFlag = false;
            $scope.listViewFlag = false;
            $scope.mapViewFlag = false;
            $scope.disableClickFlag = false;
            let oHeader = {
                alg: 'HS256',
                typ: 'JWT'
            };
            let sHeader = JSON.stringify(oHeader);
            $scope.base_url = $window.location.origin;
            let sEventValue = '';
            $scope.yellowBanner = false;
            let token = authService.get('token');
            $scope.categoriesMap = [];
            $scope.eventsLists = [];
            $scope.selectedEventlist = '';
            $scope.optionDisableFlag = true;
            $scope.updateDisableFlag = true;
            $scope.imageUpdate = false;
            apiService.getEventCategories(token).then((response) => {
                if (response.status == 200) {
                    let data = response.data;
                    if (data.success) {
                        let catData = data.data;
                        catData.forEach(function(cat) {
                            let category = {};
                            category.id = cat.slug;
                            category.name = cat.category_name;
                            category.icon = cat.category_image;
                            category.iconImg = "<img src=" + cat.category_image + " alt='image' />";
                            category.marker = cat.category_image;
                            category.unselectedIcon = cat.category_image;
                            category.selected = true;
                            $scope.categoriesMap.push(category);
                        });
                    }
                }
            });
            $scope.organiser = {
                image: '',
                websiteName: '',
                websiteURL: '',
                croppedImage: ''
            };
            $scope.showHide = {
                imageSelected: false
            };
            let promise = null;

            /*
             ** Button Tab Default $scope
             */

            $scope.embedButtons = {
                toggles: false,
                text: "Go to event detail",
                buttonColor: '#A02740',
                textColor: "#FFFFFF",
                url: ""
            };

            $scope.embedEventDetails = {
                text: "Get Tickets Now",
                buttonColor: '#A02740',
                textColor: "#FFFFFF",
                description: true,
                sharing: true,
                sharingFacebook: true,
                sharingMail:true,
                url: ""
            };

            $scope.embedEventLists = {
                text: "Get Tickets Now",
                buttonColor: '#A02740',
                url: ""
            };

            $scope.embedEventMaps = {
                width: '516',
                height: '315',
                lat: 0,
                long: 0,
                code: '',
                city: '',
                previewUrl: ''
            };

            /*
             ** Link Coppied
             */
            $scope.buttonLinkCopied = () => {
                $scope.buttonDisplayTooltip = 'Copied';
                setTimeout(function() {
                    $scope.buttonDisplayTooltip = 'Copy';
                    Utils.applyChanges($scope);
                }, 3000);
            };

            /*
             ** shortner Link 
             */
            $scope.shortnerUrl = (value) => {
                return $http({
                    url: 'https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=AIzaSyC5Bis-UR8qn16xDukoGHJkIMa8Q8nv7XI',
                    method: 'POST',
                    data: {
                        "dynamicLinkInfo": {
                            "domainUriPrefix": 'https://thepromoapp.page.link',
                            "link": value,
                        }
                    },
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    json: true,
                });
            };


            /*
             ** Create iframe link for Buttons
             */
            $scope.$watch('embedButtons.toggles', function() {
                $scope.buttonFrameGenerate(true);
            });
            $scope.$watch('embedButtons.text', function() {
                $scope.buttonFrameGenerate(true);
            });
            $scope.$watch('embedButtons.buttonColor', function() {
                $scope.buttonFrameGenerate(true);
            });
            $scope.$watch('embedButtons.textColor', function() {
                $scope.buttonFrameGenerate(true);
            });
            $scope.buttonFrameGenerate = (value) => {
                if (value) {
                    let buttonData = {
                        toggles: $scope.embedButtons.toggles,
                        text: $scope.embedButtons.text,
                        buttonColor: $scope.embedButtons.buttonColor,
                        textColor: $scope.embedButtons.textColor,
                        embedOption: 'buttonView',
                        eventIds: $scope.eventId.eventId,
                        user_id: $scope.user.user_id
                    };
                    sEventValue = JSON.stringify(buttonData);
                    $scope.jsonToken = KJUR.jws.JWS.sign("HS256", sHeader, sEventValue, config.JWT_SECRET);
                    let tempUrl = $scope.base_url + "/embedevents?embed=" + $scope.jsonToken;
                    let newLink = "";
                    $scope.shortnerUrl(tempUrl).then((data) => {
                        if (data.data != null) {
                            newLink = data.data.shortLink;
                            $scope.embedEventDetails.url = "<iframe src='" + newLink + "' width='100%' height='820px' frameBorder='0'></iframe>";
                        } else {
                            $scope.embedEventDetails.url = "<iframe src='" + $scope.base_url + "/embedevents?embed=" + $scope.jsonToken + "' width='100%' height='820px' frameBorder='0'></iframe>";
                        }
                    });
                } else {
                    let buttonData = {
                        toggles: $scope.embedButtons.toggles,
                        text: $scope.embedButtons.text,
                        buttonColor: $scope.embedButtons.buttonColor,
                        textColor: $scope.embedButtons.textColor,
                        embedOption: 'buttonView',
                        eventIds: $scope.eventId.eventId,
                        user_id: $scope.user.user_id
                    };
                    sEventValue = JSON.stringify(buttonData);
                    $scope.jsonToken = KJUR.jws.JWS.sign("HS256", sHeader, sEventValue, config.JWT_SECRET);
                    let tempUrl = $scope.base_url + "/embedevents?embed=" + $scope.jsonToken;
                    let newLink = "";
                    $scope.shortnerUrl(tempUrl).then((data) => {
                        if (data.data != null) {
                            newLink = data.data.shortLink;
                            $scope.embedButtons.url = "<iframe src='" + newLink + "' width='100%' height='820px' frameBorder='0'></iframe>";
                        } else {
                            $scope.embedButtons.url = "<iframe src='" + $scope.base_url + "/embedevents?embed=" + $scope.jsonToken + "' width='100%' height='820px' frameBorder='0'></iframe>";
                        }
                    });
                }
            };

            /*
             ** Create iframe link for Details
             */
            $scope.$watch('embedEventDetails.text', function() {
                $scope.detailsFrameGenerate(true);
            });
            $scope.$watch('embedEventDetails.buttonColor', function() {
                $scope.detailsFrameGenerate(true);
            });
            $scope.$watch('embedEventDetails.textColor', function() {
                $scope.detailsFrameGenerate(true);
            });
            $scope.$watch('embedEventDetails.description', function() {
                $scope.detailsFrameGenerate(true);
            });
            $scope.$watch('embedEventDetails.sharing', function() {
                $scope.detailsFrameGenerate(true);
            });
            $scope.$watch('embedEventDetails.sharingFacebook', function() {
                $scope.detailsFrameGenerate(true);
            });
            $scope.$watch('embedEventDetails.sharingSnapchat', function() {
                $scope.detailsFrameGenerate(true);
            });
            $scope.$watch('embedEventDetails.sharingWhatsapp', function() {
                $scope.detailsFrameGenerate(true);
            });
            $scope.$watch('embedEventDetails.sharingMail', function() {
                $scope.detailsFrameGenerate(true);
            });
            $scope.$watch('embedEventDetails.sharingLink', function() {
                $scope.detailsFrameGenerate(true);
            });
            $scope.detailsFrameGenerate = (value) => {
                if (value) {
                    let detailsData = {
                        text: $scope.embedEventDetails.text,
                        buttonColor: $scope.embedEventDetails.buttonColor,
                        textColor: $scope.embedEventDetails.textColor,
                        description: $scope.embedEventDetails.description,
                        sharing: $scope.embedEventDetails.sharing,
                        sharingFacebook: $scope.embedEventDetails.sharingFacebook,
                        sharingSnapchat: $scope.embedEventDetails.sharingSnapchat,
                        sharingWhatsapp: $scope.embedEventDetails.sharingWhatsapp,
                        sharingMail: $scope.embedEventDetails.sharingMail,
                        sharingLink: $scope.embedEventDetails.sharingLink,
                        embedOption: 'detailView',
                        eventIds: $scope.eventId.eventId,
                        user_id: $scope.user.user_id
                    };
                    sEventValue = JSON.stringify(detailsData);
                    $scope.jsonToken = KJUR.jws.JWS.sign("HS256", sHeader, sEventValue, config.JWT_SECRET);
                    let tempUrl = $scope.base_url + "/embedevents?embed=" + $scope.jsonToken;
                    let newLink = "";
                    $scope.shortnerUrl(tempUrl).then((data) => {
                        if (data.data != null) {
                            newLink = data.data.shortLink;
                            $scope.embedEventDetails.url = "<iframe src='" + newLink + "' width='100%' height='820px' frameBorder='0'></iframe>";
                        } else {
                            $scope.embedEventDetails.url = "<iframe src='" + $scope.base_url + "/embedevents?embed=" + $scope.jsonToken + "' width='100%' height='820px' frameBorder='0'></iframe>";
                        }
                    });
                } else {
                    let detailsData = {
                        text: $scope.embedEventDetails.text,
                        buttonColor: $scope.embedEventDetails.buttonColor,
                        textColor: $scope.embedEventDetails.textColor,
                        description: $scope.embedEventDetails.description,
                        sharing: $scope.embedEventDetails.sharing,
                        sharingFacebook: $scope.embedEventDetails.sharingFacebook,
                        sharingSnapchat: $scope.embedEventDetails.sharingSnapchat,
                        sharingWhatsapp: $scope.embedEventDetails.sharingWhatsapp,
                        sharingMail: $scope.embedEventDetails.sharingMail,
                        sharingLink: $scope.embedEventDetails.sharingLink,
                        embedOption: 'detailView',
                        eventIds: $scope.eventId.eventId,
                        user_id: $scope.user.user_id
                    };
                    sEventValue = JSON.stringify(detailsData);
                    $scope.jsonToken = KJUR.jws.JWS.sign("HS256", sHeader, sEventValue, config.JWT_SECRET);
                    let tempUrl = $scope.base_url + "/embedevents?embed=" + $scope.jsonToken;
                    let newLink = "";
                    $scope.shortnerUrl(tempUrl).then((data) => {
                        if (data.data != null) {
                            newLink = data.data.shortLink;
                            $scope.embedEventDetails.url = "<iframe src='" + newLink + "' width='100%' height='820px' frameBorder='0'></iframe>";
                        } else {
                            $scope.embedEventDetails.url = "<iframe src='" + $scope.base_url + "/embedevents?embed=" + $scope.jsonToken + "' width='100%' height='820px' frameBorder='0'></iframe>";
                        }
                    });
                }
            };

            /*
             ** Create iframe link for Lists
             */
            $scope.$watch('embedEventLists.text', function() {
                $scope.listsFrameGenerate(true);
            });
            $scope.$watch('embedEventLists.buttonColor', function() {
                $scope.listsFrameGenerate(true);
            });
            $scope.listsFrameGenerate = (value) => {
                if (value) {
                    let listsData = {
                        text: $scope.embedEventLists.text,
                        buttonColor: $scope.embedEventLists.buttonColor,
                        embedOption: 'listView',
                        eventIds: $scope.eventId.eventId,
                        user_id: $scope.user.user_id
                    };
                    sEventValue = JSON.stringify(listsData);
                    $scope.jsonToken = KJUR.jws.JWS.sign("HS256", sHeader, sEventValue, config.JWT_SECRET);
                    let tempUrl = $scope.base_url + "/embedevents?embed=" + $scope.jsonToken;
                    let newLink = "";
                    $scope.shortnerUrl(tempUrl).then((data) => {
                        if (data.data != null) {
                            newLink = data.data.shortLink;
                            $scope.embedEventLists.url = "<iframe src='" + newLink + "' width='100%' height='820px' frameBorder='0'></iframe>";
                        } else {
                            $scope.embedEventLists.url = "<iframe src='" + $scope.base_url + "/embedevents?embed=" + $scope.jsonToken + "' width='100%' height='820px' frameBorder='0'></iframe>";
                        }
                    });
                } else {
                    let listsData = {
                        text: $scope.embedEventLists.text,
                        buttonColor: $scope.embedEventLists.buttonColor,
                        embedOption: 'listView',
                        eventIds: $scope.eventId.eventId,
                        user_id: $scope.user.user_id
                    };
                    sEventValue = JSON.stringify(listsData);
                    $scope.jsonToken = KJUR.jws.JWS.sign("HS256", sHeader, sEventValue, config.JWT_SECRET);
                    let tempUrl = $scope.base_url + "/embedevents?embed=" + $scope.jsonToken;
                    let newLink = "";
                    $scope.shortnerUrl(tempUrl).then((data) => {
                        if (data.data != null) {
                            newLink = data.data.shortLink;
                            $scope.embedEventLists.url = "<iframe src='" + newLink + "' width='100%' height='820px' frameBorder='0'></iframe>";
                        } else {
                            $scope.embedEventLists.url = "<iframe src='" + $scope.base_url + "/embedevents?embed=" + $scope.jsonToken + "' width='100%' height='820px' frameBorder='0'></iframe>";
                        }
                    });
                }
            };

            /*
             ** Create iframe link for Maps
             */
            $scope.$watch('loct', function() {
                if ($scope.loct) {
                    $scope.embedEventMaps.lat = $scope.loct.lat;
                    $scope.embedEventMaps.long = $scope.loct.long;
                    $scope.setCode(false);
                    Utils.applyChanges($scope);
                }
            });

            $scope.setCode = function(useEvent) {
                if ($scope.eventList.length > 0 && useEvent) {
                    let firstSelectedEventId = '';
                    if ($route.current.params.ev) {
                        firstSelectedEventId = $scope.eventId.eventId;
                    } else {
                        if ($scope.eventId.length > 0) {
                            firstSelectedEventId = $scope.eventId.eventId[0];
                        } else {
                            firstSelectedEventId = (typeof $scope.eventId.eventId[0] !== 'undefined') ? $scope.eventId.eventId[0] : $scope.eventId.eventId;
                        }
                    }

                    let eventsData = {
                        eventIds: $scope.eventId.eventId
                    };
                    sEventValue = JSON.stringify(eventsData);
                    $scope.jsonToken = KJUR.jws.JWS.sign("HS256", sHeader, sEventValue, config.JWT_SECRET);
                    let firstSelectedEventDetails = {};
                    angular.forEach($scope.eventList, function(event, key) {
                        if (event.event_id == firstSelectedEventId) {
                            firstSelectedEventDetails = event;
                        }
                    });
                    $scope.embedEventMaps.lat = firstSelectedEventDetails.latitude;
                    $scope.embedEventMaps.long = firstSelectedEventDetails.longitude;
                    $scope.embedEventMaps.city = firstSelectedEventDetails.address;
                }
                let tempUrl = $scope.base_url + "/embedevents/" + $scope.user.user_id + '?lat=' + $scope.embedEventMaps.lat + '&long=' + $scope.embedEventMaps.long + '&event=' + $scope.jsonToken;
                let newLink = "";
                $scope.shortnerUrl(tempUrl).then((data) => {
                    if (data.data != null) {
                        newLink = data.data.shortLink;
                        $scope.embedEventMaps.code = '<iframe src="' + newLink + '" width="' + $scope.embedEventMaps.width + '" height="' + $scope.embedEventMaps.height + '" frameBorder="0"></iframe>';
                    } else {
                        $scope.embedEventMaps.code = '<iframe src="' + $scope.base_url + '/embedevents/' + $scope.user.user_id + '?lat=' + $scope.embedEventMaps.lat + '&long=' + $scope.embedEventMaps.long + '&event=' + $scope.jsonToken + '" width="' + $scope.embedEventMaps.width + '" height="' + $scope.embedEventMaps.height + '" frameBorder="0"></iframe>';
                    }
                });
            };

            /*
             ** Category Function
             */
            $scope.getCatName = function(nameKey, myArray) {
                for (var i = 0; i < myArray.length; i++) {
                    if (myArray[i].id === nameKey) {
                        return myArray[i];
                    }
                }
            };

            /*
             ** Edit Selected Event/s
             */
            $scope.editSelectedEvents = () => {
                let eventModelScope = $scope.$new(false, $scope);
                $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/editSelectedEventsModal.html',
                    openedClass: 'pa-create-event-modal freeEventTickets popup_wtd_700 chooseWidgetType selectSingleEvent scroll_popup',
                    scope: eventModelScope,
                    backdrop: 'static',
                    size: 'md'
                });
            };

            /*
             ** Select Event Single / Multiple Function
             */
            let valuesData = [];
            $scope.selecteEventFromList = (type, valueId) => {
                let oHeader = {
                    alg: 'HS256',
                    typ: 'JWT'
                };
                let valueFlag = true;
                let sHeader = JSON.stringify(oHeader);
                if (type === 'single') {
                    $scope.selectedEventlist = valueId;
                    $scope.optionDisableFlag = false;
                    let dataId = {
                        eventId: valueId
                    };
                    let sEventIds = JSON.stringify(dataId);
                    $scope.eventsIdList = KJUR.jws.JWS.sign("HS256", sHeader, sEventIds, config.JWT_SECRET);
                } else {
                    valuesData.forEach((data, index) => {
                        if (data === valueId) {
                            valueFlag = false;
                            valuesData.splice(index, 1);
                        } else {
                            valueFlag = true;
                        }
                    });
                    if (valueFlag) {
                        for (let s of $scope.eventsLists) {
                            if (s.event_id === valueId) {
                                s.selected = true;
                                valuesData.push(s.event_id);
                            }
                        }
                    } else {
                        for (let s of $scope.eventsLists) {
                            if (s.event_id === valueId) {
                                s.selected = false;
                            }
                        }
                    }
                    if (valuesData.length > 0) {
                        $scope.optionDisableFlag = false;
                    } else {
                        $scope.optionDisableFlag = true;
                    }
                    let dataIds = {
                        eventId: valuesData
                    };
                    let sEventValueIds = JSON.stringify(dataIds);
                    $scope.eventsIdList = KJUR.jws.JWS.sign("HS256", sHeader, sEventValueIds, config.JWT_SECRET);
                }
            };

            /*
             ** Choose event
             */
            $scope.chooseOption = (option, eventType) => {
                window.location.href = `/embedWidget?option=${option}&event=${$scope.eventsIdList}&eventType=${eventType}`;
                Utils.applyChanges($scope);
            };

            /*
             ** Update Orgniser's Info
             */
            $scope.updateOrganiserModal = () => {
                let eventModelScope = $scope.$new(false, $scope);
                $uibModal.open({
                    ariaLabelledBy: 'modal-title',
                    ariaDescribedBy: 'modal-body',
                    templateUrl: '../../partials/users/updateOrganizerInfoModal.html',
                    openedClass: 'pa-create-event-modal freeEventTickets popup_wtd_700 chooseWidgetType selectSingleEvent scroll_popup',
                    scope: eventModelScope,
                    backdrop: 'static',
                    size: 'md'
                });
            };

            /*
             **  Image Crop Area
             */
            $scope.handleFileSelect = function(files, evt, invalidFiles) {
                let file = files;
                if (file) {
                    let reader = new FileReader();
                    $scope.showHide.imageSelected = true;
                    reader.onload = function(evt) {
                        $scope.$apply(function($scope) {
                            $scope.imageForCropping = evt.target.result;
                            if (!$scope.showHide.isMobile.matches) {
                                $mdDialog.show({
                                        controller: ['$scope', '$mdDialog', 'imageForCropping', function($scope, $mdDialog, imageForCropping) {
                                            $scope.imageForCropping = imageForCropping;
                                            $scope.croppedImage = null;
                                            $scope.closeDialog = function(state) {
                                                $mdDialog.hide({ state: state, image: $scope.croppedImage });
                                            };
                                        }],
                                        templateUrl: 'cropImage.html',
                                        parent: angular.element(document.body),
                                        clickOutsideToClose: false,
                                        fullscreen: true,
                                        locals: {
                                            imageForCropping: $scope.imageForCropping
                                        },
                                        onShowing: function(scope, element) {
                                            element.addClass('pa-background-white');
                                        }
                                    })
                                    .then(function(state) {
                                        if (state.state === 'save') {
                                            $scope.organiser.croppedImage = state.image;
                                            $scope.setCroppedImageAsFinalImage();
                                            $scope.imageUpdate = true;
                                        } else {
                                            $scope.discardCroppedImage();
                                        }
                                    }, function() {
                                        $scope.status = 'You cancelled the dialog.';
                                    });
                            }
                        });
                    };
                    reader.readAsDataURL(file);
                } else if (invalidFiles.length > 0) {
                    let err = invalidFiles.some(er => er.$error == "maxSize");
                    if (err) {
                        Utils.showError($scope, "Your file size should not be larger than 10MB.");
                    }
                    $scope.showHide.imageSelected = false;
                } else if ($scope.organiser.croppedImage) {
                    // this block is done to handle clicking on cancel in case of edit image
                    $scope.organiser.image = $scope.organiser.croppedImage;
                }
            };

            function dataURItoBlob(dataURI) {
                // convert base64/URLEncoded data component to raw binary data held in a string
                var byteString;
                if (dataURI.split(',')[0].indexOf('base64') >= 0)
                    byteString = atob(dataURI.split(',')[1]);
                else
                    byteString = unescape(dataURI.split(',')[1]);

                // separate out the mime component
                var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
                // write the bytes of the string to a typed array
                var ia = new Uint8Array(byteString.length);
                for (var i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }
                return new Blob([ia], {
                    type: mimeString
                });
            }

            $scope.setCroppedImageAsFinalImage = function($event) {
                if ($scope.showHide.imageSelected) {
                    $scope.imageForCropping = null;
                    $scope.organiser.image = $scope.organiser.croppedImage;
                    $scope.showHide.imageSelected = false;
                }
                if ($event) {
                    $event.preventDefault();
                }
            };

            $scope.discardCroppedImage = function($event) {
                $scope.showHide.imageSelected = false;
                $scope.organiser.image = "";
                $scope.organiser.croppedImage = null;
                $scope.imageForCropping = null;
                if ($event) {
                    $event.preventDefault();
                }
            };

            $scope.$watch('organiser.image', function() {
                $scope.buttonEnable();
            });
            $scope.$watch('organiser.websiteName', function() {
                $scope.buttonEnable();
            });
            $scope.$watch('organiser.websiteURL', function() {
                $scope.buttonEnable();
            });

            // This function called while user enter organiser info
            $scope.buttonEnable = () => {
                if ($scope.organiser.image != '' && $scope.organiser.websiteName != null && $scope.organiser.websiteURL != null) {
                    $scope.updateDisableFlag = false;
                } else {
                    $scope.updateDisableFlag = true;
                }
            };

            // This function is called on click on edit image
            $scope.editImage = function(id) {
                angular.element('#' + id).click();
            };

            // This function is called on click on delete image
            $scope.deleteImage = function() {
                $scope.organiser.image = '';
                $scope.imageUpdate = true;
                $scope.organiser.croppedImage = null;
            };

            /*
             ** Update  Organiser's Info
             */
            $scope.updateInfo = () => {
                $scope.loading = true;
                $scope.loadingMessage = "Updated Organiser Details...";
                let token = authService.get('token');
                let data = {
                    "website_name": $scope.organiser.websiteName,
                    "url": $scope.organiser.websiteURL
                };
                promise = awsService.post('/profile/update', data, token);
                return promise.then((res) => {
                    let fileName = $scope.user.user_id + '-org-' + Date.now() + '.png';
                    let blob = dataURItoBlob($scope.organiser.image);
                    let file = new File([blob], fileName);
                    let aws_config = {
                        'bucket': config.AWS_BUCKET,
                        'access_key': config.AWS_ACCESS_KEY,
                        'secret_key': config.AWS_SECRET_KEY,
                        'region': config.AWS_REGION,
                        'path': config.ORG_LOGO_UPLOAD_FOLDER,
                        'img_show_url': config.AWS_IMG_SHOW_URL,
                    };
                    return eventsService.uploadImg(file, aws_config);
                }).then((response) => {
                    let data = '';
                    if ($scope.imageUpdate) {
                        data = {
                            "logo": response.file_url,
                        };
                    } else {
                        data = {
                            "logo": $scope.organiser.image,
                        };
                    }
                    awsService.post('/profile/update', data, token).then((response) => {
                        let data = response;
                        $window.localStorage.setItem('user', JSON.stringify(data.data));
                        if (data.success) {
                            let notify = {
                                type: 'success',
                                title: 'Success!',
                                content: "Organiser's info updated Successfully.",
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                            Utils.applyChanges($scope);
                        } else {
                            let notify = {
                                type: 'error',
                                title: 'Oops!!',
                                content: data.message,
                                timeout: 5000 //time in ms
                            };
                            $scope.$emit('notify', notify);
                        }
                    });
                }).catch((error) => {
                    $scope.loading = false;
                    let content = "Sorry something went wrong. Please try later.";
                    if (error.data && 'message' in error.data) {
                        content = error.data.message;
                    }
                    let notify = {
                        type: 'error',
                        title: 'OOPS!!',
                        content: content,
                        timeout: 5000 //time in ms
                    };
                    $scope.$emit('notify', notify);
                }).finally(() => {
                    $scope.loading = false;
                });
            };

            /*
             ** Close Modal
             */
            $scope.close = function() {
                this.$close('close');
            };


            $scope.searchIconUrl = function(nameKey) {
                let myArray = [];
                angular.forEach($scope.categoriesMap, function(value, key) {
                    if (value.id === "programing-arts") {
                        value.id = "performing-arts";
                    }
                    myArray.push(value);
                });
                for (var i = 0; i < myArray.length; i++) {
                    if (myArray[i].id === nameKey) {
                        return myArray[i].icon;
                    }
                }
            };

            $rootScope.$on('$routeChangeStart', function() {
                $window.localStorage.removeItem("needHardRefresh");
            });

            /*
             ** Init Method
             */
            $scope.init = () => {
                let needHardRefresh = $window.localStorage.getItem("needHardRefresh");

                if (needHardRefresh) {
                    $window.localStorage.removeItem("needHardRefresh");
                } else {
                    $window.localStorage.setItem("needHardRefresh", true);
                    $window.location.reload();
                }
                $scope.user = authService.getUser();
                $scope.showHide.isMobile = window.matchMedia("only screen and (max-width: 1024px)");
                $scope.loading = true;
                $scope.eventId = [];
                $scope.eventList = [];
                $scope.eventId = KJUR.jws.JWS.readSafeJSONString(b64utoutf8(($route.current.params.event).split(".")[1]));
                $scope.option = $route.current.params.option;
                $scope.eventSelectionType = $route.current.params.eventType;
                userService.getUserProfile($scope.user.user_id).then((response) => {
                    $scope.organiser = {
                        image: response.data.data.logo,
                        websiteName: response.data.data.website_name,
                        websiteURL: response.data.data.url
                    };
                });
                if ($route.current.params.event && $route.current.params.ev) {
                    eventsService.getEventsByStatus({ "status": "live", "page": 1, "limit": 10000 }).then((responseLive) => {
                        let liveEvent = orderBy(responseLive.data, 'start_date_time_ms', true);
                        $scope.eventsLists.push(...liveEvent);
                        if ($scope.eventSelectionType === 'single') {
                            angular.forEach($scope.eventsLists, function(listItem) {
                                if ($route.current.params.ev == listItem.event_id) {
                                    listItem.categoriesImageView = (listItem.highlighted ? 'img/' + $scope.getCatName(listItem.category, $scope.categoriesMap).id + '_highlight.svg' : $scope.getCatName(listItem.category, $scope.categoriesMap).icon);
                                    $scope.selectedEventlist = listItem.event_id;
                                    $scope.optionDisableFlag = false;
                                    valuesData.push(listItem.event_id);
                                    $scope.eventList.push(listItem);
                                }
                            });
                        } else {
                            angular.forEach($scope.eventsLists, function(list) {
                                angular.forEach($scope.eventId.eventId, function(listItems) {
                                    if (listItems === list.event_id) {
                                        list.selected = true;
                                        list.categoriesImageView = (list.highlighted ? 'img/' + $scope.getCatName(list.category, $scope.categoriesMap).id + '_highlight.svg' : $scope.getCatName(list.category, $scope.categoriesMap).icon);
                                        $scope.optionDisableFlag = false;
                                        valuesData.push(list.event_id);
                                        $scope.eventList.push(list);
                                        if (valuesData.length > 1) {
                                            $scope.disableClickFlag = true;
                                        }
                                    }
                                });
                            });
                        }
                        $scope.buttonFrameGenerate(false);
                        $scope.detailsFrameGenerate(false);
                        $scope.setCode(true);
                        $scope.loading = false;
                    }).catch((err) => { console.log("Event List Live:::", err); });
                } else {
                    eventsService.getEventsByStatus({ "status": "live", "page": 1, "limit": 10000, }).then((response) => {
                        $scope.eventsLists = orderBy(response.data, 'start_date_time', true);
                        if ($scope.eventSelectionType === 'single') {
                            angular.forEach($scope.eventsLists, function(listItem) {
                                if ($scope.eventId.eventId === listItem.event_id) {
                                    listItem.categoriesImageView = (listItem.highlighted ? 'img/' + $scope.getCatName(listItem.category, $scope.categoriesMap).id + '_highlight.svg' : $scope.getCatName(listItem.category, $scope.categoriesMap).icon);
                                    $scope.selectedEventlist = listItem.event_id;
                                    $scope.optionDisableFlag = false;
                                    valuesData.push(listItem.event_id);
                                    $scope.eventList.push(listItem);
                                }
                            });
                        } else {
                            angular.forEach($scope.eventsLists, function(list) {
                                angular.forEach($scope.eventId.eventId, function(listItems) {
                                    if (listItems === list.event_id) {
                                        list.selected = true;
                                        list.categoriesImageView = (list.highlighted ? 'img/' + $scope.getCatName(list.category, $scope.categoriesMap).id + '_highlight.svg' : $scope.getCatName(list.category, $scope.categoriesMap).icon);
                                        $scope.optionDisableFlag = false;
                                        valuesData.push(list.event_id);
                                        $scope.eventList.push(list);
                                        if (valuesData.length > 1) {
                                            $scope.disableClickFlag = true;
                                        }
                                    }
                                });
                            });
                        }
                        $scope.buttonFrameGenerate(false);
                        $scope.detailsFrameGenerate(false);
                        $scope.setCode(true);
                    }).finally(() => {
                        $scope.loading = false;
                    });
                }
                if ($scope.option === 'buttonView') {
                    $scope.buttonViewFlag = true;
                } else if ($scope.option === 'detailView') {
                    $scope.detailViewFlag = true;
                } else if ($scope.option === 'listView') {
                    $scope.listViewFlag = true;
                } else if ($scope.option === 'mapView') {
                    $scope.mapViewFlag = true;
                } else {
                    $scope.buttonViewFlag = true;
                }
                metaTagsService.setDefaultTags({
                    'Title': 'The Promo App | Social Event Management Network',
                    'Description': 'The Promo App makes social event networking and event management easier than ever before. Find events, buy and sell tickets, promote events, and more.',
                    'Keywords': 'The Promo App, event management',
                    // OpenGraph
                    'og:site_name': 'thepromoapp',
                    'og:title': 'The Best Events',
                    'og:description': 'Bringing you and your friends together in real life at incredible events',
                    'og:image': '/img/event-promo-app.jpeg',
                    'og:url': 'https://thepromoapp.com',
                    // Twitter
                    'twitter:title': 'Thousands of Events',
                    'twitter:description': "Have a social life again - bring your friends",
                    'twitter:image': '/img/event-promo-app.jpeg',
                    'twitter:card': '/img/event-promo-app.jpeg',
                });

            };
            $scope.init();
        }
    ]);