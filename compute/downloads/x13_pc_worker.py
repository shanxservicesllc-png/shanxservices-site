#!/usr/bin/env python3
"""X13 Volunteer Compute PC pilot. Local-only opt-in arithmetic test.

No network, mining, private files, background installation, autostart or remote commands.
Python 3.10+. Use Ctrl+C to stop immediately.
"""
import argparse
import time

def run(percent: int, minutes: int) -> int:
    print("X13 VOLUNTEER COMPUTE: LOCAL TEST ONLY")
    print("No jobs fetched or sent; no background service installed.")
    print(f"Approximate share of ONE CPU thread: {percent}%. Max: {minutes} minute(s).")
    if input("Type YES to start (anything else cancels): ").strip() != "YES":
        print("Cancelled. No work done.")
        return 0
    deadline=time.monotonic()+minutes*60
    checksum=operations=0
    last_report=time.monotonic()
    try:
        while time.monotonic()<deadline:
            start=time.monotonic()
            while time.monotonic()-start<.01:
                n=operations%100003+2
                checksum=(checksum+n*2654435761)&0xFFFFFFFF
                operations+=1
            time.sleep(max(.01,.01*(100/percent-1)))
            if time.monotonic()-last_report>=5:
                print(f"Running | iterations: {operations:,} | checksum: {checksum:08x} | Ctrl+C stops")
                last_report=time.monotonic()
    except KeyboardInterrupt:
        print("Stopped by participant.")
    print(f"Final iterations: {operations:,}; checksum: {checksum:08x}")
    return 0

def main()->int:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--share',type=int,choices=(2,5,10),default=5)
    parser.add_argument('--minutes',type=int,default=5)
    args=parser.parse_args()
    if not 1<=args.minutes<=60:
        parser.error('--minutes must be between 1 and 60')
    return run(args.share,args.minutes)

if __name__=='__main__':
    raise SystemExit(main())
