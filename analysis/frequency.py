import pickle

with open("words.pickle", 'r') as f:
  freq = pickle.load(f)


def frequency(word):
  return 1/(10 * freq[word.lower()])
