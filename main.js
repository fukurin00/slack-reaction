// load .env
require('dotenv').config();
const util = require('util');
const slack = require('slack');

const SLACK_TOKEN = process.env.SLACK_TOKEN;

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

    // result
    console.log(util.inspect(totalReaction, { maxArrayLength: null }));
  });
