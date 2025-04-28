import { AmkiPair, AmkiState } from "./review";
import { createId } from "@paralleldrive/cuid2";

export const saveAmkiPairs = (
  image: string | null,
  qaPairs: Array<{ question: string; answer: string }>
): AmkiPair[] => {
  const savedItems = JSON.parse(localStorage.getItem("amkiItems") || "[]");
  const newItems: AmkiPair[] = qaPairs.map((pair) => ({
    id: createId(),
    question: pair.question,
    answer: pair.answer,
    createdAt: new Date().valueOf(),
    state: AmkiState.New,
  }));

  // todo: save image

  localStorage.setItem(
    "amkiItems",
    JSON.stringify([...savedItems, ...newItems])
  );
  return newItems;
};

export const updateAmkiPair = (pair: AmkiPair): void => {
  const savedItems = JSON.parse(localStorage.getItem("amkiItems") || "[]");
  const updatedItems = savedItems.map((item: AmkiPair) =>
    item.id === pair.id ? pair : item
  );
  localStorage.setItem("amkiItems", JSON.stringify(updatedItems));
};

export const pushAmkiHistory = (pairId: string, result: AmkiState): void => {
  // add history
  const history = JSON.parse(localStorage.getItem("amkiHistory") || "[]");
  history.push({
    pairId,
    result,
    createdAt: new Date().valueOf(),
  });
  localStorage.setItem("amkiHistory", JSON.stringify(history));
};

export const getAmkiItems = (): AmkiPair[] => {
  return JSON.parse(localStorage.getItem("amkiItems") || "[]");
};

export const getAmkiCount = (): number => {
  return getAmkiItems().length;
};

export const resetAmkiItems = (): void => {
  // Clear all Amki-related data
  localStorage.removeItem("amkiItems");
};
