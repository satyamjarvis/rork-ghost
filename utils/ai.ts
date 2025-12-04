import { getValidLetters, isLosingMove } from './game';
import { getAllWordsStartingWith, isValidWord } from './dictionary';
import type { AIDifficulty } from '@/types/store';

interface LetterScore {
  letter: string;
  score: number;
  validContinuations: number;
  isLosing: boolean;
  vowelBalance: number;
  letterPatternScore: number;
  possibleWordsCount: number;
}

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);
const COMMON_CONSONANT_CLUSTERS = ['TH', 'CH', 'SH', 'ST', 'TR', 'BR', 'CR', 'DR', 'FR', 'GR', 'PR', 'PL', 'BL', 'CL', 'FL', 'GL', 'SL', 'SM', 'SN', 'SP', 'SW'];
const COMMON_VOWEL_PATTERNS = ['EA', 'EE', 'IE', 'OO', 'OU', 'AI', 'AY', 'OA', 'OE', 'UE'];

function isVowel(letter: string): boolean {
  return VOWELS.has(letter.toUpperCase());
}

function getVowelBalance(word: string): number {
  const vowelCount = Array.from(word).filter(c => isVowel(c)).length;
  const ratio = word.length > 0 ? vowelCount / word.length : 0;
  
  if (ratio < 0.2 || ratio > 0.7) return -10;
  if (ratio >= 0.3 && ratio <= 0.5) return 20;
  return 5;
}

function needsVowel(word: string): boolean {
  if (word.length < 2) return false;
  
  const last2 = word.slice(-2).toUpperCase();
  const last3 = word.slice(-3).toUpperCase();
  
  if (last2.length === 2 && !isVowel(last2[0]) && !isVowel(last2[1])) {
    const isCommonCluster = COMMON_CONSONANT_CLUSTERS.some(cluster => last2 === cluster);
    if (!isCommonCluster) return true;
  }
  
  if (last3.length === 3) {
    const consonantCount = Array.from(last3).filter(c => !isVowel(c)).length;
    if (consonantCount >= 3) return true;
  }
  
  return false;
}

function needsConsonant(word: string): boolean {
  if (word.length < 2) return false;
  
  const last2 = word.slice(-2).toUpperCase();
  const last3 = word.slice(-3).toUpperCase();
  
  if (last2.length === 2 && isVowel(last2[0]) && isVowel(last2[1])) {
    const isCommonPattern = COMMON_VOWEL_PATTERNS.some(pattern => last2 === pattern);
    if (!isCommonPattern) return true;
  }
  
  if (last3.length === 3) {
    const vowelCount = Array.from(last3).filter(c => isVowel(c)).length;
    if (vowelCount >= 3) return true;
  }
  
  return false;
}

function getLetterPatternScore(currentWord: string, letter: string): number {
  let score = 0;
  const newWord = currentWord + letter;
  const last2 = newWord.slice(-2).toUpperCase();
  const last3 = newWord.slice(-3).toUpperCase();
  
  if (COMMON_CONSONANT_CLUSTERS.some(cluster => last2 === cluster)) {
    score += 25;
  }
  
  if (COMMON_VOWEL_PATTERNS.some(pattern => last2 === pattern)) {
    score += 25;
  }
  
  if (last2.length === 2) {
    if (!isVowel(last2[0]) && !isVowel(last2[1])) {
      const isCommon = COMMON_CONSONANT_CLUSTERS.some(cluster => last2 === cluster);
      if (!isCommon) score -= 20;
    }
    
    if (isVowel(last2[0]) && isVowel(last2[1])) {
      const isCommon = COMMON_VOWEL_PATTERNS.some(pattern => last2 === pattern);
      if (!isCommon) score -= 15;
    }
  }
  
  if (last3.length === 3) {
    const consonantCount = Array.from(last3).filter(c => !isVowel(c)).length;
    const vowelCount = last3.length - consonantCount;
    
    if (consonantCount >= 3) score -= 30;
    if (vowelCount >= 3) score -= 25;
  }
  
  return score;
}

