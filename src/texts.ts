export const TEXTS = {
  easy: [
    "The quick brown fox jumps over the lazy dog.",
    "Хурдан бичиж чаддаг эсэхээ шалгаарай.",
    "Монгол хэлээр зөв бөгөөд хурдан бичих нь чухал.",
    "What a wonderful world this is when you stop and look.",
    "Practice makes perfect in everything you do."
  ],
  medium: [
    "Call me Ishmael. Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world.",
    "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity.",
    "Mr. Jones, of the Manor Farm, had locked the hen-houses for the night, but was too drunk to remember to shut the pop-holes. With the ring of light from his lantern dancing from side to side.",
    "All happy families are alike; each unhappy family is unhappy in its own way. Everything was in confusion in the Oblonskys' house. The wife had discovered that the husband was carrying on an intrigue.",
    "There is a lovely road that runs from Ixopo into the hills. These hills are grass-covered and rolling, and they are lovely beyond any singing of it. The road climbs seven miles into them."
  ],
  hard: [
    "Call me Ishmael. Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world. It is a way I have of driving off the spleen and regulating the circulation. Whenever I find myself growing grim about the mouth; whenever it is a damp, drizzly November in my soul; whenever I find myself involuntarily pausing before coffin warehouses, and bringing up the rear of every funeral I meet; and especially whenever my hypos get such an upper hand of me, that it requires a strong moral principle to prevent me from deliberately stepping into the street, and methodically knocking people's hats off—then, I account it high time to get to sea as soon as I can.",
    "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope, it was the winter of despair, we had everything before us, we had nothing before us, we were all going direct to Heaven, we were all going direct the other way—in short, the period was so far like the present period, that some of its noisiest authorities insisted on its being received, for good or for evil, in the superlative degree of comparison only.",
    "Whether I shall turn out to be the hero of my own life, or whether that station will be held by anybody else, these pages must show. To begin my life with the beginning of my life, I record that I was born (as I have been informed and believe) on a Friday, at twelve o'clock at night. It was remarked that the clock began to strike, and I began to cry, simultaneously. In consideration of the day and hour of my birth, it was declared by the nurse, and by some sage women in the neighbourhood who had taken a lively interest in me several months before there was any possibility of our becoming personally acquainted, first, that I was destined to be unlucky in life; and secondly, that I was privileged to see ghosts and spirits."
  ]
};

export type Difficulty = 'easy' | 'medium' | 'hard';

export function getRandomSentence(difficulty: Difficulty = 'medium') {
  const list = TEXTS[difficulty];
  return list[Math.floor(Math.random() * list.length)];
}

export function getTimeLimit(sentence: string) {
  return 180;
}
