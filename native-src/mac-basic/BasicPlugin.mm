/* ***** BEGIN LICENSE BLOCK *****
 *
 * THIS FILE IS PART OF THE MOZILLA NPAPI SDK BASIC PLUGIN SAMPLE
 * SOURCE CODE. USE, DISTRIBUTION AND REPRODUCTION OF THIS SOURCE
 * IS GOVERNED BY A BSD-STYLE SOURCE LICENSE INCLUDED WITH THIS 
 * SOURCE IN 'COPYING'. PLEASE READ THESE TERMS BEFORE DISTRIBUTING.
 *
 * THE MOZILLA NPAPI SDK BASIC PLUGIN SAMPLE SOURCE CODE IS
 * (C) COPYRIGHT 2008 by the Mozilla Corporation
 * http://www.mozilla.com/
 *
 * Contributors:
 *  Josh Aas <josh@mozilla.com>
 *
 * ***** END LICENSE BLOCK ***** */

/*
 * This sample plugin uses the Cocoa event model and the Core Graphics
 * drawing model.
 */

#define TTYDEFCHARS
#define UTF_SIZ       4

#include <util.h>
#include <pthread.h>
#include <poll.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/ioctl.h>
#include <sys/stat.h>
#include <sys/time.h>
#include <sys/types.h>
#include <sys/ttydefaults.h>
#import <AppKit/AppKit.h>

#include "BasicPlugin.h"
#include "hashmap.h"
#include "utf8.h"

extern char **environ;




typedef struct PluginInstance {
  NPP npp;
  NPWindow window;
} PluginInstance;


struct MyNPObject : public NPObject {
  NPP npp;
  NPObject *dataCallback;
  pid_t pid;
  int fd;
  char *cwd;
  char *cmd;
  int rows;
  int cols;
  
  explicit MyNPObject(NPP _npp) : npp(_npp) {}
};


struct DataContainer{
  MyNPObject *obj;
  NPVariant data;
};


typedef bool (*method_t)(MyNPObject *obj, const NPVariant *args, uint32_t argCount, NPVariant *result);


static NPNetscapeFuncs* browser;
static map_t methodsTable;



static void sendDataBack(void * userData){
  DataContainer *dc = (DataContainer *)userData;
  MyNPObject *obj = dc->obj;
  NPVariant str = dc->data;
  NPVariant args[1] = { str };
  NPVariant result;
  
  browser->invokeDefault(obj->npp, obj->dataCallback, args, 1, &result);
}

static void closeConnection(MyNPObject *obj){
  NPVariant *data = new NPVariant;
  NULL_TO_NPVARIANT(*data);
  DataContainer *dc = new DataContainer;
  dc->obj = obj;
  dc->data = *data;
  browser->pluginthreadasynccall(obj->npp, sendDataBack, dc);
}

void define_method(const char *name, method_t func){
  hashmap_put(methodsTable, (char *)name, (void *)func);
}

