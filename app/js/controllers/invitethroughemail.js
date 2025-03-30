angular.module('PromoApp')
    .controller('inviteThroughEmailController', ['$scope', 'followUser','awsService','Utils', function ($scope, followUser,awsService,Utils) {

        $scope.forms = {
        };

        $scope.contacts=[];

        $scope.cancel = function () {
           this.$close();
        };

        $scope.save = function() {
            for(let s of $scope.contacts){
                s.type='mail';
                
            }
            this.$close($scope.contacts);
        };

        // Remove email
        $scope.remove = function(index){
            if(index >= 0){
                $scope.contacts.splice(index,1);
            }
        };

        const checkIfDuplicate = function(email){
            if($scope.contacts.length ==0 || ($scope.contacts.length > 0 && $scope.contacts.findIndex(c=>c.email.toLowerCase() == email.toLowerCase()) == -1)){
                return false;
            }
            return true;
        };
        $scope.add = function($event){
            if($event.keyCode == 13){
                if($scope.emailFrom){
                    let emailsToAdd = $scope.emailFrom.split(',');
                    let invalidEmails=[];
                    for(let email of emailsToAdd){
                        email = email.trim();
                        // Check if valid email
                        let pattern =new RegExp(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/);
                        if(pattern.test(email)){
                            if(!checkIfDuplicate(email)){
                                $scope.contacts.push({email:email,type:'mail'});
                            }
                            $scope.emailFrom = $scope.emailFrom.replace(email,'');
                        }else{
                            invalidEmails.push(email);
                            $scope.forms.inviteThroughEmail.email.$setValidity('pattern', false);
                        }
                    }
                    $scope.emailFrom = '';
                    if(invalidEmails && invalidEmails.length>0){
                        $scope.emailFrom = invalidEmails.join(',');
                    }
                }
            }else{
                $scope.forms.inviteThroughEmail.email.$setValidity('pattern', true);
                if($scope.emailFrom){
                    let emailsToAdd = $scope.emailFrom.split(',');
                    for(let email of emailsToAdd){
                        email = email.trim();
                        // Check if valid email
                        let pattern =new RegExp(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/);
                        if(!pattern.test(email)){
                            $scope.forms.inviteThroughEmail.email.$setValidity('pattern', false);
                        }
                    }
                }
                
            }
        };

    }]);