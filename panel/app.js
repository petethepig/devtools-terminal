;(function() {
  
  "use strict";

  var debug = true;

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

      this.focusElement = this.okBtn;

      this.loginInput = this.$('input[name="login"]')[0];
      this.passwordInput = this.$('input[name="password"]')[0];

      this.loginInput.value = options.login || "";
      this.passwordInput.value = options.password || "";


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
      this.emit('submit',
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


  var AddressBarComponent = Component.extend({
    initialize: function(options) {
      var self = this;
      
      this.openButton = document.querySelector(".open-btn");
      this.themeToggleButton = document.querySelector(".theme-toggle-btn");
      
      this.themeToggleButton.classList.toggle('white', Settings.get('colorTheme') == 'monokai');

      this.addressInput = this.$("input[type='text']")[0];
      this.addressInput.value = "http://";
      this.form = this.$("form")[0];
      
      this.$on(this.openButton, 'click', this.openButtonClick);
      this.$on(this.themeToggleButton, 'click', this.themeToggleButtonClick);
      this.$on(this.form, 'submit', this.submitHandler);
      this.$on(this.addressInput, "focus", this.addressFocus);
      this.$on(this.addressInput, "blur", this.addressBlur);
      this.$on(this.addressInput, "keydown", function(ev) {
        asyncCall(function() {
          self.addressKeydown(ev);
        });
      });

      this.suggestionsContainer = this.$(".suggestions")[0];
      this.suggestionElements = this.$(".suggestion");

      for(var i = 0; i < 5; i++){
        this.$on(this.suggestionElements[i], 'mousedown', this.suggestionClick);
      }


      this.selectedSuggestion = 0;
      this.suggestionsCount = 0;

    },
    openButtonClick: function(){
      this.visible ? this.hide() : this.show();
    },
    themeToggleButtonClick: function(){
      var newTheme = Settings.get('colorTheme') == 'monokai' ? 'monokai_bright' : 'monokai';
      this.themeToggleButton.classList.toggle('white', newTheme == 'monokai');
      setColorTheme(newTheme);
      Settings.set('colorTheme', newTheme);
    },
    submitHandler: function(ev) {
      ev.preventDefault();
      this.latestValue = this.addressInput.value;

      /*
      if(!/^https?:\/\//.test(this.latestValue)) {
        this.latestValue = 'http://' + this.latestValue;
      }
      */
      if(!/\/$/.test(this.latestValue)){
        this.latestValue = this.latestValue + '/';
      }

      this.addressInput.value = this.latestValue;

      this.updateSuggestions();
      this.addressInput.blur();
      this.emit('submit', this.latestValue);
    },
    suggestionClick: function(ev) {
      for(var i = 0; i < 5; i++){
        if(this.suggestionElements[i] == ev.target){
          this.addressInput.value = ev.target.server;
          this.submitHandler(ev);
          return;
        }
      }
    },
    addressFocus: function(ev) {
      this.updateSuggestions();
    },
    addressBlur: function(ev) {
      this.updateSuggestions();
    },
    addressKeydown: function(ev) {
      switch(ev.keyCode) {
        case 38:
          this.selectedSuggestion--;
          if(this.selectedSuggestion < 0) {
            this.selectedSuggestion = this.suggestionsCount - 1;
          }
          break;
        case 40:
          this.selectedSuggestion++;
          if(this.selectedSuggestion > this.suggestionsCount - 1) {
            this.selectedSuggestion = 0;
          }
          break;
        default:
          this.latestValue = this.addressInput.value;
          this.selectedSuggestion = -1;
      }

      if(ev.keyCode == 38 || ev.keyCode == 40) {
        this.addressInput.value = this.suggestionElements[this.selectedSuggestion].innerText;
      }
      this.updateSuggestions();
    },
    updateSuggestions: function() {
      var str = this.latestValue || "";
      var servers = Settings.get('servers') || {};
      var serversArray = [];
      for(var i in servers){
        serversArray.push(i);
      }

      var results = fuzzy.filter(str, serversArray, { pre: '<strong>', post: '</strong>' });
      var matches = results.map(function(el) { return el.string; });

      if(this.visible && str !== "" && document.activeElement == this.addressInput && matches.length > 0) {
        this.suggestionsContainer.style.display = "block";
        for(var i = 0; i < this.suggestionElements.length; i++) {
          var el = this.suggestionElements[i];
          el.style.display = i < matches.length ? "block" : "none";
          if(i < matches.length) {
            el.server = results[i].original;
            el.innerHTML = matches[i];
            el.classList.toggle("selected", (i == this.selectedSuggestion));
          }
        }
      }else{
        this.suggestionsContainer.style.display = "none";
      }

      this.suggestionsCount = Math.min(matches.length, 5);

    },
    show: function() {
      return; // Temporary measure
      this.visible = true;
      this.element.classList.add("show");
      this.openButton.classList.remove("show");
      asyncCall(function(){
        this.addressInput.focus();
      }.bind(this),500);
    },
    hide: function() {
      this.visible = false;
      this.element.classList.remove("show");
      this.openButton.classList.add("show");
      this.updateSuggestions();
    }
  });

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
  })

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
      
      this.term.open(this.element);

      this.$on(window, 'resize', this.resizeHandler);
      this.resizeHandler();


      this.term.on('title', function(data) {
        self.cwd = data;
        Settings.updateServerInfo(self.url, {cwd: self.cwd});
      });

      this.term.on('bell', function() {
        beep(250/2,0,440/2);
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

      this.url = this.url || options.url;
      this.login = this.login || options.login;
      this.password = this.password || options.password;
      this.cwd = this.cwd || options.cwd;

      if(this.socket) {
        this.utilizeSocket();
      }

      var term = this.term;
      var authData = btoa(this.login + ":" + this.password);
      var size = this.maxSize();
      var url = this.url;


      if(url == "localhost"){
        this.socket = new PluginComponent({
          rows: size.rows,
          cols: size.cols,
          cwd: this.cwd
        });
      }else{
        this.socket = io.connect(url, {
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

    var addressBar = new AddressBarComponent({
      element: document.querySelector(".address-bar-wrapper")
    });


    setColorTheme(Settings.get('colorTheme'));

    var terminal = new TerminalComponent();

    document.querySelector(".tab").appendChild(terminal.element);
    terminal.initTerminal();

    // Setup authModal events
    authModal.on('submit', function(login, password) {
      terminal.connect({
        login: login,
        password: password
      });
      authModal.hide();
    });

    // Setup errorModal events
    errorModal.on('cancel',function() {
      addressBar.show();
    });

    errorModal.on('submit',function() {
      errorModal.hide();
      terminal.connect();
    });

    // Setup addressBar events
    addressBar.on('submit', function(url) {
      var options = Settings.get('servers')[url] || {};
      terminal.connect({
        url: url,
        login: options.login || "admin",
        password: options.password || "",
        cwd: options.cwd
      });
    });

    // Setup terminal events
    terminal.on('error', function(data) {
      errorModal.setTitle("Connection failed");
      errorModal.show();
    });

    terminal.on('handshake error', function(data) {
      authModal.show();
      authModal.loginInput.value = terminal.options.login;
      authModal.passwordInput.value = "";
      asyncCall(function() {
        if(authModal.loginInput.value === "") {
          authModal.loginInput.focus();
        }else{
          authModal.passwordInput.focus();
        }
      },100);
    });

    terminal.on('connect', function(data) {
      addressBar.hide();
      if(authModal) {
        authModal.hide();
      }
    });

    terminal.on('disconnect', function(data) {
      errorModal.setTitle("Connection lost");
      errorModal.show();
    });


    // Start with showing the address bar
    //addressBar.show();

    // Start with local terminal
    var server = Settings.get("servers")["localhost"] || {};
    terminal.connect({
      url: "localhost",
      cwd: server.cwd
    });

    window.Settings = Settings;

  }

}).call(this);











