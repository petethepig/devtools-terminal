;(function() {
  
  "use strict";

  var debug = !true;

  /*
   * Taken from Chromium:
   */
  var ChromiumUIUtils = function() {

    var Flavors = {
      WindowsVista: "windows-vista",
      MacTiger: "mac-tiger",
      MacLeopard: "mac-leopard",
      MacSnowLeopard: "mac-snowleopard",
      MacLion: "mac-lion",
      MacMountainLion: "mac-mountain-lion"
    };

    function platform() {
      var match = navigator.userAgent.match(/Windows NT/);
      if (match)
        return "windows";
      match = navigator.userAgent.match(/Mac OS X/);
      if (match)
        return "mac";
      return "linux";
    }

    function platformFlavor() {
      var userAgent = navigator.userAgent
        , match;
      if (platform() === "windows") {
        match = userAgent.match(/Windows NT (\d+)\.(?:\d+)/);
        if (match && match[1] >= 6)
          return Flavors.WindowsVista;
        return null;
      } else if (platform() === "mac") {
        match = userAgent.match(/Mac OS X\s*(?:(\d+)_(\d+))?/);
        if (!match || match[1] != 10)
          return Flavors.MacSnowLeopard;
        switch (Number(match[2])) {
          case 4:
            return Flavors.MacTiger;
          case 5:
            return Flavors.MacLeopard;
          case 6:
            return Flavors.MacSnowLeopard;
          case 7:
            return Flavors.MacLion;
          case 8:
            return Flavors.MacMountainLion;
          default:
            return "";
        }
      }
    }

    function setBodyClasses() {
      document.body.classList.add("platform-" + platform());
      var flavor = platformFlavor();
      if(flavor != "" && flavor != null){
        document.body.classList.add("platform-" + flavor);
      }
    }

    window.addEventListener("load", setBodyClasses);

    return {
      platform: platform,
      platformFlavor: platformFlavor
    }
  }();

  /**
   * Emulating system 'beep' sound
   * http://stackoverflow.com/questions/879152/how-do-i-make-javascript-beep
   */
  var beep = (function () {
    var ctx = new(window.audioContext || window.webkitAudioContext);
    var playing = false;
    return function (duration, type, frequency, finishedCallback) {
      if(playing) return;
      duration = +duration;

      // Only 0-4 are valid types.
      type = (type % 4) || 0;

      if (typeof finishedCallback != "function") {
        finishedCallback = function () {};
      }

      var osc = ctx.createOscillator()
        , gain = ctx.createGainNode();

      osc.type = type;
      playing = true;

      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0.0;
      var now = ctx.currentTime;
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(1.0, now + duration/1000/4);
      gain.gain.linearRampToValueAtTime(0.0, now + duration/1000);

      osc.frequency.value = frequency;
      osc.noteOn(0);

      setTimeout(function () {
        osc.noteOff(0);
        playing = false;
        finishedCallback();
      }, duration);

    };
  })();
  window.beep = beep;


  /**
   * Monkey-patching term.js library
   */
  Terminal.prototype._resize = Terminal.prototype.resize;
  Terminal.prototype.resize = function() {
    this._resize.apply(this, arguments);
    this.emit('resize', [this.cols, this.rows]);
  };

  Terminal.prototype._bell = Terminal.prototype.bell;
  Terminal.prototype.bell = function() {
    this._bell.apply(this, arguments);
    this.emit('bell');
  }

  Terminal.prototype._open = Terminal.prototype.open;
  Terminal.prototype.open = function() {
    this._open.apply(this, arguments);
    this.element.setAttribute('spellcheck', 'false');
  }

  Terminal.prototype._blur = Terminal.prototype.blur;
  Terminal.prototype.blur = function() {} // We don't want our terminal to ever go blur

  Terminal._insertStyle = Terminal.insertStyle;
  Terminal.insertStyle = function(document, bg, fg){
    var style = document.getElementById('term-style');
    if (style && style.parentNode){
      style.parentNode.removeChild(style);
    }

    var head = document.getElementsByTagName('head')[0];
    if (!head) return;

    var style = document.createElement('style');
    style.id = 'term-style';

    // textContent doesn't work well with IE for <style> elements.
    style.innerHTML = ''
      + 'body {\n'
      + '  background: ' + bg + ';\n'
      + '}\n'
      + '.terminal {\n'
      + '  color: ' + fg + ';\n'
      + '  background: ' + bg + ';\n'
      + '  border-color: ' + bg + ';\n'
      + '}\n'
      + '\n'
      + '.terminal-cursor {\n'
      + '  color: ' + bg + ';\n'
      + '  background: ' + fg + ';\n'
      + '}\n';

    head.insertBefore(style, head.firstChild);
  }

  /**
   * Color Themes
   */
  function ColorTheme(bg, fg, colors){
    colors[256] = bg;
    colors[257] = fg;
    for(var i = 0; i < 258; i++){
      if(!colors[i]){
        colors[i] = Terminal.colors[i];
      }
    }
    return colors;
  }

  var DefaultColorThemes = {};

  function setColorTheme(theme){
    var colors = DefaultColorThemes[theme]
    Terminal.colors = colors;
    Terminal.insertStyle(document, colors[256], colors[257]);
    Array.prototype.forEach.call(document.querySelectorAll('.terminal'),function(term){
      term.style.backgroundColor = colors[256];
      term.style.color = colors[257];
    })
  }

  DefaultColorThemes['monokai'] = ColorTheme('#272822', '#F6F5EE', [
    '#111111',//0 - black
    '#f33774',//1 - red
    '#a3e400',//2 - green
    '#f6f278',//3 - yellow
    '#947bff',//4 - blue
    '#c97bff',//5 - pink
    '#76d6f0',//6 - light blue
    '#e5e5e5',//7 - white
    //bright
    '#4c4c4c',//8
    '#f777a0',//9
    '#bfed51',//10
    '#f9f6a3',//11
    '#b6a5ff',//12
    '#daa5ff',//13
    '#a2e3f5',//14
    '#ffffff' //15
  ]);

  DefaultColorThemes['monokai_bright'] = ColorTheme('#ffffff', '#313842', [
    '#111111',//0 - black
    '#951643',//1 - red
    '#70aa00',//2 - green
    '#a6a84d',//3 - yellow
    '#522cdd',//4 - blue
    '#7c4db5',//5 - pink
    '#5aa0b4',//6 - light blue
    '#bfbfbf',//7 - white
    //bright
    '#4c4c4c',//8
    '#f33774',//9
    '#a3e400',//10
    '#f6f278',//11
    '#947bff',//12
    '#c97bff',//13
    '#76d6f0',//14
    '#ffffff' //15
  ]);

  /**
   * Utility Functions
  */
  var EventEmitter = Terminal.EventEmitter;
  var inherits = Terminal.inherits;
  var empty = function empty() {};

  function extend(obj) {
    for(var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    }
    return obj;
  }

  function asyncCall(func, timeout) {
    if(typeof timeout === "undefined") {
      timeout = 0;
    }
    Array.prototype.slice.call(arguments);
    var args = Array.prototype.slice.call(arguments);
    return setTimeout(func, timeout, args);
  }

  function randomID() {
    return Math.random().toString(36).substring(2);
  }

  /**
   * Chrome API-related stuff
   */  

  function chromeApisAvailable() {
    try{
      return chrome && chrome.runtime && chrome.storage;
    }catch(e) {
      return false;
    }
  }

  function devtoolsApiAvailable() {
    try{
      return chrome && chrome.devtools;
    }catch(e) {
      return false;
    }
  }

  function getSuggestedServers(callback) {
    if(devtoolsApiAvailable()) {
      var script = "Array.prototype.map.call(document.querySelectorAll('meta[name=devtools-terminal-url]'), function(a) {return a.content;});";
      chrome.devtools.inspectedWindow.eval(script, function(result, isException) {
        if(result && !isException) {
          callback(result);
        }else{
          callback([]);
        }
      });
    }else{
      callback([]);
    }
  }


  /**
   * Because of this Chromium bug (https://code.google.com/p/chromium/issues/detail?id=234497)
   * we are unable to use chrome.storage API in the context, other than background page.
   * Luckily, we can work around this issue with the help of the chrome.runtime API:
   */

  function StorageApiBridge() {

    if(StorageApiBridge.instance) {
      throw new Error("StorageApiBridge constructor must be called only once");
    }else{
      StorageApiBridge.instance = this;
    }

    var callbacks = {}
      , port = chrome.runtime.connect({name: "chrome.storage port"});

    port.onMessage.addListener(function(msg) {
      var callback = callbacks[msg.message_id];
      delete msg.message_id;
      callback(msg);
    });

    function postMessage(method, keys, callback) {
      var message_id = randomID();
      callbacks[message_id] = callback;
      port.postMessage({method: method, keys: keys, message_id: message_id});
    }

    this.get = function(keys, callback) {
      postMessage("get", keys, callback);
    };

    this.set = function(keys, callback) {
      postMessage("set", keys, callback);
    };

  }
  new StorageApiBridge();


  /**
   * Settings
   */

  function Settings() {

    EventEmitter.call(this);

    var storageAPI = StorageApiBridge.instance;
    var self = this;
    var localCopy = {
      servers: {},
      colorTheme: 'monokai_bright'
    };

    this.load = function(){
      storageAPI.get(null, function(items) {
        localCopy = extend(localCopy, items || {});
        self.ready = true;
        self.emit('ready');
      });
    }

    this.get = function(a){
      return localCopy[a];
    }

    this.set = function(a,b){
      localCopy[a] = b;
      var data = {};
      data[a] = b;
      storageAPI.set(data, function(){});
    }

    this.updateServerInfo = function (url, obj) {
      var servers = localCopy['servers'] || {};
      var server = servers[url] || {};
      extend(server, obj);
      servers[url] = server;
      this.set('servers', servers);
    }

  }
  inherits(Settings, EventEmitter);
  Settings = new Settings();

  /**
   * Abstract Component class
   */

  function Component(options) {
    EventEmitter.call(this);

    if(typeof options === "undefined") {
      options = {};
    }

    this.element = options.element || this.element;
    this.template = options.template || this.template;


    if(!this.element && this.template) {
      this.element = document.createElement("div");
      this.element.appendChild(this.template.content.cloneNode(true));
    }

    this.initialize.call(this, options);

    if(!this.element) {
      throw new Error("Component requires 'template' or 'element'");
    }
  }

  inherits(Component, EventEmitter);

  extend(Component.prototype, {
    initialize: empty,
    destroy: empty,
    template: null,
    element: null,
    $: function(q) {
      return this.element.querySelectorAll(q);
    },
    $on: function(el, type, listener, useCapture) {
      listener.__bind__ = listener.bind(this);
      el.addEventListener(type, listener.__bind__, useCapture);
    },
    $off: function(el, type, listener, useCapture) {
      el.removeEventListener(type, listener.__bind__ || listener, useCapture);
    }
  });

  

  Component.extend = function(obj) {
    var parent = this;
    var child = function() { return parent.apply(this, arguments); };
    inherits(child, parent);
    extend(child.prototype, obj);
    child.prototype.__super__ = this;
    child.extend = parent.extend;
    return child;
  };


  /**
   * Abstract modal window controller
   */

  var ModalComponent = Component.extend({
    show: function() {
      var self = this;
      clearTimeout(this.timeoutID);
      this.element.style.display = "block";
      asyncCall(function() {
        self.element.classList.add("show");
        document.querySelector(".content").classList.add("blur");
        if(self.focusElement){
          self.focusElement.focus();
        }
      });
    },
    hide: function() {
      var self = this;
      this.element.classList.remove("show");
      document.querySelector(".content").classList.remove("blur");
      this.timeoutID = asyncCall(function() {
        self.element.style.display = "none";
      }, 500);
    }
  });


  var AuthModalComponent = ModalComponent.extend({
    initialize: function(options) {
      var self = this;

      this.form = this.$("form")[0];
      this.cancelBtn = this.$(".js-cancel-btn")[0];
      this.okBtn = this.$(".js-ok-btn")[0];

      this.urlInput = this.$('input[name="url"]')[0];
      this.loginInput = this.$('input[name="login"]')[0];
      this.passwordInput = this.$('input[name="password"]')[0];

      this.focusElement = this.urlInput;

      this.urlInput.value = options.url || "";
      this.loginInput.value = options.login || "";
      this.passwordInput.value = options.password || "";


      this.$on(this.cancelBtn, 'click', this.cancelHandler);
      this.$on(this.form, 'submit', this.submitHandler);
    },
    setValues: function(url, login, password){
      this.urlInput.value = url;
      this.loginInput.value = login;
      this.passwordInput.value = password;
    },
    cancelHandler: function(ev) {
      ev.preventDefault();
      this.emit('cancel');
      this.hide();
    },
    submitHandler: function(ev) {
      ev.preventDefault();
      this.emit('submit',
        this.urlInput.value,
        this.loginInput.value,
        this.passwordInput.value
      );
    },
    destroy: function() {
      this.$off(this.cancelBtn, 'click', this.cancelHandler);
      this.$off(this.okBtn, 'click', this.submitHandler);
      this.element.parentNode.removeChild(this.element);
    }
  });


  var ErrorModalComponent = ModalComponent.extend({
    initialize: function(options) {
      var self = this;

      this.header = this.$("h4")[0];
      this.form = this.$("form")[0];
      this.cancelBtn = this.$(".js-cancel-btn")[0];
      this.okBtn = this.$(".js-ok-btn")[0];

      this.focusElement = this.okBtn;
      
      this.$on(this.cancelBtn, 'click', this.cancelHandler);
      this.$on(this.form, 'submit', this.submitHandler);
    },
    cancelHandler: function(ev) {
      ev.preventDefault();
      this.emit('cancel');
      this.hide();
    },
    submitHandler: function(ev) {
      ev.preventDefault();
      this.emit('submit');
    },
    setTitle: function(t) {
      this.header.innerText = t;
    },
    destroy: function() {
      this.$off(this.cancelBtn, 'click', this.cancelHandler);
      this.$off(this.okBtn, 'click', this.submitHandler);
      this.element.parentNode.removeChild(this.element);
    }
  });


  var MenuComponent = Component.extend({
    initialize: function(options) {
      var self = this;
      
      this.openButton = document.querySelector(".theme-toggle-btn");
      this.remoteConnectionButton = this.element.querySelectorAll("button")[0];
      this.themeToggleButton = this.element.querySelectorAll("button")[1];
      this.helpButton = this.element.querySelectorAll("button")[2];

      this.updateUI(Settings.get('colorTheme'));

      this.$on(this.openButton, 'click', this.show);
      this.$on(this.remoteConnectionButton, 'click', this.remoteConnectionButtonClick);
      this.$on(this.themeToggleButton, 'click', this.themeToggleButtonClick);
      this.$on(this.helpButton, 'click', this.helpButtonClick);
    },
    remoteConnectionButtonClick: function(){
      this.emit('remote_connection');
    },
    themeToggleButtonClick: function(){
      var newTheme = Settings.get('colorTheme') == 'monokai' ? 'monokai_bright' : 'monokai';
      setColorTheme(newTheme);
      this.updateUI(newTheme);
      Settings.set('colorTheme', newTheme);
    },
    helpButtonClick: function(){
      this.aElement = this.aElement || document.createElement("a");
      document.body.appendChild(this.aElement);
      this.aElement.setAttribute("href", 'http://blog.dfilimonov.com/2013/09/12/devtools-terminal.html');
      this.aElement.setAttribute("target", "_blank");
      this.aElement.click();
    },
    updateUI: function(theme){
      this.openButton.classList.toggle('white', theme == 'monokai');
      this.themeToggleButton.textContent = 
        theme == 'monokai' ? "Bright theme" : "Dark theme";
    },
    show: function() {
      this.visible = true;
      this.element.classList.add("show");
      asyncCall(function(){
        this.$on(document, 'click', this.hide);
      }.bind(this));
    },
    hide: function() {
      this.$off(document, 'click', this.hide);
      this.visible = false;
      this.element.classList.remove("show");
    }
  });


  var ResourceLinker = Component.extend({
    initialize: function(){
      var self = this;
      this.resources = {};
      this.element = 1;
      if(ResourceLinker.available){
        this.tabId = chrome.devtools.inspectedWindow.tabId;
        
        chrome.devtools.inspectedWindow.getResources(function(array){
          for(var i = 0; i < array.length; i++){
            self.addResource(array[i]);
          }
        });

        var port = chrome.runtime.connect({name: "chrome.webNavigation port"});
        port.postMessage({tabId: this.tabId});
        port.onMessage.addListener(function(details) {
          self.reset();
        });

        chrome.devtools.inspectedWindow.onResourceAdded.addListener(function(res){
          self.addResource(res);
        });
      }
    },
    reset: function(){
      console.log('reset');
      this.resources = {};
    },
    addResource: function(res){
      console.log('add', res.url);
 
      var p = this.parser = this.parser || document.createElement('a');
      p.href = res.url;
      p.search = p.hash = null;
      var url = p.href;

      this.resources[res.url] = url.split('/').reverse();
    },
    matchingResource: function(url){
      
      url = url.split('/').reverse();

      var max_l = 0;
      var matched_url = null;
      console.log(this.resources, url);
      for(var i in this.resources){
        var components = this.resources[i];
        var j = 0;
        while(
            j < components.length && 
            j < url.length && 
            components[j] == url[j]){
          j++;
        }
        if(max_l < j){
          max_l = j;
          matched_url=i;
        }
      }
      return matched_url;
    },
    openResource: function(url, line){
      console.log('open', url, +line - 1);
      chrome.devtools.panels.openResource(url, +line - 1);
    }
  });

  ResourceLinker.available = chrome.devtools && 
    chrome.devtools.inspectedWindow && 
    chrome.devtools.panels;


  // Deprecated
  var PluginComponent = Component.extend({
    initialize: function(options) {
      options = options || {};
      options.cols = options.cols || 80;
      options.rows = options.rows || 24;

      this.options = options; 

      var plugin = document.createElement('embed');
      plugin.setAttribute('hidden', 'true');
      plugin.type = 'application/x-devtools-terminal';
      document.body.appendChild(plugin);
      
      window.plugin = this.plugin = this.element = plugin;

    },
    connect: function(){
      var self = this;
      asyncCall(function(){
        self.plugin.init(self.options, function(data){
          if(data == null){
            EventEmitter.prototype.emit.call(self, 'disconnect');
          }else{
            EventEmitter.prototype.emit.call(self, 'data', data);
          }
        });
        EventEmitter.prototype.emit.call(self, 'connect');
      }, 100);
    },
    emit: function(event, data){
      if(this.plugin[event]){
        var a = this.plugin[event].call(this.plugin, data);
      }
    },
    removeAllListeners: function(){
      //TODO
    }
  });


  var NativeMessagingComponent = Component.extend({
    initialize: function(options) {
      options = options || {};
      options.cols = options.cols || 80;
      options.rows = options.rows || 24;
      this.options = options; 
      this.element = 1;
    },
    connect: function(){
      var self = this;
      asyncCall(function(){
        self.port = chrome.runtime.connectNative("com.dfilimonov.devtoolsterminal");
        self.port.onDisconnect.addListener(function(){
          if(chrome.runtime.lastError){
            console.error(chrome.runtime.lastError.message)
          }
          console.log("disconnect")
          EventEmitter.prototype.emit.call(self, 'disconnect');
          self.port = null;
        });
        self.port.onMessage.addListener(function(msg){
          EventEmitter.prototype.emit.call(self, msg.event, msg.data);
        });
        self.emit('init', self.options);
        EventEmitter.prototype.emit.call(self, 'connect');
      });
    },
    emit: function(event, data){
      //console.log(this.port)
      if(this.port){
        this.port.postMessage({
          event: event,
          data: data
        });
      }
    },
    removeAllListeners: function(){
      //TODO
    }
  });

  var TerminalComponent = Component.extend({
    initialize: function(options) {
      this.element = document.createElement("div");
      this.element.className = "terminal-container";
      this.options = {};
    },
    initTerminal: function() {
      var self = this;
      var size = this.maxSize();
      this.term = new Terminal({
        cols: size.cols,
        rows: size.rows,
        useStyle: true,
        screenKeys: true,
        cursorBlink: false,
        soundBell: true,
        debug: true
      });

      if(ResourceLinker.available){
        this.term.resourceLinker = new ResourceLinker();
      }

      
      this.term.open(this.element);

      this.$on(window, 'resize', this.resizeHandler);
      this.resizeHandler();


      this.term.on('title', function(data) {
        console.log('title', data)
        self.cwd = data;
        Settings.updateServerInfo(self.url, {cwd: self.cwd});
      });

      this.term.on('bell', function() {
        beep(250/2, 0, 440/2);
      });

      this.term.on('resize', function(data) {
        if(self.socket) {
          self.socket.emit('resize', data);  
        }
      });

      this.term.on('data', function(data) {
        if(self.socket) {
          if(debug) console.log('<<', data);
          self.socket.emit('data', data);  
        }
      });

    },
    connect: function(options) {
      var self = this;

      options = options || {};
      //extend(this.options, options);

      this.url = options.url;
      this.login = options.login;
      this.password = options.password;
      this.cwd = this.cwd || options.cwd;
      this.cmd = this.cmd || options.cmd;

      if(this.socket) {
        this.utilizeSocket();
      }

      var term = this.term;
      var authData = btoa(this.login + ":" + this.password);
      var size = this.maxSize();


      if(this.url == "<localhost>"){
        this.socket = new NativeMessagingComponent({
          rows: size.rows,
          cols: size.cols,
          cwd: this.cwd,
          cmd: this.cmd
        });
      }else{
        if(!this.url.match(/^https?:\/\//)){
          this.url = "http://" + this.url;
        }
        this.socket = io.connect(this.url, {
          'force new connection': true,
          reconnect: false,
          query: ("auth=" + authData + "&cols=" + size.cols + "&rows=" + size.rows)
        });
      }

      this.socket.on('connect', function() {
        Settings.updateServerInfo(self.url, {login:self.login});
        self.emit('connect');
      });

      this.socket.on('disconnect', function() {
        self.emit('disconnect');
      });

      this.socket.on('data', function(data) {
        if(debug) console.log('>>', data);
        term.write(data);
      });

      this.socket.on('error', function(data) {
        var type = data == 'handshake error' ? 'handshake error' : 'error';
        self.emit(type, data);
      });

      if(this.socket.connect){
        this.socket.connect();
      }
      asyncCall(function(){
        self.term.reset();
        self.term.element.focus();
        self.term.showCursor();
      })

    },
    resizeHandler: function() {
      var s = this.maxSize();
      this.term.resize(s.cols, s.rows);
    },
    utilizeSocket: function() {
      this.socket.removeAllListeners();
      this.socket = null;
    },
    destroy: function() {
      this.utilizeSocket();
      term.destroy();
      this.$off(window, 'resize', self.resizeHandler);
    }


  });

  window.addEventListener("load", function() {
    var term = document.createElement("div")
      , cell = document.createElement("div");

    term.className = "terminal";
    term.style.position = "absolute";
    term.style.top = "-1000px";
    cell.innerHTML = "&nbsp;";
    term.appendChild(cell);
    document.body.appendChild(term);


    TerminalComponent.prototype.maxSize = function() {
      var w = this.element.clientWidth - (term.offsetWidth - term.clientWidth)
        , h = this.element.clientHeight - (term.offsetHeight - term.clientHeight)
        , x = cell.clientWidth
        , y = cell.clientHeight;
      return { cols: Math.max(Math.floor(w / x), 10), rows: Math.max(Math.floor(h / y), 10) };
    };
  });




  // Load data from persistent storage
  Settings.on('ready', function(){
    if(document.readyState == "complete"){
      main();
    }else{
      document.addEventListener( "DOMContentLoaded", function(){
        main();
      });
    }
  });
  Settings.load();

  function main(){

    // Set default values for Settings

    if(!Settings.get('colorTheme')){
      Settings.set('colorTheme', 'monokai_bright'); 
    }

    // Initialize all components
    var authModal = new AuthModalComponent({
      element: document.querySelector(".auth-modal")
    });

    var errorModal = new ErrorModalComponent({
      element: document.querySelector(".error-modal")
    });

    var menu = new MenuComponent({
      element: document.querySelector(".menu")
    });

    setColorTheme(Settings.get('colorTheme'));

    var terminal = new TerminalComponent();

    document.querySelector(".tab").appendChild(terminal.element);
    terminal.initTerminal();
    function newRemoteConnection(){
      authModal.setValues(
        Settings.get('last_url') || "http://",
        Settings.get('last_login') || "",
        ""
      );
      authModal.show();
    }

    // Setup menu events
    menu.on('remote_connection', newRemoteConnection);

    // Setup authModal events
    authModal.on('submit', function(url, login, password) {
      terminal.connect({
        url: url,
        login: login,
        password: password
      });
      authModal.hide();
    });

    // Setup errorModal events
    errorModal.on('cancel',function() {
      if(terminal.url != "<localhost>"){
        authModal.show();
      }
    });

    errorModal.on('submit',function() {
      terminal.connect();
    });

    // Setup terminal events
    terminal.on('error', function(data) {
      errorModal.setTitle("Connection failed");
      errorModal.show();
    });

    terminal.on('handshake error', function(data) {
      authModal.setValues(
        terminal.url,
        terminal.login,
        ""
      );
      authModal.show();
      asyncCall(function() {
        if(authModal.loginInput.value === "") {
          authModal.loginInput.focus();
        }else{
          authModal.passwordInput.focus();
        }
      },100);
    });

    terminal.on('connect', function(data) {
      if(terminal.url != "<localhost>"){
        Settings.set('last_url', terminal.url);
        Settings.set('last_login', terminal.login);
      }
      authModal.hide();
      errorModal.hide();
    });

    terminal.on('disconnect', function(data) {
      errorModal.setTitle("Connection lost");
      errorModal.show();
    });

    // Start with local terminal
    if(ChromiumUIUtils.platform() == 'mac'){
      var server = Settings.get("servers")["<localhost>"] || {};
      terminal.connect({
        url: "<localhost>",
        cwd: server.cwd,
        //cmd: "/bin/bash"
      });
    }else{
      newRemoteConnection();
    }
  }

}).call(this);





