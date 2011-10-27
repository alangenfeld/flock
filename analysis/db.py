import redis
import parsechat
r = redis.StrictRedis()

rooms = {}

while True:
  l = r.blpop("chat").split(":")
  cid = l[0]
  rid = l[1]
  fbid = l[2]
  msg = l[3]
  try:
    r = rooms[rid]
  except KeyError:
    r = rooms[rid]
  rooms[rid] = parsechat.parseFrequencies(msg, r)
