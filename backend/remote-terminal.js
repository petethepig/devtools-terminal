#!/usr/bin/env node

var io = require('socket.io')
  , optimist = require('optimist')
  , pty = require('pty.js')
  , path = require('path')
  , fs = require('fs');



/**
 * Base64 functions
 */
function atob(a){
  return new Buffer(a, 'base64').toString('utf8');
}
function btoa(a){
  return new Buffer(a, 'utf8').toString('base64');
}


/**
 * Parsing arguments
 */
var options = optimist
  .usage('Start the remote terminal.\nUsage: $0')
  .alias('h', 'help')
  .alias('p', 'port')
  .alias('c', 'config')
  .describe('h', 'Show this message')
  .describe('p', 'Port')
  .describe('c', 'Path to the config file')
  .argv
;

if(options.help){
  console.log(optimist.help());
  return 0;
}

/**
 * Loading config
 */
var config;

if(options.config){
  config = require(path.resolve(process.cwd(), options.config)).config;
}else{
  config = {
    users: {
      admin: {
        password: "",
        cwd: process.cwd()
      }
    },
    port: 8080
  };
}


config.log = config.log || false;

if(options.port){
  config.port = options.port;
}


/**
 * Sockets
 */
io = io.listen(config.port, config);


function auth(str){
  try{
    var arr = atob(str).split(":")
      , login = arr[0]
      , pass  = arr[1];
    return (config.users[login] && config.users[login].password == pass) ? config.users[login] : false;
  }catch(e){;}
  return false;
}

io.configure(function (){
  io.set('authorization', function (handshakeData, callback) {
    var user;
    if(user = auth(handshakeData.query.auth)){
      handshakeData.user = user;
      return callback(null, true);      
    }else{
      return callback('auth error', false);
    }

  });
});


io.sockets.on('connection', function(sock) {

  var handshakeData = sock.manager.handshaken[sock.id];


  var buff = []
    , socket
    , term;

  var name = fs.existsSync('/usr/share/terminfo/x/xterm-256color') ? 'xterm-256color' : 'xterm';

  term = pty.spawn(process.env.SHELL || 'sh', [], {
    name: name,
    cols: +handshakeData.query.cols || 80,
    rows: +handshakeData.query.rows || 24,
    cwd: handshakeData.user.cwd || process.cwd()
  });

  term.on('data', function(data) {
    return !socket
      ? buff.push(data)
      : socket.emit('data', data);
  });

  term.on('close', function(){
    socket.disconnect();
  })

  socket = sock;

  socket.on('data', function(data) {
    term.write(data);
  });

  socket.on('resize', function(data) {
    term.resize(data[0], data[1]);
  });

  socket.on('disconnect', function() {
    socket = null;
  });

  while (buff.length) {
    socket.emit('data', buff.shift());
  }

});
