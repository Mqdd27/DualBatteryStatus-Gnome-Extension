#!/bin/sh

for bat in /sys/class/power_supply/BAT?; do
  if [ -d "$bat" ]; then
    capacity=$(cat "$bat/capacity")
    status=$(cat "$bat/status")
    echo "${bat##*/}: $capacity% ($status)"
  fi
done

