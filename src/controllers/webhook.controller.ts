import { NextFunction, Request, Response } from "express";
import { NETWORK_ID } from "@config";
import { Types } from "@tribeplatform/gql-client";
import { logger } from "@/utils/logger";
const FollowService = require("@services/follow.services");
const { findUser } = require("@services/users.services");
const DEFAULT_SETTINGS = {};
import BotController from "@controllers/bot.controller";

class WebhookController {
  public index = async (req: Request, res: Response, next: NextFunction) => {
    const input = req.body;
    try {
      if (input.data?.challenge) {
        return res.json({
          type: "TEST",
          status: "SUCCEEDED",
          data: {
            challenge: req.body?.data?.challenge,
          },
        });
      }
      let result: any = {
        type: input.type,
        status: "SUCCEEDED",
        data: {},
      };

      switch (input.type) {
        case "GET_SETTINGS":
          result = await this.getSettings(input);
          break;
        case "UPDATE_SETTINGS":
          result = await this.updateSettings(input);
          break;
        case "SUBSCRIPTION":
          result = await this.handleSubscription(input);
          break;
      }
      res.status(200).json(result);
    } catch (error) {
      logger.error(error);
      return {
        type: input.type,
        status: "FAILED",
        data: {},
      };
    }
  };

  /**
   *
   * @param {Object} input
   * @returns { type: input.type, status: 'SUCCEEDED', data: {} }
   */
  private getSettings = async (input) => {
    const currentSettings = input.currentSettings[0]?.settings || {};
    let defaultSettings;
    switch (input.context) {
      case Types.PermissionContext.NETWORK:
        defaultSettings = DEFAULT_SETTINGS;
        break;
      default:
        defaultSettings = {};
    }
    const settings = {
      ...defaultSettings,
      ...currentSettings,
    };
    return {
      type: input.type,
      status: "SUCCEEDED",
      data: settings,
    };
  };

  /**
   *
   * @param {Object} input
   * @returns { type: input.type, status: 'SUCCEEDED', data: {} }
   */
  private updateSettings = async (input) => ({
    type: input.type,
    status: "SUCCEEDED",
    data: { toStore: input.data.settings },
  });

  /**
   *
   * @param {Object} input
   * @returns { type: input.type, status: 'SUCCEEDED', data: {} }
   */
  private handleSubscription = async (input) => {
    if (input.networkId === NETWORK_ID) {
      const { verb, object } = input.data;

      switch (verb) {
        case "FOLLOWED":
          await WebhookController.followPost(object, "FOLLOWED");
          break;
        case "UNFOLLOWED":
          await WebhookController.followPost(object, "UNFOLLOWED");
          break;
        case "PUBLISHED":
          await WebhookController.newReply(object);
          break;
      }
    }

    return {
      type: input.type,
      status: "SUCCEEDED",
      data: {},
    };
  };

  /**
   *
   * @param {Object} data
   * @param {string} type
   */
  private static followPost = async (data, type) => {
    data = { postId: data.postId, memberId: data.memberId };
    const member = await findUser({ id: data.memberId });
    let botController = new BotController();

    const client = await botController.tribeClient();
    const postData = await client.posts.get(
      {
        id: data.postId,
      },
      "basic"
    );

    if (postData.ownerId !== data.memberId) {
      await botController
        .telegramBot()
        .telegram.sendMessage(
          member.telegramId,
          `You are ${
            type === "FOLLOWED" ? "following" : "unfollowed"
          } this post:\n` +
            `<a href='${postData.url}'>${postData.title || postData.id}</a>`,
          {
            parse_mode: "HTML",
          }
        );
    }
    if (type === "FOLLOWED") {
      FollowService.createOrUpdate(data, data);
    } else {
      FollowService.remove(data);
    }
  };

  /**
   *
   * @param {Object} data
   */
  private static newReply = async (data) => {
    let botController = new BotController();
    if (data.isReply) {
      const client = await botController.tribeClient();
      const postData = await client.posts.get(
        {
          id: data.id,
        },
        "basic"
      );

      const postContent = postData.mappingFields
        .find(({ key }) => key === "content")
        .value.replace(/<\/?[^>]+(>|$)/g, "");

      const follows = await FollowService.findMany({
        postId: data.repliedToId,
      });
      for (const follow of follows) {
        const member = await findUser({ id: follow.memberId });
        if (member) {
          await botController
            .telegramBot()
            .telegram.sendMessage(
              member.telegramId,
              `Someone <b>commented</b> on the post  that you followed:\n` +
                `<a href='${postData.url}'>${
                  postData.title || postData.id
                }</a>\n` +
                postContent,
              {
                parse_mode: "HTML",
              }
            );
        }
      }
    }
  };
}

export default WebhookController;