static void *handleIO(void * userData){
  MyNPObject *obj = (MyNPObject *)userData;
  int m, s, pid;
  struct winsize w = {obj->rows, obj->cols, 0, 0};
  
  int ret = openpty(&m, &s, NULL, NULL, &w);
  if(ret < 0){
    closeConnection(obj);
    return NULL;
  }
  
  passwd *pass;
  switch(pid = fork()) {
    case -1: // error
      break;
    case 0: // slave
    
      setsid(); // creates a new session
      dup2(s, STDIN_FILENO); //duplicate a file descriptor
      dup2(s, STDOUT_FILENO);
      dup2(s, STDERR_FILENO);
      
      ioctl(s, TIOCSCTTY, NULL); // Make the given terminal the controlling
                                 // terminal of the calling process
      
      
      close(s); // closes a file descriptor
      close(m);
      
      char **args;
      char *cwd;
      if(obj->cwd != NULL){
        cwd = obj->cwd;
      }else{
        cwd = getenv("HOME");
      }
      
      chdir(cwd);
      
      
      pass = getpwuid(getuid());
      if(pass) {
        setenv("LOGNAME", pass->pw_name, 1);
        setenv("USER", pass->pw_name, 1);
        setenv("SHELL", pass->pw_shell, 0);
        setenv("HOME", pass->pw_dir, 0);
      }
      
      signal(SIGCHLD, SIG_DFL);
      signal(SIGHUP, SIG_DFL);
      signal(SIGINT, SIG_DFL);
      signal(SIGQUIT, SIG_DFL);
      signal(SIGTERM, SIG_DFL);
      signal(SIGALRM, SIG_DFL);

      setenv("TERM", "xterm", 1);
      setenv("TERM_PROGRAM", "Devtools_Terminal", 1);
      setenv("PROMPT_COMMAND","printf '\e]2;%s\a' \"$PWD\"",1);
      setenv("LC_CTYPE","UTF-8",1);
      args = (char *[]){obj->cmd, (char *)"-i", NULL};
      
      //execvp(args[0], args);
      execle(obj->cmd, (char *)"-i", NULL, environ);
      exit(0);
      
      break;
    
    default: // master
      close(s);
      
      pollfd ufds = {m, POLLIN | POLLPRI};
      pollfd *ufds_arr = { &ufds };
      
      
      
      obj->fd = m;
      obj->pid = pid;

      char last_utf_char[UTF_SIZ];
      int buflen = 0;
      
      int a;
      
      while(1){
        if((a = poll(ufds_arr, 1, -1)) > 0){
          
  
          char *buffer = (char *)malloc(sizeof(char) * (BUFSIZ + buflen));
          int bytesRead = read(m, buffer + buflen, BUFSIZ);
          
          if(bytesRead <= 0){
            break;
          }
          
          char *ptr = buffer;
          
          if(buflen > 0){
            memcpy(ptr, last_utf_char, buflen);
          }
          
          int charsize; /* size of utf8 char in bytes */
          long utf8c;
          buflen = buflen + bytesRead;
          while(buflen >= UTF_SIZ || isfullutf8(ptr,buflen)) {
            charsize = utf8decode(ptr, &utf8c);
            ptr += charsize;
            buflen -= charsize;
          }
          
          if(buflen > 0){
            memcpy(last_utf_char, ptr, buflen);
          }
          
          NPVariant *data = new NPVariant;
          STRINGN_TO_NPVARIANT(buffer, ptr-buffer, *data);
          DataContainer *dc = new DataContainer;
          dc->obj = obj;
          dc->data = *data;
          browser->pluginthreadasynccall(obj->npp, sendDataBack, dc);
        }else{
          break;
        }
      }
      
    break;
  
  }

  closeConnection(obj);

  return NULL;
}

NPVariant getNPVariantByString(NPP npp, NPObject *obj, char * name){
  NPVariant v;
  browser->getproperty(npp, obj, browser->getstringidentifier(name), &v);
  return v;
}

bool method_init(MyNPObject *obj, const NPVariant *args, uint32_t argCount, NPVariant *result){
  if(argCount >= 2 && NPVARIANT_IS_OBJECT(args[0]) && NPVARIANT_IS_OBJECT(args[1])) {

    NPObject *options = NPVARIANT_TO_OBJECT(args[0]);
    
    NPVariant rows_v;
    NPVariant cols_v;
    NPVariant cwd_v;
    NPVariant cmd_v;
  
    obj->dataCallback = NPVARIANT_TO_OBJECT(args[1]);
    browser->retainobject(obj->dataCallback);

    obj->rows = 80;
    obj->rows = 24;
    obj->cwd = NULL;
    obj->cmd = getenv("SHELL");

    if(browser->getproperty(obj->npp, options, 
        browser->getstringidentifier("rows"), &rows_v) 
        && rows_v.type != NPVariantType_Void){
      obj->rows = (int)NPVARIANT_TO_DOUBLE(rows_v);
    }
    
    if(browser->getproperty(obj->npp, options, 
        browser->getstringidentifier("cols"), &cols_v) 
        && cols_v.type != NPVariantType_Void){
      obj->cols = (int)NPVARIANT_TO_DOUBLE(cols_v);
    }
    
    if(browser->getproperty(obj->npp, options, 
        browser->getstringidentifier("cmd"), &cmd_v) 
        && cmd_v.type != NPVariantType_Void){
      obj->cmd = (char *)NPVARIANT_TO_STRING(cmd_v).UTF8Characters;
    }

    if(browser->getproperty(obj->npp, options, 
        browser->getstringidentifier("cwd"), &cwd_v) 
        && cwd_v.type != NPVariantType_Void){
      obj->cwd = (char *)NPVARIANT_TO_STRING(cwd_v).UTF8Characters;
    }
    
    pthread_t thread;
    pthread_create(&thread, NULL, handleIO, (void *)obj);
    
    VOID_TO_NPVARIANT(*result);
    return true;
  }else{
    return false;
  }
}

