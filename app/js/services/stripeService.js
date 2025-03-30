angular.module('PromoApp')
    .service('stripeService' , ['authService', 'apiService', function (  authService, apiService ) {

    this.connectStripeAccount = function(code){

        let token = authService.get('token');
        return apiService.connectStripeAccount(code, token)
            .then((response) => {
                if(response && 'data' in response){
                    return response.data;
                }
            });
    };

    this.linkBankAccount = function(bank_token){
        let token = authService.get('token');
        return apiService.linkBankAccount(bank_token, token)
            .then((response) => {
                if(response && 'data' in response){
                    return response.data;
                }
            });
    };

    this.makeBankDefault = function(stripe_bank_id){
        let token = authService.get('token');
        return apiService.makeBankDefault(stripe_bank_id, token)
            .then((response) => {
                if(response && 'data' in response){
                    return response.data;
                }
            });
    };

    this.deleteBankInfo = function(stripe_bank_id){
        let token = authService.get('token');
        return apiService.deleteBankInfo(stripe_bank_id, token)
            .then((response) => {
                if(response && 'data' in response){
                    return response.data;
                }
           
            });
    };
    this.updateBankDetails = function (data){
        let token = authService.get('token');
        return apiService.updateBankDetails(data, token)
            .then((response) => {
                if(response && 'data' in response){
                    return response.data;
                }
           
            });
    };
    this.buyTicket = function (data,token){
        if(token == ''){
          token = authService.get('token'); 
        }
        
        return apiService.buyTicket(data, token)
            .then((response) => {
                if(response && 'data' in response){
                    return response.data;
                }
           
            });
    };
    this.stripeAccountCreate = function (success_url,failure_url,country){
        let token = authService.get('token');
        return apiService.stripeAccountCreate(token,success_url,failure_url,country)
            .then((response) => {
                if(response && 'data' in response){
                    return response.data;
                }
           
            });
    };
    this.getStripeAccountInfo = function (success_url,failure_url){
        let token = authService.get('token');
        return apiService.getStripeAccountInfo(token,success_url,failure_url)
            .then((response) => {
                if(response && 'data' in response){
                    return response.data;
                }
           
            });
    };
}]);