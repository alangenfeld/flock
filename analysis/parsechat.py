#!/usr/bin/python

import frequency

def parseFrequencies(msg,wordDict):
	for word in msg.lower().split():
		if word in wordDict:
			wordDict[word] = wordDict[word] + 1
		else:
			wordDict[word] = 1
	for key in wordDict.keys():
		wordDict[key] = wordDict[key] * frequency.frequency(key)
	return wordDict	

#test...
#newDict = {}
#parseFrequencies("Hello world moo you too",newDict)
#parseFrequencies("hello ladies",newDict)
#for m in parseFrequencies("hello people",newDict).keys():
#	print m+" "+str(newDict[m])


			
		
	


