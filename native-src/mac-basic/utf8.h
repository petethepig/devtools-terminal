//
//  utf8.h
//  BasicPlugin
//
//  Created by df on 16/09/13.
//
//

#ifndef __BasicPlugin__utf8__
#define __BasicPlugin__utf8__

#include <iostream>

#endif /* defined(__BasicPlugin__utf8__) */

#undef B0


#pragma GCC visibility push(default)
enum { B0=1, B1=2, B2=4, B3=8, B4=16, B5=32, B6=64, B7=128 };
typedef unsigned char uchar;
typedef unsigned int uint;
typedef unsigned long ulong;
typedef unsigned short ushort;
extern int utf8decode(char *, long *);
extern int isfullutf8(char *, int);
#pragma GCC visibility pop