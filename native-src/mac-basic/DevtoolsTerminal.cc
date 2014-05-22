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

#include <util.h>
#include <poll.h>
#include <pthread.h>
#include <sys/ioctl.h>

#include "DevtoolsTerminal.h"
#include "hashmap.h"
#include "utf8.h"

#include <crt_externs.h>
#define environ (*_NSGetEnviron())

NPNetscapeFuncs* browser;
map_t methodsTable;


class PluginInstance : public NPObject {
  public:
    NPP npp;
    NPObject *dataCallback;
    pid_t pid;
    int fd;
    char *cwd; // working directory
    char *shell;
    int rows;
    int cols;

    explicit PluginInstance(NPP _npp) : npp(_npp) {}

};

typedef bool (*method_t)(PluginInstance *obj, const NPVariant *args,
                         uint32_t argCount, NPVariant *result);

void sendDataBack(void * userData){
  void **arr = (void **)userData;
  PluginInstance *obj = (PluginInstance *)(arr[0]);
  NPVariant *data = (NPVariant *)(arr[1]);
  NPVariant result;
  browser->invokeDefault(obj->npp, obj->dataCallback, data, 1, &result);
  browser->releasevariantvalue(data);
  browser->releasevariantvalue(&result);
  browser->memfree(arr);
  browser->memfree(data);
}

void closeConnection(PluginInstance *obj){
  NPVariant *data = new NPVariant;
  NULL_TO_NPVARIANT(*data);
  
  void **arr = (void **) browser->memalloc(sizeof(void *) * 2);
  arr[0] = obj;
  arr[1] = data;
  browser->pluginthreadasynccall(obj->npp, sendDataBack, arr);
}

char **split(char *str){
  int i = 0;
  int l = strlen(str);

  int token_start = 0;
  char **tokens;
  int tokens_length = 1;
  while(i < l){
    tokens_length += str[i++] == ' ';
  }
  tokens = (char **)malloc((sizeof(char*)*tokens_length));
  
  i = 0;
  int j = 0;
  int token_l;
  while(i < l){
    if((str[i] == ' ' && i != token_start) || ((i + 1) == l && i++)){
      token_l = i - token_start + 1;
      tokens[j] = (char *)malloc((sizeof(char*)*(token_l)));
      memcpy(tokens[j], &str[token_start], token_l - 1);
      tokens[j][token_l - 1] = '\0';
      j++;
      token_start = i + 1;
    }
    i++;
  }
  tokens[tokens_length - 1] = NULL;
  return tokens;
}

void slave(PluginInstance *obj, int m, int s, int pid){
  setsid(); // creates a new session
  dup2(s, STDIN_FILENO); //duplicate a file descriptor
  dup2(s, STDOUT_FILENO);
  dup2(s, STDERR_FILENO);
  
  ioctl(s, TIOCSCTTY, NULL); // Make the given terminal the controlling
                             // terminal of the calling process
  
  close(s); // closes a file descriptor
  close(m);
  
  char *cwd;
  if(obj->cwd != NULL){
    cwd = obj->cwd;
  }else{
    cwd = getenv("HOME");
  }
  
  if(chdir(cwd) != 0){
    if(chdir(getenv("HOME")) != 0){
      exit(-1);
    }
  }
  
  passwd *pass = getpwuid(getuid());
  if(pass) {
    setenv("LOGNAME", pass->pw_name, 1);
    setenv("USER", pass->pw_name, 1);
    setenv("SHELL", pass->pw_shell, 0);
    setenv("HOME", pass->pw_dir, 0);
  }
  
  signal(SIGCHLD, SIG_DFL);
  signal(SIGHUP,  SIG_DFL);
  signal(SIGINT,  SIG_DFL);
  signal(SIGQUIT, SIG_DFL);
  signal(SIGTERM, SIG_DFL);
  signal(SIGALRM, SIG_DFL);

  setenv("TERM", "xterm-256color", 1);
  setenv("TERM_PROGRAM", "Devtools_Terminal", 1);
  setenv("PROMPT_COMMAND","printf '\e]2;%s\a' \"$PWD\"",1);
  setenv("LC_CTYPE","UTF-8",1);
  
  if(pass != NULL && pass->pw_shell != NULL){
    obj->shell = pass->pw_shell;
  }else if(obj->shell == NULL){
    obj->shell = (char *)"/bin/sh";
  }

  char buf[1024];
  snprintf(buf, 1024, "%s -i ", obj->shell);
  char **array = split(buf);
  
  execve(array[0], &array[1], environ);
  exit(0);
}

