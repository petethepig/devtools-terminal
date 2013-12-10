#!/usr/local/bin/node

var pty = require('pty.js')
  , path = require('path')
  , fs = require('fs')
  , EventEmitter = require('events').EventEmitter;


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

  process.stdin.on('readable', function() {
    processInput();
  });

  process.stdin.resume();
}

NativeMessagingAPI.prototype = Object.create(EventEmitter.prototype);

var api = new NativeMessagingAPI();
var term;

api.on('init', function(options){
  var name = fs.existsSync('/usr/share/terminfo/x/xterm-256color') ? 'xterm-256color' : 'xterm';
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
