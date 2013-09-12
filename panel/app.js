;(function() {
  
  "use strict";

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
      document.body.classList.add("platform-" + platformFlavor());
    }

    window.addEventListener("load", setBodyClasses);
  }();


  /**
   * Monkey-patching term.js library
  */
  var _resize = Terminal.prototype.resize;
  Terminal.prototype.resize = function() {
    _resize.apply(this, arguments);
    this.emit('resize', [this.cols, this.rows]);
  };

  Terminal.colors[256] = '#fff';
  Terminal.colors[257] = '#373f48';


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


  /**
   * 
   */

  function DataStorage() {

    if(DataStorage.instance) {
      throw new Error("DataStorage constructor must be called only once");
    }else{
      DataStorage.instance = this;
    }

    EventEmitter.call(this);

    var storageAPI = new StorageApiBridge();

    var self = this;

    this.ready = false;

    this.load = function(){
      storageAPI.get("servers", function(items) {
        self.servers = items.servers || {};
        self.ready = true;
        self.emit('ready');
      });
    }

    this.saveCredentials = function(obj) {
      var credentials = extend({}, obj); // cloning the credentials
      var url = credentials.url;
      delete credentials.url;
      delete credentials.password;

      self.servers[url] = credentials;
      storageAPI.set({servers: self.servers}, function() {});
      self.emit('change');
    }
  }

  inherits(DataStorage, EventEmitter);


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
      
      this.openButton = document.querySelector(".address-bar-btn.open-btn");
      this.addressInput = this.$("input[type='text']")[0];
      this.addressInput.value = "http://";
      this.form = this.$("form")[0];
      
      this.$on(this.openButton, 'click', this.openButtonClick);
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

      this.updateServers = this.updateServers.bind(this);
      DataStorage.instance.on('change', this.updateServers);
      this.updateServers();

    },
    updateServers: function(ev) {
      this.servers = Object.keys(DataStorage.instance.servers);
    },
    openButtonClick: function(){
      this.visible ? this.hide() : this.show();
    },
    submitHandler: function(ev) {
      ev.preventDefault();
      this.latestValue = this.addressInput.value;

      if(!/^https?:\/\//.test(this.latestValue)) {
        this.latestValue = 'http://' + this.latestValue;
      }
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
      var results = fuzzy.filter(str, this.servers,  { pre: '<strong>', post: '</strong>' });
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


  var TerminalComponent = Component.extend({
    initialize: function(options) {
      this.element = document.createElement("div");
      this.element.className = "terminal-container";
      this.credentials = {};
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
        debug: true
      });

      
      this.term.open(this.element);

      this.$on(window, 'resize', this.resizeHandler);
      this.resizeHandler();

      this.term.on('resize', function(data) {
        if(self.socket) {
          self.socket.emit('resize', data);  
        }
      });

      this.term.on('data', function(data) {
        if(self.socket) {
          self.socket.emit('data', data);  
        }
      });

    },
    connect: function(credentials) {
      var self = this;

      extend(this.credentials, credentials);

      if(this.socket) {
        this.utilizeSocket();
      }

      var term = this.term;
      var authData = btoa(this.credentials.login + ":" + this.credentials.password);
      var size = this.maxSize();
      var url = this.credentials.url;

      this.term.reset();
      this.term.focus();
      this.term.showCursor();

      this.socket = io.connect(url, {
        'force new connection': true,
        reconnect: false,
        query: ("auth=" + authData + "&cols=" + size.cols + "&rows=" + size.rows)
      });

      this.socket.on('connect', function() {
        DataStorage.instance.saveCredentials(self.credentials);
        self.emit('connect');
      });

      this.socket.on('disconnect', function() {
        self.emit('disconnect');
      });

      this.socket.on('data', function(data) {
        term.write(data);
      });

      this.socket.on('error', function(data) {
        var type = data == 'handshake error' ? 'handshake error' : 'error';
        self.emit(type, data);
      });

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
  var ds = new DataStorage();
  ds.on('ready', function(){
    if(document.readyState == "complete"){
      main();
    }else{
      document.addEventListener( "DOMContentLoaded", function(){
        document.removeEventListener( "DOMContentLoaded", arguments.callee, false );
        main();
      });
    }
  });
  ds.load();


  function main(){

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

    var terminal = new TerminalComponent();
    document.querySelector(".tab").appendChild(terminal.element);
    terminal.initTerminal();
    terminal.term.element.childNodes[3].innerHTML = 'Check out this <a href="http://blog.dfilimonov.com/2013/09/12/devtools-remote-terminal.html" target="_blank" >blog post</a> for instructions';

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
      var credentials = DataStorage.instance.servers[url] || {};
      terminal.connect({
        url: url,
        login: credentials.login || "admin",
        password: credentials.password || ""
      });
    });

    // Setup terminal events
    terminal.on('error', function(data) {
      errorModal.setTitle("Connection failed");
      errorModal.show();
    });

    terminal.on('handshake error', function(data) {
      authModal.show();
      authModal.loginInput.value = terminal.credentials.login;
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
    addressBar.show();

  }




}).call(this);











