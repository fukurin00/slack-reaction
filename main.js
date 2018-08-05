// load .env
require('dotenv').config();

const slack = require('slack');

const SLACK_TOKEN = process.env.SLACK_TOKEN;

// oldest
ts = Math.round(new Date('2018/08/03').getTime() / 1000);

// get channel list
slack.channels
  .list({ token: SLACK_TOKEN })
  .then(response => {
    response.channels.map(channel => {
      console.log(channel.id + ' : ' + channel.name);
      // get conversations
      slack.conversations
        .history({
          token: SLACK_TOKEN,
          channel: channel.id,
          oldest: ts
        })
        .then(response => {
          response.messages.map(message => {
            // get reactions
            slack.reactions
              .get({
                token: SLACK_TOKEN,
                channel: channel.id,
                timestamp: message.ts
              })
              .then(response => {
                if (response.message.hasOwnProperty('reactions')) {
                  console.log(response.message.reactions);
                }
              })
              .catch(error => {
                console.log('get reaction error!!');
                console.error(error);
              });
          });
        })
        .catch(error => {
          console.log('conversations error!!');
          console.error(error);
        });
    });
  })
  .catch(error => {
    console.log('channel list error!!');
    console.error(error);
  });
