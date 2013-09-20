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

// This just needs to include NPAPI headers, change the path to whatever works
// for you. Note that "XP_MACOSX=1" is defined in the project so that the NPAPI
// headers know we're compiling for Mac OS X.

#include "../headers/npapi.h"
#include "../headers/npfunctions.h"
#include "../headers/npruntime.h"
#include "../headers/nptypes.h"




#pragma GCC visibility push(default)
extern "C"
{
  NPError NP_Initialize(NPNetscapeFuncs *browserFuncs);
  NPError NP_GetEntryPoints(NPPluginFuncs *pluginFuncs);
  void NP_Shutdown(void);
}
#pragma GCC visibility pop



static NPObject* objAllocate(NPP npp, NPClass *aClass);
static void      objDeallocate(NPObject *npobj);
static void      objInvalidate(NPObject *npobj);
static bool      objHasMethod(NPObject *obj, NPIdentifier methodName);
static bool      objInvoke(NPObject *obj, NPIdentifier methodName, const NPVariant *args, uint32_t argCount, NPVariant *result);
static bool      objInvokeDefault(NPObject *npobj, const NPVariant *args, uint32_t argCount, NPVariant *result);
static bool      objHasProperty(NPObject *npobj, NPIdentifier name);
static bool      objGetProperty(NPObject *npobj, NPIdentifier name, NPVariant *result);
static bool      objSetProperty(NPObject *npobj, NPIdentifier name, const NPVariant *value);
static bool      objRemoveProperty(NPObject *npobj, NPIdentifier name);
static bool      objEnumerate(NPObject *npobj, NPIdentifier **value, uint32_t *count);
static bool      objConstruct(NPObject *npobj, const NPVariant *args, uint32_t argCount, NPVariant *result);



NPError NPP_New(NPMIMEType pluginType, NPP instance, uint16_t mode, int16_t argc, char* argn[], char* argv[], NPSavedData* saved);
NPError NPP_Destroy(NPP instance, NPSavedData** save);
NPError NPP_SetWindow(NPP instance, NPWindow* window);
NPError NPP_NewStream(NPP instance, NPMIMEType type, NPStream* stream, NPBool seekable, uint16_t* stype);
NPError NPP_DestroyStream(NPP instance, NPStream* stream, NPReason reason);
int32_t NPP_WriteReady(NPP instance, NPStream* stream);
int32_t NPP_Write(NPP instance, NPStream* stream, int32_t offset, int32_t len, void* buffer);
void    NPP_StreamAsFile(NPP instance, NPStream* stream, const char* fname);
void    NPP_Print(NPP instance, NPPrint* platformPrint);
int16_t NPP_HandleEvent(NPP instance, void* event);
void    NPP_URLNotify(NPP instance, const char* URL, NPReason reason, void* notifyData);
NPError NPP_GetValue(NPP instance, NPPVariable variable, void *value);
NPError NPP_SetValue(NPP instance, NPNVariable variable, void *value);


