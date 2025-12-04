import { isValidWord as checkValidWord, isValidWordAsync, getAllWordsStartingWith } from './dictionary';

export { checkValidWord as isValidWord, isValidWordAsync };

export function isValidPrefix(prefix: string): boolean {
  if (prefix.length === 0) return true;
  
  const upperPrefix = prefix.toUpperCase();
  const possibleWords = getAllWordsStartingWith(upperPrefix);
  
  return possibleWords.length > 0;
}

export function isCompletedWord(word: string): boolean {
  if (word.length < 4) return false;
  
  return checkValidWord(word);
}

export async function isCompletedWordAsync(word: string): Promise<boolean> {
  if (word.length < 4) return false;
  
  return isValidWordAsync(word);
}

export function isLosingMove(currentWord: string, newLetter: string): { isLosing: boolean; reason?: 'completed' | 'invalid' } {
  const newWord = (currentWord + newLetter).toUpperCase();
  
  if (!isValidPrefix(newWord)) {
    return { isLosing: true, reason: 'invalid' };
  }
  
  return { isLosing: false };
}

export function getValidLetters(currentWord: string): string[] {
  const validLetters: Set<string> = new Set();
  const completingLetters: string[] = [];
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  for (const letter of alphabet) {
    const testWord = (currentWord + letter).toUpperCase();
    
    if (testWord.length >= 4 && checkValidWord(testWord)) {
      const longerWords = getAllWordsStartingWith(testWord);
      const hasLongerWords = longerWords.some(word => word.length > testWord.length);
      
      if (hasLongerWords) {
        completingLetters.push(letter);
      }
      continue;
    }
    
    if (isValidPrefix(testWord)) {
      validLetters.add(letter);
    }
  }
  
  const result = Array.from(validLetters);
  
  if (result.length === 0 && completingLetters.length > 0) {
    return completingLetters;
  }
  
  return result;
}
