// load .env
// require('dotenv').config();
const SLACK_TOKEN = process.env.SLACK_TOKEN;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SEND_CHANNEL = process.env.SEND_CHANNEL;

const {WebClient} = require('@slack/web-api');
const util = require('util');
const slack = require('slack');
const moment = require('moment-timezone');

const CronJob = require('cron').CronJob;

const web = new WebClient(SLACK_TOKEN);

function getChannels(oldest, latest) {
  return new Promise(function(onFulfilled, onRejected) {
    const param = {
      token: SLACK_TOKEN,
      exclude_archived: true,
      types: 'public_channel, private_channel'
    };
    slack.conversations.list(param).then(response => {
      onFulfilled({
        channels: response.channels.map(channel => channel.id),
        oldest: oldest,
        latest: latest
      });
    });
   });
}


function getReactions(responses) {
  return new Promise(function(onFulfilled, onRejected) {
    reactions = [];

    const channels = responses.channels;
    const oldest = responses.oldest;
    const latest = responses.latest;

    let i = 0;
    channels.map(channel => {
      slack.conversations
        .history({
          token: SLACK_TOKEN,
          channel: channel,
          oldest: oldest,
          latest: latest
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

function getUsers() {
  // You probably want to use a database to store any user information ;)

  return new Promise(function(onFulfilled, onRejected) {
    const param = {
      token: SLACK_TOKEN,
    };
    let usersMap = {};
    slack.users.list(param).then(response => {
      response.members.forEach(user => {
        usersMap[user.id] = user.name;
      });
      onFulfilled(
        usersMap  
      );
    });
   });
  
}

sortResult = (reaction) => {
  // counter
  totalReaction = [];
  totalUsers = {};
  usermap = getUsers()

  reactions.map(reaction => {
    name = ':' + reaction.name + ':';
    if (name in totalReaction === false) {
      totalReaction[name] = 0;
    }
    totalReaction[name] += reaction.count

    reaction.users.map(user =>{
      if(name in totalUsers === false){
        totalUsers[name] = [];
      }
      totalUsers[name].push(usermap[user]);
    } )
    
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

  // create send message
  msg = '';
  for (reaction of sortReaction) {
    msg += reaction.name + ' : ' + reaction.count + ' : ' + totalUsers[reaction.name].toString() +'\n';
  }

  return msg;
};

postMessage = () => {
  // oldest ※前日0時0分
  oldest = moment()
  .subtract(7, 'days')
  .startOf('day');

  latest = moment().startOf('day');

  getChannels(oldest.unix(), latest.unix())
    .then(getReactions)
    .then(reactions => {
      if (reactions.length === 0) {
        msg =
          ':ido: 過去7日間のリアクション： \n' +
          '...';
      } else {
        msg =
          ':ido: 過去7日間のリアクション: \n';
        msg += sortResult(reactions);
      }

      console.log(msg);

      // slack.chat.postMessage({
      //   token: SLACK_BOT_TOKEN,
      //   channel: SEND_CHANNEL,
      //   text: msg
      // });
    });
};

postMessage();
// const job = new CronJob({
//   /*
//   Seconds: 0-59
//   Minutes: 0-59
//   Hours: 0-23
//   Day of Month: 1-31
//   Months: 0-11
//   Day of Week: 0-6
//   */
//   cronTime: '0 0 9 * * *',
//   onTick: postMessage,
//   start: false,
//   timeZone: 'Asia/Tokyo'
// });
// job.start();