void master(PluginInstance *obj, int m, int s, int pid){
  close(s);
  
  pollfd ufds = {m, POLLIN | POLLPRI};
  
  obj->fd = m;
  obj->pid = pid;

  char last_utf_char[UTF_SIZ];
  int buflen = 0;
  
  int a;
  
  while(1){
    if((a = poll(&ufds, 1, -1)) > 0){
      
      char *buffer = (char *)browser->memalloc(sizeof(char) * (BUFSIZ + buflen));
      int bytesRead = read(m, buffer + buflen, BUFSIZ);
      
      if(bytesRead <= 0){
        browser->memfree(buffer);
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
      
      NPVariant *data = (NPVariant *) browser->memalloc(sizeof(NPVariant) * 1);
      STRINGN_TO_NPVARIANT(buffer, ptr-buffer, *data);
      
      void **arr = (void **) browser->memalloc(sizeof(void *) * 2);
      arr[0] = obj;
      arr[1] = data;
      browser->pluginthreadasynccall(obj->npp, sendDataBack, arr);
    }else{
      break;
    }
  }
}

void *handleIO(void * userData){
  PluginInstance *obj = (PluginInstance *)userData;
  int m, s, pid;
  struct winsize w = {obj->rows, obj->cols, 0, 0};
  
  int ret = openpty(&m, &s, NULL, NULL, &w);
  if(ret >= 0){
    switch(pid = fork()) {
      case -1: // error
        break;
      case  0: // slave
        slave(obj, m, s, pid);
        return NULL;
      default: // master
        master(obj, m, s, pid);
        break;
    }
  }
  closeConnection(obj);
  return NULL;
}

bool method_init(PluginInstance *obj, const NPVariant *args,
                 uint32_t argCount, NPVariant *result){
  if(argCount >= 2 && NPVARIANT_IS_OBJECT(args[0])
                   && NPVARIANT_IS_OBJECT(args[1])) {

    NPObject *options = NPVARIANT_TO_OBJECT(args[0]);
    
    NPVariant rows_v;
    NPVariant cols_v;
    NPVariant cwd_v;
    NPVariant shell_v;
  
    obj->dataCallback = NPVARIANT_TO_OBJECT(args[1]);
    browser->retainobject(obj->dataCallback);

    obj->rows = 80;
    obj->rows = 24;
    obj->cwd = NULL;
    obj->shell = getenv("SHELL");

    if(browser->getproperty(obj->npp, options, 
        browser->getstringidentifier("rows"), &rows_v) 
        && rows_v.type == NPVariantType_Double){
      obj->rows = (int)NPVARIANT_TO_DOUBLE(rows_v);
    }
    
    if(browser->getproperty(obj->npp, options, 
        browser->getstringidentifier("cols"), &cols_v) 
        && cols_v.type == NPVariantType_Double){
      obj->cols = (int)NPVARIANT_TO_DOUBLE(cols_v);
    }
    
    
    if(browser->getproperty(obj->npp, options, 
        browser->getstringidentifier("shell"), &shell_v) 
        && shell_v.type == NPVariantType_String
        && obj->shell != NULL){
      NPString str = NPVARIANT_TO_STRING(shell_v);
      char *buf = (char *)browser->memalloc(sizeof(char)*(str.UTF8Length +1));
      memcpy(buf, str.UTF8Characters, str.UTF8Length);
      buf[str.UTF8Length]='\0';
      obj->shell = buf;
    }
    

    if(browser->getproperty(obj->npp, options, 
        browser->getstringidentifier("cwd"), &cwd_v) 
        && cwd_v.type == NPVariantType_String){
      NPString str2 = NPVARIANT_TO_STRING(cwd_v);
      char *buf2 = (char *)browser->memalloc(sizeof(char)*(str2.UTF8Length +1));
      memcpy(buf2, str2.UTF8Characters, str2.UTF8Length);
      buf2[str2.UTF8Length]='\0';
      obj->cwd = buf2;
    }
    
    pthread_t thread;
    pthread_create(&thread, NULL, handleIO, (void *)obj);
    
    VOID_TO_NPVARIANT(*result);
    return true;
  }else{
    return false;
  }
}

bool method_data(PluginInstance *obj, const NPVariant *args, 
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

bool method_debug(PluginInstance *obj, const NPVariant *args,
                  uint32_t argCount, NPVariant *result){
  char * cwd = getcwd(NULL, 0);
  STRINGZ_TO_NPVARIANT(cwd, *result);
  return true;
}

bool method_resize(PluginInstance *obj, const NPVariant *args, 
                   uint32_t argCount, NPVariant *result){
  if(argCount >= 1 && NPVARIANT_IS_OBJECT(args[0])) {
    NPObject *data = NPVARIANT_TO_OBJECT(args[0]);
    NPVariant rows_v;
    NPVariant cols_v;
    browser->getproperty(obj->npp, data, browser->getintidentifier(1), &rows_v);
    browser->getproperty(obj->npp, data, browser->getintidentifier(0), &cols_v);
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















void define_method(const char *name, method_t func){
  hashmap_put(methodsTable, (char *)name, (void *)func);
}

NPError NP_Initialize(NPNetscapeFuncs* browserFuncs) {  
  browser = browserFuncs;
  //sleep(20);
  methodsTable = hashmap_new();

  define_method("init", &method_init);
  define_method("data", &method_data);
  define_method("debug", &method_debug);
  define_method("resize", &method_resize);

  return NPERR_NO_ERROR;
}

NPError NP_GetEntryPoints(NPPluginFuncs* pluginFuncs) {
  if (pluginFuncs->size < (offsetof(NPPluginFuncs, setvalue) + sizeof(void*))){
    return NPERR_INVALID_FUNCTABLE_ERROR;
  }

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
  return new PluginInstance(npp);
}

static void objDeallocate(NPObject *npobj) {
  PluginInstance* obj = reinterpret_cast<PluginInstance*>(npobj);
  browser->memfree(obj->shell);
  browser->memfree(obj->cwd);
  browser->retainobject(obj->dataCallback);
  browser->memfree(npobj);
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
  
  PluginInstance* myObj = reinterpret_cast<PluginInstance*>(obj);
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





