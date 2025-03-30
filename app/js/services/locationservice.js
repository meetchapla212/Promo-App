
angular.module('PromoApp')
    .service('locationService', ['authService', '$http','config', function (authService, $http, config) {
        var ls = this;
        this.getUserLocation = (onlyLS) => {
            return new Promise((resolve, reject) => {

                // Check user location is present in cookie
                let userCurrentLocation = authService.getObject('userCurrentLocation');
                if (userCurrentLocation) {
                    resolve(userCurrentLocation);
                } else {
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(function (position) {
                            let geocoder = new google.maps.Geocoder();
                            geocoder.geocode({
                                'location': {
                                    lat: position.coords.latitude,
                                    lng: position.coords.longitude
                                }
                            }, function (results, status) {
                                let finalLocation = {
                                    lat: position.coords.latitude,
                                    lng: position.coords.longitude
                                };
                                let addr = null,city=null;
                                if (results[0]) {
                                    addr = results[0].formatted_address;

                                    if('address_components' in results[0] && results[0].address_components){
                                        // Get locality 
                                        let cityComponent = results[0].address_components.filter(a=>a.types && a.types.includes('locality','administrative_area_level_3'));
                                        if(cityComponent && cityComponent.length>0){
                                            city = cityComponent[0].short_name;
                                        }
                                    }

                                    let stateComponent = results[0].address_components.filter(a=>a.types && a.types.includes('administrative_area_level_1'));
                                    if(stateComponent && stateComponent.length>0){
                                        finalLocation.state = stateComponent[0].long_name;
                                    }

                                    let zipCodeComponent = results[0].address_components.filter(a=>a.types && a.types.includes('postal_code'));
                                    if(zipCodeComponent && zipCodeComponent.length>0){
                                        finalLocation.zipcode = zipCodeComponent[0].long_name;
                                    }

                                    let countryComponent = results[0].address_components.filter(a=>a.types && a.types.includes('country'));
                                    if(countryComponent && countryComponent.length>0){
                                        finalLocation.country = countryComponent[0].long_name;
                                        finalLocation.country_short_code = countryComponent[0].short_name;
                                    }
                                }

                                finalLocation.address = addr;
                                if(city){
                                    finalLocation.city = city;
                                }
                                authService.putWithExpiry('userCurrentLocation', JSON.stringify(finalLocation));
                                resolve(finalLocation);
                            });
                        }, function () {
                            if(!onlyLS){
                                ls.getLocationByIP().then(res => {
                                    let finalLocation = {
                                        address: res.data.city,
                                        lat: res.data.latitude,
                                        lng: res.data.longitude
                                    };
                                    authService.putWithExpiry('userCurrentLocation', JSON.stringify(finalLocation));
                                    resolve(finalLocation);
                                });
                            }else{
                                resolve(null);
                            }
                        });
                    } else {
                        return Promise.resolve(null);
                    }
                }
            });
        };

        ls.getLocationByIP = function () {

            return $http({
                method: 'GET',
                url: 'https://api.ipstack.com/check?access_key='+config.ACCESS_KEY,
            });
        };

        ls.getAddressByLatLong = function(lat, long){

            if(typeof(lat) === 'string'){
                lat = parseFloat(lat);
            }
            if(typeof(long) === 'string'){
                long = parseFloat(long);
            }
            return new Promise((resolve,reject)=>{
                let geocoder = new google.maps.Geocoder();
                geocoder.geocode({
                    'location': {
                        lat: lat,
                        lng: long
                    }
                }, function (results, status) {
                    let address = null;
                    if(results && results.length>0){
                        
                        address = {
                            text: results[0].formatted_address,
                            address:{}
                        };
                        // Get locality 
                        let cityComponent = results[0].address_components.filter(a=>a.types && a.types.includes('locality','administrative_area_level_3') || a.types.includes('postal_town'));
                        if(cityComponent && cityComponent.length>0){
                            address.address.city = cityComponent[0].long_name;
                        }

                        let stateComponent = results[0].address_components.filter(a=>a.types && a.types.includes('administrative_area_level_1'));
                        if(stateComponent && stateComponent.length>0){
                            address.address.state = stateComponent[0].long_name;
                        }

                        let zipCodeComponent = results[0].address_components.filter(a=>a.types && a.types.includes('postal_code'));
                        if(zipCodeComponent && zipCodeComponent.length>0){
                            address.address.zipcode = zipCodeComponent[0].long_name;
                        }

                        let countryComponent = results[0].address_components.filter(a=>a.types && a.types.includes('country'));
                        if(countryComponent && countryComponent.length>0){
                            address.address.country = countryComponent[0].long_name;
                            address.country_code = countryComponent[0].short_name;
                        }
                        
                    }
                    resolve(address);
                });
            });
            
        };

        this.getTimeZone = function(lat, long){
            let now = new Date();
            return $http({
                method: 'GET',
                url: `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${long}&timestamp=${Math.round(now.getTime() / 1000) }&key=AIzaSyA6CfHj-CGj53b6Ol2VVQWAOfebnc5HTO4`
            });
        };

        this.getStatesByCountry = function(country){
            return $http({
                method: 'GET',
                url: `http://battuta.medunes.net/api/region/${country}/all/?key=24c8b4ae208be8eec22161e1deabf9a5`
            });
        };
    }]);