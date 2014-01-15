#!/bin/bash

NODE=$(which node)
if [ -z $NODE ]
then
  NODE=$(which /usr/bin/node)
  if [ -z $NODE ]
  then
    NODE=$(which /usr/local/bin/node)
    if [ -z $NODE ]
    then
      exit 1
    fi
  fi
fi

ROOT_PATH="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
SCRIPT_PATH="$(echo $ROOT_PATH)/bin/devtools-terminal"

exec $NODE $SCRIPT_PATH --native-messaging-host