function findForcingMove(currentWord: string): { letter: string; targetWord: string; score: number } | null {
  const validLetters = getValidLetters(currentWord);
  const forcingMoves: { letter: string; targetWord: string; score: number }[] = [];

  for (const letter of validLetters) {
    const newWord = currentWord + letter;
    const nextValidLetters = getValidLetters(newWord);
    
    if (nextValidLetters.length === 0) continue;

    let forcingScore = 0;
    let totalTargetWords = 0;
    const targetWords: string[] = [];

    for (const nextLetter of nextValidLetters) {
      const futureWord = newWord + nextLetter;
      
      if (futureWord.length >= 4 && isValidWord(futureWord)) {
        const longerWords = getAllWordsStartingWith(futureWord);
        const hasLongerContinuations = longerWords.some(w => w.length > futureWord.length);
        
        if (!hasLongerContinuations) {
          forcingScore += 100;
          targetWords.push(futureWord);
          totalTargetWords++;
        }
      }
    }

    if (totalTargetWords > 0) {
      const ratio = totalTargetWords / nextValidLetters.length;
      forcingScore += ratio * 200;
      
      if (ratio > 0.6) {
        console.log(`[AI Forcing] Letter ${letter} forces ${totalTargetWords}/${nextValidLetters.length} completions`);
        forcingMoves.push({
          letter,
          targetWord: targetWords[0] || newWord,
          score: forcingScore
        });
      }
    }
  }

  if (forcingMoves.length === 0) return null;

  forcingMoves.sort((a, b) => b.score - a.score);
  return forcingMoves[0];
}

function analyzeTrapPotential(currentWord: string, letter: string): number {
  const newWord = currentWord + letter;
  const nextLetters = getValidLetters(newWord);
  
  let trapScore = 0;
  let losingMoveCount = 0;
  let safeLetterCount = 0;
  let difficultMoveCount = 0;
  
  for (const nextLetter of nextLetters) {
    const futureWord = newWord + nextLetter;
    const futureResult = isLosingMove(newWord, nextLetter);
    
    if (futureResult.isLosing) {
      losingMoveCount++;
      continue;
    }
    
    const futureOptions = getValidLetters(futureWord);
    
    if (futureOptions.length === 0) {
      losingMoveCount++;
    } else if (futureOptions.length > 8) {
      safeLetterCount++;
    } else if (futureOptions.length <= 3) {
      difficultMoveCount++;
    }
    
    let forcesCompletionCount = 0;
    for (const thirdLetter of futureOptions.slice(0, 10)) {
      const thirdWord = futureWord + thirdLetter;
      const thirdOptions = getValidLetters(thirdWord);
      if (thirdOptions.length <= 2) {
        forcesCompletionCount++;
      }
    }
    
    if (futureOptions.length > 0 && forcesCompletionCount / futureOptions.length > 0.5) {
      trapScore += 30;
    }
  }
  
  const totalNextMoves = nextLetters.length;
  if (totalNextMoves === 0) return -200;
  
  const losingRatio = losingMoveCount / totalNextMoves;
  if (losingRatio > 0.6) {
    trapScore += 100;
  } else if (losingRatio > 0.4) {
    trapScore += 60;
  } else if (losingRatio > 0.25) {
    trapScore += 30;
  }
  
  const safeRatio = safeLetterCount / totalNextMoves;
  if (safeRatio < 0.2) {
    trapScore += 50;
  } else if (safeRatio < 0.3) {
    trapScore += 25;
  }
  
  const difficultRatio = difficultMoveCount / totalNextMoves;
  if (difficultRatio > 0.5) {
    trapScore += 40;
  }
  
  return trapScore;
}