bool method_data(MyNPObject *obj, const NPVariant *args, 
                 uint32_t argCount, NPVariant *result){
  if(argCount >= 1 && NPVARIANT_IS_STRING(args[0])) {
    NPString str = NPVARIANT_TO_STRING(args[0]);
    write(obj->fd, str.UTF8Characters,  str.UTF8Length);
    VOID_TO_NPVARIANT(*result);
    return true;
  }else{
    return false;
  }
}

bool method_debug(MyNPObject *obj, const NPVariant *args,
                  uint32_t argCount, NPVariant *result){
    char * cwd = getcwd(NULL, 0);
    STRINGZ_TO_NPVARIANT(cwd, *result);
    return true;
}

bool method_resize(MyNPObject *obj, const NPVariant *args, 
                   uint32_t argCount, NPVariant *result){
  if(argCount >= 1 && NPVARIANT_IS_OBJECT(args[0])) {
    
    NPObject *data = NPVARIANT_TO_OBJECT(args[0]);
    NPVariant rows_v;
    NPVariant cols_v;
    browser->getproperty(obj->npp, data, browser->getintidentifier(0), &rows_v);
    browser->getproperty(obj->npp, data, browser->getintidentifier(1), &cols_v);
    int rows = (int)NPVARIANT_TO_DOUBLE(rows_v);
    int cols = (int)NPVARIANT_TO_DOUBLE(cols_v);
  
    struct winsize w = {rows, cols, 0, 0};

    ioctl(obj->fd, TIOCSWINSZ, &w);
    
    VOID_TO_NPVARIANT(*result);
    return true;
  }else{
    return false;
  }
}

bool method_bell(MyNPObject *obj, const NPVariant *args, 
                 uint32_t argCount, NPVariant *result){
  
    NSBeep();
  
    VOID_TO_NPVARIANT(*result);
    return true;
}
















NPError NP_Initialize(NPNetscapeFuncs* browserFuncs) {  
  browser = browserFuncs;
  //sleep(20);
  methodsTable = hashmap_new();

  define_method("init", &method_init);
  define_method("data", &method_data);
  define_method("debug", &method_debug);
  define_method("resize", &method_resize);
  define_method("bell", &method_bell);

  return NPERR_NO_ERROR;
}

NPError NP_GetEntryPoints(NPPluginFuncs* pluginFuncs) {
  if (pluginFuncs->size < (offsetof(NPPluginFuncs, setvalue) + sizeof(void*)))
    return NPERR_INVALID_FUNCTABLE_ERROR;

  pluginFuncs->newp = NPP_New;
  pluginFuncs->destroy = NPP_Destroy;
  pluginFuncs->setwindow = NPP_SetWindow;
  pluginFuncs->newstream = NPP_NewStream;
  pluginFuncs->destroystream = NPP_DestroyStream;
  pluginFuncs->asfile = NPP_StreamAsFile;
  pluginFuncs->writeready = NPP_WriteReady;
  pluginFuncs->write = (NPP_WriteProcPtr)NPP_Write;
  pluginFuncs->print = NPP_Print;
  pluginFuncs->event = NPP_HandleEvent;
  pluginFuncs->urlnotify = NPP_URLNotify;
  pluginFuncs->getvalue = NPP_GetValue;
  pluginFuncs->setvalue = NPP_SetValue;

  return NPERR_NO_ERROR;
}

void NP_Shutdown(void) {

}








static NPObject* objAllocate(NPP npp, NPClass *aClass) {
  return new MyNPObject(npp);
}

static void objDeallocate(NPObject *npobj) {
  delete npobj;
}

static void objInvalidate(NPObject *npobj) {
}

static bool objHasMethod(NPObject *obj, NPIdentifier methodName) {
  NPUTF8 *name = browser->utf8fromidentifier(methodName);

  any_t *a;
  bool result = hashmap_get(methodsTable, (char *)name, a) == MAP_OK;
  
  browser->memfree(name);
  return result;
}

static bool objInvoke(NPObject *obj,
                      NPIdentifier methodName, 
                      const NPVariant *args, 
                      uint32_t argCount, 
                      NPVariant *result) {
  
  MyNPObject* myObj = reinterpret_cast<MyNPObject*>(obj);
  NPUTF8 *name = browser->utf8fromidentifier(methodName);
  
  any_t method;
  bool _result = hashmap_get(methodsTable, (char *)name, &method) == MAP_OK;

  _result = _result && ((method_t)(method))(myObj, args, argCount, result);

  browser->memfree(name);
  return _result;
}

static bool objInvokeDefault(NPObject *npobj, const NPVariant *args, 
                             uint32_t argCount, NPVariant *result) {
  return false;
}

