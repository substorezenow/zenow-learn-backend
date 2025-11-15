// // https://www.npmjs.com/package/zeptomail

// // For ES6
// // import { SendMailClient } from "zeptomail";

// // For CommonJS
// var { SendMailClient } = require("zeptomail");

// const url = "https://api.zeptomail.com/v1.1/email";
// const token = "Zoho-enczapikey wSsVR61xqBSjDK8uzz2tduY/yFkGDln+HE5721ek6Hb+Hv2TpcdqlEHGDVXxGvVKFTI8FGMRo+59yhgD1zVfjdUlzw1RWSiF9mqRe1U4J3x17qnvhDzNV25blBKPLooPwgVjnWZkFs8q+g==";



// let client = new SendMailClient({url, token});

// client.sendMail({
//     "from": 
//     {
//         "address": "noreply@zenow.in",
//         "name": "noreply"
//     },
//     "to": 
//     [
//         {
//         "email_address": 
//             {
//                 "address": "brijeshkanhekar@gmail.com",
//                 "name": "Brijesh"
//             }
//         }
//     ],
//     "subject": "Test Email",
//     "htmlbody": "<div><b> Test email sent successfully.</b></div>",
// }).then((resp) => console.log("success")).catch((error) => console.log("error"));