/*
MIT/X Consortium License

© 2009-2012 Aurélien APTEL <aurelien dot aptel at gmail dot com> 
© 2009 Anselm R Garbe <garbeam at gmail dot com>
© 2012 Roberto E. Vargas Caballero <k0ga at shike2 dot com>
© 2012 Christoph Lohmann <20h at r-36 dot net>
© 2013 Eon S. Jeon <esjeon at hyunmu dot am>
© 2013 Alexander Sedov <alex0player at gmail dot com>
© 2013 Mark Edgar <medgar123 at gmail dot com>
© 2013 Eric Pruitt <eric.pruitt at gmail dot com>
© 2013 Michael Forney <mforney at mforney dot org>
© 2013 Markus Teich <markus dot teich at stusta dot mhn dot de>

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL
THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
*/

#ifndef __DevtoolsTerminal__utf8__
#define __DevtoolsTerminal__utf8__

#define UTF_SIZ       4
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

#endif /* defined(__DevtoolsTerminal__utf8__) */