static bool objHasProperty(NPObject *npobj, NPIdentifier name) {
  return false;
}

static bool objGetProperty(NPObject *npobj, NPIdentifier name, 
                           NPVariant *result) {
  return false;
}

static bool objSetProperty(NPObject *npobj, NPIdentifier name, 
                           const NPVariant *value) {
  return false;
}

static bool objRemoveProperty(NPObject *npobj, NPIdentifier name) {
  return false;
}

static bool objEnumerate(NPObject *npobj, NPIdentifier **value, 
                         uint32_t *count) {
  return false;
}

static bool objConstruct(NPObject *npobj, const NPVariant *args, 
                         uint32_t argCount, NPVariant *result) {
  return false;
}

static struct NPClass PluginClass = {
  NP_CLASS_STRUCT_VERSION,
  &objAllocate,
  &objDeallocate,
  &objInvalidate,
  &objHasMethod,
  &objInvoke,
  &objInvokeDefault,
  &objHasProperty,
  &objGetProperty,
  &objSetProperty,
  &objRemoveProperty,
  &objEnumerate,
  &objConstruct
};


NPError NPP_New(NPMIMEType pluginType, NPP instance, uint16_t mode, 
                int16_t argc, char* argn[], char* argv[], NPSavedData* saved) {
  PluginInstance *newInstance = (PluginInstance*)malloc(sizeof(PluginInstance));
  bzero(newInstance, sizeof(PluginInstance));

  newInstance->npp = instance;
  instance->pdata = newInstance;


  NPBool supportsCoreGraphics = false;
  if (browser->getvalue(instance, NPNVsupportsCoreGraphicsBool, &supportsCoreGraphics) == NPERR_NO_ERROR && supportsCoreGraphics) {
    browser->setvalue(instance, NPPVpluginDrawingModel, (void*)NPDrawingModelCoreGraphics);
  } else {
    printf("CoreGraphics drawing model not supported, can't create a plugin instance.\n");
    return NPERR_INCOMPATIBLE_VERSION_ERROR;
  }

  NPBool supportsCocoaEvents = false;
  if (browser->getvalue(instance, NPNVsupportsCocoaBool, &supportsCocoaEvents) == NPERR_NO_ERROR && supportsCocoaEvents) {
    browser->setvalue(instance, NPPVpluginEventModel, (void*)NPEventModelCocoa);
  } else {
    printf("Cocoa event model not supported, can't create a plugin instance.\n");
    return NPERR_INCOMPATIBLE_VERSION_ERROR;
  }

  return NPERR_NO_ERROR;
}

NPError NPP_Destroy(NPP instance, NPSavedData** save) {
  free(instance->pdata);

  return NPERR_NO_ERROR;
}

NPError NPP_SetWindow(NPP instance, NPWindow* window) {
  PluginInstance* currentInstance = (PluginInstance*)(instance->pdata);

  currentInstance->window = *window;
  
  return NPERR_NO_ERROR;
}

NPError NPP_NewStream(NPP instance, NPMIMEType type, NPStream* stream, 
                      NPBool seekable, uint16_t* stype) {
  *stype = NP_ASFILEONLY;
  return NPERR_NO_ERROR;
}

NPError NPP_DestroyStream(NPP instance, NPStream* stream, NPReason reason) {
  return NPERR_NO_ERROR;
}

int32_t NPP_WriteReady(NPP instance, NPStream* stream) {
  return 0;
}

int32_t NPP_Write(NPP instance, NPStream* stream, int32_t offset, int32_t len, 
                  void* buffer) {
  return 0;
}

void NPP_StreamAsFile(NPP instance, NPStream* stream, const char* fname) {
}

void NPP_Print(NPP instance, NPPrint* platformPrint) {
  
}

int16_t NPP_HandleEvent(NPP instance, void* event) {
  return 0;
}

void NPP_URLNotify(NPP instance, const char* url, NPReason reason, 
                   void* notifyData) {

}

NPError NPP_GetValue(NPP instance, NPPVariable variable, void *value) {
  switch(variable) {
    case NPPVpluginScriptableNPObject:
    {
      NPObject *obj;
      obj = browser->createobject(instance, &PluginClass);
      browser->retainobject(obj);
      *(NPObject **)value = obj;
      break;
    }
    default:
      return NPERR_GENERIC_ERROR;
  }
  return NPERR_NO_ERROR;
}

NPError NPP_SetValue(NPP instance, NPNVariable variable, void *value) {
  return NPERR_GENERIC_ERROR;
}





