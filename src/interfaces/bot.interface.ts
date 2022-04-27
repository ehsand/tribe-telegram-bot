import { Scenes } from "telegraf";

export interface WizardSession extends Scenes.WizardSessionData {
  myWizardSessionProp: number;
  email: string;
  lastMessageId: number;
  spaceId: string;
  postTitle: string;
  postBody: string;
}
