// load .env
require('dotenv').config();
const SLACK_TOKEN = process.env.SLACK_TOKEN;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SEND_CHANNEL = process.env.SEND_CHANNEL;

const util = require('util');
const slack = require('slack');

function getChannels(ts) {
  return new Promise(function(onFulfilled, onRejected) {
    slack.channels.list({ token: SLACK_TOKEN }).then(response => {
      onFulfilled(response.channels.map(channel => channel.id), ts);
    });
  });
}

function getReactions(channels, ts) {
  return new Promise(function(onFulfilled, onRejected) {
    reactions = [];
    let i = 0;
    channels.map(channel => {
      slack.channels
        .history({
          token: SLACK_TOKEN,
          channel: channel,
          oldest: ts
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

// oldest
ts = Math.round(new Date('2018/08/03').getTime() / 1000);

getChannels(ts)
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
    msg = 'Good Morning!! 先日のリアクション集計したyo〜\n\n';
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
