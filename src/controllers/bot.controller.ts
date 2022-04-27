const { findUser, createOrUpdateUser } = require("@services/users.services");
import { BOT_TOKEN, CLIENT_ID, NETWORK_ID, CLIENT_SECRET } from "@config";
import { logger } from "@utils/logger";
import { Markup, Scenes, session, Telegraf } from "telegraf";
import { TribeClient } from "@tribeplatform/gql-client";
import { WizardSession } from "@interfaces/bot.interface";
import { PostMappingTypeEnum } from "@tribeplatform/gql-client/types";

class BotController {
  public init = async () => {
    try {
      let appClient = await this.tribeClient();
      type MyContext = Scenes.WizardContext<WizardSession>;

      //Publish Post Wizard Start
      const spacesList = [];
      const spacesButtons = async () => {
        const { nodes: spaces } = await appClient.spaces.list(
          {
            limit: 10,
            // query: 'tribe',
          },
          "basic"
        );
        const buttons = [];

        spaces.forEach(({ name, slug, id }) => {
          spacesList.push({ name, slug, id });
          // spacesSlugList.push(slug);
          buttons.push([Markup.button.callback(name, slug)]);
        });
        return buttons;
      };
      const createPostWizard = new Scenes.WizardScene(
        "create-post-wizard",
        (ctx) => this.pickASpace(ctx, spacesButtons),
        (ctx) => this.setPostTitle(ctx, spacesList),
        this.setPostBody,
        this.setPublishPost
      );
      //Publish Post Wizard End

      //Login Wizard Start
      const loginWizard = new Scenes.WizardScene(
        "login-wizard",
        this.getEmailAddress,
        this.getPassword,
        this.doLogin
      );
      //Login Wizard End

      const bot = new Telegraf<MyContext>(BOT_TOKEN);

      const stage = new Scenes.Stage([createPostWizard, loginWizard]);
      bot.use(session());
      bot.use(stage.middleware());

      bot.start((ctx) => ctx.scene.enter("login-wizard"));
      bot.command("login", (ctx) => ctx.scene.enter("login-wizard"));
      bot.command("create_post", (ctx) =>
        ctx.scene.enter("create-post-wizard")
      );
      bot.launch().then(() => logger.info(`telegram bot launch`));

      //telegram bot end
    } catch (error) {
      logger.error(error);
    }
  };

  /**
   *
   * @param {string} MEMBER_ID
   */
  public tribeClient = async (MEMBER_ID = null) => {
    const client = new TribeClient({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      graphqlUrl: "https://app.tribe.so/graphql",
    });
    const accessToken = await client.generateToken({
      networkId: NETWORK_ID,
      memberId: MEMBER_ID,
    });
    client.setToken(accessToken);
    return client;
  };

  /**
   *
   */
  public telegramBot = () => {
    return new Telegraf(BOT_TOKEN);
  };

  /**
   *
   @param {Context} ctx telegram bot context
   */
  private checkCancelCommand = async (ctx) => {
    const { message } = ctx.update;
    if (message && message.text === "/cancel") {
      await ctx.reply("Cancelled!");
      await ctx.scene.leave();
      return true;
    } else return false;
  };

  /**
   *
   @param {Context} ctx telegram bot context
   * @param {Object} spacesButtons
   */
  private pickASpace = async (ctx, spacesButtons) => {
    const member = await findUser({
      telegramId: ctx.update.message.from.id,
    });
    if (!member) {
      ctx.reply(
        "You are not logged In, Please login fist by sending /login command! "
      );
      return await ctx.scene.leave();
    }
    await ctx.reply(
      "<b>Pick a space</b>" +
        "\n\n<i>You can cancel this process by send /cancel command.</i>",
      {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard(await spacesButtons()),
      }
    );
    return ctx.wizard.next();
  };

  /**
   *
   @param {Context} ctx telegram bot context
   * @param {Array} spacesList
   */
  private setPostTitle = async (ctx, spacesList) => {
    if (await this.checkCancelCommand(ctx)) return;

    if (ctx.update.callback_query) {
      await ctx.answerCbQuery();

      const selectedSpace = spacesList.find(
        ({ slug }) => slug === ctx.update.callback_query.data
      );
      await ctx.reply(
        `<b>${selectedSpace.name} Space:</b>\nPlease enter title of the post` +
          "\n\n<i>You can cancel this process by send /cancel command.</i>",
        {
          parse_mode: "HTML",
        }
      );
      ctx.scene.session.spaceId = selectedSpace.id;
      return ctx.wizard.next();
    } else {
      await ctx.reply(
        "<b>Please pick a space first!</b>" +
          "\n\n<i>You can cancel this process by send /cancel command.</i>",
        {
          parse_mode: "HTML",
        }
      );
    }
  };

