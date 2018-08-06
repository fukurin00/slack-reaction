// load .env
require('dotenv').config();
const SLACK_TOKEN = process.env.SLACK_TOKEN;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SEND_CHANNEL = process.env.SEND_CHANNEL;

const util = require('util');
const slack = require('slack');
const moment = require('moment-timezone');

function getChannels(ts) {
  return new Promise(function(onFulfilled, onRejected) {
    slack.channels.list({ token: SLACK_TOKEN }).then(response => {
      onFulfilled({
        channels: response.channels.map(channel => channel.id),
        ts: ts
      });
    });
  });
}

function getReactions(responses) {
  return new Promise(function(onFulfilled, onRejected) {
    reactions = [];

    const oldest = responses.ts;
    const channels = responses.channels;

    let i = 0;
    channels.map(channel => {
      slack.channels
        .history({
          token: SLACK_TOKEN,
          channel: channel,
          oldest: oldest
        })
        .then(response => {
          response.messages.map(message => {
            if ('reactions' in message) {
              reactions = reactions.concat(message.reactions);
            }
          });
          if (++i == channels.length) {
            onFulfilled(reactions);
          }
        })
        .catch(error => {
          console.log('error!!');
        });
    });
  });
}

// oldest ※前日0時0分
ts = moment()
  .subtract(1, 'days')
  .startOf('day');

getChannels(ts.unix())
  .then(getReactions)
  .then(reactions => {
    // counter
    totalReaction = [];

    reactions.map(reaction => {
      name = ':' + reaction.name + ':';
      if (name in totalReaction === false) {
        totalReaction[name] = 0;
      }
      totalReaction[name] += reaction.count;
    });

    // convert for sort
    sortReaction = [];
    for (name in totalReaction) {
      sortReaction.push({
        name: name,
        count: totalReaction[name]
      });
    }

    sortReaction = sortReaction.sort((a, b) => {
      if (a.count > b.count) return -1;
      else if (a.count < b.count) return 1;
      else return 0;
    });
    console.log(sortReaction);

    // create send message
    msg =
      'Good Morning!! ' +
      ts.format('M/D(ddd)') +
      'のリアクション集計したyo〜\n\n';
    for (reaction of sortReaction) {
      msg += reaction.name + ' : ' + reaction.count + '\n';
    }
    console.log(msg);

    slack.chat.postMessage({
      token: SLACK_BOT_TOKEN,
      channel: SEND_CHANNEL,
      text: msg
    });
  });
