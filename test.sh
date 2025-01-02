#!/bin/sh

for bat in /sys/class/power_supply/BAT?; do
  [ -d "$bat" ] && echo "${bat##*/}: $(cat "$bat/capacity")%"
done