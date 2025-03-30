import { Component } from '@angular/core';
import { InAppBrowser } from "@ionic-native/in-app-browser";
import { Platform} from 'ionic-angular';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  constructor(private inAppBrowser: InAppBrowser, public platform: Platform) {
        let browser = this.inAppBrowser.create('https://thepromoapp.com/','_target',{zoom:'no',location:'no'});
        platform.ready().then(() => {
              browser.show();
        });
        

        browser.on('exit').subscribe(() => {
          console.log('browser closed');
          platform.exitApp();
        }, err => {
          console.error(err);
        });
  }

}
