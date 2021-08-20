require('dotenv').config();
const SLACK_BOT_TOKEN = process.env.SLACK_TOKEN;
const SEND_CHANNEL = process.env.SEND_CHANNEL;
const SLACK_TOKEN = process.env.SLACK_USER_TOKEN

const port = process.env.PORT || 8090;

const util = require('util');
const slack = require('slack');
const moment = require('moment');


const CronJob = require('cron').CronJob;

const express = require('express');

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
        // .catch(error => {
        //   console.log('history get error!!');
        // });
    });
  });
}

function getUsers(responses) {
  // You probably want to use a database to store any user information ;)

  return new Promise(function(onFulfilled, onRejected) {
    const reactions = responses;

    const param = {
      token: SLACK_TOKEN,
    };
    let usersMap = {};
    slack.users.list(param).then(response => {
      response.members.forEach(user => {
        usersMap[user.id] = user.name;
      });
      onFulfilled({
        userMap: usersMap,
        reactions: reactions
      });
    });
   });
}

sortResult = (reaction, usermap) => {
  // counter
  totalReaction = [];
  totalUsers = {};

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
      totalUsers[name].push(':'+usermap[user]+':');
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
    msg += reaction.name + ' : ' + reaction.count + ' : ' + totalUsers[reaction.name].join(' ') +'\n';
  }

  return msg;
};

postMessage = (day=0) => {
    // oldest ※前日0時0分
    oldest = moment()
    .subtract(day, 'days')
    .startOf('day');
  
  
  latest = moment().startOf('day');
  

  getChannels(oldest.unix(), latest.unix())
    .then(getReactions)
    .then(getUsers)
    .then(responses => {
      const reactions = responses.reactions;
      const usermap = responses.userMap; 
      if (reactions.length === 0) {
        msg =
          ':idosan: 過去'+day+'日間のリアクション： \n' +
          '...';
      } else {
        msg =
          ':idosan: 過去'+day+'日間のリアクション: \n';
        msg += sortResult(reactions,usermap);
      }

      console.log(msg);

      const res = slack.chat.postMessage({
        token: SLACK_BOT_TOKEN,
        channel: SEND_CHANNEL,
        icon_emoji: ':ido:',
        text: msg
      }).then(()=>{
        console.log(res);
      });
      
    });
};

// postMessage();
const job = new CronJob({
  /*
  Seconds: 0-59
  Minutes: 0-59
  Hours: 0-23
  Day of Month: 1-31
  Months: 0-11
  Day of Week: 0-6
  */
  cronTime: '0 0 9 * * *',
  onTick: postMessage,
  start: false,
  timeZone: 'Asia/Tokyo'
});
job.start();


const app = express();

app.listen(port, () => console.log(`Listening on port ${port}...`));

app.get('/', (req, res) => {
    res.send('Simple REST API\n');
});

app.get('/api/emoji', (req, res) => {

  console.log(`[${new Date()}] request = [${req.query}]`);

  const day = req.query.day;

  postMessage(day);
  res.json({"result": "OK\n"});;
});