// Types
export interface AmkiPair {
  id: string;
  question: string;
  answer: string;
  createdAt: number;
  state: AmkiState;
}

export enum AmkiState {
  New = "N",
  Difficult = "D",
  Retrieve = "R",
  Stable = "S",
}

export interface ReviewHistory {
  pairId: string;
  result: AmkiState;
  createdAt: number;
}

// Function to select the next card to review
export function selectNextPairs(pairs: AmkiPair[]): AmkiPair[] {
  if (pairs.length === 0) return [];

  // Assign weights based on state
  const stateWeights = {
    [AmkiState.New]: 0.3, // 70% chance
    [AmkiState.Difficult]: 0.3, // 20% chance
    [AmkiState.Retrieve]: 0.1, // 10% chance
    [AmkiState.Stable]: 0.1, // 10% chance
  };

  // Create weighted pairs with random values within their weight range
  const weightedPairs = pairs.map((pair) => ({
    pair,
    weight: Math.random() * stateWeights[pair.state],
  }));

  // Sort by weight in descending order
  weightedPairs.sort((a, b) => b.weight - a.weight);

  return weightedPairs.map((pair) => pair.pair);
}
