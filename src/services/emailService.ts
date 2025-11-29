import { SendMailClient } from "zeptomail";



export default async function handleSendEmail(
  to: string,
  subject: string,
  htmlbody: string
) {

const url = process.env.EMAIL_API_URL || "";
const token = process.env.EMAIL_API_TOKEN || "";

 
  

  if (!url || !token) {

    console.error("EMAIL_API_URL and EMAIL_API_TOKEN must be set");
    throw new Error("EMAIL_API_URL and EMAIL_API_TOKEN must be set");
  }

  if (!to || !subject || !htmlbody) {
    console.error("to, subject, and htmlbody are required");
    throw new Error("to, subject, and htmlbody are required");
  }

  if (!to.includes("@")) {
    console.error("Invalid email address");
    throw new Error("Invalid email address");
  }

  console.info("Email sending ....");
  

  const client = new SendMailClient({ url, token });

  return client.sendMail({
    from: {
      address: "noreply@zenow.in",
      name: "noreply",
    },
    to: [
      {
        email_address: {
          address: to,
          name: `${
            to.split("@")[0].charAt(0).toUpperCase() + to.split("@")[0].slice(1)
          }`,
        },
      },
    ],
    subject,
    htmlbody,
  }).then((res) => {
    console.info("Email sent successfully", res);
    // return res; 
  }).catch((err) => {
    console.error("Email sending failed", err);
    // throw err;
  }).finally(() => {
    console.log("-------------==============------------");
  })
}
