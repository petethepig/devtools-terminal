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



