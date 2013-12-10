#!/usr/bin/env node

var io = require('socket.io')
  , optimist = require('optimist')
  , pty = require('pty.js')
  , path = require('path')
  , fs = require('fs')
  , EventEmitter = require('events').EventEmitter;


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
  .boolean('native-messaging-host')
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
function SocketIO(){
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

    term = pty.spawn(process.env.SHELL || '/bin/bash', ['-l'], {
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
      term.end();
    });

    while (buff.length) {
      socket.emit('data', buff.shift());
    }
  });
}

/**
 * Native Messaging
 */
function NativeMessagingAPI(){
  var self = this;
  var mode = 0;
  var read_length = 0;

  this.emit = function(event, data){
    var msg = JSON.stringify({
      event: event,
      data: data
    });
    var length = msg.length;
    var length_str = new Buffer(4);
    length_str.writeInt32LE(length, 0);
    process.stdout.write(length_str);
    process.stdout.write(msg);
  }

  function processInput(){
    if(mode == 0){
      var len = process.stdin.read(4);
      if(len != null){
        read_length = len.readInt32LE(0);
        mode = 1;
        processInput();
      }
    }else{
      var msg = process.stdin.read(read_length);
      if(msg != null){
        msg = JSON.parse(msg);
        EventEmitter.prototype.emit.call(self, msg.event, msg.data);
        mode = 0;
      }
    }
  }
  this.processInput = processInput;
}

NativeMessagingAPI.prototype = Object.create(EventEmitter.prototype);


if(options['native-messaging-host']){
  var api = new NativeMessagingAPI();
  var term;

  api.on('init', function(options){
    var name = fs.existsSync('/usr/share/terminfo/x/xterm-256color') ? 'xterm-256color' : 'xterm';

    process.env['TERM'] =  name;
    process.env['TERM_PROGRAM'] =  "Devtools_Terminal";
    process.env['PROMPT_COMMAND'] = "printf '\\e]2;%s\\a' \"$PWD\"";
    process.env['LC_CTYPE'] = "UTF-8";

    term = pty.spawn(process.env.SHELL || '/bin/bash', ['-l'], {
      name: name,
      cols: options.cols,
      rows: options.rows,
      cwd: options.cwd || process.cwd()
    });

    term.on('data', function(data) {
      api.emit('data', data);
    });

  });

  api.on('data',function(data){
    term.write(data);
  });

  api.on('resize',function(data){
    term.resize(data[0], data[1]);
  });

  api.on('disconnect',function(){
    term.end();
  });


  process.stdin.on('readable', function() {
    api.processInput();
  });

  process.stdin.resume();

}else{
  new SocketIO();
}