function analyzeWordCompletionRisk(currentWord: string, letter: string): number {
  const newWord = currentWord + letter;
  const possibleWords = getAllWordsStartingWith(newWord);
  
  if (possibleWords.length === 0) {
    console.log(`[AI] ⚠️  Letter ${letter} leads to DEAD END - no possible words from "${newWord}"`);
    return -800;
  }
  
  const exactWordMatch = possibleWords.some(w => w === newWord && newWord.length >= 4);
  if (exactWordMatch) return -1000;
  
  let riskScore = 0;
  
  const shortWords = possibleWords.filter(w => w.length === newWord.length + 1 && w.length >= 4);
  if (shortWords.length > 0) {
    const shortWordRatio = shortWords.length / possibleWords.length;
    riskScore -= shortWordRatio * 100;
  }
  
  const avgWordLength = possibleWords.reduce((sum, w) => sum + w.length, 0) / possibleWords.length;
  if (avgWordLength > newWord.length + 3) {
    riskScore += 30;
  } else if (avgWordLength > newWord.length + 2) {
    riskScore += 15;
  }
  
  if (possibleWords.length >= 15) {
    riskScore += 25;
  } else if (possibleWords.length <= 3) {
    riskScore -= 30;
  }
  
  return riskScore;
}

export function shouldAIChallenge(currentWord: string, difficulty: AIDifficulty = 'medium'): boolean {
  console.log(`\n[AI ${difficulty.toUpperCase()}] 🔍 Checking if should challenge on: "${currentWord}"`);
  
  if (currentWord.length < 2) {
    console.log('[AI Challenge Check] Word too short to challenge');
    return false;
  }

  const possibleWords = getAllWordsStartingWith(currentWord);
  
  if (possibleWords.length === 0) {
    console.log('[AI Challenge Check] ⚠️ NO VALID WORDS - CHALLENGING!');
    return true;
  }

  if (difficulty === 'easy') {
    return false;
  }

  if (difficulty === 'medium' || difficulty === 'hard' || difficulty === 'superior') {
    const hasOnlyCompletingWords = possibleWords.every(word => 
      word.length === currentWord.length && word.length >= 4
    );
    
    if (hasOnlyCompletingWords && possibleWords.length > 0) {
      console.log('[AI Challenge Check] ⚠️ Only word-completing moves exist - but valid, not challenging');
      return false;
    }

    const hasNonCompletingContinuations = possibleWords.some(word => word.length > currentWord.length);
    
    if (!hasNonCompletingContinuations && currentWord.length >= 3) {
      console.log('[AI Challenge Check] ⚠️ No valid continuations found - CHALLENGING!');
      return true;
    }
  }

  console.log(`[AI Challenge Check] ✓ Valid continuations exist (${possibleWords.length} words)`);
  return false;
}