  /**
   *
   @param {Context} ctx telegram bot context
   */
  private setPostBody = async (ctx) => {
    if (await this.checkCancelCommand(ctx)) return;
    const { message }: any = ctx.update;
    if (message) {
      ctx.scene.session.postTitle = message.text;
      await ctx.reply(
        "<b>Please enter post content</b>" +
          "\n\n<i>You can cancel this process by send /cancel command.</i>",
        {
          parse_mode: "HTML",
        }
      );
      return ctx.wizard.next();
    }
  };

  /**
   *
   @param {Context} ctx telegram bot context
   */
  private setPublishPost = async (ctx) => {
    if (await this.checkCancelCommand(ctx)) return;
    const { message }: any = ctx.update;
    if (message) {
      const member = await findUser({
        telegramId: message.from.id,
      });
      if (!member) {
        ctx.reply(
          "You are not logged In, Please login fist by sending /login command! "
        );
        return await ctx.scene.leave();
      }
      let appClient = await this.tribeClient();
      let PostType = await appClient.posts.listPostTypes(
        { limit: 10 },
        "basic"
      );
      const postPostType = PostType.nodes.find(
        ({ context }) => context === "post"
      );

      const memberClient = await this.tribeClient(member.id);
      await memberClient.spaces.join({
        spaceId: ctx.scene.session.spaceId,
      });
      const newPost = await memberClient.posts.create(
        {
          spaceId: ctx.scene.session.spaceId,
          input: {
            postTypeId: postPostType.id,
            mappingFields: [
              {
                key: "title",
                type: PostMappingTypeEnum.text,
                value: `"${ctx.scene.session.postTitle}"`,
              },
              {
                key: "content",
                type: PostMappingTypeEnum.html,
                value: `"<p>${message.text}</p>"`,
              },
            ],
            publish: true,
          },
        },
        "basic"
      );

      if (newPost) {
        await ctx.reply(
          "<b>Your Post Successfully Published:</b>\n" +
            `<a href='${newPost.url}'>${newPost.title}</a>`,
          {
            parse_mode: "HTML",
          }
        );
      }

      return await ctx.scene.leave();
    }
  };

  /**
   *
   @param {Context} ctx telegram bot context
   */
  private getPassword = async (ctx) => {
    const { message }: any = ctx.update;
    if (message) {
      if (await this.checkCancelCommand(ctx)) return;

      const { text }: any = message;
      const regexp = new RegExp(
        /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
      if (text && regexp.test(text)) {
        ctx.scene.session.email = text;

        const msg = await ctx.reply(
          "<b>Please Enter Your Password</b>" +
            "\n\n<i>You can cancel this process by send /cancel command.</i>",
          {
            parse_mode: "HTML",
          }
        );
        ctx.scene.session.lastMessageId = msg.message_id;

        return ctx.wizard.next();
      } else {
        await ctx.replyWithMarkdown(
          "<b>Please Enter a Valid Email address</b>" +
            "\n\n<i>You can cancel this process by send /cancel command.</i>",
          {
            parse_mode: "HTML",
          }
        );
      }
    }
  };

  /**
   *
   @param {Context} ctx telegram bot context
   */
  private getEmailAddress = async (ctx) => {
    await ctx.reply(
      "<b>Please Enter your Email address (username)</b>" +
        "\n\n<i>You can cancel this process by send /cancel command.</i>",
      {
        parse_mode: "HTML",
      }
    );
    return ctx.wizard.next();
  };

  /**
   *
   @param {Context} ctx telegram bot context
   */
  private doLogin = async (ctx) => {
    if (await this.checkCancelCommand(ctx)) return;
    try {
      const { message }: any = ctx.update;
      if (message) {
        ctx.deleteMessage(ctx.scene.session.lastMessageId);
        ctx.deleteMessage();
        let appClient = await this.tribeClient();
        const userData = await appClient.auth.login(
          {
            input: {
              usernameOrEmail: ctx.scene.session.email,
              password: message.text,
            },
          },
          { member: "basic" }
        );
        if (userData) {
          createOrUpdateUser(
            { telegramId: message.from.id },
            {
              id: userData.member.id,
              name: userData.member.name,
              email: ctx.scene.session.email,
              accessToken: userData.accessToken,
            }
          );
          await ctx.reply(
            "You are Logged In successfully,\n" +
              "Your password was deleted from this chat for your safety."
          );
          return await ctx.scene.leave();
        }
      }
    } catch (e) {
      const msg = await ctx.reply(
        "<b>You entered a wrong password\nPlease Enter Correct Password Again</b>" +
          "\n\n<i>You can cancel this process by send /cancel command.</i>",
        {
          parse_mode: "HTML",
        }
      );
      ctx.scene.session.lastMessageId = msg.message_id;
    }
  };
}

export default BotController;
