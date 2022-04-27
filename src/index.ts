import App from "@/app";

import WebhookRoute from "@routes/webhook.route";
import validateEnv from "@utils/validateEnv";

validateEnv();

const app = new App([new WebhookRoute()]);

app.listen();