export function findBestLetter(currentWord: string, difficulty: AIDifficulty = 'medium'): string {
  console.log(`\n[AI ${difficulty.toUpperCase()}] 🤖 Finding best letter for: "${currentWord}"`);
  
  const validLetters = getValidLetters(currentWord);
  
  if (validLetters.length === 0) {
    console.log('[AI] ⚠️  No non-completing letters available. Using strategic play...');
    
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const possibleMoves: { letter: string; completesWord: boolean; bluffScore: number; }[] = [];
    
    for (const letter of alphabet) {
      const testWord = (currentWord + letter).toUpperCase();
      const isValidPrefix = getAllWordsStartingWith(testWord).length > 0;
      
      if (isValidPrefix) {
        const completesWord = testWord.length >= 4 && isValidWord(testWord);
        const hasLongerWords = getAllWordsStartingWith(testWord).some(w => w.length > testWord.length);
        
        let bluffScore = 0;
        
        if (completesWord && hasLongerWords) {
          bluffScore = 50;
          console.log(`[AI] 📊 ${letter}: Completes word but has continuations (strategic play)`);
        } else if (completesWord && !hasLongerWords) {
          bluffScore = 30;
          console.log(`[AI] 📊 ${letter}: Completes word with no continuations`);
        }
        
        possibleMoves.push({ letter, completesWord, bluffScore });
      }
    }
    
    if (possibleMoves.length === 0) {
      console.log('[AI] ⚠️  No valid continuations at all. Attempting bluff with invalid letter.');
      
      const bluffLetters = difficulty === 'superior' || difficulty === 'hard'
        ? ['X', 'Q', 'Z', 'J', 'K', 'V', 'W', 'Y']
        : ['E', 'R', 'T', 'S', 'N', 'A', 'I', 'O'];
      
      const randomBluffIndex = Math.floor(Math.random() * bluffLetters.length);
      const bluffLetter = bluffLetters[randomBluffIndex];
      console.log(`[AI] 🎲 BLUFF: Playing "${bluffLetter}" - user must challenge!`);
      return bluffLetter;
    }
    
    possibleMoves.sort((a, b) => b.bluffScore - a.bluffScore);
    
    const shouldBluff = Math.random() > 0.6;
    
    if (shouldBluff && possibleMoves.some(m => m.completesWord)) {
      const completingMoves = possibleMoves.filter(m => m.completesWord);
      const move = completingMoves[Math.floor(Math.random() * completingMoves.length)];
      console.log(`[AI] 🎯 Playing word-completing letter "${move.letter}" - user can call 'word'!`);
      return move.letter;
    } else {
      console.log('[AI] 🎲 Attempting BLUFF with invalid letter...');
      const bluffLetters = difficulty === 'superior' || difficulty === 'hard'
        ? ['X', 'Q', 'Z', 'J', 'K', 'V', 'W', 'Y']
        : ['E', 'R', 'T', 'S', 'N', 'A', 'I', 'O'];
      
      const randomBluffIndex = Math.floor(Math.random() * bluffLetters.length);
      const bluffLetter = bluffLetters[randomBluffIndex];
      console.log(`[AI] 🎲 BLUFF: Playing "${bluffLetter}" - user must challenge!`);
      return bluffLetter;
    }
  }
  
  console.log(`[AI] ✓ Found ${validLetters.length} valid letters:`, validLetters.join(', '));
  
  const requiresVowel = needsVowel(currentWord);
  const requiresConsonant = needsConsonant(currentWord);
  
  if (requiresVowel) console.log('[AI] 📝 Word needs a vowel');
  if (requiresConsonant) console.log('[AI] 📝 Word needs a consonant');
  
  const letterScores: LetterScore[] = [];
  
  for (const letter of validLetters) {
    const result = isLosingMove(currentWord, letter);
    const nextValidLetters = getValidLetters(currentWord + letter);
    const newWord = currentWord + letter;
    const possibleWords = getAllWordsStartingWith(newWord);
    
    let score = 0;
    
    if (result.isLosing) {
      score = -2000;
    } else if (possibleWords.length === 0) {
      score = -1500;
    } else {
      const trapPotential = analyzeTrapPotential(currentWord, letter);
      score += trapPotential;
      
      const completionRisk = analyzeWordCompletionRisk(currentWord, letter);
      score += completionRisk;
      
      score += nextValidLetters.length * 5;
      
      if (nextValidLetters.length > 10) {
        score += 40;
      } else if (nextValidLetters.length > 5) {
        score += 20;
      } else if (nextValidLetters.length <= 2 && nextValidLetters.length > 0) {
        score += 60;
      } else if (nextValidLetters.length === 0) {
        score -= 200;
      }
      
      const secondLevelOptions = nextValidLetters.reduce((sum, nextLetter) => {
        const thirdWord = currentWord + letter + nextLetter;
        const thirdOptions = getValidLetters(thirdWord);
        
        if (thirdOptions.length <= 2 && thirdOptions.length > 0) {
          return sum + 15;
        }
        return sum + thirdOptions.length * 0.5;
      }, 0);
      score += secondLevelOptions;
      
      const vowelBalanceScore = getVowelBalance(newWord);
      score += vowelBalanceScore;
      
      const patternScore = getLetterPatternScore(currentWord, letter);
      score += patternScore;
      
      if (requiresVowel && isVowel(letter)) {
        score += 60;
      } else if (requiresVowel && !isVowel(letter)) {
        score -= 100;
      }
      
      if (requiresConsonant && !isVowel(letter)) {
        score += 50;
      } else if (requiresConsonant && isVowel(letter)) {
        score -= 80;
      }
      
      const wordDiversity = new Set(possibleWords.map(w => w.charAt(newWord.length))).size;
      score += wordDiversity * 5;
      
      const longerWords = possibleWords.filter(w => w.length > newWord.length + 2);
      if (longerWords.length > possibleWords.length * 0.6) {
        score += 40;
      } else if (longerWords.length > possibleWords.length * 0.3) {
        score += 20;
      }
      
      if (possibleWords.length >= 15) {
        score += 30;
      } else if (possibleWords.length <= 3) {
        score -= 25;
      }
    }
    
    letterScores.push({
      letter,
      score,
      validContinuations: nextValidLetters.length,
      isLosing: result.isLosing,
      vowelBalance: getVowelBalance(newWord),
      letterPatternScore: getLetterPatternScore(currentWord, letter),
      possibleWordsCount: possibleWords.length,
    });
  }
  
  letterScores.sort((a, b) => b.score - a.score);
  
  console.log('[AI] 📊 Top 5 scored letters:');
  letterScores.slice(0, 5).forEach((l, i) => {
    console.log(`  ${i + 1}. ${l.letter}: ${l.score.toFixed(0)} pts (${l.possibleWordsCount} words, ${l.validContinuations} continuations)`);
  });
  
  let chosenLetter: string;
  
  const forcingMove = findForcingMove(currentWord);
  if (forcingMove && (difficulty === 'hard' || difficulty === 'superior')) {
    const shouldUseForcing = Math.random() < (difficulty === 'superior' ? 0.7 : 0.4);
    if (shouldUseForcing) {
      console.log(`[AI] 🎯 FORCING MOVE: Playing "${forcingMove.letter}" to trap opponent (target: ${forcingMove.targetWord})`);
      return forcingMove.letter;
    }
  }

  switch (difficulty) {
    case 'easy':
      const safeLetters = letterScores.filter(l => !l.isLosing && l.validContinuations > 0);
      if (safeLetters.length > 0) {
        const randomIndex = Math.floor(Math.random() * Math.min(safeLetters.length, 10));
        chosenLetter = safeLetters[randomIndex].letter;
      } else {
        chosenLetter = letterScores[Math.floor(Math.random() * letterScores.length)].letter;
      }
      break;
    
    case 'medium':
      const decentLetters = letterScores.filter(l => !l.isLosing && l.score > -500 && l.possibleWordsCount > 0);
      if (decentLetters.length > 0) {
        const goodOptions = decentLetters.filter(l => l.score > 0);
        if (goodOptions.length > 0) {
          const topGood = goodOptions.slice(0, Math.min(3, goodOptions.length));
          chosenLetter = topGood[Math.floor(Math.random() * topGood.length)].letter;
        } else {
          chosenLetter = decentLetters[0].letter;
        }
      } else {
        const fallback = letterScores.filter(l => !l.isLosing);
        chosenLetter = fallback.length > 0 ? fallback[0].letter : letterScores[0].letter;
      }
      break;
    
    case 'hard':
      const goodLetters = letterScores.filter(l => !l.isLosing && l.validContinuations > 3 && l.score > -200 && l.possibleWordsCount > 0);
      if (goodLetters.length > 0) {
        const strongLetters = goodLetters.filter(l => l.score > 50);
        if (strongLetters.length > 0) {
          chosenLetter = strongLetters[Math.floor(Math.random() * Math.min(2, strongLetters.length))].letter;
        } else {
          chosenLetter = goodLetters[0].letter;
        }
      } else {
        const nonLosingLetters = letterScores.filter(l => !l.isLosing && l.score > -500);
        chosenLetter = nonLosingLetters.length > 0 ? nonLosingLetters[0].letter : letterScores[0].letter;
      }
      break;
    
    case 'superior':
      const bestNonLosingLetters = letterScores.filter(l => !l.isLosing && l.score > -100 && l.possibleWordsCount > 0);
      if (bestNonLosingLetters.length > 0) {
        const topCandidates = bestNonLosingLetters.slice(0, Math.min(5, bestNonLosingLetters.length));
        
        let bestCandidate = topCandidates[0];
        let bestDepthScore = -Infinity;
        
        for (const candidate of topCandidates) {
          const newWord = currentWord + candidate.letter;
          let depthScore = candidate.score;
          
          const possibleWords = getAllWordsStartingWith(newWord);
          const avgWordLength = possibleWords.reduce((sum, w) => sum + w.length, 0) / (possibleWords.length || 1);
          depthScore += avgWordLength * 8;
          
          const trapPotential = analyzeTrapPotential(currentWord, candidate.letter);
          depthScore += trapPotential * 1.5;
          
          const nextOptions = getValidLetters(newWord);
          let opponentBadMovesCount = 0;
          
          for (const nextLetter of nextOptions) {
            const thirdWord = newWord + nextLetter;
            const thirdResult = isLosingMove(newWord, nextLetter);
            
            if (thirdResult.isLosing) {
              opponentBadMovesCount++;
              depthScore += 15;
            } else {
              const thirdOptions = getValidLetters(thirdWord);
              
              if (thirdOptions.length <= 2 && thirdOptions.length > 0) {
                opponentBadMovesCount++;
                depthScore += 25;
              } else if (thirdOptions.length > 8) {
                depthScore -= 5;
              } else {
                depthScore += thirdOptions.length * 1.5;
              }
              
              const thirdPatternScore = getLetterPatternScore(newWord, nextLetter);
              depthScore += thirdPatternScore * 0.5;
              
              for (const fourthLetter of thirdOptions.slice(0, 8)) {
                const fourthWord = thirdWord + fourthLetter;
                const fourthResult = isLosingMove(thirdWord, fourthLetter);
                
                if (fourthResult.isLosing) {
                  depthScore += 10;
                } else {
                  const fourthOptions = getValidLetters(fourthWord);
                  if (fourthOptions.length <= 3) {
                    depthScore += 15;
                  } else {
                    depthScore += fourthOptions.length * 0.5;
                  }
                }
              }
            }
          }
          
          if (nextOptions.length > 0) {
            const badMoveRatio = opponentBadMovesCount / nextOptions.length;
            depthScore += badMoveRatio * 100;
          }
          
          if (requiresVowel && isVowel(candidate.letter)) {
            depthScore += 70;
          } else if (requiresVowel && !isVowel(candidate.letter)) {
            depthScore -= 150;
          }
          
          if (requiresConsonant && !isVowel(candidate.letter)) {
            depthScore += 60;
          } else if (requiresConsonant && isVowel(candidate.letter)) {
            depthScore -= 120;
          }
          
          if (candidate.vowelBalance > 0) {
            depthScore += candidate.vowelBalance * 2.5;
          } else {
            depthScore += candidate.vowelBalance * 4;
          }
          
          if (candidate.letterPatternScore > 0) {
            depthScore += candidate.letterPatternScore * 2;
          } else {
            depthScore += candidate.letterPatternScore * 3;
          }
          
          if (depthScore > bestDepthScore) {
            bestDepthScore = depthScore;
            bestCandidate = candidate;
          }
        }
        
        chosenLetter = bestCandidate.letter;
      } else {
        const fallbackLetters = letterScores.filter(l => !l.isLosing);
        chosenLetter = fallbackLetters.length > 0 ? fallbackLetters[0].letter : letterScores[0].letter;
      }
      break;
    
    default:
      chosenLetter = letterScores[0].letter;
  }
  
  const chosenScore = letterScores.find(l => l.letter === chosenLetter);
  console.log(`[AI] ✅ Chose "${chosenLetter}" (score: ${chosenScore?.score.toFixed(0)}, ${chosenScore?.possibleWordsCount} possible words)\n`);
  
  return chosenLetter;
}
