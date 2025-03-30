angular.module('PromoApp')
    .controller('PaypalModalController', ['$scope', 'userService','authService','Utils','config',function ($scope,userService,authService,Utils,config) {
        const states = {
            "new":{
                id:'new',
                title:  'Linked PayPal Account'
            },
            "linked":{
                id:'linked',
                title:  'Linked PayPal Account'
            },
            "change":{
                id:'change',
                title:  'Change Current Linked PayPal Account'
            }
        };
        $scope.payPalUrl = config.PAYPAL_BASE_URL;
        $scope.selectedState = states.linked;
        $scope.model = {
            email: null
        };
        $scope.buttonText = 'Change';

        $scope.close = function(state)
        {
            if(!state){
                state = 'close';
            }
            this.$close(state);
        };

        $scope.changeState = function(state){
            $scope.selectedState = states[state];
        };

        $scope.changeAccount = function(){
            //console.log('Inside change account');
               
            $scope.buttonText = 'Updating...';
            userService.updateUserPaypalEmail($scope.model.email)
            .then(()=>{
                Utils.showSuccess($scope, 'Paypal Email updated succesfully');
                $scope.close('updated');
            })
            .catch(err=>{
                Utils.showError($scope, 'Unable to update email. Please contact administrator');
            });
           
        };

        $scope.init = function(){
            if($scope.paypal_email){
                $scope.selectedState = states.linked;
            }else{
                $scope.selectedState = states.new;
                $scope.buttonText = 'Link Paypal';
            }
        };

        $scope.init();
    }]);