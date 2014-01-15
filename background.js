/**
 * Because of this Chromium bug (https://code.google.com/p/chromium/issues/detail?id=234497)
 * we are unable to use chrome.storage API in the context, other than background page.
 * Luckily, we can work around this issue with the help of the chrome.runtime API:
 */


chrome.runtime.onConnect.addListener(function(port) {

  if(port.name == "chrome.storage port"){
    port.onMessage.addListener(function(msg) {
      
      var obj = chrome.storage.sync    // chrome.storage.local ?
        , method = obj[msg.method]     // 'get' or 'set'
        , keys = msg.keys
        , message_id = msg.message_id;

      method.call(obj, keys, function(items){
        items = items || {};
        items.message_id = message_id;
        port.postMessage(items);
      })
    });
  }else if(port.name == "chrome.webNavigation port"){
    var tabId;
    port.onMessage.addListener(function(msg) {
      tabId = msg.tabId;
      webNavigationListeners[tabId] = port;
    });
    port.onDisconnect.addListener(function(){
      delete webNavigationListeners[tabId];
    })
  }else if(port.name == "chrome.nativeMessaging port"){
    var nmPort = null;
    port.onMessage.addListener(function(msg) {
      if(msg.event == 'init'){
        nmPort = chrome.runtime.connectNative("com.dfilimonov.devtoolsterminal");
        console.log('CONNECT')
        nmPort.onDisconnect.addListener(function(){
          nmPort = null;
          console.log('disconnect')
          if(chrome.runtime.lastError){
            console.log(chrome.runtime.lastError.message);
            port.postMessage({event: 'nm-error', data: chrome.runtime.lastError.message})
          }
          port.disconnect();
        });
        nmPort.onMessage.addListener(function(data){
          console.log('MESSAGE')
          port.postMessage(data);
        });
      }
      if(nmPort){
        console.log('POST',msg)
        nmPort.postMessage(msg);
      }
    });
    port.onDisconnect.addListener(function(){
      console.log('disconnect');
      if(nmPort){
        nmPort.postMessage({event: 'disconnect', data:{}});
        nmPort.disconnect();
      }
    })
  }
});


/**
 * The same thing, we can't access chrome.webNavigation API directly from devtools panel
 */
var webNavigationListeners = {};

function webNavigationHandler(){
  chrome.webNavigation.onBeforeNavigate.addListener(function(details){
    if(details.parentFrameId == -1){ // which means this is the main frame
      var port = webNavigationListeners[details.tabId];
      if(port){
        port.postMessage(details);
      }
    }
  });
}


/*
var permissions = {
  permissions: ['webNavigation', 'nativeMessaging']
}

chrome.permissions.contains(permissions, function(granted){
  if(granted){
    webNavigationHandler();
  }else{
    chrome.permissions.request(permissions, function(granted2){
      granted2 && webNavigationHandler();
    });
  }
});
*/

