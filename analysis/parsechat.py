#!/usr/bin/python

import frequency

wordFreq = {}

def parseFrequencies(chatLog):
	for msg in chatLog:
		for word in msg.split():
			if(word in wordFreq):
				wordFreq[word] = wordFreq[word] + 1
			else:
				wordFreq[word] = 1
	for key in wordFreq.keys():
		wordFreq[key] = wordFreq[key] * frequency.frequency(key)
	return wordFreq	

#for m in parseFrequencies(["hi","hi","boo","moo","hi"]).keys():
#	print wordFreq[m]


			
		
	


