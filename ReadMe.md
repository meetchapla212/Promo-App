Step to build and install -

One time steps on fresh repository checkout -

- npm install -g bower
- npm install -g gulp-cli
- npm install -g qs

Steps to be performed on each repository pull -

1. Go to promoapp directory and perform following steps
    a. npm install
    b. bower install
2. To run the server do - gulp connect


3.  clear cache on s3 after deployment.
     -go to aws console > s3 > select bucket > change metadata of bower_components , css, img

      Actions -> change meta data  -> cache-control => max-age= 86400

Steps to be performed in order to run ionic project for android and ios - 

1. First install cordova and ionic using the following commands :
    -npm install -g cordova
    -npm install -g ionic
2. Install node modules using command :
    -npm install
3. After installing node modules now install cordova plugins and add platform by using these commands:
    - ionic cordova platform rm android && ionic cordova platform add android (for android)
    - ionic cordova platform rm ios && ionic cordova platform add ios (for ios)
4. Create android and ios builds by using these commands:
    -ionic cordova build android (for android apk)
    -ionic cordova build ios (for ios ipa) 
    (*Note - Before running this command  -- allow-navigation href="* -- Please add this as a tag to your config.xml file inside ionic project directory)
5. Location of APK file - /platforms/android/build/outputs/apk/android-debug.apk
6. Location of IPA file - /platforms/ios/

# For ec2:

# path for promo and test promo on ec2
    /var/www/html/promo
    /var/www/html/test.promo

# live and test bucket config to be exported - s3-sitemap.sh, s3-testsitemap.sh
    export AWS_ACCESS_KEY_ID
    export AWS_SECRET_ACCESS_KEY
    export AWS_REGION

# copy sitemap.xml file from s3 to ec2 
    aws s3 cp s3_path_of_sitemap_file ec2_path
    
# copy sitemap folder from s3 to ec2
    aws s3 sync s3_path_of_sitemap_folder ec2_path 

# step to create cron task
    sudo crontab -e
    sudo crontab -l

# path to cron logs
    /var/mail/ file root