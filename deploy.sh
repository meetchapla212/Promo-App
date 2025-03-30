# ./test.sh live
# ./test.sh test

# conatiners in ec2 for test and live site deployment
live_site="/var/www/html/promo"
test_site="/var/www/html/test.promo"

# deploy function using scp
deploy () {
    path=$1
    zip -r dist.zip dist/
    scp -r -o "StrictHostKeyChecking no" -i promoapptest.pem dist.zip ec2-user@ec2-54-73-75-103.eu-west-1.compute.amazonaws.com:$path ;
    ssh -o "StrictHostKeyChecking no" -i promoapptest.pem ec2-user@ec2-54-73-75-103.eu-west-1.compute.amazonaws.com "unzip -o $path/dist.zip -d $path/ && shopt -s dotglob && cp -r $path/dist/* $path && rm -rf $path/dist && rm -rf $path/dist.zip && sudo service httpd restart";
    rm -rf dist.zip
    echo "site deployed! $path"
    # scp -r -i promoapptest.pem .htaccess ec2-user@ec2-54-73-75-103.eu-west-1.compute.amazonaws.com:$path;
}

# check for the env=test||live
if [ "$1" == "test" ]; then
    echo "creating test build..."
    # creating build for test
    gulp build --env test     
    echo "deploying to test instance:  $test_site ..."
    # deploy function called with test path parameter
    deploy $test_site
else
if [ "$1" == "live" ]; then
    echo "creating Live build..."
    #creating build for live 
    gulp build --env live
    echo "deploying to live instance:  $live_site ..."
    #deploy function called with live path parameter
    deploy $live_site
else    #if no env is mentioned
    echo "mention a test/live deployment type."
    echo "example: ./deploy.sh test"
fi
fi
# end of script